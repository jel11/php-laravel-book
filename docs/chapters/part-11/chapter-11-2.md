# Глава 11.2: Unit-тесты — тестирование изолированных функций и классов

## Введение

Unit-тесты (модульные тесты) — это фундамент пирамиды тестирования. Они проверяют отдельные "единицы" кода — функции, методы классов — в изоляции от остального приложения. Если Feature-тесты проверяют "работает ли приложение", то Unit-тесты отвечают на вопрос "работает ли этот конкретный метод правильно".

### Почему Unit-тесты важны

**Быстрота**: Unit-тесты выполняются за миллисекунды, потому что не работают с базой данных, файловой системой или сетью.

**Изоляция**: Каждый тест проверяет одну вещь. Если тест падает, вы точно знаете, где проблема.

**Документация**: Хорошие unit-тесты показывают, как должен использоваться код.

**Рефакторинг без страха**: С тестами можно смело переписывать код, зная, что ничего не сломается.

---

## Анатомия хорошего Unit-теста

### Паттерн AAA (Arrange-Act-Assert)

Каждый тест следует простой структуре:

```php
public function test_calculator_adds_two_numbers()
{
    // Arrange (Подготовка) - создаем объекты, устанавливаем данные
    $calculator = new Calculator();
    $a = 5;
    $b = 3;
    
    // Act (Действие) - вызываем тестируемый метод
    $result = $calculator->add($a, $b);
    
    // Assert (Проверка) - проверяем результат
    $this->assertEquals(8, $result);
}
```

### Один тест — одна проверка

**Плохо:**
```php
public function test_user_validation()
{
    $validator = new UserValidator();
    
    $this->assertTrue($validator->isValidEmail('test@example.com'));
    $this->assertFalse($validator->isValidEmail('invalid'));
    $this->assertTrue($validator->isValidAge(25));
    $this->assertFalse($validator->isValidAge(15));
}
```

Если первая проверка упадет, остальные не выполнятся. Вы не узнаете полную картину.

**Хорошо:**
```php
public function test_validates_correct_email()
{
    $validator = new UserValidator();
    $this->assertTrue($validator->isValidEmail('test@example.com'));
}

public function test_rejects_invalid_email()
{
    $validator = new UserValidator();
    $this->assertFalse($validator->isValidEmail('invalid'));
}

public function test_validates_adult_age()
{
    $validator = new UserValidator();
    $this->assertTrue($validator->isValidAge(25));
}

public function test_rejects_minor_age()
{
    $validator = new UserValidator();
    $this->assertFalse($validator->isValidAge(15));
}
```

---

## Практические примеры

### Пример 1: Тестирование простой функции

**Класс для тестирования:**
```php
// app/Services/PriceCalculator.php
namespace App\Services;

class PriceCalculator
{
    public function calculateDiscount(float $price, int $discountPercent): float
    {
        if ($discountPercent < 0 || $discountPercent > 100) {
            throw new \InvalidArgumentException('Discount must be between 0 and 100');
        }
        
        return $price - ($price * $discountPercent / 100);
    }
}
```

**Тесты:**
```php
// tests/Unit/PriceCalculatorTest.php
namespace Tests\Unit;

use App\Services\PriceCalculator;
use PHPUnit\Framework\TestCase;

class PriceCalculatorTest extends TestCase
{
    private PriceCalculator $calculator;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->calculator = new PriceCalculator();
    }
    
    public function test_calculates_discount_correctly()
    {
        $result = $this->calculator->calculateDiscount(100, 10);
        $this->assertEquals(90, $result);
    }
    
    public function test_calculates_zero_discount()
    {
        $result = $this->calculator->calculateDiscount(100, 0);
        $this->assertEquals(100, $result);
    }
    
    public function test_calculates_full_discount()
    {
        $result = $this->calculator->calculateDiscount(100, 100);
        $this->assertEquals(0, $result);
    }
    
    public function test_throws_exception_for_negative_discount()
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->calculator->calculateDiscount(100, -10);
    }
    
    public function test_throws_exception_for_discount_over_hundred()
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->calculator->calculateDiscount(100, 150);
    }
    
    public function test_handles_decimal_prices()
    {
        $result = $this->calculator->calculateDiscount(99.99, 20);
        $this->assertEquals(79.992, $result);
    }
}
```

**Что мы покрыли:**
- ✅ Обычный случай (10% скидка)
- ✅ Граничные случаи (0% и 100%)
- ✅ Исключения (отрицательная скидка, > 100%)
- ✅ Дробные числа

---

### Пример 2: Тестирование класса с зависимостями (Mocking)

Часто классы зависят от других классов. Для изоляции используем **моки** (mock objects).

**Класс для тестирования:**
```php
// app/Services/OrderProcessor.php
namespace App\Services;

class OrderProcessor
{
    public function __construct(
        private PaymentGateway $paymentGateway,
        private EmailNotifier $emailNotifier
    ) {}
    
    public function processOrder(Order $order): bool
    {
        // Проверяем сумму
        if ($order->total <= 0) {
            return false;
        }
        
        // Обрабатываем платеж
        $paymentResult = $this->paymentGateway->charge(
            $order->total,
            $order->paymentMethod
        );
        
        if (!$paymentResult) {
            return false;
        }
        
        // Отправляем email
        $this->emailNotifier->sendOrderConfirmation($order);
        
        return true;
    }
}
```

**Тесты с моками:**
```php
// tests/Unit/OrderProcessorTest.php
namespace Tests\Unit;

use App\Services\OrderProcessor;
use App\Services\PaymentGateway;
use App\Services\EmailNotifier;
use PHPUnit\Framework\TestCase;
use Mockery;

class OrderProcessorTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
    
    public function test_processes_valid_order_successfully()
    {
        // Arrange
        $order = (object) [
            'total' => 100,
            'paymentMethod' => 'credit_card'
        ];
        
        // Создаем мок PaymentGateway
        $paymentGateway = Mockery::mock(PaymentGateway::class);
        $paymentGateway->shouldReceive('charge')
            ->once()
            ->with(100, 'credit_card')
            ->andReturn(true);
        
        // Создаем мок EmailNotifier
        $emailNotifier = Mockery::mock(EmailNotifier::class);
        $emailNotifier->shouldReceive('sendOrderConfirmation')
            ->once()
            ->with($order);
        
        $processor = new OrderProcessor($paymentGateway, $emailNotifier);
        
        // Act
        $result = $processor->processOrder($order);
        
        // Assert
        $this->assertTrue($result);
    }
    
    public function test_rejects_order_with_zero_total()
    {
        // Arrange
        $order = (object) ['total' => 0];
        
        $paymentGateway = Mockery::mock(PaymentGateway::class);
        $paymentGateway->shouldNotReceive('charge');
        
        $emailNotifier = Mockery::mock(EmailNotifier::class);
        $emailNotifier->shouldNotReceive('sendOrderConfirmation');
        
        $processor = new OrderProcessor($paymentGateway, $emailNotifier);
        
        // Act
        $result = $processor->processOrder($order);
        
        // Assert
        $this->assertFalse($result);
    }
    
    public function test_handles_payment_failure()
    {
        // Arrange
        $order = (object) [
            'total' => 100,
            'paymentMethod' => 'credit_card'
        ];
        
        $paymentGateway = Mockery::mock(PaymentGateway::class);
        $paymentGateway->shouldReceive('charge')
            ->once()
            ->andReturn(false);
        
        $emailNotifier = Mockery::mock(EmailNotifier::class);
        $emailNotifier->shouldNotReceive('sendOrderConfirmation');
        
        $processor = new OrderProcessor($paymentGateway, $emailNotifier);
        
        // Act
        $result = $processor->processOrder($order);
        
        // Assert
        $this->assertFalse($result);
    }
}
```

**Ключевые моменты:**
- `shouldReceive('method')` — говорим, какой метод должен быть вызван
- `once()` — метод должен быть вызван ровно один раз
- `with(...)` — с какими аргументами
- `andReturn(...)` — что метод должен вернуть
- `shouldNotReceive()` — метод НЕ должен быть вызван

---

### Пример 3: Тестирование строковых операций

**Класс:**
```php
// app/Services/SlugGenerator.php
namespace App\Services;

class SlugGenerator
{
    public function generate(string $text, int $maxLength = 50): string
    {
        // Приводим к нижнему регистру
        $slug = mb_strtolower($text);
        
        // Заменяем пробелы и спецсимволы на дефисы
        $slug = preg_replace('/[^a-z0-9-]+/', '-', $slug);
        
        // Убираем множественные дефисы
        $slug = preg_replace('/-+/', '-', $slug);
        
        // Убираем дефисы с краев
        $slug = trim($slug, '-');
        
        // Обрезаем по длине
        if (mb_strlen($slug) > $maxLength) {
            $slug = mb_substr($slug, 0, $maxLength);
            $slug = rtrim($slug, '-');
        }
        
        return $slug;
    }
}
```

**Тесты:**
```php
// tests/Unit/SlugGeneratorTest.php
namespace Tests\Unit;

use App\Services\SlugGenerator;
use PHPUnit\Framework\TestCase;

class SlugGeneratorTest extends TestCase
{
    private SlugGenerator $generator;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->generator = new SlugGenerator();
    }
    
    public function test_converts_to_lowercase()
    {
        $result = $this->generator->generate('Hello World');
        $this->assertEquals('hello-world', $result);
    }
    
    public function test_replaces_spaces_with_dashes()
    {
        $result = $this->generator->generate('multiple   spaces   here');
        $this->assertEquals('multiple-spaces-here', $result);
    }
    
    public function test_removes_special_characters()
    {
        $result = $this->generator->generate('Hello! @World# $Test%');
        $this->assertEquals('hello-world-test', $result);
    }
    
    public function test_handles_cyrillic()
    {
        $result = $this->generator->generate('Привет Мир');
        $this->assertEquals('', $result); // кириллица удаляется
    }
    
    public function test_trims_dashes_from_edges()
    {
        $result = $this->generator->generate('---start and end---');
        $this->assertEquals('start-and-end', $result);
    }
    
    public function test_respects_max_length()
    {
        $longText = 'this is a very long text that should be truncated';
        $result = $this->generator->generate($longText, 20);
        
        $this->assertLessThanOrEqual(20, mb_strlen($result));
        $this->assertEquals('this-is-a-very-long', $result);
    }
    
    public function test_handles_empty_string()
    {
        $result = $this->generator->generate('');
        $this->assertEquals('', $result);
    }
    
    public function test_handles_only_special_characters()
    {
        $result = $this->generator->generate('!@#$%^&*()');
        $this->assertEquals('', $result);
    }
}
```

---

## Data Providers — тестируем множество вариантов

Когда нужно проверить один метод с разными входными данными, используем **Data Providers**:

```php
// tests/Unit/EmailValidatorTest.php
namespace Tests\Unit;

use App\Services\EmailValidator;
use PHPUnit\Framework\TestCase;

class EmailValidatorTest extends TestCase
{
    private EmailValidator $validator;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->validator = new EmailValidator();
    }
    
    /**
     * @dataProvider validEmailProvider
     */
    public function test_accepts_valid_emails(string $email)
    {
        $this->assertTrue($this->validator->isValid($email));
    }
    
    public static function validEmailProvider(): array
    {
        return [
            ['test@example.com'],
            ['user.name@example.com'],
            ['user+tag@example.co.uk'],
            ['123@test.com'],
        ];
    }
    
    /**
     * @dataProvider invalidEmailProvider
     */
    public function test_rejects_invalid_emails(string $email)
    {
        $this->assertFalse($this->validator->isValid($email));
    }
    
    public static function invalidEmailProvider(): array
    {
        return [
            ['invalid'],
            ['@example.com'],
            ['user@'],
            ['user @example.com'],
            ['user@example'],
        ];
    }
}
```

**Преимущества:**
- Один тест проверяет множество случаев
- Легко добавлять новые варианты
- Понятно, какой именно кейс упал

---

## Проверка исключений

### Способ 1: expectException

```php
public function test_throws_exception_for_invalid_input()
{
    $this->expectException(\InvalidArgumentException::class);
    $this->expectExceptionMessage('Price cannot be negative');
    
    $calculator = new PriceCalculator();
    $calculator->calculateDiscount(-100, 10);
}
```

### Способ 2: try-catch (когда нужны дополнительные проверки)

```php
public function test_exception_contains_correct_data()
{
    $calculator = new PriceCalculator();
    
    try {
        $calculator->calculateDiscount(-100, 10);
        $this->fail('Expected exception was not thrown');
    } catch (\InvalidArgumentException $e) {
        $this->assertEquals('Price cannot be negative', $e->getMessage());
        $this->assertEquals(400, $e->getCode());
    }
}
```

---

## Основные утверждения (Assertions)

### Проверка значений

```php
// Равенство
$this->assertEquals(expected, actual);
$this->assertSame(expected, actual); // строгое сравнение (===)

// Типы
$this->assertIsInt($value);
$this->assertIsString($value);
$this->assertIsArray($value);
$this->assertIsBool($value);

// Null
$this->assertNull($value);
$this->assertNotNull($value);

// Boolean
$this->assertTrue($value);
$this->assertFalse($value);

// Строки
$this->assertStringContainsString('substring', $string);
$this->assertStringStartsWith('prefix', $string);
$this->assertStringEndsWith('suffix', $string);
$this->assertMatchesRegularExpression('/pattern/', $string);
```

### Проверка массивов

```php
// Содержимое
$this->assertContains('apple', $array);
$this->assertNotContains('banana', $array);

// Ключи
$this->assertArrayHasKey('name', $array);
$this->assertArrayNotHasKey('age', $array);

// Размер
$this->assertCount(3, $array);
$this->assertEmpty($array);
$this->assertNotEmpty($array);
```

### Проверка объектов

```php
// Тип объекта
$this->assertInstanceOf(User::class, $user);

// Свойства объекта
$this->assertObjectHasProperty('name', $user);
```

### Числовые проверки

```php
$this->assertGreaterThan(10, $value);
$this->assertGreaterThanOrEqual(10, $value);
$this->assertLessThan(100, $value);
$this->assertLessThanOrEqual(100, $value);

// Дробные числа с допуском
$this->assertEqualsWithDelta(1.5, $result, 0.01); // 1.49-1.51
```

---

## Тестирование приватных методов

**Философия:** Приватные методы — детали реализации. Тестируйте публичный API, а приватные методы покроются автоматически.

**Но если очень нужно:**

```php
// tests/Unit/UserServiceTest.php
use ReflectionClass;

public function test_private_method_formats_name()
{
    $service = new UserService();
    
    // Используем Reflection
    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('formatName');
    $method->setAccessible(true);
    
    $result = $method->invoke($service, 'john doe');
    
    $this->assertEquals('John Doe', $result);
}
```

**Альтернатива:** Если приватный метод настолько сложный, что нуждается в тестировании, возможно, его стоит вынести в отдельный класс.

---

## Частые ошибки

### ❌ Ошибка 1: Тестирование фреймворка

```php
// Плохо - тестируем Laravel, а не свой код
public function test_user_model_has_name_attribute()
{
    $user = new User();
    $user->name = 'John';
    $this->assertEquals('John', $user->name);
}
```

Laravel уже протестирован. Тестируйте свою логику.

### ❌ Ошибка 2: Зависимость тестов друг от друга

```php
// Плохо - тесты зависят от порядка выполнения
private static $counter = 0;

public function test_increments_counter()
{
    self::$counter++;
    $this->assertEquals(1, self::$counter);
}

public function test_counter_is_two()
{
    self::$counter++;
    $this->assertEquals(2, self::$counter); // упадет, если запустить отдельно
}
```

Каждый тест должен быть независимым.

### ❌ Ошибка 3: Слишком много логики в тесте

```php
// Плохо
public function test_calculates_statistics()
{
    $data = [1, 2, 3, 4, 5];
    $sum = array_sum($data);
    $average = $sum / count($data);
    $expected = $average * 2;
    
    $result = $this->calculator->doubleAverage($data);
    
    $this->assertEquals($expected, $result);
}
```

Если вы вычисляете ожидаемое значение в тесте, вы фактически дублируете тестируемую логику. Используйте константы:

```php
// Хорошо
public function test_calculates_statistics()
{
    $data = [1, 2, 3, 4, 5];
    $result = $this->calculator->doubleAverage($data);
    $this->assertEquals(6, $result); // (1+2+3+4+5)/5 * 2 = 6
}
```

---

## Организация тестов

### Структура файлов

```
tests/
├── Unit/
│   ├── Services/
│   │   ├── PriceCalculatorTest.php
│   │   ├── SlugGeneratorTest.php
│   │   └── OrderProcessorTest.php
│   ├── Models/
│   │   └── UserTest.php
│   └── Helpers/
│       └── StringHelperTest.php
```

### Именование

**Классы тестов:** `ТестируемыйКлассTest`
```php
PriceCalculator → PriceCalculatorTest
UserRepository → UserRepositoryTest
```

**Методы тестов:** Описывайте поведение
```php
// ✅ Хорошо
test_calculates_discount_for_valid_input()
test_throws_exception_when_price_is_negative()

// ❌ Плохо
test1()
testCalculate()
testDiscount()
```

---

## Практическое задание

Создайте класс `PasswordValidator` со следующими требованиями:

1. Минимум 8 символов
2. Минимум одна заглавная буква
3. Минимум одна цифра
4. Минимум один спецсимвол (!@#$%^&*)
5. Метод должен возвращать массив ошибок или пустой массив, если всё ОК

**Реализация:**

```php
// app/Services/PasswordValidator.php
namespace App\Services;

class PasswordValidator
{
    public function validate(string $password): array
    {
        $errors = [];
        
        if (strlen($password) < 8) {
            $errors[] = 'Password must be at least 8 characters';
        }
        
        if (!preg_match('/[A-Z]/', $password)) {
            $errors[] = 'Password must contain at least one uppercase letter';
        }
        
        if (!preg_match('/[0-9]/', $password)) {
            $errors[] = 'Password must contain at least one digit';
        }
        
        if (!preg_match('/[!@#$%^&*]/', $password)) {
            $errors[] = 'Password must contain at least one special character';
        }
        
        return $errors;
    }
}
```

**Ваша задача:** Напишите полный набор unit-тестов, покрывающий:
- ✅ Валидный пароль
- ❌ Слишком короткий
- ❌ Без заглавных букв
- ❌ Без цифр
- ❌ Без спецсимволов
- ❌ Несколько нарушений одновременно
- ✅ Граничный случай (ровно 8 символов)
- ✅ Пустая строка

<details>
<summary>Решение</summary>

```php
// tests/Unit/PasswordValidatorTest.php
namespace Tests\Unit;

use App\Services\PasswordValidator;
use PHPUnit\Framework\TestCase;

class PasswordValidatorTest extends TestCase
{
    private PasswordValidator $validator;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->validator = new PasswordValidator();
    }
    
    public function test_accepts_valid_password()
    {
        $errors = $this->validator->validate('SecurePass123!');
        $this->assertEmpty($errors);
    }
    
    public function test_rejects_short_password()
    {
        $errors = $this->validator->validate('Abc1!');
        
        $this->assertContains(
            'Password must be at least 8 characters',
            $errors
        );
    }
    
    public function test_rejects_password_without_uppercase()
    {
        $errors = $this->validator->validate('password123!');
        
        $this->assertContains(
            'Password must contain at least one uppercase letter',
            $errors
        );
    }
    
    public function test_rejects_password_without_digit()
    {
        $errors = $this->validator->validate('Password!');
        
        $this->assertContains(
            'Password must contain at least one digit',
            $errors
        );
    }
    
    public function test_rejects_password_without_special_character()
    {
        $errors = $this->validator->validate('Password123');
        
        $this->assertContains(
            'Password must contain at least one special character',
            $errors
        );
    }
    
    public function test_returns_multiple_errors_for_invalid_password()
    {
        $errors = $this->validator->validate('pass');
        
        $this->assertCount(4, $errors);
    }
    
    public function test_accepts_password_with_exactly_8_characters()
    {
        $errors = $this->validator->validate('Passwor1!');
        $this->assertEmpty($errors);
    }
    
    public function test_rejects_empty_password()
    {
        $errors = $this->validator->validate('');
        $this->assertNotEmpty($errors);
    }
    
    /**
     * @dataProvider validPasswordProvider
     */
    public function test_accepts_various_valid_passwords(string $password)
    {
        $errors = $this->validator->validate($password);
        $this->assertEmpty($errors);
    }
    
    public static function validPasswordProvider(): array
    {
        return [
            ['MyP@ssw0rd'],
            ['Secur3!Pass'],
            ['C0mpl3x!ty'],
            ['Test1234!@#'],
        ];
    }
}
```

</details>

---

## Запуск тестов

```bash
# Все unit-тесты
php artisan test --testsuite=Unit

# Конкретный файл
php artisan test tests/Unit/PriceCalculatorTest.php

# Конкретный метод
php artisan test --filter test_calculates_discount

# С покрытием кода (требует Xdebug)
php artisan test --coverage

# С подробным выводом
php artisan test --verbose
```

---

## Code Coverage — насколько покрыт код

Coverage показывает, какие строки кода выполнялись во время тестов.

```bash
php artisan test --coverage --min=80
```

**Интерпретация:**
- **80%+** — отлично для бизнес-логики
- **60-80%** — приемлемо
- **<60%** — критичные части не покрыты

**Важно:** 100% coverage ≠ отсутствие багов. Это лишь значит, что строки выполнялись, но не обязательно корректно.

---

## Чеклист хорошего Unit-теста

- [ ] Тестирует одну конкретную вещь
- [ ] Независим от других тестов
- [ ] Не зависит от внешних систем (БД, API)
- [ ] Выполняется за миллисекунды
- [ ] Имеет понятное название
- [ ] Использует AAA-паттерн
- [ ] Проверяет как успешные, так и ошибочные сценарии
- [ ] Проверяет граничные случаи
- [ ] Использует моки для зависимостей

---

## Заключение

Unit-тесты — это инвестиция, которая окупается при первом же рефакторинге. Они дают уверенность, что ваш код работает, и позволяют безбоязненно его изменять.

**Золотое правило:** Если метод сложно протестировать, скорее всего, он плохо спроектирован. Тесты — это индикатор качества кода.

В следующей главе мы рассмотрим **Feature-тесты в Laravel**, которые тестируют приложение целиком — от HTTP-запроса до ответа.

---

## Вопросы для самопроверки

1. В чем разница между `assertEquals` и `assertSame`?
2. Зачем нужны Data Providers?
3. Когда использовать моки (mocks)?
4. Почему не стоит тестировать приватные методы?
5. Что такое AAA-паттерн?
6. Как проверить, что метод бросает исключение?
7. Почему каждый тест должен проверять только одну вещь?
8. Что означает Code Coverage 80%?