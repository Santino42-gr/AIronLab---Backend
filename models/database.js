// Импорт модуля pg для работы с PostgreSQL
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Загрузка переменных окружения
dotenv.config();

// Создание пула соединений с PostgreSQL
// Pool эффективнее одиночных соединений для веб-приложений
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'aironlab_blog',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    // Максимальное количество клиентов в пуле
    max: 20,
    // Время ожидания перед закрытием неиспользуемого соединения
    idleTimeoutMillis: 30000,
    // Время ожидания при попытке подключения
    connectionTimeoutMillis: 2000,
});

// Функция для создания таблиц в базе данных
async function createTables() {
    try {
        // Создание таблицы постов блога
        await pool.query(`
            CREATE TABLE IF NOT EXISTS posts (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                content TEXT NOT NULL,
                excerpt TEXT,
                author VARCHAR(100) DEFAULT 'Admin',
                featured_image VARCHAR(500),
                status VARCHAR(20) DEFAULT 'draft',
                published_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Таблица posts создана или уже существует');

        // Создание таблицы заявок с контактной формы
        await pool.query(`
            CREATE TABLE IF NOT EXISTS contact_requests (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                subject VARCHAR(255),
                message TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'new',
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Таблица contact_requests создана или уже существует');

        // Создание индексов для оптимизации запросов
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
            CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
            CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at);
            CREATE INDEX IF NOT EXISTS idx_contact_requests_email ON contact_requests(email);
            CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON contact_requests(status);
        `);
        console.log('Индексы созданы');

        // Создание триггера для автоматического обновления updated_at
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

        // Применение триггера к таблице posts
        await pool.query(`
            DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
            CREATE TRIGGER update_posts_updated_at 
            BEFORE UPDATE ON posts 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        `);
        console.log('Триггер для обновления updated_at создан');

    } catch (error) {
        console.error('Ошибка при создании таблиц:', error);
        throw error;
    }
}

// Проверка подключения к базе данных
async function checkConnection() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('Подключение к PostgreSQL успешно:', result.rows[0].now);
        client.release();
        return true;
    } catch (error) {
        console.error('Ошибка подключения к PostgreSQL:', error.message);
        return false;
    }
}

// Инициализация базы данных при запуске
(async () => {
    const isConnected = await checkConnection();
    if (isConnected) {
        await createTables();
    }
})();

// Экспорт пула для использования в других модулях
module.exports = {
    pool,
    // Вспомогательная функция для выполнения запросов
    query: (text, params) => pool.query(text, params),
    // Функция для получения клиента из пула (для транзакций)
    getClient: () => pool.connect()
}; 