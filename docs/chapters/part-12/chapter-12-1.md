# Глава 12.1: JavaScript основы для PHP-разработчика — DOM, события, fetch API

## Введение

Как PHP-разработчик, вы уже освоили серверную часть веб-приложений. Но современный веб — это симбиоз сервера и клиента. JavaScript — это язык, который оживляет ваши страницы, делает их интерактивными и позволяет общаться с сервером без перезагрузки.

**Что вы узнаете:**
- Как JavaScript работает в браузере и чем отличается от PHP
- Манипуляции с DOM — изменение страницы "на лету"
- Обработка событий — реакция на действия пользователя
- Fetch API — современный способ отправки AJAX-запросов
- Интеграция с вашим Laravel-бэкендом

## 1. PHP vs JavaScript: ключевые отличия

### 1.1. Где выполняется код

```php
// PHP — выполняется на СЕРВЕРЕ
<?php
$users = User::all(); // Запрос к БД на сервере
echo view('users', ['users' => $users]); // HTML генерируется на сервере
```

```javascript
// JavaScript — выполняется в БРАУЗЕРЕ
const button = document.querySelector('button');
button.addEventListener('click', () => {
    alert('Привет!'); // Это работает У ПОЛЬЗОВАТЕЛЯ
});
```

**Ключевое отличие:** PHP умирает после генерации HTML. JavaScript живет и работает после загрузки страницы.

### 1.2. Синтаксис: знакомое и новое

```javascript
// Переменные — три способа объявления
var old = 'устаревший способ'; // Не используйте var
let count = 0;                  // Можно изменять
const API_URL = '/api/users';   // Константа (но объекты мутабельны!)

// Типы данных (динамическая типизация, как в PHP)
let name = "John";              // string
let age = 25;                   // number (нет int/float!)
let isActive = true;            // boolean
let data = null;                // null
let notDefined;                 // undefined (отличие от null!)
let user = { name: "John" };    // object (ассоциативный массив)
let tags = ["php", "js"];       // array (на самом деле тоже object)

// Функции
function greet(name) {
    return `Привет, ${name}!`; // Template literals — как "" в PHP
}

// Arrow functions (короткая запись)
const greet = (name) => `Привет, ${name}!`;

// Аналог foreach в PHP
tags.forEach(tag => {
    console.log(tag); // console.log — это echo для браузера
});
```

### 1.3. Объекты и массивы

```javascript
// Объект — аналог ассоциативного массива PHP
const user = {
    name: 'John',
    email: 'john@example.com',
    greet() {  // Метод объекта
        return `Hi, I'm ${this.name}`;
    }
};

console.log(user.name);        // John
console.log(user['email']);    // john@example.com
console.log(user.greet());     // Hi, I'm John

// Массив
const numbers = [1, 2, 3, 4, 5];

// Полезные методы массивов
const doubled = numbers.map(n => n * 2);        // [2, 4, 6, 8, 10]
const evens = numbers.filter(n => n % 2 === 0); // [2, 4]
const sum = numbers.reduce((acc, n) => acc + n, 0); // 15
```

## 2. DOM (Document Object Model)

DOM — это представление HTML-страницы в виде дерева объектов, с которым можно работать через JavaScript.

### 2.1. Поиск элементов

```html
<!DOCTYPE html>
<html>
<body>
    <div id="app">
        <h1 class="title">Список задач</h1>
        <ul class="tasks">
            <li class="task">Изучить DOM</li>
            <li class="task">Изучить события</li>
        </ul>
        <button id="add-task">Добавить задачу</button>
    </div>

    <script>
        // Поиск по ID (самый быстрый)
        const app = document.getElementById('app');
        
        // Поиск по селектору (как в CSS)
        const title = document.querySelector('.title');
        const button = document.querySelector('#add-task');
        
        // Поиск всех элементов (возвращает NodeList)
        const tasks = document.querySelectorAll('.task');
        
        // Устаревшие методы (не используйте)
        // document.getElementsByClassName('task')
        // document.getElementsByTagName('li')
    </script>
</body>
</html>
```

### 2.2. Изменение содержимого

```javascript
// Изменение текста
const title = document.querySelector('.title');
title.textContent = 'Мои задачи'; // Безопасно (экранирует HTML)
title.innerText = 'Мои задачи';   // То же, но медленнее

// Изменение HTML
const container = document.querySelector('.tasks');
container.innerHTML = '<li>Новая задача</li>'; // ОПАСНО! XSS-уязвимость!

// Безопасная альтернатива — создание элементов
const li = document.createElement('li');
li.textContent = 'Новая задача';
container.appendChild(li);
```

**⚠️ ВАЖНО:** `innerHTML` подвержен XSS-атакам, как и `echo` в PHP без экранирования!

```javascript
// ПЛОХО — XSS-уязвимость
const userInput = '<img src=x onerror=alert("XSS")>';
element.innerHTML = userInput; // Выполнится JavaScript!

// ХОРОШО — безопасно
element.textContent = userInput; // Отобразится как текст
```

### 2.3. Работа с атрибутами и классами

```javascript
const button = document.querySelector('button');

// Атрибуты
button.getAttribute('id');           // 'add-task'
button.setAttribute('disabled', ''); // Отключить кнопку
button.removeAttribute('disabled');  // Включить обратно
button.hasAttribute('disabled');     // false

// Классы
button.classList.add('active');       // Добавить класс
button.classList.remove('active');    // Удалить класс
button.classList.toggle('active');    // Переключить
button.classList.contains('active');  // Проверить наличие

// Стили (лучше использовать классы!)
button.style.backgroundColor = 'red';
button.style.fontSize = '16px';
```

### 2.4. Создание и удаление элементов

```javascript
// Создание элемента
const newTask = document.createElement('li');
newTask.classList.add('task');
newTask.textContent = 'Изучить Fetch API';

// Добавление в конец
const taskList = document.querySelector('.tasks');
taskList.appendChild(newTask);

// Добавление в начало
taskList.prepend(newTask);

// Вставка перед/после элемента
const firstTask = taskList.querySelector('.task');
firstTask.before(newTask);  // Перед
firstTask.after(newTask);   // После

// Удаление элемента
newTask.remove();

// Замена элемента
const replacement = document.createElement('li');
replacement.textContent = 'Замена';
newTask.replaceWith(replacement);
```

## 3. События

События — это способ JavaScript реагировать на действия пользователя.

### 3.1. Основы обработки событий

```javascript
const button = document.querySelector('#add-task');

// Современный способ (используйте его!)
button.addEventListener('click', function(event) {
    console.log('Кнопка нажата!');
    console.log(event); // Объект события с информацией
});

// Arrow function (предпочтительно)
button.addEventListener('click', (event) => {
    console.log('Кнопка нажата!');
});

// Устаревший способ (НЕ используйте)
button.onclick = function() {
    console.log('Плохой способ');
};
```

### 3.2. Объект события

```javascript
button.addEventListener('click', (event) => {
    console.log(event.type);        // 'click'
    console.log(event.target);      // Элемент, на котором произошло событие
    console.log(event.currentTarget); // Элемент, на котором установлен обработчик
    
    event.preventDefault();  // Отменить действие по умолчанию
    event.stopPropagation(); // Остановить всплытие события
});
```

### 3.3. Типы событий

```javascript
// Клики мышью
element.addEventListener('click', handler);
element.addEventListener('dblclick', handler);
element.addEventListener('contextmenu', handler); // Правая кнопка

// Ввод текста
input.addEventListener('input', (e) => {
    console.log(e.target.value); // Текущее значение input
});
input.addEventListener('change', handler);  // При потере фокуса
input.addEventListener('focus', handler);
input.addEventListener('blur', handler);

// Формы
form.addEventListener('submit', (e) => {
    e.preventDefault(); // ВАЖНО! Останавливает отправку формы
    // Теперь можем обработать данные сами
});

// Клавиатура
document.addEventListener('keydown', (e) => {
    console.log(e.key);      // Нажатая клавиша
    console.log(e.code);     // Код клавиши
    if (e.key === 'Enter') {
        console.log('Enter нажат!');
    }
});

// Страница
window.addEventListener('load', handler);      // Все ресурсы загружены
document.addEventListener('DOMContentLoaded', handler); // DOM готов (быстрее!)
window.addEventListener('scroll', handler);
window.addEventListener('resize', handler);
```

### 3.4. Делегирование событий

**Проблема:** Если добавлять обработчики на каждый элемент списка — это медленно и расточительно.

```javascript
// ПЛОХО — обработчик на каждый элемент
document.querySelectorAll('.task').forEach(task => {
    task.addEventListener('click', () => {
        console.log('Задача нажата');
    });
});
// Проблема: новые элементы не будут иметь обработчика!
```

**Решение:** Делегирование — обработчик на родителе, проверка target.

```javascript
// ХОРОШО — один обработчик на родителе
const taskList = document.querySelector('.tasks');

taskList.addEventListener('click', (event) => {
    // Проверяем, что кликнули именно по .task
    if (event.target.classList.contains('task')) {
        console.log('Задача нажата:', event.target.textContent);
        event.target.classList.toggle('completed');
    }
});

// Теперь новые задачи автоматически будут обрабатываться!
```

### 3.5. Практический пример: TODO-список

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        .completed { text-decoration: line-through; color: gray; }
        .task { cursor: pointer; padding: 8px; }
        .task:hover { background: #f0f0f0; }
    </style>
</head>
<body>
    <div id="app">
        <h1>Мои задачи</h1>
        <form id="task-form">
            <input type="text" id="task-input" placeholder="Новая задача" required>
            <button type="submit">Добавить</button>
        </form>
        <ul id="task-list"></ul>
    </div>

    <script>
        const form = document.getElementById('task-form');
        const input = document.getElementById('task-input');
        const taskList = document.getElementById('task-list');

        // Добавление задачи
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const taskText = input.value.trim();
            if (!taskText) return;

            const li = document.createElement('li');
            li.className = 'task';
            li.textContent = taskText;
            
            taskList.appendChild(li);
            input.value = '';
            input.focus();
        });

        // Отметка выполненной (делегирование)
        taskList.addEventListener('click', (e) => {
            if (e.target.classList.contains('task')) {
                e.target.classList.toggle('completed');
            }
        });
    </script>
</body>
</html>
```

## 4. Fetch API — общение с сервером

Fetch — это современный способ отправки AJAX-запросов. Это аналог `file_get_contents()` или Guzzle в PHP, но для браузера.

### 4.1. Базовый GET-запрос

```javascript
// Простейший запрос
fetch('/api/users')
    .then(response => response.json())  // Парсим JSON
    .then(data => {
        console.log(data); // Данные от сервера
    })
    .catch(error => {
        console.error('Ошибка:', error);
    });

// С async/await (современный способ)
async function getUsers() {
    try {
        const response = await fetch('/api/users');
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error('Ошибка:', error);
    }
}
```

### 4.2. Laravel API endpoint

```php
// routes/api.php
Route::get('/users', function () {
    return User::all(); // Laravel автоматически вернет JSON
});
```

```javascript
// JavaScript
async function loadUsers() {
    const response = await fetch('/api/users');
    const users = await response.json();
    
    const userList = document.getElementById('users');
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = `${user.name} (${user.email})`;
        userList.appendChild(li);
    });
}
```

### 4.3. POST-запрос с данными

```javascript
async function createUser(userData) {
    const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify(userData) // Конвертируем объект в JSON
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
}

// Использование
const newUser = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'secret123'
};

createUser(newUser)
    .then(user => console.log('Создан:', user))
    .catch(error => console.error('Ошибка:', error));
```

### 4.4. Laravel API с валидацией

```php
// app/Http/Controllers/UserController.php
class UserController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:8',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json($user, 201);
    }
}
```

```javascript
// JavaScript с обработкой ошибок валидации
async function createUser(formData) {
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': getCsrfToken()
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            // Laravel возвращает ошибки валидации в формате:
            // { "message": "...", "errors": { "email": ["Email уже занят"] } }
            if (data.errors) {
                displayValidationErrors(data.errors);
            }
            throw new Error(data.message);
        }

        return data;
    } catch (error) {
        console.error('Ошибка создания пользователя:', error);
        throw error;
    }
}

function displayValidationErrors(errors) {
    // errors = { email: ["Email уже занят"], name: ["Имя обязательно"] }
    for (const [field, messages] of Object.entries(errors)) {
        const input = document.querySelector(`[name="${field}"]`);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = messages.join(', ');
        input.parentElement.appendChild(errorDiv);
    }
}

function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]').content;
}
```

### 4.5. Полный пример: форма регистрации

```html
<!DOCTYPE html>
<html>
<head>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <style>
        .error-message { color: red; font-size: 14px; }
        .success-message { color: green; }
        input.error { border-color: red; }
    </style>
</head>
<body>
    <form id="register-form">
        <div>
            <label>Имя:</label>
            <input type="text" name="name" required>
        </div>
        <div>
            <label>Email:</label>
            <input type="email" name="email" required>
        </div>
        <div>
            <label>Пароль:</label>
            <input type="password" name="password" required>
        </div>
        <button type="submit">Зарегистрироваться</button>
    </form>

    <div id="message"></div>

    <script>
        const form = document.getElementById('register-form');
        const messageDiv = document.getElementById('message');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Очистка предыдущих ошибок
            document.querySelectorAll('.error-message').forEach(el => el.remove());
            document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
            messageDiv.textContent = '';

            // Сбор данных формы
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (!response.ok) {
                    // Обработка ошибок валидации
                    if (result.errors) {
                        for (const [field, messages] of Object.entries(result.errors)) {
                            const input = form.querySelector(`[name="${field}"]`);
                            input.classList.add('error');
                            
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'error-message';
                            errorDiv.textContent = messages.join(', ');
                            input.parentElement.appendChild(errorDiv);
                        }
                    }
                    throw new Error(result.message || 'Ошибка регистрации');
                }

                // Успех
                messageDiv.className = 'success-message';
                messageDiv.textContent = 'Регистрация успешна!';
                form.reset();

            } catch (error) {
                messageDiv.className = 'error-message';
                messageDiv.textContent = error.message;
            }
        });
    </script>
</body>
</html>
```

### 4.6. Другие HTTP-методы

```javascript
// PUT (обновление)
async function updateUser(id, userData) {
    const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': getCsrfToken()
        },
        body: JSON.stringify(userData)
    });
    return response.json();
}

// DELETE
async function deleteUser(id) {
    const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: {
            'X-CSRF-TOKEN': getCsrfToken()
        }
    });
    return response.json();
}

// PATCH (частичное обновление)
async function toggleUserStatus(id) {
    const response = await fetch(`/api/users/${id}/toggle-status`, {
        method: 'PATCH',
        headers: {
            'X-CSRF-TOKEN': getCsrfToken()
        }
    });
    return response.json();
}
```

## 5. Практические паттерны

### 5.1. Загрузка данных при загрузке страницы

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/tasks');
        const tasks = await response.json();
        
        const taskList = document.getElementById('task-list');
        tasks.forEach(task => {
            const li = createTaskElement(task);
            taskList.appendChild(li);
        });
    } catch (error) {
        console.error('Ошибка загрузки задач:', error);
    }
});

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task';
    li.dataset.id = task.id; // Сохраняем ID в data-атрибуте
    li.textContent = task.title;
    if (task.completed) {
        li.classList.add('completed');
    }
    return li;
}
```

### 5.2. Индикатор загрузки

```javascript
async function loadWithSpinner(url) {
    const spinner = document.getElementById('spinner');
    spinner.style.display = 'block';

    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } finally {
        spinner.style.display = 'none'; // Скрыть даже при ошибке
    }
}
```

### 5.3. Debounce для поиска

```javascript
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

const searchInput = document.getElementById('search');

const performSearch = debounce(async (query) => {
    if (query.length < 3) return;
    
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const results = await response.json();
    displayResults(results);
}, 300); // Подождать 300ms после последнего ввода

searchInput.addEventListener('input', (e) => {
    performSearch(e.target.value);
});
```

### 5.4. Обработка файлов

```javascript
const fileInput = document.getElementById('avatar');

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
        const response = await fetch('/api/users/avatar', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': getCsrfToken()
                // НЕ указывайте Content-Type! Браузер сам установит с boundary
            },
            body: formData
        });

        const data = await response.json();
        console.log('Аватар загружен:', data.avatar_url);
    } catch (error) {
        console.error('Ошибка загрузки:', error);
    }
});
```

## 6. Интеграция с Laravel Blade

### 6.1. Передача данных из PHP в JavaScript

```blade
{{-- resources/views/tasks.blade.php --}}
<!DOCTYPE html>
<html>
<head>
    <meta name="csrf-token" content="{{ csrf_token() }}">
</head>
<body>
    <div id="app"></div>

    <script>
        // Способ 1: через data-атрибут
        const appDiv = document.getElementById('app');
        appDiv.dataset.userId = {{ auth()->id() }};

        // Способ 2: через глобальную переменную
        window.appConfig = {
            userId: {{ auth()->id() }},
            apiUrl: "{{ config('app.api_url') }}",
            tasks: @json($tasks) // Безопасное преобразование в JSON
        };

        console.log(window.appConfig.tasks);
    </script>
</body>
</html>
```

### 6.2. Компиляция JavaScript через Vite

```javascript
// resources/js/app.js
import './bootstrap';

document.addEventListener('DOMContentLoaded', () => {
    console.log('App загружен!');
});
```

```blade
{{-- В Blade --}}
@vite(['resources/css/app.css', 'resources/js/app.js'])
```

## 7. Отладка JavaScript

### 7.1. Console API

```javascript
console.log('Обычное сообщение');
console.error('Ошибка!');
console.warn('Предупреждение');
console.info('Информация');

const user = { name: 'John', age: 30 };
console.table(user); // Таблица

console.group('Группа сообщений');
console.log('Сообщение 1');
console.log('Сообщение 2');
console.groupEnd();

console.time('Операция');
// ... код ...
console.timeEnd('Операция'); // "Операция: 125.43ms"
```

### 7.2. Debugger

```javascript
function calculateTotal(items) {
    let total = 0;
    
    debugger; // Выполнение остановится здесь, если открыты DevTools
    
    items.forEach(item => {
        total += item.price;
    });
    
    return total;
}
```

### 7.3. Полезные инструменты браузера

- **F12 / Cmd+Opt+I** — открыть DevTools
- **Console** — выполнение JS-кода и просмотр логов
- **Network** — мониторинг AJAX-запросов
- **Elements** — просмотр и изменение DOM
- **Sources** — отладка с breakpoints

## 8. Упражнения

### Упражнение 1: Интерактивный счетчик
Создайте страницу со счетчиком, который можно увеличивать, уменьшать и сбрасывать.

```html
<div id="counter-app">
    <h1>Счетчик: <span id="count">0</span></h1>
    <button id="increment">+</button>
    <button id="decrement">-</button>
    <button id="reset">Сброс</button>
</div>
```

**Задача:** Реализуйте функциональность через обработчики событий.

### Упражнение 2: Фильтр списка
Создайте поле ввода, которое фильтрует список элементов в реальном времени.

```html
<input type="text" id="filter" placeholder="Поиск...">
<ul id="items">
    <li>JavaScript</li>
    <li>PHP</li>
    <li>Python</li>
    <li>Java</li>
</ul>
```

**Задача:** При вводе скрывайте элементы, которые не содержат введенный текст.

### Упражнение 3: CRUD с API
Создайте полноценное приложение для управления задачами:
1. Загрузка списка задач с `/api/tasks` при загрузке страницы
2. Добавление новой задачи через форму (POST `/api/tasks`)
3. Отметка выполненной (PATCH `/api/tasks/{id}`)
4. Удаление задачи (DELETE `/api/tasks/{id}`)

**Laravel Backend:**
```php
Route::apiResource('tasks', TaskController::class);
```

### Упражнение 4: Живой поиск
Реализуйте поиск пользователей с задержкой (debounce):
- Запросы к `/api/users/search?q=...` отправляются только через 300ms после последнего ввода
- Показывайте индикатор загрузки
- Отображайте результаты ниже поля ввода

### Упражнение 5: Модальное окно
Создайте переиспользуемое модальное окно:
```javascript
function showModal(title, content) {
    // Создайте модальное окно программно
    // Добавьте обработчик закрытия по клику вне окна или на крестик
}
```

## 9. Частые ошибки

### ❌ Ошибка 1: Работа с элементом до загрузки DOM
```javascript
// ПЛОХО — script в <head>, DOM еще не загружен
const button = document.querySelector('button'); // null!

// ХОРОШО
document.addEventListener('DOMContentLoaded', () => {
    const button = document.querySelector('button'); // Найден!
});

// Или поместите <script> в конец <body>
```

### ❌ Ошибка 2: Забыли preventDefault()
```javascript
form.addEventListener('submit', (e) => {
    // Забыли e.preventDefault() — форма отправится и страница перезагрузится!
    const data = new FormData(form);
    // ...
});
```

### ❌ Ошибка 3: Не проверили response.ok
```javascript
// ПЛОХО
const data = await fetch('/api/users').then(r => r.json());
// Если 404 или 500, будет ошибка парсинга JSON!

// ХОРОШО
const response = await fetch('/api/users');
if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
}
const data = await response.json();
```

### ❌ Ошибка 4: Забыли CSRF-токен
```javascript
// Laravel вернет 419 Page Expired без CSRF-токена
await fetch('/api/users', {
    method: 'POST',
    headers: {
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
    },
    body: JSON.stringify(data)
});
```

## 10. Контрольные вопросы

1. В чем разница между `textContent` и `innerHTML`? Какой безопаснее?
2. Что делает `event.preventDefault()`? Приведите примеры использования.
3. В чем преимущество делегирования событий?
4. Почему `async/await` предпочтительнее `.then().catch()`?
5. Как передать файл через Fetch API?
6. Зачем нужен debounce при поиске?
7. В чем разница между `null` и `undefined` в JavaScript?
8. Как Laravel автоматически возвращает JSON?
9. Почему не нужно указывать `Content-Type` при отправке `FormData`?
10. Как отловить и отобразить ошибки валидации Laravel в JavaScript?

## Что дальше?

Вы освоили основы JavaScript для PHP-разработчика! Теперь вы можете:
- ✅ Манипулировать DOM
- ✅ Обрабатывать события пользователя
- ✅ Отправлять AJAX-запросы к Laravel API
- ✅ Обрабатывать ответы и ошибки

**Следующий шаг:** Глава 12.2 — Vue.js для Laravel, где вы узнаете, как современные фреймворки упрощают работу с DOM и состоянием приложения.

---

**Практическое задание:**
Создайте мини-приложение "Записная книжка" с Laravel-бэкендом и JavaScript-фронтендом:
- Список заметок загружается с API
- Форма добавления новой заметки (AJAX)
- Редактирование заметки inline (двойной клик)
- Удаление с подтверждением
- Поиск по заметкам в реальном времени (debounce)

Удачи! 🚀