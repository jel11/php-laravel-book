# Глава 10.1: Аутентификация — Breeze/Jetstream, guards, policies, gates

## Введение

Аутентификация — это процесс проверки личности пользователя ("Кто ты?"), а авторизация — это проверка прав доступа ("Что тебе можно делать?"). В этой главе мы изучим полную систему аутентификации и авторизации в Laravel, от готовых решений до тонкой настройки прав доступа.

---

## 1. Аутентификация в Laravel: Базовые концепции

### 1.1 Как работает аутентификация

Laravel использует **guards** (защитники) для управления аутентификацией. Guard определяет, как пользователи аутентифицируются для каждого запроса.

**Конфигурация** (`config/auth.php`):

```php
return [
    'defaults' => [
        'guard' => 'web',
        'passwords' => 'users',
    ],

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],

        'api' => [
            'driver' => 'token',
            'provider' => 'users',
        ],
    ],

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => App\Models\User::class,
        ],
    ],
];
```

**Основные компоненты:**

- **Guard** — механизм аутентификации (session, token, sanctum)
- **Provider** — источник пользовательских данных (eloquent, database)
- **Driver** — способ хранения состояния аутентификации

### 1.2 Модель User

Модель User должна реализовывать контракт `Authenticatable`:

```php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed', // Laravel 10+
    ];
}
```

---

## 2. Laravel Breeze — Минимальная аутентификация

### 2.1 Установка Breeze

Laravel Breeze — это простая реализация всех функций аутентификации:

```bash
composer require laravel/breeze --dev

php artisan breeze:install

# Выбор стека:
# - blade (традиционный)
# - react (SPA с React)
# - vue (SPA с Vue)
# - api (только API)

npm install && npm run dev
php artisan migrate
```

### 2.2 Что включает Breeze

**Маршруты** (`routes/auth.php`):

```php
Route::middleware('guest')->group(function () {
    Route::get('register', [RegisteredUserController::class, 'create'])
        ->name('register');
    
    Route::post('register', [RegisteredUserController::class, 'store']);
    
    Route::get('login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');
    
    Route::post('login', [AuthenticatedSessionController::class, 'store']);
    
    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
        ->name('password.request');
});

Route::middleware('auth')->group(function () {
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');
    
    Route::get('verify-email', EmailVerificationPromptController::class)
        ->name('verification.notice');
});
```

### 2.3 Контроллер регистрации

```php
namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class RegisteredUserController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('dashboard'));
    }
}
```

### 2.4 Контроллер логина

```php
namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthenticatedSessionController extends Controller
{
    public function store(LoginRequest $request)
    {
        $request->authenticate();

        $request->session()->regenerate();

        return redirect()->intended(route('dashboard'));
    }

    public function destroy(Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
```

### 2.5 Request для логина

```php
namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        if (! Auth::attempt($this->only('email', 'password'), $this->boolean('remember'))) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'email' => trans('auth.failed'),
            ]);
        }

        RateLimiter::clear($this->throttleKey());
    }

    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    public function throttleKey(): string
    {
        return strtolower($this->input('email')).'|'.$this->ip();
    }
}
```

---

## 3. Laravel Jetstream — Полнофункциональная аутентификация

### 3.1 Установка Jetstream

Jetstream включает двухфакторную аутентификацию, управление командами, API токены:

```bash
composer require laravel/jetstream

# Livewire стек
php artisan jetstream:install livewire

# Inertia стек
php artisan jetstream:install inertia

# С поддержкой команд
php artisan jetstream:install livewire --teams

npm install && npm run dev
php artisan migrate
```

### 3.2 Возможности Jetstream

**Регистрация и логин:**
- Email верификация
- "Запомнить меня"
- Сброс пароля

**Управление профилем:**
- Редактирование информации
- Смена пароля
- Удаление аккаунта

**Безопасность:**
- Двухфакторная аутентификация (2FA)
- История сессий
- API токены (Sanctum)

**Команды (опционально):**
- Создание команд
- Приглашение участников
- Роли в командах

### 3.3 Двухфакторная аутентификация

**Включение 2FA:**

```php
use Laravel\Jetstream\Http\Controllers\TwoFactorAuthenticationController;

Route::post('/user/two-factor-authentication', 
    [TwoFactorAuthenticationController::class, 'store'])
    ->name('two-factor.enable');

Route::delete('/user/two-factor-authentication', 
    [TwoFactorAuthenticationController::class, 'destroy'])
    ->name('two-factor.disable');
```

**Проверка 2FA в контроллере:**

```php
namespace App\Http\Controllers\Auth;

use Illuminate\Http\Request;
use Laravel\Fortify\Actions\ConfirmTwoFactorAuthentication;

class TwoFactorAuthenticationController extends Controller
{
    public function store(Request $request, ConfirmTwoFactorAuthentication $confirm)
    {
        $confirm($request->user(), $request->input('code'));

        return back()->with('status', 'two-factor-authentication-confirmed');
    }
}
```

---

## 4. Guards — Множественная аутентификация

### 4.1 Создание кастомного Guard

Например, для администраторов:

**Миграция:**

```php
Schema::create('admins', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();
    $table->string('password');
    $table->rememberToken();
    $table->timestamps();
});
```

**Модель:**

```php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class Admin extends Authenticatable
{
    protected $fillable = ['name', 'email', 'password'];
    protected $hidden = ['password', 'remember_token'];
    protected $casts = ['password' => 'hashed'];
}
```

**Конфигурация** (`config/auth.php`):

```php
'guards' => [
    'web' => [
        'driver' => 'session',
        'provider' => 'users',
    ],
    
    'admin' => [
        'driver' => 'session',
        'provider' => 'admins',
    ],
],

'providers' => [
    'users' => [
        'driver' => 'eloquent',
        'model' => App\Models\User::class,
    ],
    
    'admins' => [
        'driver' => 'eloquent',
        'model' => App\Models\Admin::class,
    ],
],
```

### 4.2 Использование Guards

**В маршрутах:**

```php
Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('login', [AdminAuthController::class, 'showLoginForm'])
        ->name('login');
    
    Route::post('login', [AdminAuthController::class, 'login']);
    
    Route::middleware('auth:admin')->group(function () {
        Route::get('dashboard', [AdminDashboardController::class, 'index'])
            ->name('dashboard');
        
        Route::post('logout', [AdminAuthController::class, 'logout'])
            ->name('logout');
    });
});
```

**В контроллере:**

```php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (Auth::guard('admin')->attempt($credentials)) {
            $request->session()->regenerate();
            return redirect()->intended(route('admin.dashboard'));
        }

        return back()->withErrors([
            'email' => 'Неверные учетные данные.',
        ])->onlyInput('email');
    }

    public function logout(Request $request)
    {
        Auth::guard('admin')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        
        return redirect()->route('admin.login');
    }
}
```

**Проверка в Blade:**

```php
@auth('admin')
    <p>Вы вошли как администратор</p>
@endauth

@guest('admin')
    <a href="{{ route('admin.login') }}">Войти как админ</a>
@endguest
```

**В коде:**

```php
// Проверка аутентификации
if (Auth::guard('admin')->check()) {
    // Администратор авторизован
}

// Получение пользователя
$admin = Auth::guard('admin')->user();

// Логин программно
Auth::guard('admin')->login($admin);

// ID текущего пользователя
$id = Auth::guard('admin')->id();
```

---

## 5. Gates — Простая авторизация

### 5.1 Определение Gates

Gates — это замыкания, которые определяют, может ли пользователь выполнить действие.

**В** `App\Providers\AuthServiceProvider`:

```php
namespace App\Providers;

use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Простой gate
        Gate::define('update-post', function (User $user, Post $post) {
            return $user->id === $post->user_id;
        });

        // Gate с дополнительными параметрами
        Gate::define('publish-post', function (User $user, Post $post, bool $force = false) {
            if ($force && $user->is_admin) {
                return true;
            }
            
            return $user->id === $post->user_id && $post->status === 'draft';
        });

        // Gate без модели (общая проверка)
        Gate::define('viewAdminPanel', function (User $user) {
            return $user->is_admin;
        });

        // Gate с несколькими пользователями
        Gate::define('viewPost', function (?User $user, Post $post) {
            if ($post->is_public) {
                return true;
            }
            
            return $user && $user->id === $post->user_id;
        });
    }
}
```

### 5.2 Использование Gates

**В контроллере:**

```php
namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class PostController extends Controller
{
    public function update(Request $request, Post $post)
    {
        // Способ 1: Выбросить исключение если нет доступа
        Gate::authorize('update-post', $post);

        // Способ 2: Проверить вручную
        if (Gate::denies('update-post', $post)) {
            abort(403, 'Недостаточно прав');
        }

        // Способ 3: Условное выполнение
        if (Gate::allows('update-post', $post)) {
            $post->update($request->validated());
        }

        // Способ 4: Проверка для конкретного пользователя
        if (Gate::forUser($request->user())->allows('update-post', $post)) {
            // Разрешено
        }

        return redirect()->route('posts.show', $post);
    }
}
```

**В Blade:**

```blade
@can('update-post', $post)
    <a href="{{ route('posts.edit', $post) }}">Редактировать</a>
@endcan

@cannot('update-post', $post)
    <p>Вы не можете редактировать этот пост</p>
@endcannot

@canany(['update-post', 'delete-post'], $post)
    <div class="post-actions">...</div>
@endcanany
```

**Inline в маршрутах:**

```php
Route::put('/posts/{post}', [PostController::class, 'update'])
    ->can('update-post', 'post');
```

### 5.3 Gate Hooks

```php
// Перехват ПЕРЕД проверкой любого gate
Gate::before(function (User $user, string $ability) {
    if ($user->is_super_admin) {
        return true; // Суперадмин может всё
    }
});

// Перехват ПОСЛЕ проверки
Gate::after(function (User $user, string $ability, bool $result, mixed $arguments) {
    // Логирование всех проверок прав
    Log::info("Gate check: {$ability}", [
        'user' => $user->id,
        'result' => $result,
    ]);
});
```

---

## 6. Policies — Авторизация для моделей

### 6.1 Создание Policy

Policies группируют логику авторизации вокруг модели:

```bash
php artisan make:policy PostPolicy --model=Post
```

**Созданный класс** (`app/Policies/PostPolicy.php`):

```php
namespace App\Policies;

use App\Models\Post;
use App\Models\User;

class PostPolicy
{
    /**
     * Может ли пользователь просматривать любые посты
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Может ли пользователь просматривать конкретный пост
     */
    public function view(?User $user, Post $post): bool
    {
        // Публичные посты доступны всем
        if ($post->is_published) {
            return true;
        }

        // Черновики только автору
        return $user && $user->id === $post->user_id;
    }

    /**
     * Может ли пользователь создавать посты
     */
    public function create(User $user): bool
    {
        // Только верифицированные пользователи
        return $user->email_verified_at !== null;
    }

    /**
     * Может ли пользователь обновлять пост
     */
    public function update(User $user, Post $post): bool
    {
        return $user->id === $post->user_id;
    }

    /**
     * Может ли пользователь удалять пост
     */
    public function delete(User $user, Post $post): bool
    {
        return $user->id === $post->user_id;
    }

    /**
     * Может ли пользователь восстанавливать пост
     */
    public function restore(User $user, Post $post): bool
    {
        return $user->id === $post->user_id;
    }

    /**
     * Может ли пользователь окончательно удалять пост
     */
    public function forceDelete(User $user, Post $post): bool
    {
        return $user->is_admin;
    }
}
```

### 6.2 Регистрация Policy

**Автоматическая регистрация** (по соглашению):

Laravel автоматически находит политики, если они следуют соглашению:
- `App\Policies\PostPolicy` для `App\Models\Post`

**Ручная регистрация** (`AuthServiceProvider`):

```php
namespace App\Providers;

use App\Models\Post;
use App\Policies\PostPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Post::class => PostPolicy::class,
    ];

    public function boot(): void
    {
        //
    }
}
```

### 6.3 Использование Policies

**В контроллере:**

```php
namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function index()
    {
        // Проверка viewAny
        $this->authorize('viewAny', Post::class);

        return view('posts.index', [
            'posts' => Post::all(),
        ]);
    }

    public function show(Post $post)
    {
        // Проверка view
        $this->authorize('view', $post);

        return view('posts.show', compact('post'));
    }

    public function edit(Post $post)
    {
        $this->authorize('update', $post);

        return view('posts.edit', compact('post'));
    }

    public function update(Request $request, Post $post)
    {
        $this->authorize('update', $post);

        $post->update($request->validated());

        return redirect()->route('posts.show', $post);
    }

    public function destroy(Post $post)
    {
        $this->authorize('delete', $post);

        $post->delete();

        return redirect()->route('posts.index');
    }
}
```

**Альтернативные способы:**

```php
use Illuminate\Support\Facades\Gate;

// Через фасад Gate
if (Gate::allows('update', $post)) {
    // Разрешено
}

Gate::authorize('update', $post); // Выбросит 403 если нет доступа

// Через модель User
if ($request->user()->can('update', $post)) {
    // Разрешено
}

if ($request->user()->cannot('update', $post)) {
    abort(403);
}

// Любое из прав
if ($request->user()->canAny(['update', 'delete'], $post)) {
    // Может обновить ИЛИ удалить
}
```

**В маршрутах:**

```php
Route::put('/posts/{post}', [PostController::class, 'update'])
    ->middleware('can:update,post');

// Для действий без модели
Route::get('/posts/create', [PostController::class, 'create'])
    ->middleware('can:create,App\Models\Post');
```

**В Blade:**

```blade
@can('update', $post)
    <a href="{{ route('posts.edit', $post) }}">Редактировать</a>
@endcan

@cannot('delete', $post)
    <p class="text-muted">Вы не можете удалить этот пост</p>
@endcannot

@canany(['update', 'delete'], $post)
    <div class="dropdown">
        @can('update', $post)
            <a href="{{ route('posts.edit', $post) }}">Редактировать</a>
        @endcan
        
        @can('delete', $post)
            <form method="POST" action="{{ route('posts.destroy', $post) }}">
                @csrf @method('DELETE')
                <button type="submit">Удалить</button>
            </form>
        @endcan
    </div>
@endcanany
```

### 6.4 Policy Filters

**Перехват перед всеми проверками:**

```php
namespace App\Policies;

use App\Models\Post;
use App\Models\User;

class PostPolicy
{
    /**
     * Выполняется ПЕРЕД всеми другими методами
     */
    public function before(User $user, string $ability): ?bool
    {
        // Суперадмин может всё
        if ($user->is_super_admin) {
            return true;
        }

        // Возвращаем null чтобы продолжить обычную проверку
        return null;
    }

    // Остальные методы...
}
```

### 6.5 Policies без моделей

Для проверок не связанных с конкретной моделью:

```php
namespace App\Policies;

use App\Models\User;

class AdminPolicy
{
    public function viewDashboard(User $user): bool
    {
        return $user->role === 'admin';
    }

    public function manageUsers(User $user): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }
}
```

**Использование:**

```php
// В AuthServiceProvider
use App\Policies\AdminPolicy;

protected $policies = [
    'admin' => AdminPolicy::class,
];

// В контроллере
Gate::authorize('viewDashboard', 'admin');

// В Blade
@can('viewDashboard', 'admin')
    <a href="/admin">Панель администратора</a>
@endcan
```

---

## 7. Продвинутые техники

### 7.1 Роли и разрешения (RBAC)

**Миграции:**

```php
// Роли
Schema::create('roles', function (Blueprint $table) {
    $table->id();
    $table->string('name')->unique();
    $table->string('description')->nullable();
    $table->timestamps();
});

// Разрешения
Schema::create('permissions', function (Blueprint $table) {
    $table->id();
    $table->string('name')->unique();
    $table->string('description')->nullable();
    $table->timestamps();
});

// Связь роли-разрешения
Schema::create('permission_role', function (Blueprint $table) {
    $table->foreignId('permission_id')->constrained()->onDelete('cascade');
    $table->foreignId('role_id')->constrained()->onDelete('cascade');
    $table->primary(['permission_id', 'role_id']);
});

// Связь пользователь-роль
Schema::create('role_user', function (Blueprint $table) {
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->foreignId('role_id')->constrained()->onDelete('cascade');
    $table->primary(['user_id', 'role_id']);
});
```

**Модели:**

```php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    protected $fillable = ['name', 'description'];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }
}

class Permission extends Model
{
    protected $fillable = ['name', 'description'];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }
}
```

**В модели User:**

```php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class User extends Authenticatable
{
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    public function hasRole(string $role): bool
    {
        return $this->roles()->where('name', $role)->exists();
    }

    public function hasAnyRole(array $roles): bool
    {
        return $this->roles()->whereIn('name', $roles)->exists();
    }

    public function hasPermission(string $permission): bool
    {
        return $this->roles()
            ->whereHas('permissions', function ($query) use ($permission) {
                $query->where('name', $permission);
            })
            ->exists();
    }

    public function giveRole(string $role): void
    {
        $roleModel = Role::where('name', $role)->firstOrFail();
        $this->roles()->syncWithoutDetaching($roleModel);
    }

    public function removeRole(string $role): void
    {
        $roleModel = Role::where('name', $role)->firstOrFail();
        $this->roles()->detach($roleModel);
    }
}
```

**Gate с ролями:**

```php
// В AuthServiceProvider
Gate::define('edit-posts', function (User $user) {
    return $user->hasPermission('edit-posts');
});

Gate::define('manage-users', function (User $user) {
    return $user->hasRole('admin');
});

// Или через before
Gate::before(function (User $user, string $ability) {
    // Проверяем, есть ли разрешение с таким именем
    if ($user->hasPermission($ability)) {
        return true;
    }
});
```

**Middleware для ролей:**

```php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles)
    {
        if (!$request->user()) {
            abort(401);
        }

        if (!$request->user()->hasAnyRole($roles)) {
            abort(403, 'Недостаточно прав');
        }

        return $next($request);
    }
}
```

**Регистрация middleware:**

```php
// В bootstrap/app.php (Laravel 11+)
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'role' => \App\Http\Middleware\CheckRole::class,
    ]);
})

// Использование
Route::middleware('role:admin,moderator')->group(function () {
    Route::get('/admin/users', [UserController::class, 'index']);
});
```

### 7.2 Кеширование проверок прав

```php
namespace App\Policies;

use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class PostPolicy
{
    public function update(User $user, Post $post): bool
    {
        $cacheKey = "post.{$post->id}.can-update.{$user->id}";

        return Cache::remember($cacheKey, now()->addMinutes(5), function () use ($user, $post) {
            // Сложная проверка с запросами в БД
            return $user->id === $post->user_id 
                || $user->hasPermission('edit-any-post');
        });
    }
}
```

### 7.3 Авторизация в API

**С Sanctum:**

```php
// В маршрутах
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('posts', PostController::class);
});

// В контроллере
public function update(Request $request, Post $post)
{
    $this->authorize('update', $post);
    
    $post->update($request->validated());
    
    return new PostResource($post);
}
```

**Abilities для токенов:**

```php
// Создание токена с ограниченными правами
$token = $user->createToken('mobile-app', ['posts:read', 'posts:create']);

// Проверка abilities
if ($request->user()->tokenCan('posts:create')) {
    // Токен имеет это право
}

// В Policy
public function create(User $user): bool
{
    return $user->tokenCan('posts:create');
}
```

---

## 8. Практические примеры

### 8.1 Блог с модерацией

**Policy:**

```php
namespace App\Policies;

use App\Models\Post;
use App\Models\User;

class PostPolicy
{
    public function publish(User $user, Post $post): bool
    {
        // Автор может публиковать свои черновики
        if ($user->id === $post->user_id && $post->status === 'draft') {
            return true;
        }

        // Модератор может публиковать любые посты
        return $user->hasRole('moderator');
    }

    public function unpublish(User $user, Post $post): bool
    {
        // Только модераторы
        return $user->hasRole('moderator');
    }

    public function feature(User $user, Post $post): bool
    {
        // Только админы могут добавлять в избранное
        return $user->hasRole('admin') && $post->is_published;
    }
}
```

**Контроллер:**

```php
namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;

class PostPublishController extends Controller
{
    public function store(Post $post)
    {
        $this->authorize('publish', $post);

        $post->update([
            'status' => 'published',
            'published_at' => now(),
        ]);

        return back()->with('success', 'Пост опубликован');
    }

    public function destroy(Post $post)
    {
        $this->authorize('unpublish', $post);

        $post->update(['status' => 'draft']);

        return back()->with('success', 'Пост снят с публикации');
    }
}
```

### 8.2 E-commerce с заказами

**Policy:**

```php
namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    public function view(User $user, Order $order): bool
    {
        // Покупатель или менеджер
        return $user->id === $order->user_id 
            || $user->hasRole('manager');
    }

    public function cancel(User $user, Order $order): bool
    {
        // Только свои заказы и только если не отправлен
        return $user->id === $order->user_id 
            && in_array($order->status, ['pending', 'processing']);
    }

    public function refund(User $user, Order $order): bool
    {
        // Только менеджеры для завершенных заказов
        return $user->hasRole('manager') 
            && $order->status === 'completed';
    }

    public function updateStatus(User $user, Order $order): bool
    {
        return $user->hasRole('manager');
    }
}
```

---

## 9. Тестирование авторизации

### 9.1 Unit-тесты для Policies

```php
namespace Tests\Unit;

use App\Models\Post;
use App\Models\User;
use App\Policies\PostPolicy;
use Tests\TestCase;

class PostPolicyTest extends TestCase
{
    public function test_user_can_update_own_post()
    {
        $user = User::factory()->create();
        $post = Post::factory()->create(['user_id' => $user->id]);
        $policy = new PostPolicy();

        $this->assertTrue($policy->update($user, $post));
    }

    public function test_user_cannot_update_others_post()
    {
        $user = User::factory()->create();
        $otherPost = Post::factory()->create();
        $policy = new PostPolicy();

        $this->assertFalse($policy->update($user, $otherPost));
    }

    public function test_admin_can_delete_any_post()
    {
        $admin = User::factory()->admin()->create();
        $post = Post::factory()->create();
        $policy = new PostPolicy();

        $this->assertTrue($policy->forceDelete($admin, $post));
    }
}
```

### 9.2 Feature-тесты с авторизацией

```php
namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Tests\TestCase;

class PostControllerTest extends TestCase
{
    public function test_user_can_edit_own_post()
    {
        $user = User::factory()->create();
        $post = Post::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)
            ->get(route('posts.edit', $post));

        $response->assertStatus(200);
    }

    public function test_user_cannot_edit_others_post()
    {
        $user = User::factory()->create();
        $otherPost = Post::factory()->create();

        $response = $this->actingAs($user)
            ->get(route('posts.edit', $otherPost));

        $response->assertStatus(403);
    }

    public function test_guest_cannot_create_post()
    {
        $response = $this->post(route('posts.store'), [
            'title' => 'Test Post',
            'body' => 'Test content',
        ]);

        $response->assertStatus(401);
    }
}
```

---

## 10. Распространенные ошибки

### ❌ Дублирование логики

```php
// Плохо: проверка в контроллере
public function update(Request $request, Post $post)
{
    if ($request->user()->id !== $post->user_id) {
        abort(403);
    }
    // ...
}

// Хорошо: использование Policy
public function update(Request $request, Post $post)
{
    $this->authorize('update', $post);
    // ...
}
```

### ❌ Забыли про гостей

```php
// Плохо: будет ошибка для гостей
public function view(User $user, Post $post): bool
{
    return $user->id === $post->user_id;
}

// Хорошо: nullable User
public function view(?User $user, Post $post): bool
{
    if ($post->is_public) {
        return true;
    }
    
    return $user && $user->id === $post->user_id;
}
```

### ❌ Проверка только в UI

```php
// Плохо: проверка только в Blade
@can('delete', $post)
    <button>Удалить</button>
@endcan

// А в контроллере нет проверки!
public function destroy(Post $post) {
    $post->delete(); // Уязвимость!
}

// Хорошо: проверка и в контроллере
public function destroy(Post $post) {
    $this->authorize('delete', $post);
    $post->delete();
}
```

---

## 11. Упражнения

### Упражнение 1: Настройка Breeze
Установите Laravel Breeze и настройте аутентификацию:
- Добавьте поле `phone` в регистрацию
- Сделайте email verification обязательным
- Добавьте капчу на форму логина

### Упражнение 2: Множественные Guards
Создайте систему с двумя типами пользователей:
- Обычные пользователи (users)
- Администраторы (admins)
- Разные формы логина
- Разные дашборды после входа

### Упражнение 3: Система ролей
Реализуйте RBAC систему:
- Роли: admin, editor, author, subscriber
- Разрешения: create-post, edit-any-post, delete-any-post, publish-post
- Назначьте разрешения ролям
- Создайте middleware для проверки ролей

### Упражнение 4: Сложная Policy
Создайте Policy для модели Article с правилами:
- Автор может редактировать свои неопубликованные статьи
- Редактор может редактировать любые статьи
- Админ может удалять любые статьи
- Публиковать могут только редакторы и админы
- Гости могут видеть только опубликованные статьи

### Упражнение 5: API авторизация
Настройте API с Sanctum:
- Создайте эндпоинты для управления постами
- Используйте токены с abilities
- Реализуйте Rate Limiting
- Добавьте проверку прав через Policies

---

## 12. Резюме

**Основные понятия:**
- **Guard** — механизм аутентификации (session, token)
- **Provider** — источник пользовательских данных
- **Gate** — простые проверки прав через замыкания
- **Policy** — группировка логики авторизации вокруг модели

**Когда что использовать:**
- **Breeze** — минималистичная аутентификация для большинства проектов
- **Jetstream** — расширенная функциональность (2FA, команды, API токены)
- **Gates** — простые проверки, не привязанные к моделям
- **Policies** — авторизация действий над моделями

**Best Practices:**
- Всегда проверяйте права в контроллерах, не только в UI
- Используйте `?User` для публичных ресурсов
- Применяйте `before()` для суперадминов
- Кешируйте сложные проверки прав
- Тестируйте всю логику авторизации

**Безопасность:**
- Регенерируйте сессию после логина
- Используйте rate limiting для логина
- Валидируйте все входные данные
- Никогда не храните пароли в открытом виде

В следующей главе мы изучим **валидацию данных** — правила, кастомные валидаторы и Form Requests! 🚀