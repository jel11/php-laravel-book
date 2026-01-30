# Глава 13.2: Laravel Broadcasting — events, channels, presence channels

## 📡 О чем эта глава

В прошлой главе мы разобрались, как работают WebSockets на низком уровне. Теперь посмотрим, как Laravel превращает всю эту сложность в элегантный и простой код. Broadcasting — это система Laravel для отправки событий (events) из серверного PHP-кода в браузеры пользователей в реальном времени.

**Что вы узнаете:**
- Как работает Broadcasting в Laravel
- Создание и отправка событий
- Типы каналов: public, private, presence
- Авторизация подписки на каналы
- Интеграция с frontend (Reverb/Pusher)
- Практические примеры: уведомления, чат, онлайн-статус

---

## 🎯 Как работает Broadcasting

### Концептуальная схема

```
┌─────────────────┐
│  Laravel App    │
│                 │
│  User sent      │
│  message        │
│     ↓           │
│  Event fired    │
│     ↓           │
│  Broadcasting   │
│  Driver         │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Reverb/Pusher  │  ← WebSocket сервер
│                 │
└────────┬────────┘
         │
         ↓ (push)
┌─────────────────────────────┐
│  Connected Clients          │
│  ┌──────┐ ┌──────┐ ┌──────┐│
│  │User 1│ │User 2│ │User 3││
│  └──────┘ └──────┘ └──────┘│
└─────────────────────────────┘
```

**Процесс:**
1. В Laravel происходит событие (новое сообщение, лайк, заказ)
2. Вы отправляете (broadcast) событие
3. Broadcasting driver отправляет данные на WebSocket сервер
4. WebSocket сервер пушит данные всем подписанным клиентам
5. JavaScript в браузере получает событие и обновляет UI

---

## 🔧 Настройка Broadcasting

### 1. Установка зависимостей

```bash
# Установка Reverb (встроенный WS сервер Laravel)
composer require laravel/reverb

# Публикация конфига
php artisan reverb:install

# ИЛИ если используете Pusher
composer require pusher/pusher-php-server
```

### 2. Конфигурация `.env`

**Для Reverb (рекомендуется):**
```env
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=my-app
REVERB_APP_KEY=my-app-key
REVERB_APP_SECRET=my-app-secret
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http
```

**Для Pusher:**
```env
BROADCAST_CONNECTION=pusher

PUSHER_APP_ID=your-app-id
PUSHER_APP_KEY=your-key
PUSHER_APP_SECRET=your-secret
PUSHER_APP_CLUSTER=eu
```

### 3. Включение Broadcasting в `config/broadcasting.php`

Файл уже создан, убедитесь что driver настроен:

```php
'default' => env('BROADCAST_CONNECTION', 'reverb'),

'connections' => [
    'reverb' => [
        'driver' => 'reverb',
        'key' => env('REVERB_APP_KEY'),
        'secret' => env('REVERB_APP_SECRET'),
        'app_id' => env('REVERB_APP_ID'),
        'options' => [
            'host' => env('REVERB_HOST'),
            'port' => env('REVERB_PORT', 8080),
            'scheme' => env('REVERB_SCHEME', 'http'),
        ],
    ],
    
    'pusher' => [
        'driver' => 'pusher',
        'key' => env('PUSHER_APP_KEY'),
        'secret' => env('PUSHER_APP_SECRET'),
        'app_id' => env('PUSHER_APP_ID'),
        'options' => [
            'cluster' => env('PUSHER_APP_CLUSTER'),
            'host' => env('PUSHER_HOST'),
            'port' => env('PUSHER_PORT'),
            'scheme' => env('PUSHER_SCHEME'),
            'encrypted' => true,
        ],
    ],
],
```

### 4. Раскомментировать в `config/app.php`

```php
'providers' => [
    // ...
    App\Providers\BroadcastServiceProvider::class, // ← это!
],
```

### 5. Определение routes в `routes/channels.php`

Этот файл отвечает за авторизацию подписки на каналы:

```php
<?php

use Illuminate\Support\Facades\Broadcast;

// Важно: эти роуты доступны только авторизованным пользователям
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});
```

---

## 📢 Создание Events (событий)

### Базовая структура

```bash
php artisan make:event MessageSent
```

Создается файл `app/Events/MessageSent.php`:

```php
<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast // ← Важно!
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Message $message
    ) {}

    // На какой канал отправлять
    public function broadcastOn(): Channel
    {
        return new PrivateChannel('chat.' . $this->message->chat_id);
    }

    // Какие данные отправлять (опционально)
    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'text' => $this->message->text,
            'user' => [
                'id' => $this->message->user->id,
                'name' => $this->message->user->name,
            ],
            'created_at' => $this->message->created_at->toISOString(),
        ];
    }

    // Имя события на клиенте (опционально)
    public function broadcastAs(): string
    {
        return 'message.sent'; // без этого будет MessageSent
    }
}
```

### Отправка события

```php
use App\Events\MessageSent;

class MessageController extends Controller
{
    public function store(Request $request)
    {
        $message = Message::create([
            'chat_id' => $request->chat_id,
            'user_id' => auth()->id(),
            'text' => $request->text,
        ]);

        // Отправить событие
        broadcast(new MessageSent($message));
        // ИЛИ
        // event(new MessageSent($message));
        // ИЛИ
        // MessageSent::dispatch($message);

        return response()->json($message);
    }
}
```

---

## 📻 Типы каналов

### 1. Public Channel (публичный)

**Доступен всем, авторизация не нужна.**

```php
public function broadcastOn(): Channel
{
    return new Channel('notifications'); // без Private/Presence
}
```

**Использование:** общие уведомления, новости, публичные обновления.

**Пример: счетчик онлайн пользователей**

```php
// Event
class OnlineUsersUpdated implements ShouldBroadcast
{
    public function __construct(public int $count) {}

    public function broadcastOn(): Channel
    {
        return new Channel('online-users');
    }
}

// Отправка
broadcast(new OnlineUsersUpdated(User::where('online', true)->count()));
```

### 2. Private Channel (приватный)

**Требует авторизации. Пользователь должен подтвердить право подписки.**

```php
public function broadcastOn(): Channel
{
    return new PrivateChannel('chat.' . $this->chatId);
}
```

**Авторизация в `routes/channels.php`:**

```php
Broadcast::channel('chat.{chatId}', function ($user, $chatId) {
    // Вернуть true если пользователь имеет доступ
    return $user->chats()->where('id', $chatId)->exists();
});
```

**Использование:** личные чаты, приватные уведомления, данные конкретного пользователя.

**Пример: уведомления пользователя**

```php
// Event
class NotificationSent implements ShouldBroadcast
{
    public function __construct(
        public User $user,
        public string $message
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('user.' . $this->user->id);
    }
}

// Авторизация
Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

// Отправка
broadcast(new NotificationSent(auth()->user(), 'Новый лайк!'));
```

### 3. Presence Channel (канал присутствия)

**Как Private, но дополнительно показывает список подписанных пользователей.**

```php
public function broadcastOn(): Channel
{
    return new PresenceChannel('chat.' . $this->chatId);
}
```

**Авторизация (возвращает данные о пользователе):**

```php
Broadcast::channel('chat.{chatId}', function ($user, $chatId) {
    if ($user->chats()->where('id', $chatId)->exists()) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar' => $user->avatar_url,
        ];
    }
});
```

**Использование:** чаты, коллаборативные документы, онлайн-игры.

**На клиенте можно получить список:**

```javascript
Echo.join('chat.1')
    .here((users) => {
        console.log('Сейчас в чате:', users); // [{id: 1, name: 'John'}, ...]
    })
    .joining((user) => {
        console.log('Присоединился:', user.name);
    })
    .leaving((user) => {
        console.log('Покинул:', user.name);
    });
```

---

## 🔐 Авторизация каналов

### Синтаксис

```php
Broadcast::channel('channel-pattern', function ($user, ...$params) {
    // Вернуть true/false (private) или массив данных (presence)
});
```

### Параметры из имени канала

```php
// Канал: orders.{orderId}
Broadcast::channel('orders.{orderId}', function ($user, $orderId) {
    return Order::where('id', $orderId)
        ->where('user_id', $user->id)
        ->exists();
});

// Канал: team.{teamId}.project.{projectId}
Broadcast::channel('team.{teamId}.project.{projectId}', 
    function ($user, $teamId, $projectId) {
        return $user->teams()
            ->where('team_id', $teamId)
            ->whereHas('projects', fn($q) => $q->where('id', $projectId))
            ->exists();
    }
);
```

### Использование моделей (route model binding)

```php
Broadcast::channel('order.{order}', function (User $user, Order $order) {
    return $user->id === $order->user_id;
});
```

Laravel автоматически найдет модель по ID из имени канала!

### Комплексные проверки

```php
Broadcast::channel('admin-panel', function ($user) {
    return $user->is_admin; // только админы
});

Broadcast::channel('premium-content', function ($user) {
    return $user->subscription?->isActive(); // только подписчики
});

Broadcast::channel('document.{document}', function ($user, Document $document) {
    // Владелец или есть в списке редакторов
    return $user->id === $document->owner_id 
        || $document->editors()->where('user_id', $user->id)->exists();
});
```

---

## 🎭 Практические примеры

### Пример 1: Система уведомлений

**Event:**

```php
namespace App\Events;

class UserNotification implements ShouldBroadcast
{
    public function __construct(
        public User $user,
        public string $title,
        public string $message,
        public ?string $actionUrl = null
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('user.' . $this->user->id);
    }

    public function broadcastWith(): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'action_url' => $this->actionUrl,
            'timestamp' => now()->toISOString(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'notification';
    }
}
```

**Отправка:**

```php
// Когда кто-то лайкнул пост
$post = Post::find($postId);
broadcast(new UserNotification(
    user: $post->author,
    title: 'Новый лайк!',
    message: auth()->user()->name . ' лайкнул ваш пост',
    actionUrl: route('posts.show', $post)
));
```

**Frontend (resources/js/echo.js):**

```javascript
Echo.private(`user.${userId}`)
    .listen('.notification', (e) => {
        // Показать toast
        showToast(e.title, e.message, e.action_url);
    });
```

### Пример 2: Чат с индикатором "печатает..."

**Event для сообщения:**

```php
class MessageSent implements ShouldBroadcast
{
    public function __construct(public Message $message) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('chat.' . $this->message->chat_id);
    }

    public function broadcastWith(): array
    {
        return [
            'message' => [
                'id' => $this->message->id,
                'text' => $this->message->text,
                'user_id' => $this->message->user_id,
                'user_name' => $this->message->user->name,
                'created_at' => $this->message->created_at->toISOString(),
            ]
        ];
    }
}
```

**Event для "печатает":**

```php
class UserTyping implements ShouldBroadcast
{
    // ShouldBroadcastNow - отправить немедленно, не через очередь
    // (печатает - это быстрое событие)
    
    public function __construct(
        public int $chatId,
        public User $user
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('chat.' . $this->chatId);
    }

    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->user->id,
            'user_name' => $this->user->name,
        ];
    }
}
```

**Controller:**

```php
class ChatController extends Controller
{
    public function typing(Request $request, Chat $chat)
    {
        broadcast(new UserTyping($chat->id, auth()->user()));
        
        return response()->json(['status' => 'ok']);
    }

    public function sendMessage(Request $request, Chat $chat)
    {
        $message = Message::create([
            'chat_id' => $chat->id,
            'user_id' => auth()->id(),
            'text' => $request->text,
        ]);

        broadcast(new MessageSent($message));

        return response()->json($message);
    }
}
```

**Frontend:**

```javascript
const chatId = 1;
let typingTimeout;

// Слушаем сообщения
Echo.private(`chat.${chatId}`)
    .listen('MessageSent', (e) => {
        appendMessage(e.message);
    })
    .listen('UserTyping', (e) => {
        if (e.user_id !== currentUserId) {
            showTypingIndicator(e.user_name);
            
            // Убрать индикатор через 3 секунды
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                hideTypingIndicator();
            }, 3000);
        }
    });

// Отправить "печатает" при вводе
document.getElementById('message-input').addEventListener('input', () => {
    axios.post(`/chat/${chatId}/typing`);
});
```

### Пример 3: Presence Channel - онлайн-статус

**Event:**

```php
class UserStatusChanged implements ShouldBroadcast
{
    public function __construct(
        public User $user,
        public string $status // 'online', 'away', 'offline'
    ) {}

    public function broadcastOn(): Channel
    {
        // Публичный канал - все могут видеть кто онлайн
        return new Channel('users-status');
    }

    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->user->id,
            'status' => $this->status,
        ];
    }
}
```

**Presence Channel для чата:**

```php
// Event не нужен - Presence Channel автоматически 
// отправляет события joining/leaving

// routes/channels.php
Broadcast::channel('chat.{chatId}', function ($user, $chatId) {
    if ($user->chats()->where('id', $chatId)->exists()) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar' => $user->avatar_url,
            'status' => $user->status,
        ];
    }
});
```

**Frontend:**

```javascript
Echo.join('chat.1')
    .here((users) => {
        // Пользователи уже в чате
        users.forEach(user => {
            markUserOnline(user.id, user);
        });
    })
    .joining((user) => {
        // Новый пользователь присоединился
        markUserOnline(user.id, user);
        showNotification(`${user.name} присоединился к чату`);
    })
    .leaving((user) => {
        // Пользователь ушел
        markUserOffline(user.id);
        showNotification(`${user.name} покинул чат`);
    })
    .listen('MessageSent', (e) => {
        appendMessage(e.message);
    });
```

### Пример 4: Уведомления для конкретных ролей

**Event:**

```php
class AdminAlert implements ShouldBroadcast
{
    public function __construct(
        public string $message,
        public string $level = 'info' // info, warning, error
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('admin-alerts');
    }
}
```

**Авторизация:**

```php
Broadcast::channel('admin-alerts', function ($user) {
    return $user->hasRole('admin') || $user->hasRole('moderator');
});
```

**Отправка:**

```php
// При регистрации нового пользователя
broadcast(new AdminAlert(
    message: "Новый пользователь: " . $user->email,
    level: 'info'
));

// При ошибке оплаты
broadcast(new AdminAlert(
    message: "Ошибка оплаты заказа #{$order->id}",
    level: 'error'
));
```

---

## 🚀 Оптимизация и лучшие практики

### 1. Использование очередей (queues)

По умолчанию события отправляются синхронно. Для production используйте очереди:

```php
class MessageSent implements ShouldBroadcast
{
    use InteractsWithSockets, SerializesModels;

    // Отправлять через очередь
    public $connection = 'redis';
    public $queue = 'broadcasts';
}
```

Или используйте `ShouldBroadcastNow` для немедленной отправки критичных событий:

```php
class UserTyping implements ShouldBroadcastNow // не в очередь
{
    // ...
}
```

### 2. Условная отправка

Не отправлять событие, если никто не слушает:

```php
public function broadcastWhen(): bool
{
    // Отправить только если пользователь онлайн
    return $this->user->isOnline();
}
```

### 3. Отправка только определенным пользователям

```php
broadcast(new MessageSent($message))->toOthers();
// Не отправлять событие отправителю (он и так знает о сообщении)
```

В контроллере:

```php
public function store(Request $request)
{
    $message = Message::create([...]);

    broadcast(new MessageSent($message))->toOthers();
    
    return response()->json($message);
}
```

### 4. Шифрование приватных данных

Не передавайте чувствительные данные в событиях:

```php
// ❌ Плохо
public function broadcastWith(): array
{
    return [
        'user' => $this->user, // может содержать email, phone
    ];
}

// ✅ Хорошо
public function broadcastWith(): array
{
    return [
        'user' => [
            'id' => $this->user->id,
            'name' => $this->user->name,
            'avatar' => $this->user->avatar_url,
        ]
    ];
}
```

### 5. Проверка авторизации на сервере

Даже если клиент подписан на канал, всегда проверяйте права:

```php
// routes/channels.php
Broadcast::channel('chat.{chatId}', function ($user, $chatId) {
    // Недостаточно просто вернуть true
    $chat = Chat::find($chatId);
    
    if (!$chat) {
        return false;
    }

    // Проверить членство в чате
    return $chat->members()->where('user_id', $user->id)->exists();
});
```

### 6. Rate Limiting для клиентских событий

Если разрешаете клиентам отправлять события (whisper):

```php
// routes/channels.php
Broadcast::channel('chat.{chatId}', function ($user, $chatId) {
    if ($user->chats()->where('id', $chatId)->exists()) {
        return ['id' => $user->id, 'name' => $user->name];
    }
})->middleware(['throttle:60,1']); // 60 запросов в минуту
```

---

## 🧪 Тестирование Broadcasting

### Fake Broadcasting

```php
use Illuminate\Support\Facades\Broadcast;

class MessageTest extends TestCase
{
    public function test_message_is_broadcasted()
    {
        Broadcast::fake();

        $message = Message::factory()->create();
        broadcast(new MessageSent($message));

        // Проверить что событие было отправлено
        Broadcast::assertBroadcasted(MessageSent::class);
        
        // Проверить данные
        Broadcast::assertBroadcasted(
            MessageSent::class,
            function ($event) use ($message) {
                return $event->message->id === $message->id;
            }
        );
    }

    public function test_message_broadcasts_to_correct_channel()
    {
        Broadcast::fake();

        $message = Message::factory()->create(['chat_id' => 5]);
        broadcast(new MessageSent($message));

        Broadcast::assertBroadcasted(MessageSent::class, function ($event) {
            return $event->broadcastOn()->name === 'private-chat.5';
        });
    }
}
```

### Тестирование авторизации каналов

```php
public function test_user_can_subscribe_to_own_channel()
{
    $user = User::factory()->create();

    $this->actingAs($user);

    $response = $this->postJson('/broadcasting/auth', [
        'channel_name' => 'private-user.' . $user->id,
    ]);

    $response->assertOk();
}

public function test_user_cannot_subscribe_to_other_user_channel()
{
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    $this->actingAs($user);

    $response = $this->postJson('/broadcasting/auth', [
        'channel_name' => 'private-user.' . $otherUser->id,
    ]);

    $response->assertForbidden();
}
```

---

## ⚠️ Частые ошибки

### ❌ Ошибка 1: Событие не отправляется

```php
// Забыли implements ShouldBroadcast
class MessageSent // ← нет интерфейса!
{
    // ...
}
```

**Решение:** добавить `implements ShouldBroadcast`

### ❌ Ошибка 2: Клиент не получает события

**Причины:**
1. Забыли запустить Reverb: `php artisan reverb:start`
2. Неправильные credentials в `.env`
3. Клиент подписан на неправильное имя канала
4. Авторизация канала возвращает `false`

**Отладка:**

```javascript
// Включить отладку в Echo
window.Echo = new Echo({
    broadcaster: 'reverb',
    // ...
    enabledTransports: ['ws', 'wss'],
    debug: true, // ← логи в консоль
});
```

### ❌ Ошибка 3: Событие получает отправитель

```php
// Отправитель тоже получит событие
broadcast(new MessageSent($message));

// Решение:
broadcast(new MessageSent($message))->toOthers();
```

### ❌ Ошибка 4: Циклическая сериализация

```php
// У Message есть связь ->chat
// У Chat есть связь ->messages
// При сериализации получаем бесконечный цикл
public function broadcastWith(): array
{
    return [
        'message' => $this->message, // ← тут chat -> messages -> chat -> ...
    ];
}

// Решение: указать конкретные поля
public function broadcastWith(): array
{
    return [
        'id' => $this->message->id,
        'text' => $this->message->text,
        'chat_id' => $this->message->chat_id,
        // ...
    ];
}
```

### ❌ Ошибка 5: Отправка больших объемов данных

```php
// Плохо - отправляем весь список пользователей
public function broadcastWith(): array
{
    return [
        'users' => User::all(), // 10000 пользователей!
    ];
}

// Хорошо - минимум данных
public function broadcastWith(): array
{
    return [
        'users_count' => User::count(),
    ];
}
```

---

## 📋 Чеклист: Broadcasting готов к production

- [ ] Reverb/Pusher настроен и работает
- [ ] Все события имеют `implements ShouldBroadcast`
- [ ] Приватные каналы имеют авторизацию в `routes/channels.php`
- [ ] Авторизация проверяет реальные права, а не просто `return true`
- [ ] События отправляются через очередь (кроме критичных)
- [ ] Используется `->toOthers()` где нужно
- [ ] Не передаются чувствительные данные в `broadcastWith()`
- [ ] Тесты покрывают отправку событий
- [ ] Тесты покрывают авторизацию каналов
- [ ] Frontend корректно обрабатывает события
- [ ] Настроен мониторинг работы WebSocket сервера
- [ ] Reverb запускается через supervisor или systemd

---

## 🎯 Практическое задание

### Задание 1: Система лайков с уведомлениями ⭐

Создайте функционал лайков постов с real-time уведомлениями.

**Требования:**
1. Таблица `likes` (user_id, post_id)
2. Событие `PostLiked` отправляется автору поста
3. Автор видит уведомление "X лайкнул ваш пост"
4. Счетчик лайков обновляется в реальном времени у всех

**Подсказка:**

```php
// Event
class PostLiked implements ShouldBroadcast
{
    public function __construct(
        public Post $post,
        public User $liker
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->post->user_id), // автору
            new Channel('post.' . $this->post->id), // всем на странице поста
        ];
    }
}
```

### Задание 2: Групповой чат ⭐⭐

Создайте групповой чат с presence channel.

**Требования:**
1. Таблицы: `chats`, `chat_members`, `messages`
2. Presence Channel показывает кто сейчас в чате
3. Индикатор "печатает..." (не сохраняется в БД)
4. История сообщений загружается при входе

**Структура:**

```php
// routes/channels.php
Broadcast::channel('chat.{chatId}', function ($user, $chatId) {
    if (ChatMember::where('chat_id', $chatId)->where('user_id', $user->id)->exists()) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar' => $user->avatar_url,
        ];
    }
});

// Events
class MessageSent implements ShouldBroadcast { /* ... */ }
class UserTyping implements ShouldBroadcastNow { /* ... */ }
```

### Задание 3: Админ-панель с уведомлениями ⭐⭐⭐

Создайте систему real-time уведомлений для админов.

**Требования:**
1. Приватный канал `admin-notifications`
2. События: новая регистрация, новый заказ, жалоба
3. Разные приоритеты: info, warning, critical
4. Уведомления хранятся в БД (таблица `notifications`)
5. Админ может пометить как прочитанное

**Дополнительно:**
- Звук для critical уведомлений
- Красная точка на иконке (непрочитанные)
- Список всех уведомлений с фильтрацией

---

## 🔍 Самопроверка

**Ответьте на вопросы:**

1. В чем разница между `Channel`, `PrivateChannel` и `PresenceChannel`?
2. Что делает `implements ShouldBroadcast`?
3. Зачем нужен `routes/channels.php`?
4. Когда использовать `ShouldBroadcastNow` вместо `ShouldBroadcast`?
5. Что делает метод `toOthers()`?
6. Как получить список пользователей в Presence Channel?
7. Можно ли отправить одно событие на несколько каналов?
8. Как передать параметры в авторизацию канала?
9. Зачем нужен метод `broadcastWith()`?
10. Как протестировать что событие было отправлено?

<details>
<summary>Ответы</summary>

1. **Channel** — публичный (без авторизации), **PrivateChannel** — требует авторизации, **PresenceChannel** — как Private + показывает список подписчиков

2. Интерфейс говорит Laravel что событие нужно отправить через Broadcasting

3. Файл определяет правила авторизации для приватных и presence каналов

4. Для событий которые должны отправиться немедленно (печатает, онлайн-статус), без очереди

5. Отправляет событие всем кроме текущего пользователя (чтобы не получить свое же сообщение)

6. В JavaScript: `Echo.join('channel').here(users => { ... })`

7. Да, `broadcastOn()` может вернуть массив каналов

8. Через фигурные скобки в имени: `'chat.{chatId}'` → `function($user, $chatId)`

9. Метод определяет какие именно данные отправятся клиенту (по умолчанию все публичные свойства)

10. `Broadcast::fake()` и `Broadcast::assertBroadcasted(EventClass::class)`

</details>

---

## 📚 Что дальше?

В следующей главе **"Глава 13.3: Laravel Reverb / Pusher — настройка real-time сервера"** мы:

- Подробно настроим Laravel Reverb (встроенный WS сервер)
- Альтернатива: настройка Pusher
- Деплой WebSocket сервера на production
- Мониторинг и отладка
- Масштабирование (Redis adapter, кластеры)

Broadcasting — это мощный инструмент, который превращает ваше приложение из обычного сайта в живую, интерактивную платформу. Начните с простых уведомлений, потом добавьте чат, и вы увидите как это меняет пользовательский опыт! 🚀