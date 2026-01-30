# Глава 10.6: API Resources — форматирование JSON, пагинация, вложенные ресурсы

## Введение

Когда вы создаёте API, одна из главных задач — контролировать, как именно данные из моделей превращаются в JSON. Можно просто возвращать модели напрямую: `return User::all();` — Laravel сам их сериализует. Но это плохая идея:

- **Утечка данных**: пароли, токены, служебные поля попадают в ответ
- **Неконсистентность**: структура JSON меняется при изменении БД
- **Отсутствие контроля**: нельзя переименовать поля, добавить вычисляемые значения
- **Сложность вложенных данных**: как форматировать связи?

**API Resources** решают эти проблемы. Это слой трансформации между моделью и JSON-ответом. Думайте о них как о "представлениях" для API — аналог Blade для JSON.

---

## 1. Создание и использование Resource

### Создание Resource

```bash
php artisan make:resource UserResource
```

Создаётся файл `app/Http/Resources/UserResource.php`:

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
```

### Использование в контроллере

```php
use App\Http\Resources\UserResource;
use App\Models\User;

class UserController extends Controller
{
    public function show(User $user)
    {
        return new UserResource($user);
    }

    public function index()
    {
        $users = User::all();
        return UserResource::collection($users);
    }
}
```

**Ответ для `show()`:**
```json
{
    "data": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "created_at": "2024-01-15T10:30:00.000000Z",
        "updated_at": "2024-01-15T10:30:00.000000Z"
    }
}
```

**Ответ для `index()`:**
```json
{
    "data": [
        {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com"
        },
        {
            "id": 2,
            "name": "Jane Smith",
            "email": "jane@example.com"
        }
    ]
}
```

---

## 2. Кастомизация формата

### Переименование полей

```php
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->name,  // переименовали
            'email_address' => $this->email,
            'registered_at' => $this->created_at->format('Y-m-d'),
        ];
    }
}
```

### Вычисляемые поля

```php
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'avatar_url' => $this->avatar 
                ? asset('storage/' . $this->avatar) 
                : asset('images/default-avatar.png'),
            'is_premium' => $this->subscription_ends_at > now(),
            'posts_count' => $this->posts()->count(),
        ];
    }
}
```

### Условные поля

```php
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            
            // Показываем только если это запрос от самого пользователя
            'phone' => $this->when(
                $request->user()->id === $this->id, 
                $this->phone
            ),
            
            // Показываем только если пользователь — админ
            'is_banned' => $this->when(
                $request->user()->isAdmin(), 
                $this->is_banned
            ),
            
            // Объединение условий
            'settings' => $this->mergeWhen($request->user()->id === $this->id, [
                'notifications_enabled' => $this->notifications_enabled,
                'theme' => $this->theme,
            ]),
        ];
    }
}
```

### Обработка null-значений

```php
public function toArray(Request $request): array
{
    return [
        'id' => $this->id,
        'name' => $this->name,
        
        // Включаем поле только если значение не null
        'bio' => $this->whenNotNull($this->bio),
        
        // С fallback-значением
        'avatar' => $this->avatar ?? 'default.png',
        
        // Условная загрузка связи
        'company' => new CompanyResource($this->whenLoaded('company')),
    ];
}
```

---

## 3. Вложенные ресурсы

### Связи один-к-одному и один-ко-многим

**Модели:**
```php
class User extends Model
{
    public function profile() {
        return $this->hasOne(Profile::class);
    }
    
    public function posts() {
        return $this->hasMany(Post::class);
    }
}
```

**ProfileResource:**
```php
class ProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'bio' => $this->bio,
            'website' => $this->website,
            'location' => $this->location,
        ];
    }
}
```

**PostResource:**
```php
class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'excerpt' => substr($this->content, 0, 100),
            'published_at' => $this->published_at->toDateString(),
        ];
    }
}
```

**UserResource с вложенными данными:**
```php
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            
            // Один профиль
            'profile' => new ProfileResource($this->whenLoaded('profile')),
            
            // Коллекция постов
            'posts' => PostResource::collection($this->whenLoaded('posts')),
        ];
    }
}
```

**Использование:**
```php
public function show(User $user)
{
    $user->load(['profile', 'posts']);
    return new UserResource($user);
}
```

**Ответ:**
```json
{
    "data": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "profile": {
            "bio": "Laravel developer",
            "website": "https://example.com",
            "location": "New York"
        },
        "posts": [
            {
                "id": 10,
                "title": "Getting Started with Laravel",
                "excerpt": "In this post we'll explore...",
                "published_at": "2024-01-20"
            },
            {
                "id": 15,
                "title": "Advanced Eloquent Tips",
                "excerpt": "Let's dive into some...",
                "published_at": "2024-01-25"
            }
        ]
    }
}
```

### Глубокая вложенность

```php
class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'content' => $this->content,
            
            // Автор поста
            'author' => new UserResource($this->whenLoaded('user')),
            
            // Комментарии к посту
            'comments' => CommentResource::collection($this->whenLoaded('comments')),
            
            // Категория поста
            'category' => new CategoryResource($this->whenLoaded('category')),
        ];
    }
}
```

```php
class CommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'content' => $this->content,
            'created_at' => $this->created_at->diffForHumans(),
            
            // Автор комментария
            'author' => new UserResource($this->whenLoaded('user')),
        ];
    }
}
```

**Загрузка:**
```php
$post = Post::with(['user', 'comments.user', 'category'])->find(1);
return new PostResource($post);
```

---

## 4. Пагинация

### Базовая пагинация

```php
public function index()
{
    $users = User::paginate(15);
    return UserResource::collection($users);
}
```

**Ответ:**
```json
{
    "data": [
        {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com"
        },
        // ... ещё 14 записей
    ],
    "links": {
        "first": "http://example.com/api/users?page=1",
        "last": "http://example.com/api/users?page=10",
        "prev": null,
        "next": "http://example.com/api/users?page=2"
    },
    "meta": {
        "current_page": 1,
        "from": 1,
        "last_page": 10,
        "path": "http://example.com/api/users",
        "per_page": 15,
        "to": 15,
        "total": 150
    }
}
```

### Кастомизация мета-данных

**Resource Collection:**
```bash
php artisan make:resource UserCollection
```

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\ResourceCollection;

class UserCollection extends ResourceCollection
{
    /**
     * Transform the resource collection into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'data' => $this->collection,
            'meta' => [
                'total_users' => $this->total(),
                'current_page' => $this->currentPage(),
                'per_page' => $this->perPage(),
            ],
            'links' => [
                'self' => $request->url(),
                'next' => $this->nextPageUrl(),
            ],
        ];
    }
}
```

**Использование:**
```php
public function index()
{
    $users = User::paginate(15);
    return new UserCollection($users);
}
```

### SimplePaginate

Для больших таблиц, где не нужно знать общее количество:

```php
public function index()
{
    $users = User::simplePaginate(15);
    return UserResource::collection($users);
}
```

**Ответ (без total и last_page):**
```json
{
    "data": [...],
    "links": {
        "first": "...",
        "prev": null,
        "next": "..."
    },
    "meta": {
        "current_page": 1,
        "from": 1,
        "per_page": 15,
        "to": 15
    }
}
```

---

## 5. Обёртка data

### Отключение обёртки

По умолчанию Laravel оборачивает результат в `"data": {...}`. Чтобы отключить:

**В AppServiceProvider:**
```php
use Illuminate\Http\Resources\Json\JsonResource;

public function boot(): void
{
    JsonResource::withoutWrapping();
}
```

**Теперь ответ:**
```json
{
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
}
```

### Кастомная обёртка

```php
public function boot(): void
{
    JsonResource::wrap('results');
}
```

**Ответ:**
```json
{
    "results": {
        "id": 1,
        "name": "John Doe"
    }
}
```

### Обёртка на уровне ресурса

```php
class UserResource extends JsonResource
{
    public static $wrap = 'user';
    
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
        ];
    }
}
```

---

## 6. Дополнительные мета-данные

### Добавление глобальных мета

```php
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
        ];
    }
    
    public function with(Request $request): array
    {
        return [
            'meta' => [
                'version' => '1.0',
                'timestamp' => now()->toIso8601String(),
            ],
        ];
    }
}
```

**Ответ:**
```json
{
    "data": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
    },
    "meta": {
        "version": "1.0",
        "timestamp": "2024-01-30T14:30:00+00:00"
    }
}
```

### Добавление мета в коллекции

```php
class UserCollection extends ResourceCollection
{
    public function toArray(Request $request): array
    {
        return [
            'data' => $this->collection,
        ];
    }
    
    public function with(Request $request): array
    {
        return [
            'meta' => [
                'total_premium_users' => User::where('is_premium', true)->count(),
                'last_registered' => User::latest()->first()->created_at,
            ],
        ];
    }
}
```

---

## 7. Условная загрузка и производительность

### whenLoaded vs load

❌ **Плохо** (всегда загружает):
```php
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'posts' => PostResource::collection($this->posts),  // N+1!
        ];
    }
}
```

✅ **Хорошо** (загружает только если есть):
```php
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'posts' => PostResource::collection($this->whenLoaded('posts')),
        ];
    }
}
```

### whenCounted

Для подсчёта связей:

```php
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'posts_count' => $this->whenCounted('posts'),
            'followers_count' => $this->whenCounted('followers'),
        ];
    }
}
```

**Использование:**
```php
$users = User::withCount(['posts', 'followers'])->get();
return UserResource::collection($users);
```

### whenPivotLoaded

Для данных из промежуточной таблицы:

```php
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'role' => $this->whenPivotLoaded('team_user', function () {
                return $this->pivot->role;
            }),
            'joined_at' => $this->whenPivotLoaded('team_user', function () {
                return $this->pivot->created_at;
            }),
        ];
    }
}
```

---

## 8. Практические примеры

### API для блога

**PostResource:**
```php
class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'content' => $this->when($request->routeIs('posts.show'), $this->content),
            'published_at' => $this->published_at->toDateString(),
            'reading_time' => ceil(str_word_count($this->content) / 200) . ' min',
            
            'author' => [
                'name' => $this->user->name,
                'avatar' => $this->user->avatar_url,
            ],
            
            'category' => [
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ],
            
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'comments_count' => $this->whenCounted('comments'),
            
            'links' => [
                'self' => route('posts.show', $this->slug),
                'author' => route('users.show', $this->user->id),
            ],
        ];
    }
}
```

**Контроллер:**
```php
public function index()
{
    $posts = Post::with(['user', 'category', 'tags'])
        ->withCount('comments')
        ->latest()
        ->paginate(10);
    
    return PostResource::collection($posts);
}

public function show(Post $post)
{
    $post->load(['user', 'category', 'tags', 'comments.user']);
    return new PostResource($post);
}
```

### API для e-commerce

**ProductResource:**
```php
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'sku' => $this->sku,
            
            'price' => [
                'amount' => $this->price,
                'currency' => 'USD',
                'formatted' => '$' . number_format($this->price, 2),
            ],
            
            'discount' => $this->when($this->discount_price, [
                'amount' => $this->discount_price,
                'percentage' => round((1 - $this->discount_price / $this->price) * 100),
                'formatted' => '$' . number_format($this->discount_price, 2),
            ]),
            
            'stock' => [
                'quantity' => $this->stock_quantity,
                'is_available' => $this->stock_quantity > 0,
                'status' => $this->stock_quantity > 10 
                    ? 'in_stock' 
                    : ($this->stock_quantity > 0 ? 'low_stock' : 'out_of_stock'),
            ],
            
            'images' => $this->images->map(fn($img) => [
                'url' => asset('storage/' . $img->path),
                'thumbnail' => asset('storage/thumbnails/' . $img->path),
                'alt' => $img->alt_text,
            ]),
            
            'category' => new CategoryResource($this->whenLoaded('category')),
            'brand' => new BrandResource($this->whenLoaded('brand')),
            'reviews_count' => $this->whenCounted('reviews'),
            'average_rating' => $this->when(
                $this->relationLoaded('reviews'),
                fn() => round($this->reviews->avg('rating'), 1)
            ),
        ];
    }
}
```

---

## 9. Продвинутые техники

### Динамические поля (Sparse Fieldsets)

Позволяет клиенту выбирать, какие поля получить:

```php
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $fields = explode(',', $request->input('fields', ''));
        
        $data = [
            'id' => $this->id,
            'name' => $this->name,
        ];
        
        if (empty($fields) || in_array('email', $fields)) {
            $data['email'] = $this->email;
        }
        
        if (empty($fields) || in_array('posts', $fields)) {
            $data['posts'] = PostResource::collection($this->whenLoaded('posts'));
        }
        
        return $data;
    }
}
```

**Запрос:**
```
GET /api/users?fields=name,email
```

### Включение связей по требованию

```php
public function index(Request $request)
{
    $query = User::query();
    
    if ($request->has('include')) {
        $includes = explode(',', $request->input('include'));
        
        $allowed = ['posts', 'profile', 'followers'];
        $includes = array_intersect($includes, $allowed);
        
        $query->with($includes);
    }
    
    return UserResource::collection($query->paginate());
}
```

**Запрос:**
```
GET /api/users?include=posts,profile
```

### Версионирование API

```php
class UserResourceV1 extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
        ];
    }
}

class UserResourceV2 extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->name,  // переименовано
            'email_address' => $this->email,
            'avatar_url' => $this->avatar_url,  // новое поле
        ];
    }
}
```

**Роуты:**
```php
Route::prefix('v1')->group(function () {
    Route::get('/users', function () {
        return UserResourceV1::collection(User::all());
    });
});

Route::prefix('v2')->group(function () {
    Route::get('/users', function () {
        return UserResourceV2::collection(User::all());
    });
});
```

---

## 10. Типичные ошибки

### ❌ Ошибка 1: Забыть whenLoaded

```php
// Плохо — всегда делает запрос к БД
'posts' => PostResource::collection($this->posts)

// Хорошо — запрос только если загружено
'posts' => PostResource::collection($this->whenLoaded('posts'))
```

### ❌ Ошибка 2: Излишняя логика в Resource

```php
// Плохо — бизнес-логика в ресурсе
public function toArray(Request $request): array
{
    $discount = $this->calculateComplexDiscount();
    $recommendations = $this->generateRecommendations();
    
    return [
        'id' => $this->id,
        'discount' => $discount,
        'recommendations' => $recommendations,
    ];
}

// Хорошо — вычисления в модели или сервисе
public function toArray(Request $request): array
{
    return [
        'id' => $this->id,
        'discount' => $this->discount,  // accessor в модели
        'recommendations' => $this->recommendations,  // связь
    ];
}
```

### ❌ Ошибка 3: Игнорирование пагинации

```php
// Плохо — загружает все записи в память
public function index()
{
    return UserResource::collection(User::all());
}

// Хорошо — пагинация
public function index()
{
    return UserResource::collection(User::paginate(15));
}
```

### ❌ Ошибка 4: Раскрытие чувствительных данных

```php
// Плохо — возвращает всё
return $this->resource->toArray();

// Хорошо — явно указываем поля
return [
    'id' => $this->id,
    'name' => $this->name,
    'email' => $this->email,
    // password, remember_token и т.д. не включены
];
```

---

## Упражнения

### Упражнение 1: Базовый Resource
Создайте `ProductResource`, который возвращает:
- id, name, price
- formatted_price (например, "$99.99")
- is_available (boolean на основе stock_quantity > 0)

### Упражнение 2: Вложенные данные
Создайте `OrderResource`, который включает:
- Информацию о заказе (id, total, status)
- Пользователя (через UserResource)
- Товары заказа (через OrderItemResource)
- Адрес доставки (inline, не отдельный ресурс)

### Упражнение 3: Условные поля
Модифицируйте UserResource так, чтобы:
- `email` показывался только владельцу профиля
- `phone` показывался только админам
- `internal_notes` показывался только админам

### Упражнение 4: Пагинация
Создайте эндпоинт `/api/posts`, который:
- Пагинирует по 20 записей
- Включает автора и категорию
- Добавляет мета-информацию: total_posts, total_authors

### Упражнение 5: Производительность
Есть UserResource с постами, комментариями и подписчиками. Оптимизируйте запрос так, чтобы избежать N+1 проблемы при получении списка пользователей с этими данными.

---

## Чек-лист

- [ ] Использую Resources вместо прямого возврата моделей
- [ ] Применяю `whenLoaded()` для связей
- [ ] Использую `whenCounted()` для счётчиков
- [ ] Добавил пагинацию для списков
- [ ] Не раскрываю чувствительные данные (пароли, токены)
- [ ] Использую условные поля (`when()`) где нужно
- [ ] Тестирую структуру JSON ответов
- [ ] Версионирую API при изменении структуры
- [ ] Документирую формат ответов для фронтенда
- [ ] Кэширую тяжёлые вычисления в модели, а не в Resource

---

## Резюме

**API Resources** — это мощный инструмент для контроля JSON-ответов:

1. **Безопасность**: явный контроль над тем, что попадает в ответ
2. **Консистентность**: единый формат независимо от структуры БД
3. **Гибкость**: условные поля, вычисляемые значения, переименование
4. **Производительность**: `whenLoaded()` предотвращает N+1
5. **Поддерживаемость**: изменение API не ломает клиентов при правильном версионировании

Следующий шаг — научиться **тестировать** ваши API (Часть 11), чтобы гарантировать, что структура ответов остаётся стабильной.