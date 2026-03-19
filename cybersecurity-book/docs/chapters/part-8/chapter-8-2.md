# Глава 8.2: tcpdump: быстрый захват и BPF-фильтры

## 🎯 Цели главы

После изучения этой главы вы сможете:
- Использовать tcpdump для захвата сетевого трафика в CLI
- Составлять сложные BPF-фильтры для точного захвата нужных пакетов
- Сохранять трафик в PCAP-файлы и читать их
- Применять tshark для командной обработки трафика
- Использовать zeek/bro для глубокого анализа сетевых сессий
- Работать с NetworkMiner для пассивного анализа
- Писать скрипты на scapy для работы с пакетами

---

## 🔧 8.2.1 Введение в tcpdump

tcpdump — это утилита командной строки для захвата и анализа сетевых пакетов. Она работает на практически любой Unix-подобной системе и доступна через пакетные менеджеры. tcpdump использует библиотеку libpcap и поддерживает синтаксис BPF-фильтров.

### Установка

```bash
# Ubuntu/Debian
sudo apt install tcpdump -y

# CentOS/RHEL/Fedora
sudo yum install tcpdump -y
# или
sudo dnf install tcpdump -y

# macOS (обычно предустановлен, иначе через Homebrew)
brew install tcpdump

# Проверка версии
tcpdump --version

# Пример вывода:
# tcpdump version 4.99.1
# libpcap version 1.10.1
# OpenSSL 3.0.2 ...
```

### Необходимые права

```bash
# tcpdump требует root или CAP_NET_RAW capability
sudo tcpdump

# Альтернативный метод — добавить capability
sudo setcap cap_net_raw,cap_net_admin=eip /usr/sbin/tcpdump

# После этого обычный пользователь может захватывать пакеты
tcpdump
```

---

## 📋 8.2.2 Основные флаги tcpdump

### Флаги вывода и интерфейса

| Флаг | Описание | Пример |
|------|----------|--------|
| `-i <интерфейс>` | Выбрать сетевой интерфейс | `tcpdump -i eth0` |
| `-i any` | Захват на всех интерфейсах | `tcpdump -i any` |
| `-D` | Список доступных интерфейсов | `tcpdump -D` |
| `-n` | Не резолвить IP в hostname | `tcpdump -n` |
| `-nn` | Не резолвить IP и порты | `tcpdump -nn` |
| `-v` | Verbose (подробный) вывод | `tcpdump -v` |
| `-vv` | Очень подробный вывод | `tcpdump -vv` |
| `-vvv` | Максимально подробный вывод | `tcpdump -vvv` |
| `-q` | Краткий вывод | `tcpdump -q` |
| `-e` | Показывать MAC-адреса | `tcpdump -e` |
| `-t` | Убрать метку времени | `tcpdump -t` |
| `-tt` | Unix timestamp | `tcpdump -tt` |
| `-ttt` | Дельта времени между пакетами | `tcpdump -ttt` |
| `-tttt` | Полная дата и время | `tcpdump -tttt` |
| `-A` | Вывод в ASCII | `tcpdump -A` |
| `-X` | Вывод в HEX + ASCII | `tcpdump -X` |
| `-XX` | HEX + ASCII включая заголовки | `tcpdump -XX` |

### Флаги захвата и записи

| Флаг | Описание | Пример |
|------|----------|--------|
| `-c <count>` | Захватить N пакетов и выйти | `tcpdump -c 100` |
| `-w <file>` | Записать в файл .pcap | `tcpdump -w capture.pcap` |
| `-r <file>` | Читать из файла .pcap | `tcpdump -r capture.pcap` |
| `-s <snaplen>` | Длина снапшота (байт) | `tcpdump -s 0` |
| `-C <size>` | Ротация файлов по размеру (MB) | `tcpdump -C 100` |
| `-G <sec>` | Ротация файлов по времени (сек) | `tcpdump -G 3600` |
| `-W <count>` | Максимальное количество файлов | `tcpdump -W 10` |
| `-Z <user>` | Смена пользователя после захвата | `tcpdump -Z nobody` |
| `-B <bufsize>` | Размер буфера в KiB | `tcpdump -B 4096` |

> **Note:** Флаг `-s 0` означает захват пакета целиком без обрезки. По умолчанию в старых версиях tcpdump захватывал только первые 68 байт. Всегда используйте `-s 0` для полного захвата.

### Примеры базового использования

```bash
# Захват на интерфейсе eth0 (вывод в терминал)
sudo tcpdump -i eth0

# Захват без резолвинга имён (быстрее)
sudo tcpdump -i eth0 -nn

# Посмотреть доступные интерфейсы
sudo tcpdump -D

# Захватить 50 пакетов и выйти
sudo tcpdump -i eth0 -c 50

# Захват с полным содержимым пакета в ASCII
sudo tcpdump -i eth0 -A

# Захват с HEX + ASCII дампом
sudo tcpdump -i eth0 -X

# Захват с MAC-адресами
sudo tcpdump -i eth0 -e

# Подробный вывод с полной временно́й меткой
sudo tcpdump -i eth0 -vvv -tttt
```

---

## 🔍 8.2.3 BPF (Berkeley Packet Filter)

BPF — это мощный язык фильтрации пакетов, используемый как в tcpdump, так и в Wireshark (для фильтров захвата). BPF-фильтры выполняются в пространстве ядра ОС, что делает их очень эффективными.

### Примитивы BPF

**Тип фильтра:**

```
host, net, port, portrange — по адресу/порту
proto, tcp, udp, icmp, arp — по протоколу
less, greater — по размеру пакета
```

**Квалификаторы направления:**

```
src  — только от источника
dst  — только к назначению
(без квалификатора) — любое направление
```

### Фильтры по хосту

```bash
# Трафик от/до конкретного IP
sudo tcpdump -i eth0 host 192.168.1.100

# Только исходящий от хоста
sudo tcpdump -i eth0 src host 192.168.1.100

# Только входящий к хосту
sudo tcpdump -i eth0 dst host 192.168.1.100

# По доменному имени
sudo tcpdump -i eth0 host google.com

# По MAC-адресу
sudo tcpdump -i eth0 ether host aa:bb:cc:dd:ee:ff

# По broadcast
sudo tcpdump -i eth0 broadcast
sudo tcpdump -i eth0 multicast
```

### Фильтры по сети

```bash
# Вся подсеть 192.168.1.0/24
sudo tcpdump -i eth0 net 192.168.1.0/24
# или
sudo tcpdump -i eth0 net 192.168.1.0 mask 255.255.255.0

# Подсеть 10.0.0.0/8
sudo tcpdump -i eth0 net 10.0.0.0/8

# Только от подсети
sudo tcpdump -i eth0 src net 172.16.0.0/12

# IPv6
sudo tcpdump -i eth0 ip6
```

### Фильтры по порту

```bash
# Конкретный порт (src или dst)
sudo tcpdump -i eth0 port 80
sudo tcpdump -i eth0 port 443
sudo tcpdump -i eth0 port 22

# Только на порту назначения
sudo tcpdump -i eth0 dst port 80

# Только на порту источника
sudo tcpdump -i eth0 src port 12345

# Диапазон портов
sudo tcpdump -i eth0 portrange 1-1024
sudo tcpdump -i eth0 portrange 8000-9000
```

### Фильтры по протоколу

```bash
# TCP трафик
sudo tcpdump -i eth0 tcp

# UDP трафик
sudo tcpdump -i eth0 udp

# ICMP (ping и т.д.)
sudo tcpdump -i eth0 icmp

# ARP
sudo tcpdump -i eth0 arp

# IGMP
sudo tcpdump -i eth0 proto igmp

# Не-TCP и не-UDP
sudo tcpdump -i eth0 ip proto 47  # GRE туннели
sudo tcpdump -i eth0 ip proto 50  # ESP (IPsec)
sudo tcpdump -i eth0 ip proto 51  # AH (IPsec)
```

### Составные BPF-фильтры

```bash
# AND (оба условия должны быть истинны)
sudo tcpdump -i eth0 host 192.168.1.1 and port 80
sudo tcpdump -i eth0 "src host 10.0.0.1 and dst port 443"

# OR (хотя бы одно условие)
sudo tcpdump -i eth0 port 80 or port 443
sudo tcpdump -i eth0 "port 80 or port 8080 or port 8443"

# NOT (отрицание)
sudo tcpdump -i eth0 not port 22
sudo tcpdump -i eth0 "not (port 22 or port 53)"

# Сложные комбинации
sudo tcpdump -i eth0 "host 192.168.1.100 and (port 80 or port 443) and not port 22"

# Трафик для подсети, исключая SSH
sudo tcpdump -i eth0 "net 192.168.0.0/16 and not port 22"

# Любой HTTP/HTTPS трафик не к DNS серверу
sudo tcpdump -i eth0 "(port 80 or port 443) and not host 8.8.8.8"
```

### Продвинутые BPF-фильтры

Прямой доступ к байтам пакета:

```bash
# Синтаксис: proto[offset:size] оператор значение
# proto — протокол (tcp, udp, ip, icmp, ether)
# offset — смещение от начала заголовка (в байтах)
# size — размер поля (1, 2 или 4 байта)

# Только SYN-пакеты (TCP flags byte = 0x02)
sudo tcpdump -i eth0 "tcp[tcpflags] & tcp-syn != 0"

# Только SYN без ACK (начало новых соединений)
sudo tcpdump -i eth0 "tcp[tcpflags] == tcp-syn"

# Только RST-пакеты
sudo tcpdump -i eth0 "tcp[tcpflags] & tcp-rst != 0"

# Только FIN-пакеты
sudo tcpdump -i eth0 "tcp[tcpflags] & tcp-fin != 0"

# Пакеты с установленным URG-флагом
sudo tcpdump -i eth0 "tcp[tcpflags] & tcp-urg != 0"

# ICMP echo request (тип 8)
sudo tcpdump -i eth0 "icmp[icmptype] == 8"

# ICMP echo reply (тип 0)
sudo tcpdump -i eth0 "icmp[icmptype] == 0"

# Большие пакеты (возможная туннелизация)
sudo tcpdump -i eth0 "greater 1400"

# Маленькие пакеты
sudo tcpdump -i eth0 "less 100"

# HTTP GET запросы (ищем 'GET ' в начале TCP payload)
# 'G' = 0x47, 'E' = 0x45, 'T' = 0x54, ' ' = 0x20
sudo tcpdump -i eth0 "tcp[20:4] == 0x47455420"

# DNS-запросы (UDP порт 53)
sudo tcpdump -i eth0 "udp port 53 and udp[10] & 0x80 == 0"

# DNS с TTL < 10 (подозрительно)
sudo tcpdump -i eth0 "udp port 53 and ip[8] < 10"

# Только IPv4 фрагментированные пакеты
sudo tcpdump -i eth0 "ip[6:2] & 0x1fff != 0"
```

---

## 💾 8.2.4 Захват в файл и чтение

### Запись в .pcap файл

```bash
# Базовая запись
sudo tcpdump -i eth0 -w capture.pcap

# Запись с полными пакетами (без обрезки)
sudo tcpdump -i eth0 -s 0 -w full_capture.pcap

# Запись с фильтром
sudo tcpdump -i eth0 -s 0 -w http_capture.pcap "port 80 or port 443"

# Запись с именем файла по времени
sudo tcpdump -i eth0 -s 0 -w "capture_%Y%m%d_%H%M%S.pcap"

# Ротация по размеру (100 МБ каждый файл, хранить 5 файлов)
sudo tcpdump -i eth0 -s 0 -C 100 -W 5 -w capture.pcap

# Ротация по времени (каждые 60 секунд)
sudo tcpdump -i eth0 -s 0 -G 60 -w capture_%Y%m%d_%H%M%S.pcap

# Фоновый захват (для мониторинга)
sudo tcpdump -i eth0 -s 0 -w /var/log/traffic/capture_%Y%m%d_%H%M%S.pcap \
  -G 3600 -Z nobody &
```

### Чтение из .pcap файла

```bash
# Простое чтение
tcpdump -r capture.pcap

# Без резолвинга (быстрее)
tcpdump -r capture.pcap -nn

# Применить фильтр при чтении
tcpdump -r capture.pcap "port 80"

# Подробный вывод
tcpdump -r capture.pcap -v

# Полный дамп в ASCII
tcpdump -r capture.pcap -A

# Полный дамп в HEX+ASCII
tcpdump -r capture.pcap -X

# Количество пакетов
tcpdump -r capture.pcap --count 2>/dev/null

# Сохранить отфильтрованный поднабор
tcpdump -r big_capture.pcap -w small_capture.pcap "host 10.0.0.1"
```

---

## 🖥️ 8.2.5 tshark: командная строка Wireshark

tshark — это мощный инструмент командной строки, использующий те же диссекторы, что и Wireshark. Позволяет применять display filters и извлекать конкретные поля.

### Основные команды tshark

```bash
# Базовый захват
sudo tshark -i eth0

# Захват с display filter
sudo tshark -i eth0 -Y "http.request"

# Запись в файл
sudo tshark -i eth0 -w capture.pcap

# Чтение из файла с фильтром
tshark -r capture.pcap -Y "ip.addr == 10.0.0.1"

# Извлечение конкретных полей
tshark -r capture.pcap -T fields \
  -e frame.time \
  -e ip.src \
  -e ip.dst \
  -e tcp.dstport \
  -Y "http.request"

# Вывод в JSON
tshark -r capture.pcap -T json -Y "dns" 2>/dev/null

# Вывод в PDML (XML)
tshark -r capture.pcap -T pdml -Y "http" > http_packets.xml

# Статистика по протоколам
tshark -r capture.pcap -q -z io,phs

# Статистика по хостам (endpoints)
tshark -r capture.pcap -q -z endpoints,ip

# Статистика по разговорам (conversations)
tshark -r capture.pcap -q -z conv,tcp

# I/O статистика
tshark -r capture.pcap -q -z io,stat,1

# Статистика HTTP-запросов
tshark -r capture.pcap -q -z http,tree

# Экспорт HTTP-объектов
tshark -r capture.pcap --export-objects "http,/tmp/http_objects"

# Список интерфейсов
tshark -D
```

### Таблица часто используемых команд SOC

| Команда | Описание | Применение |
|---------|----------|------------|
| `tshark -r file.pcap -q -z io,phs` | Protocol Hierarchy | Обзор захвата |
| `tshark -r file.pcap -q -z endpoints,ip` | Топ IP-адресов | Обнаружение сканирования |
| `tshark -r file.pcap -q -z conv,tcp` | TCP-разговоры | Анализ сессий |
| `tshark -r file.pcap -Y "http.request" -T fields -e http.host -e http.uri` | HTTP-запросы | Анализ web-трафика |
| `tshark -r file.pcap -Y "dns" -T fields -e dns.qry.name` | DNS-запросы | DGA/туннелирование |
| `tshark -r file.pcap -Y "tls.handshake.type==1" -T fields -e tls.handshake.extensions_server_name` | TLS SNI | Обнаружение C2 |
| `tshark -r file.pcap --export-objects http,/tmp/` | Извлечь HTTP-объекты | Малварь через HTTP |
| `tshark -r file.pcap -Y "tcp.flags==0x002" -q -z endpoints,ip` | SYN-пакеты | Сканирование портов |
| `tshark -r file.pcap -T fields -e frame.time -e ip.src -e ip.dst -e frame.len` | Метаданные пакетов | Timeline |
| `tshark -r file.pcap -Y "smtp" -T fields -e smtp.req.command -e smtp.req.parameter` | SMTP-команды | Email-трафик |

### Расширенные команды tshark

```bash
# Топ-10 IP-адресов по количеству пакетов
tshark -r capture.pcap -T fields -e ip.src \
  | sort | uniq -c | sort -rn | head -10

# Все уникальные DNS-запросы с подсчётом
tshark -r capture.pcap -Y "dns.flags.response == 0" \
  -T fields -e dns.qry.name \
  | sort | uniq -c | sort -rn

# Все User-Agent строки
tshark -r capture.pcap -Y "http.user_agent" \
  -T fields -e http.user_agent \
  | sort | uniq -c | sort -rn

# Все HTTP POST-запросы с телом
tshark -r capture.pcap -Y "http.request.method == POST" \
  -T fields -e ip.src -e http.host -e http.uri -e http.file_data \
  -E separator="|"

# Извлечь все пароли FTP
tshark -r capture.pcap -Y "ftp.request.command == PASS" \
  -T fields -e ip.src -e ftp.request.arg

# Найти TLS соединения с устаревшими версиями
tshark -r capture.pcap -Y "tls.handshake.type == 1" \
  -T fields -e ip.dst -e tls.handshake.version \
  | grep -v "0x0303\|0x0304" | sort | uniq

# Подсчитать пакеты по секундам (для обнаружения DDoS)
tshark -r capture.pcap -T fields -e frame.time_epoch \
  | awk '{print int($1)}' | uniq -c | sort -rn | head -20

# Найти большие DNS-запросы (признак туннелирования)
tshark -r capture.pcap -Y "dns && dns.qry.name.len > 50" \
  -T fields -e frame.time -e ip.src -e dns.qry.name

# Анализ HTTP-ответов по кодам
tshark -r capture.pcap -Y "http.response" \
  -T fields -e http.response.code \
  | sort | uniq -c | sort -rn

# Поиск строк в payload
tshark -r capture.pcap -Y "frame contains \"password\"" \
  -T fields -e frame.number -e ip.src -e ip.dst -e data.text
```

---

## 🐝 8.2.6 zeek (bro): глубокий анализ сети

Zeek (бывший Bro) — это мощный фреймворк анализа сетевого трафика. В отличие от tcpdump/Wireshark, Zeek не просто захватывает пакеты, а создаёт структурированные логи о сетевой активности.

### Установка Zeek

```bash
# Ubuntu/Debian
sudo apt install zeek -y

# Или через официальный репозиторий
echo 'deb http://download.opensuse.org/repositories/security:/zeek/xUbuntu_22.04/ /' \
  | sudo tee /etc/apt/sources.list.d/security:zeek.list
curl -fsSL https://download.opensuse.org/repositories/security:zeek/xUbuntu_22.04/Release.key \
  | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/security_zeek.gpg > /dev/null
sudo apt update && sudo apt install zeek -y

# Проверка
zeek --version
```

### Запуск анализа

```bash
# Анализ PCAP-файла
zeek -r capture.pcap

# Анализ с конкретными скриптами
zeek -r capture.pcap local

# Анализ в реальном времени (нужны права)
sudo zeek -i eth0

# После выполнения Zeek создаёт файлы логов в текущей директории
ls -la *.log
```

### Структура лог-файлов Zeek

| Файл | Содержимое |
|------|-----------|
| `conn.log` | Все TCP/UDP/ICMP соединения |
| `http.log` | HTTP-запросы и ответы |
| `dns.log` | DNS-запросы и ответы |
| `ssl.log` | TLS/SSL сессии |
| `weird.log` | Аномалии и подозрительные события |
| `notice.log` | Предупреждения от скриптов |
| `files.log` | Файлы, переданные по сети |
| `x509.log` | Сертификаты TLS |
| `smtp.log` | SMTP-трафик |
| `ftp.log` | FTP-сессии |
| `ssh.log` | SSH-соединения |
| `dhcp.log` | DHCP-транзакции |
| `pe.log` | PE-файлы (исполняемые) |
| `reporter.log` | Сообщения самого Zeek |

### Анализ лог-файлов Zeek

```bash
# Просмотр conn.log (соединения)
cat conn.log | zeek-cut ts uid id.orig_h id.orig_p id.resp_h id.resp_p proto service duration

# Просмотр http.log (HTTP-запросы)
cat http.log | zeek-cut ts id.orig_h id.resp_h method host uri user_agent status_code

# DNS-запросы
cat dns.log | zeek-cut ts id.orig_h query qtype_name answers

# TLS соединения и SNI
cat ssl.log | zeek-cut ts id.orig_h id.resp_h server_name version cipher

# Необычные события
cat weird.log | zeek-cut ts id.orig_h id.resp_h name

# Файлы, переданные по сети
cat files.log | zeek-cut ts fuid tx_hosts rx_hosts mime_type filename md5 sha256

# Фильтрация с grep
cat http.log | zeek-cut host uri | grep -i "admin\|login\|password"

# Найти все соединения с долгим временем
cat conn.log | zeek-cut ts id.orig_h id.resp_h duration | awk '$4 > 300' | sort -k4 -rn

# Топ URL-адресов
cat http.log | zeek-cut host uri | sort | uniq -c | sort -rn | head -20

# Необычные User-Agent строки
cat http.log | zeek-cut user_agent | sort | uniq -c | sort -rn

# Все DNS-запросы к нестандартным серверам
cat dns.log | zeek-cut ts id.orig_h id.resp_h query | \
  grep -v "8\.8\.\|1\.1\.1\.\|9\.9\.9\."
```

### Zeek-скрипты для обнаружения аномалий

```text
# /opt/zeek/share/zeek/site/detect_scan.zeek
# Простой скрипт для обнаружения сканирования портов

module PortScan;

export {
    redef enum Notice::Type += {
        Port_Scan
    };
    global scan_threshold = 20 &redef;
}

global port_scan_tracker: table[addr] of set[port] &read_expire=5min;

event connection_attempt(c: connection)
{
    local orig = c$id$orig_h;
    local resp_port = c$id$resp_p;

    if (orig !in port_scan_tracker)
        port_scan_tracker[orig] = set();

    add port_scan_tracker[orig][resp_port];

    if (|port_scan_tracker[orig]| == scan_threshold) {
        NOTICE([$note=Port_Scan,
                $msg=fmt("Port scan detected from %s (%d ports)",
                         orig, |port_scan_tracker[orig]|),
                $src=orig,
                $identifier=cat(orig)]);
    }
}
```

```bash
# Запустить с кастомным скриптом
zeek -r capture.pcap detect_scan.zeek
cat notice.log
```

---

## 🖥️ 8.2.7 NetworkMiner: пассивный анализ

NetworkMiner — это инструмент для пассивного анализа PCAP-файлов. Автоматически извлекает файлы, изображения, сертификаты, credentials из сетевого трафика.

### Установка

```bash
# Linux (через Mono)
sudo apt install mono-devel -y
wget https://www.netresec.com/?download=NetworkMiner -O NetworkMiner.zip
unzip NetworkMiner.zip
cd NetworkMiner*
mono NetworkMiner.exe

# Windows — скачать с https://www.netresec.com/
# Запустить NetworkMiner.exe (требует .NET Framework)
```

### Возможности NetworkMiner

| Вкладка | Функция |
|---------|---------|
| Hosts | Список хостов с их характеристиками |
| Files | Извлечённые файлы из трафика |
| Images | Изображения (JPG, PNG, GIF) |
| Messages | Email, IRC, FTP сообщения |
| Credentials | Извлечённые учётные данные |
| Sessions | TCP-сессии |
| DNS | DNS-запросы и ответы |
| Parameters | HTTP GET/POST параметры |
| Cleartext | Открытый текст из трафика |

```bash
# Загрузить PCAP-файл через CLI (Linux)
mono NetworkMiner.exe --capture capture.pcap
```

---

## 🐍 8.2.8 scapy: Python-библиотека для работы с пакетами

Scapy — это интерактивная Python-библиотека для создания, захвата, отправки и анализа сетевых пакетов.

### Установка

```bash
# Установка через pip
pip3 install scapy

# Или через apt
sudo apt install python3-scapy -y

# Запуск интерактивной сессии
sudo python3 -c "from scapy.all import *; interact()"
```

### Основы scapy

```python
from scapy.all import *

# === Чтение PCAP ===
packets = rdpcap('capture.pcap')
print(f"Всего пакетов: {len(packets)}")

# Просмотр первого пакета
packets[0].show()

# Краткий просмотр всех пакетов
for pkt in packets:
    print(pkt.summary())

# === Создание пакетов ===

# ICMP ping
icmp_pkt = IP(dst="8.8.8.8") / ICMP()
icmp_pkt.show()

# TCP SYN
tcp_syn = IP(dst="10.0.0.1") / TCP(dport=80, flags="S")

# UDP DNS-запрос
dns_query = IP(dst="8.8.8.8") / UDP(dport=53) / \
            DNS(rd=1, qd=DNSQR(qname="example.com"))

# === Отправка пакетов ===

# Отправить на L3 (с routing)
send(IP(dst="10.0.0.1")/ICMP())

# Отправить и получить ответ
answer = sr1(IP(dst="8.8.8.8")/ICMP(), timeout=2)
if answer:
    answer.show()

# Отправить на L2 (с Ethernet)
sendp(Ether(dst="ff:ff:ff:ff:ff:ff")/ARP(pdst="192.168.1.1"), iface="eth0")
```

### Практические скрипты scapy для SOC

```python
#!/usr/bin/env python3
"""
Скрипт для анализа PCAP и обнаружения аномалий
"""
from scapy.all import rdpcap, IP, TCP, UDP, DNS, DNSQR, Raw
from collections import Counter
import re

def analyze_pcap(filename):
    packets = rdpcap(filename)
    
    # Счётчики
    ip_counter = Counter()
    dns_queries = []
    http_requests = []
    large_packets = []
    syn_packets = Counter()
    
    for pkt in packets:
        # Подсчёт IP-адресов
        if IP in pkt:
            ip_counter[pkt[IP].src] += 1
            
            # Большие пакеты (> 1400 байт)
            if len(pkt) > 1400:
                large_packets.append({
                    'src': pkt[IP].src,
                    'dst': pkt[IP].dst,
                    'size': len(pkt)
                })
            
            # SYN-пакеты (возможное сканирование)
            if TCP in pkt and pkt[TCP].flags == 0x002:
                syn_packets[pkt[IP].src] += 1
        
        # DNS-запросы
        if DNS in pkt and pkt[DNS].opcode == 0:
            if pkt[DNS].qd:
                query = pkt[DNS].qd.qname.decode('utf-8', errors='replace')
                dns_queries.append({
                    'src': pkt[IP].src if IP in pkt else 'N/A',
                    'query': query,
                    'type': pkt[DNS].qd.qtype
                })
        
        # HTTP-запросы (простая эвристика)
        if TCP in pkt and Raw in pkt:
            payload = pkt[Raw].load
            if payload.startswith(b'GET ') or payload.startswith(b'POST '):
                lines = payload.split(b'\r\n')
                if lines:
                    http_requests.append({
                        'src': pkt[IP].src if IP in pkt else 'N/A',
                        'request': lines[0].decode('utf-8', errors='replace')
                    })
    
    # Отчёт
    print("=== АНАЛИЗ PCAP ===\n")
    
    print("Топ-10 источников трафика:")
    for ip, count in ip_counter.most_common(10):
        print(f"  {ip}: {count} пакетов")
    
    print(f"\nВсего DNS-запросов: {len(dns_queries)}")
    # Подозрительно длинные DNS-запросы
    suspicious_dns = [q for q in dns_queries if len(q['query']) > 50]
    if suspicious_dns:
        print(f"  Подозрительно длинные запросы: {len(suspicious_dns)}")
        for q in suspicious_dns[:5]:
            print(f"    {q['src']} → {q['query'][:80]}")
    
    print(f"\nHTTP-запросы ({len(http_requests)} всего):")
    for req in http_requests[:10]:
        print(f"  {req['src']}: {req['request']}")
    
    print(f"\nХосты с высоким количеством SYN (возможное сканирование):")
    for ip, count in syn_packets.most_common():
        if count > 20:
            print(f"  {ip}: {count} SYN-пакетов")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Использование: python3 analyze.py <capture.pcap>")
        sys.exit(1)
    analyze_pcap(sys.argv[1])
```

```python
#!/usr/bin/env python3
"""
Обнаружение beaconing (периодических запросов к C2)
"""
from scapy.all import rdpcap, IP, TCP
from collections import defaultdict
import numpy as np

def detect_beaconing(filename, threshold_std=2.0):
    """
    Обнаруживает периодические соединения (beaconing C2)
    Ищет соединения с малым стандартным отклонением интервалов
    """
    packets = rdpcap(filename)
    
    # Собираем временны́е метки по парам (src_ip, dst_ip, dst_port)
    connections = defaultdict(list)
    
    for pkt in packets:
        if IP in pkt and TCP in pkt:
            if pkt[TCP].flags == 0x002:  # SYN
                key = (pkt[IP].src, pkt[IP].dst, pkt[TCP].dport)
                connections[key].append(float(pkt.time))
    
    # Анализ интервалов
    beaconing_candidates = []
    
    for (src, dst, port), timestamps in connections.items():
        if len(timestamps) < 5:  # Нужно минимум 5 соединений
            continue
        
        timestamps.sort()
        intervals = [timestamps[i+1] - timestamps[i] 
                    for i in range(len(timestamps)-1)]
        
        if not intervals:
            continue
        
        mean_interval = np.mean(intervals)
        std_interval = np.std(intervals)
        
        # Низкое стандартное отклонение = регулярные интервалы = beaconing
        if std_interval < threshold_std and mean_interval > 0:
            cv = std_interval / mean_interval  # Коэффициент вариации
            if cv < 0.2:  # Вариация < 20%
                beaconing_candidates.append({
                    'src': src,
                    'dst': dst,
                    'port': port,
                    'count': len(timestamps),
                    'mean_interval': mean_interval,
                    'std_interval': std_interval,
                    'cv': cv
                })
    
    print("=== ОБНАРУЖЕННЫЕ BEACONING СОЕДИНЕНИЯ ===\n")
    beaconing_candidates.sort(key=lambda x: x['cv'])
    
    for c in beaconing_candidates:
        print(f"Источник: {c['src']}")
        print(f"Назначение: {c['dst']}:{c['port']}")
        print(f"Количество соединений: {c['count']}")
        print(f"Средний интервал: {c['mean_interval']:.2f}с")
        print(f"Стандартное отклонение: {c['std_interval']:.2f}с")
        print(f"Коэффициент вариации: {c['cv']:.3f}")
        print("-" * 40)

if __name__ == "__main__":
    import sys
    detect_beaconing(sys.argv[1])
```

---

## 📊 8.2.9 Таблица частых tcpdump-команд для SOC

| Ситуация | Команда tcpdump |
|----------|----------------|
| Захват всего трафика | `sudo tcpdump -i eth0 -s 0 -w all.pcap` |
| Только веб-трафик | `sudo tcpdump -i eth0 -s 0 "port 80 or port 443" -w web.pcap` |
| DNS-запросы | `sudo tcpdump -i eth0 -nn udp port 53` |
| ICMP (ping) | `sudo tcpdump -i eth0 icmp` |
| ARP-трафик | `sudo tcpdump -i eth0 arp` |
| Трафик от хоста | `sudo tcpdump -i eth0 -nn src 10.0.0.5` |
| Трафик к хосту | `sudo tcpdump -i eth0 -nn dst 10.0.0.5` |
| SYN-флуд детект | `sudo tcpdump -i eth0 "tcp[tcpflags] == tcp-syn" -c 100` |
| Без SSH-трафика | `sudo tcpdump -i eth0 not port 22` |
| Большие пакеты | `sudo tcpdump -i eth0 greater 1400` |
| FTP пароли | `sudo tcpdump -i eth0 -A "tcp port 21" \| grep -i pass` |
| HTTP заголовки | `sudo tcpdump -i eth0 -A "tcp port 80" \| grep -E "GET\|POST\|Host:"` |
| Фоновый захват | `sudo tcpdump -i eth0 -s 0 -G 3600 -w cap_%Y%m%d_%H%M%S.pcap &` |
| Диагностика RST | `sudo tcpdump -i eth0 "tcp[tcpflags] & tcp-rst != 0"` |
| Захват с NTP-фильтром | `sudo tcpdump -i eth0 not port 123` |
| Захват для PCAP-анализа | `sudo tcpdump -i any -s 0 -nn -w capture.pcap` |

---

## 🔬 8.2.10 Анализ PCAP без GUI

### Набор инструментов CLI

```bash
# capinfos — информация о файле
capinfos capture.pcap
# Вывод: время начала/конца, количество пакетов, размер и т.д.

# mergecap — объединение PCAP-файлов
mergecap -w merged.pcap capture1.pcap capture2.pcap

# editcap — редактирование PCAP
# Обрезать пакеты до первых 100 байт
editcap -s 100 input.pcap output.pcap
# Выбрать пакеты в диапазоне времени
editcap -A "2024-01-01 10:00:00" -B "2024-01-01 11:00:00" input.pcap output.pcap
# Удалить дубликаты
editcap -d input.pcap output.pcap

# tcpflow — реконструкция TCP-потоков
sudo apt install tcpflow -y
tcpflow -r capture.pcap -o /tmp/flows/

# tcpreplay — воспроизведение захваченного трафика
sudo apt install tcpreplay -y
sudo tcpreplay -i eth0 capture.pcap

# ngrep — grep для сетевого трафика
sudo apt install ngrep -y
sudo ngrep -i "password" "tcp and port 80" -d eth0
ngrep -r "password" -q "" -I capture.pcap
```

### Python: работа с PCAP через dpkt

```python
#!/usr/bin/env python3
"""
Быстрый анализ PCAP с использованием dpkt
"""
import dpkt
import socket
from collections import Counter

def ip_to_str(ip_bytes):
    return socket.inet_ntoa(ip_bytes)

def analyze_with_dpkt(filename):
    ip_counter = Counter()
    port_counter = Counter()
    protocols = Counter()
    
    with open(filename, 'rb') as f:
        pcap = dpkt.pcap.Reader(f)
        
        for timestamp, buf in pcap:
            try:
                eth = dpkt.ethernet.Ethernet(buf)
                
                if not isinstance(eth.data, dpkt.ip.IP):
                    continue
                
                ip = eth.data
                src = ip_to_str(ip.src)
                dst = ip_to_str(ip.dst)
                
                ip_counter[src] += 1
                protocols[type(ip.data).__name__] += 1
                
                if isinstance(ip.data, dpkt.tcp.TCP):
                    tcp = ip.data
                    port_counter[tcp.dport] += 1
                    
                elif isinstance(ip.data, dpkt.udp.UDP):
                    udp = ip.data
                    port_counter[udp.dport] += 1
                    
            except Exception:
                continue
    
    print("Топ IP-адресов:")
    for ip, count in ip_counter.most_common(10):
        print(f"  {ip}: {count}")
    
    print("\nТоп портов назначения:")
    for port, count in port_counter.most_common(10):
        print(f"  {port}: {count}")
    
    print("\nРаспределение протоколов:")
    for proto, count in protocols.most_common():
        print(f"  {proto}: {count}")

analyze_with_dpkt('capture.pcap')
```

---

## 🔬 8.2.11 Практические задания

### Задание 1: Базовый захват трафика

```bash
# 1. Запустить захват трафика на 60 секунд
sudo tcpdump -i eth0 -s 0 -nn -w /tmp/capture_task1.pcap &
TCPDUMP_PID=$!

# 2. Сгенерировать тестовый трафик
ping -c 5 8.8.8.8
curl -s http://example.com > /dev/null
nslookup google.com

# 3. Остановить захват
sleep 60
kill $TCPDUMP_PID 2>/dev/null || sudo kill $TCPDUMP_PID

# 4. Проанализировать результат
tcpdump -r /tmp/capture_task1.pcap -nn | head -50
capinfos /tmp/capture_task1.pcap
```

**Ответьте на вопросы:**
1. Сколько пакетов было захвачено?
2. Какое соотношение TCP/UDP/ICMP?
3. Какие DNS-серверы использовались?

### Задание 2: BPF-фильтры

```bash
# Написать BPF-фильтр для каждой задачи:

# 1. Только HTTP и HTTPS трафик к серверу 1.2.3.4
FILTER_1="dst host 1.2.3.4 and (tcp port 80 or tcp port 443)"
sudo tcpdump -i eth0 "$FILTER_1" -c 10

# 2. Все DNS-запросы, кроме запросов к 8.8.8.8
FILTER_2="udp port 53 and not dst host 8.8.8.8"
sudo tcpdump -i eth0 "$FILTER_2" -c 10

# 3. TCP SYN-пакеты не на SSH-порт
FILTER_3="tcp[tcpflags] == tcp-syn and not dst port 22"
sudo tcpdump -i eth0 "$FILTER_3" -c 10

# 4. ICMP-пакеты размером больше 100 байт
FILTER_4="icmp and greater 100"
sudo tcpdump -i eth0 "$FILTER_4"
```

### Задание 3: Анализ с tshark

```bash
# Загрузить тестовый PCAP
wget https://wiki.wireshark.org/uploads/27707187aeb30df68e70c8fb9d614981/http.cap -O /tmp/http_test.cap

# Задания:
# 1. Показать все HTTP-запросы
tshark -r /tmp/http_test.cap -Y "http.request" \
  -T fields -e ip.src -e ip.dst -e http.request.method -e http.host -e http.uri

# 2. Подсчитать количество DNS-запросов по типу
tshark -r /tmp/http_test.cap -Y "dns" \
  -T fields -e dns.qry.type | sort | uniq -c

# 3. Найти самый большой пакет
tshark -r /tmp/http_test.cap -T fields -e frame.number -e frame.len \
  | sort -k2 -rn | head -1

# 4. Статистика протоколов
tshark -r /tmp/http_test.cap -q -z io,phs
```

### Задание 4: Написать скрипт анализа

```python
#!/usr/bin/env python3
"""
Задание: Написать скрипт, который:
1. Читает PCAP-файл
2. Обнаруживает признаки DNS tunneling
3. Выводит отчёт
"""
from scapy.all import rdpcap, IP, UDP, DNS, DNSQR
from collections import Counter, defaultdict
import math
import sys

def calculate_entropy(string):
    """Вычисляет информационную энтропию строки"""
    if not string:
        return 0
    
    prob = [float(string.count(c)) / len(string) for c in set(string)]
    entropy = -sum(p * math.log2(p) for p in prob if p > 0)
    return entropy

def detect_dns_tunneling(pcap_file):
    packets = rdpcap(pcap_file)
    
    dns_queries = defaultdict(list)
    query_lengths = []
    
    for pkt in packets:
        if UDP in pkt and pkt[UDP].dport == 53 and DNS in pkt:
            if pkt[DNS].opcode == 0 and pkt[DNS].qd:  # DNS query
                qname = pkt[DNS].qd.qname.decode('utf-8', errors='replace').rstrip('.')
                parts = qname.split('.')
                
                if len(parts) >= 2:
                    domain = '.'.join(parts[-2:])
                    subdomain = '.'.join(parts[:-2])
                    
                    dns_queries[domain].append({
                        'full': qname,
                        'subdomain': subdomain,
                        'length': len(qname),
                        'entropy': calculate_entropy(subdomain),
                        'src': str(pkt[IP].src) if IP in pkt else 'N/A'
                    })
                    query_lengths.append(len(qname))
    
    print("=== АНАЛИЗ DNS НА ПРИЗНАКИ ТУННЕЛИРОВАНИЯ ===\n")
    
    for domain, queries in dns_queries.items():
        long_queries = [q for q in queries if q['length'] > 50]
        high_entropy = [q for q in queries if q['entropy'] > 3.5]
        
        if long_queries or high_entropy or len(queries) > 100:
            print(f"Домен: {domain}")
            print(f"  Всего запросов: {len(queries)}")
            print(f"  Длинных запросов (>50 символов): {len(long_queries)}")
            print(f"  Высокая энтропия (>3.5): {len(high_entropy)}")
            
            if long_queries:
                avg_len = sum(q['length'] for q in long_queries) / len(long_queries)
                print(f"  Средняя длина длинных запросов: {avg_len:.1f}")
                print(f"  Пример: {long_queries[0]['full'][:80]}")
            
            # Оценка риска
            risk_score = 0
            if len(long_queries) > 5: risk_score += 2
            if len(high_entropy) > 5: risk_score += 2
            if len(queries) > 200: risk_score += 1
            
            risk_level = ["НИЗКИЙ", "СРЕДНИЙ", "ВЫСОКИЙ"][min(risk_score // 2, 2)]
            print(f"  Уровень риска: {risk_level}")
            print()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Использование: {sys.argv[0]} <capture.pcap>")
        sys.exit(1)
    detect_dns_tunneling(sys.argv[1])
```

---

## ✅ Итог главы

В этой главе вы освоили:

- **tcpdump**: синтаксис, флаги, захват трафика в CLI
- **BPF-фильтры**: от простых до продвинутых с побайтовым доступом
- **Работа с файлами**: запись и чтение PCAP, ротация файлов
- **tshark**: командная обработка трафика с display filters
- **zeek**: создание структурированных логов сетевой активности
- **NetworkMiner**: пассивный анализ и извлечение артефактов
- **scapy**: Python-скрипты для анализа и создания пакетов
- **Практические навыки**: написание скриптов обнаружения аномалий

> **Note:** tcpdump и tshark — незаменимые инструменты для SOC-аналитика на серверах без GUI. Umение писать точные BPF-фильтры позволяет захватывать только нужный трафик и не перегружать систему при анализе высоконагруженных сетей.
