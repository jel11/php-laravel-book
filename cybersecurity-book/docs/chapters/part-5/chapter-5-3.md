# Глава 5.3: Threat Intelligence и управление IOC

## 🎯 Цели главы

К концу этой главы вы будете уметь:

- Различать 4 типа Threat Intelligence и понимать, для кого каждый предназначен
- Объяснить разницу между IOC и IOA и правильно применять каждое понятие
- Использовать Пирамиду боли (Pyramid of Pain) для приоритизации TI
- Работать с основными TI-платформами: VirusTotal, MISP, AlienVault OTX
- Понимать форматы STIX/TAXII и обмен данными об угрозах
- Интегрировать TI-фиды в SIEM для автоматического обогащения алертов
- Написать скрипт для автоматического сбора и обработки IOC

---

## 5.3.1 Что такое Threat Intelligence

### Определение

**Cyber Threat Intelligence (CTI)** — это доказательные знания об угрозах, включая контекст, механизмы, индикаторы, последствия и практические рекомендации, которые помогают принимать решения об ответных действиях.

Ключевое слово: **доказательные знания**, а не просто данные или информация.

```
Данные → Информация → Знания → Интеллект

[Raw Data]       [Information]      [Intelligence]
IP: 1.2.3.4   → IP заблокировал → APT29 использует этот IP
Hash: abc123  → Файл детектирован → для C2 коммуникации,
Port: 4444    → как вредоносный   → атака продолжится —
                                    блокировать диапазон
                                    ASN и проверить другие хосты
```

### Зачем нужен CTI

```
Без CTI:          С CTI:
+----------+      +----------------------------------+
| Алерт!   |      | Алерт: IP 1.2.3.4               |
| IP с     |  →   | Это C2 сервер APT29 (Cozy Bear). |
| запросом |      | Атака идёт уже 3 дня.            |
|          |      | Обычно после этого они делают    |
|          |      | lateral movement через RDP.      |
|          |      | ДЕЙСТВИЕ: блокировать IP,        |
|          |      | проверить другие хосты на         |
|          |      | подозрительный RDP-трафик.       |
+----------+      +----------------------------------+
```

---

## 5.3.2 Четыре типа Threat Intelligence

```
        СТРАТЕГИЧЕСКИЙ
         (для CISO, совета директоров)
              |
    ОПЕРАТИВНЫЙ
    (для SOC-менеджеров, IR-команд)
         |
  ТАКТИЧЕСКИЙ
  (для SOC-аналитиков, blue team)
       |
ТЕХНИЧЕСКИЙ
(для SIEM, IDS, firewall)
```

### Тип 1: Стратегический (Strategic)

**Аудитория:** CISO, совет директоров, руководство бизнеса

**Содержание:**
- Трендовые угрозы для конкретной отрасли
- Геополитические риски
- Финансовые последствия киберинцидентов
- Рекомендации по бюджету и приоритетам

**Примеры:**
- "Атаки на финансовый сектор выросли на 40% в 2024 году"
- "APT-группы из региона X активно атакуют компании вашей отрасли"
- "Ransomware-as-a-Service снизил порог входа для атакующих"

**Формат:** Отчёты, брифинги, дашборды для executives

---

### Тип 2: Оперативный (Operational)

**Аудитория:** SOC-менеджеры, IR-команды, threat hunters

**Содержание:**
- Детали конкретных кампаний
- Методологии атак (TTPs)
- Профили атакующих
- Контекст текущих атак

**Примеры:**
- "Группа FIN7 запустила новую фишинговую кампанию против ритейла"
- "Используют документы с темой 'счёт-фактура Q4 2024'"
- "C2 инфраструктура: 185.x.x.x/24 в AS12345"

**Формат:** Технические отчёты, threat briefs

---

### Тип 3: Тактический (Tactical)

**Аудитория:** SOC-аналитики, blue team, пентестеры

**Содержание:**
- TTPs атакующих (MITRE ATT&CK техники)
- Детали вредоносных инструментов
- Паттерны атак
- Рекомендации по детекции и mitigation

**Примеры:**
- "Вредонос использует PowerShell с base64 обфускацией (T1059.001)"
- "Persistence через Scheduled Tasks (T1053.005)"
- "Sigma-правило для детекции прилагается"

**Формат:** YARA/Sigma/Snort правила, ATT&CK матрицы

---

### Тип 4: Технический (Technical)

**Аудитория:** SIEM/IDS/Firewall системы, автоматизация

**Содержание:**
- IP-адреса, домены, хэши
- URL, email-адреса
- Снятые с производства — быстро устаревают

**Примеры:**
```
IP: 185.234.x.x
Domain: evil-c2.xyz
Hash (SHA256): a3b4c5d6e7f8...
Email: phish@spoofdomain.com
URL: http://malware.xyz/payload.exe
```

**Формат:** CSV, JSON, STIX, TAXII фиды

---

## 5.3.3 IOC vs IOA: критическая разница

### Индикаторы Компрометации (IOC)

**Indicators of Compromise (IOC)** — артефакты, свидетельствующие о том, что компрометация УЖЕ произошла.

```
IOC примеры:
+-------------------+----------------------------------+
| Тип               | Пример                           |
+-------------------+----------------------------------+
| IP-адрес          | 185.234.x.x (C2 сервер)          |
| Домен             | evil-payload.xyz                 |
| URL               | http://x.x.x.x/rat.exe          |
| Hash (MD5/SHA256) | d41d8cd98f00b204e9800998ecf8427e |
| Email отправитель | phish@fakecompany.com            |
| Имя файла         | WindowsUpdate.exe                |
| Ключ реестра      | HKCU\...\Run\Updater             |
| Mutex             | Global\{GUID}                    |
| User-Agent        | Mozilla/4.0 (compatible; MSIE)   |
+-------------------+----------------------------------+

Проблема IOC:
- Атакующие легко меняют IP, домены, хэши
- Быстро устаревают
- Много ложных срабатываний
- Реагируем НА ПРОШЛОЕ, а не на текущую атаку
```

### Индикаторы Атаки (IOA)

**Indicators of Attack (IOA)** — признаки, указывающие на то, что атака ПРОИСХОДИТ ПРЯМО СЕЙЧАС, независимо от конкретных инструментов.

```
IOA примеры:
+---------------------------+--------------------------------+
| Поведение                 | Значение                       |
+---------------------------+--------------------------------+
| PowerShell с -enc флагом  | Попытка обфускации             |
| из Word-документа         |                                |
+---------------------------+--------------------------------+
| Процесс читает память     | Кража учётных данных           |
| lsass.exe                 |                                |
+---------------------------+--------------------------------+
| Исходящий трафик на       | Возможный C2                   |
| нетипичный порт           |                                |
+---------------------------+--------------------------------+
| Создание нового сервиса   | Попытка persistence            |
| в нерабочее время         |                                |
+---------------------------+--------------------------------+

Преимущества IOA:
+ Не зависят от конкретных инструментов
+ Труднее обойти атакующему
+ Detect unknown malware
+ Реагируем на ТЕКУЩУЮ атаку
```

### Сравнение IOC vs IOA

| Аспект | IOC | IOA |
|--------|-----|-----|
| Когда | После факта | Во время атаки |
| Основа | Артефакты | Поведение |
| Стойкость | Быстро устаревают | Более долгосрочные |
| Сложность обхода | Легко (сменить IP) | Сложнее |
| Инструмент | Firewall, SIEM lookup | EDR, UEBA, ML |
| Пример | Hash вредоноса | PowerShell из Word |

---

## 5.3.4 Пирамида боли (Pyramid of Pain)

Концепция Дэвида Бьянко (2013) показывает, насколько болезненно атакующему менять различные типы индикаторов.

```
                    /\
                   /  \
                  / TTP\
                 /------\    ← Очень болезненно менять
                /  Tools \
               /----------\  ← Болезненно
              / Network/   \
             / Host Artif. /  ← Неприятно
            /-------------/
           /  Domain Names \
          /-----------------\  ← Неприятно
         /    IP Addresses   \
        /---------------------\  ← Легко
       /         Hashes         \
      /---------------------------\  ← Тривиально

УРОВЕНЬ | ИНДИКАТОР    | УСИЛИЕ АТАКУЮЩЕГО ДЛЯ ИЗМЕНЕНИЯ
--------|--------------|----------------------------------
  6     | TTP          | ОЧЕНЬ ВЫСОКОЕ (надо переучиться)
  5     | Tools        | ВЫСОКОЕ (перепрограммировать)
  4     | Network Art. | СРЕДНЕЕ (изменить C2)
  3     | Host Art.    | СРЕДНЕЕ (изменить persistence)
  2     | Domain Names | НИЗКОЕ (зарегистрировать новый)
  1     | IP Addresses | ОЧЕНЬ НИЗКОЕ (сменить IP)
  0     | Hashes       | ТРИВИАЛЬНО (1 байт изменить)
```

### Практическое применение Пирамиды

```python
# Приоритизация IOC по Pyramid of Pain
from enum import IntEnum
from dataclasses import dataclass

class PyramidLevel(IntEnum):
    HASH = 0           # Тривиально для атакующего
    IP = 1             # Очень легко
    DOMAIN = 2         # Легко
    HOST_ARTIFACT = 3  # Неприятно
    NETWORK_ARTIFACT = 4  # Неприятно
    TOOL = 5           # Болезненно
    TTP = 6            # Очень болезненно

@dataclass
class ThreatIndicator:
    value: str
    indicator_type: str
    source: str
    confidence: int  # 0-100
    
    @property
    def pyramid_level(self) -> PyramidLevel:
        type_map = {
            "hash": PyramidLevel.HASH,
            "md5": PyramidLevel.HASH,
            "sha256": PyramidLevel.HASH,
            "ip": PyramidLevel.IP,
            "domain": PyramidLevel.DOMAIN,
            "hostname": PyramidLevel.DOMAIN,
            "url": PyramidLevel.DOMAIN,
            "registry": PyramidLevel.HOST_ARTIFACT,
            "mutex": PyramidLevel.HOST_ARTIFACT,
            "filename": PyramidLevel.HOST_ARTIFACT,
            "useragent": PyramidLevel.NETWORK_ARTIFACT,
            "ja3": PyramidLevel.NETWORK_ARTIFACT,
            "yara": PyramidLevel.TOOL,
            "sigma": PyramidLevel.TOOL,
            "ttp": PyramidLevel.TTP,
            "technique": PyramidLevel.TTP,
        }
        return type_map.get(self.indicator_type.lower(), PyramidLevel.HASH)
    
    @property
    def priority_score(self) -> float:
        """Итоговый приоритет с учётом уровня пирамиды и достоверности"""
        return (self.pyramid_level * 10 + self.confidence) / 2

def prioritize_indicators(indicators: list) -> list:
    """Сортировка индикаторов по приоритету"""
    return sorted(
        indicators,
        key=lambda x: x.priority_score,
        reverse=True
    )

# Пример:
indicators = [
    ThreatIndicator("d41d8cd98f00b204", "hash", "VirusTotal", 90),
    ThreatIndicator("185.234.x.x", "ip", "OTX", 70),
    ThreatIndicator("T1059.001", "ttp", "ATT&CK", 95),
    ThreatIndicator("evil-c2.xyz", "domain", "OTX", 80),
    ThreatIndicator("HKCU\\Run\\Updater", "registry", "IR-report", 95),
]

prioritized = prioritize_indicators(indicators)
for ind in prioritized:
    print(f"Level {ind.pyramid_level} ({ind.pyramid_level.name}): "
          f"{ind.value} — Priority: {ind.priority_score:.1f}")
```

---

## 5.3.5 Источники Threat Intelligence

### VirusTotal

```
VirusTotal предоставляет:
- Сканирование файлов/URL 70+ антивирусами
- Репутацию IP и доменов
- Граф связей (VT Graph)
- Поведенческий анализ (sandbox)
- Pivot analysis (OSINT через артефакты)
```

**Python API для VirusTotal:**

```python
#!/usr/bin/env python3
"""
VirusTotal API v3 - Анализ IOC
Установка: pip install vt-py
"""
import vt
import json
from typing import Optional

VT_API_KEY = "YOUR_VT_API_KEY"  # Бесплатно: 4 запроса/мин

def check_ip_reputation(ip: str) -> dict:
    """Проверка репутации IP-адреса"""
    with vt.Client(VT_API_KEY) as client:
        try:
            ip_obj = client.get_object(f"/ip_addresses/{ip}")
            
            return {
                "ip": ip,
                "malicious_votes": ip_obj.last_analysis_stats.get("malicious", 0),
                "suspicious_votes": ip_obj.last_analysis_stats.get("suspicious", 0),
                "total_engines": sum(ip_obj.last_analysis_stats.values()),
                "country": getattr(ip_obj, "country", "Unknown"),
                "as_owner": getattr(ip_obj, "as_owner", "Unknown"),
                "reputation": getattr(ip_obj, "reputation", 0),
                "tags": getattr(ip_obj, "tags", []),
            }
        except Exception as e:
            return {"ip": ip, "error": str(e)}

def check_hash_reputation(file_hash: str) -> dict:
    """Проверка репутации хэша файла"""
    with vt.Client(VT_API_KEY) as client:
        try:
            file_obj = client.get_object(f"/files/{file_hash}")
            
            return {
                "hash": file_hash,
                "name": getattr(file_obj, "meaningful_name", "Unknown"),
                "malicious": file_obj.last_analysis_stats.get("malicious", 0),
                "undetected": file_obj.last_analysis_stats.get("undetected", 0),
                "total": sum(file_obj.last_analysis_stats.values()),
                "first_seen": str(getattr(file_obj, "first_submission_date", "")),
                "file_type": getattr(file_obj, "type_description", "Unknown"),
                "size": getattr(file_obj, "size", 0),
                "tags": getattr(file_obj, "tags", []),
                "verdict": "MALICIOUS" if file_obj.last_analysis_stats.get("malicious", 0) > 5 
                          else "SUSPICIOUS" if file_obj.last_analysis_stats.get("malicious", 0) > 0
                          else "CLEAN"
            }
        except vt.APIError as e:
            if e.code == "NotFoundError":
                return {"hash": file_hash, "verdict": "NOT_FOUND"}
            return {"hash": file_hash, "error": str(e)}

def check_domain_reputation(domain: str) -> dict:
    """Проверка репутации домена"""
    with vt.Client(VT_API_KEY) as client:
        try:
            domain_obj = client.get_object(f"/domains/{domain}")
            
            return {
                "domain": domain,
                "malicious": domain_obj.last_analysis_stats.get("malicious", 0),
                "total": sum(domain_obj.last_analysis_stats.values()),
                "categories": getattr(domain_obj, "categories", {}),
                "creation_date": str(getattr(domain_obj, "creation_date", "")),
                "registrar": getattr(domain_obj, "registrar", "Unknown"),
                "reputation": getattr(domain_obj, "reputation", 0),
            }
        except Exception as e:
            return {"domain": domain, "error": str(e)}

def bulk_check_iocs(iocs: list) -> list:
    """
    Массовая проверка IOC
    iocs: список словарей {"type": "ip/hash/domain", "value": "..."}
    """
    results = []
    
    for ioc in iocs:
        ioc_type = ioc.get("type", "").lower()
        value = ioc.get("value", "")
        
        if ioc_type == "ip":
            result = check_ip_reputation(value)
        elif ioc_type in ["md5", "sha256", "sha1", "hash"]:
            result = check_hash_reputation(value)
        elif ioc_type == "domain":
            result = check_domain_reputation(value)
        else:
            result = {"value": value, "error": f"Unknown type: {ioc_type}"}
        
        result["ioc_type"] = ioc_type
        results.append(result)
    
    return results

# Пример использования
if __name__ == "__main__":
    test_iocs = [
        {"type": "ip", "value": "8.8.8.8"},
        {"type": "domain", "value": "google.com"},
        {"type": "hash", "value": "d41d8cd98f00b204e9800998ecf8427e"},
    ]
    
    results = bulk_check_iocs(test_iocs)
    print(json.dumps(results, indent=2, default=str))
```

---

### MISP (Malware Information Sharing Platform)

```
MISP — платформа для обмена TI между организациями

Архитектура MISP:
+------------------+     +------------------+
|   Организация A  |<--->|   Организация B  |
|   MISP Instance  |     |   MISP Instance  |
+------------------+     +------------------+
         ^                        ^
         |    MISP Sync           |
         v                        v
+------------------+     +------------------+
|   MISP Community |     |   MISP Community |
|   (CIRCL, FS-   |     |   (Financial,    |
|    ISAC, etc.)  |     |    Healthcare)   |
+------------------+     +------------------+

Основные концепции MISP:
- Event: набор связанных IOC (один инцидент/кампания)
- Attribute: отдельный IOC (IP, hash, domain)
- Tag: метка для классификации (ATT&CK, TLP)
- Galaxy: структурированные данные (ATT&CK, злоумышленники)
- Object: структурированные наборы атрибутов (file, network-traffic)
```

**Работа с MISP API:**

```python
#!/usr/bin/env python3
"""
MISP API - Управление IOC
Установка: pip install pymisp
"""
from pymisp import PyMISP, MISPEvent, MISPAttribute, MISPObject
from datetime import datetime
import json

MISP_URL = "https://your-misp-instance.com"
MISP_KEY = "YOUR_MISP_API_KEY"

def connect_misp() -> PyMISP:
    """Подключение к MISP"""
    return PyMISP(MISP_URL, MISP_KEY, False)

def create_incident_event(title: str, description: str, 
                          threat_level: int = 2) -> MISPEvent:
    """
    Создание события в MISP для нового инцидента
    threat_level: 1=High, 2=Medium, 3=Low, 4=Undefined
    """
    misp = connect_misp()
    
    event = MISPEvent()
    event.info = title
    event.threat_level_id = threat_level
    event.analysis = 1  # 0=Initial, 1=Ongoing, 2=Complete
    event.distribution = 1  # 0=Your org, 1=This community
    
    # Добавление тега TLP
    event.add_tag("tlp:amber")
    
    # Добавление ATT&CK тега
    event.add_tag("misp-galaxy:mitre-attack-pattern=\"Phishing - T1566\"")
    
    result = misp.add_event(event)
    print(f"[+] Event created: ID={result.id}")
    return result

def add_network_iocs(event_id: int, iocs: dict) -> None:
    """Добавление сетевых IOC к событию"""
    misp = connect_misp()
    
    event = misp.get_event(event_id, pythonify=True)
    
    # Добавление IP
    for ip in iocs.get("ips", []):
        attr = MISPAttribute()
        attr.type = "ip-dst"
        attr.value = ip
        attr.comment = "C2 server"
        attr.to_ids = True  # Использовать как IDS-сигнатуру
        event.add_attribute(**attr)
    
    # Добавление доменов
    for domain in iocs.get("domains", []):
        event.add_attribute("domain", domain, 
                           comment="Malicious domain", to_ids=True)
    
    # Добавление хэшей
    for hash_value in iocs.get("hashes", []):
        if len(hash_value) == 32:
            attr_type = "md5"
        elif len(hash_value) == 64:
            attr_type = "sha256"
        else:
            attr_type = "sha1"
        event.add_attribute(attr_type, hash_value, to_ids=True)
    
    misp.update_event(event)
    print(f"[+] Added {sum(len(v) for v in iocs.values())} IOC to event {event_id}")

def search_ioc(ioc_value: str) -> list:
    """Поиск IOC в MISP"""
    misp = connect_misp()
    
    results = misp.search(value=ioc_value, pythonify=True)
    
    found = []
    for event in results:
        found.append({
            "event_id": event.id,
            "event_title": event.info,
            "date": str(event.date),
            "threat_level": event.threat_level_id,
            "tags": [str(t) for t in event.tags],
        })
    
    return found

def export_iocs_for_siem(event_id: int) -> dict:
    """Экспорт IOC из события для загрузки в SIEM"""
    misp = connect_misp()
    
    # Экспорт в формате STIX 2.1
    stix_export = misp.get_stix(event_id)
    
    # Или экспорт в CSV
    csv_export = misp.get_csv(event_id, type_attribute=["ip-dst", "domain", "md5", "sha256"])
    
    return {
        "stix": stix_export,
        "csv": csv_export
    }
```

---

### AlienVault OTX (Open Threat Exchange)

```
OTX — крупнейшее сообщество обмена TI (200+ стран, 19 млн IOC)

Концепции OTX:
- Pulse: набор IOC для конкретной угрозы/кампании
- Indicator: отдельный IOC
- Subscription: подписка на Pulses конкретных пользователей

Преимущества:
+ Бесплатно
+ Огромное сообщество
+ API доступен
+ Интеграция с MISP, Splunk, Elastic

Недостатки:
- Качество данных разное (crowdsourced)
- Много устаревших IOC
- Нет верификации
```

```python
#!/usr/bin/env python3
"""
AlienVault OTX API
Установка: pip install OTXv2
"""
from OTXv2 import OTXv2, IndicatorTypes
import json

OTX_KEY = "YOUR_OTX_API_KEY"

def get_ip_threat_info(ip: str) -> dict:
    """Получение информации об угрозах для IP"""
    otx = OTXv2(OTX_KEY)
    
    try:
        # Общая репутация
        general = otx.get_indicator_details_full(
            IndicatorTypes.IPv4, ip
        )
        
        return {
            "ip": ip,
            "pulse_count": general.get("pulse_info", {}).get("count", 0),
            "reputation": general.get("reputation", 0),
            "country": general.get("general", {}).get("country_name", "Unknown"),
            "asn": general.get("general", {}).get("asn", "Unknown"),
            "pulses": [
                {
                    "name": p.get("name"),
                    "created": p.get("created"),
                    "tags": p.get("tags", [])
                }
                for p in general.get("pulse_info", {}).get("pulses", [])[:5]
            ]
        }
    except Exception as e:
        return {"ip": ip, "error": str(e)}

def subscribe_to_pulses(tags: list = None) -> list:
    """Получение последних Pulses по тегам"""
    otx = OTXv2(OTX_KEY)
    
    # Получение последних Pulses из подписок
    pulses = otx.getall(limit=10)
    
    result = []
    for pulse in pulses:
        # Фильтрация по тегам если указаны
        if tags:
            pulse_tags = [t.lower() for t in pulse.get("tags", [])]
            if not any(tag.lower() in pulse_tags for tag in tags):
                continue
        
        # Извлечение IOC из Pulse
        indicators = []
        for indicator in pulse.get("indicators", [])[:20]:
            indicators.append({
                "type": indicator.get("type"),
                "value": indicator.get("indicator"),
                "created": indicator.get("created"),
            })
        
        result.append({
            "id": pulse.get("id"),
            "name": pulse.get("name"),
            "description": pulse.get("description", "")[:200],
            "author": pulse.get("author", {}).get("username"),
            "created": pulse.get("created"),
            "tags": pulse.get("tags", []),
            "indicator_count": len(pulse.get("indicators", [])),
            "indicators_sample": indicators,
        })
    
    return result

def get_daily_ioc_feed() -> dict:
    """Получение ежедневного фида IOC для загрузки в SIEM"""
    otx = OTXv2(OTX_KEY)
    
    from datetime import datetime, timedelta
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S")
    
    # Получение Pulses обновлённых за последние сутки
    pulses = otx.getsince(yesterday, limit=50)
    
    feed = {
        "generated_at": datetime.utcnow().isoformat(),
        "ips": [],
        "domains": [],
        "hashes": [],
        "urls": []
    }
    
    for pulse in pulses:
        for indicator in pulse.get("indicators", []):
            itype = indicator.get("type", "").lower()
            value = indicator.get("indicator", "")
            
            if itype == "ipv4":
                feed["ips"].append(value)
            elif itype in ["domain", "hostname"]:
                feed["domains"].append(value)
            elif itype in ["filehash-md5", "filehash-sha256", "filehash-sha1"]:
                feed["hashes"].append(value)
            elif itype == "url":
                feed["urls"].append(value)
    
    # Дедупликация
    for key in feed:
        if isinstance(feed[key], list):
            feed[key] = list(set(feed[key]))
    
    return feed
```

---

### OpenCTI

```
OpenCTI — Open Source CTI платформа нового поколения

Возможности:
- Хранение и визуализация угроз в стиле графа знаний
- Встроенная поддержка STIX 2.1
- Коннекторы: MISP, OTX, VT, Shodan, и др.
- ATT&CK интеграция
- Автоматическое обогащение IOC

Развёртывание через Docker:
```

```yaml
# docker-compose.yml для OpenCTI
version: '3'
services:
  opencti:
    image: opencti/platform:5.12.0
    environment:
      - APP__PORT=8080
      - APP__BASE_URL=http://localhost:8080
      - APP__ADMIN__EMAIL=admin@opencti.io
      - APP__ADMIN__PASSWORD=SecurePassword123
      - ELASTICSEARCH__URL=http://elasticsearch:9200
      - REDIS__HOSTNAME=redis
    ports:
      - "8080:8080"
    depends_on:
      - elasticsearch
      - redis
      - rabbitmq
    
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
    
  redis:
    image: redis:7.2
    
  rabbitmq:
    image: rabbitmq:3.12-management

  # Коннектор для импорта MISP данных
  connector-misp:
    image: opencti/connector-misp:5.12.0
    environment:
      - OPENCTI_URL=http://opencti:8080
      - OPENCTI_TOKEN=YOUR_OPENCTI_TOKEN
      - CONNECTOR_ID=UNIQUE_UUID
      - MISP_URL=https://your-misp.com
      - MISP_KEY=YOUR_MISP_KEY
      - MISP_INTERVAL=5  # minutes
```

---

## 5.3.6 Форматы обмена: STIX и TAXII

### STIX 2.1 (Structured Threat Information eXpression)

```
STIX — стандартный язык для описания угроз

STIX объекты (SDO - STIX Domain Objects):
+------------------+------------------------------------------+
| Attack-Pattern   | ATT&CK техника (T1059.001)               |
| Campaign         | Кампания (Operation Aurora)              |
| Course-of-Action | Mitigation (обновить пароли)             |
| Identity         | Организация или личность                 |
| Indicator        | IOC с паттерном обнаружения             |
| Intrusion-Set    | APT группа (APT29)                       |
| Malware          | Вредоносное ПО (Cobalt Strike)           |
| Relationship     | Связь между объектами                   |
| Threat-Actor     | Атакующий                                |
| Tool             | Инструмент (Mimikatz)                    |
| Vulnerability    | CVE                                      |
+------------------+------------------------------------------+
```

**Пример STIX 2.1 объекта:**

```json
{
  "type": "bundle",
  "id": "bundle--44af6c39-c09b-49c5-9de2-394224b04982",
  "objects": [
    {
      "type": "indicator",
      "spec_version": "2.1",
      "id": "indicator--e8094b09-7df4-4b13-b207-1e27af3c4bde",
      "created": "2024-01-15T12:00:00.000Z",
      "modified": "2024-01-15T12:00:00.000Z",
      "name": "Malicious IP - APT29 C2",
      "description": "C2 сервер, используемый APT29 в кампании Operation Cozy",
      "indicator_types": ["malicious-activity"],
      "pattern": "[ipv4-addr:value = '185.234.x.x']",
      "pattern_type": "stix",
      "valid_from": "2024-01-15T00:00:00Z",
      "valid_until": "2024-04-15T00:00:00Z",
      "confidence": 85,
      "labels": ["apt29", "c2"],
      "kill_chain_phases": [
        {
          "kill_chain_name": "mitre-attack",
          "phase_name": "command-and-control"
        }
      ]
    },
    {
      "type": "malware",
      "spec_version": "2.1",
      "id": "malware--31b940d4-6f7f-459a-80ea-9c1f17b5891b",
      "created": "2024-01-15T12:00:00.000Z",
      "modified": "2024-01-15T12:00:00.000Z",
      "name": "SUNBURST",
      "description": "Бэкдор, используемый в атаке SolarWinds",
      "malware_types": ["backdoor"],
      "is_family": false
    },
    {
      "type": "relationship",
      "spec_version": "2.1",
      "id": "relationship--44298a74-ba52-4f0c-87d3-1486786d70a2",
      "created": "2024-01-15T12:00:00.000Z",
      "modified": "2024-01-15T12:00:00.000Z",
      "relationship_type": "indicates",
      "source_ref": "indicator--e8094b09-7df4-4b13-b207-1e27af3c4bde",
      "target_ref": "malware--31b940d4-6f7f-459a-80ea-9c1f17b5891b"
    }
  ]
}
```

### TAXII 2.1 (Trusted Automated eXchange of Intelligence Information)

```
TAXII — протокол для обмена STIX данными

TAXII Архитектура:
+------------------+         +------------------+
|   TAXII Server   |         |   TAXII Client   |
|   (Provider)     |         |   (Consumer)     |
|                  |         |                  |
|  /taxii2/        |<------->|  HTTPS GET/POST  |
|  /api/           |   REST  |                  |
|  /collections/   |  over   |  MISP, OpenCTI,  |
|  /objects/       | HTTPS   |  SIEM, etc.      |
+------------------+         +------------------+

TAXII Collections (группы данных):
- Collection = набор STIX объектов по теме
- Пример: "APT29_indicators", "Ransomware_hashes"
```

```python
#!/usr/bin/env python3
"""
TAXII 2.1 Client для получения TI фидов
Установка: pip install taxii2-client
"""
from taxii2client.v21 import Server, Collection
import json

def connect_to_taxii_server(url: str, user: str = None, 
                             password: str = None) -> Server:
    """Подключение к TAXII серверу"""
    if user and password:
        return Server(url, user=user, password=password)
    return Server(url)

def list_collections(server: Server) -> list:
    """Получение списка доступных коллекций"""
    collections = []
    
    for api_root in server.api_roots:
        for collection in api_root.collections:
            collections.append({
                "id": collection.id,
                "title": collection.title,
                "description": getattr(collection, "description", ""),
                "can_read": collection.can_read,
                "can_write": collection.can_write,
                "media_types": getattr(collection, "media_types", []),
            })
    
    return collections

def fetch_indicators_from_collection(collection: Collection, 
                                     added_after: str = None) -> list:
    """Получение индикаторов из коллекции"""
    filters = {}
    if added_after:
        filters["added_after"] = added_after
    
    # Только объекты типа indicator
    filters["type"] = "indicator"
    
    envelope = collection.get_objects(**filters)
    
    indicators = []
    for obj in envelope.get("objects", []):
        if obj.get("type") == "indicator":
            indicators.append({
                "id": obj.get("id"),
                "name": obj.get("name"),
                "pattern": obj.get("pattern"),
                "valid_from": obj.get("valid_from"),
                "valid_until": obj.get("valid_until"),
                "confidence": obj.get("confidence", 0),
                "labels": obj.get("labels", []),
            })
    
    return indicators

def extract_ioc_values(stix_pattern: str) -> dict:
    """
    Извлечение значений IOC из STIX паттернов
    Пример паттерна: [ipv4-addr:value = '1.2.3.4']
    """
    import re
    
    patterns = {
        "ip": r"\[ipv4-addr:value\s*=\s*'([^']+)'\]",
        "domain": r"\[domain-name:value\s*=\s*'([^']+)'\]",
        "url": r"\[url:value\s*=\s*'([^']+)'\]",
        "hash_md5": r"\[file:hashes\.MD5\s*=\s*'([^']+)'\]",
        "hash_sha256": r"\[file:hashes\.'SHA-256'\s*=\s*'([^']+)'\]",
    }
    
    extracted = {}
    for ioc_type, pattern in patterns.items():
        matches = re.findall(pattern, stix_pattern, re.IGNORECASE)
        if matches:
            extracted[ioc_type] = matches
    
    return extracted

# Публичные TAXII серверы для практики:
PUBLIC_TAXII_SERVERS = {
    "CIRCL": "https://www.circl.lu/taxii2/",
    "Anomali Limo": "https://limo.anomali.com/api/v1/taxii2/feeds/",
    "MITRE ATT&CK": "https://attack-taxii.mitre.org/api/v21/",
}

def demo_fetch_attack_data():
    """Демонстрация получения ATT&CK данных через TAXII"""
    server = connect_to_taxii_server(PUBLIC_TAXII_SERVERS["MITRE ATT&CK"])
    
    print(f"[*] Connected to: {server.title}")
    print(f"[*] Description: {server.description}")
    
    collections = list_collections(server)
    print(f"\n[+] Available collections ({len(collections)}):")
    for coll in collections:
        print(f"  - {coll['title']}: {coll['description'][:60]}")
```

---

## 5.3.7 CTI Lifecycle

```
CTI Lifecycle (по F3EAD и Diamond Model):

+-------------+   +-------------+   +-------------+
|  Direction  |→  | Collection  |→  | Processing  |
| (Направление|   | (Сбор)     |   | (Обработка) |
|  задач)     |   |             |   |             |
+-------------+   +-------------+   +-------------+
      ^                                     |
      |                                     v
+-------------+   +-------------+   +-------------+
| Feedback    |   |Dissemination|→  |  Analysis   |
| (Обратная   |←  | (Распрост.) |   | (Анализ)    |
|  связь)     |   |             |   |             |
+-------------+   +-------------+   +-------------+
```

### Direction (Направление)

```
Вопросы для определения задач CTI:

Для SOC-команды:
- Какие угрозы наиболее актуальны для нашей отрасли?
- Какие APT-группы атакуют компании нашего размера?
- Какие новые TTP появились за последний месяц?

Для IR-команды:
- Есть ли активные кампании против нашей организации?
- Какова инфраструктура атакующего?

Для Red Team:
- Как имитировать поведение релевантных APT?
- Какие техники наименее покрыты нашими детекциями?
```

### Collection (Сбор)

```
Источники сбора TI:

OSINT (Open Source):
├── VirusTotal, OTX, Shodan
├── Social media (Twitter/X хакерское сообщество)
├── Vendor блоги (Mandiant, CrowdStrike, Recorded Future)
├── GitHub (репозитории с IOC, правилами)
└── Публичные TAXII серверы

Коммерческие:
├── Recorded Future
├── Mandiant Advantage
├── CrowdStrike Intelligence
└── Cybersixgill (Dark Web мониторинг)

Сообщества:
├── ISAC (Information Sharing and Analysis Centers)
├── FS-ISAC (Financial Sector)
├── H-ISAC (Healthcare)
└── Sharing communities (MISP, CERTs)
```

### Processing (Обработка)

```python
#!/usr/bin/env python3
"""
IOC Processing Pipeline
Нормализация и дедупликация IOC из разных источников
"""
import re
import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Set, Dict, List

@dataclass
class IOC:
    value: str
    ioc_type: str
    source: str
    confidence: int = 50
    first_seen: datetime = field(default_factory=datetime.utcnow)
    last_seen: datetime = field(default_factory=datetime.utcnow)
    tags: list = field(default_factory=list)
    
    def normalize(self) -> 'IOC':
        """Нормализация значения IOC"""
        if self.ioc_type in ["ip", "ipv4"]:
            self.value = self.value.strip()
            self.ioc_type = "ip"
        elif self.ioc_type in ["domain", "hostname", "fqdn"]:
            self.value = self.value.lower().strip().rstrip(".")
            self.ioc_type = "domain"
        elif self.ioc_type in ["md5", "sha256", "sha1", "hash"]:
            self.value = self.value.lower().strip()
            # Определение типа хэша по длине
            hash_types = {32: "md5", 40: "sha1", 64: "sha256"}
            self.ioc_type = hash_types.get(len(self.value), "hash")
        elif self.ioc_type == "url":
            self.value = self.value.strip()
        return self
    
    def is_valid(self) -> bool:
        """Базовая валидация IOC"""
        if not self.value:
            return False
        
        if self.ioc_type == "ip":
            # Исключаем RFC1918, loopback, multicast
            import ipaddress
            try:
                ip = ipaddress.ip_address(self.value)
                return not (ip.is_private or ip.is_loopback or 
                           ip.is_multicast or ip.is_reserved)
            except ValueError:
                return False
        
        elif self.ioc_type == "domain":
            # Базовая валидация формата
            domain_pattern = r'^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$'
            return bool(re.match(domain_pattern, self.value))
        
        elif self.ioc_type in ["md5", "sha1", "sha256"]:
            lengths = {"md5": 32, "sha1": 40, "sha256": 64}
            expected_len = lengths.get(self.ioc_type, 0)
            return (len(self.value) == expected_len and 
                   bool(re.match(r'^[0-9a-f]+$', self.value)))
        
        return True

class IOCPipeline:
    """Пайплайн для обработки и дедупликации IOC"""
    
    def __init__(self):
        self._seen: Set[str] = set()
        self.processed: List[IOC] = []
        self.stats = {"total": 0, "valid": 0, "duplicates": 0, "invalid": 0}
    
    def _get_key(self, ioc: IOC) -> str:
        return f"{ioc.ioc_type}:{ioc.value}"
    
    def add(self, ioc: IOC) -> bool:
        """Добавление IOC в пайплайн с дедупликацией"""
        self.stats["total"] += 1
        
        # Нормализация
        ioc = ioc.normalize()
        
        # Валидация
        if not ioc.is_valid():
            self.stats["invalid"] += 1
            return False
        
        # Дедупликация
        key = self._get_key(ioc)
        if key in self._seen:
            self.stats["duplicates"] += 1
            # Обновляем last_seen для существующего
            for existing in self.processed:
                if self._get_key(existing) == key:
                    existing.last_seen = datetime.utcnow()
                    # Берём максимальный confidence
                    existing.confidence = max(existing.confidence, ioc.confidence)
            return False
        
        self._seen.add(key)
        self.processed.append(ioc)
        self.stats["valid"] += 1
        return True
    
    def filter_by_age(self, max_days: int = 30) -> List[IOC]:
        """Фильтрация IOC по возрасту"""
        cutoff = datetime.utcnow() - timedelta(days=max_days)
        return [ioc for ioc in self.processed if ioc.last_seen > cutoff]
    
    def filter_by_confidence(self, min_confidence: int = 70) -> List[IOC]:
        """Фильтрация по минимальному уровню достоверности"""
        return [ioc for ioc in self.processed 
                if ioc.confidence >= min_confidence]
    
    def export_for_siem(self, ioc_type: str = None) -> dict:
        """Экспорт IOC для загрузки в SIEM"""
        export = {"ips": [], "domains": [], "hashes": [], "urls": []}
        
        filtered = self.filter_by_confidence(60)
        
        for ioc in filtered:
            if ioc_type and ioc.ioc_type != ioc_type:
                continue
            
            if ioc.ioc_type == "ip":
                export["ips"].append(ioc.value)
            elif ioc.ioc_type == "domain":
                export["domains"].append(ioc.value)
            elif ioc.ioc_type in ["md5", "sha1", "sha256"]:
                export["hashes"].append(ioc.value)
            elif ioc.ioc_type == "url":
                export["urls"].append(ioc.value)
        
        return export
    
    def print_stats(self) -> None:
        print(f"\n[IOC Pipeline Stats]")
        print(f"  Total processed: {self.stats['total']}")
        print(f"  Valid IOC:       {self.stats['valid']}")
        print(f"  Duplicates:      {self.stats['duplicates']}")
        print(f"  Invalid:         {self.stats['invalid']}")
```

---

## 5.3.8 Интеграция TI-фидов в SIEM

### Интеграция с Wazuh

```bash
# Настройка Threat Intel в Wazuh через CDB (Constant Database)

# 1. Создание файла с малвар IOC (IP, домены)
cat > /var/ossec/etc/lists/malicious-ips.txt << 'EOF'
185.234.x.x:Malware C2 - APT29
192.168.x.x:Known bad actor
10.0.0.x:Test entry
EOF

# 2. Регистрация списка в ossec.conf
# Добавить в <ruleset> секцию:
# <list>etc/lists/malicious-ips</list>

# 3. Создание правила Wazuh для проверки IP
cat > /var/ossec/etc/rules/ti_rules.xml << 'EOF'
<group name="threat_intelligence,">
  <rule id="100200" level="12">
    <if_group>syslog</if_group>
    <list field="srcip" lookup="match_key">etc/lists/malicious-ips</list>
    <description>Threat Intel: Malicious IP detected - $(srcip)</description>
    <mitre>
      <id>T1071.001</id>
    </mitre>
    <group>ti_alert,</group>
  </rule>
</group>
EOF

# 4. Перезапуск Wazuh manager
systemctl restart wazuh-manager
```

### Скрипт автоматического обновления TI-фидов

```python
#!/usr/bin/env python3
"""
Автоматическое обновление TI-фидов в SIEM
Запускать как cron job: */30 * * * * python3 update_ti_feeds.py
"""
import requests
import json
import os
import subprocess
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/ti_feed_updater.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Конфигурация
WAZUH_LIST_PATH = "/var/ossec/etc/lists/"
OTX_API_KEY = os.environ.get("OTX_API_KEY", "")

# Публичные фиды (не требуют API ключей)
PUBLIC_FEEDS = {
    "abuse_ch_malware": {
        "url": "https://feodotracker.abuse.ch/downloads/ipblocklist.txt",
        "type": "ip",
        "comment": "AbuseCH Feodo Tracker - C2 IPs"
    },
    "abuse_ch_urlhaus": {
        "url": "https://urlhaus.abuse.ch/downloads/csv/",
        "type": "url",
        "comment": "AbuseCH URLhaus - Malware URLs"
    },
    "emergingthreats_compromised": {
        "url": "https://rules.emergingthreats.net/blockrules/compromised-ips.txt",
        "type": "ip",
        "comment": "Emerging Threats Compromised IPs"
    },
}

def fetch_feed(feed_name: str, feed_config: dict) -> list:
    """Получение IOC из фида"""
    logger.info(f"Fetching feed: {feed_name}")
    
    try:
        response = requests.get(
            feed_config["url"],
            timeout=30,
            headers={"User-Agent": "TI-Feed-Updater/1.0"}
        )
        response.raise_for_status()
        
        lines = response.text.split('\n')
        iocs = []
        
        for line in lines:
            line = line.strip()
            
            # Пропускаем комментарии и пустые строки
            if not line or line.startswith('#'):
                continue
            
            # Для CSV форматов — берём первое поле
            if ',' in line:
                line = line.split(',')[0].strip('"').strip()
            
            if line:
                iocs.append(line)
        
        logger.info(f"  Fetched {len(iocs)} IOC from {feed_name}")
        return iocs
        
    except requests.RequestException as e:
        logger.error(f"  Failed to fetch {feed_name}: {e}")
        return []

def update_wazuh_list(list_name: str, iocs: list, comment: str) -> bool:
    """Обновление CDB списка в Wazuh"""
    list_path = os.path.join(WAZUH_LIST_PATH, f"{list_name}.txt")
    
    try:
        with open(list_path, 'w') as f:
            f.write(f"# {comment}\n")
            f.write(f"# Updated: {datetime.utcnow().isoformat()}\n")
            f.write(f"# Count: {len(iocs)}\n")
            for ioc in iocs:
                f.write(f"{ioc}:{comment}\n")
        
        logger.info(f"  Updated {list_path} with {len(iocs)} entries")
        return True
    except IOError as e:
        logger.error(f"  Failed to write {list_path}: {e}")
        return False

def reload_wazuh_lists() -> bool:
    """Перезагрузка списков в Wazuh без перезапуска"""
    try:
        result = subprocess.run(
            ["/var/ossec/bin/wazuh-control", "reload"],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            logger.info("Wazuh lists reloaded successfully")
            return True
        else:
            logger.error(f"Wazuh reload failed: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"Failed to reload Wazuh: {e}")
        return False

def main():
    logger.info("=== Starting TI Feed Update ===")
    
    all_ips = []
    
    for feed_name, feed_config in PUBLIC_FEEDS.items():
        iocs = fetch_feed(feed_name, feed_config)
        
        if feed_config["type"] == "ip":
            all_ips.extend(iocs)
    
    # Дедупликация
    all_ips = list(set(all_ips))
    logger.info(f"Total unique IPs: {len(all_ips)}")
    
    # Запись в Wazuh
    if all_ips:
        update_wazuh_list(
            "ti_malicious_ips", 
            all_ips,
            "Malicious IPs from multiple TI feeds"
        )
    
    # Перезагрузка
    reload_wazuh_lists()
    
    logger.info("=== TI Feed Update Complete ===")

if __name__ == "__main__":
    main()
```

### Интеграция с Elastic SIEM (Elasticsearch)

```python
#!/usr/bin/env python3
"""
Загрузка IOC в Elasticsearch Threat Intel Index
"""
from elasticsearch import Elasticsearch, helpers
from datetime import datetime, timedelta
import hashlib
import json

ES_HOST = "http://localhost:9200"
TI_INDEX = ".ds-logs-ti_*"  # Elastic Threat Intel index

def create_es_client() -> Elasticsearch:
    return Elasticsearch([ES_HOST])

def ioc_to_elastic_doc(ioc_value: str, ioc_type: str, 
                        source: str, confidence: int) -> dict:
    """Конвертация IOC в формат Elastic Threat Intel"""
    
    # Elastic ожидает ECS-совместимый формат
    doc = {
        "@timestamp": datetime.utcnow().isoformat(),
        "event": {
            "category": "threat",
            "type": ["indicator"],
            "dataset": "ti.custom",
            "module": "threatintel",
        },
        "threat": {
            "feed": {
                "name": source,
                "dashboard_id": "custom-ti-feed"
            },
            "indicator": {
                "confidence": map_confidence(confidence),
                "first_seen": datetime.utcnow().isoformat(),
                "last_seen": datetime.utcnow().isoformat(),
                "type": ioc_type,
            }
        }
    }
    
    # Заполнение поля в зависимости от типа IOC
    if ioc_type == "ipv4-addr":
        doc["threat"]["indicator"]["ip"] = ioc_value
    elif ioc_type == "domain-name":
        doc["threat"]["indicator"]["domain"] = ioc_value
    elif ioc_type == "url":
        doc["threat"]["indicator"]["url"] = {"full": ioc_value}
    elif ioc_type == "file":
        doc["threat"]["indicator"]["file"] = {
            "hash": {"sha256": ioc_value}
        }
    
    return doc

def map_confidence(score: int) -> str:
    """Конвертация числового confidence в текстовый (Elastic формат)"""
    if score >= 85: return "High"
    if score >= 60: return "Medium"
    if score >= 30: return "Low"
    return "Not Specified"

def bulk_upload_iocs(es: Elasticsearch, iocs: list) -> dict:
    """Массовая загрузка IOC в Elasticsearch"""
    
    actions = []
    for ioc in iocs:
        doc = ioc_to_elastic_doc(
            ioc["value"], ioc["type"], 
            ioc.get("source", "custom"),
            ioc.get("confidence", 50)
        )
        
        actions.append({
            "_index": "logs-ti.custom-default",
            "_source": doc
        })
    
    success, failed = helpers.bulk(es, actions, raise_on_error=False)
    return {"success": success, "failed": len(failed)}

# Elasticsearch запрос для обогащения алертов через TI
ENRICH_QUERY = """
GET logs-*/_search
{
  "query": {
    "bool": {
      "filter": [
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  },
  "knn": {
    "field": "threat.indicator.ip",
    "query_vector": []
  }
}

// Либо через Elastic Threat Intel Match rule:
// 1. Security → Rules → Create new rule
// 2. Тип: Indicator Match
// 3. Index: logs-*
// 4. Indicator index: logs-ti.*
// 5. Map fields:
//    destination.ip → threat.indicator.ip
//    source.ip → threat.indicator.ip
//    dns.question.name → threat.indicator.domain
"""
```

---

## 5.3.9 Практические упражнения

### Упражнение 1: Сбор и анализ IOC из публичных фидов (45 мин)

```bash
# 1. Скачать список вредоносных IP от AbuseCH
curl -s "https://feodotracker.abuse.ch/downloads/ipblocklist.txt" \
  | grep -v "^#" \
  | head -20

# 2. Проверить один IP на VirusTotal
# Зарегистрироваться на virustotal.com и получить API ключ
export VT_KEY="YOUR_KEY"
IP="185.220.101.x"

curl -s "https://www.virustotal.com/api/v3/ip_addresses/${IP}" \
  -H "x-apikey: ${VT_KEY}" \
  | python3 -m json.tool | head -50

# 3. Проверить домен на OTX
# Установить: pip install OTXv2
python3 << 'PYEOF'
from OTXv2 import OTXv2, IndicatorTypes
import json

otx = OTXv2("YOUR_OTX_KEY")
result = otx.get_indicator_details_full(
    IndicatorTypes.DOMAIN, "example-malicious.com"
)
print(f"Pulse count: {result.get('pulse_info', {}).get('count', 0)}")
PYEOF
```

---

### Упражнение 2: Написание полного IOC-обогатителя (90 мин)

```python
#!/usr/bin/env python3
"""
ЗАДАНИЕ: Написать IOC Enricher
Скрипт должен:
1. Принимать список IOC из файла или stdin
2. Проверять каждый в VirusTotal и OTX
3. Вычислять итоговый риск-скор
4. Выводить результат в JSON или CSV

Структура для реализации:
"""
import argparse
import json
import csv
import sys
import time
from typing import List, Dict

class IOCEnricher:
    def __init__(self, vt_key: str, otx_key: str):
        self.vt_key = vt_key
        self.otx_key = otx_key
        self.results = []
    
    def enrich_single(self, ioc_value: str, ioc_type: str) -> Dict:
        """TODO: реализовать обогащение одного IOC"""
        result = {
            "value": ioc_value,
            "type": ioc_type,
            "risk_score": 0,
            "vt_malicious": 0,
            "otx_pulses": 0,
            "verdict": "UNKNOWN",
            "sources": [],
        }
        
        # TODO: Добавить вызов VT API
        # vt_data = self.check_vt(ioc_value, ioc_type)
        # result["vt_malicious"] = vt_data.get("malicious", 0)
        
        # TODO: Добавить вызов OTX API  
        # otx_data = self.check_otx(ioc_value, ioc_type)
        # result["otx_pulses"] = otx_data.get("pulse_count", 0)
        
        # TODO: Рассчитать итоговый risk_score по формуле:
        # risk_score = (vt_malicious * 5 + otx_pulses * 2) / 2
        # Нормализовать до 0-100
        
        # TODO: Определить verdict:
        # risk_score > 70 → MALICIOUS
        # risk_score > 40 → SUSPICIOUS  
        # risk_score > 0  → LOW_RISK
        # else            → CLEAN
        
        return result
    
    def enrich_list(self, iocs: List[Dict]) -> List[Dict]:
        """Обогащение списка IOC с учётом rate limiting"""
        for ioc in iocs:
            result = self.enrich_single(ioc["value"], ioc["type"])
            self.results.append(result)
            time.sleep(0.25)  # Rate limiting: 4 req/sec для VT free tier
        
        return self.results
    
    def export_json(self) -> str:
        return json.dumps(self.results, indent=2)
    
    def export_csv(self) -> str:
        if not self.results:
            return ""
        
        output = []
        writer_output = []
        fieldnames = list(self.results[0].keys())
        
        import io
        sio = io.StringIO()
        writer = csv.DictWriter(sio, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(self.results)
        return sio.getvalue()

def main():
    parser = argparse.ArgumentParser(description="IOC Enricher")
    parser.add_argument("--vt-key", required=True, help="VirusTotal API key")
    parser.add_argument("--otx-key", required=True, help="OTX API key")
    parser.add_argument("--input", help="Input file (JSON list of IOC)")
    parser.add_argument("--output-format", choices=["json", "csv"], 
                        default="json")
    args = parser.parse_args()
    
    # Загрузка IOC
    if args.input:
        with open(args.input) as f:
            iocs = json.load(f)
    else:
        # Читать из stdin в формате JSON
        iocs = json.load(sys.stdin)
    
    # Обогащение
    enricher = IOCEnricher(args.vt_key, args.otx_key)
    enricher.enrich_list(iocs)
    
    # Вывод
    if args.output_format == "json":
        print(enricher.export_json())
    else:
        print(enricher.export_csv())

# Пример input.json:
EXAMPLE_INPUT = """
[
  {"type": "ip", "value": "8.8.8.8"},
  {"type": "domain", "value": "google.com"},
  {"type": "hash", "value": "d41d8cd98f00b204e9800998ecf8427e"}
]
"""

if __name__ == "__main__":
    main()
```

---

### Упражнение 3: Настройка MISP (2 часа)

```bash
# Быстрая установка MISP через Docker

mkdir -p ~/misp-docker && cd ~/misp-docker

# Скачать docker-compose конфиг MISP
curl -o docker-compose.yml \
  "https://raw.githubusercontent.com/misp/misp-docker/main/docker-compose.yml"

# Запустить
docker-compose up -d

# Дождаться запуска (2-3 минуты)
docker-compose logs -f misp | grep "MISP is ready"

# MISP доступен на: https://localhost
# Логин: admin@admin.test / admin (изменить после первого входа!)

# Задания в MISP:
# 1. Создать организацию "My SOC Lab"
# 2. Создать новый Event: "Test Phishing Campaign"
# 3. Добавить IOC:
#    - IP: 185.234.x.x (type: ip-dst)
#    - Domain: evil-phish.xyz (type: domain)
#    - Hash: [хэш любого файла] (type: sha256)
# 4. Добавить теги TLP:AMBER и ATT&CK
# 5. Экспортировать в STIX 2.0 формате
# 6. Подключить публичный MISP feed:
#    Administration → Feeds → Add feed
#    URL: https://www.circl.lu/doc/misp/feed-osint/
```

---

## 📚 Ключевые ресурсы

| Ресурс | URL | Назначение |
|--------|-----|-----------|
| MISP Project | misp.github.io | Платформа обмена TI |
| AlienVault OTX | otx.alienvault.com | Публичный TI фид |
| AbuseCH | abuse.ch | Malware TI фиды |
| Feodo Tracker | feodotracker.abuse.ch | C2 IP списки |
| URLhaus | urlhaus.abuse.ch | Malware URL фиды |
| MITRE ATT&CK CTI | github.com/mitre/cti | STIX данные ATT&CK |
| OpenCTI | opencti.io | CTI платформа |
| STIX/TAXII | oasis-open.github.io/cti-documentation | Стандарты |

## 🔑 Ключевые понятия

| Термин | Определение |
|--------|-------------|
| CTI | Cyber Threat Intelligence |
| IOC | Indicator of Compromise — артефакт компрометации |
| IOA | Indicator of Attack — поведенческий индикатор атаки |
| TTP | Tactics, Techniques, Procedures |
| STIX | Стандарт описания угроз (JSON-based) |
| TAXII | Протокол транспортировки STIX данных |
| TLP | Traffic Light Protocol (маркировка чувствительности) |
| MISP | Malware Information Sharing Platform |
| Pulse | Набор IOC в OTX для конкретной угрозы |

---

## ✅ Итоги главы

После этой главы вы умеете:

- [x] Различать 4 типа TI и определять аудиторию каждого
- [x] Объяснить разницу IOC vs IOA и когда применять каждый подход
- [x] Использовать Pyramid of Pain для приоритизации индикаторов
- [x] Работать с VirusTotal API для проверки IOC
- [x] Взаимодействовать с MISP для хранения и обмена TI
- [x] Получать данные из публичных TI фидов
- [x] Понимать STIX/TAXII форматы и работать с ними
- [x] Интегрировать TI-фиды в Wazuh/Elastic SIEM

**Следующая глава:** 5.4 — Vulnerability Management и patch management

