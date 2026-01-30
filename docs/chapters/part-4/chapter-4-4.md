# Глава 4.4: Магические методы — __construct, __get, __set, __call, __toString и другие

## Введение

Магические методы в PHP — это специальные методы классов, которые автоматически вызываются в определённых ситуациях. Они всегда начинаются с двух подчёркиваний `__` и позволяют перехватывать различные операции с объектами, делая код более гибким и элегантным.

Представьте, что вы пытаетесь получить доступ к несуществующему свойству объекта или вызвать метод, которого нет. Обычно PHP выдаст ошибку. Но магические методы позволяют перехватить эти ситуации и обработать их по-своему.

**Зачем они нужны:**
- Создание динамических свойств
- Ленивая загрузка данных
- Упрощение работы с объектами
- Реализация паттернов проектирования
- Создание более читаемого кода

---

## 1. __construct() и __destruct() — Рождение и смерть объекта

### __construct() — Конструктор

Вызывается автоматически при создании нового объекта через `new`.

```php
<?php

class User
{
    private string $name;
    private string $email;
    private DateTime $createdAt;

    public function __construct(string $name, string $email)
    {
        $this->name = $name;
        $this->email = $email;
        $this->createdAt = new DateTime();
        
        echo "Пользователь {$name} создан\n";
    }

    public function getInfo(): string
    {
        return "{$this->name} ({$this->email}) - создан {$this->createdAt->format('d.m.Y H:i')}";
    }
}

$user = new User('Иван', 'ivan@example.com');
// Выведет: Пользователь Иван создан

echo $user->getInfo();
```

**Продвинутый пример: Dependency Injection через конструктор**

```php
<?php

class DatabaseConnection
{
    private PDO $pdo;

    public function __construct(string $dsn, string $username, string $password)
    {
        $this->pdo = new PDO($dsn, $username, $password);
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    public function getConnection(): PDO
    {
        return $this->pdo;
    }
}

class UserRepository
{
    private PDO $db;

    public function __construct(DatabaseConnection $connection)
    {
        // Получаем зависимость через конструктор
        $this->db = $connection->getConnection();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }
}

// Использование
$connection = new DatabaseConnection('mysql:host=localhost;dbname=test', 'root', '');
$userRepo = new UserRepository($connection);
```

### __destruct() — Деструктор

Вызывается автоматически, когда объект уничтожается (выходит из области видимости, скрипт завершается или объект явно уничтожается через `unset()`).

```php
<?php

class FileLogger
{
    private $fileHandle;
    private string $filename;

    public function __construct(string $filename)
    {
        $this->filename = $filename;
        $this->fileHandle = fopen($filename, 'a');
        echo "Лог-файл {$filename} открыт\n";
    }

    public function log(string $message): void
    {
        $timestamp = date('Y-m-d H:i:s');
        fwrite($this->fileHandle, "[{$timestamp}] {$message}\n");
    }

    public function __destruct()
    {
        if (is_resource($this->fileHandle)) {
            fclose($this->fileHandle);
            echo "Лог-файл {$this->filename} закрыт\n";
        }
    }
}

function testLogging()
{
    $logger = new FileLogger('app.log');
    $logger->log('Тестовое сообщение');
    // Когда функция завершится, __destruct() закроет файл автоматически
}

testLogging();
// Выведет: Лог-файл app.log открыт
//          Лог-файл app.log закрыт
```

**⚠️ Важно:** Деструкторы не гарантируют порядок уничтожения объектов и могут вызываться в непредсказуемое время. Не полагайтесь на них для критичной логики.

---

## 2. __get() и __set() — Динамические свойства

### __get() — Чтение несуществующих свойств

Вызывается при попытке прочитать несуществующее или недоступное свойство.

```php
<?php

class LazyUser
{
    private array $data = [];
    private ?array $profile = null; // Данные загружаются лениво

    public function __construct(private int $id)
    {
        $this->data = ['id' => $id, 'name' => 'Гость'];
    }

    public function __get(string $property)
    {
        // Если обращаются к свойствам профиля, загружаем их
        if ($property === 'profile' && $this->profile === null) {
            echo "Загрузка профиля из БД...\n";
            // Имитация запроса к БД
            $this->profile = [
                'bio' => 'Это мой профиль',
                'avatar' => 'avatar.jpg'
            ];
        }

        if ($property === 'profile') {
            return $this->profile;
        }

        // Возвращаем значение из data, если есть
        return $this->data[$property] ?? null;
    }
}

$user = new LazyUser(1);
echo $user->name . "\n"; // Гость (без загрузки профиля)
echo $user->profile['bio'] . "\n"; // Загрузка профиля из БД... Это мой профиль
```

### __set() — Запись в несуществующие свойства

Вызывается при попытке записать значение в несуществующее или недоступное свойство.

```php
<?php

class ValidationModel
{
    private array $attributes = [];
    private array $rules = [
        'email' => 'email',
        'age' => 'integer'
    ];

    public function __set(string $property, $value): void
    {
        // Валидация перед установкой значения
        if (isset($this->rules[$property])) {
            if ($this->rules[$property] === 'email' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                throw new InvalidArgumentException("Некорректный email: {$value}");
            }
            
            if ($this->rules[$property] === 'integer' && !is_int($value)) {
                throw new InvalidArgumentException("Значение {$property} должно быть целым числом");
            }
        }

        $this->attributes[$property] = $value;
        echo "Свойство {$property} установлено в значение {$value}\n";
    }

    public function __get(string $property)
    {
        return $this->attributes[$property] ?? null;
    }
}

$model = new ValidationModel();
$model->email = 'test@example.com'; // ОК
$model->age = 25; // ОК

try {
    $model->email = 'invalid-email'; // Выбросит исключение
} catch (InvalidArgumentException $e) {
    echo "Ошибка: {$e->getMessage()}\n";
}
```

**Практический пример: Active Record Pattern**

```php
<?php

class ActiveRecord
{
    protected array $attributes = [];
    protected array $dirty = []; // Изменённые поля
    protected string $table;

    public function __set(string $property, $value): void
    {
        if (!isset($this->attributes[$property]) || $this->attributes[$property] !== $value) {
            $this->dirty[$property] = true;
        }
        $this->attributes[$property] = $value;
    }

    public function __get(string $property)
    {
        return $this->attributes[$property] ?? null;
    }

    public function save(PDO $db): void
    {
        if (empty($this->dirty)) {
            echo "Нет изменений для сохранения\n";
            return;
        }

        $fields = array_keys($this->dirty);
        $placeholders = array_fill(0, count($fields), '?');
        $values = array_map(fn($f) => $this->attributes[$f], $fields);

        if (isset($this->attributes['id'])) {
            // UPDATE
            $setParts = array_map(fn($f) => "{$f} = ?", $fields);
            $sql = "UPDATE {$this->table} SET " . implode(', ', $setParts) . " WHERE id = ?";
            $values[] = $this->attributes['id'];
        } else {
            // INSERT
            $sql = "INSERT INTO {$this->table} (" . implode(', ', $fields) . ") 
                    VALUES (" . implode(', ', $placeholders) . ")";
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($values);
        
        $this->dirty = [];
        echo "Запись сохранена\n";
    }
}

class Product extends ActiveRecord
{
    protected string $table = 'products';
}

// Использование
// $db = new PDO(...);
// $product = new Product();
// $product->name = 'Ноутбук';
// $product->price = 50000;
// $product->save($db);
```

---

## 3. __isset() и __unset() — Проверка и удаление

### __isset() — Проверка существования свойства

Вызывается при использовании `isset()` или `empty()` на несуществующем свойстве.

```php
<?php

class SmartObject
{
    private array $data = ['name' => 'Иван', 'age' => 30];

    public function __isset(string $property): bool
    {
        echo "Проверка существования {$property}\n";
        return isset($this->data[$property]);
    }

    public function __get(string $property)
    {
        return $this->data[$property] ?? null;
    }
}

$obj = new SmartObject();

if (isset($obj->name)) {
    echo "Свойство name существует\n";
}

if (empty($obj->email)) {
    echo "Email не задан\n";
}
```

### __unset() — Удаление свойства

Вызывается при использовании `unset()` на несуществующем свойстве.

```php
<?php

class DataContainer
{
    private array $data = ['key1' => 'value1', 'key2' => 'value2'];

    public function __unset(string $property): void
    {
        echo "Удаление свойства {$property}\n";
        unset($this->data[$property]);
    }

    public function __isset(string $property): bool
    {
        return isset($this->data[$property]);
    }

    public function __get(string $property)
    {
        return $this->data[$property] ?? null;
    }
}

$container = new DataContainer();
unset($container->key1); // Удаление свойства key1
var_dump(isset($container->key1)); // bool(false)
```

---

## 4. __call() и __callStatic() — Динамические методы

### __call() — Вызов несуществующих методов

Вызывается при попытке вызвать несуществующий или недоступный метод объекта.

```php
<?php

class QueryBuilder
{
    private array $conditions = [];
    private string $table = '';

    public function table(string $table): self
    {
        $this->table = $table;
        return $this;
    }

    // Магический метод для создания where-условий
    public function __call(string $method, array $arguments): self
    {
        // whereEmail($value) -> where('email', '=', $value)
        // whereAgeLessThan($value) -> where('age', '<', $value)
        
        if (str_starts_with($method, 'where')) {
            $field = substr($method, 5); // Убираем "where"
            
            // Обработка операторов типа LessThan, GreaterThan
            $operator = '=';
            if (str_contains($field, 'LessThan')) {
                $field = str_replace('LessThan', '', $field);
                $operator = '<';
            } elseif (str_contains($field, 'GreaterThan')) {
                $field = str_replace('GreaterThan', '', $field);
                $operator = '>';
            }
            
            // Преобразуем CamelCase в snake_case
            $field = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $field));
            
            $this->conditions[] = [
                'field' => $field,
                'operator' => $operator,
                'value' => $arguments[0]
            ];
            
            return $this;
        }

        throw new BadMethodCallException("Метод {$method} не найден");
    }

    public function toSql(): string
    {
        $sql = "SELECT * FROM {$this->table}";
        
        if (!empty($this->conditions)) {
            $where = [];
            foreach ($this->conditions as $condition) {
                $where[] = "{$condition['field']} {$condition['operator']} '{$condition['value']}'";
            }
            $sql .= " WHERE " . implode(' AND ', $where);
        }
        
        return $sql;
    }
}

// Использование
$query = new QueryBuilder();
$sql = $query->table('users')
    ->whereEmail('test@example.com')
    ->whereAgeLessThan(30)
    ->toSql();

echo $sql . "\n";
// SELECT * FROM users WHERE email = 'test@example.com' AND age < '30'
```

### __callStatic() — Вызов несуществующих статических методов

Вызывается при попытке вызвать несуществующий статический метод класса.

```php
<?php

class Route
{
    private static array $routes = [];

    public static function __callStatic(string $method, array $arguments): void
    {
        // Route::get('/users', callback) -> метод GET
        // Route::post('/users', callback) -> метод POST
        
        $httpMethod = strtoupper($method);
        $allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        
        if (!in_array($httpMethod, $allowedMethods)) {
            throw new BadMethodCallException("HTTP метод {$httpMethod} не поддерживается");
        }
        
        [$uri, $callback] = $arguments;
        
        self::$routes[] = [
            'method' => $httpMethod,
            'uri' => $uri,
            'callback' => $callback
        ];
        
        echo "Зарегистрирован маршрут: {$httpMethod} {$uri}\n";
    }

    public static function getRoutes(): array
    {
        return self::$routes;
    }
}

// Использование
Route::get('/users', fn() => 'Список пользователей');
Route::post('/users', fn() => 'Создание пользователя');
Route::put('/users/{id}', fn($id) => "Обновление пользователя {$id}");

print_r(Route::getRoutes());
```

---

## 5. __toString() — Строковое представление объекта

Вызывается, когда объект используется в строковом контексте (например, `echo $obj`).

```php
<?php

class Money
{
    public function __construct(
        private float $amount,
        private string $currency = 'RUB'
    ) {}

    public function __toString(): string
    {
        $symbols = [
            'RUB' => '₽',
            'USD' => '$',
            'EUR' => '€'
        ];
        
        $symbol = $symbols[$this->currency] ?? $this->currency;
        return number_format($this->amount, 2, '.', ' ') . ' ' . $symbol;
    }

    public function add(Money $money): self
    {
        if ($this->currency !== $money->currency) {
            throw new InvalidArgumentException('Нельзя складывать разные валюты');
        }
        
        return new self($this->amount + $money->amount, $this->currency);
    }
}

$price = new Money(1500.50, 'RUB');
$tax = new Money(150.05, 'RUB');
$total = $price->add($tax);

echo "Цена: {$price}\n";  // Цена: 1 500.50 ₽
echo "Налог: {$tax}\n";    // Налог: 150.05 ₽
echo "Итого: {$total}\n";  // Итого: 1 650.55 ₽
```

**Практический пример: HTML Builder**

```php
<?php

class HtmlElement
{
    private array $attributes = [];
    private array $children = [];

    public function __construct(
        private string $tag,
        private ?string $content = null
    ) {}

    public function attr(string $name, string $value): self
    {
        $this->attributes[$name] = $value;
        return $this;
    }

    public function addChild(HtmlElement $child): self
    {
        $this->children[] = $child;
        return $this;
    }

    public function __toString(): string
    {
        $attrs = '';
        foreach ($this->attributes as $name => $value) {
            $attrs .= " {$name}=\"" . htmlspecialchars($value) . "\"";
        }

        $html = "<{$this->tag}{$attrs}>";
        
        if ($this->content !== null) {
            $html .= htmlspecialchars($this->content);
        }
        
        foreach ($this->children as $child) {
            $html .= $child; // Автоматически вызовет __toString() дочернего элемента
        }
        
        $html .= "</{$this->tag}>";
        
        return $html;
    }
}

// Использование
$div = new HtmlElement('div');
$div->attr('class', 'container')
    ->attr('id', 'main')
    ->addChild(
        (new HtmlElement('h1', 'Заголовок'))
            ->attr('class', 'title')
    )
    ->addChild(
        (new HtmlElement('p', 'Текст параграфа'))
            ->attr('class', 'text')
    );

echo $div;
// <div class="container" id="main"><h1 class="title">Заголовок</h1><p class="text">Текст параграфа</p></div>
```

---

## 6. __invoke() — Объект как функция

Вызывается, когда объект используется как функция.

```php
<?php

class Multiplier
{
    public function __construct(private int $factor) {}

    public function __invoke(int $number): int
    {
        return $number * $this->factor;
    }
}

$double = new Multiplier(2);
$triple = new Multiplier(3);

echo $double(5) . "\n";  // 10
echo $triple(5) . "\n";  // 15

// Можно использовать в array_map
$numbers = [1, 2, 3, 4, 5];
$doubled = array_map($double, $numbers);
print_r($doubled); // [2, 4, 6, 8, 10]
```

**Практический пример: Middleware**

```php
<?php

class AuthMiddleware
{
    public function __construct(private array $allowedRoles) {}

    public function __invoke(array $user, callable $next)
    {
        if (!in_array($user['role'], $this->allowedRoles)) {
            throw new Exception('Доступ запрещён');
        }

        echo "Пользователь {$user['name']} авторизован\n";
        
        // Передаём управление следующему обработчику
        return $next($user);
    }
}

class LogMiddleware
{
    public function __invoke(array $user, callable $next)
    {
        echo "Логирование действия пользователя {$user['name']}\n";
        return $next($user);
    }
}

// Использование
function handleRequest(array $user, array $middlewares)
{
    $pipeline = array_reduce(
        array_reverse($middlewares),
        fn($next, $middleware) => fn($user) => $middleware($user, $next),
        fn($user) => "Запрос обработан для {$user['name']}"
    );

    return $pipeline($user);
}

$user = ['name' => 'Иван', 'role' => 'admin'];
$middlewares = [
    new LogMiddleware(),
    new AuthMiddleware(['admin', 'moderator'])
];

echo handleRequest($user, $middlewares) . "\n";
```

---

## 7. __clone() — Клонирование объектов

Вызывается после клонирования объекта через `clone`.

```php
<?php

class Address
{
    public function __construct(
        public string $city,
        public string $street
    ) {}
}

class Person
{
    public function __construct(
        public string $name,
        public Address $address
    ) {}

    public function __clone()
    {
        // Глубокое клонирование вложенных объектов
        $this->address = clone $this->address;
        
        echo "Объект Person клонирован\n";
    }
}

$person1 = new Person('Иван', new Address('Москва', 'Ленина'));
$person2 = clone $person1;

$person2->name = 'Пётр';
$person2->address->city = 'Санкт-Петербург';

echo "{$person1->name} живёт в {$person1->address->city}\n"; // Иван живёт в Москва
echo "{$person2->name} живёт в {$person2->address->city}\n"; // Пётр живёт в Санкт-Петербург
```

**Без __clone() было бы:**

```php
<?php
// Без __clone() объект Address будет общим!
class PersonBad
{
    public function __construct(
        public string $name,
        public Address $address
    ) {}
}

$person1 = new PersonBad('Иван', new Address('Москва', 'Ленина'));
$person2 = clone $person1;

$person2->address->city = 'Санкт-Петербург';

echo $person1->address->city . "\n"; // Санкт-Петербург (!)
// Изменение в person2 повлияло на person1
```

---

## 8. __sleep() и __wakeup() — Сериализация

### __sleep() — Подготовка к сериализации

Вызывается перед `serialize()`. Должен вернуть массив имён свойств для сериализации.

```php
<?php

class DatabaseConnection
{
    private PDO $pdo;
    private string $dsn;
    private string $username;
    private string $password;

    public function __construct(string $dsn, string $username, string $password)
    {
        $this->dsn = $dsn;
        $this->username = $username;
        $this->password = $password;
        $this->connect();
    }

    private function connect(): void
    {
        $this->pdo = new PDO($this->dsn, $this->username, $this->password);
        echo "Подключение к БД установлено\n";
    }

    public function __sleep(): array
    {
        echo "Подготовка к сериализации\n";
        // Не сериализуем PDO объект, только данные для подключения
        return ['dsn', 'username', 'password'];
    }

    public function __wakeup(): void
    {
        echo "Восстановление после десериализации\n";
        // Восстанавливаем подключение
        $this->connect();
    }

    public function query(string $sql): array
    {
        return $this->pdo->query($sql)->fetchAll();
    }
}

// Использование
// $conn = new DatabaseConnection('mysql:host=localhost;dbname=test', 'root', '');
// $serialized = serialize($conn);
// $restored = unserialize($serialized);
```

---

## 9. __debugInfo() — Отладочная информация

Вызывается при использовании `var_dump()` для контроля выводимой информации.

```php
<?php

class User
{
    public function __construct(
        private string $name,
        private string $email,
        private string $passwordHash
    ) {}

    public function __debugInfo(): array
    {
        return [
            'name' => $this->name,
            'email' => $this->email,
            'password' => '***HIDDEN***' // Скрываем пароль
        ];
    }
}

$user = new User('Иван', 'ivan@example.com', password_hash('secret', PASSWORD_DEFAULT));
var_dump($user);

/*
object(User)#1 (3) {
  ["name"]=>
  string(8) "Иван"
  ["email"]=>
  string(16) "ivan@example.com"
  ["password"]=>
  string(12) "***HIDDEN***"
}
*/
```

---

## 10. __serialize() и __unserialize() — Современная сериализация (PHP 7.4+)

Более гибкая альтернатива `__sleep()` и `__wakeup()`.

```php
<?php

class CachedData
{
    private array $data;
    private DateTime $cachedAt;

    public function __construct(array $data)
    {
        $this->data = $data;
        $this->cachedAt = new DateTime();
    }

    public function __serialize(): array
    {
        return [
            'data' => $this->data,
            'cachedAt' => $this->cachedAt->getTimestamp()
        ];
    }

    public function __unserialize(array $data): void
    {
        $this->data = $data['data'];
        $this->cachedAt = new DateTime('@' . $data['cachedAt']);
    }

    public function getCachedAt(): string
    {
        return $this->cachedAt->format('Y-m-d H:i:s');
    }
}

$cached = new CachedData(['key' => 'value']);
sleep(2);
$serialized = serialize($cached);
$restored = unserialize($serialized);

echo "Кэш создан: " . $restored->getCachedAt() . "\n";
```

---

## Практические примеры

### Пример 1: Fluent Interface с магическими методами

```php
<?php

class FluentConfig
{
    private array $config = [];

    public function __call(string $method, array $arguments): self
    {
        // setDatabaseHost('localhost') -> config['database']['host'] = 'localhost'
        // setCacheTtl(3600) -> config['cache']['ttl'] = 3600
        
        if (str_starts_with($method, 'set')) {
            $key = substr($method, 3);
            
            // Разбиваем CamelCase на части
            preg_match_all('/(^[a-z]+)|([A-Z][a-z]+)/', $key, $matches);
            $parts = array_map('strtolower', $matches[0]);
            
            if (count($parts) >= 2) {
                $section = $parts[0];
                $property = $parts[1];
                $this->config[$section][$property] = $arguments[0];
            } else {
                $this->config[$parts[0]] = $arguments[0];
            }
            
            return $this;
        }

        throw new BadMethodCallException("Метод {$method} не найден");
    }

    public function __get(string $property): mixed
    {
        return $this->config[$property] ?? null;
    }

    public function toArray(): array
    {
        return $this->config;
    }
}

// Использование
$config = new FluentConfig();
$config->setDatabaseHost('localhost')
    ->setDatabasePort(3306)
    ->setDatabaseName('myapp')
    ->setCacheTtl(3600)
    ->setAppDebug(true);

print_r($config->toArray());
/*
Array (
    [database] => Array (
        [host] => localhost
        [port] => 3306
        [name] => myapp
    )
    [cache] => Array (
        [ttl] => 3600
    )
    [app] => Array (
        [debug] => 1
    )
)
*/
```

### Пример 2: Умная модель с валидацией

```php
<?php

abstract class Model
{
    protected array $attributes = [];
    protected array $rules = [];
    protected array $errors = [];

    public function __set(string $property, $value): void
    {
        // Автоматическая валидация при установке
        if (isset($this->rules[$property])) {
            $this->validate($property, $value);
        }

        if (empty($this->errors)) {
            $this->attributes[$property] = $value;
        }
    }

    public function __get(string $property)
    {
        return $this->attributes[$property] ?? null;
    }

    public function __isset(string $property): bool
    {
        return isset($this->attributes[$property]);
    }

    private function validate(string $field, $value): void
    {
        $rules = explode('|', $this->rules[$field]);

        foreach ($rules as $rule) {
            if ($rule === 'required' && empty($value)) {
                $this->errors[$field][] = "Поле {$field} обязательно";
            }

            if (str_starts_with($rule, 'min:')) {
                $min = (int)substr($rule, 4);
                if (strlen($value) < $min) {
                    $this->errors[$field][] = "Поле {$field} должно быть минимум {$min} символов";
                }
            }

            if ($rule === 'email' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                $this->errors[$field][] = "Поле {$field} должно быть корректным email";
            }
        }
    }

    public function isValid(): bool
    {
        return empty($this->errors);
    }

    public function getErrors(): array
    {
        return $this->errors;
    }

    public function __toString(): string
    {
        return json_encode($this->attributes, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
}

class UserModel extends Model
{
    protected array $rules = [
        'name' => 'required|min:3',
        'email' => 'required|email',
        'password' => 'required|min:8'
    ];
}

// Использование
$user = new UserModel();
$user->name = 'Иван';
$user->email = 'invalid-email';
$user->password = '123';

if (!$user->isValid()) {
    print_r($user->getErrors());
}

$user->email = 'ivan@example.com';
$user->password = 'securepass123';

if ($user->isValid()) {
    echo "Модель валидна:\n";
    echo $user; // JSON через __toString()
}
```

### Пример 3: Dependency Injection Container

```php
<?php

class Container
{
    private array $bindings = [];
    private array $instances = [];

    public function bind(string $abstract, callable $concrete): void
    {
        $this->bindings[$abstract] = $concrete;
    }

    public function singleton(string $abstract, callable $concrete): void
    {
        $this->bindings[$abstract] = $concrete;
        $this->instances[$abstract] = null;
    }

    public function __get(string $abstract)
    {
        return $this->resolve($abstract);
    }

    private function resolve(string $abstract)
    {
        // Если это singleton и уже создан
        if (array_key_exists($abstract, $this->instances)) {
            if ($this->instances[$abstract] !== null) {
                return $this->instances[$abstract];
            }

            $instance = $this->bindings[$abstract]($this);
            $this->instances[$abstract] = $instance;
            return $instance;
        }

        // Обычная зависимость
        if (isset($this->bindings[$abstract])) {
            return $this->bindings[$abstract]($this);
        }

        throw new Exception("Зависимость {$abstract} не зарегистрирована");
    }
}

// Использование
$container = new Container();

$container->singleton('db', function() {
    return new PDO('mysql:host=localhost;dbname=test', 'root', '');
});

$container->bind('userRepo', function($c) {
    return new UserRepository($c->db);
});

// Получаем зависимости через магическое свойство
// $userRepo = $container->userRepo;
// $db1 = $container->db;
// $db2 = $container->db;
// var_dump($db1 === $db2); // true (singleton)
```

---

## Когда использовать магические методы

### ✅ Хорошие применения:

1. **ORM/Active Record** — `__get`, `__set` для динамических атрибутов
2. **Fluent interfaces** — `__call` для методов-цепочек
3. **Ленивая загрузка** — `__get` для отложенной инициализации
4. **Строковое представление** — `__toString` для логирования
5. **Клонирование** — `__clone` для глубокого копирования
6. **Контейнеры зависимостей** — `__get` для разрешения зависимостей

### ❌ Плохие применения:

1. **Замена обычных методов** — если метод можно определить явно, делайте это
2. **Сложная бизнес-логика** — магические методы должны быть простыми
3. **Производительность** — магические методы медленнее обычных
4. **Отладка** — усложняют понимание кода

---

## Распространённые ошибки

### Ошибка 1: __toString() выбрасывает исключения

```php
<?php
// ❌ НЕПРАВИЛЬНО
class BadUser
{
    public function __toString(): string
    {
        if (empty($this->name)) {
            throw new Exception('Имя не задано'); // ОШИБКА!
        }
        return $this->name;
    }
}

// ✅ ПРАВИЛЬНО
class GoodUser
{
    public function __toString(): string
    {
        return $this->name ?? 'Гость';
    }
}
```

**Проблема:** В PHP < 7.4 исключения в `__toString()` вызывают фатальную ошибку.

### Ошибка 2: Забыть вернуть массив из __sleep()

```php
<?php
// ❌ НЕПРАВИЛЬНО
class BadClass
{
    public function __sleep()
    {
        // Забыли вернуть массив!
    }
}

// ✅ ПРАВИЛЬНО
class GoodClass
{
    public function __sleep(): array
    {
        return ['property1', 'property2'];
    }
}
```

### Ошибка 3: Не клонировать вложенные объекты

```php
<?php
// ❌ НЕПРАВИЛЬНО - поверхностное клонирование
class Cart
{
    public function __construct(public array $items) {}
}

// ✅ ПРАВИЛЬНО - глубокое клонирование
class Cart
{
    public function __construct(public array $items) {}

    public function __clone()
    {
        $this->items = array_map(fn($item) => clone $item, $this->items);
    }
}
```

---

## Упражнения

### Упражнение 1: Конфигурационный класс

Создайте класс `Config`, который:
- Загружает данные из массива через конструктор
- Позволяет читать значения через точечную нотацию: `$config->get('database.host')`
- Устанавливать значения через `__set`: `$config->database_host = 'localhost'`
- Проверять существование через `isset($config->database_host)`

```php
<?php
$config = new Config([
    'database' => [
        'host' => 'localhost',
        'port' => 3306
    ]
]);

echo $config->get('database.host'); // localhost
$config->database_name = 'myapp';
var_dump(isset($config->database_name)); // true
```

### Упражнение 2: Умный калькулятор

Создайте класс `Calculator`, который:
- Поддерживает вызов `$calc->add(5)`, `$calc->subtract(3)`, `$calc->multiply(2)`
- Использует `__call` для обработки методов
- Возвращает результат через `__toString()`
- Можно использовать как функцию через `__invoke()` для сброса

```php
<?php
$calc = new Calculator(10);
$calc->add(5)->multiply(2)->subtract(10);
echo $calc; // 20

$calc(0); // Сброс до 0
```

### Упражнение 3: Smart Array

Создайте класс `SmartArray`, который:
- Ведёт себя как массив через `__get`, `__set`, `__isset`, `__unset`
- Логирует все операции в внутренний массив `$log`
- Имеет метод `getLog()` для просмотра истории
- Поддерживает `__toString()` для JSON-представления

```php
<?php
$arr = new SmartArray();
$arr->name = 'Иван';
$arr->age = 30;
unset($arr->age);

print_r($arr->getLog());
// ['set name', 'set age', 'unset age']

echo $arr; // {"name":"Иван"}
```

---

## Самопроверка

1. **Что выведет этот код?**

```php
<?php
class Test
{
    private $data = ['key' => 'value'];

    public function __get($name)
    {
        return $this->data[$name] ?? 'default';
    }
}

$obj = new Test();
echo $obj->key . "\n";
echo $obj->missing . "\n";
```

2. **Исправьте ошибку:**

```php
<?php
class Logger
{
    private $file;

    public function __construct($filename)
    {
        $this->file = fopen($filename, 'a');
    }

    public function log($message)
    {
        fwrite($this->file, $message . "\n");
    }
}
// Файл никогда не закрывается!
```

3. **Что не так с этим кодом?**

```php
<?php
class User
{
    public function __toString()
    {
        if (!$this->isValid()) {
            throw new Exception('Invalid user');
        }
        return $this->name;
    }
}
```

---

## Следующие шаги

Теперь вы понимаете, как работают магические методы в PHP. В следующей главе **"Namespaces и автозагрузка"** вы узнаете, как организовать код в пространства имён, использовать Composer для автозагрузки классов и следовать стандарту PSR-4.

Магические методы — мощный инструмент, но помните: с большой силой приходит большая ответственность. Используйте их разумно! 🪄