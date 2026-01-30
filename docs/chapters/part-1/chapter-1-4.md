# Глава 1.4: Массивы глубоко

## Индексированные, ассоциативные, многомерные массивы и функции для работы с ними

---

## Почему массивы так важны?

В PHP массивы — это **универсальная структура данных**. Они используются везде:

```
┌─────────────────────────────────────────────────────────────────┐
│                  ГДЕ ИСПОЛЬЗУЮТСЯ МАССИВЫ                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   📝 Данные форм        $_POST, $_GET                          │
│   🗄️ Результаты БД      Строки из базы данных                  │
│   📋 Конфигурация       Настройки приложения                   │
│   📦 JSON/API           Данные от внешних сервисов             │
│   🛒 Бизнес-логика      Корзина, список товаров, пользователи  │
│   📊 Коллекции          Любые наборы однотипных данных         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

В отличие от многих языков, в PHP массивы — это **упорядоченные карты (ordered maps)**. Они сочетают свойства:
- Обычных массивов (по индексу)
- Хеш-таблиц/словарей (по ключу)
- Списков, очередей, стеков

---

## 1. Создание массивов

### Короткий синтаксис (рекомендуется)

```php
<?php
// Пустой массив
$empty = [];

// Индексированный массив (числовые ключи)
$fruits = ["яблоко", "банан", "апельсин"];

// Ассоциативный массив (строковые ключи)
$user = [
    "name" => "Иван",
    "age" => 25,
    "email" => "ivan@example.com"
];

// Смешанный
$mixed = [
    0 => "первый",
    "key" => "значение",
    1 => "второй"
];
```

### Старый синтаксис array()

```php
<?php
// До PHP 5.4 использовался такой синтаксис
$fruits = array("яблоко", "банан", "апельсин");
$user = array(
    "name" => "Иван",
    "age" => 25
);

// Сейчас [] предпочтительнее, но array() всё ещё работает
```

### Создание через присваивание

```php
<?php
// Массив создаётся автоматически
$arr[] = "первый";    // $arr[0] = "первый"
$arr[] = "второй";    // $arr[1] = "второй"
$arr[] = "третий";    // $arr[2] = "третий"

// С указанием ключа
$user["name"] = "Иван";
$user["age"] = 25;
```

### Функция range()

```php
<?php
$numbers = range(1, 10);       // [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
$letters = range('a', 'f');    // ['a', 'b', 'c', 'd', 'e', 'f']
$even = range(0, 10, 2);       // [0, 2, 4, 6, 8, 10] (с шагом 2)
```

### array_fill() и array_fill_keys()

```php
<?php
// Заполнить значением
$zeros = array_fill(0, 5, 0);           // [0, 0, 0, 0, 0]
$nulls = array_fill(0, 3, null);        // [null, null, null]

// Заполнить по ключам
$keys = ['a', 'b', 'c'];
$arr = array_fill_keys($keys, 0);       // ['a' => 0, 'b' => 0, 'c' => 0]
```

---

## 2. Индексированные массивы

### Что это?

Массивы с **числовыми ключами** (индексами), начиная с 0:

```php
<?php
$fruits = ["яблоко", "банан", "апельсин"];
//            0         1          2

echo $fruits[0];  // яблоко
echo $fruits[1];  // банан
echo $fruits[2];  // апельсин
```

### Визуализация

```
┌─────────────────────────────────────────┐
│         ИНДЕКСИРОВАННЫЙ МАССИВ          │
├─────────┬─────────┬─────────┬───────────┤
│ Индекс  │    0    │    1    │     2     │
├─────────┼─────────┼─────────┼───────────┤
│ Значение│ "яблоко"│ "банан" │"апельсин" │
└─────────┴─────────┴─────────┴───────────┘
```

### Добавление элементов

```php
<?php
$fruits = ["яблоко", "банан"];

// В конец (автоматический индекс)
$fruits[] = "апельсин";        // индекс 2
$fruits[] = "киви";            // индекс 3

// С указанием индекса
$fruits[10] = "манго";         // индекс 10 (с пропуском!)

print_r($fruits);
// [0 => "яблоко", 1 => "банан", 2 => "апельсин", 3 => "киви", 10 => "манго"]

// Следующий автоматический индекс будет 11
$fruits[] = "ананас";          // индекс 11
```

### Доступ к элементам

```php
<?php
$arr = ["a", "b", "c", "d", "e"];

// По индексу
echo $arr[0];      // a
echo $arr[2];      // c

// Отрицательные индексы НЕ работают в PHP!
// echo $arr[-1];  // ❌ Ошибка или создаст ключ -1

// Последний элемент
echo $arr[count($arr) - 1];  // e
echo end($arr);               // e (но сдвигает указатель!)

// Проверка существования
if (isset($arr[10])) {
    echo $arr[10];
} else {
    echo "Элемент не существует";
}

// Null coalescing
echo $arr[10] ?? "не найдено";  // не найдено
```

### Изменение и удаление

```php
<?php
$arr = ["a", "b", "c", "d"];

// Изменение
$arr[1] = "B";     // ["a", "B", "c", "d"]

// Удаление
unset($arr[2]);    // ["a", "B", 3 => "d"] — индексы НЕ перестраиваются!

// Удаление с перестройкой индексов
$arr = array_values($arr);  // ["a", "B", "d"] — индексы 0, 1, 2
```

---

## 3. Ассоциативные массивы

### Что это?

Массивы со **строковыми ключами** (как словари/хеш-таблицы):

```php
<?php
$user = [
    "name" => "Иван",
    "age" => 25,
    "email" => "ivan@example.com",
    "active" => true
];

echo $user["name"];   // Иван
echo $user["age"];    // 25
```

### Визуализация

```
┌─────────────────────────────────────────────────┐
│           АССОЦИАТИВНЫЙ МАССИВ                  │
├─────────┬─────────┬─────────┬───────────────────┤
│  Ключ   │ "name"  │  "age"  │     "email"       │
├─────────┼─────────┼─────────┼───────────────────┤
│ Значение│ "Иван"  │   25    │"ivan@example.com" │
└─────────┴─────────┴─────────┴───────────────────┘
```

### Добавление и изменение

```php
<?php
$user = ["name" => "Иван"];

// Добавление
$user["age"] = 25;
$user["city"] = "Москва";

// Изменение
$user["name"] = "Иван Петров";

// Добавление нескольких
$user += [
    "phone" => "+7999123456",
    "role" => "admin"
];
// Внимание: += НЕ перезаписывает существующие ключи!

print_r($user);
```

### Проверка ключей

```php
<?php
$user = [
    "name" => "Иван",
    "age" => 25,
    "city" => null  // Ключ существует, но значение null
];

// isset() — проверяет существование И не null
var_dump(isset($user["name"]));   // true
var_dump(isset($user["city"]));   // false (!) — значение null
var_dump(isset($user["phone"]));  // false — ключа нет

// array_key_exists() — проверяет только существование ключа
var_dump(array_key_exists("city", $user));   // true
var_dump(array_key_exists("phone", $user));  // false

// Практика: безопасный доступ
$city = $user["city"] ?? "Не указан";
$phone = $user["phone"] ?? "Не указан";
```

### Удаление

```php
<?php
$user = ["name" => "Иван", "age" => 25, "city" => "Москва"];

unset($user["city"]);

print_r($user);  // ["name" => "Иван", "age" => 25]
```

### Получение ключей и значений

```php
<?php
$user = ["name" => "Иван", "age" => 25, "city" => "Москва"];

$keys = array_keys($user);      // ["name", "age", "city"]
$values = array_values($user);  // ["Иван", 25, "Москва"]

// Проверка наличия значения
in_array("Иван", $user);                    // true
in_array("Пётр", $user);                    // false
in_array(25, $user);                        // true
in_array("25", $user);                      // true (нестрогое!)
in_array("25", $user, true);                // false (строгое)

// Поиск ключа по значению
array_search("Иван", $user);                // "name"
array_search("Пётр", $user);                // false
```

---

## 4. Многомерные массивы

### Массив массивов

```php
<?php
// Двумерный массив (таблица)
$matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
];

echo $matrix[0][0];  // 1
echo $matrix[1][2];  // 6
echo $matrix[2][1];  // 8

// Визуализация
//        col0  col1  col2
// row0 [  1,    2,    3  ]
// row1 [  4,    5,    6  ]
// row2 [  7,    8,    9  ]
```

### Массив ассоциативных массивов (записи)

```php
<?php
$users = [
    [
        "id" => 1,
        "name" => "Иван",
        "age" => 25
    ],
    [
        "id" => 2,
        "name" => "Мария",
        "age" => 30
    ],
    [
        "id" => 3,
        "name" => "Пётр",
        "age" => 28
    ]
];

// Доступ
echo $users[0]["name"];    // Иван
echo $users[1]["age"];     // 30

// Перебор
foreach ($users as $user) {
    echo "{$user['name']}, {$user['age']} лет\n";
}
// Иван, 25 лет
// Мария, 30 лет
// Пётр, 28 лет
```

### Ассоциативный массив с вложенными массивами

```php
<?php
$company = [
    "name" => "Tech Corp",
    "founded" => 2010,
    "address" => [
        "city" => "Москва",
        "street" => "Тверская",
        "building" => 15
    ],
    "departments" => [
        [
            "name" => "Разработка",
            "employees" => 50
        ],
        [
            "name" => "Маркетинг",
            "employees" => 20
        ]
    ],
    "contacts" => [
        "email" => "info@techcorp.com",
        "phones" => ["+7495123456", "+7499654321"]
    ]
];

// Доступ к вложенным данным
echo $company["address"]["city"];              // Москва
echo $company["departments"][0]["name"];       // Разработка
echo $company["contacts"]["phones"][0];        // +7495123456

// Безопасный доступ к глубоко вложенным
$zip = $company["address"]["zip"] ?? "Не указан";
```

### Трёхмерный массив

```php
<?php
// 3D массив (например, для 3D игры или данных по годам/месяцам/дням)
$data = [
    2024 => [
        "январь" => [
            "продажи" => 1000,
            "расходы" => 500
        ],
        "февраль" => [
            "продажи" => 1200,
            "расходы" => 600
        ]
    ],
    2025 => [
        "январь" => [
            "продажи" => 1500,
            "расходы" => 700
        ]
    ]
];

echo $data[2024]["январь"]["продажи"];  // 1000
```

---

## 5. Перебор массивов

### foreach — основной способ

```php
<?php
// Только значения
$fruits = ["яблоко", "банан", "апельсин"];
foreach ($fruits as $fruit) {
    echo "$fruit\n";
}

// Ключи и значения
$user = ["name" => "Иван", "age" => 25];
foreach ($user as $key => $value) {
    echo "$key: $value\n";
}

// С индексом для индексированных
foreach ($fruits as $index => $fruit) {
    echo "$index: $fruit\n";
}
// 0: яблоко
// 1: банан
// 2: апельсин
```

### for — когда нужен индекс

```php
<?php
$arr = ["a", "b", "c", "d", "e"];
$length = count($arr);

for ($i = 0; $i < $length; $i++) {
    echo "Индекс $i: {$arr[$i]}\n";
}

// Обратный порядок
for ($i = $length - 1; $i >= 0; $i--) {
    echo $arr[$i];
}
// edcba
```

### while с указателями

```php
<?php
$arr = ["a" => 1, "b" => 2, "c" => 3];

// Сброс указателя в начало
reset($arr);

while ($value = current($arr)) {
    $key = key($arr);
    echo "$key => $value\n";
    next($arr);
}

// Функции указателей:
// reset($arr)   — в начало, возвращает первый элемент
// end($arr)     — в конец, возвращает последний элемент
// current($arr) — текущий элемент
// key($arr)     — ключ текущего элемента
// next($arr)    — следующий элемент
// prev($arr)    — предыдущий элемент
```

### array_walk — применить функцию к каждому элементу

```php
<?php
$prices = [100, 200, 300];

// Изменение на месте
array_walk($prices, function(&$price, $key) {
    $price = $price * 1.2;  // +20% НДС
});

print_r($prices);  // [120, 240, 360]

// С дополнительным параметром
array_walk($prices, function(&$price, $key, $taxRate) {
    $price = $price * (1 + $taxRate);
}, 0.1);  // +10%
```

---

## 6. Основные операции с массивами

### Добавление элементов

```php
<?php
$arr = [1, 2, 3];

// В конец
$arr[] = 4;                    // [1, 2, 3, 4]
array_push($arr, 5, 6);        // [1, 2, 3, 4, 5, 6]

// В начало
array_unshift($arr, 0);        // [0, 1, 2, 3, 4, 5, 6]

// Spread operator (PHP 7.4+)
$more = [7, 8, 9];
$arr = [...$arr, ...$more];    // [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
```

### Удаление элементов

```php
<?php
$arr = [1, 2, 3, 4, 5];

// С конца
$last = array_pop($arr);       // $last = 5, $arr = [1, 2, 3, 4]

// С начала
$first = array_shift($arr);    // $first = 1, $arr = [2, 3, 4]

// По ключу
unset($arr[1]);                // [0 => 2, 2 => 4] — индексы сохраняются!

// Перестроить индексы
$arr = array_values($arr);     // [2, 4]

// Удалить по значению
$arr = [1, 2, 3, 2, 4, 2];
$arr = array_diff($arr, [2]);  // [0 => 1, 2 => 3, 4 => 4]
$arr = array_values($arr);     // [1, 3, 4]
```

### Извлечение части массива

```php
<?php
$arr = ["a", "b", "c", "d", "e"];

// array_slice — вырезать копию
$slice = array_slice($arr, 1, 3);      // ["b", "c", "d"]
$slice = array_slice($arr, -2);         // ["d", "e"] — с конца
$slice = array_slice($arr, 1, 3, true); // [1 => "b", 2 => "c", 3 => "d"] — сохранить ключи

// array_splice — вырезать и/или заменить (изменяет оригинал!)
$arr = ["a", "b", "c", "d", "e"];
$removed = array_splice($arr, 2, 2);    // $removed = ["c", "d"], $arr = ["a", "b", "e"]

// Вставка
$arr = ["a", "b", "e"];
array_splice($arr, 2, 0, ["c", "d"]);   // ["a", "b", "c", "d", "e"]

// Замена
$arr = ["a", "b", "c", "d", "e"];
array_splice($arr, 1, 2, ["X", "Y", "Z"]); // ["a", "X", "Y", "Z", "d", "e"]
```

### Объединение массивов

```php
<?php
$a = [1, 2, 3];
$b = [4, 5, 6];

// array_merge — объединение (перенумерует числовые ключи)
$merged = array_merge($a, $b);    // [1, 2, 3, 4, 5, 6]

// Spread operator (PHP 7.4+)
$merged = [...$a, ...$b];         // [1, 2, 3, 4, 5, 6]

// Для ассоциативных — значения перезаписываются
$x = ["a" => 1, "b" => 2];
$y = ["b" => 3, "c" => 4];
$merged = array_merge($x, $y);    // ["a" => 1, "b" => 3, "c" => 4]

// + оператор — НЕ перезаписывает существующие ключи!
$merged = $x + $y;                // ["a" => 1, "b" => 2, "c" => 4]

// array_merge_recursive — рекурсивное объединение
$x = ["user" => ["name" => "Иван"]];
$y = ["user" => ["age" => 25]];
$merged = array_merge_recursive($x, $y);
// ["user" => ["name" => "Иван", "age" => 25]]
```

### Разделение массивов

```php
<?php
$arr = [1, 2, 3, 4, 5, 6, 7, 8];

// array_chunk — разбить на части
$chunks = array_chunk($arr, 3);
// [[1, 2, 3], [4, 5, 6], [7, 8]]

// С сохранением ключей
$chunks = array_chunk($arr, 3, true);
// [[0 => 1, 1 => 2, 2 => 3], [3 => 4, 4 => 5, 5 => 6], [6 => 7, 7 => 8]]
```

---

## 7. Сортировка массивов

### Базовые функции сортировки

```php
<?php
$arr = [3, 1, 4, 1, 5, 9, 2, 6];

// По возрастанию (изменяет массив!)
sort($arr);           // [1, 1, 2, 3, 4, 5, 6, 9]

// По убыванию
rsort($arr);          // [9, 6, 5, 4, 3, 2, 1, 1]

// Сохранить ключи
$arr = ["b" => 3, "a" => 1, "c" => 2];
asort($arr);          // ["a" => 1, "c" => 2, "b" => 3] — по значению
arsort($arr);         // ["b" => 3, "c" => 2, "a" => 1] — по значению, убыв.

// Сортировка по ключам
ksort($arr);          // ["a" => 1, "b" => 3, "c" => 2]
krsort($arr);         // ["c" => 2, "b" => 3, "a" => 1]
```

### Таблица функций сортировки

```
┌─────────────────────────────────────────────────────────────────┐
│                    ФУНКЦИИ СОРТИРОВКИ                           │
├──────────┬───────────────────┬──────────────────────────────────┤
│ Функция  │ Сохраняет ключи?  │ Порядок                          │
├──────────┼───────────────────┼──────────────────────────────────┤
│ sort()   │ Нет               │ По значению, возрастание         │
│ rsort()  │ Нет               │ По значению, убывание            │
│ asort()  │ Да                │ По значению, возрастание         │
│ arsort() │ Да                │ По значению, убывание            │
│ ksort()  │ Да                │ По ключу, возрастание            │
│ krsort() │ Да                │ По ключу, убывание               │
│ usort()  │ Нет               │ Пользовательская (по значению)   │
│ uasort() │ Да                │ Пользовательская (по значению)   │
│ uksort() │ Да                │ Пользовательская (по ключу)      │
└──────────┴───────────────────┴──────────────────────────────────┘
```

### Пользовательская сортировка

```php
<?php
$users = [
    ["name" => "Иван", "age" => 25],
    ["name" => "Мария", "age" => 30],
    ["name" => "Пётр", "age" => 20],
];

// Сортировка по возрасту
usort($users, function($a, $b) {
    return $a["age"] <=> $b["age"];
});
// Пётр (20), Иван (25), Мария (30)

// Со стрелочной функцией (PHP 7.4+)
usort($users, fn($a, $b) => $a["age"] <=> $b["age"]);

// По убыванию
usort($users, fn($a, $b) => $b["age"] <=> $a["age"]);

// По нескольким полям (сначала по возрасту, потом по имени)
usort($users, function($a, $b) {
    $ageCompare = $a["age"] <=> $b["age"];
    if ($ageCompare !== 0) {
        return $ageCompare;
    }
    return strcmp($a["name"], $b["name"]);
});
```

### Оператор spaceship (<=>)

```php
<?php
// <=> возвращает -1, 0 или 1
echo 1 <=> 2;   // -1 (меньше)
echo 2 <=> 2;   // 0  (равно)
echo 3 <=> 2;   // 1  (больше)

// Работает со строками
echo "a" <=> "b";  // -1
echo "b" <=> "a";  // 1

// Идеально для сортировки
usort($arr, fn($a, $b) => $a <=> $b);  // По возрастанию
usort($arr, fn($a, $b) => $b <=> $a);  // По убыванию
```

### Натуральная сортировка

```php
<?php
$files = ["img12.png", "img2.png", "img1.png", "img10.png"];

// Обычная сортировка (лексикографическая)
sort($files);
// ["img1.png", "img10.png", "img12.png", "img2.png"] — неправильно!

// Натуральная сортировка
natsort($files);
// ["img1.png", "img2.png", "img10.png", "img12.png"] — правильно!

// Без учёта регистра
natcasesort($files);
```

---

## 8. Поиск и фильтрация

### Поиск элемента

```php
<?php
$arr = ["яблоко", "банан", "апельсин", "банан"];

// Проверка наличия значения
in_array("банан", $arr);           // true
in_array("киви", $arr);            // false
in_array("Банан", $arr);           // false (регистрозависимо)

// Строгая проверка типа
in_array("1", [1, 2, 3]);          // true (нестрогое)
in_array("1", [1, 2, 3], true);    // false (строгое)

// Поиск ключа по значению
array_search("банан", $arr);       // 1 (первое вхождение)
array_search("киви", $arr);        // false

// Все ключи по значению
array_keys($arr, "банан");         // [1, 3]
```

### array_filter — фильтрация

```php
<?php
$numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Только чётные
$even = array_filter($numbers, fn($n) => $n % 2 === 0);
// [1 => 2, 3 => 4, 5 => 6, 7 => 8, 9 => 10]

// Обнулить индексы
$even = array_values(array_filter($numbers, fn($n) => $n % 2 === 0));
// [2, 4, 6, 8, 10]

// Без callback — убрать falsy значения
$arr = [0, 1, "", "hello", null, false, [], [1]];
$filtered = array_filter($arr);
// [1 => 1, 3 => "hello", 7 => [1]]

// Фильтрация по ключам
$data = ["name" => "Иван", "password" => "secret", "email" => "test@test.com"];
$safe = array_filter($data, fn($key) => $key !== "password", ARRAY_FILTER_USE_KEY);
// ["name" => "Иван", "email" => "test@test.com"]

// По ключу и значению
$users = ["admin" => true, "user" => false, "guest" => false];
$active = array_filter($users, fn($active, $name) => $active && $name !== "guest", ARRAY_FILTER_USE_BOTH);
// ["admin" => true]
```

### array_column — извлечение колонки

```php
<?php
$users = [
    ["id" => 1, "name" => "Иван", "age" => 25],
    ["id" => 2, "name" => "Мария", "age" => 30],
    ["id" => 3, "name" => "Пётр", "age" => 28],
];

// Извлечь одну колонку
$names = array_column($users, "name");
// ["Иван", "Мария", "Пётр"]

// С индексацией по другой колонке
$names = array_column($users, "name", "id");
// [1 => "Иван", 2 => "Мария", 3 => "Пётр"]

// Только ключи (null как значение)
$byId = array_column($users, null, "id");
// [1 => ["id" => 1, "name" => "Иван", ...], 2 => [...], 3 => [...]]
```

---

## 9. Трансформация массивов

### array_map — применить к каждому

```php
<?php
$numbers = [1, 2, 3, 4, 5];

// Удвоить
$doubled = array_map(fn($n) => $n * 2, $numbers);
// [2, 4, 6, 8, 10]

// Несколько массивов
$a = [1, 2, 3];
$b = [10, 20, 30];
$sums = array_map(fn($x, $y) => $x + $y, $a, $b);
// [11, 22, 33]

// Преобразование объектов
$users = [
    ["name" => "Иван", "age" => 25],
    ["name" => "Мария", "age" => 30],
];
$names = array_map(fn($user) => $user["name"], $users);
// ["Иван", "Мария"]

// Форматирование
$prices = [100, 250, 1500];
$formatted = array_map(fn($p) => number_format($p, 0, '', ' ') . ' ₽', $prices);
// ["100 ₽", "250 ₽", "1 500 ₽"]
```

### array_reduce — свернуть в одно значение

```php
<?php
$numbers = [1, 2, 3, 4, 5];

// Сумма
$sum = array_reduce($numbers, fn($carry, $n) => $carry + $n, 0);
// 15

// Произведение
$product = array_reduce($numbers, fn($carry, $n) => $carry * $n, 1);
// 120

// Конкатенация
$words = ["Hello", "World", "PHP"];
$sentence = array_reduce($words, fn($carry, $word) => $carry . " " . $word, "");
// " Hello World PHP"

// Группировка
$items = [
    ["category" => "fruit", "name" => "яблоко"],
    ["category" => "vegetable", "name" => "морковь"],
    ["category" => "fruit", "name" => "банан"],
];

$grouped = array_reduce($items, function($carry, $item) {
    $carry[$item["category"]][] = $item["name"];
    return $carry;
}, []);
// ["fruit" => ["яблоко", "банан"], "vegetable" => ["морковь"]]

// Максимальный элемент по условию
$users = [
    ["name" => "Иван", "score" => 85],
    ["name" => "Мария", "score" => 92],
    ["name" => "Пётр", "score" => 78],
];

$topUser = array_reduce($users, function($max, $user) {
    return ($max === null || $user["score"] > $max["score"]) ? $user : $max;
}, null);
// ["name" => "Мария", "score" => 92]
```

### array_combine — ключи + значения

```php
<?php
$keys = ["name", "age", "city"];
$values = ["Иван", 25, "Москва"];

$user = array_combine($keys, $values);
// ["name" => "Иван", "age" => 25, "city" => "Москва"]
```

### array_flip — поменять ключи и значения

```php
<?php
$arr = ["a" => 1, "b" => 2, "c" => 3];

$flipped = array_flip($arr);
// [1 => "a", 2 => "b", 3 => "c"]

// Полезно для быстрого поиска
$allowed = ["admin", "editor", "user"];
$allowedMap = array_flip($allowed);  // ["admin" => 0, "editor" => 1, "user" => 2]

// isset() быстрее чем in_array() для больших массивов
if (isset($allowedMap[$role])) {
    echo "Роль разрешена";
}
```

### array_unique — уникальные значения

```php
<?php
$arr = [1, 2, 2, 3, 3, 3, 4];

$unique = array_unique($arr);
// [0 => 1, 1 => 2, 3 => 3, 6 => 4] — сохраняет первые ключи

$unique = array_values(array_unique($arr));
// [1, 2, 3, 4]

// Для ассоциативных
$users = [
    ["id" => 1, "name" => "Иван"],
    ["id" => 2, "name" => "Мария"],
    ["id" => 1, "name" => "Иван"],  // дубликат
];

// array_unique не работает с массивами внутри!
// Нужно использовать другой подход:
$unique = [];
$seenIds = [];
foreach ($users as $user) {
    if (!isset($seenIds[$user["id"]])) {
        $unique[] = $user;
        $seenIds[$user["id"]] = true;
    }
}
```

---

## 10. Операции над множествами

```php
<?php
$a = [1, 2, 3, 4, 5];
$b = [4, 5, 6, 7, 8];

// Разность — элементы $a, которых нет в $b
$diff = array_diff($a, $b);         // [1, 2, 3]

// Разность по ключам
$x = ["a" => 1, "b" => 2, "c" => 3];
$y = ["a" => 10, "d" => 4];
$diff = array_diff_key($x, $y);     // ["b" => 2, "c" => 3]

// Пересечение — общие элементы
$intersect = array_intersect($a, $b);  // [3 => 4, 4 => 5]

// Пересечение по ключам
$intersect = array_intersect_key($x, $y);  // ["a" => 1]

// Симметрическая разность (элементы только в одном из массивов)
$symDiff = array_merge(
    array_diff($a, $b),
    array_diff($b, $a)
);  // [1, 2, 3, 6, 7, 8]
```

---

## 11. Деструктуризация массивов

### list() / []

```php
<?php
$arr = ["Иван", 25, "Москва"];

// Старый синтаксис
list($name, $age, $city) = $arr;

// Современный синтаксис (PHP 7.1+)
[$name, $age, $city] = $arr;

echo "$name, $age лет, $city";  // Иван, 25 лет, Москва

// Пропуск элементов
[$first, , $third] = [1, 2, 3];
echo "$first, $third";  // 1, 3

// Вложенная деструктуризация
$data = ["Иван", ["Москва", "Россия"]];
[$name, [$city, $country]] = $data;
echo "$name из $city, $country";  // Иван из Москва, Россия
```

### Деструктуризация с ключами

```php
<?php
$user = ["name" => "Иван", "age" => 25, "city" => "Москва"];

// Извлечение по ключам
["name" => $name, "age" => $age] = $user;
echo "$name, $age";  // Иван, 25

// В foreach
$users = [
    ["name" => "Иван", "age" => 25],
    ["name" => "Мария", "age" => 30],
];

foreach ($users as ["name" => $name, "age" => $age]) {
    echo "$name: $age лет\n";
}
```

### Swap (обмен значениями)

```php
<?php
$a = 1;
$b = 2;

// Обмен без временной переменной
[$a, $b] = [$b, $a];

echo "$a, $b";  // 2, 1
```

---

## 12. Полезные функции

### Проверки

```php
<?php
$arr = [1, 2, 3];

count($arr);              // 3 — количество элементов
sizeof($arr);             // 3 — алиас count()

empty($arr);              // false — пустой?
empty([]);                // true

is_array($arr);           // true — это массив?

// Проверка структуры
function isAssoc(array $arr): bool {
    return array_keys($arr) !== range(0, count($arr) - 1);
}

isAssoc([1, 2, 3]);                    // false
isAssoc(["a" => 1, "b" => 2]);         // true
isAssoc([0 => "a", 2 => "b"]);         // true (пропущен индекс 1)
```

### Первый и последний элемент

```php
<?php
$arr = ["a", "b", "c", "d"];

// Первый
$first = $arr[0];                     // "a" (если индексы с 0)
$first = reset($arr);                 // "a" (сдвигает указатель!)
$first = $arr[array_key_first($arr)]; // "a" (PHP 7.3+, не сдвигает)

// Последний
$last = $arr[count($arr) - 1];        // "d" (если индексы подряд)
$last = end($arr);                    // "d" (сдвигает указатель!)
$last = $arr[array_key_last($arr)];   // "d" (PHP 7.3+, не сдвигает)
```

### Случайные элементы

```php
<?php
$arr = ["a", "b", "c", "d", "e"];

// Случайный ключ
$key = array_rand($arr);
echo $arr[$key];

// Несколько случайных ключей
$keys = array_rand($arr, 3);  // Массив из 3 ключей

// Перемешать
shuffle($arr);  // Изменяет массив на месте
print_r($arr);  // Случайный порядок
```

### Суммы и произведения

```php
<?php
$numbers = [1, 2, 3, 4, 5];

$sum = array_sum($numbers);       // 15
$product = array_product($numbers); // 120

// Среднее
$avg = array_sum($numbers) / count($numbers);  // 3
```

### Реверс и заполнение

```php
<?php
$arr = [1, 2, 3, 4, 5];

// Реверс
$reversed = array_reverse($arr);           // [5, 4, 3, 2, 1]
$reversed = array_reverse($arr, true);     // Сохранить ключи

// Дополнить до нужной длины
$padded = array_pad($arr, 10, 0);          // [1, 2, 3, 4, 5, 0, 0, 0, 0, 0]
$padded = array_pad($arr, -10, 0);         // [0, 0, 0, 0, 0, 1, 2, 3, 4, 5]
```

---

## 13. Практические примеры

### Пример 1: Группировка данных

```php
<?php
$orders = [
    ["customer" => "Иван", "product" => "Телефон", "amount" => 50000],
    ["customer" => "Мария", "product" => "Ноутбук", "amount" => 80000],
    ["customer" => "Иван", "product" => "Наушники", "amount" => 5000],
    ["customer" => "Пётр", "product" => "Телефон", "amount" => 45000],
    ["customer" => "Мария", "product" => "Мышь", "amount" => 2000],
];

// Группировка по покупателю
function groupBy(array $items, string $key): array {
    return array_reduce($items, function($result, $item) use ($key) {
        $result[$item[$key]][] = $item;
        return $result;
    }, []);
}

$byCustomer = groupBy($orders, "customer");
/*
[
    "Иван" => [
        ["customer" => "Иван", "product" => "Телефон", ...],
        ["customer" => "Иван", "product" => "Наушники", ...],
    ],
    "Мария" => [...],
    "Пётр" => [...],
]
*/

// Сумма заказов по покупателю
$totals = [];
foreach ($byCustomer as $customer => $customerOrders) {
    $totals[$customer] = array_sum(array_column($customerOrders, "amount"));
}
// ["Иван" => 55000, "Мария" => 82000, "Пётр" => 45000]
```

### Пример 2: Пагинация

```php
<?php
function paginate(array $items, int $page, int $perPage): array {
    $totalItems = count($items);
    $totalPages = (int) ceil($totalItems / $perPage);
    
    // Валидация страницы
    $page = max(1, min($page, $totalPages));
    
    $offset = ($page - 1) * $perPage;
    $pageItems = array_slice($items, $offset, $perPage);
    
    return [
        "data" => $pageItems,
        "meta" => [
            "current_page" => $page,
            "per_page" => $perPage,
            "total_items" => $totalItems,
            "total_pages" => $totalPages,
            "has_prev" => $page > 1,
            "has_next" => $page < $totalPages,
        ]
    ];
}

$items = range(1, 95);
$result = paginate($items, 3, 10);
// data: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
// meta: {current_page: 3, total_pages: 10, ...}
```

### Пример 3: Построение дерева из плоского списка

```php
<?php
$categories = [
    ["id" => 1, "parent_id" => null, "name" => "Электроника"],
    ["id" => 2, "parent_id" => 1, "name" => "Телефоны"],
    ["id" => 3, "parent_id" => 1, "name" => "Ноутбуки"],
    ["id" => 4, "parent_id" => 2, "name" => "Смартфоны"],
    ["id" => 5, "parent_id" => 2, "name" => "Кнопочные"],
    ["id" => 6, "parent_id" => null, "name" => "Одежда"],
    ["id" => 7, "parent_id" => 6, "name" => "Мужская"],
];

function buildTree(array $items, $parentId = null): array {
    $tree = [];
    
    foreach ($items as $item) {
        if ($item["parent_id"] === $parentId) {
            $children = buildTree($items, $item["id"]);
            if ($children) {
                $item["children"] = $children;
            }
            $tree[] = $item;
        }
    }
    
    return $tree;
}

$tree = buildTree($categories);
/*
[
    [
        "id" => 1,
        "name" => "Электроника",
        "children" => [
            ["id" => 2, "name" => "Телефоны", "children" => [
                ["id" => 4, "name" => "Смартфоны"],
                ["id" => 5, "name" => "Кнопочные"],
            ]],
            ["id" => 3, "name" => "Ноутбуки"],
        ]
    ],
    ["id" => 6, "name" => "Одежда", "children" => [
        ["id" => 7, "name" => "Мужская"],
    ]],
]
*/
```

### Пример 4: Фильтрация и сортировка товаров

```php
<?php
$products = [
    ["id" => 1, "name" => "iPhone 15", "price" => 99990, "category" => "phones", "rating" => 4.8],
    ["id" => 2, "name" => "Samsung S24", "price" => 89990, "category" => "phones", "rating" => 4.6],
    ["id" => 3, "name" => "MacBook Pro", "price" => 199990, "category" => "laptops", "rating" => 4.9],
    ["id" => 4, "name" => "Dell XPS", "price" => 149990, "category" => "laptops", "rating" => 4.5],
    ["id" => 5, "name" => "AirPods Pro", "price" => 24990, "category" => "audio", "rating" => 4.7],
];

class ProductFilter {
    private array $products;
    
    public function __construct(array $products) {
        $this->products = $products;
    }
    
    public function byCategory(string $category): self {
        $this->products = array_filter(
            $this->products,
            fn($p) => $p["category"] === $category
        );
        return $this;
    }
    
    public function byPriceRange(int $min, int $max): self {
        $this->products = array_filter(
            $this->products,
            fn($p) => $p["price"] >= $min && $p["price"] <= $max
        );
        return $this;
    }
    
    public function byMinRating(float $rating): self {
        $this->products = array_filter(
            $this->products,
            fn($p) => $p["rating"] >= $rating
        );
        return $this;
    }
    
    public function sortBy(string $field, string $direction = "asc"): self {
        usort($this->products, function($a, $b) use ($field, $direction) {
            $cmp = $a[$field] <=> $b[$field];
            return $direction === "desc" ? -$cmp : $cmp;
        });
        return $this;
    }
    
    public function get(): array {
        return array_values($this->products);
    }
}

// Использование
$filter = new ProductFilter($products);
$result = $filter
    ->byCategory("phones")
    ->byPriceRange(50000, 100000)
    ->byMinRating(4.5)
    ->sortBy("price", "asc")
    ->get();

// [Samsung S24, iPhone 15]
```

---

## 14. Упражнения

### Упражнение 1: Базовые операции (15 минут)

```php
<?php
$numbers = [5, 2, 8, 1, 9, 3, 7, 4, 6];

// 1. Найди минимальное и максимальное значение
// 2. Отсортируй по убыванию
// 3. Оставь только чётные числа
// 4. Удвой каждый элемент
// 5. Вычисли сумму и среднее
```

### Упражнение 2: Работа с ассоциативными массивами (20 минут)

```php
<?php
$students = [
    ["name" => "Иван", "grade" => 85, "subject" => "math"],
    ["name" => "Мария", "grade" => 92, "subject" => "physics"],
    ["name" => "Пётр", "grade" => 78, "subject" => "math"],
    ["name" => "Анна", "grade" => 95, "subject" => "physics"],
    ["name" => "Сергей", "grade" => 88, "subject" => "math"],
];

// 1. Найди студента с максимальной оценкой
// 2. Вычисли среднюю оценку по каждому предмету
// 3. Отфильтруй студентов с оценкой >= 85
// 4. Отсортируй по оценке (по убыванию)
// 5. Получи массив только имён
```

### Упражнение 3: Многомерные массивы (20 минут)

```php
<?php
$orders = [
    [
        "id" => 1,
        "customer" => "Иван",
        "items" => [
            ["product" => "Телефон", "price" => 50000, "qty" => 1],
            ["product" => "Чехол", "price" => 1000, "qty" => 2],
        ]
    ],
    [
        "id" => 2,
        "customer" => "Мария",
        "items" => [
            ["product" => "Ноутбук", "price" => 80000, "qty" => 1],
            ["product" => "Мышь", "price" => 2000, "qty" => 1],
        ]
    ],
];

// 1. Вычисли сумму каждого заказа
// 2. Найди заказ с максимальной суммой
// 3. Получи плоский список всех товаров
// 4. Подсчитай общее количество всех товаров
```

### Упражнение 4: Свои функции (25 минут)

Реализуй эти функции:

```php
<?php
// 1. array_pluck — извлечь значения по ключу (как array_column)
function array_pluck(array $items, string $key): array {
    // Твой код
}

// 2. array_group_by — группировка по ключу
function array_group_by(array $items, string $key): array {
    // Твой код
}

// 3. array_where — фильтрация по условию (ключ, оператор, значение)
function array_where(array $items, string $key, string $operator, $value): array {
    // Например: array_where($users, "age", ">=", 18)
    // Твой код
}

// 4. array_only — оставить только указанные ключи
function array_only(array $arr, array $keys): array {
    // Твой код
}

// 5. array_except — убрать указанные ключи
function array_except(array $arr, array $keys): array {
    // Твой код
}
```

---

## 15. Вопросы для самопроверки

1. **Чем отличается `[]` от `array()`?**

2. **Как добавить элемент в конец массива?**

3. **Что произойдёт с индексами после `unset($arr[1])`?**

4. **Чем отличается `isset($arr["key"])` от `array_key_exists("key", $arr)`?**

5. **Какая разница между `sort()` и `asort()`?**

6. **Что возвращает `array_filter()` без callback?**

7. **Как получить последний элемент массива без изменения указателя?**

8. **В чём разница между `array_merge()` и оператором `+`?**

---

## 16. Частые ошибки

### Ошибка 1: Модификация массива в foreach

```php
<?php
$arr = [1, 2, 3, 4, 5];

// ❌ Не работает — $n это копия
foreach ($arr as $n) {
    $n = $n * 2;
}
// $arr не изменился!

// ✅ По ссылке
foreach ($arr as &$n) {
    $n = $n * 2;
}
unset($n);  // Не забудь!

// ✅ Или используй array_map
$arr = array_map(fn($n) => $n * 2, $arr);
```

### Ошибка 2: Индексы после unset

```php
<?php
$arr = ["a", "b", "c", "d"];
unset($arr[1]);

// ❌ Ожидание: ["a", "c", "d"] с индексами 0, 1, 2
// ✅ Реальность: [0 => "a", 2 => "c", 3 => "d"]

// Перестроить индексы
$arr = array_values($arr);  // [0 => "a", 1 => "c", 2 => "d"]
```

### Ошибка 3: in_array без строгого сравнения

```php
<?php
$arr = [0, 1, 2];

// ❌ Опасно!
in_array("строка", $arr);  // true! ("строка" == 0)
in_array(false, $arr);     // true! (false == 0)

// ✅ Строгое сравнение
in_array("строка", $arr, true);  // false
in_array(false, $arr, true);     // false
```

### Ошибка 4: array_merge с числовыми ключами

```php
<?php
$a = [0 => "a", 1 => "b"];
$b = [0 => "c", 1 => "d"];

// array_merge перенумерует числовые ключи
$merged = array_merge($a, $b);
// [0 => "a", 1 => "b", 2 => "c", 3 => "d"]

// + сохраняет ключи (первый приоритетнее)
$merged = $a + $b;
// [0 => "a", 1 => "b"]  — $b проигнорирован!
```

### Ошибка 5: Доступ к вложенным несуществующим ключам

```php
<?php
$data = ["user" => ["name" => "Иван"]];

// ❌ Ошибка, если ключа нет
echo $data["user"]["email"]["domain"];  // Warning!

// ✅ Безопасный доступ
echo $data["user"]["email"]["domain"] ?? "не указано";

// ✅ Или проверка
if (isset($data["user"]["email"]["domain"])) {
    echo $data["user"]["email"]["domain"];
}
```

---

## Резюме главы

```
┌────────────────────────────────────────────────────────────────┐
│                      ЗАПОМНИ ГЛАВНОЕ                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ТИПЫ МАССИВОВ                                                 │
│  • Индексированные: [1, 2, 3] — числовые ключи               │
│  • Ассоциативные: ["key" => "value"] — строковые ключи       │
│  • Многомерные: массивы внутри массивов                       │
│                                                                │
│  ОСНОВНЫЕ ОПЕРАЦИИ                                             │
│  • Добавить: $arr[] = x, array_push(), array_unshift()       │
│  • Удалить: unset(), array_pop(), array_shift()              │
│  • Искать: in_array(), array_search(), array_key_exists()    │
│                                                                │
│  ТРАНСФОРМАЦИИ                                                 │
│  • array_map() — применить к каждому                         │
│  • array_filter() — отфильтровать                            │
│  • array_reduce() — свернуть в одно значение                 │
│  • array_column() — извлечь колонку                          │
│                                                                │
│  СОРТИРОВКА                                                    │
│  • sort/rsort — по значению, без сохранения ключей           │
│  • asort/arsort — по значению, с сохранением ключей          │
│  • ksort/krsort — по ключам                                  │
│  • usort — пользовательская функция                          │
│                                                                │
│  ВАЖНО ПОМНИТЬ                                                 │
│  • unset() не перестраивает индексы → array_values()         │
│  • in_array() нестрогое → используй третий параметр true     │
│  • Foreach по ссылке → не забудь unset()                     │
│  • Деструктуризация: [$a, $b] = $arr;                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

**Следующая глава:** `Глава 1.5: Строки и регулярные выражения — манипуляции со строками, поиск, замена, валидация`
