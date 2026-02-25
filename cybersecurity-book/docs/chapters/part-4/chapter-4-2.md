# Глава 4.2: Работа с сетью: requests, socket

## 🎯 Цели главы

- Освоить библиотеку `requests` для HTTP-запросов любой сложности
- Научиться работать с модулем `socket` на низком уровне
- Написать рабочий многопоточный сканер портов
- Реализовать чеккер HTTP-заголовков безопасности
- Понять разницу между высокоуровневыми и низкоуровневыми сетевыми инструментами

---

## 4.2.1 Модуль requests: HTTP-клиент для безопасника

`requests` — самая популярная Python-библиотека для HTTP-запросов. Установка:

```bash
pip install requests
```

### Базовые запросы

```python
import requests

# GET-запрос
response = requests.get("https://example.com")

# Ключевые атрибуты ответа
print(response.status_code)      # 200
print(response.headers)          # словарь заголовков
print(response.text)             # тело ответа как строка
print(response.content)          # тело ответа как bytes
print(response.url)              # финальный URL (после редиректов)
print(response.elapsed)          # время ответа
print(response.encoding)         # кодировка ответа

# JSON-ответ
data = response.json()           # парсит JSON в dict/list

# POST-запрос с form данными
response = requests.post(
    "https://example.com/login",
    data={"username": "admin", "password": "password123"}
)

# POST с JSON (API-запросы)
response = requests.post(
    "https://api.example.com/v1/scan",
    json={"target": "192.168.1.1", "ports": [80, 443]},
    headers={"Authorization": "Bearer token123"}
)

# Другие HTTP-методы
response = requests.put("https://api.example.com/resource/1", json={"key": "value"})
response = requests.delete("https://api.example.com/resource/1")
response = requests.patch("https://api.example.com/resource/1", json={"field": "val"})
response = requests.head("https://example.com")  # только заголовки
response = requests.options("https://example.com")  # разрешённые методы
```

### Параметры запроса

```python
# GET-параметры (?q=python&page=1)
params = {
    "q": "site:example.com admin",
    "page": 1,
    "limit": 100
}
response = requests.get("https://api.example.com/search", params=params)
print(response.url)  # https://api.example.com/search?q=site%3Aexample.com+admin&page=1&limit=100

# Пользовательские заголовки (имитация браузера)
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
    "X-Forwarded-For": "127.0.0.1",  # попытка обойти IP-ограничения
}
response = requests.get("https://example.com", headers=headers)

# Работа с cookies
cookies = {
    "session": "abc123def456",
    "auth_token": "eyJhbGciOiJIUzI1NiJ9...",
    "admin": "1"  # попытка privilege escalation через cookie
}
response = requests.get("https://example.com/admin", cookies=cookies)

# Отправка cookies из jar (сохранённые куки)
jar = requests.cookies.RequestsCookieJar()
jar.set("session", "abc123", domain="example.com", path="/")
response = requests.get("https://example.com", cookies=jar)
```

### Сессии — работа с состоянием (важно для авторизации)

```python
# Session сохраняет cookies, headers между запросами
# Аналог: login -> получить session cookie -> использовать в следующих запросах

session = requests.Session()

# Устанавливаем базовые заголовки для всех запросов сессии
session.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; SecurityScanner/1.0)",
    "Accept": "application/json",
})

# Логин
login_response = session.post(
    "https://example.com/login",
    data={"username": "admin", "password": "password123"},
    allow_redirects=True
)

print(f"Login status: {login_response.status_code}")
print(f"Cookies after login: {dict(session.cookies)}")

# Теперь сессия автоматически отправляет cookies
admin_panel = session.get("https://example.com/admin")
print(f"Admin panel status: {admin_panel.status_code}")

# Пример: сканирование за аутентификацией
def authenticated_scan(base_url, username, password, paths_to_check):
    """Сканирует URL-пути с предварительной авторизацией."""
    session = requests.Session()
    
    # Авторизация
    resp = session.post(f"{base_url}/login",
                       data={"username": username, "password": password},
                       allow_redirects=True)
    
    if resp.status_code not in [200, 302]:
        print(f"[-] Login failed: {resp.status_code}")
        return
    
    print(f"[+] Logged in. Cookies: {list(session.cookies.keys())}")
    
    # Сканирование
    for path in paths_to_check:
        url = f"{base_url}{path}"
        try:
            r = session.get(url, allow_redirects=False)
            status = r.status_code
            size = len(r.content)
            if status not in [404]:
                print(f"[{status}] {url} ({size} bytes)")
        except Exception as e:
            print(f"[-] Error on {url}: {e}")
    
    session.close()
```

### Работа с HTTPS и SSL

```python
# Стандартная проверка SSL (рекомендуется)
response = requests.get("https://example.com")  # verify=True по умолчанию

# Отключение проверки SSL (для тестирования с self-signed сертификатами)
# ВНИМАНИЕ: использовать только в лабораторной среде!
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

response = requests.get("https://192.168.1.1", verify=False)

# Кастомный CA-сертификат
response = requests.get("https://internal.corp", verify="/path/to/ca-cert.pem")

# Клиентский сертификат (mTLS)
response = requests.get("https://api.example.com",
                        cert=("/path/client.crt", "/path/client.key"))

# Получение информации о SSL-сертификате
import ssl
import socket

def get_cert_info(hostname, port=443):
    """Получает информацию о SSL-сертификате."""
    context = ssl.create_default_context()
    
    try:
        with socket.create_connection((hostname, port), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                
                # Извлекаем данные
                subject = dict(x[0] for x in cert.get("subject", []))
                issuer = dict(x[0] for x in cert.get("issuer", []))
                
                print(f"\n[SSL Certificate: {hostname}]")
                print(f"  Subject CN:  {subject.get('commonName', 'N/A')}")
                print(f"  Issuer:      {issuer.get('organizationName', 'N/A')}")
                print(f"  Valid from:  {cert.get('notBefore', 'N/A')}")
                print(f"  Valid until: {cert.get('notAfter', 'N/A')}")
                print(f"  Version:     {cert.get('version', 'N/A')}")
                
                # SAN (Subject Alternative Names)
                san = cert.get("subjectAltName", [])
                if san:
                    domains = [v for t, v in san if t == "DNS"]
                    print(f"  SAN domains: {', '.join(domains[:5])}")
                
                return cert
    except ssl.SSLCertVerificationError as e:
        print(f"[-] Certificate error: {e}")
    except Exception as e:
        print(f"[-] Error: {e}")
    return None

get_cert_info("example.com")
```

### Таймауты, ретраи и прокси

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Таймаут: (время подключения, время ожидания ответа)
response = requests.get("https://example.com", timeout=(5, 30))

# Только один таймаут (для обоих)
response = requests.get("https://example.com", timeout=10)

# Автоматические ретраи с экспоненциальным откатом
def create_session_with_retries(
    retries=3,
    backoff_factor=1,
    status_forcelist=(500, 502, 503, 504)
):
    session = requests.Session()
    retry = Retry(
        total=retries,
        read=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

session = create_session_with_retries()
response = session.get("https://example.com")

# Работа через прокси (важно для анонимности и Burp Suite)
proxies = {
    "http":  "http://127.0.0.1:8080",   # Burp Suite
    "https": "http://127.0.0.1:8080",
}
response = requests.get("https://example.com", proxies=proxies, verify=False)

# SOCKS-прокси (Tor)
# pip install requests[socks]
tor_proxies = {
    "http":  "socks5h://127.0.0.1:9050",
    "https": "socks5h://127.0.0.1:9050",
}
response = requests.get("https://check.torproject.org", proxies=tor_proxies)

# Ротация прокси (для избежания блокировок)
import random

PROXY_LIST = [
    "http://proxy1:8080",
    "http://proxy2:8080",
    "http://proxy3:8080",
]

def get_random_proxy():
    proxy = random.choice(PROXY_LIST)
    return {"http": proxy, "https": proxy}

response = requests.get("https://target.com", proxies=get_random_proxy())
```

---

## 4.2.2 Обработка ответов

```python
import requests

response = requests.get("https://httpbin.org/anything")

# ==================== Статус-коды ====================
print(f"Status: {response.status_code}")
print(f"OK: {response.ok}")  # True если 200-299

# Проверка статус-кода
if response.status_code == 200:
    print("[+] OK")
elif response.status_code == 401:
    print("[-] Unauthorized")
elif response.status_code == 403:
    print("[-] Forbidden")
elif response.status_code == 404:
    print("[-] Not Found")
elif response.status_code == 500:
    print("[-] Internal Server Error")

# Вызов исключения при ошибке (4xx, 5xx)
try:
    response.raise_for_status()
except requests.exceptions.HTTPError as e:
    print(f"HTTP error: {e}")

# ==================== Заголовки ====================
print(f"\nAll headers:")
for header, value in response.headers.items():
    print(f"  {header}: {value}")

# Важные заголовки для безопасника
security_headers = [
    "Server",
    "X-Powered-By",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "X-XSS-Protection",
    "Strict-Transport-Security",
    "Content-Security-Policy",
    "Referrer-Policy",
    "Permissions-Policy",
    "Access-Control-Allow-Origin",
]

for h in security_headers:
    value = response.headers.get(h, "ОТСУТСТВУЕТ")
    print(f"  {h}: {value}")

# ==================== Тело ответа ====================
# Текст
html = response.text           # строка
html_bytes = response.content  # байты

# JSON
if "application/json" in response.headers.get("Content-Type", ""):
    data = response.json()

# Стриминг больших файлов (без загрузки в память)
with requests.get("https://example.com/large-file.zip", stream=True) as r:
    r.raise_for_status()
    with open("downloaded.zip", "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
```

---

## 4.2.3 Модуль socket: низкоуровневая сеть

```python
import socket

# ==================== Основные концепции ====================

# socket.AF_INET  — IPv4
# socket.AF_INET6 — IPv6
# socket.SOCK_STREAM — TCP (надёжный, с соединением)
# socket.SOCK_DGRAM  — UDP (без соединения)
# socket.SOCK_RAW    — raw sockets (требует root)

# Создание TCP сокета
tcp_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

# Создание UDP сокета
udp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# ==================== DNS-резолюция ====================
hostname = "example.com"

# Получить IP по имени
ip = socket.gethostbyname(hostname)
print(f"{hostname} -> {ip}")

# Получить все записи
infos = socket.getaddrinfo(hostname, 80)
for info in infos:
    family, type_, proto, canonname, sockaddr = info
    print(f"  {sockaddr[0]}:{sockaddr[1]}")

# Обратный DNS
try:
    name = socket.gethostbyaddr("8.8.8.8")
    print(f"8.8.8.8 -> {name[0]}")
except socket.herror:
    print("No PTR record")

# Получить имя хоста
print(socket.gethostname())
print(socket.getfqdn())

# ==================== TCP-клиент ====================
def tcp_connect(host, port, timeout=3):
    """Устанавливает TCP-соединение и возвращает сокет."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        sock.connect((host, port))
        return sock
    except (socket.timeout, ConnectionRefusedError, OSError):
        sock.close()
        return None

# Banner grabbing — получение баннера сервиса
def grab_banner(host, port, timeout=3):
    """Пытается получить баннер с сервиса."""
    sock = tcp_connect(host, port, timeout)
    if not sock:
        return None
    
    try:
        # Для HTTP отправляем запрос
        if port in [80, 8080, 8000]:
            sock.send(b"HEAD / HTTP/1.0\r\nHost: " + host.encode() + b"\r\n\r\n")
        elif port == 21:
            pass  # FTP сам отправит баннер
        
        banner = sock.recv(1024)
        return banner.decode("utf-8", errors="ignore").strip()
    except Exception:
        return None
    finally:
        sock.close()


# ==================== TCP-сервер ====================
def simple_tcp_server(host="0.0.0.0", port=4444):
    """Простой TCP-сервер (полезно для catch reverse shell)."""
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((host, port))
    server.listen(5)
    
    print(f"[*] Listening on {host}:{port}")
    
    while True:
        client_sock, client_addr = server.accept()
        print(f"[+] Connection from {client_addr[0]}:{client_addr[1]}")
        
        # Простой echo-сервер
        while True:
            try:
                data = client_sock.recv(4096)
                if not data:
                    break
                print(f"Received: {data.decode('utf-8', errors='ignore')}")
                client_sock.send(data)  # echo back
            except Exception:
                break
        
        client_sock.close()
        print(f"[-] Disconnected: {client_addr}")


# ==================== UDP ====================
def udp_send(host, port, message, timeout=2):
    """Отправляет UDP-пакет."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(timeout)
    
    try:
        sock.sendto(message.encode(), (host, port))
        data, addr = sock.recvfrom(4096)
        return data.decode("utf-8", errors="ignore")
    except socket.timeout:
        return None  # UDP не отвечает — возможно открыт/фильтрован
    finally:
        sock.close()
```

---

## 4.2.4 Сканер портов

Написание сканера — классическое упражнение для понимания сетевого программирования.

```python
#!/usr/bin/env python3
"""
port_scanner.py — Многопоточный TCP-сканер портов
Использование: python3 port_scanner.py -H 192.168.1.1 -p 1-1000 -t 200
"""

import socket
import threading
import argparse
import time
import sys
from datetime import datetime
from queue import Queue


# ==================== Конфигурация ====================

# Известные сервисы (расширенная версия /etc/services)
WELL_KNOWN_SERVICES = {
    20: "ftp-data", 21: "ftp", 22: "ssh", 23: "telnet",
    25: "smtp", 53: "dns", 67: "dhcp", 68: "dhcp-client",
    69: "tftp", 80: "http", 88: "kerberos", 110: "pop3",
    111: "rpcbind", 119: "nntp", 123: "ntp", 135: "msrpc",
    137: "netbios-ns", 138: "netbios-dgm", 139: "netbios-ssn",
    143: "imap", 161: "snmp", 162: "snmp-trap", 389: "ldap",
    443: "https", 445: "microsoft-ds", 464: "kpasswd",
    500: "isakmp", 514: "syslog", 515: "printer",
    587: "smtp-submission", 593: "http-rpc-epmap",
    631: "ipp", 636: "ldaps", 873: "rsync",
    902: "vmware-auth", 989: "ftps-data", 990: "ftps",
    993: "imaps", 995: "pop3s",
    1080: "socks", 1194: "openvpn", 1433: "mssql",
    1521: "oracle", 1723: "pptp", 2049: "nfs",
    2181: "zookeeper", 2375: "docker", 2376: "docker-tls",
    3000: "grafana", 3306: "mysql", 3389: "rdp",
    4369: "epmd", 5000: "flask", 5432: "postgresql",
    5601: "kibana", 5672: "rabbitmq", 5900: "vnc",
    6379: "redis", 6443: "k8s-api", 7001: "weblogic",
    8080: "http-alt", 8443: "https-alt", 8888: "jupyter",
    9000: "sonarqube", 9090: "prometheus", 9200: "elasticsearch",
    9300: "elasticsearch-cluster", 10250: "kubelet",
    27017: "mongodb", 27018: "mongodb-shard", 50070: "hadoop",
}

# Очередь для результатов
results_lock = threading.Lock()
open_ports = []


def scan_port_worker(host, port, timeout, semaphore):
    """
    Рабочая функция для потока.
    Проверяет один порт и добавляет результат в общий список.
    """
    with semaphore:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        
        try:
            result = sock.connect_ex((host, port))
            if result == 0:
                # Порт открыт — пробуем получить баннер
                banner = ""
                try:
                    if port in [80, 8080, 8000, 8443]:
                        sock.send(b"HEAD / HTTP/1.0\r\n\r\n")
                    banner = sock.recv(256).decode("utf-8", errors="ignore").strip()
                    banner = banner.split("\n")[0][:60]  # первая строка, макс 60 символов
                except Exception:
                    pass
                
                service = WELL_KNOWN_SERVICES.get(port, "unknown")
                
                with results_lock:
                    open_ports.append((port, service, banner))
                    
        except (socket.timeout, OSError):
            pass
        finally:
            sock.close()


def parse_port_range(port_str):
    """
    Парсит строку диапазона портов.
    Форматы: '80', '80,443,8080', '1-1000', '22,80,443,8000-8100'
    """
    ports = set()
    
    for part in port_str.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            try:
                start, end = int(start), int(end)
                if 1 <= start <= 65535 and 1 <= end <= 65535:
                    ports.update(range(start, end + 1))
            except ValueError:
                print(f"[-] Invalid range: {part}")
        else:
            try:
                p = int(part)
                if 1 <= p <= 65535:
                    ports.add(p)
            except ValueError:
                print(f"[-] Invalid port: {part}")
    
    return sorted(ports)


def scan_host(host, ports, timeout=1.0, max_threads=200, verbose=False):
    """
    Основная функция сканирования.
    """
    global open_ports
    open_ports = []
    
    # Резолюция DNS
    try:
        ip = socket.gethostbyname(host)
    except socket.gaierror:
        print(f"[-] Cannot resolve hostname: {host}")
        return []
    
    print(f"\n{'='*60}")
    print(f"  TCP Port Scanner")
    print(f"  Target:    {host} ({ip})")
    print(f"  Ports:     {len(ports)} ({ports[0]}-{ports[-1]} range)")
    print(f"  Threads:   {max_threads}")
    print(f"  Timeout:   {timeout}s")
    print(f"  Started:   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")
    
    start_time = time.time()
    
    # Семафор для ограничения одновременных потоков
    semaphore = threading.Semaphore(max_threads)
    threads = []
    
    for port in ports:
        t = threading.Thread(
            target=scan_port_worker,
            args=(ip, port, timeout, semaphore),
            daemon=True
        )
        threads.append(t)
        t.start()
    
    # Прогресс-бар
    total = len(threads)
    while any(t.is_alive() for t in threads):
        alive = sum(1 for t in threads if t.is_alive())
        done = total - alive
        pct = (done / total) * 100
        bar = "█" * (done * 30 // total) + "░" * (30 - done * 30 // total)
        elapsed = time.time() - start_time
        speed = done / elapsed if elapsed > 0 else 0
        eta = (alive / speed) if speed > 0 else 0
        
        sys.stdout.write(
            f"\r  [{bar}] {pct:5.1f}% | {done}/{total} | "
            f"{speed:.0f} ports/s | ETA: {eta:.0f}s"
        )
        sys.stdout.flush()
        time.sleep(0.5)
    
    # Ждём завершения всех потоков
    for t in threads:
        t.join()
    
    elapsed = time.time() - start_time
    print(f"\n\n  Scan completed in {elapsed:.2f}s")
    
    # Сортировка и вывод результатов
    open_ports.sort(key=lambda x: x[0])
    
    if open_ports:
        print(f"\n  {'PORT':<8} {'STATE':<8} {'SERVICE':<20} {'BANNER'}")
        print(f"  {'─'*56}")
        for port, service, banner in open_ports:
            banner_display = f"  {banner[:30]}" if banner else ""
            print(f"  {port:<8} {'open':<8} {service:<20}{banner_display}")
    else:
        print("\n  No open ports found.")
    
    print(f"\n  {len(open_ports)} port(s) open out of {len(ports)} scanned")
    print(f"{'='*60}")
    
    return open_ports


def main():
    parser = argparse.ArgumentParser(
        description="Многопоточный TCP-сканер портов",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры:
  python3 port_scanner.py -H 192.168.1.1
  python3 port_scanner.py -H example.com -p 1-1000
  python3 port_scanner.py -H 10.10.10.1 -p 22,80,443,8080-8090 -t 500
  python3 port_scanner.py -H 192.168.1.0/24 -p top100
        """
    )
    parser.add_argument("-H", "--host", required=True, help="Цель (хост или IP)")
    parser.add_argument(
        "-p", "--ports",
        default="1-1024",
        help="Порты: '80', '1-1000', '22,80,443', 'top100' (default: 1-1024)"
    )
    parser.add_argument("-t", "--threads", type=int, default=200,
                        help="Количество потоков (default: 200)")
    parser.add_argument("--timeout", type=float, default=1.0,
                        help="Таймаут соединения в секундах (default: 1.0)")
    parser.add_argument("-v", "--verbose", action="store_true",
                        help="Подробный вывод")
    
    args = parser.parse_args()
    
    # Определяем список портов
    TOP_100_PORTS = [
        21, 22, 23, 25, 53, 80, 110, 111, 119, 135, 139, 143, 161, 389,
        443, 445, 500, 514, 515, 587, 631, 636, 873, 993, 995, 1080, 1194,
        1433, 1521, 1723, 2049, 2375, 3000, 3306, 3389, 3690, 4369, 5000,
        5432, 5601, 5672, 5900, 6379, 6443, 7001, 7080, 8000, 8080, 8443,
        8888, 9000, 9090, 9200, 9300, 10250, 27017, 50070,
    ]
    
    if args.ports == "top100":
        ports = sorted(TOP_100_PORTS)
    else:
        ports = parse_port_range(args.ports)
    
    if not ports:
        print("[-] No valid ports specified")
        sys.exit(1)
    
    try:
        scan_host(args.host, ports, args.timeout, args.threads, args.verbose)
    except KeyboardInterrupt:
        print("\n\n[!] Scan interrupted by user")
        sys.exit(0)


if __name__ == "__main__":
    main()
```

---

## 4.2.5 DNS с Python

```python
import socket

# Встроенные возможности
def resolve_domain(domain):
    """Резолюция домена в IP-адрес."""
    try:
        results = socket.getaddrinfo(domain, None)
        ips = set(r[4][0] for r in results)
        return list(ips)
    except socket.gaierror as e:
        return []

# dnspython — мощная библиотека для DNS
# pip install dnspython
import dns.resolver
import dns.reversename
import dns.zone

def dns_enumeration(domain):
    """Полное перечисление DNS-записей домена."""
    resolver = dns.resolver.Resolver()
    resolver.timeout = 5
    resolver.lifetime = 10
    
    record_types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "PTR"]
    results = {}
    
    print(f"\n[*] DNS Enumeration: {domain}")
    print(f"{'─'*50}")
    
    for rtype in record_types:
        try:
            answers = resolver.resolve(domain, rtype)
            records = []
            for rdata in answers:
                records.append(str(rdata))
            results[rtype] = records
            print(f"  {rtype:<8}: {', '.join(records[:3])}")
            if len(records) > 3:
                print(f"  {'':8}  ... и ещё {len(records)-3} записей")
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer,
                dns.resolver.NoNameservers, dns.exception.Timeout):
            pass
    
    return results


def reverse_dns_lookup(ip):
    """Обратный DNS-запрос."""
    try:
        rev_name = dns.reversename.from_address(ip)
        answers = dns.resolver.resolve(rev_name, "PTR")
        return [str(r) for r in answers]
    except Exception:
        return []


def check_zone_transfer(domain):
    """
    Попытка zone transfer (AXFR).
    Уязвимость: если DNS-сервер не настроен правильно,
    можно получить ВСЕ записи зоны.
    """
    print(f"\n[*] Attempting DNS Zone Transfer for: {domain}")
    
    # Получаем NS-серверы
    try:
        ns_records = dns.resolver.resolve(domain, "NS")
        ns_servers = [str(r) for r in ns_records]
    except Exception as e:
        print(f"[-] Cannot get NS records: {e}")
        return
    
    for ns in ns_servers:
        print(f"\n[*] Trying AXFR from: {ns}")
        try:
            z = dns.zone.from_xfr(dns.query.xfr(ns, domain, timeout=10))
            print(f"[+] Zone transfer SUCCESSFUL from {ns}!")
            for name, node in z.nodes.items():
                print(f"    {name}.{domain}")
        except Exception as e:
            print(f"[-] Zone transfer failed from {ns}: {e}")
```

---

## 4.2.6 Чеккер HTTP-заголовков безопасности

```python
#!/usr/bin/env python3
"""
header_checker.py — Анализатор HTTP-заголовков безопасности
"""

import requests
import json
import sys
import argparse
import urllib3
from urllib.parse import urlparse
from datetime import datetime

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


# ==================== База знаний заголовков ====================

SECURITY_HEADERS = {
    "Strict-Transport-Security": {
        "description": "HSTS: принудительное использование HTTPS",
        "severity": "HIGH",
        "recommended": "max-age=31536000; includeSubDomains; preload",
        "check": lambda v: "max-age" in v.lower(),
        "hint": "Добавьте: Strict-Transport-Security: max-age=31536000; includeSubDomains"
    },
    "X-Frame-Options": {
        "description": "Защита от Clickjacking",
        "severity": "MEDIUM",
        "recommended": "DENY или SAMEORIGIN",
        "check": lambda v: v.upper() in ["DENY", "SAMEORIGIN"],
        "hint": "Добавьте: X-Frame-Options: DENY"
    },
    "X-Content-Type-Options": {
        "description": "Запрет MIME-sniffing",
        "severity": "MEDIUM",
        "recommended": "nosniff",
        "check": lambda v: v.lower() == "nosniff",
        "hint": "Добавьте: X-Content-Type-Options: nosniff"
    },
    "Content-Security-Policy": {
        "description": "CSP: контроль загружаемых ресурсов",
        "severity": "HIGH",
        "recommended": "default-src 'self'; script-src 'self'",
        "check": lambda v: "default-src" in v or "script-src" in v,
        "hint": "Добавьте строгую CSP-политику для защиты от XSS"
    },
    "X-XSS-Protection": {
        "description": "Встроенная защита от XSS (устаревший)",
        "severity": "LOW",
        "recommended": "1; mode=block (или отключить для CSP)",
        "check": lambda v: "1" in v,
        "hint": "Устарел. Используйте CSP вместо X-XSS-Protection"
    },
    "Referrer-Policy": {
        "description": "Контроль Referer-заголовка",
        "severity": "LOW",
        "recommended": "strict-origin-when-cross-origin",
        "check": lambda v: v.lower() in [
            "no-referrer", "strict-origin", "strict-origin-when-cross-origin",
            "no-referrer-when-downgrade", "same-origin"
        ],
        "hint": "Добавьте: Referrer-Policy: strict-origin-when-cross-origin"
    },
    "Permissions-Policy": {
        "description": "Ограничение API браузера",
        "severity": "LOW",
        "recommended": "camera=(), microphone=(), geolocation=()",
        "check": lambda v: len(v) > 5,
        "hint": "Добавьте Permissions-Policy для ограничения доступа к API"
    },
    "Cache-Control": {
        "description": "Управление кэшированием",
        "severity": "MEDIUM",
        "recommended": "no-store, no-cache (для приватных страниц)",
        "check": lambda v: "no-store" in v or "private" in v,
        "hint": "Для приватных страниц: Cache-Control: no-store"
    },
}

# Информационные заголовки (раскрывают технологию)
INFORMATION_DISCLOSURE_HEADERS = [
    "Server",
    "X-Powered-By",
    "X-AspNet-Version",
    "X-AspNetMvc-Version",
    "X-Generator",
    "X-Drupal-Cache",
    "X-Joomla-Version",
    "X-WordPress-Cache",
    "Via",
]

# Опасные значения заголовков
DANGEROUS_VALUES = {
    "Access-Control-Allow-Origin": {
        "dangerous": ["*"],
        "severity": "HIGH",
        "description": "CORS: разрешены запросы от всех доменов (wildcard)"
    },
    "X-Frame-Options": {
        "dangerous": ["ALLOWALL"],
        "severity": "HIGH",
        "description": "X-Frame-Options: ALLOWALL — не обеспечивает защиту"
    },
}


def analyze_headers(url, follow_redirects=True, timeout=10):
    """Анализирует HTTP-заголовки безопасности URL."""
    
    # Нормализация URL
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    
    parsed = urlparse(url)
    domain = parsed.netloc
    
    print(f"\n{'='*65}")
    print(f"  HTTP Security Headers Analyzer")
    print(f"  URL:   {url}")
    print(f"  Date:  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*65}")
    
    # Запрос
    try:
        headers_to_send = {
            "User-Agent": "Mozilla/5.0 (compatible; SecurityChecker/1.0)",
            "Accept": "text/html,application/xhtml+xml,*/*",
        }
        response = requests.get(
            url,
            headers=headers_to_send,
            verify=False,
            timeout=timeout,
            allow_redirects=follow_redirects
        )
    except requests.exceptions.ConnectionError:
        print(f"[-] Cannot connect to {url}")
        return None
    except requests.exceptions.Timeout:
        print(f"[-] Connection timeout to {url}")
        return None
    except Exception as e:
        print(f"[-] Error: {e}")
        return None
    
    resp_headers = response.headers
    
    print(f"\n[*] Status Code:   {response.status_code}")
    print(f"[*] Final URL:     {response.url}")
    print(f"[*] Response Time: {response.elapsed.total_seconds():.3f}s")
    print(f"[*] Content-Type:  {resp_headers.get('Content-Type', 'N/A')}")
    
    # ==================== Проверка информационных заголовков ====================
    print(f"\n{'─'*65}")
    print(f"  [1] ИНФОРМАЦИОННЫЕ ЗАГОЛОВКИ (раскрытие технологий)")
    print(f"{'─'*65}")
    
    info_leaks = []
    for h in INFORMATION_DISCLOSURE_HEADERS:
        if h in resp_headers:
            value = resp_headers[h]
            info_leaks.append((h, value))
            print(f"  ⚠️  {h}: {value}")
    
    if not info_leaks:
        print(f"  ✅ Информационные заголовки не найдены")
    
    # ==================== Проверка заголовков безопасности ====================
    print(f"\n{'─'*65}")
    print(f"  [2] ЗАГОЛОВКИ БЕЗОПАСНОСТИ")
    print(f"{'─'*65}")
    
    score = 0
    max_score = 0
    findings = []
    
    for header_name, header_info in SECURITY_HEADERS.items():
        sev = header_info["severity"]
        weight = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}.get(sev, 1)
        max_score += weight
        
        if header_name in resp_headers:
            value = resp_headers[header_name]
            is_valid = header_info["check"](value)
            
            if is_valid:
                score += weight
                print(f"  ✅ {header_name}")
                print(f"     Значение: {value[:80]}")
            else:
                print(f"  ⚠️  {header_name}")
                print(f"     Значение:    {value[:80]}")
                print(f"     Рекомендация: {header_info['recommended']}")
                findings.append({
                    "header": header_name,
                    "status": "invalid_value",
                    "severity": sev,
                    "current": value,
                    "hint": header_info["hint"]
                })
        else:
            print(f"  ❌ {header_name} — ОТСУТСТВУЕТ [{sev}]")
            print(f"     Описание:     {header_info['description']}")
            print(f"     Рекомендация: {header_info['hint']}")
            findings.append({
                "header": header_name,
                "status": "missing",
                "severity": sev,
                "hint": header_info["hint"]
            })
    
    # ==================== Проверка опасных значений ====================
    print(f"\n{'─'*65}")
    print(f"  [3] ОПАСНЫЕ ЗНАЧЕНИЯ ЗАГОЛОВКОВ")
    print(f"{'─'*65}")
    
    dangerous_found = False
    for header_name, check_info in DANGEROUS_VALUES.items():
        if header_name in resp_headers:
            value = resp_headers[header_name]
            if value in check_info["dangerous"]:
                dangerous_found = True
                print(f"  🔴 {header_name}: {value}")
                print(f"     {check_info['description']}")
    
    if not dangerous_found:
        print(f"  ✅ Опасных значений не обнаружено")
    
    # ==================== Cookie-анализ ====================
    print(f"\n{'─'*65}")
    print(f"  [4] АНАЛИЗ COOKIES")
    print(f"{'─'*65}")
    
    if response.cookies:
        for cookie in response.cookies:
            issues = []
            if not cookie.secure:
                issues.append("Нет Secure флага")
            if not cookie.has_nonstandard_attr("HttpOnly"):
                # Проверяем через raw заголовок
                set_cookie = resp_headers.get("Set-Cookie", "")
                if "HttpOnly" not in set_cookie:
                    issues.append("Нет HttpOnly флага")
            if not cookie.has_nonstandard_attr("SameSite"):
                issues.append("Нет SameSite атрибута")
            
            if issues:
                print(f"  ⚠️  Cookie '{cookie.name}': {', '.join(issues)}")
            else:
                print(f"  ✅ Cookie '{cookie.name}' — правильная конфигурация")
    else:
        print(f"  ℹ️  Cookies не установлены")
    
    # ==================== Итоговая оценка ====================
    pct = (score / max_score * 100) if max_score > 0 else 0
    grade = (
        "A+" if pct >= 95 else
        "A"  if pct >= 85 else
        "B"  if pct >= 75 else
        "C"  if pct >= 60 else
        "D"  if pct >= 40 else
        "F"
    )
    
    print(f"\n{'='*65}")
    print(f"  ИТОГОВАЯ ОЦЕНКА БЕЗОПАСНОСТИ")
    print(f"{'─'*65}")
    print(f"  Баллы: {score}/{max_score} ({pct:.1f}%)")
    print(f"  Оценка: {grade}")
    print(f"{'='*65}")
    
    # Рейтинг
    if findings:
        sev_count = {}
        for f in findings:
            sev_count[f["severity"]] = sev_count.get(f["severity"], 0) + 1
        
        print(f"\n  Требует исправления:")
        for sev in ["HIGH", "MEDIUM", "LOW"]:
            if sev in sev_count:
                print(f"    {sev}: {sev_count[sev]} заголовков")
    
    # JSON-отчёт
    report = {
        "url": url,
        "final_url": response.url,
        "status_code": response.status_code,
        "scan_date": datetime.now().isoformat(),
        "score": score,
        "max_score": max_score,
        "percentage": round(pct, 2),
        "grade": grade,
        "info_leaks": [{"header": h, "value": v} for h, v in info_leaks],
        "findings": findings,
        "all_headers": dict(resp_headers)
    }
    
    report_file = f"{domain.replace('.', '_')}_headers_report.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\n[*] Отчёт сохранён: {report_file}")
    
    return report


def main():
    parser = argparse.ArgumentParser(
        description="Анализатор HTTP-заголовков безопасности"
    )
    parser.add_argument("url", help="URL для анализа (например: https://example.com)")
    parser.add_argument("--no-redirect", action="store_true",
                        help="Не следовать редиректам")
    parser.add_argument("--timeout", type=int, default=10,
                        help="Таймаут запроса в секундах")
    
    args = parser.parse_args()
    
    analyze_headers(
        args.url,
        follow_redirects=not args.no_redirect,
        timeout=args.timeout
    )


if __name__ == "__main__":
    main()
```

### Пример запуска и вывода

```bash
# Установка зависимостей
pip install requests dnspython urllib3

# Запуск чеккера заголовков
python3 header_checker.py https://example.com

# Сканирование портов
python3 port_scanner.py -H 192.168.1.1 -p 1-1000 -t 300

# Сканирование топ-100 портов
python3 port_scanner.py -H scanme.nmap.org -p top100

# DNS-перебор
python3 -c "
import dns.resolver
domain = 'example.com'
wordlist = ['www', 'mail', 'ftp', 'admin', 'vpn', 'dev', 'staging', 'api']
for sub in wordlist:
    try:
        fqdn = f'{sub}.{domain}'
        ans = dns.resolver.resolve(fqdn, 'A')
        print(f'[+] {fqdn} -> {ans[0]}')
    except: pass
"
```

---

## 4.2.7 Таблица сравнения: requests vs socket vs urllib

| Характеристика | urllib (встроенный) | requests | socket |
|----------------|---------------------|----------|--------|
| Уровень | Высокий | Высокий | Низкий |
| Установка | Не нужна | pip install | Не нужна |
| HTTP-запросы | Да, но неудобно | Идеально | Вручную |
| Сессии/cookies | Ограниченно | Встроено | Нет |
| Прокси | Да | Удобно | Вручную |
| TCP/UDP | Нет | Нет | Да |
| Raw packets | Нет | Нет | С root |
| Banner grabbing | Нет | Частично | Да |
| Порт-сканирование | Нет | Нет | Да |
| CTF-применение | Редко | Часто | Часто |

---

## 📝 Упражнения

### Упражнение 1: Расширение чеккера заголовков

Добавь в `header_checker.py` проверку:
- Корректности CSP-политики (наличие `default-src`, отсутствие `unsafe-inline`)
- Наличия HPKP (Public Key Pinning) — устаревшего, но интересного заголовка
- Правильности CORS-конфигурации

### Упражнение 2: UDP-сканер

Напиши UDP-сканер, который проверяет открытость портов:
- DNS (53), SNMP (161), NTP (123)
- Отправляй сервис-специфичные запросы (DNS query, SNMP GetRequest)
- Анализируй ответы для определения состояния порта

### Упражнение 3: Banner Grabbing

Напиши инструмент, который для каждого открытого порта:
1. Получает баннер (первые 512 байт)
2. Определяет сервис по баннеру (версия SSH, HTTP сервер, FTP-сервер)
3. Проверяет баннер по базе CVE (например, OpenSSH < 8.0 имеет уязвимости)

### Упражнение 4 (CTF): HTTP-запросы с аутентификацией

Цель — пройти многоэтапную аутентификацию:
1. GET `/api/challenge` — получить токен
2. POST `/api/login` с HMAC-подписью (sha256) токена + пароля
3. Использовать полученный JWT для доступа к `/api/flag`

```python
import requests
import hmac
import hashlib
import base64
import json

BASE_URL = "http://ctf-challenge.local"

# Шаг 1: получить challenge
r = requests.get(f"{BASE_URL}/api/challenge")
challenge = r.json()["challenge"]
print(f"Challenge: {challenge}")

# Шаг 2: создать подпись
password = "admin"
signature = hmac.new(
    password.encode(),
    challenge.encode(),
    hashlib.sha256
).hexdigest()

# Шаг 3: логин
r = requests.post(f"{BASE_URL}/api/login", json={
    "username": "admin",
    "challenge": challenge,
    "signature": signature
})
token = r.json().get("token")
print(f"Token: {token}")

# Шаг 4: получить флаг
r = requests.get(f"{BASE_URL}/api/flag",
                 headers={"Authorization": f"Bearer {token}"})
print(f"Flag: {r.json()['flag']}")
```

### Упражнение 5: Subdomain Brute Force

Напиши скрипт перебора поддоменов с использованием:
- `socket.getaddrinfo()` для резолюции
- Многопоточности для скорости
- Словаря из 1000 наиболее популярных поддоменов

---

> **Итог главы:** Ты освоил два уровня работы с сетью в Python: высокоуровневый `requests` для HTTP и низкоуровневый `socket` для TCP/UDP. Написаны рабочие инструменты — сканер портов и чеккер безопасности заголовков. В следующей главе перейдём к анализу данных: `re`, `json`, `csv` — и напишем полноценный анализатор логов.

