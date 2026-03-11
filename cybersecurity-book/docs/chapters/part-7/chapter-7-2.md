# Глава 7.2: Плейбуки SOC: фишинг, малвер, брутфорс

## 🎯 Цели главы

- Понять концепцию и структуру плейбука (Playbook/Runbook)
- Освоить плейбук реагирования на фишинговую атаку
- Изучить плейбук реагирования на заражение malware
- Разобрать плейбук реагирования на брутфорс-атаки
- Научиться автоматизировать плейбуки через SOAR

---

## 7.2.1 Что такое плейбук и зачем он нужен

### Определение

**Плейбук (Playbook)** или **Runbook** — это документ с пошаговыми инструкциями для реагирования на конкретный тип инцидента. Думайте о нём как о рецепте: чётко написанный алгоритм действий, которому может следовать любой аналитик.

```
БЕЗ ПЛЕЙБУКА:                    С ПЛЕЙБУКОМ:
━━━━━━━━━━━━━━━━━━━━━━━━━         ━━━━━━━━━━━━━━━━━━━━━━━━━
• Каждый аналитик делает         • Стандартизированный процесс
  по-своему                       для всей команды
• Забываем важные шаги           • Ничего не забыть
  под давлением                    (чеклист)
• Долгое время реагирования      • Быстрое реагирование
• Разное качество работы         • Стабильное качество
• Трудно обучать новичков        • Быстрое введение в работу
• Нет метрик для улучшения       • Чёткие метрики
```

### Структура хорошего плейбука

```
СТРУКТУРА ПЛЕЙБУКА:

1. METADATA
   ├── Название и версия
   ├── Тип инцидента
   ├── Критичность (P1-P4)
   ├── SLA
   ├── Последнее обновление
   └── Ответственный автор

2. ТРИГГЕРЫ (когда активируется)
   ├── SIEM алерты, которые запускают этот плейбук
   ├── Ручные триггеры (пользователь сообщил)
   └── Условия активации

3. НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ (первые 15 минут)
   └── Быстрые шаги для снижения ущерба

4. ДИАГНОСТИКА
   ├── Какие данные собирать
   ├── Как определить scope (масштаб)
   └── Как определить true/false positive

5. СДЕРЖИВАНИЕ
   └── Конкретные шаги изоляции

6. ЛИКВИДАЦИЯ
   └── Удаление угрозы

7. ВОССТАНОВЛЕНИЕ
   └── Возврат к нормальной работе

8. КОММУНИКАЦИЯ
   ├── Кого уведомлять
   ├── Шаблоны сообщений
   └── Когда эскалировать

9. ДОКУМЕНТАЦИЯ
   └── Что записывать в тикет

10. POST-INCIDENT
    └── Что проверить после закрытия
```

---

## 7.2.2 Плейбук: Фишинговая атака

```
═══════════════════════════════════════════════════════════════
ПЛЕЙБУК: ФИШИНГОВАЯ АТАКА (PHISHING)
Версия: 2.1 | Обновлено: 2024-01 | Автор: SOC Team
Критичность по умолчанию: P2 (повышается при клике/компрометации)
═══════════════════════════════════════════════════════════════
```

### ТРИГГЕРЫ активации

```
Автоматические:
├── Email-гейтвей заблокировал письмо с вредоносным вложением
├── Anti-phishing сервис пометил URL
├── SIEM: mass email from external sender to >10 recipients
└── EDR: user clicked link → обращение к известному phishing URL

Ручные:
├── Пользователь переслал подозрительное письмо на security@
├── Пользователь сообщил о подозрительном письме через кнопку "Report Phishing"
└── Помощь службы поддержки: "мне пришло странное письмо"
```

### ШАГ 1: Сортировка и первичная оценка (0-5 минут)

```
□ Получить полное письмо включая заголовки
  (Outlook: File → Properties; Gmail: три точки → "Show original")

□ Проверить заголовки письма:
  ├── From: (реальный отправитель vs display name)
  ├── Reply-To: (куда идёт ответ?)
  ├── Return-Path: (куда возвращаются письма?)
  ├── Received: (цепочка серверов)
  └── DKIM/SPF/DMARC статус

□ Определить масштаб:
  ├── Сколько получателей?
  ├── Кто получил? (VIP, Finance, IT?)
  └── Кто-нибудь кликнул? (проверить URL gateway)

□ Классифицировать:
  ├── Spear phishing (целевая) → P1/P2
  ├── Вишинг/Смишинг → P2
  ├── Mass phishing (массовая) → P2/P3
  └── Training email (ложная тревога) → закрыть
```

### ШАГ 2: Анализ письма (5-15 минут)

```bash
#!/bin/bash
# phishing_analysis.sh — анализ подозрительного письма

EMAIL_FILE="suspicious_email.eml"

echo "=== EMAIL HEADER ANALYSIS ==="
# Извлечь заголовки
grep -E "^(From|To|Subject|Date|Reply-To|Return-Path|Received|X-Mailer)" "$EMAIL_FILE"

echo ""
echo "=== SPF/DKIM/DMARC CHECK ==="
grep -E "^(Authentication-Results|DKIM-Signature|Received-SPF)" "$EMAIL_FILE"

echo ""
echo "=== URLS IN EMAIL ==="
# Извлечь все URL
grep -oE 'https?://[^"< >]+' "$EMAIL_FILE" | sort -u

echo ""
echo "=== ATTACHMENTS ==="
# Проверить вложения
grep -E "Content-Type.*application|filename=" "$EMAIL_FILE"

echo ""
echo "=== SENDER IP ==="
# Извлечь IP отправителя из заголовка Received
grep "^Received:" "$EMAIL_FILE" | head -1 | grep -oE '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b' | head -1
```

```python
#!/usr/bin/env python3
# phishing_ioc_checker.py — проверка IOC фишинга через API

import requests
import hashlib
import base64

VT_API_KEY = "YOUR_VT_API_KEY"

def check_url_virustotal(url):
    """Проверка URL в VirusTotal"""
    url_id = base64.urlsafe_b64encode(url.encode()).rstrip(b'=').decode()
    headers = {"x-apikey": VT_API_KEY}

    response = requests.get(
        f"https://www.virustotal.com/api/v3/urls/{url_id}",
        headers=headers
    )

    if response.status_code == 200:
        data = response.json()
        stats = data["data"]["attributes"]["last_analysis_stats"]
        malicious = stats.get("malicious", 0)
        total = sum(stats.values())
        print(f"URL: {url}")
        print(f"Malicious: {malicious}/{total} vendors")
        return malicious > 0
    return None

def check_hash_virustotal(file_hash):
    """Проверка хэша вложения"""
    headers = {"x-apikey": VT_API_KEY}
    response = requests.get(
        f"https://www.virustotal.com/api/v3/files/{file_hash}",
        headers=headers
    )
    if response.status_code == 200:
        data = response.json()
        stats = data["data"]["attributes"]["last_analysis_stats"]
        malicious = stats.get("malicious", 0)
        total = sum(stats.values())
        name = data["data"]["attributes"].get("meaningful_name", "Unknown")
        print(f"File: {name} ({file_hash})")
        print(f"Malicious: {malicious}/{total} vendors")
        return malicious > 0
    return None

def check_ip_abuseipdb(ip):
    """Проверка IP в AbuseIPDB"""
    headers = {
        "Key": "YOUR_ABUSEIPDB_KEY",
        "Accept": "application/json"
    }
    response = requests.get(
        "https://api.abuseipdb.com/api/v2/check",
        headers=headers,
        params={"ipAddress": ip, "maxAgeInDays": 90}
    )
    if response.status_code == 200:
        data = response.json()["data"]
        score = data["abuseConfidenceScore"]
        reports = data["totalReports"]
        print(f"IP: {ip}")
        print(f"Abuse Score: {score}% ({reports} reports)")
        return score > 50

# Пример использования
urls_to_check = [
    "http://malicious-bank-update.com/login",
    "https://bit.ly/3xyzABC"
]

for url in urls_to_check:
    is_malicious = check_url_virustotal(url)
    print(f"Status: {'🔴 MALICIOUS' if is_malicious else '🟢 CLEAN'}")
    print()
```

### ШАГ 3: Определение клика и компрометации (15-30 минут)

```
□ Кто кликнул на ссылку?
  └── Проверить URL-фильтр/Proxy логи:
      ├── Squid: grep "malicious-url.com" /var/log/squid/access.log
      ├── Zscaler/Cisco Umbrella: Dashboard → Activity
      └── SIEM запрос: url contains "malicious-url.com"

□ Кто открыл вложение?
  └── SIEM/EDR: process created where parent=outlook.exe or thunderbird
  └── Email gateway: delivery report + открытие

□ Если кликнул — что произошло дальше?
  ├── Просто перешёл на страницу? → Меньший риск
  ├── Ввёл учётные данные? → КРИТИЧНО: смена пароля немедленно
  ├── Скачал и запустил файл? → Переход к Malware Playbook
  └── Ввёл данные карты? → Уведомление финансового отдела

□ Проверить MFA логи:
  └── Были ли попытки входа после фишинга?
  └── Был ли успешный вход с нового устройства/IP?
```

### ШАГ 4: Сдерживание

```
□ Если письмо ещё не открыто:
  ├── Удалить из всех ящиков (Email Purge):
  │   ├── O365: Security Center → Threat Explorer → Purge
  │   ├── Google Workspace: Admin Console → Gmail → Manage quarantine
  │   └── Exchange: Search-Mailbox / Get-MessageTrackingLog
  └── Заблокировать домен/IP отправителя

□ Если кликнули на URL:
  ├── Заблокировать URL на proxy/DNS уровне
  └── Отозвать OAuth токены (если OAuth phishing)

□ Если скачали и запустили файл:
  ├── ПЕРЕЙТИ К MALWARE PLAYBOOK
  ├── Изолировать хост немедленно
  └── Сбросить учётные данные

□ Если ввели пароль:
  ├── Немедленно сбросить пароль
  ├── Завершить все активные сессии
  ├── Включить/проверить MFA
  ├── Проверить исходящую почту (нет ли спам-рассылки)
  └── Проверить правила пересылки почты (mail forwarding rules)
```

### ШАГ 5: Коммуникация

```
□ Уведомить пострадавших пользователей:

ШАБЛОН ПИСЬМА ПОЛЬЗОВАТЕЛЮ:
─────────────────────────────────────────────────────────────
Тема: [ВАЖНО] Phishing письмо — требуются ваши действия

Добрый день, [Имя],

Наш отдел безопасности обнаружил, что вы получили фишинговое
письмо от [отправитель].

ПОЖАЛУЙСТА, СДЕЛАЙТЕ СЛЕДУЮЩЕЕ:
1. НЕ открывайте письмо если оно ещё не открыто
2. НЕ переходите по ссылкам в письме
3. НЕ открывайте вложения

[ЕСЛИ ВЫ УЖЕ КЛИКНУЛИ]:
Немедленно свяжитесь с нами: security@company.com / тел.

Мы расследуем ситуацию и защищаем вас.

С уважением,
SOC Team
─────────────────────────────────────────────────────────────

□ Если массовая атака → уведомить всех сотрудников
□ Если VIP/C-Level → немедленная эскалация CISO
□ Если ввели данные → уведомить HR для поддержки сотрудника
```

---

## 7.2.3 Плейбук: Заражение Malware

```
═══════════════════════════════════════════════════════════════
ПЛЕЙБУК: ЗАРАЖЕНИЕ MALWARE
Версия: 3.0 | Обновлено: 2024-01 | Автор: SOC Team
Критичность по умолчанию: P1 (при подтверждении активного заражения)
═══════════════════════════════════════════════════════════════
```

### ТРИГГЕРЫ

```
├── EDR: malware detected (AV alert)
├── EDR: suspicious process execution
├── SIEM: C2 communication detected (known bad IP/domain)
├── SIEM: mass file rename (ransomware pattern)
├── SIEM: LSASS memory dump (credential theft)
├── Пользователь: компьютер работает странно
└── Threat Hunting: обнаружена подозрительная активность
```

### ШАГ 1: Немедленная оценка (0-5 минут)

```
КРИТИЧЕСКИЙ ВОПРОС: Это активная угроза или обезвреженная?

АКТИВНАЯ УГРОЗА (P1 — действуй немедленно):
  ├── Malware запущен и активен (активные сетевые соединения, C2)
  ├── Признаки распространения (lateral movement)
  ├── Начинается шифрование файлов
  └── Видны признаки эксфильтрации данных

НЕЙТРАЛИЗОВАННАЯ (P2 — есть время разобраться):
  ├── AV обнаружил и удалил
  ├── Файл загружен, но не запущен
  └── Детекция без активной активности

→ При АКТИВНОЙ угрозе: немедленно к Шагу 2 (изоляция)
→ При нейтрализованной: начать с анализа, затем изоляция
```

### ШАГ 2: НЕМЕДЛЕННАЯ ИЗОЛЯЦИЯ (если активная угроза)

```bash
# Через EDR (CrowdStrike Falcon):
# Dashboard → Hosts → [хост] → Contain

# Через EDR (Microsoft Defender):
# Security Center → Incidents → [хост] → Isolate device

# Сетевая изоляция (если нет EDR):
# На управляемом коммутаторе:
interface GigabitEthernet0/1
  description "INFECTED-HOST-WS01"
  shutdown
  ! или перевести в quarantine VLAN:
  switchport access vlan 999

# VLAN 999 — quarantine (нет доступа к сети, только к IR-инфраструктуре)

# ВАЖНО: НЕ ВЫКЛЮЧАТЬ КОМПЬЮТЕР
# Дамп памяти сначала:
# Windows:
winpmem_mini_x64.exe \\server\ir-share\memory_WS01.raw
# Linux:
dd if=/proc/kcore of=/mnt/share/memory_server01.raw
```

### ШАГ 3: Сбор форензических данных (15-60 минут)

```powershell
# Windows — быстрый сбор артефактов (запустить от admin)

# 1. Запущенные процессы
Get-Process | Select-Object Name, Id, CPU, StartTime, Path |
    Export-Csv C:\IR\processes.csv -NoTypeInformation

# 2. Сетевые соединения
Get-NetTCPConnection | Select-Object LocalAddress, LocalPort,
    RemoteAddress, RemotePort, State, OwningProcess |
    Export-Csv C:\IR\netconn.csv -NoTypeInformation

# 3. Соединения с именами процессов
netstat -b -n > C:\IR\netstat.txt

# 4. Автозагрузка
Get-CimInstance Win32_StartupCommand | Export-Csv C:\IR\startup.csv

# 5. Службы
Get-Service | Where-Object {$_.Status -eq "Running"} |
    Export-Csv C:\IR\services.csv

# 6. Scheduled Tasks
Get-ScheduledTask | Where-Object {$_.State -ne "Disabled"} |
    Export-Csv C:\IR\tasks.csv

# 7. Recent files
Get-ChildItem -Path C:\ -Recurse -ErrorAction SilentlyContinue |
    Where-Object {$_.LastWriteTime -gt (Get-Date).AddDays(-7)} |
    Sort-Object LastWriteTime -Descending |
    Select-Object FullName, Length, LastWriteTime |
    Export-Csv C:\IR\recent_files.csv -NoTypeInformation

# 8. Event Logs (ключевые)
Get-EventLog -LogName Security -Newest 1000 |
    Export-Csv C:\IR\security_events.csv

# 9. Registry Run keys (persistence)
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"

# 10. DNS кэш (часто показывает C2)
Get-DnsClientCache | Export-Csv C:\IR\dns_cache.csv
```

```bash
# Linux — быстрый сбор артефактов

mkdir /tmp/ir_evidence && cd /tmp/ir_evidence

# Запущенные процессы
ps aux > processes.txt
ls -la /proc/*/exe 2>/dev/null >> processes.txt

# Сетевые соединения
netstat -anlp > netstat.txt
ss -tulpn > ss_output.txt

# Открытые файлы
lsof > lsof.txt

# Последние логины
last > last_logins.txt
lastlog > lastlog.txt

# Cron задачи
for user in $(cut -f1 -d: /etc/passwd); do
    crontab -u $user -l 2>/dev/null && echo "--- $user ---"
done > crontabs.txt

# Изменённые файлы за последние 24 часа
find / -mtime -1 -type f 2>/dev/null > recently_modified.txt

# Новые пользователи/SUID
awk -F: '$3 >= 1000' /etc/passwd > users.txt
find / -perm -4000 2>/dev/null > suid_files.txt

# Загруженные модули ядра
lsmod > kernel_modules.txt

# Сетевые правила
iptables -L -n -v > iptables.txt

# История команд
cat ~/.bash_history > bash_history.txt

echo "[+] Evidence collected in /tmp/ir_evidence"
ls -la
```

### ШАГ 4: Анализ malware

```
СТАТИЧЕСКИЙ АНАЛИЗ (без запуска):
├── Проверить хэш в VirusTotal
├── PEStudio: импорты DLL, строки, entropy
├── strings: читаемые строки в бинарнике
└── file: тип файла (может быть переименован)

ДИНАМИЧЕСКИЙ АНАЛИЗ (запуск в изоляции):
├── Отправить в Any.run / Joe Sandbox
├── Cuckoo Sandbox (если есть своя)
└── Windows Sandbox (изолированная среда)

АНАЛИЗ ПОВЕДЕНИЯ (по логам):
├── Что запустил? (child processes)
├── Куда подключился? (network connections)
├── Что изменил? (file system, registry)
└── Что прочитал? (file access)
```

```bash
# Быстрый статический анализ подозрительного файла

SUSPICIOUS_FILE="suspicious.exe"

echo "=== FILE TYPE ==="
file "$SUSPICIOUS_FILE"

echo "=== HASHES ==="
md5sum "$SUSPICIOUS_FILE"
sha256sum "$SUSPICIOUS_FILE"

echo "=== STRINGS ==="
strings "$SUSPICIOUS_FILE" | grep -E "(http|\.com|\.net|\.ru|cmd|powershell|registry|password)" -i | head -30

echo "=== ENTROPY ==="
# Высокая энтропия → упаковано/зашифровано (признак malware)
python3 -c "
import math, sys

def entropy(data):
    if not data:
        return 0
    freq = {}
    for byte in data:
        freq[byte] = freq.get(byte, 0) + 1
    size = len(data)
    return -sum((count/size) * math.log2(count/size) for count in freq.values())

with open('$SUSPICIOUS_FILE', 'rb') as f:
    data = f.read()
e = entropy(data)
print(f'Entropy: {e:.2f}/8.00 (>7.0 = likely packed/encrypted)')
"

echo "=== VIRUSTOTAL CHECK ==="
HASH=$(sha256sum "$SUSPICIOUS_FILE" | cut -d' ' -f1)
curl -s "https://www.virustotal.com/api/v3/files/$HASH" \
     -H "x-apikey: $VT_API_KEY" | \
     python3 -c "
import sys, json
d = json.load(sys.stdin)
try:
    stats = d['data']['attributes']['last_analysis_stats']
    print(f'Malicious: {stats[\"malicious\"]}/{sum(stats.values())}')
except:
    print('File not found in VT (new sample)')
"
```

### ШАГ 5: Определение масштаба (Lateral Movement)

```
ПРОВЕРИТЬ LATERAL MOVEMENT:

Event ID 4624 (успешный вход) с типом Logon Type 3 (сеть) или 10 (remote):
SPL: index=wineventlog EventCode=4624 Logon_Type IN (3,10)
     | search src_ip=192.168.1.105  ← IP заражённой машины
     | table _time, dest, user

Event ID 4648 (вход с explicit credentials):
SPL: index=wineventlog EventCode=4648 src_workstation=WS01

SMB lateral movement (PsExec pattern):
SPL: index=wineventlog EventCode=7045 ImagePath="*\\PSEXESVC*"

WMI lateral movement:
SPL: index=wineventlog source="WinEventLog:Microsoft-Windows-WMI-Activity/Operational"
     EventCode=5857 OR EventCode=5861
```

### ШАГ 6: IOC Hunting

```python
#!/usr/bin/env python3
# ioc_hunt.py — поиск IOC по всей сети через SIEM API

IOC_LIST = {
    "ips": ["185.220.101.47", "91.108.56.23"],
    "domains": ["malware-c2.net", "update-checker.com"],
    "hashes": ["abc123def456...", "sha256hashhere..."],
    "file_paths": [r"C:\Users\Public\update.exe", "/tmp/.hidden"]
}

# Пример Splunk поиска через API
import requests

SPLUNK_URL = "https://splunk.company.local:8089"
SPLUNK_TOKEN = "YOUR_TOKEN"

def splunk_search(query, earliest="-7d", latest="now"):
    job_response = requests.post(
        f"{SPLUNK_URL}/services/search/jobs",
        headers={"Authorization": f"Bearer {SPLUNK_TOKEN}"},
        data={
            "search": f"search {query}",
            "earliest_time": earliest,
            "latest_time": latest
        },
        verify=False
    )
    job_id = job_response.json()["sid"]

    # Ждём результаты (упрощённо)
    import time
    time.sleep(5)

    results = requests.get(
        f"{SPLUNK_URL}/services/search/jobs/{job_id}/results",
        headers={"Authorization": f"Bearer {SPLUNK_TOKEN}"},
        params={"output_mode": "json"},
        verify=False
    )
    return results.json()

# Поиск C2 соединений
for ip in IOC_LIST["ips"]:
    query = f'index=network dest_ip="{ip}" | stats count by src_ip'
    results = splunk_search(query)
    if results.get("results"):
        print(f"[!] Found connections to C2 {ip}:")
        for r in results["results"]:
            print(f"   Host {r['src_ip']}: {r['count']} connections")

# Поиск по хэшам
for file_hash in IOC_LIST["hashes"]:
    query = f'index=sysmon EventCode=1 Hashes="*{file_hash}*" | stats count by ComputerName'
    results = splunk_search(query)
    if results.get("results"):
        print(f"[!] File hash {file_hash[:16]}... found on:")
        for r in results["results"]:
            print(f"   {r['ComputerName']}: {r['count']} times")
```

### ШАГ 7: Ликвидация и восстановление

```
ЛИКВИДАЦИЯ:
□ Удалить malware файлы (после создания образа!)
□ Очистить persistence:
  ├── Registry Run keys
  ├── Scheduled Tasks
  ├── Services (sc delete malware_service)
  └── WMI subscriptions
□ Удалить backdoor-аккаунты
□ Сбросить пароли скомпрометированных аккаунтов
□ Ротировать API ключи и сервисные учётные записи

ВОССТАНОВЛЕНИЕ:
□ Проверить целостность системы (SFC /scannow на Windows)
□ Применить недостающие патчи
□ Hardening конфигурации
□ Полное сканирование EDR
□ Подтверждение чистоты от двух независимых инструментов
□ Постепенный ввод в эксплуатацию с усиленным мониторингом
```

---

## 7.2.4 Плейбук: Брутфорс-атака

```
═══════════════════════════════════════════════════════════════
ПЛЕЙБУК: БРУТФОРС-АТАКА (BRUTEFORCE / CREDENTIAL STUFFING)
Версия: 2.0 | Обновлено: 2024-01 | Автор: SOC Team
Критичность по умолчанию: P2 (P1 при успешном входе)
═══════════════════════════════════════════════════════════════
```

### ТРИГГЕРЫ

```
├── SIEM: >10 failed logins from one IP in 5 minutes (брутфорс)
├── SIEM: >100 failed logins across multiple accounts (credential stuffing)
├── SIEM: failed logins + successful login (компрометация!)
├── SIEM: login from TOR/VPN/datacenter IP
└── SIEM: Geographic impossibility (вход из RU, затем сразу из US)
```

### SIEM-правила для обнаружения

```
# Splunk — обнаружение брутфорса по Windows (Event 4625)
index=wineventlog EventCode=4625
| bucket _time span=5m
| stats count as failed_attempts, dc(Account_Name) as unique_accounts
  by _time, src_ip
| where failed_attempts > 10
| sort - failed_attempts

# Splunk — обнаружение credential stuffing (много аккаунтов с одного IP)
index=wineventlog EventCode=4625
| stats dc(Account_Name) as unique_users, count as attempts by src_ip
| where unique_users > 20
| sort - attempts

# Splunk — Golden pattern: failed + success (почти гарантированная компрометация)
index=wineventlog EventCode=4625 OR EventCode=4624
| eval status=if(EventCode=4624, "success", "failed")
| stats values(status) as statuses, dc(Account_Name) as users by src_ip
| where mvfind(statuses, "success") >= 0 AND mvfind(statuses, "failed") >= 0
| search users > 5
| sort - users

# ELK (KQL) — failed SSH logins
event.code: "4625" AND winlog.event_data.SubStatus: "0xC000006A"
| date_histogram interval:5m
| stats count by source.ip
| having count > 10

# ELK — брутфорс SSH (из /var/log/auth.log)
message: "Failed password" AND host.name: *
| date_histogram interval:5m
| stats count by source.ip
```

### ШАГ 1: Оценка ситуации (0-10 минут)

```python
#!/usr/bin/env python3
# brute_force_triage.py — первичный анализ брутфорса

def triage_brute_force(alert_data):
    """
    Оценка критичности брутфорс-атаки
    """
    src_ip = alert_data["src_ip"]
    target = alert_data["target"]
    failed_count = alert_data["failed_count"]
    has_success = alert_data.get("successful_login", False)
    targeted_user = alert_data.get("username", "multiple")
    service = alert_data.get("service", "unknown")  # SSH, RDP, VPN, Web

    print(f"=== BRUTE FORCE TRIAGE ===")
    print(f"Source IP: {src_ip}")
    print(f"Target: {target} ({service})")
    print(f"Failed attempts: {failed_count}")
    print(f"User(s): {targeted_user}")
    print()

    # Критическая ситуация
    if has_success:
        print("🔴 CRITICAL: Successful login after brute force!")
        print("→ Immediate actions required:")
        print("  1. Disable/lock the account NOW")
        print("  2. Terminate active sessions")
        print("  3. Check what attacker did after login")
        print("  4. Escalate to P1")
        return "P1"

    # Высокая критичность
    high_value_services = ["VPN", "RDP", "SSH", "admin", "root"]
    if any(svc in service for svc in high_value_services) or failed_count > 100:
        print("🟠 HIGH: High-value target or high volume attack")
        print("→ Actions:")
        print("  1. Block source IP immediately")
        print("  2. Check if other IPs doing same attack (distributed?)")
        print("  3. Enable account lockout if not enabled")
        return "P2"

    # Средняя критичность
    print("🟡 MEDIUM: Standard brute force")
    print("→ Actions:")
    print("  1. Block source IP at firewall")
    print("  2. Review account lockout policy")
    print("  3. Check geo-origin of IP")
    return "P3"
```

### ШАГ 2: Анализ атаки

```bash
# Анализ брутфорса на Linux SSH (auth.log)

LOG_FILE="/var/log/auth.log"
THRESHOLD=10
PERIOD="5 minutes"

echo "=== TOP ATTACKING IPs ==="
grep "Failed password" "$LOG_FILE" | \
    awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head -20

echo ""
echo "=== TARGETED USERNAMES ==="
grep "Failed password" "$LOG_FILE" | \
    awk '{print $(NF-5)}' | sort | uniq -c | sort -rn | head -20

echo ""
echo "=== ATTACK TIMELINE ==="
grep "Failed password" "$LOG_FILE" | \
    awk '{print $1, $2}' | sort | uniq -c | head -20

echo ""
echo "=== SUCCESSFUL LOGINS TO CHECK ==="
grep "Accepted password\|Accepted publickey" "$LOG_FILE" | tail -20

# Проверить геолокацию атакующего IP
ATTACK_IP="1.2.3.4"  # Подставить реальный IP

echo ""
echo "=== IP GEOLOCATION ==="
curl -s "http://ip-api.com/json/$ATTACK_IP" | python3 -m json.tool

echo ""
echo "=== IP REPUTATION (AbuseIPDB) ==="
curl -s "https://api.abuseipdb.com/api/v2/check?ipAddress=$ATTACK_IP" \
     -H "Key: YOUR_API_KEY" | python3 -m json.tool
```

### ШАГ 3: Сдерживание

```bash
# Блокировка атакующего IP (несколько методов)

ATTACK_IP="1.2.3.4"

# Метод 1: iptables
iptables -I INPUT -s "$ATTACK_IP" -j DROP
iptables -I OUTPUT -d "$ATTACK_IP" -j DROP
iptables-save > /etc/iptables/rules.v4
echo "[+] Blocked via iptables: $ATTACK_IP"

# Метод 2: fail2ban (если уже настроен)
fail2ban-client set sshd banip "$ATTACK_IP"
echo "[+] Banned via fail2ban: $ATTACK_IP"

# Метод 3: /etc/hosts.deny
echo "ALL: $ATTACK_IP" >> /etc/hosts.deny
echo "[+] Denied via hosts.deny: $ATTACK_IP"

# Метод 4: Временная блокировка через ssh
echo "$ATTACK_IP" >> /etc/ssh/sshd_blocklist
# Добавить в sshd_config: DenyUsers from $ATTACK_IP

# Блокировка диапазона (если распределённая атака)
# Получить AS/подсеть атакующего
whois "$ATTACK_IP" | grep -i "CIDR\|NetRange\|route"
# Заблокировать всю подсеть:
# iptables -I INPUT -s 1.2.3.0/24 -j DROP

# Windows: блокировка через Windows Firewall PowerShell
# New-NetFirewallRule -Name "Block-BruteForce-IP" `
#     -Direction Inbound -Action Block `
#     -RemoteAddress "$ATTACK_IP"
```

### ШАГ 4: Если успешный вход (компрометация)

```
ЕСЛИ ОБНАРУЖЕН УСПЕШНЫЙ ВХОД ПОСЛЕ БРУТФОРСА:

□ НЕМЕДЛЕННО (0-5 минут):
  ├── Заблокировать учётную запись
  │   Active Directory: Disable-ADAccount -Identity username
  │   Linux: usermod -L username
  │   Web приложение: заблокировать в базе данных
  │
  ├── Завершить все активные сессии
  │   Windows: quser → logoff /server:SERVER SESSION_ID
  │   Linux: pkill -u username
  │   Web: invalidate all sessions в Redis/DB
  │
  └── Сбросить пароль (с уведомлением пользователя)

□ АНАЛИЗ (5-30 минут):
  ├── Что делал атакующий после входа?
  │   Windows Event 4688 (process creation) от этого пользователя
  │   Linux: grep username /var/log/auth.log + ~/.bash_history
  │
  ├── Были ли скачаны/скопированы данные?
  │   Проверить DLP логи
  │   Проверить исходящий трафик с этого IP
  │
  ├── Создал ли атакующий backdoor-аккаунт?
  │   Windows Event 4720 (account created)
  │   Linux: grep "useradd\|adduser" /var/log/auth.log
  │
  └── Было ли privilege escalation?
      Windows Event 4672 (special privileges)
      Linux: sudo history, su история

□ УВЕДОМЛЕНИЯ:
  ├── Пользователь: объяснить, что произошло
  ├── Менеджер пользователя: информировать
  ├── IT: помочь пользователю сменить пароль и настроить MFA
  └── CISO: если затронуты данные
```

### ШАГ 5: Превентивные меры

```
ПОСЛЕ ИНЦИДЕНТА — СНИЗИТЬ РИСК ПОВТОРЕНИЯ:

Технические меры:
├── Включить Account Lockout Policy
│   GPO: Computer Config → Security Settings → Account Lockout Policy
│   Lockout threshold: 5 неудачных попыток
│   Lockout duration: 30 минут
│   Reset counter after: 15 минут
│
├── Настроить fail2ban (Linux)
│   /etc/fail2ban/jail.local:
│   [sshd]
│   enabled = true
│   maxretry = 5
│   bantime = 3600
│
├── Включить MFA для всех привилегированных аккаунтов
│
├── Изменить нестандартные порты (SSH с 22 на 2222)
│   (security through obscurity, но снижает шум от сканеров)
│
├── Ограничить источники входа
│   VPN → SSH: только из корпоративной сети
│   RDP: только через VPN или Jump-сервер
│
└── Внедрить GeoIP блокировку для нетипичных стран

Организационные меры:
├── Тренинг по сильным паролям (passphrase!)
├── Password Manager для всех сотрудников
├── Политика смены паролей (не reuse!)
└── Проверка паролей на утечки (haveibeenpwned)
```

---

## 7.2.5 Автоматизация плейбуков через SOAR

### Что такое SOAR

**SOAR (Security Orchestration, Automation and Response)** — платформа для автоматизации реагирования на инциденты. Позволяет выполнять плейбуки автоматически без участия аналитика.

```
БЕЗ SOAR:                    С SOAR:
Алерт → Аналитик →           Алерт → SOAR →
вручную проверяет VirusTotal   автоматически: VirusTotal + AbuseIPDB +
→ вручную блокирует IP         Shodan → если плохой IP → автоблокировка →
→ вручную создаёт тикет        создание тикета → уведомление → escalation
→ уведомляет

Время: 30-60 минут            Время: < 1 минуты
```

### Пример SOAR Playbook (Splunk SOAR)

```python
#!/usr/bin/env python3
# Пример автоматического плейбука для SOAR (Phantom/Splunk SOAR)
# Реальный синтаксис зависит от платформы (Palo Alto XSOAR, Splunk SOAR, TheHive Cortex)

import phantom.rules as phantom
import json

def on_start(container):
    """Срабатывает при создании нового алерта"""
    phantom.debug("Phishing playbook started")

    # Получаем данные из алерта
    url = container.get("artifacts", [{}])[0].get("cef", {}).get("destinationUrl", "")
    sender_ip = container.get("artifacts", [{}])[0].get("cef", {}).get("sourceAddress", "")

    if url:
        check_url_vt(url, container)
    if sender_ip:
        check_ip_abuseipdb(sender_ip, container)

def check_url_vt(url, container):
    """Проверка URL в VirusTotal"""
    phantom.act(
        action="url reputation",
        parameters=[{"url": url}],
        assets=["virustotal"],
        callback=handle_vt_result,
        name="check_url_vt"
    )

def handle_vt_result(action=None, success=None, container=None, results=None, **kwargs):
    """Обработка результата VirusTotal"""
    if not success:
        return

    data = results[0].get("data", {})
    malicious_count = data.get("attributes", {}).get(
        "last_analysis_stats", {}
    ).get("malicious", 0)

    if malicious_count > 3:
        # Автоматически блокируем
        phantom.act(
            action="block url",
            parameters=[{"url": data.get("url")}],
            assets=["zscaler"],  # или другой прокси
            name="block_malicious_url"
        )

        # Создаём задачу для аналитика
        phantom.add_note(
            container=container,
            note_type="general",
            title="URL заблокирован автоматически",
            content=f"VirusTotal: {malicious_count} антивирусов определили URL как вредоносный. URL заблокирован на Zscaler."
        )

        # Эскалация если нужно
        if malicious_count > 10:
            phantom.promote(container, message="Highly malicious URL detected - escalation required")
    else:
        phantom.add_note(
            container=container,
            note_type="general",
            title="URL проверен",
            content=f"VirusTotal: {malicious_count} детекций. Дополнительная проверка не требуется."
        )

def on_finish(container, summary):
    phantom.debug(f"Playbook finished. Summary: {summary}")
```

### Популярные SOAR платформы

| Платформа | Вендор | Особенности |
|-----------|--------|-------------|
| **Splunk SOAR** (Phantom) | Splunk | Мощный, Python-плейбуки |
| **Palo Alto XSOAR** | Palo Alto | Интеграция с Cortex XDR |
| **TheHive + Cortex** | StrangeBee | Open-source, гибкий |
| **IBM SOAR** (Resilient) | IBM | Enterprise, хорошая аналитика |
| **Microsoft Sentinel** | Microsoft | Cloud-native, Logic Apps |
| **Siemplify** (Google) | Google/Chronicle | Хорошая визуализация |

---

## 📌 Итоги главы

- Плейбук — стандартизированный алгоритм реагирования на конкретный тип инцидента
- **Фишинг**: ключевые шаги — анализ заголовков, проверка IOC, определение кликов, очистка почтовых ящиков
- **Malware**: НИКОГДА не выключать (теряем RAM), сначала изолировать, потом анализировать
- **Брутфорс**: ключевой сигнал — failed logins + success = компрометация
- SOAR автоматизирует рутинные шаги плейбука: обогащение данных, блокировки, создание тикетов
- Хороший плейбук = конкретные шаги + шаблоны коммуникации + чеклисты + SLA

---

## 🏠 Домашнее задание

1. **Базовый уровень:** Напишите плейбук для реагирования на DDoS-атаку. Используйте структуру из раздела 7.2.1. Минимум 5 конкретных шагов с командами.

2. **Средний уровень:** Установите Splunk Free (splunk.com/download) и создайте поисковое правило для обнаружения брутфорса по SSH (Event 4625 или /var/log/auth.log).

3. **Продвинутый уровень:** Настройте TheHive + Cortex (Docker Compose). Создайте анализатор, который автоматически проверяет IP в AbuseIPDB при создании тикета.

4. **Практика:** На TryHackMe пройдите комнату "Phishing Analysis" или "Incident Response". Задокументируйте процесс по шаблону плейбука.

---

## 🔗 Полезные ресурсы

| Ресурс | URL | Описание |
|--------|-----|----------|
| Incident Response Consortium | incidentresponse.com | Библиотека плейбуков |
| CISA Playbooks | cisa.gov/sites/default/files | Официальные плейбуки CISA |
| Splunk SOAR | splunk.com/en_us/products/soar | Документация SOAR |
| TheHive Project | docs.strangebee.com | Документация TheHive |
| PhishTool | phishtool.com | Анализ фишинговых писем |
