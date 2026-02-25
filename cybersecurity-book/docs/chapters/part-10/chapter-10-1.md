# Глава 10.1: Threat Hunting: проактивный поиск угроз

## 🎯 Цели главы

После изучения этой главы вы сможете:
- Понять различия между Threat Hunting и Incident Response
- Оценить уровень зрелости Threat Hunting в организации
- Формулировать обоснованные гипотезы для охоты
- Применять методологию TaHiTI и SQRRL Framework
- Использовать MITRE ATT&CK как основу для Threat Hunting
- Настраивать и использовать инструменты Velociraptor и HELK
- Проводить охоту на конкретные техники атак

---

## 🔍 10.1.1 Что такое Threat Hunting

**Threat Hunting** (охота за угрозами) — это проактивный, итеративный процесс поиска индикаторов компрометации, скрытых угроз и действий злоумышленников в инфраструктуре организации, которые ускользнули от существующих автоматизированных средств защиты.

### Ключевые характеристики

| Характеристика | Описание |
|---|---|
| **Проактивность** | Не ожидаем алертов — сами ищем угрозы |
| **Итеративность** | Процесс повторяется циклически |
| **Гипотезно-ориентированный** | Начинается с формулировки гипотезы |
| **Управляемый данными** | Опирается на телеметрию и логи |
| **Human-driven** | Аналитик — ключевой элемент |

### Threat Hunting vs Реактивные подходы

```
Реактивная защита:
Атака → Алерт → Расследование → Устранение

Threat Hunting:
Гипотеза → Поиск данных → Анализ → Обнаружение (или опровержение)
```

---

## ⚔️ 10.1.2 Threat Hunting vs Incident Response

Многие путают Threat Hunting с Incident Response (IR). Это принципиально разные процессы.

### Сравнительная таблица

| Критерий | Threat Hunting | Incident Response |
|---|---|---|
| **Триггер** | Гипотеза аналитика | Алерт / уведомление |
| **Цель** | Найти скрытую угрозу | Устранить известный инцидент |
| **Временные рамки** | Нет срочности | Критическая срочность |
| **Результат** | Новое знание / находка | Ликвидация инцидента |
| **Документирование** | Новые правила детекции | Отчёт об инциденте |
| **Квалификация** | Высокая аналитическая | Операционная + тех. |
| **Автоматизация** | Частичная | Высокая |
| **Фокус** | Неизвестное | Известное |

### Жизненный цикл Threat Hunting

```
┌─────────────────────────────────────────────────────────┐
│                  THREAT HUNTING LOOP                     │
│                                                          │
│  1. ФОРМИРОВАНИЕ    →    2. СБОР ДАННЫХ                 │
│     ГИПОТЕЗЫ                & ТЕЛЕМЕТРИИ                │
│         ↑                         ↓                     │
│  5. УЛУЧШЕНИЕ      ←    3. АНАЛИЗ & ОХОТА               │
│     ДЕТЕКЦИИ                      ↓                     │
│         ↑            4. НАХОДКА / ОПРОВЕРЖЕНИЕ           │
└─────────────────────────────────────────────────────────┘
```

### Когда применять каждый подход

**Threat Hunting применяется:**
- После завершения инцидента (проверка persistence)
- Плановые охоты (еженедельные, ежемесячные)
- После получения новых TI (threat intelligence)
- При подозрении на APT-группировку
- Перед аудитом безопасности

**Incident Response применяется:**
- Получен алерт от EDR/SIEM
- Обнаружена компрометация
- Внешнее уведомление о взломе
- Обнаружение вредоносной активности

---

## 📊 10.1.3 Модель зрелости Threat Hunting (Maturity Model)

Организации находятся на разных уровнях зрелости TH. Модель зрелости помогает определить текущее состояние и план развития.

### Уровни зрелости (HMM - Hunting Maturity Model)

```
┌────────────────────────────────────────────────────────────────┐
│  HMM - Hunting Maturity Model (SQRRL)                         │
│                                                                │
│  Level 4: LEADING        ████████████████████  Автоматизация  │
│  Level 3: INNOVATIVE     ███████████████       Процедуры      │
│  Level 2: PROCEDURAL     ██████████            Данные + план  │
│  Level 1: MINIMAL        █████                 Алерты + IoC   │
│  Level 0: INITIAL        ██                    Нет охоты      │
└────────────────────────────────────────────────────────────────┘
```

### Детальное описание уровней

**Level 0 - Initial (Начальный)**
- Организация полностью полагается на автоматизированные алерты
- Нет проактивного поиска угроз
- Данные: базовые логи (если есть)
- Зависимость от IoC (Indicators of Compromise)

**Level 1 - Minimal (Минимальный)**
- Использование IoC для поиска в логах
- Поиск по IP-адресам, хешам, доменам из TI-фидов
- Нет структурированного процесса
- Используются: grep, SIEM-поиск по IoC

```bash
# Пример Level 1: поиск по IoC в логах
grep -r "185.220.101.45" /var/log/
grep -r "d41d8cd98f00b204e9800998ecf8427e" /var/log/

# Поиск в Splunk по IoC
index=proxy_logs dest_ip IN ("185.220.101.45", "93.184.216.34")
```

**Level 2 - Procedural (Процедурный)**
- Следование задокументированным процедурам охоты
- Использование данных: EDR, NetFlow, DNS
- Охота на основе опубликованных техник
- Анализ поведения, не только IoC

**Level 3 - Innovative (Инновационный)**
- Организация создаёт собственные методики
- Машинное обучение для обнаружения аномалий
- Интеграция множества источников данных
- Метрики эффективности охоты

**Level 4 - Leading (Передовой)**
- Полная автоматизация рутинных проверок
- Постоянное совершенствование методологии
- Вклад в сообщество (открытые правила, IoC)
- Предиктивный Threat Hunting

### Как оценить текущий уровень

```
Вопросы для самооценки:
□ Есть ли у нас EDR на всех endpoints?          → нет: L0
□ Используем ли мы TI-фиды регулярно?           → нет: L1
□ Есть ли задокументированные playbooks охоты?   → нет: L1-L2
□ Проводим ли охоту по поведению, не по IoC?    → нет: L2
□ Используем ли ML/аналитику для аномалий?       → нет: L2-L3
□ Автоматизированы ли рутинные проверки?         → нет: L3
```

---

## 🧠 10.1.4 Гипотезы в Threat Hunting

Гипотеза — это обоснованное предположение о возможной активности злоумышленника в среде организации.

### Структура хорошей гипотезы

```
Гипотеза = [Актор/TTP] + [Техника] + [Где ищем] + [Признак]

Пример:
"APT-группа использует PowerShell для загрузки payload с внешних
серверов (T1059.001) на рабочих станциях бухгалтерии через
encoded commands, что проявится в необычных исходящих соединениях
от powershell.exe к внешним IP"
```

### Источники для формирования гипотез

| Источник | Примеры |
|---|---|
| **Threat Intelligence** | Отчёты CrowdStrike, Mandiant, MITRE |
| **MITRE ATT&CK** | Техники T1059, T1078, T1547 |
| **Уязвимости (CVE)** | Эксплуатация свежих CVE |
| **Инциденты в отрасли** | Аналогичные компании были взломаны |
| **Предыдущие инциденты** | Исторические данные организации |
| **Аномалии в данных** | Необычный трафик, новые процессы |

### Примеры гипотез по категориям

**Гипотезы на основе ATT&CK техник:**
```
H-001: Злоумышленник использует Scheduled Tasks (T1053.005) 
       для persistence на Windows-серверах

H-002: Lateral movement происходит через SMB с использованием 
       украденных учётных данных (T1550.002 - Pass-the-Hash)

H-003: Данные эксфильтруются через DNS-туннелирование (T1048.003)
       в нерабочие часы
```

**Гипотезы на основе TI:**
```
H-004: APT29 использует SolarWinds-подобную атаку на цепочку 
       поставок — проверить сторонние обновления ПО за 6 мес.

H-005: После публикации CVE-2024-XXXX — проверить признаки 
       эксплуатации на Exchange-серверах
```

### Приоритизация гипотез

```
┌─────────────────────────────────────────────┐
│         МАТРИЦА ПРИОРИТИЗАЦИИ               │
│                                             │
│  Высокий  │ Средний    │ КРИТИЧЕСКИЙ        │
│  риск     │ приоритет  │ (немедленно)       │
│           │            │                    │
│  Низкий   │ НИЗКИЙ     │ Высокий            │
│  риск     │ (плановый) │ приоритет          │
│           │            │                    │
│           │ Низкая     │ Высокая            │
│           │ вероятность│ вероятность        │
└─────────────────────────────────────────────┘
```

---

## 🗺️ 10.1.5 Threat Hunting на основе MITRE ATT&CK

MITRE ATT&CK — наиболее полная база знаний о тактиках и техниках злоумышленников.

### Структура ATT&CK для Threat Hunting

```
Тактики (14 штук):
TA0001 Initial Access       → Как попали?
TA0002 Execution            → Что запустили?
TA0003 Persistence          → Как остались?
TA0004 Privilege Escalation → Как получили привилегии?
TA0005 Defense Evasion      → Как прятались?
TA0006 Credential Access    → Как украли учётки?
TA0007 Discovery            → Что разведали?
TA0008 Lateral Movement     → Как перемещались?
TA0009 Collection           → Что собрали?
TA0010 Exfiltration         → Как вывели данные?
TA0011 Command and Control  → Как управляли?
TA0040 Impact               → Что сделали с данными?
```

### Охота по ATT&CK технике: пример T1059.001 (PowerShell)

```bash
# Запрос в Splunk для поиска подозрительного PowerShell
index=windows_logs EventCode=4688 
| search New_Process_Name="*powershell*" OR New_Process_Name="*pwsh*"
| eval cmd_length=len(Process_Command_Line)
| where cmd_length > 500
| rex field=Process_Command_Line "(?i)(-enc|-encodedcommand)\s+(?P<encoded>[A-Za-z0-9+/=]+)"
| where isnotnull(encoded)
| table _time, ComputerName, Account_Name, Process_Command_Line, encoded
| sort -_time
```

```bash
# KQL запрос (Microsoft Sentinel) для PowerShell hunting
SecurityEvent
| where EventID == 4688
| where NewProcessName has "powershell" or NewProcessName has "pwsh"
| where CommandLine has_any ("-enc", "-EncodedCommand", "-ec ")
| extend DecodedCmd = base64_decode_tostring(extract(@"(?i)-e(?:nc|ncodedcommand)?\s+([A-Za-z0-9+/=]+)", 1, CommandLine))
| project TimeGenerated, Computer, Account, CommandLine, DecodedCmd
| sort by TimeGenerated desc
```

### ATT&CK Navigator для планирования охоты

```json
// Пример coverage layer для ATT&CK Navigator
{
  "name": "Threat Hunting Coverage Q1 2024",
  "versions": {
    "attack": "14",
    "navigator": "4.9"
  },
  "techniques": [
    {
      "techniqueID": "T1059.001",
      "color": "#ff6666",
      "comment": "Охота #001 - PowerShell abuse - ВЫСОКИЙ приоритет",
      "score": 80
    },
    {
      "techniqueID": "T1053.005",
      "color": "#ffaa00",
      "comment": "Охота #002 - Scheduled Tasks - СРЕДНИЙ",
      "score": 50
    }
  ]
}
```

---

## 📋 10.1.6 TaHiTI Методология

**TaHiTI** (Targeted Hunting integrating Threat Intelligence) — методология, разработанная компанией ING для структурированного проведения Threat Hunting.

### Фазы TaHiTI

```
┌──────────────────────────────────────────────────────────────┐
│                    TaHiTI ПРОЦЕСС                            │
│                                                              │
│  ФАЗА 1: ИНИЦИАЦИЯ                                          │
│  ├── Определение области охоты                              │
│  ├── Формулировка гипотезы                                  │
│  └── Определение источников данных                          │
│                                                              │
│  ФАЗА 2: ОХОТА                                              │
│  ├── Сбор данных                                            │
│  ├── Анализ и корреляция                                    │
│  └── Выявление аномалий                                     │
│                                                              │
│  ФАЗА 3: ЗАВЕРШЕНИЕ                                         │
│  ├── Документирование результатов                           │
│  ├── Создание правил детекции                               │
│  └── Обмен знаниями (TI sharing)                            │
└──────────────────────────────────────────────────────────────┘
```

### TaHiTI Hunt Record (шаблон)

```markdown
# Hunt Record: HR-2024-001

## Метаданные
- **ID**: HR-2024-001
- **Дата**: 2024-03-15
- **Охотник**: analyst@company.com
- **Статус**: Завершена
- **Приоритет**: Высокий

## Гипотеза
Злоумышленник использует PowerShell с encoded commands для загрузки 
стейджера (T1059.001) на машинах бухгалтерии.

## Источники данных
- [ ] Windows Security Events (4688, 4624, 4625)
- [ ] PowerShell Script Block Logging (4104)
- [ ] EDR телеметрия (процессы, сети)
- [ ] Proxy logs

## Методология
1. Фильтрация PowerShell процессов с encoded параметрами
2. Декодирование и анализ payload
3. Корреляция с сетевыми соединениями

## Результаты
- **Находки**: 3 подозрительных события
- **False Positives**: 47 событий (SCCM, легитимные скрипты)
- **True Positives**: 1 подтверждённая компрометация

## Артефакты
- Список подозрительных хостов: [host1, host2]
- IoC: IP 185.220.101.45, хеш d41d8cd9...

## Действия
- Передан в IR команду
- Создано правило SIEM: RULE-2024-089
- Обновлён EDR policy
```

---

## 🗄️ 10.1.7 Источники данных для охоты

### Пирамида источников данных

```
                    ┌─────────────┐
                    │  THREAT INT │  ← Внешняя TI
                    └──────┬──────┘
                    ┌──────┴──────┐
                    │    SIEM     │  ← Агрегация логов
                    └──────┬──────┘
              ┌─────────────┴─────────────┐
              │     EDR / Endpoint        │  ← Телеметрия endpoint
              └─────────────┬─────────────┘
     ┌──────────────────────┴──────────────────────┐
     │              NETWORK (NetFlow, DNS, Proxy)   │  ← Сетевые данные
     └────────────────────────────────────────────┘
```

### EDR как источник данных

**Что собирает EDR:**

```yaml
# Типичная EDR телеметрия
process_events:
  - pid, ppid, process_name, command_line
  - user, integrity_level
  - parent_process_name
  - create_time

network_events:
  - source_ip, dest_ip, dest_port
  - protocol, bytes_sent, bytes_recv
  - process_name (который инициировал соединение)

file_events:
  - file_path, operation (create/modify/delete/rename)
  - process_name
  - file_hash (MD5/SHA256)

registry_events:
  - key_path, value_name, value_data
  - operation (create/modify/delete)
  - process_name
```

### NetFlow анализ

```bash
# Анализ NetFlow с помощью nfdump
# Топ-10 источников трафика
nfdump -r /data/netflow/2024/03/15/ -s record/bytes -n 10

# Поиск соединений с подозрительными портами
nfdump -r /data/netflow/ 'proto tcp and (dport = 4444 or dport = 1337 or dport = 31337)'

# Выявление beaconing (периодические соединения)
nfdump -r /data/netflow/ -o extended \
  | awk '{print $5, $6, $7}' \
  | sort | uniq -c | sort -rn | head -50

# Поиск DNS over non-standard ports
nfdump -r /data/netflow/ 'proto udp and dport = 53 and src net not 10.0.0.0/8'
```

### DNS как источник данных

```bash
# Анализ DNS запросов для обнаружения DGA доменов
# DGA (Domain Generation Algorithm) — домены с высокой энтропией

# Python скрипт для анализа энтропии DNS запросов
python3 << 'EOF'
import math
from collections import Counter

def calculate_entropy(domain):
    # Убираем TLD и считаем энтропию subdomain
    parts = domain.split('.')
    subdomain = parts[0] if len(parts) > 2 else domain
    
    if len(subdomain) < 4:
        return 0
    
    counts = Counter(subdomain)
    entropy = -sum((c/len(subdomain)) * math.log2(c/len(subdomain)) 
                   for c in counts.values())
    return entropy

# Тестовые домены
domains = [
    "google.com",
    "mail.yahoo.com", 
    "xjkqmvbnzplrt.evil.com",  # DGA-like
    "a8f3k2p9x1m7.example.com",  # DGA-like
    "update.microsoft.com"
]

print(f"{'Domain':<40} {'Entropy':>10} {'Suspicious':>12}")
print("-" * 65)
for d in domains:
    e = calculate_entropy(d)
    suspicious = "YES ⚠️" if e > 3.5 else "No"
    print(f"{d:<40} {e:>10.3f} {suspicious:>12}")
EOF
```

### SIEM запросы для охоты

```sql
-- Splunk: Обнаружение beaconing (регулярные соединения)
index=proxy_logs
| timechart span=5m count by dest_host
| eventstats avg(count) as avg_count, stdev(count) as stdev_count by dest_host
| where stdev_count < 2 AND avg_count > 5
| table dest_host, avg_count, stdev_count

-- Elastic: поиск подозрительных процессов
GET /winlogbeat-*/_search
{
  "query": {
    "bool": {
      "must": [
        {"match": {"winlog.event_id": "4688"}},
        {"wildcard": {"winlog.event_data.NewProcessName": "*powershell*"}}
      ],
      "filter": [
        {"range": {"@timestamp": {"gte": "now-24h"}}}
      ]
    }
  }
}
```

---

## 📈 10.1.8 Поиск аномалий: статистические методы

### Метод стандартного отклонения

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Анализ количества DNS запросов по хостам
df = pd.DataFrame({
    'hostname': ['ws001', 'ws002', 'ws003', 'ws004', 'ws005', 'ws006'],
    'dns_queries_per_hour': [245, 230, 890, 210, 256, 240]  # ws003 аномальный
})

mean = df['dns_queries_per_hour'].mean()
std = df['dns_queries_per_hour'].std()

# Z-score для каждого хоста
df['z_score'] = (df['dns_queries_per_hour'] - mean) / std
df['is_anomaly'] = df['z_score'].abs() > 2  # > 2 стандартных отклонений

print("Анализ DNS запросов:")
print(f"Среднее: {mean:.1f}, Стандартное отклонение: {std:.1f}")
print()
print(df.to_string(index=False))
print()
print("АНОМАЛИИ:")
print(df[df['is_anomaly']][['hostname', 'dns_queries_per_hour', 'z_score']])
```

```
Анализ DNS запросов:
Среднее: 345.2, Стандартное отклонение: 263.5

 hostname  dns_queries_per_hour   z_score  is_anomaly
    ws001                   245 -0.380866       False
    ws002                   230 -0.437722       False
    ws003                   890  2.072891        True  ← АНОМАЛИЯ
    ws004                   210 -0.513814       False
    ws005                   256 -0.339086       False
    ws006                   240 -0.401403       False

АНОМАЛИИ:
  hostname  dns_queries_per_hour   z_score
     ws003                   890  2.072891
```

### Long Tail анализ

```python
# Long tail анализ: поиск редких, нетипичных событий
# Частые события = легитимные, редкие = потенциально вредоносные

import pandas as pd
from collections import Counter

# Симуляция: процессы, запустившие powershell.exe
parent_processes = [
    'explorer.exe', 'explorer.exe', 'explorer.exe', 'svchost.exe',
    'explorer.exe', 'svchost.exe', 'explorer.exe', 'explorer.exe',
    'cmd.exe', 'cmd.exe', 'explorer.exe', 'explorer.exe',
    'winword.exe',    # ПОДОЗРИТЕЛЬНО: Office запускает PowerShell
    'excel.exe',      # ПОДОЗРИТЕЛЬНО
    'outlook.exe',    # ПОДОЗРИТЕЛЬНО
    'explorer.exe', 'cmd.exe', 'explorer.exe'
]

counter = Counter(parent_processes)
total = len(parent_processes)

print("Long Tail анализ: родительские процессы для powershell.exe")
print(f"{'Parent Process':<25} {'Count':>6} {'Percent':>8} {'Suspicious':>12}")
print("-" * 55)

for proc, count in sorted(counter.items(), key=lambda x: x[1], reverse=True):
    pct = count / total * 100
    suspicious = "🚨 HIGH" if count <= 2 else "OK"
    print(f"{proc:<25} {count:>6} {pct:>7.1f}% {suspicious:>12}")
```

### Кластеризация для Threat Hunting

```python
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import pandas as pd
import numpy as np

# Анализ сетевых соединений
data = {
    'bytes_per_session': [1024, 1100, 980, 2048, 1050, 500000, 512000, 480000],
    'connections_per_hour': [10, 12, 8, 15, 11, 200, 195, 210],
    'unique_dest_ports': [2, 3, 2, 4, 2, 1, 1, 1],
    'host': ['ws001', 'ws002', 'ws003', 'ws004', 'ws005', 'ws006', 'ws007', 'ws008']
}

df = pd.DataFrame(data)
features = ['bytes_per_session', 'connections_per_hour', 'unique_dest_ports']

scaler = StandardScaler()
X = scaler.fit_transform(df[features])

# K-means кластеризация
kmeans = KMeans(n_clusters=2, random_state=42, n_init=10)
df['cluster'] = kmeans.fit_predict(X)

print("Кластеризация хостов по сетевому поведению:")
print(df[['host', 'bytes_per_session', 'connections_per_hour', 'cluster']].to_string(index=False))
print()
print("Кластер 1 (нормальное поведение):", df[df['cluster']==0]['host'].tolist())
print("Кластер 2 (аномальное поведение):", df[df['cluster']==1]['host'].tolist())
```

---

## 🎯 10.1.9 Hunting для конкретных техник

### Living off the Land (LotL) — T1218

**LotL** — злоумышленники используют легитимные инструменты Windows для выполнения вредоносных действий, что затрудняет обнаружение.

**LOLBAS (Living Off The Land Binaries And Scripts):**

```bash
# Топ LotL инструментов для охоты
LOLBAS = {
    "certutil.exe": "Загрузка файлов, декодирование base64",
    "bitsadmin.exe": "Загрузка/выгрузка файлов",
    "regsvr32.exe": "Выполнение COM/DLL скриптов",
    "mshta.exe": "Выполнение HTA-файлов",
    "wmic.exe": "Удалённое выполнение команд",
    "rundll32.exe": "Запуск DLL",
    "msiexec.exe": "Установка MSI из сети",
    "forfiles.exe": "Выполнение команд",
    "cmstp.exe": "Bypass UAC",
    "odbcconf.exe": "Загрузка DLL"
}

# Splunk запрос для охоты на LotL
index=windows_logs EventCode=4688
| search New_Process_Name IN (
    "*certutil*", "*bitsadmin*", "*regsvr32*", 
    "*mshta*", "*wmic*", "*rundll32*"
  )
| table _time, ComputerName, Account_Name, New_Process_Name, Process_Command_Line
| sort -_time
```

```powershell
# PowerShell: поиск подозрительного использования certutil
# certutil используется для загрузки файлов злоумышленниками

Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    Id = 4688
} | Where-Object {
    $_.Properties[5].Value -like "*certutil*" -and
    ($_.Properties[8].Value -like "*urlcache*" -or
     $_.Properties[8].Value -like "*decode*" -or
     $_.Properties[8].Value -like "*http*")
} | Select-Object TimeCreated, 
    @{N='Process';E={$_.Properties[5].Value}},
    @{N='CommandLine';E={$_.Properties[8].Value}} |
Format-Table -AutoSize
```

### PowerShell Abuse — T1059.001

```powershell
# Hunting: включаем Script Block Logging если не включён
# GPO: Computer Config → Admin Templates → Windows Components → PowerShell

# Включение в реестре:
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging" `
    -Name "EnableScriptBlockLogging" -Value 1

# Поиск подозрительных событий PowerShell (Event ID 4104)
Get-WinEvent -FilterHashtable @{
    LogName = 'Microsoft-Windows-PowerShell/Operational'
    Id = 4104
} | Where-Object {
    $_.Message -match '(invoke-expression|iex|downloadstring|webclient|bypass|hidden|encoded|shellcode)'
} | Select-Object TimeCreated, Message | 
Format-List
```

```bash
# Splunk: декодирование EncodedCommand PowerShell
index=windows_logs EventCode=4688 New_Process_Name="*powershell*"
| rex field=Process_Command_Line "(?i)(?:-e|-enc|-encoded|-encodedcommand)\s+(?P<b64_cmd>[A-Za-z0-9+/=]{20,})"
| eval decoded=base64decode(b64_cmd)
| where isnotnull(decoded)
| where match(decoded, "(?i)(invoke-expression|downloadstring|shellcode|mimikatz|bypass)")
| table _time, ComputerName, Account_Name, decoded
| sort -_time
```

### Scheduled Tasks Persistence — T1053.005

```powershell
# Hunting Scheduled Tasks persistence
# Поиск задач, созданных за последние 7 дней

$cutoff = (Get-Date).AddDays(-7)
$suspiciousTasks = Get-ScheduledTask | Where-Object {
    $_.Date -gt $cutoff
} | ForEach-Object {
    $task = $_
    $info = Get-ScheduledTaskInfo -TaskName $task.TaskName -TaskPath $task.TaskPath -ErrorAction SilentlyContinue
    
    # Получаем действие задачи
    $actions = $task.Actions | ForEach-Object { $_.Execute + " " + $_.Arguments }
    
    [PSCustomObject]@{
        TaskName    = $task.TaskName
        TaskPath    = $task.TaskPath
        Author      = $task.Principal.UserId
        CreatedDate = $task.Date
        Actions     = $actions -join "; "
        Triggers    = ($task.Triggers | ForEach-Object { $_.CimClass.CimClassName }) -join ", "
    }
} | Where-Object {
    # Фильтр подозрительных паттернов
    $_.Actions -match '(powershell|cmd|wscript|mshta|regsvr32|rundll32|certutil)' -or
    $_.TaskPath -notmatch '^\\Microsoft\\'
}

$suspiciousTasks | Format-Table -AutoSize
```

```bash
# Windows Event Logs для Scheduled Tasks
# Event ID 4698 - задача создана
# Event ID 4702 - задача изменена
# Event ID 4699 - задача удалена

# Splunk запрос
index=windows_logs EventCode IN (4698, 4699, 4702)
| rex field=_raw "TaskName:\s+(?P<task_name>[^\r\n]+)"
| rex field=_raw "Command:\s+(?P<command>[^\r\n]+)"
| where match(command, "(?i)(powershell|cmd|wscript|mshta|http|base64)")
| table _time, EventCode, ComputerName, Account_Name, task_name, command
| sort -_time
```

### Lateral Movement через SMB — T1021.002

```bash
# Splunk: обнаружение Pass-the-Hash и lateral movement через SMB
# Event ID 4624 (тип входа 3 = сетевой) + 4648 (explicit credentials)

index=windows_logs EventCode=4624 Logon_Type=3
| eval hour=strftime(_time, "%H")
| stats count by Account_Name, src_ip, dest_host, hour
| where count > 5
| join Account_Name [
    search index=windows_logs EventCode=4624 Logon_Type=3
    | stats dc(dest_host) as unique_targets by Account_Name, src_ip
    | where unique_targets > 3
]
| table Account_Name, src_ip, unique_targets, count
| sort -unique_targets
```

```python
# Python: анализ SMB-трафика для обнаружения lateral movement
import pandas as pd
from datetime import datetime, timedelta

# Загрузка событий входа (симуляция)
events = pd.DataFrame([
    {'time': '2024-03-15 02:15:00', 'user': 'admin', 'src': '192.168.1.100', 'dst': 'srv001', 'type': 3},
    {'time': '2024-03-15 02:15:45', 'user': 'admin', 'src': '192.168.1.100', 'dst': 'srv002', 'type': 3},
    {'time': '2024-03-15 02:16:10', 'user': 'admin', 'src': '192.168.1.100', 'dst': 'srv003', 'type': 3},
    {'time': '2024-03-15 02:16:55', 'user': 'admin', 'src': '192.168.1.100', 'dst': 'dc001',  'type': 3},
    # ... нормальные события
    {'time': '2024-03-15 09:00:00', 'user': 'john',  'src': '192.168.1.200', 'dst': 'srv001', 'type': 3},
])

events['time'] = pd.to_datetime(events['time'])

# Анализ: много уникальных целей за короткое время
window = timedelta(minutes=5)
results = []

for user in events['user'].unique():
    user_events = events[events['user'] == user].sort_values('time')
    
    for idx, row in user_events.iterrows():
        time_window = user_events[
            (user_events['time'] >= row['time']) & 
            (user_events['time'] < row['time'] + window)
        ]
        if len(time_window['dst'].unique()) > 2:
            results.append({
                'user': user,
                'src': row['src'],
                'unique_targets': len(time_window['dst'].unique()),
                'targets': list(time_window['dst'].unique()),
                'start_time': row['time']
            })

if results:
    print("ОБНАРУЖЕН ВОЗМОЖНЫЙ LATERAL MOVEMENT:")
    for r in results:
        print(f"  Пользователь: {r['user']} с {r['src']}")
        print(f"  Время: {r['start_time']}")
        print(f"  Уникальных целей за 5 минут: {r['unique_targets']}")
        print(f"  Цели: {', '.join(r['targets'])}")
```

---

## 🔧 10.1.10 SQRRL Framework

SQRRL (впоследствии поглощён AWS) разработал один из первых structured frameworks для Threat Hunting.

### Компоненты SQRRL Framework

```
┌─────────────────────────────────────────────────────────────┐
│                   SQRRL THREAT HUNTING LOOP                 │
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │ TRIGGER  │ →  │  INVEST- │ →  │  RESOLVE │             │
│  │          │    │  IGATE   │    │          │             │
│  │• Intel   │    │• Hunt    │    │• IR      │             │
│  │• Anomaly │    │• Pivot   │    │• Automate│             │
│  │• Situatnl│    │• Cluster │    │• Enrich  │             │
│  └──────────┘    └──────────┘    └──────────┘             │
│       ↑                                    │               │
│       └────────────────────────────────────┘               │
│                    Feedback Loop                            │
└─────────────────────────────────────────────────────────────┘
```

### Три типа охоты по SQRRL

**1. Intelligence-driven hunting**
```
Входные данные: TI-репорт, IoC
→ Поиск в инфраструктуре
→ Подтверждение/опровержение
```

**2. Situational awareness hunting**
```
Входные данные: понимание своей среды
→ Поиск отклонений от baseline
→ Анализ Crown Jewels assets
```

**3. Analytics-driven hunting**
```
Входные данные: ML-модели, статистика
→ Аномалии → Расследование
→ Новые паттерны угроз
```

---

## 🛠️ 10.1.11 Инструменты: Velociraptor

**Velociraptor** — мощный инструмент для Threat Hunting и DFIR, работающий по модели агент-сервер.

### Установка Velociraptor

```bash
# Скачать Velociraptor
wget https://github.com/Velocidex/velociraptor/releases/latest/download/velociraptor-linux-amd64
chmod +x velociraptor-linux-amd64

# Генерация конфига
./velociraptor-linux-amd64 config generate -i

# Запуск сервера
./velociraptor-linux-amd64 --config server.config.yaml frontend -v

# Запуск агента на Windows (клиент)
velociraptor.exe --config client.config.yaml service install
```

### VQL (Velociraptor Query Language)

```sql
-- Поиск подозрительных процессов
SELECT Pid, Name, Exe, CommandLine, Username, CreateTime
FROM pslist()
WHERE Name =~ "(?i)(powershell|cmd|wscript|cscript|mshta)"
   OR CommandLine =~ "(?i)(encoded|bypass|hidden|invoke)"

-- Поиск scheduled tasks
SELECT Name, Command, Arguments, Enabled, NextRun
FROM scheduled_tasks()
WHERE Command =~ "(?i)(powershell|cmd|wscript)"
   AND NextRun > now()

-- Поиск сетевых соединений подозрительных процессов
SELECT Pid, Name, LocalAddr, LocalPort, RemoteAddr, RemotePort, Status
FROM netstat()
WHERE Status = "ESTABLISHED"
   AND Name =~ "(?i)(powershell|cmd|wscript)"
   AND NOT RemoteAddr =~ "^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)"
```

```yaml
# Velociraptor Artifact для Threat Hunting
name: Custom.Hunting.SuspiciousPowerShell
description: |
  Охота на подозрительное использование PowerShell
  
type: CLIENT

sources:
  - name: PowerShellProcesses
    query: |
      SELECT Pid, Name, Exe, CommandLine, Username, 
             CreateTime, Ppid,
             process_tracker_get(id=Ppid).Data.Name AS ParentName
      FROM pslist()
      WHERE Name =~ "(?i)powershell"
        AND (CommandLine =~ "(?i)(-enc|-encodedcommand|-e )"
             OR CommandLine =~ "(?i)(downloadstring|invoke-expression|iex)"
             OR CommandLine =~ "(?i)(bypass|hidden|noninteractive)")
      ORDER BY CreateTime DESC
      
  - name: RecentPSLogs
    query: |
      SELECT EventTime, Computer, Channel, EventID, Message
      FROM parse_evtx(filename="C:/Windows/System32/winevt/Logs/Microsoft-Windows-PowerShell%4Operational.evtx")
      WHERE EventID = 4104
        AND Message =~ "(?i)(invoke-expression|downloadstring|shellcode|amsibypass)"
      LIMIT 100
```

### Velociraptor Hunt (массовая охота)

```bash
# Запуск hunt через CLI
velociraptor --config server.config.yaml \
  query 'SELECT * FROM hunt_results(hunt_id="H.1234", artifact="Custom.Hunting.SuspiciousPowerShell")'

# Коллекция артефактов с хоста
velociraptor --config client.config.yaml \
  artifacts collect Windows.System.Pslist --output output.json
```

---

## 📊 10.1.12 Инструменты: HELK

**HELK** (Hunting ELK) — платформа для Threat Hunting на базе Elasticsearch, Logstash, Kibana + Jupyter Notebooks.

### Установка HELK

```bash
# Клонирование репозитория
git clone https://github.com/Cyb3rWard0g/HELK
cd HELK

# Проверка системных требований
# RAM: минимум 12 GB, рекомендуется 16 GB
# CPU: 4+ cores
free -h && nproc

# Запуск HELK (Docker-based)
cd docker
sudo bash helk_install.sh

# Выбор опций:
# 1. HELK + KSQL + ELK
# 2. HELK + KSQL + ELK + NGNIX (с SSL)
```

### HELK: охота через Jupyter Notebook

```python
# Jupyter Notebook для Threat Hunting в HELK
from elasticsearch import Elasticsearch
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Подключение к ES
es = Elasticsearch(['http://helk-elasticsearch:9200'])

# Запрос: PowerShell события за последние 24 часа
query = {
    "query": {
        "bool": {
            "must": [
                {"match": {"winlog.event_id": "4688"}},
                {"wildcard": {"process.executable": "*powershell*"}}
            ],
            "filter": [
                {"range": {"@timestamp": {"gte": "now-24h"}}}
            ]
        }
    },
    "size": 1000,
    "_source": ["@timestamp", "host.name", "winlog.event_data.CommandLine", 
                "user.name", "process.parent.name"]
}

result = es.search(index="winlogbeat-*", body=query)
df = pd.json_normalize([hit['_source'] for hit in result['hits']['hits']])

# Анализ
print(f"Всего событий: {len(df)}")
print("\nТоп хосты:")
print(df['host.name'].value_counts().head(10))

# Визуализация
plt.figure(figsize=(12, 6))
df['host.name'].value_counts().head(15).plot(kind='bar')
plt.title('PowerShell Events by Host (last 24h)')
plt.xlabel('Host')
plt.ylabel('Count')
plt.tight_layout()
plt.savefig('/tmp/ps_hunting_results.png')
print("График сохранён: /tmp/ps_hunting_results.png")
```

---

## 📝 10.1.13 Документирование результатов охоты

### Шаблон отчёта об охоте

```markdown
# Threat Hunting Report

## Executive Summary
- **ID охоты**: TH-2024-Q1-007
- **Период**: 2024-03-01 — 2024-03-15
- **Результат**: Обнаружена активность злоумышленника (True Positive)
- **Затронутые системы**: 3 рабочих станции, 1 сервер

## Техническое описание

### Гипотеза
APT-группа использует PowerShell для загрузки и выполнения payload
через закодированные команды (T1059.001, T1027)

### Методология
1. Анализ Security Events (4688) на предмет PowerShell с -enc параметром
2. Декодирование base64 команд
3. Корреляция с сетевыми соединениями
4. Анализ дочерних процессов

### Находки

| Хост | Время | Описание | Severity |
|------|-------|----------|----------|
| WS-FINANCE-003 | 2024-03-08 02:15 | Encoded PS → загрузка cobalt strike | CRITICAL |
| WS-FINANCE-007 | 2024-03-08 02:47 | Lateral movement от WS-FINANCE-003 | HIGH |
| SRV-FILE-001 | 2024-03-09 01:00 | Установка scheduled task persistence | HIGH |

### IoC (Indicators of Compromise)

**IP-адреса:**
- 185.220.101.45 (C2 сервер)
- 93.184.216.34 (загрузка payload)

**Хеши файлов:**
- SHA256: d41d8cd98f00b204e9800998ecf8427e (dropper)

**Домены:**
- update-cdn.malicious.example.com

### Правила детекции (созданы)
- SIEM: RULE-2024-089 (PowerShell encoded + network)
- YARA: hunting_cobaltstrike_v1.yar
- Sigma: ps_encoded_lateral_movement.yml

## Рекомендации
1. Немедленно изолировать WS-FINANCE-003
2. Сбросить пароли учётных записей, задействованных в движении
3. Включить Script Block Logging на всех Windows хостах
4. Проверить backup-серверы на наличие persistence
```

### Метрики эффективности охоты

```python
# Расчёт метрик охоты
hunting_metrics = {
    "hunt_id": "TH-2024-Q1-007",
    "duration_hours": 48,
    "events_analyzed": 2450000,
    "alerts_generated": 156,
    "false_positives": 153,
    "true_positives": 3,
    "new_detection_rules": 2,
    "new_ioc": 8,
    "systems_investigated": 15,
    "compromised_systems": 4
}

precision = hunting_metrics["true_positives"] / hunting_metrics["alerts_generated"]
detection_rate = hunting_metrics["events_analyzed"] / hunting_metrics["duration_hours"]

print("=== Метрики охоты ===")
print(f"ID охоты: {hunting_metrics['hunt_id']}")
print(f"Точность (Precision): {precision:.1%}")
print(f"События в час: {detection_rate:,.0f}")
print(f"True Positives: {hunting_metrics['true_positives']}")
print(f"False Positives: {hunting_metrics['false_positives']}")
print(f"ROI: {hunting_metrics['compromised_systems']} скомпрометированных систем обнаружено")
```

---

## 🏋️ 10.1.14 Практические задания

### Задание 1: Охота на PowerShell abuse

**Сценарий**: У вас есть дамп Windows Event Logs за 24 часа. Необходимо провести охоту по гипотезе: "Злоумышленник использует PowerShell с encoded commands для скачивания payload".

```powershell
# Шаг 1: Сбор данных
# Запуск на Windows хосте для сбора событий PowerShell

$events = Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    Id = 4688
    StartTime = (Get-Date).AddHours(-24)
} -ErrorAction SilentlyContinue

$events += Get-WinEvent -FilterHashtable @{
    LogName = 'Microsoft-Windows-PowerShell/Operational'
    Id = 4104
    StartTime = (Get-Date).AddHours(-24)
} -ErrorAction SilentlyContinue

# Шаг 2: Анализ
$suspicious = $events | Where-Object {
    $_.Message -match '(-enc|-encodedcommand|downloadstring|webclient)'
} | Select-Object TimeCreated, Id, Message

# Шаг 3: Декодирование
foreach ($event in $suspicious) {
    if ($event.Message -match '-e(?:nc)?\s+([A-Za-z0-9+/=]{20,})') {
        $encoded = $matches[1]
        try {
            $decoded = [System.Text.Encoding]::Unicode.GetString(
                [Convert]::FromBase64String($encoded)
            )
            Write-Host "=== ПОДОЗРИТЕЛЬНАЯ КОМАНДА ===" -ForegroundColor Red
            Write-Host "Время: $($event.TimeCreated)"
            Write-Host "Декодировано: $decoded"
            Write-Host ""
        } catch { }
    }
}
```

### Задание 2: Охота на Beaconing

**Цель**: Обнаружить C2-beaconing в NetFlow данных.

```python
# hunt_beaconing.py
import pandas as pd
import numpy as np
from scipy import stats

# Симуляция NetFlow данных (замените на реальные)
# Формат: время, src_ip, dst_ip, dst_port, bytes
np.random.seed(42)

# Нормальный трафик
normal_times = pd.date_range('2024-03-15 00:00', periods=100, freq='5min')
# Beaconing трафик (каждые 5 минут, очень регулярный)
beacon_times = pd.date_range('2024-03-15 01:00', periods=20, freq='300s')

flows = []
for t in normal_times:
    flows.append({'time': t, 'src': '192.168.1.100', 'dst': '8.8.8.8', 
                  'port': 443, 'bytes': np.random.randint(1000, 50000)})

for t in beacon_times:
    # Beaconing: очень регулярные интервалы, одинаковый размер
    flows.append({'time': t, 'src': '192.168.1.150', 'dst': '185.220.101.45',
                  'port': 443, 'bytes': np.random.randint(800, 850)})  # почти одинаковый размер

df = pd.DataFrame(flows)
df = df.sort_values('time')

# Анализ: группировка по парам src-dst
print("Анализ на beaconing:")
print("=" * 60)

for (src, dst), group in df.groupby(['src', 'dst']):
    if len(group) < 3:
        continue
    
    group = group.sort_values('time')
    intervals = group['time'].diff().dropna().dt.total_seconds()
    
    # Коэффициент вариации (CV): низкий CV = высокая регулярность = beaconing
    cv = intervals.std() / intervals.mean() if intervals.mean() > 0 else 1
    
    print(f"\n{src} → {dst}")
    print(f"  Соединений: {len(group)}")
    print(f"  Средний интервал: {intervals.mean():.0f} сек")
    print(f"  Стандартное отклонение: {intervals.std():.1f} сек")
    print(f"  Коэффициент вариации: {cv:.3f}")
    
    if cv < 0.2:  # Очень регулярный трафик
        print(f"  ⚠️  ПОДОЗРЕНИЕ НА BEACONING! CV={cv:.3f} < 0.2")
    else:
        print(f"  ✓ Нормальный трафик")
```

### Задание 3: CTF — Threat Hunting Challenge

```
СЦЕНАРИЙ:
Вы аналитик SOC в организации. Поступили данные:
- NetFlow за 24 часа (netflow.csv)
- Windows Security Events (security_events.evtx)
- DNS логи (dns.log)

ЗАДАНИЕ:
1. Сформулируйте минимум 3 гипотезы на основе предоставленных данных
2. Проведите охоту по каждой гипотезе
3. Определите:
   - Какой хост был скомпрометирован первым?
   - Какова точка первоначального доступа (Initial Access)?
   - Есть ли lateral movement?
   - Был ли установлен C2-канал?
4. Задокументируйте результаты по шаблону TaHiTI

ФЛАГ: flag{first_compromised_host_initial_access_technique}
```

> **Note**: Для практики рекомендуется использовать публичные датасеты: BOTS (Boss of the SOC) от Splunk, MORDOR dataset от Roberto Rodriguez, или Elastic SIEM Detection Rules тесты.

---

## 📚 Ресурсы для изучения

| Ресурс | Тип | URL |
|---|---|---|
| MITRE ATT&CK | Framework | https://attack.mitre.org |
| TaHiTI | Методология | https://www.betaalvereniging.nl/en/safety/tahiti/ |
| Velociraptor | Инструмент | https://docs.velociraptor.app |
| HELK | Платформа | https://github.com/Cyb3rWard0g/HELK |
| SQRRL Whitepaper | Документ | http://go.sqrrl.com/hunting-maturity-model |
| Sigma Rules | Правила | https://github.com/SigmaHQ/sigma |
| MORDOR Datasets | Данные | https://mordordatasets.com |
| Cyber Analytics Repository | Аналитика | https://car.mitre.org |

---

## 🔑 Ключевые выводы

1. **Threat Hunting — проактивный процесс**, начинающийся с гипотезы, а не с алерта
2. **Модель зрелости HMM** помогает определить текущий уровень и план развития организации
3. **MITRE ATT&CK** — основной фреймворк для формирования гипотез и систематической охоты
4. **Разнообразие источников данных** (EDR, SIEM, NetFlow, DNS) критично для эффективной охоты
5. **Статистические методы** (z-score, long tail, кластеризация) помогают выявлять аномалии
6. **Документирование** — обязательная часть охоты, результат должен включать IoC и новые правила детекции
7. **Velociraptor и HELK** — мощные open-source инструменты для организации процесса охоты
