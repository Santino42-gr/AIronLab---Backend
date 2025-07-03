const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const AdminJSSequelize = require('@adminjs/sequelize');
const { sequelize, Post, ContactRequest } = require('../models/sequelize');

// Регистрируем адаптер Sequelize
AdminJS.registerAdapter({
  Resource: AdminJSSequelize.Resource,
  Database: AdminJSSequelize.Database,
});

// Конфигурация AdminJS
const adminOptions = {
  rootPath: '/admin',
  branding: {
    companyName: 'AIronLab Admin',
    logo: false,
    softwareBrothers: false,
    theme: {
      colors: {
        primary100: '#3b82f6',
        primary80: '#1d4ed8',
        primary60: '#1e40af',
        primary40: '#1e3a8a',
        primary20: '#1e293b',
      }
    }
  },
  locale: {
    language: 'en',
    translations: {
      labels: {
        Posts: 'Статьи блога',
        ContactRequests: 'Заявки с сайта',
      },
      properties: {
        // Для статей
        id: 'ID',
        title: 'Заголовок',
        slug: 'URL (slug)',
        content: 'Содержание',
        excerpt: 'Краткое описание',
        author: 'Автор',
        featured_image: 'Изображение',
        status: 'Статус',
        published_at: 'Дата публикации',
        created_at: 'Дата создания',
        updated_at: 'Дата обновления',
        
        // Для заявок
        name: 'Имя',
        email: 'Email',
        subject: 'Тема',
        message: 'Сообщение',
        admin_notes: 'Заметки админа',
      },
      buttons: {
        save: 'Сохранить',
        cancel: 'Отмена',
        delete: 'Удалить',
        edit: 'Редактировать',
        show: 'Просмотр',
        create: 'Создать',
        filter: 'Фильтр',
        resetFilter: 'Сбросить фильтр',
      },
      messages: {
        successfullyCreated: 'Запись успешно создана',
        successfullyUpdated: 'Запись успешно обновлена',
        successfullyDeleted: 'Запись успешно удалена',
      }
    }
  },
  resources: [
    {
      resource: Post,
      options: {
        navigation: {
          name: 'Контент',
          icon: 'Edit'
        },
        listProperties: ['id', 'title', 'author', 'status', 'created_at'],
        showProperties: ['id', 'title', 'slug', 'content', 'excerpt', 'author', 'status', 'published_at', 'created_at', 'updated_at'],
        editProperties: ['title', 'content', 'excerpt', 'author', 'status'],
        filterProperties: ['title', 'author', 'status', 'created_at'],
        properties: {
          id: {
            isVisible: { list: true, filter: true, show: true, edit: false }
          },
          title: {
            isTitle: true,
            isRequired: true,
            type: 'string'
          },
          slug: {
            isVisible: { list: false, filter: false, show: true, edit: false }
          },
          content: {
            type: 'textarea',
            props: {
              rows: 10
            }
          },
          excerpt: {
            type: 'textarea',
            props: {
              rows: 3
            }
          },
          author: {
            isRequired: true
          },
          status: {
            availableValues: [
              { value: 'draft', label: 'Черновик' },
              { value: 'published', label: 'Опубликована' },
              { value: 'archived', label: 'В архиве' }
            ]
          },
          created_at: {
            isVisible: { list: true, filter: true, show: true, edit: false }
          },
          updated_at: {
            isVisible: { list: false, filter: false, show: true, edit: false }
          },
          published_at: {
            isVisible: { list: false, filter: false, show: true, edit: false }
          }
        }
      }
    },
    {
      resource: ContactRequest,
      options: {
        navigation: {
          name: 'Заявки',
          icon: 'Mail'
        },
        listProperties: ['id', 'name', 'email', 'subject', 'status', 'created_at'],
        showProperties: ['id', 'name', 'email', 'subject', 'message', 'status', 'admin_notes', 'created_at'],
        editProperties: ['status', 'admin_notes'],
        filterProperties: ['name', 'email', 'status', 'created_at'],
        properties: {
          id: {
            isVisible: { list: true, filter: true, show: true, edit: false }
          },
          name: {
            isTitle: true,
            isVisible: { list: true, filter: true, show: true, edit: false }
          },
          email: {
            isVisible: { list: true, filter: true, show: true, edit: false }
          },
          subject: {
            isVisible: { list: true, filter: false, show: true, edit: false }
          },
          message: {
            type: 'textarea',
            isVisible: { list: false, filter: false, show: true, edit: false },
            props: {
              rows: 4
            }
          },
          status: {
            availableValues: [
              { value: 'new', label: 'Новая' },
              { value: 'in_progress', label: 'В работе' },
              { value: 'completed', label: 'Завершена' },
              { value: 'spam', label: 'Спам' }
            ]
          },
          admin_notes: {
            type: 'textarea',
            props: {
              rows: 3
            }
          },
          created_at: {
            isVisible: { list: true, filter: true, show: true, edit: false }
          }
        },
        actions: {
          new: {
            isVisible: false // Заявки создаются только через сайт
          }
        }
      }
    }
  ]
};

// Создаем экземпляр AdminJS
const admin = new AdminJS(adminOptions);

// Создаем роутер с базовой аутентификацией
const adminRouter = AdminJSExpress.buildAuthenticatedRouter(admin, {
  authenticate: async (email, password) => {
    // Простая проверка логина
    const validEmail = process.env.ADMIN_EMAIL || 'admin@aironlab.com';
    const validPassword = process.env.ADMIN_PASSWORD || 'secure_password_123';
    
    if (email === validEmail && password === validPassword) {
      return { email: email, role: 'admin' };
    }
    return null;
  },
  cookieName: 'adminjs',
  cookiePassword: process.env.COOKIE_SECRET || 'super-secret-password-change-in-production',
});

module.exports = {
  admin,
  adminRouter
};