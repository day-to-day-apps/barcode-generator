(function () {
    'use strict';

    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;

    let registrationPromise = null;
    function registerPwa() {
        if (registrationPromise) return registrationPromise;
        registrationPromise = navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' })
            .then((registration) => registration.update())
            .catch(() => null);
        return registrationPromise;
    }

    window.__registerBarcodePwa = registerPwa;
    addEventListener('load', () => {
        // Keep the first render and Core Web Vitals free from background precache traffic.
        const startOnInteraction = () => registerPwa();
        addEventListener('pointerdown', startOnInteraction, { once: true, passive: true });
        addEventListener('keydown', startOnInteraction, { once: true });
        setTimeout(registerPwa, 30000);
    }, { once: true });
})();
