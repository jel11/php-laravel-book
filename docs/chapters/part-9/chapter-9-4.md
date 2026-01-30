# Глава 9.4: Query Scopes и Accessors — переиспользуемые запросы, вычисляемые поля

## 📖 Введение

Представь: ты делаешь мессенджер. В десятке мест нужно выбирать "активных пользователей". Каждый раз писать `where('is_active', true)->where('banned_at', null)` — это:
- **Дублирование кода** (нарушение DRY)
- **Риск ошибок** (забыл одно условие — баг)
- **Боль при изменениях** (решили добавить проверку email — правь 10 мест)

**Query Scopes** решают это — инкапсулируют логику запросов в переиспользуемые методы модели.

А **Accessors** позволяют вычислять поля "на лету" без хранения в БД. Например, `full_name` из `first_name` + `last_name`, или `avatar_url` на основе `avatar_path`.

Сегодня научимся писать чистый, переиспользуемый Eloquent-код.

---

## 🎯 Что изучим

1. **Local Scopes** — методы фильтрации для конкретной модели
2. **Global Scopes** — автоматические фильтры для всех запросов
3. **Accessors** — вычисляемые атрибуты (get)
4. **Mutators** — обработка данных при записи (set)
5. **Attribute Casting** — автоматическое приведение типов
6. **Практика** — строим систему с реальными кейсами

---

## 1️⃣ Local Query Scopes

### Что это?

Методы модели, которые модифицируют Builder и возвращают его обратно. Вызываются как обычные методы цепочки запросов.

### Синтаксис

```php
// app/Models/User.php
namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class User extends Model
{
    // Scope должен начинаться с "scope" + название с большой буквы
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
                    ->whereNull('banned_at');
    }
    
    public function scopeVerified(Builder $query): Builder
    {
        return $query->whereNotNull('email_verified_at');
    }
    
    // Scope с параметрами
    public function scopeOfRole(Builder $query, string $role): Builder
    {
        return $query->where('role', $role);
    }
    
    // Комбинированный scope
    public function scopeAdmins(Builder $query): Builder
    {
        return $query->active()->ofRole('admin');
    }
}
```

### Использование

```php
// Вызываем БЕЗ префикса "scope", с маленькой буквы
$activeUsers = User::active()->get();

$verifiedAdmins = User::verified()->ofRole('admin')->get();

// Можно комбинировать со стандартными методами
$recentActive = User::active()
    ->where('created_at', '>', now()->subMonth())
    ->orderBy('last_login_at', 'desc')
    ->limit(10)
    ->get();

// Scopes возвращают Builder, поэтому работают с пагинацией
$users = User::active()->verified()->paginate(20);
```

### Реальный пример: мессенджер

```php
// app/Models/Message.php
class Message extends Model
{
    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }
    
    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('receiver_id', $userId);
    }
    
    public function scopeInChat(Builder $query, int $chatId): Builder
    {
        return $query->where('chat_id', $chatId);
    }
    
    public function scopeRecent(Builder $query, int $hours = 24): Builder
    {
        return $query->where('created_at', '>', now()->subHours($hours));
    }
    
    public function scopeWithAttachments(Builder $query): Builder
    {
        return $query->has('attachments');
    }
}

// Контроллер
class ChatController extends Controller
{
    public function unreadCount(Request $request)
    {
        $count = Message::unread()
            ->forUser($request->user()->id)
            ->count();
            
        return response()->json(['unread' => $count]);
    }
    
    public function recentWithFiles(int $chatId)
    {
        $messages = Message::inChat($chatId)
            ->withAttachments()
            ->recent(48) // за последние 48 часов
            ->with('attachments')
            ->get();
            
        return view('chat.files', compact('messages'));
    }
}
```

### Почему это лучше?

**❌ Без scopes:**
```php
// Дублируем везде
$unread1 = Message::where('receiver_id', $userId)
    ->whereNull('read_at')
    ->count();

$unread2 = Message::where('receiver_id', $userId)
    ->whereNull('read_at') // легко ошибиться
    ->get();
```

**✅ Со scopes:**
```php
$unread1 = Message::forUser($userId)->unread()->count();
$unread2 = Message::forUser($userId)->unread()->get();
```

---

## 2️⃣ Global Scopes

### Что это?

Автоматически применяются **ко всем запросам модели**. Используются для soft deletes, multi-tenancy, фильтрации по умолчанию.

### Пример: Soft Deletes (встроенный глобальный scope)

```php
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Model
{
    use SoftDeletes; // добавляет global scope
}

// Все запросы автоматически фильтруют удалённые записи
User::all(); // SELECT * FROM users WHERE deleted_at IS NULL

// Можно отключить
User::withTrashed()->get(); // все, включая удалённые
User::onlyTrashed()->get(); // только удалённые
```

### Свой Global Scope

**Кейс:** В мессенджере пользователи могут быть из разных организаций (multi-tenancy). Нужно всегда фильтровать по текущей организации.

```php
// app/Models/Scopes/OrganizationScope.php
namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class OrganizationScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $organizationId = auth()->user()?->organization_id;
        
        if ($organizationId) {
            $builder->where($model->getTable() . '.organization_id', $organizationId);
        }
    }
}

// app/Models/User.php
class User extends Model
{
    protected static function booted(): void
    {
        static::addGlobalScope(new OrganizationScope());
    }
}

// Теперь все запросы автоматически фильтруются
User::all(); // WHERE organization_id = {current_org_id}
User::find(1); // WHERE id = 1 AND organization_id = {current_org_id}

// Можно отключить
User::withoutGlobalScope(OrganizationScope::class)->get();
```

### Анонимный Global Scope

Для простых случаев можно не создавать отдельный класс:

```php
class Message extends Model
{
    protected static function booted(): void
    {
        // Автоматически исключаем спам-сообщения
        static::addGlobalScope('not_spam', function (Builder $builder) {
            $builder->where('is_spam', false);
        });
    }
}

// Отключить конкретный scope по имени
Message::withoutGlobalScope('not_spam')->get();
```

---

## 3️⃣ Accessors (Геттеры)

### Что это?

Вычисляемые атрибуты, которые **не хранятся в БД**, но доступны как обычные свойства модели.

### Современный синтаксис (Laravel 9+)

```php
use Illuminate\Database\Eloquent\Casts\Attribute;

class User extends Model
{
    // Вычисляемое поле "full_name"
    protected function fullName(): Attribute
    {
        return Attribute::make(
            get: fn() => "{$this->first_name} {$this->last_name}"
        );
    }
    
    // Avatar URL из пути
    protected function avatarUrl(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->avatar_path 
                ? asset("storage/{$this->avatar_path}")
                : asset('images/default-avatar.png')
        );
    }
    
    // Форматирование даты
    protected function joinedAt(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->created_at->format('d M Y')
        );
    }
}

// Использование
$user = User::find(1);

echo $user->full_name;  // "John Doe" (вычисляется на лету)
echo $user->avatar_url; // "http://site.com/storage/avatars/john.jpg"
echo $user->joined_at;  // "15 Jan 2025"

// В JSON автоматически НЕ включается (нужно добавить в $appends)
```

### Добавление в JSON

```php
class User extends Model
{
    // Какие accessors включать в toArray() и toJson()
    protected $appends = ['full_name', 'avatar_url'];
    
    protected function fullName(): Attribute
    {
        return Attribute::make(
            get: fn() => "{$this->first_name} {$this->last_name}"
        );
    }
}

// Теперь в API ответах
return response()->json($user);
// {
//   "id": 1,
//   "first_name": "John",
//   "last_name": "Doe",
//   "full_name": "John Doe",  // accessor
//   "avatar_url": "..."       // accessor
// }
```

### Старый синтаксис (до Laravel 9)

```php
class User extends Model
{
    // get{Название}Attribute
    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
    
    public function getAvatarUrlAttribute(): string
    {
        return $this->avatar_path 
            ? asset("storage/{$this->avatar_path}")
            : asset('images/default-avatar.png');
    }
}
```

### Реальный пример: мессенджер

```php
class Message extends Model
{
    protected $appends = ['is_edited', 'time_ago'];
    
    // Проверка, было ли сообщение отредактировано
    protected function isEdited(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->created_at->ne($this->updated_at)
        );
    }
    
    // Человекочитаемое время
    protected function timeAgo(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->created_at->diffForHumans()
        );
    }
    
    // Превью текста (первые 50 символов)
    protected function preview(): Attribute
    {
        return Attribute::make(
            get: fn() => str($this->content)->limit(50)
        );
    }
    
    // Количество реакций
    protected function reactionsCount(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->reactions->count()
        );
    }
}

// Использование
@foreach($messages as $message)
    <div class="message">
        <p>{{ $message->content }}</p>
        <small>
            {{ $message->time_ago }}
            @if($message->is_edited)
                <span class="edited">(edited)</span>
            @endif
        </small>
    </div>
@endforeach
```

---

## 4️⃣ Mutators (Сеттеры)

### Что это?

Обработка данных **перед сохранением в БД**. Например, хеширование паролей, форматирование телефонов, очистка HTML.

### Синтаксис

```php
class User extends Model
{
    // Современный синтаксис с Attribute
    protected function password(): Attribute
    {
        return Attribute::make(
            get: fn($value) => $value, // можно опустить
            set: fn($value) => bcrypt($value)
        );
    }
    
    // Очистка и форматирование телефона
    protected function phone(): Attribute
    {
        return Attribute::make(
            set: fn($value) => preg_replace('/[^0-9]/', '', $value)
        );
    }
    
    // Нормализация email
    protected function email(): Attribute
    {
        return Attribute::make(
            set: fn($value) => strtolower(trim($value))
        );
    }
}

// Использование
$user = new User();
$user->password = 'secret123'; // автоматически хешируется
$user->phone = '+7 (999) 123-45-67'; // сохранится как "79991234567"
$user->email = '  John@EXAMPLE.com  '; // сохранится как "john@example.com"
$user->save();
```

### Комбинированный Accessor + Mutator

```php
class User extends Model
{
    // И get, и set в одном Attribute
    protected function name(): Attribute
    {
        return Attribute::make(
            get: fn($value) => ucfirst($value),        // "john" → "John"
            set: fn($value) => strtolower($value)      // "JOHN" → "john"
        );
    }
}

$user = new User();
$user->name = 'JOHN DOE'; // сохраняется как "john doe"
echo $user->name;         // выводится "John doe" (ucfirst)
```

### Пример: чистка HTML в сообщениях

```php
class Message extends Model
{
    protected function content(): Attribute
    {
        return Attribute::make(
            set: function ($value) {
                // Разрешаем только безопасные теги
                return strip_tags($value, '<b><i><u><a>');
            }
        );
    }
}

// Использование
$message = new Message();
$message->content = '<script>alert("XSS")</script><b>Hello</b>';
$message->save();
// Сохранится: "<b>Hello</b>" (скрипт вырезан)
```

---

## 5️⃣ Attribute Casting

### Что это?

Автоматическое приведение типов при чтении/записи. Laravel делает это за вас без написания accessors/mutators.

### Встроенные касты

```php
class User extends Model
{
    protected $casts = [
        'email_verified_at' => 'datetime',      // Carbon
        'is_active' => 'boolean',               // true/false
        'age' => 'integer',                     // int
        'balance' => 'decimal:2',               // float с 2 знаками
        'settings' => 'array',                  // JSON → array
        'metadata' => 'object',                 // JSON → stdClass
        'tags' => 'collection',                 // JSON → Collection
        'created_at' => 'datetime:Y-m-d',       // кастомный формат
    ];
}

// Пример использования
$user = User::find(1);

// БД: "1" → PHP: true
if ($user->is_active) { 
    // работает как boolean
}

// БД: '{"theme":"dark"}' → PHP: ['theme' => 'dark']
$user->settings['theme'] = 'light';
$user->save(); // автоматически конвертируется обратно в JSON

// БД: "2025-01-29 15:30:00" → PHP: Carbon instance
echo $user->created_at->format('d/m/Y'); // 29/01/2025
echo $user->created_at->addDays(7);      // Carbon методы работают
```

### Кастомные касты

Создаём класс для сложной логики:

```bash
php artisan make:cast Money
```

```php
// app/Casts/Money.php
namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;

class Money implements CastsAttributes
{
    // Из БД → PHP
    public function get($model, $key, $value, $attributes)
    {
        // БД хранит копейки (integer), возвращаем рубли (float)
        return $value / 100;
    }
    
    // Из PHP → БД
    public function set($model, $key, $value, $attributes)
    {
        // Конвертируем рубли в копейки
        return (int) ($value * 100);
    }
}

// В модели
class Order extends Model
{
    protected $casts = [
        'total' => Money::class,
    ];
}

// Использование
$order = new Order();
$order->total = 99.99; // сохраняется как 9999 (копейки)

$order = Order::find(1);
echo $order->total; // 99.99 (автоматически делится на 100)
```

### Encrypted Casting

Хранение зашифрованных данных:

```php
class User extends Model
{
    protected $casts = [
        'ssn' => 'encrypted',          // автошифрование
        'credit_card' => 'encrypted:array', // шифрование JSON
    ];
}

$user = new User();
$user->ssn = '123-45-6789';
$user->save();
// БД: "eyJpdiI6IlR..." (зашифровано)

$user = User::find(1);
echo $user->ssn; // "123-45-6789" (автоматически расшифровано)
```

---

## 6️⃣ Практика: Система сообщений

### Задача

Создать модель `Message` с:
- Scopes для фильтрации
- Accessors для вычисляемых полей
- Mutators для обработки данных
- Кастинг для JSON

### Миграция

```php
Schema::create('messages', function (Blueprint $table) {
    $table->id();
    $table->foreignId('chat_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->text('content');
    $table->json('attachments')->nullable();
    $table->timestamp('read_at')->nullable();
    $table->timestamp('edited_at')->nullable();
    $table->boolean('is_pinned')->default(false);
    $table->timestamps();
    $table->softDeletes();
});
```

### Модель

```php
namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Message extends Model
{
    use SoftDeletes;
    
    protected $fillable = ['chat_id', 'user_id', 'content', 'attachments'];
    
    protected $casts = [
        'attachments' => 'array',
        'read_at' => 'datetime',
        'edited_at' => 'datetime',
        'is_pinned' => 'boolean',
    ];
    
    protected $appends = ['is_edited', 'time_ago', 'has_attachments'];
    
    // ========== SCOPES ==========
    
    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }
    
    public function scopeInChat(Builder $query, int $chatId): Builder
    {
        return $query->where('chat_id', $chatId);
    }
    
    public function scopePinned(Builder $query): Builder
    {
        return $query->where('is_pinned', true);
    }
    
    public function scopeWithFiles(Builder $query): Builder
    {
        return $query->whereNotNull('attachments');
    }
    
    public function scopeRecent(Builder $query, int $hours = 24): Builder
    {
        return $query->where('created_at', '>', now()->subHours($hours));
    }
    
    public function scopeSearch(Builder $query, string $term): Builder
    {
        return $query->where('content', 'like', "%{$term}%");
    }
    
    // ========== ACCESSORS ==========
    
    protected function isEdited(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->edited_at !== null
        );
    }
    
    protected function timeAgo(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->created_at->diffForHumans()
        );
    }
    
    protected function hasAttachments(): Attribute
    {
        return Attribute::make(
            get: fn() => !empty($this->attachments)
        );
    }
    
    protected function preview(): Attribute
    {
        return Attribute::make(
            get: fn() => str($this->content)->limit(100)
        );
    }
    
    // ========== MUTATORS ==========
    
    protected function content(): Attribute
    {
        return Attribute::make(
            // Очищаем HTML при сохранении
            set: fn($value) => strip_tags($value, '<b><i><u><a>')
        );
    }
    
    // ========== RELATIONSHIPS ==========
    
    public function chat()
    {
        return $this->belongsTo(Chat::class);
    }
    
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    // ========== METHODS ==========
    
    public function markAsRead(): void
    {
        $this->update(['read_at' => now()]);
    }
    
    public function markAsEdited(): void
    {
        $this->update(['edited_at' => now()]);
    }
}
```

### Использование в контроллере

```php
class ChatController extends Controller
{
    public function show(Chat $chat)
    {
        // Получаем закреплённые + последние 50 сообщений
        $pinnedMessages = $chat->messages()
            ->pinned()
            ->with('user')
            ->get();
            
        $recentMessages = $chat->messages()
            ->with('user')
            ->latest()
            ->limit(50)
            ->get();
        
        return view('chat.show', [
            'chat' => $chat,
            'pinnedMessages' => $pinnedMessages,
            'recentMessages' => $recentMessages,
        ]);
    }
    
    public function unreadCount(Request $request)
    {
        $count = Message::whereHas('chat.members', function ($query) use ($request) {
                $query->where('user_id', $request->user()->id);
            })
            ->unread()
            ->count();
            
        return response()->json(['unread' => $count]);
    }
    
    public function search(Request $request, Chat $chat)
    {
        $messages = $chat->messages()
            ->search($request->query('q'))
            ->with('user')
            ->paginate(20);
            
        return view('chat.search', compact('messages'));
    }
    
    public function files(Chat $chat)
    {
        $files = $chat->messages()
            ->withFiles()
            ->with('user')
            ->latest()
            ->paginate(30);
            
        return view('chat.files', compact('files'));
    }
    
    public function store(Request $request, Chat $chat)
    {
        $validated = $request->validate([
            'content' => 'required|string|max:5000',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:10240', // 10MB
        ]);
        
        $attachments = [];
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $attachments[] = [
                    'name' => $file->getClientOriginalName(),
                    'path' => $file->store('chat-files', 'public'),
                    'size' => $file->getSize(),
                    'type' => $file->getMimeType(),
                ];
            }
        }
        
        $message = $chat->messages()->create([
            'user_id' => $request->user()->id,
            'content' => $validated['content'], // автоматически очистится mutator'ом
            'attachments' => $attachments,
        ]);
        
        return response()->json($message->load('user'));
    }
    
    public function update(Request $request, Message $message)
    {
        $this->authorize('update', $message);
        
        $validated = $request->validate([
            'content' => 'required|string|max:5000',
        ]);
        
        $message->update([
            'content' => $validated['content'],
        ]);
        
        $message->markAsEdited();
        
        return response()->json($message);
    }
}
```

### Blade шаблон

```blade
{{-- resources/views/chat/show.blade.php --}}

<div class="chat-container">
    {{-- Закреплённые сообщения --}}
    @if($pinnedMessages->isNotEmpty())
        <div class="pinned-messages">
            <h3>📌 Pinned Messages</h3>
            @foreach($pinnedMessages as $message)
                <div class="message pinned">
                    <strong>{{ $message->user->name }}</strong>
                    <p>{{ $message->content }}</p>
                    @if($message->has_attachments)
                        <span class="badge">📎 {{ count($message->attachments) }}</span>
                    @endif
                </div>
            @endforeach
        </div>
    @endif
    
    {{-- Обычные сообщения --}}
    <div class="messages">
        @foreach($recentMessages as $message)
            <div class="message" data-id="{{ $message->id }}">
                <img src="{{ $message->user->avatar_url }}" alt="Avatar">
                <div class="content">
                    <strong>{{ $message->user->full_name }}</strong>
                    <p>{{ $message->content }}</p>
                    
                    @if($message->has_attachments)
                        <div class="attachments">
                            @foreach($message->attachments as $file)
                                <a href="{{ asset('storage/' . $file['path']) }}" download>
                                    📎 {{ $file['name'] }} ({{ number_format($file['size'] / 1024, 2) }} KB)
                                </a>
                            @endforeach
                        </div>
                    @endif
                    
                    <small class="meta">
                        {{ $message->time_ago }}
                        @if($message->is_edited)
                            <span class="edited">(edited)</span>
                        @endif
                    </small>
                </div>
            </div>
        @endforeach
    </div>
</div>
```

---

## 🎓 Ключевые концепции

### Local Scopes
✅ Начинаются с `scope` + название  
✅ Принимают `Builder $query`  
✅ Возвращают `Builder`  
✅ Вызываются без префикса, в camelCase  
✅ Можно комбинировать друг с другом

### Global Scopes
✅ Применяются **автоматически** ко всем запросам  
✅ Создаются через класс `Scope` или замыкание  
✅ Регистрируются в `booted()` методе  
✅ Можно отключить через `withoutGlobalScope()`

### Accessors
✅ Вычисляются "на лету", не хранятся в БД  
✅ Метод возвращает `Attribute::make(get: fn() => ...)`  
✅ Добавляются в JSON через `$appends`  
✅ Используются для производных данных

### Mutators
✅ Обрабатывают данные **перед сохранением**  
✅ `Attribute::make(set: fn($value) => ...)`  
✅ Можно комбинировать с accessor в одном `Attribute`  
✅ Используются для нормализации, хеширования, очистки

### Casting
✅ Автоматическое приведение типов  
✅ Работает в обе стороны (чтение/запись)  
✅ Встроенные: `datetime`, `boolean`, `array`, `encrypted`  
✅ Можно создавать кастомные через `php artisan make:cast`

---

## ⚠️ Частые ошибки

### 1. Забыли `return` в scope
```php
// ❌ НЕПРАВИЛЬНО
public function scopeActive(Builder $query): void
{
    $query->where('is_active', true); // нет return!
}

// ✅ ПРАВИЛЬНО
public function scopeActive(Builder $query): Builder
{
    return $query->where('is_active', true);
}
```

### 2. Обращение к accessor в accessor
```php
// ❌ НЕПРАВИЛЬНО (бесконечная рекурсия)
protected function fullName(): Attribute
{
    return Attribute::make(
        get: fn() => $this->full_name . ' Esq.' // вызовет сам себя!
    );
}

// ✅ ПРАВИЛЬНО
protected function fullName(): Attribute
{
    return Attribute::make(
        get: fn() => "{$this->first_name} {$this->last_name}"
    );
}
```

### 3. Мутация связей в mutator
```php
// ❌ НЕПРАВИЛЬНО
protected function tags(): Attribute
{
    return Attribute::make(
        set: fn($value) => $this->tags()->sync($value) // это связь!
    );
}

// ✅ ПРАВИЛЬНО (используй обычный метод)
public function syncTags(array $tagIds): void
{
    $this->tags()->sync($tagIds);
}
```

### 4. N+1 с accessors
```php
// ❌ МЕДЛЕННО
protected function authorName(): Attribute
{
    return Attribute::make(
        get: fn() => $this->user->name // N+1 если не загружен user!
    );
}

// ✅ БЫСТРО
$messages = Message::with('user')->get();
foreach ($messages as $msg) {
    echo $msg->user->name; // используй связь напрямую
}
```

### 5. Изменение casted поля без ->save()
```php
$user = User::find(1);

// ❌ НЕ СОХРАНИТСЯ
$user->settings['theme'] = 'dark';
// нужен save()!

// ✅ ПРАВИЛЬНО
$user->settings = array_merge($user->settings, ['theme' => 'dark']);
$user->save();

// ИЛИ
$settings = $user->settings;
$settings['theme'] = 'dark';
$user->settings = $settings;
$user->save();
```

---

## 📝 Упражнения

### Упражнение 1: Scopes для блога

Создай модель `Post` с scopes:
- `published()` — где `published_at` не null и <= now()
- `draft()` — где `published_at` === null
- `byAuthor(User $user)` — по автору
- `popular(int $minViews = 1000)` — с минимальным количеством просмотров
- `tagged(string $tag)` — содержит тег в JSON-поле `tags`

```php
// Использование
$posts = Post::published()->popular()->get();
$drafts = Post::draft()->byAuthor($user)->get();
```

### Упражнение 2: Accessors для профиля

Модель `User`:
- `full_name` — из `first_name` + `last_name`
- `age` — вычислить из `birth_date`
- `avatar_url` — если `avatar` null, вернуть дефолт
- `is_online` — если `last_seen_at` < 5 минут назад
- `initials` — первые буквы имени и фамилии (например, "JD")

### Упражнение 3: Mutators для очистки

Модель `Product`:
- `price` — убирать всё кроме цифр и точки
- `slug` — генерировать из `name` (kebab-case)
- `description` — очищать от опасного HTML
- `sku` — приводить к uppercase

### Упражнение 4: Кастомный Cast

Создай `JsonTranslation` cast для мультиязычных полей:

```php
// БД: {"en": "Hello", "ru": "Привет"}
// PHP: автоматически возвращает текст для текущей локали

$product->name; // "Hello" (если locale = en)
app()->setLocale('ru');
$product->name; // "Привет"
```

<details>
<summary>💡 Подсказка</summary>

```php
class JsonTranslation implements CastsAttributes
{
    public function get($model, $key, $value, $attributes)
    {
        $translations = json_decode($value, true);
        return $translations[app()->getLocale()] ?? $translations['en'] ?? '';
    }
    
    public function set($model, $key, $value, $attributes)
    {
        if (is_array($value)) {
            return json_encode($value);
        }
        
        // Если передали строку, сохраняем для текущей локали
        $current = json_decode($attributes[$key] ?? '{}', true);
        $current[app()->getLocale()] = $value;
        return json_encode($current);
    }
}
```
</details>

---

## 🎯 Мини-проект: Система уведомлений

Создай модель `Notification` с:

### Миграция
```php
Schema::create('notifications', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('type'); // message, like, comment, follow
    $table->json('data');
    $table->timestamp('read_at')->nullable();
    $table->timestamps();
});
```

### Требования

**Scopes:**
- `unread()` — непрочитанные
- `ofType(string $type)` — по типу
- `recent(int $days = 7)` — за последние N дней

**Accessors:**
- `is_read` — boolean
- `time_ago` — человекочитаемое время
- `icon` — emoji в зависимости от типа
- `title` — заголовок на основе типа и данных

**Mutators:**
- `type` — приводить к lowercase

**Casts:**
- `data` → `array`
- `read_at` → `datetime`

**Методы:**
- `markAsRead()`
- `getUrl()` — ссылка на объект уведомления

### Пример использования

```php
// Контроллер
class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->paginate(20);
            
        return view('notifications.index', compact('notifications'));
    }
    
    public function unreadCount(Request $request)
    {
        $count = $request->user()
            ->notifications()
            ->unread()
            ->count();
            
        return response()->json(['count' => $count]);
    }
    
    public function markAsRead(Notification $notification)
    {
        $this->authorize('view', $notification);
        
        $notification->markAsRead();
        
        return redirect($notification->getUrl());
    }
}

// Blade
@foreach($notifications as $notification)
    <div class="notification {{ $notification->is_read ? 'read' : 'unread' }}">
        <span class="icon">{{ $notification->icon }}</span>
        <div>
            <strong>{{ $notification->title }}</strong>
            <small>{{ $notification->time_ago }}</small>
        </div>
    </div>
@endforeach
```

<details>
<summary>💡 Решение</summary>

```php
namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = ['user_id', 'type', 'data'];
    
    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
    ];
    
    protected $appends = ['is_read', 'time_ago', 'icon', 'title'];
    
    // ========== SCOPES ==========
    
    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }
    
    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }
    
    public function scopeRecent(Builder $query, int $days = 7): Builder
    {
        return $query->where('created_at', '>', now()->subDays($days));
    }
    
    // ========== ACCESSORS ==========
    
    protected function isRead(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->read_at !== null
        );
    }
    
    protected function timeAgo(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->created_at->diffForHumans()
        );
    }
    
    protected function icon(): Attribute
    {
        return Attribute::make(
            get: fn() => match($this->type) {
                'message' => '💬',
                'like' => '❤️',
                'comment' => '💭',
                'follow' => '👤',
                default => '🔔',
            }
        );
    }
    
    protected function title(): Attribute
    {
        return Attribute::make(
            get: function () {
                return match($this->type) {
                    'message' => "{$this->data['from']} sent you a message",
                    'like' => "{$this->data['user']} liked your {$this->data['type']}",
                    'comment' => "{$this->data['user']} commented on your {$this->data['type']}",
                    'follow' => "{$this->data['user']} started following you",
                    default => 'New notification',
                };
            }
        );
    }
    
    // ========== MUTATORS ==========
    
    protected function type(): Attribute
    {
        return Attribute::make(
            set: fn($value) => strtolower($value)
        );
    }
    
    // ========== RELATIONSHIPS ==========
    
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    // ========== METHODS ==========
    
    public function markAsRead(): void
    {
        if (!$this->is_read) {
            $this->update(['read_at' => now()]);
        }
    }
    
    public function getUrl(): string
    {
        return match($this->type) {
            'message' => route('chats.show', $this->data['chat_id']),
            'like', 'comment' => route('posts.show', $this->data['post_id']),
            'follow' => route('users.show', $this->data['user_id']),
            default => route('notifications.index'),
        };
    }
}
```
</details>

---

## 🔑 Резюме

### Что мы изучили

✅ **Local Scopes** — переиспользуемые фильтры запросов  
✅ **Global Scopes** — автоматические фильтры для всех запросов  
✅ **Accessors** — вычисляемые поля без хранения в БД  
✅ **Mutators** — обработка данных перед сохранением  
✅ **Attribute Casting** — автоматическое приведение типов  
✅ **Комбинирование техник** для чистого кода

### Когда использовать

**Scopes:**
- Повторяющиеся условия `where`
- Сложная фильтрация
- Комбинируемые запросы

**Accessors:**
- Производные данные (full_name из first + last)
- Форматирование для отображения
- Вычисления на основе других полей

**Mutators:**
- Нормализация входных данных
- Хеширование
- Очистка HTML/текста

**Casting:**
- JSON ↔ array/object
- Даты ↔ Carbon
- Шифрование
- Кастомные типы данных

### Следующий шаг

Глава 9.5: **Seeders и Factories** — наполним БД тестовыми данными для разработки.

---

## 💬 Вопросы для самопроверки

1. Чем Local Scope отличается от Global Scope?
2. Можно ли вызывать scope внутри другого scope?
3. Что произойдёт, если accessor обращается к связи без `with()`?
4. В чём разница между accessor и cast?
5. Когда лучше использовать mutator, а когда — cast?
6. Можно ли отключить Global Scope для конкретного запроса?
7. Как добавить accessor в JSON-ответ?
8. Что произойдёт, если забыть `return` в scope?

Готов продолжать? Просто скажи: **"Глава 9.5"** 🚀