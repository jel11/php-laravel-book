import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/php-laravel-book/',
  title: 'PHP & Laravel',
  description: 'От нуля до мессенджера - Полное руководство',
  lang: 'ru-RU',

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Главная', link: '/' },
      { text: 'Начать обучение', link: '/chapters/part-0/chapter-0-1' },
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
      {
        text: '📦 Часть 0: Фундамент',
        collapsed: false,
        items: [
          { text: '0.1 Как работает веб', link: '/chapters/part-0/chapter-0-1' },
          { text: '0.2 Окружение разработчика', link: '/chapters/part-0/chapter-0-2' },
          { text: '0.3 Терминал и командная строка', link: '/chapters/part-0/chapter-0-3' }
        ]
      },
      {
        text: '🔤 Часть 1: Основы PHP',
        collapsed: true,
        items: [
          { text: '1.1 Синтаксис PHP', link: '/chapters/part-1/chapter-1-1' },
          { text: '1.2 Условия и циклы', link: '/chapters/part-1/chapter-1-2' },
          { text: '1.3 Функции', link: '/chapters/part-1/chapter-1-3' },
          { text: '1.4 Массивы глубоко', link: '/chapters/part-1/chapter-1-4' },
          { text: '1.5 Строки и регулярные выражения', link: '/chapters/part-1/chapter-1-5' },
          { text: '1.6 Работа с файлами', link: '/chapters/part-1/chapter-1-6' }
        ]
      },
      {
        text: '🌐 Часть 2: PHP и веб',
        collapsed: true,
        items: [
          { text: '2.1 Запросы и ответы, GET/POST, заголовки, cookies, сессии', link: '/chapters/part-2/chapter-2-1' },
          { text: '2.2 Обработка форм, фильтрация, санитизация данных', link: '/chapters/part-2/chapter-2-2' },
          { text: '2.3 Подключение, запросы, prepared statements, транзакции', link: '/chapters/part-2/chapter-2-3' },
          { text: '2.4 header(), коды ответов, Content-Type, работа с JSON', link: '/chapters/part-2/chapter-2-4' }
        ]
      },
      {
        text: '🗄️ Часть 3: Базы данных',
        collapsed: true,
        items: [
          { text: '3.1 Основы SQL', link: '/chapters/part-3/chapter-3-1' },
          { text: '3.2 MySQL и проектирование БД', link: '/chapters/part-3/chapter-3-2' },
          { text: '3.3 PDO', link: '/chapters/part-3/chapter-3-3' },
          { text: '3.4 Паттерны работы с БД', link: '/chapters/part-3/chapter-3-4' }
        ]
      },
      {
        text: '🎨 Часть 4: ООП в PHP',
        collapsed: true,
        items: [
          { text: '4.1 Классы и объекты', link: '/chapters/part-4/chapter-4-1' },
          { text: '4.2 Наследование и полиморфизм', link: '/chapters/part-4/chapter-4-2' },
          { text: '4.3 Интерфейсы и трейты', link: '/chapters/part-4/chapter-4-3' },
          { text: '4.4 Магические методы', link: '/chapters/part-4/chapter-4-4' },
          { text: '4.5 Namespaces и автозагрузка', link: '/chapters/part-4/chapter-4-5' },
          { text: '4.6 Принципы SOLID', link: '/chapters/part-4/chapter-4-6' }
        ]
      },
      {
        text: '🏗️ Часть 5: Архитектура',
        collapsed: true,
        items: [
          { text: '5.1 Паттерн MVC', link: '/chapters/part-5/chapter-5-1' },
          { text: '5.2 Front Controller и роутинг', link: '/chapters/part-5/chapter-5-2' },
          { text: '5.3 Dependency Injection', link: '/chapters/part-5/chapter-5-3' },
          { text: '5.4 Шаблонизация', link: '/chapters/part-5/chapter-5-4' }
        ]
      },
      {
        text: '🔒 Часть 6: Безопасность',
        collapsed: true,
        items: [
          { text: '6.1 SQL-инъекции', link: '/chapters/part-6/chapter-6-1' },
          { text: '6.2 XSS и CSRF', link: '/chapters/part-6/chapter-6-2' },
          { text: '6.3 Хеширование и пароли', link: '/chapters/part-6/chapter-6-3' },
          { text: '6.4 Загрузка файлов безопасно', link: '/chapters/part-6/chapter-6-4' }
        ]
      },
      {
        text: '📦 Часть 7: Composer',
        collapsed: true,
        items: [
          { text: '7.1 Composer — основы', link: '/chapters/part-7/chapter-7-1' },
          { text: '7.2 Полезные пакеты', link: '/chapters/part-7/chapter-7-2' },
          { text: '7.3 Стандарты PSR', link: '/chapters/part-7/chapter-7-3' }
        ]
      },
      {
        text: '⚡ Часть 8: Laravel — Основы',
        collapsed: true,
        items: [
          { text: '8.1 Введение в Laravel', link: '/chapters/part-8/chapter-8-1' },
          { text: '8.2 Роутинг в Laravel', link: '/chapters/part-8/chapter-8-2' },
          { text: '8.3 Контроллеры', link: '/chapters/part-8/chapter-8-3' },
          { text: '8.4 Blade шаблонизатор', link: '/chapters/part-8/chapter-8-4' },
          { text: '8.5 Eloquent ORM', link: '/chapters/part-8/chapter-8-5' }
        ]
      },
      {
        text: '💾 Часть 9: Laravel — БД',
        collapsed: true,
        items: [
          { text: '9.1 Миграции', link: '/chapters/part-9/chapter-9-1' },
          { text: '9.2 Eloquent связи', link: '/chapters/part-9/chapter-9-2' },
          { text: '9.3 Eager Loading и N+1', link: '/chapters/part-9/chapter-9-3' },
          { text: '9.4 Query Scopes и Accessors', link: '/chapters/part-9/chapter-9-4' },
          { text: '9.5 Seeders и Factories', link: '/chapters/part-9/chapter-9-5' }
        ]
      },
      {
        text: '🚀 Часть 10: Laravel — Продвинутое',
        collapsed: true,
        items: [
          { text: '10.1 Аутентификация', link: '/chapters/part-10/chapter-10-1' },
          { text: '10.2 Валидация', link: '/chapters/part-10/chapter-10-2' },
          { text: '10.3 Очереди и Jobs', link: '/chapters/part-10/chapter-10-3' },
          { text: '10.4 Events и Listeners', link: '/chapters/part-10/chapter-10-4' },
          { text: '10.5 Task Scheduling', link: '/chapters/part-10/chapter-10-5' },
          { text: '10.6 API Resources', link: '/chapters/part-10/chapter-10-6' }
        ]
      },
      {
        text: '🧪 Часть 11: Тестирование',
        collapsed: true,
        items: [
          { text: '11.1 Введение в тестирование', link: '/chapters/part-11/chapter-11-1' },
          { text: '11.2 Unit-тесты', link: '/chapters/part-11/chapter-11-2' },
          { text: '11.3 Feature-тесты в Laravel', link: '/chapters/part-11/chapter-11-3' },
          { text: '11.4 TDD на практике', link: '/chapters/part-11/chapter-11-4' }
        ]
      },
      {
        text: '💻 Часть 12: Frontend интеграция',
        collapsed: true,
        items: [
          { text: '12.1 JavaScript основы', link: '/chapters/part-12/chapter-12-1' },
          { text: '12.2 Vue.js для Laravel', link: '/chapters/part-12/chapter-12-2' },
          { text: '12.3 Vite и сборка', link: '/chapters/part-12/chapter-12-3' },
          { text: '12.4 REST API + SPA', link: '/chapters/part-12/chapter-12-4' }
        ]
      },
      {
        text: '📡 Часть 13: Real-time',
        collapsed: true,
        items: [
          { text: '13.1 Как работают WebSockets', link: '/chapters/part-13/chapter-13-1' },
          { text: '13.2 Laravel Broadcasting', link: '/chapters/part-13/chapter-13-2' },
          { text: '13.3 Laravel Reverb / Pusher', link: '/chapters/part-13/chapter-13-3' },
          { text: '13.4 Чат на практике', link: '/chapters/part-13/chapter-13-4' }
        ]
      },
      {
        text: '🐳 Часть 14: DevOps основы',
        collapsed: true,
        items: [
          { text: '14.1 Git глубже', link: '/chapters/part-14/chapter-14-1' },
          { text: '14.2 Docker для PHP', link: '/chapters/part-14/chapter-14-2' },
          { text: '14.3 Деплой Laravel', link: '/chapters/part-14/chapter-14-3' },
          { text: '14.4 CI/CD', link: '/chapters/part-14/chapter-14-4' }
        ]
      },
      {
        text: '📚 Приложения',
        collapsed: true,
        items: [
          { text: 'Шпаргалка PHP', link: '/appendix/php-cheatsheet' },
          { text: 'Шпаргалка Laravel', link: '/appendix/laravel-cheatsheet' },
          { text: 'Шпаргалка SQL', link: '/appendix/sql-cheatsheet' },
          { text: 'Чеклист код-ревью', link: '/appendix/code-review' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/jel11/php-laravel-book' }
    ],

    footer: {
      message: 'Выпущено под лицензией MIT',
      copyright: 'Copyright © 2024 Jell'
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
      pattern: 'https://github.com/jel11/php-laravel-book/edit/main/docs/:path',
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
    ['link', { rel: 'icon', href: '/php-laravel-vitepress/docs/public/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'ru' }],
    ['meta', { name: 'og:site_name', content: 'PHP & Laravel: От нуля до мессенджера' }]
  ],
  ignoreDeadLinks: true
})
