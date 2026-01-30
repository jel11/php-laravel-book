# Глава 9.2: Eloquent связи — hasOne, hasMany, belongsTo, belongsToMany, polymorphic

## Введение: Почему связи — это ключ к работе с данными

Представь, что у тебя есть пользователи, посты, комментарии, теги, лайки. В реальном приложении эти сущности не существуют изолированно — они связаны между собой:

- У пользователя есть профиль (один к одному)
- У пользователя много постов (один ко многим)
- У поста много комментариев (один ко многим)
- У поста много тегов, у тега много постов (многие ко многим)
- Комментарий принадлежит пользователю (обратная связь)

Eloquent делает работу со связями невероятно простой и элегантной. Вместо написания сложных JOIN-запросов, ты просто описываешь связи в моделях, а Eloquent делает всю грязную работу за тебя.

---

## 1. Связь One-to-One (hasOne / belongsTo)

### Теория

**One-to-One** — это когда одна запись в таблице А связана ровно с одной записью в таблице Б.

**Классические примеры:**
- Пользователь → Профиль (у каждого пользователя один расширенный профиль)
- Пользователь → Адрес доставки по умолчанию
- Заказ → Чек (у каждого заказа один чек)

### Структура БД

```sql
-- users
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- profiles
CREATE TABLE profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED UNIQUE, -- UNIQUE важен для 1:1
    bio TEXT,
    avatar VARCHAR(255),
    website VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Важно:** `user_id` должен быть **UNIQUE**, чтобы гарантировать, что у одного пользователя только один профиль.

### Настройка в моделях

**User.php:**
```php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class User extends Model
{
    // Пользователь имеет один профиль
    public function profile()
    {
        return $this->hasOne(Profile::class);
        
        // Полная форма (если имена отличаются):
        // return $this->hasOne(Profile::class, 'user_id', 'id');
        // Profile::class — модель
        // 'user_id' — внешний ключ в таблице profiles
        // 'id' — локальный ключ в таблице users
    }
}
```

**Profile.php:**
```php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Profile extends Model
{
    protected $fillable = ['user_id', 'bio', 'avatar', 'website'];
    
    // Профиль принадлежит пользователю
    public function user()
    {
        return $this->belongsTo(User::class);
        
        // Полная форма:
        // return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
```

### Использование

```php
// Получить профиль пользователя
$user = User::find(1);
$profile = $user->profile; // Возвращает объект Profile или null

echo $profile->bio;
echo $profile->website;

// Обратное получение
$profile = Profile::find(1);
$user = $profile->user; // Возвращает объект User

echo $user->name;

// Проверка существования
if ($user->profile) {
    echo "Профиль заполнен";
}

// Создание связанного профиля
$user = User::find(1);
$user->profile()->create([
    'bio' => 'Фуллстек разработчик',
    'website' => 'https://example.com'
]);

// Обновление
$user->profile()->update([
    'bio' => 'Senior PHP Developer'
]);

// Удаление
$user->profile()->delete();
```

---

## 2. Связь One-to-Many (hasMany / belongsTo)

### Теория

**One-to-Many** — самая распространённая связь. Одна запись в таблице А связана с множеством записей в таблице Б.

**Примеры:**
- Пользователь → Посты (у пользователя много постов)
- Пост → Комментарии (у поста много комментариев)
- Категория → Товары

### Структура БД

```sql
-- users (уже есть)

-- posts
CREATE TABLE posts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED, -- НЕ unique!
    title VARCHAR(255),
    content TEXT,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Настройка в моделях

**User.php:**
```php
class User extends Model
{
    // Пользователь имеет много постов
    public function posts()
    {
        return $this->hasMany(Post::class);
        
        // Полная форма:
        // return $this->hasMany(Post::class, 'user_id', 'id');
    }
    
    // Можно добавить дополнительные связи с условиями
    public function publishedPosts()
    {
        return $this->hasMany(Post::class)
                    ->whereNotNull('published_at')
                    ->orderBy('published_at', 'desc');
    }
}
```

**Post.php:**
```php
class Post extends Model
{
    protected $fillable = ['user_id', 'title', 'content', 'published_at'];
    
    protected $casts = [
        'published_at' => 'datetime'
    ];
    
    // Пост принадлежит пользователю
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

### Использование

```php
// Получить все посты пользователя
$user = User::find(1);
$posts = $user->posts; // Коллекция постов

foreach ($posts as $post) {
    echo $post->title . "\n";
}

// Количество постов
$count = $user->posts()->count();
// или с eager loading count:
$user = User::withCount('posts')->find(1);
echo $user->posts_count;

// Фильтрация постов
$publishedPosts = $user->posts()
                       ->where('published_at', '<=', now())
                       ->get();

// Создание поста для пользователя
$user->posts()->create([
    'title' => 'Новый пост',
    'content' => 'Содержание поста'
]);

// Или через модель поста
$post = new Post([
    'title' => 'Ещё один пост',
    'content' => 'Текст'
]);
$user->posts()->save($post);

// Получить автора поста
$post = Post::find(1);
$author = $post->user;
echo "Автор: " . $author->name;
```

### Вложенные связи

```php
// Комментарии к постам
class Post extends Model
{
    public function comments()
    {
        return $this->hasMany(Comment::class);
    }
}

class Comment extends Model
{
    protected $fillable = ['post_id', 'user_id', 'content'];
    
    public function post()
    {
        return $this->belongsTo(Post::class);
    }
    
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

// Использование
$post = Post::find(1);
$comments = $post->comments;

$comment = Comment::find(1);
echo $comment->user->name; // Автор комментария
echo $comment->post->title; // Пост, к которому комментарий
```

---

## 3. Связь Many-to-Many (belongsToMany)

### Теория

**Many-to-Many** — когда множество записей в таблице А связаны с множеством записей в таблице Б.

**Примеры:**
- Посты ↔ Теги (у поста много тегов, у тега много постов)
- Пользователи ↔ Роли
- Студенты ↔ Курсы

Для этой связи нужна **промежуточная таблица (pivot table)**.

### Структура БД

```sql
-- posts (уже есть)

-- tags
CREATE TABLE tags (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    slug VARCHAR(100) UNIQUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- post_tag (pivot table)
-- Имя по конвенции: две модели в алфавитном порядке, единственное число
CREATE TABLE post_tag (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT UNSIGNED,
    tag_id BIGINT UNSIGNED,
    created_at TIMESTAMP NULL, -- опционально для timestamps
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE KEY post_tag_unique (post_id, tag_id) -- Избегаем дублей
);
```

### Настройка в моделях

**Post.php:**
```php
class Post extends Model
{
    // Пост имеет много тегов
    public function tags()
    {
        return $this->belongsToMany(Tag::class);
        
        // Полная форма:
        // return $this->belongsToMany(
        //     Tag::class,           // Модель
        //     'post_tag',           // Имя pivot таблицы
        //     'post_id',            // Ключ текущей модели в pivot
        //     'tag_id'              // Ключ связанной модели в pivot
        // );
    }
    
    // Если нужны timestamps в pivot
    public function tagsWithTimestamps()
    {
        return $this->belongsToMany(Tag::class)
                    ->withTimestamps();
    }
}
```

**Tag.php:**
```php
class Tag extends Model
{
    protected $fillable = ['name', 'slug'];
    
    // Тег принадлежит многим постам
    public function posts()
    {
        return $this->belongsToMany(Post::class);
    }
}
```

### Использование

```php
// Получить теги поста
$post = Post::find(1);
$tags = $post->tags;

foreach ($tags as $tag) {
    echo $tag->name . ", ";
}

// Получить посты тега
$tag = Tag::where('slug', 'laravel')->first();
$posts = $tag->posts;

// Прикрепить теги к посту
$post = Post::find(1);

// Прикрепить один тег
$post->tags()->attach(1); // ID тега

// Прикрепить несколько
$post->tags()->attach([1, 2, 3]);

// Синхронизация (удалит старые, добавит новые)
$post->tags()->sync([2, 3, 4]);

// Отвязать
$post->tags()->detach(1); // Конкретный тег
$post->tags()->detach([1, 2]); // Несколько
$post->tags()->detach(); // Все теги

// Toggle (если есть — удалит, нет — добавит)
$post->tags()->toggle([1, 2, 3]);

// Проверка наличия
if ($post->tags->contains(1)) {
    echo "Тег уже прикреплён";
}
```

### Дополнительные данные в pivot (withPivot)

Иногда нужно хранить дополнительную информацию в промежуточной таблице.

```sql
-- Пример: студенты и курсы с оценкой
CREATE TABLE course_student (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT UNSIGNED,
    course_id BIGINT UNSIGNED,
    grade INT,
    enrolled_at TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);
```

**Student.php:**
```php
class Student extends Model
{
    public function courses()
    {
        return $this->belongsToMany(Course::class)
                    ->withPivot('grade', 'enrolled_at')
                    ->withTimestamps();
    }
}
```

**Использование:**
```php
$student = Student::find(1);

foreach ($student->courses as $course) {
    echo $course->name . " - Оценка: " . $course->pivot->grade . "\n";
    echo "Записан: " . $course->pivot->enrolled_at . "\n";
}

// Прикрепление с данными
$student->courses()->attach(1, [
    'grade' => 85,
    'enrolled_at' => now()
]);

// Синхронизация с данными
$student->courses()->sync([
    1 => ['grade' => 90],
    2 => ['grade' => 88],
]);

// Обновление pivot
$student->courses()->updateExistingPivot(1, [
    'grade' => 95
]);
```

---

## 4. Полиморфные связи (Polymorphic Relations)

### Теория

**Полиморфная связь** позволяет модели принадлежать нескольким другим моделям через одну таблицу.

**Классический пример:** Комментарии или лайки, которые могут быть у постов, видео, фотографий.

### 4.1 One-to-Many Polymorphic (morphMany / morphTo)

```sql
-- posts (уже есть)

-- videos
CREATE TABLE videos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    url VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- comments (полиморфная таблица)
CREATE TABLE comments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED,
    commentable_type VARCHAR(255), -- Тип модели (App\Models\Post)
    commentable_id BIGINT UNSIGNED, -- ID записи
    content TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX commentable_index (commentable_type, commentable_id)
);
```

**Post.php:**
```php
class Post extends Model
{
    public function comments()
    {
        return $this->morphMany(Comment::class, 'commentable');
    }
}
```

**Video.php:**
```php
class Video extends Model
{
    public function comments()
    {
        return $this->morphMany(Comment::class, 'commentable');
    }
}
```

**Comment.php:**
```php
class Comment extends Model
{
    protected $fillable = ['user_id', 'content'];
    
    // Комментарий может принадлежать разным моделям
    public function commentable()
    {
        return $this->morphTo();
    }
    
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

**Использование:**
```php
// Комментарии к посту
$post = Post::find(1);
$comments = $post->comments;

$post->comments()->create([
    'user_id' => 1,
    'content' => 'Отличный пост!'
]);

// Комментарии к видео
$video = Video::find(1);
$video->comments()->create([
    'user_id' => 2,
    'content' => 'Классное видео!'
]);

// Получить родительскую модель комментария
$comment = Comment::find(1);
$parent = $comment->commentable; // Может быть Post или Video

if ($parent instanceof Post) {
    echo "Это комментарий к посту: " . $parent->title;
} elseif ($parent instanceof Video) {
    echo "Это комментарий к видео: " . $parent->title;
}
```

### 4.2 Many-to-Many Polymorphic (morphToMany / morphedByMany)

**Пример:** Теги для постов, видео и фотографий.

```sql
-- tags (уже есть)

-- taggables (полиморфная pivot)
CREATE TABLE taggables (
    tag_id BIGINT UNSIGNED,
    taggable_type VARCHAR(255),
    taggable_id BIGINT UNSIGNED,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    INDEX taggable_index (taggable_type, taggable_id)
);
```

**Post.php:**
```php
class Post extends Model
{
    public function tags()
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }
}
```

**Video.php:**
```php
class Video extends Model
{
    public function tags()
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }
}
```

**Tag.php:**
```php
class Tag extends Model
{
    public function posts()
    {
        return $this->morphedByMany(Post::class, 'taggable');
    }
    
    public function videos()
    {
        return $this->morphedByMany(Video::class, 'taggable');
    }
}
```

**Использование:**
```php
$post = Post::find(1);
$post->tags()->attach([1, 2, 3]);

$video = Video::find(1);
$video->tags()->sync([2, 3, 4]);

$tag = Tag::find(1);
$posts = $tag->posts;
$videos = $tag->videos;
```

---

## 5. Связь Has-Many-Through

### Теория

Позволяет получить удалённые связи через промежуточную модель.

**Пример:** Страны → Пользователи → Посты. Хотим получить все посты из определённой страны.

```sql
-- countries
CREATE TABLE countries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100)
);

-- users
ALTER TABLE users ADD COLUMN country_id BIGINT UNSIGNED;
ALTER TABLE users ADD FOREIGN KEY (country_id) REFERENCES countries(id);

-- posts (уже есть с user_id)
```

**Country.php:**
```php
class Country extends Model
{
    public function users()
    {
        return $this->hasMany(User::class);
    }
    
    // Посты через пользователей
    public function posts()
    {
        return $this->hasManyThrough(
            Post::class,    // Конечная модель
            User::class,    // Промежуточная модель
            'country_id',   // FK на countries в users
            'user_id',      // FK на users в posts
            'id',           // Локальный ключ на countries
            'id'            // Локальный ключ на users
        );
    }
}
```

**Использование:**
```php
$country = Country::find(1);
$posts = $country->posts; // Все посты пользователей из этой страны

$count = $country->posts()->count();
```

---

## 6. Связь Has-One-Through

Аналогично hasManyThrough, но для отношения one-to-one.

**Пример:** Пользователь → Профиль → Аватар

```php
class User extends Model
{
    public function profile()
    {
        return $this->hasOne(Profile::class);
    }
    
    // Прямой доступ к аватару через профиль
    public function avatar()
    {
        return $this->hasOneThrough(
            Avatar::class,
            Profile::class
        );
    }
}

// Использование
$user = User::find(1);
echo $user->avatar->url;
```

---

## 7. Оптимизация: Eager Loading (предзагрузка)

### Проблема N+1 запросов

```php
// ПЛОХО: N+1 проблема
$posts = Post::all(); // 1 запрос

foreach ($posts as $post) {
    echo $post->user->name; // N запросов (по одному на каждый пост)
}
// Итого: 1 + N запросов
```

### Решение: with()

```php
// ХОРОШО: 2 запроса
$posts = Post::with('user')->get(); // 1 + 1 запрос

foreach ($posts as $post) {
    echo $post->user->name; // Уже загружено
}
```

### Множественная предзагрузка

```php
// Загрузить посты с пользователями и комментариями
$posts = Post::with(['user', 'comments'])->get();

// Вложенная предзагрузка
$posts = Post::with(['comments.user'])->get();

foreach ($posts as $post) {
    foreach ($post->comments as $comment) {
        echo $comment->user->name; // Нет дополнительных запросов
    }
}

// Множественные уровни
$users = User::with([
    'posts.comments.user',
    'profile'
])->get();
```

### Условная предзагрузка

```php
$posts = Post::with([
    'comments' => function ($query) {
        $query->where('approved', true)
              ->orderBy('created_at', 'desc')
              ->limit(5);
    }
])->get();
```

### Lazy Eager Loading (догрузка)

```php
$posts = Post::all();

// Позже решили, что нужны пользователи
$posts->load('user');

// Условная догрузка
$posts->load(['comments' => function ($query) {
    $query->where('approved', true);
}]);
```

### withCount()

```php
// Получить количество комментариев без загрузки самих комментариев
$posts = Post::withCount('comments')->get();

foreach ($posts as $post) {
    echo "Комментариев: " . $post->comments_count;
}

// С условием
$posts = Post::withCount([
    'comments',
    'comments as approved_comments_count' => function ($query) {
        $query->where('approved', true);
    }
])->get();
```

---

## 8. Практические примеры

### Пример 1: Блог с категориями и тегами

```php
// Category.php
class Category extends Model
{
    public function posts()
    {
        return $this->hasMany(Post::class);
    }
}

// Post.php
class Post extends Model
{
    public function category()
    {
        return $this->belongsTo(Category::class);
    }
    
    public function tags()
    {
        return $this->belongsToMany(Tag::class);
    }
    
    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

// Использование
$category = Category::with(['posts.author', 'posts.tags'])->find(1);

foreach ($category->posts as $post) {
    echo "Пост: " . $post->title . "\n";
    echo "Автор: " . $post->author->name . "\n";
    echo "Теги: " . $post->tags->pluck('name')->implode(', ') . "\n";
}
```

### Пример 2: E-commerce с заказами

```php
// Order.php
class Order extends Model
{
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
}

// OrderItem.php
class OrderItem extends Model
{
    public function order()
    {
        return $this->belongsTo(Order::class);
    }
    
    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}

// Product.php
class Product extends Model
{
    public function orders()
    {
        return $this->hasManyThrough(
            Order::class,
            OrderItem::class,
            'product_id',
            'id',
            'id',
            'order_id'
        );
    }
}

// Использование
$order = Order::with(['user', 'items.product'])->find(1);

echo "Заказ №" . $order->id . "\n";
echo "Покупатель: " . $order->user->name . "\n";

foreach ($order->items as $item) {
    echo $item->product->name . " x " . $item->quantity . "\n";
}
```

---

## 9. Частые ошибки и как их избежать

### ❌ Ошибка 1: Забыли про Eager Loading

```php
// ПЛОХО
$posts = Post::all();
foreach ($posts as $post) {
    echo $post->user->name; // N+1 проблема
}

// ХОРОШО
$posts = Post::with('user')->get();
foreach ($posts as $post) {
    echo $post->user->name;
}
```

### ❌ Ошибка 2: Неправильное имя метода

```php
// ПЛОХО: метод должен быть в единственном числе для belongsTo
class Post extends Model
{
    public function users() // ❌ Неправильно
    {
        return $this->belongsTo(User::class);
    }
}

// ХОРОШО
class Post extends Model
{
    public function user() // ✅ Правильно
    {
        return $this->belongsTo(User::class);
    }
}
```

### ❌ Ошибка 3: Забыли UNIQUE для hasOne

```sql
-- ПЛОХО для hasOne
CREATE TABLE profiles (
    user_id BIGINT UNSIGNED -- ❌ Не unique
);

-- ХОРОШО
CREATE TABLE profiles (
    user_id BIGINT UNSIGNED UNIQUE -- ✅ Правильно
);
```

### ❌ Ошибка 4: Неправильный порядок в belongsToMany

```php
// ПЛОХО: pivot таблица должна быть в алфавитном порядке
CREATE TABLE tag_post -- ❌ Неправильный порядок

// ХОРОШО
CREATE TABLE post_tag -- ✅ Правильно (post < tag в алфавите)
```

---

## 10. Упражнения

### Упражнение 1: Система управления курсами

Создай структуру БД и модели для:
- Курсы (courses)
- Студенты (students)
- Преподаватели (teachers)
- Один курс имеет одного преподавателя
- Студенты могут записаться на много курсов
- В pivot таблице храни оценку (grade) и дату записи (enrolled_at)

**Задания:**
1. Создай миграции
2. Опиши все связи в моделях
3. Напиши код для записи студента на курс с оценкой
4. Получи всех студентов курса с их оценками
5. Получи все курсы студента
6. Посчитай средний балл студента

### Упражнение 2: Социальная сеть

Создай:
- Пользователи могут публиковать посты
- Посты могут содержать изображения (полиморфная связь)
- Пользователи могут лайкать посты и комментарии (полиморфная связь)
- Пользователи могут подписываться друг на друга (самосвязь)

**Задания:**
1. Спроектируй БД
2. Создай модели и связи
3. Реализуй возможность поставить/убрать лайк
4. Получи ленту постов от подписок пользователя
5. Подсчитай количество лайков у поста без загрузки самих лайков

### Упражнение 3: Оптимизация запросов

Дан код:
```php
$posts = Post::all();
foreach ($posts as $post) {
    echo $post->user->name;
    echo $post->category->name;
    foreach ($post->comments as $comment) {
        echo $comment->user->name;
    }
}
```

**Задания:**
1. Определи, сколько запросов выполнится для 10 постов (у каждого по 3 комментария)
2. Оптимизируй код с помощью Eager Loading
3. Проверь количество запросов через `DB::enableQueryLog()`

---

## 11. Чеклист для самопроверки

После изучения этой главы ты должен уметь:

- [ ] Объяснить разницу между hasOne, hasMany, belongsTo
- [ ] Создать полноценную связь One-to-Many
- [ ] Настроить Many-to-Many с pivot данными
- [ ] Использовать полиморфные связи для гибкой архитектуры
- [ ] Применять Eager Loading для оптимизации запросов
- [ ] Распознать проблему N+1 и исправить её
- [ ] Использовать withCount() для подсчёта связей
- [ ] Создать вложенную предзагрузку (nested eager loading)
- [ ] Работать с pivot таблицами: attach, detach, sync, toggle
- [ ] Добавлять условия к связям при загрузке

---

## 12. Что дальше?

В следующей главе **9.3: Eager Loading и N+1** мы углубимся в:
- Детальный разбор проблемы N+1
- Lazy Eager Loading
- Eager Loading Constraints
- Оптимизация сложных запросов
- Инструменты для отслеживания производительности

Eloquent связи — это мощь, но с ней приходит ответственность за производительность. Понимание того, когда и как загружать данные, делает разницу между быстрым и медленным приложением.

---

**Основные выводы:**
1. **hasOne/hasMany** — владеющая сторона связи
2. **belongsTo** — зависимая сторона (где хранится внешний ключ)
3. **belongsToMany** — для связей многие-ко-многим с pivot таблицей
4. **Полиморфные связи** — когда модель может принадлежать разным типам
5. **Eager Loading** — всегда используй `with()` для избежания N+1
6. **withCount()** — когда нужно только количество, а не сами записи

Теперь твои модели могут разговаривать друг с другом как хорошо знакомые друзья! 🚀