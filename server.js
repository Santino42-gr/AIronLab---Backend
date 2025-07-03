const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Функция для инициализации AdminJS
async function initializeAdminJS() {
  try {
    // Инициализируем базу данных сначала
    const { initializeDatabase } = require('./models/sequelize');
    await initializeDatabase();
    
    // Затем подключаем AdminJS
    const { admin, adminRouter } = require('./admin/admin');
    app.use(admin.options.rootPath, adminRouter);
    console.log(`📊 AdminJS успешно подключен: http://localhost:${PORT}${admin.options.rootPath}`);
    
    return true;
  } catch (error) {
    console.error('❌ Ошибка инициализации AdminJS:', error.message);
    console.log('⚠️  Сервер продолжит работу без AdminJS');
    return false;
  }
}

// Подключаем API маршруты
const postsRoutes = require('./routes/posts');
const contactRoutes = require('./routes/contact');

app.use('/api/posts', postsRoutes);
app.use('/api/contact', contactRoutes);

// Главная страница API
app.get('/', (req, res) => {
  res.json({
    message: 'AIronLab Blog API',
    version: '1.0.0',
    endpoints: {
      posts: '/api/posts',
      contact: '/api/contact',
      admin: '/admin'
    },
    documentation: {
      admin_panel: `${req.protocol}://${req.get('host')}/admin`,
      api_posts: `${req.protocol}://${req.get('host')}/api/posts`,
      api_contact: `${req.protocol}://${req.get('host')}/api/contact`
    }
  });
});

// Временная заглушка для админки (если AdminJS не загрузился)
app.get('/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Админка AIronLab</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 40px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #1f2937; margin-bottom: 20px; }
        .status { padding: 20px; border-radius: 6px; margin: 20px 0; }
        .loading { background: #fef3c7; color: #92400e; }
        .error { background: #fef2f2; color: #991b1b; }
        .success { background: #f0fdf4; color: #166534; }
        .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .btn:hover { background: #2563eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Админка AIronLab</h1>
        <div class="loading">
          <strong>Загрузка AdminJS...</strong><br>
          Если эта страница не перезагрузится автоматически, проверьте логи сервера.
        </div>
        
        <div style="margin-top: 30px;">
          <h3>Доступные действия:</h3>
          <a href="/api/posts" class="btn">Просмотр статей (API)</a><br>
          <a href="/api/contact" class="btn">Просмотр заявок (API)</a><br>
          <a href="/" class="btn">Главная страница API</a>
        </div>
        
        <div style="margin-top: 30px; font-size: 14px; color: #6b7280;">
          <strong>Если AdminJS не загружается:</strong><br>
          1. Проверьте логи сервера в терминале<br>
          2. Убедитесь что все зависимости установлены<br>
          3. Проверьте подключение к PostgreSQL
        </div>
      </div>
      
      <script>
        // Автоматическая перезагрузка каждые 5 секунд
        setTimeout(() => {
          location.reload();
        }, 5000);
      </script>
    </body>
    </html>
  `);
});

// Обработка ошибок
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error'
  });
});

// 404 обработчик
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Запуск сервера
async function startServer() {
  // Сначала запускаем сервер
  app.listen(PORT, async () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 API доступно: http://localhost:${PORT}/api`);
    console.log(`📝 Режим: ${process.env.NODE_ENV || 'development'}`);
    
    // Затем инициализируем AdminJS
    console.log('🔄 Инициализация AdminJS...');
    const adminInitialized = await initializeAdminJS();
    
    if (adminInitialized) {
      console.log(`✅ Все системы запущены успешно!`);
    } else {
      console.log(`⚠️  Сервер работает, но AdminJS недоступен`);
      console.log(`📊 Временная админка: http://localhost:${PORT}/admin`);
    }
  });
}

// Запускаем сервер
startServer().catch(error => {
  console.error('❌ Критическая ошибка запуска сервера:', error);
  process.exit(1);
});