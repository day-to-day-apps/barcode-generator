(function () {
    'use strict';

    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;

    const updateCopy = {
        en: { message: 'A new version is ready.', refresh: 'Refresh now', dismiss: 'Dismiss update notice' },
        pl: { message: 'Nowa wersja jest gotowa.', refresh: 'Odśwież teraz', dismiss: 'Zamknij powiadomienie o aktualizacji' },
        de: { message: 'Eine neue Version ist bereit.', refresh: 'Jetzt aktualisieren', dismiss: 'Aktualisierungshinweis schließen' },
        fr: { message: 'Une nouvelle version est prête.', refresh: 'Actualiser', dismiss: 'Fermer la notification de mise à jour' },
        es: { message: 'Hay una nueva versión disponible.', refresh: 'Actualizar ahora', dismiss: 'Cerrar el aviso de actualización' },
        it: { message: 'È disponibile una nuova versione.', refresh: 'Aggiorna ora', dismiss: 'Chiudi l’avviso di aggiornamento' },
        pt: { message: 'Está disponível uma nova versão.', refresh: 'Atualizar agora', dismiss: 'Fechar aviso de atualização' },
        nl: { message: 'Er staat een nieuwe versie klaar.', refresh: 'Nu vernieuwen', dismiss: 'Updatemelding sluiten' },
        cs: { message: 'Je připravena nová verze.', refresh: 'Aktualizovat', dismiss: 'Zavřít oznámení o aktualizaci' },
        uk: { message: 'Нова версія готова.', refresh: 'Оновити зараз', dismiss: 'Закрити сповіщення про оновлення' }
    };
    let controlledPage = Boolean(navigator.serviceWorker.controller);
    let updateNotified = false;

    function showUpdateNotice() {
        if (updateNotified || document.getElementById('pwa-update-notice')) return;
        updateNotified = true;

        const language = (document.documentElement.lang || 'en').split('-')[0];
        const copy = updateCopy[language] || updateCopy.en;
        if (!document.getElementById('pwa-update-styles')) {
            const styles = document.createElement('style');
            styles.id = 'pwa-update-styles';
            styles.textContent = `
                .pwa-update-notice {
                    position: fixed;
                    inset-inline: 16px;
                    bottom: max(16px, env(safe-area-inset-bottom));
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: min(520px, calc(100% - 32px));
                    margin-inline: auto;
                    padding: 12px 12px 12px 14px;
                    color: #172033;
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    border-inline-start: 4px solid #0f766e;
                    border-radius: 8px;
                    box-shadow: 0 12px 32px rgba(15, 23, 42, .2);
                    font: 600 14px/1.4 system-ui, sans-serif;
                }
                .pwa-update-message { flex: 1 1 auto; }
                .pwa-update-refresh {
                    min-height: 40px;
                    padding: 8px 12px;
                    color: #ffffff;
                    background: #0f766e;
                    border: 1px solid #0f766e;
                    border-radius: 6px;
                    font: inherit;
                    cursor: pointer;
                }
                .pwa-update-dismiss {
                    flex: 0 0 40px;
                    width: 40px;
                    height: 40px;
                    padding: 0;
                    color: inherit;
                    background: transparent;
                    border: 0;
                    font: 24px/1 system-ui, sans-serif;
                    cursor: pointer;
                }
                .pwa-update-refresh:focus-visible,
                .pwa-update-dismiss:focus-visible {
                    outline: 3px solid #f59e0b;
                    outline-offset: 2px;
                }
                [data-theme="dark"] .pwa-update-notice {
                    color: #f8fafc;
                    background: #172033;
                    border-color: #475569;
                }
                @media (max-width: 520px) {
                    .pwa-update-notice { align-items: stretch; flex-wrap: wrap; }
                    .pwa-update-message { flex-basis: calc(100% - 52px); align-self: center; }
                    .pwa-update-refresh { order: 3; flex: 1 0 100%; }
                    .pwa-update-dismiss { order: 2; }
                }
            `;
            document.head.appendChild(styles);
        }

        const notice = document.createElement('section');
        notice.id = 'pwa-update-notice';
        notice.className = 'pwa-update-notice';
        notice.setAttribute('role', 'status');
        notice.setAttribute('aria-live', 'polite');
        notice.setAttribute('aria-atomic', 'true');

        const message = document.createElement('span');
        message.className = 'pwa-update-message';
        message.textContent = copy.message;

        const refresh = document.createElement('button');
        refresh.type = 'button';
        refresh.className = 'pwa-update-refresh';
        refresh.textContent = copy.refresh;
        refresh.addEventListener('click', () => location.reload());

        const dismiss = document.createElement('button');
        dismiss.type = 'button';
        dismiss.className = 'pwa-update-dismiss';
        dismiss.textContent = '\u00d7';
        dismiss.setAttribute('aria-label', copy.dismiss);
        dismiss.title = copy.dismiss;
        dismiss.addEventListener('click', () => notice.remove());

        notice.append(message, refresh, dismiss);
        document.body.appendChild(notice);
    }

    window.__showBarcodePwaUpdate = showUpdateNotice;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!controlledPage) {
            controlledPage = true;
            return;
        }
        showUpdateNotice();
    });

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
