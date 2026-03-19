# Глава 3.2: Active Directory и Kerberos

## 🎯 Цели главы

- Понять архитектуру Active Directory: домен, лес, OU, объекты
- Знать ключевые объекты AD и их роль в инфраструктуре
- Понимать, как работают групповые политики (GPO)
- Знать протокол LDAP и Distinguished Name
- Разбираться в Kerberos-аутентификации пошагово
- Понимать основные атаки на Kerberos на уровне SOC
- Знать Event ID для обнаружения Kerberos-атак

---

## 3.2.1 Что такое Active Directory

Active Directory (AD) — это служба каталогов от Microsoft, которая хранит информацию обо всех объектах корпоративной сети: пользователях, компьютерах, группах, принтерах, политиках. AD обеспечивает централизованную аутентификацию и авторизацию в домене Windows.

Без AD каждый компьютер управляет своими пользователями самостоятельно — это называется **рабочая группа (Workgroup)**. С AD — одна учётная запись `john.doe@corp.local` работает на любом компьютере домена.

### Домен (Domain)

Домен — основная единица AD. Это логическое объединение объектов (пользователей, компьютеров) под одним DNS-именем.

```
corp.local       ← DNS-имя домена (FQDN)
CORP             ← NetBIOS-имя домена
```

В каждом домене есть минимум один **Domain Controller (DC)** — сервер с ролью AD DS (Active Directory Domain Services). DC хранит базу данных AD (`NTDS.dit`), обрабатывает аутентификацию и хранит ключи Kerberos.

### Лес (Forest) и Дерево доменов (Tree)

```
Forest: company.com
  │
  ├── Tree 1: company.com (корневой домен)
  │     ├── europe.company.com (дочерний домен)
  │     └── asia.company.com
  │
  └── Tree 2: subsidiary.com (другая компания в том же лесу)
```

- **Forest** — высший уровень иерархии. Все домены в лесу доверяют друг другу (transitive trust).
- **Tree** — дерево доменов с общим пространством имён DNS.
- **Domain** — отдельный домен внутри дерева.

Для SOC важно: **лес** — граница безопасности. Скомпрометированный домен может дать доступ ко всему лесу через trust-отношения.

### Роли DC (FSMO Roles)

В лесу/домене есть специальные роли DC:
- **PDC Emulator** — обрабатывает блокировки паролей, синхронизацию времени
- **RID Master** — выдаёт диапазоны RID для создания объектов
- **Infrastructure Master** — обновляет ссылки между доменами
- **Schema Master** — управляет схемой AD (один на лес)
- **Domain Naming Master** — управляет именами доменов (один на лес)

---

## 3.2.2 Объекты Active Directory

Всё в AD — объект. Каждый объект имеет класс (user, computer, group...) и набор атрибутов.

### Пользователи (Users)

```
Класс:     user
Атрибуты:
  sAMAccountName: john.doe       ← имя для входа (pre-Windows 2000)
  userPrincipalName: john.doe@corp.local  ← UPN (email-формат)
  distinguishedName: CN=John Doe,OU=IT,DC=corp,DC=local
  memberOf: [CN=IT-Staff,...], [CN=VPN-Users,...]
  lastLogon: 133500234567890000  (100-ns интервалы с 1601-01-01)
  pwdLastSet: 133499234567890000
  userAccountControl: 512        ← флаги состояния аккаунта
```

**userAccountControl — важные флаги:**

| Значение | Флаг | Значение |
|----------|------|----------|
| 0x0002 | ACCOUNTDISABLE | Аккаунт отключён |
| 0x0010 | LOCKOUT | Аккаунт заблокирован |
| 0x0020 | PASSWD_NOTREQD | Пароль не требуется |
| 0x0040 | PASSWD_CANT_CHANGE | Нельзя менять пароль |
| 0x0200 | NORMAL_ACCOUNT | Обычный аккаунт |
| 0x10000 | DONT_EXPIRE_PASSWORD | Пароль не истекает |
| 0x400000 | **DONT_REQ_PREAUTH** | Не требует Kerberos пре-аутентификацию → AS-REP Roasting! |

### Компьютеры (Computers)

Компьютерные объекты — это тоже аккаунты! Имя заканчивается на `$`:
```
sAMAccountName: WORKSTATION01$
distinguishedName: CN=WORKSTATION01,OU=Workstations,DC=corp,DC=local
```

Машинные аккаунты имеют свои пароли (автоматически меняются каждые 30 дней). При Pass-the-Hash атаках иногда используются машинные аккаунты.

### Группы (Groups)

**По типу:**
- **Security** — используются для разрешений (добавляются в ACL)
- **Distribution** — только для email-рассылок (Exchange)

**По области действия:**
- **Domain Local** — видна только в своём домене, может содержать объекты из любых доменов
- **Global** — видна во всём лесу, содержит только объекты своего домена
- **Universal** — видна во всём лесу, содержит объекты из любых доменов

**Привилегированные встроенные группы:**

| Группа | Привилегии |
|--------|-----------|
| Domain Admins | Полный контроль над доменом |
| Enterprise Admins | Полный контроль над лесом |
| Schema Admins | Изменение схемы AD |
| Administrators | Локальные администраторы DC |
| Account Operators | Управление аккаунтами |
| Backup Operators | Права резервного копирования |
| Remote Desktop Users | RDP-доступ |

### Organizational Units (OU)

OU — контейнеры для организации объектов AD. Позволяют применять GPO к подмножеству объектов и делегировать административные права.

```
corp.local
├── OU=IT
│   ├── OU=Servers
│   ├── OU=Workstations
│   └── OU=ServiceAccounts
├── OU=HR
│   └── OU=Workstations
└── OU=Finance
    ├── OU=Users
    └── OU=Workstations
```

**Отличие OU от Groups:** OU — организационный контейнер для применения политик, Group — механизм контроля доступа.

---

## 3.2.3 Групповые политики (GPO)

Group Policy Object (GPO) — набор настроек, применяемых к компьютерам и пользователям в AD.

### Что можно настроить через GPO

- **Безопасность:** политика паролей, блокировки, права пользователей
- **Программное обеспечение:** установка, обновление, удаление ПО
- **Скрипты:** запуск при входе/выходе, старте/останове системы
- **Реестр:** настройки реестра для машин и пользователей
- **Ограничения:** блокировка USB, запрет запуска программ (AppLocker/SRP)
- **Аудит:** включение/отключение аудита событий

### Порядок применения GPO (LSDOU)

GPO применяются в следующем порядке (каждый следующий перекрывает предыдущий):
1. **L**ocal — локальные политики компьютера
2. **S**ite — политики AD-сайта
3. **D**omain — политики домена (пример: Default Domain Policy)
4. **OU** — политики OU (от корневого к дочернему)

**Принцип:** Последнее применённое правило побеждает. OU-политики переопределяют домен-политики.

### Просмотр применённых GPO

```cmd
gpresult /r           # краткий отчёт в консоли
gpresult /h gpo.html  # подробный HTML-отчёт
rsop.msc             # Resultant Set of Policy — GUI
```

---

## 3.2.4 LDAP — протокол доступа к AD

Lightweight Directory Access Protocol (LDAP) — протокол для чтения и записи данных в AD. Работает на порту **389** (LDAP) или **636** (LDAPS с TLS).

### Distinguished Name (DN)

DN — уникальное имя объекта в AD, определяет его полный путь:

```
CN=John Doe,OU=IT,OU=Users,DC=corp,DC=local
│              │              │
│              │              └── Domain Component (часть DNS-имени)
│              └── Organizational Unit
└── Common Name (имя объекта)
```

Компоненты DN:
- `CN` — Common Name (имя объекта)
- `OU` — Organizational Unit
- `DC` — Domain Component (часть DNS-имени домена)
- `O` — Organization (редко используется)

**Примеры DN:**
```
CN=Domain Admins,CN=Users,DC=corp,DC=local          ← группа
CN=WORKSTATION01,OU=Workstations,DC=corp,DC=local   ← компьютер
CN=Administrator,CN=Users,DC=corp,DC=local           ← пользователь
```

### LDAP-запросы

LDAP поддерживает фильтрацию объектов. Примеры фильтров:

```text
# Все пользователи домена
(objectClass=user)

# Пользователь по sAMAccountName
(sAMAccountName=john.doe)

# Все члены группы Domain Admins
(memberOf=CN=Domain Admins,CN=Users,DC=corp,DC=local)

# Все отключённые аккаунты
(&(objectClass=user)(userAccountControl:1.2.840.113556.1.4.803:=2))

# Аккаунты без преаутентификации Kerberos (AS-REP Roastable!)
(&(objectClass=user)(userAccountControl:1.2.840.113556.1.4.803:=4194304))

# Аккаунты с SPN (Kerberoastable!)
(&(objectClass=user)(servicePrincipalName=*))
```

### Утилиты для работы с LDAP

```powershell
# PowerShell — поиск в AD
Get-ADUser -Filter {SamAccountName -eq "john.doe"} -Properties *
Get-ADGroupMember -Identity "Domain Admins"
Get-ADComputer -Filter * -SearchBase "OU=Servers,DC=corp,DC=local"

# ldapsearch (Linux)
ldapsearch -H ldap://dc01.corp.local -D "john.doe@corp.local" \
           -w "Password123" -b "DC=corp,DC=local" "(objectClass=user)"
```

---

## 3.2.5 Kerberos — аутентификация шаг за шагом

Kerberos — протокол аутентификации с использованием билетов (tickets). Основные принципы:
- **Пароль никогда не передаётся по сети**
- Вместо паролей используются **зашифрованные билеты** с ограниченным сроком жизни
- Центральный элемент — **KDC (Key Distribution Center)**, который живёт на DC

### Участники Kerberos

- **Client** — пользователь или компьютер, запрашивающий доступ
- **KDC (Key Distribution Center)** — DC, состоит из:
  - **AS (Authentication Service)** — выдаёт TGT
  - **TGS (Ticket Granting Service)** — выдаёт Service Tickets
- **Service** — ресурс, к которому клиент хочет получить доступ (файловый сервер, SQL и т.д.)
- **krbtgt** — специальный аккаунт, чей хеш используется для подписи всех TGT

### Шаг 1: AS-REQ — запрос TGT

Клиент хочет войти. Он отправляет на KDC (AS):

```
AS-REQ содержит:
- Имя пользователя (в открытом виде)
- Имя TGS-сервиса (krbtgt/CORP.LOCAL)
- Временную метку, зашифрованную хешем пароля пользователя
  (pre-authentication — доказательство знания пароля)
- Nonce (случайное число)
```

Порт: **UDP/TCP 88** (Kerberos)

### Шаг 2: AS-REP — получение TGT

KDC проверяет временную метку (расшифровывает хешем пароля из AD). Если OK:

```
AS-REP содержит:
- Session Key (зашифрован хешем пароля пользователя)
- TGT (Ticket Granting Ticket):
    Зашифрован хешем krbtgt
    Внутри: имя пользователя, Session Key, PAC (Group memberships), время жизни
```

**TGT** — как паспорт. Клиент хранит его в памяти (Credential Cache). Срок жизни — 10 часов (по умолчанию). TGT нельзя расшифровать клиентом — только KDC.

### Шаг 3: TGS-REQ — запрос Service Ticket

Клиент хочет обратиться к файловому серверу `FS01`. Он отправляет TGS (часть KDC):

```
TGS-REQ содержит:
- TGT (как доказательство личности)
- Аутентификатор (временная метка), зашифрованный Session Key из TGT
- SPN (Service Principal Name) нужного сервиса:
    cifs/FS01.corp.local  ← SMB к файловому серверу
    http/webapp.corp.local
    MSSQLSvc/sql01.corp.local:1433
```

**SPN** — уникальный идентификатор сервиса в AD. Каждый сервис регистрирует свой SPN.

### Шаг 4: TGS-REP — получение Service Ticket

KDC расшифровывает TGT своим ключом (хеш krbtgt), проверяет аутентификатор:

```
TGS-REP содержит:
- Service Session Key (зашифрован Session Key из TGT — клиент может расшифровать)
- Service Ticket (ST):
    Зашифрован хешем аккаунта сервиса (FS01$)
    Внутри: имя пользователя, PAC, Service Session Key, время жизни
```

**Важно для атак:** Service Ticket зашифрован хешем сервисного аккаунта. Клиент не может его расшифровать, но может запросить для любого SPN и унести оффлайн — именно это эксплуатирует **Kerberoasting**.

### Шаг 5: AP-REQ — использование Service Ticket

Клиент обращается к файловому серверу:

```
AP-REQ содержит:
- Service Ticket
- Аутентификатор (зашифрован Service Session Key)
```

Сервер расшифровывает Service Ticket своим хешем, проверяет PAC (группы пользователя) и принимает решение об авторизации.

### Диаграмма Kerberos-аутентификации

```
Client                    KDC (DC)                    Service (FS01)
  │                         │                              │
  │──── AS-REQ ────────────>│                              │
  │     (username +         │                              │
  │      encrypted timestamp)│                             │
  │                         │                              │
  │<─── AS-REP ─────────────│                              │
  │     (TGT + Session Key) │                              │
  │                         │                              │
  │─────────────────────────│                              │
  │  Client stores TGT in   │                              │
  │  Kerberos ticket cache  │                              │
  │─────────────────────────│                              │
  │                         │                              │
  │  (later, accessing FS01)│                              │
  │                         │                              │
  │──── TGS-REQ ───────────>│                              │
  │     (TGT + SPN:         │                              │
  │      cifs/FS01)         │                              │
  │                         │                              │
  │<─── TGS-REP ────────────│                              │
  │     (Service Ticket +   │                              │
  │      Service Session Key)│                             │
  │                         │                              │
  │─────────────────────────────────── AP-REQ ────────────>│
  │                                    (Service Ticket +   │
  │                                     Authenticator)     │
  │                                                        │
  │<──────────────────────────────────── AP-REP ───────────│
  │                                    (Optional mutual    │
  │                                     authentication)    │
```

### PAC (Privilege Attribute Certificate)

PAC — это структура внутри Service Ticket, содержащая:
- SID пользователя
- SID всех групп, в которых состоит пользователь
- Время входа
- Подписана ключами KDC

Сервис читает PAC и определяет, что может делать пользователь. Атаки типа **Golden Ticket** подделывают PAC.

---

## 3.2.6 Атаки на Kerberos — взгляд SOC

### Pass-the-Ticket (PtT)

**Суть:** Кража TGT или Service Ticket из памяти машины и использование на другой машине.

**Как:** Инструменты типа `mimikatz` (команда `sekurlsa::tickets /export`) экспортируют билеты из памяти. Затем `kerberos::ptt ticket.kirbi` — импорт на атакующей машине.

**В логах:**
```
Event 4624 — Logon Type 3 или 9
Event 4672 — привилегии назначены
Важно: событие происходит на другой машине, не там, где был вход
Аномалия: один и тот же LogonID используется на двух разных машинах
```

**Защита:** Protected Users group, Credential Guard (изолирует LSASS в виртуальной среде).

---

### Kerberoasting

**Суть:** Любой аутентифицированный пользователь домена может запросить Service Ticket для любого SPN. Service Ticket зашифрован хешем сервисного аккаунта. Атакующий сохраняет тикет и взламывает хеш оффлайн.

**Шаги атаки:**
1. Найти аккаунты с SPN: `GetUserSPNs.py corp.local/user:password`
2. Запросить Service Tickets: `Rubeus kerberoast`
3. Получить хеши в формате `$krb5tgs$23$...`
4. Взломать оффлайн: `hashcat -m 13100 hashes.txt wordlist.txt`

**В логах:**
```
Event ID 4769 — Kerberos Service Ticket Requested
- TicketOptions: 0x40810000 (Renewable, Canonicalize, Renewable-OK)
- TicketEncryptionType: 0x17 (RC4-HMAC) ← RC4 вместо AES подозрительно!
```

**Признак Kerberoasting:** Множество 4769 от одного аккаунта к разным SPN за короткое время. Или запрос ST с `EncryptionType = 0x17 (RC4)`, тогда как в современных AD используется AES.

**Защита:** Использовать аккаунты с длинными рандомными паролями (>25 символов), использовать Managed Service Accounts (gMSA), мониторить 4769 с RC4.

---

### AS-REP Roasting

**Суть:** Если у аккаунта флаг `DONT_REQ_PREAUTH`, можно запросить TGT без знания пароля. Ответ AS-REP содержит данные, зашифрованные хешем пароля — взламываем оффлайн.

**Условие:** Аккаунт имеет `DONT_REQ_PREAUTH` (userAccountControl = 4194304).

**В логах:**
```
Event ID 4768 — Kerberos Authentication Service Request (AS-REQ)
- PreAuthType: 0 (нет пре-аутентификации!)
- Result Code: 0x0 (успех) — при наличии флага DONT_REQ_PREAUTH
```

**Признак:** 4768 с PreAuthType=0, особенно для нескольких аккаунтов.

**Защита:** Найти и исправить аккаунты с DONT_REQ_PREAUTH:
```powershell
Get-ADUser -Filter {DoesNotRequirePreAuth -eq $true} -Properties DoesNotRequirePreAuth
```

---

### Golden Ticket

**Суть:** Если атакующий получил хеш NTLM аккаунта `krbtgt`, он может создавать TGT от имени любого пользователя с любыми группами, с любым сроком жизни.

**Последствия:** Полный контроль над доменом, даже если пароли всех пользователей сменены. Golden Ticket работает, пока не сменён пароль `krbtgt` (причём дважды — из-за истории паролей AD).

**В логах:**
```
Event ID 4624 — Logon
- Account Domain: (пустое или неправильное имя домена)
- Аномалия: LogonType 3 без предшествующего 4776/4768
```

Золотые билеты сложно обнаружить классическими методами. Нужны решения типа Microsoft Defender for Identity (MDI), который анализирует временные метки в PAC.

---

### Silver Ticket

**Суть:** Если атакующий получил хеш NTLM машинного или сервисного аккаунта (например, `FILESERVER01$`), он может создавать Service Tickets для этого сервера от имени любого пользователя.

**В логах:** Нет события 4768/4769 на DC — Service Ticket создаётся без обращения к KDC! Аномалия: аутентификация к сервису без предшествующего TGS-запроса на DC.

---

## 3.2.7 Event ID для мониторинга Kerberos

| Event ID | Описание | Где генерируется | На что смотреть |
|----------|----------|-----------------|----------------|
| **4768** | Kerberos TGT запрошен (AS-REQ) | DC | PreAuthType=0 → AS-REP Roasting |
| **4769** | Kerberos Service Ticket запрошен | DC | EncryptionType=0x17 (RC4) → Kerberoasting; множество запросов от одного аккаунта |
| **4770** | Kerberos Service Ticket обновлён | DC | Аномально большое количество обновлений |
| **4771** | Kerberos pre-authentication failed | DC | FailureCode=0x18 → неверный пароль; брутфорс |
| **4672** | Привилегии назначены | Рабочая станция/сервер | После 4624 — проверить, ожидался ли этот вход |

### Детальный разбор Event ID 4768

```
EventID: 4768
Account Name:       john.doe
Supplied Realm Name: CORP
User ID:            S-1-5-21-...
Service Name:       krbtgt/CORP
Service ID:         S-1-5-21-...-502
Ticket Options:     0x40810010
Result Code:        0x0          ← 0x0=успех, 0x18=неверный пароль, 0x6=нет аккаунта
Ticket Encryption Type: 0x12    ← 0x12=AES256, 0x17=RC4 (слабее)
Pre-Authentication Type: 2      ← 0=нет (AS-REP Roastable!), 2=стандартный
Client Address:     192.168.1.50
```

### Детальный разбор Event ID 4769

```
EventID: 4769
Account Name:         john.doe@CORP.LOCAL
Account Domain:       CORP.LOCAL
Logon GUID:           {GUID}
Service Name:         MSSQLSvc/sql01.corp.local:1433
Service ID:           S-1-5-21-...
Ticket Options:       0x40810000
Ticket Encryption Type: 0x17   ← RC4 → подозрительно для Kerberoasting!
Failure Code:         0x0
Client Address:       ::ffff:192.168.1.50
```

---

## 💻 Практика

### Задание 1: Инвентаризация AD с PowerShell

```powershell
# Установить RSAT (если не установлен)
Add-WindowsFeature RSAT-AD-PowerShell

# Импорт модуля
Import-Module ActiveDirectory

# Все пользователи домена
Get-ADUser -Filter * -Properties LastLogonDate, PasswordLastSet, Enabled |
    Select-Object Name, SamAccountName, Enabled, LastLogonDate, PasswordLastSet |
    Sort-Object LastLogonDate -Descending |
    Format-Table -AutoSize

# Члены Domain Admins
Get-ADGroupMember -Identity "Domain Admins" -Recursive |
    Select-Object Name, objectClass, SamAccountName

# Аккаунты с SPN (потенциальный Kerberoasting)
Get-ADUser -Filter {ServicePrincipalName -ne "$null"} `
    -Properties ServicePrincipalName |
    Select-Object Name, SamAccountName, ServicePrincipalName

# Аккаунты без пре-аутентификации (AS-REP Roasting)
Get-ADUser -Filter {DoesNotRequirePreAuth -eq $true} `
    -Properties DoesNotRequirePreAuth |
    Select-Object Name, SamAccountName

# Аккаунты, не входившие более 90 дней
$cutoff = (Get-Date).AddDays(-90)
Get-ADUser -Filter {LastLogonDate -lt $cutoff -and Enabled -eq $true} `
    -Properties LastLogonDate |
    Select-Object Name, SamAccountName, LastLogonDate |
    Sort-Object LastLogonDate
```

### Задание 2: Мониторинг Kerberos-событий

```powershell
# Kerberos TGT запросы за последний час (4768)
Get-WinEvent -FilterHashtable @{
    LogName   = 'Security'
    Id        = 4768
    StartTime = (Get-Date).AddHours(-1)
} | ForEach-Object {
    $xml = [xml]$_.ToXml()
    $data = $xml.Event.EventData.Data
    [PSCustomObject]@{
        Time        = $_.TimeCreated
        Account     = ($data | Where-Object Name -eq 'TargetUserName').'#text'
        PreAuthType = ($data | Where-Object Name -eq 'PreAuthType').'#text'
        EncType     = ($data | Where-Object Name -eq 'TicketEncryptionType').'#text'
        ClientIP    = ($data | Where-Object Name -eq 'IpAddress').'#text'
        ResultCode  = ($data | Where-Object Name -eq 'Status').'#text'
    }
} | Format-Table -AutoSize

# Поиск Kerberoasting: 4769 с RC4 (0x17)
Get-WinEvent -FilterHashtable @{
    LogName   = 'Security'
    Id        = 4769
    StartTime = (Get-Date).AddHours(-24)
} | ForEach-Object {
    $xml = [xml]$_.ToXml()
    $data = $xml.Event.EventData.Data
    $encType = ($data | Where-Object Name -eq 'TicketEncryptionType').'#text'
    if ($encType -eq '0x17') {   # RC4
        [PSCustomObject]@{
            Time        = $_.TimeCreated
            Account     = ($data | Where-Object Name -eq 'TargetUserName').'#text'
            Service     = ($data | Where-Object Name -eq 'ServiceName').'#text'
            EncType     = $encType
            ClientIP    = ($data | Where-Object Name -eq 'IpAddress').'#text'
        }
    }
} | Format-Table -AutoSize
```

### Задание 3: Просмотр применённых политик

```powershell
# Результирующая политика для текущего пользователя
gpresult /r /scope user

# HTML-отчёт (более подробный)
gpresult /h C:\Temp\gpo_report.html /f
Start-Process C:\Temp\gpo_report.html

# Принудительное обновление политик
gpupdate /force
```

---

## 🛠️ Задания

### Задание 1 ⭐ — Кербероc на пальцах

Опишите своими словами (без учебника) следующие сценарии:

1. Пользователь `john.doe` садится за компьютер и вводит пароль — что происходит пошагово в Kerberos?
2. Пользователь открывает `\\fileserver\share` — продолжение Kerberos-сценария.
3. Почему при Kerberoasting атакующий может взломать хеш оффлайн? Какую часть ответа KDC он использует?

---

### Задание 2 ⭐⭐ — Аудит AD на уязвимости

Используя PowerShell (или Active Directory Users and Computers GUI), проведите аудит тестового домена:

1. Найдите все аккаунты с флагом `DoesNotRequirePreAuth`
2. Найдите все аккаунты с SPN (ServicePrincipalName)
3. Найдите аккаунты с паролем, не истекающим никогда (`PasswordNeverExpires`)
4. Найдите аккаунты, не входившие более 90 дней, но Enabled
5. Найдите членов привилегированных групп (Domain Admins, Enterprise Admins)
6. Составьте отчёт с рекомендациями по исправлению каждой проблемы

---

### Задание 3 ⭐⭐⭐ — Обнаружение Kerberoasting

Разработайте PowerShell-скрипт для мониторинга Kerberoasting:

1. Читает Security EventLog на DC за последние N часов
2. Извлекает все события 4769 с `TicketEncryptionType = 0x17` (RC4)
3. Группирует по `TargetUserName` (клиент, делающий запросы)
4. Выводит алерт, если один аккаунт запросил ST к более чем 3 разным SPN за 1 час
5. Дополнительно: кросс-референс с Get-ADUser — показывает владельца SPN (сервисного аккаунта)

Ожидаемый вывод:
```
[ALERT] Possible Kerberoasting detected!
Client Account: CORP\attacker
Time Window:    2025-01-15 14:00:00 - 14:02:30
SPNs Requested: 7
  - MSSQLSvc/sql01.corp.local:1433 (owner: svc_mssql, weakpassword: likely)
  - http/webapp.corp.local (owner: svc_iis)
  - ...
Recommendation: Check if svc_mssql password is strong (>25 chars random)
```

---

## ✅ Чеклист готовности

- [ ] Я могу объяснить разницу между доменом, деревом и лесом AD
- [ ] Я понимаю разницу между OU и Group
- [ ] Я знаю, что такое LSDOU и в каком порядке применяются GPO
- [ ] Я понимаю структуру Distinguished Name и могу его прочитать
- [ ] Я могу пошагово описать Kerberos-аутентификацию: AS-REQ, AS-REP, TGS-REQ, TGS-REP, AP-REQ
- [ ] Я понимаю, что такое TGT, Service Ticket, SPN, PAC
- [ ] Я знаю, что такое Kerberoasting и почему возможен оффлайн-взлом
- [ ] Я знаю, что такое AS-REP Roasting и флаг DONT_REQ_PREAUTH
- [ ] Я понимаю разницу между Golden и Silver Ticket
- [ ] Я знаю Event ID 4768, 4769, 4771 и умею искать в них аномалии
- [ ] Я умею использовать PowerShell для запросов к AD (Get-ADUser, Get-ADGroupMember)

---

## 🔗 Ресурсы

- [Microsoft Docs — Active Directory Domain Services](https://docs.microsoft.com/en-us/windows-server/identity/ad-ds/get-started/virtual-dc/active-directory-domain-services-overview)
- [HarmJ0y — Kerberoasting Without Mimikatz](https://www.harmj0y.net/blog/powershell/kerberoasting-without-mimikatz/)
- [Sean Metcalf — Attack Methods for Gaining Domain Admin Rights](https://adsecurity.org/?p=2362)
- [MITRE ATT&CK — Steal or Forge Kerberos Tickets](https://attack.mitre.org/techniques/T1558/)
- [Microsoft Defender for Identity — Kerberos Detection](https://docs.microsoft.com/en-us/defender-for-identity/lateral-movement-alerts)
- [Kerberos Explained (Rootsec)](https://www.rootsec.org/kerberos-authentication/)
- [Impacket — Python toolkit for AD attacks/analysis](https://github.com/fortra/impacket)
