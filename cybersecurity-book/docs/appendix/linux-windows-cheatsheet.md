# Шпаргалка: Linux и Windows команды

> Быстрый справочник по командам для SOC-аналитика и пентестера

---

## Linux команды

### Навигация и файлы

```bash
# Навигация
pwd                          # Текущая директория
ls -la                       # Список файлов (включая скрытые)
ls -lh                       # С читаемыми размерами
cd /path/to/dir              # Перейти в директорию
cd -                         # Предыдущая директория
cd ~                         # Домашняя директория

# Работа с файлами
cp source dest               # Копировать
cp -r dir1 dir2              # Копировать директорию рекурсивно
mv source dest               # Переместить/переименовать
rm file                      # Удалить файл
rm -rf dir                   # Удалить директорию рекурсивно (ОСТОРОЖНО!)
mkdir -p /a/b/c              # Создать директории рекурсивно
touch file.txt               # Создать файл / обновить время

# Поиск файлов
find / -name "*.php" 2>/dev/null    # Найти файлы по имени
find / -type f -mtime -1            # Изменённые за 24 часа
find / -perm -4000 2>/dev/null      # SUID файлы
find / -user root -perm -4000       # SUID принадлежащие root
find /var/log -name "*.log" -size +10M  # Большие логи

# Просмотр файлов
cat file.txt                 # Вывод файла
cat -n file.txt              # С номерами строк
head -n 50 file.txt          # Первые 50 строк
tail -n 100 file.txt         # Последние 100 строк
tail -f /var/log/auth.log    # Realtime следить за логом
less file.txt                # Постраничный просмотр
wc -l file.txt               # Количество строк
```

### Поиск в файлах (grep)

```bash
grep "error" file.txt                    # Поиск в файле
grep -r "password" /etc/                 # Рекурсивный поиск
grep -i "ERROR" file.txt                 # Без учёта регистра
grep -n "pattern" file.txt               # С номерами строк
grep -v "DEBUG" file.txt                 # Инвертированный поиск
grep -E "^(Jan|Feb)" file.txt            # Regex
grep -A 3 -B 3 "error" file.txt         # 3 строки до/после
grep -c "pattern" file.txt               # Количество совпадений
grep -l "pattern" *.log                  # Только имена файлов
grep "Failed password" /var/log/auth.log # Неудачные SSH входы
```

### Обработка текста

```bash
# awk — обработка колонок
awk '{print $1}' file.txt              # Первая колонка
awk -F: '{print $1, $3}' /etc/passwd  # Разделитель : , колонки 1 и 3
awk '{sum += $1} END {print sum}' nums.txt  # Сумма
awk 'NR==10, NR==20' file.txt         # Строки 10-20

# sed — замена
sed 's/old/new/' file.txt             # Заменить первое совпадение
sed 's/old/new/g' file.txt            # Заменить все
sed -i 's/old/new/g' file.txt         # В файле (in-place)
sed -n '10,20p' file.txt              # Напечатать строки 10-20
sed '/pattern/d' file.txt             # Удалить строки с паттерном

# sort и uniq
sort file.txt                         # Сортировка
sort -n numbers.txt                   # Числовая сортировка
sort -rn numbers.txt                  # Обратная числовая
sort -k2 file.txt                     # По второй колонке
sort | uniq                           # Уникальные строки
sort | uniq -c | sort -rn             # Подсчёт + сортировка

# cut
cut -d: -f1 /etc/passwd               # Разделитель :, поле 1
cut -c1-10 file.txt                   # Символы 1-10

# tr — трансформация
tr 'a-z' 'A-Z' < file.txt            # Нижний→Верхний регистр
tr -d '\r' < windows.txt              # Удалить \r (Windows)
echo "text" | tr ' ' '_'             # Заменить пробелы

# xargs — передача аргументов
cat urls.txt | xargs curl             # Curl для каждого URL
find . -name "*.tmp" | xargs rm       # Удалить найденные файлы
```

### Сеть

```bash
# Проверка сети
ip addr / ifconfig                    # Сетевые интерфейсы
ip route / route -n                   # Таблица маршрутизации
ip neigh / arp -a                     # ARP таблица

# Соединения
netstat -tulpn                        # Открытые порты и сервисы
ss -tulpn                             # Современная альтернатива netstat
netstat -an | grep ESTABLISHED        # Активные соединения
ss -s                                 # Статистика сокетов

# DNS
nslookup domain.com                   # DNS запрос
dig domain.com                        # Детальный DNS
dig domain.com MX                     # MX записи
dig domain.com ANY                    # Все записи
host domain.com                       # Простой DNS
dig -x 8.8.8.8                        # Обратный DNS

# HTTP запросы
curl -v URL                           # Детальный запрос
curl -I URL                           # Только заголовки
curl -X POST -d "data" URL            # POST
curl -H "Cookie: session=abc" URL     # С заголовком
curl -u user:pass URL                 # Basic auth
curl -o file.txt URL                  # Сохранить в файл
wget URL                              # Скачать файл
wget -r -l2 URL                       # Рекурсивная загрузка

# Сканирование (для авторизованного тестирования)
nmap -sV -sC -p- target               # Полное сканирование
nmap -sU -p 161 target                # UDP SNMP
nmap --script vuln target             # Скрипты уязвимостей
ping -c 4 target                      # Проверить доступность
traceroute target                     # Трассировка маршрута
```

### Процессы и система

```bash
# Процессы
ps aux                                # Все процессы
ps aux | grep nginx                   # Найти процесс
top / htop                            # Интерактивный мониторинг
pgrep -f "process_name"               # PID по имени
kill PID                              # Завершить процесс (SIGTERM)
kill -9 PID                           # Принудительно завершить
killall process_name                  # По имени

# Системная информация
uname -a                              # Версия ядра и ОС
hostname                              # Имя хоста
whoami                                # Текущий пользователь
id                                    # UID, GID, группы
w                                     # Кто в системе
who                                   # Кто залогинен
last                                  # История входов
lastlog                               # Последний вход каждого юзера
uptime                                # Время работы

# Диск
df -h                                 # Использование дисков
du -sh /var/log                       # Размер директории
du -sh * | sort -h                    # Самые большие файлы
lsblk                                 # Блочные устройства

# Память
free -h                               # Использование памяти
vmstat                                # Статистика виртуальной памяти

# Открытые файлы
lsof                                  # Все открытые файлы
lsof -i :80                           # Кто использует порт 80
lsof -u username                      # Файлы пользователя
lsof -p PID                           # Файлы процесса
```

### Пользователи и права

```bash
# Пользователи
cat /etc/passwd                       # Список пользователей
cat /etc/shadow                       # Хэши паролей (root)
adduser username                      # Добавить пользователя
usermod -aG sudo username             # Добавить в группу
passwd username                       # Сменить пароль
su - username                         # Переключиться на пользователя
sudo command                          # Выполнить от root
sudo -l                               # Что разрешено через sudo
id username                           # Информация о пользователе

# Права файлов
chmod 755 file                        # rwxr-xr-x
chmod +x script.sh                    # Добавить execute
chmod -r file                         # Убрать read
chown user:group file                 # Сменить владельца
chattr +i file                        # Immutable (нельзя изменить)
lsattr file                           # Просмотр атрибутов

# Числовые права:
# 4=r, 2=w, 1=x
# 7=rwx, 6=rw-, 5=r-x, 4=r--
# Пример: 755 = rwxr-xr-x (owner=7, group=5, other=5)
```

### SSH

```bash
ssh user@host                         # Подключение
ssh -p 2222 user@host                 # Другой порт
ssh -i key.pem user@host              # С ключом
ssh -L 8080:localhost:80 user@host    # Port forwarding (local)
ssh -R 8080:localhost:80 user@host    # Port forwarding (remote)
ssh -D 1080 user@host                 # SOCKS proxy

scp file user@host:/path              # Копировать файл
scp user@host:/path/file .            # Скачать файл
scp -r dir user@host:/path            # Директория

# SSH туннель для пентеста
ssh -L 5432:DB_HOST:5432 user@JUMP_HOST  # Доступ к БД через jump
```

### Логи

```bash
# Основные логи Linux
/var/log/auth.log          # Аутентификация (Debian/Ubuntu)
/var/log/secure            # Аутентификация (RHEL/CentOS)
/var/log/syslog            # Системные события
/var/log/messages          # Общие сообщения
/var/log/kern.log          # Ядро
/var/log/apache2/          # Apache
/var/log/nginx/            # Nginx
/var/log/mysql/            # MySQL
/var/log/cron              # Cron задачи

# Просмотр логов
journalctl -xe                        # Systemd журнал
journalctl -u nginx                   # Логи конкретного сервиса
journalctl --since "1 hour ago"       # За последний час
journalctl -f                         # Realtime

# Команды для SOC
grep "Failed password" /var/log/auth.log  # Неудачные входы
grep "Accepted password" /var/log/auth.log # Успешные входы
grep "sudo" /var/log/auth.log             # Использование sudo
lastb                                  # Неудачные входы (btmp)
```

---

## Windows команды

### PowerShell — основной инструмент

```powershell
# Навигация
Get-Location / pwd                    # Текущая директория
Set-Location "C:\path" / cd          # Смена директории
Get-ChildItem / ls / dir             # Список файлов
Get-ChildItem -Hidden                 # Скрытые файлы
Get-ChildItem -Recurse -Include *.txt # Рекурсивный поиск

# Работа с файлами
Copy-Item src dest / cp              # Копировать
Move-Item src dest / mv              # Переместить
Remove-Item file / rm                # Удалить
New-Item -ItemType Directory name    # Создать директорию
Get-Content file.txt / cat           # Читать файл
Select-String -Path *.log -Pattern "error"  # Grep аналог

# Поиск
Get-ChildItem -Recurse | Where-Object {$_.Name -like "*.config"}
Get-ChildItem C:\ -Recurse -ErrorAction SilentlyContinue |
    Where-Object {$_.LastWriteTime -gt (Get-Date).AddDays(-7)}
```

### Пользователи и права

```powershell
# Локальные пользователи
Get-LocalUser                         # Список пользователей
Get-LocalGroup                        # Группы
Get-LocalGroupMember "Administrators" # Члены группы
whoami                                # Текущий пользователь
whoami /priv                          # Привилегии
whoami /groups                        # Группы

# Active Directory
Get-ADUser -Identity username         # Информация о пользователе
Get-ADGroupMember "Domain Admins"     # Члены группы DA
Get-ADUser -Filter {Enabled -eq $True} # Активные пользователи
Search-ADAccount -LockedOut           # Заблокированные
Disable-ADAccount -Identity user      # Отключить аккаунт

# Локальное управление (net команды)
net user                              # Список пользователей
net user username /add                # Добавить пользователя
net user username /delete             # Удалить
net localgroup administrators         # Администраторы
net localgroup administrators user /add  # Добавить в admins
```

### Сеть

```powershell
# Конфигурация
Get-NetIPAddress                      # IP адреса
Get-NetRoute                          # Маршрутизация
Get-NetAdapter                        # Сетевые адаптеры
ipconfig /all                         # Полная конфигурация
ipconfig /displaydns                  # DNS кэш
ipconfig /flushdns                    # Сбросить DNS кэш

# Соединения
Get-NetTCPConnection                  # TCP соединения
Get-NetTCPConnection -State Listen    # Открытые порты (слушают)
netstat -an                           # Все соединения
netstat -b                            # С именами процессов (Admin)

# Firewall
Get-NetFirewallRule | Where-Object {$_.Enabled -eq 'True'}
New-NetFirewallRule -Name "BlockIP" -Direction Inbound -Action Block -RemoteAddress 1.2.3.4
Get-NetFirewallRule -Name "BlockIP" | Remove-NetFirewallRule

# DNS
Resolve-DnsName domain.com           # DNS запрос
nslookup domain.com                   # Классический nslookup
```

### Процессы и сервисы

```powershell
# Процессы
Get-Process                           # Все процессы
Get-Process -Name "svchost"           # Конкретный процесс
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
Stop-Process -Name "process" -Force   # Завершить процесс
Start-Process "notepad.exe"           # Запустить процесс

# Сервисы
Get-Service                           # Все сервисы
Get-Service -Name "wuauserv"          # Windows Update
Start-Service -Name "wuauserv"        # Запустить
Stop-Service -Name "wuauserv"         # Остановить
Get-Service | Where-Object {$_.Status -eq "Running"}  # Только запущенные
sc.exe query                          # Альтернатива (cmd)

# Задания планировщика
Get-ScheduledTask                     # Все задания
Get-ScheduledTask | Where-Object {$_.State -ne "Disabled"}
Get-ScheduledTaskInfo -TaskName "TaskName"  # Детали
Unregister-ScheduledTask -TaskName "MaliciousTask" -Confirm:$false
```

### Реестр (Registry)

```powershell
# Просмотр
Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
Get-ItemProperty "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"

# Persistence locations (проверяй при расследовании)
# Автозапуск:
HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce
HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce

# Изменение
Set-ItemProperty -Path "HKLM:\..." -Name "Key" -Value "Value"
Remove-ItemProperty -Path "HKLM:\..." -Name "MaliciousKey"
New-Item -Path "HKLM:\SOFTWARE\" -Name "NewKey"

# reg команды (cmd)
reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
reg add HKLM\SOFTWARE\Test /v TestKey /t REG_SZ /d "TestValue"
reg delete HKLM\SOFTWARE\Test /v TestKey /f
reg export HKLM\SOFTWARE\Test backup.reg     # Экспорт
reg import backup.reg                         # Импорт
```

### Event Log (Журнал событий)

```powershell
# Ключевые Event ID для безопасности
# 4624 - Успешный вход
# 4625 - Неудачный вход
# 4648 - Вход с explicit credentials
# 4688 - Создание процесса
# 4698 - Создание Scheduled Task
# 4720 - Создание пользователя
# 4722 - Активация пользователя
# 4728 - Добавление в глобальную группу
# 4732 - Добавление в локальную группу
# 4756 - Добавление в универсальную группу
# 5001 - Изменение настроек Windows Defender
# 7045 - Новый сервис установлен

# Просмотр событий
Get-EventLog -LogName Security -Newest 100
Get-EventLog -LogName Security -InstanceId 4625 -Newest 50  # Неудачные входы
Get-EventLog -LogName Security -After (Get-Date).AddHours(-1)  # За последний час

# Через Get-WinEvent (более мощный)
Get-WinEvent -FilterHashtable @{
    LogName='Security'
    Id=4624
    StartTime=(Get-Date).AddDays(-1)
} | Select-Object TimeCreated, Message | Format-List

# Экспорт
Get-EventLog -LogName Security -Newest 1000 |
    Export-Csv "C:\IR\security_events.csv" -NoTypeInformation

# wevtutil (cmd)
wevtutil qe Security /q:"*[System[(EventID=4625)]]" /c:100 /f:text
wevtutil cl Security    # Очистить лог (!! опасно, только если надо)
```

### Командная строка (CMD)

```batch
:: Навигация
dir /a                          :: Все файлы включая скрытые
dir /s /b *.exe                 :: Рекурсивный поиск

:: Сеть
ipconfig /all
netstat -an
netstat -b
arp -a                          :: ARP таблица
nbtstat -n                      :: NetBIOS

:: Пользователи
net user
net localgroup administrators
net session                     :: Активные сессии

:: Processes
tasklist                        :: Список процессов
tasklist /svc                   :: С сервисами
tasklist /m                     :: С модулями (DLL)
taskkill /PID 1234 /F           :: Завершить процесс

:: Системная информация
systeminfo                      :: Полная информация
systeminfo | findstr "OS"       :: Только ОС
hostname
ver                             :: Версия Windows

:: Поиск
findstr /s "password" *.config  :: Рекурсивный поиск
findstr /r "^Error" logfile.txt :: Regex поиск
```

---

## Полезные комбинации для SOC

### Быстрый анализ Windows системы

```powershell
# SOC Triage Script — запустить при расследовании
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$output_dir = "C:\IR\$timestamp"
New-Item -ItemType Directory -Path $output_dir -Force

# 1. Запущенные процессы
Get-Process | Select-Object Name, Id, CPU, StartTime, Path |
    Export-Csv "$output_dir\processes.csv" -NoTypeInformation

# 2. Сетевые соединения
Get-NetTCPConnection | Select-Object LocalAddress, LocalPort,
    RemoteAddress, RemotePort, State, OwningProcess |
    Export-Csv "$output_dir\network.csv" -NoTypeInformation

# 3. Автозапуск
Get-CimInstance Win32_StartupCommand |
    Export-Csv "$output_dir\startup.csv" -NoTypeInformation

# 4. Запланированные задачи
Get-ScheduledTask | Where-Object {$_.State -ne "Disabled"} |
    Export-Csv "$output_dir\tasks.csv" -NoTypeInformation

# 5. Сервисы
Get-Service | Where-Object {$_.Status -eq "Running"} |
    Export-Csv "$output_dir\services.csv" -NoTypeInformation

# 6. Последние созданные файлы
Get-ChildItem C:\ -Recurse -ErrorAction SilentlyContinue |
    Where-Object {$_.LastWriteTime -gt (Get-Date).AddDays(-7)} |
    Sort-Object LastWriteTime -Descending |
    Select-Object FullName, Length, LastWriteTime |
    Export-Csv "$output_dir\recent_files.csv" -NoTypeInformation

# 7. DNS кэш (C2 индикатор)
Get-DnsClientCache | Export-Csv "$output_dir\dns_cache.csv" -NoTypeInformation

# 8. Run keys (persistence)
$reg_paths = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce"
)
$reg_paths | ForEach-Object {
    Get-ItemProperty $_ -ErrorAction SilentlyContinue
} | Export-Csv "$output_dir\registry_run.csv" -NoTypeInformation

Write-Host "[+] Triage data saved to $output_dir"
```

### Быстрый анализ Linux системы

```bash
#!/bin/bash
# Linux SOC Triage
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT="/tmp/ir_$TIMESTAMP"
mkdir -p "$OUTPUT"

# Собираем артефакты
ps aux > "$OUTPUT/processes.txt"
netstat -anlp > "$OUTPUT/network.txt"
ss -tulpn > "$OUTPUT/sockets.txt"
lsof > "$OUTPUT/open_files.txt"
last > "$OUTPUT/logins.txt"
lastb > "$OUTPUT/failed_logins.txt"
find / -mtime -1 -type f 2>/dev/null > "$OUTPUT/recent_files.txt"
find / -perm -4000 2>/dev/null > "$OUTPUT/suid_files.txt"
for user in $(cut -f1 -d: /etc/passwd); do
    crontab -u $user -l 2>/dev/null && echo "--- $user ---"
done > "$OUTPUT/crontabs.txt"
cat ~/.bash_history > "$OUTPUT/bash_history.txt"
cat /etc/passwd > "$OUTPUT/passwd.txt"
cat /etc/sudoers 2>/dev/null > "$OUTPUT/sudoers.txt"
cat /etc/crontab > "$OUTPUT/crontab.txt"
ls -la /etc/cron* >> "$OUTPUT/crontab.txt"

echo "[+] Linux triage collected in $OUTPUT"
ls -la "$OUTPUT"
```

---

## Шпаргалка по кодированию/декодированию

```bash
# Base64
echo "Hello World" | base64                # Encode
echo "SGVsbG8gV29ybGQ=" | base64 -d        # Decode

# URL encoding
python3 -c "import urllib.parse; print(urllib.parse.quote('Hello World'))"
python3 -c "import urllib.parse; print(urllib.parse.unquote('Hello%20World'))"

# Hex
echo "Hello" | xxd                          # ASCII → Hex
echo -n "Hello" | od -A x -t x1z           # Другой формат
python3 -c "print(bytes.fromhex('48656c6c6f').decode())"  # Hex → ASCII

# MD5/SHA
md5sum file.txt
sha256sum file.txt
echo -n "password" | md5sum                 # Хэш строки
echo -n "password" | sha256sum

# PowerShell Base64
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("Hello"))
[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("SGVsbG8="))
```
