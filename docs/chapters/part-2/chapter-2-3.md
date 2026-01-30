# Глава 2.3: Базы данных и PDO

## Подключение, запросы, prepared statements, транзакции

---

## Зачем нужны базы данных?

**База данных** — это организованное хранилище данных, которое позволяет эффективно сохранять, искать и изменять информацию.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ЗАЧЕМ НУЖНА БАЗА ДАННЫХ                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   📁 Файлы                        💾 База данных                │
│   ──────────────────────────────────────────────────────────   │
│   Простое хранение               Структурированное хранение    │
│   Медленный поиск                Быстрый поиск по индексам     │
│   Нет связей между данными       Связи между таблицами         │
│   Проблемы с конкурентностью     Транзакции и блокировки       │
│   Нет валидации                  Типы данных и ограничения     │
│                                                                 │
│   Файлы подходят для:            БД подходят для:              │
│   • Логи                         • Пользователи                │
│   • Конфигурация                 • Товары, заказы              │
│   • Кеш                          • Контент, комментарии        │
│   • Загруженные файлы            • Любые структурированные     │
│                                    данные                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Введение в PDO

### Что такое PDO?

**PDO (PHP Data Objects)** — универсальный интерфейс для работы с базами данных в PHP.

```
┌─────────────────────────────────────────────────────────────────┐
│                         ПОЧЕМУ PDO?                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ✅ Универсальность    Один API для MySQL, PostgreSQL,        │
│                         SQLite, Oracle и других                 │
│                                                                 │
│   ✅ Безопасность       Prepared statements защищают           │
│                         от SQL-инъекций                         │
│                                                                 │
│   ✅ ООП               Объектно-ориентированный интерфейс      │
│                                                                 │
│   ✅ Исключения        Удобная обработка ошибок                │
│                                                                 │
│   ❌ mysql_* функции   Устарели и удалены в PHP 7!             │
│   ❌ mysqli            Только для MySQL, менее удобный          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Поддерживаемые базы данных

```php
<?php
// Посмотреть доступные драйверы
print_r(PDO::getAvailableDrivers());
// ['mysql', 'pgsql', 'sqlite', ...]

// DSN (Data Source Name) для разных БД:

// MySQL
$dsn = 'mysql:host=localhost;dbname=myapp;charset=utf8mb4';

// PostgreSQL
$dsn = 'pgsql:host=localhost;dbname=myapp';

// SQLite
$dsn = 'sqlite:/path/to/database.db';

// SQLite в памяти (для тестов)
$dsn = 'sqlite::memory:';
```

---

## 2. Подключение к базе данных

### Базовое подключение

```php
<?php
$host = 'localhost';
$dbname = 'myapp';
$username = 'root';
$password = 'secret';
$charset = 'utf8mb4';

// DSN — строка подключения
$dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";

try {
    $pdo = new PDO($dsn, $username, $password);
    echo "Подключение успешно!";
} catch (PDOException $e) {
    die("Ошибка подключения: " . $e->getMessage());
}
```

### Настройка PDO (важные опции!)

```php
<?php
$options = [
    // Режим ошибок — выбрасывать исключения
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    
    // Режим выборки по умолчанию — ассоциативный массив
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    
    // Отключить эмуляцию prepared statements (использовать нативные)
    PDO::ATTR_EMULATE_PREPARES => false,
    
    // Не преобразовывать числа в строки
    PDO::ATTR_STRINGIFY_FETCHES => false,
];

$pdo = new PDO($dsn, $username, $password, $options);
```

### Почему эти опции важны?

```php
<?php
// PDO::ATTR_ERRMODE

// ERRMODE_SILENT (по умолчанию) — молча игнорирует ошибки!
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
$pdo->query("INVALID SQL");  // Ничего не произойдёт
// Нужно проверять: if ($pdo->errorCode() !== '00000') { ... }

// ERRMODE_WARNING — PHP Warning
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_WARNING);

// ERRMODE_EXCEPTION — выбрасывает исключение (рекомендуется!)
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->query("INVALID SQL");  // PDOException!


// PDO::ATTR_EMULATE_PREPARES

// true (по умолчанию) — PDO сам подставляет значения в запрос
// Менее безопасно, но работает везде

// false — драйвер БД обрабатывает prepared statements
// Более безопасно, типы данных сохраняются
// Требует правильной настройки сервера
```

### Класс для подключения

```php
<?php
class Database {
    private static ?PDO $instance = null;
    
    public static function getInstance(): PDO {
        if (self::$instance === null) {
            $config = require __DIR__ . '/config/database.php';
            
            $dsn = sprintf(
                '%s:host=%s;dbname=%s;charset=%s',
                $config['driver'],
                $config['host'],
                $config['database'],
                $config['charset']
            );
            
            self::$instance = new PDO(
                $dsn,
                $config['username'],
                $config['password'],
                $config['options']
            );
        }
        
        return self::$instance;
    }
    
    // Запретить клонирование
    private function __clone() {}
    
    // Запретить десериализацию
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

// config/database.php
return [
    'driver' => 'mysql',
    'host' => 'localhost',
    'database' => 'myapp',
    'username' => 'root',
    'password' => 'secret',
    'charset' => 'utf8mb4',
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ],
];

// Использование
$pdo = Database::getInstance();
```

---

## 3. Выполнение запросов

### query() — простые запросы без параметров

```php
<?php
// ⚠️ ТОЛЬКО для запросов БЕЗ пользовательских данных!

// SELECT
$stmt = $pdo->query("SELECT * FROM users WHERE active = 1");
$users = $stmt->fetchAll();

// Получить количество строк
$count = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();

// INSERT/UPDATE/DELETE (без параметров)
$pdo->query("UPDATE users SET last_login = NOW() WHERE id = 1");

// Количество затронутых строк
$affected = $pdo->query("DELETE FROM sessions WHERE expires < NOW()")->rowCount();
echo "Удалено сессий: $affected";
```

### exec() — запросы без результата

```php
<?php
// Для CREATE, DROP, ALTER, TRUNCATE и т.д.

$pdo->exec("CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

$pdo->exec("TRUNCATE TABLE cache");

// Возвращает количество затронутых строк
$affected = $pdo->exec("DELETE FROM old_data WHERE year < 2020");
```

### ⚠️ НИКОГДА не делай так!

```php
<?php
// ❌ SQL-ИНЪЕКЦИЯ!
$username = $_POST['username'];  // Может быть: "admin' OR '1'='1"
$password = $_POST['password'];

// ОПАСНО!!!
$sql = "SELECT * FROM users WHERE username = '$username' AND password = '$password'";
$user = $pdo->query($sql)->fetch();
// Атакующий войдёт как admin без пароля!

// Или ещё хуже:
$id = $_GET['id'];  // Может быть: "1; DROP TABLE users; --"
$pdo->query("DELETE FROM products WHERE id = $id");
// Удалит ВСЮ таблицу users!
```

---

## 4. Prepared Statements (Подготовленные выражения)

### Что такое prepared statements?

```
┌──────────────────────────────────────────────────────────────────┐
│              КАК РАБОТАЮТ PREPARED STATEMENTS                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. ПОДГОТОВКА (prepare)                                        │
│     SQL: "SELECT * FROM users WHERE id = ?"                     │
│     Запрос отправляется в БД и компилируется                    │
│                                                                  │
│  2. ПРИВЯЗКА (bind)                                             │
│     Значение: 5                                                 │
│     Значение передаётся ОТДЕЛЬНО от запроса                     │
│                                                                  │
│  3. ВЫПОЛНЕНИЕ (execute)                                        │
│     БД выполняет запрос с переданным значением                  │
│     Значение НИКОГДА не интерпретируется как SQL!               │
│                                                                  │
│  РЕЗУЛЬТАТ: SQL-инъекция НЕВОЗМОЖНА                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Позиционные плейсхолдеры (?)

```php
<?php
// Подготовить запрос
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");

// Выполнить с параметрами
$stmt->execute([5]);

// Получить результат
$user = $stmt->fetch();

// Несколько параметров
$stmt = $pdo->prepare("SELECT * FROM products WHERE category_id = ? AND price < ?");
$stmt->execute([3, 1000]);
$products = $stmt->fetchAll();

// INSERT
$stmt = $pdo->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
$stmt->execute(['Иван', 'ivan@test.com', password_hash('secret', PASSWORD_DEFAULT)]);

// Получить ID вставленной записи
$newId = $pdo->lastInsertId();

// UPDATE
$stmt = $pdo->prepare("UPDATE users SET name = ?, email = ? WHERE id = ?");
$stmt->execute(['Иван Иванов', 'ivan@example.com', 5]);

// DELETE
$stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
$stmt->execute([5]);

// Количество затронутых строк
echo "Затронуто строк: " . $stmt->rowCount();
```

### Именованные плейсхолдеры (:name)

```php
<?php
// Более читаемый синтаксис
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id");
$stmt->execute(['id' => 5]);
// или
$stmt->execute([':id' => 5]);

// Несколько параметров
$stmt = $pdo->prepare("
    SELECT * FROM products 
    WHERE category_id = :category 
    AND price BETWEEN :min_price AND :max_price
    ORDER BY :sort
");

$stmt->execute([
    'category' => 3,
    'min_price' => 100,
    'max_price' => 1000,
    'sort' => 'price',  // ⚠️ Не сработает! (см. ниже)
]);

// INSERT
$stmt = $pdo->prepare("
    INSERT INTO users (name, email, password, created_at) 
    VALUES (:name, :email, :password, NOW())
");

$stmt->execute([
    'name' => 'Мария',
    'email' => 'maria@test.com',
    'password' => password_hash('secret123', PASSWORD_DEFAULT),
]);
```

### bindValue vs bindParam

```php
<?php
// bindValue — привязывает ЗНАЧЕНИЕ (копию)
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id");
$id = 5;
$stmt->bindValue(':id', $id, PDO::PARAM_INT);
$stmt->execute();

// bindParam — привязывает ССЫЛКУ на переменную
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id");
$id = 5;
$stmt->bindParam(':id', $id, PDO::PARAM_INT);

$id = 10;  // Изменяем переменную
$stmt->execute();  // Выполнится с id = 10!

// Типы данных:
// PDO::PARAM_STR  — строка (по умолчанию)
// PDO::PARAM_INT  — целое число
// PDO::PARAM_BOOL — булево
// PDO::PARAM_NULL — NULL
// PDO::PARAM_LOB  — большие объекты (BLOB)

// Практическое применение bindParam — циклы
$stmt = $pdo->prepare("INSERT INTO logs (message) VALUES (:message)");
$stmt->bindParam(':message', $message);

$messages = ['Log 1', 'Log 2', 'Log 3'];
foreach ($messages as $message) {
    $stmt->execute();  // Каждый раз использует текущее значение $message
}
```

### Что НЕЛЬЗЯ параметризовать

```php
<?php
// ❌ Имена таблиц и столбцов НЕЛЬЗЯ параметризовать!
$table = $_GET['table'];
$stmt = $pdo->prepare("SELECT * FROM ?");  // НЕ СРАБОТАЕТ!

// ❌ ORDER BY направление
$stmt = $pdo->prepare("SELECT * FROM users ORDER BY name ?");  // НЕ СРАБОТАЕТ!

// ✅ Используй белый список (whitelist)
$allowedTables = ['users', 'products', 'orders'];
$table = $_GET['table'];

if (!in_array($table, $allowedTables, true)) {
    throw new InvalidArgumentException("Invalid table name");
}

$stmt = $pdo->prepare("SELECT * FROM $table WHERE id = ?");
$stmt->execute([$_GET['id']]);

// ✅ ORDER BY с белым списком
$allowedColumns = ['name', 'email', 'created_at'];
$allowedDirections = ['ASC', 'DESC'];

$column = $_GET['sort'] ?? 'created_at';
$direction = strtoupper($_GET['dir'] ?? 'DESC');

if (!in_array($column, $allowedColumns, true)) {
    $column = 'created_at';
}
if (!in_array($direction, $allowedDirections, true)) {
    $direction = 'DESC';
}

$stmt = $pdo->prepare("SELECT * FROM users ORDER BY $column $direction");
$stmt->execute();
```

---

## 5. Получение данных (Fetch)

### Режимы выборки

```php
<?php
$stmt = $pdo->query("SELECT * FROM users");

// FETCH_ASSOC — ассоциативный массив (рекомендуется)
$user = $stmt->fetch(PDO::FETCH_ASSOC);
// ['id' => 1, 'name' => 'Иван', 'email' => 'ivan@test.com']

// FETCH_NUM — числовой массив
$user = $stmt->fetch(PDO::FETCH_NUM);
// [0 => 1, 1 => 'Иван', 2 => 'ivan@test.com']

// FETCH_BOTH — и то, и другое (по умолчанию)
$user = $stmt->fetch(PDO::FETCH_BOTH);
// ['id' => 1, 0 => 1, 'name' => 'Иван', 1 => 'Иван', ...]

// FETCH_OBJ — анонимный объект
$user = $stmt->fetch(PDO::FETCH_OBJ);
// echo $user->name;

// FETCH_CLASS — объект указанного класса
class User {
    public int $id;
    public string $name;
    public string $email;
}

$stmt->setFetchMode(PDO::FETCH_CLASS, User::class);
$user = $stmt->fetch();
// $user instanceof User

// FETCH_COLUMN — одна колонка
$names = $pdo->query("SELECT name FROM users")->fetchAll(PDO::FETCH_COLUMN);
// ['Иван', 'Мария', 'Пётр']

// FETCH_KEY_PAIR — ключ-значение
$pairs = $pdo->query("SELECT id, name FROM users")->fetchAll(PDO::FETCH_KEY_PAIR);
// [1 => 'Иван', 2 => 'Мария', 3 => 'Пётр']

// FETCH_UNIQUE — индексировать по первому столбцу
$users = $pdo->query("SELECT id, name, email FROM users")->fetchAll(PDO::FETCH_UNIQUE);
// [1 => ['name' => 'Иван', 'email' => '...'], 2 => [...]]

// FETCH_GROUP — группировка по первому столбцу
$byCategory = $pdo->query("
    SELECT category_id, name, price FROM products
")->fetchAll(PDO::FETCH_GROUP);
// [1 => [['name' => '...', 'price' => ...], [...]], 2 => [...]]
```

### fetch vs fetchAll

```php
<?php
// fetch() — одна строка (или false если нет)
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([5]);
$user = $stmt->fetch();

if ($user) {
    echo "Найден: " . $user['name'];
} else {
    echo "Пользователь не найден";
}

// fetchAll() — все строки (или пустой массив)
$stmt = $pdo->query("SELECT * FROM users WHERE active = 1");
$users = $stmt->fetchAll();

foreach ($users as $user) {
    echo $user['name'] . "\n";
}

// ⚠️ fetchAll() загружает ВСЕ данные в память!
// Для больших выборок используй fetch() в цикле:
$stmt = $pdo->query("SELECT * FROM huge_table");
while ($row = $stmt->fetch()) {
    processRow($row);
}
```

### fetchColumn — одно значение

```php
<?php
// Получить одно значение
$count = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
echo "Всего пользователей: $count";

// Указать номер столбца (с 0)
$stmt = $pdo->query("SELECT id, name, email FROM users");
$name = $stmt->fetchColumn(1);  // Второй столбец (name)

// Проверка существования
$exists = $pdo->prepare("SELECT 1 FROM users WHERE email = ?");
$exists->execute(['ivan@test.com']);
if ($exists->fetchColumn()) {
    echo "Email уже существует";
}
```

---

## 6. Транзакции

### Что такое транзакция?

**Транзакция** — группа операций, которые выполняются как единое целое: либо все успешно, либо ни одна.

```
┌──────────────────────────────────────────────────────────────────┐
│                    ACID ПРИНЦИПЫ                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   A — Atomicity (Атомарность)                                   │
│       Все операции выполняются или ни одна                      │
│                                                                  │
│   C — Consistency (Согласованность)                             │
│       БД переходит из одного корректного состояния в другое     │
│                                                                  │
│   I — Isolation (Изолированность)                               │
│       Параллельные транзакции не влияют друг на друга           │
│                                                                  │
│   D — Durability (Долговечность)                                │
│       После commit данные сохранены навсегда                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Зачем нужны транзакции?

```php
<?php
// Пример: перевод денег между счетами

// ❌ БЕЗ транзакции — опасно!
$pdo->query("UPDATE accounts SET balance = balance - 1000 WHERE id = 1");
// Если здесь произойдёт ошибка, деньги исчезнут!
$pdo->query("UPDATE accounts SET balance = balance + 1000 WHERE id = 2");

// ✅ С транзакцией — безопасно
try {
    $pdo->beginTransaction();
    
    $stmt = $pdo->prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?");
    $stmt->execute([1000, 1]);
    
    // Проверка: достаточно ли средств?
    $balance = $pdo->query("SELECT balance FROM accounts WHERE id = 1")->fetchColumn();
    if ($balance < 0) {
        throw new Exception("Недостаточно средств");
    }
    
    $stmt = $pdo->prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?");
    $stmt->execute([1000, 2]);
    
    $pdo->commit();  // Подтвердить все изменения
    echo "Перевод выполнен!";
    
} catch (Exception $e) {
    $pdo->rollBack();  // Отменить все изменения
    echo "Ошибка: " . $e->getMessage();
}
```

### Базовое использование транзакций

```php
<?php
try {
    // Начать транзакцию
    $pdo->beginTransaction();
    
    // Выполнить несколько операций
    $pdo->exec("INSERT INTO orders (user_id, total) VALUES (1, 5000)");
    $orderId = $pdo->lastInsertId();
    
    $stmt = $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)");
    $stmt->execute([$orderId, 10, 2]);
    $stmt->execute([$orderId, 15, 1]);
    
    $pdo->exec("UPDATE products SET stock = stock - 2 WHERE id = 10");
    $pdo->exec("UPDATE products SET stock = stock - 1 WHERE id = 15");
    
    // Подтвердить транзакцию
    $pdo->commit();
    
} catch (Exception $e) {
    // Откатить при любой ошибке
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $e;
}
```

### Вложенные транзакции (Savepoints)

```php
<?php
// PDO не поддерживает вложенные транзакции напрямую,
// но можно использовать SAVEPOINT

class Transaction {
    private PDO $pdo;
    private int $level = 0;
    
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }
    
    public function begin(): void {
        if ($this->level === 0) {
            $this->pdo->beginTransaction();
        } else {
            $this->pdo->exec("SAVEPOINT level_{$this->level}");
        }
        $this->level++;
    }
    
    public function commit(): void {
        $this->level--;
        if ($this->level === 0) {
            $this->pdo->commit();
        } else {
            $this->pdo->exec("RELEASE SAVEPOINT level_{$this->level}");
        }
    }
    
    public function rollBack(): void {
        $this->level--;
        if ($this->level === 0) {
            $this->pdo->rollBack();
        } else {
            $this->pdo->exec("ROLLBACK TO SAVEPOINT level_{$this->level}");
        }
    }
}
```

### Callback-обёртка для транзакций

```php
<?php
function transaction(PDO $pdo, callable $callback) {
    $pdo->beginTransaction();
    
    try {
        $result = $callback($pdo);
        $pdo->commit();
        return $result;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// Использование
$orderId = transaction($pdo, function($pdo) {
    $pdo->exec("INSERT INTO orders (user_id, total) VALUES (1, 5000)");
    $orderId = $pdo->lastInsertId();
    
    // ... другие операции ...
    
    return $orderId;
});

echo "Создан заказ: $orderId";
```

---

## 7. Обработка ошибок

### Исключения PDO

```php
<?php
// Всегда устанавливай режим исключений!
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

try {
    $stmt = $pdo->prepare("SELECT * FROM nonexistent_table");
    $stmt->execute();
} catch (PDOException $e) {
    // Информация об ошибке
    echo "Сообщение: " . $e->getMessage() . "\n";
    echo "Код: " . $e->getCode() . "\n";
    
    // SQLSTATE код (стандартный)
    $sqlState = $e->errorInfo[0];
    
    // Код ошибки драйвера
    $driverCode = $e->errorInfo[1];
    
    // Сообщение драйвера
    $driverMessage = $e->errorInfo[2];
}
```

### Типичные ошибки

```php
<?php
try {
    // ... операции с БД ...
} catch (PDOException $e) {
    $code = $e->getCode();
    
    switch ($code) {
        case '23000':  // Integrity constraint violation
            // Дубликат уникального ключа
            if (str_contains($e->getMessage(), 'Duplicate entry')) {
                throw new DuplicateEntryException("Запись уже существует");
            }
            // Нарушение внешнего ключа
            if (str_contains($e->getMessage(), 'foreign key constraint')) {
                throw new ForeignKeyException("Связанная запись не найдена");
            }
            break;
            
        case '42S02':  // Table doesn't exist
            throw new TableNotFoundException("Таблица не найдена");
            
        case 'HY000':  // General error
            if (str_contains($e->getMessage(), 'server has gone away')) {
                // Потеряно соединение — попробовать переподключиться
            }
            break;
    }
    
    // Логирование
    error_log("Database error: " . $e->getMessage());
    
    // Не показывать детали пользователю!
    throw new RuntimeException("Ошибка базы данных");
}
```

### Логирование запросов (для отладки)

```php
<?php
class LoggingPDO extends PDO {
    private array $log = [];
    
    public function prepare(string $query, array $options = []): PDOStatement|false {
        $this->log[] = ['query' => $query, 'time' => microtime(true)];
        return parent::prepare($query, $options);
    }
    
    public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false {
        $start = microtime(true);
        $result = parent::query($query, $fetchMode, ...$fetchModeArgs);
        $this->log[] = [
            'query' => $query,
            'time' => microtime(true) - $start
        ];
        return $result;
    }
    
    public function getLog(): array {
        return $this->log;
    }
    
    public function getTotalTime(): float {
        return array_sum(array_column($this->log, 'time'));
    }
}

// Использование (только в development!)
$pdo = new LoggingPDO($dsn, $username, $password, $options);

// ... запросы ...

// В конце скрипта
foreach ($pdo->getLog() as $entry) {
    echo sprintf("%.4f ms: %s\n", $entry['time'] * 1000, $entry['query']);
}
echo "Total: " . $pdo->getTotalTime() * 1000 . " ms\n";
```

---

## 8. CRUD операции

### Create (INSERT)

```php
<?php
class UserRepository {
    private PDO $pdo;
    
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }
    
    public function create(array $data): int {
        $stmt = $this->pdo->prepare("
            INSERT INTO users (name, email, password, created_at)
            VALUES (:name, :email, :password, NOW())
        ");
        
        $stmt->execute([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => password_hash($data['password'], PASSWORD_DEFAULT),
        ]);
        
        return (int) $this->pdo->lastInsertId();
    }
    
    // Множественная вставка
    public function createMany(array $users): int {
        $stmt = $this->pdo->prepare("
            INSERT INTO users (name, email, password, created_at)
            VALUES (:name, :email, :password, NOW())
        ");
        
        $count = 0;
        foreach ($users as $user) {
            $stmt->execute([
                'name' => $user['name'],
                'email' => $user['email'],
                'password' => password_hash($user['password'], PASSWORD_DEFAULT),
            ]);
            $count++;
        }
        
        return $count;
    }
    
    // Вставить или обновить (UPSERT)
    public function upsert(string $email, array $data): void {
        $stmt = $this->pdo->prepare("
            INSERT INTO users (name, email, password, created_at)
            VALUES (:name, :email, :password, NOW())
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                updated_at = NOW()
        ");
        
        $stmt->execute([
            'name' => $data['name'],
            'email' => $email,
            'password' => password_hash($data['password'], PASSWORD_DEFAULT),
        ]);
    }
}
```

### Read (SELECT)

```php
<?php
class UserRepository {
    // ... конструктор ...
    
    public function find(int $id): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$id]);
        
        $user = $stmt->fetch();
        return $user ?: null;
    }
    
    public function findByEmail(string $email): ?array {
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        
        return $stmt->fetch() ?: null;
    }
    
    public function findAll(int $limit = 100, int $offset = 0): array {
        $stmt = $this->pdo->prepare("
            SELECT * FROM users 
            ORDER BY created_at DESC 
            LIMIT :limit OFFSET :offset
        ");
        
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }
    
    public function findActive(): array {
        return $this->pdo
            ->query("SELECT * FROM users WHERE active = 1 ORDER BY name")
            ->fetchAll();
    }
    
    public function count(): int {
        return (int) $this->pdo
            ->query("SELECT COUNT(*) FROM users")
            ->fetchColumn();
    }
    
    public function exists(int $id): bool {
        $stmt = $this->pdo->prepare("SELECT 1 FROM users WHERE id = ?");
        $stmt->execute([$id]);
        return (bool) $stmt->fetchColumn();
    }
    
    // Поиск с фильтрами
    public function search(array $filters): array {
        $sql = "SELECT * FROM users WHERE 1=1";
        $params = [];
        
        if (!empty($filters['name'])) {
            $sql .= " AND name LIKE :name";
            $params['name'] = '%' . $filters['name'] . '%';
        }
        
        if (!empty($filters['email'])) {
            $sql .= " AND email LIKE :email";
            $params['email'] = '%' . $filters['email'] . '%';
        }
        
        if (isset($filters['active'])) {
            $sql .= " AND active = :active";
            $params['active'] = (int) $filters['active'];
        }
        
        if (!empty($filters['created_after'])) {
            $sql .= " AND created_at >= :created_after";
            $params['created_after'] = $filters['created_after'];
        }
        
        $sql .= " ORDER BY created_at DESC LIMIT 100";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll();
    }
}
```

### Update (UPDATE)

```php
<?php
class UserRepository {
    // ... предыдущие методы ...
    
    public function update(int $id, array $data): bool {
        $stmt = $this->pdo->prepare("
            UPDATE users 
            SET name = :name, email = :email, updated_at = NOW()
            WHERE id = :id
        ");
        
        $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'email' => $data['email'],
        ]);
        
        return $stmt->rowCount() > 0;
    }
    
    // Динамическое обновление (только переданных полей)
    public function patch(int $id, array $data): bool {
        $allowedFields = ['name', 'email', 'phone', 'bio'];
        $updates = [];
        $params = ['id' => $id];
        
        foreach ($data as $field => $value) {
            if (in_array($field, $allowedFields, true)) {
                $updates[] = "$field = :$field";
                $params[$field] = $value;
            }
        }
        
        if (empty($updates)) {
            return false;
        }
        
        $updates[] = "updated_at = NOW()";
        
        $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->rowCount() > 0;
    }
    
    public function updatePassword(int $id, string $password): bool {
        $stmt = $this->pdo->prepare("
            UPDATE users 
            SET password = :password, updated_at = NOW()
            WHERE id = :id
        ");
        
        $stmt->execute([
            'id' => $id,
            'password' => password_hash($password, PASSWORD_DEFAULT),
        ]);
        
        return $stmt->rowCount() > 0;
    }
    
    public function activate(int $id): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET active = 1 WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }
    
    public function deactivate(int $id): bool {
        $stmt = $this->pdo->prepare("UPDATE users SET active = 0 WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }
}
```

### Delete (DELETE)

```php
<?php
class UserRepository {
    // ... предыдущие методы ...
    
    public function delete(int $id): bool {
        $stmt = $this->pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }
    
    // Мягкое удаление (soft delete)
    public function softDelete(int $id): bool {
        $stmt = $this->pdo->prepare("
            UPDATE users SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL
        ");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }
    
    public function restore(int $id): bool {
        $stmt = $this->pdo->prepare("
            UPDATE users SET deleted_at = NULL WHERE id = ?
        ");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }
    
    // Удаление нескольких записей
    public function deleteMany(array $ids): int {
        if (empty($ids)) {
            return 0;
        }
        
        // Создаём плейсхолдеры: ?, ?, ?
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        
        $stmt = $this->pdo->prepare("DELETE FROM users WHERE id IN ($placeholders)");
        $stmt->execute($ids);
        
        return $stmt->rowCount();
    }
    
    // Удаление старых записей
    public function deleteOlderThan(string $date): int {
        $stmt = $this->pdo->prepare("DELETE FROM users WHERE created_at < ?");
        $stmt->execute([$date]);
        return $stmt->rowCount();
    }
}
```

---

## 9. Продвинутые техники

### IN условие с массивом

```php
<?php
// Нужно получить пользователей по списку ID
$ids = [1, 5, 10, 15];

// ❌ Неправильно — один плейсхолдер для массива
$stmt = $pdo->prepare("SELECT * FROM users WHERE id IN (?)");
$stmt->execute([$ids]);  // Не сработает!

// ✅ Правильно — генерируем плейсхолдеры
$placeholders = implode(',', array_fill(0, count($ids), '?'));
$stmt = $pdo->prepare("SELECT * FROM users WHERE id IN ($placeholders)");
$stmt->execute($ids);
$users = $stmt->fetchAll();

// Функция-помощник
function whereIn(PDO $pdo, string $sql, string $placeholder, array $values, array $otherParams = []): PDOStatement {
    $count = count($values);
    $placeholders = implode(',', array_fill(0, $count, '?'));
    
    $sql = str_replace($placeholder, $placeholders, $sql);
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_merge($values, $otherParams));
    
    return $stmt;
}

// Использование
$stmt = whereIn(
    $pdo,
    "SELECT * FROM users WHERE id IN (:ids) AND active = ?",
    ':ids',
    [1, 5, 10],
    [1]  // active = 1
);
$users = $stmt->fetchAll();
```

### Пагинация

```php
<?php
class Paginator {
    private PDO $pdo;
    private string $baseQuery;
    private array $params;
    private int $perPage;
    
    public function __construct(PDO $pdo, string $query, array $params = [], int $perPage = 20) {
        $this->pdo = $pdo;
        $this->baseQuery = $query;
        $this->params = $params;
        $this->perPage = $perPage;
    }
    
    public function getPage(int $page): array {
        $page = max(1, $page);
        $offset = ($page - 1) * $this->perPage;
        
        $sql = $this->baseQuery . " LIMIT :limit OFFSET :offset";
        $stmt = $this->pdo->prepare($sql);
        
        foreach ($this->params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $this->perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        
        $stmt->execute();
        return $stmt->fetchAll();
    }
    
    public function getTotal(): int {
        // Убираем ORDER BY для подсчёта
        $countQuery = preg_replace('/ORDER BY.*/i', '', $this->baseQuery);
        $countQuery = "SELECT COUNT(*) FROM ($countQuery) AS count_table";
        
        $stmt = $this->pdo->prepare($countQuery);
        $stmt->execute($this->params);
        
        return (int) $stmt->fetchColumn();
    }
    
    public function getTotalPages(): int {
        return (int) ceil($this->getTotal() / $this->perPage);
    }
    
    public function paginate(int $page): array {
        $total = $this->getTotal();
        $totalPages = (int) ceil($total / $this->perPage);
        $page = max(1, min($page, $totalPages ?: 1));
        
        return [
            'data' => $this->getPage($page),
            'pagination' => [
                'current_page' => $page,
                'per_page' => $this->perPage,
                'total' => $total,
                'total_pages' => $totalPages,
                'has_prev' => $page > 1,
                'has_next' => $page < $totalPages,
            ],
        ];
    }
}

// Использование
$paginator = new Paginator(
    $pdo,
    "SELECT * FROM products WHERE category_id = :category ORDER BY created_at DESC",
    ['category' => 5],
    20
);

$result = $paginator->paginate($_GET['page'] ?? 1);

foreach ($result['data'] as $product) {
    echo $product['name'] . "\n";
}

echo "Страница {$result['pagination']['current_page']} из {$result['pagination']['total_pages']}";
```

### Query Builder (простой)

```php
<?php
class QueryBuilder {
    private PDO $pdo;
    private string $table;
    private array $select = ['*'];
    private array $where = [];
    private array $params = [];
    private array $orderBy = [];
    private ?int $limit = null;
    private ?int $offset = null;
    
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }
    
    public function table(string $table): self {
        $this->table = $table;
        return $this;
    }
    
    public function select(array $columns): self {
        $this->select = $columns;
        return $this;
    }
    
    public function where(string $column, string $operator, $value): self {
        $paramName = ':where_' . count($this->params);
        $this->where[] = "$column $operator $paramName";
        $this->params[$paramName] = $value;
        return $this;
    }
    
    public function whereIn(string $column, array $values): self {
        $placeholders = [];
        foreach ($values as $i => $value) {
            $paramName = ':wherein_' . count($this->params) . '_' . $i;
            $placeholders[] = $paramName;
            $this->params[$paramName] = $value;
        }
        $this->where[] = "$column IN (" . implode(',', $placeholders) . ")";
        return $this;
    }
    
    public function orderBy(string $column, string $direction = 'ASC'): self {
        $direction = strtoupper($direction) === 'DESC' ? 'DESC' : 'ASC';
        $this->orderBy[] = "$column $direction";
        return $this;
    }
    
    public function limit(int $limit): self {
        $this->limit = $limit;
        return $this;
    }
    
    public function offset(int $offset): self {
        $this->offset = $offset;
        return $this;
    }
    
    public function toSql(): string {
        $sql = "SELECT " . implode(', ', $this->select) . " FROM " . $this->table;
        
        if ($this->where) {
            $sql .= " WHERE " . implode(' AND ', $this->where);
        }
        
        if ($this->orderBy) {
            $sql .= " ORDER BY " . implode(', ', $this->orderBy);
        }
        
        if ($this->limit !== null) {
            $sql .= " LIMIT " . $this->limit;
        }
        
        if ($this->offset !== null) {
            $sql .= " OFFSET " . $this->offset;
        }
        
        return $sql;
    }
    
    public function get(): array {
        $stmt = $this->pdo->prepare($this->toSql());
        $stmt->execute($this->params);
        return $stmt->fetchAll();
    }
    
    public function first(): ?array {
        $this->limit(1);
        $result = $this->get();
        return $result[0] ?? null;
    }
    
    public function count(): int {
        $original = $this->select;
        $this->select = ['COUNT(*) as count'];
        
        $stmt = $this->pdo->prepare($this->toSql());
        $stmt->execute($this->params);
        
        $this->select = $original;
        return (int) $stmt->fetchColumn();
    }
}

// Использование
$qb = new QueryBuilder($pdo);

$users = $qb
    ->table('users')
    ->select(['id', 'name', 'email'])
    ->where('active', '=', 1)
    ->where('created_at', '>', '2025-01-01')
    ->orderBy('name')
    ->limit(10)
    ->get();

$user = $qb
    ->table('users')
    ->where('email', '=', 'ivan@test.com')
    ->first();
```

---

## 10. Практические примеры

### Пример 1: Система авторизации

```php
<?php
class AuthService {
    private PDO $pdo;
    
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }
    
    public function register(string $name, string $email, string $password): int {
        // Проверка уникальности email
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        
        if ($stmt->fetch()) {
            throw new Exception("Email уже зарегистрирован");
        }
        
        // Создание пользователя
        $stmt = $this->pdo->prepare("
            INSERT INTO users (name, email, password, created_at)
            VALUES (?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $name,
            $email,
            password_hash($password, PASSWORD_DEFAULT)
        ]);
        
        return (int) $this->pdo->lastInsertId();
    }
    
    public function login(string $email, string $password): ?array {
        $stmt = $this->pdo->prepare("
            SELECT id, name, email, password 
            FROM users 
            WHERE email = ? AND active = 1
        ");
        $stmt->execute([$email]);
        
        $user = $stmt->fetch();
        
        if (!$user || !password_verify($password, $user['password'])) {
            return null;
        }
        
        // Обновить время последнего входа
        $this->pdo->prepare("
            UPDATE users SET last_login = NOW() WHERE id = ?
        ")->execute([$user['id']]);
        
        unset($user['password']);
        return $user;
    }
    
    public function changePassword(int $userId, string $currentPassword, string $newPassword): bool {
        // Получить текущий хеш
        $stmt = $this->pdo->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $hash = $stmt->fetchColumn();
        
        if (!$hash || !password_verify($currentPassword, $hash)) {
            return false;
        }
        
        // Обновить пароль
        $stmt = $this->pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmt->execute([password_hash($newPassword, PASSWORD_DEFAULT), $userId]);
        
        return true;
    }
    
    public function createPasswordReset(string $email): ?string {
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $userId = $stmt->fetchColumn();
        
        if (!$userId) {
            return null;
        }
        
        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));
        
        $this->pdo->prepare("
            INSERT INTO password_resets (user_id, token, expires_at)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)
        ")->execute([$userId, hash('sha256', $token), $expires]);
        
        return $token;
    }
    
    public function resetPassword(string $token, string $newPassword): bool {
        $stmt = $this->pdo->prepare("
            SELECT user_id FROM password_resets 
            WHERE token = ? AND expires_at > NOW()
        ");
        $stmt->execute([hash('sha256', $token)]);
        $userId = $stmt->fetchColumn();
        
        if (!$userId) {
            return false;
        }
        
        $this->pdo->beginTransaction();
        
        try {
            $this->pdo->prepare("UPDATE users SET password = ? WHERE id = ?")
                ->execute([password_hash($newPassword, PASSWORD_DEFAULT), $userId]);
            
            $this->pdo->prepare("DELETE FROM password_resets WHERE user_id = ?")
                ->execute([$userId]);
            
            $this->pdo->commit();
            return true;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
```

### Пример 2: Каталог товаров

```php
<?php
class ProductRepository {
    private PDO $pdo;
    
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }
    
    public function findWithCategory(int $id): ?array {
        $stmt = $this->pdo->prepare("
            SELECT p.*, c.name as category_name
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        ");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }
    
    public function getByCategory(int $categoryId, int $page = 1, int $perPage = 20): array {
        $offset = ($page - 1) * $perPage;
        
        $stmt = $this->pdo->prepare("
            SELECT p.*, c.name as category_name
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE p.category_id = ? AND p.active = 1
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        ");
        
        $stmt->bindValue(1, $categoryId, PDO::PARAM_INT);
        $stmt->bindValue(2, $perPage, PDO::PARAM_INT);
        $stmt->bindValue(3, $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }
    
    public function search(string $query, array $filters = []): array {
        $sql = "
            SELECT p.*, c.name as category_name
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE p.active = 1
        ";
        $params = [];
        
        // Полнотекстовый поиск
        if ($query) {
            $sql .= " AND (p.name LIKE :query OR p.description LIKE :query)";
            $params['query'] = '%' . $query . '%';
        }
        
        // Фильтр по категории
        if (!empty($filters['category_id'])) {
            $sql .= " AND p.category_id = :category_id";
            $params['category_id'] = $filters['category_id'];
        }
        
        // Фильтр по цене
        if (!empty($filters['price_min'])) {
            $sql .= " AND p.price >= :price_min";
            $params['price_min'] = $filters['price_min'];
        }
        if (!empty($filters['price_max'])) {
            $sql .= " AND p.price <= :price_max";
            $params['price_max'] = $filters['price_max'];
        }
        
        // Сортировка
        $allowedSort = ['price', 'name', 'created_at'];
        $sort = in_array($filters['sort'] ?? '', $allowedSort) ? $filters['sort'] : 'created_at';
        $direction = ($filters['direction'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
        $sql .= " ORDER BY p.$sort $direction";
        
        // Лимит
        $sql .= " LIMIT 100";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
    
    public function getPopular(int $limit = 10): array {
        return $this->pdo->query("
            SELECT p.*, c.name as category_name, COUNT(oi.id) as order_count
            FROM products p
            JOIN categories c ON p.category_id = c.id
            LEFT JOIN order_items oi ON p.id = oi.product_id
            WHERE p.active = 1
            GROUP BY p.id
            ORDER BY order_count DESC
            LIMIT $limit
        ")->fetchAll();
    }
    
    public function updateStock(int $productId, int $quantity): bool {
        $stmt = $this->pdo->prepare("
            UPDATE products 
            SET stock = stock + :quantity, updated_at = NOW()
            WHERE id = :id
        ");
        
        $stmt->execute([
            'quantity' => $quantity,
            'id' => $productId,
        ]);
        
        return $stmt->rowCount() > 0;
    }
    
    public function decreaseStock(int $productId, int $quantity): bool {
        // Используем транзакцию для проверки и уменьшения
        $this->pdo->beginTransaction();
        
        try {
            // Блокируем строку FOR UPDATE
            $stmt = $this->pdo->prepare("
                SELECT stock FROM products WHERE id = ? FOR UPDATE
            ");
            $stmt->execute([$productId]);
            $stock = $stmt->fetchColumn();
            
            if ($stock < $quantity) {
                $this->pdo->rollBack();
                return false;
            }
            
            $this->pdo->prepare("
                UPDATE products SET stock = stock - ? WHERE id = ?
            ")->execute([$quantity, $productId]);
            
            $this->pdo->commit();
            return true;
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
```

### Пример 3: Система заказов

```php
<?php
class OrderService {
    private PDO $pdo;
    
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }
    
    public function createOrder(int $userId, array $cart, array $shippingData): int {
        $this->pdo->beginTransaction();
        
        try {
            // Рассчитать сумму и проверить наличие товаров
            $total = 0;
            $items = [];
            
            foreach ($cart as $productId => $quantity) {
                $stmt = $this->pdo->prepare("
                    SELECT id, name, price, stock 
                    FROM products 
                    WHERE id = ? AND active = 1
                    FOR UPDATE
                ");
                $stmt->execute([$productId]);
                $product = $stmt->fetch();
                
                if (!$product) {
                    throw new Exception("Товар не найден: $productId");
                }
                
                if ($product['stock'] < $quantity) {
                    throw new Exception("Недостаточно товара: {$product['name']}");
                }
                
                $items[] = [
                    'product_id' => $productId,
                    'quantity' => $quantity,
                    'price' => $product['price'],
                ];
                
                $total += $product['price'] * $quantity;
            }
            
            // Создать заказ
            $stmt = $this->pdo->prepare("
                INSERT INTO orders (user_id, total, status, shipping_address, created_at)
                VALUES (?, ?, 'pending', ?, NOW())
            ");
            $stmt->execute([
                $userId,
                $total,
                json_encode($shippingData, JSON_UNESCAPED_UNICODE),
            ]);
            
            $orderId = (int) $this->pdo->lastInsertId();
            
            // Добавить позиции заказа
            $stmt = $this->pdo->prepare("
                INSERT INTO order_items (order_id, product_id, quantity, price)
                VALUES (?, ?, ?, ?)
            ");
            
            foreach ($items as $item) {
                $stmt->execute([
                    $orderId,
                    $item['product_id'],
                    $item['quantity'],
                    $item['price'],
                ]);
                
                // Уменьшить остаток
                $this->pdo->prepare("
                    UPDATE products SET stock = stock - ? WHERE id = ?
                ")->execute([$item['quantity'], $item['product_id']]);
            }
            
            $this->pdo->commit();
            return $orderId;
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
    
    public function getOrderWithItems(int $orderId): ?array {
        $stmt = $this->pdo->prepare("
            SELECT o.*, u.name as user_name, u.email as user_email
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        ");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        
        if (!$order) {
            return null;
        }
        
        $stmt = $this->pdo->prepare("
            SELECT oi.*, p.name as product_name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        ");
        $stmt->execute([$orderId]);
        $order['items'] = $stmt->fetchAll();
        
        return $order;
    }
    
    public function getUserOrders(int $userId): array {
        $stmt = $this->pdo->prepare("
            SELECT o.*, 
                   (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
            FROM orders o
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }
    
    public function updateStatus(int $orderId, string $status): bool {
        $allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        
        if (!in_array($status, $allowedStatuses, true)) {
            throw new InvalidArgumentException("Invalid status: $status");
        }
        
        $stmt = $this->pdo->prepare("
            UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?
        ");
        $stmt->execute([$status, $orderId]);
        
        return $stmt->rowCount() > 0;
    }
    
    public function cancelOrder(int $orderId): bool {
        $this->pdo->beginTransaction();
        
        try {
            // Получить позиции заказа
            $items = $this->pdo->prepare("
                SELECT product_id, quantity FROM order_items WHERE order_id = ?
            ");
            $items->execute([$orderId]);
            
            // Вернуть товары на склад
            $restoreStock = $this->pdo->prepare("
                UPDATE products SET stock = stock + ? WHERE id = ?
            ");
            
            while ($item = $items->fetch()) {
                $restoreStock->execute([$item['quantity'], $item['product_id']]);
            }
            
            // Обновить статус
            $this->pdo->prepare("
                UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = ?
            ")->execute([$orderId]);
            
            $this->pdo->commit();
            return true;
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
```

---

## 11. Упражнения

### Упражнение 1: CRUD для статей (20 минут)

```php
<?php
// Создай класс ArticleRepository с методами:
// - create(array $data): int
// - find(int $id): ?array
// - findBySlug(string $slug): ?array
// - findPublished(int $limit, int $offset): array
// - update(int $id, array $data): bool
// - delete(int $id): bool
// - publish(int $id): bool
// - unpublish(int $id): bool

// Таблица articles:
// id, title, slug, content, author_id, published, created_at, updated_at
```

### Упражнение 2: Поиск с фильтрами (25 минут)

```php
<?php
// Создай метод поиска товаров с фильтрами:
// - Текстовый поиск по названию и описанию
// - Фильтр по категории (можно выбрать несколько)
// - Фильтр по диапазону цен
// - Фильтр по наличию на складе
// - Сортировка (по цене, по дате, по популярности)
// - Пагинация

// Метод должен строить SQL динамически на основе переданных фильтров
```

### Упражнение 3: Статистика (20 минут)

```php
<?php
// Создай класс StatsRepository с методами:
// - getUsersCountByMonth(int $year): array — количество регистраций по месяцам
// - getOrdersStats(): array — общее количество, сумма, средний чек
// - getTopProducts(int $limit): array — топ товаров по количеству заказов
// - getRevenueByCategory(): array — выручка по категориям
```

### Упражнение 4: Система комментариев (30 минут)

```php
<?php
// Создай систему древовидных комментариев:
// - Таблица: id, parent_id, article_id, user_id, content, created_at
// - Методы: add, delete (с удалением вложенных), getTree
// - getTree должен возвращать вложенную структуру комментариев
```

---

## 12. Вопросы для самопроверки

1. **Почему prepared statements защищают от SQL-инъекций?**

2. **Чем отличается `bindValue` от `bindParam`?**

3. **Когда нужно использовать транзакции?**

4. **Что возвращает `fetch()` если записей нет?**

5. **Как получить ID последней вставленной записи?**

6. **Почему нельзя параметризовать имена таблиц?**

7. **Что такое SQLSTATE и как его использовать?**

8. **Как правильно обрабатывать NULL значения?**

---

## 13. Частые ошибки

### Ошибка 1: Конкатенация вместо параметров

```php
<?php
// ❌ SQL-ИНЪЕКЦИЯ!
$id = $_GET['id'];
$pdo->query("SELECT * FROM users WHERE id = $id");

// ✅ Prepared statement
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$_GET['id']]);
```

### Ошибка 2: Нет обработки ошибок

```php
<?php
// ❌ Ошибка молча игнорируется
$pdo = new PDO($dsn, $user, $pass);
$pdo->query("INVALID SQL");  // Ничего не произойдёт

// ✅ Включить исключения
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);
```

### Ошибка 3: fetchAll для больших данных

```php
<?php
// ❌ Загрузит миллион записей в память!
$users = $pdo->query("SELECT * FROM users")->fetchAll();

// ✅ Обрабатывать построчно
$stmt = $pdo->query("SELECT * FROM users");
while ($user = $stmt->fetch()) {
    processUser($user);
}
```

### Ошибка 4: Нет транзакции для связанных операций

```php
<?php
// ❌ Если второй запрос упадёт — данные будут неконсистентны
$pdo->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
$pdo->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");

// ✅ Транзакция
$pdo->beginTransaction();
try {
    $pdo->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $pdo->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    throw $e;
}
```

### Ошибка 5: Неправильная проверка результата

```php
<?php
// ❌ fetch() возвращает false, а не null!
$user = $pdo->query("SELECT * FROM users WHERE id = 999")->fetch();
if ($user === null) {  // Не сработает!
    echo "Не найден";
}

// ✅ Правильная проверка
$user = $stmt->fetch();
if ($user === false) {
    echo "Не найден";
}

// ✅ Или так
if (!$user) {
    echo "Не найден";
}
```

---

## Резюме главы

```
┌────────────────────────────────────────────────────────────────┐
│                      ЗАПОМНИ ГЛАВНОЕ                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ПОДКЛЮЧЕНИЕ                                                   │
│  • Всегда устанавливай ERRMODE_EXCEPTION                      │
│  • Используй utf8mb4 для полной поддержки Unicode             │
│  • EMULATE_PREPARES = false для нативных prepared             │
│                                                                │
│  БЕЗОПАСНОСТЬ                                                  │
│  • ВСЕГДА используй prepared statements с параметрами         │
│  • НИКОГДА не вставляй пользовательские данные в SQL          │
│  • Имена таблиц/столбцов — через белый список                 │
│                                                                │
│  ВЫБОРКА                                                       │
│  • fetch() — одна строка (или false)                          │
│  • fetchAll() — все строки (массив)                           │
│  • fetchColumn() — одно значение                              │
│  • FETCH_ASSOC — ассоциативный массив                         │
│                                                                │
│  ТРАНЗАКЦИИ                                                    │
│  • beginTransaction() → commit() / rollBack()                 │
│  • Используй для связанных операций                           │
│  • Всегда в try-catch с rollBack                              │
│                                                                │
│  CRUD                                                          │
│  • lastInsertId() — ID после INSERT                           │
│  • rowCount() — количество затронутых строк                   │
│  • Для IN(...) — генерируй плейсхолдеры динамически           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

**Следующая глава:** `Глава 2.4: Заголовки HTTP и редиректы`
