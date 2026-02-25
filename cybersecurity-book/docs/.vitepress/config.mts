import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/cybersecurity-book/',
  title: 'Кибербезопасность',
  description: 'От SOC-аналитика до веб-пентестера — полное руководство',
  lang: 'ru-RU',

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Главная', link: '/' },
      { text: 'Начать обучение', link: '/chapters/part-1/chapter-1-1' },
      { text: 'GitHub', link: 'https://github.com/jel11/php-laravel-book' }
    ],

    sidebar: [
      {
        text: '📘 Введение',
        items: [
          { text: 'О проекте', link: '/intro' },
          { text: 'Как пользоваться', link: '/how-to-use' }
        ]
      },

      // ═══════════════════════════════════════════════
      // ЭТАП 1: ФУНДАМЕНТ + SOC L1
      // ═══════════════════════════════════════════════

      {
        text: '🌐 Часть 1: Сети (Модуль 1.1)',
        collapsed: false,
        items: [
          { text: '1.1 Модель OSI и стек TCP/IP', link: '/chapters/part-1/chapter-1-1' },
          { text: '1.2 DNS и HTTP/HTTPS в деталях', link: '/chapters/part-1/chapter-1-2' },
          { text: '1.3 ARP, DHCP, NAT и ключевые порты', link: '/chapters/part-1/chapter-1-3' },
          { text: '1.4 Сетевые инструменты и основы Wireshark', link: '/chapters/part-1/chapter-1-4' }
        ]
      },
      {
        text: '🐧 Часть 2: Linux для безопасности (Модуль 1.2)',
        collapsed: true,
        items: [
          { text: '2.1 Файловая система и навигация', link: '/chapters/part-2/chapter-2-1' },
          { text: '2.2 Работа с файлами: grep, awk, sed', link: '/chapters/part-2/chapter-2-2' },
          { text: '2.3 Процессы, пользователи и права', link: '/chapters/part-2/chapter-2-3' },
          { text: '2.4 Сеть в Linux: SSH, iptables, curl', link: '/chapters/part-2/chapter-2-4' },
          { text: '2.5 Логи и bash-скрипты для SOC', link: '/chapters/part-2/chapter-2-5' }
        ]
      },
      {
        text: '🪟 Часть 3: Windows для SOC (Модуль 1.3)',
        collapsed: true,
        items: [
          { text: '3.1 Windows Event Logs — ключевые Event ID', link: '/chapters/part-3/chapter-3-1' },
          { text: '3.2 Active Directory и Kerberos', link: '/chapters/part-3/chapter-3-2' },
          { text: '3.3 PowerShell для анализа безопасности', link: '/chapters/part-3/chapter-3-3' }
        ]
      },
      {
        text: '🐍 Часть 4: Python для ИБ (Модуль 1.4)',
        collapsed: true,
        items: [
          { text: '4.1 Быстрый старт Python для PHP-разработчика', link: '/chapters/part-4/chapter-4-1' },
          { text: '4.2 Работа с сетью: requests, socket', link: '/chapters/part-4/chapter-4-2' },
          { text: '4.3 Парсинг логов: re, os, csv, json', link: '/chapters/part-4/chapter-4-3' },
          { text: '4.4 5 инструментов безопасности на Python', link: '/chapters/part-4/chapter-4-4' }
        ]
      },
      {
        text: '🛡️ Часть 5: Основы кибербезопасности (Модуль 1.5)',
        collapsed: true,
        items: [
          { text: '5.1 CIA-триада, AAA и принципы защиты', link: '/chapters/part-5/chapter-5-1' },
          { text: '5.2 Типы атак: малвер, фишинг, сетевые атаки', link: '/chapters/part-5/chapter-5-2' },
          { text: '5.3 MITRE ATT&CK, Kill Chain, OWASP Top 10', link: '/chapters/part-5/chapter-5-3' },
          { text: '5.4 Инструменты защиты: Firewall, IDS/IPS, EDR', link: '/chapters/part-5/chapter-5-4' }
        ]
      },
      {
        text: '📊 Часть 6: SIEM и анализ логов (Модуль 1.6)',
        collapsed: true,
        items: [
          { text: '6.1 Что такое SIEM: архитектура и принципы', link: '/chapters/part-6/chapter-6-1' },
          { text: '6.2 Splunk: SPL-запросы и дашборды', link: '/chapters/part-6/chapter-6-2' },
          { text: '6.3 ELK Stack и Wazuh: open-source SIEM', link: '/chapters/part-6/chapter-6-3' },
          { text: '6.4 Анализ логов: Apache, Windows, Firewall', link: '/chapters/part-6/chapter-6-4' },
          { text: '6.5 Триаж алертов и обогащение данных', link: '/chapters/part-6/chapter-6-5' }
        ]
      },
      {
        text: '🚨 Часть 7: Реагирование на инциденты (Модуль 1.7)',
        collapsed: true,
        items: [
          { text: '7.1 Жизненный цикл инцидента по NIST', link: '/chapters/part-7/chapter-7-1' },
          { text: '7.2 Плейбуки SOC: фишинг, малвер, брутфорс', link: '/chapters/part-7/chapter-7-2' },
          { text: '7.3 Инструменты обогащения: VT, AbuseIPDB, Shodan', link: '/chapters/part-7/chapter-7-3' },
          { text: '7.4 Написание отчётов об инцидентах', link: '/chapters/part-7/chapter-7-4' }
        ]
      },
      {
        text: '🔬 Часть 8: Анализ трафика (Модуль 1.8)',
        collapsed: true,
        items: [
          { text: '8.1 Wireshark: захват, фильтры, Follow Stream', link: '/chapters/part-8/chapter-8-1' },
          { text: '8.2 tcpdump: быстрый захват и BPF-фильтры', link: '/chapters/part-8/chapter-8-2' },
          { text: '8.3 Suricata/Snort: написание IDS-правил', link: '/chapters/part-8/chapter-8-3' },
          { text: '8.4 Анализ вредоносного трафика на PCAP', link: '/chapters/part-8/chapter-8-4' }
        ]
      },
      {
        text: '💼 Часть 9: Портфолио и поиск работы (Модуль 1.9)',
        collapsed: true,
        items: [
          { text: '9.1 GitHub-портфолио SOC-аналитика', link: '/chapters/part-9/chapter-9-1' },
          { text: '9.2 TryHackMe, CTF и публичный профиль', link: '/chapters/part-9/chapter-9-2' },
          { text: '9.3 Резюме и стратегия поиска работы', link: '/chapters/part-9/chapter-9-3' }
        ]
      },

      // ═══════════════════════════════════════════════
      // ЭТАП 2: РОСТ В SOC + ОСНОВЫ OFFENSIVE
      // ═══════════════════════════════════════════════

      {
        text: '🔍 Часть 10: Продвинутый анализ (Модуль 2.1)',
        collapsed: true,
        items: [
          { text: '10.1 Threat Hunting: проактивный поиск угроз', link: '/chapters/part-10/chapter-10-1' },
          { text: '10.2 YARA-правила: детекция малвера', link: '/chapters/part-10/chapter-10-2' },
          { text: '10.3 Sigma-правила для SIEM', link: '/chapters/part-10/chapter-10-3' },
          { text: '10.4 Форензика: Volatility и анализ памяти', link: '/chapters/part-10/chapter-10-4' }
        ]
      },
      {
        text: '💣 Часть 11: Веб-безопасность — атакующий (Модуль 2.2)',
        collapsed: true,
        items: [
          { text: '11.1 SQL Injection: все виды и эксплуатация', link: '/chapters/part-11/chapter-11-1' },
          { text: '11.2 XSS и CSRF: клиентские атаки', link: '/chapters/part-11/chapter-11-2' },
          { text: '11.3 SSRF, IDOR и XXE', link: '/chapters/part-11/chapter-11-3' },
          { text: '11.4 Broken Auth, JWT-атаки и Access Control', link: '/chapters/part-11/chapter-11-4' },
          { text: '11.5 Burp Suite: полное руководство', link: '/chapters/part-11/chapter-11-5' },
          { text: '11.6 PortSwigger Academy: методология', link: '/chapters/part-11/chapter-11-6' }
        ]
      },
      {
        text: '🕵️ Часть 12: Разведка и сканирование (Модуль 2.3)',
        collapsed: true,
        items: [
          { text: '12.1 Пассивная разведка: OSINT, Shodan, Google Dork', link: '/chapters/part-12/chapter-12-1' },
          { text: '12.2 Активное сканирование: Nmap, Nikto, Nuclei', link: '/chapters/part-12/chapter-12-2' },
          { text: '12.3 Web Fuzzing: ffuf, Gobuster, Dirsearch', link: '/chapters/part-12/chapter-12-3' },
          { text: '12.4 Тестирование API: REST, GraphQL, OWASP API', link: '/chapters/part-12/chapter-12-4' }
        ]
      },
      {
        text: '📝 Часть 13: Отчёты и методология (Модуль 2.4)',
        collapsed: true,
        items: [
          { text: '13.1 Методология пентеста: OWASP Testing Guide', link: '/chapters/part-13/chapter-13-1' },
          { text: '13.2 Структура пентест-отчёта', link: '/chapters/part-13/chapter-13-2' },
          { text: '13.3 CVSS-оценка и классификация рисков', link: '/chapters/part-13/chapter-13-3' }
        ]
      },

      // ═══════════════════════════════════════════════
      // ЭТАП 3: ПЕРЕХОД В ВЕБ-ПЕНТЕСТ
      // ═══════════════════════════════════════════════

      {
        text: '⚡ Часть 14: Продвинутые веб-атаки (Модуль 3.1)',
        collapsed: true,
        items: [
          { text: '14.1 Race Conditions и HTTP Request Smuggling', link: '/chapters/part-14/chapter-14-1' },
          { text: '14.2 Cache Poisoning и Prototype Pollution', link: '/chapters/part-14/chapter-14-2' },
          { text: '14.3 SSTI и WebSocket-уязвимости', link: '/chapters/part-14/chapter-14-3' },
          { text: '14.4 Атаки на OAuth 2.0', link: '/chapters/part-14/chapter-14-4' }
        ]
      },
      {
        text: '🏆 Часть 15: CTF и Bug Bounty (Модуль 3.2)',
        collapsed: true,
        items: [
          { text: '15.1 CTF: методология веб-категории', link: '/chapters/part-15/chapter-15-1' },
          { text: '15.2 Bug Bounty: программы, scope, методология', link: '/chapters/part-15/chapter-15-2' },
          { text: '15.3 Responsible Disclosure и первые находки', link: '/chapters/part-15/chapter-15-3' }
        ]
      },
      {
        text: '🚀 Часть 16: Переход в пентест (Модуль 3.3)',
        collapsed: true,
        items: [
          { text: '16.1 Портфолио пентестера: 20+ инструментов', link: '/chapters/part-16/chapter-16-1' },
          { text: '16.2 Сертификации: eJPT, OSCP, Security+', link: '/chapters/part-16/chapter-16-2' },
          { text: '16.3 Поиск работы Junior Pentester', link: '/chapters/part-16/chapter-16-3' }
        ]
      },

      // ═══════════════════════════════════════════════
      // ПРИЛОЖЕНИЯ
      // ═══════════════════════════════════════════════

      {
        text: '📚 Приложения',
        collapsed: true,
        items: [
          { text: 'Шпаргалка: Linux и Windows команды', link: '/appendix/linux-windows-cheatsheet' },
          { text: 'Шпаргалка: инструменты ИБ', link: '/appendix/tools-cheatsheet' },
          { text: 'Шпаргалка: Event ID и IOC', link: '/appendix/eventid-ioc-cheatsheet' },
          { text: 'Шаблон CTF write-up', link: '/appendix/ctf-writeup-template' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/jel11/php-laravel-book' }
    ],

    footer: {
      message: 'Выпущено под лицензией MIT',
      copyright: 'Copyright © 2024–2026 Jell'
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: 'Поиск',
            buttonAriaLabel: 'Поиск'
          },
          modal: {
            noResultsText: 'Ничего не найдено',
            resetButtonTitle: 'Сбросить поиск',
            footer: {
              selectText: 'выбрать',
              navigateText: 'навигация'
            }
          }
        }
      }
    },

    outline: {
      label: 'На этой странице',
      level: [2, 3]
    },

    docFooter: {
      prev: 'Предыдущая страница',
      next: 'Следующая страница'
    },

    darkModeSwitchLabel: 'Тема',
    sidebarMenuLabel: 'Меню',
    returnToTopLabel: 'Наверх',

    editLink: {
      pattern: 'https://github.com/jel11/php-laravel-book/edit/main/cybersecurity-book/docs/:path',
      text: 'Редактировать эту страницу на GitHub'
    },

    lastUpdated: {
      text: 'Обновлено',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    }
  },

  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  },

  head: [
    ['meta', { name: 'theme-color', content: '#e53e3e' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'ru' }],
    ['meta', { name: 'og:site_name', content: 'Кибербезопасность: От SOC до пентестера' }]
  ],
  ignoreDeadLinks: true
})
