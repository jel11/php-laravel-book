# Глава 2.5: Логи и bash-скрипты для SOC

## 🎯 Цели главы

- Понять структуру и форматы лог-файлов (syslog, JSON, CEF)
- Освоить ключевые лог-файлы Linux и их назначение
- Научиться анализировать `auth.log` для обнаружения атак
- Разобраться с `journalctl` и фильтрацией записей
- Написать bash-скрипты для автоматизации задач SOC-аналитика
- Создать полноценный скрипт мониторинга SSH brute force

---

## 2.5.1 Что такое лог-файл и зачем он нужен

### Лог как первичный источник данных в SOC

Лог-файл (журнал событий) — это хронологическая запись событий, происходящих в системе. Для SOC-аналитика логи — это **главный источник правды**: именно из них узнают о взломе, аномальном поведении или сбое.

```
Без логов = работа вслепую
С логами = доказательства + возможность расследования
```

Что фиксируют логи:
- Попытки входа (успешные и неудачные)
- Запуск и остановку служб
- Изменения конфигурации
- Сетевые соединения
- Ошибки приложений
- Действия пользователей с повышенными привилегиями

### Структура записи syslog

Классическая запись syslog имеет формат RFC 3164:

```
<Priority>Timestamp Hostname Process[PID]: Message
```

Реальный пример из `/var/log/auth.log`:

```
Jan 15 14:23:45 webserver sshd[12345]: Failed password for invalid user admin from 192.168.1.100 port 54321 ssh2
```

Разбор по полям:

| Поле | Значение | Описание |
|------|----------|----------|
| `Jan 15 14:23:45` | Временная метка | Дата и время события |
| `webserver` | Хостнейм | Имя машины-источника |
| `sshd` | Процесс | Программа, сгенерировавшая событие |
| `[12345]` | PID | Идентификатор процесса |
| `Failed password...` | Сообщение | Сам текст события |

### Формат RFC 5424 (современный syslog)

Более структурированный формат с версией протокола:

```
<Priority>Version Timestamp Hostname AppName ProcID MsgID [StructuredData] Message
```

Пример:

```
<34>1 2025-01-15T14:23:45.123Z webserver sshd 12345 - [auth@0 type="ssh" result="fail"] Failed password for admin
```

### JSON-формат логов

Современные приложения и SIEM предпочитают JSON — машиночитаемый формат:

```json
{
  "timestamp": "2025-01-15T14:23:45.123Z",
  "hostname": "webserver",
  "process": "sshd",
  "pid": 12345,
  "severity": "warning",
  "facility": "auth",
  "message": "Failed password for invalid user admin from 192.168.1.100 port 54321 ssh2",
  "src_ip": "192.168.1.100",
  "src_port": 54321,
  "username": "admin",
  "auth_method": "password",
  "result": "failure"
}
```

JSON логи удобны для парсинга (`jq`, Python, Elasticsearch):

```bash
# Парсинг JSON-логов с jq
cat /var/log/app/events.json | jq '.[] | select(.severity == "error") | .message'

# Фильтрация по IP
cat /var/log/app/events.json | jq '.[] | select(.src_ip == "192.168.1.100")'

# Подсчёт событий по типу
cat /var/log/app/events.json | jq '[.[] | .event_type] | group_by(.) | map({type: .[0], count: length})'
```

### Severity Levels (уровни серьёзности)

| Код | Название | Описание | Пример |
|-----|----------|----------|--------|
| 0 | Emergency | Система неработоспособна | Паника ядра |
| 1 | Alert | Немедленное действие | Потеря RAID-массива |
| 2 | Critical | Критические условия | Сбой оборудования |
| 3 | Error | Ошибки | Ошибки приложения |
| 4 | Warning | Предупреждения | Неудачный вход |
| 5 | Notice | Нормальные, но значимые | Старт сервиса |
| 6 | Informational | Информационные | Успешный вход |
| 7 | Debug | Отладочные | Трассировка кода |

```
SOC-фокус: уровни 0-4 требуют внимания аналитика
           уровни 5-7 — фоновые операции
```

### Facility Codes (коды источника)

| Код | Источник | Описание |
|-----|----------|----------|
| 0 | kern | Сообщения ядра |
| 1 | user | Пользовательские процессы |
| 2 | mail | Почтовая система |
| 3 | daemon | Системные демоны |
| 4 | auth | Аутентификация (security) |
| 5 | syslog | Внутренние сообщения syslogd |
| 6 | lpr | Подсистема печати |
| 7 | news | Новостная подсистема |
| 9 | cron | Планировщик задач |
| 10 | authpriv | Приватные сообщения аутентификации |
| 16-23 | local0–local7 | Локальные применения |

Priority (приоритет) вычисляется: `Priority = Facility * 8 + Severity`

```bash
# Пример: auth (4) + warning (4) = 4*8+4 = 36
# Запись: <36>Jan 15 14:23:45 ...
echo "Priority: $((4*8+4))"   # 36
```

---

## 2.5.2 Основные лог-файлы Linux

### Карта лог-файлов Linux

```
/var/log/
├── auth.log          ← SSH, sudo, PAM (ГЛАВНЫЙ для SOC!)
├── syslog            ← Общие системные события
├── kern.log          ← Сообщения ядра
├── dmesg             ← Загрузочные сообщения ядра
├── messages          ← Общие сообщения (RHEL/CentOS)
├── secure            ← Аутентификация (RHEL/CentOS)
├── faillog           ← Неудачные попытки входа
├── lastlog           ← Последний вход каждого пользователя
├── wtmp              ← История входов/выходов (бинарный)
├── btmp              ← Неудачные попытки входа (бинарный)
├── cron              ← Выполнение cron-задач
├── mail.log          ← Почтовый сервер
├── dpkg.log          ← Установка/удаление пакетов (Debian)
├── apt/
│   ├── history.log   ← История apt-операций
│   └── term.log      ← Вывод терминала apt
├── apache2/
│   ├── access.log    ← HTTP-запросы
│   └── error.log     ← Ошибки веб-сервера
├── nginx/
│   ├── access.log
│   └── error.log
└── mysql/
    ├── error.log
    └── slow.log      ← Медленные запросы
```

### /var/log/auth.log — главный лог для SOC

Содержит все события аутентификации: SSH, sudo, su, PAM.

```bash
# Просмотр последних 50 строк
tail -50 /var/log/auth.log

# Непрерывный мониторинг в реальном времени
tail -f /var/log/auth.log

# Поиск неудачных входов
grep "Failed password" /var/log/auth.log

# Поиск успешных входов
grep "Accepted" /var/log/auth.log

# Поиск действий sudo
grep "sudo" /var/log/auth.log

# Поиск конкретного пользователя
grep "user alice" /var/log/auth.log

# Количество неудачных попыток по IP
grep "Failed password" /var/log/auth.log | \
    awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head -20
```

Типовые записи `auth.log`:

```
# Успешный SSH-вход по паролю
Jan 15 10:00:01 server sshd[1234]: Accepted password for alice from 10.0.0.5 port 49152 ssh2

# Успешный SSH-вход по ключу
Jan 15 10:00:02 server sshd[1235]: Accepted publickey for bob from 10.0.0.6 port 49153 ssh2

# Неудачный вход — неверный пароль
Jan 15 10:01:15 server sshd[1240]: Failed password for root from 192.168.100.50 port 22 ssh2

# Неудачный вход — несуществующий пользователь
Jan 15 10:01:16 server sshd[1241]: Failed password for invalid user admin from 192.168.100.50 port 23 ssh2

# Разрыв соединения до аутентификации
Jan 15 10:01:17 server sshd[1242]: Disconnected from invalid user test 192.168.100.50 port 24 [preauth]

# Превышение попыток аутентификации
Jan 15 10:01:18 server sshd[1243]: error: maximum authentication attempts exceeded for root from 192.168.100.50 port 25 ssh2

# Sudo-команда
Jan 15 10:05:00 server sudo[2000]: alice : TTY=pts/0 ; PWD=/home/alice ; USER=root ; COMMAND=/usr/bin/apt update

# Успешная аутентификация через sudo
Jan 15 10:05:01 server sudo[2000]: pam_unix(sudo:session): session opened for user root by alice(uid=0)

# Закрытие sudo-сессии
Jan 15 10:05:03 server sudo[2000]: pam_unix(sudo:session): session closed for user root

# Попытка неавторизованного sudo
Jan 15 10:06:00 server sudo[2100]: mallory : user NOT in sudoers ; TTY=pts/1 ; PWD=/home/mallory ; USER=root ; COMMAND=/bin/bash

# Смена пользователя через su
Jan 15 10:10:00 server su[3000]: Successful su for root by alice
Jan 15 10:10:01 server su[3000]: + /dev/pts/0 alice:root
```

### /var/log/syslog — общий системный журнал

```bash
# Просмотр свежих записей
tail -100 /var/log/syslog

# Поиск по ключевому слову
grep -i "error\|fail\|critical" /var/log/syslog | tail -30

# Сообщения конкретного процесса
grep "kernel" /var/log/syslog | tail -20
grep "cron" /var/log/syslog | grep -v "CMD"

# Временной диапазон (grep по дате)
grep "Jan 15 10:" /var/log/syslog

# Мониторинг в реальном времени с подсветкой
tail -f /var/log/syslog | grep --color=auto -E "error|fail|warn|CRITICAL"
```

### /var/log/kern.log — сообщения ядра

```bash
# Просмотр последних сообщений ядра
dmesg | tail -30
dmesg -T | tail -30          # С человекочитаемым временем
dmesg --level err,crit       # Только ошибки и критические

# Обнаружение USB-устройств (подозрительные подключения)
dmesg | grep -i "usb\|storage\|disk"

# Ошибки файловой системы
grep "EXT4-fs error\|filesystem error" /var/log/kern.log

# OOM killer (нехватка памяти) — может быть признаком атаки
grep "Out of memory\|Killed process" /var/log/kern.log
```

### /var/log/apache2/ — веб-сервер

```bash
# Формат Apache access.log (Combined Log Format)
# IP - user [time] "request" status size "referer" "user-agent"
# 192.168.1.1 - - [15/Jan/2025:10:23:45 +0000] "GET /admin HTTP/1.1" 200 1234 "-" "Mozilla/5.0..."

# Топ IP-адресов
awk '{print $1}' /var/log/apache2/access.log | sort | uniq -c | sort -rn | head -20

# Запросы с ошибкой 4xx (клиентские ошибки)
awk '$9 ~ /^4/' /var/log/apache2/access.log | tail -30

# Попытки обращения к чувствительным путям
grep -E "/wp-admin|/.env|/phpmyadmin|/etc/passwd|/shell" /var/log/apache2/access.log

# Поиск SQL-инъекций в URL
grep -i "union.*select\|1=1\|or.*=.*\|--.*$" /var/log/apache2/access.log

# Поиск XSS
grep -i "<script\|javascript:\|onerror=" /var/log/apache2/access.log

# Топ User-Agent'ов (боты, сканеры)
awk -F'"' '{print $6}' /var/log/apache2/access.log | sort | uniq -c | sort -rn | head -10
```

### Бинарные лог-файлы: wtmp, btmp, lastlog

```bash
# wtmp — история входов/выходов (бинарный формат)
last                          # Показать все входы
last -20                      # Последние 20 входов
last alice                    # Входы пользователя alice
last reboot                   # История перезагрузок
last -F                       # Полные временные метки

# btmp — неудачные попытки входа (бинарный)
lastb                         # Все неудачные попытки
lastb -10                     # Последние 10 неудач
sudo lastb | awk '{print $3}' | sort | uniq -c | sort -rn | head  # Топ IP

# lastlog — время последнего входа каждого пользователя
lastlog                       # Все пользователи
lastlog -u alice              # Конкретный пользователь
lastlog -b 7                  # Не входили более 7 дней
lastlog -t 1                  # Входили за последний день

# Кто сейчас в системе
who
w                             # Расширенная информация
```

---

## 2.5.3 rsyslog: конфигурация и управление

### Архитектура rsyslog

```
Приложения → rsyslog daemon → Назначения
               ↓
        /etc/rsyslog.conf
        /etc/rsyslog.d/*.conf
               ↓
    ┌──────────┬──────────────┐
    ↓          ↓              ↓
/var/log/  Удалённый       База данных
 файлы      сервер         (MySQL)
```

### Синтаксис правил rsyslog

```bash
# /etc/rsyslog.conf

# Формат: facility.severity   назначение
# Точка разделяет facility и severity

# Записывать все сообщения auth в auth.log
auth,authpriv.*              /var/log/auth.log

# Все сообщения severity>=warning в syslog
*.warn                       /var/log/syslog

# Сообщения ядра
kern.*                       /var/log/kern.log

# Критические ошибки — на консоль
*.crit                       /dev/console

# Игнорировать (знак минус = нет действия)
mail.none                    /var/log/syslog

# Отправить на удалённый syslog-сервер (UDP)
*.* @192.168.1.200:514

# Отправить на удалённый сyslog-сервер (TCP - надёжнее)
*.* @@192.168.1.200:514

# Использовать шаблон для имени файла (ротация по дате)
$template DailyLog,"/var/log/daily/%$YEAR%-%$MONTH%-%$DAY%/syslog"
*.* ?DailyLog
```

### Управление rsyslog

```bash
# Статус
systemctl status rsyslog

# Перезапуск после изменения конфигурации
systemctl restart rsyslog

# Проверка конфигурации
rsyslogd -N1     # Проверить без запуска

# Тестовая отправка сообщения
logger "Test message from SOC analyst"
logger -p auth.warning "Suspicious login attempt detected"
logger -p kern.err "Test kernel error message"

# Проверить, что сообщение попало в лог
tail -5 /var/log/syslog
tail -5 /var/log/auth.log
```

---

## 2.5.4 journalctl: системный журнал systemd

### Основы работы с journalctl

`journalctl` — интерфейс к системному журналу `systemd-journald`. Хранит логи в бинарном формате с индексацией, что делает поиск быстрым.

```bash
# Показать все записи журнала
journalctl

# Последние N строк
journalctl -n 50

# Непрерывный мониторинг (аналог tail -f)
journalctl -f

# Записи с момента последней загрузки
journalctl -b

# Записи предыдущей загрузки
journalctl -b -1

# Список всех загрузок
journalctl --list-boots
```

### Фильтрация journalctl

```bash
# По юниту systemd
journalctl -u ssh
journalctl -u nginx
journalctl -u apache2
journalctl -u cron

# По нескольким юнитам
journalctl -u ssh -u nginx

# По приоритету (severity)
journalctl -p err              # Только ошибки и выше
journalctl -p warning          # Warning и выше
journalctl -p 0..3             # Emergency до Error

# По временному диапазону
journalctl --since "2025-01-15 10:00:00"
journalctl --since "2025-01-15 10:00:00" --until "2025-01-15 12:00:00"
journalctl --since "1 hour ago"
journalctl --since "yesterday"
journalctl --since today

# По процессу (PID)
journalctl _PID=1234

# По исполняемому файлу
journalctl _EXE=/usr/sbin/sshd

# По пользователю UID
journalctl _UID=1000

# По ключевому слову (grep)
journalctl | grep "Failed password"

# Комбинирование фильтров
journalctl -u ssh --since "1 hour ago" -p warning

# Вывод в JSON (для парсинга)
journalctl -u ssh -o json | head -5

# Вывод в JSON, по одной записи на строку
journalctl -u ssh -o json-pretty | jq '.MESSAGE' | head -20

# Краткий формат без имени хоста
journalctl -u ssh -o short-monotonic

# Показать только поля без форматирования (для скриптов)
journalctl -u ssh --output=cat | head -20
```

### Полезные комбинации для SOC

```bash
# Все неудачные SSH-входы за последний час
journalctl -u ssh --since "1 hour ago" | grep "Failed password"

# Статистика auth-событий по часам
journalctl -u ssh --since "24 hours ago" -o json | \
    python3 -c "
import sys, json
from collections import Counter
hours = Counter()
for line in sys.stdin:
    try:
        entry = json.loads(line)
        ts = entry.get('__REALTIME_TIMESTAMP','')
        if ts:
            import datetime
            dt = datetime.datetime.fromtimestamp(int(ts)/1e6)
            hours[dt.strftime('%Y-%m-%d %H:00')] += 1
    except: pass
for h, c in sorted(hours.items()):
    print(f'{h}: {c} events')
"

# Мониторинг ошибок ядра
journalctl -k -p err -f

# Проверить, не очищали ли журнал (признак сокрытия следов)
journalctl --verify
```

---

## 2.5.5 Bash-скрипты для SOC

### Принципы написания SOC-скриптов

> **Хороший SOC-скрипт:**
> - Принимает аргументы командной строки
> - Имеет понятный вывод с цветовым кодированием
> - Пишет лог своей работы
> - Безопасно обрабатывает ошибки
> - Идемпотентен (можно запускать многократно)

### Скрипт 1: Обнаружение SSH Brute Force

```bash
#!/bin/bash
# Файл: ssh_bruteforce_detect.sh
# Описание: Анализирует auth.log и находит IP с brute force атаками
# Использование: ./ssh_bruteforce_detect.sh [порог] [файл_лога]

# ==================== НАСТРОЙКИ ====================
THRESHOLD=${1:-5}                          # Порог: N неудачных попыток
LOG_FILE=${2:-/var/log/auth.log}          # Файл лога
REPORT_FILE="/tmp/ssh_bruteforce_$(date +%Y%m%d_%H%M%S).txt"
WHITELIST=("10.0.0.1" "192.168.1.1")     # Доверенные IP

# ==================== ЦВЕТА ====================
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'  # No Color

# ==================== ФУНКЦИИ ====================
log_info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_danger()  { echo -e "${RED}[DANGER]${NC} $1"; }
log_header()  { echo -e "${BOLD}${CYAN}$1${NC}"; }

is_whitelisted() {
    local ip="$1"
    for wl_ip in "${WHITELIST[@]}"; do
        [[ "$ip" == "$wl_ip" ]] && return 0
    done
    return 1
}

# ==================== ПРОВЕРКИ ====================
if [[ ! -f "$LOG_FILE" ]]; then
    log_warn "Файл лога не найден: $LOG_FILE"
    log_info "Попытка использовать journalctl..."
    # Создаём временный файл из journalctl
    LOG_FILE="/tmp/auth_extract_$$.log"
    journalctl -u ssh --since "24 hours ago" --output=cat > "$LOG_FILE"
    TEMP_LOG=true
fi

if [[ ! -r "$LOG_FILE" ]]; then
    echo "Ошибка: нет прав на чтение $LOG_FILE. Запустите с sudo."
    exit 1
fi

# ==================== АНАЛИЗ ====================
log_header "========================================"
log_header "   SSH Brute Force Detector v1.0       "
log_header "========================================"
echo ""
log_info "Лог-файл:   $LOG_FILE"
log_info "Порог атак: $THRESHOLD попыток"
log_info "Дата:       $(date)"
echo ""

# Общая статистика
TOTAL_LINES=$(wc -l < "$LOG_FILE")
TOTAL_FAILED=$(grep -c "Failed password" "$LOG_FILE" 2>/dev/null || echo 0)
TOTAL_ACCEPTED=$(grep -c "Accepted" "$LOG_FILE" 2>/dev/null || echo 0)
TOTAL_INVALID=$(grep -c "invalid user" "$LOG_FILE" 2>/dev/null || echo 0)

log_header "--- Общая статистика ---"
printf "%-35s %s\n" "Всего строк в логе:" "$TOTAL_LINES"
printf "%-35s %s\n" "Неудачных попыток входа:" "${RED}${TOTAL_FAILED}${NC}"
printf "%-35s %s\n" "Успешных входов:" "${GREEN}${TOTAL_ACCEPTED}${NC}"
printf "%-35s %s\n" "Несуществующих пользователей:" "${YELLOW}${TOTAL_INVALID}${NC}"
echo ""

# ==================== ТОП-10 АТАКУЮЩИХ IP ====================
log_header "--- ТОП-10 IP с неудачными попытками ---"
printf "%-6s %-18s %-12s %s\n" "Место" "IP-адрес" "Попыток" "Статус"
printf "%s\n" "$(printf '─%.0s' {1..55})"

declare -A ip_counts
declare -A ip_users

# Парсим auth.log
while IFS= read -r line; do
    # Извлекаем IP из строк "Failed password"
    if echo "$line" | grep -q "Failed password"; then
        ip=$(echo "$line" | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -1)
        user=$(echo "$line" | grep -oP 'for (invalid user )?(\K\S+)(?= from)' | head -1)
        if [[ -n "$ip" ]]; then
            ip_counts[$ip]=$((${ip_counts[$ip]:-0} + 1))
            # Собираем уникальных пользователей для IP
            if [[ -n "$user" ]]; then
                ip_users[$ip]="${ip_users[$ip]} $user"
            fi
        fi
    fi
done < "$LOG_FILE"

# Сортируем и выводим топ-10
rank=1
declare -a BRUTEFORCE_IPS  # Для дальнейшего использования

for ip in $(for key in "${!ip_counts[@]}"; do
    echo "${ip_counts[$key]} $key"
done | sort -rn | head -10 | awk '{print $2}'); do

    count="${ip_counts[$ip]}"
    
    # Определяем статус
    if is_whitelisted "$ip"; then
        status="${GREEN}WHITELIST${NC}"
    elif [[ "$count" -ge $((THRESHOLD * 10)) ]]; then
        status="${RED}КРИТИЧНО${NC}"
        BRUTEFORCE_IPS+=("$ip")
    elif [[ "$count" -ge "$THRESHOLD" ]]; then
        status="${YELLOW}ПОДОЗРИТ.${NC}"
        BRUTEFORCE_IPS+=("$ip")
    else
        status="${GREEN}НОРМА${NC}"
    fi
    
    printf "%-6s %-18s %-12s " "$rank" "$ip" "$count"
    echo -e "$status"
    
    # Уникальные пользователи для этого IP
    if [[ -n "${ip_users[$ip]}" ]]; then
        unique_users=$(echo "${ip_users[$ip]}" | tr ' ' '\n' | sort -u | tr '\n' ',' | sed 's/,$//')
        echo "         Целевые пользователи: ${unique_users}"
    fi
    
    ((rank++))
done

echo ""

# ==================== АТАКОВАННЫЕ ПОЛЬЗОВАТЕЛИ ====================
log_header "--- Топ атакованных пользователей ---"
grep "Failed password" "$LOG_FILE" | \
    grep -oP 'for (invalid user )?\K\S+(?= from)' | \
    sort | uniq -c | sort -rn | head -10 | \
    awk '{printf "  %-5s попыток → пользователь: %s\n", $1, $2}'

echo ""

# ==================== ВРЕМЕННАЯ ШКАЛА ====================
log_header "--- Активность по часам (последние 24ч) ---"
grep "Failed password" "$LOG_FILE" | \
    awk '{print $1, $2, substr($3,1,2)}' | \
    sort | uniq -c | \
    awk '{printf "  %s %s %s:00  →  %s попыток\n", $2, $3, $4, $1}' | \
    tail -24

echo ""

# ==================== ПРОВЕРКА НА УСПЕШНЫЕ ВХОДЫ ПОСЛЕ АТАК ====================
log_header "--- КРИТИЧНО: Успешные входы с атакующих IP ---"
ALERT_COUNT=0
for ip in "${BRUTEFORCE_IPS[@]}"; do
    if grep -q "Accepted.*from $ip" "$LOG_FILE" 2>/dev/null; then
        log_danger "IP $ip: был brute force И успешный вход!"
        grep "Accepted.*from $ip" "$LOG_FILE" | tail -3
        ((ALERT_COUNT++))
    fi
done

if [[ "$ALERT_COUNT" -eq 0 ]]; then
    log_info "Успешных входов с атакующих IP не обнаружено"
fi

echo ""

# ==================== ГЕНЕРАЦИЯ IPTABLES ПРАВИЛ ====================
if [[ ${#BRUTEFORCE_IPS[@]} -gt 0 ]]; then
    log_header "--- Рекомендуемые блокировки iptables ---"
    echo "# Скопируйте и выполните от root:"
    for ip in "${BRUTEFORCE_IPS[@]}"; do
        echo "  iptables -A INPUT -s $ip -j DROP"
    done
    echo ""
    
    # Сохранение в файл отчёта
    {
        echo "# SSH Brute Force Report — $(date)"
        echo "# Заблокировать:"
        for ip in "${BRUTEFORCE_IPS[@]}"; do
            echo "iptables -A INPUT -s $ip -j DROP"
        done
    } > "$REPORT_FILE"
    log_info "Отчёт сохранён: $REPORT_FILE"
fi

# Очистка временного файла
[[ "$TEMP_LOG" == true ]] && rm -f "$LOG_FILE"

echo ""
log_header "========================================"
log_info "Анализ завершён: $(date)"
```

Запуск и использование:

```bash
# Сделать исполняемым
chmod +x ssh_bruteforce_detect.sh

# Запуск с настройками по умолчанию (порог: 5 попыток)
sudo ./ssh_bruteforce_detect.sh

# Запуск с порогом 10 попыток
sudo ./ssh_bruteforce_detect.sh 10

# Анализ конкретного файла
sudo ./ssh_bruteforce_detect.sh 5 /var/log/auth.log.1

# Запуск по расписанию (cron — каждый час)
# crontab -e → добавить строку:
# 0 * * * * /opt/soc-scripts/ssh_bruteforce_detect.sh 5 >> /var/log/soc/ssh_report.log 2>&1
```

### Скрипт 2: Анализатор Apache Access Log

```bash
#!/bin/bash
# Файл: apache_analyzer.sh
# Описание: Анализирует access.log на предмет атак и аномалий

LOG_FILE=${1:-/var/log/apache2/access.log}
LINES=${2:-10}  # Топ N для каждой категории

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}====== Apache Log Analyzer ======${NC}"
echo "Файл: $LOG_FILE | $(wc -l < "$LOG_FILE") строк"
echo "Период: $(head -1 "$LOG_FILE" | grep -oP '\[.*?\]') — $(tail -1 "$LOG_FILE" | grep -oP '\[.*?\]')"
echo ""

# --- Топ IP-адресов ---
echo -e "${YELLOW}--- Топ-$LINES IP-адресов ---${NC}"
awk '{print $1}' "$LOG_FILE" | sort | uniq -c | sort -rn | head -"$LINES" | \
    awk '{printf "  %6s запросов  ←  %s\n", $1, $2}'
echo ""

# --- HTTP-статусы ---
echo -e "${YELLOW}--- Статистика HTTP статус-кодов ---${NC}"
awk '{print $9}' "$LOG_FILE" | sort | uniq -c | sort -rn | \
    awk '{
        code=$2
        if (code ~ /^2/) color="\033[0;32m"
        else if (code ~ /^3/) color="\033[0;36m"
        else if (code ~ /^4/) color="\033[1;33m"
        else if (code ~ /^5/) color="\033[0;31m"
        else color="\033[0m"
        printf "  %6s запросов  ←  %s%s\033[0m\n", $1, color, code
    }'
echo ""

# --- Подозрительные пути (сканирование уязвимостей) ---
echo -e "${RED}--- Подозрительные запросы ---${NC}"
PATTERNS=(
    '\.env' 'wp-admin' 'phpmyadmin' 'admin\.php'
    '\.git' 'config\.php' '/etc/passwd' 'shell\.php'
    'cmd=' 'exec(' 'system(' '../../../'
    'union.*select' 'UNION.*SELECT' '<script'
    '/proc/self' 'phpinfo' 'base64_decode'
)

for pattern in "${PATTERNS[@]}"; do
    count=$(grep -ci "$pattern" "$LOG_FILE" 2>/dev/null || echo 0)
    if [[ "$count" -gt 0 ]]; then
        printf "  ${RED}%-30s${NC} — %s совпадений\n" "$pattern" "$count"
    fi
done
echo ""

# --- Топ User-Agents (боты/сканеры) ---
echo -e "${YELLOW}--- Топ User-Agents ---${NC}"
awk -F'"' '{print $6}' "$LOG_FILE" | sort | uniq -c | sort -rn | head -"$LINES" | \
    awk '{
        # Выводим первые 80 символов user-agent
        ua=""
        for(i=2;i<=NF;i++) ua=ua" "$i
        printf "  %5s  %s\n", $1, substr(ua,1,70)
    }'
echo ""

# --- 4xx ошибки по IP (сканирование) ---
echo -e "${RED}--- Топ IP с ошибками 4xx (возможное сканирование) ---${NC}"
awk '$9 ~ /^4/' "$LOG_FILE" | awk '{print $1}' | \
    sort | uniq -c | sort -rn | head -"$LINES" | \
    awk '{printf "  %6s ошибок  ←  %s\n", $1, $2}'
echo ""

# --- Пиковые часы ---
echo -e "${YELLOW}--- Запросы по часам ---${NC}"
awk '{
    # Извлекаем час из временной метки [15/Jan/2025:10:23:45
    match($4, /[0-9]{2}:[0-9]{2}:[0-9]{2}/, arr)
    split(arr[0], t, ":")
    print t[1]
}' "$LOG_FILE" | sort | uniq -c | sort -k2 -n | \
    awk '{
        bar=""
        for(i=0;i<int($1/100);i++) bar=bar"█"
        printf "  %s:00  %5s запросов  %s\n", $2, $1, bar
    }'
```

### Скрипт 3: Мониторинг новых процессов

```bash
#!/bin/bash
# Файл: process_monitor.sh
# Описание: Мониторинг новых и подозрительных процессов
# Использование: ./process_monitor.sh [интервал_секунд]

INTERVAL=${1:-5}
BASELINE_FILE="/tmp/proc_baseline_$$.txt"
LOG_FILE="/var/log/soc/process_monitor.log"
SUSPICIOUS_CMDS=("nmap" "masscan" "nc" "netcat" "msfconsole" "metasploit" "hydra" "john" "hashcat" "sqlmap")

mkdir -p /var/log/soc

# Получаем базовый снимок процессов
ps aux --no-headers | awk '{print $2, $11}' | sort > "$BASELINE_FILE"

echo "[$(date)] Мониторинг запущен. Интервал: ${INTERVAL}с"
echo "[$(date)] Слежу за: ${SUSPICIOUS_CMDS[*]}"

cleanup() {
    rm -f "$BASELINE_FILE" "$BASELINE_FILE.new"
    echo ""
    echo "[$(date)] Мониторинг остановлен"
    exit 0
}
trap cleanup SIGINT SIGTERM

while true; do
    sleep "$INTERVAL"
    
    # Новый снимок
    ps aux --no-headers | awk '{print $2, $11}' | sort > "$BASELINE_FILE.new"
    
    # Новые процессы (появились с последней проверки)
    NEW_PROCS=$(comm -23 "$BASELINE_FILE.new" "$BASELINE_FILE")
    
    if [[ -n "$NEW_PROCS" ]]; then
        while IFS= read -r proc; do
            pid=$(echo "$proc" | awk '{print $1}')
            cmd=$(echo "$proc" | awk '{print $2}')
            
            # Получаем полную информацию о процессе
            if [[ -d "/proc/$pid" ]]; then
                user=$(stat -c %U "/proc/$pid" 2>/dev/null)
                cmdline=$(cat "/proc/$pid/cmdline" 2>/dev/null | tr '\0' ' ')
                ppid=$(cat "/proc/$pid/status" 2>/dev/null | grep PPid | awk '{print $2}')
                
                msg="[$(date)] НОВЫЙ_ПРОЦЕСС pid=$pid user=$user cmd=$cmdline"
                echo "$msg" | tee -a "$LOG_FILE"
                
                # Проверка на подозрительные команды
                for sus_cmd in "${SUSPICIOUS_CMDS[@]}"; do
                    if echo "$cmdline" | grep -qi "$sus_cmd"; then
                        alert="[$(date)] !!! ТРЕВОГА: Подозрительный процесс '$sus_cmd' pid=$pid user=$user cmdline=$cmdline"
                        echo -e "\033[0;31m$alert\033[0m"
                        echo "$alert" >> "$LOG_FILE"
                        
                        # Можно добавить уведомление (email, Slack, etc.)
                        # echo "$alert" | mail -s "SOC ALERT: Suspicious Process" soc@company.com
                    fi
                done
            fi
        done <<< "$NEW_PROCS"
    fi
    
    # Обновляем базовый снимок
    mv "$BASELINE_FILE.new" "$BASELINE_FILE"
done
```

### Скрипт 4: Генератор ежедневного отчёта SOC

```bash
#!/bin/bash
# Файл: daily_report.sh
# Описание: Генерирует ежедневный отчёт безопасности в формате Markdown
# Запускать в 23:55 через cron: 55 23 * * * /opt/soc/daily_report.sh

REPORT_DATE=$(date +%Y-%m-%d)
REPORT_DIR="/var/log/soc/reports"
REPORT_FILE="$REPORT_DIR/security_report_$REPORT_DATE.md"
AUTH_LOG="/var/log/auth.log"
APACHE_LOG="/var/log/apache2/access.log"

mkdir -p "$REPORT_DIR"

# Функция для безопасного получения числа
safe_count() {
    grep -c "$1" "$2" 2>/dev/null || echo "0"
}

cat > "$REPORT_FILE" << EOF
# SOC Daily Security Report
**Дата:** $REPORT_DATE  
**Создан:** $(date '+%Y-%m-%d %H:%M:%S')  
**Хост:** $(hostname)

---

## Сводка событий

| Метрика | Значение |
|---------|----------|
| Неудачных SSH-входов | $(safe_count "Failed password" "$AUTH_LOG") |
| Успешных SSH-входов | $(safe_count "Accepted" "$AUTH_LOG") |
| Попыток с несуществующими юзерами | $(safe_count "invalid user" "$AUTH_LOG") |
| Использований sudo | $(safe_count "sudo" "$AUTH_LOG") |
| Запросов к Apache | $(wc -l < "$APACHE_LOG" 2>/dev/null || echo "N/A") |
| Apache 4xx ошибок | $(awk '$9 ~ /^4/' "$APACHE_LOG" 2>/dev/null | wc -l || echo "N/A") |
| Apache 5xx ошибок | $(awk '$9 ~ /^5/' "$APACHE_LOG" 2>/dev/null | wc -l || echo "N/A") |

---

## ТОП-5 IP с неудачными SSH-попытками

\`\`\`
$(grep "Failed password" "$AUTH_LOG" 2>/dev/null | \
  grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | \
  sort | uniq -c | sort -rn | head -5 | \
  awk '{printf "  %-5s попыток  ←  %s\n", $1, $2}')
\`\`\`

## ТОП-5 IP в Apache

\`\`\`
$(awk '{print $1}' "$APACHE_LOG" 2>/dev/null | \
  sort | uniq -c | sort -rn | head -5 | \
  awk '{printf "  %-8s запросов  ←  %s\n", $1, $2}')
\`\`\`

## Использование sudo

\`\`\`
$(grep "sudo.*COMMAND" "$AUTH_LOG" 2>/dev/null | \
  awk '{
    for(i=1;i<=NF;i++) {
      if($i=="USER=root") root=1
      if($i ~ /^COMMAND=/) cmd=substr($i,9)
    }
    if(root) print $5, "→ root →", cmd
  }' | tail -10)
\`\`\`

## Подозрительные запросы к Apache

\`\`\`
$(grep -iE '\.env|wp-admin|phpmyadmin|etc/passwd|union.*select|<script' \
  "$APACHE_LOG" 2>/dev/null | \
  awk '{print $1, $7}' | sort | uniq -c | sort -rn | head -10)
\`\`\`

---

*Отчёт создан автоматически. При обнаружении критических инцидентов немедленно уведомить дежурного аналитика.*
EOF

echo "Отчёт создан: $REPORT_FILE"

# Опционально: отправить по email
# cat "$REPORT_FILE" | mail -s "SOC Daily Report $REPORT_DATE" soc-team@company.com
```

---

## 2.5.6 Ротация и хранение логов

### logrotate — ротация логов

```bash
# /etc/logrotate.d/soc-scripts — конфигурация ротации для наших логов
/var/log/soc/*.log {
    daily               # Ротировать ежедневно
    rotate 30           # Хранить 30 последних файлов
    compress            # Сжимать старые файлы (gzip)
    delaycompress       # Не сжимать текущий ротируемый файл
    missingok           # Не ошибаться, если файл отсутствует
    notifempty          # Не ротировать пустые файлы
    create 640 root adm # Права нового лог-файла
    dateext             # Добавлять дату к имени файла
    dateformat -%Y-%m-%d
    postrotate          # Команда после ротации
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}

# Тест конфигурации
logrotate -d /etc/logrotate.d/soc-scripts   # Debug (не делает ротацию)
logrotate -f /etc/logrotate.d/soc-scripts   # Принудительная ротация
```

### Централизованный syslog-сервер

```bash
# На СЕРВЕРЕ (/etc/rsyslog.conf) — разрешить приём логов
# Раскомментировать строки:
module(load="imudp")
input(type="imudp" port="514")
module(load="imtcp")
input(type="imtcp" port="514")

# Шаблон для хранения по хосту
$template RemoteLogs,"/var/log/remote/%HOSTNAME%/%PROGRAMNAME%.log"
*.* ?RemoteLogs

# На КЛИЕНТЕ (/etc/rsyslog.conf) — отправлять логи на сервер
*.* @@192.168.1.200:514    # TCP (надёжнее)

# Проверка
systemctl restart rsyslog
netstat -ulnp | grep 514   # Сервер слушает UDP
netstat -tlnp | grep 514   # Сервер слушает TCP
```

---

## 📝 Практическое задание

### Задание: Написать скрипт анализа auth.log

Напишите bash-скрипт `auth_analyzer.sh`, который:

1. Принимает путь к файлу `auth.log` как аргумент (или использует `/var/log/auth.log`)
2. Выводит **ТОП-10 IP с неудачными попытками входа** в формате:
   ```
   Место  IP-адрес          Попыток  Пользователи
   1      192.168.1.100     247      root, admin, test
   2      10.10.0.55        183      root, administrator
   ...
   ```
3. Отдельно выводит **ТОП-5 атакованных пользователей**
4. Показывает **временную шкалу атак** по часам (последние 24 часа)
5. Проверяет: были ли **успешные входы** с атакующих IP (критический алерт)
6. Сохраняет результат в файл `/tmp/auth_report_ДАТА.txt`

#### Тестовые данные

Для тестирования создайте файл `test_auth.log`:

```bash
cat > /tmp/test_auth.log << 'EOF'
Jan 15 10:00:01 server sshd[100]: Failed password for root from 192.168.1.100 port 10001 ssh2
Jan 15 10:00:02 server sshd[101]: Failed password for admin from 192.168.1.100 port 10002 ssh2
Jan 15 10:00:03 server sshd[102]: Failed password for root from 192.168.1.100 port 10003 ssh2
Jan 15 10:01:01 server sshd[200]: Failed password for invalid user test from 10.0.0.55 port 20001 ssh2
Jan 15 10:01:02 server sshd[201]: Failed password for root from 10.0.0.55 port 20002 ssh2
Jan 15 10:02:00 server sshd[300]: Accepted password for alice from 10.0.0.1 port 30001 ssh2
Jan 15 10:03:00 server sshd[400]: Failed password for root from 192.168.1.100 port 10004 ssh2
Jan 15 10:03:01 server sshd[401]: Accepted password for alice from 192.168.1.100 port 10005 ssh2
EOF

# Запустить скрипт на тестовых данных
./auth_analyzer.sh /tmp/test_auth.log
```

#### Ожидаемый результат

```
=== AUTH.LOG ANALYZER ===
Файл: /tmp/test_auth.log

--- ТОП-10 IP ---
1  192.168.1.100  4 попытки  Пользователи: root, admin
2  10.0.0.55      2 попытки  Пользователи: test, root

--- ТОП-5 атакованных пользователей ---
4 попытки → root
1 попытка  → admin
1 попытка  → test

--- КРИТИЧНО: Успешный вход с атакующего IP ---
[!] 192.168.1.100 атаковал 4 раза И вошёл успешно:
    Jan 15 10:03:01 Accepted password for alice from 192.168.1.100

Отчёт сохранён: /tmp/auth_report_2025-01-15.txt
```

#### Решение (базовое)

```bash
#!/bin/bash
# auth_analyzer.sh — решение практического задания

LOG_FILE="${1:-/var/log/auth.log}"
REPORT="/tmp/auth_report_$(date +%Y-%m-%d).txt"

if [[ ! -f "$LOG_FILE" ]]; then
    echo "Ошибка: файл $LOG_FILE не найден"
    exit 1
fi

output() { echo "$@" | tee -a "$REPORT"; }
> "$REPORT"  # Очистить файл отчёта

output "=== AUTH.LOG ANALYZER ==="
output "Файл: $LOG_FILE | $(date)"
output ""

# Собираем данные в ассоциативные массивы
declare -A ip_fail_count
declare -A ip_users_list

while IFS= read -r line; do
    if echo "$line" | grep -q "Failed password"; then
        ip=$(echo "$line" | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -1)
        user=$(echo "$line" | grep -oP '(?<=for (invalid user )?)(\S+)(?= from)' | head -1)
        [[ -n "$ip" ]] && ip_fail_count[$ip]=$((${ip_fail_count[$ip]:-0} + 1))
        [[ -n "$ip" && -n "$user" ]] && ip_users_list[$ip]+="$user "
    fi
done < "$LOG_FILE"

# ТОП-10 IP
output "--- ТОП-10 IP с неудачными попытками ---"
rank=1
declare -a attack_ips
for ip in $(for k in "${!ip_fail_count[@]}"; do echo "${ip_fail_count[$k]} $k"; done | sort -rn | head -10 | awk '{print $2}'); do
    unique_users=$(echo "${ip_users_list[$ip]}" | tr ' ' '\n' | sort -u | grep -v '^$' | paste -sd ', ')
    output "  $rank  $ip  — ${ip_fail_count[$ip]} попыток  — Пользователи: $unique_users"
    attack_ips+=("$ip")
    ((rank++))
done

output ""
output "--- ТОП-5 атакованных пользователей ---"
grep "Failed password" "$LOG_FILE" | \
    grep -oP '(?<=for (invalid user )?)(\S+)(?= from)' | \
    sort | uniq -c | sort -rn | head -5 | \
    awk '{printf "  %3s попыток → %s\n", $1, $2}' | tee -a "$REPORT"

output ""
output "--- Активность по часам ---"
grep "Failed password" "$LOG_FILE" | \
    awk '{print substr($3,1,2)}' | sort | uniq -c | \
    awk '{printf "  %s:00  → %s попыток\n", $2, $1}' | tee -a "$REPORT"

output ""
output "--- Проверка успешных входов с атакующих IP ---"
alert_found=false
for ip in "${attack_ips[@]}"; do
    if grep -q "Accepted.*from $ip" "$LOG_FILE"; then
        output "  [!!!] ТРЕВОГА: $ip атаковал ${ip_fail_count[$ip]} раз И вошёл успешно!"
        grep "Accepted.*from $ip" "$LOG_FILE" | while read -r l; do
            output "        $l"
        done
        alert_found=true
    fi
done
$alert_found || output "  Успешных входов с атакующих IP не обнаружено."

output ""
output "Отчёт сохранён: $REPORT"
```

---

## 📚 Итоги главы

| Тема | Ключевые навыки |
|------|-----------------|
| Форматы логов | syslog RFC 3164/5424, JSON, Priority = Facility×8 + Severity |
| Файлы Linux | auth.log, syslog, kern.log, apache2/access.log, wtmp/btmp |
| auth.log | Failed password, Accepted, invalid user, sudo escalation |
| journalctl | `-u`, `-p`, `--since`, `-o json` для гибкой фильтрации |
| rsyslog | Правила facility.severity, централизованный сбор |
| Bash для SOC | Ассоциативные массивы, grep/awk/sort, цветной вывод |
| Автоматизация | Скрипты мониторинга, генерация отчётов, cron |

> **Главный вывод:** Лог-анализ — основа работы SOC-аналитика. Bash-скрипты позволяют автоматизировать рутинную работу и быстро реагировать на инциденты. Освоив анализ `auth.log` и `access.log`, вы сможете обнаруживать SSH brute force, сканирование портов, попытки SQL-инъекций и другие атаки прямо из командной строки без специализированных SIEM-систем.

---

[← Предыдущая](./chapter-2-4) | [Следующая →](../part-3/chapter-3-1)
