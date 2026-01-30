# Приложение Б: Шпаргалка по Laravel

## 📋 Быстрый справочник для ежедневной работы

---

## 🎯 Artisan — Командная строка Laravel

### Основные команды

```bash
# Справка и список команд
php artisan list                    # Все доступные команды
php artisan help <command>          # Помощь по конкретной команде

# Сервер разработки
php artisan serve                   # Запуск на localhost:8000
php artisan serve --port=8080       # На другом порту
php artisan serve --host=0.0.0.0    # Доступ из сети

# Очистка кеша
php artisan cache:clear             # Очистить application cache
php artisan config:clear            # Очистить config cache
php artisan route:clear             # Очистить route cache
php artisan view:clear              # Очистить compiled views

# Кеширование для production
php artisan config:cache            # Кешировать конфигурацию
php artisan route:cache             # Кешировать маршруты
php artisan view:cache              # Кешировать views
php artisan event:cache             # Кешировать события
php artisan optimize                # Все оптимизации сразу
php artisan optimize:clear          # Очистить все кеши
```

### Контроллеры

```bash
# Создание контроллеров
php artisan make:controller UserController                    # Обычный
php artisan make:controller UserController --resource         # С CRUD методами
php artisan make:controller UserController --api              # API (без create/edit)
php artisan make:controller UserController --model=User       # С type hints модели
php artisan make:controller UserController --invokable        # Single action
```

### Модели

```bash
# Создание моделей
php artisan make:model Post                              # Только модель
php artisan make:model Post -m                           # + миграция
php artisan make:model Post -f                           # + factory
php artisan make:model Post -s                           # + seeder
php artisan make:model Post -c                           # + контроллер
php artisan make:model Post -mfsc                        # Всё сразу
php artisan make:model Post --all                        # Всё + policy + resource

# Информация о модели
php artisan model:show Post                              # Атрибуты, связи, observers
```

### Миграции

```bash
# Создание миграций
php artisan make:migration create_posts_table            # Создание таблицы
php artisan make:migration add_status_to_posts_table     # Изменение таблицы
php artisan make:migration create_posts_table --create=posts

# Выполнение миграций
php artisan migrate                                      # Запустить новые миграции
php artisan migrate --force                              # В production (без подтверждения)
php artisan migrate:rollback                             # Откатить последний batch
php artisan migrate:rollback --step=2                    # Откатить 2 последних batch
php artisan migrate:reset                                # Откатить всё
php artisan migrate:refresh                              # Откатить и запустить заново
php artisan migrate:refresh --seed                       # + запустить seeders
php artisan migrate:fresh                                # Drop all + migrate
php artisan migrate:fresh --seed                         # + seeders

# Информация
php artisan migrate:status                               # Статус миграций
```

### Seeders и Factories

```bash
# Создание
php artisan make:seeder UserSeeder                       # Seeder
php artisan make:factory PostFactory                     # Factory
php artisan make:factory PostFactory --model=Post        # С привязкой к модели

# Запуск
php artisan db:seed                                      # Запустить DatabaseSeeder
php artisan db:seed --class=UserSeeder                   # Конкретный seeder
php artisan migrate:fresh --seed                         # Пересоздать БД и заполнить
```

### Middleware

```bash
php artisan make:middleware CheckAge                     # Создать middleware
php artisan make:middleware EnsureTokenIsValid
```

### Requests

```bash
php artisan make:request StorePostRequest                # Form Request для валидации
php artisan make:request UpdatePostRequest
```

### Resources (API)

```bash
php artisan make:resource PostResource                   # Одиночный ресурс
php artisan make:resource PostCollection                 # Коллекция
php artisan make:resource Post --collection              # То же самое
```

### Policies и Gates

```bash
php artisan make:policy PostPolicy                       # Policy без модели
php artisan make:policy PostPolicy --model=Post          # С type hints модели
```

### Jobs и Queues

```bash
# Создание
php artisan make:job SendEmailJob                        # Job для очереди
php artisan make:job ProcessPodcast --sync               # Синхронный

# Работа с очередями
php artisan queue:work                                   # Обработка очереди
php artisan queue:work --queue=emails,default            # Конкретные очереди
php artisan queue:work --tries=3                         # Количество попыток
php artisan queue:work --timeout=60                      # Таймаут
php artisan queue:listen                                 # То же, но перезапускается
php artisan queue:restart                                # Перезапустить workers
php artisan queue:failed                                 # Список failed jobs
php artisan queue:retry <id>                             # Повторить failed job
php artisan queue:retry all                              # Повторить все
php artisan queue:flush                                  # Удалить все failed
```

### Events и Listeners

```bash
php artisan make:event UserRegistered                    # Event
php artisan make:listener SendWelcomeEmail --event=UserRegistered
php artisan event:generate                               # Создать все из EventServiceProvider
php artisan event:list                                   # Список событий
```

### Commands (консольные команды)

```bash
php artisan make:command SendEmails                      # Создать команду
php artisan make:command SendEmails --command=emails:send
```

### Notifications

```bash
php artisan make:notification InvoicePaid                # Notification
php artisan notifications:table                          # Миграция для database channel
```

### Mail

```bash
php artisan make:mail OrderShipped                       # Mailable класс
php artisan make:mail OrderShipped --markdown=emails.orders.shipped
```

### Testing

```bash
php artisan make:test UserTest                           # Feature test
php artisan make:test UserTest --unit                    # Unit test
php artisan make:test UserTest --pest                    # Pest test
php artisan test                                         # Запустить все тесты
php artisan test --filter UserTest                       # Конкретный тест
php artisan test --parallel                              # Параллельно
```

### Другие полезные команды

```bash
# Информация о приложении
php artisan about                                        # Информация о Laravel
php artisan env                                          # Текущее окружение
php artisan inspire                                      # Мотивирующая цитата 😊

# Tinker (REPL)
php artisan tinker                                       # Интерактивная консоль
>>> User::count()
>>> User::factory()->create()

# Storage
php artisan storage:link                                 # Создать symlink storage/app/public
php artisan storage:unlink                               # Удалить symlink

# Vendor
php artisan vendor:publish                               # Опубликовать vendor файлы
php artisan vendor:publish --tag=config
php artisan vendor:publish --provider="Vendor\Package\ServiceProvider"

# Maintenance mode
php artisan down                                         # Включить maintenance mode
php artisan down --secret="secret-token"                 # С bypass токеном
php artisan up                                           # Выключить

# Horizon (если установлен)
php artisan horizon                                      # Запустить Horizon
php artisan horizon:terminate                            # Остановить

# Telescope (если установлен)
php artisan telescope:install                            # Установить
php artisan telescope:publish                            # Опубликовать assets
php artisan telescope:prune                              # Очистить старые записи
```

---

## 🗄️ Eloquent — Методы запросов

### Создание и сохранение

```php
// Создание
$user = new User();
$user->name = 'John';
$user->save();

// Массовое присваивание
$user = User::create([
    'name' => 'John',
    'email' => 'john@example.com'
]);

// firstOrCreate — найти или создать
$user = User::firstOrCreate(
    ['email' => 'john@example.com'],
    ['name' => 'John']
);

// firstOrNew — найти или новый экземпляр (без сохранения)
$user = User::firstOrNew(['email' => 'john@example.com']);

// updateOrCreate — найти и обновить или создать
$user = User::updateOrCreate(
    ['email' => 'john@example.com'],
    ['name' => 'John Doe']
);

// upsert — вставить или обновить (batch)
User::upsert([
    ['email' => 'john@example.com', 'name' => 'John'],
    ['email' => 'jane@example.com', 'name' => 'Jane']
], ['email'], ['name']);
```

### Получение данных

```php
// Все записи
$users = User::all();

// С условием
$users = User::where('active', 1)->get();

// Первая запись
$user = User::first();
$user = User::where('email', 'john@example.com')->first();

// Первая или исключение
$user = User::firstOrFail();
$user = User::where('email', 'john@example.com')->firstOrFail();

// По ID
$user = User::find(1);
$users = User::find([1, 2, 3]);
$user = User::findOrFail(1);

// По другому ключу
$user = User::where('email', 'john@example.com')->sole();  // Одна или исключение

// Один из столбцов
$names = User::pluck('name');
$names = User::pluck('name', 'id');  // Ключ => значение

// Только первое значение
$name = User::where('id', 1)->value('name');

// Количество
$count = User::count();
$count = User::where('active', 1)->count();

// Проверка существования
$exists = User::where('email', 'john@example.com')->exists();
$doesntExist = User::where('email', 'john@example.com')->doesntExist();
```

### WHERE условия

```php
// Простые условия
User::where('name', 'John')->get();
User::where('votes', '>', 100)->get();
User::where('votes', '>=', 100)->get();
User::where('votes', '<>', 100)->get();
User::where('name', 'like', 'John%')->get();

// Несколько условий (AND)
User::where('name', 'John')
    ->where('votes', '>', 100)
    ->get();

// Массив условий (AND)
User::where([
    ['name', '=', 'John'],
    ['votes', '>', 100]
])->get();

// OR условия
User::where('votes', '>', 100)
    ->orWhere('name', 'John')
    ->get();

// Группировка условий
User::where('name', 'John')
    ->orWhere(function ($query) {
        $query->where('votes', '>', 100)
              ->where('title', 'Admin');
    })->get();

// whereBetween
User::whereBetween('votes', [1, 100])->get();
User::whereNotBetween('votes', [1, 100])->get();

// whereIn
User::whereIn('id', [1, 2, 3])->get();
User::whereNotIn('id', [1, 2, 3])->get();

// whereNull
User::whereNull('deleted_at')->get();
User::whereNotNull('email_verified_at')->get();

// whereDate, whereMonth, whereDay, whereYear, whereTime
User::whereDate('created_at', '2024-01-01')->get();
User::whereMonth('created_at', 12)->get();
User::whereDay('created_at', 1)->get();
User::whereYear('created_at', 2024)->get();
User::whereTime('created_at', '14:30:00')->get();

// whereColumn — сравнение столбцов
User::whereColumn('updated_at', '>', 'created_at')->get();

// whereExists — с подзапросом
User::whereExists(function ($query) {
    $query->select(DB::raw(1))
          ->from('orders')
          ->whereColumn('orders.user_id', 'users.id');
})->get();

// JSON столбцы
User::where('options->language', 'en')->get();
User::whereJsonContains('options->languages', 'en')->get();
User::whereJsonLength('options->languages', 3)->get();
```

### Сортировка и лимиты

```php
// Сортировка
User::orderBy('name')->get();
User::orderBy('name', 'desc')->get();
User::latest()->get();                    // По created_at desc
User::oldest()->get();                    // По created_at asc
User::latest('updated_at')->get();
User::inRandomOrder()->get();

// Группировка
User::groupBy('account_id')->get();
User::groupBy('account_id', 'status')->get();

// Having
User::groupBy('account_id')
    ->having('account_id', '>', 100)
    ->get();

// Лимиты
User::take(5)->get();
User::limit(5)->get();
User::skip(10)->take(5)->get();
User::offset(10)->limit(5)->get();
```

### Обновление

```php
// Обновление одной модели
$user = User::find(1);
$user->name = 'John Doe';
$user->save();

// Массовое обновление
User::where('active', 1)
    ->update(['status' => 'verified']);

// increment / decrement
User::where('id', 1)->increment('votes');
User::where('id', 1)->increment('votes', 5);
User::where('id', 1)->decrement('votes');
User::where('id', 1)->increment('votes', 1, ['status' => 'active']);
```

### Удаление

```php
// Удаление модели
$user = User::find(1);
$user->delete();

// Массовое удаление
User::where('active', 0)->delete();

// Удаление по ID
User::destroy(1);
User::destroy([1, 2, 3]);
User::destroy(1, 2, 3);

// Soft Delete
$user->delete();                          // Мягкое удаление
$user->forceDelete();                     // Жёсткое удаление
$user->restore();                         // Восстановление

// Запросы с soft deleted
User::withTrashed()->get();               // Включая удалённые
User::onlyTrashed()->get();               // Только удалённые
```

### Отношения (Relationships)

```php
// Загрузка отношений
$user = User::with('posts')->find(1);
$users = User::with(['posts', 'comments'])->get();
$users = User::with('posts:id,title,user_id')->get();  // Выбрать столбцы

// Вложенные отношения
$users = User::with('posts.comments')->get();

// Условия для отношений
$users = User::with(['posts' => function ($query) {
    $query->where('published', 1);
}])->get();

// Lazy Eager Loading
$users = User::all();
$users->load('posts');

// withCount — количество связанных
$users = User::withCount('posts')->get();
echo $users[0]->posts_count;

// withCount с условиями
$users = User::withCount(['posts' => function ($query) {
    $query->where('published', 1);
}])->get();

// withExists — проверка существования
$users = User::withExists('posts')->get();
echo $users[0]->posts_exists;

// has — фильтр по наличию отношений
$users = User::has('posts')->get();
$users = User::has('posts', '>=', 3)->get();

// whereHas — фильтр с условиями
$users = User::whereHas('posts', function ($query) {
    $query->where('published', 1);
})->get();

// doesntHave
$users = User::doesntHave('posts')->get();

// withAggregate — агрегация
$users = User::withMax('posts', 'votes')->get();
$users = User::withMin('posts', 'votes')->get();
$users = User::withSum('posts', 'votes')->get();
$users = User::withAvg('posts', 'votes')->get();
```

### Агрегация

```php
// Подсчёт
$count = User::count();
$count = User::where('active', 1)->count();

// Максимум, минимум
$max = User::max('votes');
$min = User::min('votes');

// Сумма
$sum = User::sum('votes');

// Среднее
$avg = User::avg('votes');

// Aggregate с группировкой
$result = User::select('status', DB::raw('count(*) as count'))
    ->groupBy('status')
    ->get();
```

### Scopes

```php
// Global Scope (в модели)
protected static function booted()
{
    static::addGlobalScope('active', function (Builder $query) {
        $query->where('active', 1);
    });
}

// Использование
User::withoutGlobalScope('active')->get();
User::withoutGlobalScopes()->get();

// Local Scope (в модели)
public function scopeActive($query)
{
    return $query->where('active', 1);
}

public function scopePopular($query)
{
    return $query->where('votes', '>', 100);
}

// Использование
User::active()->get();
User::active()->popular()->get();

// Scope с параметрами
public function scopeOfType($query, $type)
{
    return $query->where('type', $type);
}

User::ofType('admin')->get();
```

### Chunks и Cursors

```php
// chunk — обработка большого количества записей
User::chunk(100, function ($users) {
    foreach ($users as $user) {
        // Обработка
    }
});

// chunkById — безопаснее при обновлениях
User::chunkById(100, function ($users) {
    foreach ($users as $user) {
        $user->update(['processed' => true]);
    }
});

// lazy — ленивая коллекция
User::lazy()->each(function ($user) {
    // Обработка
});

// cursor — генератор (минимум памяти)
foreach (User::cursor() as $user) {
    // Обработка
}
```

### Дополнительные методы

```php
// Дублирование модели
$user = User::find(1);
$newUser = $user->replicate();
$newUser->save();

// Обновление timestamps
$user->touch();

// Refresh — перезагрузка из БД
$user->refresh();

// Raw выражения
User::select(DB::raw('count(*) as user_count'))
    ->get();

User::whereRaw('age > ? and votes = 100', [25])
    ->get();

// Lock
User::where('id', 1)->lockForUpdate()->first();
User::where('id', 1)->sharedLock()->first();
```

---

## 🛠️ Helper функции

### Массивы и объекты

```php
// array_*
Arr::accessible($value);                 // Проверка доступности как массив
Arr::add($array, 'key', 'value');        // Добавить если не существует
Arr::collapse($array);                   // Схлопнуть многомерный массив
Arr::divide($array);                     // Разделить на ключи и значения
Arr::dot($array);                        // Преобразовать в dot-нотацию
Arr::except($array, ['key1', 'key2']);   // Исключить ключи
Arr::exists($array, 'key');              // Проверка существования ключа
Arr::first($array, $callback);           // Первый элемент
Arr::flatten($array);                    // Схлопнуть в одномерный
Arr::forget($array, 'key');              // Удалить по ключу
Arr::get($array, 'key', 'default');      // Получить с default
Arr::has($array, 'key');                 // Проверка наличия
Arr::hasAny($array, ['key1', 'key2']);   // Любой из ключей
Arr::only($array, ['key1', 'key2']);     // Только эти ключи
Arr::pluck($array, 'key');               // Извлечь значения
Arr::prepend($array, 'value', 'key');    // Добавить в начало
Arr::pull($array, 'key');                // Извлечь и удалить
Arr::random($array, 2);                  // Случайные элементы
Arr::set($array, 'key', 'value');        // Установить значение
Arr::shuffle($array);                    // Перемешать
Arr::sort($array);                       // Сортировать
Arr::where($array, $callback);           // Фильтр
Arr::wrap($value);                       // Обернуть в массив

// data_*
data_get($array, 'key.nested', 'default');
data_set($array, 'key.nested', 'value');
data_fill($array, 'key', 'value');       // Установить если не существует
```

### Строки

```php
// Str::*
use Illuminate\Support\Str;

Str::after('This is my name', 'This is');           // " my name"
Str::afterLast('App\Http\Controllers\Controller', '\\'); // "Controller"
Str::before('This is my name', 'my');               // "This is "
Str::beforeLast('This is my name', 'is');           // "This "
Str::between('This is my name', 'This', 'name');    // " is my "
Str::camel('foo_bar');                              // "fooBar"
Str::contains('This is my name', 'my');             // true
Str::containsAll('This is my name', ['my', 'name']); // true
Str::endsWith('This is my name', 'name');           // true
Str::finish('this/string', '/');                    // "this/string/"
Str::headline('steve_jobs');                        // "Steve Jobs"
Str::is('foo*', 'foobar');                          // true (паттерн)
Str::isAscii('Taylor');                             // true
Str::isJson('{"foo":"bar"}');                       // true
Str::isUuid($value);                                // true/false
Str::kebab('fooBar');                               // "foo-bar"
Str::length('Laravel');                             // 7
Str::limit('Very long text', 10);                   // "Very long..."
Str::lower('LARAVEL');                              // "laravel"
Str::upper('laravel');                              // "LARAVEL"
Str::plural('child');                               // "children"
Str::singular('children');                          // "child"
Str::random(40);                                    // Случайная строка
Str::remove('e', 'Peter Piper');                    // "Ptr Pipr"
Str::replace('Laravel', 'PHP', 'Laravel is great'); // "PHP is great"
Str::replaceArray('?', ['8:30', '9:00'], 'The event is at ?'); 
Str::replaceFirst('the', 'a', 'the quick brown fox');
Str::replaceLast('the', 'a', 'the quick brown fox the');
Str::slug('Laravel Framework');                     // "laravel-framework"
Str::snake('fooBar');                               // "foo_bar"
Str::start('this/string', '/');                     // "/this/string"
Str::startsWith('This is my name', 'This');         // true
Str::studly('foo_bar');                             // "FooBar"
Str::title('a nice title');                         // "A Nice Title"
Str::ucfirst('foo bar');                            // "Foo bar"
Str::uuid();                                        // UUID строка
Str::wordCount('Hello, world!');                    // 2
Str::words('Perfectly balanced, as all things should be.', 3);
// "Perfectly balanced, as..."

// str() helper
str('foo bar')->camel();                            // "fooBar"
str('foo bar')->kebab();                            // "foo-bar"
str('foo bar')->studly();                           // "FooBar"
```

### Пути

```php
app_path();                              // /path/to/app
app_path('Http/Controllers');            // /path/to/app/Http/Controllers
base_path();                             // /path/to/project
base_path('vendor/bin');                 // /path/to/project/vendor/bin
config_path();                           // /path/to/config
database_path();                         // /path/to/database
public_path();                           // /path/to/public
resource_path();                         // /path/to/resources
storage_path();                          // /path/to/storage
storage_path('app/file.txt');            // /path/to/storage/app/file.txt
```

### URL и роуты

```php
// URL
url('/posts');                           // http://example.com/posts
url()->current();                        // Текущий URL
url()->previous();                       // Предыдущий URL
url()->full();                           // С query string

// Роуты
route('posts.index');                    // URL по имени роута
route('posts.show', ['id' => 1]);        // С параметрами
route('posts.show', ['post' => $post]);  // Route model binding

// Asset
asset('img/photo.jpg');                  // http://example.com/img/photo.jpg
secure_asset('img/photo.jpg');           // https://...
mix('css/app.css');                      // С версионированием (Mix)
```

### Переменные окружения

```php
env('APP_ENV');                          // Значение из .env
env('APP_DEBUG', false);                 // С default значением

config('app.name');                      // Значение из config
config('app.timezone', 'UTC');           // С default
config(['app.debug' => true]);           // Установить runtime
```

### Ответы

```php
// Response
response('Hello World', 200);
response()->json(['name' => 'John']);
response()->download($pathToFile);
response()->download($pathToFile, $name, $headers);
response()->file($pathToFile);
response()->streamDownload(function () {
    echo 'CSV content';
}, 'export.csv');

// Redirect
redirect('/home');
redirect()->route('posts.index');
redirect()->back();
redirect()->away('https://example.com');
redirect()->action([UserController::class, 'index']);

// С flash данными
redirect('/home')->with('status', 'Task was successful!');

// Abort
abort(404);
abort(403, 'Unauthorized action.');
abort_if($user->id !== $post->user_id, 403);
abort_unless(Auth::check(), 403);
```

### Валидация

```php
// В контроллере
$validated = $request->validate([
    'title' => 'required|max:255',
    'body' => 'required',
]);

// Validator facade
$validator = Validator::make($request->all(), [
    'title' => 'required|max:255',
]);

if ($validator->fails()) {
    return redirect('/post/create')
        ->withErrors($validator)
        ->withInput();
}

// Правила
'required'
'nullable'
'email'
'unique:users,email'
'unique:users,email,10'              // Исключить ID
'exists:users,id'
'min:3'
'max:255'
'size:10'
'between:1,100'
'in:foo,bar,baz'
'not_in:foo,bar,baz'
'numeric'
'integer'
'string'
'array'
'boolean'
'date'
'date_format:Y-m-d'
'after:tomorrow'
'before:2024-12-31'
'confirmed'                          // password_confirmation
'same:field'
'different:field'
'regex:/pattern/'
'alpha'
'alpha_dash'
'alpha_num'
'url'
'active_url'
'ip'
'json'
'mimes:jpg,png'
'image'
'dimensions:min_width=100,min_height=200'
'file'
'max:10240'                          // KB для файлов
```

### Коллекции

```php
collect([1, 2, 3])->all();
collect([1, 2, 3])->avg();
collect([1, 2, 3])->chunk(2);
collect([1, 2, 3, 4])->collapse();
collect([1, 2, 3])->contains(2);
collect([1, 2, 3])->count();
collect([1, 2, 2])->countBy();
collect([1, 2, 3])->diff([2, 3, 4]);
collect(['a' => 1, 'b' => 2])->diffKeys(['b' => 2, 'c' => 3]);
collect([1, 2, 3])->each(function ($item) { });
collect([1, 2, 3])->every(function ($item) { return $item > 0; });
collect([1, 2, 3])->filter(function ($item) { return $item > 1; });
collect([1, 2, 3])->first();
collect([1, 2, 3])->firstWhere('id', 1);
collect([[1, 2], [3, 4]])->flatten();
collect([1, 2, 3])->flip();
collect([1, 2, 3])->forget(1);
collect(['a' => 1, 'b' => 2])->get('a');
collect([['id' => 1], ['id' => 2]])->groupBy('id');
collect([1, 2, 3])->has(0);
collect([1, 2, 3])->implode(', ');
collect([1, 2, 3])->isEmpty();
collect([1, 2, 3])->isNotEmpty();
collect(['a' => 1, 'b' => 2])->keys();
collect([1, 2, 3])->last();
collect([1, 2, 3])->map(function ($item) { return $item * 2; });
collect([1, 2, 3])->max();
collect([1, 2, 3])->merge([4, 5]);
collect([1, 2, 3])->min();
collect(['a' => 1, 'b' => 2])->only(['a']);
collect([1, 2, 3])->pluck('name');
collect([1, 2])->pop();
collect([1, 2])->prepend(0);
collect(['a' => 1, 'b' => 2])->pull('a');
collect([1, 2])->push(3);
collect([1, 2, 3])->random();
collect([1, 2, 3])->reduce(function ($carry, $item) { });
collect([1, 2, 3])->reject(function ($item) { });
collect([1, 2, 3])->reverse();
collect([1, 2, 3])->search(2);
collect([1, 2])->shift();
collect([1, 2, 3])->shuffle();
collect([1, 2, 3])->skip(1);
collect([1, 2, 3])->slice(1, 1);
collect([3, 1, 2])->sort();
collect([['name' => 'Desk']])->sortBy('name');
collect([1, 2, 3])->splice(1, 1);
collect([1, 2, 3])->sum();
collect([1, 2, 3])->take(2);
collect([1, 2, 3])->toArray();
collect([1, 2, 3])->toJson();
collect([1, 2, 3])->transform(function ($item) { });
collect([1, 2, 2])->unique();
collect(['a' => 1, 'b' => 2])->values();
collect([1, 2, 3])->when(true, function ($collection) { });
collect([1, 2, 3])->where('id', 1);
collect([1, 2, 3])->whereIn('id', [1, 2]);
collect([1, 2, 3])->whereNotIn('id', [1, 2]);
collect([1, null, 3])->whereNotNull();
collect([1, null, 3])->whereNull();
collect([1, 2, 3, 4])->zip([5, 6, 7, 8]);
```

### Логирование

```php
use Illuminate\Support\Facades\Log;

Log::emergency($message);
Log::alert($message);
Log::critical($message);
Log::error($message);
Log::warning($message);
Log::notice($message);
Log::info($message);
Log::debug($message);

// С контекстом
Log::info('User login', ['id' => $user->id]);

// Конкретный channel
Log::channel('slack')->info('Something happened!');
Log::stack(['single', 'slack'])->info('Something happened!');
```

### Кеширование

```php
use Illuminate\Support\Facades\Cache;

Cache::get('key');
Cache::get('key', 'default');
Cache::get('key', function () { return 'default'; });
Cache::has('key');
Cache::missing('key');
Cache::put('key', 'value', $seconds);
Cache::put('key', 'value', now()->addMinutes(10));
Cache::forever('key', 'value');
Cache::remember('users', $seconds, function () {
    return DB::table('users')->get();
});
Cache::rememberForever('users', function () {
    return DB::table('users')->get();
});
Cache::pull('key');                  // Получить и удалить
Cache::forget('key');
Cache::flush();                      // Очистить весь кеш
Cache::increment('key');
Cache::increment('key', $amount);
Cache::decrement('key');
Cache::add('key', 'value', $seconds); // Добавить если не существует

// Блокировки
Cache::lock('foo')->get(function () {
    // Выполнить с блокировкой
});
```

### Дата и время

```php
// Carbon (уже включён в Laravel)
use Carbon\Carbon;

now();                               // Carbon::now()
today();                             // Carbon::today()

$date = now();
$date->format('Y-m-d H:i:s');
$date->toDateString();               // "2024-01-30"
$date->toDateTimeString();           // "2024-01-30 15:30:00"
$date->toTimeString();               // "15:30:00"
$date->addDays(5);
$date->subDays(5);
$date->addMonths(1);
$date->addYears(1);
$date->startOfDay();
$date->endOfDay();
$date->startOfMonth();
$date->endOfMonth();
$date->diffInDays($otherDate);
$date->diffForHumans();              // "5 days ago"
$date->isPast();
$date->isFuture();
$date->isToday();
$date->isYesterday();
$date->isTomorrow();
```

### Прочие

```php
// Session
session('key');
session('key', 'default');
session(['key' => 'value']);
session()->get('key');
session()->put('key', 'value');
session()->has('key');
session()->forget('key');
session()->flush();
session()->flash('status', 'Task completed!');

// Auth
auth()->user();
auth()->id();
auth()->check();
auth()->guest();
auth()->login($user);
auth()->logout();

// Encryption
encrypt('secret');
decrypt($encryptedValue);

// Hash
Hash::make('password');
Hash::check('password', $hashedPassword);
Hash::needsRehash($hashed);

// CSRF
csrf_token();
csrf_field();                        // <input type="hidden" name="_token">
method_field('PUT');                 // <input type="hidden" name="_method">

// Прочее
bcrypt('password');
now();
today();
optional($user)->name;               // Безопасный доступ
tap($user, function ($user) {
    $user->update(['active' => true]);
});
throw_if($invalidCondition, Exception::class);
throw_unless($validCondition, Exception::class);
value(function () { return 'result'; }); // Выполнить callable
with($user)->name;                   // То же что $user->name
```

---

## 📦 Blade директивы

```blade
{{-- Комментарий --}}

{{-- Вывод переменных --}}
{{ $name }}
{{ $name ?? 'Default' }}
{!! $html !!}                        {{-- Без экранирования --}}

{{-- Условия --}}
@if($condition)
    ...
@elseif($otherCondition)
    ...
@else
    ...
@endif

@unless($condition)
    ...
@endunless

@isset($variable)
    ...
@endisset

@empty($variable)
    ...
@endempty

@auth
    {{-- Пользователь авторизован --}}
@endauth

@guest
    {{-- Пользователь гость --}}
@endguest

@production
    {{-- Production окружение --}}
@endproduction

@env('local')
    {{-- Local окружение --}}
@endenv

{{-- Switch --}}
@switch($type)
    @case('admin')
        ...
        @break
    @case('user')
        ...
        @break
    @default
        ...
@endswitch

{{-- Циклы --}}
@for($i = 0; $i < 10; $i++)
    {{ $i }}
@endfor

@foreach($users as $user)
    {{ $user->name }}
@endforeach

@forelse($users as $user)
    {{ $user->name }}
@empty
    Нет пользователей
@endforelse

@while($condition)
    ...
@endwhile

{{-- $loop переменная в циклах --}}
$loop->index        {{-- Индекс с 0 --}}
$loop->iteration    {{-- Итерация с 1 --}}
$loop->remaining    {{-- Осталось итераций --}}
$loop->count        {{-- Всего элементов --}}
$loop->first        {{-- Первая итерация --}}
$loop->last         {{-- Последняя итерация --}}
$loop->even         {{-- Чётная итерация --}}
$loop->odd          {{-- Нечётная итерация --}}
$loop->depth        {{-- Глубина вложенности --}}
$loop->parent       {{-- Родительский $loop --}}

{{-- Подключение шаблонов --}}
@include('view.name')
@include('view.name', ['var' => $value])
@includeIf('view.name')
@includeWhen($condition, 'view.name')
@includeFirst(['custom.view', 'default.view'])

{{-- Layouts --}}
@extends('layouts.app')

@section('title', 'Page Title')

@section('content')
    ...
@endsection

@yield('content')
@yield('content', 'Default content')

@parent                             {{-- Вывести родительский контент --}}

{{-- Components --}}
<x-alert type="error" :message="$message" />

@props(['type', 'message'])

{{ $slot }}                         {{-- Основной слот --}}

<x-card>
    <x-slot:header>
        Header content
    </x-slot>
    Main content
</x-card>

{{-- Стеки --}}
@push('scripts')
    <script src="/example.js"></script>
@endpush

@stack('scripts')

@prepend('scripts')
    <script src="/first.js"></script>
@endprepend

{{-- Once --}}
@once
    <script>
        // Выполнится только один раз
    </script>
@endonce

{{-- PHP код --}}
@php
    $counter = 0;
@endphp

{{-- CSRF и методы --}}
@csrf                               {{-- <input type="hidden" name="_token"> --}}
@method('PUT')                      {{-- <input type="hidden" name="_method"> --}}

{{-- Прочее --}}
@json($array)                       {{-- JSON.stringify --}}
@error('email')
    <div>{{ $message }}</div>
@enderror

@can('update', $post)
    {{-- Проверка прав --}}
@endcan

@cannot('update', $post)
    ...
@endcannot

@canany(['update', 'delete'], $post)
    ...
@endcanany

@verbatim
    {{ Не обрабатывается Blade }}
@endverbatim
```

---

## 🎯 Полезные паттерны

### Repository Pattern

```php
// PostRepository.php
class PostRepository
{
    public function all()
    {
        return Post::all();
    }
    
    public function find($id)
    {
        return Post::findOrFail($id);
    }
    
    public function create(array $data)
    {
        return Post::create($data);
    }
}

// PostController.php
public function __construct(private PostRepository $repository)
{
}

public function index()
{
    return $this->repository->all();
}
```

### Service Pattern

```php
// UserService.php
class UserService
{
    public function register(array $data)
    {
        DB::transaction(function () use ($data) {
            $user = User::create($data);
            $user->profile()->create([...]);
            Mail::to($user)->send(new WelcomeEmail);
            return $user;
        });
    }
}

// RegisterController.php
public function store(Request $request, UserService $service)
{
    $user = $service->register($request->validated());
    return redirect()->route('home');
}
```

### Query Builder с Pipe

```php
$users = User::query()
    ->when($request->search, fn($q) => 
        $q->where('name', 'like', "%{$request->search}%")
    )
    ->when($request->status, fn($q) => 
        $q->where('status', $request->status)
    )
    ->paginate();
```

### Collection Pipeline

```php
$result = collect($users)
    ->filter(fn($user) => $user->isActive())
    ->map(fn($user) => [
        'name' => $user->name,
        'email' => $user->email,
    ])
    ->sortBy('name')
    ->values();
```

---

## 🔥 Быстрые команды для ежедневной работы

```bash
# Новый проект
composer create-project laravel/laravel my-app
cd my-app
cp .env.example .env
php artisan key:generate
php artisan migrate

# Создать CRUD за 30 секунд
php artisan make:model Post -mfsc
php artisan migrate

# Очистить всё
php artisan optimize:clear

# Запустить тесты
php artisan test --parallel

# Посмотреть routes
php artisan route:list
php artisan route:list --except-vendor

# Tinker для быстрых проверок
php artisan tinker
>>> User::count()
>>> User::factory()->create()

# Git workflow
git add .
git commit -m "Feature: Add user registration"
git push
```

---

**Совет:** Добавь эту шпаргалку в закладки и возвращайся к ней, когда забудешь синтаксис. Это нормально — даже опытные разработчики постоянно гуглят документацию! 🚀