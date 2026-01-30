# Глава 7.3: Стандарты PSR — пишем код как профессионалы

## 🎯 Что ты узнаешь

- Что такое PSR и зачем нужны стандарты кода
- PSR-1 и PSR-12: как форматировать код правильно
- PSR-4: автозагрузка классов (ты уже используешь, но не знал!)
- PSR-7: HTTP-сообщения (готовимся к Laravel)
- Как настроить автоматическую проверку стандартов

---

## 📖 Теория

### Что такое PSR?

**PSR** (PHP Standards Recommendations) — это набор рекомендаций по написанию PHP-кода, разработанных PHP-FIG (PHP Framework Interop Group).

**Зачем это нужно?**

```php
// Представь, что читаешь код из разных проектов:

// Проект 1
class userController {
    function GetUserData($ID) {
        // ...
    }
}

// Проект 2
class User_Controller
{
    public function get_user_data($id)
    {
        // ...
    }
}

// Проект 3
class UserController
{
    public function getUserData(int $id): array
    {
        // ...
    }
}
```

Какой проще читать? Третий! Потому что он следует стандартам.

**Преимущества PSR:**
- ✅ Код из разных проектов выглядит одинаково
- ✅ Новые разработчики быстрее вникают
- ✅ Меньше споров в команде про форматирование
- ✅ Все современные инструменты поддерживают PSR

---

## PSR-1: Базовые стандарты кодирования

### Основные правила

**1. Файлы должны использовать только `<?php` или `<?=`**

```php
// ✅ Правильно
<?php

namespace App;

class User {}

// ❌ Неправильно - короткие теги
<?
echo "Hello";
?>

// ❌ Неправильно - ASP-стиль
<%
echo "Hello";
%>
```

**2. Файлы должны использовать только UTF-8 без BOM**

```php
// В настройках редактора выбери:
// Encoding: UTF-8
// BOM: No BOM (без метки порядка байтов)
```

**3. Имена классов в PascalCase**

```php
// ✅ Правильно
class UserController {}
class BlogPost {}
class OrderItem {}

// ❌ Неправильно
class user_controller {}
class blogPost {}
class order_item {}
```

**4. Константы классов в UPPER_CASE**

```php
class Config
{
    // ✅ Правильно
    const DB_HOST = 'localhost';
    const MAX_UPLOAD_SIZE = 5242880;
    
    // ❌ Неправильно
    const dbHost = 'localhost';
    const maxUploadSize = 5242880;
}
```

**5. Методы в camelCase**

```php
class User
{
    // ✅ Правильно
    public function getUserName() {}
    public function setEmail() {}
    
    // ❌ Неправильно
    public function GetUserName() {}
    public function set_email() {}
}
```

**6. Файл должен либо объявлять символы, либо выполнять действия**

```php
// ❌ Плохо - смешиваем объявление и выполнение
<?php
// Объявляем класс
class User {}

// И тут же выполняем код
$user = new User();
echo "Hello!";

// ✅ Хорошо - только объявление
<?php
namespace App;

class User {}

// ✅ Хорошо - только выполнение (в другом файле)
<?php
require 'User.php';
$user = new User();
```

---

## PSR-12: Расширенные стандарты кодирования

PSR-12 заменил устаревший PSR-2 и детально описывает форматирование.

### 1. Отступы и пробелы

```php
// ✅ Используй 4 пробела (не табы!)
class User
{
    private string $name;
    
    public function __construct(string $name)
    {
        $this->name = $name;
    }
}

// ❌ Не используй табы
class User
{
	private string $name; // это таб!
}
```

**Настрой VS Code:**
```json
// settings.json
{
    "editor.insertSpaces": true,
    "editor.tabSize": 4
}
```

### 2. Объявление классов

```php
// ✅ Правильно
<?php

namespace App\Models;

use App\Contracts\UserInterface;
use App\Traits\Timestampable;

class User extends Model implements UserInterface
{
    use Timestampable;
    
    // Свойства и методы
}

// ❌ Неправильно - всё на одной строке
class User extends Model implements UserInterface {
    use Timestampable;
}
```

**Правила:**
- Открывающая скобка `{` класса — на новой строке
- Одна пустая строка после `namespace`
- Одна пустая строка после блока `use`
- `extends` и `implements` на той же строке

### 3. Методы и функции

```php
class OrderService
{
    // ✅ Правильно
    public function createOrder(
        User $user,
        array $items,
        ?string $coupon = null
    ): Order {
        // код
    }
    
    // ❌ Неправильно - скобка не на новой строке
    public function createOrder(User $user) {
        // код
    }
    
    // ✅ Правильно - много параметров
    public function sendNotification(
        User $user,
        string $subject,
        string $message,
        array $attachments = [],
        bool $isUrgent = false
    ): bool {
        // Каждый параметр на новой строке
        // Закрывающая скобка с типом возврата
        return true;
    }
}
```

**Правила:**
- Открывающая скобка `{` метода — на новой строке
- Пробел после запятой в параметрах
- Если параметров много — каждый на новой строке

### 4. Управляющие конструкции

```php
// ✅ if/else
if ($user->isActive()) {
    // Один пробел после if
    // Скобка на той же строке
    $this->sendWelcome();
} elseif ($user->isPending()) {
    // elseif слитно
    $this->sendConfirmation();
} else {
    $this->sendReactivation();
}

// ✅ foreach
foreach ($users as $user) {
    echo $user->name;
}

// ✅ while
while ($result = $stmt->fetch()) {
    $this->process($result);
}

// ✅ switch
switch ($status) {
    case 'active':
        $this->activate();
        break;
        
    case 'pending':
        $this->notify();
        break;
        
    default:
        $this->log();
        break;
}

// ❌ Неправильно
if($user->isActive()){  // нет пробелов
    $this->send();
}
```

### 5. Try-Catch

```php
// ✅ Правильно
try {
    $this->processPayment();
} catch (PaymentException $e) {
    $this->logError($e);
    throw $e;
} catch (Exception $e) {
    $this->handleGenericError($e);
} finally {
    $this->cleanup();
}
```

### 6. Анонимные функции (Closures)

```php
// ✅ Правильно
$users = array_filter($users, function (User $user) {
    return $user->isActive();
});

// ✅ С use
$status = 'active';
$filtered = array_filter($users, function ($user) use ($status) {
    return $user->status === $status;
});

// ✅ Много параметров
$result = array_map(
    function (
        User $user,
        int $index
    ) use ($multiplier) {
        return $user->score * $multiplier;
    },
    $users,
    array_keys($users)
);
```

### 7. Цепочки вызовов

```php
// ✅ Правильно
$users = User::query()
    ->where('status', 'active')
    ->where('age', '>', 18)
    ->orderBy('created_at', 'desc')
    ->limit(10)
    ->get();

// ❌ Неправильно
$users = User::query()->where('status', 'active')->where('age', '>', 18)->get();
```

---

## PSR-4: Автозагрузка

Ты уже используешь PSR-4 через Composer! Давай разберёмся, как это работает.

### Основное правило

**Пространство имён = структура папок**

```php
// Структура проекта
src/
├── Controllers/
│   ├── UserController.php
│   └── Admin/
│       └── DashboardController.php
├── Models/
│   └── User.php
└── Services/
    └── EmailService.php
```

```php
// src/Controllers/UserController.php
<?php

namespace App\Controllers;  // App\Controllers = src/Controllers/

class UserController
{
    // ...
}

// src/Controllers/Admin/DashboardController.php
<?php

namespace App\Controllers\Admin;  // App\Controllers\Admin = src/Controllers/Admin/

class DashboardController
{
    // ...
}
```

### Настройка в composer.json

```json
{
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        }
    }
}
```

**Что это значит:**
- Префикс `App\` соответствует папке `src/`
- `App\Controllers\UserController` → `src/Controllers/UserController.php`
- `App\Models\User` → `src/Models/User.php`

### Полный пример

```json
{
    "name": "myapp/shop",
    "autoload": {
        "psr-4": {
            "App\\": "src/",
            "Database\\": "database/",
            "Tests\\": "tests/"
        }
    }
}
```

Теперь ты можешь использовать:

```php
<?php

require 'vendor/autoload.php';

use App\Controllers\UserController;
use App\Models\User;
use Database\Seeders\UserSeeder;

$controller = new UserController();
$user = new User();
$seeder = new UserSeeder();
```

**Composer автоматически найдёт файлы!**

---

## PSR-7: HTTP Message Interface

PSR-7 описывает, как представлять HTTP-запросы и ответы в виде объектов. Laravel использует эти концепции!

### Концепция

```php
// Вместо глобальных переменных
$name = $_GET['name'];
$email = $_POST['email'];
header('Content-Type: application/json');

// Используем объекты
$name = $request->query('name');
$email = $request->post('email');
$response = $response->withHeader('Content-Type', 'application/json');
```

### Структура PSR-7

```php
// RequestInterface
interface RequestInterface extends MessageInterface
{
    public function getMethod(): string;
    public function getUri(): UriInterface;
    public function getQueryParams(): array;
    // ...
}

// ResponseInterface
interface ResponseInterface extends MessageInterface
{
    public function getStatusCode(): int;
    public function withStatus(int $code, string $reasonPhrase = ''): self;
    // ...
}
```

### Как это используется в Laravel

```php
// Laravel Request (основан на PSR-7 идеях)
public function store(Request $request)
{
    // Получение данных
    $name = $request->input('name');
    $email = $request->input('email');
    
    // Валидация
    $validated = $request->validate([
        'name' => 'required|string',
        'email' => 'required|email',
    ]);
    
    // Возврат ответа
    return response()->json([
        'message' => 'User created'
    ], 201);
}
```

**Преимущества объектного подхода:**
- ✅ Тестируемость — можно создать фейковый запрос
- ✅ Неизменяемость — методы `with*()` возвращают новый объект
- ✅ Типизация — IDE подсказывает методы
- ✅ Композиция — можно добавлять middleware

---

## 🛠️ Практика: Проверка и исправление кода

### PHP_CodeSniffer

**Установка:**

```bash
composer require --dev squizlabs/php_codesniffer
```

**Проверка кода:**

```bash
# Проверить файл
vendor/bin/phpcs src/Controllers/UserController.php

# Проверить папку
vendor/bin/phpcs src/

# Указать стандарт
vendor/bin/phpcs --standard=PSR12 src/
```

**Автоматическое исправление:**

```bash
vendor/bin/phpcbf src/
```

### PHP-CS-Fixer (более продвинутый)

**Установка:**

```bash
composer require --dev friendsofphp/php-cs-fixer
```

**Создай файл `.php-cs-fixer.php`:**

```php
<?php

$finder = PhpCsFixer\Finder::create()
    ->in(__DIR__ . '/src')
    ->in(__DIR__ . '/tests');

return (new PhpCsFixer\Config())
    ->setRules([
        '@PSR12' => true,
        'array_syntax' => ['syntax' => 'short'],
        'ordered_imports' => ['sort_algorithm' => 'alpha'],
        'no_unused_imports' => true,
        'not_operator_with_successor_space' => true,
        'trailing_comma_in_multiline' => true,
        'blank_line_after_opening_tag' => true,
    ])
    ->setFinder($finder);
```

**Запуск:**

```bash
vendor/bin/php-cs-fixer fix
```

### Настройка VS Code

**Установи расширения:**
- PHP Intelephense
- PHP CS Fixer
- EditorConfig

**Создай `.editorconfig`:**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.php]
indent_style = space
indent_size = 4

[*.{json,yml,yaml}]
indent_size = 2
```

**Настрой `settings.json`:**

```json
{
    "editor.formatOnSave": true,
    "php-cs-fixer.executablePath": "${workspaceFolder}/vendor/bin/php-cs-fixer",
    "php-cs-fixer.onsave": true,
    "php-cs-fixer.rules": "@PSR12"
}
```

---

## 💡 Реальный пример: До и После

### До (без стандартов)

```php
<?php
class user_controller{
private $db;
function __construct($database) {
$this->db=$database;
}
public function getuser($ID){
$query="SELECT * FROM users WHERE id=".$ID;
$result=$this->db->query($query);
if($result){
return $result->fetch_assoc();
}else{
return null;
}
}
public function Create_User($data){
$name=$data['name'];
$email=$data['email'];
$query="INSERT INTO users (name, email) VALUES ('$name', '$email')";
return $this->db->query($query);
}
}
?>
```

### После (PSR-1, PSR-12, PSR-4)

```php
<?php

namespace App\Controllers;

use App\Database\Database;
use App\Models\User;

class UserController
{
    private Database $db;

    public function __construct(Database $database)
    {
        $this->db = $database;
    }

    public function getUser(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM users WHERE id = :id'
        );
        $stmt->execute(['id' => $id]);
        
        $result = $stmt->fetch();
        
        return $result ?: null;
    }

    public function createUser(array $data): bool
    {
        $stmt = $this->db->prepare(
            'INSERT INTO users (name, email) VALUES (:name, :email)'
        );
        
        return $stmt->execute([
            'name' => $data['name'],
            'email' => $data['email'],
        ]);
    }
}
```

**Что изменилось:**
- ✅ PSR-4: правильный namespace
- ✅ PSR-1: `PascalCase` для класса, `camelCase` для методов
- ✅ PSR-12: правильные отступы, пробелы, переносы строк
- ✅ Типизация: `int $id`, `: ?array`
- ✅ Prepared statements вместо конкатенации
- ✅ Читаемость: код понятен с первого взгляда

---

## 📝 Упражнения

### Упражнение 1: Найди нарушения

```php
<?php
class Product_Manager {
private $database;
const default_status = 'active';

public function __construct($db){
$this->database = $db;
}

public function Get_Product($ID) {
$query = "SELECT * FROM products WHERE id = " . $ID;
return $this->database->query($query);
}

public function update_price($id,$new_price){
$query="UPDATE products SET price=$new_price WHERE id=$id";
$this->database->query($query);
}
}
```

**Задание:** Перепиши класс, исправив все нарушения PSR-1 и PSR-12.

### Упражнение 2: Структура проекта

Создай структуру для интернет-магазина:

```
/shop
├── src/
│   ├── Controllers/
│   ├── Models/
│   ├── Services/
│   └── Repositories/
├── composer.json
└── index.php
```

**Задание:**
1. Настрой PSR-4 автозагрузку в `composer.json`
2. Создай классы:
   - `App\Controllers\ProductController`
   - `App\Models\Product`
   - `App\Services\PaymentService`
   - `App\Repositories\ProductRepository`
3. Используй их в `index.php`

### Упражнение 3: Автоисправление

**Задание:**
1. Установи PHP-CS-Fixer
2. Создай конфигурацию `.php-cs-fixer.php`
3. Запусти на коде из Упражнения 1
4. Сравни результат

---

## 🎓 Практическое задание

### Задача: Рефакторинг системы управления заказами

Тебе дали старый код:

```php
<?php
class order_system {
public function process($order_id){
global $db;
$q = "SELECT * FROM orders WHERE id=$order_id";
$order = $db->query($q)->fetch_assoc();
if($order['status']=='pending'){
$q2="UPDATE orders SET status='processing' WHERE id=".$order_id;
$db->query($q2);
$this->send_email($order['user_email'],'Order processing');
return true;
}
return false;
}
function send_email($to,$subj){
mail($to,$subj,'Your order is being processed');
}
}
?>
```

**Твоя задача:**

1. **Создай правильную структуру:**
   ```
   src/
   ├── Controllers/
   │   └── OrderController.php
   ├── Services/
   │   ├── OrderService.php
   │   └── EmailService.php
   ├── Repositories/
   │   └── OrderRepository.php
   └── Models/
       └── Order.php
   ```

2. **Разбей на классы по SOLID:**
   - `OrderRepository` — работа с БД
   - `EmailService` — отправка email
   - `OrderService` — бизнес-логика
   - `OrderController` — точка входа

3. **Примени все PSR стандарты:**
   - PSR-1: правильные имена
   - PSR-12: форматирование
   - PSR-4: namespace и автозагрузка

4. **Добавь типизацию:**
   - Параметры методов
   - Возвращаемые значения
   - Свойства классов

5. **Проверь через PHP_CodeSniffer**

**Критерии успеха:**
- ✅ `phpcs --standard=PSR12` не находит ошибок
- ✅ Код можно автозагружать через Composer
- ✅ Каждый класс отвечает за одну задачу
- ✅ Используются prepared statements
- ✅ Все методы типизированы

---

## 📚 Чек-лист PSR для ежедневной работы

### PSR-1

- [ ] Используешь только `<?php`
- [ ] Файлы в UTF-8 без BOM
- [ ] Классы в `PascalCase`
- [ ] Методы в `camelCase`
- [ ] Константы в `UPPER_CASE`
- [ ] Файл либо объявляет, либо выполняет — не оба

### PSR-12

- [ ] 4 пробела для отступов (не табы)
- [ ] Открывающая `{` класса/метода на новой строке
- [ ] Пробел после ключевых слов (`if `, `foreach `)
- [ ] Нет пробела перед `(` в вызове функции
- [ ] Пустая строка после `namespace` и `use`
- [ ] Каждый `use` на отдельной строке

### PSR-4

- [ ] Namespace соответствует структуре папок
- [ ] Настроен `autoload` в `composer.json`
- [ ] Выполнил `composer dump-autoload`
- [ ] Один класс = один файл
- [ ] Имя файла = имя класса

---

## 🚀 Следующий шаг

Теперь ты знаешь, как писать код, который:
- ✅ Выглядит профессионально
- ✅ Легко читается другими разработчиками
- ✅ Автоматически загружается
- ✅ Проходит проверки линтеров
- ✅ Соответствует стандартам индустрии

**В следующей главе:** переходим к Laravel! Теперь ты готов понять, как фреймворк устроен изнутри, потому что знаешь все основы.

---

## 💭 Частые вопросы

**Q: Обязательно ли следовать PSR?**
A: Не обязательно, но очень желательно. Все популярные фреймворки (Laravel, Symfony) и библиотеки используют PSR. Если хочешь работать в команде или с open-source — без PSR не обойтись.

**Q: PSR-2 или PSR-12?**
A: PSR-12! PSR-2 устарел. PSR-12 — это расширенная и обновлённая версия.

**Q: Как заставить команду следовать PSR?**
A: Добавь автоматические проверки:
- Git hooks (pre-commit)
- CI/CD пайплайн
- Автоформатирование в IDE

**Q: А что если у нас другой code style?**
A: Главное — консистентность. Но если начинаешь новый проект — бери PSR, это стандарт индустрии.

**Q: Табы или пробелы?**
A: Пробелы. PSR-12 чётко говорит: 4 пробела. Точка.

---

**Готов к Laravel? Идём дальше! 🚀**