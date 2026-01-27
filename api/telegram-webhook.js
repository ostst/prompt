// Vercel Serverless Function для Telegram Webhook

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7973162709:AAHk2rqqfThPaxLO5dXORiu67l0QvZO7zhw';
const OWNER_CHAT_ID = '430657787';

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        return res.status(200).json({ ok: true, message: 'Telegram Webhook is active' });
    }
    
    if (req.method !== 'POST') {
        return res.status(200).json({ ok: true });
    }

    try {
        const update = req.body;
        
        if (update.message?.text?.startsWith('/start')) {
            const chatId = update.message.chat.id;
            const user = update.message.from;
            
            await sendMessage(chatId, 
                `👋 Привет, ${user.first_name}!\n\nДобро пожаловать в бот ПСБ Академии!\n\n🔔 Теперь вы будете получать:\n• Напоминания о вебинарах за 1 час\n• Уведомления о новых материалах\n\n📱 Приложение: https://ostst.github.io/prompt/`
            );
            
            await sendMessage(OWNER_CHAT_ID,
                `🆕 Новый подписчик!\n\n👤 ${user.first_name} ${user.last_name || ''}\n🆔 Chat ID: ${chatId}\n📱 Username: ${user.username ? '@' + user.username : 'не указан'}`
            );
        }
        
        if (update.message?.text === '/schedule') {
            await sendMessage(update.message.chat.id,
                `📅 Расписание вебинаров:\n\n1️⃣ 27.01 в 12:00 - Введение в ИИ\n2️⃣ 29.01 в 10:00 - Китайские ИИ-сервисы\n3️⃣ 05.02 в 12:00 - Чат-боты\n4️⃣ 12.02 в 10:00 - Нейросети в дизайне\n5️⃣ 19.02 в 10:00 - Генерация изображений\n6️⃣ 26.02 в 10:00 - Анимация и видео\n7️⃣ 05.03 в 10:00 - Обработка аудио\n8️⃣ 12.03 в 10:00 - ИИ в банках\n9️⃣ 19.03 в 10:00 - ИИ в ПСБ`
            );
        }
        
        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Error:', error);
        return res.status(200).json({ ok: true });
    }
};

async function sendMessage(chatId, text) {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text })
    });
}
