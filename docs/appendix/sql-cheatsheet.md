# Приложение В: Шпаргалка по SQL — запросы, JOIN, агрегация, индексы

## 📌 О чём это приложение

Эта шпаргалка — твой карманный справочник по SQL. Здесь собраны самые частые запросы, синтаксис, примеры и паттерны, которые ты будешь использовать каждый день. Держи её под рукой во время работы.

**Структура:**
- ✅ Быстрый синтаксис без лишних слов
- 💡 Реальные примеры из практики
- ⚠️ Частые ошибки и как их избежать
- 🎯 Когда использовать тот или иной подход

---

## 1️⃣ БАЗОВЫЕ ЗАПРОСЫ (CRUD)

### SELECT — Выборка данных

```sql
-- Все столбцы
SELECT * FROM users;

-- Конкретные столбцы
SELECT id, name, email FROM users;

-- С алиасами
SELECT 
    id AS user_id,
    CONCAT(first_name, ' ', last_name) AS full_name,
    created_at AS registered_at
FROM users;

-- DISTINCT — уникальные значения
SELECT DISTINCT city FROM users;
```

### WHERE — Фильтрация

```sql
-- Основные операторы
SELECT * FROM products WHERE price > 1000;
SELECT * FROM products WHERE price BETWEEN 500 AND 2000;
SELECT * FROM products WHERE category_id IN (1, 3, 5);
SELECT * FROM products WHERE name LIKE '%phone%'; -- содержит "phone"
SELECT * FROM products WHERE name LIKE 'iPhone%'; -- начинается с "iPhone"
SELECT * FROM products WHERE description IS NULL;
SELECT * FROM products WHERE description IS NOT NULL;

-- Логические операторы
SELECT * FROM products 
WHERE price > 1000 
  AND category_id = 2 
  AND in_stock = 1;

SELECT * FROM products 
WHERE category_id = 1 OR category_id = 2;

-- NOT
SELECT * FROM users WHERE NOT city = 'Moscow';
SELECT * FROM users WHERE email NOT LIKE '%@gmail.com';
```

### ORDER BY — Сортировка

```sql
-- По одному полю
SELECT * FROM products ORDER BY price ASC;  -- по возрастанию
SELECT * FROM products ORDER BY price DESC; -- по убыванию

-- По нескольким полям
SELECT * FROM products 
ORDER BY category_id ASC, price DESC;

-- NULL в начале или конце
SELECT * FROM products 
ORDER BY discount IS NULL, discount DESC;
```

### LIMIT и OFFSET — Пагинация

```sql
-- Первые 10 записей
SELECT * FROM products LIMIT 10;

-- Записи с 11 по 20 (страница 2)
SELECT * FROM products LIMIT 10 OFFSET 10;

-- Формула для пагинации
-- LIMIT = items_per_page
-- OFFSET = (page - 1) * items_per_page

-- Страница 3, по 20 товаров
SELECT * FROM products LIMIT 20 OFFSET 40;
```

### INSERT — Вставка данных

```sql
-- Одна запись
INSERT INTO users (name, email, password) 
VALUES ('Ivan', 'ivan@mail.ru', 'hashed_password');

-- Несколько записей
INSERT INTO users (name, email, password) VALUES
    ('Ivan', 'ivan@mail.ru', 'hash1'),
    ('Maria', 'maria@mail.ru', 'hash2'),
    ('Petr', 'petr@mail.ru', 'hash3');

-- Получить ID вставленной записи (в PHP)
$pdo->lastInsertId();

-- Игнорировать дубликаты
INSERT IGNORE INTO users (email, name) 
VALUES ('ivan@mail.ru', 'Ivan');

-- Обновить при дубликате
INSERT INTO users (email, name, login_count) 
VALUES ('ivan@mail.ru', 'Ivan', 1)
ON DUPLICATE KEY UPDATE 
    login_count = login_count + 1;
```

### UPDATE — Обновление данных

```sql
-- Обновить одну запись
UPDATE users 
SET email = 'newemail@mail.ru' 
WHERE id = 1;

-- Обновить несколько полей
UPDATE users 
SET 
    email = 'newemail@mail.ru',
    updated_at = NOW()
WHERE id = 1;

-- Обновить по условию
UPDATE products 
SET price = price * 0.9 
WHERE category_id = 3;

-- ⚠️ БЕЗ WHERE обновит ВСЕ записи!
UPDATE users SET role = 'admin'; -- ОПАСНО!
```

### DELETE — Удаление данных

```sql
-- Удалить одну запись
DELETE FROM users WHERE id = 1;

-- Удалить по условию
DELETE FROM products WHERE price < 100;

-- ⚠️ БЕЗ WHERE удалит ВСЕ записи!
DELETE FROM users; -- ОПАСНО!

-- Очистить таблицу полностью (быстрее DELETE)
TRUNCATE TABLE logs;
```

---

## 2️⃣ JOIN — Объединение таблиц

### Типы JOIN

```
INNER JOIN — только совпадающие записи
LEFT JOIN  — все из левой + совпадающие из правой
RIGHT JOIN — все из правой + совпадающие из левой
CROSS JOIN — все комбинации (декартово произведение)
```

### INNER JOIN — Пересечение

```sql
-- Товары с названиями категорий
SELECT 
    products.id,
    products.name AS product_name,
    categories.name AS category_name,
    products.price
FROM products
INNER JOIN categories ON products.category_id = categories.id;

-- Алиасы таблиц (короче и читаемей)
SELECT 
    p.id,
    p.name AS product_name,
    c.name AS category_name,
    p.price
FROM products p
INNER JOIN categories c ON p.category_id = c.id;

-- Несколько JOIN
SELECT 
    o.id AS order_id,
    u.name AS customer_name,
    p.name AS product_name,
    oi.quantity,
    oi.price
FROM orders o
INNER JOIN users u ON o.user_id = u.id
INNER JOIN order_items oi ON oi.order_id = o.id
INNER JOIN products p ON oi.product_id = p.id;
```

### LEFT JOIN — Все из левой таблицы

```sql
-- Все пользователи + их заказы (даже если заказов нет)
SELECT 
    u.id,
    u.name,
    COUNT(o.id) AS orders_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name;

-- Найти пользователей БЕЗ заказов
SELECT u.*
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.id IS NULL;

-- Категории и количество товаров (даже пустые категории)
SELECT 
    c.name AS category,
    COUNT(p.id) AS products_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id, c.name;
```

### RIGHT JOIN — Все из правой таблицы

```sql
-- То же самое, что LEFT JOIN, но таблицы наоборот
SELECT 
    c.name AS category,
    COUNT(p.id) AS products_count
FROM products p
RIGHT JOIN categories c ON p.category_id = c.id
GROUP BY c.id, c.name;

-- 💡 RIGHT JOIN используется редко, обычно просто меняют таблицы местами в LEFT JOIN
```

### CROSS JOIN — Декартово произведение

```sql
-- Все комбинации цветов и размеров
SELECT 
    colors.name AS color,
    sizes.name AS size
FROM colors
CROSS JOIN sizes;

-- Результат:
-- Red, S
-- Red, M
-- Red, L
-- Blue, S
-- Blue, M
-- Blue, L
```

### Self JOIN — Таблица сама с собой

```sql
-- Сотрудники и их руководители
SELECT 
    e.name AS employee,
    m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;

-- Категории и подкатегории
SELECT 
    c1.name AS category,
    c2.name AS subcategory
FROM categories c1
LEFT JOIN categories c2 ON c2.parent_id = c1.id
WHERE c1.parent_id IS NULL;
```

---

## 3️⃣ Агрегатные функции

### Основные функции

```sql
-- COUNT — подсчёт строк
SELECT COUNT(*) FROM users;              -- все строки
SELECT COUNT(id) FROM users;             -- не NULL значения
SELECT COUNT(DISTINCT city) FROM users;  -- уникальные значения

-- SUM — сумма
SELECT SUM(price) FROM products;
SELECT SUM(quantity * price) FROM order_items;

-- AVG — среднее
SELECT AVG(price) FROM products;
SELECT AVG(rating) FROM reviews;

-- MIN / MAX — минимум и максимум
SELECT MIN(price) FROM products;
SELECT MAX(created_at) FROM orders;

-- Несколько функций одновременно
SELECT 
    COUNT(*) AS total_products,
    AVG(price) AS avg_price,
    MIN(price) AS min_price,
    MAX(price) AS max_price,
    SUM(in_stock) AS total_in_stock
FROM products;
```

### GROUP BY — Группировка

```sql
-- Количество товаров в каждой категории
SELECT 
    category_id,
    COUNT(*) AS products_count
FROM products
GROUP BY category_id;

-- С названием категории (JOIN)
SELECT 
    c.name AS category,
    COUNT(p.id) AS products_count,
    AVG(p.price) AS avg_price
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id, c.name;

-- Группировка по нескольким полям
SELECT 
    category_id,
    in_stock,
    COUNT(*) AS count
FROM products
GROUP BY category_id, in_stock;

-- Продажи по датам
SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS orders_count,
    SUM(total) AS revenue
FROM orders
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### HAVING — Фильтрация после группировки

```sql
-- WHERE фильтрует ДО группировки
-- HAVING фильтрует ПОСЛЕ группировки

-- Категории с более чем 10 товарами
SELECT 
    category_id,
    COUNT(*) AS count
FROM products
GROUP BY category_id
HAVING COUNT(*) > 10;

-- Пользователи с заказами на сумму > 10000
SELECT 
    user_id,
    SUM(total) AS total_spent
FROM orders
GROUP BY user_id
HAVING SUM(total) > 10000;

-- WHERE + HAVING
SELECT 
    category_id,
    AVG(price) AS avg_price
FROM products
WHERE in_stock = 1              -- фильтр ДО группировки
GROUP BY category_id
HAVING AVG(price) > 1000        -- фильтр ПОСЛЕ группировки
ORDER BY avg_price DESC;
```

---

## 4️⃣ Подзапросы (Subqueries)

### В WHERE

```sql
-- Товары дороже средней цены
SELECT * FROM products
WHERE price > (SELECT AVG(price) FROM products);

-- Пользователи с заказами
SELECT * FROM users
WHERE id IN (SELECT DISTINCT user_id FROM orders);

-- Пользователи БЕЗ заказов
SELECT * FROM users
WHERE id NOT IN (SELECT DISTINCT user_id FROM orders);

-- ⚠️ Проблема с NULL в NOT IN:
-- Если в подзапросе есть NULL, NOT IN вернёт пустой результат!
-- Лучше использовать NOT EXISTS или LEFT JOIN
```

### В SELECT

```sql
-- Количество заказов для каждого пользователя
SELECT 
    u.name,
    u.email,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS orders_count
FROM users u;

-- Последний заказ пользователя
SELECT 
    u.name,
    (SELECT MAX(created_at) FROM orders WHERE user_id = u.id) AS last_order
FROM users u;
```

### В FROM (производная таблица)

```sql
-- Топ-3 самых дорогих товара в каждой категории
SELECT category_id, name, price
FROM (
    SELECT 
        category_id,
        name,
        price,
        ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY price DESC) AS rn
    FROM products
) ranked
WHERE rn <= 3;

-- Средняя цена по категориям
SELECT 
    cat_stats.category_id,
    cat_stats.avg_price,
    c.name
FROM (
    SELECT 
        category_id,
        AVG(price) AS avg_price
    FROM products
    GROUP BY category_id
) cat_stats
JOIN categories c ON c.id = cat_stats.category_id;
```

### EXISTS / NOT EXISTS

```sql
-- Категории, в которых есть товары
SELECT * FROM categories c
WHERE EXISTS (
    SELECT 1 FROM products p WHERE p.category_id = c.id
);

-- Категории без товаров
SELECT * FROM categories c
WHERE NOT EXISTS (
    SELECT 1 FROM products p WHERE p.category_id = c.id
);

-- 💡 EXISTS быстрее IN для больших таблиц
-- EXISTS останавливается при первом совпадении
```

---

## 5️⃣ Функции и операторы

### Строковые функции

```sql
-- CONCAT — склеивание строк
SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM users;
SELECT CONCAT_WS(' - ', code, name) FROM products; -- с разделителем

-- LENGTH — длина строки
SELECT name, LENGTH(name) FROM users;

-- UPPER / LOWER — регистр
SELECT UPPER(name) FROM categories;
SELECT LOWER(email) FROM users;

-- SUBSTRING — подстрока
SELECT SUBSTRING(description, 1, 100) FROM products; -- первые 100 символов
SELECT SUBSTRING(phone, -4) FROM users;              -- последние 4 символа

-- REPLACE — замена
SELECT REPLACE(description, 'old', 'new') FROM products;

-- TRIM — удаление пробелов
SELECT TRIM(name) FROM users;           -- с обоих концов
SELECT LTRIM(name) FROM users;          -- слева
SELECT RTRIM(name) FROM users;          -- справа
```

### Числовые функции

```sql
-- ROUND — округление
SELECT ROUND(price, 2) FROM products;           -- до 2 знаков
SELECT ROUND(avg_rating, 1) FROM products;      -- до 1 знака

-- CEIL / FLOOR — округление вверх/вниз
SELECT CEIL(price) FROM products;               -- 12.1 → 13
SELECT FLOOR(price) FROM products;              -- 12.9 → 12

-- ABS — модуль числа
SELECT ABS(balance) FROM accounts;

-- RAND — случайное число
SELECT * FROM products ORDER BY RAND() LIMIT 5; -- 5 случайных товаров
```

### Функции даты и времени

```sql
-- NOW — текущая дата и время
SELECT NOW();                                   -- 2024-03-15 14:30:25

-- CURDATE / CURTIME — отдельно дата и время
SELECT CURDATE();                               -- 2024-03-15
SELECT CURTIME();                               -- 14:30:25

-- DATE / TIME — извлечение из datetime
SELECT DATE(created_at) FROM orders;
SELECT TIME(created_at) FROM orders;

-- YEAR / MONTH / DAY — компоненты даты
SELECT YEAR(created_at) FROM orders;
SELECT MONTH(created_at) FROM orders;
SELECT DAY(created_at) FROM orders;

-- DATE_FORMAT — форматирование
SELECT DATE_FORMAT(created_at, '%d.%m.%Y') FROM orders;  -- 15.03.2024
SELECT DATE_FORMAT(created_at, '%Y-%m') FROM orders;     -- 2024-03

-- DATEDIFF — разница в днях
SELECT DATEDIFF(NOW(), created_at) AS days_ago FROM orders;

-- DATE_ADD / DATE_SUB — прибавить/вычесть
SELECT DATE_ADD(NOW(), INTERVAL 7 DAY);         -- через неделю
SELECT DATE_SUB(NOW(), INTERVAL 1 MONTH);       -- месяц назад

-- Заказы за последние 30 дней
SELECT * FROM orders 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### CASE — Условная логика

```sql
-- Простой CASE
SELECT 
    name,
    price,
    CASE 
        WHEN price < 500 THEN 'Дешёвый'
        WHEN price < 2000 THEN 'Средний'
        ELSE 'Дорогой'
    END AS price_category
FROM products;

-- С агрегацией
SELECT 
    category_id,
    SUM(CASE WHEN in_stock = 1 THEN 1 ELSE 0 END) AS in_stock_count,
    SUM(CASE WHEN in_stock = 0 THEN 1 ELSE 0 END) AS out_of_stock_count
FROM products
GROUP BY category_id;

-- NULLIF — вернуть NULL при совпадении
SELECT NULLIF(discount, 0) FROM products;       -- 0 → NULL

-- COALESCE — первое не-NULL значение
SELECT COALESCE(phone, email, 'Нет контакта') FROM users;
```

### IF / IFNULL

```sql
-- IF — тернарный оператор
SELECT 
    name,
    IF(in_stock = 1, 'В наличии', 'Нет в наличии') AS availability
FROM products;

-- IFNULL — замена NULL
SELECT IFNULL(discount, 0) FROM products;

-- Разница с COALESCE:
-- IFNULL принимает 2 аргумента
-- COALESCE принимает любое количество
```

---

## 6️⃣ Индексы

### Создание индексов

```sql
-- Обычный индекс
CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_category ON products(category_id);

-- Уникальный индекс
CREATE UNIQUE INDEX idx_unique_email ON users(email);

-- Составной индекс (несколько полей)
CREATE INDEX idx_category_price ON products(category_id, price);

-- Полнотекстовый индекс (для поиска)
CREATE FULLTEXT INDEX idx_description ON products(description);

-- Удаление индекса
DROP INDEX idx_email ON users;

-- Просмотр индексов таблицы
SHOW INDEX FROM users;
```

### Когда использовать индексы

```sql
-- ✅ Индексируй:
-- - PRIMARY KEY (создаётся автоматически)
-- - FOREIGN KEY (category_id, user_id и т.д.)
-- - Поля в WHERE (email, status, created_at)
-- - Поля в ORDER BY (если часто сортируешь)
-- - Поля в JOIN

-- ❌ Не индексируй:
-- - Маленькие таблицы (<1000 строк)
-- - Поля с низкой селективностью (например, пол: M/F)
-- - Поля, которые часто обновляются
-- - Очень длинные текстовые поля

-- 💡 Составные индексы:
-- Порядок полей важен!
-- INDEX (category_id, price) работает для:
--   WHERE category_id = 1
--   WHERE category_id = 1 AND price > 100
-- Но НЕ работает для:
--   WHERE price > 100 (только второе поле)

-- 💡 Проверь использование индекса:
EXPLAIN SELECT * FROM products WHERE category_id = 1;
```

### EXPLAIN — Анализ запроса

```sql
EXPLAIN SELECT * FROM orders 
WHERE user_id = 123 
ORDER BY created_at DESC;

-- Смотри на:
-- type: 
--   const/eq_ref - отлично
--   ref - хорошо
--   range - нормально
--   ALL - плохо (полное сканирование таблицы)
-- possible_keys: какие индексы могут быть использованы
-- key: какой индекс реально используется
-- rows: сколько строк будет просканировано

-- EXPLAIN ANALYZE (MySQL 8.0+) — с реальным временем выполнения
EXPLAIN ANALYZE 
SELECT * FROM products WHERE price > 1000;
```

---

## 7️⃣ Транзакции

### Основы

```sql
-- Начать транзакцию
START TRANSACTION;
-- или
BEGIN;

-- Выполнить запросы
UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
UPDATE accounts SET balance = balance + 1000 WHERE id = 2;

-- Подтвердить изменения
COMMIT;

-- Или откатить
ROLLBACK;
```

### В PHP с PDO

```php
try {
    $pdo->beginTransaction();
    
    // Списать со счёта отправителя
    $stmt = $pdo->prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?");
    $stmt->execute([1000, $fromAccountId]);
    
    // Зачислить на счёт получателя
    $stmt = $pdo->prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?");
    $stmt->execute([1000, $toAccountId]);
    
    // Записать в историю
    $stmt = $pdo->prepare("INSERT INTO transactions (from_id, to_id, amount) VALUES (?, ?, ?)");
    $stmt->execute([$fromAccountId, $toAccountId, 1000]);
    
    $pdo->commit();
    
} catch (Exception $e) {
    $pdo->rollBack();
    throw $e;
}
```

### ACID свойства

```
Atomicity (Атомарность)   — всё или ничего
Consistency (Согласованность) — БД всегда в корректном состоянии
Isolation (Изолированность)   — транзакции не влияют друг на друга
Durability (Долговечность)    — данные сохраняются после commit
```

---

## 8️⃣ Продвинутые запросы

### UNION — Объединение результатов

```sql
-- Все email из users и из admins
SELECT email FROM users
UNION
SELECT email FROM admins;

-- UNION убирает дубликаты
-- UNION ALL оставляет дубликаты (быстрее)

SELECT name FROM products WHERE category_id = 1
UNION ALL
SELECT name FROM products WHERE category_id = 2;

-- Количество столбцов должно совпадать!
-- Типы данных должны быть совместимы
```

### Window Functions (MySQL 8.0+)

```sql
-- ROW_NUMBER — нумерация строк
SELECT 
    name,
    price,
    ROW_NUMBER() OVER (ORDER BY price DESC) AS row_num
FROM products;

-- RANK — ранг с пропусками
SELECT 
    name,
    price,
    RANK() OVER (ORDER BY price DESC) AS rank
FROM products;
-- Если цены: 100, 100, 90
-- Ранги: 1, 1, 3 (не 1, 1, 2!)

-- DENSE_RANK — ранг без пропусков
-- Ранги: 1, 1, 2

-- PARTITION BY — группировка внутри окна
SELECT 
    category_id,
    name,
    price,
    ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY price DESC) AS rank_in_category
FROM products;

-- OVER() без PARTITION BY — по всей таблице
SELECT 
    name,
    price,
    AVG(price) OVER() AS avg_price_overall
FROM products;
```

### WITH (CTE) — Общие табличные выражения

```sql
-- Вместо подзапросов используй CTE для читаемости
WITH expensive_products AS (
    SELECT * FROM products WHERE price > 5000
),
cheap_products AS (
    SELECT * FROM products WHERE price < 1000
)
SELECT 
    (SELECT COUNT(*) FROM expensive_products) AS expensive_count,
    (SELECT COUNT(*) FROM cheap_products) AS cheap_count;

-- Рекурсивные CTE — для иерархий
WITH RECURSIVE category_tree AS (
    -- Базовый случай
    SELECT id, name, parent_id, 1 AS level
    FROM categories
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- Рекурсивный случай
    SELECT c.id, c.name, c.parent_id, ct.level + 1
    FROM categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree ORDER BY level, id;
```

---

## 9️⃣ Оптимизация запросов

### Частые проблемы

```sql
-- ❌ SELECT * — лишние данные
SELECT * FROM products;
-- ✅ Выбирай только нужные поля
SELECT id, name, price FROM products;

-- ❌ Отсутствие индексов
SELECT * FROM orders WHERE user_id = 123;
-- ✅ Создай индекс
CREATE INDEX idx_user_id ON orders(user_id);

-- ❌ Функции в WHERE (индекс не работает)
SELECT * FROM users WHERE YEAR(created_at) = 2024;
-- ✅ Используй диапазон
SELECT * FROM users 
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';

-- ❌ OR вместо IN
SELECT * FROM products WHERE id = 1 OR id = 2 OR id = 3;
-- ✅ IN быстрее
SELECT * FROM products WHERE id IN (1, 2, 3);

-- ❌ NOT IN с подзапросом (медленно + проблемы с NULL)
SELECT * FROM users WHERE id NOT IN (SELECT user_id FROM orders);
-- ✅ LEFT JOIN с IS NULL
SELECT u.* FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.id IS NULL;
```

### Проблема N+1

```sql
-- ❌ В коде: запрос на каждую запись
-- SELECT * FROM orders;
-- foreach order:
--   SELECT * FROM users WHERE id = order.user_id;
-- Итого: 1 + N запросов

-- ✅ Один запрос с JOIN
SELECT 
    o.*,
    u.name AS user_name,
    u.email AS user_email
FROM orders o
INNER JOIN users u ON u.id = o.user_id;
```

### Покрывающий индекс

```sql
-- Индекс содержит ВСЕ нужные поля
CREATE INDEX idx_covering ON products(category_id, price, name);

-- Этот запрос вообще не обращается к таблице!
SELECT name, price FROM products 
WHERE category_id = 1 
ORDER BY price;

-- Всё берётся из индекса → SUPER FAST
```

---

## 🔟 Типы данных — Шпаргалка

### Числовые

```sql
TINYINT      -- -128 до 127 (1 байт)
SMALLINT     -- -32768 до 32767 (2 байта)
INT          -- -2млрд до 2млрд (4 байта)
BIGINT       -- огромные числа (8 байт)

DECIMAL(10,2) -- точные числа (цены, деньги)
FLOAT        -- числа с плавающей точкой
DOUBLE       -- больше precision

-- 💡 Для денег ВСЕГДА используй DECIMAL!
price DECIMAL(10, 2)  -- 12345678.90
```

### Строковые

```sql
CHAR(10)     -- фиксированная длина, дополняется пробелами
VARCHAR(255) -- переменная длина, до 255 символов
TEXT         -- длинный текст, до 65KB
MEDIUMTEXT   -- до 16MB
LONGTEXT     -- до 4GB

-- 💡 Для email, phone — VARCHAR
-- 💡 Для статей, описаний — TEXT
```

### Дата и время

```sql
DATE         -- 2024-03-15
TIME         -- 14:30:25
DATETIME     -- 2024-03-15 14:30:25
TIMESTAMP    -- автообновление, часовой пояс
YEAR         -- 2024

-- 💡 created_at / updated_at — TIMESTAMP
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

### Другие

```sql
BOOLEAN      -- (на самом деле TINYINT(1))
ENUM('draft', 'published', 'deleted')  -- список значений
JSON         -- для хранения JSON (MySQL 5.7+)
```

---

## 1️⃣1️⃣ Создание таблиц — Best Practices

```sql
CREATE TABLE users (
    -- Primary Key
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Основные поля
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    
    -- Enum для статусов
    status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Индексы
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Foreign Keys
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key с каскадным удалением
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Связь многие-ко-многим
CREATE TABLE product_tag (
    product_id BIGINT UNSIGNED NOT NULL,
    tag_id BIGINT UNSIGNED NOT NULL,
    
    PRIMARY KEY (product_id, tag_id),
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 1️⃣2️⃣ Частые паттерны

### Мягкое удаление (Soft Delete)

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL;

-- Вместо DELETE
UPDATE users SET deleted_at = NOW() WHERE id = 1;

-- Выборка только активных
SELECT * FROM users WHERE deleted_at IS NULL;

-- Восстановление
UPDATE users SET deleted_at = NULL WHERE id = 1;
```

### Пагинация с курсором

```sql
-- Вместо OFFSET (медленно на больших страницах)
SELECT * FROM products 
WHERE id > last_seen_id 
ORDER BY id 
LIMIT 20;

-- last_seen_id — это id последнего элемента предыдущей страницы
```

### Счётчики

```sql
-- ❌ Медленно (пересчёт каждый раз)
SELECT COUNT(*) FROM orders WHERE user_id = 1;

-- ✅ Счётчик в таблице users
ALTER TABLE users ADD COLUMN orders_count INT DEFAULT 0;

-- Обновление триггером или в коде
UPDATE users SET orders_count = orders_count + 1 WHERE id = 1;
```

### Денормализация для производительности

```sql
-- Вместо JOIN каждый раз
SELECT o.*, u.name AS user_name
FROM orders o
JOIN users u ON u.id = o.user_id;

-- Храни имя в orders
ALTER TABLE orders ADD COLUMN user_name VARCHAR(100);

-- Обновляй при изменении
UPDATE orders SET user_name = 'New Name' WHERE user_id = 1;

-- ⚠️ Жертвуем нормализацией ради скорости
-- Применяй только если действительно нужно
```

---

## 1️⃣3️⃣ Безопасность

### SQL-инъекции — КАК ЗАЩИТИТЬСЯ

```php
// ❌ ОПАСНО! Никогда так не делай!
$query = "SELECT * FROM users WHERE email = '$email'";
$pdo->query($query);

// ✅ Prepared Statements
$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute([$email]);

// или named parameters
$stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email");
$stmt->execute(['email' => $email]);
```

### Права доступа

```sql
-- Создай отдельного пользователя для приложения
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'strong_password';

-- Дай минимальные права
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'app_user'@'localhost';

-- ❌ Не давай DROP, CREATE, ALTER для production пользователя!
```

---

## 🎯 Быстрые команды для терминала

```bash
# Вход в MySQL
mysql -u root -p

# Выбор базы данных
USE database_name;

# Показать таблицы
SHOW TABLES;

# Структура таблицы
DESCRIBE users;
# или
SHOW CREATE TABLE users;

# Экспорт базы данных
mysqldump -u root -p database_name > backup.sql

# Импорт базы данных
mysql -u root -p database_name < backup.sql

# Экспорт только структуры
mysqldump -u root -p --no-data database_name > structure.sql

# Экспорт только данных
mysqldump -u root -p --no-create-info database_name > data.sql
```

---

## ✅ Чеклист перед запуском запроса в production

- [ ] Используешь ли prepared statements?
- [ ] Есть ли WHERE в UPDATE/DELETE? (если нет — обновятся ВСЕ записи!)
- [ ] Создал ли индексы для полей в WHERE и JOIN?
- [ ] Проверил ли запрос через EXPLAIN?
- [ ] Тестировал ли на копии данных?
- [ ] Есть ли LIMIT для больших выборок?
- [ ] Используешь ли транзакции для критичных операций?
- [ ] Нужна ли пагинация для результата?

---

## 🎓 Что дальше?

Эта шпаргалка покрывает 90% повседневных задач с SQL. Для углубления:

1. **Изучи EXPLAIN** — понимание того, как MySQL выполняет запросы
2. **Практикуй оптимизацию** — медленные запросы на больших данных
3. **Изучи репликацию и шардинг** — для высоконагруженных проектов
4. **NoSQL** — когда SQL не подходит (Redis, MongoDB)

---

## 💾 Сохрани эту шпаргалку!

Держи её под рукой во время работы. SQL — это навык, который нарабатывается практикой. Чем больше пишешь запросы, тем лучше понимаешь, как работает БД.

**Совет:** Создай свою базу данных для экспериментов и пробуй все примеры вживую. Ломать свою тестовую БД — лучший способ научиться! 🚀