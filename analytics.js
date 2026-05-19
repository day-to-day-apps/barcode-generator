/* ===== Barcode Generator — Analytics & Ads Bootstrap ===== */
(function() {
    'use strict';

    // ============================================================
    // CONFIGURATION — Replace these with your real IDs when ready
    // ============================================================
    const GA4_MEASUREMENT_ID = ''; // e.g. 'G-XXXXXXXXXX'
    const ADSENSE_PUBLISHER_ID = 'ca-pub-2527047257613855';

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
            injectSidebarAds();
        });
        banner.querySelector('.cookie-reject').addEventListener('click', function() {
            localStorage.setItem(CONSENT_KEY, 'rejected');
            banner.remove();
        });
    }

    // ============================================================
    // Sidebar ad slot injection (po zgodzie na cookies)
    // Wymaga elementów <aside class="ad-sidebar" data-ad="sidebar-left|sidebar-right">.
    // TODO: zastąp poniższe SLOT_ID realnymi wartościami z konsoli AdSense.
    // ============================================================
    const AD_SLOTS = {
        'sidebar-left':   { id: '0000000001', minH: 600, format: 'auto', fullWidthResp: true },
        'sidebar-right':  { id: '0000000002', minH: 600, format: 'auto', fullWidthResp: true },
        'top-banner':     { id: '0000000003', minH: 90,  format: 'auto', fullWidthResp: true },
        'mid-content':    { id: '0000000004', minH: 250, format: 'rectangle', fullWidthResp: false },
        'content-2':      { id: '0000000005', minH: 250, format: 'rectangle', fullWidthResp: false },
        'sticky-bottom':  { id: '0000000006', minH: 50,  format: 'auto', fullWidthResp: true },
    };

    function injectAd(slot) {
        if (!slot || slot.dataset.adInjected === '1') return;
        const slotKey = slot.getAttribute('data-ad');
        const cfg = AD_SLOTS[slotKey];
        if (!cfg) return;
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.style.width = '100%';
        ins.style.minHeight = cfg.minH + 'px';
        ins.setAttribute('data-ad-client', ADSENSE_PUBLISHER_ID);
        ins.setAttribute('data-ad-slot', cfg.id);
        ins.setAttribute('data-ad-format', cfg.format);
        if (cfg.fullWidthResp) ins.setAttribute('data-full-width-responsive', 'true');
        slot.appendChild(ins);
        slot.dataset.adInjected = '1';
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            /* AdSense init may throw before script load — ignore */
        }
    }

    function injectAllAds() {
        if (!ADSENSE_PUBLISHER_ID) return;
        document.querySelectorAll('.ad-sidebar[data-ad], .ad-slot[data-ad], .ad-sticky-bottom[data-ad]')
            .forEach(injectAd);
        setupStickyBottomClose();
    }

    function setupStickyBottomClose() {
        const sticky = document.querySelector('.ad-sticky-bottom');
        if (!sticky || sticky.dataset.stickyInit === '1') return;
        sticky.dataset.stickyInit = '1';
        document.body.classList.add('has-sticky-ad');
        const closeBtn = sticky.querySelector('.ad-sticky-bottom__close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                sticky.classList.add('is-hidden');
                document.body.classList.remove('has-sticky-ad');
                try { sessionStorage.setItem('sticky-ad-dismissed', '1'); } catch (e) { /* ignore */ }
            });
        }
        try {
            if (sessionStorage.getItem('sticky-ad-dismissed') === '1') {
                sticky.classList.add('is-hidden');
                document.body.classList.remove('has-sticky-ad');
            }
        } catch (e) { /* ignore */ }
    }

    function maybeInjectAds() {
        if (hasConsent()) injectAllAds();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', maybeInjectAds);
    } else {
        maybeInjectAds();
    }

})();
