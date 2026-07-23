// Dashboard KPI loader — fills [data-tile-kpi] spans with "{n}/{max}" counts.
// Imports stay path-agnostic; entrypoint passes its own count helpers.

const TILE_KEYS = ['codes', 'templates', 'printers', 'jobs'];

function formatKpi(template, n, max) {
    if (!template) return `${n} / ${max}`;
    return template.replace('{n}', String(n)).replace('{max}', String(max));
}

function setTileKpi(key, text, ratio) {
    const span = document.querySelector(`[data-tile-kpi="${key}"]`);
    if (!span) return;
    span.textContent = text;
    span.hidden = false;
    if (Number.isFinite(ratio)) {
        span.style.setProperty('--kpi-ratio', String(Math.min(1, Math.max(0, ratio))));
        span.dataset.kpiState = ratio >= 1 ? 'full' : ratio >= 0.8 ? 'warn' : 'ok';
    }
}

export async function loadDashboardStats({ helpers, limits, i18n, isCurrent = () => true }) {
    if (!helpers || !limits) return;
    const tasks = [
        { key: 'codes', fn: helpers.countCodes, max: limits.FREE_CODES_LIMIT, i18nKey: 'codesUsed' },
        { key: 'templates', fn: helpers.countTemplates, max: limits.FREE_TEMPLATES_LIMIT, i18nKey: 'templatesUsed' },
        { key: 'printers', fn: helpers.countPrinters, max: limits.FREE_PRINTERS_LIMIT, i18nKey: 'printersUsed' },
        { key: 'jobs', fn: helpers.countJobs, max: limits.FREE_JOBS_LIMIT, i18nKey: 'jobsUsed' },
    ];

    await Promise.all(tasks.map(async ({ key, fn, max, i18nKey }) => {
        if (typeof fn !== 'function') return;
        try {
            const result = await fn();
            if (!isCurrent()) return;
            const n = Number.isFinite(result?.count) ? result.count : 0;
            const template = (i18n && i18n[i18nKey]) || '{n}/{max}';
            setTileKpi(key, formatKpi(template, n, max), max > 0 ? n / max : 0);
        } catch (err) {
            // Fail silently on the tile; logs already happen in db-* helpers.
        }
    }));
}

export function clearDashboardStats() {
    TILE_KEYS.forEach((key) => {
        const span = document.querySelector(`[data-tile-kpi="${key}"]`);
        if (!span) return;
        span.textContent = '';
        span.hidden = true;
        span.removeAttribute('data-kpi-state');
        span.style.removeProperty('--kpi-ratio');
    });
}
