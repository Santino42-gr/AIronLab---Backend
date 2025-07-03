# AIronLab Blog Backend

Backend API для блога AIronLab с поддержкой управления статьями и обработки контактных форм.

## Технологии

- **Node.js** - серверная платформа
- **Express.js** - веб-фреймворк
- **PostgreSQL** - база данных
- **Nodemailer** - отправка email
- **Cors** - обработка CORS запросов

## Требования

- Node.js >= 14.0.0
- PostgreSQL >= 12.0
- npm или yarn

## Установка

1. Клонируйте репозиторий:
```bash
git clone <url-репозитория>
cd aironlab-backend
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте базу данных PostgreSQL:
```sql
CREATE DATABASE aironlab_blog;
```

4. Скопируйте файл `.env` и настройте переменные окружения:
```bash
cp .env.example .env
```

5. Отредактируйте `.env` файл:
   - Укажите данные для подключения к PostgreSQL
   - Настройте SMTP для отправки email
   - Укажите email администратора

## Запуск

### Режим разработки (с автоперезагрузкой):
```bash
npm run dev
```

### Продакшн режим:
```bash
npm start
```

Сервер запустится на порту, указанном в `.env` (по умолчанию 3000).

## API Endpoints

### Базовый URL
```
http://localhost:3000/api
```

### Статьи блога (`/api/posts`)

#### Получить все статьи
```http
GET /api/posts?status=published&limit=10&offset=0&sort=created_at&order=DESC
```

Параметры запроса:
- `status` - фильтр по статусу (published, draft, all)
- `limit` - количество статей на странице
- `offset` - смещение для пагинации
- `sort` - поле для сортировки (created_at, published_at, title, updated_at)
- `order` - направление сортировки (ASC, DESC)

#### Получить статью по ID или slug
```http
GET /api/posts/:id
```

#### Создать новую статью
```http
POST /api/posts
Content-Type: application/json

{
  "title": "Заголовок статьи",
  "content": "Содержание статьи",
  "excerpt": "Краткое описание",
  "author": "Имя автора",
  "featured_image": "URL изображения",
  "status": "draft"
}
```

#### Обновить статью
```http
PUT /api/posts/:id
Content-Type: application/json

{
  "title": "Новый заголовок",
  "content": "Новое содержание",
  "status": "published"
}
```

#### Удалить статью
```http
DELETE /api/posts/:id
```

### Контактные заявки (`/api/contact`)

#### Отправить заявку
```http
POST /api/contact
Content-Type: application/json

{
  "name": "Имя",
  "email": "email@example.com",
  "phone": "+7 999 999-99-99",
  "subject": "Тема обращения",
  "message": "Текст сообщения"
}
```

#### Получить все заявки (для админки)
```http
GET /api/contact?status=new&limit=20&offset=0&search=
```

Параметры запроса:
- `status` - фильтр по статусу (new, processing, completed, cancelled, all)
- `limit` - количество заявок на странице
- `offset` - смещение для пагинации
- `search` - поиск по email или имени
- `sort` - поле для сортировки
- `order` - направление сортировки

#### Обновить статус заявки
```http
PATCH /api/contact/:id/status
Content-Type: application/json

{
  "status": "processing"
}
```

#### Удалить заявку
```http
DELETE /api/contact/:id
```

## Структура проекта

```
aironlab-backend/
├── node_modules/       # Зависимости
├── routes/            # Маршруты API
│   ├── posts.js       # Маршруты для статей
│   └── contact.js     # Маршруты для контактных форм
├── models/            # Модели данных
│   └── database.js    # Подключение к БД и инициализация
├── .env               # Переменные окружения (не в git)
├── .gitignore         # Игнорируемые файлы
├── package.json       # Конфигурация npm
├── server.js          # Главный файл сервера
└── README.md          # Этот файл
```

## База данных

При первом запуске автоматически создаются таблицы:

### Таблица `posts`
- `id` - уникальный идентификатор
- `title` - заголовок статьи
- `slug` - URL-совместимый идентификатор
- `content` - содержание статьи
- `excerpt` - краткое описание
- `author` - автор
- `featured_image` - главное изображение
- `status` - статус (draft, published)
- `published_at` - дата публикации
- `created_at` - дата создания
- `updated_at` - дата обновления

### Таблица `contact_requests`
- `id` - уникальный идентификатор
- `name` - имя отправителя
- `email` - email отправителя
- `phone` - телефон
- `subject` - тема обращения
- `message` - сообщение
- `status` - статус обработки
- `ip_address` - IP адрес отправителя
- `user_agent` - информация о браузере
- `created_at` - дата создания

## Безопасность

- Все входные данные валидируются и очищаются
- SQL-инъекции предотвращаются через параметризованные запросы
- XSS атаки блокируются через санитизацию HTML
- Поддерживается CORS для безопасных кросс-доменных запросов

## Отправка Email

Для работы отправки email необходимо:

1. Настроить SMTP в `.env` файле
2. Для Gmail: создать App Password (не используйте основной пароль)
3. Указать email администратора для получения уведомлений

## Разработка

### Добавление новых маршрутов

1. Создайте новый файл в папке `routes/`
2. Экспортируйте Express Router
3. Подключите маршрут в `server.js`

### Расширение базы данных

1. Добавьте SQL для создания таблиц в `models/database.js`
2. Перезапустите сервер для применения изменений

## Развертывание

Для продакшн развертывания:

1. Установите переменную окружения `NODE_ENV=production`
2. Используйте надежные пароли для БД
3. Настройте SSL/TLS для HTTPS
4. Используйте процесс-менеджер (PM2, Forever)
5. Настройте резервное копирование БД

## Лицензия

ISC

## Поддержка

При возникновении вопросов создайте issue в репозитории. 