# Глава 10.5: Task Scheduling — cron через Laravel, автоматизация задач

## Введение

Представь: каждую ночь в 2:00 нужно очищать старые сессии, каждый понедельник — отправлять email-рассылку, каждые 5 минут — проверять статус заказов. Раньше для этого настраивали cron-задачи на сервере, и это было больно: нужно помнить синтаксис crontab, редактировать файлы на сервере, отлаживать через логи.

Laravel решает эту проблему элегантно: **весь schedule описывается в коде**, в одном файле. Один раз настроил cron на сервере, а дальше все задачи планируешь через PHP.

---

## Как работает Task Scheduling

### Архитектура

```
┌─────────────────┐
│  Cron (сервер)  │  ← Один раз настроили
│  * * * * *      │
└────────┬────────┘
         │ Каждую минуту запускает
         ▼
┌─────────────────────────────┐
│  php artisan schedule:run   │
└────────┬────────────────────┘
         │ Проверяет что запускать
         ▼
┌──────────────────────────────┐
│  app/Console/Kernel.php      │
│  - Очистка логов: 1:00       │
│  - Email рассылка: Monday    │
│  - Бэкап БД: daily           │
└──────────────────────────────┘
```

**Ключевая идея**: cron запускает Laravel каждую минуту, а Laravel сам решает, какие задачи выполнять прямо сейчас.

---

## Настройка на сервере (один раз)

### 1. Открой crontab

```bash
crontab -e
```

### 2. Добавь одну строчку

```cron
* * * * * cd /path/to/your/project && php artisan schedule:run >> /dev/null 2>&1
```

**Разбор**:
- `* * * * *` — каждую минуту
- `cd /path/to/your/project` — переходим в директорию проекта
- `php artisan schedule:run` — запускаем команду Laravel
- `>> /dev/null 2>&1` — не сохраняем вывод (опционально)

**Важно**: Путь к проекту должен быть абсолютным!

```bash
# Узнать текущий путь
pwd
# Вывод: /var/www/messenger
```

Тогда строка в crontab:
```cron
* * * * * cd /var/www/messenger && php artisan schedule:run >> /dev/null 2>&1
```

---

## Планирование задач

### Основной файл: `app/Console/Kernel.php`

```php
<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected function schedule(Schedule $schedule): void
    {
        // Здесь планируем все задачи
    }
}
```

---

## Типы задач

### 1. Запуск Artisan-команд

```php
protected function schedule(Schedule $schedule): void
{
    // Очистка старых сессий каждый час
    $schedule->command('session:clear')->hourly();
    
    // Очистка кэша каждый день в 1:00
    $schedule->command('cache:clear')->dailyAt('01:00');
    
    // Бэкап БД каждый день в 2:00
    $schedule->command('backup:run')->dailyAt('02:00');
}
```

### 2. Запуск Closure (анонимной функции)

```php
protected function schedule(Schedule $schedule): void
{
    $schedule->call(function () {
        // Удаляем старые уведомления
        DB::table('notifications')
            ->where('created_at', '<', now()->subDays(30))
            ->delete();
    })->daily();
}
```

### 3. Запуск shell-команд

```php
protected function schedule(Schedule $schedule): void
{
    // Бэкап БД через mysqldump
    $schedule->exec('mysqldump -u root messenger > backup.sql')
             ->daily();
}
```

### 4. Запуск Jobs

```php
protected function schedule(Schedule $schedule): void
{
    $schedule->job(new SendWeeklyReport)->weekly();
}
```

---

## Частота выполнения

### Готовые методы (самые популярные)

```php
->everyMinute();           // Каждую минуту
->everyFiveMinutes();      // Каждые 5 минут
->everyTenMinutes();       // Каждые 10 минут
->everyFifteenMinutes();   // Каждые 15 минут
->everyThirtyMinutes();    // Каждые 30 минут
->hourly();                // Каждый час
->hourlyAt(17);            // Каждый час в 17 минут (13:17, 14:17...)
->daily();                 // Каждый день в 00:00
->dailyAt('13:00');        // Каждый день в 13:00
->twiceDaily(1, 13);       // Дважды в день (1:00 и 13:00)
->weekly();                // Каждую неделю в воскресенье 00:00
->weeklyOn(1, '8:00');     // Каждый понедельник в 8:00
->monthly();               // Первое число месяца в 00:00
->monthlyOn(4, '15:30');   // 4-го числа каждого месяца в 15:30
->quarterly();             // Первый день квартала
->yearly();                // 1 января в 00:00
->yearlyOn(6, 1, '17:00'); // 1 июня каждый год в 17:00
```

### Кастомный cron-синтаксис

```php
// Каждые 10 минут с понедельника по пятницу
$schedule->command('report:generate')
         ->cron('*/10 * * * 1-5');
```

**Формат cron**: `минута час день месяц день_недели`

```
┌─── минута (0-59)
│ ┌─── час (0-23)
│ │ ┌─── день месяца (1-31)
│ │ │ ┌─── месяц (1-12)
│ │ │ │ ┌─── день недели (0-7, 0 и 7 = воскресенье)
│ │ │ │ │
* * * * *
```

Примеры:
```php
->cron('0 */6 * * *');     // Каждые 6 часов
->cron('30 2 * * *');      // В 2:30 каждый день
->cron('0 9 * * 1');       // Каждый понедельник в 9:00
->cron('0 0 1 * *');       // 1-го числа каждого месяца
```

---

## Условия выполнения

### when() — выполнять только если

```php
$schedule->command('email:send')
         ->daily()
         ->when(function () {
             // Отправляем только если есть неотправленные письма
             return DB::table('pending_emails')->exists();
         });
```

### skip() — пропустить если

```php
$schedule->command('backup:run')
         ->daily()
         ->skip(function () {
             // Не делаем бэкап в выходные
             return now()->isWeekend();
         });
```

### Встроенные условия

```php
// Только в production
$schedule->command('backup:run')
         ->daily()
         ->environments(['production']);

// Только по будням
$schedule->command('report:generate')
         ->weekdays()  // понедельник-пятница
         ->at('09:00');

// Только в выходные
$schedule->command('maintenance:cleanup')
         ->weekends()  // суббота-воскресенье
         ->at('03:00');

// Только в определённой timezone
$schedule->command('email:send')
         ->dailyAt('09:00')
         ->timezone('Europe/Moscow');
```

---

## Overlap Prevention (предотвращение наложения)

### Проблема

```php
// Задача выполняется 10 минут
$schedule->command('long:task')->everyFiveMinutes();

// График:
// 10:00 - запуск 1 (работает до 10:10)
// 10:05 - запуск 2 (НЕ ДОЛЖЕН НАЧАТЬСЯ!)
```

### Решение: withoutOverlapping()

```php
$schedule->command('long:task')
         ->everyFiveMinutes()
         ->withoutOverlapping();
```

**Как работает**: Laravel создаёт lock-файл при запуске. Если файл существует — задача пропускается.

### Настройка времени блокировки

```php
$schedule->command('long:task')
         ->everyFiveMinutes()
         ->withoutOverlapping(10);  // Разблокировать через 10 минут
```

---

## Running Tasks on One Server (запуск на одном сервере)

### Проблема при масштабировании

```
Server 1: schedule:run → отправляет email
Server 2: schedule:run → отправляет email снова!
```

### Решение: onOneServer()

```php
$schedule->command('email:send')
         ->daily()
         ->onOneServer();
```

**Требование**: нужен общий cache driver (Redis, Memcached, Database).

```php
// config/cache.php
'default' => env('CACHE_DRIVER', 'redis'),
```

---

## Обработка выводов и ошибок

### Сохранение output в файл

```php
$schedule->command('backup:run')
         ->daily()
         ->sendOutputTo('/path/to/backup.log');
```

### Добавление к существующему файлу

```php
$schedule->command('report:generate')
         ->hourly()
         ->appendOutputTo('/path/to/reports.log');
```

### Email при ошибке

```php
$schedule->command('critical:task')
         ->daily()
         ->emailOutputOnFailure('[email protected]');
```

### Ping URL после выполнения (мониторинг)

```php
$schedule->command('backup:run')
         ->daily()
         ->pingBefore('https://monitor.io/start/backup')
         ->thenPing('https://monitor.io/finish/backup')
         ->pingOnSuccess('https://monitor.io/success/backup')
         ->pingOnFailure('https://monitor.io/fail/backup');
```

### Выполнение кода до/после

```php
$schedule->command('email:send')
         ->daily()
         ->before(function () {
             Log::info('Starting email send...');
         })
         ->after(function () {
             Log::info('Email send completed!');
         })
         ->onSuccess(function () {
             Notification::send('Emails sent successfully');
         })
         ->onFailure(function () {
             Notification::send('Email sending failed!');
         });
```

---

## Практический пример: Система автоматизации

### Задача

Создать messenger с такими автоматическими задачами:
1. Очистка старых сообщений (старше 90 дней) — каждый день в 2:00
2. Отправка дайджеста непрочитанных сообщений — каждое утро в 9:00
3. Обновление статистики активности — каждый час
4. Архивация чатов — каждое воскресенье в 3:00
5. Проверка неактивных пользователей — каждую неделю

### app/Console/Kernel.php

```php
<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;
use Illuminate\Support\Facades\DB;

class Kernel extends ConsoleKernel
{
    protected function schedule(Schedule $schedule): void
    {
        // 1. Очистка старых сообщений
        $schedule->command('messages:cleanup')
                 ->dailyAt('02:00')
                 ->withoutOverlapping()
                 ->onOneServer()
                 ->emailOutputOnFailure('[email protected]');

        // 2. Утренний дайджест непрочитанных
        $schedule->command('digest:send')
                 ->dailyAt('09:00')
                 ->timezone('Europe/Moscow')
                 ->onOneServer()
                 ->when(function () {
                     // Только если есть непрочитанные
                     return DB::table('messages')
                         ->where('is_read', false)
                         ->where('created_at', '>', now()->subDay())
                         ->exists();
                 });

        // 3. Обновление статистики
        $schedule->call(function () {
            $stats = DB::table('messages')
                ->selectRaw('
                    COUNT(*) as total,
                    COUNT(CASE WHEN is_read = 1 THEN 1 END) as read,
                    DATE(created_at) as date
                ')
                ->where('created_at', '>', now()->subHour())
                ->groupBy('date')
                ->first();

            DB::table('statistics')->updateOrInsert(
                ['date' => now()->format('Y-m-d'), 'hour' => now()->hour],
                ['messages_count' => $stats->total ?? 0]
            );
        })->hourly();

        // 4. Архивация старых чатов
        $schedule->command('chats:archive')
                 ->weeklyOn(0, '03:00')  // Воскресенье 3:00
                 ->withoutOverlapping(60);

        // 5. Проверка неактивных пользователей
        $schedule->command('users:check-inactive')
                 ->weekly()
                 ->mondays()
                 ->at('10:00')
                 ->sendOutputTo(storage_path('logs/inactive-users.log'));
    }
}
```

### Создание Artisan-команды: messages:cleanup

```bash
php artisan make:command CleanupOldMessages
```

**app/Console/Commands/CleanupOldMessages.php**:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanupOldMessages extends Command
{
    protected $signature = 'messages:cleanup';
    protected $description = 'Delete messages older than 90 days';

    public function handle()
    {
        $this->info('Starting cleanup...');

        $deleted = DB::table('messages')
            ->where('created_at', '<', now()->subDays(90))
            ->delete();

        $this->info("Deleted {$deleted} old messages");
        
        return Command::SUCCESS;
    }
}
```

### Создание команды: digest:send

```bash
php artisan make:command SendDailyDigest
```

**app/Console/Commands/SendDailyDigest.php**:

```php
<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\UnreadMessagesDigest;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SendDailyDigest extends Command
{
    protected $signature = 'digest:send';
    protected $description = 'Send daily digest of unread messages';

    public function handle()
    {
        $users = User::whereHas('receivedMessages', function ($query) {
            $query->where('is_read', false)
                  ->where('created_at', '>', now()->subDay());
        })->get();

        $count = 0;
        
        foreach ($users as $user) {
            $unreadCount = $user->receivedMessages()
                ->where('is_read', false)
                ->where('created_at', '>', now()->subDay())
                ->count();

            if ($unreadCount > 0) {
                $user->notify(new UnreadMessagesDigest($unreadCount));
                $count++;
            }
        }

        $this->info("Sent digest to {$count} users");
        
        return Command::SUCCESS;
    }
}
```

---

## Тестирование scheduled tasks

### Локальное тестирование

```bash
# Запустить schedule вручную
php artisan schedule:run

# Посмотреть какие задачи запланированы
php artisan schedule:list

# Симуляция запуска (dry run)
php artisan schedule:test
```

### Вывод schedule:list

```
┌─────────────────────────────────┬────────────────┬────────────────────┐
│ Command                          │ Interval       │ Next Run           │
├─────────────────────────────────┼────────────────┼────────────────────┤
│ messages:cleanup                 │ 0 2 * * *      │ 2024-02-01 02:00   │
│ digest:send                      │ 0 9 * * *      │ 2024-01-31 09:00   │
│ Closure at Kernel.php:25         │ 0 * * * *      │ 2024-01-31 08:00   │
└─────────────────────────────────┴────────────────┴────────────────────┘
```

### Feature-тест

```php
<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class ScheduleTest extends TestCase
{
    public function test_messages_cleanup_deletes_old_messages()
    {
        // Создаём старое сообщение
        Message::factory()->create([
            'created_at' => now()->subDays(100)
        ]);

        // Создаём новое
        $newMessage = Message::factory()->create([
            'created_at' => now()->subDays(10)
        ]);

        // Запускаем команду
        Artisan::call('messages:cleanup');

        // Проверяем
        $this->assertDatabaseMissing('messages', [
            'created_at' => now()->subDays(100)
        ]);

        $this->assertDatabaseHas('messages', [
            'id' => $newMessage->id
        ]);
    }
}
```

---

## Мониторинг scheduled tasks

### 1. Laravel Horizon (для Redis)

Если используешь очереди:

```bash
composer require laravel/horizon
php artisan horizon:install
```

Horizon показывает статус всех задач и джоб.

### 2. Внешние сервисы

**OhDear.app** (платный):
```php
$schedule->command('backup:run')
         ->daily()
         ->pingBefore('https://ping.ohdear.app/start/your-id')
         ->thenPing('https://ping.ohdear.app/your-id');
```

**Healthchecks.io** (бесплатный):
```php
$schedule->command('critical:task')
         ->hourly()
         ->thenPing('https://hc-ping.com/your-uuid');
```

Если ping не приходит вовремя — сервис отправит alert.

### 3. Логирование

```php
$schedule->command('important:task')
         ->daily()
         ->before(function () {
             Log::channel('schedule')->info('Task started', [
                 'task' => 'important:task',
                 'time' => now()
             ]);
         })
         ->after(function () {
             Log::channel('schedule')->info('Task finished', [
                 'task' => 'important:task',
                 'time' => now()
             ]);
         });
```

---

## Частые ошибки

### ❌ Ошибка 1: Забыл настроить cron

```php
// Код есть
$schedule->command('email:send')->daily();

// Но cron не настроен!
```

**Решение**: добавить в crontab:
```cron
* * * * * cd /path/to/project && php artisan schedule:run
```

### ❌ Ошибка 2: Путь к проекту неправильный

```cron
* * * * * cd ~/messenger && php artisan schedule:run
# ❌ ~ не работает в cron!
```

**Решение**: использовать абсолютный путь:
```cron
* * * * * cd /var/www/messenger && php artisan schedule:run
```

### ❌ Ошибка 3: Задачи накладываются

```php
// Задача выполняется 20 минут
$schedule->command('heavy:task')->everyFifteenMinutes();
// Запуски: 10:00, 10:15 (накладывается!), 10:30...
```

**Решение**:
```php
$schedule->command('heavy:task')
         ->everyFifteenMinutes()
         ->withoutOverlapping();
```

### ❌ Ошибка 4: Timezone игнорируется

```php
$schedule->command('email:send')
         ->dailyAt('09:00');  // 9:00 в какой timezone?
```

**Решение**:
```php
$schedule->command('email:send')
         ->dailyAt('09:00')
         ->timezone('Europe/Moscow');
```

Или настроить глобально в `config/app.php`:
```php
'timezone' => 'Europe/Moscow',
```

### ❌ Ошибка 5: На нескольких серверах дублируется

```php
// Server 1: отправил email
// Server 2: отправил email снова!
$schedule->command('email:send')->daily();
```

**Решение**:
```php
$schedule->command('email:send')
         ->daily()
         ->onOneServer();  // + настроить Redis/Memcached
```

---

## Продвинутые техники

### 1. Динамическое планирование

```php
protected function schedule(Schedule $schedule): void
{
    // Получаем задачи из БД
    $tasks = DB::table('scheduled_tasks')->where('active', true)->get();

    foreach ($tasks as $task) {
        $schedule->command($task->command)
                 ->cron($task->cron_expression)
                 ->when(function () use ($task) {
                     return $task->should_run;
                 });
    }
}
```

### 2. Maintenance Mode Check

```php
$schedule->command('backup:run')
         ->daily()
         ->when(function () {
             // Не запускать в режиме обслуживания
             return !app()->isDownForMaintenance();
         });
```

### 3. Multi-Tenant планирование

```php
protected function schedule(Schedule $schedule): void
{
    $tenants = Tenant::all();

    foreach ($tenants as $tenant) {
        $schedule->call(function () use ($tenant) {
            $tenant->activate();
            
            // Выполняем задачу для этого tenant
            // ...
        })->daily();
    }
}
```

### 4. Rate Limiting

```php
use Illuminate\Support\Facades\RateLimiter;

$schedule->call(function () {
    if (RateLimiter::attempt('api-calls', 100, function() {
        // Делаем API-запрос
    })) {
        Log::info('API called successfully');
    } else {
        Log::warning('Rate limit exceeded');
    }
})->everyMinute();
```

---

## Сравнение с обычным cron

| Критерий | Обычный Cron | Laravel Schedule |
|----------|-------------|------------------|
| **Синтаксис** | `30 2 * * *` (сложно) | `->dailyAt('02:30')` (понятно) |
| **Версионирование** | Нет (файлы на сервере) | Да (в Git) |
| **Условия** | Сложно | `->when()`, `->skip()` |
| **Overlap prevention** | Вручную через PID | `->withoutOverlapping()` |
| **Логи** | Настройка вручную | `->sendOutputTo()` |
| **Уведомления** | Дополнительные скрипты | `->emailOutputOnFailure()` |
| **Тестирование** | Сложно | `Artisan::call()` |
| **Централизация** | Файлы на каждом сервере | Один файл `Kernel.php` |

---

## Упражнения

### Задание 1: Базовое планирование
Создай schedule для блога:
- Публикация отложенных постов каждые 5 минут
- Очистка спама в комментариях каждый час
- Еженедельная рассылка дайджеста (воскресенье 20:00)

### Задание 2: Бэкап система
Создай автоматическую систему бэкапов:
- БД: каждый день в 3:00
- Файлы: каждую неделю в субботу 4:00
- Удаление старых бэкапов (>30 дней): каждый день в 5:00
- Email-отчёт администратору: ежедневно в 6:00

### Задание 3: E-commerce автоматизация
Для интернет-магазина:
- Проверка неоплаченных заказов (>24ч): каждые 2 часа
- Напоминание о брошенных корзинах: ежедневно в 19:00
- Обновление курса валют: каждое утро в 8:00
- Генерация отчётов продаж: каждый понедельник в 9:00

### Задание 4: Мониторинг и алерты
Создай систему мониторинга:
- Проверка доступности API: каждые 5 минут
- Проверка места на диске: каждый час
- Проверка времени ответа БД: каждые 10 минут
- При проблемах: отправка уведомлений в Telegram

---

## Чек-лист

**Настройка**:
- [ ] Настроил cron на сервере (`* * * * * ...`)
- [ ] Проверил абсолютный путь к проекту
- [ ] Настроил timezone в `config/app.php`
- [ ] Настроил логирование schedule

**Планирование**:
- [ ] Использую понятные методы частоты (`->daily()` вместо `->cron()`)
- [ ] Добавил `->withoutOverlapping()` для долгих задач
- [ ] Использую `->onOneServer()` при масштабировании
- [ ] Добавил условия `->when()` где нужно

**Мониторинг**:
- [ ] Настроил логирование вывода
- [ ] Добавил email-уведомления при ошибках
- [ ] Использую ping-сервисы для критичных задач
- [ ] Могу посмотреть список задач через `schedule:list`

**Безопасность**:
- [ ] Чувствительные команды защищены условиями
- [ ] Не использую `->exec()` с непроверенными данными
- [ ] Ограничил частоту API-запросов
- [ ] Добавил timeout для долгих задач

---

## Итоги

Task Scheduling в Laravel — это:

✅ **Один cron** на сервере вместо десятков  
✅ **Код в Git** вместо редактирования crontab на продакшене  
✅ **Понятный синтаксис** вместо `*/5 * * * *`  
✅ **Встроенные фичи**: overlap prevention, условия, логи, уведомления  
✅ **Тестируемость**: можно запускать команды в unit-тестах  

Это делает автоматизацию задач простой, надёжной и поддерживаемой.

---

**Следующая глава**: `Глава 10.6: API Resources — форматирование JSON, пагинация, вложенные ресурсы`