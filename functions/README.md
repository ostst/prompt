# Push-уведомления о чате (закрытое приложение)

Сообщения в Firebase Realtime Database (`/messages`) обрабатываются функцией `notifyChatMessage`: вызывается **OneSignal REST API**, push доставляется через уже подключённый в PWA **OneSignal Web SDK** (service worker).

## Требования

- План **Blaze** в Firebase (Cloud Functions с внешними запросами).
- В OneSignal: **REST API Key** (Settings → Keys & IDs).
- Пользователи должны **разрешить уведомления** и быть подписаны (как при обычном Push в настройках приложения).

## Установка и деплой

```bash
cd functions
npm install
cd ..
firebase login
firebase use psb-academy-chat
firebase functions:config:set \
  onesignal.rest_key="ВАШ_REST_API_KEY_ИЗ_ONESIGNAL" \
  app.public_url="https://ваш-домен.github.io/репозиторий"
firebase deploy --only functions
```

`app.public_url` — публичный URL сайта **без** завершающего слэша; по клику на уведомление откроется `{app.public_url}/chat.html`.

### Если OneSignal возвращает ошибку по сегменту

По умолчанию используется сегмент `Subscribed Users`. Ваши сегменты: OneSignal → **Audience** → **Segments**. Затем:

```bash
firebase functions:config:set onesignal.segment="Точное имя сегмента"
firebase deploy --only functions
```

## Локальные переменные (альтернатива config)

В Cloud Functions для Gen1 можно задать переменные окружения в среде выполнения (см. документацию Firebase) или использовать `functions.config` как выше.

## Безопасность

Не публикуйте REST API Key в репозиторий. Храните только в `firebase functions:config` или в секретах проекта.
