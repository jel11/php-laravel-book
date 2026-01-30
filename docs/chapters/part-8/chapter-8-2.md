# Глава 8.2: Роутинг в Laravel — web.php, api.php, параметры, группы, named routes

## 📖 Введение

Поздравляю с первым знакомством с Laravel! Теперь, когда вы понимаете общую философию фреймворка, пора погрузиться в одну из самых важных его частей — **систему роутинга**.

Роутинг — это механизм, который определяет, какой код должен выполниться при обращении к конкретному URL. По сути, это карта вашего приложения: она говорит Laravel, что делать, когда пользователь заходит на `/users`, `/products/123` или любой другой адрес.

В этой главе мы разберём:
- Как устроена система роутинга в Laravel
- Разницу между `web.php` и `api.php`
- Работу с параметрами URL
- Группировку маршрутов
- Именованные маршруты и генерацию ссылок

---

## 🗺️ Основы роутинга

### Где живут маршруты?

После установки Laravel все маршруты находятся в директории `routes/`:

```
routes/
├── web.php      # Маршруты для веб-интерфейса
├── api.php      # Маршруты для API
├── console.php  # Artisan команды
└── channels.php # Broadcasting каналы
```

Пока сконцентрируемся на первых двух файлах.

### Простейший маршрут

Откройте `routes/web.php`:

```php
<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});
```

Это базовый маршрут, который создаётся автоматически. Разберём его:

- `Route::get()` — регистрируем маршрут для GET-запросов
- `'/'` — URI (адрес), который обрабатывается
- `function () { ... }` — замыкание (анонимная функция), которая выполнится

### HTTP методы

Laravel поддерживает все стандартные HTTP методы:

```php
Route::get('/users', function () {
    return 'Список пользователей';
});

Route::post('/users', function () {
    return 'Создание пользователя';
});

Route::put('/users/{id}', function ($id) {
    return "Обновление пользователя $id";
});

Route::patch('/users/{id}', function ($id) {
    return "Частичное обновление пользователя $id";
});

Route::delete('/users/{id}', function ($id) {
    return "Удаление пользователя $id";
});

// Несколько методов сразу
Route::match(['get', 'post'], '/search', function () {
    return 'Поиск';
});

// Все методы
Route::any('/debug', function () {
    return 'Отладочная страница';
});
```

**Важно:** HTML-формы поддерживают только GET и POST. Для PUT, PATCH и DELETE Laravel использует специальный трюк — скрытое поле `_method`:

```html
<form action="/users/1" method="POST">
    @csrf
    @method('PUT')
    <!-- Поля формы -->
</form>
```

---

## 🎯 Параметры маршрутов

### Обязательные параметры

Параметры определяются в фигурных скобках:

```php
Route::get('/users/{id}', function ($id) {
    return "Пользователь #$id";
});

// Несколько параметров
Route::get('/posts/{postId}/comments/{commentId}', function ($postId, $commentId) {
    return "Комментарий #$commentId к посту #$postId";
});
```

Когда пользователь заходит на `/users/42`, переменная `$id` будет содержать `42`.

### Необязательные параметры

Добавьте знак вопроса после имени параметра:

```php
Route::get('/users/{name?}', function ($name = 'Гость') {
    return "Привет, $name!";
});

// /users → "Привет, Гость!"
// /users/Иван → "Привет, Иван!"
```

**Обязательно** указывайте значение по умолчанию для необязательных параметров!

### Ограничения параметров (constraints)

Используйте метод `where()` для валидации параметров:

```php
// Только цифры
Route::get('/users/{id}', function ($id) {
    return "Пользователь #$id";
})->where('id', '[0-9]+');

// Только буквы
Route::get('/users/{name}', function ($name) {
    return "Пользователь: $name";
})->where('name', '[A-Za-z]+');

// Несколько ограничений
Route::get('/posts/{id}/comments/{comment}', function ($id, $comment) {
    // ...
})->where(['id' => '[0-9]+', 'comment' => '[0-9]+']);

// Именованные шаблоны (для переиспользования)
Route::get('/users/{id}', function ($id) {
    // ...
})->whereNumber('id');

Route::get('/users/{name}', function ($name) {
    // ...
})->whereAlpha('name');

Route::get('/search/{term}', function ($term) {
    // ...
})->whereAlphaNumeric('term');

Route::get('/profile/{user}', function ($user) {
    // ...
})->whereUuid('user');
```

**Глобальные ограничения** — если хотите, чтобы параметр `id` всегда был числом:

```php
// В app/Providers/RouteServiceProvider.php (Laravel 10) или
// В bootstrap/app.php (Laravel 11)

Route::pattern('id', '[0-9]+');
```

Теперь во всех маршрутах параметр `{id}` будет автоматически проверяться.

---

## 🎨 Именованные маршруты

Именованные маршруты позволяют генерировать URL, не привязываясь к конкретному пути.

### Зачем это нужно?

Представьте, у вас есть маршрут:

```php
Route::get('/admin/users/profile', function () {
    return 'Профиль';
});
```

И вы используете его в 50 местах приложения:

```php
<a href="/admin/users/profile">Профиль</a>
```

Если вы решите изменить URL на `/dashboard/user-profile`, придётся менять все 50 ссылок!

**Решение — именованные маршруты:**

```php
Route::get('/admin/users/profile', function () {
    return 'Профиль';
})->name('profile');
```

Теперь генерируйте ссылки по имени:

```php
<a href="{{ route('profile') }}">Профиль</a>
```

Меняйте URL сколько угодно — ссылки останутся рабочими!

### Именованные маршруты с параметрами

```php
Route::get('/users/{id}', function ($id) {
    return "Пользователь #$id";
})->name('user.show');

// В шаблоне
<a href="{{ route('user.show', ['id' => 42]) }}">Пользователь 42</a>
// Результат: /users/42

// Можно передавать объекты (Laravel сам возьмёт id)
$user = User::find(42);
<a href="{{ route('user.show', $user) }}">Профиль</a>
```

### Проверка текущего маршрута

```php
// В контроллере или middleware
if (request()->route()->named('profile')) {
    // Мы на странице профиля
}

// В Blade-шаблоне
@if (Route::currentRouteName() === 'profile')
    <li class="active">Профиль</li>
@endif
```

---

## 📁 Группы маршрутов

Группы позволяют применять общие настройки к нескольким маршрутам.

### Префикс URL

```php
Route::prefix('admin')->group(function () {
    Route::get('/users', function () {
        // URL: /admin/users
    });
    
    Route::get('/posts', function () {
        // URL: /admin/posts
    });
});
```

### Префикс имени

```php
Route::name('admin.')->group(function () {
    Route::get('/users', function () {
        // ...
    })->name('users'); // Имя: admin.users
    
    Route::get('/posts', function () {
        // ...
    })->name('posts'); // Имя: admin.posts
});
```

### Middleware

```php
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        // Только для авторизованных и подтвердивших email
    });
    
    Route::get('/profile', function () {
        // Тоже защищено
    });
});
```

### Комбинирование

```php
Route::prefix('admin')
    ->middleware('auth')
    ->name('admin.')
    ->group(function () {
        Route::get('/users', function () {
            // URL: /admin/users
            // Имя: admin.users
            // Middleware: auth
        })->name('users');
    });
```

### Вложенные группы

```php
Route::prefix('admin')->group(function () {
    Route::prefix('users')->group(function () {
        Route::get('/', function () {
            // URL: /admin/users
        });
        
        Route::get('/{id}', function ($id) {
            // URL: /admin/users/42
        });
    });
});
```

---

## 🌐 web.php vs api.php

### routes/web.php

**Для чего:** Традиционные веб-страницы с HTML

**Особенности:**
- Автоматически применяется middleware группа `web`
- Включает сессии, CSRF-защиту, cookie-шифрование
- Подходит для Blade-шаблонов и форм

```php
Route::get('/login', function () {
    return view('auth.login');
});

Route::post('/login', function () {
    // Здесь работает CSRF-защита
    // Доступны сессии
});
```

### routes/api.php

**Для чего:** REST API для мобильных приложений, SPA

**Особенности:**
- Автоматически применяется middleware группа `api`
- Автоматический префикс `/api` для всех маршрутов
- Нет сессий и CSRF (используются токены)
- Throttling (ограничение частоты запросов) по умолчанию

```php
// В routes/api.php
Route::get('/users', function () {
    return User::all(); // Laravel автоматически вернёт JSON
});

// Доступно по адресу: /api/users
```

**Отключение префикса `/api`:**

В Laravel 11 это настраивается в `bootstrap/app.php`:

```php
->withRouting(
    web: __DIR__.'/../routes/web.php',
    api: __DIR__.'/../routes/api.php',
    apiPrefix: '', // Убираем префикс
)
```

---

## 🎯 Маршруты к контроллерам

Пока мы использовали замыкания, но в реальных проектах логика живёт в контроллерах:

```php
use App\Http\Controllers\UserController;

Route::get('/users', [UserController::class, 'index']);
Route::get('/users/{id}', [UserController::class, 'show']);
Route::post('/users', [UserController::class, 'store']);
```

### Resource-маршруты

Для типичных CRUD-операций есть сокращённая запись:

```php
Route::resource('users', UserController::class);
```

Это автоматически создаёт 7 маршрутов:

| Метод | URI | Action | Имя маршрута |
|-------|-----|--------|--------------|
| GET | `/users` | index | users.index |
| GET | `/users/create` | create | users.create |
| POST | `/users` | store | users.store |
| GET | `/users/{id}` | show | users.show |
| GET | `/users/{id}/edit` | edit | users.edit |
| PUT/PATCH | `/users/{id}` | update | users.update |
| DELETE | `/users/{id}` | destroy | users.destroy |

**Частичные ресурсы:**

```php
// Только определённые действия
Route::resource('users', UserController::class)
    ->only(['index', 'show']);

// Все кроме указанных
Route::resource('users', UserController::class)
    ->except(['create', 'store']);
```

**API ресурсы** (без create и edit, которые возвращают HTML-формы):

```php
Route::apiResource('users', UserController::class);
```

---

## 🔍 Вспомогательные функции

### Получение текущего маршрута

```php
$route = request()->route();
$name = request()->route()->getName();
$uri = request()->path(); // users/42
$url = request()->url();  // http://example.com/users/42
```

### Перенаправления

```php
// По URL
return redirect('/home');

// По имени маршрута
return redirect()->route('profile');

// С параметрами
return redirect()->route('user.show', ['id' => 42]);

// Назад
return redirect()->back();

// С данными флеш-сессии
return redirect()->route('profile')->with('status', 'Профиль обновлён!');
```

### Генерация URL

```php
// Абсолютный URL
$url = url('/users/42'); // http://example.com/users/42

// По имени маршрута
$url = route('user.show', ['id' => 42]);

// Текущий URL с query параметрами
$url = request()->fullUrl(); // http://example.com/users?filter=active
```

---

## 💡 Практические примеры

### Пример 1: Блог

```php
Route::prefix('blog')->name('blog.')->group(function () {
    Route::get('/', [PostController::class, 'index'])->name('index');
    Route::get('/{slug}', [PostController::class, 'show'])->name('show');
    
    Route::middleware('auth')->group(function () {
        Route::get('/create', [PostController::class, 'create'])->name('create');
        Route::post('/', [PostController::class, 'store'])->name('store');
        Route::get('/{id}/edit', [PostController::class, 'edit'])->name('edit');
        Route::put('/{id}', [PostController::class, 'update'])->name('update');
        Route::delete('/{id}', [PostController::class, 'destroy'])->name('destroy');
    });
});

// Использование:
<a href="{{ route('blog.index') }}">Все посты</a>
<a href="{{ route('blog.show', $post->slug) }}">{{ $post->title }}</a>
<a href="{{ route('blog.create') }}">Написать пост</a>
```

### Пример 2: API для мобильного приложения

```php
// routes/api.php

Route::prefix('v1')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    
    Route::middleware('auth:sanctum')->group(function () {
        Route::apiResource('posts', PostController::class);
        Route::apiResource('comments', CommentController::class);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// Доступно по адресам:
// /api/v1/login
// /api/v1/posts
// /api/v1/posts/{id}
```

### Пример 3: Многоязычность

```php
Route::prefix('{locale}')->where(['locale' => 'ru|en'])->group(function () {
    Route::get('/', [HomeController::class, 'index']);
    Route::get('/about', [AboutController::class, 'index']);
    Route::get('/contact', [ContactController::class, 'index']);
});

// URLs:
// /ru/
// /en/about
// /ru/contact
```

---

## ⚠️ Частые ошибки

### 1. Порядок маршрутов имеет значение

```php
// ❌ НЕПРАВИЛЬНО
Route::get('/users/{name}', function ($name) {
    return "Привет, $name";
});

Route::get('/users/admin', function () {
    return "Админ-панель";
});

// При обращении к /users/admin сработает первый маршрут!
// Laravel подумает, что "admin" — это значение параметра {name}
```

```php
// ✅ ПРАВИЛЬНО
Route::get('/users/admin', function () {
    return "Админ-панель";
});

Route::get('/users/{name}', function ($name) {
    return "Привет, $name";
});

// Более специфичные маршруты должны быть выше!
```

### 2. Забытый CSRF-токен

```php
// В routes/web.php
Route::post('/users', function () {
    // Если в форме нет @csrf, получите 419 ошибку
});

// В Blade-шаблоне всегда добавляйте:
<form method="POST">
    @csrf
    <!-- Поля формы -->
</form>
```

### 3. Неправильный HTTP-метод

```php
// Маршрут ожидает POST
Route::post('/users', [UserController::class, 'store']);

// Форма отправляет GET — 404 ошибка
<form action="/users" method="GET"> <!-- ❌ -->

// Правильно:
<form action="/users" method="POST"> <!-- ✅ -->
    @csrf
</form>
```

---

## 📝 Упражнения

### Упражнение 1: Основы

Создайте в `routes/web.php` следующие маршруты:

1. Главная страница `/` — вернуть "Добро пожаловать"
2. Страница "О нас" `/about` — вернуть "О нашей компании"
3. Страница продукта `/products/{id}` — вернуть "Продукт #ID" (только числа)
4. Поиск `/search` (GET и POST) — вернуть "Результаты поиска"

<details>
<summary>Решение</summary>

```php
Route::get('/', function () {
    return 'Добро пожаловать';
});

Route::get('/about', function () {
    return 'О нашей компании';
});

Route::get('/products/{id}', function ($id) {
    return "Продукт #$id";
})->whereNumber('id');

Route::match(['get', 'post'], '/search', function () {
    return 'Результаты поиска';
});
```

</details>

### Упражнение 2: Именованные маршруты

1. Создайте именованный маршрут `home` для главной страницы
2. Создайте маршрут `user.profile` для `/users/{id}/profile`
3. В любом маршруте используйте `route()` для генерации ссылки на профиль пользователя с ID=5

<details>
<summary>Решение</summary>

```php
Route::get('/', function () {
    return 'Главная';
})->name('home');

Route::get('/users/{id}/profile', function ($id) {
    return "Профиль пользователя $id";
})->name('user.profile');

Route::get('/test', function () {
    $url = route('user.profile', ['id' => 5]);
    return "Ссылка на профиль: $url";
});
```

</details>

### Упражнение 3: Группы

Создайте группу маршрутов с префиксом `/admin`:
- `/admin/dashboard` — панель управления
- `/admin/users` — список пользователей
- `/admin/settings` — настройки

Все маршруты должны иметь префикс имени `admin.` и middleware `auth`.

<details>
<summary>Решение</summary>

```php
Route::prefix('admin')
    ->middleware('auth')
    ->name('admin.')
    ->group(function () {
        Route::get('/dashboard', function () {
            return 'Панель управления';
        })->name('dashboard');
        
        Route::get('/users', function () {
            return 'Список пользователей';
        })->name('users');
        
        Route::get('/settings', function () {
            return 'Настройки';
        })->name('settings');
    });

// Имена маршрутов: admin.dashboard, admin.users, admin.settings
// URL: /admin/dashboard, /admin/users, /admin/settings
```

</details>

### Упражнение 4: API маршруты

В `routes/api.php` создайте API для управления задачами:
- GET `/tasks` — список задач
- POST `/tasks` — создание задачи
- GET `/tasks/{id}` — одна задача
- PUT `/tasks/{id}` — обновление задачи
- DELETE `/tasks/{id}` — удаление задачи

Используйте resource-маршрут.

<details>
<summary>Решение</summary>

```php
// routes/api.php
use App\Http\Controllers\TaskController;

Route::apiResource('tasks', TaskController::class);

// Это создаст все необходимые маршруты:
// GET    /api/tasks           -> index
// POST   /api/tasks           -> store
// GET    /api/tasks/{id}      -> show
// PUT    /api/tasks/{id}      -> update
// DELETE /api/tasks/{id}      -> destroy
```

</details>

---

## 🎓 Практическое задание: Каталог товаров

Создайте систему роутинга для интернет-магазина:

**Требования:**

1. **Публичная часть:**
   - Главная `/`
   - Каталог `/products`
   - Товар `/products/{id}` (только числа)
   - Категория `/categories/{slug}` (буквы и дефисы)
   - Корзина `/cart`

2. **Админка:**
   - Группа с префиксом `/admin` и middleware `auth`
   - Панель управления `/admin/dashboard`
   - CRUD товаров через resource-контроллер
   - CRUD категорий через resource-контроллер

3. **API:**
   - В `routes/api.php` создайте API-версию каталога
   - GET `/api/products` — список товаров
   - GET `/api/products/{id}` — один товар

4. **Именование:**
   - Все маршруты должны быть именованными
   - Публичные: `home`, `products.index`, `products.show`, и т.д.
   - Админка: `admin.dashboard`, `admin.products.index`, и т.д.

<details>
<summary>Решение</summary>

```php
// routes/web.php
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\Admin\AdminProductController;
use App\Http\Controllers\Admin\AdminCategoryController;

// Публичная часть
Route::get('/', function () {
    return view('home');
})->name('home');

Route::get('/products', [ProductController::class, 'index'])->name('products.index');
Route::get('/products/{id}', [ProductController::class, 'show'])
    ->whereNumber('id')
    ->name('products.show');

Route::get('/categories/{slug}', [CategoryController::class, 'show'])
    ->where('slug', '[a-z0-9-]+')
    ->name('categories.show');

Route::get('/cart', function () {
    return view('cart');
})->name('cart');

// Админка
Route::prefix('admin')
    ->middleware('auth')
    ->name('admin.')
    ->group(function () {
        Route::get('/dashboard', function () {
            return view('admin.dashboard');
        })->name('dashboard');
        
        Route::resource('products', AdminProductController::class);
        Route::resource('categories', AdminCategoryController::class);
    });

// routes/api.php
use App\Http\Controllers\Api\ProductController as ApiProductController;

Route::prefix('products')->group(function () {
    Route::get('/', [ApiProductController::class, 'index']);
    Route::get('/{id}', [ApiProductController::class, 'show']);
});
```

</details>

---

## 🔑 Ключевые выводы

1. **Роутинг — это карта приложения**, связывающая URL с кодом
2. **web.php для HTML-страниц** с сессиями и CSRF, **api.php для API** с токенами
3. **Параметры в фигурных скобках** `{id}`, ограничения через `where()` или `whereNumber()`
4. **Именованные маршруты** защищают от рефакторинга URL
5. **Группы объединяют** маршруты с общими настройками (префикс, middleware)
6. **Resource-маршруты** — короткая запись для CRUD-операций
7. **Порядок маршрутов важен** — специфичные выше, общие ниже

---

## 📚 Дополнительные материалы

- [Документация Laravel: Routing](https://laravel.com/docs/routing)
- [Документация Laravel: Controllers](https://laravel.com/docs/controllers)
- [Laracasts: Routes and Controllers](https://laracasts.com/series/laravel-8-from-scratch/episodes/9)

---

## Вопросы для самопроверки

1. В чём разница между `Route::get()` и `Route::post()`?
2. Как сделать параметр маршрута необязательным?
3. Зачем нужны именованные маршруты?
4. Какая разница между `web.php` и `api.php`?
5. Что создаёт `Route::resource('users', UserController::class)`?
6. Как ограничить параметр `{id}` только цифрами?
7. Почему порядок маршрутов имеет значение?
8. Как сгенерировать URL по имени маршрута с параметрами?

---

**Следующая глава:** Глава 8.3 — Контроллеры: создание, resource-контроллеры, Form Requests, middleware

Отличная работа! Вы освоили систему роутинга Laravel — фундамент для построения любого веб-приложения. В следующей главе мы переместим логику из замыканий в контроллеры и научимся структурировать код профессионально. 🚀