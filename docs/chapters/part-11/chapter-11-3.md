# Глава 11.3: Feature-тесты в Laravel — тестирование HTTP, базы данных, аутентификации

## Введение

Feature-тесты (функциональные тесты) проверяют работу приложения как единого целого. В отличие от unit-тестов, которые тестируют изолированные части кода, feature-тесты имитируют действия реального пользователя: отправку форм, переходы по страницам, авторизацию.

**Что мы будем тестировать:**
- HTTP-запросы (GET, POST, PUT, DELETE)
- Ответы сервера (статус-коды, JSON, редиректы)
- Работу с базой данных
- Аутентификацию и авторизацию
- Валидацию форм
- Сессии и cookies

---

## Структура feature-тестов

### Создание теста

```bash
php artisan make:test PostTest
```

Тест создастся в `tests/Feature/PostTest.php`:

```php
<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PostTest extends TestCase
{
    use RefreshDatabase; // Откатывает БД после каждого теста
    
    public function test_user_can_view_posts_list(): void
    {
        $response = $this->get('/posts');
        
        $response->assertStatus(200);
    }
}
```

### Трейт RefreshDatabase

```php
use RefreshDatabase;
```

**Что делает:**
- Запускает миграции перед первым тестом
- Оборачивает каждый тест в транзакцию
- Откатывает изменения после теста

**Альтернатива — DatabaseMigrations:**
```php
use DatabaseMigrations; // Полностью пересоздаёт БД
```

---

## Тестирование HTTP-запросов

### GET-запросы

```php
public function test_homepage_loads_successfully(): void
{
    $response = $this->get('/');
    
    $response->assertStatus(200);
    $response->assertSee('Welcome');
    $response->assertViewIs('welcome');
}

public function test_post_page_shows_content(): void
{
    $post = Post::factory()->create([
        'title' => 'Laravel Testing',
        'content' => 'How to write tests'
    ]);
    
    $response = $this->get("/posts/{$post->id}");
    
    $response->assertStatus(200);
    $response->assertSee('Laravel Testing');
    $response->assertSee('How to write tests');
    $response->assertViewHas('post', $post);
}
```

### POST-запросы

```php
public function test_user_can_create_post(): void
{
    $data = [
        'title' => 'New Post',
        'content' => 'Post content',
        'category_id' => 1
    ];
    
    $response = $this->post('/posts', $data);
    
    // Проверяем редирект
    $response->assertRedirect('/posts');
    
    // Проверяем, что пост создан в БД
    $this->assertDatabaseHas('posts', [
        'title' => 'New Post',
        'content' => 'Post content'
    ]);
}

public function test_post_creation_requires_title(): void
{
    $response = $this->post('/posts', [
        'content' => 'Content without title'
    ]);
    
    $response->assertSessionHasErrors('title');
    $this->assertDatabaseCount('posts', 0);
}
```

### PUT/PATCH-запросы (обновление)

```php
public function test_user_can_update_post(): void
{
    $post = Post::factory()->create(['title' => 'Old Title']);
    
    $response = $this->put("/posts/{$post->id}", [
        'title' => 'Updated Title',
        'content' => $post->content
    ]);
    
    $response->assertRedirect("/posts/{$post->id}");
    
    $this->assertDatabaseHas('posts', [
        'id' => $post->id,
        'title' => 'Updated Title'
    ]);
    
    // Или проверить через модель
    $post->refresh();
    $this->assertEquals('Updated Title', $post->title);
}
```

### DELETE-запросы

```php
public function test_user_can_delete_post(): void
{
    $post = Post::factory()->create();
    
    $response = $this->delete("/posts/{$post->id}");
    
    $response->assertRedirect('/posts');
    
    $this->assertDatabaseMissing('posts', [
        'id' => $post->id
    ]);
    
    // Или проверить через модель
    $this->assertModelMissing($post);
}

public function test_deleted_post_is_soft_deleted(): void
{
    $post = Post::factory()->create();
    
    $this->delete("/posts/{$post->id}");
    
    // Проверяем soft delete
    $this->assertSoftDeleted('posts', [
        'id' => $post->id
    ]);
}
```

---

## Ассерции для HTTP-ответов

### Проверка статус-кодов

```php
$response->assertStatus(200);        // Точное совпадение
$response->assertOk();               // 200
$response->assertCreated();          // 201
$response->assertNoContent();        // 204
$response->assertNotFound();         // 404
$response->assertForbidden();        // 403
$response->assertUnauthorized();     // 401
$response->assertServerError();      // 500
```

### Проверка редиректов

```php
$response->assertRedirect('/home');
$response->assertRedirectToRoute('dashboard');
$response->assertRedirectToSignedRoute('verify.email');
```

### Проверка содержимого

```php
$response->assertSee('Welcome');
$response->assertSeeText('Plain text');  // Игнорирует HTML
$response->assertDontSee('Error');
$response->assertSeeInOrder(['First', 'Second', 'Third']);
```

### Проверка JSON

```php
public function test_api_returns_posts(): void
{
    Post::factory()->count(3)->create();
    
    $response = $this->getJson('/api/posts');
    
    $response->assertStatus(200);
    $response->assertJsonCount(3, 'data');
    $response->assertJsonStructure([
        'data' => [
            '*' => ['id', 'title', 'content', 'created_at']
        ]
    ]);
}

public function test_api_returns_specific_post(): void
{
    $post = Post::factory()->create([
        'title' => 'Test Post'
    ]);
    
    $response = $this->getJson("/api/posts/{$post->id}");
    
    $response->assertJson([
        'data' => [
            'id' => $post->id,
            'title' => 'Test Post'
        ]
    ]);
    
    $response->assertJsonPath('data.title', 'Test Post');
}
```

### Проверка View

```php
$response->assertViewIs('posts.index');
$response->assertViewHas('posts');
$response->assertViewHas('posts', function ($posts) {
    return $posts->count() === 10;
});
$response->assertViewMissing('errors');
```

---

## Тестирование базы данных

### Создание тестовых данных

```php
public function test_user_dashboard_shows_own_posts(): void
{
    $user = User::factory()->create();
    $userPosts = Post::factory()->count(3)->create([
        'user_id' => $user->id
    ]);
    $otherPosts = Post::factory()->count(2)->create();
    
    $response = $this->actingAs($user)->get('/dashboard');
    
    // Видит свои посты
    foreach ($userPosts as $post) {
        $response->assertSee($post->title);
    }
    
    // Не видит чужие
    foreach ($otherPosts as $post) {
        $response->assertDontSee($post->title);
    }
}
```

### Проверка данных в БД

```php
// Проверка наличия записи
$this->assertDatabaseHas('users', [
    'email' => 'test@example.com',
    'name' => 'John Doe'
]);

// Проверка отсутствия
$this->assertDatabaseMissing('users', [
    'email' => 'deleted@example.com'
]);

// Подсчёт записей
$this->assertDatabaseCount('posts', 5);

// Проверка модели
$this->assertModelExists($user);
$this->assertModelMissing($deletedPost);
```

### Проверка связей

```php
public function test_post_belongs_to_user(): void
{
    $user = User::factory()->create();
    $post = Post::factory()->create(['user_id' => $user->id]);
    
    $response = $this->get("/posts/{$post->id}");
    
    $response->assertSee($user->name);
    $this->assertEquals($user->id, $post->user_id);
}

public function test_deleting_user_deletes_posts(): void
{
    $user = User::factory()
        ->has(Post::factory()->count(3))
        ->create();
    
    $postIds = $user->posts->pluck('id');
    
    $user->delete();
    
    foreach ($postIds as $id) {
        $this->assertDatabaseMissing('posts', ['id' => $id]);
    }
}
```

---

## Тестирование аутентификации

### Регистрация пользователя

```php
public function test_user_can_register(): void
{
    $response = $this->post('/register', [
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123'
    ]);
    
    $response->assertRedirect('/home');
    
    $this->assertDatabaseHas('users', [
        'name' => 'John Doe',
        'email' => 'john@example.com'
    ]);
    
    // Проверяем, что пользователь аутентифицирован
    $this->assertAuthenticated();
}

public function test_registration_requires_valid_email(): void
{
    $response = $this->post('/register', [
        'name' => 'John',
        'email' => 'invalid-email',
        'password' => 'password123',
        'password_confirmation' => 'password123'
    ]);
    
    $response->assertSessionHasErrors('email');
    $this->assertGuest();
}
```

### Авторизация

```php
public function test_user_can_login(): void
{
    $user = User::factory()->create([
        'password' => bcrypt('password123')
    ]);
    
    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password123'
    ]);
    
    $response->assertRedirect('/dashboard');
    $this->assertAuthenticatedAs($user);
}

public function test_user_cannot_login_with_wrong_password(): void
{
    $user = User::factory()->create([
        'password' => bcrypt('correct-password')
    ]);
    
    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'wrong-password'
    ]);
    
    $response->assertSessionHasErrors();
    $this->assertGuest();
}

public function test_user_can_logout(): void
{
    $user = User::factory()->create();
    
    $response = $this->actingAs($user)->post('/logout');
    
    $response->assertRedirect('/');
    $this->assertGuest();
}
```

### Защищённые маршруты

```php
public function test_guest_cannot_access_dashboard(): void
{
    $response = $this->get('/dashboard');
    
    $response->assertRedirect('/login');
    $this->assertGuest();
}

public function test_authenticated_user_can_access_dashboard(): void
{
    $user = User::factory()->create();
    
    $response = $this->actingAs($user)->get('/dashboard');
    
    $response->assertStatus(200);
    $response->assertSee($user->name);
}
```

### Роли и права доступа

```php
public function test_only_admin_can_delete_posts(): void
{
    $admin = User::factory()->create(['role' => 'admin']);
    $user = User::factory()->create(['role' => 'user']);
    $post = Post::factory()->create();
    
    // Обычный пользователь не может
    $response = $this->actingAs($user)->delete("/posts/{$post->id}");
    $response->assertForbidden();
    $this->assertModelExists($post);
    
    // Админ может
    $response = $this->actingAs($admin)->delete("/posts/{$post->id}");
    $response->assertRedirect();
    $this->assertModelMissing($post);
}

public function test_user_can_only_edit_own_posts(): void
{
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $post = Post::factory()->create(['user_id' => $owner->id]);
    
    // Чужой пользователь не может
    $response = $this->actingAs($other)
        ->put("/posts/{$post->id}", ['title' => 'Hacked']);
    $response->assertForbidden();
    
    // Владелец может
    $response = $this->actingAs($owner)
        ->put("/posts/{$post->id}", [
            'title' => 'Updated',
            'content' => $post->content
        ]);
    $response->assertRedirect();
    $post->refresh();
    $this->assertEquals('Updated', $post->title);
}
```

---

## Тестирование валидации

### Проверка правил валидации

```php
public function test_post_title_is_required(): void
{
    $user = User::factory()->create();
    
    $response = $this->actingAs($user)->post('/posts', [
        'content' => 'Some content'
    ]);
    
    $response->assertSessionHasErrors('title');
}

public function test_post_title_must_be_unique(): void
{
    $user = User::factory()->create();
    Post::factory()->create(['title' => 'Existing Title']);
    
    $response = $this->actingAs($user)->post('/posts', [
        'title' => 'Existing Title',
        'content' => 'Content'
    ]);
    
    $response->assertSessionHasErrors('title');
}

public function test_post_content_has_minimum_length(): void
{
    $user = User::factory()->create();
    
    $response = $this->actingAs($user)->post('/posts', [
        'title' => 'Valid Title',
        'content' => 'Too short'
    ]);
    
    $response->assertSessionHasErrors('content');
}
```

### Проверка конкретных ошибок

```php
public function test_validation_errors_are_specific(): void
{
    $response = $this->post('/posts', []);
    
    $response->assertSessionHasErrors([
        'title' => 'The title field is required.',
        'content' => 'The content field is required.'
    ]);
}

public function test_old_input_is_preserved_on_error(): void
{
    $response = $this->post('/posts', [
        'title' => 'Valid Title'
        // content отсутствует
    ]);
    
    $response->assertSessionHasInput('title', 'Valid Title');
}
```

---

## Тестирование сессий и cookies

### Сессии

```php
public function test_flash_message_is_displayed(): void
{
    $user = User::factory()->create();
    
    $response = $this->actingAs($user)->post('/posts', [
        'title' => 'New Post',
        'content' => 'Content'
    ]);
    
    $response->assertSessionHas('success', 'Post created successfully');
}

public function test_cart_is_stored_in_session(): void
{
    $product = Product::factory()->create();
    
    $response = $this->post('/cart/add', [
        'product_id' => $product->id,
        'quantity' => 2
    ]);
    
    $response->assertSessionHas('cart', function ($cart) use ($product) {
        return isset($cart[$product->id]) && $cart[$product->id]['quantity'] === 2;
    });
}
```

### Cookies

```php
public function test_remember_me_sets_cookie(): void
{
    $user = User::factory()->create([
        'password' => bcrypt('password123')
    ]);
    
    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password123',
        'remember' => true
    ]);
    
    $response->assertCookie('remember_web_' . sha1(get_class($user)));
}

public function test_language_preference_is_saved(): void
{
    $response = $this->post('/language', ['lang' => 'fr']);
    
    $response->assertCookie('language', 'fr');
}
```

---

## Тестирование API

### JSON API endpoints

```php
public function test_api_returns_posts_list(): void
{
    Post::factory()->count(5)->create();
    
    $response = $this->getJson('/api/posts');
    
    $response->assertStatus(200);
    $response->assertJsonStructure([
        'data' => [
            '*' => ['id', 'title', 'content', 'author']
        ],
        'meta' => ['total', 'per_page', 'current_page']
    ]);
}

public function test_api_creates_post(): void
{
    $user = User::factory()->create();
    
    $response = $this->actingAs($user, 'api')->postJson('/api/posts', [
        'title' => 'API Post',
        'content' => 'Created via API'
    ]);
    
    $response->assertCreated();
    $response->assertJson([
        'data' => [
            'title' => 'API Post'
        ]
    ]);
    
    $this->assertDatabaseHas('posts', [
        'title' => 'API Post',
        'user_id' => $user->id
    ]);
}
```

### Аутентификация API (Sanctum/Passport)

```php
public function test_unauthenticated_api_request_fails(): void
{
    $response = $this->postJson('/api/posts', [
        'title' => 'Test'
    ]);
    
    $response->assertUnauthorized();
}

public function test_api_authentication_with_token(): void
{
    $user = User::factory()->create();
    $token = $user->createToken('test-token')->plainTextToken;
    
    $response = $this->withHeader('Authorization', "Bearer $token")
        ->postJson('/api/posts', [
            'title' => 'Authenticated Post',
            'content' => 'Content'
        ]);
    
    $response->assertCreated();
}
```

---

## Продвинутые техники

### Тестирование middleware

```php
public function test_api_rate_limiting(): void
{
    $user = User::factory()->create();
    
    // Делаем 61 запрос (лимит обычно 60)
    for ($i = 0; $i < 61; $i++) {
        $response = $this->actingAs($user, 'api')
            ->getJson('/api/posts');
        
        if ($i < 60) {
            $response->assertOk();
        } else {
            $response->assertStatus(429); // Too Many Requests
        }
    }
}

public function test_admin_middleware_blocks_regular_users(): void
{
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create(['is_admin' => false]);
    
    // Обычный пользователь блокируется
    $response = $this->actingAs($user)->get('/admin/dashboard');
    $response->assertForbidden();
    
    // Админ проходит
    $response = $this->actingAs($admin)->get('/admin/dashboard');
    $response->assertOk();
}
```

### Тестирование загрузки файлов

```php
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

public function test_user_can_upload_avatar(): void
{
    Storage::fake('public');
    
    $user = User::factory()->create();
    $file = UploadedFile::fake()->image('avatar.jpg', 200, 200);
    
    $response = $this->actingAs($user)->post('/profile/avatar', [
        'avatar' => $file
    ]);
    
    $response->assertRedirect();
    
    // Проверяем, что файл сохранён
    Storage::disk('public')->assertExists('avatars/' . $file->hashName());
    
    // Проверяем путь в БД
    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'avatar' => 'avatars/' . $file->hashName()
    ]);
}

public function test_upload_validates_file_type(): void
{
    Storage::fake('public');
    
    $user = User::factory()->create();
    $file = UploadedFile::fake()->create('document.pdf', 1000);
    
    $response = $this->actingAs($user)->post('/profile/avatar', [
        'avatar' => $file
    ]);
    
    $response->assertSessionHasErrors('avatar');
    Storage::disk('public')->assertMissing('avatars/' . $file->hashName());
}
```

### Тестирование событий (Events)

```php
use Illuminate\Support\Facades\Event;

public function test_post_creation_fires_event(): void
{
    Event::fake([PostCreated::class]);
    
    $user = User::factory()->create();
    
    $this->actingAs($user)->post('/posts', [
        'title' => 'Event Test',
        'content' => 'Content'
    ]);
    
    Event::assertDispatched(PostCreated::class, function ($event) {
        return $event->post->title === 'Event Test';
    });
}
```

### Тестирование почты

```php
use Illuminate\Support\Facades\Mail;
use App\Mail\WelcomeEmail;

public function test_registration_sends_welcome_email(): void
{
    Mail::fake();
    
    $this->post('/register', [
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123'
    ]);
    
    Mail::assertSent(WelcomeEmail::class, function ($mail) {
        return $mail->hasTo('john@example.com');
    });
}
```

### Тестирование очередей (Jobs)

```php
use Illuminate\Support\Facades\Queue;
use App\Jobs\ProcessVideo;

public function test_video_upload_queues_processing(): void
{
    Queue::fake();
    Storage::fake('public');
    
    $user = User::factory()->create();
    $video = UploadedFile::fake()->create('video.mp4', 10000);
    
    $this->actingAs($user)->post('/videos/upload', [
        'video' => $video
    ]);
    
    Queue::assertPushed(ProcessVideo::class);
}
```

---

## Организация тестов

### Группировка по функциональности

```php
// tests/Feature/Post/CreatePostTest.php
class CreatePostTest extends TestCase
{
    use RefreshDatabase;
    
    public function test_authenticated_user_can_create_post(): void { }
    public function test_guest_cannot_create_post(): void { }
    public function test_post_creation_validates_title(): void { }
}

// tests/Feature/Post/UpdatePostTest.php
class UpdatePostTest extends TestCase
{
    public function test_user_can_update_own_post(): void { }
    public function test_user_cannot_update_others_posts(): void { }
}
```

### Setup и вспомогательные методы

```php
class PostTest extends TestCase
{
    use RefreshDatabase;
    
    private User $user;
    
    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
    }
    
    private function createPost(array $attributes = []): Post
    {
        return Post::factory()->create(array_merge([
            'user_id' => $this->user->id
        ], $attributes));
    }
    
    public function test_example(): void
    {
        $post = $this->createPost(['title' => 'Test']);
        // ...
    }
}
```

---

## Частые ошибки

### ❌ Не использовать RefreshDatabase

```php
// Плохо - тесты влияют друг на друга
class PostTest extends TestCase
{
    public function test_create_post(): void
    {
        Post::create(['title' => 'Test']);
        $this->assertDatabaseCount('posts', 1);
    }
    
    public function test_delete_post(): void
    {
        // Этот тест увидит пост из предыдущего!
        $this->assertDatabaseCount('posts', 1); // Упс
    }
}

// Хорошо
class PostTest extends TestCase
{
    use RefreshDatabase; // Каждый тест начинается с чистой БД
}
```

### ❌ Тестировать слишком много в одном тесте

```php
// Плохо
public function test_post_workflow(): void
{
    // Создание
    $response = $this->post('/posts', [...]);
    $response->assertRedirect();
    
    // Обновление
    $response = $this->put('/posts/1', [...]);
    $response->assertOk();
    
    // Удаление
    $response = $this->delete('/posts/1');
    // ...
}

// Хорошо - отдельные тесты
public function test_post_creation(): void { }
public function test_post_update(): void { }
public function test_post_deletion(): void { }
```

### ❌ Забывать про `actingAs()` для защищённых роутов

```php
// Плохо
public function test_dashboard(): void
{
    $response = $this->get('/dashboard'); // 302 Redirect
    $response->assertOk(); // Упадёт!
}

// Хорошо
public function test_dashboard(): void
{
    $user = User::factory()->create();
    $response = $this->actingAs($user)->get('/dashboard');
    $response->assertOk();
}
```

---

## Практические задания

### Задание 1: Тестирование CRUD

Создайте полный набор тестов для системы управления задачами:

```php
// Требуемые тесты:
- Просмотр списка задач
- Создание новой задачи
- Редактирование задачи
- Удаление задачи
- Валидация при создании
- Только автор может редактировать/удалять свои задачи
```

<details>
<summary>Решение</summary>

```php
<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;

class TaskTest extends TestCase
{
    use RefreshDatabase;
    
    public function test_user_can_view_tasks_list(): void
    {
        $user = User::factory()->create();
        $tasks = Task::factory()->count(3)->create(['user_id' => $user->id]);
        
        $response = $this->actingAs($user)->get('/tasks');
        
        $response->assertOk();
        foreach ($tasks as $task) {
            $response->assertSee($task->title);
        }
    }
    
    public function test_user_can_create_task(): void
    {
        $user = User::factory()->create();
        
        $response = $this->actingAs($user)->post('/tasks', [
            'title' => 'New Task',
            'description' => 'Task description',
            'due_date' => now()->addDays(7)->format('Y-m-d')
        ]);
        
        $response->assertRedirect('/tasks');
        $this->assertDatabaseHas('tasks', [
            'title' => 'New Task',
            'user_id' => $user->id
        ]);
    }
    
    public function test_task_title_is_required(): void
    {
        $user = User::factory()->create();
        
        $response = $this->actingAs($user)->post('/tasks', [
            'description' => 'Only description'
        ]);
        
        $response->assertSessionHasErrors('title');
        $this->assertDatabaseCount('tasks', 0);
    }
    
    public function test_user_can_update_own_task(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->create(['user_id' => $user->id]);
        
        $response = $this->actingAs($user)->put("/tasks/{$task->id}", [
            'title' => 'Updated Title',
            'description' => $task->description,
            'due_date' => $task->due_date
        ]);
        
        $response->assertRedirect();
        $task->refresh();
        $this->assertEquals('Updated Title', $task->title);
    }
    
    public function test_user_cannot_update_others_task(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $task = Task::factory()->create(['user_id' => $owner->id]);
        
        $response = $this->actingAs($other)->put("/tasks/{$task->id}", [
            'title' => 'Hacked',
            'description' => $task->description,
            'due_date' => $task->due_date
        ]);
        
        $response->assertForbidden();
        $task->refresh();
        $this->assertNotEquals('Hacked', $task->title);
    }
    
    public function test_user_can_delete_own_task(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->create(['user_id' => $user->id]);
        
        $response = $this->actingAs($user)->delete("/tasks/{$task->id}");
        
        $response->assertRedirect('/tasks');
        $this->assertModelMissing($task);
    }
    
    public function test_user_cannot_delete_others_task(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $task = Task::factory()->create(['user_id' => $owner->id]);
        
        $response = $this->actingAs($other)->delete("/tasks/{$task->id}");
        
        $response->assertForbidden();
        $this->assertModelExists($task);
    }
}
```

</details>

### Задание 2: Тестирование аутентификации

Напишите тесты для полного цикла аутентификации:

```php
// Требуемые тесты:
- Регистрация с валидными данными
- Регистрация с невалидным email
- Пароли не совпадают
- Email уже занят
- Вход с правильными данными
- Вход с неправильным паролем
- Выход из системы
- Защищённые маршруты требуют авторизации
```

<details>
<summary>Решение</summary>

```php
<?php

namespace Tests\Feature\Auth;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;
    
    public function test_user_can_register(): void
    {
        $response = $this->post('/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123'
        ]);
        
        $response->assertRedirect('/home');
        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com'
        ]);
        $this->assertAuthenticated();
    }
    
    public function test_registration_validates_email(): void
    {
        $response = $this->post('/register', [
            'name' => 'John',
            'email' => 'invalid-email',
            'password' => 'password123',
            'password_confirmation' => 'password123'
        ]);
        
        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }
    
    public function test_registration_requires_matching_passwords(): void
    {
        $response = $this->post('/register', [
            'name' => 'John',
            'email' => 'john@example.com',
            'password' => 'password123',
            'password_confirmation' => 'different'
        ]);
        
        $response->assertSessionHasErrors('password');
    }
    
    public function test_registration_prevents_duplicate_email(): void
    {
        User::factory()->create(['email' => 'existing@example.com']);
        
        $response = $this->post('/register', [
            'name' => 'John',
            'email' => 'existing@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123'
        ]);
        
        $response->assertSessionHasErrors('email');
        $this->assertDatabaseCount('users', 1);
    }
    
    public function test_user_can_login(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('password123')
        ]);
        
        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password123'
        ]);
        
        $response->assertRedirect('/home');
        $this->assertAuthenticatedAs($user);
    }
    
    public function test_login_fails_with_wrong_password(): void
    {
        $user = User::factory()->create([
            'password' => bcrypt('correct')
        ]);
        
        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong'
        ]);
        
        $response->assertSessionHasErrors();
        $this->assertGuest();
    }
    
    public function test_user_can_logout(): void
    {
        $user = User::factory()->create();
        
        $response = $this->actingAs($user)->post('/logout');
        
        $response->assertRedirect('/');
        $this->assertGuest();
    }
    
    public function test_protected_routes_require_authentication(): void
    {
        $response = $this->get('/dashboard');
        
        $response->assertRedirect('/login');
    }
    
    public function test_authenticated_users_can_access_protected_routes(): void
    {
        $user = User::factory()->create();
        
        $response = $this->actingAs($user)->get('/dashboard');
        
        $response->assertOk();
    }
}
```

</details>

### Задание 3: Тестирование API

Создайте тесты для REST API управления продуктами:

```php
// Требуемые тесты:
- GET /api/products - список продуктов
- GET /api/products/{id} - конкретный продукт
- POST /api/products - создание (требует авторизации)
- PUT /api/products/{id} - обновление
- DELETE /api/products/{id} - удаление
- Проверка структуры JSON
- Пагинация
- Фильтрация
```

<details>
<summary>Решение</summary>

```php
<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\User;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ProductApiTest extends TestCase
{
    use RefreshDatabase;
    
    public function test_can_get_products_list(): void
    {
        Product::factory()->count(5)->create();
        
        $response = $this->getJson('/api/products');
        
        $response->assertOk();
        $response->assertJsonCount(5, 'data');
        $response->assertJsonStructure([
            'data' => [
                '*' => ['id', 'name', 'price', 'description']
            ]
        ]);
    }
    
    public function test_can_get_single_product(): void
    {
        $product = Product::factory()->create([
            'name' => 'Test Product',
            'price' => 99.99
        ]);
        
        $response = $this->getJson("/api/products/{$product->id}");
        
        $response->assertOk();
        $response->assertJson([
            'data' => [
                'id' => $product->id,
                'name' => 'Test Product',
                'price' => 99.99
            ]
        ]);
    }
    
    public function test_returns_404_for_missing_product(): void
    {
        $response = $this->getJson('/api/products/999');
        
        $response->assertNotFound();
    }
    
    public function test_unauthenticated_user_cannot_create_product(): void
    {
        $response = $this->postJson('/api/products', [
            'name' => 'New Product',
            'price' => 50.00
        ]);
        
        $response->assertUnauthorized();
    }
    
    public function test_authenticated_user_can_create_product(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        
        $response = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/products', [
                'name' => 'New Product',
                'price' => 50.00,
                'description' => 'Product description'
            ]);
        
        $response->assertCreated();
        $response->assertJson([
            'data' => [
                'name' => 'New Product',
                'price' => 50.00
            ]
        ]);
        
        $this->assertDatabaseHas('products', [
            'name' => 'New Product'
        ]);
    }
    
    public function test_can_update_product(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $product = Product::factory()->create();
        
        $response = $this->withHeader('Authorization', "Bearer $token")
            ->putJson("/api/products/{$product->id}", [
                'name' => 'Updated Name',
                'price' => $product->price,
                'description' => $product->description
            ]);
        
        $response->assertOk();
        $product->refresh();
        $this->assertEquals('Updated Name', $product->name);
    }
    
    public function test_can_delete_product(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $product = Product::factory()->create();
        
        $response = $this->withHeader('Authorization', "Bearer $token")
            ->deleteJson("/api/products/{$product->id}");
        
        $response->assertNoContent();
        $this->assertModelMissing($product);
    }
    
    public function test_products_are_paginated(): void
    {
        Product::factory()->count(30)->create();
        
        $response = $this->getJson('/api/products?per_page=10');
        
        $response->assertOk();
        $response->assertJsonCount(10, 'data');
        $response->assertJsonStructure([
            'data',
            'meta' => ['total', 'per_page', 'current_page', 'last_page']
        ]);
    }
    
    public function test_can_filter_products_by_price(): void
    {
        Product::factory()->create(['price' => 10.00]);
        Product::factory()->create(['price' => 50.00]);
        Product::factory()->create(['price' => 100.00]);
        
        $response = $this->getJson('/api/products?min_price=40&max_price=60');
        
        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.price', 50.00);
    }
}
```

</details>

---

## Чек-лист для feature-тестов

✅ **Покрытие функциональности:**
- [ ] Все CRUD операции протестированы
- [ ] Happy path и edge cases покрыты
- [ ] Валидация проверена на всех формах
- [ ] Авторизация и права доступа протестированы

✅ **База данных:**
- [ ] Используется `RefreshDatabase`
- [ ] Проверяется наличие/отсутствие записей
- [ ] Тестируются связи между моделями
- [ ] Проверяются транзакции (если есть)

✅ **HTTP:**
- [ ] Проверяются статус-коды
- [ ] Тестируются редиректы
- [ ] JSON структура валидна (для API)
- [ ] Заголовки проверены (Content-Type, Authorization)

✅ **Безопасность:**
- [ ] Гости не могут получить доступ к защищённым маршрутам
- [ ] Пользователи не могут редактировать чужие данные
- [ ] XSS и CSRF защита (если применимо)
- [ ] Загрузка файлов валидируется

✅ **Качество кода:**
- [ ] Тесты независимы друг от друга
- [ ] Используются factories для создания данных
- [ ] Нет дублирования кода (используются setUp и helper методы)
- [ ] Названия тестов понятны и описательны

---

## Заключение

Feature-тесты — это ваша страховка от регрессий. Они проверяют приложение так, как его использует реальный пользователь.

**Что вы теперь умеете:**
- ✅ Тестировать HTTP-запросы всех типов
- ✅ Проверять работу с базой данных
- ✅ Тестировать аутентификацию и авторизацию
- ✅ Писать тесты для API
- ✅ Использовать фабрики и faker для данных
- ✅ Тестировать валидацию, события, файлы

**Следующий шаг:** Глава 11.4 — TDD на практике. Научимся писать тесты ПЕРЕД кодом!