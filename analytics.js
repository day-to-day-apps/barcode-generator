/* ===== Barcode Generator - Analytics & Ads Bootstrap ===== */
(function() {
    'use strict';

    const GA4_MEASUREMENT_ID = 'G-SVBQKGWE1Y';
    const ADSENSE_PUBLISHER_ID = 'ca-pub-2527047257613855';

    const CONSENT_KEY = 'barcode-cookie-consent';

    // Empty slot IDs intentionally disable rendering. Replace only with real
    // data-ad-slot values copied from AdSense display ad units.
    const AD_SLOTS = {
        'sidebar-left':  { id: '', enabled: true,  format: 'auto',      fullWidthResp: true },
        'sidebar-right': { id: '', enabled: true,  format: 'auto',      fullWidthResp: true },
        'top-banner':    { id: '', enabled: true,  format: 'auto',      fullWidthResp: true },
        'mid-content':   { id: '', enabled: true,  format: 'rectangle', fullWidthResp: false },
        'content-2':     { id: '', enabled: true,  format: 'rectangle', fullWidthResp: false },
        // Prepared for later, but disabled so mobile users do not see a sticky
        // ad until the site has AdSense approval and UX data.
        'sticky-bottom': { id: '', enabled: false, format: 'auto',      fullWidthResp: true },
    };

    const CONSENT_TEXT = {
        pl: {
            msg: 'Ta strona u\u017cywa plik\u00f3w cookie do analityki i nieinwazyjnych reklam. Mo\u017cesz zaakceptowa\u0107 lub odrzuci\u0107 te funkcje.',
            accept: 'Akceptuj\u0119',
            reject: 'Odrzu\u0107',
            choices: 'Ustawienia prywatno\u015bci',
        },
        en: {
            msg: 'This site uses cookies for analytics and non-intrusive ads. You can accept or reject these features.',
            accept: 'Accept',
            reject: 'Reject',
            choices: 'Privacy choices',
        },
        de: {
            msg: 'Diese Website verwendet Cookies f\u00fcr Analysen und unaufdringliche Werbung. Sie k\u00f6nnen diese Funktionen akzeptieren oder ablehnen.',
            accept: 'Akzeptieren',
            reject: 'Ablehnen',
            choices: 'Datenschutzoptionen',
        },
        fr: {
            msg: 'Ce site utilise des cookies pour les statistiques et des publicit\u00e9s discr\u00e8tes. Vous pouvez accepter ou refuser ces fonctions.',
            accept: 'Accepter',
            reject: 'Refuser',
            choices: 'Choix de confidentialit\u00e9',
        },
        es: {
            msg: 'Este sitio usa cookies para anal\u00edtica y anuncios no intrusivos. Puedes aceptar o rechazar estas funciones.',
            accept: 'Aceptar',
            reject: 'Rechazar',
            choices: 'Opciones de privacidad',
        },
        it: {
            msg: 'Questo sito usa cookie per analisi e annunci non invasivi. Puoi accettare o rifiutare queste funzioni.',
            accept: 'Accetta',
            reject: 'Rifiuta',
            choices: 'Scelte privacy',
        },
        pt: {
            msg: 'Este site usa cookies para an\u00e1lise e an\u00fancios n\u00e3o intrusivos. Pode aceitar ou rejeitar estas fun\u00e7\u00f5es.',
            accept: 'Aceitar',
            reject: 'Rejeitar',
            choices: 'Op\u00e7\u00f5es de privacidade',
        },
        nl: {
            msg: 'Deze site gebruikt cookies voor analyse en niet-opdringerige advertenties. U kunt deze functies accepteren of weigeren.',
            accept: 'Accepteren',
            reject: 'Weigeren',
            choices: 'Privacykeuzes',
        },
        cs: {
            msg: 'Tento web pou\u017e\u00edv\u00e1 cookies pro analytiku a nevt\u00edrav\u00e9 reklamy. Tyto funkce m\u016f\u017eete p\u0159ijmout nebo odm\u00edtnout.',
            accept: 'P\u0159ijmout',
            reject: 'Odm\u00edtnout',
            choices: 'Nastaven\u00ed soukrom\u00ed',
        },
        uk: {
            msg: '\u0426\u0435\u0439 \u0441\u0430\u0439\u0442 \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u0454 cookie \u0434\u043b\u044f \u0430\u043d\u0430\u043b\u0456\u0442\u0438\u043a\u0438 \u0442\u0430 \u043d\u0435\u043d\u0430\u0432\u0027\u044f\u0437\u043b\u0438\u0432\u043e\u0457 \u0440\u0435\u043a\u043b\u0430\u043c\u0438. \u0412\u0438 \u043c\u043e\u0436\u0435\u0442\u0435 \u043f\u0440\u0438\u0439\u043d\u044f\u0442\u0438 \u0430\u0431\u043e \u0432\u0456\u0434\u0445\u0438\u043b\u0438\u0442\u0438 \u0446\u0456 \u0444\u0443\u043d\u043a\u0446\u0456\u0457.',
            accept: '\u041f\u0440\u0438\u0439\u043d\u044f\u0442\u0438',
            reject: '\u0412\u0456\u0434\u0445\u0438\u043b\u0438\u0442\u0438',
            choices: '\u041d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f \u043f\u0440\u0438\u0432\u0430\u0442\u043d\u043e\u0441\u0442\u0456',
        },
    };

    window.trackBarcode = function(eventName, params) {
        if (window.gtag) window.gtag('event', eventName, params || {});
    };

    function currentLang() {
        return (document.documentElement.lang || 'en').split('-')[0].toLowerCase();
    }

    function copy() {
        return CONSENT_TEXT[currentLang()] || CONSENT_TEXT.en;
    }

    function getConsent() {
        try {
            return localStorage.getItem(CONSENT_KEY);
        } catch (e) {
            return 'rejected';
        }
    }

    function setConsent(value) {
        try {
            localStorage.setItem(CONSENT_KEY, value);
        } catch (e) {
            /* Ignore storage failures; scripts remain disabled. */
        }
    }

    function hasConsent() {
        return getConsent() === 'accepted';
    }

    function enabledAdSlotEntries() {
        return Object.entries(AD_SLOTS).filter(([, cfg]) => cfg.enabled && cfg.id);
    }

    function hasGoogleFeaturesConfigured() {
        return Boolean(GA4_MEASUREMENT_ID || (ADSENSE_PUBLISHER_ID && enabledAdSlotEntries().length > 0));
    }

    function loadScript(id, src) {
        const existing = document.getElementById(id);
        if (existing) return Promise.resolve(existing);

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.id = id;
            script.async = true;
            script.crossOrigin = 'anonymous';
            script.src = src;
            script.onload = () => resolve(script);
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function initGA4() {
        if (!GA4_MEASUREMENT_ID) return;

        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function() {
            window.dataLayer.push(arguments);
        };

        window.gtag('consent', 'update', {
            analytics_storage: 'granted',
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted',
        });
        window.gtag('js', new Date());
        window.gtag('config', GA4_MEASUREMENT_ID, {
            page_path: window.location.pathname,
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure',
        });

        loadScript(
            'barcode-ga4',
            'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_MEASUREMENT_ID),
        ).catch(() => {
            /* Analytics is optional; keep the app usable if blocked. */
        });
    }

    function loadAdSense() {
        if (!ADSENSE_PUBLISHER_ID || enabledAdSlotEntries().length === 0) return Promise.resolve();

        return loadScript(
            'barcode-adsense',
            'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(ADSENSE_PUBLISHER_ID),
        ).catch(() => {
            /* Ads are optional; keep layout stable if blocked. */
        });
    }

    function injectAd(slot) {
        if (!slot || slot.dataset.adInjected === '1') return;

        const slotKey = slot.getAttribute('data-ad');
        const cfg = AD_SLOTS[slotKey];
        if (!cfg || !cfg.enabled || !cfg.id || !ADSENSE_PUBLISHER_ID) {
            slot.dataset.adSkipped = 'missing-ad-slot';
            return;
        }

        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.style.width = '100%';
        ins.setAttribute('data-ad-client', ADSENSE_PUBLISHER_ID);
        ins.setAttribute('data-ad-slot', cfg.id);
        ins.setAttribute('data-ad-format', cfg.format);
        if (cfg.fullWidthResp) ins.setAttribute('data-full-width-responsive', 'true');

        slot.appendChild(ins);
        slot.dataset.adInjected = '1';

        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            /* AdSense can throw while extensions block it; ignore. */
        }
    }

    function setupStickyBottomClose() {
        const sticky = document.querySelector('.ad-sticky-bottom');
        if (!sticky || sticky.dataset.stickyInit === '1' || !sticky.querySelector('ins.adsbygoogle')) return;

        sticky.dataset.stickyInit = '1';
        try {
            if (sessionStorage.getItem('sticky-ad-dismissed') === '1') {
                sticky.classList.add('is-hidden');
                return;
            }
        } catch (e) {
            /* Ignore storage failures. */
        }

        sticky.classList.add('is-ready');
        document.body.classList.add('has-sticky-ad');

        const closeBtn = sticky.querySelector('.ad-sticky-bottom__close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                sticky.classList.add('is-hidden');
                document.body.classList.remove('has-sticky-ad');
                try {
                    sessionStorage.setItem('sticky-ad-dismissed', '1');
                } catch (e) {
                    /* Ignore storage failures. */
                }
            });
        }
    }

    function injectAllAds() {
        if (!ADSENSE_PUBLISHER_ID || enabledAdSlotEntries().length === 0) return;

        document.querySelectorAll('.ad-sidebar[data-ad], .ad-slot[data-ad], .ad-sticky-bottom[data-ad]')
            .forEach(injectAd);
        setupStickyBottomClose();
    }

    function startGoogleFeatures() {
        if (!hasConsent() || !hasGoogleFeaturesConfigured()) return;

        initGA4();
        loadAdSense().then(injectAllAds);
    }

    function showConsentBanner(force) {
        if (!hasGoogleFeaturesConfigured()) return;
        if (!force && getConsent()) return;
        if (document.getElementById('cookie-banner')) return;

        const t = copy();
        const banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', t.choices);
        banner.setAttribute('aria-describedby', 'cookie-consent-description');
        banner.innerHTML = `
            <div class="cookie-inner">
                <p class="cookie-text" id="cookie-consent-description">${t.msg}</p>
                <div class="cookie-buttons">
                    <button class="cookie-btn cookie-accept" type="button">${t.accept}</button>
                    <button class="cookie-btn cookie-reject" type="button">${t.reject}</button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);
        document.body.classList.add('has-cookie-banner');
        if (force) banner.querySelector('.cookie-accept').focus();

        banner.querySelector('.cookie-accept').addEventListener('click', function() {
            setConsent('accepted');
            banner.remove();
            document.body.classList.remove('has-cookie-banner');
            startGoogleFeatures();
        });
        banner.querySelector('.cookie-reject').addEventListener('click', function() {
            setConsent('rejected');
            banner.remove();
            document.body.classList.remove('has-cookie-banner');
        });
    }

    function installPrivacyChoicesLink() {
        if (!hasGoogleFeaturesConfigured()) return;

        const bindButton = function(button) {
            if (button.dataset.cookieSettingsBound === 'true') return;
            button.dataset.cookieSettingsBound = 'true';
            button.addEventListener('click', function() {
                showConsentBanner(true);
            });
        };

        document.querySelectorAll('.cookie-settings-link').forEach(bindButton);

        const footerLinks = document.querySelector('.footer-links');
        if (!footerLinks || footerLinks.querySelector('.cookie-settings-link')) return;

        const separator = document.createTextNode(' \u00b7 ');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cookie-settings-link';
        button.textContent = copy().choices;
        bindButton(button);

        footerLinks.appendChild(separator);
        footerLinks.appendChild(button);
    }

    function boot() {
        installPrivacyChoicesLink();
        if (hasConsent()) {
            startGoogleFeatures();
        } else {
            showConsentBanner(false);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
