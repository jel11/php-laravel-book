# Отчёт: Junior SOC-аналитик в России

**Дата:** апрель 2026
**Цель:** минимальный набор знаний для прохождения собеседования + оценка учебника на «лишние» части

---

## Часть 1. Анализ рынка вакансий (Россия, 2026)

### Зарплаты

| Уровень | Москва | Регионы |
|---|---|---|
| Trainee / SOC L1 | 80 000 – 150 000 ₽ | 50 000 – 100 000 ₽ |
| Ночные смены | +20–30% к базе | +20–30% к базе |

### Компании, активно берущие Junior / Trainee

- **Лаборатория Касперского**
- **Positive Technologies**
- **КРОК** (KROC)
- **Solar (Ростелеком-Solar)**
- **BI.ZONE**
- **Информзащита**
- **F.A.C.C.T.**
- **Газинформсервис**

### Тренды, которые влияют на вакансии

- **SOAR автоматизирует рутину L1** → Tier 1 вакансий становится меньше, требования растут
- **Импортозамещение SIEM** → растёт спрос на знание **KUMA** (Касперский) и **MaxPatrol SIEM** (Positive Technologies) — не только Splunk/ELK
- **24/7 смены** — большинство SOC работает круглосуточно

---

## Часть 2. Что требуют (собрано из 10+ вакансий)

### A. Hard Skills — ОБЯЗАТЕЛЬНО

| Блок | Конкретика |
|---|---|
| **Сети** | OSI, TCP/IP, DNS, HTTP/HTTPS, SSL/TLS, ARP, DHCP, порты. Понимание SYN-scan vs TCP connect |
| **Linux** | Базовые команды: `grep`, `find`, `sed`, `awk`, `ps`, `netstat`, `ss`, `journalctl` |
| **Windows** | Event Logs + ключевые Event ID (4624/4625/4688/7045), процессы |
| **SIEM** | Практика в **минимум одной системе**: Splunk / ELK / KUMA / MaxPatrol. SPL-запросы или Lucene |
| **Анализ логов** | Веб-логи (Apache/Nginx), Firewall, Windows Security, Sysmon |
| **Кибербез-основы** | CIA, типы атак (фишинг, малвер, брутфорс), принципы защиты |
| **Frameworks** | **MITRE ATT&CK** (обязательно!), Cyber Kill Chain |
| **Инструменты обогащения** | VirusTotal, AbuseIPDB, Shodan, WHOIS |
| **Сетевой анализ** | Wireshark: фильтры, Follow Stream, поиск аномалий |

### B. Hard Skills — ЖЕЛАТЕЛЬНО (плюс к офферу)

- **Python / Bash / PowerShell** — базовые скрипты для автоматизации
- **Incident Response** — понимание жизненного цикла по NIST
- **SOC Playbooks** — знать алгоритмы разбора фишинга/малвера/брутфорса
- **Docker** — многие SIEM разворачиваются в контейнерах

### C. Soft Skills

- Готовность к сменному графику 24/7
- Стрессоустойчивость (поток алертов)
- Английский на уровне чтения технической документации
- Умение писать отчёты (incident reports)

### D. Типичные вопросы на собеседовании

1. Что происходит при DNS-запросе? (пошагово)
2. Какие порты у HTTPS, SSH, RDP, SMB?
3. Разница между SYN-scan и full TCP connect?
4. Что такое Event ID 4624? А 4625? А 4688?
5. Расскажи про MITRE ATT&CK — что это и зачем
6. Что такое kill chain? Назови этапы
7. Как расследовать фишинг-письмо? (шаги)
8. Что такое IOC? Приведи примеры
9. Как работает SIEM? Что такое корреляция событий?
10. Найди подозрительное в логе (дают SPL/awk-задачу)

---

## Часть 3. МИНИМАЛЬНЫЙ план для собеседования (3–4 недели)

### Неделя 1 — Сети + Linux (критично)
- OSI/TCP/IP до автоматизма
- DNS, HTTP, ARP, DHCP, NAT, ключевые порты
- Linux: grep/awk/sed/ps/netstat + bash-basics

### Неделя 2 — Windows + основы ИБ
- Windows Event Logs (топ-10 Event ID учить наизусть)
- CIA, AAA, MITRE ATT&CK, Kill Chain
- Типы атак и IOC

### Неделя 3 — SIEM + логи (самое важное!)
- Splunk ИЛИ ELK — пройти практический курс
- Написать 20+ SPL/Lucene запросов руками
- Анализ Apache/Windows/Firewall логов

### Неделя 4 — Incident Response + практика
- NIST lifecycle
- Плейбуки: фишинг, малвер, брутфорс
- Обогащение через VirusTotal/AbuseIPDB/Shodan
- **3–5 комнат на TryHackMe** (SOC Level 1 path)

### Параллельно (каждый день)
- Читать Хабр / securitylab.ru — актуальные инциденты
- Смотреть разборы на MyDFIR или Simply Cyber (YouTube)

---

## Часть 4. Оценка учебника: что нужно, а что лишнее

> Твой учебник — план **SOC → Pentester**. Для цели «пройти Junior SOC за 3–4 недели» половина книги — это отвлечение.

### 🟢 КРИТИЧНО (читать сразу, в первую очередь)

| Часть | Зачем для Junior SOC |
|---|---|
| **1.1–1.4** Сети | Базис, спрашивают ВСЕ |
| **2.1–2.5** Linux | Базовые команды + bash для SOC |
| **3.1** Windows Event Logs | Спрашивают Event ID |
| **5.1–5.3** CIA, Kill Chain, Threat Intel | Теория — быстро прочитать |
| **6.1–6.5** SIEM целиком | **Сердцевина профессии** |
| **7.1–7.4** Incident Response | Плейбуки нужны на собесе |
| **8.1** Wireshark | Базовый анализ трафика |
| **9.1–9.3** Карьера SOC | Резюме, первые 90 дней |

**Итого: ~26 глав, ~60% книги**

---

### 🟡 ПОЛЕЗНО, но можно отложить (после собеседования)

| Часть | Почему второстепенно для Junior |
|---|---|
| **3.2** Active Directory | L2-навык, редко спрашивают у Junior |
| **3.3** PowerShell | Полезно, но bash важнее для старта |
| **4.1–4.4** Python | Ценится, но без этого можно пройти |
| **8.2** tcpdump | Wireshark закрывает 90% задач |
| **8.3** Suricata/Snort rules | L2/Threat Hunter навык |
| **8.4** Анализ PCAP | Углубление, нужно на L2 |
| **10.1** Threat Hunting | L2-L3 направление |
| **10.4** Volatility / Memory Forensics | Форензика — отдельная роль |

**Итого: ~10 глав, ~15% книги — можно пропустить на старте**

---

### 🔴 НЕ НУЖНО для Junior SOC (чистый Pentester-трек)

> Эти главы **только отнимут время** от твоей цели.
> Вернёшься к ним через год, когда захочешь переход в пентест.

| Часть | Что там | Вердикт |
|---|---|---|
| **10.2** YARA-правила | Малвер-аналитика | Не спросят на Junior SOC |
| **10.3** Sigma-правила | Написание правил детекта | L2/L3 задача |
| **11.1–11.6** ВСЕ веб-атаки (SQL, XSS, SSRF, Auth, Upload, PortSwigger) | Пентест веба | SOC ищет атаки в логах, а не эксплуатирует |
| **12.1–12.4** Разведка (OSINT, Nmap, ffuf, API) | Пентест-recon | Не работа SOC-аналитика |
| **13.1–13.3** Методология пентеста, отчёты, CVSS | Пентест-процесс | Другая роль |
| **14.1–14.4** HTTP Smuggling, SSTI, Десериализация, Race Conditions | Продвинутый пентест веба | Bug Bounty / BSCP уровень |
| **15.1–15.3** CTF, Bug Bounty, Responsible Disclosure | Хобби пентестера | Не ценится на SOC собесе |
| **16.1–16.3** Сертификации пентестера, портфолио pentester, работа | Карьера пентестера | Другой карьерный путь |

**Итого: ~25 глав, ~35% книги — чистый Pentester-трек**

---

## Часть 5. Итоговая картина учебника

```
Всего глав в книге:          ~66
├── Нужно для Junior SOC:    ~26 (40%)  🟢
├── Можно отложить:          ~10 (15%)  🟡
└── Чистый Pentester:        ~25 (35%)  🔴 ПРОПУСТИТЬ СЕЙЧАС
```

### Визуально по Parts:

```
Part 1  Сети              ████████████ 100% нужно 🟢
Part 2  Linux             ████████████ 100% нужно 🟢
Part 3  Windows/AD        ████░░░░░░░░  33% (только 3.1) 🟡
Part 4  Python            ██░░░░░░░░░░  отложить 🟡
Part 5  ИБ-основы         ████████████ 100% нужно 🟢
Part 6  SIEM              ████████████ 100% КРИТИЧНО 🟢🟢
Part 7  IR                ████████████ 100% нужно 🟢
Part 8  Трафик            ████░░░░░░░░  25% (только 8.1) 🟡
Part 9  Карьера SOC       ████████████ 100% нужно 🟢
Part 10 Threat Hunting    ░░░░░░░░░░░░  пропустить 🔴
Part 11 Web attacks       ░░░░░░░░░░░░  пропустить 🔴
Part 12 Recon             ░░░░░░░░░░░░  пропустить 🔴
Part 13 Pentest method    ░░░░░░░░░░░░  пропустить 🔴
Part 14 Advanced web      ░░░░░░░░░░░░  пропустить 🔴
Part 15 CTF/Bug Bounty    ░░░░░░░░░░░░  пропустить 🔴
Part 16 Карьера Pentester ░░░░░░░░░░░░  пропустить 🔴
```

---

## Часть 6. Конкретный план действий (TL;DR)

1. **Читаешь по учебнику:** Part 1 → 2 → 3.1 → 5 → 6 → 7 → 8.1 → 9
2. **Параллельно на TryHackMe:** весь [SOC Level 1 Path](https://tryhackme.com/path/outline/soclevel1)
3. **Практика SIEM:** скачать Splunk Free или поднять ELK в Docker, прогнать 20+ запросов
4. **Выучить:** топ-10 Windows Event ID, MITRE ATT&CK техники (минимум 15 штук)
5. **Портфолио (Part 9.1):** 2–3 write-up расследований на GitHub
6. **Резюме** (Part 9.2) + откликаться на вакансии от Касперского, Solar, КРОК, BI.ZONE, Информзащита

**Срок:** 3–4 недели интенсивно → можно идти на собеседования.

---

## Источники

- [Карьера SOC аналитика 2026 (codeby.net)](https://codeby.net/threads/kar-yera-soc-analitika-v-2026-real-nyi-put-ot-novichka-do-spetsialista.92664/)
- [Зарплаты в кибербезопасности 2026 (codeby.net)](https://codeby.net/threads/zarplata-v-kiberbezopasnosti-2026-real-nyye-tsifry-vostrebovannyye-spetsializatsii-i-rezyume-dlya-junior.92609/)
- [SOC-аналитик: карьера 2026 (ibcourses.ru)](https://ibcourses.ru/soc-analyst-career-guide)
- [Junior SOC-аналитик: навыки и путь (codeby.net)](https://codeby.net/threads/kak-stat-junior-soc-analitikom-neobkhodimyye-navyki-i-kar-yernyi-put.89166/)
- [Аналитик SOC L1 — Энциклопедия ролей (cybersecurity-roadmap.ru)](https://cybersecurity-roadmap.ru/book/%D0%90%D0%BD%D0%B0%D0%BB%D0%B8%D1%82%D0%B8%D0%BA%20SOC%20L1.html)
- [Навыки специалиста SOC (SecurityVision)](https://www.securityvision.ru/blog/kakimi-navykami-dolzhen-ovladet-spetsialist-soc/)
- [Как стать SOC-специалистом (Tproger)](https://tproger.ru/articles/how-to-become-soc-specialist)
- [Короткий путь к SOC-аналитику (Хабр / ЛАНИТ)](https://habr.com/ru/companies/lanit/articles/768206/)
- [Вакансии SOC-аналитик (Хабр Карьера)](https://career.habr.com/vacancies/spec/infosec/SOC_analyst)
- [Сравнение российских SIEM-систем (Anti-Malware)](https://www.anti-malware.ru/compare/SIEM-2026)
- [Практикум: Аналитик SOC — кто это](https://practicum.yandex.ru/blog/professiya-analitik-soc/)
