# Глава 10.2: Валидация — правила, custom rules, Form Requests, сообщения об ошибках

## Введение

Валидация — это процесс проверки данных, которые приходят от пользователя, перед их обработкой. Это критически важный аспект безопасности и качества приложения. Laravel предоставляет мощную и элегантную систему валидации, которая позволяет легко проверять входящие данные и возвращать понятные сообщения об ошибках.

**Почему валидация важна:**
- **Безопасность**: предотвращает SQL-инъекции, XSS и другие атаки
- **Целостность данных**: гарантирует, что в БД попадают только корректные данные
- **UX**: пользователь получает понятные сообщения о том, что не так
- **Бизнес-логика**: проверка соответствия данных требованиям приложения

---

## 1. Основы валидации в Laravel

### 1.1 Валидация в контроллере

Самый простой способ — использовать метод `validate()` прямо в контроллере:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class UserController extends Controller
{
    public function store(Request $request)
    {
        // Валидация данных
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8|confirmed',
            'age' => 'nullable|integer|min:18|max:120',
        ]);

        // Если валидация прошла, создаём пользователя
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => bcrypt($validated['password']),
            'age' => $validated['age'],
        ]);

        return redirect()->route('users.show', $user);
    }
}
```

**Что происходит:**
1. Если валидация проваливается, Laravel автоматически редиректит назад с ошибками
2. Ошибки доступны в Blade через `$errors`
3. Старые значения сохраняются и доступны через `old()`
4. Если валидация успешна, возвращается массив валидированных данных

### 1.2 Отображение ошибок в Blade

```blade
{{-- resources/views/users/create.blade.php --}}
<form action="{{ route('users.store') }}" method="POST">
    @csrf

    <div>
        <label for="name">Имя</label>
        <input 
            type="text" 
            name="name" 
            id="name" 
            value="{{ old('name') }}"
            class="@error('name') border-red-500 @enderror"
        >
        
        @error('name')
            <p class="text-red-500 text-sm">{{ $message }}</p>
        @enderror
    </div>

    <div>
        <label for="email">Email</label>
        <input 
            type="email" 
            name="email" 
            id="email" 
            value="{{ old('email') }}"
        >
        
        @error('email')
            <p class="text-red-500 text-sm">{{ $message }}</p>
        @enderror
    </div>

    <div>
        <label for="password">Пароль</label>
        <input type="password" name="password" id="password">
        
        @error('password')
            <p class="text-red-500 text-sm">{{ $message }}</p>
        @enderror
    </div>

    <div>
        <label for="password_confirmation">Подтверждение пароля</label>
        <input type="password" name="password_confirmation">
    </div>

    {{-- Показать все ошибки разом --}}
    @if ($errors->any())
        <div class="alert alert-danger">
            <ul>
                @foreach ($errors->all() as $error)
                    <li>{{ $error }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    <button type="submit">Создать</button>
</form>
```

---

## 2. Правила валидации

Laravel предоставляет более 70 встроенных правил. Рассмотрим самые важные.

### 2.1 Базовые правила

```php
$request->validate([
    // Обязательное поле
    'name' => 'required',
    
    // Необязательное поле (но если есть, будет валидироваться)
    'phone' => 'nullable|string',
    
    // Строка с ограничениями длины
    'title' => 'string|min:3|max:255',
    
    // Целое число
    'age' => 'integer',
    
    // Число с диапазоном
    'rating' => 'integer|min:1|max:5',
    
    // Число с плавающей точкой
    'price' => 'numeric',
    
    // Булево значение
    'is_active' => 'boolean',
    
    // Email
    'email' => 'email',
    
    // URL
    'website' => 'url',
    
    // Дата
    'birth_date' => 'date',
    
    // Дата в определённом формате
    'created_at' => 'date_format:Y-m-d H:i:s',
    
    // IP-адрес
    'ip_address' => 'ip',
    
    // JSON
    'settings' => 'json',
    
    // UUID
    'uuid' => 'uuid',
]);
```

### 2.2 Правила для строк

```php
$request->validate([
    // Точная длина
    'code' => 'size:6',
    
    // Регулярное выражение
    'username' => 'regex:/^[a-zA-Z0-9_]+$/',
    
    // Только буквы
    'name' => 'alpha',
    
    // Буквы и цифры
    'login' => 'alpha_num',
    
    // Буквы, цифры, дефисы и подчёркивания
    'slug' => 'alpha_dash',
    
    // Начинается с определённой строки
    'phone' => 'starts_with:+7,+1',
    
    // Заканчивается на
    'domain' => 'ends_with:.com,.org',
    
    // Не содержит
    'comment' => 'doesnt_start_with:http,https',
]);
```

### 2.3 Правила для чисел

```php
$request->validate([
    // Между значениями
    'age' => 'between:18,65',
    
    // Больше или равно
    'quantity' => 'gte:1',
    
    // Меньше или равно
    'discount' => 'lte:100',
    
    // Кратно
    'items' => 'multiple_of:5',
]);
```

### 2.4 Правила для дат

```php
$request->validate([
    // Дата после определённой даты
    'end_date' => 'after:start_date',
    
    // Дата после или равна
    'deadline' => 'after_or_equal:today',
    
    // Дата до
    'birth_date' => 'before:today',
    
    // Дата до или равна
    'expiry_date' => 'before_or_equal:2025-12-31',
]);
```

### 2.5 Правила для файлов

```php
$request->validate([
    // Это файл
    'document' => 'file',
    
    // Изображение (jpeg, png, bmp, gif, svg, webp)
    'avatar' => 'image',
    
    // Определённые MIME-типы
    'photo' => 'mimes:jpeg,png,jpg',
    
    // Расширения файлов
    'document' => 'mimetypes:application/pdf,application/msword',
    
    // Размер файла (в килобайтах)
    'video' => 'max:51200', // 50MB
    
    // Размер изображения (ширина и высота в пикселях)
    'logo' => 'dimensions:min_width=100,min_height=100,max_width=1000,max_height=1000',
    
    // Соотношение сторон
    'banner' => 'dimensions:ratio=16/9',
]);
```

### 2.6 Правила для базы данных

```php
$request->validate([
    // Уникальное значение в таблице
    'email' => 'unique:users,email',
    
    // Уникальное, но игнорируя текущую запись (для обновления)
    'email' => 'unique:users,email,' . $user->id,
    
    // Уникальное с дополнительными условиями
    'email' => 'unique:users,email,NULL,id,account_id,1',
    
    // Существует в таблице
    'user_id' => 'exists:users,id',
    
    // Существует с дополнительными условиями
    'category_id' => 'exists:categories,id,deleted_at,NULL',
]);
```

### 2.7 Правила для массивов

```php
$request->validate([
    // Это массив
    'tags' => 'array',
    
    // Массив с минимальным количеством элементов
    'items' => 'array|min:1',
    
    // Массив с максимальным количеством
    'options' => 'array|max:5',
    
    // Массив с определёнными ключами
    'user' => 'array:name,email',
    
    // Валидация каждого элемента массива
    'tags.*' => 'string|max:50',
    
    // Вложенные массивы
    'users.*.name' => 'required|string',
    'users.*.email' => 'required|email',
    
    // Массив должен содержать определённые значения
    'role' => 'in:admin,editor,viewer',
    
    // Массив НЕ должен содержать определённые значения
    'status' => 'not_in:draft,archived',
]);
```

### 2.8 Условная валидация

```php
$request->validate([
    // Обязательно, если другое поле имеет определённое значение
    'reason' => 'required_if:status,rejected',
    
    // Обязательно, если другое поле НЕ имеет определённое значение
    'alternative_email' => 'required_unless:email_verified,true',
    
    // Обязательно, если другое поле присутствует
    'last_name' => 'required_with:first_name',
    
    // Обязательно, если присутствуют ВСЕ указанные поля
    'city' => 'required_with_all:address,zip_code',
    
    // Обязательно, если другое поле отсутствует
    'mobile' => 'required_without:phone',
    
    // Обязательно, если отсутствуют ВСЕ указанные поля
    'emergency_contact' => 'required_without_all:phone,email',
    
    // Запрещено, если другое поле присутствует
    'new_password' => 'prohibited_if:is_locked,true',
    
    // Запрещено, если другое поле отсутствует
    'discount' => 'prohibited_unless:is_premium,true',
]);
```

---

## 3. Form Request Classes

Для больших форм лучше выносить валидацию в отдельные классы.

### 3.1 Создание Form Request

```bash
php artisan make:request StoreUserRequest
```

Это создаст файл `app/Http/Requests/StoreUserRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    /**
     * Определяет, имеет ли пользователь право делать этот запрос
     */
    public function authorize(): bool
    {
        // Вернуть true, если все могут создавать пользователей
        // Или добавить логику авторизации
        return true;
        
        // Пример: только админы могут создавать пользователей
        // return $this->user()->isAdmin();
    }

    /**
     * Правила валидации
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8|confirmed',
            'role' => 'required|in:admin,editor,viewer',
            'avatar' => 'nullable|image|max:2048',
        ];
    }

    /**
     * Кастомные сообщения об ошибках
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Пожалуйста, укажите имя',
            'email.required' => 'Email обязателен для заполнения',
            'email.email' => 'Введите корректный email адрес',
            'email.unique' => 'Этот email уже используется',
            'password.min' => 'Пароль должен содержать минимум :min символов',
            'password.confirmed' => 'Пароли не совпадают',
            'role.in' => 'Выбрана недопустимая роль',
        ];
    }

    /**
     * Кастомные названия атрибутов для сообщений
     */
    public function attributes(): array
    {
        return [
            'name' => 'имя',
            'email' => 'электронная почта',
            'password' => 'пароль',
        ];
    }
}
```

### 3.2 Использование Form Request в контроллере

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Models\User;

class UserController extends Controller
{
    public function store(StoreUserRequest $request)
    {
        // Валидация уже прошла!
        // Получаем только валидированные данные
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => bcrypt($validated['password']),
            'role' => $validated['role'],
        ]);

        // Загрузка аватара, если он есть
        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('avatars', 'public');
            $user->update(['avatar' => $path]);
        }

        return redirect()->route('users.show', $user)
            ->with('success', 'Пользователь успешно создан!');
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $validated = $request->validated();
        
        $user->update($validated);

        return redirect()->route('users.show', $user)
            ->with('success', 'Пользователь обновлён!');
    }
}
```

### 3.3 Дополнительная обработка данных

```php
class StoreUserRequest extends FormRequest
{
    // ... authorize() и rules()

    /**
     * Подготовка данных перед валидацией
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'slug' => Str::slug($this->name),
            'phone' => $this->cleanPhone($this->phone),
        ]);
    }

    /**
     * Фильтрация данных после валидации
     */
    public function passedValidation(): void
    {
        // Можно дополнительно модифицировать данные
        $this->merge([
            'email' => strtolower($this->email),
        ]);
    }

    /**
     * Получить только определённые поля
     */
    public function getUserData(): array
    {
        return $this->only(['name', 'email', 'role']);
    }

    private function cleanPhone(?string $phone): ?string
    {
        if (!$phone) {
            return null;
        }
        
        return preg_replace('/[^0-9+]/', '', $phone);
    }
}
```

---

## 4. Кастомные правила валидации

Когда встроенных правил недостаточно, создаём свои.

### 4.1 Создание кастомного правила

```bash
php artisan make:rule Uppercase
```

Создаётся файл `app/Rules/Uppercase.php`:

```php
<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class Uppercase implements ValidationRule
{
    /**
     * Выполнить правило валидации
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value !== strtoupper($value)) {
            $fail('Поле :attribute должно быть в верхнем регистре.');
        }
    }
}
```

### 4.2 Использование кастомного правила

```php
use App\Rules\Uppercase;

$request->validate([
    'code' => ['required', 'string', new Uppercase()],
]);
```

### 4.3 Правило с параметрами

```php
<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class MaxWords implements ValidationRule
{
    protected int $maxWords;

    public function __construct(int $maxWords)
    {
        $this->maxWords = $maxWords;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $wordCount = str_word_count($value);

        if ($wordCount > $this->maxWords) {
            $fail("Поле :attribute не должно содержать больше {$this->maxWords} слов.");
        }
    }
}
```

Использование:

```php
use App\Rules\MaxWords;

$request->validate([
    'description' => ['required', 'string', new MaxWords(100)],
]);
```

### 4.4 Правило с доступом к базе данных

```php
<?php

namespace App\Rules;

use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class UniqueUsername implements ValidationRule
{
    protected ?int $exceptUserId;

    public function __construct(?int $exceptUserId = null)
    {
        $this->exceptUserId = $exceptUserId;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $query = User::where('username', $value);

        if ($this->exceptUserId) {
            $query->where('id', '!=', $this->exceptUserId);
        }

        if ($query->exists()) {
            $fail('Это имя пользователя уже занято.');
        }
    }
}
```

### 4.5 Сложное кастомное правило

```php
<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class StrongPassword implements ValidationRule
{
    protected bool $requireUppercase = true;
    protected bool $requireLowercase = true;
    protected bool $requireNumbers = true;
    protected bool $requireSpecialChars = true;
    protected int $minLength = 8;

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $errors = [];

        if (strlen($value) < $this->minLength) {
            $errors[] = "минимум {$this->minLength} символов";
        }

        if ($this->requireUppercase && !preg_match('/[A-Z]/', $value)) {
            $errors[] = "хотя бы одна заглавная буква";
        }

        if ($this->requireLowercase && !preg_match('/[a-z]/', $value)) {
            $errors[] = "хотя бы одна строчная буква";
        }

        if ($this->requireNumbers && !preg_match('/[0-9]/', $value)) {
            $errors[] = "хотя бы одна цифра";
        }

        if ($this->requireSpecialChars && !preg_match('/[@$!%*?&#]/', $value)) {
            $errors[] = "хотя бы один специальный символ (@$!%*?&#)";
        }

        if (!empty($errors)) {
            $fail('Пароль должен содержать: ' . implode(', ', $errors) . '.');
        }
    }

    public function requireUppercase(bool $require = true): self
    {
        $this->requireUppercase = $require;
        return $this;
    }

    public function minLength(int $length): self
    {
        $this->minLength = $length;
        return $this;
    }
}
```

Использование:

```php
use App\Rules\StrongPassword;

$request->validate([
    'password' => [
        'required',
        (new StrongPassword())
            ->minLength(10)
            ->requireUppercase()
    ],
]);
```

---

## 5. Продвинутые техники валидации

### 5.1 Валидация с использованием замыканий

```php
use Illuminate\Validation\Rule;

$request->validate([
    'email' => [
        'required',
        'email',
        function (string $attribute, mixed $value, Closure $fail) {
            if (str_ends_with($value, '@example.com')) {
                $fail('Домен example.com не разрешён.');
            }
        },
    ],
]);
```

### 5.2 Условные правила

```php
$request->validate([
    'role' => 'required|in:admin,user',
    'permissions' => [
        Rule::requiredIf(function () use ($request) {
            return $request->role === 'admin';
        }),
        'array',
    ],
]);
```

### 5.3 Иногда применяемые правила

```php
use Illuminate\Validation\Rule;

$v = Validator::make($request->all(), [
    'email' => 'required|email',
]);

// Добавить правило только если поле присутствует
$v->sometimes('reason', 'required|max:500', function ($input) {
    return $input->status === 'rejected';
});

if ($v->fails()) {
    return redirect()->back()->withErrors($v)->withInput();
}
```

### 5.4 Массовая валидация вложенных данных

```php
$request->validate([
    'products' => 'required|array|min:1',
    'products.*.name' => 'required|string|max:255',
    'products.*.price' => 'required|numeric|min:0',
    'products.*.quantity' => 'required|integer|min:1',
    'products.*.category_id' => 'required|exists:categories,id',
]);
```

Данные запроса:

```json
{
    "products": [
        {
            "name": "Ноутбук",
            "price": 50000,
            "quantity": 2,
            "category_id": 1
        },
        {
            "name": "Мышь",
            "price": 500,
            "quantity": 5,
            "category_id": 2
        }
    ]
}
```

### 5.5 Валидация с динамическими правилами

```php
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'email',
                // Игнорируем текущего пользователя при проверке unique
                Rule::unique('users')->ignore($this->user),
            ],
            'role' => [
                'required',
                // Разрешённые роли зависят от прав текущего пользователя
                Rule::in($this->getAvailableRoles()),
            ],
        ];
    }

    protected function getAvailableRoles(): array
    {
        if ($this->user()->isAdmin()) {
            return ['admin', 'editor', 'viewer'];
        }

        return ['editor', 'viewer'];
    }
}
```

---

## 6. Работа с ошибками валидации

### 6.1 Кастомизация сообщений

```php
// В Form Request
public function messages(): array
{
    return [
        'email.required' => 'Без email никак!',
        'email.email' => 'Это не похоже на email',
        'password.min' => 'Слишком короткий пароль (минимум :min символов)',
        'products.*.price.numeric' => 'Цена продукта должна быть числом',
    ];
}
```

### 6.2 Кастомные имена атрибутов

```php
public function attributes(): array
{
    return [
        'email' => 'электронная почта',
        'products.*.name' => 'название продукта',
        'products.*.price' => 'цена продукта',
    ];
}
```

### 6.3 Получение ошибок в контроллере

```php
use Illuminate\Support\Facades\Validator;

$validator = Validator::make($request->all(), [
    'name' => 'required|string|max:255',
    'email' => 'required|email',
]);

if ($validator->fails()) {
    // Все ошибки
    $errors = $validator->errors();
    
    // Первая ошибка для поля
    $emailError = $errors->first('email');
    
    // Все ошибки для поля
    $emailErrors = $errors->get('email');
    
    // Все ошибки как массив
    $allErrors = $errors->all();
    
    // Есть ли ошибка для поля
    if ($errors->has('email')) {
        // ...
    }
    
    return response()->json([
        'errors' => $errors
    ], 422);
}
```

### 6.4 After валидация

```php
use Illuminate\Support\Facades\Validator;

$validator = Validator::make($request->all(), [
    'email' => 'required|email',
    'password' => 'required',
]);

// Добавить дополнительную проверку после основной валидации
$validator->after(function ($validator) use ($request) {
    if (!Hash::check($request->password, $user->password)) {
        $validator->errors()->add('password', 'Неверный пароль!');
    }
});

if ($validator->fails()) {
    return redirect()->back()->withErrors($validator)->withInput();
}
```

---

## 7. API валидация

### 7.1 JSON ответы с ошибками

Laravel автоматически возвращает JSON при запросах с заголовком `Accept: application/json`:

```php
// Автоматический JSON ответ при провале валидации
class StorePostRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'body' => 'required|string',
        ];
    }
}
```

Ответ при ошибке:

```json
{
    "message": "The title field is required. (and 1 more error)",
    "errors": {
        "title": [
            "The title field is required."
        ],
        "body": [
            "The body field is required."
        ]
    }
}
```

### 7.2 Кастомизация JSON ответа

```php
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StorePostRequest extends FormRequest
{
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Ошибка валидации',
                'errors' => $validator->errors()
            ], 422)
        );
    }
}
```

---

## 8. Практические примеры

### 8.1 Регистрация пользователя

```php
<?php

namespace App\Http\Requests;

use App\Rules\StrongPassword;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255|min:2',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => [
                'required',
                'confirmed',
                // Использование встроенного класса Password
                Password::min(8)
                    ->mixedCase()
                    ->numbers()
                    ->symbols()
                    ->uncompromised(), // Проверка по базе скомпрометированных паролей
            ],
            'terms' => 'required|accepted',
            'phone' => 'nullable|regex:/^([0-9\s\-\+\(\)]*)$/|min:10',
        ];
    }

    public function messages(): array
    {
        return [
            'terms.accepted' => 'Вы должны принять условия использования',
            'password.uncompromised' => 'Этот пароль ненадёжен. Пожалуйста, выберите другой.',
        ];
    }
}
```

### 8.2 Создание поста в блоге

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create-post');
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255|unique:posts,title',
            'slug' => [
                'nullable',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('posts', 'slug'),
            ],
            'body' => 'required|string|min:100',
            'excerpt' => 'nullable|string|max:500',
            'category_id' => 'required|exists:categories,id',
            'tags' => 'nullable|array|max:5',
            'tags.*' => 'exists:tags,id',
            'featured_image' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
            'status' => ['required', Rule::in(['draft', 'published'])],
            'published_at' => 'nullable|date|after:now',
            'meta_title' => 'nullable|string|max:60',
            'meta_description' => 'nullable|string|max:160',
        ];
    }

    protected function prepareForValidation(): void
    {
        // Автоматически создать slug из заголовка, если не указан
        if (!$this->slug && $this->title) {
            $this->merge([
                'slug' => Str::slug($this->title),
            ]);
        }
    }

    public function messages(): array
    {
        return [
            'body.min' => 'Содержание поста должно быть не менее :min символов',
            'tags.max' => 'Можно указать не более :max тегов',
            'featured_image.max' => 'Размер изображения не должен превышать 2MB',
        ];
    }
}
```

### 8.3 Форма заказа

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            // Информация о покупателе
            'customer.name' => 'required|string|max:255',
            'customer.email' => 'required|email',
            'customer.phone' => 'required|regex:/^([0-9\s\-\+\(\)]*)$/|min:10',
            
            // Адрес доставки
            'shipping.address' => 'required|string|max:500',
            'shipping.city' => 'required|string|max:100',
            'shipping.postal_code' => 'required|string|max:10',
            'shipping.country' => 'required|string|size:2', // ISO код страны
            
            // Товары
            'items' => 'required|array|min:1|max:50',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1|max:100',
            'items.*.price' => 'required|numeric|min:0',
            
            // Оплата
            'payment_method' => 'required|in:card,cash,bank_transfer',
            'promocode' => 'nullable|exists:promocodes,code',
            
            // Комментарии
            'notes' => 'nullable|string|max:1000',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Проверка доступности товаров
            foreach ($this->items as $index => $item) {
                $product = Product::find($item['product_id']);
                
                if ($product && $product->stock < $item['quantity']) {
                    $validator->errors()->add(
                        "items.{$index}.quantity",
                        "Недостаточно товара на складе (доступно: {$product->stock})"
                    );
                }
            }
        });
    }
}
```

---

## 9. Упражнения

### Упражнение 1: Базовая валидация
Создайте форму регистрации с полями:
- Имя (обязательно, минимум 2 символа)
- Email (обязательно, уникальный)
- Пароль (минимум 8 символов, с подтверждением)
- Дата рождения (обязательно, пользователю должно быть минимум 18 лет)

### Упражнение 2: Form Request
Создайте Form Request для создания статьи блога с полями:
- Заголовок (обязательно, уникальный, максимум 255 символов)
- Содержание (обязательно, минимум 500 символов)
- Категория (обязательно, должна существовать в БД)
- Теги (необязательно, массив, максимум 5 тегов)
- Изображение (необязательно, только jpg/png, максимум 5MB)

### Упражнение 3: Кастомное правило
Создайте правило валидации `PhoneNumber`, которое проверяет российские номера телефонов:
- Начинается с +7 или 8
- Содержит 11 цифр
- Может содержать пробелы, дефисы и скобки

### Упражнение 4: Сложная валидация
Создайте форму бронирования отеля с валидацией:
- Дата заезда (не может быть в прошлом)
- Дата выезда (должна быть после даты заезда)
- Количество гостей (минимум 1, максимум зависит от типа номера)
- Тип номера (выбор из доступных)
- Дополнительные услуги (необязательный массив)

---

## 10. Лучшие практики

### ✅ DO (Делать)

1. **Используйте Form Requests для сложных форм**
   ```php
   // ✅ Хорошо
   public function store(StoreUserRequest $request)
   {
       $user = User::create($request->validated());
   }
   ```

2. **Валидируйте на уровне запроса, не на уровне модели**
   ```php
   // ✅ Валидация в контроллере/Form Request
   // ❌ Не валидируйте в модели (не та ответственность)
   ```

3. **Используйте prepared statements (Laravel делает это автоматически)**
   ```php
   // ✅ Безопасно (Laravel использует bindings)
   User::where('email', $request->email)->first();
   ```

4. **Всегда используйте `validated()` для получения данных**
   ```php
   // ✅ Только валидированные данные
   $data = $request->validated();
   
   // ❌ Может содержать невалидированные данные
   $data = $request->all();
   ```

5. **Создавайте понятные сообщения об ошибках**
   ```php
   // ✅ Понятно пользователю
   'email.unique' => 'Этот email уже зарегистрирован'
   
   // ❌ Технический жаргон
   'email.unique' => 'Violation of unique constraint'
   ```

### ❌ DON'T (Не делать)

1. **Не доверяйте входным данным**
   ```php
   // ❌ Плохо
   User::create($request->all());
   
   // ✅ Хорошо
   User::create($request->validated());
   ```

2. **Не игнорируйте валидацию "потому что это внутренний инструмент"**
   ```php
   // ❌ Опасно даже для админки
   if ($request->has('sql')) {
       DB::statement($request->sql);
   }
   ```

3. **Не создавайте слишком общие Form Requests**
   ```php
   // ❌ Один класс для create и update
   class UserRequest extends FormRequest { }
   
   // ✅ Разделите логику
   class StoreUserRequest extends FormRequest { }
   class UpdateUserRequest extends FormRequest { }
   ```

4. **Не перегружайте валидацию бизнес-логикой**
   ```php
   // ❌ Слишком много логики
   public function withValidator($validator) {
       $validator->after(function ($validator) {
           // 50 строк кода проверок
       });
   }
   
   // ✅ Вынесите в Service или Action класс
   ```

---

## Заключение

Валидация в Laravel — это мощный инструмент для обеспечения целостности данных и безопасности приложения. Ключевые моменты:

1. **Laravel предоставляет 70+ встроенных правил** — изучите их
2. **Form Requests** — лучший способ организации валидации для сложных форм
3. **Кастомные правила** — когда встроенных недостаточно
4. **Валидация — это не только безопасность**, но и UX — давайте понятные сообщения об ошибках
5. **Всегда используйте `validated()`** для получения только проверенных данных

В следующей главе мы изучим **Очереди и Jobs** — как выполнять тяжёлые задачи в фоне, не заставляя пользователя ждать! 🚀