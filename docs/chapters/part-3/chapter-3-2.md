# Глава 3.2: MySQL и проектирование БД — нормализация, типы данных, индексы, связи между таблицами

## 🎯 Что ты узнаешь

После этой главы ты сможешь:
- Проектировать структуру базы данных от идеи до реализации
- Выбирать правильные типы данных для разных задач
- Понимать и применять нормализацию (без фанатизма)
- Создавать связи между таблицами
- Использовать индексы для ускорения запросов
- Избегать типичных ошибок проектирования

---

## 📋 Часть 1: Типы данных MySQL — выбираем с умом

### Числовые типы

```sql
-- Целые числа
TINYINT     -- -128 до 127 (1 байт)
            -- UNSIGNED: 0 до 255
            
SMALLINT    -- -32768 до 32767 (2 байта)
            -- UNSIGNED: 0 до 65535
            
MEDIUMINT   -- -8388608 до 8388607 (3 байта)

INT         -- -2147483648 до 2147483647 (4 байта)
            -- UNSIGNED: 0 до 4294967295
            
BIGINT      -- очень большие числа (8 байт)

-- Числа с плавающей точкой
DECIMAL(10,2)  -- точные деньги: 12345678.90
               -- (10 цифр всего, 2 после запятой)
               
FLOAT          -- приблизительные вычисления
DOUBLE         -- более точные приблизительные
```

**Практический пример:**

```sql
CREATE TABLE products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Цену ВСЕГДА храним в DECIMAL!
    price DECIMAL(10,2) NOT NULL,
    
    -- Количество на складе
    stock_quantity SMALLINT UNSIGNED DEFAULT 0,
    
    -- Рейтинг товара (1-5)
    rating TINYINT UNSIGNED,
    
    -- Вес в граммах
    weight_grams MEDIUMINT UNSIGNED,
    
    -- Скидка в процентах (0-100)
    discount_percent TINYINT UNSIGNED DEFAULT 0
);
```

### Строковые типы

```sql
-- Фиксированная длина (заполняется пробелами)
CHAR(10)       -- всегда занимает 10 байт
               -- Хорош для кодов: "RU", "USD"

-- Переменная длина
VARCHAR(255)   -- занимает столько, сколько нужно + 1-2 байта
               -- Максимум 65535 байт на всю строку

-- Текстовые блоки
TEXT           -- до 65KB текста
MEDIUMTEXT     -- до 16MB
LONGTEXT       -- до 4GB (статьи, посты)

-- Специальные
ENUM('S','M','L','XL')  -- выбор из списка
                        -- Хранится как число (экономия места)
```

**Практический пример:**

```sql
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Email ограничен реально возможной длиной
    email VARCHAR(255) NOT NULL UNIQUE,
    
    -- Имя редко длиннее 100 символов
    name VARCHAR(100) NOT NULL,
    
    -- Телефон в международном формате
    phone VARCHAR(20),
    
    -- Код страны ISO
    country_code CHAR(2) DEFAULT 'RU',
    
    -- Биография может быть длинной
    bio TEXT,
    
    -- Размер одежды
    shirt_size ENUM('XS','S','M','L','XL','XXL')
);
```

### Дата и время

```sql
DATE           -- '2024-12-31' (только дата)
TIME           -- '23:59:59' (только время)
DATETIME       -- '2024-12-31 23:59:59' (дата + время)
TIMESTAMP      -- то же что DATETIME, но автообновление

-- Год
YEAR           -- 1901-2155 (1 байт)
```

**Практический пример:**

```sql
CREATE TABLE posts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    
    -- Когда создан (ставится автоматически)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Когда изменён (обновляется автоматически)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
                         ON UPDATE CURRENT_TIMESTAMP,
    
    -- Когда опубликовать (можно в будущем)
    publish_at DATETIME,
    
    -- День рождения автора (без времени)
    author_birthday DATE
);
```

### JSON и другие типы

```sql
-- JSON данные (MySQL 5.7+)
JSON           -- валидация + специальные функции

-- Бинарные данные
BLOB           -- файлы, изображения (НЕ рекомендуется!)
               -- Лучше хранить путь к файлу
```

---

## 🏗️ Часть 2: Проектирование структуры БД

### Шаг 1: От идеи к сущностям

**Задача:** Создать систему для блога

**Думаем:** Что есть в блоге?
- Статьи (посты)
- Авторы (пользователи)
- Комментарии
- Категории
- Теги

**Определяем связи:**
- Один автор → много статей
- Одна статья → много комментариев
- Статья ↔ много тегов (и тег у многих статей)

### Шаг 2: Создаём таблицы

```sql
-- Пользователи (авторы)
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_email (email)  -- быстрый поиск по email
);

-- Статьи
CREATE TABLE posts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,  -- URL-friendly
    content TEXT NOT NULL,
    excerpt VARCHAR(500),
    status ENUM('draft','published','archived') DEFAULT 'draft',
    views_count INT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    
    -- Связь с пользователями
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Индексы для частых запросов
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_slug (slug)
);

-- Комментарии
CREATE TABLE comments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    parent_id INT UNSIGNED,  -- для ответов на комментарии
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    
    INDEX idx_post_id (post_id),
    INDEX idx_parent_id (parent_id)
);

-- Теги
CREATE TABLE tags (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE
);

-- Связь статей и тегов (многие ко многим)
CREATE TABLE post_tag (
    post_id INT UNSIGNED NOT NULL,
    tag_id INT UNSIGNED NOT NULL,
    
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

---

## 🔗 Часть 3: Связи между таблицами

### Один ко многим (One-to-Many)

**Пример:** Один пользователь — много постов

```sql
-- В таблице posts храним user_id
CREATE TABLE posts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,  -- <-- внешний ключ
    title VARCHAR(255),
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Получить все посты пользователя
SELECT * FROM posts WHERE user_id = 5;

-- Получить автора поста
SELECT u.* 
FROM users u
JOIN posts p ON p.user_id = u.id
WHERE p.id = 10;
```

### Многие ко многим (Many-to-Many)

**Пример:** Статьи ↔ Теги

```sql
-- Промежуточная таблица (pivot table)
CREATE TABLE post_tag (
    post_id INT UNSIGNED NOT NULL,
    tag_id INT UNSIGNED NOT NULL,
    
    PRIMARY KEY (post_id, tag_id),  -- уникальная пара
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id)
);

-- Добавить тег к посту
INSERT INTO post_tag (post_id, tag_id) VALUES (1, 3);

-- Все теги поста #1
SELECT t.*
FROM tags t
JOIN post_tag pt ON pt.tag_id = t.id
WHERE pt.post_id = 1;

-- Все посты с тегом "PHP"
SELECT p.*
FROM posts p
JOIN post_tag pt ON pt.post_id = p.id
JOIN tags t ON t.id = pt.tag_id
WHERE t.slug = 'php';
```

### Один к одному (One-to-One)

**Пример:** Пользователь → Профиль

```sql
CREATE TABLE user_profiles (
    user_id INT UNSIGNED PRIMARY KEY,  -- <-- одновременно FK и PK
    bio TEXT,
    website VARCHAR(255),
    twitter VARCHAR(50),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Получить пользователя с профилем
SELECT u.*, p.bio, p.website
FROM users u
LEFT JOIN user_profiles p ON p.user_id = u.id
WHERE u.id = 5;
```

### ON DELETE и ON UPDATE

```sql
-- Что делать при удалении родителя?

-- CASCADE — удалить дочерние записи
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

-- SET NULL — установить NULL
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL

-- RESTRICT — запретить удаление (по умолчанию)
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT

-- NO ACTION — то же что RESTRICT
```

**Практический пример:**

```sql
-- Если удалить пользователя — удалятся все его посты
CREATE TABLE posts (
    user_id INT UNSIGNED NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Если удалить категорию — у постов category_id станет NULL
CREATE TABLE posts (
    category_id INT UNSIGNED,
    FOREIGN KEY (category_id) REFERENCES categories(id) 
        ON DELETE SET NULL
);
```

---

## 📐 Часть 4: Нормализация — порядок в данных

### Что такое нормализация?

**Цель:** Избежать дублирования и противоречий в данных

### 1NF (Первая нормальная форма)

**Правило:** В каждой ячейке — только одно значение

❌ **Плохо:**
```sql
CREATE TABLE orders (
    id INT PRIMARY KEY,
    customer VARCHAR(100),
    products VARCHAR(500)  -- "Laptop, Mouse, Keyboard"
);
```

✅ **Хорошо:**
```sql
CREATE TABLE orders (
    id INT PRIMARY KEY,
    customer VARCHAR(100)
);

CREATE TABLE order_items (
    order_id INT,
    product_name VARCHAR(100),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);
```

### 2NF (Вторая нормальная форма)

**Правило:** Нет частичной зависимости от составного ключа

❌ **Плохо:**
```sql
CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    product_name VARCHAR(100),  -- зависит только от product_id!
    price DECIMAL(10,2),        -- зависит только от product_id!
    quantity INT,
    PRIMARY KEY (order_id, product_id)
);
```

✅ **Хорошо:**
```sql
CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    price DECIMAL(10,2)
);

CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    quantity INT,
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### 3NF (Третья нормальная форма)

**Правило:** Нет транзитивных зависимостей

❌ **Плохо:**
```sql
CREATE TABLE orders (
    id INT PRIMARY KEY,
    customer_name VARCHAR(100),
    customer_email VARCHAR(255),  -- зависит от customer_name
    customer_phone VARCHAR(20)    -- зависит от customer_name
);
```

✅ **Хорошо:**
```sql
CREATE TABLE customers (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20)
);

CREATE TABLE orders (
    id INT PRIMARY KEY,
    customer_id INT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

### Когда НЕ нормализовать?

**Денормализация для производительности:**

```sql
-- Плохо для производительности (много JOIN)
SELECT p.title, u.name, COUNT(c.id) as comments_count
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN comments c ON c.post_id = p.id
GROUP BY p.id;

-- Добавим денормализацию
ALTER TABLE posts ADD COLUMN comments_count INT DEFAULT 0;

-- Обновляем при добавлении комментария
UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?;

-- Теперь запрос быстрый
SELECT title, comments_count FROM posts;
```

---

## ⚡ Часть 5: Индексы — ускоряем запросы

### Что такое индекс?

**Аналогия:** Предметный указатель в конце книги

Без индекса MySQL читает **всю таблицу** (медленно!)
С индексом находит нужные строки **мгновенно**

### Типы индексов

```sql
-- PRIMARY KEY — автоматически создаёт уникальный индекс
CREATE TABLE users (
    id INT PRIMARY KEY  -- индекс на id
);

-- UNIQUE — уникальный индекс
CREATE TABLE users (
    email VARCHAR(255) UNIQUE  -- быстрый поиск, без дублей
);

-- INDEX (KEY) — обычный индекс
CREATE TABLE posts (
    user_id INT,
    INDEX idx_user_id (user_id)  -- ускоряет WHERE user_id = ?
);

-- FULLTEXT — полнотекстовый поиск
CREATE TABLE posts (
    content TEXT,
    FULLTEXT INDEX ft_content (content)
);

-- Составной индекс (несколько колонок)
CREATE INDEX idx_user_status ON posts (user_id, status);
```

### Когда создавать индексы?

✅ **Индекс нужен:**
- На колонках в `WHERE`
- На колонках в `JOIN`
- На колонках в `ORDER BY`
- На внешних ключах

```sql
-- Часто ищем посты по статусу
SELECT * FROM posts WHERE status = 'published';
-- Создаём индекс
CREATE INDEX idx_status ON posts (status);

-- Часто сортируем по дате
SELECT * FROM posts ORDER BY created_at DESC;
-- Создаём индекс
CREATE INDEX idx_created_at ON posts (created_at);
```

❌ **Индекс НЕ нужен:**
- На маленьких таблицах (<1000 строк)
- На колонках, которые редко используются
- На колонках с малым разнообразием (пол: M/F)
- На колонках, которые часто изменяются

### Составные индексы

**Правило:** Порядок колонок важен!

```sql
-- Индекс на (user_id, status)
CREATE INDEX idx_user_status ON posts (user_id, status);

-- ✅ Использует индекс
SELECT * FROM posts WHERE user_id = 5 AND status = 'published';
SELECT * FROM posts WHERE user_id = 5;  -- только первая колонка

-- ❌ НЕ использует индекс
SELECT * FROM posts WHERE status = 'published';  -- вторая без первой
```

**Правило большого пальца:** Самая селективная колонка — первая

```sql
-- user_id более селективен (100 разных значений)
-- status менее селективен (3 значения: draft/published/archived)
CREATE INDEX idx_user_status ON posts (user_id, status);
```

### EXPLAIN — анализируем запросы

```sql
EXPLAIN SELECT * FROM posts WHERE user_id = 5;

-- Результат покажет:
-- type: ref (хорошо, использует индекс)
-- possible_keys: idx_user_id
-- key: idx_user_id (использованный индекс)
-- rows: 10 (проверит только 10 строк, а не все)
```

---

## 🏆 Часть 6: Полная схема интернет-магазина

```sql
-- Пользователи
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_email (email)
);

-- Адреса доставки (один пользователь — много адресов)
CREATE TABLE addresses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Категории товаров (с вложенностью)
CREATE TABLE categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id INT UNSIGNED,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_parent_id (parent_id)
);

-- Товары
CREATE TABLE products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id INT UNSIGNED,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    old_price DECIMAL(10,2),  -- для скидок
    stock_quantity SMALLINT UNSIGNED DEFAULT 0,
    sku VARCHAR(50) UNIQUE,  -- артикул
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_category_id (category_id),
    INDEX idx_slug (slug),
    INDEX idx_is_active (is_active)
);

-- Изображения товаров
CREATE TABLE product_images (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order TINYINT UNSIGNED DEFAULT 0,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id)
);

-- Заказы
CREATE TABLE orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    address_id INT UNSIGNED NOT NULL,
    status ENUM('pending','paid','shipped','delivered','cancelled') DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (address_id) REFERENCES addresses(id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
);

-- Товары в заказе
CREATE TABLE order_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    quantity SMALLINT UNSIGNED NOT NULL,
    price DECIMAL(10,2) NOT NULL,  -- фиксируем цену на момент заказа!
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_order_id (order_id)
);

-- Корзина
CREATE TABLE cart_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    quantity SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (user_id, product_id)
);

-- Отзывы
CREATE TABLE reviews (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,  -- 1-5
    comment TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    
    -- Один пользователь — один отзыв на товар
    UNIQUE KEY unique_user_product (user_id, product_id),
    
    CHECK (rating BETWEEN 1 AND 5)
);
```

---

## 💡 Часть 7: Типичные ошибки и как их избежать

### ❌ Ошибка 1: Неправильный тип для цены

```sql
-- ПЛОХО
price FLOAT  -- 19.99 может стать 19.989999...

-- ХОРОШО
price DECIMAL(10,2)  -- всегда точно 19.99
```

### ❌ Ошибка 2: VARCHAR(255) везде

```sql
-- ПЛОХО
country_code VARCHAR(255)  -- тратим 255 байт на "RU"

-- ХОРОШО
country_code CHAR(2)  -- ровно 2 символа
```

### ❌ Ошибка 3: Хранение файлов в БД

```sql
-- ПЛОХО
avatar BLOB  -- база разбухает, медленные запросы

-- ХОРОШО
avatar_path VARCHAR(255)  -- "/uploads/avatars/user123.jpg"
```

### ❌ Ошибка 4: Нет индексов на JOIN

```sql
-- Запрос медленный
SELECT * FROM orders o
JOIN users u ON o.user_id = u.id;

-- Добавляем индекс
CREATE INDEX idx_user_id ON orders (user_id);
```

### ❌ Ошибка 5: Слишком много индексов

```sql
-- ПЛОХО: индекс на каждой колонке
CREATE INDEX idx1 ON products (name);
CREATE INDEX idx2 ON products (price);
CREATE INDEX idx3 ON products (category_id);
CREATE INDEX idx4 ON products (is_active);
-- INSERT становится медленным!

-- ХОРОШО: только частые запросы
CREATE INDEX idx_category_active ON products (category_id, is_active);
```

---

## 🎯 Практические упражнения

### Упражнение 1: Спроектируй библиотеку

Создай схему для библиотеки с:
- Книгами (название, ISBN, год издания)
- Авторами (книга может иметь несколько авторов)
- Читателями
- Выдачами книг (кто, что, когда взял, когда вернул)

<details>
<summary>Решение</summary>

```sql
CREATE TABLE authors (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    birth_year YEAR
);

CREATE TABLE books (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    isbn VARCHAR(13) UNIQUE,
    published_year YEAR,
    copies_total SMALLINT UNSIGNED DEFAULT 1,
    
    INDEX idx_isbn (isbn)
);

-- Многие ко многим: книги ↔ авторы
CREATE TABLE book_author (
    book_id INT UNSIGNED,
    author_id INT UNSIGNED,
    PRIMARY KEY (book_id, author_id),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
);

CREATE TABLE readers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    registered_at DATE DEFAULT (CURRENT_DATE)
);

CREATE TABLE loans (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    book_id INT UNSIGNED NOT NULL,
    reader_id INT UNSIGNED NOT NULL,
    borrowed_at DATE NOT NULL,
    due_date DATE NOT NULL,
    returned_at DATE,
    
    FOREIGN KEY (book_id) REFERENCES books(id),
    FOREIGN KEY (reader_id) REFERENCES readers(id),
    
    INDEX idx_reader_id (reader_id),
    INDEX idx_book_id (book_id),
    INDEX idx_returned (returned_at)
);
```
</details>

### Упражнение 2: Найди проблемы в схеме

```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(1000),
    email VARCHAR(50),
    age FLOAT,
    hobbies VARCHAR(500),  -- "Football, Reading, Gaming"
    created_date VARCHAR(100)
);
```

<details>
<summary>Проблемы и решения</summary>

**Проблемы:**
1. `id INT` — лучше `INT UNSIGNED AUTO_INCREMENT`
2. `name VARCHAR(1000)` — слишком много, хватит 100
3. `email VARCHAR(50)` — мало! Нужно 255
4. `age FLOAT` — возраст целое число, `TINYINT UNSIGNED`
5. `hobbies VARCHAR(500)` — нарушение 1NF, нужна отдельная таблица
6. `created_date VARCHAR(100)` — должна быть `TIMESTAMP`

**Исправленная версия:**

```sql
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    age TINYINT UNSIGNED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_email (email)
);

CREATE TABLE hobbies (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE user_hobbies (
    user_id INT UNSIGNED,
    hobby_id INT UNSIGNED,
    PRIMARY KEY (user_id, hobby_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hobby_id) REFERENCES hobbies(id) ON DELETE CASCADE
);
```
</details>

### Упражнение 3: Оптимизируй запросы

Есть таблица `products` с 100000 записей. Запрос медленный:

```sql
SELECT * FROM products 
WHERE category_id = 5 
  AND is_active = 1 
ORDER BY created_at DESC 
LIMIT 20;
```

Какие индексы создать?

<details>
<summary>Решение</summary>

```sql
-- Составной индекс в правильном порядке
CREATE INDEX idx_category_active_created 
ON products (category_id, is_active, created_at);

-- Почему именно так:
-- 1. category_id — сильно фильтрует (WHERE)
-- 2. is_active — дополнительный фильтр (WHERE)
-- 3. created_at — для ORDER BY

-- Теперь запрос быстрый:
EXPLAIN SELECT * FROM products 
WHERE category_id = 5 AND is_active = 1 
ORDER BY created_at DESC LIMIT 20;
-- type: ref, rows: 20 (вместо 100000!)
```
</details>

---

## 📝 Чеклист хорошей схемы БД

- [ ] Правильные типы данных (не VARCHAR везде)
- [ ] PRIMARY KEY на каждой таблице
- [ ] FOREIGN KEY для связей
- [ ] Индексы на колонках в WHERE и JOIN
- [ ] Нормализация до 3NF (или осознанная денормализация)
- [ ] created_at и updated_at где нужно
- [ ] ON DELETE CASCADE / SET NULL где уместно
- [ ] Уникальные индексы где надо (email, slug)
- [ ] NOT NULL где значение обязательно
- [ ] DEFAULT значения где логично

---

## 🎓 Контрольные вопросы

1. **Чем DECIMAL лучше FLOAT для хранения цен?**
   <details><summary>Ответ</summary>
   DECIMAL хранит точные значения без погрешностей округления. FLOAT — приблизительные вычисления.
   </details>

2. **Когда использовать CHAR вместо VARCHAR?**
   <details><summary>Ответ</summary>
   Когда длина всегда фиксирована: коды стран (RU, US), телефонные коды, хеши фиксированной длины.
   </details>

3. **Зачем нужна промежуточная таблица при связи многие-ко-многим?**
   <details><summary>Ответ</summary>
   Без неё невозможно хранить связи. Нельзя в posts засунуть несколько tag_id, и наоборот.
   </details>

4. **Что делает ON DELETE CASCADE?**
   <details><summary>Ответ</summary>
   При удалении родительской записи автоматически удаляет все дочерние (например, удалили пост → удалились комментарии).
   </details>

5. **Нужен ли индекс на колонке с 2 возможными значениями (пол: M/F)?**
   <details><summary>Ответ</summary>
   Обычно нет — слишком мало уникальных значений, индекс не поможет.
   </details>

---

## 🚀 Что дальше?

Теперь ты понимаешь, как проектировать эффективные базы данных! В следующей главе мы вернёмся к PHP и изучим **паттерны работы с БД** — Repository, Active Record, Query Builder.

**Следующая глава:** 
```
Глава 3.3: PDO — подключение, prepared statements, fetchAll/fetch, обработка ошибок, транзакции
```
