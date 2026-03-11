# Глава 15.3: Responsible Disclosure и первые находки

## 🎯 Цели главы

- Понять принципы Responsible Disclosure (ответственного раскрытия)
- Освоить протокол CVD (Coordinated Vulnerability Disclosure)
- Научиться действовать при нахождении уязвимости вне программы Bug Bounty
- Изучить реальные примеры первых находок начинающих исследователей
- Понять юридические аспекты и границы безопасного исследования
- Построить стратегию первых шагов в Bug Bounty

---

## 15.3.1 Что такое Responsible Disclosure

### Определение и история

**Responsible Disclosure** (Ответственное раскрытие) — это практика, при которой исследователь безопасности, обнаруживший уязвимость, сообщает о ней напрямую затронутой организации, давая ей время на исправление, прежде чем информация станет публичной.

```
ЭВОЛЮЦИЯ ПОЛИТИК РАСКРЫТИЯ:

1990-е: Полное молчание (Full Silence)
└── Вообще не раскрывать. Никому.
    Результат: уязвимости не исправлялись.

1990-е: Полное немедленное раскрытие (Full Disclosure)
└── Опубликовать сразу. Пусть компания горит.
    Результат: пользователи под угрозой пока патч не выйдет.

2000-е: Responsible Disclosure
└── Уведомить компанию, дать разумное время (90 дней), затем раскрыть.
    Результат: уязвимости исправляются, потом публикуются.

2010-е+: Coordinated Vulnerability Disclosure (CVD)
└── Стандартизированный процесс. ISO/IEC 29147.
    CERT/CISA активно участвуют в координации.
```

### Три стороны раскрытия

```
УЧАСТНИКИ RESPONSIBLE DISCLOSURE:

1. ИССЛЕДОВАТЕЛЬ (Finder/Reporter)
   ├── Находит уязвимость
   ├── Уведомляет вендора
   └── Ждёт разумное время → раскрывает публично

2. ВЕНДОР (Affected Party)
   ├── Получает уведомление
   ├── Подтверждает и исправляет
   ├── Выпускает патч/обновление
   └── (Опционально) вознаграждает исследователя

3. КООРДИНАТОР (необязательно)
   ├── CERT/CC, CISA, ENISA
   ├── Помогает при отказе вендора взаимодействовать
   └── Может помочь с CVE ID
```

### Стандартные сроки раскрытия

```
ВРЕМЕННЫЕ РАМКИ:

Google Project Zero: 90 дней + 14 дней на критические
CERT/CC: 45 дней
Общая практика: 90 дней
Минимум: 30 дней (только для критических)

TIMELINE:

День 0:   Исследователь находит уязвимость
День 1:   Отправка уведомления вендору
День 7:   Ожидание подтверждения получения
          Если нет ответа → эскалация (CERT, другой канал)
День 30:  Промежуточный статус от вендора
День 90:  Дедлайн патча
День 91:  Публичное раскрытие (с или без исправления)

ИСКЛЮЧЕНИЯ:
├── Если патч выпущен раньше → раскрыть раньше (с вендором)
└── Если активная эксплуатация → сократить timeline
```

---

## 15.3.2 Coordinated Vulnerability Disclosure (CVD)

### ISO/IEC 29147 — стандарт CVD

```
ISO/IEC 29147: Vulnerability Disclosure
(Публичный стандарт, бесплатный)

КЛЮЧЕВЫЕ ПРИНЦИПЫ:

1. ДОБРОСОВЕСТНОСТЬ (Good Faith)
   └── Обе стороны действуют честно

2. ЗАЩИТА ПОЛЬЗОВАТЕЛЕЙ
   └── Цель — защита, не слава или деньги

3. СВОЕВРЕМЕННОСТЬ
   └── Разумные сроки для всех сторон

4. ПРОПОРЦИОНАЛЬНОСТЬ
   └── Публичность пропорциональна серьёзности

5. ПРОЗРАЧНОСТЬ
   └── Чёткая коммуникация о процессе и сроках
```

### Как уведомить вендора (шаг за шагом)

```python
#!/usr/bin/env python3
"""
disclosure_checklist.py — чеклист ответственного раскрытия
"""

DISCLOSURE_CHECKLIST = {
    "before_contacting": [
        "Убедиться что уязвимость реальная (воспроизводимый PoC)",
        "Убедиться что это в scope тестирования (разрешено законом)",
        "Не эксплуатировать уязвимость глубже чем необходимо для PoC",
        "Не получать доступ к данным реальных пользователей",
        "Убедиться что у вас есть доказательства (скриншоты, запросы)",
        "Оценить критичность по CVSS",
        "Найти правильный контакт вендора (security@, HackerOne, etc.)"
    ],

    "finding_contact": [
        "Проверить security.txt: https://example.com/.well-known/security.txt",
        "Проверить https://example.com/security",
        "Поискать 'security@example.com' или 'vulnerabilities@example.com'",
        "Найти на HackerOne или Bugcrowd (если есть программа)",
        "Найти CISO/CSO на LinkedIn",
        "Найти disclosure contact на CERT базе (для КИИ)",
        "Последний вариант: support@example.com с темой SECURITY"
    ],

    "initial_email_content": [
        "Краткое описание уязвимости (без технических деталей в первом письме)",
        "Тип уязвимости (XSS, SQLi, и т.д.)",
        "URL/компонент затронутой системы",
        "Потенциальный impact (высокоуровневый)",
        "Ваши контактные данные",
        "PGP ключ если есть (для зашифрованной коммуникации)",
        "Ваш дедлайн: 'Планирую опубликовать через 90 дней'"
    ],

    "while_waiting": [
        "Не публиковать информацию в соцсетях",
        "Не обсуждать с посторонними",
        "Если нет ответа 7 дней — отправить напоминание",
        "Если нет ответа 14 дней — обратиться в CERT/CISA",
        "Фиксировать всю коммуникацию с датами"
    ],

    "after_patch": [
        "Проверить что патч действительно исправляет уязвимость",
        "Договориться о дате публичного раскрытия с вендором",
        "Подготовить advisory с деталями",
        "Опубликовать на: полный write-up, возможно CVE",
        "Поблагодарить вендора за оперативную реакцию"
    ]
}

def print_checklist():
    for stage, items in DISCLOSURE_CHECKLIST.items():
        print(f"\n{'='*50}")
        print(f"STAGE: {stage.upper().replace('_', ' ')}")
        print(f"{'='*50}")
        for i, item in enumerate(items, 1):
            print(f"  {i}. {item}")
```

### Шаблон уведомления об уязвимости

```
ШАБЛОН ПЕРВОГО ПИСЬМА ВЕНДОРУ:

От: your.name@email.com
Кому: security@company.com
Тема: [Security Disclosure] Уязвимость в [Компонент] — [Тип]
-----------------------------------------------------------------

Здравствуйте,

Меня зовут [Имя], я независимый исследователь безопасности.

В ходе добросовестного исследования безопасности вашего сервиса
мной была обнаружена уязвимость, которую хочу сообщить в рамках
ответственного раскрытия.

КРАТКАЯ ИНФОРМАЦИЯ:
• Тип уязвимости: [XSS / SQLi / IDOR / etc.]
• Компонент: [URL или функция]
• Критичность: [High/Critical — предварительная оценка]
• Влияние: [Краткое описание impact]

Я намеренно воздержался от эксплуатации уязвимости глубже,
чем необходимо для подтверждения её существования.

Прошу подтвердить получение этого письма в течение 7 рабочих дней.
После подтверждения я готов предоставить полный технический отчёт
с Proof of Concept.

В соответствии с политикой ответственного раскрытия, я планирую
опубликовать информацию об уязвимости через 90 дней с момента
отправки данного уведомления (или раньше, если патч будет выпущен).

Буду рад обсудить детали и помочь в процессе исправления.

С уважением,
[Ваше имя]
[Email]
[PGP Public Key — если есть]
[Ссылка на GitHub / LinkedIn — опционально]
-----------------------------------------------------------------
```

### security.txt — стандарт поиска контакта

```
RFC 9116: A File Format to Aid in Security Vulnerability Reporting
(security.txt — стандарт 2022 года)

Расположение:
└── https://example.com/.well-known/security.txt

Пример файла security.txt (Google):
──────────────────────────────────────
Contact: https://g.co/vulnz
Expires: 2025-01-01T00:00:00.000Z
Encryption: https://services.google.com/kb/6539
Acknowledgments: https://bughunters.google.com/about/rules/6625378258649088/google-and-alphabet-vulnerability-reward-program-rules
Preferred-Languages: en
Policy: https://g.co/vulnz
──────────────────────────────────────

Как проверить через curl:
curl https://example.com/.well-known/security.txt
```

```python
#!/usr/bin/env python3
"""
check_security_txt.py — поиск контакта для раскрытия
"""

import requests
import re
from urllib.parse import urlparse

def find_disclosure_contact(domain: str) -> dict:
    """
    Находит контакт для security disclosure
    """
    contacts = {}
    base_url = f"https://{domain}"

    # 1. Проверяем security.txt
    for path in ["/.well-known/security.txt", "/security.txt"]:
        try:
            resp = requests.get(f"{base_url}{path}", timeout=10)
            if resp.status_code == 200 and "contact" in resp.text.lower():
                contacts["security_txt"] = resp.text
                # Парсим Contact поля
                contact_lines = re.findall(r"^Contact:\s*(.+)$", resp.text,
                                          re.MULTILINE | re.IGNORECASE)
                contacts["contacts"] = contact_lines
                break
        except:
            pass

    # 2. Проверяем /security страницу
    for path in ["/security", "/responsible-disclosure", "/vulnerability-disclosure"]:
        try:
            resp = requests.get(f"{base_url}{path}", timeout=10, allow_redirects=True)
            if resp.status_code == 200:
                contacts["security_page"] = f"{base_url}{path}"
                # Ищем email в тексте
                emails = re.findall(r"security[\@\-\.][a-z0-9@\.\-]+", resp.text)
                if emails:
                    contacts["emails_found"] = emails[:5]
                break
        except:
            pass

    # 3. Попробуем стандартные email
    standard_emails = [
        f"security@{domain}",
        f"vulnerabilities@{domain}",
        f"bugbounty@{domain}",
        f"ciso@{domain}",
        f"abuse@{domain}"
    ]
    contacts["standard_emails"] = standard_emails

    return contacts

# Пример
domain = "google.com"
result = find_disclosure_contact(domain)
print(f"\n=== Disclosure contacts for {domain} ===")
for key, value in result.items():
    print(f"\n{key}:")
    if isinstance(value, list):
        for item in value:
            print(f"  - {item}")
    else:
        print(f"  {value[:300] if len(str(value)) > 300 else value}")
```

---

## 15.3.3 Юридические аспекты

### Законодательство

```
ПРАВОВАЯ БАЗА (важно понимать!):

США:
├── Computer Fraud and Abuse Act (CFAA) — основной закон
├── "Unauthorized access" — широкая трактовка
├── Многие компании включают Safe Harbor в Bug Bounty
└── Без разрешения = риск преследования даже при good faith

ЕС / GDPR юрисдикции:
├── Директива о кибербезопасности (NIS2)
├── GDPR статья 33 (уведомление о нарушениях)
└── Разные законы в разных странах ЕС

Россия:
├── 272-ФЗ "О преступлениях в сфере компьютерной информации"
├── Неправомерный доступ = уголовная ответственность
├── Статья 272 УК РФ: до 7 лет лишения свободы
└── Bug Bounty программы = юридическое прикрытие
```

### Что защищает и что не защищает

```
SAFE HARBOR ОЗНАЧАЕТ:
✓ Компания не будет преследовать за добросовестное тестирование
✓ Только в рамках указанного scope
✓ Только при соблюдении правил программы
✓ Только при отсутствии реального ущерба

SAFE HARBOR НЕ ЗАЩИЩАЕТ ОТ:
✗ Уголовного преследования со стороны государства (в теории)
✗ Претензий третьих лиц (данные их клиентов)
✗ Действий за пределами scope
✗ DoS атак или реального ущерба

ПРАКТИЧЕСКИЕ ПРАВИЛА БЕЗОПАСНОСТИ:

1. ВСЕГДА используй тестовые аккаунты
   → Создай новый аккаунт специально для тестирования

2. НИКОГДА не получай доступ к реальным данным пользователей
   → Нашёл SQLi? Одна строка PoC — достаточно. Не качай всю БД.

3. НИКОГДА не делай DoS
   → Один запрос для воспроизведения, не тысячи

4. ДОКУМЕНТИРУЙ всё
   → Скриншоты, запросы, время — на случай вопросов

5. РАБОТАЙ только через Bug Bounty программу
   → Программа = твоя юридическая защита

6. ХРАНИ доказательства этичного поведения
   → Переписку с вендором, даты, PoC который не разрушителен
```

### Реальные случаи (предупреждение)

```
ИСТОРИИ ДЛЯ РАЗМЫШЛЕНИЯ:

Аарон Шварц (2013):
└── Скачал статьи из JSTOR для академического исследования
└── CFAA обвинение: 13 пунктов, до 50 лет тюрьмы
└── Трагическая гибель. Показывает жёсткость CFAA.

Weev / AT&T (2010):
└── Нашёл IDOR в API, скачал 114,000 email адресов
└── Осуждён по CFAA. Осуждение отменено апелляцией.
└── Урок: даже при публичной информации — риск.

Baris Egemen Dönmez (2024):
└── Турецкий исследователь нашёл SQLi на госсайте
└── Уведомил правительство, получил благодарность
└── Ключ: официальный канал уведомления.

ВЫВОД:
Bug Bounty программа = ваша лучшая защита.
Без программы — максимально осторожно и через официальные каналы.
```

---

## 15.3.4 Первые находки — реальные примеры

### Типичные "первые баги" начинающих

```
НАХОДКИ КОТОРЫЕ ЧАСТО СТАНОВЯТСЯ ПЕРВЫМИ:

1. SUBDOMAIN TAKEOVER
   История: Исследователь нашёл субдомен support.company.com,
   указывающий на старый Zendesk который больше не существует.
   Зарегистрировал аккаунт на Zendesk → получил контроль над субдоменом.

   Почему находят новички: не требует глубокой технической экспертизы,
   автоматизировано через subjack/nuclei.

   Выплата: $200 - $2,000 в зависимости от программы.

2. IDOR В API
   История: После регистрации на сервисе исследователь заметил:
   GET /api/invoices/1234 → получил свой счёт
   GET /api/invoices/1233 → получил чужой счёт

   Почему находят новички: нужна только логика, не экспертиза.

   Выплата: $500 - $5,000.

3. REFLECTED XSS В ПАРАМЕТРЕ ПОИСКА
   История: search?q=<script>alert(1)</script> сработало.

   Почему находят новички: первое что пробуют.

   Выплата: $200 - $1,000 (часто Low из-за необходимости self-trigger).

4. ОТКРЫТЫЙ .ENV ФАЙЛ
   История: https://company.com/.env возвращает DB_PASSWORD=secret123
   Скрипт: ffuf -u https://target.com/FUZZ -w wordlist.txt

   Почему находят новички: автоматизировано.

   Выплата: $500 - $5,000+ (зависит от чувствительности данных).

5. DEFAULT CREDENTIALS
   История: /admin с admin/admin → доступ к панели управления.

   Почему находят новички: не требует ничего кроме попробовать.

   Выплата: $1,000 - $10,000+.
```

### Реальная история первой находки (write-up)

```markdown
# Моя первая находка в Bug Bounty

**Программа:** [Анонимная компания, средний бизнес]
**Тип:** IDOR → доступ к чужим заказам
**Выплата:** $750
**Время:** 3 часа тестирования

## Как я нашёл

Зарегистрировал тестовый аккаунт. Сделал тестовый заказ.
В истории заказов увидел URL: /orders/view/ORD-2024-09847

Подумал: "А что если изменить номер?"

Попробовал: /orders/view/ORD-2024-09846

Получил: полные данные чужого заказа (имя, адрес, телефон, состав заказа).

## Как верифицировал

Создал второй тестовый аккаунт.
С первого аккаунта (ORD-09847) обратился к заказу второго (ORD-09848).
Успешно получил данные второго аккаунта → подтверждено!

## Что не делал

Не перебирал все номера. Только 2 аккаунта, 2 заказа.
Нет данных реальных пользователей.

## Репорт

Отправил в тот же день:
- Два скриншота (до и после)
- Точные шаги воспроизведения
- Объяснение impact (PII exposure)
- Рекомендация (добавить проверку владельца заказа)

## Результат

Через 3 дня: триаж, подтверждение.
Через 10 дней: патч, выплата $750.
Через 2 месяца: публичное раскрытие.

## Урок

Смотри на числовые ID. Всегда пробуй изменить на соседние.
Это называется IDOR — очень часто встречается.
```

### Стратегия первых шагов

```
ПЛАН ПЕРВЫХ 30 ДНЕЙ В BUG BOUNTY:

НЕДЕЛЯ 1: Обучение и настройка
├── Прочитать всю теорию по IDOR и Broken Access Control
│   на portswigger.net/web-security
├── Пройти 5-10 Apprentice лаб на Academy
├── Установить и освоить Burp Suite Community
└── Зарегистрироваться на HackerOne

НЕДЕЛЯ 2: Первая программа
├── Выбрать одну программу (не VDP без денег!)
├── Внимательно прочитать ВЕСЬ scope документ
├── Разведка: субдомены, живые хосты
└── Ручное исследование: зарегистрироваться, изучить функции

НЕДЕЛЯ 3: Тестирование
├── Фокус на одном типе уязвимости (IDOR)
├── Проверить все числовые параметры
├── Попробовать subdomain takeover (subjack/nuclei)
└── Поискать открытые файлы (.env, .git, backup)

НЕДЕЛЯ 4: Оценка и продолжение
├── Если нашёл — пишем репорт!
├── Если не нашёл — это нормально, продолжаем
├── Переключиться на другую программу или другую уязвимость
└── Изучить disclosed репорты из Hacktivity для этой программы

ПРАВИЛО:
Лучше хорошо знать одну категорию уязвимостей,
чем плохо знать все. Специализируйся на IDOR или XSS сначала.
```

---

## 15.3.5 Практические скрипты для первых шагов

### Subdomain Takeover Checker

```python
#!/usr/bin/env python3
"""
subdomain_takeover.py — проверка subdomain takeover
"""

import requests
import socket
import concurrent.futures
from typing import Optional

# Известные CNAME-паттерны для уязвимых сервисов
TAKEOVER_PATTERNS = {
    "GitHub Pages": {
        "cname_contains": ["github.io"],
        "error_string": "There isn't a GitHub Pages site here",
        "check_url": True
    },
    "Heroku": {
        "cname_contains": ["herokudns.com", "herokuapp.com"],
        "error_string": "No such app",
        "check_url": True
    },
    "Zendesk": {
        "cname_contains": ["zendesk.com"],
        "error_string": "Help Center Closed",
        "check_url": True
    },
    "Shopify": {
        "cname_contains": ["myshopify.com"],
        "error_string": "Sorry, this shop is currently unavailable",
        "check_url": True
    },
    "Tumblr": {
        "cname_contains": ["domains.tumblr.com"],
        "error_string": "Whatever you were looking for doesn't currently exist",
        "check_url": True
    },
    "Fastly": {
        "cname_contains": ["fastly.net"],
        "error_string": "Fastly error: unknown domain",
        "check_url": True
    },
    "AWS S3": {
        "cname_contains": ["s3.amazonaws.com", "s3-website"],
        "error_string": "NoSuchBucket",
        "check_url": True
    }
}

def get_cname(hostname: str) -> Optional[str]:
    """Получить CNAME запись для домена"""
    try:
        import dns.resolver
        answers = dns.resolver.resolve(hostname, 'CNAME')
        return str(answers[0].target)
    except:
        # Fallback: через dig
        import subprocess
        result = subprocess.run(
            ["dig", "+short", "CNAME", hostname],
            capture_output=True, text=True
        )
        if result.stdout.strip():
            return result.stdout.strip()
    return None

def check_takeover(subdomain: str) -> dict:
    """Проверить субдомен на возможность takeover"""
    result = {
        "subdomain": subdomain,
        "cname": None,
        "vulnerable": False,
        "service": None,
        "message": ""
    }

    # Получаем CNAME
    cname = get_cname(subdomain)
    result["cname"] = cname

    if not cname:
        # Нет CNAME — не уязвимо к этому типу атаки
        return result

    # Проверяем против известных паттернов
    for service_name, config in TAKEOVER_PATTERNS.items():
        cname_matches = any(
            pattern in cname.lower()
            for pattern in config["cname_contains"]
        )

        if cname_matches:
            # CNAME указывает на этот сервис
            # Проверяем, доступен ли он
            try:
                resp = requests.get(
                    f"https://{subdomain}",
                    timeout=10,
                    allow_redirects=True,
                    verify=False  # Для быстрой проверки
                )

                # Ищем ошибку сервиса в ответе
                if config.get("error_string") in resp.text:
                    result["vulnerable"] = True
                    result["service"] = service_name
                    result["message"] = (
                        f"CNAME → {cname} ({service_name}). "
                        f"Service not configured! Potentially takeable."
                    )

            except requests.exceptions.ConnectionError:
                # Не резолвится — вероятно dangling CNAME
                result["vulnerable"] = True
                result["service"] = service_name
                result["message"] = (
                    f"CNAME → {cname} ({service_name}). "
                    f"Domain doesn't resolve — dangling CNAME!"
                )
            except Exception as e:
                result["message"] = f"Error checking: {e}"

    return result

def scan_subdomains(subdomains_file: str, threads: int = 20):
    """Массовая проверка субдоменов"""
    with open(subdomains_file) as f:
        subdomains = [line.strip() for line in f if line.strip()]

    print(f"[*] Checking {len(subdomains)} subdomains for takeover...")

    vulnerable = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=threads) as executor:
        futures = {
            executor.submit(check_takeover, sub): sub
            for sub in subdomains
        }

        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            if result["vulnerable"]:
                print(f"\n[!] VULNERABLE: {result['subdomain']}")
                print(f"    Service: {result['service']}")
                print(f"    CNAME: {result['cname']}")
                print(f"    {result['message']}")
                vulnerable.append(result)
            else:
                print(f"[.] Clean: {result['subdomain']}")

    print(f"\n[+] Found {len(vulnerable)} potentially vulnerable subdomains")
    return vulnerable

# Пример
if __name__ == "__main__":
    import sys

    if len(sys.argv) == 2:
        # Проверка одного субдомена
        result = check_takeover(sys.argv[1])
        print(f"Subdomain: {result['subdomain']}")
        print(f"CNAME: {result['cname']}")
        print(f"Vulnerable: {'YES ⚠️' if result['vulnerable'] else 'No'}")
        if result['vulnerable']:
            print(f"Service: {result['service']}")
            print(f"Details: {result['message']}")
    else:
        print("Usage: python3 subdomain_takeover.py <domain>")
        print("       python3 subdomain_takeover.py subdomains.txt")
```

### IDOR Tester

```python
#!/usr/bin/env python3
"""
idor_tester.py — систематический тест IDOR
"""

import requests
import json
import re
from itertools import chain

class IDORTester:
    def __init__(self, session: requests.Session, base_url: str):
        self.session = session
        self.base_url = base_url
        self.your_user_id = None  # Установить после логина

    def extract_ids_from_response(self, response_text: str) -> list:
        """
        Находит все потенциальные ID в ответе
        """
        patterns = [
            r'"id":\s*(\d+)',          # JSON: "id": 123
            r'"user_id":\s*(\d+)',     # JSON: "user_id": 123
            r'"order_id":\s*"([^"]+)"', # JSON: "order_id": "ORD-123"
            r'/(\d{4,10})/',           # URL path: /12345/
            r'\?id=(\d+)',             # Query param: ?id=123
            r'data-id="(\d+)"',        # HTML attribute
        ]

        all_ids = []
        for pattern in patterns:
            matches = re.findall(pattern, response_text)
            all_ids.extend(matches)

        return list(set(all_ids))

    def test_idor_for_endpoint(self, endpoint_template: str, your_id,
                               test_range: int = 10) -> list:
        """
        Тест IDOR для endpoint с числовым ID

        Пример:
        test_idor_for_endpoint("/api/orders/{id}", 5000, test_range=5)
        → Тестирует ID: 4995, 4996, 4997, 4998, 4999, 5001, ...5005
        """
        vulnerabilities = []

        # Получаем свой объект
        your_url = f"{self.base_url}{endpoint_template}".replace("{id}", str(your_id))
        your_resp = self.session.get(your_url)

        if your_resp.status_code != 200:
            print(f"[!] Can't access own object: {your_resp.status_code}")
            return []

        your_data = your_resp.text

        # Тестируем соседние ID
        test_ids = list(range(int(your_id) - test_range, int(your_id))) + \
                   list(range(int(your_id) + 1, int(your_id) + test_range + 1))

        for test_id in test_ids:
            test_url = f"{self.base_url}{endpoint_template}".replace("{id}", str(test_id))
            resp = self.session.get(test_url)

            if resp.status_code == 200 and resp.text != your_data:
                # Потенциальный IDOR!
                vuln = {
                    "your_id": your_id,
                    "tested_id": test_id,
                    "url": test_url,
                    "status": resp.status_code,
                    "response_snippet": resp.text[:200]
                }
                vulnerabilities.append(vuln)
                print(f"\n[!] POTENTIAL IDOR!")
                print(f"    URL: {test_url}")
                print(f"    Response: {resp.text[:200]}")

        if not vulnerabilities:
            print(f"[✓] No IDOR found for {endpoint_template}")

        return vulnerabilities

    def check_horizontal_privilege_escalation(self, endpoints: list):
        """
        Проверка горизонтальной эскалации привилегий
        """
        results = []
        for endpoint_info in endpoints:
            url = endpoint_info["url"]
            expected_owner = endpoint_info.get("owner_id")

            resp = self.session.get(url)

            if resp.status_code == 200:
                # Проверяем, есть ли чужие данные
                try:
                    data = resp.json()
                    response_user_id = data.get("user_id") or data.get("userId")

                    if response_user_id and str(response_user_id) != str(self.your_user_id):
                        print(f"[!] IDOR: Got data for user {response_user_id} at {url}")
                        results.append({
                            "url": url,
                            "your_id": self.your_user_id,
                            "got_id": response_user_id,
                            "data": data
                        })
                except:
                    pass

        return results


# ПРИМЕР ИСПОЛЬЗОВАНИЯ (концептуально)
"""
session = requests.Session()

# Логин
session.post("https://target.com/api/auth/login", json={
    "email": "your_test@email.com",
    "password": "testpassword"
})

tester = IDORTester(session, "https://target.com")
tester.your_user_id = 12345  # Ваш ID

# Тест IDOR в заказах
vulns = tester.test_idor_for_endpoint("/api/orders/{id}", 98765, test_range=5)

# Тест IDOR в профилях
vulns += tester.test_idor_for_endpoint("/api/users/{id}/profile", 12345, test_range=5)

if vulns:
    print(f"\\n[!] Found {len(vulns)} potential IDOR vulnerabilities!")
    print("[*] Document and report responsibly!")
"""
```

---

## 15.3.6 Построение репутации в Bug Bounty

### Путь от новичка к топ-хантеру

```
КАРЬЕРНЫЙ ПУТЬ В BUG BOUNTY:

УРОВЕНЬ 1: Новичок (0-6 месяцев)
├── Первые несколько находок
├── Репутация на платформе растёт
├── Сфокусирован на 1-2 типах уязвимостей
└── Доход: $0 - $500/месяц

УРОВЕНЬ 2: Начинающий (6-18 месяцев)
├── Стабильные находки каждый месяц
├── Получаешь Private инвайты
├── Известен как специалист по определённому типу
└── Доход: $500 - $3,000/месяц

УРОВЕНЬ 3: Experienced (1.5-3 года)
├── Top 100 на платформах
├── Всегда в Private программах
├── Находишь сложные цепочки уязвимостей
└── Доход: $3,000 - $15,000/месяц

УРОВЕНЬ 4: Elite (3+ лет)
├── Top 10 на платформах
├── Приглашают на эксклюзивные live hacking events
├── $10,000+ за одну находку норма
└── Доход: $15,000 - $100,000+/месяц

СЕКРЕТЫ РОСТА:
1. Специализируйся, не распыляйся
2. Изучай disclosed репорты (бесценно!)
3. Участвуй в live hacking events
4. Пиши write-ups → растёт авторитет
5. Налаживай контакты с другими хантерами
```

### Публичные write-ups для обучения

```
КАК УЧИТЬСЯ НА ЧУЖИХ РЕПОРТАХ:

1. HackerOne Hacktivity (публичные репорты):
   https://hackerone.com/hacktivity
   ├── Фильтруй по типу (XSS, SQLi, IDOR)
   ├── Фильтруй по сумме выплаты
   └── Читай детальные шаги воспроизведения

2. Bugcrowd Hall of Fame (некоторые публичные):
   https://bugcrowd.com/programs (смотри disclosed)

3. Personal blogs хантеров:
   ├── blog.intigriti.com/2022/10/10/xss-challenge-writeups
   ├── pentester.land/list-of-bug-bounty-writeups
   └── github.com/devanshbatham/Awesome-Bugbounty-Writeups

4. Twitter/X ключевые аккаунты:
   ├── @nahamsec (Nathan Hamiel — топ хантер)
   ├── @TomNomNom (инструменты BB)
   ├── @LiveOverflow (обучение через CTF/BB)
   └── @hacker_ (маркетинг, новости BB)

АЛГОРИТМ ИЗУЧЕНИЯ WRITE-UP:
1. Прочитай заголовок → тип уязвимости
2. Изучи как исследователь нашёл точку входа
3. Запиши payload который использовал
4. Попробуй воспроизвести в тестовой среде (DVWA/Juice Shop)
5. Добавь технику в свою методологию
```

---

## 📌 Итоги главы

- **Responsible Disclosure** — стандарт ответственного поведения: уведомить, дать время (90 дней), затем раскрыть публично
- **security.txt** (RFC 9116) — стандартный способ найти контакт для раскрытия
- Юридически: Bug Bounty программа = ваша защита; без неё — максимальная осторожность
- Первые находки часто: Subdomain Takeover, IDOR, открытые файлы (.env, .git), Default Credentials
- Стратегия: начать с одного типа уязвимости, специализироваться, читать disclosed write-ups
- Путь в Bug Bounty: новичок → Hacker101 CTF → репутация → Private программы → Elite
- Документируй всё, действуй добросовестно, не причиняй реального ущерба

---

## 🏠 Домашнее задание

1. **Базовый уровень:** Найдите security.txt для 5 крупных компаний на ваш выбор. Что в них указано? Есть ли у всех? Напишите краткое сравнение.

2. **Средний уровень:** Прочитайте 5 disclosed репортов на HackerOne Hacktivity (hackerone.com/hacktivity) с суммой выплаты > $1000. Для каждого составьте краткое резюме: тип уязвимости, где нашли, почему возникла.

3. **Продвинутый уровень:** Пройдите Hacker101 CTF (hacker101.com) — решите все "Easy" и хотя бы 3 "Medium" задания. Задокументируйте решение в формате write-up.

4. **Практика раскрытия:** Напишите draft шаблон первого письма вендору (для вымышленной компании и вымышленной уязвимости). Используйте шаблон из раздела 15.3.2. Дайте другу прочитать — понятно ли написано?

---

## 🔗 Полезные ресурсы

| Ресурс | URL | Описание |
|--------|-----|----------|
| HackerOne Hacktivity | hackerone.com/hacktivity | Публичные репорты |
| Hacker101 CTF | hacker101.com/ctf | Обучающие задания от HackerOne |
| CERT/CC | kb.cert.org | Координация раскрытия |
| CISA VDP | cisa.gov/coordinated-vulnerability-disclosure-process | Гайд CISA |
| security.txt RFC | securitytxt.org | Стандарт RFC 9116 |
| Pentester Land | pentester.land/list-of-bug-bounty-writeups | База write-ups |
| awesome-bugbounty | github.com/devanshbatham/Awesome-Bugbounty-Writeups | GitHub коллекция |
| nahamsec | github.com/nahamsec/Resources-for-Beginner-Bug-Bounty-Hunters | Ресурсы новичка |
| LiveOverflow | youtube.com/@LiveOverflow | YouTube по безопасности |
| OWASP VDP | owasp.org/www-community/Vulnerability_Disclosure_Cheat_Sheet | OWASP гайд |
