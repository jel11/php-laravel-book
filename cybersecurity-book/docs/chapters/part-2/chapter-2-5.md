# Глава 2.5: Логи и bash-скрипты для SOC

## 🎯 Цели главы

- Понять структуру системных логов Linux и их расположение в `/var/log/`
- Освоить работу с `journalctl`, `syslog` и `rsyslog`
- Научиться писать bash-скрипты для автоматизации задач SOC-аналитика
- Реализовать систему мониторинга и парсинга логов
- Настроить автоматические алерты через cron
- Изучить реальные скрипты, используемые в SOC-практике

---

## 2.5.1 Введение: Зачем SOC-аналитику знать логи и bash?

Лог-файлы — это «чёрный ящик» любой информационной системы. Каждое событие, каждый вход пользователя, каждая сетевая сессия оставляет след. SOC-аналитик, умеющий читать и обрабатывать логи, способен:

- Обнаружить атаку на ранней стадии
- Восстановить хронологию инцидента
- Собрать доказательную базу для расследования
- Построить автоматизированную систему раннего предупреждения

Bash — это не просто командная оболочка, это мощный инструмент автоматизации. В связке с grep, awk, sed и cron bash-скрипты превращаются в полноценную систему мониторинга.

```
┌─────────────────────────────────────────────────────────┐
│                   Экосистема логов SOC                  │
│                                                         │
│  Источники логов          Обработка          Действие   │
│  ─────────────           ──────────          ────────   │
│  /var/log/auth.log  ──►  bash-скрипт  ──►   Алерт      │
│  /var/log/syslog    ──►  grep/awk     ──►   Email       │
│  journalctl         ──►  парсинг      ──►   Telegram    │
│  /var/log/nginx/    ──►  аналитика   ──►   SIEM         │
│  /var/log/apache2/  ──►  cron        ──►   Тикет        │
└─────────────────────────────────────────────────────────┘
```

---

## 2.5.2 Структура /var/log/ — карта системных логов

### Основные файлы и директории

```
/var/log/
├── auth.log          # Аутентификация, sudo, SSH (Debian/Ubuntu)
├── secure            # То же, но для RHEL/CentOS
├── syslog            # Общий системный журнал (Debian/Ubuntu)
├── messages          # То же для RHEL/CentOS
├── kern.log          # Сообщения ядра
├── dmesg             # Буфер сообщений ядра при загрузке
├── boot.log          # Процесс загрузки системы
├── faillog           # Неудачные попытки входа
├── lastlog           # Последний вход каждого пользователя
├── wtmp              # История входов/выходов (бинарный)
├── btmp              # Неудачные попытки входа (бинарный)
├── cron              # Задачи cron
├── mail.log          # Почтовый сервер
├── dpkg.log          # Установка пакетов (Debian/Ubuntu)
├── yum.log           # Установка пакетов (RHEL/CentOS)
├── apache2/
│   ├── access.log    # HTTP-запросы к Apache
│   └── error.log     # Ошибки Apache
├── nginx/
│   ├── access.log    # HTTP-запросы к Nginx
│   └── error.log     # Ошибки Nginx
├── mysql/
│   └── error.log     # Ошибки MySQL
└── audit/
    └── audit.log     # Auditd — расширенный аудит
```

### Таблица: Приоритет логов для SOC-аналитика

| Лог-файл | Приоритет | Что ищем | Пример угрозы |
|---|---|---|---|
| auth.log / secure | КРИТИЧЕСКИЙ | Bruteforce, sudo-эскалация | SSH-атаки, компрометация аккаунта |
| audit.log | КРИТИЧЕСКИЙ | Изменения файлов, syscall | Руткиты, lateral movement |
| syslog / messages | ВЫСОКИЙ | Аномалии сервисов | Сбои, нештатное поведение |
| kern.log | ВЫСОКИЙ | Ошибки ядра, модули | Загрузка вредоносных модулей |
| nginx/apache access.log | ВЫСОКИЙ | SQLi, XSS, сканеры | Веб-атаки |
| cron | СРЕДНИЙ | Нелегитимные задачи | Persistence через cron |
| dpkg/yum.log | СРЕДНИЙ | Установка пакетов | Несанкционированный софт |

### Работа с бинарными логами

```bash
# Просмотр истории входов (wtmp)
last -n 20                    # Последние 20 входов
last -F                       # С полными датами
last reboot                   # История перезагрузок

# Неудачные попытки входа (btmp)
lastb -n 20                   # Последние 20 неудачных попыток
lastb -a                      # С IP-адресами

# Последний вход каждого пользователя
lastlog
lastlog -u username           # Для конкретного пользователя
```

---

## 2.5.3 Форматы логов: анатомия записи

### Syslog-формат (RFC 3164)

```
<Timestamp> <Hostname> <Process>[PID]: <Message>
```

Пример из `/var/log/auth.log`:
```
Feb 25 14:23:11 webserver sshd[12847]: Failed password for root from 192.168.1.105 port 54321 ssh2
Feb 25 14:23:14 webserver sshd[12847]: Failed password for root from 192.168.1.105 port 54321 ssh2
Feb 25 14:23:17 webserver sshd[12848]: Accepted password for admin from 10.0.0.5 port 43210 ssh2
Feb 25 14:23:17 webserver sshd[12848]: pam_unix(sshd:session): session opened for user admin by (uid=0)
```

### Nginx access.log (Combined Log Format)

```
%h %l %u %t "%r" %>s %O "%{Referer}i" "%{User-Agent}i"
```

Пример:
```
203.0.113.42 - - [25/Feb/2026:14:30:01 +0300] "GET /admin/config.php HTTP/1.1" 404 162 "-" "sqlmap/1.7.8#stable"
10.0.0.1 - alice [25/Feb/2026:14:30:05 +0300] "POST /api/login HTTP/1.1" 200 54 "https://example.com" "Mozilla/5.0"
```

### Разбор полей Nginx-лога

```bash
# Поля Combined Log Format:
# $remote_addr  - IP клиента
# $remote_user  - имя пользователя (если basic auth)
# $time_local   - время запроса
# "$request"    - метод, URI, протокол
# $status       - HTTP-код ответа
# $body_bytes_sent - размер ответа
# "$http_referer"  - откуда пришёл пользователь
# "$http_user_agent" - браузер/инструмент
```

---

## 2.5.4 journalctl — работа с systemd journal

Systemd journal — централизованная система логирования, пришедшая на смену syslog в современных дистрибутивах.

### Базовые команды

```bash
# Просмотр всех логов
journalctl

# Логи за сегодня
journalctl --since today

# Логи за последний час
journalctl --since "1 hour ago"

# Логи за конкретный период
journalctl --since "2026-02-25 00:00:00" --until "2026-02-25 23:59:59"

# Следить за новыми записями (как tail -f)
journalctl -f

# Последние N строк
journalctl -n 50

# Логи конкретного сервиса
journalctl -u sshd
journalctl -u nginx
journalctl -u fail2ban

# Логи по приоритету (критические и выше)
journalctl -p crit
journalctl -p err          # Ошибки и выше
journalctl -p warning      # Предупреждения и выше

# Уровни приоритета:
# emerg(0), alert(1), crit(2), err(3), warning(4), notice(5), info(6), debug(7)

# Логи конкретного процесса по PID
journalctl _PID=1234

# Логи конкретного пользователя
journalctl _UID=1000

# Вывод в формате JSON (удобно для SIEM)
journalctl -u sshd -o json-pretty | head -50

# Фильтрация по ключевому слову
journalctl -u sshd | grep "Failed password"

# Статистика использования дискового пространства
journalctl --disk-usage

# Очистка старых логов (оставить последние 2 недели)
journalctl --vacuum-time=2weeks
```

### Вывод journalctl в JSON для интеграции с SIEM

```bash
# Получение SSH-событий в JSON
journalctl -u sshd -o json --since "1 hour ago" | \
  python3 -c "
import sys, json
for line in sys.stdin:
    try:
        event = json.loads(line)
        print(json.dumps({
            'timestamp': event.get('__REALTIME_TIMESTAMP'),
            'message': event.get('MESSAGE'),
            'hostname': event.get('_HOSTNAME'),
            'pid': event.get('_PID')
        }))
    except:
        pass
"
```

---

## 2.5.5 rsyslog — настройка централизованного логирования

### Конфигурация rsyslog

```bash
# Основной конфигурационный файл
cat /etc/rsyslog.conf

# Включение приёма логов по сети (rsyslog-сервер)
# /etc/rsyslog.conf:
module(load="imudp")
input(type="imudp" port="514")

module(load="imtcp")
input(type="imtcp" port="514")
```

Пример конфигурации `/etc/rsyslog.d/50-soc.conf`:

```bash
# Отправка всех auth-событий на центральный сервер
auth,authpriv.*    @siem-server:514      # UDP
auth,authpriv.*    @@siem-server:514     # TCP

# Сохранение SSH-событий в отдельный файл
:msg, contains, "sshd"  /var/log/soc/ssh-events.log

# Сохранение событий sudo
:msg, contains, "sudo"  /var/log/soc/sudo-events.log

# Фильтрация по severity — только критические события
*.crit              /var/log/soc/critical.log

# Исключение шумных процессов
:programname, isequal, "ntpd" stop

# Шаблон вывода с временной меткой RFC3339
template(name="RFC3339Format" type="string"
  string="%TIMESTAMP:::date-rfc3339% %HOSTNAME% %syslogtag%%msg%\n")

*.* ?RFC3339Format
```

### Ротация логов (logrotate)

```bash
# /etc/logrotate.d/soc-logs
/var/log/soc/*.log {
    daily                    # Ротация ежедневно
    rotate 90               # Хранить 90 дней
    compress                # Сжимать старые файлы
    delaycompress           # Не сжимать текущий
    missingok               # Не ошибаться если файл отсутствует
    notifempty              # Не ротировать пустые файлы
    create 640 syslog adm  # Права на новый файл
    postrotate
        /usr/lib/rsyslog/rsyslog-rotate
    endscript
}
```

---

## 2.5.6 Основы bash для SOC: ключевые инструменты

### Триада обработки текста: grep, awk, sed

```bash
# === GREP ===
# Поиск неудачных SSH-входов
grep "Failed password" /var/log/auth.log

# Поиск с контекстом (3 строки до и после)
grep -B3 -A3 "BREAK-IN" /var/log/auth.log

# Подсчёт совпадений
grep -c "Failed password" /var/log/auth.log

# Вывод только совпадающих IP
grep -oP '(?<=from )\d+\.\d+\.\d+\.\d+' /var/log/auth.log

# Поиск без учёта регистра
grep -i "error" /var/log/syslog

# Поиск по нескольким шаблонам
grep -E "(error|critical|failed)" /var/log/syslog


# === AWK ===
# Вывод конкретных полей (поля разделены пробелом)
awk '{print $1, $2, $3}' /var/log/auth.log

# Топ-10 IP по количеству запросов к Nginx
awk '{print $1}' /var/log/nginx/access.log | \
  sort | uniq -c | sort -rn | head -10

# Фильтрация строк с условием
awk '$9 == "404" {print $1, $7}' /var/log/nginx/access.log

# Подсчёт запросов по HTTP-коду
awk '{codes[$9]++} END {for(c in codes) print codes[c], c}' \
  /var/log/nginx/access.log | sort -rn

# Среднее время ответа (если есть в логе)
awk '{sum+=$NF; count++} END {print "Avg:", sum/count}' response_times.log


# === SED ===
# Маскировка IP в логах (для передачи в сторонние системы)
sed 's/\([0-9]\+\.\)\{3\}[0-9]\+/x.x.x.x/g' /var/log/auth.log

# Удаление пустых строк
sed '/^$/d' logfile.log

# Извлечение данных между тегами
sed -n 's/.*\[ERROR\] \(.*\)\[\/ERROR\].*/\1/p' logfile.log
```

### Полезные one-liners для SOC

```bash
# Топ-10 источников SSH bruteforce
grep "Failed password" /var/log/auth.log | \
  grep -oP '(?<=from )\d+\.\d+\.\d+\.\d+' | \
  sort | uniq -c | sort -rn | head -10

# Найти все успешные SSH-входы за сегодня
grep "$(date +"%b %e")" /var/log/auth.log | grep "Accepted password"

# Все пользователи, использовавшие sudo сегодня
grep "$(date +"%b %e")" /var/log/auth.log | \
  grep "sudo" | awk '{print $6}' | sort -u

# Топ URL-запросов с ошибкой 500
awk '$9==500 {print $7}' /var/log/nginx/access.log | \
  sort | uniq -c | sort -rn | head -20

# Найти сканирование портов через большое число подключений
ss -ant | awk 'NR>1 {print $5}' | \
  cut -d: -f1 | sort | uniq -c | sort -rn | head -10

# Все модификации файлов /etc за последние 24 часа
find /etc -mtime -1 -type f 2>/dev/null

# Поиск SUID-файлов (потенциальный persistence)
find / -perm -4000 -type f 2>/dev/null

# Активные соединения по портам
ss -tulpn | grep LISTEN

# Процессы с сетевыми соединениями
lsof -i -n -P | grep ESTABLISHED
```

---

## 2.5.7 Реальные bash-скрипты для SOC-аналитика

### Скрипт 1: Детектор SSH Bruteforce

```bash
#!/bin/bash
# =============================================================
# ssh-bruteforce-detector.sh
# Обнаружение SSH bruteforce атак
# Автор: SOC Team
# Версия: 1.0
# =============================================================

# --- Конфигурация ---
THRESHOLD=10              # Порог: кол-во неудачных попыток
TIME_WINDOW=300           # Временное окно в секундах (5 минут)
LOG_FILE="/var/log/auth.log"
ALERT_LOG="/var/log/soc/bruteforce-alerts.log"
EMAIL_ALERT="soc@company.ru"
WHITELIST_FILE="/etc/soc/ssh-whitelist.txt"

# --- Цвета для вывода ---
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# --- Создание директорий ---
mkdir -p /var/log/soc /etc/soc

# --- Функция логирования ---
log_alert() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$ALERT_LOG"
}

# --- Функция проверки белого списка ---
is_whitelisted() {
    local ip="$1"
    if [[ -f "$WHITELIST_FILE" ]]; then
        grep -q "^${ip}$" "$WHITELIST_FILE" && return 0
    fi
    return 1
}

# --- Функция получения геолокации IP ---
get_geo() {
    local ip="$1"
    # Используем curl для запроса к ip-api.com (бесплатный)
    local geo=$(curl -s --max-time 3 "http://ip-api.com/json/${ip}?fields=country,city" 2>/dev/null)
    if [[ $? -eq 0 ]]; then
        echo "$geo" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"{data.get('country','Unknown')}, {data.get('city','Unknown')}\")
" 2>/dev/null || echo "Unknown"
    else
        echo "Unknown"
    fi
}

# --- Функция отправки алерта ---
send_alert() {
    local ip="$1"
    local count="$2"
    local geo="$3"
    local first_attempt="$4"
    local last_attempt="$5"

    local message="BRUTEFORCE DETECTED: IP=$ip Count=$count Geo=$geo First=$first_attempt Last=$last_attempt"
    log_alert "CRITICAL" "$message"

    # Email-алерт
    if command -v mail &>/dev/null; then
        echo -e "Subject: [SOC ALERT] SSH Bruteforce: $ip\n\n$message\n\nПервая попытка: $first_attempt\nПоследняя попытка: $last_attempt\nКоличество попыток: $count\nГеолокация: $geo" | \
            mail -s "[SOC] SSH Bruteforce от $ip" "$EMAIL_ALERT" 2>/dev/null
    fi

    # Автоматическая блокировка через iptables
    if ! iptables -nL INPUT | grep -q "$ip"; then
        iptables -A INPUT -s "$ip" -j DROP 2>/dev/null
        log_alert "INFO" "IP $ip автоматически заблокирован через iptables"
    fi
}

# --- Основная логика ---
echo -e "${GREEN}[*] SSH Bruteforce Detector запущен$(date)${NC}"
echo -e "${YELLOW}[*] Порог: $THRESHOLD попыток за $TIME_WINDOW секунд${NC}"

# Получаем временную метку начала окна анализа
WINDOW_START=$(date -d "-${TIME_WINDOW} seconds" '+%b %e %H:%M:%S' 2>/dev/null || \
               date -v-${TIME_WINDOW}S '+%b %e %H:%M:%S' 2>/dev/null)

# Извлекаем неудачные попытки SSH из лога
FAILED_ATTEMPTS=$(grep "Failed password" "$LOG_FILE" | \
                  grep -v "invalid user \(backup\|test\|admin\)" 2>/dev/null)

# Подсчёт по IP
declare -A ip_counts
declare -A ip_first_seen
declare -A ip_last_seen

while IFS= read -r line; do
    # Извлечение IP
    ip=$(echo "$line" | grep -oP '(?<=from )\d+\.\d+\.\d+\.\d+')
    [[ -z "$ip" ]] && continue

    # Извлечение временной метки
    timestamp=$(echo "$line" | awk '{print $1, $2, $3}')

    ip_counts[$ip]=$((${ip_counts[$ip]:-0} + 1))

    if [[ -z "${ip_first_seen[$ip]}" ]]; then
        ip_first_seen[$ip]="$timestamp"
    fi
    ip_last_seen[$ip]="$timestamp"

done <<< "$FAILED_ATTEMPTS"

# Анализ результатов
FOUND_THREATS=0

for ip in "${!ip_counts[@]}"; do
    count=${ip_counts[$ip]}

    if [[ $count -ge $THRESHOLD ]]; then
        # Проверка белого списка
        if is_whitelisted "$ip"; then
            echo -e "${YELLOW}[SKIP] $ip в белом списке (попыток: $count)${NC}"
            continue
        fi

        FOUND_THREATS=$((FOUND_THREATS + 1))
        geo=$(get_geo "$ip")

        echo -e "${RED}[ALERT] Bruteforce от $ip: $count попыток | Гео: $geo${NC}"
        echo -e "  Первая: ${ip_first_seen[$ip]} | Последняя: ${ip_last_seen[$ip]}"

        send_alert "$ip" "$count" "$geo" "${ip_first_seen[$ip]}" "${ip_last_seen[$ip]}"
    fi
done

if [[ $FOUND_THREATS -eq 0 ]]; then
    echo -e "${GREEN}[OK] Угроз bruteforce не обнаружено${NC}"
else
    echo -e "${RED}[!] Обнаружено угроз: $FOUND_THREATS${NC}"
fi

echo -e "${GREEN}[*] Анализ завершён: $(date)${NC}"
exit $FOUND_THREATS
```

### Скрипт 2: Парсер веб-логов с алертами

```bash
#!/bin/bash
# =============================================================
# web-log-analyzer.sh
# Анализ Nginx/Apache логов для SOC
# =============================================================

LOG_FILE="${1:-/var/log/nginx/access.log}"
REPORT_DIR="/var/log/soc/reports"
THRESHOLD_404=100      # Порог 404-ошибок для одного IP
THRESHOLD_500=20       # Порог 500-ошибок
THRESHOLD_RPS=50       # Запросов в секунду (DDoS)
SQLI_PATTERNS="union.*select|select.*from|drop.*table|insert.*into|' or '1'='1|--$|/\*.*\*/"
XSS_PATTERNS="<script|javascript:|onerror=|onload=|alert\(|eval\("
SCANNER_UA="sqlmap|nikto|nmap|masscan|zgrab|gobuster|dirbuster|burpsuite|nessus"

mkdir -p "$REPORT_DIR"

REPORT_FILE="$REPORT_DIR/web-report-$(date +%Y%m%d-%H%M%S).txt"

echo "============================================" | tee "$REPORT_FILE"
echo "  WEB SECURITY REPORT - $(date)"             | tee -a "$REPORT_FILE"
echo "  Источник: $LOG_FILE"                        | tee -a "$REPORT_FILE"
echo "============================================" | tee -a "$REPORT_FILE"
echo ""

# --- 1. Топ-10 IP по количеству запросов ---
echo "## ТОП-10 IP ПО ЗАПРОСАМ" | tee -a "$REPORT_FILE"
echo "----------------------------" | tee -a "$REPORT_FILE"
awk '{print $1}' "$LOG_FILE" | sort | uniq -c | sort -rn | head -10 | \
  awk '{printf "  %6d запросов | %s\n", $1, $2}' | tee -a "$REPORT_FILE"
echo ""

# --- 2. Распределение HTTP-кодов ---
echo "## РАСПРЕДЕЛЕНИЕ HTTP-КОДОВ" | tee -a "$REPORT_FILE"
echo "----------------------------" | tee -a "$REPORT_FILE"
awk '{codes[$9]++} END {
    for(c in codes) printf "  HTTP %-3s: %d\n", c, codes[c]
}' "$LOG_FILE" | sort -t: -k2 -rn | tee -a "$REPORT_FILE"
echo ""

# --- 3. Детектор SQL-инъекций ---
echo "## ПОДОЗРИТЕЛЬНЫЕ ЗАПРОСЫ (SQL Injection)" | tee -a "$REPORT_FILE"
echo "------------------------------------------" | tee -a "$REPORT_FILE"
grep -iE "$SQLI_PATTERNS" "$LOG_FILE" | \
  awk '{print $1, $7}' | \
  head -20 | \
  while read ip url; do
    echo "  [SQLI] IP: $ip | URL: $url" | tee -a "$REPORT_FILE"
  done
sqli_count=$(grep -icE "$SQLI_PATTERNS" "$LOG_FILE")
echo "  Всего подозрительных запросов: $sqli_count" | tee -a "$REPORT_FILE"
echo ""

# --- 4. Детектор XSS ---
echo "## ПОДОЗРИТЕЛЬНЫЕ ЗАПРОСЫ (XSS)" | tee -a "$REPORT_FILE"
echo "---------------------------------" | tee -a "$REPORT_FILE"
grep -iE "$XSS_PATTERNS" "$LOG_FILE" | \
  awk '{print $1, $7}' | head -10 | \
  while read ip url; do
    echo "  [XSS] IP: $ip | URL: $url" | tee -a "$REPORT_FILE"
  done
echo ""

# --- 5. Детектор сканеров ---
echo "## ОБНАРУЖЕННЫЕ СКАНЕРЫ" | tee -a "$REPORT_FILE"
echo "------------------------" | tee -a "$REPORT_FILE"
grep -iE "$SCANNER_UA" "$LOG_FILE" | \
  awk '{
    # Извлечение User-Agent (поле в кавычках)
    match($0, /"[^"]*"$/, ua)
    print $1, ua[0]
  }' | sort -u | head -20 | tee -a "$REPORT_FILE"
echo ""

# --- 6. IP с большим числом 404 (сканирование директорий) ---
echo "## IP С БОЛЬШИМ ЧИСЛОМ 404 (СКАНИРОВАНИЕ)" | tee -a "$REPORT_FILE"
echo "------------------------------------------" | tee -a "$REPORT_FILE"
awk '$9==404 {print $1}' "$LOG_FILE" | \
  sort | uniq -c | sort -rn | \
  awk -v threshold="$THRESHOLD_404" '$1 >= threshold {
    printf "  [ALERT] %s - %d ошибок 404\n", $2, $1
  }' | tee -a "$REPORT_FILE"
echo ""

# --- 7. Подозрительные User-Agent ---
echo "## ПОДОЗРИТЕЛЬНЫЕ USER-AGENTS" | tee -a "$REPORT_FILE"
echo "-------------------------------" | tee -a "$REPORT_FILE"
awk -F'"' '{print $6}' "$LOG_FILE" | \
  grep -iE "(curl|wget|python|go-http|libwww)" | \
  sort | uniq -c | sort -rn | head -10 | tee -a "$REPORT_FILE"
echo ""

echo "============================================" | tee -a "$REPORT_FILE"
echo "  Отчёт сохранён: $REPORT_FILE"
echo "============================================"
```

### Скрипт 3: Мониторинг целостности файлов

```bash
#!/bin/bash
# =============================================================
# file-integrity-monitor.sh
# Простой монитор целостности критических файлов (аналог AIDE)
# =============================================================

BASELINE_DIR="/var/lib/soc/fim-baseline"
ALERT_LOG="/var/log/soc/fim-alerts.log"
MONITORED_DIRS=(
    "/etc/passwd"
    "/etc/shadow"
    "/etc/sudoers"
    "/etc/ssh/sshd_config"
    "/etc/crontab"
    "/etc/hosts"
    "/bin"
    "/usr/bin"
    "/usr/local/bin"
    "/sbin"
)

mkdir -p "$BASELINE_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$ALERT_LOG"
}

# --- Создание базовой линии ---
create_baseline() {
    log "Создание базовой линии..."
    for target in "${MONITORED_DIRS[@]}"; do
        if [[ -f "$target" ]]; then
            sha256sum "$target" >> "$BASELINE_DIR/baseline.sha256"
        elif [[ -d "$target" ]]; then
            find "$target" -type f -exec sha256sum {} \; >> "$BASELINE_DIR/baseline.sha256"
        fi
    done
    log "Базовая линия создана: $BASELINE_DIR/baseline.sha256"
}

# --- Проверка целостности ---
check_integrity() {
    if [[ ! -f "$BASELINE_DIR/baseline.sha256" ]]; then
        log "ERROR: Базовая линия не найдена. Запустите с параметром --baseline"
        exit 1
    fi

    log "Начало проверки целостности..."
    CHANGES=0
    NEW_FILES=0

    # Проверяем существующие файлы
    while IFS= read -r line; do
        baseline_hash=$(echo "$line" | awk '{print $1}')
        filepath=$(echo "$line" | awk '{print $2}')

        if [[ ! -f "$filepath" ]]; then
            log "[DELETED] Файл удалён: $filepath"
            CHANGES=$((CHANGES + 1))
            continue
        fi

        current_hash=$(sha256sum "$filepath" | awk '{print $1}')
        if [[ "$baseline_hash" != "$current_hash" ]]; then
            log "[MODIFIED] Файл изменён: $filepath"
            log "  Старый хэш: $baseline_hash"
            log "  Новый хэш:  $current_hash"
            # Показать что изменилось через stat
            stat "$filepath" | grep -E "Access:|Modify:|Change:" | \
              while read l; do log "  $l"; done
            CHANGES=$((CHANGES + 1))
        fi
    done < "$BASELINE_DIR/baseline.sha256"

    # Проверяем новые файлы
    for target in "${MONITORED_DIRS[@]}"; do
        if [[ -d "$target" ]]; then
            while IFS= read -r filepath; do
                if ! grep -q "$filepath" "$BASELINE_DIR/baseline.sha256"; then
                    log "[NEW] Новый файл: $filepath"
                    NEW_FILES=$((NEW_FILES + 1))
                fi
            done < <(find "$target" -type f)
        fi
    done

    log "Проверка завершена. Изменений: $CHANGES | Новых файлов: $NEW_FILES"

    if [[ $((CHANGES + NEW_FILES)) -gt 0 ]]; then
        log "ВНИМАНИЕ: Обнаружены изменения! Требуется расследование."
        return 1
    fi
    return 0
}

# --- Обработка параметров ---
case "${1:-check}" in
    --baseline|-b)
        create_baseline
        ;;
    --check|-c|check)
        check_integrity
        ;;
    *)
        echo "Использование: $0 [--baseline | --check]"
        exit 1
        ;;
esac
```

### Скрипт 4: Система автоматических алертов в Telegram

```bash
#!/bin/bash
# =============================================================
# telegram-alert.sh
# Отправка SOC-алертов в Telegram
# =============================================================

# Настройки (вынести в /etc/soc/config или переменные окружения)
TG_BOT_TOKEN="${TG_BOT_TOKEN:-YOUR_BOT_TOKEN}"
TG_CHAT_ID="${TG_CHAT_ID:-YOUR_CHAT_ID}"
HOSTNAME=$(hostname)

# --- Функция отправки сообщения ---
send_telegram() {
    local message="$1"
    local parse_mode="${2:-HTML}"

    curl -s -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage" \
        -d chat_id="${TG_CHAT_ID}" \
        -d text="${message}" \
        -d parse_mode="${parse_mode}" \
        --max-time 10 \
        > /dev/null 2>&1

    return $?
}

# --- Функция форматирования алерта ---
format_alert() {
    local severity="$1"
    local title="$2"
    local details="$3"

    local icon
    case "$severity" in
        CRITICAL) icon="🔴" ;;
        HIGH)     icon="🟠" ;;
        MEDIUM)   icon="🟡" ;;
        LOW)      icon="🟢" ;;
        *)        icon="⚪" ;;
    esac

    cat << EOF
${icon} <b>[${severity}] ${title}</b>

🖥 Хост: <code>${HOSTNAME}</code>
🕐 Время: $(date '+%d.%m.%Y %H:%M:%S')

📋 <b>Детали:</b>
<code>${details}</code>
EOF
}

# --- Мониторинг в реальном времени ---
monitor_auth_log() {
    tail -F /var/log/auth.log | while read -r line; do
        # SSH Bruteforce
        if echo "$line" | grep -q "Failed password"; then
            ip=$(echo "$line" | grep -oP '(?<=from )\d+\.\d+\.\d+\.\d+')
            user=$(echo "$line" | grep -oP '(?<=for )\S+(?= from)')
            msg=$(format_alert "HIGH" "SSH Failed Login" \
                "IP: $ip\nПользователь: $user\nСобытие: $line")
            send_telegram "$msg"
        fi

        # Успешный вход
        if echo "$line" | grep -q "Accepted password"; then
            ip=$(echo "$line" | grep -oP '(?<=from )\d+\.\d+\.\d+\.\d+')
            user=$(echo "$line" | grep -oP '(?<=for )\S+(?= from)')
            msg=$(format_alert "MEDIUM" "SSH Successful Login" \
                "IP: $ip\nПользователь: $user")
            send_telegram "$msg"
        fi

        # Использование sudo
        if echo "$line" | grep -q "sudo.*COMMAND"; then
            msg=$(format_alert "MEDIUM" "SUDO Command Executed" \
                "$line")
            send_telegram "$msg"
        fi

        # Новый пользователь
        if echo "$line" | grep -qE "useradd|adduser"; then
            msg=$(format_alert "CRITICAL" "New User Created" \
                "$line")
            send_telegram "$msg"
        fi
    done
}

# Запуск мониторинга
monitor_auth_log
```

---

## 2.5.8 Настройка cron для автоматизации SOC-задач

### Синтаксис cron

```
┌──────────── Минута (0-59)
│ ┌────────── Час (0-23)
│ │ ┌──────── День месяца (1-31)
│ │ │ ┌────── Месяц (1-12)
│ │ │ │ ┌──── День недели (0=воскресенье, 7=воскресенье)
│ │ │ │ │
* * * * * команда
```

### Примеры расписаний

```bash
# Открыть crontab для редактирования
crontab -e

# Просмотр текущих задач
crontab -l

# Crontab для SOC-задач (пример)
# =========================================

# Каждую минуту: проверка bruteforce
* * * * * /opt/soc/scripts/ssh-bruteforce-detector.sh >> /var/log/soc/bruteforce-cron.log 2>&1

# Каждые 5 минут: анализ веб-логов
*/5 * * * * /opt/soc/scripts/web-log-analyzer.sh >> /var/log/soc/web-cron.log 2>&1

# Каждые 15 минут: проверка открытых портов
*/15 * * * * ss -tulpn > /var/log/soc/open-ports-$(date +\%H\%M).log 2>&1

# Каждый час: дайджест событий безопасности
0 * * * * /opt/soc/scripts/hourly-digest.sh >> /var/log/soc/digest.log 2>&1

# В 23:00 каждый день: ежедневный отчёт
0 23 * * * /opt/soc/scripts/daily-report.sh | mail -s "SOC Daily Report" soc@company.ru

# По воскресеньям в 3:00: проверка целостности файлов
0 3 * * 0 /opt/soc/scripts/file-integrity-monitor.sh --check >> /var/log/soc/fim.log 2>&1

# 1-е число каждого месяца: архивация логов
0 2 1 * * tar -czf /backup/logs/$(date +\%Y\%m).tar.gz /var/log/soc/ 2>&1

# Системный crontab /etc/cron.d/soc-monitoring
# (может быть настроен от имени root)
```

### Мониторинг выполнения cron-задач

```bash
# Просмотр журнала cron
grep CRON /var/log/syslog | tail -20
journalctl -u cron --since "1 hour ago"

# Проверка что скрипты выполняются
cat /var/log/soc/bruteforce-cron.log | tail -20

# Найти зависшие задачи cron
ps aux | grep -E "cron|CRON" | grep -v grep
```

---

## 2.5.9 Комплексный скрипт: Ежедневный дайджест SOC

```bash
#!/bin/bash
# =============================================================
# daily-report.sh
# Генерация ежедневного отчёта SOC
# =============================================================

DATE=$(date '+%Y-%m-%d')
YESTERDAY=$(date -d "yesterday" '+%Y-%m-%d' 2>/dev/null || date -v-1d '+%Y-%m-%d')
REPORT="/tmp/soc-daily-${DATE}.txt"
AUTH_LOG="/var/log/auth.log"
NGINX_LOG="/var/log/nginx/access.log"

{
echo "╔════════════════════════════════════════════════════╗"
echo "║         SOC ЕЖЕДНЕВНЫЙ ОТЧЁТ: $DATE              ║"
echo "║         Хост: $(hostname)                         ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# === SSH СТАТИСТИКА ===
echo "━━━ SSH СОБЫТИЯ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FAILED_TODAY=$(grep "$(date '+%b %e')" "$AUTH_LOG" 2>/dev/null | grep -c "Failed password" || echo 0)
SUCCESS_TODAY=$(grep "$(date '+%b %e')" "$AUTH_LOG" 2>/dev/null | grep -c "Accepted" || echo 0)
UNIQUE_ATTACKERS=$(grep "$(date '+%b %e')" "$AUTH_LOG" 2>/dev/null | \
    grep "Failed password" | \
    grep -oP '(?<=from )\d+\.\d+\.\d+\.\d+' | \
    sort -u | wc -l || echo 0)

echo "  Неудачных попыток входа:    $FAILED_TODAY"
echo "  Успешных входов:            $SUCCESS_TODAY"
echo "  Уникальных атакующих IP:    $UNIQUE_ATTACKERS"
echo ""

echo "  Топ-5 атакующих IP:"
grep "$(date '+%b %e')" "$AUTH_LOG" 2>/dev/null | \
    grep "Failed password" | \
    grep -oP '(?<=from )\d+\.\d+\.\d+\.\d+' | \
    sort | uniq -c | sort -rn | head -5 | \
    awk '{printf "    %-5d попыток | %s\n", $1, $2}'
echo ""

echo "  Успешные входы:"
grep "$(date '+%b %e')" "$AUTH_LOG" 2>/dev/null | \
    grep "Accepted" | \
    awk '{print $9, $11}' | \
    sort -u | \
    awk '{printf "    Пользователь: %-15s | IP: %s\n", $1, $2}'
echo ""

# === SUDO АКТИВНОСТЬ ===
echo "━━━ SUDO АКТИВНОСТЬ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
grep "$(date '+%b %e')" "$AUTH_LOG" 2>/dev/null | \
    grep "sudo.*COMMAND" | \
    awk '{
        # Извлекаем пользователя и команду
        for(i=1;i<=NF;i++) {
            if($i ~ /^COMMAND=/) cmd=$i
            if($i ~ /^USER=/) user=$i
        }
        print user, cmd
    }' | head -10 | awk '{printf "  %s %s\n", $1, $2}'
echo ""

# === ВЕБ-СЕРВЕР СТАТИСТИКА ===
if [[ -f "$NGINX_LOG" ]]; then
    echo "━━━ ВЕБ-СЕРВЕР (NGINX) ━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    TOTAL_REQUESTS=$(wc -l < "$NGINX_LOG")
    REQUESTS_4XX=$(awk '$9~/^4/' "$NGINX_LOG" | wc -l)
    REQUESTS_5XX=$(awk '$9~/^5/' "$NGINX_LOG" | wc -l)

    echo "  Всего запросов:    $TOTAL_REQUESTS"
    echo "  4xx ошибок:        $REQUESTS_4XX"
    echo "  5xx ошибок:        $REQUESTS_5XX"
    echo ""
    echo "  Топ-5 запрашиваемых URL:"
    awk '{print $7}' "$NGINX_LOG" | sort | uniq -c | sort -rn | head -5 | \
        awk '{printf "    %5d | %s\n", $1, $2}'
    echo ""
fi

# === СИСТЕМНЫЕ СОБЫТИЯ ===
echo "━━━ СИСТЕМНЫЕ СОБЫТИЯ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Uptime: $(uptime -p 2>/dev/null || uptime)"
echo "  Загрузка CPU: $(uptime | awk -F'load average:' '{print $2}')"
echo "  Использование диска:"
df -h | grep -E "^/dev/" | awk '{printf "    %-20s %s использовано из %s (%s)\n", $6, $3, $2, $5}'
echo ""
echo "  Запущено процессов: $(ps aux | wc -l)"
echo "  Активных подключений: $(ss -t | grep ESTAB | wc -l)"
echo ""

# === ПРЕДУПРЕЖДЕНИЯ ===
echo "━━━ ПРЕДУПРЕЖДЕНИЯ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Проверка использования диска > 80%
df -h | grep -E "^/dev/" | awk '{
    gsub(/%/,"",$5)
    if($5+0 > 80) printf "  [WARN] Диск %s заполнен на %s%%\n", $6, $5
}'

# Проверка неудачных входов выше порога
if [[ $FAILED_TODAY -gt 100 ]]; then
    echo "  [ALERT] Высокое число неудачных SSH-входов: $FAILED_TODAY"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Отчёт сгенерирован: $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

} | tee "$REPORT"

# Отправка по email
if command -v mail &>/dev/null; then
    mail -s "[SOC] Ежедневный отчёт $DATE" soc@company.ru < "$REPORT"
fi

echo "Отчёт сохранён: $REPORT"
```

---

## 2.5.10 Лучшие практики работы с логами в SOC

### Чеклист SOC-аналитика

| Задача | Периодичность | Инструмент |
|---|---|---|
| Проверка auth.log на bruteforce | Непрерывно / каждую минуту | cron + bash |
| Анализ веб-логов на атаки | Каждые 5-15 минут | bash + grep/awk |
| Проверка целостности файлов | Ежедневно | FIM-скрипт / AIDE |
| Ротация и архивация логов | По расписанию | logrotate |
| Централизация логов | Постоянно | rsyslog / Filebeat |
| Корреляция событий | В реальном времени | SIEM |
| Проверка новых cron-задач | Ежедневно | bash |
| Ревью sudo-событий | Ежедневно | bash + email |

### Архитектура log pipeline для малого SOC

```
┌────────────────────────────────────────────────────────┐
│                  LOG PIPELINE (малый SOC)              │
│                                                        │
│  Источники           Сбор           Обработка  Хранение│
│                                                        │
│  Web Servers ──────► Filebeat ──────►          │      │
│  App Servers ──────► rsyslog  ──────► Logstash ► ES   │
│  Firewalls   ──────► syslog   ──────►          │      │
│  Endpoints   ──────► Winlogbeat ────►          │      │
│                                                        │
│                                       Kibana  ◄────────│
│                                       (визуализация)   │
│                                                        │
│  Bash-скрипты: быстрые алерты в реальном времени      │
│  cron: периодические проверки и отчёты                 │
└────────────────────────────────────────────────────────┘
```

---

## 📌 Итоги главы

- **Системные логи** Linux организованы в `/var/log/` и содержат критическую информацию для обнаружения инцидентов. Приоритетные файлы для SOC: `auth.log`, `audit.log`, `syslog`, `nginx/access.log`.

- **journalctl** — мощный инструмент для работы с systemd journal; поддерживает фильтрацию по времени, сервису, приоритету и вывод в JSON для интеграции с SIEM.

- **rsyslog** позволяет централизовать логи со множества серверов, применять фильтры и направлять события в разные файлы или удалённые системы.

- **Триада grep/awk/sed** — основной инструментарий обработки текстовых логов; позволяет за секунды обнаруживать аномалии в гигабайтах данных.

- **Bash-скрипты** автоматизируют рутинные SOC-задачи: детектирование bruteforce, анализ веб-атак, мониторинг целостности файлов, отправку алертов.

- **cron** — стандартный планировщик Linux для запуска SOC-скриптов по расписанию; критически важно мониторить и его журнал.

- Эффективный SOC требует **многоуровневой системы логирования**: быстрые алерты через bash + cron, централизованное хранение через rsyslog/Filebeat, долгосрочный анализ через SIEM.

---

## 🏠 Домашнее задание

1. **Базовое (обязательно):** Запустить на учебной VM скрипт `ssh-bruteforce-detector.sh`, смоделировать 15 неудачных SSH-попыток с помощью `hydra` (на localhost), убедиться что скрипт их обнаруживает.

2. **Среднее:** Написать bash-скрипт, который анализирует `/var/log/auth.log` и строит ASCII-гистограмму почасовой активности SSH-атак за последние 24 часа.

3. **Продвинутое:** Настроить полный pipeline: rsyslog → централизованный файл → bash-скрипт с анализом → алерт в Telegram. Добавить в cron с запуском каждые 2 минуты.

4. **Исследовательское:** Изучить формат CEF (Common Event Format) и написать функцию конвертации auth.log записей в CEF для отправки в SIEM.

---

## 🔗 Полезные ресурсы

| Ресурс | Описание | URL |
|---|---|---|
| The Linux Command Line | Полное руководство по bash | linuxcommand.org |
| Bash Hackers Wiki | Продвинутые техники bash | wiki.bash-hackers.org |
| rsyslog documentation | Официальная документация | rsyslog.com/doc |
| SANS Log Management | Руководство по управлению логами | sans.org/reading-room |
| Regex101 | Отладка регулярных выражений | regex101.com |
| explainshell.com | Разбор сложных shell-команд | explainshell.com |
| journalctl man page | `man journalctl` | — |
| Logrotate docs | `man logrotate` | — |
