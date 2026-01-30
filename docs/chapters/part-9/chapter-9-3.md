# Глава 9.3: Eager Loading и N+1 — проблема и решение, with(), withCount()

## 📖 Теория

### Что такое проблема N+1?

Проблема N+1 — это **один из самых распространённых источников падения производительности** в приложениях с базами данных. Она возникает, когда вы делаете 1 запрос для получения основных данных, а затем N дополнительных запросов для получения связанных данных.

**Пример проблемы:**

```php
// Получаем 10 постов (1 запрос)
$posts = Post::limit(10)->get();

// Для каждого поста получаем автора (10 запросов!)
foreach ($posts as $post) {
    echo $post->user->name; // Каждое обращение = новый запрос!
}
```

**Результат:** 1 + 10 = **11 запросов к базе данных** вместо 2!

### Как это работает под капотом

Когда вы обращаетесь к `$post->user`, Eloquent делает следующее:

1. Проверяет, загружена ли связь
2. Если нет — выполняет отдельный запрос `SELECT * FROM users WHERE id = ?`
3. Кэширует результат для этого конкретного поста
4. Возвращает объект User

Для каждого поста это повторяется заново!

### Решение: Eager Loading (жадная загрузка)

**Eager Loading** — это техника, при которой связанные данные загружаются одновременно с основными данными.

```php
// Получаем посты И авторов за 2 запроса!
$posts = Post::with('user')->limit(10)->get();

foreach ($posts as $post) {
    echo $post->user->name; // Никаких дополнительных запросов!
}
```

**SQL под капотом:**

```sql
-- Запрос 1: получаем посты
SELECT * FROM posts LIMIT 10;

-- Запрос 2: получаем всех авторов этих постов
SELECT * FROM users WHERE id IN (1, 3, 5, 7, 9, 12, 15, 18, 21, 24);
```

---

## 🛠️ Практика

### Базовый Eager Loading

```php
// ❌ ПЛОХО: N+1 проблема
$users = User::all();
foreach ($users as $user) {
    echo $user->posts->count(); // N запросов!
}

// ✅ ХОРОШО: Eager Loading
$users = User::with('posts')->get();
foreach ($users as $user) {
    echo $user->posts->count(); // 0 дополнительных запросов!
}
```

### Загрузка нескольких связей

```php
// Загружаем пользователя, его посты И комментарии
$users = User::with(['posts', 'comments'])->get();

// SQL выполнит:
// 1. SELECT * FROM users
// 2. SELECT * FROM posts WHERE user_id IN (...)
// 3. SELECT * FROM comments WHERE user_id IN (...)
```

### Вложенные связи (nested relationships)

```php
// Загружаем посты с их авторами и комментариями к постам
$posts = Post::with(['user', 'comments'])->get();

// Загружаем посты, их комментарии, и авторов комментариев
$posts = Post::with('comments.user')->get();

// Множественная вложенность
$posts = Post::with([
    'user',
    'comments.user',
    'comments.replies.user'
])->get();
```

### Условия для Eager Loading

```php
// Загружаем только опубликованные посты пользователя
$users = User::with(['posts' => function ($query) {
    $query->where('published', true)
          ->orderBy('created_at', 'desc');
}])->get();

// Загружаем только последние 5 комментариев
$posts = Post::with(['comments' => function ($query) {
    $query->latest()->limit(5);
}])->get();

// Комбинирование условий
$users = User::with([
    'posts' => fn($q) => $q->where('status', 'published'),
    'comments' => fn($q) => $q->where('approved', true)
])->get();
```

### Lazy Eager Loading (загрузка после получения)

Иногда вы понимаете, что забыли загрузить связь. Можно загрузить её после:

```php
$posts = Post::all(); // Без связей

// Позже понимаем, что нужны авторы
if (некоторое_условие) {
    $posts->load('user'); // Догружаем связь
}
```

### withCount() — подсчёт связей

Часто нужно не сами связанные записи, а их количество:

```php
// ❌ ПЛОХО: загружаем все посты только для подсчёта
$users = User::with('posts')->get();
foreach ($users as $user) {
    echo $user->posts->count();
}

// ✅ ХОРОШО: загружаем только счётчик
$users = User::withCount('posts')->get();
foreach ($users as $user) {
    echo $user->posts_count; // Атрибут автоматически добавлен!
}
```

**SQL для withCount:**

```sql
SELECT users.*, 
       (SELECT COUNT(*) FROM posts WHERE posts.user_id = users.id) as posts_count
FROM users;
```

### Множественные withCount

```php
$users = User::withCount(['posts', 'comments', 'followers'])->get();

// Доступны как:
// $user->posts_count
// $user->comments_count
// $user->followers_count
```

### withCount с условиями

```php
// Считаем только опубликованные посты
$users = User::withCount([
    'posts',
    'posts as published_posts_count' => function ($query) {
        $query->where('published', true);
    }
])->get();

foreach ($users as $user) {
    echo "Всего: {$user->posts_count}";
    echo "Опубликовано: {$user->published_posts_count}";
}
```

### withSum, withAvg, withMax, withMin

```php
// Сумма просмотров всех постов пользователя
$users = User::withSum('posts', 'views')->get();
echo $user->posts_sum_views;

// Средний рейтинг комментариев
$posts = Post::withAvg('comments', 'rating')->get();
echo $post->comments_avg_rating;

// Максимальная цена заказа
$users = User::withMax('orders', 'total')->get();
echo $user->orders_max_total;

// Комбинирование
$users = User::withSum('orders', 'total')
              ->withCount('orders')
              ->withAvg('orders', 'total')
              ->get();
```

---

## 🎯 Продвинутые техники

### Условный Eager Loading

```php
// Загружаем связь только при определённом условии
$posts = Post::when($needsUser, function ($query) {
    $query->with('user');
})->get();

// Или через метод
public function index(Request $request)
{
    $query = Post::query();
    
    if ($request->has('include_user')) {
        $query->with('user');
    }
    
    if ($request->has('include_comments')) {
        $query->with('comments');
    }
    
    return $query->get();
}
```

### Eager Loading по умолчанию

Можно настроить модель, чтобы связь **всегда** загружалась:

```php
class Post extends Model
{
    // Эти связи ВСЕГДА загружаются
    protected $with = ['user', 'category'];
    
    // Связи
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}

// Теперь при любом запросе:
$posts = Post::all(); // user и category уже загружены!

// Можно отключить для конкретного запроса:
$posts = Post::without('user')->get();
```

### Предотвращение Lazy Loading в продакшене

```php
// В AppServiceProvider.php
use Illuminate\Database\Eloquent\Model;

public function boot()
{
    // В продакшене выбрасывать исключение при lazy loading
    Model::preventLazyLoading(!app()->isProduction());
    
    // Или всегда:
    Model::preventLazyLoading(true);
}
```

Теперь если вы забудете `with()`, получите ошибку вместо молчаливого N+1.

### Debugging: выявление N+1

**Laravel Debugbar:**

```bash
composer require barryvdh/laravel-debugbar --dev
```

Debugbar покажет все SQL запросы и выделит дубликаты.

**Clockwork:**

```bash
composer require itsgoingd/clockwork --dev
```

**Ручной подсчёт:**

```php
use Illuminate\Support\Facades\DB;

DB::enableQueryLog();

$posts = Post::all();
foreach ($posts as $post) {
    echo $post->user->name;
}

dd(DB::getQueryLog()); // Покажет все выполненные запросы
```

---

## 💡 Практические примеры

### Пример 1: Список постов с авторами и категориями

```php
// Контроллер
public function index()
{
    $posts = Post::with(['user', 'category'])
                 ->withCount('comments')
                 ->latest()
                 ->paginate(20);
    
    return view('posts.index', compact('posts'));
}
```

**Blade:**

```blade
@foreach ($posts as $post)
    <article>
        <h2>{{ $post->title }}</h2>
        <p>Автор: {{ $post->user->name }}</p>
        <p>Категория: {{ $post->category->name }}</p>
        <p>Комментариев: {{ $post->comments_count }}</p>
    </article>
@endforeach
```

**SQL: всего 3 запроса** (посты, пользователи, категории) вместо 1 + N + N!

### Пример 2: Профиль пользователя с активностью

```php
public function show(User $user)
{
    $user->load([
        'posts' => fn($q) => $q->latest()->limit(5),
        'comments' => fn($q) => $q->latest()->limit(10),
    ]);
    
    $user->loadCount([
        'posts',
        'comments',
        'followers'
    ]);
    
    return view('users.show', compact('user'));
}
```

### Пример 3: Статистика для админки

```php
public function dashboard()
{
    $users = User::withCount([
        'posts',
        'posts as published_posts_count' => fn($q) => $q->published(),
        'comments',
        'orders'
    ])
    ->withSum('orders', 'total')
    ->withAvg('posts', 'views')
    ->paginate(50);
    
    return view('admin.users', compact('users'));
}
```

### Пример 4: API endpoint с гибкой загрузкой

```php
public function index(Request $request)
{
    $query = Post::query();
    
    // Клиент может указать, что загружать
    $includes = explode(',', $request->get('include', ''));
    
    $allowedIncludes = ['user', 'comments', 'category', 'tags'];
    
    foreach ($includes as $include) {
        if (in_array($include, $allowedIncludes)) {
            $query->with($include);
        }
    }
    
    return $query->paginate();
}

// Использование:
// GET /api/posts?include=user,comments
// GET /api/posts?include=category
```

---

## ⚠️ Частые ошибки

### ❌ Ошибка 1: Забывать про вложенные связи

```php
// Загружаем посты с комментариями
$posts = Post::with('comments')->get();

// Но потом обращаемся к авторам комментариев
@foreach ($post->comments as $comment)
    {{ $comment->user->name }} // N+1 снова!
@endforeach

// ✅ Правильно:
$posts = Post::with('comments.user')->get();
```

### ❌ Ошибка 2: Использовать with() там, где нужен withCount()

```php
// ❌ Загружаем тысячи комментариев только для подсчёта
$posts = Post::with('comments')->get();
{{ $post->comments->count() }}

// ✅ Загружаем только число
$posts = Post::withCount('comments')->get();
{{ $post->comments_count }}
```

### ❌ Ошибка 3: Дублирование загрузки

```php
// ❌ Дважды загружаем одно и то же
$posts = Post::with('user')
             ->with('user')  // Дубликат!
             ->get();

// ✅ Правильно
$posts = Post::with('user')->get();
```

### ❌ Ошибка 4: Игнорирование пагинации

```php
// ❌ ОЧЕНЬ плохо: загружаем все записи
$posts = Post::with('user')->get();

// ✅ Используем пагинацию
$posts = Post::with('user')->paginate(20);

// ✅ Или limit
$posts = Post::with('user')->limit(10)->get();
```

---

## 🔥 Упражнения

### Упражнение 1: Исправь N+1

Дан код с проблемой N+1. Исправьте его:

```php
public function index()
{
    $users = User::all();
    
    return view('users.index', compact('users'));
}
```

```blade
@foreach ($users as $user)
    <div>
        <h3>{{ $user->name }}</h3>
        <p>Постов: {{ $user->posts->count() }}</p>
        <p>Последний пост: {{ $user->posts->first()?->title }}</p>
        
        <h4>Посты:</h4>
        @foreach ($user->posts as $post)
            <p>{{ $post->title }} ({{ $post->category->name }})</p>
        @endforeach
    </div>
@endforeach
```

<details>
<summary>✅ Решение</summary>

```php
public function index()
{
    $users = User::with('posts.category')
                 ->withCount('posts')
                 ->get();
    
    return view('users.index', compact('users'));
}
```

```blade
@foreach ($users as $user)
    <div>
        <h3>{{ $user->name }}</h3>
        <p>Постов: {{ $user->posts_count }}</p>
        <p>Последний пост: {{ $user->posts->first()?->title }}</p>
        
        <h4>Посты:</h4>
        @foreach ($user->posts as $post)
            <p>{{ $post->title }} ({{ $post->category->name }})</p>
        @endforeach
    </div>
@endforeach
```

</details>

### Упражнение 2: Статистика категорий

Создайте endpoint, который вернёт категории с количеством:
- Постов в каждой категории
- Опубликованных постов
- Общим количеством просмотров всех постов

```php
public function categoryStats()
{
    // Ваш код
}
```

<details>
<summary>✅ Решение</summary>

```php
public function categoryStats()
{
    $categories = Category::withCount([
        'posts',
        'posts as published_posts_count' => function ($query) {
            $query->where('published', true);
        }
    ])
    ->withSum('posts', 'views')
    ->get();
    
    return response()->json($categories);
}
```

</details>

### Упражнение 3: Гибкий API

Создайте метод для API, который:
1. Принимает параметр `include` (например: `user,comments,tags`)
2. Загружает только запрошенные связи
3. Защищён от загрузки недопустимых связей

```php
public function index(Request $request)
{
    // Ваш код
}
```

<details>
<summary>✅ Решение</summary>

```php
public function index(Request $request)
{
    $query = Post::query();
    
    // Разрешённые связи
    $allowedIncludes = ['user', 'comments', 'category', 'tags'];
    
    // Получаем запрошенные связи
    $includes = array_filter(
        explode(',', $request->get('include', '')),
        fn($include) => in_array(trim($include), $allowedIncludes)
    );
    
    // Загружаем только разрешённые
    if (!empty($includes)) {
        $query->with($includes);
    }
    
    return $query->paginate(20);
}

// Использование:
// GET /api/posts?include=user,comments
// GET /api/posts?include=category,tags
// GET /api/posts?include=user,hacker  // 'hacker' будет проигнорирован
```

</details>

---

## 📊 Практическое задание

Создайте систему отображения форума с оптимизацией запросов:

**Требования:**

1. **Модели:**
   - Topic (топик форума)
   - Post (сообщение в топике)
   - User (автор)

2. **Список топиков должен показывать:**
   - Название топика
   - Автора топика
   - Количество сообщений
   - Последнее сообщение (текст и автор)
   - Количество уникальных участников

3. **Оптимизация:**
   - Максимум 5 SQL запросов для списка из 20 топиков
   - Используйте eager loading, withCount
   - Добавьте пагинацию

**Структура:**

```php
// Миграции
Schema::create('topics', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained();
    $table->string('title');
    $table->timestamps();
});

Schema::create('posts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('topic_id')->constrained();
    $table->foreignId('user_id')->constrained();
    $table->text('content');
    $table->timestamps();
});
```

<details>
<summary>✅ Решение</summary>

**Модели:**

```php
// Topic.php
class Topic extends Model
{
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    public function posts()
    {
        return $this->hasMany(Post::class);
    }
    
    public function latestPost()
    {
        return $this->hasOne(Post::class)->latestOfMany();
    }
}

// Post.php
class Post extends Model
{
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    public function topic()
    {
        return $this->belongsTo(Topic::class);
    }
}
```

**Контроллер:**

```php
public function index()
{
    $topics = Topic::with([
        'user',
        'latestPost.user'
    ])
    ->withCount('posts')
    ->withCount(['posts as participants_count' => function ($query) {
        $query->distinct('user_id');
    }])
    ->latest('updated_at')
    ->paginate(20);
    
    return view('forum.index', compact('topics'));
}
```

**Blade:**

```blade
@foreach ($topics as $topic)
    <div class="topic">
        <h3>{{ $topic->title }}</h3>
        <p>Автор: {{ $topic->user->name }}</p>
        <p>Сообщений: {{ $topic->posts_count }}</p>
        <p>Участников: {{ $topic->participants_count }}</p>
        
        @if ($topic->latestPost)
            <div class="latest-post">
                <p>{{ Str::limit($topic->latestPost->content, 100) }}</p>
                <small>{{ $topic->latestPost->user->name }}</small>
            </div>
        @endif
    </div>
@endforeach

{{ $topics->links() }}
```

**SQL запросы (всего 5):**
1. SELECT topics...
2. SELECT users WHERE id IN (topic user_ids)
3. SELECT posts (latest) WHERE topic_id IN (...)
4. SELECT users WHERE id IN (latest post user_ids)
5. COUNT posts per topic

</details>

---

## 🎓 Ключевые выводы

1. **N+1 проблема** — это когда вы делаете 1 запрос для основных данных и N запросов для связей
2. **with()** загружает связи за один дополнительный запрос
3. **withCount()** загружает только счётчики, без данных
4. **withSum/Avg/Max/Min** для агрегирующих функций
5. Используйте точку для вложенных связей: `with('comments.user')`
6. Можно добавлять условия к eager loading через замыкание
7. **load()** для lazy eager loading (когда забыли with)
8. **preventLazyLoading()** помогает выявлять забытый eager loading
9. Laravel Debugbar — ваш друг для поиска N+1
10. Всегда проверяйте количество SQL запросов в важных местах!

---

## 📚 Что дальше?

В следующей главе изучим **Query Scopes и Accessors** — как создавать переиспользуемые запросы и вычисляемые поля для моделей!