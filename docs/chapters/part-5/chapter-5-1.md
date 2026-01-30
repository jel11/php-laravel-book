# Глава 5.1: Паттерн MVC — Model, View, Controller — теория и практика без фреймворков

## 🎯 Что ты узнаешь

- Почему спагетти-код — это плохо и как MVC решает эту проблему
- Что такое Model, View, Controller и за что отвечает каждый слой
- Как построить MVC-приложение с нуля без фреймворков
- Практические примеры разделения логики
- Распространённые ошибки при реализации MVC

---

## 🍝 Проблема: спагетти-код

Представь типичный PHP-файл начинающего разработчика:

```php
<?php
// products.php - ПЛОХОЙ ПРИМЕР

// Подключение к БД
$pdo = new PDO('mysql:host=localhost;dbname=shop', 'root', '');

// Получение параметров
$category = $_GET['category'] ?? 'all';

// HTML-шапка
echo '<html><head><title>Товары</title></head><body>';
echo '<h1>Наши товары</h1>';

// Запрос к БД
if ($category === 'all') {
    $stmt = $pdo->query('SELECT * FROM products');
} else {
    $stmt = $pdo->prepare('SELECT * FROM products WHERE category = ?');
    $stmt->execute([$category]);
}

// Вывод данных
echo '<div class="products">';
while ($product = $stmt->fetch()) {
    echo '<div class="product">';
    echo '<h2>' . htmlspecialchars($product['name']) . '</h2>';
    echo '<p>Цена: ' . $product['price'] . ' руб.</p>';
    
    // Вычисление скидки
    if ($product['discount'] > 0) {
        $newPrice = $product['price'] - ($product['price'] * $product['discount'] / 100);
        echo '<p class="discount">Со скидкой: ' . $newPrice . ' руб.</p>';
    }
    
    echo '</div>';
}
echo '</div>';

// Футер
echo '</body></html>';
?>
```

**Что здесь не так?**

1. **Невозможно переиспользовать логику** — расчёт скидки "зашит" в HTML
2. **Нельзя протестировать** — код выводит данные сразу
3. **Сложно изменить дизайн** — HTML смешан с PHP
4. **Дублирование кода** — подключение к БД в каждом файле
5. **Сложно работать в команде** — дизайнер не может менять вёрстку без PHP

---

## 🏗️ Решение: паттерн MVC

**MVC (Model-View-Controller)** — это архитектурный паттерн, который разделяет приложение на три слоя:

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTP Request
       ↓
┌─────────────────────────────────────┐
│         CONTROLLER                  │
│  • Принимает запросы                │
│  • Вызывает Model для данных        │
│  • Передаёт данные во View          │
└──────┬──────────────────────────────┘
       │
       ├──→ ┌─────────────────────────┐
       │    │       MODEL             │
       │    │ • Работа с БД           │
       │    │ • Бизнес-логика         │
       │    │ • Валидация данных      │
       │    └─────────────────────────┘
       │
       └──→ ┌─────────────────────────┐
            │       VIEW              │
            │ • HTML-шаблоны          │
            │ • Отображение данных    │
            │ • Никакой логики        │
            └─────────────────────────┘
```

### Принцип разделения ответственности

| Слой | За что отвечает | Чего НЕ делает |
|------|----------------|----------------|
| **Model** | Данные и бизнес-логика | Не знает про HTML и HTTP |
| **View** | Визуальное представление | Не обращается к БД |
| **Controller** | Координация между M и V | Минимум логики |

---

## 📦 Model — слой данных

**Model** отвечает за:
- Работу с базой данных
- Бизнес-логику (расчёты, правила)
- Валидацию данных

### Пример базовой модели

```php
<?php
// models/Product.php

class Product
{
    private PDO $pdo;
    
    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }
    
    /**
     * Получить все товары или по категории
     */
    public function getAll(?string $category = null): array
    {
        if ($category === null) {
            $stmt = $this->pdo->query('SELECT * FROM products ORDER BY name');
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        $stmt = $this->pdo->prepare('SELECT * FROM products WHERE category = ? ORDER BY name');
        $stmt->execute([$category]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Получить товар по ID
     */
    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM products WHERE id = ?');
        $stmt->execute([$id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $product ?: null;
    }
    
    /**
     * Создать новый товар
     */
    public function create(array $data): int
    {
        // Валидация
        if (empty($data['name']) || empty($data['price'])) {
            throw new InvalidArgumentException('Название и цена обязательны');
        }
        
        if ($data['price'] < 0) {
            throw new InvalidArgumentException('Цена не может быть отрицательной');
        }
        
        $stmt = $this->pdo->prepare('
            INSERT INTO products (name, price, category, discount, description)
            VALUES (:name, :price, :category, :discount, :description)
        ');
        
        $stmt->execute([
            'name' => $data['name'],
            'price' => $data['price'],
            'category' => $data['category'] ?? 'general',
            'discount' => $data['discount'] ?? 0,
            'description' => $data['description'] ?? ''
        ]);
        
        return (int) $this->pdo->lastInsertId();
    }
    
    /**
     * Обновить товар
     */
    public function update(int $id, array $data): bool
    {
        $stmt = $this->pdo->prepare('
            UPDATE products 
            SET name = :name, price = :price, category = :category, 
                discount = :discount, description = :description
            WHERE id = :id
        ');
        
        return $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'price' => $data['price'],
            'category' => $data['category'],
            'discount' => $data['discount'] ?? 0,
            'description' => $data['description'] ?? ''
        ]);
    }
    
    /**
     * Удалить товар
     */
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM products WHERE id = ?');
        return $stmt->execute([$id]);
    }
    
    /**
     * Бизнес-логика: рассчитать цену со скидкой
     */
    public function calculateDiscountedPrice(array $product): float
    {
        if ($product['discount'] <= 0) {
            return (float) $product['price'];
        }
        
        $discount = $product['price'] * ($product['discount'] / 100);
        return round($product['price'] - $discount, 2);
    }
}
```

**Ключевые моменты:**

- Model не содержит HTML
- Model не знает, откуда пришли данные (из формы, API, консоли)
- Вся бизнес-логика инкапсулирована в методах
- Model можно легко протестировать

---

## 🖼️ View — слой представления

**View** отвечает только за отображение данных. Никакой логики!

### Простой шаблон

```php
<?php
// views/products/list.php
// Файл получает переменную $products
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Список товаров</title>
    <style>
        .product { border: 1px solid #ddd; padding: 15px; margin: 10px 0; }
        .discount { color: red; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Наши товары</h1>
    
    <div class="products">
        <?php if (empty($products)): ?>
            <p>Товары не найдены</p>
        <?php else: ?>
            <?php foreach ($products as $product): ?>
                <div class="product">
                    <h2><?= htmlspecialchars($product['name']) ?></h2>
                    <p>Категория: <?= htmlspecialchars($product['category']) ?></p>
                    <p>Цена: <?= number_format($product['price'], 2) ?> руб.</p>
                    
                    <?php if ($product['discounted_price'] < $product['price']): ?>
                        <p class="discount">
                            Со скидкой: <?= number_format($product['discounted_price'], 2) ?> руб.
                        </p>
                    <?php endif; ?>
                    
                    <a href="/products/show?id=<?= $product['id'] ?>">Подробнее</a>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</body>
</html>
```

### Шаблон для отдельного товара

```php
<?php
// views/products/show.php
// Получает переменную $product
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($product['name']) ?></title>
</head>
<body>
    <h1><?= htmlspecialchars($product['name']) ?></h1>
    
    <div class="product-details">
        <p><strong>Категория:</strong> <?= htmlspecialchars($product['category']) ?></p>
        <p><strong>Цена:</strong> <?= number_format($product['price'], 2) ?> руб.</p>
        
        <?php if ($product['discount'] > 0): ?>
            <p><strong>Скидка:</strong> <?= $product['discount'] ?>%</p>
            <p class="discount">
                <strong>Цена со скидкой:</strong> 
                <?= number_format($product['discounted_price'], 2) ?> руб.
            </p>
        <?php endif; ?>
        
        <?php if (!empty($product['description'])): ?>
            <div class="description">
                <h2>Описание</h2>
                <p><?= nl2br(htmlspecialchars($product['description'])) ?></p>
            </div>
        <?php endif; ?>
    </div>
    
    <a href="/products">← Вернуться к списку</a>
</body>
</html>
```

**Что можно во View:**

✅ Условия для отображения (`if`, тернарный оператор)  
✅ Циклы для перебора данных (`foreach`)  
✅ Экранирование (`htmlspecialchars`)  
✅ Форматирование (`number_format`, `date`)

**Что НЕЛЬЗЯ во View:**

❌ Запросы к базе данных  
❌ Обработка форм  
❌ Бизнес-логику (расчёты, валидацию)  
❌ Работу с файлами, сессиями

---

## 🎮 Controller — слой управления

**Controller** связывает Model и View:

1. Принимает HTTP-запрос
2. Вызывает нужные методы Model
3. Подготавливает данные для View
4. Отдаёт View браузеру

### Базовый контроллер

```php
<?php
// controllers/ProductController.php

class ProductController
{
    private Product $productModel;
    
    public function __construct(Product $productModel)
    {
        $this->productModel = $productModel;
    }
    
    /**
     * Показать список товаров
     * URL: /products или /products?category=electronics
     */
    public function index(): void
    {
        $category = $_GET['category'] ?? null;
        
        // Получаем данные из модели
        $products = $this->productModel->getAll($category);
        
        // Добавляем вычисляемые поля
        foreach ($products as &$product) {
            $product['discounted_price'] = $this->productModel->calculateDiscountedPrice($product);
        }
        
        // Отображаем view
        $this->render('products/list', [
            'products' => $products
        ]);
    }
    
    /**
     * Показать один товар
     * URL: /products/show?id=5
     */
    public function show(): void
    {
        $id = (int) ($_GET['id'] ?? 0);
        
        if ($id <= 0) {
            $this->redirect('/products');
            return;
        }
        
        $product = $this->productModel->findById($id);
        
        if ($product === null) {
            $this->render('errors/404');
            return;
        }
        
        // Добавляем цену со скидкой
        $product['discounted_price'] = $this->productModel->calculateDiscountedPrice($product);
        
        $this->render('products/show', [
            'product' => $product
        ]);
    }
    
    /**
     * Форма создания товара
     * URL: /products/create
     */
    public function create(): void
    {
        $this->render('products/create');
    }
    
    /**
     * Сохранить новый товар
     * URL: /products/store (POST)
     */
    public function store(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->redirect('/products/create');
            return;
        }
        
        try {
            $data = [
                'name' => $_POST['name'] ?? '',
                'price' => (float) ($_POST['price'] ?? 0),
                'category' => $_POST['category'] ?? 'general',
                'discount' => (int) ($_POST['discount'] ?? 0),
                'description' => $_POST['description'] ?? ''
            ];
            
            $id = $this->productModel->create($data);
            
            // Редирект на созданный товар
            $this->redirect("/products/show?id={$id}");
            
        } catch (InvalidArgumentException $e) {
            // Показываем форму с ошибкой
            $this->render('products/create', [
                'error' => $e->getMessage(),
                'old_data' => $_POST
            ]);
        }
    }
    
    /**
     * Удалить товар
     * URL: /products/delete?id=5 (POST)
     */
    public function delete(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->redirect('/products');
            return;
        }
        
        $id = (int) ($_POST['id'] ?? 0);
        
        if ($id > 0) {
            $this->productModel->delete($id);
        }
        
        $this->redirect('/products');
    }
    
    /**
     * Вспомогательный метод: рендер view
     */
    private function render(string $view, array $data = []): void
    {
        // Извлекаем переменные из массива
        extract($data);
        
        // Подключаем файл шаблона
        require __DIR__ . "/../views/{$view}.php";
    }
    
    /**
     * Вспомогательный метод: редирект
     */
    private function redirect(string $url): void
    {
        header("Location: {$url}");
        exit;
    }
}
```

**Что делает Controller:**

- Обрабатывает параметры запроса (`$_GET`, `$_POST`)
- Вызывает методы модели
- Подготавливает данные для view
- Решает, какой view показать
- Делает редиректы

**Что НЕ делает Controller:**

- Не содержит SQL-запросов
- Не содержит HTML
- Не содержит сложной бизнес-логики

---

## 🔗 Всё вместе: Front Controller

Теперь нужна **единая точка входа**, которая будет направлять запросы к нужным контроллерам.

```php
<?php
// public/index.php — единственный PHP-файл, доступный извне

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Product.php';
require_once __DIR__ . '/../controllers/ProductController.php';

// Подключение к БД
$pdo = getConnection(); // функция из database.php

// Создаём модель и контроллер
$productModel = new Product($pdo);
$productController = new ProductController($productModel);

// Простой роутинг
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

switch ($uri) {
    case '/':
    case '/products':
        $productController->index();
        break;
        
    case '/products/show':
        $productController->show();
        break;
        
    case '/products/create':
        $productController->create();
        break;
        
    case '/products/store':
        $productController->store();
        break;
        
    case '/products/delete':
        $productController->delete();
        break;
        
    default:
        http_response_code(404);
        require __DIR__ . '/../views/errors/404.php';
        break;
}
```

### Настройка .htaccess

Чтобы все запросы шли через `index.php`:

```apache
# public/.htaccess

RewriteEngine On

# Если файл или папка существуют — отдать их
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Иначе — отправить на index.php
RewriteRule ^(.*)$ index.php [QSA,L]
```

---

## 📁 Структура проекта

```
my-mvc-app/
├── public/              # Доступно извне (document root)
│   ├── index.php        # Front Controller
│   ├── .htaccess
│   └── css/
│       └── style.css
├── config/
│   └── database.php     # Подключение к БД
├── models/
│   ├── Product.php
│   └── User.php
├── views/
│   ├── products/
│   │   ├── list.php
│   │   ├── show.php
│   │   └── create.php
│   └── errors/
│       └── 404.php
└── controllers/
    └── ProductController.php
```

### Файл database.php

```php
<?php
// config/database.php

function getConnection(): PDO
{
    static $pdo = null;
    
    if ($pdo === null) {
        $dsn = 'mysql:host=localhost;dbname=shop;charset=utf8mb4';
        $username = 'root';
        $password = '';
        
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ];
        
        $pdo = new PDO($dsn, $username, $password, $options);
    }
    
    return $pdo;
}
```

---

## 🎨 Улучшаем View: Layouts

Чтобы не дублировать шапку и подвал, создадим **layout**:

```php
<?php
// views/layouts/main.php
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title><?= $title ?? 'Мой магазин' ?></title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <header>
        <nav>
            <a href="/products">Товары</a>
            <a href="/cart">Корзина</a>
            <a href="/about">О нас</a>
        </nav>
    </header>
    
    <main>
        <?= $content ?>
    </main>
    
    <footer>
        <p>&copy; 2025 Мой магазин</p>
    </footer>
</body>
</html>
```

Теперь обновим метод `render()` в контроллере:

```php
private function render(string $view, array $data = []): void
{
    extract($data);
    
    // Захватываем содержимое view в переменную
    ob_start();
    require __DIR__ . "/../views/{$view}.php";
    $content = ob_get_clean();
    
    // Оборачиваем в layout
    require __DIR__ . '/../views/layouts/main.php';
}
```

Теперь шаблон товара упрощается:

```php
<?php
// views/products/show.php
?>
<h1><?= htmlspecialchars($product['name']) ?></h1>

<div class="product-details">
    <p><strong>Цена:</strong> <?= number_format($product['price'], 2) ?> руб.</p>
    <!-- остальное содержимое -->
</div>

<a href="/products">← Назад</a>
```

---

## ⚠️ Распространённые ошибки

### ❌ Ошибка 1: Толстый контроллер

```php
// ПЛОХО
public function index(): void
{
    $products = $this->productModel->getAll();
    
    // Контроллер НЕ должен содержать бизнес-логику!
    foreach ($products as &$product) {
        if ($product['discount'] > 0) {
            $newPrice = $product['price'] - ($product['price'] * $product['discount'] / 100);
            $product['discounted_price'] = round($newPrice, 2);
        } else {
            $product['discounted_price'] = $product['price'];
        }
        
        // Ещё 50 строк вычислений...
    }
    
    $this->render('products/list', ['products' => $products]);
}
```

**Решение:** Перенести логику в модель

```php
// ХОРОШО
public function index(): void
{
    $products = $this->productModel->getAll();
    
    foreach ($products as &$product) {
        $product['discounted_price'] = $this->productModel->calculateDiscountedPrice($product);
    }
    
    $this->render('products/list', ['products' => $products]);
}
```

### ❌ Ошибка 2: Логика во View

```php
<!-- ПЛОХО -->
<?php
// Запрос к БД прямо во view!
$categories = $pdo->query('SELECT * FROM categories')->fetchAll();
?>

<select name="category">
    <?php foreach ($categories as $cat): ?>
        <option><?= $cat['name'] ?></option>
    <?php endforeach; ?>
</select>
```

**Решение:** Передать данные из контроллера

```php
// Контроллер
$categories = $this->categoryModel->getAll();
$this->render('products/create', ['categories' => $categories]);
```

### ❌ Ошибка 3: Модель знает про HTTP

```php
// ПЛОХО
class Product
{
    public function create(): int
    {
        // Модель НЕ должна обращаться к $_POST!
        $name = $_POST['name'];
        $price = $_POST['price'];
        
        // ...
    }
}
```

**Решение:** Передавать данные в метод

```php
// ХОРОШО
class Product
{
    public function create(array $data): int
    {
        // Модель получает чистые данные
        $name = $data['name'];
        $price = $data['price'];
        
        // ...
    }
}
```

---

## 🏋️ Практические задания

### Задание 1: Базовый блог

Создай MVC-приложение для блога:

1. **Модель `Post`** с методами:
   - `getAll()` — все посты
   - `findById($id)` — пост по ID
   - `create($data)` — создать пост
   
2. **Контроллер `PostController`** с действиями:
   - `index()` — список постов
   - `show()` — один пост
   - `create()` — форма
   - `store()` — сохранение

3. **Views**:
   - `posts/list.php`
   - `posts/show.php`
   - `posts/create.php`

**Структура БД:**

```sql
CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Задание 2: Категории товаров

Добавь к существующему приложению:

1. Модель `Category` с методами получения всех категорий
2. Фильтрацию товаров по категории
3. View для списка категорий
4. Связь между товарами и категориями

### Задание 3: Валидация в модели

Расширь модель `Product`:

```php
public function validate(array $data): array
{
    $errors = [];
    
    if (empty($data['name'])) {
        $errors['name'] = 'Название обязательно';
    }
    
    if ($data['price'] <= 0) {
        $errors['price'] = 'Цена должна быть положительной';
    }
    
    // Добавь ещё проверки
    
    return $errors;
}
```

Используй в контроллере перед сохранением.

### Задание 4*: Пагинация

Добавь постраничную навигацию:

1. Модель получает параметры `limit` и `offset`
2. Контроллер вычисляет номер страницы
3. View показывает ссылки "Предыдущая / Следующая"

---

## 🧪 Самопроверка

1. **Какой слой MVC отвечает за работу с БД?**
   <details>
   <summary>Ответ</summary>
   Model. Только модель делает SQL-запросы.
   </details>

2. **Можно ли во View делать `$pdo->query()`?**
   <details>
   <summary>Ответ</summary>
   Нет! View только отображает данные, переданные из контроллера.
   </details>

3. **Что делает Controller?**
   <details>
   <summary>Ответ</summary>
   Принимает запрос, вызывает модель, передаёт данные во view, отдаёт ответ.
   </details>

4. **Где должна быть логика расчёта скидки?**
   <details>
   <summary>Ответ</summary>
   В Model — это бизнес-логика.
   </details>

5. **Можно ли в Model обращаться к `$_POST`?**
   <details>
   <summary>Ответ</summary>
   Нет! Model не знает про HTTP. Данные передаются в методы как параметры.
   </details>

---

## 📚 Что дальше?

Ты построил MVC-приложение с нуля! Теперь понимаешь:

- Зачем нужно разделение на слои
- Как работает каждый компонент MVC
- Почему важно не смешивать логику и представление

**В следующей главе:**
- Front Controller и продвинутый роутинг
- Регулярные выражения в маршрутах
- Динамические параметры (`/products/{id}`)
- Именованные маршруты

---

## 🎯 Ключевые выводы

✅ **MVC разделяет ответственность** — каждый слой делает одно дело  
✅ **Model** — данные и бизнес-логика, не знает про HTTP  
✅ **View** — только отображение, никакой логики  
✅ **Controller** — связывает M и V, минимум логики  
✅ **Front Controller** — единая точка входа для всех запросов  
✅ **Layouts** — переиспользуемые шаблоны для общих элементов

Теперь ты готов к изучению продвинутого роутинга! 🚀