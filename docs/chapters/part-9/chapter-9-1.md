# Глава 9.1: Миграции — создание таблиц кодом, изменение структуры, откат

## Введение: Почему миграции — это революция

Представь: ты разработал сайт локально, всё работает. Теперь нужно развернуть его на сервере. Что ты делаешь с базой данных?

**Старый способ (боль и страдания):**
1. Экспортируешь SQL из phpMyAdmin
2. Отправляешь коллеге файл
3. Он импортирует, у него ошибка — версия MySQL другая
4. Через неделю ты добавил новое поле в таблицу
5. Коллега не знает об этом, у него сайт ломается
6. Ты пытаешься объяснить в чате: "Добавь поле `avatar` в таблицу `users`, тип VARCHAR(255), после поля `email`"
7. Он добавляет не туда, всё ломается

**Современный способ (миграции):**
1. Пишешь код миграции один раз
2. Все разработчики запускают `php artisan migrate`
3. База создаётся/обновляется автоматически
4. Изменения в структуре — это код в Git
5. На продакшене запускаешь ту же команду

**Миграции — это Git для базы данных.** История изменений, версионность, возможность отката.

---

## Что такое миграции

**Миграция** — это класс PHP, который описывает изменение структуры базы данных.

Каждая миграция содержит два метода:
- `up()` — что сделать (создать таблицу, добавить поле)
- `down()` — как откатить это изменение

Laravel отслеживает, какие миграции уже применены, в специальной таблице `migrations`.

### Жизненный цикл миграции

```
Создание → Написание кода → Запуск → БД изменена → Коммит в Git → Другие разработчики запускают
                                                      ↓
                                               Проблема? Откат!
```

---

## Создание миграции

### Первая миграция — таблица постов

```bash
php artisan make:migration create_posts_table
```

Laravel создаёт файл в `database/migrations/`:
```
2024_01_29_120000_create_posts_table.php
```

**Важно:** Префикс с датой и временем — это timestamp. Он гарантирует порядок выполнения миграций.

### Структура миграции

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id(); // BIGINT UNSIGNED, PRIMARY KEY, AUTO_INCREMENT
            $table->string('title'); // VARCHAR(255)
            $table->text('content'); // TEXT
            $table->timestamps(); // created_at, updated_at
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
```

### Разбор кода

**`Schema::create()`** — создание новой таблицы

**`Blueprint $table`** — объект-конструктор таблицы, содержит методы для создания полей

**`$table->id()`** — создаёт поле `id`, эквивалент SQL:
```sql
id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
```

**`$table->timestamps()`** — создаёт два поля:
```sql
created_at TIMESTAMP NULL
updated_at TIMESTAMP NULL
```

Laravel автоматически заполняет их при создании/обновлении модели.

---

## Типы полей в миграциях

### Числовые типы

```php
$table->integer('views'); // INT
$table->bigInteger('downloads'); // BIGINT
$table->tinyInteger('status'); // TINYINT (0-255)
$table->smallInteger('order'); // SMALLINT
$table->unsignedBigInteger('user_id'); // BIGINT UNSIGNED (для внешних ключей)

$table->decimal('price', 8, 2); // DECIMAL(8,2) — для цен
$table->float('rating', 8, 2); // FLOAT
$table->double('latitude', 10, 6); // DOUBLE — для координат
```

**Золотое правило:** Для цен всегда используй `decimal`, не `float`! Float даёт ошибки округления.

### Строковые типы

```php
$table->string('name'); // VARCHAR(255)
$table->string('phone', 20); // VARCHAR(20)
$table->text('description'); // TEXT (до 65,535 символов)
$table->longText('content'); // LONGTEXT (до 4GB)
$table->char('code', 6); // CHAR(6) — фиксированная длина
```

**Когда что использовать:**
- `string` — имена, email, короткие тексты
- `text` — описания, комментарии
- `longText` — статьи, большие тексты
- `char` — коды фиксированной длины (промокоды, ISBN)

### Дата и время

```php
$table->date('birth_date'); // DATE
$table->time('start_time'); // TIME
$table->datetime('event_at'); // DATETIME
$table->timestamp('published_at'); // TIMESTAMP (используется с timezone)
$table->timestamps(); // created_at + updated_at
$table->softDeletes(); // deleted_at (для мягкого удаления)
```

### Логические и специальные

```php
$table->boolean('is_active'); // TINYINT(1)
$table->enum('status', ['draft', 'published', 'archived']); // ENUM
$table->json('meta'); // JSON (для хранения массивов/объектов)
$table->uuid('id'); // CHAR(36) — для UUID
$table->ipAddress('visitor_ip'); // VARCHAR(45) — для IPv4/IPv6
```

### Модификаторы полей

```php
$table->string('email')->nullable(); // Может быть NULL
$table->string('slug')->unique(); // Уникальное значение
$table->integer('views')->default(0); // Значение по умолчанию
$table->timestamp('published_at')->useCurrent(); // Текущее время по умолчанию
$table->string('title')->comment('Заголовок поста'); // Комментарий в БД

// Можно комбинировать
$table->string('email')->unique()->nullable(false);
```

---

## Полноценная миграция — таблица пользователей

```php
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();
    $table->string('password');
    $table->string('avatar')->nullable();
    $table->enum('role', ['user', 'admin'])->default('user');
    $table->boolean('is_active')->default(true);
    $table->timestamp('email_verified_at')->nullable();
    $table->rememberToken(); // Для "запомнить меня"
    $table->timestamps();
    $table->softDeletes(); // Мягкое удаление
    
    // Индекс для быстрого поиска
    $table->index('email');
});
```

**`rememberToken()`** — специальное поле для Laravel аутентификации, VARCHAR(100).

**`softDeletes()`** — вместо реального удаления записывает дату в `deleted_at`.

---

## Внешние ключи (Foreign Keys)

### Простой способ (рекомендуется)

```php
Schema::create('posts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained();
    $table->string('title');
    $table->text('content');
    $table->timestamps();
});
```

**`foreignId('user_id')->constrained()`** делает:
1. Создаёт поле `user_id` типа BIGINT UNSIGNED
2. Создаёт внешний ключ на таблицу `users`, поле `id`
3. Автоматически определяет имя таблицы из названия поля (убирает `_id`, добавляет `s`)

### Полный контроль

```php
$table->foreignId('author_id')
    ->constrained('users') // Явно указываем таблицу
    ->onUpdate('cascade') // При изменении id пользователя — изменить везде
    ->onDelete('cascade'); // При удалении пользователя — удалить его посты
```

**Варианты `onDelete`:**
- `cascade` — удалить связанные записи
- `set null` — установить NULL (требует `nullable()`)
- `restrict` — запретить удаление, если есть связанные записи
- `no action` — как restrict

### Пример: Комментарии к постам

```php
Schema::create('comments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('post_id')->constrained()->onDelete('cascade');
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->text('content');
    $table->timestamps();
});
```

**Логика:** Если пост удалён — удалить все его комментарии. Если пользователь удалён — удалить его комментарии.

---

## Запуск миграций

### Основные команды

```bash
# Запустить все новые миграции
php artisan migrate

# Откатить последний батч миграций
php artisan migrate:rollback

# Откатить определённое количество батчей
php artisan migrate:rollback --step=2

# Откатить ВСЕ миграции
php artisan migrate:reset

# Откатить всё и запустить заново (fresh start)
php artisan migrate:refresh

# То же самое + запустить seeders
php artisan migrate:refresh --seed

# Удалить все таблицы и создать заново (быстрее refresh)
php artisan migrate:fresh

# Проверить статус миграций
php artisan migrate:status
```

### Как работает отслеживание

Laravel создаёт таблицу `migrations`:

| id | migration | batch |
|----|-----------|-------|
| 1 | 2024_01_01_create_users_table | 1 |
| 2 | 2024_01_02_create_posts_table | 1 |
| 3 | 2024_01_15_add_avatar_to_users | 2 |

**Batch** — группа миграций, запущенных одной командой. Rollback откатывает весь батч.

### Пример рабочего процесса

```bash
# 1. Создал миграцию
php artisan make:migration create_categories_table

# 2. Написал код миграции
# (редактируешь файл)

# 3. Запустил
php artisan migrate

# 4. Понял, что ошибка в структуре
php artisan migrate:rollback

# 5. Исправил код миграции

# 6. Запустил снова
php artisan migrate
```

---

## Изменение существующих таблиц

### Правильный способ — новая миграция

**НИКОГДА не редактируй старые миграции после их коммита в Git!**

```bash
php artisan make:migration add_avatar_to_users_table
```

```php
public function up(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->string('avatar')->nullable()->after('email');
    });
}

public function down(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->dropColumn('avatar');
    });
}
```

**`after('email')`** — добавить поле после конкретного столбца.

### Переименование столбца

```php
use Illuminate\Database\Schema\Blueprint;

// Добавь в composer.json:
// "doctrine/dbal": "^3.0"

public function up(): void
{
    Schema::table('posts', function (Blueprint $table) {
        $table->renameColumn('body', 'content');
    });
}
```

**Важно:** Для переименования нужен пакет `doctrine/dbal`:
```bash
composer require doctrine/dbal
```

### Изменение типа столбца

```php
public function up(): void
{
    Schema::table('posts', function (Blueprint $table) {
        $table->text('content')->change(); // Было string, стало text
    });
}
```

### Удаление столбца

```php
public function up(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->dropColumn('old_field');
        
        // Удалить несколько столбцов
        $table->dropColumn(['field1', 'field2', 'field3']);
    });
}

public function down(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->string('old_field')->nullable();
    });
}
```

### Удаление внешнего ключа

```php
$table->dropForeign(['user_id']); // По названию столбца
$table->dropForeign('posts_user_id_foreign'); // По имени constraint
```

### Работа с индексами

```php
// Добавить индекс
$table->index('email');
$table->index(['user_id', 'created_at']); // Составной индекс

// Удалить индекс
$table->dropIndex(['email']);
$table->dropUnique(['email']); // Удалить уникальный индекс

// Переименовать индекс
$table->renameIndex('old_index_name', 'new_index_name');
```

---

## Практические сценарии

### Сценарий 1: Блог с категориями

```php
// 1. Миграция категорий
Schema::create('categories', function (Blueprint $table) {
    $table->id();
    $table->string('name')->unique();
    $table->string('slug')->unique();
    $table->timestamps();
});

// 2. Миграция постов
Schema::create('posts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->foreignId('category_id')->constrained()->onDelete('cascade');
    $table->string('title');
    $table->string('slug')->unique();
    $table->text('excerpt')->nullable();
    $table->longText('content');
    $table->enum('status', ['draft', 'published'])->default('draft');
    $table->integer('views')->default(0);
    $table->timestamp('published_at')->nullable();
    $table->timestamps();
    $table->softDeletes();
    
    $table->index(['status', 'published_at']); // Для списка опубликованных
});
```

### Сценарий 2: Many-to-Many (посты и теги)

```php
// 1. Таблица тегов
Schema::create('tags', function (Blueprint $table) {
    $table->id();
    $table->string('name')->unique();
    $table->timestamps();
});

// 2. Pivot-таблица (связь многие-ко-многим)
Schema::create('post_tag', function (Blueprint $table) {
    $table->foreignId('post_id')->constrained()->onDelete('cascade');
    $table->foreignId('tag_id')->constrained()->onDelete('cascade');
    
    $table->primary(['post_id', 'tag_id']); // Составной первичный ключ
});
```

**Naming convention:** Имена таблиц в алфавитном порядке, единственное число: `post_tag`, не `posts_tags`.

### Сценарий 3: Полиморфные связи (лайки к постам и комментариям)

```php
Schema::create('likes', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->morphs('likeable'); // Создаёт likeable_type и likeable_id
    $table->timestamps();
    
    $table->unique(['user_id', 'likeable_type', 'likeable_id']);
});
```

**`morphs('likeable')`** создаёт:
- `likeable_type` — VARCHAR(255) (название модели: 'App\Models\Post')
- `likeable_id` — BIGINT UNSIGNED (ID записи)

---

## Лучшие практики

### ✅ DO (Делай так)

1. **Одна миграция — одно изменение**
   ```bash
   php artisan make:migration add_status_to_posts_table
   # Не: update_posts_table_with_everything
   ```

2. **Всегда пиши `down()`**
   ```php
   public function down(): void
   {
       Schema::dropIfExists('posts');
       // Не оставляй пустым!
   }
   ```

3. **Используй `nullable()` для новых полей**
   ```php
   // При добавлении поля в существующую таблицу с данными
   $table->string('avatar')->nullable();
   ```

4. **Foreign keys с cascade**
   ```php
   $table->foreignId('user_id')
       ->constrained()
       ->onDelete('cascade');
   ```

5. **Индексы для часто запрашиваемых полей**
   ```php
   $table->index('email');
   $table->index(['user_id', 'created_at']);
   ```

### ❌ DON'T (Не делай так)

1. **Не редактируй старые миграции**
   - Если миграция уже запущена на продакшене — только новая миграция

2. **Не используй `float` для денег**
   ```php
   $table->decimal('price', 8, 2); // ✅
   $table->float('price'); // ❌
   ```

3. **Не забывай про откат**
   ```php
   // ❌ Плохо
   public function down(): void
   {
       //
   }
   
   // ✅ Хорошо
   public function down(): void
   {
       Schema::dropIfExists('posts');
   }
   ```

4. **Не используй Raw SQL без крайней необходимости**
   ```php
   DB::statement('ALTER TABLE...'); // ❌ Только если Blueprint не умеет
   ```

---

## Типичные ошибки и решения

### Ошибка: "SQLSTATE[HY000]: General error: 1005"

**Причина:** Внешний ключ указывает на несуществующую таблицу.

**Решение:** Проверь порядок миграций. Таблица `users` должна создаваться ДО `posts`.

### Ошибка: "Syntax error or access violation: 1071 Specified key was too long"

**Причина:** Старые версии MySQL не поддерживают длинные индексы для UTF8MB4.

**Решение:** В `AppServiceProvider`:
```php
use Illuminate\Support\Facades\Schema;

public function boot(): void
{
    Schema::defaultStringLength(191);
}
```

### Ошибка: "Nothing to migrate"

**Причина:** Миграция уже выполнена.

**Решение:** 
```bash
php artisan migrate:status # Проверить статус
php artisan migrate:rollback # Откатить
php artisan migrate # Запустить снова
```

---

## Миграции в продакшене

### Чеклист перед деплоем

1. **Проверь `down()` методы** — можешь ли откатить?
2. **Тестируй на копии продакшн БД** — особенно изменения больших таблиц
3. **Backup базы** — всегда делай бэкап перед миграцией
4. **Читай SQL** — `php artisan migrate --pretend` показывает SQL без выполнения

### Безопасный деплой

```bash
# 1. Создай backup
mysqldump -u user -p database > backup.sql

# 2. Проверь, что будет выполнено
php artisan migrate --pretend

# 3. Запусти миграции
php artisan migrate --force # --force для продакшена

# 4. Если что-то пошло не так
php artisan migrate:rollback
mysql -u user -p database < backup.sql
```

### Миграции без даунтайма

Для больших таблиц (миллионы записей) используй:

1. **Добавь поле как nullable**
2. **Заполни данные фоновой задачей**
3. **Потом сделай поле обязательным**

```php
// Миграция 1: Добавляем поле
$table->string('new_field')->nullable();

// Через несколько дней, когда данные заполнены
// Миграция 2: Делаем обязательным
$table->string('new_field')->nullable(false)->change();
```

---

## Упражнения

### Упражнение 1: Создай систему блога

Создай миграции для:
1. Таблица `users` (id, name, email, password, timestamps)
2. Таблица `posts` (id, user_id, title, slug, content, status, published_at, timestamps, softDeletes)
3. Таблица `comments` (id, post_id, user_id, content, timestamps)

Требования:
- Внешние ключи с каскадным удалением
- Уникальный индекс на email
- Индекс на slug
- Enum для статуса: draft, published, archived

<details>
<summary>Решение</summary>

```php
// 1. Users
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();
    $table->string('password');
    $table->timestamps();
});

// 2. Posts
Schema::create('posts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->string('title');
    $table->string('slug')->unique();
    $table->longText('content');
    $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
    $table->timestamp('published_at')->nullable();
    $table->timestamps();
    $table->softDeletes();
    
    $table->index('slug');
});

// 3. Comments
Schema::create('comments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('post_id')->constrained()->onDelete('cascade');
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->text('content');
    $table->timestamps();
});
```
</details>

### Упражнение 2: Добавь систему тегов

Добавь к блогу из упражнения 1:
1. Таблицу `tags`
2. Pivot-таблицу для связи many-to-many
3. У каждого поста может быть много тегов, тег может быть у многих постов

<details>
<summary>Решение</summary>

```php
// Tags
Schema::create('tags', function (Blueprint $table) {
    $table->id();
    $table->string('name')->unique();
    $table->string('slug')->unique();
    $table->timestamps();
});

// Pivot table
Schema::create('post_tag', function (Blueprint $table) {
    $table->foreignId('post_id')->constrained()->onDelete('cascade');
    $table->foreignId('tag_id')->constrained()->onDelete('cascade');
    
    $table->primary(['post_id', 'tag_id']);
    $table->timestamps(); // Опционально, если хочешь знать когда тег добавлен
});
```
</details>

### Упражнение 3: Изменение структуры

К таблице `users` нужно добавить:
- Поле `avatar` (nullable, после email)
- Поле `bio` (text, nullable)
- Поле `is_verified` (boolean, default false)

Создай миграцию с правильным `down()` методом.

<details>
<summary>Решение</summary>

```php
public function up(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->string('avatar')->nullable()->after('email');
        $table->text('bio')->nullable();
        $table->boolean('is_verified')->default(false);
    });
}

public function down(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->dropColumn(['avatar', 'bio', 'is_verified']);
    });
}
```
</details>

---

## Чек-лист знаний

После этой главы ты должен уметь:

- [ ] Создавать миграции через artisan
- [ ] Использовать основные типы полей (string, text, integer, timestamps)
- [ ] Создавать внешние ключи с `foreignId()->constrained()`
- [ ] Понимать разницу между `migrate`, `rollback`, `refresh`, `fresh`
- [ ] Добавлять поля в существующие таблицы
- [ ] Удалять и переименовывать поля
- [ ] Создавать индексы для оптимизации
- [ ] Писать правильные `down()` методы
- [ ] Использовать модификаторы: nullable, unique, default
- [ ] Создавать many-to-many связи через pivot-таблицы

---

## Что дальше?

В следующей главе **9.2: Eloquent связи** мы научимся работать с этими таблицами через модели. Ты узнаешь:
- Как определить связь `hasMany`, `belongsTo`
- Как получить все посты пользователя одной строкой
- Как работать с many-to-many без написания SQL
- Что такое полиморфные связи

**Миграции — это база. Eloquent — это магия.**

---

## Полезные ссылки

- [Laravel Migrations Documentation](https://laravel.com/docs/migrations)
- [Available Column Types](https://laravel.com/docs/migrations#available-column-types)
- [Database Seeding](https://laravel.com/docs/seeding) — следующая тема

---

**Совет на конец:** Коммить миграции в Git после каждого изменения. Структура БД — это код, храни её как код. Твои коллеги скажут спасибо. 🚀