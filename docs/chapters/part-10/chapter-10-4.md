# Глава 10.4: Events и Listeners — событийная архитектура, Observers, подписчики

## 📋 Содержание главы

1. Что такое событийная архитектура и зачем она нужна
2. Events и Listeners в Laravel
3. Создание и регистрация событий
4. Observers — удобная альтернатива для моделей
5. Event Subscribers — группировка логики
6. Практические примеры и лучшие практики

---

## 1. Что такое событийная архитектура

### Проблема связанного кода

Представь, что при регистрации пользователя нужно:
- Отправить welcome email
- Создать профиль
- Начислить бонусы
- Уведомить администратора
- Записать в аналитику

**Плохой подход** (всё в контроллере):

```php
class RegisterController extends Controller
{
    public function register(Request $request)
    {
        $user = User::create($request->validated());
        
        // Отправка email
        Mail::to($user)->send(new WelcomeEmail($user));
        
        // Создание профиля
        Profile::create(['user_id' => $user->id]);
        
        // Начисление бонусов
        Bonus::create([
            'user_id' => $user->id,
            'amount' => 100
        ]);
        
        // Уведомление админа
        $admin = User::where('role', 'admin')->first();
        Notification::send($admin, new NewUserNotification($user));
        
        // Аналитика
        Analytics::track('user_registered', $user->id);
        
        return redirect('/dashboard');
    }
}
```

**Проблемы:**
- Контроллер перегружен логикой
- Сложно тестировать
- Нельзя переиспользовать логику
- Трудно добавлять новые действия
- Всё выполняется синхронно (медленно)

### Событийная архитектура — решение

**Events** (События) — это сигналы о том, что что-то произошло в системе.

**Listeners** (Слушатели) — обработчики, которые реагируют на события.

```php
// Контроллер — только создание пользователя
$user = User::create($request->validated());

// Генерируем событие
event(new UserRegistered($user));

// Всё остальное произойдёт автоматически!
```

**Преимущества:**
- ✅ Разделение ответственности
- ✅ Легко добавлять новые действия
- ✅ Можно выполнять асинхронно
- ✅ Легче тестировать
- ✅ Переиспользование логики

---

## 2. Events и Listeners в Laravel

### Создание Event

```bash
php artisan make:event UserRegistered
```

```php
// app/Events/UserRegistered.php
namespace App\Events;

use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserRegistered
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public User $user
    ) {}
}
```

**Трейты:**
- `Dispatchable` — позволяет вызывать `event(new UserRegistered($user))`
- `SerializesModels` — сериализует модели для очередей

### Создание Listener

```bash
php artisan make:listener SendWelcomeEmail --event=UserRegistered
```

```php
// app/Listeners/SendWelcomeEmail.php
namespace App\Listeners;

use App\Events\UserRegistered;
use App\Mail\WelcomeEmail;
use Illuminate\Support\Facades\Mail;

class SendWelcomeEmail
{
    public function handle(UserRegistered $event): void
    {
        Mail::to($event->user)->send(
            new WelcomeEmail($event->user)
        );
    }
}
```

### Регистрация в EventServiceProvider

```php
// app/Providers/EventServiceProvider.php
namespace App\Providers;

use App\Events\UserRegistered;
use App\Listeners\SendWelcomeEmail;
use App\Listeners\CreateUserProfile;
use App\Listeners\GiveBonusPoints;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        UserRegistered::class => [
            SendWelcomeEmail::class,
            CreateUserProfile::class,
            GiveBonusPoints::class,
        ],
    ];
}
```

**Одно событие → много слушателей!**

### Запуск события

```php
// Вариант 1: Функция-хелпер
event(new UserRegistered($user));

// Вариант 2: Фасад
Event::dispatch(new UserRegistered($user));

// Вариант 3: Метод события
UserRegistered::dispatch($user);
```

---

## 3. Асинхронная обработка событий

### Listener в очереди

```php
namespace App\Listeners;

use Illuminate\Contracts\Queue\ShouldQueue;

class SendWelcomeEmail implements ShouldQueue
{
    public $queue = 'emails'; // Имя очереди
    public $delay = 10; // Задержка в секундах
    public $tries = 3; // Количество попыток
    
    public function handle(UserRegistered $event): void
    {
        Mail::to($event->user)->send(
            new WelcomeEmail($event->user)
        );
    }
    
    // Что делать при ошибке
    public function failed(UserRegistered $event, \Throwable $exception): void
    {
        Log::error("Failed to send welcome email: {$exception->getMessage()}");
    }
}
```

**Важно:** Event должен быть сериализуемым!

### Условная обработка

```php
class SendWelcomeEmail implements ShouldQueue
{
    public function handle(UserRegistered $event): void
    {
        Mail::to($event->user)->send(
            new WelcomeEmail($event->user)
        );
    }
    
    // Выполнить только если условие истинно
    public function shouldQueue(UserRegistered $event): bool
    {
        return $event->user->email_verified_at !== null;
    }
}
```

---

## 4. Model Observers — события моделей

### Проблема

У Eloquent есть встроенные события:
- `creating`, `created`
- `updating`, `updated`
- `saving`, `saved`
- `deleting`, `deleted`
- `restoring`, `restored`

Можно слушать их так:

```php
// В EventServiceProvider
protected $listen = [
    'eloquent.created: App\Models\User' => [
        SendWelcomeEmail::class,
    ],
];
```

Но это **неудобно** для моделей. Для них есть **Observers**.

### Создание Observer

```bash
php artisan make:observer UserObserver --model=User
```

```php
// app/Observers/UserObserver.php
namespace App\Observers;

use App\Models\User;
use Illuminate\Support\Str;

class UserObserver
{
    // Перед созданием
    public function creating(User $user): void
    {
        if (empty($user->uuid)) {
            $user->uuid = Str::uuid();
        }
    }
    
    // После создания
    public function created(User $user): void
    {
        // Создаём профиль
        $user->profile()->create([
            'bio' => 'Новый пользователь'
        ]);
        
        // Начисляем бонусы
        $user->bonuses()->create([
            'amount' => 100,
            'description' => 'Приветственный бонус'
        ]);
    }
    
    // Перед обновлением
    public function updating(User $user): void
    {
        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }
    }
    
    // После обновления
    public function updated(User $user): void
    {
        if ($user->wasChanged('email')) {
            Mail::to($user)->send(new EmailChangedNotification());
        }
    }
    
    // Перед удалением
    public function deleting(User $user): void
    {
        // Удаляем связанные данные
        $user->posts()->delete();
        $user->comments()->delete();
    }
    
    // После удаления
    public function deleted(User $user): void
    {
        Log::info("User {$user->id} deleted");
    }
}
```

### Регистрация Observer

```php
// app/Providers/EventServiceProvider.php
namespace App\Providers;

use App\Models\User;
use App\Observers\UserObserver;

class EventServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        User::observe(UserObserver::class);
    }
}
```

### Полезные методы в Observer

```php
public function updating(User $user): void
{
    // Проверка изменения атрибута
    if ($user->isDirty('email')) {
        // Email изменился
    }
    
    // Получить старое значение
    $oldEmail = $user->getOriginal('email');
    
    // Получить новое значение
    $newEmail = $user->email;
}

public function updated(User $user): void
{
    // Был ли атрибут изменён?
    if ($user->wasChanged('email')) {
        // Email точно изменился
    }
    
    // Какие атрибуты изменились?
    $changed = $user->getChanges(); // ['email' => 'new@example.com']
}
```

---

## 5. Event Subscribers — группировка слушателей

### Когда использовать

Если у вас много событий и слушателей связанных с одной сущностью, удобнее группировать их в **Subscriber**.

### Создание Subscriber

```php
// app/Listeners/UserEventSubscriber.php
namespace App\Listeners;

use App\Events\UserRegistered;
use App\Events\UserLoggedIn;
use App\Events\UserUpdatedProfile;
use Illuminate\Events\Dispatcher;
use Illuminate\Support\Facades\Log;

class UserEventSubscriber
{
    public function handleUserRegistration(UserRegistered $event): void
    {
        Log::info("User registered: {$event->user->email}");
        
        // Логика обработки
    }
    
    public function handleUserLogin(UserLoggedIn $event): void
    {
        $event->user->update([
            'last_login_at' => now()
        ]);
    }
    
    public function handleProfileUpdate(UserUpdatedProfile $event): void
    {
        // Очистка кеша
        cache()->forget("user.{$event->user->id}.profile");
    }
    
    // Регистрация слушателей
    public function subscribe(Dispatcher $events): array
    {
        return [
            UserRegistered::class => 'handleUserRegistration',
            UserLoggedIn::class => 'handleUserLogin',
            UserUpdatedProfile::class => 'handleProfileUpdate',
        ];
    }
}
```

### Регистрация Subscriber

```php
// app/Providers/EventServiceProvider.php
protected $subscribe = [
    UserEventSubscriber::class,
];
```

---

## 6. Практические примеры

### Пример 1: Система уведомлений

```php
// Event
namespace App\Events;

class OrderCreated
{
    public function __construct(
        public Order $order
    ) {}
}

// Listeners
class SendOrderConfirmationEmail
{
    public function handle(OrderCreated $event): void
    {
        Mail::to($event->order->user)
            ->send(new OrderConfirmation($event->order));
    }
}

class NotifyAdminAboutOrder
{
    public function handle(OrderCreated $event): void
    {
        $admins = User::where('role', 'admin')->get();
        
        Notification::send($admins, new NewOrderNotification($event->order));
    }
}

class UpdateInventory
{
    public function handle(OrderCreated $event): void
    {
        foreach ($event->order->items as $item) {
            $item->product->decrement('stock', $item->quantity);
        }
    }
}

// Регистрация
protected $listen = [
    OrderCreated::class => [
        SendOrderConfirmationEmail::class,
        NotifyAdminAboutOrder::class,
        UpdateInventory::class,
    ],
];

// Использование
public function store(Request $request)
{
    $order = Order::create([
        'user_id' => auth()->id(),
        'total' => $request->total,
    ]);
    
    event(new OrderCreated($order));
    
    return redirect()->route('orders.show', $order);
}
```

### Пример 2: Аудит действий пользователя

```php
// Observer
class PostObserver
{
    public function created(Post $post): void
    {
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'created',
            'model_type' => Post::class,
            'model_id' => $post->id,
            'description' => "Created post: {$post->title}",
        ]);
    }
    
    public function updated(Post $post): void
    {
        $changes = $post->getChanges();
        
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'updated',
            'model_type' => Post::class,
            'model_id' => $post->id,
            'description' => "Updated post: " . implode(', ', array_keys($changes)),
            'metadata' => json_encode($changes),
        ]);
    }
    
    public function deleted(Post $post): void
    {
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'deleted',
            'model_type' => Post::class,
            'model_id' => $post->id,
            'description' => "Deleted post: {$post->title}",
        ]);
    }
}
```

### Пример 3: Кеширование

```php
class ProductObserver
{
    public function created(Product $product): void
    {
        // Очистка кеша категории
        cache()->forget("category.{$product->category_id}.products");
        cache()->forget('products.latest');
    }
    
    public function updated(Product $product): void
    {
        // Очистка кеша продукта
        cache()->forget("product.{$product->id}");
        
        // Если категория изменилась
        if ($product->wasChanged('category_id')) {
            cache()->forget("category.{$product->getOriginal('category_id')}.products");
            cache()->forget("category.{$product->category_id}.products");
        }
    }
    
    public function deleted(Product $product): void
    {
        cache()->forget("product.{$product->id}");
        cache()->forget("category.{$product->category_id}.products");
    }
}
```

---

## 7. Broadcast Events — real-time уведомления

### Событие для broadcast

```php
namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use InteractsWithSockets, SerializesModels;
    
    public function __construct(
        public Message $message
    ) {}
    
    // На какой канал отправлять
    public function broadcastOn(): Channel
    {
        return new Channel('chat.' . $this->message->chat_id);
    }
    
    // Что отправлять
    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'text' => $this->message->text,
            'user' => $this->message->user->only(['id', 'name']),
            'created_at' => $this->message->created_at->toISOString(),
        ];
    }
    
    // Название события на frontend
    public function broadcastAs(): string
    {
        return 'message.sent';
    }
}
```

Frontend получит это событие через WebSocket!

---

## 8. Лучшие практики

### ✅ DO (Делай так)

```php
// ✅ Называй события в прошедшем времени
class UserRegistered {}
class OrderCreated {}
class PaymentProcessed {}

// ✅ Событие содержит только данные
class OrderCreated
{
    public function __construct(
        public Order $order
    ) {}
}

// ✅ Слушатели делают одно действие
class SendOrderConfirmationEmail
{
    public function handle(OrderCreated $event): void
    {
        Mail::to($event->order->user)
            ->send(new OrderConfirmation($event->order));
    }
}

// ✅ Используй очереди для медленных операций
class SendWelcomeEmail implements ShouldQueue
{
    // ...
}

// ✅ Обрабатывай ошибки
class SendWelcomeEmail implements ShouldQueue
{
    public function failed(UserRegistered $event, \Throwable $exception): void
    {
        Log::error('Failed to send welcome email', [
            'user_id' => $event->user->id,
            'error' => $exception->getMessage()
        ]);
    }
}
```

### ❌ DON'T (Не делай так)

```php
// ❌ Не называй события как действия
class SendEmail {} // Плохо
class EmailSent {} // Хорошо

// ❌ Не помещай логику в события
class UserRegistered
{
    public function sendEmail()
    {
        // Это должно быть в Listener!
    }
}

// ❌ Не делай слушатель, который делает всё
class HandleEverythingAboutUser
{
    public function handle(UserRegistered $event): void
    {
        $this->sendEmail($event->user);
        $this->createProfile($event->user);
        $this->giveBonus($event->user);
        // Слишком много ответственности!
    }
}

// ❌ Не забывай про очереди для медленных операций
class SendWelcomeEmail // Нет ShouldQueue
{
    public function handle(UserRegistered $event): void
    {
        // Отправка email — медленная операция!
        // Это замедлит регистрацию пользователя
        Mail::to($event->user)->send(new WelcomeEmail($event->user));
    }
}
```

---

## 9. Debugging событий

### Логирование всех событий

```php
// app/Providers/EventServiceProvider.php
public function boot(): void
{
    Event::listen('*', function ($eventName, array $data) {
        if (!str_starts_with($eventName, 'Illuminate')) {
            Log::debug("Event fired: {$eventName}", $data);
        }
    });
}
```

### Временное отключение событий

```php
// Отключить все события
Event::fake();

// Отключить конкретные события
Event::fake([
    UserRegistered::class,
    OrderCreated::class,
]);

// Создать пользователя (события не сработают)
$user = User::create([...]);

// Проверить, что событие было бы вызвано
Event::assertDispatched(UserRegistered::class);
```

### Отключение для модели

```php
// Временно без событий
User::withoutEvents(function () {
    User::create([...]); // Observers не сработают
});

// Или
$user = User::create([...]);
$user->saveQuietly(); // Без события 'updated'
```

---

## 10. Упражнения

### Задание 1: Базовая система уведомлений

Создай систему, где при создании поста:
1. Отправляется email автору с подтверждением
2. Уведомляются все подписчики автора
3. Пост добавляется в кеш "latest posts"

```php
// Создай:
// - Event: PostPublished
// - Listener: SendPublishedNotification
// - Listener: NotifyFollowers
// - Listener: UpdateLatestPostsCache
```

### Задание 2: Аудит изменений

Создай Observer для модели Product, который логирует:
- Все изменения цены
- Создание нового продукта
- Удаление продукта

Лог должен содержать: кто изменил, когда, что изменилось.

### Задание 3: Система лояльности

При создании заказа:
1. Начисли пользователю баллы (10% от суммы)
2. Если заказ > 1000₽, отправь "спасибо" email
3. Если это первый заказ, дай бонус 100₽
4. Обнови статистику (количество заказов пользователя)

Реализуй через Events и Listeners.

### Задание 4: Event Subscriber

Создай UserEventSubscriber, который обрабатывает:
- `UserRegistered` → создаёт welcome запись в activity log
- `UserLoggedIn` → обновляет last_login_at
- `UserDeleted` → удаляет все связанные данные

---

## 11. Тестирование событий

### Тест события

```php
use Illuminate\Support\Facades\Event;

public function test_user_registration_dispatches_event()
{
    Event::fake();
    
    $user = User::factory()->create();
    
    Event::assertDispatched(UserRegistered::class, function ($event) use ($user) {
        return $event->user->id === $user->id;
    });
}
```

### Тест слушателя

```php
use Illuminate\Support\Facades\Mail;

public function test_welcome_email_sent_on_registration()
{
    Mail::fake();
    
    $user = User::factory()->create();
    
    $listener = new SendWelcomeEmail();
    $listener->handle(new UserRegistered($user));
    
    Mail::assertSent(WelcomeEmail::class, function ($mail) use ($user) {
        return $mail->hasTo($user->email);
    });
}
```

---

## 12. Шпаргалка

```bash
# Создание
php artisan make:event UserRegistered
php artisan make:listener SendWelcomeEmail --event=UserRegistered
php artisan make:observer UserObserver --model=User

# Запуск события
event(new UserRegistered($user));
UserRegistered::dispatch($user);
Event::dispatch(new UserRegistered($user));

# Очереди
class SendEmail implements ShouldQueue { }

# Отключение событий
Event::fake();
User::withoutEvents(fn() => User::create([...]));
$user->saveQuietly();

# Debugging
Event::listen('*', fn($event, $data) => Log::debug($event));
```

---

## 🎯 Чеклист главы

- [ ] Понимаю разницу между Events и Listeners
- [ ] Умею создавать и регистрировать события
- [ ] Знаю когда использовать Observers
- [ ] Понимаю как работают Subscribers
- [ ] Умею делать асинхронную обработку
- [ ] Знаю best practices событийной архитектуры
- [ ] Умею тестировать события

---

**Следующая глава:** `Глава 10.5: Task Scheduling — cron через Laravel, автоматизация задач`

Событийная архитектура — мощный инструмент для создания гибких и расширяемых приложений. Она позволяет отделить бизнес-логику от побочных эффектов и легко добавлять новую функциональность без изменения существующего кода! 🚀