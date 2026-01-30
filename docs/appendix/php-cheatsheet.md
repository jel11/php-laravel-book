# Приложение А: Шпаргалка по PHP — синтаксис, функции, операторы на одной странице

## 📌 О шпаргалке

Это компактный справочник по PHP для быстрого поиска. Держи под рукой во время разработки, код-ревью или подготовки к собеседованию.

---

## 🔤 Базовый синтаксис

### Теги PHP
```php
<?php // Стандартный открывающий тег
// Код здесь
?>

<?= $variable ?> // Короткий echo (всегда доступен с PHP 5.4+)
```

### Комментарии
```php
// Однострочный комментарий

# Альтернативный однострочный

/* 
   Многострочный
   комментарий
*/

/**
 * PHPDoc комментарий
 * @param string $name Описание параметра
 * @return bool Описание возвращаемого значения
 */
```

### Точка с запятой
```php
$x = 5; // Обязательна в конце инструкции
echo "Hello"; // Кроме последней строки перед ?>
```

---

## 📦 Переменные и типы данных

### Объявление переменных
```php
$name = "John";        // Начинаются с $
$_valid = true;        // Можно _ и буквы
$case_sensitive = 1;   // $Var ≠ $var
```

### Типы данных
```php
// Скалярные типы
$string = "text";           // string
$int = 42;                  // int (integer)
$float = 3.14;              // float (double)
$bool = true;               // bool (boolean)

// Составные типы
$array = [1, 2, 3];         // array
$object = new stdClass();   // object
$callable = fn() => true;   // callable

// Специальные типы
$null = null;               // null
$resource = fopen('file.txt', 'r'); // resource
```

### Проверка типов
```php
is_string($var)    is_int($var)       is_float($var)
is_bool($var)      is_array($var)     is_object($var)
is_null($var)      is_numeric($var)   is_callable($var)
is_resource($var)

isset($var)        // Существует и не null
empty($var)        // Пустая (false, 0, "", null, [])
```

### Приведение типов
```php
(int) $var        (float) $var      (string) $var
(bool) $var       (array) $var      (object) $var

intval($var)      floatval($var)    strval($var)
boolval($var)
```

---

## 🎯 Операторы

### Арифметические
```php
+ - * / %         // Сложение, вычитание, умножение, деление, остаток
**                // Возведение в степень (2 ** 3 = 8)
++ --             // Инкремент, декремент
```

### Присваивания
```php
= += -= *= /= %= **=
.=                // Конкатенация с присваиванием
??=               // Null coalescing присваивание (PHP 7.4+)
```

### Сравнения
```php
== !=             // Равно, не равно (с приведением типов)
=== !==           // Идентично, не идентично (строгое)
< > <= >=         // Меньше, больше, меньше или равно, больше или равно
<=>               // Spaceship (возвращает -1, 0, 1)
```

### Логические
```php
&& || !           // И, ИЛИ, НЕ (короткое вычисление)
and or xor        // Альтернативный синтаксис (низкий приоритет)
```

### Строковые
```php
.                 // Конкатенация ("Hello" . " World")
```

### Специальные
```php
??                // Null coalescing ($x ?? 'default')
?:                // Elvis operator ($x ?: 'default')
->                // Обращение к свойству/методу объекта
::                // Статический доступ (Class::method())
...               // Spread оператор (...$array)
```

### Тернарный оператор
```php
$result = $condition ? $true : $false;
```

---

## 🔀 Управляющие конструкции

### if / else
```php
if ($condition) {
    // код
} elseif ($other) {
    // код
} else {
    // код
}

// Короткая форма (для шаблонов)
<?php if ($show): ?>
    <div>Content</div>
<?php endif; ?>
```

### switch
```php
switch ($value) {
    case 1:
        // код
        break;
    case 2:
    case 3:
        // код для 2 или 3
        break;
    default:
        // код
}
```

### match (PHP 8.0+)
```php
$result = match ($value) {
    1 => 'one',
    2, 3 => 'two or three',
    default => 'other'
};
```

### Циклы
```php
// for
for ($i = 0; $i < 10; $i++) {
    // код
}

// foreach
foreach ($array as $value) {
    // код
}
foreach ($array as $key => $value) {
    // код
}

// while
while ($condition) {
    // код
}

// do-while
do {
    // код
} while ($condition);

// Управление циклом
break;       // Выход из цикла
continue;    // Следующая итерация
break 2;     // Выход из вложенных циклов
```

---

## 📚 Массивы

### Создание
```php
$arr = [];                          // Пустой массив
$arr = [1, 2, 3];                   // Индексированный
$arr = ['a' => 1, 'b' => 2];        // Ассоциативный
$arr = array(1, 2, 3);              // Старый синтаксис
```

### Доступ и изменение
```php
$arr[0]                             // Чтение
$arr['key']                         // Ключ
$arr[] = 4;                         // Добавить в конец
$arr[0] = 'new';                    // Изменить
unset($arr[1]);                     // Удалить элемент
```

### Основные функции
```php
count($arr)                         // Количество элементов
array_push($arr, $val)              // Добавить в конец
array_pop($arr)                     // Удалить с конца
array_shift($arr)                   // Удалить с начала
array_unshift($arr, $val)           // Добавить в начало

array_merge($arr1, $arr2)           // Объединить
array_keys($arr)                    // Получить ключи
array_values($arr)                  // Получить значения
array_key_exists($key, $arr)        // Проверка ключа
in_array($val, $arr)                // Поиск значения

array_map($callback, $arr)          // Применить функцию
array_filter($arr, $callback)       // Фильтрация
array_reduce($arr, $callback)       // Свёртка

sort($arr)                          // Сортировка по значению
rsort($arr)                         // Обратная сортировка
asort($arr)                         // С сохранением ключей
ksort($arr)                         // По ключам
usort($arr, $callback)              // Пользовательская

array_slice($arr, $offset, $len)    // Вырезать часть
array_chunk($arr, $size)            // Разбить на части
array_unique($arr)                  // Уникальные значения
implode($glue, $arr)                // Массив → строка
explode($delim, $str)               // Строка → массив
```

### Spread оператор (PHP 7.4+)
```php
$arr1 = [1, 2];
$arr2 = [...$arr1, 3, 4];           // [1, 2, 3, 4]
$merged = [...$arr1, ...$arr2];     // Объединение
```

---

## 🔤 Строки

### Создание
```php
$str = 'Single quotes';             // Без интерполяции
$str = "Double quotes $var";        // С интерполяцией
$str = "Complex {$obj->prop}";      // Сложные выражения
$str = <<<EOT                       // Heredoc
Text here
EOT;
$str = <<<'EOT'                     // Nowdoc (без интерполяции)
Text here
EOT;
```

### Основные функции
```php
strlen($str)                        // Длина строки
str_contains($str, $needle)         // Содержит (PHP 8.0+)
str_starts_with($str, $prefix)      // Начинается с (PHP 8.0+)
str_ends_with($str, $suffix)        // Заканчивается на (PHP 8.0+)

strpos($str, $needle)               // Позиция подстроки
strrpos($str, $needle)              // Последнее вхождение
substr($str, $start, $len)          // Подстрока
str_replace($search, $replace, $str) // Замена

strtolower($str)                    // Нижний регистр
strtoupper($str)                    // Верхний регистр
ucfirst($str)                       // Первая буква заглавная
ucwords($str)                       // Каждое слово с заглавной

trim($str)                          // Удалить пробелы по краям
ltrim($str)                         // Слева
rtrim($str)                         // Справа

explode($delim, $str)               // Разбить на массив
implode($glue, $arr)                // Объединить из массива
str_split($str, $len)               // Разбить на части

sprintf($format, ...$values)        // Форматирование
number_format($num, $decimals)      // Форматирование чисел

htmlspecialchars($str)              // Экранирование HTML
strip_tags($str)                    // Удалить HTML-теги
```

### Регулярные выражения
```php
preg_match($pattern, $str, $matches)      // Поиск (1 совпадение)
preg_match_all($pattern, $str, $matches)  // Все совпадения
preg_replace($pattern, $replace, $str)    // Замена
preg_split($pattern, $str)                // Разбить
```

---

## 🔧 Функции

### Объявление
```php
function name($param1, $param2 = 'default') {
    return $result;
}

// Типизация (PHP 7.0+)
function add(int $a, int $b): int {
    return $a + $b;
}

// Nullable типы (PHP 7.1+)
function find(int $id): ?User {
    return $user ?? null;
}

// Union типы (PHP 8.0+)
function process(int|string $value): bool {
    // ...
}
```

### Анонимные функции
```php
$func = function($x) {
    return $x * 2;
};

// С замыканием
$multiplier = 10;
$func = function($x) use ($multiplier) {
    return $x * $multiplier;
};

// Arrow functions (PHP 7.4+)
$func = fn($x) => $x * 2;
$func = fn($x) => $x * $multiplier; // Авто use
```

### Variadic функции
```php
function sum(...$numbers) {
    return array_sum($numbers);
}
sum(1, 2, 3, 4); // 10

// Named arguments (PHP 8.0+)
function greet($name, $title = 'Mr.') {
    return "$title $name";
}
greet(title: 'Dr.', name: 'Smith');
```

---

## 🎨 ООП

### Классы и объекты
```php
class User {
    public $name;           // Публичное свойство
    private $password;      // Приватное
    protected $email;       // Защищённое
    
    public function __construct($name) {
        $this->name = $name;
    }
    
    public function greet(): string {
        return "Hello, {$this->name}";
    }
    
    public static function create($name): self {
        return new self($name);
    }
}

$user = new User('John');
$user->greet();
User::create('Jane');
```

### Наследование
```php
class Admin extends User {
    public function __construct($name) {
        parent::__construct($name);
    }
}
```

### Интерфейсы и трейты
```php
interface Loggable {
    public function log(string $message): void;
}

trait Timestampable {
    public $created_at;
    
    public function touch() {
        $this->created_at = time();
    }
}

class Post implements Loggable {
    use Timestampable;
    
    public function log(string $message): void {
        // реализация
    }
}
```

### Магические методы
```php
__construct()       // Конструктор
__destruct()        // Деструктор
__get($name)        // Чтение несуществующего свойства
__set($name, $val)  // Запись
__call($name, $args) // Вызов несуществующего метода
__toString()        // Преобразование в строку
__invoke()          // Вызов объекта как функции
```

### Видимость и модификаторы
```php
public              // Доступно везде
protected           // Только в классе и наследниках
private             // Только в текущем классе

final class X {}    // Нельзя наследовать
final function f()  // Нельзя переопределить

abstract class X    // Нельзя создать экземпляр
abstract function f() // Должен быть реализован

static $property    // Статическое свойство
static function f() // Статический метод
```

---

## 🌐 Суперглобальные массивы

```php
$_GET               // Параметры URL (?key=value)
$_POST              // Данные из формы POST
$_REQUEST           // GET + POST + COOKIE
$_SERVER            // Информация о сервере и запросе
$_FILES             // Загруженные файлы
$_COOKIE            // Куки
$_SESSION           // Сессионные данные
$_ENV               // Переменные окружения
$GLOBALS            // Все глобальные переменные
```

### Полезные $_SERVER
```php
$_SERVER['REQUEST_METHOD']      // GET, POST, PUT...
$_SERVER['REQUEST_URI']         // /path?query
$_SERVER['HTTP_HOST']           // example.com
$_SERVER['REMOTE_ADDR']         // IP клиента
$_SERVER['HTTP_USER_AGENT']     // Браузер
$_SERVER['SERVER_NAME']         // Имя сервера
$_SERVER['DOCUMENT_ROOT']       // Корневая папка
```

---

## 📁 Работа с файлами

### Чтение
```php
file_get_contents($file)            // Весь файл в строку
file($file)                         // Массив строк
readfile($file)                     // Вывести содержимое

$handle = fopen($file, 'r');
$content = fread($handle, filesize($file));
fclose($handle);

// Построчно
$handle = fopen($file, 'r');
while (($line = fgets($handle)) !== false) {
    echo $line;
}
fclose($handle);
```

### Запись
```php
file_put_contents($file, $data);    // Перезаписать
file_put_contents($file, $data, FILE_APPEND); // Дописать

$handle = fopen($file, 'w');
fwrite($handle, $data);
fclose($handle);
```

### Проверки
```php
file_exists($path)          // Существует
is_file($path)              // Это файл
is_dir($path)               // Это директория
is_readable($path)          // Можно читать
is_writable($path)          // Можно писать
filesize($path)             // Размер в байтах
filemtime($path)            // Время изменения
```

### Операции
```php
copy($source, $dest)        // Копировать
rename($old, $new)          // Переименовать/переместить
unlink($file)               // Удалить файл
mkdir($dir, 0755, true)     // Создать директорию
rmdir($dir)                 // Удалить пустую директорию
```

### Пути
```php
basename($path)             // Имя файла
dirname($path)              // Директория
pathinfo($path)             // Массив с инфо
realpath($path)             // Абсолютный путь
__FILE__                    // Полный путь к текущему файлу
__DIR__                     // Директория текущего файла
```

---

## 🔐 Безопасность

### Фильтрация и валидация
```php
filter_var($email, FILTER_VALIDATE_EMAIL)
filter_var($url, FILTER_VALIDATE_URL)
filter_var($ip, FILTER_VALIDATE_IP)
filter_var($int, FILTER_VALIDATE_INT)

filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT)
filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL)
```

### Экранирование
```php
htmlspecialchars($str)              // HTML
htmlentities($str)                  // Все символы
strip_tags($str)                    // Удалить теги
addslashes($str)                    // Добавить слеши (устарело)
```

### Пароли
```php
password_hash($password, PASSWORD_DEFAULT)
password_verify($password, $hash)
password_needs_rehash($hash, PASSWORD_DEFAULT)
```

### Сессии
```php
session_start()                     // Начать сессию
session_destroy()                   // Уничтожить
session_regenerate_id(true)         // Новый ID (безопасность)
$_SESSION['key'] = $value;          // Сохранить
unset($_SESSION['key']);            // Удалить
```

---

## 🌍 HTTP и заголовки

### Отправка заголовков
```php
header('Location: /page');          // Редирект
header('HTTP/1.1 404 Not Found');   // Код статуса
header('Content-Type: application/json');
header('Content-Type: text/html; charset=utf-8');

http_response_code(404);            // Установить код
```

### Коды статусов (основные)
```php
200 OK                              // Успех
201 Created                         // Создано
204 No Content                      // Нет содержимого

301 Moved Permanently               // Постоянный редирект
302 Found                           // Временный редирект
304 Not Modified                    // Не изменено

400 Bad Request                     // Плохой запрос
401 Unauthorized                    // Не авторизован
403 Forbidden                       // Запрещено
404 Not Found                       // Не найдено

500 Internal Server Error           // Ошибка сервера
503 Service Unavailable             // Сервис недоступен
```

### JSON
```php
json_encode($data)                  // PHP → JSON
json_decode($json, true)            // JSON → массив
json_decode($json, false)           // JSON → объект

JSON_PRETTY_PRINT                   // Красивый вывод
JSON_UNESCAPED_UNICODE              // Не экранировать Unicode
JSON_THROW_ON_ERROR                 // Бросать исключения
```

---

## 🗄️ База данных (PDO)

### Подключение
```php
$pdo = new PDO(
    'mysql:host=localhost;dbname=mydb;charset=utf8mb4',
    'username',
    'password',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
```

### Запросы
```php
// Простой запрос
$stmt = $pdo->query('SELECT * FROM users');
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Prepared statement
$stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');
$stmt->execute(['id' => 1]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// INSERT
$stmt = $pdo->prepare('INSERT INTO users (name, email) VALUES (?, ?)');
$stmt->execute(['John', 'john@example.com']);
$id = $pdo->lastInsertId();

// UPDATE
$stmt = $pdo->prepare('UPDATE users SET name = ? WHERE id = ?');
$stmt->execute(['Jane', 1]);
$affected = $stmt->rowCount();
```

### Методы fetch
```php
fetch(PDO::FETCH_ASSOC)             // Ассоциативный массив
fetch(PDO::FETCH_OBJ)               // Объект
fetch(PDO::FETCH_NUM)               // Числовой массив
fetch(PDO::FETCH_CLASS, 'User')     // Объект класса

fetchAll()                          // Все строки
fetchColumn()                       // Первый столбец
```

### Транзакции
```php
try {
    $pdo->beginTransaction();
    // запросы
    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    throw $e;
}
```

---

## ⚠️ Обработка ошибок

### Try-catch
```php
try {
    // код
} catch (PDOException $e) {
    // обработка ошибки БД
} catch (Exception $e) {
    // другие ошибки
} finally {
    // выполнится всегда
}

throw new Exception('Error message');
```

### Классы исключений
```php
Exception                           // Базовый класс
RuntimeException                    // Ошибка выполнения
InvalidArgumentException            // Неверный аргумент
LogicException                      // Логическая ошибка
PDOException                        // Ошибка БД
```

### Настройки отображения ошибок
```php
error_reporting(E_ALL);             // Все ошибки
ini_set('display_errors', 1);       // Показывать (dev)
ini_set('display_errors', 0);       // Скрыть (production)
ini_set('log_errors', 1);           // Логировать

trigger_error('Message', E_USER_NOTICE);
```

---

## 📅 Дата и время

### Базовые функции
```php
time()                              // Unix timestamp
date('Y-m-d H:i:s')                 // Форматирование текущей даты
strtotime('2024-01-15')             // Строка → timestamp
strtotime('+1 day')                 // Относительная дата
```

### DateTime (рекомендуется)
```php
$date = new DateTime();
$date = new DateTime('2024-01-15');
$date = new DateTime('now', new DateTimeZone('Europe/Moscow'));

$date->format('Y-m-d H:i:s');
$date->modify('+1 day');
$date->setDate(2024, 12, 31);

$interval = $date1->diff($date2);   // Разница
$interval->days;                    // Дней между датами
```

### Форматы date()
```php
Y   // Год (2024)                  m   // Месяц (01-12)
d   // День (01-31)                H   // Часы 24ч (00-23)
i   // Минуты (00-59)              s   // Секунды (00-59)
l   // День недели (Monday)        F   // Месяц (January)
```

---

## 🔍 Прочее

### Include / Require
```php
include 'file.php';                 // Подключить (warning если нет)
require 'file.php';                 // Подключить (fatal если нет)
include_once 'file.php';            // Только 1 раз
require_once 'file.php';            // Только 1 раз
```

### Константы
```php
define('CONSTANT', 'value');        // Глобальная константа
const CONSTANT = 'value';           // Константа класса/глобальная

__LINE__                            // Номер строки
__FILE__                            // Путь к файлу
__DIR__                             // Директория файла
__FUNCTION__                        // Имя функции
__CLASS__                           // Имя класса
__METHOD__                          // Имя метода
```

### Полезные функции
```php
var_dump($var)                      // Подробный вывод
print_r($var)                       // Читаемый вывод
die('message')                      // Остановить выполнение
exit(1)                             // Выход с кодом

serialize($data)                    // PHP → строка
unserialize($string)                // Строка → PHP

sleep($seconds)                     // Пауза
usleep($microseconds)               // Пауза в микросекундах

header_sent()                       // Отправлены ли заголовки
ob_start()                          // Буферизация вывода
ob_get_clean()                      // Получить и очистить буфер
```

### Namespace
```php
namespace App\Models;

use App\Services\UserService;
use App\Models\User as UserModel;

class Post {
    // код
}
```

---

## 🎯 PHP 8+ особенности

### Named arguments
```php
function greet($name, $title = 'Mr.') {
    return "$title $name";
}
greet(title: 'Dr.', name: 'Smith');
```

### Union types
```php
function process(int|float $number): string|int {
    // ...
}
```

### Nullsafe operator
```php
$result = $user?->getAddress()?->getCity();
```

### Match expression
```php
$result = match ($status) {
    'draft' => 'In progress',
    'published' => 'Live',
    default => 'Unknown'
};
```

### Constructor property promotion
```php
class User {
    public function __construct(
        public string $name,
        private string $email
    ) {}
}
```

### Attributes (PHP 8.0+)
```php
#[Route('/api/users', methods: ['GET', 'POST'])]
class UserController {
    #[Required]
    public string $name;
}
```

---

## 💡 Советы и best practices

### ✅ Хорошо
```php
// Строгая типизация
declare(strict_types=1);

// Используй === вместо ==
if ($value === 0) {}

// Prepared statements для БД
$stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');

// password_hash для паролей
$hash = password_hash($password, PASSWORD_DEFAULT);

// Валидация входящих данных
$email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);

// Экранирование вывода
echo htmlspecialchars($userInput);
```

### ❌ Плохо
```php
// Слабое сравнение
if ($value == 0) {} // "0" == 0 === true!

// Конкатенация SQL
$sql = "SELECT * FROM users WHERE id = " . $_GET['id'];

// MD5 для паролей
$hash = md5($password);

// Прямое использование $_GET/$_POST
$email = $_POST['email'];

// Без экранирования
echo $userInput;

// Отключение ошибок
error_reporting(0);
```

---

## 📖 Где искать больше

```
Официальная документация: php.net
Стандарты кодирования: php-fig.org (PSR-1, PSR-12)
Пакеты: packagist.org
Инструменты: composer, phpstan, psalm, php-cs-fixer
```

---

## ✅ Как использовать шпаргалку

1. **При разработке** — быстро найти синтаксис функции
2. **При код-ревью** — проверить правильность использования
3. **При обучении** — повторить основные концепции
4. **Перед собеседованием** — освежить знания

**Совет**: Распечатай или держи в закладках. Со временем всё войдёт в мышечную память, но в начале это сэкономит массу времени!

---

**Успехов в разработке! 🚀**