# Глава 5.4: Vulnerability Management и Patch Management

## 🎯 Цели главы

К концу этой главы вы будете уметь:

- Описать полный жизненный цикл уязвимости от обнаружения до подтверждения устранения
- Интерпретировать CVSS-оценки и использовать их для приоритизации
- Работать с основными сканерами уязвимостей: OpenVAS, Nessus, Qualys
- Ориентироваться в базах CVE, NVD, OVAL
- Построить процесс patch management с SLA по критичности
- Принимать обоснованные решения: исправлять vs принять риск
- Развернуть OpenVAS в домашней лаборатории и провести первое сканирование

---

## 5.4.1 Vulnerability Management: обзор

### Что такое управление уязвимостями

**Vulnerability Management** — непрерывный процесс идентификации, классификации, приоритизации, устранения и проверки устранения уязвимостей в IT-инфраструктуре.

```
Без VM:                    С VM:
                           
"Мы не знаем, что       → "У нас 847 уязвимостей.
у нас уязвимо"             Критических: 12.
                           8 из них активно
"Обновляемся когда         эксплуатируются.
придёт время"           → 5 исправим сегодня,
                           остальные по расписанию."
"Нас взломали через
MS17-010 (EternalBlue)  → EternalBlue у нас
который был патчем в       была исправлена за
2017 году"                 7 дней после выхода
                           патча MS17-010."
```

### Жизненный цикл уязвимости

```
+-------------+   +-------------+   +-------------+
| 1. Discovery|→  | 2. Assessment|→  | 3. Remediation|
|             |   |             |   |               |
| Scanning    |   | CVSS scoring|   | Patching      |
| Pentest     |   | Risk context|   | Workaround    |
| Bug bounty  |   | Prioritize  |   | Accept risk   |
+-------------+   +-------------+   +-------------+
      ^                                     |
      |                                     v
+-------------+                   +-------------+
| 5. Reporting|                   | 4. Verification|
|             |                   |               |
| Metrics     |←------------------| Re-scan       |
| Trends      |                   | Pentest verify|
| SLA status  |                   | Compliance    |
+-------------+                   +-------------+
```

---

## 5.4.2 CVSS: система оценки уязвимостей

### Common Vulnerability Scoring System

**CVSS** (Common Vulnerability Scoring System) — стандарт оценки серьёзности уязвимостей. Текущая версия: **CVSS v3.1** (CVSS v4.0 выпущен в 2023).

```
CVSS Score:  0.0 - 10.0

0.0         None (Нет уязвимости)
0.1 - 3.9   Low (Низкая)
4.0 - 6.9   Medium (Средняя)
7.0 - 8.9   High (Высокая)
9.0 - 10.0  Critical (Критическая)
```

### CVSS v3.1 Base Metrics

```
Base Score = f(AV, AC, PR, UI, S, C, I, A)

+------------------+--------------------------------+
| Метрика          | Значения                       |
+------------------+--------------------------------+
| Attack Vector    | Network / Adjacent /           |
| (AV)             | Local / Physical               |
+------------------+--------------------------------+
| Attack           | Low / High                     |
| Complexity (AC)  |                                |
+------------------+--------------------------------+
| Privileges       | None / Low / High              |
| Required (PR)    |                                |
+------------------+--------------------------------+
| User             | None / Required                |
| Interaction (UI) |                                |
+------------------+--------------------------------+
| Scope (S)        | Unchanged / Changed            |
+------------------+--------------------------------+
| Confidentiality  | None / Low / High              |
| Impact (C)       |                                |
+------------------+--------------------------------+
| Integrity        | None / Low / High              |
| Impact (I)       |                                |
+------------------+--------------------------------+
| Availability     | None / Low / High              |
| Impact (A)       |                                |
+------------------+--------------------------------+
```

### Разбор реального CVE

**CVE-2021-44228 (Log4Shell) — CVSS 10.0**

```
Attack Vector:    Network (N)     → Эксплойт через интернет
Attack Complexity: Low (L)        → Тривиально прост
Privileges Required: None (N)     → Не нужна авторизация
User Interaction: None (N)        → Автоматическое выполнение
Scope: Changed (C)                → Выход за пределы компонента
Confidentiality: High (H)         → Полный доступ к данным
Integrity: High (H)               → Полный контроль
Availability: High (H)            → Полное нарушение работы

CVSS String: AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H
Score: 10.0 (Critical)
```

**CVE-2020-1472 (Zerologon) — CVSS 10.0**

```
MS Active Directory Domain Controller
Без аутентификации → получить Domain Admin

AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H = 10.0
```

### Temporal и Environmental метрики

```
CVSS v3.1 компоненты:
1. Base Score     (базовый, не меняется)
2. Temporal Score (учитывает текущую ситуацию)
3. Environmental  (учитывает вашу среду)

Temporal Metrics:
- Exploit Code Maturity: Проверен ли публичный эксплойт?
  (Unproven / POC / Functional / High)
  
- Remediation Level: Доступен ли патч?
  (Official Fix / Temporary Fix / Workaround / Unavailable)

- Report Confidence: Насколько достоверна информация?
  (Confirmed / Reasonable / Unknown)

Пример: Base 7.5, но эксплойт публично доступен → Temporal ↑
        Base 7.5, но патч уже выпущен → Temporal ↓
```

### Python-калькулятор CVSS

```python
#!/usr/bin/env python3
"""
CVSS v3.1 Calculator
Упрощённая реализация для понимания принципов
"""
from dataclasses import dataclass
from enum import Enum
import math

class AttackVector(Enum):
    NETWORK = 0.85
    ADJACENT = 0.62
    LOCAL = 0.55
    PHYSICAL = 0.2

class AttackComplexity(Enum):
    LOW = 0.77
    HIGH = 0.44

class PrivilegesRequired(Enum):
    NONE = 0.85
    LOW_UNCHANGED = 0.62
    LOW_CHANGED = 0.5
    HIGH_UNCHANGED = 0.27
    HIGH_CHANGED = 0.5

class UserInteraction(Enum):
    NONE = 0.85
    REQUIRED = 0.62

class Impact(Enum):
    NONE = 0.0
    LOW = 0.22
    HIGH = 0.56

@dataclass
class CVSSVector:
    attack_vector: float       # AV
    attack_complexity: float   # AC
    privileges_required: float # PR
    user_interaction: float    # UI
    scope_changed: bool        # S
    confidentiality: float     # C
    integrity: float           # I
    availability: float        # A

def calculate_cvss_base(vector: CVSSVector) -> float:
    """Вычисление CVSS Base Score"""
    
    # Вычисление ISS (Impact Sub-Score)
    iss = 1 - (
        (1 - vector.confidentiality) * 
        (1 - vector.integrity) * 
        (1 - vector.availability)
    )
    
    # Вычисление Impact Score
    if vector.scope_changed:
        impact = 7.52 * (iss - 0.029) - 3.25 * pow(iss - 0.02, 15)
    else:
        impact = 6.42 * iss
    
    # Вычисление Exploitability Score
    exploitability = (
        8.22 * 
        vector.attack_vector * 
        vector.attack_complexity * 
        vector.privileges_required * 
        vector.user_interaction
    )
    
    if impact <= 0:
        return 0.0
    
    if vector.scope_changed:
        raw_score = min(1.08 * (impact + exploitability), 10)
    else:
        raw_score = min(impact + exploitability, 10)
    
    # Округление вверх до 1 десятичного знака
    return math.ceil(raw_score * 10) / 10

def severity_label(score: float) -> str:
    """Текстовая метка серьёзности"""
    if score == 0.0:
        return "None"
    elif score < 4.0:
        return "Low"
    elif score < 7.0:
        return "Medium"
    elif score < 9.0:
        return "High"
    else:
        return "Critical"

# Пример: Log4Shell
log4shell = CVSSVector(
    attack_vector=AttackVector.NETWORK.value,      # AV:N
    attack_complexity=AttackComplexity.LOW.value,   # AC:L
    privileges_required=0.85,                       # PR:N
    user_interaction=UserInteraction.NONE.value,    # UI:N
    scope_changed=True,                              # S:C
    confidentiality=Impact.HIGH.value,              # C:H
    integrity=Impact.HIGH.value,                    # I:H
    availability=Impact.HIGH.value,                 # A:H
)

score = calculate_cvss_base(log4shell)
print(f"Log4Shell CVSS Score: {score} ({severity_label(score)})")
# Ожидаемый результат: 10.0 (Critical)
```

---

## 5.4.3 Базы данных уязвимостей

### CVE (Common Vulnerabilities and Exposures)

```
CVE = уникальный идентификатор уязвимости

Формат: CVE-[ГОД]-[НОМЕР]
Пример: CVE-2021-44228

CVE Program:
- Управляется MITRE Corporation
- Финансируется CISA (DHS)
- CNA (CVE Numbering Authority) — организации,
  которые могут назначать CVE
  (Microsoft, Google, Apple, Canonical, etc.)

Жизненный цикл CVE:
1. Исследователь находит уязвимость
2. CNA назначает CVE ID
3. Публичное раскрытие (обычно после патча)
4. NVD обогащает CVSS, OVAL данными
```

### NVD (National Vulnerability Database)

```
NVD = расширение CVE с дополнительными данными

NVD добавляет к CVE:
- CVSS Score (базовый и временной)
- CWE (класс уязвимости)
- OVAL (машиночитаемые условия проверки)
- CPE (затронутые продукты)
- Ссылки на патчи и advisories

API NVD:
https://services.nvd.nist.gov/rest/json/cves/2.0/
```

```python
#!/usr/bin/env python3
"""
NVD API v2.0 - Поиск CVE информации
"""
import requests
import json
from datetime import datetime, timedelta

NVD_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0"

def get_cve_details(cve_id: str) -> dict:
    """Получение детальной информации о CVE"""
    url = f"{NVD_BASE}?cveId={cve_id}"
    
    response = requests.get(url, timeout=30, headers={
        "apiKey": "YOUR_NVD_API_KEY"  # Опционально, увеличивает лимиты
    })
    response.raise_for_status()
    data = response.json()
    
    if not data.get("vulnerabilities"):
        return {"error": f"CVE {cve_id} not found"}
    
    vuln = data["vulnerabilities"][0]["cve"]
    
    # Извлечение CVSS v3.1
    cvss_v31 = {}
    for metric in vuln.get("metrics", {}).get("cvssMetricV31", []):
        cvss_v31 = {
            "score": metric["cvssData"]["baseScore"],
            "severity": metric["cvssData"]["baseSeverity"],
            "vector": metric["cvssData"]["vectorString"],
        }
        break
    
    return {
        "id": vuln["id"],
        "description": vuln.get("descriptions", [{}])[0].get("value", ""),
        "published": vuln.get("published", ""),
        "modified": vuln.get("lastModified", ""),
        "cvss_v31": cvss_v31,
        "cwe": [
            cwe.get("description", [{}])[0].get("value", "")
            for cwe in vuln.get("weaknesses", [])
        ],
        "references": [
            ref.get("url") for ref in vuln.get("references", [])[:5]
        ],
    }

def search_recent_critical_cves(days: int = 7) -> list:
    """Поиск критических CVE за последние N дней"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    url = (f"{NVD_BASE}"
           f"?pubStartDate={start_date.strftime('%Y-%m-%dT00:00:00.000')}"
           f"&pubEndDate={end_date.strftime('%Y-%m-%dT23:59:59.999')}"
           f"&cvssV3Severity=CRITICAL"
           f"&resultsPerPage=20")
    
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    data = response.json()
    
    results = []
    for item in data.get("vulnerabilities", []):
        vuln = item["cve"]
        
        cvss_score = 0
        for metric in vuln.get("metrics", {}).get("cvssMetricV31", []):
            cvss_score = metric["cvssData"]["baseScore"]
            break
        
        results.append({
            "id": vuln["id"],
            "published": vuln.get("published", "")[:10],
            "cvss_score": cvss_score,
            "description": vuln.get("descriptions", [{}])[0].get("value", "")[:150],
        })
    
    return sorted(results, key=lambda x: x["cvss_score"], reverse=True)

if __name__ == "__main__":
    # Пример использования
    print("=== CVE-2021-44228 (Log4Shell) ===")
    details = get_cve_details("CVE-2021-44228")
    print(json.dumps(details, indent=2))
    
    print("\n=== Recent Critical CVEs (last 7 days) ===")
    critical = search_recent_critical_cves(7)
    for cve in critical[:5]:
        print(f"{cve['id']} ({cve['published']}) — CVSS {cve['cvss_score']}")
        print(f"  {cve['description'][:100]}...")
```

### OVAL (Open Vulnerability and Assessment Language)

```
OVAL = машиночитаемое определение уязвимости

Что делает OVAL:
- Описывает условия наличия уязвимости в системе
- Используется сканерами для автоматической проверки
- Позволяет: "Windows 10 версии X с этим обновлением УЯЗВИМА"

Структура OVAL:
Definition
├── Criteria (логические условия)
├── Tests (что проверяем)
│   ├── Registry value exists?
│   ├── File version >= X?
│   └── Process running?
└── States (ожидаемые значения)

Пример применения:
Nessus, OpenVAS используют OVAL для точного
определения уязвимости без ложных срабатываний
```

---

## 5.4.4 Сканеры уязвимостей

### Сравнение основных сканеров

```
+------------------+--------+-----------+----------+---------+
| Параметр         | OpenVAS| Nessus    | Qualys   | Rapid7  |
|                  | (free) | Essentials| (Cloud)  | InsightVM|
+------------------+--------+-----------+----------+---------+
| Стоимость        | Free   | Free/~$$$  | $$$      | $$$     |
| Онпрем/Облако    | Both   | Both       | Cloud    | Both    |
| Кол-во плагинов  | 50K+   | 160K+     | 130K+    | 80K+    |
| Authenticated    | Да     | Да        | Да       | Да      |
| Agent-based      | Нет    | Да        | Да       | Да      |
| API              | Да     | Да        | Да       | Да      |
| Reporting        | Хорошо | Отличный  | Отличный | Отличный|
+------------------+--------+-----------+----------+---------+
```

### Nessus Essentials (бесплатно до 16 IP)

```
Nessus — самый популярный сканер уязвимостей

Установка на Ubuntu/Debian:
1. Скачать с: https://www.tenable.com/downloads/nessus
2. dpkg -i Nessus-10.x.x-debian10_amd64.deb
3. systemctl start nessusd
4. Открыть: https://localhost:8834
5. Зарегистрировать код Essentials (бесплатно)

Типы сканирований:
+---------------------+------------------------------------+
| Basic Network Scan  | Стандартное сетевое сканирование  |
| Advanced Scan       | Полное сканирование с настройками |
| Credentialed Patch  | Аутентифицированный аудит патчей  |
| Web Application     | Сканирование веб-приложений       |
| Malware Scan        | Поиск вредоносного ПО             |
| Policy Compliance   | Проверка соответствия CIS/DISA    |
+---------------------+------------------------------------+

Важно: Credentialed Scan >> Unauthenticated Scan
- Без учётных данных: ~30% реальных уязвимостей
- С учётными данными: ~95% реальных уязвимостей
```

### OpenVAS / Greenbone Vulnerability Manager

```
OpenVAS = Open Vulnerability Assessment System
GVM = Greenbone Vulnerability Management (новое название)

Компоненты GVM:
+-------------------+----------------------------------------+
| OpenVAS Scanner   | Движок сканирования (NVT-based)       |
| GVM Services      | Backend, управление данными           |
| GSA (Greenbone    | Web-интерфейс                         |
|  Security Assist.)|                                       |
| GVMD              | OpenVAS Management Protocol daemon   |
+-------------------+----------------------------------------+
```

**Установка OpenVAS через Docker (для домашней лаборатории):**

```bash
#!/bin/bash
# Установка OpenVAS/GVM через Docker

# 1. Установить Docker если ещё нет
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Запустить OpenVAS контейнер
docker pull greenbone/community-edition

# Запуск через docker-compose
cat > ~/openvas/docker-compose.yml << 'EOF'
version: "3"
services:
  vulnerability-tests:
    image: greenbone/vulnerability-tests
    environment:
      STORAGE_PATH: /var/lib/openvas/22.04/vt-data/nasl
    volumes:
      - vt_data_vol:/mnt

  notus-data:
    image: greenbone/notus-data
    volumes:
      - notus_data_vol:/mnt

  nasl-data:
    image: greenbone/nasl-data
    volumes:
      - nasl_data_vol:/mnt

  cert-bund-data:
    image: greenbone/cert-bund-data
    volumes:
      - cert_bund_data_vol:/mnt

  dfn-cert-data:
    image: greenbone/dfn-cert-data
    volumes:
      - dfn_cert_data_vol:/mnt
    depends_on:
      - cert-bund-data

  data-objects:
    image: greenbone/data-objects
    volumes:
      - data_objects_vol:/mnt

  report-formats:
    image: greenbone/report-formats
    volumes:
      - report_formats_vol:/mnt
    depends_on:
      - data-objects

  gpg-data:
    image: greenbone/gpg-data
    volumes:
      - gpg_data_vol:/mnt

  redis-server:
    image: greenbone/redis-server
    restart: on-failure
    volumes:
      - redis_socket_vol:/run/redis/

  pg-gvm:
    image: greenbone/pg-gvm:stable
    restart: on-failure
    volumes:
      - psql_data_vol:/var/lib/postgresql
      - psql_socket_vol:/var/run/postgresql

  gvmd:
    image: greenbone/gvmd:stable
    restart: on-failure
    volumes:
      - gvmd_data_vol:/var/lib/gvm
      - scap_data_vol:/var/lib/gvm/scap-data
      - cert_data_vol:/var/lib/gvm/cert-data
      - data_objects_vol:/var/lib/gvm/data-objects/gvmd
      - vt_data_vol:/var/lib/openvas/plugins
      - psql_data_vol:/var/lib/postgresql
      - gvmd_socket_vol:/var/run/gvmd
      - ospd_openvas_socket_vol:/var/run/ospd
      - psql_socket_vol:/var/run/postgresql
    depends_on:
      pg-gvm:
        condition: service_started

  gsa:
    image: greenbone/gsa:stable
    restart: on-failure
    ports:
      - 9392:80
    volumes:
      - gvmd_socket_vol:/var/run/gvmd
    depends_on:
      - gvmd

  ospd-openvas:
    image: greenbone/ospd-openvas:stable
    restart: on-failure
    init: true
    hostname: ospd-openvas
    cap_add:
      - NET_ADMIN
      - NET_RAW
    security_opt:
      - seccomp=unconfined
      - apparmor=unconfined
    volumes:
      - gpg_data_vol:/etc/openvas/gnupg
      - vt_data_vol:/var/lib/openvas/plugins
      - notus_data_vol:/var/lib/notus
      - ospd_openvas_socket_vol:/var/run/ospd
      - redis_socket_vol:/run/redis/
    depends_on:
      redis-server:
        condition: service_started
      gpg-data:
        condition: service_completed_successfully
      vulnerability-tests:
        condition: service_completed_successfully

volumes:
  gpg_data_vol:
  scap_data_vol:
  cert_data_vol:
  cert_bund_data_vol:
  dfn_cert_data_vol:
  data_objects_vol:
  report_formats_vol:
  gvmd_data_vol:
  psql_data_vol:
  vt_data_vol:
  notus_data_vol:
  psql_socket_vol:
  gvmd_socket_vol:
  ospd_openvas_socket_vol:
  redis_socket_vol:
EOF

mkdir -p ~/openvas
cd ~/openvas
docker-compose -f ~/openvas/docker-compose.yml up -d

echo "OpenVAS запускается... подождите 3-5 минут"
echo "Веб-интерфейс: https://localhost:9392"
echo "Логин: admin / admin (изменить после первого входа!)"
```

**Управление OpenVAS через API:**

```python
#!/usr/bin/env python3
"""
OpenVAS/GVM Python API
Установка: pip install python-gvm
"""
from gvm.connections import TLSConnection
from gvm.protocols.gmp import Gmp
from gvm.transforms import EtreeCheckCommandTransform
import xml.etree.ElementTree as ET

GVM_HOST = "localhost"
GVM_PORT = 9390
GVM_USER = "admin"
GVM_PASS = "admin"

def create_scan_task(target_ip: str, scan_name: str) -> str:
    """Создание задачи сканирования"""
    connection = TLSConnection(hostname=GVM_HOST, port=GVM_PORT)
    transform = EtreeCheckCommandTransform()
    
    with Gmp(connection, transform=transform) as gmp:
        # Аутентификация
        gmp.authenticate(GVM_USER, GVM_PASS)
        
        # Создание цели сканирования
        target_response = gmp.create_target(
            name=f"Target-{target_ip}",
            hosts=[target_ip],
            port_list_id="33d0cd82-57c6-11e1-8ed1-406186ea4fc5",  # All IANA ports
        )
        target_id = target_response.get("id")
        
        # Получение ID конфигурации (Full and Fast)
        configs = gmp.get_scan_configs()
        full_fast_id = None
        for config in configs.findall(".//config"):
            if "Full and fast" in config.findtext("name", ""):
                full_fast_id = config.get("id")
                break
        
        # Создание задачи
        task_response = gmp.create_task(
            name=scan_name,
            config_id=full_fast_id,
            target_id=target_id,
            scanner_id="08b69003-5fc2-4037-a479-93b440211c73",  # Default scanner
        )
        task_id = task_response.get("id")
        
        # Запуск задачи
        gmp.start_task(task_id)
        
        print(f"[+] Scan task created and started: {task_id}")
        return task_id

def get_scan_results(task_id: str) -> list:
    """Получение результатов сканирования"""
    connection = TLSConnection(hostname=GVM_HOST, port=GVM_PORT)
    transform = EtreeCheckCommandTransform()
    
    vulnerabilities = []
    
    with Gmp(connection, transform=transform) as gmp:
        gmp.authenticate(GVM_USER, GVM_PASS)
        
        # Получение отчёта для задачи
        task = gmp.get_task(task_id)
        report_id = task.findtext(".//last_report/report/@id")
        
        if not report_id:
            return []
        
        # Получение результатов
        results = gmp.get_results(
            filter_string=f"task_id={task_id} severity>0",
            details=True
        )
        
        for result in results.findall(".//result"):
            vuln = {
                "name": result.findtext("name", ""),
                "host": result.findtext("host", ""),
                "port": result.findtext("port", ""),
                "severity": float(result.findtext("severity", "0")),
                "cvss": result.findtext("nvt/cvss_base", "0"),
                "cve": result.findtext("nvt/refs/ref[@type='cve']/@id", ""),
                "solution": result.findtext("nvt/solution", ""),
                "description": result.findtext("description", "")[:300],
            }
            vulnerabilities.append(vuln)
    
    return sorted(vulnerabilities, key=lambda x: x["severity"], reverse=True)

def generate_summary_report(vulnerabilities: list) -> dict:
    """Генерация сводного отчёта"""
    severity_counts = {
        "Critical": 0,  # 9.0-10.0
        "High": 0,       # 7.0-8.9
        "Medium": 0,     # 4.0-6.9
        "Low": 0,        # 0.1-3.9
    }
    
    for vuln in vulnerabilities:
        score = vuln["severity"]
        if score >= 9.0:
            severity_counts["Critical"] += 1
        elif score >= 7.0:
            severity_counts["High"] += 1
        elif score >= 4.0:
            severity_counts["Medium"] += 1
        else:
            severity_counts["Low"] += 1
    
    return {
        "total": len(vulnerabilities),
        "by_severity": severity_counts,
        "top_critical": [v for v in vulnerabilities if v["severity"] >= 9.0][:10],
        "unique_hosts": len(set(v["host"] for v in vulnerabilities)),
    }
```

---

## 5.4.5 Приоритизация уязвимостей

### Почему CVSS недостаточно

```
CVSS проблема:
+------------------------------------------+
| CVE-2021-44228 Log4Shell: 10.0 Critical  |
| CVE-2021-45046 Log4j RCE: 9.0 Critical   |
| CVE-2020-1472  Zerologon: 10.0 Critical  |
| CVE-2021-34527 PrintNightmare: 8.8 High  |
+------------------------------------------+
У вас 5 часов: что исправляете первым?

CVSS не учитывает:
- Есть ли публичный эксплойт?
- Эксплуатируется ли активно прямо сейчас?
- Доступен ли уязвимый сервис из интернета?
- Насколько критичен актив для бизнеса?
```

### CVSS + EPSS + CISA KEV = реальный приоритет

**EPSS (Exploit Prediction Scoring System)**

```
EPSS = вероятность эксплуатации уязвимости в ближайшие 30 дней

Диапазон: 0.0 - 1.0 (0% - 100%)

Пример:
CVE-2021-44228: EPSS = 0.97 (97% вероятность!) → СРОЧНО
CVE-2021-XXXXX: CVSS 9.0, EPSS = 0.001 (0.1%) → Можно подождать

Только ~4% CVE когда-либо эксплуатируются в wild
→ EPSS помогает сфокусироваться на реальных угрозах
```

**CISA KEV (Known Exploited Vulnerabilities Catalog)**

```
CISA ведёт список уязвимостей, которые АКТИВНО
эксплуатируются прямо сейчас.

Каталог: https://www.cisa.gov/known-exploited-vulnerabilities-catalog

Правило: Если CVE в KEV → патчить немедленно
(для госорганов США — обязательно в течение 2 недель)
```

```python
#!/usr/bin/env python3
"""
Комбинированная приоритизация уязвимостей:
CVSS + EPSS + CISA KEV
"""
import requests
import json
from dataclasses import dataclass
from typing import Optional

@dataclass
class VulnerabilityPriority:
    cve_id: str
    cvss_score: float
    epss_score: float
    in_kev: bool
    asset_criticality: int  # 1-5 (5 = critical business asset)
    exploitable_from_internet: bool
    
    @property
    def priority_score(self) -> float:
        """
        Итоговый приоритет (0-100):
        Учитывает CVSS, EPSS, KEV, критичность актива, экспозицию
        """
        score = 0
        
        # CVSS вклад (max 30 очков)
        score += (self.cvss_score / 10) * 30
        
        # EPSS вклад (max 30 очков)
        score += self.epss_score * 30
        
        # KEV статус (max 20 очков)
        if self.in_kev:
            score += 20
        
        # Критичность актива (max 10 очков)
        score += (self.asset_criticality / 5) * 10
        
        # Экспозиция в интернет (max 10 очков)
        if self.exploitable_from_internet:
            score += 10
        
        return min(score, 100)
    
    @property
    def sla_days(self) -> int:
        """Рекомендуемый срок исправления"""
        score = self.priority_score
        
        if self.in_kev:
            return 1  # Немедленно
        elif score >= 90:
            return 1
        elif score >= 70:
            return 7
        elif score >= 50:
            return 30
        elif score >= 30:
            return 90
        else:
            return 180

def fetch_epss_score(cve_id: str) -> float:
    """Получение EPSS оценки для CVE"""
    url = f"https://api.first.org/data/v1/epss?cve={cve_id}"
    
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        if data.get("data"):
            return float(data["data"][0].get("epss", 0))
    except Exception:
        pass
    return 0.0

def is_in_kev(cve_id: str, kev_catalog: list) -> bool:
    """Проверка наличия CVE в CISA KEV"""
    return any(v.get("cveID") == cve_id for v in kev_catalog)

def fetch_kev_catalog() -> list:
    """Загрузка актуального каталога CISA KEV"""
    url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
    
    try:
        response = requests.get(url, timeout=30)
        data = response.json()
        return data.get("vulnerabilities", [])
    except Exception as e:
        print(f"Warning: Could not fetch KEV catalog: {e}")
        return []

def prioritize_vulnerabilities(vulnerabilities: list) -> list:
    """
    Приоритизация списка уязвимостей
    
    Input:
    [{"cve_id": "CVE-XXXX", "cvss": 9.0, "asset_criticality": 5, 
      "internet_facing": True}]
    """
    print("[*] Loading CISA KEV catalog...")
    kev_catalog = fetch_kev_catalog()
    print(f"[+] KEV catalog loaded: {len(kev_catalog)} entries")
    
    results = []
    
    for vuln in vulnerabilities:
        cve_id = vuln["cve_id"]
        
        # Получаем EPSS
        epss = fetch_epss_score(cve_id)
        
        priority = VulnerabilityPriority(
            cve_id=cve_id,
            cvss_score=vuln.get("cvss", 0),
            epss_score=epss,
            in_kev=is_in_kev(cve_id, kev_catalog),
            asset_criticality=vuln.get("asset_criticality", 3),
            exploitable_from_internet=vuln.get("internet_facing", False),
        )
        
        results.append({
            "cve_id": cve_id,
            "cvss": priority.cvss_score,
            "epss": f"{priority.epss_score:.4f}",
            "in_kev": priority.in_kev,
            "priority_score": f"{priority.priority_score:.1f}",
            "sla_days": priority.sla_days,
            "recommendation": "PATCH IMMEDIATELY" if priority.sla_days <= 1 
                            else f"Patch within {priority.sla_days} days"
        })
    
    return sorted(results, key=lambda x: float(x["priority_score"]), reverse=True)

# Пример использования
test_vulns = [
    {"cve_id": "CVE-2021-44228", "cvss": 10.0, "asset_criticality": 5, "internet_facing": True},
    {"cve_id": "CVE-2020-1472", "cvss": 10.0, "asset_criticality": 4, "internet_facing": False},
    {"cve_id": "CVE-2021-34527", "cvss": 8.8, "asset_criticality": 4, "internet_facing": False},
]

if __name__ == "__main__":
    prioritized = prioritize_vulnerabilities(test_vulns)
    print("\n=== Vulnerability Priority Report ===")
    for vuln in prioritized:
        print(f"\n{vuln['cve_id']}")
        print(f"  CVSS: {vuln['cvss']} | EPSS: {vuln['epss']} | KEV: {vuln['in_kev']}")
        print(f"  Priority Score: {vuln['priority_score']}/100")
        print(f"  Action: {vuln['recommendation']}")
```

---

## 5.4.6 Patch Management Process

### Процесс управления патчами

```
PATCH MANAGEMENT LIFECYCLE:

1. ИДЕНТИФИКАЦИЯ           2. ТЕСТИРОВАНИЕ
+----------------+         +----------------+
| Подписка на    |         | Test environment|
| vendor alerts  |    →    | UAT staging    |
| CVE monitoring |         | Rollback plan  |
| VM scanning    |         +----------------+
+----------------+                |
                                  v
5. ВЕРИФИКАЦИЯ             3. РАЗВЁРТЫВАНИЕ
+----------------+         +----------------+
| Re-scan        |    ←    | Maintenance    |
| Compliance     |         | window         |
| report         |         | Phased rollout |
+----------------+         | Change request |
                           +----------------+
                                  |
                                  v
                           4. ДОКУМЕНТИРОВАНИЕ
                           +----------------+
                           | CMDB update    |
                           | Audit trail    |
                           | Metrics        |
                           +----------------+
```

### SLA для исправления уязвимостей

```
Отраслевые стандарты SLA (по критичности):

+----------+-------------+---------+-----------+------------+
| Критич.  | CVSS Score  | EPSS/KEV| Интернет  | SLA (дни)  |
+----------+-------------+---------+-----------+------------+
| P0/CRIT  | 9.0-10.0    | Да      | Да        | 1 день     |
| P1/HIGH  | 9.0-10.0    | Нет     | Нет       | 7 дней     |
|          | 7.0-8.9     | Да      | Да        | 7 дней     |
| P2/MEDIUM| 7.0-8.9     | Нет     | Нет       | 30 дней    |
|          | 4.0-6.9     | Да      | Да        | 30 дней    |
| P3/LOW   | 4.0-6.9     | Нет     | Нет       | 90 дней    |
|          | 0.1-3.9     | Нет     | —         | 180 дней   |
| Accept   | 0.0         | —       | —         | Accept      |
+----------+-------------+---------+-----------+------------+

PCI DSS требования:
- Critical (CVSS ≥ 9.0): 30 дней
- High (CVSS ≥ 7.0): 90 дней

ISO 27001 / NIST 800-40:
- Critical: 14 дней (рекомендация)
- High: 30 дней
- Medium: 90 дней
- Low: 180 дней
```

### Patch Management в Windows среде

```powershell
# PowerShell скрипты для VM в Windows среде

# 1. Получение списка отсутствующих обновлений через WSUS/WUA
$updateSession = New-Object -ComObject Microsoft.Update.Session
$updateSearcher = $updateSession.CreateUpdateSearcher()

# Поиск обновлений, которые не установлены
$searchResult = $updateSearcher.Search("IsInstalled=0 AND IsHidden=0")

$missing_updates = @()
foreach ($update in $searchResult.Updates) {
    $missing_updates += [PSCustomObject]@{
        Title       = $update.Title
        KB          = ($update.KBArticleIDs -join ", ")
        Severity    = $update.MsrcSeverity
        Size        = [math]::Round($update.MaxDownloadSize/1MB, 2)
        IsMandatory = $update.IsMandatory
    }
}

$missing_updates | Where-Object { $_.Severity -eq "Critical" } |
    Sort-Object Title |
    Format-Table -AutoSize

# 2. Проверка конкретного KB номера
function Test-KBInstalled {
    param([string]$KBNumber)
    
    $hotfix = Get-HotFix -Id "KB$KBNumber" -ErrorAction SilentlyContinue
    return $null -ne $hotfix
}

# Проверка критических патчей
$critical_kbs = @("5004945", "5003646", "4601354")  # Примеры KB
foreach ($kb in $critical_kbs) {
    $installed = Test-KBInstalled -KBNumber $kb
    Write-Host "KB$kb : $($installed ? 'INSTALLED' : 'MISSING')"
}

# 3. Принудительная установка через WinRM (remoting)
$computers = @("SERVER01", "SERVER02", "WORKSTATION01")
foreach ($computer in $computers) {
    Invoke-Command -ComputerName $computer -ScriptBlock {
        $updateSession = New-Object -ComObject Microsoft.Update.Session
        $updateInstaller = $updateSession.CreateUpdateInstaller()
        # ... установка обновлений
        Write-Output "Updates applied to $env:COMPUTERNAME"
    }
}
```

### Ansible для автоматизации патчинга Linux

```yaml
# ansible/patch_linux.yml
---
- name: Security Patch Management
  hosts: all
  become: yes
  vars:
    reboot_timeout: 300
    
  tasks:
    - name: Update package cache (Debian/Ubuntu)
      apt:
        update_cache: yes
        cache_valid_time: 3600
      when: ansible_os_family == "Debian"
      
    - name: Update package cache (RHEL/CentOS)
      yum:
        update_cache: yes
      when: ansible_os_family == "RedHat"
    
    - name: Install security updates only (Debian/Ubuntu)
      apt:
        upgrade: yes
        default_release: "{{ ansible_distribution_release }}-security"
      when: ansible_os_family == "Debian"
      register: apt_result
      
    - name: Install security updates only (RHEL/CentOS)
      yum:
        name: '*'
        security: yes
        state: latest
      when: ansible_os_family == "RedHat"
      register: yum_result
    
    - name: Check if reboot required (Debian)
      stat:
        path: /var/run/reboot-required
      register: reboot_required_file
      when: ansible_os_family == "Debian"
    
    - name: Reboot if required
      reboot:
        reboot_timeout: "{{ reboot_timeout }}"
        msg: "Rebooting for security patches"
      when: >
        (ansible_os_family == "Debian" and 
         reboot_required_file.stat.exists is defined and
         reboot_required_file.stat.exists)
    
    - name: Generate patch report
      template:
        src: patch_report.j2
        dest: "/tmp/patch_report_{{ inventory_hostname }}.txt"
```

---

## 5.4.7 Risk Acceptance vs Remediation

### Когда принимать риск

```
Факторы для Risk Acceptance:

ТЕХНИЧЕСКИЕ:
- Уязвимость в ПО, которое нельзя обновить
  (legacy system, vendor support ended)
- Патч нарушает критически важный бизнес-процесс
- Уязвимость не эксплуатируется для данной конфигурации

БИЗНЕС:
- Стоимость исправления > стоимость риска
- Нет патча от вендора (0-day)
- Временное окно: активная фаза бизнеса

КОМПЕНСИРУЮЩИЕ КОНТРОЛИ:
- Система в изолированном сегменте сети
- Дополнительный WAF/IPS правило добавлен
- Аутентификация усилена
```

### Risk Acceptance процесс

```python
#!/usr/bin/env python3
"""
Risk Acceptance Management
Документирование и трекинг принятых рисков
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional
import json
import uuid

class RiskAcceptanceStatus(Enum):
    PENDING = "Pending Review"
    APPROVED = "Approved"
    REJECTED = "Rejected"  
    EXPIRED = "Expired"
    REMEDIATED = "Remediated"

@dataclass
class RiskAcceptanceRecord:
    cve_id: str
    asset: str
    cvss_score: float
    business_justification: str
    compensating_controls: list
    requester: str
    approver: Optional[str] = None
    
    # Auto-generated
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    created_at: datetime = field(default_factory=datetime.utcnow)
    expiry_date: Optional[datetime] = None
    status: RiskAcceptanceStatus = RiskAcceptanceStatus.PENDING
    review_notes: str = ""
    
    def __post_init__(self):
        # Автоматически устанавливаем срок: max 1 год для Critical
        if self.expiry_date is None:
            if self.cvss_score >= 9.0:
                self.expiry_date = self.created_at + timedelta(days=90)
            elif self.cvss_score >= 7.0:
                self.expiry_date = self.created_at + timedelta(days=180)
            else:
                self.expiry_date = self.created_at + timedelta(days=365)
    
    @property
    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expiry_date
    
    def approve(self, approver: str, notes: str = "") -> None:
        """Одобрение риска"""
        if self.cvss_score >= 9.0 and not notes:
            raise ValueError("Critical vulnerabilities require justification notes")
        
        self.approver = approver
        self.review_notes = notes
        self.status = RiskAcceptanceStatus.APPROVED
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "cve_id": self.cve_id,
            "asset": self.asset,
            "cvss_score": self.cvss_score,
            "risk_level": self._get_risk_level(),
            "business_justification": self.business_justification,
            "compensating_controls": self.compensating_controls,
            "requester": self.requester,
            "approver": self.approver,
            "created_at": self.created_at.isoformat(),
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "status": self.status.value,
            "review_notes": self.review_notes,
            "is_expired": self.is_expired,
        }
    
    def _get_risk_level(self) -> str:
        if self.cvss_score >= 9.0: return "CRITICAL"
        if self.cvss_score >= 7.0: return "HIGH"
        if self.cvss_score >= 4.0: return "MEDIUM"
        return "LOW"

class RiskAcceptanceRegistry:
    """Реестр принятых рисков"""
    
    def __init__(self, db_file: str = "risk_acceptance.json"):
        self.db_file = db_file
        self.records: list = []
        self._load()
    
    def _load(self):
        try:
            with open(self.db_file) as f:
                data = json.load(f)
                # Десериализация
                for item in data:
                    record = RiskAcceptanceRecord(
                        cve_id=item["cve_id"],
                        asset=item["asset"],
                        cvss_score=item["cvss_score"],
                        business_justification=item["business_justification"],
                        compensating_controls=item["compensating_controls"],
                        requester=item["requester"],
                    )
                    record.id = item["id"]
                    record.status = RiskAcceptanceStatus(item["status"])
                    self.records.append(record)
        except FileNotFoundError:
            pass
    
    def save(self):
        with open(self.db_file, "w") as f:
            json.dump([r.to_dict() for r in self.records], f, indent=2, default=str)
    
    def add(self, record: RiskAcceptanceRecord) -> str:
        self.records.append(record)
        self.save()
        return record.id
    
    def get_expired(self) -> list:
        """Получение истёкших принятий рисков для пересмотра"""
        return [r for r in self.records 
                if r.is_expired and r.status == RiskAcceptanceStatus.APPROVED]
    
    def get_by_cve(self, cve_id: str) -> list:
        return [r for r in self.records if r.cve_id == cve_id]
    
    def report_summary(self) -> dict:
        return {
            "total": len(self.records),
            "pending": sum(1 for r in self.records if r.status == RiskAcceptanceStatus.PENDING),
            "approved": sum(1 for r in self.records if r.status == RiskAcceptanceStatus.APPROVED),
            "expired": sum(1 for r in self.records if r.is_expired),
            "critical_accepted": sum(1 for r in self.records 
                                    if r.cvss_score >= 9.0 and r.status == RiskAcceptanceStatus.APPROVED),
        }
```

---

## 5.4.8 Метрики Vulnerability Management

```
Ключевые метрики VM:

1. MTTD (Mean Time to Detect)
   Среднее время от выхода CVE до обнаружения у нас

2. MTTP (Mean Time to Patch)
   Среднее время от обнаружения до исправления
   
3. Patch Compliance Rate (%)
   % активов с последними патчами
   
4. Vulnerability Exposure Window
   Время, в которое система была уязвима

5. Vuln Density
   Кол-во уязвимостей на 1 актив
   
6. SLA Compliance
   % уязвимостей, исправленных в рамках SLA

Дашборд метрик:
+----------------------------------+
| Critical Open: 5     [↓ от 12]   |
| High Open: 23        [↓ от 31]   |
| Patch Compliance: 94% [↑ от 87%] |
| Avg MTTP (Critical): 3.2 days    |
| SLA Compliance: 97%              |
+----------------------------------+
```

---

## 5.4.9 Практические упражнения

### Упражнение 1: Установка и настройка OpenVAS (60 мин)

```bash
# Установка и первый скан в OpenVAS

# 1. Запуск через Docker (см. раздел 5.4.4)
# 2. Первоначальная настройка после запуска:

# Получить admin пароль (если автогенерировался):
docker logs openvas_gvmd_1 2>&1 | grep "password"

# 3. Войти в веб-интерфейс: https://localhost:9392
# 4. Первое обновление базы NVT:
#    Administration → Feed Status → Update все фиды

# 5. Создать первый скан:
# Scans → Tasks → New Task (иконка звёздочки)
# - Name: "Lab Scan"
# - Scan Targets: кликнуть иконку новой цели
#   - Name: "Lab Network"
#   - Hosts: 192.168.1.0/24 (ваша локальная сеть)
# - Scanner: OpenVAS Default
# - Scan Config: Full and fast

# 6. Запустить скан (зелёный треугольник)

# 7. Дождаться завершения (может занять 30-60 мин)

# 8. Просмотреть результаты:
# Scans → Reports → кликнуть на ваш отчёт
# Изучить уязвимости по критичности

# 9. Экспортировать отчёт:
# Нажать иконку загрузки → выбрать PDF или XML
```

### Упражнение 2: Анализ CVSS и приоритизация (45 мин)

```
Задание: Приоритизировать список уязвимостей

Дано: 10 уязвимостей на критическом сервере (Windows AD DC)
Ресурсы: 4 часа на исправление

CVE-2021-44228  CVSS 10.0  Log4j  (Apache Tomcat запущен)
CVE-2020-1472   CVSS 10.0  Zerologon (DC)
CVE-2021-34527  CVSS 8.8   PrintNightmare
CVE-2019-0708   CVSS 9.8   BlueKeep (RDP открыт)
CVE-2017-0144   CVSS 9.3   EternalBlue (SMBv1 включён)
CVE-2022-26134  CVSS 9.8   Confluence RCE (не запущен)
CVE-2021-21985  CVSS 9.8   VMware vCenter (не в этой сети)
CVE-2021-40444  CVSS 7.8   MSHTML (Word/Office)
CVE-2022-30190  CVSS 7.8   Follina/MSDT
CVE-2021-36958  CVSS 7.0   Windows Print Spooler

Критерии оценки:
- Использует ли KEV (CISA каталог)?
- EPSS оценка
- Доступен ли из интернета?
- Есть ли публичный эксплойт?
- Насколько критичен актив?

Написать: ТОП-5 в порядке исправления с обоснованием
```

**Ожидаемый ответ:**

```
1. CVE-2020-1472 (Zerologon) — P0: НЕМЕДЛЕННО
   - CVSS 10.0, KEV, нет PR (Priv.Required), Domain Controller
   - 1 эксплойт → полный контроль AD

2. CVE-2019-0708 (BlueKeep) — P0: НЕМЕДЛЕННО  
   - CVSS 9.8, KEV, RDP открыт в интернет, wormable

3. CVE-2017-0144 (EternalBlue) — P1: 24 часа
   - CVSS 9.3, KEV, SMBv1 включён, WannaCry/NotPetya

4. CVE-2021-44228 (Log4Shell) — P1: 24 часа
   - CVSS 10.0, KEV, Tomcat запущен

5. CVE-2021-34527 (PrintNightmare) — P1: 7 дней
   - CVSS 8.8, KEV, но нет интернет-экспозиции

CVE-2022-26134: Confluence не запущен → не применимо
CVE-2021-21985: VMware не в этой сети → не применимо
```

### Упражнение 3: Python скрипт для отслеживания патчей (90 мин)

```python
#!/usr/bin/env python3
"""
ЗАДАНИЕ: Написать Patch Tracker
Скрипт должен:
1. Принимать CSV с результатами сканирования OpenVAS
2. Проверять каждый CVE через NVD и EPSS API
3. Применять SLA политику (P0/P1/P2/P3)
4. Генерировать отчёт с дедлайнами
5. Отправлять уведомления просроченных через Slack/Email

Структура CSV:
host,cve_id,cvss_score,plugin_name,port,description
192.168.1.10,CVE-2021-44228,10.0,Log4Shell Detection,8080,...
192.168.1.11,CVE-2020-1472,10.0,Zerologon Detection,445,...

ШАБЛОН для реализации:
"""
import csv
import json
import requests
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List

@dataclass
class VulnEntry:
    host: str
    cve_id: str
    cvss_score: float
    plugin_name: str
    port: str
    description: str
    # Будут заполнены после обогащения
    epss_score: float = 0.0
    in_kev: bool = False
    priority: str = ""
    deadline: datetime = None

def load_scan_csv(filepath: str) -> List[VulnEntry]:
    """TODO: Загрузить CSV с результатами сканирования"""
    entries = []
    with open(filepath) as f:
        reader = csv.DictReader(f)
        for row in reader:
            entries.append(VulnEntry(
                host=row["host"],
                cve_id=row["cve_id"],
                cvss_score=float(row["cvss_score"]),
                plugin_name=row["plugin_name"],
                port=row["port"],
                description=row["description"]
            ))
    return entries

def enrich_with_epss(entries: List[VulnEntry]) -> None:
    """TODO: Обогатить EPSS данными через API FIRST.org"""
    # API: https://api.first.org/data/v1/epss?cve=CVE-2021-44228
    pass

def check_kev(entries: List[VulnEntry]) -> None:
    """TODO: Проверить наличие в CISA KEV"""
    # https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
    pass

def assign_priority(entry: VulnEntry) -> str:
    """TODO: Назначить приоритет P0/P1/P2/P3 по формуле"""
    if entry.in_kev or entry.cvss_score >= 9.0:
        return "P0"
    elif entry.cvss_score >= 7.0 or entry.epss_score >= 0.1:
        return "P1"
    elif entry.cvss_score >= 4.0:
        return "P2"
    else:
        return "P3"

def calculate_deadline(entry: VulnEntry) -> datetime:
    """TODO: Рассчитать дедлайн по SLA"""
    sla_map = {"P0": 1, "P1": 7, "P2": 30, "P3": 90}
    days = sla_map.get(entry.priority, 90)
    return datetime.utcnow() + timedelta(days=days)

def generate_html_report(entries: List[VulnEntry], output_file: str) -> None:
    """TODO: Генерация HTML отчёта с таблицей уязвимостей"""
    html_template = """
    <!DOCTYPE html>
    <html>
    <head><title>Vulnerability Report</title></head>
    <body>
    <h1>Vulnerability Management Report</h1>
    <p>Generated: {date}</p>
    <table border="1">
    <tr>
        <th>CVE</th><th>Host</th><th>CVSS</th>
        <th>EPSS</th><th>KEV</th><th>Priority</th><th>Deadline</th>
    </tr>
    {rows}
    </table>
    </body>
    </html>
    """
    
    rows = ""
    for entry in sorted(entries, key=lambda x: (x.priority, -x.cvss_score)):
        color = {"P0": "#ff0000", "P1": "#ff6600", "P2": "#ffcc00", "P3": "#99cc00"}
        bg = color.get(entry.priority, "white")
        rows += f"""<tr style="background-color:{bg}33">
            <td>{entry.cve_id}</td>
            <td>{entry.host}</td>
            <td>{entry.cvss_score}</td>
            <td>{entry.epss_score:.3f}</td>
            <td>{'YES' if entry.in_kev else 'NO'}</td>
            <td><b>{entry.priority}</b></td>
            <td>{entry.deadline.strftime('%Y-%m-%d') if entry.deadline else 'N/A'}</td>
        </tr>"""
    
    with open(output_file, "w") as f:
        f.write(html_template.format(
            date=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
            rows=rows
        ))
    
    print(f"[+] Report saved to {output_file}")

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="CSV scan results")
    parser.add_argument("--output", default="vuln_report.html")
    args = parser.parse_args()
    
    print("[*] Loading scan results...")
    entries = load_scan_csv(args.input)
    print(f"[+] Loaded {len(entries)} vulnerabilities")
    
    print("[*] Enriching with EPSS...")
    enrich_with_epss(entries)
    
    print("[*] Checking CISA KEV...")
    check_kev(entries)
    
    print("[*] Assigning priorities...")
    for entry in entries:
        entry.priority = assign_priority(entry)
        entry.deadline = calculate_deadline(entry)
    
    print("[*] Generating report...")
    generate_html_report(entries, args.output)
    
    # Статистика
    from collections import Counter
    priority_counts = Counter(e.priority for e in entries)
    print("\n=== Summary ===")
    for priority, count in sorted(priority_counts.items()):
        print(f"  {priority}: {count} vulnerabilities")

if __name__ == "__main__":
    main()
```

---

## 📚 Ключевые ресурсы

| Ресурс | URL | Назначение |
|--------|-----|-----------|
| NVD | nvd.nist.gov | База CVE с CVSS |
| EPSS | first.org/epss | Exploit Prediction |
| CISA KEV | cisa.gov/kev | Known Exploited Vulns |
| CVE Details | cvedetails.com | Удобный поиск CVE |
| OpenVAS | openvas.org | Бесплатный сканер |
| Atomic Red Team | github.com/redcanaryco | Тесты для TTP |
| CVSS Calculator | nvd.nist.gov/vuln-metrics/cvss | CVSS онлайн |

## 🔑 Ключевые понятия

| Термин | Определение |
|--------|-------------|
| VM | Vulnerability Management — управление уязвимостями |
| CVSS | Common Vulnerability Scoring System |
| CVE | Common Vulnerabilities and Exposures — ID уязвимости |
| NVD | National Vulnerability Database |
| OVAL | Open Vulnerability Assessment Language |
| EPSS | Exploit Prediction Scoring System |
| KEV | Known Exploited Vulnerabilities (CISA) |
| Patch | Обновление, устраняющее уязвимость |
| SLA | Service Level Agreement — срок исправления |
| Risk Acceptance | Осознанное принятие риска без исправления |

---

## ✅ Итоги главы

После этой главы вы умеете:

- [x] Описать полный VM lifecycle от discovery до verification
- [x] Читать и интерпретировать CVSS v3.1 метрики
- [x] Приоритизировать уязвимости с использованием CVSS + EPSS + KEV
- [x] Работать с NVD API для получения данных CVE
- [x] Развернуть OpenVAS и провести первое сканирование
- [x] Построить SLA-политику по критичности
- [x] Документировать Risk Acceptance с компенсирующими контролями
- [x] Написать Python-скрипт для автоматизации VM отчётности

**Следующая часть:** Часть 7 — Digital Forensics and Incident Response (DFIR)

