# Глава 2.5: Заголовки HTTP и редиректы

## header(), коды ответов, Content-Type, работа с JSON

---

## Зачем нужны HTTP-заголовки?

HTTP-заголовки — это **метаданные** запроса и ответа. Они говорят браузеру и серверу как обрабатывать данные.

```
┌─────────────────────────────────────────────────────────────────┐
│                    HTTP ЗАГОЛОВКИ                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ЧТО МОЖНО ДЕЛАТЬ С ЗАГОЛОВКАМИ:                              │
│                                                                 │
│   🔄 Редиректы        Перенаправить на другую страницу         │
│   📄 Тип контента     Указать формат (HTML, JSON, PDF)         │
│   🔒 Безопасность     CORS, CSP, X-Frame-Options              │
│   📦 Кеширование      Cache-Control, Expires, ETag             │
│   🍪 Cookies          Set-Cookie для установки куки            │
│   📥 Скачивание       Content-Disposition для файлов           │
│   🔐 Авторизация      WWW-Authenticate, Authorization          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Функция header()

### Базовое использование

```php
<?php
// Синтаксис: header(string $header, bool $replace = true, int $response_code = 0)

// Установить заголовок
header('Content-Type: application/json');

// $replace = true (по умолчанию) — заменить предыдущий заголовок того же типа
header('X-Custom-Header: value1');
header('X-Custom-Header: value2');  // Заменит первый

// $replace = false — добавить ещё один заголовок
header('Set-Cookie: name1=value1', false);
header('Set-Cookie: name2=value2', false);  // Добавит второй

// Третий параметр — код ответа
header('Location: /login', true, 302);
```

### ⚠️ Главное правило: заголовки ДО вывода!

```php
<?php
// ❌ ОШИБКА! Вывод до header()
echo "Hello";
header('Location: /other-page');
// Warning: Cannot modify header information - headers already sent

// ❌ Даже пробел или BOM перед <?php вызовет ошибку!
// (пустая строка в начале файла)
 <?php
header('Location: /other-page');  // Ошибка!

// ✅ ПРАВИЛЬНО: header() до любого вывода
<?php
header('Location: /other-page');
exit;

// ✅ Или используй output buffering
<?php
ob_start();
echo "Это не отправится сразу";
header('Location: /other-page');  // Работает!
ob_end_clean();  // Очистить буфер
exit;
```

### Проверка: отправлены ли заголовки?

```php
<?php
// headers_sent() — проверить, отправлены ли заголовки

if (headers_sent($file, $line)) {
    // Заголовки уже отправлены
    die("Заголовки отправлены в файле $file на строке $line");
}

// Безопасный редирект
function safeRedirect(string $url): void {
    if (headers_sent()) {
        // Fallback: JavaScript редирект
        echo "<script>window.location.href = " . json_encode($url) . ";</script>";
        echo "<noscript>";
        echo "<meta http-equiv='refresh' content='0;url=" . htmlspecialchars($url) . "'>";
        echo "</noscript>";
    } else {
        header("Location: $url");
    }
    exit;
}
```

### Получение списка заголовков

```php
<?php
// Заголовки, которые будут отправлены
header('Content-Type: application/json');
header('X-Custom: value');

$headers = headers_list();
print_r($headers);
// ['Content-Type: application/json', 'X-Custom: value']

// Удалить заголовок
header_remove('X-Custom');

// Удалить все заголовки
header_remove();
```

---

## 2. Коды состояния HTTP

### Установка кода ответа

```php
<?php
// Способ 1: через header()
header('HTTP/1.1 404 Not Found');

// Способ 2: http_response_code() (рекомендуется)
http_response_code(404);

// Получить текущий код
$code = http_response_code();  // 404

// Способ 3: третий параметр header()
header('Location: /new-page', true, 301);
```

### Основные коды состояния

```
┌───────┬──────────────────────────────────────────────────────────┐
│ Код   │ Описание и когда использовать                            │
├───────┼──────────────────────────────────────────────────────────┤
│       │ 2xx — УСПЕХ                                              │
├───────┼──────────────────────────────────────────────────────────┤
│ 200   │ OK — стандартный успешный ответ                         │
│ 201   │ Created — ресурс создан (после POST)                    │
│ 204   │ No Content — успех, но тело пустое (после DELETE)       │
├───────┼──────────────────────────────────────────────────────────┤
│       │ 3xx — ПЕРЕНАПРАВЛЕНИЕ                                    │
├───────┼──────────────────────────────────────────────────────────┤
│ 301   │ Moved Permanently — постоянный редирект (SEO)           │
│ 302   │ Found — временный редирект (по умолчанию)               │
│ 303   │ See Other — редирект после POST (PRG паттерн)           │
│ 304   │ Not Modified — использовать кеш                         │
│ 307   │ Temporary Redirect — сохранить метод запроса            │
│ 308   │ Permanent Redirect — постоянный, сохранить метод        │
├───────┼──────────────────────────────────────────────────────────┤
│       │ 4xx — ОШИБКА КЛИЕНТА                                     │
├───────┼──────────────────────────────────────────────────────────┤
│ 400   │ Bad Request — неверный запрос                           │
│ 401   │ Unauthorized — требуется авторизация                    │
│ 403   │ Forbidden — доступ запрещён                             │
│ 404   │ Not Found — ресурс не найден                            │
│ 405   │ Method Not Allowed — метод не разрешён                  │
│ 409   │ Conflict — конфликт (например, дубликат)                │
│ 422   │ Unprocessable Entity — ошибка валидации                 │
│ 429   │ Too Many Requests — превышен лимит запросов             │
├───────┼──────────────────────────────────────────────────────────┤
│       │ 5xx — ОШИБКА СЕРВЕРА                                     │
├───────┼──────────────────────────────────────────────────────────┤
│ 500   │ Internal Server Error — ошибка сервера                  │
│ 502   │ Bad Gateway — ошибка шлюза                              │
│ 503   │ Service Unavailable — сервис недоступен                 │
│ 504   │ Gateway Timeout — таймаут шлюза                         │
└───────┴──────────────────────────────────────────────────────────┘
```

### Практическое использование кодов

```php
<?php
// 404 — страница не найдена
function notFound(): never {
    http_response_code(404);
    include 'views/errors/404.php';
    exit;
}

// 403 — доступ запрещён
function forbidden(): never {
    http_response_code(403);
    include 'views/errors/403.php';
    exit;
}

// 401 — требуется авторизация
function unauthorized(): never {
    http_response_code(401);
    header('WWW-Authenticate: Basic realm="Admin Area"');
    echo 'Требуется авторизация';
    exit;
}

// 500 — внутренняя ошибка
function serverError(\Throwable $e): never {
    http_response_code(500);
    
    if ($_ENV['APP_DEBUG'] === 'true') {
        echo "<h1>Error</h1>";
        echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
        echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
    } else {
        include 'views/errors/500.php';
    }
    
    exit;
}

// 503 — сервис временно недоступен (техработы)
function maintenance(): never {
    http_response_code(503);
    header('Retry-After: 3600');  // Попробовать через час
    include 'views/maintenance.php';
    exit;
}
```

---

## 3. Редиректы

### Типы редиректов

```php
<?php
// 302 Found — временный редирект (по умолчанию)
// Браузер может закешировать, метод может измениться на GET
header('Location: /new-page');
exit;

// 301 Moved Permanently — постоянный редирект
// Для SEO: передаёт "вес" страницы на новый URL
header('Location: /new-url', true, 301);
exit;

// 303 See Other — после POST перенаправить на GET
// PRG (Post-Redirect-Get) паттерн
header('Location: /success', true, 303);
exit;

// 307 Temporary Redirect — временный, сохраняет метод
// POST останется POST (в отличие от 302)
header('Location: /api/v2/endpoint', true, 307);
exit;

// 308 Permanent Redirect — постоянный, сохраняет метод
header('Location: /api/v2/endpoint', true, 308);
exit;
```

### Функция редиректа

```php
<?php
/**
 * Безопасный редирект
 */
function redirect(string $url, int $code = 302): never {
    // Валидация URL
    if (!filter_var($url, FILTER_VALIDATE_URL) && !str_starts_with($url, '/')) {
        throw new InvalidArgumentException("Invalid redirect URL: $url");
    }
    
    // Защита от Open Redirect
    $parsed = parse_url($url);
    if (isset($parsed['host'])) {
        $allowedHosts = ['example.com', 'www.example.com'];
        if (!in_array($parsed['host'], $allowedHosts, true)) {
            throw new InvalidArgumentException("Redirect to external host not allowed");
        }
    }
    
    http_response_code($code);
    header("Location: $url");
    exit;
}

// Редирект на предыдущую страницу
function back(string $default = '/'): never {
    $referer = $_SERVER['HTTP_REFERER'] ?? $default;
    redirect($referer);
}

// Редирект с flash-сообщением
function redirectWithMessage(string $url, string $type, string $message): never {
    $_SESSION['flash'] = [
        'type' => $type,
        'message' => $message,
    ];
    redirect($url);
}

// Использование
redirectWithMessage('/products', 'success', 'Товар создан!');
```

### PRG Pattern (Post-Redirect-Get)

```php
<?php
// Проблема: при обновлении страницы после POST форма отправляется повторно

// ❌ Без PRG
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    createOrder($_POST);
    echo "Заказ создан";  // F5 = повторный заказ!
}

// ✅ С PRG
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $orderId = createOrder($_POST);
    
    $_SESSION['flash'] = "Заказ #$orderId создан!";
    
    // Редирект на GET-страницу
    header('Location: /orders/' . $orderId, true, 303);
    exit;
}

// Страница заказа (GET)
$flash = $_SESSION['flash'] ?? null;
unset($_SESSION['flash']);

if ($flash) {
    echo "<div class='alert'>$flash</div>";
}
// F5 просто обновит GET-страницу, не создаст новый заказ
```

### Open Redirect — уязвимость

```php
<?php
// ❌ УЯЗВИМОСТЬ: Open Redirect
// URL: /redirect?url=https://evil-site.com/phishing
$url = $_GET['url'];
header("Location: $url");  // Отправит на фишинговый сайт!

// ✅ ЗАЩИТА: Проверять URL
function safeRedirect(string $url): never {
    // Только относительные URL
    if (str_starts_with($url, '/') && !str_starts_with($url, '//')) {
        header("Location: $url");
        exit;
    }
    
    // Или белый список доменов
    $parsed = parse_url($url);
    $allowedHosts = ['mysite.com', 'www.mysite.com'];
    
    if (isset($parsed['host']) && !in_array($parsed['host'], $allowedHosts, true)) {
        header('Location: /');  // На главную
        exit;
    }
    
    header("Location: $url");
    exit;
}
```

---

## 4. Content-Type заголовок

### Основные типы контента

```php
<?php
// HTML (по умолчанию)
header('Content-Type: text/html; charset=UTF-8');

// JSON
header('Content-Type: application/json; charset=UTF-8');

// XML
header('Content-Type: application/xml; charset=UTF-8');

// Plain text
header('Content-Type: text/plain; charset=UTF-8');

// CSS
header('Content-Type: text/css; charset=UTF-8');

// JavaScript
header('Content-Type: application/javascript; charset=UTF-8');

// Изображения
header('Content-Type: image/png');
header('Content-Type: image/jpeg');
header('Content-Type: image/gif');
header('Content-Type: image/webp');
header('Content-Type: image/svg+xml');

// PDF
header('Content-Type: application/pdf');

// Бинарные данные / скачивание
header('Content-Type: application/octet-stream');

// Формы
header('Content-Type: application/x-www-form-urlencoded');
header('Content-Type: multipart/form-data');
```

### Отдача файлов для скачивания

```php
<?php
function downloadFile(string $path, ?string $filename = null): never {
    if (!file_exists($path)) {
        http_response_code(404);
        exit('File not found');
    }
    
    $filename = $filename ?? basename($path);
    $size = filesize($path);
    $mime = mime_content_type($path) ?: 'application/octet-stream';
    
    // Заголовки для скачивания
    header('Content-Type: ' . $mime);
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . $size);
    header('Cache-Control: no-cache, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    // Отдать файл
    readfile($path);
    exit;
}

// Использование
downloadFile('/var/uploads/report.pdf', 'monthly-report.pdf');
```

### Отдача файла inline (в браузере)

```php
<?php
function serveFile(string $path): never {
    if (!file_exists($path)) {
        http_response_code(404);
        exit;
    }
    
    $mime = mime_content_type($path);
    $size = filesize($path);
    
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . $size);
    header('Content-Disposition: inline');  // Показать в браузере
    
    readfile($path);
    exit;
}

// PDF откроется в браузере, а не скачается
serveFile('/var/uploads/document.pdf');
```

### Динамическая генерация изображений

```php
<?php
// Генерация PNG
header('Content-Type: image/png');

$image = imagecreatetruecolor(200, 100);
$white = imagecolorallocate($image, 255, 255, 255);
$black = imagecolorallocate($image, 0, 0, 0);

imagefill($image, 0, 0, $white);
imagestring($image, 5, 50, 40, 'Hello!', $black);

imagepng($image);
imagedestroy($image);

// Генерация captcha
function generateCaptcha(): void {
    $code = substr(str_shuffle('ABCDEFGHJKLMNPQRSTUVWXYZ23456789'), 0, 5);
    $_SESSION['captcha'] = $code;
    
    header('Content-Type: image/png');
    header('Cache-Control: no-store, no-cache');
    
    $image = imagecreatetruecolor(150, 50);
    $bg = imagecolorallocate($image, 240, 240, 240);
    $text = imagecolorallocate($image, 50, 50, 50);
    
    imagefill($image, 0, 0, $bg);
    
    // Добавить шум
    for ($i = 0; $i < 100; $i++) {
        imagesetpixel($image, rand(0, 150), rand(0, 50), $text);
    }
    
    imagestring($image, 5, 40, 15, $code, $text);
    
    imagepng($image);
    imagedestroy($image);
}
```

---

## 5. Работа с JSON

### Отправка JSON ответа

```php
<?php
// Базовый JSON ответ
header('Content-Type: application/json; charset=UTF-8');
echo json_encode(['status' => 'ok', 'message' => 'Hello']);

// Функция для JSON ответа
function json(mixed $data, int $code = 200): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=UTF-8');
    
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Успешный ответ
function jsonSuccess(mixed $data = null, string $message = 'OK'): never {
    json([
        'success' => true,
        'message' => $message,
        'data' => $data,
    ]);
}

// Ответ с ошибкой
function jsonError(string $message, int $code = 400, array $errors = []): never {
    $response = [
        'success' => false,
        'message' => $message,
    ];
    
    if ($errors) {
        $response['errors'] = $errors;
    }
    
    json($response, $code);
}

// Использование
jsonSuccess(['user' => ['id' => 1, 'name' => 'Иван']]);
jsonError('Validation failed', 422, ['email' => 'Email обязателен']);
```

### Параметры json_encode

```php
<?php
$data = [
    'name' => 'Иван',
    'url' => 'https://example.com/path',
    'price' => 1000.50,
    'active' => true,
    'tags' => ['php', 'web'],
];

// Без флагов — Unicode экранируется
echo json_encode($data);
// {"name":"\u0418\u0432\u0430\u043d",...}

// JSON_UNESCAPED_UNICODE — кириллица как есть
echo json_encode($data, JSON_UNESCAPED_UNICODE);
// {"name":"Иван",...}

// JSON_UNESCAPED_SLASHES — слеши не экранируются
echo json_encode($data, JSON_UNESCAPED_SLASHES);
// {"url":"https://example.com/path",...}

// JSON_PRETTY_PRINT — форматированный вывод
echo json_encode($data, JSON_PRETTY_PRINT);
/*
{
    "name": "Иван",
    "url": "https:\/\/example.com\/path",
    ...
}
*/

// Комбинация флагов
echo json_encode($data, 
    JSON_UNESCAPED_UNICODE | 
    JSON_UNESCAPED_SLASHES | 
    JSON_PRETTY_PRINT
);

// JSON_THROW_ON_ERROR — выбросить исключение при ошибке
try {
    $json = json_encode($data, JSON_THROW_ON_ERROR);
} catch (JsonException $e) {
    echo "JSON error: " . $e->getMessage();
}

// JSON_NUMERIC_CHECK — числовые строки как числа
$data = ['price' => '100'];
echo json_encode($data, JSON_NUMERIC_CHECK);
// {"price":100}

// JSON_PRESERVE_ZERO_FRACTION — сохранить .0 для float
$data = ['price' => 100.0];
echo json_encode($data, JSON_PRESERVE_ZERO_FRACTION);
// {"price":100.0}
```

### Получение JSON из запроса

```php
<?php
// Чтение JSON из тела запроса
function getJsonInput(): array {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    
    if (!str_contains($contentType, 'application/json')) {
        return [];
    }
    
    $raw = file_get_contents('php://input');
    
    if (empty($raw)) {
        return [];
    }
    
    try {
        $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        return is_array($data) ? $data : [];
    } catch (JsonException $e) {
        return [];
    }
}

// Использование
$input = getJsonInput();
$name = $input['name'] ?? '';
$email = $input['email'] ?? '';
```

### Полный пример JSON API

```php
<?php
// api.php — простой JSON API

header('Content-Type: application/json; charset=UTF-8');

// CORS заголовки (если API используется с другого домена)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Preflight запрос
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Функции ответа
function json(mixed $data, int $code = 200): never {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $message, int $code = 400): never {
    json(['error' => true, 'message' => $message], $code);
}

// Получить JSON из тела запроса
function input(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

// Роутинг
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#^/api#', '', $path);  // Убрать /api

// Простая БД
$pdo = new PDO('sqlite:' . __DIR__ . '/database.sqlite');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

// Маршруты
switch (true) {
    // GET /api/users — список пользователей
    case $path === '/users' && $method === 'GET':
        $users = $pdo->query("SELECT id, name, email FROM users")->fetchAll();
        json(['users' => $users]);
        break;
    
    // GET /api/users/{id} — один пользователь
    case preg_match('#^/users/(\d+)$#', $path, $m) && $method === 'GET':
        $stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE id = ?");
        $stmt->execute([$m[1]]);
        $user = $stmt->fetch();
        
        if (!$user) {
            jsonError('User not found', 404);
        }
        
        json(['user' => $user]);
        break;
    
    // POST /api/users — создать пользователя
    case $path === '/users' && $method === 'POST':
        $data = input();
        
        if (empty($data['name']) || empty($data['email'])) {
            jsonError('Name and email required', 422);
        }
        
        $stmt = $pdo->prepare("INSERT INTO users (name, email) VALUES (?, ?)");
        $stmt->execute([$data['name'], $data['email']]);
        
        $id = $pdo->lastInsertId();
        
        json([
            'user' => [
                'id' => (int) $id,
                'name' => $data['name'],
                'email' => $data['email'],
            ]
        ], 201);
        break;
    
    // PUT /api/users/{id} — обновить пользователя
    case preg_match('#^/users/(\d+)$#', $path, $m) && $method === 'PUT':
        $data = input();
        
        $stmt = $pdo->prepare("UPDATE users SET name = ?, email = ? WHERE id = ?");
        $stmt->execute([$data['name'] ?? '', $data['email'] ?? '', $m[1]]);
        
        if ($stmt->rowCount() === 0) {
            jsonError('User not found', 404);
        }
        
        json(['message' => 'Updated']);
        break;
    
    // DELETE /api/users/{id} — удалить пользователя
    case preg_match('#^/users/(\d+)$#', $path, $m) && $method === 'DELETE':
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$m[1]]);
        
        if ($stmt->rowCount() === 0) {
            jsonError('User not found', 404);
        }
        
        json(['message' => 'Deleted']);
        break;
    
    default:
        jsonError('Not found', 404);
}
```

---

## 6. Кеширование

### Cache-Control

```php
<?php
// Отключить кеширование полностью
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');  // Для HTTP/1.0
header('Expires: 0');

// Кешировать на 1 час
header('Cache-Control: public, max-age=3600');

// Кешировать на 1 день, но проверять валидность
header('Cache-Control: public, max-age=86400, must-revalidate');

// Приватный кеш (только браузер, не CDN)
header('Cache-Control: private, max-age=3600');

// Иммутабельный контент (никогда не меняется)
// Для файлов с хешем в имени: style.a1b2c3.css
header('Cache-Control: public, max-age=31536000, immutable');
```

### ETag (Entity Tag)

```php
<?php
function serveWithEtag(string $content, string $contentType = 'text/html'): void {
    // Генерируем ETag из содержимого
    $etag = '"' . md5($content) . '"';
    
    // Проверяем, есть ли у клиента актуальная версия
    $clientEtag = $_SERVER['HTTP_IF_NONE_MATCH'] ?? '';
    
    if ($clientEtag === $etag) {
        // Контент не изменился
        http_response_code(304);
        exit;
    }
    
    header('Content-Type: ' . $contentType);
    header('ETag: ' . $etag);
    header('Cache-Control: public, max-age=3600');
    
    echo $content;
}

// Использование
$html = renderPage();
serveWithEtag($html);
```

### Last-Modified

```php
<?php
function serveFileWithCaching(string $path): void {
    if (!file_exists($path)) {
        http_response_code(404);
        exit;
    }
    
    $lastModified = filemtime($path);
    $etag = '"' . md5_file($path) . '"';
    
    // Проверить If-Modified-Since
    if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE'])) {
        $ifModifiedSince = strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']);
        if ($ifModifiedSince >= $lastModified) {
            http_response_code(304);
            exit;
        }
    }
    
    // Проверить If-None-Match
    if (isset($_SERVER['HTTP_IF_NONE_MATCH'])) {
        if ($_SERVER['HTTP_IF_NONE_MATCH'] === $etag) {
            http_response_code(304);
            exit;
        }
    }
    
    header('Content-Type: ' . mime_content_type($path));
    header('Content-Length: ' . filesize($path));
    header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $lastModified) . ' GMT');
    header('ETag: ' . $etag);
    header('Cache-Control: public, max-age=86400');
    
    readfile($path);
}
```

---

## 7. Заголовки безопасности

### Основные заголовки безопасности

```php
<?php
// Защита от clickjacking (встраивание в iframe)
header('X-Frame-Options: DENY');
// или
header('X-Frame-Options: SAMEORIGIN');  // Только со своего домена

// Защита от MIME-sniffing
header('X-Content-Type-Options: nosniff');

// XSS фильтр (устарел, но не вредит)
header('X-XSS-Protection: 1; mode=block');

// Referrer Policy
header('Referrer-Policy: strict-origin-when-cross-origin');

// Permissions Policy (ограничение API браузера)
header('Permissions-Policy: geolocation=(), microphone=(), camera=()');

// HSTS — принудительный HTTPS
header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
```

### Content Security Policy (CSP)

```php
<?php
// Базовый CSP — только свои ресурсы
header("Content-Security-Policy: default-src 'self'");

// Разрешить inline скрипты (менее безопасно!)
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'");

// Разрешить скрипты с CDN
header("Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net");

// Комплексный CSP
$csp = [
    "default-src 'self'",
    "script-src 'self' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.example.com",
    "frame-ancestors 'none'",
];
header('Content-Security-Policy: ' . implode('; ', $csp));

// Report-Only режим (не блокирует, только логирует)
header('Content-Security-Policy-Report-Only: default-src \'self\'; report-uri /csp-report');
```

### Функция установки всех заголовков безопасности

```php
<?php
function setSecurityHeaders(): void {
    // Только через HTTPS
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
    
    header('X-Frame-Options: DENY');
    header('X-Content-Type-Options: nosniff');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
    
    // CSP
    $csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'";
    header('Content-Security-Policy: ' . $csp);
}

// Вызвать в начале каждого запроса
setSecurityHeaders();
```

---

## 8. CORS (Cross-Origin Resource Sharing)

### Что такое CORS?

```
┌─────────────────────────────────────────────────────────────────┐
│                         CORS                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Браузер запрещает запросы с одного домена на другой          │
│   (Same-Origin Policy)                                         │
│                                                                 │
│   https://frontend.com  →  https://api.backend.com             │
│           ❌ Заблокировано браузером                            │
│                                                                 │
│   CORS — механизм, позволяющий серверу разрешить такие запросы │
│                                                                 │
│   Сервер отвечает:                                             │
│   Access-Control-Allow-Origin: https://frontend.com            │
│           ✅ Разрешено                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Простые CORS заголовки

```php
<?php
// Разрешить запросы с любого домена (для публичного API)
header('Access-Control-Allow-Origin: *');

// Разрешить запросы только с определённого домена
header('Access-Control-Allow-Origin: https://frontend.example.com');

// Разрешить cookies
header('Access-Control-Allow-Credentials: true');
// При этом Access-Control-Allow-Origin НЕ МОЖЕТ быть *

// Разрешённые методы
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

// Разрешённые заголовки
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Как долго кешировать preflight запрос
header('Access-Control-Max-Age: 86400');  // 24 часа
```

### Полная обработка CORS

```php
<?php
function handleCors(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    // Белый список доменов
    $allowedOrigins = [
        'https://frontend.example.com',
        'https://app.example.com',
    ];
    
    // Для разработки
    if ($_ENV['APP_DEBUG'] === 'true') {
        $allowedOrigins[] = 'http://localhost:3000';
        $allowedOrigins[] = 'http://localhost:5173';
    }
    
    if (in_array($origin, $allowedOrigins, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');  // Важно для кеширования!
    }
    
    // Preflight запрос
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Max-Age: 86400');
        http_response_code(204);
        exit;
    }
}

// Вызвать в начале обработки API запросов
handleCors();
```

---

## 9. Получение заголовков запроса

### Доступ к заголовкам

```php
<?php
// Через $_SERVER (заголовки преобразуются)
// Authorization → HTTP_AUTHORIZATION
// Content-Type → CONTENT_TYPE
// Accept → HTTP_ACCEPT

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? null;
$contentType = $_SERVER['CONTENT_TYPE'] ?? null;
$accept = $_SERVER['HTTP_ACCEPT'] ?? null;
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;

// Функция getallheaders() — все заголовки
$headers = getallheaders();
/*
[
    'Host' => 'example.com',
    'User-Agent' => 'Mozilla/5.0...',
    'Accept' => 'text/html',
    'Authorization' => 'Bearer token123',
    'Content-Type' => 'application/json',
]
*/

// Получить конкретный заголовок (регистронезависимо)
function getHeader(string $name): ?string {
    $headers = getallheaders();
    
    foreach ($headers as $key => $value) {
        if (strcasecmp($key, $name) === 0) {
            return $value;
        }
    }
    
    return null;
}

$token = getHeader('Authorization');
$contentType = getHeader('Content-Type');
```

### Работа с Accept заголовком

```php
<?php
// Accept: text/html,application/json;q=0.9,*/*;q=0.8

function parseAccept(): array {
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '*/*';
    $types = [];
    
    foreach (explode(',', $accept) as $part) {
        $part = trim($part);
        $q = 1.0;
        
        if (preg_match('/;q=([0-9.]+)/', $part, $m)) {
            $q = (float) $m[1];
            $part = preg_replace('/;q=[0-9.]+/', '', $part);
        }
        
        $types[] = ['type' => trim($part), 'q' => $q];
    }
    
    // Сортировать по приоритету
    usort($types, fn($a, $b) => $b['q'] <=> $a['q']);
    
    return array_column($types, 'type');
}

function wantsJson(): bool {
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    return str_contains($accept, 'application/json');
}

function prefersHtml(): bool {
    $types = parseAccept();
    $jsonPos = array_search('application/json', $types);
    $htmlPos = array_search('text/html', $types);
    
    if ($jsonPos === false) return true;
    if ($htmlPos === false) return false;
    
    return $htmlPos < $jsonPos;
}

// Использование в контроллере
if (wantsJson()) {
    json(['user' => $user]);
} else {
    echo view('users/show', ['user' => $user]);
}
```

---

## 10. Практические примеры

### Класс Response

```php
<?php
class Response {
    private int $statusCode = 200;
    private array $headers = [];
    private string $body = '';
    
    public function setStatusCode(int $code): self {
        $this->statusCode = $code;
        return $this;
    }
    
    public function setHeader(string $name, string $value): self {
        $this->headers[$name] = $value;
        return $this;
    }
    
    public function setBody(string $body): self {
        $this->body = $body;
        return $this;
    }
    
    public function send(): never {
        http_response_code($this->statusCode);
        
        foreach ($this->headers as $name => $value) {
            header("$name: $value");
        }
        
        echo $this->body;
        exit;
    }
    
    // Фабричные методы
    public static function html(string $content, int $code = 200): self {
        return (new self())
            ->setStatusCode($code)
            ->setHeader('Content-Type', 'text/html; charset=UTF-8')
            ->setBody($content);
    }
    
    public static function json(mixed $data, int $code = 200): self {
        return (new self())
            ->setStatusCode($code)
            ->setHeader('Content-Type', 'application/json; charset=UTF-8')
            ->setBody(json_encode($data, JSON_UNESCAPED_UNICODE));
    }
    
    public static function redirect(string $url, int $code = 302): self {
        return (new self())
            ->setStatusCode($code)
            ->setHeader('Location', $url);
    }
    
    public static function download(string $path, ?string $filename = null): self {
        $filename = $filename ?? basename($path);
        $mime = mime_content_type($path) ?: 'application/octet-stream';
        
        return (new self())
            ->setHeader('Content-Type', $mime)
            ->setHeader('Content-Disposition', 'attachment; filename="' . $filename . '"')
            ->setHeader('Content-Length', (string) filesize($path))
            ->setBody(file_get_contents($path));
    }
    
    public static function notFound(string $message = 'Not Found'): self {
        return self::json(['error' => $message], 404);
    }
    
    public static function error(string $message, int $code = 500): self {
        return self::json(['error' => $message], $code);
    }
}

// Использование
Response::json(['users' => $users])->send();
Response::redirect('/login')->send();
Response::download('/files/report.pdf')->send();
Response::notFound()->send();
```

### Middleware для заголовков

```php
<?php
interface Middleware {
    public function handle(callable $next): mixed;
}

class SecurityHeadersMiddleware implements Middleware {
    public function handle(callable $next): mixed {
        header('X-Frame-Options: DENY');
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        
        return $next();
    }
}

class CorsMiddleware implements Middleware {
    private array $allowedOrigins;
    
    public function __construct(array $allowedOrigins = ['*']) {
        $this->allowedOrigins = $allowedOrigins;
    }
    
    public function handle(callable $next): mixed {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        if (in_array('*', $this->allowedOrigins, true)) {
            header('Access-Control-Allow-Origin: *');
        } elseif (in_array($origin, $this->allowedOrigins, true)) {
            header("Access-Control-Allow-Origin: $origin");
            header('Vary: Origin');
        }
        
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
            http_response_code(204);
            exit;
        }
        
        return $next();
    }
}

class JsonResponseMiddleware implements Middleware {
    public function handle(callable $next): mixed {
        $contentType = $_SERVER['HTTP_ACCEPT'] ?? '';
        
        if (str_contains($contentType, 'application/json')) {
            header('Content-Type: application/json; charset=UTF-8');
        }
        
        return $next();
    }
}

// Использование
$middlewares = [
    new SecurityHeadersMiddleware(),
    new CorsMiddleware(['https://frontend.example.com']),
];

$handler = fn() => handleRequest();

foreach (array_reverse($middlewares) as $middleware) {
    $handler = fn() => $middleware->handle($handler);
}

$handler();
```

### API контроллер с правильными заголовками

```php
<?php
abstract class ApiController {
    protected function __construct() {
        // Базовые заголовки для API
        header('Content-Type: application/json; charset=UTF-8');
        header('X-Content-Type-Options: nosniff');
    }
    
    protected function json(mixed $data, int $code = 200): never {
        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    protected function success(mixed $data = null): never {
        $this->json(['success' => true, 'data' => $data]);
    }
    
    protected function error(string $message, int $code = 400): never {
        $this->json(['success' => false, 'error' => $message], $code);
    }
    
    protected function created(mixed $data): never {
        $this->json(['success' => true, 'data' => $data], 201);
    }
    
    protected function noContent(): never {
        http_response_code(204);
        exit;
    }
    
    protected function validationError(array $errors): never {
        $this->json([
            'success' => false,
            'error' => 'Validation failed',
            'errors' => $errors,
        ], 422);
    }
    
    protected function notFound(string $message = 'Resource not found'): never {
        $this->error($message, 404);
    }
    
    protected function unauthorized(string $message = 'Unauthorized'): never {
        header('WWW-Authenticate: Bearer');
        $this->error($message, 401);
    }
    
    protected function forbidden(string $message = 'Forbidden'): never {
        $this->error($message, 403);
    }
    
    protected function input(): array {
        $raw = file_get_contents('php://input');
        return json_decode($raw, true) ?? [];
    }
}

// Использование
class UsersApiController extends ApiController {
    public function index(): never {
        $users = $this->userRepository->findAll();
        $this->success($users);
    }
    
    public function show(int $id): never {
        $user = $this->userRepository->find($id);
        
        if (!$user) {
            $this->notFound('User not found');
        }
        
        $this->success($user);
    }
    
    public function store(): never {
        $data = $this->input();
        
        $errors = $this->validate($data);
        if ($errors) {
            $this->validationError($errors);
        }
        
        $user = $this->userRepository->create($data);
        $this->created($user);
    }
    
    public function destroy(int $id): never {
        $deleted = $this->userRepository->delete($id);
        
        if (!$deleted) {
            $this->notFound();
        }
        
        $this->noContent();
    }
}
```

---

## 11. Упражнения

### Упражнение 1: Response класс (20 минут)

```php
<?php
// Расширь класс Response добавив методы:
// - withCookie(string $name, string $value, array $options = [])
// - withoutCaching()
// - withCaching(int $seconds, bool $public = true)
// - stream(string $path) — потоковая отдача большого файла
```

### Упражнение 2: Rate Limiter через заголовки (25 минут)

```php
<?php
// Создай RateLimiter, который:
// - Ограничивает количество запросов (например, 100 в час)
// - Возвращает заголовки: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
// - При превышении возвращает 429 Too Many Requests с Retry-After
```

### Упражнение 3: Content Negotiation (20 минут)

```php
<?php
// Создай функцию, которая:
// - Парсит Accept заголовок
// - Возвращает ответ в нужном формате (JSON, XML, HTML)
// - Поддерживает quality values (q=0.9)
// - Возвращает 406 Not Acceptable если формат не поддерживается
```

### Упражнение 4: File Server (30 минут)

```php
<?php
// Создай безопасный file server:
// - Range requests для возобновления скачивания
// - ETag и Last-Modified для кеширования
// - Защита от path traversal
// - Потоковая отдача без загрузки в память
```

---

## 12. Вопросы для самопроверки

1. **Почему header() должен вызываться до любого вывода?**

2. **Чем отличается редирект 301 от 302?**

3. **Что такое PRG паттерн и зачем он нужен?**

4. **Как защититься от Open Redirect?**

5. **Какие флаги json_encode() стоит использовать и почему?**

6. **Что делает заголовок X-Content-Type-Options: nosniff?**

7. **Зачем нужен preflight запрос в CORS?**

8. **Как работает кеширование через ETag?**

---

## 13. Частые ошибки

### Ошибка 1: Вывод до header()

```php
<?php
// ❌ Ошибка — есть вывод до header()
echo "Debug";
header('Location: /home');

// ❌ Даже пробел перед <?php
 <?php
header('Location: /home');

// ✅ Никакого вывода до header()
<?php
header('Location: /home');
exit;
```

### Ошибка 2: Нет exit после редиректа

```php
<?php
// ❌ Код продолжает выполняться!
if (!$isLoggedIn) {
    header('Location: /login');
}
// Секретный контент всё равно выполнится!
showSecretContent();

// ✅ Всегда exit после редиректа
if (!$isLoggedIn) {
    header('Location: /login');
    exit;
}
showSecretContent();
```

### Ошибка 3: Неправильный Content-Type для JSON

```php
<?php
// ❌ Браузер может неправильно интерпретировать
echo json_encode($data);

// ❌ Устаревший тип
header('Content-Type: text/json');

// ✅ Правильный тип с кодировкой
header('Content-Type: application/json; charset=UTF-8');
echo json_encode($data, JSON_UNESCAPED_UNICODE);
```

### Ошибка 4: Open Redirect

```php
<?php
// ❌ Уязвимость — атакующий может перенаправить на фишинг
header('Location: ' . $_GET['redirect']);

// ✅ Проверять URL
$url = $_GET['redirect'] ?? '/';
if (!str_starts_with($url, '/') || str_starts_with($url, '//')) {
    $url = '/';
}
header('Location: ' . $url);
```

### Ошибка 5: Забыт Vary для CORS

```php
<?php
// ❌ Проблемы с кешированием
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed)) {
    header("Access-Control-Allow-Origin: $origin");
}

// ✅ Добавить Vary
header("Access-Control-Allow-Origin: $origin");
header('Vary: Origin');  // Важно!
```

---

## Резюме главы

```
┌────────────────────────────────────────────────────────────────┐
│                      ЗАПОМНИ ГЛАВНОЕ                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  HEADER()                                                      │
│  • Вызывать ДО любого вывода                                  │
│  • Проверять через headers_sent()                             │
│  • exit после редиректа!                                      │
│                                                                │
│  КОДЫ ОТВЕТОВ                                                  │
│  • 200 — успех, 201 — создано, 204 — нет контента            │
│  • 301 — постоянный редирект, 302 — временный                 │
│  • 400 — плохой запрос, 401 — не авторизован                 │
│  • 403 — запрещено, 404 — не найдено                         │
│  • 422 — ошибка валидации, 429 — слишком много               │
│  • 500 — ошибка сервера                                       │
│                                                                │
│  JSON                                                          │
│  • Content-Type: application/json; charset=UTF-8              │
│  • json_encode с JSON_UNESCAPED_UNICODE                       │
│  • json_decode из php://input                                 │
│                                                                │
│  БЕЗОПАСНОСТЬ                                                  │
│  • X-Frame-Options: DENY                                      │
│  • X-Content-Type-Options: nosniff                            │
│  • Content-Security-Policy                                    │
│  • Проверять URL для редиректов (Open Redirect)               │
│                                                                │
│  CORS                                                          │
│  • Access-Control-Allow-Origin                                │
│  • Обрабатывать OPTIONS (preflight)                           │
│  • Не забыть Vary: Origin                                     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

**Следующая глава:** `Глава 3.1: Заголовки HTTP и редиректы`
