# Шпаргалка: Event ID и IOC

> Быстрый справочник по Event ID Windows и индикаторам компрометации

---

## Windows Event ID — критические для SOC

### Аутентификация и авторизация

| Event ID | Описание | Важность | Где смотреть |
|----------|----------|----------|--------------|
| **4624** | Успешный вход | Высокая | Security |
| **4625** | Неудачный вход | Высокая | Security |
| **4634** | Выход из системы | Средняя | Security |
| **4647** | Инициирован выход пользователем | Средняя | Security |
| **4648** | Вход с явными учётными данными | Критическая | Security |
| **4672** | Специальные привилегии при входе | Критическая | Security |
| **4776** | Проверка учётных данных (NTLM) | Высокая | Security |
| **4768** | Запрос TGT Kerberos | Высокая | DC Security |
| **4769** | Запрос сервисного билета Kerberos | Высокая | DC Security |
| **4771** | Неудача предаутентификации Kerberos | Высокая | DC Security |

```
ТИПЫ ВХОДА (Logon Type) для Event 4624:
2  = Interactive (физический вход)
3  = Network (SMB, mapped drives)
4  = Batch (scheduled tasks)
5  = Service (запуск сервиса)
7  = Unlock (разблокировка)
8  = NetworkCleartext (BasicAuth, WinRM)
9  = NewCredentials (runas)
10 = RemoteInteractive (RDP, Terminal Services) ← Важно!
11 = CachedInteractive
```

### Управление учётными записями

| Event ID | Описание | Важность |
|----------|----------|----------|
| **4720** | Создана учётная запись пользователя | Критическая |
| **4722** | Учётная запись активирована | Высокая |
| **4723** | Пользователь сменил пароль | Высокая |
| **4724** | Пользователю сброшен пароль (Admin) | Критическая |
| **4725** | Учётная запись заблокирована | Высокая |
| **4726** | Учётная запись удалена | Критическая |
| **4728** | Добавление в глобальную группу | Критическая |
| **4729** | Удаление из глобальной группы | Высокая |
| **4732** | Добавление в локальную группу | Критическая |
| **4733** | Удаление из локальной группы | Высокая |
| **4756** | Добавление в универсальную группу | Критическая |
| **4740** | Блокировка учётной записи | Высокая |

### Процессы и выполнение кода

| Event ID | Описание | Важность |
|----------|----------|----------|
| **4688** | Создание нового процесса | Высокая |
| **4689** | Завершение процесса | Средняя |
| **4103** | PowerShell: выполнение модуля | Высокая |
| **4104** | PowerShell: ScriptBlock Logging | Критическая |

```
SPL запрос для suspicious processes (Splunk):
index=wineventlog EventCode=4688
| where CommandLine in ("*powershell*", "*cmd*", "*wscript*", "*cscript*")
| where ParentProcessName in ("*outlook*", "*winword*", "*excel*")
| table _time, ComputerName, ParentProcessName, ProcessName, CommandLine
```

### Сервисы и задачи

| Event ID | Описание | Важность |
|----------|----------|----------|
| **7034** | Сервис неожиданно завершился | Средняя |
| **7036** | Сервис вошёл в статус Running/Stopped | Средняя |
| **7040** | Изменён тип запуска сервиса | Высокая |
| **7045** | Установлен новый сервис | Критическая |
| **4698** | Создана Scheduled Task | Критическая |
| **4699** | Scheduled Task удалена | Высокая |
| **4700** | Scheduled Task включена | Высокая |
| **4702** | Scheduled Task изменена | Высокая |

### Объекты и политика

| Event ID | Описание | Важность |
|----------|----------|----------|
| **4663** | Попытка доступа к объекту | Средняя |
| **4670** | Изменены права объекта | Высокая |
| **4946** | Добавлено правило в Windows Firewall | Высокая |
| **4947** | Изменено правило Windows Firewall | Высокая |
| **1102** | Очищен журнал Security | Критическая |
| **104** | Очищен System Event Log | Критическая |

### Windows Defender и защита

| Event ID | Описание | Важность |
|----------|----------|----------|
| **1116** | Обнаружена вредоносная программа | Критическая |
| **1117** | Выполнено действие против malware | Высокая |
| **5001** | Изменена конфигурация Defender | Критическая |
| **5007** | Изменена политика Defender | Критическая |

### Сеть и RDP

| Event ID | Описание | Источник |
|----------|----------|----------|
| **4778** | Переподключение к сессии | Security |
| **4779** | Отключение от сессии | Security |
| **21** | RDP сессия успешно создана | TerminalServices |
| **23** | RDP сессия завершена | TerminalServices |
| **25** | RDP сессия восстановлена | TerminalServices |

---

## Корреляции — подозрительные паттерны

### Брутфорс-атака

```
SIEM правило: Брутфорс SSH/RDP
───────────────────────────────────────────────────────
Триггер: >10 событий 4625 с одного IP за 5 минут
Severity: P2 (High)

Splunk SPL:
index=wineventlog EventCode=4625
| bucket _time span=5m
| stats count as failed by _time, src_ip
| where failed > 10
| sort -failed

Elasticsearch:
{
  "query": {"term": {"event.code": "4625"}},
  "aggs": {"by_ip": {"terms": {"field": "source.ip"},
    "aggs": {"per_5min": {"date_histogram": {"field": "@timestamp",
      "fixed_interval": "5m"},
      "aggs": {"count": {"value_count": {"field": "_id"}},
        "bucket_selector": {"buckets_path": {"count": "count"},
          "script": "params.count > 10"}}}}}}
}
```

### Credential Stuffing

```
SIEM правило: Много аккаунтов с одного IP
───────────────────────────────────────────────────────
Триггер: >20 уникальных аккаунтов с одного IP за 10 минут

Splunk SPL:
index=wineventlog EventCode=4625
| bucket _time span=10m
| stats dc(Account_Name) as unique_users, count as attempts by _time, src_ip
| where unique_users > 20
| sort -unique_users
```

### Успешный вход после брутфорса (компрометация)

```
КРИТИЧЕСКОЕ правило: Compromised Account
───────────────────────────────────────────────────────
Триггер: 4625 (failed) + 4624 (success) с одного IP
Severity: P1 (Critical)

Splunk SPL:
index=wineventlog (EventCode=4625 OR EventCode=4624)
| eval status=if(EventCode=4624,"success","failed")
| stats values(status) as statuses, dc(Account_Name) as users by src_ip
| where mvfind(statuses,"success") >= 0 AND mvfind(statuses,"failed") >= 0
| where users > 3
| sort -users
```

### Lateral Movement (Pass-the-Hash)

```
SIEM правило: Pass-the-Hash паттерн
───────────────────────────────────────────────────────
Признаки:
- 4624 Logon Type 3 (Network)
- NTLM авторизация (не Kerberos)
- Anonymous → Network logon
- Event 4648 (explicit credentials)

Splunk SPL:
index=wineventlog EventCode=4624 Logon_Type=3
    Authentication_Package="NTLM"
| stats count, values(dest_host) as targets by src_host, Account_Name
| where count > 5 AND mvcount(targets) > 2
| sort -count
```

### Suspicious PowerShell

```
SIEM правило: Encoded PowerShell (обфускация)
───────────────────────────────────────────────────────
Splunk SPL:
index=wineventlog EventCode=4688
| where match(CommandLine, "(?i)(powershell|pwsh)")
| where match(CommandLine, "(?i)(-enc|-encodedcommand|-ec\s)")
| table _time, ComputerName, ParentProcessName, CommandLine
| sort -_time

Подозрительные PowerShell признаки:
- -enc / -encodedcommand (обфускация)
- IEX / Invoke-Expression (выполнение строки)
- DownloadString / WebClient (загрузка из интернета)
- -NoProfile -WindowStyle Hidden (скрытый запуск)
- Bypass -ExecutionPolicy (обход политики)
```

### Persistence (Автозапуск)

```
SIEM правило: Новый элемент автозапуска
───────────────────────────────────────────────────────
Splunk SPL:
index=wineventlog EventCode=4688
| where match(ProcessName, "(?i)(schtasks|taskeng|at\.exe)")
| table _time, ComputerName, User, CommandLine

# Альтернативно через Registry (Sysmon EventID 13):
index=sysmon EventCode=13
    TargetObject="*\\CurrentVersion\\Run*"
| table _time, ComputerName, Image, TargetObject, Details
```

### Ransomware (Mass File Rename)

```
SIEM правило: Ransomware (массовое переименование)
───────────────────────────────────────────────────────
Splunk SPL (Sysmon EventID 11 - FileCreate):
index=sysmon EventCode=11
| bucket _time span=1m
| stats count as file_events, dc(TargetFilename) as unique_files by _time, ComputerName, Image
| where file_events > 100
| sort -file_events

# Или через EDR: массовое создание файлов с новым расширением
# Признаки: .locked, .encrypted, .enc, .wnry, .WNCRY
```

---

## Linux Audit Logs — ключевые события

```bash
# /var/log/auth.log ключевые паттерны:

# Успешный вход SSH
grep "Accepted password" /var/log/auth.log
grep "Accepted publickey" /var/log/auth.log

# Неудачный вход SSH
grep "Failed password" /var/log/auth.log
grep "Invalid user" /var/log/auth.log

# sudo использование
grep "sudo:" /var/log/auth.log | grep "COMMAND"

# Создание/изменение пользователей
grep "useradd\|adduser\|usermod" /var/log/auth.log

# auditd (если настроен)
ausearch -k privilege_escalation
ausearch -k sudo_log
ausearch -k user_change
ausearch -ua root -ts recent

# ausearch для команд
ausearch -c bash
ausearch -f /etc/passwd
```

---

## IOC (Indicators of Compromise) — типы и признаки

### Типы IOC

```
ИЕРАРХИЯ IOC (по стабильности):

НЕСТАБИЛЬНЫЕ (атакующий меняет легко):
├── IP адреса C2 серверов          ← Меняются постоянно
└── Домены C2                       ← Меняются часто

УМЕРЕННО СТАБИЛЬНЫЕ:
├── URL паттерны                    ← Меняются редко
├── Имена файлов                    ← Меняются редко
└── Хэши файлов (MD5/SHA256)        ← Уникальны для версии

СТАБИЛЬНЫЕ (атакующему сложно изменить):
├── Mutex имена                     ← Остаются в коде
├── Сетевые протоколы/паттерны     ← Требуют переписки
├── Поведенческие паттерны          ← Характерны для группы
└── Техники MITRE ATT&CK            ← Почерк APT группы

ПИРАМИДА БОЛИ (David Bianco):
     Самое болезненное для атакующего изменить:
     △ TTP (Tactics, Techniques, Procedures)
    △△ Tools
   △△△ Network/Host Artifacts
  △△△△ Domain Names
 △△△△△ IP Addresses
△△△△△△ Hash Values
     Наименее болезненное
```

### Сетевые IOC

```
СЕТЕВЫЕ ПРИЗНАКИ C2 ТРАФИКА:

Паттерны:
├── Регулярные "маяки" (beaconing): соединение каждые N минут
├── Нестандартные порты (4444, 8888, 31337, 1234)
├── TLS на нестандартных портах
├── Большие DNS запросы (DNS exfiltration)
├── Очень длинные User-Agent строки
├── User-Agent не совпадает с браузером хоста
└── HTTP на нестандартных URI паттернах

DNS флаги:
├── Запросы к DGA-генерируемым доменам (случайные имена)
├── Высокая частота DNS запросов к одному домену
├── TXT записи с большим объёмом данных
└── CNAME цепочки к CDN (Cloudflare, Fastly)

IP флаги:
├── Подключения к Tor exit nodes
├── Подключения к bulletproof хостингу
├── Подключения к известным VPN/анонимайзерам
├── Геолокация несовместима с бизнесом
└── ASN принадлежащий хостинговым провайдерам в рискованных странах
```

### Хостовые IOC

```
ХОСТОВЫЕ ПРИЗНАКИ КОМПРОМЕТАЦИИ:

Файловая система:
├── Новые файлы в %TEMP%, %AppData%, C:\Users\Public\
├── Изменения системных файлов (SFC /scannow)
├── Файлы с двойным расширением (photo.jpg.exe)
├── Скрытые файлы (.hidden_file)
├── Файлы с нулевым размером или неожиданно большие
└── Файлы с датой создания в будущем или прошлом

Реестр (persistence):
├── HKCU\...\CurrentVersion\Run → новые записи
├── HKLM\...\CurrentVersion\Run → новые записи
├── HKLM\SYSTEM\CurrentControlSet\Services → новые сервисы
└── HKLM\...\Winlogon\Userinit → изменён

Процессы:
├── svchost.exe с нестандартными аргументами
├── Легитимные процессы с неожиданными родителями
│   (outlook.exe → cmd.exe → powershell.exe)
├── PowerShell с encoded command (-enc)
├── Процессы без описания/иконки
└── Двойные экземпляры системных процессов

Сеть с хоста:
├── Новые исходящие соединения после аномального события
├── Хост делает DNS запросы к нетипичным доменам
├── Передача данных в нерабочее время
└── Процесс без сетевой функциональности делает соединения
    (excel.exe → outbound TCP 443)
```

---

## MITRE ATT&CK — ключевые техники

### Initial Access (Начальный доступ)

| ID | Техника | Описание |
|----|---------|----------|
| T1566.001 | Phishing: Spearphishing Attachment | Фишинг с вложением |
| T1566.002 | Phishing: Spearphishing Link | Фишинг со ссылкой |
| T1190 | Exploit Public-Facing Application | Эксплойт публичного сервиса |
| T1078 | Valid Accounts | Использование легитимных учётных данных |
| T1133 | External Remote Services | VPN, RDP, Citrix |

### Execution (Выполнение кода)

| ID | Техника | Детекция |
|----|---------|----------|
| T1059.001 | PowerShell | Event 4104, cmdline |
| T1059.003 | Windows Command Shell | Event 4688, cmd.exe child |
| T1059.007 | JavaScript | wscript.exe, cscript.exe |
| T1204.002 | Malicious File | User execution |
| T1047 | Windows Management Instrumentation | wmic.exe, WMI events |

### Persistence (Закрепление)

| ID | Техника | Где смотреть |
|----|---------|-------------|
| T1547.001 | Registry Run Keys | HKCU/HKLM Run keys |
| T1053.005 | Scheduled Task | Event 4698, schtasks.exe |
| T1543.003 | Windows Service | Event 7045 |
| T1546.003 | WMI Event Subscription | WMI repository |
| T1136.001 | Local Account | Event 4720 |

### Credential Access (Доступ к учётным данным)

| ID | Техника | Признаки |
|----|---------|---------|
| T1003.001 | LSASS Memory | procdump.exe, mimikatz |
| T1110.001 | Brute Force | Event 4625 массово |
| T1558.003 | Kerberoasting | Event 4769 с RC4 |
| T1552.001 | Credentials in Files | grep password *.config |
| T1040 | Network Sniffing | promiscuous mode |

### Lateral Movement (Горизонтальное перемещение)

| ID | Техника | Признаки |
|----|---------|---------|
| T1021.001 | Remote Desktop Protocol | Event 21 TermServices |
| T1021.002 | SMB/Windows Admin Shares | Event 4624 Logon Type 3 |
| T1021.006 | Windows Remote Management | winrm, Event 4624 Type 8 |
| T1550.002 | Pass the Hash | NTLM Logon Type 3 |
| T1550.003 | Pass the Ticket | Abnormal TGT usage |

### Collection & Exfiltration

| ID | Техника | Признаки |
|----|---------|---------|
| T1005 | Data from Local System | Массовый доступ к файлам |
| T1074 | Data Staged | Временные папки с данными |
| T1048 | Exfiltration Over Alternative Protocol | DNS, ICMP tunneling |
| T1041 | Exfiltration Over C2 Channel | Большой исходящий трафик |

### Impact (Воздействие)

| ID | Техника | Признаки |
|----|---------|---------|
| T1486 | Data Encrypted for Impact | Ransomware, .locked |
| T1490 | Inhibit System Recovery | vssadmin delete shadows |
| T1498 | Network Denial of Service | DDoS |
| T1489 | Service Stop | Остановка AV сервисов |

---

## Известные инструменты атакующих

### Инструменты и их признаки

```
MIMIKATZ (кража учётных данных):
Признаки:
├── sekurlsa::logonpasswords в командной строке
├── privilege::debug в командной строке
├── lsass.exe дамп (procdump.exe -ma lsass.exe)
├── Event 4688: Process=mimikatz.exe (переименовывают)
├── Sysmon: Image загружена из Temp/AppData
└── AV: Mimikatz, Credential Stealer

COBALT STRIKE (C2 фреймворк):
Признаки:
├── Процессы с случайными именами (dllhost.exe)
├── Инъекция в легитимные процессы (svchost, explorer)
├── Named pipe: \\.\pipe\msagent_* или похожие
├── Beaconing каждые 60 секунд (±рандом)
├── Sysmon: Parent process injection
└── Сетевой трафик: характерные malleable C2 профили

PSEXEC (lateral movement):
Признаки:
├── Event 7045: ImagePath содержит \\ADMIN$ или PSEXESVC
├── Event 4688: psexec.exe или psexesvc.exe
├── Сетевой Share подключение: \\target\ADMIN$
└── Event 4624 с последующим 4688 PSEXESVC

BLOODHOUND/SHARPHOUND (AD разведка):
Признаки:
├── Большое количество LDAP запросов за короткое время
├── Event 4662: Directory Service access
├── DCSync атака (Event 4662 с DS-Replication-Get-Changes)
└── Процесс SharpHound.exe или переименованный
```

---

## YARA правила — примеры

```yara
// Детекция LockBit ransomware по строкам
rule Ransomware_LockBit_Strings {
    meta:
        author = "SOC Team"
        description = "Detects LockBit ransomware by unique strings"
        severity = "Critical"

    strings:
        $ransom_note = "LockBit" ascii wide nocase
        $ext1 = ".locked" ascii
        $ext2 = ".lockbit" ascii
        $cmd1 = "vssadmin delete shadows" ascii nocase
        $cmd2 = "wbadmin delete catalog" ascii nocase
        $mutex = "Global\\{" ascii

    condition:
        2 of ($ransom_note, $ext1, $ext2) or
        all of ($cmd1, $cmd2)
}

// Детекция Mimikatz по характерным строкам
rule HackTool_Mimikatz {
    meta:
        description = "Detects Mimikatz credential stealer"
        severity = "Critical"

    strings:
        $s1 = "sekurlsa::logonpasswords" ascii nocase
        $s2 = "privilege::debug" ascii nocase
        $s3 = "lsadump::sam" ascii nocase
        $s4 = "mimikatz" ascii nocase
        $s5 = "benjamin@gentilkiwi.com" ascii

    condition:
        any of them
}

// Детекция подозрительного PowerShell
rule Suspicious_PowerShell_Encoded {
    meta:
        description = "PowerShell with encoded command"

    strings:
        $ps = "powershell" ascii nocase
        $enc = "-enc" ascii nocase
        $iwrm = "Invoke-WebRequest" ascii nocase
        $iex = "Invoke-Expression" ascii nocase
        $dlstr = "DownloadString" ascii nocase
        $dlfile = "DownloadFile" ascii nocase

    condition:
        $ps and any of ($enc, $iwrm, $iex, $dlstr, $dlfile)
}

// Детекция reverse shell
rule Possible_Reverse_Shell {
    meta:
        description = "Possible reverse shell connection"

    strings:
        $bash = "bash -i >& /dev/tcp/" ascii
        $nc = "nc -e /bin/sh" ascii
        $py = "socket.connect" ascii
        $python_rs = "dup2(s.fileno()" ascii

    condition:
        any of them
}
```

---

## Sigma правила — примеры

```yaml
# Sigma правило: Successful Brute Force
title: Successful Brute Force Login
status: stable
description: Detects successful login after multiple failures
references:
    - https://attack.mitre.org/techniques/T1110/
tags:
    - attack.credential_access
    - attack.t1110
logsource:
    product: windows
    service: security
detection:
    failed_logins:
        EventID: 4625
    successful_login:
        EventID: 4624
    timeframe: 5m
    condition:
        - failed_logins | count(EventID) by SourceIP > 10
        - successful_login
        - failed_logins.SourceIP = successful_login.SourceIP
falsepositives:
    - Users who mistype their password
    - Password spraying tools
level: high
```

```yaml
# Sigma правило: Suspicious PowerShell Download
title: PowerShell Download Cradle
status: stable
description: Detects PowerShell downloading content from web
tags:
    - attack.execution
    - attack.t1059.001
logsource:
    product: windows
    category: process_creation
detection:
    selection:
        Image|endswith: '\powershell.exe'
        CommandLine|contains:
            - 'DownloadString'
            - 'DownloadFile'
            - 'Invoke-WebRequest'
            - 'WebClient'
            - 'IEX'
            - 'Invoke-Expression'
    filter:
        ParentImage|endswith:
            - '\WindowsDefender.exe'
            - '\MsMpEng.exe'
    condition: selection and not filter
falsepositives:
    - Legitimate admin scripts
    - Software updates
level: medium
```

---

## Быстрые запросы для SIEM

### Splunk — топ запросов для SOC

```
# Топ атакующих IP (неудачные входы)
index=wineventlog EventCode=4625
| stats count by src_ip
| sort -count
| head 20

# Timeline активности учётной записи
index=wineventlog (EventCode=4624 OR EventCode=4625 OR EventCode=4634)
    Account_Name="suspicious_user"
| table _time, EventCode, src_ip, Logon_Type, ComputerName
| sort _time

# Новые сервисы (persistence)
index=wineventlog EventCode=7045
| table _time, ComputerName, ServiceName, ImagePath, AccountName
| sort -_time

# Использование Scheduled Tasks
index=wineventlog EventCode=4698
| rex field=Message "Task Name:\s+(?P<TaskName>[^\r\n]+)"
| rex field=Message "Task Content:\s+(?P<TaskContent>[^\r\n]+)"
| table _time, ComputerName, User, TaskName, TaskContent
| sort -_time

# PowerShell ScriptBlock Logging
index=wineventlog EventCode=4104
| search ScriptBlockText="*DownloadString*" OR ScriptBlockText="*IEX*"
| table _time, ComputerName, ScriptBlockText
| sort -_time

# Очистка журналов (признак следов заметания)
index=wineventlog (EventCode=1102 OR EventCode=104)
| table _time, ComputerName, SubjectUserName
| sort -_time
```

### ELK (Kibana/KQL) — топ запросов

```
# Неудачные входы за последний час
event.code: "4625" AND @timestamp > now-1h

# Подозрительные PowerShell
event.code: "4688" AND process.name: "powershell.exe"
AND process.args: ("-enc" OR "-encodedcommand" OR "IEX")

# Lateral movement (NTLM Type 3)
event.code: "4624" AND winlog.logon.type: "3"
AND winlog.event_data.AuthenticationPackageName: "NTLM"

# Новые сервисы
event.code: "7045"

# Очистка логов
event.code: ("1102" OR "104")
```
