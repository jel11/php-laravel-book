# Глава 5.4: Шаблонизация — отделение логики от представления, создание своего view-движка

## 🎯 Цели главы

После изучения этой главы вы:
- Поймёте, почему смешивание PHP и HTML — это плохо
- Узучите принципы разделения логики и представления
- Создадите собственный простой шаблонизатор
- Узнаете, как работают профессиональные движки (Blade, Twig)
- Научитесь работать с layout'ами, частичными шаблонами и компонентами

---

## 📖 Проблема: PHP-спагетти код

### Как НЕ надо делать

Вспомните типичный PHP-файл из ранних 2000-х:

```php
<?php
session_start();
$conn = new PDO('mysql:host=localhost;dbname=shop', 'root', '');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = $_POST['title'];
    $stmt = $conn->prepare("INSERT INTO products (title) VALUES (?)");
    $stmt->execute([$title]);
    header('Location: products.php');
    exit;
}

$products = $conn->query("SELECT * FROM products")->fetchAll();
?>
<!DOCTYPE html>
<html>
<head>
    <title>Products</title>
</head>
<body>
    <h1>Products</h1>
    
    <?php if (isset($_SESSION['user'])): ?>
        <p>Welcome, <?= htmlspecialchars($_SESSION['user']['name']) ?></p>
    <?php endif; ?>
    
    <form method="POST">
        <input name="title" required>
        <button>Add</button>
    </form>
    
    <ul>
        <?php foreach ($products as $product): ?>
            <li>
                <?= htmlspecialchars($product['title']) ?>
                <?php if ($product['stock'] > 0): ?>
                    <span style="color: green">In stock</span>
                <?php else: ?>
                    <span style="color: red">Out of stock</span>
                <?php endif; ?>
            </li>
        <?php endforeach; ?>
    </ul>
</body>
</html>
```

### Проблемы этого подхода

1. **Невозможно переиспользовать HTML** — шапка и футер дублируются в каждом файле
2. **Сложно читать** — логика перемешана с разметкой
3. **Трудно тестировать** — нельзя протестировать бизнес-логику отдельно
4. **Опасно** — легко забыть `htmlspecialchars()` и получить XSS
5. **Невозможно изменить дизайн** — дизайнер не может работать с таким кодом

---

## 🏗️ Принцип разделения ответственности

### Три слоя приложения

```
┌─────────────────────────────────────┐
│  CONTROLLER (Контроллер)            │
│  - Получает запрос                  │
│  - Валидирует данные                │
│  - Вызывает бизнес-логику           │
│  - Передаёт данные в VIEW           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  MODEL (Модель)                     │
│  - Работа с БД                      │
│  - Бизнес-логика                    │
│  - Валидация на уровне данных       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  VIEW (Представление)               │
│  - Только отображение данных        │
│  - Минимальная логика (if, foreach) │
│  - Переиспользуемые компоненты      │
└─────────────────────────────────────┘
```

### Правило: что где должно быть

**В контроллере:**
```php
// ✅ Хорошо
$products = $productRepository->getActive();
$view->render('products/index', ['products' => $products]);

// ❌ Плохо
echo "<h1>Products</h1>";
foreach ($products as $p) {
    echo "<div>" . $p['title'] . "</div>";
}
```

**В модели:**
```php
// ✅ Хорошо
public function getActive(): array
{
    return $this->db->query("SELECT * FROM products WHERE active = 1")
        ->fetchAll();
}

// ❌ Плохо
public function renderProductsList(): string
{
    return "<ul>...</ul>"; // Модель не должна генерировать HTML!
}
```

**В шаблоне:**
```php
<!-- ✅ Хорошо -->
<?php foreach ($products as $product): ?>
    <div><?= e($product['title']) ?></div>
<?php endforeach; ?>

<!-- ❌ Плохо -->
<?php
    $products = $db->query("SELECT * FROM products")->fetchAll();
    // Шаблон не должен обращаться к БД!
?>
```

---

## 🛠️ Создание простого View-класса

### Шаг 1: Базовая структура

```php
// src/View/View.php
class View
{
    private string $viewsPath;
    private array $data = [];
    
    public function __construct(string $viewsPath = __DIR__ . '/../../views')
    {
        $this->viewsPath = rtrim($viewsPath, '/');
    }
    
    /**
     * Рендерит шаблон с данными
     */
    public function render(string $template, array $data = []): string
    {
        $this->data = $data;
        
        $templatePath = $this->viewsPath . '/' . $template . '.php';
        
        if (!file_exists($templatePath)) {
            throw new Exception("Template not found: $template");
        }
        
        // Извлекаем переменные в локальную область видимости
        extract($this->data);
        
        // Буферизация вывода
        ob_start();
        require $templatePath;
        return ob_get_clean();
    }
    
    /**
     * Безопасный вывод (защита от XSS)
     */
    public function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }
}
```

### Использование

```php
// controllers/ProductController.php
$view = new View();

$products = $productRepository->all();

echo $view->render('products/index', [
    'products' => $products,
    'title' => 'Product Catalog'
]);
```

```php
<!-- views/products/index.php -->
<h1><?= $this->e($title) ?></h1>

<div class="products">
    <?php foreach ($products as $product): ?>
        <div class="product-card">
            <h3><?= $this->e($product['title']) ?></h3>
            <p>Price: $<?= $this->e($product['price']) ?></p>
        </div>
    <?php endforeach; ?>
</div>
```

---

## 📐 Layout система (мастер-шаблоны)

### Проблема дублирования

Каждая страница имеет одинаковую структуру:

```php
<!DOCTYPE html>
<html>
<head>
    <title>My Site</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <header>...</header>
    
    <!-- Уникальный контент страницы -->
    
    <footer>...</footer>
</body>
</html>
```

Мы хотим писать только уникальную часть!

### Решение: Layout + Sections

**Улучшенный View-класс:**

```php
class View
{
    private string $viewsPath;
    private array $data = [];
    private ?string $layout = null;
    private array $sections = [];
    private ?string $currentSection = null;
    
    public function __construct(string $viewsPath = __DIR__ . '/../../views')
    {
        $this->viewsPath = rtrim($viewsPath, '/');
    }
    
    public function render(string $template, array $data = []): string
    {
        $this->data = $data;
        $this->layout = null;
        $this->sections = [];
        
        $content = $this->renderTemplate($template);
        
        // Если указан layout, рендерим его
        if ($this->layout) {
            $this->data['content'] = $content;
            return $this->renderTemplate($this->layout);
        }
        
        return $content;
    }
    
    private function renderTemplate(string $template): string
    {
        $templatePath = $this->viewsPath . '/' . $template . '.php';
        
        if (!file_exists($templatePath)) {
            throw new Exception("Template not found: $template");
        }
        
        extract($this->data);
        
        ob_start();
        require $templatePath;
        return ob_get_clean();
    }
    
    /**
     * Устанавливает layout для шаблона
     */
    public function extends(string $layout): void
    {
        $this->layout = $layout;
    }
    
    /**
     * Начинает секцию
     */
    public function section(string $name): void
    {
        $this->currentSection = $name;
        ob_start();
    }
    
    /**
     * Заканчивает секцию
     */
    public function endSection(): void
    {
        if (!$this->currentSection) {
            throw new Exception('No section started');
        }
        
        $this->sections[$this->currentSection] = ob_get_clean();
        $this->currentSection = null;
    }
    
    /**
     * Выводит содержимое секции
     */
    public function yield(string $name, string $default = ''): string
    {
        return $this->sections[$name] ?? $default;
    }
    
    public function e(?string $value): string
    {
        return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
    }
}
```

### Создание layout'а

```php
<!-- views/layouts/main.php -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $this->yield('title', 'My Application') ?></title>
    <link rel="stylesheet" href="/css/app.css">
    <?= $this->yield('styles') ?>
</head>
<body>
    <header class="header">
        <nav>
            <a href="/">Home</a>
            <a href="/products">Products</a>
            <a href="/about">About</a>
        </nav>
    </header>
    
    <main class="container">
        <?= $content ?>
    </main>
    
    <footer class="footer">
        <p>&copy; 2025 My Application</p>
    </footer>
    
    <script src="/js/app.js"></script>
    <?= $this->yield('scripts') ?>
</body>
</html>
```

### Использование layout'а

```php
<!-- views/products/index.php -->
<?php $this->extends('layouts/main'); ?>

<?php $this->section('title'); ?>
Product Catalog
<?php $this->endSection(); ?>

<?php $this->section('styles'); ?>
<link rel="stylesheet" href="/css/products.css">
<?php $this->endSection(); ?>

<!-- Основной контент (попадёт в переменную $content) -->
<h1>Products</h1>

<div class="products-grid">
    <?php foreach ($products as $product): ?>
        <div class="product-card">
            <img src="<?= $this->e($product['image']) ?>" alt="">
            <h3><?= $this->e($product['title']) ?></h3>
            <p class="price">$<?= $this->e($product['price']) ?></p>
            <a href="/products/<?= $product['id'] ?>" class="btn">View Details</a>
        </div>
    <?php endforeach; ?>
</div>

<?php $this->section('scripts'); ?>
<script src="/js/products-filter.js"></script>
<?php $this->endSection(); ?>
```

---

## 🧩 Частичные шаблоны (Partials)

### Переиспользуемые компоненты

Часто нужно использовать одинаковые блоки на разных страницах.

**Добавляем метод include в View:**

```php
class View
{
    // ... предыдущие методы ...
    
    /**
     * Подключает частичный шаблон
     */
    public function include(string $partial, array $data = []): string
    {
        $partialPath = $this->viewsPath . '/' . $partial . '.php';
        
        if (!file_exists($partialPath)) {
            throw new Exception("Partial not found: $partial");
        }
        
        // Объединяем данные шаблона с данными partial
        extract(array_merge($this->data, $data));
        
        ob_start();
        require $partialPath;
        return ob_get_clean();
    }
}
```

### Создание partial'а

```php
<!-- views/partials/product-card.php -->
<div class="product-card">
    <img src="<?= $this->e($product['image']) ?>" alt="<?= $this->e($product['title']) ?>">
    <h3><?= $this->e($product['title']) ?></h3>
    <p class="description"><?= $this->e($product['description']) ?></p>
    <div class="footer">
        <span class="price">$<?= $this->e($product['price']) ?></span>
        <a href="/products/<?= $product['id'] ?>" class="btn">Details</a>
    </div>
</div>
```

### Использование partial'а

```php
<!-- views/products/index.php -->
<?php $this->extends('layouts/main'); ?>

<h1>Products</h1>

<div class="products-grid">
    <?php foreach ($products as $product): ?>
        <?= $this->include('partials/product-card', ['product' => $product]) ?>
    <?php endforeach; ?>
</div>
```

Также можно создать partial для навигации:

```php
<!-- views/partials/navigation.php -->
<nav class="navbar">
    <ul>
        <?php foreach ($menuItems as $item): ?>
            <li>
                <a href="<?= $this->e($item['url']) ?>" 
                   class="<?= $currentUrl === $item['url'] ? 'active' : '' ?>">
                    <?= $this->e($item['title']) ?>
                </a>
            </li>
        <?php endforeach; ?>
    </ul>
</nav>
```

```php
<!-- Использование в layout -->
<?= $this->include('partials/navigation', [
    'menuItems' => [
        ['title' => 'Home', 'url' => '/'],
        ['title' => 'Products', 'url' => '/products'],
        ['title' => 'About', 'url' => '/about'],
    ],
    'currentUrl' => $_SERVER['REQUEST_URI']
]) ?>
```

---

## 🎨 Компоненты (Components)

Компоненты — это более мощная версия partial'ов с логикой.

### Создание компонента Alert

```php
// src/View/Components/Alert.php
namespace View\Components;

class Alert
{
    private string $type;
    private string $message;
    private bool $dismissible;
    
    public function __construct(string $type, string $message, bool $dismissible = false)
    {
        $this->type = $type;
        $this->message = $message;
        $this->dismissible = $dismissible;
    }
    
    public function render(): string
    {
        $classes = "alert alert-{$this->type}";
        if ($this->dismissible) {
            $classes .= " alert-dismissible";
        }
        
        $html = "<div class=\"{$classes}\">";
        $html .= htmlspecialchars($this->message, ENT_QUOTES, 'UTF-8');
        
        if ($this->dismissible) {
            $html .= '<button type="button" class="close" data-dismiss="alert">&times;</button>';
        }
        
        $html .= "</div>";
        
        return $html;
    }
}
```

**Добавляем метод component в View:**

```php
class View
{
    // ... предыдущие методы ...
    
    public function component(string $componentClass, array $params = []): string
    {
        if (!class_exists($componentClass)) {
            throw new Exception("Component class not found: $componentClass");
        }
        
        $component = new $componentClass(...array_values($params));
        
        return $component->render();
    }
}
```

**Использование:**

```php
<!-- views/products/show.php -->
<?php use View\Components\Alert; ?>

<?php $this->extends('layouts/main'); ?>

<?php if (isset($message)): ?>
    <?= $this->component(Alert::class, [
        'type' => 'success',
        'message' => $message,
        'dismissible' => true
    ]) ?>
<?php endif; ?>

<h1><?= $this->e($product['title']) ?></h1>
```

---

## 🔧 Хелперы для шаблонов

Полезные функции, упрощающие работу в шаблонах.

```php
class View
{
    // ... предыдущие методы ...
    
    /**
     * Создаёт URL с параметрами
     */
    public function url(string $path, array $params = []): string
    {
        $url = rtrim($path, '/');
        
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }
        
        return $url;
    }
    
    /**
     * Создаёт URL для asset'а (CSS, JS, изображения)
     */
    public function asset(string $path): string
    {
        return '/assets/' . ltrim($path, '/');
    }
    
    /**
     * Форматирует дату
     */
    public function date(string $date, string $format = 'Y-m-d H:i'): string
    {
        return date($format, strtotime($date));
    }
    
    /**
     * Обрезает текст до указанной длины
     */
    public function truncate(string $text, int $length = 100, string $suffix = '...'): string
    {
        if (mb_strlen($text) <= $length) {
            return $text;
        }
        
        return mb_substr($text, 0, $length) . $suffix;
    }
    
    /**
     * Форматирует число как цену
     */
    public function money(float $amount, string $currency = '$'): string
    {
        return $currency . number_format($amount, 2);
    }
    
    /**
     * Проверяет, активна ли текущая ссылка
     */
    public function isActive(string $path): bool
    {
        $currentPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        return $currentPath === $path;
    }
}
```

**Использование хелперов:**

```php
<!-- views/products/index.php -->
<nav>
    <a href="<?= $this->url('/products') ?>" 
       class="<?= $this->isActive('/products') ? 'active' : '' ?>">
        Products
    </a>
</nav>

<img src="<?= $this->asset('images/logo.png') ?>" alt="Logo">

<?php foreach ($products as $product): ?>
    <div class="product">
        <h3><?= $this->e($product['title']) ?></h3>
        <p><?= $this->e($this->truncate($product['description'], 150)) ?></p>
        <p class="price"><?= $this->money($product['price']) ?></p>
        <p class="date">Added: <?= $this->date($product['created_at'], 'd M Y') ?></p>
    </div>
<?php endforeach; ?>
```

---

## 🔐 Автоматическое экранирование

Одна из главных проблем — забыть вызвать `htmlspecialchars()`. Давайте сделаем автоэкранирование.

```php
class View
{
    private bool $autoEscape = true;
    
    // ... другие методы ...
    
    /**
     * Магический метод для доступа к переменным
     */
    public function __get(string $name)
    {
        if (!isset($this->data[$name])) {
            return null;
        }
        
        $value = $this->data[$name];
        
        // Автоматически экранируем строки
        if ($this->autoEscape && is_string($value)) {
            return $this->e($value);
        }
        
        return $value;
    }
    
    /**
     * Возвращает "сырое" (неэкранированное) значение
     */
    public function raw(string $name)
    {
        return $this->data[$name] ?? null;
    }
}
```

**Использование:**

```php
<!-- Автоматически экранируется -->
<h1><?= $title ?></h1>

<!-- Сырой HTML (используйте осторожно!) -->
<div class="content">
    <?= $this->raw('htmlContent') ?>
</div>
```

---

## 🎓 Как работают профессиональные шаблонизаторы

### Blade (Laravel)

Blade компилирует шаблоны в чистый PHP и кеширует их.

**Blade синтаксис:**
```blade
@extends('layouts.main')

@section('title', 'Products')

@section('content')
    <h1>Products</h1>
    
    @foreach($products as $product)
        <div class="product">
            <h3>{{ $product->title }}</h3>
            <p>{!! $product->description !!}</p>
            
            @if($product->inStock())
                <span class="badge success">In Stock</span>
            @else
                <span class="badge danger">Out of Stock</span>
            @endif
        </div>
    @endforeach
@endsection
```

**Компилируется в:**
```php
<?php $__env->extends('layouts.main'); ?>

<?php $__env->section('content'); ?>
    <h1>Products</h1>
    
    <?php foreach($products as $product): ?>
        <div class="product">
            <h3><?= htmlspecialchars($product->title) ?></h3>
            <p><?= $product->description ?></p>
            
            <?php if($product->inStock()): ?>
                <span class="badge success">In Stock</span>
            <?php else: ?>
                <span class="badge danger">Out of Stock</span>
            <?php endif; ?>
        </div>
    <?php endforeach; ?>
<?php $__env->endSection(); ?>
```

### Twig (Symfony)

Twig использует собственный синтаксис и песочницу (sandbox).

```twig
{% extends 'layouts/main.html.twig' %}

{% block title %}Products{% endblock %}

{% block content %}
    <h1>Products</h1>
    
    {% for product in products %}
        <div class="product">
            <h3>{{ product.title }}</h3>
            <p>{{ product.description|truncate(150) }}</p>
            <p class="price">{{ product.price|money }}</p>
            
            {% if product.inStock %}
                <span class="badge success">In Stock</span>
            {% endif %}
        </div>
    {% endfor %}
{% endblock %}
```

### Ключевые отличия

| Особенность | Чистый PHP | Blade | Twig |
|-------------|-----------|-------|------|
| Синтаксис | `<?php ?>` | `@directive`, `{{ }}` | `{% %}`, `{{ }}` |
| Компиляция | Нет | Да (в PHP) | Да (в PHP) |
| Кеширование | Ручное | Автоматическое | Автоматическое |
| Безопасность | Ручное экранирование | Автоэкранирование | Автоэкранирование |
| Песочница | Нет | Нет | Да |
| Расширяемость | PHP-функции | Directives | Extensions |

---

## 💼 Практическое задание

### Задание 1: Блог с комментариями

Создайте систему шаблонов для блога:

1. **Layout** с шапкой, навигацией и футером
2. **Страница списка статей** (`blog/index.php`)
3. **Страница одной статьи** (`blog/show.php`) с комментариями
4. **Partial** для карточки статьи
5. **Partial** для формы комментария
6. **Component** для пагинации

**Структура:**
```
views/
├── layouts/
│   └── main.php
├── blog/
│   ├── index.php
│   └── show.php
├── partials/
│   ├── article-card.php
│   └── comment-form.php
└── components/
    └── Pagination.php
```

**Данные для работы:**

```php
// Контроллер
$articles = [
    [
        'id' => 1,
        'title' => 'Getting Started with PHP',
        'slug' => 'getting-started-php',
        'excerpt' => 'Learn PHP basics...',
        'content' => 'Full article content...',
        'author' => 'John Doe',
        'created_at' => '2025-01-15 10:30:00',
        'comments_count' => 5
    ],
    // ... больше статей
];

$comments = [
    [
        'id' => 1,
        'article_id' => 1,
        'author' => 'Jane Smith',
        'content' => 'Great article!',
        'created_at' => '2025-01-16 14:20:00'
    ],
    // ... больше комментариев
];
```

### Задание 2: Админ-панель

Создайте отдельный layout для админки:

1. **Админский layout** (`layouts/admin.php`) с сайдбаром
2. **Dashboard** с виджетами статистики
3. **CRUD для продуктов** (список, создание, редактирование)
4. **Component Alert** для уведомлений
5. **Component Table** для табличных данных

### Задание 3: Расширенный View-класс

Добавьте в ваш View-класс:

1. **Стеки (stacks)** — для добавления скриптов из разных мест:
```php
$this->push('scripts');
<script src="/js/chart.js"></script>
<?php $this->endPush(); ?>

<!-- В layout -->
<?= $this->stack('scripts') ?>
```

2. **Slots** — для передачи HTML в компоненты:
```php
$this->slot('header');
<h1>Card Title</h1>
<?php $this->endSlot(); ?>
```

3. **Условные классы**:
```php
public function classNames(array $classes): string
{
    return implode(' ', array_filter($classes));
}

// Использование
<div class="<?= $this->classNames([
    'btn',
    'btn-primary',
    $isLarge ? 'btn-lg' : null,
    $isDisabled ? 'disabled' : null
]) ?>">
```

---

## 🧪 Самопроверка

### Вопросы

1. Почему нельзя писать SQL-запросы прямо в шаблонах?
2. В чём разница между `<?= $value ?>` и `<?= $this->e($value) ?>`?
3. Что такое буферизация вывода (`ob_start()`) и зачем она нужна?
4. Чем отличается partial от component?
5. Зачем нужен метод `extract()` в шаблонизаторе?

### Задачи

**Задача 1:** Найдите уязвимость XSS в этом коде:
```php
<!-- views/profile.php -->
<h1>Welcome, <?= $_GET['name'] ?></h1>
<p>Your bio: <?= $user['bio'] ?></p>
```

**Задача 2:** Оптимизируйте этот шаблон, используя partial:
```php
<!-- products.php -->
<?php foreach ($products as $product): ?>
    <div class="card">
        <img src="<?= $product['image'] ?>">
        <h3><?= $product['title'] ?></h3>
        <p><?= $product['price'] ?></p>
    </div>
<?php endforeach; ?>

<!-- categories.php -->
<?php foreach ($categories as $category): ?>
    <div class="card">
        <img src="<?= $category['image'] ?>">
        <h3><?= $category['title'] ?></h3>
        <p><?= $category['count'] ?> items</p>
    </div>
<?php endforeach; ?>
```

**Задача 3:** Реализуйте метод `@each` для рендеринга массива через partial:
```php
// Должно работать так:
<?= $this->each('partials/product-card', $products, 'product') ?>

// Вместо:
<?php foreach ($products as $product): ?>
    <?= $this->include('partials/product-card', ['product' => $product]) ?>
<?php endforeach; ?>
```

---

## 🎯 Частые ошибки

### ❌ Ошибка 1: Логика в шаблоне

```php
<!-- ❌ Плохо -->
<?php
$discountedPrice = $product['price'] * 0.9;
$formattedPrice = '$' . number_format($discountedPrice, 2);
?>
<p>Price: <?= $formattedPrice ?></p>
```

```php
<!-- ✅ Хорошо -->
<!-- Логика в контроллере или модели -->
<p>Price: <?= $this->money($product['discounted_price']) ?></p>
```

### ❌ Ошибка 2: Забыли экранировать

```php
<!-- ❌ ОПАСНО! -->
<input value="<?= $user['name'] ?>">

<!-- ✅ Безопасно -->
<input value="<?= $this->e($user['name']) ?>">
```

### ❌ Ошибка 3: Дублирование layout

```php
<!-- ❌ Плохо: копипаст шапки и футера -->
<!-- page1.php -->
<!DOCTYPE html>
<html>
<head>...</head>
<body>
    <header>...</header>
    <main>Page 1 content</main>
    <footer>...</footer>
</body>
</html>

<!-- page2.php -->
<!DOCTYPE html>
<html>
<head>...</head>
<body>
    <header>...</header>
    <main>Page 2 content</main>
    <footer>...</footer>
</body>
</html>
```

```php
<!-- ✅ Хорошо: используем layout -->
<!-- page1.php -->
<?php $this->extends('layouts/main'); ?>
<h1>Page 1</h1>

<!-- page2.php -->
<?php $this->extends('layouts/main'); ?>
<h1>Page 2</h1>
```

---

## 📚 Резюме

### Что мы изучили

1. **Принцип разделения ответственности** — контроллер, модель, представление
2. **View-класс** — рендеринг шаблонов с данными
3. **Layout-система** — мастер-шаблоны и секции
4. **Partial'ы** — переиспользуемые кусочки HTML
5. **Компоненты** — блоки с логикой
6. **Хелперы** — вспомогательные функции для шаблонов
7. **Безопасность** — автоматическое экранирование

### Принципы хорошего шаблона

✅ **Минимум логики** — только отображение данных  
✅ **Безопасность** — всегда экранировать вывод  
✅ **Переиспользование** — layout'ы, partial'ы, компоненты  
✅ **Читаемость** — чистая структура, понятные имена  
✅ **Разделение** — HTML отдельно от PHP-логики  

### Что дальше?

В следующих главах мы:
- Изучим **Composer** и экосистему пакетов
- Начнём работу с **Laravel** и его **Blade**
- Познакомимся с **компонентами Blade**
- Научимся создавать **dynamic UI** с Vue.js

---

## 🔗 Полезные ссылки

- [Laravel Blade Documentation](https://laravel.com/docs/blade)
- [Twig Documentation](https://twig.symfony.com/)
- [Plates PHP Template Engine](https://platesphp.com/)
- [Latte Template Engine](https://latte.nette.org/)

---

**Следующая глава:** [Часть 6: Безопасность — SQL-инъекции, XSS, CSRF](/)