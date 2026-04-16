/* ========================================
   ПСБ Академия - Общий JavaScript
   ======================================== */

// ========================================
// Утилиты безопасности и оптимизации
// ========================================
const DEBUG = false; // Установить в true для отладки

// Безопасное логирование (только в режиме отладки)
const safeLog = (...args) => {
    if (DEBUG) {
        console.log(...args);
    }
};

const safeError = (...args) => {
    if (DEBUG) {
        console.error(...args);
    }
};

// Санитизация HTML для защиты от XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Безопасная установка innerHTML
function setSafeHTML(element, html) {
    if (!element) return;
    element.textContent = ''; // Очищаем
    const temp = document.createElement('div');
    temp.innerHTML = html;
    while (temp.firstChild) {
        element.appendChild(temp.firstChild);
    }
}

// ========================================
// Инициализация Telegram WebApp
// ========================================
const tg = window.Telegram?.WebApp;

function initTelegramApp() {
    if (!tg) {
        safeLog('Telegram WebApp не обнаружен, работаем в браузере');
        return;
    }
    
    // Раскрываем на весь экран
    tg.expand();
    
    // Слушаем изменение темы Telegram
    // Важно: применяем только если пользователь не установил свою настройку вручную
    tg.onEvent('themeChanged', () => {
        // Проверяем, есть ли сохранённая настройка пользователя
        const savedMode = localStorage.getItem('psb_darkMode');
        const userHasCustomTheme = savedMode !== null;
        
        // Если пользователь не устанавливал тему вручную, синхронизируем с Telegram
        if (!userHasCustomTheme) {
            const shouldBeDark = tg.colorScheme === 'dark';
            const isDark = document.body.classList.contains('dark-mode');
            
            if (shouldBeDark !== isDark) {
                document.body.classList.toggle('dark-mode', shouldBeDark);
                
                // Обновляем иконки темы
                document.querySelectorAll('.theme-icon-light').forEach(el => {
                    el.style.display = shouldBeDark ? 'none' : 'block';
                });
                document.querySelectorAll('.theme-icon-dark').forEach(el => {
                    el.style.display = shouldBeDark ? 'block' : 'none';
                });
            }
        }
    });
    
    // Настраиваем кнопку "Назад" в Telegram
    tg.BackButton.onClick(() => {
        if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
            window.history.back();
        }
    });
    
    // Показываем кнопку "Назад" если не на главной
    if (window.location.pathname !== '/' && !window.location.pathname.endsWith('index.html')) {
        tg.BackButton.show();
    }
}

// ========================================
// Haptic Feedback
// ========================================
const haptic = {
    light() {
        tg?.HapticFeedback?.impactOccurred('light');
    },
    medium() {
        tg?.HapticFeedback?.impactOccurred('medium');
    },
    heavy() {
        tg?.HapticFeedback?.impactOccurred('heavy');
    },
    success() {
        tg?.HapticFeedback?.notificationOccurred('success');
    },
    error() {
        tg?.HapticFeedback?.notificationOccurred('error');
    },
    selection() {
        tg?.HapticFeedback?.selectionChanged();
    }
};

// ========================================
// Темная тема
// ========================================
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    // Сохраняем настройку пользователя (строка 'true' или 'false')
    localStorage.setItem('psb_darkMode', isDark.toString());
    haptic.selection();
    
    // Обновляем иконки темы
    document.querySelectorAll('.theme-icon-light').forEach(el => {
        el.style.display = isDark ? 'none' : 'block';
    });
    document.querySelectorAll('.theme-icon-dark').forEach(el => {
        el.style.display = isDark ? 'block' : 'none';
    });
}

function initDarkMode() {
    // Проверяем сохранённую настройку пользователя
    const savedMode = localStorage.getItem('psb_darkMode');
    
    if (savedMode !== null) {
        // Пользователь установил тему вручную - используем её
        const shouldBeDark = savedMode === 'true';
        document.body.classList.toggle('dark-mode', shouldBeDark);
    } else {
        // Пользователь не устанавливал тему - синхронизируем с Telegram или системой
        let shouldBeDark = false;
        
        if (tg?.colorScheme === 'dark') {
            shouldBeDark = true;
        } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
            shouldBeDark = true;
        }
        
        document.body.classList.toggle('dark-mode', shouldBeDark);
    }
    
    // Обновляем иконки темы после инициализации
    const isDark = document.body.classList.contains('dark-mode');
    document.querySelectorAll('.theme-icon-light').forEach(el => {
        el.style.display = isDark ? 'none' : 'block';
    });
    document.querySelectorAll('.theme-icon-dark').forEach(el => {
        el.style.display = isDark ? 'block' : 'none';
    });
}

// ========================================
// LocalStorage helpers
// ========================================
const storage = {
    set(key, value) {
        try {
            localStorage.setItem(`psb_${key}`, JSON.stringify(value));
            return true;
        } catch (e) {
            safeError('LocalStorage set error:', e);
            return false;
        }
    },
    
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(`psb_${key}`);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            safeError('LocalStorage get error:', e);
            return defaultValue;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(`psb_${key}`);
            return true;
        } catch (e) {
            safeError('LocalStorage remove error:', e);
            return false;
        }
    }
};

// ========================================
// Прогресс курса
// ========================================
const progress = {
    // Получить все завершённые уроки
    getCompleted() {
        return storage.get('completedLessons', []);
    },
    
    // Отметить урок как завершённый
    complete(lessonId) {
        const completed = this.getCompleted();
        if (!completed.includes(lessonId)) {
            completed.push(lessonId);
            storage.set('completedLessons', completed);
            haptic.success();
            showToast('Урок отмечен как пройденный', 'success');
        }
        return completed;
    },
    
    // Убрать отметку о завершении
    uncomplete(lessonId) {
        let completed = this.getCompleted();
        completed = completed.filter(id => id !== lessonId);
        storage.set('completedLessons', completed);
        return completed;
    },
    
    // Проверить, завершён ли урок
    isCompleted(lessonId) {
        return this.getCompleted().includes(lessonId);
    },
    
    // Получить процент прогресса
    getPercent(totalLessons) {
        const completed = this.getCompleted().length;
        return Math.round((completed / totalLessons) * 100);
    },
    
    // Сбросить прогресс
    reset() {
        storage.remove('completedLessons');
        haptic.medium();
    }
};

// ========================================
// Toast уведомления
// ========================================
function showToast(message, type = 'default', duration = 3000) {
    // Удаляем предыдущий toast если есть
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '';
    switch(type) {
        case 'success':
            icon = '<i class="fa-solid fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fa-solid fa-exclamation-circle"></i>';
            break;
        default:
            icon = '<i class="fa-solid fa-info-circle"></i>';
    }
    
    toast.innerHTML = `${icon}<span>${message}</span>`;
    document.body.appendChild(toast);
    
    // Показываем с небольшой задержкой для анимации
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // Скрываем через указанное время
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ========================================
// Аккордеон
// ========================================
function toggleAccordion(id, closeOthers = true) {
    const content = document.getElementById('content-' + id);
    const icon = document.getElementById('icon-' + id);
    
    if (!content || !icon) return;
    
    const isOpen = content.classList.contains('open');
    
    // Закрываем все, если нужно
    if (closeOthers) {
        document.querySelectorAll('.accordion-content').forEach(el => el.classList.remove('open'));
        document.querySelectorAll('.rotate-icon').forEach(el => el.classList.remove('open'));
    }
    
    // Переключаем текущий
    if (!isOpen) {
        content.classList.add('open');
        icon.classList.add('open');
        haptic.light();
    }
}

// ========================================
// Таймер обратного отсчёта
// ========================================
function createCountdown(targetDate, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    
    function update() {
        const now = new Date();
        const diff = targetDate - now;
        
        if (diff <= 0) {
            container.innerHTML = '<div class="text-center text-sm font-bold text-green-600">Вебинар начался!</div>';
            return false;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        container.innerHTML = `
            <div class="countdown">
                <div class="countdown-item">
                    <span class="countdown-value">${days}</span>
                    <span class="countdown-label">${getDaysWord(days)}</span>
                </div>
                <div class="countdown-item">
                    <span class="countdown-value">${String(hours).padStart(2, '0')}</span>
                    <span class="countdown-label">${getHoursWord(hours)}</span>
                </div>
                <div class="countdown-item">
                    <span class="countdown-value">${String(minutes).padStart(2, '0')}</span>
                    <span class="countdown-label">${getMinutesWord(minutes)}</span>
                </div>
                <div class="countdown-item">
                    <span class="countdown-value">${String(seconds).padStart(2, '0')}</span>
                    <span class="countdown-label">сек</span>
                </div>
            </div>
        `;
        
        return true;
    }
    
    // Первый апдейт
    if (update()) {
        // Запускаем интервал
        return setInterval(() => {
            if (!update()) {
                clearInterval(this);
            }
        }, 1000);
    }
    
    return null;
}

// ========================================
// Склонение слов
// ========================================
function getDaysWord(n) {
    const abs = Math.abs(n) % 100;
    const n1 = abs % 10;
    if (abs > 10 && abs < 20) return 'дней';
    if (n1 > 1 && n1 < 5) return 'дня';
    if (n1 === 1) return 'день';
    return 'дней';
}

function getHoursWord(n) {
    const abs = Math.abs(n) % 100;
    const n1 = abs % 10;
    if (abs > 10 && abs < 20) return 'часов';
    if (n1 > 1 && n1 < 5) return 'часа';
    if (n1 === 1) return 'час';
    return 'часов';
}

function getMinutesWord(n) {
    const abs = Math.abs(n) % 100;
    const n1 = abs % 10;
    if (abs > 10 && abs < 20) return 'минут';
    if (n1 > 1 && n1 < 5) return 'минуты';
    if (n1 === 1) return 'минута';
    return 'минут';
}

// ========================================
// Добавление в календарь
// ========================================
function addToCalendar(title, dateStr, duration, description) {
    const startDate = new Date(dateStr);
    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
    
    const formatDate = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(description)}&location=Онлайн`;
    
    haptic.success();
    
    if (tg) {
        tg.openLink(calendarUrl);
    } else {
        window.open(calendarUrl, '_blank');
    }
    
    showToast('Открываем календарь...', 'success');
}

// ========================================
// Pull to Refresh
// ========================================
function initPullToRefresh() {
    let startY = 0;
    let pulling = false;
    const threshold = 80;
    
    // Создаём индикатор
    const indicator = document.createElement('div');
    indicator.className = 'pull-indicator';
    indicator.innerHTML = '<div class="spinner"></div><span>Обновление...</span>';
    document.body.appendChild(indicator);
    
    document.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) {
            startY = e.touches[0].clientY;
            pulling = true;
        }
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (!pulling) return;
        
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        
        if (diff > 0 && diff < threshold * 2) {
            indicator.classList.toggle('visible', diff > threshold / 2);
        }
    }, { passive: true });
    
    document.addEventListener('touchend', () => {
        if (!pulling) return;
        pulling = false;
        
        if (indicator.classList.contains('visible')) {
            haptic.medium();
            
            // Задержка для визуального эффекта
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            indicator.classList.remove('visible');
        }
    });
}

// ========================================
// Skeleton Loading
// ========================================
function showSkeleton(containerId, count = 3, type = 'card') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let html = '';
    
    for (let i = 0; i < count; i++) {
        if (type === 'card') {
            html += `
                <div class="card skeleton-card mb-3">
                    <div class="p-4">
                        <div class="skeleton skeleton-avatar mb-3"></div>
                        <div class="skeleton skeleton-title"></div>
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text" style="width: 80%"></div>
                    </div>
                </div>
            `;
        } else if (type === 'list') {
            html += `
                <div class="flex items-center gap-3 p-3 mb-2">
                    <div class="skeleton skeleton-avatar"></div>
                    <div class="flex-1">
                        <div class="skeleton skeleton-text" style="width: 70%"></div>
                        <div class="skeleton skeleton-text" style="width: 50%"></div>
                    </div>
                </div>
            `;
        }
    }
    
    container.innerHTML = html;
}

function hideSkeleton(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '';
    }
}

// ========================================
// Поиск
// ========================================
function initSearch(inputId, itemsSelector, searchKeys = ['textContent']) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const items = document.querySelectorAll(itemsSelector);
        
        items.forEach(item => {
            let match = false;
            
            if (!query) {
                match = true;
            } else {
                searchKeys.forEach(key => {
                    if (key === 'textContent') {
                        if (item.textContent.toLowerCase().includes(query)) {
                            match = true;
                        }
                    } else {
                        const attr = item.getAttribute(key);
                        if (attr && attr.toLowerCase().includes(query)) {
                            match = true;
                        }
                    }
                });
            }
            
            item.style.display = match ? '' : 'none';
        });
        
        haptic.selection();
    });
}

// ========================================
// Lazy Loading изображений
// ========================================
function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px'
        });
        
        images.forEach(img => observer.observe(img));
    } else {
        // Fallback для старых браузеров
        images.forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }
}

// ========================================
// Форматирование даты
// ========================================
function formatDate(dateStr, format = 'full') {
    const date = new Date(dateStr);
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 
                    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    switch(format) {
        case 'short':
            return `${day} ${month}`;
        case 'time':
            return `${hours}:${minutes}`;
        case 'datetime':
            return `${day} ${month}, ${hours}:${minutes}`;
        default:
            return `${day} ${month} ${year} г.`;
    }
}

// ========================================
// Открытие внешних ссылок
// ========================================
function openLink(url, inApp = false) {
    if (tg) {
        if (inApp) {
            tg.openLink(url, { try_instant_view: true });
        } else {
            tg.openLink(url);
        }
    } else {
        window.open(url, '_blank');
    }
}

// ========================================
// Встроенный просмотр записей вебинаров (iframe)
// ========================================
function closeWebinarPlayer() {
    document.removeEventListener('keydown', onWebinarPlayerKeydown);
    const overlay = document.getElementById('webinar-player-overlay');
    const iframe = document.getElementById('webinar-player-iframe');
    if (iframe) {
        iframe.src = 'about:blank';
    }
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = '';
}

function openWebinarPlayer(url) {
    const overlay = document.getElementById('webinar-player-overlay');
    const iframe = document.getElementById('webinar-player-iframe');
    const externalLink = document.getElementById('webinar-player-external');
    if (!overlay || !iframe || !url) return;
    try {
        const u = new URL(url, window.location.href);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
    } catch {
        return;
    }
    document.removeEventListener('keydown', onWebinarPlayerKeydown);
    document.addEventListener('keydown', onWebinarPlayerKeydown);
    iframe.src = url;
    if (externalLink) {
        externalLink.href = url;
    }
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    haptic.light();
}

function onWebinarPlayerKeydown(e) {
    if (e.key === 'Escape') {
        closeWebinarPlayer();
    }
}

function initWebinarPlayer() {
    const overlay = document.getElementById('webinar-player-overlay');
    if (!overlay) return;

    const closeBtn = overlay.querySelector('.webinar-player-close');
    const externalLink = document.getElementById('webinar-player-external');

    closeBtn?.addEventListener('click', () => {
        closeWebinarPlayer();
    });

    externalLink?.addEventListener('click', (e) => {
        const url = externalLink.getAttribute('href');
        closeWebinarPlayer();
        if (tg && url && url !== '#') {
            e.preventDefault();
            openLink(url);
        }
    });

    document.addEventListener('click', (e) => {
        const a = e.target.closest('a.action-btn');
        if (!a || !a.href) return;
        if (!/^https?:\/\//i.test(a.href)) return;
        if (a.dataset.openExternal === '1') return;
        if (e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        openWebinarPlayer(a.href);
    }, true);
}

// ========================================
// Инициализация при загрузке страницы
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initTelegramApp();
    initDarkMode();
    initPullToRefresh();
    initLazyLoading();
    initWebinarPlayer();
    
    // Добавляем fade-in анимацию к основному контенту
    const mainContent = document.querySelector('.fade-in, main, .max-w-md');
    if (mainContent) {
        mainContent.classList.add('fade-in');
    }
    
    safeLog('ПСБ Академия App initialized');
});

// ========================================
// Service Worker регистрация
// ========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Регистрируем относительно текущего пути
        const swPath = './sw.js';
        navigator.serviceWorker.register(swPath, { scope: './' })
            .then(reg => safeLog('Service Worker registered:', reg.scope))
            .catch(err => safeError('Service Worker registration failed:', err));
    });
}

// ========================================
// Аналитика для владельца (Telegram Bot)
// ========================================
const analytics = {
    botToken: '8554739832:AAFxhQXut7Tmm6fBT4TQx1VSy9Fq5GH4OOk',
    chatId: '430657787',
    
    // Отправка сообщения в Telegram
    async sendToTelegram(message) {
        try {
            const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
        } catch (e) {
            safeError('Analytics error:', e);
        }
    },
    
    // Получить данные пользователя
    getUserInfo() {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser) {
            return {
                id: tgUser.id,
                name: `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}`,
                username: tgUser.username ? `@${tgUser.username}` : 'нет'
            };
        }
        return { id: 'browser', name: 'Браузер', username: 'нет' };
    },
    
    // Форматирование даты
    formatDateTime() {
        return new Date().toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    // Отслеживание посещения страницы
    trackPageView(page) {
        const user = this.getUserInfo();
        const pageName = this.getPageName(page);
        
        const message = `📊 <b>Посещение</b>\n\n` +
            `👤 ${user.name}\n` +
            `🆔 ID: <code>${user.id}</code>\n` +
            `📧 ${user.username}\n` +
            `📄 Страница: ${pageName}\n` +
            `🕐 ${this.formatDateTime()}`;
        
        this.sendToTelegram(message);
    },
    
    // Отслеживание нового пользователя
    trackNewUser() {
        const isNew = !storage.get('userRegistered');
        if (isNew) {
            storage.set('userRegistered', Date.now());
            
            const user = this.getUserInfo();
            const message = `🎉 <b>Новый пользователь!</b>\n\n` +
                `👤 ${user.name}\n` +
                `🆔 ID: <code>${user.id}</code>\n` +
                `📧 ${user.username}\n` +
                `🕐 ${this.formatDateTime()}`;
            
            this.sendToTelegram(message);
        }
    },
    
    // Отслеживание действий
    trackAction(action, details = '') {
        const user = this.getUserInfo();
        
        // Сохраняем локально
        const events = storage.get('userEvents') || [];
        events.push({
            action: action,
            details: details,
            timestamp: Date.now()
        });
        
        // Храним последние 200 событий
        if (events.length > 200) {
            events.shift();
        }
        storage.set('userEvents', events);
        
        // Отправляем в Telegram
        const message = `⚡ <b>Действие</b>\n\n` +
            `👤 ${user.name} (${user.id})\n` +
            `🎯 ${action}\n` +
            `${details ? `📝 ${details}\n` : ''}` +
            `🕐 ${this.formatDateTime()}`;
        
        this.sendToTelegram(message);
    },
    
    // Названия страниц
    getPageName(page) {
        const names = {
            'index.html': '🏠 Главная',
            'program_info.html': 'ℹ️ О программе',
            'course_program.html': '📋 Программа курса',
            'platform_info.html': '💻 Платформа',
            'materials.html': '📚 Материалы',
            'glossary.html': '📖 Глоссарий',
            'faq.html': '❓ FAQ',
            'stats.html': '📊 Статистика',
            'chat.html': '💬 Чат'
        };
        return names[page] || page;
    }
};

// ========================================
// Отслеживание посещений
// ========================================
const visitTracker = {
    startTime: Date.now(),
    currentPage: window.location.pathname.split('/').pop() || 'index.html',
    
    init() {
        // Записываем посещение при загрузке
        this.trackVisit();
        
        // Отправляем в аналитику
        analytics.trackNewUser();
        analytics.trackPageView(this.currentPage);
        
        // Записываем время при уходе со страницы
        window.addEventListener('beforeunload', () => {
            this.saveVisitDuration();
        });
        
        // Также отслеживаем visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.saveVisitDuration();
            }
        });
    },
    
    trackVisit() {
        // Увеличиваем счётчик раздела
        const sectionVisits = storage.get('sectionVisits') || {};
        sectionVisits[this.currentPage] = (sectionVisits[this.currentPage] || 0) + 1;
        storage.set('sectionVisits', sectionVisits);
    },
    
    saveVisitDuration() {
        const duration = Math.round((Date.now() - this.startTime) / 60000); // в минутах
        
        // Добавляем в историю
        const history = storage.get('visitHistory') || [];
        history.push({
            page: this.currentPage,
            timestamp: this.startTime,
            duration: duration
        });
        
        // Храним последние 100 записей
        if (history.length > 100) {
            history.shift();
        }
        
        storage.set('visitHistory', history);
    }
};

// Инициализация трекера
visitTracker.init();

// ========================================
// Экспорт для использования в других скриптах
// ========================================
window.PSBApp = {
    haptic,
    storage,
    progress,
    showToast,
    toggleAccordion,
    escapeHtml,
    setSafeHTML,
    createCountdown,
    addToCalendar,
    showSkeleton,
    hideSkeleton,
    initSearch,
    formatDate,
    openLink,
    toggleDarkMode,
    getDaysWord,
    getHoursWord,
    getMinutesWord,
    visitTracker,
    analytics,
    openWebinarPlayer,
    closeWebinarPlayer
};
