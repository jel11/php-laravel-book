# Глава 5.3: Dependency Injection и контейнеры — избавляемся от жёстких зависимостей

## 🎯 Что ты узнаешь

После этой главы ты поймёшь:
- Что такое зависимости и почему они создают проблемы
- Как Dependency Injection (DI) решает эту проблему
- Что такое IoC (Inversion of Control) контейнер
- Как построить простой DI-контейнер с нуля
- Почему это критично для современной архитектуры

---

## 📖 Проблема: жёсткие зависимости

### Что не так с этим кодом?

```php
<?php

class UserRepository 
{
    private $connection;
    
    public function __construct()
    {
        // Жёсткая зависимость от PDO
        $this->connection = new PDO(
            'mysql:host=localhost;dbname=app',
            'root',
            'password'
        );
    }
    
    public function find($id)
    {
        $stmt = $this->connection->prepare(
            'SELECT * FROM users WHERE id = ?'
        );
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}

class AuthService 
{
    private $userRepository;
    
    public function __construct()
    {
        // Жёсткая зависимость от UserRepository
        $this->userRepository = new UserRepository();
    }
    
    public function login($email, $password)
    {
        // Логика авторизации
    }
}

// Использование
$auth = new AuthService(); // Создаёт UserRepository, который создаёт PDO
```

### Проблемы этого подхода:

1. **Невозможно тестировать** — нельзя подменить БД на mock
2. **Жёсткая привязка** — изменение UserRepository требует изменения AuthService
3. **Дублирование кода** — конфигурация БД повторяется
4. **Нарушение Single Responsibility** — класс сам создаёт свои зависимости
5. **Скрытые зависимости** — непонятно, что нужно классу

---

## 💡 Решение 1: Dependency Injection

### Что такое DI?

**Dependency Injection** — это паттерн, при котором зависимости передаются в класс извне, а не создаются внутри него.

### Типы DI

#### 1. Constructor Injection (самый популярный)

```php
<?php

class UserRepository 
{
    private $connection;
    
    // Зависимость передаётся через конструктор
    public function __construct(PDO $connection)
    {
        $this->connection = $connection;
    }
    
    public function find($id)
    {
        $stmt = $this->connection->prepare(
            'SELECT * FROM users WHERE id = ?'
        );
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}

class AuthService 
{
    private $userRepository;
    
    // Зависимость передаётся через конструктор
    public function __construct(UserRepository $userRepository)
    {
        $this->userRepository = $userRepository;
    }
    
    public function login($email, $password)
    {
        // Логика авторизации
    }
}

// Использование — явное создание зависимостей
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'password');
$userRepo = new UserRepository($pdo);
$auth = new AuthService($userRepo);
```

**Преимущества:**
- ✅ Явные зависимости — видно, что нужно классу
- ✅ Легко тестировать — можно передать mock
- ✅ Неизменяемость — зависимости устанавливаются один раз

#### 2. Setter Injection

```php
<?php

class EmailService 
{
    private $logger;
    
    // Необязательная зависимость через setter
    public function setLogger(Logger $logger)
    {
        $this->logger = $logger;
    }
    
    public function send($to, $subject, $body)
    {
        // Отправка email
        
        if ($this->logger) {
            $this->logger->log("Email sent to {$to}");
        }
    }
}

// Использование
$emailService = new EmailService();
$emailService->setLogger(new FileLogger()); // Опционально
```

**Когда использовать:**
- Для необязательных зависимостей
- Когда зависимость может меняться в runtime

#### 3. Interface Injection (редко используется)

```php
<?php

interface LoggerAware 
{
    public function injectLogger(Logger $logger);
}

class Service implements LoggerAware 
{
    private $logger;
    
    public function injectLogger(Logger $logger)
    {
        $this->logger = $logger;
    }
}
```

---

## 🎓 Принцип Inversion of Control (IoC)

### Без IoC (класс управляет своими зависимостями)

```php
class UserController 
{
    private $userService;
    
    public function __construct()
    {
        // Контроллер сам решает, какую реализацию создать
        $this->userService = new UserService();
    }
}
```

### С IoC (внешняя система управляет зависимостями)

```php
class UserController 
{
    private $userService;
    
    // Внешняя система решает, какую реализацию передать
    public function __construct(UserServiceInterface $userService)
    {
        $this->userService = $userService;
    }
}
```

**Inversion of Control** = вместо "я сам создам то, что мне нужно" → "дайте мне то, что мне нужно"

---

## 🛠️ Строим DI-контейнер с нуля

### Проблема ручного DI

```php
// Слишком много boilerplate кода
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'password');
$userRepo = new UserRepository($pdo);
$postRepo = new PostRepository($pdo);
$emailService = new EmailService();
$userService = new UserService($userRepo, $emailService);
$postService = new PostService($postRepo, $userService);
$controller = new UserController($userService, $postService);
```

### Решение: IoC Container

**DI Container** — это объект, который:
1. Знает, как создавать другие объекты
2. Автоматически разрешает зависимости
3. Управляет жизненным циклом объектов

### Версия 1: Простейший контейнер

```php
<?php

class Container 
{
    private $bindings = [];
    private $instances = [];
    
    /**
     * Регистрация фабрики для создания объекта
     */
    public function bind($abstract, $concrete)
    {
        $this->bindings[$abstract] = $concrete;
    }
    
    /**
     * Регистрация singleton (создаётся один раз)
     */
    public function singleton($abstract, $concrete)
    {
        $this->bindings[$abstract] = $concrete;
        $this->instances[$abstract] = null;
    }
    
    /**
     * Получение объекта из контейнера
     */
    public function get($abstract)
    {
        // Если это singleton и уже создан — вернуть существующий
        if (isset($this->instances[$abstract]) && 
            $this->instances[$abstract] !== null) {
            return $this->instances[$abstract];
        }
        
        // Если зарегистрирована фабрика
        if (isset($this->bindings[$abstract])) {
            $concrete = $this->bindings[$abstract];
            
            // Если это функция — вызвать её
            if (is_callable($concrete)) {
                $object = $concrete($this);
            } else {
                // Если это строка — создать объект класса
                $object = $this->build($concrete);
            }
            
            // Сохранить singleton
            if (isset($this->instances[$abstract])) {
                $this->instances[$abstract] = $object;
            }
            
            return $object;
        }
        
        // Попробовать создать класс напрямую
        return $this->build($abstract);
    }
    
    /**
     * Создание объекта с автоматическим разрешением зависимостей
     */
    private function build($className)
    {
        $reflector = new ReflectionClass($className);
        
        // Проверить, можно ли создать экземпляр
        if (!$reflector->isInstantiable()) {
            throw new Exception("Class {$className} is not instantiable");
        }
        
        $constructor = $reflector->getConstructor();
        
        // Если конструктора нет — просто создать объект
        if (is_null($constructor)) {
            return new $className;
        }
        
        // Получить параметры конструктора
        $parameters = $constructor->getParameters();
        
        // Разрешить зависимости
        $dependencies = $this->resolveDependencies($parameters);
        
        // Создать объект с зависимостями
        return $reflector->newInstanceArgs($dependencies);
    }
    
    /**
     * Разрешение зависимостей параметров
     */
    private function resolveDependencies($parameters)
    {
        $dependencies = [];
        
        foreach ($parameters as $parameter) {
            $type = $parameter->getType();
            
            // Если тип не указан
            if (!$type || $type->isBuiltin()) {
                // Проверить значение по умолчанию
                if ($parameter->isDefaultValueAvailable()) {
                    $dependencies[] = $parameter->getDefaultValue();
                } else {
                    throw new Exception(
                        "Cannot resolve parameter {$parameter->getName()}"
                    );
                }
            } else {
                // Рекурсивно получить зависимость из контейнера
                $dependencies[] = $this->get($type->getName());
            }
        }
        
        return $dependencies;
    }
}
```

### Использование контейнера

```php
<?php

// Создать контейнер
$container = new Container();

// Регистрация зависимостей

// 1. Singleton для подключения к БД
$container->singleton(PDO::class, function($c) {
    return new PDO(
        'mysql:host=localhost;dbname=app',
        'root',
        'password',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
});

// 2. Binding для репозитория (создаётся каждый раз новый)
$container->bind(UserRepository::class, function($c) {
    return new UserRepository($c->get(PDO::class));
});

// 3. Автоматическое разрешение для сервиса
// (не нужна явная регистрация, если зависимости уже зарегистрированы)

// Получение объектов
$userRepo = $container->get(UserRepository::class);
$authService = $container->get(AuthService::class); // Автоматически создаст UserRepository

// Оба получат одно и то же подключение PDO
$pdo1 = $container->get(PDO::class);
$pdo2 = $container->get(PDO::class);
var_dump($pdo1 === $pdo2); // true (singleton)
```

---

## 🏗️ Версия 2: Контейнер с интерфейсами

```php
<?php

// Интерфейсы
interface LoggerInterface 
{
    public function log($message);
}

interface UserRepositoryInterface 
{
    public function find($id);
    public function save($user);
}

// Реализации
class FileLogger implements LoggerInterface 
{
    public function log($message)
    {
        file_put_contents('app.log', $message . PHP_EOL, FILE_APPEND);
    }
}

class DatabaseUserRepository implements UserRepositoryInterface 
{
    private $pdo;
    
    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }
    
    public function find($id)
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function save($user)
    {
        // Логика сохранения
    }
}

class UserService 
{
    private $userRepo;
    private $logger;
    
    // Зависимости через интерфейсы, а не конкретные классы
    public function __construct(
        UserRepositoryInterface $userRepo,
        LoggerInterface $logger
    ) {
        $this->userRepo = $userRepo;
        $this->logger = $logger;
    }
    
    public function registerUser($email, $password)
    {
        // Логика регистрации
        $this->logger->log("User registered: {$email}");
    }
}

// Регистрация в контейнере
$container = new Container();

// Связать интерфейс с реализацией
$container->singleton(LoggerInterface::class, function($c) {
    return new FileLogger();
});

$container->singleton(PDO::class, function($c) {
    return new PDO('mysql:host=localhost;dbname=app', 'root', 'password');
});

$container->bind(UserRepositoryInterface::class, function($c) {
    return new DatabaseUserRepository($c->get(PDO::class));
});

// Автоматически разрешится
$userService = $container->get(UserService::class);
```

**Преимущества:**
- ✅ Легко менять реализации (FileLogger → DatabaseLogger)
- ✅ Код не зависит от конкретных классов
- ✅ Идеально для тестирования (подменить на Mock)

---

## 🧪 Практический пример: блог-приложение

```php
<?php

// ============ Интерфейсы ============

interface CacheInterface 
{
    public function get($key);
    public function set($key, $value, $ttl = 3600);
}

interface PostRepositoryInterface 
{
    public function findById($id);
    public function findAll();
}

// ============ Реализации ============

class FileCache implements CacheInterface 
{
    private $cacheDir;
    
    public function __construct($cacheDir = '/tmp/cache')
    {
        $this->cacheDir = $cacheDir;
    }
    
    public function get($key)
    {
        $file = $this->cacheDir . '/' . md5($key);
        if (!file_exists($file)) {
            return null;
        }
        
        $data = unserialize(file_get_contents($file));
        if ($data['expires'] < time()) {
            unlink($file);
            return null;
        }
        
        return $data['value'];
    }
    
    public function set($key, $value, $ttl = 3600)
    {
        $file = $this->cacheDir . '/' . md5($key);
        $data = [
            'value' => $value,
            'expires' => time() + $ttl
        ];
        file_put_contents($file, serialize($data));
    }
}

class PostRepository implements PostRepositoryInterface 
{
    private $pdo;
    private $cache;
    
    public function __construct(PDO $pdo, CacheInterface $cache)
    {
        $this->pdo = $pdo;
        $this->cache = $cache;
    }
    
    public function findById($id)
    {
        // Попробовать получить из кеша
        $cacheKey = "post:{$id}";
        $cached = $this->cache->get($cacheKey);
        
        if ($cached !== null) {
            return $cached;
        }
        
        // Получить из БД
        $stmt = $this->pdo->prepare('SELECT * FROM posts WHERE id = ?');
        $stmt->execute([$id]);
        $post = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Сохранить в кеш
        if ($post) {
            $this->cache->set($cacheKey, $post, 1800); // 30 минут
        }
        
        return $post;
    }
    
    public function findAll()
    {
        $stmt = $this->pdo->query('SELECT * FROM posts ORDER BY created_at DESC');
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

class PostService 
{
    private $postRepo;
    
    public function __construct(PostRepositoryInterface $postRepo)
    {
        $this->postRepo = $postRepo;
    }
    
    public function getPost($id)
    {
        $post = $this->postRepo->findById($id);
        
        if (!$post) {
            throw new Exception('Post not found');
        }
        
        return $post;
    }
    
    public function getRecentPosts($limit = 10)
    {
        $posts = $this->postRepo->findAll();
        return array_slice($posts, 0, $limit);
    }
}

// ============ Настройка контейнера ============

$container = new Container();

// PDO singleton
$container->singleton(PDO::class, function($c) {
    return new PDO(
        'mysql:host=localhost;dbname=blog',
        'root',
        'password',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
});

// Cache singleton
$container->singleton(CacheInterface::class, function($c) {
    return new FileCache(__DIR__ . '/cache');
});

// Repository (новый каждый раз)
$container->bind(PostRepositoryInterface::class, function($c) {
    return new PostRepository(
        $c->get(PDO::class),
        $c->get(CacheInterface::class)
    );
});

// ============ Использование ============

$postService = $container->get(PostService::class);

// Автоматически получит PostRepository с PDO и Cache
$post = $postService->getPost(1);
$recentPosts = $postService->getRecentPosts(5);
```

---

## 🎯 Версия 3: Расширенный контейнер

```php
<?php

class AdvancedContainer 
{
    private $bindings = [];
    private $instances = [];
    private $aliases = [];
    
    /**
     * Регистрация алиаса
     */
    public function alias($alias, $abstract)
    {
        $this->aliases[$alias] = $abstract;
    }
    
    /**
     * Проверка, зарегистрирован ли сервис
     */
    public function has($abstract)
    {
        $abstract = $this->getAlias($abstract);
        return isset($this->bindings[$abstract]) || 
               isset($this->instances[$abstract]);
    }
    
    /**
     * Получение алиаса
     */
    private function getAlias($abstract)
    {
        return $this->aliases[$abstract] ?? $abstract;
    }
    
    /**
     * Binding с поддержкой параметров
     */
    public function bind($abstract, $concrete = null, $shared = false)
    {
        $abstract = $this->getAlias($abstract);
        
        if (is_null($concrete)) {
            $concrete = $abstract;
        }
        
        $this->bindings[$abstract] = compact('concrete', 'shared');
    }
    
    /**
     * Singleton
     */
    public function singleton($abstract, $concrete = null)
    {
        $this->bind($abstract, $concrete, true);
    }
    
    /**
     * Регистрация существующего экземпляра
     */
    public function instance($abstract, $instance)
    {
        $abstract = $this->getAlias($abstract);
        $this->instances[$abstract] = $instance;
    }
    
    /**
     * Вызов метода с автоматическим разрешением зависимостей
     */
    public function call($callback, $parameters = [])
    {
        if (is_string($callback) && strpos($callback, '::') !== false) {
            $callback = explode('::', $callback);
        }
        
        if (is_array($callback)) {
            [$class, $method] = $callback;
            
            if (is_string($class)) {
                $class = $this->get($class);
            }
            
            $reflector = new ReflectionMethod($class, $method);
        } else {
            $reflector = new ReflectionFunction($callback);
        }
        
        $dependencies = $this->resolveDependencies(
            $reflector->getParameters(),
            $parameters
        );
        
        return $reflector->invokeArgs(
            is_array($callback) ? $callback[0] : null,
            $dependencies
        );
    }
    
    /**
     * Получение с параметрами
     */
    public function make($abstract, $parameters = [])
    {
        $abstract = $this->getAlias($abstract);
        
        if (isset($this->instances[$abstract])) {
            return $this->instances[$abstract];
        }
        
        if (!isset($this->bindings[$abstract])) {
            return $this->build($abstract, $parameters);
        }
        
        $concrete = $this->bindings[$abstract]['concrete'];
        
        if ($this->bindings[$abstract]['shared'] && 
            isset($this->instances[$abstract])) {
            return $this->instances[$abstract];
        }
        
        $object = is_callable($concrete)
            ? $concrete($this, $parameters)
            : $this->build($concrete, $parameters);
        
        if ($this->bindings[$abstract]['shared']) {
            $this->instances[$abstract] = $object;
        }
        
        return $object;
    }
    
    public function get($abstract)
    {
        return $this->make($abstract);
    }
    
    /**
     * Создание объекта
     */
    private function build($className, $parameters = [])
    {
        $reflector = new ReflectionClass($className);
        
        if (!$reflector->isInstantiable()) {
            throw new Exception("Class {$className} is not instantiable");
        }
        
        $constructor = $reflector->getConstructor();
        
        if (is_null($constructor)) {
            return new $className;
        }
        
        $dependencies = $this->resolveDependencies(
            $constructor->getParameters(),
            $parameters
        );
        
        return $reflector->newInstanceArgs($dependencies);
    }
    
    /**
     * Разрешение зависимостей
     */
    private function resolveDependencies($reflectionParameters, $providedParameters = [])
    {
        $dependencies = [];
        
        foreach ($reflectionParameters as $parameter) {
            $name = $parameter->getName();
            
            // Если параметр передан явно
            if (array_key_exists($name, $providedParameters)) {
                $dependencies[] = $providedParameters[$name];
                continue;
            }
            
            $type = $parameter->getType();
            
            if (!$type || $type->isBuiltin()) {
                if ($parameter->isDefaultValueAvailable()) {
                    $dependencies[] = $parameter->getDefaultValue();
                } else {
                    throw new Exception(
                        "Cannot resolve parameter {$name}"
                    );
                }
            } else {
                $dependencies[] = $this->get($type->getName());
            }
        }
        
        return $dependencies;
    }
}
```

### Использование расширенного контейнера

```php
<?php

$container = new AdvancedContainer();

// Алиасы
$container->alias('db', PDO::class);
$container->alias('cache', CacheInterface::class);

// Singleton
$container->singleton('db', function() {
    return new PDO('mysql:host=localhost;dbname=app', 'root', 'password');
});

// Использование алиаса
$pdo = $container->get('db'); // Вернёт PDO

// Регистрация существующего экземпляра
$existingLogger = new FileLogger();
$container->instance(LoggerInterface::class, $existingLogger);

// Вызов метода с автоматическим DI
class UserController 
{
    public function show(PostService $postService, $id)
    {
        return $postService->getPost($id);
    }
}

$result = $container->call([UserController::class, 'show'], ['id' => 5]);

// Создание с параметрами
class Report 
{
    public function __construct(PDO $pdo, $title)
    {
        // ...
    }
}

$report = $container->make(Report::class, ['title' => 'Monthly Report']);
```

---

## ⚠️ Частые ошибки и как их избежать

### ❌ Ошибка 1: Service Locator антипаттерн

```php
// ПЛОХО: передача контейнера в класс
class UserService 
{
    private $container;
    
    public function __construct(Container $container)
    {
        $this->container = $container; // Скрытые зависимости!
    }
    
    public function createUser($data)
    {
        $repo = $this->container->get(UserRepository::class);
        $logger = $this->container->get(LoggerInterface::class);
        // ...
    }
}

// ХОРОШО: явные зависимости
class UserService 
{
    private $userRepo;
    private $logger;
    
    public function __construct(
        UserRepository $userRepo,
        LoggerInterface $logger
    ) {
        $this->userRepo = $userRepo;
        $this->logger = $logger;
    }
}
```

### ❌ Ошибка 2: Циклические зависимости

```php
// A зависит от B
class ServiceA 
{
    public function __construct(ServiceB $b) {}
}

// B зависит от A — бесконечная рекурсия!
class ServiceB 
{
    public function __construct(ServiceA $a) {}
}

// Решение: использовать интерфейс или изменить архитектуру
```

### ❌ Ошибка 3: Слишком много зависимостей

```php
// ПЛОХО: God Object
class UserService 
{
    public function __construct(
        UserRepository $repo,
        EmailService $email,
        SmsService $sms,
        LoggerInterface $logger,
        CacheInterface $cache,
        EventDispatcher $events,
        Validator $validator,
        NotificationService $notifications
    ) {
        // Слишком много ответственности!
    }
}

// ХОРОШО: разбить на несколько классов
class UserRegistrationService 
{
    public function __construct(
        UserRepository $repo,
        EmailService $email,
        EventDispatcher $events
    ) {}
}

class UserNotificationService 
{
    public function __construct(
        SmsService $sms,
        NotificationService $notifications
    ) {}
}
```

---

## 🎓 Лучшие практики

### 1. Программирование к интерфейсам

```php
// Зависимость от интерфейса, а не конкретного класса
public function __construct(UserRepositoryInterface $repo) {}

// А не
public function __construct(MySQLUserRepository $repo) {}
```

### 2. Constructor Injection для обязательных зависимостей

```php
class OrderService 
{
    private $orderRepo;
    private $paymentGateway;
    
    // Обязательные зависимости через конструктор
    public function __construct(
        OrderRepositoryInterface $orderRepo,
        PaymentGatewayInterface $paymentGateway
    ) {
        $this->orderRepo = $orderRepo;
        $this->paymentGateway = $paymentGateway;
    }
}
```

### 3. Setter Injection для опциональных зависимостей

```php
class EmailService 
{
    private $logger;
    
    // Опциональная зависимость через setter
    public function setLogger(LoggerInterface $logger)
    {
        $this->logger = $logger;
    }
    
    private function log($message)
    {
        if ($this->logger) {
            $this->logger->log($message);
        }
    }
}
```

### 4. Один файл конфигурации контейнера

```php
// config/container.php

return function(Container $container) {
    // Database
    $container->singleton(PDO::class, function() {
        return new PDO(
            'mysql:host=localhost;dbname=app',
            'root',
            'password'
        );
    });
    
    // Cache
    $container->singleton(CacheInterface::class, FileCache::class);
    
    // Repositories
    $container->bind(UserRepositoryInterface::class, DatabaseUserRepository::class);
    $container->bind(PostRepositoryInterface::class, DatabasePostRepository::class);
    
    // Services
    $container->bind(AuthService::class);
    $container->bind(PostService::class);
};
```

---

## 🧪 Упражнения

### Задание 1: Простой блог
Создай систему блога с использованием DI:
- `PostRepository` (работает с БД)
- `FileStorage` (загрузка изображений)
- `PostService` (бизнес-логика)
- `PostController` (обработка запросов)

Настрой контейнер так, чтобы можно было получить `PostController` одной строкой.

### Задание 2: Смена реализаций
Создай два класса логирования:
- `FileLogger` (пишет в файл)
- `DatabaseLogger` (пишет в БД)

Оба должны реализовывать `LoggerInterface`. Настрой контейнер так, чтобы можно было переключаться между ними, меняя одну строку в конфигурации.

### Задание 3: Кеширование
Расширь `PostRepository` из задания 1:
- Добавь зависимость `CacheInterface`
- При `findById()` сначала проверяй кеш
- Если в кеше нет — запрос в БД и сохранение в кеш
- Создай `FileCache` и `MemoryCache` реализации

### Задание 4: Тестирование
Создай mock-реализацию `UserRepository` для тестирования:
```php
class MockUserRepository implements UserRepositoryInterface 
{
    public function find($id)
    {
        return ['id' => $id, 'name' => 'Test User'];
    }
}
```

Покажи, как легко подменить реальный репозиторий на mock в тестах.

---

## 📝 Чеклист самопроверки

Ты понял эту главу, если можешь:

- [ ] Объяснить, почему `new` внутри класса — это плохо
- [ ] Назвать три типа Dependency Injection
- [ ] Объяснить разницу между DI и IoC
- [ ] Создать простой DI-контейнер с нуля
- [ ] Использовать Reflection API для автоматического разрешения зависимостей
- [ ] Зарегистрировать singleton и обычный binding
- [ ] Объяснить, когда использовать интерфейсы вместо классов
- [ ] Избежать антипаттерна Service Locator
- [ ] Написать тестируемый код с использованием DI

---

## 🚀 Что дальше?

В следующей главе **"Шаблонизация — отделение логики от представления"** ты узнаешь:
- Почему нельзя смешивать PHP и HTML
- Как создать свой template engine
- Что такое наследование шаблонов и компоненты
- Как защититься от XSS в шаблонах

DI — это основа современной архитектуры. Laravel, Symfony и другие фреймворки используют мощные DI-контейнеры. Теперь ты понимаешь, как они работают под капотом!