importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
// ↑ OneSignal: первой строкой. Дальше — кэш PWA.

// ========================================
// Service Worker - ПСБ Академия
// ========================================

const CACHE_NAME = 'psb-academy-v6';
const STATIC_CACHE = 'psb-static-v6';
const DYNAMIC_CACHE = 'psb-dynamic-v6';
/** Базовый путь приложения: каталог, в котором лежит sw.js (например / или /prompt/) */
const BASE_PATH = new URL('.', self.location.href).pathname;

// Статические ресурсы для кэширования
const STATIC_ASSETS = [
    `${BASE_PATH}`,
    `${BASE_PATH}index.html`,
    `${BASE_PATH}program_info.html`,
    `${BASE_PATH}course_program.html`,
    `${BASE_PATH}faq.html`,
    `${BASE_PATH}platform_info.html`,
    `${BASE_PATH}materials.html`,
    `${BASE_PATH}glossary.html`,
    `${BASE_PATH}stats.html`,
    `${BASE_PATH}settings.html`,
    `${BASE_PATH}chat.html`,
    `${BASE_PATH}css/styles.css`,
    `${BASE_PATH}js/app.js`,
    `${BASE_PATH}js/onesignal-init.js`,
    `${BASE_PATH}manifest.json`,
    `${BASE_PATH}img/app-icon.png`,
    `${BASE_PATH}img/Hero.png`,
    `${BASE_PATH}img/hero_lk.png`,
    `${BASE_PATH}img/hero menu.png`,
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
    // Installing Service Worker
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                // Caching static assets
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch(err => {
                // Cache error
            })
    );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
    // Activating Service Worker
    
    event.waitUntil(
        caches.keys()
            .then(keys => {
                return Promise.all(
                    keys
                        .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                        .map(key => {
                            // Removing old cache
                            return caches.delete(key);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Стратегия кэширования: Network First с fallback на кэш
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Пропускаем не-GET запросы
    if (request.method !== 'GET') return;
    
    // Пропускаем запросы к Telegram API и OneSignal
    if (url.hostname.includes('telegram.org') || url.hostname.includes('onesignal.com')) return;
    
    // Для HTML страниц - Network First
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(networkFirst(request));
        return;
    }
    
    // Для статических ресурсов - Cache First
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirst(request));
        return;
    }
    
    // Для остальных - Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request));
});

// Проверка, является ли ресурс статическим
function isStaticAsset(url) {
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.woff', '.woff2'];
    return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

// Network First стратегия
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Возвращаем offline страницу если есть
        return caches.match(`${BASE_PATH}index.html`);
    }
}

// Cache First стратегия
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Fetch failed
        return new Response('Offline', { status: 503 });
    }
}

// Stale While Revalidate стратегия
async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);
    
    const fetchPromise = fetch(request)
        .then(networkResponse => {
            if (networkResponse.ok) {
                const cache = caches.open(DYNAMIC_CACHE);
                cache.then(c => c.put(request, networkResponse.clone()));
            }
            return networkResponse;
        })
        .catch(() => cachedResponse);
    
    return cachedResponse || fetchPromise;
}

// ========================================
// Push-уведомления (fallback — если OneSignal SW не перехватил)
// ========================================
// OneSignal уже обрабатывает push через importScripts выше.
// Эти обработчики срабатывают только если OneSignal SDK недоступен (оффлайн, CDN недоступен).

self.addEventListener('push', (event) => {
    // OneSignal обычно перехватывает раньше. Этот блок — страховка.
    if (event.data) {
        let data = {};
        try { data = event.data.json(); } catch (_) { data = { title: 'ПСБ Академия', body: event.data.text() }; }
        const title = data.title || data.headings?.ru || data.headings?.en || 'ПСБ Академия';
        const body = data.body || data.contents?.ru || data.contents?.en || '';
        const icon = data.icon || `${BASE_PATH}img/app-icon.png`;
        const url = data.url || data.launch_url || `${BASE_PATH}index.html`;
        event.waitUntil(
            self.registration.showNotification(title, {
                body,
                icon,
                badge: `${BASE_PATH}img/app-icon.png`,
                data: { url },
                tag: data.tag || 'psb-push',
            })
        );
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url)
        || `${BASE_PATH}index.html`;
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            // Если уже есть открытое окно — фокусируем и навигируем
            for (const client of list) {
                if ('focus' in client) {
                    client.focus();
                    if ('navigate' in client) client.navigate(url);
                    return;
                }
            }
            // Иначе открываем новое окно
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});

// Background Sync для отложенных действий
self.addEventListener('sync', (event) => {
    // Background sync
    
    if (event.tag === 'sync-progress') {
        event.waitUntil(syncProgress());
    }
});

async function syncProgress() {
    // Здесь можно синхронизировать прогресс с сервером
    // Syncing progress
}

// Service Worker loaded
