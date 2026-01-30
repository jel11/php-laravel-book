# Глава 8.4: Blade шаблонизатор — директивы, layouts, components, slots

## Введение

Blade — это мощный и элегантный шаблонизатор Laravel, который делает создание представлений (views) простым и приятным. В отличие от чистого PHP в HTML, Blade предоставляет чистый синтаксис для вывода данных, управления потоком выполнения и переиспользования кода.

**Ключевые преимущества Blade:**
- Чистый, читаемый синтаксис
- Автоматическое экранирование XSS
- Наследование шаблонов и секции
- Компоненты для переиспользования UI
- Компиляция в чистый PHP (высокая производительность)

## 8.4.1 Основы синтаксиса Blade

### Вывод данных

```php
{{-- resources/views/welcome.blade.php --}}

{{-- Экранированный вывод (защита от XSS) --}}
<h1>{{ $title }}</h1>
<p>{{ $user->name }}</p>

{{-- Неэкранированный вывод (используйте осторожно!) --}}
<div>{!! $htmlContent !!}</div>

{{-- Вывод с fallback значением --}}
<p>{{ $name ?? 'Гость' }}</p>

{{-- Короткая запись echo --}}
Hello, {{ $name }}.
```

**В контроллере:**

```php
// app/Http/Controllers/PageController.php

public function welcome()
{
    return view('welcome', [
        'title' => 'Добро пожаловать!',
        'name' => 'Jell',
        'htmlContent' => '<strong>Важно</strong>',
    ]);
}
```

### Комментарии

```blade
{{-- Это комментарий Blade, он не попадёт в HTML --}}

<!-- Это HTML комментарий, он попадёт в код страницы -->
```

## 8.4.2 Директивы управления потоком

### Условия: @if, @elseif, @else, @unless

```blade
{{-- resources/views/profile.blade.php --}}

@if ($user->isAdmin())
    <p>Панель администратора</p>
@elseif ($user->isModerator())
    <p>Панель модератора</p>
@else
    <p>Обычный профиль</p>
@endif

{{-- @unless - обратное условие (if not) --}}
@unless ($user->isSubscribed())
    <div class="alert">Подпишитесь на премиум!</div>
@endunless

{{-- @isset и @empty --}}
@isset($records)
    <p>Записей: {{ count($records) }}</p>
@endisset

@empty($records)
    <p>Нет записей</p>
@endempty
```

### Проверка аутентификации

```blade
@auth
    <p>Привет, {{ auth()->user()->name }}!</p>
    <a href="/logout">Выйти</a>
@endauth

@guest
    <a href="/login">Войти</a>
    <a href="/register">Регистрация</a>
@endguest

{{-- Проверка для конкретного guard --}}
@auth('admin')
    <p>Панель админа</p>
@endauth
```

### Циклы: @foreach, @for, @while

```blade
{{-- @foreach --}}
<ul>
@foreach ($users as $user)
    <li>{{ $user->name }}</li>
@endforeach
</ul>

{{-- @forelse - foreach с обработкой пустого массива --}}
<table>
@forelse ($products as $product)
    <tr>
        <td>{{ $product->name }}</td>
        <td>{{ $product->price }} ₽</td>
    </tr>
@empty
    <tr>
        <td colspan="2">Товаров нет</td>
    </tr>
@endforelse
</table>

{{-- @for --}}
@for ($i = 0; $i < 10; $i++)
    <p>Итерация {{ $i }}</p>
@endfor

{{-- @while --}}
@while (true)
    <p>Бесконечный цикл (так не делайте!)</p>
    @break
@endwhile
```

### Переменная $loop в циклах

```blade
@foreach ($items as $item)
    <div class="item
        @if ($loop->first) first @endif
        @if ($loop->last) last @endif
    ">
        <p>Элемент #{{ $loop->iteration }} из {{ $loop->count }}</p>
        <p>Индекс: {{ $loop->index }} (с нуля)</p>
        <p>Осталось: {{ $loop->remaining }}</p>
        
        @if ($loop->even)
            <span>Чётная строка</span>
        @endif
        
        @if ($loop->depth > 1)
            <span>Вложенный цикл</span>
        @endif
    </div>
@endforeach
```

### Switch-case: @switch

```blade
@switch($user->role)
    @case('admin')
        <p>Администратор</p>
        @break

    @case('moderator')
        <p>Модератор</p>
        @break

    @default
        <p>Пользователь</p>
@endswitch
```

## 8.4.3 Layouts и наследование шаблонов

### Создание главного layout

```blade
{{-- resources/views/layouts/app.blade.php --}}

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Мой сайт')</title>
    
    {{-- Подключение стилей --}}
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
    
    {{-- Дополнительные стили для конкретных страниц --}}
    @stack('styles')
</head>
<body>
    {{-- Шапка сайта --}}
    <header>
        <nav>
            <a href="/">Главная</a>
            <a href="/about">О нас</a>
            @auth
                <a href="/profile">Профиль</a>
            @endauth
        </nav>
    </header>

    {{-- Основной контент --}}
    <main>
        @yield('content')
    </main>

    {{-- Футер --}}
    <footer>
        @section('footer')
            <p>&copy; 2026 Моя компания</p>
        @show
    </footer>

    {{-- Скрипты --}}
    <script src="{{ asset('js/app.js') }}"></script>
    @stack('scripts')
</body>
</html>
```

### Использование layout в странице

```blade
{{-- resources/views/pages/about.blade.php --}}

@extends('layouts.app')

@section('title', 'О нас')

@section('content')
    <h1>О нашей компании</h1>
    <p>Мы занимаемся разработкой веб-приложений с 2020 года.</p>
    
    <h2>Наша команда</h2>
    <ul>
        @foreach ($team as $member)
            <li>{{ $member->name }} - {{ $member->position }}</li>
        @endforeach
    </ul>
@endsection

@section('footer')
    @parent {{-- Включает контент из родительского шаблона --}}
    <p>Дополнительная информация в футере</p>
@endsection

@push('styles')
    <link rel="stylesheet" href="{{ asset('css/about.css') }}">
@endpush

@push('scripts')
    <script src="{{ asset('js/team-animations.js') }}"></script>
@endpush
```

### Разница между @yield и @section

```blade
{{-- @yield - простая замена контента --}}
<title>@yield('title')</title>

{{-- @section + @show - контент с возможностью расширения --}}
@section('sidebar')
    <p>Боковая панель по умолчанию</p>
@show

{{-- В дочернем шаблоне можно расширить --}}
@section('sidebar')
    @parent {{-- Включает родительский контент --}}
    <p>Дополнительный контент</p>
@endsection
```

## 8.4.4 Подключение частей шаблонов: @include

### Простое включение

```blade
{{-- resources/views/partials/alert.blade.php --}}

<div class="alert alert-{{ $type }}">
    {{ $message }}
</div>
```

```blade
{{-- Использование в другом шаблоне --}}

@include('partials.alert', ['type' => 'success', 'message' => 'Данные сохранены!'])

@include('partials.alert', [
    'type' => 'danger',
    'message' => 'Произошла ошибка'
])
```

### @includeIf, @includeWhen, @includeFirst

```blade
{{-- Включить, если файл существует --}}
@includeIf('partials.custom-header')

{{-- Включить по условию --}}
@includeWhen($user->isAdmin(), 'partials.admin-panel')

{{-- Включить первый существующий шаблон --}}
@includeFirst(['custom.header', 'partials.header', 'default.header'])
```

### @each - цикл с include

```blade
{{-- resources/views/partials/product-card.blade.php --}}

<div class="product-card">
    <h3>{{ $product->name }}</h3>
    <p>{{ $product->price }} ₽</p>
</div>
```

```blade
{{-- Использование --}}

@each('partials.product-card', $products, 'product')

{{-- С шаблоном для пустого массива --}}
@each('partials.product-card', $products, 'product', 'partials.no-products')
```

## 8.4.5 Компоненты Blade

Компоненты — это более мощная альтернатива @include. Они позволяют создавать переиспользуемые части UI с изолированной логикой.

### Анонимные компоненты (простые)

**Создание компонента:**

```blade
{{-- resources/views/components/alert.blade.php --}}

@props(['type' => 'info', 'dismissible' => false])

<div class="alert alert-{{ $type }} {{ $dismissible ? 'alert-dismissible' : '' }}">
    @if ($dismissible)
        <button type="button" class="btn-close"></button>
    @endif
    
    {{ $slot }}
</div>
```

**Использование:**

```blade
<x-alert type="success">
    Операция выполнена успешно!
</x-alert>

<x-alert type="danger" :dismissible="true">
    Произошла ошибка!
</x-alert>
```

### Компоненты с классами (продвинутые)

**Создание через artisan:**

```bash
php artisan make:component Button
```

**Класс компонента:**

```php
<?php
// app/View/Components/Button.php

namespace App\View\Components;

use Illuminate\View\Component;

class Button extends Component
{
    public string $type;
    public string $size;
    public bool $disabled;

    public function __construct(
        string $type = 'primary',
        string $size = 'md',
        bool $disabled = false
    ) {
        $this->type = $type;
        $this->size = $size;
        $this->disabled = $disabled;
    }

    public function buttonClass(): string
    {
        return "btn btn-{$this->type} btn-{$this->size}";
    }

    public function render()
    {
        return view('components.button');
    }
}
```

**Шаблон компонента:**

```blade
{{-- resources/views/components/button.blade.php --}}

<button 
    {{ $attributes->merge(['class' => $buttonClass()]) }}
    @if ($disabled) disabled @endif
>
    {{ $slot }}
</button>
```

**Использование:**

```blade
<x-button type="success" size="lg">
    Сохранить
</x-button>

<x-button type="danger" :disabled="true" class="mt-4">
    Удалить
</x-button>
```

### Слоты (slots) в компонентах

**Именованные слоты:**

```blade
{{-- resources/views/components/card.blade.php --}}

@props(['title'])

<div class="card">
    <div class="card-header">
        <h3>{{ $title }}</h3>
    </div>
    
    <div class="card-body">
        {{ $slot }}
    </div>
    
    @isset($footer)
        <div class="card-footer">
            {{ $footer }}
        </div>
    @endisset
</div>
```

**Использование:**

```blade
<x-card title="Профиль пользователя">
    <p>Имя: {{ $user->name }}</p>
    <p>Email: {{ $user->email }}</p>
    
    <x-slot:footer>
        <button>Редактировать</button>
    </x-slot:footer>
</x-card>
```

### Атрибуты компонентов: $attributes

```blade
{{-- resources/views/components/input.blade.php --}}

@props(['label', 'name', 'type' => 'text'])

<div class="form-group">
    <label for="{{ $name }}">{{ $label }}</label>
    
    <input 
        type="{{ $type }}"
        name="{{ $name }}"
        id="{{ $name }}"
        {{ $attributes->merge(['class' => 'form-control']) }}
    >
</div>
```

**Использование:**

```blade
<x-input 
    label="Email" 
    name="email" 
    type="email"
    class="custom-input"
    required
    placeholder="your@email.com"
/>
```

### Условная обработка атрибутов

```blade
@props(['active' => false])

<a 
    {{ $attributes->class([
        'nav-link',
        'active' => $active,
        'disabled' => !$active
    ]) }}
>
    {{ $slot }}
</a>
```

## 8.4.6 Продвинутые директивы

### @php - встроенный PHP код

```blade
@php
    $discountPrice = $price * 0.8;
    $formattedPrice = number_format($discountPrice, 2);
@endphp

<p>Цена со скидкой: {{ $formattedPrice }} ₽</p>
```

**⚠️ Важно:** Старайтесь избегать сложной логики в шаблонах. Вычисления лучше делать в контроллере или модели.

### @json - безопасный вывод JSON

```blade
<script>
    const user = @json($user);
    const settings = @json($settings, JSON_PRETTY_PRINT);
</script>
```

### @verbatim - игнорирование синтаксиса Blade

```blade
@verbatim
    <div>
        {{ это не будет обработано Blade }}
        Полезно для Vue.js или других фреймворков
    </div>
@endverbatim
```

### Собственные директивы

**Регистрация директивы:**

```php
<?php
// app/Providers/AppServiceProvider.php

use Illuminate\Support\Facades\Blade;

public function boot()
{
    Blade::directive('datetime', function ($expression) {
        return "<?php echo ($expression)->format('d.m.Y H:i'); ?>";
    });
    
    Blade::if('admin', function () {
        return auth()->check() && auth()->user()->isAdmin();
    });
}
```

**Использование:**

```blade
<p>Создано: @datetime($post->created_at)</p>

@admin
    <button>Редактировать</button>
@endadmin
```

## 8.4.7 Практические примеры

### Пример 1: Система уведомлений

**Компонент уведомления:**

```blade
{{-- resources/views/components/notification.blade.php --}}

@props(['type' => 'info', 'icon' => null])

@php
    $icons = [
        'success' => '✓',
        'error' => '✗',
        'warning' => '⚠',
        'info' => 'ℹ'
    ];
    
    $displayIcon = $icon ?? $icons[$type] ?? $icons['info'];
@endphp

<div {{ $attributes->merge(['class' => "notification notification-$type"]) }}>
    <span class="notification-icon">{{ $displayIcon }}</span>
    <div class="notification-content">
        {{ $slot }}
    </div>
</div>
```

**Использование:**

```blade
@if (session('success'))
    <x-notification type="success">
        {{ session('success') }}
    </x-notification>
@endif

@if ($errors->any())
    <x-notification type="error">
        <ul>
            @foreach ($errors->all() as $error)
                <li>{{ $error }}</li>
            @endforeach
        </ul>
    </x-notification>
@endif
```

### Пример 2: Форма с компонентами

**Input компонент:**

```blade
{{-- resources/views/components/form/input.blade.php --}}

@props([
    'name',
    'label',
    'type' => 'text',
    'value' => '',
    'required' => false
])

<div class="mb-3">
    <label for="{{ $name }}" class="form-label">
        {{ $label }}
        @if ($required)
            <span class="text-danger">*</span>
        @endif
    </label>
    
    <input 
        type="{{ $type }}"
        name="{{ $name }}"
        id="{{ $name }}"
        value="{{ old($name, $value) }}"
        {{ $attributes->merge(['class' => 'form-control']) }}
        @if ($required) required @endif
    >
    
    @error($name)
        <div class="text-danger mt-1">{{ $message }}</div>
    @enderror
</div>
```

**Использование:**

```blade
<form method="POST" action="/register">
    @csrf
    
    <x-form.input 
        name="name" 
        label="Имя" 
        :required="true"
    />
    
    <x-form.input 
        name="email" 
        label="Email" 
        type="email"
        :required="true"
    />
    
    <x-form.input 
        name="password" 
        label="Пароль" 
        type="password"
        :required="true"
    />
    
    <x-button type="submit">Зарегистрироваться</x-button>
</form>
```

### Пример 3: Layout с sidebar

```blade
{{-- resources/views/layouts/dashboard.blade.php --}}

@extends('layouts.app')

@section('content')
    <div class="dashboard-container">
        <aside class="sidebar">
            @include('partials.sidebar')
        </aside>
        
        <main class="main-content">
            @if (session('message'))
                <x-notification type="success">
                    {{ session('message') }}
                </x-notification>
            @endif
            
            @yield('dashboard-content')
        </main>
    </div>
@endsection
```

## 8.4.8 Лучшие практики

### ✅ DO: Хорошие практики

```blade
{{-- 1. Используйте компоненты для переиспользуемого UI --}}
<x-button type="primary">Сохранить</x-button>

{{-- 2. Выносите сложную логику в контроллер --}}
{{-- Контроллер: $formattedDate = $post->created_at->format('d.m.Y'); --}}
<p>{{ $formattedDate }}</p>

{{-- 3. Используйте @forelse вместо @foreach + @if --}}
@forelse ($items as $item)
    <li>{{ $item->name }}</li>
@empty
    <li>Нет элементов</li>
@endforelse

{{-- 4. Группируйте связанные директивы --}}
@auth
    @can('edit', $post)
        <button>Редактировать</button>
    @endcan
@endauth
```

### ❌ DON'T: Плохие практики

```blade
{{-- 1. Не пишите бизнес-логику в шаблонах --}}
@php
    // Плохо!
    $total = 0;
    foreach ($orders as $order) {
        $total += $order->total * (1 - $order->discount / 100);
    }
@endphp

{{-- 2. Не используйте сложные вычисления inline --}}
{{ $user->orders->where('status', 'completed')->sum('total') * 0.1 }}

{{-- 3. Не дублируйте HTML, используйте компоненты --}}
<div class="alert alert-success">...</div>
<div class="alert alert-danger">...</div>
<div class="alert alert-warning">...</div>
```

## 8.4.9 Упражнения

### Упражнение 1: Создание layout
Создайте главный layout с:
- Шапкой с навигацией
- Секцией для flash-сообщений
- Футером с текущим годом
- Возможностью добавлять кастомные стили и скрипты

### Упражнение 2: Компонент карточки товара
Создайте компонент `product-card` с:
- Изображением товара
- Названием и ценой
- Кнопкой "В корзину"
- Бейджем "Скидка" (если есть)
- Рейтингом звездами

### Упражнение 3: Форма с валидацией
Создайте компоненты формы:
- `form/input` - текстовое поле
- `form/textarea` - многострочное поле
- `form/select` - выпадающий список
- Все с поддержкой old() и @error

### Упражнение 4: Таблица с сортировкой
Создайте компонент таблицы с:
- Заголовками с возможностью сортировки
- Индикатором текущей сортировки
- Пагинацией
- Использованием @forelse

## 8.4.10 Практическое задание

Создайте систему блога с использованием Blade:

**Требования:**

1. **Layout (`layouts/blog.blade.php`):**
   - Шапка с логотипом и меню
   - Sidebar с категориями и популярными постами
   - Футер с информацией

2. **Компоненты:**
   - `post-card` - карточка поста (превью)
   - `comment` - комментарий
   - `category-badge` - бейдж категории
   - `pagination` - пагинация

3. **Страницы:**
   - `posts/index.blade.php` - список постов (сетка)
   - `posts/show.blade.php` - отдельный пост с комментариями
   - `categories/show.blade.php` - посты категории

4. **Дополнительно:**
   - Breadcrumbs (хлебные крошки)
   - Share buttons (кнопки поделиться)
   - Related posts (похожие посты)

**Пример контроллера:**

```php
public function index()
{
    $posts = Post::with('category', 'author')
        ->latest()
        ->paginate(12);
    
    $categories = Category::withCount('posts')->get();
    $popularPosts = Post::popular()->limit(5)->get();
    
    return view('posts.index', compact('posts', 'categories', 'popularPosts'));
}
```

## Резюме

В этой главе вы изучили:

✅ **Основы Blade:**
- Вывод данных с экранированием
- Директивы управления потоком (@if, @foreach, @switch)
- Специальные директивы (@auth, @guest, @env)

✅ **Layouts и наследование:**
- Создание главных шаблонов
- @extends, @section, @yield
- @parent для расширения секций
- @stack/@push для скриптов и стилей

✅ **Компоненты:**
- Анонимные компоненты для простых случаев
- Компоненты с классами для сложной логики
- Слоты (slots) для гибкого контента
- Управление атрибутами ($attributes)

✅ **Продвинутые возможности:**
- Создание собственных директив
- @json для безопасного вывода
- @verbatim для других фреймворков
- Лучшие практики шаблонизации

**Следующий шаг:** Глава 8.5 — Eloquent ORM, где вы научитесь элегантно работать с базой данных через модели Laravel.

---

**Вопросы для самопроверки:**

1. В чём разница между `{{ }}` и `{!! !!}`?
2. Когда использовать @yield, а когда @section/@show?
3. Какие преимущества у компонентов перед @include?
4. Как передать переменную из layout в дочерний шаблон?
5. Что делает директива @forelse?