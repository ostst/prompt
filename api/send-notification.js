// Vercel Serverless Function для отправки уведомлений

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7973162709:AAHk2rqqfThPaxLO5dXORiu67l0QvZO7zhw';

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        return res.status(200).json({ ok: true, message: 'Send Notification API is active' });
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { title, message, url, chatIds } = req.body;
        
        if (!title || !message || !chatIds || !Array.isArray(chatIds)) {
            return res.status(400).json({ error: 'Missing required fields: title, message, chatIds' });
        }
        
        const results = [];
        
        for (const chatId of chatIds) {
            try {
                const text = `🔔 ${title}\n\n${message}${url ? `\n\n🔗 ${url}` : ''}`;
                
                const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: text,
                        reply_markup: url ? {
                            inline_keyboard: [[
                                { text: '📺 Перейти к вебинару', url: url }
                            ]]
                        } : undefined
                    })
                });
                
                results.push({ chatId, status: 'sent' });
            } catch (error) {
                results.push({ chatId, status: 'failed', error: error.message });
            }
        }
        
        return res.status(200).json({ 
            ok: true, 
            sent: results.filter(r => r.status === 'sent').length,
            failed: results.filter(r => r.status === 'failed').length,
            results 
        });
        
    } catch (error) {
        console.error('Send notification error:', error);
        return res.status(500).json({ error: error.message });
    }
};
