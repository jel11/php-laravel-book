# Глава 4.3: Интерфейсы и трейты — контракты, множественное наследование поведения, когда что использовать

## 🎯 Что ты узнаешь

- Что такое интерфейсы и зачем они нужны
- Как создавать и реализовывать интерфейсы
- Что такое трейты и как они решают проблему множественного наследования
- Когда использовать интерфейсы, трейты или абстрактные классы
- Практические паттерны применения

---

## 📖 Теория

### Интерфейсы — контракты между классами

**Интерфейс** — это контракт, который определяет, какие методы должен реализовать класс, но не определяет, как именно.

Представь интерфейс как техническое задание:
- "У автомобиля должен быть метод `заводить()` и `ехать()`"
- Но КАК именно заводится Лада или Мерседес — это их внутреннее дело

#### Зачем нужны интерфейсы?

```php
// ❌ Без интерфейса — хрупкий код
function processPayment(StripePayment $payment) {
    $payment->charge();
}

// Проблема: если захотим добавить PayPal — придется менять функцию!
```

```php
// ✅ С интерфейсом — гибкий код
interface PaymentInterface {
    public function charge(float $amount): bool;
    public function refund(string $transactionId): bool;
}

function processPayment(PaymentInterface $payment, float $amount) {
    $payment->charge($amount);
}

// Теперь можем передать любую реализацию!
processPayment(new StripePayment(), 100);
processPayment(new PayPalPayment(), 100);
processPayment(new CryptoPayment(), 100);
```

### Создание и реализация интерфейсов

```php
interface PaymentInterface {
    // Только объявление методов, без реализации
    public function charge(float $amount): bool;
    public function refund(string $transactionId): bool;
    public function getTransactionId(): string;
}

// Реализация интерфейса
class StripePayment implements PaymentInterface {
    private string $transactionId;
    
    public function charge(float $amount): bool {
        // Логика оплаты через Stripe API
        $this->transactionId = 'stripe_' . uniqid();
        echo "Charged $amount via Stripe\n";
        return true;
    }
    
    public function refund(string $transactionId): bool {
        echo "Refunded via Stripe: $transactionId\n";
        return true;
    }
    
    public function getTransactionId(): string {
        return $this->transactionId;
    }
}

class PayPalPayment implements PaymentInterface {
    private string $transactionId;
    
    public function charge(float $amount): bool {
        $this->transactionId = 'paypal_' . uniqid();
        echo "Charged $amount via PayPal\n";
        return true;
    }
    
    public function refund(string $transactionId): bool {
        echo "Refunded via PayPal: $transactionId\n";
        return true;
    }
    
    public function getTransactionId(): string {
        return $this->transactionId;
    }
}
```

### Множественные интерфейсы

В отличие от классов, интерфейсов можно реализовать сколько угодно:

```php
interface Loggable {
    public function log(string $message): void;
}

interface Cacheable {
    public function cache(string $key, mixed $value): void;
    public function getFromCache(string $key): mixed;
}

// Класс реализует ОБА интерфейса
class UserRepository implements Loggable, Cacheable {
    public function log(string $message): void {
        echo "[LOG] $message\n";
    }
    
    public function cache(string $key, mixed $value): void {
        // Сохранение в кеш
    }
    
    public function getFromCache(string $key): mixed {
        // Получение из кеша
        return null;
    }
}
```

### Наследование интерфейсов

Интерфейсы тоже могут наследоваться:

```php
interface Vehicle {
    public function start(): void;
    public function stop(): void;
}

interface FlyingVehicle extends Vehicle {
    public function takeOff(): void;
    public function land(): void;
}

class Airplane implements FlyingVehicle {
    public function start(): void {
        echo "Engine started\n";
    }
    
    public function stop(): void {
        echo "Engine stopped\n";
    }
    
    public function takeOff(): void {
        echo "Taking off\n";
    }
    
    public function land(): void {
        echo "Landing\n";
    }
}
```

---

## 🧩 Трейты — переиспользуемые блоки кода

PHP не поддерживает множественное наследование классов. **Трейты** решают эту проблему.

### Проблема, которую решают трейты

```php
// ❌ Это НЕ работает в PHP!
class Admin extends User, Logger {  // ОШИБКА!
}
```

```php
// ✅ Решение через трейты
trait Loggable {
    public function log(string $message): void {
        echo "[" . date('Y-m-d H:i:s') . "] $message\n";
    }
}

trait Timestampable {
    private DateTime $createdAt;
    private DateTime $updatedAt;
    
    public function setTimestamps(): void {
        $now = new DateTime();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }
    
    public function touch(): void {
        $this->updatedAt = new DateTime();
    }
}

class User {
    use Loggable, Timestampable;  // Можем использовать несколько трейтов!
    
    public string $name;
    
    public function __construct(string $name) {
        $this->name = $name;
        $this->setTimestamps();
        $this->log("User $name created");
    }
}

$user = new User("Alice");
$user->touch();
```

### Трейты с приватными свойствами и методами

```php
trait DatabaseConnection {
    private ?PDO $connection = null;
    
    private function connect(): PDO {
        if ($this->connection === null) {
            $this->connection = new PDO(
                'mysql:host=localhost;dbname=test',
                'user',
                'password'
            );
        }
        return $this->connection;
    }
    
    protected function query(string $sql): PDOStatement {
        return $this->connect()->query($sql);
    }
}

class UserRepository {
    use DatabaseConnection;
    
    public function getAllUsers(): array {
        // Можем использовать protected метод из трейта
        $stmt = $this->query("SELECT * FROM users");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
```

### Конфликты методов и их разрешение

Если два трейта имеют методы с одинаковым именем:

```php
trait Logger {
    public function log(string $message): void {
        echo "LOG: $message\n";
    }
}

trait Debugger {
    public function log(string $message): void {
        echo "DEBUG: $message\n";
    }
}

class Application {
    use Logger, Debugger {
        // Выбираем конкретную реализацию
        Logger::log insteadof Debugger;
        // Создаем псевдоним для второго метода
        Debugger::log as debugLog;
    }
}

$app = new Application();
$app->log("Test");        // Выведет: LOG: Test
$app->debugLog("Test");   // Выведет: DEBUG: Test
```

### Переопределение методов трейта

```php
trait Greetable {
    public function greet(): string {
        return "Hello!";
    }
}

class FrenchGreeter {
    use Greetable;
    
    // Переопределяем метод из трейта
    public function greet(): string {
        return "Bonjour!";
    }
}

$greeter = new FrenchGreeter();
echo $greeter->greet();  // Bonjour!
```

### Трейты в трейтах

```php
trait HasUuid {
    private string $uuid;
    
    public function generateUuid(): void {
        $this->uuid = uniqid('', true);
    }
    
    public function getUuid(): string {
        return $this->uuid;
    }
}

trait Identifiable {
    use HasUuid;  // Трейт использует другой трейт!
    
    private int $id;
    
    public function setId(int $id): void {
        $this->id = $id;
    }
    
    public function getId(): int {
        return $this->id;
    }
}

class Product {
    use Identifiable;
    
    public string $name;
}

$product = new Product();
$product->setId(123);
$product->generateUuid();
echo $product->getUuid();  // Работает!
```

---

## 🤔 Когда что использовать?

### Интерфейс → когда нужен контракт

**Используй интерфейс, когда:**
- Нужно определить, ЧТО должен уметь класс (контракт)
- Разные классы должны иметь общее поведение, но реализации совершенно разные
- Хочешь полиморфизм (один тип для разных классов)

```php
interface Notifiable {
    public function notify(string $message): void;
}

class EmailNotifier implements Notifiable {
    public function notify(string $message): void {
        // Отправка email
    }
}

class SmsNotifier implements Notifiable {
    public function notify(string $message): void {
        // Отправка SMS
    }
}

class PushNotifier implements Notifiable {
    public function notify(string $message): void {
        // Push-уведомление
    }
}

// Теперь можем работать с любым типом уведомлений одинаково
function sendNotification(Notifiable $notifier, string $message) {
    $notifier->notify($message);
}
```

### Трейт → когда нужно переиспользовать код

**Используй трейт, когда:**
- Несколько несвязанных классов нуждаются в одинаковой функциональности
- Нужно избежать дублирования кода
- Хочешь "примешать" поведение к классу

```php
trait SoftDeletes {
    private ?DateTime $deletedAt = null;
    
    public function delete(): void {
        $this->deletedAt = new DateTime();
    }
    
    public function restore(): void {
        $this->deletedAt = null;
    }
    
    public function isDeleted(): bool {
        return $this->deletedAt !== null;
    }
}

// Можем добавить мягкое удаление к любой модели
class User {
    use SoftDeletes;
}

class Post {
    use SoftDeletes;
}

class Comment {
    use SoftDeletes;
}
```

### Абстрактный класс → когда нужна базовая реализация

**Используй абстрактный класс, когда:**
- Есть общая реализация для нескольких классов
- Хочешь определить и контракт (абстрактные методы), и базовую реализацию (обычные методы)
- Классы связаны отношением "является" (is-a)

```php
abstract class Animal {
    protected string $name;
    
    public function __construct(string $name) {
        $this->name = $name;
    }
    
    // Общая реализация для всех животных
    public function getName(): string {
        return $this->name;
    }
    
    // Но звук каждое животное издает свой
    abstract public function makeSound(): string;
}

class Dog extends Animal {
    public function makeSound(): string {
        return "Woof!";
    }
}

class Cat extends Animal {
    public function makeSound(): string {
        return "Meow!";
    }
}
```

### Таблица сравнения

| Особенность | Интерфейс | Трейт | Абстрактный класс |
|------------|-----------|-------|-------------------|
| **Множественное использование** | ✅ Да | ✅ Да | ❌ Нет |
| **Может содержать реализацию** | ❌ Нет | ✅ Да | ✅ Да |
| **Может содержать свойства** | ❌ Нет | ✅ Да | ✅ Да |
| **Может содержать константы** | ✅ Да | ✅ Да | ✅ Да |
| **Назначение** | Контракт | Переиспользование кода | Базовая реализация |
| **Связь между классами** | Слабая | Слабая | Сильная (наследование) |

---

## 💼 Практические примеры

### Пример 1: Система уведомлений (Интерфейсы)

```php
interface NotificationChannel {
    public function send(string $recipient, string $message): bool;
    public function supports(string $type): bool;
}

class EmailChannel implements NotificationChannel {
    public function send(string $recipient, string $message): bool {
        echo "Sending email to $recipient: $message\n";
        return true;
    }
    
    public function supports(string $type): bool {
        return $type === 'email';
    }
}

class SmsChannel implements NotificationChannel {
    public function send(string $recipient, string $message): bool {
        echo "Sending SMS to $recipient: $message\n";
        return true;
    }
    
    public function supports(string $type): bool {
        return $type === 'sms';
    }
}

class NotificationService {
    private array $channels = [];
    
    public function addChannel(NotificationChannel $channel): void {
        $this->channels[] = $channel;
    }
    
    public function notify(string $type, string $recipient, string $message): void {
        foreach ($this->channels as $channel) {
            if ($channel->supports($type)) {
                $channel->send($recipient, $message);
                return;
            }
        }
        
        echo "No channel found for type: $type\n";
    }
}

// Использование
$service = new NotificationService();
$service->addChannel(new EmailChannel());
$service->addChannel(new SmsChannel());

$service->notify('email', 'user@example.com', 'Hello!');
$service->notify('sms', '+1234567890', 'Hello!');
```

### Пример 2: Активные записи с трейтами

```php
trait Timestamps {
    private DateTime $createdAt;
    private DateTime $updatedAt;
    
    public function initTimestamps(): void {
        $now = new DateTime();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }
    
    public function updateTimestamp(): void {
        $this->updatedAt = new DateTime();
    }
    
    public function getCreatedAt(): DateTime {
        return $this->createdAt;
    }
    
    public function getUpdatedAt(): DateTime {
        return $this->updatedAt;
    }
}

trait Validatable {
    private array $errors = [];
    
    abstract protected function rules(): array;
    
    public function validate(): bool {
        $this->errors = [];
        $rules = $this->rules();
        
        foreach ($rules as $field => $fieldRules) {
            if (!isset($this->$field)) {
                $this->errors[$field][] = "Field $field is required";
                continue;
            }
            
            foreach ($fieldRules as $rule) {
                if ($rule === 'email' && !filter_var($this->$field, FILTER_VALIDATE_EMAIL)) {
                    $this->errors[$field][] = "Invalid email format";
                }
                
                if ($rule === 'required' && empty($this->$field)) {
                    $this->errors[$field][] = "Field $field is required";
                }
            }
        }
        
        return empty($this->errors);
    }
    
    public function getErrors(): array {
        return $this->errors;
    }
}

class User {
    use Timestamps, Validatable;
    
    public string $email;
    public string $name;
    
    public function __construct(string $email, string $name) {
        $this->email = $email;
        $this->name = $name;
        $this->initTimestamps();
    }
    
    protected function rules(): array {
        return [
            'email' => ['required', 'email'],
            'name' => ['required']
        ];
    }
    
    public function save(): bool {
        if (!$this->validate()) {
            echo "Validation failed:\n";
            print_r($this->getErrors());
            return false;
        }
        
        $this->updateTimestamp();
        echo "User saved: {$this->name}\n";
        return true;
    }
}

// Тестирование
$user1 = new User("invalid-email", "John");
$user1->save();  // Validation failed

$user2 = new User("john@example.com", "John");
$user2->save();  // User saved: John
```

### Пример 3: Комбинация интерфейсов и трейтов

```php
// Интерфейс определяет контракт
interface Cacheable {
    public function getCacheKey(): string;
    public function getCacheDuration(): int;
}

// Трейт предоставляет реализацию кеширования
trait CacheableTrait {
    private static array $cache = [];
    
    public function cache(): void {
        $key = $this->getCacheKey();
        $duration = $this->getCacheDuration();
        
        self::$cache[$key] = [
            'data' => $this,
            'expires' => time() + $duration
        ];
    }
    
    public static function getFromCache(string $key): ?self {
        if (!isset(self::$cache[$key])) {
            return null;
        }
        
        $cached = self::$cache[$key];
        
        if ($cached['expires'] < time()) {
            unset(self::$cache[$key]);
            return null;
        }
        
        return $cached['data'];
    }
}

class Product implements Cacheable {
    use CacheableTrait;
    
    private int $id;
    private string $name;
    private float $price;
    
    public function __construct(int $id, string $name, float $price) {
        $this->id = $id;
        $this->name = $name;
        $this->price = $price;
    }
    
    public function getCacheKey(): string {
        return "product_{$this->id}";
    }
    
    public function getCacheDuration(): int {
        return 3600; // 1 час
    }
    
    public function getName(): string {
        return $this->name;
    }
}

// Использование
$product = new Product(1, "Laptop", 999.99);
$product->cache();

// Получение из кеша
$cached = Product::getFromCache("product_1");
if ($cached) {
    echo "From cache: " . $cached->getName() . "\n";
}
```

---

## ⚠️ Частые ошибки

### ❌ Ошибка 1: Путать интерфейсы и абстрактные классы

```php
// ❌ Неправильно - пытаемся добавить реализацию в интерфейс
interface Loggable {
    public function log(string $message): void {
        echo $message;  // ОШИБКА! Интерфейсы не могут иметь реализацию
    }
}

// ✅ Правильно - используем абстрактный класс или трейт
trait Loggable {
    public function log(string $message): void {
        echo $message;
    }
}
```

### ❌ Ошибка 2: Не реализовать все методы интерфейса

```php
interface PaymentInterface {
    public function charge(float $amount): bool;
    public function refund(string $id): bool;
}

// ❌ ОШИБКА! Не реализован метод refund()
class StripePayment implements PaymentInterface {
    public function charge(float $amount): bool {
        return true;
    }
    // Забыли refund()
}

// ✅ Правильно
class StripePayment implements PaymentInterface {
    public function charge(float $amount): bool {
        return true;
    }
    
    public function refund(string $id): bool {
        return true;
    }
}
```

### ❌ Ошибка 3: Злоупотребление трейтами

```php
// ❌ Плохо - трейт делает слишком много
trait GodTrait {
    public function log() { /* ... */ }
    public function cache() { /* ... */ }
    public function validate() { /* ... */ }
    public function sendEmail() { /* ... */ }
    public function processPayment() { /* ... */ }
    // ... еще 20 методов
}

// ✅ Правильно - маленькие, специализированные трейты
trait Loggable {
    public function log(string $message): void { /* ... */ }
}

trait Cacheable {
    public function cache(): void { /* ... */ }
}

trait Validatable {
    public function validate(): bool { /* ... */ }
}
```

### ❌ Ошибка 4: Неправильная видимость методов в интерфейсе

```php
// ❌ ОШИБКА! Методы интерфейса всегда public
interface Storable {
    private function save(): bool;  // ОШИБКА!
    protected function load(): bool;  // ОШИБКА!
}

// ✅ Правильно
interface Storable {
    public function save(): bool;
    public function load(): bool;
}
```

---

## 🎯 Практические задания

### Задание 1: Система хранилищ (Интерфейсы)

Создай систему для работы с разными хранилищами данных.

**Требования:**
1. Создай интерфейс `StorageInterface` с методами:
   - `save(string $key, mixed $value): bool`
   - `get(string $key): mixed`
   - `delete(string $key): bool`
   - `exists(string $key): bool`

2. Реализуй три класса:
   - `FileStorage` — хранение в файлах
   - `MemoryStorage` — хранение в массиве
   - `DatabaseStorage` — хранение в базе данных (можешь симулировать)

3. Создай класс `CacheManager`, который работает с любым хранилищем

**Пример использования:**
```php
$fileStorage = new FileStorage('./cache');
$memoryStorage = new MemoryStorage();

$cacheManager = new CacheManager($fileStorage);
$cacheManager->set('user_1', ['name' => 'Alice', 'age' => 25]);
$user = $cacheManager->get('user_1');

// Можно легко поменять хранилище
$cacheManager = new CacheManager($memoryStorage);
```

<details>
<summary>💡 Подсказка</summary>

```php
interface StorageInterface {
    public function save(string $key, mixed $value): bool;
    public function get(string $key): mixed;
    public function delete(string $key): bool;
    public function exists(string $key): bool;
}

class CacheManager {
    private StorageInterface $storage;
    
    public function __construct(StorageInterface $storage) {
        $this->storage = $storage;
    }
    
    public function set(string $key, mixed $value): bool {
        return $this->storage->save($key, $value);
    }
    
    public function get(string $key): mixed {
        return $this->storage->get($key);
    }
}
```
</details>

---

### Задание 2: Active Record с трейтами

Создай базовую систему Active Record используя трейты.

**Требования:**
1. Создай трейт `Timestamps` с полями `created_at`, `updated_at`
2. Создай трейт `SoftDeletes` с полем `deleted_at`
3. Создай трейт `Sluggable` для автоматической генерации slug из названия
4. Создай классы `Post` и `Product`, использующие эти трейты

**Пример использования:**
```php
$post = new Post("Моя первая статья");
echo $post->getSlug();  // moya-pervaya-statya
echo $post->getCreatedAt()->format('Y-m-d');

$post->delete();  // Мягкое удаление
echo $post->isDeleted() ? "Deleted" : "Active";

$post->restore();
```

<details>
<summary>💡 Подсказка</summary>

```php
trait Sluggable {
    private string $slug;
    
    protected function generateSlug(string $text): string {
        $text = mb_strtolower($text);
        $text = preg_replace('/[^a-zа-я0-9\s-]/u', '', $text);
        $text = preg_replace('/\s+/', '-', trim($text));
        return $text;
    }
    
    public function getSlug(): string {
        return $this->slug;
    }
}
```
</details>

---

### Задание 3: Система логирования (Комбинация)

Создай гибкую систему логирования.

**Требования:**
1. Создай интерфейс `LoggerInterface`:
   - `log(string $level, string $message): void`
   - `error(string $message): void`
   - `warning(string $message): void`
   - `info(string $message): void`

2. Создай трейт `LogFormattable` для форматирования сообщений:
   - Добавление временной метки
   - Форматирование уровня (ERROR, WARNING, INFO)

3. Реализуй классы:
   - `FileLogger` — запись в файл
   - `ConsoleLogger` — вывод в консоль
   - `MultiLogger` — логирование сразу в несколько логгеров

**Пример использования:**
```php
$fileLogger = new FileLogger('./app.log');
$consoleLogger = new ConsoleLogger();

$multiLogger = new MultiLogger([$fileLogger, $consoleLogger]);
$multiLogger->error("Database connection failed");
$multiLogger->info("User logged in");

// Вывод: [2025-01-29 10:30:45] [ERROR] Database connection failed
```

---

### Задание 4: ⭐ Продвинутое — Плагинная система

Создай систему плагинов для веб-приложения.

**Требования:**
1. Интерфейс `PluginInterface`:
   - `getName(): string`
   - `getVersion(): string`
   - `install(): void`
   - `uninstall(): void`
   - `activate(): void`
   - `deactivate(): void`

2. Трейт `Hookable` для регистрации хуков (событий):
   - `registerHook(string $hookName, callable $callback): void`
   - `executeHook(string $hookName, array $args = []): void`

3. Реализуй 2-3 плагина (например: SEO плагин, аналитика, спам-фильтр)

4. Класс `PluginManager` для управления плагинами

**Пример использования:**
```php
$manager = new PluginManager();

$seoPlugin = new SeoPlugin();
$analyticsPlugin = new AnalyticsPlugin();

$manager->install($seoPlugin);
$manager->activate($seoPlugin);

$manager->executeHook('before_post_save', ['title' => 'New Post']);
```

---

## 📝 Контрольные вопросы

1. В чем главное отличие интерфейса от абстрактного класса?
2. Можно ли в PHP реализовать несколько интерфейсов одновременно?
3. Что будет, если класс не реализует все методы интерфейса?
4. Зачем нужны трейты, если есть наследование?
5. Можно ли в трейте объявить приватные свойства?
6. Что происходит, если два трейта имеют методы с одинаковым именем?
7. Может ли трейт использовать другой трейт?
8. Когда лучше использовать трейт, а когда интерфейс?
9. Можно ли переопределить метод трейта в классе?
10. Что означает ключевое слово `insteadof` при работе с трейтами?

<details>
<summary>✅ Ответы</summary>

1. Интерфейс — только контракт (что должно быть), абстрактный класс может содержать реализацию
2. Да, через запятую: `class X implements A, B, C`
3. PHP выдаст фатальную ошибку
4. Трейты позволяют избежать дублирования кода и обойти ограничение на множественное наследование
5. Да, трейты могут содержать свойства любой видимости
6. Возникает конфликт, который нужно разрешить с помощью `insteadof` или псевдонимов
7. Да, трейты могут использовать другие трейты
8. Интерфейс для контракта (типизация), трейт для переиспользования кода
9. Да, метод класса имеет приоритет над методом трейта
10. Выбирает конкретную реализацию метода при конфликте трейтов
</details>

---

## 🎓 Что дальше?

Отлично! Теперь ты понимаешь:
- ✅ Как создавать интерфейсы для определения контрактов
- ✅ Как использовать трейты для переиспользования кода
- ✅ Разницу между интерфейсами, трейтами и абстрактными классами
- ✅ Когда что применять в реальных проектах

**Следующая глава:** `Глава 4.4: Магические методы — __construct, __get, __set, __call, __toString и другие`

Там мы изучим "магию" PHP — специальные методы, которые автоматически вызываются в определенных ситуациях и дают невероятную гибкость классам! 🪄