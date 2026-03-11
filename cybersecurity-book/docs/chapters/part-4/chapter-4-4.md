# Глава 4.4: 5 инструментов безопасности на Python

## 🎯 Цели главы

- Написать порт-сканер на Python как аналог nmap
- Создать анализатор логов для автоматического выявления brute force
- Реализовать взломщик хешей MD5/SHA256 по словарю
- Построить инструмент обнаружения скрытых директорий на веб-сервере
- Написать IOC Checker для проверки IP и хешей через VirusTotal API
- Изучить best practices: argparse, logging, обработка ошибок

> **Важно об этике:** Все инструменты в этой главе предназначены исключительно для тестирования систем, которыми вы владеете или на которые имеете письменное разрешение. Использование без разрешения незаконно в большинстве стран.

---

## 4.4.1 Инструмент 1: Port Scanner

### Концепция и архитектура

Сканер портов определяет, какие TCP/UDP-порты открыты на целевом хосте. Мы реализуем TCP-сканер типа **connect scan** (аналог `nmap -sT`) — полное TCP-рукопожатие.

```
Клиент → SYN → Сервер
Клиент ← SYN-ACK ← Сервер (порт ОТКРЫТ)
Клиент → ACK → Сервер
Клиент → RST → Сервер (соединение закрыто)

Если получен RST вместо SYN-ACK — порт ЗАКРЫТ.
Если нет ответа — порт ФИЛЬТРУЕТСЯ (firewall).
```

### Полный код порт-сканера

```python
#!/usr/bin/env python3
"""
port_scanner.py — TCP Port Scanner
Аналог: nmap -sT -p <ports> <target>
Использование: python3 port_scanner.py -t 192.168.1.1 -p 1-1000 -T 4
"""

import socket
import threading
import argparse
import logging
import sys
import time
from queue import Queue
from datetime import datetime

# ============================================================
# Конфигурация
# ============================================================
VERSION = "1.0.0"
DEFAULT_TIMEOUT = 1.0      # Таймаут соединения в секундах
DEFAULT_THREADS = 100      # Количество потоков
MAX_THREADS = 500

# Известные порты и сервисы
COMMON_PORTS = {
    21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP",
    53: "DNS", 80: "HTTP", 110: "POP3", 143: "IMAP",
    443: "HTTPS", 445: "SMB", 993: "IMAPS", 995: "POP3S",
    1433: "MSSQL", 3306: "MySQL", 3389: "RDP",
    5432: "PostgreSQL", 5900: "VNC", 6379: "Redis",
    8080: "HTTP-Alt", 8443: "HTTPS-Alt", 27017: "MongoDB",
}


# ============================================================
# Настройка логирования
# ============================================================
def setup_logging(verbose: bool = False) -> logging.Logger:
    """Настраивает логгер с цветным выводом."""
    logger = logging.getLogger("PortScanner")
    level = logging.DEBUG if verbose else logging.INFO
    logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    # Цветное форматирование
    class ColorFormatter(logging.Formatter):
        COLORS = {
            logging.DEBUG:    "\033[0;36m",   # Cyan
            logging.INFO:     "\033[0;32m",   # Green
            logging.WARNING:  "\033[1;33m",   # Yellow
            logging.ERROR:    "\033[0;31m",   # Red
            logging.CRITICAL: "\033[1;31m",   # Bold Red
        }
        RESET = "\033[0m"

        def format(self, record):
            color = self.COLORS.get(record.levelno, self.RESET)
            msg = super().format(record)
            return f"{color}{msg}{self.RESET}"

    handler.setFormatter(ColorFormatter("%(asctime)s [%(levelname)s] %(message)s",
                                         datefmt="%H:%M:%S"))
    logger.addHandler(handler)
    return logger


# ============================================================
# Основная логика сканирования
# ============================================================
class PortScanner:
    def __init__(self, target: str, ports: list[int], threads: int,
                 timeout: float, logger: logging.Logger):
        self.target = target
        self.target_ip = self._resolve_host(target, logger)
        self.ports = ports
        self.threads = min(threads, MAX_THREADS)
        self.timeout = timeout
        self.logger = logger
        self.open_ports: list[tuple[int, str, str]] = []  # (port, service, banner)
        self.lock = threading.Lock()
        self.queue = Queue()
        self.scanned = 0
        self.total = len(ports)

    def _resolve_host(self, target: str, logger: logging.Logger) -> str:
        """Разрешает имя хоста в IP-адрес."""
        try:
            ip = socket.gethostbyname(target)
            if ip != target:
                logger.info(f"Разрешён: {target} → {ip}")
            return ip
        except socket.gaierror as e:
            logger.error(f"Не удалось разрешить хост '{target}': {e}")
            sys.exit(1)

    def scan_port(self, port: int) -> None:
        """Сканирует один порт — пытается установить TCP-соединение."""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(self.timeout)
            result = sock.connect_ex((self.target_ip, port))

            if result == 0:
                # Порт открыт — попробуем получить баннер
                banner = self._grab_banner(sock, port)
                service = COMMON_PORTS.get(port, "unknown")

                with self.lock:
                    self.open_ports.append((port, service, banner))
                    self.logger.info(f"  ОТКРЫТ  {port:>5}/tcp  {service:<12}  {banner}")

            sock.close()

        except socket.timeout:
            pass   # Фильтруется firewall — нормально
        except ConnectionRefusedError:
            pass   # Порт закрыт — нормально
        except OSError:
            pass   # Другие сетевые ошибки
        finally:
            with self.lock:
                self.scanned += 1

    def _grab_banner(self, sock: socket.socket, port: int) -> str:
        """Пытается получить баннер сервиса."""
        try:
            # HTTP-запрос для веб-сервисов
            if port in (80, 8080, 8000, 8888):
                sock.send(b"HEAD / HTTP/1.0\r\n\r\n")
            elif port in (443, 8443):
                return "SSL/TLS"
            else:
                sock.send(b"\r\n")

            sock.settimeout(0.5)
            banner = sock.recv(1024).decode("utf-8", errors="ignore").strip()
            # Берём первую строку, обрезаем до 60 символов
            first_line = banner.split("\n")[0][:60]
            return first_line if first_line else ""
        except Exception:
            return ""

    def worker(self) -> None:
        """Рабочий поток — берёт порты из очереди и сканирует."""
        while not self.queue.empty():
            port = self.queue.get()
            self.scan_port(port)
            self.queue.task_done()

    def run(self) -> list[tuple[int, str, str]]:
        """Запускает сканирование с многопоточностью."""
        for port in self.ports:
            self.queue.put(port)

        threads = []
        for _ in range(self.threads):
            t = threading.Thread(target=self.worker, daemon=True)
            t.start()
            threads.append(t)

        for t in threads:
            t.join()

        return sorted(self.open_ports, key=lambda x: x[0])


# ============================================================
# Разбор диапазона портов
# ============================================================
def parse_ports(port_string: str) -> list[int]:
    """
    Парсит строку портов в список чисел.
    Примеры: "80", "80,443,8080", "1-1000", "22,80,443,8000-9000"
    """
    ports = set()
    for part in port_string.split(","):
        part = part.strip()
        if "-" in part:
            start, end = map(int, part.split("-", 1))
            if not (1 <= start <= 65535 and 1 <= end <= 65535 and start <= end):
                raise ValueError(f"Неверный диапазон: {part}")
            ports.update(range(start, end + 1))
        else:
            port = int(part)
            if not 1 <= port <= 65535:
                raise ValueError(f"Неверный порт: {port}")
            ports.add(port)
    return sorted(ports)


# ============================================================
# Аргументы командной строки
# ============================================================
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="TCP Port Scanner — аналог nmap -sT",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры:
  python3 port_scanner.py -t 192.168.1.1
  python3 port_scanner.py -t 192.168.1.1 -p 1-1000
  python3 port_scanner.py -t example.com -p 22,80,443,8080-8090
  python3 port_scanner.py -t 10.0.0.1 -p 1-65535 -T 500 --timeout 0.5
        """
    )
    parser.add_argument("-t", "--target", required=True,
                        help="Цель: IP-адрес или hostname")
    parser.add_argument("-p", "--ports", default="1-1024",
                        help="Порты: '80', '1-1000', '22,80,443' (по умолч.: 1-1024)")
    parser.add_argument("-T", "--threads", type=int, default=DEFAULT_THREADS,
                        help=f"Количество потоков (по умолч.: {DEFAULT_THREADS}, макс.: {MAX_THREADS})")
    parser.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT,
                        help=f"Таймаут соединения в секундах (по умолч.: {DEFAULT_TIMEOUT})")
    parser.add_argument("-v", "--verbose", action="store_true",
                        help="Подробный вывод")
    parser.add_argument("--version", action="version", version=f"%(prog)s {VERSION}")
    return parser.parse_args()


# ============================================================
# Точка входа
# ============================================================
def main():
    args = parse_args()
    logger = setup_logging(args.verbose)

    try:
        ports = parse_ports(args.ports)
    except ValueError as e:
        logger.error(f"Ошибка в строке портов: {e}")
        sys.exit(1)

    print(f"""
╔══════════════════════════════════════════╗
║         TCP Port Scanner v{VERSION}          ║
╚══════════════════════════════════════════╝
  Цель:    {args.target}
  Порты:   {ports[0]}-{ports[-1]} ({len(ports)} портов)
  Потоки:  {args.threads}
  Таймаут: {args.timeout}s
  Старт:   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
""")

    scanner = PortScanner(args.target, ports, args.threads, args.timeout, logger)
    start_time = time.time()
    open_ports = scanner.run()
    elapsed = time.time() - start_time

    # Итоговый отчёт
    print(f"""
╔══════════════════════════════════════════╗
║              Результаты                  ║
╚══════════════════════════════════════════╝
  Отсканировано: {len(ports)} портов за {elapsed:.2f}с
  Открытых:      {len(open_ports)}
""")

    if open_ports:
        print(f"  {'ПОРТ':<8} {'СЕРВИС':<14} {'БАННЕР'}")
        print(f"  {'-'*7} {'-'*13} {'-'*40}")
        for port, service, banner in open_ports:
            print(f"  {port:<8} {service:<14} {banner}")
    else:
        print("  Открытых портов не найдено.")

    print()


if __name__ == "__main__":
    main()
```

### Запуск и примеры вывода

```bash
# Установка (нужен только стандартный Python 3.8+)
python3 port_scanner.py -t 192.168.1.1

# Пример вывода:
# ╔══════════════════════════════════════════╗
# ║         TCP Port Scanner v1.0.0          ║
# ╚══════════════════════════════════════════╝
#   Цель:    192.168.1.1
#   Порты:   1-1024 (1024 портов)
#   Потоки:  100
#
# 10:23:45 [INFO] ОТКРЫТ     22/tcp  SSH          SSH-2.0-OpenSSH_8.9p1
# 10:23:45 [INFO] ОТКРЫТ     80/tcp  HTTP         HTTP/1.1 200 OK
# 10:23:46 [INFO] ОТКРЫТ    443/tcp  HTTPS        SSL/TLS
#
# ╔══════════════════════════════════════════╗
# ║              Результаты                  ║
# ╚══════════════════════════════════════════╝
#   Отсканировано: 1024 портов за 8.34с
#   Открытых:      3
#
#   ПОРТ     СЕРВИС         БАННЕР
#   ------- ------------- ----------------------------------------
#   22       SSH            SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0
#   80       HTTP           HTTP/1.1 200 OK
#   443      HTTPS          SSL/TLS

# Быстрое сканирование всех портов
python3 port_scanner.py -t 10.0.0.1 -p 1-65535 -T 500 --timeout 0.5

# Сканирование популярных портов
python3 port_scanner.py -t example.com -p 21,22,23,25,80,110,143,443,445,3306,3389
```

---

## 4.4.2 Инструмент 2: Log Analyzer (обнаружение brute force)

### Логика работы

```
auth.log → парсинг строк → группировка по IP → подсчёт неудач
                                                      ↓
                                             превышен порог?
                                                      ↓
                                            Да → ALERT + отчёт
```

```python
#!/usr/bin/env python3
"""
log_analyzer.py — Анализатор auth.log для обнаружения brute force
Использование: python3 log_analyzer.py -f /var/log/auth.log -t 10
"""

import re
import argparse
import logging
import sys
from collections import defaultdict, Counter
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path


# ============================================================
# Структуры данных
# ============================================================
@dataclass
class LoginAttempt:
    """Одна попытка входа."""
    timestamp: str
    hostname: str
    user: str
    ip: str
    port: int
    method: str       # password / publickey
    success: bool
    invalid_user: bool = False


@dataclass
class IPStats:
    """Статистика по одному IP-адресу."""
    ip: str
    failed: int = 0
    successful: int = 0
    usernames: set = field(default_factory=set)
    timestamps: list = field(default_factory=list)
    is_brute_force: bool = False

    @property
    def unique_users(self) -> int:
        return len(self.usernames)

    @property
    def attack_duration_minutes(self) -> float:
        """Продолжительность атаки в минутах."""
        if len(self.timestamps) < 2:
            return 0.0
        # Упрощённо: берём первую и последнюю запись
        return 0.0  # Для полной реализации нужен парсинг дат


# ============================================================
# Парсер лог-файла
# ============================================================
class AuthLogParser:
    """Парсер файла /var/log/auth.log."""

    # Паттерн для неудачных попыток
    FAILED_PATTERN = re.compile(
        r"(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+"  # timestamp
        r"(\S+)\s+"                                       # hostname
        r"sshd\[\d+\]:\s+"                               # process
        r"Failed\s+(\w+)\s+"                             # method (password/publickey)
        r"for\s+(?:invalid user\s+)?"                    # optional "invalid user"
        r"(\S+)\s+"                                      # username
        r"from\s+(\d{1,3}(?:\.\d{1,3}){3})\s+"         # IP
        r"port\s+(\d+)",                                 # port
        re.IGNORECASE
    )

    # Паттерн для успешных входов
    ACCEPTED_PATTERN = re.compile(
        r"(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+"
        r"(\S+)\s+"
        r"sshd\[\d+\]:\s+"
        r"Accepted\s+(\w+)\s+"
        r"for\s+(\S+)\s+"
        r"from\s+(\d{1,3}(?:\.\d{1,3}){3})\s+"
        r"port\s+(\d+)",
        re.IGNORECASE
    )

    # Паттерн для sudo
    SUDO_PATTERN = re.compile(
        r"(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+"
        r"(\S+)\s+sudo\[.*?\]:\s+"
        r"(\S+)\s*:.*?COMMAND=(.*)",
        re.IGNORECASE
    )

    def __init__(self, log_file: str):
        self.log_file = Path(log_file)
        self.attempts: list[LoginAttempt] = []
        self.sudo_events: list[tuple] = []
        self.logger = logging.getLogger("LogAnalyzer")

    def parse(self) -> None:
        """Парсит лог-файл построчно."""
        if not self.log_file.exists():
            raise FileNotFoundError(f"Файл не найден: {self.log_file}")

        line_count = 0
        parsed_count = 0

        try:
            with open(self.log_file, "r", errors="replace") as f:
                for line in f:
                    line_count += 1
                    line = line.strip()

                    # Неудачные попытки
                    m = self.FAILED_PATTERN.search(line)
                    if m:
                        invalid = "invalid user" in line.lower()
                        attempt = LoginAttempt(
                            timestamp=m.group(1),
                            hostname=m.group(2),
                            user=m.group(4),
                            ip=m.group(5),
                            port=int(m.group(6)),
                            method=m.group(3),
                            success=False,
                            invalid_user=invalid,
                        )
                        self.attempts.append(attempt)
                        parsed_count += 1
                        continue

                    # Успешные входы
                    m = self.ACCEPTED_PATTERN.search(line)
                    if m:
                        attempt = LoginAttempt(
                            timestamp=m.group(1),
                            hostname=m.group(2),
                            user=m.group(4),
                            ip=m.group(5),
                            port=int(m.group(6)),
                            method=m.group(3),
                            success=True,
                        )
                        self.attempts.append(attempt)
                        parsed_count += 1
                        continue

                    # Sudo-события
                    m = self.SUDO_PATTERN.search(line)
                    if m:
                        self.sudo_events.append((
                            m.group(1), m.group(2), m.group(3), m.group(4).strip()
                        ))

        except PermissionError:
            self.logger.error(f"Нет прав на чтение {self.log_file}. Запустите с sudo.")
            sys.exit(1)

        self.logger.debug(f"Прочитано {line_count} строк, распознано {parsed_count} событий")


# ============================================================
# Анализатор
# ============================================================
class BruteForceAnalyzer:
    def __init__(self, threshold: int = 10):
        self.threshold = threshold
        self.ip_stats: dict[str, IPStats] = defaultdict(lambda: IPStats(""))

    def analyze(self, attempts: list[LoginAttempt]) -> None:
        """Строит статистику по IP-адресам."""
        for attempt in attempts:
            stats = self.ip_stats[attempt.ip]
            stats.ip = attempt.ip
            stats.usernames.add(attempt.user)
            stats.timestamps.append(attempt.timestamp)

            if attempt.success:
                stats.successful += 1
            else:
                stats.failed += 1

        # Отмечаем brute force
        for stats in self.ip_stats.values():
            if stats.failed >= self.threshold:
                stats.is_brute_force = True

    def get_top_attackers(self, n: int = 10) -> list[IPStats]:
        """Возвращает топ N IP по количеству неудач."""
        return sorted(
            self.ip_stats.values(),
            key=lambda s: s.failed,
            reverse=True
        )[:n]

    def get_successful_after_brute(self) -> list[IPStats]:
        """IP, которые атаковали и потом вошли успешно."""
        return [
            s for s in self.ip_stats.values()
            if s.is_brute_force and s.successful > 0
        ]


# ============================================================
# Вывод результатов
# ============================================================
def print_report(parser: AuthLogParser, analyzer: BruteForceAnalyzer,
                 threshold: int) -> None:
    """Выводит форматированный отчёт."""
    RED = "\033[0;31m"
    YELLOW = "\033[1;33m"
    GREEN = "\033[0;32m"
    CYAN = "\033[0;36m"
    BOLD = "\033[1m"
    NC = "\033[0m"

    total = len(parser.attempts)
    failed = sum(1 for a in parser.attempts if not a.success)
    success = sum(1 for a in parser.attempts if a.success)
    invalid = sum(1 for a in parser.attempts if a.invalid_user)

    print(f"\n{BOLD}{CYAN}{'='*55}{NC}")
    print(f"{BOLD}{CYAN}   Auth.log Brute Force Analyzer{NC}")
    print(f"{BOLD}{CYAN}{'='*55}{NC}")
    print(f"  Файл:           {parser.log_file}")
    print(f"  Всего событий:  {total}")
    print(f"  Неудачных:      {RED}{failed}{NC}")
    print(f"  Успешных:       {GREEN}{success}{NC}")
    print(f"  Неверных юзеров:{YELLOW}{invalid}{NC}")
    print(f"  Порог brute:    {threshold}")

    # Топ атакующих
    print(f"\n{BOLD}--- ТОП-10 атакующих IP ---{NC}")
    print(f"  {'Место':<5} {'IP-адрес':<18} {'Неудач':<8} {'Успешных':<10} {'Юзеров':<8} Статус")
    print(f"  {'-'*5} {'-'*17} {'-'*7} {'-'*9} {'-'*7} {'-'*12}")

    for i, stats in enumerate(analyzer.get_top_attackers(10), 1):
        if stats.is_brute_force:
            status = f"{RED}BRUTE FORCE{NC}"
        elif stats.failed > threshold // 2:
            status = f"{YELLOW}Подозрит.{NC}"
        else:
            status = f"{GREEN}Норма{NC}"

        users_preview = ", ".join(list(stats.usernames)[:3])
        if len(stats.usernames) > 3:
            users_preview += f" +{len(stats.usernames)-3}"

        print(f"  {i:<5} {stats.ip:<18} {stats.failed:<8} {stats.successful:<10} "
              f"{stats.unique_users:<8} ", end="")
        print(status)
        if stats.usernames:
            print(f"         Пользователи: {users_preview}")

    # Критические алерты
    critical = analyzer.get_successful_after_brute()
    if critical:
        print(f"\n{RED}{BOLD}!!! КРИТИЧНО: Успешные входы после brute force !!!{NC}")
        for stats in critical:
            print(f"  {RED}[ALERT]{NC} {stats.ip} — {stats.failed} неудач + {stats.successful} успешных!")
    else:
        print(f"\n{GREEN}Успешных входов с атакующих IP не обнаружено.{NC}")

    # Топ атакованных пользователей
    user_counter = Counter(a.user for a in parser.attempts if not a.success)
    print(f"\n{BOLD}--- Топ-5 атакованных пользователей ---{NC}")
    for user, count in user_counter.most_common(5):
        print(f"  {count:>6} попыток → {user}")

    # Sudo-события
    if parser.sudo_events:
        print(f"\n{BOLD}--- Sudo-события ({len(parser.sudo_events)}) ---{NC}")
        for ts, host, user, cmd in parser.sudo_events[-10:]:
            print(f"  {ts} {user} → root: {cmd[:60]}")

    print()


# ============================================================
# Аргументы и точка входа
# ============================================================
def main():
    parser = argparse.ArgumentParser(
        description="Анализатор auth.log — обнаружение SSH brute force"
    )
    parser.add_argument("-f", "--file", default="/var/log/auth.log",
                        help="Путь к auth.log (по умолч.: /var/log/auth.log)")
    parser.add_argument("-t", "--threshold", type=int, default=10,
                        help="Порог brute force: N неудачных попыток (по умолч.: 10)")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.WARNING,
        format="%(asctime)s [%(levelname)s] %(message)s"
    )

    log_parser = AuthLogParser(args.file)
    log_parser.parse()

    analyzer = BruteForceAnalyzer(threshold=args.threshold)
    analyzer.analyze(log_parser.attempts)

    print_report(log_parser, analyzer, args.threshold)


if __name__ == "__main__":
    main()
```

```bash
# Запуск
sudo python3 log_analyzer.py -f /var/log/auth.log -t 5

# Анализ с подробным выводом
sudo python3 log_analyzer.py -f /var/log/auth.log -t 10 -v

# Анализ архивного лога
sudo python3 log_analyzer.py -f /var/log/auth.log.1 -t 5
```

---

## 4.4.3 Инструмент 3: Hash Cracker

### Принцип словарного взлома

```
Словарь: rockyou.txt
    "password" → MD5 → 5f4dcc3b5aa765d61d8327deb882cf99
    "123456"   → MD5 → e10adc3949ba59abbe56e057f20f883e
    "qwerty"   → MD5 → d8578edf8458ce06fbc5bb76a58c5ca4
              ↓
    Ищем совпадение с целевым хешем
```

```python
#!/usr/bin/env python3
"""
hash_cracker.py — Словарный взломщик хешей MD5/SHA1/SHA256/SHA512
Использование: python3 hash_cracker.py -H <hash> -w rockyou.txt
ВНИМАНИЕ: Только для хешей, которыми вы владеете (CTF, тесты, восстановление своих паролей)
"""

import hashlib
import argparse
import sys
import time
import threading
from pathlib import Path
from queue import Queue


# ============================================================
# Поддерживаемые алгоритмы хеширования
# ============================================================
HASH_ALGORITHMS = {
    32:  ["md5"],
    40:  ["sha1"],
    56:  ["sha224"],
    64:  ["sha256", "sha3_256"],
    96:  ["sha384"],
    128: ["sha512", "sha3_512"],
}


def detect_hash_type(hash_str: str) -> list[str]:
    """Определяет возможный алгоритм по длине хеша."""
    hash_len = len(hash_str.strip())
    return HASH_ALGORITHMS.get(hash_len, ["unknown"])


def compute_hash(text: str, algorithm: str) -> str:
    """Вычисляет хеш строки заданным алгоритмом."""
    try:
        h = hashlib.new(algorithm)
        h.update(text.encode("utf-8", errors="replace"))
        return h.hexdigest()
    except ValueError:
        return ""


# ============================================================
# Однопоточный взломщик (простой)
# ============================================================
def crack_single_thread(target_hash: str, wordlist: Path,
                         algorithm: str, verbose: bool = False) -> str | None:
    """Перебирает словарь и ищет совпадение хеша."""
    target_hash = target_hash.lower().strip()
    found = None
    count = 0
    start = time.time()

    try:
        with open(wordlist, "r", errors="replace") as f:
            for line in f:
                word = line.rstrip("\n")
                count += 1

                # Прогресс каждые 100k слов
                if verbose and count % 100_000 == 0:
                    elapsed = time.time() - start
                    speed = count / elapsed if elapsed > 0 else 0
                    print(f"  Проверено: {count:,} | Скорость: {speed:,.0f} хеш/с | "
                          f"Последнее: {word[:20]!r}", end="\r")

                if compute_hash(word, algorithm) == target_hash:
                    found = word
                    break

    except FileNotFoundError:
        print(f"Словарь не найден: {wordlist}")
        sys.exit(1)
    except KeyboardInterrupt:
        print(f"\nПрервано пользователем. Проверено: {count:,} слов")
        sys.exit(0)

    elapsed = time.time() - start
    speed = count / elapsed if elapsed > 0 else 0
    print(f"\n  Итого: {count:,} слов за {elapsed:.2f}с ({speed:,.0f} хеш/с)")
    return found


# ============================================================
# Многопоточный взломщик (быстрый)
# ============================================================
class MultiThreadCracker:
    def __init__(self, target_hash: str, algorithm: str, threads: int = 4):
        self.target_hash = target_hash.lower().strip()
        self.algorithm = algorithm
        self.threads = threads
        self.found: str | None = None
        self.queue: Queue = Queue(maxsize=10_000)
        self.lock = threading.Lock()
        self.total_checked = 0
        self.start_time = time.time()

    def worker(self) -> None:
        """Рабочий поток."""
        while self.found is None:
            try:
                word = self.queue.get(timeout=0.1)
            except Exception:
                break

            if compute_hash(word, self.algorithm) == self.target_hash:
                with self.lock:
                    self.found = word
            
            with self.lock:
                self.total_checked += 1
            
            self.queue.task_done()

    def crack(self, wordlist: Path) -> str | None:
        """Запускает многопоточный перебор."""
        # Запускаем рабочие потоки
        workers = []
        for _ in range(self.threads):
            t = threading.Thread(target=self.worker, daemon=True)
            t.start()
            workers.append(t)

        # Читаем словарь и заполняем очередь
        try:
            with open(wordlist, "r", errors="replace") as f:
                for line in f:
                    if self.found:
                        break
                    word = line.rstrip("\n")
                    self.queue.put(word, block=True)
        except KeyboardInterrupt:
            print("\nПрервано.")

        # Ждём завершения
        self.queue.join()
        for t in workers:
            t.join(timeout=1.0)

        return self.found


# ============================================================
# Аргументы и точка входа
# ============================================================
def main():
    parser = argparse.ArgumentParser(
        description="Словарный взломщик хешей (только для CTF и собственных данных!)"
    )
    parser.add_argument("-H", "--hash", required=True,
                        help="Целевой хеш для взлома")
    parser.add_argument("-w", "--wordlist", required=True,
                        help="Путь к словарю (например, /usr/share/wordlists/rockyou.txt)")
    parser.add_argument("-a", "--algorithm",
                        help="Алгоритм: md5, sha1, sha256, sha512 (автодетект по умолч.)")
    parser.add_argument("-T", "--threads", type=int, default=4,
                        help="Количество потоков (по умолч.: 4)")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    target = args.hash.lower().strip()

    # Определяем алгоритм
    if args.algorithm:
        algorithms = [args.algorithm]
    else:
        algorithms = detect_hash_type(target)
        if "unknown" in algorithms:
            print(f"Неизвестная длина хеша ({len(target)} символов). Укажите -a вручную.")
            sys.exit(1)
        print(f"Автодетект: возможные алгоритмы: {', '.join(algorithms)}")

    wordlist = Path(args.wordlist)

    print(f"""
╔═══════════════════════════════════╗
║      Hash Cracker (CTF/Test)      ║
╚═══════════════════════════════════╝
  Хеш:      {target}
  Алгоритм: {', '.join(algorithms)}
  Словарь:  {wordlist}
  Потоки:   {args.threads}
""")

    for algorithm in algorithms:
        print(f"[*] Пробуем алгоритм: {algorithm}")

        cracker = MultiThreadCracker(target, algorithm, args.threads)
        start = time.time()
        result = cracker.crack(wordlist)
        elapsed = time.time() - start

        if result is not None:
            print(f"\n  ✓ НАЙДЕНО! '{result}' ({algorithm})")
            print(f"  Время: {elapsed:.2f}с | Проверено: {cracker.total_checked:,}")
            return

    print(f"\n  ✗ Пароль не найден в словаре.")
    print(f"  Попробуйте более полный словарь или правила мутации.")


if __name__ == "__main__":
    main()
```

```bash
# Установка (нужен только stdlib)
# Скачать словарь:
# gunzip /usr/share/wordlists/rockyou.txt.gz   (Kali Linux)

# Взломать MD5 (пример — хеш слова "password")
python3 hash_cracker.py -H 5f4dcc3b5aa765d61d8327deb882cf99 -w rockyou.txt

# Пример вывода:
# [*] Пробуем алгоритм: md5
# Проверено: 100,000 | Скорость: 523,145 хеш/с | Последнее: 'passw0rd1'
#
#   ✓ НАЙДЕНО! 'password' (md5)
#   Время: 0.03с | Проверено: 14

# SHA256
python3 hash_cracker.py \
  -H e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 \
  -w rockyou.txt -a sha256
```

---

## 4.4.4 Инструмент 4: Directory Bruteforcer

### Как работает поиск директорий

```
Цель: http://example.com/

Запрос: GET /admin HTTP/1.1       → 200 OK → НАЙДЕНО
Запрос: GET /backup HTTP/1.1      → 403 Forbidden → СУЩЕСТВУЕТ (но нет доступа)
Запрос: GET /notexist HTTP/1.1    → 404 Not Found → нет
Запрос: GET /.env HTTP/1.1        → 200 OK → НАЙДЕНО (ОПАСНО!)
```

```python
#!/usr/bin/env python3
"""
dir_bruteforcer.py — Поиск скрытых директорий и файлов веб-сервера
Использование: python3 dir_bruteforcer.py -u http://example.com -w common.txt
ТОЛЬКО на системах с явным разрешением на пентест!
"""

import requests
import argparse
import sys
import time
import threading
import logging
from queue import Queue
from urllib.parse import urljoin
from pathlib import Path
from dataclasses import dataclass, field


# ============================================================
# Структура результата
# ============================================================
@dataclass
class FoundItem:
    url: str
    status_code: int
    content_length: int
    content_type: str
    redirect_to: str = ""


# ============================================================
# Основной класс
# ============================================================
class DirBruteforcer:
    # Статус-коды, которые означают "нашли что-то интересное"
    INTERESTING_CODES = {200, 201, 202, 204, 301, 302, 307, 403, 405, 500}

    # Расширения файлов для проверки (в дополнение к базовому пути)
    DEFAULT_EXTENSIONS = ["", ".php", ".html", ".txt", ".bak", ".old", ".zip"]

    def __init__(self, base_url: str, wordlist: Path, threads: int = 20,
                 extensions: list[str] = None, timeout: int = 5,
                 user_agent: str = None, status_codes: set[int] = None):
        self.base_url = base_url.rstrip("/") + "/"
        self.wordlist = wordlist
        self.threads = threads
        self.extensions = extensions or self.DEFAULT_EXTENSIONS
        self.timeout = timeout
        self.user_agent = user_agent or "Mozilla/5.0 (compatible; SecurityScanner/1.0)"
        self.interesting_codes = status_codes or self.INTERESTING_CODES
        self.found: list[FoundItem] = []
        self.queue: Queue = Queue()
        self.lock = threading.Lock()
        self.checked = 0
        self.logger = logging.getLogger("DirBruteforcer")

        # Сессия requests с настройками
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": self.user_agent})

    def check_url(self, url: str) -> FoundItem | None:
        """Проверяет одну URL."""
        try:
            resp = self.session.get(
                url,
                timeout=self.timeout,
                allow_redirects=False,  # Отслеживаем редиректы вручную
                verify=False            # Игнорируем SSL-ошибки (для тестирования)
            )

            if resp.status_code in self.interesting_codes:
                redirect = resp.headers.get("Location", "")
                ctype = resp.headers.get("Content-Type", "").split(";")[0]
                return FoundItem(
                    url=url,
                    status_code=resp.status_code,
                    content_length=len(resp.content),
                    content_type=ctype,
                    redirect_to=redirect,
                )
        except requests.exceptions.SSLError:
            # Пробуем без проверки SSL
            pass
        except requests.exceptions.ConnectionError:
            pass
        except requests.exceptions.Timeout:
            pass
        except Exception as e:
            self.logger.debug(f"Ошибка для {url}: {e}")
        return None

    def worker(self) -> None:
        """Рабочий поток."""
        while not self.queue.empty():
            url = self.queue.get()
            result = self.check_url(url)

            with self.lock:
                self.checked += 1
                if result:
                    self.found.append(result)
                    color = self._get_color(result.status_code)
                    reset = "\033[0m"
                    extra = f" → {result.redirect_to}" if result.redirect_to else ""
                    print(
                        f"  {color}[{result.status_code}]{reset} "
                        f"{result.url:<60} "
                        f"{result.content_length:>8} байт  "
                        f"{result.content_type}{extra}"
                    )

            self.queue.task_done()

    def _get_color(self, status: int) -> str:
        if status == 200:                    return "\033[0;32m"   # Green
        if status in (301, 302, 307):        return "\033[0;36m"   # Cyan
        if status == 403:                    return "\033[1;33m"   # Yellow
        if status in (500, 501, 502, 503):   return "\033[0;31m"   # Red
        return "\033[0;37m"                                         # Grey

    def load_wordlist(self) -> list[str]:
        """Загружает список слов из файла."""
        words = []
        try:
            with open(self.wordlist, "r", errors="replace") as f:
                for line in f:
                    word = line.strip()
                    if word and not word.startswith("#"):
                        words.append(word)
        except FileNotFoundError:
            print(f"Словарь не найден: {self.wordlist}")
            sys.exit(1)
        return words

    def run(self) -> list[FoundItem]:
        """Запускает сканирование."""
        words = self.load_wordlist()

        # Формируем список URL для проверки
        urls = []
        for word in words:
            for ext in self.extensions:
                url = urljoin(self.base_url, word + ext)
                urls.append(url)

        total = len(urls)
        print(f"  Всего URL для проверки: {total:,}")
        print(f"  {'Статус':<8} {'URL':<60} {'Размер':<10} Тип")
        print(f"  {'-'*90}")

        for url in urls:
            self.queue.put(url)

        # Запускаем потоки
        workers = []
        for _ in range(self.threads):
            t = threading.Thread(target=self.worker, daemon=True)
            t.start()
            workers.append(t)

        start = time.time()
        for t in workers:
            t.join()
        elapsed = time.time() - start

        print(f"\n  Проверено: {self.checked:,} URL за {elapsed:.2f}с "
              f"({self.checked/elapsed:.0f} req/s)")

        return sorted(self.found, key=lambda x: x.status_code)


# ============================================================
# Встроенный мини-словарь для быстрого теста
# ============================================================
BUILTIN_WORDLIST = """admin
administrator
backup
config
.env
.git
.htaccess
api
login
wp-admin
phpmyadmin
test
tmp
upload
uploads
static
assets
dashboard
console
manager
server-status""".strip().split("\n")


def main():
    # Подавить предупреждения SSL
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    parser = argparse.ArgumentParser(
        description="Directory Bruteforcer — поиск скрытых директорий"
    )
    parser.add_argument("-u", "--url", required=True,
                        help="Базовый URL цели (например: http://example.com)")
    parser.add_argument("-w", "--wordlist",
                        help="Словарь для перебора (если не указан — встроенный)")
    parser.add_argument("-T", "--threads", type=int, default=20,
                        help="Количество потоков (по умолч.: 20)")
    parser.add_argument("-e", "--extensions", default=",php,html,txt",
                        help="Расширения через запятую (по умолч.: ,php,html,txt)")
    parser.add_argument("--timeout", type=int, default=5)
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.WARNING)

    extensions = ["." + e.lstrip(".") if e else "" for e in args.extensions.split(",")]

    print(f"""
╔══════════════════════════════════════════╗
║       Directory Bruteforcer v1.0         ║
╚══════════════════════════════════════════╝
  Цель:     {args.url}
  Словарь:  {args.wordlist or 'встроенный'}
  Потоки:   {args.threads}
  Расшир.:  {extensions}
""")

    if args.wordlist:
        wordlist = Path(args.wordlist)
    else:
        # Используем встроенный словарь
        import tempfile
        tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False)
        tmp.write("\n".join(BUILTIN_WORDLIST))
        tmp.close()
        wordlist = Path(tmp.name)

    bruteforcer = DirBruteforcer(
        base_url=args.url,
        wordlist=wordlist,
        threads=args.threads,
        extensions=extensions,
        timeout=args.timeout,
    )

    found = bruteforcer.run()

    print(f"\n{'='*55}")
    print(f"Найдено: {len(found)} объектов")
    if found:
        print(f"\n{'Статус':<8} URL")
        for item in found:
            print(f"  [{item.status_code}]  {item.url}")


if __name__ == "__main__":
    main()
```

```bash
# Запуск на локальном тестовом сервере
pip3 install requests
python3 dir_bruteforcer.py -u http://localhost:8080

# С словарём SecLists (Kali Linux)
python3 dir_bruteforcer.py \
    -u http://192.168.1.100 \
    -w /usr/share/wordlists/dirb/common.txt \
    -T 50 -e ",php,html,bak,zip"

# Пример вывода:
# [200]  http://localhost:8080/admin/              4521 байт  text/html
# [403]  http://localhost:8080/.htaccess             245 байт  text/html
# [200]  http://localhost:8080/.env                   89 байт  text/plain
# [301]  http://localhost:8080/uploads/     → /uploads/
```

---

## 4.4.5 Инструмент 5: IOC Checker (VirusTotal API)

### Что такое IOC и VirusTotal

**IOC** (Indicator of Compromise) — признак компрометации: IP-адрес, домен, хеш файла, URL.

**VirusTotal** — бесплатный сервис для проверки файлов, хешей, URL, IP и доменов через 70+ антивирусных движков.

```python
#!/usr/bin/env python3
"""
ioc_checker.py — Проверка IoC (IP/домен/хеш) через VirusTotal API v3
Документация: https://developers.virustotal.com/reference
Использование: python3 ioc_checker.py -k <API_KEY> -i 8.8.8.8
               python3 ioc_checker.py -k <API_KEY> -f iocs.txt
"""

import requests
import argparse
import json
import time
import sys
import logging
from pathlib import Path
from dataclasses import dataclass
import re
import hashlib


# ============================================================
# API-конфигурация
# ============================================================
VT_BASE_URL = "https://www.virustotal.com/api/v3"
VT_RATE_LIMIT = 4          # Бесплатный аккаунт: 4 запроса в минуту
VT_RATE_WINDOW = 60        # Окно в секундах


# ============================================================
# Структуры данных
# ============================================================
@dataclass
class IOCResult:
    ioc: str
    ioc_type: str          # ip, domain, hash, url
    malicious: int         # Количество детектов "malicious"
    suspicious: int
    harmless: int
    undetected: int
    total: int
    reputation: int        # -100..+100
    tags: list[str]
    raw_data: dict


# ============================================================
# Определение типа IOC
# ============================================================
def detect_ioc_type(ioc: str) -> str:
    """Определяет тип IOC по формату."""
    ioc = ioc.strip()

    # IPv4
    if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", ioc):
        return "ip"

    # MD5
    if re.match(r"^[a-fA-F0-9]{32}$", ioc):
        return "hash"

    # SHA1
    if re.match(r"^[a-fA-F0-9]{40}$", ioc):
        return "hash"

    # SHA256
    if re.match(r"^[a-fA-F0-9]{64}$", ioc):
        return "hash"

    # URL
    if ioc.startswith(("http://", "https://")):
        return "url"

    # Домен (упрощённо)
    if re.match(r"^[a-zA-Z0-9][a-zA-Z0-9\-\.]{1,253}[a-zA-Z0-9]\.[a-zA-Z]{2,}$", ioc):
        return "domain"

    return "unknown"


# ============================================================
# VirusTotal API клиент
# ============================================================
class VirusTotalClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "x-apikey": api_key,
            "Accept": "application/json",
        })
        self.request_count = 0
        self.window_start = time.time()
        self.logger = logging.getLogger("VTClient")

    def _rate_limit(self) -> None:
        """Ограничение запросов: 4 в минуту для бесплатного аккаунта."""
        self.request_count += 1
        elapsed = time.time() - self.window_start

        if self.request_count >= VT_RATE_LIMIT:
            wait = VT_RATE_WINDOW - elapsed
            if wait > 0:
                self.logger.info(f"Rate limit: ждём {wait:.1f}с...")
                time.sleep(wait + 1)
            self.request_count = 0
            self.window_start = time.time()

    def _get(self, endpoint: str) -> dict | None:
        """Выполняет GET-запрос к API."""
        self._rate_limit()
        url = f"{VT_BASE_URL}/{endpoint}"

        try:
            resp = self.session.get(url, timeout=30)
            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code == 404:
                self.logger.warning(f"IOC не найден в базе VT: {endpoint}")
                return None
            elif resp.status_code == 401:
                self.logger.error("Неверный API ключ VirusTotal!")
                sys.exit(1)
            elif resp.status_code == 429:
                self.logger.warning("Rate limit превышен. Ждём 60с...")
                time.sleep(60)
                return self._get(endpoint)  # Повторная попытка
            else:
                self.logger.error(f"HTTP {resp.status_code} для {url}")
                return None

        except requests.exceptions.ConnectionError:
            self.logger.error("Нет соединения с VirusTotal API")
            return None
        except requests.exceptions.Timeout:
            self.logger.error("Таймаут запроса к VirusTotal")
            return None

    def check_ip(self, ip: str) -> IOCResult | None:
        """Проверяет IP-адрес."""
        data = self._get(f"ip_addresses/{ip}")
        if not data:
            return None

        attrs = data.get("data", {}).get("attributes", {})
        stats = attrs.get("last_analysis_stats", {})

        return IOCResult(
            ioc=ip,
            ioc_type="ip",
            malicious=stats.get("malicious", 0),
            suspicious=stats.get("suspicious", 0),
            harmless=stats.get("harmless", 0),
            undetected=stats.get("undetected", 0),
            total=sum(stats.values()),
            reputation=attrs.get("reputation", 0),
            tags=attrs.get("tags", []),
            raw_data=attrs,
        )

    def check_domain(self, domain: str) -> IOCResult | None:
        """Проверяет домен."""
        data = self._get(f"domains/{domain}")
        if not data:
            return None

        attrs = data.get("data", {}).get("attributes", {})
        stats = attrs.get("last_analysis_stats", {})

        return IOCResult(
            ioc=domain,
            ioc_type="domain",
            malicious=stats.get("malicious", 0),
            suspicious=stats.get("suspicious", 0),
            harmless=stats.get("harmless", 0),
            undetected=stats.get("undetected", 0),
            total=sum(stats.values()),
            reputation=attrs.get("reputation", 0),
            tags=attrs.get("tags", []),
            raw_data=attrs,
        )

    def check_hash(self, file_hash: str) -> IOCResult | None:
        """Проверяет хеш файла."""
        data = self._get(f"files/{file_hash.lower()}")
        if not data:
            return None

        attrs = data.get("data", {}).get("attributes", {})
        stats = attrs.get("last_analysis_stats", {})

        return IOCResult(
            ioc=file_hash,
            ioc_type="hash",
            malicious=stats.get("malicious", 0),
            suspicious=stats.get("suspicious", 0),
            harmless=stats.get("harmless", 0),
            undetected=stats.get("undetected", 0),
            total=sum(stats.values()),
            reputation=0,
            tags=attrs.get("tags", []),
            raw_data=attrs,
        )

    def check_url(self, url: str) -> IOCResult | None:
        """Проверяет URL (требует base64url-кодирования ID)."""
        import base64
        url_id = base64.urlsafe_b64encode(url.encode()).decode().rstrip("=")
        data = self._get(f"urls/{url_id}")
        if not data:
            return None

        attrs = data.get("data", {}).get("attributes", {})
        stats = attrs.get("last_analysis_stats", {})

        return IOCResult(
            ioc=url,
            ioc_type="url",
            malicious=stats.get("malicious", 0),
            suspicious=stats.get("suspicious", 0),
            harmless=stats.get("harmless", 0),
            undetected=stats.get("undetected", 0),
            total=sum(stats.values()),
            reputation=0,
            tags=attrs.get("tags", []),
            raw_data=attrs,
        )

    def check(self, ioc: str) -> IOCResult | None:
        """Автоматически определяет тип IOC и выполняет проверку."""
        ioc_type = detect_ioc_type(ioc)
        dispatch = {
            "ip":     self.check_ip,
            "domain": self.check_domain,
            "hash":   self.check_hash,
            "url":    self.check_url,
        }

        if ioc_type == "unknown":
            logging.warning(f"Неизвестный тип IOC: {ioc}")
            return None

        return dispatch[ioc_type](ioc)


# ============================================================
# Вывод результатов
# ============================================================
def print_result(result: IOCResult) -> None:
    """Выводит результат проверки IOC."""
    RED = "\033[0;31m"
    YELLOW = "\033[1;33m"
    GREEN = "\033[0;32m"
    CYAN = "\033[0;36m"
    NC = "\033[0m"

    # Определяем уровень угрозы
    if result.malicious >= 5:
        threat_color = RED
        threat_level = "ВЫСОКАЯ УГРОЗА"
    elif result.malicious >= 1 or result.suspicious >= 3:
        threat_color = YELLOW
        threat_level = "ПОДОЗРИТЕЛЬНО"
    else:
        threat_color = GREEN
        threat_level = "ЧИСТО"

    print(f"\n  {CYAN}IOC:{NC} {result.ioc}")
    print(f"  {CYAN}Тип:{NC} {result.ioc_type.upper()}")
    print(f"  {CYAN}Угроза:{NC} {threat_color}{threat_level}{NC}")
    print(f"  {CYAN}Детекты:{NC} "
          f"{RED}{result.malicious} malicious{NC} / "
          f"{YELLOW}{result.suspicious} suspicious{NC} / "
          f"{GREEN}{result.harmless} harmless{NC} / "
          f"{result.undetected} undetected")

    if result.total > 0:
        pct = (result.malicious / result.total) * 100
        print(f"  {CYAN}Engines:{NC} {result.malicious}/{result.total} ({pct:.1f}%)")

    if result.reputation != 0:
        rep_color = RED if result.reputation < 0 else GREEN
        print(f"  {CYAN}Репутация:{NC} {rep_color}{result.reputation}{NC}")

    if result.tags:
        print(f"  {CYAN}Теги:{NC} {', '.join(result.tags[:5])}")

    # Дополнительные поля из raw_data
    raw = result.raw_data
    if result.ioc_type == "hash":
        print(f"  {CYAN}Имя файла:{NC} {raw.get('meaningful_name', 'N/A')}")
        print(f"  {CYAN}Тип файла:{NC} {raw.get('type_description', 'N/A')}")
        print(f"  {CYAN}Размер:{NC}    {raw.get('size', 'N/A')} байт")

    if result.ioc_type in ("ip", "domain"):
        country = raw.get("country", raw.get("last_dns_records", [{}])[0].get("value", "N/A") if isinstance(raw.get("last_dns_records"), list) else "N/A")
        asn = raw.get("asn", "N/A")
        owner = raw.get("as_owner", "N/A")
        if country != "N/A":
            print(f"  {CYAN}Страна:{NC}   {country}")
        if asn != "N/A":
            print(f"  {CYAN}ASN:{NC}      {asn} ({owner})")


def main():
    parser = argparse.ArgumentParser(
        description="IOC Checker — проверка индикаторов компрометации через VirusTotal"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("-i", "--ioc",
                       help="Один IOC: IP, домен, хеш файла или URL")
    group.add_argument("-f", "--file",
                       help="Файл со списком IOC (по одному на строку)")
    parser.add_argument("-k", "--key", required=True,
                        help="API ключ VirusTotal (https://www.virustotal.com/gui/my-apikey)")
    parser.add_argument("-o", "--output",
                        help="Сохранить результаты в JSON-файл")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s"
    )

    client = VirusTotalClient(args.key)

    ioc_list = []
    if args.ioc:
        ioc_list = [args.ioc]
    else:
        with open(args.file) as f:
            ioc_list = [line.strip() for line in f if line.strip() and not line.startswith("#")]

    print(f"\n{'='*55}")
    print(f"  IOC Checker — VirusTotal API")
    print(f"  Проверяем: {len(ioc_list)} индикаторов")
    print(f"{'='*55}")

    results = []
    for ioc in ioc_list:
        logging.info(f"Проверяем: {ioc}")
        result = client.check(ioc)
        if result:
            print_result(result)
            results.append(result)
        else:
            print(f"\n  {ioc} — не найден в базе VirusTotal")

    if args.output and results:
        output_data = [
            {
                "ioc": r.ioc,
                "type": r.ioc_type,
                "malicious": r.malicious,
                "suspicious": r.suspicious,
                "total": r.total,
                "reputation": r.reputation,
                "tags": r.tags,
            }
            for r in results
        ]
        with open(args.output, "w") as f:
            json.dump(output_data, f, indent=2)
        print(f"\n  Результаты сохранены: {args.output}")

    # Сводка
    total_malicious = sum(r.malicious for r in results)
    if total_malicious > 0:
        print(f"\n  !!! ИТОГО ВРЕДОНОСНЫХ IOC: {total_malicious} !!!")


if __name__ == "__main__":
    main()
```

```bash
# Получить API ключ: https://www.virustotal.com/gui/my-apikey (бесплатно)
pip3 install requests

# Проверить один IP
python3 ioc_checker.py -k YOUR_API_KEY -i 185.220.101.1

# Проверить домен
python3 ioc_checker.py -k YOUR_API_KEY -i malicious-domain.xyz

# Проверить хеш файла
python3 ioc_checker.py -k YOUR_API_KEY \
  -i 44d88612fea8a8f36de82e1278abb02f  # Тестовый EICAR файл

# Проверить список IOC из файла и сохранить результаты
python3 ioc_checker.py -k YOUR_API_KEY -f iocs.txt -o results.json

# Пример вывода:
# ═══════════════════════════════════════════════════
#   IOC: 185.220.101.1
#   Тип: IP
#   Угроза: ВЫСОКАЯ УГРОЗА
#   Детекты: 12 malicious / 2 suspicious / 48 harmless
#   Engines: 12/75 (16.0%)
#   Репутация: -62
#   Теги: tor-exit-node, anonymous
#   Страна: DE
#   ASN: 50304 (Bandwidth Alliance AS)
```

---

## 📝 Практическое задание

### Задание: Интеграция инструментов

Создайте скрипт `soc_toolkit.py`, который объединяет несколько инструментов:

1. Принимает IP-адрес как аргумент
2. Запускает порт-сканер для этого IP (порты 1-1024)
3. Если найден порт 22 — проверяет `/var/log/auth.log` на попытки с этого IP
4. Если найден порт 80/443 — проверяет этот IP в VirusTotal
5. Выводит сводный отчёт

```bash
# Ожидаемый запуск:
python3 soc_toolkit.py --target 192.168.1.100 --vt-key YOUR_KEY

# Ожидаемый вывод:
# === SOC Toolkit Report: 192.168.1.100 ===
# [Порт-скан]  22/tcp ОТКРЫТ (SSH-2.0-OpenSSH_8.9)
# [Порт-скан]  80/tcp ОТКРЫТ (nginx/1.18.0)
# [auth.log]   247 неудачных SSH-попыток с этого IP
# [VirusTotal] Репутация: -25 | 3 malicious / 1 suspicious
# [Вердикт]    ПОДОЗРИТЕЛЬНЫЙ ХОСТ — рекомендуется блокировка
```

---

## 📚 Итоги главы

| Инструмент | Технологии | Применение в SOC |
|------------|------------|-----------------|
| Port Scanner | socket, threading, Queue | Разведка, инвентаризация хостов |
| Log Analyzer | re, dataclasses, Counter | Обнаружение brute force в auth.log |
| Hash Cracker | hashlib, threading | CTF, анализ паролей в инцидентах |
| Dir Bruteforcer | requests, threading | Пентест веб-приложений |
| IOC Checker | requests, VirusTotal API | Обогащение инцидентов, Threat Intel |

> **Главный вывод:** Python — язык выбора для инструментов безопасности благодаря богатой stdlib, читаемости и скорости разработки. Освоив эти 5 инструментов, вы понимаете принципы, лежащие в основе nmap, Hydra, dirb и MISP. Следующий шаг — изучение фреймворка Scapy для сетевого анализа и написание собственных Burp Suite-плагинов.

---

[← Предыдущая](./chapter-4-3) | [Следующая →](../part-5/chapter-5-1)
