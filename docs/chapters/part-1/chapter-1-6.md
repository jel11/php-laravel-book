# Глава 1.6: Работа с файлами

## Чтение, запись, загрузка файлов от пользователя, безопасность

---

## Зачем работать с файлами?

Файловая система — это **постоянное хранилище** данных. В отличие от переменных, которые живут только во время выполнения скрипта, файлы сохраняются между запросами.

```
┌─────────────────────────────────────────────────────────────────┐
│                  ЗАЧЕМ НУЖНЫ ФАЙЛЫ                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   📝 Логирование          Записывать ошибки и события          │
│   ⚙️ Конфигурация         Хранить настройки приложения         │
│   📊 Экспорт/Импорт       CSV, JSON, XML данные                │
│   🖼️ Загрузка файлов      Аватары, документы, изображения      │
│   💾 Кеширование          Сохранять результаты для скорости    │
│   📄 Шаблоны              Загружать HTML-шаблоны               │
│   🔒 Сессии               PHP хранит сессии в файлах           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Пути к файлам

### Абсолютные и относительные пути

```php
<?php
// Абсолютный путь — полный путь от корня файловой системы
$absolute = '/var/www/html/project/data/file.txt';      // Linux
$absolute = 'C:\\xampp\\htdocs\\project\\data\\file.txt'; // Windows

// Относительный путь — от текущей директории
$relative = 'data/file.txt';        // В подпапке data
$relative = '../config/app.php';    // На уровень выше, потом в config
$relative = './file.txt';           // В текущей папке (явно)
```

### Важные константы и функции

```php
<?php
// Текущая директория скрипта
echo __DIR__;  // /var/www/html/project

// Текущий файл
echo __FILE__;  // /var/www/html/project/index.php

// Корень документов веб-сервера
echo $_SERVER['DOCUMENT_ROOT'];  // /var/www/html

// Разделитель директорий (кроссплатформенный)
echo DIRECTORY_SEPARATOR;  // / на Linux, \ на Windows

// Построение пути
$path = __DIR__ . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'file.txt';
// Или проще:
$path = __DIR__ . '/data/file.txt';  // PHP понимает / на всех платформах
```

### Функции для работы с путями

```php
<?php
$path = '/var/www/html/project/uploads/image.jpg';

// Имя файла
echo basename($path);              // image.jpg
echo basename($path, '.jpg');      // image (без расширения)

// Директория
echo dirname($path);               // /var/www/html/project/uploads
echo dirname($path, 2);            // /var/www/html/project (на 2 уровня выше)

// Расширение
echo pathinfo($path, PATHINFO_EXTENSION);   // jpg
echo pathinfo($path, PATHINFO_FILENAME);    // image
echo pathinfo($path, PATHINFO_DIRNAME);     // /var/www/html/project/uploads
echo pathinfo($path, PATHINFO_BASENAME);    // image.jpg

// Полная информация
$info = pathinfo($path);
print_r($info);
/*
[
    'dirname' => '/var/www/html/project/uploads',
    'basename' => 'image.jpg',
    'extension' => 'jpg',
    'filename' => 'image'
]
*/

// Нормализация пути
echo realpath('../config');  // /var/www/html/project/config (абсолютный путь)
// Вернёт false, если путь не существует!
```

---

## 2. Проверка файлов и директорий

### Существование

```php
<?php
$file = 'data/users.json';
$dir = 'uploads';

// Существует ли? (файл или директория)
if (file_exists($file)) {
    echo "Файл существует";
}

// Это файл?
if (is_file($file)) {
    echo "Это файл";
}

// Это директория?
if (is_dir($dir)) {
    echo "Это директория";
}

// Практический паттерн
if (!file_exists($file)) {
    die("Файл не найден: $file");
}
```

### Права доступа

```php
<?php
$file = 'data/config.php';

// Можно читать?
if (is_readable($file)) {
    $content = file_get_contents($file);
}

// Можно писать?
if (is_writable($file)) {
    file_put_contents($file, $data);
}

// Это исполняемый файл?
if (is_executable($file)) {
    echo "Файл исполняемый";
}

// Практика: проверка перед записью
function safeWrite(string $file, string $data): bool {
    $dir = dirname($file);
    
    if (!is_dir($dir)) {
        if (!mkdir($dir, 0755, true)) {
            return false;
        }
    }
    
    if (file_exists($file) && !is_writable($file)) {
        return false;
    }
    
    return file_put_contents($file, $data) !== false;
}
```

### Информация о файле

```php
<?php
$file = 'uploads/document.pdf';

// Размер в байтах
$size = filesize($file);
echo $size;  // 1048576

// Форматирование размера
function formatFileSize(int $bytes): string {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $i = 0;
    while ($bytes >= 1024 && $i < count($units) - 1) {
        $bytes /= 1024;
        $i++;
    }
    return round($bytes, 2) . ' ' . $units[$i];
}

echo formatFileSize(filesize($file));  // "1 MB"

// Время изменения (Unix timestamp)
$mtime = filemtime($file);
echo date('d.m.Y H:i:s', $mtime);  // "27.01.2025 14:30:00"

// Время последнего доступа
$atime = fileatime($file);

// Время создания (не на всех системах)
$ctime = filectime($file);

// MIME-тип
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file);
finfo_close($finfo);
echo $mimeType;  // "application/pdf"

// Или короче (PHP 5.3+)
$mimeType = mime_content_type($file);
```

---

## 3. Чтение файлов

### file_get_contents — простое чтение

```php
<?php
// Прочитать весь файл в строку
$content = file_get_contents('data/config.json');

if ($content === false) {
    die("Не удалось прочитать файл");
}

echo $content;

// JSON файл
$json = file_get_contents('data/users.json');
$users = json_decode($json, true);

// С проверкой
function readJsonFile(string $path): ?array {
    if (!file_exists($path)) {
        return null;
    }
    
    $content = file_get_contents($path);
    if ($content === false) {
        return null;
    }
    
    $data = json_decode($content, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return null;
    }
    
    return $data;
}

// Чтение части файла
$content = file_get_contents('large_file.txt', false, null, 0, 1024);
// Прочитать первые 1024 байта

// Чтение удалённого файла (если allow_url_fopen включен)
$html = file_get_contents('https://example.com');
```

### file — чтение в массив строк

```php
<?php
// Каждая строка — элемент массива
$lines = file('data/log.txt');

foreach ($lines as $lineNumber => $line) {
    echo ($lineNumber + 1) . ": " . $line;
}

// Без символов переноса строки
$lines = file('data/log.txt', FILE_IGNORE_NEW_LINES);

// Пропустить пустые строки
$lines = file('data/log.txt', FILE_SKIP_EMPTY_LINES);

// Оба флага
$lines = file('data/log.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

// Подсчёт строк в файле
$lineCount = count(file('data/log.txt'));
```

### readfile — вывод файла напрямую

```php
<?php
// Читает файл и сразу выводит
// Эффективнее для больших файлов, чем file_get_contents + echo

// Отдача файла для скачивания
$file = 'uploads/document.pdf';

header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="document.pdf"');
header('Content-Length: ' . filesize($file));

readfile($file);
exit;
```

### fopen/fread/fclose — потоковое чтение

Для больших файлов, которые не помещаются в память:

```php
<?php
$file = 'data/large_file.txt';

// Открыть файл для чтения
$handle = fopen($file, 'r');

if ($handle === false) {
    die("Не удалось открыть файл");
}

// Читать построчно
while (($line = fgets($handle)) !== false) {
    echo $line;
}

// Закрыть файл
fclose($handle);

// Или читать порциями
$handle = fopen($file, 'r');
while (!feof($handle)) {
    $chunk = fread($handle, 8192);  // Читать по 8KB
    echo $chunk;
}
fclose($handle);
```

### Режимы открытия файла

```
┌───────┬──────────────────────────────────────────────────────────┐
│ Режим │ Описание                                                 │
├───────┼──────────────────────────────────────────────────────────┤
│ 'r'   │ Только чтение. Указатель в начале.                       │
│ 'r+'  │ Чтение и запись. Указатель в начале.                     │
│ 'w'   │ Только запись. Очищает файл или создаёт новый.           │
│ 'w+'  │ Чтение и запись. Очищает файл или создаёт новый.         │
│ 'a'   │ Только запись. Указатель в конце. Создаёт если нет.      │
│ 'a+'  │ Чтение и запись. Указатель в конце. Создаёт если нет.    │
│ 'x'   │ Создать и открыть для записи. Ошибка если существует.    │
│ 'x+'  │ Создать для чтения/записи. Ошибка если существует.       │
│ 'c'   │ Открыть для записи. Создать если нет. НЕ очищает.        │
│ 'c+'  │ Открыть для чтения/записи. Создать если нет. НЕ очищает. │
└───────┴──────────────────────────────────────────────────────────┘

Добавь 'b' для бинарных файлов на Windows: 'rb', 'wb'
```

---

## 4. Запись в файлы

### file_put_contents — простая запись

```php
<?php
$file = 'data/output.txt';
$data = "Hello, World!";

// Записать (перезапишет если существует)
$bytes = file_put_contents($file, $data);

if ($bytes === false) {
    die("Ошибка записи");
}

echo "Записано $bytes байт";

// Добавить в конец файла
file_put_contents($file, "Новая строка\n", FILE_APPEND);

// С блокировкой (для многопоточности)
file_put_contents($file, $data, LOCK_EX);

// Добавить с блокировкой
file_put_contents($file, $data, FILE_APPEND | LOCK_EX);

// Запись JSON
$users = [
    ['id' => 1, 'name' => 'Иван'],
    ['id' => 2, 'name' => 'Мария'],
];

file_put_contents(
    'data/users.json',
    json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
);
```

### fopen/fwrite/fclose — потоковая запись

```php
<?php
$file = 'data/log.txt';

// Открыть для добавления
$handle = fopen($file, 'a');

if ($handle === false) {
    die("Не удалось открыть файл");
}

// Записать
fwrite($handle, date('Y-m-d H:i:s') . " - Событие\n");

// Закрыть
fclose($handle);

// Пример: простой логгер
function logMessage(string $message, string $level = 'INFO'): void {
    $file = __DIR__ . '/logs/' . date('Y-m-d') . '.log';
    $dir = dirname($file);
    
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    $timestamp = date('Y-m-d H:i:s');
    $line = "[$timestamp] [$level] $message" . PHP_EOL;
    
    file_put_contents($file, $line, FILE_APPEND | LOCK_EX);
}

logMessage('Пользователь вошёл в систему');
logMessage('Ошибка подключения к БД', 'ERROR');
```

### Запись CSV

```php
<?php
$users = [
    ['id' => 1, 'name' => 'Иван', 'email' => 'ivan@test.com'],
    ['id' => 2, 'name' => 'Мария', 'email' => 'maria@test.com'],
    ['id' => 3, 'name' => 'Пётр', 'email' => 'peter@test.com'],
];

$file = 'data/users.csv';
$handle = fopen($file, 'w');

// Заголовки
fputcsv($handle, ['ID', 'Имя', 'Email']);

// Данные
foreach ($users as $user) {
    fputcsv($handle, $user);
}

fclose($handle);

// Результат в файле:
// ID,Имя,Email
// 1,Иван,ivan@test.com
// 2,Мария,maria@test.com
// 3,Пётр,peter@test.com
```

### Чтение CSV

```php
<?php
$file = 'data/users.csv';
$handle = fopen($file, 'r');

$users = [];
$headers = null;

while (($row = fgetcsv($handle)) !== false) {
    if ($headers === null) {
        $headers = $row;
        continue;
    }
    
    $users[] = array_combine($headers, $row);
}

fclose($handle);

print_r($users);
/*
[
    ['ID' => '1', 'Имя' => 'Иван', 'Email' => 'ivan@test.com'],
    ['ID' => '2', 'Имя' => 'Мария', 'Email' => 'maria@test.com'],
    ...
]
*/
```

---

## 5. Работа с директориями

### Чтение содержимого директории

```php
<?php
$dir = 'uploads';

// scandir — простой список
$files = scandir($dir);
print_r($files);
// ['.', '..', 'file1.txt', 'file2.jpg', 'subfolder']

// Без . и ..
$files = array_diff(scandir($dir), ['.', '..']);

// Только файлы
$files = array_filter(scandir($dir), function($item) use ($dir) {
    return is_file($dir . '/' . $item);
});

// glob — поиск по паттерну
$phpFiles = glob('*.php');              // Все PHP файлы в текущей папке
$allPhp = glob('**/*.php');             // Рекурсивно (если включен GLOB_BRACE)
$images = glob('uploads/*.{jpg,png,gif}', GLOB_BRACE);  // По расширениям

// Рекурсивный обход
function listFilesRecursive(string $dir): array {
    $files = [];
    
    foreach (scandir($dir) as $item) {
        if ($item === '.' || $item === '..') continue;
        
        $path = $dir . '/' . $item;
        
        if (is_dir($path)) {
            $files = array_merge($files, listFilesRecursive($path));
        } else {
            $files[] = $path;
        }
    }
    
    return $files;
}

// Или с RecursiveDirectoryIterator
function listFilesIterator(string $dir): array {
    $files = [];
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
    );
    
    foreach ($iterator as $file) {
        if ($file->isFile()) {
            $files[] = $file->getPathname();
        }
    }
    
    return $files;
}
```

### Создание директорий

```php
<?php
$dir = 'uploads/images/2025';

// Создать директорию
if (!is_dir($dir)) {
    mkdir($dir);
}

// Создать рекурсивно (с родительскими)
if (!mkdir($dir, 0755, true) && !is_dir($dir)) {
    throw new RuntimeException("Не удалось создать директорию: $dir");
}

// Права доступа (восьмеричное число)
// 0755 = rwxr-xr-x (владелец: всё, остальные: чтение и выполнение)
// 0777 = rwxrwxrwx (все права всем — небезопасно!)
// 0700 = rwx------ (только владелец)
```

### Удаление файлов и директорий

```php
<?php
// Удалить файл
if (file_exists('temp/cache.txt')) {
    unlink('temp/cache.txt');
}

// Удалить пустую директорию
if (is_dir('temp/empty')) {
    rmdir('temp/empty');
}

// Удалить директорию с содержимым (рекурсивно)
function deleteDirectory(string $dir): bool {
    if (!is_dir($dir)) {
        return false;
    }
    
    $items = scandir($dir);
    
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        
        $path = $dir . '/' . $item;
        
        if (is_dir($path)) {
            deleteDirectory($path);
        } else {
            unlink($path);
        }
    }
    
    return rmdir($dir);
}

deleteDirectory('temp/old_cache');
```

### Копирование и перемещение

```php
<?php
// Копировать файл
copy('source.txt', 'destination.txt');

// Переместить/переименовать файл
rename('old_name.txt', 'new_name.txt');
rename('file.txt', 'folder/file.txt');  // Перемещение

// Копировать директорию (рекурсивно)
function copyDirectory(string $src, string $dst): bool {
    if (!is_dir($src)) {
        return false;
    }
    
    if (!is_dir($dst)) {
        mkdir($dst, 0755, true);
    }
    
    foreach (scandir($src) as $item) {
        if ($item === '.' || $item === '..') continue;
        
        $srcPath = $src . '/' . $item;
        $dstPath = $dst . '/' . $item;
        
        if (is_dir($srcPath)) {
            copyDirectory($srcPath, $dstPath);
        } else {
            copy($srcPath, $dstPath);
        }
    }
    
    return true;
}
```

---

## 6. Загрузка файлов от пользователя

### HTML-форма

```html
<!DOCTYPE html>
<html>
<head>
    <title>Загрузка файла</title>
</head>
<body>
    <!-- enctype="multipart/form-data" обязателен! -->
    <form action="upload.php" method="POST" enctype="multipart/form-data">
        <input type="file" name="document">
        <button type="submit">Загрузить</button>
    </form>
    
    <!-- Множественная загрузка -->
    <form action="upload.php" method="POST" enctype="multipart/form-data">
        <input type="file" name="images[]" multiple>
        <button type="submit">Загрузить фотографии</button>
    </form>
</body>
</html>
```

### Суперглобальный массив $_FILES

```php
<?php
// Структура $_FILES для одного файла
/*
$_FILES['document'] = [
    'name' => 'report.pdf',          // Оригинальное имя
    'type' => 'application/pdf',     // MIME-тип (от браузера, ненадёжно!)
    'tmp_name' => '/tmp/php1234.tmp', // Временный файл на сервере
    'error' => 0,                    // Код ошибки
    'size' => 102400                 // Размер в байтах
]
*/

// Коды ошибок
/*
UPLOAD_ERR_OK         (0) - Успешно
UPLOAD_ERR_INI_SIZE   (1) - Превышен upload_max_filesize в php.ini
UPLOAD_ERR_FORM_SIZE  (2) - Превышен MAX_FILE_SIZE в форме
UPLOAD_ERR_PARTIAL    (3) - Файл загружен частично
UPLOAD_ERR_NO_FILE    (4) - Файл не был загружен
UPLOAD_ERR_NO_TMP_DIR (6) - Нет временной папки
UPLOAD_ERR_CANT_WRITE (7) - Ошибка записи на диск
UPLOAD_ERR_EXTENSION  (8) - Загрузка остановлена расширением PHP
*/
```

### Базовая обработка загрузки

```php
<?php
// upload.php

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    die('Метод не поддерживается');
}

if (!isset($_FILES['document'])) {
    die('Файл не выбран');
}

$file = $_FILES['document'];

// Проверка на ошибки
if ($file['error'] !== UPLOAD_ERR_OK) {
    $errors = [
        UPLOAD_ERR_INI_SIZE => 'Файл слишком большой (php.ini)',
        UPLOAD_ERR_FORM_SIZE => 'Файл слишком большой (форма)',
        UPLOAD_ERR_PARTIAL => 'Файл загружен частично',
        UPLOAD_ERR_NO_FILE => 'Файл не выбран',
        UPLOAD_ERR_NO_TMP_DIR => 'Нет временной папки',
        UPLOAD_ERR_CANT_WRITE => 'Ошибка записи',
        UPLOAD_ERR_EXTENSION => 'Загрузка запрещена',
    ];
    die($errors[$file['error']] ?? 'Неизвестная ошибка');
}

// Путь для сохранения
$uploadDir = __DIR__ . '/uploads/';
$filename = basename($file['name']);  // basename для безопасности!
$destination = $uploadDir . $filename;

// Перемещение из временной папки
if (move_uploaded_file($file['tmp_name'], $destination)) {
    echo "Файл успешно загружен: $filename";
} else {
    die('Ошибка перемещения файла');
}
```

### Множественная загрузка

```php
<?php
if (!isset($_FILES['images'])) {
    die('Файлы не выбраны');
}

$files = $_FILES['images'];
$uploadDir = __DIR__ . '/uploads/';
$uploaded = [];
$errors = [];

// $_FILES['images'] имеет другую структуру при multiple:
// ['name' => [...], 'tmp_name' => [...], ...]

$fileCount = count($files['name']);

for ($i = 0; $i < $fileCount; $i++) {
    if ($files['error'][$i] !== UPLOAD_ERR_OK) {
        $errors[] = "Ошибка загрузки файла {$files['name'][$i]}";
        continue;
    }
    
    $filename = basename($files['name'][$i]);
    $destination = $uploadDir . $filename;
    
    if (move_uploaded_file($files['tmp_name'][$i], $destination)) {
        $uploaded[] = $filename;
    } else {
        $errors[] = "Ошибка перемещения: $filename";
    }
}

echo "Загружено: " . count($uploaded) . " файлов\n";
if ($errors) {
    echo "Ошибки:\n" . implode("\n", $errors);
}
```

---

## 7. Безопасность загрузки файлов

### ⚠️ Основные угрозы

```
┌─────────────────────────────────────────────────────────────────┐
│                    УГРОЗЫ БЕЗОПАСНОСТИ                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   🔴 Загрузка PHP-скрипта                                       │
│      Злоумышленник загружает shell.php и получает               │
│      полный контроль над сервером                               │
│                                                                 │
│   🔴 Path Traversal                                             │
│      Имя файла: ../../../etc/passwd                            │
│      Перезапись системных файлов                               │
│                                                                 │
│   🔴 Подмена расширения                                         │
│      malware.php.jpg — может выполниться как PHP               │
│                                                                 │
│   🔴 MIME-тип от браузера                                       │
│      $_FILES['type'] легко подделать                           │
│                                                                 │
│   🔴 Переполнение диска                                         │
│      Загрузка огромных файлов                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Безопасный загрузчик

```php
<?php
class FileUploader {
    private string $uploadDir;
    private array $allowedTypes;
    private array $allowedExtensions;
    private int $maxSize;
    
    public function __construct(
        string $uploadDir,
        array $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
        array $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'],
        int $maxSize = 5 * 1024 * 1024  // 5 MB
    ) {
        $this->uploadDir = rtrim($uploadDir, '/') . '/';
        $this->allowedTypes = $allowedTypes;
        $this->allowedExtensions = $allowedExtensions;
        $this->maxSize = $maxSize;
        
        // Создать директорию если нет
        if (!is_dir($this->uploadDir)) {
            mkdir($this->uploadDir, 0755, true);
        }
    }
    
    public function upload(array $file): array {
        // 1. Проверка ошибок загрузки
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'error' => $this->getErrorMessage($file['error'])];
        }
        
        // 2. Проверка размера
        if ($file['size'] > $this->maxSize) {
            return ['success' => false, 'error' => 'Файл слишком большой'];
        }
        
        if ($file['size'] === 0) {
            return ['success' => false, 'error' => 'Файл пустой'];
        }
        
        // 3. Проверка что это действительно загруженный файл
        if (!is_uploaded_file($file['tmp_name'])) {
            return ['success' => false, 'error' => 'Недопустимый файл'];
        }
        
        // 4. Проверка расширения
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $this->allowedExtensions, true)) {
            return ['success' => false, 'error' => 'Недопустимое расширение'];
        }
        
        // 5. Проверка MIME-типа (реальная проверка содержимого)
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, $this->allowedTypes, true)) {
            return ['success' => false, 'error' => 'Недопустимый тип файла'];
        }
        
        // 6. Генерация безопасного имени файла
        $newFilename = $this->generateFilename($extension);
        $destination = $this->uploadDir . $newFilename;
        
        // 7. Перемещение файла
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            return ['success' => false, 'error' => 'Ошибка сохранения файла'];
        }
        
        return [
            'success' => true,
            'filename' => $newFilename,
            'path' => $destination,
            'size' => $file['size'],
            'mime_type' => $mimeType
        ];
    }
    
    private function generateFilename(string $extension): string {
        // Уникальное имя, невозможно угадать
        return bin2hex(random_bytes(16)) . '.' . $extension;
    }
    
    private function getErrorMessage(int $error): string {
        return match($error) {
            UPLOAD_ERR_INI_SIZE => 'Файл превышает допустимый размер',
            UPLOAD_ERR_FORM_SIZE => 'Файл превышает допустимый размер',
            UPLOAD_ERR_PARTIAL => 'Файл загружен частично',
            UPLOAD_ERR_NO_FILE => 'Файл не выбран',
            UPLOAD_ERR_NO_TMP_DIR => 'Ошибка сервера',
            UPLOAD_ERR_CANT_WRITE => 'Ошибка записи',
            UPLOAD_ERR_EXTENSION => 'Загрузка запрещена',
            default => 'Неизвестная ошибка'
        };
    }
}

// Использование
$uploader = new FileUploader(
    uploadDir: __DIR__ . '/uploads/images',
    allowedTypes: ['image/jpeg', 'image/png'],
    allowedExtensions: ['jpg', 'jpeg', 'png'],
    maxSize: 2 * 1024 * 1024  // 2 MB
);

if (isset($_FILES['avatar'])) {
    $result = $uploader->upload($_FILES['avatar']);
    
    if ($result['success']) {
        echo "Загружено: " . $result['filename'];
    } else {
        echo "Ошибка: " . $result['error'];
    }
}
```

### Дополнительные меры безопасности

```php
<?php
// 1. .htaccess в папке uploads (запрет выполнения PHP)
/*
# uploads/.htaccess
php_flag engine off
RemoveHandler .php .phtml .php3 .php4 .php5
AddType text/plain .php .phtml .php3 .php4 .php5
*/

// 2. Хранение вне document root
// Файлы в /var/www/uploads/ вместо /var/www/html/uploads/

// 3. Проверка изображений
function isValidImage(string $path): bool {
    $imageInfo = @getimagesize($path);
    
    if ($imageInfo === false) {
        return false;
    }
    
    $allowedTypes = [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_GIF];
    
    return in_array($imageInfo[2], $allowedTypes, true);
}

// 4. Отдача файлов через скрипт (не напрямую)
// download.php?file=abc123.jpg
function serveFile(string $filename): void {
    $uploadDir = '/var/www/uploads/';  // Вне document root!
    $path = $uploadDir . basename($filename);  // basename!
    
    if (!file_exists($path)) {
        http_response_code(404);
        exit('Файл не найден');
    }
    
    // Проверка прав доступа пользователя здесь...
    
    $mimeType = mime_content_type($path);
    
    header('Content-Type: ' . $mimeType);
    header('Content-Length: ' . filesize($path));
    header('Content-Disposition: inline; filename="' . basename($path) . '"');
    
    readfile($path);
    exit;
}
```

---

## 8. Блокировка файлов

При одновременном доступе нескольких процессов к файлу могут возникнуть проблемы:

```php
<?php
// Простая блокировка через file_put_contents
file_put_contents('data.txt', $content, LOCK_EX);

// Ручная блокировка
$handle = fopen('data.txt', 'c+');

// Эксклюзивная блокировка (для записи)
if (flock($handle, LOCK_EX)) {
    ftruncate($handle, 0);
    fwrite($handle, $newContent);
    fflush($handle);
    flock($handle, LOCK_UN);  // Снять блокировку
}

fclose($handle);

// Shared блокировка (для чтения)
if (flock($handle, LOCK_SH)) {
    $content = fread($handle, filesize('data.txt'));
    flock($handle, LOCK_UN);
}

// Неблокирующий режим
if (flock($handle, LOCK_EX | LOCK_NB)) {
    // Блокировка получена
} else {
    // Файл уже заблокирован другим процессом
}
```

### Атомарная запись

```php
<?php
// Проблема: если процесс упадёт во время записи, файл будет повреждён

// Решение: записать во временный файл, потом переименовать
function atomicWrite(string $path, string $content): bool {
    $tempFile = $path . '.tmp.' . getmypid();
    
    if (file_put_contents($tempFile, $content, LOCK_EX) === false) {
        return false;
    }
    
    // rename — атомарная операция в Unix
    if (!rename($tempFile, $path)) {
        unlink($tempFile);
        return false;
    }
    
    return true;
}
```

---

## 9. Практические примеры

### Пример 1: Простой кеш

```php
<?php
class FileCache {
    private string $cacheDir;
    private int $defaultTtl;
    
    public function __construct(string $cacheDir, int $defaultTtl = 3600) {
        $this->cacheDir = rtrim($cacheDir, '/') . '/';
        $this->defaultTtl = $defaultTtl;
        
        if (!is_dir($this->cacheDir)) {
            mkdir($this->cacheDir, 0755, true);
        }
    }
    
    public function get(string $key): mixed {
        $file = $this->getFilePath($key);
        
        if (!file_exists($file)) {
            return null;
        }
        
        $content = file_get_contents($file);
        $data = unserialize($content);
        
        // Проверка срока действия
        if ($data['expires'] < time()) {
            unlink($file);
            return null;
        }
        
        return $data['value'];
    }
    
    public function set(string $key, mixed $value, ?int $ttl = null): bool {
        $ttl = $ttl ?? $this->defaultTtl;
        $file = $this->getFilePath($key);
        
        $data = [
            'expires' => time() + $ttl,
            'value' => $value
        ];
        
        return file_put_contents($file, serialize($data), LOCK_EX) !== false;
    }
    
    public function delete(string $key): bool {
        $file = $this->getFilePath($key);
        
        if (file_exists($file)) {
            return unlink($file);
        }
        
        return true;
    }
    
    public function clear(): void {
        $files = glob($this->cacheDir . '*.cache');
        
        foreach ($files as $file) {
            unlink($file);
        }
    }
    
    private function getFilePath(string $key): string {
        $hash = md5($key);
        return $this->cacheDir . $hash . '.cache';
    }
}

// Использование
$cache = new FileCache(__DIR__ . '/cache');

// Кеширование дорогой операции
$users = $cache->get('all_users');

if ($users === null) {
    // Данных в кеше нет, получаем из БД
    $users = fetchUsersFromDatabase();
    $cache->set('all_users', $users, 300);  // Кеш на 5 минут
}

print_r($users);
```

### Пример 2: Журнал логов с ротацией

```php
<?php
class Logger {
    private string $logDir;
    private string $filename;
    private int $maxSize;
    private int $maxFiles;
    
    public function __construct(
        string $logDir,
        string $filename = 'app.log',
        int $maxSize = 10 * 1024 * 1024,  // 10 MB
        int $maxFiles = 5
    ) {
        $this->logDir = rtrim($logDir, '/') . '/';
        $this->filename = $filename;
        $this->maxSize = $maxSize;
        $this->maxFiles = $maxFiles;
        
        if (!is_dir($this->logDir)) {
            mkdir($this->logDir, 0755, true);
        }
    }
    
    public function log(string $message, string $level = 'INFO'): void {
        $this->rotate();
        
        $timestamp = date('Y-m-d H:i:s');
        $line = "[$timestamp] [$level] $message" . PHP_EOL;
        
        file_put_contents(
            $this->getLogPath(),
            $line,
            FILE_APPEND | LOCK_EX
        );
    }
    
    public function info(string $message): void {
        $this->log($message, 'INFO');
    }
    
    public function error(string $message): void {
        $this->log($message, 'ERROR');
    }
    
    public function warning(string $message): void {
        $this->log($message, 'WARNING');
    }
    
    private function rotate(): void {
        $logPath = $this->getLogPath();
        
        if (!file_exists($logPath)) {
            return;
        }
        
        if (filesize($logPath) < $this->maxSize) {
            return;
        }
        
        // Удалить самый старый
        $oldest = $this->logDir . $this->filename . '.' . $this->maxFiles;
        if (file_exists($oldest)) {
            unlink($oldest);
        }
        
        // Переименовать существующие
        for ($i = $this->maxFiles - 1; $i >= 1; $i--) {
            $old = $this->logDir . $this->filename . '.' . $i;
            $new = $this->logDir . $this->filename . '.' . ($i + 1);
            
            if (file_exists($old)) {
                rename($old, $new);
            }
        }
        
        // Текущий файл → .1
        rename($logPath, $this->logDir . $this->filename . '.1');
    }
    
    private function getLogPath(): string {
        return $this->logDir . $this->filename;
    }
}

// Использование
$logger = new Logger(__DIR__ . '/logs');

$logger->info('Приложение запущено');
$logger->warning('Медленный запрос к БД');
$logger->error('Не удалось подключиться к API');
```

### Пример 3: Импорт/Экспорт данных

```php
<?php
class DataExporter {
    public function exportToCsv(array $data, string $filename): void {
        $handle = fopen($filename, 'w');
        
        // UTF-8 BOM для Excel
        fwrite($handle, "\xEF\xBB\xBF");
        
        // Заголовки из ключей первой строки
        if (!empty($data)) {
            fputcsv($handle, array_keys($data[0]), ';');
        }
        
        // Данные
        foreach ($data as $row) {
            fputcsv($handle, $row, ';');
        }
        
        fclose($handle);
    }
    
    public function exportToJson(array $data, string $filename): void {
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        file_put_contents($filename, $json);
    }
    
    public function importFromCsv(string $filename): array {
        $data = [];
        $handle = fopen($filename, 'r');
        
        // Пропустить BOM если есть
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }
        
        $headers = fgetcsv($handle, 0, ';');
        
        while (($row = fgetcsv($handle, 0, ';')) !== false) {
            $data[] = array_combine($headers, $row);
        }
        
        fclose($handle);
        
        return $data;
    }
    
    public function importFromJson(string $filename): array {
        $json = file_get_contents($filename);
        return json_decode($json, true) ?? [];
    }
}

// Использование
$exporter = new DataExporter();

$users = [
    ['id' => 1, 'name' => 'Иван', 'email' => 'ivan@test.com'],
    ['id' => 2, 'name' => 'Мария', 'email' => 'maria@test.com'],
];

// Экспорт
$exporter->exportToCsv($users, 'export/users.csv');
$exporter->exportToJson($users, 'export/users.json');

// Импорт
$imported = $exporter->importFromCsv('export/users.csv');
print_r($imported);
```

---

## 10. Настройки PHP для файлов

### php.ini директивы

```ini
; Максимальный размер загружаемого файла
upload_max_filesize = 10M

; Максимальный размер POST-данных (должен быть >= upload_max_filesize)
post_max_size = 12M

; Максимальное количество файлов за раз
max_file_uploads = 20

; Временная папка для загрузок
upload_tmp_dir = /tmp

; Разрешить загрузку файлов
file_uploads = On

; Разрешить открытие URL как файлов
allow_url_fopen = On
allow_url_include = Off  ; Выключить для безопасности!
```

### Проверка настроек

```php
<?php
echo "upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "post_max_size: " . ini_get('post_max_size') . "\n";
echo "max_file_uploads: " . ini_get('max_file_uploads') . "\n";

// Конвертация в байты
function toBytes(string $val): int {
    $val = trim($val);
    $last = strtolower($val[strlen($val) - 1]);
    $val = (int) $val;
    
    switch ($last) {
        case 'g': $val *= 1024;
        case 'm': $val *= 1024;
        case 'k': $val *= 1024;
    }
    
    return $val;
}

$maxUpload = min(
    toBytes(ini_get('upload_max_filesize')),
    toBytes(ini_get('post_max_size'))
);

echo "Максимальный размер загрузки: " . formatFileSize($maxUpload);
```

---

## 11. Упражнения

### Упражнение 1: Базовая работа с файлами (15 минут)

```php
<?php
// 1. Создай файл data/test.txt с текстом "Hello, World!"
// 2. Прочитай содержимое и выведи
// 3. Добавь в конец " And PHP!"
// 4. Покажи размер файла и дату изменения
// 5. Переименуй в data/hello.txt
// 6. Удали файл
```

### Упражнение 2: Работа с директориями (20 минут)

```php
<?php
// 1. Создай структуру папок: project/src/Controllers, project/src/Models
// 2. Создай по одному .php файлу в каждой папке
// 3. Напиши функцию, которая выводит дерево директорий:
//    project/
//    ├── src/
//    │   ├── Controllers/
//    │   │   └── HomeController.php
//    │   └── Models/
//    │       └── User.php
// 4. Удали всю структуру
```

### Упражнение 3: Безопасная загрузка (25 минут)

Создай форму и обработчик для загрузки аватара пользователя:
- Только изображения (jpg, png)
- Максимум 1 MB
- Проверка реального MIME-типа
- Генерация безопасного имени
- Создание превью 100x100 (используй GD или Imagick)

### Упражнение 4: Парсер логов (20 минут)

```php
<?php
// Файл access.log содержит строки вида:
// 2025-01-27 14:30:45 192.168.1.1 GET /page.php 200
// 2025-01-27 14:30:46 192.168.1.2 POST /api/users 201
// 2025-01-27 14:30:47 192.168.1.1 GET /notfound 404

// 1. Прочитай файл
// 2. Посчитай количество запросов по статусам (200, 404, etc.)
// 3. Найди топ-5 IP по количеству запросов
// 4. Найди все запросы со статусом 4xx и 5xx
```

---

## 12. Вопросы для самопроверки

1. **Чем отличается `file_get_contents` от `fread`?**

2. **Почему нельзя доверять `$_FILES['type']`?**

3. **Что делает функция `move_uploaded_file` и почему она безопаснее `copy`?**

4. **Как защититься от Path Traversal атаки?**

5. **Зачем нужна блокировка файлов (flock)?**

6. **Что произойдёт с `file_put_contents` если директория не существует?**

7. **Как проверить реальный MIME-тип файла?**

8. **Почему важно хранить загруженные файлы вне document root?**

---

## 13. Частые ошибки

### Ошибка 1: Доверие имени файла от пользователя

```php
<?php
// ❌ ОПАСНО — Path Traversal!
$filename = $_FILES['file']['name'];
move_uploaded_file($_FILES['file']['tmp_name'], "uploads/$filename");
// Если filename = "../../../etc/passwd" — катастрофа!

// ✅ Безопасно
$filename = bin2hex(random_bytes(16)) . '.jpg';
move_uploaded_file($_FILES['file']['tmp_name'], "uploads/$filename");
```

### Ошибка 2: Проверка только расширения

```php
<?php
// ❌ Можно обойти — malware.php.jpg
$ext = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION);
if ($ext === 'jpg') { /* OK */ }

// ✅ Проверяй реальный MIME-тип
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $_FILES['file']['tmp_name']);
finfo_close($finfo);

if ($mime === 'image/jpeg') { /* OK */ }
```

### Ошибка 3: Отсутствие проверки is_uploaded_file

```php
<?php
// ❌ Можно подсунуть любой файл через tmp_name
copy($_FILES['file']['tmp_name'], "uploads/file.txt");

// ✅ move_uploaded_file проверяет, что файл действительно загружен
if (is_uploaded_file($_FILES['file']['tmp_name'])) {
    move_uploaded_file($_FILES['file']['tmp_name'], "uploads/file.txt");
}
```

### Ошибка 4: Нет проверки на ошибки

```php
<?php
// ❌ Не проверяем ошибки
$content = file_get_contents('config.json');
$config = json_decode($content, true);
// Если файла нет — $content = false, json_decode вернёт null

// ✅ С проверками
$content = file_get_contents('config.json');
if ($content === false) {
    throw new RuntimeException('Не удалось прочитать конфигурацию');
}

$config = json_decode($content, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    throw new RuntimeException('Ошибка парсинга JSON');
}
```

### Ошибка 5: Выполнение PHP в папке uploads

```php
<?php
// Если злоумышленник загрузит shell.php в uploads/
// и перейдёт по http://site.com/uploads/shell.php
// он получит полный контроль над сервером!

// Решения:
// 1. .htaccess в папке uploads:
//    php_flag engine off
// 2. Хранить файлы вне document root
// 3. Отдавать файлы только через скрипт
```

---

## Резюме главы

```
┌────────────────────────────────────────────────────────────────┐
│                      ЗАПОМНИ ГЛАВНОЕ                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ЧТЕНИЕ                                                        │
│  • file_get_contents() — весь файл в строку                   │
│  • file() — файл в массив строк                               │
│  • fopen/fread/fclose — потоково (большие файлы)              │
│                                                                │
│  ЗАПИСЬ                                                        │
│  • file_put_contents() — простая запись                       │
│  • FILE_APPEND — добавить в конец                             │
│  • LOCK_EX — блокировка для многопоточности                   │
│                                                                │
│  ЗАГРУЗКА ФАЙЛОВ                                               │
│  • enctype="multipart/form-data" в форме                      │
│  • $_FILES содержит информацию о загруженных файлах           │
│  • move_uploaded_file() — безопасное перемещение              │
│                                                                │
│  БЕЗОПАСНОСТЬ                                                  │
│  • НИКОГДА не доверяй имени файла от пользователя             │
│  • Проверяй MIME-тип через finfo, не $_FILES['type']          │
│  • Генерируй случайные имена файлов                           │
│  • Храни файлы вне document root                              │
│  • Запрети выполнение PHP в папке uploads                     │
│  • Используй basename() для защиты от Path Traversal          │
│                                                                │
│  ПРОВЕРКИ                                                      │
│  • file_exists() — существует ли                              │
│  • is_file() / is_dir() — тип                                 │
│  • is_readable() / is_writable() — права                      │
│  • is_uploaded_file() — загружен ли через HTTP                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

**Следующая глава:** `Глава 2.1: HTTP глубже — заголовки, cookies, сессии, методы запросов`
