# Глава 13.1: Как работают WebSockets — протокол, отличие от HTTP, где применять

## 🎯 Что изучим

После этой главы ты будешь понимать:
- Почему HTTP не подходит для real-time приложений
- Как работает протокол WebSocket
- Разницу между polling, long-polling и WebSocket
- Где использовать WebSocket, а где он избыточен
- Как устроено соединение на низком уровне

---

## 🤔 Проблема: HTTP не создан для real-time

### Классический HTTP

Представь обычное взаимодействие с сайтом:

```
Браузер → Сервер: "Дай мне главную страницу"
Сервер → Браузер: "Вот HTML"
[Соединение закрывается]

Браузер → Сервер: "Дай картинку logo.png"
Сервер → Браузер: "Вот картинка"
[Соединение закрывается]
```

**Ключевая особенность HTTP:**
- Клиент всегда инициирует запрос
- Сервер отвечает и закрывает соединение
- Сервер **не может** сам отправить данные клиенту

### Попытка сделать чат через HTTP

```javascript
// ❌ Наивный подход — опрос каждую секунду
setInterval(() => {
    fetch('/api/messages/new')
        .then(response => response.json())
        .then(messages => {
            messages.forEach(msg => addToChat(msg));
        });
}, 1000);
```

**Проблемы:**
1. **Задержка** — новое сообщение может прийти сразу после запроса, придётся ждать секунду
2. **Трафик** — 99% запросов вернут пустой ответ "нет новых сообщений"
3. **Нагрузка** — 1000 пользователей = 1000 запросов в секунду (даже если все молчат)

---

## 🔄 Эволюция подходов к real-time

### 1. Short Polling (опрос)

```javascript
// Запрашиваем каждые 3 секунды
setInterval(async () => {
    const response = await fetch('/api/check-updates');
    const data = await response.json();
    if (data.hasUpdates) {
        updateUI(data);
    }
}, 3000);
```

**Плюсы:**
- Просто реализовать
- Работает везде

**Минусы:**
- Задержка до 3 секунд
- Пустые запросы впустую

**Когда использовать:** Обновления раз в минуту и реже (курсы валют, погода)

---

### 2. Long Polling (длинный опрос)

```php
// На сервере держим соединение открытым
set_time_limit(30);

while (true) {
    $newMessages = getNewMessages($lastId);
    
    if (!empty($newMessages)) {
        echo json_encode($newMessages);
        exit;
    }
    
    sleep(1); // Ждём секунду
    
    if (connection_aborted()) {
        exit;
    }
}
```

```javascript
// На клиенте сразу делаем новый запрос
async function longPoll() {
    try {
        const response = await fetch('/api/long-poll');
        const data = await response.json();
        updateUI(data);
    } catch (e) {
        console.error(e);
    }
    
    longPoll(); // Рекурсивно запускаем снова
}

longPoll();
```

**Плюсы:**
- Нет задержки — ответ приходит сразу при появлении данных
- Меньше пустых запросов

**Минусы:**
- Сервер держит соединение открытым (тратит ресурсы)
- Сложнее масштабировать
- Всё ещё overhead HTTP-заголовков

**Когда использовать:** Нечастые обновления (уведомления, статусы заказов)

---

### 3. Server-Sent Events (SSE)

```php
// server.php
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');

while (true) {
    $data = getCurrentData();
    echo "data: " . json_encode($data) . "\n\n";
    ob_flush();
    flush();
    sleep(2);
}
```

```javascript
const eventSource = new EventSource('/api/events');

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Получены данные:', data);
};
```

**Плюсы:**
- Простой API в браузере
- Автоматическое переподключение
- Текстовый формат

**Минусы:**
- **Только сервер → клиент** (нельзя отправлять данные от клиента)
- Не подходит для двустороннего общения

**Когда использовать:** Лента новостей, биржевые котировки, логи

---

### 4. WebSocket — полноценный дуплекс

```javascript
const ws = new WebSocket('ws://localhost:8080');

// Клиент может отправить
ws.send(JSON.stringify({
    type: 'message',
    text: 'Привет!'
}));

// Сервер может отправить в любой момент
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('От сервера:', data);
};
```

**Плюсы:**
- **Двусторонняя связь** в реальном времени
- Одно долгоживущее соединение
- Минимальный overhead (после handshake)
- Бинарные данные (не только текст)

**Минусы:**
- Сложнее настраивать
- Нужен постоянный connection (не подходит для serverless)

---

## 🔌 Как работает WebSocket

### Этап 1: HTTP Upgrade Handshake

WebSocket начинается как обычный HTTP-запрос:

```http
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

Сервер отвечает:

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

**После этого протокол меняется с HTTP на WebSocket!**

---

### Этап 2: Framing — отправка данных

Данные передаются фреймами (кадрами):

```
  0                   1                   2                   3
  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 +-+-+-+-+-------+-+-------------+-------------------------------+
 |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
 |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
 |N|V|V|V|       |S|             |   (if payload len==126/127)   |
 | |1|2|3|       |K|             |                               |
 +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
 |     Extended payload length continued, if payload len == 127  |
 + - - - - - - - - - - - - - - - +-------------------------------+
 |                               |Masking-key, if MASK set to 1  |
 +-------------------------------+-------------------------------+
 | Masking-key (continued)       |          Payload Data         |
 +-------------------------------- - - - - - - - - - - - - - - - +
 :                     Payload Data continued ...                :
 + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
 |                     Payload Data continued ...                |
 +---------------------------------------------------------------+
```

**Не пугайся!** Библиотеки делают это за тебя. Суть:
- `FIN` — последний ли это фрагмент сообщения
- `opcode` — тип данных (текст=1, бинарные=2, закрытие=8, ping=9)
- `MASK` — данные от клиента маскируются (безопасность)
- `Payload` — сами данные

---

### Этап 3: Поддержание соединения

```javascript
// Ping/Pong для проверки соединения
setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.ping(); // Библиотека автоматически отправит pong
    }
}, 30000); // Каждые 30 секунд
```

---

## 📊 Сравнение подходов

| Характеристика | HTTP Polling | Long Polling | SSE | WebSocket |
|---|---|---|---|---|
| **Задержка** | Высокая (период опроса) | Низкая | Очень низкая | Минимальная |
| **Направление** | Клиент → Сервер | Клиент → Сервер | Сервер → Клиент | Двусторонняя |
| **Overhead** | Огромный | Большой | Средний | Минимальный |
| **Сложность** | Простая | Средняя | Простая | Высокая |
| **Масштабирование** | Легко | Сложно | Средне | Сложно |
| **Поддержка браузеров** | 100% | 100% | 95% | 98% |
| **Бинарные данные** | Нет | Нет | Нет | Да |

---

## 🎯 Когда использовать WebSocket

### ✅ Идеальные сценарии

1. **Чаты и мессенджеры**
```javascript
// Сообщение отправляется мгновенно
ws.send(JSON.stringify({
    type: 'chat_message',
    room: 'general',
    text: 'Привет всем!'
}));
```

2. **Многопользовательские игры**
```javascript
// Позиция игрока обновляется 60 раз в секунду
setInterval(() => {
    ws.send(JSON.stringify({
        type: 'player_position',
        x: player.x,
        y: player.y
    }));
}, 16); // ~60 FPS
```

3. **Совместная работа** (Google Docs, Figma)
```javascript
// Курсор другого пользователя двигается в реальном времени
ws.onmessage = (event) => {
    const { type, userId, x, y } = JSON.parse(event.data);
    if (type === 'cursor_move') {
        updateCursor(userId, x, y);
    }
};
```

4. **Финансовые данные**
```javascript
// Цена акции обновляется каждую секунду
ws.onmessage = (event) => {
    const { stock, price } = JSON.parse(event.data);
    updateStockPrice(stock, price);
};
```

5. **Онлайн-статусы**
```javascript
// Пользователь печатает...
ws.send(JSON.stringify({
    type: 'typing_status',
    chatId: 123,
    isTyping: true
}));
```

---

### ❌ Когда WebSocket избыточен

1. **Редкие обновления** (раз в минуту и реже)
```javascript
// Достаточно обычного HTTP
setInterval(() => {
    fetch('/api/weather').then(r => r.json());
}, 60000); // Раз в минуту
```

2. **Односторонняя передача** (только сервер → клиент)
```javascript
// Используй SSE
const eventSource = new EventSource('/api/notifications');
eventSource.onmessage = (e) => {
    showNotification(JSON.parse(e.data));
};
```

3. **RESTful API**
```javascript
// Обычный CRUD — не нужен WebSocket
fetch('/api/posts', {
    method: 'POST',
    body: JSON.stringify(postData)
});
```

4. **Файловые загрузки**
```javascript
// HTTP лучше подходит для файлов
const formData = new FormData();
formData.append('file', file);
fetch('/upload', { method: 'POST', body: formData });
```

---

## 🛠 Практический пример: простой WebSocket-сервер на PHP

### Установка библиотеки

```bash
composer require ratchet/pawl
```

### Сервер (server.php)

```php
<?php
require 'vendor/autoload.php';

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

class Chat implements MessageComponentInterface
{
    protected $clients;
    
    public function __construct()
    {
        $this->clients = new \SplObjectStorage;
    }
    
    public function onOpen(ConnectionInterface $conn)
    {
        $this->clients->attach($conn);
        echo "Новое подключение! ({$conn->resourceId})\n";
        
        // Отправляем приветствие
        $conn->send(json_encode([
            'type' => 'system',
            'message' => 'Добро пожаловать в чат!'
        ]));
    }
    
    public function onMessage(ConnectionInterface $from, $msg)
    {
        $data = json_decode($msg, true);
        
        echo "Сообщение от {$from->resourceId}: {$msg}\n";
        
        // Отправляем всем, кроме отправителя
        foreach ($this->clients as $client) {
            if ($from !== $client) {
                $client->send(json_encode([
                    'type' => 'message',
                    'userId' => $from->resourceId,
                    'text' => $data['text'],
                    'time' => date('H:i:s')
                ]));
            }
        }
    }
    
    public function onClose(ConnectionInterface $conn)
    {
        $this->clients->detach($conn);
        echo "Отключение {$conn->resourceId}\n";
        
        // Уведомляем остальных
        foreach ($this->clients as $client) {
            $client->send(json_encode([
                'type' => 'user_left',
                'userId' => $conn->resourceId
            ]));
        }
    }
    
    public function onError(ConnectionInterface $conn, \Exception $e)
    {
        echo "Ошибка: {$e->getMessage()}\n";
        $conn->close();
    }
}

$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new Chat()
        )
    ),
    8080
);

echo "WebSocket сервер запущен на порту 8080\n";
$server->run();
```

### Запуск сервера

```bash
php server.php
```

### Клиент (index.html)

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>WebSocket Chat</title>
    <style>
        #messages { 
            height: 400px; 
            overflow-y: scroll; 
            border: 1px solid #ccc; 
            padding: 10px;
            margin-bottom: 10px;
        }
        .message { margin: 5px 0; }
        .system { color: gray; font-style: italic; }
        .own { color: blue; }
        .other { color: green; }
    </style>
</head>
<body>
    <div id="messages"></div>
    <input type="text" id="messageInput" placeholder="Введите сообщение">
    <button onclick="sendMessage()">Отправить</button>
    
    <script>
        const ws = new WebSocket('ws://localhost:8080');
        const messagesDiv = document.getElementById('messages');
        const input = document.getElementById('messageInput');
        
        ws.onopen = () => {
            console.log('Подключено к серверу');
            addMessage('Подключено к чату', 'system');
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            switch(data.type) {
                case 'system':
                    addMessage(data.message, 'system');
                    break;
                case 'message':
                    addMessage(
                        `[${data.time}] Пользователь ${data.userId}: ${data.text}`,
                        'other'
                    );
                    break;
                case 'user_left':
                    addMessage(`Пользователь ${data.userId} покинул чат`, 'system');
                    break;
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            addMessage('Ошибка подключения', 'system');
        };
        
        ws.onclose = () => {
            console.log('Отключено от сервера');
            addMessage('Отключено от чата', 'system');
        };
        
        function sendMessage() {
            const text = input.value.trim();
            if (!text) return;
            
            ws.send(JSON.stringify({
                type: 'chat_message',
                text: text
            }));
            
            addMessage(`[${new Date().toLocaleTimeString()}] Вы: ${text}`, 'own');
            input.value = '';
        }
        
        function addMessage(text, className) {
            const div = document.createElement('div');
            div.className = `message ${className}`;
            div.textContent = text;
            messagesDiv.appendChild(div);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    </script>
</body>
</html>
```

---

## 🔐 Безопасность WebSocket

### 1. Используй WSS (WebSocket Secure)

```javascript
// ❌ Небезопасно
const ws = new WebSocket('ws://example.com');

// ✅ Безопасно (HTTPS эквивалент)
const ws = new WebSocket('wss://example.com');
```

### 2. Аутентификация при подключении

```php
public function onOpen(ConnectionInterface $conn)
{
    // Проверяем токен из query string
    $query = $conn->httpRequest->getUri()->getQuery();
    parse_str($query, $params);
    
    if (!isset($params['token']) || !$this->validateToken($params['token'])) {
        $conn->close();
        return;
    }
    
    $userId = $this->getUserIdFromToken($params['token']);
    $conn->userId = $userId;
    $this->clients->attach($conn);
}
```

```javascript
// На клиенте
const token = localStorage.getItem('auth_token');
const ws = new WebSocket(`wss://example.com?token=${token}`);
```

### 3. Валидация входящих данных

```php
public function onMessage(ConnectionInterface $from, $msg)
{
    $data = json_decode($msg, true);
    
    // Проверка типа сообщения
    if (!isset($data['type']) || !in_array($data['type'], ['chat', 'typing'])) {
        return;
    }
    
    // Санитизация текста
    if ($data['type'] === 'chat') {
        $data['text'] = htmlspecialchars($data['text'], ENT_QUOTES, 'UTF-8');
        $data['text'] = substr($data['text'], 0, 500); // Лимит длины
    }
    
    $this->broadcastMessage($from, $data);
}
```

### 4. Rate Limiting

```php
class Chat implements MessageComponentInterface
{
    private $messageCounts = [];
    
    public function onMessage(ConnectionInterface $from, $msg)
    {
        $userId = $from->userId;
        
        // Не более 10 сообщений в секунду
        if (!isset($this->messageCounts[$userId])) {
            $this->messageCounts[$userId] = ['count' => 0, 'time' => time()];
        }
        
        $now = time();
        if ($now > $this->messageCounts[$userId]['time']) {
            $this->messageCounts[$userId] = ['count' => 0, 'time' => $now];
        }
        
        $this->messageCounts[$userId]['count']++;
        
        if ($this->messageCounts[$userId]['count'] > 10) {
            $from->send(json_encode([
                'type' => 'error',
                'message' => 'Слишком много сообщений'
            ]));
            return;
        }
        
        // Обработка сообщения...
    }
}
```

---

## 🏗 Архитектура масштабируемого WebSocket-приложения

### Проблема: несколько серверов

```
Пользователь A → Сервер 1
Пользователь B → Сервер 2

A отправляет сообщение → Сервер 1
Как Сервер 2 узнает и отправит B?
```

### Решение: Redis Pub/Sub

```php
use Predis\Client as RedisClient;

class Chat implements MessageComponentInterface
{
    private $redis;
    
    public function __construct()
    {
        $this->clients = new \SplObjectStorage;
        $this->redis = new RedisClient();
        
        // Подписываемся на канал
        $this->subscribeToRedis();
    }
    
    private function subscribeToRedis()
    {
        $pubsub = $this->redis->pubSubLoop();
        $pubsub->subscribe('chat_messages');
        
        foreach ($pubsub as $message) {
            if ($message->kind === 'message') {
                $data = json_decode($message->payload, true);
                $this->broadcastToLocalClients($data);
            }
        }
    }
    
    public function onMessage(ConnectionInterface $from, $msg)
    {
        $data = json_decode($msg, true);
        
        // Публикуем в Redis
        $this->redis->publish('chat_messages', json_encode([
            'userId' => $from->userId,
            'text' => $data['text'],
            'time' => time()
        ]));
    }
    
    private function broadcastToLocalClients($data)
    {
        foreach ($this->clients as $client) {
            $client->send(json_encode($data));
        }
    }
}
```

---

## 🎓 Упражнения

### Задание 1: Онлайн-счётчик пользователей

Создай WebSocket-сервер, который:
- Показывает количество подключённых пользователей
- При подключении/отключении обновляет счётчик у всех

<details>
<summary>💡 Подсказка</summary>

```php
public function onOpen(ConnectionInterface $conn)
{
    $this->clients->attach($conn);
    $this->broadcastUserCount();
}

public function onClose(ConnectionInterface $conn)
{
    $this->clients->detach($conn);
    $this->broadcastUserCount();
}

private function broadcastUserCount()
{
    $count = count($this->clients);
    foreach ($this->clients as $client) {
        $client->send(json_encode([
            'type' => 'user_count',
            'count' => $count
        ]));
    }
}
```
</details>

---

### Задание 2: Статус "печатает..."

Реализуй механизм показа "Пользователь печатает..." в чате

Требования:
- Статус отправляется при вводе текста
- Статус исчезает через 3 секунды бездействия
- Не отправлять слишком часто (throttling)

<details>
<summary>💡 Решение (клиент)</summary>

```javascript
let typingTimeout;
let isTyping = false;

input.addEventListener('input', () => {
    if (!isTyping) {
        isTyping = true;
        ws.send(JSON.stringify({ type: 'typing', status: true }));
    }
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        isTyping = false;
        ws.send(JSON.stringify({ type: 'typing', status: false }));
    }, 3000);
});
```
</details>

---

### Задание 3: Переподключение при обрыве

Реализуй автоматическое переподключение к WebSocket

Требования:
- Пытаться переподключиться при обрыве
- Экспоненциальная задержка (1s, 2s, 4s, 8s...)
- Максимум 5 попыток

<details>
<summary>💡 Решение</summary>

```javascript
class ReconnectingWebSocket {
    constructor(url) {
        this.url = url;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.connect();
    }
    
    connect() {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
            console.log('Connected');
            this.reconnectAttempts = 0;
        };
        
        this.ws.onclose = () => {
            console.log('Disconnected');
            this.reconnect();
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    
    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Максимум попыток переподключения');
            return;
        }
        
        const delay = Math.pow(2, this.reconnectAttempts) * 1000;
        this.reconnectAttempts++;
        
        console.log(`Переподключение через ${delay}ms...`);
        setTimeout(() => this.connect(), delay);
    }
    
    send(data) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(data);
        }
    }
}

const rws = new ReconnectingWebSocket('ws://localhost:8080');
```
</details>

---

## 📝 Чек-лист самопроверки

После изучения главы ты должен уметь:

- [ ] Объяснить, почему HTTP не подходит для real-time
- [ ] Назвать 3 альтернативы WebSocket и когда их использовать
- [ ] Описать процесс WebSocket handshake
- [ ] Создать простой WebSocket-сервер на PHP
- [ ] Подключиться к WebSocket из браузера
- [ ] Реализовать базовую аутентификацию
- [ ] Понимать разницу между ws:// и wss://
- [ ] Определить, когда WebSocket избыточен
- [ ] Обработать отключение и переподключение

---

## 🎯 Ключевые выводы

1. **HTTP — запрос-ответ**, WebSocket — постоянное соединение
2. **Polling** (опрос) — просто, но расточительно
3. **Long Polling** — лучше, но всё ещё overhead
4. **SSE** — отлично для односторонней передачи
5. **WebSocket** — для полноценного real-time двустороннего общения
6. Используй **wss://** для безопасности
7. **Аутентификация** обязательна при подключении
8. **Валидация** и rate limiting критически важны
9. Для масштабирования нужен **Redis Pub/Sub** или аналог
10. WebSocket — **не всегда лучший выбор**, оценивай требования

---

## 🚀 Что дальше?

В следующей главе мы изучим **Laravel Broadcasting** — как Laravel упрощает работу с WebSocket через удобные абстракции, события и каналы.