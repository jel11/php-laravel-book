# Глава 7.1: Composer — установка, composer.json, require, autoload, packagist

## 📦 Теория: Что такое Composer и зачем он нужен

### Проблема, которую решает Composer

Представь, что ты пишешь приложение и тебе нужно:
- Отправлять email (библиотека PHPMailer)
- Работать с датами удобно (библиотека Carbon)
- Логировать ошибки (библиотека Monolog)
- Делать HTTP-запросы (библиотека Guzzle)

**Без Composer:**
```php
// Нужно вручную:
// 1. Найти каждую библиотеку на GitHub
// 2. Скачать ZIP-архив
// 3. Распаковать в папку проекта
// 4. Подключить через require_once

require_once 'libs/phpmailer/src/PHPMailer.php';
require_once 'libs/phpmailer/src/SMTP.php';
require_once 'libs/phpmailer/src/Exception.php';
require_once 'libs/carbon/src/Carbon.php';
require_once 'libs/monolog/src/Logger.php';
// И так для каждого файла каждой библиотеки...
```

**С Composer:**
```bash
composer require phpmailer/phpmailer
composer require nesbot/carbon
composer require monolog/monolog
composer require guzzlehttp/guzzle
```

```php
// И всё! Один файл подключает всё:
require 'vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use Carbon\Carbon;
use Monolog\Logger;
use GuzzleHttp\Client;
```

### Что такое Composer?

**Composer** — это менеджер зависимостей для PHP. Он:
1. **Устанавливает библиотеки** — одной командой скачивает нужный пакет
2. **Управляет версиями** — следит, чтобы версии библиотек были совместимы
3. **Обновляет зависимости** — одна команда обновляет все библиотеки
4. **Автозагружает классы** — генерирует автозагрузчик по стандарту PSR-4

---

## 🔧 Установка Composer

### Windows

1. **Скачай установщик:**
   - Перейди на [getcomposer.org](https://getcomposer.org/download/)
   - Скачай `Composer-Setup.exe`

2. **Запусти установщик:**
   - Выбери путь к `php.exe` (обычно `C:\php\php.exe`)
   - Нажми "Install"

3. **Проверь установку:**
```bash
composer --version
# Должно вывести: Composer version 2.x.x
```

### macOS / Linux

```bash
# Скачай установщик
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"

# Установи глобально
php composer-setup.php --install-dir=/usr/local/bin --filename=composer

# Удали установщик
php -r "unlink('composer-setup.php');"

# Проверь
composer --version
```

---

## 📄 composer.json — главный файл проекта

### Создание composer.json

**Интерактивный способ:**
```bash
composer init
```

Composer задаст вопросы:
```
Package name (<vendor>/<name>): jell/my-project
Description: My awesome PHP project
Author: Jell <jell@example.com>
Minimum Stability: stable
License: MIT
```

**Ручной способ:**
Создай файл `composer.json` в корне проекта:

```json
{
    "name": "jell/my-project",
    "description": "My awesome PHP project",
    "type": "project",
    "license": "MIT",
    "authors": [
        {
            "name": "Jell",
            "email": "jell@example.com"
        }
    ],
    "require": {
        "php": "^8.1"
    },
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        }
    }
}
```

### Структура composer.json

```json
{
    // Метаданные проекта
    "name": "vendor/package-name",        // Имя пакета
    "description": "Package description",  // Описание
    "type": "project",                     // Тип: project, library
    "license": "MIT",                      // Лицензия
    
    // Зависимости
    "require": {
        "php": "^8.1",                     // Минимальная версия PHP
        "monolog/monolog": "^3.0"          // Production-зависимости
    },
    
    "require-dev": {
        "phpunit/phpunit": "^10.0"         // Development-зависимости
    },
    
    // Автозагрузка
    "autoload": {
        "psr-4": {
            "App\\": "src/",               // Namespace App\ → папка src/
            "Database\\": "database/"      // Namespace Database\ → папка database/
        },
        "files": [
            "src/helpers.php"              // Файлы-хелперы
        ]
    },
    
    // Автозагрузка для тестов
    "autoload-dev": {
        "psr-4": {
            "Tests\\": "tests/"
        }
    },
    
    // Скрипты
    "scripts": {
        "test": "phpunit",
        "start": "php -S localhost:8000 -t public"
    }
}
```

---

## 📦 Установка пакетов: require и require-dev

### Основные команды

```bash
# Установить пакет в production
composer require vendor/package

# Установить пакет для разработки
composer require --dev vendor/package

# Примеры
composer require monolog/monolog          # Для логирования
composer require nesbot/carbon            # Для работы с датами
composer require guzzlehttp/guzzle        # Для HTTP-запросов

composer require --dev phpunit/phpunit    # Тестирование
composer require --dev symfony/var-dumper # Красивый var_dump()
```

### Что происходит при установке?

1. **Composer ищет пакет** на [packagist.org](https://packagist.org/)
2. **Скачивает последнюю стабильную версию**
3. **Обновляет composer.json:**
   ```json
   "require": {
       "monolog/monolog": "^3.5"
   }
   ```
4. **Создаёт/обновляет composer.lock** — точные версии всех зависимостей
5. **Скачивает пакет в папку vendor/**
6. **Генерирует автозагрузчик** в `vendor/autoload.php`

### Версионирование пакетов

```json
"require": {
    "vendor/package": "1.2.3",     // Точная версия
    "vendor/package": "^1.2.3",    // >= 1.2.3, < 2.0.0 (рекомендуется)
    "vendor/package": "~1.2.3",    // >= 1.2.3, < 1.3.0
    "vendor/package": ">=1.2.3",   // Любая версия >= 1.2.3
    "vendor/package": "1.2.*",     // 1.2.0, 1.2.1, 1.2.2, но не 1.3.0
    "vendor/package": "dev-main"   // Ветка main из Git
}
```

**Рекомендация:** Используй `^` (каретка) — это безопасное автообновление минорных версий.

---

## 🔄 Autoload: автоматическая загрузка классов

### PSR-4 стандарт

**До Composer (старый способ):**
```php
require_once 'src/Models/User.php';
require_once 'src/Models/Post.php';
require_once 'src/Controllers/UserController.php';
require_once 'src/Controllers/PostController.php';
// Для каждого класса...
```

**С Composer (PSR-4):**

1. **Настрой autoload в composer.json:**
```json
{
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        }
    }
}
```

2. **Сгенерируй автозагрузчик:**
```bash
composer dump-autoload
```

3. **Подключи один раз:**
```php
require 'vendor/autoload.php';

// Теперь классы загружаются автоматически!
use App\Models\User;
use App\Controllers\UserController;

$user = new User();
$controller = new UserController();
```

### Как работает PSR-4?

**Правило:** `Namespace\ClassName` → `BaseDirectory/ClassName.php`

```json
"autoload": {
    "psr-4": {
        "App\\": "src/"
    }
}
```

| Класс | Файл |
|-------|------|
| `App\Models\User` | `src/Models/User.php` |
| `App\Controllers\PostController` | `src/Controllers/PostController.php` |
| `App\Services\Email\MailService` | `src/Services/Email/MailService.php` |

**Пример структуры:**
```
project/
├── composer.json
├── vendor/
│   └── autoload.php
└── src/
    ├── Models/
    │   ├── User.php          → namespace App\Models;
    │   └── Post.php          → namespace App\Models;
    ├── Controllers/
    │   ├── UserController.php → namespace App\Controllers;
    │   └── PostController.php → namespace App\Controllers;
    └── Services/
        └── EmailService.php   → namespace App\Services;
```

### Автозагрузка файлов-хелперов

Иногда нужны функции, а не классы:

```json
"autoload": {
    "psr-4": {
        "App\\": "src/"
    },
    "files": [
        "src/helpers.php"
    ]
}
```

`src/helpers.php`:
```php
<?php

function dd($var) {
    var_dump($var);
    die();
}

function env($key, $default = null) {
    return $_ENV[$key] ?? $default;
}
```

Теперь эти функции доступны везде после `require 'vendor/autoload.php';`

---

## 🌐 Packagist — репозиторий PHP-пакетов

### Что такое Packagist?

[Packagist.org](https://packagist.org/) — главный репозиторий PHP-пакетов. Там более 400,000 пакетов!

### Поиск пакетов

**На сайте:**
- Перейди на [packagist.org](https://packagist.org/)
- Введи в поиск: "email", "logger", "http client"
- Смотри на:
  - **Downloads** — сколько раз скачали
  - **GitHub Stars** — популярность
  - **Last Update** — активность разработки

**Из терминала:**
```bash
composer search monolog
# monolog/monolog    Sends your logs to files, sockets, inboxes...
```

### Популярные пакеты

```bash
# Работа с окружением (.env файлы)
composer require vlucas/phpdotenv

# Логирование
composer require monolog/monolog

# Работа с датами
composer require nesbot/carbon

# HTTP-клиент
composer require guzzlehttp/guzzle

# Работа с изображениями
composer require intervention/image

# Фейковые данные
composer require fakerphp/faker

# PDF-генерация
composer require dompdf/dompdf

# Excel-файлы
composer require phpoffice/phpspreadsheet
```

---

## 🛠️ Основные команды Composer

```bash
# Создать composer.json
composer init

# Установить все зависимости из composer.json
composer install

# Обновить все пакеты до последних версий
composer update

# Обновить конкретный пакет
composer update vendor/package

# Удалить пакет
composer remove vendor/package

# Показать установленные пакеты
composer show

# Показать устаревшие пакеты
composer outdated

# Регенерировать автозагрузчик
composer dump-autoload

# Проверить валидность composer.json
composer validate

# Поиск пакетов
composer search keyword

# Запустить скрипт
composer run-script test
```

---

## 💡 Практические примеры

### Пример 1: Проект с логированием

**Шаг 1: Создай проект**
```bash
mkdir my-logger-app
cd my-logger-app
composer init --no-interaction
```

**Шаг 2: Установи Monolog**
```bash
composer require monolog/monolog
```

**Шаг 3: Настрой автозагрузку**
`composer.json`:
```json
{
    "require": {
        "monolog/monolog": "^3.5"
    },
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        }
    }
}
```

```bash
composer dump-autoload
```

**Шаг 4: Создай класс**
`src/Logger/AppLogger.php`:
```php
<?php

namespace App\Logger;

use Monolog\Logger;
use Monolog\Handler\StreamHandler;

class AppLogger
{
    private Logger $logger;
    
    public function __construct()
    {
        $this->logger = new Logger('app');
        $this->logger->pushHandler(
            new StreamHandler(__DIR__ . '/../../logs/app.log', Logger::DEBUG)
        );
    }
    
    public function info(string $message): void
    {
        $this->logger->info($message);
    }
    
    public function error(string $message): void
    {
        $this->logger->error($message);
    }
}
```

**Шаг 5: Используй**
`public/index.php`:
```php
<?php

require __DIR__ . '/../vendor/autoload.php';

use App\Logger\AppLogger;

$logger = new AppLogger();
$logger->info('Приложение запущено');
$logger->error('Произошла ошибка');

echo "Логи записаны в logs/app.log";
```

---

### Пример 2: Работа с датами через Carbon

```bash
composer require nesbot/carbon
```

`public/dates.php`:
```php
<?php

require __DIR__ . '/../vendor/autoload.php';

use Carbon\Carbon;

// Текущая дата
echo Carbon::now(); // 2026-01-29 15:30:45

// Парсинг
$date = Carbon::parse('2024-12-25');
echo $date->format('d.m.Y'); // 25.12.2024

// Операции с датами
$nextWeek = Carbon::now()->addWeek();
$yesterday = Carbon::yesterday();
$diff = Carbon::now()->diffInDays(Carbon::parse('2024-01-01'));

// Человекочитаемый формат
echo Carbon::now()->diffForHumans(); // "1 second ago"
echo Carbon::parse('2024-12-25')->diffForHumans(); // "1 month ago"

// Проверки
if (Carbon::now()->isWeekend()) {
    echo "Сегодня выходной!";
}
```

---

### Пример 3: HTTP-запросы с Guzzle

```bash
composer require guzzlehttp/guzzle
```

`src/Services/ApiClient.php`:
```php
<?php

namespace App\Services;

use GuzzleHttp\Client;

class ApiClient
{
    private Client $client;
    
    public function __construct()
    {
        $this->client = new Client([
            'base_uri' => 'https://jsonplaceholder.typicode.com/',
            'timeout' => 5.0,
        ]);
    }
    
    public function getUsers(): array
    {
        $response = $this->client->get('users');
        return json_decode($response->getBody(), true);
    }
    
    public function createPost(array $data): array
    {
        $response = $this->client->post('posts', [
            'json' => $data
        ]);
        
        return json_decode($response->getBody(), true);
    }
}
```

`public/api.php`:
```php
<?php

require __DIR__ . '/../vendor/autoload.php';

use App\Services\ApiClient;

$api = new ApiClient();

// GET запрос
$users = $api->getUsers();
echo "Получено пользователей: " . count($users) . "\n";

// POST запрос
$newPost = $api->createPost([
    'title' => 'Мой пост',
    'body' => 'Содержание поста',
    'userId' => 1
]);

echo "Создан пост с ID: " . $newPost['id'];
```

---

## ⚠️ Типичные ошибки

### 1. Не добавлять vendor/ в .gitignore

```bash
# .gitignore
/vendor/
composer.lock  # Только для библиотек, для приложений НЕ игнорируй!
```

**Правило:**
- **Приложения** — коммить `composer.lock` (фиксирует версии)
- **Библиотеки** — НЕ коммитить `composer.lock`

### 2. Забывать dump-autoload после изменений

```bash
# После добавления новых классов или изменения autoload:
composer dump-autoload
```

### 3. Использовать require вместо require-dev

```bash
# ✗ Неправильно
composer require phpunit/phpunit

# ✓ Правильно (это dev-зависимость)
composer require --dev phpunit/phpunit
```

### 4. Не проверять composer.lock в Git

```bash
# ✓ Для приложений ВСЕГДА коммить
git add composer.lock
git commit -m "Lock dependencies"
```

### 5. Забывать про namespace

```php
// ✗ Файл src/Models/User.php без namespace
class User { }

// ✓ Правильно
namespace App\Models;

class User { }
```

---

## 🎯 Упражнения

### Упражнение 1: Создай проект с библиотеками

1. Создай новый проект
2. Инициализируй Composer
3. Установи пакеты:
   - monolog/monolog
   - nesbot/carbon
   - fakerphp/faker (dev)
4. Настрой PSR-4 автозагрузку для `App\` → `src/`
5. Создай класс `App\Services\DataGenerator`, который:
   - Использует Faker для генерации случайных данных
   - Логирует через Monolog
   - Использует Carbon для дат

### Упражнение 2: Работа с API

1. Установи Guzzle
2. Создай класс `App\Services\WeatherService`
3. Сделай запрос к погодному API (например, wttr.in)
4. Распарси JSON-ответ
5. Залогируй результат через Monolog

### Упражнение 3: Файлы-хелперы

1. Создай файл `src/helpers.php`
2. Добавь функции:
   - `dd($var)` — var_dump + die
   - `formatDate($date)` — форматирование через Carbon
   - `logInfo($message)` — логирование
3. Настрой автозагрузку файла в composer.json
4. Используй функции в `public/index.php`

---

## 📝 Самопроверка

1. **Что такое Composer и зачем он нужен?**
2. **В чём разница между `require` и `require-dev`?**
3. **Что делает команда `composer dump-autoload`?**
4. **Как работает PSR-4 автозагрузка?**
5. **Почему `vendor/` не должна быть в Git?**
6. **Что такое composer.lock и зачем он нужен?**
7. **Как установить конкретную версию пакета?**
8. **Что означает `^1.2.3` в версии пакета?**

### Ответы

<details>
<summary>Показать ответы</summary>

1. **Менеджер зависимостей** для установки, обновления библиотек и автозагрузки классов
2. **require** — production-зависимости (нужны в продакшене), **require-dev** — только для разработки (тесты, отладка)
3. **Регенерирует автозагрузчик** — обновляет `vendor/autoload.php` после добавления новых классов
4. **Namespace → Папка:** `App\Models\User` автоматически ищется в `src/Models/User.php`
5. **Vendor/** содержит внешний код, который можно восстановить через `composer install`. Её хранение в Git увеличивает размер репозитория
6. **composer.lock** фиксирует точные версии всех зависимостей, чтобы у всех разработчиков было идентичное окружение
7. `composer require vendor/package:1.2.3` или изменить версию в composer.json
8. **Каретка (^)** разрешает обновления до следующей мажорной версии: `^1.2.3` = `>=1.2.3 <2.0.0`

</details>

---

## 🎓 Что дальше?

Теперь ты знаешь, как:
- ✅ Устанавливать и использовать Composer
- ✅ Управлять зависимостями проекта
- ✅ Настраивать PSR-4 автозагрузку
- ✅ Искать и устанавливать пакеты с Packagist

**Следующая глава:** [Глава 7.2: Полезные пакеты](следующая_глава.md) — разберём популярные библиотеки и научимся ими пользоваться.

---

**Готов двигаться дальше?** Попроси следующую главу или задай вопросы по этой! 🚀