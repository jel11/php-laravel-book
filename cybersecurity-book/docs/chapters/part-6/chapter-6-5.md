# Глава 6.5: Триаж алертов и обогащение данных

## 🎯 Цели главы

- Понять концепцию триажа алертов в SOC и зачем он нужен
- Научиться бороться с alert fatigue (усталостью от алертов)
- Освоить матрицу приоритизации Impact × Likelihood
- Пройти процесс триажа шаг за шагом от алерта до решения
- Научиться обогащать IoC: IP, хэши, домены, URL
- Использовать AbuseIPDB, VirusTotal, Shodan, MISP в работе SOC-аналитика
- Понять, как автоматизировать обогащение в SOAR-платформах
- Принимать обоснованное решение: True Positive vs False Positive

---

## 1. 🚨 Что Такое Триаж Алертов

### 1.1 Определение

**Триаж** (от фр. *triage* — сортировка) — процесс быстрой оценки и приоритизации входящих алертов безопасности для того, чтобы SOC-аналитик мог сосредоточить усилия на наиболее критичных угрозах.

```
                    ┌─────────────────────────────────┐
                    │   ИСТОЧНИКИ АЛЕРТОВ              │
                    │  SIEM / EDR / IDS / WAF / AV    │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │         ОЧЕРЕДЬ АЛЕРТОВ          │
                    │  [CRIT] [HIGH] [MED] [LOW]      │
                    └────────────────┬────────────────┘
                                     │
                    ┌────────────────▼────────────────┐
                    │        ТРИАЖ (Tier 1 SOC)        │
                    │  • Первичная оценка              │
                    │  • Обогащение данных             │
                    │  • TP / FP решение               │
                    └────────┬───────────────┬─────────┘
                             │               │
                   ┌─────────▼──┐      ┌─────▼──────────┐
                   │ FALSE      │      │  TRUE POSITIVE  │
                   │ POSITIVE   │      │  → Эскалация    │
                   │ → Закрыть  │      │  → Инцидент     │
                   └────────────┘      └────────────────┘
```

### 1.2 Почему триаж критически важен

Среднестатистический SOC получает от **200 до 10 000 алертов в день**. Без правильного триажа:

- Аналитики тонут в потоке уведомлений
- Критические инциденты теряются среди ложных срабатываний
- Среднее время обнаружения (MTTD) растёт
- Команда выгорает (alert fatigue)

---

## 2. 😴 Alert Fatigue — Усталость от Алертов

### 2.1 Что такое alert fatigue

**Alert fatigue** — состояние, при котором аналитики перестают воспринимать алерты всерьёз из-за их огромного количества и высокого процента ложных срабатываний.

**Последствия:**
- Критические алерты закрываются без расследования
- Время реакции на реальные инциденты увеличивается
- Аналитики Tier 1 увольняются (высокий turnover)
- Реальные атаки остаются незамеченными

### 2.2 Статистика проблемы

| Метрика | Типичное значение |
|---------|------------------|
| Алертов в день (крупный SOC) | 5 000 — 10 000 |
| False Positive Rate | 45 — 85% |
| Алертов, расследованных детально | 10 — 25% |
| Время на один алерт (Tier 1) | 5 — 10 минут |

### 2.3 Как бороться с alert fatigue

```
Технические меры:
├── Тюнинг SIEM-правил (поднять пороги, добавить whitelist)
├── Консолидация связанных алертов в инциденты
├── Контекстное обогащение (автоматическое)
├── Risk-based alerting (алерты только при высоком риске)
└── ML-scoring (машинное обучение для приоритизации)

Процессные меры:
├── Регулярный review правил (раз в квартал)
├── Метрика FP Rate per rule (закрыть правило при FP > 90%)
├── Playbooks для типичных алертов (снижают время триажа)
└── Rotation аналитиков (не более 4 часов на алерт-очереди)

Организационные меры:
├── Чёткие SLA по severity
├── Feedback loop: Tier 1 → Tier 3 (обучение на ошибках)
└── Gamification метрик (без токсичной конкуренции)
```

---

## 3. 📊 Матрица Приоритизации: Impact × Likelihood

### 3.1 Определение Severity и Priority

**Severity** — техническая тяжесть угрозы (какой ущерб может нанести).
**Priority** — бизнес-приоритет реагирования (как быстро нужно ответить).

```
Severity = Impact × Likelihood

Impact:    Какой ущерб нанесёт инцидент?
           LOW (1) — минимальный ущерб, нет влияния на бизнес
           MEDIUM (2) — частичный сбой, ограниченная утечка
           HIGH (3) — серьёзный сбой, значительная утечка
           CRITICAL (4) — полная компрометация, утечка PCI/PII

Likelihood: Насколько вероятно это реальная атака?
           LOW (1) — FP > 80%, признаков реальной угрозы нет
           MEDIUM (2) — FP ~50%, частичные признаки
           HIGH (3) — FP < 20%, явные признаки атаки
           CRITICAL (4) — подтверждённая атака, IOC совпадают
```

### 3.2 Матрица Risk = Impact × Likelihood

```
          │  LOW (1) │ MEDIUM (2) │  HIGH (3)  │ CRITICAL (4)
──────────┼──────────┼────────────┼────────────┼─────────────
LOW   (1) │    1     │     2      │     3      │      4
MEDIUM(2) │    2     │     4      │     6      │      8
HIGH  (3) │    3     │     6      │     9      │     12
CRIT  (4) │    4     │     8      │    12      │     16
```

**Интерпретация:**

| Risk Score | Уровень | SLA ответа | Действие |
|------------|---------|------------|----------|
| 1 — 3 | LOW | 72 часа | Логировать, закрыть |
| 4 — 6 | MEDIUM | 24 часа | Расследовать, Tier 1 |
| 7 — 9 | HIGH | 4 часа | Эскалировать, Tier 2 |
| 10 — 16 | CRITICAL | 30 минут | Немедленно, Tier 3 + CISO |

### 3.3 Примеры оценки

| Алерт | Impact | Likelihood | Score | Уровень |
|-------|--------|-----------|-------|---------|
| Brute force на тестовый стенд | 1 | 3 | 3 | LOW |
| SQLi попытка на prod | 3 | 2 | 6 | MEDIUM |
| Ransomware на рабочей станции | 4 | 4 | 16 | CRITICAL |
| Admin login из другой страны | 3 | 3 | 9 | HIGH |
| Стандартный AV-алерт (Adware) | 1 | 4 | 4 | MEDIUM |
| Data exfiltration 1GB+ | 4 | 3 | 12 | CRITICAL |

---

## 4. 🔄 Процесс Триажа Шаг за Шагом

### 4.1 Этапы триажа

```
┌────────────────────────────────────────────────────────────────┐
│                   ПРОЦЕСС ТРИАЖА                               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ① ПОЛУЧЕНИЕ АЛЕРТА                                           │
│    • Из SIEM / EDR / почты / телефона                         │
│    • Фиксация времени получения (для SLA)                     │
│                                                                │
│  ② ПЕРВИЧНАЯ ОЦЕНКА (< 2 мин)                                │
│    • Прочитать описание алерта                                │
│    • Определить тип: Web / Endpoint / Network / Identity      │
│    • Предварительный severity: CRIT / HIGH / MED / LOW        │
│                                                                │
│  ③ СБОР КОНТЕКСТА (5-15 мин)                                 │
│    • Какой актив затронут? Production? Dev?                   │
│    • Кто владелец актива? (CMDB)                              │
│    • История инцидентов для этого IP/хоста                    │
│    • Смотрим на связанные события в SIEM                      │
│                                                                │
│  ④ ОБОГАЩЕНИЕ IoC (5-20 мин)                                 │
│    • IP → AbuseIPDB, Shodan, геолокация                       │
│    • Хэш → VirusTotal, Malware Bazaar                         │
│    • Домен → WHOIS, PassiveDNS, VirusTotal                    │
│    • URL → URLscan.io, VirusTotal                             │
│                                                                │
│  ⑤ РЕШЕНИЕ TP / FP (< 1 мин)                                │
│    • Достаточно признаков реальной угрозы?                    │
│    • Если TP → создать инцидент, эскалировать                │
│    • Если FP → закрыть с обоснованием, предложить тюнинг     │
│                                                                │
│  ⑥ ДОКУМЕНТИРОВАНИЕ                                           │
│    • Заполнить тикет (время, действия, решение)               │
│    • Добавить IOC в платформу обогащения                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 Чеклист быстрого триажа

```markdown
## Чеклист триажа алерта #[ID]

### Базовая информация
- [ ] Тип алерта: _______________
- [ ] Время получения: _______________
- [ ] Источник: SIEM / EDR / Email / Phone
- [ ] Затронутый актив: _______________
- [ ] Критичность актива: CRIT / HIGH / MED / LOW

### Контекст
- [ ] История алертов для этого IP/хоста за 30 дней: ___
- [ ] Актив в production? Да / Нет
- [ ] Есть ли открытый Change Request / плановые работы?

### Обогащение IoC
- [ ] IP: AbuseIPDB confidence: ___% | Shodan: ___ports open
- [ ] Хэш: VT ratio: ___/__ | Malware family: ___
- [ ] Домен: Возраст: ___ | WHOIS: ___ | Passive DNS: ___

### Решение
- [ ] TRUE POSITIVE → Создать инцидент #INC-___
- [ ] FALSE POSITIVE → Закрыть. Причина: _______________
- [ ] НЕОПРЕДЕЛЕНО → Эскалировать Tier 2

### SLA
- Получено: ___ | Решение принято: ___
- Время триажа: ___ минут (SLA: ___ минут)
```

---

## 5. 🌐 Обогащение IP-адресов

### 5.1 AbuseIPDB

AbuseIPDB — база данных IP-адресов, замеченных в вредоносной активности.

```bash
# Проверка IP через API
ABUSEIPDB_KEY="ваш_api_ключ"
IP="203.0.113.45"

curl -G https://api.abuseipdb.com/api/v2/check \
  --data-urlencode "ipAddress=$IP" \
  -d maxAgeInDays=90 \
  -d verbose \
  -H "Key: $ABUSEIPDB_KEY" \
  -H "Accept: application/json" | python3 -m json.tool
```

Пример ответа:

```json
{
  "data": {
    "ipAddress": "203.0.113.45",
    "isPublic": true,
    "ipVersion": 4,
    "isWhitelisted": false,
    "abuseConfidenceScore": 87,
    "countryCode": "CN",
    "usageType": "Data Center/Web Hosting/Transit",
    "isp": "Shenzhen Tencent Computer Systems",
    "domain": "tencent.com",
    "totalReports": 143,
    "numDistinctUsers": 34,
    "lastReportedAt": "2026-02-24T18:23:41+00:00",
    "reports": [
      {
        "reportedAt": "2026-02-24T18:23:41+00:00",
        "comment": "SSH brute force",
        "categories": [18, 22]
      }
    ]
  }
}
```

**Интерпретация `abuseConfidenceScore`:**

| Score | Интерпретация | Действие |
|-------|---------------|----------|
| 0 — 20 | Вероятно чистый | Не блокировать |
| 21 — 50 | Подозрительный | Усиленный мониторинг |
| 51 — 80 | Вероятно вредоносный | Рассмотреть блокировку |
| 81 — 100 | Высокая угроза | Заблокировать немедленно |

### 5.2 Shodan

```python
import shodan

SHODAN_KEY = "ваш_api_ключ"
api = shodan.Shodan(SHODAN_KEY)

def enrich_ip_shodan(ip: str) -> dict:
    try:
        host = api.host(ip)
        return {
            'ip': ip,
            'organization': host.get('org', 'N/A'),
            'isp': host.get('isp', 'N/A'),
            'country': host.get('country_name', 'N/A'),
            'city': host.get('city', 'N/A'),
            'open_ports': host.get('ports', []),
            'hostnames': host.get('hostnames', []),
            'vulns': list(host.get('vulns', {}).keys()),
            'tags': host.get('tags', []),
            'last_update': host.get('last_update', 'N/A'),
            'banners': [
                {
                    'port': s.get('port'),
                    'product': s.get('product', ''),
                    'version': s.get('version', ''),
                    'banner': s.get('data', '')[:200]
                }
                for s in host.get('data', [])[:5]
            ]
        }
    except shodan.APIError as e:
        return {'ip': ip, 'error': str(e)}

result = enrich_ip_shodan("203.0.113.45")
print(f"IP: {result['ip']}")
print(f"Org: {result['organization']}")
print(f"Country: {result['country']} / {result['city']}")
print(f"Open ports: {result['open_ports']}")
print(f"Vulns: {result['vulns']}")
```

### 5.3 Геолокация и WHOIS

```python
import ipaddress
import socket
import json
import urllib.request

def geolocate_ip(ip: str) -> dict:
    """Геолокация через ip-api.com (бесплатно, 45 req/min)"""
    url = f"http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,query"
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {'status': 'fail', 'message': str(e)}

def whois_ip(ip: str) -> str:
    """Простой WHOIS через socket (требует whois-сервер)"""
    import subprocess
    result = subprocess.run(
        ['whois', ip],
        capture_output=True, text=True, timeout=10
    )
    return result.stdout[:2000]  # Первые 2000 символов

geo = geolocate_ip("203.0.113.45")
print(f"Страна: {geo.get('country')} ({geo.get('countryCode')})")
print(f"Город: {geo.get('city')}, {geo.get('regionName')}")
print(f"ISP: {geo.get('isp')}")
print(f"ASN: {geo.get('as')}")
print(f"Координаты: {geo.get('lat')}, {geo.get('lon')}")
```

---

## 6. 🔬 Обогащение Хэшей

### 6.1 VirusTotal API v3

```python
import requests
import base64
import time

VT_KEY = "ваш_vt_api_ключ"
VT_BASE = "https://www.virustotal.com/api/v3"
HEADERS = {"x-apikey": VT_KEY}

def vt_check_hash(file_hash: str) -> dict:
    """
    Проверка хэша (MD5/SHA1/SHA256) через VirusTotal API v3
    """
    url = f"{VT_BASE}/files/{file_hash}"
    resp = requests.get(url, headers=HEADERS, timeout=30)
    
    if resp.status_code == 404:
        return {'found': False, 'hash': file_hash}
    
    resp.raise_for_status()
    data = resp.json()['data']['attributes']
    
    stats = data.get('last_analysis_stats', {})
    total = sum(stats.values())
    malicious = stats.get('malicious', 0)
    suspicious = stats.get('suspicious', 0)
    
    # Топ детектирований
    results = data.get('last_analysis_results', {})
    detections = [
        {'engine': engine, 'result': r.get('result', ''), 'category': r.get('category')}
        for engine, r in results.items()
        if r.get('category') in ('malicious', 'suspicious')
    ]
    
    return {
        'found': True,
        'hash': file_hash,
        'name': data.get('meaningful_name', 'unknown'),
        'size': data.get('size', 0),
        'type': data.get('type_description', ''),
        'detection_ratio': f"{malicious + suspicious}/{total}",
        'malicious': malicious,
        'suspicious': suspicious,
        'undetected': stats.get('undetected', 0),
        'first_seen': data.get('first_submission_date', 0),
        'last_seen': data.get('last_analysis_date', 0),
        'tags': data.get('tags', []),
        'popular_threat_name': data.get('popular_threat_classification', {}).get('suggested_threat_label', ''),
        'detections': detections[:10],  # Первые 10
        'vt_link': f"https://www.virustotal.com/gui/file/{file_hash}"
    }

def interpret_vt_result(result: dict) -> str:
    if not result['found']:
        return "UNKNOWN — хэш не найден в VT"
    
    malicious = result['malicious']
    if malicious == 0:
        return "CLEAN — ни один антивирус не детектирует"
    elif malicious <= 3:
        return f"SUSPICIOUS — {malicious} детектирований, возможен FP"
    elif malicious <= 10:
        return f"LIKELY MALICIOUS — {malicious} детектирований"
    else:
        return f"MALICIOUS — {malicious} детектирований ({result['popular_threat_name']})"

# Использование
hash_to_check = "d41d8cd98f00b204e9800998ecf8427e"  # MD5
result = vt_check_hash(hash_to_check)
verdict = interpret_vt_result(result)
print(f"Хэш: {result['hash']}")
print(f"Вердикт: {verdict}")
print(f"Ratio: {result.get('detection_ratio', 'N/A')}")
print(f"Семейство: {result.get('popular_threat_name', 'N/A')}")
print(f"VT ссылка: {result.get('vt_link', 'N/A')}")
```

### 6.2 Malware Bazaar

```python
import requests

def check_malware_bazaar(file_hash: str) -> dict:
    """
    Поиск в Malware Bazaar (бесплатно, без ключа)
    """
    url = "https://mb-api.abuse.ch/api/v1/"
    data = {
        "query": "get_info",
        "hash": file_hash
    }
    resp = requests.post(url, data=data, timeout=30)
    result = resp.json()
    
    if result.get('query_status') == 'hash_not_found':
        return {'found': False, 'hash': file_hash}
    
    sample = result.get('data', [{}])[0]
    return {
        'found': True,
        'hash': file_hash,
        'file_name': sample.get('file_name', ''),
        'file_type': sample.get('file_type', ''),
        'file_size': sample.get('file_size', 0),
        'mime_type': sample.get('mime_type', ''),
        'signature': sample.get('signature', ''),
        'tags': sample.get('tags', []),
        'first_seen': sample.get('first_seen', ''),
        'last_seen': sample.get('last_seen', ''),
        'reporter': sample.get('reporter', ''),
        'origin_country': sample.get('origin_country', ''),
        'bazaar_link': f"https://bazaar.abuse.ch/sample/{file_hash}/"
    }

result = check_malware_bazaar("44d88612fea8a8f36de82e1278abb02f")
if result['found']:
    print(f"Найдено в Malware Bazaar!")
    print(f"Имя файла: {result['file_name']}")
    print(f"Сигнатура: {result['signature']}")
    print(f"Теги: {result['tags']}")
    print(f"Первое появление: {result['first_seen']}")
```

---

## 7. 🌍 Обогащение Доменов и URL

### 7.1 WHOIS для доменов

```python
import subprocess
import re
from datetime import datetime

def domain_whois(domain: str) -> dict:
    """Парсинг WHOIS для домена"""
    result = subprocess.run(
        ['whois', domain],
        capture_output=True, text=True, timeout=15
    )
    raw = result.stdout
    
    # Извлекаем ключевые поля
    fields = {}
    patterns = {
        'registrar': r'Registrar:\s*(.+)',
        'creation_date': r'Creation Date:\s*(.+)',
        'updated_date': r'Updated Date:\s*(.+)',
        'expiry_date': r'Registry Expiry Date:\s*(.+)',
        'registrant_org': r'Registrant Organization:\s*(.+)',
        'registrant_country': r'Registrant Country:\s*(.+)',
        'name_servers': r'Name Server:\s*(.+)',
        'dnssec': r'DNSSEC:\s*(.+)',
    }
    
    for field, pattern in patterns.items():
        match = re.search(pattern, raw, re.IGNORECASE)
        if match:
            fields[field] = match.group(1).strip()
    
    # Вычислить возраст домена
    if 'creation_date' in fields:
        try:
            # Попытка разобрать дату
            date_str = fields['creation_date'].split('T')[0]
            created = datetime.strptime(date_str, '%Y-%m-%d')
            age_days = (datetime.now() - created).days
            fields['age_days'] = age_days
            fields['age_suspicious'] = age_days < 30  # Молодой домен
        except:
            pass
    
    return {'domain': domain, 'raw': raw[:1000], **fields}

whois_data = domain_whois("suspicious-domain-example.com")
print(f"Домен: {whois_data['domain']}")
print(f"Регистратор: {whois_data.get('registrar', 'N/A')}")
print(f"Дата создания: {whois_data.get('creation_date', 'N/A')}")
print(f"Возраст: {whois_data.get('age_days', 'N/A')} дней")
if whois_data.get('age_suspicious'):
    print("ВНИМАНИЕ: Домен моложе 30 дней — подозрительно!")
```

### 7.2 Пассивный DNS

```python
import requests

def passive_dns_securitytrails(domain: str, api_key: str) -> dict:
    """
    Пассивный DNS через SecurityTrails API
    Показывает историю DNS-записей домена
    """
    headers = {"apikey": api_key}
    
    # История DNS
    url = f"https://api.securitytrails.com/v1/history/{domain}/dns/a"
    resp = requests.get(url, headers=headers, timeout=15)
    
    if resp.status_code != 200:
        return {'error': resp.text}
    
    data = resp.json()
    records = data.get('records', [])
    
    return {
        'domain': domain,
        'historical_ips': [
            {
                'ip': r.get('ip'),
                'first_seen': r.get('first_seen'),
                'last_seen': r.get('last_seen'),
                'organizations': r.get('organizations', [])
            }
            for r in records[:20]
        ],
        'total_records': data.get('record_count', 0)
    }

def check_certificate_transparency(domain: str) -> list:
    """
    Certificate Transparency поиск через crt.sh
    Позволяет найти субдомены и связанные домены
    """
    url = f"https://crt.sh/?q=%.{domain}&output=json"
    try:
        resp = requests.get(url, timeout=15)
        certs = resp.json()
        
        subdomains = set()
        for cert in certs:
            name = cert.get('name_value', '')
            for sub in name.split('\n'):
                sub = sub.strip().lstrip('*.')
                if sub.endswith(domain):
                    subdomains.add(sub)
        
        return sorted(list(subdomains))
    except Exception as e:
        return [f"Error: {str(e)}"]

# Пример: поиск субдоменов
subs = check_certificate_transparency("example.com")
print(f"Найдено субдоменов через CT Logs: {len(subs)}")
for sub in subs[:10]:
    print(f"  - {sub}")
```

### 7.3 URLscan.io

```python
import requests
import time

URLSCAN_KEY = "ваш_api_ключ"

def urlscan_submit(url: str) -> dict:
    """Отправка URL на сканирование в URLscan.io"""
    headers = {
        "API-Key": URLSCAN_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "url": url,
        "visibility": "public"  # или "private"
    }
    resp = requests.post(
        "https://urlscan.io/api/v1/scan/",
        headers=headers,
        json=payload,
        timeout=15
    )
    return resp.json()

def urlscan_get_result(scan_uuid: str, wait_seconds: int = 30) -> dict:
    """Получение результата сканирования"""
    time.sleep(wait_seconds)  # Дать время на сканирование
    
    url = f"https://urlscan.io/api/v1/result/{scan_uuid}/"
    resp = requests.get(url, timeout=15)
    
    if resp.status_code == 404:
        return {'error': 'Результат ещё не готов'}
    
    data = resp.json()
    page = data.get('page', {})
    verdicts = data.get('verdicts', {})
    
    return {
        'url': page.get('url'),
        'final_url': page.get('url'),  # После редиректов
        'ip': page.get('ip'),
        'country': page.get('country'),
        'server': page.get('server', ''),
        'domain': page.get('domain'),
        'title': page.get('title', ''),
        'status': page.get('status'),
        'malicious': verdicts.get('overall', {}).get('malicious', False),
        'score': verdicts.get('overall', {}).get('score', 0),
        'brands': verdicts.get('overall', {}).get('brands', []),
        'screenshot': data.get('task', {}).get('screenshotURL', ''),
        'report_url': f"https://urlscan.io/result/{scan_uuid}/"
    }

# Использование
submit_result = urlscan_submit("http://suspicious-phishing-url.example.com/login")
if 'uuid' in submit_result:
    uuid = submit_result['uuid']
    print(f"Сканирование запущено: {uuid}")
    result = urlscan_get_result(uuid)
    print(f"Итоговый URL: {result.get('final_url')}")
    print(f"IP: {result.get('ip')} ({result.get('country')})")
    print(f"Вредоносный: {result.get('malicious')}")
    print(f"Скриншот: {result.get('screenshot')}")
```

---

## 8. 🔄 MISP — Платформа Обмена IoC

### 8.1 Что такое MISP

**MISP** (Malware Information Sharing Platform) — open-source платформа для хранения, обмена и корреляции IoC между организациями.

```
MISP Ecosystem:

┌─────────────────────────────────────────────────────┐
│                    MISP Instance                     │
├─────────────────────────────────────────────────────┤
│  Events: коллекции IoC одного инцидента             │
│  Attributes: конкретные IoC (IP, hash, domain, URL) │
│  Tags: маркировка (TLP, MITRE ATT&CK)              │
│  Galaxies: знания (Threat Actor, Malware, Tool)     │
│  Feeds: внешние источники IoC                       │
└─────────────┬─────────────────────────────┬─────────┘
              │                             │
    ┌─────────▼──────┐             ┌────────▼────────┐
    │  MISP Feed A   │             │  MISP Feed B    │
    │  (другая орг.) │             │  (CIRCL, etc.)  │
    └────────────────┘             └─────────────────┘
```

### 8.2 Работа с MISP API

```python
from pymisp import PyMISP, MISPEvent, MISPAttribute

MISP_URL = "https://your-misp-instance.local"
MISP_KEY = "ваш_api_ключ"
MISP_VERIFYCERT = False

misp = PyMISP(MISP_URL, MISP_KEY, MISP_VERIFYCERT)

def search_misp_by_ioc(value: str, ioc_type: str = None) -> list:
    """
    Поиск IoC в MISP
    ioc_type: 'ip-dst', 'domain', 'md5', 'sha256', 'url', None (любой)
    """
    kwargs = {'value': value}
    if ioc_type:
        kwargs['type_attribute'] = ioc_type
    
    result = misp.search(controller='attributes', **kwargs)
    
    if isinstance(result, dict) and 'Attribute' in result:
        return result['Attribute']
    return []

def create_misp_event_for_incident(incident_id: str, iocs: list) -> dict:
    """
    Создание MISP Event для инцидента
    iocs: [{'type': 'ip-dst', 'value': '1.2.3.4', 'comment': '...'}, ...]
    """
    event = MISPEvent()
    event.info = f"Incident {incident_id} - SOC Investigation"
    event.distribution = 0  # Только ваша организация
    event.threat_level_id = 2  # HIGH
    event.analysis = 1  # ONGOING
    
    # Добавляем теги
    event.add_tag('tlp:amber')
    event.add_tag('misp-galaxy:mitre-attack-pattern="Phishing - T1566"')
    
    # Добавляем IoC
    for ioc in iocs:
        attr = MISPAttribute()
        attr.type = ioc['type']
        attr.value = ioc['value']
        attr.comment = ioc.get('comment', '')
        attr.to_ids = ioc.get('to_ids', True)  # Использовать в IDS?
        event.add_attribute(**attr.to_dict())
    
    result = misp.add_event(event)
    return result

# Поиск подозрительного IP в MISP
ip = "203.0.113.45"
matches = search_misp_by_ioc(ip, 'ip-dst')
if matches:
    print(f"[!] IP {ip} найден в MISP! {len(matches)} совпадений")
    for m in matches[:3]:
        print(f"    Event: {m.get('Event', {}).get('info', 'N/A')}")
        print(f"    Дата: {m.get('timestamp', 'N/A')}")
else:
    print(f"IP {ip} не найден в MISP")
```

---

## 9. 🤖 Автоматическое Обогащение (SOAR)

### 9.1 Python-скрипт параллельного обогащения

```python
import asyncio
import aiohttp
import json
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime

@dataclass
class EnrichmentResult:
    ioc_value: str
    ioc_type: str  # 'ip', 'hash', 'domain', 'url'
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    # IP enrichment
    abuseipdb_score: Optional[int] = None
    abuseipdb_reports: Optional[int] = None
    geo_country: Optional[str] = None
    geo_city: Optional[str] = None
    geo_asn: Optional[str] = None
    shodan_ports: Optional[list] = None
    shodan_vulns: Optional[list] = None
    
    # Hash enrichment
    vt_detection_ratio: Optional[str] = None
    vt_malicious: Optional[int] = None
    vt_malware_family: Optional[str] = None
    bazaar_found: Optional[bool] = None
    bazaar_signature: Optional[str] = None
    
    # Domain enrichment
    domain_age_days: Optional[int] = None
    domain_registrar: Optional[str] = None
    misp_found: Optional[bool] = None
    misp_events: Optional[list] = None
    
    def verdict(self) -> str:
        """Автоматический вердикт на основе обогащения"""
        score = 0
        reasons = []
        
        if self.abuseipdb_score and self.abuseipdb_score > 50:
            score += 3
            reasons.append(f"AbuseIPDB: {self.abuseipdb_score}%")
        
        if self.vt_malicious and self.vt_malicious > 5:
            score += 5
            reasons.append(f"VT: {self.vt_malicious} детект.")
        
        if self.bazaar_found:
            score += 5
            reasons.append(f"Bazaar: {self.bazaar_signature}")
        
        if self.domain_age_days and self.domain_age_days < 30:
            score += 2
            reasons.append(f"Новый домен: {self.domain_age_days} дней")
        
        if self.misp_found:
            score += 4
            reasons.append("Найден в MISP")
        
        if score >= 8:
            verdict = "MALICIOUS"
        elif score >= 4:
            verdict = "SUSPICIOUS"
        elif score >= 1:
            verdict = "LOW_RISK"
        else:
            verdict = "CLEAN"
        
        return f"{verdict} (score={score}, reasons: {', '.join(reasons) if reasons else 'none'})"


async def enrich_ip_async(session: aiohttp.ClientSession, ip: str,
                          abuse_key: str) -> dict:
    """Асинхронное обогащение IP"""
    results = {}
    
    # AbuseIPDB
    try:
        async with session.get(
            "https://api.abuseipdb.com/api/v2/check",
            params={"ipAddress": ip, "maxAgeInDays": 90},
            headers={"Key": abuse_key, "Accept": "application/json"},
            timeout=aiohttp.ClientTimeout(total=10)
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                results['abuseipdb'] = data.get('data', {})
    except Exception as e:
        results['abuseipdb_error'] = str(e)
    
    # GeoIP
    try:
        async with session.get(
            f"http://ip-api.com/json/{ip}",
            timeout=aiohttp.ClientTimeout(total=5)
        ) as resp:
            if resp.status == 200:
                results['geo'] = await resp.json()
    except Exception as e:
        results['geo_error'] = str(e)
    
    return results


async def enrich_batch(iocs: list, abuse_key: str, vt_key: str) -> list:
    """Параллельное обогащение списка IoC"""
    async with aiohttp.ClientSession() as session:
        tasks = []
        for ioc in iocs:
            if ioc['type'] == 'ip':
                tasks.append(enrich_ip_async(session, ioc['value'], abuse_key))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return list(zip(iocs, results))


# Запуск
async def main():
    iocs = [
        {'type': 'ip', 'value': '203.0.113.45'},
        {'type': 'ip', 'value': '198.51.100.12'},
        {'type': 'ip', 'value': '192.0.2.1'},
    ]
    
    results = await enrich_batch(iocs, "ABUSE_KEY", "VT_KEY")
    for ioc, result in results:
        if isinstance(result, Exception):
            print(f"Error for {ioc['value']}: {result}")
        else:
            abuse_data = result.get('abuseipdb', {})
            geo_data = result.get('geo', {})
            print(f"IP: {ioc['value']}")
            print(f"  Abuse score: {abuse_data.get('abuseConfidenceScore', 'N/A')}%")
            print(f"  Country: {geo_data.get('country', 'N/A')}")
            print(f"  ISP: {geo_data.get('isp', 'N/A')}")

asyncio.run(main())
```

---

## 10. ✅ True Positive vs False Positive

### 10.1 Матрица решений

```
                    РЕАЛЬНАЯ УГРОЗА?
                    ДА           НЕТ
              ┌──────────────┬──────────────┐
  АЛЕРТ       │              │              │
  СРАБОТАЛ ДА │ TRUE POSITIVE│ FALSE POSITIVE│
              │   (TP)       │    (FP)      │
              ├──────────────┼──────────────┤
  АЛЕРТ       │              │              │
  НЕ СРАБТ. НЕТ│FALSE NEGATIVE│ TRUE NEGATIVE│
              │   (FN)  ←!  │    (TN)      │
              └──────────────┴──────────────┘
                   ↑ Опасно!
```

### 10.2 Критерии определения TP vs FP

```python
def determine_tp_fp(alert: dict, enrichment: dict) -> dict:
    """
    Автоматизированная помощь в определении TP/FP
    Возвращает рекомендацию с обоснованием
    """
    reasons_tp = []
    reasons_fp = []
    
    # Проверка AbuseIPDB
    abuse_score = enrichment.get('abuseipdb_score', 0)
    if abuse_score > 70:
        reasons_tp.append(f"AbuseIPDB confidence {abuse_score}% — высокая угроза")
    elif abuse_score < 10:
        reasons_fp.append(f"AbuseIPDB confidence {abuse_score}% — вероятно чистый")
    
    # Проверка VirusTotal
    vt_malicious = enrichment.get('vt_malicious', 0)
    if vt_malicious > 10:
        reasons_tp.append(f"VT: {vt_malicious} антивирусов детектируют")
    elif vt_malicious == 0:
        reasons_fp.append("VT: ни один антивирус не детектирует")
    
    # Проверка MISP
    if enrichment.get('misp_found'):
        reasons_tp.append("IoC найден в MISP — известная угроза")
    
    # Контекст алерта
    asset_criticality = alert.get('asset_criticality', 'LOW')
    if asset_criticality == 'CRITICAL':
        reasons_tp.append("Актив критической важности")
    
    # Время суток (нерабочее время — подозрительно)
    hour = int(alert.get('hour', 12))
    if hour < 6 or hour > 22:
        reasons_tp.append(f"Активность в нерабочее время ({hour}:00)")
    
    # Проверка whitelist
    if enrichment.get('is_whitelisted'):
        reasons_fp.append("IP/домен в whitelist (известный сервис)")
    
    # Вынесение вердикта
    tp_weight = len(reasons_tp) * 2 + (3 if vt_malicious > 10 else 0)
    fp_weight = len(reasons_fp)
    
    if tp_weight > fp_weight + 2:
        verdict = "TRUE_POSITIVE"
        confidence = "HIGH" if tp_weight > 6 else "MEDIUM"
        action = "Создать инцидент, эскалировать Tier 2"
    elif fp_weight > tp_weight:
        verdict = "FALSE_POSITIVE"
        confidence = "MEDIUM"
        action = "Закрыть алерт, предложить тюнинг правила"
    else:
        verdict = "NEEDS_INVESTIGATION"
        confidence = "LOW"
        action = "Дополнительное расследование Tier 1/2"
    
    return {
        'verdict': verdict,
        'confidence': confidence,
        'action': action,
        'tp_reasons': reasons_tp,
        'fp_reasons': reasons_fp
    }
```

---

## 11. 📋 Документирование Триажа

### 11.1 Что записывать в тикет

```markdown
# Тикет INC-2026-0225-001

## Алерт
- **Источник:** Splunk SIEM
- **Правило:** Apache SQLi Detection
- **Время алерта:** 2026-02-25 09:01:00 UTC
- **Время начала триажа:** 2026-02-25 09:03:15 UTC

## Затронутые активы
- **Хост:** web-prod-01.corp.local (10.0.0.100)
- **Критичность:** PRODUCTION / HIGH

## Первичный анализ
Алерт на SQL injection попытки от IP 203.0.113.45.
В логах зафиксировано 7 запросов с признаками SQLi за 10 минут.
Инструмент: sqlmap (по User-Agent).

## Обогащение IoC

### IP: 203.0.113.45
| Источник | Результат |
|----------|-----------|
| AbuseIPDB | 87% confidence, 143 репорта |
| Геолокация | CN / Shenzhen / Tencent Cloud |
| Shodan | Открытые порты: 22, 80, 443, 8080 |
| MISP | Не найден |

## Вердикт
**TRUE POSITIVE — HIGH severity**

Причины:
- AbuseIPDB: 87% (известный сканер/атакующий)
- SQLi паттерны в URI (UNION SELECT, SLEEP())
- Производственная система
- sqlmap UA подтверждён

## Действия
1. [09:05] Заблокировал IP 203.0.113.45 на WAF
2. [09:07] Уведомил Tier 2 (@engineer_name)
3. [09:10] Создан инцидент INC-2026-0225-001
4. [09:15] Передан разработчику для проверки SQLi

## SLA
- SLA для HIGH: 4 часа
- Время триажа: 12 минут ✓
- Время до эскалации: 7 минут ✓
```

---

## 12. 📝 Практическое задание

### Сценарий: Полный триаж реального алерта

**Алерт из SIEM:**

```json
{
  "alert_id": "SIEM-20260225-9871",
  "rule_name": "Suspicious PowerShell Execution",
  "severity": "HIGH",
  "timestamp": "2026-02-25T14:30:00Z",
  "host": "WORKSTATION-42.corp.local",
  "user": "j.smith",
  "process": "powershell.exe",
  "command_line": "powershell -nop -w hidden -enc JABjAG8AbgBuAGUAYwB0AGkAbwBuAA==",
  "parent_process": "WINWORD.EXE",
  "parent_document": "Invoice_February_2026.docm",
  "src_ip": "10.0.0.242",
  "event_id": 4688
}
```

**Задание:**

```python
# triage_task.py

import base64

# Шаг 1: Декодировать Base64 команду
encoded = "JABjAG8AbgBuAGUAYwB0AGkAbwBuAA=="
decoded = base64.b64decode(encoded).decode('utf-16-le')
print(f"Декодированная команда: {decoded}")

# Шаг 2: Оценить подозрительность
SUSPICIOUS_INDICATORS = {
    'powershell_flags': ['-nop', '-w hidden', '-enc', '-noprofile', '-windowstyle hidden'],
    'suspicious_parents': ['WINWORD.EXE', 'EXCEL.EXE', 'OUTLOOK.EXE', 'MSPUB.EXE'],
    'command_keywords': ['DownloadString', 'IEX', 'Invoke-Expression', 'WebClient', 'Net.WebClient'],
}

# Шаг 3: Определить Impact и Likelihood
# Impact: какой актив? j.smith — обычный пользователь или привилегированный?
# Likelihood: все признаки указывают на реальную атаку

# Шаг 4: Обогатить IoC
# - Хост: WORKSTATION-42 — критичность?
# - Пользователь j.smith — отдел, роль?
# - Документ Invoice_February_2026.docm — откуда получен?

# Шаг 5: Вынести вердикт TP/FP и рекомендовать действия

print("""
АНАЛИЗ АЛЕРТА SIEM-20260225-9871
================================

Индикаторы компрометации:
1. PowerShell запущен из WINWORD.EXE — классический macro malware
2. Флаги -nop -w hidden — скрытое выполнение
3. -enc (Base64) — обфускация команды
4. Вложение .docm — документ с макросами

Вердикт: TRUE POSITIVE (CRITICAL)

Немедленные действия:
1. Изолировать WORKSTATION-42 от сети
2. Уведомить j.smith о подозрительной активности
3. Собрать forensic image (RAM dump + disk)
4. Проверить другие хосты где j.smith залогинен
5. Заблокировать файл по хэшу в AV/EDR
""")
```

### Контрольные вопросы

1. Почему `-nop -w hidden -enc` однозначно указывают на вредоносную активность?
2. Какое MITRE ATT&CK техники используются в этом алерте?
3. Как повысить качество правила, чтобы снизить FP Rate?
4. Что такое SOAR и как он ускоряет триаж?
5. Составьте матрицу приоритизации для 5 типичных алертов вашего SOC.

---

## 📚 Итоги

| Концепция | Ключевой момент |
|-----------|----------------|
| Триаж | Сортировка алертов по приоритету. Цель — не пропустить TP |
| Alert Fatigue | FP Rate >70% = выгорание аналитиков. Тюнинг правил обязателен |
| Severity Matrix | Risk = Impact × Likelihood. От 1 до 16 |
| Обогащение IP | AbuseIPDB + Shodan + GeoIP = полный контекст за 30 секунд |
| Обогащение хэша | VirusTotal + Malware Bazaar + MISP |
| Обогащение домена | WHOIS возраст + Passive DNS + Certificate Transparency |
| TP vs FP | Решение на основе данных, не интуиции. Документировать всегда |
| SOAR | Автоматизирует обогащение. Аналитик решает — машина собирает |

**Ключевые выводы:**
- Триаж — это не просто посмотреть на алерт, это структурированный процесс с чеклистом
- Обогащение превращает "IP 203.0.113.45 подозрителен" в "китайский VPS с AbuseIPDB 87%, 143 атаки на SSH"
- MISP — обязательный инструмент для корпоративного SOC
- Автоматизируйте сбор данных, но решение о TP/FP принимает человек
- Документируйте всё: каждый закрытый FP — это данные для улучшения правил

---

[← Предыдущая](./chapter-6-4) | [Следующая →](../part-7/chapter-7-1)
