# Глава 3.3: PowerShell для анализа безопасности

## 🎯 Цели главы

- Понять разницу между Get-EventLog и Get-WinEvent и когда использовать каждый
- Научиться фильтровать события с помощью FilterHashtable и XML-запросов
- Уметь извлекать конкретные поля из XML-структуры событий
- Освоить Get-Process, Get-Service, Get-NetTCPConnection для анализа хоста
- Знать основные командлеты для работы с пользователями и группами
- Уметь строить конвейеры (pipeline) с Where-Object, Select-Object, Group-Object
- Написать полноценный скрипт анализа безопасности с экспортом результатов

---

## 3.3.1 Get-EventLog vs Get-WinEvent

В PowerShell есть два командлета для работы с журналами событий. Понимание их различий критично для эффективной работы.

### Get-EventLog — устаревший, но простой

```powershell
Get-EventLog -LogName Security -Newest 100
Get-EventLog -LogName Security -InstanceId 4625 -Newest 50
Get-EventLog -LogName System -EntryType Error -After (Get-Date).AddDays(-7)
```

**Ограничения Get-EventLog:**
- Работает только со "старыми" журналами: Application, Security, System, Setup
- НЕ работает с `Microsoft-Windows-Sysmon/Operational`, `Microsoft-Windows-PowerShell/Operational` и другими Application/Service логами
- Медленнее Get-WinEvent при больших объёмах
- Официально устарел (deprecated) в PowerShell 6+

### Get-WinEvent — современный и мощный

```powershell
# Все события из Security за последние 24 часа
Get-WinEvent -FilterHashtable @{
    LogName   = 'Security'
    StartTime = (Get-Date).AddHours(-24)
}

# По конкретному Event ID
Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    Id      = 4625
}

# Sysmon-события (Get-EventLog не умеет!)
Get-WinEvent -FilterHashtable @{
    LogName = 'Microsoft-Windows-Sysmon/Operational'
    Id      = 1   # Process Create
}
```

**Преимущества Get-WinEvent:**
- Работает со всеми журналами Windows
- Поддерживает FilterHashtable и FilterXml для быстрой фильтрации на уровне ядра
- Может читать `.evtx`-файлы: `-Path C:\backup\security.evtx`
- Значительно быстрее при больших объёмах (фильтрация до получения объектов)
- Поддерживает удалённые компьютеры: `-ComputerName DC01`

### Параметры FilterHashtable

```powershell
Get-WinEvent -FilterHashtable @{
    LogName   = 'Security'          # Имя журнала
    Id        = @(4624, 4625, 4648) # Один или массив Event ID
    StartTime = '2025-01-15 08:00'  # Начало периода
    EndTime   = '2025-01-15 18:00'  # Конец периода
    Level     = @(1, 2, 3)         # 1=Critical, 2=Error, 3=Warning, 4=Info
    Keywords  = 4503599627370496   # 0x10000000000000 = AuditSuccess
                                   # 0x8010000000000000 = AuditFailure
    Data      = 'administrator'    # Поиск в данных события
}
```

**Важно:** `Data = 'value'` — поиск по совпадению в EventData. Медленнее, чем фильтр по ID, но позволяет искать по содержимому.

### Чтение из файла .evtx

```powershell
# Читать с удалённого компьютера
Get-WinEvent -FilterHashtable @{
    Path    = '\\DC01\C$\Windows\System32\winevt\Logs\Security.evtx'
    Id      = 4625
}

# Читать локальный файл (для оффлайн-анализа)
Get-WinEvent -FilterHashtable @{
    Path      = 'C:\Forensics\Security.evtx'
    StartTime = '2025-01-01'
    EndTime   = '2025-01-31'
}
```

---

## 3.3.2 Извлечение полей из событий

Событие Windows — это XML-объект. Большинство интересных данных находится в `EventData`. Чтобы их извлечь, нужно преобразовать событие в XML.

### Структура объекта события

```powershell
$event = Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4624} -MaxEvents 1
$event | Get-Member  # посмотреть доступные свойства

# Доступные свойства:
$event.Id              # 4624
$event.TimeCreated     # 01/15/2025 10:23:45
$event.Message         # полный текст (медленно, требует форматирования)
$event.MachineName     # WORKSTATION01
$event.UserId          # SID
$event.LevelDisplayName # Information
$event.KeywordsDisplayNames # {Audit Success}
```

### Парсинг XML для получения EventData

```powershell
# Метод 1: Через ToXml() и [xml]
$event = Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4624} -MaxEvents 1
$xml = [xml]$event.ToXml()
$data = $xml.Event.EventData.Data

# Получить конкретное поле по имени
$logonType = ($data | Where-Object {$_.Name -eq 'LogonType'}).'#text'
$targetUser = ($data | Where-Object {$_.Name -eq 'TargetUserName'}).'#text'
$ipAddress  = ($data | Where-Object {$_.Name -eq 'IpAddress'}).'#text'

Write-Host "Logon Type: $logonType, User: $targetUser, IP: $ipAddress"
```

```powershell
# Метод 2: Через Properties (быстрее, но без имён полей)
$event.Properties[8].Value   # 9-й элемент (нумерация с 0)
# Нужно знать порядок полей для конкретного EventID — неудобно
```

### Функция-обёртка для парсинга

```powershell
function Get-EventField {
    param(
        [System.Diagnostics.Eventing.Reader.EventLogRecord]$Event,
        [string]$FieldName
    )
    $xml = [xml]$Event.ToXml()
    $data = $xml.Event.EventData.Data
    return ($data | Where-Object {$_.Name -eq $FieldName}).'#text'
}

# Использование:
$events = Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4624} -MaxEvents 10
foreach ($e in $events) {
    $user    = Get-EventField -Event $e -FieldName 'TargetUserName'
    $type    = Get-EventField -Event $e -FieldName 'LogonType'
    $ip      = Get-EventField -Event $e -FieldName 'IpAddress'
    Write-Host "$($e.TimeCreated) | Type=$type | User=$user | IP=$ip"
}
```

---

## 3.3.3 Практические запросы по Event ID

### Все неудачные логины за 24 часа (Event ID 4625)

```powershell
$failedLogons = Get-WinEvent -FilterHashtable @{
    LogName   = 'Security'
    Id        = 4625
    StartTime = (Get-Date).AddHours(-24)
} -ErrorAction SilentlyContinue

$results = $failedLogons | ForEach-Object {
    $xml = [xml]$_.ToXml()
    $d   = $xml.Event.EventData.Data
    [PSCustomObject]@{
        Time       = $_.TimeCreated
        TargetUser = ($d | Where-Object Name -eq 'TargetUserName').'#text'
        Domain     = ($d | Where-Object Name -eq 'TargetDomainName').'#text'
        IpAddress  = ($d | Where-Object Name -eq 'IpAddress').'#text'
        LogonType  = ($d | Where-Object Name -eq 'LogonType').'#text'
        SubStatus  = ($d | Where-Object Name -eq 'SubStatus').'#text'
        Workstation= ($d | Where-Object Name -eq 'WorkstationName').'#text'
    }
}

# Топ-10 пользователей по числу неудач
$results | Group-Object TargetUser | Sort-Object Count -Descending |
    Select-Object -First 10 Name, Count | Format-Table -AutoSize

# Топ-10 IP по числу неудач
$results | Group-Object IpAddress | Sort-Object Count -Descending |
    Select-Object -First 10 Name, Count | Format-Table -AutoSize
```

### Все созданные процессы за 1 час (Event ID 4688)

```powershell
$processes = Get-WinEvent -FilterHashtable @{
    LogName   = 'Security'
    Id        = 4688
    StartTime = (Get-Date).AddHours(-1)
} -ErrorAction SilentlyContinue

$results = $processes | ForEach-Object {
    $xml = [xml]$_.ToXml()
    $d   = $xml.Event.EventData.Data
    [PSCustomObject]@{
        Time           = $_.TimeCreated
        User           = ($d | Where-Object Name -eq 'SubjectUserName').'#text'
        NewProcess     = ($d | Where-Object Name -eq 'NewProcessName').'#text'
        ParentProcess  = ($d | Where-Object Name -eq 'ParentProcessName').'#text'
        CommandLine    = ($d | Where-Object Name -eq 'CommandLine').'#text'
    }
}

# Поиск подозрительных командных строк
$results | Where-Object {
    $_.CommandLine -match '-enc|-EncodedCommand|-nop|-exec bypass|downloadstring|iex|invoke-expression'
} | Format-Table Time, User, CommandLine -AutoSize -Wrap
```

### Все новые сервисы за неделю (Event ID 7045)

```powershell
$services = Get-WinEvent -FilterHashtable @{
    LogName   = 'System'
    Id        = 7045
    StartTime = (Get-Date).AddDays(-7)
} -ErrorAction SilentlyContinue

$results = $services | ForEach-Object {
    $xml = [xml]$_.ToXml()
    $d   = $xml.Event.EventData.Data
    [PSCustomObject]@{
        Time        = $_.TimeCreated
        ServiceName = ($d | Where-Object Name -eq 'ServiceName').'#text'
        ImagePath   = ($d | Where-Object Name -eq 'ImagePath').'#text'
        StartType   = ($d | Where-Object Name -eq 'StartType').'#text'
        Account     = ($d | Where-Object Name -eq 'AccountName').'#text'
    }
}

$results | Format-Table -AutoSize

# Подозрительные: путь в %TEMP%, %APPDATA%, C:\Users
$results | Where-Object {
    $_.ImagePath -match 'Temp|AppData|Users\\Public|ProgramData' -or
    $_.Account -match 'LocalSystem|SYSTEM'
} | Format-Table -AutoSize -Wrap
```

### Все изменения в привилегированных группах (Event ID 4732)

```powershell
$groupChanges = Get-WinEvent -FilterHashtable @{
    LogName   = 'Security'
    Id        = @(4732, 4728, 4756)   # 4732=Local group, 4728=Global group, 4756=Universal
    StartTime = (Get-Date).AddDays(-7)
} -ErrorAction SilentlyContinue

$results = $groupChanges | ForEach-Object {
    $xml = [xml]$_.ToXml()
    $d   = $xml.Event.EventData.Data
    [PSCustomObject]@{
        Time          = $_.TimeCreated
        EventId       = $_.Id
        Actor         = ($d | Where-Object Name -eq 'SubjectUserName').'#text'
        MemberAdded   = ($d | Where-Object Name -eq 'MemberName').'#text'
        GroupName     = ($d | Where-Object Name -eq 'TargetUserName').'#text'
    }
}

# Только привилегированные группы
$results | Where-Object {
    $_.GroupName -match 'Admin|Domain Admin|Enterprise Admin|Backup Operator'
} | Format-Table -AutoSize
```

---

## 3.3.4 Анализ состояния хоста

### Get-Process — анализ процессов

```powershell
# Все процессы с путём и хэшем
Get-Process | Select-Object Id, Name, CPU, WorkingSet, Path |
    Sort-Object CPU -Descending | Format-Table -AutoSize

# Найти процессы без пути (подозрительно — инъекция в память?)
Get-Process | Where-Object {-not $_.Path} |
    Select-Object Id, Name, CPU | Format-Table -AutoSize

# Детальная информация по конкретному процессу
Get-Process -Name svchost | Format-List *

# Хеш исполняемого файла (для проверки по VirusTotal)
Get-Process | Where-Object {$_.Path} | ForEach-Object {
    $hash = Get-FileHash $_.Path -Algorithm SHA256 -ErrorAction SilentlyContinue
    [PSCustomObject]@{
        PID  = $_.Id
        Name = $_.Name
        Path = $_.Path
        SHA256 = $hash.Hash
    }
} | Format-Table -AutoSize

# Процессы, запущенные не из System32 / Program Files (аномалия)
Get-Process | Where-Object {
    $_.Path -and
    $_.Path -notmatch 'Windows\\System32|Windows\\SysWOW64|Program Files'
} | Select-Object Id, Name, Path | Format-Table -AutoSize -Wrap
```

### Get-Service — анализ сервисов

```powershell
# Все запущенные сервисы
Get-Service | Where-Object {$_.Status -eq 'Running'} |
    Sort-Object DisplayName | Format-Table -AutoSize

# Сервисы с нестандартными путями
Get-WmiObject Win32_Service | Where-Object {
    $_.PathName -match 'Temp|AppData|Users\\Public'
} | Select-Object Name, DisplayName, PathName, StartMode, State |
    Format-Table -AutoSize -Wrap

# Сервисы, запущенные от SYSTEM/LocalSystem
Get-WmiObject Win32_Service | Where-Object {
    $_.StartName -match 'LocalSystem|NT AUTHORITY\\SYSTEM'
} | Select-Object Name, DisplayName, PathName, StartName |
    Format-Table -AutoSize
```

### Get-NetTCPConnection — сетевые соединения

```powershell
# Все установленные TCP-соединения с процессами
Get-NetTCPConnection -State Established | ForEach-Object {
    $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    [PSCustomObject]@{
        LocalAddress  = "$($_.LocalAddress):$($_.LocalPort)"
        RemoteAddress = "$($_.RemoteAddress):$($_.RemotePort)"
        State         = $_.State
        PID           = $_.OwningProcess
        ProcessName   = $proc.Name
        ProcessPath   = $proc.Path
    }
} | Format-Table -AutoSize

# Прослушивающие порты (что открыто наружу?)
Get-NetTCPConnection -State Listen | ForEach-Object {
    $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    [PSCustomObject]@{
        Port        = $_.LocalPort
        PID         = $_.OwningProcess
        ProcessName = $proc.Name
        Path        = $proc.Path
    }
} | Sort-Object Port | Format-Table -AutoSize

# Подозрительные: соединения на нестандартные порты
Get-NetTCPConnection -State Established | Where-Object {
    $_.RemotePort -notin @(80, 443, 53, 22, 3389, 445, 139)
} | ForEach-Object {
    $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    "$($proc.Name) ($($_.OwningProcess)) -> $($_.RemoteAddress):$($_.RemotePort)"
}
```

### Get-LocalUser и Get-LocalGroup

```powershell
# Все локальные пользователи
Get-LocalUser | Select-Object Name, Enabled, LastLogon, PasswordLastSet,
    PasswordRequired, PasswordNeverExpires | Format-Table -AutoSize

# Подозрительные: активные пользователи с PasswordNeverExpires
Get-LocalUser | Where-Object {$_.Enabled -eq $true -and $_.PasswordNeverExpires -eq $true} |
    Select-Object Name, Enabled, LastLogon | Format-Table -AutoSize

# Члены группы Administrators
Get-LocalGroupMember -Group "Administrators" |
    Select-Object Name, ObjectClass, PrincipalSource | Format-Table -AutoSize

# Все локальные группы
Get-LocalGroup | ForEach-Object {
    $members = Get-LocalGroupMember -Group $_.Name -ErrorAction SilentlyContinue
    [PSCustomObject]@{
        Group   = $_.Name
        Members = ($members.Name -join ', ')
    }
} | Format-Table -AutoSize -Wrap
```

---

## 3.3.5 PowerShell Pipeline — мощный инструмент

Конвейер (`|`) передаёт объекты между командлетами. Ключевые операторы:

### Where-Object — фильтрация

```powershell
# Синтаксис 1: скрипт-блок (полный)
Get-Process | Where-Object { $_.CPU -gt 50 }

# Синтаксис 2: сокращённый (PowerShell 3+)
Get-Process | Where-Object CPU -gt 50

# Несколько условий
Get-Process | Where-Object { $_.CPU -gt 10 -and $_.WorkingSet -gt 100MB }

# Операторы сравнения:
# -eq (equal), -ne (not equal), -gt (greater), -lt (less)
# -ge (>=), -le (<=)
# -match (regex), -notmatch
# -like (wildcards: * ?), -notlike
# -contains, -notcontains
# -and, -or, -not
```

### Select-Object — выбор свойств

```powershell
# Выбрать конкретные свойства
Get-Process | Select-Object Name, Id, CPU, Path

# Вычисляемые свойства
Get-Process | Select-Object Name, @{Name='CPU_sec'; Expression={[math]::Round($_.CPU, 2)}},
    @{Name='RAM_MB'; Expression={[math]::Round($_.WorkingSet/1MB, 2)}}

# Первые/последние N объектов
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
Get-EventLog -LogName Security -Newest 100 | Select-Object -Last 20

# Уникальные значения
$events | Select-Object -ExpandProperty TargetUser -Unique
```

### Sort-Object — сортировка

```powershell
Get-Process | Sort-Object CPU -Descending
Get-ChildItem | Sort-Object Length -Descending
$events | Sort-Object TimeCreated

# По нескольким полям
Get-LocalUser | Sort-Object Enabled -Descending, Name
```

### Group-Object — группировка

```powershell
# Группировка с подсчётом
Get-EventLog -LogName Security -InstanceId 4625 -Newest 1000 |
    Group-Object -Property {$_.ReplacementStrings[5]} |   # IP-адрес
    Sort-Object Count -Descending |
    Select-Object Name, Count

# С развёрнутыми группами
$result = $events | Group-Object TargetUser
foreach ($group in $result | Sort-Object Count -Descending | Select-Object -First 5) {
    Write-Host "User: $($group.Name), Attempts: $($group.Count)"
    $group.Group | Select-Object -First 3 | ForEach-Object {
        Write-Host "  - $($_.TimeCreated): IP=$($_.IpAddress)"
    }
}
```

### Measure-Object — статистика

```powershell
# Подсчёт
$events | Measure-Object
$events | Measure-Object -Property Value -Sum -Average -Minimum -Maximum

# Практический пример
$failedLogons | Group-Object IpAddress | Measure-Object -Property Count -Sum
```

### ForEach-Object — итерация

```powershell
# Синтаксис 1: конвейерный (для каждого объекта)
Get-Process | ForEach-Object { Write-Host "PID: $($_.Id), Name: $($_.Name)" }

# Синтаксис 2: псевдоним %
1..10 | % { $_ * 2 }

# С Begin/Process/End блоками
Get-Content log.txt | ForEach-Object -Begin {
    $count = 0
} -Process {
    if ($_ -match 'ERROR') { $count++ }
} -End {
    Write-Host "Total errors: $count"
}
```

---

## 3.3.6 Экспорт данных

### Export-Csv — экспорт в CSV

```powershell
# Экспорт
$results | Export-Csv -Path "C:\Reports\failed_logons.csv" -NoTypeInformation -Encoding UTF8

# Добавление к существующему файлу
$newResults | Export-Csv -Path "C:\Reports\failed_logons.csv" -Append -NoTypeInformation

# Импорт
$data = Import-Csv -Path "C:\Reports\failed_logons.csv"
$data | Where-Object {$_.IpAddress -eq '192.168.1.50'} | Format-Table
```

### ConvertTo-Json / ConvertFrom-Json

```powershell
# Объект → JSON-строка
$results | ConvertTo-Json -Depth 5

# Сохранить в файл
$results | ConvertTo-Json -Depth 5 | Out-File "C:\Reports\events.json" -Encoding UTF8

# JSON-строка → объект
$json = Get-Content "C:\Reports\events.json" -Raw | ConvertFrom-Json
$json | Where-Object {$_.LogonType -eq '3'} | Format-Table
```

### Out-File и Tee-Object

```powershell
# Вывод в файл (для текста)
Get-Process | Format-Table | Out-File "C:\Reports\processes.txt"

# Одновременно вывести на экран И сохранить в файл
Get-Process | Tee-Object -FilePath "C:\Reports\processes.txt" | Format-Table
```

---

## 💻 Практика

### Полный скрипт анализа неудачных логинов

```powershell
<#
.SYNOPSIS
    Анализ неудачных попыток входа из Security EventLog
.DESCRIPTION
    Читает Event ID 4625 за указанный период, группирует по IP и пользователю,
    выводит алерты при обнаружении брутфорса.
.PARAMETER Hours
    Количество часов для анализа (по умолчанию 24)
.PARAMETER Threshold
    Порог для алерта (по умолчанию 10 попыток)
.PARAMETER OutputPath
    Путь для сохранения CSV-отчёта
.EXAMPLE
    .\Analyze-FailedLogons.ps1 -Hours 48 -Threshold 5 -OutputPath C:\Reports\brute.csv
#>
param(
    [int]$Hours = 24,
    [int]$Threshold = 10,
    [string]$OutputPath = ".\failed_logons_$(Get-Date -Format 'yyyyMMdd_HHmmss').csv"
)

Write-Host "`n=== Failed Logon Analyzer ===" -ForegroundColor Cyan
Write-Host "Period:    Last $Hours hours" -ForegroundColor Gray
Write-Host "Threshold: $Threshold attempts" -ForegroundColor Gray
Write-Host "Output:    $OutputPath`n" -ForegroundColor Gray

# Определение кодов SubStatus
$subStatusCodes = @{
    '0xc000006a' = 'Wrong password'
    '0xc0000064' = 'No such user'
    '0xc0000234' = 'Account locked'
    '0xc0000072' = 'Account disabled'
    '0xc000006f' = 'Outside logon hours'
    '0xc0000070' = 'Workstation restriction'
    '0xc0000193' = 'Account expired'
    '0xc0000071' = 'Password expired'
}

# Определение типов логона
$logonTypes = @{
    '2'  = 'Interactive'
    '3'  = 'Network'
    '4'  = 'Batch'
    '5'  = 'Service'
    '7'  = 'Unlock'
    '8'  = 'NetworkCleartext'
    '9'  = 'NewCredentials'
    '10' = 'RemoteInteractive (RDP)'
    '11' = 'CachedInteractive'
}

# Получение событий
Write-Host "Fetching Event ID 4625..." -ForegroundColor Yellow
$startTime = (Get-Date).AddHours(-$Hours)

try {
    $events = Get-WinEvent -FilterHashtable @{
        LogName   = 'Security'
        Id        = 4625
        StartTime = $startTime
    } -ErrorAction Stop
    Write-Host "Found $($events.Count) failed logon events" -ForegroundColor Green
} catch {
    Write-Warning "Error reading Security log: $_"
    exit 1
}

if ($events.Count -eq 0) {
    Write-Host "No failed logon events found in the last $Hours hours." -ForegroundColor Green
    exit 0
}

# Парсинг событий
Write-Host "Parsing events..." -ForegroundColor Yellow
$parsedEvents = $events | ForEach-Object {
    $xml = [xml]$_.ToXml()
    $d   = $xml.Event.EventData.Data

    $subStatus = ($d | Where-Object Name -eq 'SubStatus').'#text'
    $logonType = ($d | Where-Object Name -eq 'LogonType').'#text'

    [PSCustomObject]@{
        Time        = $_.TimeCreated
        TargetUser  = ($d | Where-Object Name -eq 'TargetUserName').'#text'
        Domain      = ($d | Where-Object Name -eq 'TargetDomainName').'#text'
        IpAddress   = ($d | Where-Object Name -eq 'IpAddress').'#text'
        Workstation = ($d | Where-Object Name -eq 'WorkstationName').'#text'
        LogonType   = $logonType
        LogonTypeDesc = $logonTypes[$logonType]
        SubStatus   = $subStatus
        FailReason  = $subStatusCodes[$subStatus.ToLower()] ?? "Unknown ($subStatus)"
    }
}

# Экспорт в CSV
$parsedEvents | Export-Csv -Path $OutputPath -NoTypeInformation -Encoding UTF8
Write-Host "Report saved: $OutputPath" -ForegroundColor Green

# ---- Статистика ----
Write-Host "`n=== Summary ===" -ForegroundColor Cyan

# Топ-5 пользователей
Write-Host "`nTop 5 Targeted Users:" -ForegroundColor Yellow
$parsedEvents | Group-Object TargetUser | Sort-Object Count -Descending |
    Select-Object -First 5 | ForEach-Object {
        Write-Host "  $($_.Count.ToString().PadLeft(5)) x $($_.Name)"
    }

# Топ-5 IP
Write-Host "`nTop 5 Source IPs:" -ForegroundColor Yellow
$parsedEvents | Where-Object {$_.IpAddress -ne '-' -and $_.IpAddress} |
    Group-Object IpAddress | Sort-Object Count -Descending |
    Select-Object -First 5 | ForEach-Object {
        Write-Host "  $($_.Count.ToString().PadLeft(5)) x $($_.Name)"
    }

# ---- Алерты ----
Write-Host "`n=== ALERTS ===" -ForegroundColor Red

# Брутфорс по IP
$ipGroups = $parsedEvents |
    Where-Object {$_.IpAddress -ne '-' -and $_.IpAddress} |
    Group-Object IpAddress |
    Where-Object {$_.Count -ge $Threshold} |
    Sort-Object Count -Descending

if ($ipGroups) {
    foreach ($group in $ipGroups) {
        Write-Host "`n[ALERT] Brute-force from IP: $($group.Name)" -ForegroundColor Red
        Write-Host "  Total attempts: $($group.Count)" -ForegroundColor Red
        $users = $group.Group | Select-Object -ExpandProperty TargetUser -Unique
        Write-Host "  Targeted users ($($users.Count)): $($users -join ', ')" -ForegroundColor Yellow
        $first = $group.Group | Sort-Object Time | Select-Object -First 1
        $last  = $group.Group | Sort-Object Time | Select-Object -Last 1
        Write-Host "  Time range: $($first.Time) → $($last.Time)" -ForegroundColor Gray
    }
} else {
    Write-Host "  No brute-force patterns detected (threshold: $Threshold)" -ForegroundColor Green
}

# Заблокированные аккаунты
$locked = $parsedEvents | Where-Object {$_.SubStatus -eq '0xC0000234'}
if ($locked) {
    Write-Host "`n[ALERT] Locked accounts found:" -ForegroundColor Red
    $locked | Group-Object TargetUser | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count) attempts" -ForegroundColor Yellow
    }
}

Write-Host "`nAnalysis complete." -ForegroundColor Cyan
```

---

## 🛠️ Задания

### Задание 1 ⭐ — Get-WinEvent фильтры

Напишите команды PowerShell для следующих задач:

1. Получить все события из журнала `System` с уровнем Error за последние 7 дней
2. Получить все события из `Microsoft-Windows-PowerShell/Operational` за последний час
3. Получить события 4624 и 4625 из Security-лога за 15 января 2025 (с 08:00 до 20:00)
4. Прочитать события из файла `C:\Logs\security.evtx` и найти все 4698
5. Получить все 4688 события, где `CommandLine` содержит `powershell`

---

### Задание 2 ⭐⭐ — Анализ хоста

Напишите скрипт `Analyze-Host.ps1`, который собирает данные о текущем состоянии хоста:

1. Список всех запущенных процессов с SHA256-хешем и путём исполняемого файла
2. Список всех TCP-соединений с именами процессов
3. Список прослушиваемых портов
4. Список всех локальных пользователей (активных и неактивных)
5. Список членов группы Administrators
6. Список всех установленных сервисов с путями

Скрипт должен:
- Принимать параметр `-OutputDir` для указания папки сохранения
- Сохранять каждый тип данных в отдельный CSV-файл
- Выводить итоговую сводку на экран
- Подсвечивать аномалии (процессы без пути, соединения на нестандартные порты)

---

### Задание 3 ⭐⭐⭐ — SIEM-like корреляция

Напишите скрипт `Correlate-Events.ps1`, который реализует простую корреляцию событий:

**Правило 1: Брутфорс + успешный вход**
- Находит IP-адреса с более чем 5 событиями 4625 за 10 минут
- Проверяет, было ли после этого событие 4624 с того же IP
- Если да — алерт "Possible successful brute-force"

**Правило 2: Создание пользователя + добавление в группу**
- Находит события 4720 (создание пользователя)
- Проверяет, было ли в течение 5 минут событие 4732 для того же пользователя
- Если да — алерт "Account creation + privilege escalation"

**Правило 3: Подозрительный процесс после входа**
- Находит события 4624 с LogonType=10 (RDP)
- Проверяет события 4688 от того же пользователя в течение 2 минут
- Если в CommandLine есть слова из списка: `mimikatz, procdump, wce, gsecdump, pwdump, meterpreter`
- Алерт: "Possible credential dumping after RDP logon"

Каждый алерт должен содержать: время, пользователь, IP, описание, рекомендуемое действие.

---

## ✅ Чеклист готовности

- [ ] Я понимаю разницу между Get-EventLog и Get-WinEvent и знаю, когда использовать каждый
- [ ] Я умею строить FilterHashtable с LogName, Id, StartTime, EndTime
- [ ] Я умею парсить XML события для извлечения EventData-полей
- [ ] Я написал хотя бы один рабочий запрос для Event ID 4625, 4688, 7045
- [ ] Я умею использовать Where-Object, Select-Object, Group-Object, Sort-Object
- [ ] Я понимаю разницу между ForEach-Object и foreach ($x in $collection)
- [ ] Я умею экспортировать данные в CSV и JSON
- [ ] Я умею использовать Get-Process для анализа запущенных процессов
- [ ] Я умею использовать Get-NetTCPConnection для просмотра соединений
- [ ] Я умею использовать Get-LocalUser и Get-LocalGroupMember
- [ ] Я написал и запустил скрипт анализа неудачных логинов из раздела "Практика"

---

## 🔗 Ресурсы

- [Microsoft Docs — Get-WinEvent](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.diagnostics/get-winevent)
- [PowerShell Gallery — PSEventViewer](https://www.powershellgallery.com/packages/PSEventViewer) — удобная обёртка
- [adsecurity.org — PowerShell Security](https://adsecurity.org/?p=2604)
- [SANS — PowerShell Cheat Sheet](https://www.sans.org/posters/powershell-cheat-sheet/)
- [Invoke-LiveResponse](https://github.com/mgreen27/Invoke-LiveResponse) — готовые скрипты для incident response
- [DeepBlueCLI](https://github.com/sans-blue-team/DeepBlueCLI) — автоматический анализ Windows Event Logs
- [PowerSploit / PowerView](https://github.com/PowerShellMafia/PowerSploit) — изучать для понимания атак
