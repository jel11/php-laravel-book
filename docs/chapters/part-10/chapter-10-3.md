# Глава 10.3: Очереди и Jobs — фоновые задачи, Redis, обработка email, ретраи

## Введение: Зачем нужны очереди?

Представьте: пользователь регистрируется на вашем сайте. Что должно произойти?

1. Сохранить данные в базу
2. Отправить приветственное письмо
3. Создать профиль в CRM
4. Отправить уведомление в Slack
5. Сгенерировать PDF-сертификат
6. Обновить статистику

Если делать всё это синхронно — пользователь будет ждать 5-10 секунд. А если email-сервер завис? Регистрация упадёт с ошибкой.

**Решение**: критичные операции выполняем сразу, остальное — отправляем в фоновую очередь.

```php
// Плохо: пользователь ждёт
User::create($data);
Mail::send(new WelcomeEmail($user));  // 2 секунды
CRM::createProfile($user);            // 3 секунды
Slack::notify($user);                 // 1 секунда
PDF::generate($user);                 // 4 секунды
// Итого: ~10 секунд ожидания

// Хорошо: мгновенный ответ
User::create($data);
dispatch(new SendWelcomeEmail($user));
dispatch(new CreateCRMProfile($user));
dispatch(new NotifySlack($user));
dispatch(new GenerateCertificate($user));
// Ответ пользователю: 200ms
// Остальное выполнится в фоне
```

---

## Как работают очереди

### Архитектура системы очередей

```
┌─────────────┐
│   Laravel   │
│ Application │
└──────┬──────┘
       │ dispatch(new Job)
       ↓
┌─────────────┐
│    Queue    │ ← хранилище задач (database/redis/sqs)
│   Driver    │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│    Worker   │ ← php artisan queue:work
│   Process   │   забирает задачи и выполняет
└─────────────┘
```

**Ключевые компоненты**:

1. **Job** — класс задачи (что делать)
2. **Queue** — хранилище задач (database, Redis, Beanstalkd, SQS)
3. **Worker** — процесс, который выполняет задачи
4. **Dispatcher** — отправляет задачи в очередь

---

## Настройка очередей

### 1. Конфигурация драйверов

`config/queue.php`:

```php
return [
    'default' => env('QUEUE_CONNECTION', 'sync'),
    
    'connections' => [
        'sync' => [
            'driver' => 'sync', // Выполняется сразу (для разработки)
        ],
        
        'database' => [
            'driver' => 'database',
            'table' => 'jobs',
            'queue' => 'default',
            'retry_after' => 90,
        ],
        
        'redis' => [
            'driver' => 'redis',
            'connection' => 'default',
            'queue' => env('REDIS_QUEUE', 'default'),
            'retry_after' => 90,
            'block_for' => null,
        ],
        
        'sqs' => [
            'driver' => 'sqs',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'prefix' => env('SQS_PREFIX'),
            'queue' => env('SQS_QUEUE', 'default'),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
        ],
    ],
];
```

### 2. Миграция для database-драйвера

```bash
php artisan queue:table
php artisan migrate
```

Создастся таблица `jobs`:

```sql
CREATE TABLE jobs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    queue VARCHAR(255) NOT NULL,
    payload LONGTEXT NOT NULL,    -- сериализованная задача
    attempts TINYINT UNSIGNED,
    reserved_at INT UNSIGNED,     -- когда задачу взял worker
    available_at INT UNSIGNED,    -- когда можно выполнять
    created_at INT UNSIGNED
);
```

### 3. Установка Redis (рекомендуется для production)

```bash
# Ubuntu/Debian
sudo apt install redis-server

# macOS
brew install redis

# Запуск
redis-server
```

`composer.json`:
```bash
composer require predis/predis
```

`.env`:
```env
QUEUE_CONNECTION=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

---

## Создание Job-классов

### Генерация Job

```bash
php artisan make:job SendWelcomeEmail
```

Создаётся `app/Jobs/SendWelcomeEmail.php`:

```php
namespace App\Jobs;

use App\Models\User;
use App\Mail\WelcomeEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendWelcomeEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    /**
     * @var User
     */
    public $user;
    
    /**
     * Количество попыток выполнения
     */
    public $tries = 3;
    
    /**
     * Таймаут выполнения (секунды)
     */
    public $timeout = 120;
    
    /**
     * Create a new job instance.
     */
    public function __construct(User $user)
    {
        $this->user = $user;
    }
    
    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Mail::to($this->user->email)->send(new WelcomeEmail($this->user));
    }
    
    /**
     * Что делать если задача упала
     */
    public function failed(\Throwable $exception): void
    {
        // Логируем ошибку
        \Log::error('Failed to send welcome email', [
            'user_id' => $this->user->id,
            'error' => $exception->getMessage(),
        ]);
        
        // Уведомляем администратора
        // Mail::to('admin@example.com')->send(...);
    }
}
```

### Разбор трейтов

1. **Dispatchable** — позволяет `dispatch(new Job)`
2. **InteractsWithQueue** — методы для работы с очередью (`$this->release()`, `$this->delete()`)
3. **Queueable** — настройки очереди (`onQueue()`, `delay()`)
4. **SerializesModels** — автоматически сериализует Eloquent-модели

---

## Отправка задач в очередь

### 1. Базовая отправка

```php
use App\Jobs\SendWelcomeEmail;

// Самый простой способ
SendWelcomeEmail::dispatch($user);

// Или через глобальный хелпер
dispatch(new SendWelcomeEmail($user));
```

### 2. Отложенное выполнение

```php
// Выполнить через 10 минут
SendWelcomeEmail::dispatch($user)
    ->delay(now()->addMinutes(10));

// Выполнить в конкретное время
SendWelcomeEmail::dispatch($user)
    ->delay(now()->addHours(2));
```

### 3. Выбор очереди

```php
// Разные приоритеты
SendWelcomeEmail::dispatch($user)
    ->onQueue('emails');

ProcessPayment::dispatch($order)
    ->onQueue('payments'); // высокий приоритет

GenerateReport::dispatch()
    ->onQueue('reports');  // низкий приоритет
```

### 4. Условная отправка

```php
SendWelcomeEmail::dispatchIf($user->wants_emails, $user);

SendWelcomeEmail::dispatchUnless($user->unsubscribed, $user);
```

### 5. Цепочки задач

```php
use Illuminate\Support\Facades\Bus;

Bus::chain([
    new ProcessOrder($order),
    new SendInvoice($order),
    new NotifyCustomer($order),
])->dispatch();

// Если одна упадёт — остальные не выполнятся
```

### 6. Пакетная обработка

```php
use Illuminate\Bus\Batch;
use Illuminate\Support\Facades\Bus;

$batch = Bus::batch([
    new ImportCsvRow($row1),
    new ImportCsvRow($row2),
    new ImportCsvRow($row3),
])->then(function (Batch $batch) {
    // Все задачи выполнены
})->catch(function (Batch $batch, \Throwable $e) {
    // Одна из задач упала
})->finally(function (Batch $batch) {
    // Всегда выполняется
})->dispatch();

// Проверить прогресс
$batch->progress(); // 66 (процентов)
```

---

## Запуск Worker-процесса

### Основные команды

```bash
# Запустить worker (слушает очередь default)
php artisan queue:work

# Указать конкретную очередь
php artisan queue:work --queue=emails

# Несколько очередей (по приоритету)
php artisan queue:work --queue=payments,emails,default

# Только одна задача (для тестирования)
php artisan queue:work --once

# Остановить после текущей задачи
php artisan queue:work --stop-when-empty

# С таймаутом
php artisan queue:work --timeout=60
```

### Важные опции

```bash
# Количество попыток
php artisan queue:work --tries=3

# Задержка между попытками
php artisan queue:work --backoff=3,5,10

# Задержка при пустой очереди
php artisan queue:work --sleep=3

# Перезагружать worker при изменении кода
php artisan queue:work --max-jobs=1000 --max-time=3600
```

### Graceful Shutdown

```bash
# Отправить сигнал worker'у для остановки
php artisan queue:restart
```

Worker завершит текущую задачу и остановится.

---

## Обработка ошибок и ретраи

### 1. Настройка попыток в Job

```php
class ProcessPayment implements ShouldQueue
{
    public $tries = 5; // Попыток
    public $backoff = [10, 30, 60, 120]; // Задержки в секундах
    
    public function handle()
    {
        // Текущая попытка
        $attempt = $this->attempts();
        
        if ($attempt > 3) {
            \Log::warning("Payment processing attempt #{$attempt}");
        }
        
        // Логика
    }
}
```

### 2. Условное освобождение задачи

```php
public function handle()
{
    try {
        $this->processPayment();
    } catch (TemporaryException $e) {
        // Вернуть в очередь через 30 секунд
        $this->release(30);
    } catch (PermanentException $e) {
        // Удалить из очереди (не пытаться снова)
        $this->delete();
    }
}
```

### 3. Обработка неудач

```php
public function failed(\Throwable $exception)
{
    // Откатить транзакцию
    DB::rollBack();
    
    // Уведомить администратора
    Mail::to('admin@example.com')->send(
        new JobFailedNotification($this, $exception)
    );
    
    // Сохранить в лог
    \Log::error('Payment processing failed', [
        'job' => get_class($this),
        'order_id' => $this->order->id,
        'error' => $exception->getMessage(),
        'trace' => $exception->getTraceAsString(),
    ]);
}
```

### 4. Таблица неудачных задач

```bash
php artisan queue:failed-table
php artisan migrate
```

Создаётся таблица `failed_jobs`:

```sql
CREATE TABLE failed_jobs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(255) UNIQUE,
    connection TEXT,
    queue TEXT,
    payload LONGTEXT,
    exception LONGTEXT,
    failed_at TIMESTAMP
);
```

### Управление неудачными задачами

```bash
# Посмотреть список
php artisan queue:failed

# Повторить конкретную
php artisan queue:retry 5

# Повторить все
php artisan queue:retry all

# Удалить неудачную задачу
php artisan queue:forget 5

# Очистить все неудачные
php artisan queue:flush
```

---

## Практический пример: Email-рассылка

### 1. Job для отправки письма

```php
namespace App\Jobs;

use App\Models\User;
use App\Mail\NewsletterEmail;
use Illuminate\Support\Facades\Mail;

class SendNewsletterEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    public $tries = 3;
    public $backoff = [60, 180, 600]; // 1 мин, 3 мин, 10 мин
    public $timeout = 120;
    
    public function __construct(
        public User $user,
        public string $subject,
        public string $content
    ) {}
    
    public function handle(): void
    {
        // Проверка перед отправкой
        if (!$this->user->subscribed) {
            $this->delete(); // Не пытаться снова
            return;
        }
        
        Mail::to($this->user->email)->send(
            new NewsletterEmail($this->subject, $this->content)
        );
        
        // Обновить статистику
        $this->user->increment('newsletters_sent');
    }
    
    public function failed(\Throwable $exception): void
    {
        // Пометить пользователя как недоступного
        $this->user->update(['email_bounced' => true]);
        
        \Log::error('Newsletter failed', [
            'user_id' => $this->user->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
```

### 2. Отправка рассылки

```php
namespace App\Http\Controllers;

use App\Models\User;
use App\Jobs\SendNewsletterEmail;
use Illuminate\Support\Facades\Bus;

class NewsletterController extends Controller
{
    public function send(Request $request)
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'content' => 'required|string',
        ]);
        
        $users = User::where('subscribed', true)
            ->where('email_bounced', false)
            ->get();
        
        // Создаём батч задач
        $jobs = $users->map(function ($user) use ($validated) {
            return new SendNewsletterEmail(
                $user,
                $validated['subject'],
                $validated['content']
            );
        });
        
        $batch = Bus::batch($jobs)
            ->then(function (Batch $batch) {
                \Log::info("Newsletter sent to {$batch->totalJobs} users");
            })
            ->catch(function (Batch $batch, \Throwable $e) {
                \Log::error('Newsletter batch failed', [
                    'error' => $e->getMessage()
                ]);
            })
            ->dispatch();
        
        return response()->json([
            'message' => 'Newsletter queued',
            'batch_id' => $batch->id,
            'total_recipients' => $users->count(),
        ]);
    }
    
    public function batchStatus($batchId)
    {
        $batch = Bus::findBatch($batchId);
        
        return response()->json([
            'progress' => $batch->progress(),
            'total_jobs' => $batch->totalJobs,
            'pending_jobs' => $batch->pendingJobs,
            'failed_jobs' => $batch->failedJobs,
            'finished' => $batch->finished(),
        ]);
    }
}
```

---

## Rate Limiting (ограничение скорости)

### 1. Базовое ограничение

```php
use Illuminate\Support\Facades\RateLimiter;

class SendEmailJob implements ShouldQueue
{
    public function handle()
    {
        RateLimiter::attempt(
            'send-email:' . $this->user->id,
            $perMinute = 5,
            function () {
                Mail::to($this->user)->send(new SomeEmail());
            },
            $decaySeconds = 60
        );
    }
}
```

### 2. Middleware для Job

```php
use Illuminate\Queue\Middleware\RateLimited;

class SendEmailJob implements ShouldQueue
{
    public function middleware()
    {
        return [
            new RateLimited('emails'), // 5 задач в минуту
        ];
    }
}
```

Конфигурация в `RouteServiceProvider`:

```php
RateLimiter::for('emails', function (object $job) {
    return Limit::perMinute(100); // 100 писем в минуту
});
```

### 3. Throttling по внешнему API

```php
use Illuminate\Queue\Middleware\ThrottlesExceptions;

public function middleware()
{
    return [
        (new ThrottlesExceptions(10, 5)) // 10 ошибок за 5 минут
            ->backoff(5),                 // потом пауза 5 минут
    ];
}
```

---

## Мониторинг очередей

### 1. Laravel Horizon (для Redis)

```bash
composer require laravel/horizon
php artisan horizon:install
php artisan migrate
```

`config/horizon.php`:
```php
'environments' => [
    'production' => [
        'supervisor-1' => [
            'connection' => 'redis',
            'queue' => ['default', 'emails'],
            'balance' => 'auto',
            'processes' => 10,
            'tries' => 3,
        ],
    ],
],
```

Запуск:
```bash
php artisan horizon
```

Dashboard: `http://localhost/horizon`

### 2. Команды для мониторинга

```bash
# Статистика задач
php artisan queue:monitor redis:default,redis:emails --max=100

# Очистить очередь
php artisan queue:clear redis

# Очистить конкретную очередь
php artisan queue:clear redis --queue=emails

# Посмотреть задачи в БД
php artisan queue:work --once --verbose
```

### 3. События очередей

```php
use Illuminate\Support\Facades\Queue;

Queue::before(function (JobProcessing $event) {
    \Log::info('Job starting', ['job' => $event->job->resolveName()]);
});

Queue::after(function (JobProcessed $event) {
    \Log::info('Job finished', ['job' => $event->job->resolveName()]);
});

Queue::failing(function (JobFailed $event) {
    \Log::error('Job failed', [
        'job' => $event->job->resolveName(),
        'error' => $event->exception->getMessage(),
    ]);
});
```

---

## Production: Supervisor

Worker должен всегда работать в production. Используем **Supervisor**.

### Установка

```bash
sudo apt install supervisor
```

### Конфигурация

`/etc/supervisor/conf.d/laravel-worker.conf`:

```ini
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/html/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=8
redirect_stderr=true
stdout_logfile=/var/www/html/storage/logs/worker.log
stopwaitsecs=3600
```

### Управление

```bash
# Перечитать конфигурацию
sudo supervisorctl reread
sudo supervisorctl update

# Запустить workers
sudo supervisorctl start laravel-worker:*

# Остановить
sudo supervisorctl stop laravel-worker:*

# Перезапустить (после деплоя)
php artisan queue:restart
sudo supervisorctl restart laravel-worker:*
```

---

## Оптимизация производительности

### 1. Используйте Redis

Database-драйвер медленный из-за блокировок таблицы.

```env
QUEUE_CONNECTION=redis
```

### 2. Несколько workers

```bash
# 4 процесса
php artisan queue:work --queue=default --sleep=3 &
php artisan queue:work --queue=default --sleep=3 &
php artisan queue:work --queue=default --sleep=3 &
php artisan queue:work --queue=default --sleep=3 &
```

Или через Supervisor (`numprocs=8`).

### 3. Приоритизация очередей

```bash
# Сначала payments, потом emails, потом default
php artisan queue:work --queue=payments,emails,default
```

### 4. Chunk большие задачи

```php
// Плохо: одна задача на 10 000 пользователей
dispatch(new SendNewsletterToAll());

// Хорошо: 100 задач по 100 пользователей
User::chunk(100, function ($users) {
    dispatch(new SendNewsletterChunk($users));
});
```

### 5. Lazy Collections

```php
use App\Models\User;

User::cursor()->each(function ($user) {
    dispatch(new ProcessUser($user));
});
```

---

## Безопасность

### 1. Никогда не передавайте пароли в Job

```php
// ПЛОХО
class SendEmail implements ShouldQueue
{
    public function __construct(
        public string $password // Сериализуется в БД!
    ) {}
}

// ХОРОШО
class SendEmail implements ShouldQueue
{
    public function __construct(
        public int $userId
    ) {}
    
    public function handle()
    {
        $user = User::find($this->userId);
        // Работаем с $user
    }
}
```

### 2. Шифрование Job (если передаёте чувствительные данные)

```php
use Illuminate\Contracts\Queue\ShouldBeEncrypted;

class ProcessPayment implements ShouldQueue, ShouldBeEncrypted
{
    public function __construct(
        public string $creditCardNumber
    ) {}
}
```

### 3. Аутентификация перед выполнением

```php
public function handle()
{
    if (!$this->user->exists) {
        $this->delete();
        return;
    }
    
    // Продолжаем
}
```

---

## Практические задачи

### Задача 1: Импорт CSV

Создайте систему импорта CSV-файла с пользователями:

1. Job `ImportCsv` читает файл и создаёт задачи `ImportUserRow` для каждой строки
2. `ImportUserRow` создаёт пользователя (или обновляет, если email существует)
3. После завершения батча отправьте email администратору со статистикой

**Подсказки**:
- Используйте `Bus::batch()`
- Обрабатывайте ошибки (невалидные строки)
- Логируйте прогресс

### Задача 2: Напоминания о корзине

Создайте Job, который отправляет email пользователям, у которых в корзине есть товары более 24 часов:

1. Найдите все активные корзины старше 24 часов
2. Для каждой отправьте `SendAbandonedCartEmail`
3. После 3 дней удалите корзину через `DeleteAbandonedCart`

**Подсказки**:
- Используйте `delay()` для отложенных задач
- Проверяйте, не купил ли пользователь товар уже

### Задача 3: Обработка изображений

Загрузка фото профиля должна:

1. Сохранить оригинал
2. Job `ProcessAvatar`: создать 3 размера (thumbnail, medium, large)
3. Оптимизировать с помощью `spatie/image-optimizer`
4. Обновить модель пользователя

**Подсказки**:
- Используйте цепочки задач
- Если оптимизация упала — оставьте неоптимизированные версии

---

## Проверь себя

1. **В чём разница между `dispatch()` и `dispatchSync()`?**
   
2. **Что произойдёт, если Job упадёт 3 раза?**
   
3. **Зачем нужен `SerializesModels` трейт?**
   
4. **Как отправить задачу в конкретную очередь?**
   
5. **Как ограничить количество писем до 100 в минуту?**

6. **Что такое `queue:restart` и когда его использовать?**

7. **Как обработать ситуацию, когда внешний API временно недоступен?**

8. **В чём разница между `tries` и `backoff`?**

---

## Частые ошибки

### ❌ Worker не запущен

```php
dispatch(new SendEmail($user));
// Ничего не происходит
```

**Решение**: проверьте `php artisan queue:work` запущен.

### ❌ Serialization Error

```php
class SendEmail implements ShouldQueue
{
    public function __construct(
        public $pdfResource // Невозможно сериализовать
    ) {}
}
```

**Решение**: передавайте только ID, пути к файлам, скаляры.

### ❌ Memory Leak

```php
// Worker работает бесконечно и съедает всю память
php artisan queue:work
```

**Решение**:
```bash
php artisan queue:work --max-jobs=1000 --max-time=3600
```

### ❌ Забыли `implements ShouldQueue`

```php
class SendEmail // Нет ShouldQueue
{
    use Dispatchable, Queueable;
}

dispatch(new SendEmail($user)); // Выполнится синхронно!
```

---

## Чеклист перед production

- [ ] Установлен Redis
- [ ] Настроен Supervisor для workers
- [ ] Включен `php artisan queue:restart` в деплой-скрипт
- [ ] Настроен мониторинг (Horizon / CloudWatch)
- [ ] Добавлены логи для `failed()`
- [ ] Настроены уведомления о неудачных задачах
- [ ] Проверено, что чувствительные данные не попадают в очередь
- [ ] Добавлены тесты для критичных Jobs

---

## Резюме

| Что | Как |
|-----|-----|
| Создать Job | `php artisan make:job SendEmail` |
| Отправить в очередь | `dispatch(new SendEmail($user))` |
| Отложить | `->delay(now()->addMinutes(10))` |
| Выбрать очередь | `->onQueue('emails')` |
| Запустить worker | `php artisan queue:work` |
| Повторить неудачную | `php artisan queue:retry all` |
| Мониторинг | Laravel Horizon |

**Золотое правило**: всё, что может подождать — должно быть в очереди.

**Следующая глава**: Events и Listeners — событийная архитектура, полное разделение логики.