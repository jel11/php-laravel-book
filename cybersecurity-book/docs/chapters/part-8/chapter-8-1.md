# Глава 8.1: Wireshark: захват, фильтры, Follow Stream

## 🎯 Цели главы

После изучения этой главы вы сможете:
- Устанавливать и настраивать Wireshark на Linux и Windows
- Захватывать трафик с нужного сетевого интерфейса
- Применять фильтры захвата (BPF) и display filters
- Использовать Follow Stream для анализа сессий
- Анализировать HTTP, DNS, TLS и ARP трафик
- Строить статистику и графики на основе захваченного трафика
- Экспортировать артефакты из PCAP-файлов
- Разбирать PCAP-файлы с атаками в стиле CTF

---

## 📦 8.1.1 Установка Wireshark

### Установка на Linux (Ubuntu/Debian)

```bash
# Обновление репозиториев
sudo apt update

# Установка Wireshark
sudo apt install wireshark -y

# Во время установки система спросит, могут ли не-root пользователи захватывать пакеты.
# Выбрать Yes для удобства работы.

# Добавить текущего пользователя в группу wireshark
sudo usermod -aG wireshark $USER

# Применить изменения группы (или перелогиниться)
newgrp wireshark

# Проверить версию
wireshark --version
```

### Установка на Kali Linux

```bash
# Kali обычно имеет Wireshark предустановленным
which wireshark

# Если не установлен
sudo apt install wireshark tshark -y

# Запуск от текущего пользователя
sudo setcap 'CAP_NET_RAW+eip CAP_NET_ADMIN+eip' /usr/bin/dumpcap
```

### Установка на Windows

1. Перейти на официальный сайт: https://www.wireshark.org/download.html
2. Скачать Wireshark-win64-x.x.x.exe
3. Запустить установщик — он автоматически установит **Npcap** (драйвер захвата пакетов)
4. Убедиться, что при установке отмечены галочки:
   - Install Npcap
   - Install USBPcap (опционально)

```powershell
# Проверка версии через PowerShell
& "C:\Program Files\Wireshark\Wireshark.exe" --version

# Или через winget
winget install WiresharkFoundation.Wireshark
```

### Установка tshark (CLI-версия Wireshark)

```bash
# Linux
sudo apt install tshark -y

# Проверка
tshark --version

# macOS (через Homebrew)
brew install wireshark
```

> **Note:** tshark — это командная строчная версия Wireshark, использующая те же диссекторы протоколов. Незаменим для работы на серверах без GUI и для автоматизации анализа.

---

## 🖥️ 8.1.2 Интерфейс Wireshark

### Основные панели

```
┌─────────────────────────────────────────────────────────────┐
│  Меню: File | Edit | View | Go | Capture | Analyze | ...    │
├─────────────────────────────────────────────────────────────┤
│  Toolbar: Кнопки быстрого доступа                           │
├─────────────────────────────────────────────────────────────┤
│  Display Filter Bar: [  введите фильтр здесь   ] [Apply]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  СПИСОК ПАКЕТОВ (Packet List)                               │
│  No. │ Time │ Source │ Destination │ Protocol │ Length │ Info│
│  1   │ 0.00 │ 192.168.1.1 │ 8.8.8.8 │ DNS │ 74 │ ...   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ДЕТАЛИ ПАКЕТА (Packet Details)                             │
│  ▼ Frame 1: 74 bytes on wire                                │
│  ▼ Ethernet II, Src: ..., Dst: ...                          │
│  ▼ Internet Protocol Version 4                              │
│  ▼ User Datagram Protocol                                   │
│  ▼ Domain Name System (query)                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  БАЙТЫ ПАКЕТА (Packet Bytes) — HEX + ASCII                  │
│  0000  45 00 00 4a 12 34 40 00  40 11 xx xx c0 a8 01 01  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
│  Статусная строка: Packets: 1234 | Displayed: 56 | Dropped: 0│
└─────────────────────────────────────────────────────────────┘
```

### Настройка колонок

Для SOC-аналитика рекомендуется добавить следующие колонки:

| Колонка | Поле | Описание |
|---------|------|----------|
| No. | frame.number | Номер пакета |
| Time | frame.time_relative | Относительное время |
| Source | ip.src | IP источника |
| Destination | ip.dst | IP назначения |
| Src Port | tcp.srcport / udp.srcport | Порт источника |
| Dst Port | tcp.dstport / udp.dstport | Порт назначения |
| Protocol | frame.protocols | Протокол |
| Length | frame.len | Длина пакета |
| Info | _ws.col.info | Информация |

Добавление колонки:
1. Edit → Preferences → Appearance → Columns
2. Нажать "+" для добавления новой колонки
3. Выбрать тип поля или ввести вручную

### Цветовая маркировка пакетов

```
Красный фон    — TCP RST, ошибки
Тёмно-красный  — HTTP (клиент → сервер)
Синий          — DNS
Зелёный        — HTTP успешные ответы
Чёрный         — TCP-ошибки (плохая контрольная сумма и т.д.)
```

Настройка правил цветовой маркировки: View → Coloring Rules

### Настройка временных меток

```
View → Time Display Format:
- Date and Time of Day       — абсолютное время
- Seconds Since First Packet — относительное время (удобно для анализа)
- Seconds Since Previous Packet — дельта между пакетами
```

---

## 🔍 8.1.3 Захват трафика

### Выбор интерфейса

```
Capture → Options (или Ctrl+K)
```

Список доступных интерфейсов с графиком активности в реальном времени. Выбрать нужный интерфейс (eth0, wlan0, lo и т.д.).

```bash
# Просмотр доступных интерфейсов через tshark
tshark -D

# Пример вывода:
# 1. eth0
# 2. wlan0
# 3. lo (Loopback)
# 4. any (Pseudo-device that captures on all interfaces)
```

### Фильтры захвата (BPF — Berkeley Packet Filter)

Фильтры захвата применяются **до** сохранения пакетов. Они работают быстрее display filters, но имеют более ограниченный синтаксис.

**Синтаксис BPF:**

```
[not] primitive [and|or [not] primitive ...]
```

**Основные примитивы:**

| Примитив | Пример | Описание |
|----------|--------|----------|
| host | `host 192.168.1.1` | Трафик от/до хоста |
| net | `net 192.168.1.0/24` | Трафик от/до сети |
| port | `port 80` | Трафик на/с порта |
| portrange | `portrange 1-1024` | Диапазон портов |
| proto | `proto tcp` | По протоколу |
| tcp | `tcp` | Только TCP |
| udp | `udp` | Только UDP |
| icmp | `icmp` | Только ICMP |
| src | `src host 10.0.0.1` | Только от источника |
| dst | `dst port 443` | Только к назначению |
| ether | `ether host aa:bb:cc:dd:ee:ff` | По MAC-адресу |

**Примеры BPF-фильтров:**

```bash
# Только HTTP и HTTPS трафик
tcp port 80 or tcp port 443

# Трафик от конкретного хоста на веб-порты
src host 192.168.1.100 and (dst port 80 or dst port 443)

# Исключить SSH-трафик
not port 22

# Только DNS-запросы
udp port 53

# ICMP (ping)
icmp

# Все трафик для подсети, кроме broadcast
net 192.168.1.0/24 and not broadcast

# Захват больших пакетов (возможная эксфильтрация?)
greater 1400

# Только SYN-пакеты (начало соединений)
tcp[tcpflags] & tcp-syn != 0

# TCP-пакеты с флагом RST
tcp[tcpflags] & tcp-rst != 0
```

---

## 🔎 8.1.4 Display Filters

Display Filters применяются **после** захвата, к уже имеющимся пакетам. Поддерживают богатый синтаксис с обращением к любому полю протокола.

### Синтаксис

```
поле оператор значение
```

**Операторы сравнения:**

| Оператор | Символ | Пример |
|----------|--------|--------|
| equal | == или eq | `ip.addr == 10.0.0.1` |
| not equal | != или ne | `tcp.port != 80` |
| greater than | > или gt | `frame.len > 1000` |
| less than | < или lt | `frame.len < 100` |
| greater or equal | >= или ge | `ip.ttl >= 64` |
| less or equal | <= или le | `tcp.window_size <= 1024` |
| contains | contains | `http.host contains "google"` |
| matches (regex) | matches или ~ | `http.uri matches "\.php\?"` |
| bitwise AND | & | `tcp.flags & 0x02` |

**Логические операторы:**

| Оператор | Символ | Пример |
|----------|--------|--------|
| AND | && или and | `ip.src == 10.0.0.1 && tcp.port == 80` |
| OR | \|\| или or | `tcp.port == 80 \|\| tcp.port == 443` |
| NOT | ! или not | `!arp` |

### Полезные Display Filters

```text
# === IP-адреса ===
ip.addr == 192.168.1.1          # Любой трафик с/на IP
ip.src == 192.168.1.1           # Только от источника
ip.dst == 192.168.1.1           # Только к назначению
ip.addr == 192.168.1.0/24       # Вся подсеть

# === TCP/UDP ===
tcp.port == 80                  # TCP порт 80
tcp.dstport == 443              # Назначение HTTPS
tcp.flags.syn == 1              # SYN-флаг установлен
tcp.flags.rst == 1              # RST-флаг
tcp.flags == 0x002              # Только SYN
tcp.flags == 0x012              # SYN+ACK
tcp.analysis.retransmission     # Ретрансмиссии TCP
tcp.analysis.zero_window        # Zero Window

# === HTTP ===
http                            # Весь HTTP-трафик
http.request                    # Только запросы
http.response                   # Только ответы
http.request.method == "POST"   # POST-запросы
http.response.code == 200       # Успешные ответы
http.response.code >= 400       # Ошибки
http.host contains "evil.com"   # По домену
http.uri contains "admin"       # По URI
http.cookie contains "session"  # Поиск cookies
http.user_agent contains "curl" # По User-Agent
http.content_type contains "xml"# По Content-Type

# === DNS ===
dns                             # Весь DNS
dns.flags.response == 0         # Только запросы
dns.flags.response == 1         # Только ответы
dns.qry.name contains "evil"    # По имени запроса
dns.resp.ttl < 60               # Низкий TTL (DNS tunneling?)
dns.qry.type == 16              # TXT-записи (DNS tunneling)
dns.resp.len > 200              # Большие DNS-ответы

# === TLS/SSL ===
tls                             # Весь TLS
tls.handshake.type == 1         # ClientHello
tls.handshake.type == 2         # ServerHello
tls.handshake.extensions_server_name  # SNI
tls.alert                       # TLS-алерты

# === ARP ===
arp                             # Весь ARP
arp.opcode == 1                 # ARP Request
arp.opcode == 2                 # ARP Reply
arp.duplicate-address-detected  # Дублирование IP (ARP spoofing)

# === ICMP ===
icmp                            # Весь ICMP
icmp.type == 8                  # Echo Request (ping)
icmp.type == 0                  # Echo Reply
icmp.type == 3                  # Destination Unreachable
```

### Таблица важных Display Filters для SOC

| Фильтр | Что ищем | Приоритет |
|--------|----------|-----------|
| `http.request.method == "POST" && http.uri contains "login"` | Попытки авторизации | Высокий |
| `tcp.flags == 0x002 && tcp.dstport < 1024` | Сканирование портов | Высокий |
| `dns.qry.type == 16` | DNS TXT-записи (туннелирование) | Высокий |
| `dns.resp.ttl < 10` | Очень низкий TTL DNS | Средний |
| `http.user_agent contains "sqlmap"` | Инструменты атаки | Критический |
| `http.user_agent contains "nikto"` | Веб-сканирование | Критический |
| `ftp.request.command == "PASS"` | FTP-пароли в открытом виде | Высокий |
| `telnet` | Небезопасный протокол Telnet | Высокий |
| `smtp` | SMTP-трафик (утечка данных) | Средний |
| `tcp.analysis.retransmission` | Ретрансмиссии (нестабильность) | Низкий |
| `ip.ttl < 5` | Подозрительно малый TTL | Средний |
| `frame.len > 1400 && icmp` | Большие ICMP-пакеты (туннель) | Высокий |
| `http.response.code == 403` | Ответы "Forbidden" | Средний |
| `tcp.flags.reset == 1 && tcp.flags.ack == 1` | RST+ACK | Средний |
| `arp && eth.src[0:3] == 00:0c:29` | VMware MAC-адреса | Информационный |
| `(tcp.flags == 0x001) || (tcp.flags == 0x029)` | FIN/FIN+URG сканирование | Высокий |
| `dns.qry.name matches "[a-z0-9]{20,}\."` | Длинные субдомены (DGA) | Высокий |
| `http.request.uri matches "(\.\./){2,}"` | Path traversal | Критический |
| `http.request.uri matches "(%27|')" ` | SQL Injection попытки | Критический |
| `tls.handshake.type == 1 && !tls.handshake.extensions_server_name` | TLS без SNI (аномалия) | Средний |

---

## 🌊 8.1.5 Follow Stream

### Follow TCP Stream

Follow TCP Stream собирает всю сессию TCP в единый поток и показывает данные в человекочитаемом виде.

**Как использовать:**
1. Найти пакет нужного TCP-соединения
2. Правая кнопка → Follow → TCP Stream
3. Или: Analyze → Follow → TCP Stream

```
Красный цвет  — данные от клиента (→ серверу)
Синий цвет    — данные от сервера (→ клиенту)
```

**Пример: HTTP-запрос в Follow TCP Stream:**

```http
GET /admin/login.php HTTP/1.1
Host: target.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
Accept: text/html,application/xhtml+xml
Cookie: PHPSESSID=abc123def456; remember_me=1
Connection: keep-alive

HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
Set-Cookie: admin_token=eyJhbGciOiJIUzI1NiJ9...
Content-Length: 4321

<!DOCTYPE html>
<html>
<head><title>Admin Panel</title></head>
...
```

**Что искать в HTTP Stream:**
- Учётные данные в POST-запросах
- Cookies и токены авторизации
- Передача файлов (базы данных, конфиги)
- Признаки SQLi/XSS в URI
- Подозрительные заголовки

### Follow UDP Stream

Используется для анализа UDP-протоколов (DNS, DHCP, TFTP и т.д.).

```
Правая кнопка на DNS-пакете → Follow → UDP Stream
```

### Follow HTTP Stream

Специальный режим для HTTP, позволяет видеть декодированный HTTP без служебных байт TCP.

```
Правая кнопка на HTTP-пакете → Follow → HTTP Stream
```

### Опции экспорта из Follow Stream

В диалоге Follow Stream доступны варианты вывода:

| Формат | Описание |
|--------|----------|
| ASCII | Текстовое представление |
| C Arrays | Массив байт для C/C++ |
| EBCDIC | Для мейнфреймов |
| HEX Dump | Шестнадцатеричный дамп |
| Raw | Сырые байты |
| UTF-8 | Unicode текст |
| YAML | Для скриптинга |

---

## 🌐 8.1.6 Анализ HTTP-трафика

### Структура HTTP в Wireshark

```
▼ Hypertext Transfer Protocol
  ▼ GET /api/users HTTP/1.1\r\n
      Request Method: GET
      Request URI: /api/users
      Request Version: HTTP/1.1
  ▼ Host: api.example.com\r\n
  ▼ Authorization: Bearer eyJhbGci...\r\n
      Credentials: eyJhbGci...
  ▼ User-Agent: python-requests/2.28.0\r\n
  [Full request URI: http://api.example.com/api/users]
```

### Поиск учётных данных в HTTP

```bash
# Display filter для Basic Auth
http.authorization

# Display filter для форм с паролями
http.request.method == "POST" && http.file_data contains "password"

# Пример POST с учётными данными
http.request.method == "POST" && http.request.uri contains "login"
```

**Пример перехваченного POST-запроса:**

```
POST /wp-login.php HTTP/1.1
Host: victim.example.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 78

log=admin&pwd=SuperSecret123&wp-submit=Log+In&redirect_to=%2Fwp-admin%2F
```

### Анализ HTTP-ответов

```text
# Найти все редиректы
http.response.code == 301 || http.response.code == 302

# Найти ошибки сервера
http.response.code >= 500

# Найти большие ответы (возможная эксфильтрация)
http.content_length > 100000

# Найти необычные Content-Type
http.content_type contains "octet-stream"
```

### Анализ Cookie

```bash
# Display filter
http.cookie

# Пример вывода в Wireshark:
# Cookie: session=abc123; admin=true; remember_me=1

# Поиск небезопасных атрибутов (нет httponly/secure)
# Видно в Set-Cookie: если нет "HttpOnly" — уязвимость XSS
```

---

## 🔡 8.1.7 Анализ DNS-трафика

### Нормальный DNS-трафик

```
▼ Domain Name System (query)
  Transaction ID: 0x1234
  Flags: 0x0100 Standard query
  Questions: 1
  ▼ Queries
    ▼ google.com: type A, class IN
        Name: google.com
        Type: A (Host Address)
        Class: IN (0x0001)
```

```
▼ Domain Name System (response)
  Transaction ID: 0x1234
  Flags: 0x8180 Standard query response, No error
  Answers: 1
  ▼ Answers
    ▼ google.com: type A, class IN, addr 142.250.185.78
        Name: google.com
        Type: A
        TTL: 300
        Data length: 4
        Address: 142.250.185.78
```

### Аномалии в DNS-трафике

```text
# DNS-запросы с аномально длинными именами (DGA, туннелирование)
dns.qry.name.len > 50

# Запросы TXT-записей (частый вектор DNS tunneling)
dns.qry.type == 16

# Запросы NULL-записей (iodine использует этот тип)
dns.qry.type == 10

# Большие DNS-ответы
dns.resp.len > 512

# Много NXDOMAIN ответов (DGA-генератор доменов)
dns.flags.rcode == 3

# Запросы к нестандартным DNS-серверам
dns && ip.dst != 8.8.8.8 && ip.dst != 8.8.4.4 && ip.dst != 1.1.1.1
```

### Признаки DNS Tunneling

| Признак | Описание |
|---------|----------|
| Длинные субдомены | `base64encodeddata.evil.com` длиннее 50 символов |
| Высокая частота запросов | > 100 DNS-запросов в секунду |
| TXT/NULL/CNAME типы | Нестандартные типы для туннелирования |
| Энтропия в именах | Случайно выглядящие субдомены |
| Большой размер ответа | DNS-ответы > 512 байт |
| Один домен — много запросов | Все запросы идут к одному домену |

---

## 🔐 8.1.8 Анализ TLS-трафика

### Структура TLS Handshake

```
Client                          Server
  |                               |
  |------ ClientHello ----------->|
  |       (версия, cipher suites, |
  |        случайные данные, SNI) |
  |                               |
  |<----- ServerHello ------------|
  |       (выбранный cipher,      |
  |        случайные данные)      |
  |                               |
  |<----- Certificate ------------|
  |<----- ServerHelloDone --------|
  |                               |
  |------ ClientKeyExchange ----->|
  |------ ChangeCipherSpec ------>|
  |------ Finished -------------->|
  |                               |
  |<----- ChangeCipherSpec -------|
  |<----- Finished ---------------|
  |                               |
  |=== Зашифрованные данные ======|
```

### Анализ TLS в Wireshark

```text
# Все TLS-соединения
tls

# ClientHello — начало нового соединения
tls.handshake.type == 1

# ServerHello
tls.handshake.type == 2

# Certificate — сертификат сервера
tls.handshake.type == 11

# SNI (Server Name Indication) — открытый hostname
tls.handshake.extensions_server_name

# Версия TLS (старые версии — проблема безопасности)
tls.handshake.version == 0x0301   # TLS 1.0 (устарел)
tls.handshake.version == 0x0302   # TLS 1.1 (устарел)
tls.handshake.version == 0x0303   # TLS 1.2
tls.handshake.version == 0x0304   # TLS 1.3

# Слабые cipher suites
tls.handshake.ciphersuite == 0x0004  # RC4 (небезопасен)

# TLS alerts (ошибки)
tls.alert_message.desc == 42         # bad_certificate
tls.alert_message.desc == 48         # unknown_ca

# Поиск по SNI
tls.handshake.extensions_server_name contains "evil.com"
```

### Расшифровка TLS в Wireshark (если есть ключи)

```bash
# Метод 1: Pre-master secret log (для браузеров)
# Установить переменную окружения
export SSLKEYLOGFILE=/tmp/ssl_keys.log

# Запустить браузер с этой переменной
firefox

# В Wireshark: Edit → Preferences → Protocols → TLS
# Указать путь к (Pre)-Master-Secret log filename

# Метод 2: RSA-ключ сервера (только для старых алгоритмов без PFS)
# Edit → Preferences → Protocols → TLS → RSA keys list
# IP: IP_сервера, Port: 443, Protocol: http, Key File: server.key
```

---

## 🌐 8.1.9 Анализ ARP-трафика

### Нормальный ARP

```
ARP Request: "Кто имеет IP 192.168.1.1? Скажи 192.168.1.100"
ARP Reply:   "192.168.1.1 находится по MAC aa:bb:cc:dd:ee:ff"
```

```
▼ Address Resolution Protocol (request)
  Hardware type: Ethernet (1)
  Protocol type: IPv4 (0x0800)
  Hardware size: 6
  Protocol size: 4
  Opcode: request (1)
  Sender MAC address: 00:11:22:33:44:55
  Sender IP address: 192.168.1.100
  Target MAC address: 00:00:00:00:00:00
  Target IP address: 192.168.1.1
```

### Признаки ARP Spoofing/Poisoning

```text
# Детектор дублирования ARP
arp.duplicate-address-detected

# Множество ARP-reply от одного MAC
arp.opcode == 2

# Gratuitous ARP (broadcast reply — часто признак ARP spoofing)
arp.isgratuitous == 1

# ARP reply с несоответствием MAC
# Если один IP имеет разные MAC в разных пакетах
```

**Признаки ARP Spoofing:**

| Нормально | Подозрительно |
|-----------|---------------|
| Редкие ARP-запросы | Поток ARP-ответов без запросов |
| Один IP = один MAC | Один IP имеет разные MAC в разных пакетах |
| Только unicast reply | Broadcast ARP reply |
| Запрос → Ответ | Ответ без запроса (Gratuitous ARP) |

**Пример атаки ARP Spoofing в Wireshark:**

```
# Атакующий 192.168.1.50 (MAC: 00:de:ad:be:ef:00) отравляет ARP-кэш
# Жертва 192.168.1.100, Шлюз 192.168.1.1

Packet 1: ARP Reply: "192.168.1.1 is at 00:de:ad:be:ef:00" (broadcast)
Packet 2: ARP Reply: "192.168.1.1 is at 00:de:ad:be:ef:00" (unicast to victim)
Packet 3: ARP Reply: "192.168.1.100 is at 00:de:ad:be:ef:00" (to gateway)

# Теперь весь трафик между жертвой и шлюзом проходит через атакующего
```

---

## 📊 8.1.10 Statistics в Wireshark

### Protocol Hierarchy

```
Statistics → Protocol Hierarchy
```

Показывает распределение протоколов в захваченном трафике в виде дерева:

```
Protocol          | Packets | % Packets | Bytes   | % Bytes |
Frame             | 10000   | 100.0%    | 5.2 MB  | 100.0%  |
  Ethernet        | 10000   | 100.0%    | 5.2 MB  | 100.0%  |
    IPv4          | 9850    | 98.5%     | 5.1 MB  | 98.1%   |
      TCP         | 7200    | 72.0%     | 4.1 MB  | 78.8%   |
        HTTP      | 1200    | 12.0%     | 2.1 MB  | 40.4%   |
        TLS       | 5100    | 51.0%     | 1.8 MB  | 34.6%   |
      UDP         | 2400    | 24.0%     | 0.8 MB  | 15.4%   |
        DNS       | 2000    | 20.0%     | 0.4 MB  | 7.7%    |
    IPv6          | 100     | 1.0%      | ...     | ...     |
    ARP           | 50      | 0.5%      | ...     | ...     |
```

> **Note:** Аномально высокая доля DNS-трафика (> 5-10%) может указывать на DNS tunneling или DGA активность.

### Conversations

```
Statistics → Conversations
```

Показывает список всех соединений с сортировкой по количеству байт, пакетов, продолжительности.

Вкладки: Ethernet | IPv4 | IPv6 | TCP | UDP

**Что искать:**
- Соединения с необычно большим объёмом данных
- Множество соединений от одного хоста (сканирование)
- Соединения с необычными IP-адресами

### Endpoints

```
Statistics → Endpoints
```

Список всех уникальных адресов с суммарным трафиком.

Правая кнопка → Apply as Filter / Apply as Column

### I/O Graph

```
Statistics → I/O Graph
```

График пропускной способности во времени. Помогает обнаружить:
- Пики трафика (момент атаки, эксфильтрации)
- Периодический трафик (beaconing C2)
- Аномально низкий/высокий трафик

**Настройка для обнаружения beaconing:**

```
Y Axis: Packets/Tick
X Interval: 1 second
Filter: ip.dst == <подозрительный_ip>
```

### Flow Graph

```
Statistics → Flow Graph
```

Отображает временну́ю диаграмму обмена пакетами между хостами (наподобие диаграммы взаимодействия).

---

## 💾 8.1.11 Экспорт объектов

### Экспорт HTTP-объектов

Wireshark может автоматически извлекать файлы, переданные по HTTP.

```
File → Export Objects → HTTP
```

Появится список всех загруженных файлов:
- HTML-страницы
- Изображения
- Скрипты JavaScript
- Загруженные файлы (exe, pdf, zip и т.д.)

Это невероятно полезно при анализе вредоносного ПО, переданного через HTTP.

### Экспорт SMB/CIFS-объектов

```
File → Export Objects → SMB
```

Позволяет извлечь файлы, переданные по SMB (Windows file sharing).

### Экспорт в различные форматы

```
File → Save As или Export Specified Packets

Форматы:
- .pcapng  — современный формат (рекомендуется)
- .pcap    — классический формат (совместимость)
- .csv     — для анализа в Excel/Python
- .json    — для программного анализа
- .txt     — текстовый дамп
```

### Диссекторы

Диссекторы (Dissectors) — это плагины Wireshark, которые разбирают протоколы. Если трафик идёт на нестандартный порт:

```
Правая кнопка на пакете → Decode As...
Выбрать нужный протокол

Например: HTTP-трафик на порту 8080 или 8443
```

---

## 🛠️ 8.1.12 Полезные приёмы работы

### Marks и Time Reference

```bash
# Отметить пакет (для ориентира в длинном захвате)
Ctrl+M (Toggle Mark)

# Установить временну́ю точку отсчёта на пакет
Ctrl+T (Set/Unset Time Reference)
# После этого время всех пакетов будет отсчитываться от данного пакета
```

### Поиск в содержимом пакетов

```
Edit → Find Packet (Ctrl+F)

Искать в: Display filter / Hex value / String / Regular expression
```

**Примеры поиска по строке:**

```
Строка: "password"    — найти пакеты с паролями
Строка: "cmd.exe"     — признаки shell-команд
Строка: "SELECT"      — SQL-запросы
Строка: "eval("       — обфусцированный JavaScript
Regex:  "(?:admin|root|sa):.+@" — учётные данные
```

### Командная строка tshark

```bash
# Вывод полей в CSV для анализа
tshark -r capture.pcap -T fields \
  -e frame.number \
  -e frame.time \
  -e ip.src \
  -e ip.dst \
  -e tcp.dstport \
  -e http.request.uri \
  -Y "http.request" \
  -E separator=","

# Статистика протоколов
tshark -r capture.pcap -q -z io,phs

# Топ хостов по количеству пакетов
tshark -r capture.pcap -q -z endpoints,ip

# Все DNS-запросы
tshark -r capture.pcap -Y "dns.flags.response == 0" \
  -T fields -e dns.qry.name | sort | uniq -c | sort -rn

# Извлечь HTTP-объекты
tshark -r capture.pcap --export-objects "http,/tmp/http_objects"

# Фильтр и сохранение в новый файл
tshark -r big_capture.pcap -Y "ip.addr == 10.0.0.1" -w filtered.pcap
```

---

## 🔬 8.1.13 Практические задания

### Задание 1: Базовый анализ PCAP

**Сценарий:** Вам предоставлен файл `network_capture.pcap`. Необходимо проанализировать его содержимое.

```bash
# Шаг 1: Открыть файл
wireshark network_capture.pcap

# Шаг 2: Изучить Protocol Hierarchy
# Statistics → Protocol Hierarchy

# Шаг 3: Посмотреть топ-хосты
# Statistics → Endpoints → IPv4

# Шаг 4: Посмотреть топ-разговоры
# Statistics → Conversations → TCP
```

**Вопросы для анализа:**
1. Какие протоколы присутствуют в захвате?
2. Какой хост генерирует наибольший трафик?
3. Есть ли HTTP трафик? Если да, что передаётся?

### Задание 2: Обнаружение ARP Spoofing

**Файл:** `arp_attack.pcap`

```bash
# Применить фильтр
arp

# Искать признаки атаки
arp.duplicate-address-detected
arp.isgratuitous == 1

# Шаги анализа:
# 1. Отсортировать по времени
# 2. Найти ARP Reply без предшествующего Request
# 3. Проверить, меняется ли MAC для одного IP
# 4. Идентифицировать атакующего
```

**Ожидаемые находки:**
- IP шлюза (192.168.1.1) имеет два разных MAC в разных пакетах
- Один из MAC принадлежит атакующему
- Broadcast ARP Replies без запросов

### Задание 3: Анализ HTTP-атаки

**Файл:** `web_attack.pcap`

```bash
# Найти SQL Injection попытки
http.request.uri matches "(%27|'|%22|\"|SELECT|UNION|OR 1=1)"

# Найти Directory Traversal
http.request.uri matches "(\.\./|%2e%2e%2f)"

# Найти признаки успешной атаки
http.response.code == 200 && http.request.uri contains "admin"

# Следовать за подозрительным потоком
# Правая кнопка → Follow → TCP Stream

# Экспортировать извлечённые файлы
# File → Export Objects → HTTP
```

### Задание 4: Анализ DNS Tunneling

**Файл:** `dns_tunnel.pcap`

```bash
# Шаг 1: Посмотреть на DNS трафик
dns

# Шаг 2: Найти подозрительные запросы
dns.qry.name.len > 50

# Шаг 3: Найти запросы TXT
dns.qry.type == 16

# Шаг 4: Использовать tshark для извлечения всех уникальных запросов
tshark -r dns_tunnel.pcap -Y "dns.flags.response == 0" \
  -T fields -e dns.qry.name | sort | uniq

# Шаг 5: Декодировать base64 из субдоменов
# Например: aGVsbG8gd29ybGQ=.tunnel.evil.com → "hello world"
echo "aGVsbG8gd29ybGQ=" | base64 -d
```

### Задание 5: CTF-стиль — найти флаг в PCAP

**Сценарий:** В файле `ctf_challenge.pcap` спрятан флаг вида `CTF{...}`.

```bash
# Метод 1: Поиск строки
# Edit → Find Packet → String → "CTF{"

# Метод 2: tshark
tshark -r ctf_challenge.pcap -Y "frame contains \"CTF{\"" \
  -T fields -e frame.number -e data.text

# Метод 3: strings + grep
tshark -r ctf_challenge.pcap -x | strings | grep -i "CTF{"

# Метод 4: Экспорт объектов и поиск
tshark -r ctf_challenge.pcap --export-objects "http,/tmp/ctf_objects"
grep -r "CTF{" /tmp/ctf_objects/

# Метод 5: Через scapy
python3 << 'EOF'
from scapy.all import rdpcap, Raw
packets = rdpcap('ctf_challenge.pcap')
for pkt in packets:
    if Raw in pkt:
        payload = pkt[Raw].load
        if b'CTF{' in payload:
            print(f"Found in packet!")
            print(payload)
EOF
```

---

## 📋 8.1.14 Шпаргалка по горячим клавишам Wireshark

| Действие | Windows/Linux | macOS |
|----------|--------------|-------|
| Начать захват | Ctrl+E | Cmd+E |
| Остановить захват | Ctrl+E | Cmd+E |
| Открыть файл | Ctrl+O | Cmd+O |
| Сохранить | Ctrl+S | Cmd+S |
| Найти пакет | Ctrl+F | Cmd+F |
| Следующий пакет | Ctrl+N | Cmd+N |
| Предыдущий пакет | Ctrl+B | Cmd+B |
| Перейти к пакету | Ctrl+G | Cmd+G |
| Отметить пакет | Ctrl+M | Cmd+M |
| Увеличить | Ctrl++ | Cmd++ |
| Уменьшить | Ctrl+- | Cmd+- |
| Follow TCP Stream | Ctrl+Alt+T | — |
| Colorize | Ctrl+Space | — |
| Сбросить фильтр | Ctrl+Backspace | — |

---

## 📚 Ресурсы для практики

| Ресурс | URL | Описание |
|--------|-----|----------|
| Wireshark Sample Captures | wiki.wireshark.org/SampleCaptures | Официальные примеры |
| malware-traffic-analysis.net | malware-traffic-analysis.net | PCAP с реальным малварью |
| PacketTotal | packettotal.com | Онлайн-анализ PCAP |
| CloudShark | cloudshark.org | Облачный Wireshark |
| PcapNg.com | pcapng.com | Образцы PCAP |

---

## ✅ Итог главы

В этой главе вы освоили:

- **Установку** Wireshark на Linux и Windows
- **Интерфейс**: панели, колонки, цветовое кодирование
- **Фильтры захвата (BPF)**: эффективный захват нужного трафика
- **Display Filters**: мощный синтаксис для анализа
- **Follow Stream**: анализ TCP/UDP/HTTP сессий
- **Анализ протоколов**: HTTP, DNS, TLS, ARP
- **Статистику**: Protocol Hierarchy, Conversations, I/O Graph
- **Экспорт**: объекты HTTP, различные форматы
- **Практические навыки**: CTF-стиль разбора PCAP

> **Note:** Wireshark — это фундаментальный инструмент сетевого анализа. Регулярная практика с реальными PCAP-файлами (особенно с malware-traffic-analysis.net) значительно ускорит развитие навыков SOC-аналитика.
