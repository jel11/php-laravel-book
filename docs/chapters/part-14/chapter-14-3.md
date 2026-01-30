# Глава 14.3: Деплой Laravel — VPS, Nginx, настройка production, SSL

## 🎯 Цель главы

Научиться разворачивать Laravel-приложение на реальном сервере: от чистого VPS до работающего сайта с SSL. Поймём разницу между development и production, настроим Nginx, автоматизируем деплой.

---

## 📖 Содержание

1. [Development vs Production — ключевые различия](#1-development-vs-production)
2. [Выбор и настройка VPS](#2-выбор-и-настройка-vps)
3. [Установка необходимого ПО](#3-установка-необходимого-по)
4. [Настройка Nginx для Laravel](#4-настройка-nginx-для-laravel)
5. [Деплой приложения](#5-деплой-приложения)
6. [SSL-сертификат (Let's Encrypt)](#6-ssl-сертификат)
7. [Оптимизация production](#7-оптимизация-production)
8. [Автоматизация деплоя](#8-автоматизация-деплоя)
9. [Мониторинг и логи](#9-мониторинг-и-логи)
10. [Практика](#10-практика)

---

## 1. Development vs Production

### 🔍 Чем отличается production от разработки?

**Development (разработка)**:
```env
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

# Показываем все ошибки
# Hot reload работает
# Файлы не кешируются
# Используем SQLite или локальную MySQL
```

**Production (прод)**:
```env
APP_ENV=production
APP_DEBUG=false  # ❗️ КРИТИЧНО
APP_URL=https://yoursite.com

# Ошибки логируются, но не показываются
# Всё закешировано
# Оптимизированные автозагрузчики
# Реальная база данных
# HTTPS обязателен
```

### ⚠️ Главные опасности production

```php
// ❌ НИКОГДА в production
APP_DEBUG=true  // Раскрывает структуру кода, пути, переменные

// ❌ Небезопасно
DB_PASSWORD=password
APP_KEY=base64:... // Одинаковый на dev и prod

// ❌ Оставлять тестовые данные
Route::get('/phpinfo', fn() => phpinfo());
```

**Что произойдёт если `APP_DEBUG=true` в проде?**

```
Пользователь получает 500 ошибку:

❌ С DEBUG=true:
"SQLSTATE[42S02]: Table 'users' not found"
/var/www/app/Models/User.php:45
Array ( [password] => secret123 )

✅ С DEBUG=false:
"500 | Server Error"
```

Злоумышленник видит структуру БД, пути к файлам, иногда пароли!

---

## 2. Выбор и настройка VPS

### 📦 Что такое VPS?

**VPS (Virtual Private Server)** — виртуальный выделенный сервер. У вас есть root-доступ, свой IP, вы сами устанавливаете всё ПО.

**Популярные провайдеры**:
- DigitalOcean (от $6/месяц)
- Vultr (от $5/месяц)
- Hetzner (от €4/месяц)
- Timeweb, Beget (российские, от 200₽/месяц)

### 🖥️ Минимальные требования для Laravel

```
CPU: 1 core (2+ лучше)
RAM: 1GB (2GB оптимально)
Disk: 25GB SSD
OS: Ubuntu 22.04 LTS
```

### 🔐 Первоначальная настройка сервера

**1. Подключение по SSH**

```bash
# Получили IP при создании VPS, например 203.0.113.42
ssh root@203.0.113.42

# Вводим пароль (пришёл на email)
```

**2. Обновление системы**

```bash
apt update
apt upgrade -y
```

**3. Создание пользователя (не работать из root!)**

```bash
# Создаём пользователя
adduser deploy
# Задаём пароль, остальное можно пропустить

# Даём права sudo
usermod -aG sudo deploy

# Переключаемся на нового пользователя
su - deploy
```

**4. Настройка SSH-ключей (безопаснее пароля)**

На вашем локальном компьютере:
```bash
# Генерируем ключ (если нет)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Копируем публичный ключ на сервер
ssh-copy-id deploy@203.0.113.42
```

Теперь можно заходить без пароля:
```bash
ssh deploy@203.0.113.42
```

**5. Отключаем вход по паролю**

```bash
sudo nano /etc/ssh/sshd_config

# Находим и меняем:
PasswordAuthentication no
PermitRootLogin no

# Сохраняем (Ctrl+O, Enter, Ctrl+X)
sudo systemctl restart sshd
```

---

## 3. Установка необходимого ПО

### 📚 Что нужно для Laravel?

1. **PHP 8.2+** с расширениями
2. **Composer**
3. **Nginx** (веб-сервер)
4. **MySQL** (база данных)
5. **Redis** (кеш и очереди, опционально)
6. **Node.js** (для сборки фронтенда)

### 🔧 Установка PHP

```bash
# Добавляем репозиторий с последним PHP
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# Устанавливаем PHP 8.2 и расширения
sudo apt install php8.2-fpm php8.2-cli php8.2-mysql php8.2-mbstring \
  php8.2-xml php8.2-curl php8.2-zip php8.2-gd php8.2-bcmath \
  php8.2-intl php8.2-redis -y

# Проверяем
php -v
# PHP 8.2.15 (cli) ...
```

### 🎼 Установка Composer

```bash
# Скачиваем установщик
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"

# Устанавливаем глобально
sudo php composer-setup.php --install-dir=/usr/local/bin --filename=composer

# Удаляем установщик
php -r "unlink('composer-setup.php');"

# Проверяем
composer --version
```

### 🌐 Установка Nginx

```bash
sudo apt install nginx -y

# Проверяем статус
sudo systemctl status nginx

# Должно быть: active (running)
```

Открываем в браузере IP сервера (http://203.0.113.42) — должна появиться страница "Welcome to nginx!"

### 🗄️ Установка MySQL

```bash
sudo apt install mysql-server -y

# Безопасная настройка
sudo mysql_secure_installation

# Отвечаем на вопросы:
# - Set root password? Yes → вводим пароль
# - Remove anonymous users? Yes
# - Disallow root login remotely? Yes
# - Remove test database? Yes
# - Reload privilege tables? Yes
```

**Создаём базу данных для Laravel**:

```bash
sudo mysql

# В MySQL консоли:
CREATE DATABASE laravel_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'laravel_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON laravel_app.* TO 'laravel_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 📦 Установка Redis (опционально, но рекомендуется)

```bash
sudo apt install redis-server -y

# Настраиваем автозапуск
sudo systemctl enable redis-server

# Проверяем
redis-cli ping
# PONG
```

### 🟢 Установка Node.js (для сборки assets)

```bash
# Устанавливаем Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y

# Проверяем
node -v
npm -v
```

---

## 4. Настройка Nginx для Laravel

### 📁 Структура директорий

```bash
# Создаём директорию для приложения
sudo mkdir -p /var/www/laravel-app
sudo chown -R deploy:deploy /var/www/laravel-app
```

### ⚙️ Конфигурация Nginx

```bash
# Создаём конфиг для нашего сайта
sudo nano /etc/nginx/sites-available/laravel-app
```

**Базовая конфигурация**:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yoursite.com www.yoursite.com;
    
    root /var/www/laravel-app/public;
    index index.php index.html;

    # Логи
    access_log /var/log/nginx/laravel-app-access.log;
    error_log /var/log/nginx/laravel-app-error.log;

    # Лимиты
    client_max_body_size 20M;

    # Основная логика роутинга Laravel
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Обработка PHP
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Запрет доступа к скрытым файлам
    location ~ /\.(?!well-known).* {
        deny all;
    }

    # Кеширование статики
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 🔗 Активация конфига

```bash
# Создаём символическую ссылку
sudo ln -s /etc/nginx/sites-available/laravel-app /etc/nginx/sites-enabled/

# Удаляем дефолтный конфиг
sudo rm /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
sudo nginx -t

# Если всё ОК:
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Перезапускаем Nginx
sudo systemctl reload nginx
```

### 🎯 Настройка PHP-FPM для production

```bash
sudo nano /etc/php/8.2/fpm/pool.d/www.conf

# Находим и меняем:
pm = dynamic
pm.max_children = 50
pm.start_servers = 5
pm.min_spare_servers = 5
pm.max_spare_servers = 35
pm.max_requests = 500

# Перезапускаем
sudo systemctl reload php8.2-fpm
```

---

## 5. Деплой приложения

### 📤 Способ 1: Git (рекомендуется)

**На сервере**:

```bash
cd /var/www/laravel-app

# Клонируем репозиторий
git clone https://github.com/yourusername/your-laravel-app.git .

# Устанавливаем зависимости
composer install --optimize-autoloader --no-dev

# Копируем .env
cp .env.example .env
nano .env
```

**Настраиваем .env**:

```env
APP_NAME="Laravel App"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yoursite.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=laravel_app
DB_USERNAME=laravel_user
DB_PASSWORD=strong_password_here

CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

**Генерируем ключ и настраиваем права**:

```bash
# Генерируем APP_KEY
php artisan key:generate

# Запускаем миграции
php artisan migrate --force

# Собираем фронтенд
npm install
npm run build

# Настраиваем права
sudo chown -R deploy:www-data /var/www/laravel-app
sudo chmod -R 775 /var/www/laravel-app/storage
sudo chmod -R 775 /var/www/laravel-app/bootstrap/cache
```

### 📤 Способ 2: Деплоер (Laravel Deployer)

```bash
# На локальной машине
composer require deployer/deployer --dev

# Инициализация
php vendor/bin/dep init

# Редактируем deploy.php
```

**deploy.php**:

```php
<?php
namespace Deployer;

require 'recipe/laravel.php';

set('application', 'Laravel App');
set('repository', 'git@github.com:yourusername/your-laravel-app.git');
set('keep_releases', 3);

host('production')
    ->setHostname('203.0.113.42')
    ->setRemoteUser('deploy')
    ->setDeployPath('/var/www/laravel-app');

// Хуки
after('deploy:failed', 'deploy:unlock');

// Задача для оптимизации
task('artisan:optimize', function () {
    run('cd {{release_path}} && php artisan config:cache');
    run('cd {{release_path}} && php artisan route:cache');
    run('cd {{release_path}} && php artisan view:cache');
});

after('deploy:symlink', 'artisan:optimize');
```

**Деплой**:

```bash
# Первый деплой
php vendor/bin/dep deploy production

# Последующие деплои
php vendor/bin/dep deploy production
```

---

## 6. SSL-сертификат

### 🔒 Зачем нужен SSL?

- **Безопасность**: шифрование данных между клиентом и сервером
- **SEO**: Google понижает сайты без HTTPS
- **Доверие**: браузеры показывают "Небезопасно" без SSL
- **Обязателен** для cookies с флагом Secure

### 🆓 Let's Encrypt (бесплатный SSL)

**Установка Certbot**:

```bash
sudo apt install certbot python3-certbot-nginx -y
```

**Получение сертификата**:

```bash
# Certbot автоматически настроит Nginx
sudo certbot --nginx -d yoursite.com -d www.yoursite.com

# Отвечаем на вопросы:
# Email: your@email.com
# Agree to ToS: Yes
# Share email: No (optional)
# Redirect HTTP to HTTPS: Yes
```

**Что делает Certbot**:

1. Получает сертификат от Let's Encrypt
2. Настраивает Nginx для HTTPS
3. Настраивает автоматическое продление (каждые 90 дней)

**Проверка автопродления**:

```bash
sudo certbot renew --dry-run

# Если всё ОК:
# Congratulations, all simulated renewals succeeded
```

### 📜 Nginx конфиг после SSL

```bash
sudo nano /etc/nginx/sites-available/laravel-app
```

Certbot изменит конфиг примерно так:

```nginx
# HTTP → HTTPS редирект
server {
    listen 80;
    listen [::]:80;
    server_name yoursite.com www.yoursite.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yoursite.com www.yoursite.com;

    # SSL сертификаты
    ssl_certificate /etc/letsencrypt/live/yoursite.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yoursite.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/laravel-app/public;
    index index.php;

    # ... остальная конфигурация ...
}
```

**Обновляем .env**:

```env
APP_URL=https://yoursite.com
SESSION_SECURE_COOKIE=true
```

---

## 7. Оптимизация production

### ⚡ Laravel оптимизации

**Кеширование конфигурации**:

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

⚠️ **Внимание**: после изменения `.env` или роутов нужно очищать кеш!

```bash
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

**Оптимизация автозагрузчика**:

```bash
composer install --optimize-autoloader --no-dev
```

**Режим обслуживания**:

```bash
# Включить
php artisan down --secret="my-secret-token"

# Теперь только с ?secret=my-secret-token можно зайти
# Остальные видят страницу "Maintenance"

# Выключить
php artisan up
```

### 🔧 Настройка opcache

```bash
sudo nano /etc/php/8.2/fpm/php.ini

# Находим и раскомментируем/меняем:
opcache.enable=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=8
opcache.max_accelerated_files=10000
opcache.revalidate_freq=60
opcache.validate_timestamps=0  # ❗️ В production

# Перезапускаем PHP-FPM
sudo systemctl reload php8.2-fpm
```

### 📊 Мониторинг производительности

**Laravel Telescope** (для staging, НЕ для production):

```bash
composer require laravel/telescope --dev
php artisan telescope:install
php artisan migrate
```

В `.env`:
```env
TELESCOPE_ENABLED=false  # В production!
```

**Laravel Debugbar** (только development):

```bash
composer require barryvdh/laravel-debugbar --dev
```

---

## 8. Автоматизация деплоя

### 🚀 Простой деплой-скрипт

**На сервере** создаём `/var/www/laravel-app/deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Переходим в директорию
cd /var/www/laravel-app

# Включаем режим обслуживания
php artisan down

# Обновляем код
git pull origin main

# Устанавливаем зависимости
composer install --no-dev --optimize-autoloader

# Запускаем миграции
php artisan migrate --force

# Собираем фронтенд
npm install
npm run build

# Очищаем и кешируем
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Очищаем application cache
php artisan cache:clear

# Перезапускаем очереди
php artisan queue:restart

# Выключаем режим обслуживания
php artisan up

echo "✅ Deployment complete!"
```

**Делаем исполняемым**:

```bash
chmod +x /var/www/laravel-app/deploy.sh
```

**Деплой одной командой**:

```bash
./deploy.sh
```

### 🔄 GitHub Actions (CI/CD)

**.github/workflows/deploy.yml**:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_IP }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /var/www/laravel-app
          ./deploy.sh
```

**Настройка Secrets в GitHub**:
- Settings → Secrets → New repository secret
- `SERVER_IP`: IP сервера
- `SERVER_USER`: deploy
- `SSH_PRIVATE_KEY`: приватный SSH-ключ

---

## 9. Мониторинг и логи

### 📝 Логи Laravel

**Где хранятся логи**:

```
/var/www/laravel-app/storage/logs/laravel.log
```

**Просмотр логов в реальном времени**:

```bash
tail -f storage/logs/laravel.log
```

**Настройка логирования в .env**:

```env
LOG_CHANNEL=stack
LOG_STACK=single
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=error  # debug, info, notice, warning, error, critical
```

### 📊 Логи Nginx

```bash
# Access log (все запросы)
sudo tail -f /var/log/nginx/laravel-app-access.log

# Error log (ошибки)
sudo tail -f /var/log/nginx/laravel-app-error.log
```

### 🔍 Мониторинг сервера

**Использование ресурсов**:

```bash
# CPU и память в реальном времени
htop

# Дисковое пространство
df -h

# Использование директории
du -sh /var/www/laravel-app
```

**Автоматические алерты** (через Supervisor):

```bash
sudo apt install supervisor -y
```

**Конфиг для Laravel Queue Worker** (`/etc/supervisor/conf.d/laravel-worker.conf`):

```ini
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/laravel-app/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=deploy
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/laravel-app/storage/logs/worker.log
stopwaitsecs=3600
```

**Запуск**:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start laravel-worker:*
```

### 🚨 Отправка ошибок на email

**config/logging.php**:

```php
'channels' => [
    'stack' => [
        'driver' => 'stack',
        'channels' => ['single', 'slack'],
        'ignore_exceptions' => false,
    ],
    
    'slack' => [
        'driver' => 'slack',
        'url' => env('LOG_SLACK_WEBHOOK_URL'),
        'username' => 'Laravel Log',
        'emoji' => ':boom:',
        'level' => 'critical',
    ],
],
```

---

## 10. Практика

### 🎯 Задание 1: Разворачиваем свой проект

**Задача**: развернуть Laravel-приложение на VPS с SSL.

**Шаги**:
1. Создать VPS (можно использовать бесплатный tier DigitalOcean или Vultr)
2. Настроить пользователя и SSH-ключи
3. Установить LEMP stack (Linux, Nginx, MySQL, PHP)
4. Настроить Nginx для Laravel
5. Задеплоить приложение через Git
6. Настроить SSL через Let's Encrypt
7. Оптимизировать для production

**Проверка**:
- [ ] Сайт открывается по HTTPS
- [ ] HTTP редиректит на HTTPS
- [ ] `APP_DEBUG=false` в production
- [ ] Миграции выполнены
- [ ] Фронтенд собран
- [ ] Логи пишутся

---

### 🎯 Задание 2: Автоматизация деплоя

**Задача**: настроить автоматический деплой при push в main.

**Шаги**:
1. Создать deploy.sh скрипт
2. Настроить GitHub Actions workflow
3. Добавить secrets в GitHub
4. Сделать тестовый коммит и проверить автодеплой

**Дополнительно**:
- Добавить запуск тестов перед деплоем
- Настроить уведомления в Slack при успешном/неуспешном деплое

---

### 🎯 Задание 3: Настройка очередей

**Задача**: настроить обработку очередей через Supervisor.

**Шаги**:
1. Установить Supervisor
2. Создать конфиг для queue worker
3. Запустить worker
4. Проверить обработку jobs

**Тест**:
```php
// Создаём тестовый job
php artisan make:job TestJob

// В job:
public function handle()
{
    Log::info('Test job executed at ' . now());
}

// Отправляем в очередь
TestJob::dispatch();

// Проверяем логи
tail -f storage/logs/laravel.log
```

---

## 🎓 Упражнения

### Упражнение 1: Cheat Sheet команд деплоя

Создай шпаргалку с командами для:
- Подключения к серверу
- Обновления кода
- Запуска миграций
- Очистки кешей
- Перезапуска сервисов

<details>
<summary>✅ Решение</summary>

```bash
# === ПОДКЛЮЧЕНИЕ ===
ssh deploy@203.0.113.42

# === ОБНОВЛЕНИЕ КОДА ===
cd /var/www/laravel-app
git pull origin main

# === ЗАВИСИМОСТИ ===
composer install --no-dev --optimize-autoloader
npm install && npm run build

# === БАЗА ДАННЫХ ===
php artisan migrate --force
php artisan db:seed --force

# === КЕШИРОВАНИЕ ===
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# === ОЧИСТКА ===
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# === СЕРВИСЫ ===
# Nginx
sudo systemctl reload nginx

# PHP-FPM
sudo systemctl reload php8.2-fpm

# Supervisor (queue workers)
sudo supervisorctl restart laravel-worker:*

# === ЛОГИ ===
tail -f storage/logs/laravel.log
tail -f /var/log/nginx/error.log

# === РЕЖИМ ОБСЛУЖИВАНИЯ ===
php artisan down --secret="secret-token"
php artisan up
```

</details>

---

### Упражнение 2: Безопасность

Найди уязвимости в этом .env:

```env
APP_NAME=Laravel
APP_ENV=production
APP_DEBUG=true
APP_URL=http://mysite.com

DB_DATABASE=laravel
DB_USERNAME=root
DB_PASSWORD=password

SESSION_SECURE_COOKIE=false
```

<details>
<summary>✅ Решение</summary>

**Проблемы**:

1. ❌ `APP_DEBUG=true` — показывает ошибки с кодом
   - ✅ Должно быть `false`

2. ❌ `APP_URL=http://...` — нет HTTPS
   - ✅ Должно быть `https://mysite.com`

3. ❌ `DB_USERNAME=root` — использование root-пользователя
   - ✅ Создать отдельного пользователя с минимальными правами

4. ❌ `DB_PASSWORD=password` — слабый пароль
   - ✅ Использовать сложный пароль (20+ символов, случайный)

5. ❌ `SESSION_SECURE_COOKIE=false` — cookies передаются по HTTP
   - ✅ Должно быть `true` (только HTTPS)

**Правильный вариант**:
```env
APP_NAME=Laravel
APP_ENV=production
APP_DEBUG=false
APP_URL=https://mysite.com

DB_DATABASE=laravel
DB_USERNAME=laravel_user
DB_PASSWORD=Kj8#mQ2$pL9@vR4*nB6&hT3^dF7!wX

SESSION_SECURE_COOKIE=true
```

</details>

---

### Упражнение 3: Диагностика проблем

Сайт не открывается после деплоя. Что проверить?

<details>
<summary>✅ Решение</summary>

**Чеклист диагностики**:

1. **Nginx запущен?**
```bash
sudo systemctl status nginx
# Если нет: sudo systemctl start nginx
```

2. **Конфиг Nginx корректный?**
```bash
sudo nginx -t
# Смотрим на ошибки
```

3. **PHP-FPM работает?**
```bash
sudo systemctl status php8.2-fpm
```

4. **Права на файлы?**
```bash
ls -la /var/www/laravel-app/storage
# Должно быть drwxrwxr-x deploy www-data

# Если нет:
sudo chown -R deploy:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

5. **Переменные окружения?**
```bash
cat .env
# APP_KEY заполнен?
# Правильные DB credentials?
```

6. **Логи ошибок**:
```bash
# Laravel
tail -50 storage/logs/laravel.log

# Nginx
sudo tail -50 /var/log/nginx/error.log

# PHP
sudo tail -50 /var/log/php8.2-fpm.log
```

7. **База данных доступна?**
```bash
php artisan tinker
>>> DB::connection()->getPdo();
```

8. **Кеш конфигурации**:
```bash
php artisan config:clear
php artisan cache:clear
```

9. **Composer зависимости**:
```bash
composer install --no-dev
```

10. **Symbolic link на storage**:
```bash
php artisan storage:link
```

</details>

---

## 📋 Чеклист перед деплоем в production

### Pre-deployment

- [ ] Все тесты проходят
- [ ] `.env.example` обновлён
- [ ] `composer.lock` в репозитории
- [ ] `package-lock.json` в репозитории
- [ ] Нет `dd()`, `dump()`, `var_dump()` в коде
- [ ] Нет тестовых роутов (`/test`, `/phpinfo`)
- [ ] `.gitignore` настроен правильно

### Configuration (.env)

- [ ] `APP_ENV=production`
- [ ] `APP_DEBUG=false`
- [ ] `APP_URL` с HTTPS
- [ ] `DB_*` корректные credentials
- [ ] `SESSION_SECURE_COOKIE=true`
- [ ] `CACHE_DRIVER` настроен (redis/file)
- [ ] `QUEUE_CONNECTION` настроен
- [ ] `MAIL_*` настроен для production

### Server Setup

- [ ] PHP 8.2+ установлен
- [ ] Все расширения PHP установлены
- [ ] Composer установлен
- [ ] Node.js/npm установлены
- [ ] Nginx установлен и настроен
- [ ] MySQL/PostgreSQL установлена
- [ ] Redis установлен (если используется)
- [ ] SSL-сертификат настроен
- [ ] Firewall настроен (ufw/iptables)

### Laravel Optimization

- [ ] `composer install --optimize-autoloader --no-dev`
- [ ] `php artisan config:cache`
- [ ] `php artisan route:cache`
- [ ] `php artisan view:cache`
- [ ] `npm run build` выполнен
- [ ] `php artisan storage:link` выполнен

### Security

- [ ] SSH вход только по ключу
- [ ] Root login отключен
- [ ] Firewall настроен (только 80, 443, SSH)
- [ ] Fail2ban установлен (опционально)
- [ ] Регулярные бэкапы БД настроены
- [ ] `.env` не в репозитории
- [ ] Sensitive данные не в коде

### Monitoring

- [ ] Supervisor для queue workers
- [ ] Логи ротируются (logrotate)
- [ ] Мониторинг дискового пространства
- [ ] Уведомления об ошибках настроены
- [ ] SSL автопродление работает

---

## 🎯 Что дальше?

После успешного деплоя стоит изучить:

1. **Docker** — контейнеризация приложения (Глава 14.2)
2. **CI/CD** — полная автоматизация (Глава 14.4)
3. **Масштабирование** — load balancing, database replication
4. **Мониторинг** — Prometheus, Grafana, New Relic
5. **Безопасность** — регулярные security audits

---

## 📚 Итоги главы

Вы научились:

✅ Различать development и production окружения  
✅ Настраивать VPS с нуля  
✅ Устанавливать LEMP stack (Linux, Nginx, MySQL, PHP)  
✅ Конфигурировать Nginx для Laravel  
✅ Деплоить приложение через Git  
✅ Настраивать бесплатный SSL (Let's Encrypt)  
✅ Оптимизировать Laravel для production  
✅ Автоматизировать деплой  
✅ Мониторить логи и ошибки  
✅ Диагностировать проблемы на сервере  

**Главное правило production**: `APP_DEBUG=false`, всегда HTTPS, никогда не коммитить `.env`.

---

## 🔗 Полезные ресурсы

- [Laravel Deployment (официальная документация)](https://laravel.com/docs/deployment)
- [DigitalOcean Laravel Tutorials](https://www.digitalocean.com/community/tags/laravel)
- [Laravel Forge](https://forge.laravel.com/) — автоматизация деплоя (платно)
- [Server Setup Checklist](https://github.com/codersteve/server-setup-checklist)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/) — проверка SSL конфигурации