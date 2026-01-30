# Глава 3.4: Паттерны работы с БД — Repository, Active Record, Query Builder

## Введение: Зачем нужны паттерны работы с базой данных?

Представь, что ты работаешь над приложением, где есть пользователи. Вот типичный код без паттернов:

```php
// В контроллере регистрации
$stmt = $pdo->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
$stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);

// В контроллере профиля
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// В контроллере списка пользователей
$stmt = $pdo->query("SELECT * FROM users WHERE active = 1");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);
```

**Проблемы этого подхода:**

1. **Дублирование кода** — SQL-запросы повторяются в разных местах
2. **Сложное тестирование** — нельзя протестировать логику без реальной БД
3. **Трудно менять** — если структура таблицы изменится, придётся искать все места
4. **Смешение ответственности** — контроллеры знают о деталях БД
5. **Нет переиспользования** — каждый раз пишем похожий код заново

**Паттерны работы с БД решают эти проблемы**, предоставляя структурированные способы взаимодействия с данными.

---

## Часть 1: Repository Pattern (Паттерн Репозиторий)

### Что это такое?

**Repository** — это класс, который инкапсулирует всю логику работы с определённой сущностью (таблицей). Он становится "посредником" между вашим бизнес-кодом и базой данных.

### Принципы Repository

1. **Один репозиторий = одна сущность** (UserRepository для users, ProductRepository для products)
2. **Скрывает детали работы с БД** — остальной код не знает про SQL
3. **Возвращает объекты или массивы**, а не результаты PDO
4. **Легко тестировать** — можно подменить на мок-объект

### Базовая реализация

```php
<?php
// src/Repository/UserRepository.php

class UserRepository
{
    private PDO $pdo;
    
    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }
    
    /**
     * Найти пользователя по ID
     */
    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $user ?: null;
    }
    
    /**
     * Получить всех пользователей
     */
    public function findAll(): array
    {
        $stmt = $this->pdo->query("SELECT * FROM users ORDER BY created_at DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Найти пользователя по email
     */
    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $user ?: null;
    }
    
    /**
     * Создать нового пользователя
     */
    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO users (name, email, password, created_at) 
            VALUES (:name, :email, :password, NOW())
        ");
        
        $stmt->execute([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => password_hash($data['password'], PASSWORD_DEFAULT)
        ]);
        
        return (int) $this->pdo->lastInsertId();
    }
    
    /**
     * Обновить пользователя
     */
    public function update(int $id, array $data): bool
    {
        $stmt = $this->pdo->prepare("
            UPDATE users 
            SET name = :name, email = :email 
            WHERE id = :id
        ");
        
        return $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'email' => $data['email']
        ]);
    }
    
    /**
     * Удалить пользователя
     */
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare("DELETE FROM users WHERE id = ?");
        return $stmt->execute([$id]);
    }
    
    /**
     * Найти активных пользователей
     */
    public function findActive(): array
    {
        $stmt = $this->pdo->query("SELECT * FROM users WHERE active = 1");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
```

### Использование Repository

```php
<?php
// index.php

require_once 'config/database.php';
require_once 'src/Repository/UserRepository.php';

$userRepo = new UserRepository($pdo);

// Создание пользователя
$userId = $userRepo->create([
    'name' => 'Алиса',
    'email' => 'alice@example.com',
    'password' => 'secret123'
]);

// Получение пользователя
$user = $userRepo->find($userId);
echo "Пользователь: " . $user['name'] . "\n";

// Поиск по email
$user = $userRepo->findByEmail('alice@example.com');
if ($user) {
    echo "Найден: " . $user['name'] . "\n";
}

// Обновление
$userRepo->update($userId, [
    'name' => 'Алиса Иванова',
    'email' => 'alice@example.com'
]);

// Получение всех активных
$activeUsers = $userRepo->findActive();
foreach ($activeUsers as $user) {
    echo $user['name'] . "\n";
}

// Удаление
$userRepo->delete($userId);
```

### Продвинутый Repository с фильтрацией

```php
<?php
class UserRepository
{
    // ... предыдущий код ...
    
    /**
     * Поиск с фильтрами
     */
    public function findBy(array $criteria): array
    {
        $where = [];
        $params = [];
        
        foreach ($criteria as $field => $value) {
            $where[] = "$field = ?";
            $params[] = $value;
        }
        
        $sql = "SELECT * FROM users WHERE " . implode(' AND ', $where);
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Подсчёт пользователей
     */
    public function count(array $criteria = []): int
    {
        if (empty($criteria)) {
            $stmt = $this->pdo->query("SELECT COUNT(*) FROM users");
            return (int) $stmt->fetchColumn();
        }
        
        $where = [];
        $params = [];
        
        foreach ($criteria as $field => $value) {
            $where[] = "$field = ?";
            $params[] = $value;
        }
        
        $sql = "SELECT COUNT(*) FROM users WHERE " . implode(' AND ', $where);
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return (int) $stmt->fetchColumn();
    }
    
    /**
     * Пагинация
     */
    public function paginate(int $page = 1, int $perPage = 10): array
    {
        $offset = ($page - 1) * $perPage;
        
        $stmt = $this->pdo->prepare("
            SELECT * FROM users 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        ");
        
        $stmt->execute([$perPage, $offset]);
        
        return [
            'data' => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'total' => $this->count(),
            'page' => $page,
            'per_page' => $perPage
        ];
    }
}
```

**Использование:**

```php
// Поиск по нескольким критериям
$admins = $userRepo->findBy(['role' => 'admin', 'active' => 1]);

// Подсчёт активных пользователей
$activeCount = $userRepo->count(['active' => 1]);

// Пагинация
$result = $userRepo->paginate(2, 20); // страница 2, по 20 записей
echo "Всего пользователей: " . $result['total'] . "\n";
foreach ($result['data'] as $user) {
    echo $user['name'] . "\n";
}
```

---

## Часть 2: Active Record Pattern

### Что это такое?

**Active Record** — это паттерн, где **каждый объект = одна запись в БД**. Объект "знает", как себя сохранить, обновить и удалить.

В отличие от Repository, где логика БД отделена от данных, в Active Record объект **сам** управляет своими данными в БД.

### Базовая реализация Active Record

```php
<?php
// src/Model/User.php

class User
{
    private static PDO $pdo;
    
    public ?int $id = null;
    public string $name;
    public string $email;
    public string $password;
    public string $created_at;
    
    /**
     * Установка подключения к БД (вызывается один раз при старте)
     */
    public static function setDatabase(PDO $pdo): void
    {
        self::$pdo = $pdo;
    }
    
    /**
     * Найти пользователя по ID
     */
    public static function find(int $id): ?self
    {
        $stmt = self::$pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$data) {
            return null;
        }
        
        return self::hydrate($data);
    }
    
    /**
     * Получить всех пользователей
     */
    public static function all(): array
    {
        $stmt = self::$pdo->query("SELECT * FROM users ORDER BY created_at DESC");
        $users = [];
        
        while ($data = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $users[] = self::hydrate($data);
        }
        
        return $users;
    }
    
    /**
     * Найти по email
     */
    public static function findByEmail(string $email): ?self
    {
        $stmt = self::$pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $data ? self::hydrate($data) : null;
    }
    
    /**
     * Сохранить объект (создать или обновить)
     */
    public function save(): bool
    {
        if ($this->id === null) {
            return $this->insert();
        } else {
            return $this->update();
        }
    }
    
    /**
     * Создать новую запись
     */
    private function insert(): bool
    {
        $stmt = self::$pdo->prepare("
            INSERT INTO users (name, email, password, created_at) 
            VALUES (:name, :email, :password, NOW())
        ");
        
        $result = $stmt->execute([
            'name' => $this->name,
            'email' => $this->email,
            'password' => $this->password
        ]);
        
        if ($result) {
            $this->id = (int) self::$pdo->lastInsertId();
        }
        
        return $result;
    }
    
    /**
     * Обновить существующую запись
     */
    private function update(): bool
    {
        $stmt = self::$pdo->prepare("
            UPDATE users 
            SET name = :name, email = :email, password = :password 
            WHERE id = :id
        ");
        
        return $stmt->execute([
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'password' => $this->password
        ]);
    }
    
    /**
     * Удалить запись
     */
    public function delete(): bool
    {
        if ($this->id === null) {
            return false;
        }
        
        $stmt = self::$pdo->prepare("DELETE FROM users WHERE id = ?");
        return $stmt->execute([$this->id]);
    }
    
    /**
     * Создать объект из массива данных БД
     */
    private static function hydrate(array $data): self
    {
        $user = new self();
        $user->id = (int) $data['id'];
        $user->name = $data['name'];
        $user->email = $data['email'];
        $user->password = $data['password'];
        $user->created_at = $data['created_at'];
        
        return $user;
    }
}
```

### Использование Active Record

```php
<?php
require_once 'config/database.php';
require_once 'src/Model/User.php';

// Устанавливаем подключение к БД
User::setDatabase($pdo);

// Создание нового пользователя
$user = new User();
$user->name = 'Боб';
$user->email = 'bob@example.com';
$user->password = password_hash('secret', PASSWORD_DEFAULT);
$user->save(); // INSERT

echo "Создан пользователь ID: {$user->id}\n";

// Получение пользователя
$foundUser = User::find($user->id);
echo "Найден: {$foundUser->name}\n";

// Обновление
$foundUser->name = 'Боб Смит';
$foundUser->save(); // UPDATE

// Поиск по email
$alice = User::findByEmail('alice@example.com');
if ($alice) {
    echo "Email принадлежит: {$alice->name}\n";
}

// Получение всех пользователей
$allUsers = User::all();
foreach ($allUsers as $u) {
    echo "{$u->id}: {$u->name} ({$u->email})\n";
}

// Удаление
$foundUser->delete();
```

### Расширенный Active Record с валидацией

```php
<?php
class User
{
    // ... предыдущий код ...
    
    private array $errors = [];
    
    /**
     * Валидация перед сохранением
     */
    public function validate(): bool
    {
        $this->errors = [];
        
        // Проверка имени
        if (empty($this->name) || strlen($this->name) < 2) {
            $this->errors['name'] = 'Имя должно быть не менее 2 символов';
        }
        
        // Проверка email
        if (!filter_var($this->email, FILTER_VALIDATE_EMAIL)) {
            $this->errors['email'] = 'Некорректный email';
        }
        
        // Проверка уникальности email (только при создании)
        if ($this->id === null) {
            $existing = self::findByEmail($this->email);
            if ($existing) {
                $this->errors['email'] = 'Email уже используется';
            }
        }
        
        // Проверка пароля
        if ($this->id === null && strlen($this->password) < 6) {
            $this->errors['password'] = 'Пароль должен быть не менее 6 символов';
        }
        
        return empty($this->errors);
    }
    
    /**
     * Получить ошибки валидации
     */
    public function getErrors(): array
    {
        return $this->errors;
    }
    
    /**
     * Сохранить с валидацией
     */
    public function save(): bool
    {
        if (!$this->validate()) {
            return false;
        }
        
        // Хешируем пароль, если это новый пользователь и пароль не захеширован
        if ($this->id === null && !password_get_info($this->password)['algo']) {
            $this->password = password_hash($this->password, PASSWORD_DEFAULT);
        }
        
        if ($this->id === null) {
            return $this->insert();
        } else {
            return $this->update();
        }
    }
}
```

**Использование с валидацией:**

```php
$user = new User();
$user->name = 'A'; // слишком короткое
$user->email = 'invalid-email'; // некорректный email
$user->password = '123'; // слишком короткий пароль

if (!$user->save()) {
    echo "Ошибки валидации:\n";
    foreach ($user->getErrors() as $field => $error) {
        echo "- $field: $error\n";
    }
} else {
    echo "Пользователь сохранён!\n";
}
```

---

## Часть 3: Query Builder Pattern

### Что это такое?

**Query Builder** — это класс, который позволяет **строить SQL-запросы программно**, используя методы PHP вместо написания SQL вручную.

### Преимущества Query Builder

1. **Читаемость** — код выглядит как описание запроса
2. **Гибкость** — можно динамически добавлять условия
3. **Безопасность** — автоматически использует prepared statements
4. **Переносимость** — легче переключаться между БД

### Базовая реализация Query Builder

```php
<?php
// src/Database/QueryBuilder.php

class QueryBuilder
{
    private PDO $pdo;
    private string $table;
    private array $select = ['*'];
    private array $where = [];
    private array $bindings = [];
    private ?string $orderBy = null;
    private ?int $limit = null;
    private ?int $offset = null;
    
    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }
    
    /**
     * Указать таблицу
     */
    public function table(string $table): self
    {
        $this->table = $table;
        return $this;
    }
    
    /**
     * Выбрать поля
     */
    public function select(array $columns): self
    {
        $this->select = $columns;
        return $this;
    }
    
    /**
     * Добавить условие WHERE
     */
    public function where(string $column, string $operator, $value): self
    {
        $this->where[] = "$column $operator ?";
        $this->bindings[] = $value;
        return $this;
    }
    
    /**
     * Сортировка
     */
    public function orderBy(string $column, string $direction = 'ASC'): self
    {
        $this->orderBy = "$column $direction";
        return $this;
    }
    
    /**
     * Ограничение количества
     */
    public function limit(int $limit): self
    {
        $this->limit = $limit;
        return $this;
    }
    
    /**
     * Смещение
     */
    public function offset(int $offset): self
    {
        $this->offset = $offset;
        return $this;
    }
    
    /**
     * Получить все записи
     */
    public function get(): array
    {
        $sql = $this->buildSelectQuery();
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($this->bindings);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Получить первую запись
     */
    public function first(): ?array
    {
        $this->limit(1);
        $results = $this->get();
        
        return $results[0] ?? null;
    }
    
    /**
     * Подсчитать записи
     */
    public function count(): int
    {
        $originalSelect = $this->select;
        $this->select = ['COUNT(*) as count'];
        
        $result = $this->first();
        $this->select = $originalSelect;
        
        return (int) ($result['count'] ?? 0);
    }
    
    /**
     * Вставить запись
     */
    public function insert(array $data): int
    {
        $columns = array_keys($data);
        $placeholders = array_fill(0, count($columns), '?');
        
        $sql = sprintf(
            "INSERT INTO %s (%s) VALUES (%s)",
            $this->table,
            implode(', ', $columns),
            implode(', ', $placeholders)
        );
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(array_values($data));
        
        return (int) $this->pdo->lastInsertId();
    }
    
    /**
     * Обновить записи
     */
    public function update(array $data): int
    {
        $sets = [];
        $bindings = [];
        
        foreach ($data as $column => $value) {
            $sets[] = "$column = ?";
            $bindings[] = $value;
        }
        
        $sql = "UPDATE {$this->table} SET " . implode(', ', $sets);
        
        if (!empty($this->where)) {
            $sql .= " WHERE " . implode(' AND ', $this->where);
            $bindings = array_merge($bindings, $this->bindings);
        }
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($bindings);
        
        return $stmt->rowCount();
    }
    
    /**
     * Удалить записи
     */
    public function delete(): int
    {
        $sql = "DELETE FROM {$this->table}";
        
        if (!empty($this->where)) {
            $sql .= " WHERE " . implode(' AND ', $this->where);
        }
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($this->bindings);
        
        return $stmt->rowCount();
    }
    
    /**
     * Построить SQL для SELECT
     */
    private function buildSelectQuery(): string
    {
        $sql = "SELECT " . implode(', ', $this->select) . " FROM {$this->table}";
        
        if (!empty($this->where)) {
            $sql .= " WHERE " . implode(' AND ', $this->where);
        }
        
        if ($this->orderBy) {
            $sql .= " ORDER BY {$this->orderBy}";
        }
        
        if ($this->limit) {
            $sql .= " LIMIT {$this->limit}";
        }
        
        if ($this->offset) {
            $sql .= " OFFSET {$this->offset}";
        }
        
        return $sql;
    }
    
    /**
     * Сбросить состояние для повторного использования
     */
    private function reset(): void
    {
        $this->select = ['*'];
        $this->where = [];
        $this->bindings = [];
        $this->orderBy = null;
        $this->limit = null;
        $this->offset = null;
    }
}
```

### Использование Query Builder

```php
<?php
require_once 'config/database.php';
require_once 'src/Database/QueryBuilder.php';

$qb = new QueryBuilder($pdo);

// Простой SELECT
$users = $qb->table('users')->get();
foreach ($users as $user) {
    echo $user['name'] . "\n";
}

// SELECT с условиями
$activeUsers = $qb->table('users')
    ->where('active', '=', 1)
    ->orderBy('created_at', 'DESC')
    ->get();

// Получить одного пользователя
$user = $qb->table('users')
    ->where('email', '=', 'alice@example.com')
    ->first();

// Выборка определённых полей
$names = $qb->table('users')
    ->select(['id', 'name', 'email'])
    ->where('active', '=', 1)
    ->get();

// Пагинация
$page2Users = $qb->table('users')
    ->orderBy('id', 'ASC')
    ->limit(10)
    ->offset(10) // страница 2
    ->get();

// Подсчёт
$activeCount = $qb->table('users')
    ->where('active', '=', 1)
    ->count();
echo "Активных пользователей: $activeCount\n";

// INSERT
$userId = $qb->table('users')->insert([
    'name' => 'Чарли',
    'email' => 'charlie@example.com',
    'password' => password_hash('secret', PASSWORD_DEFAULT),
    'active' => 1
]);
echo "Создан пользователь ID: $userId\n";

// UPDATE
$affected = $qb->table('users')
    ->where('id', '=', $userId)
    ->update([
        'name' => 'Чарли Браун',
        'email' => 'charlie.brown@example.com'
    ]);
echo "Обновлено записей: $affected\n";

// DELETE
$deleted = $qb->table('users')
    ->where('id', '=', $userId)
    ->delete();
echo "Удалено записей: $deleted\n";
```

### Расширенный Query Builder с дополнительными методами

```php
<?php
class QueryBuilder
{
    // ... предыдущий код ...
    
    /**
     * OR условие
     */
    public function orWhere(string $column, string $operator, $value): self
    {
        // Упрощённая реализация - в реальности нужна более сложная логика
        $lastIndex = count($this->where) - 1;
        if ($lastIndex >= 0) {
            $this->where[$lastIndex] .= " OR $column $operator ?";
        } else {
            $this->where[] = "$column $operator ?";
        }
        
        $this->bindings[] = $value;
        return $this;
    }
    
    /**
     * WHERE IN
     */
    public function whereIn(string $column, array $values): self
    {
        $placeholders = implode(', ', array_fill(0, count($values), '?'));
        $this->where[] = "$column IN ($placeholders)";
        $this->bindings = array_merge($this->bindings, $values);
        
        return $this;
    }
    
    /**
     * WHERE BETWEEN
     */
    public function whereBetween(string $column, $min, $max): self
    {
        $this->where[] = "$column BETWEEN ? AND ?";
        $this->bindings[] = $min;
        $this->bindings[] = $max;
        
        return $this;
    }
    
    /**
     * WHERE LIKE
     */
    public function whereLike(string $column, string $pattern): self
    {
        $this->where[] = "$column LIKE ?";
        $this->bindings[] = $pattern;
        
        return $this;
    }
    
    /**
     * JOIN
     */
    private array $joins = [];
    
    public function join(string $table, string $first, string $operator, string $second): self
    {
        $this->joins[] = "INNER JOIN $table ON $first $operator $second";
        return $this;
    }
    
    /**
     * LEFT JOIN
     */
    public function leftJoin(string $table, string $first, string $operator, string $second): self
    {
        $this->joins[] = "LEFT JOIN $table ON $first $operator $second";
        return $this;
    }
    
    /**
     * GROUP BY
     */
    private ?string $groupBy = null;
    
    public function groupBy(string $column): self
    {
        $this->groupBy = $column;
        return $this;
    }
    
    /**
     * Обновлённый buildSelectQuery с JOIN и GROUP BY
     */
    private function buildSelectQuery(): string
    {
        $sql = "SELECT " . implode(', ', $this->select) . " FROM {$this->table}";
        
        if (!empty($this->joins)) {
            $sql .= " " . implode(' ', $this->joins);
        }
        
        if (!empty($this->where)) {
            $sql .= " WHERE " . implode(' AND ', $this->where);
        }
        
        if ($this->groupBy) {
            $sql .= " GROUP BY {$this->groupBy}";
        }
        
        if ($this->orderBy) {
            $sql .= " ORDER BY {$this->orderBy}";
        }
        
        if ($this->limit) {
            $sql .= " LIMIT {$this->limit}";
        }
        
        if ($this->offset) {
            $sql .= " OFFSET {$this->offset}";
        }
        
        return $sql;
    }
}
```

**Использование расширенных методов:**

```php
// WHERE IN
$admins = $qb->table('users')
    ->whereIn('role', ['admin', 'moderator'])
    ->get();

// WHERE BETWEEN
$recentUsers = $qb->table('users')
    ->whereBetween('created_at', '2025-01-01', '2025-01-31')
    ->get();

// WHERE LIKE
$searchResults = $qb->table('users')
    ->whereLike('name', '%Alice%')
    ->get();

// JOIN
$ordersWithUsers = $qb->table('orders')
    ->select(['orders.*', 'users.name as user_name'])
    ->join('users', 'orders.user_id', '=', 'users.id')
    ->where('orders.status', '=', 'completed')
    ->get();

// GROUP BY
$orderCounts = $qb->table('orders')
    ->select(['user_id', 'COUNT(*) as total'])
    ->groupBy('user_id')
    ->get();
```

---

## Часть 4: Сравнение паттернов

### Repository vs Active Record vs Query Builder

| Характеристика | Repository | Active Record | Query Builder |
|----------------|------------|---------------|---------------|
| **Сложность** | Средняя | Низкая | Низкая |
| **Разделение ответственности** | ✅ Отлично | ❌ Слабое | ✅ Хорошее |
| **Тестируемость** | ✅ Отлично | ⚠️ Средне | ✅ Хорошо |
| **Гибкость запросов** | ⚠️ Нужно писать методы | ❌ Ограничена | ✅ Очень гибко |
| **Простота использования** | ⚠️ Средняя | ✅ Очень просто | ✅ Просто |
| **Переиспользование** | ✅ Да | ⚠️ Частично | ✅ Да |

### Когда что использовать?

**Repository:**
- ✅ Когда важна чистая архитектура
- ✅ Для тестирования через моки
- ✅ Когда логика работы с данными сложная
- ✅ В больших приложениях с чётким разделением слоёв

**Active Record:**
- ✅ Для простых CRUD-приложений
- ✅ Для быстрого прототипирования
- ✅ Когда объекты полностью соответствуют таблицам
- ❌ Не для сложной бизнес-логики

**Query Builder:**
- ✅ Для динамических запросов с условиями
- ✅ Когда нужна гибкость SQL без написания строк
- ✅ Для reporting и аналитики
- ✅ Как основа для Repository или Active Record

### Комбинирование паттернов

На практике часто используют **комбинацию**:

```php
<?php
// Repository использует Query Builder внутри
class UserRepository
{
    private QueryBuilder $qb;
    
    public function __construct(QueryBuilder $qb)
    {
        $this->qb = $qb;
    }
    
    public function findActive(): array
    {
        return $this->qb->table('users')
            ->where('active', '=', 1)
            ->orderBy('created_at', 'DESC')
            ->get();
    }
    
    public function findByRole(string $role): array
    {
        return $this->qb->table('users')
            ->where('role', '=', $role)
            ->get();
    }
    
    public function search(array $filters): array
    {
        $query = $this->qb->table('users');
        
        if (isset($filters['name'])) {
            $query->whereLike('name', "%{$filters['name']}%");
        }
        
        if (isset($filters['role'])) {
            $query->where('role', '=', $filters['role']);
        }
        
        if (isset($filters['active'])) {
            $query->where('active', '=', $filters['active']);
        }
        
        return $query->orderBy('created_at', 'DESC')->get();
    }
}
```

---

## Практические задания

### Задание 1: Базовый Repository
Создай `ProductRepository` для таблицы products:
- `find($id)` — найти по ID
- `findAll()` — все продукты
- `findByCategory($categoryId)` — по категории
- `create($data)` — создать
- `update($id, $data)` — обновить
- `delete($id)` — удалить
- `findInPriceRange($min, $max)` — в диапазоне цен

### Задание 2: Active Record для Order
Создай класс `Order` в стиле Active Record:
- Свойства: `id`, `user_id`, `total`, `status`, `created_at`
- `save()` — сохранить заказ
- `static find($id)` — найти заказ
- `static findByUser($userId)` — заказы пользователя
- `static findByStatus($status)` — заказы по статусу
- `cancel()` — отменить заказ (изменить статус)
- `complete()` — завершить заказ

### Задание 3: Расширенный Query Builder
Добавь в Query Builder методы:
- `whereNull($column)` — WHERE column IS NULL
- `whereNotNull($column)` — WHERE column IS NOT NULL
- `whereBetween($column, $min, $max)` — уже есть, проверь работу
- `avg($column)` — среднее значение
- `sum($column)` — сумма
- `max($column)` — максимум
- `min($column)` — минимум

**Пример использования:**
```php
$avgPrice = $qb->table('products')->avg('price');
$totalSales = $qb->table('orders')
    ->where('status', '=', 'completed')
    ->sum('total');
```

### Задание 4: Repository + Query Builder
Создай `OrderRepository`, который использует `QueryBuilder`:
- `findPending()` — заказы в ожидании
- `findCompleted()` — завершённые заказы
- `getTotalRevenue()` — общая выручка
- `getRevenueByMonth($year, $month)` — выручка за месяц
- `getMostValuableCustomers($limit = 10)` — топ клиентов по сумме заказов

### Задание 5: Практический проект
Создай мини-систему управления задачами (TODO):
- Таблица `tasks`: id, title, description, status, user_id, created_at
- Используй **Repository** для Tasks
- Добавь методы:
  - `findByUser($userId)`
  - `findCompleted()`
  - `findPending()`
  - `markAsCompleted($id)`
  - `assignToUser($taskId, $userId)`

---

## Частые ошибки

### ❌ Ошибка 1: Смешивание SQL в Repository
```php
// ПЛОХО - логика приложения знает про SQL
$users = $userRepo->query("SELECT * FROM users WHERE active = 1");

// ХОРОШО - Repository скрывает SQL
$users = $userRepo->findActive();
```

### ❌ Ошибка 2: Active Record со сложной логикой
```php
// ПЛОХО - слишком много ответственности
class User {
    public function save() { ... }
    public function sendEmail() { ... }
    public function generateReport() { ... }
    public function processPayment() { ... }
}

// ХОРОШО - Active Record только для персистентности
class User {
    public function save() { ... }
    public function delete() { ... }
}

// Остальное в сервисах
class UserService {
    public function sendWelcomeEmail(User $user) { ... }
}
```

### ❌ Ошибка 3: Query Builder без подготовленных запросов
```php
// ОПАСНО - SQL инъекция!
$users = $qb->table('users')
    ->where("name = '$_GET[name]'") // ❌❌❌
    ->get();

// БЕЗОПАСНО
$users = $qb->table('users')
    ->where('name', '=', $_GET['name']) // ✅
    ->get();
```

### ❌ Ошибка 4: Забывать про reset в Query Builder
```php
// ПЛОХО - второй запрос унаследует условия первого
$admins = $qb->table('users')->where('role', '=', 'admin')->get();
$users = $qb->table('users')->get(); // ❌ Всё ещё фильтрует по role!

// ХОРОШО - создавать новый экземпляр или сбрасывать
$qb = new QueryBuilder($pdo);
$users = $qb->table('users')->get(); // ✅
```

---

## Контрольные вопросы

1. **В чём главная разница между Repository и Active Record?**
   <details>
   <summary>Ответ</summary>
   Repository отделяет логику персистентности от объектов данных, а Active Record совмещает данные и логику работы с БД в одном классе.
   </details>

2. **Когда Query Builder лучше, чем написание чистого SQL?**
   <details>
   <summary>Ответ</summary>
   Когда запросы динамические (условия добавляются по ситуации), нужна читаемость и безопасность, или когда можно переключаться между разными БД.
   </details>

3. **Можно ли использовать Repository и Query Builder вместе?**
   <details>
   <summary>Ответ</summary>
   Да! Repository может использовать Query Builder внутри для построения запросов, скрывая детали от остального кода.
   </details>

4. **Как паттерны помогают с тестированием?**
   <details>
   <summary>Ответ</summary>
   Repository можно легко заменить на мок-объект в тестах. Active Record сложнее тестировать. Query Builder можно тестировать на правильность построения SQL.
   </details>

5. **Что делать, если нужен сложный запрос с JOIN и подзапросами?**
   <details>
   <summary>Ответ</summary>
   Можно расширить Query Builder, добавить специальный метод в Repository, или в крайнем случае написать чистый SQL в отдельном методе Repository.
   </details>

---

## Что дальше?

Теперь ты знаешь три основных паттерна работы с БД. В **Laravel** используется комбинация всех подходов:
- **Eloquent** — это Advanced Active Record + Query Builder
- **Database Query Builder** — можно использовать отдельно
- Можно создавать свои **Repository** поверх Eloquent

**В следующей главе (4.1)** мы начнём изучать **ООП в PHP** — классы, объекты, наследование. Это фундамент, который позволит тебе понять, как работают все эти паттерны изнутри и как Laravel строит свои абстракции.

Отличная работа! 🚀