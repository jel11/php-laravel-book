# Глава 3.3: PDO — подключение, prepared statements, fetchAll/fetch, обработка ошибок, транзакции

## 🎯 Что ты узнаешь

После этой главы ты будешь:
- Понимать, что такое PDO и почему это стандарт работы с БД в PHP
- Уметь безопасно подключаться к базе данных
- Знать, как защититься от SQL-инъекций через prepared statements
- Работать с разными способами получения данных
- Правильно обрабатывать ошибки
- Использовать транзакции для атомарных операций

---

## 📖 Теория

### Что такое PDO?

**PDO (PHP Data Objects)** — это универсальный интерфейс для работы с базами данных в PHP. Это не отдельная база данных, а **прослойка между твоим кодом и БД**.

#### Почему PDO, а не mysqli или mysql_*?

```php
// ❌ ПЛОХО: старый способ (mysql_*)
// Устарел, удалён из PHP 7.0, небезопасен
$conn = mysql_connect('localhost', 'user', 'pass');
$result = mysql_query("SELECT * FROM users WHERE id = " . $_GET['id']); // SQL-инъекция!

// ⚠️ СРЕДНЕ: mysqli
// Работает только с MySQL, не универсален
$mysqli = new mysqli('localhost', 'user', 'pass', 'database');
$stmt = $mysqli->prepare("SELECT * FROM users WHERE id = ?");

// ✅ ХОРОШО: PDO
// Универсален, современен, объектно-ориентирован
$pdo = new PDO('mysql:host=localhost;dbname=mydb', 'user', 'pass');
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
```

**Преимущества PDO:**
- Поддержка 12+ типов БД (MySQL, PostgreSQL, SQLite, Oracle...)
- Единый API — сменил БД? Код почти не меняется
- Prepared statements "из коробки"
- Объектно-ориентированный подход
- Гибкая обработка ошибок

---

## 🔌 Подключение к базе данных

### Базовое подключение

```php
<?php
// DSN (Data Source Name) — строка подключения
// Формат: драйвер:параметр1=значение1;параметр2=значение2
$dsn = 'mysql:host=localhost;dbname=shop;charset=utf8mb4';
$username = 'root';
$password = 'secret';

try {
    $pdo = new PDO($dsn, $username, $password);
    echo "Подключение успешно!";
} catch (PDOException $e) {
    die("Ошибка подключения: " . $e->getMessage());
}
```

### Опции подключения

```php
<?php
$options = [
    // Режим обработки ошибок: выбрасывать исключения
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    
    // Режим получения данных: ассоциативные массивы
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    
    // Отключить эмуляцию prepared statements (безопаснее)
    PDO::ATTR_EMULATE_PREPARES => false,
    
    // Постоянное подключение (переиспользование)
    PDO::ATTR_PERSISTENT => false, // обычно false для веба
];

$pdo = new PDO($dsn, $username, $password, $options);
```

**Важно про charset:**
```php
// ✅ ПРАВИЛЬНО: указываем charset в DSN
$dsn = 'mysql:host=localhost;dbname=shop;charset=utf8mb4';

// ❌ НЕПРАВИЛЬНО: через SET NAMES (небезопасно с prepared statements)
$pdo->exec("SET NAMES utf8mb4"); // не делай так!
```

### Правильная структура подключения

```php
<?php
// config/database.php
function getDbConnection(): PDO
{
    static $pdo = null;
    
    if ($pdo === null) {
        $config = [
            'host' => 'localhost',
            'dbname' => 'shop',
            'charset' => 'utf8mb4',
        ];
        
        $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
        
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        
        try {
            $pdo = new PDO($dsn, 'root', 'secret', $options);
        } catch (PDOException $e) {
            // В продакшене НЕ показывай детали ошибки пользователю!
            error_log($e->getMessage());
            die("Ошибка подключения к базе данных");
        }
    }
    
    return $pdo;
}
```

---

## 🛡️ Prepared Statements — защита от SQL-инъекций

### Что такое SQL-инъекция?

```php
// ❌ ОПАСНЫЙ КОД
$id = $_GET['id']; // Пользователь передал: "1 OR 1=1"
$sql = "SELECT * FROM users WHERE id = $id";
// Реальный запрос: SELECT * FROM users WHERE id = 1 OR 1=1
// Результат: получили ВСЕХ пользователей!

// Ещё хуже:
$id = $_GET['id']; // Пользователь передал: "1; DROP TABLE users--"
// Реальный запрос: SELECT * FROM users WHERE id = 1; DROP TABLE users--
// Результат: таблица удалена! 💀
```

### Как работают Prepared Statements

**Prepared statements** — это **разделение структуры SQL-запроса и данных**. Сервер БД сначала разбирает структуру запроса, а потом подставляет данные как **значения, а не как код**.

```php
// ✅ БЕЗОПАСНЫЙ КОД
$id = $_GET['id']; // Любое значение!

// 1. Подготовка запроса (с плейсхолдерами)
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");

// 2. Выполнение с данными
$stmt->execute([$id]);

// Даже если $id = "1 OR 1=1", БД воспримет это как строку "1 OR 1=1"
// и не найдёт такого ID. Инъекция невозможна!
```

### Два типа плейсхолдеров

#### 1. Позиционные плейсхолдеры (?)

```php
// Порядок важен!
$stmt = $pdo->prepare("
    SELECT * FROM products 
    WHERE category = ? AND price < ? AND in_stock = ?
");

$stmt->execute(['electronics', 1000, true]);
//                ↑ первый ?    ↑ второй ?  ↑ третий ?
```

#### 2. Именованные плейсхолдеры (:name)

```php
// Порядок не важен, более читаемо
$stmt = $pdo->prepare("
    SELECT * FROM products 
    WHERE category = :category AND price < :max_price AND in_stock = :available
");

$stmt->execute([
    ':category' => 'electronics',
    ':max_price' => 1000,
    ':available' => true,
]);

// Можно без двоеточия в ключах
$stmt->execute([
    'category' => 'electronics',
    'max_price' => 1000,
    'available' => true,
]);
```

**Рекомендация:** используй именованные плейсхолдеры для сложных запросов — код становится самодокументируемым.

### Что МОЖНО и что НЕЛЬЗЯ через плейсхолдеры

```php
// ✅ МОЖНО: значения
$stmt = $pdo->prepare("SELECT * FROM users WHERE name = ?");
$stmt->execute(['John']);

// ✅ МОЖНО: числа, булевы значения
$stmt = $pdo->prepare("SELECT * FROM products WHERE price > ? AND active = ?");
$stmt->execute([100, true]);

// ❌ НЕЛЬЗЯ: названия таблиц
$table = 'users';
$stmt = $pdo->prepare("SELECT * FROM ?"); // НЕ СРАБОТАЕТ!
// Решение: whitelist
$allowed_tables = ['users', 'products'];
if (in_array($table, $allowed_tables)) {
    $stmt = $pdo->query("SELECT * FROM $table");
}

// ❌ НЕЛЬЗЯ: названия колонок
$column = 'email';
$stmt = $pdo->prepare("SELECT ? FROM users"); // НЕ СРАБОТАЕТ!
// Решение: whitelist
$allowed_columns = ['id', 'name', 'email'];
if (in_array($column, $allowed_columns)) {
    $stmt = $pdo->query("SELECT $column FROM users");
}

// ❌ НЕЛЬЗЯ: операторы
$operator = '>';
$stmt = $pdo->prepare("SELECT * FROM products WHERE price ? 100"); // НЕ СРАБОТАЕТ!
```

---

## 📥 Получение данных: fetch, fetchAll, fetchColumn

### fetchAll() — все строки сразу

```php
$stmt = $pdo->query("SELECT * FROM users");
$users = $stmt->fetchAll();

// Результат: массив массивов
// [
//     ['id' => 1, 'name' => 'John', 'email' => 'john@example.com'],
//     ['id' => 2, 'name' => 'Jane', 'email' => 'jane@example.com'],
// ]

foreach ($users as $user) {
    echo $user['name'] . "<br>";
}
```

### fetch() — по одной строке

```php
$stmt = $pdo->query("SELECT * FROM users");

while ($user = $stmt->fetch()) {
    echo $user['name'] . "<br>";
}
// Полезно для больших результатов — не грузит всё в память сразу
```

### fetchColumn() — одно значение

```php
// Получить количество
$stmt = $pdo->query("SELECT COUNT(*) FROM users");
$count = $stmt->fetchColumn();
echo "Всего пользователей: $count";

// Получить одно конкретное значение
$stmt = $pdo->prepare("SELECT email FROM users WHERE id = ?");
$stmt->execute([5]);
$email = $stmt->fetchColumn();
echo "Email: $email";
```

### Режимы получения данных (Fetch Modes)

```php
// PDO::FETCH_ASSOC — ассоциативный массив (по умолчанию, если установлено)
$user = $stmt->fetch(PDO::FETCH_ASSOC);
// ['id' => 1, 'name' => 'John']

// PDO::FETCH_NUM — индексированный массив
$user = $stmt->fetch(PDO::FETCH_NUM);
// [0 => 1, 1 => 'John']

// PDO::FETCH_BOTH — оба варианта (по умолчанию, если не установлено)
$user = $stmt->fetch(PDO::FETCH_BOTH);
// ['id' => 1, 0 => 1, 'name' => 'John', 1 => 'John']

// PDO::FETCH_OBJ — объект
$user = $stmt->fetch(PDO::FETCH_OBJ);
// stdClass Object { id: 1, name: "John" }
echo $user->name;

// PDO::FETCH_CLASS — собственный класс
class User {
    public $id;
    public $name;
    public $email;
}

$stmt->setFetchMode(PDO::FETCH_CLASS, 'User');
$user = $stmt->fetch();
// Объект класса User
```

### Полезные методы для результатов

```php
// Получить все значения одной колонки
$stmt = $pdo->query("SELECT name FROM users");
$names = $stmt->fetchAll(PDO::FETCH_COLUMN);
// ['John', 'Jane', 'Bob']

// Получить пары ключ-значение
$stmt = $pdo->query("SELECT id, name FROM users");
$users = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
// [1 => 'John', 2 => 'Jane', 3 => 'Bob']

// Группировка по первой колонке
$stmt = $pdo->query("SELECT category, name, price FROM products");
$products = $stmt->fetchAll(PDO::FETCH_GROUP);
// [
//     'electronics' => [
//         ['name' => 'Laptop', 'price' => 1000],
//         ['name' => 'Phone', 'price' => 500],
//     ],
//     'books' => [...]
// ]
```

---

## ⚠️ Обработка ошибок

### Три режима обработки ошибок

```php
// 1. PDO::ERRMODE_SILENT (по умолчанию)
// Тихо игнорирует ошибки, нужно проверять вручную
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
$stmt = $pdo->query("INVALID SQL");
if (!$stmt) {
    print_r($pdo->errorInfo());
}

// 2. PDO::ERRMODE_WARNING
// Выводит PHP Warning
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_WARNING);
$stmt = $pdo->query("INVALID SQL"); // Warning: ...

// 3. PDO::ERRMODE_EXCEPTION (рекомендуется!)
// Выбрасывает исключение PDOException
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
try {
    $stmt = $pdo->query("INVALID SQL");
} catch (PDOException $e) {
    echo "Ошибка: " . $e->getMessage();
}
```

### Правильная обработка ошибок

```php
function createUser(PDO $pdo, string $email, string $password): bool
{
    try {
        $stmt = $pdo->prepare("
            INSERT INTO users (email, password, created_at) 
            VALUES (:email, :password, NOW())
        ");
        
        $stmt->execute([
            'email' => $email,
            'password' => password_hash($password, PASSWORD_DEFAULT),
        ]);
        
        return true;
        
    } catch (PDOException $e) {
        // Проверяем код ошибки
        if ($e->getCode() == 23000) { // Duplicate entry
            error_log("Duplicate email: $email");
            return false;
        }
        
        // Логируем неизвестную ошибку
        error_log("Database error: " . $e->getMessage());
        throw $e; // Прокидываем дальше
    }
}
```

### Получение информации об ошибке

```php
try {
    $pdo->exec("INVALID SQL");
} catch (PDOException $e) {
    echo $e->getMessage();     // Текст ошибки
    echo $e->getCode();        // Код ошибки (например, 23000)
    echo $e->getFile();        // Файл, где произошла ошибка
    echo $e->getLine();        // Строка
    
    // Детальная информация
    print_r($pdo->errorInfo());
    // [
    //     0 => "42S02",              // SQLSTATE код
    //     1 => 1146,                 // Код ошибки драйвера
    //     2 => "Table 'test.no...",  // Сообщение
    // ]
}
```

---

## 🔄 Транзакции

### Что такое транзакция?

**Транзакция** — это группа операций с БД, которые **либо все выполняются, либо все отменяются**. Это гарантирует целостность данных.

**Пример:** перевод денег между счетами:
1. Списать деньги со счёта A
2. Зачислить деньги на счёт B

Что если после шага 1 произойдёт ошибка? Деньги спишутся, но не зачислятся! Транзакция решает эту проблему.

### ACID принципы

- **Atomicity (Атомарность):** всё или ничего
- **Consistency (Согласованность):** данные остаются валидными
- **Isolation (Изолированность):** транзакции не мешают друг другу
- **Durability (Долговечность):** результат сохраняется навсегда

### Базовое использование

```php
try {
    // Начать транзакцию
    $pdo->beginTransaction();
    
    // Операция 1: списать деньги
    $stmt = $pdo->prepare("
        UPDATE accounts 
        SET balance = balance - :amount 
        WHERE id = :from_account
    ");
    $stmt->execute(['amount' => 100, 'from_account' => 1]);
    
    // Операция 2: зачислить деньги
    $stmt = $pdo->prepare("
        UPDATE accounts 
        SET balance = balance + :amount 
        WHERE id = :to_account
    ");
    $stmt->execute(['amount' => 100, 'to_account' => 2]);
    
    // Всё успешно — зафиксировать изменения
    $pdo->commit();
    
} catch (Exception $e) {
    // Ошибка — откатить все изменения
    $pdo->rollBack();
    echo "Ошибка перевода: " . $e->getMessage();
}
```

### Проверка статуса транзакции

```php
if ($pdo->inTransaction()) {
    echo "Транзакция активна";
}

// Вложенные транзакции НЕ поддерживаются
$pdo->beginTransaction();
$pdo->beginTransaction(); // Ошибка!
```

### Реальный пример: создание заказа

```php
function createOrder(PDO $pdo, int $userId, array $items): int
{
    try {
        $pdo->beginTransaction();
        
        // 1. Создать заказ
        $stmt = $pdo->prepare("
            INSERT INTO orders (user_id, total, created_at) 
            VALUES (:user_id, :total, NOW())
        ");
        
        $total = array_sum(array_column($items, 'price'));
        $stmt->execute(['user_id' => $userId, 'total' => $total]);
        $orderId = $pdo->lastInsertId();
        
        // 2. Добавить товары в заказ
        $stmt = $pdo->prepare("
            INSERT INTO order_items (order_id, product_id, quantity, price) 
            VALUES (:order_id, :product_id, :quantity, :price)
        ");
        
        foreach ($items as $item) {
            $stmt->execute([
                'order_id' => $orderId,
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
            ]);
        }
        
        // 3. Уменьшить остатки товаров
        $stmt = $pdo->prepare("
            UPDATE products 
            SET stock = stock - :quantity 
            WHERE id = :product_id AND stock >= :quantity
        ");
        
        foreach ($items as $item) {
            $stmt->execute([
                'quantity' => $item['quantity'],
                'product_id' => $item['product_id'],
            ]);
            
            // Проверка: товар был обновлён?
            if ($stmt->rowCount() === 0) {
                throw new Exception("Недостаточно товара {$item['product_id']}");
            }
        }
        
        $pdo->commit();
        return $orderId;
        
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Order creation failed: " . $e->getMessage());
        throw $e;
    }
}
```

---

## 📝 Практические примеры

### CRUD операции с PDO

```php
class UserRepository
{
    private PDO $pdo;
    
    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }
    
    // CREATE
    public function create(string $name, string $email, string $password): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO users (name, email, password, created_at) 
            VALUES (:name, :email, :password, NOW())
        ");
        
        $stmt->execute([
            'name' => $name,
            'email' => $email,
            'password' => password_hash($password, PASSWORD_DEFAULT),
        ]);
        
        return (int) $this->pdo->lastInsertId();
    }
    
    // READ (один)
    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$id]);
        
        $user = $stmt->fetch();
        return $user ?: null;
    }
    
    // READ (все)
    public function all(): array
    {
        $stmt = $this->pdo->query("SELECT * FROM users ORDER BY created_at DESC");
        return $stmt->fetchAll();
    }
    
    // UPDATE
    public function update(int $id, array $data): bool
    {
        $fields = [];
        $values = [];
        
        foreach ($data as $key => $value) {
            $fields[] = "$key = :$key";
            $values[$key] = $value;
        }
        
        $values['id'] = $id;
        
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($values);
        
        return $stmt->rowCount() > 0;
    }
    
    // DELETE
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
        
        return $stmt->rowCount() > 0;
    }
    
    // Поиск по email
    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        
        $user = $stmt->fetch();
        return $user ?: null;
    }
}
```

### Использование

```php
require_once 'config/database.php';

$pdo = getDbConnection();
$userRepo = new UserRepository($pdo);

// Создание
$userId = $userRepo->create('John Doe', 'john@example.com', 'secret123');
echo "Создан пользователь с ID: $userId\n";

// Чтение
$user = $userRepo->find($userId);
echo "Пользователь: {$user['name']}\n";

// Обновление
$userRepo->update($userId, ['name' => 'John Smith']);

// Все пользователи
$users = $userRepo->all();
foreach ($users as $user) {
    echo "{$user['name']} - {$user['email']}\n";
}

// Удаление
$userRepo->delete($userId);
```

---

## 🎓 Упражнения

### Упражнение 1: Безопасный поиск

Создай функцию поиска товаров с защитой от SQL-инъекций:

```php
function searchProducts(PDO $pdo, string $query, float $minPrice, float $maxPrice): array
{
    // Твой код здесь
    // Должен искать товары по названию (LIKE) и диапазону цен
    // Использовать prepared statements
}

// Тест
$products = searchProducts($pdo, 'laptop', 500, 2000);
```

<details>
<summary>Решение</summary>

```php
function searchProducts(PDO $pdo, string $query, float $minPrice, float $maxPrice): array
{
    $stmt = $pdo->prepare("
        SELECT * FROM products 
        WHERE name LIKE :query 
        AND price BETWEEN :min_price AND :max_price
        ORDER BY price ASC
    ");
    
    $stmt->execute([
        'query' => "%$query%",
        'min_price' => $minPrice,
        'max_price' => $maxPrice,
    ]);
    
    return $stmt->fetchAll();
}
```
</details>

### Упражнение 2: Система регистрации

Создай функцию регистрации пользователя с проверкой на дубликаты:

```php
function registerUser(PDO $pdo, string $email, string $password, string $name): array
{
    // Вернуть ['success' => true, 'user_id' => 123]
    // или ['success' => false, 'error' => 'Email already exists']
}
```

<details>
<summary>Решение</summary>

```php
function registerUser(PDO $pdo, string $email, string $password, string $name): array
{
    try {
        // Проверка на существование
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        
        if ($stmt->fetch()) {
            return ['success' => false, 'error' => 'Email already exists'];
        }
        
        // Регистрация
        $stmt = $pdo->prepare("
            INSERT INTO users (email, password, name, created_at) 
            VALUES (:email, :password, :name, NOW())
        ");
        
        $stmt->execute([
            'email' => $email,
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'name' => $name,
        ]);
        
        return [
            'success' => true,
            'user_id' => (int) $pdo->lastInsertId(),
        ];
        
    } catch (PDOException $e) {
        return ['success' => false, 'error' => 'Database error'];
    }
}
```
</details>

### Упражнение 3: Транзакция переноса товара

Создай функцию переноса товара между складами с использованием транзакции:

```php
function transferStock(
    PDO $pdo, 
    int $productId, 
    int $fromWarehouse, 
    int $toWarehouse, 
    int $quantity
): bool {
    // Должна:
    // 1. Проверить наличие товара на складе-источнике
    // 2. Уменьшить количество на складе-источнике
    // 3. Увеличить количество на складе-назначении
    // 4. Использовать транзакцию
    // 5. Вернуть true при успехе, false при ошибке
}
```

<details>
<summary>Решение</summary>

```php
function transferStock(
    PDO $pdo, 
    int $productId, 
    int $fromWarehouse, 
    int $toWarehouse, 
    int $quantity
): bool {
    try {
        $pdo->beginTransaction();
        
        // Проверка наличия
        $stmt = $pdo->prepare("
            SELECT quantity FROM warehouse_stock 
            WHERE product_id = ? AND warehouse_id = ?
        ");
        $stmt->execute([$productId, $fromWarehouse]);
        $stock = $stmt->fetchColumn();
        
        if ($stock < $quantity) {
            throw new Exception('Insufficient stock');
        }
        
        // Уменьшить на складе-источнике
        $stmt = $pdo->prepare("
            UPDATE warehouse_stock 
            SET quantity = quantity - :quantity 
            WHERE product_id = :product_id AND warehouse_id = :warehouse_id
        ");
        $stmt->execute([
            'quantity' => $quantity,
            'product_id' => $productId,
            'warehouse_id' => $fromWarehouse,
        ]);
        
        // Увеличить на складе-назначении
        $stmt = $pdo->prepare("
            INSERT INTO warehouse_stock (product_id, warehouse_id, quantity) 
            VALUES (:product_id, :warehouse_id, :quantity)
            ON DUPLICATE KEY UPDATE quantity = quantity + :quantity
        ");
        $stmt->execute([
            'product_id' => $productId,
            'warehouse_id' => $toWarehouse,
            'quantity' => $quantity,
        ]);
        
        $pdo->commit();
        return true;
        
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log($e->getMessage());
        return false;
    }
}
```
</details>

---

## 🚀 Практическое задание

Создай **систему корзины покупок** с использованием PDO:

### Требования:

1. **Таблицы:**
```sql
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0
);

CREATE TABLE carts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cart_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cart_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

2. **Функции для реализации:**

```php
class ShoppingCart
{
    private PDO $pdo;
    
    // Добавить товар в корзину (или увеличить количество)
    public function addProduct(int $cartId, int $productId, int $quantity = 1): bool
    
    // Удалить товар из корзины
    public function removeProduct(int $cartId, int $productId): bool
    
    // Получить содержимое корзины с деталями товаров
    public function getItems(int $cartId): array
    
    // Получить общую стоимость корзины
    public function getTotal(int $cartId): float
    
    // Оформить заказ (использовать транзакцию!)
    // - Создать заказ
    // - Перенести товары из корзины в заказ
    // - Уменьшить остатки товаров
    // - Очистить корзину
    public function checkout(int $cartId): int // возвращает ID заказа
}
```

3. **Обязательно:**
- Все запросы через prepared statements
- Транзакция для checkout
- Проверка наличия товара на складе
- Обработка ошибок через try-catch
- Валидация данных

---

## 📚 Частые ошибки

### ❌ Ошибка 1: Забыли execute()

```php
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
// $stmt->execute([1]); // забыли!
$user = $stmt->fetch(); // NULL, данных нет
```

### ❌ Ошибка 2: Смешивание типов плейсхолдеров

```php
// НЕПРАВИЛЬНО: нельзя смешивать ? и :name
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ? AND name = :name");
// Используй что-то одно!
```

### ❌ Ошибка 3: Плейсхолдеры для идентификаторов

```php
// НЕПРАВИЛЬНО: названия таблиц и колонок нельзя
$table = 'users';
$stmt = $pdo->prepare("SELECT * FROM ?"); // НЕ СРАБОТАЕТ

// ПРАВИЛЬНО: whitelist
$allowed = ['users', 'products'];
if (in_array($table, $allowed)) {
    $stmt = $pdo->query("SELECT * FROM $table");
}
```

### ❌ Ошибка 4: Не откатил транзакцию при ошибке

```php
// ПЛОХО
$pdo->beginTransaction();
try {
    // операции...
    $pdo->commit();
} catch (Exception $e) {
    // забыли rollBack()!
    echo $e->getMessage();
}

// ХОРОШО
try {
    $pdo->beginTransaction();
    // операции...
    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    echo $e->getMessage();
}
```

### ❌ Ошибка 5: LIKE с плейсхолдером

```php
// НЕПРАВИЛЬНО
$stmt = $pdo->prepare("SELECT * FROM users WHERE name LIKE '%?%'");
$stmt->execute(['John']); // НЕ СРАБОТАЕТ, ? в кавычках

// ПРАВИЛЬНО
$stmt = $pdo->prepare("SELECT * FROM users WHERE name LIKE ?");
$stmt->execute(["%John%"]); // % в самих данных
```

---

## 🎯 Чек-лист: Что ты должен знать

После этой главы ты должен уметь:

- [ ] Подключаться к БД через PDO с правильными опциями
- [ ] Понимать разницу между query() и prepare()
- [ ] Использовать позиционные и именованные плейсхолдеры
- [ ] Объяснить, как prepared statements защищают от SQL-инъекций
- [ ] Работать с fetch(), fetchAll(), fetchColumn()
- [ ] Настраивать режимы получения данных (FETCH_*)
- [ ] Обрабатывать ошибки через PDOException
- [ ] Использовать транзакции для атомарных операций
- [ ] Получать ID последней вставленной записи
- [ ] Проверять количество затронутых строк

---

## 🔍 Вопросы для самопроверки

1. В чём разница между `$pdo->query()` и `$pdo->prepare()`?
2. Почему нельзя использовать плейсхолдеры для названий таблиц?
3. Когда использовать `fetch()` вместо `fetchAll()`?
4. Что произойдёт, если не вызвать `rollBack()` при ошибке в транзакции?
5. Как получить количество строк, которые были изменены запросом UPDATE?

<details>
<summary>Ответы</summary>

1. `query()` выполняет запрос сразу (для статических запросов), `prepare()` создаёт подготовленное выражение для многократного использования с разными параметрами.

2. Плейсхолдеры работают только для **значений**, не для структуры SQL. БД должна знать структуру запроса до подстановки параметров.

3. `fetch()` получает по одной строке, экономит память для больших результатов. `fetchAll()` загружает всё сразу — удобнее, но требует больше памяти.

4. Изменения останутся "подвешенными" до конца соединения или явного commit/rollback. В MySQL с InnoDB изменения откатятся автоматически при закрытии соединения, но полагаться на это — плохая практика.

5. `$stmt->rowCount()` после execute().
</details>

---

## 🎊 Итоги

PDO — это **твой главный инструмент** для работы с базами данных в PHP. Запомни золотое правило:

> **ВСЕГДА используй prepared statements для пользовательских данных!**

Это не просто "хорошая практика" — это **обязательное требование безопасности**.

В следующей главе мы посмотрим на **паттерны работы с БД** — Repository, Active Record, Query Builder — и ты поймёшь, как структурировать код для работы с базой данных на профессиональном уровне.

Удачи! 🚀