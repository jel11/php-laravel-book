# Глава 9.5: Seeders и Factories — тестовые данные, фейковые записи для разработки

## Введение: Зачем нам нужны тестовые данные?

Представь: ты создал мессенджер. Есть миграции, модели, контроллеры. Запускаешь приложение — пустота. Ни пользователей, ни чатов, ни сообщений. Чтобы протестировать функционал, тебе нужно вручную:

- Зарегистрировать 10 пользователей
- Создать между ними чаты
- Отправить сотни сообщений
- Загрузить файлы, аватарки...

На это уйдут **часы**. И всё это придётся повторять каждый раз, когда ты сбросишь базу данных.

**Решение**: автоматизировать создание тестовых данных. В Laravel для этого есть два инструмента:

- **Factories** — шаблоны для создания моделей с фейковыми данными
- **Seeders** — скрипты, которые наполняют базу данных

## 1. Factories — фабрики моделей

### 1.1 Что такое Factory?

Factory — это класс, который описывает, **как создать экземпляр модели** с реалистичными фейковыми данными.

**Создание Factory:**

```bash
php artisan make:factory UserFactory
```

Файл появится в `database/factories/UserFactory.php`:

```php
<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    /**
     * Определяем дефолтные значения для модели
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => Hash::make('password'), // Все тестовые пользователи с паролем "password"
            'remember_token' => Str::random(10),
        ];
    }
    
    /**
     * Состояние: непроверенный email
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
```

**Ключевые моменты:**

- `fake()` — глобальный хелпер Laravel, возвращает объект Faker (библиотека для генерации фейковых данных)
- `definition()` — основной метод, возвращает массив атрибутов модели
- `state()` — позволяет создавать вариации (например, "пользователь без подтверждённого email")

### 1.2 Использование Factory

**Создать одну модель:**

```php
use App\Models\User;

$user = User::factory()->create();
// Создаёт пользователя и СОХРАНЯЕТ в БД
```

**Создать несколько:**

```php
$users = User::factory()->count(50)->create();
// 50 пользователей в БД
```

**Создать без сохранения в БД (для тестов):**

```php
$user = User::factory()->make();
// Создаёт объект User, но НЕ сохраняет в базу
```

**Переопределить атрибуты:**

```php
$admin = User::factory()->create([
    'name' => 'Admin',
    'email' => 'admin@example.com',
    'role' => 'admin'
]);
```

**Использовать состояния (states):**

```php
$unverified = User::factory()->unverified()->create();
// email_verified_at будет null
```

### 1.3 Faker — генератор фейковых данных

Laravel использует библиотеку **Faker** для генерации реалистичных данных.

**Примеры методов Faker:**

```php
// Личные данные
fake()->name()              // "John Doe"
fake()->firstName()         // "Jane"
fake()->lastName()          // "Smith"
fake()->email()             // "email@example.com"
fake()->safeEmail()         // "email@example.org" (безопасный домен)
fake()->phoneNumber()       // "+1-555-123-4567"

// Адреса
fake()->address()           // "123 Main St, Apt 4B, New York, NY 10001"
fake()->city()              // "Los Angeles"
fake()->country()           // "United States"
fake()->postcode()          // "90210"

// Даты
fake()->dateTimeBetween('-1 year', 'now')   // Случайная дата за последний год
fake()->dateTime()                           // Случайная дата
fake()->date()                               // "2024-03-15"

// Текст
fake()->sentence()          // "Lorem ipsum dolor sit amet."
fake()->paragraph()         // Целый абзац текста
fake()->text(200)           // Текст до 200 символов
fake()->words(5, true)      // "hello world foo bar baz"

// Числа
fake()->numberBetween(1, 100)       // 42
fake()->randomFloat(2, 0, 100)      // 45.67
fake()->boolean()                   // true/false

// Интернет
fake()->url()               // "https://example.com"
fake()->domainName()        // "example.com"
fake()->ipv4()              // "192.168.1.1"
fake()->userAgent()         // "Mozilla/5.0..."

// Картинки (URL с placeholder-сервиса)
fake()->imageUrl(640, 480, 'cats')  // "https://via.placeholder.com/640x480.png/cats"

// Случайные элементы
fake()->randomElement(['cat', 'dog', 'bird'])   // "dog"
fake()->randomElements(['a', 'b', 'c'], 2)      // ['a', 'c']
```

**Локализация (русский язык):**

```php
// В config/app.php
'faker_locale' => 'ru_RU',

// Теперь:
fake()->name()  // "Иван Петров"
fake()->city()  // "Москва"
```

### 1.4 Связи между моделями в Factories

**Пример: Post принадлежит User**

```php
// database/factories/PostFactory.php
class PostFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),  // Автоматически создаст User
            'title' => fake()->sentence(),
            'content' => fake()->paragraphs(3, true),
            'published_at' => fake()->dateTimeBetween('-6 months', 'now'),
        ];
    }
}
```

**Использование:**

```php
// Создаст User И Post
$post = Post::factory()->create();

// Создать Post для конкретного User
$user = User::find(1);
$post = Post::factory()->create(['user_id' => $user->id]);

// Или через связь (удобнее):
$post = $user->posts()->create(Post::factory()->raw());
```

**Пример: User has many Posts**

```php
$user = User::factory()
    ->has(Post::factory()->count(10))
    ->create();
// Создаст пользователя с 10 постами
```

**Альтернативный синтаксис:**

```php
$user = User::factory()
    ->hasPosts(10)  // Короче!
    ->create();
```

**Many-to-Many (например, роли):**

```php
$user = User::factory()
    ->hasAttached(
        Role::factory()->count(2),
        ['expires_at' => now()->addYear()]  // Доп. поля pivot-таблицы
    )
    ->create();
```

### 1.5 Состояния (States) — вариации Factory

```php
class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'role' => 'user',
            'is_active' => true,
        ];
    }
    
    // Состояние: администратор
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'admin',
        ]);
    }
    
    // Состояние: неактивный
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
    
    // Состояние: с подтверждённым email
    public function verified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => now(),
        ]);
    }
}
```

**Использование:**

```php
$admin = User::factory()->admin()->create();
$inactive = User::factory()->inactive()->create();

// Можно комбинировать:
$inactiveAdmin = User::factory()->admin()->inactive()->create();
```

### 1.6 Callbacks — действия после создания

```php
class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
        ];
    }
    
    public function configure(): static
    {
        return $this->afterCreating(function (User $user) {
            // Создать профиль для пользователя
            $user->profile()->create([
                'bio' => fake()->paragraph(),
                'avatar' => fake()->imageUrl(200, 200, 'people'),
            ]);
            
            // Добавить в команду по умолчанию
            $user->teams()->attach(Team::first());
        });
    }
}
```

---

## 2. Seeders — наполнение базы данных

### 2.1 Что такое Seeder?

Seeder — это класс, который **запускает процесс наполнения БД** тестовыми данными.

**Создание Seeder:**

```bash
php artisan make:seeder UserSeeder
```

Файл появится в `database/seeders/UserSeeder.php`:

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Создать 50 пользователей
        User::factory()->count(50)->create();
        
        // Создать конкретного админа
        User::factory()->create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'role' => 'admin',
        ]);
    }
}
```

### 2.2 DatabaseSeeder — главный оркестратор

Файл `database/seeders/DatabaseSeeder.php` — точка входа для всех seeders:

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Вызываем другие seeders
        $this->call([
            UserSeeder::class,
            PostSeeder::class,
            CommentSeeder::class,
        ]);
    }
}
```

**Запуск:**

```bash
# Запустить все seeders
php artisan db:seed

# Запустить конкретный seeder
php artisan db:seed --class=UserSeeder

# Сбросить БД и запустить seeders (свежий старт)
php artisan migrate:fresh --seed
```

### 2.3 Пример: полноценный Seeder для мессенджера

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Chat;
use App\Models\Message;

class MessengerSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Создать пользователей
        $users = User::factory()->count(20)->create();
        
        // 2. Создать админа
        $admin = User::factory()->admin()->create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
        ]);
        
        // 3. Создать чаты
        $chats = Chat::factory()->count(15)->create();
        
        // 4. Привязать пользователей к чатам (многие-ко-многим)
        $chats->each(function ($chat) use ($users) {
            // Каждый чат — 2-5 случайных участников
            $chat->users()->attach(
                $users->random(rand(2, 5))->pluck('id')
            );
        });
        
        // 5. Создать сообщения в каждом чате
        $chats->each(function ($chat) {
            $participants = $chat->users;
            
            // 10-50 сообщений в чате
            Message::factory()->count(rand(10, 50))->create([
                'chat_id' => $chat->id,
                'user_id' => $participants->random()->id,
            ]);
        });
    }
}
```

### 2.4 Условные seeders (для разных окружений)

```php
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Только для локальной разработки
        if (app()->environment('local')) {
            $this->call([
                TestUserSeeder::class,
                FakeDataSeeder::class,
            ]);
        }
        
        // Для продакшена — только базовые данные
        $this->call([
            RoleSeeder::class,
            SettingSeeder::class,
        ]);
    }
}
```

### 2.5 Seeders с существующими данными

```php
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = ['admin', 'moderator', 'user'];
        
        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role]);
            // Создаст только если роли ещё нет
        }
    }
}
```

---

## 3. Продвинутые техники

### 3.1 Sequence — последовательные значения

```php
$users = User::factory()
    ->count(10)
    ->sequence(
        ['role' => 'admin'],
        ['role' => 'moderator'],
        ['role' => 'user'],
    )
    ->create();
// Роли будут чередоваться: admin, moderator, user, admin, moderator...
```

**Или с функцией:**

```php
$posts = Post::factory()
    ->count(10)
    ->sequence(fn (Sequence $sequence) => [
        'order' => $sequence->index + 1,  // 1, 2, 3, 4...
    ])
    ->create();
```

### 3.2 Recycle — переиспользовать модели

Без `recycle()` — каждый раз создаётся новый User:

```php
Post::factory()->count(100)->create();
// Создаст 100 постов и 100 пользователей
```

С `recycle()` — используются существующие User:

```php
$users = User::factory()->count(5)->create();

Post::factory()
    ->count(100)
    ->recycle($users)
    ->create();
// 100 постов распределятся между 5 пользователями
```

### 3.3 Cross — связь многие-ко-многим

```php
$users = User::factory()->count(10)->create();
$roles = Role::factory()->count(3)->create();

// Связать каждого пользователя с 1-2 ролями
$users->each(function ($user) use ($roles) {
    $user->roles()->attach(
        $roles->random(rand(1, 2))->pluck('id')
    );
});
```

### 3.4 Производительность — массовая вставка

Медленно (100 INSERT запросов):

```php
User::factory()->count(100)->create();
```

Быстрее (1 INSERT запрос):

```php
$users = User::factory()->count(100)->make()->toArray();
User::insert($users);  // Массовая вставка
```

⚠️ **Минус**: не сработают события модели (`creating`, `created`), автоинкремент может не вернуть ID.

---

## 4. Практические примеры

### 4.1 Блог с комментариями

```php
// PostFactory.php
class PostFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->sentence(),
            'slug' => fake()->slug(),
            'content' => fake()->paragraphs(5, true),
            'published_at' => fake()->boolean(80) 
                ? fake()->dateTimeBetween('-1 year', 'now') 
                : null,
        ];
    }
    
    public function published(): static
    {
        return $this->state(fn () => [
            'published_at' => fake()->dateTimeBetween('-1 year', 'now'),
        ]);
    }
    
    public function draft(): static
    {
        return $this->state(fn () => [
            'published_at' => null,
        ]);
    }
}

// CommentFactory.php
class CommentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'post_id' => Post::factory(),
            'user_id' => User::factory(),
            'content' => fake()->paragraph(),
            'approved' => fake()->boolean(90),
        ];
    }
}

// BlogSeeder.php
class BlogSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::factory()->count(10)->create();
        
        $posts = Post::factory()
            ->count(30)
            ->recycle($users)
            ->create();
        
        // Комментарии для каждого поста
        $posts->each(function ($post) use ($users) {
            Comment::factory()
                ->count(rand(0, 15))
                ->recycle($users)
                ->create([
                    'post_id' => $post->id,
                ]);
        });
    }
}
```

### 4.2 Интернет-магазин

```php
// ProductFactory.php
class ProductFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true),
            'description' => fake()->paragraph(),
            'price' => fake()->randomFloat(2, 10, 1000),
            'stock' => fake()->numberBetween(0, 100),
            'category_id' => Category::factory(),
            'image_url' => fake()->imageUrl(400, 400, 'tech'),
        ];
    }
    
    public function outOfStock(): static
    {
        return $this->state(fn () => ['stock' => 0]);
    }
}

// OrderFactory.php
class OrderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'status' => fake()->randomElement(['pending', 'paid', 'shipped', 'delivered']),
            'total' => 0,  // Вычислим позже
            'created_at' => fake()->dateTimeBetween('-6 months', 'now'),
        ];
    }
}

// ShopSeeder.php
class ShopSeeder extends Seeder
{
    public function run(): void
    {
        $categories = Category::factory()->count(5)->create();
        
        $products = Product::factory()
            ->count(50)
            ->recycle($categories)
            ->create();
        
        $users = User::factory()->count(20)->create();
        
        // Заказы
        $users->each(function ($user) use ($products) {
            $orderCount = rand(0, 5);
            
            for ($i = 0; $i < $orderCount; $i++) {
                $order = Order::factory()->create([
                    'user_id' => $user->id,
                ]);
                
                // Товары в заказе
                $orderProducts = $products->random(rand(1, 5));
                $total = 0;
                
                foreach ($orderProducts as $product) {
                    $quantity = rand(1, 3);
                    $price = $product->price;
                    
                    $order->products()->attach($product->id, [
                        'quantity' => $quantity,
                        'price' => $price,
                    ]);
                    
                    $total += $price * $quantity;
                }
                
                $order->update(['total' => $total]);
            }
        });
    }
}
```

---

## 5. Частые ошибки и их решения

### ❌ Ошибка 1: Дублирование уникальных полей

```php
// ПЛОХО
User::factory()->count(100)->create([
    'email' => 'same@email.com'  // Все 100 пользователей с одним email — ошибка!
]);

// ХОРОШО
User::factory()->count(100)->create();
// Faker автоматически создаст уникальные email через unique()
```

### ❌ Ошибка 2: Забыли про foreign keys

```php
// ПЛОХО — упадёт, если user_id не существует
Post::factory()->create(['user_id' => 9999]);

// ХОРОШО
Post::factory()->create(['user_id' => User::factory()]);
```

### ❌ Ошибка 3: Слишком медленный seeder

```php
// ПЛОХО — 1000 запросов
for ($i = 0; $i < 1000; $i++) {
    User::factory()->create();
}

// ХОРОШО
User::factory()->count(1000)->create();
// Или ещё быстрее:
User::insert(User::factory()->count(1000)->make()->toArray());
```

### ❌ Ошибка 4: Не очищаете БД перед seeding

```bash
# ПЛОХО
php artisan db:seed  # Данные добавляются к существующим

# ХОРОШО
php artisan migrate:fresh --seed  # Чистая БД + seeders
```

---

## 6. Best Practices

### ✅ 1. Один Seeder = одна ответственность

```php
// ПЛОХО
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::factory()->count(100)->create();
        Post::factory()->count(500)->create();
        Comment::factory()->count(2000)->create();
        // Всё в одной куче
    }
}

// ХОРОШО
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            PostSeeder::class,
            CommentSeeder::class,
        ]);
    }
}
```

### ✅ 2. Используйте состояния вместо дублирования

```php
// ПЛОХО
User::factory()->create(['role' => 'admin']);
User::factory()->create(['role' => 'moderator']);

// ХОРОШО
User::factory()->admin()->create();
User::factory()->moderator()->create();
```

### ✅ 3. Создавайте реалистичные данные

```php
// ПЛОХО
'created_at' => now()  // Все записи с одной датой

// ХОРОШО
'created_at' => fake()->dateTimeBetween('-1 year', 'now')
```

### ✅ 4. Комментируйте сложную логику

```php
public function run(): void
{
    // Создаём 10 пользователей, каждый с 5-10 постами
    $users = User::factory()
        ->count(10)
        ->has(Post::factory()->count(rand(5, 10)))
        ->create();
    
    // Для каждого поста создаём 0-5 комментариев от случайных пользователей
    Post::all()->each(function ($post) use ($users) {
        Comment::factory()
            ->count(rand(0, 5))
            ->create([
                'post_id' => $post->id,
                'user_id' => $users->random()->id,
            ]);
    });
}
```

---

## 7. Упражнения

### Задание 1: Базовая фабрика
Создай фабрику для модели `Product` с полями:
- `name` (3-5 слов)
- `description` (абзац текста)
- `price` (от 100 до 10000)
- `in_stock` (boolean, 80% true)

### Задание 2: Связи
Создай фабрики для `Author` и `Book`. У автора может быть много книг. Создай сидер, который сгенерирует:
- 10 авторов
- У каждого автора 2-5 книг

### Задание 3: Состояния
Расширь фабрику `Product` состояниями:
- `discount()` — цена со скидкой 20%
- `featured()` — `is_featured = true`
- `outOfStock()` — `in_stock = false`

### Задание 4: Сложный сценарий
Создай систему для библиотеки:
- Users (читатели)
- Books (книги)
- Borrows (записи о выдаче книг)

Сидер должен:
1. Создать 20 читателей
2. Создать 100 книг
3. Создать 50 записей о выдаче (случайные пользователи + книги)
4. 70% записей — книга уже возвращена (`returned_at` != null)
5. 30% — ещё на руках (`returned_at` = null)

---

## Заключение

**Factories и Seeders** — это не просто удобство, это **необходимость** для продуктивной разработки. Они позволяют:

✅ Быстро наполнять БД реалистичными данными  
✅ Тестировать функционал на больших объёмах  
✅ Легко сбрасывать и пересоздавать базу  
✅ Делиться тестовым окружением с командой  
✅ Писать автоматические тесты с изолированными данными  

**Следующий шаг**: Глава 10.1 — Аутентификация в Laravel. Научимся защищать приложение, создавать системы входа и управлять правами доступа.

Удачи! 🚀