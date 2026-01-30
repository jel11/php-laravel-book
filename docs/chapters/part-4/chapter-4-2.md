# Глава 4.2: Наследование и полиморфизм

## 📖 Теория

### Что такое наследование?

**Наследование** — это механизм ООП, позволяющий создавать новый класс на основе существующего. Дочерний класс получает все свойства и методы родительского класса и может добавлять свои или изменять унаследованные.

**Зачем это нужно?**
- ✅ Переиспользование кода (DRY — Don't Repeat Yourself)
- ✅ Создание иерархий классов (общее → специфичное)
- ✅ Расширение функциональности без изменения базового класса

**Терминология:**
- **Родительский класс** (Parent/Base/Superclass) — класс, от которого наследуются
- **Дочерний класс** (Child/Derived/Subclass) — класс, который наследует

---

### Базовый синтаксис наследования

```php
class Animal {
    protected $name;
    protected $age;
    
    public function __construct($name, $age) {
        $this->name = $name;
        $this->age = $age;
    }
    
    public function makeSound() {
        return "Some generic sound";
    }
    
    public function getInfo() {
        return "{$this->name} is {$this->age} years old";
    }
}

// Класс Dog наследует Animal
class Dog extends Animal {
    private $breed;
    
    public function __construct($name, $age, $breed) {
        // Вызываем конструктор родителя
        parent::__construct($name, $age);
        $this->breed = $breed;
    }
    
    // Переопределяем метод родителя
    public function makeSound() {
        return "Woof! Woof!";
    }
    
    // Добавляем новый метод
    public function fetch() {
        return "{$this->name} is fetching the ball!";
    }
    
    public function getInfo() {
        // Используем метод родителя и дополняем его
        return parent::getInfo() . ", breed: {$this->breed}";
    }
}

// Использование
$dog = new Dog("Rex", 3, "German Shepherd");
echo $dog->makeSound();  // Woof! Woof!
echo $dog->getInfo();    // Rex is 3 years old, breed: German Shepherd
echo $dog->fetch();      // Rex is fetching the ball!
```

**Ключевое слово `parent::`:**
- Обращается к методам и свойствам родительского класса
- Чаще всего используется в конструкторе и при переопределении методов
- Позволяет расширять, а не заменять функциональность

---

### Модификаторы доступа и наследование

```php
class BankAccount {
    private $accountNumber;      // Доступно ТОЛЬКО в BankAccount
    protected $balance;          // Доступно в BankAccount и потомках
    public $ownerName;          // Доступно везде
    
    public function __construct($accountNumber, $balance, $ownerName) {
        $this->accountNumber = $accountNumber;
        $this->balance = $balance;
        $this->ownerName = $ownerName;
    }
    
    protected function calculateInterest() {
        return $this->balance * 0.01;
    }
}

class SavingsAccount extends BankAccount {
    public function addInterest() {
        // ✅ Можем использовать protected свойство
        $interest = $this->calculateInterest();
        $this->balance += $interest;
        
        // ❌ НЕ можем использовать private свойство
        // echo $this->accountNumber; // ОШИБКА!
        
        return "Added interest: $interest";
    }
}

$savings = new SavingsAccount("12345", 1000, "John Doe");
echo $savings->addInterest();  // ✅
// echo $savings->calculateInterest(); // ❌ protected метод
// echo $savings->balance;              // ❌ protected свойство
```

**Правило:**
- `private` — только внутри класса-владельца
- `protected` — внутри класса и всех потомков
- `public` — везде

---

### Переопределение методов (Method Overriding)

```php
class Payment {
    protected $amount;
    
    public function __construct($amount) {
        $this->amount = $amount;
    }
    
    public function process() {
        return "Processing payment of {$this->amount}";
    }
    
    public function getReceipt() {
        return "Receipt for {$this->amount}";
    }
}

class CreditCardPayment extends Payment {
    private $cardNumber;
    
    public function __construct($amount, $cardNumber) {
        parent::__construct($amount);
        $this->cardNumber = $cardNumber;
    }
    
    // Полностью переопределяем метод
    public function process() {
        // Валидация карты
        if (!$this->validateCard()) {
            return "Invalid card number";
        }
        
        return "Processing credit card payment of {$this->amount}";
    }
    
    // Расширяем метод родителя
    public function getReceipt() {
        $baseReceipt = parent::getReceipt();
        return $baseReceipt . "\nCard: ****" . substr($this->cardNumber, -4);
    }
    
    private function validateCard() {
        return strlen($this->cardNumber) === 16;
    }
}

$payment = new CreditCardPayment(100, "1234567890123456");
echo $payment->process();     // Processing credit card payment of 100
echo $payment->getReceipt();  // Receipt for 100\nCard: ****3456
```

**Правила переопределения:**
1. Метод должен иметь такое же имя
2. Сигнатура должна быть совместима (параметры могут быть более общими)
3. Видимость не может быть более строгой (public → protected ❌)

---

### Полиморфизм

**Полиморфизм** — способность объектов разных классов обрабатываться через общий интерфейс.

```php
class Shape {
    protected $color;
    
    public function __construct($color) {
        $this->color = $color;
    }
    
    public function getArea() {
        return 0; // Базовая реализация
    }
    
    public function describe() {
        return "A {$this->color} shape with area: " . $this->getArea();
    }
}

class Circle extends Shape {
    private $radius;
    
    public function __construct($color, $radius) {
        parent::__construct($color);
        $this->radius = $radius;
    }
    
    public function getArea() {
        return pi() * $this->radius ** 2;
    }
}

class Rectangle extends Shape {
    private $width;
    private $height;
    
    public function __construct($color, $width, $height) {
        parent::__construct($color);
        $this->width = $width;
        $this->height = $height;
    }
    
    public function getArea() {
        return $this->width * $this->height;
    }
}

// ПОЛИМОРФИЗМ В ДЕЙСТВИИ
function printShapeInfo(Shape $shape) {
    // Функция принимает любой объект типа Shape
    // Но вызовется конкретная реализация getArea()
    echo $shape->describe() . "\n";
}

$shapes = [
    new Circle("red", 5),
    new Rectangle("blue", 4, 6),
    new Circle("green", 3)
];

foreach ($shapes as $shape) {
    printShapeInfo($shape);
}

// Вывод:
// A red shape with area: 78.539816339745
// A blue shape with area: 24
// A green shape with area: 28.274333882308
```

**Ключевая идея:** Один и тот же код (`printShapeInfo`) работает с разными типами объектов, вызывая соответствующие методы.

---

### Абстрактные классы (Abstract Classes)

**Абстрактный класс** — это класс, который:
- ❌ Нельзя инстанцировать напрямую
- ✅ Может содержать абстрактные методы (без реализации)
- ✅ Может содержать обычные методы с реализацией
- ✅ Служит шаблоном для дочерних классов

```php
abstract class Database {
    protected $connection;
    protected $host;
    protected $dbname;
    
    public function __construct($host, $dbname) {
        $this->host = $host;
        $this->dbname = $dbname;
    }
    
    // Абстрактный метод — без реализации
    abstract public function connect();
    abstract public function query($sql);
    
    // Обычный метод — с реализацией
    public function disconnect() {
        $this->connection = null;
        return "Connection closed";
    }
    
    public function getInfo() {
        return "Database: {$this->dbname} at {$this->host}";
    }
}

class MySQLDatabase extends Database {
    // ОБЯЗАНЫ реализовать все абстрактные методы
    public function connect() {
        $dsn = "mysql:host={$this->host};dbname={$this->dbname}";
        $this->connection = new PDO($dsn, 'user', 'pass');
        return "Connected to MySQL";
    }
    
    public function query($sql) {
        return $this->connection->query($sql);
    }
}

class PostgreSQLDatabase extends Database {
    public function connect() {
        $dsn = "pgsql:host={$this->host};dbname={$this->dbname}";
        $this->connection = new PDO($dsn, 'user', 'pass');
        return "Connected to PostgreSQL";
    }
    
    public function query($sql) {
        return $this->connection->query($sql);
    }
}

// ❌ Нельзя: $db = new Database("localhost", "test");
// ✅ Можно:
$mysql = new MySQLDatabase("localhost", "mydb");
$postgres = new PostgreSQLDatabase("localhost", "mydb");

function executeQuery(Database $db, $sql) {
    $db->connect();
    $result = $db->query($sql);
    $db->disconnect();
    return $result;
}
```

**Когда использовать абстрактные классы:**
- ✅ Есть общая логика для всех потомков (обычные методы)
- ✅ Часть функциональности должна быть реализована по-разному (абстрактные методы)
- ✅ Хотите предотвратить создание экземпляров базового класса

---

### Финальные классы и методы (final)

**`final` класс** — нельзя наследовать:

```php
final class Configuration {
    private $settings = [];
    
    public function set($key, $value) {
        $this->settings[$key] = $value;
    }
    
    public function get($key) {
        return $this->settings[$key] ?? null;
    }
}

// ❌ ОШИБКА: Cannot inherit from final class Configuration
// class ExtendedConfiguration extends Configuration {}
```

**`final` метод** — нельзя переопределить:

```php
class User {
    protected $id;
    protected $email;
    
    // Этот метод нельзя переопределить в потомках
    final public function getId() {
        return $this->id;
    }
    
    // Этот можно
    public function getEmail() {
        return $this->email;
    }
}

class AdminUser extends User {
    // ✅ Можно переопределить
    public function getEmail() {
        return strtoupper($this->email);
    }
    
    // ❌ ОШИБКА: Cannot override final method User::getId()
    // public function getId() {
    //     return "ADMIN-" . $this->id;
    // }
}
```

**Когда использовать `final`:**
- Метод критичен для безопасности или корректной работы класса
- Не хотите, чтобы кто-то сломал логику переопределением
- Класс — это утилита, которую не имеет смысла расширять

---

### Практический пример: Система уведомлений

```php
<?php

abstract class Notification {
    protected $recipient;
    protected $message;
    protected $sentAt;
    
    public function __construct($recipient, $message) {
        $this->recipient = $recipient;
        $this->message = $message;
    }
    
    // Абстрактный метод — каждый тип уведомления отправляет по-своему
    abstract public function send();
    
    // Общая логика для всех уведомлений
    public function log() {
        $type = get_class($this);
        $time = date('Y-m-d H:i:s');
        file_put_contents(
            'notifications.log',
            "[$time] $type sent to {$this->recipient}\n",
            FILE_APPEND
        );
    }
    
    protected function markAsSent() {
        $this->sentAt = time();
    }
    
    public function isSent() {
        return $this->sentAt !== null;
    }
}

class EmailNotification extends Notification {
    private $subject;
    
    public function __construct($recipient, $message, $subject) {
        parent::__construct($recipient, $message);
        $this->subject = $subject;
    }
    
    public function send() {
        // Реальная отправка email
        $success = mail($this->recipient, $this->subject, $this->message);
        
        if ($success) {
            $this->markAsSent();
            $this->log();
            return "Email sent to {$this->recipient}";
        }
        
        return "Failed to send email";
    }
}

class SMSNotification extends Notification {
    public function send() {
        // Допустим, используем API для SMS
        $apiResponse = $this->sendViaSMSAPI($this->recipient, $this->message);
        
        if ($apiResponse['success']) {
            $this->markAsSent();
            $this->log();
            return "SMS sent to {$this->recipient}";
        }
        
        return "Failed to send SMS";
    }
    
    private function sendViaSMSAPI($phone, $text) {
        // Имитация API запроса
        return ['success' => true];
    }
}

class PushNotification extends Notification {
    private $deviceToken;
    
    public function __construct($recipient, $message, $deviceToken) {
        parent::__construct($recipient, $message);
        $this->deviceToken = $deviceToken;
    }
    
    public function send() {
        // Отправка push-уведомления
        $sent = $this->sendPush($this->deviceToken, $this->message);
        
        if ($sent) {
            $this->markAsSent();
            $this->log();
            return "Push notification sent to device {$this->deviceToken}";
        }
        
        return "Failed to send push notification";
    }
    
    private function sendPush($token, $message) {
        // Имитация отправки
        return true;
    }
}

// ПОЛИМОРФИЗМ: одна функция для всех типов уведомлений
class NotificationService {
    private $notifications = [];
    
    public function add(Notification $notification) {
        $this->notifications[] = $notification;
    }
    
    public function sendAll() {
        $results = [];
        
        foreach ($this->notifications as $notification) {
            // Вызывается конкретная реализация send()
            $results[] = $notification->send();
        }
        
        return $results;
    }
    
    public function getSentCount() {
        return count(array_filter($this->notifications, function($n) {
            return $n->isSent();
        }));
    }
}

// Использование
$service = new NotificationService();

$service->add(new EmailNotification(
    'user@example.com',
    'Your order has been shipped!',
    'Order Update'
));

$service->add(new SMSNotification(
    '+1234567890',
    'Your code: 123456'
));

$service->add(new PushNotification(
    'user123',
    'New message from John',
    'device-token-xyz'
));

$results = $service->sendAll();
print_r($results);

echo "Sent: " . $service->getSentCount() . " notifications\n";
```

---

## 🎯 Ключевые концепции

### 1. Иерархия классов

```php
class Vehicle {
    protected $brand;
    protected $model;
    
    public function start() {
        return "Vehicle is starting...";
    }
}

class Car extends Vehicle {
    private $doorsCount;
    
    public function start() {
        return "Car engine is starting...";
    }
    
    public function honk() {
        return "Beep beep!";
    }
}

class ElectricCar extends Car {
    private $batteryCapacity;
    
    public function start() {
        return "Electric car is silently starting...";
    }
    
    public function charge() {
        return "Charging battery...";
    }
}

// Vehicle → Car → ElectricCar
// Каждый уровень добавляет специфичную функциональность
```

### 2. Типизация и полиморфизм

```php
class ReportGenerator {
    // Принимает базовый тип, работает с любым потомком
    public function generate(Vehicle $vehicle) {
        $info = $vehicle->start();
        
        // Проверка типа при необходимости
        if ($vehicle instanceof ElectricCar) {
            $info .= "\n" . $vehicle->charge();
        }
        
        return $info;
    }
}

$generator = new ReportGenerator();
echo $generator->generate(new Car());         // ✅
echo $generator->generate(new ElectricCar()); // ✅
// echo $generator->generate(new stdClass()); // ❌ TypeError
```

### 3. Абстрактные классы vs Интерфейсы (preview)

```php
// Абстрактный класс: "ЧТО ЭТО" + частичная реализация
abstract class Animal {
    protected $name;
    
    public function __construct($name) {
        $this->name = $name;
    }
    
    // Общая логика
    public function sleep() {
        return "{$this->name} is sleeping";
    }
    
    // Абстрактная логика
    abstract public function makeSound();
}

// Интерфейс: "ЧТО УМЕЕТ" (без реализации, см. главу 4.3)
interface Flyable {
    public function fly();
    public function land();
}

class Bird extends Animal implements Flyable {
    public function makeSound() {
        return "Tweet tweet!";
    }
    
    public function fly() {
        return "{$this->name} is flying";
    }
    
    public function land() {
        return "{$this->name} has landed";
    }
}
```

---

## ⚠️ Типичные ошибки

### 1. Забыли вызвать parent::__construct()

```php
class Product {
    protected $id;
    protected $name;
    
    public function __construct($id, $name) {
        $this->id = $id;
        $this->name = $name;
    }
}

class Book extends Product {
    private $author;
    
    // ❌ ПЛОХО: родительский конструктор не вызван
    public function __construct($id, $name, $author) {
        $this->author = $author;
        // $id и $name не инициализированы!
    }
    
    // ✅ ПРАВИЛЬНО
    public function __construct($id, $name, $author) {
        parent::__construct($id, $name);
        $this->author = $author;
    }
}
```

### 2. Попытка доступа к private свойствам родителя

```php
class BankAccount {
    private $balance = 1000; // PRIVATE!
}

class PremiumAccount extends BankAccount {
    public function addBonus() {
        // ❌ ОШИБКА: Undefined property
        $this->balance += 100;
        
        // ✅ Нужен protected метод в родителе
    }
}
```

### 3. Изменение сигнатуры метода при переопределении

```php
class Logger {
    public function log($message) {
        echo $message;
    }
}

class FileLogger extends Logger {
    // ❌ ОШИБКА: параметров стало больше
    // public function log($message, $level) {
    //     file_put_contents('log.txt', "[$level] $message");
    // }
    
    // ✅ ПРАВИЛЬНО: используем значение по умолчанию
    public function log($message, $level = 'INFO') {
        file_put_contents('log.txt', "[$level] $message\n", FILE_APPEND);
    }
}
```

### 4. Не реализовали все абстрактные методы

```php
abstract class Worker {
    abstract public function work();
    abstract public function rest();
}

// ❌ ОШИБКА: метод rest() не реализован
// class Developer extends Worker {
//     public function work() {
//         return "Writing code...";
//     }
// }

// ✅ ПРАВИЛЬНО
class Developer extends Worker {
    public function work() {
        return "Writing code...";
    }
    
    public function rest() {
        return "Drinking coffee...";
    }
}
```

---

## 💡 Практические упражнения

### Упражнение 1: Библиотечная система

Создайте иерархию классов для библиотеки:

```php
<?php

// TODO: Создать абстрактный класс LibraryItem
// Свойства: $title, $author, $year, $available
// Абстрактные методы: calculateLateFee($daysLate)
// Обычные методы: borrow(), return()

// TODO: Создать класс Book extends LibraryItem
// Дополнительное свойство: $pages
// Штраф: $1 за день

// TODO: Создать класс DVD extends LibraryItem
// Дополнительное свойство: $duration (минуты)
// Штраф: $2 за день

// TODO: Создать класс Magazine extends LibraryItem
// Дополнительное свойство: $issueNumber
// Штраф: $0.50 за день

// Протестируйте создание объектов, borrowing и расчёт штрафов
```

<details>
<summary>✅ Решение</summary>

```php
<?php

abstract class LibraryItem {
    protected $title;
    protected $author;
    protected $year;
    protected $available;
    protected $borrower = null;
    
    public function __construct($title, $author, $year) {
        $this->title = $title;
        $this->author = $author;
        $this->year = $year;
        $this->available = true;
    }
    
    abstract public function calculateLateFee($daysLate);
    
    public function borrow($borrowerName) {
        if (!$this->available) {
            return "'{$this->title}' is not available";
        }
        
        $this->available = false;
        $this->borrower = $borrowerName;
        return "{$borrowerName} borrowed '{$this->title}'";
    }
    
    public function returnItem() {
        if ($this->available) {
            return "'{$this->title}' is already in library";
        }
        
        $borrower = $this->borrower;
        $this->available = true;
        $this->borrower = null;
        return "{$borrower} returned '{$this->title}'";
    }
    
    public function getInfo() {
        $status = $this->available ? "Available" : "Borrowed by {$this->borrower}";
        return "{$this->title} by {$this->author} ({$this->year}) - $status";
    }
}

class Book extends LibraryItem {
    private $pages;
    
    public function __construct($title, $author, $year, $pages) {
        parent::__construct($title, $author, $year);
        $this->pages = $pages;
    }
    
    public function calculateLateFee($daysLate) {
        return $daysLate * 1.00; // $1 за день
    }
    
    public function getInfo() {
        return parent::getInfo() . " - {$this->pages} pages";
    }
}

class DVD extends LibraryItem {
    private $duration;
    
    public function __construct($title, $author, $year, $duration) {
        parent::__construct($title, $author, $year);
        $this->duration = $duration;
    }
    
    public function calculateLateFee($daysLate) {
        return $daysLate * 2.00; // $2 за день
    }
    
    public function getInfo() {
        return parent::getInfo() . " - {$this->duration} minutes";
    }
}

class Magazine extends LibraryItem {
    private $issueNumber;
    
    public function __construct($title, $author, $year, $issueNumber) {
        parent::__construct($title, $author, $year);
        $this->issueNumber = $issueNumber;
    }
    
    public function calculateLateFee($daysLate) {
        return $daysLate * 0.50; // $0.50 за день
    }
    
    public function getInfo() {
        return parent::getInfo() . " - Issue #{$this->issueNumber}";
    }
}

// Тестирование
$items = [
    new Book("Clean Code", "Robert Martin", 2008, 464),
    new DVD("The Matrix", "Wachowskis", 1999, 136),
    new Magazine("National Geographic", "Various", 2024, 248)
];

foreach ($items as $item) {
    echo $item->getInfo() . "\n";
    echo $item->borrow("John Doe") . "\n";
    echo "Late fee for 5 days: $" . $item->calculateLateFee(5) . "\n";
    echo $item->returnItem() . "\n";
    echo "---\n";
}
```

</details>

---

### Упражнение 2: Платёжная система

Создайте систему обработки платежей с полиморфизмом:

```php
<?php

// TODO: Создать абстрактный класс PaymentMethod
// Абстрактный метод: charge($amount)
// Обычный метод: validate(), getTransactionId()

// TODO: Создать PayPalPayment extends PaymentMethod
// Свойство: $email
// Реализация charge()

// TODO: Создать StripePayment extends PaymentMethod
// Свойство: $token
// Реализация charge()

// TODO: Создать класс PaymentProcessor
// Метод processPayments(array $payments) — принимает массив PaymentMethod

// Протестируйте обработку смешанного массива платежей
```

<details>
<summary>✅ Решение</summary>

```php
<?php

abstract class PaymentMethod {
    protected $transactionId;
    protected $amount;
    
    abstract public function charge($amount);
    
    public function validate() {
        // Базовая валидация
        return $this->amount > 0;
    }
    
    public function getTransactionId() {
        return $this->transactionId;
    }
    
    protected function generateTransactionId() {
        $this->transactionId = 'TXN-' . strtoupper(uniqid());
    }
}

class PayPalPayment extends PaymentMethod {
    private $email;
    
    public function __construct($email) {
        $this->email = $email;
    }
    
    public function charge($amount) {
        $this->amount = $amount;
        
        if (!$this->validate()) {
            return "Invalid amount";
        }
        
        if (!filter_var($this->email, FILTER_VALIDATE_EMAIL)) {
            return "Invalid PayPal email";
        }
        
        $this->generateTransactionId();
        
        // Имитация обращения к PayPal API
        return "Charged ${amount} via PayPal ({$this->email}) - {$this->transactionId}";
    }
}

class StripePayment extends PaymentMethod {
    private $token;
    
    public function __construct($token) {
        $this->token = $token;
    }
    
    public function charge($amount) {
        $this->amount = $amount;
        
        if (!$this->validate()) {
            return "Invalid amount";
        }
        
        if (strlen($this->token) < 10) {
            return "Invalid Stripe token";
        }
        
        $this->generateTransactionId();
        
        // Имитация обращения к Stripe API
        return "Charged ${amount} via Stripe (token: {$this->token}) - {$this->transactionId}";
    }
}

class CryptoPayment extends PaymentMethod {
    private $walletAddress;
    private $currency;
    
    public function __construct($walletAddress, $currency = 'BTC') {
        $this->walletAddress = $walletAddress;
        $this->currency = $currency;
    }
    
    public function charge($amount) {
        $this->amount = $amount;
        
        if (!$this->validate()) {
            return "Invalid amount";
        }
        
        $this->generateTransactionId();
        
        return "Charged ${amount} via {$this->currency} to {$this->walletAddress} - {$this->transactionId}";
    }
}

class PaymentProcessor {
    private $processedPayments = [];
    private $failedPayments = [];
    
    public function processPayments(array $payments) {
        $results = [];
        
        foreach ($payments as $payment) {
            if (!($payment instanceof PaymentMethod)) {
                $results[] = "Invalid payment method";
                continue;
            }
            
            // Полиморфизм: вызывается конкретная реализация charge()
            $result = $payment->charge($payment->amount ?? 0);
            $results[] = $result;
            
            if (strpos($result, 'Charged') === 0) {
                $this->processedPayments[] = $payment;
            } else {
                $this->failedPayments[] = $payment;
            }
        }
        
        return $results;
    }
    
    public function getProcessedCount() {
        return count($this->processedPayments);
    }
    
    public function getFailedCount() {
        return count($this->failedPayments);
    }
    
    public function getTotalProcessed() {
        return array_reduce($this->processedPayments, function($total, $payment) {
            return $total + ($payment->amount ?? 0);
        }, 0);
    }
}

// Тестирование
$processor = new PaymentProcessor();

$payments = [
    new PayPalPayment('user@example.com'),
    new StripePayment('tok_visa_1234567890'),
    new CryptoPayment('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'BTC')
];

// Устанавливаем суммы
$payments[0]->charge(100);
$payments[1]->charge(250);
$payments[2]->charge(500);

$results = $processor->processPayments($payments);

foreach ($results as $result) {
    echo $result . "\n";
}

echo "\n=== Summary ===\n";
echo "Processed: " . $processor->getProcessedCount() . "\n";
echo "Failed: " . $processor->getFailedCount() . "\n";
echo "Total: $" . $processor->getTotalProcessed() . "\n";
```

</details>

---

### Упражнение 3: Система логирования

Создайте расширяемую систему логов:

```php
<?php

// TODO: Создать абстрактный класс Logger
// Абстрактный метод: write($message, $level)
// Обычные методы: info($message), error($message), warning($message)
// Метод formatMessage($message, $level) для форматирования

// TODO: FileLogger — пишет в файл
// TODO: DatabaseLogger — пишет в БД (имитация)
// TODO: MultiLogger — пишет в несколько логгеров одновременно

// Протестируйте логирование в разные места
```

<details>
<summary>✅ Решение</summary>

```php
<?php

abstract class Logger {
    protected $minLevel;
    
    const INFO = 1;
    const WARNING = 2;
    const ERROR = 3;
    
    public function __construct($minLevel = self::INFO) {
        $this->minLevel = $minLevel;
    }
    
    abstract protected function write($message, $level);
    
    public function info($message) {
        if ($this->minLevel <= self::INFO) {
            $this->write($message, 'INFO');
        }
    }
    
    public function warning($message) {
        if ($this->minLevel <= self::WARNING) {
            $this->write($message, 'WARNING');
        }
    }
    
    public function error($message) {
        if ($this->minLevel <= self::ERROR) {
            $this->write($message, 'ERROR');
        }
    }
    
    protected function formatMessage($message, $level) {
        $timestamp = date('Y-m-d H:i:s');
        return "[$timestamp] [$level] $message";
    }
}

class FileLogger extends Logger {
    private $filepath;
    
    public function __construct($filepath, $minLevel = self::INFO) {
        parent::__construct($minLevel);
        $this->filepath = $filepath;
    }
    
    protected function write($message, $level) {
        $formatted = $this->formatMessage($message, $level);
        file_put_contents($this->filepath, $formatted . "\n", FILE_APPEND);
    }
}

class DatabaseLogger extends Logger {
    private $pdo;
    
    public function __construct($pdo, $minLevel = self::INFO) {
        parent::__construct($minLevel);
        $this->pdo = $pdo;
    }
    
    protected function write($message, $level) {
        // Имитация записи в БД
        $formatted = $this->formatMessage($message, $level);
        echo "[DB] $formatted\n";
        
        // Реальный код был бы примерно таким:
        // $stmt = $this->pdo->prepare("INSERT INTO logs (message, level, created_at) VALUES (?, ?, NOW())");
        // $stmt->execute([$message, $level]);
    }
}

class ConsoleLogger extends Logger {
    protected function write($message, $level) {
        $formatted = $this->formatMessage($message, $level);
        
        // Цвета для консоли
        $colors = [
            'INFO' => "\033[0;32m",    // Зелёный
            'WARNING' => "\033[0;33m",  // Жёлтый
            'ERROR' => "\033[0;31m"     // Красный
        ];
        
        $reset = "\033[0m";
        $color = $colors[$level] ?? '';
        
        echo "{$color}{$formatted}{$reset}\n";
    }
}

class MultiLogger extends Logger {
    private $loggers = [];
    
    public function addLogger(Logger $logger) {
        $this->loggers[] = $logger;
    }
    
    protected function write($message, $level) {
        foreach ($this->loggers as $logger) {
            $logger->write($message, $level);
        }
    }
    
    // Переопределяем публичные методы для правильной работы
    public function info($message) {
        foreach ($this->loggers as $logger) {
            $logger->info($message);
        }
    }
    
    public function warning($message) {
        foreach ($this->loggers as $logger) {
            $logger->warning($message);
        }
    }
    
    public function error($message) {
        foreach ($this->loggers as $logger) {
            $logger->error($message);
        }
    }
}

// Тестирование
$fileLogger = new FileLogger('app.log');
$dbLogger = new DatabaseLogger(null); // PDO передали бы настоящий
$consoleLogger = new ConsoleLogger();

$multiLogger = new MultiLogger();
$multiLogger->addLogger($fileLogger);
$multiLogger->addLogger($dbLogger);
$multiLogger->addLogger($consoleLogger);

// Логирование
$multiLogger->info('Application started');
$multiLogger->warning('Low disk space');
$multiLogger->error('Database connection failed');

echo "\n=== Checking file log ===\n";
echo file_get_contents('app.log');
```

</details>

---

## 📝 Контрольные вопросы

1. **В чём разница между `protected` и `private`?**
   
2. **Когда нужно использовать `parent::`?**

3. **Можно ли создать экземпляр абстрактного класса?**

4. **Что произойдёт, если не реализовать абстрактный метод в дочернем классе?**

5. **Зачем нужно ключевое слово `final`?**

6. **Что такое полиморфизм простыми словами?**

7. **Можно ли в дочернем классе сделать метод более приватным (public → protected)?**

8. **В чём преимущество абстрактных классов перед обычными?**

<details>
<summary>✅ Ответы</summary>

1. **`protected`** — доступно в классе и всех потомках; **`private`** — только в классе-владельце

2. Для вызова методов родительского класса, особенно в конструкторе и при переопределении методов

3. **Нет**, абстрактные классы созданы как шаблоны для потомков

4. **Fatal error** — класс обязан реализовать все абстрактные методы родителя

5. Предотвратить наследование класса или переопределение метода (защита критичной логики)

6. Возможность использовать объекты разных классов через общий интерфейс (базовый класс/интерфейс)

7. **Нет**, видимость можно только расширять (protected → public), но не сужать

8. Абстрактные классы могут содержать общую логику (обычные методы) + обязать потомков реализовать специфичные методы (абстрактные)

</details>

---

## 🎓 Что дальше?

Вы освоили **наследование и полиморфизм** — фундаментальные концепции ООП! Теперь вы можете:

✅ Создавать иерархии классов с общей и специфичной логикой  
✅ Использовать абстрактные классы как шаблоны  
✅ Применять полиморфизм для гибких систем  
✅ Переопределять методы и расширять функциональность  

**Следующая глава:** `Глава 4.3: Интерфейсы и трейты` — узнаете о контрактах между классами, множественном наследовании поведения и когда использовать интерфейсы вместо абстрактных классов.

---

**Продолжить обучение:**
```
Глава 4.3: Интерфейсы и трейты — контракты, множественное наследование поведения, когда что использовать
```