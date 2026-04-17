/**
 * OneSignal Web SDK v16 — общая инициализация для PWA (все страницы).
 * autoPrompt: false — показываем свой промпт, не нативный OneSignal.
 * serviceWorkerParam.scope: '/' — SW должен покрывать всё приложение.
 */
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function (OneSignal) {
    await OneSignal.init({
        appId: 'd496aabd-b8cf-4d18-946b-8228b23392f7',
        serviceWorkerPath: 'sw.js',
        serviceWorkerParam: { scope: '/prompt/' },
        notifyButton: { enable: false },
        autoPrompt: false,
        allowLocalhostAsSecureOrigin:
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1',
    });
});
