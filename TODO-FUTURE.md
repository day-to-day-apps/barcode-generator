# TODO — Future Improvements

Odłożone na później zmiany, które wymagają dodatkowej pracy lub koordynacji.

## Security / Headers

### Content-Security-Policy
**Status:** Odłożone — wymaga koordynacji z AdSense.

Aktualnie brak `Content-Security-Policy` w `_headers`. Przed dodaniem CSP trzeba:
1. Zinwentaryzować wszystkie zewnętrzne domeny (obecnie: `cdn.jsdelivr.net`, `flagcdn.com`, `fonts.googleapis.com`, `fonts.gstatic.com`).
2. Sprawdzić czy docelowo zostanie wdrożony Google AdSense — jeśli tak, CSP musi zawierać:
   - `script-src` + domeny Googla (`*.google.com`, `*.googleadservices.com`, `*.googlesyndication.com`, `*.doubleclick.net`)
   - `frame-src`/`child-src` dla iframe'ów reklam
   - `img-src` dla kreacji
   - Trzeba też zdecydować w sprawie `unsafe-inline` vs nonce
3. Przetestować na staging przed deployem produkcyjnym — CSP łatwo zepsuć analytics i reklamy.

Proponowany minimalny CSP (bez AdSense):

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src 'self' data: https://flagcdn.com; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```

### Inne nagłówki do rozważenia
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`

## i18n — brakujące klucze dekodera

`i18n.js` **nie zawiera** kluczy dekodera (`decoder_decoding`, `decoder_not_found`, `decoder_invalid_file`, `decoder_too_large`, `decoder_copied`, `decoder_copy_failed`, `decoder_format_label`, `decoder_value_label`). Dekoder używa fallbacków w `decoder.js`, więc we wszystkich językach innych niż angielski komunikaty są po angielsku.

Do zrobienia: dodać tłumaczenia dla 10 języków (pl, de, fr, es, it, pt, nl, cs, uk) dla w/w 8 kluczy.

## FAQ + HowTo (dekoder)

Sekcje FAQ/HowTo (Schema.org FAQPage, HowTo) są obecnie dostępne tylko w `index.html` / `pl/index.html`. Decoder nie ma własnej strukturyzacji Schema.org poza WebApplication JSON-LD.

Do zrobienia:
- Dodać `FAQPage` JSON-LD na `decoder.html` (pytania typu „Jakie formaty obsługuje?”, „Czy moje zdjęcia są wysyłane na serwer?”, „Dlaczego nie wykrywa kodu?”).
- Rozważyć `HowTo` („Jak odczytać kod kreskowy ze zdjęcia: 3 kroki”).
- Tłumaczenia dla 10 języków.

## Dekoder — nowe funkcje (opcjonalne)

- **Dropdown 10-języków** na stronach dekodera — obecnie w większości wersji są tylko 2-3 opcje. Skopiować pełny dropdown z `index.html`.
- **Deep-link do generatora** — przycisk „Otwórz w generatorze" po dekodowaniu, przekazujący wartość przez query param (`?value=...&type=...`).
- **Kamera na żywo** — `getUserMedia()` + `ZXing.decodeFromVideoDevice()`. Duża funkcja, ale zwiększyłaby atrakcyjność.
- **Historia ostatnich skanowań** — localStorage, max 10 pozycji, z przyciskiem „Wyczyść historię".

## Audyt w przeglądarce

Audyt statyczny wyłapał dużo, ale niektóre problemy wymagają runtime:
- Layout shift (CLS) — zmierzyć przez Lighthouse / PageSpeed Insights po deployu
- FPS animacji (`meshRotate`, `scanSweep`) na słabszych urządzeniach
- Rzeczywisty kontrast po renderze z gradientami w tle (1.4.3 WCAG)
- Czy `@zxing/library` z `async` ładuje się przed pierwszą interakcją (w praktyce tak, ale warto potwierdzić)
- Test na iOS Safari (clipboard paste może wymagać fallbacku)

Do zrobienia: uruchomić Lighthouse CI lub Chrome DevTools MCP i zweryfikować CWV po deployu.

## Kosmetyka

- Usunąć meta `keywords` z dekoderów (przestarzałe, zero wartości SEO).
- Sprawdzić czy w `styles.css` nie ma duplikatów sekcji FAQ/HowTo (audyt zgłosił podejrzenie).
- Rozważyć zmianę nazw plików przy dużych refaktorach CSS, żeby obejść agresywny cache `styles.css` (`max-age=31536000, immutable` w `_headers`).
