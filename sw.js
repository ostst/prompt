// ========================================
// Service Worker - ПСБ Академия
// ========================================

const CACHE_NAME = 'psb-academy-v3';
const STATIC_CACHE = 'psb-static-v3';
const DYNAMIC_CACHE = 'psb-dynamic-v3';
const BASE_PATH = '/prompt';

// Статические ресурсы для кэширования
const STATIC_ASSETS = [
    `${BASE_PATH}/`,
    `${BASE_PATH}/index.html`,
    `${BASE_PATH}/program_info.html`,
    `${BASE_PATH}/course_program.html`,
    `${BASE_PATH}/faq.html`,
    `${BASE_PATH}/platform_info.html`,
    `${BASE_PATH}/materials.html`,
    `${BASE_PATH}/glossary.html`,
    `${BASE_PATH}/stats.html`,
    `${BASE_PATH}/settings.html`,
    `${BASE_PATH}/chat.html`,
    `${BASE_PATH}/css/styles.css`,
    `${BASE_PATH}/js/app.js`,
    `${BASE_PATH}/manifest.json`,
    `${BASE_PATH}/img/app-icon.png`,
    `${BASE_PATH}/img/Hero.png`,
    `${BASE_PATH}/img/hero_lk.png`,
    `${BASE_PATH}/img/hero menu.png`,
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch(err => console.log('[SW] Cache error:', err))
    );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    
    event.waitUntil(
        caches.keys()
            .then(keys => {
                return Promise.all(
                    keys
                        .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                        .map(key => {
                            console.log('[SW] Removing old cache:', key);
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
        return caches.match(`${BASE_PATH}/index.html`);
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
        console.log('[SW] Fetch failed:', error);
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

// Push уведомления
self.addEventListener('push', (event) => {
    console.log('[SW] Push received');
    
    let data = {
        title: 'ПСБ Академия',
        body: 'Новое уведомление',
        icon: `${BASE_PATH}/img/app-icon.png`,
        badge: `${BASE_PATH}/img/app-icon.png`
    };
    
    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            vibrate: [200, 100, 200],
            tag: 'psb-notification',
            renotify: true,
            data: data.url || `${BASE_PATH}/`
        })
    );
});

// Клик по уведомлению
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click');
    
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Если приложение уже открыто - фокусируемся на нём
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(event.notification.data);
                        return client.focus();
                    }
                }
                
                // Иначе открываем новое окно
                if (clients.openWindow) {
                    return clients.openWindow(event.notification.data);
                }
            })
    );
});

// Background Sync для отложенных действий
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'sync-progress') {
        event.waitUntil(syncProgress());
    }
});

async function syncProgress() {
    // Здесь можно синхронизировать прогресс с сервером
    console.log('[SW] Syncing progress...');
}

console.log('[SW] Service Worker loaded');
