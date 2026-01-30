# Глава 11.4: TDD на практике — пишем код через тесты, red-green-refactor

## Введение

Test-Driven Development (TDD) — это не просто написание тестов, это **философия разработки**, где тесты пишутся **до** кода. Это переворачивает привычный подход с ног на голову и заставляет думать о требованиях и интерфейсах до реализации.

**Зачем это нужно:**
- Код пишется только для удовлетворения требований (нет лишнего кода)
- Интерфейсы получаются более удобными (вы сначала их используете)
- Меньше багов (каждая строка покрыта тестами)
- Рефакторинг становится безопасным
- Документация через примеры использования

---

## Цикл Red-Green-Refactor

TDD строится на простом трёхшаговом цикле:

```
🔴 RED → 🟢 GREEN → ♻️ REFACTOR
```

### 1. 🔴 RED — Красный (Failing Test)
Напишите тест, который **проваливается**. Тест описывает желаемое поведение, которого ещё нет.

### 2. 🟢 GREEN — Зелёный (Passing Test)
Напишите **минимальный** код, чтобы тест прошёл. Не думайте о красоте — просто заставьте работать.

### 3. ♻️ REFACTOR — Рефакторинг
Улучшите код, не меняя поведение. Тесты должны оставаться зелёными.

**Важно:** Маленькие шаги! Каждый цикл занимает минуты, а не часы.

---

## Практика 1: Калькулятор скидок

Создадим систему расчёта скидок для интернет-магазина.

### Требования
- Скидка 10% при заказе от 1000₽
- Скидка 15% при заказе от 5000₽
- Скидка 20% при заказе от 10000₽
- Промокод даёт дополнительную фиксированную скидку

### Шаг 1: 🔴 RED — Первый тест

```php
<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\DiscountCalculator;

class DiscountCalculatorTest extends TestCase
{
    /** @test */
    public function it_returns_zero_discount_for_orders_below_1000()
    {
        $calculator = new DiscountCalculator();
        
        $discount = $calculator->calculate(500);
        
        $this->assertEquals(0, $discount);
    }
}
```

**Запускаем тест:**
```bash
php artisan test --filter DiscountCalculatorTest
```

**Результат:** ❌ Класс `DiscountCalculator` не существует.

### Шаг 2: 🟢 GREEN — Минимальная реализация

Создаём класс:

```php
<?php

namespace App\Services;

class DiscountCalculator
{
    public function calculate(float $orderAmount): float
    {
        return 0; // Самая простая реализация
    }
}
```

**Запускаем тест:** ✅ Зелёный!

### Шаг 3: ♻️ REFACTOR

Пока нечего рефакторить, код элементарный.

---

### Следующий цикл: Скидка 10%

#### 🔴 RED — Новый тест

```php
/** @test */
public function it_applies_10_percent_discount_for_orders_above_1000()
{
    $calculator = new DiscountCalculator();
    
    $discount = $calculator->calculate(1500);
    
    $this->assertEquals(150, $discount); // 10% от 1500
}
```

**Запускаем:** ❌ Ожидали 150, получили 0.

#### 🟢 GREEN — Реализация

```php
public function calculate(float $orderAmount): float
{
    if ($orderAmount >= 1000) {
        return $orderAmount * 0.1;
    }
    
    return 0;
}
```

**Запускаем:** ✅ Оба теста зелёные!

#### ♻️ REFACTOR

Можно извлечь магические числа:

```php
private const THRESHOLD_BASIC = 1000;
private const DISCOUNT_BASIC = 0.1;

public function calculate(float $orderAmount): float
{
    if ($orderAmount >= self::THRESHOLD_BASIC) {
        return $orderAmount * self::DISCOUNT_BASIC;
    }
    
    return 0;
}
```

**Запускаем:** ✅ Тесты остаются зелёными!

---

### Добавляем скидку 15%

#### 🔴 RED

```php
/** @test */
public function it_applies_15_percent_discount_for_orders_above_5000()
{
    $calculator = new DiscountCalculator();
    
    $discount = $calculator->calculate(6000);
    
    $this->assertEquals(900, $discount); // 15% от 6000
}
```

**Запускаем:** ❌ Ожидали 900, получили 600 (10%).

#### 🟢 GREEN

```php
private const THRESHOLD_BASIC = 1000;
private const THRESHOLD_SILVER = 5000;
private const DISCOUNT_BASIC = 0.1;
private const DISCOUNT_SILVER = 0.15;

public function calculate(float $orderAmount): float
{
    if ($orderAmount >= self::THRESHOLD_SILVER) {
        return $orderAmount * self::DISCOUNT_SILVER;
    }
    
    if ($orderAmount >= self::THRESHOLD_BASIC) {
        return $orderAmount * self::DISCOUNT_BASIC;
    }
    
    return 0;
}
```

**Запускаем:** ✅ Все тесты зелёные!

---

### Завершаем скидку 20% и промокод

#### Скидка 20% (самостоятельно попробуйте!)

```php
/** @test */
public function it_applies_20_percent_discount_for_orders_above_10000()
{
    $calculator = new DiscountCalculator();
    
    $this->assertEquals(2200, $calculator->calculate(11000));
}
```

#### Промокод

```php
/** @test */
public function it_applies_promo_code_discount()
{
    $calculator = new DiscountCalculator();
    
    $discount = $calculator->calculate(1500, 'SAVE100');
    
    $this->assertEquals(250, $discount); // 150 (10%) + 100 (промокод)
}
```

**Реализация:**

```php
public function calculate(
    float $orderAmount, 
    ?string $promoCode = null
): float {
    $discount = $this->getPercentageDiscount($orderAmount);
    
    if ($promoCode) {
        $discount += $this->getPromoDiscount($promoCode);
    }
    
    return $discount;
}

private function getPercentageDiscount(float $amount): float
{
    if ($amount >= 10000) return $amount * 0.2;
    if ($amount >= 5000) return $amount * 0.15;
    if ($amount >= 1000) return $amount * 0.1;
    
    return 0;
}

private function getPromoDiscount(string $code): float
{
    $promoCodes = [
        'SAVE100' => 100,
        'SAVE200' => 200,
    ];
    
    return $promoCodes[$code] ?? 0;
}
```

---

## Практика 2: Feature-тест для API корзины

Создадим API endpoint для добавления товара в корзину через TDD.

### 🔴 RED — Описываем желаемое поведение

```php
<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CartTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function user_can_add_product_to_cart()
    {
        // Arrange
        $user = User::factory()->create();
        $product = Product::factory()->create(['price' => 1000]);
        
        // Act
        $response = $this->actingAs($user)->postJson('/api/cart', [
            'product_id' => $product->id,
            'quantity' => 2,
        ]);
        
        // Assert
        $response->assertStatus(201);
        $response->assertJson([
            'message' => 'Product added to cart',
            'cart_total' => 2000,
        ]);
        
        $this->assertDatabaseHas('cart_items', [
            'user_id' => $user->id,
            'product_id' => $product->id,
            'quantity' => 2,
        ]);
    }
}
```

**Запускаем:** ❌ Роут не существует.

### 🟢 GREEN — Минимальная реализация

**1. Создаём роут:**

```php
// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/cart', [CartController::class, 'store']);
});
```

**2. Создаём контроллер:**

```bash
php artisan make:controller Api/CartController
```

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user();
        
        $cartItem = $user->cartItems()->create([
            'product_id' => $request->product_id,
            'quantity' => $request->quantity,
        ]);
        
        $total = $user->cartItems()
            ->with('product')
            ->get()
            ->sum(fn($item) => $item->product->price * $item->quantity);
        
        return response()->json([
            'message' => 'Product added to cart',
            'cart_total' => $total,
        ], 201);
    }
}
```

**3. Создаём миграцию:**

```php
Schema::create('cart_items', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('product_id')->constrained()->cascadeOnDelete();
    $table->integer('quantity');
    $table->timestamps();
});
```

**4. Создаём модель:**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CartItem extends Model
{
    protected $fillable = ['product_id', 'quantity'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
```

**5. Добавляем связь в User:**

```php
public function cartItems()
{
    return $this->hasMany(CartItem::class);
}
```

**Запускаем тест:** ✅ Зелёный!

### ♻️ REFACTOR — Улучшаем код

**Проблемы текущей реализации:**
- Нет валидации
- Логика расчёта в контроллере
- Дублирование при повторном добавлении

**Добавляем тесты для новых требований:**

```php
/** @test */
public function it_validates_product_id_is_required()
{
    $user = User::factory()->create();
    
    $response = $this->actingAs($user)->postJson('/api/cart', [
        'quantity' => 1,
    ]);
    
    $response->assertStatus(422);
    $response->assertJsonValidationErrors('product_id');
}

/** @test */
public function it_increases_quantity_if_product_already_in_cart()
{
    $user = User::factory()->create();
    $product = Product::factory()->create();
    
    // Добавляем первый раз
    $this->actingAs($user)->postJson('/api/cart', [
        'product_id' => $product->id,
        'quantity' => 2,
    ]);
    
    // Добавляем второй раз
    $response = $this->actingAs($user)->postJson('/api/cart', [
        'product_id' => $product->id,
        'quantity' => 3,
    ]);
    
    $response->assertStatus(201);
    
    // Должна быть одна запись с quantity = 5
    $this->assertEquals(1, $user->cartItems()->count());
    $this->assertEquals(5, $user->cartItems()->first()->quantity);
}
```

**Улучшенная реализация:**

```php
// app/Http/Requests/AddToCartRequest.php
class AddToCartRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1|max:100',
        ];
    }
}

// app/Services/CartService.php
class CartService
{
    public function addToCart(User $user, int $productId, int $quantity): int
    {
        $cartItem = $user->cartItems()
            ->where('product_id', $productId)
            ->first();
        
        if ($cartItem) {
            $cartItem->increment('quantity', $quantity);
        } else {
            $user->cartItems()->create([
                'product_id' => $productId,
                'quantity' => $quantity,
            ]);
        }
        
        return $this->getCartTotal($user);
    }
    
    public function getCartTotal(User $user): int
    {
        return $user->cartItems()
            ->with('product')
            ->get()
            ->sum(fn($item) => $item->product->price * $item->quantity);
    }
}

// app/Http/Controllers/Api/CartController.php
class CartController extends Controller
{
    public function __construct(
        private CartService $cartService
    ) {}
    
    public function store(AddToCartRequest $request)
    {
        $total = $this->cartService->addToCart(
            $request->user(),
            $request->product_id,
            $request->quantity
        );
        
        return response()->json([
            'message' => 'Product added to cart',
            'cart_total' => $total,
        ], 201);
    }
}
```

**Запускаем все тесты:** ✅ Все зелёные!

---

## Практика 3: TDD для сложной бизнес-логики

Создадим систему бронирования номеров в отеле.

### Требования
- Номер можно забронировать только на свободные даты
- Минимальное бронирование — 1 ночь
- Цена зависит от типа номера и сезона
- В выходные цена +30%

### Начинаем с простейшего теста

```php
<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\Room;
use App\Services\BookingService;
use Carbon\Carbon;

class BookingServiceTest extends TestCase
{
    /** @test */
    public function it_can_calculate_price_for_standard_room()
    {
        $room = Room::factory()->create([
            'type' => 'standard',
            'base_price' => 1000,
        ]);
        
        $service = new BookingService();
        
        $price = $service->calculatePrice(
            room: $room,
            checkIn: Carbon::parse('2024-03-18'), // Понедельник
            checkOut: Carbon::parse('2024-03-19') // 1 ночь
        );
        
        $this->assertEquals(1000, $price);
    }
}
```

### Реализация через TDD (краткая версия)

```php
class BookingService
{
    public function calculatePrice(
        Room $room,
        Carbon $checkIn,
        Carbon $checkOut
    ): int {
        $nights = $checkIn->diffInDays($checkOut);
        $totalPrice = 0;
        
        for ($i = 0; $i < $nights; $i++) {
            $currentDate = $checkIn->copy()->addDays($i);
            $dailyPrice = $room->base_price;
            
            // Наценка в выходные
            if ($currentDate->isWeekend()) {
                $dailyPrice *= 1.3;
            }
            
            $totalPrice += $dailyPrice;
        }
        
        return (int) $totalPrice;
    }
    
    public function isAvailable(
        Room $room,
        Carbon $checkIn,
        Carbon $checkOut
    ): bool {
        return !$room->bookings()
            ->where(function ($query) use ($checkIn, $checkOut) {
                $query->whereBetween('check_in', [$checkIn, $checkOut])
                      ->orWhereBetween('check_out', [$checkIn, $checkOut])
                      ->orWhere(function ($q) use ($checkIn, $checkOut) {
                          $q->where('check_in', '<=', $checkIn)
                            ->where('check_out', '>=', $checkOut);
                      });
            })
            ->exists();
    }
}
```

**Тесты для проверки доступности:**

```php
/** @test */
public function room_is_not_available_if_dates_overlap()
{
    $room = Room::factory()->create();
    
    // Существующее бронирование: 20-25 марта
    Booking::factory()->create([
        'room_id' => $room->id,
        'check_in' => '2024-03-20',
        'check_out' => '2024-03-25',
    ]);
    
    $service = new BookingService();
    
    // Попытка забронировать 22-24 (внутри периода)
    $available = $service->isAvailable(
        $room,
        Carbon::parse('2024-03-22'),
        Carbon::parse('2024-03-24')
    );
    
    $this->assertFalse($available);
}

/** @test */
public function room_is_available_if_dates_do_not_overlap()
{
    $room = Room::factory()->create();
    
    Booking::factory()->create([
        'room_id' => $room->id,
        'check_in' => '2024-03-20',
        'check_out' => '2024-03-25',
    ]);
    
    $service = new BookingService();
    
    // Бронирование после существующего
    $available = $service->isAvailable(
        $room,
        Carbon::parse('2024-03-26'),
        Carbon::parse('2024-03-28')
    );
    
    $this->assertTrue($available);
}
```

---

## Преимущества TDD на реальных примерах

### До TDD (классический подход)

```php
// Пишем код
class OrderProcessor
{
    public function process(Order $order)
    {
        // 200 строк логики
        // Обработка платежа
        // Отправка email
        // Обновление склада
        // ...
    }
}

// Потом думаем: "Надо бы протестировать..."
// Но класс уже сложный, зависимости жёсткие
// Тестировать трудно → тесты не пишутся
```

### С TDD

```php
// Сначала тест
/** @test */
public function it_reduces_stock_after_successful_order()
{
    $product = Product::factory()->create(['stock' => 10]);
    $order = Order::factory()->create();
    
    $processor = new OrderProcessor(
        paymentGateway: new FakePaymentGateway(),
        emailService: new FakeEmailService()
    );
    
    $processor->process($order);
    
    $this->assertEquals(9, $product->fresh()->stock);
}

// Код получается тестируемым "по дизайну"
class OrderProcessor
{
    public function __construct(
        private PaymentGatewayInterface $paymentGateway,
        private EmailServiceInterface $emailService
    ) {}
    
    // Методы небольшие, с одной ответственностью
    // Легко тестировать и поддерживать
}
```

---

## Частые ошибки в TDD

### ❌ Ошибка 1: Писать слишком много кода за раз

```php
// Плохо: написали весь класс сразу
public function calculate($amount, $discount, $tax, $shipping, $promo)
{
    // 50 строк логики
}
```

**Правильно:** Маленькими шагами

```php
// Шаг 1: базовая сумма
public function calculate($amount) { return $amount; }

// Шаг 2: добавили скидку
public function calculate($amount, $discount = 0) 
{ 
    return $amount - $discount; 
}

// И так далее...
```

### ❌ Ошибка 2: Тестировать implementation вместо behavior

```php
// Плохо: тест знает о внутренностях
public function test_it_calls_save_method()
{
    $repository = Mockery::mock(Repository::class);
    $repository->shouldReceive('save')->once();
    // ...
}
```

**Правильно:** Тестируем результат

```php
// Хорошо: тест проверяет поведение
public function test_user_is_saved_to_database()
{
    $service->createUser(['name' => 'John']);
    
    $this->assertDatabaseHas('users', ['name' => 'John']);
}
```

### ❌ Ошибка 3: Пропускать рефакторинг

```php
// После того, как тесты зелёные, код выглядит так:
public function calculate($amount)
{
    if ($amount > 1000) return $amount * 0.9;
    if ($amount > 5000) return $amount * 0.85;
    return $amount;
}

// Нужно отрефакторить!
private const DISCOUNTS = [
    5000 => 0.15,
    1000 => 0.10,
];

public function calculate($amount)
{
    foreach (self::DISCOUNTS as $threshold => $rate) {
        if ($amount >= $threshold) {
            return $amount * (1 - $rate);
        }
    }
    return $amount;
}
```

---

## Когда НЕ использовать TDD

TDD — мощный инструмент, но не серебряная пуля:

### Не подходит для:
- **Прототипирования** — когда вы экспериментируете с идеей
- **UI/дизайна** — внешний вид лучше создавать итеративно
- **Исследования** — когда вы не знаете, что должно получиться
- **Legacy code** — сначала нужно добавить characterization тесты

### Идеально для:
- Бизнес-логики
- API endpoints
- Сервисных классов
- Алгоритмов с чёткими требованиями
- Библиотек и пакетов

---

## Практическое упражнение

Реализуйте через TDD систему промокодов со следующими требованиями:

1. Промокод даёт процентную скидку (5%, 10%, 20%)
2. Промокод имеет срок действия
3. Промокод можно использовать ограниченное количество раз
4. Промокод можно использовать только для определённых категорий товаров
5. Нельзя использовать два промокода одновременно

**Начните с теста:**

```php
/** @test */
public function it_applies_promo_code_discount()
{
    $promoCode = PromoCode::factory()->create([
        'code' => 'SUMMER20',
        'discount_percent' => 20,
        'expires_at' => now()->addDays(7),
    ]);
    
    $order = Order::factory()->create(['total' => 1000]);
    
    $service = new PromoCodeService();
    $newTotal = $service->apply($order, 'SUMMER20');
    
    $this->assertEquals(800, $newTotal);
}
```

---

## Чек-лист TDD

✅ Пишу тест **до** кода  
✅ Тест сначала **красный** (проваливается)  
✅ Пишу **минимум** кода для прохождения теста  
✅ Тест становится **зелёным**  
✅ **Рефакторю** код, тесты остаются зелёными  
✅ Повторяю цикл для следующего требования  
✅ Коммичу только при зелёных тестах  
✅ Тесты проверяют **поведение**, а не реализацию  

---

## Резюме

**TDD — это не про тестирование, это про дизайн кода.**

Когда вы пишете тест до кода, вы:
- Думаете об интерфейсе с точки зрения пользователя
- Создаёте только необходимый функционал
- Получаете тестируемый код "по дизайну"
- Можете смело рефакторить

**Золотое правило:** Red → Green → Refactor. Маленькие шаги, частые коммиты.

**Следующая глава:** Переходим к frontend-интеграции — JavaScript для PHP-разработчика!