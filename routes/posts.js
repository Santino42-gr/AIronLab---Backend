// Импорт необходимых модулей
const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Функция для создания slug из заголовка
function createSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Удаляем специальные символы
        .replace(/\s+/g, '-') // Заменяем пробелы на дефисы
        .replace(/--+/g, '-') // Заменяем множественные дефисы на один
        .trim();
}

// GET / - Получить все статьи
router.get('/', async (req, res) => {
    try {
        // Получаем параметры из query string
        const { status = 'published', limit = 10, offset = 0, sort = 'created_at', order = 'DESC' } = req.query;
        
        // Формируем SQL запрос с фильтрацией и пагинацией
        let query = 'SELECT * FROM posts';
        const params = [];
        
        // Добавляем фильтр по статусу
        if (status !== 'all') {
            query += ' WHERE status = $1';
            params.push(status);
        }
        
        // Добавляем сортировку
        const allowedSortFields = ['created_at', 'published_at', 'title', 'updated_at'];
        const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortField} ${sortOrder}`;
        
        // Добавляем лимит и смещение для пагинации
        query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        
        // Выполняем запрос
        const result = await db.query(query, params);
        
        // Получаем общее количество записей для пагинации
        let countQuery = 'SELECT COUNT(*) FROM posts';
        if (status !== 'all') {
            countQuery += ' WHERE status = $1';
        }
        const countResult = await db.query(countQuery, status !== 'all' ? [status] : []);
        const totalCount = parseInt(countResult.rows[0].count);
        
        // Отправляем ответ с метаданными для пагинации
        res.json({
            success: true,
            data: result.rows,
            meta: {
                total: totalCount,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < totalCount
            }
        });
    } catch (error) {
        console.error('Ошибка при получении постов:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при получении статей' 
        });
    }
});

// GET /:id - Получить конкретную статью по ID или slug
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let query;
        let params;
        
        // Проверяем, является ли параметр числом (ID) или строкой (slug)
        if (!isNaN(id)) {
            query = 'SELECT * FROM posts WHERE id = $1';
            params = [id];
        } else {
            query = 'SELECT * FROM posts WHERE slug = $1';
            params = [id];
        }
        
        const result = await db.query(query, params);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Статья не найдена' 
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Ошибка при получении поста:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при получении статьи' 
        });
    }
});

// POST / - Создать новую статью
router.post('/', async (req, res) => {
    try {
        const { 
            title, 
            content, 
            excerpt, 
            author = 'Admin', 
            featured_image, 
            status = 'draft' 
        } = req.body;
        
        // Валидация обязательных полей
        if (!title || !content) {
            return res.status(400).json({ 
                success: false,
                error: 'Заголовок и содержание обязательны' 
            });
        }
        
        // Создаем slug из заголовка
        let slug = createSlug(title);
        
        // Проверяем уникальность slug
        const slugCheck = await db.query('SELECT id FROM posts WHERE slug = $1', [slug]);
        if (slugCheck.rows.length > 0) {
            // Если slug уже существует, добавляем timestamp
            slug = `${slug}-${Date.now()}`;
        }
        
        // Определяем дату публикации
        const published_at = status === 'published' ? new Date() : null;
        
        // Вставляем новую статью
        const query = `
            INSERT INTO posts (title, slug, content, excerpt, author, featured_image, status, published_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        
        const values = [title, slug, content, excerpt, author, featured_image, status, published_at];
        const result = await db.query(query, values);
        
        res.status(201).json({
            success: true,
            message: 'Статья успешно создана',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Ошибка при создании поста:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при создании статьи' 
        });
    }
});

// PUT /:id - Обновить статью
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            title, 
            content, 
            excerpt, 
            author, 
            featured_image, 
            status 
        } = req.body;
        
        // Сначала проверяем, существует ли статья
        const checkQuery = 'SELECT * FROM posts WHERE id = $1';
        const checkResult = await db.query(checkQuery, [id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Статья не найдена' 
            });
        }
        
        const currentPost = checkResult.rows[0];
        
        // Строим динамический запрос обновления
        const updates = [];
        const values = [];
        let valueIndex = 1;
        
        // Добавляем только те поля, которые были переданы
        if (title !== undefined) {
            updates.push(`title = $${valueIndex}`);
            values.push(title);
            valueIndex++;
            
            // Если изменился заголовок, обновляем slug
            if (title !== currentPost.title) {
                let newSlug = createSlug(title);
                const slugCheck = await db.query('SELECT id FROM posts WHERE slug = $1 AND id != $2', [newSlug, id]);
                if (slugCheck.rows.length > 0) {
                    newSlug = `${newSlug}-${Date.now()}`;
                }
                updates.push(`slug = $${valueIndex}`);
                values.push(newSlug);
                valueIndex++;
            }
        }
        
        if (content !== undefined) {
            updates.push(`content = $${valueIndex}`);
            values.push(content);
            valueIndex++;
        }
        
        if (excerpt !== undefined) {
            updates.push(`excerpt = $${valueIndex}`);
            values.push(excerpt);
            valueIndex++;
        }
        
        if (author !== undefined) {
            updates.push(`author = $${valueIndex}`);
            values.push(author);
            valueIndex++;
        }
        
        if (featured_image !== undefined) {
            updates.push(`featured_image = $${valueIndex}`);
            values.push(featured_image);
            valueIndex++;
        }
        
        if (status !== undefined) {
            updates.push(`status = $${valueIndex}`);
            values.push(status);
            valueIndex++;
            
            // Если статус меняется на published, устанавливаем дату публикации
            if (status === 'published' && currentPost.status !== 'published') {
                updates.push(`published_at = $${valueIndex}`);
                values.push(new Date());
                valueIndex++;
            }
        }
        
        // Если нет изменений
        if (updates.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Нет данных для обновления' 
            });
        }
        
        // Добавляем ID в конец массива значений
        values.push(id);
        
        // Выполняем обновление
        const updateQuery = `
            UPDATE posts 
            SET ${updates.join(', ')}
            WHERE id = $${valueIndex}
            RETURNING *
        `;
        
        const result = await db.query(updateQuery, values);
        
        res.json({
            success: true,
            message: 'Статья успешно обновлена',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Ошибка при обновлении поста:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при обновлении статьи' 
        });
    }
});

// DELETE /:id - Удалить статью
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем, существует ли статья
        const checkQuery = 'SELECT * FROM posts WHERE id = $1';
        const checkResult = await db.query(checkQuery, [id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Статья не найдена' 
            });
        }
        
        // Удаляем статью
        const deleteQuery = 'DELETE FROM posts WHERE id = $1 RETURNING *';
        const result = await db.query(deleteQuery, [id]);
        
        res.json({
            success: true,
            message: 'Статья успешно удалена',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Ошибка при удалении поста:', error);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при удалении статьи' 
        });
    }
});

// Экспорт роутера
module.exports = router; 