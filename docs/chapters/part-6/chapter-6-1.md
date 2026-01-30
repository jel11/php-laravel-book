# Глава 6.1: SQL-инъекции — как работают, как защититься, практические примеры атак

## 🎯 Что ты узнаешь

- Как устроены SQL-инъекции и почему они так опасны
- Реальные примеры атак и их последствия
- Как защититься: prepared statements, валидация, экранирование
- Практические сценарии: от простых до сложных атак
- Как думать как хакер, чтобы защитить свой код

---

## 📖 Теория

### Что такое SQL-инъекция?

**SQL-инъекция** — это уязвимость, при которой злоумышленник может вставить свой SQL-код в запрос приложения. Это происходит, когда данные пользователя попадают в SQL-запрос без должной обработки.

**Почему это критично:**
- Полный доступ к базе данных
- Кража данных пользователей
- Удаление данных
- Обход авторизации
- Выполнение команд на сервере (в некоторых случаях)

**Историческая справка:**
SQL-инъекции входят в OWASP Top 10 (список самых опасных уязвимостей веб-приложений) с момента создания рейтинга. Миллионы сайтов были взломаны через эту уязвимость.

---

### Как работает атака: анатомия инъекции

#### Уязвимый код (НИКОГДА ТАК НЕ ДЕЛАЙ!)

```php
<?php
// ❌ ОПАСНО! Конкатенация пользовательского ввода
$username = $_POST['username'];
$password = $_POST['password'];

$query = "SELECT * FROM users WHERE username = '$username' AND password = '$password'";
$result = $pdo->query($query);
```

#### Что пойдёт не так?

**Нормальное использование:**
```
username: john
password: secret123

Результирующий SQL:
SELECT * FROM users WHERE username = 'john' AND password = 'secret123'
```

**Атака #1: Обход авторизации**
```
username: admin' --
password: (любой)

Результирующий SQL:
SELECT * FROM users WHERE username = 'admin' -- ' AND password = ''
                                              ↑
                                    Всё после -- это комментарий!
```

Злоумышленник войдёт как admin без знания пароля!

**Атака #2: UNION-based инъекция**
```
username: ' UNION SELECT null, username, password FROM users --
password: (любой)

Результирующий SQL:
SELECT * FROM users WHERE username = '' 
UNION SELECT null, username, password FROM users -- ' AND password = ''
```

Результат: злоумышленник получит все логины и пароли из базы!

---

### Типы SQL-инъекций

#### 1. **Classic SQL Injection** (самая простая)

```php
// Уязвимый поиск
$search = $_GET['search'];
$query = "SELECT * FROM products WHERE name LIKE '%$search%'";
```

**Атака:**
```
search: %' OR 1=1 --

SQL:
SELECT * FROM products WHERE name LIKE '%%' OR 1=1 --%'
```

Вернёт ВСЕ товары, потому что `1=1` всегда истина.

---

#### 2. **Blind SQL Injection** (атака вслепую)

Когда приложение не показывает результаты запроса, но меняет поведение.

```php
// Уязвимая проверка
$id = $_GET['id'];
$query = "SELECT * FROM articles WHERE id = $id AND published = 1";
$result = $pdo->query($query);

if ($result->rowCount() > 0) {
    echo "Статья существует";
} else {
    echo "Статья не найдена";
}
```

**Атака (извлечение данных по символу):**
```
id: 1 AND SUBSTRING((SELECT password FROM users WHERE id=1), 1, 1) = 'a'

Если пароль начинается с 'a' → "Статья существует"
Если нет → "Статья не найдена"
```

Перебирая символы, можно извлечь весь пароль!

---

#### 3. **Time-based Blind SQL Injection**

Когда даже поведение не меняется, используем задержки:

```php
// Уязвимый код
$id = $_GET['id'];
$query = "SELECT * FROM products WHERE id = $id";
```

**Атака:**
```
id: 1 AND IF(SUBSTRING((SELECT password FROM users WHERE id=1), 1, 1) = 'a', SLEEP(5), 0)

Если первый символ пароля 'a' → сайт зависнет на 5 секунд
Если нет → ответ мгновенный
```

---

#### 4. **Second Order SQL Injection**

Инъекция происходит в два этапа:

```php
// Этап 1: Регистрация (уязвимая)
$username = $_POST['username']; // admin'--
$sql = "INSERT INTO users (username) VALUES ('$username')";
// В БД сохранится: admin'--

// Этап 2: Использование (позже в другом месте)
$user = getUser($userId); // Получаем admin'-- из БД
$sql = "SELECT * FROM posts WHERE author = '$user'"; 
// SELECT * FROM posts WHERE author = 'admin'--'
```

---

### 🛡️ Защита: Как правильно

#### ✅ Метод 1: Prepared Statements (ЛУЧШЕЕ РЕШЕНИЕ)

```php
<?php
// ✅ ПРАВИЛЬНО
$username = $_POST['username'];
$password = $_POST['password'];

$stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND password = ?");
$stmt->execute([$username, $password]);
$user = $stmt->fetch();
```

**Почему это безопасно:**
- PDO отправляет SQL и данные **отдельно**
- Данные **никогда** не интерпретируются как код
- Даже если пользователь введёт `' OR 1=1 --`, это будет искаться **как строка**

**Named parameters (ещё читабельнее):**

```php
<?php
$stmt = $pdo->prepare("
    SELECT * FROM users 
    WHERE username = :username AND password = :password
");

$stmt->execute([
    ':username' => $username,
    ':password' => $password
]);
```

---

#### ✅ Метод 2: Валидация и фильтрация

**Даже с prepared statements, валидируй данные!**

```php
<?php
// Проверка типов данных
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if ($id === false) {
    die("ID должен быть числом!");
}

$stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
$stmt->execute([$id]);
```

**Белый список для динамических частей:**

```php
<?php
// ❌ ОПАСНО: ORDER BY из пользовательского ввода
$order = $_GET['order']; // можно вставить подзапрос!
$query = "SELECT * FROM products ORDER BY $order";

// ✅ ПРАВИЛЬНО: белый список
$allowedColumns = ['name', 'price', 'created_at'];
$order = $_GET['order'] ?? 'name';

if (!in_array($order, $allowedColumns)) {
    $order = 'name'; // значение по умолчанию
}

// Теперь безопасно использовать напрямую
$query = "SELECT * FROM products ORDER BY $order";
```

---

#### ✅ Метод 3: Экранирование (последний резерв)

**Используй ТОЛЬКО если prepared statements невозможны:**

```php
<?php
// Для MySQL через PDO
$username = $pdo->quote($_POST['username']);
$password = $pdo->quote($_POST['password']);

$query = "SELECT * FROM users WHERE username = $username AND password = $password";
// quote() добавит кавычки и экранирует опасные символы
```

**⚠️ Внимание:** `quote()` НЕ идеален, есть редкие способы обойти. Используй prepared statements!

---

### 🎭 Практические сценарии атак и защиты

#### Сценарий 1: Форма поиска

```php
<?php
// ❌ УЯЗВИМО
$search = $_GET['q'];
$results = $pdo->query("SELECT * FROM articles WHERE title LIKE '%$search%'");

// ✅ БЕЗОПАСНО
$search = $_GET['q'];
$stmt = $pdo->prepare("SELECT * FROM articles WHERE title LIKE ?");
$stmt->execute(["%$search%"]); // % внутри параметра, не в SQL!
```

---

#### Сценарий 2: Динамические WHERE условия

```php
<?php
// Фильтры от пользователя
$filters = [
    'category' => $_GET['category'] ?? null,
    'min_price' => $_GET['min_price'] ?? null,
    'max_price' => $_GET['max_price'] ?? null
];

// Строим запрос безопасно
$sql = "SELECT * FROM products WHERE 1=1"; // хак для AND
$params = [];

if ($filters['category']) {
    $sql .= " AND category = ?";
    $params[] = $filters['category'];
}

if ($filters['min_price']) {
    $sql .= " AND price >= ?";
    $params[] = (int)$filters['min_price'];
}

if ($filters['max_price']) {
    $sql .= " AND price <= ?";
    $params[] = (int)$filters['max_price'];
}

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
```

---

#### Сценарий 3: LIMIT и OFFSET

```php
<?php
// ❌ ОПАСНО (LIMIT нельзя параметризовать как ?)
$limit = $_GET['limit'];
$offset = $_GET['offset'];
// $query = "SELECT * FROM posts LIMIT ? OFFSET ?"; ← НЕ сработает!

// ✅ ПРАВИЛЬНО: валидация + приведение к int
$limit = max(1, min(100, (int)($_GET['limit'] ?? 10))); // от 1 до 100
$offset = max(0, (int)($_GET['offset'] ?? 0));

$query = "SELECT * FROM posts LIMIT $limit OFFSET $offset";
// Безопасно, потому что (int) гарантирует число
```

---

#### Сценарий 4: IN (список значений)

```php
<?php
// Выбрать несколько ID
$ids = $_GET['ids']; // "1,2,3,4"

// ❌ ОПАСНО
$query = "SELECT * FROM products WHERE id IN ($ids)";

// ✅ ПРАВИЛЬНО
$idArray = explode(',', $ids);
$idArray = array_map('intval', $idArray); // приводим к int
$idArray = array_filter($idArray); // убираем 0

if (empty($idArray)) {
    die("Не выбрано ни одного ID");
}

// Создаём плейсхолдеры: ?, ?, ?, ?
$placeholders = str_repeat('?,', count($idArray) - 1) . '?';

$stmt = $pdo->prepare("SELECT * FROM products WHERE id IN ($placeholders)");
$stmt->execute($idArray);
```

---

### 🧪 Тестирование на уязвимости

#### Простой чек-лист для самопроверки:

```php
<?php
// Найди в своём коде такие паттерны:

// 🚨 КРАСНЫЙ ФЛАГ
$pdo->query("SELECT * FROM table WHERE column = '$userInput'");
$pdo->exec("INSERT INTO table VALUES ('$userInput')");
mysqli_query($conn, "UPDATE table SET column = '$userInput'");

// ✅ БЕЗОПАСНО
$stmt = $pdo->prepare("SELECT * FROM table WHERE column = ?");
$stmt->execute([$userInput]);
```

#### Инструменты для тестирования:

1. **SQLMap** — автоматизированный инструмент для поиска SQL-инъекций
2. **Burp Suite** — перехват и модификация HTTP-запросов
3. **Manual testing** — попробуй сам:
   - `' OR 1=1 --`
   - `'; DROP TABLE users; --`
   - `' UNION SELECT null, null, null --`

---

## 💻 Практические упражнения

### Упражнение 1: Найди уязвимость

```php
<?php
// Исправь этот код
function searchUsers($name) {
    global $pdo;
    
    $query = "SELECT id, username, email FROM users WHERE username LIKE '%$name%'";
    $result = $pdo->query($query);
    
    return $result->fetchAll();
}

// Твоя задача: переписать безопасно
```

<details>
<summary>✅ Решение</summary>

```php
<?php
function searchUsers($name) {
    global $pdo;
    
    $stmt = $pdo->prepare("SELECT id, username, email FROM users WHERE username LIKE ?");
    $stmt->execute(["%$name%"]);
    
    return $stmt->fetchAll();
}
```
</details>

---

### Упражнение 2: Динамическая сортировка

```php
<?php
// Пользователь выбирает сортировку: price, name, created_at
// Направление: ASC или DESC

// Напиши безопасную функцию
function getProducts($sortBy, $direction) {
    global $pdo;
    
    // Твой код здесь
}
```

<details>
<summary>✅ Решение</summary>

```php
<?php
function getProducts($sortBy, $direction) {
    global $pdo;
    
    // Белый список для сортировки
    $allowedSort = ['price', 'name', 'created_at'];
    $sortBy = in_array($sortBy, $allowedSort) ? $sortBy : 'name';
    
    // Белый список для направления
    $direction = strtoupper($direction) === 'DESC' ? 'DESC' : 'ASC';
    
    // Теперь безопасно вставлять в запрос
    $query = "SELECT * FROM products ORDER BY $sortBy $direction";
    
    return $pdo->query($query)->fetchAll();
}
```
</details>

---

### Упражнение 3: Сложный фильтр

```php
<?php
// Создай функцию поиска товаров с фильтрами:
// - Поиск по названию (LIKE)
// - Категория (точное совпадение)
// - Диапазон цен (от и до)
// - Сортировка
// Всё должно быть безопасно!

function searchProducts($searchTerm, $category, $minPrice, $maxPrice, $sortBy) {
    // Твой код
}
```

<details>
<summary>✅ Решение</summary>

```php
<?php
function searchProducts($searchTerm, $category, $minPrice, $maxPrice, $sortBy) {
    global $pdo;
    
    $sql = "SELECT * FROM products WHERE 1=1";
    $params = [];
    
    // Поиск по названию
    if (!empty($searchTerm)) {
        $sql .= " AND name LIKE ?";
        $params[] = "%$searchTerm%";
    }
    
    // Фильтр по категории
    if (!empty($category)) {
        $sql .= " AND category = ?";
        $params[] = $category;
    }
    
    // Минимальная цена
    if ($minPrice !== null && $minPrice !== '') {
        $sql .= " AND price >= ?";
        $params[] = (float)$minPrice;
    }
    
    // Максимальная цена
    if ($maxPrice !== null && $maxPrice !== '') {
        $sql .= " AND price <= ?";
        $params[] = (float)$maxPrice;
    }
    
    // Сортировка (белый список)
    $allowedSort = ['name', 'price', 'created_at'];
    $sortBy = in_array($sortBy, $allowedSort) ? $sortBy : 'name';
    $sql .= " ORDER BY $sortBy";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    return $stmt->fetchAll();
}
```
</details>

---

## 🎯 Реальный проект: Безопасная система комментариев

### Задание

Создай систему комментариев с полной защитой от SQL-инъекций:

1. Добавление комментария
2. Просмотр комментариев к статье
3. Поиск по комментариям
4. Модерация (удаление по ID)

### База данных

```sql
CREATE TABLE comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    article_id INT NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX(article_id)
);
```

### Требования безопасности

- Все взаимодействия с БД через prepared statements
- Валидация всех входных данных
- Экранирование HTML в выводе (защита от XSS)

### Стартовый код

```php
<?php
// config.php
$pdo = new PDO('mysql:host=localhost;dbname=comments_db', 'user', 'pass');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// comments.php - твоя реализация

class CommentSystem {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    // Добавить комментарий
    public function addComment($articleId, $authorName, $content) {
        // Твой код
    }
    
    // Получить комментарии к статье
    public function getComments($articleId, $limit = 50, $offset = 0) {
        // Твой код
    }
    
    // Поиск по комментариям
    public function searchComments($searchTerm) {
        // Твой код
    }
    
    // Удалить комментарий
    public function deleteComment($commentId) {
        // Твой код
    }
}

// Использование
$comments = new CommentSystem($pdo);

// Обработка формы
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Твой код обработки
}
```

<details>
<summary>✅ Полное решение</summary>

```php
<?php
// config.php
$pdo = new PDO('mysql:host=localhost;dbname=comments_db;charset=utf8mb4', 'user', 'pass');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

// comments.php
class CommentSystem {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function addComment($articleId, $authorName, $content) {
        // Валидация
        $articleId = (int)$articleId;
        if ($articleId <= 0) {
            throw new InvalidArgumentException("Некорректный ID статьи");
        }
        
        $authorName = trim($authorName);
        if (empty($authorName) || strlen($authorName) > 100) {
            throw new InvalidArgumentException("Имя автора должно быть от 1 до 100 символов");
        }
        
        $content = trim($content);
        if (empty($content)) {
            throw new InvalidArgumentException("Комментарий не может быть пустым");
        }
        
        // Безопасная вставка
        $stmt = $this->pdo->prepare("
            INSERT INTO comments (article_id, author_name, content) 
            VALUES (?, ?, ?)
        ");
        
        $stmt->execute([$articleId, $authorName, $content]);
        
        return $this->pdo->lastInsertId();
    }
    
    public function getComments($articleId, $limit = 50, $offset = 0) {
        // Валидация
        $articleId = (int)$articleId;
        $limit = max(1, min(100, (int)$limit)); // от 1 до 100
        $offset = max(0, (int)$offset);
        
        $stmt = $this->pdo->prepare("
            SELECT id, article_id, author_name, content, created_at
            FROM comments
            WHERE article_id = ?
            ORDER BY created_at DESC
            LIMIT $limit OFFSET $offset
        ");
        
        $stmt->execute([$articleId]);
        
        return $stmt->fetchAll();
    }
    
    public function searchComments($searchTerm) {
        // Валидация
        $searchTerm = trim($searchTerm);
        if (empty($searchTerm)) {
            return [];
        }
        
        $stmt = $this->pdo->prepare("
            SELECT id, article_id, author_name, content, created_at
            FROM comments
            WHERE content LIKE ? OR author_name LIKE ?
            ORDER BY created_at DESC
            LIMIT 100
        ");
        
        $searchPattern = "%$searchTerm%";
        $stmt->execute([$searchPattern, $searchPattern]);
        
        return $stmt->fetchAll();
    }
    
    public function deleteComment($commentId) {
        $commentId = (int)$commentId;
        if ($commentId <= 0) {
            throw new InvalidArgumentException("Некорректный ID комментария");
        }
        
        $stmt = $this->pdo->prepare("DELETE FROM comments WHERE id = ?");
        $stmt->execute([$commentId]);
        
        return $stmt->rowCount() > 0; // true если удалён
    }
}

// index.php
session_start();

$comments = new CommentSystem($pdo);

// Обработка добавления комментария
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    try {
        if ($_POST['action'] === 'add') {
            $commentId = $comments->addComment(
                $_POST['article_id'],
                $_POST['author_name'],
                $_POST['content']
            );
            $_SESSION['message'] = "Комментарий добавлен!";
        } elseif ($_POST['action'] === 'delete') {
            $comments->deleteComment($_POST['comment_id']);
            $_SESSION['message'] = "Комментарий удалён!";
        }
        
        header("Location: " . $_SERVER['PHP_SELF']);
        exit;
    } catch (Exception $e) {
        $_SESSION['error'] = $e->getMessage();
    }
}

// Получение комментариев
$articleId = (int)($_GET['article_id'] ?? 1);
$searchTerm = $_GET['search'] ?? '';

$commentsList = $searchTerm 
    ? $comments->searchComments($searchTerm)
    : $comments->getComments($articleId);

?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Комментарии</title>
    <style>
        .comment { border: 1px solid #ddd; padding: 10px; margin: 10px 0; }
        .error { color: red; }
        .success { color: green; }
    </style>
</head>
<body>
    <h1>Комментарии к статье #<?= $articleId ?></h1>
    
    <?php if (isset($_SESSION['message'])): ?>
        <div class="success"><?= htmlspecialchars($_SESSION['message']) ?></div>
        <?php unset($_SESSION['message']); ?>
    <?php endif; ?>
    
    <?php if (isset($_SESSION['error'])): ?>
        <div class="error"><?= htmlspecialchars($_SESSION['error']) ?></div>
        <?php unset($_SESSION['error']); ?>
    <?php endif; ?>
    
    <!-- Форма поиска -->
    <form method="GET">
        <input type="hidden" name="article_id" value="<?= $articleId ?>">
        <input type="text" name="search" value="<?= htmlspecialchars($searchTerm) ?>" placeholder="Поиск...">
        <button type="submit">Искать</button>
        <a href="?article_id=<?= $articleId ?>">Сбросить</a>
    </form>
    
    <!-- Форма добавления -->
    <form method="POST">
        <input type="hidden" name="action" value="add">
        <input type="hidden" name="article_id" value="<?= $articleId ?>">
        <input type="text" name="author_name" placeholder="Ваше имя" required><br>
        <textarea name="content" placeholder="Ваш комментарий" required></textarea><br>
        <button type="submit">Добавить комментарий</button>
    </form>
    
    <!-- Список комментариев -->
    <?php foreach ($commentsList as $comment): ?>
        <div class="comment">
            <strong><?= htmlspecialchars($comment['author_name']) ?></strong>
            <small><?= $comment['created_at'] ?></small>
            <p><?= nl2br(htmlspecialchars($comment['content'])) ?></p>
            
            <form method="POST" style="display:inline;">
                <input type="hidden" name="action" value="delete">
                <input type="hidden" name="comment_id" value="<?= $comment['id'] ?>">
                <button type="submit" onclick="return confirm('Удалить?')">Удалить</button>
            </form>
        </div>
    <?php endforeach; ?>
</body>
</html>
```
</details>

---

## 📝 Чек-лист безопасности

Перед деплоем проверь:

- [ ] Все SQL-запросы используют prepared statements
- [ ] Динамические части (ORDER BY, LIMIT) валидируются через белый список
- [ ] Числовые параметры приводятся к `(int)` или `(float)`
- [ ] Нет конкатенации пользовательского ввода в SQL
- [ ] HTML-вывод экранируется через `htmlspecialchars()`
- [ ] Ошибки БД не показываются пользователю в production
- [ ] Логи содержат попытки атак для анализа

---

## ❓ Вопросы для самопроверки

1. Почему конкатенация пользовательского ввода в SQL опасна?
2. Как работают prepared statements "под капотом"?
3. Можно ли параметризовать название таблицы или колонки? Почему?
4. Что делать, если нужна динамическая сортировка?
5. В чём разница между позиционными `?` и именованными `:name` плейсхолдерами?
6. Защищают ли prepared statements от всех видов атак?
7. Что такое Second Order SQL Injection?
8. Как тестировать свой код на SQL-инъекции?

---

## 🎓 Что дальше?

Ты освоил **самую критичную уязвимость веб-приложений**. Теперь ты:
- Понимаешь механизм SQL-инъекций
- Умеешь защищать код через prepared statements
- Знаешь как валидировать динамические части запросов
- Можешь думать как атакующий, чтобы защищаться

**Следующая глава:** [Глава 6.2: XSS и CSRF](#) — защита от межсайтового скриптинга и подделки запросов.

---

## 💡 Золотое правило

> **НИКОГДА не доверяй пользовательскому вводу. ВСЁ, что приходит извне — потенциально опасно.**

Пользовательский ввод — это:
- `$_GET`, `$_POST`, `$_COOKIE`, `$_FILES`
- Данные из базы (да, они могли быть заражены раньше!)
- Данные из API
- Загруженные файлы
- Заголовки HTTP

**Защищайся всегда. По умолчанию. Без исключений.** 🛡️