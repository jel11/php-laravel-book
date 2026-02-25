# Глава 12.3: Web Fuzzing: ffuf, Gobuster, Dirsearch

## Введение

Web Fuzzing (веб-фаззинг) — техника автоматизированного тестирования, при которой инструмент отправляет множество запросов с различными значениями, чтобы обнаружить скрытые ресурсы, уязвимости или неожиданное поведение приложения.

Основные задачи веб-фаззинга:
- **Directory/File Bruteforce** — обнаружение скрытых директорий и файлов
- **Parameter Fuzzing** — поиск скрытых GET/POST-параметров
- **Virtual Host Fuzzing** — обнаружение виртуальных хостов
- **Subdomain Fuzzing** — перечисление поддоменов
- **Payload Fuzzing** — поиск уязвимостей (SQLi, XSS, LFI)

---

## 12.3.1 Словари (Wordlists) для фаззинга

Качество фаззинга напрямую зависит от используемых словарей. SecLists — самая популярная коллекция словарей для тестирования безопасности.

### Установка SecLists

```bash
# Установка через apt
sudo apt-get install seclists

# Список установлен в /usr/share/seclists/

# Или скачать с GitHub
git clone https://github.com/danielmiessler/SecLists.git /opt/SecLists
```

### Структура SecLists

```
/usr/share/seclists/
├── Discovery/
│   ├── Web-Content/         # Директории и файлы
│   │   ├── common.txt            # Популярные директории (4700 строк)
│   │   ├── directory-list-2.3-medium.txt  # Средний словарь (220k строк)
│   │   ├── directory-list-2.3-big.txt     # Большой словарь (1.2M строк)
│   │   ├── raft-medium-directories.txt    # RAFT (30k строк)
│   │   ├── raft-large-directories.txt     # RAFT большой (62k строк)
│   │   ├── api/                  # API эндпоинты
│   │   └── platform/             # Специфичные для CMS
│   │       ├── WordPress.fuzz.txt
│   │       ├── Joomla.fuzz.txt
│   │       └── drupal.txt
│   └── DNS/                 # DNS для брутфорса
│       ├── namelist.txt
│       └── subdomains-top1million-5000.txt
├── Passwords/               # Пароли
│   ├── Common-Credentials/
│   └── Leaked-Databases/
├── Usernames/               # Имена пользователей
└── Fuzzing/                 # Полезные нагрузки
    ├── SQLi/
    ├── XSS/
    └── LFI/
```

### Популярные словари и их применение

| Словарь                                      | Строк  | Применение                   |
|----------------------------------------------|--------|------------------------------|
| `common.txt`                                 | 4,720  | Быстрая проверка             |
| `directory-list-2.3-medium.txt`              | 220k   | Стандартный пентест          |
| `raft-medium-directories.txt`                | 30k    | Баланс скорость/покрытие     |
| `directory-list-2.3-big.txt`                 | 1.2M   | Полное покрытие              |
| `api/api-endpoints.txt`                      | 500    | REST API                     |
| `subdomains-top1million-5000.txt`            | 5k     | Быстрый поиск поддоменов     |

---

## 12.3.2 ffuf — Fast Fuzzer

ffuf (Fuzz Faster U Fool) — самый быстрый и гибкий инструмент для веб-фаззинга с широкими возможностями фильтрации.

### Установка

```bash
# Установка через Go
go install github.com/ffuf/ffuf/v2@latest

# Установка через apt
sudo apt-get install ffuf

# Проверка версии
ffuf -V
```

### Базовый синтаксис

```bash
ffuf -u URL -w WORDLIST [OPTIONS]

# Позиция для фаззинга обозначается FUZZ
ffuf -u https://example.com/FUZZ -w /usr/share/seclists/Discovery/Web-Content/common.txt
```

### Directory Bruteforce (поиск директорий)

```bash
# Базовый поиск директорий
ffuf -u https://example.com/FUZZ \
     -w /usr/share/seclists/Discovery/Web-Content/common.txt

# С расширениями файлов
ffuf -u https://example.com/FUZZ \
     -w /usr/share/seclists/Discovery/Web-Content/common.txt \
     -e .php,.html,.txt,.bak,.old

# Поиск только файлов PHP
ffuf -u https://example.com/FUZZ.php \
     -w /usr/share/seclists/Discovery/Web-Content/raft-medium-words.txt

# С рекурсией (поиск в найденных директориях)
ffuf -u https://example.com/FUZZ \
     -w /usr/share/seclists/Discovery/Web-Content/common.txt \
     -recursion -recursion-depth 3

# Более полное сканирование
ffuf -u https://example.com/FUZZ \
     -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt \
     -e .php,.html,.txt,.bak,.config,.xml,.json \
     -recursion \
     -t 40 \
     -mc 200,301,302,403
```

### Фильтрация ответов

Ключевая особенность ffuf — мощные фильтры для устранения ложных срабатываний:

```bash
# Фильтрация по коду статуса
-mc 200             # Показывать только 200
-mc 200,301,302     # Несколько кодов
-fc 404             # Фильтровать 404 (исключить)
-fc 404,403,500     # Несколько кодов для исключения

# Фильтрация по размеру ответа (байты)
-fs 1234            # Исключить ответы размером 1234 байта
-ms 1234            # Показывать только ответы размером 1234 байта

# Фильтрация по количеству слов
-fw 10              # Исключить ответы с 10 словами
-mw 10              # Показывать только ответы с 10 словами

# Фильтрация по количеству строк
-fl 20              # Исключить ответы с 20 строками
-ml 20              # Показывать только с 20 строками

# Фильтрация по регулярному выражению в теле
-mr "admin|login"   # Показывать, если содержит
-fr "not found"     # Исключать, если содержит

# Автоматический калибровочный запрос
-ac                 # Auto-calibration (удаляет "стандартные" ответы)
-acc "GET,404"      # Калибровка с конкретным статусом
```

**Пример работы с автокалибровкой:**
```bash
# Без калибровки — много ложных срабатываний
ffuf -u https://example.com/FUZZ -w wordlist.txt

# С автокалибровкой — умное исключение однотипных ответов
ffuf -u https://example.com/FUZZ -w wordlist.txt -ac

# Ручная калибровка — если сайт возвращает 200 для несуществующих страниц
# Сначала определяем размер "пустого" ответа
curl -so /dev/null -w "%{size_download}" https://example.com/nonexistent12345
# Получаем например 1234 байта
ffuf -u https://example.com/FUZZ -w wordlist.txt -fs 1234
```

### Parameter Fuzzing (поиск параметров)

```bash
# Фаззинг GET-параметров
ffuf -u "https://example.com/page.php?FUZZ=test" \
     -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
     -fs 1234

# Фаззинг значений параметра
ffuf -u "https://example.com/page.php?id=FUZZ" \
     -w /usr/share/seclists/Fuzzing/numerics/1-100.txt

# POST-параметры
ffuf -u "https://example.com/login" \
     -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
     -X POST \
     -d "FUZZ=test" \
     -H "Content-Type: application/x-www-form-urlencoded"

# JSON POST-параметры
ffuf -u "https://example.com/api/login" \
     -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
     -X POST \
     -d '{"FUZZ": "test"}' \
     -H "Content-Type: application/json"

# Фаззинг значения в JSON
ffuf -u "https://example.com/api/user" \
     -w /usr/share/seclists/Fuzzing/SQLi/quick-SQLi.txt \
     -X POST \
     -d '{"id": "FUZZ"}' \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN"
```

### Virtual Host Fuzzing

```bash
# Поиск виртуальных хостов через заголовок Host
ffuf -u https://192.168.1.1/ \
     -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
     -H "Host: FUZZ.example.com" \
     -fs 4242  # Размер стандартного ответа (без vhost)

# С автокалибровкой
ffuf -u https://192.168.1.1/ \
     -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
     -H "Host: FUZZ.example.com" \
     -ac

# HTTPS с игнорированием SSL
ffuf -u https://192.168.1.1/ \
     -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
     -H "Host: FUZZ.example.com" \
     -ac -k  # -k = игнорировать SSL-ошибки
```

### Subdomain Fuzzing (DNS)

```bash
# Поиск поддоменов
ffuf -u https://FUZZ.example.com/ \
     -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
     -mc 200,301,302,401,403 \
     -ac

# С конкретным резолвером DNS
ffuf -u https://FUZZ.example.com/ \
     -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
     -mc 200,301,302 \
     -r  # Follow redirects
```

### Двойной фаззинг (FUZZ и FUZ2Z)

```bash
# Фаззинг двух параметров одновременно
ffuf -u "https://example.com/FUZZ/FUZ2Z" \
     -w /usr/share/seclists/Discovery/Web-Content/common.txt:FUZZ \
     -w /usr/share/seclists/Discovery/Web-Content/common.txt:FUZ2Z \
     -mc 200

# Комбинирование пользователя и пароля
ffuf -u "https://example.com/login" \
     -w /usr/share/seclists/Usernames/top-usernames-shortlist.txt:FUZZ \
     -w /usr/share/seclists/Passwords/Common-Credentials/10k-most-common.txt:FUZ2Z \
     -X POST \
     -d "username=FUZZ&password=FUZ2Z" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -mc 302
```

### Заголовки, прокси и настройки

```bash
# Добавление заголовков
ffuf -u https://example.com/FUZZ \
     -w wordlist.txt \
     -H "Authorization: Bearer TOKEN" \
     -H "X-Custom-Header: value" \
     -H "Cookie: session=abc123"

# Через прокси (Burp Suite)
ffuf -u https://example.com/FUZZ \
     -w wordlist.txt \
     -x http://127.0.0.1:8080 \
     -k  # Игнорировать SSL

# Скорость и параллелизм
ffuf -u https://example.com/FUZZ \
     -w wordlist.txt \
     -t 50 \          # 50 потоков (по умолчанию 40)
     -rate 100 \      # 100 запросов в секунду
     -timeout 10      # Таймаут запроса 10 секунд

# Задержка между запросами
ffuf -u https://example.com/FUZZ \
     -w wordlist.txt \
     -p 0.1           # 0.1 секунды между запросами
```

### Сохранение результатов

```bash
# Сохранение в разных форматах
ffuf -u https://example.com/FUZZ \
     -w wordlist.txt \
     -o results.json      # JSON
     
ffuf -u https://example.com/FUZZ \
     -w wordlist.txt \
     -o results.html -of html  # HTML

ffuf -u https://example.com/FUZZ \
     -w wordlist.txt \
     -o results.csv -of csv   # CSV

# Тихий режим + сохранение
ffuf -u https://example.com/FUZZ \
     -w wordlist.txt \
     -s \              # Silent — только результаты
     -o results.json
```

---

## 12.3.3 Gobuster — Directory/DNS Bruteforce

Gobuster — быстрый инструмент для брутфорса директорий, DNS-имён и виртуальных хостов.

### Установка

```bash
# Через Go
go install github.com/OJ/gobuster/v3@latest

# Через apt
sudo apt-get install gobuster
```

### Режимы Gobuster

```bash
# Доступные режимы
gobuster --help
# dir    - Directory/File enumeration
# dns    - DNS subdomain enumeration  
# vhost  - Virtual host enumeration
# s3     - AWS S3 bucket enumeration
# gcs    - Google Cloud Storage
# fuzz   - Fuzzing mode
# tftp   - TFTP enumeration
```

### Directory Mode (dir)

```bash
# Базовый поиск директорий
gobuster dir -u https://example.com -w /usr/share/seclists/Discovery/Web-Content/common.txt

# С расширениями
gobuster dir \
    -u https://example.com \
    -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt \
    -x php,html,txt,bak,old,zip

# Показывать определённые коды
gobuster dir \
    -u https://example.com \
    -w wordlist.txt \
    -s "200,204,301,302,307,401,403"

# Исключить коды
gobuster dir \
    -u https://example.com \
    -w wordlist.txt \
    -b 404,500

# С cookie и заголовками
gobuster dir \
    -u https://example.com \
    -w wordlist.txt \
    -c "session=abc123" \
    -H "Authorization: Bearer TOKEN"

# Через прокси
gobuster dir \
    -u https://example.com \
    -w wordlist.txt \
    --proxy http://127.0.0.1:8080 \
    -k  # Игнорировать TLS

# Скорость
gobuster dir \
    -u https://example.com \
    -w wordlist.txt \
    -t 50 \      # 50 потоков
    --delay 100ms  # Задержка 100мс

# Сохранение
gobuster dir \
    -u https://example.com \
    -w wordlist.txt \
    -o results.txt

# Фильтрация по размеру
gobuster dir \
    -u https://example.com \
    -w wordlist.txt \
    --exclude-length 1234  # Исключить страницы размером 1234 байт
```

### DNS Mode (поиск поддоменов)

```bash
# Базовый поиск поддоменов
gobuster dns \
    -d example.com \
    -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt

# С конкретным DNS-сервером
gobuster dns \
    -d example.com \
    -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
    -r 8.8.8.8

# Показывать IP-адреса
gobuster dns \
    -d example.com \
    -w wordlist.txt \
    -i  # Show IP addresses

# Дополнительная информация
gobuster dns \
    -d example.com \
    -w wordlist.txt \
    --show-cname  # Показывать CNAME записи
```

### VHOST Mode (виртуальные хосты)

```bash
# Поиск виртуальных хостов
gobuster vhost \
    -u https://example.com \
    -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt

# Добавление домена к словарю
gobuster vhost \
    -u https://192.168.1.1 \
    -w wordlist.txt \
    --append-domain \  # Добавляет .example.com к каждому слову
    --domain example.com

# Исключение по длине ответа
gobuster vhost \
    -u https://example.com \
    -w wordlist.txt \
    --exclude-length 301  # Исключить "стандартные" ответы

# Формат вывода
gobuster vhost \
    -u https://example.com \
    -w wordlist.txt \
    -o vhosts.txt
```

### S3 Bucket Enumeration

```bash
# Поиск S3 бакетов (по имени компании/продукта)
gobuster s3 \
    -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
    --prefix example- \
    --suffix -backup

# Примеры имён для поиска
gobuster s3 -w company_names.txt
# Проверяет: https://companyname.s3.amazonaws.com
```

---

## 12.3.4 Dirsearch — простой и эффективный фаззер

Dirsearch — инструмент на Python для поиска директорий и файлов, удобный своими встроенными словарями.

### Установка

```bash
# Через pip
pip3 install dirsearch

# Через git
git clone https://github.com/maurosoria/dirsearch.git
cd dirsearch && pip3 install -r requirements.txt
python3 dirsearch.py --help
```

### Базовое использование

```bash
# Базовый поиск
dirsearch -u https://example.com

# С конкретным словарём
dirsearch -u https://example.com \
          -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt

# Конкретные расширения
dirsearch -u https://example.com \
          -e php,html,txt,bak,old

# Без расширений
dirsearch -u https://example.com \
          --no-extension

# Список URL для сканирования
dirsearch -l targets.txt \
          -e php,html

# Рекурсивный поиск
dirsearch -u https://example.com \
          -r \
          --recursion-depth 3
```

### Фильтрация

```bash
# Исключить коды
dirsearch -u https://example.com \
          -x 404,500,502

# Показывать только определённые коды
dirsearch -u https://example.com \
          -i 200,301,302

# Исключить по размеру
dirsearch -u https://example.com \
          --exclude-sizes 0,1234

# Исключить по тексту
dirsearch -u https://example.com \
          --exclude-text "Page Not Found"

# Исключить редиректы на определённый URL
dirsearch -u https://example.com \
          --exclude-redirect /login
```

### Дополнительные возможности

```bash
# Заголовки запросов
dirsearch -u https://example.com \
          -H "Cookie: session=abc123" \
          -H "Authorization: Bearer TOKEN"

# Через прокси
dirsearch -u https://example.com \
          --proxy http://127.0.0.1:8080

# Скорость
dirsearch -u https://example.com \
          -t 30 \           # 30 потоков
          --max-rate 50 \   # 50 запросов в секунду
          --delay 0.1       # 0.1 секунды задержка

# Сохранение
dirsearch -u https://example.com \
          -o results.txt \
          --format plain

dirsearch -u https://example.com \
          -o results.html \
          --format html

# Отчёт в JSON
dirsearch -u https://example.com \
          --output-file results.json \
          --format json

# Список игнорируемых путей
echo "/logout" > ignore.txt
echo "/home" >> ignore.txt
dirsearch -u https://example.com \
          --skip-on-status 302 \
          --exclude-response ignore.txt
```

---

## 12.3.5 Сравнение инструментов

| Характеристика      | ffuf                 | Gobuster             | Dirsearch           |
|---------------------|----------------------|----------------------|---------------------|
| Язык                | Go                   | Go                   | Python              |
| Скорость            | Очень высокая        | Высокая              | Средняя             |
| Гибкость            | Максимальная         | Высокая              | Средняя             |
| Фильтрация          | Расширенная          | Базовая              | Средняя             |
| Встроенные словари  | Нет                  | Нет                  | Да                  |
| Двойной фаззинг     | Да                   | Нет                  | Нет                 |
| Vhost фаззинг       | Да                   | Да                   | Нет                 |
| DNS фаззинг         | Ограниченно          | Да                   | Нет                 |
| S3/GCS              | Нет                  | Да                   | Нет                 |
| Сложность освоения  | Средняя              | Низкая               | Низкая              |

---

## 12.3.6 Продвинутые техники фаззинга

### Фаззинг заголовков HTTP

```bash
# Поиск уязвимостей через заголовки
ffuf -u https://example.com/ \
     -w /usr/share/seclists/Fuzzing/Headers/SSRF-headers.txt \
     -H "FUZZ: http://attacker.com/test" \
     -mr "attacker.com"  # Ищем SSRF

# Bypass защиты через заголовки
ffuf -u https://example.com/admin \
     -w /usr/share/seclists/Fuzzing/Headers/access-control-bypass.txt:FUZZ \
     -H "FUZZ" \
     -mc 200

# Поиск LFI/Path Traversal
ffuf -u "https://example.com/download?file=FUZZ" \
     -w /usr/share/seclists/Fuzzing/LFI/LFI-Jhaddix.txt \
     -mc 200 -fr "No such file"
```

### API Endpoint Fuzzing

```bash
# Поиск API-эндпоинтов
ffuf -u https://api.example.com/FUZZ \
     -w /usr/share/seclists/Discovery/Web-Content/api/api-endpoints.txt \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TOKEN"

# Версионирование API
ffuf -u https://example.com/api/FUZZ/users \
     -w version_numbers.txt \
     -mc 200,401

# Создадим словарь версий
cat > version_numbers.txt << EOF
v1
v2
v3
v1.0
v2.0
v3.0
v1.1
v2.1
2024
2023
EOF

# Методы HTTP
for method in GET POST PUT DELETE PATCH OPTIONS HEAD; do
    echo -n "$method: "
    curl -s -o /dev/null -w "%{http_code}" \
         -X $method https://example.com/api/users
    echo
done
```

### Recursive Fuzzing с обнаружением новых путей

```bash
#!/bin/bash
# Рекурсивный фаззинг с накоплением результатов

TARGET="https://example.com"
WORDLIST="/usr/share/seclists/Discovery/Web-Content/common.txt"
RESULTS_DIR="/tmp/ffuf_results"
FOUND_DIRS="/tmp/found_dirs.txt"

mkdir -p "$RESULTS_DIR"
echo "$TARGET" > "$FOUND_DIRS"

# Первый уровень
ffuf -u "$TARGET/FUZZ" \
     -w "$WORDLIST" \
     -mc 200,301,302,403 \
     -ac \
     -s \
     -o "$RESULTS_DIR/level1.json" 2>/dev/null

# Извлечение найденных директорий
python3 - << 'PYTHON'
import json
import sys

with open("/tmp/ffuf_results/level1.json") as f:
    data = json.load(f)

for result in data.get("results", []):
    if result["status"] in [301, 302, 200]:
        url = result["url"]
        print(url)
PYTHON
```

### Bypass WAF и фильтров

```bash
# Case variation
ffuf -u "https://example.com/FUZZ" \
     -w wordlist.txt \
     -request-proto http

# Encoding payloads
# URL encoding
curl "https://example.com/page.php?id=1%27%20OR%201%3D1--"

# Double encoding
curl "https://example.com/page.php?id=1%2527%2520OR%25201%253D1--"

# Unicode normalization
ffuf -u "https://example.com/FUZZ" \
     -w unicode_encoded_wordlist.txt

# Добавление неожиданных заголовков
ffuf -u "https://example.com/admin" \
     -w /usr/share/seclists/Discovery/Web-Content/common.txt \
     -H "X-Original-URL: FUZZ" \
     -H "X-Forwarded-For: 127.0.0.1"
```

---

## 12.3.7 Полная методология фаззинга

```bash
#!/bin/bash
# Полная методология веб-фаззинга

TARGET_URL=$1
DOMAIN=$(echo $TARGET_URL | sed 's|https\?://||' | cut -d'/' -f1)
OUTPUT_DIR="fuzzing_${DOMAIN}_$(date +%Y%m%d_%H%M%S)"
WORDLISTS="/usr/share/seclists"

mkdir -p "$OUTPUT_DIR"

echo "========================================="
echo "  WEB FUZZING: $TARGET_URL"
echo "========================================="

# === ЭТАП 1: Быстрое обнаружение ===
echo -e "\n[ЭТАП 1] Быстрое обнаружение структуры"
ffuf -u "$TARGET_URL/FUZZ" \
     -w "$WORDLISTS/Discovery/Web-Content/common.txt" \
     -mc 200,201,204,301,302,307,401,403 \
     -ac \
     -t 50 \
     -o "$OUTPUT_DIR/01_quick_discovery.json" \
     -of json 2>/dev/null

# Извлекаем найденные пути
echo "Найдено:"
cat "$OUTPUT_DIR/01_quick_discovery.json" | python3 -c "
import json,sys
data=json.load(sys.stdin)
for r in data.get('results',[]):
    print(f'  [{r[\"status\"]}] {r[\"url\"]} ({r[\"length\"]} bytes)')
"

# === ЭТАП 2: Поиск файлов с расширениями ===
echo -e "\n[ЭТАП 2] Поиск файлов с расширениями"
ffuf -u "$TARGET_URL/FUZZ" \
     -w "$WORDLISTS/Discovery/Web-Content/raft-medium-words.txt" \
     -e .php,.html,.txt,.bak,.old,.zip,.tar,.gz,.sql,.env,.config \
     -mc 200,301,302,401 \
     -ac \
     -t 40 \
     -o "$OUTPUT_DIR/02_file_discovery.json" \
     -of json 2>/dev/null

# === ЭТАП 3: Поиск скрытых параметров ===
echo -e "\n[ЭТАП 3] Поиск GET-параметров"
ffuf -u "$TARGET_URL/?FUZZ=test" \
     -w "$WORDLISTS/Discovery/Web-Content/burp-parameter-names.txt" \
     -mc 200 \
     -ac \
     -t 30 \
     -o "$OUTPUT_DIR/03_parameters.json" \
     -of json 2>/dev/null

# === ЭТАП 4: Поиск виртуальных хостов ===
echo -e "\n[ЭТАП 4] Поиск виртуальных хостов"
IP=$(dig +short $DOMAIN | head -1)
if [ -n "$IP" ]; then
    ffuf -u "http://$IP/" \
         -w "$WORDLISTS/Discovery/DNS/subdomains-top1million-5000.txt" \
         -H "Host: FUZZ.$DOMAIN" \
         -ac \
         -t 30 \
         -o "$OUTPUT_DIR/04_vhosts.json" \
         -of json 2>/dev/null
fi

# === ЭТАП 5: Поиск API-эндпоинтов ===
echo -e "\n[ЭТАП 5] Поиск API-эндпоинтов"
for api_base in /api /api/v1 /api/v2 /v1 /v2 /rest; do
    ffuf -u "$TARGET_URL${api_base}/FUZZ" \
         -w "$WORDLISTS/Discovery/Web-Content/api/api-endpoints.txt" \
         -H "Content-Type: application/json" \
         -mc 200,201,401,403 \
         -ac \
         -t 20 \
         -s 2>/dev/null | while read url; do
        echo "  [API] $url" >> "$OUTPUT_DIR/05_api.txt"
    done
done

# === ИТОГОВЫЙ ОТЧЁТ ===
echo -e "\n========================================="
echo "  ИТОГОВЫЙ ОТЧЁТ"
echo "========================================="
echo "Найденные директории и файлы:"
python3 - << 'PYTHON'
import json, os, glob

output_dir = os.environ.get('OUTPUT_DIR', '.')
all_results = []

for json_file in glob.glob(f'{output_dir}/*.json'):
    try:
        with open(json_file) as f:
            data = json.load(f)
            for r in data.get('results', []):
                all_results.append({
                    'status': r['status'],
                    'url': r['url'],
                    'length': r['length']
                })
    except:
        pass

# Сортировка по статус-коду
all_results.sort(key=lambda x: x['status'])

for r in all_results:
    print(f"  [{r['status']}] {r['url']}")
PYTHON
```

---

## 12.3.8 Создание собственных словарей

```bash
# Создание словаря на основе сайта
# cewl — генерация словарей из контента сайта
cewl https://example.com -w custom_wordlist.txt
cewl https://example.com -d 3 -m 5 -w custom_wordlist.txt
# -d 3 - глубина 3 уровня
# -m 5 - минимум 5 символов

# Объединение словарей
cat common.txt raft-medium.txt | sort -u > combined.txt

# Добавление расширений к словарю
while read word; do
    echo "$word"
    echo "$word.php"
    echo "$word.bak"
    echo "$word.old"
done < wordlist.txt > extended_wordlist.txt

# Генерация числовых последовательностей
seq 1 1000 > numbers.txt
seq -w 001 100 > numbers_padded.txt

# Генерация дат
python3 -c "
from datetime import date, timedelta
d = date(2020, 1, 1)
while d <= date(2024, 12, 31):
    print(d.strftime('%Y%m%d'))
    print(d.strftime('%d%m%Y'))
    d += timedelta(days=1)
" > dates.txt
```

---

## Итоги главы

В этой главе мы изучили:

- **ffuf** — самый гибкий фаззер с мощными фильтрами и поддержкой нескольких позиций фаззинга
- **Gobuster** — быстрый инструмент для директорий, DNS и виртуальных хостов
- **Dirsearch** — простой Python-фаззер со встроенными словарями
- **SecLists** — коллекция словарей для всех сценариев тестирования
- **Методологию** — систематический подход к фаззингу в несколько этапов
- **Обход WAF** — техники уклонения от защитных механизмов

### Рекомендуемый порядок инструментов

1. **Быстро**: `gobuster dir` с `common.txt` — определить базовую структуру
2. **Детально**: `ffuf` с `directory-list-2.3-medium.txt` + расширения
3. **API**: `ffuf` с `api-endpoints.txt` + методы HTTP
4. **Виртуальные хосты**: `ffuf` или `gobuster vhost`

---

## Практические задания

### Задание 1: Базовый фаззинг
На учебном сервере `http://testphp.vulnweb.com`:
- Найдите все доступные директории с помощью ffuf
- Найдите PHP-файлы с помощью Gobuster
- Сравните результаты двух инструментов

### Задание 2: Поиск скрытых параметров
На `http://testphp.vulnweb.com/artists.php`:
- Найдите все GET-параметры с помощью ffuf
- Проверьте каждый параметр на SQL-инъекцию
- Задокументируйте находки

### Задание 3: Виртуальные хосты
На учебной системе HackTheBox:
- Определите IP-адрес цели
- Найдите виртуальные хосты с помощью ffuf
- Добавьте найденные хосты в `/etc/hosts`

### Задание 4: API Discovery
Для `http://testphp.vulnweb.com`:
- Найдите все API-эндпоинты
- Определите поддерживаемые HTTP-методы
- Найдите незадокументированные параметры

### Задание 5: Автоматизация
Напишите bash-скрипт, который:
- Принимает URL как аргумент
- Последовательно запускает ffuf для директорий, файлов и параметров
- Фильтрует только интересные результаты (200, 301, 401, 403)
- Формирует итоговый список в файл

