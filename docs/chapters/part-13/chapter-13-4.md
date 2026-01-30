# Глава 13.4: Чат на практике — отправка сообщений, "печатает...", онлайн-статус

## 🎯 Что мы построим

В этой главе мы создадим полноценный мессенджер с:
- Отправкой и получением сообщений в реальном времени
- Индикатором "печатает..."
- Онлайн-статусом пользователей
- Непрочитанными сообщениями
- Историей переписки

Это кульминация всего, что мы изучили до этого момента.

---

## 📊 Структура базы данных

Создадим миграции для нашего чата:

```bash
php artisan make:migration create_conversations_table
php artisan make:migration create_messages_table
php artisan make:migration add_last_seen_to_users_table
```

### Таблица бесед (conversations)

```php
// database/migrations/xxxx_create_conversations_table.php
public function up()
{
    Schema::create('conversations', function (Blueprint $table) {
        $table->id();
        $table->string('type')->default('private'); // private, group
        $table->string('name')->nullable(); // для групповых чатов
        $table->timestamps();
    });

    // Участники беседы
    Schema::create('conversation_user', function (Blueprint $table) {
        $table->foreignId('conversation_id')->constrained()->onDelete('cascade');
        $table->foreignId('user_id')->constrained()->onDelete('cascade');
        $table->timestamp('last_read_at')->nullable();
        $table->primary(['conversation_id', 'user_id']);
    });
}
```

### Таблица сообщений

```php
// database/migrations/xxxx_create_messages_table.php
public function up()
{
    Schema::create('messages', function (Blueprint $table) {
        $table->id();
        $table->foreignId('conversation_id')->constrained()->onDelete('cascade');
        $table->foreignId('user_id')->constrained()->onDelete('cascade');
        $table->text('body');
        $table->string('type')->default('text'); // text, image, file
        $table->timestamp('read_at')->nullable();
        $table->timestamps();
        
        $table->index(['conversation_id', 'created_at']);
    });
}
```

### Онлайн-статус пользователя

```php
// database/migrations/xxxx_add_last_seen_to_users_table.php
public function up()
{
    Schema::table('users', function (Blueprint $table) {
        $table->timestamp('last_seen_at')->nullable();
        $table->boolean('is_online')->default(false);
    });
}
```

---

## 🏗️ Модели и отношения

### User Model

```php
// app/Models/User.php
class User extends Authenticatable
{
    protected $fillable = [
        'name', 'email', 'password', 'is_online', 'last_seen_at'
    ];

    protected $casts = [
        'last_seen_at' => 'datetime',
        'is_online' => 'boolean',
    ];

    // Беседы пользователя
    public function conversations()
    {
        return $this->belongsToMany(Conversation::class)
            ->withPivot('last_read_at')
            ->withTimestamps();
    }

    // Отправленные сообщения
    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    // Проверка онлайн-статуса
    public function isOnline(): bool
    {
        return $this->is_online && 
               $this->last_seen_at?->gt(now()->subMinutes(5));
    }

    // Обновление активности
    public function updateActivity()
    {
        $this->update([
            'is_online' => true,
            'last_seen_at' => now(),
        ]);
    }
}
```

### Conversation Model

```php
// app/Models/Conversation.php
class Conversation extends Model
{
    protected $fillable = ['type', 'name'];

    public function users()
    {
        return $this->belongsToMany(User::class)
            ->withPivot('last_read_at')
            ->withTimestamps();
    }

    public function messages()
    {
        return $this->hasMany(Message::class)->latest();
    }

    public function latestMessage()
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }

    // Получить собеседника (для приватных чатов)
    public function getRecipient(User $user)
    {
        return $this->users()
            ->where('users.id', '!=', $user->id)
            ->first();
    }

    // Непрочитанные сообщения
    public function unreadMessagesCount(User $user): int
    {
        $lastRead = $this->users()
            ->where('users.id', $user->id)
            ->first()
            ?->pivot
            ?->last_read_at;

        return $this->messages()
            ->where('user_id', '!=', $user->id)
            ->when($lastRead, fn($q) => $q->where('created_at', '>', $lastRead))
            ->count();
    }

    // Отметить как прочитанное
    public function markAsRead(User $user)
    {
        $this->users()->updateExistingPivot($user->id, [
            'last_read_at' => now(),
        ]);
    }
}
```

### Message Model

```php
// app/Models/Message.php
class Message extends Model
{
    protected $fillable = [
        'conversation_id',
        'user_id',
        'body',
        'type',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function markAsRead()
    {
        if (!$this->read_at) {
            $this->update(['read_at' => now()]);
        }
    }
}
```

---

## 🎪 Events для Broadcasting

### MessageSent Event

```php
// app/Events/MessageSent.php
namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message)
    {
    }

    public function broadcastOn(): array
    {
        return [
            new PresenceChannel('conversation.' . $this->message->conversation_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'message' => [
                'id' => $this->message->id,
                'body' => $this->message->body,
                'type' => $this->message->type,
                'created_at' => $this->message->created_at->toISOString(),
                'user' => [
                    'id' => $this->message->user->id,
                    'name' => $this->message->user->name,
                ],
            ],
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }
}
```

### UserTyping Event

```php
// app/Events/UserTyping.php
class UserTyping implements ShouldBroadcast
{
    use InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $conversationId,
        public int $userId,
        public string $userName,
        public bool $isTyping
    ) {
    }

    public function broadcastOn(): array
    {
        return [
            new PresenceChannel('conversation.' . $this->conversationId),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->userId,
            'user_name' => $this->userName,
            'is_typing' => $this->isTyping,
        ];
    }

    public function broadcastAs(): string
    {
        return 'user.typing';
    }
}
```

### UserOnlineStatus Event

```php
// app/Events/UserOnlineStatus.php
class UserOnlineStatus implements ShouldBroadcast
{
    use InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $userId,
        public bool $isOnline,
        public ?string $lastSeenAt = null
    ) {
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('online-status'),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->userId,
            'is_online' => $this->isOnline,
            'last_seen_at' => $this->lastSeenAt,
        ];
    }

    public function broadcastAs(): string
    {
        return 'user.online.status';
    }
}
```

---

## 🎮 Контроллеры

### ConversationController

```php
// app/Http/Controllers/ConversationController.php
namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    // Список всех бесед
    public function index()
    {
        $conversations = auth()->user()
            ->conversations()
            ->with(['latestMessage.user', 'users'])
            ->get()
            ->map(function ($conversation) {
                $recipient = $conversation->getRecipient(auth()->user());
                
                return [
                    'id' => $conversation->id,
                    'name' => $conversation->name ?? $recipient->name,
                    'recipient' => $recipient ? [
                        'id' => $recipient->id,
                        'name' => $recipient->name,
                        'is_online' => $recipient->isOnline(),
                        'last_seen_at' => $recipient->last_seen_at,
                    ] : null,
                    'latest_message' => $conversation->latestMessage ? [
                        'body' => $conversation->latestMessage->body,
                        'created_at' => $conversation->latestMessage->created_at,
                        'is_mine' => $conversation->latestMessage->user_id === auth()->id(),
                    ] : null,
                    'unread_count' => $conversation->unreadMessagesCount(auth()->user()),
                ];
            });

        return response()->json($conversations);
    }

    // Создать или найти беседу
    public function store(Request $request)
    {
        $request->validate([
            'recipient_id' => 'required|exists:users,id',
        ]);

        // Проверяем, нет ли уже беседы между этими пользователями
        $conversation = Conversation::whereHas('users', function ($query) {
            $query->where('user_id', auth()->id());
        })
        ->whereHas('users', function ($query) use ($request) {
            $query->where('user_id', $request->recipient_id);
        })
        ->where('type', 'private')
        ->first();

        if (!$conversation) {
            $conversation = Conversation::create(['type' => 'private']);
            $conversation->users()->attach([auth()->id(), $request->recipient_id]);
        }

        return response()->json([
            'id' => $conversation->id,
        ]);
    }

    // Показать конкретную беседу
    public function show(Conversation $conversation)
    {
        $this->authorize('view', $conversation);

        $messages = $conversation->messages()
            ->with('user:id,name')
            ->latest()
            ->take(50)
            ->get()
            ->reverse()
            ->values();

        $recipient = $conversation->getRecipient(auth()->user());

        // Отмечаем сообщения как прочитанные
        $conversation->markAsRead(auth()->user());

        return response()->json([
            'id' => $conversation->id,
            'recipient' => [
                'id' => $recipient->id,
                'name' => $recipient->name,
                'is_online' => $recipient->isOnline(),
                'last_seen_at' => $recipient->last_seen_at,
            ],
            'messages' => $messages,
        ]);
    }
}
```

### MessageController

```php
// app/Http/Controllers/MessageController.php
namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function store(Request $request, Conversation $conversation)
    {
        $this->authorize('sendMessage', $conversation);

        $request->validate([
            'body' => 'required|string|max:5000',
        ]);

        $message = $conversation->messages()->create([
            'user_id' => auth()->id(),
            'body' => $request->body,
            'type' => 'text',
        ]);

        $message->load('user:id,name');

        // Отправляем событие
        broadcast(new MessageSent($message))->toOthers();

        return response()->json([
            'message' => [
                'id' => $message->id,
                'body' => $message->body,
                'created_at' => $message->created_at,
                'user' => [
                    'id' => $message->user->id,
                    'name' => $message->user->name,
                ],
            ],
        ]);
    }
}
```

### TypingController

```php
// app/Http/Controllers/TypingController.php
namespace App\Http\Controllers;

use App\Events\UserTyping;
use App\Models\Conversation;
use Illuminate\Http\Request;

class TypingController extends Controller
{
    public function __invoke(Request $request, Conversation $conversation)
    {
        $this->authorize('view', $conversation);

        $request->validate([
            'is_typing' => 'required|boolean',
        ]);

        broadcast(new UserTyping(
            conversationId: $conversation->id,
            userId: auth()->id(),
            userName: auth()->user()->name,
            isTyping: $request->is_typing
        ))->toOthers();

        return response()->json(['status' => 'ok']);
    }
}
```

---

## 🔐 Policies

```php
// app/Policies/ConversationPolicy.php
namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

class ConversationPolicy
{
    public function view(User $user, Conversation $conversation): bool
    {
        return $conversation->users->contains($user);
    }

    public function sendMessage(User $user, Conversation $conversation): bool
    {
        return $conversation->users->contains($user);
    }
}
```

Зарегистрируем в `AuthServiceProvider`:

```php
protected $policies = [
    Conversation::class => ConversationPolicy::class,
];
```

---

## 🛣️ Routes

```php
// routes/channels.php
use App\Models\Conversation;

Broadcast::channel('conversation.{conversationId}', function ($user, $conversationId) {
    $conversation = Conversation::find($conversationId);
    
    if ($conversation && $conversation->users->contains($user)) {
        return [
            'id' => $user->id,
            'name' => $user->name,
        ];
    }
    
    return false;
});

Broadcast::channel('online-status', function ($user) {
    return [
        'id' => $user->id,
        'name' => $user->name,
    ];
});
```

```php
// routes/web.php
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\TypingController;

Route::middleware('auth')->group(function () {
    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::post('/conversations', [ConversationController::class, 'store']);
    Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);
    
    Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store']);
    Route::post('/conversations/{conversation}/typing', TypingController::class);
});
```

---

## 🎨 Frontend - Vue Component

```vue
<!-- resources/js/components/Chat.vue -->
<template>
  <div class="chat-container">
    <!-- Список бесед -->
    <div class="conversations-list">
      <div v-for="conv in conversations" 
           :key="conv.id"
           @click="openConversation(conv.id)"
           :class="['conversation-item', { active: currentConversation?.id === conv.id }]">
        
        <div class="conversation-avatar">
          <div class="avatar-circle" :class="{ online: conv.recipient?.is_online }">
            {{ conv.recipient?.name.charAt(0) }}
          </div>
        </div>

        <div class="conversation-info">
          <div class="conversation-header">
            <span class="conversation-name">{{ conv.name }}</span>
            <span class="conversation-time" v-if="conv.latest_message">
              {{ formatTime(conv.latest_message.created_at) }}
            </span>
          </div>
          
          <div class="conversation-preview">
            <span v-if="conv.latest_message">
              {{ conv.latest_message.is_mine ? 'Вы: ' : '' }}
              {{ conv.latest_message.body }}
            </span>
          </div>
        </div>

        <div v-if="conv.unread_count > 0" class="unread-badge">
          {{ conv.unread_count }}
        </div>
      </div>
    </div>

    <!-- Окно чата -->
    <div class="chat-window" v-if="currentConversation">
      <!-- Заголовок -->
      <div class="chat-header">
        <div class="recipient-info">
          <h3>{{ currentConversation.recipient.name }}</h3>
          <span class="status" v-if="currentConversation.recipient.is_online">
            онлайн
          </span>
          <span class="status" v-else>
            {{ formatLastSeen(currentConversation.recipient.last_seen_at) }}
          </span>
        </div>
      </div>

      <!-- Сообщения -->
      <div class="messages-container" ref="messagesContainer">
        <div v-for="message in messages" 
             :key="message.id"
             :class="['message', { mine: message.user.id === currentUserId }]">
          
          <div class="message-content">
            <div class="message-author" v-if="message.user.id !== currentUserId">
              {{ message.user.name }}
            </div>
            <div class="message-body">{{ message.body }}</div>
            <div class="message-time">{{ formatTime(message.created_at) }}</div>
          </div>
        </div>

        <!-- Индикатор "печатает..." -->
        <div v-if="typingUsers.length > 0" class="typing-indicator">
          <span>{{ typingText }}</span>
          <span class="dots">
            <span>.</span><span>.</span><span>.</span>
          </span>
        </div>
      </div>

      <!-- Форма отправки -->
      <div class="message-input">
        <textarea 
          v-model="newMessage"
          @keydown.enter.prevent="sendMessage"
          @input="handleTyping"
          placeholder="Введите сообщение..."
          rows="1"
        ></textarea>
        <button @click="sendMessage" :disabled="!newMessage.trim()">
          Отправить
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      conversations: [],
      currentConversation: null,
      messages: [],
      newMessage: '',
      typingUsers: [],
      typingTimeout: null,
      currentUserId: window.authUserId, // Передаём из Blade
    };
  },

  computed: {
    typingText() {
      if (this.typingUsers.length === 1) {
        return `${this.typingUsers[0]} печатает`;
      }
      return 'Несколько человек печатают';
    },
  },

  mounted() {
    this.loadConversations();
    this.subscribeToOnlineStatus();
    this.updateUserActivity();
    
    // Обновляем активность каждую минуту
    setInterval(() => this.updateUserActivity(), 60000);
  },

  methods: {
    async loadConversations() {
      const response = await axios.get('/conversations');
      this.conversations = response.data;
    },

    async openConversation(conversationId) {
      const response = await axios.get(`/conversations/${conversationId}`);
      this.currentConversation = response.data;
      this.messages = response.data.messages;
      
      this.$nextTick(() => {
        this.scrollToBottom();
        this.subscribeToConversation(conversationId);
      });
    },

    subscribeToConversation(conversationId) {
      // Отписываемся от предыдущего канала
      if (this.conversationChannel) {
        window.Echo.leave(`conversation.${this.conversationChannel}`);
      }

      this.conversationChannel = conversationId;

      // Подписываемся на присутствие
      window.Echo.join(`conversation.${conversationId}`)
        .here((users) => {
          console.log('Users in channel:', users);
        })
        .joining((user) => {
          console.log('User joined:', user);
          this.updateRecipientOnlineStatus(user.id, true);
        })
        .leaving((user) => {
          console.log('User left:', user);
          this.updateRecipientOnlineStatus(user.id, false);
        })
        .listen('.message.sent', (e) => {
          this.messages.push(e.message);
          this.$nextTick(() => this.scrollToBottom());
          this.updateConversationPreview(conversationId, e.message);
        })
        .listen('.user.typing', (e) => {
          if (e.user_id !== this.currentUserId) {
            this.handleRemoteTyping(e);
          }
        });
    },

    subscribeToOnlineStatus() {
      window.Echo.channel('online-status')
        .listen('.user.online.status', (e) => {
          this.updateUserOnlineStatus(e.user_id, e.is_online, e.last_seen_at);
        });
    },

    async sendMessage() {
      if (!this.newMessage.trim()) return;

      const message = this.newMessage;
      this.newMessage = '';

      try {
        const response = await axios.post(
          `/conversations/${this.currentConversation.id}/messages`,
          { body: message }
        );

        this.messages.push(response.data.message);
        this.$nextTick(() => this.scrollToBottom());
        this.updateConversationPreview(this.currentConversation.id, response.data.message);
        
        // Останавливаем индикатор печатания
        this.sendTypingEvent(false);
      } catch (error) {
        console.error('Error sending message:', error);
        this.newMessage = message; // Возвращаем текст обратно
      }
    },

    handleTyping() {
      // Отправляем событие "печатает"
      this.sendTypingEvent(true);

      // Сбрасываем таймер
      clearTimeout(this.typingTimeout);
      
      // Через 2 секунды без ввода отправляем "перестал печатать"
      this.typingTimeout = setTimeout(() => {
        this.sendTypingEvent(false);
      }, 2000);
    },

    async sendTypingEvent(isTyping) {
      await axios.post(
        `/conversations/${this.currentConversation.id}/typing`,
        { is_typing: isTyping }
      );
    },

    handleRemoteTyping(event) {
      if (event.is_typing) {
        if (!this.typingUsers.includes(event.user_name)) {
          this.typingUsers.push(event.user_name);
        }
      } else {
        this.typingUsers = this.typingUsers.filter(name => name !== event.user_name);
      }
    },

    updateRecipientOnlineStatus(userId, isOnline) {
      if (this.currentConversation?.recipient.id === userId) {
        this.currentConversation.recipient.is_online = isOnline;
        if (!isOnline) {
          this.currentConversation.recipient.last_seen_at = new Date().toISOString();
        }
      }
    },

    updateUserOnlineStatus(userId, isOnline, lastSeenAt) {
      // Обновляем в списке бесед
      this.conversations.forEach(conv => {
        if (conv.recipient?.id === userId) {
          conv.recipient.is_online = isOnline;
          conv.recipient.last_seen_at = lastSeenAt;
        }
      });

      // Обновляем в текущей беседе
      if (this.currentConversation?.recipient.id === userId) {
        this.currentConversation.recipient.is_online = isOnline;
        this.currentConversation.recipient.last_seen_at = lastSeenAt;
      }
    },

    updateConversationPreview(conversationId, message) {
      const conv = this.conversations.find(c => c.id === conversationId);
      if (conv) {
        conv.latest_message = {
          body: message.body,
          created_at: message.created_at,
          is_mine: message.user.id === this.currentUserId,
        };
      }
    },

    async updateUserActivity() {
      await axios.post('/user/activity');
    },

    scrollToBottom() {
      const container = this.$refs.messagesContainer;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },

    formatTime(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;

      if (diff < 60000) return 'только что';
      if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString('ru-RU');
    },

    formatLastSeen(timestamp) {
      if (!timestamp) return 'давно';
      
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;

      if (diff < 60000) return 'только что был(а)';
      if (diff < 3600000) return `был(а) ${Math.floor(diff / 60000)} мин назад`;
      if (diff < 86400000) return `был(а) ${Math.floor(diff / 3600000)} ч назад`;
      return `был(а) ${date.toLocaleDateString('ru-RU')}`;
    },
  },
};
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
}

.conversations-list {
  width: 350px;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 15px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.conversation-item:hover {
  background: #f8f8f8;
}

.conversation-item.active {
  background: #e3f2fd;
}

.conversation-avatar {
  margin-right: 12px;
}

.avatar-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #2196f3;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  position: relative;
}

.avatar-circle.online::after {
  content: '';
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background: #4caf50;
  border: 2px solid white;
  border-radius: 50%;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.conversation-name {
  font-weight: 600;
  font-size: 15px;
}

.conversation-time {
  font-size: 12px;
  color: #666;
}

.conversation-preview {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unread-badge {
  background: #2196f3;
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: bold;
  min-width: 20px;
  text-align: center;
}

.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
}

.recipient-info h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
}

.status {
  font-size: 13px;
  color: #4caf50;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f5f5f5;
}

.message {
  display: flex;
  margin-bottom: 15px;
}

.message.mine {
  justify-content: flex-end;
}

.message-content {
  max-width: 60%;
  background: white;
  border-radius: 12px;
  padding: 10px 15px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.message.mine .message-content {
  background: #2196f3;
  color: white;
}

.message-author {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  font-weight: 600;
}

.message-body {
  word-wrap: break-word;
  margin-bottom: 4px;
}

.message-time {
  font-size: 11px;
  color: #999;
  text-align: right;
}

.message.mine .message-time {
  color: rgba(255,255,255,0.7);
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 13px;
  font-style: italic;
}

.dots span {
  animation: blink 1.4s infinite;
}

.dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%, 60%, 100% { opacity: 1; }
  30% { opacity: 0.3; }
}

.message-input {
  display: flex;
  gap: 10px;
  padding: 15px 20px;
  background: white;
  border-top: 1px solid #e0e0e0;
}

.message-input textarea {
  flex: 1;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  padding: 10px 15px;
  resize: none;
  font-family: inherit;
  font-size: 14px;
}

.message-input button {
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 10px 25px;
  cursor: pointer;
  font-weight: 600;
}

.message-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

---

## 🎯 Middleware для активности

```php
// app/Http/Middleware/UpdateUserActivity.php
namespace App\Http\Middleware;

use App\Events\UserOnlineStatus;
use Closure;
use Illuminate\Http\Request;

class UpdateUserActivity
{
    public function handle(Request $request, Closure $next)
    {
        if (auth()->check()) {
            $user = auth()->user();
            $wasOffline = !$user->isOnline();
            
            $user->updateActivity();

            if ($wasOffline) {
                broadcast(new UserOnlineStatus(
                    userId: $user->id,
                    isOnline: true
                ));
            }
        }

        return $next($request);
    }
}
```

Регистрируем в `Kernel.php`:

```php
protected $middlewareGroups = [
    'web' => [
        // ...
        \App\Http\Middleware\UpdateUserActivity::class,
    ],
];
```

---

## 📋 Дополнительные фичи

### 1. Отслеживание офлайна (Console Command)

```php
// app/Console/Commands/MarkUsersOffline.php
namespace App\Console\Commands;

use App\Events\UserOnlineStatus;
use App\Models\User;
use Illuminate\Console\Command;

class MarkUsersOffline extends Command
{
    protected $signature = 'users:mark-offline';
    protected $description = 'Mark users as offline if they haven\'t been active';

    public function handle()
    {
        $users = User::where('is_online', true)
            ->where('last_seen_at', '<', now()->subMinutes(5))
            ->get();

        foreach ($users as $user) {
            $user->update(['is_online' => false]);
            
            broadcast(new UserOnlineStatus(
                userId: $user->id,
                isOnline: false,
                lastSeenAt: $user->last_seen_at?->toISOString()
            ));
        }

        $this->info("Marked {$users->count()} users as offline");
    }
}
```

Добавляем в schedule:

```php
// app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    $schedule->command('users:mark-offline')->everyMinute();
}
```

### 2. Пагинация сообщений

```php
// В ConversationController
public function messages(Conversation $conversation, Request $request)
{
    $this->authorize('view', $conversation);

    $messages = $conversation->messages()
        ->with('user:id,name')
        ->latest()
        ->cursorPaginate(50);

    return response()->json([
        'data' => $messages->items(),
        'next_cursor' => $messages->nextCursor()?->encode(),
        'has_more' => $messages->hasMorePages(),
    ]);
}
```

### 3. Прочитанные сообщения

```php
// app/Events/MessageRead.php
class MessageRead implements ShouldBroadcast
{
    public function __construct(
        public int $conversationId,
        public int $userId,
        public int $messageId
    ) {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->userId),
        ];
    }
}
```

---

## 🧪 Упражнения

### Базовый уровень

1. **Групповые чаты**
   - Добавьте поддержку групповых бесед с более чем 2 участниками
   - Реализуйте отображение аватаров всех участников
   - Покажите "3 человека печатают..."

2. **Поиск по сообщениям**
   - Добавьте поле поиска в списке бесед
   - Реализуйте фильтрацию по имени собеседника
   - Добавьте поиск внутри сообщений конкретной беседы

3. **Эмодзи**
   - Интегрируйте picker эмодзи
   - Добавьте быстрые реакции на сообщения (👍❤️😂)

### Продвинутый уровень

4. **Отправка файлов**
   - Реализуйте загрузку изображений в чат
   - Добавьте preview перед отправкой
   - Покажите миниатюры в истории сообщений

5. **Голосовые сообщения**
   - Используйте MediaRecorder API
   - Отправляйте аудио на сервер
   - Реализуйте плеер для воспроизведения

6. **Уведомления**
   - Добавьте desktop-уведомления о новых сообщениях
   - Показывайте badge с количеством непрочитанных
   - Воспроизводите звук при получении сообщения

### Экспертный уровень

7. **Оптимизация производительности**
   - Внедрите виртуальный скроллинг для списка сообщений
   - Реализуйте дебаунс для индикатора "печатает"
   - Добавьте кэширование бесед в LocalStorage

8. **End-to-End шифрование**
   - Изучите библиотеку Web Crypto API
   - Реализуйте обмен ключами между пользователями
   - Шифруйте сообщения перед отправкой

9. **Видеозвонки**
   - Интегрируйте WebRTC
   - Добавьте кнопку "Позвонить" в чат
   - Реализуйте индикацию входящего звонка

---

## 🎓 Что мы изучили

✅ Создали полноценный real-time мессенджер  
✅ Реализовали Presence Channels для отслеживания онлайн-статуса  
✅ Добавили индикатор "печатает..." через события  
✅ Построили SPA с Vue.js и Laravel Broadcasting  
✅ Научились работать с непрочитанными сообщениями  
✅ Применили авторизацию через Policies  
✅ Оптимизировали запросы с Eager Loading  

---

## 🚀 Следующие шаги

Теперь у вас есть рабочий мессенджер! Можете:
- Добавить push-уведомления через Service Workers
- Интегрировать видеозвонки с WebRTC
- Создать мобильное приложение на Flutter/React Native
- Добавить бота для автоответов

**Поздравляю! Вы прошли весь путь от основ PHP до создания сложного real-time приложения. Это было непростое путешествие, но вы справились!** 🎉