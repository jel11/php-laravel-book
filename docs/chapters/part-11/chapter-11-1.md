# Глава 11.1: Введение в тестирование — зачем тесты, виды тестов, PHPUnit

## 🎯 Цели главы

После изучения этой главы ты сможешь:
- Понимать, зачем нужны автоматизированные тесты
- Различать виды тестов и знать, когда какие применять
- Устанавливать и настраивать PHPUnit
- Писать свои первые юнит-тесты
- Запускать тесты и читать результаты

---

## 📖 Теория

### Почему тесты критически важны

Представь: ты добавил новую фичу в свой мессенджер. Все работает отлично. Через неделю фиксишь баг в системе авторизации и... внезапно перестала работать отправка сообщений. Ты об этом узнаешь только когда пользователь написал гневный отзыв.

**Без тестов:**
```
Код → Ручная проверка → Деплой → 🔥 Что-то сломалось в production
```

**С тестами:**
```
Код → Автоматические тесты → ❌ Тесты упали → Фикс → ✅ Все зелено → Деплой
```

### Реальные преимущества тестов

**1. Уверенность в изменениях**
```php
// Ты меняешь calculateDiscount()
// Тесты проверят, что ничего не сломалось

public function test_discount_calculation()
{
    $order = new Order(['total' => 1000]);
    $this->assertEquals(900, $order->calculateDiscount(10));
}
```

**2. Живая документация**
```php
// Тест показывает КАК должен работать код
public function test_user_can_send_message_only_to_friends()
{
    $user = User::factory()->create();
    $stranger = User::factory()->create();
    
    $result = $user->sendMessage($stranger, 'Hello');
    
    $this->assertFalse($result);
    $this->assertDatabaseMissing('messages', [
        'sender_id' => $user->id,
        'receiver_id' => $stranger->id
    ]);
}
```

**3. Быстрая обратная связь**
Вместо 5 минут ручного кликанья — 2 секунды автотестов.

**4. Рефакторинг без страха**
```php
// Хочешь переписать весь метод? Тесты скажут, если что-то сломалось
// БЫЛО:
public function calculateTotal() {
    return array_sum($this->items) + $this->tax;
}

// СТАЛО:
public function calculateTotal() {
    return collect($this->items)->sum() + $this->getTax();
}

// Тесты остались те же — если проходят, рефакторинг успешен
```

### Когда тесты НЕ нужны (да, бывает)

- **Прототипы** — код живет 2 дня, тесты дольше писать
- **Скрипты-однодневки** — парсер, который запустишь раз
- **Очевидный код** — геттер `getName()` тестировать смысла нет

Но как только проект живет дольше недели — тесты окупаются.

---

## 🔍 Виды тестов (Пирамида тестирования)

```
        /\
       /  \  E2E Tests (End-to-End)
      /____\  Мало, медленные, дорогие
     /      \
    / Integr \ Integration Tests
   /  ation   \ Средне
  /____________\
 /              \
/   Unit Tests   \ Много, быстрые, дешевые
/__________________\
```

### 1. Unit-тесты (юнит-тесты)

**Что:** Тестируют отдельные функции/методы изолированно.

**Пример:**
```php
class Calculator
{
    public function add($a, $b)
    {
        return $a + $b;
    }
}

// ТЕСТ
class CalculatorTest extends TestCase
{
    public function test_add_two_numbers()
    {
        $calc = new Calculator();
        $result = $calc->add(2, 3);
        
        $this->assertEquals(5, $result);
    }
}
```

**Характеристики:**
- ⚡ Очень быстрые (миллисекунды)
- 🎯 Тестируют одну вещь
- 🔒 Не обращаются к БД/файлам/сети
- 📦 Используют моки для зависимостей

### 2. Integration Tests (интеграционные)

**Что:** Проверяют взаимодействие нескольких компонентов.

**Пример:**
```php
// Проверяем: контроллер → сервис → репозиторий → БД
public function test_user_registration_flow()
{
    $data = [
        'email' => 'test@example.com',
        'password' => 'secret123'
    ];
    
    $response = $this->post('/register', $data);
    
    $response->assertStatus(201);
    $this->assertDatabaseHas('users', [
        'email' => 'test@example.com'
    ]);
}
```

**Характеристики:**
- 🐢 Медленнее юнит-тестов (секунды)
- 🔗 Проверяют связи между компонентами
- 💾 Могут использовать реальную БД (или тестовую)

### 3. E2E Tests (сквозные тесты)

**Что:** Симулируют реального пользователя в браузере.

**Пример (Laravel Dusk):**
```php
public function test_user_can_send_message()
{
    $this->browse(function (Browser $browser) {
        $browser->visit('/login')
                ->type('email', 'user@test.com')
                ->type('password', 'password')
                ->press('Login')
                ->waitForText('Welcome')
                ->visit('/chat/1')
                ->type('message', 'Hello!')
                ->press('Send')
                ->waitForText('Hello!');
    });
}
```

**Характеристики:**
- 🐌 Очень медленные (минуты)
- 💰 Сложные в поддержке
- 🎭 Проверяют весь стек (фронтенд + бэкенд)

### Правило распределения

```
70% — Unit-тесты
20% — Integration-тесты
10% — E2E-тесты
```

---

## ⚙️ PHPUnit — установка и настройка

### Установка через Composer

```bash
composer require --dev phpunit/phpunit
```

**Проверка:**
```bash
vendor/bin/phpunit --version
# PHPUnit 10.5.0 by Sebastian Bergmann and contributors.
```

### Структура проекта с тестами

```
project/
├── src/
│   ├── Calculator.php
│   └── User.php
├── tests/
│   ├── Unit/
│   │   ├── CalculatorTest.php
│   │   └── UserTest.php
│   └── Integration/
│       └── UserRegistrationTest.php
├── vendor/
├── composer.json
└── phpunit.xml
```

### Конфигурация phpunit.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true">
    
    <testsuites>
        <testsuite name="Unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Integration">
            <directory>tests/Integration</directory>
        </testsuite>
    </testsuites>
    
    <source>
        <include>
            <directory>src</directory>
        </include>
    </source>
</phpunit>
```

**Что здесь:**
- `bootstrap` — автозагрузка классов через Composer
- `colors="true"` — красивый цветной вывод
- `testsuites` — группировка тестов
- `source` — какие файлы покрывать тестами

---

## 💻 Первый тест на PHPUnit

### Шаг 1: Класс для тестирования

**src/StringHelper.php:**
```php
<?php

namespace App;

class StringHelper
{
    public function reverse(string $str): string
    {
        return strrev($str);
    }
    
    public function capitalize(string $str): string
    {
        return ucfirst(strtolower($str));
    }
    
    public function slugify(string $str): string
    {
        $str = strtolower($str);
        $str = preg_replace('/[^a-z0-9]+/', '-', $str);
        return trim($str, '-');
    }
}
```

### Шаг 2: Тест

**tests/Unit/StringHelperTest.php:**
```php
<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\StringHelper;

class StringHelperTest extends TestCase
{
    private StringHelper $helper;
    
    // Выполняется перед КАЖДЫМ тестом
    protected function setUp(): void
    {
        parent::setUp();
        $this->helper = new StringHelper();
    }
    
    public function test_reverse_string()
    {
        $result = $this->helper->reverse('hello');
        $this->assertEquals('olleh', $result);
    }
    
    public function test_reverse_empty_string()
    {
        $result = $this->helper->reverse('');
        $this->assertEquals('', $result);
    }
    
    public function test_capitalize_lowercase_word()
    {
        $result = $this->helper->capitalize('hello');
        $this->assertEquals('Hello', $result);
    }
    
    public function test_capitalize_uppercase_word()
    {
        $result = $this->helper->capitalize('HELLO');
        $this->assertEquals('Hello', $result);
    }
    
    public function test_slugify_creates_valid_slug()
    {
        $result = $this->helper->slugify('Hello World 123');
        $this->assertEquals('hello-world-123', $result);
    }
    
    public function test_slugify_removes_special_characters()
    {
        $result = $this->helper->slugify('Hello@World!');
        $this->assertEquals('hello-world', $result);
    }
}
```

### Шаг 3: Запуск

```bash
vendor/bin/phpunit

# PHPUnit 10.5.0 by Sebastian Bergmann and contributors.

......                                                              6 / 6 (100%)

Time: 00:00.012, Memory: 6.00 MB

OK (6 tests, 6 assertions)
```

---

## 🔧 Ассерции (assertions) — основа тестов

### Базовые проверки

```php
// Равенство
$this->assertEquals(5, $result);         // 5 == $result
$this->assertSame(5, $result);           // 5 === $result (строже)

// Истина/Ложь
$this->assertTrue($user->isActive());
$this->assertFalse($user->isBanned());

// Null
$this->assertNull($user->deletedAt);
$this->assertNotNull($user->email);

// Массивы
$this->assertCount(3, $items);
$this->assertContains('apple', $fruits);
$this->assertArrayHasKey('email', $data);

// Строки
$this->assertStringContainsString('error', $message);
$this->assertStringStartsWith('Hello', $greeting);

// Исключения
$this->expectException(InvalidArgumentException::class);
$user->setAge(-5); // должно выбросить исключение
```

### Пример: полноценный тест класса

**src/Order.php:**
```php
<?php

namespace App;

class Order
{
    private array $items = [];
    private float $tax = 0.2; // 20% налог
    
    public function addItem(string $name, float $price): void
    {
        if ($price < 0) {
            throw new \InvalidArgumentException('Price cannot be negative');
        }
        
        $this->items[] = ['name' => $name, 'price' => $price];
    }
    
    public function getSubtotal(): float
    {
        return array_sum(array_column($this->items, 'price'));
    }
    
    public function getTotal(): float
    {
        return $this->getSubtotal() * (1 + $this->tax);
    }
    
    public function isEmpty(): bool
    {
        return empty($this->items);
    }
}
```

**tests/Unit/OrderTest.php:**
```php
<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Order;

class OrderTest extends TestCase
{
    private Order $order;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->order = new Order();
    }
    
    public function test_new_order_is_empty()
    {
        $this->assertTrue($this->order->isEmpty());
        $this->assertEquals(0, $this->order->getSubtotal());
    }
    
    public function test_can_add_item()
    {
        $this->order->addItem('Laptop', 1000);
        
        $this->assertFalse($this->order->isEmpty());
        $this->assertEquals(1000, $this->order->getSubtotal());
    }
    
    public function test_calculates_total_with_tax()
    {
        $this->order->addItem('Laptop', 1000);
        
        // 1000 + 20% = 1200
        $this->assertEquals(1200, $this->order->getTotal());
    }
    
    public function test_multiple_items()
    {
        $this->order->addItem('Laptop', 1000);
        $this->order->addItem('Mouse', 50);
        
        $this->assertEquals(1050, $this->order->getSubtotal());
        $this->assertEquals(1260, $this->order->getTotal());
    }
    
    public function test_throws_exception_for_negative_price()
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Price cannot be negative');
        
        $this->order->addItem('Broken', -100);
    }
}
```

**Запуск:**
```bash
vendor/bin/phpunit tests/Unit/OrderTest.php

.....                                                               5 / 5 (100%)

OK (5 tests, 10 assertions)
```

---

## 🎨 Data Providers — тестирование с разными данными

Вместо копипаста тестов для разных входных данных:

```php
class CalculatorTest extends TestCase
{
    /**
     * @dataProvider additionProvider
     */
    public function test_addition(int $a, int $b, int $expected)
    {
        $calc = new Calculator();
        $this->assertEquals($expected, $calc->add($a, $b));
    }
    
    public static function additionProvider(): array
    {
        return [
            'positive numbers' => [2, 3, 5],
            'negative numbers' => [-2, -3, -5],
            'mixed' => [10, -5, 5],
            'with zero' => [0, 5, 5],
            'large numbers' => [1000, 2000, 3000],
        ];
    }
}
```

**Результат:**
```
.....                                                               5 / 5 (100%)

✓ Addition with data set "positive numbers"
✓ Addition with data set "negative numbers"
✓ Addition with data set "mixed"
✓ Addition with data set "with zero"
✓ Addition with data set "large numbers"
```

---

## 🚦 Практика: TDD-цикл (Red-Green-Refactor)

### Задача: Валидатор email

**Шаг 1: RED — пишем ТЕСТ (он упадет)**

```php
class EmailValidatorTest extends TestCase
{
    public function test_valid_email_passes()
    {
        $validator = new EmailValidator();
        $this->assertTrue($validator->isValid('test@example.com'));
    }
}
```

Запуск → ❌ **Error: Class EmailValidator not found**

**Шаг 2: GREEN — пишем КОД (минимум для прохождения)**

```php
class EmailValidator
{
    public function isValid(string $email): bool
    {
        return true; // Заглушка, чтобы тест прошел
    }
}
```

Запуск → ✅ **OK (1 test)**

**Шаг 3: Добавляем тест, который УПАДЕТ**

```php
public function test_invalid_email_fails()
{
    $validator = new EmailValidator();
    $this->assertFalse($validator->isValid('not-an-email'));
}
```

Запуск → ❌ **Failed: true is not false**

**Шаг 4: Реализуем валидацию**

```php
class EmailValidator
{
    public function isValid(string $email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
}
```

Запуск → ✅ **OK (2 tests)**

**Шаг 5: REFACTOR — улучшаем без ломки тестов**

```php
class EmailValidator
{
    public function isValid(string $email): bool
    {
        // Добавили проверку домена
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return false;
        }
        
        $domain = substr($email, strpos($email, '@') + 1);
        return checkdnsrr($domain, 'MX');
    }
}
```

Тесты все еще проходят → уверенность в рефакторинге.

---

## ⚡ Полезные команды PHPUnit

```bash
# Запустить все тесты
vendor/bin/phpunit

# Запустить конкретный файл
vendor/bin/phpunit tests/Unit/OrderTest.php

# Запустить конкретный метод
vendor/bin/phpunit --filter test_addition

# Запустить только Unit-тесты
vendor/bin/phpunit --testsuite Unit

# Покрытие кода (нужен Xdebug)
vendor/bin/phpunit --coverage-html coverage

# Подробный вывод
vendor/bin/phpunit --verbose

# Остановиться на первой ошибке
vendor/bin/phpunit --stop-on-failure
```

---

## 🛠️ Упражнения

### Упражнение 1: Базовый тест
Создай класс `Temperature` с методом `toFahrenheit($celsius)`. Напиши тесты:
- 0°C = 32°F
- 100°C = 212°F
- -40°C = -40°F

<details>
<summary>Решение</summary>

```php
// src/Temperature.php
class Temperature
{
    public function toFahrenheit(float $celsius): float
    {
        return ($celsius * 9/5) + 32;
    }
}

// tests/Unit/TemperatureTest.php
class TemperatureTest extends TestCase
{
    private Temperature $temp;
    
    protected function setUp(): void
    {
        $this->temp = new Temperature();
    }
    
    public function test_zero_celsius()
    {
        $this->assertEquals(32, $this->temp->toFahrenheit(0));
    }
    
    public function test_boiling_point()
    {
        $this->assertEquals(212, $this->temp->toFahrenheit(100));
    }
    
    public function test_negative_forty()
    {
        $this->assertEquals(-40, $this->temp->toFahrenheit(-40));
    }
}
```
</details>

### Упражнение 2: Data Provider
Класс `PasswordStrength` проверяет надежность пароля. Используй Data Provider для тестирования:
- Слабые: "123", "password", "abc"
- Сильные: "P@ssw0rd!", "MySecure123#"

<details>
<summary>Решение</summary>

```php
class PasswordStrength
{
    public function isStrong(string $password): bool
    {
        if (strlen($password) < 8) return false;
        if (!preg_match('/[A-Z]/', $password)) return false;
        if (!preg_match('/[a-z]/', $password)) return false;
        if (!preg_match('/[0-9]/', $password)) return false;
        if (!preg_match('/[\W]/', $password)) return false;
        
        return true;
    }
}

class PasswordStrengthTest extends TestCase
{
    /**
     * @dataProvider weakPasswordsProvider
     */
    public function test_weak_passwords($password)
    {
        $checker = new PasswordStrength();
        $this->assertFalse($checker->isStrong($password));
    }
    
    /**
     * @dataProvider strongPasswordsProvider
     */
    public function test_strong_passwords($password)
    {
        $checker = new PasswordStrength();
        $this->assertTrue($checker->isStrong($password));
    }
    
    public static function weakPasswordsProvider(): array
    {
        return [
            ['123'],
            ['password'],
            ['abc'],
            ['NoNumbers!'],
            ['nocapitals123!']
        ];
    }
    
    public static function strongPasswordsProvider(): array
    {
        return [
            ['P@ssw0rd!'],
            ['MySecure123#'],
            ['Qwerty123$']
        ];
    }
}
```
</details>

### Упражнение 3: TDD — корзина покупок
Методом TDD создай класс `Cart`:
1. Начни с теста `test_new_cart_is_empty`
2. Добавь `addProduct($name, $price, $quantity)`
3. Реализуй `getTotal()`
4. Добавь скидку 10% при сумме > 1000

<details>
<summary>Решение (только тесты, реализацию пиши сам!)</summary>

```php
class CartTest extends TestCase
{
    private Cart $cart;
    
    protected function setUp(): void
    {
        $this->cart = new Cart();
    }
    
    public function test_new_cart_is_empty()
    {
        $this->assertEquals(0, $this->cart->getTotal());
    }
    
    public function test_add_single_product()
    {
        $this->cart->addProduct('Laptop', 1000, 1);
        $this->assertEquals(1000, $this->cart->getTotal());
    }
    
    public function test_add_multiple_quantity()
    {
        $this->cart->addProduct('Mouse', 50, 3);
        $this->assertEquals(150, $this->cart->getTotal());
    }
    
    public function test_discount_applies_over_1000()
    {
        $this->cart->addProduct('Laptop', 1200, 1);
        // 1200 - 10% = 1080
        $this->assertEquals(1080, $this->cart->getTotal());
    }
    
    public function test_no_discount_under_1000()
    {
        $this->cart->addProduct('Mouse', 500, 1);
        $this->assertEquals(500, $this->cart->getTotal());
    }
}
```
</details>

---

## 📝 Чек-лист: Что ты теперь знаешь

- [ ] Понимаю зачем нужны тесты (документация, уверенность, регресс)
- [ ] Знаю пирамиду тестирования (Unit → Integration → E2E)
- [ ] Умею устанавливать PHPUnit
- [ ] Могу написать базовый тест с `assertEquals`, `assertTrue`
- [ ] Понимаю `setUp()` и подготовку данных
- [ ] Использую Data Providers для множества входных данных
- [ ] Знаю цикл TDD: Red → Green → Refactor
- [ ] Умею запускать тесты разными способами

---

## 🎓 Итоги

Тесты — не "дополнительная работа", а **инвестиция в будущее**. Первые 2 недели кажется, что пишешь в 2 раза медленнее. Через месяц понимаешь, что экономишь часы на дебаге.

**Следующая глава:** Unit-тесты глубже — моки, стабы, тестирование зависимостей.

---

## ❓ Вопросы для самопроверки

1. В чем разница между `assertEquals` и `assertSame`?
2. Когда использовать Unit-тесты, а когда Integration?
3. Что такое Data Provider и зачем он нужен?
4. Объясни цикл TDD своими словами
5. Почему тест должен проверять одну вещь?

Если ответил на все — готов к следующей главе! 🚀