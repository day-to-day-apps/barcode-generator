"""Jednorazowa transformacja 9 lokalnych {lang}/index.html do struktury root.

Zmiany na plik:
1. Anty-FOUC: inline skrypt motywu w <head> (klucz barcode-theme).
2. Naglowek -> topbar: lang-switch + theme-toggle przeniesione do .topbar
   z pustym .topbar__right na kontrolki konta.
3. Karty popular owiniete w .popular-card-wrap; link "dowiedz sie wiecej" pod
   kartami majacymi przewodnik (EAN-13, UPC-A, Code 128, Code 39).
4. Usuniecie osobnej sekcji .seo-links.
5. Dodanie ../auth-ui.js (logowanie dziala po zmianie jezyka).

Uruchom z katalogu 'wersja zarobkowa':
    python tymczasowe/fix-localized-pages.py
"""
import re
from pathlib import Path

LOCALES = ['pl', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'cs', 'uk']

LEARN = {
    'pl': 'Dowiedz się więcej',
    'de': 'Mehr erfahren',
    'fr': 'En savoir plus',
    'es': 'Saber más',
    'it': 'Scopri di più',
    'pt': 'Saiba mais',
    'nl': 'Meer informatie',
    'cs': 'Zjistit více',
    'uk': 'Дізнатися більше',
}

GUIDE_SLUG = {'EAN13': 'ean-13', 'UPC': 'upc-a', 'CODE128': 'code-128', 'CODE39': 'code-39'}
FORMAT_NAME = {'EAN13': 'EAN-13', 'EAN8': 'EAN-8', 'UPC': 'UPC-A',
               'CODE128': 'Code 128', 'CODE39': 'Code 39', 'QR': 'QR Code'}
ORDER = ['EAN13', 'EAN8', 'UPC', 'CODE128', 'CODE39', 'QR']

FOUC = (
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    '    <script>\n'
    "        // Apply saved theme before first paint to avoid a flash of the wrong theme\n"
    "        (function(){try{var t=localStorage.getItem('barcode-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();\n"
    '    </script>'
)
VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1.0">'

HEADER_RE = re.compile(
    r'<header class="animated-header">\s*(.*?)\s*<div class="header-decoration">',
    re.DOTALL,
)
SEO_RE = re.compile(
    r'\n\s*<section class="popular-section seo-links".*?</section>',
    re.DOTALL,
)
ANALYTICS_RE = re.compile(r'(<script src="\.\./analytics\.js[^"]*"[^>]*></script>)')


def topbar_repl(match):
    inner = match.group(1)
    return (
        '<div class="topbar" role="region" aria-label="Site controls">\n'
        '            <div class="topbar__left">\n'
        '                ' + inner + '\n'
        '            </div>\n'
        '            <div class="topbar__right">\n'
        '                <!-- auth-controls injected here by auth-ui.js -->\n'
        '            </div>\n'
        '        </div>\n'
        '        <header class="animated-header">\n'
        '            <div class="header-decoration">'
    )


def wrap_card(html, fmt, locale):
    pat = re.compile(
        r'<button type="button" class="popular-card" data-format="' + fmt + r'"[^>]*>.*?</button>',
        re.DOTALL,
    )

    def repl(m):
        btn = m.group(0)
        if fmt in GUIDE_SLUG:
            learn = LEARN[locale]
            href = f'/{locale}/{GUIDE_SLUG[fmt]}/'
            aria = f'{learn}: {FORMAT_NAME[fmt]}'
            link = f'<a class="popular-card__more" href="{href}" aria-label="{aria}">{learn}</a>'
            return f'<div class="popular-card-wrap">{btn}{link}</div>'
        return f'<div class="popular-card-wrap">{btn}</div>'

    new_html, n = pat.subn(repl, html, count=1)
    if n != 1:
        raise RuntimeError(f'  ! karta {fmt} nie znaleziona')
    return new_html


def transform(path: Path, locale: str):
    html = path.read_text(encoding='utf-8')
    changes = []

    # 1. anty-FOUC
    if 'barcode-theme' not in html:
        html2 = html.replace(VIEWPORT, FOUC, 1)
        if html2 == html:
            raise RuntimeError('  ! viewport meta nie znaleziony')
        html = html2
        changes.append('fouc')

    # 2. header -> topbar
    html2, n = HEADER_RE.subn(topbar_repl, html, count=1)
    if n != 1:
        raise RuntimeError('  ! blok header nie znaleziony')
    html = html2
    changes.append('topbar')

    # 3. karty popular + learn-more
    for fmt in ORDER:
        html = wrap_card(html, fmt, locale)
    changes.append('cards')

    # 4. usun seo-links
    html2, n = SEO_RE.subn('', html, count=1)
    if n != 1:
        raise RuntimeError('  ! sekcja seo-links nie znaleziona')
    html = html2
    changes.append('seo-removed')

    # 5. auth-ui.js
    if '../auth-ui.js' not in html:
        html2, n = ANALYTICS_RE.subn(
            r'\1\n    <script type="module" src="../auth-ui.js?v=20260613130000"></script>',
            html, count=1,
        )
        if n != 1:
            raise RuntimeError('  ! skrypt analytics nie znaleziony')
        html = html2
        changes.append('auth-ui')

    path.write_text(html, encoding='utf-8', newline='\n')
    print(f'OK {locale}: {", ".join(changes)}')


def main():
    base = Path(__file__).resolve().parent.parent
    for locale in LOCALES:
        path = base / locale / 'index.html'
        if not path.exists():
            print(f'BRAK {path}')
            continue
        transform(path, locale)


if __name__ == '__main__':
    main()
