# Глава 10.3: Sigma-правила для SIEM

## Введение

Sigma — это открытый, независимый от платформы формат для описания правил обнаружения угроз в лог-файлах. Созданный Флорианом Ротом и Томасом Петцем в 2017 году, Sigma стал де-факто стандартом в сообществе Blue Team для создания и обмена детектирующими правилами. Подобно тому, как Snort/Suricata используются для сетевого трафика, а YARA — для файлов, Sigma предназначен для событий журналов (log events).

Главное преимущество Sigma — **платформонезависимость**: одно правило можно конвертировать в запросы для Splunk, Elastic/OpenSearch, Microsoft Sentinel, QRadar, Graylog и десятков других SIEM-систем. Это позволяет аналитикам сосредоточиться на логике обнаружения, а не на синтаксисе конкретной платформы.

```
┌─────────────────────────────────────────────────────────────┐
│                    SIGMA ECOSYSTEM                           │
│                                                              │
│  Threat Intel ──► Sigma Rule ──► sigma-cli ──► SIEM Query  │
│                      (.yml)                                  │
│                        │                                     │
│                        ├──► Splunk SPL                      │
│                        ├──► Elastic KQL/EQL                 │
│                        ├──► Microsoft Sentinel KQL          │
│                        ├──► QRadar AQL                      │
│                        └──► Graylog GELF                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 10.3.1 Формат Sigma: структура YAML

Sigma-правила написаны на языке YAML. Рассмотрим анатомию полного правила:

```yaml
# Полная структура Sigma-правила
title: Обнаружение запуска Mimikatz через командную строку
id: fc3b4e9b-1d4b-4db5-a21f-2fac51e2c3a1
status: stable
description: |
    Обнаруживает характерные аргументы командной строки Mimikatz,
    инструмента для извлечения учётных данных из памяти Windows.
    Mimikatz широко используется в атаках на Active Directory.
references:
    - https://github.com/gentilkiwi/mimikatz
    - https://attack.mitre.org/software/S0002/
author: Security Team
date: 2024/01/15
modified: 2024/06/20
tags:
    - attack.credential_access
    - attack.t1003.001
    - attack.t1003.002
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine|contains|all:
            - 'sekurlsa'
            - 'logonpasswords'
    selection_binary:
        Image|endswith:
            - '\mimikatz.exe'
            - '\mimilove.exe'
    filter_legitimate:
        ParentImage|startswith:
            - 'C:\Program Files\Security\'
    condition: (selection or selection_binary) and not filter_legitimate
fields:
    - CommandLine
    - ParentCommandLine
    - User
    - Image
falsepositives:
    - Легитимные инструменты безопасности в лабораторных средах
    - Авторизованное тестирование на проникновение
level: critical
```

### Обязательные поля

| Поле | Обязательность | Описание |
|------|---------------|----------|
| `title` | Обязательное | Человекочитаемое название правила |
| `status` | Обязательное | Зрелость: stable, test, experimental, deprecated |
| `logsource` | Обязательное | Источник логов для применения правила |
| `detection` | Обязательное | Логика обнаружения |
| `condition` | Обязательное | Условие срабатывания |

### Поле `status`

```yaml
# Значения статуса и их смысл:
status: stable       # Правило протестировано, минимум ложных срабатываний
status: test         # Правило в стадии тестирования
status: experimental # Новое правило, возможны ложные срабатывания
status: deprecated   # Устаревшее правило, заменено другим
status: unsupported  # Правило не поддерживается текущими backends
```

### Поле `level`

```yaml
# Уровни критичности (от низкого к высокому):
level: informational  # Информационное, не требует реагирования
level: low            # Низкий приоритет
level: medium         # Средний приоритет
level: high           # Высокий приоритет, требует проверки
level: critical       # Критический, немедленное реагирование
```

---

## 10.3.2 Секция `logsource`: источники логов

Секция `logsource` определяет, к каким журналам применяется правило. Sigma поддерживает несколько способов указания источника:

### Категории (абстрактный уровень)

```yaml
# Windows события создания процессов
logsource:
    category: process_creation
    product: windows

# Сетевые соединения
logsource:
    category: network_connection
    product: windows

# Изменения файлов
logsource:
    category: file_event
    product: windows

# Изменения реестра
logsource:
    category: registry_event
    product: windows

# DNS-запросы
logsource:
    category: dns_query
    product: windows

# Веб-сервер
logsource:
    category: webserver

# Firewall
logsource:
    category: firewall

# Аутентификация Linux
logsource:
    product: linux
    service: auth

# Syslog
logsource:
    product: linux
    service: syslog
```

### Продукты и сервисы

```yaml
# Windows Security Log (Event ID 4xxx)
logsource:
    product: windows
    service: security

# Windows System Log
logsource:
    product: windows
    service: system

# Windows PowerShell
logsource:
    product: windows
    service: powershell

# Windows Sysmon (расширенный мониторинг)
logsource:
    product: windows
    service: sysmon

# Apache access log
logsource:
    product: apache
    service: access

# Nginx
logsource:
    product: nginx
    service: access

# AWS CloudTrail
logsource:
    product: aws
    service: cloudtrail

# Okta
logsource:
    product: okta
    service: okta
```

---

## 10.3.3 Секция `detection`: логика обнаружения

### Базовые операторы поиска

```yaml
detection:
    # Точное совпадение строки
    selection1:
        EventID: 4688
    
    # Совпадение с числом
    selection2:
        EventID: 4625
    
    # Список значений (OR внутри поля)
    selection3:
        EventID:
            - 4624
            - 4625
            - 4648
    
    # Содержит подстроку
    selection4:
        CommandLine|contains: 'powershell'
    
    # Список подстрок (OR)
    selection5:
        CommandLine|contains:
            - 'mimikatz'
            - 'sekurlsa'
            - 'lsadump'
    
    # Все подстроки должны присутствовать (AND)
    selection6:
        CommandLine|contains|all:
            - '-enc'
            - 'powershell'
            - 'bypass'
    
    # Начинается с
    selection7:
        Image|startswith: 'C:\Windows\Temp\'
    
    # Заканчивается на
    selection8:
        Image|endswith:
            - '\cmd.exe'
            - '\powershell.exe'
    
    # Регулярное выражение
    selection9:
        CommandLine|re: '(?i)invoke-[a-z]{3,}'
    
    # Wildcard (глоб-паттерн)
    selection10:
        CommandLine|windash: '-enc*'
    
    condition: selection1
```

### Модификаторы полей

```yaml
detection:
    # Полный список модификаторов Sigma:
    
    examples:
        # Нечувствительность к регистру (по умолчанию в большинстве backends)
        field1|contains: 'value'
        
        # Base64-декодирование перед проверкой
        field2|base64offset|contains: 'value'
        
        # UTF-16 Little Endian декодирование
        field3|wide|contains: 'value'
        
        # Комбинация wide и base64
        field4|wide|base64offset|contains: 'value'
        
        # Все значения из списка должны совпасть
        field5|contains|all:
            - 'part1'
            - 'part2'
        
        # Regex без учёта регистра
        field6|re: '(?i)pattern'
        
        # Числовые сравнения
        field7|gt: 100    # greater than
        field8|gte: 100   # greater than or equal
        field9|lt: 50     # less than
        field10|lte: 50   # less than or equal
    
    condition: examples
```

### Условия (`condition`)

```yaml
detection:
    sel_a:
        EventID: 4688
    sel_b:
        CommandLine|contains: 'malware'
    filter_c:
        User: 'SYSTEM'
    
    # Логические операторы в condition:
    
    # AND - оба должны совпасть
    condition: sel_a and sel_b
    
    # OR - любое должно совпасть
    condition: sel_a or sel_b
    
    # NOT - исключение
    condition: sel_a and not filter_c
    
    # Комбинация
    condition: (sel_a or sel_b) and not filter_c
    
    # Подсчёт (aggregation):
    # Срабатывает если условие выполнено более 5 раз
    condition: sel_a | count() > 5
    
    # Подсчёт уникальных значений поля
    condition: sel_a | count(User) by SourceIP > 3
    
    # Временное окно (в некоторых backends)
    condition: sel_a | count() > 10 | timeframe: 5m
```

### Ключевые слова (keywords)

```yaml
detection:
    # Поиск без привязки к конкретному полю
    keywords:
        - 'password'
        - 'passwd'
        - 'credential'
    
    condition: keywords
```

---

## 10.3.4 Написание правил для распространённых атак

### Правило 1: Обнаружение Pass-the-Hash

```yaml
title: Pass-the-Hash атака через NTLM
id: a9e9e5e2-e1a1-4b5c-9a2d-3c4f5e6d7b8a
status: stable
description: |
    Обнаруживает признаки Pass-the-Hash атаки: успешная аутентификация
    по сети с использованием NTLM и пустым паролем (только хэш).
references:
    - https://attack.mitre.org/techniques/T1550/002/
author: Security Team
date: 2024/01/15
tags:
    - attack.lateral_movement
    - attack.t1550.002
logsource:
    product: windows
    service: security
detection:
    selection:
        EventID: 4624
        LogonType: 3
        AuthenticationPackageName: 'NTLM'
        KeyLength: 0
    filter_local:
        SourceNetworkAddress:
            - '127.0.0.1'
            - '::1'
            - '-'
    filter_machine_account:
        SubjectUserName|endswith: '$'
    condition: selection and not (filter_local or filter_machine_account)
fields:
    - SubjectUserName
    - TargetUserName
    - WorkstationName
    - SourceNetworkAddress
    - TargetDomainName
falsepositives:
    - Некоторые приложения используют NTLM без пароля
level: high
```

### Правило 2: PowerShell Encoded Command

```yaml
title: PowerShell с закодированной командой
id: b2c3d4e5-f6a7-b8c9-d0e1-f2a3b4c5d6e7
status: stable
description: |
    Обнаруживает запуск PowerShell с флагом -EncodedCommand или его
    сокращениями. Злоумышленники используют эту технику для обфускации
    вредоносного кода.
references:
    - https://attack.mitre.org/techniques/T1059/001/
author: Security Team
date: 2024/02/10
tags:
    - attack.execution
    - attack.defense_evasion
    - attack.t1059.001
    - attack.t1027
logsource:
    category: process_creation
    product: windows
detection:
    selection_img:
        Image|endswith:
            - '\powershell.exe'
            - '\pwsh.exe'
    selection_enc:
        CommandLine|contains:
            - ' -EncodedCommand '
            - ' -encodedcommand '
            - ' -enc '
            - ' -en '
            - ' -ec '
    filter_known_good:
        ParentImage:
            - 'C:\Program Files\Microsoft Monitoring Agent\Agent\MonitoringHost.exe'
            - 'C:\Program Files\Microsoft Endpoint Manager\ccmexec.exe'
    condition: (selection_img and selection_enc) and not filter_known_good
fields:
    - CommandLine
    - ParentCommandLine
    - User
    - ParentImage
falsepositives:
    - Легитимные скрипты управления конфигурацией (SCCM, Ansible)
    - Некоторые продукты безопасности
level: medium
```

### Правило 3: Обнаружение Cobalt Strike Beacon

```yaml
title: Cobalt Strike Beacon DNS C2 Communication
id: c3d4e5f6-a7b8-c9d0-e1f2-a3b4c5d6e7f8
status: experimental
description: |
    Обнаруживает DNS-паттерны, характерные для Cobalt Strike Beacon
    при использовании DNS-каналов командования и управления (C2).
    Beacon генерирует DNS-запросы с характерной структурой поддоменов.
references:
    - https://attack.mitre.org/techniques/T1071/004/
    - https://blog.cobaltstrike.com/2019/08/29/code-signing-certificate-cloning-attacks-and-defenses/
author: Threat Intel Team
date: 2024/03/05
tags:
    - attack.command_and_control
    - attack.t1071.004
    - attack.t1568.002
logsource:
    category: dns_query
    product: windows
detection:
    selection:
        # Cobalt Strike DNS beacon типично генерирует
        # поддомены длиной 16-20 символов из base32-алфавита
        QueryName|re: '^[a-z0-9]{16,20}\.[a-z0-9-]{3,20}\.[a-z]{2,6}$'
    filter_known_cdns:
        QueryName|endswith:
            - '.cloudfront.net'
            - '.akamai.net'
            - '.fastly.net'
    condition: selection and not filter_known_cdns
falsepositives:
    - Некоторые CDN и DDoS-защита генерируют похожие паттерны
    - Легитимные приложения с автогенерируемыми поддоменами
level: medium
```

### Правило 4: Lateral Movement через PsExec

```yaml
title: PsExec/PAExec Remote Execution
id: d4e5f6a7-b8c9-d0e1-f2a3-b4c5d6e7f8a9
status: stable
description: |
    Обнаруживает удалённое выполнение через PsExec или PAExec.
    Эти инструменты часто используются для lateral movement в сети.
    Характерный признак — создание сервиса PSEXESVC.
references:
    - https://attack.mitre.org/techniques/T1569/002/
    - https://docs.microsoft.com/en-us/sysinternals/downloads/psexec
author: Security Team
date: 2024/01/20
tags:
    - attack.lateral_movement
    - attack.execution
    - attack.t1569.002
logsource:
    product: windows
    service: system
detection:
    selection_svc_install:
        EventID: 7045
        ServiceName:
            - 'PSEXESVC'
            - 'PAExec'
            - 'winexesvc'
    selection_svc_start:
        EventID: 7036
        param1:
            - 'PSEXESVC'
            - 'PAExec'
    condition: selection_svc_install or selection_svc_start
fields:
    - ServiceName
    - ImagePath
    - AccountName
falsepositives:
    - Легитимное использование PsExec системными администраторами
    - Авторизованное тестирование на проникновение
level: high
```

### Правило 5: Ransomware — массовое переименование файлов

```yaml
title: Ransomware — подозрительное массовое переименование файлов
id: e5f6a7b8-c9d0-e1f2-a3b4-c5d6e7f8a9b0
status: experimental
description: |
    Обнаруживает потенциальную активность шифровальщика через
    массовое создание файлов с нетипичными расширениями.
    Правило использует агрегацию для снижения ложных срабатываний.
references:
    - https://attack.mitre.org/techniques/T1486/
author: Threat Hunting Team
date: 2024/04/01
tags:
    - attack.impact
    - attack.t1486
logsource:
    category: file_event
    product: windows
detection:
    selection:
        TargetFilename|re: '\.[a-zA-Z0-9]{4,8}$'
    filter_known_ext:
        TargetFilename|endswith:
            - '.tmp'
            - '.log'
            - '.txt'
            - '.docx'
            - '.xlsx'
            - '.pdf'
            - '.jpg'
            - '.png'
    condition: selection and not filter_known_ext | count(TargetFilename) by Image > 100
fields:
    - TargetFilename
    - Image
    - User
falsepositives:
    - Легитимное ПО для архивации или синхронизации
level: critical
```

---

## 10.3.5 Инструмент sigma-cli

### Установка

```bash
# Установка через pip
pip install sigma-cli

# Установка с поддержкой всех backends
pip install sigma-cli[all]

# Установка конкретных backends
pip install pySigma-backend-splunk
pip install pySigma-backend-elasticsearch
pip install pySigma-backend-microsoft365defender
pip install pySigma-backend-qradar

# Проверка установки
sigma version
sigma list backends
sigma list targets
```

### Базовые команды конвертации

```bash
# Конвертация в Splunk SPL
sigma convert \
    --target splunk \
    --pipeline sysmon \
    rules/windows/process_creation/proc_creation_win_mimikatz.yml

# Конвертация в Elasticsearch Query DSL
sigma convert \
    --target elasticsearch \
    --pipeline ecs-windows \
    rules/windows/process_creation/proc_creation_win_mimikatz.yml

# Конвертация в Microsoft KQL (Sentinel)
sigma convert \
    --target microsoft365defender \
    --pipeline microsoft365defender \
    rules/windows/process_creation/proc_creation_win_mimikatz.yml

# Конвертация в OpenSearch
sigma convert \
    --target opensearch \
    --pipeline ecs-windows \
    rules/windows/

# Конвертация директории правил
sigma convert \
    --target splunk \
    --pipeline sysmon \
    --output splunk_rules.conf \
    rules/windows/

# Вывод в формате JSON
sigma convert \
    --target elasticsearch \
    --pipeline ecs-windows \
    --format json \
    rules/windows/process_creation/
```

### Работа с pipelines

```bash
# Просмотр доступных pipelines
sigma list pipelines

# Применение нескольких pipelines (порядок важен)
sigma convert \
    --target splunk \
    --pipeline sysmon \
    --pipeline splunk-windows \
    rule.yml

# Создание собственного pipeline
cat > custom_pipeline.yml << 'EOF'
name: custom_field_mapping
priority: 20
transformations:
    - id: windows_image_field
      type: field_name_mapping
      mapping:
          Image: process_path
          CommandLine: process_cmdline
          ParentImage: parent_process_path
      rule_conditions:
          - type: logsource
            product: windows
            category: process_creation
EOF

sigma convert \
    --target splunk \
    --pipeline custom_pipeline.yml \
    rule.yml
```

---

## 10.3.6 Конвертация в Splunk SPL

### Примеры конвертации

**Исходное Sigma-правило:**

```yaml
title: Подозрительный PowerShell Download
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|endswith: '\powershell.exe'
        CommandLine|contains:
            - 'DownloadString'
            - 'DownloadFile'
            - 'WebClient'
            - 'Invoke-WebRequest'
            - 'iwr '
            - 'curl '
            - 'wget '
    condition: selection
level: high
```

**Результат конвертации в Splunk SPL:**

```splunk
(source="WinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=1)
(Image="*\\powershell.exe")
(CommandLine="*DownloadString*" OR CommandLine="*DownloadFile*" OR 
 CommandLine="*WebClient*" OR CommandLine="*Invoke-WebRequest*" OR 
 CommandLine="*iwr *" OR CommandLine="*curl *" OR CommandLine="*wget *")
| table _time, Computer, User, Image, CommandLine, ParentImage
| sort -_time
```

**Splunk-правило с тайм-окном для агрегации:**

```splunk
# Правило для обнаружения брутфорса (count > N за период)
(source="WinEventLog:Security" EventCode=4625)
LogonType=3
| bucket _time span=5m
| stats count by _time, src_ip, user
| where count > 10
| table _time, src_ip, user, count
```

### Splunk Saved Search из Sigma

```bash
# Конвертация с выводом в формат Splunk saved searches
sigma convert \
    --target splunk \
    --pipeline sysmon \
    --format savedsearches \
    rules/windows/ \
    > output/saved_searches.conf

# Содержимое saved_searches.conf
cat output/saved_searches.conf
```

```ini
[Подозрительный PowerShell Download]
search = (source="WinEventLog:Microsoft-Windows-Sysmon/Operational" EventCode=1) \
    (Image="*\\powershell.exe") \
    (CommandLine="*DownloadString*" OR CommandLine="*DownloadFile*")
dispatch.earliest_time = -15m
dispatch.latest_time = now
enableSched = 1
cron_schedule = */15 * * * *
alert.severity = high
alert.track = 1
action.email.useNSSubject = 1
```

---

## 10.3.7 Конвертация в Elastic/OpenSearch

### Elastic Query DSL

```bash
# Конвертация в Elasticsearch Query DSL
sigma convert \
    --target elasticsearch \
    --pipeline ecs-windows \
    --format dsl_lucene \
    rule.yml
```

**Результат:**

```json
{
  "query": {
    "bool": {
      "must": [
        {
          "bool": {
            "should": [
              {"wildcard": {"process.executable": {"value": "*\\powershell.exe"}}},
              {"wildcard": {"process.executable": {"value": "*\\pwsh.exe"}}}
            ]
          }
        },
        {
          "bool": {
            "should": [
              {"match": {"process.command_line": "DownloadString"}},
              {"match": {"process.command_line": "DownloadFile"}},
              {"match": {"process.command_line": "WebClient"}}
            ]
          }
        }
      ]
    }
  }
}
```

### Elastic SIEM Detection Rule (JSON)

```bash
# Конвертация в формат Elastic Detection Rules
sigma convert \
    --target elasticsearch \
    --pipeline ecs-windows \
    --format siem_rule_ndjson \
    rules/windows/ \
    > elastic_rules.ndjson
```

```json
{
  "name": "PowerShell Download Cradle",
  "description": "Обнаружение PowerShell загрузки через сеть",
  "risk_score": 73,
  "severity": "high",
  "type": "query",
  "query": "process.executable:(*\\\\powershell.exe OR *\\\\pwsh.exe) AND process.command_line:(DownloadString OR DownloadFile OR WebClient)",
  "index": ["logs-endpoint.events.process-*", "winlogbeat-*"],
  "language": "kuery",
  "tags": ["attack.execution", "attack.t1059.001"],
  "enabled": true,
  "interval": "5m",
  "from": "now-6m"
}
```

### KQL для Microsoft Sentinel

```bash
# Конвертация в Microsoft KQL
sigma convert \
    --target microsoft365defender \
    --pipeline microsoft365defender \
    rule.yml
```

```kusto
// Результат конвертации в KQL (Microsoft Sentinel)
DeviceProcessEvents
| where FileName in~ ("powershell.exe", "pwsh.exe")
| where ProcessCommandLine has_any (
    "DownloadString",
    "DownloadFile", 
    "WebClient",
    "Invoke-WebRequest",
    "iwr ",
    "curl ",
    "wget "
)
| project Timestamp, DeviceName, AccountName, FileName, 
          ProcessCommandLine, InitiatingProcessFileName
| order by Timestamp desc
```

---

## 10.3.8 Репозиторий SigmaHQ

### Структура официального репозитория

```
sigma/rules/
├── cloud/
│   ├── aws/
│   │   ├── cloudtrail/
│   │   └── s3/
│   ├── azure/
│   ├── gcp/
│   └── okta/
├── linux/
│   ├── auditd/
│   ├── builtin/
│   └── syslog/
├── network/
│   ├── cisco/
│   ├── firewall/
│   └── zeek/
├── web/
│   ├── apache/
│   └── nginx/
└── windows/
    ├── builtin/
    │   ├── security/
    │   ├── system/
    │   └── application/
    ├── driver_load/
    ├── file_event/
    ├── image_load/
    ├── network_connection/
    ├── pipe_created/
    ├── process_creation/
    ├── registry_event/
    └── sysmon/
```

### Работа с репозиторием

```bash
# Клонирование репозитория
git clone https://github.com/SigmaHQ/sigma.git
cd sigma

# Просмотр правил для конкретной техники MITRE ATT&CK
grep -r "t1059.001" rules/ --include="*.yml" -l

# Поиск правил по уровню критичности
grep -r "^level: critical" rules/ --include="*.yml" -l

# Массовая конвертация всех правил для Windows
sigma convert \
    --target splunk \
    --pipeline sysmon \
    rules/windows/ \
    --output-dir splunk_rules/

# Фильтрация по тегам ATT&CK
sigma convert \
    --target elasticsearch \
    --pipeline ecs-windows \
    --filter 'tags|contains|all:["attack.lateral_movement"]' \
    rules/windows/

# Только stable правила
sigma convert \
    --target splunk \
    --pipeline sysmon \
    --filter 'status=stable' \
    rules/windows/
```

### sigma-py: программная работа с правилами

```python
#!/usr/bin/env python3
"""
Программная работа с Sigma-правилами через pySigma
"""

from sigma.collection import SigmaCollection
from sigma.backends.splunk import SplunkBackend
from sigma.backends.elasticsearch import ElasticsearchLuceneBackend
from sigma.processing.resolver import ProcessingPipelineResolver
from sigma.rule import SigmaRule
import yaml
import os

def convert_rule_to_splunk(rule_path: str) -> str:
    """Конвертация одного правила в Splunk SPL"""
    
    # Загрузка правила
    with open(rule_path, 'r', encoding='utf-8') as f:
        rule_content = f.read()
    
    # Создание коллекции правил
    collection = SigmaCollection.from_yaml(rule_content)
    
    # Создание backend с pipeline
    backend = SplunkBackend()
    
    # Конвертация
    queries = backend.convert(collection)
    return '\n'.join(queries)


def batch_convert_directory(rules_dir: str, output_dir: str, target: str = 'splunk'):
    """Массовая конвертация директории правил"""
    
    os.makedirs(output_dir, exist_ok=True)
    
    if target == 'splunk':
        backend = SplunkBackend()
    elif target == 'elastic':
        backend = ElasticsearchLuceneBackend()
    else:
        raise ValueError(f"Неизвестный target: {target}")
    
    results = {}
    errors = []
    
    for root, dirs, files in os.walk(rules_dir):
        for filename in files:
            if not filename.endswith('.yml'):
                continue
            
            rule_path = os.path.join(root, filename)
            
            try:
                with open(rule_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                collection = SigmaCollection.from_yaml(content)
                queries = backend.convert(collection)
                
                # Сохранение результата
                relative_path = os.path.relpath(rule_path, rules_dir)
                output_path = os.path.join(output_dir, relative_path.replace('.yml', f'.{target}'))
                
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(queries))
                
                results[rule_path] = 'success'
                
            except Exception as e:
                errors.append(f"{rule_path}: {str(e)}")
                results[rule_path] = f'error: {e}'
    
    print(f"Успешно конвертировано: {sum(1 for v in results.values() if v == 'success')}")
    print(f"Ошибок: {len(errors)}")
    
    if errors:
        print("\nОшибки:")
        for err in errors:
            print(f"  - {err}")
    
    return results


def validate_sigma_rule(rule_path: str) -> dict:
    """Валидация Sigma-правила"""
    
    with open(rule_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    issues = {
        'errors': [],
        'warnings': [],
        'info': []
    }
    
    try:
        rule_data = yaml.safe_load(content)
        
        # Проверка обязательных полей
        required_fields = ['title', 'status', 'logsource', 'detection']
        for field in required_fields:
            if field not in rule_data:
                issues['errors'].append(f"Отсутствует обязательное поле: {field}")
        
        # Проверка detection.condition
        if 'detection' in rule_data:
            if 'condition' not in rule_data['detection']:
                issues['errors'].append("Отсутствует поле detection.condition")
        
        # Предупреждения
        if 'id' not in rule_data:
            issues['warnings'].append("Рекомендуется добавить UUID в поле 'id'")
        
        if 'description' not in rule_data:
            issues['warnings'].append("Рекомендуется добавить описание правила")
        
        if 'level' not in rule_data:
            issues['warnings'].append("Рекомендуется указать уровень критичности")
        
        if 'falsepositives' not in rule_data:
            issues['info'].append("Рекомендуется описать возможные ложные срабатывания")
        
        # Попытка разбора через pySigma
        try:
            SigmaCollection.from_yaml(content)
            issues['info'].append("Правило успешно разобрано pySigma")
        except Exception as e:
            issues['errors'].append(f"Ошибка разбора pySigma: {e}")
        
    except yaml.YAMLError as e:
        issues['errors'].append(f"Ошибка YAML: {e}")
    
    return issues


if __name__ == '__main__':
    # Пример использования
    import sys
    
    if len(sys.argv) > 1:
        rule_file = sys.argv[1]
        print(f"Валидация: {rule_file}")
        
        issues = validate_sigma_rule(rule_file)
        
        for severity, msgs in issues.items():
            if msgs:
                print(f"\n{severity.upper()}:")
                for msg in msgs:
                    print(f"  [{severity}] {msg}")
        
        print("\nКонвертация в Splunk:")
        print(convert_rule_to_splunk(rule_file))
```

---

## 10.3.9 Продвинутые техники написания правил

### Использование агрегаций для снижения ложных срабатываний

```yaml
title: Brute Force — множественные неудачные входы с одного IP
id: f6a7b8c9-d0e1-f2a3-b4c5-d6e7f8a9b0c1
status: stable
description: |
    Обнаруживает попытки брутфорса: более 10 неудачных аутентификаций
    с одного IP-адреса за 5-минутное окно.
logsource:
    product: windows
    service: security
detection:
    selection:
        EventID: 4625
        LogonType:
            - 3
            - 10
    condition: selection | count() by IpAddress > 10
    timeframe: 5m
fields:
    - IpAddress
    - TargetUserName
    - WorkstationName
falsepositives:
    - Системы мониторинга или сканеры уязвимостей
level: medium
```

### Корреляционные правила

```yaml
# Правило-коррелятор: обнаружение после брутфорса
title: Успешный вход после множественных неудач (Brute Force Success)
id: a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6
status: experimental
description: |
    Обнаруживает ситуацию, когда за успешным входом (4624)
    предшествовали множественные неудачные попытки (4625).
    Это признак успешного брутфорса.
logsource:
    product: windows
    service: security
detection:
    selection_fail:
        EventID: 4625
        LogonType: 3
    selection_success:
        EventID: 4624
        LogonType: 3
    condition: selection_fail | count() by IpAddress > 5 | near selection_success
    timeframe: 10m
level: high
```

### Правила для облачных сред

```yaml
title: AWS CloudTrail — изменение Security Group с разрешением 0.0.0.0/0
id: b2c3d4e5-f6a7-b8c9-d0e1-f2a3b4c5d6e7
status: stable
description: |
    Обнаруживает добавление правила в Security Group AWS,
    разрешающего доступ из любого IP (0.0.0.0/0).
    Это может указывать на misconfiguration или компрометацию.
references:
    - https://attack.mitre.org/techniques/T1562/007/
author: Cloud Security Team
date: 2024/05/10
tags:
    - attack.defense_evasion
    - attack.t1562.007
logsource:
    product: aws
    service: cloudtrail
detection:
    selection:
        eventSource: 'ec2.amazonaws.com'
        eventName:
            - 'AuthorizeSecurityGroupIngress'
            - 'AuthorizeSecurityGroupEgress'
        requestParameters.ipPermissions.items.ipRanges.items.cidrIp:
            - '0.0.0.0/0'
            - '::/0'
    condition: selection
fields:
    - userIdentity.arn
    - sourceIPAddress
    - requestParameters.groupId
    - requestParameters.ipPermissions
falsepositives:
    - Намеренное открытие доступа для публичных сервисов
    - Тестовые среды с намеренно открытым доступом
level: high
```

---

## 10.3.10 Тестирование и отладка правил

### Atomic Red Team для тестирования

```bash
# Установка Atomic Red Team
Install-Module -Name invoke-atomicredteam -Force
Import-Module invoke-atomicredteam

# Выполнение теста для T1059.001 (PowerShell Execution)
Invoke-AtomicTest T1059.001

# Проверка, срабатывает ли ваше Sigma-правило
# 1. Запустите тест
Invoke-AtomicTest T1059.001 -TestNumbers 1

# 2. Проверьте в SIEM появление события
# 3. Сравните с ожидаемым срабатыванием правила
```

### Evtx-sigma: тестирование на реальных логах

```bash
# Установка
pip install evtx-sigma

# Тестирование правила на файле журнала
evtx-sigma \
    --rule rules/windows/process_creation/proc_creation_win_mimikatz.yml \
    --evtx samples/windows_event_logs.evtx

# Пакетное тестирование
evtx-sigma \
    --rules rules/windows/ \
    --evtx samples/ \
    --output results.json

# Просмотр результатов
cat results.json | jq '.[] | select(.matches > 0)'
```

### Создание тестовых данных

```python
#!/usr/bin/env python3
"""
Генератор тестовых событий для проверки Sigma-правил
"""

import json
from datetime import datetime, timezone

def generate_test_events():
    """Генерация тестовых событий Windows"""
    
    events = [
        # Тест правила: PowerShell Encoded Command
        {
            "EventID": 4688,
            "TimeCreated": datetime.now(timezone.utc).isoformat(),
            "Computer": "WORKSTATION01",
            "SubjectUserName": "jdoe",
            "NewProcessName": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
            "CommandLine": "powershell.exe -enc SQBuAHYAbwBrAGUALQBXAGUAYgBSAGUAcQB1AGUAcwB0",
            "ParentProcessName": "C:\\Windows\\System32\\cmd.exe"
        },
        # Тест правила: Pass-the-Hash
        {
            "EventID": 4624,
            "TimeCreated": datetime.now(timezone.utc).isoformat(),
            "Computer": "DC01",
            "LogonType": 3,
            "AuthenticationPackageName": "NTLM",
            "KeyLength": 0,
            "SubjectUserName": "jdoe",
            "TargetUserName": "Administrator",
            "IpAddress": "192.168.1.100",
            "WorkstationName": "WORKSTATION01"
        }
    ]
    
    return events


def evaluate_sigma_rule_manually(rule: dict, event: dict) -> bool:
    """
    Упрощённая оценка Sigma-правила против события
    (для демонстрации логики, не для продакшна)
    """
    detection = rule.get('detection', {})
    condition_str = detection.get('condition', '')
    
    # Простая оценка selection блоков
    results = {}
    for key, value in detection.items():
        if key == 'condition':
            continue
        
        if isinstance(value, dict):
            match = evaluate_selection(value, event)
            results[key] = match
    
    # Упрощённое вычисление условия
    condition = condition_str
    for key, val in results.items():
        condition = condition.replace(key, str(val).lower())
    
    try:
        return eval(condition)
    except:
        return False


def evaluate_selection(selection: dict, event: dict) -> bool:
    """Проверка одного selection блока"""
    for field, value in selection.items():
        # Обработка модификаторов
        parts = field.split('|')
        field_name = parts[0]
        modifiers = parts[1:] if len(parts) > 1 else []
        
        event_value = str(event.get(field_name, ''))
        
        if isinstance(value, list):
            # OR логика
            match = any(
                check_value(event_value, v, modifiers) 
                for v in value
            )
        else:
            match = check_value(event_value, str(value), modifiers)
        
        if not match:
            return False
    
    return True


def check_value(event_val: str, check_val: str, modifiers: list) -> bool:
    """Проверка значения с учётом модификаторов"""
    event_val_lower = event_val.lower()
    check_val_lower = check_val.lower()
    
    if 'contains' in modifiers:
        return check_val_lower in event_val_lower
    elif 'startswith' in modifiers:
        return event_val_lower.startswith(check_val_lower)
    elif 'endswith' in modifiers:
        return event_val_lower.endswith(check_val_lower)
    else:
        return event_val_lower == check_val_lower


if __name__ == '__main__':
    events = generate_test_events()
    for event in events:
        print(json.dumps(event, indent=2, ensure_ascii=False))
```

---

## 10.3.11 Интеграция Sigma в CI/CD

### GitHub Actions для автоматической конвертации

```yaml
# .github/workflows/sigma-convert.yml
name: Sigma Rules Conversion

on:
    push:
        paths:
            - 'sigma-rules/**/*.yml'
    pull_request:
        paths:
            - 'sigma-rules/**/*.yml'

jobs:
    validate-and-convert:
        runs-on: ubuntu-latest
        
        steps:
            - uses: actions/checkout@v4
            
            - name: Setup Python
              uses: actions/setup-python@v4
              with:
                  python-version: '3.11'
            
            - name: Install sigma-cli
              run: |
                  pip install sigma-cli
                  pip install pySigma-backend-splunk
                  pip install pySigma-backend-elasticsearch
            
            - name: Validate Sigma rules
              run: |
                  sigma check sigma-rules/
            
            - name: Convert to Splunk
              run: |
                  mkdir -p converted/splunk
                  sigma convert \
                      --target splunk \
                      --pipeline sysmon \
                      sigma-rules/ \
                      --output-dir converted/splunk/
            
            - name: Convert to Elasticsearch
              run: |
                  mkdir -p converted/elastic
                  sigma convert \
                      --target elasticsearch \
                      --pipeline ecs-windows \
                      sigma-rules/ \
                      --output-dir converted/elastic/
            
            - name: Upload converted rules
              uses: actions/upload-artifact@v3
              with:
                  name: converted-sigma-rules
                  path: converted/
```

### Pre-commit hooks для валидации

```yaml
# .pre-commit-config.yaml
repos:
    - repo: local
      hooks:
          - id: sigma-validate
            name: Validate Sigma rules
            entry: sigma check
            language: python
            types: [yaml]
            files: ^sigma-rules/
            additional_dependencies:
                - sigma-cli
```

---

## Итоги главы

В этой главе мы изучили экосистему Sigma — открытого стандарта для описания правил обнаружения угроз. Ключевые выводы:

1. **Платформонезависимость** — одно Sigma-правило конвертируется в запросы для любого SIEM
2. **YAML-структура** — правило состоит из метаданных, logsource, detection и condition
3. **Модификаторы** — `contains`, `startswith`, `endswith`, `re`, `all` позволяют точно описывать паттерны
4. **sigma-cli** — основной инструмент конвертации с поддержкой множества backends
5. **SigmaHQ** — репозиторий с тысячами готовых правил от сообщества
6. **Агрегации** — `count()`, `near` снижают количество ложных срабатываний
7. **CI/CD интеграция** — автоматизация валидации и конвертации правил

> **Важно:** Sigma-правила — это живые артефакты. Регулярно обновляйте правила из SigmaHQ, тестируйте их на реальных атаках с помощью Atomic Red Team, и адаптируйте под специфику вашей инфраструктуры.

---

## Практические задания

### Задание 1: Написание правила обнаружения
Напишите Sigma-правило для обнаружения выгрузки ntds.dit (Active Directory database) с использованием ntdsutil или Volume Shadow Copy:
```bash
# Подсказка: ищите эти команды:
# ntdsutil.exe "ac i ntds" "ifm" "create full c:\temp" q q
# vssadmin create shadow /for=C:
```

### Задание 2: Конвертация и тестирование
1. Склонируйте репозиторий SigmaHQ
2. Выберите 10 правил категории `attack.lateral_movement`
3. Конвертируйте их в Splunk SPL и Elastic KQL
4. Задокументируйте различия в синтаксисе

### Задание 3: Кастомный pipeline
Создайте кастомный sigma-cli pipeline для вашей SIEM, который:
- Переименовывает поля согласно вашей схеме данных
- Добавляет специфичные для вашей среды фильтры
- Применяет трансформации к значениям полей

### Задание 4: Интеграция в SIEM
Настройте автоматическую загрузку конвертированных Sigma-правил в:
- Splunk (через REST API или saved searches)
- Elastic (через Detection Rules API)
- Задокументируйте процесс в виде runbook

### Задание 5: Threat Hunting с Sigma
Используя данные из инцидента (или Mordor dataset), проведите threat hunting:
1. Выберите технику ATT&CK
2. Напишите Sigma-правило для её обнаружения
3. Примените к историческим данным
4. Задокументируйте находки и ложные срабатывания
