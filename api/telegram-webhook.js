// Vercel Serverless Function для Telegram Webhook
// Этот файл обрабатывает сообщения от Telegram бота

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7973162709:AAHk2rqqfThPaxLO5dXORiu67l0QvZO7zhw';

// Простое хранилище подписчиков (в продакшене используйте базу данных)
// Vercel KV или Redis для хранения
let subscribers = [];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(200).json({ ok: true, message: 'Telegram Webhook is active' });
    }

    try {
        const update = req.body;
        
        // Обработка команды /start
        if (update.message?.text?.startsWith('/start')) {
            const chatId = update.message.chat.id;
            const user = update.message.from;
            
            // Отправляем приветственное сообщение
            await sendTelegramMessage(chatId, 
                `👋 Привет, ${user.first_name}!\n\n` +
                `Добро пожаловать в бот ПСБ Академии!\n\n` +
                `🔔 Теперь вы будете получать:\n` +
                `• Напоминания о вебинарах за 1 час\n` +
                `• Уведомления о новых материалах\n` +
                `• Важные обновления курса\n\n` +
                `📱 Откройте приложение: https://ostst.github.io/prompt/`
            );
            
            // Сохраняем подписчика (в реальном приложении - в базу данных)
            console.log(`New subscriber: ${chatId} - ${user.first_name} ${user.last_name || ''}`);
            
            // Отправляем уведомление владельцу о новом подписчике
            await notifyOwner(user, chatId);
            
            return res.status(200).json({ ok: true });
        }
        
        // Обработка команды /help
        if (update.message?.text === '/help') {
            const chatId = update.message.chat.id;
            
            await sendTelegramMessage(chatId,
                `📚 *Команды бота:*\n\n` +
                `/start - Подписаться на уведомления\n` +
                `/schedule - Расписание вебинаров\n` +
                `/help - Список команд\n\n` +
                `🌐 Приложение: https://ostst.github.io/prompt/`,
                { parse_mode: 'Markdown' }
            );
            
            return res.status(200).json({ ok: true });
        }
        
        // Обработка команды /schedule
        if (update.message?.text === '/schedule') {
            const chatId = update.message.chat.id;
            
            await sendTelegramMessage(chatId,
                `📅 *Расписание вебинаров:*\n\n` +
                `1️⃣ 27.01 в 12:00 - Введение в ИИ\n` +
                `2️⃣ 29.01 в 10:00 - Китайские ИИ-сервисы\n` +
                `3️⃣ 05.02 в 12:00 - Чат-боты и ИИ-агенты\n` +
                `4️⃣ 12.02 в 10:00 - Нейросети в дизайне\n` +
                `5️⃣ 19.02 в 10:00 - Генерация изображений\n` +
                `6️⃣ 26.02 в 10:00 - Анимация и видео\n` +
                `7️⃣ 05.03 в 10:00 - Обработка аудио\n` +
                `8️⃣ 12.03 в 10:00 - ИИ в банковской сфере\n` +
                `9️⃣ 19.03 в 10:00 - Внедрение ИИ в ПСБ\n\n` +
                `🔗 Подробнее: https://ostst.github.io/prompt/`,
                { parse_mode: 'Markdown' }
            );
            
            return res.status(200).json({ ok: true });
        }
        
        return res.status(200).json({ ok: true });
        
    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(200).json({ ok: true }); // Всегда возвращаем 200 для Telegram
    }
}

async function sendTelegramMessage(chatId, text, options = {}) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            ...options
        })
    });
}

async function notifyOwner(user, chatId) {
    const ownerChatId = '430657787'; // Ваш chat_id для уведомлений
    
    await sendTelegramMessage(ownerChatId,
        `🆕 *Новый подписчик!*\n\n` +
        `👤 ${user.first_name} ${user.last_name || ''}\n` +
        `🆔 Chat ID: \`${chatId}\`\n` +
        `📱 Username: ${user.username ? '@' + user.username : 'не указан'}`,
        { parse_mode: 'Markdown' }
    );
}
