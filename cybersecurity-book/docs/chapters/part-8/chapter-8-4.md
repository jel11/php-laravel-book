# Глава 8.4: Анализ вредоносного трафика на PCAP

## 🎯 Цели главы

- Понять формат PCAP и научиться захватывать сетевой трафик различными инструментами
- Освоить методологию анализа PCAP-файлов: от общего осмотра к конкретным потокам
- Научиться использовать статистические инструменты Wireshark для быстрого обнаружения аномалий
- Детектировать Cobalt Strike beaconing, DNS-туннели и другие техники C2-коммуникации
- Распознавать признаки network scanning, lateral movement и exfiltration в трафике
- Автоматизировать извлечение IoC из PCAP с помощью tshark

---

## 1. Что такое PCAP: формат файла и базовые инструменты

### 1.1 Формат PCAP и PCAPng

**PCAP** (Packet Capture) — стандартный формат для хранения захваченных сетевых пакетов. Файл состоит из глобального заголовка и последовательности записей пакетов.

```
┌─────────────────────────────────┐
│         Global Header           │
│  Magic Number: 0xa1b2c3d4       │
│  Version Major/Minor            │
│  Snaplen (max bytes per packet) │
│  Link Type (Ethernet=1)         │
├─────────────────────────────────┤
│         Packet Record 1         │
│  Timestamp (sec + usec)         │
│  Captured Length                │
│  Original Length                │
│  Packet Data                    │
├─────────────────────────────────┤
│         Packet Record 2         │
│  ...                            │
└─────────────────────────────────┘
```

**PCAPng** (Next Generation) — более новый формат с поддержкой множества интерфейсов, комментариев и расширенных метаданных. Wireshark сохраняет в PCAPng по умолчанию.

| Характеристика | PCAP | PCAPng |
|---------------|------|--------|
| Расширение файла | .pcap | .pcapng |
| Несколько интерфейсов | Нет | Да |
| Комментарии к пакетам | Нет | Да |
| Временная метка | Секунды + микросекунды | Наносекунды |
| Совместимость | Универсальная | Современные инструменты |

### 1.2 Захват трафика

**Wireshark** — графический анализатор с GUI:

```bash
# Запуск захвата на интерфейсе eth0
# Через GUI: Capture → Start
# Через командную строку:
wireshark -i eth0 -k
```

**tcpdump** — консольный захватчик:

```bash
# Захват всего трафика на eth0
tcpdump -i eth0 -w capture.pcap

# Захват только HTTP/HTTPS трафика
tcpdump -i eth0 -w web_traffic.pcap 'port 80 or port 443'

# Захват трафика от/до конкретного IP
tcpdump -i eth0 -w host_traffic.pcap host 192.168.1.100

# Захват с ограничением по размеру (100 МБ) и по времени
tcpdump -i eth0 -w capture_%Y%m%d_%H%M%S.pcap -G 3600 -C 100

# Захват без разрешения имён (-n), с полным пакетом (-s 0)
tcpdump -i eth0 -n -s 0 -w full_capture.pcap

# Захват SMB трафика для анализа lateral movement
tcpdump -i eth0 -w smb_traffic.pcap 'port 445 or port 139'
```

**tshark** — консольный вариант Wireshark:

```bash
# Захват и немедленный анализ
tshark -i eth0 -w capture.pcap

# Живой анализ DNS запросов
tshark -i eth0 -Y "dns" -T fields -e dns.qry.name

# Статистика протоколов в реальном времени
tshark -i eth0 -q -z io,stat,10
```

**dumpcap** — минималистичный захватчик (часть Wireshark):

```bash
# Кольцевой буфер: 10 файлов по 100 МБ
dumpcap -i eth0 -b filesize:102400 -b files:10 -w /captures/ring.pcap
```

### 1.3 Открытие PCAP в Wireshark

После запуска Wireshark:
1. **File → Open** — открыть PCAP файл
2. **File → Merge** — объединить несколько PCAP файлов
3. **Edit → Find Packet** — поиск по строке, hex, regex

Базовые фильтры отображения (Display Filters):

```
# Фильтр по IP
ip.addr == 192.168.1.100
ip.src == 10.0.0.1
ip.dst == 8.8.8.8

# Фильтр по протоколу
http
dns
smb
tcp

# Фильтр по порту
tcp.port == 443
udp.port == 53

# Комбинированные фильтры
http and ip.src == 192.168.1.0/24
dns and dns.qry.name contains "evil"

# Поиск строк в данных
frame contains "password"
http.request.uri contains "cmd="

# TCP SYN пакеты (начало соединения)
tcp.flags.syn == 1 and tcp.flags.ack == 0
```

---

## 2. Методология анализа PCAP

Правильная методология анализа PCAP включает три уровня: общий осмотр, статистический анализ и детальное изучение конкретных потоков.

```
PCAP Файл
    │
    ▼
┌─────────────────────────────────┐
│   1. ОБЩИЙ ОСМОТР (5-10 мин)   │
│   - Временной диапазон          │
│   - Количество пакетов          │
│   - Размер файла                │
│   - Уникальные IP-адреса        │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│   2. СТАТИСТИКА (10-20 мин)    │
│   - Protocol Hierarchy          │
│   - Conversations               │
│   - DNS запросы                 │
│   - HTTP хосты                  │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│   3. КОНКРЕТНЫЕ ПОТОКИ          │
│   - Аномальные соединения       │
│   - Follow TCP Stream           │
│   - Реконструкция объектов      │
│   - Извлечение IoC              │
└─────────────────────────────────┘
```

### 2.1 Общий осмотр

```bash
# Базовая информация о PCAP
tshark -r capture.pcap -q -z capture_file_info

# Количество пакетов и временной диапазон
tshark -r capture.pcap -q -z io,stat,0

# Уникальные IP-адреса
tshark -r capture.pcap -T fields -e ip.src -e ip.dst | sort -u

# Топ-10 источников трафика
tshark -r capture.pcap -q -z ip_hosts,tree
```

### 2.2 Статистический анализ

```bash
# Иерархия протоколов
tshark -r capture.pcap -q -z io,phs

# Топ разговоров по объёму данных
tshark -r capture.pcap -q -z conv,tcp

# DNS статистика
tshark -r capture.pcap -q -z dns,tree

# HTTP запросы
tshark -r capture.pcap -q -z http,tree
```

---

## 3. Wireshark Statistics: детальный обзор инструментов

### 3.1 Protocol Hierarchy (Statistics → Protocol Hierarchy)

Показывает распределение протоколов в процентах от общего трафика.

```
Признаки аномалий в Protocol Hierarchy:
┌────────────────────────────────────────────────────────┐
│ Протокол          │ Нормально   │ Подозрительно        │
├────────────────────────────────────────────────────────┤
│ DNS               │ 1-3%        │ >10% (DNS tunnel)    │
│ ICMP              │ <1%         │ >5% (ICMP tunnel)    │
│ Unknown/Data      │ ~0%         │ Любое ненулевое      │
│ SMB               │ Только LAN  │ Трафик через WAN     │
│ RDP (3389)        │ Только IT   │ С нестандартных хостов│
└────────────────────────────────────────────────────────┘
```

### 3.2 Conversations (Statistics → Conversations)

Показывает все пары «источник-назначение» с объёмом трафика.

:::tip Что искать в Conversations
- Хосты с аномально большим исходящим трафиком (возможный exfiltration)
- Соединения с нестандартными портами на внешние IP
- Большое количество коротких соединений к одному IP (beaconing)
- Длительные соединения с минимальным объёмом данных
:::

```bash
# Топ TCP разговоров
tshark -r capture.pcap -q -z conv,tcp | head -30

# Топ UDP разговоров
tshark -r capture.pcap -q -z conv,udp | head -30

# Только внешние соединения (не RFC1918)
tshark -r capture.pcap -T fields \
  -e ip.src -e ip.dst -e tcp.dstport \
  -Y "not (ip.dst matches \"^(10\\.|172\\.(1[6-9]|2[0-9]|3[01])\\.|192\\.168\\.)\")" \
  | sort -u
```

### 3.3 Endpoints (Statistics → Endpoints)

Показывает все конечные точки с количеством пакетов и байт.

```bash
# Экспорт endpoints в CSV
tshark -r capture.pcap -q -z endpoints,ip > endpoints.txt

# Проверка внешних IP через VirusTotal (пример скрипта)
#!/bin/bash
tshark -r capture.pcap -T fields -e ip.dst \
  -Y "not ip.dst matches \"^(10\\.|172\\.1[6-9]\\.|192\\.168\\.)\"" \
  | sort -u | while read ip; do
    echo "Checking: $ip"
    curl -s "https://www.virustotal.com/api/v3/ip_addresses/$ip" \
      -H "x-apikey: YOUR_API_KEY" | python3 -m json.tool | grep -E "malicious|suspicious"
done
```

### 3.4 IO Graphs (Statistics → IO Graphs)

Визуализация трафика во времени. Позволяет обнаружить:

| Паттерн на графике | Возможная причина |
|-------------------|-------------------|
| Равномерные пики с постоянным интервалом | Beaconing (C2) |
| Резкий рост исходящего трафика | Exfiltration |
| Пик DNS-запросов в определённый момент | DNS tunnel активность |
| SYN пакеты без ответов (RST flood) | Port scanning |

```
Пример beaconing на IO Graph:
Время:   00:00  01:00  02:00  03:00  04:00  05:00
Пакеты:  |  |  |  |  |  |  |  |  |  |  |  |
         Каждые 5 минут — пик (beacon check-in)
```

---

## 4. Разбор реального вредоносного PCAP: этапы атаки

### 4.1 Общая цепочка атаки в трафике

```
KILL CHAIN В ТРАФИКЕ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. RECONNAISSANCE
   └─ Сканирование портов: SYN → RST/SYN-ACK
   └─ DNS разведка: запросы MX, NS, TXT записей

2. INITIAL ACCESS (Delivery)
   └─ HTTP GET: загрузка dropper
   └─ Email attachment: SMTP трафик + DNS MX

3. COMMAND & CONTROL (C2)
   └─ Periodic HTTP/DNS requests (beaconing)
   └─ HTTPS к CDN или случайным доменам

4. LATERAL MOVEMENT
   └─ SMB tree connect к другим хостам
   └─ WMI/RPC трафик: порт 135
   └─ RDP: порт 3389

5. EXFILTRATION
   └─ Большие исходящие HTTP POST/PUT
   └─ DNS запросы с base64 в субдоменах
   └─ FTP/SFTP к внешнему серверу
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4.2 Практический разбор PCAP

```bash
# Шаг 1: Первичная разведка PCAP
echo "=== Временной диапазон ==="
tshark -r malware.pcap -q -z capture_file_info

echo "=== Protocol Hierarchy ==="
tshark -r malware.pcap -q -z io,phs

echo "=== Топ IP-адресов назначения ==="
tshark -r malware.pcap -T fields -e ip.dst | sort | uniq -c | sort -rn | head -20

echo "=== DNS запросы (уникальные домены) ==="
tshark -r malware.pcap -Y "dns.flags.response == 0" \
  -T fields -e dns.qry.name | sort -u

echo "=== HTTP хосты ==="
tshark -r malware.pcap -Y "http.request" \
  -T fields -e http.host | sort | uniq -c | sort -rn

echo "=== Большие исходящие соединения ==="
tshark -r malware.pcap -q -z conv,tcp | awk '$5 > 100000 {print}' | sort -k5 -rn
```

---

## 5. Детектирование Cobalt Strike Beaconing

Cobalt Strike — один из наиболее распространённых инструментов атакующих. Его beacon создаёт характерные паттерны трафика.

### 5.1 Характеристики Cobalt Strike Beacon

```
COBALT STRIKE BEACON ПАТТЕРН:
┌─────────────────────────────────────────────────────────┐
│ Характеристика      │ Значение                          │
├─────────────────────────────────────────────────────────┤
│ Интервал (default)  │ 60 секунд ± jitter                │
│ Jitter              │ 0-50% от интервала                │
│ URI паттерн         │ /jquery-3.3.1.min.js              │
│                     │ /updates                          │
│                     │ /pixel.gif                        │
│ User-Agent          │ Mozilla/5.0 (Windows NT 10.0;     │
│                     │ Win64; x64) Chrome/...            │
│ Размер beacon       │ 48-64 байта (малый)               │
│ Ответ сервера       │ 200 OK с малым телом              │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Анализ временных интервалов

```python
#!/usr/bin/env python3
"""
Скрипт для обнаружения beaconing по анализу временных интервалов
"""
import subprocess
import statistics
from collections import defaultdict
from datetime import datetime

def extract_connections(pcap_file, dst_ip=None):
    """Извлекает временные метки TCP SYN пакетов"""
    
    filter_str = "tcp.flags.syn==1 and tcp.flags.ack==0"
    if dst_ip:
        filter_str += f" and ip.dst=={dst_ip}"
    
    cmd = [
        "tshark", "-r", pcap_file,
        "-Y", filter_str,
        "-T", "fields",
        "-e", "frame.time_epoch",
        "-e", "ip.src",
        "-e", "ip.dst",
        "-e", "tcp.dstport"
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    connections = defaultdict(list)
    
    for line in result.stdout.strip().split('\n'):
        if not line:
            continue
        parts = line.split('\t')
        if len(parts) == 4:
            timestamp, src, dst, port = parts
            key = f"{src} -> {dst}:{port}"
            connections[key].append(float(timestamp))
    
    return connections

def detect_beaconing(connections, min_connections=5, max_variance=0.3):
    """
    Обнаруживает beaconing по малой дисперсии интервалов
    """
    suspicious = []
    
    for conn_key, timestamps in connections.items():
        if len(timestamps) < min_connections:
            continue
        
        timestamps.sort()
        intervals = [timestamps[i+1] - timestamps[i] 
                    for i in range(len(timestamps)-1)]
        
        if not intervals:
            continue
        
        mean_interval = statistics.mean(intervals)
        if mean_interval < 1:  # Игнорируем слишком частые
            continue
            
        stdev = statistics.stdev(intervals) if len(intervals) > 1 else 0
        coefficient_of_variation = stdev / mean_interval if mean_interval > 0 else 1
        
        if coefficient_of_variation < max_variance:
            suspicious.append({
                'connection': conn_key,
                'count': len(timestamps),
                'mean_interval_sec': round(mean_interval, 2),
                'stdev_sec': round(stdev, 2),
                'cv': round(coefficient_of_variation, 3),
                'first_seen': datetime.fromtimestamp(timestamps[0]),
                'last_seen': datetime.fromtimestamp(timestamps[-1])
            })
    
    return sorted(suspicious, key=lambda x: x['cv'])

# Использование
pcap_file = "suspicious_traffic.pcap"
connections = extract_connections(pcap_file)
beacons = detect_beaconing(connections)

print("=== ОБНАРУЖЕННЫЕ BEACONING ПАТТЕРНЫ ===")
for beacon in beacons[:10]:
    print(f"\nСоединение: {beacon['connection']}")
    print(f"  Количество пакетов: {beacon['count']}")
    print(f"  Средний интервал: {beacon['mean_interval_sec']} сек")
    print(f"  Стандартное отклонение: {beacon['stdev_sec']} сек")
    print(f"  Коэффициент вариации: {beacon['cv']}")
    print(f"  Период: {beacon['first_seen']} - {beacon['last_seen']}")
```

### 5.3 HTTP-профили Cobalt Strike

```bash
# Анализ HTTP запросов с подозрительными паттернами
tshark -r capture.pcap -Y "http.request" \
  -T fields \
  -e frame.time \
  -e ip.src \
  -e ip.dst \
  -e http.host \
  -e http.request.uri \
  -e http.user_agent \
  | tee http_requests.tsv

# Поиск характерных CS User-Agents
tshark -r capture.pcap -Y 'http.user_agent contains "Mozilla/5.0 (compatible"' \
  -T fields -e ip.src -e ip.dst -e http.user_agent | sort -u

# Поиск характерных CS URI паттернов
tshark -r capture.pcap -Y \
  'http.request.uri matches "(jquery|pixel\\.gif|updates|__utm\\.gif)"' \
  -T fields -e ip.src -e http.host -e http.request.uri
```

### 5.4 JA3 отпечатки TLS

JA3 — метод финgerprinting TLS Client Hello. Cobalt Strike и другие инструменты имеют характерные JA3 хеши.

```
Известные вредоносные JA3 хеши:
┌────────────────────────────────────────────────────────────────────┐
│ JA3 Hash                         │ Инструмент                     │
├────────────────────────────────────────────────────────────────────┤
│ 72a589da586844d7f0818ce684948eea │ Cobalt Strike default          │
│ a0e9f5d64349fb13191bc781f81f42e1 │ Metasploit Meterpreter         │
│ b386946a5a44d1ddcc843bc75336dfce │ Mimikatz (некоторые версии)    │
│ 6734f37431670b3ab4292b8f60f29984 │ Cobalt Strike с профилем       │
└────────────────────────────────────────────────────────────────────┘
```

```bash
# Извлечение JA3 хешей из PCAP (требует плагин Wireshark или zeek)
zeek -r capture.pcap /opt/zeek/share/zeek/policy/protocols/ssl/ja3.zeek
cat ssl.log | zeek-cut ja3 ja3s id.orig_h id.resp_h | sort -u

# Через tshark (если установлен плагин ja3)
tshark -r capture.pcap -Y "tls.handshake.type == 1" \
  -T fields \
  -e ip.src \
  -e ip.dst \
  -e tls.handshake.ciphersuite \
  -e tls.handshake.extensions_server_name
```

---

## 6. C2 трафик по DNS (DNS Tunneling)

DNS-туннелирование использует DNS-протокол для передачи данных через корпоративные файрволы, которые разрешают DNS трафик.

### 6.1 Признаки DNS-туннеля

| Признак | Нормальный DNS | DNS Tunnel |
|---------|---------------|-----------|
| Длина запроса | 10-50 символов | 50-255 символов |
| Частота запросов | 10-100/мин | 100-1000+/мин |
| Тип записей | A, AAAA, MX | TXT, NULL, CNAME |
| Уникальность субдоменов | Повторяются | Каждый уникален |
| Энтропия субдомена | Низкая | Высокая (base64) |
| Размер ответа | 4-16 байт | 255 байт (TXT) |

### 6.2 Обнаружение DNS-туннеля

```bash
# Аномально длинные DNS запросы (>50 символов субдомена)
tshark -r capture.pcap -Y "dns.flags.response == 0" \
  -T fields -e dns.qry.name \
  | awk 'length($0) > 50 {print length($0), $0}' \
  | sort -rn | head -30

# Высокочастотные DNS запросы к одному домену
tshark -r capture.pcap -Y "dns.flags.response == 0" \
  -T fields -e dns.qry.name \
  | sed 's/.*\.\([^.]*\.[^.]*\)$/\1/' \
  | sort | uniq -c | sort -rn | head -20

# DNS TXT записи (часто используются для туннеля)
tshark -r capture.pcap -Y "dns.qry.type == 16" \
  -T fields -e dns.qry.name -e dns.txt

# Уникальность субдоменов (показатель туннелирования)
tshark -r capture.pcap -Y "dns.flags.response == 0" \
  -T fields -e dns.qry.name \
  | awk -F. 'NF>=3 {print $1}' \
  | sort -u | wc -l
```

```python
#!/usr/bin/env python3
"""
Анализ DNS трафика для обнаружения туннелирования
Использует энтропию Шеннона для оценки случайности субдоменов
"""
import subprocess
import math
from collections import Counter, defaultdict

def shannon_entropy(string):
    """Вычисляет энтропию Шеннона строки"""
    if not string:
        return 0
    
    char_counts = Counter(string.lower())
    length = len(string)
    
    entropy = 0
    for count in char_counts.values():
        probability = count / length
        entropy -= probability * math.log2(probability)
    
    return entropy

def extract_dns_queries(pcap_file):
    """Извлекает DNS запросы из PCAP"""
    cmd = [
        "tshark", "-r", pcap_file,
        "-Y", "dns.flags.response == 0",
        "-T", "fields",
        "-e", "frame.time_epoch",
        "-e", "ip.src",
        "-e", "dns.qry.name",
        "-e", "dns.qry.type"
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    queries = []
    
    for line in result.stdout.strip().split('\n'):
        if not line:
            continue
        parts = line.split('\t')
        if len(parts) >= 3:
            queries.append({
                'timestamp': float(parts[0]) if parts[0] else 0,
                'src_ip': parts[1],
                'domain': parts[2],
                'type': parts[3] if len(parts) > 3 else 'unknown'
            })
    
    return queries

def analyze_dns_tunnel(queries):
    """Анализирует DNS запросы на признаки туннелирования"""
    
    # Группировка по корневому домену
    domain_stats = defaultdict(lambda: {
        'queries': [],
        'unique_subdomains': set(),
        'total_length': 0,
        'entropy_sum': 0
    })
    
    for q in queries:
        parts = q['domain'].split('.')
        if len(parts) >= 2:
            root_domain = '.'.join(parts[-2:])
            subdomain = '.'.join(parts[:-2]) if len(parts) > 2 else ''
            
            stats = domain_stats[root_domain]
            stats['queries'].append(q)
            stats['unique_subdomains'].add(subdomain)
            stats['total_length'] += len(q['domain'])
            
            if subdomain:
                stats['entropy_sum'] += shannon_entropy(subdomain)
    
    # Анализ и вывод результатов
    suspicious = []
    
    for domain, stats in domain_stats.items():
        query_count = len(stats['queries'])
        unique_sub_count = len(stats['unique_subdomains'])
        avg_length = stats['total_length'] / query_count if query_count > 0 else 0
        avg_entropy = stats['entropy_sum'] / query_count if query_count > 0 else 0
        
        # Критерии подозрительности
        is_suspicious = (
            query_count > 50 or           # Высокая частота
            avg_length > 40 or            # Длинные запросы
            avg_entropy > 3.5 or          # Высокая энтропия (случайность)
            unique_sub_count > 30         # Много уникальных субдоменов
        )
        
        if is_suspicious:
            suspicious.append({
                'domain': domain,
                'query_count': query_count,
                'unique_subdomains': unique_sub_count,
                'avg_query_length': round(avg_length, 1),
                'avg_entropy': round(avg_entropy, 2),
                'risk_score': int(
                    (query_count/50)*20 + 
                    (avg_length/40)*30 + 
                    (avg_entropy/4)*50
                )
            })
    
    return sorted(suspicious, key=lambda x: x['risk_score'], reverse=True)

# Запуск анализа
queries = extract_dns_queries("suspicious.pcap")
tunnels = analyze_dns_tunnel(queries)

print("=== ПОДОЗРИТЕЛЬНЫЕ DNS ДОМЕНЫ (возможный туннель) ===\n")
for t in tunnels[:10]:
    print(f"Домен: {t['domain']}")
    print(f"  Запросов: {t['query_count']}")
    print(f"  Уникальных субдоменов: {t['unique_subdomains']}")
    print(f"  Средняя длина запроса: {t['avg_query_length']} символов")
    print(f"  Средняя энтропия: {t['avg_entropy']}")
    print(f"  Уровень риска: {t['risk_score']}/100\n")
```

### 6.3 Примеры вредоносных DNS запросов

```
Нормальный DNS:
  www.google.com → A запись

DNS Tunnel (base64 данные в субдомене):
  aGVsbG8gd29ybGQ.evil-c2.com → TXT запрос
  
DNS Tunnel (hex кодирование):
  68656c6c6f776f726c64.attacker.net → A запрос
  
DNS Tunnel (iodine):
  t-zjsg8.tunnel.evil.org
  t-d0asfg.tunnel.evil.org
  t-9xkqp1.tunnel.evil.org
  (каждый субдомен уникален и случаен)
```

```bash
# Декодирование base64 субдоменов
tshark -r capture.pcap -Y "dns.flags.response == 0" \
  -T fields -e dns.qry.name \
  | grep -oP '^[A-Za-z0-9+/=]{20,}\.' \
  | while read encoded; do
    decoded=$(echo "${encoded%.}" | base64 -d 2>/dev/null)
    echo "Encoded: $encoded | Decoded: $decoded"
done
```

---

## 7. HTTP/HTTPS C2: аномальный трафик

### 7.1 Подозрительные HTTP паттерны

```bash
# Необычные User-Agent строки
tshark -r capture.pcap -Y "http.request" \
  -T fields -e http.user_agent \
  | sort | uniq -c | sort -rn | head -20

# HTTP с пустым или отсутствующим User-Agent
tshark -r capture.pcap -Y "http.request and not http.user_agent" \
  -T fields -e ip.src -e http.host -e http.request.uri

# Анализ частоты HTTP запросов к одному хосту
tshark -r capture.pcap -Y "http.request" \
  -T fields -e frame.time_epoch -e http.host \
  | awk '{print $2}' \
  | sort | uniq -c | sort -rn | head -20

# HTTP POST с большими телами (возможный exfiltration)
tshark -r capture.pcap -Y "http.request.method == POST" \
  -T fields \
  -e ip.src \
  -e http.host \
  -e http.request.uri \
  -e http.content_length \
  | awk '$4 > 10000 {print}'
```

### 7.2 Анализ HTTPS без расшифровки

Даже без приватных ключей можно анализировать HTTPS трафик:

```bash
# Извлечение SNI (Server Name Indication) из TLS ClientHello
tshark -r capture.pcap \
  -Y "tls.handshake.type == 1" \
  -T fields \
  -e ip.src \
  -e ip.dst \
  -e tls.handshake.extensions_server_name \
  | sort -u

# Анализ сертификатов (Subject, Issuer)
tshark -r capture.pcap \
  -Y "tls.handshake.type == 11" \
  -T fields \
  -e ip.src \
  -e ip.dst \
  -e x509sat.uTF8String \
  | head -50

# Самоподписанные сертификаты (Issuer == Subject)
tshark -r capture.pcap \
  -Y "tls.handshake.certificate" \
  -T fields \
  -e x509af.issuer \
  -e x509af.subject \
  | awk 'BEGIN{FS="\t"} $1==$2 {print "Self-signed:", $1}'
```

### 7.3 Таблица подозрительных User-Agent

| User-Agent | Инструмент | Риск |
|-----------|-----------|------|
| `python-requests/2.x.x` | Скрипт/автоматизация | Средний |
| `Go-http-client/1.1` | Go-инструмент | Средний |
| `curl/7.x.x` | curl CLI | Низкий-средний |
| `() { :;}; ` | ShellShock попытка | Критический |
| `Mozilla/4.0 (compatible; MSIE 6.0)` | Устаревший IE/C2 профиль | Высокий |
| Пустая строка | Malware/scanner | Высокий |
| `Nim httpclient/x.x.x` | Malware на Nim | Высокий |

---

## 8. Признаки Network Scanning

### 8.1 SYN Scanning

```bash
# Детектирование SYN scan: много SYN без ACK
tshark -r capture.pcap \
  -Y "tcp.flags.syn==1 and tcp.flags.ack==0" \
  -T fields -e ip.src -e ip.dst -e tcp.dstport \
  | awk '{print $1}' | sort | uniq -c | sort -rn | head -10

# Полный порт-свип: один источник → много портов на один IP
tshark -r capture.pcap \
  -Y "tcp.flags.syn==1 and tcp.flags.ack==0" \
  -T fields -e ip.src -e ip.dst -e tcp.dstport \
  | awk '{key=$1" -> "$2; ports[key][$3]=1} 
         END{for(k in ports) 
               if(length(ports[k])>20) 
                 print length(ports[k]),"ports:", k}' \
  | sort -rn | head -10

# Nmap OS Detection: характерные пакеты
tshark -r capture.pcap \
  -Y "tcp.flags==0x29 or tcp.flags==0x00 or icmp.type==8" \
  -T fields -e ip.src -e tcp.flags -e frame.protocols
```

### 8.2 Признаки различных типов сканирования

```
Типы сканирования и их сигнатуры в трафике:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYN SCAN (nmap -sS):
  → TCP SYN → RST ответ (порт закрыт)
  → TCP SYN → SYN-ACK → RST (порт открыт, соединение не устанавливается)
  
NULL SCAN (nmap -sN):
  → TCP без флагов → нет ответа (открыт) или RST (закрыт)
  
FIN SCAN (nmap -sF):
  → TCP FIN → нет ответа (открыт) или RST (закрыт)
  
XMAS SCAN (nmap -sX):
  → TCP FIN+PSH+URG → нет ответа (открыт) или RST (закрыт)
  
UDP SCAN (nmap -sU):
  → UDP → ICMP Port Unreachable (закрыт)
  → UDP → нет ответа (открыт или фильтруется)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

```bash
# Обнаружение NULL/FIN/XMAS сканирования
tshark -r capture.pcap \
  -Y "tcp.flags == 0x000 or tcp.flags == 0x001 or tcp.flags == 0x029" \
  -T fields -e ip.src -e ip.dst -e tcp.flags \
  | sort | uniq -c | sort -rn

# Баннер grabbing: соединения на порты, завершающиеся быстро
tshark -r capture.pcap \
  -Y "tcp.flags.fin==1" \
  -T fields -e ip.src -e ip.dst -e tcp.dstport \
  | awk '{print $1, $3}' | sort | uniq -c | sort -rn
```

---

## 9. Признаки Lateral Movement

### 9.1 SMB трафик

SMB (Server Message Block) используется для перемещения по сети через общие папки, передачу файлов и удалённое выполнение.

```bash
# SMB соединения
tshark -r capture.pcap -Y "smb or smb2" \
  -T fields \
  -e ip.src \
  -e ip.dst \
  -e smb.cmd \
  -e smb2.cmd \
  | sort | uniq -c | sort -rn

# SMB Tree Connect (подключение к шарам)
tshark -r capture.pcap \
  -Y "smb2.cmd == 3" \
  -T fields \
  -e ip.src \
  -e ip.dst \
  -e smb2.tree

# PsExec признак: IPC$ + ADMIN$ шары
tshark -r capture.pcap \
  -Y 'smb2.tree contains "IPC$" or smb2.tree contains "ADMIN$"' \
  -T fields -e ip.src -e ip.dst -e smb2.tree

# SMB файловые операции (чтение/запись файлов)
tshark -r capture.pcap \
  -Y "smb2.cmd == 5 or smb2.cmd == 9" \
  -T fields \
  -e ip.src -e ip.dst \
  -e smb2.filename \
  | grep -v "^$"
```

### 9.2 RDP трафик

```bash
# RDP соединения (порт 3389)
tshark -r capture.pcap \
  -Y "tcp.dstport == 3389 and tcp.flags.syn==1 and tcp.flags.ack==0" \
  -T fields -e ip.src -e ip.dst \
  | sort | uniq -c | sort -rn

# Нестандартные порты RDP (атакующие часто меняют)
tshark -r capture.pcap \
  -Y "rdp or credssp" \
  -T fields -e ip.src -e ip.dst -e tcp.dstport \
  | sort -u

# Spray: один IP пытается RDP к нескольким хостам
tshark -r capture.pcap \
  -Y "tcp.dstport == 3389 and tcp.flags.syn==1" \
  -T fields -e ip.src -e ip.dst \
  | awk '{src[$1][$2]=1} END{for(s in src) if(length(src[s])>3) print length(src[s]),"хостов:", s}'
```

### 9.3 WMI и PowerShell Remoting

```bash
# WMI трафик (порт 135 + динамические порты)
tshark -r capture.pcap \
  -Y "tcp.dstport == 135 or dcerpc" \
  -T fields -e ip.src -e ip.dst -e dcerpc.opnum \
  | sort | uniq -c

# PowerShell Remoting (WinRM, порты 5985/5986)
tshark -r capture.pcap \
  -Y "tcp.dstport == 5985 or tcp.dstport == 5986" \
  -T fields -e ip.src -e ip.dst -e tcp.dstport \
  | sort | uniq -c | sort -rn

# Kerberos аутентификация (признак Pass-the-Ticket)
tshark -r capture.pcap \
  -Y "kerberos" \
  -T fields \
  -e ip.src \
  -e kerberos.CNameString \
  -e kerberos.realm \
  | sort -u
```

### 9.4 Таблица lateral movement индикаторов

| Протокол | Порт | Инструмент | Признак в PCAP |
|---------|------|-----------|---------------|
| SMB | 445 | PsExec, Impacket | IPC$ + ADMIN$ + файл .exe |
| RDP | 3389 | RDP клиент | TLS + CredSSP handshake |
| WMI | 135 | WmiExec | DCOM + RPC трафик |
| WinRM | 5985 | Evil-WinRM | HTTP + SOAP envelope |
| SSH | 22 | SSH | Много новых сессий |
| LDAP | 389 | BloodHound | Массовые AD запросы |

---

## 10. Exfiltration Patterns

### 10.1 Признаки exfiltration данных

:::warning Exfiltration — финальная стадия атаки
Своевременное обнаружение exfiltration позволяет минимизировать ущерб. Фокусируйтесь на аномально больших исходящих соединениях и нестандартных протоколах.
:::

```bash
# Большие исходящие соединения к внешним IP
tshark -r capture.pcap -q -z conv,tcp \
  | awk 'NR>5 && $5>1000000 {print}' \
  | sort -k5 -rn

# HTTP POST с большими данными
tshark -r capture.pcap \
  -Y "http.request.method == POST and http.content_length > 50000" \
  -T fields \
  -e frame.time \
  -e ip.src \
  -e http.host \
  -e http.content_length

# FTP передачи файлов
tshark -r capture.pcap \
  -Y "ftp-data" \
  -T fields \
  -e ip.src -e ip.dst \
  -e ftp-data.command \
  | sort | uniq -c

# SFTP/SCP трафик (нестандартные направления)
tshark -r capture.pcap \
  -Y "tcp.dstport == 22 and ssh" \
  -T fields -e ip.src -e ip.dst \
  | sort | uniq -c | sort -rn
```

### 10.2 Steganography и скрытые каналы

```bash
# ICMP с нестандартными данными (ICMP tunnel)
tshark -r capture.pcap \
  -Y "icmp.type == 8" \
  -T fields \
  -e ip.src -e ip.dst \
  -e data.data \
  -e icmp.data_len \
  | awk '$4 > 64 {print}'  # Нормальный ping = 8-64 байта данных

# DNS exfiltration: base64 в запросах
tshark -r capture.pcap \
  -Y "dns.flags.response == 0" \
  -T fields -e dns.qry.name \
  | awk '{
    split($0, parts, ".");
    sub = parts[1];
    if(length(sub) > 30) print "SUSPICIOUS:", $0
  }'

# Подсчёт соотношения входящий/исходящий трафик
tshark -r capture.pcap -q -z conv,tcp \
  | awk 'NR>5 {
    if($5>0 && $3>0) {
      ratio = $5/$3;
      if(ratio > 5) print "HIGH OUTBOUND RATIO:", ratio, $1, "->", $2
    }
  }'
```

---

## 11. Tshark команды для автоматического извлечения IoC

### 11.1 Полный скрипт извлечения IoC

```bash
#!/bin/bash
# ioc_extractor.sh - Автоматическое извлечение IoC из PCAP
# Использование: ./ioc_extractor.sh <pcap_file>

PCAP="$1"
OUTPUT_DIR="ioc_output_$(date +%Y%m%d_%H%M%S)"

if [ -z "$PCAP" ]; then
    echo "Использование: $0 <pcap_file>"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"
echo "[*] Анализируем: $PCAP"
echo "[*] Результаты: $OUTPUT_DIR/"

# ============================
# 1. IP-адреса
# ============================
echo "[*] Извлекаем IP-адреса..."
tshark -r "$PCAP" -T fields -e ip.src -e ip.dst 2>/dev/null \
  | tr '\t' '\n' | sort -u \
  | grep -v "^$" \
  > "$OUTPUT_DIR/ip_addresses.txt"

# Только внешние IP
tshark -r "$PCAP" -T fields -e ip.src -e ip.dst 2>/dev/null \
  | tr '\t' '\n' | sort -u \
  | grep -v "^$" \
  | grep -vE "^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|0\.0\.0\.0)" \
  > "$OUTPUT_DIR/external_ips.txt"

echo "[+] IP-адресов: $(wc -l < "$OUTPUT_DIR/ip_addresses.txt")"
echo "[+] Внешних IP: $(wc -l < "$OUTPUT_DIR/external_ips.txt")"

# ============================
# 2. Домены из DNS
# ============================
echo "[*] Извлекаем DNS домены..."
tshark -r "$PCAP" -Y "dns.flags.response == 0" \
  -T fields -e dns.qry.name 2>/dev/null \
  | sort -u | grep -v "^$" \
  > "$OUTPUT_DIR/dns_domains.txt"

# Подозрительные длинные домены
tshark -r "$PCAP" -Y "dns.flags.response == 0" \
  -T fields -e dns.qry.name 2>/dev/null \
  | awk 'length($0) > 50' | sort -u \
  > "$OUTPUT_DIR/suspicious_dns.txt"

echo "[+] DNS доменов: $(wc -l < "$OUTPUT_DIR/dns_domains.txt")"
echo "[+] Подозрительных DNS: $(wc -l < "$OUTPUT_DIR/suspicious_dns.txt")"

# ============================
# 3. HTTP артефакты
# ============================
echo "[*] Извлекаем HTTP данные..."
tshark -r "$PCAP" -Y "http.request" \
  -T fields -e http.host -e http.request.uri 2>/dev/null \
  | sort -u | grep -v "^$" \
  > "$OUTPUT_DIR/http_requests.txt"

tshark -r "$PCAP" -Y "http.request" \
  -T fields -e http.user_agent 2>/dev/null \
  | sort | uniq -c | sort -rn \
  > "$OUTPUT_DIR/user_agents.txt"

echo "[+] HTTP запросов: $(wc -l < "$OUTPUT_DIR/http_requests.txt")"

# ============================
# 4. TLS/SSL артефакты
# ============================
echo "[*] Извлекаем TLS SNI..."
tshark -r "$PCAP" -Y "tls.handshake.type == 1" \
  -T fields -e tls.handshake.extensions_server_name 2>/dev/null \
  | sort -u | grep -v "^$" \
  > "$OUTPUT_DIR/tls_sni.txt"

echo "[+] TLS SNI записей: $(wc -l < "$OUTPUT_DIR/tls_sni.txt")"

# ============================
# 5. Email адреса (из SMTP)
# ============================
echo "[*] Извлекаем email адреса..."
tshark -r "$PCAP" -Y "smtp" \
  -T fields -e smtp.req.parameter 2>/dev/null \
  | grep -oE "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" \
  | sort -u \
  > "$OUTPUT_DIR/email_addresses.txt"

# ============================
# 6. URL с параметрами
# ============================
echo "[*] Извлекаем подозрительные URL..."
tshark -r "$PCAP" -Y "http.request" \
  -T fields -e http.host -e http.request.uri 2>/dev/null \
  | awk '{print "http://"$1$2}' \
  | grep -E "(cmd=|exec=|system=|eval=|base64|\.php\?[a-z]+=)" \
  > "$OUTPUT_DIR/suspicious_urls.txt"

# ============================
# 7. Сводный отчёт
# ============================
cat > "$OUTPUT_DIR/summary.txt" << EOF
=== IoC ОТЧЁТ ===
Файл PCAP: $PCAP
Время анализа: $(date)

СТАТИСТИКА:
- IP-адресов всего: $(wc -l < "$OUTPUT_DIR/ip_addresses.txt")
- Внешних IP: $(wc -l < "$OUTPUT_DIR/external_ips.txt")
- DNS доменов: $(wc -l < "$OUTPUT_DIR/dns_domains.txt")
- Подозрительных DNS: $(wc -l < "$OUTPUT_DIR/suspicious_dns.txt")
- HTTP запросов: $(wc -l < "$OUTPUT_DIR/http_requests.txt")
- TLS SNI: $(wc -l < "$OUTPUT_DIR/tls_sni.txt")
- Email адресов: $(wc -l < "$OUTPUT_DIR/email_addresses.txt")

ФАЙЛЫ:
$(ls -la "$OUTPUT_DIR/")
EOF

echo ""
echo "[+] Анализ завершён. Результаты в: $OUTPUT_DIR/"
cat "$OUTPUT_DIR/summary.txt"
```

### 11.2 Дополнительные tshark команды

```bash
# Экспорт всех HTTP объектов (файлов)
mkdir -p http_objects
tshark -r capture.pcap --export-objects "http,http_objects/"
ls -la http_objects/

# Экспорт SMB файлов
mkdir -p smb_objects  
tshark -r capture.pcap --export-objects "smb,smb_objects/"

# Поиск исполняемых файлов в трафике
tshark -r capture.pcap -Y "http" \
  -T fields -e http.content_type \
  | grep -E "(executable|x-msdownload|octet-stream)"

# Извлечение credentials из HTTP Basic Auth
tshark -r capture.pcap \
  -Y "http.authorization" \
  -T fields -e http.authorization \
  | sed 's/Basic //' \
  | base64 -d 2>/dev/null

# Поиск паролей в plain text
tshark -r capture.pcap -Y "ftp" \
  -T fields -e ftp.request.command -e ftp.request.arg \
  | grep -i "PASS"
```

---

## 12. Wireshark фильтры для SOC-аналитика

```bash
# ===== COLLECTION OF SOC WIRESHARK FILTERS =====

# Beaconing detection
# Регулярные соединения с одним IP каждые N секунд
# Использовать совместно с IO Graphs

# Malware download indicators
http.request.uri matches "\.(exe|dll|bat|ps1|vbs|js)$"

# PowerShell в URL
http.request.uri contains "powershell" or 
http contains "IEX" or 
http contains "Invoke-Expression"

# Cobalt Strike default URIs
http.request.uri matches "(jquery|updates|pixel\.gif|fwlink)"

# DNS tunneling
dns.qry.name matches "[A-Za-z0-9+/=]{30,}\."

# Credential theft indicators
http.request.method == "POST" and 
http.request.uri contains "login"

# LLMNR/NBNS poisoning (Responder)
llmnr or nbns

# ARP spoofing
arp.duplicate-address-detected

# Nmap scan signatures
tcp.flags == 0x000 or  # NULL scan
tcp.flags == 0x029 or  # XMAS scan  
(tcp.flags.syn==1 and tcp.flags.ack==0 and tcp.window_size==1024) # nmap default

# SMB lateral movement
smb2.cmd == 3 and (smb2.tree contains "ADMIN$" or smb2.tree contains "C$")

# Kerberoasting
kerberos.msg.type == 12 and kerberos.etype == 23

# Pass-the-Hash (NTLM auth)
ntlmssp.messagetype == 3
```

---

## 📝 Практическое задание

### Задание: Анализ учебного PCAP

**Сценарий:** Вам предоставлен PCAP-файл с подозрительной сетевой активностью. Необходимо провести полный анализ и написать отчёт об инциденте.

**Источники учебных PCAP:**
- https://malware-traffic-analysis.net — реальные вредоносные PCAP
- https://www.netresec.com/index.ashx?page=PcapFiles — коллекция
- https://github.com/chrissanders/packets — образовательные примеры

**Этапы выполнения:**

**Шаг 1: Первичный осмотр**
```bash
# Выполните и запишите результаты
tshark -r lab.pcap -q -z capture_file_info
tshark -r lab.pcap -q -z io,phs
```

**Шаг 2: Поиск аномалий**
```bash
# Необычные порты назначения
tshark -r lab.pcap -Y "tcp.flags.syn==1 and tcp.flags.ack==0" \
  -T fields -e ip.dst -e tcp.dstport \
  | sort | uniq -c | sort -rn | head -20

# DNS аномалии
tshark -r lab.pcap -Y "dns" -T fields \
  -e dns.qry.name | sort | uniq -c | sort -rn | head -20
```

**Шаг 3: Follow TCP Stream**

В Wireshark:
1. Найдите подозрительный пакет
2. Правая кнопка → Follow → TCP Stream
3. Изучите содержимое сессии

**Шаг 4: Составьте отчёт по шаблону:**

```markdown
## Отчёт об анализе PCAP

**Файл:** lab.pcap
**Аналитик:** [Ваше имя]
**Дата:** [Дата]

### Временной диапазон
[Начало] - [Конец]

### Затронутые хосты
| IP | Роль | Примечание |
|----|------|-----------|
| x.x.x.x | Жертва | Внутренний хост |
| y.y.y.y | C2 сервер | Внешний IP |

### Хронология атаки
1. HH:MM - [событие]
2. HH:MM - [событие]

### Индикаторы компрометации (IoC)
**IP-адреса:**
- x.x.x.x — C2 сервер

**Домены:**
- evil.example.com

**URL:**
- http://evil.example.com/payload.exe

### Тактики MITRE ATT&CK
- T1071.001 — Application Layer Protocol: Web Protocols (C2)
- T1041 — Exfiltration Over C2 Channel

### Рекомендации
1. Заблокировать IP x.x.x.x на файрволе
2. Провести форензику хоста x.x.x.x
```

**Задания для самопроверки:**

1. Найдите в PCAP хост, который первым установил соединение с внешним C2
2. Определите используемый HTTP профиль (User-Agent, URI паттерн)
3. Вычислите средний интервал beaconing
4. Найдите, какие данные были переданы (если есть exfiltration)
5. Сопоставьте найденные техники с MITRE ATT&CK

:::tip Полезные ресурсы для практики
- **Malware Traffic Analysis** (malware-traffic-analysis.net) — еженедельные учебные PCAP с quiz
- **PacketTotal** (packettotal.com) — онлайн анализ PCAP без установки ПО
- **NetworkMiner** — альтернатива Wireshark для форензики сети
:::

---

## 📚 Итоги

В этой главе мы изучили:

| Тема | Ключевые инструменты | Применение |
|------|---------------------|-----------|
| Захват трафика | tcpdump, Wireshark, tshark | Получение PCAP |
| Статистика | Protocol Hierarchy, Conversations | Быстрый осмотр |
| Beaconing | Анализ интервалов, JA3 | Детектирование C2 |
| DNS tunnel | Энтропия, длина запросов | Обнаружение скрытых каналов |
| Lateral movement | SMB, RDP, WMI фильтры | Отслеживание перемещения |
| Exfiltration | Объём трафика, протоколы | Обнаружение утечки |
| Автоматизация | tshark + bash/python | IoC извлечение |

**Ключевые выводы:**
1. Методология анализа (общий → статистика → детально) экономит время
2. Beaconing детектируется по малой дисперсии временных интервалов
3. DNS tunnel выдают длинные субдомены с высокой энтропией
4. Lateral movement оставляет характерные следы в SMB/RDP/WMI трафике
5. Автоматизация с tshark позволяет быстро извлекать IoC для TI платформ

---

*← [Глава 8.3: Memory Forensics с Volatility](chapter-8-3.md) | [Часть 9: Карьера в ИБ →](../../part-9/chapter-9-1.md)*
