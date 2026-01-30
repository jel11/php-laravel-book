# Глава 8.5: Eloquent ORM — модели, CRUD, mass assignment, accessors, mutators

## 📖 Введение

Помнишь, как в главе 3.3 ты работал с PDO, вручную писал SQL-запросы и маппил результаты в массивы? Eloquent — это ORM (Object-Relational Mapping), который превращает таблицы базы данных в объекты PHP. Вместо SQL ты работаешь с понятными методами, а Laravel сам генерирует оптимальные запросы.

**Что ты освоишь в этой главе:**
- Создание и настройка моделей Eloquent
- CRUD операции (Create, Read, Update, Delete) через ORM
- Mass Assignment и защита от уязвимостей
- Accessors и Mutators для преобразования данных
- Работа с датами и типизация атрибутов

---

## 🎯 Философия Eloquent: Active Record Pattern

Eloquent реализует паттерн **Active Record** — каждая модель представляет одну таблицу, а экземпляр модели — одну строку.

**Сравним подходы:**

### Было (PDO):
```php
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$id]);
$userData = $stmt->fetch(PDO::FETCH_ASSOC);

$user = [
    'name' => $userData['name'],
    'email' => $userData['email']
];
```

### Стало (Eloquent):
```php
$user = User::find($id);
echo $user->name;
echo $user->email;
```

---

## 🏗️ Создание модели

### Через Artisan:
```bash
php artisan make:model Post
```

Создаст файл `app/Models/Post.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    //
}
```

### С дополнительными опциями:
```bash
# Модель + миграция
php artisan make:model Post -m

# Модель + миграция + контроллер + seeder
php artisan make:model Post -mcrs

# Все вместе (migration, controller, resource, seeder, factory, policy, requests)
php artisan make:model Post --all
```

---

## 🔧 Настройка модели

### Конвенции Laravel (работают автоматически):

```php
class Post extends Model
{
    // 1. Имя таблицы: posts (множественное число, snake_case)
    // 2. Первичный ключ: id
    // 3. Timestamps: created_at, updated_at (автоматически управляются)
}
```

### Кастомная настройка:

```php
class Post extends Model
{
    // Если таблица называется не "posts"
    protected $table = 'blog_posts';
    
    // Если первичный ключ не "id"
    protected $primaryKey = 'post_id';
    
    // Если первичный ключ не auto-increment
    public $incrementing = false;
    
    // Тип первичного ключа (если не int)
    protected $keyType = 'string';
    
    // Отключить timestamps
    public $timestamps = false;
    
    // Кастомные имена полей timestamps
    const CREATED_AT = 'creation_date';
    const UPDATED_AT = 'updated_date';
    
    // Подключение к другой БД (если используешь несколько)
    protected $connection = 'mysql2';
}
```

---

## 📝 CRUD операции

### 1. CREATE (Создание)

#### Способ 1: Create + Save
```php
$post = new Post();
$post->title = 'Мой первый пост';
$post->content = 'Содержимое поста';
$post->author_id = 1;
$post->save(); // INSERT в БД

echo $post->id; // Автоматически получен после save()
```

#### Способ 2: Create (Mass Assignment)
```php
$post = Post::create([
    'title' => 'Второй пост',
    'content' => 'Еще контент',
    'author_id' => 1
]);
```

**⚠️ Требует настройки `$fillable` или `$guarded`!**

#### Способ 3: FirstOrCreate (найди или создай)
```php
// Найдет пост с таким email или создаст новый
$user = User::firstOrCreate(
    ['email' => 'test@example.com'],
    ['name' => 'Test User', 'password' => bcrypt('secret')]
);
```

#### Способ 4: UpdateOrCreate (обнови или создай)
```php
$post = Post::updateOrCreate(
    ['slug' => 'my-post'], // Условие поиска
    ['title' => 'Обновленный заголовок'] // Данные для обновления/создания
);
```

---

### 2. READ (Чтение)

#### Получение всех записей:
```php
$posts = Post::all(); // Collection из всех постов

foreach ($posts as $post) {
    echo $post->title;
}
```

#### Получение с условиями:
```php
// WHERE title = 'Laravel'
$posts = Post::where('title', 'Laravel')->get();

// WHERE views > 100
$posts = Post::where('views', '>', 100)->get();

// WHERE status = 'published' AND views > 50
$posts = Post::where('status', 'published')
             ->where('views', '>', 50)
             ->get();

// WHERE status = 'published' OR status = 'draft'
$posts = Post::where('status', 'published')
             ->orWhere('status', 'draft')
             ->get();
```

#### Получение одной записи:
```php
// По первичному ключу
$post = Post::find(1);

// Первая запись или null
$post = Post::where('status', 'published')->first();

// Первая запись или исключение (404 в веб-контексте)
$post = Post::findOrFail(1);

// Первая запись или выполнить callback
$post = Post::firstOr(function () {
    return 'Нет постов';
});
```

#### Сортировка и ограничения:
```php
// ORDER BY created_at DESC
$posts = Post::orderBy('created_at', 'desc')->get();

// Последние 5 постов
$posts = Post::latest()->take(5)->get();

// Пропустить 10, взять 5 (пагинация)
$posts = Post::skip(10)->take(5)->get();
```

#### Выборка конкретных полей:
```php
// SELECT title, content FROM posts
$posts = Post::select('title', 'content')->get();

// Или через массив
$posts = Post::select(['title', 'content'])->get();
```

#### Агрегация:
```php
$count = Post::count();
$max = Post::max('views');
$avg = Post::avg('views');
$sum = Post::sum('views');
```

---

### 3. UPDATE (Обновление)

#### Способ 1: Find + Save
```php
$post = Post::find(1);
$post->title = 'Обновленный заголовок';
$post->save(); // UPDATE в БД
```

#### Способ 2: Update на модели
```php
$post = Post::find(1);
$post->update([
    'title' => 'Новый заголовок',
    'content' => 'Новый контент'
]);
```

#### Способ 3: Mass Update (на коллекции)
```php
// Обновить все посты со статусом 'draft'
Post::where('status', 'draft')->update([
    'status' => 'published'
]);
```

#### Инкремент/Декремент:
```php
$post = Post::find(1);

// views += 1
$post->increment('views');

// views += 5
$post->increment('views', 5);

// views -= 1
$post->decrement('views');

// Инкремент с дополнительными полями
$post->increment('views', 1, [
    'last_viewed_at' => now()
]);
```

---

### 4. DELETE (Удаление)

#### Удаление экземпляра:
```php
$post = Post::find(1);
$post->delete(); // DELETE FROM posts WHERE id = 1
```

#### Удаление по ID:
```php
Post::destroy(1);        // Один ID
Post::destroy([1, 2, 3]); // Несколько ID
Post::destroy(1, 2, 3);   // Альтернативный синтаксис
```

#### Mass Delete:
```php
// Удалить все посты со статусом 'draft'
Post::where('status', 'draft')->delete();
```

#### Soft Deletes (мягкое удаление):
```php
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use SoftDeletes;
}
```

После этого:
```php
$post->delete(); // Установит deleted_at = NOW(), не удалит физически

// Получить только не удаленные
$posts = Post::all();

// Получить только удаленные
$posts = Post::onlyTrashed()->get();

// Получить все (включая удаленные)
$posts = Post::withTrashed()->get();

// Восстановить
$post = Post::withTrashed()->find(1);
$post->restore();

// Удалить окончательно
$post->forceDelete();
```

---

## 🛡️ Mass Assignment (массовое присвоение)

### Проблема безопасности:

Представь форму регистрации:
```html
<input name="name">
<input name="email">
<input name="password">
```

Злоумышленник может добавить поле:
```html
<input name="is_admin" value="1">
```

Если ты делаешь:
```php
User::create($request->all()); // ОПАСНО!
```

То злоумышленник станет админом!

---

### Решение 1: $fillable (белый список)

```php
class Post extends Model
{
    protected $fillable = [
        'title',
        'content',
        'author_id',
        'status'
    ];
}
```

Теперь только эти поля можно массово присваивать:
```php
Post::create($request->all()); // Безопасно, если в $fillable правильные поля
```

---

### Решение 2: $guarded (черный список)

```php
class Post extends Model
{
    protected $guarded = [
        'id',
        'is_featured',
        'admin_only_field'
    ];
}
```

Все поля, кроме указанных, можно присваивать массово.

**⚠️ Никогда не делай:**
```php
protected $guarded = []; // Отключает всю защиту!
```

---

### Альтернатива: forceFill (в исключительных случаях)

```php
$post = new Post();
$post->forceFill([
    'id' => 999, // Даже защищенные поля
    'title' => 'Test'
])->save();
```

---

## 🎨 Accessors (Геттеры)

**Accessors** преобразуют данные **при чтении** из БД.

### Пример 1: Форматирование имени

```php
class User extends Model
{
    // Accessor для атрибута 'name'
    protected function name(): Attribute
    {
        return Attribute::make(
            get: fn (string $value) => ucfirst($value),
        );
    }
}
```

Использование:
```php
// В БД: 'john doe'
$user = User::find(1);
echo $user->name; // "John doe"
```

### Пример 2: Полное имя

```php
class User extends Model
{
    protected $appends = ['full_name']; // Добавить в JSON

    protected function fullName(): Attribute
    {
        return Attribute::make(
            get: fn () => "{$this->first_name} {$this->last_name}",
        );
    }
}
```

Использование:
```php
$user = User::find(1);
echo $user->full_name; // "John Doe"

// В JSON автоматически, благодаря $appends
return $user->toArray();
// ['id' => 1, 'first_name' => 'John', ..., 'full_name' => 'John Doe']
```

### Пример 3: Форматирование цены

```php
class Product extends Model
{
    protected function price(): Attribute
    {
        return Attribute::make(
            get: fn (int $value) => $value / 100, // Хранится в центах
        );
    }
}
```

```php
// В БД: 1500 (центов)
$product = Product::find(1);
echo $product->price; // 15.00
```

---

## 🖊️ Mutators (Сеттеры)

**Mutators** преобразуют данные **при записи** в БД.

### Пример 1: Автоматическое хеширование пароля

```php
class User extends Model
{
    protected function password(): Attribute
    {
        return Attribute::make(
            set: fn (string $value) => bcrypt($value),
        );
    }
}
```

Использование:
```php
$user = new User();
$user->password = 'secret123'; // Автоматически хешируется
$user->save();
// В БД: '$2y$10$...' (bcrypt hash)
```

### Пример 2: Нормализация телефона

```php
class User extends Model
{
    protected function phone(): Attribute
    {
        return Attribute::make(
            set: fn (string $value) => preg_replace('/[^0-9]/', '', $value),
        );
    }
}
```

```php
$user = new User();
$user->phone = '+1 (555) 123-4567';
$user->save();
// В БД: '15551234567'
```

### Пример 3: Accessor + Mutator вместе

```php
class Product extends Model
{
    protected function price(): Attribute
    {
        return Attribute::make(
            get: fn (int $value) => $value / 100,      // При чтении: центы → доллары
            set: fn (float $value) => $value * 100,    // При записи: доллары → центы
        );
    }
}
```

```php
$product = new Product();
$product->price = 19.99; // Запись: сохранится 1999
$product->save();

$product = Product::find(1);
echo $product->price; // Чтение: 19.99
```

---

## 🕒 Работа с датами

### Автоматические timestamps:

Laravel автоматически управляет `created_at` и `updated_at`:

```php
$post = new Post();
$post->title = 'Test';
$post->save();
// created_at и updated_at автоматически установлены

$post->title = 'Updated';
$post->save();
// updated_at автоматически обновлен
```

---

### Добавление кастомных дат:

```php
class Post extends Model
{
    protected $casts = [
        'published_at' => 'datetime',
        'email_verified_at' => 'datetime',
    ];
}
```

Теперь эти поля автоматически превращаются в объекты `Carbon`:

```php
$post = Post::find(1);

// Carbon instance
echo $post->published_at->format('d.m.Y H:i');
echo $post->published_at->diffForHumans(); // "2 days ago"
echo $post->published_at->addDays(5);
```

---

### Query по датам:

```php
// Посты за сегодня
$posts = Post::whereDate('created_at', today())->get();

// Посты за последние 7 дней
$posts = Post::where('created_at', '>', now()->subDays(7))->get();

// Посты опубликованные в 2024 году
$posts = Post::whereYear('created_at', 2024)->get();

// Посты за декабрь
$posts = Post::whereMonth('created_at', 12)->get();
```

---

## 🔢 Casting (приведение типов)

Laravel автоматически преобразует типы данных:

```php
class Post extends Model
{
    protected $casts = [
        'is_published' => 'boolean',
        'views' => 'integer',
        'rating' => 'float',
        'metadata' => 'array',  // JSON → массив
        'config' => 'object',   // JSON → объект
        'published_at' => 'datetime',
        'tags' => 'encrypted:array', // Шифрование + массив
    ];
}
```

### Примеры использования:

```php
$post = Post::find(1);

// Boolean
var_dump($post->is_published); // true/false (не "1"/"0")

// Array (автоматически json_decode)
$post->metadata = ['key' => 'value'];
$post->save();
// В БД: '{"key":"value"}'

$post = Post::find(1);
print_r($post->metadata); // ['key' => 'value']

// Datetime
echo $post->published_at->format('Y-m-d'); // Carbon instance
```

---

### Кастомные касты:

Создай класс:
```bash
php artisan make:cast Json
```

```php
<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;

class Json implements CastsAttributes
{
    public function get($model, string $key, $value, array $attributes)
    {
        return json_decode($value, true);
    }

    public function set($model, string $key, $value, array $attributes)
    {
        return json_encode($value);
    }
}
```

Использование:
```php
class Post extends Model
{
    protected $casts = [
        'options' => Json::class,
    ];
}
```

---

## 🎯 Практические сценарии

### Сценарий 1: Блог

```php
// Модель Post
class Post extends Model
{
    protected $fillable = [
        'title', 'slug', 'content', 'author_id', 'status'
    ];
    
    protected $casts = [
        'published_at' => 'datetime',
        'is_featured' => 'boolean',
    ];
    
    protected $appends = ['excerpt'];
    
    // Accessor для отрывка
    protected function excerpt(): Attribute
    {
        return Attribute::make(
            get: fn () => substr(strip_tags($this->content), 0, 200) . '...',
        );
    }
    
    // Mutator для slug
    protected function slug(): Attribute
    {
        return Attribute::make(
            set: fn (string $value) => str($value)->slug(),
        );
    }
}

// Использование
$post = Post::create([
    'title' => 'Мой пост',
    'slug' => 'Мой пост',  // Автоматически: "moi-post"
    'content' => '<p>Длинный текст...</p>',
    'author_id' => 1,
]);

echo $post->excerpt; // "Длинный текст..."
```

---

### Сценарий 2: E-commerce

```php
class Product extends Model
{
    protected $fillable = [
        'name', 'price', 'quantity', 'status'
    ];
    
    protected $casts = [
        'price' => 'float',
        'quantity' => 'integer',
        'is_available' => 'boolean',
        'metadata' => 'array',
    ];
    
    protected $appends = ['is_in_stock', 'formatted_price'];
    
    // Accessor: товар в наличии?
    protected function isInStock(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->quantity > 0,
        );
    }
    
    // Accessor: форматированная цена
    protected function formattedPrice(): Attribute
    {
        return Attribute::make(
            get: fn () => '$' . number_format($this->price, 2),
        );
    }
}

// Использование
$product = Product::find(1);
echo $product->formatted_price; // "$19.99"

if ($product->is_in_stock) {
    echo "Есть в наличии";
}

// Увеличить количество просмотров
$product->increment('views');
```

---

### Сценарий 3: Система заказов

```php
class Order extends Model
{
    protected $fillable = [
        'user_id', 'total', 'status', 'items'
    ];
    
    protected $casts = [
        'total' => 'float',
        'items' => 'array',
        'paid_at' => 'datetime',
    ];
    
    // Статусы заказа
    const STATUS_PENDING = 'pending';
    const STATUS_PAID = 'paid';
    const STATUS_SHIPPED = 'shipped';
    const STATUS_DELIVERED = 'delivered';
    
    protected function status(): Attribute
    {
        return Attribute::make(
            set: fn (string $value) => strtolower($value),
        );
    }
}

// Создание заказа
$order = Order::create([
    'user_id' => auth()->id(),
    'total' => 149.99,
    'status' => Order::STATUS_PENDING,
    'items' => [
        ['product_id' => 1, 'quantity' => 2],
        ['product_id' => 5, 'quantity' => 1],
    ]
]);

// Обновление статуса
$order->update(['status' => Order::STATUS_PAID, 'paid_at' => now()]);
```

---

## ⚠️ Частые ошибки

### ❌ Ошибка 1: Забыл $fillable
```php
// Модель
class Post extends Model
{
    // Нет $fillable!
}

// Попытка создать
Post::create(['title' => 'Test']); 
// MassAssignmentException
```

**Решение:** Добавь `$fillable` или `$guarded`.

---

### ❌ Ошибка 2: N+1 проблема (будет в следующей главе)
```php
$posts = Post::all();

foreach ($posts as $post) {
    echo $post->author->name; // Каждая итерация = 1 запрос!
}
// 1 запрос на посты + N запросов на авторов = N+1
```

**Решение:** Eager Loading (глава 9.3).

---

### ❌ Ошибка 3: Сравнение дат без приведения типа
```php
// БД: '2024-01-15 10:00:00' (строка)
if ($post->created_at > '2024-01-01') { // Работает, но ненадежно
```

**Решение:** Используй `$casts`:
```php
protected $casts = ['created_at' => 'datetime'];

if ($post->created_at->gt(now()->subDays(7))) { // Carbon методы
```

---

### ❌ Ошибка 4: Изменение атрибута без save()
```php
$post = Post::find(1);
$post->title = 'New Title';
// Забыл $post->save()
```

БД не обновится!

---

## 🧪 Упражнения

### Упражнение 1: Модель статьи (15 минут)

Создай модель `Article` с полями:
- `title` (string)
- `content` (text)
- `views` (integer, по умолчанию 0)
- `published_at` (datetime, nullable)

Реализуй:
1. Accessor `is_published` (проверяет, что `published_at` не null и <= now)
2. Mutator для `title` (убирает лишние пробелы: `trim()`)
3. Метод для увеличения просмотров

<details>
<summary>Решение</summary>

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Article extends Model
{
    protected $fillable = [
        'title', 'content', 'views', 'published_at'
    ];
    
    protected $casts = [
        'views' => 'integer',
        'published_at' => 'datetime',
    ];
    
    protected $appends = ['is_published'];
    
    // Accessor: опубликована?
    protected function isPublished(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->published_at !== null 
                       && $this->published_at->lte(now()),
        );
    }
    
    // Mutator: очистка заголовка
    protected function title(): Attribute
    {
        return Attribute::make(
            set: fn (string $value) => trim($value),
        );
    }
    
    // Увеличить просмотры
    public function incrementViews()
    {
        $this->increment('views');
    }
}

// Использование
$article = Article::create([
    'title' => '  Моя статья  ',
    'content' => 'Текст...',
    'published_at' => now(),
]);

echo $article->title; // "Моя статья" (без пробелов)
echo $article->is_published; // true

$article->incrementViews();
echo $article->views; // 1
```
</details>

---

### Упражнение 2: Система пользователей (20 минут)

Создай модель `User` с:
- `first_name`, `last_name` (string)
- `email` (string, уникальный)
- `password` (string)
- `last_login_at` (datetime, nullable)

Реализуй:
1. Accessor `full_name` (возвращает "First Last")
2. Mutator для `password` (автоматически хеширует)
3. Метод `wasRecentlyOnline()` (проверяет, был ли онлайн за последние 5 минут)

<details>
<summary>Решение</summary>

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class User extends Model
{
    protected $fillable = [
        'first_name', 'last_name', 'email', 'password'
    ];
    
    protected $hidden = ['password']; // Скрыть при toArray()
    
    protected $casts = [
        'last_login_at' => 'datetime',
    ];
    
    protected $appends = ['full_name'];
    
    // Accessor: полное имя
    protected function fullName(): Attribute
    {
        return Attribute::make(
            get: fn () => "{$this->first_name} {$this->last_name}",
        );
    }
    
    // Mutator: хеширование пароля
    protected function password(): Attribute
    {
        return Attribute::make(
            set: fn (string $value) => bcrypt($value),
        );
    }
    
    // Был онлайн недавно?
    public function wasRecentlyOnline(): bool
    {
        if (!$this->last_login_at) {
            return false;
        }
        
        return $this->last_login_at->gt(now()->subMinutes(5));
    }
}

// Использование
$user = User::create([
    'first_name' => 'John',
    'last_name' => 'Doe',
    'email' => 'john@example.com',
    'password' => 'secret123', // Автоматически хешируется
]);

echo $user->full_name; // "John Doe"

$user->last_login_at = now();
$user->save();

if ($user->wasRecentlyOnline()) {
    echo "Пользователь онлайн";
}
```
</details>

---

### Упражнение 3: E-commerce продукты (25 минут)

Создай модель `Product` с:
- `name` (string)
- `price_cents` (integer, хранится в центах)
- `discount_percent` (integer, 0-100)
- `stock_quantity` (integer)
- `metadata` (JSON)

Реализуй:
1. Accessor `price` (возвращает `price_cents / 100`)
2. Accessor `final_price` (цена с учетом скидки)
3. Accessor `is_in_stock` (проверяет `stock_quantity > 0`)
4. Метод `applyDiscount($percent)` (обновляет `discount_percent`)

<details>
<summary>Решение</summary>

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Product extends Model
{
    protected $fillable = [
        'name', 'price_cents', 'discount_percent', 'stock_quantity', 'metadata'
    ];
    
    protected $casts = [
        'price_cents' => 'integer',
        'discount_percent' => 'integer',
        'stock_quantity' => 'integer',
        'metadata' => 'array',
    ];
    
    protected $appends = ['price', 'final_price', 'is_in_stock'];
    
    // Accessor: цена в долларах
    protected function price(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->price_cents / 100,
        );
    }
    
    // Accessor: финальная цена со скидкой
    protected function finalPrice(): Attribute
    {
        return Attribute::make(
            get: function () {
                $price = $this->price;
                $discount = ($price * $this->discount_percent) / 100;
                return round($price - $discount, 2);
            },
        );
    }
    
    // Accessor: в наличии?
    protected function isInStock(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->stock_quantity > 0,
        );
    }
    
    // Применить скидку
    public function applyDiscount(int $percent)
    {
        if ($percent < 0 || $percent > 100) {
            throw new \InvalidArgumentException('Скидка должна быть от 0 до 100');
        }
        
        $this->update(['discount_percent' => $percent]);
    }
}

// Использование
$product = Product::create([
    'name' => 'Ноутбук',
    'price_cents' => 99999, // $999.99
    'discount_percent' => 10,
    'stock_quantity' => 5,
    'metadata' => ['color' => 'black', 'warranty' => '2 years'],
]);

echo $product->price;        // 999.99
echo $product->final_price;  // 899.99 (с 10% скидкой)
echo $product->is_in_stock;  // true

$product->applyDiscount(20);
echo $product->final_price;  // 799.99
```
</details>

---

## 🎓 Контрольные вопросы

1. **В чем разница между `find()` и `findOrFail()`?**
   <details>
   <summary>Ответ</summary>
   `find()` возвращает `null`, если запись не найдена. `findOrFail()` выбрасывает исключение `ModelNotFoundException`, которое Laravel превращает в 404 ответ.
   </details>

2. **Что произойдет, если использовать `create()` без настройки `$fillable` или `$guarded`?**
   <details>
   <summary>Ответ</summary>
   Laravel выбросит `MassAssignmentException`. Защита от массового присвоения обязательна для безопасности.
   </details>

3. **Можно ли использовать Accessor для вычисляемого поля, которое зависит от других моделей?**
   <details>
   <summary>Ответ</summary>
   Да, но осторожно! Это может вызвать N+1 проблему. Лучше использовать withCount() или appends с Eager Loading.
   </details>

4. **Зачем нужен `$hidden` в модели?**
   <details>
   <summary>Ответ</summary>
   `$hidden` скрывает поля при сериализации в JSON (например, `password`, `api_token`). Противоположность — `$visible`.
   </details>

5. **Что лучше: `$fillable` или `$guarded`?**
   <details>
   <summary>Ответ</summary>
   `$fillable` (белый список) безопаснее, т.к. явно указываешь разрешенные поля. `$guarded` (черный список) рискованнее — можно забыть добавить новое защищенное поле.
   </details>

---

## 🚀 Что дальше?

Ты освоил базовую работу с Eloquent! В следующих главах:
- **Глава 9.2**: Связи между моделями (hasMany, belongsTo, manyToMany)
- **Глава 9.3**: Решение N+1 проблемы через Eager Loading
- **Глава 9.4**: Query Scopes для переиспользуемых запросов

Eloquent — это мощнейший инструмент, который делает работу с БД интуитивной и безопасной. Продолжай практиковаться! 🎯