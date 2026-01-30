# Глава 7.2: Полезные пакеты — vlucas/phpdotenv, monolog, carbon, guzzle — что это и зачем

## Введение

Вы уже знаете, как использовать Composer для управления зависимостями. Теперь пора познакомиться с популярными пакетами, которые решают типичные задачи PHP-разработчика. Вместо того чтобы писать код с нуля, мы будем использовать проверенные решения от сообщества.

В этой главе мы изучим четыре ключевых пакета:
- **vlucas/phpdotenv** — для безопасного хранения конфигурации
- **monolog/monolog** — для профессионального логирования
- **nesbot/carbon** — для удобной работы с датами
- **guzzlehttp/guzzle** — для HTTP-запросов

---

## 1. vlucas/phpdotenv — Управление конфигурацией

### Зачем нужен?

Представьте: вы разрабатываете приложение локально с одной базой данных, а на продакшене используется другая. Хранить пароли и настройки прямо в коде — **катастрофически плохая идея**:

```php
// ❌ НИКОГДА ТАК НЕ ДЕЛАЙТЕ!
$db = new PDO('mysql:host=localhost', 'root', 'secret123');
```

**Проблемы:**
- Пароли попадут в Git
- Нельзя использовать разные настройки для разных окружений
- Изменение конфигурации требует правки кода

**Решение:** хранить настройки в файле `.env`, который не попадает в репозиторий.

### Установка

```bash
composer require vlucas/phpdotenv
```

### Структура проекта

```
project/
├── .env              # Конфигурация (НЕ в Git!)
├── .env.example      # Шаблон конфигурации (в Git)
├── .gitignore        # Добавляем .env сюда
├── composer.json
└── index.php
```

### Создаем .env файл

```env
# .env
DB_HOST=localhost
DB_NAME=messenger
DB_USER=root
DB_PASS=secret123

APP_ENV=development
APP_DEBUG=true
APP_URL=http://localhost:8000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
```

### Базовое использование

```php
<?php
// index.php
require 'vendor/autoload.php';

use Dotenv\Dotenv;

// Загружаем .env из корневой папки
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Теперь все переменные доступны через $_ENV и getenv()
$dbHost = $_ENV['DB_HOST'];
$dbName = $_ENV['DB_NAME'];
$dbUser = $_ENV['DB_USER'];
$dbPass = $_ENV['DB_PASS'];

try {
    $pdo = new PDO(
        "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4",
        $dbUser,
        $dbPass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "Подключение успешно!";
} catch (PDOException $e) {
    die("Ошибка подключения: " . $e->getMessage());
}
```

### Валидация обязательных переменных

```php
<?php
require 'vendor/autoload.php';

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Проверяем, что обязательные переменные установлены
$dotenv->required(['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS']);

// Проверяем, что APP_ENV содержит одно из допустимых значений
$dotenv->required('APP_ENV')->allowedValues(['development', 'staging', 'production']);

// Проверяем, что APP_DEBUG — это булево значение
$dotenv->required('APP_DEBUG')->isBoolean();
```

### Создаем .env.example

Этот файл — шаблон для других разработчиков. Он **попадает в Git**.

```env
# .env.example
DB_HOST=localhost
DB_NAME=your_database
DB_USER=your_username
DB_PASS=your_password

APP_ENV=development
APP_DEBUG=true
APP_URL=http://localhost:8000
```

### Добавляем .env в .gitignore

```
# .gitignore
.env
vendor/
```

### Практический пример: конфигурационный класс

```php
<?php
// config/Database.php
namespace App\Config;

class Database
{
    private static $instance = null;
    private $connection;

    private function __construct()
    {
        $host = $_ENV['DB_HOST'];
        $dbname = $_ENV['DB_NAME'];
        $user = $_ENV['DB_USER'];
        $pass = $_ENV['DB_PASS'];

        $this->connection = new \PDO(
            "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
            $user,
            $pass,
            [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
        );
    }

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection()
    {
        return $this->connection;
    }
}
```

Использование:

```php
<?php
require 'vendor/autoload.php';

use Dotenv\Dotenv;
use App\Config\Database;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$db = Database::getInstance()->getConnection();
$stmt = $db->query("SELECT * FROM users LIMIT 5");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);
```

---

## 2. monolog/monolog — Профессиональное логирование

### Зачем нужен?

Простые `echo` и `var_dump()` — это хорошо для отладки, но в реальных приложениях нужно:
- Записывать события в файлы
- Отправлять критические ошибки на email
- Разделять логи по уровням (debug, info, error)
- Автоматически ротировать файлы логов

### Установка

```bash
composer require monolog/monolog
```

### Уровни логирования

Monolog использует стандартные уровни из RFC 5424:

| Уровень | Когда использовать |
|---------|-------------------|
| **DEBUG** | Детальная информация для отладки |
| **INFO** | Обычные события (пользователь вошел) |
| **NOTICE** | Нормальные, но значимые события |
| **WARNING** | Предупреждения (устаревший метод) |
| **ERROR** | Ошибки, не требующие немедленных действий |
| **CRITICAL** | Критические условия (БД недоступна) |
| **ALERT** | Требуются немедленные действия |
| **EMERGENCY** | Система неработоспособна |

### Базовое использование

```php
<?php
require 'vendor/autoload.php';

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

// Создаем логгер
$log = new Logger('app');

// Добавляем обработчик: все логи уровня DEBUG и выше идут в файл
$log->pushHandler(new StreamHandler(__DIR__ . '/logs/app.log', Logger::DEBUG));

// Записываем логи
$log->debug('Это отладочное сообщение');
$log->info('Пользователь вошел в систему', ['user_id' => 42]);
$log->warning('Использован устаревший метод');
$log->error('Не удалось подключиться к API', ['url' => 'https://api.example.com']);
```

**Результат в logs/app.log:**

```
[2026-01-29T14:23:45.123456+00:00] app.DEBUG: Это отладочное сообщение [] []
[2026-01-29T14:23:45.234567+00:00] app.INFO: Пользователь вошел в систему {"user_id":42} []
[2026-01-29T14:23:45.345678+00:00] app.WARNING: Использован устаревший метод [] []
[2026-01-29T14:23:45.456789+00:00] app.ERROR: Не удалось подключиться к API {"url":"https://api.example.com"} []
```

### Несколько обработчиков

Можно отправлять разные уровни логов в разные места:

```php
<?php
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Monolog\Handler\FirePHPHandler;

$log = new Logger('app');

// Все логи идут в основной файл
$log->pushHandler(new StreamHandler(__DIR__ . '/logs/app.log', Logger::DEBUG));

// Только ошибки и выше — в отдельный файл
$log->pushHandler(new StreamHandler(__DIR__ . '/logs/errors.log', Logger::ERROR));

// Критические ошибки — в браузерную консоль (через FirePHP)
$log->pushHandler(new FirePHPHandler(Logger::CRITICAL));
```

### Ротация логов

Чтобы файлы не росли бесконечно, используем `RotatingFileHandler`:

```php
<?php
use Monolog\Logger;
use Monolog\Handler\RotatingFileHandler;

$log = new Logger('app');

// Создавать новый файл каждый день, хранить логи за 30 дней
$log->pushHandler(
    new RotatingFileHandler(
        __DIR__ . '/logs/app.log',
        30,  // Максимум 30 файлов
        Logger::DEBUG
    )
);
```

Будут создаваться файлы: `app-2026-01-29.log`, `app-2026-01-30.log` и т.д.

### Форматирование логов

```php
<?php
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Monolog\Formatter\LineFormatter;

$log = new Logger('app');
$handler = new StreamHandler(__DIR__ . '/logs/app.log', Logger::DEBUG);

// Кастомный формат: [время] уровень: сообщение
$formatter = new LineFormatter(
    "[%datetime%] %level_name%: %message% %context%\n",
    "Y-m-d H:i:s"
);

$handler->setFormatter($formatter);
$log->pushHandler($handler);

$log->info('Пользователь зарегистрирован', ['email' => 'user@example.com']);
```

**Результат:**

```
[2026-01-29 14:30:00] INFO: Пользователь зарегистрирован {"email":"user@example.com"}
```

### Практический пример: обработка ошибок

```php
<?php
require 'vendor/autoload.php';

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

$log = new Logger('app');
$log->pushHandler(new StreamHandler(__DIR__ . '/logs/app.log', Logger::DEBUG));

// Регистрируем обработчик ошибок
set_error_handler(function ($severity, $message, $file, $line) use ($log) {
    $log->error("PHP Error: $message", [
        'file' => $file,
        'line' => $line,
        'severity' => $severity
    ]);
});

// Регистрируем обработчик исключений
set_exception_handler(function ($exception) use ($log) {
    $log->critical('Uncaught Exception: ' . $exception->getMessage(), [
        'exception' => $exception,
        'trace' => $exception->getTraceAsString()
    ]);
});

// Пример использования
try {
    $db = new PDO('mysql:host=wrong_host', 'user', 'pass');
} catch (Exception $e) {
    $log->error('Database connection failed', ['error' => $e->getMessage()]);
}
```

### Email-уведомления о критических ошибках

```bash
composer require monolog/monolog symfony/mailer
```

```php
<?php
use Monolog\Logger;
use Monolog\Handler\NativeMailerHandler;

$log = new Logger('app');

// Отправлять email при критических ошибках
$log->pushHandler(new NativeMailerHandler(
    'admin@example.com',      // Кому
    'Critical Error on Site', // Тема
    'noreply@example.com',    // От кого
    Logger::CRITICAL          // Только CRITICAL и выше
));

$log->critical('Сервер базы данных недоступен!');
```

---

## 3. nesbot/carbon — Работа с датами

### Зачем нужен?

Встроенный `DateTime` в PHP неудобен. Carbon делает работу с датами приятной:

```php
// Встроенный DateTime — многословно
$date = new DateTime();
$date->modify('+1 week');
echo $date->format('Y-m-d');

// Carbon — читаемо и кратко
echo Carbon::now()->addWeek()->toDateString();
```

### Установка

```bash
composer require nesbot/carbon
```

### Основы

```php
<?php
require 'vendor/autoload.php';

use Carbon\Carbon;

// Текущая дата и время
$now = Carbon::now();
echo $now; // 2026-01-29 14:35:00

// Конкретная дата
$date = Carbon::create(2026, 12, 31, 23, 59, 59);
echo $date; // 2026-12-31 23:59:59

// Из строки
$parsed = Carbon::parse('2026-06-15 10:30:00');
echo $parsed; // 2026-06-15 10:30:00

// Сегодня в полночь
$today = Carbon::today();
echo $today; // 2026-01-29 00:00:00

// Завтра
$tomorrow = Carbon::tomorrow();
echo $tomorrow; // 2026-01-30 00:00:00

// Вчера
$yesterday = Carbon::yesterday();
echo $yesterday; // 2026-01-28 00:00:00
```

### Манипуляции с датами

```php
<?php
use Carbon\Carbon;

$date = Carbon::now();

// Добавление
echo $date->addDays(5);       // +5 дней
echo $date->addWeeks(2);      // +2 недели
echo $date->addMonths(3);     // +3 месяца
echo $date->addYears(1);      // +1 год
echo $date->addHours(6);      // +6 часов
echo $date->addMinutes(30);   // +30 минут

// Вычитание
echo $date->subDays(5);       // -5 дней
echo $date->subWeeks(2);      // -2 недели

// Установка конкретных значений
echo $date->setYear(2030);
echo $date->setMonth(12);
echo $date->setDay(25);
echo $date->setTime(18, 30, 0);

// Начало/конец периода
echo $date->startOfDay();     // 00:00:00
echo $date->endOfDay();       // 23:59:59
echo $date->startOfMonth();   // Первое число месяца
echo $date->endOfMonth();     // Последнее число месяца
echo $date->startOfWeek();    // Понедельник недели
echo $date->endOfWeek();      // Воскресенье недели
```

### Форматирование

```php
<?php
use Carbon\Carbon;

$date = Carbon::parse('2026-01-29 14:35:00');

// Стандартные форматы
echo $date->toDateString();       // 2026-01-29
echo $date->toTimeString();       // 14:35:00
echo $date->toDateTimeString();   // 2026-01-29 14:35:00
echo $date->toFormattedDateString(); // Jan 29, 2026

// Кастомные форматы
echo $date->format('d.m.Y');      // 29.01.2026
echo $date->format('H:i');        // 14:35
echo $date->format('l, F j, Y');  // Wednesday, January 29, 2026

// Человекопонятные форматы
echo $date->diffForHumans();      // "2 hours ago" (если прошло 2 часа)
```

### Сравнение дат

```php
<?php
use Carbon\Carbon;

$date1 = Carbon::parse('2026-01-29');
$date2 = Carbon::parse('2026-02-15');

// Сравнения
if ($date1->lt($date2)) {  // less than (меньше)
    echo "date1 раньше date2";
}

if ($date1->lte($date2)) { // less than or equal (меньше или равно)
    echo "date1 раньше или равна date2";
}

if ($date1->gt($date2)) {  // greater than (больше)
    echo "date1 позже date2";
}

if ($date1->gte($date2)) { // greater than or equal
    echo "date1 позже или равна date2";
}

if ($date1->eq($date2)) {  // equal (равно)
    echo "Даты одинаковые";
}

// Специальные проверки
if ($date1->isToday()) {
    echo "Это сегодня";
}

if ($date1->isFuture()) {
    echo "Это будущее";
}

if ($date1->isPast()) {
    echo "Это прошлое";
}

if ($date1->isWeekend()) {
    echo "Это выходной";
}

if ($date1->isWeekday()) {
    echo "Это будний день";
}
```

### Разница между датами

```php
<?php
use Carbon\Carbon;

$start = Carbon::parse('2026-01-01');
$end = Carbon::parse('2026-01-29');

// Разница в днях, часах и т.д.
echo $start->diffInDays($end);      // 28
echo $start->diffInHours($end);     // 672
echo $start->diffInMinutes($end);   // 40320

// Человекопонятный формат
echo $start->diffForHumans($end);   // "28 days before"
echo $end->diffForHumans($start);   // "28 days after"

// Относительно текущего времени
echo Carbon::now()->subDays(5)->diffForHumans();  // "5 days ago"
echo Carbon::now()->addWeeks(2)->diffForHumans(); // "2 weeks from now"
```

### Практический пример: система истечения подписки

```php
<?php
require 'vendor/autoload.php';

use Carbon\Carbon;

class Subscription
{
    private $expiresAt;

    public function __construct($expiresAt)
    {
        $this->expiresAt = Carbon::parse($expiresAt);
    }

    public function isActive(): bool
    {
        return $this->expiresAt->isFuture();
    }

    public function isExpired(): bool
    {
        return $this->expiresAt->isPast();
    }

    public function daysRemaining(): int
    {
        if ($this->isExpired()) {
            return 0;
        }
        return Carbon::now()->diffInDays($this->expiresAt);
    }

    public function expiresIn(): string
    {
        return $this->expiresAt->diffForHumans();
    }

    public function extend($days): void
    {
        $this->expiresAt->addDays($days);
    }

    public function getStatusMessage(): string
    {
        if ($this->isExpired()) {
            return "Подписка истекла " . $this->expiresAt->diffForHumans();
        }

        $days = $this->daysRemaining();
        
        if ($days <= 3) {
            return "⚠️ Подписка истекает через $days дней!";
        }

        return "✅ Подписка активна до " . $this->expiresAt->format('d.m.Y');
    }
}

// Использование
$sub = new Subscription('2026-02-05 23:59:59');

echo $sub->getStatusMessage();  // "✅ Подписка активна до 05.02.2026"
echo $sub->daysRemaining();     // 7
echo $sub->expiresIn();         // "7 days from now"

$sub->extend(30);
echo $sub->expiresIn();         // "1 month from now"
```

### Локализация

```php
<?php
use Carbon\Carbon;

// Русский язык
Carbon::setLocale('ru');

$date = Carbon::parse('2026-01-29 14:35:00');

echo $date->translatedFormat('l, j F Y'); // "среда, 29 января 2026"
echo $date->diffForHumans();              // "2 часа назад"
echo $date->addDays(5)->calendar();       // "В следующую субботу в 14:35"
```

---

## 4. guzzlehttp/guzzle — HTTP-клиент

### Зачем нужен?

Когда вам нужно взаимодействовать с внешними API (отправить email через Mailgun, получить данные с Twitter, обратиться к платежному шлюзу), встроенный `file_get_contents()` или `curl` — это боль.

Guzzle делает HTTP-запросы простыми и мощными.

### Установка

```bash
composer require guzzlehttp/guzzle
```

### Простой GET-запрос

```php
<?php
require 'vendor/autoload.php';

use GuzzleHttp\Client;

$client = new Client();

// GET-запрос
$response = $client->request('GET', 'https://api.github.com/users/octocat');

echo $response->getStatusCode(); // 200
echo $response->getBody();       // JSON-ответ от GitHub
```

### Работа с JSON

```php
<?php
use GuzzleHttp\Client;

$client = new Client();

$response = $client->request('GET', 'https://api.github.com/users/octocat');

// Парсим JSON автоматически
$data = json_decode($response->getBody(), true);

echo "Имя: " . $data['name'];
echo "Репозитории: " . $data['public_repos'];
echo "Подписчики: " . $data['followers'];
```

### POST-запрос с данными

```php
<?php
use GuzzleHttp\Client;

$client = new Client();

// POST с JSON
$response = $client->request('POST', 'https://api.example.com/users', [
    'json' => [
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'age' => 30
    ]
]);

echo $response->getStatusCode(); // 201 Created
```

### Отправка форм

```php
<?php
use GuzzleHttp\Client;

$client = new Client();

// POST с данными формы
$response = $client->request('POST', 'https://example.com/login', [
    'form_params' => [
        'username' => 'admin',
        'password' => 'secret'
    ]
]);
```

### Загрузка файлов

```php
<?php
use GuzzleHttp\Client;

$client = new Client();

$response = $client->request('POST', 'https://api.example.com/upload', [
    'multipart' => [
        [
            'name' => 'file',
            'contents' => fopen('/path/to/file.jpg', 'r'),
            'filename' => 'photo.jpg'
        ],
        [
            'name' => 'description',
            'contents' => 'My photo'
        ]
    ]
]);
```

### Заголовки и аутентификация

```php
<?php
use GuzzleHttp\Client;

$client = new Client();

// Кастомные заголовки
$response = $client->request('GET', 'https://api.example.com/data', [
    'headers' => [
        'Authorization' => 'Bearer YOUR_ACCESS_TOKEN',
        'Accept' => 'application/json',
        'User-Agent' => 'MyApp/1.0'
    ]
]);

// Basic Auth
$response = $client->request('GET', 'https://api.example.com/data', [
    'auth' => ['username', 'password']
]);
```

### Обработка ошибок

```php
<?php
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

$client = new Client();

try {
    $response = $client->request('GET', 'https://api.example.com/not-found');
    echo $response->getBody();
} catch (RequestException $e) {
    // Ошибка запроса (4xx, 5xx)
    echo "Ошибка: " . $e->getMessage();
    
    if ($e->hasResponse()) {
        echo "Код: " . $e->getResponse()->getStatusCode();
        echo "Тело ответа: " . $e->getResponse()->getBody();
    }
}
```

### Таймауты и повторные попытки

```php
<?php
use GuzzleHttp\Client;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;

$stack = HandlerStack::create();

// Повторять запрос до 3 раз при ошибке
$stack->push(Middleware::retry(function ($retries, $request, $response, $exception) {
    return $retries < 3;
}));

$client = new Client([
    'handler' => $stack,
    'timeout' => 10,           // Таймаут 10 секунд
    'connect_timeout' => 5     // Таймаут подключения 5 секунд
]);

$response = $client->request('GET', 'https://slow-api.com/data');
```

### Асинхронные запросы

```php
<?php
use GuzzleHttp\Client;
use GuzzleHttp\Promise;

$client = new Client();

// Создаем несколько обещаний (promises)
$promises = [
    'github' => $client->getAsync('https://api.github.com/users/octocat'),
    'weather' => $client->getAsync('https://api.weather.com/data'),
    'news' => $client->getAsync('https://api.news.com/headlines')
];

// Ждем завершения всех запросов
$results = Promise\Utils::settle($promises)->wait();

foreach ($results as $key => $result) {
    if ($result['state'] === 'fulfilled') {
        echo "$key: " . $result['value']->getStatusCode() . "\n";
    } else {
        echo "$key failed: " . $result['reason']->getMessage() . "\n";
    }
}
```

### Практический пример: обертка над API погоды

```php
<?php
require 'vendor/autoload.php';

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

class WeatherService
{
    private $client;
    private $apiKey;
    private $baseUrl = 'https://api.openweathermap.org/data/2.5';

    public function __construct($apiKey)
    {
        $this->apiKey = $apiKey;
        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => 10
        ]);
    }

    public function getCurrentWeather($city)
    {
        try {
            $response = $this->client->request('GET', '/weather', [
                'query' => [
                    'q' => $city,
                    'appid' => $this->apiKey,
                    'units' => 'metric',
                    'lang' => 'ru'
                ]
            ]);

            $data = json_decode($response->getBody(), true);

            return [
                'city' => $data['name'],
                'temperature' => $data['main']['temp'],
                'feels_like' => $data['main']['feels_like'],
                'description' => $data['weather'][0]['description'],
                'humidity' => $data['main']['humidity'],
                'wind_speed' => $data['wind']['speed']
            ];
        } catch (RequestException $e) {
            return [
                'error' => 'Не удалось получить погоду',
                'message' => $e->getMessage()
            ];
        }
    }

    public function getForecast($city, $days = 5)
    {
        try {
            $response = $this->client->request('GET', '/forecast', [
                'query' => [
                    'q' => $city,
                    'appid' => $this->apiKey,
                    'units' => 'metric',
                    'cnt' => $days * 8  // API дает данные каждые 3 часа
                ]
            ]);

            $data = json_decode($response->getBody(), true);
            $forecast = [];

            foreach ($data['list'] as $item) {
                $forecast[] = [
                    'datetime' => $item['dt_txt'],
                    'temperature' => $item['main']['temp'],
                    'description' => $item['weather'][0]['description']
                ];
            }

            return $forecast;
        } catch (RequestException $e) {
            return ['error' => $e->getMessage()];
        }
    }
}

// Использование
$weather = new WeatherService('YOUR_API_KEY');

$current = $weather->getCurrentWeather('Moscow');
print_r($current);
/*
Array (
    [city] => Moscow
    [temperature] => -5.2
    [feels_like] => -8.1
    [description] => облачно с прояснениями
    [humidity] => 75
    [wind_speed] => 3.5
)
*/

$forecast = $weather->getForecast('Moscow', 3);
print_r($forecast);
```

---

## Сравнительная таблица пакетов

| Пакет | Решаемая проблема | Альтернативы |
|-------|-------------------|--------------|
| **phpdotenv** | Безопасное хранение настроек | symfony/dotenv |
| **monolog** | Логирование событий | Встроенный error_log, KLogger |
| **carbon** | Удобная работа с датами | DateTime, Chronos |
| **guzzle** | HTTP-запросы | cURL, file_get_contents, Symfony HttpClient |

---

## Практическое задание

### Задание 1: Система уведомлений

Создайте класс `NotificationService`, который:
1. Использует **phpdotenv** для хранения API-ключей
2. Использует **monolog** для логирования отправленных уведомлений
3. Использует **guzzle** для отправки уведомлений через Telegram API
4. Использует **carbon** для планирования отложенных уведомлений

**Структура:**

```php
class NotificationService
{
    public function sendImmediate($chatId, $message);
    public function schedule($chatId, $message, $sendAt);
    public function getScheduled();
}
```

### Задание 2: Погодный бот

Создайте консольное приложение, которое:
1. Запрашивает у пользователя город
2. Получает погоду через **guzzle** (OpenWeatherMap API)
3. Форматирует дату и время через **carbon**
4. Логирует все запросы через **monolog**
5. Хранит API-ключ в **.env**

### Задание 3: Мониторинг сайтов

Создайте скрипт, который:
1. Читает список URL из `.env`
2. Проверяет доступность каждого сайта через **guzzle**
3. Логирует результаты (время ответа, код статуса) через **monolog**
4. Если сайт недоступен > 5 минут, отправляет уведомление
5. Сохраняет timestamp последней проверки с **carbon**

---

## Частые ошибки

### ❌ Хранение .env в Git

```bash
# Неправильно
git add .env
git commit -m "Added config"
```

**Правильно:**
```bash
# .gitignore
.env

# Коммитим только шаблон
git add .env.example
```

### ❌ Не проверять наличие переменных окружения

```php
// Неправильно
$apiKey = $_ENV['API_KEY']; // Может быть не установлен!
```

**Правильно:**
```php
$dotenv->required('API_KEY');
// или
$apiKey = $_ENV['API_KEY'] ?? throw new Exception('API_KEY not set');
```

### ❌ Игнорирование исключений Guzzle

```php
// Неправильно
$response = $client->request('GET', $url);
$data = json_decode($response->getBody());
```

**Правильно:**
```php
try {
    $response = $client->request('GET', $url);
    $data = json_decode($response->getBody());
} catch (RequestException $e) {
    // Обработка ошибки
}
```

### ❌ Не использовать prepared statements с логами

```php
// Опасно!
$log->info("User $username logged in with password $password");
```

**Правильно:**
```php
$log->info('User logged in', ['username' => $username]); // Пароль НЕ логируем!
```

---

## Контрольные вопросы

1. **Почему нельзя хранить `.env` в Git?**
2. **Какие уровни логирования существуют в Monolog? Приведите примеры использования каждого.**
3. **В чем разница между `Carbon::now()` и `Carbon::today()`?**
4. **Как отправить POST-запрос с JSON через Guzzle?**
5. **Как настроить ротацию логов на 7 дней?**
6. **Как проверить, что дата находится в прошлом с помощью Carbon?**
7. **Как обработать 404 ошибку в Guzzle?**
8. **Зачем нужен `.env.example`?**

---

## Дополнительные ресурсы

- **phpdotenv**: https://github.com/vlucas/phpdotenv
- **Monolog**: https://github.com/Seldaek/monolog
- **Carbon**: https://carbon.nesbot.com/docs/
- **Guzzle**: https://docs.guzzlephp.org/

---

## Что дальше?

В следующей главе мы изучим **PSR-стандарты** — соглашения о стиле кода, которые используют все профессиональные PHP-разработчики. Вы узнаете, как писать код, который легко читать и поддерживать, и как автоматически проверять соблюдение стандартов.

Готовы писать код как в крупных компаниях? Переходите к **Главе 7.3: Стандарты PSR**! 🚀# Глава 7.2: Полезные пакеты — vlucas/phpdotenv, monolog, carbon, guzzle — что это и зачем

## Введение

Вы уже знаете, как использовать Composer для управления зависимостями. Теперь пора познакомиться с популярными пакетами, которые решают типичные задачи PHP-разработчика. Вместо того чтобы писать код с нуля, мы будем использовать проверенные решения от сообщества.

В этой главе мы изучим четыре ключевых пакета:
- **vlucas/phpdotenv** — для безопасного хранения конфигурации
- **monolog/monolog** — для профессионального логирования
- **nesbot/carbon** — для удобной работы с датами
- **guzzlehttp/guzzle** — для HTTP-запросов

---

## 1. vlucas/phpdotenv — Управление конфигурацией

### Зачем нужен?

Представьте: вы разрабатываете приложение локально с одной базой данных, а на продакшене используется другая. Хранить пароли и настройки прямо в коде — **катастрофически плохая идея**:

```php
// ❌ НИКОГДА ТАК НЕ ДЕЛАЙТЕ!
$db = new PDO('mysql:host=localhost', 'root', 'secret123');
```

**Проблемы:**
- Пароли попадут в Git
- Нельзя использовать разные настройки для разных окружений
- Изменение конфигурации требует правки кода

**Решение:** хранить настройки в файле `.env`, который не попадает в репозиторий.

### Установка

```bash
composer require vlucas/phpdotenv
```

### Структура проекта

```
project/
├── .env              # Конфигурация (НЕ в Git!)
├── .env.example      # Шаблон конфигурации (в Git)
├── .gitignore        # Добавляем .env сюда
├── composer.json
└── index.php
```

### Создаем .env файл

```env
# .env
DB_HOST=localhost
DB_NAME=messenger
DB_USER=root
DB_PASS=secret123

APP_ENV=development
APP_DEBUG=true
APP_URL=http://localhost:8000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
```

### Базовое использование

```php
<?php
// index.php
require 'vendor/autoload.php';

use Dotenv\Dotenv;

// Загружаем .env из корневой папки
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Теперь все переменные доступны через $_ENV и getenv()
$dbHost = $_ENV['DB_HOST'];
$dbName = $_ENV['DB_NAME'];
$dbUser = $_ENV['DB_USER'];
$dbPass = $_ENV['DB_PASS'];

try {
    $pdo = new PDO(
        "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4",
        $dbUser,
        $dbPass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "Подключение успешно!";
} catch (PDOException $e) {
    die("Ошибка подключения: " . $e->getMessage());
}
```

### Валидация обязательных переменных

```php
<?php
require 'vendor/autoload.php';

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Проверяем, что обязательные переменные установлены
$dotenv->required(['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS']);

// Проверяем, что APP_ENV содержит одно из допустимых значений
$dotenv->required('APP_ENV')->allowedValues(['development', 'staging', 'production']);

// Проверяем, что APP_DEBUG — это булево значение
$dotenv->required('APP_DEBUG')->isBoolean();
```

### Создаем .env.example

Этот файл — шаблон для других разработчиков. Он **попадает в Git**.

```env
# .env.example
DB_HOST=localhost
DB_NAME=your_database
DB_USER=your_username
DB_PASS=your_password

APP_ENV=development
APP_DEBUG=true
APP_URL=http://localhost:8000
```

### Добавляем .env в .gitignore

```
# .gitignore
.env
vendor/
```

### Практический пример: конфигурационный класс

```php
<?php
// config/Database.php
namespace App\Config;

class Database
{
    private static $instance = null;
    private $connection;

    private function __construct()
    {
        $host = $_ENV['DB_HOST'];
        $dbname = $_ENV['DB_NAME'];
        $user = $_ENV['DB_USER'];
        $pass = $_ENV['DB_PASS'];

        $this->connection = new \PDO(
            "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
            $user,
            $pass,
            [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
        );
    }

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection()
    {
        return $this->connection;
    }
}
```

Использование:

```php
<?php
require 'vendor/autoload.php';

use Dotenv\Dotenv;
use App\Config\Database;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$db = Database::getInstance()->getConnection();
$stmt = $db->query("SELECT * FROM users LIMIT 5");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);
```

---

## 2. monolog/monolog — Профессиональное логирование

### Зачем нужен?

Простые `echo` и `var_dump()` — это хорошо для отладки, но в реальных приложениях нужно:
- Записывать события в файлы
- Отправлять критические ошибки на email
- Разделять логи по уровням (debug, info, error)
- Автоматически ротировать файлы логов

### Установка

```bash
composer require monolog/monolog
```

### Уровни логирования

Monolog использует стандартные уровни из RFC 5424:

| Уровень | Когда использовать |
|---------|-------------------|
| **DEBUG** | Детальная информация для отладки |
| **INFO** | Обычные события (пользователь вошел) |
| **NOTICE** | Нормальные, но значимые события |
| **WARNING** | Предупреждения (устаревший метод) |
| **ERROR** | Ошибки, не требующие немедленных действий |
| **CRITICAL** | Критические условия (БД недоступна) |
| **ALERT** | Требуются немедленные действия |
| **EMERGENCY** | Система неработоспособна |

### Базовое использование

```php
<?php
require 'vendor/autoload.php';

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

// Создаем логгер
$log = new Logger('app');

// Добавляем обработчик: все логи уровня DEBUG и выше идут в файл
$log->pushHandler(new StreamHandler(__DIR__ . '/logs/app.log', Logger::DEBUG));

// Записываем логи
$log->debug('Это отладочное сообщение');
$log->info('Пользователь вошел в систему', ['user_id' => 42]);
$log->warning('Использован устаревший метод');
$log->error('Не удалось подключиться к API', ['url' => 'https://api.example.com']);
```

**Результат в logs/app.log:**

```
[2026-01-29T14:23:45.123456+00:00] app.DEBUG: Это отладочное сообщение [] []
[2026-01-29T14:23:45.234567+00:00] app.INFO: Пользователь вошел в систему {"user_id":42} []
[2026-01-29T14:23:45.345678+00:00] app.WARNING: Использован устаревший метод [] []
[2026-01-29T14:23:45.456789+00:00] app.ERROR: Не удалось подключиться к API {"url":"https://api.example.com"} []
```

### Несколько обработчиков

Можно отправлять разные уровни логов в разные места:

```php
<?php
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Monolog\Handler\FirePHPHandler;

$log = new Logger('app');

// Все логи идут в основной файл
$log->pushHandler(new StreamHandler(__DIR__ . '/logs/app.log', Logger::DEBUG));

// Только ошибки и выше — в отдельный файл
$log->pushHandler(new StreamHandler(__DIR__ . '/logs/errors.log', Logger::ERROR));

// Критические ошибки — в браузерную консоль (через FirePHP)
$log->pushHandler(new FirePHPHandler(Logger::CRITICAL));
```

### Ротация логов

Чтобы файлы не росли бесконечно, используем `RotatingFileHandler`:

```php
<?php
use Monolog\Logger;
use Monolog\Handler\RotatingFileHandler;

$log = new Logger('app');

// Создавать новый файл каждый день, хранить логи за 30 дней
$log->pushHandler(
    new RotatingFileHandler(
        __DIR__ . '/logs/app.log',
        30,  // Максимум 30 файлов
        Logger::DEBUG
    )
);
```

Будут создаваться файлы: `app-2026-01-29.log`, `app-2026-01-30.log` и т.д.

### Форматирование логов

```php
<?php
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Monolog\Formatter\LineFormatter;

$log = new Logger('app');
$handler = new StreamHandler(__DIR__ . '/logs/app.log', Logger::DEBUG);

// Кастомный формат: [время] уровень: сообщение
$formatter = new LineFormatter(
    "[%datetime%] %level_name%: %message% %context%\n",
    "Y-m-d H:i:s"
);

$handler->setFormatter($formatter);
$log->pushHandler($handler);

$log->info('Пользователь зарегистрирован', ['email' => 'user@example.com']);
```

**Результат:**

```
[2026-01-29 14:30:00] INFO: Пользователь зарегистрирован {"email":"user@example.com"}
```

### Практический пример: обработка ошибок

```php
<?php
require 'vendor/autoload.php';

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

$log = new Logger('app');
$log->pushHandler(new StreamHandler(__DIR__ . '/logs/app.log', Logger::DEBUG));

// Регистрируем обработчик ошибок
set_error_handler(function ($severity, $message, $file, $line) use ($log) {
    $log->error("PHP Error: $message", [
        'file' => $file,
        'line' => $line,
        'severity' => $severity
    ]);
});

// Регистрируем обработчик исключений
set_exception_handler(function ($exception) use ($log) {
    $log->critical('Uncaught Exception: ' . $exception->getMessage(), [
        'exception' => $exception,
        'trace' => $exception->getTraceAsString()
    ]);
});

// Пример использования
try {
    $db = new PDO('mysql:host=wrong_host', 'user', 'pass');
} catch (Exception $e) {
    $log->error('Database connection failed', ['error' => $e->getMessage()]);
}
```

### Email-уведомления о критических ошибках

```bash
composer require monolog/monolog symfony/mailer
```

```php
<?php
use Monolog\Logger;
use Monolog\Handler\NativeMailerHandler;

$log = new Logger('app');

// Отправлять email при критических ошибках
$log->pushHandler(new NativeMailerHandler(
    'admin@example.com',      // Кому
    'Critical Error on Site', // Тема
    'noreply@example.com',    // От кого
    Logger::CRITICAL          // Только CRITICAL и выше
));

$log->critical('Сервер базы данных недоступен!');
```

---

## 3. nesbot/carbon — Работа с датами

### Зачем нужен?

Встроенный `DateTime` в PHP неудобен. Carbon делает работу с датами приятной:

```php
// Встроенный DateTime — многословно
$date = new DateTime();
$date->modify('+1 week');
echo $date->format('Y-m-d');

// Carbon — читаемо и кратко
echo Carbon::now()->addWeek()->toDateString();
```

### Установка

```bash
composer require nesbot/carbon
```

### Основы

```php
<?php
require 'vendor/autoload.php';

use Carbon\Carbon;

// Текущая дата и время
$now = Carbon::now();
echo $now; // 2026-01-29 14:35:00

// Конкретная дата
$date = Carbon::create(2026, 12, 31, 23, 59, 59);
echo $date; // 2026-12-31 23:59:59

// Из строки
$parsed = Carbon::parse('2026-06-15 10:30:00');
echo $parsed; // 2026-06-15 10:30:00

// Сегодня в полночь
$today = Carbon::today();
echo $today; // 2026-01-29 00:00:00

// Завтра
$tomorrow = Carbon::tomorrow();
echo $tomorrow; // 2026-01-30 00:00:00

// Вчера
$yesterday = Carbon::yesterday();
echo $yesterday; // 2026-01-28 00:00:00
```

### Манипуляции с датами

```php
<?php
use Carbon\Carbon;

$date = Carbon::now();

// Добавление
echo $date->addDays(5);       // +5 дней
echo $date->addWeeks(2);      // +2 недели
echo $date->addMonths(3);     // +3 месяца
echo $date->addYears(1);      // +1 год
echo $date->addHours(6);      // +6 часов
echo $date->addMinutes(30);   // +30 минут

// Вычитание
echo $date->subDays(5);       // -5 дней
echo $date->subWeeks(2);      // -2 недели

// Установка конкретных значений
echo $date->setYear(2030);
echo $date->setMonth(12);
echo $date->setDay(25);
echo $date->setTime(18, 30, 0);

// Начало/конец периода
echo $date->startOfDay();     // 00:00:00
echo $date->endOfDay();       // 23:59:59
echo $date->startOfMonth();   // Первое число месяца
echo $date->endOfMonth();     // Последнее число месяца
echo $date->startOfWeek();    // Понедельник недели
echo $date->endOfWeek();      // Воскресенье недели
```

### Форматирование

```php
<?php
use Carbon\Carbon;

$date = Carbon::parse('2026-01-29 14:35:00');

// Стандартные форматы
echo $date->toDateString();       // 2026-01-29
echo $date->toTimeString();       // 14:35:00
echo $date->toDateTimeString();   // 2026-01-29 14:35:00
echo $date->toFormattedDateString(); // Jan 29, 2026

// Кастомные форматы
echo $date->format('d.m.Y');      // 29.01.2026
echo $date->format('H:i');        // 14:35
echo $date->format('l, F j, Y');  // Wednesday, January 29, 2026

// Человекопонятные форматы
echo $date->diffForHumans();      // "2 hours ago" (если прошло 2 часа)
```

### Сравнение дат

```php
<?php
use Carbon\Carbon;

$date1 = Carbon::parse('2026-01-29');
$date2 = Carbon::parse('2026-02-15');

// Сравнения
if ($date1->lt($date2)) {  // less than (меньше)
    echo "date1 раньше date2";
}

if ($date1->lte($date2)) { // less than or equal (меньше или равно)
    echo "date1 раньше или равна date2";
}

if ($date1->gt($date2)) {  // greater than (больше)
    echo "date1 позже date2";
}

if ($date1->gte($date2)) { // greater than or equal
    echo "date1 позже или равна date2";
}

if ($date1->eq($date2)) {  // equal (равно)
    echo "Даты одинаковые";
}

// Специальные проверки
if ($date1->isToday()) {
    echo "Это сегодня";
}

if ($date1->isFuture()) {
    echo "Это будущее";
}

if ($date1->isPast()) {
    echo "Это прошлое";
}

if ($date1->isWeekend()) {
    echo "Это выходной";
}

if ($date1->isWeekday()) {
    echo "Это будний день";
}
```

### Разница между датами

```php
<?php
use Carbon\Carbon;

$start = Carbon::parse('2026-01-01');
$end = Carbon::parse('2026-01-29');

// Разница в днях, часах и т.д.
echo $start->diffInDays($end);      // 28
echo $start->diffInHours($end);     // 672
echo $start->diffInMinutes($end);   // 40320

// Человекопонятный формат
echo $start->diffForHumans($end);   // "28 days before"
echo $end->diffForHumans($start);   // "28 days after"

// Относительно текущего времени
echo Carbon::now()->subDays(5)->diffForHumans();  // "5 days ago"
echo Carbon::now()->addWeeks(2)->diffForHumans(); // "2 weeks from now"
```

### Практический пример: система истечения подписки

```php
<?php
require 'vendor/autoload.php';

use Carbon\Carbon;

class Subscription
{
    private $expiresAt;

    public function __construct($expiresAt)
    {
        $this->expiresAt = Carbon::parse($expiresAt);
    }

    public function isActive(): bool
    {
        return $this->expiresAt->isFuture();
    }

    public function isExpired(): bool
    {
        return $this->expiresAt->isPast();
    }

    public function daysRemaining(): int
    {
        if ($this->isExpired()) {
            return 0;
        }
        return Carbon::now()->diffInDays($this->expiresAt);
    }

    public function expiresIn(): string
    {
        return $this->expiresAt->diffForHumans();
    }

    public function extend($days): void
    {
        $this->expiresAt->addDays($days);
    }

    public function getStatusMessage(): string
    {
        if ($this->isExpired()) {
            return "Подписка истекла " . $this->expiresAt->diffForHumans();
        }

        $days = $this->daysRemaining();
        
        if ($days <= 3) {
            return "⚠️ Подписка истекает через $days дней!";
        }

        return "✅ Подписка активна до " . $this->expiresAt->format('d.m.Y');
    }
}

// Использование
$sub = new Subscription('2026-02-05 23:59:59');

echo $sub->getStatusMessage();  // "✅ Подписка активна до 05.02.2026"
echo $sub->daysRemaining();     // 7
echo $sub->expiresIn();         // "7 days from now"

$sub->extend(30);
echo $sub->expiresIn();         // "1 month from now"
```

### Локализация

```php
<?php
use Carbon\Carbon;

// Русский язык
Carbon::setLocale('ru');

$date = Carbon::parse('2026-01-29 14:35:00');

echo $date->translatedFormat('l, j F Y'); // "среда, 29 января 2026"
echo $date->diffForHumans();              // "2 часа назад"
echo $date->addDays(5)->calendar();       // "В следующую субботу в 14:35"
```

---

## 4. guzzlehttp/guzzle — HTTP-клиент

### Зачем нужен?

Когда вам нужно взаимодействовать с внешними API (отправить email через Mailgun, получить данные с Twitter, обратиться к платежному шлюзу), встроенный `file_get_contents()` или `curl` — это боль.

Guzzle делает HTTP-запросы простыми и мощными.

### Установка

```bash
composer require guzzlehttp/guzzle
```

### Простой GET-запрос

```php
<?php
require 'vendor/autoload.php';

use GuzzleHttp\Client;

$client = new Client();

// GET-запрос
$response = $client->request('GET', 'https://api.github.com/users/octocat');

echo $response->getStatusCode(); // 200
echo $response->getBody();       // JSON-ответ от GitHub
```

### Работа с JSON

```php
<?php
use GuzzleHttp\Client;

$client = new Client();

$response = $client->request('GET', 'https://api.github.com/users/octocat');

// Парсим JSON автоматически
$data = json_decode($response->getBody(), true);

echo "Имя: " . $data['name'];
echo "Репозитории: " . $data['public_repos'];
echo "Подписчики: " . $data['followers'];
```

### POST-запрос с данными

```php
<?php
use GuzzleHttp\Client;

$client = new Client();

// POST с JSON
$response = $client->request('POST', 'https://api.example.com/users', [
    'json' => [
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'age' => 30
    ]
]);

echo $response->getStatusCode(); // 201 Created
```

### Отправка форм

```php
<?php
use GuzzleHttp\Client;

$client = new Client();

// POST с данными формы
$response = $client->request('POST', 'https://example.com/login', [
    'form_params' => [
        'username' => 'admin',
        'password' => 'secret'
    ]
]);
```

### Загрузка файлов

```php
<?php
use GuzzleHttp\Client;

$client = new Client();

$response = $client->request('POST', 'https://api.example.com/upload', [
    'multipart' => [
        [
            'name' => 'file',
            'contents' => fopen('/path/to/file.jpg', 'r'),
            'filename' => 'photo.jpg'
        ],
        [
            'name' => 'description',
            'contents' => 'My photo'
        ]
    ]
]);
```

### Заголовки и аутентификация

```php
<?php
use GuzzleHttp\Client;

$client = new Client();

// Кастомные заголовки
$response = $client->request('GET', 'https://api.example.com/data', [
    'headers' => [
        'Authorization' => 'Bearer YOUR_ACCESS_TOKEN',
        'Accept' => 'application/json',
        'User-Agent' => 'MyApp/1.0'
    ]
]);

// Basic Auth
$response = $client->request('GET', 'https://api.example.com/data', [
    'auth' => ['username', 'password']
]);
```

### Обработка ошибок

```php
<?php
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

$client = new Client();

try {
    $response = $client->request('GET', 'https://api.example.com/not-found');
    echo $response->getBody();
} catch (RequestException $e) {
    // Ошибка запроса (4xx, 5xx)
    echo "Ошибка: " . $e->getMessage();
    
    if ($e->hasResponse()) {
        echo "Код: " . $e->getResponse()->getStatusCode();
        echo "Тело ответа: " . $e->getResponse()->getBody();
    }
}
```

### Таймауты и повторные попытки

```php
<?php
use GuzzleHttp\Client;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;

$stack = HandlerStack::create();

// Повторять запрос до 3 раз при ошибке
$stack->push(Middleware::retry(function ($retries, $request, $response, $exception) {
    return $retries < 3;
}));

$client = new Client([
    'handler' => $stack,
    'timeout' => 10,           // Таймаут 10 секунд
    'connect_timeout' => 5     // Таймаут подключения 5 секунд
]);

$response = $client->request('GET', 'https://slow-api.com/data');
```

### Асинхронные запросы

```php
<?php
use GuzzleHttp\Client;
use GuzzleHttp\Promise;

$client = new Client();

// Создаем несколько обещаний (promises)
$promises = [
    'github' => $client->getAsync('https://api.github.com/users/octocat'),
    'weather' => $client->getAsync('https://api.weather.com/data'),
    'news' => $client->getAsync('https://api.news.com/headlines')
];

// Ждем завершения всех запросов
$results = Promise\Utils::settle($promises)->wait();

foreach ($results as $key => $result) {
    if ($result['state'] === 'fulfilled') {
        echo "$key: " . $result['value']->getStatusCode() . "\n";
    } else {
        echo "$key failed: " . $result['reason']->getMessage() . "\n";
    }
}
```

### Практический пример: обертка над API погоды

```php
<?php
require 'vendor/autoload.php';

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

class WeatherService
{
    private $client;
    private $apiKey;
    private $baseUrl = 'https://api.openweathermap.org/data/2.5';

    public function __construct($apiKey)
    {
        $this->apiKey = $apiKey;
        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => 10
        ]);
    }

    public function getCurrentWeather($city)
    {
        try {
            $response = $this->client->request('GET', '/weather', [
                'query' => [
                    'q' => $city,
                    'appid' => $this->apiKey,
                    'units' => 'metric',
                    'lang' => 'ru'
                ]
            ]);

            $data = json_decode($response->getBody(), true);

            return [
                'city' => $data['name'],
                'temperature' => $data['main']['temp'],
                'feels_like' => $data['main']['feels_like'],
                'description' => $data['weather'][0]['description'],
                'humidity' => $data['main']['humidity'],
                'wind_speed' => $data['wind']['speed']
            ];
        } catch (RequestException $e) {
            return [
                'error' => 'Не удалось получить погоду',
                'message' => $e->getMessage()
            ];
        }
    }

    public function getForecast($city, $days = 5)
    {
        try {
            $response = $this->client->request('GET', '/forecast', [
                'query' => [
                    'q' => $city,
                    'appid' => $this->apiKey,
                    'units' => 'metric',
                    'cnt' => $days * 8  // API дает данные каждые 3 часа
                ]
            ]);

            $data = json_decode($response->getBody(), true);
            $forecast = [];

            foreach ($data['list'] as $item) {
                $forecast[] = [
                    'datetime' => $item['dt_txt'],
                    'temperature' => $item['main']['temp'],
                    'description' => $item['weather'][0]['description']
                ];
            }

            return $forecast;
        } catch (RequestException $e) {
            return ['error' => $e->getMessage()];
        }
    }
}

// Использование
$weather = new WeatherService('YOUR_API_KEY');

$current = $weather->getCurrentWeather('Moscow');
print_r($current);
/*
Array (
    [city] => Moscow
    [temperature] => -5.2
    [feels_like] => -8.1
    [description] => облачно с прояснениями
    [humidity] => 75
    [wind_speed] => 3.5
)
*/

$forecast = $weather->getForecast('Moscow', 3);
print_r($forecast);
```

---

## Сравнительная таблица пакетов

| Пакет | Решаемая проблема | Альтернативы |
|-------|-------------------|--------------|
| **phpdotenv** | Безопасное хранение настроек | symfony/dotenv |
| **monolog** | Логирование событий | Встроенный error_log, KLogger |
| **carbon** | Удобная работа с датами | DateTime, Chronos |
| **guzzle** | HTTP-запросы | cURL, file_get_contents, Symfony HttpClient |

---

## Практическое задание

### Задание 1: Система уведомлений

Создайте класс `NotificationService`, который:
1. Использует **phpdotenv** для хранения API-ключей
2. Использует **monolog** для логирования отправленных уведомлений
3. Использует **guzzle** для отправки уведомлений через Telegram API
4. Использует **carbon** для планирования отложенных уведомлений

**Структура:**

```php
class NotificationService
{
    public function sendImmediate($chatId, $message);
    public function schedule($chatId, $message, $sendAt);
    public function getScheduled();
}
```

### Задание 2: Погодный бот

Создайте консольное приложение, которое:
1. Запрашивает у пользователя город
2. Получает погоду через **guzzle** (OpenWeatherMap API)
3. Форматирует дату и время через **carbon**
4. Логирует все запросы через **monolog**
5. Хранит API-ключ в **.env**

### Задание 3: Мониторинг сайтов

Создайте скрипт, который:
1. Читает список URL из `.env`
2. Проверяет доступность каждого сайта через **guzzle**
3. Логирует результаты (время ответа, код статуса) через **monolog**
4. Если сайт недоступен > 5 минут, отправляет уведомление
5. Сохраняет timestamp последней проверки с **carbon**

---

## Частые ошибки

### ❌ Хранение .env в Git

```bash
# Неправильно
git add .env
git commit -m "Added config"
```

**Правильно:**
```bash
# .gitignore
.env

# Коммитим только шаблон
git add .env.example
```

### ❌ Не проверять наличие переменных окружения

```php
// Неправильно
$apiKey = $_ENV['API_KEY']; // Может быть не установлен!
```

**Правильно:**
```php
$dotenv->required('API_KEY');
// или
$apiKey = $_ENV['API_KEY'] ?? throw new Exception('API_KEY not set');
```

### ❌ Игнорирование исключений Guzzle

```php
// Неправильно
$response = $client->request('GET', $url);
$data = json_decode($response->getBody());
```

**Правильно:**
```php
try {
    $response = $client->request('GET', $url);
    $data = json_decode($response->getBody());
} catch (RequestException $e) {
    // Обработка ошибки
}
```

### ❌ Не использовать prepared statements с логами

```php
// Опасно!
$log->info("User $username logged in with password $password");
```

**Правильно:**
```php
$log->info('User logged in', ['username' => $username]); // Пароль НЕ логируем!
```

---

## Контрольные вопросы

1. **Почему нельзя хранить `.env` в Git?**
2. **Какие уровни логирования существуют в Monolog? Приведите примеры использования каждого.**
3. **В чем разница между `Carbon::now()` и `Carbon::today()`?**
4. **Как отправить POST-запрос с JSON через Guzzle?**
5. **Как настроить ротацию логов на 7 дней?**
6. **Как проверить, что дата находится в прошлом с помощью Carbon?**
7. **Как обработать 404 ошибку в Guzzle?**
8. **Зачем нужен `.env.example`?**

---

## Дополнительные ресурсы

- **phpdotenv**: https://github.com/vlucas/phpdotenv
- **Monolog**: https://github.com/Seldaek/monolog
- **Carbon**: https://carbon.nesbot.com/docs/
- **Guzzle**: https://docs.guzzlephp.org/

---

## Что дальше?

В следующей главе мы изучим **PSR-стандарты** — соглашения о стиле кода, которые используют все профессиональные PHP-разработчики. Вы узнаете, как писать код, который легко читать и поддерживать, и как автоматически проверять соблюдение стандартов.

Готовы писать код как в крупных компаниях? Переходите к **Главе 7.3: Стандарты PSR**! 🚀