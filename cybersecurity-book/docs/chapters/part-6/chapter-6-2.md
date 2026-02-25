# Глава 6.2: Splunk: SPL-запросы и дашборды

## 🎯 Цели главы

- Понять архитектуру Splunk и роли его компонентов
- Освоить SPL (Search Processing Language) — язык запросов Splunk
- Научиться строить корреляционные запросы для детекции атак
- Создавать дашборды и настраивать алерты
- Применять Splunk для типичных задач SOC-аналитика
- Решать CTF-задачи на анализ логов в Splunk

---

## 1. 🏗️ Архитектура Splunk

Splunk — коммерческая платформа для сбора, индексирования, поиска и визуализации машинных данных. Несмотря на платный характер, Splunk Enterprise имеет бесплатную лицензию на 500 МБ/день, а Splunk Free/Trial — для лабораторных целей.

### 1.1 Компоненты Splunk

```
┌─────────────────────────────────────────────────────────────────┐
│                     АРХИТЕКТУРА SPLUNK                          │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Universal  │    │  Heavy      │    │   Syslog    │         │
│  │  Forwarder  │    │  Forwarder  │    │   Server    │         │
│  │  (UF)       │    │  (HF)       │    │             │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                            │                                    │
│                     ┌──────▼──────┐                             │
│                     │   Indexer   │                             │
│                     │  (Indexing  │                             │
│                     │   Layer)    │                             │
│                     └──────┬──────┘                             │
│                            │                                    │
│                     ┌──────▼──────┐                             │
│                     │ Search Head │                             │
│                     │  (Search &  │                             │
│                     │  Analytics) │                             │
│                     └──────┬──────┘                             │
│                            │                                    │
│               ┌────────────┴────────────┐                       │
│               │                         │                       │
│        ┌──────▼──────┐          ┌───────▼─────┐                 │
│        │  Dashboards │          │   Alerts    │                 │
│        │    &        │          │    &        │                 │
│        │  Reports    │          │  Actions    │                 │
│        └─────────────┘          └─────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Типы Forwarder'ов

| Тип | Описание | Когда использовать |
|-----|----------|-------------------|
| **Universal Forwarder (UF)** | Лёгкий агент (~15 МБ), только пересылка данных | На каждом конечном хосте (Windows/Linux) |
| **Heavy Forwarder (HF)** | Полный Splunk, парсинг и фильтрация на борту | Для предобработки, маршрутизации потоков |
| **HTTP Event Collector (HEC)** | REST API для приёма данных по HTTPS | Приложения, скрипты, облачные сервисы |
| **Syslog Input** | Встроенный UDP/TCP 514 приёмник | Сетевые устройства, firewall, IDS |

### 1.3 Процесс индексирования

Когда данные поступают в Splunk, они проходят несколько стадий:

```
Сырые данные
    ↓
[1] Line Breaking       → разбивка на события
    ↓
[2] Timestamp Extraction → извлечение времени
    ↓
[3] Annotation          → добавление метаданных (host, source, sourcetype)
    ↓
[4] Parsing             → структурирование полей
    ↓
[5] Indexing            → запись в индекс (tsidx + rawdata)
    ↓
Splunk Index (Bucket)
```

### 1.4 Splunk Index Buckets

```
Index Storage Structure:
├── Hot Bucket     → активная запись, доступен для поиска
├── Warm Bucket    → только чтение, последние данные
├── Cold Bucket    → перемещён на более медленный диск
└── Frozen Bucket → архив или удаление (настраивается)
```

### 1.5 Основные компоненты Search Head

```
Search Head содержит:
├── Search Scheduler   → запускает scheduled searches / alerts
├── Knowledge Objects  → saved searches, lookups, field extractions
├── App Framework      → Splunk Apps (Technology Add-ons, TA)
└── REST API           → управление через API
```

---

## 2. 📖 Основы SPL (Search Processing Language)

SPL — язык запросов Splunk. Его синтаксис напоминает Unix pipes: каждая команда передаёт результаты следующей через символ `|`.

### 2.1 Базовый синтаксис

```spl
index=security sourcetype=WinEventLog EventCode=4625
| stats count by Account_Name, src_ip
| sort -count
| head 20
```

Структура запроса:
```
[поисковая фраза] | [команда1] | [команда2] | ... | [командаN]
```

### 2.2 Временные диапазоны

```spl
# Последние 24 часа
index=web earliest=-24h latest=now

# Конкретный диапазон
index=web earliest="01/15/2024:00:00:00" latest="01/16/2024:23:59:59"

# Последние 15 минут
index=web earliest=-15m

# Вчерашний день
index=web earliest=-1d@d latest=@d

# Прошлая неделя
index=web earliest=-1w@w latest=@w
```

### 2.3 Поиск по ключевым словам

```spl
# Простой поиск
index=web "error" "login failed"

# Поиск с wildcards
index=web sourcetype=apache_access "192.168.*"

# Поиск по полю
index=web status=404

# Исключение
index=web status!=200

# Диапазон
index=web status>=400 status<500

# OR / AND / NOT
index=web (status=401 OR status=403) NOT src_ip="10.0.0.1"
```

### 2.4 Команда search

```spl
# Явный вызов search (обычно не нужен в начале запроса)
index=web | search status=404

# Поиск по нескольким полям
index=security | search (EventCode=4624 OR EventCode=4625) Account_Name="*admin*"

# Поиск по wildcards в полях
index=web | search uri_path="*/admin/*"
```

---

## 3. 🔧 Базовые команды SPL

### 3.1 table — форматирование вывода

```spl
# Вывести определённые поля в виде таблицы
index=web sourcetype=access_combined
| table _time, src_ip, method, uri_path, status, bytes

# Переименование столбцов
index=web
| table _time, src_ip, status
| rename src_ip as "IP-адрес", status as "HTTP статус"
```

### 3.2 fields — управление полями

```spl
# Оставить только нужные поля (ускоряет запрос)
index=web
| fields _time, src_ip, status, bytes, uri_path

# Удалить ненужные поля
index=web
| fields - _raw, punct, linecount
```

> **Совет по производительности:** Используйте `fields` сразу после поиска — это уменьшает объём данных, передаваемых между командами pipeline.

### 3.3 where — фильтрация по условию

```spl
# Фильтр по условию (после агрегации)
index=web
| stats count by src_ip
| where count > 100

# Сравнение строк (LIKE)
index=security
| where like(Account_Name, "%admin%")

# Числовые условия
index=web
| where status >= 400 AND bytes > 10000

# Использование функций
index=web
| where isnull(src_ip) OR src_ip=""
```

### 3.4 eval — вычисление новых полей

```spl
# Создать новое поле
index=web
| eval kb_transferred = bytes / 1024
| table src_ip, uri_path, kb_transferred

# Условные выражения
index=web
| eval threat_level = case(
    status >= 500, "Critical",
    status >= 400, "Warning",
    status == 200, "Normal",
    true(), "Unknown"
)

# Конкатенация строк
index=security
| eval user_host = Account_Name + "@" + ComputerName

# Работа с временем
index=web
| eval hour_of_day = strftime(_time, "%H")
| eval day_of_week = strftime(_time, "%A")

# Математические функции
index=web
| eval log_bytes = log(bytes, 10)
| eval sqrt_bytes = sqrt(bytes)

# Преобразование типов
index=security
| eval EventCode_str = tostring(EventCode)
| eval timestamp_epoch = strptime(time_field, "%Y-%m-%d %H:%M:%S")
```

### 3.5 rex — регулярные выражения

```spl
# Извлечение поля с помощью regex
index=web
| rex field=_raw "(?P<user_agent>\"[^\"]+\")\s*$"

# Извлечение IP из текста
index=syslog
| rex field=message "src=(?P<src_ip>\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})"

# Извлечение нескольких полей
index=apache
| rex field=_raw "\"(?P<method>[A-Z]+)\s+(?P<uri>[^\s]+)\s+HTTP/(?P<http_ver>[0-9.]+)\""

# Режим sed: замена
index=web
| rex mode=sed field=uri_path "s/\?.*//"

# Многострочный режим
index=multiline_logs
| rex field=_raw "(?ms)START(?P<payload>.+?)END"
```

---

## 4. 📊 Агрегации: stats, chart, timechart

### 4.1 Команда stats

```spl
# Базовый подсчёт
index=web | stats count

# Подсчёт по группе
index=web | stats count by status

# Несколько агрегаций
index=web | stats count, avg(bytes), max(bytes), min(bytes), sum(bytes) by src_ip

# Уникальные значения
index=web | stats dc(src_ip) as unique_ips, values(uri_path) as paths by status

# Первое и последнее значение
index=security | stats first(_time) as first_seen, last(_time) as last_seen by Account_Name
```

**Функции агрегации stats:**

| Функция | Описание | Пример |
|---------|----------|--------|
| `count` | Количество событий | `count` |
| `count(field)` | Количество непустых значений поля | `count(src_ip)` |
| `dc(field)` | Количество уникальных значений | `dc(src_ip)` |
| `avg(field)` | Среднее значение | `avg(bytes)` |
| `max(field)` | Максимальное значение | `max(bytes)` |
| `min(field)` | Минимальное значение | `min(response_time)` |
| `sum(field)` | Сумма значений | `sum(bytes)` |
| `stdev(field)` | Стандартное отклонение | `stdev(bytes)` |
| `values(field)` | Список всех значений | `values(uri_path)` |
| `list(field)` | Список значений (с повторами) | `list(status)` |
| `first(field)` | Первое значение | `first(_time)` |
| `last(field)` | Последнее значение | `last(_time)` |
| `range(field)` | max - min | `range(bytes)` |
| `median(field)` | Медиана | `median(response_time)` |
| `perc95(field)` | 95-й перцентиль | `perc95(bytes)` |

### 4.2 Команда chart

```spl
# Двумерная таблица
index=web
| chart count by status, src_ip
| sort -count

# Chart с агрегацией
index=web
| chart avg(bytes) over src_ip by status

# Ограничение значений (топ-10)
index=web
| chart count by status, src_ip limit=10

# Использование useother и usenull
index=web
| chart count by src_ip, status limit=5 useother=true usenull=false
```

### 4.3 Команда timechart

```spl
# Базовый timechart
index=web
| timechart count

# Временной интервал
index=web
| timechart span=1h count by status

# Несколько метрик
index=web
| timechart span=5m count as requests, avg(bytes) as avg_size

# Top N значений
index=web
| timechart span=1h count by src_ip limit=5

# Скользящее среднее
index=web
| timechart span=1h count as raw_count
| streamstats window=5 avg(raw_count) as moving_avg
```

### 4.4 stats vs chart vs timechart

| Команда | Когда использовать | Тип вывода | Ось X |
|---------|-------------------|------------|-------|
| `stats` | Агрегация без временной привязки | Плоская таблица | Нет |
| `chart` | Матрица по двум измерениям | Сводная таблица | Любое поле |
| `timechart` | Тренды во времени | Временной ряд | Всегда `_time` |

```spl
# stats — общая статистика
index=web | stats count by src_ip, status

# chart — матрица IP x статус
index=web | chart count by src_ip, status

# timechart — количество по статусам во времени
index=web | timechart span=1h count by status
```

---

## 5. 🔗 Команда transaction

`transaction` группирует события в сессии/транзакции на основе общего поля.

### 5.1 Базовое использование

```spl
# Группировка по сессии
index=web
| transaction sessionid
| table sessionid, duration, eventcount, _time

# По IP и порту
index=network
| transaction src_ip, dst_port maxpause=30s maxspan=5m

# Именованные транзакции
index=web
| transaction clientip startswith="GET /login" endswith="POST /logout"
```

### 5.2 Параметры transaction

| Параметр | Описание | Пример |
|----------|----------|--------|
| `maxspan` | Максимальная длительность транзакции | `maxspan=1h` |
| `maxpause` | Макс. пауза между событиями | `maxpause=30s` |
| `startswith` | Условие начала транзакции | `startswith="Login"` |
| `endswith` | Условие конца транзакции | `endswith="Logout"` |
| `maxevents` | Макс. количество событий | `maxevents=100` |
| `keepevicted` | Хранить неполные транзакции | `keepevicted=true` |

### 5.3 Практический пример: сессии брутфорса

```spl
# Найти брутфорс-сессии: много неудачных входов за короткий период
index=security EventCode=4625
| transaction Account_Name maxspan=5m maxpause=30s
| where eventcount > 10
| table _time, Account_Name, src_ip, eventcount, duration
| sort -eventcount
```

### 5.4 stats vs transaction

```spl
# stats быстрее для простых агрегаций
index=web
| stats count by sessionid, clientip
| where count > 10

# transaction — для сложных сессионных паттернов
index=web
| transaction sessionid maxspan=30m
| where eventcount > 100 OR duration > 1800
```

> **Важно:** `transaction` значительно медленнее `stats`. Используйте `stats` везде, где возможно.

---

## 6. 📚 Команда lookup

Lookup позволяет обогащать события данными из внешних таблиц (CSV, KV Store, API).

### 6.1 Создание lookup-таблицы

```csv
# Файл: threat_intel.csv
ip,reputation,country,category
1.2.3.4,malicious,RU,C2
5.6.7.8,suspicious,CN,Scanner
192.168.1.1,internal,US,Internal
```

### 6.2 Базовое использование lookup

```spl
# Добавить поля из lookup по IP
index=web
| lookup threat_intel ip as src_ip OUTPUT reputation, country, category
| where reputation="malicious"
| table _time, src_ip, uri_path, reputation, country

# Lookup с OUTPUT OUTPUTNEW
index=web
| lookup threat_intel ip as src_ip OUTPUTNEW reputation
| fillnull value="unknown" reputation

# inputlookup — чтение таблицы напрямую
| inputlookup threat_intel.csv
| where country="RU"
```

### 6.3 Динамический lookup через API (Python script)

```python
# Скрипт для Splunk External Lookup
import sys
import csv

def lookup_virustotal(ip):
    import requests
    api_key = "YOUR_VT_API_KEY"
    url = f"https://www.virustotal.com/api/v3/ip_addresses/{ip}"
    headers = {"x-apikey": api_key}
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        malicious = data['data']['attributes']['last_analysis_stats']['malicious']
        return "malicious" if malicious > 5 else "clean"
    return "unknown"

# Читаем из stdin (Splunk передаёт CSV)
reader = csv.DictReader(sys.stdin)
fieldnames = reader.fieldnames + ['vt_reputation']
writer = csv.DictWriter(sys.stdout, fieldnames=fieldnames)
writer.writeheader()

for row in reader:
    row['vt_reputation'] = lookup_virustotal(row.get('src_ip', ''))
    writer.writerow(row)
```

### 6.4 KV Store Lookup

```spl
# Создание KV Store lookup через REST API
# POST /servicesNS/nobody/search/storage/collections/config
# {"name": "threat_ip_store"}

# Использование KV Store в SPL
index=web
| lookup threat_ip_store ip as src_ip OUTPUT threat_score
| where threat_score > 70

# Запись в KV Store
index=web status=404
| stats count as hit_count by src_ip
| where hit_count > 50
| outputlookup threat_ip_store
```

---

## 7. 🔍 Корреляционные запросы для детекции атак

### 7.1 Брутфорс Windows (Event ID 4625)

```spl
# Детекция брутфорса по Windows Auth
index=security sourcetype=WinEventLog EventCode=4625
| bucket span=5m _time
| stats count as failed_attempts, 
        dc(Account_Name) as unique_accounts,
        values(Account_Name) as accounts,
        values(Workstation_Name) as sources
  by _time, src_ip
| where failed_attempts > 20 OR unique_accounts > 5
| eval alert_type = case(
    unique_accounts > 5, "Password Spray",
    failed_attempts > 20, "Brute Force",
    true(), "Suspicious"
  )
| table _time, src_ip, alert_type, failed_attempts, unique_accounts, accounts
| sort -failed_attempts
```

### 7.2 Успешный вход после брутфорса (4625 → 4624)

```spl
# Подозрительный успешный вход после множества неудач
index=security (EventCode=4625 OR EventCode=4624)
| eval event_type = case(EventCode="4624", "success", EventCode="4625", "failure", true(), "unknown")
| stats 
    count(eval(event_type="failure")) as fail_count,
    count(eval(event_type="success")) as success_count,
    values(event_type) as event_types
  by Account_Name, src_ip
| where fail_count > 10 AND success_count > 0
| eval risk_score = fail_count * 2
| sort -risk_score
| table Account_Name, src_ip, fail_count, success_count, risk_score
```

### 7.3 Password Spray Attack

```spl
# Password spray: один IP, много учёток, мало попыток на каждую
index=security EventCode=4625
| bucket span=10m _time
| stats count as attempts, dc(Account_Name) as unique_users by _time, src_ip
| eval avg_attempts_per_user = round(attempts / unique_users, 2)
| where unique_users > 10 AND avg_attempts_per_user < 5
| eval attack_type = "Password Spray"
| table _time, src_ip, unique_users, attempts, avg_attempts_per_user, attack_type
```

### 7.4 DNS Tunneling Detection

```spl
# Детекция DNS tunneling по аномально длинным именам
index=dns
| eval query_length = len(query)
| eval subdomain_count = mvcount(split(query, "."))
| stats 
    count as query_count,
    avg(query_length) as avg_len,
    max(query_length) as max_len,
    dc(query) as unique_queries,
    values(record_type) as record_types
  by src_ip, domain
| where avg_len > 50 OR unique_queries > 100
| eval dns_tunnel_score = case(
    avg_len > 100, 90,
    avg_len > 70, 70,
    avg_len > 50, 50,
    unique_queries > 500, 85,
    unique_queries > 200, 60,
    true(), 30
  )
| where dns_tunnel_score > 50
| sort -dns_tunnel_score
| table src_ip, domain, query_count, avg_len, max_len, unique_queries, dns_tunnel_score
```

### 7.5 Lateral Movement (Pass-the-Hash)

```spl
# Детекция Pass-the-Hash: Logon Type 3 с NTLM аутентификацией
index=security EventCode=4624 Logon_Type=3 Authentication_Package=NTLM
| where NOT (src_ip="127.0.0.1" OR src_ip="::1")
| stats 
    count as connection_count,
    dc(ComputerName) as unique_targets,
    values(ComputerName) as targets
  by Account_Name, src_ip
| where unique_targets > 3
| eval lateral_movement_score = unique_targets * 10 + connection_count
| sort -lateral_movement_score
| table Account_Name, src_ip, unique_targets, targets, connection_count, lateral_movement_score
```

### 7.6 Обнаружение Kerberoasting

```spl
# Kerberoasting: множество TGS-запросов (Event 4769) с RC4 шифрованием
index=security EventCode=4769 Ticket_Encryption_Type=0x17
| stats 
    count as tgs_requests,
    dc(Service_Name) as unique_services,
    values(Service_Name) as services
  by Account_Name, Client_Address
| where tgs_requests > 5
| eval kerberoast_risk = case(
    unique_services > 10, "Critical",
    unique_services > 5, "High",
    tgs_requests > 10, "Medium",
    true(), "Low"
  )
| table Account_Name, Client_Address, tgs_requests, unique_services, kerberoast_risk
```

### 7.7 Beaconing Detection

```spl
# Детекция C2 beaconing: регулярные обращения к одному домену
index=web sourcetype=proxy
| bucket span=1h _time
| stats count as hourly_requests by _time, src_ip, domain
| streamstats window=24 stdev(hourly_requests) as stdev_req, avg(hourly_requests) as avg_req by src_ip, domain
| eval beacon_score = case(
    stdev_req < 2 AND avg_req > 1, (1 - stdev_req) * 100,
    true(), 0
  )
| where beacon_score > 50
| table src_ip, domain, avg_req, stdev_req, beacon_score
| sort -beacon_score
```

### 7.8 Web Scanning Detection

```spl
# Детекция веб-сканирования по количеству 404 ошибок
index=web sourcetype=access_combined status=404
| bucket span=5m _time
| stats 
    count as error_count,
    dc(uri_path) as unique_paths,
    values(uri_path) as paths,
    dc(user_agent) as unique_agents
  by _time, src_ip
| where error_count > 50 OR unique_paths > 30
| eval scan_type = case(
    unique_agents > 3, "Distributed Scan",
    error_count > 200, "Aggressive Scan",
    true(), "Standard Scan"
  )
| table _time, src_ip, scan_type, error_count, unique_paths, unique_agents
```

### 7.9 SQL Injection Detection

```spl
# Детекция попыток SQL инъекций в HTTP запросах
index=web sourcetype=access_combined
| where match(uri_query, "(?i)(union|select|insert|update|delete|drop|exec|declare|cast|convert|char|nchar|varchar|sys\.|information_schema)")
   OR match(uri_query, "(?i)('|--|;|/\*|\*/|xp_|sp_)")
| stats 
    count as sqli_attempts,
    dc(uri_path) as unique_endpoints,
    values(uri_query) as payloads
  by src_ip
| where sqli_attempts > 5
| eval severity = if(sqli_attempts > 50, "Critical", "High")
| table src_ip, sqli_attempts, unique_endpoints, severity, payloads
```

---

## 8. 📈 Дашборды Splunk

### 8.1 Типы визуализаций

| Тип | XML-тег | Использование |
|-----|---------|---------------|
| Line Chart | `<chart type="line">` | Тренды во времени |
| Bar Chart | `<chart type="bar">` | Сравнение категорий |
| Pie Chart | `<chart type="pie">` | Доля от целого |
| Table | `<table>` | Детальные данные |
| Single Value | `<single>` | KPI метрики |
| Map | `<map>` | Геолокация IP |
| Heatmap | `<viz type="heatmap">` | Матрицы активности |
| Bubble Chart | `<chart type="bubble">` | 3 измерения |

### 8.2 XML-структура дашборда

```xml
<dashboard version="1.1" theme="dark">
  <label>SOC Security Dashboard</label>
  <description>Мониторинг безопасности в реальном времени</description>
  
  <!-- Строка 1: Метрики (Single Value) -->
  <row>
    <panel>
      <title>Всего алертов (24ч)</title>
      <single>
        <search>
          <query>index=security earliest=-24h | stats count</query>
          <earliest>-24h</earliest>
          <latest>now</latest>
        </search>
        <option name="underLabel">Алертов</option>
        <option name="colorMode">block</option>
        <option name="rangeColors">["0x53A051","0xF8BE34","0xDC4E41"]</option>
        <option name="rangeValues">[0,100,500]</option>
      </single>
    </panel>
    
    <panel>
      <title>Критических инцидентов</title>
      <single>
        <search>
          <query>index=security severity=critical earliest=-24h | stats count</query>
        </search>
        <option name="underLabel">Критических</option>
        <option name="colorMode">block</option>
      </single>
    </panel>
    
    <panel>
      <title>Уникальных атакующих IP</title>
      <single>
        <search>
          <query>index=security action=blocked earliest=-24h | stats dc(src_ip) as count</query>
        </search>
        <option name="underLabel">Уникальных IP</option>
      </single>
    </panel>
  </row>

  <!-- Строка 2: График событий во времени -->
  <row>
    <panel>
      <title>События безопасности по времени</title>
      <chart>
        <search>
          <query>
            index=security earliest=-24h
            | timechart span=1h count by severity
          </query>
        </search>
        <option name="charting.chart">line</option>
        <option name="charting.legend.placement">right</option>
        <option name="charting.chart.showDataLabels">none</option>
        <option name="charting.axisY.scale">linear</option>
      </chart>
    </panel>
  </row>

  <!-- Строка 3: Топ атакующих и таблица последних алертов -->
  <row>
    <panel>
      <title>Топ-10 атакующих IP</title>
      <chart>
        <search>
          <query>
            index=security action=blocked earliest=-24h
            | stats count by src_ip
            | sort -count
            | head 10
          </query>
        </search>
        <option name="charting.chart">bar</option>
        <option name="charting.chart.orientation">horizontal</option>
      </chart>
    </panel>
    
    <panel>
      <title>Последние алерты</title>
      <table>
        <search>
          <query>
            index=security severity=high OR severity=critical earliest=-1h
            | table _time, severity, src_ip, dst_ip, alert_name, description
            | sort -_time
            | head 20
          </query>
        </search>
        <option name="drilldown">row</option>
        <option name="rowNumbers">true</option>
        <option name="count">20</option>
      </table>
    </panel>
  </row>

  <!-- Строка 4: Геокарта -->
  <row>
    <panel>
      <title>Географическое распределение угроз</title>
      <map>
        <search>
          <query>
            index=security action=blocked earliest=-24h
            | iplocation src_ip
            | geostats count by Country
          </query>
        </search>
        <option name="mapping.type">choropleth</option>
        <option name="mapping.choroplethLayer.colorMode">auto</option>
      </map>
    </panel>
  </row>
</dashboard>
```

### 8.3 Динамические входные параметры (Inputs)

```xml
<!-- Добавление фильтров в дашборд -->
<fieldset submitButton="false" autoRun="true">
  <input type="time" token="time_range">
    <label>Временной диапазон</label>
    <default>
      <earliest>-24h</earliest>
      <latest>now</latest>
    </default>
  </input>
  
  <input type="text" token="src_ip_filter">
    <label>IP-адрес источника</label>
    <default>*</default>
  </input>
  
  <input type="dropdown" token="severity_filter">
    <label>Уровень серьёзности</label>
    <choice value="*">Все</choice>
    <choice value="critical">Critical</choice>
    <choice value="high">High</choice>
    <choice value="medium">Medium</choice>
    <default>*</default>
  </input>
</fieldset>

<!-- Использование токенов в запросе -->
<query>
  index=security earliest=$time_range.earliest$ latest=$time_range.latest$
  src_ip=$src_ip_filter$ severity=$severity_filter$
  | stats count by src_ip, alert_name, severity
</query>
```

---

## 9. 🔔 Алерты Splunk

### 9.1 Создание алерта

Алерты в Splunk запускают scheduled search и выполняют действие при выполнении условия.

```xml
<!-- savedsearches.conf -->
[Brute Force Alert]
search = index=security EventCode=4625 | stats count by src_ip | where count > 20
cron_schedule = */5 * * * *
dispatch.earliest_time = -5m
dispatch.latest_time = now
alert.condition = search count > 0
alert.severity = 3
alert.suppress = 1
alert.suppress.fields = src_ip
alert.suppress.period = 30m
action.email = 1
action.email.to = soc@company.com
action.email.subject = [ALERT] Brute Force Detected from $result.src_ip$
action.webhook = 1
action.webhook.param.url = https://soar.company.com/api/alert
```

### 9.2 Типы условий алертов

```
Условия триггера алерта:
1. Number of Results > N     → если найдено > N результатов
2. Number of Results < N     → если найдено < N результатов  
3. Field value               → если поле > / < / = значению
4. Custom condition          → произвольный SPL-фильтр
```

### 9.3 Throttling алертов

Throttling предотвращает "шторм алертов" — тысячи одинаковых уведомлений.

```
Настройки throttling:
- Suppress for: 30 minutes / 1 hour / 4 hours
- Suppress by fields: src_ip, Account_Name, signature
```

```spl
# Пример алерта с throttling в SPL
index=security EventCode=4625
| stats count by src_ip
| where count > 10
# → Алерт: suppress by src_ip на 1 час
# Результат: один алерт на каждый атакующий IP за час
```

### 9.4 Действия алертов

| Действие | Описание | Конфигурация |
|----------|----------|--------------|
| Send Email | Отправка email с деталями | `action.email.to` |
| Webhook | HTTP POST на SOAR/Slack | `action.webhook.param.url` |
| Run Script | Запуск скрипта на Splunk | `action.script.filename` |
| Add to Triggered Alerts | Сохранить в истории алертов | По умолчанию |
| Create JIRA Ticket | Через Splunk Add-on | JIRA интеграция |
| Send to Slack | Уведомление в канал | Slack App for Splunk |

---

## 10. 🛡️ Splunk для SOC: типичные use-case запросы

### 10.1 Мониторинг привилегированных учётных записей

```spl
# Входы администраторов в нерабочее время
index=security EventCode=4624 
| where Account_Name IN ("Administrator", "admin", "root") 
  OR like(Account_Name, "%admin%") 
  OR like(Account_Name, "%svc%")
| eval hour = strftime(_time, "%H")
| eval day = strftime(_time, "%w")
| where (hour < "08" OR hour > "18") OR (day = "0" OR day = "6")
| table _time, Account_Name, src_ip, ComputerName
| sort -_time
```

### 10.2 Обнаружение новых сервисов (Lateral Movement via Services)

```spl
# Создание новых сервисов (Event 7045) — часто признак продвижения
index=system EventCode=7045
| stats count, values(ImagePath) as paths, first(_time) as first_seen by ServiceName, ComputerName
| where count = 1
| eval days_ago = round((now() - first_seen) / 86400, 1)
| where days_ago < 1
| table ComputerName, ServiceName, paths, first_seen
```

### 10.3 PowerShell Execution Monitoring

```spl
# Подозрительные PowerShell команды (Event 4104)
index=security EventCode=4104
| where match(ScriptBlockText, "(?i)(invoke-mimikatz|invoke-expression|iex|downloadstring|webclient|bypass|encodedcommand|-enc |-e )")
| rex field=ScriptBlockText "(?P<suspicious_cmd>(?i)(invoke-[a-z]+|iex\s*\(|downloadstring)[^\n]{0,200})"
| stats 
    count as executions,
    values(suspicious_cmd) as commands,
    dc(ComputerName) as affected_hosts
  by Account_Name
| where executions > 0
| sort -executions
```

### 10.4 Обнаружение Mimikatz

```spl
# Mimikatz-артефакты в логах
index=security (EventCode=4656 OR EventCode=4663 OR EventCode=10)
| where ObjectName LIKE "%lsass%"
| stats count by Account_Name, ComputerName, ObjectName
| where count > 0
| eval mimikatz_indicator = "LSASS Memory Access"
| table Account_Name, ComputerName, ObjectName, count, mimikatz_indicator
```

### 10.5 Детекция Exfiltration (большие исходящие соединения)

```spl
# Аномально большие исходящие передачи данных
index=network sourcetype=firewall action=allow direction=outbound
| stats sum(bytes_out) as total_bytes by src_ip, dst_ip, dst_port
| where total_bytes > 100000000  # > 100 MB
| eval total_mb = round(total_bytes / 1048576, 2)
| sort -total_bytes
| head 20
| table src_ip, dst_ip, dst_port, total_mb
```

### 10.6 Поиск по MITRE ATT&CK Technique

```spl
# T1059.001 - PowerShell
index=sysmon EventCode=1 (Image="*powershell.exe" OR Image="*pwsh.exe")
| where match(CommandLine, "(?i)(-enc|-e |bypass|hidden|noprofile|downloadstring)")
| stats count by ComputerName, User, CommandLine
| eval mitre_technique = "T1059.001 - PowerShell"
| table _time, ComputerName, User, CommandLine, mitre_technique
```

---

## 11. 🏆 CTF-задания и практические упражнения

### Задание 1: Boss of the SOC (BOTS) — Базовый уровень

**Сценарий:** Вы аналитик SOC. Зафиксирована аномальная активность. Ответьте на вопросы.

```spl
# Вопрос 1: Какой IP-адрес провёл сканирование веб-сервера?
index=botsv1 sourcetype=stream:http
| stats count as requests, dc(uri_path) as unique_paths by src_ip
| where requests > 500 AND unique_paths > 100
| sort -requests

# Вопрос 2: Какой User-Agent использовался при сканировании?
index=botsv1 sourcetype=stream:http src_ip="YOUR_SCANNER_IP"
| stats count by http_user_agent
| sort -count
| head 5

# Вопрос 3: Какой эксплойт был использован?
index=botsv1 sourcetype=stream:http
| where match(uri_path, "(?i)(\.php|\.asp|\.jsp)") AND status=200
| rex field=form_data "(?P<payload>[a-zA-Z0-9+/]{30,}={0,2})"
| table _time, src_ip, uri_path, payload
```

### Задание 2: Написать SPL для детекции атак

**Задача A:** Написать запрос для детекции Golden Ticket атаки.

```spl
# Golden Ticket: Event 4769 с нехарактерными параметрами
# Подсказка: Ticket Lifetime 0, Encryption 0x17 (RC4)
index=security EventCode=4769
| where Ticket_Options="0x40810000" 
  AND Ticket_Encryption_Type="0x17"
  AND Account_Domain!="YOUR_DOMAIN"
| stats count, values(Service_Name) as services by Account_Name, Client_Address
| table _time, Account_Name, Client_Address, services, count

# РЕШЕНИЕ (полное):
index=security EventCode=4769 Failure_Code=0x0
| eval is_rc4 = if(Ticket_Encryption_Type="0x17", 1, 0)
| eval anomalous_domain = if(Account_Domain!="YOURDOMAIN.COM", 1, 0)
| where is_rc4=1 AND anomalous_domain=1
| stats count, 
        values(Service_Name) as services,
        values(Client_Address) as source_ips
  by Account_Name
| eval golden_ticket_score = count * 10 + mvcount(services) * 5
| sort -golden_ticket_score
```

**Задача B:** DCSync Detection (репликация с контроллера домена)

```spl
# DCSync: Event 4662 с правами DS-Replication-Get-Changes-All
index=security EventCode=4662
| where Properties="{1131f6ad-9c07-11d1-f79f-00c04fc2dcd2}" 
   OR Properties="{1131f6aa-9c07-11d1-f79f-00c04fc2dcd2}"
| where NOT (Account_Name LIKE "%$" OR Account_Name IN ("MSOL_*"))
| stats count, values(ObjectName) as objects by Account_Name, SubjectLogonId
| where count > 0
| eval dcsync_alert = "DCSync Attack Detected"
| table Account_Name, SubjectLogonId, objects, count, dcsync_alert
```

### Задание 3: Самостоятельная работа

**Условие задачи:**

Имеется набор логов за 24 часа. Аномалии:
1. В 03:15 зафиксировано 847 неудачных попыток входа на хост DC01 от IP 45.33.32.156
2. В 03:47 один успешный вход под учёткой `svc_backup`
3. В 04:02 создан новый сервис `WindowsUpdateHelper` на DC01
4. В 04:15 скопировано 2.3 ГБ данных на внешний IP 104.21.18.99

**Задания:**
1. Напишите SPL для обнаружения каждого из 4 событий
2. Создайте корреляционный запрос, который обнаруживает всю цепочку
3. Определите тактики MITRE ATT&CK для каждого шага

```spl
# Коррелятор: полная цепочка атаки
# Шаг 1: Брутфорс
index=security EventCode=4625 ComputerName=DC01
| bucket span=10m _time
| stats count as bruteforce_attempts by _time, src_ip
| where bruteforce_attempts > 50
| eval stage = "1-BruteForce"

# Шаг 2: Успешный вход
| append [
  search index=security EventCode=4624 ComputerName=DC01 Account_Name=svc_backup
  | eval stage = "2-SuccessfulLogin"
  | table _time, src_ip, Account_Name, stage
]

# Продолжение корреляции...
# (Это шаблон — реализацию оставляем студенту)
```

---

## 12. 📝 Шпаргалка по SPL

```spl
# ===== ПОИСК =====
index=X sourcetype=Y key=value          # базовый поиск
index=X NOT (key=value)                  # исключение
index=X key=value*                       # wildcard
index=X key IN ("a","b","c")             # список значений

# ===== ПРЕОБРАЗОВАНИЕ =====
| fields field1, field2                   # выбор полей
| fields - field_to_remove               # удаление поля
| rename old_name as new_name            # переименование
| eval new_field = expression            # новое поле
| rex field=F "(?P<name>pattern)"        # regex extraction
| where condition                         # фильтрация

# ===== АГРЕГАЦИЯ =====
| stats count by field                   # подсчёт по группе
| stats count, avg(F), max(F) by G       # несколько метрик
| timechart span=1h count by field       # тренд во времени
| chart count by field1, field2          # матрица

# ===== ОБОГАЩЕНИЕ =====
| lookup table_name key OUTPUT field1    # lookup
| iplocation src_ip                      # геолокация IP
| lookup dnslookup clientip as src_ip    # DNS lookup

# ===== СОРТИРОВКА И ОГРАНИЧЕНИЕ =====
| sort -count                            # сортировка по убыванию
| sort +_time                            # сортировка по возрастанию
| head 10                                # первые 10
| tail 5                                 # последние 5
| dedup field                            # удаление дублей

# ===== ФОРМАТИРОВАНИЕ =====
| table field1, field2, field3           # таблица
| transpose                              # транспонирование
| untable field1 field2 value            # «расплавить» таблицу

# ===== УТИЛИТЫ =====
| makeresults count=10                   # создать тестовые данные
| gentimes start=-7d                     # генерация временных меток
| map search="search ..."               # foreach-паттерн
| sendalert "Alert Name"                 # программный триггер
```

---

## ✅ Итоги главы

В этой главе мы изучили:

| Тема | Ключевые концепции |
|------|-------------------|
| Архитектура Splunk | Indexer, Search Head, Forwarder, HEC |
| SPL Синтаксис | Pipeline, поля, временные диапазоны |
| Базовые команды | stats, table, fields, where, eval, rex |
| Агрегации | count, avg, max, min, sum, dc, values |
| chart vs timechart | Матрицы vs тренды во времени |
| transaction | Группировка событий в сессии |
| lookup | Обогащение данными из таблиц |
| Детекция атак | BruteForce, DNS Tunnel, Lateral Movement |
| Дашборды | XML-структура, визуализации, токены |
| Алерты | Условия, throttling, действия |

---

## 🔗 Дополнительные ресурсы

- [Splunk Search Reference](https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual)
- [Splunk Quick Reference Guide (PDF)](https://www.splunk.com/pdfs/solution-guides/splunk-quick-reference-guide.pdf)
- [Boss of the SOC (BOTS) CTF](https://bots.splunk.com/)
- [Splunk Security Essentials App](https://splunkbase.splunk.com/app/3435/)
- [MITRE ATT&CK Splunk Queries](https://github.com/splunk/security_content)
- [Splunk Training: Fundamentals 1](https://www.splunk.com/en_us/training/free-courses/splunk-fundamentals-1.html)

