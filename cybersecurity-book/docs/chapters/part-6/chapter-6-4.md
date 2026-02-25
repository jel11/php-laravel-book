# Глава 6.4: Анализ логов — Apache, Windows, Firewall

## 🎯 Цели главы

- Понять форматы логов Apache/Nginx и научиться извлекать из них сигналы угроз
- Разобрать ключевые Windows Event ID и их значение для SOC-аналитика
- Научиться читать firewall-логи (Cisco ASA, iptables, pf) и выявлять сканирование портов
- Писать SPL-запросы Splunk и KQL-запросы Elasticsearch для каждого типа лога
- Строить корреляционные правила, связывающие несколько источников логов
- Пройти практический сценарий обнаружения SQL injection через Apache-логи

---

## 1. 📋 Apache/Nginx Access Logs — Combined Log Format

### 1.1 Формат Combined Log Format

Apache и Nginx по умолчанию пишут логи в **Combined Log Format** — расширение Common Log Format (CLF). Это стандарт де-факто для веб-серверов.

```
LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined
```

Пример строки:

```
192.168.1.105 - admin [25/Feb/2026:14:32:01 +0300] "GET /admin/users?id=1' OR '1'='1 HTTP/1.1" 200 4823 "https://example.com/login" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) sqlmap/1.7.8"
```

### 1.2 Разбор полей

| Поле | Пример | Описание |
|------|--------|----------|
| `%h` | `192.168.1.105` | IP-адрес клиента (или прокси) |
| `%l` | `-` | Ident клиента (почти всегда `-`) |
| `%u` | `admin` | Аутентифицированный пользователь (или `-`) |
| `%t` | `[25/Feb/2026:14:32:01 +0300]` | Время запроса |
| `%r` | `GET /admin/users?id=1 HTTP/1.1` | Строка запроса |
| `%>s` | `200` | HTTP-код ответа |
| `%b` | `4823` | Размер ответа в байтах |
| `%{Referer}i` | `https://example.com/login` | Заголовок Referer |
| `%{User-Agent}i` | `Mozilla/5.0 ... sqlmap/1.7.8` | Заголовок User-Agent |

### 1.3 Nginx log_format

Nginx использует схожий формат, но с другим синтаксисом:

```nginx
log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                '$status $body_bytes_sent "$http_referer" '
                '"$http_user_agent" "$http_x_forwarded_for"';
```

Важно: поле `$http_x_forwarded_for` показывает реальный IP клиента за прокси/балансировщиком нагрузки. Атакующий может подделать этот заголовок.

### 1.4 Apache Error Log

Формат error-лога отличается:

```
[Wed Feb 25 14:32:05.123456 2026] [error] [pid 12345] [client 192.168.1.105:49512] File does not exist: /var/www/html/etc/passwd, referer: http://example.com/
```

Поля:
- Время в формате `[Day Mon DD HH:MM:SS.usec YYYY]`
- Уровень: `debug`, `info`, `notice`, `warn`, `error`, `crit`, `alert`, `emerg`
- PID процесса
- IP и порт клиента
- Сообщение об ошибке

---

## 2. 🔍 Анализ Apache-логов — Поиск Аномалий

### 2.1 Топ IP-адресов по количеству запросов

**Bash:**
```bash
# Топ-20 IP по запросам
awk '{print $1}' /var/log/apache2/access.log | sort | uniq -c | sort -rn | head -20

# Фильтр по коду ответа 404
awk '$9 == 404 {print $1}' /var/log/apache2/access.log | sort | uniq -c | sort -rn | head -10

# IP с более 1000 запросов за последний час
awk -v date="$(date -d '1 hour ago' +'%d/%b/%Y:%H')" '$4 ~ date {print $1}' /var/log/apache2/access.log | sort | uniq -c | sort -rn | awk '$1 > 1000'
```

**Python-скрипт для парсинга:**
```python
import re
from collections import Counter
from datetime import datetime

LOG_PATTERN = re.compile(
    r'(?P<ip>\S+) \S+ (?P<user>\S+) \[(?P<time>[^\]]+)\] '
    r'"(?P<method>\S+) (?P<uri>\S+) (?P<proto>[^"]+)" '
    r'(?P<status>\d{3}) (?P<size>\S+) '
    r'"(?P<referer>[^"]*)" "(?P<ua>[^"]*)"'
)

def parse_access_log(filepath):
    records = []
    with open(filepath, 'r', errors='replace') as f:
        for line in f:
            m = LOG_PATTERN.match(line)
            if m:
                records.append(m.groupdict())
    return records

def top_ips(records, n=20):
    counter = Counter(r['ip'] for r in records)
    return counter.most_common(n)

def top_uris(records, n=20):
    counter = Counter(r['uri'] for r in records)
    return counter.most_common(n)

def status_distribution(records):
    counter = Counter(r['status'] for r in records)
    return sorted(counter.items())

if __name__ == '__main__':
    records = parse_access_log('/var/log/apache2/access.log')
    print("=== ТОП IP ===")
    for ip, count in top_ips(records):
        print(f"  {count:8d}  {ip}")
    print("\n=== КОДЫ ОТВЕТА ===")
    for status, count in status_distribution(records):
        print(f"  HTTP {status}: {count}")
```

### 2.2 Обнаружение подозрительных User-Agent

```python
SUSPICIOUS_UA_PATTERNS = [
    # Инструменты сканирования
    r'sqlmap',
    r'nikto',
    r'nmap',
    r'masscan',
    r'zgrab',
    r'dirbuster',
    r'gobuster',
    r'wfuzz',
    r'burpsuite',
    r'hydra',
    # Устаревшие браузеры (часто ботнеты)
    r'MSIE [1-6]\.',
    # Пустой UA
    r'^-$',
    r'^$',
    # Сканеры уязвимостей
    r'acunetix',
    r'nessus',
    r'openvas',
    r'qualys',
    # Python/curl без маскировки
    r'^python-requests',
    r'^curl/[0-9]',
    r'^Go-http-client',
    r'^Java/',
    r'^libwww-perl',
]

import re

def find_suspicious_ua(records):
    patterns = [re.compile(p, re.IGNORECASE) for p in SUSPICIOUS_UA_PATTERNS]
    suspicious = []
    for r in records:
        ua = r.get('ua', '')
        for pat in patterns:
            if pat.search(ua):
                suspicious.append({
                    'ip': r['ip'],
                    'time': r['time'],
                    'uri': r['uri'],
                    'ua': ua,
                    'pattern': pat.pattern
                })
                break
    return suspicious
```

### 2.3 Обнаружение Path Traversal

```python
PATH_TRAVERSAL_PATTERNS = [
    r'\.\./\.\.',
    r'\.\.%2[Ff]',       # ../  URL-encoded
    r'%2[Ee]%2[Ee]',     # ..   double encoded
    r'\.\.%5[Cc]',       # ..\  Windows-style
    r'/etc/passwd',
    r'/etc/shadow',
    r'/proc/self',
    r'C:\\\\Windows',
    r'%00',              # Null byte
    r'\.\./etc',
    r'boot\.ini',
    r'win\.ini',
]

def find_path_traversal(records):
    patterns = [re.compile(p, re.IGNORECASE) for p in PATH_TRAVERSAL_PATTERNS]
    hits = []
    for r in records:
        uri = r.get('uri', '')
        for pat in patterns:
            if pat.search(uri):
                hits.append({
                    'ip': r['ip'],
                    'time': r['time'],
                    'uri': uri,
                    'status': r['status'],
                    'match': pat.pattern
                })
                break
    return hits
```

### 2.4 Обнаружение SQL Injection в URI

```python
SQLI_PATTERNS = [
    r"'\s*(OR|AND)\s*'?\d",           # ' OR '1'='1
    r"UNION\s+SELECT",
    r"SELECT\s+.*\s+FROM",
    r"INSERT\s+INTO",
    r"DROP\s+TABLE",
    r"--\s*$",                          # SQL comment at end
    r";.*DROP",
    r"xp_cmdshell",
    r"EXEC\s*\(",
    r"CAST\s*\(",
    r"CONVERT\s*\(",
    r"CHAR\s*\(\d+\)",
    r"0x[0-9a-fA-F]{4,}",              # Hex encoding
    r"INFORMATION_SCHEMA",
    r"sys\.tables",
    r"waitfor\s+delay",                 # Time-based blind SQLi
    r"SLEEP\s*\(",
    r"BENCHMARK\s*\(",
]

def find_sqli(records):
    patterns = [re.compile(p, re.IGNORECASE) for p in SQLI_PATTERNS]
    from urllib.parse import unquote
    hits = []
    for r in records:
        uri = unquote(r.get('uri', ''))
        for pat in patterns:
            if pat.search(uri):
                hits.append(r | {'sqli_pattern': pat.pattern, 'decoded_uri': uri})
                break
    return hits
```

---

## 3. 🪟 Windows Security Event Log

### 3.1 Архитектура Windows Event Log

Windows Event Log хранится в файлах `.evtx` и разделён на несколько каналов:

```
Event Log Channels:
├── Security          ← Главный для SOC (аудит входов, изменений)
├── System            ← Системные события
├── Application       ← Прикладные программы
├── Microsoft-Windows-Sysmon/Operational  ← Sysmon (расширенный аудит)
├── Microsoft-Windows-PowerShell/Operational
└── Microsoft-Windows-TaskScheduler/Operational
```

### 3.2 Ключевые Event ID для SOC-аналитика

| Event ID | Описание | Значимость |
|----------|----------|------------|
| **4624** | Успешный вход в систему | Средняя — норма |
| **4625** | Неудачный вход | Высокая при множестве |
| **4634** | Выход из системы | Низкая |
| **4648** | Вход с явными учётными данными | Высокая |
| **4672** | Вход с привилегиями (Admin) | Высокая |
| **4688** | Создание нового процесса | Высокая (с Sysmon) |
| **4689** | Завершение процесса | Низкая |
| **4698** | Создание запланированной задачи | Критическая |
| **4702** | Обновление запланированной задачи | Высокая |
| **4720** | Создание учётной записи | Критическая |
| **4722** | Включение учётной записи | Высокая |
| **4723** | Смена пароля своей учётки | Средняя |
| **4724** | Сброс пароля другой учётки | Высокая |
| **4728** | Добавление в глобальную группу | Критическая |
| **4732** | Добавление в локальную группу | Высокая |
| **4738** | Изменение учётной записи | Высокая |
| **4740** | Блокировка учётной записи | Высокая |
| **4756** | Добавление в универсальную группу | Высокая |
| **4776** | Проверка NTLM-учётных данных | Высокая |
| **4768** | Запрос TGT Kerberos | Средняя |
| **4769** | Запрос TGS Kerberos | Средняя |
| **4771** | Неудача преаутентификации Kerberos | Высокая |
| **4946** | Изменение правила Windows Firewall | Высокая |
| **5145** | Доступ к сетевым ресурсам | Средняя |

### 3.3 Разбор Event ID 4625 — Неудачный вход

Пример XML из Security.evtx:

```xml
<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
  <System>
    <EventID>4625</EventID>
    <TimeCreated SystemTime="2026-02-25T11:15:32.123456789Z"/>
    <Computer>WORKSTATION-01.corp.local</Computer>
  </System>
  <EventData>
    <Data Name="SubjectUserName">-</Data>
    <Data Name="SubjectDomainName">-</Data>
    <Data Name="TargetUserName">administrator</Data>
    <Data Name="TargetDomainName">CORP</Data>
    <Data Name="Status">0xC000006D</Data>       <!-- Неверное имя/пароль -->
    <Data Name="FailureReason">%%2313</Data>
    <Data Name="SubStatus">0xC000006A</Data>    <!-- Неверный пароль -->
    <Data Name="LogonType">3</Data>             <!-- Сетевой вход -->
    <Data Name="IpAddress">10.0.0.55</Data>
    <Data Name="IpPort">49203</Data>
    <Data Name="WorkstationName">ATTACKER-PC</Data>
  </EventData>
</Event>
```

**Коды статуса 4625:**

| Status | SubStatus | Значение |
|--------|-----------|----------|
| `0xC000006D` | `0xC000006A` | Неверный пароль |
| `0xC000006D` | `0xC0000064` | Несуществующий пользователь |
| `0xC000006E` | `0xC0000070` | Ограничение учётной записи |
| `0xC0000234` | — | Учётная запись заблокирована |
| `0xC000006F` | — | Вне разрешённых часов |
| `0xC0000193` | — | Истёк срок учётной записи |

**Типы входа (LogonType):**

| Тип | Название | Описание |
|-----|----------|----------|
| 2 | Interactive | Локальный вход (клавиатура) |
| 3 | Network | SMB, WMI, net use |
| 4 | Batch | Запланированные задачи |
| 5 | Service | Службы Windows |
| 7 | Unlock | Разблокировка экрана |
| 8 | NetworkCleartext | Basic auth (пароль в открытом виде) |
| 9 | NewCredentials | runas /netonly |
| 10 | RemoteInteractive | RDP |
| 11 | CachedInteractive | Вход по кэшированным данным |

### 3.4 Разбор Event ID 4688 — Создание процесса

```xml
<EventData>
  <Data Name="SubjectUserName">john.doe</Data>
  <Data Name="SubjectDomainName">CORP</Data>
  <Data Name="NewProcessId">0x1a4c</Data>
  <Data Name="NewProcessName">C:\Windows\System32\cmd.exe</Data>
  <Data Name="ParentProcessName">C:\Windows\System32\svchost.exe</Data>
  <Data Name="CommandLine">cmd.exe /c powershell -enc JABj...</Data>
  <Data Name="TokenElevationType">%%1937</Data>  <!-- Full token (UAC elevated) -->
</EventData>
```

:::warning Подозрительные паттерны в 4688
- `cmd.exe` или `powershell.exe` как дочерний процесс `outlook.exe`, `winword.exe`, `excel.exe`
- Base64-encoded команды PowerShell (`-enc`, `-EncodedCommand`)
- `mshta.exe`, `regsvr32.exe`, `rundll32.exe` с URL в аргументах
- `net.exe user /add` — добавление пользователей
- `schtasks.exe /create` — создание задач
- `wscript.exe` или `cscript.exe` из `%TEMP%`
:::

### 3.5 Цепочка событий — Pass-the-Hash атака

```
Типичная PtH (Pass-the-Hash) атака в Event Log:

[10:00:01] 4624 LogonType=9 (NewCredentials)  ← mimikatz sekurlsa::pth
           SubjectUser: ATTACKER-PC$
           TargetUser: administrator
           IpAddress: 10.0.0.55

[10:00:05] 4648 (Explicit Credential Logon)    ← Использование украденного хэша
           AccountName: administrator
           TargetServer: DC01.corp.local

[10:00:08] 4624 LogonType=3 (Network)          ← Успешный вход на DC
           TargetUser: administrator
           IpAddress: 10.0.0.55  ← Исходная машина атакующего

[10:00:10] 4688 NewProcess: cmd.exe            ← Команды на DC
           ParentProcess: services.exe
           CommandLine: net user backdoor P@ss1 /add /domain
```

---

## 4. 🔥 Анализ Firewall-логов

### 4.1 Cisco ASA — Формат логов

Cisco ASA генерирует syslog-сообщения. Примеры:

```
# Отклонённое соединение (inbound):
Feb 25 2026 14:23:01 ASA-FW-01 : %ASA-4-106023: Deny tcp src outside:203.0.113.45/54321 dst inside:10.0.0.100/22 by access-group "OUTSIDE_IN" [0x0, 0x0]

# Разрешённое соединение:
Feb 25 2026 14:23:05 ASA-FW-01 : %ASA-6-302013: Built inbound TCP connection 1234567 for outside:203.0.113.45/54321 (203.0.113.45/54321) to inside:10.0.0.100/443 (10.0.0.100/443)

# Завершение соединения:
Feb 25 2026 14:25:01 ASA-FW-01 : %ASA-6-302014: Teardown TCP connection 1234567 for outside:203.0.113.45/54321 to inside:10.0.0.100/443 duration 0:01:56 bytes 15234 TCP FINs

# Сканирование портов (threat detection):
Feb 25 2026 14:30:00 ASA-FW-01 : %ASA-4-733100: [ Scanning] drop rate-1 exceeded. Current burst rate is 15 per second, max configured rate is 10; Current average rate is 8 per second, max configured rate is 5; Cumulative total count is 45

# IDS/IPS алерт:
Feb 25 2026 14:31:00 ASA-FW-01 : %ASA-4-401004: Shunned packet: 203.0.113.45 ==> 10.0.0.100 on interface outside
```

**Ключевые ASA Message IDs:**

| Message ID | Описание |
|------------|----------|
| `%ASA-4-106023` | Deny по ACL |
| `%ASA-6-302013` | Построение TCP-соединения |
| `%ASA-6-302014` | Разрыв TCP-соединения |
| `%ASA-6-302015` | Построение UDP-потока |
| `%ASA-6-302016` | Разрыв UDP-потока |
| `%ASA-4-733100` | Превышение порога threat detection |
| `%ASA-5-304001` | URL-доступ |
| `%ASA-2-106006` | Deny inbound (высокая приоритетность) |

### 4.2 iptables — Формат логов

```
# /var/log/syslog или journalctl
Feb 25 14:45:01 gateway kernel: [UFW BLOCK] IN=eth0 OUT= MAC=00:1a:2b:3c:4d:5e:ff:ee:dd:cc:bb:aa:08:00 SRC=203.0.113.100 DST=10.0.0.1 LEN=44 TOS=0x00 PREC=0x00 TTL=245 ID=54321 PROTO=TCP SPT=12345 DPT=22 WINDOW=1024 RES=0x00 SYN URGP=0

Feb 25 14:45:02 gateway kernel: [UFW BLOCK] IN=eth0 OUT= MAC=... SRC=203.0.113.100 DST=10.0.0.1 LEN=44 TTL=245 PROTO=TCP SPT=12346 DPT=23 WINDOW=1024 RES=0x00 SYN URGP=0

Feb 25 14:45:03 gateway kernel: [UFW BLOCK] IN=eth0 OUT= MAC=... SRC=203.0.113.100 DST=10.0.0.1 LEN=44 TTL=245 PROTO=TCP SPT=12347 DPT=80 WINDOW=1024 RES=0x00 SYN URGP=0
```

Разбор полей iptables-лога:

| Поле | Значение |
|------|---------|
| `IN=eth0` | Входящий интерфейс |
| `OUT=` | Исходящий интерфейс (пустой = входящий пакет) |
| `SRC=203.0.113.100` | IP источника |
| `DST=10.0.0.1` | IP назначения |
| `PROTO=TCP` | Протокол |
| `SPT=12345` | Порт источника |
| `DPT=22` | Порт назначения |
| `SYN` | TCP-флаг SYN |
| `TTL=245` | Time-to-live |

### 4.3 Обнаружение сканирования портов в iptables-логах

```python
import re
from collections import defaultdict
from datetime import datetime, timedelta

IPTABLES_PATTERN = re.compile(
    r'(\w+ \d+ \d+:\d+:\d+) .* SRC=(\S+) DST=(\S+) .* PROTO=(\w+) SPT=(\d+) DPT=(\d+)'
)

def detect_port_scan(log_file, threshold=20, window_seconds=60):
    """
    Обнаружение горизонтального сканирования: один IP → много портов
    threshold: минимальное число уникальных портов для алерта
    """
    # {src_ip: {timestamp: [dst_port, ...]}}
    scan_data = defaultdict(lambda: defaultdict(set))
    
    with open(log_file) as f:
        for line in f:
            m = IPTABLES_PATTERN.search(line)
            if m:
                ts_str, src, dst, proto, sport, dport = m.groups()
                # Упрощённое время (без года)
                scan_data[src][ts_str].add(int(dport))
    
    alerts = []
    for src_ip, time_data in scan_data.items():
        # Собираем все порты за скользящее окно
        all_ports = set()
        for ts, ports in time_data.items():
            all_ports.update(ports)
        
        if len(all_ports) >= threshold:
            alerts.append({
                'type': 'PORT_SCAN',
                'src_ip': src_ip,
                'unique_ports': len(all_ports),
                'ports_sample': sorted(list(all_ports))[:20],
                'severity': 'HIGH' if len(all_ports) > 100 else 'MEDIUM'
            })
    
    return alerts

# Запуск
alerts = detect_port_scan('/var/log/ufw.log', threshold=20)
for a in alerts:
    print(f"[{a['severity']}] {a['type']}: {a['src_ip']} → {a['unique_ports']} портов")
    print(f"  Примеры портов: {a['ports_sample']}")
```

### 4.4 pf (BSD/macOS Firewall)

```
# /var/log/pflog или pfctl -s rules
Feb 25 14:55:01.123456 rule 15/0(match): block in on em0: 
  203.0.113.50.4444 > 10.0.0.2.80: Flags [S], seq 1234567890, win 65535, length 0

Feb 25 14:55:02.234567 rule 0/0(match): pass in on em0: 
  10.0.0.50.52341 > 8.8.8.8.53: UDP, length 32
```

---

## 5. 🔎 SPL-запросы Splunk

### 5.1 Apache-логи в Splunk

```spl
-- Топ-20 IP по количеству запросов:
index=web sourcetype=access_combined
| stats count by clientip
| sort -count
| head 20

-- Подозрительные User-Agent:
index=web sourcetype=access_combined
| search useragent IN ("*sqlmap*", "*nikto*", "*nmap*", "*dirbuster*", "*gobuster*", "*wfuzz*")
| stats count by clientip, useragent
| sort -count

-- Обнаружение Path Traversal:
index=web sourcetype=access_combined
| where match(uri_path, "(\.\./|%2e%2e|%252e%252e|/etc/passwd|/etc/shadow|boot\.ini)")
| table _time, clientip, uri_path, status, useragent

-- Коды 4xx/5xx — потенциальные сканирования:
index=web sourcetype=access_combined status>=400
| eval status_class=case(
    status>=500, "5xx Server Error",
    status>=400, "4xx Client Error"
  )
| stats count by clientip, status_class
| where count > 50
| sort -count

-- SQL Injection по URI:
index=web sourcetype=access_combined
| where match(uri_query, "(?i)(union\s+select|'.*or.*'|--\s*$|xp_cmdshell|information_schema|sleep\s*\(|waitfor\s+delay)")
| eval decoded_uri=urldecode(uri_query)
| table _time, clientip, uri_path, decoded_uri, status

-- Временна́я шкала атаки от одного IP:
index=web sourcetype=access_combined clientip="203.0.113.45"
| sort _time
| table _time, method, uri_path, uri_query, status, bytes, useragent

-- Аномальный объём данных (Data Exfiltration):
index=web sourcetype=access_combined
| stats sum(bytes) as total_bytes by clientip
| eval total_mb=round(total_bytes/1024/1024, 2)
| where total_mb > 100
| sort -total_mb
```

### 5.2 Windows Security Events в Splunk

```spl
-- Брутфорс: много 4625 от одного IP:
index=windows EventCode=4625
| stats count by src_ip, TargetUserName
| where count > 10
| sort -count

-- Успешный вход после серии неудачных (Брутфорс успех):
index=windows EventCode IN (4625, 4624)
| eval is_fail=if(EventCode==4625, 1, 0)
| eval is_success=if(EventCode==4624, 1, 0)
| stats sum(is_fail) as failures, sum(is_success) as successes by src_ip, TargetUserName
| where failures > 5 AND successes > 0
| eval attack_likely=if(failures > 20, "HIGH", "MEDIUM")

-- Создание новых пользователей (4720):
index=windows EventCode=4720
| table _time, SubjectUserName, SubjectDomainName, TargetUserName, TargetDomainName, ComputerName
| sort _time

-- Добавление в группу Administrators (4732):
index=windows EventCode=4732
| where TargetUserName="Administrators" OR TargetUserName="Domain Admins"
| table _time, SubjectUserName, MemberName, TargetUserName, ComputerName

-- Подозрительные процессы (4688):
index=windows EventCode=4688
| where match(NewProcessName, "(?i)(mimikatz|procdump|psexec|wce\.exe|fgdump)")
  OR match(CommandLine, "(?i)(-enc|-encodedcommand|downloadstring|invoke-expression|iex)")
  OR (ParentProcessName IN ("winword.exe","excel.exe","outlook.exe") AND NewProcessName IN ("cmd.exe","powershell.exe","wscript.exe"))
| table _time, ComputerName, SubjectUserName, ParentProcessName, NewProcessName, CommandLine

-- NTLM Pass-the-Hash паттерн (4648 + 4624 LogonType 9):
index=windows EventCode IN (4648, 4624)
| eval pth_indicator=if(EventCode==4624 AND LogonType==9, 1, 0)
| stats sum(pth_indicator) as pth_count by src_ip, TargetUserName, TargetServerName
| where pth_count > 0

-- Horizontal movement: один пользователь входит на много машин:
index=windows EventCode=4624 LogonType IN (3, 10)
| stats dc(ComputerName) as machines_accessed, values(ComputerName) as machines by TargetUserName
| where machines_accessed > 5
| sort -machines_accessed
```

### 5.3 Firewall-логи в Splunk

```spl
-- Топ источников заблокированных соединений:
index=firewall action=blocked
| stats count by src_ip
| sort -count | head 20

-- Обнаружение сканирования портов:
index=firewall action=blocked
| stats dc(dest_port) as unique_ports, values(dest_port) as ports by src_ip, dest_ip
| where unique_ports > 20
| sort -unique_ports

-- Трафик на нестандартные порты изнутри (потенциальный C2):
index=firewall src_ip="10.*" action=allowed
| where NOT dest_port IN (80, 443, 53, 22, 25, 110, 143, 465, 587, 993, 995)
| stats count by src_ip, dest_ip, dest_port
| sort -count

-- Аномальный исходящий трафик:
index=firewall action=allowed direction=outbound
| stats sum(bytes) as total_bytes by src_ip
| eval total_mb=round(total_bytes/1024/1024,2)
| where total_mb > 500
| sort -total_mb

-- Cisco ASA: разбор логов 106023:
index=cisco_asa sourcetype=cisco:asa
| rex field=_raw "Deny (?P<proto>\w+) src (?P<zone_src>\w+):(?P<src_ip>[\d.]+)/(?P<src_port>\d+) dst (?P<zone_dst>\w+):(?P<dst_ip>[\d.]+)/(?P<dst_port>\d+)"
| stats count by src_ip, dst_ip, dst_port, proto
| sort -count
```

---

## 6. 🔎 KQL-запросы Elasticsearch

### 6.1 Apache-логи в Kibana/Elasticsearch

```json
// Топ IP по запросам (Aggregation)
GET apache-logs-*/_search
{
  "size": 0,
  "aggs": {
    "top_ips": {
      "terms": {
        "field": "clientip.keyword",
        "size": 20,
        "order": { "_count": "desc" }
      }
    }
  }
}

// Подозрительные User-Agent (KQL в Kibana Discover)
// agent: (*sqlmap* OR *nikto* OR *nmap* OR *dirbuster* OR *gobuster*)

// Поиск Path Traversal через Query DSL
GET apache-logs-*/_search
{
  "query": {
    "bool": {
      "should": [
        { "wildcard": { "request.keyword": "*../..* " }},
        { "wildcard": { "request.keyword": "*%2e%2e*" }},
        { "match": { "request": "/etc/passwd" }},
        { "match": { "request": "boot.ini" }}
      ],
      "minimum_should_match": 1
    }
  },
  "_source": ["@timestamp", "clientip", "request", "response", "agent"]
}
```

```python
# Python Elasticsearch client для поиска SQL Injection
from elasticsearch import Elasticsearch

es = Elasticsearch(['http://localhost:9200'])

sqli_query = {
    "query": {
        "bool": {
            "should": [
                {"regexp": {"request.keyword": ".*[Uu][Nn][Ii][Oo][Nn].*[Ss][Ee][Ll][Ee][Cc][Tt].*"}},
                {"wildcard": {"request.keyword": "*' OR '*"}},
                {"wildcard": {"request.keyword": "*INFORMATION_SCHEMA*"}},
                {"wildcard": {"request.keyword": "*xp_cmdshell*"}},
                {"regexp": {"request.keyword": ".*[Ss][Ll][Ee][Ee][Pp]\\(.*"}},
            ],
            "minimum_should_match": 1
        }
    },
    "sort": [{"@timestamp": "asc"}],
    "_source": ["@timestamp", "clientip", "request", "response", "agent"],
    "size": 100
}

result = es.search(index="apache-logs-*", body=sqli_query)
for hit in result['hits']['hits']:
    src = hit['_source']
    print(f"[{src.get('@timestamp')}] {src.get('clientip')} → {src.get('request')[:100]}")
```

### 6.2 Windows Events в Elasticsearch

```json
// KQL в Kibana: Брутфорс 4625
// winlog.event_id: 4625 AND winlog.event_data.IpAddress: *

// Query DSL для поиска брутфорса
GET winlogbeat-*/_search
{
  "size": 0,
  "query": {
    "bool": {
      "must": [
        { "term": { "winlog.event_id": 4625 }},
        { "range": { "@timestamp": { "gte": "now-1h" }}}
      ]
    }
  },
  "aggs": {
    "by_ip": {
      "terms": {
        "field": "winlog.event_data.IpAddress.keyword",
        "size": 20
      },
      "aggs": {
        "by_user": {
          "terms": {
            "field": "winlog.event_data.TargetUserName.keyword",
            "size": 10
          }
        }
      }
    }
  }
}
```

```json
// Поиск подозрительного PowerShell (Event 4688)
GET winlogbeat-*/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "winlog.event_id": 4688 }},
        {
          "bool": {
            "should": [
              { "wildcard": { "winlog.event_data.CommandLine": "*-enc*" }},
              { "wildcard": { "winlog.event_data.CommandLine": "*-EncodedCommand*" }},
              { "wildcard": { "winlog.event_data.CommandLine": "*DownloadString*" }},
              { "wildcard": { "winlog.event_data.CommandLine": "*Invoke-Expression*" }},
              { "wildcard": { "winlog.event_data.CommandLine": "*IEX*" }}
            ],
            "minimum_should_match": 1
          }
        }
      ]
    }
  },
  "_source": [
    "@timestamp",
    "winlog.computer_name",
    "winlog.event_data.SubjectUserName",
    "winlog.event_data.NewProcessName",
    "winlog.event_data.CommandLine",
    "winlog.event_data.ParentProcessName"
  ]
}
```

---

## 7. 🔗 Корреляционные Правила

### 7.1 Принцип корреляции — Pyramid of Pain

```
                    TTPs (Сложно менять)        ← САМЫЙ ЦЕННЫЙ УРОВЕНЬ
                   /                  \
                  / Tools (Инструменты) \
                 /______________________\
                / Network/Host Artifacts \
               /________________________\
              /   Domain Names            \
             /____________________________\
            /    IP Addresses              \
           /________________________________\
          /         Hash Values              \
         /____________________________________\
                   (Легко менять)             ← НАИМЕНЕЕ ЦЕННЫЙ
```

### 7.2 Корреляция: Apache + Windows + Firewall

**Сценарий: Атакующий сканирует веб-сервер → эксплуатирует SQLi → входит через RDP**

```
[ЭТАП 1] Firewall logs: Port scan detection
         203.0.113.45 → 10.0.0.100 : порты 22,80,443,3389,8080,...

[ЭТАП 2] Apache access log: SQLi попытки
         203.0.113.45 - GET /login?user=admin' OR '1'='1 - 200

[ЭТАП 3] Apache access log: Успешный доступ к /admin
         203.0.113.45 - GET /admin/config.php - 200

[ЭТАП 4] Windows 4625: Множество неудачных RDP входов
         IpAddress: 203.0.113.45 → TargetUser: Administrator

[ЭТАП 5] Windows 4624: Успешный RDP вход
         IpAddress: 203.0.113.45, LogonType=10, User=Administrator

[ЭТАП 6] Windows 4688: Подозрительный процесс
         whoami, net user, net localgroup administrators
```

**SPL-корреляция для этого сценария:**

```spl
-- Корреляционное правило: Сканирование → SQLi → RDP
-- Шаг 1: Найти IP с признаками сканирования
[ search index=firewall action=blocked
  | stats dc(dest_port) as ports by src_ip
  | where ports > 15
  | fields src_ip ]

-- Шаг 2: Проверить SQLi от тех же IP
index=web sourcetype=access_combined
| where match(uri_query, "(?i)(union|or.*=.*|'.*'|--)")
| join clientip [
    search index=firewall action=blocked
    | stats dc(dest_port) as scan_ports by src_ip
    | where scan_ports > 15
    | rename src_ip as clientip
]
| stats count as sqli_attempts, dc(uri_path) as paths by clientip
| where sqli_attempts > 3

-- Шаг 3: Коррелировать с Windows 4624 RDP
index=windows EventCode=4624 LogonType=10
| join src_ip [
    search index=web sourcetype=access_combined
    | where match(uri_query, "(?i)(union|or.*=.*)")
    | stats count by clientip
    | where count > 3
    | rename clientip as src_ip
]
| table _time, ComputerName, TargetUserName, src_ip
```

### 7.3 Sigma Rule — Универсальный формат корреляции

```yaml
# sigma_rule_apache_sqli.yml
title: SQL Injection Attempt in Apache Access Log
id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
status: stable
description: Detects SQL injection patterns in Apache web server access logs
references:
  - https://owasp.org/www-community/attacks/SQL_Injection
author: SOC Team
date: 2026/02/25
logsource:
  category: webserver
  product: apache
detection:
  keywords:
    - "' OR '"
    - "UNION SELECT"
    - "1=1"
    - "xp_cmdshell"
    - "INFORMATION_SCHEMA"
    - "sleep("
    - "waitfor delay"
    - "benchmark("
    - "%27"    # URL-encoded '
    - "%22"    # URL-encoded "
    - "0x31303235"  # Hex encoding
  condition: keywords
falsepositives:
  - Legitimate SQL in URL parameters (rare)
  - Security testing
level: high
tags:
  - attack.initial_access
  - attack.t1190  # Exploit Public-Facing Application
fields:
  - clientip
  - request
  - status
  - agent
```

---

## 8. 📝 Практическое задание

### Сценарий: Обнаружение SQL Injection через Apache-лог

У вас есть следующий фрагмент лога. Проведите анализ и ответьте на вопросы.

**Лог-файл (фрагмент):**

```
# /var/log/apache2/access.log
192.168.50.25 - - [25/Feb/2026:09:00:01 +0000] "GET / HTTP/1.1" 200 1234 "-" "Mozilla/5.0"
192.168.50.25 - - [25/Feb/2026:09:00:15 +0000] "GET /robots.txt HTTP/1.1" 200 45 "-" "Mozilla/5.0"
192.168.50.25 - - [25/Feb/2026:09:01:02 +0000] "GET /login HTTP/1.1" 200 3456 "-" "sqlmap/1.7.8#stable (https://sqlmap.org)"
192.168.50.25 - - [25/Feb/2026:09:01:03 +0000] "GET /login?username=admin%27%20OR%20%271%27%3D%271 HTTP/1.1" 500 0 "-" "sqlmap/1.7.8"
192.168.50.25 - - [25/Feb/2026:09:01:04 +0000] "GET /login?username=admin%27%20AND%20SLEEP%285%29-- HTTP/1.1" 200 3456 "-" "sqlmap/1.7.8"
192.168.50.25 - - [25/Feb/2026:09:01:05 +0000] "GET /login?username=1%20UNION%20SELECT%20NULL%2CNULL%2CNULL-- HTTP/1.1" 200 3456 "-" "sqlmap/1.7.8"
192.168.50.25 - - [25/Feb/2026:09:01:10 +0000] "GET /login?username=1%20UNION%20SELECT%20username%2Cpassword%2CNULL%20FROM%20users-- HTTP/1.1" 200 4567 "-" "sqlmap/1.7.8"
10.0.0.5 - - [25/Feb/2026:09:05:00 +0000] "GET /admin HTTP/1.1" 403 234 "-" "Mozilla/5.0"
10.0.0.5 - admin [25/Feb/2026:09:10:00 +0000] "GET /admin HTTP/1.1" 200 8901 "-" "Mozilla/5.0"
```

**Задание:**

```python
# task_6_4.py — Ваше решение

import re
from urllib.parse import unquote

log_data = """
192.168.50.25 - - [25/Feb/2026:09:01:02 +0000] "GET /login HTTP/1.1" 200 3456 "-" "sqlmap/1.7.8#stable"
192.168.50.25 - - [25/Feb/2026:09:01:03 +0000] "GET /login?username=admin%27%20OR%20%271%27%3D%271 HTTP/1.1" 500 0 "-" "sqlmap/1.7.8"
192.168.50.25 - - [25/Feb/2026:09:01:04 +0000] "GET /login?username=admin%27%20AND%20SLEEP%285%29-- HTTP/1.1" 200 3456 "-" "sqlmap/1.7.8"
192.168.50.25 - - [25/Feb/2026:09:01:05 +0000] "GET /login?username=1%20UNION%20SELECT%20NULL%2CNULL%2CNULL-- HTTP/1.1" 200 3456 "-" "sqlmap/1.7.8"
192.168.50.25 - - [25/Feb/2026:09:01:10 +0000] "GET /login?username=1%20UNION%20SELECT%20username%2Cpassword%2CNULL%20FROM%20users-- HTTP/1.1" 200 4567 "-" "sqlmap/1.7.8"
""".strip()

# Задание 1: Распарсить лог и декодировать URI
# Задание 2: Определить тип SQLi (Boolean-based, Time-based, UNION-based)
# Задание 3: Оценить успешность атаки (анализ кодов ответа)
# Задание 4: Написать SPL-запрос для Splunk чтобы поймать эту атаку
# Задание 5: Составить IOC-список

# --- РЕШЕНИЕ ---
LOG_RE = re.compile(
    r'(\S+) \S+ (\S+) \[([^\]]+)\] "(\w+) (\S+) HTTP/[\d.]+" (\d+) (\S+) "[^"]*" "([^"]*)"'
)

sqli_types = {
    'boolean': re.compile(r"OR\s+'?\d+'?\s*=\s*'?\d", re.I),
    'time_based': re.compile(r"SLEEP\s*\(|WAITFOR\s+DELAY|BENCHMARK\s*\(", re.I),
    'union': re.compile(r"UNION\s+SELECT", re.I),
    'error_based': re.compile(r"EXTRACTVALUE|UPDATEXML|exp\(~", re.I),
}

print("=== АНАЛИЗ SQL INJECTION АТАКИ ===\n")
for line in log_data.split('\n'):
    m = LOG_RE.match(line)
    if not m:
        continue
    ip, user, ts, method, uri, status, size, ua = m.groups()
    decoded = unquote(uri)
    
    detected_types = [t for t, p in sqli_types.items() if p.search(decoded)]
    if detected_types:
        print(f"[{ts}] IP: {ip}")
        print(f"  URI (decoded): {decoded}")
        print(f"  Status: {status} | UA: {ua[:40]}")
        print(f"  Тип SQLi: {', '.join(detected_types)}")
        if status == '200' and size != '0':
            print(f"  ⚠ ВЕРОЯТНО УСПЕШНЫЙ ЗАПРОС (статус 200, размер {size} байт)")
        print()
```

**Ожидаемый вывод:**

```
=== АНАЛИЗ SQL INJECTION АТАКИ ===

[25/Feb/2026:09:01:03 +0000] IP: 192.168.50.25
  URI (decoded): /login?username=admin' OR '1'='1
  Status: 500 | UA: sqlmap/1.7.8
  Тип SQLi: boolean

[25/Feb/2026:09:01:04 +0000] IP: 192.168.50.25
  URI (decoded): /login?username=admin' AND SLEEP(5)--
  Status: 200 | UA: sqlmap/1.7.8
  Тип SQLi: time_based
  ⚠ ВЕРОЯТНО УСПЕШНЫЙ ЗАПРОС (статус 200, размер 3456 байт)

[25/Feb/2026:09:01:10 +0000] IP: 192.168.50.25
  URI (decoded): /login?username=1 UNION SELECT username,password,NULL FROM users--
  Status: 200 | UA: sqlmap/1.7.8
  Тип SQLi: union
  ⚠ ВЕРОЯТНО УСПЕШНЫЙ ЗАПРОС (статус 200, размер 4567 байт)
```

### Контрольные вопросы

1. Почему запрос с `SLEEP(5)` возвращает HTTP 200, хотя это атака?
2. Что означает разный размер ответа (3456 vs 4567 байт) в UNION-запросе?
3. Как настроить WAF-правило, чтобы заблокировать `sqlmap`?
4. Напишите SPL для Splunk, который сработает на этот инцидент.
5. Какие IOC нужно добавить в блок-лист?

---

## 📚 Итоги

| Тип лога | Ключевые индикаторы | Инструменты |
|----------|---------------------|-------------|
| Apache access | Подозрительный UA, SQLi в URI, 4xx/5xx flood | awk, Python, Splunk |
| Apache error | Path traversal, file not found flood | grep, Splunk |
| Windows Security | 4625 flood, 4688 suspicious process, 4720 new user | Event Viewer, Splunk |
| Cisco ASA | 106023 deny flood, 733100 scan detection | Splunk, syslog |
| iptables | BLOCK flood на множество портов | Python, Splunk |
| pf | block in flood | syslog, ELK |

**Ключевые выводы:**
- Combined Log Format — стандарт Apache/Nginx, важно уметь его декодировать
- Windows Event ID 4625, 4688, 4720, 4624 LogonType=10 — обязательны к мониторингу
- Сканирование портов в firewall-логах: один IP → много уникальных dst_port за короткое время
- Корреляция нескольких источников логов даёт полную картину атаки
- Sigma Rules — универсальный формат корреляционных правил, конвертируется в SPL/KQL/Elastic

---

[← Предыдущая](./chapter-6-3) | [Следующая →](./chapter-6-5)
