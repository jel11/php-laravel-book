# Глава 9.1: GitHub-портфолио SOC-аналитика

## 🎯 Цели главы

- Понять, почему GitHub-портфолио критически важно при трудоустройстве в ИБ
- Научиться структурировать профиль GitHub для максимального впечатления на HR
- Знать, что именно должно содержать портфолио SOC-аналитика
- Уметь оформлять README репозиториев профессионально
- Понимать, что категорически нельзя публиковать на GitHub
- Начать вести портфолио с нуля, имея опыт PHP-разработки

---

## 1. Зачем GitHub-портфолио при трудоустройстве в ИБ

### 1.1 Реальность рынка ИБ без опыта

Представьте: вы PHP-разработчик с 3 годами опыта, который хочет перейти в кибербезопасность. У вас нет опыта работы в ИБ. HR видит сотни таких резюме. Что вас выделит?

```
БЕЗ ПОРТФОЛИО:
┌──────────────────────────────────────────┐
│ Иван Иванов                              │
│ "Хочу работать SOC-аналитиком"           │
│ Прошёл курсы: CEH, CompTIA Security+     │
│ Опыт: 3 года PHP разработки              │
└──────────────────────────────────────────┘
           ↓ HR думает:
    "Ещё один разработчик без опыта.
     Как понять, умеет ли он реально?"

С ПОРТФОЛИО:
┌──────────────────────────────────────────┐
│ Иван Иванов                              │
│ github.com/ivanivanov-sec                │
│ ├── siem-queries (42 звезды)             │
│ ├── malware-lab-writeups                 │
│ ├── yara-rules-collection               │
│ └── soc-automation-scripts              │
│ TryHackMe: Top 5%, 200+ комнат           │
└──────────────────────────────────────────┘
           ↓ HR думает:
    "Этот человек реально делает
     что-то в ИБ. Зовём на интервью."
```

### 1.2 Статистика: почему это работает

| Факт | Данные |
|------|--------|
| HR-специалисты смотрят GitHub | 73% технических HR в ИБ |
| Время просмотра профиля | 30-90 секунд первичный осмотр |
| Преимущество кандидата с портфолио | +40% вероятность собеседования |
| Разрыв в зарплате | +15-25% для кандидатов с сильным портфолио |

:::tip Принцип «Показывай, не рассказывай»
В ИБ ценится демонстрация навыков. Сертификат показывает, что вы сдали тест. Портфолио показывает, что вы умеете решать реальные задачи.
:::

### 1.3 Особенности для PHP-разработчика

Ваш PHP-опыт — это ПРЕИМУЩЕСТВО в ИБ, если правильно его подать:

| PHP-навык | ИБ-применение |
|----------|--------------|
| Анализ кода на уязвимости | Code review, SAST |
| Понимание HTTP, сессий, cookies | Веб-пентест, анализ трафика |
| Работа с базами данных | SQL injection анализ |
| Написание скриптов | Автоматизация SOC |
| Работа с API | Интеграция ИБ-инструментов |
| Понимание MVC/Laravel | Анализ веб-приложений |

---

## 2. Структура идеального профиля GitHub

### 2.1 Обзор ключевых элементов

```
github.com/your-username
├── 📄 Profile README.md       ← Первое, что видят
├── 📌 Pinned Repositories (6) ← Лучшие проекты
├── 📊 Contribution Graph      ← Активность
├── 🏆 Achievements            ← Автоматически
└── 📁 Repositories (20-50)   ← Весь контент
```

### 2.2 Имя пользователя и аватар

**Имя пользователя:**
- Профессиональное, легко запоминаемое
- Желательно: имя-фамилия или имя-sec/cyber
- Избегать: xXx_hacker_xXx, cooldev2007

```
Хорошие примеры:
  ivan-petrov-sec
  ipetrov-security
  ivanpetrov-soc

Плохие примеры:
  hakerivan228
  php_ninja_777
  anonymous_hacker
```

**Аватар:**
- Профессиональное фото ИЛИ нейтральный логотип
- Не аниме, не мемы, не логотипы хакерских группировок

### 2.3 Profile README.md

Специальный репозиторий `username/username` — его README отображается на главной странице профиля.

```markdown
<!-- Файл: github.com/ivan-petrov-sec/ivan-petrov-sec/README.md -->

# Привет, я Иван Петров 👋

## О себе

SOC-аналитик (Junior) | PHP-разработчик с 3+ годами опыта | 
Переход из разработки в кибербезопасность

Специализируюсь на:
- 🔍 Анализе вредоносного трафика (Wireshark, Zeek)
- 📊 Мониторинге безопасности (Splunk, ELK Stack)
- 🛡️ Разработке правил обнаружения (YARA, Sigma)
- 🐍 Автоматизации SOC-задач (Python, Bash)

## Сертификации и обучение

- 🎓 CompTIA Security+ (2024)
- 🏆 TryHackMe: SOC Level 1 Path — завершён
- 📚 Blue Team Labs Online — активно учусь

## Статистика TryHackMe

![TryHackMe Badge](https://tryhackme-badges.s3.amazonaws.com/username.png)

## Последние проекты

| Проект | Описание | Стек |
|--------|---------|------|
| [SIEM Queries](github.com/...) | Коллекция SPL/KQL запросов | Splunk, ELK |
| [SOC Scripts](github.com/...) | Автоматизация для SOC | Python, Bash |
| [YARA Rules](github.com/...) | Правила обнаружения малвари | YARA |

## Связь

[![LinkedIn](badge)](https://linkedin.com/in/...)
[![Email](badge)](mailto:...)
```

### 2.4 Pinned Repositories

Выберите 6 лучших репозиториев для закрепления. Принципы выбора:

```
Критерии выбора pinned репозиториев:
┌────────────────────────────────────────────────────┐
│ 1. Качество > Количество                            │
│    Лучше 1 хороший README, чем 10 пустых репо      │
│                                                    │
│ 2. Разнообразие навыков                            │
│    SIEM + Forensics + Scripting + CTF              │
│                                                    │
│ 3. Актуальность                                    │
│    Свежие коммиты (последние 3-6 месяцев)          │
│                                                    │
│ 4. Звёзды и форки                                  │
│    Полезный контент получает звёзды органически    │
└────────────────────────────────────────────────────┘
```

### 2.5 Contribution Graph (Green Squares)

HR и технические менеджеры смотрят на активность:

```
ХОРОШО: Регулярные коммиты
Jan ████████████████████████████████████ Dec
     (хотя бы 3-5 коммитов в неделю)

ПЛОХО: Всплески активности
Jan ...........................██████.... Dec
     (ощущение, что только перед собеседованием)
```

:::warning Не накручивайте коммиты
Создание пустых коммитов или коммиты типа "fix typo" каждый день выглядит неестественно. Реальная учёба генерирует естественные коммиты.
:::

---

## 3. Что должно быть в портфолио SOC-аналитика

### 3.1 Репозиторий SIEM-запросов

```
siem-queries/
├── README.md                    ← Обзор и навигация
├── splunk/
│   ├── README.md
│   ├── authentication/
│   │   ├── failed_logins.spl
│   │   ├── brute_force.spl
│   │   └── privilege_escalation.spl
│   ├── network/
│   │   ├── port_scan_detection.spl
│   │   ├── dns_tunneling.spl
│   │   └── beaconing.spl
│   └── malware/
│       ├── ransomware_indicators.spl
│       └── lateral_movement.spl
├── elk-kql/
│   ├── README.md
│   ├── windows_events/
│   │   ├── event_id_4625.kql    ← Failed logon
│   │   ├── event_id_4688.kql    ← Process creation
│   │   └── event_id_7045.kql    ← Service installation
│   └── network/
│       └── suspicious_connections.kql
└── sigma/
    ├── README.md
    ├── windows/
    │   ├── mimikatz_detection.yml
    │   └── psexec_detection.yml
    └── network/
        └── cobalt_strike_beacon.yml
```

**Пример файла запроса:**

```
# Файл: splunk/network/beaconing.spl
```

```splunk
| tstats count min(_time) as first_seen max(_time) as last_seen
    values(All_Traffic.dest_port) as ports
    from datamodel=Network_Traffic
    by All_Traffic.src_ip All_Traffic.dest_ip _time span=1h
| eval interval = last_seen - first_seen
| where count > 10 AND interval < 3600
| eval beacon_interval_avg = interval / count
| where beacon_interval_avg > 30 AND beacon_interval_avg < 600
| table src_ip dest_ip count beacon_interval_avg first_seen last_seen
| sort - count
| head 20
```

**Пример Sigma правила:**

```yaml
# Файл: sigma/network/cobalt_strike_beacon.yml
title: Cobalt Strike Beacon - Characteristic HTTP Pattern
id: 7f4a5c2e-8b1d-4e3f-9a6c-2d0e8f1b4a7c
status: experimental
description: >
  Detects Cobalt Strike beacon based on characteristic HTTP patterns
  including default Malleable C2 profile indicators
author: Ivan Petrov
date: 2024/01/15
tags:
  - attack.command_and_control
  - attack.t1071.001
logsource:
  category: proxy
  product: any
detection:
  selection:
    c-uri|contains:
      - '/jquery-3.3.1.min.js'
      - '/pixel.gif'
      - '/updates.rss'
      - '/__utm.gif'
  filter_legitimate:
    r-dns|contains:
      - 'jquery.com'
      - 'google.com'
  condition: selection and not filter_legitimate
falsepositives:
  - Legitimate jQuery CDN traffic
  - Legitimate analytics pixels
level: high
```

### 3.2 CTF Write-ups репозиторий

```
ctf-writeups/
├── README.md
├── 2024/
│   ├── picoctf-2024/
│   │   ├── forensics/
│   │   │   ├── shark-on-wire.md
│   │   │   └── disk-disk-sleuth.md
│   │   └── web/
│   │       └── sql-injection-basic.md
│   ├── hackthebox/
│   │   ├── machines/
│   │   │   ├── easy/
│   │   │   │   └── lame-writeup.md
│   │   │   └── medium/
│   │   │       └── blue-writeup.md
│   │   └── challenges/
│   │       └── forensics/
│   └── tryhackme/
│       └── rooms/
│           ├── blue-room-writeup.md
│           └── ice-writeup.md
└── templates/
    └── writeup-template.md
```

**Пример Write-up:**

```markdown
# TryHackMe: Blue Room — Write-up

**Дата:** 2024-01-20  
**Сложность:** Easy  
**Категория:** Windows Exploitation  
**Рейтинг:** ⭐⭐⭐⭐

## Задача

Эксплуатировать уязвимую машину Windows 7 и получить флаги.

## Разведка

### Nmap сканирование

```bash
nmap -sV -sC -A -T4 10.10.x.x -oN blue_nmap.txt
```

Результаты:
- 135/tcp — msrpc
- 139/tcp — netbios-ssn  
- 445/tcp — microsoft-ds (Windows 7)
- 3389/tcp — rdp

**Ключевое наблюдение:** Порт 445 открыт на Windows 7 — 
потенциально уязвима к MS17-010 (EternalBlue).

## Эксплуатация

Проверяем уязвимость:

```bash
nmap --script smb-vuln-ms17-010 10.10.x.x
```

Вывод подтверждает VULNERABLE to MS17-010.

## Флаги

- Flag 1: `THM{...}` — в директории C:\Users\Jon\Desktop
- Flag 2: `THM{...}` — в реестре

## Выводы

Урок: Непропатченные системы Windows 7/Server 2008 
уязвимы к EternalBlue даже в 2024 году. 
Event ID для детектирования: 4624 (анонимный логон), 
5145 (сетевой доступ к файлам).

## MITRE ATT&CK

- T1210 — Exploitation of Remote Services
- T1078 — Valid Accounts (после получения доступа)
```

### 3.3 Скрипты для автоматизации SOC

```
soc-automation-scripts/
├── README.md
├── python/
│   ├── requirements.txt
│   ├── ip_enrichment.py        ← Обогащение IoC через VirusTotal API
│   ├── log_parser.py           ← Парсинг логов Windows/Linux
│   ├── pcap_ioc_extractor.py   ← Извлечение IoC из PCAP
│   ├── phishing_analyzer.py    ← Анализ фишинговых писем
│   └── alert_correlator.py    ← Корреляция алертов
├── bash/
│   ├── collect_artifacts.sh    ← Сбор артефактов при инциденте
│   ├── network_baseline.sh     ← Базовый анализ сети
│   └── log_collector.sh        ← Сбор логов
└── powershell/
    ├── event_log_collector.ps1
    └── process_tree.ps1
```

**Пример скрипта:**

```python
#!/usr/bin/env python3
"""
ip_enrichment.py — Обогащение IP-адресов через публичные API

Использование:
  python3 ip_enrichment.py -f iocs.txt
  python3 ip_enrichment.py -i 1.2.3.4

Автор: Ivan Petrov
GitHub: github.com/ivan-petrov-sec
"""

import argparse
import json
import time
import requests
from datetime import datetime


def check_virustotal(ip: str, api_key: str) -> dict:
    """Проверяет IP через VirusTotal API v3"""
    url = f"https://www.virustotal.com/api/v3/ip_addresses/{ip}"
    headers = {"x-apikey": api_key}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            stats = data['data']['attributes']['last_analysis_stats']
            return {
                'source': 'VirusTotal',
                'malicious': stats.get('malicious', 0),
                'suspicious': stats.get('suspicious', 0),
                'harmless': stats.get('harmless', 0),
                'country': data['data']['attributes'].get('country', 'Unknown')
            }
    except Exception as e:
        return {'source': 'VirusTotal', 'error': str(e)}
    
    return {'source': 'VirusTotal', 'error': f'HTTP {response.status_code}'}


def check_abuseipdb(ip: str, api_key: str) -> dict:
    """Проверяет IP через AbuseIPDB API"""
    url = "https://api.abuseipdb.com/api/v2/check"
    params = {'ipAddress': ip, 'maxAgeInDays': 90}
    headers = {'Key': api_key, 'Accept': 'application/json'}
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()['data']
            return {
                'source': 'AbuseIPDB',
                'abuse_confidence': data.get('abuseConfidenceScore', 0),
                'total_reports': data.get('totalReports', 0),
                'country': data.get('countryCode', 'Unknown'),
                'isp': data.get('isp', 'Unknown')
            }
    except Exception as e:
        return {'source': 'AbuseIPDB', 'error': str(e)}


def enrich_ip(ip: str, vt_key: str = None, abuse_key: str = None) -> dict:
    """Обогащает один IP через все доступные источники"""
    result = {
        'ip': ip,
        'timestamp': datetime.utcnow().isoformat(),
        'results': []
    }
    
    if vt_key:
        result['results'].append(check_virustotal(ip, vt_key))
        time.sleep(0.5)  # Rate limiting
    
    if abuse_key:
        result['results'].append(check_abuseipdb(ip, abuse_key))
    
    # Общий вердикт
    malicious_count = sum(
        r.get('malicious', 0) + r.get('abuse_confidence', 0) // 50
        for r in result['results']
    )
    result['verdict'] = 'MALICIOUS' if malicious_count > 0 else 'CLEAN'
    
    return result


def main():
    parser = argparse.ArgumentParser(description='IP Enrichment Tool для SOC')
    parser.add_argument('-i', '--ip', help='Один IP-адрес')
    parser.add_argument('-f', '--file', help='Файл со списком IP')
    parser.add_argument('--vt-key', help='VirusTotal API ключ', 
                       default=None)
    parser.add_argument('--abuse-key', help='AbuseIPDB API ключ',
                       default=None)
    args = parser.parse_args()
    
    ips = []
    if args.ip:
        ips = [args.ip]
    elif args.file:
        with open(args.file) as f:
            ips = [line.strip() for line in f if line.strip()]
    
    results = []
    for ip in ips:
        print(f"[*] Проверяем: {ip}")
        result = enrich_ip(ip, args.vt_key, args.abuse_key)
        results.append(result)
        print(f"    Вердикт: {result['verdict']}")
    
    # Сохраняем результаты
    output_file = f"enrichment_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n[+] Результаты сохранены в: {output_file}")


if __name__ == '__main__':
    main()
```

### 3.4 Лабораторные работы (Wireshark, Volatility)

```
lab-reports/
├── README.md
├── network-forensics/
│   ├── lab01-pcap-analysis/
│   │   ├── README.md           ← Описание задачи
│   │   ├── methodology.md      ← Методология
│   │   ├── findings.md         ← Результаты
│   │   └── screenshots/        ← Скриншоты Wireshark
│   └── lab02-dns-tunneling/
│       └── ...
└── memory-forensics/
    ├── lab01-volatility-basics/
    │   ├── README.md
    │   ├── commands.sh         ← Команды Volatility
    │   └── findings.md
    └── lab02-malware-analysis/
        └── ...
```

### 3.5 YARA/Sigma правила

```
detection-rules/
├── README.md
├── yara/
│   ├── malware/
│   │   ├── generic_shellcode.yar
│   │   ├── ransomware_patterns.yar
│   │   └── webshell_detection.yar
│   └── tools/
│       ├── mimikatz.yar
│       └── cobalt_strike.yar
└── sigma/
    ├── windows/
    │   ├── process_injection.yml
    │   └── credential_access.yml
    └── network/
        └── data_exfiltration.yml
```

**Пример YARA правила:**

```yara
/*
   Правило: WebShell_Generic_PHP
   Автор: Ivan Petrov
   Дата: 2024-01-15
   Описание: Обнаружение типичных PHP веб-шеллов
   Теги: webshell, php, backdoor
*/

rule WebShell_Generic_PHP {
    meta:
        description = "Generic PHP webshell detection"
        author = "Ivan Petrov"
        date = "2024-01-15"
        severity = "high"
        reference = "https://github.com/ivan-petrov-sec/detection-rules"
    
    strings:
        // Классические функции выполнения команд
        $exec_func1 = "eval(" nocase
        $exec_func2 = "system(" nocase
        $exec_func3 = "passthru(" nocase
        $exec_func4 = "shell_exec(" nocase
        $exec_func5 = "proc_open(" nocase
        
        // Обфускация
        $obfusc1 = "base64_decode" nocase
        $obfusc2 = "str_rot13" nocase
        $obfusc3 = "gzuncompress" nocase
        $obfusc4 = "gzinflate" nocase
        
        // Параметры из GET/POST
        $input1 = "$_GET[" nocase
        $input2 = "$_POST[" nocase
        $input3 = "$_REQUEST[" nocase
        
    condition:
        filesize < 1MB and
        (
            // eval + input + obfuscation = high confidence
            ($exec_func1 and any of ($input*) and any of ($obfusc*)) or
            // Multiple exec functions with user input
            (2 of ($exec_func*) and any of ($input*))
        )
}
```

---

## 4. Как оформить README репозитория

### 4.1 Структура профессионального README

```markdown
# Название репозитория

<!-- Badges -->
![GitHub last commit](https://img.shields.io/github/last-commit/user/repo)
![GitHub stars](https://img.shields.io/github/stars/user/repo)
![License](https://img.shields.io/badge/license-MIT-blue)

## Краткое описание (1-2 предложения)

Что это, зачем, для кого.

## Содержание

- [Установка](#установка)
- [Использование](#использование)  
- [Примеры](#примеры)
- [Структура](#структура)

## Требования

- Python 3.8+
- Зависимости: requests, scapy

## Установка

```bash
git clone https://github.com/user/repo
pip install -r requirements.txt
```

## Использование

```bash
python script.py --help
```

## Примеры

```bash
# Пример 1: Основное использование
python script.py -i 1.2.3.4

# Пример 2: Файл с IP-адресами
python script.py -f ips.txt --vt-key YOUR_KEY
```

## Скриншоты

![Пример вывода](screenshots/output.png)

## Лицензия

MIT License — подробнее в [LICENSE](LICENSE)
```

### 4.2 Badges и визуальные элементы

```markdown
<!-- Технологии и инструменты -->
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![Splunk](https://img.shields.io/badge/Splunk-000000?style=flat&logo=splunk&logoColor=white)
![Wireshark](https://img.shields.io/badge/Wireshark-1679A7?style=flat&logo=wireshark&logoColor=white)

<!-- Статусы -->
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Tests](https://img.shields.io/badge/tests-12%20passed-green)
![Maintenance](https://img.shields.io/badge/Maintained-Yes-green)

<!-- Безопасность -->
![YARA](https://img.shields.io/badge/YARA-rules-red)
![Sigma](https://img.shields.io/badge/Sigma-rules-orange)
```

---

## 5. Пример идеального README для SOC-портфолио

```markdown
# SOC Analyst Portfolio — Ivan Petrov

![Profile Views](https://komarev.com/ghpvc/?username=ivan-petrov-sec)
![TryHackMe](https://img.shields.io/badge/TryHackMe-Top5%25-red)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue)](https://linkedin.com/in/ivanpetrov)

## Кто я

PHP-разработчик с 3+ годами опыта, перехожу в кибербезопасность
с фокусом на SOC-аналитику и Blue Team.

**Текущий стек:** Splunk • ELK Stack • Wireshark • Volatility • 
Python • YARA • Sigma

## Навыки

| Область | Инструменты |
|---------|------------|
| SIEM | Splunk (SPL), ELK (KQL), Graylog |
| Network Analysis | Wireshark, Zeek, Suricata |
| Memory Forensics | Volatility 3, Rekall |
| Threat Detection | YARA, Sigma, Snort rules |
| Scripting | Python 3, Bash, PowerShell |
| Frameworks | MITRE ATT&CK, NIST CSF |

## Репозитории

### 🔎 [siem-queries](github.com/ivan-petrov-sec/siem-queries)
Коллекция из 50+ запросов Splunk SPL и ELK KQL для детектирования 
угроз. Охватывает lateral movement, C2, brute force, exfiltration.

### 📡 [pcap-analysis-labs](github.com/ivan-petrov-sec/pcap-analysis-labs)  
Лабораторные работы по анализу вредоносного трафика. 
Включает анализ реальных образцов с malware-traffic-analysis.net

### 🛡️ [yara-sigma-rules](github.com/ivan-petrov-sec/yara-sigma-rules)
Авторские правила обнаружения: 20 YARA правил, 15 Sigma правил.
Покрытие: веб-шеллы, RAT, ransomware, инструменты red team.

### 🤖 [soc-automation](github.com/ivan-petrov-sec/soc-automation)
Python-скрипты для автоматизации рутинных SOC-задач:
обогащение IoC, парсинг логов, анализ фишинга.

### 🚩 [ctf-writeups](github.com/ivan-petrov-sec/ctf-writeups)
Разборы CTF-задач с подробным объяснением методологии.
Платформы: TryHackMe, HackTheBox, PicoCTF.

## Активность

<!--START_SECTION:activity-->
- Добавил 3 новых Sigma правила для детектирования Cobalt Strike
- Написал write-up по комнате TryHackMe "Advent of Cyber"  
- Опубликовал скрипт анализа DNS-туннелирования
<!--END_SECTION:activity-->

## Сертификации

- CompTIA Security+ (SY0-701) — 2024
- TryHackMe SOC Level 1 — завершён (2024)
- Blue Team Labs Online — в процессе

## Контакт

- Email: ivan@example.com
- LinkedIn: [linkedin.com/in/ivanpetrov](...)
- Telegram: @ivanpetrov_sec
```

---

## 6. Что НЕ надо публиковать на GitHub

:::danger Это может стоить вам карьеры
Публикация определённых материалов на GitHub может привести к отказу всех работодателей, юридическим последствиям и блокировке аккаунта.
:::

### 6.1 Запрещённый контент

| Категория | Примеры | Причина |
|---------|---------|---------|
| Готовые эксплойты для актуальных CVE | EternalBlue.py, Log4Shell exploit | Нарушение законодательства |
| Реальные данные из CTF/лабораторий | Флаги, дампы реальных систем | Нарушение условий платформ |
| Credentials и API ключи | Ключи VirusTotal, пароли в коде | Безопасность, компрометация |
| Вредоносное ПО (готовое к запуску) | Ransomware, RAT без детонации | Юридические последствия |
| Данные реальных жертв | IP из реальных атак, PII | Конфиденциальность, законы |
| Инструменты для DDoS | Botnet код, stresser | Уголовная ответственность |

### 6.2 Безопасная публикация инструментов безопасности

```python
# ПЛОХО: Credentials прямо в коде
VT_API_KEY = "abc123def456..."
SHODAN_KEY = "xyz789..."

# ХОРОШО: Через переменные окружения
import os
VT_API_KEY = os.environ.get('VT_API_KEY')
SHODAN_KEY = os.environ.get('SHODAN_KEY')

# В файле .env (не коммитить!)
VT_API_KEY=abc123def456
SHODAN_KEY=xyz789
```

```gitignore
# .gitignore — обязателен в каждом репозитории
.env
*.key
secrets.py
credentials.json
config.local.py

# Не публиковать реальные PCAP файлы
*.pcap
*.pcapng
# Только если не учебные без персональных данных

# Дампы памяти
*.dmp
*.raw
*.mem
```

:::tip Используйте GitHub Secret Scanning
GitHub автоматически сканирует коммиты на наличие ключей API (AWS, Google, GitHub tokens). Но это работает только для известных форматов — не полагайтесь только на это.
:::

---

## 7. Как документировать лабораторные работы

### 7.1 Obsidian для локальных заметок

```
Obsidian Vault структура для ИБ:
vault/
├── 00-Templates/
│   ├── Lab-Report-Template.md
│   ├── CTF-Writeup-Template.md
│   └── Incident-Report-Template.md
├── 01-Learning/
│   ├── TryHackMe/
│   ├── HackTheBox/
│   └── Courses/
├── 02-Labs/
│   ├── Network-Forensics/
│   └── Memory-Forensics/
├── 03-CTF/
│   ├── 2024-PicoCTF/
│   └── 2024-HTB-CTF/
├── 04-IoC-Database/
│   ├── IPs/
│   ├── Domains/
│   └── Hashes/
└── 05-Templates/
```

### 7.2 Шаблон лабораторного отчёта

```markdown
---
дата: {{date}}
лаборатория: [название]
платформа: TryHackMe/HTB/Самостоятельная
сложность: Easy/Medium/Hard
теги: [network, forensics, malware]
статус: Завершено/В процессе
---

# Lab: [Название]

## Цель

Что нужно сделать, что изучить.

## Среда

- ОС: Kali Linux 2024.1
- Инструменты: Wireshark 4.x, Volatility 3
- Стенд: TryHackMe AttackBox

## Методология

Шаг за шагом что делал, включая неудачные попытки.

## Команды

```bash
# Команда 1
volatility3 -f memory.dmp windows.pslist.PsList

# Команда 2
tshark -r traffic.pcap -q -z io,phs
```

## Результаты

| Артефакт | Значение | Интерпретация |
|---------|---------|--------------|
| Процесс | svchost.exe PID:4321 | Подозрительный путь |
| IP | 185.x.x.x | C2 сервер |

## Выводы

Что узнал, какие навыки отработал.

## Ссылки

- [Документация Volatility](...)
- [MITRE ATT&CK T1055](...)
```

### 7.3 GitHub Wiki для долгосрочной документации

```
Репозиторий: security-knowledge-base
GitHub Wiki:
├── Home.md
├── Tools/
│   ├── Wireshark.md
│   ├── Volatility.md
│   └── Splunk.md
├── Techniques/
│   ├── Network-Analysis.md
│   └── Memory-Forensics.md
└── References/
    ├── Event-IDs.md
    └── MITRE-ATT&CK.md
```

---

## 8. Commit History как доказательство активности

### 8.1 Правила хороших коммит-сообщений

```bash
# ПЛОХО: Ничего не говорит
git commit -m "update"
git commit -m "fix"
git commit -m "changes"

# ХОРОШО: Конкретно и информативно
git commit -m "add Splunk SPL query for detecting RDP brute force (Event ID 4625)"
git commit -m "add YARA rule for detecting PHP webshells with base64 obfuscation"
git commit -m "update beaconing detection script: add Cobalt Strike default intervals"
git commit -m "fix: ip_enrichment.py rate limiting for VirusTotal free tier"
git commit -m "docs: add writeup for TryHackMe Blue room with MITRE mapping"
```

### 8.2 Conventional Commits для ИБ-портфолио

```
Формат: <тип>: <описание>

Типы для ИБ-портфолио:
  feat:    Новое правило, скрипт, writeup
  fix:     Исправление в существующем коде/правиле
  docs:    Обновление документации, README
  lab:     Результаты лабораторной работы
  ctf:     CTF writeup или решение
  rule:    YARA/Sigma/Snort правило
  query:   SIEM запрос (SPL/KQL)
  chore:   Служебные изменения

Примеры:
  feat: add sigma rule for detecting Pass-the-Hash with NTLM
  lab: complete TryHackMe Volatility memory forensics lab
  ctf: writeup for PicoCTF 2024 forensics - wireshark-two
  query: add Splunk SPL for detecting DNS tunneling (high entropy)
  rule: YARA rule for Cobalt Strike reflective DLL injection
```

### 8.3 Планирование коммитов на неделю

```
Пример учебного расписания с регулярными коммитами:

Понедельник:
  🔵 TryHackMe комната → commit: "lab: complete THM room X"
  
Вторник:
  🔵 Новый Sigma/YARA правило → commit: "rule: add detection for Y"
  
Среда:
  🔵 SIEM запрос → commit: "query: Splunk SPL for Z attack"
  
Четверг:
  🔵 Скрипт автоматизации → commit: "feat: script for IoC enrichment"
  
Пятница:
  🔵 Write-up задачи → commit: "ctf: writeup for HTB machine A"
  
Суббота/Воскресенье:
  🔵 Обновление README, документация
  🔵 Новая лабораторная работа
```

---

## 📝 Практическое задание

### Создание базовой структуры портфолио

**Шаг 1: Настройка GitHub профиля**

```bash
# 1. Создайте репозиторий username/username на GitHub
# 2. Клонируйте его

git clone https://github.com/YOUR_USERNAME/YOUR_USERNAME.git
cd YOUR_USERNAME

# 3. Создайте README профиля
cat > README.md << 'EOF'
# Привет! Я [Ваше Имя] 👋

[Ваша специализация] | Переход в кибербезопасность

## О себе
[2-3 предложения о вашем пути]

## Навыки
- [Навык 1]
- [Навык 2]

## В процессе изучения
- [ ] SIEM (Splunk/ELK)
- [ ] Network Forensics
- [ ] Memory Analysis

## Контакт
- LinkedIn: [ссылка]
EOF

git add README.md
git commit -m "init: add profile README"
git push
```

**Шаг 2: Создание основных репозиториев**

```bash
# Создайте через GitHub UI или API следующие репозитории:
# 1. siem-queries
# 2. ctf-writeups  
# 3. soc-automation-scripts
# 4. detection-rules
# 5. lab-reports

# Минимальная структура для каждого:
mkdir -p siem-queries/{splunk,elk-kql,sigma}
cat > siem-queries/README.md << 'EOF'
# SIEM Queries Collection

Коллекция запросов для SIEM систем, написанных в процессе
обучения и лабораторных работ.

## Содержание

- [Splunk SPL](splunk/) - X запросов
- [ELK KQL](elk-kql/) - X запросов  
- [Sigma Rules](sigma/) - X правил

## Категории

- Authentication anomalies
- Network scanning detection
- Lateral movement
- C2 communication
- Data exfiltration
EOF
```

**Шаг 3: Первый реальный контент**

Добавьте хотя бы один реальный запрос:

```bash
cat > siem-queries/splunk/auth/failed_login_detection.spl << 'EOF'
/*
  Название: Failed Login Detection (Brute Force)
  Описание: Обнаружение множественных неудачных попыток входа
  Event ID: 4625 (Windows), auth.log (Linux)
  MITRE ATT&CK: T1110 - Brute Force
  Автор: [Ваше имя]
  Дата: [Дата]
*/

index=windows EventCode=4625
| bin span=5m _time
| stats count as failures by _time, src_ip, user
| where failures > 10
| sort -failures
| table _time, src_ip, user, failures
| rename src_ip as "Источник", user as "Пользователь", failures as "Неудачных попыток"
EOF

git add .
git commit -m "query: add Splunk SPL for brute force detection (Event ID 4625)"
git push
```

**Чеклист готовности портфолио:**

```
[ ] GitHub профиль с фото/аватаром
[ ] README профиля создан
[ ] Минимум 4 репозитория с README
[ ] В каждом репозитории хотя бы 1 реальный файл
[ ] Правильный .gitignore везде
[ ] Первые коммиты с правильными сообщениями
[ ] Нет credentials в коде
[ ] GitHub profile pinned 4-6 репозиториев
```

:::tip Портфолио — это марафон, не спринт
Начните с малого, но делайте регулярно. Через 3 месяца ежедневной работы у вас будет 90+ коммитов и несколько хороших репозиториев — этого достаточно для первого собеседования на Junior SOC.
:::

---

## 📚 Итоги

В этой главе мы разобрали:

| Тема | Ключевой вывод |
|------|---------------|
| Зачем портфолио | 73% HR смотрят GitHub; это доказательство навыков |
| Структура профиля | README + 6 закреплённых репо + регулярные коммиты |
| Содержание | SIEM-запросы, write-ups, скрипты, правила детектирования |
| Оформление README | Badges, таблицы, примеры кода, скриншоты |
| Что не публиковать | Эксплойты, credentials, реальные данные жертв |
| Документирование | Obsidian локально + GitHub Wiki публично |
| Коммиты | Conventional commits, осмысленные сообщения, регулярность |

**Следующий шаг:** Создайте профиль GitHub прямо сейчас и сделайте первый коммит — даже если это просто README с вашим именем и целями. Важно начать.

---

*← [Глава 8.4: Анализ вредоносного трафика на PCAP](../part-8/chapter-8-4.md) | [Глава 9.2: TryHackMe, CTF и публичный профиль →](chapter-9-2.md)*
