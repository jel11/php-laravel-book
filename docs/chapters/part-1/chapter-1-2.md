# Глава 1.2: Условия и циклы

## if/else, switch, match, for, foreach, while — когда что использовать

---

## Зачем нужны условия и циклы?

Программа без условий и циклов — это просто последовательность команд, которая выполняется сверху вниз. Но реальные задачи требуют:

- **Условия:** "Если пользователь авторизован — показать профиль, иначе — форму входа"
- **Циклы:** "Для каждого товара в корзине — вывести название и цену"

```
┌─────────────────────────────────────────────────────────────────┐
│                    УПРАВЛЯЮЩИЕ КОНСТРУКЦИИ                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   УСЛОВИЯ (Ветвление)           ЦИКЛЫ (Повторение)             │
│   ─────────────────────         ──────────────────             │
│   if / else / elseif            for                            │
│   switch                        foreach                        │
│   match (PHP 8+)                while                          │
│   Тернарный оператор            do...while                     │
│                                                                 │
│   "Выбери путь"                 "Повтори N раз"                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ЧАСТЬ 1: УСЛОВИЯ

---

## 1. if — базовое условие

### Синтаксис

```php
<?php
if (условие) {
    // Код выполнится, если условие true
}
```

### Как это работает

```
        ┌─────────────┐
        │   Условие   │
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │  true или   │
        │   false?    │
        └──────┬──────┘
               │
       ┌───────┴───────┐
       │               │
   ┌───▼───┐       ┌───▼───┐
   │ true  │       │ false │
   └───┬───┘       └───┬───┘
       │               │
       ▼               │
┌──────────────┐       │
│ Выполнить    │       │
│ код в блоке  │       │
└──────┬───────┘       │
       │               │
       └───────┬───────┘
               │
               ▼
        Продолжение
```

### Примеры

```php
<?php
$age = 25;

// Простое условие
if ($age >= 18) {
    echo "Вы совершеннолетний";
}

// Условие — это выражение, возвращающее boolean
$isAdult = $age >= 18;  // true
if ($isAdult) {
    echo "Вы совершеннолетний";
}

// Несколько условий с логическими операторами
$age = 25;
$hasLicense = true;

if ($age >= 18 && $hasLicense) {
    echo "Можете водить машину";
}

if ($age < 18 || !$hasLicense) {
    echo "Не можете водить машину";
}
```

### Фигурные скобки

```php
<?php
// Если одна инструкция — скобки можно опустить (но не рекомендуется!)
if ($age >= 18)
    echo "Совершеннолетний";

// ❌ Частая ошибка — добавили вторую строку, а она уже вне if
if ($age >= 18)
    echo "Совершеннолетний";
    echo "Можете голосовать";  // Это выполнится ВСЕГДА!

// ✅ Всегда используй фигурные скобки
if ($age >= 18) {
    echo "Совершеннолетний";
    echo "Можете голосовать";
}
```

**Правило:** Всегда используй `{}`, даже для одной строки. Это предотвращает ошибки.

---

## 2. if...else — два пути

### Синтаксис

```php
<?php
if (условие) {
    // Код, если true
} else {
    // Код, если false
}
```

### Схема

```
        ┌─────────────┐
        │   Условие   │
        └──────┬──────┘
               │
       ┌───────┴───────┐
       │               │
   ┌───▼───┐       ┌───▼───┐
   │ true  │       │ false │
   └───┬───┘       └───┬───┘
       │               │
       ▼               ▼
┌──────────────┐ ┌──────────────┐
│   Блок if    │ │  Блок else   │
└──────┬───────┘ └──────┬───────┘
       │               │
       └───────┬───────┘
               │
               ▼
        Продолжение
```

### Примеры

```php
<?php
$balance = 500;
$price = 750;

if ($balance >= $price) {
    echo "Покупка успешна!";
    $balance -= $price;
} else {
    echo "Недостаточно средств";
    $needed = $price - $balance;
    echo "Не хватает: $needed руб.";
}

// Результат: Недостаточно средств. Не хватает: 250 руб.
```

### Тернарный оператор — сокращённый if...else

```php
<?php
$age = 20;

// Длинная форма
if ($age >= 18) {
    $status = "взрослый";
} else {
    $status = "ребёнок";
}

// Тернарный оператор — то же самое в одну строку
$status = ($age >= 18) ? "взрослый" : "ребёнок";

// Можно использовать в выводе
echo "Статус: " . ($age >= 18 ? "взрослый" : "ребёнок");

// Можно вкладывать (но не злоупотребляй — теряется читаемость)
$category = ($age < 13) ? "ребёнок" : (($age < 18) ? "подросток" : "взрослый");
```

**Когда использовать тернарный оператор:**
- Простое присваивание одного из двух значений
- Короткие выражения

**Когда НЕ использовать:**
- Сложная логика
- Побочные эффекты (вызов функций, изменение данных)
- Вложенные условия

---

## 3. if...elseif...else — множественный выбор

### Синтаксис

```php
<?php
if (условие1) {
    // Если условие1 true
} elseif (условие2) {
    // Если условие1 false, но условие2 true
} elseif (условие3) {
    // Если условия 1 и 2 false, но условие3 true
} else {
    // Если все условия false
}
```

### Схема

```
    ┌───────────────┐
    │   Условие 1   │──── true ────► Блок 1 ────┐
    └───────┬───────┘                           │
            │ false                             │
    ┌───────▼───────┐                           │
    │   Условие 2   │──── true ────► Блок 2 ────┤
    └───────┬───────┘                           │
            │ false                             │
    ┌───────▼───────┐                           │
    │   Условие 3   │──── true ────► Блок 3 ────┤
    └───────┬───────┘                           │
            │ false                             │
    ┌───────▼───────┐                           │
    │     else      │───────────────────────────┤
    └───────────────┘                           │
                                                │
            ┌───────────────────────────────────┘
            │
            ▼
      Продолжение
```

### Важно: проверяются по порядку!

Условия проверяются **сверху вниз**. Как только одно сработало — остальные игнорируются.

```php
<?php
$score = 85;

// ❌ Неправильный порядок — всегда сработает первое!
if ($score >= 60) {
    $grade = "D";
} elseif ($score >= 70) {
    $grade = "C";  // Никогда не сработает для 85!
} elseif ($score >= 80) {
    $grade = "B";  // Никогда не сработает для 85!
} elseif ($score >= 90) {
    $grade = "A";
}
// Результат: D (неправильно!)

// ✅ Правильный порядок — от большего к меньшему
if ($score >= 90) {
    $grade = "A";
} elseif ($score >= 80) {
    $grade = "B";
} elseif ($score >= 70) {
    $grade = "C";
} elseif ($score >= 60) {
    $grade = "D";
} else {
    $grade = "F";
}
// Результат: B (правильно!)
```

### Практический пример: HTTP статусы

```php
<?php
$statusCode = 404;

if ($statusCode >= 200 && $statusCode < 300) {
    $message = "Успех";
    $type = "success";
} elseif ($statusCode >= 300 && $statusCode < 400) {
    $message = "Перенаправление";
    $type = "redirect";
} elseif ($statusCode >= 400 && $statusCode < 500) {
    $message = "Ошибка клиента";
    $type = "client_error";
} elseif ($statusCode >= 500) {
    $message = "Ошибка сервера";
    $type = "server_error";
} else {
    $message = "Информационный";
    $type = "info";
}

echo "$statusCode: $message ($type)";
// 404: Ошибка клиента (client_error)
```

---

## 4. switch — выбор по значению

### Когда использовать switch?

`switch` удобен, когда нужно сравнить **одну переменную** с **несколькими конкретными значениями**:

```php
<?php
$day = "понедельник";

// С if...elseif — много повторений
if ($day === "понедельник") {
    echo "Начало недели";
} elseif ($day === "вторник") {
    echo "Второй день";
} elseif ($day === "среда") {
    echo "Середина недели";
// ... и так далее

// Со switch — чище
switch ($day) {
    case "понедельник":
        echo "Начало недели";
        break;
    case "вторник":
        echo "Второй день";
        break;
    case "среда":
        echo "Середина недели";
        break;
    default:
        echo "Какой-то день";
}
```

### Синтаксис

```php
<?php
switch (выражение) {
    case значение1:
        // Код для значения1
        break;
    case значение2:
        // Код для значения2
        break;
    case значение3:
    case значение4:
        // Код для значений 3 и 4 (объединение)
        break;
    default:
        // Код, если ничего не совпало
}
```

### ВАЖНО: break!

```php
<?php
$fruit = "яблоко";

// ❌ Без break — выполнятся ВСЕ последующие case (fall-through)!
switch ($fruit) {
    case "яблоко":
        echo "Это яблоко\n";
    case "банан":
        echo "Это банан\n";
    case "апельсин":
        echo "Это апельсин\n";
}
// Выведет ВСЕ ТРИ строки!

// ✅ С break — только нужный case
switch ($fruit) {
    case "яблоко":
        echo "Это яблоко";
        break;
    case "банан":
        echo "Это банан";
        break;
    case "апельсин":
        echo "Это апельсин";
        break;
}
// Выведет только "Это яблоко"
```

### Fall-through — намеренное использование

Иногда fall-through полезен для группировки:

```php
<?php
$month = 3;

switch ($month) {
    case 12:
    case 1:
    case 2:
        $season = "зима";
        break;
    case 3:
    case 4:
    case 5:
        $season = "весна";
        break;
    case 6:
    case 7:
    case 8:
        $season = "лето";
        break;
    case 9:
    case 10:
    case 11:
        $season = "осень";
        break;
    default:
        $season = "неизвестно";
}

echo $season;  // весна
```

### switch использует нестрогое сравнение!

```php
<?php
$value = "0";

switch ($value) {
    case 0:
        echo "Число ноль";
        break;
    case "0":
        echo "Строка ноль";
        break;
}
// Выведет "Число ноль" — строка "0" == число 0!

// Если нужно строгое сравнение — используй if или match (PHP 8)
```

### Практический пример: роутер

```php
<?php
$action = $_GET['action'] ?? 'home';

switch ($action) {
    case 'home':
        include 'pages/home.php';
        break;
    case 'about':
        include 'pages/about.php';
        break;
    case 'contact':
        include 'pages/contact.php';
        break;
    case 'login':
    case 'signin':  // Оба варианта ведут на одну страницу
        include 'pages/login.php';
        break;
    default:
        http_response_code(404);
        include 'pages/404.php';
}
```

---

## 5. match — современная альтернатива (PHP 8+)

### Зачем нужен match?

`match` решает проблемы `switch`:
- Использует **строгое сравнение** (`===`)
- Это **выражение** (возвращает значение)
- Не нужен `break`
- Выбрасывает ошибку, если нет совпадения и нет `default`

### Синтаксис

```php
<?php
$result = match (выражение) {
    значение1 => результат1,
    значение2 => результат2,
    значение3, значение4 => результат_для_3_и_4,
    default => результат_по_умолчанию,
};
```

### Сравнение switch и match

```php
<?php
$statusCode = 404;

// switch
switch ($statusCode) {
    case 200:
        $message = "OK";
        break;
    case 404:
        $message = "Not Found";
        break;
    case 500:
        $message = "Server Error";
        break;
    default:
        $message = "Unknown";
}

// match — гораздо короче!
$message = match ($statusCode) {
    200 => "OK",
    404 => "Not Found",
    500 => "Server Error",
    default => "Unknown",
};
```

### Строгое сравнение в match

```php
<?php
$value = "0";

// switch (нестрогое)
switch ($value) {
    case 0:
        echo "Сработало для числа 0";  // Сработает!
        break;
}

// match (строгое)
$result = match ($value) {
    0 => "Число ноль",
    "0" => "Строка ноль",
};
echo $result;  // "Строка ноль"
```

### Множественные значения

```php
<?php
$day = "суббота";

$type = match ($day) {
    "понедельник", "вторник", "среда", "четверг", "пятница" => "рабочий",
    "суббота", "воскресенье" => "выходной",
};

echo $type;  // выходной
```

### match с условиями

```php
<?php
$age = 25;

// match с true — позволяет использовать условия
$category = match (true) {
    $age < 13 => "ребёнок",
    $age < 18 => "подросток",
    $age < 60 => "взрослый",
    default => "пенсионер",
};

echo $category;  // взрослый
```

### Блоки кода в match

Если нужно выполнить несколько действий:

```php
<?php
$action = "delete";

$result = match ($action) {
    "create" => (function() {
        // Несколько действий
        log("Creating...");
        return createRecord();
    })(),
    "delete" => (function() {
        log("Deleting...");
        return deleteRecord();
    })(),
    default => throw new InvalidArgumentException("Unknown action"),
};
```

Но если нужны блоки кода — лучше использовать обычный `switch` или функции.

---

## 6. Альтернативный синтаксис для шаблонов

В HTML-шаблонах стандартные `{}` неудобны. PHP предлагает альтернативный синтаксис:

```php
<?php if ($condition): ?>
    HTML код
<?php else: ?>
    Другой HTML
<?php endif; ?>
```

### if/else в шаблонах

```php
<!DOCTYPE html>
<html>
<body>
    <?php if ($isLoggedIn): ?>
        <h1>Добро пожаловать, <?= $username ?>!</h1>
        <a href="/logout">Выйти</a>
    <?php else: ?>
        <h1>Гость</h1>
        <a href="/login">Войти</a>
    <?php endif; ?>
</body>
</html>
```

### switch в шаблонах

```php
<?php switch ($userRole): ?>
    <?php case 'admin': ?>
        <div class="admin-panel">Панель администратора</div>
    <?php break; ?>
    
    <?php case 'editor': ?>
        <div class="editor-panel">Панель редактора</div>
    <?php break; ?>
    
    <?php default: ?>
        <div class="user-panel">Панель пользователя</div>
<?php endswitch; ?>
```

---

## ЧАСТЬ 2: ЦИКЛЫ

---

## 7. while — цикл с предусловием

### Синтаксис

```php
<?php
while (условие) {
    // Код выполняется, пока условие true
}
```

### Схема

```
        ┌─────────────┐
        │   Условие   │◄───────────┐
        └──────┬──────┘            │
               │                   │
       ┌───────┴───────┐           │
       │               │           │
   ┌───▼───┐       ┌───▼───┐       │
   │ true  │       │ false │       │
   └───┬───┘       └───┬───┘       │
       │               │           │
       ▼               │           │
┌──────────────┐       │           │
│ Выполнить    │       │           │
│ тело цикла   │───────┼───────────┘
└──────────────┘       │
                       │
                       ▼
                 Продолжение
```

### Примеры

```php
<?php
// Простой счётчик
$i = 1;
while ($i <= 5) {
    echo "$i ";
    $i++;
}
// 1 2 3 4 5

// Чтение файла построчно
$file = fopen("data.txt", "r");
while (!feof($file)) {
    $line = fgets($file);
    echo $line;
}
fclose($file);

// Ожидание условия
$attempts = 0;
$maxAttempts = 3;
$success = false;

while (!$success && $attempts < $maxAttempts) {
    $success = tryConnect();
    $attempts++;
    if (!$success) {
        sleep(1);  // Подождать 1 секунду
    }
}
```

### ВАЖНО: избегай бесконечных циклов!

```php
<?php
// ❌ Бесконечный цикл — забыли $i++
$i = 1;
while ($i <= 5) {
    echo $i;
    // Здесь должно быть $i++
}
// Программа зависнет!

// ❌ Условие всегда true
while (true) {
    echo "Бесконечно";
}
// Используй break для выхода!

// ✅ Бесконечный цикл с выходом
while (true) {
    $input = readline("Введите 'exit' для выхода: ");
    if ($input === "exit") {
        break;
    }
    echo "Вы ввели: $input\n";
}
```

---

## 8. do...while — цикл с постусловием

### Отличие от while

- `while` проверяет условие **до** выполнения тела
- `do...while` проверяет условие **после** выполнения тела

Это значит: тело `do...while` выполнится **минимум один раз**.

### Синтаксис

```php
<?php
do {
    // Код выполнится минимум 1 раз
} while (условие);  // Точка с запятой обязательна!
```

### Схема

```
        ┌──────────────┐
        │ Выполнить    │◄──────────┐
        │ тело цикла   │           │
        └──────┬───────┘           │
               │                   │
        ┌──────▼──────┐            │
        │   Условие   │            │
        └──────┬──────┘            │
               │                   │
       ┌───────┴───────┐           │
       │               │           │
   ┌───▼───┐       ┌───▼───┐       │
   │ true  │       │ false │       │
   └───┬───┘       └───┬───┘       │
       │               │           │
       └───────────────┼───────────┘
                       │
                       ▼
                 Продолжение
```

### Примеры

```php
<?php
// Разница между while и do...while
$i = 10;

// while — не выполнится ни разу
while ($i < 5) {
    echo "while: $i\n";
    $i++;
}

// do...while — выполнится 1 раз
$i = 10;
do {
    echo "do-while: $i\n";
    $i++;
} while ($i < 5);
// Выведет: do-while: 10

// Практика: меню с повтором
do {
    echo "\n1. Показать товары\n";
    echo "2. Добавить в корзину\n";
    echo "3. Оформить заказ\n";
    echo "0. Выход\n";
    
    $choice = (int) readline("Ваш выбор: ");
    
    switch ($choice) {
        case 1:
            showProducts();
            break;
        case 2:
            addToCart();
            break;
        case 3:
            checkout();
            break;
        case 0:
            echo "До свидания!\n";
            break;
        default:
            echo "Неверный выбор\n";
    }
} while ($choice !== 0);
```

---

## 9. for — цикл со счётчиком

### Синтаксис

```php
<?php
for (инициализация; условие; итерация) {
    // Тело цикла
}
```

### Как это работает

```php
<?php
for ($i = 0; $i < 5; $i++) {
    echo $i;
}

// Эквивалент на while:
$i = 0;              // Инициализация (1 раз)
while ($i < 5) {     // Условие (каждую итерацию)
    echo $i;
    $i++;            // Итерация (в конце каждой итерации)
}
```

### Схема

```
    ┌────────────────────┐
    │   Инициализация    │  (выполняется 1 раз)
    │      $i = 0        │
    └─────────┬──────────┘
              │
    ┌─────────▼──────────┐
    │     Условие        │◄─────────┐
    │     $i < 5         │          │
    └─────────┬──────────┘          │
              │                     │
      ┌───────┴───────┐             │
      │               │             │
  ┌───▼───┐       ┌───▼───┐         │
  │ true  │       │ false │         │
  └───┬───┘       └───┬───┘         │
      │               │             │
      ▼               │             │
┌───────────────┐     │             │
│  Тело цикла   │     │             │
│   echo $i     │     │             │
└───────┬───────┘     │             │
        │             │             │
┌───────▼───────┐     │             │
│   Итерация    │─────┼─────────────┘
│     $i++      │     │
└───────────────┘     │
                      │
                      ▼
                Продолжение
```

### Примеры

```php
<?php
// Простой счётчик
for ($i = 1; $i <= 10; $i++) {
    echo "$i ";
}
// 1 2 3 4 5 6 7 8 9 10

// Обратный отсчёт
for ($i = 10; $i >= 0; $i--) {
    echo "$i ";
}
// 10 9 8 7 6 5 4 3 2 1 0

// Шаг 2
for ($i = 0; $i <= 10; $i += 2) {
    echo "$i ";
}
// 0 2 4 6 8 10

// Несколько переменных
for ($i = 0, $j = 10; $i < $j; $i++, $j--) {
    echo "i=$i, j=$j\n";
}
// i=0, j=10
// i=1, j=9
// i=2, j=8
// i=3, j=7
// i=4, j=6

// Работа с массивом по индексу
$fruits = ["яблоко", "банан", "апельсин"];
for ($i = 0; $i < count($fruits); $i++) {
    echo ($i + 1) . ". " . $fruits[$i] . "\n";
}
// 1. яблоко
// 2. банан
// 3. апельсин
```

### Оптимизация: вынос count()

```php
<?php
$items = [/* большой массив */];

// ❌ Неоптимально — count() вызывается каждую итерацию
for ($i = 0; $i < count($items); $i++) {
    process($items[$i]);
}

// ✅ Оптимально — count() вызывается 1 раз
$length = count($items);
for ($i = 0; $i < $length; $i++) {
    process($items[$i]);
}

// ✅ Или так — в части инициализации
for ($i = 0, $len = count($items); $i < $len; $i++) {
    process($items[$i]);
}
```

---

## 10. foreach — цикл для массивов

### Зачем нужен foreach?

`foreach` специально создан для перебора массивов и объектов. Он проще и безопаснее, чем `for`.

### Синтаксис

```php
<?php
// Только значения
foreach ($array as $value) {
    // $value — текущий элемент
}

// Ключи и значения
foreach ($array as $key => $value) {
    // $key — ключ, $value — значение
}
```

### Примеры с индексированными массивами

```php
<?php
$fruits = ["яблоко", "банан", "апельсин"];

// Только значения
foreach ($fruits as $fruit) {
    echo "$fruit\n";
}
// яблоко
// банан
// апельсин

// С ключами (индексами)
foreach ($fruits as $index => $fruit) {
    echo "$index: $fruit\n";
}
// 0: яблоко
// 1: банан
// 2: апельсин
```

### Примеры с ассоциативными массивами

```php
<?php
$user = [
    "name" => "Иван",
    "age" => 25,
    "email" => "ivan@example.com"
];

foreach ($user as $key => $value) {
    echo "$key: $value\n";
}
// name: Иван
// age: 25
// email: ivan@example.com
```

### Многомерные массивы

```php
<?php
$users = [
    ["name" => "Иван", "age" => 25],
    ["name" => "Мария", "age" => 30],
    ["name" => "Пётр", "age" => 28],
];

foreach ($users as $index => $user) {
    echo ($index + 1) . ". {$user['name']}, {$user['age']} лет\n";
}
// 1. Иван, 25 лет
// 2. Мария, 30 лет
// 3. Пётр, 28 лет
```

### Изменение значений: по ссылке

```php
<?php
$numbers = [1, 2, 3, 4, 5];

// ❌ Так НЕ работает — $n это копия!
foreach ($numbers as $n) {
    $n = $n * 2;
}
print_r($numbers);  // [1, 2, 3, 4, 5] — не изменилось!

// ✅ Использу & для ссылки
foreach ($numbers as &$n) {  // & перед $n
    $n = $n * 2;
}
unset($n);  // ВАЖНО: удали ссылку после цикла!
print_r($numbers);  // [2, 4, 6, 8, 10]
```

### ⚠️ Важно: unset() после ссылки!

```php
<?php
$arr = [1, 2, 3];

foreach ($arr as &$value) {
    $value *= 2;
}
// $value всё ещё ссылается на последний элемент!

$value = 100;  // Это изменит $arr[2]!
print_r($arr);  // [2, 4, 100] — сюрприз!

// Решение: всегда unset() после foreach по ссылке
foreach ($arr as &$value) {
    $value *= 2;
}
unset($value);  // Удаляем ссылку
```

### foreach в шаблонах

```php
<!DOCTYPE html>
<html>
<body>
    <h1>Список товаров</h1>
    <ul>
        <?php foreach ($products as $product): ?>
            <li>
                <strong><?= htmlspecialchars($product['name']) ?></strong>
                — <?= $product['price'] ?> руб.
            </li>
        <?php endforeach; ?>
    </ul>
    
    <?php if (empty($products)): ?>
        <p>Товаров пока нет</p>
    <?php endif; ?>
</body>
</html>
```

---

## 11. break и continue

### break — выход из цикла

```php
<?php
// Выход при нахождении элемента
$numbers = [1, 5, 3, 8, 2, 9, 4];
$target = 8;

foreach ($numbers as $num) {
    if ($num === $target) {
        echo "Найдено: $num\n";
        break;  // Выходим из цикла
    }
    echo "Проверяем: $num\n";
}
// Проверяем: 1
// Проверяем: 5
// Проверяем: 3
// Найдено: 8
```

### break с уровнем — выход из вложенных циклов

```php
<?php
// Поиск в двумерном массиве
$matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
];
$target = 5;
$found = false;

foreach ($matrix as $rowIndex => $row) {
    foreach ($row as $colIndex => $value) {
        if ($value === $target) {
            echo "Найдено в позиции [$rowIndex][$colIndex]\n";
            $found = true;
            break 2;  // Выход из 2 циклов!
        }
    }
}
// Найдено в позиции [1][1]
```

### continue — пропуск итерации

```php
<?php
// Пропустить чётные числа
for ($i = 1; $i <= 10; $i++) {
    if ($i % 2 === 0) {
        continue;  // Пропустить эту итерацию
    }
    echo "$i ";
}
// 1 3 5 7 9

// Пропустить невалидные данные
$users = [
    ["name" => "Иван", "active" => true],
    ["name" => "Мария", "active" => false],
    ["name" => "Пётр", "active" => true],
];

foreach ($users as $user) {
    if (!$user['active']) {
        continue;  // Пропустить неактивных
    }
    echo "Обрабатываем: {$user['name']}\n";
}
// Обрабатываем: Иван
// Обрабатываем: Пётр
```

### continue с уровнем

```php
<?php
foreach ($categories as $category) {
    foreach ($category['products'] as $product) {
        if ($product['out_of_stock']) {
            continue 2;  // Пропустить на уровень категории
        }
        process($product);
    }
}
```

---

## 12. Вложенные циклы

### Таблица умножения

```php
<?php
echo "<table border='1'>\n";

for ($i = 1; $i <= 10; $i++) {
    echo "<tr>\n";
    for ($j = 1; $j <= 10; $j++) {
        $result = $i * $j;
        echo "  <td>$result</td>\n";
    }
    echo "</tr>\n";
}

echo "</table>\n";
```

### Обработка матрицы

```php
<?php
$matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
];

// Сумма всех элементов
$sum = 0;
foreach ($matrix as $row) {
    foreach ($row as $value) {
        $sum += $value;
    }
}
echo "Сумма: $sum\n";  // 45

// Поиск максимума
$max = $matrix[0][0];
for ($i = 0; $i < count($matrix); $i++) {
    for ($j = 0; $j < count($matrix[$i]); $j++) {
        if ($matrix[$i][$j] > $max) {
            $max = $matrix[$i][$j];
        }
    }
}
echo "Максимум: $max\n";  // 9
```

---

## 13. Когда что использовать?

### Сводная таблица

```
┌─────────────────────────────────────────────────────────────────┐
│                    КОГДА ЧТО ИСПОЛЬЗОВАТЬ                       │
├─────────────┬───────────────────────────────────────────────────┤
│ УСЛОВИЯ     │                                                   │
├─────────────┼───────────────────────────────────────────────────┤
│ if/else     │ Базовые проверки, сложные условия               │
│ elseif      │ Несколько взаимоисключающих условий             │
│ switch      │ Одна переменная, много конкретных значений      │
│ match       │ То же что switch, но чище (PHP 8+)              │
│ тернарный   │ Короткое присваивание одного из двух значений   │
├─────────────┼───────────────────────────────────────────────────┤
│ ЦИКЛЫ       │                                                   │
├─────────────┼───────────────────────────────────────────────────┤
│ foreach     │ Перебор массивов (90% случаев)                  │
│ for         │ Нужен индекс, нужен контроль над итерацией      │
│ while       │ Неизвестное число итераций, условие в начале    │
│ do...while  │ Минимум 1 итерация, условие в конце             │
└─────────────┴───────────────────────────────────────────────────┘
```

### Примеры выбора

```php
<?php
// === УСЛОВИЯ ===

// if/else — базовая проверка
if ($user->isAdmin()) {
    showAdminPanel();
} else {
    showUserDashboard();
}

// elseif — несколько условий с логикой
if ($score >= 90) {
    $grade = 'A';
} elseif ($score >= 80) {
    $grade = 'B';
} else {
    $grade = 'C';
}

// switch — одна переменная, много значений
switch ($paymentMethod) {
    case 'card':
        processCard();
        break;
    case 'paypal':
        processPaypal();
        break;
}

// match — то же, но элегантнее
$handler = match ($paymentMethod) {
    'card' => new CardHandler(),
    'paypal' => new PaypalHandler(),
    default => throw new Exception("Unknown method"),
};

// тернарный — короткое присваивание
$status = $isActive ? 'active' : 'inactive';


// === ЦИКЛЫ ===

// foreach — перебор массива (используй в 90% случаев!)
foreach ($users as $user) {
    sendEmail($user);
}

// for — нужен индекс или особый контроль
for ($i = 0; $i < 10; $i++) {
    echo "Элемент $i\n";
}

// for — изменение шага
for ($i = 0; $i < 100; $i += 10) {
    echo "$i ";  // 0 10 20 30...
}

// while — неизвестное число итераций
while ($row = $stmt->fetch()) {
    process($row);
}

// while — ожидание условия
while (!$connected) {
    $connected = tryConnect();
    sleep(1);
}

// do...while — минимум 1 выполнение
do {
    $input = readline("Введите число > 0: ");
} while ($input <= 0);
```

---

## 14. Практические примеры

### Пример 1: Валидация формы

```php
<?php
$errors = [];
$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$age = $_POST['age'] ?? '';

// Проверка имени
if (empty($name)) {
    $errors['name'] = "Имя обязательно";
} elseif (strlen($name) < 2) {
    $errors['name'] = "Имя слишком короткое";
} elseif (strlen($name) > 50) {
    $errors['name'] = "Имя слишком длинное";
}

// Проверка email
if (empty($email)) {
    $errors['email'] = "Email обязателен";
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = "Неверный формат email";
}

// Проверка возраста
if ($age === '') {
    $errors['age'] = "Возраст обязателен";
} elseif (!is_numeric($age)) {
    $errors['age'] = "Возраст должен быть числом";
} elseif ($age < 0 || $age > 150) {
    $errors['age'] = "Неверный возраст";
}

// Результат
if (empty($errors)) {
    echo "Данные валидны!";
    // Сохранить в БД...
} else {
    foreach ($errors as $field => $message) {
        echo "$field: $message\n";
    }
}
```

### Пример 2: Пагинация

```php
<?php
$totalItems = 95;
$itemsPerPage = 10;
$currentPage = (int) ($_GET['page'] ?? 1);

// Вычисляем количество страниц
$totalPages = (int) ceil($totalItems / $itemsPerPage);

// Проверяем границы
if ($currentPage < 1) {
    $currentPage = 1;
} elseif ($currentPage > $totalPages) {
    $currentPage = $totalPages;
}

// Генерируем пагинацию
echo "<nav>\n";
for ($page = 1; $page <= $totalPages; $page++) {
    if ($page === $currentPage) {
        echo "  <span class='current'>$page</span>\n";
    } else {
        echo "  <a href='?page=$page'>$page</a>\n";
    }
}
echo "</nav>\n";
```

### Пример 3: Поиск в данных

```php
<?php
$products = [
    ["id" => 1, "name" => "iPhone 15", "price" => 99990, "category" => "phones"],
    ["id" => 2, "name" => "Samsung Galaxy", "price" => 79990, "category" => "phones"],
    ["id" => 3, "name" => "MacBook Pro", "price" => 199990, "category" => "laptops"],
    ["id" => 4, "name" => "iPad Air", "price" => 59990, "category" => "tablets"],
    ["id" => 5, "name" => "AirPods Pro", "price" => 24990, "category" => "audio"],
];

$searchQuery = "iphone";
$categoryFilter = "phones";
$maxPrice = 100000;

$results = [];

foreach ($products as $product) {
    // Фильтр по категории
    if ($categoryFilter && $product['category'] !== $categoryFilter) {
        continue;
    }
    
    // Фильтр по цене
    if ($product['price'] > $maxPrice) {
        continue;
    }
    
    // Поиск по названию
    if ($searchQuery) {
        if (stripos($product['name'], $searchQuery) === false) {
            continue;
        }
    }
    
    // Прошёл все фильтры
    $results[] = $product;
}

// Вывод результатов
echo "Найдено: " . count($results) . " товаров\n\n";

foreach ($results as $product) {
    echo "{$product['name']} — {$product['price']} руб.\n";
}
```

### Пример 4: Обработка CSV

```php
<?php
$csvData = <<<CSV
name,email,age
Иван,ivan@test.com,25
Мария,maria@test.com,30
Пётр,peter@test.com,28
CSV;

$lines = explode("\n", $csvData);
$headers = [];
$users = [];

foreach ($lines as $index => $line) {
    $fields = str_getcsv($line);
    
    if ($index === 0) {
        // Первая строка — заголовки
        $headers = $fields;
        continue;
    }
    
    // Остальные — данные
    $user = [];
    foreach ($headers as $i => $header) {
        $user[$header] = $fields[$i] ?? null;
    }
    $users[] = $user;
}

// Результат
print_r($users);
/*
Array (
    [0] => Array ( [name] => Иван, [email] => ivan@test.com, [age] => 25 )
    [1] => Array ( [name] => Мария, [email] => maria@test.com, [age] => 30 )
    [2] => Array ( [name] => Пётр, [email] => peter@test.com, [age] => 28 )
)
*/
```

---

## 15. Упражнения

### Упражнение 1: FizzBuzz (15 минут)

Классическая задача. Выведи числа от 1 до 100:
- Если число делится на 3 — выведи "Fizz"
- Если делится на 5 — выведи "Buzz"
- Если делится на оба — выведи "FizzBuzz"
- Иначе — выведи само число

```
1, 2, Fizz, 4, Buzz, Fizz, 7, 8, Fizz, Buzz, 11, Fizz, 13, 14, FizzBuzz, 16...
```

### Упражнение 2: Пирамида (15 минут)

Выведи пирамиду из звёздочек высотой N:

```
    *
   ***
  *****
 *******
*********
```

Подсказка: для N=5 каждая строка имеет (N-i-1) пробелов и (2*i+1) звёздочек.

### Упражнение 3: Калькулятор оценок (20 минут)

Напиши программу, которая:
1. Принимает массив оценок студентов (числа от 0 до 100)
2. Вычисляет среднюю оценку
3. Присваивает буквенную оценку (A/B/C/D/F)
4. Выводит статистику: мин, макс, среднее, буквенная оценка

```php
$scores = [85, 92, 78, 65, 88, 91, 73, 82, 96, 70];
```

### Упражнение 4: Простые числа (20 минут)

Найди все простые числа от 2 до 100.

Простое число делится только на 1 и на себя.

Подсказка: для каждого числа проверяй делители от 2 до sqrt(число).

### Упражнение 5: Обработка заказов (25 минут)

```php
$orders = [
    ["id" => 1, "status" => "pending", "total" => 1500],
    ["id" => 2, "status" => "completed", "total" => 2300],
    ["id" => 3, "status" => "cancelled", "total" => 800],
    ["id" => 4, "status" => "pending", "total" => 3200],
    ["id" => 5, "status" => "completed", "total" => 1800],
    ["id" => 6, "status" => "completed", "total" => 4500],
];
```

Напиши код, который:
1. Подсчитает количество заказов каждого статуса
2. Вычислит общую сумму завершённых заказов
3. Найдёт заказ с максимальной суммой
4. Выведет все pending заказы

---

## 16. Вопросы для самопроверки

1. **Чем отличается `elseif` от нескольких `if`?**

2. **Почему важен порядок условий в `elseif`?**

3. **Что произойдёт, если забыть `break` в `switch`?**

4. **Чем `match` лучше `switch`?**

5. **В чём разница между `while` и `do...while`?**

6. **Когда лучше использовать `for`, а когда `foreach`?**

7. **Что делает `continue 2`?**

8. **Почему нужно вызывать `unset()` после `foreach` по ссылке?**

---

## 17. Частые ошибки

### Ошибка 1: Присваивание в условии

```php
<?php
// ❌ Ошибка — присваивание вместо сравнения
if ($status = "active") {  // Всегда true!
    echo "Активен";
}

// ✅ Правильно
if ($status === "active") {
    echo "Активен";
}

// Лайфхак: константу слева (Yoda conditions)
if ("active" === $status) {
    echo "Активен";
}
// Если случайно напишешь =, будет ошибка
```

### Ошибка 2: Бесконечный цикл

```php
<?php
// ❌ Забыли изменить счётчик
$i = 0;
while ($i < 10) {
    echo $i;
    // $i++ — забыто!
}

// ✅ Всегда проверяй, что условие выхода достижимо
$i = 0;
while ($i < 10) {
    echo $i;
    $i++;
}
```

### Ошибка 3: Ссылка в foreach

```php
<?php
$arr = [1, 2, 3];

// ❌ Забыли unset
foreach ($arr as &$val) {
    $val *= 2;
}
// $val всё ещё ссылается на $arr[2]!

$val = 999;
print_r($arr);  // [2, 4, 999] — сюрприз!

// ✅ Всегда unset после foreach по ссылке
foreach ($arr as &$val) {
    $val *= 2;
}
unset($val);
```

### Ошибка 4: Off-by-one

```php
<?php
$arr = [1, 2, 3, 4, 5];  // индексы 0-4

// ❌ Ошибка — $i <= 5 обратится к несуществующему индексу 5
for ($i = 0; $i <= count($arr); $i++) {
    echo $arr[$i];  // Ошибка на последней итерации!
}

// ✅ Правильно — < вместо <=
for ($i = 0; $i < count($arr); $i++) {
    echo $arr[$i];
}

// ✅ Или просто используй foreach
foreach ($arr as $val) {
    echo $val;
}
```

### Ошибка 5: break в switch + цикл

```php
<?php
// ❌ break выходит только из switch, не из цикла!
foreach ($items as $item) {
    switch ($item['type']) {
        case 'special':
            processSpecial($item);
            break;  // Это выход из switch, не из foreach!
        default:
            process($item);
    }
}

// ✅ Если нужно выйти из цикла — используй break 2
foreach ($items as $item) {
    switch ($item['type']) {
        case 'stop':
            break 2;  // Выход из switch И foreach
        default:
            process($item);
    }
}
```

---

## Резюме главы

```
┌────────────────────────────────────────────────────────────────┐
│                      ЗАПОМНИ ГЛАВНОЕ                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  УСЛОВИЯ                                                       │
│  • if/elseif/else — базовые проверки                          │
│  • switch — много значений одной переменной (нужен break!)    │
│  • match (PHP 8) — как switch, но лучше                       │
│  • Порядок условий важен — первое сработавшее выполнится      │
│                                                                │
│  ЦИКЛЫ                                                         │
│  • foreach — для массивов (используй в 90% случаев)           │
│  • for — когда нужен индекс или особый шаг                    │
│  • while — неизвестное число итераций, условие сначала        │
│  • do...while — минимум 1 итерация, условие в конце           │
│                                                                │
│  УПРАВЛЕНИЕ                                                    │
│  • break — выход из цикла                                     │
│  • continue — пропуск итерации                                │
│  • break N / continue N — для вложенных циклов                │
│                                                                │
│  ШАБЛОНЫ                                                       │
│  • Используй if(): endif; в HTML                              │
│  • Используй foreach(): endforeach; в HTML                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Ответы к упражнениям

### FizzBuzz

```php
<?php
for ($i = 1; $i <= 100; $i++) {
    if ($i % 3 === 0 && $i % 5 === 0) {
        echo "FizzBuzz";
    } elseif ($i % 3 === 0) {
        echo "Fizz";
    } elseif ($i % 5 === 0) {
        echo "Buzz";
    } else {
        echo $i;
    }
    echo ($i < 100) ? ", " : "\n";
}
```

### Пирамида

```php
<?php
$height = 5;

for ($i = 0; $i < $height; $i++) {
    $spaces = $height - $i - 1;
    $stars = 2 * $i + 1;
    
    echo str_repeat(" ", $spaces);
    echo str_repeat("*", $stars);
    echo "\n";
}
```

---

**Следующая глава:** `Глава 1.3: Функции — создание, параметры, возврат значений, области видимости, анонимные функции`
