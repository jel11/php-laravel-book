# Глава 4.1: Классы и объекты — создание, свойства, методы, $this, конструктор, инкапсуляция

## 🎯 Что ты узнаешь

- Что такое ООП и зачем оно нужно
- Как создавать классы и объекты
- Что такое свойства и методы
- Как работает `$this`
- Зачем нужен конструктор
- Три уровня инкапсуляции: public, private, protected

---

## 🤔 Зачем вообще ООП?

До этого ты писал **процедурный код**: функции, переменные, условия. Это работает, но когда приложение растёт, код становится сложным:

```php
// Процедурный стиль - всё разрозненно
$user_name = "John";
$user_email = "john@example.com";
$user_balance = 1000;

function getUserInfo($name, $email, $balance) {
    return "$name ($email) - Balance: $$balance";
}

function addMoney($balance, $amount) {
    return $balance + $amount;
}

// Легко запутаться, что с чем связано
```

**ООП (объектно-ориентированное программирование)** позволяет **группировать данные и функции**, которые работают с этими данными, в одну сущность — **класс**.

```php
// ООП - данные и поведение вместе
class User {
    public $name;
    public $email;
    public $balance;
    
    public function getInfo() {
        return "$this->name ($this->email) - Balance: $$this->balance";
    }
    
    public function addMoney($amount) {
        $this->balance += $amount;
    }
}
```

**Преимущества:**
- Код организован логически
- Данные защищены от случайного изменения
- Легко создавать несколько пользователей с одинаковым поведением
- Код переиспользуется и тестируется проще

---

## 📦 Класс и объект — в чём разница?

### Класс — это чертёж

**Класс** — это шаблон, описание того, как должен выглядеть объект.

```php
class Car {
    public $brand;
    public $color;
    public $speed = 0;
    
    public function accelerate() {
        $this->speed += 10;
        echo "Скорость: {$this->speed} км/ч\n";
    }
}
```

Сам по себе класс `Car` ничего не делает — это просто **описание** того, что такое машина.

### Объект — это конкретный экземпляр

**Объект** — это конкретная машина, созданная по чертежу класса.

```php
// Создаём объект (экземпляр класса)
$tesla = new Car();
$tesla->brand = "Tesla";
$tesla->color = "red";
$tesla->accelerate(); // Скорость: 10 км/ч

$bmw = new Car();
$bmw->brand = "BMW";
$bmw->color = "black";
$bmw->accelerate(); // Скорость: 10 км/ч

// Два разных объекта одного класса
var_dump($tesla === $bmw); // bool(false)
```

**Аналогия:**
- Класс = чертёж дома
- Объект = реальный дом, построенный по чертежу

---

## 🏗️ Создание класса

### Базовый синтаксис

```php
class ИмяКласса {
    // Свойства (данные)
    public $свойство1;
    public $свойство2;
    
    // Методы (поведение)
    public function метод() {
        // код
    }
}
```

### Правила именования

- Имя класса начинается с **заглавной буквы**
- Используй **PascalCase** (каждое слово с большой буквы)
- Один класс = один файл (хорошая практика)

```php
// ✅ Хорошо
class User { }
class ProductRepository { }
class EmailService { }

// ❌ Плохо
class user { }           // строчная буква
class product_repo { }   // snake_case
```

---

## 🎨 Свойства — данные объекта

**Свойства** (properties) — это переменные внутри класса.

### Объявление свойств

```php
class Product {
    public $name;
    public $price;
    public $inStock = true; // Значение по умолчанию
}

$laptop = new Product();
$laptop->name = "MacBook Pro";
$laptop->price = 2500;

echo $laptop->name;    // MacBook Pro
echo $laptop->inStock; // 1 (true)
```

### Типизация свойств (PHP 7.4+)

```php
class Book {
    public string $title;
    public int $pages;
    public float $price;
    public bool $available = true;
}

$book = new Book();
$book->title = "1984";
$book->pages = 328;
$book->price = 15.99;
```

**⚠️ Ошибка типа:**

```php
$book->pages = "триста"; // TypeError: Cannot assign string to property Book::$pages of type int
```

---

## 🔧 Методы — функции объекта

**Методы** (methods) — это функции внутри класса, которые определяют **поведение** объекта.

### Создание методов

```php
class BankAccount {
    public $balance = 0;
    
    public function deposit($amount) {
        $this->balance += $amount;
        echo "Пополнено на $$amount. Баланс: $$this->balance\n";
    }
    
    public function withdraw($amount) {
        if ($amount > $this->balance) {
            echo "Недостаточно средств!\n";
            return false;
        }
        
        $this->balance -= $amount;
        echo "Снято $$amount. Баланс: $$this->balance\n";
        return true;
    }
    
    public function getBalance() {
        return $this->balance;
    }
}

$account = new BankAccount();
$account->deposit(1000);  // Пополнено на $1000. Баланс: $1000
$account->withdraw(300);  // Снято $300. Баланс: $700
$account->withdraw(1000); // Недостаточно средств!
```

### Типизация методов

```php
class Calculator {
    // Указываем типы параметров и возвращаемого значения
    public function add(int $a, int $b): int {
        return $a + $b;
    }
    
    public function divide(float $a, float $b): float {
        if ($b === 0.0) {
            throw new Exception("Деление на ноль!");
        }
        return $a / $b;
    }
}

$calc = new Calculator();
echo $calc->add(5, 3);        // 8
echo $calc->divide(10, 2.5);  // 4.0
```

---

## 🎯 $this — ссылка на текущий объект

`$this` — это **специальная переменная**, которая указывает на **текущий объект** внутри методов класса.

### Как это работает?

```php
class Person {
    public $name;
    
    public function introduce() {
        // $this указывает на объект, который вызвал метод
        echo "Привет, я {$this->name}!\n";
    }
    
    public function setName($name) {
        // $this->name - свойство объекта
        // $name - параметр метода
        $this->name = $name;
    }
}

$person1 = new Person();
$person1->name = "Алиса";
$person1->introduce(); // Привет, я Алиса!

$person2 = new Person();
$person2->name = "Боб";
$person2->introduce(); // Привет, я Боб!

// $this внутри каждого объекта указывает на СВОИ данные
```

### $this для вызова других методов

```php
class Logger {
    private $logs = [];
    
    public function log($message) {
        $this->logs[] = [
            'message' => $message,
            'time' => $this->getCurrentTime() // Вызов другого метода
        ];
    }
    
    private function getCurrentTime() {
        return date('Y-m-d H:i:s');
    }
    
    public function getLogs() {
        return $this->logs;
    }
}

$logger = new Logger();
$logger->log("Пользователь вошёл");
$logger->log("Данные сохранены");
print_r($logger->getLogs());
```

**Важно:**
- `$this` доступен **только внутри методов**
- `$this` **не нужен** в статических методах (об этом позже)
- Используй `$this->` для доступа к свойствам и методам объекта

---

## 🏗️ Конструктор — инициализация объекта

**Конструктор** (`__construct`) — это специальный метод, который **автоматически вызывается** при создании объекта.

### Зачем нужен конструктор?

Без конструктора приходится вручную устанавливать все значения:

```php
class User {
    public $name;
    public $email;
}

$user = new User();
$user->name = "John";   // Приходится делать вручную
$user->email = "john@example.com";
```

С конструктором это происходит автоматически:

```php
class User {
    public $name;
    public $email;
    
    // Конструктор вызывается при new User(...)
    public function __construct($name, $email) {
        $this->name = $name;
        $this->email = $email;
        echo "Пользователь $name создан!\n";
    }
}

$user = new User("John", "john@example.com");
// Пользователь John создан!
echo $user->name; // John
```

### Конструктор с валидацией

```php
class Product {
    public $name;
    public $price;
    
    public function __construct($name, $price) {
        if ($price < 0) {
            throw new Exception("Цена не может быть отрицательной!");
        }
        
        $this->name = $name;
        $this->price = $price;
    }
}

$laptop = new Product("Laptop", 1500); // OK
$phone = new Product("Phone", -100);   // Exception!
```

### Конструктор с PDO-подключением

Частый паттерн — создание подключения к БД в конструкторе:

```php
class Database {
    private $pdo;
    
    public function __construct($host, $dbname, $user, $password) {
        $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
        
        $this->pdo = new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        
        echo "Подключение к БД установлено\n";
    }
    
    public function query($sql) {
        return $this->pdo->query($sql);
    }
}

$db = new Database('localhost', 'myapp', 'root', '');
// Подключение к БД установлено
```

### Property Promotion (PHP 8.0+)

В PHP 8+ можно объявлять свойства прямо в конструкторе:

```php
// PHP 7.4
class User {
    public $name;
    public $email;
    
    public function __construct($name, $email) {
        $this->name = $name;
        $this->email = $email;
    }
}

// PHP 8.0+ - короче и удобнее!
class User {
    public function __construct(
        public string $name,
        public string $email
    ) {
        // Свойства создаются и инициализируются автоматически
    }
}

$user = new User("Alice", "alice@example.com");
echo $user->name; // Alice
```

---

## 🔒 Инкапсуляция — контроль доступа

**Инкапсуляция** — это **сокрытие внутренних данных** объекта и предоставление доступа только через методы.

### Три уровня доступа

```php
class Example {
    public $publicProp;      // Доступно везде
    protected $protectedProp; // Доступно только в классе и наследниках
    private $privateProp;     // Доступно только внутри этого класса
}
```

| Модификатор | Внутри класса | В наследниках | Снаружи |
|------------|---------------|---------------|---------|
| `public`   | ✅            | ✅            | ✅      |
| `protected`| ✅            | ✅            | ❌      |
| `private`  | ✅            | ❌            | ❌      |

### Public — открытый доступ

```php
class Counter {
    public $count = 0;
    
    public function increment() {
        $this->count++;
    }
}

$counter = new Counter();
$counter->count = 100; // Можно менять напрямую
$counter->increment();
echo $counter->count; // 101
```

**Проблема:** любой может изменить `count` на что угодно, даже на отрицательное число или строку.

### Private — приватный доступ

```php
class BankAccount {
    private $balance = 0; // Никто не может изменить напрямую!
    
    public function deposit($amount) {
        if ($amount > 0) {
            $this->balance += $amount;
        }
    }
    
    public function withdraw($amount) {
        if ($amount > 0 && $amount <= $this->balance) {
            $this->balance -= $amount;
            return true;
        }
        return false;
    }
    
    public function getBalance() {
        return $this->balance;
    }
}

$account = new BankAccount();
$account->deposit(1000);

// ❌ Ошибка! Нельзя получить доступ к приватному свойству
// echo $account->balance;

// ✅ Правильно - через публичный метод
echo $account->getBalance(); // 1000
```

**Преимущества:**
- Данные защищены от случайного изменения
- Можно добавить валидацию в методы
- Легко изменить внутреннюю реализацию, не ломая код

### Геттеры и сеттеры

**Геттеры** (getters) и **сеттеры** (setters) — методы для чтения и изменения приватных свойств:

```php
class User {
    private $email;
    private $age;
    
    // Геттер - читаем значение
    public function getEmail() {
        return $this->email;
    }
    
    // Сеттер - устанавливаем значение с валидацией
    public function setEmail($email) {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception("Некорректный email!");
        }
        $this->email = $email;
    }
    
    public function getAge() {
        return $this->age;
    }
    
    public function setAge($age) {
        if ($age < 0 || $age > 120) {
            throw new Exception("Некорректный возраст!");
        }
        $this->age = $age;
    }
}

$user = new User();
$user->setEmail("john@example.com"); // ✅ OK
$user->setAge(25);                    // ✅ OK

$user->setEmail("invalid");  // ❌ Exception!
$user->setAge(-5);           // ❌ Exception!

echo $user->getEmail(); // john@example.com
```

### Protected — для наследников

`protected` используется, когда нужно скрыть данные от внешнего мира, но дать доступ классам-наследникам (об этом в следующей главе):

```php
class Animal {
    protected $name;
    
    public function __construct($name) {
        $this->name = $name;
    }
}

class Dog extends Animal {
    public function bark() {
        // Можем использовать $name, т.к. он protected
        echo "$this->name говорит: Гав!\n";
    }
}

$dog = new Dog("Рекс");
$dog->bark(); // Рекс говорит: Гав!

// ❌ Ошибка! protected недоступен снаружи
// echo $dog->name;
```

---

## 🛠️ Практические примеры

### Пример 1: Класс Task (задача)

```php
class Task {
    private $title;
    private $description;
    private $completed = false;
    private $createdAt;
    
    public function __construct($title, $description) {
        $this->title = $title;
        $this->description = $description;
        $this->createdAt = new DateTime();
    }
    
    public function complete() {
        $this->completed = true;
        echo "Задача '{$this->title}' выполнена!\n";
    }
    
    public function isCompleted() {
        return $this->completed;
    }
    
    public function getInfo() {
        $status = $this->completed ? 'выполнена' : 'в процессе';
        return "{$this->title} - {$status}";
    }
}

$task = new Task("Изучить ООП", "Прочитать главу 4.1");
echo $task->getInfo(); // Изучить ООП - в процессе

$task->complete(); // Задача 'Изучить ООП' выполнена!
echo $task->getInfo(); // Изучить ООП - выполнена
```

### Пример 2: Класс ShoppingCart (корзина)

```php
class ShoppingCart {
    private $items = [];
    
    public function addItem($name, $price, $quantity = 1) {
        $this->items[] = [
            'name' => $name,
            'price' => $price,
            'quantity' => $quantity
        ];
        
        echo "Добавлено: $name (x$quantity) - $$price\n";
    }
    
    public function getTotal() {
        $total = 0;
        foreach ($this->items as $item) {
            $total += $item['price'] * $item['quantity'];
        }
        return $total;
    }
    
    public function getItemCount() {
        return count($this->items);
    }
    
    public function clear() {
        $this->items = [];
        echo "Корзина очищена\n";
    }
}

$cart = new ShoppingCart();
$cart->addItem("Ноутбук", 1500, 1);
$cart->addItem("Мышь", 25, 2);

echo "Товаров: " . $cart->getItemCount() . "\n"; // 2
echo "Итого: $" . $cart->getTotal() . "\n";      // $1550

$cart->clear();
```

### Пример 3: Класс Validator

```php
class Validator {
    private $errors = [];
    
    public function validateEmail($email) {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->errors[] = "Некорректный email: $email";
            return false;
        }
        return true;
    }
    
    public function validateLength($string, $min, $max) {
        $length = strlen($string);
        if ($length < $min || $length > $max) {
            $this->errors[] = "Длина должна быть от $min до $max символов";
            return false;
        }
        return true;
    }
    
    public function hasErrors() {
        return !empty($this->errors);
    }
    
    public function getErrors() {
        return $this->errors;
    }
}

$validator = new Validator();
$validator->validateEmail("test@example.com"); // true
$validator->validateEmail("invalid");          // false
$validator->validateLength("abc", 5, 10);      // false

if ($validator->hasErrors()) {
    print_r($validator->getErrors());
}
```

---

## ⚠️ Частые ошибки

### 1. Забыл `$this->`

```php
class Product {
    public $price = 100;
    
    public function getPrice() {
        return price; // ❌ Ошибка! Undefined variable
    }
}

// ✅ Правильно
public function getPrice() {
    return $this->price;
}
```

### 2. Используешь `$this->` для вызова свойства, а не `$this->`

```php
class User {
    public $name = "John";
    
    public function getName() {
        return $this->$name; // ❌ Попытка обратиться к переменной $name
    }
}

// ✅ Правильно
return $this->name;
```

### 3. Доступ к приватным свойствам извне

```php
class Account {
    private $balance = 1000;
}

$acc = new Account();
echo $acc->balance; // ❌ Fatal error: Cannot access private property
```

### 4. Забыл указать `public`, `private` или `protected`

```php
class User {
    $name; // ❌ Синтаксическая ошибка!
}

// ✅ Правильно
class User {
    public $name;
}
```

---

## 📝 Упражнения

### Упражнение 1: Класс Rectangle

Создай класс `Rectangle` (прямоугольник) с:
- Приватными свойствами `$width` и `$height`
- Конструктором, который принимает ширину и высоту
- Методом `getArea()` — возвращает площадь
- Методом `getPerimeter()` — возвращает периметр
- Методом `isSquare()` — проверяет, является ли прямоугольник квадратом

```php
$rect = new Rectangle(5, 10);
echo $rect->getArea();      // 50
echo $rect->getPerimeter(); // 30
echo $rect->isSquare();     // false

$square = new Rectangle(5, 5);
echo $square->isSquare();   // true
```

<details>
<summary>💡 Решение</summary>

```php
class Rectangle {
    private $width;
    private $height;
    
    public function __construct($width, $height) {
        $this->width = $width;
        $this->height = $height;
    }
    
    public function getArea() {
        return $this->width * $this->height;
    }
    
    public function getPerimeter() {
        return 2 * ($this->width + $this->height);
    }
    
    public function isSquare() {
        return $this->width === $this->height;
    }
}
```
</details>

### Упражнение 2: Класс BankAccount с историей

Расширь класс `BankAccount`:
- Добавь приватный массив `$transactions` для хранения истории операций
- В методах `deposit()` и `withdraw()` записывай операции в историю
- Добавь метод `getHistory()`, который возвращает все транзакции

```php
$account = new BankAccount(1000);
$account->deposit(500);
$account->withdraw(200);
$account->deposit(100);

print_r($account->getHistory());
// [
//   ['type' => 'deposit', 'amount' => 500, 'balance' => 1500],
//   ['type' => 'withdraw', 'amount' => 200, 'balance' => 1300],
//   ['type' => 'deposit', 'amount' => 100, 'balance' => 1400]
// ]
```

<details>
<summary>💡 Решение</summary>

```php
class BankAccount {
    private $balance;
    private $transactions = [];
    
    public function __construct($initialBalance = 0) {
        $this->balance = $initialBalance;
    }
    
    public function deposit($amount) {
        $this->balance += $amount;
        $this->transactions[] = [
            'type' => 'deposit',
            'amount' => $amount,
            'balance' => $this->balance
        ];
    }
    
    public function withdraw($amount) {
        if ($amount <= $this->balance) {
            $this->balance -= $amount;
            $this->transactions[] = [
                'type' => 'withdraw',
                'amount' => $amount,
                'balance' => $this->balance
            ];
            return true;
        }
        return false;
    }
    
    public function getHistory() {
        return $this->transactions;
    }
    
    public function getBalance() {
        return $this->balance;
    }
}
```
</details>

### Упражнение 3: Класс TodoList

Создай класс `TodoList` для управления списком задач:
- Приватный массив `$tasks`
- Метод `addTask($title)` — добавляет задачу
- Метод `completeTask($index)` — помечает задачу выполненной
- Метод `getTasks()` — возвращает все задачи
- Метод `getCompletedCount()` — возвращает количество выполненных задач

Каждая задача должна быть массивом: `['title' => '...', 'completed' => false]`

```php
$todo = new TodoList();
$todo->addTask("Купить молоко");
$todo->addTask("Выучить PHP");
$todo->completeTask(0);

echo $todo->getCompletedCount(); // 1
```

---

## 🎓 Что ты должен запомнить

✅ **Класс** — это шаблон, **объект** — конкретный экземпляр  
✅ Создаём объект через `new ИмяКласса()`  
✅ **Свойства** — данные объекта, **методы** — его поведение  
✅ `$this` указывает на текущий объект внутри методов  
✅ **Конструктор** `__construct()` вызывается автоматически при создании объекта  
✅ **Инкапсуляция** — сокрытие данных через `private` и доступ через геттеры/сеттеры  
✅ `public` — доступно везде, `private` — только внутри класса, `protected` — в классе и наследниках  

---

## 🚀 Что дальше?

Ты научился создавать классы, объекты и защищать данные через инкапсуляцию. Это основа ООП!

**В следующей главе:**
- Наследование (`extends`)
- Полиморфизм
- Абстрактные классы
- Как один класс может расширять другой

Готов копать глубже? 🔥