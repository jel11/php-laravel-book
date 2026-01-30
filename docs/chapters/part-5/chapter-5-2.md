# Глава 5.2: Front Controller и роутинг — единая точка входа, как URL превращается в вызов функции

## Введение: Проблема множественных точек входа

Вспомните первые PHP-проекты: для каждой страницы нужен был отдельный файл. Хотите страницу пользователя? Создаём `user.php`. Нужен список товаров? Делаем `products.php`. А если нужно добавить проверку авторизации на все страницы? Придётся править каждый файл!

**Front Controller** решает эту проблему радикально: **весь трафик идёт через один файл**. Это основа всех современных фреймворков.

---

## Как работали старые PHP-приложения

### Множественные точки входа

```
/public
  ├── index.php          → главная
  ├── about.php          → о нас
  ├── products.php       → каталог
  ├── product.php?id=5   → товар
  ├── login.php          → вход
  └── admin
      ├── index.php      → админка
      └── users.php      → пользователи
```

**Проблемы этого подхода:**

```php
// Каждый файл дублирует логику
<?php
// login.php
session_start();
require_once 'config.php';
require_once 'functions.php';
// ... логика авторизации

// products.php
session_start();
require_once 'config.php';
require_once 'functions.php';
// ... логика каталога

// admin/users.php
session_start();
require_once '../config.php';
require_once '../functions.php';
if (!isAdmin()) {
    header('Location: /login.php');
    exit;
}
// ... логика админки
```

❌ **Что не так:**
- Код инициализации дублируется
- Сложно добавить общую логику (логирование, CSRF-защиту)
- Проблемы с путями при вложенности
- URL жёстко привязан к файловой структуре

---

## Паттерн Front Controller

### Концепция

**Все запросы** идут через **один файл** (обычно `index.php`), который:
1. Инициализирует приложение
2. Определяет, какой контроллер вызвать
3. Передаёт управление нужному контроллеру
4. Возвращает ответ

```
Пользователь → /users/profile
             ↓
        index.php (Front Controller)
             ↓
        Роутер анализирует URL
             ↓
        UserController::profile()
             ↓
        Ответ пользователю
```

### Преимущества

✅ **Единая точка инициализации** — весь код запускается одинаково  
✅ **Гибкие URL** — не привязаны к файлам  
✅ **Middleware** — легко добавить проверки для всех запросов  
✅ **Централизованная обработка ошибок**  

---

## Практика: Простейший Front Controller

### Шаг 1: Настройка .htaccess

Все запросы перенаправляются на `index.php`:

```apache
# public/.htaccess
RewriteEngine On

# Если файл или папка существует - отдаём напрямую (для CSS/JS/картинок)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Иначе - на index.php
RewriteRule ^(.*)$ index.php [QSA,L]
```

**Что происходит:**
- `/users/profile` → `index.php`
- `/api/orders/123` → `index.php`
- `/css/style.css` → отдаётся напрямую (файл существует)

### Шаг 2: Простой Front Controller

```php
// public/index.php
<?php

// Инициализация
session_start();
require_once '../config.php';
require_once '../autoload.php';

// Получаем URI
$uri = $_SERVER['REQUEST_URI'];
$uri = parse_url($uri, PHP_URL_PATH); // Убираем ?параметры

// Простейшая маршрутизация
switch ($uri) {
    case '/':
        require '../controllers/HomeController.php';
        $controller = new HomeController();
        $controller->index();
        break;
    
    case '/users':
        require '../controllers/UserController.php';
        $controller = new UserController();
        $controller->list();
        break;
    
    case '/about':
        require '../controllers/PageController.php';
        $controller = new PageController();
        $controller->about();
        break;
    
    default:
        http_response_code(404);
        echo "404 - Страница не найдена";
}
```

**Теперь:**
- Инициализация в одном месте
- Все контроллеры подключаются по требованию
- Легко добавить логирование или проверку авторизации

---

## Роутинг: Превращаем URL в код

### Проблема switch

Switch работает, но не масштабируется:

```php
// Что делать с динамическими параметрами?
case '/users/123':  // ❌ Нужен роутер с переменными
case '/products/laptop':  // ❌ Невозможно предусмотреть все варианты
```

### Простой роутер с регулярными выражениями

```php
// Router.php
class Router
{
    private array $routes = [];
    
    public function get(string $pattern, callable $callback): void
    {
        $this->routes['GET'][$pattern] = $callback;
    }
    
    public function post(string $pattern, callable $callback): void
    {
        $this->routes['POST'][$pattern] = $callback;
    }
    
    public function dispatch(string $uri, string $method): void
    {
        foreach ($this->routes[$method] ?? [] as $pattern => $callback) {
            // Преобразуем /users/{id} в регулярку
            $patternRegex = $this->convertToRegex($pattern);
            
            if (preg_match($patternRegex, $uri, $matches)) {
                // Убираем полное совпадение, оставляем параметры
                array_shift($matches);
                
                // Вызываем callback с параметрами
                call_user_func_array($callback, $matches);
                return;
            }
        }
        
        // 404
        http_response_code(404);
        echo "404 - Страница не найдена";
    }
    
    private function convertToRegex(string $pattern): string
    {
        // /users/{id} → /^\/users\/([^\/]+)$/
        // /posts/{id}/comments/{comment} → /^\/posts\/([^\/]+)\/comments\/([^\/]+)$/
        
        $pattern = preg_replace('/\{[a-zA-Z]+\}/', '([^\/]+)', $pattern);
        return '#^' . $pattern . '$#';
    }
}
```

### Использование роутера

```php
// public/index.php
<?php

require_once '../Router.php';
require_once '../controllers/UserController.php';
require_once '../controllers/ProductController.php';

$router = new Router();

// Определяем маршруты
$router->get('/', function() {
    echo "Главная страница";
});

$router->get('/users', function() {
    $controller = new UserController();
    $controller->list();
});

$router->get('/users/{id}', function($id) {
    $controller = new UserController();
    $controller->show($id);
});

$router->get('/products/{category}/{slug}', function($category, $slug) {
    $controller = new ProductController();
    $controller->show($category, $slug);
});

$router->post('/users', function() {
    $controller = new UserController();
    $controller->store();
});

// Запускаем роутер
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

$router->dispatch($uri, $method);
```

**Примеры:**
- `/users/42` → вызовет `UserController::show(42)`
- `/products/laptops/macbook-pro` → вызовет `ProductController::show('laptops', 'macbook-pro')`

---

## Улучшенный роутер с контроллерами

### Проблема анонимных функций

Предыдущий пример использует замыкания (closures), но в реальных приложениях лучше указывать контроллеры:

```php
// ❌ Плохо - создаём контроллеры в каждом роуте
$router->get('/users/{id}', function($id) {
    $controller = new UserController();
    $controller->show($id);
});

// ✅ Хорошо - указываем контроллер строкой
$router->get('/users/{id}', 'UserController@show');
```

### Роутер с поддержкой контроллеров

```php
class Router
{
    private array $routes = [];
    
    public function get(string $pattern, $handler): void
    {
        $this->addRoute('GET', $pattern, $handler);
    }
    
    public function post(string $pattern, $handler): void
    {
        $this->addRoute('POST', $pattern, $handler);
    }
    
    private function addRoute(string $method, string $pattern, $handler): void
    {
        $this->routes[$method][$pattern] = $handler;
    }
    
    public function dispatch(string $uri, string $method): void
    {
        foreach ($this->routes[$method] ?? [] as $pattern => $handler) {
            $patternRegex = $this->convertToRegex($pattern);
            
            if (preg_match($patternRegex, $uri, $matches)) {
                array_shift($matches);
                $this->callHandler($handler, $matches);
                return;
            }
        }
        
        $this->notFound();
    }
    
    private function callHandler($handler, array $params): void
    {
        if (is_callable($handler)) {
            // Анонимная функция
            call_user_func_array($handler, $params);
        } elseif (is_string($handler)) {
            // Строка вида "ControllerName@method"
            [$controllerName, $method] = explode('@', $handler);
            
            // Подключаем контроллер
            $controllerPath = "../controllers/{$controllerName}.php";
            if (!file_exists($controllerPath)) {
                throw new Exception("Контроллер {$controllerName} не найден");
            }
            
            require_once $controllerPath;
            
            $controller = new $controllerName();
            
            if (!method_exists($controller, $method)) {
                throw new Exception("Метод {$method} не найден в {$controllerName}");
            }
            
            call_user_func_array([$controller, $method], $params);
        }
    }
    
    private function convertToRegex(string $pattern): string
    {
        $pattern = preg_replace('/\{[a-zA-Z]+\}/', '([^\/]+)', $pattern);
        return '#^' . $pattern . '$#';
    }
    
    private function notFound(): void
    {
        http_response_code(404);
        echo "404 - Страница не найдена";
    }
}
```

### Файл маршрутов

Теперь можно вынести маршруты в отдельный файл:

```php
// routes/web.php
<?php

$router->get('/', 'HomeController@index');
$router->get('/about', 'PageController@about');

$router->get('/users', 'UserController@index');
$router->get('/users/{id}', 'UserController@show');
$router->post('/users', 'UserController@store');

$router->get('/products', 'ProductController@index');
$router->get('/products/{slug}', 'ProductController@show');

$router->get('/cart', 'CartController@index');
$router->post('/cart/add', 'CartController@add');
```

```php
// public/index.php
<?php

session_start();
require_once '../config.php';
require_once '../Router.php';

$router = new Router();

// Загружаем маршруты
require_once '../routes/web.php';

// Диспетчеризация
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

$router->dispatch($uri, $method);
```

---

## Именованные маршруты

### Зачем нужны

Представьте, что вы меняете URL профиля с `/users/{id}` на `/profile/{username}`. Придётся искать все ссылки в шаблонах и менять их вручную!

**Именованные маршруты** решают это:

```php
// Было
<a href="/users/<?= $user->id ?>">Профиль</a>

// Стало
<a href="<?= route('user.profile', $user->id) ?>">Профиль</a>
```

Если изменится URL, код не сломается!

### Реализация

```php
class Router
{
    private array $routes = [];
    private array $namedRoutes = []; // Хранилище имён
    
    public function get(string $pattern, $handler, ?string $name = null): void
    {
        $this->addRoute('GET', $pattern, $handler, $name);
    }
    
    public function post(string $pattern, $handler, ?string $name = null): void
    {
        $this->addRoute('POST', $pattern, $handler, $name);
    }
    
    private function addRoute(string $method, string $pattern, $handler, ?string $name): void
    {
        $this->routes[$method][$pattern] = $handler;
        
        if ($name !== null) {
            $this->namedRoutes[$name] = $pattern;
        }
    }
    
    public function generate(string $name, ...$params): string
    {
        if (!isset($this->namedRoutes[$name])) {
            throw new Exception("Маршрут '{$name}' не найден");
        }
        
        $pattern = $this->namedRoutes[$name];
        
        // Заменяем {param} на значения
        $url = preg_replace_callback('/\{[a-zA-Z]+\}/', function() use (&$params) {
            return array_shift($params);
        }, $pattern);
        
        return $url;
    }
    
    // ... остальные методы
}
```

### Использование

```php
// routes/web.php
$router->get('/users/{id}', 'UserController@show', 'user.profile');
$router->get('/posts/{slug}', 'PostController@show', 'post.show');
$router->post('/comments', 'CommentController@store', 'comment.store');

// В коде
echo $router->generate('user.profile', 42);
// Выведет: /users/42

echo $router->generate('post.show', 'hello-world');
// Выведет: /posts/hello-world
```

Можно создать глобальную функцию:

```php
// helpers.php
function route(string $name, ...$params): string
{
    global $router;
    return $router->generate($name, ...$params);
}

// В шаблоне
<a href="<?= route('user.profile', $user->id) ?>">Профиль</a>
```

---

## Группы маршрутов и middleware

### Префиксы и группировка

```php
class Router
{
    private string $currentPrefix = '';
    private array $currentMiddleware = [];
    
    public function prefix(string $prefix, callable $callback): void
    {
        $previousPrefix = $this->currentPrefix;
        $this->currentPrefix .= $prefix;
        
        $callback($this);
        
        $this->currentPrefix = $previousPrefix;
    }
    
    public function middleware(array $middleware, callable $callback): void
    {
        $previousMiddleware = $this->currentMiddleware;
        $this->currentMiddleware = array_merge($this->currentMiddleware, $middleware);
        
        $callback($this);
        
        $this->currentMiddleware = $previousMiddleware;
    }
    
    private function addRoute(string $method, string $pattern, $handler, ?string $name): void
    {
        $fullPattern = $this->currentPrefix . $pattern;
        
        $this->routes[$method][$fullPattern] = [
            'handler' => $handler,
            'middleware' => $this->currentMiddleware
        ];
        
        if ($name !== null) {
            $this->namedRoutes[$name] = $fullPattern;
        }
    }
    
    // ... остальные методы
}
```

### Использование

```php
// API маршруты с префиксом /api
$router->prefix('/api', function($router) {
    $router->get('/users', 'Api\UserController@index');
    $router->get('/posts', 'Api\PostController@index');
});

// Админка с проверкой авторизации
$router->middleware(['auth', 'admin'], function($router) {
    $router->prefix('/admin', function($router) {
        $router->get('/dashboard', 'Admin\DashboardController@index');
        $router->get('/users', 'Admin\UserController@index');
    });
});

// Результат:
// /api/users → Api\UserController@index
// /api/posts → Api\PostController@index
// /admin/dashboard → Admin\DashboardController@index (+ auth + admin)
```

---

## Middleware: Обработка запросов до контроллера

### Концепция

**Middleware** — это "слои" обработки запроса:

```
Запрос → Auth Middleware → CSRF Middleware → Controller → Ответ
```

Каждый middleware может:
- Проверить что-то и пропустить дальше
- Остановить выполнение (редирект, ошибка)
- Изменить запрос или ответ

### Простая реализация

```php
// Middleware/AuthMiddleware.php
class AuthMiddleware
{
    public function handle(): bool
    {
        if (!isset($_SESSION['user_id'])) {
            header('Location: /login');
            exit;
        }
        return true;
    }
}

// Middleware/AdminMiddleware.php
class AdminMiddleware
{
    public function handle(): bool
    {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(403);
            echo "Доступ запрещён";
            exit;
        }
        
        // Проверяем роль
        $user = getUserById($_SESSION['user_id']);
        if ($user['role'] !== 'admin') {
            http_response_code(403);
            echo "Требуются права администратора";
            exit;
        }
        
        return true;
    }
}
```

### Запуск middleware в роутере

```php
class Router
{
    // ...
    
    private function runMiddleware(array $middleware): void
    {
        foreach ($middleware as $middlewareName) {
            $className = ucfirst($middlewareName) . 'Middleware';
            $path = "../middleware/{$className}.php";
            
            if (!file_exists($path)) {
                throw new Exception("Middleware {$className} не найден");
            }
            
            require_once $path;
            $middlewareInstance = new $className();
            $middlewareInstance->handle();
        }
    }
    
    public function dispatch(string $uri, string $method): void
    {
        foreach ($this->routes[$method] ?? [] as $pattern => $routeData) {
            $patternRegex = $this->convertToRegex($pattern);
            
            if (preg_match($patternRegex, $uri, $matches)) {
                array_shift($matches);
                
                // Запускаем middleware
                if (!empty($routeData['middleware'])) {
                    $this->runMiddleware($routeData['middleware']);
                }
                
                // Вызываем контроллер
                $this->callHandler($routeData['handler'], $matches);
                return;
            }
        }
        
        $this->notFound();
    }
}
```

---

## Полный пример приложения

### Структура проекта

```
/project
  ├── public
  │   ├── .htaccess
  │   ├── index.php
  │   └── css/style.css
  ├── controllers
  │   ├── HomeController.php
  │   ├── UserController.php
  │   └── Admin/
  │       └── DashboardController.php
  ├── middleware
  │   ├── AuthMiddleware.php
  │   └── AdminMiddleware.php
  ├── views
  │   ├── home.php
  │   ├── users/
  │   │   ├── index.php
  │   │   └── show.php
  │   └── admin/
  │       └── dashboard.php
  ├── routes
  │   └── web.php
  ├── config.php
  ├── Router.php
  └── helpers.php
```

### public/index.php

```php
<?php

session_start();
require_once '../config.php';
require_once '../helpers.php';
require_once '../Router.php';

$router = new Router();

// Загружаем маршруты
require_once '../routes/web.php';

// Диспетчеризация
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

try {
    $router->dispatch($uri, $method);
} catch (Exception $e) {
    http_response_code(500);
    echo "Ошибка: " . $e->getMessage();
}
```

### routes/web.php

```php
<?php

// Главная
$router->get('/', 'HomeController@index', 'home');

// Пользователи
$router->get('/users', 'UserController@index', 'users.index');
$router->get('/users/{id}', 'UserController@show', 'users.show');

// Защищённые маршруты
$router->middleware(['auth'], function($router) {
    $router->get('/profile', 'UserController@profile', 'profile');
    $router->post('/profile/update', 'UserController@update', 'profile.update');
});

// Админка
$router->middleware(['auth', 'admin'], function($router) {
    $router->prefix('/admin', function($router) {
        $router->get('/dashboard', 'Admin\DashboardController@index', 'admin.dashboard');
        $router->get('/users', 'Admin\UserController@index', 'admin.users');
    });
});
```

### controllers/UserController.php

```php
<?php

class UserController
{
    public function index(): void
    {
        $users = getAllUsers(); // Из БД
        require '../views/users/index.php';
    }
    
    public function show(int $id): void
    {
        $user = getUserById($id);
        
        if (!$user) {
            http_response_code(404);
            echo "Пользователь не найден";
            return;
        }
        
        require '../views/users/show.php';
    }
    
    public function profile(): void
    {
        $userId = $_SESSION['user_id'];
        $user = getUserById($userId);
        require '../views/users/profile.php';
    }
}
```

### views/users/show.php

```php
<!DOCTYPE html>
<html>
<head>
    <title>Профиль <?= htmlspecialchars($user['name']) ?></title>
</head>
<body>
    <h1><?= htmlspecialchars($user['name']) ?></h1>
    <p>Email: <?= htmlspecialchars($user['email']) ?></p>
    
    <a href="<?= route('users.index') ?>">Назад к списку</a>
</body>
</html>
```

---

## Сравнение с Laravel

### Как это выглядит в Laravel

```php
// routes/web.php в Laravel
Route::get('/', [HomeController::class, 'index'])->name('home');

Route::get('/users', [UserController::class, 'index'])->name('users.index');
Route::get('/users/{id}', [UserController::class, 'show'])->name('users.show');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [UserController::class, 'profile'])->name('profile');
});

Route::middleware(['auth', 'admin'])->prefix('admin')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('admin.dashboard');
});
```

**Что Laravel добавляет:**
- Автоматическое разрешение зависимостей (Dependency Injection)
- Route Model Binding (автоматическая загрузка моделей)
- Более мощные middleware с очередями
- Кеширование маршрутов для production

---

## Упражнения

### Задание 1: Базовый роутер ⭐

Создайте простой Front Controller с роутером, который поддерживает:
- GET и POST запросы
- Динамические параметры `/users/{id}`
- Вызов контроллеров в формате `ControllerName@method`

Создайте маршруты для:
- Главной страницы
- Списка статей
- Отдельной статьи по slug

### Задание 2: Middleware ⭐⭐

Добавьте в роутер поддержку middleware:
- `AuthMiddleware` — проверка авторизации
- `GuestMiddleware` — доступен только неавторизованным
- `LogMiddleware` — логирование всех запросов в файл

Примените middleware к разным группам маршрутов.

### Задание 3: Именованные маршруты ⭐⭐

Реализуйте:
- Метод `name()` для присвоения имени маршруту
- Функцию `route($name, ...$params)` для генерации URL
- Замените все жёсткие ссылки в шаблонах на `route()`

### Задание 4: REST-маршруты ⭐⭐⭐

Создайте метод `resource()`, который автоматически генерирует стандартные CRUD-маршруты:

```php
$router->resource('posts', 'PostController');

// Должно создать:
// GET    /posts          → PostController@index
// GET    /posts/create   → PostController@create
// POST   /posts          → PostController@store
// GET    /posts/{id}     → PostController@show
// GET    /posts/{id}/edit → PostController@edit
// PUT    /posts/{id}     → PostController@update
// DELETE /posts/{id}     → PostController@destroy
```

### Задание 5: Продвинутый роутинг ⭐⭐⭐

Добавьте:
- Ограничения параметров: `/users/{id:number}`, `/posts/{slug:alpha}`
- Опциональные параметры: `/posts/{category?}`
- Кеширование маршрутов для ускорения
- Группировку по поддоменам

---

## Частые ошибки

### ❌ Ошибка 1: Забыть про .htaccess

```php
// Работает только index.php, остальное 404
```

**Решение:** Проверьте, что `.htaccess` настроен правильно и `mod_rewrite` включён.

### ❌ Ошибка 2: Не очищать query string

```php
$uri = $_SERVER['REQUEST_URI']; // /users?page=2
// Роутер не найдёт /users
```

**Решение:**
```php
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
```

### ❌ Ошибка 3: Порядок маршрутов

```php
$router->get('/users/{id}', 'UserController@show');
$router->get('/users/new', 'UserController@create'); // Никогда не сработает!
```

**Решение:** Специфичные маршруты должны идти **до** динамических:

```php
$router->get('/users/new', 'UserController@create');
$router->get('/users/{id}', 'UserController@show');
```

### ❌ Ошибка 4: Циклический редирект в middleware

```php
// AuthMiddleware проверяет /login
if (!isset($_SESSION['user_id'])) {
    header('Location: /login');
    exit;
}
// Но /login тоже требует auth → бесконечный редирект!
```

**Решение:** Исключите `/login` из проверки:

```php
$allowedPaths = ['/login', '/register'];
if (!in_array($_SERVER['REQUEST_URI'], $allowedPaths) && !isset($_SESSION['user_id'])) {
    header('Location: /login');
    exit;
}
```

---

## Контрольные вопросы

1. **В чём преимущества Front Controller перед множественными точками входа?**

2. **Как `.htaccess` перенаправляет все запросы на `index.php`?**

3. **Почему нужны именованные маршруты? Приведите пример проблемы, которую они решают.**

4. **Что такое middleware и в каких случаях его используют?**

5. **Как роутер преобразует `/users/{id}` в регулярное выражение?**

6. **Почему важен порядок регистрации маршрутов?**

7. **Какие HTTP-методы (кроме GET/POST) можно использовать в роутинге? Зачем они нужны?**

---

## Что дальше?

Вы создали **собственный роутер** — основу любого современного фреймворка! 

**Следующий шаг:**
```
Глава 5.3: Dependency Injection и контейнеры — избавляемся от жёстких зависимостей
```

Вы научитесь автоматически внедрять зависимости в контроллеры, создадите IoC-контейнер и поймёте, как работает "магия" Laravel.