# Глава 2.2: Формы и валидация

## Обработка форм, фильтрация, санитизация данных

---

## Почему валидация критически важна?

Данные от пользователя — это **главный источник угроз** для веб-приложения. Никогда не доверяй входным данным!

```
┌─────────────────────────────────────────────────────────────────┐
│                    ЗАЧЕМ НУЖНА ВАЛИДАЦИЯ                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   🛡️ Безопасность      SQL-инъекции, XSS, инъекции команд      │
│   📊 Целостность       Корректные данные в базе                │
│   💡 UX               Понятные сообщения об ошибках            │
│   🔄 Надёжность       Приложение не падает от мусора           │
│   📈 SEO              Валидные данные = валидный контент       │
│                                                                 │
│   "Доверяй, но проверяй" — НЕ работает в веб-разработке!       │
│   Правильно: "Не доверяй. Проверяй. Всегда."                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Три этапа обработки данных

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   ВХОДНЫЕ ДАННЫЕ                                                │
│        ↓                                                        │
│   ┌────────────────┐                                            │
│   │  ФИЛЬТРАЦИЯ    │  Приведение к нужному типу                 │
│   │  (Filtering)   │  Удаление лишних символов                  │
│   └───────┬────────┘                                            │
│           ↓                                                     │
│   ┌────────────────┐                                            │
│   │  ВАЛИДАЦИЯ     │  Проверка на соответствие правилам         │
│   │  (Validation)  │  Возврат ошибок если не прошло             │
│   └───────┬────────┘                                            │
│           ↓                                                     │
│   ┌────────────────┐                                            │
│   │  САНИТИЗАЦИЯ   │  Экранирование для безопасного             │
│   │  (Sanitization)│  использования (вывод, БД, файлы)          │
│   └───────┬────────┘                                            │
│           ↓                                                     │
│   БЕЗОПАСНЫЕ ДАННЫЕ                                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Разница между понятиями

```php
<?php
$input = "  <script>alert('XSS')</script>  123abc  ";

// ФИЛЬТРАЦИЯ — приведение к нужному формату
$filtered = trim($input);           // Убрать пробелы
$filtered = preg_replace('/\D/', '', $input);  // Оставить только цифры: "123"

// ВАЛИДАЦИЯ — проверка на соответствие правилам
$isValid = is_numeric($input);      // false
$isValid = strlen($input) <= 100;   // true

// САНИТИЗАЦИЯ — подготовка для безопасного использования
$sanitized = htmlspecialchars($input);  // Для HTML вывода
$sanitized = addslashes($input);        // ❌ Не используй для SQL!
// Для SQL используй prepared statements
```

---

## 2. Фильтрация данных

### Базовые функции очистки

```php
<?php
// trim — удаление пробелов по краям
$name = trim($_POST['name']);           // "  Иван  " → "Иван"
$name = trim($_POST['name'], " \t\n");  // Указать символы для удаления

// Приведение типов
$age = (int) $_POST['age'];             // "25abc" → 25
$price = (float) $_POST['price'];       // "99.99руб" → 99.99
$active = (bool) $_POST['active'];      // "1" → true

// Удаление HTML тегов
$text = strip_tags($_POST['bio']);
$text = strip_tags($_POST['bio'], '<p><br><b><i>');  // Разрешить некоторые

// Приведение к нижнему/верхнему регистру
$email = strtolower(trim($_POST['email']));
$code = strtoupper(trim($_POST['code']));

// Удаление множественных пробелов
$text = preg_replace('/\s+/', ' ', $text);

// Оставить только цифры
$phone = preg_replace('/\D/', '', $_POST['phone']);

// Оставить только буквы и цифры
$username = preg_replace('/[^a-zA-Z0-9_]/', '', $_POST['username']);
```

### filter_var — фильтрация с флагами

```php
<?php
// FILTER_SANITIZE_* — очистка данных

// Email — убрать все символы кроме допустимых в email
$email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);
// "john doe@exam ple.com" → "johndoe@example.com"

// URL — убрать недопустимые символы
$url = filter_var($_POST['url'], FILTER_SANITIZE_URL);

// Строка — убрать или закодировать специальные символы
$name = filter_var($_POST['name'], FILTER_SANITIZE_STRING);  // Deprecated в PHP 8.1!
$name = filter_var($_POST['name'], FILTER_SANITIZE_FULL_SPECIAL_CHARS);

// Число — убрать всё кроме цифр и знаков
$number = filter_var($_POST['number'], FILTER_SANITIZE_NUMBER_INT);
// "123abc-456" → "123-456"

$float = filter_var($_POST['price'], FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
// "99.99руб" → "99.99"

// Специальные символы для HTML
$html = filter_var($_POST['content'], FILTER_SANITIZE_SPECIAL_CHARS);
// Эквивалент htmlspecialchars()
```

### filter_input — фильтрация напрямую из источника

```php
<?php
// Безопаснее чем $_GET/$_POST — возвращает null если параметра нет

// Из GET
$page = filter_input(INPUT_GET, 'page', FILTER_SANITIZE_NUMBER_INT);
$search = filter_input(INPUT_GET, 'q', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

// Из POST
$email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
$age = filter_input(INPUT_POST, 'age', FILTER_SANITIZE_NUMBER_INT);

// Из COOKIE
$theme = filter_input(INPUT_COOKIE, 'theme', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

// Из SERVER
$ip = filter_input(INPUT_SERVER, 'REMOTE_ADDR', FILTER_VALIDATE_IP);

// Типы источников:
// INPUT_GET, INPUT_POST, INPUT_COOKIE, INPUT_SERVER, INPUT_ENV
```

### Функция очистки строки

```php
<?php
/**
 * Очистка строкового ввода
 */
function cleanString(?string $input, int $maxLength = 0): string {
    if ($input === null) {
        return '';
    }
    
    // Убрать пробелы по краям
    $clean = trim($input);
    
    // Убрать множественные пробелы
    $clean = preg_replace('/\s+/', ' ', $clean);
    
    // Обрезать если нужно
    if ($maxLength > 0 && mb_strlen($clean) > $maxLength) {
        $clean = mb_substr($clean, 0, $maxLength);
    }
    
    return $clean;
}

/**
 * Очистка для использования в HTML
 */
function cleanForHtml(?string $input): string {
    return htmlspecialchars(cleanString($input), ENT_QUOTES, 'UTF-8');
}

// Использование
$name = cleanString($_POST['name'] ?? null, 100);
$bio = cleanForHtml($_POST['bio'] ?? null);
```

---

## 3. Валидация данных

### filter_var для валидации

```php
<?php
// FILTER_VALIDATE_* — проверка данных (возвращает значение или false)

// Email
$email = 'user@example.com';
if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    echo "Некорректный email";
}

// URL
$url = 'https://example.com';
if (filter_var($url, FILTER_VALIDATE_URL) === false) {
    echo "Некорректный URL";
}

// IP адрес
$ip = '192.168.1.1';
filter_var($ip, FILTER_VALIDATE_IP);                    // Любой IP
filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4);  // Только IPv4
filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6);  // Только IPv6
filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE);  // Не приватный

// Целое число
$age = filter_var($_POST['age'], FILTER_VALIDATE_INT);
if ($age === false) {
    echo "Должно быть целым числом";
}

// С диапазоном
$age = filter_var($_POST['age'], FILTER_VALIDATE_INT, [
    'options' => [
        'min_range' => 1,
        'max_range' => 150
    ]
]);

// Число с плавающей точкой
$price = filter_var($_POST['price'], FILTER_VALIDATE_FLOAT);

// Boolean
$active = filter_var($_POST['active'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
// "yes", "true", "1", "on" → true
// "no", "false", "0", "off" → false
// другое → null

// Доменное имя (PHP 7+)
filter_var($domain, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME);

// MAC адрес
filter_var($mac, FILTER_VALIDATE_MAC);

// Регулярное выражение
$username = filter_var($_POST['username'], FILTER_VALIDATE_REGEXP, [
    'options' => ['regexp' => '/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/']
]);
```

### Валидация с filter_input

```php
<?php
// Получение и валидация одновременно
$email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);

if ($email === null) {
    echo "Email не передан";
} elseif ($email === false) {
    echo "Некорректный email";
} else {
    echo "Email: $email";
}

// Удобная обёртка
function getValidatedInput(int $type, string $name, int $filter, $options = null) {
    $value = filter_input($type, $name, $filter, $options);
    
    return [
        'value' => $value,
        'exists' => $value !== null,
        'valid' => $value !== false && $value !== null,
    ];
}

$result = getValidatedInput(INPUT_POST, 'age', FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 1, 'max_range' => 150]
]);

if (!$result['exists']) {
    echo "Возраст не указан";
} elseif (!$result['valid']) {
    echo "Некорректный возраст";
} else {
    echo "Возраст: " . $result['value'];
}
```

### Ручная валидация

```php
<?php
// Проверка обязательности
function required($value): bool {
    return $value !== null && $value !== '' && $value !== [];
}

// Проверка длины строки
function lengthBetween(string $value, int $min, int $max): bool {
    $length = mb_strlen($value);
    return $length >= $min && $length <= $max;
}

// Проверка на число в диапазоне
function numberBetween($value, $min, $max): bool {
    return is_numeric($value) && $value >= $min && $value <= $max;
}

// Проверка формата даты
function isValidDate(string $date, string $format = 'Y-m-d'): bool {
    $d = DateTime::createFromFormat($format, $date);
    return $d && $d->format($format) === $date;
}

// Проверка совпадения полей
function matches(string $value1, string $value2): bool {
    return $value1 === $value2;
}

// Проверка на уникальность (пример с БД)
function isUnique(string $table, string $column, string $value, ?int $exceptId = null): bool {
    global $pdo;
    
    $sql = "SELECT COUNT(*) FROM $table WHERE $column = ?";
    $params = [$value];
    
    if ($exceptId !== null) {
        $sql .= " AND id != ?";
        $params[] = $exceptId;
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    return $stmt->fetchColumn() === 0;
}

// Проверка массива
function inArray($value, array $allowed): bool {
    return in_array($value, $allowed, true);
}
```

### Валидация регулярными выражениями

```php
<?php
class RegexValidator {
    // Телефон (российский)
    public static function phone(string $phone): bool {
        $cleaned = preg_replace('/\D/', '', $phone);
        return preg_match('/^[78]\d{10}$/', $cleaned) === 1;
    }
    
    // Имя пользователя (латиница, цифры, подчёркивание)
    public static function username(string $username): bool {
        return preg_match('/^[a-zA-Z][a-zA-Z0-9_]{2,29}$/', $username) === 1;
    }
    
    // Slug (URL-friendly строка)
    public static function slug(string $slug): bool {
        return preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug) === 1;
    }
    
    // Пароль (минимум 8 символов, буквы и цифры)
    public static function password(string $password): bool {
        return mb_strlen($password) >= 8 
            && preg_match('/[a-zA-Z]/', $password) === 1
            && preg_match('/\d/', $password) === 1;
    }
    
    // Сильный пароль (+ спецсимволы и разный регистр)
    public static function strongPassword(string $password): bool {
        return mb_strlen($password) >= 8
            && preg_match('/[a-z]/', $password) === 1
            && preg_match('/[A-Z]/', $password) === 1
            && preg_match('/\d/', $password) === 1
            && preg_match('/[^a-zA-Z\d]/', $password) === 1;
    }
    
    // Почтовый индекс (6 цифр)
    public static function postalCode(string $code): bool {
        return preg_match('/^\d{6}$/', $code) === 1;
    }
    
    // ИНН (10 или 12 цифр)
    public static function inn(string $inn): bool {
        return preg_match('/^\d{10}$|^\d{12}$/', $inn) === 1;
    }
    
    // Только кириллица
    public static function cyrillic(string $text): bool {
        return preg_match('/^[\p{Cyrillic}\s]+$/u', $text) === 1;
    }
    
    // Только буквы (любой алфавит)
    public static function alpha(string $text): bool {
        return preg_match('/^[\p{L}]+$/u', $text) === 1;
    }
    
    // Буквы и пробелы
    public static function alphaSpaces(string $text): bool {
        return preg_match('/^[\p{L}\s]+$/u', $text) === 1;
    }
}

// Использование
if (!RegexValidator::phone($_POST['phone'])) {
    $errors['phone'] = 'Некорректный номер телефона';
}

if (!RegexValidator::strongPassword($_POST['password'])) {
    $errors['password'] = 'Пароль должен содержать буквы разного регистра, цифры и спецсимволы';
}
```

---

## 4. Класс валидатора

### Простой валидатор

```php
<?php
class Validator {
    private array $data;
    private array $errors = [];
    private array $validated = [];
    
    public function __construct(array $data) {
        $this->data = $data;
    }
    
    public function validate(array $rules): self {
        foreach ($rules as $field => $fieldRules) {
            $value = $this->data[$field] ?? null;
            
            // Разбить правила если переданы строкой
            if (is_string($fieldRules)) {
                $fieldRules = explode('|', $fieldRules);
            }
            
            foreach ($fieldRules as $rule) {
                $this->applyRule($field, $value, $rule);
                
                // Если уже есть ошибка для поля, не продолжать
                if (isset($this->errors[$field])) {
                    break;
                }
            }
            
            // Сохранить валидное значение
            if (!isset($this->errors[$field])) {
                $this->validated[$field] = $value;
            }
        }
        
        return $this;
    }
    
    private function applyRule(string $field, $value, string $rule): void {
        // Разбор параметров правила (например: "min:3" → ["min", "3"])
        $params = [];
        if (strpos($rule, ':') !== false) {
            [$rule, $paramStr] = explode(':', $rule, 2);
            $params = explode(',', $paramStr);
        }
        
        $label = $this->getLabel($field);
        
        switch ($rule) {
            case 'required':
                if ($value === null || $value === '' || $value === []) {
                    $this->errors[$field] = "Поле «$label» обязательно для заполнения";
                }
                break;
                
            case 'email':
                if ($value && filter_var($value, FILTER_VALIDATE_EMAIL) === false) {
                    $this->errors[$field] = "Поле «$label» должно быть корректным email";
                }
                break;
                
            case 'url':
                if ($value && filter_var($value, FILTER_VALIDATE_URL) === false) {
                    $this->errors[$field] = "Поле «$label» должно быть корректным URL";
                }
                break;
                
            case 'min':
                $min = (int) $params[0];
                if ($value && mb_strlen($value) < $min) {
                    $this->errors[$field] = "Поле «$label» должно быть не короче $min символов";
                }
                break;
                
            case 'max':
                $max = (int) $params[0];
                if ($value && mb_strlen($value) > $max) {
                    $this->errors[$field] = "Поле «$label» должно быть не длиннее $max символов";
                }
                break;
                
            case 'between':
                $min = (int) $params[0];
                $max = (int) $params[1];
                $length = mb_strlen($value ?? '');
                if ($value && ($length < $min || $length > $max)) {
                    $this->errors[$field] = "Поле «$label» должно быть от $min до $max символов";
                }
                break;
                
            case 'numeric':
                if ($value && !is_numeric($value)) {
                    $this->errors[$field] = "Поле «$label» должно быть числом";
                }
                break;
                
            case 'integer':
                if ($value && filter_var($value, FILTER_VALIDATE_INT) === false) {
                    $this->errors[$field] = "Поле «$label» должно быть целым числом";
                }
                break;
                
            case 'min_value':
                $min = $params[0];
                if ($value !== null && $value !== '' && $value < $min) {
                    $this->errors[$field] = "Поле «$label» должно быть не меньше $min";
                }
                break;
                
            case 'max_value':
                $max = $params[0];
                if ($value !== null && $value !== '' && $value > $max) {
                    $this->errors[$field] = "Поле «$label» должно быть не больше $max";
                }
                break;
                
            case 'in':
                if ($value && !in_array($value, $params, true)) {
                    $allowed = implode(', ', $params);
                    $this->errors[$field] = "Поле «$label» должно быть одним из: $allowed";
                }
                break;
                
            case 'regex':
                $pattern = $params[0];
                if ($value && preg_match($pattern, $value) !== 1) {
                    $this->errors[$field] = "Поле «$label» имеет неверный формат";
                }
                break;
                
            case 'confirmed':
                $confirmField = $field . '_confirmation';
                $confirmValue = $this->data[$confirmField] ?? null;
                if ($value !== $confirmValue) {
                    $this->errors[$field] = "Поле «$label» не совпадает с подтверждением";
                }
                break;
                
            case 'date':
                $format = $params[0] ?? 'Y-m-d';
                $d = DateTime::createFromFormat($format, $value ?? '');
                if ($value && (!$d || $d->format($format) !== $value)) {
                    $this->errors[$field] = "Поле «$label» должно быть датой в формате $format";
                }
                break;
                
            case 'alpha':
                if ($value && !preg_match('/^[\p{L}]+$/u', $value)) {
                    $this->errors[$field] = "Поле «$label» должно содержать только буквы";
                }
                break;
                
            case 'alpha_spaces':
                if ($value && !preg_match('/^[\p{L}\s]+$/u', $value)) {
                    $this->errors[$field] = "Поле «$label» должно содержать только буквы и пробелы";
                }
                break;
                
            case 'alpha_num':
                if ($value && !preg_match('/^[\p{L}\d]+$/u', $value)) {
                    $this->errors[$field] = "Поле «$label» должно содержать только буквы и цифры";
                }
                break;
                
            case 'phone':
                $cleaned = preg_replace('/\D/', '', $value ?? '');
                if ($value && !preg_match('/^[78]\d{10}$/', $cleaned)) {
                    $this->errors[$field] = "Поле «$label» должно быть корректным номером телефона";
                }
                break;
                
            case 'nullable':
                // Разрешить null/пустую строку, просто пропустить
                break;
        }
    }
    
    private function getLabel(string $field): string {
        // Можно добавить mapping для человекочитаемых названий
        $labels = [
            'name' => 'Имя',
            'email' => 'Email',
            'password' => 'Пароль',
            'phone' => 'Телефон',
            // ...
        ];
        
        return $labels[$field] ?? $field;
    }
    
    public function fails(): bool {
        return !empty($this->errors);
    }
    
    public function passes(): bool {
        return empty($this->errors);
    }
    
    public function errors(): array {
        return $this->errors;
    }
    
    public function firstError(): ?string {
        return $this->errors ? reset($this->errors) : null;
    }
    
    public function validated(): array {
        return $this->validated;
    }
    
    public function addError(string $field, string $message): self {
        $this->errors[$field] = $message;
        return $this;
    }
}

// Использование
$validator = new Validator($_POST);

$validator->validate([
    'name' => 'required|alpha_spaces|between:2,100',
    'email' => 'required|email|max:255',
    'age' => 'nullable|integer|min_value:1|max_value:150',
    'password' => 'required|min:8',
    'password_confirmation' => 'required',
    'role' => 'required|in:user,moderator,admin',
]);

// Проверка уникальности (отдельно)
if ($validator->passes() && !isUniqueEmail($_POST['email'])) {
    $validator->addError('email', 'Этот email уже зарегистрирован');
}

if ($validator->fails()) {
    $errors = $validator->errors();
    // Показать ошибки...
} else {
    $data = $validator->validated();
    // Сохранить данные...
}
```

### Расширенный валидатор с кастомными правилами

```php
<?php
class ExtendedValidator extends Validator {
    private static array $customRules = [];
    private static array $customMessages = [];
    
    /**
     * Добавить кастомное правило
     */
    public static function extend(string $rule, callable $callback, string $message): void {
        self::$customRules[$rule] = $callback;
        self::$customMessages[$rule] = $message;
    }
    
    /**
     * Проверить кастомные правила
     */
    protected function applyCustomRule(string $field, $value, string $rule, array $params): bool {
        if (!isset(self::$customRules[$rule])) {
            return false;
        }
        
        $callback = self::$customRules[$rule];
        $isValid = $callback($value, $params, $this->data);
        
        if (!$isValid) {
            $message = self::$customMessages[$rule];
            $message = str_replace(':field', $this->getLabel($field), $message);
            $message = str_replace(':value', $value ?? '', $message);
            
            foreach ($params as $i => $param) {
                $message = str_replace(":param$i", $param, $message);
            }
            
            $this->errors[$field] = $message;
        }
        
        return true;
    }
}

// Регистрация кастомных правил
ExtendedValidator::extend(
    'unique',
    function ($value, $params, $data) {
        [$table, $column] = $params;
        $exceptId = $params[2] ?? null;
        return isUnique($table, $column, $value, $exceptId);
    },
    'Значение поля «:field» уже существует'
);

ExtendedValidator::extend(
    'strong_password',
    function ($value) {
        return mb_strlen($value) >= 8
            && preg_match('/[a-z]/', $value)
            && preg_match('/[A-Z]/', $value)
            && preg_match('/\d/', $value)
            && preg_match('/[^a-zA-Z\d]/', $value);
    },
    'Пароль должен содержать минимум 8 символов, буквы разного регистра, цифры и спецсимволы'
);

ExtendedValidator::extend(
    'age_from_date',
    function ($value, $params) {
        $minAge = (int) $params[0];
        $date = DateTime::createFromFormat('Y-m-d', $value);
        if (!$date) return false;
        
        $now = new DateTime();
        $age = $now->diff($date)->y;
        return $age >= $minAge;
    },
    'Вам должно быть не менее :param0 лет'
);

// Использование
$validator = new ExtendedValidator($_POST);
$validator->validate([
    'email' => 'required|email|unique:users,email',
    'password' => 'required|strong_password',
    'birthdate' => 'required|date|age_from_date:18',
]);
```

---

## 5. Санитизация для вывода

### Экранирование HTML

```php
<?php
// htmlspecialchars — основная функция для защиты от XSS

$userInput = '<script>alert("XSS")</script>';

// ❌ ОПАСНО!
echo $userInput;

// ✅ БЕЗОПАСНО
echo htmlspecialchars($userInput, ENT_QUOTES, 'UTF-8');
// Выведет: &lt;script&gt;alert("XSS")&lt;/script&gt;

// Функция-хелпер (короткое имя)
function e(?string $value): string {
    return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}

// Использование в шаблонах
?>
<p>Имя: <?= e($user['name']) ?></p>
<input type="text" value="<?= e($search) ?>">
<a href="/user/<?= e($username) ?>">Профиль</a>

<?php
// Для атрибутов URL
function eUrl(?string $value): string {
    return htmlspecialchars(urlencode($value ?? ''), ENT_QUOTES, 'UTF-8');
}

// Для JavaScript строк
function eJs(?string $value): string {
    return json_encode($value ?? '', JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);
}
?>
<script>
    var userName = <?= eJs($user['name']) ?>;
</script>
```

### Что экранировать?

```
┌────────────────────────────────────────────────────────────────┐
│                    ПРАВИЛА ЭКРАНИРОВАНИЯ                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   КОНТЕКСТ                      ЧТО ИСПОЛЬЗОВАТЬ               │
│   ─────────────────────────────────────────────────────────    │
│   HTML тело                     htmlspecialchars()             │
│   HTML атрибуты                 htmlspecialchars()             │
│   URL параметры                 urlencode()                    │
│   JavaScript строки             json_encode()                  │
│   CSS значения                  Белый список                   │
│   SQL запросы                   Prepared statements            │
│                                                                │
│   ПРАВИЛО: Экранируй в момент вывода, не при получении!       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Контекстно-зависимое экранирование

```php
<?php
class Escape {
    /**
     * Для HTML тела и атрибутов
     */
    public static function html(?string $value): string {
        return htmlspecialchars($value ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
    
    /**
     * Для URL параметров
     */
    public static function url(?string $value): string {
        return rawurlencode($value ?? '');
    }
    
    /**
     * Для JavaScript строк
     */
    public static function js(?string $value): string {
        return json_encode($value ?? '', JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);
    }
    
    /**
     * Для CSS значений (очень ограничено!)
     */
    public static function css(?string $value): string {
        // Только безопасные символы
        return preg_replace('/[^a-zA-Z0-9_\-]/', '', $value ?? '');
    }
    
    /**
     * Для href/src атрибутов (проверка схемы)
     */
    public static function href(?string $url): string {
        if ($url === null || $url === '') {
            return '';
        }
        
        // Разрешённые схемы
        $allowedSchemes = ['http', 'https', 'mailto', 'tel'];
        
        // Проверить схему
        if (preg_match('/^([a-z][a-z0-9+.-]*):/', strtolower($url), $matches)) {
            if (!in_array($matches[1], $allowedSchemes)) {
                return '';  // Запрещённая схема (javascript:, data: и т.д.)
            }
        }
        
        return self::html($url);
    }
}

// Использование
?>
<p><?= Escape::html($comment) ?></p>
<a href="<?= Escape::href($link) ?>">Ссылка</a>
<a href="/search?q=<?= Escape::url($query) ?>">Поиск</a>
<script>var data = <?= Escape::js($userData) ?>;</script>
<div style="color: <?= Escape::css($color) ?>">Текст</div>
```

---

## 6. Обработка форм на практике

### Полный пример: форма регистрации

```php
<?php
// register.php

session_start();

// CSRF токен
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Начальные значения
$errors = [];
$old = [
    'name' => '',
    'email' => '',
    'phone' => '',
    'birthdate' => '',
    'agree' => false,
];

// Обработка формы
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Проверка CSRF
    if (!hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'] ?? '')) {
        die('Ошибка безопасности');
    }
    
    // Сохранить введённые данные
    $old = [
        'name' => trim($_POST['name'] ?? ''),
        'email' => trim($_POST['email'] ?? ''),
        'phone' => trim($_POST['phone'] ?? ''),
        'birthdate' => trim($_POST['birthdate'] ?? ''),
        'agree' => !empty($_POST['agree']),
    ];
    
    // Валидация
    $validator = new Validator($_POST);
    $validator->validate([
        'name' => 'required|alpha_spaces|between:2,100',
        'email' => 'required|email|max:255',
        'phone' => 'required|phone',
        'birthdate' => 'required|date:Y-m-d',
        'password' => 'required|min:8',
        'password_confirmation' => 'required',
        'agree' => 'required',
    ]);
    
    // Подтверждение пароля
    if ($_POST['password'] !== $_POST['password_confirmation']) {
        $validator->addError('password_confirmation', 'Пароли не совпадают');
    }
    
    // Проверка возраста (18+)
    if (!empty($old['birthdate'])) {
        $birthDate = new DateTime($old['birthdate']);
        $now = new DateTime();
        $age = $now->diff($birthDate)->y;
        
        if ($age < 18) {
            $validator->addError('birthdate', 'Вам должно быть не менее 18 лет');
        }
    }
    
    // Проверка уникальности email
    if ($validator->passes()) {
        // Здесь запрос к БД
        // if (emailExists($old['email'])) {
        //     $validator->addError('email', 'Этот email уже зарегистрирован');
        // }
    }
    
    if ($validator->fails()) {
        $errors = $validator->errors();
    } else {
        // Регистрация пользователя
        $passwordHash = password_hash($_POST['password'], PASSWORD_DEFAULT);
        
        // Сохранение в БД...
        // createUser($old['name'], $old['email'], $passwordHash, ...);
        
        // Успех — редирект
        $_SESSION['flash_success'] = 'Регистрация успешна! Войдите в систему.';
        header('Location: /login.php');
        exit;
    }
}

// Функция для вывода ошибки поля
function fieldError(string $field, array $errors): string {
    if (isset($errors[$field])) {
        return '<span class="error">' . htmlspecialchars($errors[$field]) . '</span>';
    }
    return '';
}

// Функция для класса поля с ошибкой
function fieldClass(string $field, array $errors): string {
    return isset($errors[$field]) ? 'has-error' : '';
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Регистрация</title>
    <style>
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; }
        .form-group input { width: 100%; padding: 8px; box-sizing: border-box; }
        .form-group.has-error input { border-color: #dc3545; }
        .error { color: #dc3545; font-size: 14px; }
        .btn { padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Регистрация</h1>
    
    <?php if (!empty($errors)): ?>
        <div class="alert alert-danger">
            <p>Пожалуйста, исправьте ошибки в форме.</p>
        </div>
    <?php endif; ?>
    
    <form method="POST" action="">
        <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
        
        <div class="form-group <?= fieldClass('name', $errors) ?>">
            <label for="name">Имя *</label>
            <input type="text" id="name" name="name" value="<?= htmlspecialchars($old['name']) ?>" required>
            <?= fieldError('name', $errors) ?>
        </div>
        
        <div class="form-group <?= fieldClass('email', $errors) ?>">
            <label for="email">Email *</label>
            <input type="email" id="email" name="email" value="<?= htmlspecialchars($old['email']) ?>" required>
            <?= fieldError('email', $errors) ?>
        </div>
        
        <div class="form-group <?= fieldClass('phone', $errors) ?>">
            <label for="phone">Телефон *</label>
            <input type="tel" id="phone" name="phone" value="<?= htmlspecialchars($old['phone']) ?>" 
                   placeholder="+7 (999) 123-45-67" required>
            <?= fieldError('phone', $errors) ?>
        </div>
        
        <div class="form-group <?= fieldClass('birthdate', $errors) ?>">
            <label for="birthdate">Дата рождения *</label>
            <input type="date" id="birthdate" name="birthdate" value="<?= htmlspecialchars($old['birthdate']) ?>" required>
            <?= fieldError('birthdate', $errors) ?>
        </div>
        
        <div class="form-group <?= fieldClass('password', $errors) ?>">
            <label for="password">Пароль * (минимум 8 символов)</label>
            <input type="password" id="password" name="password" required minlength="8">
            <?= fieldError('password', $errors) ?>
        </div>
        
        <div class="form-group <?= fieldClass('password_confirmation', $errors) ?>">
            <label for="password_confirmation">Подтверждение пароля *</label>
            <input type="password" id="password_confirmation" name="password_confirmation" required>
            <?= fieldError('password_confirmation', $errors) ?>
        </div>
        
        <div class="form-group <?= fieldClass('agree', $errors) ?>">
            <label>
                <input type="checkbox" name="agree" value="1" <?= $old['agree'] ? 'checked' : '' ?>>
                Я согласен с <a href="/terms">условиями использования</a> *
            </label>
            <?= fieldError('agree', $errors) ?>
        </div>
        
        <button type="submit" class="btn">Зарегистрироваться</button>
    </form>
</body>
</html>
```

### Обработка множественных значений

```php
<?php
// Множественный выбор (select multiple, checkbox[])

// HTML форма
?>
<form method="POST">
    <!-- Multiple select -->
    <select name="categories[]" multiple>
        <option value="1">Категория 1</option>
        <option value="2">Категория 2</option>
        <option value="3">Категория 3</option>
    </select>
    
    <!-- Checkbox группа -->
    <label><input type="checkbox" name="tags[]" value="php"> PHP</label>
    <label><input type="checkbox" name="tags[]" value="js"> JavaScript</label>
    <label><input type="checkbox" name="tags[]" value="css"> CSS</label>
</form>

<?php
// Обработка
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Получаем массивы
    $categories = $_POST['categories'] ?? [];
    $tags = $_POST['tags'] ?? [];
    
    // Убедиться что это массивы
    if (!is_array($categories)) {
        $categories = [];
    }
    if (!is_array($tags)) {
        $tags = [];
    }
    
    // Валидация каждого элемента
    $allowedCategories = [1, 2, 3, 4, 5];
    $categories = array_filter($categories, function($cat) use ($allowedCategories) {
        return in_array((int) $cat, $allowedCategories, true);
    });
    $categories = array_map('intval', $categories);
    
    $allowedTags = ['php', 'js', 'css', 'html'];
    $tags = array_filter($tags, function($tag) use ($allowedTags) {
        return in_array($tag, $allowedTags, true);
    });
    
    // Теперь $categories и $tags содержат только валидные значения
}

// Для вывода с сохранением выбора
function isSelected($value, array $selected): string {
    return in_array($value, $selected) ? 'selected' : '';
}

function isChecked($value, array $checked): string {
    return in_array($value, $checked) ? 'checked' : '';
}
?>
<select name="categories[]" multiple>
    <option value="1" <?= isSelected(1, $categories) ?>>Категория 1</option>
    <option value="2" <?= isSelected(2, $categories) ?>>Категория 2</option>
</select>

<label><input type="checkbox" name="tags[]" value="php" <?= isChecked('php', $tags) ?>> PHP</label>
```

### Валидация файлов

```php
<?php
class FileValidator {
    private array $errors = [];
    
    public function validate(
        array $file,
        array $allowedTypes = [],
        int $maxSize = 5 * 1024 * 1024,  // 5 MB
        array $allowedExtensions = []
    ): bool {
        $this->errors = [];
        
        // Проверка ошибки загрузки
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $this->errors[] = $this->getUploadError($file['error']);
            return false;
        }
        
        // Проверка размера
        if ($file['size'] > $maxSize) {
            $this->errors[] = 'Файл слишком большой. Максимум: ' . $this->formatSize($maxSize);
            return false;
        }
        
        if ($file['size'] === 0) {
            $this->errors[] = 'Файл пустой';
            return false;
        }
        
        // Проверка расширения
        if (!empty($allowedExtensions)) {
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, $allowedExtensions, true)) {
                $this->errors[] = 'Недопустимое расширение. Разрешены: ' . implode(', ', $allowedExtensions);
                return false;
            }
        }
        
        // Проверка MIME типа
        if (!empty($allowedTypes)) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);
            
            if (!in_array($mimeType, $allowedTypes, true)) {
                $this->errors[] = 'Недопустимый тип файла';
                return false;
            }
        }
        
        return true;
    }
    
    public function validateImage(array $file, int $maxWidth = 0, int $maxHeight = 0): bool {
        // Базовая валидация
        if (!$this->validate($file, 
            ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            10 * 1024 * 1024,
            ['jpg', 'jpeg', 'png', 'gif', 'webp']
        )) {
            return false;
        }
        
        // Проверка что это реальное изображение
        $imageInfo = @getimagesize($file['tmp_name']);
        if ($imageInfo === false) {
            $this->errors[] = 'Файл не является изображением';
            return false;
        }
        
        // Проверка размеров
        [$width, $height] = $imageInfo;
        
        if ($maxWidth > 0 && $width > $maxWidth) {
            $this->errors[] = "Ширина изображения не должна превышать {$maxWidth}px";
            return false;
        }
        
        if ($maxHeight > 0 && $height > $maxHeight) {
            $this->errors[] = "Высота изображения не должна превышать {$maxHeight}px";
            return false;
        }
        
        return true;
    }
    
    public function errors(): array {
        return $this->errors;
    }
    
    public function firstError(): ?string {
        return $this->errors[0] ?? null;
    }
    
    private function getUploadError(int $code): string {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE => 'Файл превышает максимальный размер',
            UPLOAD_ERR_FORM_SIZE => 'Файл превышает максимальный размер',
            UPLOAD_ERR_PARTIAL => 'Файл загружен частично',
            UPLOAD_ERR_NO_FILE => 'Файл не выбран',
            UPLOAD_ERR_NO_TMP_DIR => 'Ошибка сервера',
            UPLOAD_ERR_CANT_WRITE => 'Ошибка записи',
            UPLOAD_ERR_EXTENSION => 'Загрузка запрещена',
            default => 'Неизвестная ошибка',
        };
    }
    
    private function formatSize(int $bytes): string {
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }
        return round($bytes, 2) . ' ' . $units[$i];
    }
}

// Использование
$fileValidator = new FileValidator();

if (isset($_FILES['avatar'])) {
    if ($fileValidator->validateImage($_FILES['avatar'], 1000, 1000)) {
        // Файл валидный, можно сохранять
        move_uploaded_file($_FILES['avatar']['tmp_name'], 'uploads/' . uniqid() . '.jpg');
    } else {
        $errors['avatar'] = $fileValidator->firstError();
    }
}
```

---

## 7. AJAX формы

### Отправка через Fetch API

```html
<!-- HTML форма -->
<form id="contactForm">
    <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
    
    <div class="form-group">
        <label for="name">Имя</label>
        <input type="text" id="name" name="name" required>
        <span class="error" data-field="name"></span>
    </div>
    
    <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required>
        <span class="error" data-field="email"></span>
    </div>
    
    <div class="form-group">
        <label for="message">Сообщение</label>
        <textarea id="message" name="message" required></textarea>
        <span class="error" data-field="message"></span>
    </div>
    
    <button type="submit">Отправить</button>
    <div id="formResult"></div>
</form>

<script>
document.getElementById('contactForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Очистить предыдущие ошибки
    document.querySelectorAll('.error').forEach(el => el.textContent = '');
    document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
    
    const formData = new FormData(this);
    
    try {
        const response = await fetch('/api/contact.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('formResult').innerHTML = 
                '<div class="success">' + result.message + '</div>';
            this.reset();
        } else {
            // Показать ошибки
            if (result.errors) {
                for (const [field, message] of Object.entries(result.errors)) {
                    const errorEl = document.querySelector(`[data-field="${field}"]`);
                    const inputEl = document.getElementById(field);
                    
                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                    if (inputEl) {
                        inputEl.parentElement.classList.add('has-error');
                    }
                }
            }
        }
    } catch (error) {
        document.getElementById('formResult').innerHTML = 
            '<div class="error">Ошибка отправки. Попробуйте позже.</div>';
    }
});
</script>
```

### PHP обработчик для AJAX

```php
<?php
// api/contact.php

session_start();

header('Content-Type: application/json; charset=UTF-8');

// Функция ответа
function jsonResponse(array $data): never {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Проверка метода
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(['success' => false, 'message' => 'Method not allowed']);
}

// CSRF проверка
if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'] ?? '', $_POST['csrf_token'])) {
    http_response_code(403);
    jsonResponse(['success' => false, 'message' => 'Invalid CSRF token']);
}

// Валидация
$validator = new Validator($_POST);
$validator->validate([
    'name' => 'required|alpha_spaces|between:2,100',
    'email' => 'required|email',
    'message' => 'required|min:10|max:5000',
]);

if ($validator->fails()) {
    http_response_code(422);
    jsonResponse([
        'success' => false,
        'errors' => $validator->errors(),
    ]);
}

// Обработка
$data = $validator->validated();

// Сохранение, отправка email и т.д.
// ...

// Успех
jsonResponse([
    'success' => true,
    'message' => 'Сообщение отправлено! Мы свяжемся с вами в ближайшее время.',
]);
```

---

## 8. Безопасность форм

### Защита от спама (Honeypot)

```php
<?php
// Honeypot — скрытое поле, которое боты заполняют, а люди — нет
?>
<form method="POST">
    <!-- Скрытое поле-ловушка -->
    <div style="position: absolute; left: -9999px;">
        <label for="website">Website (leave empty)</label>
        <input type="text" name="website" id="website" tabindex="-1" autocomplete="off">
    </div>
    
    <!-- Реальные поля -->
    <input type="text" name="name">
    <input type="email" name="email">
    <textarea name="message"></textarea>
    <button type="submit">Отправить</button>
</form>

<?php
// Обработка
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Если honeypot заполнен — это бот
    if (!empty($_POST['website'])) {
        // Притвориться что всё ок, но ничего не делать
        $_SESSION['flash_success'] = 'Спасибо за сообщение!';
        header('Location: /contact.php');
        exit;
    }
    
    // Продолжить обработку...
}
```

### Защита от многократной отправки

```php
<?php
// Токен одноразового использования

function generateFormToken(): string {
    $token = bin2hex(random_bytes(32));
    $_SESSION['form_tokens'][$token] = time();
    return $token;
}

function validateFormToken(string $token): bool {
    if (!isset($_SESSION['form_tokens'][$token])) {
        return false;
    }
    
    // Удалить использованный токен
    unset($_SESSION['form_tokens'][$token]);
    
    // Очистить старые токены (старше 1 часа)
    $_SESSION['form_tokens'] = array_filter(
        $_SESSION['form_tokens'] ?? [],
        fn($time) => $time > time() - 3600
    );
    
    return true;
}

// В форме
$formToken = generateFormToken();
?>
<form method="POST">
    <input type="hidden" name="form_token" value="<?= $formToken ?>">
    <!-- остальные поля -->
</form>

<?php
// При обработке
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!validateFormToken($_POST['form_token'] ?? '')) {
        die('Форма уже была отправлена. Обновите страницу.');
    }
    
    // Обработка...
}
```

### Rate Limiting для форм

```php
<?php
class FormRateLimiter {
    private string $key;
    private int $maxAttempts;
    private int $decaySeconds;
    
    public function __construct(string $formName, int $maxAttempts = 5, int $decaySeconds = 60) {
        $this->key = 'form_limit_' . $formName . '_' . md5($_SERVER['REMOTE_ADDR']);
        $this->maxAttempts = $maxAttempts;
        $this->decaySeconds = $decaySeconds;
    }
    
    public function attempt(): bool {
        if (!isset($_SESSION[$this->key])) {
            $_SESSION[$this->key] = [
                'attempts' => 0,
                'reset_at' => time() + $this->decaySeconds,
            ];
        }
        
        // Сброс если время истекло
        if ($_SESSION[$this->key]['reset_at'] <= time()) {
            $_SESSION[$this->key] = [
                'attempts' => 0,
                'reset_at' => time() + $this->decaySeconds,
            ];
        }
        
        if ($_SESSION[$this->key]['attempts'] >= $this->maxAttempts) {
            return false;
        }
        
        $_SESSION[$this->key]['attempts']++;
        return true;
    }
    
    public function remaining(): int {
        return max(0, $this->maxAttempts - ($_SESSION[$this->key]['attempts'] ?? 0));
    }
    
    public function retryAfter(): int {
        return max(0, ($_SESSION[$this->key]['reset_at'] ?? 0) - time());
    }
}

// Использование
session_start();

$limiter = new FormRateLimiter('contact', 3, 300);  // 3 попытки за 5 минут

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!$limiter->attempt()) {
        $waitSeconds = $limiter->retryAfter();
        die("Слишком много попыток. Подождите " . ceil($waitSeconds / 60) . " мин.");
    }
    
    // Обработка формы...
}
```

---

## 9. Практические примеры

### Пример 1: Форма обратной связи с файлом

```php
<?php
session_start();

// CSRF
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$errors = [];
$success = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // CSRF проверка
    if (!hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'] ?? '')) {
        die('Ошибка безопасности');
    }
    
    // Валидация текстовых полей
    $validator = new Validator($_POST);
    $validator->validate([
        'name' => 'required|alpha_spaces|between:2,100',
        'email' => 'required|email',
        'subject' => 'required|between:5,200',
        'message' => 'required|between:20,5000',
    ]);
    
    // Валидация файла (если загружен)
    $attachment = null;
    if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] !== UPLOAD_ERR_NO_FILE) {
        $fileValidator = new FileValidator();
        
        if (!$fileValidator->validate(
            $_FILES['attachment'],
            ['application/pdf', 'image/jpeg', 'image/png'],
            2 * 1024 * 1024,  // 2 MB
            ['pdf', 'jpg', 'jpeg', 'png']
        )) {
            $validator->addError('attachment', $fileValidator->firstError());
        } else {
            $attachment = $_FILES['attachment'];
        }
    }
    
    if ($validator->fails()) {
        $errors = $validator->errors();
    } else {
        // Сохранение файла
        $attachmentPath = null;
        if ($attachment) {
            $ext = pathinfo($attachment['name'], PATHINFO_EXTENSION);
            $filename = uniqid('attach_') . '.' . $ext;
            $attachmentPath = 'uploads/attachments/' . $filename;
            move_uploaded_file($attachment['tmp_name'], $attachmentPath);
        }
        
        // Отправка email или сохранение в БД
        $data = $validator->validated();
        // sendContactEmail($data, $attachmentPath);
        // saveContactMessage($data, $attachmentPath);
        
        $success = true;
        
        // Регенерация CSRF токена
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Обратная связь</title>
</head>
<body>
    <h1>Обратная связь</h1>
    
    <?php if ($success): ?>
        <div class="success">Сообщение отправлено!</div>
    <?php else: ?>
        <form method="POST" enctype="multipart/form-data">
            <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
            
            <div>
                <label>Имя *</label>
                <input type="text" name="name" value="<?= htmlspecialchars($_POST['name'] ?? '') ?>">
                <?php if (isset($errors['name'])): ?>
                    <span class="error"><?= htmlspecialchars($errors['name']) ?></span>
                <?php endif; ?>
            </div>
            
            <div>
                <label>Email *</label>
                <input type="email" name="email" value="<?= htmlspecialchars($_POST['email'] ?? '') ?>">
                <?php if (isset($errors['email'])): ?>
                    <span class="error"><?= htmlspecialchars($errors['email']) ?></span>
                <?php endif; ?>
            </div>
            
            <div>
                <label>Тема *</label>
                <input type="text" name="subject" value="<?= htmlspecialchars($_POST['subject'] ?? '') ?>">
                <?php if (isset($errors['subject'])): ?>
                    <span class="error"><?= htmlspecialchars($errors['subject']) ?></span>
                <?php endif; ?>
            </div>
            
            <div>
                <label>Сообщение *</label>
                <textarea name="message"><?= htmlspecialchars($_POST['message'] ?? '') ?></textarea>
                <?php if (isset($errors['message'])): ?>
                    <span class="error"><?= htmlspecialchars($errors['message']) ?></span>
                <?php endif; ?>
            </div>
            
            <div>
                <label>Прикрепить файл (PDF, JPG, PNG до 2MB)</label>
                <input type="file" name="attachment" accept=".pdf,.jpg,.jpeg,.png">
                <?php if (isset($errors['attachment'])): ?>
                    <span class="error"><?= htmlspecialchars($errors['attachment']) ?></span>
                <?php endif; ?>
            </div>
            
            <button type="submit">Отправить</button>
        </form>
    <?php endif; ?>
</body>
</html>
```

### Пример 2: Форма редактирования профиля

```php
<?php
session_start();
requireLogin();  // Проверка авторизации

$user = getCurrentUser();  // Получить данные из БД

$errors = [];
$success = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // CSRF
    if (!hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'] ?? '')) {
        die('Ошибка безопасности');
    }
    
    // Валидация
    $validator = new Validator($_POST);
    $validator->validate([
        'name' => 'required|alpha_spaces|between:2,100',
        'email' => 'required|email',
        'phone' => 'nullable|phone',
        'bio' => 'nullable|max:500',
    ]);
    
    // Проверка уникальности email (кроме текущего пользователя)
    if ($validator->passes()) {
        $email = trim($_POST['email']);
        if ($email !== $user['email'] && emailExists($email)) {
            $validator->addError('email', 'Этот email уже используется');
        }
    }
    
    // Проверка текущего пароля если меняется
    if (!empty($_POST['new_password'])) {
        if (empty($_POST['current_password'])) {
            $validator->addError('current_password', 'Введите текущий пароль');
        } elseif (!password_verify($_POST['current_password'], $user['password_hash'])) {
            $validator->addError('current_password', 'Неверный текущий пароль');
        }
        
        if (mb_strlen($_POST['new_password']) < 8) {
            $validator->addError('new_password', 'Пароль должен быть не менее 8 символов');
        }
        
        if ($_POST['new_password'] !== $_POST['new_password_confirmation']) {
            $validator->addError('new_password_confirmation', 'Пароли не совпадают');
        }
    }
    
    // Аватар
    if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] !== UPLOAD_ERR_NO_FILE) {
        $fileValidator = new FileValidator();
        if (!$fileValidator->validateImage($_FILES['avatar'], 500, 500)) {
            $validator->addError('avatar', $fileValidator->firstError());
        }
    }
    
    if ($validator->fails()) {
        $errors = $validator->errors();
    } else {
        // Обновление данных
        $updateData = [
            'name' => trim($_POST['name']),
            'email' => trim($_POST['email']),
            'phone' => trim($_POST['phone']) ?: null,
            'bio' => trim($_POST['bio']) ?: null,
        ];
        
        // Обновление пароля
        if (!empty($_POST['new_password'])) {
            $updateData['password_hash'] = password_hash($_POST['new_password'], PASSWORD_DEFAULT);
        }
        
        // Загрузка аватара
        if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] === UPLOAD_ERR_OK) {
            $ext = pathinfo($_FILES['avatar']['name'], PATHINFO_EXTENSION);
            $filename = 'avatar_' . $user['id'] . '_' . time() . '.' . $ext;
            
            // Удалить старый аватар
            if ($user['avatar']) {
                @unlink('uploads/avatars/' . $user['avatar']);
            }
            
            move_uploaded_file($_FILES['avatar']['tmp_name'], 'uploads/avatars/' . $filename);
            $updateData['avatar'] = $filename;
        }
        
        // Сохранение в БД
        updateUser($user['id'], $updateData);
        
        $_SESSION['flash_success'] = 'Профиль обновлён';
        header('Location: /profile/edit');
        exit;
    }
}

// Текущие значения
$current = [
    'name' => $_POST['name'] ?? $user['name'],
    'email' => $_POST['email'] ?? $user['email'],
    'phone' => $_POST['phone'] ?? $user['phone'],
    'bio' => $_POST['bio'] ?? $user['bio'],
];
?>
<!-- Форма редактирования профиля -->
```

---

## 10. Упражнения

### Упражнение 1: Простая валидация (15 минут)

```php
<?php
// Создай функции валидации:
// 1. validateEmail($email) — проверка email
// 2. validatePhone($phone) — российский номер (+7 или 8, 10 цифр)
// 3. validatePassword($password) — минимум 8 символов, буквы и цифры
// 4. validateDate($date, $format) — валидная дата в указанном формате
// 5. validateAge($birthDate, $minAge) — возраст не менее указанного

// Каждая функция возвращает true или сообщение об ошибке
```

### Упражнение 2: Класс формы (25 минут)

```php
<?php
// Создай класс Form для удобной работы с формами:
// - Генерация CSRF токена и поля
// - Методы для создания полей (text, email, textarea, select, checkbox)
// - Автоматическое заполнение старых значений
// - Вывод ошибок под полями

// Пример использования:
// $form = new Form($_POST, $errors);
// echo $form->text('name', 'Имя');
// echo $form->email('email', 'Email');
// echo $form->select('country', 'Страна', ['ru' => 'Россия', 'us' => 'США']);
// echo $form->submit('Отправить');
```

### Упражнение 3: Валидатор с правилами (30 минут)

```php
<?php
// Расширь класс Validator добавив правила:
// - 'different:field' — должно отличаться от другого поля
// - 'same:field' — должно совпадать с другим полем
// - 'before:date' — дата должна быть раньше указанной
// - 'after:date' — дата должна быть позже указанной
// - 'digits:length' — строка из точного количества цифр
// - 'array' — должен быть массивом
// - 'array_min:n' — массив минимум n элементов
// - 'file' — должен быть загруженным файлом
// - 'image' — должен быть изображением
```

### Упражнение 4: Форма заказа (40 минут)

```php
<?php
// Создай форму оформления заказа:
// - Контактные данные (имя, телефон, email)
// - Адрес доставки (город из списка, улица, дом, квартира, индекс)
// - Способ доставки (radio: курьер, самовывоз, почта)
// - Способ оплаты (radio: картой, наличными, при получении)
// - Комментарий (необязательно)
// - Согласие с условиями (checkbox, обязательно)

// Требования:
// - CSRF защита
// - Полная валидация всех полей
// - Сохранение введённых данных при ошибке
// - Зависимая валидация (индекс обязателен только для почты)
// - PRG паттерн после успешной отправки
```

---

## 11. Вопросы для самопроверки

1. **Чем отличается фильтрация от валидации?**

2. **Почему нельзя использовать `addslashes()` для защиты от SQL-инъекций?**

3. **В какой момент нужно экранировать данные — при получении или при выводе?**

4. **Что такое CSRF и как от него защититься?**

5. **Зачем нужен honeypot и как он работает?**

6. **Почему нельзя доверять `$_FILES['type']`?**

7. **Что делает флаг `FILTER_NULL_ON_FAILURE`?**

8. **Как валидировать массив значений (multiple select, checkbox group)?**

---

## 12. Частые ошибки

### Ошибка 1: Валидация без фильтрации

```php
<?php
// ❌ Валидируем "грязные" данные
if (strlen($_POST['name']) > 100) {
    $errors[] = 'Имя слишком длинное';
}

// ✅ Сначала фильтрация, потом валидация
$name = trim($_POST['name'] ?? '');
if (mb_strlen($name) > 100) {
    $errors[] = 'Имя слишком длинное';
}
```

### Ошибка 2: Экранирование при получении

```php
<?php
// ❌ Экранирование при получении — плохо!
$name = htmlspecialchars($_POST['name']);
// Теперь в БД будет "Иван &amp; Мария" вместо "Иван & Мария"

// ✅ Экранируй только при выводе
$name = trim($_POST['name']);
// В БД: "Иван & Мария"
// При выводе: <?= htmlspecialchars($name) ?>
```

### Ошибка 3: Отсутствие проверки типа

```php
<?php
// ❌ Ожидаем строку, но может прийти массив!
$search = $_GET['q'];  // ?q[]=test → массив!
echo "Поиск: " . htmlspecialchars($search);  // Notice: Array to string

// ✅ Проверяем тип
$search = $_GET['q'] ?? '';
if (!is_string($search)) {
    $search = '';
}
$search = trim($search);
```

### Ошибка 4: Доверие клиентской валидации

```php
<?php
// ❌ Полагаться только на HTML5 валидацию
// <input type="email" required> — можно обойти!

// ✅ Всегда валидировать на сервере
$email = filter_var($_POST['email'], FILTER_VALIDATE_EMAIL);
if ($email === false) {
    $errors['email'] = 'Некорректный email';
}
```

### Ошибка 5: Нет проверки на пустоту перед валидацией

```php
<?php
// ❌ filter_var вернёт false для пустой строки
$email = filter_var($_POST['email'], FILTER_VALIDATE_EMAIL);
if ($email === false) {
    $errors[] = 'Некорректный email';  // Сработает даже если поле пустое
}

// ✅ Сначала проверяем обязательность
$email = trim($_POST['email'] ?? '');
if ($email === '') {
    $errors[] = 'Email обязателен';
} elseif (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    $errors[] = 'Некорректный email';
}
```

---

## Резюме главы

```
┌────────────────────────────────────────────────────────────────┐
│                      ЗАПОМНИ ГЛАВНОЕ                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ТРИ ЭТАПА ОБРАБОТКИ                                           │
│  1. Фильтрация — привести к нужному формату                   │
│  2. Валидация — проверить на соответствие правилам            │
│  3. Санитизация — подготовить для безопасного использования   │
│                                                                │
│  ФИЛЬТРАЦИЯ                                                    │
│  • trim() — убрать пробелы                                    │
│  • (int), (float) — приведение типов                          │
│  • filter_var($val, FILTER_SANITIZE_*)                        │
│  • preg_replace() — удаление лишних символов                  │
│                                                                │
│  ВАЛИДАЦИЯ                                                     │
│  • filter_var($val, FILTER_VALIDATE_*)                        │
│  • Регулярные выражения для сложных форматов                  │
│  • Проверка диапазонов, длины, формата                        │
│  • Проверка уникальности в БД                                 │
│                                                                │
│  САНИТИЗАЦИЯ                                                   │
│  • htmlspecialchars() — для HTML вывода                       │
│  • urlencode() — для URL параметров                           │
│  • json_encode() — для JavaScript                             │
│  • Prepared statements — для SQL                              │
│                                                                │
│  БЕЗОПАСНОСТЬ                                                  │
│  • CSRF токены в каждой форме                                 │
│  • Honeypot против ботов                                      │
│  • Rate limiting против перебора                              │
│  • Экранирование при ВЫВОДЕ, не при получении                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

**Следующая глава:** `Глава 2.3: Базы данных и PDO — подключение, запросы, prepared statements, транзакции`
