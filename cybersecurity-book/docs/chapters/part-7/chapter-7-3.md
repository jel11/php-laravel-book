# Глава 7.3: Инструменты обогащения: VirusTotal, AbuseIPDB, Shodan

## 🎯 Цели главы

- Освоить работу с VirusTotal: проверка хэшей, URL, IP и доменов
- Научиться использовать AbuseIPDB для анализа репутации IP
- Изучить возможности Shodan для исследования инфраструктуры
- Понять принцип обогащения данных (Data Enrichment) в SOC
- Научиться автоматизировать обогащение через API
- Познакомиться с другими ключевыми инструментами Threat Intelligence

---

## 7.3.1 Концепция обогащения данных (Data Enrichment)

### Что такое обогащение данных

Когда SOC-аналитик получает алерт с IP-адресом или хэшем файла, это просто набор символов. **Обогащение данных** — процесс добавления контекста к "сырым" индикаторам компрометации (IOC).

```
БЕЗ ОБОГАЩЕНИЯ:                    ПОСЛЕ ОБОГАЩЕНИЯ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IP: 185.220.101.47                   IP: 185.220.101.47
                                     ├── Страна: Netherlands
                                     ├── AS: AS4242 (TOR Exit Node)
                                     ├── AbuseIPDB: 98% malicious
                                     ├── VT: 45/94 vendors flagged
                                     ├── Тип: Ransomware C2
                                     ├── Ассоциирован с: LockBit 3.0
                                     └── Первое появление: 2023-11-01

"Подозрительный IP"                  "Это Tor Exit Node, связанный с
                                      LockBit 3.0 ransomware. Немедленно
                                      блокировать и расследовать."
```

### Основные типы IOC и что проверяем

```
┌─────────────────────────────────────────────────────────────────┐
│                    ТИПЫ IOC И ИНСТРУМЕНТЫ                       │
├─────────────────┬───────────────────────────────────────────────┤
│ IP адрес        │ VirusTotal, AbuseIPDB, Shodan, IPInfo,        │
│                 │ GreyNoise, Censys                             │
├─────────────────┼───────────────────────────────────────────────┤
│ Домен / URL     │ VirusTotal, URLScan.io, URLVoid, CheckPhish,  │
│                 │ Whois, PassiveDNS                             │
├─────────────────┼───────────────────────────────────────────────┤
│ Хэш файла       │ VirusTotal, MalwareBazaar, Hybrid Analysis,   │
│ (MD5/SHA256)    │ Any.run, Joe Sandbox                          │
├─────────────────┼───────────────────────────────────────────────┤
│ Email адрес     │ HaveIBeenPwned, EmailRep, Hunter.io           │
├─────────────────┼───────────────────────────────────────────────┤
│ CVE / Exploit   │ NVD, ExploitDB, MITRE CVE, Nuclei templates   │
├─────────────────┼───────────────────────────────────────────────┤
│ Имя malware     │ MalwareBazaar, MITRE ATT&CK, Malpedia         │
└─────────────────┴───────────────────────────────────────────────┘
```

---

## 7.3.2 VirusTotal

### Обзор возможностей

VirusTotal — агрегатор антивирусных движков и сервис threat intelligence. Проверяет файлы, URL, IP и домены через 90+ антивирусных движков.

```
VirusTotal (https://www.virustotal.com):

БЕСПЛАТНО:
├── 4 запроса в минуту через API
├── Файлы до 650MB
├── Проверка IP, URL, домен, хэш
└── Базовый граф взаимосвязей

VT Enterprise (платно):
├── Без ограничений запросов
├── Ретроспективный поиск
├── VT Hunting (YARA + Sigma правила в реальном времени)
├── Детальные поведенческие отчёты sandbox
└── Intelligence feeds
```

### Работа с VirusTotal через API

```python
#!/usr/bin/env python3
"""
vt_enrichment.py — обогащение IOC через VirusTotal API v3
Документация: https://developers.virustotal.com/reference/overview
"""

import requests
import base64
import json
import time
from typing import Optional

VT_API_KEY = "YOUR_VT_API_KEY"  # Получить на virustotal.com
VT_BASE_URL = "https://www.virustotal.com/api/v3"

headers = {"x-apikey": VT_API_KEY}

def rate_limit():
    """Бесплатный API: 4 запроса в минуту"""
    time.sleep(15)

def check_file_hash(file_hash: str) -> Optional[dict]:
    """
    Проверка хэша файла (MD5/SHA1/SHA256)

    Пример: check_file_hash("44d88612fea8a8f36de82e1278abb02f")
    """
    url = f"{VT_BASE_URL}/files/{file_hash}"
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()["data"]["attributes"]
        stats = data.get("last_analysis_stats", {})

        result = {
            "found": True,
            "malicious": stats.get("malicious", 0),
            "suspicious": stats.get("suspicious", 0),
            "clean": stats.get("undetected", 0),
            "total": sum(stats.values()),
            "name": data.get("meaningful_name", "Unknown"),
            "type": data.get("type_description", "Unknown"),
            "size": data.get("size", 0),
            "first_seen": data.get("first_submission_date"),
            "last_seen": data.get("last_analysis_date"),
            "tags": data.get("tags", []),
            "threat_names": list(set([
                v.get("result") for v in data.get("last_analysis_results", {}).values()
                if v.get("result")
            ]))[:5]  # Топ-5 имён угроз
        }
        return result

    elif response.status_code == 404:
        return {"found": False, "message": "Hash not found in VT (new sample)"}

    return None

def check_url(url: str) -> Optional[dict]:
    """
    Проверка URL в VirusTotal

    Пример: check_url("http://malicious-site.com/payload.exe")
    """
    # URL нужно закодировать в base64 (urlsafe, без padding)
    url_id = base64.urlsafe_b64encode(url.encode()).rstrip(b'=').decode()

    response = requests.get(f"{VT_BASE_URL}/urls/{url_id}", headers=headers)

    if response.status_code == 200:
        data = response.json()["data"]["attributes"]
        stats = data.get("last_analysis_stats", {})

        return {
            "found": True,
            "malicious": stats.get("malicious", 0),
            "suspicious": stats.get("suspicious", 0),
            "total": sum(stats.values()),
            "final_url": data.get("url"),
            "title": data.get("title"),
            "categories": data.get("categories", {}),
            "last_analysis": data.get("last_analysis_date")
        }

    elif response.status_code == 404:
        # Сабмитим URL для анализа
        submit_response = requests.post(
            f"{VT_BASE_URL}/urls",
            headers=headers,
            data={"url": url}
        )
        if submit_response.status_code == 200:
            return {"found": False, "message": "URL submitted for analysis, retry in 30s"}

    return None

def check_ip(ip_address: str) -> Optional[dict]:
    """
    Проверка IP адреса

    Пример: check_ip("185.220.101.47")
    """
    response = requests.get(
        f"{VT_BASE_URL}/ip_addresses/{ip_address}",
        headers=headers
    )

    if response.status_code == 200:
        data = response.json()["data"]["attributes"]
        stats = data.get("last_analysis_stats", {})

        return {
            "found": True,
            "malicious": stats.get("malicious", 0),
            "suspicious": stats.get("suspicious", 0),
            "total": sum(stats.values()),
            "country": data.get("country"),
            "as_owner": data.get("as_owner"),
            "asn": data.get("asn"),
            "network": data.get("network"),
            "reputation": data.get("reputation", 0),  # отрицательный = плохой
            "tags": data.get("tags", []),
            "whois": data.get("whois", "")[:300]  # Первые 300 символов
        }

    return None

def check_domain(domain: str) -> Optional[dict]:
    """
    Проверка домена

    Пример: check_domain("malicious-c2.net")
    """
    response = requests.get(
        f"{VT_BASE_URL}/domains/{domain}",
        headers=headers
    )

    if response.status_code == 200:
        data = response.json()["data"]["attributes"]
        stats = data.get("last_analysis_stats", {})

        return {
            "found": True,
            "malicious": stats.get("malicious", 0),
            "suspicious": stats.get("suspicious", 0),
            "total": sum(stats.values()),
            "registrar": data.get("registrar"),
            "creation_date": data.get("creation_date"),
            "categories": data.get("categories", {}),
            "popularity_ranks": data.get("popularity_ranks", {}),
            "dns_records": data.get("last_dns_records", [])[:5],
            "reputation": data.get("reputation", 0)
        }

    return None

def enrich_ioc(ioc_type: str, ioc_value: str) -> str:
    """
    Главная функция обогащения IOC
    Возвращает читаемый отчёт
    """
    print(f"\n{'='*50}")
    print(f"Checking {ioc_type}: {ioc_value}")
    print(f"{'='*50}")

    if ioc_type == "hash":
        result = check_file_hash(ioc_value)
    elif ioc_type == "url":
        result = check_url(ioc_value)
    elif ioc_type == "ip":
        result = check_ip(ioc_value)
    elif ioc_type == "domain":
        result = check_domain(ioc_value)
    else:
        return "Unknown IOC type"

    if not result:
        return "Error querying VirusTotal"

    if not result.get("found"):
        return f"Not found: {result.get('message', '')}"

    malicious = result.get("malicious", 0)
    total = result.get("total", 0)

    # Вердикт
    if malicious == 0:
        verdict = "🟢 CLEAN"
    elif malicious <= 3:
        verdict = "🟡 SUSPICIOUS"
    elif malicious <= 15:
        verdict = "🟠 LIKELY MALICIOUS"
    else:
        verdict = "🔴 MALICIOUS"

    output = [
        f"Verdict: {verdict}",
        f"Detection: {malicious}/{total} vendors",
    ]

    # Добавляем специфичные поля
    for key in ["name", "type", "country", "as_owner", "registrar",
                "threat_names", "tags", "categories"]:
        if key in result and result[key]:
            output.append(f"{key.replace('_', ' ').title()}: {result[key]}")

    return "\n".join(output)


# Пример использования
if __name__ == "__main__":
    iocs_to_check = [
        ("hash", "44d88612fea8a8f36de82e1278abb02f"),   # MD5
        ("ip", "185.220.101.47"),
        ("domain", "example.com"),
        ("url", "http://phishing-site.example.com/login"),
    ]

    for ioc_type, ioc_value in iocs_to_check:
        print(enrich_ioc(ioc_type, ioc_value))
        rate_limit()  # Соблюдаем rate limit
```

### Интерпретация результатов VT

```
ИНТЕРПРЕТАЦИЯ ВЕРДИКТОВ VIRUSTOTAL:

0/94 детекций:
  → Clean или новый семпл. Проверить поведенчески (Any.run)

1-3/94 детекций:
  → Вероятно False Positive. Проверить, кто именно детектит.
  → Неизвестные AV с общими именами (Generic.Trojan) = часто FP

4-15/94 детекций:
  → Подозрительно. Требует дополнительного анализа.

15+/94 детекций:
  → Подтверждённый malware. Действовать по плейбуку.

ВАЖНО: VT показывает статику (файл), а не динамику (поведение).
Даже 0/94 может быть вредоносным (новый/обфусцированный malware).
```

---

## 7.3.3 AbuseIPDB

### Обзор

AbuseIPDB — база данных репутации IP-адресов, куда пользователи и организации сообщают о вредоносной активности.

```
https://www.abuseipdb.com/

КАТЕГОРИИ РЕПОРТОВ:
├── 1 - DNS Compromise
├── 3 - Fraud Orders
├── 4 - DDoS Attack
├── 10 - Open Proxy
├── 11 - Web Spam
├── 14 - Port Scan
├── 18 - Brute-Force
├── 19 - Bad Web Bot
├── 20 - Exploited Host
├── 21 - Web App Attack
├── 22 - SSH
└── 23 - IoT Targeted

API лимиты (бесплатный план):
├── 1000 запросов в день
├── 500 репортов в день
└── 30 дней истории
```

### Работа с AbuseIPDB API

```python
#!/usr/bin/env python3
"""
abuseipdb_check.py — проверка и репортинг через AbuseIPDB API
"""

import requests
from datetime import datetime

ABUSEIPDB_API_KEY = "YOUR_ABUSEIPDB_API_KEY"  # abuseipdb.com
ABUSEIPDB_BASE_URL = "https://api.abuseipdb.com/api/v2"

headers = {
    "Key": ABUSEIPDB_API_KEY,
    "Accept": "application/json"
}

def check_ip(ip_address: str, max_age_days: int = 90) -> dict:
    """
    Проверка репутации IP адреса

    Args:
        ip_address: IP для проверки
        max_age_days: Учитывать репорты за последние N дней (макс 365)
    """
    response = requests.get(
        f"{ABUSEIPDB_BASE_URL}/check",
        headers=headers,
        params={
            "ipAddress": ip_address,
            "maxAgeInDays": max_age_days,
            "verbose": True  # Включить последние репорты
        }
    )

    if response.status_code == 200:
        data = response.json()["data"]
        return {
            "ip": data["ipAddress"],
            "is_public": data["isPublic"],
            "version": data["ipVersion"],
            "is_whitelisted": data["isWhitelisted"],
            "abuse_score": data["abuseConfidenceScore"],  # 0-100
            "country": data["countryCode"],
            "usage_type": data["usageType"],  # ISP, Hosting, VPN, etc.
            "isp": data["isp"],
            "domain": data["domain"],
            "hostnames": data.get("hostnames", []),
            "is_tor": data.get("isTor", False),
            "total_reports": data["totalReports"],
            "num_distinct_users": data["numDistinctUsers"],
            "last_reported": data["lastReportedAt"],
            "reports": data.get("reports", [])[:5]  # Последние 5 репортов
        }

    return {"error": f"HTTP {response.status_code}"}

def report_ip(ip_address: str, categories: list, comment: str) -> dict:
    """
    Репорт о вредоносном IP (вносим вклад в сообщество)

    Args:
        ip_address: Вредоносный IP
        categories: Список категорий [18] = brute-force, [21] = web attack
        comment: Описание атаки (без персональных данных)

    Пример:
        report_ip("1.2.3.4", [18, 22],
                  "SSH brute force, 500 attempts in 5 minutes")
    """
    response = requests.post(
        f"{ABUSEIPDB_BASE_URL}/report",
        headers=headers,
        data={
            "ip": ip_address,
            "categories": ",".join(map(str, categories)),
            "comment": comment
        }
    )

    if response.status_code == 200:
        return response.json()["data"]

    return {"error": f"HTTP {response.status_code}: {response.text}"}

def bulk_check_ips(ip_list: list) -> list:
    """
    Массовая проверка IP (bulk check — только Enterprise API)
    Для бесплатного плана: проверяем по одному с паузой
    """
    results = []
    for ip in ip_list:
        result = check_ip(ip)
        result["ip"] = ip  # Добавляем IP в результат
        results.append(result)
        # Rate limit: бесплатный = 1000/день, ~1 запрос в 86 секунд безопасно
        # В реальности можно делать быстрее, но аккуратно

    # Сортируем по abuse score (самые опасные вверху)
    return sorted(results, key=lambda x: x.get("abuse_score", 0), reverse=True)

def interpret_abuse_score(score: int) -> str:
    """Интерпретация Abuse Confidence Score"""
    if score == 0:
        return "🟢 CLEAN — нет репортов"
    elif score < 25:
        return "🟡 LOW — редкие репорты, вероятно FP"
    elif score < 50:
        return "🟠 MEDIUM — есть репорты, требует проверки"
    elif score < 75:
        return "🔴 HIGH — многочисленные репорты о вредоносной активности"
    else:
        return "⛔ CRITICAL — известный источник атак"

# Пример использования в SOC
def soc_ip_triage(suspicious_ip: str):
    print(f"\n{'='*60}")
    print(f"SOC IP Analysis: {suspicious_ip}")
    print(f"{'='*60}")

    result = check_ip(suspicious_ip)

    if "error" in result:
        print(f"Error: {result['error']}")
        return

    print(f"Country:      {result['country']}")
    print(f"ISP:          {result['isp']}")
    print(f"Usage Type:   {result['usage_type']}")
    print(f"Is TOR Exit:  {'⚠️ YES' if result['is_tor'] else 'No'}")
    print(f"Abuse Score:  {result['abuse_score']}% — {interpret_abuse_score(result['abuse_score'])}")
    print(f"Total Reports:{result['total_reports']} from {result['num_distinct_users']} users")
    print(f"Last Report:  {result['last_reported']}")

    if result.get("reports"):
        print("\nRecent Reports:")
        for report in result["reports"]:
            print(f"  [{report.get('reportedAt', '?')[:10]}] "
                  f"Categories: {report.get('categories', [])} — "
                  f"{report.get('comment', '')[:80]}")

    # Вердикт для SOC
    score = result["abuse_score"]
    if score >= 75 or result["is_tor"]:
        print("\n→ РЕКОМЕНДАЦИЯ: Немедленно заблокировать. Высокая уверенность в вредоносности.")
    elif score >= 25:
        print("\n→ РЕКОМЕНДАЦИЯ: Требует расследования. Проверить в контексте алерта.")
    else:
        print("\n→ РЕКОМЕНДАЦИЯ: Низкий риск. Мониторинг контекста инцидента.")


if __name__ == "__main__":
    # Тестируем несколько IP
    test_ips = ["185.220.101.47", "8.8.8.8", "1.1.1.1"]
    for ip in test_ips:
        soc_ip_triage(ip)
```

---

## 7.3.4 Shodan

### Что такое Shodan

Shodan — поисковик интернет-подключённых устройств. Постоянно сканирует весь интернет и индексирует открытые порты, баннеры, SSL-сертификаты, уязвимости.

```
https://www.shodan.io/

ДЛЯ SOC-АНАЛИТИКА SHODAN ПОЛЕЗЕН:

1. Разведка о подозрительном IP:
   └── Что за сервисы открыты на атакующем IP?
   └── Это C2 сервер? Прокси? IoT устройство?

2. Анализ своей инфраструктуры (asset discovery):
   └── Что видят атакующие о нашей организации?
   └── Нет ли случайно открытых портов?

3. Поиск уязвимых систем:
   └── "vuln:CVE-2021-44228" — все Log4Shell уязвимые системы
   └── "product:Apache version:2.4.49" — уязвимые Apache

4. Threat Intelligence:
   └── Поиск C2 инфраструктуры по паттернам
   └── Отслеживание malware инфраструктуры
```

### Операторы поиска Shodan

```
ОСНОВНЫЕ ОПЕРАТОРЫ:

country:RU                    → системы в России
city:"Moscow"                 → системы в Москве
org:"Sberbank"                → системы организации
net:192.168.0.0/16            → поиск по подсети
hostname:*.example.com        → поиск по домену
port:3389                     → открытый RDP
port:22 product:OpenSSH       → SSH серверы
product:nginx version:1.14.0  → конкретная версия

SSL сертификаты:
ssl.cert.subject.cn:example.com          → сертификат для домена
ssl.cert.issuer.cn:"Let's Encrypt"       → LE сертификаты
ssl:"SHA256withRSA" port:443             → HTTPS

Уязвимости:
vuln:CVE-2021-44228             → Log4Shell
vuln:CVE-2019-0708              → BlueKeep (RDP)
vuln:CVE-2021-26084             → Confluence RCE

Технологии:
http.title:"phpMyAdmin"         → открытый phpMyAdmin
http.title:"Grafana"            → открытые дашборды
http.html:"wp-login.php"        → WordPress сайты
http.favicon.hash:HASH          → поиск по favicon (fingerprint)

Устройства:
product:Hikvision               → IP-камеры Hikvision
product:Fortinet                → Fortinet устройства
os:"Windows XP"                 → WindowsXP (устаревшие!)
```

### Работа с Shodan API

```python
#!/usr/bin/env python3
"""
shodan_enrichment.py — обогащение через Shodan API
pip install shodan
"""

import shodan
import json

SHODAN_API_KEY = "YOUR_SHODAN_API_KEY"  # shodan.io
api = shodan.Shodan(SHODAN_API_KEY)

def enrich_ip_shodan(ip_address: str) -> dict:
    """
    Детальная информация о хосте через Shodan

    Пример: enrich_ip_shodan("185.220.101.47")
    """
    try:
        host = api.host(ip_address)

        services = []
        for item in host.get("data", []):
            service_info = {
                "port": item.get("port"),
                "protocol": item.get("transport", "tcp"),
                "product": item.get("product"),
                "version": item.get("version"),
                "cpe": item.get("cpe", []),
                "vulns": list(item.get("vulns", {}).keys()),
                "timestamp": item.get("timestamp")
            }
            services.append(service_info)

        return {
            "ip": ip_address,
            "hostnames": host.get("hostnames", []),
            "country": host.get("country_name"),
            "city": host.get("city"),
            "org": host.get("org"),
            "isp": host.get("isp"),
            "asn": host.get("asn"),
            "os": host.get("os"),
            "last_update": host.get("last_update"),
            "ports": host.get("ports", []),
            "services": services,
            "vulns": host.get("vulns", {}),
            "tags": host.get("tags", [])
        }

    except shodan.APIError as e:
        if "No information available" in str(e):
            return {"ip": ip_address, "found": False, "message": "IP not in Shodan index"}
        return {"error": str(e)}

def search_infrastructure(query: str, limit: int = 10) -> list:
    """
    Поиск инфраструктуры по запросу

    Пример: search_infrastructure('ssl.cert.subject.cn:"malicious.com"')
    """
    try:
        results = api.search(query, page=1)
        print(f"Total results: {results['total']}")

        hosts = []
        for result in results["matches"][:limit]:
            hosts.append({
                "ip": result["ip_str"],
                "port": result["port"],
                "org": result.get("org"),
                "country": result.get("location", {}).get("country_name"),
                "timestamp": result.get("timestamp"),
                "product": result.get("product"),
                "version": result.get("version"),
                "hostname": result.get("hostnames", [])
            })

        return hosts

    except shodan.APIError as e:
        print(f"Shodan error: {e}")
        return []

def find_c2_infrastructure(domain: str) -> list:
    """
    Поиск C2 инфраструктуры, связанной с доменом

    Ищем серверы с SSL-сертификатами на этот домен
    Полезно для отслеживания APT/malware инфраструктуры
    """
    # Поиск по SSL сертификату
    query = f'ssl.cert.subject.cn:"{domain}" OR ssl.cert.subject.cn:"*.{domain}"'
    return search_infrastructure(query)

def scan_own_org(org_name: str) -> dict:
    """
    Аудит внешней поверхности атаки своей организации

    Что видят атакующие о нашей компании?
    """
    results = {
        "org": org_name,
        "exposed_services": [],
        "risky_ports": [],
        "vulnerabilities": []
    }

    risky_ports = {
        21: "FTP",
        23: "Telnet",
        3389: "RDP",
        5900: "VNC",
        1433: "MSSQL",
        3306: "MySQL",
        27017: "MongoDB",
        6379: "Redis",
        5432: "PostgreSQL",
        9200: "Elasticsearch",
        11211: "Memcached"
    }

    try:
        # Поиск по имени организации
        query = f'org:"{org_name}"'
        search_results = api.search(query)

        for host in search_results["matches"][:50]:
            port = host.get("port")
            service = {
                "ip": host["ip_str"],
                "port": port,
                "product": host.get("product", "Unknown"),
                "version": host.get("version"),
                "vulns": list(host.get("vulns", {}).keys())
            }
            results["exposed_services"].append(service)

            # Помечаем рискованные порты
            if port in risky_ports:
                results["risky_ports"].append({
                    "ip": host["ip_str"],
                    "port": port,
                    "service": risky_ports[port],
                    "risk": "HIGH — sensitive service exposed to internet"
                })

            # Собираем уязвимости
            for vuln_id in host.get("vulns", {}):
                results["vulnerabilities"].append({
                    "ip": host["ip_str"],
                    "cve": vuln_id,
                    "cvss": host["vulns"][vuln_id].get("cvss")
                })

    except shodan.APIError as e:
        results["error"] = str(e)

    return results

def print_host_report(ip_result: dict):
    """Красивый вывод результата Shodan"""
    if "error" in ip_result:
        print(f"Error: {ip_result['error']}")
        return

    if not ip_result.get("found", True):
        print(f"Not found in Shodan: {ip_result.get('message')}")
        return

    print(f"\n{'─'*60}")
    print(f"SHODAN REPORT: {ip_result['ip']}")
    print(f"{'─'*60}")
    print(f"Organization: {ip_result.get('org', 'Unknown')}")
    print(f"ISP:          {ip_result.get('isp', 'Unknown')}")
    print(f"Country:      {ip_result.get('country', 'Unknown')}, {ip_result.get('city', '')}")
    print(f"ASN:          {ip_result.get('asn', 'Unknown')}")
    print(f"OS:           {ip_result.get('os', 'Unknown')}")
    print(f"Hostnames:    {', '.join(ip_result.get('hostnames', ['None']))}")
    print(f"Tags:         {', '.join(ip_result.get('tags', ['None']))}")
    print(f"Open Ports:   {ip_result.get('ports', [])}")

    if ip_result.get("vulns"):
        print(f"\n⚠️  VULNERABILITIES ({len(ip_result['vulns'])}):")
        for vuln_id, details in list(ip_result["vulns"].items())[:5]:
            cvss = details.get("cvss", "?")
            print(f"   {vuln_id} (CVSS: {cvss})")

    print()

# Пример использования
if __name__ == "__main__":
    # 1. Обогащение подозрительного IP
    result = enrich_ip_shodan("185.220.101.47")
    print_host_report(result)

    # 2. Аудит своей организации
    # org_report = scan_own_org("Example Corp Ltd")
    # for risky in org_report["risky_ports"]:
    #     print(f"⚠️ {risky['service']} exposed: {risky['ip']}:{risky['port']}")
```

---

## 7.3.5 Другие ключевые инструменты обогащения

### URLScan.io

```python
#!/usr/bin/env python3
# urlscan_check.py — анализ URL через URLScan.io

import requests
import time
import json

URLSCAN_API_KEY = "YOUR_URLSCAN_KEY"  # urlscan.io (бесплатно!)

def scan_url(url: str, wait: int = 30) -> dict:
    """
    Отправляет URL на сканирование и возвращает результаты

    urlscan.io сканирует URL в браузере и:
    - Делает скриншот страницы
    - Захватывает все HTTP запросы
    - Анализирует JS
    - Проверяет в базах репутации
    """
    # Шаг 1: Отправить URL на сканирование
    submit_response = requests.post(
        "https://urlscan.io/api/v1/scan/",
        headers={
            "API-Key": URLSCAN_API_KEY,
            "Content-Type": "application/json"
        },
        json={
            "url": url,
            "visibility": "private",   # private/public/unlisted
            "tags": ["soc-analysis"]
        }
    )

    if submit_response.status_code != 200:
        return {"error": f"Submit failed: {submit_response.status_code}"}

    scan_data = submit_response.json()
    scan_uuid = scan_data["uuid"]
    print(f"[*] Scan submitted. UUID: {scan_uuid}")
    print(f"[*] View at: {scan_data['result']}")

    # Шаг 2: Ждём результатов
    print(f"[*] Waiting {wait} seconds for scan to complete...")
    time.sleep(wait)

    # Шаг 3: Получаем результаты
    result_response = requests.get(
        f"https://urlscan.io/api/v1/result/{scan_uuid}/",
        headers={"API-Key": URLSCAN_API_KEY}
    )

    if result_response.status_code == 200:
        result = result_response.json()

        return {
            "url": url,
            "screenshot": f"https://urlscan.io/screenshots/{scan_uuid}.png",
            "report": f"https://urlscan.io/result/{scan_uuid}/",
            "final_url": result.get("page", {}).get("url"),
            "server": result.get("page", {}).get("server"),
            "title": result.get("page", {}).get("title"),
            "ip": result.get("page", {}).get("ip"),
            "country": result.get("page", {}).get("country"),
            "verdicts": result.get("verdicts", {}),
            "malicious": result.get("verdicts", {}).get("overall", {}).get("malicious", False),
            "score": result.get("verdicts", {}).get("overall", {}).get("score", 0),
            "categories": result.get("verdicts", {}).get("overall", {}).get("categories", []),
        }

    return {"error": "Scan not ready yet, retry later"}
```

### MalwareBazaar

```bash
# MalwareBazaar — база хэшей malware (abuse.ch)
# https://bazaar.abuse.ch/

# Проверка хэша через API (бесплатно)
curl -X POST https://mb-api.abuse.ch/api/v1/ \
     -d query=get_info \
     -d hash=44d88612fea8a8f36de82e1278abb02f

# Скачать семпл для анализа (если есть API ключ)
curl -X POST https://mb-api.abuse.ch/api/v1/ \
     -d query=get_file \
     -d sha256_hash=YOUR_SHA256 \
     -o malware_sample.zip

# Поиск по тегу (ransomware, trojan и т.д.)
curl -X POST https://mb-api.abuse.ch/api/v1/ \
     -d query=get_taginfo \
     -d tag=ransomware \
     -d limit=10
```

### MISP (Malware Information Sharing Platform)

```python
#!/usr/bin/env python3
# misp_search.py — поиск IOC в MISP

from pymisp import PyMISP

MISP_URL = "https://misp.your-org.local"
MISP_KEY = "YOUR_MISP_API_KEY"
MISP_VERIFYCERT = False  # True в продакшене

misp = PyMISP(MISP_URL, MISP_KEY, MISP_VERIFYCERT)

def search_ioc_in_misp(ioc_value: str, ioc_type: str = None):
    """
    Поиск IOC в локальном MISP
    Типы: ip-src, ip-dst, domain, url, md5, sha256, email-src
    """
    results = misp.search(
        controller="attributes",
        value=ioc_value,
        type_attribute=ioc_type,
        to_ids=True  # Только атрибуты, помеченные как IOC
    )

    if results and "Attribute" in results:
        attrs = results["Attribute"]
        print(f"[!] Found {len(attrs)} matches for {ioc_value} in MISP:")
        for attr in attrs:
            event = attr.get("Event", {})
            print(f"  Event: {event.get('info', 'Unknown')}")
            print(f"  Date: {event.get('date', 'Unknown')}")
            print(f"  Tags: {[t['name'] for t in attr.get('Tag', [])]}")
            print()
    else:
        print(f"[*] No matches for {ioc_value} in MISP")

def add_ioc_to_misp(event_id: str, ioc_type: str, ioc_value: str, comment: str):
    """
    Добавление IOC в MISP событие (вносим вклад в TI)
    """
    from pymisp import MISPAttribute

    attribute = MISPAttribute()
    attribute.type = ioc_type
    attribute.value = ioc_value
    attribute.comment = comment
    attribute.to_ids = True
    attribute.distribution = 1  # Эта организация

    result = misp.add_attribute(event_id, attribute)
    print(f"[+] Added {ioc_type}: {ioc_value} to event {event_id}")
    return result
```

---

## 7.3.6 Комплексный скрипт обогащения IOC

```python
#!/usr/bin/env python3
"""
ioc_enricher.py — комплексное обогащение IOC из нескольких источников
Используется SOC-аналитиком при расследовании инцидентов
"""

import requests
import json
import time
import re
import sys

# Конфигурация API ключей
API_KEYS = {
    "virustotal": "YOUR_VT_KEY",
    "abuseipdb": "YOUR_ABUSEIPDB_KEY",
    "shodan": "YOUR_SHODAN_KEY",
    "urlscan": "YOUR_URLSCAN_KEY"
}

def detect_ioc_type(ioc: str) -> str:
    """Автоопределение типа IOC"""
    # IPv4
    if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', ioc):
        return "ip"
    # URL
    if ioc.startswith(("http://", "https://", "ftp://")):
        return "url"
    # Hash (MD5, SHA1, SHA256)
    if re.match(r'^[a-fA-F0-9]{32}$', ioc):
        return "md5"
    if re.match(r'^[a-fA-F0-9]{40}$', ioc):
        return "sha1"
    if re.match(r'^[a-fA-F0-9]{64}$', ioc):
        return "sha256"
    # Domain
    if re.match(r'^[a-zA-Z0-9][a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}$', ioc):
        return "domain"
    return "unknown"

def enrich_ip(ip: str) -> dict:
    """Обогащение IP из нескольких источников"""
    result = {"ioc": ip, "type": "ip", "sources": {}}

    # VirusTotal
    try:
        vt_resp = requests.get(
            f"https://www.virustotal.com/api/v3/ip_addresses/{ip}",
            headers={"x-apikey": API_KEYS["virustotal"]},
            timeout=10
        )
        if vt_resp.status_code == 200:
            vt_data = vt_resp.json()["data"]["attributes"]
            stats = vt_data.get("last_analysis_stats", {})
            result["sources"]["virustotal"] = {
                "malicious": stats.get("malicious", 0),
                "total": sum(stats.values()),
                "country": vt_data.get("country"),
                "as_owner": vt_data.get("as_owner")
            }
    except Exception as e:
        result["sources"]["virustotal"] = {"error": str(e)}

    time.sleep(2)  # Rate limit

    # AbuseIPDB
    try:
        abuse_resp = requests.get(
            "https://api.abuseipdb.com/api/v2/check",
            headers={"Key": API_KEYS["abuseipdb"], "Accept": "application/json"},
            params={"ipAddress": ip, "maxAgeInDays": 90},
            timeout=10
        )
        if abuse_resp.status_code == 200:
            abuse_data = abuse_resp.json()["data"]
            result["sources"]["abuseipdb"] = {
                "score": abuse_data["abuseConfidenceScore"],
                "country": abuse_data["countryCode"],
                "isp": abuse_data["isp"],
                "is_tor": abuse_data.get("isTor", False),
                "total_reports": abuse_data["totalReports"]
            }
    except Exception as e:
        result["sources"]["abuseipdb"] = {"error": str(e)}

    # Суммарный вердикт
    vt_malicious = result["sources"].get("virustotal", {}).get("malicious", 0)
    abuse_score = result["sources"].get("abuseipdb", {}).get("score", 0)
    is_tor = result["sources"].get("abuseipdb", {}).get("is_tor", False)

    if vt_malicious > 10 or abuse_score > 75 or is_tor:
        verdict = "HIGH RISK"
    elif vt_malicious > 3 or abuse_score > 25:
        verdict = "SUSPICIOUS"
    else:
        verdict = "LOW RISK"

    result["verdict"] = verdict
    result["summary"] = (
        f"VT: {vt_malicious} detections | "
        f"AbuseIPDB: {abuse_score}% | "
        f"TOR: {'YES ⚠️' if is_tor else 'No'}"
    )

    return result

def print_enrichment_report(enriched: dict):
    """Печать отчёта об обогащении"""
    print(f"\n{'█'*60}")
    print(f"IOC: {enriched['ioc']} (Type: {enriched['type']})")
    print(f"VERDICT: {enriched.get('verdict', 'Unknown')}")
    print(f"Summary: {enriched.get('summary', '')}")
    print(f"{'─'*60}")

    for source, data in enriched.get("sources", {}).items():
        print(f"\n[{source.upper()}]")
        if "error" in data:
            print(f"  Error: {data['error']}")
        else:
            for key, value in data.items():
                print(f"  {key}: {value}")

    print(f"{'█'*60}\n")

# Основная логика
if __name__ == "__main__":
    # Список IOC для проверки (из алерта)
    iocs_from_alert = [
        "185.220.101.47",
        "91.108.56.23",
        "malware-delivery.net",
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    ]

    print(f"Processing {len(iocs_from_alert)} IOCs...")

    for ioc in iocs_from_alert:
        ioc_type = detect_ioc_type(ioc)
        print(f"\n[*] Analyzing {ioc_type}: {ioc}")

        if ioc_type == "ip":
            enriched = enrich_ip(ioc)
            print_enrichment_report(enriched)
        elif ioc_type in ("md5", "sha256"):
            # Аналогично для хэшей...
            pass
        elif ioc_type == "domain":
            # Аналогично для доменов...
            pass
```

---

## 7.3.7 Интеграция в SOC-процессы

### Cheat Sheet: какой инструмент когда

```
БЫСТРАЯ ШПАРГАЛКА ДЛЯ SOC-АНАЛИТИКА:

ПОДОЗРИТЕЛЬНЫЙ IP в алерте:
  1. AbuseIPDB → репутация, количество жалоб
  2. VirusTotal → детекции антивирусами
  3. Shodan → что это за хост, открытые порты
  4. ipinfo.io → геолокация, ASN быстро

ПОДОЗРИТЕЛЬНЫЙ ДОМЕН:
  1. VirusTotal → детекции, PassiveDNS
  2. URLScan.io → скриншот, финальный URL
  3. Whois → кто зарегал, когда (свежий домен = подозрение)
  4. VirusTotal Graph → связанная инфраструктура

ПОДОЗРИТЕЛЬНЫЙ ФАЙЛ (хэш):
  1. VirusTotal → детекции, имя malware
  2. MalwareBazaar → дополнительная информация
  3. Any.run → динамический анализ (поведение)
  4. Hybrid Analysis → sandbox от CrowdStrike

ПОДОЗРИТЕЛЬНЫЙ URL:
  1. URLScan.io → скриншот, финальный URL, JS анализ
  2. VirusTotal → детекции фишинга
  3. CheckPhish.ai → AI анализ фишинга
  4. UrlVoid → множество баз сразу
```

---

## 📌 Итоги главы

- Обогащение данных (Data Enrichment) — критически важный процесс добавления контекста к "сырым" IOC
- **VirusTotal** — главный инструмент для проверки хэшей, URL, IP, доменов через 90+ AV движков
- **AbuseIPDB** — репутация IP на основе краудсорсинговых репортов; Abuse Score > 75% = опасно
- **Shodan** — разведка об интернет-инфраструктуре; полезен для анализа атакующих и аудита своей инфраструктуры
- **URLScan.io** — безопасный анализ URL в браузере со скриншотами
- **MISP** — корпоративная платформа обмена threat intelligence
- Автоматизация через API = быстрее, масштабируемо, без рутины для аналитика

---

## 🏠 Домашнее задание

1. **Базовый уровень:** Зарегистрируйтесь на VirusTotal, AbuseIPDB и URLScan.io. Получите бесплатные API ключи. Проверьте 5 любых IP из SANS Internet Storm Center (isc.sans.edu) через AbuseIPDB.

2. **Средний уровень:** Напишите скрипт-обогатитель, который принимает CSV файл с IOC (один столбец) и выводит таблицу с результатами проверки через VirusTotal + AbuseIPDB.

3. **Продвинутый уровень:** Подключите Shodan к вашей домашней лабораторной сети (или VPS). Запустите `scan_own_org()` и найдите любые "рискованные" открытые порты. Задокументируйте результаты.

4. **Практика:** Возьмите любой публичный CTF write-up с IOC (например, с CTFtime.org или DFIR.training) и проверьте указанные IOC через описанные инструменты. Актуальны ли IOC до сих пор?

---

## 🔗 Полезные ресурсы

| Ресурс | URL | Описание |
|--------|-----|----------|
| VirusTotal | virustotal.com | Агрегатор AV движков |
| AbuseIPDB | abuseipdb.com | Репутация IP |
| Shodan | shodan.io | Поиск IoT/сервисов |
| URLScan.io | urlscan.io | Анализ URL |
| MalwareBazaar | bazaar.abuse.ch | База хэшей malware |
| MISP | misp-project.org | TI платформа |
| GreyNoise | greynoise.io | Интернет-шум vs целевые атаки |
| Censys | censys.io | Альтернатива Shodan |
| ThreatFox | threatfox.abuse.ch | IOC база abuse.ch |
| MITRE ATT&CK | attack.mitre.org | Матрица техник |
