# Глава 13.3: Laravel Reverb / Pusher — настройка real-time сервера

## 🎯 Что ты узнаешь

После изучения этой главы ты сможешь:
- Настроить Laravel Reverb для WebSocket-соединений
- Интегрировать Pusher для production
- Понимать разницу между самостоятельным хостингом и облачными решениями
- Настроить клиентскую часть для подключения к WebSocket-серверу
- Отлаживать проблемы с real-time соединениями
- Выбрать правильное решение для своего проекта

---

## 📖 Теория: Почему нужен отдельный сервер

### Проблема HTTP

```php
// ❌ Так не работает real-time
Route::get('/messages/new', function() {
    // Пользователь постоянно опрашивает сервер
    // Огромная нагрузка, задержки
    return Message::where('created_at', '>', now()->subSeconds(5))->get();
});

// На клиенте каждые 5 секунд:
// setInterval(() => fetch('/messages/new'), 5000);
```

**Почему это плохо:**
- 🔴 Каждый запрос — это полное HTTP-соединение
- 🔴 99% запросов вернут "нет новых данных"
- 🔴 Задержка до 5 секунд
- 🔴 Огромная нагрузка на сервер

### Решение: WebSocket-сервер

```
┌─────────────┐           ┌──────────────┐
│   Browser   │◄─────────►│   Reverb     │
│             │ WebSocket │  (WS Server) │
└─────────────┘           └──────┬───────┘
                                 │
                          ┌──────▼───────┐
                          │   Laravel    │
                          │     App      │
                          └──────────────┘
```

**Как это работает:**
1. Laravel отправляет событие через Broadcasting
2. WebSocket-сервер получает его
3. Сервер мгновенно пушит всем подключённым клиентам
4. Никаких опросов, постоянное соединение

---

## 🆕 Laravel Reverb (рекомендуется)

### Что это?

**Laravel Reverb** — официальный WebSocket-сервер от создателей Laravel (вышел в 2024).

**Преимущества:**
- ✅ Бесплатный и open-source
- ✅ Нативная интеграция с Laravel
- ✅ Написан на PHP, легко настраивается
- ✅ Можно хостить самостоятельно
- ✅ Высокая производительность

**Недостатки:**
- ⚠️ Нужен отдельный процесс/контейнер
- ⚠️ Требует настройки инфраструктуры

---

## 🚀 Установка Laravel Reverb

### Шаг 1: Установка пакета

```bash
composer require laravel/reverb

# Публикация конфигурации
php artisan reverb:install
```

**Что произойдёт:**
- Установится пакет `laravel/reverb`
- Создастся `config/reverb.php`
- Обновится `.env` с настройками

### Шаг 2: Настройка .env

```env
# Broadcasting driver
BROADCAST_CONNECTION=reverb

# Reverb настройки
REVERB_APP_ID=my-app
REVERB_APP_KEY=local-key-123
REVERB_APP_SECRET=local-secret-456
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http

# Для клиента
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

### Шаг 3: Запуск сервера

```bash
# Development
php artisan reverb:start

# С дебагом
php artisan reverb:start --debug

# Указать хост и порт
php artisan reverb:start --host=0.0.0.0 --port=9000
```

**Вывод в консоль:**
```
  INFO  Reverb server started on http://0.0.0.0:8080

  Press Ctrl+C to stop the server
```

---

## 🎨 Настройка клиентской части

### Установка зависимостей

```bash
npm install --save-dev laravel-echo pusher-js
```

### Конфигурация Echo (resources/js/echo.js)

```javascript
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
});
```

### Импорт в приложении (resources/js/app.js)

```javascript
import './bootstrap';
import './echo'; // ← Добавляем

// Теперь Echo доступен глобально
```

### Проверка подключения

```javascript
// В браузерной консоли
console.log(window.Echo);

// Подписка на тестовый канал
window.Echo.channel('test-channel')
    .listen('TestEvent', (e) => {
        console.log('Событие получено:', e);
    });
```

---

## 🔧 Полная настройка Broadcasting

### config/broadcasting.php

```php
return [
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
                'useTLS' => env('REVERB_SCHEME', 'http') === 'https',
            ],
        ],
        
        // Fallback для тестов
        'log' => [
            'driver' => 'log',
        ],
    ],
];
```

### Включение Broadcasting в app/Providers/BroadcastServiceProvider.php

```php
<?php

namespace App\Providers;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;

class BroadcastServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // ✅ Убедись, что это раскомментировано
        Broadcast::routes();

        require base_path('routes/channels.php');
    }
}
```

### config/app.php

```php
'providers' => [
    // ...
    App\Providers\BroadcastServiceProvider::class, // ✅ Должен быть включён
],
```

---

## 📡 Тестирование WebSocket-соединения

### Создание тестового события

```bash
php artisan make:event TestBroadcast
```

```php
<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TestBroadcast implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $message
    ) {}

    public function broadcastOn(): Channel
    {
        return new Channel('test-channel');
    }
    
    public function broadcastAs(): string
    {
        return 'test.event';
    }
}
```

### Отправка события

```php
// routes/web.php
Route::get('/test-broadcast', function() {
    broadcast(new \App\Events\TestBroadcast('Привет из Laravel!'));
    return 'Событие отправлено';
});
```

### Прослушивание на клиенте

```javascript
// В браузерной консоли
Echo.channel('test-channel')
    .listen('.test.event', (data) => {
        console.log('📨 Получено:', data.message);
    });

// Открываем /test-broadcast
// В консоли должно появиться: "📨 Получено: Привет из Laravel!"
```

---

## 🔐 Приватные каналы с Reverb

### Настройка авторизации (routes/channels.php)

```php
<?php

use Illuminate\Support\Facades\Broadcast;

// Приватный канал пользователя
Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

// Канал чата (только участники)
Broadcast::channel('chat.{chatId}', function ($user, $chatId) {
    return \App\Models\Chat::find($chatId)
        ?->participants()
        ->where('user_id', $user->id)
        ->exists();
});

// Presence канал (кто онлайн)
Broadcast::channel('chat.{chatId}.presence', function ($user, $chatId) {
    if (\App\Models\Chat::find($chatId)
            ?->participants()
            ->where('user_id', $user->id)
            ->exists()
    ) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar' => $user->avatar_url,
        ];
    }
});
```

### Подключение на клиенте

```javascript
// Приватный канал
Echo.private(`user.${userId}`)
    .listen('NotificationSent', (e) => {
        console.log('Уведомление:', e.notification);
    });

// Presence канал
Echo.join(`chat.${chatId}.presence`)
    .here((users) => {
        console.log('Сейчас в чате:', users);
    })
    .joining((user) => {
        console.log('Подключился:', user.name);
    })
    .leaving((user) => {
        console.log('Отключился:', user.name);
    });
```

---

## ☁️ Pusher (облачное решение)

### Что это?

**Pusher** — облачный WebSocket-сервис. Не нужно настраивать свой сервер.

**Преимущества:**
- ✅ Не нужно управлять инфраструктурой
- ✅ Автоматическое масштабирование
- ✅ 99.9% uptime
- ✅ Детальная аналитика

**Недостатки:**
- 💰 Платный (бесплатный тариф до 200 соединений)
- ⚠️ Зависимость от внешнего сервиса
- ⚠️ Данные идут через сторонний сервер

---

## 🔧 Настройка Pusher

### Шаг 1: Регистрация

1. Перейди на https://pusher.com
2. Создай аккаунт
3. Create Channel → выбери регион (EU для России)
4. Скопируй credentials

### Шаг 2: Установка пакета

```bash
composer require pusher/pusher-php-server
```

### Шаг 3: Настройка .env

```env
BROADCAST_CONNECTION=pusher

PUSHER_APP_ID=123456
PUSHER_APP_KEY=your-app-key
PUSHER_APP_SECRET=your-app-secret
PUSHER_APP_CLUSTER=eu

VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
```

### Шаг 4: config/broadcasting.php

```php
'pusher' => [
    'driver' => 'pusher',
    'key' => env('PUSHER_APP_KEY'),
    'secret' => env('PUSHER_APP_SECRET'),
    'app_id' => env('PUSHER_APP_ID'),
    'options' => [
        'cluster' => env('PUSHER_APP_CLUSTER'),
        'host' => env('PUSHER_HOST') ?: 'api-'.env('PUSHER_APP_CLUSTER', 'mt1').'.pusher.com',
        'port' => env('PUSHER_PORT', 443),
        'scheme' => env('PUSHER_SCHEME', 'https'),
        'encrypted' => true,
        'useTLS' => true,
    ],
],
```

### Шаг 5: Клиентская часть

```javascript
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
    forceTLS: true
});
```

---

## 🏗️ Production настройка Reverb

### Supervisor (автоперезапуск)

```ini
# /etc/supervisor/conf.d/reverb.conf
[program:reverb]
command=/usr/bin/php /var/www/html/artisan reverb:start
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/www/html/storage/logs/reverb.log
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start reverb
```

### Nginx проксирование WebSocket

```nginx
# /etc/nginx/sites-available/yoursite

upstream reverb {
    server 127.0.0.1:8080;
}

server {
    listen 443 ssl http2;
    server_name yoursite.com;
    
    # ... SSL настройки ...
    
    # WebSocket proxy
    location /app {
        proxy_pass http://reverb;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Остальное Laravel
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
```

### .env для Production

```env
REVERB_APP_ID=production-app
REVERB_APP_KEY=prod-key-random-string
REVERB_APP_SECRET=prod-secret-random-string
REVERB_HOST=yoursite.com
REVERB_PORT=443
REVERB_SCHEME=https

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

---

## 🐛 Отладка проблем

### Проблема: WebSocket не подключается

**Симптомы:**
```javascript
// В консоли браузера
WebSocket connection failed: Error during WebSocket handshake
```

**Решения:**

1. **Проверь, запущен ли Reverb:**
```bash
php artisan reverb:start --debug
```

2. **Проверь порт:**
```bash
netstat -tuln | grep 8080
# Должен быть LISTEN
```

3. **Проверь CORS (если фронт на другом домене):**
```php
// config/reverb.php
'apps' => [
    [
        // ...
        'allowed_origins' => ['*'], // Или конкретные домены
    ],
],
```

### Проблема: События не доходят

**Проверь очередь:**
```env
# .env
QUEUE_CONNECTION=sync # Для дебага
```

```php
// Событие должно быть ShouldBroadcast
class MessageSent implements ShouldBroadcast
{
    // ...
}
```

**Проверь канал:**
```bash
# В Reverb консоли должно появиться
Broadcasting [App\Events\MessageSent] on channels [private-chat.1]
```

### Проблема: Приватный канал 403

**Проверь middleware:**
```php
// routes/channels.php должен проверяться через web middleware

// app/Http/Kernel.php
protected $middlewareGroups = [
    'web' => [
        \App\Http\Middleware\EncryptCookies::class,
        \Illuminate\Session\Middleware\StartSession::class, // ← Нужен!
        // ...
    ],
];
```

**Проверь CSRF токен:**
```javascript
// bootstrap.js
window.axios.defaults.headers.common['X-CSRF-TOKEN'] = 
    document.querySelector('meta[name="csrf-token"]').getAttribute('content');
```

### Дебаг событий

```bash
# Логирование всех событий
php artisan reverb:start --debug

# Tinker для тестирования
php artisan tinker
>>> broadcast(new App\Events\TestEvent('test'));
```

---

## ⚡ Оптимизация производительности

### 1. Используй очереди для Broadcasting

```php
class MessageSent implements ShouldBroadcastNow // ← Мгновенно
{
    // Для критичных событий
}

class UserRegistered implements ShouldBroadcast // ← Через очередь
{
    // Для некритичных
}
```

### 2. Ограничь количество данных

```php
class MessageSent implements ShouldBroadcast
{
    public function __construct(
        public Message $message
    ) {}
    
    // ❌ Плохо: отправляет всю модель со всеми связями
    
    // ✅ Хорошо: только нужные данные
    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'text' => $this->message->text,
            'user' => [
                'id' => $this->message->user->id,
                'name' => $this->message->user->name,
            ],
        ];
    }
}
```

### 3. Используй Presence каналы разумно

```javascript
// ❌ Плохо: presence на канале с 10000 пользователей
Echo.join('global-chat.presence')

// ✅ Хорошо: presence только для активных чатов
Echo.join(`chat.${smallGroupId}.presence`)
```

---

## 📊 Сравнение решений

| Характеристика | Reverb | Pusher | Ably | Socket.io |
|---|---|---|---|---|
| **Цена** | Бесплатно | От $0 | От $0 | Бесплатно |
| **Хостинг** | Самостоятельно | Облако | Облако | Самостоятельно |
| **Интеграция с Laravel** | Нативная | Отличная | Хорошая | Требует настройки |
| **Масштабируемость** | Хорошая | Отличная | Отличная | Средняя |
| **Настройка** | Средняя | Простая | Простая | Сложная |

**Рекомендации:**

- **Для обучения:** Reverb (просто, бесплатно)
- **Для стартапа:** Pusher (быстрый старт, масштабируется)
- **Для корпорации:** Reverb + собственная инфраструктура
- **Для MVP:** Pusher бесплатный тариф

---

## 💡 Практические сценарии

### Уведомления в реальном времени

```php
// app/Events/NotificationSent.php
class NotificationSent implements ShouldBroadcast
{
    public function __construct(
        public User $user,
        public string $title,
        public string $message
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('user.' . $this->user->id);
    }
}

// Отправка
NotificationSent::dispatch($user, 'Новое сообщение', 'У вас 5 непрочитанных');
```

```javascript
// Клиент
Echo.private(`user.${userId}`)
    .listen('NotificationSent', (e) => {
        new Notification(e.title, {
            body: e.message,
            icon: '/icon.png'
        });
    });
```

### Онлайн-статус пользователей

```javascript
Echo.join('online')
    .here((users) => {
        users.forEach(user => markAsOnline(user.id));
    })
    .joining((user) => {
        markAsOnline(user.id);
    })
    .leaving((user) => {
        markAsOffline(user.id);
    });
```

### Typing indicator

```javascript
let typingTimer;
const typingDelay = 1000;

messageInput.addEventListener('input', () => {
    clearTimeout(typingTimer);
    
    Echo.private(`chat.${chatId}`)
        .whisper('typing', {
            userId: currentUserId,
            name: currentUserName
        });
    
    typingTimer = setTimeout(() => {
        Echo.private(`chat.${chatId}`)
            .whisper('stopped-typing', {
                userId: currentUserId
            });
    }, typingDelay);
});

Echo.private(`chat.${chatId}`)
    .listenForWhisper('typing', (e) => {
        showTypingIndicator(e.name);
    })
    .listenForWhisper('stopped-typing', (e) => {
        hideTypingIndicator(e.userId);
    });
```

---

## ✅ Чеклист настройки

### Для Reverb:

- [ ] `composer require laravel/reverb`
- [ ] `php artisan reverb:install`
- [ ] Настроил `.env` (APP_ID, KEY, SECRET)
- [ ] `npm install laravel-echo pusher-js`
- [ ] Создал `resources/js/echo.js`
- [ ] Импортировал Echo в `app.js`
- [ ] Запустил `php artisan reverb:start`
- [ ] Протестировал подключение в консоли
- [ ] Настроил Supervisor для production
- [ ] Настроил Nginx proxy для WebSocket
- [ ] Настроил SSL для wss://

### Для Pusher:

- [ ] Создал аккаунт на pusher.com
- [ ] `composer require pusher/pusher-php-server`
- [ ] Скопировал credentials в `.env`
- [ ] `npm install laravel-echo pusher-js`
- [ ] Настроил `echo.js` с Pusher
- [ ] Протестировал в Debug Console на pusher.com

---

## 🎯 Практическое задание

### Задача: Система уведомлений в реальном времени

**Требования:**

1. Настрой Laravel Reverb
2. Создай событие `UserMentioned` (когда кого-то упоминают в комментарии)
3. Отправляй уведомление в приватный канал пользователя
4. На фронте покажи всплывающее уведомление
5. Добавь счётчик непрочитанных уведомлений

**Подсказки:**

```php
// Событие
class UserMentioned implements ShouldBroadcast
{
    public function __construct(
        public User $mentionedUser,
        public User $author,
        public string $commentText
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('user.' . $this->mentionedUser->id);
    }

    public function broadcastWith(): array
    {
        return [
            'author' => $this->author->name,
            'text' => Str::limit($this->commentText, 50),
            'url' => route('comments.show', $this->comment),
        ];
    }
}
```

```javascript
// Клиент
let unreadCount = 0;

Echo.private(`user.${userId}`)
    .listen('UserMentioned', (e) => {
        unreadCount++;
        updateBadge(unreadCount);
        
        showNotification({
            title: `${e.author} упомянул вас`,
            body: e.text,
            link: e.url
        });
    });
```

---

## 🔍 Самопроверка

После изучения главы ответь на вопросы:

1. В чём разница между Reverb и Pusher?
2. Что такое Presence каналы и когда их использовать?
3. Как отлаживать проблемы с WebSocket-подключением?
4. Почему нельзя отправлять большие объекты через Broadcasting?
5. Как настроить SSL для WebSocket в production?

**Правильные ответы:**

1. Reverb — самостоятельный хостинг (PHP), Pusher — облачный сервис. Reverb бесплатный, но требует настройки инфраструктуры.
2. Presence каналы показывают, кто онлайн. Использовать для чатов, коллаборативных редакторов, где важно видеть других пользователей.
3. Проверить запущен ли сервер, открыть порт, включить `--debug`, проверить CORS, посмотреть Network tab в DevTools.
4. Каждое сообщение идёт всем подключённым клиентам. Большие объекты создают задержки и нагрузку. Использовать `broadcastWith()`.
5. Настроить Nginx как reverse proxy с параметрами `proxy_set_header Upgrade` и SSL-сертификат. Использовать `wss://` схему.

---

## 🎓 Что дальше?

Ты научился настраивать WebSocket-сервер! Теперь переходи к:

**Глава 13.4: Чат на практике** — соберём всё вместе и создадим полноценный мессенджер с онлайн-статусами, типингом и историей сообщений.

---

## 📚 Дополнительные материалы

- [Laravel Reverb документация](https://laravel.com/docs/reverb)
- [Pusher документация](https://pusher.com/docs)
- [Laravel Broadcasting](https://laravel.com/docs/broadcasting)
- [Laravel Echo документация](https://laravel.com/docs/broadcasting#client-side-installation)
- [WebSocket протокол RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455)

---

**Удачи в настройке real-time! 🚀**