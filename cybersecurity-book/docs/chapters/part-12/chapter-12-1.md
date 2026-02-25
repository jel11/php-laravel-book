# Глава 12.1: Пассивная разведка: OSINT, Shodan, Google Dork

## Введение

Пассивная разведка (Passive Reconnaissance) — это первый и один из самых важных этапов тестирования на проникновение. В отличие от активного сканирования, пассивная разведка не устанавливает прямого соединения с целевой системой, что делает её юридически безопасной и практически необнаруживаемой.

Цель этого этапа — собрать максимально возможное количество информации о цели из публично доступных источников: DNS-записей, сертификатов SSL, поисковых систем, социальных сетей, утечек данных, регистрационных документов компаний и технических отпечатков сервисов.

> **Важно:** Вся разведка должна проводиться исключительно в рамках законного задания на тестирование. Даже «пассивный» сбор информации без разрешения может нарушать законодательство в некоторых юрисдикциях.

---

## 12.1.1 Методология OSINT

OSINT (Open Source Intelligence) — разведка на основе открытых источников. Это систематический процесс сбора, анализа и интерпретации данных из публично доступных источников.

### Источники OSINT

| Категория           | Примеры источников                                      |
|---------------------|--------------------------------------------------------|
| Поисковые системы   | Google, Bing, DuckDuckGo, Yandex                       |
| DNS и WHOIS         | WHOIS, ARIN, RIPE, Shodan, Censys                      |
| Социальные сети     | LinkedIn, Twitter/X, Facebook, GitHub                  |
| Документы           | Pastebin, GitHub Gists, Scribd, SlideShare             |
| Утечки данных       | HaveIBeenPwned, DeHashed, Breach-Parse                 |
| SSL-сертификаты     | crt.sh, Censys, SSL Labs                               |
| Web Archive         | Wayback Machine (archive.org)                          |
| Специализированные  | Shodan, Censys, BinaryEdge, ZoomEye                    |

### Фреймворк OSINT

Структурированный подход к пассивной разведке включает несколько уровней:

```
ЦЕЛЬ (Target)
├── Домены и поддомены
│   ├── DNS-записи (A, MX, NS, TXT, CNAME)
│   ├── Поддомены (перечисление)
│   └── Передачи зон (Zone Transfer)
├── IP-адреса и диапазоны
│   ├── ASN (Autonomous System Number)
│   ├── Геолокация
│   └── Обратный DNS
├── Организационные данные
│   ├── Регистрационные данные компании
│   ├── Юридические документы
│   └── Финансовые отчёты
├── Люди
│   ├── Сотрудники (LinkedIn, GitHub)
│   ├── Email-адреса
│   └── Аккаунты в соцсетях
└── Технический стек
    ├── Технологии (Wappalyzer, BuiltWith)
    ├── CDN и облачные провайдеры
    └── Открытые порты и сервисы (Shodan)
```

---

## 12.1.2 Инструменты пассивной разведки

### WHOIS — регистрационные данные доменов

WHOIS — протокол запросов к базам данных регистраторов доменных имён. Содержит информацию о владельце домена, датах регистрации и истечения, контактных данных и серверах имён.

```bash
# Базовый запрос WHOIS
whois example.com

# Запрос с конкретным WHOIS-сервером
whois -h whois.iana.org example.com

# Информация об IP-адресе
whois 93.184.216.34

# Поиск диапазонов IP по организации (RIPE для Европы)
whois -h whois.ripe.net "COMPANY NAME"
```

**Пример вывода и что искать:**

```
Domain Name: EXAMPLE.COM
Registry Domain ID: 2336799_DOMAIN_COM-VRSN
Registrar WHOIS Server: whois.iana.org
Updated Date: 2023-08-14T07:01:31Z
Creation Date: 1995-08-14T04:00:00Z      # Дата создания — показывает историю
Registry Expiry Date: 2024-08-13T04:00:00Z  # Срок истечения
Registrar: RESERVED-Internet Assigned Numbers Authority

Name Server: A.IANA-SERVERS.NET          # DNS-серверы
Name Server: B.IANA-SERVERS.NET

# Контактные данные — могут включать email, телефон, адрес
# (часто скрыты Privacy Protection)
```

### dig — DNS-запросы

`dig` (Domain Information Groper) — мощный инструмент для выполнения DNS-запросов.

```bash
# Базовый A-запрос
dig example.com

# Все типы записей
dig example.com ANY

# MX-записи (почтовые серверы)
dig example.com MX

# NS-записи (серверы имён)
dig example.com NS

# TXT-записи (SPF, DKIM, верификация)
dig example.com TXT

# CNAME-записи
dig www.example.com CNAME

# Попытка передачи зоны (Zone Transfer)
dig axfr @ns1.example.com example.com

# Обратный DNS (PTR)
dig -x 93.184.216.34

# Запрос с конкретным DNS-сервером
dig @8.8.8.8 example.com

# Краткий вывод только ответа
dig +short example.com

# Trace — отслеживание всей цепочки DNS
dig +trace example.com
```

**Передача зоны DNS (Zone Transfer):**

Если сервер имён неправильно сконфигурирован, можно получить полный список всех DNS-записей домена:

```bash
# Получение NS-серверов
dig example.com NS +short
# ns1.example.com.
# ns2.example.com.

# Попытка передачи зоны с каждого NS
dig axfr @ns1.example.com example.com
dig axfr @ns2.example.com example.com

# Если успешно, получите все записи:
# example.com.     86400   IN  A      93.184.216.34
# mail.example.com. 86400  IN  A      93.184.216.50
# vpn.example.com.  86400  IN  A      10.0.0.1
# dev.example.com.  86400  IN  A      10.0.0.5
```

### nslookup — интерактивные DNS-запросы

```bash
# Интерактивный режим
nslookup
> set type=MX
> example.com
> set type=NS
> example.com
> exit

# Не-интерактивный режим
nslookup -type=TXT example.com
nslookup -type=MX example.com 8.8.8.8

# Обратный DNS
nslookup 93.184.216.34
```

### theHarvester — автоматический сбор OSINT

theHarvester собирает email-адреса, поддомены, хосты, имена сотрудников и IP-адреса из публичных источников.

```bash
# Установка
pip3 install theHarvester
# или
git clone https://github.com/laramies/theHarvester
cd theHarvester && pip3 install -r requirements/base.txt

# Базовое использование
theHarvester -d example.com -b google

# Несколько источников
theHarvester -d example.com -b google,bing,linkedin

# Все доступные источники
theHarvester -d example.com -b all

# С лимитом результатов и выводом в файл
theHarvester -d example.com -b google -l 500 -f results.html

# Сохранение в XML
theHarvester -d example.com -b all -f output -x xml

# Основные источники (-b)
# google, bing, yahoo, duckduckgo  - поисковые системы
# linkedin, twitter               - социальные сети
# shodan                          - IoT-поисковик
# github                          - репозитории
# hunter, anubis                  - email-поиск
# crtsh                           - SSL-сертификаты
```

**Пример вывода theHarvester:**

```
[*] Target: example.com

[*] Searching Google...
[*] Searching Bing...
[*] Searching LinkedIn...

[*] Emails found: 5
-------------------
john.doe@example.com
security@example.com
admin@example.com
it-support@example.com
noreply@example.com

[*] Hosts found: 12
--------------------
api.example.com:93.184.216.35
dev.example.com:10.0.0.5
mail.example.com:93.184.216.50
staging.example.com:93.184.216.60
vpn.example.com:93.184.216.70
www.example.com:93.184.216.34
```

### Поиск поддоменов — Subfinder, Amass

```bash
# Subfinder — быстрое перечисление поддоменов
# Установка
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest

# Базовое использование
subfinder -d example.com

# С выводом в файл
subfinder -d example.com -o subdomains.txt

# С несколькими источниками
subfinder -d example.com -all -o subdomains.txt

# Verbose режим
subfinder -d example.com -v

# Amass — комплексный инструмент перечисления
# Установка
go install -v github.com/owasp-amass/amass/v4/...@master

# Пассивный режим (только OSINT, без активного сканирования)
amass enum --passive -d example.com

# Активный режим
amass enum -active -d example.com

# С брутфорсом поддоменов
amass enum -brute -d example.com -w /usr/share/wordlists/dns/subdomains-top1million.txt

# Сохранение в базу данных
amass enum -d example.com -dir /tmp/amass-output

# Визуализация результатов
amass viz -d3 -dir /tmp/amass-output
```

---

## 12.1.3 Maltego — визуализация связей

Maltego — профессиональный инструмент для визуализации и анализа связей между объектами OSINT. Позволяет строить граф отношений между доменами, IP-адресами, людьми, организациями.

### Основные трансформации Maltego

```
Домен → поддомены, IP, NS, MX, WHOIS
Email → профили социальных сетей, breaches
IP → геолокация, ASN, обратный DNS, открытые порты
Человек → email, аккаунты, фотографии, публикации
Организация → сотрудники, домены, документы
```

### Использование Maltego CE (Community Edition)

1. Регистрация на maltego.com
2. Создание нового графа (New Graph)
3. Добавление сущности (Entity) — например, Domain
4. Запуск трансформаций (Run Transforms):
   - To DNS Name (поддомены)
   - To IP Address
   - To Email Address
   - To Social Network Profiles

### Альтернатива: SpiderFoot

```bash
# SpiderFoot — автоматизированный OSINT-фреймворк
pip3 install spiderfoot

# Запуск веб-интерфейса
spiderfoot -l 127.0.0.1:5001

# Командная строка
spiderfoot -s example.com -t DOMAIN -m all -o output.html
```

---

## 12.1.4 Google Dorks — поиск уязвимостей через поисковик

Google Dorks (Google Hacking) — техника использования расширенных операторов поиска Google для нахождения конфиденциальной информации и уязвимых систем.

### Основные операторы Google

| Оператор     | Описание                              | Пример                          |
|--------------|---------------------------------------|---------------------------------|
| `site:`      | Поиск в пределах домена               | `site:example.com`             |
| `filetype:`  | Фильтр по типу файла                  | `filetype:pdf`                  |
| `intitle:`   | Поиск в заголовке страницы            | `intitle:"index of"`            |
| `inurl:`     | Поиск в URL                           | `inurl:admin`                   |
| `intext:`    | Поиск в тексте страницы               | `intext:"password"`             |
| `ext:`       | Расширение файла (аналог filetype)    | `ext:sql`                       |
| `cache:`     | Кэшированная версия страницы          | `cache:example.com`             |
| `link:`      | Страницы, ссылающиеся на URL          | `link:example.com`              |
| `related:`   | Похожие сайты                         | `related:example.com`           |
| `"-"` (минус)| Исключение слова                      | `inurl:admin -github`           |
| `""`         | Точное совпадение фразы               | `"sql syntax error"`            |
| `OR`         | Логическое ИЛИ                        | `admin OR login`                |
| `*`          | Подстановочный знак                   | `"password * reset"`            |

### Категории Google Dorks

#### 1. Поиск открытых директорий

```
intitle:"index of"
intitle:"index of" "parent directory"
intitle:"index of" password
intitle:"index of" backup
intitle:"index of" ".git"
intitle:"index of" "config.php"
intitle:"index of" db.sql
intitle:"index of" ".env"
```

#### 2. Поиск конфигурационных файлов

```
filetype:env "DB_PASSWORD"
filetype:env "SECRET_KEY"
filetype:cfg "password"
filetype:xml "password" inurl:config
filetype:yaml "password" inurl:config
filetype:json "api_key"
filetype:bak inurl:config
filetype:ini inurl:wp-config
ext:sql "password"
ext:log "error" inurl:admin
```

#### 3. Поиск панелей управления и логинов

```
inurl:admin/login.php
inurl:wp-admin filetype:php
inurl:phpmyadmin
inurl:/admin/index.php
intitle:"Admin Panel"
intitle:"phpMyAdmin" inurl:phpmyadmin
inurl:":8080/manager/html" intitle:"Apache Tomcat"
intitle:"Webmin"
inurl:cpanel
intitle:"RouterOS" inurl:/winbox
```

#### 4. Поиск уязвимых приложений

```
inurl:".php?id=" intext:"mysql_fetch"
inurl:".php?page=" intitle:"Warning"
inurl:".asp?id=" "OLE DB"
intitle:"Warning" "PHP Parse error"
intitle:"Warning" "supplied argument is not"
intext:"Fatal error: Uncaught"
inurl:".php?" intext:"mysql_num_rows()"
```

#### 5. Поиск файлов с паролями

```
filetype:txt "username" "password"
filetype:log "username" "password"
filetype:xls "password" "username"
intitle:"passwords" filetype:txt
"credentials" filetype:txt
"[default]" filetype:cfg "password"
```

#### 6. Поиск утечек данных и резервных копий

```
filetype:sql "INSERT INTO" "users"
filetype:sql "CREATE TABLE" "password"
ext:sql.gz inurl:backup
ext:tar.gz inurl:backup
ext:zip inurl:backup
inurl:backup filetype:tgz
inurl:dump filetype:sql
"database dump" filetype:sql
```

#### 7. Поиск камер и IoT

```
intitle:"webcam" inurl:view
inurl:top.htm inurl:currenttime
intitle:"Live View / - AXIS"
intitle:"Network Camera" inurl:/view/index.shtml
intitle:"WJ-NT104 Main Page"
inurl:/control/userimage.html
```

#### 8. Поиск по конкретному сайту

```
# Все файлы конкретного домена
site:example.com filetype:pdf
site:example.com filetype:xlsx
site:example.com inurl:admin
site:example.com intitle:"login"

# Поиск поддоменов
site:*.example.com
site:example.com -www

# Конфиденциальные страницы
site:example.com intitle:"confidential"
site:example.com filetype:env
```

### Google Dork для GitHub

```
site:github.com "example.com" "password"
site:github.com "example.com" "api_key"
site:github.com "example.com" "secret"
site:github.com "example.com" filename:.env
site:github.com org:example "internal"
```

### Инструменты автоматизации дорков

```bash
# GoogleDorker
pip3 install googledorker
googledorker -d example.com -q "password" -s 100

# DorkSearch
# Веб-интерфейс: https://dorksearch.com

# ghDB — Google Hacking Database
# https://www.exploit-db.com/google-hacking-database
```

---

## 12.1.5 Shodan — поисковик интернета вещей

Shodan — поисковая система, которая сканирует весь интернет и индексирует баннеры сервисов. В отличие от Google, Shodan индексирует не веб-страницы, а технические отпечатки сервисов.

### Регистрация и API

```bash
# Установка клиента
pip3 install shodan

# Инициализация с API-ключом
shodan init YOUR_API_KEY

# Проверка информации об аккаунте
shodan info
```

### Веб-интерфейс Shodan — базовые запросы

```
# Поиск по продукту
product:Apache
product:nginx
product:"Microsoft IIS"

# Поиск по версии
apache version:"2.4.49"
product:OpenSSH version:"7.4"

# Поиск по организации
org:"Google LLC"
org:"Example Corp"

# Поиск по стране и городу
country:RU city:Moscow
country:US state:"California"

# Поиск по порту
port:22
port:3389
port:8080

# Поиск по сети (CIDR)
net:93.184.216.0/24

# Поиск по hostname
hostname:example.com
hostname:.ru

# Поиск по операционной системе
os:"Windows Server 2019"
os:"Ubuntu 20.04"

# Поиск уязвимых систем
vuln:CVE-2021-44228
vuln:CVE-2017-0144

# Поиск по SSL
ssl.cert.subject.cn:example.com
ssl.cert.expired:true
ssl.cert.issuer.cn:"Let's Encrypt"
```

### Профессиональные запросы Shodan

```
# Открытые ElasticSearch без аутентификации
product:Elastic port:9200

# Открытые MongoDB
product:MongoDB port:27017

# Redis без пароля
product:Redis port:6379

# FTP с анонимным доступом
ftp anonymous

# Панели управления роутерами
port:8080 http.title:"Router"
http.title:"DD-WRT"
http.title:"pfSense"

# Системы промышленной автоматизации SCADA/ICS
product:"Siemens S7"
product:Modbus
port:502

# Веб-камеры
product:"webcam" has_screenshot:true
product:"Hikvision IP Camera"

# Kubernetes API
product:"Kubernetes" port:6443

# Открытые Jenkins
http.title:"Dashboard [Jenkins]"
product:Jenkins port:8080

# Открытые Grafana
http.title:"Grafana" port:3000

# Kibana без auth
product:Kibana port:5601

# Открытые базы данных MySQL
product:MySQL port:3306

# Memcached
product:Memcached port:11211

# Уязвимые к EternalBlue
vuln:MS17-010

# Устройства с дефолтными паролями
http.title:"admin" port:80 default password
```

### Использование Shodan через CLI

```bash
# Поиск
shodan search "apache 2.4.49"

# Поиск с выводом только IP
shodan search --fields ip_str "apache 2.4.49"

# Поиск с конкретными полями
shodan search --fields ip_str,port,org,hostnames "product:nginx country:RU"

# Информация о конкретном IP
shodan host 93.184.216.34

# Скачивание результатов
shodan download results "product:Apache country:RU" 
shodan parse --fields ip_str,port results.json.gz

# Мониторинг изменений в сети
shodan alert create "My Network" 93.184.216.0/24

# Просмотр всех алертов
shodan alert list

# Статистика поиска
shodan count "product:nginx"

# Фасеты (статистика по полям)
shodan stats --facets org,country "product:Apache"
```

### Использование Shodan API в Python

```python
import shodan

SHODAN_API_KEY = "YOUR_API_KEY_HERE"
api = shodan.Shodan(SHODAN_API_KEY)

# Поиск
try:
    results = api.search("product:nginx country:RU")
    print(f"Найдено результатов: {results['total']}")
    
    for result in results['matches']:
        print(f"IP: {result['ip_str']}")
        print(f"Port: {result['port']}")
        print(f"Org: {result.get('org', 'N/A')}")
        print(f"OS: {result.get('os', 'Unknown')}")
        print(f"Hostnames: {', '.join(result.get('hostnames', []))}")
        print(f"Country: {result.get('location', {}).get('country_name', 'Unknown')}")
        print("---")
except shodan.APIError as e:
    print(f"Error: {e}")

# Информация о хосте
host = api.host("93.184.216.34")
print(f"IP: {host['ip_str']}")
print(f"Organization: {host.get('org', 'N/A')}")
print(f"Operating System: {host.get('os', 'Unknown')}")
print(f"Country: {host['country_name']}")

for item in host['data']:
    print(f"\nPort: {item['port']}")
    print(f"Banner: {item['data']}")

# Сканирование сети (требует план Enterprise)
# api.scan(['93.184.216.0/24'])

# Поиск уязвимостей на хосте
host = api.host("93.184.216.34", history=True)
if 'vulns' in host:
    for vuln in host['vulns']:
        print(f"CVE: {vuln}")
```

---

## 12.1.6 Censys — альтернатива Shodan

Censys предоставляет другой угол зрения на сканирование интернета с акцентом на SSL/TLS сертификаты и IPv4-адреса.

### Censys Search (веб-интерфейс)

```
# Поиск по хостам
services.service_name: HTTP and services.port: 8080

# По SSL-сертификатам
parsed.subject.common_name: "example.com"
parsed.names: "example.com"

# По сертификатам с конкретной организацией
parsed.subject.organization: "Example Corp"

# Поиск уязвимых сервисов
services.service_name: MSSQL

# По стране
location.country_code: RU

# Поиск по ASN
autonomous_system.asn: 15169
```

### Censys Python API

```python
from censys.search import CensysHosts

h = CensysHosts()

# Поиск
query = "services.http.response.headers.server: Apache"
for page in h.search(query, pages=1):
    for host in page:
        print(host["ip"])
        for service in host.get("services", []):
            print(f"  Port: {service.get('port')}, Service: {service.get('service_name')}")

# Детальная информация о хосте
host = h.view("93.184.216.34")
print(host)
```

---

## 12.1.7 SSL Certificate Transparency

Certificate Transparency (CT) — публичный лог всех выданных SSL/TLS-сертификатов. Это неоценимый источник для обнаружения поддоменов.

### crt.sh — поиск по CT логам

```bash
# Веб-интерфейс: https://crt.sh
# Поиск: %.example.com

# API запросы через curl
curl -s "https://crt.sh/?q=%25.example.com&output=json" | \
    python3 -c "import sys,json; [print(x['name_value']) for x in json.load(sys.stdin)]" | \
    sort -u

# Скрипт для извлечения поддоменов
curl -s "https://crt.sh/?q=%25.example.com&output=json" | \
    python3 -c "
import sys, json
data = json.load(sys.stdin)
subdomains = set()
for entry in data:
    name = entry['name_value']
    for sub in name.split('\n'):
        sub = sub.strip().lstrip('*.')
        if sub:
            subdomains.add(sub)
for sub in sorted(subdomains):
    print(sub)
"
```

### Автоматизированный поиск через CT

```bash
# Установка ct-exposer
pip3 install ct-exposer

# Использование
ct-exposer -d example.com

# Использование с Go - gosubdomain
go install github.com/nicowillis/gosubdomain@latest
gosubdomain -d example.com -crt

# ctfr - утилита для CT logs
git clone https://github.com/UnaPibaGeek/ctfr
python3 ctfr.py -d example.com
```

---

## 12.1.8 OSINT Framework

OSINT Framework — структурированная коллекция OSINT-инструментов и ресурсов.

**Веб-версия:** https://osintframework.com

### Категории OSINT Framework

```
Username Investigation
├── Namechk         - проверка username на 100+ сайтах
├── Sherlock        - поиск аккаунтов
└── WhatsMyName     - идентификация профилей

Email Address
├── Hunter.io       - поиск email по домену
├── EmailRep        - репутация email
└── HaveIBeenPwned  - проверка утечек

Domain & IP
├── ViewDNS.info    - DNS история, Reverse IP
├── DNSDumpster     - DNS разведка
└── IPinfo.io       - информация об IP

Social Networks
├── Twint           - Twitter OSINT без API
├── Instaloader     - Instagram OSINT
└── LinkedIn2md     - LinkedIn scraping

People Search
├── Pipl            - поиск людей
├── Spokeo          - агрегатор профилей
└── BeenVerified    - публичные записи
```

### Sherlock — поиск username

```bash
# Установка
pip3 install sherlock-project
# или
git clone https://github.com/sherlock-project/sherlock
cd sherlock && pip3 install -r requirements.txt

# Базовое использование
sherlock username123

# Несколько имён
sherlock john_doe johndoe john.doe

# Вывод только найденных аккаунтов
sherlock username123 --print-found

# В конкретных сайтах
sherlock username123 --site Twitter --site GitHub

# CSV вывод
sherlock username123 --csv
```

### Hunter.io — поиск email по домену

```bash
# API запросы
curl "https://api.hunter.io/v2/domain-search?domain=example.com&api_key=YOUR_KEY"

# Верификация email
curl "https://api.hunter.io/v2/email-verifier?email=john@example.com&api_key=YOUR_KEY"

# Python клиент
pip3 install pyhunter
```

```python
from pyhunter import PyHunter

hunter = PyHunter('YOUR_API_KEY')

# Поиск всех email для домена
emails = hunter.domain_search('example.com')
for email in emails['emails']:
    print(f"{email['value']} - {email['first_name']} {email['last_name']}")
    print(f"  Confidence: {email['confidence']}%")
    print(f"  Position: {email.get('position', 'Unknown')}")

# Верификация email
result = hunter.email_verifier('test@example.com')
print(f"Status: {result['status']}")
print(f"Score: {result['score']}")
```

---

## 12.1.9 Wayback Machine — архив веба

```bash
# Установка waybackurls
go install github.com/tomnomnom/waybackurls@latest

# Поиск всех URL в архиве
echo "example.com" | waybackurls

# Фильтрация по расширениям
echo "example.com" | waybackurls | grep "\.php"
echo "example.com" | waybackurls | grep "\.env\|\.config\|\.bak"

# GAU (Get All URLs) — расширенный поиск
go install github.com/lc/gau/v2/cmd/gau@latest
echo "example.com" | gau
echo "example.com" | gau --blacklist eot,woff,svg,png,jpg

# Загрузка конкретной страницы из архива
curl "https://web.archive.org/web/20231001000000/https://example.com/old-api-endpoint"
```

---

## 12.1.10 Комплексный скрипт пассивной разведки

```python
#!/usr/bin/env python3
"""
Комплексный скрипт пассивной разведки
Использование: python3 recon.py example.com
"""

import subprocess
import requests
import json
import sys
import socket
from datetime import datetime

def run_command(cmd):
    """Выполнение команды и возврат вывода"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        return "Timeout"
    except Exception as e:
        return f"Error: {e}"

def whois_lookup(domain):
    """WHOIS запрос"""
    print(f"\n[*] WHOIS для {domain}")
    result = run_command(f"whois {domain}")
    # Извлекаем ключевые поля
    for line in result.split('\n'):
        for keyword in ['Registrar:', 'Creation Date:', 'Expiry Date:', 'Name Server:']:
            if keyword in line:
                print(f"  {line.strip()}")

def dns_enumeration(domain):
    """Перечисление DNS-записей"""
    print(f"\n[*] DNS записи для {domain}")
    
    record_types = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA']
    for rtype in record_types:
        result = run_command(f"dig +short {domain} {rtype}")
        if result:
            print(f"  {rtype}: {result}")

def find_subdomains_crt(domain):
    """Поиск поддоменов через crt.sh"""
    print(f"\n[*] Поиск поддоменов через crt.sh")
    try:
        response = requests.get(
            f"https://crt.sh/?q=%25.{domain}&output=json",
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            subdomains = set()
            for entry in data:
                name = entry.get('name_value', '')
                for sub in name.split('\n'):
                    sub = sub.strip().lstrip('*.')
                    if sub.endswith(domain) and sub != domain:
                        subdomains.add(sub)
            
            for sub in sorted(subdomains):
                try:
                    ip = socket.gethostbyname(sub)
                    print(f"  {sub} -> {ip}")
                except:
                    print(f"  {sub} -> [не резолвится]")
    except Exception as e:
        print(f"  Ошибка: {e}")

def wayback_urls(domain):
    """Поиск URL в Wayback Machine"""
    print(f"\n[*] Поиск в Wayback Machine")
    try:
        response = requests.get(
            f"http://web.archive.org/cdx/search/cdx?url=*.{domain}/*&output=json&limit=20&fl=original",
            timeout=30
        )
        if response.status_code == 200:
            urls = response.json()[1:]  # Skip header
            for url_data in urls[:10]:
                print(f"  {url_data[0]}")
    except Exception as e:
        print(f"  Ошибка: {e}")

def check_email_hunter(domain, api_key=None):
    """Поиск email через Hunter.io (требует API ключ)"""
    if not api_key:
        print(f"\n[!] Hunter.io: API ключ не указан")
        return
    
    print(f"\n[*] Поиск email через Hunter.io")
    try:
        response = requests.get(
            f"https://api.hunter.io/v2/domain-search?domain={domain}&api_key={api_key}",
            timeout=30
        )
        data = response.json()
        emails = data.get('data', {}).get('emails', [])
        for email in emails[:10]:
            print(f"  {email['value']} - {email.get('first_name', '')} {email.get('last_name', '')}")
    except Exception as e:
        print(f"  Ошибка: {e}")

def generate_report(domain, output_file=None):
    """Генерация отчёта"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_name = output_file or f"recon_{domain}_{timestamp}.txt"
    
    print(f"\n[*] Результаты сохранены в {report_name}")

def main():
    if len(sys.argv) < 2:
        print("Использование: python3 recon.py <domain>")
        sys.exit(1)
    
    domain = sys.argv[1]
    print(f"[*] Запуск пассивной разведки для: {domain}")
    print(f"[*] Время начала: {datetime.now()}")
    print("=" * 60)
    
    whois_lookup(domain)
    dns_enumeration(domain)
    find_subdomains_crt(domain)
    wayback_urls(domain)
    
    print("\n" + "=" * 60)
    print("[*] Разведка завершена")

if __name__ == "__main__":
    main()
```

---

## 12.1.11 Метаданные документов

Публично доступные документы (PDF, DOCX, XLSX) часто содержат ценные метаданные.

```bash
# Установка ExifTool
apt-get install exiftool

# Анализ метаданных PDF
exiftool document.pdf

# Пример вывода:
# Author: John Doe
# Creator: Microsoft Word 2016
# Producer: Adobe Acrobat Pro
# Create Date: 2023:05:15 14:30:00
# Modify Date: 2023:06:01 09:15:00
# Company: Example Corp

# Установка FOCA (Windows) или metagoofil (Linux)
pip3 install metagoofil

# Поиск и анализ документов на сайте
metagoofil -d example.com -t pdf,doc,xls -o /tmp/docs

# Массовый анализ
for f in /tmp/docs/*.pdf; do
    echo "=== $f ==="
    exiftool "$f" | grep -E "Author|Creator|Company|Producer"
done
```

---

## 12.1.12 Практический пример: полная разведка цели

Рассмотрим комплексный пример разведки (на примере публичного учебного домена):

```bash
#!/bin/bash
TARGET="hackthissite.org"  # Легальная учебная платформа

echo "========================================="
echo "  OSINT РАЗВЕДКА: $TARGET"
echo "========================================="

# 1. WHOIS
echo -e "\n[1] WHOIS"
whois $TARGET | grep -E "Registrar:|Creation|Expiry|Name Server" 

# 2. DNS записи
echo -e "\n[2] DNS записи"
for type in A MX NS TXT; do
    echo -n "  $type: "
    dig +short $TARGET $type | tr '\n' ', '
    echo
done

# 3. Поддомены через dig bruteforce (базовый)
echo -e "\n[3] Поиск поддоменов"
for sub in www mail api dev staging admin vpn test beta; do
    ip=$(dig +short $sub.$TARGET)
    if [ -n "$ip" ]; then
        echo "  [FOUND] $sub.$TARGET -> $ip"
    fi
done

# 4. Передача зоны DNS (обычно не работает)
echo -e "\n[4] Попытка Zone Transfer"
ns=$(dig +short $TARGET NS | head -1)
if [ -n "$ns" ]; then
    dig axfr @$ns $TARGET 2>&1 | head -20
fi

# 5. Поиск в Google (Dorks — требует ручной проверки)
echo -e "\n[5] Google Dorks для проверки:"
echo "  site:$TARGET filetype:pdf"
echo "  site:$TARGET inurl:admin"
echo "  site:$TARGET filetype:env"

# 6. Shodan
echo -e "\n[6] Shodan (требует API)"
echo "  Поисковый запрос: hostname:$TARGET"

# 7. Wayback Machine
echo -e "\n[7] Wayback Machine — последние снимки"
curl -s "http://archive.org/wayback/available?url=$TARGET" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print('  Последний снимок:', d.get('archived_snapshots', {}).get('closest', {}).get('timestamp', 'Нет'))"

echo -e "\n========================================="
echo "  Разведка завершена"
echo "========================================="
```

---

## Итоги главы

В этой главе мы рассмотрели:

- **Методологию OSINT** — структурированный подход к пассивному сбору информации
- **DNS-инструменты** (`whois`, `dig`, `nslookup`) — получение информации о доменах и DNS-записях
- **theHarvester** — автоматический сбор email-адресов, поддоменов и хостов
- **Maltego** — визуализация связей между объектами OSINT
- **Google Dorks** — поиск уязвимостей и конфиденциальных данных через поисковые системы
- **Shodan и Censys** — поиск и анализ открытых сервисов в интернете
- **Certificate Transparency** — обнаружение поддоменов через SSL-сертификаты
- **OSINT Framework** — структурированная коллекция OSINT-ресурсов

### Ключевые принципы пассивной разведки

1. **Без прямого взаимодействия** — не устанавливаем соединений с целью
2. **Систематичность** — методичный сбор информации по всем категориям
3. **Документирование** — все находки фиксируются для отчёта
4. **Законность** — только в рамках разрешённого scope

---

## Практические задания

### Задание 1: Базовая DNS-разведка
Проведите DNS-разведку для домена `hackthissite.org` (учебная платформа):
- Получите все типы DNS-записей
- Попробуйте передачу зоны
- Найдите поддомены через crt.sh

### Задание 2: Google Dorks
Используя Google Dorks, найдите:
- Открытые директории на `site:testphp.vulnweb.com`
- Конфигурационные файлы
- Страницы с SQL-ошибками

### Задание 3: Shodan-разведка
Зарегистрируйтесь на Shodan и выполните:
- Найдите все открытые Jenkins-серверы в России
- Найдите серверы с истёкшими SSL-сертификатами
- Изучите информацию о конкретном IP-адресе

### Задание 4: Комплексная разведка
Проведите полную пассивную разведку для учебной платформы `hackthebox.com`:
- WHOIS
- DNS-записи
- Поддомены (через 3 разных источника)
- Поиск в Wayback Machine
- Google Dorks
- Составьте краткий отчёт о находках

### Задание 5: Автоматизация
Напишите Python-скрипт, который:
- Принимает домен в качестве аргумента
- Автоматически запрашивает данные из crt.sh, WHOIS и Wayback Machine
- Генерирует HTML-отчёт с результатами

