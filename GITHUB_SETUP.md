# Настройка автоматических уведомлений через GitHub Actions

## Шаг 1: Загрузите проект на GitHub

1. Создайте репозиторий на GitHub
2. Загрузите все файлы проекта

## Шаг 2: Добавьте секретный ключ

1. Откройте ваш репозиторий на GitHub
2. Перейдите в **Settings** → **Secrets and variables** → **Actions**
3. Нажмите **New repository secret**
4. Введите:
   - **Name:** `ONESIGNAL_API_KEY`
   - **Secret:** `os_v2_app_2slkvpnyz5grrfdlqiulem4s666mlwnvnkseggexwj3p6unshgtr2v3h6xmy3p6fsxnoi5gcweisjhk4a5a6rrx2x4v5gzvz7v3th7a`
5. Нажмите **Add secret**

## Шаг 3: Обновите URL в workflow

Откройте файл `.github/workflows/webinar-notifications.yml` и замените:
```
"url": "https://your-username.github.io/prompt-app-main/"
```
на ваш реальный URL GitHub Pages.

## Шаг 4: Включите GitHub Pages

1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: main, / (root)
4. Save

## Как это работает

- GitHub Actions запускается **каждый час**
- Проверяет, есть ли вебинар через 1 час
- Если да — отправляет push-уведомление всем подписчикам через OneSignal

## Расписание уведомлений

Уведомления отправляются за 1 час до начала:

| Вебинар | Дата | Время МСК | Уведомление в |
|---------|------|-----------|---------------|
| № 1 | 27.01.2026 | 12:00 | 11:00 |
| № 2 | 29.01.2026 | 10:00 | 09:00 |
| № 3 | 05.02.2026 | 12:00 | 11:00 |
| № 4 | 12.02.2026 | 10:00 | 09:00 |
| № 5 | 19.02.2026 | 10:00 | 09:00 |
| № 6 | 26.02.2026 | 10:00 | 09:00 |
| № 7 | 05.03.2026 | 10:00 | 09:00 |
| № 8 | 12.03.2026 | 10:00 | 09:00 |
| № 9 | 19.03.2026 | 10:00 | 09:00 |

## Тестирование

Для ручного запуска:
1. Actions → Webinar Notifications → Run workflow

## Изменение расписания

Чтобы изменить расписание вебинаров, отредактируйте массив `WEBINARS` в файле `.github/workflows/webinar-notifications.yml`

Формат: `"YYYY-MM-DD HH:00|Название|Описание"`
- Время указывается на 1 час раньше начала вебинара (МСК)
