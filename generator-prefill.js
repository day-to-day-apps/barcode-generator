(function () {
    'use strict';

    function applyPrefill() {
        const params = new URLSearchParams(location.search);
        const value = params.get('value');
        if (!value) return;

        const input = document.getElementById('barcode-text');
        if (!input) return;

        // URL parameters are text only; assigning through .value keeps decoded content inert.
        input.value = value.slice(0, 4096);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (document.readyState !== 'complete') {
        document.addEventListener('DOMContentLoaded', applyPrefill, { once: true });
    } else {
        applyPrefill();
    }
})();
