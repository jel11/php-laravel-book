# Глава 4.1: Быстрый старт Python для PHP-разработчика

## 🎯 Цели главы

- Понять ключевые синтаксические отличия Python от PHP
- Настроить рабочее окружение Python для задач безопасности
- Освоить виртуальные окружения venv и менеджер пакетов pip
- Научиться работать с типами данных, функциями и ООП в Python
- Применять f-strings, list comprehensions и словари
- Работать с файлами, исключениями и модулями
- Быть готовым писать инструменты безопасности на Python уже в следующей главе

---

## 4.1.1 Почему Python — язык номер один в кибербезопасности

Если вы PHP-разработчик, читающий книгу по кибербезопасности, вы неизбежно столкнётесь с Python. Большинство инструментов безопасности написано именно на нём: Metasploit использует Ruby, но его скрипты — Python; Scapy, Impacket, SQLMap, Volatility, Burp Suite Extensions — всё это Python. OSCP, CEH, PNPT — сертификации требуют Python.

**Почему Python стал стандартом в безопасности:**

1. **Богатая экосистема библиотек** — requests, scapy, paramiko, impacket, cryptography
2. **Скорость разработки** — прототип инструмента за час
3. **Читаемость кода** — легко модифицировать чужие эксплойты
4. **Кроссплатформенность** — работает на Linux, Windows, macOS
5. **Интерактивный режим** — быстрое тестирование идей в REPL
6. **CTF и PoC** — практически весь публичный код по безопасности на Python

Для PHP-разработчика переход на Python — это не изучение нового языка с нуля. Это изучение новых соглашений. Концепции вам уже знакомы.

---

## 4.1.2 Установка и настройка окружения

### Проверка установки Python

```bash
# Проверить версию Python
python3 --version
# Python 3.11.5

# Проверить pip
pip3 --version
# pip 23.2.1

# Интерактивный режим (аналог php -a)
python3
>>> print("Hello, Security!")
>>> exit()
```

> **Важно:** В 2024 году Python 2 официально устарел. Всегда используйте `python3`. В некоторых системах команда `python` может указывать на Python 2. Проверяйте версию перед запуском скриптов.

### Установка Python на разных системах

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install python3 python3-pip python3-venv

# CentOS/RHEL
sudo yum install python3 python3-pip

# macOS (через Homebrew)
brew install python3

# Windows — скачать с python.org, добавить в PATH
```

### Первый скрипт

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Мой первый скрипт безопасности.
Автор: Security Researcher
"""

# PHP: echo "Hello, World!\n";
print("Hello, Security World!")

# PHP: $name = "Hacker";
name = "Hacker"

# PHP: echo "Hello, $name!\n";
print(f"Hello, {name}!")
```

```bash
# Запуск (аналог php script.php)
python3 hello.py

# Сделать исполняемым
chmod +x hello.py
./hello.py
```

---

## 4.1.3 Виртуальные окружения — venv и pip

В PHP вы используете Composer для управления зависимостями проекта. В Python для этого служат виртуальные окружения (virtual environments) и pip.

**Проблема без виртуального окружения:** все пакеты устанавливаются глобально. Проект A требует requests==2.28, проект B требует requests==2.31 — конфликт.

**Решение:** каждый проект получает своё изолированное окружение.

```bash
# PHP аналогия:
# composer init          → python3 -m venv venv
# composer install       → pip install -r requirements.txt
# vendor/                → venv/
# composer.json          → requirements.txt
# composer.lock          → pip freeze > requirements.txt

# Создать виртуальное окружение
python3 -m venv venv

# Активировать (Linux/macOS)
source venv/bin/activate

# Активировать (Windows)
venv\Scripts\activate

# После активации — в скобках появится (venv)
(venv) $ python --version
(venv) $ pip --version

# Установить пакеты
(venv) $ pip install requests
(venv) $ pip install scapy paramiko cryptography

# Установить из файла зависимостей
(venv) $ pip install -r requirements.txt

# Сохранить зависимости
(venv) $ pip freeze > requirements.txt

# Список установленных пакетов
(venv) $ pip list

# Деактивировать окружение
(venv) $ deactivate
```

### Типичный файл requirements.txt для инструментов безопасности

```text
requests==2.31.0
scapy==2.5.0
paramiko==3.3.1
cryptography==41.0.5
python-nmap==0.7.1
impacket==0.11.0
colorama==0.4.6
tabulate==0.9.0
```

### Структура проекта безопасности

```
my-security-tool/
├── venv/                  # виртуальное окружение (в .gitignore!)
├── requirements.txt       # зависимости (как composer.json)
├── README.md
├── main.py                # точка входа
├── tools/                 # модули (как src/ в PHP)
│   ├── __init__.py        # делает папку пакетом (как autoload)
│   ├── scanner.py
│   └── parser.py
└── tests/
    └── test_scanner.py
```

---

## 4.1.4 Синтаксис Python vs PHP: переменные и типы данных

### Переменные

```php
<?php
// PHP: типизация не обязательна
$name = "Alice";
$age = 30;
$salary = 99.5;
$isHacker = true;
$nothing = null;

// Проверка типа
echo gettype($name);  // string
var_dump($age);       // int(30)
```

```python
# Python: то же самое, без $ и ;
name = "Alice"
age = 30
salary = 99.5
is_hacker = True    # Внимание: True с большой буквы!
nothing = None      # None, а не null

# Проверка типа
print(type(name))   # <class 'str'>
print(type(age))    # <class 'int'>
isinstance(age, int)  # True — аналог is_int() в PHP
```

### Строки

```php
<?php
// PHP строки
$ip = "192.168.1.1";
$port = 80;

// Конкатенация
$result = "Target: " . $ip . ":" . $port;

// Интерполяция (двойные кавычки)
$result = "Target: {$ip}:{$port}";

// Многострочная строка
$banner = "HTTP/1.1 200 OK
Server: Apache
Content-Type: text/html";

// Длина строки
echo strlen($ip);  // 11

// Срез строки
echo substr($ip, 0, 3);  // "192"

// Поиск
echo strpos($ip, ".");  // 3
```

```python
# Python строки
ip = "192.168.1.1"
port = 80

# Конкатенация (через + или join)
result = "Target: " + ip + ":" + str(port)

# f-strings (Python 3.6+) — рекомендуемый способ
result = f"Target: {ip}:{port}"

# format() — старый способ
result = "Target: {}:{}".format(ip, port)

# % — очень старый способ (встречается в legacy)
result = "Target: %s:%d" % (ip, port)

# Многострочная строка (тройные кавычки)
banner = """HTTP/1.1 200 OK
Server: Apache
Content-Type: text/html"""

# Длина строки
len(ip)        # 11

# Срез строки (slice notation) — мощная фича Python!
ip[0:3]        # "192"
ip[:3]         # "192" — то же самое
ip[-1]         # "1" — последний символ
ip[::2]        # каждый второй символ

# Поиск
ip.find(".")   # 3
ip.index(".")  # 3 (бросает исключение если не найдено)
"." in ip      # True — проверка вхождения

# Методы строк
ip.upper()           # "192.168.1.1" (не меняется — уже без букв)
"apache".upper()     # "APACHE"
"  spaces  ".strip() # "spaces"
"a,b,c".split(",")   # ["a", "b", "c"]
",".join(["a","b"])  # "a,b"
ip.startswith("192") # True
ip.endswith(".1")    # True
ip.replace(".", "-") # "192-168-1-1"
```

### Числа

```php
<?php
$decimal = 42;
$float = 3.14;
$hex = 0xFF;
$binary = 0b1010;
$octal = 0777;

echo intdiv(10, 3);  // 3
echo 10 % 3;         // 1
echo 2 ** 8;         // 256
```

```python
decimal = 42
float_num = 3.14
hex_num = 0xFF        # 255
binary_num = 0b1010   # 10
octal_num = 0o777     # 511

# Целочисленное деление
10 // 3    # 3
10 % 3     # 1
2 ** 8     # 256 — степень
abs(-5)    # 5

# Python поддерживает огромные числа нативно
big = 2 ** 256  # никаких bcmath не нужно!

# Преобразование типов
int("42")       # 42
int("0xFF", 16) # 255 — из hex-строки
float("3.14")   # 3.14
str(42)         # "42"
hex(255)        # "0xff"
bin(10)         # "0b1010"
ord("A")        # 65 — символ → ASCII код
chr(65)         # "A" — ASCII код → символ
```

---

## 4.1.5 Структуры данных: списки, кортежи, словари, множества

### Списки (Lists) — аналог массивов PHP

```php
<?php
// PHP индексированный массив
$ports = [80, 443, 22, 21, 25];
$ports[] = 8080;         // добавить
$ports[0] = 81;          // изменить
echo count($ports);      // длина
echo implode(",", $ports); // объединить
array_push($ports, 3306);
array_pop($ports);
sort($ports);
$slice = array_slice($ports, 0, 3);
```

```python
# Python список
ports = [80, 443, 22, 21, 25]
ports.append(8080)      # добавить в конец
ports.insert(0, 81)     # вставить по индексу
ports[0] = 90           # изменить элемент
len(ports)              # длина
",".join(str(p) for p in ports)  # объединить
ports.pop()             # удалить последний
ports.pop(0)            # удалить по индексу
ports.remove(443)       # удалить по значению
ports.sort()            # сортировка на месте
sorted(ports)           # новый отсортированный список
ports[0:3]              # срез — первые 3 элемента
ports[-3:]              # последние 3 элемента
22 in ports             # True — проверка вхождения
ports.count(80)         # количество вхождений
ports.index(22)         # индекс элемента
ports.reverse()         # реверс на месте
ports.extend([8080, 8443])  # расширить другим списком

# Создание списка из диапазона
range(1, 11)            # 1..10
list(range(1, 11))      # [1, 2, 3, ..., 10]

# Распаковка
first, *rest = ports
first, second, *tail = ports
```

### Кортежи (Tuples) — неизменяемые списки

```python
# Кортеж — как список, но неизменяемый
# Используется для возврата нескольких значений из функции
coordinates = (192, 168, 1, 1)
host, port = ("192.168.1.1", 80)  # распаковка

# Пример в безопасности: список открытых портов (не меняется)
COMMON_PORTS = (21, 22, 23, 25, 53, 80, 110, 143, 443, 3306, 3389, 8080)
```

### Словари (Dictionaries) — ассоциативные массивы PHP

```php
<?php
// PHP ассоциативный массив
$host = [
    "ip" => "192.168.1.1",
    "port" => 80,
    "service" => "http",
    "open" => true
];

echo $host["ip"];           // доступ
$host["os"] = "Linux";      // добавить
unset($host["open"]);       // удалить
isset($host["port"]);       // проверить наличие
array_keys($host);          // ключи
array_values($host);        // значения
```

```python
# Python словарь
host = {
    "ip": "192.168.1.1",
    "port": 80,
    "service": "http",
    "open": True
}

host["ip"]              # доступ: "192.168.1.1"
host["os"] = "Linux"    # добавить/изменить
del host["open"]        # удалить
"port" in host          # True — проверить наличие ключа
host.keys()             # ключи
host.values()           # значения
host.items()            # пары (ключ, значение)

# get() — безопасный доступ (не бросает исключение)
host.get("port")        # 80
host.get("missing")     # None
host.get("missing", 0)  # 0 — значение по умолчанию

# update() — обновить несколькими парами
host.update({"status": "active", "latency": 12})

# Словарь из двух списков
keys = ["ip", "port", "service"]
values = ["192.168.1.1", 80, "http"]
host = dict(zip(keys, values))

# Вложенные словари — для отчётов по безопасности
scan_result = {
    "192.168.1.1": {
        "open_ports": [22, 80, 443],
        "os": "Linux",
        "services": {22: "ssh", 80: "http", 443: "https"}
    },
    "192.168.1.2": {
        "open_ports": [3389],
        "os": "Windows",
        "services": {3389: "rdp"}
    }
}

# Доступ к вложенным данным
scan_result["192.168.1.1"]["services"][22]  # "ssh"
```

### Множества (Sets) — для уникальных значений

```python
# Множество — уникальные элементы, без порядка
# Аналог array_unique() в PHP, но более мощный

found_ips = {"192.168.1.1", "10.0.0.1", "192.168.1.1"}
# {"192.168.1.1", "10.0.0.1"} — дубликат удалён автоматически

found_ips.add("172.16.0.1")       # добавить
found_ips.discard("10.0.0.1")     # удалить (без исключения)

# Теоретико-множественные операции — полезны при анализе логов
set_a = {1, 2, 3, 4}
set_b = {3, 4, 5, 6}

set_a | set_b    # объединение: {1, 2, 3, 4, 5, 6}
set_a & set_b    # пересечение: {3, 4}
set_a - set_b    # разность: {1, 2}
set_a ^ set_b    # симметричная разность: {1, 2, 5, 6}

# Пример: найти IP, которые атаковали несколько сервисов
ssh_attackers = {"1.2.3.4", "5.6.7.8", "9.10.11.12"}
web_attackers = {"5.6.7.8", "13.14.15.16", "1.2.3.4"}
both = ssh_attackers & web_attackers  # {"1.2.3.4", "5.6.7.8"}
```

---

## 4.1.6 Управляющие конструкции

### Условия

```php
<?php
$port = 80;

if ($port == 80) {
    echo "HTTP";
} elseif ($port == 443) {
    echo "HTTPS";
} else {
    echo "Unknown";
}

// Тернарный оператор
$proto = ($port == 443) ? "https" : "http";
```

```python
port = 80

if port == 80:
    print("HTTP")
elif port == 443:          # elif, не elseif!
    print("HTTPS")
else:
    print("Unknown")

# Тернарный оператор
proto = "https" if port == 443 else "http"

# match-case (Python 3.10+) — аналог switch
match port:
    case 22:
        service = "SSH"
    case 80:
        service = "HTTP"
    case 443:
        service = "HTTPS"
    case 3306 | 5432:      # несколько значений через |
        service = "Database"
    case _:                # default
        service = "Unknown"

# Цепочка сравнений — уникальная фича Python
1 <= port <= 1024          # True — привилегированные порты
# В PHP: $port >= 1 && $port <= 1024

# Проверка типов и значений
port is None               # идентичность (not ==)
port is not None
not (port == 0)
```

### Циклы

```php
<?php
// PHP for
for ($i = 0; $i < 10; $i++) {
    echo $i;
}

// PHP foreach
$ports = [80, 443, 22];
foreach ($ports as $port) {
    echo $port;
}
foreach ($ports as $index => $port) {
    echo "$index: $port";
}

// PHP while
while ($condition) {
    // ...
    break;
    continue;
}
```

```python
# Python for — итерирует по любой последовательности
ports = [80, 443, 22]
for port in ports:
    print(port)

# С индексом — enumerate() вместо foreach with key
for index, port in enumerate(ports):
    print(f"{index}: {port}")

# Диапазон чисел
for i in range(10):        # 0..9
    print(i)

for i in range(1, 11):     # 1..10
    print(i)

for i in range(0, 100, 10):  # 0,10,20,...,90
    print(i)

# Итерация по словарю
host = {"ip": "192.168.1.1", "port": 80}
for key in host:           # только ключи
    print(key)

for key, value in host.items():  # пары
    print(f"{key} = {value}")

# while
attempts = 0
while attempts < 3:
    attempts += 1
    if attempts == 2:
        continue           # пропустить итерацию
    print(f"Attempt {attempts}")
else:
    # else при цикле — выполняется если не было break
    print("All attempts done")

# for с else — полезно при поиске
for port in ports:
    if port == 443:
        print("HTTPS found!")
        break
else:
    print("HTTPS not found")  # только если break не сработал
```

---

## 4.1.7 Функции в Python

```php
<?php
// PHP функция
function scanPort($host, $port, $timeout = 1) {
    // ...
    return true;
}

// Именованные аргументы (PHP 8.0+)
scanPort(host: "192.168.1.1", port: 80);

// Переменное число аргументов
function logPorts(...$ports) {
    foreach ($ports as $port) {
        echo $port;
    }
}
```

```python
# Python функция
def scan_port(host, port, timeout=1):   # snake_case!
    # ...
    return True

# Вызов с именованными аргументами
scan_port(host="192.168.1.1", port=80)
scan_port("192.168.1.1", port=80, timeout=2)

# *args — переменное число позиционных аргументов
def log_ports(*ports):
    for port in ports:
        print(port)

log_ports(80, 443, 22, 21)

# **kwargs — переменное число именованных аргументов
def create_request(**options):
    print(options)  # {'method': 'GET', 'url': '...'}

create_request(method="GET", url="http://example.com", timeout=5)

# Аннотации типов (Type Hints) — Python 3.5+
# Не обязательны, но улучшают читаемость
def scan_port(host: str, port: int, timeout: float = 1.0) -> bool:
    """
    Проверяет, открыт ли порт на хосте.
    
    Args:
        host: IP-адрес или доменное имя
        port: Номер порта (1-65535)
        timeout: Таймаут в секундах
    
    Returns:
        True если порт открыт, False иначе
    """
    return True

from typing import List, Dict, Optional, Tuple

def parse_hosts(data: str) -> List[Dict[str, str]]:
    return []

def get_service(port: int) -> Optional[str]:
    return None

# Возврат нескольких значений (на самом деле кортеж)
def get_host_info(ip: str) -> Tuple[str, int, bool]:
    hostname = "example.com"
    latency = 15
    is_alive = True
    return hostname, latency, is_alive  # возвращает кортеж

# Распаковка результата
hostname, latency, is_alive = get_host_info("192.168.1.1")

# Lambda — анонимные функции (аналог PHP arrow functions)
# PHP: $double = fn($x) => $x * 2;
double = lambda x: x * 2
double(5)  # 10

# Используется в сортировке и фильтрации
hosts = [{"ip": "192.168.1.1", "port": 80}, {"ip": "10.0.0.1", "port": 22}]
hosts.sort(key=lambda h: h["port"])
open_ports = list(filter(lambda p: p > 1024, [80, 443, 8080, 3000]))
doubled = list(map(lambda p: p * 2, [40, 221, 11]))
```

---

## 4.1.8 List Comprehensions и генераторы

List Comprehensions — одна из самых мощных и характерных особенностей Python. Это компактный способ создать список на основе другого списка.

```php
<?php
// PHP: фильтрация и преобразование массива
$ports = [80, 22, 443, 21, 8080, 3306];

// Найти привилегированные порты
$privileged = array_filter($ports, fn($p) => $p < 1024);

// Удвоить все порты
$doubled = array_map(fn($p) => $p * 2, $ports);

// Комбинация: отфильтровать и преобразовать
$result = array_map(
    fn($p) => "port_$p",
    array_filter($ports, fn($p) => $p < 1024)
);
```

```python
# Python List Comprehension: [выражение for элемент in последовательность if условие]
ports = [80, 22, 443, 21, 8080, 3306]

# Найти привилегированные порты
privileged = [p for p in ports if p < 1024]
# [80, 22, 443, 21]

# Удвоить все порты
doubled = [p * 2 for p in ports]
# [160, 44, 886, 42, 16160, 6612]

# Комбинация: отфильтровать и преобразовать
result = [f"port_{p}" for p in ports if p < 1024]
# ["port_80", "port_22", "port_443", "port_21"]

# Вложенные list comprehensions
# Пример: все комбинации хост:порт
hosts = ["192.168.1.1", "192.168.1.2"]
scan_ports = [80, 443, 22]
targets = [f"{h}:{p}" for h in hosts for p in scan_ports]
# ["192.168.1.1:80", "192.168.1.1:443", ..., "192.168.1.2:22"]

# Dictionary Comprehension
services = {80: "http", 443: "https", 22: "ssh", 21: "ftp"}
# Перевернуть словарь
reversed_services = {v: k for k, v in services.items()}
# {"http": 80, "https": 443, ...}

# Отфильтровать словарь
privileged_services = {p: s for p, s in services.items() if p < 1024}

# Set Comprehension
unique_first_octets = {ip.split(".")[0] for ip in ["192.168.1.1", "192.168.1.2", "10.0.0.1"]}
# {"192", "10"}

# Генераторы — как list comprehension, но ленивые (не загружают всё в память)
# Используйте для больших файлов логов!
large_log = (line.strip() for line in open("access.log"))  # читает построчно
for line in large_log:
    process(line)  # обрабатывает по одной строке

# Практический пример: парсинг портов из nmap вывода
nmap_output = "22/tcp open ssh\n80/tcp open http\n443/tcp open https\n8080/tcp closed http-proxy"
open_ports = [
    int(line.split("/")[0])
    for line in nmap_output.strip().split("\n")
    if "open" in line
]
# [22, 80, 443]
```

---

## 4.1.9 Объектно-ориентированное программирование

```php
<?php
// PHP класс
class PortScanner {
    private string $host;
    private int $timeout;
    private array $openPorts = [];
    
    public function __construct(string $host, int $timeout = 1) {
        $this->host = $host;
        $this->timeout = $timeout;
    }
    
    public function scan(int $port): bool {
        // логика сканирования
        return false;
    }
    
    public function getOpenPorts(): array {
        return $this->openPorts;
    }
    
    public function __toString(): string {
        return "Scanner for {$this->host}";
    }
}

// Наследование
class StealthScanner extends PortScanner {
    public function scan(int $port): bool {
        // стелс-сканирование
        return parent::scan($port);
    }
}
```

```python
# Python класс
class PortScanner:
    # Атрибут класса (не экземпляра) — общий для всех объектов
    DEFAULT_TIMEOUT = 1.0
    
    def __init__(self, host: str, timeout: float = 1.0):
        # Атрибуты экземпляра
        self.host = host           # нет private/public — соглашение
        self.timeout = timeout
        self._open_ports = []      # _ означает "условно приватный"
        self.__secret = "hidden"   # __ означает name mangling
    
    def scan(self, port: int) -> bool:
        """Проверяет, открыт ли порт."""
        # логика сканирования
        return False
    
    def scan_range(self, start: int, end: int) -> list:
        return [p for p in range(start, end + 1) if self.scan(p)]
    
    @property
    def open_ports(self):
        """Свойство — как getter в PHP."""
        return self._open_ports.copy()
    
    @open_ports.setter
    def open_ports(self, ports):
        """Setter."""
        self._open_ports = ports
    
    @classmethod
    def from_hostname(cls, hostname: str):
        """Альтернативный конструктор."""
        import socket
        ip = socket.gethostbyname(hostname)
        return cls(ip)
    
    @staticmethod
    def is_valid_port(port: int) -> bool:
        """Статический метод — не использует self."""
        return 1 <= port <= 65535
    
    def __str__(self) -> str:
        """Аналог __toString() в PHP."""
        return f"PortScanner(host={self.host})"
    
    def __repr__(self) -> str:
        """Представление для отладки."""
        return f"PortScanner(host='{self.host}', timeout={self.timeout})"
    
    def __len__(self) -> int:
        """Позволяет использовать len(scanner)."""
        return len(self._open_ports)


# Наследование
class StealthScanner(PortScanner):
    def __init__(self, host: str, delay: float = 0.5):
        super().__init__(host)  # вызов родительского __init__
        self.delay = delay
    
    def scan(self, port: int) -> bool:
        import time
        time.sleep(self.delay)  # пауза между сканированиями
        return super().scan(port)


# Множественное наследование (уникально для Python)
class Logging:
    def log(self, message: str):
        print(f"[LOG] {message}")

class NetworkScanner(PortScanner, Logging):
    def scan(self, port: int) -> bool:
        self.log(f"Scanning port {port}")
        return super().scan(port)


# Использование
scanner = PortScanner("192.168.1.1")
scanner.scan(80)
print(scanner)               # PortScanner(host=192.168.1.1)
print(repr(scanner))         # PortScanner(host='192.168.1.1', timeout=1.0)

# Создание через альтернативный конструктор
scanner2 = PortScanner.from_hostname("example.com")

# Проверка класса
isinstance(scanner, PortScanner)   # True
type(scanner).__name__             # "PortScanner"

# Dataclasses — современный способ создания простых классов данных
from dataclasses import dataclass, field
from typing import List

@dataclass
class ScanResult:
    ip: str
    open_ports: List[int] = field(default_factory=list)
    hostname: str = ""
    os: str = "Unknown"
    
    def is_alive(self) -> bool:
        return len(self.open_ports) > 0

result = ScanResult(ip="192.168.1.1", open_ports=[22, 80, 443])
print(result)  # ScanResult(ip='192.168.1.1', open_ports=[22, 80, 443], ...)
```

---

## 4.1.10 Обработка исключений

```php
<?php
// PHP исключения
try {
    $connection = new PDO($dsn, $user, $pass);
    if (!$socket = fsockopen($host, $port, $errno, $errstr, $timeout)) {
        throw new RuntimeException("Connection failed: $errstr");
    }
} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage();
} catch (RuntimeException $e) {
    echo "Runtime error: " . $e->getMessage();
} catch (Exception $e) {
    echo "General error: " . $e->getMessage();
} finally {
    echo "Always executed";
}
```

```python
# Python исключения
import socket

try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1)
    result = sock.connect(("192.168.1.1", 80))
except socket.timeout:
    print("Connection timed out")
except ConnectionRefusedError:
    print("Connection refused")
except socket.gaierror as e:
    print(f"DNS error: {e}")
except OSError as e:
    print(f"OS error: {e}")
except Exception as e:
    print(f"Unexpected error: {type(e).__name__}: {e}")
finally:
    sock.close()  # всегда закрывать сокет!

# Создание собственных исключений
class SecurityToolError(Exception):
    """Базовое исключение для инструмента безопасности."""
    pass

class InvalidTargetError(SecurityToolError):
    """Недопустимая цель для сканирования."""
    def __init__(self, target: str, reason: str):
        self.target = target
        self.reason = reason
        super().__init__(f"Invalid target '{target}': {reason}")

class ScanTimeoutError(SecurityToolError):
    pass

# Использование
try:
    raise InvalidTargetError("localhost", "loopback addresses not allowed")
except InvalidTargetError as e:
    print(f"Target error: {e}")
    print(f"Target was: {e.target}")

# Context managers (with) — автоматическое закрытие ресурсов
# Аналог try/finally в PHP
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
    sock.settimeout(1)
    try:
        sock.connect(("192.168.1.1", 80))
        print("Port 80 is open")
    except (socket.timeout, ConnectionRefusedError):
        print("Port 80 is closed")
# sock.close() вызывается автоматически!

# Игнорирование исключений (используйте осторожно!)
try:
    result = int("not a number")
except ValueError:
    pass  # pass — пустой блок (в PHP просто {})

# contextlib.suppress — более питонический способ игнорирования
from contextlib import suppress
with suppress(ValueError, TypeError):
    result = int("not a number")
```

---

## 4.1.11 Работа с файлами

```php
<?php
// PHP файловые операции
$content = file_get_contents("/etc/passwd");
file_put_contents("/tmp/report.txt", $content);

$handle = fopen("/var/log/auth.log", "r");
while (($line = fgets($handle)) !== false) {
    process($line);
}
fclose($handle);

$lines = file("/var/log/syslog", FILE_IGNORE_NEW_LINES);
```

```python
# Python файловые операции

# Чтение всего файла
with open("/etc/passwd", "r") as f:
    content = f.read()

# Чтение строк в список
with open("/etc/passwd", "r") as f:
    lines = f.readlines()       # с символами \n
    lines = f.read().splitlines()  # без \n

# Построчное чтение (экономит память для больших логов!)
with open("/var/log/auth.log", "r") as f:
    for line in f:              # f — итерируемый объект!
        print(line.strip())

# Запись в файл
with open("/tmp/report.txt", "w") as f:    # w — перезапись
    f.write("Scan Report\n")
    f.write("=" * 40 + "\n")

with open("/tmp/report.txt", "a") as f:    # a — добавление
    f.write("Additional data\n")

# Запись нескольких строк
lines = ["192.168.1.1 - open\n", "192.168.1.2 - closed\n"]
with open("/tmp/ips.txt", "w") as f:
    f.writelines(lines)
    # или:
    # f.write("\n".join(lines))

# Кодировка — важно для логов с кириллицей
with open("log.txt", "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

# Двоичный режим — для работы с исполняемыми файлами
with open("/usr/bin/ssh", "rb") as f:
    header = f.read(4)
    print(header.hex())  # "7f454c46" — ELF magic bytes

# pathlib — современный способ работы с путями (Python 3.6+)
from pathlib import Path

log_dir = Path("/var/log")
auth_log = log_dir / "auth.log"    # оператор / для путей!

print(auth_log.exists())           # True/False
print(auth_log.is_file())
print(auth_log.stat().st_size)     # размер файла
print(auth_log.name)               # "auth.log"
print(auth_log.stem)               # "auth"
print(auth_log.suffix)             # ".log"
print(auth_log.parent)             # Path("/var/log")

# Перебор файлов в директории
log_dir = Path("/var/log")
for log_file in log_dir.glob("*.log"):
    print(log_file)

# Рекурсивный поиск
for log_file in log_dir.rglob("*.log"):
    print(log_file)

# Создание директорий
Path("/tmp/security/reports").mkdir(parents=True, exist_ok=True)

# Чтение/запись через pathlib
content = Path("/etc/passwd").read_text()
Path("/tmp/output.txt").write_text("Hello\n")
```

---

## 4.1.12 Модули и пакеты

```php
<?php
// PHP подключение файлов
require_once 'scanner.php';
include 'utils.php';

// Composer autoload
require_once 'vendor/autoload.php';
use App\Security\Scanner;
```

```python
# Python импорт модулей

# Стандартная библиотека
import os
import sys
import socket
import re
import json
import csv
import hashlib
import datetime
import threading
from pathlib import Path

# Импорт конкретных объектов
from datetime import datetime, timedelta
from collections import defaultdict, Counter, OrderedDict
from typing import List, Dict, Optional

# Импорт с псевдонимом
import socket as sock
from datetime import datetime as dt

# Собственный модуль
# Файл: tools/scanner.py
# Импорт: from tools.scanner import PortScanner
# или: import tools.scanner

# Условный импорт
try:
    import requests
except ImportError:
    print("Please install requests: pip install requests")
    sys.exit(1)

# Стандартная библиотека Python — богатейший инструментарий
import hashlib
# MD5, SHA1, SHA256 без дополнительных библиотек
md5 = hashlib.md5(b"hello").hexdigest()
sha256 = hashlib.sha256(b"password").hexdigest()

import base64
encoded = base64.b64encode(b"secret data")
decoded = base64.b64decode(encoded)

import struct
# Работа с бинарными данными (полезно для анализа протоколов)
packed = struct.pack(">HH", 80, 443)  # big-endian два uint16
port1, port2 = struct.unpack(">HH", packed)

import subprocess
# Запуск внешних команд
result = subprocess.run(
    ["nmap", "-sV", "192.168.1.1"],
    capture_output=True,
    text=True,
    timeout=60
)
print(result.stdout)
print(result.returncode)

# __name__ — идиома защиты от непреднамеренного запуска
# (аналог нет в PHP, но концептуально похоже на index.php проверки)
if __name__ == "__main__":
    # Этот код выполнится только при прямом запуске,
    # не при импорте модуля
    main()
```

### Структура пакета Python

```python
# tools/__init__.py — делает директорию пакетом
"""
Security tools package.
"""
from .scanner import PortScanner
from .parser import LogParser
from .reporter import Report

__version__ = "1.0.0"
__all__ = ["PortScanner", "LogParser", "Report"]

# tools/scanner.py
class PortScanner:
    pass

# tools/parser.py
class LogParser:
    pass

# main.py — точка входа
from tools import PortScanner, LogParser

def main():
    scanner = PortScanner("192.168.1.1")
    # ...

if __name__ == "__main__":
    main()
```

---

## 4.1.13 Полезные стандартные библиотеки для безопасности

```python
# collections — продвинутые структуры данных
from collections import Counter, defaultdict

# Counter — подсчёт элементов
log_lines = ["192.168.1.1", "10.0.0.1", "192.168.1.1", "192.168.1.1"]
ip_counts = Counter(log_lines)
print(ip_counts.most_common(3))  # топ-3 IP по количеству

# defaultdict — словарь с значением по умолчанию
attacks = defaultdict(list)
attacks["192.168.1.1"].append("ssh")  # не нужна проверка на существование ключа
attacks["192.168.1.1"].append("http")

# datetime — работа с датами и временем
from datetime import datetime, timedelta
import time

now = datetime.now()
print(now.strftime("%Y-%m-%d %H:%M:%S"))

# Парсинг временной метки из лога
log_time = datetime.strptime("2024-01-15 10:30:45", "%Y-%m-%d %H:%M:%S")
log_timestamp = log_time.timestamp()  # Unix timestamp

# Сравнение времён
one_hour_ago = datetime.now() - timedelta(hours=1)
if log_time > one_hour_ago:
    print("Recent event!")

# ipaddress — работа с IP-адресами и подсетями
import ipaddress

ip = ipaddress.ip_address("192.168.1.1")
network = ipaddress.ip_network("192.168.1.0/24")

print(ip in network)          # True
print(network.network_address)  # 192.168.1.0
print(network.broadcast_address)  # 192.168.1.255
print(list(network.hosts())[:5])  # первые 5 хостов

# Перебор всех IP в подсети
for host_ip in network.hosts():
    print(host_ip)

# hashlib — хэширование
import hashlib

def hash_file(filepath: str) -> dict:
    """Вычислить MD5, SHA1, SHA256 файла."""
    hashes = {
        "md5": hashlib.md5(),
        "sha1": hashlib.sha1(),
        "sha256": hashlib.sha256()
    }
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            for h in hashes.values():
                h.update(chunk)
    return {name: h.hexdigest() for name, h in hashes.items()}

# argparse — разбор аргументов командной строки
import argparse

parser = argparse.ArgumentParser(
    description="Security Scanner Tool",
    formatter_class=argparse.RawDescriptionHelpFormatter
)
parser.add_argument("target", help="Target IP or hostname")
parser.add_argument("-p", "--ports", default="1-1024",
                    help="Port range (default: 1-1024)")
parser.add_argument("-t", "--timeout", type=float, default=1.0,
                    help="Connection timeout in seconds")
parser.add_argument("-v", "--verbose", action="store_true",
                    help="Enable verbose output")
parser.add_argument("-o", "--output", help="Output file for results")

args = parser.parse_args()
print(args.target)   # "192.168.1.1"
print(args.verbose)  # True/False
```

---

## 4.1.14 Форматирование вывода для инструментов безопасности

```python
# colorama — цветной вывод (работает на Windows тоже)
from colorama import Fore, Back, Style, init
init(autoreset=True)  # автосброс цвета после каждого print

print(Fore.GREEN + "[+] Port 80 is OPEN")
print(Fore.RED + "[-] Port 81 is CLOSED")
print(Fore.YELLOW + "[*] Scanning...")
print(Fore.CYAN + "[i] Info message")

# tabulate — таблицы
from tabulate import tabulate

scan_data = [
    ["192.168.1.1", 22, "SSH", "Open"],
    ["192.168.1.1", 80, "HTTP", "Open"],
    ["192.168.1.1", 443, "HTTPS", "Open"],
]
headers = ["IP", "Port", "Service", "Status"]
print(tabulate(scan_data, headers=headers, tablefmt="grid"))

# Результат:
# +-------------+--------+---------+----------+
# | IP          |   Port | Service | Status   |
# +=============+========+=========+==========+
# | 192.168.1.1 |     22 | SSH     | Open     |
# +-------------+--------+---------+----------+
# | 192.168.1.1 |     80 | HTTP    | Open     |
# +-------------+--------+---------+----------+

# Прогресс-бар для длительных операций
from tqdm import tqdm

ports = range(1, 1025)
for port in tqdm(ports, desc="Scanning", unit="port"):
    # scan logic
    pass

# Простой собственный прогресс-бар
def progress_bar(current, total, width=50):
    filled = int(width * current / total)
    bar = "█" * filled + "░" * (width - filled)
    percent = current / total * 100
    print(f"\r[{bar}] {percent:.1f}% ({current}/{total})", end="", flush=True)
    if current == total:
        print()  # перевод строки в конце
```

---

## 🔧 Практические задания

### Задание 1: Конвертер синтаксиса

Перепишите следующий PHP-код на Python:

```php
<?php
function analyzeIps(array $logs): array {
    $result = [];
    foreach ($logs as $line) {
        if (preg_match('/(\d{1,3}\.){3}\d{1,3}/', $line, $matches)) {
            $ip = $matches[0];
            $result[$ip] = ($result[$ip] ?? 0) + 1;
        }
    }
    arsort($result);
    return array_slice($result, 0, 10, true);
}
```

### Задание 2: Инструмент хэширования файлов

Создайте скрипт, который:
- Принимает путь к директории как аргумент командной строки
- Вычисляет SHA256 всех файлов в директории
- Выводит результаты в таблице (с tabulate)
- Сохраняет результаты в JSON файл

### Задание 3: Анализатор паролей

Напишите функцию `analyze_password(password: str) -> dict`, которая возвращает:
- Длину пароля
- Наличие заглавных букв, цифр, специальных символов
- Оценку стойкости (weak/medium/strong)
- Время перебора (приблизительное)

### Задание 4: Сканер директорий

Напишите класс `DirectoryScanner`, который:
- Принимает корневую директорию
- Находит файлы с опасными расширениями (.php, .sh, .py, .exe)
- Находит файлы с подозрительными именами (backdoor, shell, cmd)
- Генерирует отчёт в формате JSON

---

## 📚 Дополнительные ресурсы

- **Официальная документация Python:** https://docs.python.org/3/
- **Python для безопасников:** "Black Hat Python" — Justin Seitz
- **Real Python:** https://realpython.com — практические руководства
- **Python Cookbook:** продвинутые рецепты от David Beazley
- **Type Hints:** https://mypy.readthedocs.io
- **PEP 8 — Style Guide:** https://pep8.org
- **Python Security:** https://python-security.readthedocs.io

---

## ✅ Итоги главы

В этой главе вы освоили фундамент Python с точки зрения PHP-разработчика:

| Концепция | PHP | Python |
|-----------|-----|--------|
| Переменные | `$var` | `var` |
| Тип None | `null` | `None` |
| Логические | `true/false` | `True/False` |
| Строка в переменных | `"Hello $name"` | `f"Hello {name}"` |
| Массив | `array()` / `[]` | `list` / `[]` |
| Ассоциативный массив | `["key" => "val"]` | `{"key": "val"}` |
| Цикл по массиву | `foreach` | `for item in list` |
| Функция | `function foo($x)` | `def foo(x):` |
| Класс конструктор | `__construct()` | `__init__()` |
| Подключение файла | `require_once` | `import` |
| Блок кода | `{}` | `:` + отступы |

**Ключевые выводы:**

1. Python использует отступы вместо фигурных скобок — это не опционально
2. Нет знака `$` перед переменными
3. `True`, `False`, `None` — с заглавной буквы
4. f-strings — самый современный и удобный способ форматирования
5. List comprehensions заменяют `array_map` + `array_filter`
6. `with` (context manager) — используйте для файлов и сетевых соединений
7. Виртуальные окружения обязательны для каждого проекта
8. `__name__ == "__main__"` — стандартная точка входа

В следующей главе мы перейдём к практике: работе с сетью через библиотеки `requests` и `socket`.
