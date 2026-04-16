/**
 * OneSignal Web SDK v16 — общая инициализация для PWA (все страницы).
 */
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function (OneSignal) {
    await OneSignal.init({
        appId: 'd496aabd-b8cf-4d18-946b-8228b23392f7',
        serviceWorkerPath: 'OneSignalSDKWorker.js',
        allowLocalhostAsSecureOrigin:
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1',
    });
});
