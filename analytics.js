/* ===== Barcode Generator — Analytics & Ads Bootstrap ===== */
(function() {
    'use strict';

    // ============================================================
    // CONFIGURATION — Replace these with your real IDs when ready
    // ============================================================
    const GA4_MEASUREMENT_ID = ''; // e.g. 'G-XXXXXXXXXX'
    const ADSENSE_PUBLISHER_ID = ''; // e.g. 'ca-pub-XXXXXXXXXXXXXXXX'

    // ============================================================
    // Google Analytics 4
    // ============================================================
    if (GA4_MEASUREMENT_ID) {
        const gtagScript = document.createElement('script');
        gtagScript.async = true;
        gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_MEASUREMENT_ID;
        document.head.appendChild(gtagScript);

        window.dataLayer = window.dataLayer || [];
        function gtag() { window.dataLayer.push(arguments); }
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', GA4_MEASUREMENT_ID, {
            page_path: window.location.pathname,
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure',
        });

        // Custom events for barcode generator
        window.trackBarcode = function(eventName, params) {
            if (window.gtag) gtag('event', eventName, params || {});
        };
    }

    // ============================================================
    // Google AdSense
    // ============================================================
    if (ADSENSE_PUBLISHER_ID) {
        const adsScript = document.createElement('script');
        adsScript.async = true;
        adsScript.crossOrigin = 'anonymous';
        adsScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_PUBLISHER_ID;
        document.head.appendChild(adsScript);
    }

    // ============================================================
    // Cookie Consent (basic — GDPR/ePrivacy compliance)
    // ============================================================
    const CONSENT_KEY = 'barcode-cookie-consent';

    function hasConsent() {
        return localStorage.getItem(CONSENT_KEY) === 'accepted';
    }

    function showConsentBanner() {
        if (hasConsent()) return;

        const lang = document.documentElement.lang || 'en';
        const texts = {
            pl: { msg: 'Ta strona używa plików cookie do analityki i reklam.', accept: 'Akceptuję', reject: 'Odrzuć' },
            en: { msg: 'This site uses cookies for analytics and ads.', accept: 'Accept', reject: 'Reject' },
            de: { msg: 'Diese Website verwendet Cookies für Analysen und Werbung.', accept: 'Akzeptieren', reject: 'Ablehnen' },
            fr: { msg: 'Ce site utilise des cookies pour l\u2019analyse et la publicité.', accept: 'Accepter', reject: 'Refuser' },
            es: { msg: 'Este sitio usa cookies para análisis y publicidad.', accept: 'Aceptar', reject: 'Rechazar' },
            it: { msg: 'Questo sito usa cookie per analisi e pubblicità.', accept: 'Accetta', reject: 'Rifiuta' },
            pt: { msg: 'Este site usa cookies para análise e publicidade.', accept: 'Aceitar', reject: 'Rejeitar' },
            nl: { msg: 'Deze site gebruikt cookies voor analyse en advertenties.', accept: 'Accepteren', reject: 'Weigeren' },
            cs: { msg: 'Tento web používá cookies pro analytiku a reklamu.', accept: 'Přijmout', reject: 'Odmítnout' },
            uk: { msg: 'Цей сайт використовує cookie для аналітики та реклами.', accept: 'Прийняти', reject: 'Відхилити' },
        };
        const t = texts[lang] || texts.en;

        const banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Cookie consent');
        banner.innerHTML = `
            <div class="cookie-inner">
                <span class="cookie-text">${t.msg}</span>
                <div class="cookie-buttons">
                    <button class="cookie-btn cookie-accept">${t.accept}</button>
                    <button class="cookie-btn cookie-reject">${t.reject}</button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);

        banner.querySelector('.cookie-accept').addEventListener('click', function() {
            localStorage.setItem(CONSENT_KEY, 'accepted');
            banner.remove();
        });
        banner.querySelector('.cookie-reject').addEventListener('click', function() {
            localStorage.setItem(CONSENT_KEY, 'rejected');
            banner.remove();
        });
    }

    // Show consent banner after page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showConsentBanner);
    } else {
        showConsentBanner();
    }
})();
