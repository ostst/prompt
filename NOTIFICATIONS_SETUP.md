# Настройка Push-уведомлений через Telegram бота

## Архитектура решения

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Telegram       │────▶│  Backend        │────▶│  База данных    │
│  Web App        │     │  (Node.js)      │     │  (MongoDB/PG)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Telegram Bot   │
                        │  API            │
                        └─────────────────┘
```

## Шаг 1: Создание Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/newbot`
3. Укажите имя бота (например, `PSB Academy Notifications`)
4. Получите **BOT_TOKEN** (сохраните его!)

## Шаг 2: Настройка Backend (Node.js)

### Установка зависимостей

```bash
npm init -y
npm install express node-telegram-bot-api node-cron mongoose dotenv
```

### Структура проекта

```
backend/
├── server.js           # Основной сервер
├── bot.js              # Telegram бот
├── scheduler.js        # Планировщик уведомлений
├── models/
│   └── Subscription.js # Модель подписки
├── .env                # Переменные окружения
└── package.json
```

### Файл `.env`

```env
BOT_TOKEN=your_telegram_bot_token_here
MONGODB_URI=mongodb://localhost:27017/psb_notifications
PORT=3000
```

### Файл `models/Subscription.js`

```javascript
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    telegramUserId: { type: Number, required: true },
    chatId: { type: Number, required: true },
    eventId: { type: String, required: true },
    eventTitle: { type: String, required: true },
    eventDate: { type: Date, required: true },
    reminderTime: { type: Date, required: true }, // За 15 минут до события
    notified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
```

### Файл `server.js`

```javascript
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Subscription = require('./models/Subscription');

const app = express();
app.use(cors());
app.use(express.json());

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI);

// API для создания подписки на напоминание
app.post('/api/subscribe', async (req, res) => {
    try {
        const { telegramUserId, chatId, eventId, eventTitle, eventDate } = req.body;
        
        // Время напоминания - за 15 минут до события
        const reminderTime = new Date(new Date(eventDate).getTime() - 15 * 60 * 1000);
        
        // Проверяем, не подписан ли уже
        const existing = await Subscription.findOne({ telegramUserId, eventId });
        if (existing) {
            return res.json({ success: true, message: 'Уже подписан' });
        }
        
        const subscription = new Subscription({
            telegramUserId,
            chatId,
            eventId,
            eventTitle,
            eventDate: new Date(eventDate),
            reminderTime
        });
        
        await subscription.save();
        res.json({ success: true, message: 'Напоминание установлено!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API для отмены подписки
app.delete('/api/subscribe/:telegramUserId/:eventId', async (req, res) => {
    try {
        const { telegramUserId, eventId } = req.params;
        await Subscription.deleteOne({ telegramUserId, eventId });
        res.json({ success: true, message: 'Напоминание отменено' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});
```

### Файл `bot.js`

```javascript
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Команда /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 
        '👋 Привет! Я бот программы "Промпт-инженер".\n\n' +
        'Я буду напоминать вам о предстоящих вебинарах за 15 минут до начала.\n\n' +
        '📱 Откройте приложение и подпишитесь на напоминания!'
    );
});

// Функция отправки уведомления
async function sendReminder(chatId, eventTitle, eventDate) {
    const formattedDate = new Date(eventDate).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    await bot.sendMessage(chatId,
        `🔔 *Напоминание!*\n\n` +
        `📚 ${eventTitle}\n` +
        `🕐 Начало через 15 минут (${formattedDate})\n\n` +
        `Не пропустите!`,
        { parse_mode: 'Markdown' }
    );
}

module.exports = { bot, sendReminder };
```

### Файл `scheduler.js`

```javascript
require('dotenv').config();
const cron = require('node-cron');
const mongoose = require('mongoose');
const Subscription = require('./models/Subscription');
const { sendReminder } = require('./bot');

mongoose.connect(process.env.MONGODB_URI);

// Проверяем каждую минуту
cron.schedule('* * * * *', async () => {
    const now = new Date();
    
    // Находим подписки, которые нужно отправить
    const subscriptions = await Subscription.find({
        reminderTime: { $lte: now },
        notified: false
    });
    
    for (const sub of subscriptions) {
        try {
            await sendReminder(sub.chatId, sub.eventTitle, sub.eventDate);
            sub.notified = true;
            await sub.save();
            console.log(`Напоминание отправлено: ${sub.eventTitle}`);
        } catch (error) {
            console.error(`Ошибка отправки: ${error.message}`);
        }
    }
});

console.log('Scheduler started');
```

## Шаг 3: Обновление Web App

Добавьте в `index.html` функцию подписки:

```javascript
// Подписка на напоминание
async function subscribeToReminder(eventId, eventTitle, eventDate) {
    if (!window.Telegram?.WebApp?.initDataUnsafe?.user) {
        alert('Откройте приложение через Telegram');
        return;
    }
    
    const user = window.Telegram.WebApp.initDataUnsafe.user;
    
    try {
        const response = await fetch('https://your-backend.com/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegramUserId: user.id,
                chatId: user.id, // Для личных сообщений chatId = userId
                eventId,
                eventTitle,
                eventDate
            })
        });
        
        const data = await response.json();
        if (data.success) {
            Telegram.WebApp.showAlert('✅ Напоминание установлено!');
        }
    } catch (error) {
        Telegram.WebApp.showAlert('Ошибка: ' + error.message);
    }
}
```

## Шаг 4: Развёртывание

### Варианты хостинга:

| Платформа | Бесплатный план | Особенности |
|-----------|-----------------|-------------|
| **Railway** | $5/месяц кредит | Простое развёртывание |
| **Render** | Да | Автосон через 15 мин |
| **Fly.io** | Да | 3 машины бесплатно |
| **VPS** | От 200₽/мес | Полный контроль |

### Запуск на сервере

```bash
# Установка pm2 для управления процессами
npm install -g pm2

# Запуск сервера и планировщика
pm2 start server.js --name "api"
pm2 start scheduler.js --name "scheduler"
pm2 start bot.js --name "bot"

# Сохранение конфигурации
pm2 save
pm2 startup
```

## Шаг 5: Тестирование

1. Запустите бота и отправьте `/start`
2. Откройте Web App
3. Нажмите "Напомнить" на карточке вебинара
4. Дождитесь напоминания (или измените время для теста)

---

## Быстрый старт (без базы данных)

Если нужно простое решение без MongoDB, можно использовать файл JSON:

```javascript
// simple-scheduler.js
const fs = require('fs');
const cron = require('node-cron');
const { sendReminder } = require('./bot');

const SUBSCRIPTIONS_FILE = './subscriptions.json';

// Загрузка подписок
function loadSubscriptions() {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
        return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE));
    }
    return [];
}

// Сохранение подписок
function saveSubscriptions(subs) {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2));
}

// Проверка каждую минуту
cron.schedule('* * * * *', () => {
    const now = new Date();
    const subs = loadSubscriptions();
    
    subs.forEach(sub => {
        if (!sub.notified && new Date(sub.reminderTime) <= now) {
            sendReminder(sub.chatId, sub.eventTitle, sub.eventDate);
            sub.notified = true;
        }
    });
    
    saveSubscriptions(subs);
});
```

---

## Контакты для помощи

Если нужна помощь с настройкой backend — свяжитесь с разработчиком.
