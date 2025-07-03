// Импорт необходимых модулей
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const db = require('../models/database');

// Создание транспортера для отправки email
// Конфигурация берется из переменных окружения
const createTransporter = () => {
    return nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true для 465, false для других портов
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false // Для локальной разработки
        }
    });
};

// Функция валидации email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Функция для очистки и валидации входных данных
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

// POST / - Принять и обработать контактную заявку
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        
        // Получаем IP адрес и User-Agent
        const ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const user_agent = req.headers['user-agent'];
        
        // Валидация обязательных полей
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                error: 'Имя, email и сообщение обязательны для заполнения'
            });
        }
        
        // Валидация email
        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный формат email адреса'
            });
        }
        
        // Очистка входных данных
        const cleanData = {
            name: sanitizeInput(name),
            email: sanitizeInput(email),
            phone: sanitizeInput(phone || ''),
            subject: sanitizeInput(subject || 'Заявка с сайта'),
            message: sanitizeInput(message)
        };
        
        // Дополнительная валидация длины
        if (cleanData.name.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Имя слишком длинное (максимум 100 символов)'
            });
        }
        
        if (cleanData.message.length > 5000) {
            return res.status(400).json({
                success: false,
                error: 'Сообщение слишком длинное (максимум 5000 символов)'
            });
        }
        
        // Сохранение заявки в базу данных
        const query = `
            INSERT INTO contact_requests (name, email, phone, subject, message, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        
        const values = [
            cleanData.name,
            cleanData.email,
            cleanData.phone,
            cleanData.subject,
            cleanData.message,
            ip_address,
            user_agent
        ];
        
        const result = await db.query(query, values);
        const savedRequest = result.rows[0];
        
        // Отправка email администратору
        if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.ADMIN_EMAIL) {
            try {
                const transporter = createTransporter();
                
                // Проверка конфигурации транспортера
                await transporter.verify();
                
                // Формирование HTML письма
                const htmlContent = `
                    <h2>Новая заявка с сайта AIronLab</h2>
                    <hr>
                    <p><strong>Имя:</strong> ${cleanData.name}</p>
                    <p><strong>Email:</strong> ${cleanData.email}</p>
                    <p><strong>Телефон:</strong> ${cleanData.phone || 'Не указан'}</p>
                    <p><strong>Тема:</strong> ${cleanData.subject}</p>
                    <hr>
                    <p><strong>Сообщение:</strong></p>
                    <p>${cleanData.message.replace(/\n/g, '<br>')}</p>
                    <hr>
                    <p><small>ID заявки: ${savedRequest.id}</small></p>
                    <p><small>Дата: ${new Date(savedRequest.created_at).toLocaleString('ru-RU')}</small></p>
                    <p><small>IP: ${ip_address}</small></p>
                `;
                
                // Отправка письма
                await transporter.sendMail({
                    from: `"AIronLab Website" <${process.env.SMTP_USER}>`,
                    to: process.env.ADMIN_EMAIL,
                    subject: `Новая заявка: ${cleanData.subject}`,
                    text: `Новая заявка от ${cleanData.name} (${cleanData.email}): ${cleanData.message}`,
                    html: htmlContent
                });
                
                console.log('Email успешно отправлен администратору');
                
                // Отправка подтверждения отправителю
                if (process.env.SEND_CONFIRMATION === 'true') {
                    const confirmationHtml = `
                        <h2>Спасибо за обращение!</h2>
                        <p>Мы получили вашу заявку и свяжемся с вами в ближайшее время.</p>
                        <hr>
                        <p><strong>Ваше сообщение:</strong></p>
                        <p>${cleanData.message.replace(/\n/g, '<br>')}</p>
                        <hr>
                        <p>С уважением,<br>Команда AIronLab</p>
                    `;
                    
                    await transporter.sendMail({
                        from: `"AIronLab" <${process.env.SMTP_USER}>`,
                        to: cleanData.email,
                        subject: 'Подтверждение получения заявки - AIronLab',
                        html: confirmationHtml
                    });
                }
                
            } catch (emailError) {
                console.error('Ошибка при отправке email:', emailError);
                // Не прерываем процесс, так как заявка уже сохранена в БД
            }
        } else {
            console.log('Email не отправлен: отсутствуют настройки SMTP');
        }
        
        // Отправка успешного ответа
        res.status(201).json({
            success: true,
            message: 'Заявка успешно отправлена. Мы свяжемся с вами в ближайшее время.',
            data: {
                id: savedRequest.id,
                created_at: savedRequest.created_at
            }
        });
        
    } catch (error) {
        console.error('Ошибка при обработке заявки:', error);
        res.status(500).json({
            success: false,
            error: 'Произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже.'
        });
    }
});

// GET / - Получить все заявки (для админки)
router.get('/', async (req, res) => {
    try {
        // Параметры для фильтрации и пагинации
        const { 
            status = 'all', 
            limit = 20, 
            offset = 0, 
            sort = 'created_at', 
            order = 'DESC',
            search = ''
        } = req.query;
        
        // Базовый запрос
        let query = 'SELECT * FROM contact_requests';
        const params = [];
        const conditions = [];
        let paramIndex = 1;
        
        // Фильтр по статусу
        if (status !== 'all') {
            conditions.push(`status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }
        
        // Поиск по email или имени
        if (search) {
            conditions.push(`(email ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        // Добавляем условия к запросу
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        // Добавляем сортировку
        const allowedSortFields = ['created_at', 'name', 'email', 'status'];
        const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortField} ${sortOrder}`;
        
        // Добавляем пагинацию
        query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        
        // Выполняем запрос
        const result = await db.query(query, params);
        
        // Получаем общее количество записей
        let countQuery = 'SELECT COUNT(*) FROM contact_requests';
        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }
        const countResult = await db.query(countQuery, params);
        const totalCount = parseInt(countResult.rows[0].count);
        
        // Статистика по статусам
        const statsQuery = `
            SELECT 
                status, 
                COUNT(*) as count 
            FROM contact_requests 
            GROUP BY status
        `;
        const statsResult = await db.query(statsQuery);
        const statistics = statsResult.rows.reduce((acc, row) => {
            acc[row.status] = parseInt(row.count);
            return acc;
        }, {});
        
        // Отправляем ответ
        res.json({
            success: true,
            data: result.rows,
            meta: {
                total: totalCount,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < totalCount
            },
            statistics
        });
        
    } catch (error) {
        console.error('Ошибка при получении заявок:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении списка заявок'
        });
    }
});

// PATCH /:id/status - Обновить статус заявки
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Валидация статуса
        const allowedStatuses = ['new', 'processing', 'completed', 'cancelled'];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Недопустимый статус. Разрешены: ' + allowedStatuses.join(', ')
            });
        }
        
        // Обновление статуса
        const query = `
            UPDATE contact_requests 
            SET status = $1 
            WHERE id = $2 
            RETURNING *
        `;
        
        const result = await db.query(query, [status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Заявка не найдена'
            });
        }
        
        res.json({
            success: true,
            message: 'Статус заявки обновлен',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Ошибка при обновлении статуса:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при обновлении статуса заявки'
        });
    }
});

// DELETE /:id - Удалить заявку
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = 'DELETE FROM contact_requests WHERE id = $1 RETURNING *';
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Заявка не найдена'
            });
        }
        
        res.json({
            success: true,
            message: 'Заявка удалена',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Ошибка при удалении заявки:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при удалении заявки'
        });
    }
});

// Экспорт роутера
module.exports = router; 