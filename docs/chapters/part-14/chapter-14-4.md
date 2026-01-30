# Глава 14.4: CI/CD — GitHub Actions, автоматические тесты и деплой

## 🎯 Чему научимся

После этой главы ты:
- Поймёшь, что такое CI/CD и зачем это нужно
- Настроишь автоматические тесты в GitHub Actions
- Создашь pipeline для автоматического деплоя
- Научишься безопасно работать с секретами
- Узнаешь про best practices в автоматизации

---

## 📖 Что такое CI/CD

### Continuous Integration (CI)

**Непрерывная интеграция** — это практика, когда код автоматически тестируется при каждом коммите или pull request.

**Аналогия из жизни:**
Представь, что ты готовишь торт для праздника. Можно приготовить все слои, собрать торт и только потом попробовать — есть риск, что что-то пересолено или недопечено. А можно пробовать каждый слой отдельно — так ты сразу поймёшь, где проблема.

CI — это когда ты пробуешь каждый слой сразу после приготовления.

### Continuous Deployment/Delivery (CD)

**Непрерывная доставка** — автоматическое развёртывание кода на сервер после успешных тестов.

- **Continuous Delivery** — код готов к деплою, но кнопку жмёт человек
- **Continuous Deployment** — всё происходит автоматически

---

## 🔧 GitHub Actions — основы

GitHub Actions — это встроенный CI/CD сервис от GitHub. Бесплатно для публичных репозиториев.

### Структура проекта

```
my-laravel-app/
├── .github/
│   └── workflows/
│       ├── tests.yml          # CI - тесты
│       ├── deploy.yml         # CD - деплой
│       └── code-quality.yml   # Проверка качества кода
├── app/
├── tests/
└── ...
```

### Базовые концепции

**Workflow** — процесс автоматизации (файл `.yml`)
**Job** — набор шагов, выполняется на одной машине
**Step** — отдельное действие (запуск команды, использование action)
**Runner** — виртуальная машина, где выполняется job

---

## 🧪 Настройка автоматических тестов

### Простой workflow для тестов

`.github/workflows/tests.yml`:

```yaml
name: Tests

# Когда запускать
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  laravel-tests:
    # На какой ОС запускать
    runs-on: ubuntu-latest

    # Сервисы (например, MySQL)
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: testing
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
      # Шаг 1: Клонировать код
      - name: Checkout code
        uses: actions/checkout@v4

      # Шаг 2: Настроить PHP
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: 8.2
          extensions: mbstring, pdo, pdo_mysql, xml, bcmath
          coverage: xdebug

      # Шаг 3: Установить зависимости
      - name: Install Composer dependencies
        run: composer install --prefer-dist --no-progress --no-interaction

      # Шаг 4: Подготовить окружение
      - name: Prepare environment
        run: |
          cp .env.example .env
          php artisan key:generate

      # Шаг 5: Запустить миграции
      - name: Run migrations
        env:
          DB_CONNECTION: mysql
          DB_HOST: 127.0.0.1
          DB_PORT: 3306
          DB_DATABASE: testing
          DB_USERNAME: root
          DB_PASSWORD: password
        run: php artisan migrate --force

      # Шаг 6: Запустить тесты
      - name: Execute tests
        env:
          DB_CONNECTION: mysql
          DB_HOST: 127.0.0.1
          DB_PORT: 3306
          DB_DATABASE: testing
          DB_USERNAME: root
          DB_PASSWORD: password
        run: php artisan test --coverage

      # Шаг 7: Загрузить отчёт о покрытии (опционально)
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        if: success()
```

### Что происходит

1. **Trigger** — workflow запускается при push или PR в main/develop
2. **Runner** — поднимается Ubuntu с PHP и MySQL
3. **Dependencies** — устанавливаются Composer пакеты
4. **Database** — запускаются миграции на тестовой БД
5. **Tests** — выполняются тесты с отчётом о покрытии
6. **Report** — результаты отправляются в Codecov (опционально)

---

## 🎨 Проверка качества кода

`.github/workflows/code-quality.yml`:

```yaml
name: Code Quality

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  code-style:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: 8.2
          tools: php-cs-fixer, phpstan

      - name: Install dependencies
        run: composer install --prefer-dist --no-progress

      # PHP CS Fixer - проверка стиля кода
      - name: Check code style
        run: vendor/bin/php-cs-fixer fix --dry-run --diff

      # PHPStan - статический анализ
      - name: Run static analysis
        run: vendor/bin/phpstan analyse

      # Pint (Laravel) - альтернатива CS Fixer
      - name: Run Laravel Pint
        run: vendor/bin/pint --test
```

### Конфигурация для Pint

`pint.json`:

```json
{
    "preset": "laravel",
    "rules": {
        "simplified_null_return": true,
        "braces": false,
        "new_with_braces": {
            "anonymous_class": false,
            "named_class": false
        }
    }
}
```

### Конфигурация для PHPStan

`phpstan.neon`:

```neon
parameters:
    level: 5
    paths:
        - app
        - config
        - database
        - routes
    excludePaths:
        - vendor
    checkMissingIterableValueType: false
```

---

## 🚀 Автоматический деплой

### Простой деплой через SSH

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  # Или ручной запуск
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      # Деплой через SSH
      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: 22
          script: |
            cd /var/www/my-app
            git pull origin main
            composer install --no-dev --optimize-autoloader
            php artisan migrate --force
            php artisan config:cache
            php artisan route:cache
            php artisan view:cache
            php artisan queue:restart
            sudo systemctl reload php8.2-fpm
```

### Деплой с zero-downtime

```yaml
name: Zero-Downtime Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy via Deployer
        uses: deployphp/action@v1
        with:
          private-key: ${{ secrets.SSH_PRIVATE_KEY }}
          dep: deploy production
```

`deploy.php` (Deployer):

```php
<?php

namespace Deployer;

require 'recipe/laravel.php';

// Настройки проекта
set('application', 'My Laravel App');
set('repository', 'git@github.com:username/my-app.git');
set('keep_releases', 5);

// Сервер
host('production')
    ->set('hostname', getenv('SERVER_HOST'))
    ->set('remote_user', getenv('SERVER_USER'))
    ->set('deploy_path', '/var/www/my-app');

// Что деплоить
set('shared_files', [
    '.env',
]);

set('shared_dirs', [
    'storage',
]);

set('writable_dirs', [
    'bootstrap/cache',
    'storage',
    'storage/app',
    'storage/app/public',
    'storage/framework',
    'storage/framework/cache',
    'storage/framework/sessions',
    'storage/framework/views',
    'storage/logs',
]);

// Задачи после деплоя
after('deploy:vendors', 'artisan:storage:link');
after('deploy:publish', 'artisan:migrate');
after('deploy:publish', 'artisan:config:cache');
after('deploy:publish', 'artisan:route:cache');
after('deploy:publish', 'artisan:view:cache');
after('deploy:publish', 'artisan:queue:restart');
after('deploy:publish', 'php-fpm:reload');

// Перезагрузка PHP-FPM
task('php-fpm:reload', function () {
    run('sudo systemctl reload php8.2-fpm');
});
```

---

## 🔐 Работа с секретами

### Добавление секретов в GitHub

1. Открой репозиторий на GitHub
2. Settings → Secrets and variables → Actions
3. New repository secret
4. Добавь:
   - `SERVER_HOST` — IP или домен сервера
   - `SERVER_USER` — пользователь SSH
   - `SSH_PRIVATE_KEY` — приватный ключ SSH
   - `DB_PASSWORD` — пароль от БД (если нужно)

### Использование в workflow

```yaml
steps:
  - name: Use secrets
    env:
      DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
      API_KEY: ${{ secrets.API_KEY }}
    run: |
      echo "Connecting to database..."
      # Секреты автоматически маскируются в логах
```

### ⚠️ Важно про безопасность

```yaml
# ❌ ПЛОХО - секрет в логах
- name: Show password
  run: echo "Password is ${{ secrets.DB_PASSWORD }}"

# ✅ ХОРОШО - секрет только в env
- name: Use password
  env:
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
  run: ./script-that-uses-env.sh
```

---

## 🎯 Продвинутые сценарии

### Matrix strategy — тесты на разных версиях PHP

```yaml
name: Tests Matrix

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      fail-fast: false
      matrix:
        php: [8.1, 8.2, 8.3]
        laravel: [10.*, 11.*]
        exclude:
          - php: 8.1
            laravel: 11.*

    name: PHP ${{ matrix.php }} - Laravel ${{ matrix.laravel }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ matrix.php }}
          extensions: mbstring, pdo, pdo_mysql

      - name: Install dependencies
        run: |
          composer require "laravel/framework:${{ matrix.laravel }}" --no-update
          composer update --prefer-dist --no-progress

      - name: Execute tests
        run: php artisan test
```

### Условные деплои

```yaml
name: Deploy

on:
  push:
    branches: [ main, develop ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Деплой на staging, если develop
      - name: Deploy to Staging
        if: github.ref == 'refs/heads/develop'
        run: ./deploy-staging.sh

      # Деплой на production, если main
      - name: Deploy to Production
        if: github.ref == 'refs/heads/main'
        run: ./deploy-production.sh
```

### Уведомления в Slack/Telegram

```yaml
- name: Notify Slack on success
  if: success()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: '✅ Deploy successful!'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}

- name: Notify on failure
  if: failure()
  uses: appleboy/telegram-action@master
  with:
    to: ${{ secrets.TELEGRAM_CHAT_ID }}
    token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
    message: |
      ❌ Deploy failed!
      
      Commit: ${{ github.sha }}
      Author: ${{ github.actor }}
```

---

## 🏗️ Полный пример production-ready workflow

`.github/workflows/production.yml`:

```yaml
name: Production Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  PHP_VERSION: 8.2
  NODE_VERSION: 18

jobs:
  # Job 1: Тесты
  tests:
    name: Run Tests
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: testing
        ports:
          - 3306:3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=3

      redis:
        image: redis:alpine
        ports:
          - 6379:6379
        options: --health-cmd "redis-cli ping" --health-interval 10s --health-timeout 5s --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ env.PHP_VERSION }}
          extensions: mbstring, pdo, pdo_mysql, redis, bcmath
          coverage: xdebug
          tools: composer:v2

      - name: Cache Composer dependencies
        uses: actions/cache@v3
        with:
          path: vendor
          key: composer-${{ hashFiles('**/composer.lock') }}
          restore-keys: composer-

      - name: Install PHP dependencies
        run: composer install --prefer-dist --no-progress --no-interaction

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Cache NPM dependencies
        uses: actions/cache@v3
        with:
          path: node_modules
          key: npm-${{ hashFiles('**/package-lock.json') }}
          restore-keys: npm-

      - name: Install NPM dependencies
        run: npm ci

      - name: Build assets
        run: npm run build

      - name: Prepare environment
        run: |
          cp .env.example .env
          php artisan key:generate

      - name: Run migrations
        env:
          DB_CONNECTION: mysql
          DB_HOST: 127.0.0.1
          DB_PORT: 3306
          DB_DATABASE: testing
          DB_USERNAME: root
          DB_PASSWORD: password
          REDIS_HOST: 127.0.0.1
          REDIS_PORT: 6379
        run: php artisan migrate --force

      - name: Execute tests
        env:
          DB_CONNECTION: mysql
          DB_HOST: 127.0.0.1
          DB_PORT: 3306
          DB_DATABASE: testing
          DB_USERNAME: root
          DB_PASSWORD: password
          REDIS_HOST: 127.0.0.1
          REDIS_PORT: 6379
        run: php artisan test --parallel --coverage --min=80

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        if: success()

  # Job 2: Качество кода
  code-quality:
    name: Code Quality
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ env.PHP_VERSION }}
          tools: php-cs-fixer, phpstan

      - name: Install dependencies
        run: composer install --prefer-dist --no-progress

      - name: Run PHP CS Fixer
        run: vendor/bin/php-cs-fixer fix --dry-run --diff --verbose

      - name: Run PHPStan
        run: vendor/bin/phpstan analyse --memory-limit=2G

      - name: Run Laravel Pint
        run: vendor/bin/pint --test

  # Job 3: Security check
  security:
    name: Security Check
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ env.PHP_VERSION }}

      - name: Install dependencies
        run: composer install --prefer-dist --no-progress

      - name: Check for security vulnerabilities
        run: composer audit

  # Job 4: Деплой (только на main и после успешных тестов)
  deploy:
    name: Deploy to Production
    needs: [tests, code-quality, security]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ env.PHP_VERSION }}

      - name: Install Deployer
        run: |
          curl -LO https://deployer.org/deployer.phar
          chmod +x deployer.phar
          sudo mv deployer.phar /usr/local/bin/dep

      - name: Deploy to server
        env:
          SERVER_HOST: ${{ secrets.SERVER_HOST }}
          SERVER_USER: ${{ secrets.SERVER_USER }}
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
        run: |
          mkdir -p ~/.ssh
          echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H $SERVER_HOST >> ~/.ssh/known_hosts
          dep deploy production -vvv

      - name: Notify success
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: '✅ Deploy to production successful!'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

      - name: Notify failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          text: '❌ Deploy to production failed!'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 🐛 Частые проблемы и решения

### Проблема 1: Тесты падают только в CI

```yaml
# Проблема: разные версии PHP/MySQL/Redis

# Решение: точно указывай версии
services:
  mysql:
    image: mysql:8.0  # Конкретная версия, а не latest

- name: Setup PHP
  uses: shivammathur/setup-php@v2
  with:
    php-version: 8.2  # Точная версия, как на production
```

### Проблема 2: Долгие тесты

```yaml
# Решение 1: Кэширование зависимостей
- name: Cache Composer
  uses: actions/cache@v3
  with:
    path: vendor
    key: ${{ runner.os }}-composer-${{ hashFiles('**/composer.lock') }}

# Решение 2: Параллельные тесты
- name: Run tests
  run: php artisan test --parallel

# Решение 3: Разделить на несколько jobs
jobs:
  unit-tests:
    ...
  feature-tests:
    ...
  browser-tests:
    ...
```

### Проблема 3: Деплой ломает сайт

```yaml
# Решение 1: Проверка перед деплоем
- name: Health check before deploy
  run: curl --fail https://my-app.com/health || exit 1

# Решение 2: Автоматический rollback
- name: Deploy
  id: deploy
  run: dep deploy production

- name: Rollback on failure
  if: failure() && steps.deploy.outcome == 'failure'
  run: dep rollback production

# Решение 3: Blue-Green или Canary deployment
```

### Проблема 4: Секреты в логах

```yaml
# ❌ ПЛОХО
- run: echo ${{ secrets.DB_PASSWORD }}

# ✅ ХОРОШО
- run: ./script.sh
  env:
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
```

---

## 📋 Чеклист готовности CI/CD

### Минимальный набор

- [ ] Тесты запускаются автоматически при PR
- [ ] Проверка стиля кода (Pint/CS Fixer)
- [ ] Статический анализ (PHPStan)
- [ ] Защита main ветки (требуются успешные проверки)
- [ ] Автоматический деплой на staging при push в develop

### Продвинутый уровень

- [ ] Тесты с покрытием кода (>80%)
- [ ] Проверка безопасности (composer audit)
- [ ] Тесты на нескольких версиях PHP/Laravel
- [ ] Zero-downtime деплой
- [ ] Автоматический rollback при ошибках
- [ ] Уведомления в Slack/Telegram
- [ ] Мониторинг после деплоя
- [ ] Кэширование зависимостей
- [ ] Параллельные тесты
- [ ] Деплой через Deployer/Envoyer

---

## 🎓 Практическое задание

### Задание 1: Настройка базового CI

Создай workflow для своего проекта:

1. Тесты запускаются при push и PR
2. Используется MySQL и Redis
3. Проверяется стиль кода
4. Результаты отправляются в Codecov

<details>
<summary>💡 Решение</summary>

```yaml
name: CI

on: [push, pull_request]

jobs:
  tests:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: testing
        ports:
          - 3306:3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=3

      redis:
        image: redis:alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: 8.2
          extensions: mbstring, pdo, pdo_mysql, redis
          coverage: xdebug

      - name: Install dependencies
        run: composer install --prefer-dist --no-interaction

      - name: Prepare environment
        run: |
          cp .env.example .env
          php artisan key:generate

      - name: Run migrations
        env:
          DB_CONNECTION: mysql
          DB_HOST: 127.0.0.1
          DB_DATABASE: testing
          DB_USERNAME: root
          DB_PASSWORD: password
        run: php artisan migrate

      - name: Execute tests
        env:
          DB_CONNECTION: mysql
          DB_HOST: 127.0.0.1
          DB_DATABASE: testing
          DB_USERNAME: root
          DB_PASSWORD: password
          REDIS_HOST: 127.0.0.1
        run: php artisan test --coverage

      - name: Check code style
        run: vendor/bin/pint --test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

</details>

### Задание 2: Автоматический деплой

Настрой деплой на VPS:

1. При push в main → деплой на production
2. При push в develop → деплой на staging
3. Уведомление в Telegram при успехе/ошибке

<details>
<summary>💡 Решение</summary>

```yaml
name: Deploy

on:
  push:
    branches: [main, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Production
        if: github.ref == 'refs/heads/main'
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/production
            git pull origin main
            composer install --no-dev --optimize-autoloader
            php artisan migrate --force
            php artisan config:cache
            php artisan route:cache
            php artisan view:cache
            sudo systemctl reload php8.2-fpm

      - name: Deploy to Staging
        if: github.ref == 'refs/heads/develop'
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/staging
            git pull origin develop
            composer install --optimize-autoloader
            php artisan migrate --force
            php artisan config:cache

      - name: Notify Telegram on success
        if: success()
        uses: appleboy/telegram-action@master
        with:
          to: ${{ secrets.TELEGRAM_CHAT_ID }}
          token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          message: |
            ✅ Deploy успешен!
            
            Окружение: ${{ github.ref == 'refs/heads/main' && 'Production' || 'Staging' }}
            Commit: ${{ github.sha }}
            Автор: ${{ github.actor }}

      - name: Notify Telegram on failure
        if: failure()
        uses: appleboy/telegram-action@master
        with:
          to: ${{ secrets.TELEGRAM_CHAT_ID }}
          token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          message: |
            ❌ Deploy провалился!
            
            Окружение: ${{ github.ref == 'refs/heads/main' && 'Production' || 'Staging' }}
            Commit: ${{ github.sha }}
            Автор: ${{ github.actor }}
```

</details>

### Задание 3: Matrix тесты

Настрой тесты на PHP 8.1, 8.2, 8.3 и Laravel 10, 11:

<details>
<summary>💡 Решение</summary>

```yaml
name: Matrix Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      fail-fast: false
      matrix:
        php: ['8.1', '8.2', '8.3']
        laravel: ['10.*', '11.*']
        exclude:
          - php: '8.1'
            laravel: '11.*'

    name: PHP ${{ matrix.php }} - Laravel ${{ matrix.laravel }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ matrix.php }}
          extensions: mbstring, pdo, pdo_mysql

      - name: Install dependencies
        run: |
          composer require "laravel/framework:${{ matrix.laravel }}" --no-update
          composer update --prefer-dist --no-interaction

      - name: Execute tests
        run: php artisan test
```

</details>

---

## 📚 Полезные ресурсы

### Официальная документация
- [GitHub Actions](https://docs.github.com/en/actions)
- [Laravel Deployment](https://laravel.com/docs/deployment)
- [Deployer](https://deployer.org/docs/7.x/getting-started)

### Готовые Actions
- [shivammathur/setup-php](https://github.com/shivammathur/setup-php)
- [appleboy/ssh-action](https://github.com/appleboy/ssh-action)
- [codecov/codecov-action](https://github.com/codecov/codecov-action)
- [8398a7/action-slack](https://github.com/8398a7/action-slack)

### Сервисы для CI/CD
- **GitHub Actions** — встроенный, бесплатно для публичных репо
- **GitLab CI** — если используешь GitLab
- **Bitbucket Pipelines** — для Bitbucket
- **Travis CI** — классика
- **Circle CI** — популярная альтернатива

### Деплой-сервисы
- **Laravel Forge** — управление серверами и деплой
- **Laravel Envoyer** — zero-downtime деплои
- **Ploi** — альтернатива Forge
- **Deployer** — open-source инструмент

---

## 🎯 Что дальше?

Ты освоил основы CI/CD! Теперь можешь:

1. **Автоматизировать рутину** — тесты, проверки, деплои
2. **Повысить качество** — код проверяется автоматически
3. **Деплоить уверенно** — если тесты прошли, всё ок
4. **Экономить время** — деплой одной кнопкой

### Следующие шаги:

- **Изучи Docker глубже** — контейнеризация всего
- **Настрой мониторинг** — логи, метрики, алерты
- **Попробуй Kubernetes** — если проект большой
- **Изучи Infrastructure as Code** — Terraform, Ansible

---

## 🎓 Проверь себя

<details>
<summary>1. Что такое CI/CD?</summary>

**CI (Continuous Integration)** — непрерывная интеграция, когда код автоматически тестируется при каждом изменении.

**CD (Continuous Delivery/Deployment)** — непрерывная доставка/развёртывание кода на сервера после успешных тестов.
</details>

<details>
<summary>2. Чем отличается Continuous Delivery от Continuous Deployment?</summary>

- **Continuous Delivery** — код готов к деплою, но финальное решение принимает человек
- **Continuous Deployment** — код деплоится автоматически сразу после прохождения тестов
</details>

<details>
<summary>3. Когда лучше использовать matrix strategy?</summary>

Когда нужно протестировать код на разных версиях PHP, Laravel, базах данных или ОС. Например, убедиться, что приложение работает на PHP 8.1, 8.2 и 8.3.
</details>

<details>
<summary>4. Почему важно кэшировать зависимости в CI?</summary>

Установка зависимостей (composer install, npm install) занимает много времени. Кэш позволяет переиспользовать уже скачанные пакеты и ускоряет workflow в разы.
</details>

<details>
<summary>5. Как защитить секреты в GitHub Actions?</summary>

- Использовать GitHub Secrets (Settings → Secrets)
- Никогда не выводить секреты в echo или логи
- Передавать через переменные окружения
- GitHub автоматически маскирует секреты в логах
</details>

---

## 🎉 Итоги главы

Теперь ты умеешь:

- ✅ Настраивать автоматические тесты в GitHub Actions
- ✅ Проверять качество и безопасность кода автоматически
- ✅ Деплоить приложение на сервер одной кнопкой
- ✅ Работать с секретами безопасно
- ✅ Использовать matrix для тестов на разных версиях
- ✅ Настраивать уведомления и мониторинг
- ✅ Применять best practices в CI/CD

**CI/CD — это не роскошь, а необходимость.** Даже если ты работаешь один, автоматизация избавит от кучи рутины и уберёт человеческий фактор.

Помни: **если тесты не запускаются автоматически, они не запускаются вообще.**

Удачи в автоматизации! 🚀