// Импорт необходимых модулей
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Загрузка переменных окружения из .env файла
dotenv.config();

// Импорт маршрутов
const postsRoutes = require('./routes/posts');
const contactRoutes = require('./routes/contact');

// Создание Express приложения
const app = express();

// Порт из переменных окружения или 3000 по умолчанию
const PORT = process.env.PORT || 3000;

// Middleware для обработки CORS
// Позволяет фронтенду делать запросы к API
app.use(cors());

// Middleware для парсинга JSON в теле запросов
app.use(express.json());

// Middleware для парсинга URL-encoded данных
app.use(express.urlencoded({ extended: true }));

// Логирование запросов (простое middleware)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Подключение маршрутов
// Все маршруты для постов будут начинаться с /api/posts
app.use('/api/posts', postsRoutes);

// Все маршруты для контактных форм будут начинаться с /api/contact
app.use('/api/contact', contactRoutes);

// Базовый маршрут для проверки работы сервера
app.get('/', (req, res) => {
    res.json({ 
        message: 'AIronLab Blog API', 
        version: '1.0.0',
        endpoints: {
            posts: '/api/posts',
            contact: '/api/contact'
        }
    });
});

// Обработка несуществующих маршрутов (404)
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Маршрут не найден',
        requestedUrl: req.url 
    });
});

// Глобальная обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err.stack);
    res.status(err.status || 500).json({ 
        error: err.message || 'Внутренняя ошибка сервера',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Режим: ${process.env.NODE_ENV || 'development'}`);
}); 