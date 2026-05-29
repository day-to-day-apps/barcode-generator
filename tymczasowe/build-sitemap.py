from pathlib import Path
from datetime import date
from xml.sax.saxutils import escape

root = Path(r"C:/Users/staz03/Desktop/Copilot Testy/Generator kodów kreskowych/wersja zarobkowa")
base = "https://barcode-generator.daytodayapps.com"
formats = {"ean-13", "code-128", "upc-a", "code-39", "itf-14", "codabar"}

pages = []

def page_entry(group, locale, url, priority):
    pages.append({"group": group, "locale": locale, "url": url, "priority": priority})

for path in root.rglob("*.html"):
    if path.name not in {"index.html", "decoder.html"}:
        continue
    rel = path.relative_to(root).as_posix()
    segments = rel.split("/")
    if len(segments) == 1:
        if path.name == "index.html":
            page_entry("home", "en", f"{base}/", "1.0")
        else:
            page_entry("decoder", "en", f"{base}/decoder.html", "0.9")
        continue
    if len(segments) == 2:
        first, second = segments
        if second == "index.html":
            if first in formats:
                page_entry(f"format:{first}", "en", f"{base}/{first}/", "0.7")
            else:
                page_entry("home", first, f"{base}/{first}/", "1.0")
        elif second == "decoder.html":
            page_entry("decoder", first, f"{base}/{first}/decoder.html", "0.9")
        continue
    if len(segments) == 3 and segments[2] == "index.html":
        locale, fmt, _ = segments
        page_entry(f"format:{fmt}", locale, f"{base}/{locale}/{fmt}/", "0.7")
        continue

# group pages by group
pages_by_group = {}
for p in pages:
    pages_by_group.setdefault(p["group"], []).append(p)

output = ["<?xml version=\"1.0\" encoding=\"UTF-8\"?>", '<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:xhtml=\"http://www.w3.org/1999/xhtml\">']

def build_alternates(group_pages):
    return sorted(group_pages, key=lambda p: p["locale"])

for group in sorted(pages_by_group):
    group_pages = sorted(pages_by_group[group], key=lambda p: (p["locale"], p["url"]))
    default = next((p["url"] for p in group_pages if p["locale"] == "en"), group_pages[0]["url"])
    for page in group_pages:
        output.append("    <url>")
        output.append(f"        <loc>{escape(page['url'])}</loc>")
        for alt in build_alternates(group_pages):
            output.append(f"        <xhtml:link rel=\"alternate\" hreflang=\"{escape(alt['locale'])}\" href=\"{escape(alt['url'])}\"/>")
        output.append(f"        <xhtml:link rel=\"alternate\" hreflang=\"x-default\" href=\"{escape(default)}\"/>")
        output.append(f"        <lastmod>{date.today().isoformat()}</lastmod>")
        output.append(f"        <changefreq>monthly</changefreq>")
        output.append(f"        <priority>{escape(page['priority'])}</priority>")
        output.append("    </url>")

output.append("</urlset>")
(Path(root) / "sitemap.xml").write_text("\n".join(output) + "\n", encoding="utf8")
print(f"Sitemap built: total={len(output)} lines, loc={sum(1 for line in output if '<loc>' in line)}")
