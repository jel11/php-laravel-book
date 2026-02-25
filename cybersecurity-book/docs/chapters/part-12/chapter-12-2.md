# Глава 12.2: Активное сканирование: Nmap, Nikto, Nuclei

## Введение

Активное сканирование — второй этап тестирования на проникновение, следующий за пассивной разведкой. В отличие от пассивных методов, активное сканирование устанавливает прямые соединения с целевыми системами, что делает его обнаруживаемым. Именно поэтому активное сканирование **всегда** требует явного письменного разрешения от владельца системы.

> **Предупреждение:** Несанкционированное активное сканирование является незаконным в большинстве стран. Все примеры в этой главе применимы только к системам, для которых у вас есть разрешение.

---

## 12.2.1 Nmap — сетевой сканер

Nmap (Network Mapper) — самый популярный инструмент для сетевого сканирования. Он используется для:
- Обнаружения хостов в сети
- Определения открытых портов
- Идентификации сервисов и версий
- Определения операционных систем
- Выполнения скриптов NSE

### Основы синтаксиса Nmap

```bash
nmap [ТИП СКАНИРОВАНИЯ] [ОПЦИИ] {цель}

# Цель может быть:
nmap 192.168.1.1           # Один IP
nmap 192.168.1.1-100       # Диапазон IP
nmap 192.168.1.0/24        # Подсеть
nmap example.com           # Домен
nmap -iL targets.txt       # Список из файла
```

### Типы сканирования Nmap

| Флаг  | Тип                   | Описание                                          | Требует root |
|-------|-----------------------|---------------------------------------------------|--------------|
| `-sS` | TCP SYN Scan          | Полуоткрытое сканирование, самый популярный тип   | Да           |
| `-sT` | TCP Connect Scan      | Полное TCP-соединение, медленнее, не требует root | Нет          |
| `-sU` | UDP Scan              | Сканирование UDP-портов                           | Да           |
| `-sA` | TCP ACK Scan          | Определение правил файрвола                       | Да           |
| `-sN` | TCP Null Scan         | Без флагов TCP                                    | Да           |
| `-sF` | TCP FIN Scan          | Только флаг FIN                                   | Да           |
| `-sX` | TCP Xmas Scan         | FIN, PSH, URG флаги                               | Да           |
| `-sP` | Ping Scan             | Только обнаружение хостов                         | Нет          |
| `-sn` | Ping Sweep            | Без сканирования портов                           | Нет          |
| `-sV` | Version Detection     | Определение версий сервисов                       | Нет          |
| `-sC` | Script Scan           | Запуск скриптов по умолчанию                      | Нет          |
| `-O`  | OS Detection          | Определение ОС                                    | Да           |
| `-A`  | Aggressive Scan       | -sV -sC -O --traceroute                           | Да           |

### TCP SYN Scan (-sS)

```bash
# Базовое SYN-сканирование (требует root/sudo)
sudo nmap -sS 192.168.1.1

# Сканирование конкретных портов
sudo nmap -sS -p 22,80,443,8080,8443 192.168.1.1

# Сканирование диапазона портов
sudo nmap -sS -p 1-1000 192.168.1.1

# Сканирование всех 65535 портов
sudo nmap -sS -p- 192.168.1.1

# Топ 1000 наиболее распространённых портов (по умолчанию)
sudo nmap -sS 192.168.1.1

# Топ 100 портов
sudo nmap -sS --top-ports 100 192.168.1.1

# Топ 10000 портов
sudo nmap -sS --top-ports 10000 192.168.1.1
```

**Как работает SYN Scan:**
```
Клиент (Nmap)          Сервер (Цель)
     |                      |
     |---SYN--------------->|   Отправка SYN
     |<--SYN/ACK------------|   Порт открыт
     |---RST--------------->|   Сброс (не завершаем handshake)
     |                      |
     |---SYN--------------->|
     |<--RST/ACK------------|   Порт закрыт
     |                      |
     |---SYN--------------->|
     |   [no response]      |   Порт фильтруется (firewall)
```

### Определение версий (-sV)

```bash
# Определение версий сервисов
nmap -sV 192.168.1.1

# Интенсивность определения версий (0-9)
nmap -sV --version-intensity 5 192.168.1.1

# Максимальная интенсивность
nmap -sV --version-all 192.168.1.1

# Пример вывода:
# PORT    STATE SERVICE    VERSION
# 22/tcp  open  ssh        OpenSSH 8.2p1 Ubuntu 4ubuntu0.5
# 80/tcp  open  http       Apache httpd 2.4.41
# 443/tcp open  ssl/https  Apache httpd 2.4.41
# 3306/tcp open mysql     MySQL 8.0.31
```

### Определение ОС (-O)

```bash
# Определение операционной системы
sudo nmap -O 192.168.1.1

# Ограничение точности (не угадывать при малой уверенности)
sudo nmap -O --osscan-limit 192.168.1.1

# Пример вывода:
# OS details: Linux 4.15 - 5.6
# Network Distance: 1 hop
# Running: Linux 5.X
# OS CPE: cpe:/o:linux:linux_kernel:5
```

### Агрессивное сканирование (-A)

```bash
# Комплексное сканирование (равно -sV -sC -O --traceroute)
sudo nmap -A 192.168.1.1

# Более тихое агрессивное сканирование
sudo nmap -A -T2 192.168.1.1

# С сохранением вывода
sudo nmap -A 192.168.1.1 -oN result.txt
```

### Управление скоростью (-T)

| Уровень | Название   | Описание                            | Использование           |
|---------|------------|-------------------------------------|-------------------------|
| `-T0`   | Paranoid   | 5 мин задержка, один порт за раз    | Максимальная скрытность |
| `-T1`   | Sneaky     | 15 сек задержка                     | Скрытное сканирование   |
| `-T2`   | Polite     | Вежливое, не перегружает            | Избегание помех         |
| `-T3`   | Normal     | По умолчанию                        | Обычное использование   |
| `-T4`   | Aggressive | Быстрое, предполагает быструю сеть  | CTF, пентест в ЛВС      |
| `-T5`   | Insane     | Очень быстрое, возможны пропуски    | Только в тесте          |

```bash
# Медленное скрытное сканирование
sudo nmap -T1 -sS 192.168.1.1

# Быстрое сканирование для CTF/lab
nmap -T4 -F 192.168.1.1

# Ручная настройка скорости
sudo nmap --min-rate 100 --max-rate 500 192.168.1.0/24
sudo nmap --min-parallelism 10 --max-parallelism 100 192.168.1.0/24
```

---

## 12.2.2 NSE — Nmap Scripting Engine

NSE позволяет запускать скрипты Lua для дополнительной разведки, обнаружения уязвимостей и даже эксплуатации.

### Категории NSE-скриптов

| Категория   | Описание                                       |
|-------------|------------------------------------------------|
| `auth`      | Проверка аутентификации                        |
| `broadcast` | Обнаружение хостов через broadcast             |
| `brute`     | Брутфорс аутентификации                        |
| `default`   | Скрипты по умолчанию (-sC)                     |
| `discovery` | Обнаружение сервисов                           |
| `dos`       | Проверка на DoS уязвимости                     |
| `exploit`   | Эксплуатация уязвимостей                       |
| `external`  | Использование внешних источников               |
| `fuzzer`    | Фаззинг                                        |
| `intrusive` | Глубокое сканирование, может вызвать сбои      |
| `malware`   | Поиск малвари                                  |
| `safe`      | Безопасные скрипты                             |
| `version`   | Определение версий                             |
| `vuln`      | Проверка на уязвимости                         |

### Использование NSE-скриптов

```bash
# Запуск скриптов по умолчанию (-sC или --script=default)
nmap -sC 192.168.1.1

# Запуск конкретного скрипта
nmap --script=http-title 192.168.1.1

# Несколько скриптов
nmap --script=http-title,http-server-header 192.168.1.1

# Все скрипты категории
nmap --script=vuln 192.168.1.1
nmap --script=auth 192.168.1.1
nmap --script=discovery 192.168.1.1

# Скрипты по шаблону
nmap --script="http-*" 192.168.1.1
nmap --script="smb-vuln-*" 192.168.1.1

# С аргументами скрипта
nmap --script=http-brute --script-args="http-brute.path=/login,userdb=users.txt,passdb=pass.txt" 192.168.1.1

# Показать справку по скрипту
nmap --script-help http-shellshock
```

### Полезные NSE-скрипты

```bash
# === HTTP-скрипты ===

# Заголовки HTTP
nmap --script=http-headers -p 80,443 192.168.1.1

# Robots.txt
nmap --script=http-robots.txt -p 80 192.168.1.1

# Перечисление директорий
nmap --script=http-enum -p 80,443 192.168.1.1

# Поиск методов HTTP
nmap --script=http-methods -p 80,443 192.168.1.1

# Проверка CORS
nmap --script=http-cors -p 80,443 192.168.1.1

# SQL-инъекция
nmap --script=http-sql-injection -p 80,443 192.168.1.1

# XSS в формах
nmap --script=http-unsafe-output-escaping -p 80 192.168.1.1

# Shellshock (CVE-2014-6271)
nmap --script=http-shellshock -p 80 --script-args="uri=/cgi-bin/test.cgi" 192.168.1.1

# Heartbleed (CVE-2014-0160)
nmap --script=ssl-heartbleed -p 443 192.168.1.1

# === SMB-скрипты ===

# Уязвимость EternalBlue/MS17-010
nmap --script=smb-vuln-ms17-010 -p 445 192.168.1.1

# Перечисление пользователей SMB
nmap --script=smb-enum-users -p 445 192.168.1.1

# Перечисление шар (shares)
nmap --script=smb-enum-shares -p 445 192.168.1.1

# Проверка подписи SMB
nmap --script=smb-security-mode -p 445 192.168.1.1

# === SSH-скрипты ===

# Алгоритмы SSH
nmap --script=ssh2-enum-algos -p 22 192.168.1.1

# Информация об SSH
nmap --script=ssh-hostkey -p 22 192.168.1.1

# === SSL/TLS скрипты ===

# Анализ SSL
nmap --script=ssl-enum-ciphers -p 443 192.168.1.1

# Проверка сертификата
nmap --script=ssl-cert -p 443 192.168.1.1

# POODLE, BEAST и другие SSL-уязвимости
nmap --script=ssl-poodle -p 443 192.168.1.1
nmap --script=ssl-dh-params -p 443 192.168.1.1

# === DNS-скрипты ===

# Перечисление DNS
nmap --script=dns-brute --script-args="dns-brute.domain=example.com"

# Передача зоны
nmap --script=dns-zone-transfer --script-args="dns-srv=ns1.example.com" 192.168.1.1

# === FTP-скрипты ===

# Анонимный FTP
nmap --script=ftp-anon -p 21 192.168.1.1

# Брутфорс FTP
nmap --script=ftp-brute -p 21 192.168.1.1

# Уязвимость vsftpd backdoor
nmap --script=ftp-vsftpd-backdoor -p 21 192.168.1.1
```

### Комплексные профили сканирования

```bash
# Профиль 1: Быстрое обнаружение
sudo nmap -sS -T4 --top-ports 1000 192.168.1.0/24

# Профиль 2: Полное веб-сканирование
sudo nmap -sS -sV -sC -p 80,443,8080,8443,8888 192.168.1.1

# Профиль 3: Комплексный пентест-скан
sudo nmap -sS -sV -sC -O -A --script=vuln 192.168.1.1

# Профиль 4: Скрытное медленное сканирование
sudo nmap -sS -T1 -p- --data-length 25 -D RND:5 192.168.1.1

# Профиль 5: Только UDP (медленно!)
sudo nmap -sU --top-ports 200 192.168.1.1

# Профиль 6: Full scan с сохранением
sudo nmap -sS -sV -sC -O -p- --min-rate 1000 -oA full_scan 192.168.1.1
```

### Форматы вывода Nmap

```bash
# Нормальный вывод (текст)
nmap -oN result.txt 192.168.1.1

# Grepable вывод
nmap -oG result.gnmap 192.168.1.1

# XML вывод
nmap -oX result.xml 192.168.1.1

# Все форматы одновременно
nmap -oA result 192.168.1.1
# Создаёт: result.nmap, result.gnmap, result.xml

# Анализ XML с помощью nmap-parse-output
pip3 install nmap-parse-output
nmap-parse-output result.xml http-title
nmap-parse-output result.xml product-version

# Анализ grepable вывода
grep "open" result.gnmap
grep "22/open" result.gnmap | awk '{print $2}'

# Использование ndiff для сравнения сканирований
ndiff result1.xml result2.xml
```

---

## 12.2.3 Уклонение от IDS/IPS

IDS (Intrusion Detection System) может обнаружить активное сканирование. Nmap предоставляет несколько техник уклонения:

### Fragmentation (Фрагментация пакетов)

```bash
# Фрагментация IP-пакетов на 8-байтные фрагменты
sudo nmap -f 192.168.1.1

# Большие фрагменты (16 байт)
sudo nmap -ff 192.168.1.1

# Минимальный размер MTU
sudo nmap --mtu 24 192.168.1.1
```

### Decoy Scan (Ложные источники)

```bash
# Использование ложных IP-адресов
sudo nmap -D RND:5 192.168.1.1  # 5 случайных ложных IP

# Конкретные ложные IP
sudo nmap -D 10.0.0.1,10.0.0.2,10.0.0.3 192.168.1.1

# С подстановкой нашего реального IP на определённую позицию
sudo nmap -D 10.0.0.1,ME,10.0.0.2 192.168.1.1
```

### Source IP и Port Spoofing

```bash
# Изменение исходного порта (выглядит как легитимный трафик)
sudo nmap --source-port 53 192.168.1.1
sudo nmap --source-port 80 192.168.1.1

# Изменение исходного IP (требует, что пакеты могут уйти)
sudo nmap -S 10.0.0.5 -e eth0 192.168.1.1

# Изменение MAC-адреса
sudo nmap --spoof-mac Apple 192.168.1.1
sudo nmap --spoof-mac 0 192.168.1.1  # Случайный MAC
```

### Изменение данных пакетов

```bash
# Добавление случайных данных в пакеты
sudo nmap --data-length 100 192.168.1.1

# Изменение TTL
sudo nmap --ttl 64 192.168.1.1

# Случайный порядок хостов
nmap --randomize-hosts 192.168.1.0/24

# Медленное сканирование
sudo nmap -T0 192.168.1.1  # Максимальная скрытность
```

### Idle/Zombie Scan

```bash
# Сканирование через промежуточный хост (zombie)
# Требует хост с предсказуемым IP ID
sudo nmap -sI zombie_ip 192.168.1.1

# Нахождение подходящего zombie-хоста
sudo nmap -O --script=ipidseq 192.168.1.0/24
```

---

## 12.2.4 Nikto — сканер веб-уязвимостей

Nikto — открытый инструмент для сканирования веб-серверов на предмет:
- Опасных файлов и CGI
- Устаревших версий программного обеспечения
- Неправильных настроек сервера
- Известных уязвимостей

```bash
# Установка
apt-get install nikto
# или
git clone https://github.com/sullo/nikto
cd nikto/program && perl nikto.pl

# Базовое сканирование
nikto -h 192.168.1.1
nikto -h http://example.com

# Сканирование HTTPS
nikto -h https://example.com

# Сканирование с конкретным портом
nikto -h 192.168.1.1 -p 8080

# Несколько портов
nikto -h 192.168.1.1 -p 80,443,8080

# Сканирование через прокси
nikto -h example.com -useproxy http://127.0.0.1:8080

# Аутентификация
nikto -h example.com -id admin:password

# Сохранение результатов
nikto -h example.com -o result.html -Format html
nikto -h example.com -o result.xml -Format xml
nikto -h example.com -o result.csv -Format csv

# Эвазия IDS
nikto -h example.com -evasion 1  # Random URI encoding
nikto -h example.com -evasion 2  # Directory self-reference
nikto -h example.com -evasion 3  # Premature URL ending
nikto -h example.com -evasion 4  # Long random string
nikto -h example.com -evasion 8  # Tab as request spacer
nikto -h example.com -evasion 12345678  # Все методы

# Только конкретные тесты
nikto -h example.com -Tuning 1  # Interesting File / Seen in logs
nikto -h example.com -Tuning 2  # Misconfiguration
nikto -h example.com -Tuning 3  # Information Disclosure
nikto -h example.com -Tuning 4  # Injection (XSS/Script/HTML)
nikto -h example.com -Tuning 5  # Remote File Retrieval
nikto -h example.com -Tuning 6  # Denial of Service
nikto -h example.com -Tuning 7  # Remote File Retrieval (Server wide)
nikto -h example.com -Tuning 8  # Command Execution
nikto -h example.com -Tuning 9  # SQL Injection
nikto -h example.com -Tuning 0  # File Upload

# Обновление базы данных
nikto -update
```

**Пример вывода Nikto:**

```
- Nikto v2.1.6
---------------------------------------------------------------------------
+ Target IP:          192.168.1.1
+ Target Hostname:    example.com
+ Target Port:        80
+ Start Time:         2024-01-15 12:00:00 (GMT0)
---------------------------------------------------------------------------
+ Server: Apache/2.4.41 (Ubuntu)
+ The anti-clickjacking X-Frame-Options header is not present.
+ The X-XSS-Protection header is not defined.
+ The X-Content-Type-Options header is not set.
+ No CGI Directories found
+ Apache/2.4.41 appears to be outdated (current is at least Apache/2.4.54).
+ Web Server returns a valid response with junk HTTP methods.
+ OSVDB-3268: /admin/: Directory indexing found.
+ OSVDB-3092: /admin/: This might be interesting...
+ OSVDB-3268: /backup/: Directory indexing found.
+ OSVDB-3092: /backup/: This might be interesting...
+ /config.php: PHP Config file may contain database IDs and passwords.
+ OSVDB-3233: /phpinfo.php: PHP is installed, and a test script exists.
+ 8135 requests: 0 error(s) and 12 item(s) reported on remote host
```

---

## 12.2.5 Nuclei — сканер на основе шаблонов

Nuclei — быстрый и настраиваемый сканер уязвимостей, работающий на основе шаблонов YAML. Это современная альтернатива Nikto с поддержкой тысяч актуальных шаблонов.

### Установка и настройка

```bash
# Установка через Go
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Установка через apt
apt install nuclei

# Загрузка/обновление шаблонов
nuclei -ut  # update templates

# Проверка шаблонов
nuclei -tl  # list templates
```

### Базовое использование

```bash
# Сканирование одного хоста
nuclei -u https://example.com

# Сканирование списка хостов
nuclei -l targets.txt

# Сканирование с конкретным шаблоном
nuclei -u https://example.com -t templates/cves/2021/CVE-2021-44228.yaml

# Сканирование с категорией шаблонов
nuclei -u https://example.com -t templates/cves/
nuclei -u https://example.com -t templates/vulnerabilities/
nuclei -u https://example.com -t templates/exposures/

# По тегам
nuclei -u https://example.com -tags rce
nuclei -u https://example.com -tags sqli
nuclei -u https://example.com -tags xss
nuclei -u https://example.com -tags lfi
nuclei -u https://example.com -tags ssrf

# По серьёзности
nuclei -u https://example.com -severity critical
nuclei -u https://example.com -severity critical,high
nuclei -u https://example.com -severity medium,high,critical

# Параллельные запросы
nuclei -u https://example.com -c 25  # 25 параллельных запросов
nuclei -u https://example.com -rate-limit 100  # 100 запросов в секунду
```

### Популярные шаблоны Nuclei

```bash
# === CVE-шаблоны ===

# Log4Shell (CVE-2021-44228)
nuclei -u https://example.com -t templates/cves/2021/CVE-2021-44228.yaml

# ProxyLogon (CVE-2021-26855)
nuclei -u https://example.com -t templates/cves/2021/CVE-2021-26855.yaml

# Spring4Shell (CVE-2022-22965)
nuclei -u https://example.com -t templates/cves/2022/CVE-2022-22965.yaml

# === Технологические шаблоны ===

# WordPress-уязвимости
nuclei -u https://example.com -t templates/vulnerabilities/wordpress/

# Apache Struts
nuclei -u https://example.com -t templates/vulnerabilities/apache/

# Laravel уязвимости
nuclei -u https://example.com -tags laravel

# === Конфигурационные ошибки ===

# Открытые директории
nuclei -u https://example.com -t templates/exposures/

# Панели управления
nuclei -u https://example.com -tags panel

# Открытые API
nuclei -u https://example.com -tags api

# Файлы конфигурации
nuclei -u https://example.com -tags config

# Default credentials
nuclei -u https://example.com -tags default-login
```

### Создание собственного шаблона Nuclei

```yaml
# Пример шаблона для обнаружения открытой phpMyAdmin
id: phpmyadmin-detect

info:
  name: phpMyAdmin Panel Detection
  author: pentester
  severity: info
  description: |
    Обнаружена открытая панель phpMyAdmin.
    Стандартная установка phpMyAdmin может быть
    уязвима к атакам брутфорса и известным CVE.
  tags: panel,phpmyadmin,detect

requests:
  - method: GET
    path:
      - "{{BaseURL}}/phpmyadmin/"
      - "{{BaseURL}}/phpMyAdmin/"
      - "{{BaseURL}}/pma/"
      - "{{BaseURL}}/admin/phpmyadmin/"

    matchers-condition: and
    matchers:
      - type: word
        words:
          - "phpMyAdmin"
          - "pma_"
        condition: or
        part: body

      - type: status
        status:
          - 200
```

```yaml
# Шаблон для поиска SQL-ошибок
id: sql-error-detection

info:
  name: SQL Error Detection
  author: pentester
  severity: medium
  description: Обнаружены SQL-ошибки в ответе сервера
  tags: sqli,error

requests:
  - method: GET
    path:
      - "{{BaseURL}}/?id=1'"
      - "{{BaseURL}}/?id=1\""

    matchers-condition: or
    matchers:
      - type: word
        words:
          - "SQL syntax"
          - "mysql_fetch"
          - "ORA-00933"
          - "Microsoft OLE DB Provider for SQL Server"
          - "Unclosed quotation mark"
          - "PostgreSQL query failed"
        part: body
        case-insensitive: true
```

```yaml
# Шаблон для проверки LFI
id: lfi-detection

info:
  name: Local File Inclusion Detection
  author: pentester
  severity: high
  tags: lfi

requests:
  - method: GET
    path:
      - "{{BaseURL}}/?page=../../../../etc/passwd"
      - "{{BaseURL}}/?file=../../../../etc/passwd"
      - "{{BaseURL}}/?include=../../../../etc/passwd"
      - "{{BaseURL}}/?path=../../../../etc/passwd"

    matchers:
      - type: regex
        regex:
          - "root:.*:0:0:"
        part: body
```

### Nuclei для массового сканирования

```bash
# Сбор URL из нескольких источников и сканирование
subfinder -d example.com -silent | httpx -silent | nuclei -tags cve

# Комплексный пайплайн разведки и сканирования
echo "example.com" | \
    subfinder -silent | \
    dnsx -silent | \
    httpx -silent | \
    nuclei -t templates/ -o results.txt

# Параллельное сканирование множества целей
cat targets.txt | nuclei -c 50 -rate-limit 500 -o nuclei_results.txt

# Только критические и высокие уязвимости
nuclei -l targets.txt -severity critical,high -o critical_vulns.txt

# Исключение шаблонов
nuclei -u https://example.com -exclude-tags dos,fuzzer

# JSON-вывод для обработки
nuclei -u https://example.com -json -o results.json
cat results.json | jq '.info.severity, .host, .matched-at'
```

---

## 12.2.6 Дополнительные инструменты активного сканирования

### WhatWeb — определение технологий

```bash
# Установка
gem install whatweb

# Базовое использование
whatweb https://example.com

# Агрессивный режим
whatweb -a 3 https://example.com

# Список хостов
whatweb -i targets.txt

# JSON вывод
whatweb --log-json=output.json https://example.com

# Пример вывода:
# https://example.com [200 OK]
# Apache[2.4.41], Bootstrap[4.5.2], JQuery[3.5.1],
# PHP[7.4.3], WordPress[5.8.1], Country[US]
```

### HTTPx — проверка веб-серверов

```bash
# Установка
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest

# Базовое использование
echo "example.com" | httpx

# Множество хостов
cat subdomains.txt | httpx

# Вывод с кодами статуса, заголовками, технологиями
cat subdomains.txt | httpx -status-code -title -tech-detect -web-server

# Скриншоты
cat subdomains.txt | httpx -screenshot

# Только живые серверы (200 OK)
cat subdomains.txt | httpx -mc 200

# Пример вывода:
# https://example.com [200] [Example Domain] [Apache/2.4.41]
# https://api.example.com [200] [API Gateway] [nginx/1.18.0]
# https://dev.example.com [401] [Unauthorized]
```

### Masscan — быстрое сканирование портов

```bash
# Установка
apt-get install masscan

# Сканирование всего интернета (только для исследований!)
# sudo masscan 0.0.0.0/0 -p80 --rate=1000000

# Сканирование подсети
sudo masscan 192.168.1.0/24 -p80,443,22,8080 --rate=10000

# Все порты
sudo masscan 192.168.1.1 -p0-65535 --rate=1000

# Вывод в файл
sudo masscan 192.168.1.0/24 -p80,443 --rate=1000 -oL results.txt

# Конвертация для Nmap
sudo masscan 192.168.1.0/24 -p80,443 --rate=1000 -oX masscan.xml
# Затем дополнительное сканирование Nmap
nmap -sV -iL <(grep 'host addr' masscan.xml | awk '{print $2}')
```

---

## 12.2.7 Практический пример: комплексное сканирование

```bash
#!/bin/bash
# Комплексный скрипт активного сканирования
# ИСПОЛЬЗОВАТЬ ТОЛЬКО ДЛЯ АВТОРИЗОВАННЫХ ЦЕЛЕЙ!

TARGET=$1
OUTPUT_DIR="scan_${TARGET}_$(date +%Y%m%d_%H%M%S)"

if [ -z "$TARGET" ]; then
    echo "Использование: $0 <target-ip-or-domain>"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"
echo "[*] Результаты сохраняются в $OUTPUT_DIR"

# 1. Быстрое обнаружение открытых портов
echo "[1/5] Быстрое сканирование портов..."
sudo nmap -sS -T4 --top-ports 1000 "$TARGET" -oN "$OUTPUT_DIR/quick_scan.txt" \
         -oX "$OUTPUT_DIR/quick_scan.xml" 2>/dev/null

# Извлечение открытых портов
OPEN_PORTS=$(grep "open" "$OUTPUT_DIR/quick_scan.txt" | \
    awk '{print $1}' | cut -d'/' -f1 | tr '\n' ',' | sed 's/,$//')
echo "[*] Открытые порты: $OPEN_PORTS"

# 2. Детальное сканирование открытых портов
if [ -n "$OPEN_PORTS" ]; then
    echo "[2/5] Детальное сканирование версий..."
    sudo nmap -sS -sV -sC -O -p "$OPEN_PORTS" "$TARGET" \
         -oN "$OUTPUT_DIR/detailed_scan.txt" \
         -oX "$OUTPUT_DIR/detailed_scan.xml" 2>/dev/null
fi

# 3. Скан уязвимостей (только если есть веб)
WEB_PORTS=$(echo "$OPEN_PORTS" | tr ',' '\n' | grep -E "^(80|443|8080|8443)$")
if [ -n "$WEB_PORTS" ]; then
    echo "[3/5] Сканирование веб-уязвимостей..."
    
    # Определяем протокол
    if echo "$OPEN_PORTS" | grep -q "443"; then
        PROTO="https"
    else
        PROTO="http"
    fi
    
    # Nikto
    nikto -h "$PROTO://$TARGET" -o "$OUTPUT_DIR/nikto.html" -Format html 2>/dev/null
    
    # Nuclei (если установлен)
    if command -v nuclei &> /dev/null; then
        nuclei -u "$PROTO://$TARGET" \
               -severity medium,high,critical \
               -o "$OUTPUT_DIR/nuclei.txt" 2>/dev/null
    fi
fi

# 4. NSE скрипты для обнаруженных сервисов
echo "[4/5] Запуск NSE-скриптов..."
sudo nmap --script=vuln -p "$OPEN_PORTS" "$TARGET" \
     -oN "$OUTPUT_DIR/vuln_scan.txt" 2>/dev/null

# 5. Генерация сводки
echo "[5/5] Генерация отчёта..."
cat > "$OUTPUT_DIR/summary.txt" << SUMMARY
========================================
ОТЧЁТ О СКАНИРОВАНИИ
========================================
Цель: $TARGET
Дата: $(date)
========================================

ОТКРЫТЫЕ ПОРТЫ:
$(grep "open" "$OUTPUT_DIR/quick_scan.txt" | grep -v "#")

ДЕТЕКТИРОВАННЫЕ УЯЗВИМОСТИ:
$(grep "VULNERABLE\|CRITICAL\|HIGH" "$OUTPUT_DIR/vuln_scan.txt" 2>/dev/null || echo "Не найдено")

РЕЗУЛЬТАТЫ NIKTO:
$(grep "OSVDB\|CVE\|vulnerable" "$OUTPUT_DIR/nikto.html" 2>/dev/null | head -20 || echo "Смотрите nikto.html")
========================================
SUMMARY

echo "[*] Сканирование завершено. Результаты в $OUTPUT_DIR/"
echo "[*] Файлы:"
ls -la "$OUTPUT_DIR/"
```

---

## Итоги главы

В этой главе мы изучили:

- **Nmap** — основные типы сканирования (-sS, -sV, -sC, -O, -A) и их применение
- **NSE-скрипты** — расширение возможностей Nmap для обнаружения уязвимостей
- **Управление скоростью** — балансирование между скоростью и незаметностью
- **Уклонение от IDS** — фрагментация, ложные источники, манипуляции с пакетами
- **Nikto** — автоматическое обнаружение веб-уязвимостей
- **Nuclei** — шаблонное сканирование с тысячами актуальных проверок
- **Форматы вывода** — сохранение и анализ результатов сканирования

### Сравнение инструментов

| Инструмент | Скорость | Точность | Обнаруживаемость | Применение          |
|------------|----------|----------|------------------|---------------------|
| Nmap -sS   | Средняя  | Высокая  | Средняя          | Сканирование портов |
| Nmap -T1   | Низкая   | Высокая  | Низкая           | Скрытое сканирование|
| Nikto      | Медленная| Средняя  | Высокая          | Веб-серверы         |
| Nuclei     | Высокая  | Высокая  | Средняя          | CVE, конфигурации   |
| Masscan    | Очень высокая | Низкая | Очень высокая | Быстрое обнаружение |

---

## Практические задания

### Задание 1: Nmap на учебных системах
Используя HackTheBox Starting Point или TryHackMe, выполните:
- SYN-сканирование всех портов
- Определение версий сервисов
- Запуск всех скриптов категории `vuln`
- Сравните результаты `-T4` и `-T1`

### Задание 2: NSE-скрипты
На учебной системе Metasploitable2 (VirtualBox):
- Найдите все открытые порты
- Запустите скрипты `smb-vuln-*`
- Проверьте FTP на анонимный доступ
- Выполните перечисление SMB

### Задание 3: Создание шаблона Nuclei
Создайте шаблон для обнаружения:
- Открытого `.git`-репозитория
- Файла `.env` с паролями
- Страницы `/phpinfo.php`

### Задание 4: Комплексное сканирование
Разверните учебную среду (например, DVWA в Docker):
```bash
docker run -d -p 80:80 vulnerables/web-dvwa
```
Выполните полное сканирование:
- Nmap для открытых портов
- Nikto для веб-уязвимостей  
- Nuclei с шаблонами
- Составьте отчёт с приоритизацией находок

### Задание 5: Автоматизация и отчётность
Напишите скрипт, который:
- Принимает IP/домен и список портов
- Автоматически определяет веб-сервисы
- Запускает Nikto и Nuclei для веб-портов
- Генерирует HTML-отчёт с результатами

