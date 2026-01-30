# Глава 8.1: Введение в Laravel — философия, установка, структура проекта, artisan

## 🎯 Цели главы

После изучения этой главы ты:
- Поймёшь философию Laravel и почему он так популярен
- Установишь Laravel и настроишь рабочее окружение
- Разберёшься со структурой проекта Laravel
- Научишься работать с Artisan — командной строкой Laravel
- Создашь своё первое Laravel-приложение

---

## 🤔 Почему именно Laravel?

### Краткая история

PHP-фреймворки существуют давно: Symfony, CodeIgniter, Yii, Zend. Но в 2011 году Тэйлор Отвелл создал Laravel, взяв лучшее из существующих решений и добавив свою философию.

**Laravel стал популярным потому, что:**

1. **Elegance** — код красивый и читаемый
2. **Developer Experience** — приятно работать
3. **Batteries Included** — всё есть из коробки
4. **Modern PHP** — использует новейшие возможности языка
5. **Огромное комьюнити** — тысячи пакетов, туториалов, решений

### Философия Laravel

```php
// Вместо этого (чистый PHP):
$stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user && password_verify($password, $user['password'])) {
    $_SESSION['user_id'] = $user['id'];
    header('Location: /dashboard');
    exit;
}

// Laravel даёт тебе:
if (Auth::attempt(['email' => $email, 'password' => $password])) {
    return redirect('/dashboard');
}
```

**Основные принципы:**

- **Expressive, elegant syntax** — код читается как английский текст
- **Convention over Configuration** — умные настройки по умолчанию
- **Don't Repeat Yourself** — переиспользование кода
- **Testability** — лёгкое тестирование из коробки

---

## 🛠️ Установка Laravel

### Требования

```bash
# Проверь версии:
php -v        # PHP >= 8.2
composer -V   # Composer >= 2.0
```

**Необходимые PHP-расширения:**
- OpenSSL
- PDO
- Mbstring
- Tokenizer
- XML
- Ctype
- JSON
- BCMath

### Способ 1: Через Composer (рекомендуется)

```bash
# Создание нового проекта
composer create-project laravel/laravel my-messenger

# Переход в директорию
cd my-messenger

# Запуск встроенного сервера
php artisan serve
```

Открой http://localhost:8000 — увидишь приветственную страницу Laravel! 🎉

### Способ 2: Через Laravel Installer

```bash
# Установка инсталлятора (один раз)
composer global require laravel/installer

# Создание проекта
laravel new my-messenger

# Выбор опций:
# - Testing Framework: Pest
# - Database: MySQL
# - Starter Kit: No starter kit (пока)
```

### Первоначальная настройка

```bash
# 1. Копируй файл окружения
cp .env.example .env

# 2. Сгенерируй ключ приложения
php artisan key:generate

# 3. Настрой БД в .env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=messenger_db
DB_USERNAME=root
DB_PASSWORD=

# 4. Создай базу данных
mysql -u root -p
CREATE DATABASE messenger_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# 5. Запусти миграции
php artisan migrate
```

---

## 📁 Структура проекта Laravel

```
my-messenger/
│
├── app/                    # Основной код приложения
│   ├── Console/           # Artisan-команды
│   ├── Exceptions/        # Обработчики исключений
│   ├── Http/              # Контроллеры, middleware, requests
│   │   ├── Controllers/   # <-- Тут будут твои контроллеры
│   │   └── Middleware/    # Промежуточные слои
│   ├── Models/            # <-- Eloquent модели
│   └── Providers/         # Сервис-провайдеры
│
├── bootstrap/              # Загрузка фреймворка
│   ├── app.php            # Создание приложения
│   └── cache/             # Кеш для оптимизации
│
├── config/                 # Все конфигурационные файлы
│   ├── app.php            # Основные настройки
│   ├── database.php       # Настройки БД
│   └── ...                # И много других
│
├── database/               # Миграции, сидеры, фабрики
│   ├── migrations/        # <-- История изменений БД
│   ├── seeders/           # Заполнение тестовыми данными
│   └── factories/         # Фабрики моделей для тестов
│
├── public/                 # Публичная директория (document root)
│   ├── index.php          # Точка входа в приложение
│   ├── css/               # Скомпилированные стили
│   └── js/                # Скомпилированные скрипты
│
├── resources/              # Исходники (не скомпилированные)
│   ├── views/             # <-- Blade-шаблоны
│   ├── css/               # CSS/SCSS исходники
│   └── js/                # JavaScript исходники
│
├── routes/                 # Определение маршрутов
│   ├── web.php            # <-- Веб-маршруты (с сессиями)
│   ├── api.php            # API-маршруты (без сессий)
│   ├── console.php        # Консольные команды
│   └── channels.php       # Broadcasting каналы
│
├── storage/                # Хранилище (логи, кеш, загрузки)
│   ├── app/               # Файлы приложения
│   ├── framework/         # Кеш, сессии, views
│   └── logs/              # <-- Логи приложения
│
├── tests/                  # Тесты
│   ├── Feature/           # Интеграционные тесты
│   └── Unit/              # Юнит-тесты
│
├── vendor/                 # Composer-зависимости (не трогать!)
│
├── .env                    # Переменные окружения (НЕ КОММИТИТЬ!)
├── artisan                 # CLI инструмент Laravel
├── composer.json           # Зависимости проекта
└── package.json            # npm-зависимости (frontend)
```

### Ключевые директории

**app/** — твой код живёт здесь
- `Models/` — работа с БД через Eloquent
- `Http/Controllers/` — обработка запросов
- `Http/Middleware/` — фильтры перед/после запроса

**routes/** — карта приложения
- `web.php` — для страниц с формами (CSRF-защита, сессии)
- `api.php` — для REST API (stateless, префикс /api)

**resources/views/** — HTML-шаблоны
- Blade-файлы с расширением `.blade.php`

**database/migrations/** — версионирование БД
- Каждое изменение структуры = новая миграция

**config/** — настройки всего
- Используют переменные из `.env`

---

## ⚡ Artisan — швейцарский нож Laravel

Artisan — это CLI (Command Line Interface) Laravel. Он автоматизирует рутину.

### Основные команды

```bash
# Справка по всем командам
php artisan list

# Справка по конкретной команде
php artisan help migrate

# Запуск локального сервера
php artisan serve
php artisan serve --port=8080  # На другом порту

# Очистка и кеширование
php artisan cache:clear         # Очистить кеш приложения
php artisan config:clear        # Очистить кеш конфигов
php artisan route:clear         # Очистить кеш роутов
php artisan view:clear          # Очистить скомпилированные views

php artisan config:cache        # Закешировать конфиги (prod)
php artisan route:cache         # Закешировать роуты (prod)

# База данных
php artisan migrate             # Запустить миграции
php artisan migrate:rollback    # Откатить последний батч
php artisan migrate:fresh       # Удалить все таблицы и создать заново
php artisan migrate:refresh     # Откатить всё и мигрировать заново
php artisan db:seed             # Запустить сидеры

# Генерация кода
php artisan make:controller UserController
php artisan make:model Post
php artisan make:migration create_posts_table
php artisan make:seeder UserSeeder
php artisan make:request StorePostRequest
php artisan make:middleware CheckAge
php artisan make:command SendEmails

# Информация о приложении
php artisan about               # Обзор приложения
php artisan route:list          # Список всех роутов
php artisan tinker              # REPL для экспериментов
```

### Tinker — интерактивная консоль

```bash
php artisan tinker
```

```php
// Внутри tinker можешь выполнять PHP-код:
>>> $user = new App\Models\User;
>>> $user->name = 'John Doe';
>>> $user->email = 'john@example.com';
>>> $user->password = bcrypt('secret');
>>> $user->save();
=> true

>>> App\Models\User::count();
=> 1

>>> App\Models\User::first();
=> App\Models\User {
     id: 1,
     name: "John Doe",
     email: "john@example.com",
     ...
   }
```

**Для выхода:** `exit` или `Ctrl+D`

---

## 🎨 Первое приложение — Hello Laravel

### Шаг 1: Создаём маршрут

**routes/web.php:**
```php
<?php

use Illuminate\Support\Facades\Route;

// Приветственная страница (уже есть)
Route::get('/', function () {
    return view('welcome');
});

// Наш новый маршрут
Route::get('/hello', function () {
    return 'Hello, Laravel!';
});

// Маршрут с параметром
Route::get('/hello/{name}', function ($name) {
    return "Hello, {$name}!";
});

// С параметром по умолчанию
Route::get('/greet/{name?}', function ($name = 'Guest') {
    return "Welcome, {$name}!";
});
```

**Проверь:**
- http://localhost:8000/hello
- http://localhost:8000/hello/John
- http://localhost:8000/greet

### Шаг 2: Создаём view

**resources/views/greeting.blade.php:**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Greeting</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .card {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        h1 {
            margin: 0;
            color: #333;
        }
        p {
            color: #666;
            margin-top: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>Hello, {{ $name }}!</h1>
        <p>Welcome to Laravel</p>
        <p>Current time: {{ now()->format('H:i:s') }}</p>
    </div>
</body>
</html>
```

**routes/web.php:**
```php
Route::get('/greeting/{name?}', function ($name = 'Guest') {
    return view('greeting', ['name' => $name]);
});
```

**Проверь:** http://localhost:8000/greeting/Alice

### Шаг 3: Создаём контроллер

```bash
php artisan make:controller GreetingController
```

**app/Http/Controllers/GreetingController.php:**
```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class GreetingController extends Controller
{
    public function show($name = 'Guest')
    {
        $data = [
            'name' => $name,
            'visitors' => rand(100, 999),
            'quote' => $this->getRandomQuote()
        ];
        
        return view('greeting', $data);
    }
    
    private function getRandomQuote()
    {
        $quotes = [
            'The only way to do great work is to love what you do.',
            'Innovation distinguishes between a leader and a follower.',
            'Stay hungry, stay foolish.',
            'Code is like humor. When you have to explain it, it's bad.'
        ];
        
        return $quotes[array_rand($quotes)];
    }
}
```

**routes/web.php:**
```php
use App\Http\Controllers\GreetingController;

Route::get('/greeting/{name?}', [GreetingController::class, 'show']);
```

**Обнови view (resources/views/greeting.blade.php):**
```html
<div class="card">
    <h1>Hello, {{ $name }}!</h1>
    <p>Welcome to Laravel</p>
    <p>Current time: {{ now()->format('H:i:s') }}</p>
    <p>Today's visitors: {{ $visitors }}</p>
    <blockquote style="border-left: 3px solid #667eea; padding-left: 1rem; margin-top: 1rem; font-style: italic;">
        {{ $quote }}
    </blockquote>
</div>
```

---

## 🔍 Как работает Laravel изнутри

### Жизненный цикл запроса

```
1. public/index.php
   ↓
2. bootstrap/app.php (создание Application)
   ↓
3. HTTP Kernel (обработка запроса)
   ↓
4. Middleware (до контроллера)
   ↓
5. Router (поиск маршрута)
   ↓
6. Controller/Closure (обработка)
   ↓
7. Response (формирование ответа)
   ↓
8. Middleware (после контроллера)
   ↓
9. Отправка Response клиенту
   ↓
10. Terminate Middleware
```

### Service Container — сердце Laravel

```php
// Laravel автоматически создаёт зависимости:
class UserController extends Controller
{
    // Не нужно делать: $request = new Request();
    // Laravel сам внедрит Request!
    public function store(Request $request)
    {
        // $request уже готов к использованию
        $name = $request->input('name');
    }
}
```

**Это называется Dependency Injection** — мы изучали в главе 5.3!

### Facades — удобный доступ к сервисам

```php
// Вместо:
$container = app();
$db = $container->make('db');
$users = $db->table('users')->get();

// Можно:
use Illuminate\Support\Facades\DB;

$users = DB::table('users')->get();
```

**Популярные фасады:**
- `Route` — роутинг
- `DB` — база данных
- `Auth` — аутентификация
- `Cache` — кеширование
- `Storage` — работа с файлами
- `Mail` — отправка email
- `Log` — логирование

---

## 🏗️ Сравнение: чистый PHP vs Laravel

### Подключение к БД и выборка

**Чистый PHP (как мы делали):**
```php
$dsn = "mysql:host=localhost;dbname=mydb;charset=utf8mb4";
$pdo = new PDO($dsn, 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

$stmt = $pdo->prepare('SELECT * FROM users WHERE active = ?');
$stmt->execute([1]);
$users = $stmt->fetchAll();
```

**Laravel:**
```php
use App\Models\User;

$users = User::where('active', 1)->get();
```

### Создание записи

**Чистый PHP:**
```php
$stmt = $pdo->prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
$stmt->execute([
    $_POST['name'],
    $_POST['email'],
    password_hash($_POST['password'], PASSWORD_BCRYPT)
]);
$userId = $pdo->lastInsertId();
```

**Laravel:**
```php
$user = User::create([
    'name' => $request->name,
    'email' => $request->email,
    'password' => bcrypt($request->password)
]);
```

### Валидация

**Чистый PHP:**
```php
$errors = [];

if (empty($_POST['email'])) {
    $errors[] = 'Email is required';
} elseif (!filter_var($_POST['email'], FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Invalid email format';
}

if (strlen($_POST['password']) < 8) {
    $errors[] = 'Password must be at least 8 characters';
}

if (!empty($errors)) {
    // показать ошибки
}
```

**Laravel:**
```php
$validated = $request->validate([
    'email' => 'required|email',
    'password' => 'required|min:8'
]);
// Если не прошло — автоматически вернёт назад с ошибками
```

---

## 📝 Практические задания

### Задание 1: Установка и первый запуск ⭐

1. Установи Laravel командой `composer create-project laravel/laravel blog`
2. Настрой `.env` файл
3. Запусти `php artisan serve`
4. Открой браузер и убедись, что видишь приветственную страницу

### Задание 2: Artisan исследование ⭐

1. Выполни `php artisan list` и найди 5 команд, которые кажутся интересными
2. Используй `php artisan help` для одной из них
3. Выполни `php artisan route:list` — что ты видишь?
4. Запусти `php artisan tinker` и попробуй:
   ```php
   >>> 2 + 2
   >>> now()
   >>> config('app.name')
   >>> exit
   ```

### Задание 3: Калькулятор на маршрутах ⭐⭐

Создай маршруты для простого калькулятора:

```php
// Результат: http://localhost:8000/calc/add/5/3 → 8
Route::get('/calc/add/{a}/{b}', function ($a, $b) {
    // твой код
});

Route::get('/calc/subtract/{a}/{b}', function ($a, $b) {
    // твой код
});

Route::get('/calc/multiply/{a}/{b}', function ($a, $b) {
    // твой код
});

Route::get('/calc/divide/{a}/{b}', function ($a, $b) {
    // твой код (не забудь проверку на 0!)
});
```

### Задание 4: Страница "О себе" ⭐⭐

1. Создай контроллер `php artisan make:controller AboutController`
2. Создай view `resources/views/about.blade.php` с информацией о себе
3. Добавь маршрут `/about` который показывает эту страницу
4. Передай в view массив со своими увлечениями и выведи их списком

**Пример:**
```php
// AboutController.php
public function index()
{
    return view('about', [
        'name' => 'John',
        'hobbies' => ['coding', 'reading', 'gaming'],
        'skills' => ['PHP', 'Laravel', 'JavaScript']
    ]);
}
```

```html
<!-- about.blade.php -->
<h1>About {{ $name }}</h1>

<h2>Hobbies:</h2>
<ul>
    @foreach($hobbies as $hobby)
        <li>{{ $hobby }}</li>
    @endforeach
</ul>
```

### Задание 5: Счётчик посещений ⭐⭐⭐

Создай страницу с счётчиком посещений используя сессии:

```php
// CounterController.php
public function show()
{
    $visits = session('visits', 0) + 1;
    session(['visits' => $visits]);
    
    return view('counter', ['visits' => $visits]);
}

public function reset()
{
    session()->forget('visits');
    return redirect('/counter');
}
```

**Маршруты:**
```php
Route::get('/counter', [CounterController::class, 'show']);
Route::get('/counter/reset', [CounterController::class, 'reset']);
```

**Бонус:** добавь время последнего посещения.

---

## ❓ Вопросы для самопроверки

1. **Философия:** Назови 3 принципа, которые отличают Laravel от других фреймворков
2. **Структура:** Для чего нужна директория `app/Http/Controllers/`?
3. **Структура:** В какой директории находятся Blade-шаблоны?
4. **Artisan:** Какая команда создаёт новый контроллер?
5. **Artisan:** Как запустить встроенный веб-сервер?
6. **Маршруты:** В каком файле определяются веб-маршруты?
7. **Маршруты:** В чём разница между `web.php` и `api.php`?
8. **View:** Какое расширение имеют Blade-шаблоны?
9. **Lifecycle:** Что является точкой входа в Laravel-приложение?
10. **Сравнение:** Напиши в одну строку Laravel-код для получения всех активных пользователей

---

## 🎓 Что дальше?

Ты познакомился с Laravel! Теперь ты знаешь:
- ✅ Как установить и настроить Laravel
- ✅ Структуру проекта и назначение директорий
- ✅ Основы работы с Artisan
- ✅ Как создавать простые маршруты и контроллеры
- ✅ Разницу между чистым PHP и Laravel

**В следующей главе (8.2)** мы глубоко погрузимся в **роутинг**: параметры, ограничения, группы, named routes, middleware и многое другое.

---

## 💡 Полезные ссылки

- [Официальная документация Laravel](https://laravel.com/docs)
- [Laracasts](https://laracasts.com) — видеоуроки по Laravel
- [Laravel News](https://laravel-news.com) — новости и статьи
- [Awesome Laravel](https://github.com/chiraggude/awesome-laravel) — подборка ресурсов

---

**Готов продолжить? Напиши:**
```
Глава 8.2: Роутинг в Laravel — web.php, api.php, параметры, группы, named routes
```