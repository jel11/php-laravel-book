# Глава 4.3: Парсинг логов: re, os, csv, json

## 🎯 Цели главы

- Освоить регулярные выражения Python для парсинга любых форматов логов
- Научиться работать с файловой системой через модуль `os`
- Разобрать работу с JSON и CSV для обмена данными с SIEM
- Написать полноценный парсер `access.log` и `auth.log`
- Создать CLI-инструмент анализа логов с выводом топ-атак

---

## 4.3.1 Регулярные выражения в Python (модуль re)

Регулярные выражения — главный инструмент парсинга логов. В PHP это `preg_match/preg_replace`, в Python — модуль `re`.

### Основные функции

```python
import re

text = "Failed password for invalid user admin from 192.168.1.100 port 54321 ssh2"

# re.search — найти первое совпадение в любом месте строки
match = re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', text)
if match:
    print(f"IP found: {match.group()}")  # 192.168.1.100
    print(f"Position: {match.start()}-{match.end()}")

# re.match — совпадение только в НАЧАЛЕ строки
match = re.match(r'Failed', text)  # None — text не начинается с Failed
match = re.match(r'Failed', "Failed password for admin")  # совпало

# re.fullmatch — совпадение всей строки
is_ip = re.fullmatch(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', "192.168.1.1")  # match

# re.findall — все совпадения (список строк)
log_sample = """
192.168.1.1 - - [15/Jan/2025:10:23:45 +0000] "GET /admin HTTP/1.1" 401 1234
10.0.0.1 - admin [15/Jan/2025:10:23:46 +0000] "POST /login HTTP/1.1" 200 512
192.168.1.2 - - [15/Jan/2025:10:23:47 +0000] "GET /wp-admin HTTP/1.1" 404 890
"""
all_ips = re.findall(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', log_sample)
print(all_ips)  # ['192.168.1.1', '10.0.0.1', '192.168.1.2']

# re.finditer — итератор объектов Match (с позициями)
for m in re.finditer(r'\b(\d{1,3}\.){3}\d{1,3}\b', log_sample):
    print(f"  IP: {m.group()}, at position {m.start()}")

# re.sub — замена
sanitized = re.sub(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', 'X.X.X.X', log_sample)

# re.split — разбивка строки
parts = re.split(r'\s+', "  too   many   spaces  ")
# ['', 'too', 'many', 'spaces', '']

# re.compile — компиляция паттерна (для многократного использования)
ip_pattern = re.compile(r'\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b')
# Теперь используем методы объекта:
match = ip_pattern.search(text)
all_ips = ip_pattern.findall(log_sample)  # возвращает список кортежей (групп)
```

### Синтаксис регулярных выражений

| Паттерн | Описание | Пример |
|---------|----------|--------|
| `.` | Любой символ кроме `\n` | `a.c` → abc, axc |
| `\d` | Цифра `[0-9]` | `\d+` → 123, 456 |
| `\D` | Не цифра | `\D+` → abc, xyz |
| `\w` | Буква, цифра, `_` `[a-zA-Z0-9_]` | `\w+` → hello_123 |
| `\W` | Не `\w` | пробелы, знаки |
| `\s` | Пробельный символ | `\s+` → пробел, таб |
| `\S` | Не пробельный | любой непробел |
| `\b` | Граница слова | `\bcat\b` не в "concatenate" |
| `^` | Начало строки | `^Error` |
| `$` | Конец строки | `\.log$` |
| `*` | 0 или более | `a*` → "", a, aa |
| `+` | 1 или более | `a+` → a, aa, aaa |
| `?` | 0 или 1 (необязательно) | `colou?r` → color, colour |
| `{n}` | Ровно n раз | `\d{4}` → 2025 |
| `{n,m}` | От n до m раз | `\d{1,3}` → 1, 12, 123 |
| `[...]` | Класс символов | `[aeiou]`, `[0-9]`, `[a-zA-Z]` |
| `[^...]` | Отрицание класса | `[^0-9]` не цифра |
| `(...)` | Группа захвата | `(GET\|POST)` |
| `(?:...)` | Группа без захвата | `(?:GET\|POST)` |
| `(?P<name>...)` | Именованная группа | `(?P<ip>\d+\.\d+\.\d+\.\d+)` |
| `\|` | Альтернатива | `cat\|dog` |
| `(?i)` | Игнорировать регистр | `(?i)error` → ERROR, error |
| `(?m)` | Многострочный режим | `^` и `$` для каждой строки |
| `(?s)` | `.` включает `\n` | dotall режим |

### Флаги компиляции

```python
import re

# Игнорирование регистра
pattern = re.compile(r'error|exception|fail', re.IGNORECASE)
# эквивалентно: re.compile(r'(?i)error|exception|fail')

# Многострочный режим
pattern = re.compile(r'^\d{4}-\d{2}-\d{2}', re.MULTILINE)

# Dotall — точка совпадает с переводом строки
pattern = re.compile(r'<div>.*?</div>', re.DOTALL)

# Комбинирование флагов
pattern = re.compile(r'error', re.IGNORECASE | re.MULTILINE)

# Verbose — комментарии в регулярном выражении
ip_pattern = re.compile(r"""
    \b                      # граница слова
    (?:                     # группа без захвата
        (?:25[0-5]|         # 250-255
           2[0-4]\d|        # 200-249
           [01]?\d\d?)      # 0-199
        \.                  # точка
    ){3}                    # три октета
    (?:25[0-5]|2[0-4]\d|[01]?\d\d?)  # четвёртый октет
    \b                      # граница слова
""", re.VERBOSE)
```

### Именованные группы — ключевой инструмент парсинга логов

```python
import re

# Паттерн для Apache/Nginx access.log
# 192.168.1.1 - admin [15/Jan/2025:10:23:45 +0000] "GET /admin HTTP/1.1" 200 1234 "http://ref.com" "Mozilla/5.0"
ACCESS_LOG_PATTERN = re.compile(
    r'(?P<ip>\S+)\s+'                    # IP-адрес
    r'(?P<ident>\S+)\s+'                 # ident (обычно -)
    r'(?P<user>\S+)\s+'                  # пользователь
    r'\[(?P<datetime>[^\]]+)\]\s+'       # время [15/Jan/2025:10:23:45 +0000]
    r'"(?P<method>\S+)\s+'               # метод запроса GET
    r'(?P<path>\S+)\s+'                  # путь /admin
    r'(?P<protocol>[^"]+)"\s+'           # протокол HTTP/1.1
    r'(?P<status>\d{3})\s+'              # статус-код 200
    r'(?P<size>\d+|-)'                   # размер ответа
    r'(?:\s+"(?P<referer>[^"]*)")?'      # Referer (опционально)
    r'(?:\s+"(?P<useragent>[^"]*)")?'    # User-Agent (опционально)
)

# Парсинг строки
line = '192.168.1.1 - admin [15/Jan/2025:10:23:45 +0000] "GET /admin HTTP/1.1" 401 1234 "https://google.com" "Mozilla/5.0"'

match = ACCESS_LOG_PATTERN.match(line)
if match:
    data = match.groupdict()
    print(f"IP:     {data['ip']}")
    print(f"Method: {data['method']}")
    print(f"Path:   {data['path']}")
    print(f"Status: {data['status']}")
    print(f"Size:   {data['size']}")
    print(f"UA:     {data.get('useragent', 'N/A')}")
```

### Полезные паттерны для безопасника

```python
# ==================== Готовые паттерны ====================

PATTERNS = {
    # IP-адрес (IPv4)
    "ipv4": re.compile(
        r'\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b'
    ),
    
    # IPv6
    "ipv6": re.compile(
        r'\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b'
    ),
    
    # Email
    "email": re.compile(
        r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b'
    ),
    
    # URL (HTTP/HTTPS)
    "url": re.compile(
        r'https?://[^\s\'"<>]+',
        re.IGNORECASE
    ),
    
    # Дата в формате Apache: 15/Jan/2025:10:23:45 +0000
    "apache_date": re.compile(
        r'\d{2}/\w{3}/\d{4}:\d{2}:\d{2}:\d{2}\s[+-]\d{4}'
    ),
    
    # ISO 8601: 2025-01-15T10:23:45.000Z
    "iso_date": re.compile(
        r'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?'
    ),
    
    # HTTP статус-код
    "http_status": re.compile(r'\b[1-5]\d{2}\b'),
    
    # Версия программного обеспечения
    "version": re.compile(r'\b\d+\.\d+(?:\.\d+)?(?:\.\d+)?\b'),
    
    # Base64
    "base64": re.compile(r'[A-Za-z0-9+/]{20,}={0,2}'),
    
    # Хэши
    "md5":    re.compile(r'\b[0-9a-fA-F]{32}\b'),
    "sha1":   re.compile(r'\b[0-9a-fA-F]{40}\b'),
    "sha256": re.compile(r'\b[0-9a-fA-F]{64}\b'),
    
    # JWT токен
    "jwt": re.compile(
        r'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'
    ),
    
    # Приватный ключ
    "private_key": re.compile(
        r'-----BEGIN (?:RSA )?PRIVATE KEY-----'
    ),
    
    # SQL-инъекция паттерны в логах
    "sqli": re.compile(
        r'(?i)(?:union\s+select|or\s+1=1|drop\s+table|insert\s+into|'
        r'sleep\(\d+\)|benchmark\(|load_file|into\s+outfile|xp_cmdshell)'
    ),
    
    # XSS паттерны
    "xss": re.compile(
        r'(?i)(?:<script|javascript:|on(?:load|error|click|mouseover)=|'
        r'alert\(|document\.cookie|eval\()',
        re.IGNORECASE
    ),
    
    # LFI/Path traversal
    "lfi": re.compile(
        r'(?:\.\./|\.\.\%2[Ff]|%252[Ee]%252[Ee]|/etc/passwd|/proc/self/environ)'
    ),
    
    # CVE номер
    "cve": re.compile(r'\bCVE-\d{4}-\d{4,7}\b', re.IGNORECASE),
    
    # MAC-адрес
    "mac": re.compile(r'\b(?:[0-9A-Fa-f]{2}[:\-]){5}[0-9A-Fa-f]{2}\b'),
}


def extract_iocs(text):
    """Извлекает IoC (Indicators of Compromise) из текста."""
    iocs = {}
    for ioc_type, pattern in PATTERNS.items():
        matches = pattern.findall(text)
        if matches:
            # Дедупликация
            unique = list(dict.fromkeys(matches))
            iocs[ioc_type] = unique
    return iocs


# Пример использования
sample_log = """
2025-01-15 10:23:45 Attack from 192.168.1.100
SQL: ' UNION SELECT username, password FROM users--
XSS: <script>document.cookie</script>
Hash: 5f4dcc3b5aa765d61d8327deb882cf99
JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.TJVA95OrM
"""

iocs = extract_iocs(sample_log)
for ioc_type, values in iocs.items():
    print(f"{ioc_type}: {values}")
```

---

## 4.3.2 Модуль os: работа с файловой системой

```python
import os
import os.path
from pathlib import Path  # современная альтернатива

# ==================== Работа с путями ====================
log_dir = "/var/log"

# Проверки
print(os.path.exists(log_dir))          # True
print(os.path.isdir(log_dir))           # True
print(os.path.isfile("/var/log/syslog")) # True/False

# Операции с путями
path = os.path.join("/var/log", "nginx", "access.log")
print(os.path.dirname(path))   # /var/log/nginx
print(os.path.basename(path))  # access.log
print(os.path.splitext(path))  # ('/var/log/nginx/access', '.log')
print(os.path.abspath("./file.txt"))    # абсолютный путь

# Информация о файле
stat = os.stat("/var/log/syslog")
print(f"Size: {stat.st_size} bytes")
print(f"Modified: {stat.st_mtime}")

# ==================== Рекурсивный обход директорий ====================
def find_log_files(root_dir, extensions=(".log", ".txt")):
    """Ищет все лог-файлы в директории рекурсивно."""
    log_files = []
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Исключить скрытые директории
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        
        for filename in filenames:
            if any(filename.endswith(ext) for ext in extensions):
                full_path = os.path.join(dirpath, filename)
                size = os.path.getsize(full_path)
                log_files.append({
                    "path": full_path,
                    "name": filename,
                    "size": size,
                    "dir": dirpath
                })
    
    return sorted(log_files, key=lambda x: x["size"], reverse=True)


# Современный способ через pathlib
def find_logs_pathlib(root_dir, pattern="*.log"):
    """Использует pathlib для поиска файлов."""
    root = Path(root_dir)
    return list(root.rglob(pattern))


# ==================== Работа с переменными окружения ====================
# Важно для получения секретов из ENV
db_password = os.environ.get("DB_PASSWORD", "")
api_key = os.getenv("API_KEY")  # возвращает None если не задано
debug = os.getenv("DEBUG", "false").lower() == "true"

# Установка переменной окружения
os.environ["MY_VAR"] = "value"

# Все переменные окружения
for key, value in os.environ.items():
    if any(word in key.lower() for word in ["password", "secret", "token", "key"]):
        print(f"SENSITIVE: {key}={value[:5]}****")


# ==================== Запуск команд ====================
import subprocess

def run_command(cmd, timeout=30):
    """Безопасный запуск внешних команд."""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {"error": "Command timed out"}
    except Exception as e:
        return {"error": str(e)}

# Пример: запуск nmap
result = run_command("nmap -sV -p 22,80,443 192.168.1.1 --open")
print(result["stdout"])
```

---

## 4.3.3 Модуль json

```python
import json
from pathlib import Path

# ==================== Базовые операции ====================
# Строка JSON -> Python-объект
json_str = '{"ip": "192.168.1.1", "ports": [22, 80, 443], "alive": true}'
data = json.loads(json_str)
print(data["ip"])      # 192.168.1.1
print(data["ports"])   # [22, 80, 443]
print(data["alive"])   # True (bool, не строка)

# Python-объект -> строка JSON
scan_result = {
    "host": "192.168.1.1",
    "open_ports": [22, 80, 443],
    "os": "Linux Ubuntu 22.04",
    "scan_time": 1.23,
    "vulnerabilities": [
        {"cve": "CVE-2023-1234", "severity": "HIGH"},
    ]
}
json_output = json.dumps(scan_result, ensure_ascii=False, indent=2)
print(json_output)

# Запись в файл
with open("scan_results.json", "w", encoding="utf-8") as f:
    json.dump(scan_result, f, ensure_ascii=False, indent=2)

# Чтение из файла
with open("scan_results.json", "r", encoding="utf-8") as f:
    loaded = json.load(f)

# ==================== Сложные операции ====================
# NDJSON (Newline-Delimited JSON) — формат многих SIEM
def read_ndjson(filepath):
    """Читает файл формата NDJSON (один JSON-объект на строку)."""
    records = []
    with open(filepath, "r") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
                records.append(record)
            except json.JSONDecodeError as e:
                print(f"[-] Line {line_num}: JSON parse error: {e}")
    return records


# Работа с API-ответами
import requests

def fetch_threat_intel(ip):
    """Получает данные из VirusTotal API."""
    api_key = "YOUR_API_KEY"
    url = f"https://www.virustotal.com/api/v3/ip_addresses/{ip}"
    headers = {"x-apikey": api_key}
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        
        # Навигация по вложенному JSON
        stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
        malicious = stats.get("malicious", 0)
        harmless = stats.get("harmless", 0)
        
        return {
            "ip": ip,
            "malicious": malicious,
            "harmless": harmless,
            "reputation": data.get("data", {}).get("attributes", {}).get("reputation", 0)
        }
    return None


# JSONPath-подобные операции (без внешних библиотек)
def jget(data, path, default=None):
    """
    Безопасное получение значения по пути в словаре.
    jget(data, "a.b.c.d") эквивалентно data['a']['b']['c']['d']
    """
    keys = path.split(".")
    current = data
    for key in keys:
        if isinstance(current, dict):
            current = current.get(key, default)
        elif isinstance(current, list) and key.isdigit():
            idx = int(key)
            current = current[idx] if idx < len(current) else default
        else:
            return default
    return current


# Пример:
nested = {"event": {"source": {"ip": "1.2.3.4", "port": 1234}}}
print(jget(nested, "event.source.ip"))   # 1.2.3.4
print(jget(nested, "event.dest.ip", "N/A"))  # N/A
```

---

## 4.3.4 Модуль csv

```python
import csv
from pathlib import Path

# ==================== Чтение CSV ====================
# Простой reader
with open("access_log.csv", "r", newline="", encoding="utf-8") as f:
    reader = csv.reader(f)
    header = next(reader)  # первая строка — заголовок
    for row in reader:
        print(row)  # list строк

# DictReader — удобнее для работы с данными
with open("access_log.csv", "r", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        # row — это OrderedDict с ключами из заголовка
        print(f"{row['ip']} - {row['status']} - {row['path']}")

# ==================== Запись CSV ====================
results = [
    {"ip": "192.168.1.1", "status": "open", "ports": "22,80,443"},
    {"ip": "192.168.1.2", "status": "filtered", "ports": ""},
]

with open("scan_results.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["ip", "status", "ports"])
    writer.writeheader()
    writer.writerows(results)

# ==================== Пример: парсинг SIEM-экспорта ====================
def parse_siem_csv(filepath):
    """Парсит CSV-выгрузку из SIEM."""
    events = []
    
    with open(filepath, "r", newline="", encoding="utf-8-sig") as f:
        # utf-8-sig — для файлов с BOM (Excel)
        reader = csv.DictReader(f)
        
        for row in reader:
            # Нормализация полей
            event = {
                "timestamp": row.get("Timestamp", row.get("Time", "")),
                "source_ip": row.get("Source IP", row.get("src_ip", "")),
                "dest_ip": row.get("Destination IP", row.get("dst_ip", "")),
                "event_type": row.get("Event Type", row.get("type", "")),
                "severity": row.get("Severity", "UNKNOWN").upper(),
                "description": row.get("Description", row.get("message", "")),
            }
            events.append(event)
    
    print(f"[*] Загружено событий: {len(events)}")
    return events
```

---

## 4.3.5 collections: Counter, defaultdict

```python
from collections import Counter, defaultdict
from datetime import datetime

# ==================== Counter ====================
# Идеально для подсчёта IP, статус-кодов, URL

ip_list = ["1.1.1.1", "2.2.2.2", "1.1.1.1", "1.1.1.1", "3.3.3.3", "2.2.2.2"]
ip_counter = Counter(ip_list)

print(ip_counter)
# Counter({'1.1.1.1': 3, '2.2.2.2': 2, '3.3.3.3': 1})

# Топ-10 IP
top_ips = ip_counter.most_common(10)
for ip, count in top_ips:
    print(f"  {count:>6}  {ip}")

# Обновление
ip_counter.update(["1.1.1.1", "4.4.4.4"])
ip_counter["5.5.5.5"] += 100  # прямое обновление

# Арифметика
counter_a = Counter({"a": 5, "b": 3})
counter_b = Counter({"a": 2, "b": 1, "c": 4})
print(counter_a + counter_b)  # Counter({'c': 4, 'a': 7, 'b': 4})
print(counter_a - counter_b)  # Counter({'a': 3, 'b': 2})


# ==================== defaultdict ====================
# Словарь с дефолтным значением для отсутствующих ключей

# Группировка IP по статус-кодам
from collections import defaultdict

# defaultdict(list) — при отсутствии ключа создаёт пустой список
ip_by_status = defaultdict(list)
ip_by_status[404].append("192.168.1.1")
ip_by_status[404].append("192.168.1.2")
ip_by_status[200].append("10.0.0.1")
# Нет KeyError!

# defaultdict(int) — счётчик
hourly_count = defaultdict(int)
hourly_count["10:00"] += 1
hourly_count["10:00"] += 1  # нет KeyError
hourly_count["11:00"] += 1

# defaultdict(set) — уникальные значения
users_by_ip = defaultdict(set)
users_by_ip["192.168.1.1"].add("admin")
users_by_ip["192.168.1.1"].add("root")  # дубль — не добавится повторно
users_by_ip["192.168.1.2"].add("www-data")

# Вложенный defaultdict
attack_stats = defaultdict(lambda: defaultdict(int))
attack_stats["192.168.1.1"]["brute_force"] += 5
attack_stats["192.168.1.1"]["sql_injection"] += 2
attack_stats["192.168.1.2"]["xss"] += 1
```

---

## 4.3.6 datetime: работа с временными метками логов

```python
from datetime import datetime, timedelta, timezone
import re

# ==================== Парсинг форматов времени ====================

def parse_apache_datetime(dt_str):
    """Парсит datetime формата Apache: 15/Jan/2025:10:23:45 +0000"""
    return datetime.strptime(dt_str, "%d/%b/%Y:%H:%M:%S %z")

def parse_syslog_datetime(dt_str, year=None):
    """Парсит datetime формата syslog: Jan 15 10:23:45"""
    year = year or datetime.now().year
    dt = datetime.strptime(f"{dt_str} {year}", "%b %d %H:%M:%S %Y")
    return dt

def parse_iso_datetime(dt_str):
    """Парсит ISO 8601: 2025-01-15T10:23:45.123Z"""
    dt_str = dt_str.rstrip("Z")
    for fmt in ["%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"]:
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    return None


# ==================== Анализ временных окон ====================

def is_within_window(dt, start_minutes_ago=60):
    """Проверяет, попадает ли время в последние N минут."""
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    cutoff = now - timedelta(minutes=start_minutes_ago)
    return dt >= cutoff


def detect_time_anomaly(timestamps, window_seconds=10, threshold=10):
    """
    Обнаруживает аномальную активность: N+ событий за window_seconds секунд.
    Возвращает список (время_начала, количество).
    """
    if not timestamps:
        return []
    
    sorted_ts = sorted(timestamps)
    anomalies = []
    
    for i, ts in enumerate(sorted_ts):
        window_end = ts + timedelta(seconds=window_seconds)
        count = sum(1 for t in sorted_ts[i:] if t <= window_end)
        
        if count >= threshold:
            anomalies.append({
                "start": ts.isoformat(),
                "count": count,
                "rate": f"{count}/{window_seconds}s"
            })
    
    return anomalies


# ==================== Группировка по времени ====================
from collections import defaultdict

def group_by_hour(events):
    """Группирует события по часам для построения timeline."""
    by_hour = defaultdict(int)
    for event in events:
        if "timestamp" in event:
            try:
                dt = parse_iso_datetime(event["timestamp"])
                if dt:
                    hour_key = dt.strftime("%Y-%m-%d %H:00")
                    by_hour[hour_key] += 1
            except Exception:
                pass
    return dict(sorted(by_hour.items()))
```

---

## 4.3.7 Полный парсер access.log

```python
#!/usr/bin/env python3
"""
access_log_analyzer.py — Анализатор веб-сервера access.log
Обнаруживает: брутфорс, сканирование, SQLi, XSS, LFI, боты
"""

import re
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime, timedelta
from collections import Counter, defaultdict


# ==================== Паттерны ====================

ACCESS_LOG_PATTERN = re.compile(
    r'(?P<ip>\S+)\s+'
    r'(?P<ident>\S+)\s+'
    r'(?P<user>\S+)\s+'
    r'\[(?P<datetime>[^\]]+)\]\s+'
    r'"(?P<method>\w+)\s+(?P<path>[^\s"]+)\s*(?P<protocol>[^"]*?)"\s+'
    r'(?P<status>\d{3})\s+'
    r'(?P<size>\d+|-)'
    r'(?:\s+"(?P<referer>[^"]*)")?'
    r'(?:\s+"(?P<useragent>[^"]*)")?'
)

ATTACK_PATTERNS = {
    "sql_injection": re.compile(
        r'(?i)(?:union\s+(?:all\s+)?select|or\s+\d+=\d+|and\s+\d+=\d+|'
        r"'(?:\s+or|\s+and|--|\s*#|\s*;)|drop\s+table|"
        r'insert\s+into|update\s+\w+\s+set|delete\s+from|'
        r'exec(?:ute)?\s*\(|xp_cmdshell|load_file\s*\(|'
        r'sleep\s*\(\d|benchmark\s*\()'
    ),
    "xss": re.compile(
        r'(?i)(?:<script[^>]*>|javascript\s*:|on(?:load|error|click|mouse\w+|key\w+|focus|blur)\s*=|'
        r'<(?:img|svg|iframe|object|embed|link)[^>]+(?:src|href)\s*=|'
        r'(?:document|window)\s*\.|eval\s*\(|alert\s*\(|'
        r'String\.fromCharCode|&#\d+;)'
    ),
    "lfi": re.compile(
        r'(?:\.{2}[/\\]|%2[Ee]%2[Ee]%2[Ff]|%252[Ee]|'
        r'/etc/(?:passwd|shadow|hosts|crontab)|'
        r'/proc/(?:self|version|cmdline)|'
        r'(?:php://|data://|expect://|zip://|phar://))'
    ),
    "rfi": re.compile(
        r'(?i)(?:(?:https?|ftp)://[^\s/]+/[^\s]*\.php|'
        r'(?:https?|ftp)://(?:\d{1,3}\.){3}\d{1,3}/)'
    ),
    "cmd_injection": re.compile(
        r'(?:[;&|]\s*(?:ls|cat|id|whoami|uname|pwd|wget|curl|nc|bash|sh|python)\b|'
        r'\$\(.*\)|\`[^`]+\`|%0[aA](?:ls|cat|id)|cmd=|exec=|system=|passthru=)'
    ),
    "scanner": re.compile(
        r'(?i)(?:nikto|nessus|openvas|masscan|zap|w3af|nmap|acunetix|'
        r'sqlmap|dirb|dirbuster|gobuster|wfuzz|nuclei|metasploit|'
        r'qualys|burpsuite|havij)'
    ),
    "path_traversal": re.compile(
        r'(?:\.\./|\.\.\\|%2[Ee]%2[Ee]%2[Ff]|%2[Ee]%2[Ee]%5[Cc]|'
        r'(?:%252[Ee]){2}%252[Ff])'
    ),
    "webshell": re.compile(
        r'(?i)(?:c99|r57|webshell|shell\.php|cmd\.php|eval\.php|'
        r'pass(?:wd)?\.php|hack\.php|bypass|backdoor)'
    ),
}

# Известные вредоносные User-Agent
MALICIOUS_UA_PATTERNS = re.compile(
    r'(?i)(?:nikto|sqlmap|nessus|openvas|masscan|wpscan|'
    r'joomla|drupal|wordpress.*scanner|acunetix|w3af|'
    r'dirbuster|gobuster|dirb|hydra|burp\s*suite|'
    r'python-requests/[01]\.|zgrab|shodan)',
    re.IGNORECASE
)


def parse_apache_date(dt_str):
    """Парсит дату Apache."""
    try:
        return datetime.strptime(dt_str, "%d/%b/%Y:%H:%M:%S %z")
    except ValueError:
        return None


def analyze_access_log(filepath, tail=None, verbose=False):
    """
    Основной анализатор access.log.
    
    Args:
        filepath: путь к лог-файлу
        tail: анализировать только последние N строк (None = все)
        verbose: подробный вывод
    """
    filepath = Path(filepath)
    if not filepath.exists():
        print(f"[-] File not found: {filepath}")
        return None
    
    print(f"\n{'='*65}")
    print(f"  Access Log Analyzer")
    print(f"  File: {filepath}")
    print(f"  Size: {filepath.stat().st_size:,} bytes")
    print(f"{'='*65}")
    
    # ==================== Чтение файла ====================
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
    
    if tail:
        lines = lines[-tail:]
    
    print(f"[*] Строк для анализа: {len(lines):,}")
    
    # ==================== Парсинг ====================
    parsed_lines = []
    parse_errors = 0
    
    for line_num, line in enumerate(lines, 1):
        line = line.strip()
        if not line:
            continue
        
        match = ACCESS_LOG_PATTERN.match(line)
        if match:
            data = match.groupdict()
            data["datetime_obj"] = parse_apache_date(data["datetime"])
            data["line_num"] = line_num
            data["status_int"] = int(data["status"])
            data["size_int"] = int(data["size"]) if data["size"] != "-" else 0
            parsed_lines.append(data)
        else:
            parse_errors += 1
    
    print(f"[*] Успешно распарсено: {len(parsed_lines):,} ({parse_errors} ошибок)")
    
    if not parsed_lines:
        print("[-] Нет данных для анализа")
        return None
    
    # ==================== Базовая статистика ====================
    ip_counter = Counter(r["ip"] for r in parsed_lines)
    status_counter = Counter(r["status"] for r in parsed_lines)
    method_counter = Counter(r["method"] for r in parsed_lines)
    path_counter = Counter(r["path"] for r in parsed_lines)
    ua_counter = Counter(r.get("useragent", "-") for r in parsed_lines if r.get("useragent"))
    
    # ==================== Временной анализ ====================
    dt_objects = [r["datetime_obj"] for r in parsed_lines if r["datetime_obj"]]
    if dt_objects:
        earliest = min(dt_objects)
        latest = max(dt_objects)
        duration = latest - earliest
    else:
        earliest = latest = duration = None
    
    # ==================== Обнаружение атак ====================
    
    # Брутфорс: много 401/403 с одного IP
    error_ips = Counter(
        r["ip"] for r in parsed_lines if r["status_int"] in [401, 403]
    )
    
    # Сканирование: много 404 с одного IP
    scan_ips = Counter(
        r["ip"] for r in parsed_lines if r["status_int"] == 404
    )
    
    # Атаки по паттернам
    attack_findings = defaultdict(list)
    for record in parsed_lines:
        path = record["path"]
        ua = record.get("useragent", "") or ""
        
        for attack_type, pattern in ATTACK_PATTERNS.items():
            if pattern.search(path) or (attack_type == "scanner" and pattern.search(ua)):
                attack_findings[attack_type].append({
                    "ip": record["ip"],
                    "path": path[:100],
                    "status": record["status"],
                    "datetime": record["datetime"],
                    "ua": ua[:80]
                })
    
    # Вредоносные User-Agent
    malicious_ua_requests = [
        r for r in parsed_lines
        if r.get("useragent") and MALICIOUS_UA_PATTERNS.search(r.get("useragent", ""))
    ]
    
    # Частота запросов (rate limiting)
    # Группируем запросы по IP и ищем аномально высокую частоту
    requests_by_ip = defaultdict(list)
    for r in parsed_lines:
        if r["datetime_obj"]:
            requests_by_ip[r["ip"]].append(r["datetime_obj"])
    
    rate_anomalies = {}
    for ip, timestamps in requests_by_ip.items():
        if len(timestamps) < 20:
            continue
        sorted_ts = sorted(timestamps)
        # Проверяем 10-секундные окна
        for i, ts in enumerate(sorted_ts):
            window_end = ts + timedelta(seconds=10)
            count_in_window = sum(1 for t in sorted_ts[i:] if t <= window_end)
            if count_in_window >= 50:  # 50+ запросов за 10 секунд
                rate_anomalies[ip] = {
                    "max_rate": count_in_window,
                    "at": ts.isoformat(),
                    "total": len(timestamps)
                }
                break
    
    # ==================== Вывод результатов ====================
    
    print(f"\n{'─'*65}")
    print(f"  📊 ОСНОВНАЯ СТАТИСТИКА")
    print(f"{'─'*65}")
    
    if duration:
        print(f"  Период:        {earliest.strftime('%Y-%m-%d %H:%M')} — {latest.strftime('%Y-%m-%d %H:%M')}")
        print(f"  Длительность:  {str(duration).split('.')[0]}")
    
    print(f"  Запросов:      {len(parsed_lines):,}")
    
    print(f"\n  Топ-10 IP-адресов:")
    for ip, count in ip_counter.most_common(10):
        bar = "█" * min(count * 30 // (ip_counter.most_common(1)[0][1] or 1), 30)
        flag = " ⚠️ " if count > 1000 else "   "
        print(f"  {flag}{count:>8}  {ip:<20} {bar}")
    
    print(f"\n  Статус-коды:")
    for status, count in sorted(status_counter.items()):
        emoji = {"2": "✅", "3": "🔄", "4": "⚠️ ", "5": "❌"}.get(status[0], "  ")
        print(f"  {emoji} {status}: {count:,}")
    
    print(f"\n  HTTP методы:")
    for method, count in method_counter.most_common():
        print(f"    {method:<10} {count:,}")
    
    print(f"\n  Топ-10 запрашиваемых URL:")
    for path, count in path_counter.most_common(10):
        print(f"    {count:>6}  {path[:60]}")
    
    # ==================== Безопасность ====================
    
    print(f"\n{'─'*65}")
    print(f"  🚨 ОБНАРУЖЕННЫЕ УГРОЗЫ")
    print(f"{'─'*65}")
    
    # Брутфорс
    brute_candidates = [(ip, cnt) for ip, cnt in error_ips.most_common(10) if cnt >= 10]
    if brute_candidates:
        print(f"\n  🔴 БРУТФОРС (401/403 ответы):")
        for ip, count in brute_candidates:
            print(f"     {count:>6} неудачных попыток от {ip}")
    
    # Сканирование
    scan_candidates = [(ip, cnt) for ip, cnt in scan_ips.most_common(10) if cnt >= 20]
    if scan_candidates:
        print(f"\n  🟠 СКАНИРОВАНИЕ (много 404 от одного IP):")
        for ip, count in scan_candidates:
            print(f"     {count:>6} запросов к несуществующим ресурсам от {ip}")
    
    # Атаки
    for attack_type, findings in attack_findings.items():
        if findings:
            unique_ips = len(set(f["ip"] for f in findings))
            print(f"\n  ⚠️  {attack_type.upper().replace('_', ' ')} — {len(findings)} запросов от {unique_ips} IP:")
            for f in findings[:3]:  # показываем первые 3
                print(f"     [{f['status']}] {f['ip']} -> {f['path'][:60]}")
            if len(findings) > 3:
                print(f"     ... и ещё {len(findings) - 3}")
    
    # Вредоносные User-Agent
    if malicious_ua_requests:
        mal_ua_counter = Counter(r.get("useragent", "")[:50] for r in malicious_ua_requests)
        print(f"\n  🔴 ВРЕДОНОСНЫЕ USER-AGENT ({len(malicious_ua_requests)} запросов):")
        for ua, count in mal_ua_counter.most_common(5):
            print(f"     {count:>5}x  {ua}")
    
    # Rate anomalies
    if rate_anomalies:
        print(f"\n  🔴 АНОМАЛЬНАЯ ЧАСТОТА ЗАПРОСОВ (DDoS/flood):")
        for ip, info in sorted(rate_anomalies.items(),
                               key=lambda x: x[1]["max_rate"], reverse=True)[:5]:
            print(f"     {ip}: {info['max_rate']} запросов/10сек (всего: {info['total']})")
    
    # ==================== JSON-отчёт ====================
    report = {
        "file": str(filepath.absolute()),
        "analysis_date": datetime.now().isoformat(),
        "total_requests": len(parsed_lines),
        "period": {
            "start": earliest.isoformat() if earliest else None,
            "end": latest.isoformat() if latest else None,
        },
        "stats": {
            "top_ips": dict(ip_counter.most_common(20)),
            "status_codes": dict(status_counter),
            "http_methods": dict(method_counter),
            "top_paths": dict(path_counter.most_common(20)),
        },
        "threats": {
            "bruteforce_candidates": dict(brute_candidates),
            "scanner_candidates": dict(scan_candidates),
            "attack_patterns": {k: len(v) for k, v in attack_findings.items()},
            "malicious_ua_count": len(malicious_ua_requests),
            "rate_anomalies": rate_anomalies,
        }
    }
    
    report_file = filepath.parent / f"{filepath.stem}_analysis.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2, default=str)
    
    print(f"\n[*] Отчёт: {report_file}")
    print(f"{'='*65}")
    
    return report
```

---

## 4.3.8 Парсер auth.log: детекция брутфорса

```python
#!/usr/bin/env python3
"""
auth_log_analyzer.py — Детектор брутфорса SSH/sudo из auth.log
"""

import re
import sys
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict, Counter

# Паттерны для auth.log
PATTERNS = {
    "ssh_failed": re.compile(
        r'(?P<month>\w{3})\s+(?P<day>\d+)\s+(?P<time>\d+:\d+:\d+)\s+(?P<host>\S+)\s+sshd\[(?P<pid>\d+)\]:\s+'
        r'Failed password for (?:invalid user )?(?P<user>\S+) from (?P<ip>\S+) port (?P<port>\d+)'
    ),
    "ssh_success": re.compile(
        r'(?P<month>\w{3})\s+(?P<day>\d+)\s+(?P<time>\d+:\d+:\d+)\s+\S+\s+sshd\[\d+\]:\s+'
        r'Accepted (?:password|publickey) for (?P<user>\S+) from (?P<ip>\S+) port (?P<port>\d+)'
    ),
    "ssh_invalid_user": re.compile(
        r'sshd\[\d+\]:\s+Invalid user (?P<user>\S+) from (?P<ip>\S+) port (?P<port>\d+)'
    ),
    "sudo_auth": re.compile(
        r'sudo:\s+(?P<user>\S+)\s+:.*COMMAND=(?P<command>.+)'
    ),
    "sudo_fail": re.compile(
        r'sudo:\s+(?P<user>\S+)\s+:.*authentication failure'
    ),
    "su_fail": re.compile(
        r'su\[:\s+(?:FAILED su|pam_unix.*authentication failure).*user=(?P<user>\S+)'
    ),
    "pam_failure": re.compile(
        r'pam_unix\(\w+:\w+\):\s+authentication failure;.*user=(?P<user>\S+)'
    ),
    "disconnect": re.compile(
        r'sshd\[\d+\]:\s+Disconnected from (?:invalid user )?(?:\S+\s+)?(?P<ip>\S+) port (?P<port>\d+)'
    ),
}


def parse_syslog_time(month, day, time_str, year=None):
    """Парсит syslog timestamp."""
    year = year or datetime.now().year
    try:
        dt = datetime.strptime(f"{month} {day} {time_str} {year}", "%b %d %H:%M:%S %Y")
        # Если месяц в прошлом — это прошлый год (для декабрь/январь)
        if dt > datetime.now() + timedelta(days=1):
            dt = dt.replace(year=year - 1)
        return dt
    except ValueError:
        return None


def analyze_auth_log(filepath, threshold=5, window_minutes=10, year=None):
    """
    Анализирует /var/log/auth.log на предмет брутфорс-атак.
    
    Args:
        filepath: путь к auth.log
        threshold: порог подозрительной активности (попыток)
        window_minutes: временное окно для анализа (минут)
        year: год для парсинга timestamp (None = текущий)
    """
    filepath = Path(filepath)
    if not filepath.exists():
        print(f"[-] File not found: {filepath}")
        return None
    
    print(f"\n{'='*65}")
    print(f"  Auth Log Brute-Force Detector")
    print(f"  File:      {filepath}")
    print(f"  Threshold: {threshold} attempts in {window_minutes} minutes")
    print(f"{'='*65}")
    
    # Структуры для хранения событий
    failed_logins = defaultdict(list)      # ip -> [(datetime, username)]
    successful_logins = defaultdict(list)  # ip -> [(datetime, username)]
    invalid_users = defaultdict(Counter)   # ip -> Counter(usernames)
    all_events = []
    
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            
            # SSH failed
            m = PATTERNS["ssh_failed"].search(line)
            if m:
                dt = parse_syslog_time(m.group("month"), m.group("day"),
                                       m.group("time"), year)
                ip = m.group("ip")
                user = m.group("user")
                failed_logins[ip].append((dt, user))
                all_events.append({
                    "type": "ssh_failed",
                    "datetime": dt,
                    "ip": ip,
                    "user": user,
                    "line": line_num
                })
                continue
            
            # SSH success
            m = PATTERNS["ssh_success"].search(line)
            if m:
                dt = parse_syslog_time(m.group("month"), m.group("day"),
                                       m.group("time"), year)
                ip = m.group("ip")
                user = m.group("user")
                successful_logins[ip].append((dt, user))
                all_events.append({
                    "type": "ssh_success",
                    "datetime": dt,
                    "ip": ip,
                    "user": user,
                    "line": line_num
                })
                continue
            
            # Invalid user
            m = PATTERNS["ssh_invalid_user"].search(line)
            if m:
                ip = m.group("ip")
                user = m.group("user")
                invalid_users[ip][user] += 1
    
    total_failed = sum(len(v) for v in failed_logins.values())
    total_success = sum(len(v) for v in successful_logins.values())
    
    print(f"\n[*] Всего неудачных входов:  {total_failed:,}")
    print(f"[*] Всего успешных входов:   {total_success:,}")
    print(f"[*] Уникальных IP (failed):  {len(failed_logins)}")
    
    # ==================== Топ атакующих ====================
    ip_failed_count = {ip: len(events) for ip, events in failed_logins.items()}
    top_attackers = sorted(ip_failed_count.items(), key=lambda x: x[1], reverse=True)
    
    print(f"\n{'─'*65}")
    print(f"  🔴 ТОП АТАКУЮЩИХ IP")
    print(f"{'─'*65}")
    print(f"  {'IP':<20} {'Попыток':>8} {'Юзеров':>8} {'Статус'}")
    print(f"  {'─'*50}")
    
    for ip, count in top_attackers[:20]:
        if count < threshold:
            break
        
        # Уникальные usernames, которые пробовали
        usernames = Counter(user for _, user in failed_logins[ip])
        unique_users = len(usernames)
        
        # Был ли успешный вход после атаки?
        success_after = any(
            success_dt > min(dt for dt, _ in failed_logins[ip])
            for success_dt, _ in successful_logins.get(ip, [])
        )
        
        status = "🚨 УСПЕХ ПОСЛЕ БРУТФОРСА" if success_after else ""
        
        print(f"  {ip:<20} {count:>8} {unique_users:>8}  {status}")
        
        # Показываем попытки имён
        if len(usernames) <= 5:
            users_str = ", ".join(f"{u}({c})" for u, c in usernames.most_common())
        else:
            top5 = ", ".join(f"{u}({c})" for u, c in usernames.most_common(5))
            users_str = f"{top5} ... ({len(usernames)} total)"
        print(f"  {'':20}  Логины: {users_str}")
    
    # ==================== Временной анализ (burst detection) ====================
    print(f"\n{'─'*65}")
    print(f"  ⚡ АНОМАЛЬНАЯ ИНТЕНСИВНОСТЬ (бёрсты)")
    print(f"{'─'*65}")
    
    bursts_found = False
    for ip, events in failed_logins.items():
        if len(events) < threshold:
            continue
        
        sorted_events = sorted(events, key=lambda x: x[0] or datetime.min)
        
        for i, (ts, user) in enumerate(sorted_events):
            if ts is None:
                continue
            window_end = ts + timedelta(minutes=window_minutes)
            events_in_window = [
                e for e in sorted_events[i:]
                if e[0] and ts <= e[0] <= window_end
            ]
            
            if len(events_in_window) >= threshold:
                users_in_window = Counter(e[1] for e in events_in_window)
                print(f"\n  IP: {ip}")
                print(f"  {len(events_in_window)} попыток за {window_minutes} минут, начиная с {ts.strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"  Перебираемые логины: {dict(users_in_window.most_common(5))}")
                bursts_found = True
                break  # один бёрст на IP в отчёте
    
    if not bursts_found:
        print(f"  Аномальных бёрстов не обнаружено")
    
    # ==================== Успешные входы после брутфорса ====================
    print(f"\n{'─'*65}")
    print(f"  🚨 УСПЕШНЫЕ ВХОДЫ ПОСЛЕ БРУТФОРСА")
    print(f"{'─'*65}")
    
    compromised_found = False
    for ip, success_events in successful_logins.items():
        failed_count = ip_failed_count.get(ip, 0)
        if failed_count >= threshold:
            compromised_found = True
            print(f"\n  ⚠️  IP: {ip} ({failed_count} неудачных попыток)")
            for dt, user in success_events:
                dt_str = dt.strftime('%Y-%m-%d %H:%M:%S') if dt else "unknown"
                print(f"     ✅ Успешный вход: {user} в {dt_str}")
    
    if not compromised_found:
        print(f"  Компрометации не обнаружено")
    
    # ==================== Перебор имён пользователей ====================
    print(f"\n{'─'*65}")
    print(f"  📋 ПЕРЕБОР ИМЁН ПОЛЬЗОВАТЕЛЕЙ")
    print(f"{'─'*65}")
    
    if invalid_users:
        top_invalid_ips = sorted(
            invalid_users.items(),
            key=lambda x: sum(x[1].values()),
            reverse=True
        )[:5]
        
        for ip, user_counter in top_invalid_ips:
            total = sum(user_counter.values())
            print(f"\n  {ip}: {total} попыток с несуществующими пользователями")
            for user, count in user_counter.most_common(5):
                print(f"    {count:>5}x  {user}")
    
    print(f"\n{'='*65}")
    
    return {
        "total_failed": total_failed,
        "total_success": total_success,
        "unique_attacker_ips": len(failed_logins),
        "top_attackers": top_attackers[:10],
    }


# ==================== argparse CLI ====================
def main():
    parser = argparse.ArgumentParser(
        description="Анализатор auth.log для обнаружения брутфорс-атак",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры:
  python3 auth_log_analyzer.py /var/log/auth.log
  python3 auth_log_analyzer.py /var/log/auth.log -t 10 -w 5
  python3 auth_log_analyzer.py auth.log --year 2024
        """
    )
    parser.add_argument("file", help="Путь к auth.log")
    parser.add_argument("-t", "--threshold", type=int, default=5,
                        help="Порог подозрительных попыток (default: 5)")
    parser.add_argument("-w", "--window", type=int, default=10,
                        help="Временное окно в минутах (default: 10)")
    parser.add_argument("--year", type=int, default=None,
                        help="Год для парсинга (default: текущий)")
    
    args = parser.parse_args()
    analyze_auth_log(args.file, args.threshold, args.window, args.year)


import argparse
if __name__ == "__main__":
    main()
```

---

## 4.3.9 Пример запуска анализатора

```bash
# Генерация тестового auth.log для учебных целей
cat > test_auth.log << 'EOF'
Jan 15 10:00:01 server sshd[1234]: Failed password for invalid user admin from 192.168.1.100 port 54321 ssh2
Jan 15 10:00:02 server sshd[1235]: Failed password for invalid user root from 192.168.1.100 port 54322 ssh2
Jan 15 10:00:03 server sshd[1236]: Failed password for invalid user administrator from 192.168.1.100 port 54323 ssh2
Jan 15 10:00:04 server sshd[1237]: Failed password for invalid user ubuntu from 192.168.1.100 port 54324 ssh2
Jan 15 10:00:05 server sshd[1238]: Failed password for invalid user user from 192.168.1.100 port 54325 ssh2
Jan 15 10:00:06 server sshd[1239]: Failed password for invalid user test from 192.168.1.100 port 54326 ssh2
Jan 15 10:00:07 server sshd[1240]: Accepted password for ubuntu from 192.168.1.100 port 54327 ssh2
Jan 15 10:05:01 server sshd[1241]: Failed password for root from 10.0.0.1 port 22345 ssh2
Jan 15 10:05:02 server sshd[1242]: Failed password for root from 10.0.0.1 port 22346 ssh2
EOF

# Запуск анализатора
python3 auth_log_analyzer.py test_auth.log -t 3 -w 5

# Запуск анализатора access.log
python3 access_log_analyzer.py /var/log/nginx/access.log

# Пайп через анализатор последних 10000 строк
tail -10000 /var/log/apache2/access.log | python3 -c "
import sys
sys.stdin.reconfigure(encoding='utf-8')
lines = sys.stdin.readlines()
# анализ...
print(f'Lines: {len(lines)}')
"
```

---

## 📝 Упражнения

### Упражнение 1: Regex мастерство

Напиши регулярные выражения для:
1. Парсинга строк Nginx error.log: `2025/01/15 10:23:45 [error] 1234#0: *5 ...`
2. Извлечения SSRF-паттернов: попытки обращения к внутренним IP (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
3. Поиска JWT токенов в логах API
4. Обнаружения попыток Log4Shell: `${jndi:ldap://`

### Упражнение 2: Расширение анализатора

Добавь в `access_log_analyzer.py`:
- Геолокацию IP-адресов (используй `geoip2` или бесплатный API)
- Построение timeline атак по часам (ASCII-график)
- Экспорт заблокированных IP для iptables

### Упражнение 3: SIEM-выгрузка

Напиши парсер для CSV-выгрузки из Splunk со столбцами:
`_time,src_ip,dest_ip,action,event_type,user,bytes_in,bytes_out`
- Сгруппируй по event_type
- Найди аномальные bytes_out (> 1GB) — потенциальная утечка данных
- Постройте матрицу: user -> actions -> count

### Упражнение 4 (CTF): Log Analysis Challenge

Дан access.log с флагом CTF, скрытым в URL среди тысяч запросов:
```python
import re
import base64

# Ищем URL с нестандартными параметрами
with open("challenge.log") as f:
    for line in f:
        # Ищем base64 в query string
        m = re.search(r'\?(?:\w+=([A-Za-z0-9+/=]{20,}))', line)
        if m:
            try:
                decoded = base64.b64decode(m.group(1)).decode()
                if "CTF{" in decoded or "flag{" in decoded:
                    print(f"FLAG FOUND: {decoded}")
                    print(f"Request: {line[:100]}")
            except:
                pass
```

### Упражнение 5: Интеграция с VirusTotal

Напиши скрипт, который:
1. Парсит `access.log` и собирает уникальные IP-адреса
2. Для каждого IP делает запрос к VirusTotal API
3. Выводит IP с рейтингом malicious > 0
4. Сохраняет результаты в CSV

---

> **Итог главы:** Ты освоил арсенал парсинга: регулярные выражения для извлечения IoC, `os` для работы с файловой системой, `json` и `csv` для обмена данными, `collections` для агрегации. Написаны два полноценных анализатора логов. В финальной главе этой части соберём 5 готовых инструментов безопасника.

