# Глава 12.3: Vite и сборка — npm, компиляция assets, hot reload

## Введение

Современные веб-приложения используют JavaScript, CSS препроцессоры (Sass, LESS), фреймворки (Vue, React) и другие инструменты, которые браузер не понимает напрямую. Нужен **сборщик** (bundler) — инструмент, который:

- Компилирует современный JS в код, понятный браузерам
- Обрабатывает CSS препроцессоры
- Минифицирует код для production
- Обеспечивает hot reload (обновление без перезагрузки страницы)

**Vite** — современный сборщик, ставший стандартом для Laravel с версии 9.19. Он заменил Laravel Mix и работает **значительно быстрее** благодаря использованию нативных ES-модулей.

---

## Что такое npm и зачем он нужен

### npm (Node Package Manager)

**npm** — менеджер пакетов для JavaScript, аналог Composer для PHP.

```bash
# Проверка установки Node.js и npm
node -v   # v18.0.0 или выше
npm -v    # 9.0.0 или выше
```

### Основные команды npm

```bash
# Установка зависимостей из package.json
npm install

# Добавление новой зависимости
npm install vue
npm install --save-dev tailwindcss  # dev-зависимость

# Удаление пакета
npm uninstall axios

# Обновление пакетов
npm update

# Запуск скриптов из package.json
npm run dev
npm run build
```

### package.json — манифест проекта

Файл `package.json` описывает зависимости и скрипты:

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "devDependencies": {
    "axios": "^1.6.4",
    "laravel-vite-plugin": "^1.0",
    "vite": "^5.0"
  }
}
```

**Важно:**
- `dependencies` — нужны в production (Vue, React)
- `devDependencies` — только для разработки (Vite, Tailwind)
- `node_modules/` — папка с установленными пакетами (добавь в `.gitignore`)

---

## Vite в Laravel: первое знакомство

### Структура файлов

```
resources/
├── css/
│   └── app.css          # Стили
├── js/
│   ├── app.js           # Главный JS файл
│   └── components/      # Vue компоненты
└── views/
    └── layouts/
        └── app.blade.php

vite.config.js           # Конфигурация Vite
```

### vite.config.js — конфигурация сборщика

```javascript
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js'
            ],
            refresh: true, // Auto-refresh при изменении Blade
        }),
        vue({
            template: {
                transformAssetUrls: {
                    base: null,
                    includeAbsolute: false,
                },
            },
        }),
    ],
    resolve: {
        alias: {
            '@': '/resources/js', // Алиас для импортов
        },
    },
});
```

### Подключение в Blade

```blade
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Laravel</title>

    {{-- Vite директивы --}}
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    <div id="app">
        <h1>Привет из Laravel + Vite!</h1>
    </div>
</body>
</html>
```

**Что происходит:**
- В **development**: `@vite()` подключает Vite dev server
- В **production**: подключает скомпилированные файлы из `public/build/`

---

## Режимы работы Vite

### Development режим — npm run dev

```bash
npm run dev
```

**Что происходит:**
1. Vite запускает dev server (обычно на http://localhost:5173)
2. Отслеживает изменения в `resources/js` и `resources/css`
3. При изменении файла мгновенно обновляет страницу через HMR
4. **Не создаёт** файлы в `public/build/`

**Hot Module Replacement (HMR):**
- JS изменения применяются без перезагрузки страницы
- Сохраняется состояние приложения (данные в формах, переменные)
- Мгновенная обратная связь

```javascript
// resources/js/app.js
import './bootstrap';
import { createApp } from 'vue';
import ExampleComponent from './components/ExampleComponent.vue';

const app = createApp({});
app.component('example-component', ExampleComponent);
app.mount('#app');

// Vite автоматически добавляет HMR
if (import.meta.hot) {
    import.meta.hot.accept(); // Принимать обновления
}
```

### Production режим — npm run build

```bash
npm run build
```

**Что происходит:**
1. Компиляция всех ассетов
2. Минификация JS и CSS
3. Создание source maps (для отладки)
4. Файлы сохраняются в `public/build/` с хешами в именах
5. Создаётся `manifest.json` со списком файлов

**Пример результата:**

```
public/build/
├── assets/
│   ├── app-a1b2c3d4.css      # Хеш для cache busting
│   └── app-x9y8z7w6.js
└── manifest.json
```

**manifest.json:**

```json
{
  "resources/js/app.js": {
    "file": "assets/app-x9y8z7w6.js",
    "css": ["assets/app-a1b2c3d4.css"]
  }
}
```

---

## Работа с CSS

### Базовое подключение CSS

```css
/* resources/css/app.css */
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

body {
    font-family: 'Nunito', sans-serif;
}
```

### CSS Modules

```javascript
// resources/js/components/Button.vue
<template>
    <button :class="$style.button">Кнопка</button>
</template>

<style module>
.button {
    background: blue;
    color: white;
    padding: 10px 20px;
}
</style>
```

### Препроцессоры (Sass/SCSS)

```bash
npm install --save-dev sass
```

```scss
// resources/css/app.scss
$primary-color: #3490dc;

.button {
    background: $primary-color;
    
    &:hover {
        background: darken($primary-color, 10%);
    }
}
```

```javascript
// vite.config.js — обновляем input
input: [
    'resources/css/app.scss', // вместо .css
    'resources/js/app.js'
]
```

---

## Работа с JavaScript

### Импорты и модули

```javascript
// resources/js/app.js
import './bootstrap';
import { createApp } from 'vue';
import router from './router';      // Локальный модуль
import ExampleComponent from '@/components/ExampleComponent.vue';

// Создание приложения
const app = createApp({});
app.use(router);
app.component('example', ExampleComponent);
app.mount('#app');
```

### Использование алиасов

```javascript
// vite.config.js
resolve: {
    alias: {
        '@': '/resources/js',
        '@components': '/resources/js/components',
        '@utils': '/resources/js/utils',
    },
}

// Теперь можно импортировать так:
import Header from '@components/Header.vue';
import { formatDate } from '@utils/helpers';
```

### Code Splitting — разделение кода

```javascript
// Динамический импорт (ленивая загрузка)
const AdminPanel = () => import('./components/AdminPanel.vue');

const routes = [
    {
        path: '/admin',
        component: AdminPanel, // Загрузится только при переходе
    },
];
```

**Преимущества:**
- Уменьшение размера начального bundle
- Загрузка компонентов по требованию
- Быстрее первая загрузка страницы

---

## Продвинутая конфигурация Vite

### Переменные окружения

```env
# .env
VITE_APP_NAME="My Laravel App"
VITE_API_URL=https://api.example.com
```

```javascript
// Доступ в JS
console.log(import.meta.env.VITE_APP_NAME);
console.log(import.meta.env.VITE_API_URL);
```

**Важно:**
- Переменные должны начинаться с `VITE_`
- Они **публичны** и попадают в bundle (не храни секреты!)

### Proxy для API запросов

```javascript
// vite.config.js
export default defineConfig({
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },
});
```

**Применение:**

```javascript
// Запрос идёт на Vite dev server, который проксирует на Laravel
fetch('/api/users')
    .then(res => res.json())
    .then(data => console.log(data));
```

### Оптимизация production сборки

```javascript
// vite.config.js
export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor': ['vue', 'axios'], // Отдельный chunk
                },
            },
        },
        chunkSizeWarningLimit: 1000, // Предупреждение если chunk > 1MB
        minify: 'terser', // Минификатор
        terserOptions: {
            compress: {
                drop_console: true, // Удалить console.log
            },
        },
    },
});
```

---

## Практический workflow

### Типичный день разработчика

**Шаг 1: Запуск серверов**

```bash
# Терминал 1 — PHP сервер
php artisan serve

# Терминал 2 — Vite
npm run dev
```

**Шаг 2: Разработка**

```javascript
// resources/js/components/UserCard.vue
<script setup>
import { ref } from 'vue';

const props = defineProps({
    user: Object,
});

const isExpanded = ref(false);
</script>

<template>
    <div class="user-card">
        <h3>{{ user.name }}</h3>
        <button @click="isExpanded = !isExpanded">
            {{ isExpanded ? 'Скрыть' : 'Показать' }}
        </button>
        <div v-show="isExpanded">
            <p>Email: {{ user.email }}</p>
        </div>
    </div>
</template>

<style scoped>
.user-card {
    border: 1px solid #ddd;
    padding: 1rem;
}
</style>
```

**Шаг 3: Использование в Blade**

```blade
{{-- resources/views/users/index.blade.php --}}
@extends('layouts.app')

@section('content')
    <div id="app">
        <user-card
            v-for="user in users"
            :key="user.id"
            :user="user"
        />
    </div>
@endsection

@push('scripts')
<script>
    window.users = @json($users);
</script>
@endpush
```

**Шаг 4: Production сборка**

```bash
# Перед деплоем
npm run build
php artisan optimize
```

---

## Интеграция с Tailwind CSS

### Установка

```bash
npm install --save-dev tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Конфигурация

```javascript
// tailwind.config.js
export default {
    content: [
        "./resources/**/*.blade.php",
        "./resources/**/*.js",
        "./resources/**/*.vue",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#3490dc',
            },
        },
    },
    plugins: [],
}
```

```css
/* resources/css/app.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
    .btn-primary {
        @apply bg-primary text-white px-4 py-2 rounded;
    }
}
```

---

## Отладка и troubleshooting

### Проблема: "Vite manifest not found"

**Причина:** Не запущен `npm run dev` или не выполнен `npm run build`

**Решение:**

```bash
# Development
npm run dev

# Production
npm run build
```

### Проблема: Изменения не применяются

**Решение 1:** Очистить кеш браузера (Ctrl+F5)

**Решение 2:** Перезапустить Vite

```bash
# Остановить (Ctrl+C) и снова
npm run dev
```

**Решение 3:** Проверить, что файл в `input` массиве

```javascript
// vite.config.js
input: [
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/admin.js', // Если забыли добавить
]
```

### Проблема: CORS ошибки в dev режиме

```javascript
// vite.config.js
export default defineConfig({
    server: {
        cors: true,
        host: '0.0.0.0', // Доступ с других устройств
        port: 5173,
    },
});
```

### Debugging build процесса

```bash
# Подробный вывод
npm run build -- --debug

# Анализ размера bundle
npm install --save-dev rollup-plugin-visualizer
```

```javascript
// vite.config.js
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
    plugins: [
        laravel({ /* ... */ }),
        visualizer(), // Создаст stats.html
    ],
});
```

---

## Практические упражнения

### Упражнение 1: Базовая настройка Vite

**Задача:** Настроить Vite для работы с CSS и JS.

1. Создай `resources/css/app.css`:

```css
body {
    background: linear-gradient(to right, #667eea, #764ba2);
    color: white;
    font-family: Arial, sans-serif;
}
```

2. Создай `resources/js/app.js`:

```javascript
console.log('Vite работает!');

document.addEventListener('DOMContentLoaded', () => {
    const button = document.createElement('button');
    button.textContent = 'Нажми меня';
    button.onclick = () => alert('Vite + Laravel = ❤️');
    document.body.appendChild(button);
});
```

3. Подключи в `welcome.blade.php`:

```blade
<!DOCTYPE html>
<html>
<head>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    <h1>Laravel + Vite</h1>
</body>
</html>
```

4. Запусти:

```bash
npm run dev
php artisan serve
```

### Упражнение 2: Hot Reload в действии

**Задача:** Увидеть HMR своими глазами.

1. Открой `resources/css/app.css` и меняй цвета:

```css
body {
    background: #ff6b6b; /* Меняй на разные цвета */
}
```

2. Наблюдай, как страница обновляется **мгновенно** без перезагрузки.

3. Добавь в `resources/js/app.js`:

```javascript
let counter = 0;
setInterval(() => {
    document.title = `Счётчик: ${++counter}`;
}, 1000);
```

4. Измени что-то в JS — счётчик **не сбросится** благодаря HMR!

### Упражнение 3: Production сборка

**Задача:** Подготовить проект к деплою.

1. Выполни сборку:

```bash
npm run build
```

2. Проверь содержимое `public/build/`:

```bash
ls -lh public/build/assets/
```

3. Переключи Laravel в production режим:

```bash
# .env
APP_ENV=production
APP_DEBUG=false
```

4. Очисти кеш и оптимизируй:

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
```

5. Проверь страницу — она должна работать с собранными файлами.

### Упражнение 4: Алиасы и Code Splitting

**Задача:** Организовать код с помощью алиасов.

1. Обнови `vite.config.js`:

```javascript
resolve: {
    alias: {
        '@': '/resources/js',
        '@components': '/resources/js/components',
    },
}
```

2. Создай `resources/js/components/Counter.js`:

```javascript
export default class Counter {
    constructor(element) {
        this.count = 0;
        this.element = element;
        this.render();
    }

    increment() {
        this.count++;
        this.render();
    }

    render() {
        this.element.textContent = `Счёт: ${this.count}`;
    }
}
```

3. Используй алиас в `app.js`:

```javascript
import Counter from '@components/Counter';

document.addEventListener('DOMContentLoaded', () => {
    const display = document.createElement('div');
    const button = document.createElement('button');
    button.textContent = 'Увеличить';
    
    document.body.append(display, button);
    
    const counter = new Counter(display);
    button.onclick = () => counter.increment();
});
```

### Упражнение 5: Tailwind CSS

**Задача:** Интегрировать Tailwind.

1. Установи:

```bash
npm install --save-dev tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

2. Настрой `tailwind.config.js`:

```javascript
export default {
    content: [
        "./resources/**/*.blade.php",
        "./resources/**/*.js",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}
```

3. Обнови `resources/css/app.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

4. Используй в Blade:

```blade
<div class="min-h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-2xl">
        <h1 class="text-3xl font-bold text-gray-800 mb-4">
            Laravel + Vite + Tailwind
        </h1>
        <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Красиво! 🎨
        </button>
    </div>
</div>
```

---

## Шпаргалка по командам

```bash
# Установка зависимостей
npm install

# Development сервер с HMR
npm run dev

# Production сборка
npm run build

# Добавить пакет
npm install package-name
npm install --save-dev package-name  # dev-зависимость

# Обновить пакеты
npm update

# Проверить устаревшие пакеты
npm outdated

# Очистить node_modules и переустановить
rm -rf node_modules package-lock.json
npm install

# Запуск с кастомным портом
npm run dev -- --port 3000
```

---

## Контрольные вопросы

1. **В чём разница между `npm install` и `npm install --save-dev`?**
   
   <details>
   <summary>Ответ</summary>
   
   - `npm install package` — зависимость нужна в production (Vue, React)
   - `npm install --save-dev package` — только для разработки (Vite, Tailwind)
   </details>

2. **Что делает директива `@vite()` в Blade?**
   
   <details>
   <summary>Ответ</summary>
   
   - В dev режиме: подключает Vite dev server для HMR
   - В production: подключает скомпилированные файлы из `public/build/`
   </details>

3. **Почему нельзя хранить секреты в переменных `VITE_*`?**
   
   <details>
   <summary>Ответ</summary>
   
   Они попадают в JS bundle, который отправляется клиенту. Любой может открыть DevTools и увидеть значения.
   </details>

4. **Что такое HMR и чем он отличается от Live Reload?**
   
   <details>
   <summary>Ответ</summary>
   
   - **Live Reload**: перезагружает всю страницу при изменениях
   - **HMR**: заменяет только изменённые модули без перезагрузки, сохраняя состояние приложения
   </details>

5. **Зачем нужен `npm run build` перед деплоем?**
   
   <details>
   <summary>Ответ</summary>
   
   Создаёт оптимизированные, минифицированные файлы для production с хешами в именах для cache busting.
   </details>

---

## Частые ошибки и как их избежать

### ❌ Забыл запустить `npm run dev`

```blade
{{-- Ошибка: Vite manifest not found --}}
```

**Решение:** Всегда держи `npm run dev` запущенным при разработке.

### ❌ Не добавил файл в `input`

```javascript
// vite.config.js
input: ['resources/js/app.js'] // Забыл admin.js
```

**Решение:** Добавь все entry points:

```javascript
input: [
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/admin.js',
]
```

### ❌ Использовал `require()` вместо `import`

```javascript
// ❌ Старый синтаксис (CommonJS)
const axios = require('axios');

// ✅ ES Modules
import axios from 'axios';
```

### ❌ Хранил секреты в `VITE_*` переменных

```env
# ❌ ПЛОХО — попадёт в bundle!
VITE_API_SECRET_KEY=super-secret-123

# ✅ ХОРОШО — используй обычные переменные
API_SECRET_KEY=super-secret-123
```

Используй обычные переменные для серверных секретов, `VITE_*` только для публичных настроек.

---

## Что дальше?

Теперь ты знаешь, как работает современная сборка фронтенда в Laravel! В следующей главе мы объединим всё вместе и построим **REST API + SPA**, где фронтенд полностью отделён от бэкенда.

**Следующие темы:**
- **Глава 12.4**: REST API + SPA — архитектура, CORS, JWT токены
- **Глава 13.1**: WebSockets — real-time коммуникация для чата

Vite делает разработку быстрой и приятной. Удачи! 🚀