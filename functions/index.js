/**
 * Cloud Functions для Web Push через OneSignal (приложение может быть закрыто).
 *
 * 1) notifyChatMessage — новое сообщение в RTDB /messages → push всем подписчикам.
 * 2) webinarReminderPush — по расписанию (каждые 15 мин) напоминание за 1 ч до вебинара.
 *
 * Настройка:
 *   firebase functions:config:set onesignal.rest_key="REST_API_KEY" app.public_url="https://ваш-домен/путь/"
 * Опционально: onesignal.segment="Subscribed Users"
 *
 * Расписание вебинаров: functions/webinars-schedule.json (даты в UTC, синхронизировать с index.html).
 * Требуется тариф Blaze для Cloud Scheduler.
 */
const functions = require('firebase-functions');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = functions.logger;
const admin = require('firebase-admin');

const webinarSchedule = require('./webinars-schedule.json');

const RTDB_URL =
  process.env.FIREBASE_DATABASE_URL ||
  'https://psb-academy-chat-default-rtdb.europe-west1.firebasedatabase.app';

if (!admin.apps.length) {
  admin.initializeApp({ databaseURL: RTDB_URL });
}

const db = admin.database();

const ONESIGNAL_APP_ID = 'd496aabd-b8cf-4d18-946b-8228b23392f7';
const ONESIGNAL_API = 'https://onesignal.com/api/v1/notifications';

function getConfig() {
  const cfg = functions.config();
  const restKey =
    process.env.ONESIGNAL_REST_API_KEY ||
    (cfg.onesignal && cfg.onesignal.rest_key) ||
    (cfg.onesignal && cfg.onesignal.key);
  const publicUrl =
    process.env.APP_PUBLIC_URL ||
    (cfg.app && (cfg.app.public_url || cfg.app.url)) ||
    '';
  const segment =
    process.env.ONESIGNAL_SEGMENT ||
    (cfg.onesignal && cfg.onesignal.segment) ||
    'Subscribed Users';
  return { restKey, publicUrl, segment };
}

async function sendOneSignalPush({ title, body, url }) {
  const { restKey, publicUrl, segment } = getConfig();
  if (!restKey) {
    logger.error(
      'Не задан OneSignal REST API Key (functions:config:set onesignal.rest_key)'
    );
    return;
  }

  const launchUrl =
    url ||
    (publicUrl
      ? `${String(publicUrl).replace(/\/$/, '')}/index.html`
      : undefined);

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    included_segments: [segment],
    headings: { en: title, ru: title },
    contents: { en: body, ru: body },
  };
  if (launchUrl) {
    payload.url = launchUrl;
  }

  const authHeader =
    'Basic ' + Buffer.from(`${restKey}:`).toString('base64');

  const res = await fetch(ONESIGNAL_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: authHeader,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    logger.error('OneSignal API error', res.status, text);
    return;
  }
  try {
    const json = JSON.parse(text);
    logger.info('OneSignal notification created', json.id || json);
  } catch (_) {
    logger.info('OneSignal response', text);
  }
}

exports.notifyChatMessage = functions
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .region('europe-west1')
  .database.ref('/messages/{messageId}')
  .onCreate(async (snapshot) => {
    const msg = snapshot.val();
    if (!msg || typeof msg !== 'object') {
      return null;
    }

    const userName = String(msg.userName || 'Участник')
      .trim()
      .slice(0, 64);
    let body = 'Новое сообщение в чате курса';
    if (msg.text) {
      body = String(msg.text).trim().slice(0, 140);
    } else if (msg.msgType === 'image') {
      body = '📷 Фото';
    } else if (msg.msgType === 'file') {
      body = '📎 ' + String(msg.fileName || 'Файл').slice(0, 100);
    }

    const title = `Чат · ${userName}`;
    const { publicUrl } = getConfig();
    const chatUrl = publicUrl
      ? `${String(publicUrl).replace(/\/$/, '')}/chat.html`
      : undefined;

    try {
      await sendOneSignalPush({ title, body, url: chatUrl });
    } catch (e) {
      logger.error('notifyChatMessage failed', e);
    }
    return null;
  });

/**
 * Напоминание за 1 час до начала вебинара (как на главной scheduleNotification).
 * Окно: [T−60 мин, T−45 мин) при запуске каждые 15 минут — одно уведомление на вебинар.
 */
exports.webinarReminderPush = onSchedule(
  {
    schedule: 'every 15 minutes',
    region: 'europe-west1',
    timeZone: 'Europe/Moscow',
    memory: '256MiB',
  },
  async () => {
    const { restKey, publicUrl } = getConfig();
    if (!restKey) {
      logger.warn('webinarReminderPush: пропуск — нет onesignal.rest_key');
      return;
    }

    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    const slotMs = 15 * 60 * 1000;

    for (const w of webinarSchedule) {
      const start = new Date(w.start).getTime();
      if (Number.isNaN(start)) continue;

      const notifyAt = start - hourMs;
      if (now < notifyAt || now >= notifyAt + slotMs) continue;

      const sentRef = db.ref(`meta/webinarReminders/${w.id}`);
      const prev = await sentRef.once('value');
      if (prev.exists()) {
        continue;
      }

      const title = 'ПСБ Академия';
      const shortTitle = String(w.title || 'Вебинар').slice(0, 120);
      const body = `Вебинар начнётся через 1 час: ${shortTitle}`;
      const url = publicUrl
        ? `${String(publicUrl).replace(/\/$/, '')}/index.html`
        : undefined;

      try {
        await sendOneSignalPush({ title, body, url });
        await sentRef.set(admin.database.ServerValue.TIMESTAMP);
        logger.info('webinarReminderPush sent', w.id);
      } catch (e) {
        logger.error('webinarReminderPush failed', w.id, e);
      }
    }
  }
);

/**
 * Напоминание отметить вебинар как просмотренный — через ~10 мин после окончания.
 * Предполагаемая длительность вебинара: 90 минут.
 * Окно: [T+90 мин, T+105 мин) при запуске каждые 15 минут — одно уведомление на вебинар.
 */
exports.webinarEndedPush = onSchedule(
  {
    schedule: 'every 15 minutes',
    region: 'europe-west1',
    timeZone: 'Europe/Moscow',
    memory: '256MiB',
  },
  async () => {
    const { restKey, publicUrl } = getConfig();
    if (!restKey) {
      logger.warn('webinarEndedPush: пропуск — нет onesignal.rest_key');
      return;
    }

    const now = Date.now();
    const durationMs = 90 * 60 * 1000; // предполагаемая длительность вебинара
    const slotMs = 15 * 60 * 1000;
    const delayMs = 10 * 60 * 1000; // отправляем через 10 мин после окончания

    for (const w of webinarSchedule) {
      const start = new Date(w.start).getTime();
      if (Number.isNaN(start)) continue;

      const notifyAt = start + durationMs + delayMs;
      if (now < notifyAt || now >= notifyAt + slotMs) continue;

      const sentRef = db.ref(`meta/webinarEndedReminders/${w.id}`);
      const prev = await sentRef.once('value');
      if (prev.exists()) continue;

      const shortTitle = String(w.title || 'Вебинар').split(':')[0].trim().slice(0, 80);
      const title = 'ПСБ Академия 🏆';
      const body = `${shortTitle} завершился! Отметьте вебинар как просмотренный и получите достижение.`;
      const url = publicUrl
        ? `${String(publicUrl).replace(/\/$/, '')}/index.html`
        : undefined;

      try {
        await sendOneSignalPush({ title, body, url });
        await sentRef.set(admin.database.ServerValue.TIMESTAMP);
        logger.info('webinarEndedPush sent', w.id);
      } catch (e) {
        logger.error('webinarEndedPush failed', w.id, e);
      }
    }
  }
);
