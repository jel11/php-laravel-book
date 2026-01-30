# Глава 6.4: Загрузка файлов безопасно

## 📋 Содержание главы

1. Как работает загрузка файлов
2. Уязвимости при загрузке файлов
3. Проверка типов файлов (правильная!)
4. Переименование и хранение
5. Практические примеры
6. Упражнения

---

## 1. Как работает загрузка файлов

### HTML форма для загрузки

```php
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Загрузка файла</title>
</head>
<body>
    <h1>Загрузить аватар</h1>
    
    <!-- ВАЖНО: enctype="multipart/form-data" -->
    <form action="upload.php" method="POST" enctype="multipart/form-data">
        <input type="file" name="avatar" accept="image/*">
        <button type="submit">Загрузить</button>
    </form>
</body>
</html>
```

**Ключевые моменты:**
- `enctype="multipart/form-data"` — обязателен для файлов
- `accept="image/*"` — подсказка браузеру (НЕ защита!)
- `method="POST"` — GET не поддерживает файлы

### Структура $_FILES

```php
// upload.php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    var_dump($_FILES);
}

/*
Вывод:
array(1) {
  ["avatar"]=>
  array(5) {
    ["name"]=> string(12) "photo.jpg"           // Оригинальное имя
    ["type"]=> string(10) "image/jpeg"          // MIME-тип (не доверяем!)
    ["tmp_name"]=> string(14) "/tmp/phpXXXXXX"  // Временный путь
    ["error"]=> int(0)                          // Код ошибки
    ["size"]=> int(51234)                       // Размер в байтах
  }
}
*/
```

### Коды ошибок загрузки

```php
const UPLOAD_ERRORS = [
    UPLOAD_ERR_OK => 'Файл загружен успешно',
    UPLOAD_ERR_INI_SIZE => 'Файл превышает upload_max_filesize в php.ini',
    UPLOAD_ERR_FORM_SIZE => 'Файл превышает MAX_FILE_SIZE в форме',
    UPLOAD_ERR_PARTIAL => 'Файл загружен частично',
    UPLOAD_ERR_NO_FILE => 'Файл не был загружен',
    UPLOAD_ERR_NO_TMP_DIR => 'Отсутствует временная папка',
    UPLOAD_ERR_CANT_WRITE => 'Не удалось записать файл на диск',
    UPLOAD_ERR_EXTENSION => 'PHP-расширение остановило загрузку'
];

function checkUploadError(array $file): void
{
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception(UPLOAD_ERRORS[$file['error']]);
    }
}
```

---

## 2. Уязвимости при загрузке файлов

### ❌ Уязвимый код (НЕ ДЕЛАЙ ТАК!)

```php
// ОПАСНО! Множество уязвимостей!
if ($_FILES['avatar']['error'] === 0) {
    // 1. Используем оригинальное имя
    $filename = $_FILES['avatar']['name'];
    
    // 2. Сохраняем в webroot
    $destination = 'uploads/' . $filename;
    
    // 3. Не проверяем тип файла
    move_uploaded_file($_FILES['avatar']['tmp_name'], $destination);
    
    echo "Файл загружен: <a href='$destination'>Открыть</a>";
}
```

### 🔥 Что может пойти не так?

#### Атака 1: Загрузка PHP-shell
```
Файл: shell.php
Содержимое:
<?php system($_GET['cmd']); ?>

После загрузки:
https://site.com/uploads/shell.php?cmd=rm -rf /
```

#### Атака 2: Перезапись файлов
```
Файл: ../index.php
Результат: перезаписан главный файл сайта
```

#### Атака 3: XSS через SVG
```xml
<!-- evil.svg -->
<svg xmlns="http://www.w3.org/2000/svg">
    <script>alert('XSS')</script>
</svg>
```

#### Атака 4: Обход фильтра расширений
```
Файлы:
- shell.php.jpg  (двойное расширение)
- shell.php%00.jpg  (null byte)
- shell.pHP  (регистр)
```

---

## 3. Проверка типов файлов (правильная!)

### ❌ НЕПРАВИЛЬНО: Проверка MIME-типа

```php
// НЕ ДЕЛАЙ ТАК! MIME подделывается!
if ($_FILES['avatar']['type'] === 'image/jpeg') {
    // Злоумышленник может отправить PHP-файл с type="image/jpeg"
}
```

### ❌ НЕПРАВИЛЬНО: Проверка расширения

```php
// НЕ ДЕЛАЙ ТАК! Расширение не гарантирует тип!
$ext = pathinfo($_FILES['avatar']['name'], PATHINFO_EXTENSION);
if ($ext === 'jpg') {
    // Файл может быть любым с именем evil.jpg
}
```

### ✅ ПРАВИЛЬНО: Проверка сигнатуры файла

```php
/**
 * Проверяет реальный тип файла по магическим байтам
 */
function getActualFileType(string $filepath): ?string
{
    $handle = fopen($filepath, 'rb');
    if (!$handle) {
        return null;
    }
    
    $bytes = fread($handle, 12);
    fclose($handle);
    
    // Сигнатуры популярных форматов
    $signatures = [
        'image/jpeg' => [
            'signature' => "\xFF\xD8\xFF",
            'offset' => 0
        ],
        'image/png' => [
            'signature' => "\x89\x50\x4E\x47\x0D\x0A\x1A\x0A",
            'offset' => 0
        ],
        'image/gif' => [
            'signature' => "GIF89a",
            'offset' => 0
        ],
        'image/webp' => [
            'signature' => "WEBP",
            'offset' => 8  // После "RIFF****"
        ],
        'application/pdf' => [
            'signature' => "%PDF",
            'offset' => 0
        ]
    ];
    
    foreach ($signatures as $mime => $info) {
        $sig = $info['signature'];
        $offset = $info['offset'];
        
        if (substr($bytes, $offset, strlen($sig)) === $sig) {
            return $mime;
        }
    }
    
    return null;
}
```

### Использование getActualFileType

```php
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

$actualType = getActualFileType($_FILES['avatar']['tmp_name']);

if (!in_array($actualType, $allowedTypes, true)) {
    die('Разрешены только изображения JPEG, PNG, GIF');
}
```

### Дополнительная проверка через расширения PHP

```php
/**
 * Проверка изображения через GD или Imagick
 */
function isValidImage(string $filepath): bool
{
    // Попытка открыть как изображение
    $imageInfo = @getimagesize($filepath);
    
    if ($imageInfo === false) {
        return false;
    }
    
    // Проверяем, что это один из разрешённых типов
    $allowedImageTypes = [
        IMAGETYPE_JPEG,
        IMAGETYPE_PNG,
        IMAGETYPE_GIF,
        IMAGETYPE_WEBP
    ];
    
    return in_array($imageInfo[2], $allowedImageTypes, true);
}

// Использование
if (!isValidImage($_FILES['avatar']['tmp_name'])) {
    die('Файл не является валидным изображением');
}
```

---

## 4. Переименование и хранение

### Безопасное имя файла

```php
/**
 * Генерирует безопасное уникальное имя файла
 */
function generateSafeFilename(string $originalName): string
{
    // Получаем расширение из ПРОВЕРЕННОГО типа
    $mimeToExt = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'application/pdf' => 'pdf'
    ];
    
    $actualType = getActualFileType($_FILES['avatar']['tmp_name']);
    $extension = $mimeToExt[$actualType] ?? 'bin';
    
    // Генерируем уникальное имя
    // Вариант 1: UUID-подобное
    $uniqueName = bin2hex(random_bytes(16));
    
    // Вариант 2: С временной меткой
    // $uniqueName = date('YmdHis') . '_' . bin2hex(random_bytes(8));
    
    return $uniqueName . '.' . $extension;
}

// Использование
$safeFilename = generateSafeFilename($_FILES['avatar']['name']);
// Результат: 3a4f8b2c9d1e5f6a7b8c9d0e1f2a3b4c.jpg
```

### Хранение ВНЕ webroot

```php
/**
 * Структура проекта:
 * 
 * /var/www/
 * ├── public/              ← webroot (доступен через браузер)
 * │   ├── index.php
 * │   └── css/
 * └── storage/             ← НЕ доступен напрямую
 *     └── uploads/
 *         └── avatars/
 */

// Определяем путь вне webroot
define('UPLOAD_DIR', __DIR__ . '/../storage/uploads/avatars/');

// Создаём директорию, если не существует
if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

// Полный путь к файлу
$destination = UPLOAD_DIR . $safeFilename;

// Перемещаем загруженный файл
if (!move_uploaded_file($_FILES['avatar']['tmp_name'], $destination)) {
    die('Не удалось сохранить файл');
}
```

### Отдача файлов через PHP

```php
// public/download.php
session_start();

// Проверяем авторизацию
if (!isset($_SESSION['user_id'])) {
    http_response_code(403);
    die('Доступ запрещён');
}

// Получаем имя файла (из БД, например)
$filename = $_GET['file'] ?? '';

// ВАЖНО: Валидируем, чтобы предотвратить path traversal
if (!preg_match('/^[a-f0-9]{32}\.(jpg|png|gif|webp)$/', $filename)) {
    http_response_code(400);
    die('Неверное имя файла');
}

$filepath = __DIR__ . '/../storage/uploads/avatars/' . $filename;

// Проверяем существование
if (!file_exists($filepath)) {
    http_response_code(404);
    die('Файл не найден');
}

// Определяем MIME-тип
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $filepath);
finfo_close($finfo);

// Отправляем заголовки
header('Content-Type: ' . $mimeType);
header('Content-Length: ' . filesize($filepath));
header('Content-Disposition: inline; filename="avatar.jpg"');

// Отдаём файл
readfile($filepath);
exit;
```

---

## 5. Практические примеры

### Пример 1: Полная загрузка аватара

```php
<?php
// config.php
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5 MB
define('UPLOAD_DIR', __DIR__ . '/storage/uploads/avatars/');
define('ALLOWED_TYPES', ['image/jpeg', 'image/png', 'image/webp']);

// functions.php
function validateUpload(array $file): array
{
    $errors = [];
    
    // 1. Проверка ошибки загрузки
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors[] = 'Ошибка при загрузке файла (код: ' . $file['error'] . ')';
        return $errors;
    }
    
    // 2. Проверка размера
    if ($file['size'] > MAX_FILE_SIZE) {
        $errors[] = 'Файл слишком большой (максимум 5 МБ)';
    }
    
    if ($file['size'] === 0) {
        $errors[] = 'Файл пустой';
    }
    
    // 3. Проверка, что файл загружен через HTTP POST
    if (!is_uploaded_file($file['tmp_name'])) {
        $errors[] = 'Файл не был загружен через POST';
    }
    
    // 4. Проверка реального типа файла
    $actualType = getActualFileType($file['tmp_name']);
    if (!in_array($actualType, ALLOWED_TYPES, true)) {
        $errors[] = 'Разрешены только изображения JPEG, PNG, WebP';
    }
    
    // 5. Дополнительная проверка через GD
    if (!isValidImage($file['tmp_name'])) {
        $errors[] = 'Файл не является валидным изображением';
    }
    
    return $errors;
}

function saveUploadedFile(array $file, int $userId): ?string
{
    // Создаём директорию для пользователя
    $userDir = UPLOAD_DIR . $userId . '/';
    if (!is_dir($userDir)) {
        mkdir($userDir, 0755, true);
    }
    
    // Генерируем безопасное имя
    $filename = generateSafeFilename($file['name']);
    $destination = $userDir . $filename;
    
    // Перемещаем файл
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        return null;
    }
    
    // Устанавливаем права доступа
    chmod($destination, 0644);
    
    return $filename;
}

// upload.php
session_start();
require 'config.php';
require 'functions.php';
require 'db.php'; // PDO подключение

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    die('Метод не поддерживается');
}

if (!isset($_SESSION['user_id'])) {
    die('Необходима авторизация');
}

if (!isset($_FILES['avatar'])) {
    die('Файл не был отправлен');
}

// Валидация
$errors = validateUpload($_FILES['avatar']);
if (!empty($errors)) {
    foreach ($errors as $error) {
        echo "❌ $error<br>";
    }
    exit;
}

// Сохранение
$userId = $_SESSION['user_id'];
$filename = saveUploadedFile($_FILES['avatar'], $userId);

if ($filename === null) {
    die('Не удалось сохранить файл');
}

// Сохраняем путь в БД
try {
    $stmt = $pdo->prepare('
        UPDATE users 
        SET avatar = :avatar 
        WHERE id = :user_id
    ');
    
    $stmt->execute([
        'avatar' => $userId . '/' . $filename,
        'user_id' => $userId
    ]);
    
    echo "✅ Аватар успешно загружен!";
    
} catch (PDOException $e) {
    // Удаляем файл при ошибке БД
    unlink(UPLOAD_DIR . $userId . '/' . $filename);
    die('Ошибка сохранения в БД');
}
```

### Пример 2: Загрузка документов с дополнительной защитой

```php
<?php
// Загрузка PDF резюме

define('ALLOWED_DOC_TYPES', ['application/pdf']);
define('DOCS_DIR', __DIR__ . '/storage/uploads/documents/');

function sanitizePdfFile(string $filepath): bool
{
    // Проверяем, что PDF не содержит JavaScript
    $content = file_get_contents($filepath);
    
    // Ищем опасные конструкции
    $dangerousPatterns = [
        '/\/JavaScript/i',
        '/\/JS/i',
        '/\/AA/i',  // Auto Action
        '/\/OpenAction/i',
        '/\/Launch/i'
    ];
    
    foreach ($dangerousPatterns as $pattern) {
        if (preg_match($pattern, $content)) {
            return false;
        }
    }
    
    return true;
}

if ($_FILES['resume']['error'] === UPLOAD_ERR_OK) {
    // Стандартные проверки
    $actualType = getActualFileType($_FILES['resume']['tmp_name']);
    
    if ($actualType !== 'application/pdf') {
        die('Разрешены только PDF файлы');
    }
    
    // Дополнительная проверка на вредоносный код
    if (!sanitizePdfFile($_FILES['resume']['tmp_name'])) {
        die('PDF содержит потенциально опасный код');
    }
    
    // Сохранение...
}
```

### Пример 3: Множественная загрузка

```html
<!-- Форма с multiple -->
<form action="upload-gallery.php" method="POST" enctype="multipart/form-data">
    <input type="file" name="photos[]" multiple accept="image/*">
    <button type="submit">Загрузить галерею</button>
</form>
```

```php
<?php
// upload-gallery.php

if (!isset($_FILES['photos'])) {
    die('Файлы не были отправлены');
}

$files = $_FILES['photos'];
$uploadedFiles = [];
$errors = [];

// Нормализуем структуру массива
$fileCount = count($files['name']);

for ($i = 0; $i < $fileCount; $i++) {
    $file = [
        'name' => $files['name'][$i],
        'type' => $files['type'][$i],
        'tmp_name' => $files['tmp_name'][$i],
        'error' => $files['error'][$i],
        'size' => $files['size'][$i]
    ];
    
    // Валидация каждого файла
    $fileErrors = validateUpload($file);
    
    if (!empty($fileErrors)) {
        $errors[$file['name']] = $fileErrors;
        continue;
    }
    
    // Сохранение
    $filename = saveUploadedFile($file, $_SESSION['user_id']);
    
    if ($filename) {
        $uploadedFiles[] = $filename;
    } else {
        $errors[$file['name']] = ['Не удалось сохранить'];
    }
}

// Вывод результатов
echo "Загружено файлов: " . count($uploadedFiles) . "<br>";

if (!empty($errors)) {
    echo "<h3>Ошибки:</h3>";
    foreach ($errors as $filename => $fileErrors) {
        echo "<strong>$filename:</strong><br>";
        foreach ($fileErrors as $error) {
            echo "- $error<br>";
        }
    }
}
```

---

## 6. Дополнительные меры безопасности

### .htaccess для папки uploads

```apache
# /public/uploads/.htaccess

# Запретить выполнение PHP
<FilesMatch "\.php$">
    Order Deny,Allow
    Deny from all
</FilesMatch>

# Разрешить только изображения
<FilesMatch "\.(jpg|jpeg|png|gif|webp)$">
    Order Allow,Deny
    Allow from all
</FilesMatch>

# Отключить листинг директории
Options -Indexes

# Отключить интерпретацию .htaccess в поддиректориях
AllowOverride None
```

### Nginx конфигурация

```nginx
# Блок для uploads
location /uploads/ {
    # Запретить выполнение PHP
    location ~ \.php$ {
        deny all;
    }
    
    # Разрешить только изображения
    location ~* \.(jpg|jpeg|png|gif|webp)$ {
        # Добавить заголовки безопасности
        add_header X-Content-Type-Options nosniff;
        add_header Content-Security-Policy "default-src 'none'; img-src 'self';";
        
        expires 1y;
        access_log off;
    }
    
    # Запретить всё остальное
    location ~* {
        deny all;
    }
}
```

### Ограничение размера в php.ini

```ini
; Максимальный размер POST данных
post_max_size = 10M

; Максимальный размер загружаемого файла
upload_max_filesize = 5M

; Максимальное количество файлов
max_file_uploads = 20
```

### Антивирусная проверка

```php
/**
 * Проверка файла через ClamAV
 * Требует: apt-get install clamav clamav-daemon
 */
function scanFileWithClamAV(string $filepath): bool
{
    $output = [];
    $returnVar = 0;
    
    exec("clamscan --no-summary " . escapeshellarg($filepath), $output, $returnVar);
    
    // 0 = чисто, 1 = найден вирус, 2 = ошибка
    return $returnVar === 0;
}

// Использование
if (!scanFileWithClamAV($_FILES['file']['tmp_name'])) {
    unlink($_FILES['file']['tmp_name']);
    die('Файл содержит вредоносный код');
}
```

---

## 📝 Упражнения

### Упражнение 1: Базовая загрузка

Создай форму и скрипт для загрузки одного изображения:
- Проверка типа по сигнатуре
- Ограничение 2 МБ
- Сохранение с безопасным именем
- Вывод превью после загрузки

### Упражнение 2: Галерея

Расширь предыдущее упражнение:
- Загрузка до 5 изображений одновременно
- Сохранение информации в БД (id, user_id, filename, uploaded_at)
- Страница просмотра всех загруженных изображений
- Удаление изображений (файл + запись в БД)

### Упражнение 3: Аватар с обработкой

Создай систему аватаров:
- Загрузка изображения
- Создание трёх версий: original, medium (500px), thumbnail (150px)
- При загрузке нового аватара — удаление старого
- Отображение аватара в профиле пользователя

**Подсказка для изменения размера:**
```php
function resizeImage(string $source, string $destination, int $maxWidth): bool
{
    list($width, $height, $type) = getimagesize($source);
    
    $ratio = $width / $height;
    $newWidth = min($maxWidth, $width);
    $newHeight = $newWidth / $ratio;
    
    // Создаём изображение из источника
    switch ($type) {
        case IMAGETYPE_JPEG:
            $image = imagecreatefromjpeg($source);
            break;
        case IMAGETYPE_PNG:
            $image = imagecreatefrompng($source);
            break;
        case IMAGETYPE_GIF:
            $image = imagecreatefromgif($source);
            break;
        default:
            return false;
    }
    
    // Создаём пустое изображение нового размера
    $newImage = imagecreatetruecolor($newWidth, $newHeight);
    
    // Сохраняем прозрачность для PNG
    if ($type === IMAGETYPE_PNG) {
        imagealphablending($newImage, false);
        imagesavealpha($newImage, true);
    }
    
    // Изменяем размер
    imagecopyresampled(
        $newImage, $image,
        0, 0, 0, 0,
        $newWidth, $newHeight,
        $width, $height
    );
    
    // Сохраняем
    $result = imagejpeg($newImage, $destination, 85);
    
    imagedestroy($image);
    imagedestroy($newImage);
    
    return $result;
}
```

### Упражнение 4: Защита от атак

Создай тестовый скрипт, который пытается:
1. Загрузить PHP-файл с расширением .jpg
2. Загрузить файл с именем `../../../etc/passwd.jpg`
3. Загрузить SVG с JavaScript
4. Загрузить файл размером 100 МБ

Убедись, что твой код защищён от всех этих атак.

### Упражнение 5: Система документов (★★★)

Создай систему управления документами:

**Функционал:**
- Загрузка PDF, DOC, DOCX (проверка по сигнатуре)
- Категории документов (договоры, счета, акты)
- Права доступа (личные, для команды, публичные)
- История версий документа
- Поиск по имени файла и категории

**Структура БД:**
```sql
CREATE TABLE documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    access_level ENUM('private', 'team', 'public') DEFAULT 'private',
    version INT DEFAULT 1,
    parent_id INT NULL,  -- Для версий
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES documents(id)
);
```

---

## 🎯 Чек-лист безопасной загрузки

- [ ] `enctype="multipart/form-data"` в форме
- [ ] Проверка `$_FILES['name']['error'] === UPLOAD_ERR_OK`
- [ ] Проверка размера файла
- [ ] Проверка типа по сигнатуре (НЕ по MIME!)
- [ ] Дополнительная валидация (getimagesize для изображений)
- [ ] Генерация безопасного имени файла
- [ ] Хранение ВНЕ webroot
- [ ] Использование `move_uploaded_file()`
- [ ] Установка правильных прав доступа (chmod)
- [ ] .htaccess/.nginx конфигурация для папки uploads
- [ ] Валидация пути при отдаче файлов
- [ ] Логирование загрузок
- [ ] Ограничения в php.ini

---

## 💡 Частые ошибки

### 1. Доверие MIME-типу из $_FILES
```php
// ❌ ПЛОХО
if ($_FILES['file']['type'] === 'image/jpeg') {
    // Легко подделывается!
}

// ✅ ХОРОШО
$actualType = getActualFileType($_FILES['file']['tmp_name']);
if ($actualType === 'image/jpeg') {
    // Проверено по содержимому
}
```

### 2. Использование оригинального имени
```php
// ❌ ПЛОХО
$filename = $_FILES['file']['name'];
move_uploaded_file($tmp, 'uploads/' . $filename);
// Уязвимо к path traversal, перезаписи файлов

// ✅ ХОРОШО
$filename = bin2hex(random_bytes(16)) . '.jpg';
```

### 3. Хранение в webroot без защиты
```php
// ❌ ПЛОХО
move_uploaded_file($tmp, 'uploads/file.php');
// Файл может быть выполнен как PHP!

// ✅ ХОРОШО
// 1. Хранить вне webroot
// 2. Добавить .htaccess запрет выполнения PHP
// 3. Отдавать через PHP скрипт
```

### 4. Отсутствие проверки is_uploaded_file
```php
// ❌ ПЛОХО
move_uploaded_file($_GET['file'], 'uploads/avatar.jpg');
// Можно переместить ЛЮБОЙ файл с сервера!

// ✅ ХОРОШО
if (is_uploaded_file($_FILES['file']['tmp_name'])) {
    move_uploaded_file(...);
}
```

---

## 🎓 Что дальше?

Теперь ты знаешь, как безопасно работать с загрузкой файлов! В следующих главах:

- **Глава 7.1**: Composer — управление зависимостями
- **Глава 8.1**: Laravel — начинаем изучать фреймворк
- **Глава 10.3**: Очереди в Laravel — обработка загруженных файлов в фоне

Загрузка файлов — одна из самых опасных операций в веб-разработке. Всегда проверяй файлы несколькими способами и никогда не доверяй пользовательским данным!