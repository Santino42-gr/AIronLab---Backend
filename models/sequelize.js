const { Sequelize, DataTypes } = require('sequelize');

// Создаем подключение к базе данных
const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'aironlab_blog',
  username: process.env.DB_USER || 'sasha',
  password: process.env.DB_PASSWORD || '',
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: false,
    underscored: true,
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Модель для статей блога
const Post = sequelize.define('Post', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  slug: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  excerpt: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  author: {
    type: DataTypes.STRING(100),
    defaultValue: 'Admin'
  },
  featured_image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    defaultValue: 'draft'
  },
  published_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
}, {
  tableName: 'posts',
  timestamps: false,
  hooks: {
    beforeCreate: (post) => {
      // Автоматически создаем slug из заголовка
      if (!post.slug && post.title) {
        post.slug = createSlug(post.title);
      }
      
      // Устанавливаем дату публикации для опубликованных статей
      if (post.status === 'published' && !post.published_at) {
        post.published_at = new Date();
      }
      
      post.created_at = new Date();
      post.updated_at = new Date();
    },
    beforeUpdate: (post) => {
      post.updated_at = new Date();
      
      // Обновляем slug при изменении заголовка
      if (post.changed('title') && post.title) {
        post.slug = createSlug(post.title);
      }
      
      // Обновляем дату публикации при смене статуса на published
      if (post.changed('status') && post.status === 'published' && !post.published_at) {
        post.published_at = new Date();
      }
    }
  }
});

// Модель для заявок с сайта
const ContactRequest = sequelize.define('ContactRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  subject: {
    type: DataTypes.STRING(255),
    defaultValue: 'Заявка с сайта'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  status: {
    type: DataTypes.ENUM('new', 'in_progress', 'completed', 'spam'),
    defaultValue: 'new'
  },
  admin_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
}, {
  tableName: 'contact_requests',
  timestamps: false,
  hooks: {
    beforeCreate: (request) => {
      request.created_at = new Date();
    }
  }
});

// Функция для создания slug
function createSlug(title) {
  const translit = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  
  return title
    .toLowerCase()
    .replace(/[а-яё]/g, (char) => translit[char] || char)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

// Инициализация подключения
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Подключение к PostgreSQL через Sequelize успешно');
    
    // Синхронизация моделей с базой данных (без пересоздания таблиц)
    await sequelize.sync({ alter: false, force: false });
    console.log('✅ Модели Sequelize синхронизированы');
    
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error);
  }
}

// НЕ запускаем автоматически - будем вызывать из server.js

// Экспортируем модели и подключение
module.exports = {
  sequelize,
  Post,
  ContactRequest,
  initializeDatabase
};