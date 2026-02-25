# Глава 10.2: YARA-правила: детекция малвера

## 🎯 Цели главы

После изучения этой главы вы сможете:
- Понимать синтаксис и структуру YARA-правил
- Использовать все типы строк и модификаторы
- Применять модули YARA (pe, elf, math, hash)
- Писать правила для реального вредоносного ПО
- Тестировать и отлаживать YARA-правила
- Интегрировать YARA в Python-скрипты
- Использовать публичные источники YARA-правил

---

## 🔍 10.2.1 Что такое YARA

**YARA** (Yet Another Ridiculous Acronym / Yet Another Recursive Acronym) — инструмент и язык правил для идентификации и классификации образцов вредоносного ПО.

Создан Victor Manuel Alvarez (VirusTotal), ныне поддерживается сообществом.

### Ключевые возможности

```
YARA умеет:
├── Сканировать файлы по паттернам (строки, hex, regex)
├── Анализировать PE/ELF структуры файлов
├── Искать по метаданным (размер файла, энтропия)
├── Применяться к дампам памяти процессов
├── Работать в потоке (stream scanning)
└── Интегрироваться с EDR, AV, SIEM системами
```

### Где используется YARA

| Продукт/Система | Применение |
|---|---|
| VirusTotal | Детекция через загруженные правила |
| Malwarebytes | Детекция в реальном времени |
| ClamAV | Опциональные YARA-правила |
| CAPE Sandbox | Классификация семейств |
| Cuckoo Sandbox | Детекция поведения |
| Velociraptor | Threat Hunting |
| YARA-L (Chronicle) | SIEM детекция |

---

## 📐 10.2.2 Структура YARA-правила

### Базовый синтаксис

```yara
rule RuleName : tag1 tag2
{
    meta:
        author = "Имя Автора"
        description = "Описание правила"
        date = "2024-03-15"
        version = "1.0"
        
    strings:
        $string1 = "текстовая строка"
        $hex1 = { 4D 5A 90 00 }
        $regex1 = /pattern[0-9]+/
        
    condition:
        any of them
}
```

### Полная структура с комментариями

```yara
// Однострочный комментарий

/*
   Многострочный комментарий
   rule: Обнаружение Mirai botnet
*/

rule Mirai_Botnet_Sample
{
    // ============================
    // СЕКЦИЯ META (необязательная)
    // ============================
    meta:
        author      = "Security Team"
        description = "Detects Mirai botnet variants"
        date        = "2024-03-15"
        version     = "2.1"
        reference   = "https://example.com/mirai-analysis"
        hash        = "d41d8cd98f00b204e9800998ecf8427e"
        mitre_att   = "T1498"  // Network DoS
        
    // ============================
    // СЕКЦИЯ STRINGS
    // ============================
    strings:
        // Текстовые строки Mirai
        $str1 = "/bin/busybox MIRAI"
        $str2 = "REPORT %s:%s"
        $str3 = "hackforums"
        
        // Hex паттерны (XOR-ключ Mirai)
        $hex1 = { 37 2F 1A 0E 22 27 1A }
        
        // Regex для IP-адресов в конфиге
        $re1 = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5}/
        
    // ============================
    // СЕКЦИЯ CONDITION
    // ============================
    condition:
        // Должен быть ELF файл
        uint32(0) == 0x464C457F and
        // И хотя бы 2 из текстовых строк
        2 of ($str*) or
        // Или hex паттерн
        $hex1
}
```

---

## 🔤 10.2.3 Типы строк в YARA

### 1. Текстовые строки (Text strings)

```yara
rule TextStrings_Demo
{
    strings:
        // Простая текстовая строка
        $plain = "cmd.exe /c"
        
        // Регистронезависимая (nocase)
        $nocase = "powershell" nocase
        
        // Wide (UTF-16 LE, используется в PE)
        $wide_str = "malware" wide
        
        // ASCII + Wide (оба варианта)
        $both = "backdoor" wide ascii
        
        // Полное слово (не часть другого слова)
        $fullword = "eval" fullword
        
        // Комбинация модификаторов
        $combo = "inject" nocase wide ascii fullword
        
    condition:
        any of them
}
```

### 2. Hex строки (Hex strings)

```yara
rule HexStrings_Demo
{
    strings:
        // Точная последовательность байт (DOS MZ header)
        $mz_header = { 4D 5A }
        
        // С wildcard байтами (?? = любой байт)
        $with_wildcard = { 4D 5A ?? ?? ?? ?? 00 00 }
        
        // Диапазон байт [n-m] = от n до m байт
        $with_jump = { 4D 5A [2-4] 00 00 ?? ?? }
        
        // Неограниченный переход [-]
        $unlimited = { DE AD [-] BE EF }
        
        // Альтернативы (OR)
        $alternatives = { ( 4D 5A | 7F 45 4C 46 ) }
        
        // XOR зашифрованная строка
        $xor_str = "CONNECT" xor(1-255)  // YARA 4.x
        
    condition:
        $mz_header at 0  // Точная позиция!
}
```

### 3. Regular expressions (Regex)

```yara
rule RegexStrings_Demo
{
    strings:
        // Базовый regex (URL)
        $url = /https?:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}/
        
        // IP-адрес
        $ip = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/
        
        // Base64 строки (потенциальный encoded payload)
        $b64 = /[A-Za-z0-9+\/]{50,}={0,2}/
        
        // Windows пути
        $win_path = /[A-Za-z]:\\[^\x00-\x1f"*:<>?|\\\/]+/
        
        // Email (C2 коммуникация через email)
        $email = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/
        
        // UUID/GUID (может быть идентификатор малвера)
        $guid = /\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}/
        
        // Regex с модификаторами
        $nocase_re = /powershell/i          // case insensitive
        $multiline = /^malware$/m           // multiline
        $nocase_multi = /pattern/is         // case insensitive + dot matches newline
        
    condition:
        2 of them
}
```

---

## ⚙️ 10.2.4 Модификаторы строк

### Полная таблица модификаторов

| Модификатор | Тип | Описание | Пример |
|---|---|---|---|
| `nocase` | text, regex | Регистронезависимый поиск | `"malware" nocase` |
| `wide` | text | UTF-16 Little Endian строка | `"cmd" wide` |
| `ascii` | text | ASCII строка (по умолч.) | `"cmd" ascii` |
| `fullword` | text, regex | Полное слово | `"eval" fullword` |
| `base64` | text | Base64 вариации строки | `"malware" base64` |
| `base64wide` | text | Base64 wide | `"inject" base64wide` |
| `xor` | text | XOR со всеми ключами 0-255 | `"PAYLOAD" xor` |
| `xor(n)` | text | XOR с конкретным ключом | `"KEY" xor(0x22)` |
| `xor(n-m)` | text | XOR с диапазоном ключей | `"KEY" xor(1-255)` |
| `private` | любой | Не включать в вывод совпадений | `$key = "secret" private` |

```yara
rule Modifiers_Examples
{
    strings:
        // wide ascii = ищем и ASCII и UTF-16
        $cmd = "cmd.exe" wide ascii nocase
        
        // base64: YARA сам закодирует строку в base64 вариациях
        // Ищет: "powershell" в base64 (cG93ZXJzaGVsbA==, etc.)
        $ps_b64 = "powershell" base64 base64wide
        
        // xor: перебирает все XOR ключи
        $xored_beacon = "beacon" xor
        
        // fullword предотвращает совпадения "evaluate", "evaluator"
        $eval_only = "eval" fullword
        
    condition:
        any of them
}
```

---

## 🎯 10.2.5 Секция Condition: операторы и функции

### Базовые операторы condition

```yara
rule Condition_Examples
{
    strings:
        $a = "string_a"
        $b = "string_b"
        $c = "string_c"
        $d = "string_d"
        
    condition:
        // Логические операторы
        $a and $b                      // оба должны быть
        $a or $b                       // хотя бы одно
        not $a                         // не должно быть
        $a and not $b                  // a есть, b нет
        
        // Количественные операторы
        any of them                    // хотя бы одна из всех
        all of them                    // все должны быть
        2 of them                      // ровно 2 или больше
        2 of ($a, $b, $c)             // 2 из указанных
        all of ($a, $b)               // все из указанных
        any of ($a*)                   // любая начинающаяся с $a
        
        // Количество вхождений
        #a == 1                        // строка встречается ровно 1 раз
        #b >= 3                        // 3 или более раз
        #c between 2 and 5            // от 2 до 5 раз
        
        // Позиционирование
        $a at 0                        // строка в позиции 0
        $a at 0x100                   // строка в позиции 0x100
        $a in (0..100)                // в первых 100 байтах
        $a in (filesize-500..filesize) // в последних 500 байтах
        
        // Смещения (@)
        @a[1] < @b[1]                 // первое $a перед первым $b
        @a < 1000 and @b > 1000      // $a в начале, $b в конце
}
```

### Функции для работы с данными файла

```yara
rule Functions_Demo
{
    condition:
        // Чтение байт из файла
        uint8(0) == 0x4D                          // первый байт = 'M'
        uint16(0) == 0x5A4D                       // первые 2 байта = 'MZ'
        uint32(0) == 0x00905A4D                   // первые 4 байта (DOS header)
        uint16be(0) == 0x4D5A                     // big-endian вариант
        
        // Размер файла
        filesize < 1MB                            // меньше 1 мегабайта
        filesize > 100KB and filesize < 5MB      // диапазон
        filesize == 45056                        // точный размер
        
        // Проверка типа файла
        uint32(0) == 0x464C457F                  // ELF магический байт
        uint16(0) == 0x5A4D                      // PE/MZ заголовок
}
```

---

## 📦 10.2.6 Модули YARA

### Модуль PE

```yara
import "pe"

rule PE_Module_Demo
{
    condition:
        // Тип файла
        pe.is_pe                                          // это PE файл
        pe.is_dll                                         // это DLL
        pe.is_32bit                                       // 32-битный
        pe.is_64bit                                       // 64-битный
        
        // Секции PE файла
        pe.number_of_sections > 5                         // много секций
        for any section in pe.sections:
            (section.name == ".evil" or
             section.characteristics & pe.SECTION_MEM_EXECUTE != 0 and
             section.characteristics & pe.SECTION_MEM_WRITE != 0)
        
        // Импорты (функции, которые импортирует PE)
        pe.imports("kernel32.dll", "VirtualAlloc")        // конкретная функция
        pe.imports("kernel32.dll", /Virtual.*/)           // по regex
        
        // Экспорты
        pe.exports("DllMain")
        pe.number_of_exports > 10
        
        // Подпись (Authenticode)
        pe.number_of_signatures == 0                      // нет подписи
        
        // Временная метка компиляции
        pe.timestamp > 1700000000                         // после Nov 2023
        
        // Subsystem
        pe.subsystem == pe.SUBSYSTEM_WINDOWS_GUI
        
        // Машинный тип
        pe.machine == pe.MACHINE_AMD64
        
        // Rich Header (уникален для компилятора)
        pe.rich_signature.clear_data contains "VisualC"
        
        // Resources
        pe.number_of_resources > 20
        
        // Overlay (данные после PE структуры)
        pe.overlay.offset != 0
}
```

```yara
import "pe"

// Реальный пример: детекция packed PE
rule Packed_PE_Suspicious
{
    meta:
        description = "Potentially packed/obfuscated PE file"
        
    condition:
        pe.is_pe and
        // Мало секций
        pe.number_of_sections < 4 and
        // Подозрительные имена секций
        for any section in pe.sections:
            (section.name == "" or
             section.name matches /^[^\x20-\x7e]/) and
        // Высокая энтропия указывает на упаковку
        for any section in pe.sections:
            (math.entropy(section.raw_data_offset, section.raw_data_size) > 7.0)
}
```

### Модуль ELF

```yara
import "elf"

rule ELF_Module_Demo
{
    condition:
        elf.type == elf.ET_EXEC                   // исполняемый ELF
        elf.machine == elf.EM_X86_64              // x86-64
        
        // Динамические секции
        for any dynamic in elf.dynamic:
            (dynamic.type == elf.DT_RPATH)        // RPATH манипуляция
            
        // Символы
        for any sym in elf.symtab:
            (sym.name contains "shell" or
             sym.name contains "exec")
}
```

### Модуль Math

```yara
import "math"

rule Math_Module_Demo
{
    meta:
        description = "High entropy section (packed/encrypted)"
        
    strings:
        $mz = { 4D 5A }
        
    condition:
        $mz at 0 and
        // Энтропия всего файла > 7.0 (шифрование/упаковка)
        math.entropy(0, filesize) > 7.0
        
        // Или энтропия конкретного региона
        // math.entropy(offset, size) > 7.5
        
        // Среднее значение байт
        // math.mean(0, filesize) < 100
        
        // Отклонение
        // math.deviation(0, filesize, 127.5) > 50
}
```

### Модуль Hash

```yara
import "hash"

rule Hash_Module_Demo
{
    meta:
        description = "Known malware hash check"
        
    condition:
        // Проверка MD5 хеша (первые 1000 байт)
        hash.md5(0, 1000) == "d41d8cd98f00b204e9800998ecf8427e"
        
        // SHA256 всего файла
        hash.sha256(0, filesize) == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        
        // CRC32
        hash.crc32(0, 100) == 0xDEADBEEF
        
        // Checksum
        hash.checksum32(0, filesize) > 0
}
```

---

## 🦠 10.2.7 Написание правил для реального малвера

### Пошаговый процесс написания правила

**Шаг 1: Анализ образца**

```bash
# Анализ малвера перед написанием правила
# 1. Базовая информация
file malware.exe
sha256sum malware.exe
xxd malware.exe | head -50

# 2. Строки в файле
strings -n 8 malware.exe | grep -i -E "(http|cmd|exec|power|hack|backdoor|inject)"

# 3. Импорты PE (используем objdump или pestr)
objdump -p malware.exe | grep -A200 "IMPORT"

# 4. Энтропия секций
python3 -c "
import math
from collections import Counter

with open('malware.exe', 'rb') as f:
    data = f.read()

def entropy(data):
    if not data:
        return 0
    counter = Counter(data)
    length = len(data)
    return -sum((c/length) * math.log2(c/length) for c in counter.values())

print(f'File entropy: {entropy(data):.2f}')
print(f'First 512 bytes entropy: {entropy(data[:512]):.2f}')
"
```

**Шаг 2: Поиск уникальных строк**

```bash
# Найти строки, уникальные для данного семейства
strings malware.exe | sort > malware_strings.txt
strings legitimate.exe | sort > legit_strings.txt

# Уникальные строки малвера
comm -23 malware_strings.txt legit_strings.txt | head -30
```

**Шаг 3: Написание правила**

```yara
// Пример: правило для Cobalt Strike (Beacon)
rule CobaltStrike_Beacon
{
    meta:
        author      = "Security Research"
        description = "Detects Cobalt Strike Beacon payload"
        date        = "2024-03-15"
        version     = "1.5"
        reference   = "https://www.cobaltstrike.com"
        mitre_att   = "T1055"
        
    strings:
        // Характерные строки Cobalt Strike
        $cs1 = "%s as %s\\%s: %d"       ascii wide
        $cs2 = "beacon.dll"              ascii wide nocase
        $cs3 = "IEX (New-Object Net.Webclient).DownloadString" ascii nocase
        $cs4 = "ppid"                    ascii fullword
        
        // Hex сигнатуры Cobalt Strike stage
        $hex1 = { FC 48 83 E4 F0 E8 }   // x64 shellcode стартер
        $hex2 = { 4C 8B 53 08 45 8B 0A } // CS pattern
        
        // Named pipe маски Cobalt Strike
        $pipe1 = "\\\\.\\pipe\\msagent_"   ascii wide
        $pipe2 = "\\\\.\\pipe\\status_"    ascii wide
        $pipe3 = "\\\\.\\pipe\\postex_"    ascii wide
        
        // CS profile маркеры
        $profile1 = "User-Agent: Mozilla/5.0 (Windows NT 10.0" ascii
        $profile2 = "Cookie: __cfduid=" ascii
        
    condition:
        (
            (uint16(0) == 0x5A4D and   // PE файл
             2 of ($cs*)) or
            (2 of ($pipe*)) or
            (all of ($hex*))
        ) and
        filesize < 5MB
}
```

### Правило для PowerShell-based малвера

```yara
rule Malicious_PowerShell_Dropper
{
    meta:
        author      = "ThreatHunter"
        description = "Detects PowerShell-based dropper"
        date        = "2024-03-15"
        
    strings:
        // Техники обфускации PowerShell
        $ps_enc1  = "-EncodedCommand"  nocase ascii wide
        $ps_enc2  = "-Enc "            nocase ascii
        $ps_enc3  = "-ec "             nocase ascii
        
        // Загрузка и выполнение
        $ps_dl1   = "DownloadString"   nocase ascii wide
        $ps_dl2   = "DownloadFile"     nocase ascii wide
        $ps_dl3   = "WebClient"        nocase ascii wide
        $ps_dl4   = "Invoke-Expression" nocase ascii wide
        $ps_dl5   = "IEX("             nocase ascii
        
        // Bypass техники
        $bypass1  = "Set-MpPreference -DisableRealtimeMonitoring" nocase ascii
        $bypass2  = "Add-MpPreference -ExclusionPath"             nocase ascii
        $bypass3  = "AMSI"                                         nocase ascii
        $bypass4  = "amsiInitFailed"                              nocase ascii
        $bypass5  = "[Ref].Assembly.GetType"                      nocase ascii
        
        // Reflection
        $reflect1 = "Reflection.Assembly"    nocase ascii
        $reflect2 = "Assembly.Load"          nocase ascii
        $reflect3 = "System.Runtime.InteropServices" nocase ascii
        
    condition:
        filesize < 2MB and
        (
            // Явный encoder + выполнение
            (any of ($ps_enc*) and any of ($ps_dl*)) or
            
            // Bypass + любое действие
            (any of ($bypass*)) or
            
            // Reflection loading
            (2 of ($reflect*) and any of ($ps_dl*))
        )
}
```

### Правило для Ransomware

```yara
import "pe"
import "math"

rule Generic_Ransomware_Indicators
{
    meta:
        author      = "DFIR Team"
        description = "Generic ransomware behavior indicators"
        date        = "2024-03-15"
        severity    = "critical"
        
    strings:
        // Расширения выкупа (ransom note файлы)
        $note1 = "YOUR_FILES_ARE_ENCRYPTED" nocase ascii wide
        $note2 = "HOW_TO_DECRYPT"           nocase ascii wide
        $note3 = "README_FOR_DECRYPT"       nocase ascii wide
        $note4 = "DECRYPT_INSTRUCTIONS"     nocase ascii wide
        $note5 = "All your files have been encrypted" nocase ascii wide
        
        // Bitcoin адреса
        $btc = /[13][a-km-zA-HJ-NP-Z0-9]{25,34}/
        
        // Tor адреса
        $tor = /[a-z2-7]{16}\.onion/ nocase
        
        // Shadow copy deletion (классика ransomware)
        $vss1 = "vssadmin delete shadows"          nocase ascii wide
        $vss2 = "vssadmin.exe Delete Shadows"      nocase ascii wide
        $vss3 = "Win32_ShadowCopy"                 nocase ascii wide
        $vss4 = "wmic shadowcopy delete"           nocase ascii wide
        $vss5 = "bcdedit /set {default} recoveryenabled No" nocase ascii wide
        
        // Шифрование API
        $crypt1 = "CryptEncrypt"    ascii
        $crypt2 = "CryptGenKey"     ascii
        $crypt3 = "CryptImportKey"  ascii
        $crypt4 = "BCryptEncrypt"   ascii
        
        // Обход AV
        $av1 = "net stop" nocase ascii
        $av2 = "taskkill" nocase ascii
        
    condition:
        pe.is_pe and
        filesize < 10MB and
        (
            (2 of ($note*)) or
            ($tor and any of ($note*)) or
            (2 of ($vss*)) or
            (2 of ($crypt*) and any of ($note*)) or
            (all of ($vss1, $vss4) and any of ($crypt*))
        )
}
```

### Правило для Keylogger

```yara
import "pe"

rule Keylogger_Windows
{
    meta:
        description = "Windows keylogger detection"
        
    strings:
        // Keyboard hook API
        $hook1 = "SetWindowsHookEx"    ascii wide
        $hook2 = "SetWindowsHookExA"   ascii
        $hook3 = "SetWindowsHookExW"   ascii wide
        $hook4 = "CallNextHookEx"      ascii wide
        $hook5 = "UnhookWindowsHookEx" ascii wide
        
        // WH_KEYBOARD константы в коде
        $kbd1 = "WH_KEYBOARD_LL"  ascii
        $kbd2 = { 0D 00 00 00 }  // WH_KEYBOARD_LL = 13 = 0x0D
        
        // Запись в файл
        $log1 = "keylog"   nocase ascii wide
        $log2 = "keystrokes" nocase ascii wide
        $log3 = "clipboard" nocase ascii wide
        
        // GetAsyncKeyState (другой метод)
        $async = "GetAsyncKeyState" ascii wide
        
        // Clipboard hooks
        $clip1 = "OpenClipboard"   ascii
        $clip2 = "GetClipboardData" ascii
        $clip3 = "SetClipboardViewer" ascii
        
    condition:
        pe.is_pe and
        (
            (2 of ($hook*) and any of ($kbd*)) or
            ($async and any of ($log*)) or
            (all of ($clip1, $clip2, $clip3))
        )
}
```

---

## 🧪 10.2.8 Тестирование YARA-правил

### Установка и базовое использование

```bash
# Установка YARA
# Ubuntu/Debian
sudo apt-get install yara

# macOS
brew install yara

# Из исходников
git clone https://github.com/VirusTotal/yara
cd yara
./bootstrap.sh
./configure --with-crypto --enable-magic --enable-cuckoo
make && sudo make install

# Проверка установки
yara --version
```

### Синтаксис командной строки

```bash
# Базовое сканирование
yara rules.yar target_file.exe

# Сканирование директории рекурсивно
yara -r rules.yar /path/to/samples/

# Сканирование запущенных процессов
yara rules.yar -p $(pgrep malware)

# Сканирование всех процессов
sudo yara rules.yar $(ps -e -o pid= | tr '\n' ' ')

# Подробный вывод (показывать совпадения строк)
yara -s rules.yar sample.exe

# Только имена правил, без деталей
yara -n rules.yar sample.exe

# Задать timeout (секунды)
yara -t 60 rules.yar sample.exe

# Статистика сканирования
yara --print-stats rules.yar sample.exe

# Использовать внешние переменные
yara -d filename=malware.exe rules.yar sample.exe

# Отказ при ошибках компиляции
yara --fail-on-warnings rules.yar sample.exe
```

### Отладка правил

```bash
# Тест на специально созданном файле
echo -n "This file contains powershell -enc command" > test.txt
yara -s myrule.yar test.txt

# Проверка синтаксиса без запуска
yarac myrule.yar /dev/null

# Компиляция в байткод (для быстрого использования)
yarac myrule.yar compiled_rules.yarc
yara compiled_rules.yarc sample.exe

# Тестирование с verbose
yara -v rules.yar sample.exe 2>&1
```

### Тестовый фреймворк для правил

```python
#!/usr/bin/env python3
# test_yara_rules.py — автоматическое тестирование YARA правил

import yara
import os
import json

class YaraRuleTester:
    def __init__(self, rules_file):
        self.rules = yara.compile(filepath=rules_file)
        self.results = []
    
    def test_positive(self, file_path, expected_rule=None):
        """Тест: файл ДОЛЖЕН быть обнаружен"""
        matches = self.rules.match(file_path)
        
        if expected_rule:
            matched_rules = [m.rule for m in matches]
            success = expected_rule in matched_rules
        else:
            success = len(matches) > 0
        
        result = {
            "test": "positive",
            "file": os.path.basename(file_path),
            "expected": expected_rule or "any match",
            "matched": [m.rule for m in matches],
            "pass": success
        }
        self.results.append(result)
        return success
    
    def test_negative(self, file_path, expected_no_rule=None):
        """Тест: файл НЕ должен быть обнаружен (false positive test)"""
        matches = self.rules.match(file_path)
        
        if expected_no_rule:
            matched_rules = [m.rule for m in matches]
            success = expected_no_rule not in matched_rules
        else:
            success = len(matches) == 0
        
        result = {
            "test": "negative",
            "file": os.path.basename(file_path),
            "expected": f"NOT {expected_no_rule or 'any match'}",
            "matched": [m.rule for m in matches],
            "pass": success
        }
        self.results.append(result)
        return success
    
    def print_report(self):
        passed = sum(1 for r in self.results if r['pass'])
        total = len(self.results)
        
        print(f"\n{'='*60}")
        print(f"YARA Rule Test Report")
        print(f"{'='*60}")
        print(f"Passed: {passed}/{total} ({passed/total*100:.0f}%)")
        print(f"{'='*60}\n")
        
        for result in self.results:
            status = "✓ PASS" if result['pass'] else "✗ FAIL"
            print(f"{status} [{result['test'].upper()}] {result['file']}")
            print(f"       Expected: {result['expected']}")
            if result['matched']:
                print(f"       Matched: {', '.join(result['matched'])}")
            print()

# Использование
if __name__ == "__main__":
    tester = YaraRuleTester("malware_rules.yar")
    
    # Positive tests (должны сработать)
    tester.test_positive("samples/cobalt_strike_beacon.bin", "CobaltStrike_Beacon")
    tester.test_positive("samples/mirai_elf", "Mirai_Botnet_Sample")
    tester.test_positive("samples/ransomware_sample.exe", "Generic_Ransomware_Indicators")
    
    # Negative tests (НЕ должны срабатывать)
    tester.test_negative("samples/calc.exe", "Generic_Ransomware_Indicators")
    tester.test_negative("samples/notepad.exe")
    
    tester.print_report()
```

---

## 🐍 10.2.9 YARA-Python: интеграция в скрипты

### Установка

```bash
pip install yara-python

# Или с дополнительными модулями
pip install yara-python[crypto]
```

### Базовое использование

```python
import yara

# Компиляция правила из строки
rule_text = '''
rule Simple_Test {
    strings:
        $str = "malware"
    condition:
        $str
}
'''

rules = yara.compile(source=rule_text)

# Сканирование файла
matches = rules.match('/path/to/file.exe')
for match in matches:
    print(f"Rule: {match.rule}")
    print(f"Tags: {match.tags}")
    print(f"Strings:")
    for s in match.strings:
        print(f"  Offset: {s.offset}, Identifier: {s.identifier}")
        print(f"  Data: {s.plaintext()}")
```

### Сканирование дампа памяти

```python
import yara
import psutil
import ctypes

def scan_process_memory(pid: int, rules: yara.Rules) -> list:
    """Сканирование памяти процесса YARA-правилами"""
    results = []
    
    try:
        process = psutil.Process(pid)
        proc_name = process.name()
        
        # Получаем карту памяти
        memory_maps = process.memory_maps(grouped=False)
        
        for mmap in memory_maps:
            try:
                # Читаем регион памяти
                with open(f"/proc/{pid}/mem", 'rb') as mem_file:
                    start = int(mmap.addr.split('-')[0], 16)
                    size = int(mmap.addr.split('-')[1], 16) - start
                    
                    if size > 0 and size < 100*1024*1024:  # < 100MB
                        mem_file.seek(start)
                        data = mem_file.read(size)
                        
                        matches = rules.match(data=data)
                        if matches:
                            results.append({
                                'pid': pid,
                                'process': proc_name,
                                'region': mmap.addr,
                                'path': mmap.path,
                                'rules': [m.rule for m in matches]
                            })
            except (OSError, IOError):
                continue
                
    except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
        print(f"Error scanning PID {pid}: {e}")
    
    return results


# Сканирование всех процессов
rules = yara.compile(filepath='hunting_rules.yar')

print("Сканирование памяти всех процессов...")
for proc in psutil.process_iter(['pid', 'name']):
    results = scan_process_memory(proc.pid, rules)
    for r in results:
        print(f"\n[!] ОБНАРУЖЕНО в PID {r['pid']} ({r['process']})")
        print(f"    Регион: {r['region']}")
        print(f"    Правила: {', '.join(r['rules'])}")
```

### Автоматизированный сканер директорий

```python
import yara
import os
import hashlib
import json
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

class YaraScanner:
    def __init__(self, rules_paths: list):
        """Инициализация сканера с несколькими файлами правил"""
        self.rules = yara.compile(filepaths={
            os.path.basename(p): p for p in rules_paths
        })
        self.results = []
    
    def scan_file(self, file_path: str) -> dict | None:
        """Сканирование одного файла"""
        try:
            file_size = os.path.getsize(file_path)
            
            # Пропускаем очень большие файлы
            if file_size > 50 * 1024 * 1024:
                return None
            
            matches = self.rules.match(file_path, timeout=30)
            
            if matches:
                # Вычисляем хеш
                sha256 = hashlib.sha256()
                with open(file_path, 'rb') as f:
                    for chunk in iter(lambda: f.read(4096), b''):
                        sha256.update(chunk)
                
                return {
                    'timestamp': datetime.now().isoformat(),
                    'file': file_path,
                    'size': file_size,
                    'sha256': sha256.hexdigest(),
                    'rules': [
                        {
                            'name': m.rule,
                            'tags': m.tags,
                            'meta': m.meta,
                            'strings_count': len(m.strings)
                        } for m in matches
                    ]
                }
        except (yara.TimeoutError, yara.Error) as e:
            print(f"YARA error on {file_path}: {e}")
        except (OSError, IOError) as e:
            print(f"IO error on {file_path}: {e}")
        
        return None
    
    def scan_directory(self, directory: str, max_workers: int = 4) -> list:
        """Параллельное сканирование директории"""
        files = []
        for root, _, filenames in os.walk(directory):
            for fname in filenames:
                files.append(os.path.join(root, fname))
        
        print(f"Найдено файлов для сканирования: {len(files)}")
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(self.scan_file, f): f for f in files}
            
            scanned = 0
            for future in as_completed(futures):
                scanned += 1
                if scanned % 100 == 0:
                    print(f"Прогресс: {scanned}/{len(files)}")
                
                result = future.result()
                if result:
                    self.results.append(result)
                    print(f"\n[!] СОВПАДЕНИЕ: {result['file']}")
                    for rule in result['rules']:
                        print(f"    Правило: {rule['name']}")
        
        return self.results
    
    def save_report(self, output_file: str):
        """Сохранение результатов в JSON"""
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        print(f"\nОтчёт сохранён: {output_file}")
        print(f"Всего совпадений: {len(self.results)}")


# Использование
scanner = YaraScanner([
    'rules/malware_hunting.yar',
    'rules/ransomware.yar',
    'rules/cobalt_strike.yar'
])

results = scanner.scan_directory('/home/user/samples/', max_workers=8)
scanner.save_report('yara_scan_report.json')
```

---

## 🌐 10.2.10 Источники публичных YARA-правил

### Основные репозитории

| Репозиторий | URL | Содержание |
|---|---|---|
| **Awesome YARA** | github.com/InQuest/awesome-yara | Коллекция всех репо |
| **YARA-Rules** | github.com/Yara-Rules/rules | Общие правила |
| **Signature-Base** | github.com/Neo23x0/signature-base | Florian Roth правила |
| **Malpedia YARA** | malpedia.caad.fkie.fraunhofer.de | По семействам малвера |
| **VirusTotal YARA** | virustotal.com (платно) | Правила вендоров |
| **YARAhub** | yarahub.com | Открытая база правил |
| **Cape YARA** | github.com/kevoreilly/CAPEv2 | CAPE sandbox правила |

### Использование Signature-Base (Florian Roth)

```bash
# Клонирование репозитория
git clone https://github.com/Neo23x0/signature-base.git
cd signature-base

# Структура:
# yara/ - основные YARA правила
# iocs/ - IOC файлы
# misc/ - прочие паттерны

# Сканирование с использованием всех правил
yara -r yara/ /path/to/samples/

# Только конкретное семейство
yara yara/apt_apt29_nobelium.yar /path/to/sample.exe
```

### Обновление правил из нескольких источников

```python
#!/usr/bin/env python3
# update_yara_rules.py

import os
import subprocess
import requests
from pathlib import Path

RULES_DIR = Path("/opt/yara_rules")
REPOS = [
    {
        "name": "signature-base",
        "url": "https://github.com/Neo23x0/signature-base.git",
        "subdir": "yara"
    },
    {
        "name": "yara-rules",
        "url": "https://github.com/Yara-Rules/rules.git",
        "subdir": "malware"
    }
]

def update_repo(repo: dict):
    repo_path = RULES_DIR / repo["name"]
    
    if repo_path.exists():
        print(f"Обновление {repo['name']}...")
        subprocess.run(["git", "-C", str(repo_path), "pull"], check=True)
    else:
        print(f"Клонирование {repo['name']}...")
        subprocess.run(["git", "clone", repo["url"], str(repo_path)], check=True)
    
    print(f"✓ {repo['name']} обновлён")

def compile_all_rules():
    """Компилируем все правила в один файл"""
    import yara
    
    all_rules = {}
    for repo in REPOS:
        rules_path = RULES_DIR / repo["name"] / repo["subdir"]
        
        for yar_file in rules_path.glob("**/*.yar"):
            try:
                rule_name = str(yar_file.relative_to(RULES_DIR)).replace('/', '_').replace('.yar', '')
                all_rules[rule_name] = str(yar_file)
            except Exception:
                continue
    
    print(f"Компиляция {len(all_rules)} файлов правил...")
    try:
        compiled = yara.compile(filepaths=all_rules)
        compiled.save(str(RULES_DIR / "compiled_all.yarc"))
        print(f"✓ Скомпилировано: {RULES_DIR / 'compiled_all.yarc'}")
    except yara.SyntaxError as e:
        print(f"Ошибка компиляции: {e}")

if __name__ == "__main__":
    RULES_DIR.mkdir(parents=True, exist_ok=True)
    
    for repo in REPOS:
        update_repo(repo)
    
    compile_all_rules()
```

---

## 🏋️ 10.2.11 Практические задания

### Задание 1: Написание правила для веб-шелла

**Сценарий**: Обнаружен PHP веб-шелл. Напишите YARA-правило для его детекции.

```yara
// ЗАДАНИЕ: Дополните это правило
rule PHP_WebShell_Basic
{
    meta:
        author      = "STUDENT"
        description = "Detect PHP webshells - ЗАПОЛНИТЕ"
        
    strings:
        // Подсказка: веб-шеллы обычно используют:
        // - system(), exec(), passthru(), shell_exec()
        // - $_GET, $_POST, $_REQUEST
        // - base64_decode(), eval()
        
        // ДОБАВЬТЕ СТРОКИ ЗДЕСЬ
        $php_exec1 = "system(" nocase
        // ... продолжите
        
    condition:
        // НАПИШИТЕ CONDITION
}
```

**Решение:**

```yara
rule PHP_WebShell_Detection
{
    meta:
        author      = "Security Analyst"
        description = "Detects common PHP webshell patterns"
        date        = "2024-03-15"
        
    strings:
        // Опасные функции исполнения
        $exec1 = "system("         nocase
        $exec2 = "exec("           nocase  
        $exec3 = "passthru("       nocase
        $exec4 = "shell_exec("     nocase
        $exec5 = "popen("          nocase
        $exec6 = "proc_open("      nocase
        $exec7 = "pcntl_exec("     nocase
        
        // Параметры GET/POST
        $input1 = "$_GET"   ascii
        $input2 = "$_POST"  ascii
        $input3 = "$_REQUEST" ascii
        $input4 = "getallheaders" nocase
        
        // Обфускация
        $obf1 = "base64_decode(" nocase
        $obf2 = "str_rot13("     nocase
        $obf3 = "gzinflate("     nocase
        $obf4 = "gzuncompress("  nocase
        $obf5 = "eval("          nocase
        $obf6 = "assert("        nocase
        
        // Признаки шелла
        $shell1 = "<?php" nocase
        $shell2 = "c99shell" nocase
        $shell3 = "r57shell"  nocase
        $shell4 = "FilesMan"  nocase
        $shell5 = "WSO"       ascii
        
    condition:
        $shell1 and
        filesize < 500KB and
        (
            // Явные шеллы
            any of ($shell2, $shell3, $shell4, $shell5) or
            
            // exec + input = веб-шелл
            (any of ($exec*) and any of ($input*)) or
            
            // eval + decode + input
            (any of ($obf1, $obf2, $obf3, $obf4) and 
             $obf5 and 
             any of ($input*))
        )
}
```

### Задание 2: CTF — Анализ образца малвера

```
СЦЕНАРИЙ:
Вам предоставлен подозрительный файл mystery_malware.exe (64-битный PE).

ИНФОРМАЦИЯ:
- SHA256: a94f5374fce5edbc8e2a8697cf15f9ea
- Размер: 45,312 байт
- Первые 8 байт: 4D 5A 90 00 03 00 00 00
- Строки содержат: "CONNECT", "svchost.exe", некий домен

Задача 1: Напишите YARA-правило, которое:
  - Детектирует PE файлы
  - Содержит строку "CONNECT"
  - Импортирует функции из wininet.dll
  - Размер 40-50 KB

Задача 2: Добавьте в правило поиск XOR-шифрованной строки "BACKDOOR"
  с ключами от 1 до 255.

Задача 3: Используйте math.entropy() для детекции зашифрованных секций.

ФЛАГ: Описание детектированного вредоносного семейства в meta.description
```

```yara
// ОТВЕТ НА CTF:
import "pe"
import "math"

rule CTF_Mystery_Malware
{
    meta:
        description = "HTTP backdoor using CONNECT method with XOR obfuscation"
        family      = "Generic HTTP Backdoor"
        sha256      = "a94f5374fce5edbc8e2a8697cf15f9ea"
        flag        = "flag{http_backdoor_xor_obfuscated}"
        
    strings:
        $connect = "CONNECT" ascii
        $svc     = "svchost.exe" nocase wide ascii
        
        // XOR вариации "BACKDOOR"
        $xor_backdoor = "BACKDOOR" xor(1-255)
        
    condition:
        // PE файл
        pe.is_pe and
        pe.is_64bit and
        
        // Размер 40-50 KB
        filesize >= 40KB and filesize <= 50KB and
        
        // Импорт из wininet
        pe.imports("wininet.dll") and
        
        // Наличие строк
        $connect and
        
        // XOR строка
        $xor_backdoor and
        
        // Высокая энтропия (шифрование/обфускация)
        math.entropy(0, filesize) > 6.5
}
```

### Задание 3: Интеграция с VirusTotal

```python
#!/usr/bin/env python3
# vt_yara_hunt.py — поиск файлов по YARA через VirusTotal API

import requests
import json
import time
import base64

VT_API_KEY = "YOUR_VT_API_KEY"
BASE_URL = "https://www.virustotal.com/api/v3"

def submit_yara_hunt(rule: str, days_back: int = 7) -> str:
    """Запустить YARA hunt на VirusTotal Retrohunt"""
    
    headers = {
        "x-apikey": VT_API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "data": {
            "attributes": {
                "rules": rule,
                "time_range": f"last_{days_back}d",
                "corpus": "goodware+malware"
            },
            "type": "retrohunt_job"
        }
    }
    
    response = requests.post(
        f"{BASE_URL}/intelligence/retrohunt_jobs",
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        job_id = response.json()['data']['id']
        print(f"Hunt запущен. Job ID: {job_id}")
        return job_id
    else:
        print(f"Ошибка: {response.status_code} - {response.text}")
        return None

def get_hunt_results(job_id: str) -> list:
    """Получить результаты hunt"""
    
    headers = {"x-apikey": VT_API_KEY}
    
    # Ждём завершения
    while True:
        response = requests.get(
            f"{BASE_URL}/intelligence/retrohunt_jobs/{job_id}",
            headers=headers
        )
        status = response.json()['data']['attributes']['status']
        
        if status == 'finished':
            break
        elif status == 'running':
            print("Hunt выполняется... ожидаем 30 сек")
            time.sleep(30)
        else:
            print(f"Статус: {status}")
            return []
    
    # Получаем результаты
    response = requests.get(
        f"{BASE_URL}/intelligence/retrohunt_jobs/{job_id}/matching_files",
        headers=headers
    )
    
    return response.json().get('data', [])

# Правило для поиска
my_rule = '''
rule CTF_Sample_Hunt {
    strings:
        $s1 = "CONNECT" ascii
        $s2 = "BACKDOOR" xor(1-255)
    condition:
        all of them and filesize < 100KB
}
'''

# Запуск
job_id = submit_yara_hunt(my_rule, days_back=30)
if job_id:
    results = get_hunt_results(job_id)
    print(f"\nНайдено образцов: {len(results)}")
    for sample in results[:10]:
        sha = sample['id']
        print(f"  SHA256: {sha}")
        print(f"  URL: https://www.virustotal.com/gui/file/{sha}")
```

> **Note**: Для работы с VirusTotal Hunting нужен платный аккаунт (VT Premium). Для практики используйте локальные тестовые образцы из открытых источников: theZoo (github.com/ytisf/theZoo), VirusShare (virussharе.com), или MalwareBazaar (bazaar.abuse.ch).

---

## 📚 Ресурсы

| Ресурс | URL |
|---|---|
| YARA Documentation | https://yara.readthedocs.io |
| YARA-Python | https://github.com/VirusTotal/yara-python |
| Awesome YARA | https://github.com/InQuest/awesome-yara |
| Signature-Base | https://github.com/Neo23x0/signature-base |
| YARAhub | https://yarahub.com |
| MalwareBazaar | https://bazaar.abuse.ch |
| YARA Forge | https://github.com/YARAHQ/yara-forge |

---

## 🔑 Ключевые выводы

1. **YARA** — стандарт индустрии для написания сигнатур малвера
2. **Три типа строк**: text, hex и regex позволяют покрыть любые паттерны
3. **Модификаторы** (nocase, wide, xor) расширяют охват правил
4. **Модуль PE** даёт доступ к структуре PE-файла для точной детекции
5. **Тестирование правил** обязательно — false positives разрушают доверие
6. **YARA-Python** позволяет встраивать детекцию в любые пайплайны
7. **Публичные репозитории** — ценный источник правил для старта
