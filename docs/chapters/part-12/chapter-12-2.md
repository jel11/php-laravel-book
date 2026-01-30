# Глава 12.2: Vue.js для Laravel — основы Vue, компоненты, реактивность

## Введение: Почему Vue.js и Laravel — идеальная пара

Laravel и Vue.js исторически были близкими друзьями. Laravel долгое время поставлялся с Vue.js "из коробки", и хотя сейчас фреймворк более нейтрален к выбору frontend-библиотеки, Vue остается популярным выбором среди Laravel-разработчиков.

**Почему Vue.js подходит для Laravel-проектов:**
- **Прогрессивность**: можно начать с малого (одного компонента) и постепенно расширять
- **Простота интеграции**: Vue легко добавить в существующий Blade-проект
- **Реактивность из коробки**: данные обновляются автоматически
- **Экосистема**: Vue Router, Pinia, Inertia.js отлично работают с Laravel

**Что мы изучим:**
- Основы Vue.js 3 (Composition API)
- Создание и использование компонентов
- Реактивность и управление состоянием
- Интеграция Vue с Laravel через Vite
- Практические примеры реальных компонентов

---

## Часть 1: Основы Vue.js 3

### 1.1 Первый Vue-компонент

Vue-приложение строится из компонентов. Компонент — это изолированная часть UI с собственной логикой и шаблоном.

**Простейший Vue-компонент (app.js):**

```javascript
import { createApp } from 'vue';

// Создаем Vue-приложение
const app = createApp({
    data() {
        return {
            message: 'Привет из Vue!',
            count: 0
        }
    },
    methods: {
        increment() {
            this.count++;
        }
    }
});

// Монтируем приложение к элементу с id="app"
app.mount('#app');
```

**Шаблон в Blade (welcome.blade.php):**

```blade
<!DOCTYPE html>
<html>
<head>
    <title>Vue + Laravel</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    <div id="app">
        <h1>{{ message }}</h1>
        <p>Счетчик: {{ count }}</p>
        <button @click="increment">Увеличить</button>
    </div>
</body>
</html>
```

**Что происходит:**
1. `createApp()` создает экземпляр Vue-приложения
2. `data()` определяет реактивные данные компонента
3. `methods` содержит функции для работы с данными
4. `mount('#app')` связывает Vue с DOM-элементом
5. `{{ message }}` — интерполяция (вывод данных)
6. `@click` — директива для обработки событий

### 1.2 Composition API — современный подход

Vue 3 представил Composition API — более гибкий способ организации логики компонента.

**Тот же компонент через Composition API:**

```javascript
import { createApp, ref } from 'vue';

const app = createApp({
    setup() {
        // ref() создает реактивную переменную
        const message = ref('Привет из Vue!');
        const count = ref(0);

        // Функции определяются напрямую
        const increment = () => {
            count.value++;
        };

        // Возвращаем то, что должно быть доступно в шаблоне
        return {
            message,
            count,
            increment
        };
    }
});

app.mount('#app');
```

**Ключевые отличия:**
- `ref()` вместо `data()` — более явное управление реактивностью
- Все в одной функции `setup()` — проще группировать связанную логику
- Доступ к значению через `.value` в JavaScript, но не в шаблоне
- Композиция логики через функции (composables)

### 1.3 Директивы Vue

Директивы — это специальные атрибуты с префиксом `v-`, которые применяют реактивное поведение к DOM.

**Основные директивы:**

```vue
<template>
    <div>
        <!-- v-if: условный рендеринг -->
        <p v-if="isVisible">Я видим</p>
        <p v-else>Я скрыт</p>

        <!-- v-show: переключение display -->
        <p v-show="isActive">Включен/выключен через CSS</p>

        <!-- v-for: рендеринг списков -->
        <ul>
            <li v-for="user in users" :key="user.id">
                {{ user.name }}
            </li>
        </ul>

        <!-- v-model: двусторонняя привязка -->
        <input v-model="searchQuery" type="text" />
        <p>Вы ввели: {{ searchQuery }}</p>

        <!-- v-bind (сокращение :): привязка атрибутов -->
        <img :src="imageUrl" :alt="imageAlt" />
        <div :class="{ active: isActive, disabled: !isEnabled }"></div>

        <!-- v-on (сокращение @): обработка событий -->
        <button @click="handleClick">Клик</button>
        <input @input="handleInput" @keyup.enter="submitForm" />
    </div>
</template>

<script setup>
import { ref } from 'vue';

const isVisible = ref(true);
const isActive = ref(false);
const users = ref([
    { id: 1, name: 'Алексей' },
    { id: 2, name: 'Мария' },
    { id: 3, name: 'Дмитрий' }
]);
const searchQuery = ref('');
const imageUrl = ref('/images/logo.png');
const imageAlt = ref('Логотип');
const isEnabled = ref(true);

const handleClick = () => {
    console.log('Кнопка нажата');
};

const handleInput = (event) => {
    console.log('Введено:', event.target.value);
};

const submitForm = () => {
    console.log('Enter нажат');
};
</script>
```

**Разница между v-if и v-show:**
- `v-if` — элемент добавляется/удаляется из DOM (более затратно)
- `v-show` — элемент всегда в DOM, меняется `display: none` (быстрее переключается)

**Модификаторы событий:**
```vue
<!-- Предотвратить стандартное поведение -->
<form @submit.prevent="onSubmit">

<!-- Остановить всплытие события -->
<button @click.stop="onClick">

<!-- Событие сработает только один раз -->
<button @click.once="initialize">

<!-- Комбинация модификаторов -->
<form @submit.prevent.once="submitOnce">
```

---

## Часть 2: Однофайловые компоненты (SFC)

### 2.1 Структура .vue файла

Однофайловые компоненты (Single File Components) — это стандартный способ организации Vue-компонентов в отдельные файлы.

**Структура UserCard.vue:**

```vue
<!-- ШАБЛОН: HTML-разметка компонента -->
<template>
    <div class="user-card" :class="{ online: user.isOnline }">
        <img :src="user.avatar" :alt="user.name" class="avatar" />
        <div class="info">
            <h3>{{ user.name }}</h3>
            <p class="email">{{ user.email }}</p>
            <span v-if="user.isOnline" class="status">Онлайн</span>
            <span v-else class="status offline">Оффлайн</span>
        </div>
        <button @click="sendMessage" class="btn">
            Написать
        </button>
    </div>
</template>

<!-- СКРИПТ: JavaScript-логика компонента -->
<script setup>
import { defineProps, defineEmits } from 'vue';

// Props: данные, передаваемые в компонент извне
const props = defineProps({
    user: {
        type: Object,
        required: true
    }
});

// Emits: события, которые компонент может генерировать
const emit = defineEmits(['message-sent']);

const sendMessage = () => {
    emit('message-sent', props.user.id);
};
</script>

<!-- СТИЛИ: CSS только для этого компонента -->
<style scoped>
.user-card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: border-color 0.3s;
}

.user-card.online {
    border-color: #4caf50;
}

.avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    object-fit: cover;
}

.info {
    flex: 1;
}

.info h3 {
    margin: 0 0 4px;
    font-size: 18px;
}

.email {
    color: #666;
    margin: 0 0 8px;
}

.status {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    background: #4caf50;
    color: white;
}

.status.offline {
    background: #9e9e9e;
}

.btn {
    padding: 8px 16px;
    background: #2196f3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.btn:hover {
    background: #1976d2;
}
</style>
```

**Использование компонента:**

```vue
<template>
    <div class="users-list">
        <UserCard 
            v-for="user in users" 
            :key="user.id"
            :user="user"
            @message-sent="handleMessageSent"
        />
    </div>
</template>

<script setup>
import { ref } from 'vue';
import UserCard from './components/UserCard.vue';

const users = ref([
    { 
        id: 1, 
        name: 'Алексей Иванов', 
        email: 'alexey@example.com',
        avatar: '/avatars/1.jpg',
        isOnline: true
    },
    { 
        id: 2, 
        name: 'Мария Петрова', 
        email: 'maria@example.com',
        avatar: '/avatars/2.jpg',
        isOnline: false
    }
]);

const handleMessageSent = (userId) => {
    console.log(`Отправить сообщение пользователю ${userId}`);
};
</script>
```

### 2.2 Props и Events — коммуникация между компонентами

**Props (входные данные):**

```vue
<!-- Родительский компонент -->
<template>
    <ProductCard
        :name="product.name"
        :price="product.price"
        :in-stock="product.inStock"
        :images="product.images"
    />
</template>

<!-- ProductCard.vue -->
<script setup>
const props = defineProps({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        validator: (value) => value >= 0
    },
    inStock: {
        type: Boolean,
        default: true
    },
    images: {
        type: Array,
        default: () => []
    }
});

// Доступ к props
console.log(props.name);
console.log(props.price);
</script>
```

**Events (события от дочернего к родительскому):**

```vue
<!-- Дочерний компонент: AddToCartButton.vue -->
<template>
    <button @click="addToCart" :disabled="!inStock">
        Добавить в корзину
    </button>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps(['productId', 'inStock']);
const emit = defineEmits(['add-to-cart', 'out-of-stock']);

const addToCart = () => {
    if (props.inStock) {
        emit('add-to-cart', {
            productId: props.productId,
            quantity: 1,
            timestamp: Date.now()
        });
    } else {
        emit('out-of-stock', props.productId);
    }
};
</script>

<!-- Родительский компонент -->
<template>
    <AddToCartButton
        :product-id="product.id"
        :in-stock="product.inStock"
        @add-to-cart="handleAddToCart"
        @out-of-stock="handleOutOfStock"
    />
</template>

<script setup>
const handleAddToCart = (data) => {
    console.log('Добавлено в корзину:', data);
    // Логика добавления в корзину
};

const handleOutOfStock = (productId) => {
    console.log('Товар недоступен:', productId);
    // Уведомить пользователя
};
</script>
```

### 2.3 Слоты (Slots) — гибкие компоненты

Слоты позволяют передавать контент в компонент, делая его более переиспользуемым.

**Простой слот:**

```vue
<!-- Modal.vue -->
<template>
    <div class="modal-overlay" @click="close">
        <div class="modal-content" @click.stop>
            <button class="close-btn" @click="close">✕</button>
            <!-- Контент из родительского компонента -->
            <slot></slot>
        </div>
    </div>
</template>

<script setup>
import { defineEmits } from 'vue';

const emit = defineEmits(['close']);

const close = () => {
    emit('close');
};
</script>

<!-- Использование -->
<template>
    <Modal @close="showModal = false">
        <h2>Подтверждение</h2>
        <p>Вы уверены, что хотите удалить этот элемент?</p>
        <button @click="confirmDelete">Да, удалить</button>
        <button @click="showModal = false">Отмена</button>
    </Modal>
</template>
```

**Именованные слоты:**

```vue
<!-- Card.vue -->
<template>
    <div class="card">
        <header class="card-header">
            <slot name="header"></slot>
        </header>
        
        <div class="card-body">
            <slot></slot> <!-- Слот по умолчанию -->
        </div>
        
        <footer class="card-footer">
            <slot name="footer"></slot>
        </footer>
    </div>
</template>

<!-- Использование -->
<template>
    <Card>
        <template #header>
            <h2>Заголовок карточки</h2>
        </template>
        
        <p>Основной контент карточки</p>
        <p>Может быть несколько параграфов</p>
        
        <template #footer>
            <button>Действие 1</button>
            <button>Действие 2</button>
        </template>
    </Card>
</template>
```

**Scoped слоты (передача данных в слот):**

```vue
<!-- List.vue -->
<template>
    <ul>
        <li v-for="item in items" :key="item.id">
            <!-- Передаем item в слот -->
            <slot :item="item" :index="index"></slot>
        </li>
    </ul>
</template>

<script setup>
defineProps(['items']);
</script>

<!-- Использование -->
<template>
    <List :items="users">
        <!-- Получаем данные из слота -->
        <template #default="{ item, index }">
            <div>
                <strong>{{ index + 1 }}.</strong>
                {{ item.name }} ({{ item.email }})
            </div>
        </template>
    </List>
</template>
```

---

## Часть 3: Реактивность в Vue 3

### 3.1 ref() и reactive()

**ref() — для примитивных и сложных значений:**

```javascript
import { ref } from 'vue';

// Примитивы
const count = ref(0);
const message = ref('Привет');
const isActive = ref(true);

// Объекты и массивы тоже можно
const user = ref({ name: 'Алексей', age: 25 });
const items = ref([1, 2, 3]);

// Доступ к значению через .value
console.log(count.value); // 0
count.value++;
console.log(count.value); // 1

user.value.age = 26;
items.value.push(4);
```

**reactive() — для объектов и массивов:**

```javascript
import { reactive } from 'vue';

const state = reactive({
    count: 0,
    user: {
        name: 'Алексей',
        email: 'alexey@example.com'
    },
    todos: []
});

// Доступ напрямую, без .value
console.log(state.count); // 0
state.count++;

state.user.name = 'Мария';
state.todos.push({ id: 1, text: 'Купить молоко' });
```

**Когда использовать что:**
- `ref()` — универсален, работает с любыми типами
- `reactive()` — только для объектов, но доступ без `.value`
- `ref()` предпочтительнее для примитивов и при работе с Composition API

**Важно: ref() разворачивается автоматически в шаблоне:**

```vue
<template>
    <!-- В шаблоне .value НЕ нужен -->
    <p>{{ count }}</p>
    <button @click="count++">Увеличить</button>
</template>

<script setup>
import { ref } from 'vue';

const count = ref(0);

// В JavaScript .value НУЖЕН
console.log(count.value);
</script>
```

### 3.2 computed() — вычисляемые свойства

Вычисляемые свойства кэшируются и пересчитываются только при изменении зависимостей.

```vue
<template>
    <div>
        <input v-model="firstName" placeholder="Имя" />
        <input v-model="lastName" placeholder="Фамилия" />
        
        <p>Полное имя: {{ fullName }}</p>
        <p>Инициалы: {{ initials }}</p>
        
        <ul>
            <li v-for="item in filteredItems" :key="item.id">
                {{ item.name }} - {{ item.price }} ₽
            </li>
        </ul>
        
        <input v-model="searchQuery" placeholder="Поиск..." />
        <p>Найдено: {{ filteredItems.length }}</p>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const firstName = ref('Алексей');
const lastName = ref('Иванов');

// Вычисляемое свойство
const fullName = computed(() => {
    return `${firstName.value} ${lastName.value}`;
});

const initials = computed(() => {
    return `${firstName.value[0]}.${lastName.value[0]}.`;
});

const items = ref([
    { id: 1, name: 'Яблоко', price: 50 },
    { id: 2, name: 'Банан', price: 30 },
    { id: 3, name: 'Апельсин', price: 60 }
]);

const searchQuery = ref('');

// Фильтрация на основе поискового запроса
const filteredItems = computed(() => {
    if (!searchQuery.value) return items.value;
    
    return items.value.filter(item => 
        item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
});
</script>
```

**Вычисляемое свойство с setter:**

```javascript
const firstName = ref('Алексей');
const lastName = ref('Иванов');

const fullName = computed({
    // Getter
    get() {
        return `${firstName.value} ${lastName.value}`;
    },
    // Setter
    set(newValue) {
        const parts = newValue.split(' ');
        firstName.value = parts[0] || '';
        lastName.value = parts[1] || '';
    }
});

// Теперь можно изменять fullName
fullName.value = 'Мария Петрова';
console.log(firstName.value); // 'Мария'
console.log(lastName.value); // 'Петрова'
```

### 3.3 watch() и watchEffect()

**watch() — явное отслеживание изменений:**

```javascript
import { ref, watch } from 'vue';

const count = ref(0);
const user = ref({ name: 'Алексей', age: 25 });

// Отслеживание одного источника
watch(count, (newValue, oldValue) => {
    console.log(`Счетчик изменился с ${oldValue} на ${newValue}`);
});

// Отслеживание вложенного свойства
watch(() => user.value.age, (newAge, oldAge) => {
    console.log(`Возраст изменился с ${oldAge} на ${newAge}`);
});

// Отслеживание всего объекта (глубокое)
watch(user, (newUser, oldUser) => {
    console.log('User изменился:', newUser);
}, { deep: true });

// Отслеживание нескольких источников
watch([count, user], ([newCount, newUser], [oldCount, oldUser]) => {
    console.log('Что-то изменилось');
});

// Немедленное выполнение при создании
watch(count, (newValue) => {
    console.log('Текущее значение:', newValue);
}, { immediate: true });
```

**watchEffect() — автоматическое отслеживание зависимостей:**

```javascript
import { ref, watchEffect } from 'vue';

const firstName = ref('Алексей');
const lastName = ref('Иванов');
const age = ref(25);

// Автоматически отслеживает firstName и lastName
watchEffect(() => {
    console.log(`Полное имя: ${firstName.value} ${lastName.value}`);
    // age не используется, поэтому его изменение не вызовет эффект
});

// Практический пример: сохранение в localStorage
watchEffect(() => {
    localStorage.setItem('user', JSON.stringify({
        firstName: firstName.value,
        lastName: lastName.value,
        age: age.value
    }));
});

// Cleanup при размонтировании
watchEffect((onCleanup) => {
    const timer = setInterval(() => {
        console.log('Tick');
    }, 1000);
    
    onCleanup(() => {
        clearInterval(timer);
    });
});
```

**Практический пример: автосохранение формы:**

```vue
<template>
    <form>
        <input v-model="form.title" placeholder="Заголовок" />
        <textarea v-model="form.content" placeholder="Содержимое"></textarea>
        <p class="autosave-status">{{ saveStatus }}</p>
    </form>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';

const form = reactive({
    title: '',
    content: ''
});

const saveStatus = ref('');
let saveTimeout = null;

watch(form, () => {
    saveStatus.value = 'Несохраненные изменения...';
    
    // Debounce: сохраняем через 1 секунду после последнего изменения
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveToServer(form);
        saveStatus.value = 'Сохранено ✓';
    }, 1000);
}, { deep: true });

const saveToServer = async (data) => {
    // Отправка на сервер
    await fetch('/api/posts/autosave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
};
</script>
```

---

## Часть 4: Интеграция Vue с Laravel

### 4.1 Настройка Vite для Vue

**Установка зависимостей:**

```bash
# В корне Laravel-проекта
npm install vue@next
npm install @vitejs/plugin-vue
```

**Настройка vite.config.js:**

```javascript
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
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
            '@': '/resources/js',
        },
    },
});
```

**Создание app.js (resources/js/app.js):**

```javascript
import './bootstrap';
import { createApp } from 'vue';

// Импорт компонентов
import ExampleComponent from './components/ExampleComponent.vue';

const app = createApp({});

// Регистрация глобальных компонентов
app.component('example-component', ExampleComponent);

// Монтирование приложения
app.mount('#app');
```

**Использование в Blade:**

```blade
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue + Laravel</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    <div id="app">
        <example-component></example-component>
    </div>
</body>
</html>
```

### 4.2 Работа с API Laravel из Vue

**Настройка Axios (resources/js/bootstrap.js):**

```javascript
import axios from 'axios';

window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// CSRF-токен для POST-запросов
const token = document.head.querySelector('meta[name="csrf-token"]');
if (token) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token.content;
}
```

**Компонент со списком постов (PostsList.vue):**

```vue
<template>
    <div class="posts-list">
        <h2>Посты</h2>
        
        <!-- Загрузка -->
        <div v-if="loading" class="loader">
            Загрузка...
        </div>
        
        <!-- Ошибка -->
        <div v-else-if="error" class="error">
            {{ error }}
        </div>
        
        <!-- Список постов -->
        <div v-else>
            <article 
                v-for="post in posts" 
                :key="post.id"
                class="post"
            >
                <h3>{{ post.title }}</h3>
                <p>{{ post.excerpt }}</p>
                <div class="meta">
                    <span>Автор: {{ post.author.name }}</span>
                    <span>{{ formatDate(post.created_at) }}</span>
                </div>
                <button @click="deletePost(post.id)">Удалить</button>
            </article>
        </div>
        
        <!-- Пагинация -->
        <div v-if="pagination" class="pagination">
            <button 
                @click="loadPage(pagination.current_page - 1)"
                :disabled="!pagination.prev_page_url"
            >
                Назад
            </button>
            <span>Страница {{ pagination.current_page }} из {{ pagination.last_page }}</span>
            <button 
                @click="loadPage(pagination.current_page + 1)"
                :disabled="!pagination.next_page_url"
            >
                Вперед
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const posts = ref([]);
const loading = ref(false);
const error = ref(null);
const pagination = ref(null);

const loadPosts = async (page = 1) => {
    loading.value = true;
    error.value = null;
    
    try {
        const response = await axios.get(`/api/posts?page=${page}`);
        posts.value = response.data.data;
        pagination.value = {
            current_page: response.data.current_page,
            last_page: response.data.last_page,
            prev_page_url: response.data.prev_page_url,
            next_page_url: response.data.next_page_url
        };
    } catch (err) {
        error.value = 'Не удалось загрузить посты';
        console.error(err);
    } finally {
        loading.value = false;
    }
};

const loadPage = (page) => {
    loadPosts(page);
};

const deletePost = async (postId) => {
    if (!confirm('Вы уверены?')) return;
    
    try {
        await axios.delete(`/api/posts/${postId}`);
        // Удаляем пост из списка
        posts.value = posts.value.filter(p => p.id !== postId);
    } catch (err) {
        alert('Ошибка при удалении');
        console.error(err);
    }
};

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
};

// Загрузить при монтировании
onMounted(() => {
    loadPosts();
});
</script>

<style scoped>
.posts-list {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

.loader {
    text-align: center;
    padding: 40px;
}

.error {
    background: #fee;
    border: 1px solid #fcc;
    padding: 16px;
    border-radius: 4px;
    color: #c00;
}

.post {
    background: white;
    padding: 20px;
    margin-bottom: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.post h3 {
    margin: 0 0 12px;
}

.meta {
    display: flex;
    justify-content: space-between;
    color: #666;
    font-size: 14px;
    margin-top: 12px;
}

.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-top: 20px;
}

.pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
```

**API Route (routes/api.php):**

```php
use App\Http\Controllers\Api\PostController;

Route::get('/posts', [PostController::class, 'index']);
Route::delete('/posts/{post}', [PostController::class, 'destroy']);
```

**Controller (app/Http/Controllers/Api/PostController.php):**

```php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function index()
    {
        return Post::with('author')
            ->latest()
            ->paginate(10);
    }
    
    public function destroy(Post $post)
    {
        $post->delete();
        
        return response()->json(['message' => 'Пост удален']);
    }
}
```

### 4.3 Передача данных из Laravel в Vue

**Метод 1: Через data-атрибуты:**

```blade
<div 
    id="app" 
    data-user='@json($user)'
    data-settings='@json($settings)'
>
    <user-profile></user-profile>
</div>

@vite(['resources/js/app.js'])
```

```javascript
// app.js
const app = createApp({
    mounted() {
        const appElement = document.getElementById('app');
        const user = JSON.parse(appElement.dataset.user);
        const settings = JSON.parse(appElement.dataset.settings);
        
        console.log(user, settings);
    }
});
```

**Метод 2: Через props компонента:**

```blade
<div id="app">
    <user-profile :user='@json($user)'></user-profile>
</div>
```

**Метод 3: Через глобальное окно (не рекомендуется для больших данных):**

```blade
<script>
    window.initialData = {
        user: @json($user),
        permissions: @json($permissions)
    };
</script>

<div id="app">
    <dashboard></dashboard>
</div>
```

```javascript
// В компоненте
import { ref, onMounted } from 'vue';

const user = ref(null);

onMounted(() => {
    user.value = window.initialData.user;
});
```

### 4.4 Создание формы с валидацией

**Компонент CreatePostForm.vue:**

```vue
<template>
    <form @submit.prevent="submitForm" class="create-post-form">
        <h2>Создать пост</h2>
        
        <div class="form-group">
            <label for="title">Заголовок</label>
            <input 
                id="title"
                v-model="form.title"
                type="text"
                :class="{ error: errors.title }"
            />
            <span v-if="errors.title" class="error-message">
                {{ errors.title[0] }}
            </span>
        </div>
        
        <div class="form-group">
            <label for="content">Содержимое</label>
            <textarea 
                id="content"
                v-model="form.content"
                rows="10"
                :class="{ error: errors.content }"
            ></textarea>
            <span v-if="errors.content" class="error-message">
                {{ errors.content[0] }}
            </span>
        </div>
        
        <div class="form-group">
            <label for="category">Категория</label>
            <select 
                id="category"
                v-model="form.category_id"
                :class="{ error: errors.category_id }"
            >
                <option value="">Выберите категорию</option>
                <option 
                    v-for="category in categories" 
                    :key="category.id"
                    :value="category.id"
                >
                    {{ category.name }}
                </option>
            </select>
            <span v-if="errors.category_id" class="error-message">
                {{ errors.category_id[0] }}
            </span>
        </div>
        
        <div class="form-group">
            <label>
                <input 
                    v-model="form.is_published"
                    type="checkbox"
                />
                Опубликовать сразу
            </label>
        </div>
        
        <div v-if="generalError" class="alert alert-error">
            {{ generalError }}
        </div>
        
        <div v-if="successMessage" class="alert alert-success">
            {{ successMessage }}
        </div>
        
        <button 
            type="submit" 
            :disabled="submitting"
            class="btn btn-primary"
        >
            {{ submitting ? 'Сохранение...' : 'Создать пост' }}
        </button>
    </form>
</template>

<script setup>
import { ref, reactive } from 'vue';
import axios from 'axios';

const props = defineProps({
    categories: {
        type: Array,
        required: true
    }
});

const form = reactive({
    title: '',
    content: '',
    category_id: '',
    is_published: false
});

const errors = ref({});
const generalError = ref('');
const successMessage = ref('');
const submitting = ref(false);

const submitForm = async () => {
    // Сбросить предыдущие ошибки
    errors.value = {};
    generalError.value = '';
    successMessage.value = '';
    submitting.value = true;
    
    try {
        const response = await axios.post('/api/posts', form);
        
        successMessage.value = 'Пост успешно создан!';
        
        // Очистить форму
        form.title = '';
        form.content = '';
        form.category_id = '';
        form.is_published = false;
        
        // Перенаправить через 2 секунды
        setTimeout(() => {
            window.location.href = `/posts/${response.data.id}`;
        }, 2000);
        
    } catch (error) {
        if (error.response?.status === 422) {
            // Ошибки валидации Laravel
            errors.value = error.response.data.errors;
        } else {
            generalError.value = 'Произошла ошибка при создании поста';
        }
    } finally {
        submitting.value = false;
    }
};
</script>

<style scoped>
.create-post-form {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
}

.form-group {
    margin-bottom: 20px;
}

label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
}

input[type="text"],
textarea,
select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
}

input.error,
textarea.error,
select.error {
    border-color: #e53e3e;
}

.error-message {
    display: block;
    color: #e53e3e;
    font-size: 14px;
    margin-top: 4px;
}

.alert {
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 20px;
}

.alert-error {
    background: #fee;
    border: 1px solid #fcc;
    color: #c00;
}

.alert-success {
    background: #efe;
    border: 1px solid #cfc;
    color: #0a0;
}

.btn {
    padding: 12px 24px;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
}

.btn-primary {
    background: #3490dc;
    color: white;
}

.btn-primary:hover:not(:disabled) {
    background: #2779bd;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
</style>
```

**Laravel Controller:**

```php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string|min:50',
            'category_id' => 'required|exists:categories,id',
            'is_published' => 'boolean'
        ]);
        
        $post = auth()->user()->posts()->create($validated);
        
        return response()->json($post, 201);
    }
}
```

---

## Часть 5: Composables — переиспользуемая логика

Composables — это функции, которые инкапсулируют реактивную логику для переиспользования в разных компонентах.

**useAPI.js — абстракция для работы с API:**

```javascript
// resources/js/composables/useAPI.js
import { ref } from 'vue';
import axios from 'axios';

export function useAPI(url) {
    const data = ref(null);
    const loading = ref(false);
    const error = ref(null);
    
    const fetch = async (params = {}) => {
        loading.value = true;
        error.value = null;
        
        try {
            const response = await axios.get(url, { params });
            data.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err.response?.data?.message || 'Ошибка загрузки';
            throw err;
        } finally {
            loading.value = false;
        }
    };
    
    const post = async (payload) => {
        loading.value = true;
        error.value = null;
        
        try {
            const response = await axios.post(url, payload);
            data.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err.response?.data?.message || 'Ошибка отправки';
            throw err;
        } finally {
            loading.value = false;
        }
    };
    
    const remove = async (id) => {
        loading.value = true;
        error.value = null;
        
        try {
            await axios.delete(`${url}/${id}`);
        } catch (err) {
            error.value = err.response?.data?.message || 'Ошибка удаления';
            throw err;
        } finally {
            loading.value = false;
        }
    };
    
    return {
        data,
        loading,
        error,
        fetch,
        post,
        remove
    };
}
```

**Использование composable:**

```vue
<template>
    <div>
        <div v-if="usersAPI.loading">Загрузка...</div>
        <div v-else-if="usersAPI.error">{{ usersAPI.error }}</div>
        <div v-else>
            <div v-for="user in usersAPI.data" :key="user.id">
                {{ user.name }}
                <button @click="deleteUser(user.id)">Удалить</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useAPI } from '@/composables/useAPI';

const usersAPI = useAPI('/api/users');

onMounted(() => {
    usersAPI.fetch();
});

const deleteUser = async (id) => {
    if (confirm('Удалить пользователя?')) {
        await usersAPI.remove(id);
        usersAPI.fetch(); // Перезагрузить список
    }
};
</script>
```

**useForm.js — управление формами:**

```javascript
// resources/js/composables/useForm.js
import { reactive, ref } from 'vue';
import axios from 'axios';

export function useForm(initialData = {}, submitUrl) {
    const form = reactive({ ...initialData });
    const errors = ref({});
    const submitting = ref(false);
    const success = ref(false);
    
    const submit = async () => {
        errors.value = {};
        submitting.value = true;
        success.value = false;
        
        try {
            const response = await axios.post(submitUrl, form);
            success.value = true;
            return response.data;
        } catch (error) {
            if (error.response?.status === 422) {
                errors.value = error.response.data.errors;
            }
            throw error;
        } finally {
            submitting.value = false;
        }
    };
    
    const reset = () => {
        Object.keys(form).forEach(key => {
            form[key] = initialData[key];
        });
        errors.value = {};
        success.value = false;
    };
    
    const setErrors = (newErrors) => {
        errors.value = newErrors;
    };
    
    return {
        form,
        errors,
        submitting,
        success,
        submit,
        reset,
        setErrors
    };
}
```

**Использование useForm:**

```vue
<template>
    <form @submit.prevent="handleSubmit">
        <input v-model="form.name" placeholder="Имя" />
        <span v-if="errors.name" class="error">{{ errors.name[0] }}</span>
        
        <input v-model="form.email" type="email" placeholder="Email" />
        <span v-if="errors.email" class="error">{{ errors.email[0] }}</span>
        
        <button type="submit" :disabled="submitting">
            {{ submitting ? 'Отправка...' : 'Отправить' }}
        </button>
        
        <div v-if="success" class="success">Форма отправлена!</div>
    </form>
</template>

<script setup>
import { useForm } from '@/composables/useForm';

const { form, errors, submitting, success, submit, reset } = useForm(
    { name: '', email: '' },
    '/api/contacts'
);

const handleSubmit = async () => {
    try {
        await submit();
        reset(); // Очистить форму после успеха
    } catch (error) {
        console.error('Ошибка отправки формы');
    }
};
</script>
```

**usePagination.js — пагинация:**

```javascript
// resources/js/composables/usePagination.js
import { ref, computed } from 'vue';
import axios from 'axios';

export function usePagination(baseUrl, perPage = 10) {
    const items = ref([]);
    const currentPage = ref(1);
    const totalPages = ref(1);
    const total = ref(0);
    const loading = ref(false);
    
    const hasNextPage = computed(() => currentPage.value < totalPages.value);
    const hasPrevPage = computed(() => currentPage.value > 1);
    
    const fetch = async (page = 1) => {
        loading.value = true;
        
        try {
            const response = await axios.get(baseUrl, {
                params: { page, per_page: perPage }
            });
            
            items.value = response.data.data;
            currentPage.value = response.data.current_page;
            totalPages.value = response.data.last_page;
            total.value = response.data.total;
        } finally {
            loading.value = false;
        }
    };
    
    const nextPage = () => {
        if (hasNextPage.value) {
            fetch(currentPage.value + 1);
        }
    };
    
    const prevPage = () => {
        if (hasPrevPage.value) {
            fetch(currentPage.value - 1);
        }
    };
    
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages.value) {
            fetch(page);
        }
    };
    
    return {
        items,
        currentPage,
        totalPages,
        total,
        loading,
        hasNextPage,
        hasPrevPage,
        fetch,
        nextPage,
        prevPage,
        goToPage
    };
}
```

---

## Практические упражнения

### Упражнение 1: Калькулятор

Создайте компонент калькулятора с:
- Вводом двух чисел
- Выбором операции (+, -, *, /)
- Вычисляемым свойством для результата
- Обработкой деления на ноль

### Упражнение 2: Todo-лист с фильтрацией

Создайте todo-список с возможностью:
- Добавления задач
- Отметки как выполненные
- Удаления задач
- Фильтрации (все/активные/выполненные)
- Счетчика невыполненных задач

### Упражнение 3: Поиск и фильтрация продуктов

Создайте компонент каталога продуктов:
- Загрузка списка из API
- Поиск по названию
- Фильтрация по категориям
- Сортировка по цене
- Пагинация

### Упражнение 4: Форма регистрации

Создайте форму регистрации с:
- Валидацией на фронтенде
- Отправкой на Laravel API
- Обработкой ошибок валидации с бэкенда
- Отображением успешного сообщения
- Индикатором загрузки

---

## Контрольные вопросы

1. В чем разница между `ref()` и `reactive()`?
2. Когда использовать `computed()` вместо `watch()`?
3. Как работает двусторонняя привязка `v-model`?
4. Что такое scoped слоты и когда они полезны?
5. В чем разница между `v-if` и `v-show`?
6. Как передать данные из родительского компонента в дочерний?
7. Как дочерний компонент может сообщить родителю о событии?
8. Что делает атрибут `scoped` в секции `<style>`?
9. Зачем нужны composables?
10. Как правильно обрабатывать ошибки валидации Laravel в Vue?

---

## Что дальше?

В следующей главе **"Глава 12.3: Vite и сборка"** мы углубимся в:
- Конфигурацию Vite для продакшена
- Оптимизацию bundle size
- Code splitting и lazy loading компонентов
- Hot Module Replacement (HMR)
- Работу с assets (изображения, шрифты, SVG)

Вы освоили основы Vue.js и его интеграцию с Laravel — фундамент для создания современных SPA и интерактивных веб-приложений! 🎉