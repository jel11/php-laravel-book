# Глава 8.3: Контроллеры — создание, resource-контроллеры, Form Requests, middleware

## 📋 Содержание главы

1. Что такое контроллер и зачем он нужен
2. Создание контроллеров через Artisan
3. Структура и методы контроллера
4. Resource-контроллеры (RESTful подход)
5. Single Action Controllers
6. Form Requests — валидация как класс
7. Middleware — фильтры для запросов
8. Практика: CRUD блога с авторизацией

---

## 1. Что такое контроллер и зачем он нужен

### Теория

**Контроллер** — это класс, который обрабатывает HTTP-запросы и возвращает ответы. Это буква **C** в паттерне **MVC**.

**Задачи контроллера:**
- Получить данные из запроса
- Вызвать нужную бизнес-логику (модели, сервисы)
- Подготовить данные для отображения
- Вернуть представление (view) или JSON

**❌ Что НЕ должно быть в контроллере:**
- Прямые SQL-запросы (используй модели)
- Сложная бизнес-логика (вынеси в сервисы)
- HTML-разметка (используй Blade)

### Сравнение: было vs стало

**Было (всё в routes/web.php):**

```php
Route::get('/posts', function () {
    $posts = DB::table('posts')->get();
    return view('posts.index', ['posts' => $posts]);
});

Route::post('/posts', function (Request $request) {
    DB::table('posts')->insert([
        'title' => $request->title,
        'content' => $request->content,
    ]);
    return redirect('/posts');
});
```

**Стало (контроллер):**

```php
// routes/web.php
Route::get('/posts', [PostController::class, 'index']);
Route::post('/posts', [PostController::class, 'store']);

// app/Http/Controllers/PostController.php
class PostController extends Controller
{
    public function index()
    {
        $posts = Post::all();
        return view('posts.index', compact('posts'));
    }

    public function store(Request $request)
    {
        Post::create($request->validated());
        return redirect()->route('posts.index');
    }
}
```

**Преимущества:**
- ✅ Роуты читаемые и короткие
- ✅ Логика сгруппирована по сущностям
- ✅ Легко тестировать
- ✅ Можно переиспользовать middleware

---

## 2. Создание контроллеров через Artisan

### Базовый контроллер

```bash
php artisan make:controller PostController
```

Создаст файл `app/Http/Controllers/PostController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PostController extends Controller
{
    //
}
```

### Resource-контроллер (с готовыми методами)

```bash
php artisan make:controller PostController --resource
```

Создаст контроллер с 7 стандартными методами (об этом ниже).

### Контроллер с моделью

```bash
php artisan make:controller PostController --resource --model=Post
```

Автоматически добавит type hints для модели в методы.

### API контроллер

```bash
php artisan make:controller PostController --api
```

Создаст resource-контроллер без методов `create` и `edit` (они не нужны для API).

### Invokable контроллер (single action)

```bash
php artisan make:controller SendEmailController --invokable
```

Создаст контроллер с одним методом `__invoke()`.

---

## 3. Структура и методы контроллера

### Базовый пример

```php
<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function index()
    {
        $posts = Post::latest()->paginate(10);
        return view('posts.index', compact('posts'));
    }

    public function show(Post $post)
    {
        // Route Model Binding — Laravel автоматически найдёт пост по ID
        return view('posts.show', compact('post'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|max:255',
            'content' => 'required',
        ]);

        $post = Post::create($validated);

        return redirect()->route('posts.show', $post)
            ->with('success', 'Пост создан!');
    }

    public function destroy(Post $post)
    {
        $post->delete();
        return redirect()->route('posts.index')
            ->with('success', 'Пост удалён!');
    }
}
```

### Способы возврата ответов

```php
// 1. Представление (view)
return view('posts.index', ['posts' => $posts]);

// 2. JSON (для API)
return response()->json(['data' => $posts]);

// 3. Редирект
return redirect()->route('posts.show', $post);

// 4. Редирект с сообщением
return back()->with('error', 'Что-то пошло не так');

// 5. Файл для скачивания
return response()->download($pathToFile);

// 6. Строка (редко используется)
return 'Привет, мир!';

// 7. HTTP статус
return response('Unauthorized', 401);
```

---

## 4. Resource-контроллеры (RESTful подход)

### Что такое RESTful?

**REST** (Representational State Transfer) — набор соглашений для построения API.

**7 стандартных действий (CRUD + формы):**

| Метод HTTP | URI               | Action  | Описание                    |
|------------|-------------------|---------|-----------------------------|
| GET        | /posts            | index   | Показать список постов      |
| GET        | /posts/create     | create  | Показать форму создания     |
| POST       | /posts            | store   | Сохранить новый пост        |
| GET        | /posts/{id}       | show    | Показать один пост          |
| GET        | /posts/{id}/edit  | edit    | Показать форму редактирования |
| PUT/PATCH  | /posts/{id}       | update  | Обновить пост               |
| DELETE     | /posts/{id}       | destroy | Удалить пост                |

### Создание resource-контроллера

```bash
php artisan make:controller PostController --resource --model=Post
```

```php
<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;

class PostController extends Controller
{
    // GET /posts
    public function index()
    {
        $posts = Post::all();
        return view('posts.index', compact('posts'));
    }

    // GET /posts/create
    public function create()
    {
        return view('posts.create');
    }

    // POST /posts
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|max:255',
            'content' => 'required',
        ]);

        $post = Post::create($validated);

        return redirect()->route('posts.show', $post);
    }

    // GET /posts/{post}
    public function show(Post $post)
    {
        return view('posts.show', compact('post'));
    }

    // GET /posts/{post}/edit
    public function edit(Post $post)
    {
        return view('posts.edit', compact('post'));
    }

    // PUT/PATCH /posts/{post}
    public function update(Request $request, Post $post)
    {
        $validated = $request->validate([
            'title' => 'required|max:255',
            'content' => 'required',
        ]);

        $post->update($validated);

        return redirect()->route('posts.show', $post);
    }

    // DELETE /posts/{post}
    public function destroy(Post $post)
    {
        $post->delete();
        return redirect()->route('posts.index');
    }
}
```

### Регистрация resource-роутов

```php
// routes/web.php
Route::resource('posts', PostController::class);
```

Это заменяет 7 отдельных роутов! Проверь командой:

```bash
php artisan route:list
```

### Частичное использование resource

```php
// Только index, show, store
Route::resource('posts', PostController::class)
    ->only(['index', 'show', 'store']);

// Все, кроме destroy
Route::resource('posts', PostController::class)
    ->except(['destroy']);
```

### Именованные роуты

Laravel автоматически создаёт имена:

```php
posts.index   // GET /posts
posts.create  // GET /posts/create
posts.store   // POST /posts
posts.show    // GET /posts/{post}
posts.edit    // GET /posts/{post}/edit
posts.update  // PUT /posts/{post}
posts.destroy // DELETE /posts/{post}
```

Использование:

```blade
<a href="{{ route('posts.show', $post) }}">Читать</a>
<a href="{{ route('posts.edit', $post) }}">Редактировать</a>

<form action="{{ route('posts.destroy', $post) }}" method="POST">
    @csrf
    @method('DELETE')
    <button>Удалить</button>
</form>
```

---

## 5. Single Action Controllers

Если контроллер выполняет **только одно действие**, используй `__invoke()`:

```bash
php artisan make:controller SendWelcomeEmailController --invokable
```

```php
<?php

namespace App\Http\Controllers;

use App\Mail\WelcomeEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class SendWelcomeEmailController extends Controller
{
    public function __invoke(Request $request)
    {
        Mail::to($request->user())->send(new WelcomeEmail());
        
        return back()->with('success', 'Письмо отправлено!');
    }
}
```

**Регистрация роута:**

```php
Route::post('/send-welcome', SendWelcomeEmailController::class);
```

**Когда использовать?**
- Отправка email
- Генерация отчёта
- Экспорт данных
- Любое атомарное действие

---

## 6. Form Requests — валидация как класс

### Проблема

Валидация в контроллере раздувает код:

```php
public function store(Request $request)
{
    $request->validate([
        'title' => 'required|max:255',
        'content' => 'required|min:10',
        'published_at' => 'nullable|date',
        'author_id' => 'required|exists:users,id',
        'tags' => 'array',
        'tags.*' => 'exists:tags,id',
    ]);
    
    // Логика сохранения...
}
```

### Решение — Form Request

```bash
php artisan make:request StorePostRequest
```

Создаст `app/Http/Requests/StorePostRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePostRequest extends FormRequest
{
    /**
     * Определить, может ли пользователь делать этот запрос
     */
    public function authorize(): bool
    {
        // true — разрешить всем
        // Или проверка прав: return $this->user()->can('create', Post::class);
        return true;
    }

    /**
     * Правила валидации
     */
    public function rules(): array
    {
        return [
            'title' => 'required|max:255',
            'content' => 'required|min:10',
            'published_at' => 'nullable|date',
            'author_id' => 'required|exists:users,id',
            'tags' => 'array',
            'tags.*' => 'exists:tags,id',
        ];
    }

    /**
     * Кастомные сообщения об ошибках
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Заголовок обязателен!',
            'content.min' => 'Контент должен содержать минимум :min символов',
        ];
    }

    /**
     * Кастомные имена полей для сообщений
     */
    public function attributes(): array
    {
        return [
            'published_at' => 'дата публикации',
        ];
    }
}
```

### Использование в контроллере

```php
use App\Http\Requests\StorePostRequest;

class PostController extends Controller
{
    public function store(StorePostRequest $request)
    {
        // Валидация уже прошла! Если не прошла — Laravel вернёт ошибки автоматически
        $validated = $request->validated();
        
        $post = Post::create($validated);
        
        return redirect()->route('posts.show', $post);
    }
}
```

**Что происходит:**
1. Laravel автоматически вызывает `authorize()`
2. Если `false` — возвращает 403 Forbidden
3. Вызывает `rules()` и валидирует данные
4. Если валидация не прошла — возвращает обратно с ошибками
5. Если всё ОК — данные попадают в контроллер

### Дополнительная обработка данных

```php
class StorePostRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => 'required|max:255',
            'content' => 'required',
        ];
    }

    /**
     * Подготовить данные перед валидацией
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'slug' => Str::slug($this->title),
        ]);
    }

    /**
     * Дополнительная валидация после основной
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->isSpam($this->content)) {
                $validator->errors()->add('content', 'Обнаружен спам!');
            }
        });
    }

    private function isSpam(string $content): bool
    {
        // Логика проверки на спам
        return str_contains(strtolower($content), 'buy now');
    }
}
```

### Авторизация в Form Request

```php
public function authorize(): bool
{
    // Только автор может редактировать пост
    $post = $this->route('post'); // Получаем пост из роута
    return $post && $this->user()->id === $post->user_id;
}
```

---

## 7. Middleware — фильтры для запросов

### Что такое Middleware?

**Middleware** — это слои, через которые проходит HTTP-запрос **до** попадания в контроллер или **после** выхода из него.

**Примеры использования:**
- Проверка аутентификации
- Логирование запросов
- Проверка прав доступа
- CORS заголовки
- Ограничение частоты запросов (rate limiting)

### Встроенные middleware Laravel

```php
// app/Http/Kernel.php

protected $middlewareAliases = [
    'auth' => \App\Http\Middleware\Authenticate::class,
    'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class,
    'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
    'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
];
```

### Применение middleware к роутам

```php
// Один middleware
Route::get('/profile', [ProfileController::class, 'show'])
    ->middleware('auth');

// Несколько middleware
Route::post('/posts', [PostController::class, 'store'])
    ->middleware(['auth', 'verified']);

// Группа роутов
Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::resource('posts', PostController::class);
});

// Throttle — 60 запросов в минуту
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/api/posts', [ApiController::class, 'index']);
});
```

### Применение middleware в контроллере

```php
class PostController extends Controller
{
    public function __construct()
    {
        // Применить ко всем методам
        $this->middleware('auth');
        
        // Только к определённым методам
        $this->middleware('auth')->only(['create', 'store', 'edit', 'update', 'destroy']);
        
        // Ко всем, кроме
        $this->middleware('auth')->except(['index', 'show']);
    }
}
```

### Создание собственного Middleware

```bash
php artisan make:middleware CheckAge
```

Создаст `app/Http/Middleware/CheckAge.php`:

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckAge
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, int $minAge = 18)
    {
        // Логика ДО обработки запроса контроллером
        
        if ($request->age < $minAge) {
            return redirect('home')->with('error', 'Доступ запрещён');
        }

        // Передать запрос дальше по цепочке
        $response = $next($request);

        // Логика ПОСЛЕ обработки запроса контроллером
        // Например, добавить заголовок к ответу
        $response->header('X-Custom-Header', 'Value');

        return $response;
    }
}
```

### Регистрация middleware

**В `app/Http/Kernel.php`:**

```php
protected $middlewareAliases = [
    'check.age' => \App\Http\Middleware\CheckAge::class,
];
```

**Использование:**

```php
// Без параметра (по умолчанию 18)
Route::get('/adult-content', function () {
    //
})->middleware('check.age');

// С параметром
Route::get('/senior-content', function () {
    //
})->middleware('check.age:65');
```

### Примеры полезных middleware

**1. Логирование всех запросов:**

```php
class LogRequests
{
    public function handle(Request $request, Closure $next)
    {
        Log::info('Request', [
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'ip' => $request->ip(),
            'user' => $request->user()?->id,
        ]);

        return $next($request);
    }
}
```

**2. Проверка роли пользователя:**

```php
class CheckRole
{
    public function handle(Request $request, Closure $next, string $role)
    {
        if (!$request->user() || !$request->user()->hasRole($role)) {
            abort(403, 'У вас нет доступа');
        }

        return $next($request);
    }
}

// Использование
Route::get('/admin', function () {
    //
})->middleware('role:admin');
```

**3. Добавление заголовков безопасности:**

```php
class SecurityHeaders
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-XSS-Protection', '1; mode=block');

        return $response;
    }
}
```

---

## 8. Практика: CRUD блога с авторизацией

Создадим полноценный блог с постами, где:
- Любой может читать посты
- Только авторизованные могут создавать
- Только автор может редактировать/удалять свой пост

### Шаг 1: Создание модели и миграции

```bash
php artisan make:model Post -m
```

**Миграция `create_posts_table`:**

```php
public function up(): void
{
    Schema::create('posts', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained()->onDelete('cascade');
        $table->string('title');
        $table->string('slug')->unique();
        $table->text('content');
        $table->timestamp('published_at')->nullable();
        $table->timestamps();
    });
}
```

**Модель Post:**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Post extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'title', 'slug', 'content', 'published_at'];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    // Связь с пользователем
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Автоматическая генерация slug
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($post) {
            if (empty($post->slug)) {
                $post->slug = Str::slug($post->title);
            }
        });
    }
}
```

### Шаг 2: Form Requests

```bash
php artisan make:request StorePostRequest
php artisan make:request UpdatePostRequest
```

**StorePostRequest:**

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|max:255',
            'content' => 'required|min:100',
            'published_at' => 'nullable|date',
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Заголовок обязателен',
            'content.min' => 'Контент должен содержать минимум 100 символов',
        ];
    }
}
```

**UpdatePostRequest:**

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        $post = $this->route('post');
        return $post && $this->user()->id === $post->user_id;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|max:255',
            'content' => 'required|min:100',
            'published_at' => 'nullable|date',
        ];
    }
}
```

### Шаг 3: Контроллер

```bash
php artisan make:controller PostController --resource --model=Post
```

```php
<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Http\Requests\StorePostRequest;
use App\Http\Requests\UpdatePostRequest;

class PostController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth')->except(['index', 'show']);
    }

    public function index()
    {
        $posts = Post::with('user')
            ->whereNotNull('published_at')
            ->latest('published_at')
            ->paginate(10);

        return view('posts.index', compact('posts'));
    }

    public function create()
    {
        return view('posts.create');
    }

    public function store(StorePostRequest $request)
    {
        $post = $request->user()->posts()->create([
            'title' => $request->title,
            'content' => $request->content,
            'published_at' => $request->published_at ?? now(),
        ]);

        return redirect()->route('posts.show', $post)
            ->with('success', 'Пост опубликован!');
    }

    public function show(Post $post)
    {
        return view('posts.show', compact('post'));
    }

    public function edit(Post $post)
    {
        $this->authorize('update', $post);
        return view('posts.edit', compact('post'));
    }

    public function update(UpdatePostRequest $request, Post $post)
    {
        $post->update($request->validated());

        return redirect()->route('posts.show', $post)
            ->with('success', 'Пост обновлён!');
    }

    public function destroy(Post $post)
    {
        $this->authorize('delete', $post);
        
        $post->delete();

        return redirect()->route('posts.index')
            ->with('success', 'Пост удалён!');
    }
}
```

### Шаг 4: Policy (авторизация действий)

```bash
php artisan make:policy PostPolicy --model=Post
```

```php
<?php

namespace App\Policies;

use App\Models\Post;
use App\Models\User;

class PostPolicy
{
    public function update(User $user, Post $post): bool
    {
        return $user->id === $post->user_id;
    }

    public function delete(User $user, Post $post): bool
    {
        return $user->id === $post->user_id;
    }
}
```

### Шаг 5: Роуты

```php
// routes/web.php
Route::resource('posts', PostController::class);
```

### Шаг 6: Views (Blade шаблоны)

**resources/views/posts/index.blade.php:**

```blade
@extends('layouts.app')

@section('content')
<div class="container">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h1>Блог</h1>
        @auth
            <a href="{{ route('posts.create') }}" class="btn btn-primary">Создать пост</a>
        @endauth
    </div>

    @if(session('success'))
        <div class="alert alert-success">{{ session('success') }}</div>
    @endif

    @forelse($posts as $post)
        <article class="mb-4 p-4 border rounded">
            <h2>
                <a href="{{ route('posts.show', $post) }}">{{ $post->title }}</a>
            </h2>
            <p class="text-muted">
                Автор: {{ $post->user->name }} | 
                {{ $post->published_at->format('d.m.Y') }}
            </p>
            <p>{{ Str::limit($post->content, 200) }}</p>
        </article>
    @empty
        <p>Постов пока нет</p>
    @endforelse

    {{ $posts->links() }}
</div>
@endsection
```

**resources/views/posts/create.blade.php:**

```blade
@extends('layouts.app')

@section('content')
<div class="container">
    <h1>Создать пост</h1>

    @if($errors->any())
        <div class="alert alert-danger">
            <ul>
                @foreach($errors->all() as $error)
                    <li>{{ $error }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    <form action="{{ route('posts.store') }}" method="POST">
        @csrf

        <div class="mb-3">
            <label for="title" class="form-label">Заголовок</label>
            <input type="text" name="title" id="title" class="form-control" 
                   value="{{ old('title') }}" required>
        </div>

        <div class="mb-3">
            <label for="content" class="form-label">Контент</label>
            <textarea name="content" id="content" rows="10" class="form-control" 
                      required>{{ old('content') }}</textarea>
        </div>

        <div class="mb-3">
            <label for="published_at" class="form-label">Дата публикации (необязательно)</label>
            <input type="datetime-local" name="published_at" id="published_at" 
                   class="form-control" value="{{ old('published_at') }}">
        </div>

        <button type="submit" class="btn btn-primary">Опубликовать</button>
        <a href="{{ route('posts.index') }}" class="btn btn-secondary">Отмена</a>
    </form>
</div>
@endsection
```

**resources/views/posts/show.blade.php:**

```blade
@extends('layouts.app')

@section('content')
<div class="container">
    @if(session('success'))
        <div class="alert alert-success">{{ session('success') }}</div>
    @endif

    <article>
        <h1>{{ $post->title }}</h1>
        <p class="text-muted">
            Автор: {{ $post->user->name }} | 
            {{ $post->published_at->format('d.m.Y H:i') }}
        </p>

        <div class="my-4">
            {!! nl2br(e($post->content)) !!}
        </div>

        @can('update', $post)
            <a href="{{ route('posts.edit', $post) }}" class="btn btn-warning">Редактировать</a>
        @endcan

        @can('delete', $post)
            <form action="{{ route('posts.destroy', $post) }}" method="POST" class="d-inline">
                @csrf
                @method('DELETE')
                <button type="submit" class="btn btn-danger" 
                        onclick="return confirm('Удалить пост?')">Удалить</button>
            </form>
        @endcan

        <a href="{{ route('posts.index') }}" class="btn btn-secondary">Назад</a>
    </article>
</div>
@endsection
```

### Шаг 7: Связь User → Posts

```php
// app/Models/User.php

public function posts()
{
    return $this->hasMany(Post::class);
}
```

---

## 📝 Упражнения

### Упражнение 1: Комментарии к постам

Добавь функционал комментариев:
1. Создай модель `Comment` с полями: `post_id`, `user_id`, `content`
2. Создай `CommentController` с методами `store` и `destroy`
3. Только автор комментария может его удалить
4. Покажи комментарии на странице поста

### Упражнение 2: Middleware для banned users

Создай middleware `CheckBanned`, который:
1. Проверяет поле `is_banned` у пользователя
2. Если `true` — редиректит на страницу `/banned`
3. Примени его глобально ко всем роутам

### Упражнение 3: API контроллер

Создай API версию `PostController`:
1. Методы должны возвращать JSON
2. Используй `--api` флаг при создании
3. Добавь пагинацию в `index`
4. Добавь `throttle:60,1` middleware

---

## ❓ Вопросы для самопроверки

1. В чём разница между `only()` и `except()` при применении middleware?
2. Когда использовать Form Request вместо `$request->validate()`?
3. Что делает метод `authorize()` в Form Request?
4. Как передать параметр в middleware?
5. В чём разница между `resource` и `apiResource` роутами?
6. Что возвращает `$request->validated()`?
7. Как получить модель из роута в Form Request?
8. Зачем нужен метод `withValidator()` в Form Request?
9. Что произойдёт, если `authorize()` вернёт `false`?
10. Можно ли применить несколько middleware к одному роуту?

---

## 🎯 Что дальше?

Ты изучил:
- ✅ Создание и структуру контроллеров
- ✅ Resource-контроллеры (RESTful)
- ✅ Form Requests для валидации
- ✅ Middleware для фильтрации запросов
- ✅ Policies для авторизации

**Следующая глава:** **Глава 8.4: Blade шаблонизатор** — где научишься создавать мощные, переиспользуемые шаблоны с компонентами, слотами и директивами.

---

## 📌 Шпаргалка

```bash
# Создание контроллеров
php artisan make:controller PostController
php artisan make:controller PostController --resource
php artisan make:controller PostController --resource --model=Post
php artisan make:controller PostController --api
php artisan make:controller SendEmailController --invokable

# Form Request
php artisan make:request StorePostRequest

# Middleware
php artisan make:middleware CheckAge

# Policy
php artisan make:policy PostPolicy --model=Post

# Просмотр роутов
php artisan route:list
php artisan route:list --except-vendor
```

```php
// Resource роут
Route::resource('posts', PostController::class);

// Частичный resource
Route::resource('posts', PostController::class)->only(['index', 'show']);

// Middleware в роутах
Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('posts', PostController::class);
});

// Middleware в контроллере
$this->middleware('auth')->except(['index', 'show']);

// Авторизация в контроллере
$this->authorize('update', $post);

// В Blade
@can('update', $post)
    <a href="{{ route('posts.edit', $post) }}">Редактировать</a>
@endcan
```