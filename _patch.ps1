$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$files = @(
    'decoder.html',
    'pl/decoder.html','de/decoder.html','fr/decoder.html','es/decoder.html',
    'it/decoder.html','pt/decoder.html','nl/decoder.html','cs/decoder.html','uk/decoder.html'
) | ForEach-Object { Join-Path $root $_ }

$base = 'https://barcode-generator.daytodayapps-contact.workers.dev'
$script:newHreflang = @(
    "    <link rel=`"alternate`" hreflang=`"en`" href=`"$base/decoder.html`">"
    "    <link rel=`"alternate`" hreflang=`"pl`" href=`"$base/pl/decoder.html`">"
    "    <link rel=`"alternate`" hreflang=`"de`" href=`"$base/de/decoder.html`">"
    "    <link rel=`"alternate`" hreflang=`"fr`" href=`"$base/fr/decoder.html`">"
    "    <link rel=`"alternate`" hreflang=`"es`" href=`"$base/es/decoder.html`">"
    "    <link rel=`"alternate`" hreflang=`"it`" href=`"$base/it/decoder.html`">"
    "    <link rel=`"alternate`" hreflang=`"pt`" href=`"$base/pt/decoder.html`">"
    "    <link rel=`"alternate`" hreflang=`"nl`" href=`"$base/nl/decoder.html`">"
    "    <link rel=`"alternate`" hreflang=`"cs`" href=`"$base/cs/decoder.html`">"
    "    <link rel=`"alternate`" hreflang=`"uk`" href=`"$base/uk/decoder.html`">"
    "    <link rel=`"alternate`" hreflang=`"x-default`" href=`"$base/decoder.html`">"
) -join "`n"

foreach ($file in $files) {
    if (-not (Test-Path $file)) { Write-Host "SKIP (missing): $file"; continue }
    $content = Get-Content -Raw -Path $file -Encoding UTF8
    $orig = $content

    $hrefPattern = '(?m)^(    <link rel="alternate" hreflang="[^"]+" href="[^"]+">\r?\n){2,5}    <link rel="alternate" hreflang="x-default" href="[^"]+">'
    $evaluator = [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $script:newHreflang }
    $content = [regex]::Replace($content, $hrefPattern, $evaluator)

    if ($content -notmatch 'rel="preload"[^>]*zxing/library') {
        $preloadLine = "`n" + '    <link rel="preload" as="script" href="https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js" crossorigin>'
        $dnsPattern = '(<link rel="dns-prefetch" href="https://cdn\.jsdelivr\.net">)'
        $content = $content -replace $dnsPattern, ('$1' + $preloadLine)
    }

    $scriptPattern = '<script src="(https://cdn\.jsdelivr\.net/npm/@zxing/library@0\.21\.3/umd/index\.min\.js)"></script>'
    $content = $content -replace $scriptPattern, '<script src="$1" async></script>'

    if ($content -notmatch '<img id="preview-img"[^>]*width=') {
        $imgPattern = '(<img id="preview-img" class="preview-img" alt="[^"]*")(\s*hidden\s*/>)'
        $content = $content -replace $imgPattern, '$1 width="600" height="400"$2'
    }

    $footerPattern = '<footer style="text-align:center; padding:24px 20px; font-size:13px; color:var\(--text-secondary,#64748b\);">'
    $content = $content -replace $footerPattern, '<footer class="decoder-footer">'

    $linkPattern = '<a href="https://github\.com/zxing-js/library" rel="noopener" target="_blank" style="color:#4f46e5;">'
    $content = $content -replace $linkPattern, '<a href="https://github.com/zxing-js/library" rel="noopener noreferrer" target="_blank">'

    if ($content -ne $orig) {
        [System.IO.File]::WriteAllText($file, $content, [System.Text.UTF8Encoding]::new($false))
        Write-Host "PATCHED: $file"
    } else {
        Write-Host "NOP: $file"
    }
}
