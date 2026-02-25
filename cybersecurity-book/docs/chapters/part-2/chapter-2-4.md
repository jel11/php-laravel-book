# Глава 2.4: Сеть в Linux: SSH, iptables, curl

## Введение

Сетевая безопасность Linux — это область, где аналитик безопасности проводит значительную часть своего рабочего времени. SSH является основным протоколом удалённого управления и одновременно популярной целью атак. `iptables` — базовый брандмауэр, защищающий сервер на уровне ядра. Утилиты `curl`, `wget`, `ss` и `nmap` позволяют исследовать сетевое окружение, диагностировать проблемы и выявлять аномалии.

В этой главе мы разберём конфигурацию SSH с позиции hardeningа (усиления защиты), изучим принципы работы iptables и netfilter, освоим инструменты сетевой разведки и научимся проводить базовый сетевой форензик прямо из командной строки Linux.

---

## 2.4.1 SSH: теория и базовая настройка

### Что такое SSH и как он работает

**SSH** (Secure Shell) — криптографический протокол для безопасного удалённого управления системами. В отличие от telnet, все данные (включая пароли) передаются в зашифрованном виде.

Компоненты SSH:
- `sshd` — демон SSH-сервера, слушает входящие соединения
- `ssh` — клиент для подключения
- `ssh-keygen` — генерация ключевых пар
- `ssh-copy-id` — копирование публичного ключа на сервер
- `ssh-agent` — агент для хранения ключей в памяти

Алгоритмы SSH-соединения (упрощённо):
1. Клиент подключается к серверу
2. Обмен алгоритмами и ключами (key exchange / KEX)
3. Сервер подтверждает свою личность host key
4. Клиент аутентифицируется (пароль или ключ)
5. Шифрованный туннель установлен

```bash
# Подключение к удалённому серверу
ssh user@192.168.1.10
ssh user@server.example.com
ssh -p 2222 user@server.example.com    # Нестандартный порт

# Выполнить одну команду без интерактивного входа
ssh user@server "ps aux | grep nginx"

# Копирование файлов
scp local_file.txt user@server:/tmp/
scp -r /local/dir user@server:/remote/dir/
scp user@server:/remote/file.txt ./

# Монтирование удалённой файловой системы через SSH
sshfs user@server:/remote/path /local/mountpoint
fusermount -u /local/mountpoint   # Размонтировать
```

### Файл конфигурации SSH-сервера: /etc/ssh/sshd_config

Это главный файл настройки SSH-сервера. Каждое изменение требует перезапуска или перезагрузки sshd.

```bash
# Просмотр текущей конфигурации
cat /etc/ssh/sshd_config

# Проверка конфигурации на ошибки (ВСЕГДА делать перед перезапуском!)
sshd -t

# Подробная проверка
sshd -T | head -50

# Перезагрузить конфигурацию (без разрыва существующих сессий)
systemctl reload sshd

# Перезапустить (разрывает существующие сессии!)
systemctl restart sshd
```

Основные директивы `sshd_config`:

```bash
# /etc/ssh/sshd_config — базовая конфигурация

# --- Сетевые настройки ---
Port 22                          # Порт прослушивания
AddressFamily inet               # inet=IPv4, inet6=IPv6, any=оба
ListenAddress 0.0.0.0           # Адрес прослушивания (0.0.0.0 = все)
ListenAddress 192.168.1.10      # Только конкретный интерфейс

# --- Идентификация сервера ---
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key

# --- Аутентификация ---
LoginGraceTime 30               # Секунд на аутентификацию
PermitRootLogin no              # НИКОГДА не разрешать root!
StrictModes yes                 # Проверять права на ~/.ssh
MaxAuthTries 3                  # Попыток до разрыва соединения
MaxSessions 10                  # Макс. сессий на соединение

# --- Аутентификация по ключу ---
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

# --- Аутентификация по паролю ---
PasswordAuthentication no       # Отключить пароли (использовать ключи!)
PermitEmptyPasswords no         # Запретить пустые пароли
ChallengeResponseAuthentication no

# --- Разрешения ---
AllowUsers alice bob            # Белый список пользователей
AllowGroups sshusers            # Белый список групп
DenyUsers baduser               # Чёрный список
DenyGroups notssh               # Чёрный список групп

# --- Возможности ---
X11Forwarding no                # Отключить X11 forwarding
AllowTcpForwarding no           # Отключить port forwarding
AllowAgentForwarding no         # Отключить agent forwarding
PermitTunnel no                 # Отключить VPN-туннелирование

# --- Логирование ---
SyslogFacility AUTH
LogLevel VERBOSE                # INFO, VERBOSE, DEBUG (VERBOSE рекомендован)

# --- Таймаут сессии ---
ClientAliveInterval 300         # Проверять клиента каждые 300 сек
ClientAliveCountMax 2           # Разорвать после 2 неответов (10 мин)
TCPKeepAlive yes

# --- Баннер ---
Banner /etc/ssh/banner.txt      # Показывать баннер до входа
```

---

## 2.4.2 SSH: аутентификация по ключу

### Генерация ключевой пары

Аутентификация по ключу значительно безопаснее паролей: она устойчива к брутфорсу, фишингу и перехвату пароля.

```bash
# Генерация Ed25519 ключа (рекомендуется - современный и безопасный)
ssh-keygen -t ed25519 -C "alice@workstation" -f ~/.ssh/id_ed25519

# Генерация RSA-4096 (для совместимости со старыми системами)
ssh-keygen -t rsa -b 4096 -C "alice@workstation" -f ~/.ssh/id_rsa_server

# Параметры:
# -t   тип ключа (ed25519, rsa, ecdsa)
# -b   длина ключа (для RSA: минимум 2048, рекомендуется 4096)
# -C   комментарий (обычно email или описание)
# -f   путь к файлу (по умолчанию ~/.ssh/id_<type>)
# -N   фраза-пароль (passphrase) — оставьте пустой для автоматизации,
#      но для личных ключей ВСЕГДА устанавливайте!

# Результат: два файла
# ~/.ssh/id_ed25519       <- ПРИВАТНЫЙ КЛЮЧ (никогда никому не давать!)
# ~/.ssh/id_ed25519.pub   <- Публичный ключ (можно распространять)

# Просмотреть публичный ключ
cat ~/.ssh/id_ed25519.pub
# ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... alice@workstation

# Получить fingerprint ключа
ssh-keygen -lf ~/.ssh/id_ed25519.pub
# 256 SHA256:AbCdEf... alice@workstation (ED25519)
```

> **Важно:** Приватный ключ — это ваш пароль. Если он скомпрометирован, злоумышленник получит доступ ко всем системам, куда добавлен соответствующий публичный ключ. Всегда защищайте приватный ключ парольной фразой (passphrase).

### Установка ключа на сервер

```bash
# Метод 1: ssh-copy-id (самый простой)
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server

# Метод 2: Вручную
cat ~/.ssh/id_ed25519.pub | ssh user@server "mkdir -p ~/.ssh && \
    chmod 700 ~/.ssh && \
    cat >> ~/.ssh/authorized_keys && \
    chmod 600 ~/.ssh/authorized_keys"

# Метод 3: Если уже есть доступ к серверу
# На сервере:
mkdir -p ~/.ssh
echo "ssh-ed25519 AAAA... alice@workstation" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Проверить права (критически важно!)
ls -la ~/.ssh/
# drwx------  2 alice alice  ~/.ssh/              (700)
# -rw-------  1 alice alice  ~/.ssh/authorized_keys (600)
# -rw-------  1 alice alice  ~/.ssh/id_ed25519    (600)
# -rw-r--r--  1 alice alice  ~/.ssh/id_ed25519.pub (644)
```

### Файл ~/.ssh/config — клиентская конфигурация

```bash
# ~/.ssh/config — настройка SSH-клиента

# Глобальные настройки
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
    AddKeysToAgent yes
    IdentityFile ~/.ssh/id_ed25519

# Конкретный сервер
Host webserver
    HostName 192.168.1.10
    User alice
    Port 2222
    IdentityFile ~/.ssh/id_ed25519_webserver
    ForwardAgent no

Host bastion
    HostName bastion.example.com
    User jump-user
    IdentityFile ~/.ssh/id_ed25519_bastion

# Подключение через jump host (ProxyJump)
Host internal-server
    HostName 10.0.0.50
    User admin
    ProxyJump bastion
    IdentityFile ~/.ssh/id_ed25519

# Теперь: ssh internal-server
# Автоматически подключится через bastion!
```

```bash
# Использование SSH-агента для хранения ключей в памяти
eval $(ssh-agent)
ssh-add ~/.ssh/id_ed25519          # Добавить ключ (запросит passphrase)
ssh-add -l                          # Список загруженных ключей
ssh-add -D                          # Удалить все ключи из агента

# Подключиться с указанием конкретного ключа
ssh -i ~/.ssh/id_ed25519_server user@server
```

### Безопасность SSH: анализ логов

```bash
# Просмотр SSH-логов (Ubuntu/Debian)
tail -f /var/log/auth.log | grep sshd

# Просмотр через journald
journalctl -u ssh -f
journalctl -u ssh --since "1 hour ago"

# Примеры записей:
# Успешный вход по ключу:
# sshd[1234]: Accepted publickey for alice from 192.168.1.5 port 54321 ssh2:
#   ED25519 SHA256:AbCdEf...

# Неудачный вход по паролю:
# sshd[1234]: Failed password for root from 185.220.101.1 port 54321 ssh2

# Неверный пользователь:
# sshd[1234]: Invalid user admin from 185.220.101.1 port 33452

# Отказ в подключении (AllowUsers):
# sshd[1234]: User hacker from 10.0.0.5 not allowed because not listed in AllowUsers

# Подсчёт неудачных попыток по IP
grep "Failed password\|Invalid user" /var/log/auth.log | \
    grep -oP '(\d{1,3}\.){3}\d{1,3}' | \
    sort | uniq -c | sort -rn | head -20

# Топ атакующих IP
grep "Failed password" /var/log/auth.log | \
    awk '{print $11}' | sort | uniq -c | sort -rn | head -10
```

---

## 2.4.3 Hardening SSH: комплексная защита

### Усиленная конфигурация sshd_config

```bash
# /etc/ssh/sshd_config — production-конфигурация
# Применять ОСТОРОЖНО, убедитесь что у вас есть консольный доступ!

# Изменить порт (security through obscurity, но снижает шум в логах)
Port 2222

# Только IPv4
AddressFamily inet

# Запрет входа root
PermitRootLogin no

# Только ключи, никаких паролей
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
KbdInteractiveAuthentication no
UsePAM no

# Белый список пользователей
AllowUsers alice bob sysadmin

# Ограничение алгоритмов (только современные и безопасные)
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,umac-128-etm@openssh.com

# Только современные host keys
HostKey /etc/ssh/ssh_host_ed25519_key
HostKey /etc/ssh/ssh_host_rsa_key

# Ограничения доступа
LoginGraceTime 20
MaxAuthTries 3
MaxSessions 5
MaxStartups 10:30:60

# Отключить ненужные функции
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PermitTunnel no
GatewayPorts no

# Логирование
LogLevel VERBOSE
SyslogFacility AUTH

# Таймаут неактивных сессий
ClientAliveInterval 300
ClientAliveCountMax 2

# Баннер (предупреждение о мониторинге)
Banner /etc/ssh/banner.txt
```

```bash
# Создать баннер предупреждения
cat > /etc/ssh/banner.txt << 'EOF'
***************************************************************************
                    ПРЕДУПРЕЖДЕНИЕ / WARNING
***************************************************************************
Этот сервер является частной системой. Несанкционированный доступ запрещён.
Все действия на этой системе регистрируются и могут быть использованы
в качестве доказательства.

This system is for authorized users only. All activities are logged.
Unauthorized access is strictly prohibited and will be prosecuted.
***************************************************************************
EOF
```

### Fail2ban — автоматическая блокировка атакующих

```bash
# Установка
apt install fail2ban

# Конфигурация /etc/fail2ban/jail.local
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# Время бана (в секундах, -1 = навсегда)
bantime = 3600
# Временной интервал для подсчёта попыток
findtime = 600
# Количество попыток до бана
maxretry = 3
# Исключить локальную сеть
ignoreip = 127.0.0.1/8 192.168.1.0/24

[sshd]
enabled = true
port = 2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

[sshd-ddos]
enabled = true
port = 2222
filter = sshd-ddos
logpath = /var/log/auth.log
maxretry = 10
findtime = 60
bantime = 3600
EOF

# Управление fail2ban
systemctl enable fail2ban
systemctl start fail2ban

fail2ban-client status            # Статус всех jail
fail2ban-client status sshd       # Статус конкретного jail
fail2ban-client set sshd unbanip 192.168.1.5   # Разбанить IP
fail2ban-client get sshd banip                  # Список забаненных IP
```

---

## 2.4.4 iptables и netfilter

### Архитектура netfilter

**netfilter** — модуль ядра Linux, обеспечивающий фильтрацию пакетов. **iptables** — инструмент пользовательского пространства для управления netfilter правилами.

Путь пакета через netfilter:

```
Входящий пакет
      |
   PREROUTING  (NAT: DNAT, изменение маршрута)
      |
   Маршрутизация: для этого хоста?
      |                    |
     ДА                   НЕТ
      |                    |
   INPUT              FORWARD
      |                    |
 Локальный           POSTROUTING (NAT: SNAT/MASQUERADE)
 процесс                  |
      |              Исходящий пакет
   OUTPUT
      |
   POSTROUTING
      |
 Исходящий пакет
```

Таблицы iptables:
| Таблица | Назначение | Цепочки |
|---------|------------|---------|
| `filter` | Фильтрация пакетов (по умолчанию) | INPUT, OUTPUT, FORWARD |
| `nat` | Трансляция адресов | PREROUTING, POSTROUTING, OUTPUT |
| `mangle` | Изменение заголовков пакетов | Все пять |
| `raw` | Обход conntrack | PREROUTING, OUTPUT |

### Основы iptables

```bash
# Просмотр правил
iptables -L                          # Таблица filter, все цепочки
iptables -L -v                       # С счётчиками пакетов/байт
iptables -L -v -n                    # Без резолвинга имён (быстрее)
iptables -L -v -n --line-numbers     # С номерами строк
iptables -t nat -L -v -n             # Таблица NAT

# Политики по умолчанию (default policy)
iptables -P INPUT DROP               # По умолчанию: блокировать входящие
iptables -P OUTPUT ACCEPT            # По умолчанию: разрешать исходящие
iptables -P FORWARD DROP             # По умолчанию: блокировать транзит

# Очистка правил
iptables -F                          # Очистить все правила (ОСТОРОЖНО!)
iptables -F INPUT                    # Очистить только INPUT
iptables -X                          # Удалить пользовательские цепочки
iptables -Z                          # Обнулить счётчики

# Сохранение и восстановление правил
iptables-save > /etc/iptables/rules.v4
iptables-restore < /etc/iptables/rules.v4

# Автозагрузка на Ubuntu (пакет iptables-persistent):
apt install iptables-persistent
netfilter-persistent save
```

### Синтаксис iptables правил

```bash
# Базовый синтаксис:
# iptables [-t table] COMMAND chain [matches] -j TARGET

# Параметры команды:
# -A  append (добавить в конец)
# -I  insert (вставить, по умолчанию в начало)
# -D  delete (удалить)
# -R  replace (заменить)
# -L  list (показать)
# -F  flush (очистить)
# -P  policy (политика по умолчанию)

# Параметры сопоставления (matches):
# -p  протокол (tcp, udp, icmp, all)
# -s  источник (IP, сеть)
# -d  назначение (IP, сеть)
# -i  входящий интерфейс
# -o  исходящий интерфейс
# --sport  порт источника
# --dport  порт назначения

# Действия (targets):
# ACCEPT  - принять пакет
# DROP    - отбросить (без ответа, "пакет пропал")
# REJECT  - отклонить (с сообщением об ошибке)
# LOG     - записать в лог
# RETURN  - вернуться в вызывающую цепочку
```

### Практические правила iptables

```bash
# ============================================================
# Базовый stateful firewall для сервера
# ============================================================

# 1. Установить политики по умолчанию
iptables -P INPUT DROP
iptables -P OUTPUT ACCEPT
iptables -P FORWARD DROP

# 2. Разрешить loopback (localhost)
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# 3. Разрешить established и related соединения
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# 4. Разрешить SSH (ОСТОРОЖНО: сначала это, потом DROP!)
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -j ACCEPT

# Ограничить количество новых SSH-соединений (rate limiting)
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW \
    -m recent --name SSH --set
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW \
    -m recent --name SSH --update --seconds 60 --hitcount 4 -j DROP

# 5. Разрешить веб-трафик
iptables -A INPUT -p tcp --dport 80 -m conntrack --ctstate NEW -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -m conntrack --ctstate NEW -j ACCEPT

# 6. Разрешить ICMP (ping) с ограничением
iptables -A INPUT -p icmp --icmp-type echo-request -m limit \
    --limit 1/second --limit-burst 3 -j ACCEPT
iptables -A INPUT -p icmp --icmp-type echo-request -j DROP

# 7. Логировать и отбросить всё остальное
iptables -A INPUT -j LOG --log-prefix "[IPTABLES DROP] " --log-level 4
iptables -A INPUT -j DROP

# ============================================================
# Правила NAT (маскарадинг для роутера/gateway)
# ============================================================

# Разрешить форвардинг
echo 1 > /proc/sys/net/ipv4/ip_forward
# Или постоянно в /etc/sysctl.conf:
# net.ipv4.ip_forward = 1

# Маскарадинг (NAT) для внутренней сети
iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -o eth0 -j MASQUERADE

# Разрешить форвардинг между интерфейсами
iptables -A FORWARD -i eth1 -o eth0 -m conntrack --ctstate NEW -j ACCEPT
iptables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# ============================================================
# DNAT — перенаправление портов
# ============================================================

# Перенаправить внешний порт 8080 на внутренний сервер
iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT \
    --to-destination 192.168.1.100:80

# Перенаправить SSH на другой порт
iptables -t nat -A PREROUTING -p tcp --dport 2222 -j DNAT \
    --to-destination 192.168.1.10:22
```

### Продвинутые техники iptables

```bash
# ============================================================
# Защита от сканирования портов
# ============================================================

# Заблокировать nmap SYN-сканирование
iptables -A INPUT -p tcp --tcp-flags ALL NONE -j DROP         # NULL scan
iptables -A INPUT -p tcp --tcp-flags ALL ALL -j DROP           # XMAS scan
iptables -A INPUT -p tcp --tcp-flags ALL FIN,PSH,URG -j DROP  # FIN scan
iptables -A INPUT -p tcp --tcp-flags SYN,RST SYN,RST -j DROP  # SYN/RST

# ============================================================
# Защита от DDoS
# ============================================================

# Ограничить количество новых соединений с одного IP
iptables -A INPUT -p tcp --dport 80 -m connlimit --connlimit-above 50 -j REJECT

# Ограничить rate для ICMP
iptables -A INPUT -p icmp -m limit --limit 1/s --limit-burst 5 -j ACCEPT
iptables -A INPUT -p icmp -j DROP

# ============================================================
# Логирование подозрительного трафика
# ============================================================

# Создать пользовательскую цепочку для логирования
iptables -N LOGGING
iptables -A INPUT -j LOGGING
iptables -A LOGGING -m limit --limit 5/min -j LOG \
    --log-prefix "[FW DROP] " --log-level 7
iptables -A LOGGING -j DROP

# Просмотр логов iptables
journalctl -k | grep "FW DROP"
dmesg | grep "FW DROP"
grep "FW DROP" /var/log/kern.log
```

### nftables — современная замена iptables

```bash
# nftables — более современный и производительный инструмент
# Доступен в Ubuntu 20.04+, Debian 10+

# Показать текущие правила
nft list ruleset

# Базовая конфигурация /etc/nftables.conf
cat > /etc/nftables.conf << 'EOF'
#!/usr/sbin/nft -f
flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        # Loopback
        iifname lo accept

        # Established connections
        ct state established,related accept

        # SSH
        tcp dport 22 ct state new accept

        # HTTP/HTTPS
        tcp dport {80, 443} ct state new accept

        # ICMP
        icmp type echo-request limit rate 1/second accept

        # Логировать и отбросить
        log prefix "[nft drop] " drop
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }
}
EOF

nft -f /etc/nftables.conf
systemctl enable nftables
```

---

## 2.4.5 curl и wget для HTTP-тестирования

### curl — универсальный инструмент для HTTP

`curl` — мощный инструмент для работы с URL из командной строки. Незаменим для тестирования API, веб-приложений и сетевых служб.

```bash
# Основные методы HTTP
curl http://example.com                          # GET запрос
curl -X POST http://api.example.com/data        # POST
curl -X PUT http://api.example.com/item/1       # PUT
curl -X DELETE http://api.example.com/item/1   # DELETE

# Заголовки запроса
curl -H "Content-Type: application/json" \
     -H "Authorization: Bearer token123" \
     http://api.example.com/users

# Отправка данных (POST)
curl -X POST -d "username=alice&password=secret" http://login.example.com
curl -X POST -H "Content-Type: application/json" \
     -d '{"user":"alice","pass":"secret"}' \
     http://api.example.com/login

# Отправка файла
curl -X POST -F "file=@/path/to/file.jpg" http://upload.example.com

# Просмотр заголовков ответа
curl -I http://example.com                       # Только заголовки
curl -v http://example.com                       # Полный вербозный вывод
curl -s -o /dev/null -w "%{http_code}" http://example.com  # Только код ответа

# Следовать редиректам
curl -L http://example.com

# Сохранение в файл
curl -o output.html http://example.com
curl -O http://example.com/file.zip              # Сохранить с исходным именем

# Работа с cookies
curl -c cookies.txt http://example.com           # Сохранить cookies
curl -b cookies.txt http://example.com           # Использовать cookies
curl -b "session=abc123" http://example.com      # Отправить cookie

# Аутентификация
curl -u username:password http://protected.example.com   # Basic auth
curl -u username http://protected.example.com            # Запросить пароль
```

### curl для тестирования безопасности

```bash
# Проверка заголовков безопасности
curl -I https://example.com 2>&1 | grep -i \
    "strict-transport-security\|content-security-policy\|x-frame-options\|x-xss"

# Тестирование SQL-инъекции (только на авторизованных системах!)
curl "http://example.com/search?q=1' OR '1'='1"
curl "http://example.com/api/user/1; DROP TABLE users--"

# Тестирование SSRF (Server-Side Request Forgery)
curl "http://example.com/fetch?url=http://localhost/admin"
curl "http://example.com/fetch?url=file:///etc/passwd"

# Проверка SSL/TLS
curl -v https://example.com 2>&1 | grep -i "ssl\|tls\|cipher\|certificate"

# Проверка с игнорированием SSL-ошибок (для тестирования)
curl -k https://example.com

# Проверка конкретного TLS-сертификата
curl --cacert /path/to/ca.crt https://internal.example.com

# Тестирование заголовков с произвольным Host
curl -H "Host: admin.internal" http://192.168.1.10

# Тестирование HTTP-методов (разведка)
curl -X OPTIONS http://example.com -v 2>&1 | grep "Allow:"

# Замер времени ответа (диагностика)
curl -o /dev/null -s -w "
DNS: %{time_namelookup}s
Connect: %{time_connect}s
TLS: %{time_appconnect}s
TTFB: %{time_starttransfer}s
Total: %{time_total}s
" https://example.com
```

### wget для загрузки файлов

```bash
# Базовое использование
wget http://example.com/file.zip

# Рекурсивная загрузка сайта
wget -r --no-parent http://example.com/docs/

# Возобновляемая загрузка
wget -c http://example.com/large_file.iso

# Тихий режим (для скриптов)
wget -q -O output.html http://example.com

# С аутентификацией
wget --user=alice --password=secret http://protected.example.com

# Ограничение скорости
wget --limit-rate=100k http://example.com/file.zip

# Проверка заголовков
wget --server-response --spider http://example.com 2>&1 | head -30
```

---

## 2.4.6 Инструменты сетевой диагностики

### ss — статистика сокетов (современная замена netstat)

```bash
# Показать все TCP-соединения
ss -t

# Показать все UDP-соединения
ss -u

# Все слушающие порты с процессами
ss -tlnp

# Расшифровка флагов:
# -t  TCP
# -u  UDP
# -l  listening (слушающие)
# -n  числовые адреса (без резолвинга)
# -p  процессы

# Все соединения со статусами
ss -tanp

# Пример вывода:
# State    Recv-Q Send-Q  Local Address:Port  Peer Address:Port  Process
# LISTEN   0      128     0.0.0.0:22          0.0.0.0:*          users:(("sshd",pid=891,fd=3))
# LISTEN   0      511     0.0.0.0:80          0.0.0.0:*          users:(("nginx",pid=1234,fd=6))
# ESTAB    0      0       192.168.1.10:22     192.168.1.5:54321  users:(("sshd",pid=5678,fd=4))

# Фильтрация
ss -tnp state established          # Только установленные
ss -tnp state listening            # Только слушающие
ss 'dst 192.168.1.1'               # Соединения к конкретному IP
ss 'sport = :22'                   # По порту источника
ss 'dport = :443'                  # По порту назначения

# Статистика
ss -s

# Поиск всех соединений конкретного процесса
ss -tnp | grep "nginx"

# Поиск всех соединений к определённому порту
ss -tnp | grep ":4444"             # Классический backdoor-порт!
```

> **Важно для SOC:** Незнакомый порт в состоянии LISTEN или неожиданное исходящее соединение могут указывать на компрометацию. Всегда проверяйте PID процесса через `ss -tnp` и исследуйте его в `ps aux`.

### netstat — классический инструмент

```bash
# netstat всё ещё используется (пакет net-tools)
# Показать все слушающие порты
netstat -tlnp

# Все соединения
netstat -anp

# Статистика протоколов
netstat -s

# Таблица маршрутизации
netstat -r
ip route show    # Современный аналог
```

### nmap — сканирование сети из Linux CLI

> **Предупреждение:** Используйте nmap только в авторизованных сетях и системах. Несанкционированное сканирование является нарушением закона и политик безопасности.

```bash
# Базовое сканирование хоста
nmap 192.168.1.10

# Сканирование диапазона
nmap 192.168.1.0/24
nmap 192.168.1.1-50

# Быстрое сканирование (только 100 популярных портов)
nmap -F 192.168.1.10

# Определение версий служб
nmap -sV 192.168.1.10

# Определение ОС
nmap -O 192.168.1.10

# Полное сканирование с обнаружением ОС и служб
nmap -A 192.168.1.10

# SYN-сканирование (стелс, требует root)
nmap -sS 192.168.1.10

# Сканирование конкретных портов
nmap -p 22,80,443,3306 192.168.1.10
nmap -p 1-1000 192.168.1.10
nmap -p- 192.168.1.10            # Все 65535 портов (медленно!)

# Пинг-сканирование (только обнаружение хостов)
nmap -sn 192.168.1.0/24

# UDP-сканирование (медленнее, требует root)
nmap -sU -p 53,161,162 192.168.1.10

# Обход брандмауэров
nmap -sF 192.168.1.10            # FIN scan
nmap -sN 192.168.1.10            # NULL scan
nmap -sX 192.168.1.10            # XMAS scan

# Сохранение результатов
nmap -oN scan.txt 192.168.1.10   # Normal output
nmap -oX scan.xml 192.168.1.10   # XML output
nmap -oG scan.gnmap 192.168.1.10 # Grepable output
nmap -oA scan 192.168.1.10       # Все форматы

# NSE (Nmap Scripting Engine) — скрипты безопасности
nmap --script=vuln 192.168.1.10               # Проверка уязвимостей
nmap --script=ssh-brute 192.168.1.10          # Брутфорс SSH
nmap --script=http-headers 192.168.1.10       # HTTP-заголовки
nmap --script=ssl-cert 192.168.1.10 -p 443    # SSL-сертификат
nmap --script=default 192.168.1.10            # Стандартные скрипты
```

---

## 2.4.7 Сетевой форензик в Linux

### Захват трафика с tcpdump

```bash
# Базовый захват трафика
tcpdump -i eth0

# Захват в файл (для анализа в Wireshark)
tcpdump -i eth0 -w capture.pcap

# Чтение pcap-файла
tcpdump -r capture.pcap

# Фильтрация трафика
tcpdump -i eth0 port 22                  # Только SSH
tcpdump -i eth0 host 192.168.1.10       # Трафик с/к конкретному IP
tcpdump -i eth0 src 192.168.1.10        # Только от IP
tcpdump -i eth0 dst 192.168.1.10        # Только к IP

# Комбинированные фильтры
tcpdump -i eth0 'host 192.168.1.10 and port 80'
tcpdump -i eth0 'tcp and not port 22'
tcpdump -i eth0 '(src 10.0.0.1 or src 10.0.0.2) and port 443'

# Показать содержимое пакетов (ASCII)
tcpdump -i eth0 -A port 80

# Показать в hex
tcpdump -i eth0 -X port 53

# Ограничить количество пакетов
tcpdump -i eth0 -c 100 port 80

# Детальный вывод с временными метками
tcpdump -i eth0 -tttt port 443

# Практические примеры для SOC:
# Захватить DNS-запросы (обнаружение DNS tunneling)
tcpdump -i eth0 'port 53' -A | grep -v "^$"

# Захватить учётные данные HTTP (только для мониторинга своей сети!)
tcpdump -i eth0 -A 'port 80' | grep -i "POST\|password\|username"

# Обнаружить сканирование портов (много SYN без ACK)
tcpdump -i eth0 'tcp[tcpflags] & (tcp-syn) != 0'
```

### Анализ сетевых соединений при расследовании

```bash
#!/bin/bash
# Скрипт анализа сетевых соединений при инциденте

echo "=== СЕТЕВОЙ ФОРЕНЗИК ==="
echo "Время: $(date)"
echo "Хост: $(hostname)"
echo ""

# Все активные соединения
echo "--- Все TCP-соединения ---"
ss -tnap

echo ""
echo "--- Все UDP-соединения ---"
ss -unap

echo ""
echo "--- Слушающие порты ---"
ss -tlnp | column -t

echo ""
echo "--- Маршрутизация ---"
ip route show

echo ""
echo "--- ARP-таблица ---"
arp -n
ip neigh show

echo ""
echo "--- DNS-конфигурация ---"
cat /etc/resolv.conf

echo ""
echo "--- Сетевые интерфейсы ---"
ip addr show

echo ""
echo "--- Подозрительные соединения ---"
# Соединения на нестандартные порты (не 80, 443, 22, 25, 53)
ss -tnp | awk 'NR>1 {
    split($5,a,":");
    port = a[length(a)];
    if (port != "80" && port != "443" && port != "22" &&
        port != "25" && port != "53" && port != "*") {
        print "[ПРОВЕРИТЬ] " $0
    }
}'

echo ""
echo "--- Исходящие соединения (не ESTABLISHED в ожидаемые порты) ---"
ss -tnp state established | grep -v ":22\|:80\|:443\|:53\|:25"
```

### Проверка ARP и обнаружение ARP-spoofing

```bash
# Просмотр ARP-таблицы
arp -n
ip neigh show

# Обнаружить дублирующиеся MAC-адреса (признак ARP-spoofing!)
arp -n | awk '{print $3}' | sort | uniq -c | sort -rn | head
# Если один MAC у нескольких IP — возможно ARP-spoofing

# Статическая ARP-запись (защита от ARP-spoofing)
arp -s 192.168.1.1 aa:bb:cc:dd:ee:ff
ip neigh add 192.168.1.1 lladdr aa:bb:cc:dd:ee:ff dev eth0 nud permanent
```

### traceroute и диагностика маршрутов

```bash
# Трассировка маршрута
traceroute google.com
traceroute -n google.com         # Без резолвинга имён
traceroute -T -p 443 google.com  # TCP-трассировка на 443 порт

# mtr — объединяет ping и traceroute
mtr google.com
mtr -n -r --report google.com   # Отчёт в числовом виде

# Проверка DNS
nslookup example.com
dig example.com
dig example.com ANY              # Все записи
dig @8.8.8.8 example.com        # Через конкретный DNS
dig -x 192.168.1.10             # Обратный DNS

# Проверка доступности порта
nc -zv 192.168.1.10 22          # Проверить порт 22
nc -zv 192.168.1.10 1-1000      # Быстрое сканирование (nc)

# Тест TCP-соединения
timeout 3 bash -c 'cat < /dev/null > /dev/tcp/192.168.1.10/22' && \
    echo "Port open" || echo "Port closed"
```

---

## 2.4.8 Практические сценарии для SOC

### Сценарий 1: Обнаружение reverse shell

```bash
#!/bin/bash
# Поиск признаков reverse shell

echo "=== ПОИСК REVERSE SHELL ==="

# Стандартные порты reverse shell: 4444, 1234, 9001, etc.
echo "--- Нестандартные исходящие соединения ---"
ss -tnp state established | awk '{
    split($5,a,":");
    port = a[length(a)];
    if (port+0 > 1024 && port+0 != 8080 && port+0 != 8443) {
        print "Подозрительно: " $0
    }
}'

echo ""
echo "--- Процессы с сетевыми соединениями ---"
ss -tnp | grep -oP "pid=\d+" | sort -u | while read pidstr; do
    pid=$(echo "$pidstr" | grep -oP "\d+")
    cmd=$(ps -o cmd= -p "$pid" 2>/dev/null)
    echo "PID $pid: $cmd"
done

echo ""
echo "--- Shell-процессы с открытыми сокетами ---"
for pid in $(ss -tnp | grep -oP "pid=\d+" | grep -oP "\d+"); do
    cmd=$(ps -o cmd= -p "$pid" 2>/dev/null)
    if echo "$cmd" | grep -qE "bash|sh|python|perl|ruby|nc|ncat|socat"; then
        echo "[ALERT] PID=$pid: $cmd"
        echo "  Соединения:"
        ss -tnp | grep "pid=$pid"
    fi
done
```

### Сценарий 2: Мониторинг SSH-подключений

```bash
#!/bin/bash
# Мониторинг SSH в режиме реального времени

LOG="/var/log/auth.log"

echo "=== SSH МОНИТОР (Ctrl+C для выхода) ==="
echo "Мониторинг: $LOG"
echo ""

tail -f "$LOG" | while read line; do
    # Успешный вход
    if echo "$line" | grep -q "Accepted"; then
        USER=$(echo "$line" | grep -oP "for \K\S+")
        IP=$(echo "$line" | grep -oP "from \K[\d.]+")
        METHOD=$(echo "$line" | grep -oP "Accepted \K\S+")
        echo "[$(date '+%H:%M:%S')] УСПЕШНЫЙ ВХОД: $USER с $IP ($METHOD)"

        # Алерт если вход под root
        if [ "$USER" = "root" ]; then
            echo "!!! КРАСНЫЙ ФЛАГ: Вход под ROOT с $IP !!!"
        fi

    # Неудачная попытка
    elif echo "$line" | grep -q "Failed password"; then
        USER=$(echo "$line" | grep -oP "for \K\S+")
        IP=$(echo "$line" | grep -oP "from \K[\d.]+")
        echo "[$(date '+%H:%M:%S')] НЕУДАЧА: попытка входа $USER с $IP"

    # Неверный пользователь
    elif echo "$line" | grep -q "Invalid user"; then
        USER=$(echo "$line" | grep -oP "Invalid user \K\S+")
        IP=$(echo "$line" | grep -oP "from \K[\d.]+")
        echo "[$(date '+%H:%M:%S')] НЕСУЩ. ПОЛЬЗОВАТЕЛЬ: $USER с $IP"

    # Разрыв соединения
    elif echo "$line" | grep -q "Disconnected"; then
        echo "[$(date '+%H:%M:%S')] Разрыв: $(echo $line | grep -oP 'Disconnected.*')"
    fi
done
```

### Сценарий 3: Базовый скрипт firewall для сервера

```bash
#!/bin/bash
# firewall-setup.sh — базовая настройка iptables для веб-сервера
# Использование: sudo bash firewall-setup.sh [setup|status|reset]

ADMIN_IP="192.168.1.0/24"  # Подсеть администраторов
SSH_PORT=22
HTTP_PORT=80
HTTPS_PORT=443

setup_firewall() {
    echo "[*] Настройка firewall..."

    # Сохранить текущие правила (на случай ошибки)
    iptables-save > /tmp/iptables_backup_$(date +%Y%m%d).rules

    # Очистить существующие правила
    iptables -F
    iptables -X
    iptables -t nat -F
    iptables -t mangle -F

    # Политики по умолчанию
    iptables -P INPUT DROP
    iptables -P OUTPUT ACCEPT
    iptables -P FORWARD DROP

    # --- INPUT ---
    # Loopback
    iptables -A INPUT -i lo -j ACCEPT

    # Установленные соединения
    iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

    # Invalid пакеты
    iptables -A INPUT -m conntrack --ctstate INVALID -j DROP

    # SSH только из подсети администраторов + rate limiting
    iptables -A INPUT -s "$ADMIN_IP" -p tcp --dport "$SSH_PORT" \
        -m conntrack --ctstate NEW \
        -m recent --name SSH --set
    iptables -A INPUT -s "$ADMIN_IP" -p tcp --dport "$SSH_PORT" \
        -m conntrack --ctstate NEW \
        -m recent --name SSH --update --seconds 60 --hitcount 4 -j LOG \
        --log-prefix "[SSH LIMIT] "
    iptables -A INPUT -s "$ADMIN_IP" -p tcp --dport "$SSH_PORT" \
        -m conntrack --ctstate NEW \
        -m recent --name SSH --update --seconds 60 --hitcount 4 -j DROP
    iptables -A INPUT -s "$ADMIN_IP" -p tcp --dport "$SSH_PORT" \
        -m conntrack --ctstate NEW -j ACCEPT

    # HTTP/HTTPS
    iptables -A INPUT -p tcp --dport "$HTTP_PORT" \
        -m conntrack --ctstate NEW -j ACCEPT
    iptables -A INPUT -p tcp --dport "$HTTPS_PORT" \
        -m conntrack --ctstate NEW -j ACCEPT

    # ICMP ping с ограничением
    iptables -A INPUT -p icmp --icmp-type echo-request \
        -m limit --limit 1/sec --limit-burst 3 -j ACCEPT

    # Защита от scan
    iptables -A INPUT -p tcp --tcp-flags ALL NONE -j DROP
    iptables -A INPUT -p tcp --tcp-flags ALL ALL -j DROP

    # Лог и дроп остального
    iptables -A INPUT -j LOG --log-prefix "[FW DROP] " --log-level 4
    iptables -A INPUT -j DROP

    # Сохранить правила
    iptables-save > /etc/iptables/rules.v4
    echo "[+] Firewall настроен и сохранён"
}

show_status() {
    echo "=== СТАТУС FIREWALL ==="
    iptables -L -v -n --line-numbers
}

reset_firewall() {
    echo "[!] Сброс firewall..."
    iptables -F
    iptables -X
    iptables -P INPUT ACCEPT
    iptables -P OUTPUT ACCEPT
    iptables -P FORWARD ACCEPT
    echo "[+] Все правила удалены, политика ACCEPT"
}

case "$1" in
    setup)   setup_firewall ;;
    status)  show_status ;;
    reset)   reset_firewall ;;
    *)       echo "Использование: $0 setup|status|reset" ;;
esac
```

---

## Итоги главы

В этой главе мы изучили ключевые сетевые инструменты и технологии Linux с точки зрения безопасности:

**SSH:**
- Всегда отключать аутентификацию по паролю (`PasswordAuthentication no`)
- Использовать Ed25519 ключи — они современны, быстры и безопасны
- `PermitRootLogin no` — обязательная настройка
- `AllowUsers` создаёт белый список, что всегда лучше `DenyUsers`
- Fail2ban автоматически блокирует брутфорс-атаки
- Логи SSH в `/var/log/auth.log` содержат всю историю входов

**iptables/netfilter:**
- Stateful фильтрация (`conntrack`) эффективнее stateless
- Политика по умолчанию `DROP` + явные правила `ACCEPT` — правильный подход
- Rate limiting защищает от DDoS и брутфорса
- nftables — современная замена iptables, рекомендуется для новых систем

**Инструменты диагностики:**
- `ss -tnap` — быстрый способ увидеть все соединения с процессами
- `curl -v` — детальная диагностика HTTP-взаимодействий
- `tcpdump` — захват трафика для глубокого анализа
- `nmap` — разведка сети (только в авторизованных окружениях)

**Ключевые команды для SOC-аналитика:**
```bash
# Мгновенная сетевая картина при инциденте
ss -tnap                                    # Все соединения
ss -tnp state established | grep -v ":22\|:80\|:443"  # Подозрительные
netstat -tlnp                               # Слушающие порты
tcpdump -i eth0 -c 100 -w /tmp/capture.pcap # Захват трафика
grep "Failed\|Invalid\|Accepted" /var/log/auth.log | tail -50  # SSH-логи
iptables -L -v -n                           # Правила firewall
```

---

## Практические задания

### Задание 1: Hardening SSH

На тестовой виртуальной машине:
1. Сгенерируйте Ed25519 ключевую пару
2. Настройте аутентификацию только по ключу
3. Примените конфигурацию из раздела 2.4.3
4. Проверьте через `sshd -T | grep -i "passwordauth\|permitroot\|allowusers"`
5. Установите и настройте fail2ban
6. Проверьте, что брутфорс невозможен (попробуйте `ssh root@localhost`)

### Задание 2: Анализ SSH-логов

```bash
# Создайте скрипт, который:
# 1. Читает /var/log/auth.log
# 2. Подсчитывает попытки входа по IP
# 3. Выводит топ-10 атакующих IP
# 4. Выводит список успешных входов
# 5. Предупреждает о входах под root

# Шаблон:
#!/bin/bash
LOG="/var/log/auth.log"
echo "=== Топ атакующих IP ==="
# Ваш код...
echo "=== Успешные входы ==="
# Ваш код...
```

### Задание 3: Настройка iptables

Настройте iptables для веб-сервера:
1. Политика DROP по умолчанию для INPUT
2. Разрешить SSH только с вашего IP
3. Разрешить HTTP и HTTPS
4. Ограничить SSH до 3 попыток в минуту
5. Логировать все заблокированные пакеты
6. Сохранить правила для автозагрузки

Проверьте:
```bash
nmap -sS localhost        # С другого хоста
curl -I http://localhost
ssh -o ConnectTimeout=5 wronguser@localhost
grep "FW DROP" /var/log/kern.log | tail -10
```

### Задание 4: Сетевой форензик

**Сценарий:** Вы подозреваете, что на сервере установлен backdoor.

Выполните расследование:
1. `ss -tnap` — найти все активные соединения
2. Для каждого нестандартного соединения найти процесс
3. `ls -la /proc/<PID>/exe` — проверить путь к бинарнику
4. `tcpdump -i eth0 -w /tmp/evidence.pcap` — захватить 60 секунд трафика
5. Проанализировать pcap: `tcpdump -r /tmp/evidence.pcap -n`

### Задание 5: curl для тестирования безопасности

На тестовом сервере DVWA (Damn Vulnerable Web Application):
1. Проверьте заголовки безопасности: `curl -I http://localhost/dvwa/`
2. Выполните тест SQL-инъекции через curl
3. Проверьте все разрешённые HTTP-методы
4. Измерьте время ответа при нормальной нагрузке
5. Создайте bash-скрипт для периодического мониторинга доступности с записью кодов ответа

```bash
#!/bin/bash
# Шаблон монитора доступности
URL="http://localhost"
LOG="/var/log/http_monitor.log"

while true; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
    echo "$(date '+%Y-%m-%d %H:%M:%S') $URL: $CODE" >> "$LOG"
    [ "$CODE" != "200" ] && echo "ALERT: $URL вернул $CODE!"
    sleep 60
done
```
