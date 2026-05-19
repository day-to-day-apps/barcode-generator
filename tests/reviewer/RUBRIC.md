# Rubryka recenzji (RUBRIC.md)

Recenzent ocenia wyłącznie na podstawie artefaktów w `tests/artifacts/`. Maks. **100 pkt**, próg zaliczenia **70 pkt**.

## Osie oceny (4 × 25 pkt)

### A. Dostępność (a11y) — 25 pkt
Źródło: `axe.json` w każdym katalogu artefaktu.
- **25** — zero naruszeń `critical` we wszystkich scenariuszach.
- **20** — 1–2 naruszenia `critical` łącznie.
- **10** — 3–5 naruszeń `critical` lub >10 `serious`.
- **0** — >5 naruszeń `critical` lub brak `axe.json`.

### B. Higiena konsoli + sieć — 25 pkt
Źródło: `console.jsonl`, `network-errors.jsonl`.
- **25** — zero `console.error` / `pageerror` / 5xx; ≤2 wpisy 4xx (np. brak favicon).
- **20** — 1–3 błędy konsoli LUB 1–3 wpisy 4xx/5xx łącznie.
- **10** — 4–10 błędów łącznie.
- **0** — >10 błędów lub `pageerror` (uncaught exception).

### C. Integralność wizualna — 25 pkt
Źródło: `full-page.png` (light + dark), `meta.json.viewport`.
- **25** — żadnych obciętych elementów, brak nakładających się tekstów, dropdowny czytelne w light/dark, brak białych prostokątów w dark mode.
- **20** — 1 drobna regresja wizualna (np. odstęp).
- **10** — kontrast tekstu < 4.5:1 widoczny gołym okiem LUB element pozapozycyjny.
- **0** — pusta strona / fragment obcięty / dark mode niedziała.

### D. Spójność lokalna (PL ↔ EN) — 25 pkt
Źródło: porównanie `tests/artifacts/pl/**` vs `tests/artifacts/en/**` dla tych samych `scenario` i `viewport`.
- **25** — identyczna struktura, brak nieprzetłumaczonych ciągów w EN, brak nakładających się długich tłumaczeń.
- **20** — 1–2 brakujące tłumaczenia.
- **10** — >2 brakujące tłumaczenia LUB widoczny untranslated key (`gen_*`).
- **0** — strona EN renderuje PL fallback w połowie tekstów.

## Reguły zachowania recenzenta

1. Recenzent **NIE wolno** czytać plików spoza `tests/artifacts/` oraz `tests/reviewer/`. Lista zabroniona: `FORBIDDEN.json`.
2. Każdy odczytany plik MUSI być wymieniony w `REVIEW.md → ## Audit Log`.
3. Brak zaglądania do kodu źródłowego = brak halo-effect.
4. Wynik końcowy = suma 4 osi; werdykt: `PASS ≥70`, `FAIL <70`.
5. Recenzent raportuje TOP-5 najpoważniejszych problemów z odniesieniem do konkretnego pliku artefaktu (ścieżka względna).
