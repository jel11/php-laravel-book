# Глава 4.5: Namespaces и автозагрузка — PSR-4, Composer, прощай require

## Введение: Почему это важно

Представь, что ты пишешь приложение, которое растет. У тебя уже 50 классов в разных файлах. И в начале каждого скрипта ты видишь это:

```php
require_once 'models/User.php';
require_once 'models/Product.php';
require_once 'models/Order.php';
require_once 'controllers/UserController.php';
require_once 'controllers/ProductController.php';
require_once 'helpers/Validator.php';
require_once 'helpers/Sanitizer.php';
// ... еще 43 строки
```

Это кошмар. Забыл подключить один файл — получил ошибку. Переименовал папку — надо менять все пути. Два разработчика создали класс `Validator` в разных местах — конфликт имен.

**Namespaces и автозагрузка решают эти проблемы раз и навсегда.**

---

## Часть 1: Namespaces (пространства имен)

### Проблема: конфликт имен

```php
// файл: app/Models/User.php
class User {
    public function login() {
        return "Логин пользователя";
    }
}

// файл: app/Admin/User.php
class User {
    public function login() {
        return "Логин администратора";
    }
}

// index.php
require 'app/Models/User.php';
require 'app/Admin/User.php'; // ОШИБКА! Cannot redeclare class User
```

PHP не позволяет иметь два класса с одинаковым именем.

### Решение: пространства имен

```php
// файл: app/Models/User.php
namespace App\Models;

class User {
    public function login() {
        return "Логин пользователя";
    }
}

// файл: app/Admin/User.php
namespace App\Admin;

class User {
    public function login() {
        return "Логин администратора";
    }
}

// index.php
require 'app/Models/User.php';
require 'app/Admin/User.php';

$regularUser = new \App\Models\User();
$adminUser = new \App\Admin\User();

echo $regularUser->login(); // Логин пользователя
echo $adminUser->login();   // Логин администратора
```

**Namespace — это способ организовать код в логические группы и избежать конфликтов имен.**

### Правила namespace

```php
<?php
// 1. Namespace должен быть ПЕРВОЙ строкой после <?php (кроме declare)
namespace App\Models;

// 2. Используй обратный слеш для разделения
namespace App\Controllers\Admin;

// 3. Namespace соответствует структуре папок (это конвенция PSR-4)
// App\Controllers\Admin\UserController -> app/Controllers/Admin/UserController.php
```

### Использование классов из других namespace

```php
namespace App\Controllers;

// Способ 1: Полное имя (Fully Qualified Name)
$user = new \App\Models\User();

// Способ 2: Use-импорт (рекомендуется)
use App\Models\User;
$user = new User();

// Способ 3: Use с алиасом (если есть конфликт)
use App\Models\User as ModelUser;
use App\Admin\User as AdminUser;

$regular = new ModelUser();
$admin = new AdminUser();

// Можно импортировать несколько классов из одного namespace
use App\Models\{User, Product, Order};

// Импорт функций и констант
use function App\Helpers\sanitize;
use const App\Config\DB_HOST;
```

### Относительные namespace

```php
namespace App\Controllers;

use App\Models\User;        // Абсолютный путь
use Models\Product;         // НЕПРАВИЛЬНО! Будет искать App\Controllers\Models\Product

// Для текущего namespace используй __NAMESPACE__
echo __NAMESPACE__; // App\Controllers
```

---

## Часть 2: Автозагрузка (Autoloading)

### Проблема: ручные require

Даже с namespace'ами нам все еще нужны require:

```php
require 'app/Models/User.php';
require 'app/Models/Product.php';
require 'app/Controllers/UserController.php';
// ...
```

### Решение: spl_autoload_register

PHP умеет автоматически подключать файлы, когда ты обращаешься к классу.

```php
// autoload.php
spl_autoload_register(function ($class) {
    // $class будет полным именем класса, например: App\Models\User
    
    // Преобразуем namespace в путь к файлу
    // App\Models\User -> App/Models/User.php
    $file = str_replace('\\', '/', $class) . '.php';
    
    if (file_exists($file)) {
        require $file;
    }
});

// index.php
require 'autoload.php';

// Теперь это работает БЕЗ дополнительных require!
use App\Models\User;
use App\Controllers\UserController;

$user = new User();           // Автоматически загрузит app/Models/User.php
$controller = new UserController(); // Автоматически загрузит app/Controllers/UserController.php
```

**Как это работает:**

1. PHP видит `new User()`
2. Класс User не загружен
3. PHP вызывает все зарегистрированные autoload-функции
4. Функция получает полное имя класса (`App\Models\User`)
5. Преобразует его в путь (`app/Models/User.php`)
6. Подключает файл
7. Создает объект

### PSR-4 стандарт автозагрузки

PSR-4 — это стандарт, который описывает, как должны соотноситься namespace'ы и файловая структура.

**Правила PSR-4:**

```
Namespace Prefix     | Base Directory
---------------------|------------------------
App\Models\          | src/Models/
App\Controllers\     | src/Controllers/
Vendor\Package\      | vendor/vendor-name/package/src/
```

**Пример PSR-4 автозагрузчика:**

```php
// autoload.php
spl_autoload_register(function ($class) {
    // Базовая директория для namespace prefix
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/src/';
    
    // Проверяем, использует ли класс наш prefix
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return; // Не наш класс, пропускаем
    }
    
    // Получаем относительное имя класса
    $relativeClass = substr($class, $len);
    
    // Заменяем namespace separator на directory separator
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    
    // Если файл существует, подключаем его
    if (file_exists($file)) {
        require $file;
    }
});
```

**Структура проекта с PSR-4:**

```
project/
├── src/
│   ├── Models/
│   │   ├── User.php          (namespace App\Models)
│   │   └── Product.php
│   ├── Controllers/
│   │   ├── UserController.php (namespace App\Controllers)
│   │   └── ProductController.php
│   └── Helpers/
│       └── Validator.php
├── public/
│   └── index.php
└── autoload.php
```

---

## Часть 3: Composer — автозагрузка на стероидах

### Что такое Composer

**Composer** — это менеджер зависимостей для PHP. Он:
- Устанавливает сторонние библиотеки
- Автоматически генерирует автозагрузчик для всего проекта
- Управляет версиями пакетов
- Следует PSR-4 стандарту

### Установка Composer

```bash
# Linux/Mac
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Проверка
composer --version
```

### Создание composer.json

```bash
cd your-project
composer init
```

Или создай вручную:

```json
{
    "name": "your-name/your-project",
    "description": "Описание проекта",
    "type": "project",
    "require": {
        "php": "^8.0"
    },
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        }
    }
}
```

**Это означает:** все классы с namespace `App\*` находятся в папке `src/`

### Генерация автозагрузчика

```bash
composer dump-autoload
```

Composer создаст папку `vendor/` с файлом `vendor/autoload.php`:

```php
// public/index.php
<?php

require __DIR__ . '/../vendor/autoload.php';

// Теперь все классы из App\ автоматически загружаются!
use App\Models\User;
use App\Controllers\UserController;

$user = new User();
$controller = new UserController();
```

### Реальный пример структуры проекта

```
my-project/
├── src/
│   ├── Models/
│   │   ├── User.php
│   │   └── Product.php
│   ├── Controllers/
│   │   ├── UserController.php
│   │   └── ProductController.php
│   └── Services/
│       └── EmailService.php
├── public/
│   └── index.php
├── vendor/              (создается Composer'ом)
│   ├── autoload.php     (главный файл автозагрузки)
│   └── composer/
├── composer.json
└── composer.lock
```

**src/Models/User.php:**

```php
<?php
namespace App\Models;

class User {
    private string $name;
    private string $email;
    
    public function __construct(string $name, string $email) {
        $this->name = $name;
        $this->email = $email;
    }
    
    public function getName(): string {
        return $this->name;
    }
}
```

**src/Controllers/UserController.php:**

```php
<?php
namespace App\Controllers;

use App\Models\User;

class UserController {
    public function create(string $name, string $email): User {
        return new User($name, $email);
    }
}
```

**public/index.php:**

```php
<?php

require __DIR__ . '/../vendor/autoload.php';

use App\Controllers\UserController;

$controller = new UserController();
$user = $controller->create('Джелл', 'jell@example.com');

echo "Пользователь: " . $user->getName();
```

Запуск:

```bash
php -S localhost:8000 -t public
```

---

## Часть 4: Установка сторонних пакетов

### Поиск пакетов

Заходим на [packagist.org](https://packagist.org) — центральный репозиторий PHP-пакетов.

Популярные пакеты:
- `vlucas/phpdotenv` — работа с .env файлами
- `monolog/monolog` — логирование
- `guzzlehttp/guzzle` — HTTP-клиент
- `symfony/var-dumper` — красивый dump()

### Установка пакета

```bash
composer require vlucas/phpdotenv
```

Composer:
1. Скачает пакет в `vendor/`
2. Обновит `composer.json`
3. Обновит автозагрузчик
4. Создаст `composer.lock` (точные версии для всей команды)

### Использование пакета

```php
<?php

require __DIR__ . '/vendor/autoload.php';

// Пакет автоматически доступен!
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

echo $_ENV['DB_HOST'];
```

### Версии пакетов

```json
{
    "require": {
        "monolog/monolog": "^3.0",      // >= 3.0.0, < 4.0.0
        "guzzlehttp/guzzle": "~7.5",    // >= 7.5.0, < 7.6.0
        "symfony/var-dumper": "7.0.*",  // >= 7.0.0, < 7.1.0
        "nesbot/carbon": "2.72.0"       // точная версия
    }
}
```

### Dev-зависимости

```bash
composer require --dev phpunit/phpunit
```

```json
{
    "require": {
        "monolog/monolog": "^3.0"
    },
    "require-dev": {
        "phpunit/phpunit": "^10.0"
    }
}
```

Dev-зависимости не устанавливаются на production:

```bash
composer install --no-dev
```

---

## Часть 5: Продвинутая автозагрузка

### Classmap — для старого кода

```json
{
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        },
        "classmap": [
            "legacy/"
        ]
    }
}
```

Composer проскандирует папку `legacy/` и создаст карту всех классов.

### Files — автоматическая загрузка функций

```json
{
    "autoload": {
        "files": [
            "src/helpers.php"
        ]
    }
}
```

**src/helpers.php:**

```php
<?php

function dd($var) {
    var_dump($var);
    die();
}

function env(string $key, $default = null) {
    return $_ENV[$key] ?? $default;
}
```

Эти функции будут доступны глобально после `require vendor/autoload.php`.

### PSR-0 (устарело, но встречается)

```json
{
    "autoload": {
        "psr-0": {
            "Vendor_": "src/"
        }
    }
}
```

PSR-0 использовал underscore для разделения: `Vendor_Package_Class` → `Vendor/Package/Class.php`

**Всегда используй PSR-4 для новых проектов.**

---

## Часть 6: Практика — создание мини-фреймворка

### Структура проекта

```
mini-framework/
├── src/
│   ├── Core/
│   │   ├── Router.php
│   │   └── Request.php
│   ├── Controllers/
│   │   └── HomeController.php
│   └── Models/
│       └── User.php
├── public/
│   └── index.php
├── composer.json
└── .gitignore
```

### composer.json

```json
{
    "name": "jell/mini-framework",
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        }
    },
    "require": {
        "php": "^8.0"
    }
}
```

### src/Core/Router.php

```php
<?php
namespace App\Core;

class Router {
    private array $routes = [];
    
    public function get(string $path, callable $handler): void {
        $this->routes['GET'][$path] = $handler;
    }
    
    public function post(string $path, callable $handler): void {
        $this->routes['POST'][$path] = $handler;
    }
    
    public function dispatch(Request $request): void {
        $method = $request->method();
        $path = $request->path();
        
        if (!isset($this->routes[$method][$path])) {
            http_response_code(404);
            echo "404 Not Found";
            return;
        }
        
        $handler = $this->routes[$method][$path];
        $handler($request);
    }
}
```

### src/Core/Request.php

```php
<?php
namespace App\Core;

class Request {
    public function method(): string {
        return $_SERVER['REQUEST_METHOD'];
    }
    
    public function path(): string {
        $path = $_SERVER['REQUEST_URI'] ?? '/';
        $position = strpos($path, '?');
        
        if ($position !== false) {
            $path = substr($path, 0, $position);
        }
        
        return $path;
    }
    
    public function input(string $key, $default = null) {
        return $_POST[$key] ?? $_GET[$key] ?? $default;
    }
}
```

### src/Controllers/HomeController.php

```php
<?php
namespace App\Controllers;

use App\Core\Request;
use App\Models\User;

class HomeController {
    public function index(Request $request): void {
        echo "<h1>Главная страница</h1>";
        echo "<p>Привет из HomeController!</p>";
    }
    
    public function about(Request $request): void {
        $user = new User('Джелл', 'jell@example.com');
        echo "<h1>О нас</h1>";
        echo "<p>Пользователь: " . $user->getName() . "</p>";
    }
}
```

### src/Models/User.php

```php
<?php
namespace App\Models;

class User {
    private string $name;
    private string $email;
    
    public function __construct(string $name, string $email) {
        $this->name = $name;
        $this->email = $email;
    }
    
    public function getName(): string {
        return $this->name;
    }
}
```

### public/index.php

```php
<?php

require __DIR__ . '/../vendor/autoload.php';

use App\Core\Router;
use App\Core\Request;
use App\Controllers\HomeController;

$router = new Router();
$request = new Request();

$controller = new HomeController();

$router->get('/', [$controller, 'index']);
$router->get('/about', [$controller, 'about']);

$router->dispatch($request);
```

### Запуск

```bash
composer dump-autoload
php -S localhost:8000 -t public
```

Открой:
- `http://localhost:8000/` → вызовет HomeController::index()
- `http://localhost:8000/about` → вызовет HomeController::about()

**Обрати внимание:** ни одного `require` в коде! Все классы загружаются автоматически.

---

## Часть 7: Частые ошибки и решения

### Ошибка 1: Namespace не совпадает с папкой

```php
// Файл: src/Controllers/UserController.php
namespace App\Models; // НЕПРАВИЛЬНО!

class UserController {}
```

**Решение:** Namespace должен соответствовать пути:

```php
namespace App\Controllers;
```

### Ошибка 2: Забыл composer dump-autoload

После изменения `composer.json` нужно:

```bash
composer dump-autoload
```

### Ошибка 3: Неправильный case в имени файла

PSR-4 чувствителен к регистру:

```
❌ src/models/user.php
✅ src/Models/User.php
```

### Ошибка 4: Use без ведущего слеша для глобальных классов

```php
namespace App\Controllers;

use DateTime; // ✅ Правильно
// vs
use \DateTime; // ✅ Тоже правильно, но избыточно

// НЕПРАВИЛЬНО:
$date = new \App\Controllers\DateTime(); // Будет искать в текущем namespace
```

### Ошибка 5: Циклические зависимости

```php
// User.php
use App\Models\Post;

class User {
    public function posts(): array {
        return Post::getByUser($this);
    }
}

// Post.php
use App\Models\User;

class Post {
    public function author(): User {
        return User::find($this->userId);
    }
}
```

Это работает с автозагрузкой, но создает плотную связь. Решение — использовать интерфейсы или Dependency Injection (следующая глава).

---

## Часть 8: composer.json — полный разбор

```json
{
    "name": "vendor/package-name",
    "description": "Описание проекта",
    "type": "project",
    "license": "MIT",
    "authors": [
        {
            "name": "Твоё имя",
            "email": "email@example.com"
        }
    ],
    "require": {
        "php": "^8.0",
        "monolog/monolog": "^3.0"
    },
    "require-dev": {
        "phpunit/phpunit": "^10.0"
    },
    "autoload": {
        "psr-4": {
            "App\\": "src/",
            "Database\\": "database/"
        },
        "files": [
            "src/helpers.php"
        ]
    },
    "autoload-dev": {
        "psr-4": {
            "Tests\\": "tests/"
        }
    },
    "scripts": {
        "test": "phpunit",
        "start": "php -S localhost:8000 -t public"
    },
    "config": {
        "optimize-autoloader": true,
        "preferred-install": "dist",
        "sort-packages": true
    }
}
```

### Полезные команды Composer

```bash
composer install          # Установить все зависимости
composer update           # Обновить зависимости
composer require pkg/name # Добавить пакет
composer remove pkg/name  # Удалить пакет
composer dump-autoload    # Пересоздать автозагрузчик
composer show              # Показать установленные пакеты
composer outdated         # Показать устаревшие пакеты
composer run test         # Запустить скрипт из scripts
```

---

## Упражнения

### Уровень 1: Базовые namespace

**Задание 1:** Создай структуру:

```
exercise1/
├── Animals/
│   ├── Cat.php (namespace Animals)
│   └── Dog.php (namespace Animals)
└── index.php
```

Создай классы Cat и Dog с методом `speak()`. Подключи их вручную и создай объекты.

**Задание 2:** Добавь namespace `Animals\Wild` и класс `Lion`. Используй use для импорта всех трех классов.

### Уровень 2: Автозагрузка вручную

**Задание 3:** Создай собственный автозагрузчик для структуры:

```
exercise2/
├── src/
│   ├── Services/
│   │   └── Logger.php (namespace App\Services)
│   └── Models/
│       └── Product.php (namespace App\Models)
├── autoload.php
└── index.php
```

Реализуй PSR-4 автозагрузчик в `autoload.php`.

### Уровень 3: Composer

**Задание 4:** Создай проект с Composer:

```bash
mkdir my-shop
cd my-shop
composer init
```

Настрой PSR-4 автозагрузку для namespace `Shop\` → `src/`

**Задание 5:** Установи пакет `nesbot/carbon` и используй его для вывода текущей даты:

```php
use Carbon\Carbon;
echo Carbon::now()->format('d.m.Y H:i:s');
```

### Уровень 4: Мини-проект

**Задание 6:** Создай систему управления задачами:

```
todo-app/
├── src/
│   ├── Models/
│   │   └── Task.php
│   ├── Services/
│   │   └── TaskService.php
│   └── Controllers/
│       └── TaskController.php
├── public/
│   └── index.php
├── composer.json
└── .gitignore
```

**Task.php:**

```php
namespace App\Models;

class Task {
    public function __construct(
        public string $title,
        public bool $completed = false
    ) {}
}
```

**TaskService.php:**

```php
namespace App\Services;

use App\Models\Task;

class TaskService {
    private array $tasks = [];
    
    public function add(Task $task): void {
        $this->tasks[] = $task;
    }
    
    public function getAll(): array {
        return $this->tasks;
    }
}
```

**TaskController.php:**

```php
namespace App\Controllers;

use App\Services\TaskService;
use App\Models\Task;

class TaskController {
    public function __construct(
        private TaskService $service
    ) {}
    
    public function index(): void {
        // Выводим все задачи
        foreach ($this->service->getAll() as $task) {
            echo "- " . $task->title . "\n";
        }
    }
}
```

Настрой автозагрузку и создай несколько задач в `index.php`.

---

## Проверь себя

1. **Что такое namespace и зачем он нужен?**
2. **В чем разница между `use App\Models\User` и `new \App\Models\User()`?**
3. **Как работает `spl_autoload_register`?**
4. **Что означает правило PSR-4: `"App\\" => "src/"`?**
5. **Зачем нужен `composer dump-autoload`?**
6. **В чем разница между `require` и `require-dev` в composer.json?**
7. **Можно ли иметь несколько namespace в одном файле?** (Спойлер: технически да, но не делай так)
8. **Что происходит, если класс не найден автозагрузчиком?**

---

## Резюме

✅ **Namespace** решает проблему конфликта имен  
✅ **Автозагрузка** избавляет от ручных require  
✅ **PSR-4** — стандарт соответствия namespace и файловой структуры  
✅ **Composer** — автоматизирует автозагрузку и управление зависимостями  
✅ Больше никаких `require_once` в начале файлов

**Следующий шаг:** Глава 4.6 — Принципы SOLID. Теперь, когда ты умеешь правильно организовывать код, узнаем, как писать его так, чтобы через год не захотелось все переписать.