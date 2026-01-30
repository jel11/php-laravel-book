# Глава 3.1: Основы SQL — SELECT, INSERT, UPDATE, DELETE, JOIN, подзапросы (с практикой)

## 📖 Введение

Представь, что ты строишь библиотеку. У тебя есть книги, читатели, полки. Ты можешь:
- **Посмотреть**, какие книги есть на полке (SELECT)
- **Добавить** новую книгу (INSERT)
- **Обновить** информацию о книге (UPDATE)
- **Удалить** старую книгу (DELETE)
- **Связать** данные: какой читатель взял какую книгу (JOIN)
- **Найти сложное**: книги, которые брали чаще, чем читатель Х (подзапросы)

SQL (Structured Query Language) — это язык для общения с базами данных. Без него твой PHP-код беспомощен: он не может сохранять данные навсегда, не может искать пользователей, не может строить отчёты.

**В этой главе:**
- Научимся читать данные всеми возможными способами
- Поймём, как правильно добавлять, менять и удалять записи
- Освоим JOIN'ы — самую мощную и сложную часть SQL
- Разберём подзапросы и агрегатные функции
- Сделаем реальную БД для интернет-магазина

---

## 🎯 Что такое SQL и зачем он нужен

### SQL — это язык запросов

```sql
-- Это SQL-запрос. Он читается почти как английский:
SELECT название, цена 
FROM товары 
WHERE цена < 1000 
ORDER BY цена DESC;

-- "Выбери название и цену 
--  из таблицы товары 
--  где цена меньше 1000 
--  отсортируй по цене по убыванию"
```

### Реляционная модель данных

Данные хранятся в **таблицах** (как Excel, но с правилами):

**Таблица `users`:**
```
| id | name     | email           | created_at |
|----|----------|-----------------|------------|
| 1  | Иван     | ivan@mail.ru    | 2024-01-15 |
| 2  | Мария    | maria@gmail.com | 2024-01-16 |
| 3  | Пётр     | petr@ya.ru      | 2024-01-17 |
```

**Таблица `orders`:**
```
| id | user_id | total | status    |
|----|---------|-------|-----------|
| 1  | 1       | 5000  | paid      |
| 2  | 1       | 3000  | pending   |
| 3  | 2       | 7500  | paid      |
```

Связь: `orders.user_id` → `users.id`

---

## 📊 SELECT — Чтение данных

### Базовый синтаксис

```sql
SELECT столбец1, столбец2 
FROM таблица 
WHERE условие 
ORDER BY столбец 
LIMIT количество;
```

### Примеры SELECT

```sql
-- Все данные из таблицы
SELECT * FROM users;

-- Только нужные колонки
SELECT name, email FROM users;

-- С условием
SELECT * FROM users WHERE id = 1;

-- Несколько условий
SELECT * FROM products 
WHERE price > 1000 AND stock > 0;

-- Поиск по части строки
SELECT * FROM users 
WHERE email LIKE '%@gmail.com';

-- Сортировка
SELECT * FROM products 
ORDER BY price DESC;

-- Ограничение количества
SELECT * FROM products 
ORDER BY created_at DESC 
LIMIT 10;

-- Пагинация (пропустить 20, взять 10)
SELECT * FROM products 
LIMIT 10 OFFSET 20;
```

### Операторы сравнения

```sql
-- Равно
WHERE price = 1000

-- Не равно
WHERE status != 'deleted'
-- или
WHERE status <> 'deleted'

-- Больше/меньше
WHERE price > 1000
WHERE price >= 1000
WHERE price < 5000
WHERE price <= 5000

-- Диапазон
WHERE price BETWEEN 1000 AND 5000

-- Список значений
WHERE status IN ('pending', 'processing', 'paid')

-- NULL проверка
WHERE deleted_at IS NULL
WHERE deleted_at IS NOT NULL
```

### Логические операторы

```sql
-- AND (и то, и то)
WHERE price > 1000 AND stock > 0

-- OR (или то, или то)
WHERE category = 'electronics' OR category = 'computers'

-- NOT (отрицание)
WHERE NOT status = 'deleted'

-- Комбинация (скобки важны!)
WHERE (category = 'electronics' OR category = 'computers')
  AND price < 5000
  AND stock > 0
```

### LIKE — Поиск по шаблону

```sql
-- Начинается с "Иван"
WHERE name LIKE 'Иван%'

-- Заканчивается на ".com"
WHERE email LIKE '%.com'

-- Содержит "admin"
WHERE email LIKE '%admin%'

-- Второй символ "а"
WHERE name LIKE '_а%'

-- Регистронезависимый поиск в MySQL
WHERE LOWER(name) LIKE '%иван%'
```

### DISTINCT — Уникальные значения

```sql
-- Все уникальные города
SELECT DISTINCT city FROM users;

-- Уникальные комбинации
SELECT DISTINCT category, brand FROM products;
```

### Алиасы (псевдонимы)

```sql
-- Переименование колонок
SELECT 
    name AS product_name,
    price AS current_price,
    price * 1.2 AS price_with_tax
FROM products;

-- Переименование таблиц (для JOIN)
SELECT u.name, u.email 
FROM users AS u 
WHERE u.id = 1;

-- AS можно опустить
SELECT name product_name, price current_price 
FROM products;
```

---

## ➕ INSERT — Добавление данных

### Базовый синтаксис

```sql
INSERT INTO таблица (колонка1, колонка2) 
VALUES (значение1, значение2);
```

### Примеры INSERT

```sql
-- Одна запись
INSERT INTO users (name, email, created_at) 
VALUES ('Алексей', 'alex@mail.ru', NOW());

-- Несколько записей за раз
INSERT INTO users (name, email, created_at) 
VALUES 
    ('Ольга', 'olga@mail.ru', NOW()),
    ('Дмитрий', 'dmitry@mail.ru', NOW()),
    ('Елена', 'elena@mail.ru', NOW());

-- Если указываем все колонки по порядку
INSERT INTO users 
VALUES (NULL, 'Сергей', 'sergey@mail.ru', NOW());
-- NULL для автоинкремента

-- Получить ID последней вставленной записи
INSERT INTO users (name, email) 
VALUES ('Тест', 'test@test.ru');
-- В PHP: $pdo->lastInsertId()
```

### INSERT с SELECT (копирование данных)

```sql
-- Скопировать активных пользователей в архив
INSERT INTO users_archive (name, email, created_at)
SELECT name, email, created_at 
FROM users 
WHERE status = 'active';
```

### INSERT ... ON DUPLICATE KEY UPDATE (MySQL)

```sql
-- Если email уже существует — обновить, иначе вставить
INSERT INTO users (email, name, login_count) 
VALUES ('ivan@mail.ru', 'Иван', 1)
ON DUPLICATE KEY UPDATE 
    login_count = login_count + 1,
    updated_at = NOW();
-- Требуется UNIQUE индекс на email
```

---

## 🔄 UPDATE — Обновление данных

### Базовый синтаксис

```sql
UPDATE таблица 
SET колонка1 = значение1, колонка2 = значение2 
WHERE условие;
```

### ⚠️ КРИТИЧЕСКИ ВАЖНО: всегда используй WHERE!

```sql
-- ❌ ОПАСНО! Обновит ВСЕ записи!
UPDATE users SET role = 'admin';

-- ✅ Правильно
UPDATE users SET role = 'admin' WHERE id = 1;
```

### Примеры UPDATE

```sql
-- Обновить одно поле
UPDATE products 
SET stock = 100 
WHERE id = 5;

-- Обновить несколько полей
UPDATE users 
SET 
    name = 'Иван Иванович',
    email = 'ivan.new@mail.ru',
    updated_at = NOW()
WHERE id = 1;

-- Обновить на основе вычисления
UPDATE products 
SET price = price * 1.1 
WHERE category = 'electronics';

-- Увеличить счётчик
UPDATE posts 
SET views = views + 1 
WHERE id = 10;

-- Обновить с условием
UPDATE orders 
SET status = 'shipped', shipped_at = NOW() 
WHERE status = 'paid' AND created_at < '2024-01-01';
```

### UPDATE с JOIN

```sql
-- Обновить цены товаров на основе данных из другой таблицы
UPDATE products p
INNER JOIN price_updates pu ON p.id = pu.product_id
SET p.price = pu.new_price;
```

---

## ❌ DELETE — Удаление данных

### Базовый синтаксис

```sql
DELETE FROM таблица 
WHERE условие;
```

### ⚠️ КРИТИЧЕСКИ ВАЖНО: всегда используй WHERE!

```sql
-- ❌ КАТАСТРОФА! Удалит ВСЕ записи!
DELETE FROM users;

-- ✅ Правильно
DELETE FROM users WHERE id = 1;
```

### Примеры DELETE

```sql
-- Удалить одну запись
DELETE FROM users WHERE id = 5;

-- Удалить по условию
DELETE FROM sessions 
WHERE expires_at < NOW();

-- Удалить с несколькими условиями
DELETE FROM products 
WHERE stock = 0 AND discontinued = 1;

-- Удалить старые записи
DELETE FROM logs 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### TRUNCATE — Очистка таблицы

```sql
-- Удаляет ВСЕ данные, сбрасывает автоинкремент
TRUNCATE TABLE logs;

-- Разница с DELETE:
-- DELETE FROM logs; — медленнее, не сбрасывает автоинкремент
-- TRUNCATE TABLE logs; — быстрее, сбрасывает счётчик
```

### Soft Delete (мягкое удаление)

```sql
-- Вместо DELETE используем UPDATE
UPDATE users 
SET deleted_at = NOW() 
WHERE id = 5;

-- Теперь при SELECT исключаем "удалённые"
SELECT * FROM users 
WHERE deleted_at IS NULL;
```

---

## 🔗 JOIN — Объединение таблиц

JOIN — самая мощная и сложная часть SQL. Позволяет связывать данные из разных таблиц.

### Подготовка: создадим таблицы

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    email VARCHAR(100)
);

CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    total DECIMAL(10,2),
    status VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO users (name, email) VALUES
    ('Иван', 'ivan@mail.ru'),
    ('Мария', 'maria@mail.ru'),
    ('Пётр', 'petr@mail.ru');

INSERT INTO orders (user_id, total, status) VALUES
    (1, 5000, 'paid'),
    (1, 3000, 'pending'),
    (2, 7500, 'paid');
-- user_id = 3 (Пётр) не имеет заказов!
```

### INNER JOIN — Только совпадения

```sql
-- Показать заказы с именами пользователей
SELECT 
    users.name,
    users.email,
    orders.total,
    orders.status
FROM orders
INNER JOIN users ON orders.user_id = users.id;

-- Результат:
-- | name  | email           | total | status  |
-- |-------|-----------------|-------|---------|
-- | Иван  | ivan@mail.ru    | 5000  | paid    |
-- | Иван  | ivan@mail.ru    | 3000  | pending |
-- | Мария | maria@mail.ru   | 7500  | paid    |
-- Пётр НЕ показан (у него нет заказов)
```

### LEFT JOIN — Все из левой таблицы

```sql
-- Показать всех пользователей, даже без заказов
SELECT 
    users.name,
    users.email,
    orders.total,
    orders.status
FROM users
LEFT JOIN orders ON users.id = orders.user_id;

-- Результат:
-- | name  | email           | total | status  |
-- |-------|-----------------|-------|---------|
-- | Иван  | ivan@mail.ru    | 5000  | paid    |
-- | Иван  | ivan@mail.ru    | 3000  | pending |
-- | Мария | maria@mail.ru   | 7500  | paid    |
-- | Пётр  | petr@mail.ru    | NULL  | NULL    |
-- Пётр показан с NULL в колонках orders
```

### RIGHT JOIN — Все из правой таблицы

```sql
-- Редко используется, обычно меняют таблицы местами
SELECT 
    users.name,
    orders.total
FROM orders
RIGHT JOIN users ON orders.user_id = users.id;
-- Аналогично LEFT JOIN, но "от users"
```

### Алиасы в JOIN

```sql
-- Короче и читабельнее
SELECT 
    u.name,
    u.email,
    o.total,
    o.status
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
```

### JOIN нескольких таблиц

```sql
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    price DECIMAL(10,2)
);

CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT,
    product_id INT,
    quantity INT,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Получить: пользователь → заказ → товары в заказе
SELECT 
    u.name AS customer_name,
    o.id AS order_id,
    o.total,
    p.name AS product_name,
    oi.quantity,
    p.price
FROM users u
INNER JOIN orders o ON u.id = o.user_id
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id
WHERE u.id = 1;
```

### Самостоятельное JOIN (self-join)

```sql
-- Таблица сотрудников с руководителями
CREATE TABLE employees (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    manager_id INT
);

INSERT INTO employees VALUES
    (1, 'Директор', NULL),
    (2, 'Менеджер 1', 1),
    (3, 'Менеджер 2', 1),
    (4, 'Работник 1', 2);

-- Показать сотрудника и его руководителя
SELECT 
    e.name AS employee,
    m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;

-- Результат:
-- | employee   | manager    |
-- |------------|------------|
-- | Директор   | NULL       |
-- | Менеджер 1 | Директор   |
-- | Менеджер 2 | Директор   |
-- | Работник 1 | Менеджер 1 |
```

---

## 📈 Агрегатные функции

### COUNT, SUM, AVG, MIN, MAX

```sql
-- Количество пользователей
SELECT COUNT(*) FROM users;

-- Количество НЕ-NULL значений
SELECT COUNT(email) FROM users;

-- Уникальные значения
SELECT COUNT(DISTINCT city) FROM users;

-- Сумма всех заказов
SELECT SUM(total) FROM orders;

-- Средняя цена
SELECT AVG(price) FROM products;

-- Минимальная и максимальная цена
SELECT MIN(price), MAX(price) FROM products;
```

### GROUP BY — Группировка

```sql
-- Сколько заказов у каждого пользователя
SELECT 
    user_id,
    COUNT(*) AS orders_count,
    SUM(total) AS total_spent
FROM orders
GROUP BY user_id;

-- Результат:
-- | user_id | orders_count | total_spent |
-- |---------|--------------|-------------|
-- | 1       | 2            | 8000        |
-- | 2       | 1            | 7500        |

-- С именами (через JOIN)
SELECT 
    u.name,
    COUNT(o.id) AS orders_count,
    COALESCE(SUM(o.total), 0) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- Результат:
-- | name  | orders_count | total_spent |
-- |-------|--------------|-------------|
-- | Иван  | 2            | 8000        |
-- | Мария | 1            | 7500        |
-- | Пётр  | 0            | 0           |
```

### HAVING — Фильтр после группировки

```sql
-- WHERE фильтрует ДО группировки
-- HAVING фильтрует ПОСЛЕ группировки

-- Пользователи, сделавшие больше 1 заказа
SELECT 
    user_id,
    COUNT(*) AS orders_count
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Комбинация WHERE и HAVING
SELECT 
    user_id,
    COUNT(*) AS orders_count,
    SUM(total) AS total_spent
FROM orders
WHERE status = 'paid'  -- фильтр ДО группировки
GROUP BY user_id
HAVING SUM(total) > 5000;  -- фильтр ПОСЛЕ группировки
```

---

## 🔍 Подзапросы (Subqueries)

Подзапрос — это SELECT внутри другого SELECT.

### Подзапрос в WHERE

```sql
-- Найти пользователей, сделавших заказ больше средней суммы
SELECT * FROM users
WHERE id IN (
    SELECT user_id 
    FROM orders 
    WHERE total > (SELECT AVG(total) FROM orders)
);
```

### Подзапрос в SELECT

```sql
-- Показать пользователя и количество его заказов
SELECT 
    id,
    name,
    email,
    (SELECT COUNT(*) 
     FROM orders 
     WHERE orders.user_id = users.id) AS orders_count
FROM users;
```

### Подзапрос в FROM

```sql
-- Средняя сумма заказов по пользователям
SELECT 
    AVG(user_total) AS average_user_spending
FROM (
    SELECT user_id, SUM(total) AS user_total
    FROM orders
    GROUP BY user_id
) AS user_totals;
```

### EXISTS — Проверка существования

```sql
-- Пользователи, имеющие хотя бы один заказ
SELECT * FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o WHERE o.user_id = u.id
);

-- Пользователи БЕЗ заказов
SELECT * FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.user_id = u.id
);
```

---

## 🛠️ Практика: Интернет-магазин

### Создание структуры БД

```sql
-- Удаляем старые таблицы если есть
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- Пользователи
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Категории товаров
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL
);

-- Товары
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Заказы
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'paid', 'shipped', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Позиции заказов
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,  -- цена на момент заказа
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### Наполнение тестовыми данными

```sql
-- Пользователи
INSERT INTO users (name, email, password) VALUES
    ('Иван Петров', 'ivan@mail.ru', '$2y$10$...'),
    ('Мария Сидорова', 'maria@gmail.com', '$2y$10$...'),
    ('Алексей Иванов', 'alex@ya.ru', '$2y$10$...'),
    ('Ольга Смирнова', 'olga@mail.ru', '$2y$10$...');

-- Категории
INSERT INTO categories (name, slug) VALUES
    ('Электроника', 'electronics'),
    ('Одежда', 'clothing'),
    ('Книги', 'books'),
    ('Спорт', 'sports');

-- Товары
INSERT INTO products (category_id, name, description, price, stock) VALUES
    (1, 'iPhone 15', 'Смартфон Apple', 89990, 10),
    (1, 'Samsung Galaxy S24', 'Флагманский Android', 79990, 15),
    (1, 'AirPods Pro', 'Беспроводные наушники', 24990, 30),
    (2, 'Футболка Nike', 'Спортивная футболка', 2990, 50),
    (2, 'Джинсы Levis', 'Классические джинсы', 5990, 20),
    (3, 'Чистый код', 'Роберт Мартин', 1990, 5),
    (3, 'PHP и MySQL', 'Разработка веб-приложений', 2490, 8),
    (4, 'Гантели 10кг', 'Набор гантелей', 3490, 12);

-- Заказы
INSERT INTO orders (user_id, total, status) VALUES
    (1, 92980, 'paid'),      -- iPhone + AirPods
    (1, 2990, 'pending'),    -- Футболка
    (2, 79990, 'shipped'),   -- Samsung
    (3, 4480, 'completed'),  -- Две книги
    (3, 9980, 'paid');       -- Джинсы + Гантели

-- Позиции заказов
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
    (1, 1, 1, 89990),  -- iPhone
    (1, 3, 1, 24990),  -- AirPods (хотя сумма не сходится для примера)
    (2, 4, 1, 2990),   -- Футболка
    (3, 2, 1, 79990),  -- Samsung
    (4, 6, 1, 1990),   -- Чистый код
    (4, 7, 1, 2490),   -- PHP и MySQL
    (5, 5, 1, 5990),   -- Джинсы
    (5, 8, 1, 3490);   -- Гантели (сумма тоже для примера)
```

### Типовые запросы

```sql
-- 1. Все товары с категориями
SELECT 
    p.name AS product,
    c.name AS category,
    p.price,
    p.stock
FROM products p
INNER JOIN categories c ON p.category_id = c.id
ORDER BY c.name, p.name;

-- 2. Товары в наличии дешевле 5000 руб
SELECT 
    name,
    price,
    stock
FROM products
WHERE price < 5000 AND stock > 0
ORDER BY price;

-- 3. Все заказы пользователя с деталями
SELECT 
    o.id,
    o.created_at,
    o.status,
    o.total,
    p.name AS product,
    oi.quantity,
    oi.price
FROM orders o
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id
WHERE o.user_id = 1
ORDER BY o.created_at DESC;

-- 4. Статистика по пользователям
SELECT 
    u.name,
    u.email,
    COUNT(o.id) AS orders_count,
    COALESCE(SUM(o.total), 0) AS total_spent,
    MAX(o.created_at) AS last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name, u.email
ORDER BY total_spent DESC;

-- 5. Топ-5 самых продаваемых товаров
SELECT 
    p.name,
    SUM(oi.quantity) AS total_sold,
    SUM(oi.quantity * oi.price) AS revenue
FROM products p
INNER JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name
ORDER BY total_sold DESC
LIMIT 5;

-- 6. Категории и их выручка
SELECT 
    c.name AS category,
    COUNT(DISTINCT oi.order_id) AS orders_count,
    SUM(oi.quantity * oi.price) AS total_revenue
FROM categories c
INNER JOIN products p ON c.id = p.category_id
INNER JOIN order_items oi ON p.id = oi.product_id
GROUP BY c.id, c.name
ORDER BY total_revenue DESC;

-- 7. Заказы за последние 7 дней
SELECT 
    o.id,
    u.name AS customer,
    o.total,
    o.status,
    o.created_at
FROM orders o
INNER JOIN users u ON o.user_id = u.id
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY o.created_at DESC;

-- 8. Пользователи без заказов
SELECT 
    u.name,
    u.email,
    u.created_at
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM orders WHERE user_id = u.id
);

-- 9. Средний чек по статусам заказов
SELECT 
    status,
    COUNT(*) AS orders_count,
    AVG(total) AS average_total,
    MIN(total) AS min_total,
    MAX(total) AS max_total
FROM orders
GROUP BY status;

-- 10. Обновить stock после "продажи"
UPDATE products p
INNER JOIN order_items oi ON p.id = oi.product_id
SET p.stock = p.stock - oi.quantity
WHERE oi.order_id = 5;
```

---

## 💡 Полезные функции SQL

### Работа с датами

```sql
-- Текущая дата и время
SELECT NOW();  -- 2024-01-30 15:30:45
SELECT CURDATE();  -- 2024-01-30
SELECT CURTIME();  -- 15:30:45

-- Форматирование
SELECT DATE_FORMAT(NOW(), '%d.%m.%Y %H:%i');  -- 30.01.2024 15:30

-- Извлечение частей
SELECT YEAR(created_at), MONTH(created_at), DAY(created_at) FROM orders;

-- Арифметика
SELECT DATE_ADD(NOW(), INTERVAL 7 DAY);  -- Через неделю
SELECT DATE_SUB(NOW(), INTERVAL 1 MONTH);  -- Месяц назад
SELECT DATEDIFF(NOW(), created_at) AS days_ago FROM orders;
```

### Работа со строками

```sql
-- Конкатенация
SELECT CONCAT(name, ' (', email, ')') AS full_info FROM users;

-- Длина строки
SELECT LENGTH(name), CHAR_LENGTH(name) FROM users;

-- Верхний/нижний регистр
SELECT UPPER(name), LOWER(email) FROM users;

-- Обрезка пробелов
SELECT TRIM(name), LTRIM(name), RTRIM(name) FROM users;

-- Подстрока
SELECT SUBSTRING(email, 1, 5) FROM users;  -- Первые 5 символов

-- Замена
SELECT REPLACE(email, '@mail.ru', '@gmail.com') FROM users;
```

### Условная логика

```sql
-- CASE WHEN
SELECT 
    name,
    price,
    CASE 
        WHEN price < 3000 THEN 'Дёшево'
        WHEN price < 10000 THEN 'Средняя цена'
        ELSE 'Дорого'
    END AS price_category
FROM products;

-- IF
SELECT 
    name,
    IF(stock > 0, 'В наличии', 'Нет в наличии') AS availability
FROM products;

-- COALESCE (первое не-NULL значение)
SELECT 
    name,
    COALESCE(description, 'Описание отсутствует') AS desc
FROM products;

-- NULLIF (вернуть NULL если равны)
SELECT NULLIF(stock, 0) FROM products;  -- NULL вместо 0
```

---

## ⚠️ Частые ошибки и как их избежать

### 1. Забыть WHERE в UPDATE/DELETE

```sql
-- ❌ Обновит ВСЕ записи!
UPDATE products SET price = 0;

-- ✅ Всегда проверяй WHERE
UPDATE products SET price = 0 WHERE id = 999;

-- 💡 Сначала делай SELECT с тем же WHERE
SELECT * FROM products WHERE id = 999;
-- Если результат правильный, меняй SELECT на UPDATE
```

### 2. Неправильный тип JOIN

```sql
-- ❌ INNER JOIN пропустит пользователей без заказов
SELECT u.name, COUNT(o.id) AS orders_count
FROM users u
INNER JOIN orders o ON u.id = o.user_id
GROUP BY u.id;

-- ✅ LEFT JOIN покажет всех
SELECT u.name, COUNT(o.id) AS orders_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;
```

### 3. Забыть GROUP BY при агрегации

```sql
-- ❌ Ошибка: name не в GROUP BY
SELECT name, COUNT(*) FROM products;

-- ✅ Правильно
SELECT category_id, COUNT(*) FROM products GROUP BY category_id;
```

### 4. Не использовать prepared statements (в PHP)

```sql
-- ❌ SQL-инъекция!
$id = $_GET['id'];
$sql = "SELECT * FROM users WHERE id = $id";

-- ✅ Всегда через prepared statements
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$id]);
```

### 5. Неоптимальные запросы

```sql
-- ❌ N+1 проблема (много запросов)
-- В PHP цикле:
foreach ($orders as $order) {
    $user = query("SELECT * FROM users WHERE id = {$order['user_id']}");
}

-- ✅ Один запрос с JOIN
SELECT o.*, u.name, u.email 
FROM orders o
INNER JOIN users u ON o.user_id = u.id;
```

---

## 🎓 Упражнения

### Уровень 1: Базовые запросы

```sql
-- 1. Выбери все товары категории "Электроника"
-- Подсказка: используй JOIN

-- 2. Найди пользователей с email от Gmail
-- Подсказка: LIKE

-- 3. Посчитай общее количество товаров в наличии (stock > 0)

-- 4. Выведи 3 самых дорогих товара
-- Подсказка: ORDER BY + LIMIT

-- 5. Обнови цену товара с id=3 на 29990
```

### Уровень 2: JOIN и группировка

```sql
-- 6. Выведи все категории и количество товаров в каждой
-- Подсказка: LEFT JOIN + GROUP BY + COUNT

-- 7. Покажи пользователей и сумму их заказов
-- Только тех, кто потратил больше 50000

-- 8. Найди товары, которые ни разу не покупали
-- Подсказка: LEFT JOIN + WHERE ... IS NULL

-- 9. Выведи среднюю цену товара по каждой категории

-- 10. Найди пользователя с максимальной суммой заказов
```

### Уровень 3: Подзапросы и сложная логика

```sql
-- 11. Найди товары дороже средней цены в своей категории
-- Подсказка: подзапрос в WHERE

-- 12. Покажи заказы, в которых больше 2 разных товаров
-- Подсказка: подзапрос в HAVING

-- 13. Выведи категории, в которых все товары дороже 2000
-- Подсказка: NOT EXISTS

-- 14. Создай отчёт продаж по месяцам за текущий год
-- Подсказка: DATE_FORMAT + GROUP BY

-- 15. Найди пользователей, которые делали заказы каждый месяц
-- Подсказка: GROUP BY + HAVING COUNT(DISTINCT ...)
```

---

## ✅ Решения упражнений

<details>
<summary>Уровень 1</summary>

```sql
-- 1. Товары категории "Электроника"
SELECT p.* 
FROM products p
INNER JOIN categories c ON p.category_id = c.id
WHERE c.name = 'Электроника';

-- 2. Пользователи с Gmail
SELECT * FROM users 
WHERE email LIKE '%@gmail.com';

-- 3. Количество товаров в наличии
SELECT COUNT(*) AS in_stock_count 
FROM products 
WHERE stock > 0;

-- 4. 3 самых дорогих товара
SELECT * FROM products 
ORDER BY price DESC 
LIMIT 3;

-- 5. Обновить цену
UPDATE products 
SET price = 29990 
WHERE id = 3;
```
</details>

<details>
<summary>Уровень 2</summary>

```sql
-- 6. Категории и количество товаров
SELECT 
    c.name,
    COUNT(p.id) AS products_count
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
GROUP BY c.id, c.name;

-- 7. Пользователи с суммой > 50000
SELECT 
    u.name,
    u.email,
    SUM(o.total) AS total_spent
FROM users u
INNER JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name, u.email
HAVING SUM(o.total) > 50000;

-- 8. Товары без продаж
SELECT p.*
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
WHERE oi.id IS NULL;

-- 9. Средняя цена по категориям
SELECT 
    c.name,
    AVG(p.price) AS avg_price
FROM categories c
INNER JOIN products p ON c.id = p.category_id
GROUP BY c.id, c.name;

-- 10. Пользователь с максимальной суммой
SELECT 
    u.name,
    SUM(o.total) AS total_spent
FROM users u
INNER JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
ORDER BY total_spent DESC
LIMIT 1;
```
</details>

<details>
<summary>Уровень 3</summary>

```sql
-- 11. Товары дороже средней в категории
SELECT p.*
FROM products p
WHERE p.price > (
    SELECT AVG(price)
    FROM products
    WHERE category_id = p.category_id
);

-- 12. Заказы с >2 товарами
SELECT 
    o.id,
    o.total,
    COUNT(DISTINCT oi.product_id) AS items_count
FROM orders o
INNER JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.total
HAVING COUNT(DISTINCT oi.product_id) > 2;

-- 13. Категории где все товары > 2000
SELECT c.*
FROM categories c
WHERE NOT EXISTS (
    SELECT 1 
    FROM products p 
    WHERE p.category_id = c.id AND p.price <= 2000
);

-- 14. Продажи по месяцам
SELECT 
    DATE_FORMAT(created_at, '%Y-%m') AS month,
    COUNT(*) AS orders_count,
    SUM(total) AS total_revenue
FROM orders
WHERE YEAR(created_at) = YEAR(NOW())
GROUP BY DATE_FORMAT(created_at, '%Y-%m')
ORDER BY month;

-- 15. Пользователи с заказами каждый месяц
SELECT 
    u.name,
    COUNT(DISTINCT DATE_FORMAT(o.created_at, '%Y-%m')) AS months_count
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
GROUP BY u.id, u.name
HAVING COUNT(DISTINCT DATE_FORMAT(o.created_at, '%Y-%m')) = 12;
```
</details>

---

## 📋 Чеклист самопроверки

После изучения главы ты должен уметь:

- [ ] Написать SELECT с WHERE, ORDER BY, LIMIT
- [ ] Использовать операторы сравнения (=, >, <, LIKE, IN, BETWEEN)
- [ ] Правильно применять AND, OR, NOT
- [ ] Добавлять данные через INSERT (одну и несколько записей)
- [ ] Обновлять данные через UPDATE (ВСЕГДА с WHERE!)
- [ ] Удалять данные через DELETE (ВСЕГДА с WHERE!)
- [ ] Понимать разницу между INNER JOIN и LEFT JOIN
- [ ] Объединять 3+ таблицы через JOIN
- [ ] Использовать агрегатные функции (COUNT, SUM, AVG, MIN, MAX)
- [ ] Группировать данные через GROUP BY
- [ ] Фильтровать группы через HAVING
- [ ] Писать подзапросы в WHERE, SELECT, FROM
- [ ] Использовать CASE WHEN для условной логики
- [ ] Работать с датами (NOW, DATE_FORMAT, DATE_ADD)
- [ ] Понимать, когда использовать каждый тип запроса

---

## 🎯 Что дальше?

Теперь ты умеешь работать с SQL на базовом и среднем уровне. В следующей главе:

**Глава 3.2: MySQL и проектирование БД**
- Типы данных в MySQL
- Индексы и оптимизация
- Нормализация (1NF, 2NF, 3NF)
- Связи один-к-одному, один-ко-многим, многие-ко-многим
- Внешние ключи и каскадное удаление

Но уже сейчас ты можешь:
- Создать полноценную базу для своего проекта
- Писать сложные запросы с JOIN
- Строить отчёты и статистику
- Безопасно работать с данными

**Практический совет:** Открой phpMyAdmin или Adminer, создай БД для своего учебного проекта (блог, магазин, соцсеть) и попрактикуйся в написании запросов. Лучший способ запомнить SQL — использовать его каждый день! 🚀