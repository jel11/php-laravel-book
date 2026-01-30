# Глава 4.6: Принципы SOLID — на примерах PHP, как писать поддерживаемый код

## Введение: Почему код становится кошмаром

Представь: ты написал систему заказов. Всё работает. Через полгода нужно добавить новый способ оплаты. И вдруг оказывается, что для этого нужно переписать половину приложения, код перепутан как спагетти, и изменение в одном месте ломает три других.

Это происходит, когда код пишется без понимания базовых принципов проектирования. SOLID — это **пять принципов**, которые помогают писать код, который легко менять, расширять и тестировать.

SOLID расшифровывается как:
- **S** — Single Responsibility Principle (Принцип единственной ответственности)
- **O** — Open/Closed Principle (Принцип открытости/закрытости)
- **L** — Liskov Substitution Principle (Принцип подстановки Барбары Лисков)
- **I** — Interface Segregation Principle (Принцип разделения интерфейса)
- **D** — Dependency Inversion Principle (Принцип инверсии зависимостей)

Звучит страшно? Сейчас разберём каждый на примерах PHP с понятными аналогиями.

---

## S — Single Responsibility Principle (SRP)

### Суть
**У класса должна быть только одна причина для изменения.**

Класс должен делать одну вещь и делать её хорошо. Если класс отвечает за несколько задач, изменения в одной из них могут сломать другие.

### ❌ Плохой пример

```php
<?php

class User 
{
    private string $name;
    private string $email;
    
    public function __construct(string $name, string $email) 
    {
        $this->name = $name;
        $this->email = $email;
    }
    
    // Сохранение в базу данных
    public function save(): void 
    {
        $pdo = new PDO('mysql:host=localhost;dbname=test', 'root', '');
        $stmt = $pdo->prepare('INSERT INTO users (name, email) VALUES (?, ?)');
        $stmt->execute([$this->name, $this->email]);
    }
    
    // Отправка email
    public function sendWelcomeEmail(): void 
    {
        $subject = "Welcome!";
        $message = "Hello {$this->name}, welcome to our site!";
        mail($this->email, $subject, $message);
    }
    
    // Генерация отчёта
    public function generateReport(): string 
    {
        return "User Report: {$this->name} ({$this->email})";
    }
}
```

**Проблемы:**
- Класс `User` делает **четыре разных вещи**: хранит данные, работает с БД, отправляет email, генерирует отчёты
- Если изменится способ отправки email (вместо `mail()` использовать SMTP), придётся менять класс `User`
- Если изменится формат отчёта, опять менять `User`
- Невозможно протестировать сохранение без подключения к БД

### ✅ Хороший пример

```php
<?php

// Класс только хранит данные пользователя
class User 
{
    private string $name;
    private string $email;
    
    public function __construct(string $name, string $email) 
    {
        $this->name = $name;
        $this->email = $email;
    }
    
    public function getName(): string 
    {
        return $this->name;
    }
    
    public function getEmail(): string 
    {
        return $this->email;
    }
}

// Отдельный класс для работы с БД
class UserRepository 
{
    private PDO $pdo;
    
    public function __construct(PDO $pdo) 
    {
        $this->pdo = $pdo;
    }
    
    public function save(User $user): void 
    {
        $stmt = $this->pdo->prepare('INSERT INTO users (name, email) VALUES (?, ?)');
        $stmt->execute([$user->getName(), $user->getEmail()]);
    }
}

// Отдельный класс для отправки email
class EmailService 
{
    public function sendWelcomeEmail(User $user): void 
    {
        $subject = "Welcome!";
        $message = "Hello {$user->getName()}, welcome to our site!";
        mail($user->getEmail(), $subject, $message);
    }
}

// Отдельный класс для генерации отчётов
class UserReportGenerator 
{
    public function generate(User $user): string 
    {
        return "User Report: {$user->getName()} ({$user->getEmail()})";
    }
}

// Использование
$user = new User('Alice', 'alice@example.com');

$pdo = new PDO('mysql:host=localhost;dbname=test', 'root', '');
$repository = new UserRepository($pdo);
$repository->save($user);

$emailService = new EmailService();
$emailService->sendWelcomeEmail($user);

$reportGenerator = new UserReportGenerator();
echo $reportGenerator->generate($user);
```

**Преимущества:**
- Каждый класс отвечает за одну задачу
- Легко тестировать (можем создать `User` без БД и email)
- Легко менять (хотим другой способ отправки email — меняем только `EmailService`)

---

## O — Open/Closed Principle (OCP)

### Суть
**Классы должны быть открыты для расширения, но закрыты для модификации.**

Когда нужна новая функциональность, мы добавляем новый код, а не изменяем существующий.

### ❌ Плохой пример

```php
<?php

class PaymentProcessor 
{
    public function processPayment(string $type, float $amount): void 
    {
        if ($type === 'credit_card') {
            echo "Processing credit card payment: $amount\n";
            // Логика для кредитной карты
        } elseif ($type === 'paypal') {
            echo "Processing PayPal payment: $amount\n";
            // Логика для PayPal
        } elseif ($type === 'bitcoin') {
            echo "Processing Bitcoin payment: $amount\n";
            // Логика для Bitcoin
        }
        // Каждый новый способ оплаты = новый if
    }
}

$processor = new PaymentProcessor();
$processor->processPayment('credit_card', 100);
```

**Проблема:** При добавлении нового способа оплаты приходится **менять класс** `PaymentProcessor`, добавляя новый `elseif`. Это нарушает принцип "закрыто для модификации".

### ✅ Хороший пример

```php
<?php

// Интерфейс для всех способов оплаты
interface PaymentMethod 
{
    public function process(float $amount): void;
}

// Каждый способ оплаты — отдельный класс
class CreditCardPayment implements PaymentMethod 
{
    public function process(float $amount): void 
    {
        echo "Processing credit card payment: $amount\n";
        // Логика для кредитной карты
    }
}

class PayPalPayment implements PaymentMethod 
{
    public function process(float $amount): void 
    {
        echo "Processing PayPal payment: $amount\n";
        // Логика для PayPal
    }
}

class BitcoinPayment implements PaymentMethod 
{
    public function process(float $amount): void 
    {
        echo "Processing Bitcoin payment: $amount\n";
        // Логика для Bitcoin
    }
}

// Процессор работает с интерфейсом
class PaymentProcessor 
{
    public function processPayment(PaymentMethod $method, float $amount): void 
    {
        $method->process($amount);
    }
}

// Использование
$processor = new PaymentProcessor();

$processor->processPayment(new CreditCardPayment(), 100);
$processor->processPayment(new PayPalPayment(), 50);
$processor->processPayment(new BitcoinPayment(), 25);

// Добавляем новый способ оплаты БЕЗ изменения PaymentProcessor
class ApplePayPayment implements PaymentMethod 
{
    public function process(float $amount): void 
    {
        echo "Processing Apple Pay payment: $amount\n";
    }
}

$processor->processPayment(new ApplePayPayment(), 75);
```

**Преимущества:**
- Новый способ оплаты = новый класс, без изменения `PaymentProcessor`
- Существующий код остаётся нетронутым и не ломается
- Легко добавлять функциональность

---

## L — Liskov Substitution Principle (LSP)

### Суть
**Объекты подклассов должны быть взаимозаменяемы с объектами базового класса без изменения корректности программы.**

Проще: если у тебя есть класс `Bird` (птица) и подкласс `Penguin` (пингвин), то везде, где используется `Bird`, должен работать и `Penguin`. Но если `Bird` имеет метод `fly()`, а пингвины не летают — нарушение LSP.

### ❌ Плохой пример

```php
<?php

class Rectangle 
{
    protected float $width;
    protected float $height;
    
    public function setWidth(float $width): void 
    {
        $this->width = $width;
    }
    
    public function setHeight(float $height): void 
    {
        $this->height = $height;
    }
    
    public function getArea(): float 
    {
        return $this->width * $this->height;
    }
}

class Square extends Rectangle 
{
    // У квадрата ширина всегда равна высоте
    public function setWidth(float $width): void 
    {
        $this->width = $width;
        $this->height = $width;
    }
    
    public function setHeight(float $height): void 
    {
        $this->width = $height;
        $this->height = $height;
    }
}

// Тестируем
function testRectangle(Rectangle $rectangle): void 
{
    $rectangle->setWidth(5);
    $rectangle->setHeight(10);
    
    // Ожидаем площадь 50
    echo "Area: " . $rectangle->getArea() . "\n";
}

testRectangle(new Rectangle()); // Area: 50 ✅
testRectangle(new Square());    // Area: 100 ❌ (ожидали 50!)
```

**Проблема:** `Square` не может быть заменой для `Rectangle`, потому что изменяет поведение методов. Это нарушает LSP.

### ✅ Хороший пример

```php
<?php

// Общий интерфейс для фигур
interface Shape 
{
    public function getArea(): float;
}

class Rectangle implements Shape 
{
    private float $width;
    private float $height;
    
    public function __construct(float $width, float $height) 
    {
        $this->width = $width;
        $this->height = $height;
    }
    
    public function getArea(): float 
    {
        return $this->width * $this->height;
    }
}

class Square implements Shape 
{
    private float $side;
    
    public function __construct(float $side) 
    {
        $this->side = $side;
    }
    
    public function getArea(): float 
    {
        return $this->side * $this->side;
    }
}

// Работаем с интерфейсом
function calculateTotalArea(array $shapes): float 
{
    $total = 0;
    foreach ($shapes as $shape) {
        $total += $shape->getArea();
    }
    return $total;
}

$shapes = [
    new Rectangle(5, 10),
    new Square(4),
];

echo "Total area: " . calculateTotalArea($shapes); // 50 + 16 = 66
```

**Преимущества:**
- Никакого наследования там, где оно не имеет смысла
- Каждая фигура независима
- Взаимозаменяемость через интерфейс

---

## I — Interface Segregation Principle (ISP)

### Суть
**Клиенты не должны зависеть от интерфейсов, которые они не используют.**

Лучше несколько маленьких специализированных интерфейсов, чем один большой с кучей методов.

### ❌ Плохой пример

```php
<?php

interface Worker 
{
    public function work(): void;
    public function eat(): void;
    public function sleep(): void;
}

class Human implements Worker 
{
    public function work(): void 
    {
        echo "Human is working\n";
    }
    
    public function eat(): void 
    {
        echo "Human is eating\n";
    }
    
    public function sleep(): void 
    {
        echo "Human is sleeping\n";
    }
}

class Robot implements Worker 
{
    public function work(): void 
    {
        echo "Robot is working\n";
    }
    
    public function eat(): void 
    {
        // Роботы не едят! Но вынуждены реализовать метод
        throw new Exception("Robots don't eat!");
    }
    
    public function sleep(): void 
    {
        // Роботы не спят!
        throw new Exception("Robots don't sleep!");
    }
}
```

**Проблема:** `Robot` вынужден реализовывать методы `eat()` и `sleep()`, которые ему не нужны.

### ✅ Хороший пример

```php
<?php

// Разделяем на маленькие интерфейсы
interface Workable 
{
    public function work(): void;
}

interface Eatable 
{
    public function eat(): void;
}

interface Sleepable 
{
    public function sleep(): void;
}

class Human implements Workable, Eatable, Sleepable 
{
    public function work(): void 
    {
        echo "Human is working\n";
    }
    
    public function eat(): void 
    {
        echo "Human is eating\n";
    }
    
    public function sleep(): void 
    {
        echo "Human is sleeping\n";
    }
}

class Robot implements Workable 
{
    public function work(): void 
    {
        echo "Robot is working\n";
    }
    // Не нужны eat() и sleep()
}

// Функция, которой нужны только работающие объекты
function manageWorkers(array $workers): void 
{
    foreach ($workers as $worker) {
        $worker->work();
    }
}

manageWorkers([new Human(), new Robot()]);
```

**Преимущества:**
- Каждый класс реализует только нужные интерфейсы
- Нет "мёртвых" методов
- Гибкость в комбинировании поведений

---

## D — Dependency Inversion Principle (DIP)

### Суть
**Модули верхнего уровня не должны зависеть от модулей нижнего уровня. Оба должны зависеть от абстракций.**

Проще: не привязывайся к конкретным классам, используй интерфейсы.

### ❌ Плохой пример

```php
<?php

class MySQLDatabase 
{
    public function connect(): void 
    {
        echo "Connected to MySQL\n";
    }
    
    public function query(string $sql): array 
    {
        echo "Executing: $sql\n";
        return [];
    }
}

class UserRepository 
{
    private MySQLDatabase $database;
    
    public function __construct() 
    {
        // Жёсткая зависимость от MySQL
        $this->database = new MySQLDatabase();
    }
    
    public function findAll(): array 
    {
        return $this->database->query('SELECT * FROM users');
    }
}

$repository = new UserRepository();
$repository->findAll();
```

**Проблема:** `UserRepository` жёстко привязан к `MySQLDatabase`. Если захотим использовать PostgreSQL или MongoDB — придётся переписывать `UserRepository`.

### ✅ Хороший пример

```php
<?php

// Абстракция (интерфейс)
interface Database 
{
    public function connect(): void;
    public function query(string $sql): array;
}

// Конкретные реализации
class MySQLDatabase implements Database 
{
    public function connect(): void 
    {
        echo "Connected to MySQL\n";
    }
    
    public function query(string $sql): array 
    {
        echo "Executing MySQL: $sql\n";
        return [];
    }
}

class PostgreSQLDatabase implements Database 
{
    public function connect(): void 
    {
        echo "Connected to PostgreSQL\n";
    }
    
    public function query(string $sql): array 
    {
        echo "Executing PostgreSQL: $sql\n";
        return [];
    }
}

// Репозиторий зависит от абстракции
class UserRepository 
{
    private Database $database;
    
    // Внедрение зависимости через конструктор
    public function __construct(Database $database) 
    {
        $this->database = $database;
    }
    
    public function findAll(): array 
    {
        return $this->database->query('SELECT * FROM users');
    }
}

// Использование
$mysqlDb = new MySQLDatabase();
$repository1 = new UserRepository($mysqlDb);
$repository1->findAll();

// Легко переключиться на другую БД
$postgresDb = new PostgreSQLDatabase();
$repository2 = new UserRepository($postgresDb);
$repository2->findAll();
```

**Преимущества:**
- `UserRepository` не зависит от конкретной БД
- Легко тестировать (можем создать mock-объект `Database`)
- Легко менять реализацию БД без изменения репозитория

---

## Практический пример: Система уведомлений

Применим все принципы SOLID для создания гибкой системы уведомлений.

```php
<?php

// D: Зависим от абстракций
interface NotificationChannel 
{
    public function send(string $recipient, string $message): void;
}

// O: Открыто для расширения через новые классы
class EmailChannel implements NotificationChannel 
{
    public function send(string $recipient, string $message): void 
    {
        echo "Sending email to $recipient: $message\n";
    }
}

class SmsChannel implements NotificationChannel 
{
    public function send(string $recipient, string $message): void 
    {
        echo "Sending SMS to $recipient: $message\n";
    }
}

class PushChannel implements NotificationChannel 
{
    public function send(string $recipient, string $message): void 
    {
        echo "Sending push notification to $recipient: $message\n";
    }
}

// S: Класс отвечает только за форматирование сообщений
class MessageFormatter 
{
    public function format(string $template, array $data): string 
    {
        $message = $template;
        foreach ($data as $key => $value) {
            $message = str_replace("{{$key}}", $value, $message);
        }
        return $message;
    }
}

// S: Класс отвечает только за отправку уведомлений
class NotificationService 
{
    private NotificationChannel $channel;
    private MessageFormatter $formatter;
    
    // D: Внедрение зависимостей
    public function __construct(NotificationChannel $channel, MessageFormatter $formatter) 
    {
        $this->channel = $channel;
        $this->formatter = $formatter;
    }
    
    public function notify(string $recipient, string $template, array $data): void 
    {
        $message = $this->formatter->format($template, $data);
        $this->channel->send($recipient, $message);
    }
}

// Использование
$formatter = new MessageFormatter();

// Отправка email
$emailService = new NotificationService(new EmailChannel(), $formatter);
$emailService->notify(
    'user@example.com',
    'Hello {name}, you have {count} new messages',
    ['name' => 'Alice', 'count' => 5]
);

// Отправка SMS
$smsService = new NotificationService(new SmsChannel(), $formatter);
$smsService->notify(
    '+1234567890',
    'Hello {name}, you have {count} new messages',
    ['name' => 'Bob', 'count' => 3]
);

// Легко добавить новый канал
class TelegramChannel implements NotificationChannel 
{
    public function send(string $recipient, string $message): void 
    {
        echo "Sending Telegram message to $recipient: $message\n";
    }
}

$telegramService = new NotificationService(new TelegramChannel(), $formatter);
$telegramService->notify('@alice', 'Test message', []);
```

---

## Когда нарушать SOLID?

SOLID — это **принципы**, а не **жёсткие правила**. Иногда их соблюдение избыточно:

1. **Маленькие проекты**: Для скрипта на 50 строк SOLID — overkill
2. **Прототипы**: Когда быстро тестируешь идею, можно пренебречь архитектурой
3. **Очевидная простота**: Если код простой и вряд ли будет меняться

Но для **больших проектов**, которые развиваются годами, SOLID — спасение.

---

## Чеклист SOLID

При написании кода спрашивай себя:

- [ ] **S**: Делает ли этот класс только одну вещь?
- [ ] **O**: Смогу ли я добавить новую функциональность без изменения существующего кода?
- [ ] **L**: Можно ли заменить базовый класс на подкласс без поломок?
- [ ] **I**: Все ли методы интерфейса действительно нужны всем классам?
- [ ] **D**: Зависит ли мой класс от абстракций или от конкретных реализаций?

---

## Упражнения

### Упражнение 1: Рефакторинг класса Order
Перепиши класс `Order`, чтобы он следовал SRP:

```php
<?php

class Order 
{
    private array $items = [];
    private float $total = 0;
    
    public function addItem(string $name, float $price): void 
    {
        $this->items[] = ['name' => $name, 'price' => $price];
        $this->total += $price;
    }
    
    public function calculateDiscount(): float 
    {
        return $this->total > 100 ? $this->total * 0.1 : 0;
    }
    
    public function saveToDatabase(): void 
    {
        $pdo = new PDO('mysql:host=localhost;dbname=shop', 'root', '');
        $stmt = $pdo->prepare('INSERT INTO orders (total) VALUES (?)');
        $stmt->execute([$this->total]);
    }
    
    public function sendConfirmationEmail(string $email): void 
    {
        mail($email, 'Order Confirmation', 'Your order total: ' . $this->total);
    }
    
    public function generateInvoice(): string 
    {
        $invoice = "INVOICE\n";
        foreach ($this->items as $item) {
            $invoice .= "{$item['name']}: {$item['price']}\n";
        }
        $invoice .= "Total: {$this->total}\n";
        return $invoice;
    }
}
```

**Задача:** Раздели на отдельные классы: `Order`, `OrderRepository`, `EmailService`, `InvoiceGenerator`, `DiscountCalculator`.

### Упражнение 2: Реализуй OCP
Создай систему расчёта стоимости доставки:

```php
<?php

interface ShippingMethod 
{
    public function calculateCost(float $weight, float $distance): float;
}

// Реализуй: StandardShipping, ExpressShipping, InternationalShipping
// Затем создай класс ShippingCalculator, который работает с любым ShippingMethod
```

### Упражнение 3: Исправь нарушение LSP
Что не так с этим кодом?

```php
<?php

class Bird 
{
    public function fly(): void 
    {
        echo "Flying...\n";
    }
}

class Ostrich extends Bird 
{
    public function fly(): void 
    {
        throw new Exception("Ostriches can't fly!");
    }
}

function makeBirdFly(Bird $bird): void 
{
    $bird->fly();
}

makeBirdFly(new Ostrich()); // Падает!
```

**Задача:** Перепроектируй иерархию классов.

### Упражнение 4: Примени ISP
Интерфейс `Vehicle` слишком большой. Раздели его:

```php
<?php

interface Vehicle 
{
    public function startEngine(): void;
    public function drive(): void;
    public function fly(): void;
    public function sail(): void;
}

// Проблема: велосипед должен реализовать startEngine(), fly(), sail()
```

### Упражнение 5: DIP на практике
Создай класс `ReportGenerator`, который может генерировать отчёты в разных форматах (PDF, HTML, JSON) без жёсткой привязки к конкретным классам.

---

## Ответы к упражнениям

<details>
<summary>Упражнение 1: Рефакторинг Order (показать решение)</summary>

```php
<?php

class Order 
{
    private array $items = [];
    private float $total = 0;
    
    public function addItem(string $name, float $price): void 
    {
        $this->items[] = ['name' => $name, 'price' => $price];
        $this->total += $price;
    }
    
    public function getItems(): array 
    {
        return $this->items;
    }
    
    public function getTotal(): float 
    {
        return $this->total;
    }
}

class DiscountCalculator 
{
    public function calculate(Order $order): float 
    {
        return $order->getTotal() > 100 ? $order->getTotal() * 0.1 : 0;
    }
}

class OrderRepository 
{
    private PDO $pdo;
    
    public function __construct(PDO $pdo) 
    {
        $this->pdo = $pdo;
    }
    
    public function save(Order $order): void 
    {
        $stmt = $this->pdo->prepare('INSERT INTO orders (total) VALUES (?)');
        $stmt->execute([$order->getTotal()]);
    }
}

class EmailService 
{
    public function sendOrderConfirmation(string $email, Order $order): void 
    {
        mail($email, 'Order Confirmation', 'Your order total: ' . $order->getTotal());
    }
}

class InvoiceGenerator 
{
    public function generate(Order $order): string 
    {
        $invoice = "INVOICE\n";
        foreach ($order->getItems() as $item) {
            $invoice .= "{$item['name']}: {$item['price']}\n";
        }
        $invoice .= "Total: {$order->getTotal()}\n";
        return $invoice;
    }
}
```
</details>

<details>
<summary>Упражнение 2: OCP с доставкой (показать решение)</summary>

```php
<?php

interface ShippingMethod 
{
    public function calculateCost(float $weight, float $distance): float;
}

class StandardShipping implements ShippingMethod 
{
    public function calculateCost(float $weight, float $distance): float 
    {
        return $weight * 0.5 + $distance * 0.1;
    }
}

class ExpressShipping implements ShippingMethod 
{
    public function calculateCost(float $weight, float $distance): float 
    {
        return $weight * 1.0 + $distance * 0.2 + 10; // +10 за срочность
    }
}

class InternationalShipping implements ShippingMethod 
{
    public function calculateCost(float $weight, float $distance): float 
    {
        return $weight * 2.0 + $distance * 0.5 + 50; // +50 за таможню
    }
}

class ShippingCalculator 
{
    public function calculate(ShippingMethod $method, float $weight, float $distance): float 
    {
        return $method->calculateCost($weight, $distance);
    }
}

// Использование
$calculator = new ShippingCalculator();
echo $calculator->calculate(new StandardShipping(), 10, 100) . "\n";
echo $calculator->calculate(new ExpressShipping(), 10, 100) . "\n";
```
</details>

<details>
<summary>Упражнение 3: Исправление LSP (показать решение)</summary>

```php
<?php

interface Bird 
{
    public function eat(): void;
}

interface FlyingBird extends Bird 
{
    public function fly(): void;
}

class Sparrow implements FlyingBird 
{
    public function eat(): void 
    {
        echo "Sparrow is eating\n";
    }
    
    public function fly(): void 
    {
        echo "Sparrow is flying\n";
    }
}

class Ostrich implements Bird 
{
    public function eat(): void 
    {
        echo "Ostrich is eating\n";
    }
}

function makeBirdFly(FlyingBird $bird): void 
{
    $bird->fly();
}

makeBirdFly(new Sparrow()); // OK
// makeBirdFly(new Ostrich()); // Ошибка компиляции — правильно!
```
</details>

<details>
<summary>Упражнение 4: ISP с транспортом (показать решение)</summary>

```php
<?php

interface Drivable 
{
    public function drive(): void;
}

interface Flyable 
{
    public function fly(): void;
}

interface Sailable 
{
    public function sail(): void;
}

interface Motorized 
{
    public function startEngine(): void;
}

class Car implements Drivable, Motorized 
{
    public function drive(): void 
    {
        echo "Driving car\n";
    }
    
    public function startEngine(): void 
    {
        echo "Starting car engine\n";
    }
}

class Bicycle implements Drivable 
{
    public function drive(): void 
    {
        echo "Riding bicycle\n";
    }
}

class Airplane implements Flyable, Motorized 
{
    public function fly(): void 
    {
        echo "Flying airplane\n";
    }
    
    public function startEngine(): void 
    {
        echo "Starting airplane engine\n";
    }
}
```
</details>

<details>
<summary>Упражнение 5: DIP с генератором отчётов (показать решение)</summary>

```php
<?php

interface ReportFormatter 
{
    public function format(array $data): string;
}

class PdfFormatter implements ReportFormatter 
{
    public function format(array $data): string 
    {
        return "PDF Report: " . json_encode($data);
    }
}

class HtmlFormatter implements ReportFormatter 
{
    public function format(array $data): string 
    {
        $html = "<html><body><ul>";
        foreach ($data as $item) {
            $html .= "<li>$item</li>";
        }
        $html .= "</ul></body></html>";
        return $html;
    }
}

class JsonFormatter implements ReportFormatter 
{
    public function format(array $data): string 
    {
        return json_encode($data, JSON_PRETTY_PRINT);
    }
}

class ReportGenerator 
{
    private ReportFormatter $formatter;
    
    public function __construct(ReportFormatter $formatter) 
    {
        $this->formatter = $formatter;
    }
    
    public function generate(array $data): string 
    {
        return $this->formatter->format($data);
    }
}

// Использование
$data = ['Item 1', 'Item 2', 'Item 3'];

$pdfGenerator = new ReportGenerator(new PdfFormatter());
echo $pdfGenerator->generate($data) . "\n";

$htmlGenerator = new ReportGenerator(new HtmlFormatter());
echo $htmlGenerator->generate($data) . "\n";
```
</details>

---

## Заключение

SOLID — это не просто теория из учебников. Это **практические правила**, которые спасут тебя от боли рефакторинга через год после написания кода.

**Главное:**
- **S**: Один класс = одна задача
- **O**: Расширяй через новые классы, а не изменение старых
- **L**: Подклассы должны быть полноценной заменой базового класса
- **I**: Маленькие специализированные интерфейсы лучше одного огромного
- **D**: Зависи от интерфейсов, а не от конкретных классов

Начинай применять SOLID постепенно. Сначала попробуй хотя бы SRP и DIP — они дают максимальную пользу с минимальными усилиями.

**Следующая глава:** Паттерн MVC — применим SOLID на практике в архитектуре приложения!