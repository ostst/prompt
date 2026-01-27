# Настройка Telegram бота для уведомлений

## Шаг 1: Деплой на Vercel

1. Зарегистрируйтесь на [vercel.com](https://vercel.com) (через GitHub)

2. Нажмите **"Add New Project"**

3. Импортируйте репозиторий `ostst/prompt`

4. В настройках проекта добавьте **Environment Variables**:
   - `TELEGRAM_BOT_TOKEN` = `7973162709:AAHk2rqqfThPaxLO5dXORiu67l0QvZO7zhw`
   - `NOTIFICATION_SECRET` = (придумайте секретный ключ, например: `psb-notify-2026`)

5. Нажмите **Deploy**

6. После деплоя скопируйте URL вашего проекта (например: `https://prompt-xxx.vercel.app`)

## Шаг 2: Настройка Webhook для бота

После деплоя на Vercel нужно указать Telegram куда отправлять сообщения от пользователей.

Откройте в браузере (замените YOUR_VERCEL_URL на ваш URL):

```
https://api.telegram.org/bot7973162709:AAHk2rqqfThPaxLO5dXORiu67l0QvZO7zhw/setWebhook?url=YOUR_VERCEL_URL/api/telegram-webhook
```

Пример:
```
https://api.telegram.org/bot7973162709:AAHk2rqqfThPaxLO5dXORiu67l0QvZO7zhw/setWebhook?url=https://prompt-ostst.vercel.app/api/telegram-webhook
```

Вы должны увидеть:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

## Шаг 3: Проверка бота

1. Откройте Telegram
2. Найдите бота @APSB_AI_Prompter_bot
3. Нажмите **/start**
4. Бот должен ответить приветственным сообщением
5. Вам (владельцу) придёт уведомление о новом подписчике

## Шаг 4: Сбор подписчиков

Когда пользователи нажимают "Войти через Telegram" в приложении и запускают бота, их chat_id сохраняется.

Для рассылки уведомлений вам нужно вести список chat_id подписчиков.

### Вариант А: Ручной список
Собирайте chat_id из уведомлений и добавляйте в GitHub Secrets.

### Вариант Б: База данных (рекомендуется)
Подключите бесплатную базу данных:
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv) (Redis)
- [Supabase](https://supabase.com) (PostgreSQL)
- [PlanetScale](https://planetscale.com) (MySQL)

## Шаг 5: Отправка уведомлений всем

### Через GitHub Actions (если список chat_id в secrets)

Обновите `.github/workflows/webinar-notifications.yml`:

```yaml
- name: Send Telegram notifications
  env:
    BOT_TOKEN: 7973162709:AAHk2rqqfThPaxLO5dXORiu67l0QvZO7zhw
    CHAT_IDS: ${{ secrets.TELEGRAM_CHAT_IDS }}  # Список через запятую: 123456,789012,345678
  run: |
    IFS=',' read -ra IDS <<< "$CHAT_IDS"
    for chat_id in "${IDS[@]}"; do
      curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
        -H "Content-Type: application/json" \
        -d '{
          "chat_id": "'"$chat_id"'",
          "text": "🔔 *Вебинар через 1 час!*\n\n'"$TITLE"' - '"$MESSAGE"'",
          "parse_mode": "Markdown",
          "reply_markup": {
            "inline_keyboard": [[{"text": "📺 Перейти к вебинару", "url": "'"$WEBINAR_URL"'"}]]
          }
        }'
    done
```

### Через API (если есть база данных)

```bash
curl -X POST "https://your-vercel-url.vercel.app/api/send-notification" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-key" \
  -d '{
    "title": "Вебинар через 1 час!",
    "message": "Вебинар № 1: Введение в ИИ - Начало в 12:00 МСК",
    "url": "https://my.mts-link.ru/j/psbacademy/9615477419",
    "chatIds": [123456789, 987654321]
  }'
```

## Команды бота

Бот поддерживает команды:
- `/start` - Подписаться на уведомления
- `/schedule` - Расписание вебинаров
- `/help` - Список команд

## Тестирование

1. Откройте бота в Telegram
2. Отправьте `/start`
3. Проверьте, что пришёл ответ
4. Проверьте, что вам пришло уведомление о новом подписчике
