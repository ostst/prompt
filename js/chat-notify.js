/**
 * Чат: красная точка на иконке «Чат» + уведомления браузера (если разрешены и включены в настройках).
 * Нужны PSBApp (app.js) и Firebase Realtime Database.
 */
(function () {
    if (window.__psbChatNotifyInit) return;
    window.__psbChatNotifyInit = true;

    const FIREBASE_CONFIG = {
        apiKey: 'AIzaSyDhUac_lBghIEQ8Sj15iCsWu7GVZcCOA3Y',
        authDomain: 'psb-academy-chat.firebaseapp.com',
        databaseURL: 'https://psb-academy-chat-default-rtdb.europe-west1.firebasedatabase.app',
        projectId: 'psb-academy-chat',
        storageBucket: 'psb-academy-chat.firebasestorage.app',
        messagingSenderId: '701758501216',
        appId: '1:701758501216:web:6311fcc657b0d350626e05'
    };

    let lastNotifiedKey = null;
    let messagesRef = null;

    function getLocalChatUserId() {
        const P = window.PSBApp;
        if (!P || !P.storage) return '';
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser) return 'tg_' + tgUser.id;
        const ta = P.storage.get('telegramAuth');
        if (ta && ta.id) return 'tg_' + ta.id;
        return String(P.storage.get('chatStableUserId') || '');
    }

    /** Только для всплывающих уведомлений браузера (не для красной точки). */
    function chatBrowserNotificationsEnabled() {
        const P = window.PSBApp;
        if (!P || !P.storage) return true;
        const s = P.storage.get('appSettings') || {};
        return s.chatNotifications !== false;
    }

    function setChatNavBadge(show) {
        document.querySelectorAll('a.nav-item[href*="chat.html"]').forEach((a) => {
            if (!a.querySelector('i')) return;
            a.style.position = 'relative';
            let dot = a.querySelector('.nav-chat-unread-dot');
            if (!dot) {
                dot = document.createElement('span');
                dot.className = 'nav-chat-unread-dot';
                dot.setAttribute('aria-hidden', 'true');
                a.appendChild(dot);
            }
            if (show) {
                dot.classList.add('nav-chat-unread-dot--visible');
            } else {
                dot.classList.remove('nav-chat-unread-dot--visible');
            }
        });
    }

    function normalizeMentionUserIds(msg) {
        const m = msg && msg.mentionUserIds;
        if (m == null) return null;
        if (Array.isArray(m)) return m.map((x) => String(x)).filter(Boolean);
        if (typeof m === 'object') {
            return Object.keys(m)
                .map((k) => m[k])
                .filter((v) => v != null && v !== '')
                .map((x) => String(x));
        }
        return null;
    }

    function shouldAlertChatMessageForUser(msg, uid) {
        if (!uid) return true;
        const ids = normalizeMentionUserIds(msg);
        if (!ids || ids.length === 0) return true;
        return ids.some((id) => String(id) === String(uid));
    }

    function notifyBrowser(msg, key) {
        if (!shouldAlertChatMessageForUser(msg, getLocalChatUserId())) return;
        if (!chatBrowserNotificationsEnabled()) return;
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        const path = (location.pathname || '').toLowerCase();
        const onChatPage = path.endsWith('chat.html') || path.endsWith('/chat');
        if (!document.hidden && onChatPage) return;
        if (lastNotifiedKey === key) return;
        lastNotifiedKey = key;
        const name = (msg && msg.userName) || 'Участник';
        let body = 'Новое сообщение';
        if (msg && msg.text) body = String(msg.text).trim().slice(0, 140);
        else if (msg && msg.msgType === 'image') body = '📷 Фото';
        else if (msg && msg.msgType === 'file') body = '📎 ' + (msg.fileName || 'Файл');
        let iconUrl = '';
        try {
            iconUrl = new URL('img/app-icon.png', location.href).href;
        } catch (_) {}
        try {
            new Notification('Чат курса · ' + name, {
                body: body,
                icon: iconUrl || undefined,
                tag: 'psb-chat-' + key
            });
        } catch (_) {}
    }

    function onLatestMessage(snap) {
        const P = window.PSBApp;
        if (!P || !P.storage) return;

        if (!snap || (typeof snap.exists === 'function' && !snap.exists())) {
            setChatNavBadge(false);
            return;
        }

        let key = null;
        let msg = null;
        if (typeof snap.forEach === 'function') {
            snap.forEach(function (child) {
                key = child.key;
                msg = child.val();
                return false;
            });
        } else {
            const val = snap.val();
            if (!val || typeof val !== 'object') {
                setChatNavBadge(false);
                return;
            }
            key = Object.keys(val)[0];
            msg = val[key];
        }

        if (!msg || !key) {
            setChatNavBadge(false);
            return;
        }

        const ts = Number(msg.timestamp) || 0;
        const lastRead = Number(P.storage.get('chatLastReadAt', 0)) || 0;
        const uid = getLocalChatUserId();
        const isOwn = uid && String(msg.userId) === String(uid);

        if (isOwn || ts <= lastRead) {
            setChatNavBadge(false);
            return;
        }
        if (!shouldAlertChatMessageForUser(msg, uid)) {
            setChatNavBadge(false);
            return;
        }

        setChatNavBadge(true);
        notifyBrowser(msg, key);
    }

    function startListener() {
        const P = window.PSBApp;
        if (!P || typeof firebase === 'undefined' || !firebase.database) return;
        try {
            if (!firebase.apps || firebase.apps.length === 0) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }
        } catch (e) {
            return;
        }
        messagesRef = firebase.database().ref('messages');
        messagesRef.orderByChild('timestamp').limitToLast(1).on('value', onLatestMessage);
    }

    function loadFirebaseAndStart() {
        if (typeof firebase !== 'undefined' && firebase.database) {
            startListener();
            return;
        }
        const a = document.createElement('script');
        a.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
        a.onload = function () {
            const b = document.createElement('script');
            b.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js';
            b.onload = startListener;
            document.head.appendChild(b);
        };
        document.head.appendChild(a);
    }

    function markChatMessagesRead(ts) {
        const P = window.PSBApp;
        if (!P || !P.storage) return;
        const t = Number(ts) || 0;
        if (!t) return;
        const prev = Number(P.storage.get('chatLastReadAt', 0)) || 0;
        if (t > prev) P.storage.set('chatLastReadAt', t);
        setChatNavBadge(false);
    }

    function syncChatNotifySettings() {
        const P = window.PSBApp;
        if (!P || !P.storage || !messagesRef) return;
        messagesRef.orderByChild('timestamp').limitToLast(1).once('value', onLatestMessage);
    }

    window.PSBApp = window.PSBApp || {};
    PSBApp.markChatMessagesRead = markChatMessagesRead;
    PSBApp.syncChatNotifySettings = syncChatNotifySettings;
    PSBApp.setChatNavBadge = setChatNavBadge;

    function boot() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadFirebaseAndStart);
        } else {
            loadFirebaseAndStart();
        }
        document.addEventListener('visibilitychange', function () {
            if (messagesRef && typeof PSBApp.syncChatNotifySettings === 'function') {
                PSBApp.syncChatNotifySettings();
            }
        });
        window.addEventListener('focus', function () {
            if (messagesRef && typeof PSBApp.syncChatNotifySettings === 'function') {
                PSBApp.syncChatNotifySettings();
            }
        });
    }

    boot();
})();
