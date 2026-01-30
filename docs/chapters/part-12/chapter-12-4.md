# Глава 12.4: REST API + SPA — отделение frontend от backend, CORS, токены

## 🎯 Что ты узнаешь

- Как работает архитектура с разделенным frontend и backend
- Что такое REST API и как его правильно проектировать
- Как решить проблему CORS при работе с разными доменами
- Системы аутентификации для API: токены, JWT, Sanctum
- Практика: создание полноценного API для SPA-приложения

---

## 📖 Теория

### Почему разделять frontend и backend?

**Традиционный подход** (монолит):
```
Browser → Laravel → Blade → HTML → Browser
         ↓
      Database
```

**Современный подход** (SPA + API):
```
Browser → Vue/React (Frontend)
              ↓ HTTP/JSON
          Laravel API (Backend)
              ↓
          Database
```

**Преимущества разделения:**

1. **Независимая разработка** — frontend и backend команды работают параллельно
2. **Множественные клиенты** — один API для web, mobile, desktop приложений
3. **Лучшая производительность** — меньше нагрузки на сервер, кеширование на клиенте
4. **Современный UX** — мгновенные переходы без перезагрузки страницы
5. **Масштабируемость** — можно разместить frontend и backend на разных серверах

---

## 🏗️ Что такое REST API

**REST** (Representational State Transfer) — архитектурный стиль для создания web-сервисов.

### Принципы REST

1. **Stateless** — каждый запрос содержит всю необходимую информацию
2. **Клиент-сервер** — разделение ответственности
3. **Единый интерфейс** — стандартные HTTP методы
4. **Ресурсо-ориентированность** — работа с сущностями (users, posts, comments)

### HTTP методы в REST

| Метод | Операция | Пример | Идемпотентность |
|-------|----------|--------|-----------------|
| GET | Получение | `GET /api/posts` | Да |
| POST | Создание | `POST /api/posts` | Нет |
| PUT | Полное обновление | `PUT /api/posts/1` | Да |
| PATCH | Частичное обновление | `PATCH /api/posts/1` | Нет |
| DELETE | Удаление | `DELETE /api/posts/1` | Да |

### Правильное именование эндпоинтов

✅ **Правильно:**
```
GET    /api/posts           # Список постов
GET    /api/posts/1         # Один пост
POST   /api/posts           # Создать пост
PUT    /api/posts/1         # Обновить пост полностью
PATCH  /api/posts/1         # Обновить пост частично
DELETE /api/posts/1         # Удалить пост

GET    /api/posts/1/comments    # Комментарии к посту
POST   /api/posts/1/comments    # Добавить комментарий
```

❌ **Неправильно:**
```
GET  /api/getPosts
POST /api/createPost
GET  /api/post/delete/1
GET  /api/posts?action=delete&id=1
```

### Коды ответов HTTP

**2xx — Успех:**
- `200 OK` — успешный запрос
- `201 Created` — ресурс создан
- `204 No Content` — успешно, но нет содержимого (для DELETE)

**4xx — Ошибка клиента:**
- `400 Bad Request` — неверные данные
- `401 Unauthorized` — требуется аутентификация
- `403 Forbidden` — доступ запрещен
- `404 Not Found` — ресурс не найден
- `422 Unprocessable Entity` — ошибки валидации

**5xx — Ошибка сервера:**
- `500 Internal Server Error` — что-то сломалось на сервере

---

## 🚀 Создание REST API в Laravel

### Структура routes/api.php

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\AuthController;

// Публичные маршруты
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Защищенные маршруты (требуют токен)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    
    // Resource маршруты для постов
    Route::apiResource('posts', PostController::class);
    
    // Дополнительные действия
    Route::post('/posts/{post}/like', [PostController::class, 'like']);
    Route::post('/posts/{post}/publish', [PostController::class, 'publish']);
});
```

**Важно:** Маршруты в `api.php` автоматически получают префикс `/api`.

### API Resource контроллер

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Http\Resources\PostResource;
use App\Http\Requests\StorePostRequest;
use App\Http\Requests\UpdatePostRequest;
use Illuminate\Http\JsonResponse;

class PostController extends Controller
{
    /**
     * Список всех постов
     */
    public function index(): JsonResponse
    {
        $posts = Post::with('user')
            ->latest()
            ->paginate(15);
        
        return response()->json([
            'success' => true,
            'data' => PostResource::collection($posts),
            'meta' => [
                'current_page' => $posts->currentPage(),
                'total' => $posts->total(),
                'per_page' => $posts->perPage(),
            ]
        ]);
    }

    /**
     * Создание нового поста
     */
    public function store(StorePostRequest $request): JsonResponse
    {
        $post = $request->user()->posts()->create(
            $request->validated()
        );
        
        return response()->json([
            'success' => true,
            'message' => 'Post created successfully',
            'data' => new PostResource($post)
        ], 201); // 201 Created
    }

    /**
     * Получение одного поста
     */
    public function show(Post $post): JsonResponse
    {
        $post->load(['user', 'comments.user']);
        
        return response()->json([
            'success' => true,
            'data' => new PostResource($post)
        ]);
    }

    /**
     * Обновление поста
     */
    public function update(UpdatePostRequest $request, Post $post): JsonResponse
    {
        // Проверка прав доступа
        if ($post->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'You are not authorized to update this post'
            ], 403);
        }
        
        $post->update($request->validated());
        
        return response()->json([
            'success' => true,
            'message' => 'Post updated successfully',
            'data' => new PostResource($post)
        ]);
    }

    /**
     * Удаление поста
     */
    public function destroy(Post $post): JsonResponse
    {
        if ($post->user_id !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'You are not authorized to delete this post'
            ], 403);
        }
        
        $post->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Post deleted successfully'
        ], 204); // 204 No Content
    }
    
    /**
     * Дополнительное действие
     */
    public function like(Post $post): JsonResponse
    {
        $user = auth()->user();
        
        if ($post->likes()->where('user_id', $user->id)->exists()) {
            $post->likes()->detach($user->id);
            $liked = false;
        } else {
            $post->likes()->attach($user->id);
            $liked = true;
        }
        
        return response()->json([
            'success' => true,
            'liked' => $liked,
            'likes_count' => $post->likes()->count()
        ]);
    }
}
```

### API Resources — форматирование ответов

**app/Http/Resources/PostResource.php:**
```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'content' => $this->content,
            'published_at' => $this->published_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
            
            // Вложенные ресурсы
            'author' => new UserResource($this->whenLoaded('user')),
            'comments' => CommentResource::collection($this->whenLoaded('comments')),
            
            // Вычисляемые поля
            'is_published' => $this->isPublished(),
            'reading_time' => $this->estimatedReadingTime(),
            
            // Условные поля
            'views_count' => $this->when(
                $request->user()?->isAdmin(),
                $this->views_count
            ),
            
            // Ссылки
            'links' => [
                'self' => route('api.posts.show', $this->id),
                'author' => route('api.users.show', $this->user_id),
            ]
        ];
    }
}
```

**app/Http/Resources/UserResource.php:**
```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->when(
                $request->user()?->id === $this->id,
                $this->email
            ),
            'avatar_url' => $this->avatar_url,
            'bio' => $this->bio,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
```

### Валидация для API

**app/Http/Requests/StorePostRequest.php:**
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // или проверка прав
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'content' => 'required|string|min:100',
            'excerpt' => 'nullable|string|max:500',
            'tags' => 'nullable|array',
            'tags.*' => 'exists:tags,id',
            'published_at' => 'nullable|date',
        ];
    }
    
    public function messages(): array
    {
        return [
            'title.required' => 'Post title is required',
            'content.min' => 'Post content must be at least 100 characters',
        ];
    }
    
    /**
     * Переопределяем обработку ошибок для API
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422)
        );
    }
}
```

---

## 🔒 CORS (Cross-Origin Resource Sharing)

### Что такое CORS и зачем он нужен

**Проблема:**
```
Frontend:  http://localhost:5173  (Vue/React dev server)
Backend:   http://localhost:8000  (Laravel API)

❌ Browser: "Blocked by CORS policy"
```

**Same-Origin Policy** — браузерная защита, запрещающая JavaScript делать запросы на другие домены.

**CORS** — механизм, позволяющий серверу разрешить запросы с других доменов.

### Настройка CORS в Laravel

**config/cors.php:**
```php
<?php

return [
    /*
     * Пути, к которым применяется CORS
     */
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    /*
     * Разрешенные HTTP методы
     */
    'allowed_methods' => ['*'], // или ['GET', 'POST', 'PUT', 'DELETE']

    /*
     * Разрешенные источники (origins)
     */
    'allowed_origins' => [
        'http://localhost:5173',  // Vite dev server
        'http://localhost:3000',  // React dev server
        'https://myapp.com',      // Production frontend
    ],
    
    // Или разрешить все (НЕ для production!)
    // 'allowed_origins' => ['*'],
    
    /*
     * Паттерны разрешенных origins
     */
    'allowed_origins_patterns' => [
        '/^https:\/\/.*\.myapp\.com$/', // все поддомены
    ],

    /*
     * Разрешенные заголовки
     */
    'allowed_headers' => ['*'],

    /*
     * Заголовки, доступные JavaScript
     */
    'exposed_headers' => [],

    /*
     * Максимальное время кеширования preflight запроса
     */
    'max_age' => 0,

    /*
     * Разрешить отправку cookies и авторизационных заголовков
     */
    'supports_credentials' => true,
];
```

**Важно:** Middleware `HandleCors` должен быть в `app/Http/Kernel.php`:

```php
protected $middleware = [
    // ...
    \Illuminate\Http\Middleware\HandleCors::class,
    // ...
];
```

### Как работает CORS

**Simple Request (простой запрос):**
```http
GET /api/posts HTTP/1.1
Host: api.myapp.com
Origin: https://myapp.com

↓ Response ↓

HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://myapp.com
Access-Control-Allow-Credentials: true
```

**Preflight Request (предварительный запрос):**

Браузер сначала отправляет OPTIONS запрос:
```http
OPTIONS /api/posts HTTP/1.1
Host: api.myapp.com
Origin: https://myapp.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization

↓ Response ↓

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://myapp.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

Если ответ положительный, браузер отправляет основной запрос.

---

## 🎫 Аутентификация для API

### Почему не Sessions для API?

Sessions хранят состояние на сервере и используют cookies. Это плохо для API:

1. **Stateful** — нарушает принцип REST
2. **CSRF** — уязвимость при кросс-доменных запросах
3. **Масштабирование** — сложно при нескольких серверах
4. **Mobile apps** — нет cookies

### Решение: Token-based аутентификация

```
1. User логинится → получает токен
2. Каждый запрос → отправляет токен в заголовке
3. Сервер проверяет токен → возвращает данные
```

---

## 🔐 Laravel Sanctum

**Sanctum** — официальный пакет Laravel для API аутентификации.

### Установка Sanctum

```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

**app/Http/Kernel.php:**
```php
'api' => [
    \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
    'throttle:api',
    \Illuminate\Routing\Middleware\SubstituteBindings::class,
],
```

**User модель:**
```php
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;
    
    // ...
}
```

### AuthController для API

**app/Http/Controllers/Api/AuthController.php:**
```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Регистрация нового пользователя
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'User registered successfully',
            'data' => [
                'user' => $user,
                'token' => $token,
            ]
        ], 201);
    }

    /**
     * Вход пользователя
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Удаляем старые токены (опционально)
        $user->tokens()->delete();

        // Создаем новый токен
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => $user,
                'token' => $token,
            ]
        ]);
    }

    /**
     * Выход пользователя
     */
    public function logout(Request $request)
    {
        // Удаляем текущий токен
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }

    /**
     * Получение текущего пользователя
     */
    public function user(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => $request->user()
        ]);
    }
}
```

### Использование токенов на клиенте

**JavaScript (Fetch API):**
```javascript
// Сохраняем токен после логина
const loginResponse = await fetch('http://localhost:8000/api/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    body: JSON.stringify({
        email: 'user@example.com',
        password: 'password'
    })
});

const { data } = await loginResponse.json();
localStorage.setItem('auth_token', data.token);

// Используем токен в запросах
const response = await fetch('http://localhost:8000/api/posts', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Accept': 'application/json',
    }
});
```

**Axios (более удобно):**
```javascript
import axios from 'axios';

// Настройка axios
axios.defaults.baseURL = 'http://localhost:8000/api';
axios.defaults.headers.common['Accept'] = 'application/json';

// Добавляем токен ко всем запросам
const token = localStorage.getItem('auth_token');
if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Использование
try {
    const { data } = await axios.get('/posts');
    console.log(data);
} catch (error) {
    if (error.response.status === 401) {
        // Токен невалиден, перенаправляем на логин
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
    }
}
```

---

## 🔑 JWT (JSON Web Tokens)

### Что такое JWT

**JWT** — самодостаточный токен, содержащий всю информацию о пользователе.

**Структура JWT:**
```
header.payload.signature

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Декодированный JWT:**
```json
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "sub": "1234567890",
  "name": "John Doe",
  "email": "john@example.com",
  "exp": 1716239022
}

// Signature (проверка подлинности)
```

### Sanctum vs JWT

| Feature | Sanctum | JWT |
|---------|---------|-----|
| Хранение | База данных | Stateless |
| Отзыв токена | Легко (удалить из БД) | Сложно (blacklist) |
| Производительность | Запрос к БД | Без БД |
| Размер токена | Короткий | Длинный |
| Подходит для | SPA, Mobile | Микросервисы |

**Рекомендация:** Для большинства Laravel проектов используй **Sanctum** — проще и безопаснее.

### Использование JWT (пакет tymon/jwt-auth)

```bash
composer require tymon/jwt-auth
php artisan vendor:publish --provider="Tymon\JWTAuth\Providers\LaravelServiceProvider"
php artisan jwt:secret
```

**config/auth.php:**
```php
'guards' => [
    'api' => [
        'driver' => 'jwt',
        'provider' => 'users',
    ],
],
```

**User модель:**
```php
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [];
    }
}
```

**Контроллер:**
```php
use Tymon\JWTAuth\Facades\JWTAuth;

public function login(Request $request)
{
    $credentials = $request->only('email', 'password');
    
    if (!$token = JWTAuth::attempt($credentials)) {
        return response()->json(['error' => 'Unauthorized'], 401);
    }
    
    return response()->json([
        'token' => $token,
        'type' => 'bearer',
        'expires_in' => auth()->factory()->getTTL() * 60
    ]);
}
```

---

## 🎨 Практика: Полноценный API для блога

### Структура проекта

```
app/
├── Http/
│   ├── Controllers/
│   │   └── Api/
│   │       ├── AuthController.php
│   │       ├── PostController.php
│   │       ├── CommentController.php
│   │       └── UserController.php
│   ├── Resources/
│   │   ├── PostResource.php
│   │   ├── CommentResource.php
│   │   └── UserResource.php
│   ├── Requests/
│   │   ├── StorePostRequest.php
│   │   ├── UpdatePostRequest.php
│   │   └── StoreCommentRequest.php
│   └── Middleware/
│       └── EnsureUserOwnsPost.php
└── Models/
    ├── User.php
    ├── Post.php
    └── Comment.php
```

### routes/api.php

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\{
    AuthController,
    PostController,
    CommentController,
    UserController
};

// Публичные маршруты
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

// Публичное чтение
Route::get('/posts', [PostController::class, 'index']);
Route::get('/posts/{post}', [PostController::class, 'show']);
Route::get('/users/{user}', [UserController::class, 'show']);

// Защищенные маршруты
Route::middleware('auth:sanctum')->group(function () {
    // Аутентификация
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/user', [AuthController::class, 'user']);
    
    // Посты (только создание, обновление, удаление)
    Route::post('/posts', [PostController::class, 'store']);
    Route::put('/posts/{post}', [PostController::class, 'update']);
    Route::delete('/posts/{post}', [PostController::class, 'destroy']);
    
    // Дополнительные действия с постами
    Route::post('/posts/{post}/like', [PostController::class, 'like']);
    Route::post('/posts/{post}/publish', [PostController::class, 'publish']);
    
    // Комментарии
    Route::post('/posts/{post}/comments', [CommentController::class, 'store']);
    Route::put('/comments/{comment}', [CommentController::class, 'update']);
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy']);
    
    // Профиль пользователя
    Route::put('/profile', [UserController::class, 'update']);
    Route::post('/profile/avatar', [UserController::class, 'uploadAvatar']);
});
```

### Обработка ошибок

**app/Exceptions/Handler.php:**
```php
public function register(): void
{
    $this->renderable(function (NotFoundHttpException $e, Request $request) {
        if ($request->is('api/*')) {
            return response()->json([
                'success' => false,
                'message' => 'Resource not found'
            ], 404);
        }
    });
    
    $this->renderable(function (AuthenticationException $e, Request $request) {
        if ($request->is('api/*')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }
    });
    
    $this->renderable(function (ValidationException $e, Request $request) {
        if ($request->is('api/*')) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        }
    });
}
```

### Middleware для проверки владельца

**app/Http/Middleware/EnsureUserOwnsPost.php:**
```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Post;

class EnsureUserOwnsPost
{
    public function handle(Request $request, Closure $next)
    {
        $post = $request->route('post');
        
        if ($post->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'You are not authorized to perform this action'
            ], 403);
        }
        
        return $next($request);
    }
}
```

**Регистрация middleware в `app/Http/Kernel.php`:**
```php
protected $middlewareAliases = [
    // ...
    'post.owner' => \App\Http\Middleware\EnsureUserOwnsPost::class,
];
```

**Использование:**
```php
Route::middleware(['auth:sanctum', 'post.owner'])->group(function () {
    Route::put('/posts/{post}', [PostController::class, 'update']);
    Route::delete('/posts/{post}', [PostController::class, 'destroy']);
});
```

---

## 📱 Пример frontend (Vue 3 + Composition API)

### Настройка API клиента

**src/services/api.js:**
```javascript
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    }
});

// Добавляем токен к каждому запросу
api.interceptors.request.use(config => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Обрабатываем ошибки авторизации
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
```

### Composable для постов

**src/composables/usePosts.js:**
```javascript
import { ref } from 'vue';
import api from '@/services/api';

export function usePosts() {
    const posts = ref([]);
    const loading = ref(false);
    const error = ref(null);

    const fetchPosts = async () => {
        loading.value = true;
        error.value = null;
        
        try {
            const { data } = await api.get('/posts');
            posts.value = data.data;
        } catch (err) {
            error.value = err.response?.data?.message || 'Failed to fetch posts';
        } finally {
            loading.value = false;
        }
    };

    const createPost = async (postData) => {
        try {
            const { data } = await api.post('/posts', postData);
            posts.value.unshift(data.data);
            return data.data;
        } catch (err) {
            throw new Error(err.response?.data?.message || 'Failed to create post');
        }
    };

    const deletePost = async (postId) => {
        try {
            await api.delete(`/posts/${postId}`);
            posts.value = posts.value.filter(p => p.id !== postId);
        } catch (err) {
            throw new Error(err.response?.data?.message || 'Failed to delete post');
        }
    };

    return {
        posts,
        loading,
        error,
        fetchPosts,
        createPost,
        deletePost
    };
}
```

### Компонент списка постов

**src/components/PostList.vue:**
```vue
<template>
  <div class="post-list">
    <div v-if="loading" class="loading">Loading posts...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    
    <div v-else>
      <article v-for="post in posts" :key="post.id" class="post-card">
        <h2>{{ post.title }}</h2>
        <p class="excerpt">{{ post.excerpt }}</p>
        
        <div class="post-meta">
          <span>By {{ post.author.name }}</span>
          <span>{{ formatDate(post.created_at) }}</span>
        </div>
        
        <div class="post-actions">
          <button @click="likePost(post.id)">
            ❤️ {{ post.likes_count }}
          </button>
          
          <button 
            v-if="isOwner(post)" 
            @click="deletePost(post.id)"
            class="danger"
          >
            Delete
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { usePosts } from '@/composables/usePosts';
import { useAuth } from '@/composables/useAuth';

const { posts, loading, error, fetchPosts, deletePost } = usePosts();
const { user } = useAuth();

onMounted(() => {
  fetchPosts();
});

const isOwner = (post) => {
  return user.value && post.author.id === user.value.id;
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

const likePost = async (postId) => {
  try {
    await api.post(`/posts/${postId}/like`);
    await fetchPosts(); // Обновляем список
  } catch (error) {
    console.error('Failed to like post', error);
  }
};
</script>

<style scoped>
.post-card {
  border: 1px solid #ddd;
  padding: 1.5rem;
  margin-bottom: 1rem;
  border-radius: 8px;
}

.post-meta {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.875rem;
  margin: 0.5rem 0;
}

.post-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

button.danger {
  background-color: #dc3545;
  color: white;
}
</style>
```

---

## ⚠️ Важные моменты безопасности

### 1. Rate Limiting

**app/Http/Kernel.php:**
```php
protected $middlewareGroups = [
    'api' => [
        'throttle:60,1', // 60 запросов в минуту
        // ...
    ],
];
```

**Кастомный rate limit для логина:**
```php
// routes/api.php
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1'); // 5 попыток в минуту
```

### 2. Валидация всегда

```php
// ❌ Плохо
public function store(Request $request)
{
    Post::create($request->all()); // Опасно!
}

// ✅ Хорошо
public function store(StorePostRequest $request)
{
    Post::create($request->validated());
}
```

### 3. Не возвращай чувствительные данные

```php
// ❌ Плохо
return User::all(); // Вернет пароли, токены и т.д.

// ✅ Хорошо
return UserResource::collection(User::all());
```

### 4. Используй HTTPS в production

```php
// config/cors.php (production)
'allowed_origins' => [
    'https://myapp.com', // Только HTTPS!
],

// .env
APP_URL=https://myapp.com
```

### 5. Проверяй права доступа

```php
// ✅ Всегда проверяй
public function update(Request $request, Post $post)
{
    $this->authorize('update', $post); // Policy
    // или
    if ($post->user_id !== $request->user()->id) {
        abort(403);
    }
    
    // ...
}
```

---

## 📋 Чеклист создания API

- [ ] Установил Sanctum и настроил CORS
- [ ] Создал API Resource контроллеры
- [ ] Использую API Resources для форматирования ответов
- [ ] Все данные валидируются через Form Requests
- [ ] Настроил rate limiting
- [ ] Обрабатываю ошибки и возвращаю правильные HTTP коды
- [ ] Проверяю права доступа перед изменением/удалением
- [ ] Не возвращаю чувствительные данные
- [ ] Использую пагинацию для списков
- [ ] Документировал API (Postman, Swagger, Scribe)
- [ ] Написал тесты для критичных эндпоинтов

---

## 🎯 Практические задания

### Задание 1: Создай базовый API для задач (Todo)

**Требования:**
- Регистрация и логин через Sanctum
- CRUD для задач (только свои задачи)
- Пагинация списка задач
- Фильтр по статусу (completed/pending)
- API Resource для форматирования

**Эндпоинты:**
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/tasks              # Список с пагинацией
POST   /api/tasks              # Создать
GET    /api/tasks/{task}       # Одна задача
PUT    /api/tasks/{task}       # Обновить
DELETE /api/tasks/{task}       # Удалить
PATCH  /api/tasks/{task}/toggle # Переключить статус
```

### Задание 2: Добавь CORS и подключи Vue frontend

**Требования:**
- Настрой CORS для `localhost:5173`
- Создай Vue компонент со списком задач
- Реализуй создание, удаление, переключение статуса
- Обработай ошибки валидации на клиенте
- Покажи loading состояния

### Задание 3: Система комментариев с вложенностью

**Расширь API:**
```
GET    /api/posts/{post}/comments       # Все комментарии
POST   /api/posts/{post}/comments       # Добавить комментарий
POST   /api/comments/{comment}/reply    # Ответить на комментарий
DELETE /api/comments/{comment}          # Удалить свой
```

**Особенности:**
- Древовидная структура комментариев
- Рекурсивный API Resource для вложенных ответов
- Проверка прав (только автор может удалить)

### Задание 4: Поиск и фильтрация

**Добавь к эндпоинту `/api/posts`:**
```
GET /api/posts?search=laravel          # Поиск по заголовку/тексту
GET /api/posts?author=5                # Фильтр по автору
GET /api/posts?tag=php,javascript      # Фильтр по тегам
GET /api/posts?sort=created_at&order=desc
GET /api/posts?per_page=20&page=2      # Пагинация
```

**Реализуй:**
- Query parameters обработку в контроллере
- Scope в модели для переиспользования
- Валидацию параметров

---

## 🐛 Типичные ошибки

### 1. Забыл добавить `auth:sanctum` middleware

```php
// ❌ Любой может удалить пост
Route::delete('/posts/{post}', [PostController::class, 'destroy']);

// ✅ Только авторизованные
Route::middleware('auth:sanctum')->group(function () {
    Route::delete('/posts/{post}', [PostController::class, 'destroy']);
});
```

### 2. Не проверяешь владельца ресурса

```php
// ❌ Пользователь может удалить чужой пост
public function destroy(Post $post) {
    $post->delete();
}

// ✅ Только свой
public function destroy(Post $post) {
    if ($post->user_id !== auth()->id()) {
        return response()->json(['message' => 'Forbidden'], 403);
    }
    $post->delete();
}
```

### 3. Возвращаешь массив вместо JSON с meta

```php
// ❌ Клиенту сложно обрабатывать
return Post::all();

// ✅ Структурированный ответ
return response()->json([
    'success' => true,
    'data' => PostResource::collection(Post::all())
]);
```

### 4. Не настроил CORS

```
Error: Access to fetch at 'http://localhost:8000/api/posts' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Решение:** Проверь `config/cors.php` и добавь origin.

### 5. Отправляешь токен неправильно

```javascript
// ❌ Плохо
headers: { 'Authorization': token }

// ✅ Правильно
headers: { 'Authorization': `Bearer ${token}` }
```

---

## 💡 Советы профессионалов

1. **Версионируй API:** Используй `/api/v1/posts` вместо `/api/posts`
   
2. **Документируй API:** Используй [Laravel Scribe](https://scribe.knuckles.wtf/) или Postman Collections

3. **Используй API Resources всегда:** Никогда не возвращай модели напрямую

4. **Пиши тесты:** Feature тесты для API критично важны

5. **Логируй важные действия:**
   ```php
   Log::info('User logged in', ['user_id' => $user->id]);
   ```

6. **Используй soft deletes для критичных данных:**
   ```php
   use SoftDeletes;
   ```

7. **Кешируй тяжелые запросы:**
   ```php
   return Cache::remember('posts.all', 3600, function () {
       return Post::with('user')->get();
   });
   ```

---

## 📚 Что дальше

Теперь ты умеешь:
- ✅ Создавать REST API по стандартам
- ✅ Настраивать CORS для кросс-доменных запросов
- ✅ Использовать Sanctum для API аутентификации
- ✅ Форматировать ответы через API Resources
- ✅ Валидировать и обрабатывать ошибки
- ✅ Подключать SPA frontend к Laravel backend

**Следующая глава:** Real-time и WebSockets — научишься делать live-обновления!

**Полезные ресурсы:**
- [Laravel Sanctum Docs](https://laravel.com/docs/sanctum)
- [API Resource Docs](https://laravel.com/docs/eloquent-resources)
- [REST API Best Practices](https://restfulapi.net/)
- [Laravel Scribe](https://scribe.knuckles.wtf/) — документация API

---

## ❓ Вопросы для самопроверки

1. В чем разница между Sessions и Token-based аутентификацией?
2. Что такое CORS и почему браузер блокирует запросы?
3. Какие HTTP коды нужно возвращать для успеха, ошибок клиента и сервера?
4. Почему нельзя возвращать модели напрямую, нужны API Resources?
5. Как защитить эндпоинт, чтобы пользователь мог редактировать только свои ресурсы?
6. Зачем нужен preflight запрос (OPTIONS) в CORS?
7. В чем разница между PUT и PATCH методами?
8. Как правильно хранить токен на клиенте?

**Готов к real-time? Погнали в следующую главу! 🚀**