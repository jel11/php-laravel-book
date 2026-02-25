# Глава 6.3: ELK Stack и Wazuh: open-source SIEM

## 🎯 Цели главы

- Понять архитектуру ELK Stack и роль каждого компонента
- Настроить pipeline Logstash с grok-паттернами
- Научиться работать с KQL (Kibana Query Language)
- Освоить Wazuh: архитектуру, правила, active response
- Сравнить Splunk, ELK и Wazuh по ключевым параметрам
- Развернуть учебный SIEM в домашней лаборатории

---

## 1. 🏗️ ELK Stack: архитектура

ELK Stack — это три open-source проекта от Elastic:
- **E**lasticsearch — поисковый и аналитический движок
- **L**ogstash — конвейер обработки данных
- **K**ibana — веб-интерфейс для визуализации

Современное название — **Elastic Stack** (добавлены Beats, APM, Fleet).

### 1.1 Полная архитектура Elastic Stack

```
┌──────────────────────────────────────────────────────────────────┐
│                        ИСТОЧНИКИ ДАННЫХ                          │
│  Linux Servers │ Windows Hosts │ Firewalls │ Network Devices      │
└────────────────────────┬─────────────────────────────────────────┘
                         │
           ┌─────────────┼─────────────────┐
           │             │                 │
   ┌───────▼──────┐ ┌────▼──────┐  ┌──────▼──────┐
   │  Filebeat    │ │Metricbeat │  │  Auditbeat  │
   │  (Logs)      │ │ (Metrics) │  │  (Audit)    │
   └───────┬──────┘ └────┬──────┘  └──────┬──────┘
           │             │                │
           └─────────────┴────────────────┘
                         │
                  ┌──────▼──────┐
                  │  Logstash   │
                  │  Pipeline   │
                  │ Input→Filter│
                  │ →Output     │
                  └──────┬──────┘
                         │
                  ┌──────▼──────┐
                  │Elasticsearch│
                  │  Cluster    │
                  │ (Indexing & │
                  │  Storage)   │
                  └──────┬──────┘
                         │
                  ┌──────▼──────┐
                  │   Kibana    │
                  │  Dashboard  │
                  │  Discover   │
                  │  Alerts     │
                  └─────────────┘
```

---

## 2. 🔍 Elasticsearch: индексы, маппинги, API

### 2.1 Основные концепции

| Концепция | SQL аналог | Описание |
|-----------|------------|----------|
| **Index** | Database | Коллекция документов одного типа |
| **Document** | Row | Единица данных в формате JSON |
| **Field** | Column | Поле документа |
| **Mapping** | Schema | Описание структуры и типов полей |
| **Shard** | Partition | Часть индекса для параллельной обработки |
| **Replica** | Replica | Копия шарда для отказоустойчивости |
| **Node** | Server | Экземпляр Elasticsearch |
| **Cluster** | Cluster | Группа нод |

### 2.2 Типы данных Elasticsearch

```json
{
  "mappings": {
    "properties": {
      "@timestamp":    { "type": "date" },
      "src_ip":        { "type": "ip" },
      "message":       { "type": "text", "analyzer": "standard" },
      "event_code":    { "type": "keyword" },
      "bytes":         { "type": "long" },
      "latitude":      { "type": "float" },
      "geo_point":     { "type": "geo_point" },
      "is_malicious":  { "type": "boolean" },
      "tags":          { "type": "keyword" }
    }
  }
}
```

**Разница text vs keyword:**
- `text` — анализируется и токенизируется, используется для full-text search
- `keyword` — точное совпадение, используется для фильтрации, агрегации, сортировки

### 2.3 REST API Elasticsearch

```bash
# Проверка состояния кластера
curl -X GET "localhost:9200/_cluster/health?pretty"

# Список индексов
curl -X GET "localhost:9200/_cat/indices?v&s=store.size:desc"

# Создание индекса с маппингом
curl -X PUT "localhost:9200/security-logs-2024.01" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  },
  "mappings": {
    "properties": {
      "@timestamp":  { "type": "date" },
      "src_ip":      { "type": "ip" },
      "event_type":  { "type": "keyword" },
      "message":     { "type": "text" },
      "bytes":       { "type": "long" }
    }
  }
}'

# Добавить документ
curl -X POST "localhost:9200/security-logs-2024.01/_doc/" -H 'Content-Type: application/json' -d'
{
  "@timestamp": "2024-01-15T10:30:00Z",
  "src_ip": "192.168.1.100",
  "event_type": "authentication_failure",
  "message": "Failed login attempt for user admin",
  "bytes": 450
}'

# Поиск документов
curl -X GET "localhost:9200/security-logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        { "term": { "event_type": "authentication_failure" } }
      ],
      "filter": [
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ]
    }
  },
  "aggs": {
    "by_src_ip": {
      "terms": {
        "field": "src_ip",
        "size": 10
      }
    }
  },
  "size": 0
}'

# Удаление по запросу
curl -X POST "localhost:9200/security-logs-*/_delete_by_query" -H 'Content-Type: application/json' -d'
{
  "query": {
    "range": {
      "@timestamp": { "lt": "now-90d" }
    }
  }
}'
```

### 2.4 Query DSL для аналитики безопасности

```json
// Поиск брутфорс-атак: >10 неудачных входов с одного IP за 5 минут
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "event.outcome": "failure" } },
        { "term": { "event.category": "authentication" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ]
    }
  },
  "aggs": {
    "by_source_ip": {
      "terms": {
        "field": "source.ip",
        "size": 100
      },
      "aggs": {
        "failed_attempts": {
          "value_count": {
            "field": "@timestamp"
          }
        },
        "time_bucket": {
          "date_histogram": {
            "field": "@timestamp",
            "fixed_interval": "5m"
          }
        }
      }
    }
  }
}
```

### 2.5 Index Lifecycle Management (ILM)

```json
// Политика управления жизненным циклом индексов
PUT _ilm/policy/security_logs_policy
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_size": "50gb",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": { "number_of_shards": 1 },
          "forcemerge": { "max_num_segments": 1 }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "freeze": {}
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

---

## 3. 🔧 Logstash: Pipeline и обработка данных

### 3.1 Архитектура Pipeline

```
Data Flow в Logstash:

Input Plugin          Filter Plugin         Output Plugin
┌───────────┐        ┌───────────────┐      ┌───────────────┐
│  file     │        │  grok         │      │elasticsearch  │
│  beats    │   →    │  mutate       │  →   │  kafka        │
│  syslog   │        │  date         │      │  file         │
│  kafka    │        │  geoip        │      │  stdout       │
│  http     │        │  useragent    │      │  s3           │
└───────────┘        └───────────────┘      └───────────────┘
```

### 3.2 Базовая конфигурация Logstash

```ruby
# /etc/logstash/conf.d/security.conf

input {
  beats {
    port => 5044
    ssl => true
    ssl_certificate => "/etc/logstash/certs/logstash.crt"
    ssl_key => "/etc/logstash/certs/logstash.key"
  }
  
  tcp {
    port => 5514
    codec => json_lines
    type => "syslog_tcp"
  }
  
  udp {
    port => 514
    type => "syslog_udp"
  }
}

filter {
  # Маршрутизация по типу источника
  if [type] == "apache_access" {
    grok {
      match => {
        "message" => "%{COMBINEDAPACHELOG}"
      }
    }
    date {
      match => ["timestamp", "dd/MMM/yyyy:HH:mm:ss Z"]
      target => "@timestamp"
    }
    geoip {
      source => "clientip"
      target => "geoip"
    }
    useragent {
      source => "agent"
      target => "user_agent"
    }
    mutate {
      convert => {
        "bytes" => "integer"
        "response" => "integer"
      }
      add_field => {
        "log_type" => "web_access"
        "[@metadata][index_prefix]" => "web-access"
      }
    }
  }
  
  # Удаление служебных полей Beats
  mutate {
    remove_field => ["beat", "host", "input", "agent", "log", "ecs"]
  }
}

output {
  elasticsearch {
    hosts => ["https://elasticsearch:9200"]
    user => "logstash_writer"
    password => "${ELASTIC_PASSWORD}"
    index => "%{[@metadata][index_prefix]}-%{+YYYY.MM.dd}"
    template_name => "security_logs"
    template => "/etc/logstash/templates/security.json"
    template_overwrite => false
    ssl => true
    cacert => "/etc/logstash/certs/ca.crt"
  }
  
  # Дублирование критичных событий
  if [severity] == "critical" {
    http {
      url => "https://soar.company.com/api/events"
      http_method => "post"
      format => "json"
    }
  }
}
```

### 3.3 Grok-паттерны

Grok — это механизм разбора неструктурированных логов на основе именованных регулярных выражений.

```ruby
# Встроенные grok-паттерны
%{IP:src_ip}                    # → src_ip: "192.168.1.1"
%{INT:port}                     # → port: "443"
%{NUMBER:bytes}                 # → bytes: "1234"
%{WORD:method}                  # → method: "GET"
%{URIPATH:uri_path}             # → uri_path: "/admin/login"
%{GREEDYDATA:message}           # → message: всё остальное
%{TIMESTAMP_ISO8601:timestamp}  # → timestamp: "2024-01-15T10:30:00+03:00"

# Apache Combined Log
COMBINEDAPACHELOG:
%{IPORHOST:clientip} %{USER:ident} %{USER:auth} \[%{HTTPDATE:timestamp}\] 
"%{WORD:verb} %{NOTSPACE:request}(?: HTTP/%{NUMBER:httpversion})?" 
%{NUMBER:response} (?:%{NUMBER:bytes}|-) 
"(?:%{URI:referrer}|-)" %{QS:agent}

# Windows Syslog (pfSense firewall log)
%{SYSLOGTIMESTAMP:timestamp} %{SYSLOGHOST:hostname} filterlog: 
%{NUMBER:rulenumber},%{NUMBER:subrulenumber},,%{NUMBER:anchor},%{WORD:interface},
%{WORD:reason},%{WORD:action},%{WORD:direction},%{NUMBER:ip_version},
```

**Создание кастомных grok-паттернов:**

```ruby
# /etc/logstash/patterns/custom_patterns

# Кастомный паттерн для Cisco ASA
CISCO_ASA_TIMESTAMP %{MONTH} %{MONTHDAY} %{YEAR} %{TIME}
CISCO_ASA_MSG %%{WORD:facility}-%{INT:severity_level}-%{WORD:mnemonic}
CISCO_ASA_ACTION (Built|Teardown|Deny|Permit)

# Паттерн для Windows Security Event Log
WIN_DOMAIN (?:[A-Z][A-Z0-9-]*)?
WIN_SID S-\d+-\d+(-\d+){1,14}

# Конфигурация Logstash с кастомными паттернами
filter {
  grok {
    patterns_dir => ["/etc/logstash/patterns"]
    match => {
      "message" => "%{CISCO_ASA_TIMESTAMP:timestamp} : %{CISCO_ASA_MSG} : %{CISCO_ASA_ACTION:action}"
    }
  }
}
```

### 3.4 Полный pipeline для Windows Event Logs

```ruby
# Windows Event Log pipeline
filter {
  if [winlog][channel] == "Security" {
    
    # Извлечение Event ID
    mutate {
      add_field => { "event_id" => "%{[winlog][event_id]}" }
    }
    
    # Обработка по Event ID
    if [winlog][event_id] == 4625 {
      # Failed Logon
      mutate {
        add_field => {
          "event_category" => "authentication"
          "event_outcome" => "failure"
          "event_action" => "logon"
          "alert_level" => "medium"
        }
      }
      
      # Извлечение полей из UserData
      mutate {
        copy => {
          "[winlog][event_data][SubjectUserName]" => "user_name"
          "[winlog][event_data][IpAddress]" => "source_ip"
          "[winlog][event_data][LogonType]" => "logon_type"
          "[winlog][event_data][FailureReason]" => "failure_reason"
        }
      }
    }
    
    if [winlog][event_id] == 4688 {
      # Process Creation
      mutate {
        add_field => {
          "event_category" => "process"
          "event_action" => "process_created"
        }
        copy => {
          "[winlog][event_data][NewProcessName]" => "process_path"
          "[winlog][event_data][CommandLine]" => "command_line"
          "[winlog][event_data][ParentProcessName]" => "parent_process"
        }
      }
      
      # Детекция подозрительных процессов
      if [command_line] =~ /(?i)(mimikatz|powershell.*-enc|cmd.*\/c.*echo|certutil.*-decode)/ {
        mutate {
          add_field => {
            "alert_level" => "high"
            "alert_type" => "suspicious_process"
          }
        }
      }
    }
  }
}
```

---

## 4. 📊 Kibana: Discover, Visualize, Dashboard

### 4.1 Kibana Discover

Discover — основной интерфейс для исследования данных в реальном времени.

```
Kibana Discover Interface:
┌──────────────────────────────────────────────────────────┐
│ [Search Bar: KQL Query]                    [Time Range]  │
├──────────────────────────────────────────────────────────┤
│ Available Fields │         Document List                  │
│                  │                                       │
│ @timestamp       │ 2024-01-15 10:30:01  src_ip: 1.2.3.4 │
│ src_ip           │ event_type: auth_failure              │
│ event_type       │ message: Failed login for admin       │
│ message          │                                       │
│ bytes            │ 2024-01-15 10:30:05  src_ip: 1.2.3.4 │
│ geo.country_name │ ...                                   │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Kibana Lens — современная визуализация

Lens — drag-and-drop интерфейс для создания визуализаций без знания Elasticsearch Query DSL.

```
Типы визуализаций в Kibana Lens:
- Bar chart horizontal/vertical
- Line chart
- Area chart
- Pie chart / Donut chart
- Metric (single value)
- Data table
- Heatmap
- Treemap
- Waffle chart
- Gauge / Goal
- Mosaic
```

### 4.3 TSVB (Time Series Visual Builder)

```json
// Конфигурация TSVB для мониторинга Failed Logins per minute
{
  "time_field": "@timestamp",
  "interval": "1m",
  "series": [
    {
      "id": "failed_logins",
      "label": "Failed Logins",
      "metrics": [
        {
          "id": "count",
          "type": "count"
        }
      ],
      "filter": {
        "query": "event.outcome: failure AND event.category: authentication",
        "language": "kuery"
      },
      "color": "#FF0000"
    },
    {
      "id": "successful_logins",
      "label": "Successful Logins",
      "metrics": [
        {
          "id": "count",
          "type": "count"
        }
      ],
      "filter": {
        "query": "event.outcome: success AND event.category: authentication",
        "language": "kuery"
      },
      "color": "#00CC00"
    }
  ]
}
```

---

## 5. 🔎 KQL (Kibana Query Language)

### 5.1 Базовый синтаксис KQL

```kql
# Поиск по значению поля (точное совпадение для keyword)
event.outcome: "failure"

# Поиск с wildcard
user.name: admin*

# Поиск фразы в text-поле
message: "failed login"

# Числовые диапазоны
http.response.status_code >= 400 and http.response.status_code < 500

# Диапазон (краткий синтаксис)
network.bytes > 1000000

# Логические операторы
event.outcome: "failure" and source.ip: "192.168.1.*"
event.outcome: "failure" or event.outcome: "unknown"
not event.outcome: "success"

# Группировка
(event.category: "authentication" and event.outcome: "failure") and not user.name: "service_*"

# Вложенные поля
user.entity_id: "12345" and process.name: "powershell.exe"

# Wildcard в значении
process.command_line: *mimikatz*

# exists: проверка наличия поля
source.ip: *

# Поиск по нескольким значениям (OR)
event.code: (4625 or 4648 or 4740)
```

### 5.2 Продвинутые KQL-запросы

```kql
# Брутфорс SSH (Wazuh / Filebeat)
rule.description: "sshd*" and event.outcome: "failure" and source.ip: *

# Обнаружение Nmap сканирования
network.transport: tcp and event.outcome: "failure" and destination.port > 0

# Подозрительные PowerShell команды
process.name: "powershell.exe" and process.command_line: (*-encodedcommand* or *-enc* or *downloadstring* or *invoke-expression*)

# Создание новых пользователей (Windows)
winlog.event_id: 4720

# Изменение привилегий
winlog.event_id: (4728 or 4732 or 4756) and winlog.event_data.GroupName: "Administrators"

# DNS запросы к TLD-зонам (не .com/.net/.org)
dns.question.name: (* and not *.com and not *.net and not *.org and not *.ru)

# Большие исходящие соединения
network.direction: "outbound" and network.bytes > 10485760

# Новые процессы от explorer.exe (пользовательская активность)
process.parent.name: "explorer.exe" and process.name: (cmd.exe or powershell.exe or wscript.exe or cscript.exe)
```

---

## 6. 📦 Beats: агенты сбора данных

### 6.1 Filebeat

```yaml
# /etc/filebeat/filebeat.yml

filebeat.inputs:
  # Сбор системных логов Linux
  - type: log
    enabled: true
    paths:
      - /var/log/auth.log
      - /var/log/syslog
      - /var/log/kern.log
    multiline.pattern: '^\d{4}-\d{2}-\d{2}'
    multiline.negate: true
    multiline.match: after
    fields:
      log_type: linux_system
    fields_under_root: true
  
  # Apache access logs
  - type: log
    enabled: true
    paths:
      - /var/log/apache2/access.log
    fields:
      log_type: apache_access

# Включение модулей
filebeat.modules:
  - module: system
    syslog:
      enabled: true
    auth:
      enabled: true
  
  - module: apache
    access:
      enabled: true
      var.paths: ["/var/log/apache2/access.log*"]
    error:
      enabled: true

processors:
  - add_host_metadata:
      when.not.contains.tags: forwarded
  - add_cloud_metadata: ~
  - add_docker_metadata: ~
  - decode_json_fields:
      fields: ["message"]
      target: "json"
      overwrite_keys: true
      when:
        regexp:
          message: '^\{'

output.logstash:
  hosts: ["logstash:5044"]
  ssl.certificate_authorities: ["/etc/filebeat/certs/ca.crt"]
  ssl.certificate: "/etc/filebeat/certs/filebeat.crt"
  ssl.key: "/etc/filebeat/certs/filebeat.key"
```

### 6.2 Auditbeat (Linux Audit Framework)

```yaml
# /etc/auditbeat/auditbeat.yml

auditbeat.modules:
  # Мониторинг файлов (File Integrity Monitoring)
  - module: file_integrity
    paths:
      - /etc/passwd
      - /etc/shadow
      - /etc/sudoers
      - /etc/ssh/sshd_config
      - /var/www/html
      - /usr/bin
      - /usr/sbin
    scan_at_start: true
    scan_rate_per_sec: 50 MiB
    max_file_size: 100 MiB
    hash_types: [sha256]
    recursive: false
  
  # Системные вызовы через auditd
  - module: auditd
    audit_rules: |
      ## Мониторинг привилегированных команд
      -a always,exit -F arch=b64 -S execve -F euid=0 -k root_commands
      ## Изменения /etc/passwd
      -w /etc/passwd -p wa -k identity
      ## Использование sudo
      -w /usr/bin/sudo -p x -k sudo_usage
      ## Изменения сетевой конфигурации
      -a always,exit -F arch=b64 -S sethostname,setdomainname -k system-locale
      ## Попытки изменить время
      -a always,exit -F arch=b64 -S adjtimex,settimeofday -k time-change
  
  # Мониторинг системных пользователей
  - module: system
    state.period: 12h
    user.detect_password_changes: true
    login.wtmp_file_pattern: /var/log/wtmp*
    login.btmp_file_pattern: /var/log/btmp*
    datasets:
      - host
      - login
      - package
      - process
      - socket
      - user
```

### 6.3 Packetbeat (Network Traffic Analysis)

```yaml
# /etc/packetbeat/packetbeat.yml

packetbeat.interfaces.device: any

packetbeat.protocols:
  - type: dns
    ports: [53]
    include_authorities: true
    include_additionals: true
  
  - type: http
    ports: [80, 8080, 8000, 5000, 8002]
    send_headers: ["User-Agent", "Cookie", "X-Real-IP"]
    send_request: true
    send_response: false
    max_message_size: 10485760
  
  - type: tls
    ports: [443, 993, 995, 5223, 8443, 8883, 9243]
    send_certificates: true
    include_raw_certificates: false
  
  - type: mysql
    ports: [3306]
    max_rows: 10
    max_row_length: 1024

packetbeat.flows:
  timeout: 30s
  period: 10s
```

---

## 7. 🛡️ Wazuh: open-source XDR/SIEM

### 7.1 Архитектура Wazuh

```
┌─────────────────────────────────────────────────────────────────┐
│                     АРХИТЕКТУРА WAZUH                           │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │  Wazuh Agent  │  │  Wazuh Agent  │  │  Wazuh Agent  │        │
│  │  (Linux)      │  │  (Windows)    │  │  (Docker)     │        │
│  │               │  │               │  │               │        │
│  │ - Log Monitor │  │ - Log Monitor │  │ - Container   │        │
│  │ - FIM         │  │ - FIM         │  │   Monitoring  │        │
│  │ - Rootkit Det │  │ - Security    │  │               │        │
│  │ - SCA         │  │   Events      │  │               │        │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘        │
│          │                  │                  │                 │
│          └──────────────────┴──────────────────┘                 │
│                             │ (Encrypted, TCP 1514)              │
│                      ┌──────▼──────┐                             │
│                      │Wazuh Manager│                             │
│                      │             │                             │
│                      │ - Ruleset   │                             │
│                      │ - Decoder   │                             │
│                      │ - Alerts    │                             │
│                      │ - Active    │                             │
│                      │   Response  │                             │
│                      └──────┬──────┘                             │
│                             │                                    │
│               ┌─────────────┴────────────┐                       │
│               │                          │                       │
│       ┌───────▼──────┐          ┌────────▼─────┐                 │
│       │Elasticsearch  │          │   Kibana     │                 │
│       │ (Wazuh Index)│          │ (Wazuh App)  │                 │
│       └──────────────┘          └──────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Установка Wazuh All-in-One

```bash
# Установка Wazuh All-in-One (Manager + Elasticsearch + Kibana)
curl -sO https://packages.wazuh.com/4.7/wazuh-install.sh
curl -sO https://packages.wazuh.com/4.7/config.yml

# Генерация конфигурации
bash wazuh-install.sh --generate-config-files

# Установка Wazuh indexer (Elasticsearch)
bash wazuh-install.sh --wazuh-indexer node-1

# Инициализация кластера
bash wazuh-install.sh --start-cluster

# Установка Wazuh server (Manager)
bash wazuh-install.sh --wazuh-server wazuh-1

# Установка Wazuh dashboard (Kibana)
bash wazuh-install.sh --wazuh-dashboard dashboard

# Извлечение паролей
bash wazuh-install.sh --extract-admin-password -f wazuh-passwords.txt

# Добавление агента
# На Manager:
/var/ossec/bin/manage_agents

# На агенте (Linux):
curl -s https://packages.wazuh.com/4.x/apt/KEY.gpg | apt-key add -
echo "deb https://packages.wazuh.com/4.x/apt/ stable main" | tee /etc/apt/sources.list.d/wazuh.list
apt-get update && apt-get install wazuh-agent
WAZUH_MANAGER="10.0.0.2" systemctl start wazuh-agent
```

### 7.3 Wazuh правила: XML формат

```xml
<!-- /var/ossec/etc/rules/local_rules.xml -->

<group name="syslog,authentication,">

  <!-- Базовое правило: неудачный вход SSH -->
  <rule id="100001" level="5">
    <if_group>authentication_failed</if_group>
    <description>SSH Authentication Failure</description>
    <group>authentication_failed,pci_dss_10.2.4,pci_dss_10.2.5,</group>
  </rule>

  <!-- Брутфорс: 8+ неудач от одного IP за 2 минуты -->
  <rule id="100002" level="10" frequency="8" timeframe="120">
    <if_matched_sid>100001</if_matched_sid>
    <same_source_ip />
    <description>SSH Brute Force Attack: Multiple failures from same IP</description>
    <group>attack,brute_force,pci_dss_11.4,</group>
    <options>no_full_log</options>
  </rule>

  <!-- Password spray: разные пользователи от одного IP -->
  <rule id="100003" level="12" frequency="10" timeframe="300">
    <if_matched_sid>100001</if_matched_sid>
    <same_source_ip />
    <different_user />
    <description>Password Spray Attack Detected</description>
    <group>attack,password_spray,</group>
    <mitre>
      <id>T1110.003</id>
    </mitre>
  </rule>

</group>

<!-- Правила для детекции веб-атак -->
<group name="web,nginx,apache,">

  <rule id="100010" level="6">
    <if_sid>31100</if_sid>  <!-- apache access log rule -->
    <url>/../|/..|/etc/passwd|/etc/shadow|/bin/bash</url>
    <description>Directory traversal attack detected</description>
    <group>attack,directory_traversal,</group>
    <mitre>
      <id>T1055</id>
    </mitre>
  </rule>

  <rule id="100011" level="7">
    <if_sid>31100</if_sid>
    <url>union%20select|UNION%20SELECT|union+select|UNION+SELECT</url>
    <description>SQL Injection attempt detected</description>
    <group>attack,sql_injection,</group>
    <mitre>
      <id>T1190</id>
    </mitre>
  </rule>

  <!-- Частые 404 (сканирование) -->
  <rule id="100012" level="8" frequency="30" timeframe="60">
    <if_sid>31105</if_sid>  <!-- 404 error -->
    <same_source_ip />
    <description>Web Scanner: Excessive 404 errors from single IP</description>
    <group>attack,web_scan,</group>
  </rule>

</group>

<!-- File Integrity Monitoring -->
<group name="ossec,syscheck,">

  <rule id="100020" level="12">
    <if_sid>554</if_sid>  <!-- File added -->
    <field name="file">/etc/passwd|/etc/shadow|/etc/sudoers</field>
    <description>Critical system file modified: $(file)</description>
    <group>syscheck,critical_file_change,</group>
  </rule>

  <rule id="100021" level="14">
    <if_sid>554</if_sid>
    <field name="file">/var/www/html</field>
    <description>Web content modified: $(file) - Possible defacement</description>
    <group>syscheck,web_defacement,</group>
  </rule>

</group>
```

### 7.4 Уровни серьёзности Wazuh

| Уровень | Название | Описание | Пример |
|---------|----------|----------|--------|
| 0 | Ignored | Игнорируемые события | Heartbeat |
| 1 | None | Без действия | Информационные |
| 2-3 | System low | Системные события | Успешный вход |
| 4-6 | Low | Низкий приоритет | Одна неудача входа |
| 7-9 | Medium | Средний приоритет | Несколько неудач |
| 10-11 | High | Высокий приоритет | Брутфорс, сканирование |
| 12-14 | Alert | Требует внимания | Атака, изменение критфайла |
| 15 | Critical | Критический | Компрометация системы |

### 7.5 Active Response

```xml
<!-- /var/ossec/etc/ossec.conf -->
<ossec_config>
  
  <!-- Определение команды active response -->
  <command>
    <name>firewall-drop</name>
    <executable>firewall-drop</executable>
    <timeout_allowed>yes</timeout_allowed>
  </command>

  <command>
    <name>disable-account</name>
    <executable>disable-account</executable>
    <timeout_allowed>no</timeout_allowed>
  </command>

  <!-- Привязка команды к правилу -->
  <active-response>
    <!-- Блокировка IP при брутфорсе (правило 100002) -->
    <command>firewall-drop</command>
    <location>local</location>
    <rules_id>100002</rules_id>
    <timeout>600</timeout>  <!-- Блокировка на 10 минут -->
  </active-response>

  <active-response>
    <!-- Блокировка на всех агентах при критической атаке -->
    <command>firewall-drop</command>
    <location>all</location>
    <rules_id>100003</rules_id>  <!-- Password spray -->
    <timeout>3600</timeout>  <!-- Блокировка на 1 час -->
  </active-response>

</ossec_config>
```

```bash
# Скрипт active response: /var/ossec/active-response/bin/firewall-drop
#!/bin/bash
# Параметры: action src_ip user alert_id rule_id agent_id timestamp

ACTION=$1
SRC_IP=$2

case "$ACTION" in
  "add")
    iptables -I INPUT -s "$SRC_IP" -j DROP
    iptables -I FORWARD -s "$SRC_IP" -j DROP
    logger -t wazuh-ar "BLOCKED IP: $SRC_IP"
    ;;
  "delete")
    iptables -D INPUT -s "$SRC_IP" -j DROP
    iptables -D FORWARD -s "$SRC_IP" -j DROP
    logger -t wazuh-ar "UNBLOCKED IP: $SRC_IP"
    ;;
esac
```

### 7.6 Wazuh: Rootkit Detection

```bash
# Wazuh использует rootcheck для обнаружения руткитов
# Конфигурация в ossec.conf:

<rootcheck>
  <disabled>no</disabled>
  <check_unixaudit>yes</check_unixaudit>
  <check_files>yes</check_files>
  <check_trojans>yes</check_trojans>
  <check_dev>yes</check_dev>
  <check_sys>yes</check_sys>
  <check_pids>yes</check_pids>
  <check_ports>yes</check_ports>
  <check_if>yes</check_if>
  <frequency>43200</frequency>
  <rootkit_files>etc/shared/rootkit_files.txt</rootkit_files>
  <rootkit_trojans>etc/shared/rootkit_trojans.txt</rootkit_trojans>
  <system_audit>etc/shared/system_audit_rcl.txt</system_audit>
</rootcheck>
```

---

## 8. 🔄 OpenSearch как альтернатива

OpenSearch — форк Elasticsearch от Amazon, поддерживает те же API.

```bash
# Запуск OpenSearch + OpenSearch Dashboards через Docker Compose
version: '3'
services:
  opensearch-node1:
    image: opensearchproject/opensearch:2.11.0
    environment:
      - cluster.name=opensearch-cluster
      - node.name=opensearch-node1
      - discovery.seed_hosts=opensearch-node1
      - cluster.initial_cluster_manager_nodes=opensearch-node1
      - bootstrap.memory_lock=true
      - "OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m"
      - OPENSEARCH_INITIAL_ADMIN_PASSWORD=Admin@12345
    ports:
      - 9200:9200
      - 9600:9600
    volumes:
      - opensearch-data:/usr/share/opensearch/data

  opensearch-dashboards:
    image: opensearchproject/opensearch-dashboards:2.11.0
    ports:
      - 5601:5601
    environment:
      OPENSEARCH_HOSTS: '["https://opensearch-node1:9200"]'
    depends_on:
      - opensearch-node1

volumes:
  opensearch-data:
```

---

## 9. 📋 Сравнительная таблица: Splunk vs ELK vs Wazuh

| Критерий | Splunk | ELK Stack | Wazuh |
|----------|--------|-----------|-------|
| **Лицензия** | Коммерческий | Apache 2.0 (ядро) | GPL v2 |
| **Стоимость** | $$$ (по объёму данных) | Бесплатно (инфра) | Бесплатно |
| **Язык запросов** | SPL | KQL / Query DSL | - |
| **Масштабируемость** | Отличная | Отличная | Хорошая |
| **Простота развёртывания** | Средняя | Сложная | Средняя |
| **EDR возможности** | Только через TA | Нет (Elastic Security) | Да (встроено) |
| **FIM** | Через Splunk UBA | Через Auditbeat | Встроено |
| **Active Response** | Нет (только оповещение) | Нет | Да (встроено) |
| **Корреляция правил** | Отличная (ESCU) | Хорошая (Detection Engine) | Хорошая |
| **Threat Intel** | Через Apps | Нет (без MISP) | Через интеграции |
| **SIEM-возможности** | Отличные | Хорошие | Хорошие |
| **Визуализация** | Отличная | Отличная (Kibana) | Через Kibana |
| **API** | REST + SDK | REST + SDK | REST |
| **Обучение** | Steep learning curve | Очень сложно | Умеренно |
| **Поддержка** | Коммерческая | Community + Платная | Community + Платная |
| **Подходит для** | Enterprise SOC | Любого масштаба | SMB / Endpoint-heavy |

---

## 10. 🧪 Практические задания

### Задание 1: Развернуть ELK Stack + Filebeat

```bash
# docker-compose.yml для учебного ELK
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - node.name=es01
      - cluster.name=elk-lab
      - discovery.type=single-node
      - xpack.security.enabled=true
      - ELASTIC_PASSWORD=lab@12345
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    ports:
      - "9200:9200"
    volumes:
      - esdata:/usr/share/elasticsearch/data

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    environment:
      - ELASTICSEARCH_HOSTS=https://elasticsearch:9200
      - ELASTICSEARCH_USERNAME=kibana_system
      - ELASTICSEARCH_PASSWORD=lab@12345
      - xpack.security.enabled=true
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "5044:5044"
      - "5514:5514/udp"
    depends_on:
      - elasticsearch

volumes:
  esdata:

---
# Запуск
docker-compose up -d

# Проверка
curl -u elastic:lab@12345 https://localhost:9200/_cluster/health?pretty
```

### Задание 2: Настройка Filebeat для SSH логов

```bash
# 1. Установить Filebeat
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.11.0-linux-x86_64.tar.gz
tar xzvf filebeat-8.11.0-linux-x86_64.tar.gz

# 2. Настроить filebeat.yml для сбора auth.log
cat > filebeat.yml << 'EOF'
filebeat.inputs:
  - type: log
    paths:
      - /var/log/auth.log
    fields:
      log_type: ssh_auth
    
output.elasticsearch:
  hosts: ["http://localhost:9200"]
  username: "elastic"
  password: "lab@12345"
  index: "ssh-logs-%{+YYYY.MM.dd}"

setup.kibana:
  host: "http://localhost:5601"
EOF

# 3. Запустить и проверить
./filebeat -e -c filebeat.yml
```

### Задание 3: Создать Kibana-дашборд для SSH мониторинга

**Шаги:**
1. Перейти в Kibana → Visualize Library → Create new
2. Создать визуализацию "Line Chart": Failed SSH per hour
   - Data: Count of records
   - Break by: @timestamp (1 hour)
   - Filter: `log_type: ssh_auth AND message: "Failed"`
3. Создать "Data Table": Top attacking IPs
   - Rows: source.ip (Top 10 by count)
   - Columns: Count
4. Создать "Metric": Total failures (24h)
5. Собрать дашборд: Dashboard → Create → Add visualizations

### Задание 4: KQL-запросы для CTF

```kql
# Найдите все события брутфорса SSH
rule.id: 5763

# Найдите IP с более чем 100 неудачными попытками входа
# (используйте Lens с агрегацией)
agent.ip: * AND rule.groups: "authentication_failed"

# Найдите успешный вход ПОСЛЕ брутфорса (suspicious)
rule.id: (5763 or 5764) AND event.outcome: success

# Найдите изменения файлов в /etc
syscheck.path: /etc/* AND syscheck.event: modified

# PowerShell-команды с обфускацией
process.name: "powershell.exe" AND process.args: *-e* AND process.args: * *
```

---

## ✅ Итоги главы

| Компонент | Роль | Ключевые концепции |
|-----------|------|-------------------|
| **Elasticsearch** | Хранение и поиск | Index, Shard, Mapping, Query DSL |
| **Logstash** | Обработка данных | Pipeline, Grok, Input/Filter/Output |
| **Kibana** | Визуализация | Discover, Lens, Dashboard, KQL |
| **Filebeat** | Сбор логов | Inputs, Modules, Processors |
| **Auditbeat** | Аудит Linux | FIM, Auditd, System Module |
| **Wazuh Manager** | SIEM/XDR ядро | Rules, Decoders, Active Response |
| **Wazuh Agent** | Endpoint Monitor | FIM, Rootkit, SCA |

---

## 🔗 Дополнительные ресурсы

- [Elastic Documentation](https://www.elastic.co/guide/index.html)
- [Wazuh Documentation](https://documentation.wazuh.com/)
- [Kibana Query Language Docs](https://www.elastic.co/guide/en/kibana/current/kuery-query.html)
- [Grok Pattern Reference](https://github.com/elastic/logstash/blob/v1.4.2/patterns/grok-patterns)
- [Elastic SIEM Detection Rules](https://github.com/elastic/detection-rules)
- [Wazuh Rules Repository](https://github.com/wazuh/wazuh-ruleset)
- [SOC Level 1: TryHackMe Learning Path](https://tryhackme.com/path/outline/soclevel1)

