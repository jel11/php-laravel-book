# Глава 8.3: Suricata/Snort: написание IDS-правил

## 🎯 Цели главы

После изучения этой главы вы сможете:
- Понять архитектуру Snort и Suricata, их отличия
- Разбирать и писать правила IDS с нуля
- Использовать все ключевые опции правил: content, pcre, flow
- Писать правила для детекции конкретных атак
- Тестировать правила без боевого трафика
- Использовать Emerging Threats и другие источники готовых правил
- Настраивать Suricata в режиме IDS и IPS

---

## ⚔️ 8.3.1 Snort vs Suricata: сравнение

### Исторический контекст

**Snort** создан в 1998 году Мартином Решем. Долгое время был золотым стандартом IDS/IPS. Сейчас разрабатывается Cisco.

**Suricata** создана в 2009 году организацией OISF (Open Information Security Foundation). Разработана с нуля для современных сетей, поддерживает многопоточность и GPU-ускорение.

### Сравнительная таблица

| Характеристика | Snort 3 | Suricata |
|---------------|---------|---------|
| Многопоточность | Ограниченная | Полная нативная |
| Синтаксис правил | Snort syntax | Совместим со Snort + расширения |
| Lua-скрипты | Да (Snort 3) | Да |
| Файловое извлечение | Ограниченно | Да (HTTP, FTP, SMTP) |
| Поддержка протоколов | Меньше | Больше (включая HTTP/2) |
| Производительность | Хорошая | Отличная (особенно на многоядерных CPU) |
| Eve JSON логи | Нет | Да (подробные JSON-логи) |
| VXLAN/GRE/GENEVE | Нет | Да |
| Активное сообщество | Cisco | OISF + Community |
| Лицензия | GPLv2 | GPLv2 |

> **Note:** Suricata является предпочтительным выбором для новых установок из-за многопоточности и богатых возможностей логирования. Оба инструмента используют совместимый формат правил.

### Установка Suricata

```bash
# Ubuntu/Debian
sudo apt install suricata -y

# Или через официальный PPA (более свежая версия)
sudo add-apt-repository ppa:oisf/suricata-stable
sudo apt update
sudo apt install suricata -y

# Проверка версии
suricata --version

# Запуск с PCAP-файлом (режим offline)
sudo suricata -r capture.pcap -l /tmp/suricata_logs/

# Запуск в режиме IDS (мониторинг интерфейса)
sudo suricata -i eth0 -l /var/log/suricata/

# Основные конфиги и правила
ls /etc/suricata/
# suricata.yaml  — основной конфигурационный файл
# rules/         — директория с правилами
```

### Установка Snort 3

```bash
# Ubuntu/Debian
sudo apt install snort -y
# или Snort 3
sudo apt install snort3 -y

# Проверка
snort --version

# Запуск с PCAP
sudo snort -r capture.pcap -l /tmp/snort_logs/ -A fast
```

---

## 📝 8.3.2 Структура правила Suricata/Snort

Каждое правило состоит из трёх основных частей:

```
ACTION  HEADER  (OPTIONS)
```

### Общая структура

```
alert tcp $HOME_NET any -> $EXTERNAL_NET $HTTP_PORTS \
    (msg:"ET MALWARE Suspicious POST"; \
     flow:established,to_server; \
     content:"POST"; http_method; \
     content:"/gate.php"; http_uri; \
     classtype:trojan-activity; \
     sid:2000001; rev:1;)
```

Разбор по частям:

```
alert                   ← ACTION (действие)
tcp                     ← PROTOCOL (протокол)
$HOME_NET               ← SOURCE IP (IP источника)
any                     ← SOURCE PORT (порт источника)
->                      ← DIRECTION (направление)
$EXTERNAL_NET           ← DESTINATION IP (IP назначения)
$HTTP_PORTS             ← DESTINATION PORT (порт назначения)
(...)                   ← OPTIONS (опции)
```

---

## 🎬 8.3.3 Action (действие)

| Action | Описание | Режим |
|--------|----------|-------|
| `alert` | Создать alert, продолжить обработку | IDS + IPS |
| `drop` | Отбросить пакет + создать alert | Только IPS (inline) |
| `reject` | Отбросить + отправить TCP RST/ICMP | Только IPS (inline) |
| `pass` | Пропустить без проверки правил | IDS + IPS |
| `rejectsrc` | Отправить RST только источнику | Только IPS |
| `rejectdst` | Отправить RST только назначению | Только IPS |
| `rejectboth` | Отправить RST обеим сторонам | Только IPS |

```
# В режиме IDS (–i eth0 или –r file.pcap) — drop не работает, используется как alert
# В режиме IPS (через NFQueue или AF_PACKET inline) — drop реально блокирует трафик
```

---

## 📡 8.3.4 Header (заголовок правила)

### Протоколы

```
tcp    — TCP-трафик
udp    — UDP-трафик
icmp   — ICMP-трафик
ip     — Любой IP-трафик (включает TCP, UDP, ICMP)
http   — HTTP (протокол 7-го уровня, Suricata app layer)
dns    — DNS (Suricata app layer)
tls    — TLS/SSL (Suricata app layer)
ssh    — SSH (Suricata app layer)
smtp   — SMTP (Suricata app layer)
ftp    — FTP (Suricata app layer)
```

### IP-адреса и переменные

```
# Одиночный IP
alert tcp 192.168.1.100 any -> ...

# CIDR-нотация
alert tcp 192.168.1.0/24 any -> ...

# Список IP (через запятую в квадратных скобках)
alert tcp [192.168.1.1,192.168.1.2,10.0.0.1] any -> ...

# Диапазон IP (только Suricata)
alert tcp [192.168.1.0/24,10.0.0.0/8] any -> ...

# Отрицание
alert tcp !192.168.1.0/24 any -> ...

# Предопределённые переменные (из suricata.yaml)
$HOME_NET       — внутренняя сеть (настраивается в конфиге)
$EXTERNAL_NET   — внешняя сеть (обычно !$HOME_NET)
$HTTP_SERVERS   — веб-серверы
$DNS_SERVERS    — DNS-серверы
$SMTP_SERVERS   — почтовые серверы
any             — любой адрес
```

### Порты

```
# Одиночный порт
alert tcp any any -> any 80 (...)

# Список портов
alert tcp any any -> any [80,443,8080,8443] (...)

# Диапазон
alert tcp any any -> any 1024:65535 (...)

# Отрицание
alert tcp any any -> any !22 (...)

# Предопределённые переменные
$HTTP_PORTS     — [80,8080,8000,8008,8180,8888]
$SSL_PORTS      — [443,465,636,989,990,993,995,8443]
$SSH_PORTS      — 22
$SQL_PORTS      — [3306,1433,1521,5432]
any             — любой порт
```

### Направление

```
->      — только от SOURCE к DESTINATION
<>      — bidirectional (в обе стороны)
# Примечание: <- не существует, используйте -> с переставленными адресами
```

---

## ⚙️ 8.3.5 Options (опции правила)

### Обязательные опции

```
msg:"Описание алерта";    # Сообщение в логе
sid:2000001;              # Уникальный идентификатор правила (> 1000000 для кастомных)
rev:1;                    # Ревизия правила
```

### Поиск содержимого: content

```
# Поиск строки в payload
content:"cmd.exe";

# Поиск без учёта регистра
content:"password"; nocase;

# Поиск бинарной последовательности
content:"|41 42 43|";        # ASCII: ABC
content:"|90 90 90 90|";     # NOP slide (shellcode)

# Смешанный поиск
content:"GET |20| /";        # "GET " с пробелом как hex

# Привязка к конкретным частям HTTP
content:"/admin/"; http_uri;
content:"Mozilla"; http_user_agent;
content:"Host: evil.com"; http_header;
content:"username=admin"; http_client_body;

# Offset и depth
content:"ADMIN"; offset:10; depth:20;
# Искать ADMIN начиная с 10-го байта, в пределах 20 байт

# Distance и within
content:"USER"; content:"PASS"; distance:1; within:100;
# PASS должен быть после USER, с расстоянием минимум 1 байт,
# и в пределах 100 байт от конца USER
```

### Регулярные выражения: pcre

```
# PCRE (Perl Compatible Regular Expression)
pcre:"/pattern/модификаторы";

# Модификаторы:
# i — case insensitive
# s — . включает \n
# m — ^ и $ для каждой строки
# x — игнорировать пробелы и комментарии
# A — anchored (только в начале payload)
# E — включить PCRE_DOLLAR_ENDONLY
# G — invert greedy

# HTTP-специфичные модификаторы:
# U — применить к http_uri (нормализованный URI)
# I — применить к http_uri (raw URI)
# P — применить к http_client_body
# H — применить к http_header
# D — применить к http_raw_header
# M — применить к http_method
# C — применить к http_cookie
# S — применить к http_stat_msg
# Y — применить к http_stat_code
# B — raw payload (не decode)
# R — relative (относительно последнего content match)
# O — override rawbytes

# Примеры:
pcre:"/SELECT.+FROM/i";                    # SQL SELECT ... FROM
pcre:"/\.(php|asp|aspx|jsp)\?.*=/i";      # Параметры к веб-скриптам
pcre:"/(\.\./){2,}/U";                    # Path traversal
pcre:"/[a-z0-9]{30,}\.(com|net|org)/i";  # Длинные субдомены (DGA)
pcre:"/eval\s*\(/i";                      # eval() в JS/PHP
pcre:"/<script[^>]*>/i";                  # XSS тег
```

### flow: направление в TCP-сессии

```
flow:established;           # Установленное соединение
flow:to_server;             # От клиента к серверу
flow:to_client;             # От сервера к клиенту
flow:from_client;           # Синоним to_server
flow:from_server;           # Синоним to_client
flow:stateless;             # Не отслеживать состояние
flow:no_stream;             # Не использовать stream reassembly
flow:only_stream;           # Только stream reassembly

# Комбинации
flow:established,to_server;        # Запрос клиента в установленной сессии
flow:established,to_client;        # Ответ сервера в установленной сессии
flow:established,to_server,no_frag; # Без фрагментации
```

> **Note:** Всегда используйте `flow:established` для правил, нацеленных на содержимое сессии. Это предотвращает ложные срабатывания на SYN/SYN-ACK пакеты.

### Дополнительные ключевые опции

```
# Пороговые значения — предотвращение алерт-шторма
threshold:type limit, track by_src, count 1, seconds 60;
# Триггер максимум 1 раз за 60 сек от одного источника

threshold:type both, track by_src, count 10, seconds 30;
# Триггер после 10 совпадений за 30 сек

threshold:type threshold, track by_src, count 5, seconds 10;
# Триггер каждые 5 совпадений за 10 сек

# metadata — дополнительная информация
metadata:affected_product Web_Server, attack_target Server;
metadata:created_at 2024_01_01, updated_at 2024_06_01;

# classtype — категория атаки
classtype:trojan-activity;
classtype:attempted-recon;
classtype:web-application-attack;
classtype:protocol-command-decode;
classtype:bad-unknown;
classtype:network-scan;
classtype:denial-of-service;
classtype:shellcode-detect;
classtype:policy-violation;

# reference — ссылки на CVE/описание
reference:cve,2024-12345;
reference:url,www.exploit-db.com/exploits/12345;
reference:md5,abc123def456;

# priority
priority:1;    # Критический
priority:2;    # Высокий
priority:3;    # Средний (по умолчанию для большинства classtype)
priority:4;    # Низкий

# rawbytes — искать в сыром (не-декодированном) payload
content:"test"; rawbytes;

# noalert — не создавать alert (только для pass и drop)
pass tcp any any -> any any (noalert; sid:9999999; rev:1;)

# fast_pattern — подсказка движку о наиболее редком паттерне
content:"UNION SELECT"; fast_pattern; nocase;
```

---

## 🔧 8.3.6 Написание правил для конкретных атак

### 1. Детекция SQL Injection

```suricata
# Базовое правило — UNION SELECT
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS \
    (msg:"ET WEB_SERVER SQL Injection UNION SELECT"; \
     flow:established,to_server; \
     content:"UNION"; http_uri; nocase; fast_pattern; \
     content:"SELECT"; http_uri; nocase; \
     pcre:"/UNION.{0,10}SELECT/Ui"; \
     classtype:web-application-attack; \
     sid:2100001; rev:2;)

# OR 1=1 инъекция
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS \
    (msg:"ET WEB_SERVER SQL Injection OR 1=1"; \
     flow:established,to_server; \
     pcre:"/(\bOR\b.{0,10}1\s*=\s*1|\bOR\b.{0,10}\'[^\']*\'\s*=\s*\'[^\']*\')/Ui"; \
     classtype:web-application-attack; \
     sid:2100002; rev:1;)

# Error-based SQLi (поиск SQL ошибок в ответе)
alert http $HTTP_SERVERS $HTTP_PORTS -> $EXTERNAL_NET any \
    (msg:"ET WEB_SERVER SQL Error in Response"; \
     flow:established,to_client; \
     content:"200"; http_stat_code; \
     pcre:"/(?:you have an error in your sql syntax|warning: mysql_|unclosed quotation mark|microsoft ole db provider for sql|ora-\d{5})/Pi"; \
     classtype:web-application-attack; \
     sid:2100003; rev:1;)

# SQLmap User-Agent
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS \
    (msg:"ET SCAN sqlmap SQL Injection Tool"; \
     flow:established,to_server; \
     content:"sqlmap"; http_user_agent; nocase; \
     classtype:web-application-attack; \
     sid:2100004; rev:2;)
```

### 2. Детекция XSS

```suricata
# Базовый XSS: тег <script>
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS \
    (msg:"ET WEB_SERVER XSS Attempt script tag"; \
     flow:established,to_server; \
     content:"<script"; http_uri; nocase; fast_pattern; \
     pcre:"/<script[^>]*>/Ui"; \
     classtype:web-application-attack; \
     sid:2200001; rev:1;)

# XSS через атрибуты событий
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS \
    (msg:"ET WEB_SERVER XSS Event Handler Attempt"; \
     flow:established,to_server; \
     pcre:"/\bon(?:load|error|click|mouseover|focus|blur|submit|change|keydown|keypress)\s*=/Ui"; \
     classtype:web-application-attack; \
     sid:2200002; rev:1;)

# javascript: протокол
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS \
    (msg:"ET WEB_SERVER XSS javascript: URI"; \
     flow:established,to_server; \
     content:"javascript:"; http_uri; nocase; \
     classtype:web-application-attack; \
     sid:2200003; rev:1;)

# Reflect XSS в ответе
alert http $HTTP_SERVERS $HTTP_PORTS -> $EXTERNAL_NET any \
    (msg:"ET WEB_SERVER Potential XSS in Response"; \
     flow:established,to_client; \
     content:"200"; http_stat_code; \
     content:"<script"; http_server_body; nocase; \
     content:"document.cookie"; http_server_body; nocase; distance:0; within:500; \
     classtype:web-application-attack; \
     sid:2200004; rev:1;)
```

### 3. Детекция сканирования портов

```suricata
# Nmap SYN scan (порты без ACK)
# Примечание: детекция сканирования лучше делается через threshold
alert tcp $EXTERNAL_NET any -> $HOME_NET any \
    (msg:"ET SCAN Nmap SYN Scan"; \
     flow:stateless; \
     flags:S,12; \
     window:1024; \
     threshold:type both, track by_src, count 20, seconds 3; \
     classtype:attempted-recon; \
     sid:2300001; rev:1;)

# Nmap NULL scan (нет флагов)
alert tcp $EXTERNAL_NET any -> $HOME_NET any \
    (msg:"ET SCAN Nmap NULL Scan"; \
     flow:stateless; \
     flags:0; \
     classtype:attempted-recon; \
     sid:2300002; rev:1;)

# Nmap XMAS scan (FIN+PSH+URG)
alert tcp $EXTERNAL_NET any -> $HOME_NET any \
    (msg:"ET SCAN Nmap XMAS Scan"; \
     flow:stateless; \
     flags:FPU; \
     classtype:attempted-recon; \
     sid:2300003; rev:1;)

# Nmap FIN scan
alert tcp $EXTERNAL_NET any -> $HOME_NET any \
    (msg:"ET SCAN Nmap FIN Scan"; \
     flow:stateless; \
     flags:F,12; \
     classtype:attempted-recon; \
     sid:2300004; rev:1;)

# Masscan обнаружение (быстрое сканирование)
alert tcp $EXTERNAL_NET any -> $HOME_NET any \
    (msg:"ET SCAN Masscan Scan Detected"; \
     flow:stateless; \
     flags:S,12; \
     window:1024; \
     content:"|00 00|"; offset:4; depth:4; \
     threshold:type both, track by_src, count 100, seconds 1; \
     classtype:network-scan; \
     sid:2300005; rev:1;)
```

### 4. Детекция брутфорса SSH

```suricata
# Множество попыток подключения к SSH
alert tcp $EXTERNAL_NET any -> $SSH_SERVERS $SSH_PORTS \
    (msg:"ET SCAN SSH Brute Force Attempt"; \
     flow:established,to_server; \
     content:"SSH"; offset:0; depth:3; \
     threshold:type both, track by_src, count 5, seconds 60; \
     classtype:attempted-admin; \
     sid:2400001; rev:2;)

# Обнаружение по User-Auth failed в SSH-баннере
alert tcp $SSH_SERVERS $SSH_PORTS -> $EXTERNAL_NET any \
    (msg:"ET BRUTE SSH Authentication Failed"; \
     flow:established,to_client; \
     content:"Authentication failed"; \
     threshold:type both, track by_src, count 3, seconds 30; \
     classtype:attempted-admin; \
     sid:2400002; rev:1;)

# Нестандартный SSH client (Hydra, Medusa)
alert tcp $EXTERNAL_NET any -> $HOME_NET $SSH_PORTS \
    (msg:"ET SCAN SSH Brute Force Tool Hydra"; \
     flow:established,to_server; \
     content:"libssh"; \
     classtype:attempted-admin; \
     sid:2400003; rev:1;)

alert tcp $EXTERNAL_NET any -> $HOME_NET $SSH_PORTS \
    (msg:"ET SCAN SSH Brute Force Tool Medusa"; \
     flow:established,to_server; \
     content:"Medusa"; offset:0; depth:12; \
     classtype:attempted-admin; \
     sid:2400004; rev:1;)
```

### 5. Детекция DNS Tunneling

```suricata
# Аномально длинные DNS-запросы
alert dns $HOME_NET any -> any any \
    (msg:"ET DNS Suspiciously Long DNS Query (possible tunneling)"; \
     dns.query; \
     pcre:"/[a-z0-9]{40,}\./i"; \
     classtype:bad-unknown; \
     sid:2500001; rev:1;)

# DNS TXT-запросы (используются для туннелирования)
alert dns $HOME_NET any -> any any \
    (msg:"ET DNS TXT Record Query Possible Tunneling"; \
     dns.query; \
     content:"|00 10|"; offset:0; depth:2; \
     threshold:type both, track by_src, count 10, seconds 60; \
     classtype:bad-unknown; \
     sid:2500002; rev:1;)

# iodine DNS tunnel (использует тип A с base32-именами)
alert udp $HOME_NET any -> any 53 \
    (msg:"ET DNS iodine DNS Tunnel Detected"; \
     content:"|00 01 00 00|"; offset:4; depth:4; \
     pcre:"/^[a-z2-7]{10,}\..*\./Ri"; \
     classtype:policy-violation; \
     sid:2500003; rev:2;)

# Высокая частота DNS-запросов (DGA или tunneling)
alert udp $HOME_NET any -> any 53 \
    (msg:"ET DNS Excessive DNS Queries (DGA or Tunneling)"; \
     threshold:type both, track by_src, count 100, seconds 10; \
     classtype:bad-unknown; \
     sid:2500004; rev:1;)

# DNS ответ с очень низким TTL
alert dns any any -> $HOME_NET any \
    (msg:"ET DNS Response with Very Low TTL (DNS Fast Flux)"; \
     dns.answer; \
     byte_test:4,<,10,4; \
     classtype:bad-unknown; \
     sid:2500005; rev:1;)
```

### 6. Детекция Beaconing C2

```suricata
# HTTP beaconing по User-Agent (Go HTTP client — часто используется малварью)
alert http $HOME_NET any -> $EXTERNAL_NET any \
    (msg:"ET MALWARE Go HTTP Client (Possible C2 Beacon)"; \
     flow:established,to_server; \
     content:"Go-http-client"; http_user_agent; \
     threshold:type both, track by_src, count 10, seconds 300; \
     classtype:trojan-activity; \
     sid:2600001; rev:1;)

# CobaltStrike Malleable C2 Profile — стандартный jQuery профиль
alert http $HOME_NET any -> $EXTERNAL_NET any \
    (msg:"ET MALWARE CobaltStrike Beacon jQuery Profile"; \
     flow:established,to_server; \
     content:"GET"; http_method; \
     content:"/jquery-3.3.1.min.js"; http_uri; \
     content:"Mozilla/5.0 (Windows NT 6.3"; http_user_agent; \
     classtype:trojan-activity; \
     sid:2600002; rev:3;)

# HTTP beaconing: регулярные запросы к одному URI
alert http $HOME_NET any -> $EXTERNAL_NET any \
    (msg:"ET MALWARE HTTP Beaconing Detected"; \
     flow:established,to_server; \
     content:"GET"; http_method; \
     pcre:"/\/[a-f0-9]{8}\.(php|aspx|jsp)/Ui"; \
     threshold:type both, track by_src, count 5, seconds 600; \
     classtype:trojan-activity; \
     sid:2600003; rev:1;)

# Meterpreter reverse HTTP
alert http $HOME_NET any -> $EXTERNAL_NET any \
    (msg:"ET MALWARE Metasploit Meterpreter Reverse HTTP"; \
     flow:established,to_server; \
     content:"POST"; http_method; \
     content:"/"; http_uri; depth:1; \
     content:"Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"; \
     http_header; \
     classtype:trojan-activity; \
     sid:2600004; rev:2;)

# Sliver C2 (Go-based)
alert http $HOME_NET any -> $EXTERNAL_NET $HTTP_PORTS \
    (msg:"ET MALWARE Sliver C2 Implant Beacon"; \
     flow:established,to_server; \
     content:"POST"; http_method; \
     content:"/v1/"; http_uri; depth:4; \
     content:"application/octet-stream"; http_header; \
     content:"|00 00 00|"; http_client_body; depth:3; \
     classtype:trojan-activity; \
     sid:2600005; rev:1;)

# Emotet C2 (банковский троян)
alert http $HOME_NET any -> $EXTERNAL_NET any \
    (msg:"ET MALWARE Emotet Banking Trojan CnC Beacon"; \
     flow:established,to_server; \
     content:"POST"; http_method; \
     content:".php"; http_uri; \
     content:"Content-Type: application/x-www-form-urlencoded"; http_header; \
     pcre:"/^[a-zA-Z0-9+\/]{100,}={0,2}$/P"; \
     classtype:trojan-activity; \
     sid:2600006; rev:1;)
```

---

## 🧪 8.3.7 Тестирование правил

### suricata -T: проверка синтаксиса

```bash
# Проверить конфигурацию и правила на синтаксические ошибки
sudo suricata -T -c /etc/suricata/suricata.yaml

# Проверить конкретный файл правил
sudo suricata -T -c /etc/suricata/suricata.yaml \
  -S /etc/suricata/rules/my_rules.rules

# Вывод при успехе:
# [STDOUT] This is Suricata version 7.0.0 RELEASE running in UNKNOWN mode
# [NOTICE] Configuration provided was successfully loaded.
# ...
```

### Тестирование на PCAP-файле

```bash
# Создать директорию для логов
mkdir -p /tmp/suricata_test

# Запустить анализ PCAP с нашими правилами
sudo suricata -r capture.pcap \
  -S /etc/suricata/rules/my_rules.rules \
  -l /tmp/suricata_test/ \
  --set outputs.1.enabled=no

# Посмотреть алерты в fast.log
cat /tmp/suricata_test/fast.log

# Посмотреть подробные алерты в eve.json
cat /tmp/suricata_test/eve.json | python3 -m json.tool | head -100

# Отфильтровать только события alert
cat /tmp/suricata_test/eve.json | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        evt = json.loads(line)
        if evt.get('event_type') == 'alert':
            print(f\"[{evt['timestamp']}] SID:{evt['alert']['signature_id']} {evt['alert']['signature']}\")
            print(f\"  {evt.get('src_ip','')}:{evt.get('src_port','')} -> {evt.get('dest_ip','')}:{evt.get('dest_port','')}\")\
    except: pass
"
```

### Создание тестового PCAP для правила

```python
#!/usr/bin/env python3
"""
Создание тестового PCAP для проверки правил IDS
"""
from scapy.all import *

def create_sqli_test_pcap(filename):
    """Создать PCAP с SQL Injection запросом"""
    packets = []
    
    # SYN
    syn = IP(src="10.0.0.1", dst="192.168.1.100") / \
          TCP(sport=12345, dport=80, flags="S", seq=1000)
    packets.append(syn)
    
    # SYN-ACK
    syn_ack = IP(src="192.168.1.100", dst="10.0.0.1") / \
              TCP(sport=80, dport=12345, flags="SA", seq=2000, ack=1001)
    packets.append(syn_ack)
    
    # ACK
    ack = IP(src="10.0.0.1", dst="192.168.1.100") / \
          TCP(sport=12345, dport=80, flags="A", seq=1001, ack=2001)
    packets.append(ack)
    
    # HTTP GET с SQL Injection
    sqli_payload = b"GET /search?q=1'+UNION+SELECT+1,2,3--+- HTTP/1.1\r\nHost: 192.168.1.100\r\n\r\n"
    http_req = IP(src="10.0.0.1", dst="192.168.1.100") / \
               TCP(sport=12345, dport=80, flags="PA", seq=1001, ack=2001) / \
               Raw(load=sqli_payload)
    packets.append(http_req)
    
    wrpcap(filename, packets)
    print(f"Тестовый PCAP создан: {filename}")

create_sqli_test_pcap('/tmp/sqli_test.pcap')
```

```bash
# Протестировать правило против созданного PCAP
sudo suricata -r /tmp/sqli_test.pcap \
  -S /etc/suricata/rules/my_rules.rules \
  -l /tmp/suricata_test/
cat /tmp/suricata_test/fast.log
```

---

## 📚 8.3.8 Emerging Threats: готовые правила

Emerging Threats (ET) — наиболее известная коллекция правил для Suricata/Snort.

### Установка через suricata-update

```bash
# suricata-update — официальный инструмент управления правилами
sudo suricata-update

# Просмотр доступных источников
sudo suricata-update list-sources

# Включить Emerging Threats Open
sudo suricata-update enable-source et/open

# Включить Emerging Threats Pro (платный)
sudo suricata-update enable-source et/pro --secret-code <ваш_код>

# Включить PT Research rules
sudo suricata-update enable-source ptresearch/attackdetection

# Обновить все включённые источники
sudo suricata-update

# Тестирование после обновления
sudo suricata -T
```

### Структура ET категорий правил

| Файл правил | Описание |
|------------|---------|
| `emerging-malware.rules` | Правила обнаружения малваря |
| `emerging-trojan.rules` | Троянские программы |
| `emerging-exploit.rules` | Эксплойты уязвимостей |
| `emerging-web_server.rules` | Атаки на веб-серверы |
| `emerging-web_client.rules` | Атаки на клиентов |
| `emerging-scan.rules` | Сканирование сетей |
| `emerging-dos.rules` | DoS/DDoS атаки |
| `emerging-phishing.rules` | Фишинговые атаки |
| `emerging-botnet.rules` | Ботнет активность |
| `emerging-current_events.rules` | Актуальные угрозы |
| `emerging-dns.rules` | DNS-аномалии |
| `emerging-ftp.rules` | FTP атаки |
| `emerging-smtp.rules` | Email атаки |
| `emerging-ssh.rules` | SSH атаки |
| `emerging-tor.rules` | TOR сети |
| `emerging-policy.rules` | Нарушения политик |

### Другие источники правил

| Источник | URL | Тип |
|---------|-----|-----|
| Emerging Threats Open | rules.emergingthreats.net | Бесплатный |
| Emerging Threats Pro | proofpoint.com/et | Платный |
| Snort Community Rules | snort.org/downloads | Бесплатный |
| PT Research | github.com/ptresearch | Бесплатный |
| ETPRO Telemetry | emergingthreats.net | Платный |
| ThreatButt | github.com/threatbutt | Бесплатный |

---

## 🛡️ 8.3.9 Режимы работы: IDS vs IPS

### IDS (Intrusion Detection System)

В режиме IDS Suricata только **наблюдает** за трафиком и **генерирует алерты**.

```bash
# Режим IDS — пассивный захват с интерфейса
sudo suricata -i eth0 -l /var/log/suricata/

# Режим IDS с PCAP-файлом
sudo suricata -r capture.pcap -l /var/log/suricata/

# Пример конфигурации в suricata.yaml
af-packet:
  - interface: eth0
    cluster-id: 99
    cluster-type: cluster_flow
    defrag: yes
    use-mmap: yes
    tpacket-v3: yes
```

### IPS (Intrusion Prevention System)

В режиме IPS Suricata может **блокировать** трафик через inline-режим.

```bash
# Метод 1: NFQueue (через iptables/nftables)
# Настройка iptables для перенаправления трафика в очередь
sudo iptables -I FORWARD -j NFQUEUE --queue-num 0
sudo iptables -I INPUT -j NFQUEUE --queue-num 0
sudo iptables -I OUTPUT -j NFQUEUE --queue-num 0

# Запуск Suricata с NFQueue
sudo suricata -q 0

# Конфигурация в suricata.yaml:
# nfqueue:
#   mode: accept  # или 'repeat' для повторной обработки
#   fail-open: yes

# Метод 2: AF_PACKET inline (более производительный)
sudo suricata --af-packet=eth0:eth1

# Конфигурация в suricata.yaml:
# af-packet:
#   - interface: eth0
#     copy-mode: ips
#     copy-iface: eth1
#   - interface: eth1
#     copy-mode: ips
#     copy-iface: eth0
```

### Сравнение правил action для IDS и IPS

```suricata
# В IDS режиме: alert = log; drop = log (не блокирует)
# В IPS режиме: alert = log; drop = log + блокировка

# Рекомендуется: начинать с alert, переходить на drop после проверки
# Переход от alert к drop:
alert tcp ... (msg:"Test Rule"; sid:9999001; rev:1;)
# После проверки: 0 ложных срабатываний за неделю
drop tcp ... (msg:"Test Rule"; sid:9999001; rev:2;)
```

---

## 📊 8.3.10 Анализ логов Suricata

### Форматы логов

```
fast.log     — краткие алерты в одну строку
eve.json     — подробные JSON-логи (рекомендуется)
stats.log    — статистика производительности
```

### Пример fast.log

```
01/15/2024-10:23:45.123456  [**] [1:2100001:2] ET WEB_SERVER SQL Injection UNION SELECT [**] [Classification: Web Application Attack] [Priority: 1] {TCP} 10.0.0.5:52341 -> 192.168.1.100:80
```

### Пример eve.json

```json
{
    "timestamp": "2024-01-15T10:23:45.123456+0000",
    "flow_id": 1234567890,
    "event_type": "alert",
    "src_ip": "10.0.0.5",
    "src_port": 52341,
    "dest_ip": "192.168.1.100",
    "dest_port": 80,
    "proto": "TCP",
    "alert": {
        "action": "allowed",
        "gid": 1,
        "signature_id": 2100001,
        "rev": 2,
        "signature": "ET WEB_SERVER SQL Injection UNION SELECT",
        "category": "Web Application Attack",
        "severity": 1
    },
    "http": {
        "hostname": "192.168.1.100",
        "url": "/search?q=1%27+UNION+SELECT+1,2,3--+-",
        "http_user_agent": "sqlmap/1.7.8",
        "http_method": "GET",
        "protocol": "HTTP/1.1",
        "status": 200
    }
}
```

### Анализ eve.json с jq

```bash
# Показать все алерты
cat /var/log/suricata/eve.json | jq 'select(.event_type=="alert")'

# Топ правил по количеству срабатываний
cat /var/log/suricata/eve.json | \
  jq -r 'select(.event_type=="alert") | .alert.signature' | \
  sort | uniq -c | sort -rn | head -20

# Топ источников атак
cat /var/log/suricata/eve.json | \
  jq -r 'select(.event_type=="alert") | .src_ip' | \
  sort | uniq -c | sort -rn | head -10

# Алерты за последний час
cat /var/log/suricata/eve.json | \
  jq 'select(.event_type=="alert" and (.timestamp > "2024-01-15T09:00:00"))'

# Найти HTTP-запросы по конкретному правилу
cat /var/log/suricata/eve.json | \
  jq 'select(.event_type=="alert" and .alert.signature_id==2100001) | 
      {src: .src_ip, url: .http.url, ua: .http.http_user_agent}'
```

---

## 🔬 8.3.11 Практические задания

### Задание 1: Написать 5 правил Suricata

**Задание:** Написать правила для детекции следующих атак.

```suricata
# Правило 1: Path Traversal в URL
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS \
    (msg:"CUSTOM Path Traversal Attack Detected"; \
     flow:established,to_server; \
     content:"../"; http_uri; fast_pattern; \
     pcre:"/(\.\./){2,}/Ui"; \
     classtype:web-application-attack; \
     sid:9001001; rev:1;)

# Правило 2: Попытка загрузки веб-шелла
alert http $EXTERNAL_NET any -> $HTTP_SERVERS $HTTP_PORTS \
    (msg:"CUSTOM WebShell Upload Attempt PHP"; \
     flow:established,to_server; \
     content:"POST"; http_method; \
     content:".php"; http_client_body; nocase; \
     content:"<?php"; http_client_body; nocase; \
     classtype:web-application-attack; \
     sid:9001002; rev:1;)

# Правило 3: Mimikatz через HTTP (вывод хэшей паролей)
alert http $HOME_NET any -> $EXTERNAL_NET any \
    (msg:"CUSTOM Potential Mimikatz Password Hash Exfiltration"; \
     flow:established,to_server; \
     content:"POST"; http_method; \
     pcre:"/[a-f0-9]{32}:[a-f0-9]{32}/Pi"; \
     classtype:trojan-activity; \
     sid:9001003; rev:1;)

# Правило 4: Обнаружение reverse shell через netcat
alert tcp $HOME_NET any -> $EXTERNAL_NET any \
    (msg:"CUSTOM Possible Reverse Shell Connection"; \
     flow:established,to_server; \
     content:"/bin/bash"; \
     content:"/bin/sh"; distance:0; within:50; \
     classtype:shellcode-detect; \
     sid:9001004; rev:1;)

# Правило 5: Base64-закодированные PowerShell-команды (малварь)
alert http $HOME_NET any -> $EXTERNAL_NET any \
    (msg:"CUSTOM PowerShell Base64 Encoded Command Exfiltration"; \
     flow:established,to_server; \
     content:"powershell"; http_client_body; nocase; fast_pattern; \
     content:"-enc"; http_client_body; nocase; distance:0; within:30; \
     content:"-e "; http_client_body; nocase; distance:0; within:30; \
     pcre:"/powershell.{0,20}-e(?:nc(?:odedcommand)?)?\s+[A-Za-z0-9+\/]{50,}/Pi"; \
     classtype:trojan-activity; \
     sid:9001005; rev:1;)
```

### Задание 2: Тестирование правил

```bash
# Сохранить правила в файл
cat > /etc/suricata/rules/custom.rules << 'EOF'
# Вставить правила из Задания 1
EOF

# Проверить синтаксис
sudo suricata -T -c /etc/suricata/suricata.yaml -S /etc/suricata/rules/custom.rules

# Создать тестовый PCAP для каждого правила
python3 << 'EOF'
from scapy.all import *

# Тест правила path traversal
payload = b"GET /files/../../etc/passwd HTTP/1.1\r\nHost: 192.168.1.100\r\n\r\n"

pkts = [
    IP(src="10.0.0.1", dst="192.168.1.100") /
    TCP(sport=12345, dport=80, flags="PA") /
    Raw(load=payload)
]
wrpcap('/tmp/path_traversal_test.pcap', pkts)
print("Тестовый PCAP создан")
EOF

# Запустить анализ
sudo suricata -r /tmp/path_traversal_test.pcap \
  -S /etc/suricata/rules/custom.rules \
  -l /tmp/test_logs/

cat /tmp/test_logs/fast.log
```

### Задание 3: Анализ готовых правил ET

```bash
# Скачать ET Open rules
sudo suricata-update

# Посмотреть правила для CobaltStrike
grep -i "cobalt" /var/lib/suricata/rules/emerging-malware.rules | head -20

# Разобрать первое правило:
# 1. Что детектирует?
# 2. Какой контент ищется?
# 3. Какой classtype?

# Найти все правила с pcre
grep "pcre:" /var/lib/suricata/rules/emerging-web_server.rules | wc -l

# Посмотреть правила для SQL Injection
grep -i "sql.injection" /var/lib/suricata/rules/emerging-web_server.rules | head -10
```

---

## ✅ Итог главы

В этой главе вы освоили:

- **Архитектуру** Snort и Suricata, их ключевые различия
- **Структуру правила**: action, header, options
- **Actions**: alert, drop, reject, pass и когда использовать каждый
- **Header**: протоколы, IP-переменные, порты, направление
- **Options**: msg, content, pcre, flow, threshold и многие другие
- **Написание правил** для реальных атак: SQLi, XSS, брутфорс, C2
- **Тестирование**: проверка синтаксиса и тестирование на PCAP
- **Emerging Threats**: использование готовых наборов правил
- **IDS vs IPS**: режимы работы и различия

> **Note:** Написание качественных правил IDS — это искусство нахождения баланса между чувствительностью (обнаружение всех атак) и специфичностью (минимум ложных срабатываний). Всегда тестируйте новые правила на историческом трафике перед применением в production.
