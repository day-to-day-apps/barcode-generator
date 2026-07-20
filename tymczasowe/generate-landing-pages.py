from pathlib import Path
from datetime import date

root = Path(r'C:/Users/staz03/Desktop/Copilot Testy/Generator kodów kreskowych/wersja zarobkowa')
base_url = 'https://barcode-generator.daytodayapps.com'
force_overwrite = True
formats = {
    'code-128': {
        'label': 'Code 128',
        'short': 'Code 128',
        'desc': 'High-density alphanumeric barcode for shipping, logistics and GS1-128.',
        'hero': 'Generate a compact Code 128 barcode for inventory, labels and shipments.',
        'features': [
            'Supports full ASCII 0–127 characters.',
            'Automatic subset selection: A, B or C for best density.',
            'Mod-103 checksum added automatically.',
            'Great for logistics, shipping labels and warehouse tracking.'
        ],
        'use_cases': [
            'Shipping and courier labels for UPS, FedEx and DHL.',
            'Warehouse and inventory tracking.',
            'Product IDs, packaging and pallet labels.',
            'GS1-128 application identifier barcodes.'
        ]
    },
    'upc-a': {
        'label': 'UPC-A',
        'short': 'UPC-A',
        'desc': '12-digit retail barcode used in supermarkets and global commerce.',
        'hero': 'Generate a retail-quality UPC-A barcode for store shelves and product packaging.',
        'features': [
            'Standard 12-digit UPC retail barcode.',
            'Includes automatic checksum validation.',
            'Widely supported by POS scanners worldwide.',
            'Perfect for retail products, inventory and packing slips.'
        ],
        'use_cases': [
            'Supermarket and retail product labels.',
            'Barcode tags for consumer goods.',
            'Price and inventory management.',
            'UPC-to-EAN conversion for international sales.'
        ]
    },
    'code-39': {
        'label': 'Code 39',
        'short': 'Code 39',
        'desc': 'Variable-length alphanumeric barcode for industrial and inventory use.',
        'hero': 'Generate a reliable Code 39 barcode for inventory, access cards and logistics.',
        'features': [
            'Supports letters, digits and a few special characters.',
            'Variable length with optional checksum.',
            'Human-readable text can appear below the bars.',
            'Common in automotive, manufacturing and warehouse systems.'
        ],
        'use_cases': [
            'Inventory and asset tags.',
            'Warehouse bin labels.',
            'Maintenance and access control badges.',
            'Legacy industrial barcode systems.'
        ]
    },
    'itf-14': {
        'label': 'ITF-14',
        'short': 'ITF-14',
        'desc': '14-digit packaging barcode for shipping cases, cartons and outer packs.',
        'hero': 'Create an ITF-14 barcode for case packaging, cartons and logistics cartons.',
        'features': [
            '14-digit GS1 trade item barcode.',
            'Designed for outer packaging and cases.',
            'Uses Interleaved 2 of 5 encoding.',
            'Includes bearer bars for reliable scanning.'
        ],
        'use_cases': [
            'Case and carton packaging for distribution.',
            'Warehouse shipment labels.',
            'Retail case tracking and pallet manifesting.',
            'Logistics and GS1 supply chain applications.'
        ]
    },
    'codabar': {
        'label': 'Codabar',
        'short': 'Codabar',
        'desc': 'Simple numeric barcode used in libraries, blood banks and parcel services.',
        'hero': 'Generate a Codabar barcode for historical systems, library labels and laboratory samples.',
        'features': [
            'Simple numeric barcode with start/stop characters.',
            'Easy to print on low-resolution label printers.',
            'Often used in libraries, blood banks and shipping.',
            'Supports fast scanning in legacy systems.'
        ],
        'use_cases': [
            'Library book labels and media inventory.',
            'Blood bank and medical sample tracking.',
            'Parcel and courier labels.',
            'Legacy logistic and manufacturing systems.'
        ]
    }
}

descriptions_i18n = {
    'pl': {
        'code-128': 'Gęsty kod alfanumeryczny do wysyłki, logistyki i GS1-128.',
        'upc-a': '12-cyfrowy kod detaliczny używany w supermarketach i handlu międzynarodowym.',
        'code-39': 'Kod alfanumeryczny o zmiennej długości do zastosowań przemysłowych i ewidencji.',
        'itf-14': '14-cyfrowy kod opakowań zbiorczych, kartonów i jednostek wysyłkowych.',
        'codabar': 'Prosty kod numeryczny używany w bibliotekach, bankach krwi i usługach kurierskich.',
    },
    'de': {
        'code-128': 'Dichter alphanumerischer Barcode für Versand, Logistik und GS1-128.',
        'upc-a': '12-stelliger Einzelhandelsbarcode für Supermärkte und den weltweiten Handel.',
        'code-39': 'Alphanumerischer Barcode variabler Länge für Industrie und Bestandsführung.',
        'itf-14': '14-stelliger Verpackungsbarcode für Versandkartons und Umverpackungen.',
        'codabar': 'Einfacher numerischer Barcode für Bibliotheken, Blutbanken und Paketdienste.',
    },
    'fr': {
        'code-128': 'Code-barres alphanumérique dense pour l’expédition, la logistique et GS1-128.',
        'upc-a': 'Code-barres de vente à 12 chiffres utilisé en supermarché et dans le commerce mondial.',
        'code-39': 'Code-barres alphanumérique de longueur variable pour l’industrie et les stocks.',
        'itf-14': 'Code-barres d’emballage à 14 chiffres pour caisses, cartons et suremballages.',
        'codabar': 'Code-barres numérique simple utilisé en bibliothèque, banque du sang et messagerie.',
    },
    'es': {
        'code-128': 'Código de barras alfanumérico denso para envíos, logística y GS1-128.',
        'upc-a': 'Código minorista de 12 dígitos usado en supermercados y comercio internacional.',
        'code-39': 'Código alfanumérico de longitud variable para industria e inventario.',
        'itf-14': 'Código de embalaje de 14 dígitos para cajas y paquetes exteriores.',
        'codabar': 'Código numérico sencillo usado en bibliotecas, bancos de sangre y paquetería.',
    },
    'it': {
        'code-128': 'Codice a barre alfanumerico ad alta densità per spedizioni, logistica e GS1-128.',
        'upc-a': 'Codice retail a 12 cifre usato nei supermercati e nel commercio globale.',
        'code-39': 'Codice alfanumerico a lunghezza variabile per industria e inventario.',
        'itf-14': 'Codice per imballaggi a 14 cifre per casse, cartoni e confezioni esterne.',
        'codabar': 'Codice numerico semplice usato in biblioteche, banche del sangue e spedizioni.',
    },
    'pt': {
        'code-128': 'Código de barras alfanumérico de alta densidade para envios, logística e GS1-128.',
        'upc-a': 'Código de varejo de 12 dígitos usado em supermercados e no comércio global.',
        'code-39': 'Código alfanumérico de comprimento variável para indústria e inventário.',
        'itf-14': 'Código de embalagem de 14 dígitos para caixas e pacotes externos.',
        'codabar': 'Código numérico simples usado em bibliotecas, bancos de sangue e encomendas.',
    },
    'nl': {
        'code-128': 'Compacte alfanumerieke barcode voor verzending, logistiek en GS1-128.',
        'upc-a': '12-cijferige retailbarcode voor supermarkten en internationale handel.',
        'code-39': 'Alfanumerieke barcode met variabele lengte voor industrie en voorraadbeheer.',
        'itf-14': '14-cijferige verpakkingsbarcode voor verzenddozen en omverpakkingen.',
        'codabar': 'Eenvoudige numerieke barcode voor bibliotheken, bloedbanken en pakketdiensten.',
    },
    'cs': {
        'code-128': 'Hustý alfanumerický kód pro přepravu, logistiku a GS1-128.',
        'upc-a': '12místný maloobchodní kód používaný v supermarketech a světovém obchodu.',
        'code-39': 'Alfanumerický kód s proměnnou délkou pro průmysl a evidenci zásob.',
        'itf-14': '14místný obalový kód pro přepravní bedny, kartony a vnější obaly.',
        'codabar': 'Jednoduchý číselný kód používaný v knihovnách, krevních bankách a balíkových službách.',
    },
    'uk': {
        'code-128': 'Щільний алфавітно-цифровий штрихкод для доставки, логістики та GS1-128.',
        'upc-a': '12-значний роздрібний штрихкод для супермаркетів і міжнародної торгівлі.',
        'code-39': 'Алфавітно-цифровий штрихкод змінної довжини для промисловості й обліку запасів.',
        'itf-14': '14-значний код пакування для транспортних коробів, картонів і зовнішніх упаковок.',
        'codabar': 'Простий цифровий штрихкод для бібліотек, банків крові та служб доставки.',
    },
}

locale_strings = {
    'en': {
        'lang': 'en',
        'title': '{format} Barcode Generator — Free Online',
        'description': 'Free {format} barcode generator. {desc} Export PNG/SVG, print labels. No registration.',
        'hero_head': 'Generate {format} barcodes in seconds',
        'hero_lead': 'Create a high-quality {format} barcode in seconds. Export PNG/SVG, print labels, and use it in shipping, inventory and product tracking.',
        'cta': 'Open {format} Generator',
        'why': 'Why choose {format}?',
        'section1': 'Fast {format} generation with automatic validation.',
        'section2': 'Perfect for printing labels, packing slips and product tags.',
        'section3': 'Use {format} for inventory, logistics and retail tracking.',
        'faq_title': 'Frequently asked questions',
        'faq': [
            ('What characters does {format} support?', 'Most {format} standards support alphanumeric characters and a small set of symbols. This generator validates the correct character set automatically.'),
            ('Is {format} suitable for shipping labels?', 'Yes. {format} is widely used in shipping, logistics and warehouse applications where compact and reliable barcodes are required.'),
            ('How do I export {format} as PNG or SVG?', 'Use the export controls on the page to download your barcode as PNG or SVG. The generated barcode stays sharp and print-ready.'),
            ('Can scanners read {format}?', 'Yes. {format} is supported by most 1D barcode scanners, smartphone scanning apps and industrial readers.'),
            ('Is this generator free?', 'Yes. This {format} barcode generator is 100% free to use, with no registration or watermark.')
        ]
    },
    'pl': {
        'lang': 'pl',
        'title': 'Generator kodów {format} — darmowy, online',
        'description': 'Darmowy generator kodów {format}. {desc} Eksport PNG/SVG, druk etykiet. Bez rejestracji.',
        'hero_head': 'Wygeneruj kod {format} w kilka sekund',
        'hero_lead': 'Utwórz kod {format} szybko. Eksportuj do PNG/SVG, drukuj etykiety i używaj go w wysyłce, magazynie oraz śledzeniu produktów.',
        'cta': 'Otwórz generator {format}',
        'why': 'Dlaczego warto użyć {format}?',
        'section1': 'Szybkie generowanie z automatyczną walidacją.',
        'section2': 'Idealny do drukowania etykiet, listów przewozowych i znaczników produktowych.',
        'section3': 'Wykorzystaj {format} do magazynowania, logistyki i sprzedaży detalicznej.',
        'faq_title': 'Najczęściej zadawane pytania',
        'faq': [
            ('Jakie znaki obsługuje {format}?', 'Większość standardów {format} obsługuje znaki alfanumeryczne i kilka symboli. Generator automatycznie sprawdza poprawność zestawu znaków.'),
            ('Czy {format} nadaje się na etykiety wysyłkowe?', 'Tak. {format} jest powszechnie stosowany w wysyłce, logistyce i magazynowaniu, gdy potrzebny jest zwarty i niezawodny kod kreskowy.'),
            ('Jak wyeksportować {format} do PNG lub SVG?', 'Użyj opcji eksportu na stronie, aby pobrać kod jako PNG lub SVG. Wygenerowany kod jest gotowy do druku.'),
            ('Czy skanery odczytają {format}?', 'Tak. {format} obsługują większość skanerów 1D, aplikacji do skanowania na smartfonach i czytników przemysłowych.'),
            ('Czy ten generator jest darmowy?', 'Tak. Ten generator kodów {format} jest w pełni darmowy, bez rejestracji i bez znaku wodnego.')
        ]
    },
    'de': {
        'lang': 'de',
        'title': '{format} Barcode Generator — kostenlos online',
        'description': 'Kostenloser {format}-Generator. {desc} Export als PNG/SVG, Etikettendruck. Ohne Anmeldung.',
        'hero_head': 'Erzeuge {format}-Barcodes in Sekunden',
        'hero_lead': 'Erstelle einen hochwertigen {format}-Barcode in Sekunden. Exportiere PNG/SVG, drucke Etiketten und nutze ihn für Versand, Lager und Produktverfolgung.',
        'cta': '{format}-Generator öffnen',
        'why': 'Warum {format}?',
        'section1': 'Schnelle Generierung mit automatischer Validierung.',
        'section2': 'Perfekt zum Drucken von Etiketten, Packzetteln und Produktmarken.',
        'section3': 'Verwenden Sie {format} für Logistik, Lager und Einzelhandel.',
        'faq_title': 'Häufig gestellte Fragen',
        'faq': [
            ('Welche Zeichen unterstützt {format}?', 'Die meisten {format}-Standards unterstützen alphanumerische Zeichen und wenige Symbole. Der Generator prüft automatisch die richtige Zeichenauswahl.'),
            ('Ist {format} für Versandetiketten geeignet?', 'Ja. {format} wird häufig in Versand, Logistik und Lager eingesetzt, wenn kompakte und zuverlässige Barcodes benötigt werden.'),
            ('Wie exportiere ich {format} als PNG oder SVG?', 'Verwenden Sie die Exportfunktionen auf der Seite, um Ihren Barcode als PNG oder SVG herunterzuladen. Der Barcode ist druckbereit.'),
            ('Können Scanner {format} lesen?', 'Ja. {format} wird von den meisten 1D-Scannern, Smartphone-Scan-Apps und Industrielesern unterstützt.'),
            ('Ist dieser Generator kostenlos?', 'Ja. Dieser {format}-Generator ist völlig kostenlos, ohne Registrierung und ohne Wasserzeichen.')
        ]
    },
    'fr': {
        'lang': 'fr',
        'title': 'Générateur de codes-barres {format} — gratuit en ligne',
        'description': 'Générateur gratuit de {format}. {desc} Export PNG/SVG, impression d’étiquettes. Sans inscription.',
        'hero_head': 'Générez des codes-barres {format} en quelques secondes',
        'hero_lead': 'Créez un code-barres {format} de haute qualité en quelques secondes. Exportez PNG/SVG, imprimez des étiquettes et utilisez-le pour l’expédition, l’inventaire et le suivi des produits.',
        'cta': 'Ouvrir le générateur {format}',
        'why': 'Pourquoi utiliser {format}?',
        'section1': 'Génération rapide avec validation automatique.',
        'section2': 'Parfait pour l’impression d’étiquettes, bons de livraison et étiquettes produit.',
        'section3': 'Utilisez {format} pour la logistique, l’inventaire et le commerce de détail.',
        'faq_title': 'Questions fréquentes',
        'faq': [
            ('Quels caractères {format} prend-il en charge ?', 'La plupart des normes {format} prennent en charge des caractères alphanumériques et quelques symboles. Le générateur vérifie automatiquement le jeu de caractères correct.'),
            ('{format} convient-il aux étiquettes d’expédition ?', 'Oui. {format} est largement utilisé dans l’expédition, la logistique et l’entrepôt lorsqu’un code-barres compact et fiable est nécessaire.'),
            ('Comment exporter {format} en PNG ou SVG ?', 'Utilisez les options d’export sur la page pour télécharger votre code-barres au format PNG ou SVG. Le code est prêt à l’impression.'),
            ('Les lecteurs peuvent-ils lire {format}?', 'Oui. {format} est pris en charge par la plupart des lecteurs de codes-barres 1D, des applications de numérisation pour smartphone et des lecteurs industriels.'),
            ('Ce générateur est-il gratuit ?', 'Oui. Ce générateur de {format} est 100 % gratuit, sans inscription et sans filigrane.')
        ]
    },
    'es': {
        'lang': 'es',
        'title': 'Generador de códigos {format} — gratis, en línea',
        'description': 'Generador gratuito de {format}. {desc} Exporta PNG/SVG, imprime etiquetas. Sin registro.',
        'hero_head': 'Genera códigos {format} en segundos',
        'hero_lead': 'Crea un código {format} de alta calidad en segundos. Exporta PNG/SVG, imprime etiquetas y úsalo en envíos, inventario y seguimiento de productos.',
        'cta': 'Abrir generador {format}',
        'why': '¿Por qué usar {format}?',
        'section1': 'Generación rápida con validación automática.',
        'section2': 'Perfecto para imprimir etiquetas, albaranes y etiquetas de producto.',
        'section3': 'Usa {format} para logística, inventario y comercio minorista.',
        'faq_title': 'Preguntas frecuentes',
        'faq': [
            ('¿Qué caracteres admite {format}?', 'La mayoría de los estándares {format} admiten caracteres alfanuméricos y algunos símbolos. El generador valida automáticamente el conjunto de caracteres correcto.'),
            ('¿{format} es adecuado para etiquetas de envío?', 'Sí. {format} se utiliza ampliamente en envíos, logística y almacén cuando se necesita un código de barras compacto y fiable.'),
            ('¿Cómo exporto {format} a PNG o SVG?', 'Usa las opciones de exportación de la página para descargar tu código como PNG o SVG. El código es listo para imprimir.'),
            ('¿Los escáneres pueden leer {format}?', 'Sí. {format} es compatible con la mayoría de los escáneres 1D, aplicaciones de escaneo móviles y lectores industriales.'),
            ('¿Este generador es gratis?', 'Sí. Este generador {format} es 100 % gratuito, sin registro y sin marca de agua.')
        ]
    },
    'it': {
        'lang': 'it',
        'title': 'Generatore di codici a barre {format} — gratuito, online',
        'description': 'Generatore gratuito di {format}. {desc} Esporta PNG/SVG, stampa etichette. Senza registrazione.',
        'hero_head': 'Genera codici {format} in pochi secondi',
        'hero_lead': 'Crea un codice {format} di alta qualità in pochi secondi. Esporta PNG/SVG, stampa etichette e usalo in spedizioni, magazzino e tracciamento prodotti.',
        'cta': 'Apri il generatore {format}',
        'why': 'Perché usare {format}?',
        'section1': 'Generazione veloce con convalida automatica.',
        'section2': 'Perfetto per stampare etichette, bolle di spedizione e tag prodotto.',
        'section3': 'Usa {format} per logistica, inventario e retail.',
        'faq_title': 'Domande frequenti',
        'faq': [
            ('Quali caratteri supporta {format}?', 'La maggior parte degli standard {format} supporta caratteri alfanumerici e pochi simboli. Il generatore verifica automaticamente il set di caratteri corretto.'),
            ('{format} è adatto per le etichette di spedizione?', 'Sì. {format} è ampiamente utilizzato in spedizioni, logistica e magazzino quando serve un codice compatto e affidabile.'),
            ('Come esporto {format} in PNG o SVG?', 'Usa le opzioni di esportazione nella pagina per scaricare il codice come PNG o SVG. Il codice è pronto per la stampa.'),
            ('Gli scanner possono leggere {format}?', 'Sì. {format} è supportato dalla maggior parte degli scanner 1D, app di scansione per smartphone e lettori industriali.'),
            ('Questo generatore è gratuito?', 'Sì. Questo generatore {format} è completamente gratuito, senza registrazione e senza watermark.')
        ]
    },
    'pt': {
        'lang': 'pt',
        'title': 'Gerador de código de barras {format} — grátis online',
        'description': 'Gerador gratuito de {format}. {desc} Exporte PNG/SVG, imprima etiquetas. Sem registro.',
        'hero_head': 'Gere códigos {format} em segundos',
        'hero_lead': 'Crie um código {format} de alta qualidade em segundos. Exporte PNG/SVG, imprima etiquetas e use em envios, estoque e rastreamento de produtos.',
        'cta': 'Abrir gerador {format}',
        'why': 'Por que usar {format}?',
        'section1': 'Geração rápida com validação automática.',
        'section2': 'Perfeito para imprimir etiquetas, guias de remessa e tags de produtos.',
        'section3': 'Use {format} para logística, inventário e varejo.',
        'faq_title': 'Perguntas frequentes',
        'faq': [
            ('Quais caracteres {format} suporta?', 'A maioria dos padrões {format} suporta caracteres alfanuméricos e alguns símbolos. O gerador valida automaticamente o conjunto correto.'),
            ('{format} é adequado para etiquetas de envio?', 'Sim. {format} é muito usado em remessas, logística e armazém quando se precisa de um código compacto e confiável.'),
            ('Como exporto {format} para PNG ou SVG?', 'Use os controles de exportação na página para baixar seu código como PNG ou SVG. O código fica pronto para impressão.'),
            ('Leitores conseguem ler {format}?', 'Sim. {format} é suportado pela maioria dos leitores 1D, apps de escaneamento para celular e leitores industriais.'),
            ('Este gerador é gratuito?', 'Sim. Este gerador de {format} é 100% gratuito, sem registro e sem marca d’água.')
        ]
    },
    'nl': {
        'lang': 'nl',
        'title': '{format} Barcode Generator — gratis online',
        'description': 'Gratis {format}-generator. {desc} Exporteer PNG/SVG, print labels. Geen registratie.',
        'hero_head': 'Genereer {format}-barcodes in seconden',
        'hero_lead': 'Maak een hoogwaardige {format}-barcode in seconden. Exporteer PNG/SVG, print labels en gebruik deze voor verzending, voorraad en producttracking.',
        'cta': 'Open {format}-generator',
        'why': 'Waarom {format}?',
        'section1': 'Snelle generatie met automatische validatie.',
        'section2': 'Perfect voor het printen van labels, pakbonnen en productlabels.',
        'section3': 'Gebruik {format} voor logistiek, magazijn en retail.',
        'faq_title': 'Veelgestelde vragen',
        'faq': [
            ('Welke tekens ondersteunt {format}?', 'De meeste {format}-standaarden ondersteunen alfanumerieke tekens en een paar symbolen. De generator controleert automatisch het juiste tekenreeks.'),
            ('Is {format} geschikt voor verzendetiketten?', 'Ja. {format} wordt veel gebruikt in verzending, logistiek en magazijn wanneer een compacte en betrouwbare barcode nodig is.'),
            ('Hoe exporteer ik {format} naar PNG of SVG?', 'Gebruik de exportopties op de pagina om je code te downloaden als PNG of SVG. De code is printklaar.'),
            ('Kunnen scanners {format} lezen?', 'Ja. {format} wordt ondersteund door de meeste 1D-scanners, mobiele scanapps en industriële lezers.'),
            ('Is deze generator gratis?', 'Ja. Deze {format}-generator is volledig gratis, zonder registratie en zonder watermerk.')
        ]
    },
    'cs': {
        'lang': 'cs',
        'title': '{format} generátor čárových kódů — zdarma online',
        'description': 'Zdarma generátor {format}. {desc} Export do PNG/SVG, tisk štítků. Bez registrace.',
        'hero_head': 'Vygenerujte {format} čárové kody během sekund',
        'hero_lead': 'Vytvořte kvalitní {format} čárový kód během sekund. Exportujte do PNG/SVG, tiskněte štítky a používejte jej pro dopravu, sklad a sledování produktů.',
        'cta': 'Otevřít generátor {format}',
        'why': 'Proč používat {format}?',
        'section1': 'Rychlá generace s automatickou validací.',
        'section2': 'Ideální pro tisk štítků, štítků zásilek a produktových značek.',
        'section3': 'Použijte {format} pro logistiku, sklad a maloobchod.',
        'faq_title': 'Často kladené otázky',
        'faq': [
            ('Jaké znaky {format} podporuje?', 'Většina standardů {format} podporuje alfanumerické znaky a několik symbolů. Generátor automaticky kontroluje správnou sadu znaků.'),
            ('Je {format} vhodný pro přepravní štítky?', 'Ano. {format} se často používá v přepravě, logistice a ve skladu, když je potřeba kompaktní a spolehlivý čárový kód.'),
            ('Jak exportuji {format} do PNG nebo SVG?', 'Použijte exportní ovládání na stránce, abyste stáhli kód jako PNG nebo SVG. Kód je připraven k tisku.'),
            ('Dokážou čtečky přečíst {format}?', 'Ano. {format} podporuje většina čteček 1D, mobilních aplikací pro skenování a průmyslových čteček.'),
            ('Je tento generátor zdarma?', 'Ano. Tento generátor {format} je zcela zdarma, bez registrace a bez vodoznaku.')
        ]
    },
    'uk': {
        'lang': 'uk',
        'title': 'Генератор штрихкодів {format} — безкоштовно онлайн',
        'description': 'Безкоштовний генератор {format}. {desc} Експорт PNG/SVG, друк етикеток. Без реєстрації.',
        'hero_head': 'Створіть {format} штрихкод за секунди',
        'hero_lead': 'Створіть високоякісний {format} штрихкод за секунди. Експортуйте PNG/SVG, друкуйте етикетки та використовуйте для доставки, складу та відстеження продуктів.',
        'cta': 'Відкрити генератор {format}',
        'why': 'Чому {format}?',
        'section1': 'Швидке створення з автоматичною перевіркою.',
        'section2': 'Ідеально для друку етикеток, товарно-транспортних накладних та ярликів продуктів.',
        'section3': 'Використовуйте {format} для логістики, складу та роздрібної торгівлі.',
        'faq_title': 'Поширені запитання',
        'faq': [
            ('Які символи підтримує {format}?', 'Більшість стандартів {format} підтримують буквено-цифрові символи та кілька знаків. Генератор автоматично перевіряє правильний набір символів.'),
            ('Чи підходить {format} для етикеток відправлення?', 'Так. {format} широко використовується у відправленнях, логістиці та на складі, коли потрібен компактний і надійний штрихкод.'),
            ('Як експортувати {format} у PNG або SVG?', 'Використовуйте функцію експорту на сторінці, щоб завантажити код як PNG або SVG. Код готовий до друку.'),
            ('Чи можуть сканери читати {format}?', 'Так. {format} підтримується більшістю 1D сканерів, мобільних додатків для сканування та промислових зчитувачів.'),
            ('Чи цей генератор безкоштовний?', 'Так. Цей генератор {format} повністю безкоштовний, без реєстрації та без водяного знака.')
        ]
    }
}

lang_labels = {
    'en': 'English', 'pl': 'Polski', 'de': 'Deutsch', 'fr': 'Français', 'es': 'Español',
    'it': 'Italiano', 'pt': 'Português', 'nl': 'Nederlands', 'cs': 'Čeština', 'uk': 'Українська'
}

all_locales = ['en','pl','de','fr','es','it','pt','nl','cs','uk']

# Different headings per locale for sections 2 and 3 to avoid h2==p duplication.
section_headings = {
    'en': ('Use cases for {format}', 'Best practices'),
    'pl': ('Zastosowania {format}', 'Najlepsze praktyki'),
    'de': ('Anwendungsfälle für {format}', 'Best Practices'),
    'fr': ("Cas d'utilisation de {format}", 'Bonnes pratiques'),
    'es': ('Casos de uso de {format}', 'Buenas prácticas'),
    'it': ("Casi d'uso per {format}", 'Migliori pratiche'),
    'pt': ('Casos de uso de {format}', 'Boas práticas'),
    'nl': ("Gebruiksscenario's voor {format}", 'Beste praktijken'),
    'cs': ('Případy použití {format}', 'Doporučené postupy'),
    'uk': ('Сценарії використання {format}', 'Найкращі практики')
}

# PL translations of features and use cases per format.
# Other non-EN locales fall back to EN until translated.
features_pl = {
    'code-128': [
        'Obsługuje pełny zestaw ASCII 0–127.',
        'Automatyczny dobór podzbioru A, B lub C dla najlepszej gęstości.',
        'Sumę kontrolną Mod-103 dodaje automatycznie.',
        'Świetny do logistyki, etykiet wysyłkowych i magazynu.'
    ],
    'upc-a': [
        'Standardowy 12-cyfrowy kod detaliczny UPC.',
        'Automatyczna walidacja sumy kontrolnej.',
        'Szeroko wspierany przez kasy fiskalne na całym świecie.',
        'Idealny do produktów detalicznych, inwentaryzacji i dokumentów wydania.'
    ],
    'code-39': [
        'Obsługuje litery, cyfry i kilka znaków specjalnych.',
        'Zmienna długość z opcjonalną sumą kontrolną.',
        'Czytelny tekst może być umieszczony pod kreskami.',
        'Powszechny w motoryzacji, produkcji i systemach magazynowych.'
    ],
    'itf-14': [
        '14-cyfrowy kod GS1 dla jednostek handlowych.',
        'Zaprojektowany dla opakowań zbiorczych i kartonów.',
        'Używa kodowania Interleaved 2 of 5.',
        'Zawiera paski nośne dla niezawodnego skanowania.'
    ],
    'codabar': [
        'Prosty kod numeryczny ze znakami start/stop.',
        'Łatwy do druku na drukarkach etykiet o niskiej rozdzielczości.',
        'Często używany w bibliotekach, bankach krwi i wysyłce.',
        'Wspiera szybkie skanowanie w starszych systemach.'
    ]
}
use_cases_pl = {
    'code-128': [
        'Etykiety wysyłkowe i kurierskie UPS, FedEx i DHL.',
        'Śledzenie towarów w magazynie i inwentaryzacji.',
        'Identyfikatory produktów, opakowań i etykiety palet.',
        'Kody GS1-128 z identyfikatorami zastosowań.'
    ],
    'upc-a': [
        'Etykiety produktów w supermarketach i sklepach.',
        'Naklejki na towary konsumenckie.',
        'Zarządzanie cenami i stanem magazynowym.',
        'Konwersja UPC na EAN dla sprzedaży międzynarodowej.'
    ],
    'code-39': [
        'Etykiety inwentaryzacyjne i identyfikacja sprzętu.',
        'Etykiety regałów magazynowych.',
        'Karty serwisowe i identyfikatory kontroli dostępu.',
        'Starsze przemysłowe systemy kodów kreskowych.'
    ],
    'itf-14': [
        'Opakowania zbiorcze i kartony do dystrybucji.',
        'Etykiety wysyłek magazynowych.',
        'Śledzenie kartonów detalicznych i manifesty palet.',
        'Logistyka i zastosowania GS1 w łańcuchu dostaw.'
    ],
    'codabar': [
        'Etykiety książek bibliotecznych i inwentarz mediów.',
        'Banki krwi i śledzenie próbek medycznych.',
        'Etykiety przesyłek i kurierów.',
        'Starsze systemy logistyczne i produkcyjne.'
    ]
}

features_i18n = {
    'de': {
        'code-128': [
            'Unterstützt den vollständigen ASCII-Zeichensatz 0–127.',
            'Automatische Auswahl der Untermenge A, B oder C für maximale Dichte.',
            'Mod-103-Prüfsumme wird automatisch hinzugefügt.',
            'Ideal für Logistik, Versandetiketten und Lagerverfolgung.'
        ],
        'upc-a': [
            'Standard-12-stelliger UPC-Einzelhandelsbarcode.',
            'Automatische Prüfsummenvalidierung enthalten.',
            'Weltweit von POS-Scannern unterstützt.',
            'Perfekt für Einzelhandelsprodukte, Bestand und Lieferscheine.'
        ],
        'code-39': [
            'Unterstützt Buchstaben, Ziffern und einige Sonderzeichen.',
            'Variable Länge mit optionaler Prüfsumme.',
            'Lesbarer Text kann unter den Strichen erscheinen.',
            'Verbreitet in Automobil, Fertigung und Lager.'
        ],
        'itf-14': [
            '14-stelliger GS1-Handelsartikel-Barcode.',
            'Konzipiert für Umverpackungen und Kartons.',
            'Verwendet Interleaved-2-of-5-Kodierung.',
            'Enthält Trägerbalken für zuverlässiges Scannen.'
        ],
        'codabar': [
            'Einfacher numerischer Barcode mit Start/Stopp-Zeichen.',
            'Leicht auf Etikettendruckern mit niedriger Auflösung zu drucken.',
            'Häufig in Bibliotheken, Blutbanken und Versand verwendet.',
            'Schnelles Scannen in Altsystemen möglich.'
        ]
    },
    'fr': {
        'code-128': [
            "Prend en charge l’ensemble des caractères ASCII 0–127.",
            "Sélection automatique du sous-ensemble A, B ou C pour une densité optimale.",
            'Somme de contrôle Mod-103 ajoutée automatiquement.',
            'Idéal pour la logistique, les étiquettes d’expédition et la gestion d’entrepôt.'
        ],
        'upc-a': [
            'Code-barres UPC standard à 12 chiffres pour la vente au détail.',
            'Validation automatique de la somme de contrôle.',
            'Largement pris en charge par les scanners de caisse dans le monde.',
            'Idéal pour les produits de vente, l’inventaire et les bons de livraison.'
        ],
        'code-39': [
            'Prend en charge les lettres, chiffres et quelques caractères spéciaux.',
            'Longueur variable avec somme de contrôle facultative.',
            'Le texte lisible peut apparaître sous les barres.',
            'Courant dans l’automobile, la fabrication et l’entrepôt.'
        ],
        'itf-14': [
            'Code-barres GS1 à 14 chiffres pour articles commerciaux.',
            'Conçu pour les emballages extérieurs et les cartons.',
            'Utilise le codage Interleaved 2 of 5.',
            'Inclut des barres porteuses pour un scan fiable.'
        ],
        'codabar': [
            'Code-barres numérique simple avec caractères start/stop.',
            'Facile à imprimer sur des imprimantes basse résolution.',
            'Souvent utilisé en bibliothèque, banque du sang et expédition.',
            'Permet un scan rapide dans les anciens systèmes.'
        ]
    },
    'es': {
        'code-128': [
            'Compatible con todo el conjunto ASCII 0–127.',
            'Selección automática de subconjuntos A, B o C para la mejor densidad.',
            'La suma de comprobación Mod-103 se añade automáticamente.',
            'Ideal para logística, etiquetas de envío y seguimiento de almacén.'
        ],
        'upc-a': [
            'Código UPC minorista estándar de 12 dígitos.',
            'Incluye validación automática del dígito de control.',
            'Ampliamente compatible con escáneres POS de todo el mundo.',
            'Perfecto para productos minoristas, inventario y albaranes.'
        ],
        'code-39': [
            'Admite letras, dígitos y algunos caracteres especiales.',
            'Longitud variable con suma de comprobación opcional.',
            'El texto legible puede aparecer bajo las barras.',
            'Habitual en automoción, fabricación y sistemas de almacén.'
        ],
        'itf-14': [
            'Código GS1 de 14 dígitos para artículos comerciales.',
            'Diseñado para embalaje exterior y cajas.',
            'Usa codificación Interleaved 2 of 5.',
            'Incluye barras de soporte para un escaneo fiable.'
        ],
        'codabar': [
            'Código numérico sencillo con caracteres de inicio/fin.',
            'Fácil de imprimir en impresoras de etiquetas de baja resolución.',
            'Usado en bibliotecas, bancos de sangre y envíos.',
            'Permite escaneo rápido en sistemas heredados.'
        ]
    },
    'it': {
        'code-128': [
            'Supporta l’intero set ASCII 0–127.',
            'Selezione automatica dei sottoinsiemi A, B o C per la massima densità.',
            'Checksum Mod-103 aggiunto automaticamente.',
            'Ottimo per logistica, etichette di spedizione e magazzino.'
        ],
        'upc-a': [
            'Codice UPC retail standard a 12 cifre.',
            'Include validazione automatica del checksum.',
            'Ampiamente supportato dagli scanner POS nel mondo.',
            'Perfetto per prodotti retail, inventario e documenti di trasporto.'
        ],
        'code-39': [
            'Supporta lettere, cifre e alcuni caratteri speciali.',
            'Lunghezza variabile con checksum opzionale.',
            'Il testo leggibile può comparire sotto le barre.',
            'Comune in automotive, manifattura e magazzini.'
        ],
        'itf-14': [
            'Codice GS1 a 14 cifre per articoli commerciali.',
            'Progettato per imballaggi esterni e cartoni.',
            'Usa la codifica Interleaved 2 of 5.',
            'Include barre di supporto per una scansione affidabile.'
        ],
        'codabar': [
            'Semplice codice numerico con caratteri start/stop.',
            'Facile da stampare su stampanti di etichette a bassa risoluzione.',
            'Spesso usato in biblioteche, banche del sangue e spedizioni.',
            'Permette scansioni rapide nei sistemi legacy.'
        ]
    },
    'pt': {
        'code-128': [
            'Suporta o conjunto ASCII completo 0–127.',
            'Seleção automática de subconjunto A, B ou C para melhor densidade.',
            'Soma de verificação Mod-103 adicionada automaticamente.',
            'Ótimo para logística, etiquetas de envio e rastreamento de armazém.'
        ],
        'upc-a': [
            'Código UPC de varejo padrão com 12 dígitos.',
            'Inclui validação automática do dígito verificador.',
            'Amplamente suportado por scanners POS no mundo todo.',
            'Perfeito para produtos de varejo, inventário e guias de remessa.'
        ],
        'code-39': [
            'Suporta letras, dígitos e alguns caracteres especiais.',
            'Comprimento variável com checksum opcional.',
            'O texto legível pode aparecer abaixo das barras.',
            'Comum no setor automotivo, indústria e armazéns.'
        ],
        'itf-14': [
            'Código GS1 de 14 dígitos para itens comerciais.',
            'Projetado para embalagens externas e caixas.',
            'Usa codificação Interleaved 2 of 5.',
            'Inclui barras de suporte para leitura confiável.'
        ],
        'codabar': [
            'Código numérico simples com caracteres de início/fim.',
            'Fácil de imprimir em impressoras de etiquetas de baixa resolução.',
            'Usado em bibliotecas, bancos de sangue e envios.',
            'Permite leitura rápida em sistemas legados.'
        ]
    },
    'nl': {
        'code-128': [
            'Ondersteunt de volledige ASCII-set 0–127.',
            'Automatische keuze van subset A, B of C voor de beste dichtheid.',
            'Mod-103-checksum wordt automatisch toegevoegd.',
            'Geweldig voor logistiek, verzendetiketten en magazijntracering.'
        ],
        'upc-a': [
            'Standaard 12-cijferige UPC-retailbarcode.',
            'Automatische validatie van het controlegetal.',
            'Wereldwijd ondersteund door POS-scanners.',
            'Perfect voor retailproducten, voorraad en pakbonnen.'
        ],
        'code-39': [
            'Ondersteunt letters, cijfers en enkele speciale tekens.',
            'Variabele lengte met optionele checksum.',
            'Leesbare tekst kan onder de strepen verschijnen.',
            'Veel gebruikt in automotive, productie en magazijn.'
        ],
        'itf-14': [
            '14-cijferige GS1-handelsartikelbarcode.',
            'Ontworpen voor buitenverpakkingen en dozen.',
            'Gebruikt Interleaved 2 of 5-codering.',
            'Bevat draagbalken voor betrouwbaar scannen.'
        ],
        'codabar': [
            'Eenvoudige numerieke barcode met start/stop-tekens.',
            'Gemakkelijk te printen op labelprinters met lage resolutie.',
            'Vaak gebruikt in bibliotheken, bloedbanken en verzending.',
            'Ondersteunt snel scannen in oudere systemen.'
        ]
    },
    'cs': {
        'code-128': [
            'Podporuje plnou sadu ASCII 0–127.',
            'Automatický výběr podmnožiny A, B nebo C pro nejlepší hustotu.',
            'Kontrolní součet Mod-103 se přidává automaticky.',
            'Skvělý pro logistiku, přepravní štítky a sledování skladu.'
        ],
        'upc-a': [
            'Standardní 12místný maloobchodní UPC kód.',
            'Obsahuje automatickou validaci kontrolního čísla.',
            'Široce podporovaný POS čtečkami po celém světě.',
            'Ideální pro maloobchodní produkty, inventář a dodací listy.'
        ],
        'code-39': [
            'Podporuje písmena, číslice a několik speciálních znaků.',
            'Proměnná délka s volitelným kontrolním součtem.',
            'Čitelný text může být umístěn pod čárami.',
            'Běžný v automobilovém průmyslu, výrobě a skladech.'
        ],
        'itf-14': [
            '14místný GS1 kód pro obchodní položky.',
            'Navržen pro vnější obaly a kartony.',
            'Používá kódování Interleaved 2 of 5.',
            'Obsahuje nosné pruhy pro spolehlivé skenování.'
        ],
        'codabar': [
            'Jednoduchý číselný kód se znaky start/stop.',
            'Snadno tisknutelný na tiskárnách etiket s nízkým rozlišením.',
            'Často používaný v knihovnách, krevních bankách a zásilkách.',
            'Umožňuje rychlé skenování ve starších systémech.'
        ]
    },
    'uk': {
        'code-128': [
            'Підтримує повний набір ASCII 0–127.',
            'Автоматичний вибір підмножини A, B або C для найкращої щільності.',
            'Контрольна сума Mod-103 додається автоматично.',
            'Чудово підходить для логістики, етикеток відправлення та складу.'
        ],
        'upc-a': [
            'Стандартний 12-значний роздрібний штрихкод UPC.',
            'Включає автоматичну перевірку контрольної цифри.',
            'Широко підтримується POS-сканерами по всьому світу.',
            'Ідеально для роздрібних товарів, інвентаризації та накладних.'
        ],
        'code-39': [
            'Підтримує літери, цифри та кілька спеціальних символів.',
            'Змінна довжина з опціональною контрольною сумою.',
            'Читабельний текст може бути розміщений під штрихами.',
            'Поширений в автомобільній галузі, виробництві та складах.'
        ],
        'itf-14': [
            '14-значний штрихкод GS1 для торгових одиниць.',
            'Розроблений для зовнішніх упаковок і коробок.',
            'Використовує кодування Interleaved 2 of 5.',
            'Містить опорні смуги для надійного сканування.'
        ],
        'codabar': [
            'Простий цифровий штрихкод зі знаками start/stop.',
            'Легко друкується на принтерах етикеток низької роздільності.',
            'Часто використовується в бібліотеках, банках крові та доставці.',
            'Підтримує швидке сканування в застарілих системах.'
        ]
    }
}

use_cases_i18n = {
    'de': {
        'code-128': [
            'Versand- und Kurieretiketten für UPS, FedEx und DHL.',
            'Lager- und Bestandsverfolgung.',
            'Produkt-IDs, Verpackungen und Paletten-Etiketten.',
            'GS1-128-Barcodes mit Anwendungskennungen.'
        ],
        'upc-a': [
            'Etiketten für Supermärkte und Einzelhandel.',
            'Barcode-Tags für Konsumgüter.',
            'Preis- und Bestandsverwaltung.',
            'UPC-zu-EAN-Umwandlung für internationalen Verkauf.'
        ],
        'code-39': [
            'Bestands- und Anlagenetiketten.',
            'Etiketten für Lagerfächer.',
            'Wartungs- und Zugangskarten.',
            'Ältere industrielle Barcode-Systeme.'
        ],
        'itf-14': [
            'Kartons und Umverpackungen für die Distribution.',
            'Versandetiketten im Lager.',
            'Verfolgung von Einzelhandelskartons und Palettenmanifesten.',
            'Logistik und GS1-Anwendungen in der Lieferkette.'
        ],
        'codabar': [
            'Bibliotheks- und Medieninventar.',
            'Blutbank und Verfolgung medizinischer Proben.',
            'Paket- und Kurieretiketten.',
            'Alte Logistik- und Fertigungssysteme.'
        ]
    },
    'fr': {
        'code-128': [
            'Étiquettes d’expédition et de transport pour UPS, FedEx et DHL.',
            'Suivi des stocks et des entrepôts.',
            'Identifiants produits, emballages et étiquettes de palettes.',
            'Codes-barres GS1-128 avec identifiants d’application.'
        ],
        'upc-a': [
            'Étiquettes pour supermarchés et commerces de détail.',
            'Étiquettes de produits de grande consommation.',
            'Gestion des prix et des stocks.',
            'Conversion UPC vers EAN pour les ventes internationales.'
        ],
        'code-39': [
            'Étiquettes d’inventaire et de gestion des actifs.',
            'Étiquettes d’emplacements en entrepôt.',
            'Badges de maintenance et de contrôle d’accès.',
            'Anciens systèmes industriels de codes-barres.'
        ],
        'itf-14': [
            'Emballages et cartons pour la distribution.',
            'Étiquettes d’expéditions en entrepôt.',
            'Suivi des cartons et manifestes de palettes.',
            'Logistique et applications GS1 dans la chaîne d’approvisionnement.'
        ],
        'codabar': [
            'Étiquettes de livres et inventaires médias.',
            'Banque du sang et suivi des échantillons médicaux.',
            'Étiquettes de colis et de transporteurs.',
            'Anciens systèmes logistiques et de fabrication.'
        ]
    },
    'es': {
        'code-128': [
            'Etiquetas de envío y mensajería para UPS, FedEx y DHL.',
            'Seguimiento de almacén e inventario.',
            'IDs de productos, embalaje y etiquetas de palé.',
            'Códigos GS1-128 con identificadores de aplicación.'
        ],
        'upc-a': [
            'Etiquetas de supermercado y comercio minorista.',
            'Etiquetas para bienes de consumo.',
            'Gestión de precios e inventario.',
            'Conversión UPC a EAN para ventas internacionales.'
        ],
        'code-39': [
            'Etiquetas de inventario y activos.',
            'Etiquetas de estantes de almacén.',
            'Tarjetas de mantenimiento y control de acceso.',
            'Sistemas industriales heredados de códigos de barras.'
        ],
        'itf-14': [
            'Embalaje exterior y cajas para distribución.',
            'Etiquetas de envíos de almacén.',
            'Seguimiento de cajas minoristas y manifiestos de palés.',
            'Logística y aplicaciones GS1 en la cadena de suministro.'
        ],
        'codabar': [
            'Etiquetas de libros de biblioteca e inventario multimedia.',
            'Bancos de sangre y seguimiento de muestras médicas.',
            'Etiquetas de paquetes y mensajería.',
            'Sistemas heredados de logística y fabricación.'
        ]
    },
    'it': {
        'code-128': [
            'Etichette di spedizione e corriere per UPS, FedEx e DHL.',
            'Tracciabilità di magazzino e inventario.',
            'ID prodotto, imballaggi ed etichette pallet.',
            'Codici GS1-128 con identificatori applicativi.'
        ],
        'upc-a': [
            'Etichette per supermercati e retail.',
            'Etichette per beni di consumo.',
            'Gestione di prezzi e inventario.',
            'Conversione UPC a EAN per vendite internazionali.'
        ],
        'code-39': [
            'Etichette di inventario e asset.',
            'Etichette per scaffalature di magazzino.',
            'Badge di manutenzione e controllo accessi.',
            'Sistemi industriali legacy di codici a barre.'
        ],
        'itf-14': [
            'Imballaggi esterni e cartoni per la distribuzione.',
            'Etichette di spedizioni di magazzino.',
            'Tracciabilità di cartoni retail e distinte pallet.',
            'Logistica e applicazioni GS1 nella supply chain.'
        ],
        'codabar': [
            'Etichette per libri in biblioteca e inventario multimediale.',
            'Banche del sangue e tracciabilità di campioni medici.',
            'Etichette per pacchi e corrieri.',
            'Vecchi sistemi logistici e produttivi.'
        ]
    },
    'pt': {
        'code-128': [
            'Etiquetas de envio e transportadoras como UPS, FedEx e DHL.',
            'Rastreamento de armazém e inventário.',
            'IDs de produtos, embalagens e etiquetas de pallet.',
            'Códigos GS1-128 com identificadores de aplicação.'
        ],
        'upc-a': [
            'Etiquetas de supermercado e varejo.',
            'Etiquetas para bens de consumo.',
            'Gestão de preços e inventário.',
            'Conversão UPC para EAN em vendas internacionais.'
        ],
        'code-39': [
            'Etiquetas de inventário e ativos.',
            'Etiquetas de prateleiras de armazém.',
            'Crachás de manutenção e controle de acesso.',
            'Sistemas industriais legados de códigos de barras.'
        ],
        'itf-14': [
            'Embalagens externas e caixas para distribuição.',
            'Etiquetas de envios de armazém.',
            'Rastreamento de caixas de varejo e manifestos de pallets.',
            'Logística e aplicações GS1 na cadeia de suprimentos.'
        ],
        'codabar': [
            'Etiquetas de livros de biblioteca e inventário de mídia.',
            'Bancos de sangue e rastreamento de amostras médicas.',
            'Etiquetas de pacotes e transportadoras.',
            'Sistemas legados de logística e fabricação.'
        ]
    },
    'nl': {
        'code-128': [
            'Verzend- en koerieretiketten voor UPS, FedEx en DHL.',
            'Magazijn- en voorraadtracering.',
            'Product-IDs, verpakkingen en palletetiketten.',
            'GS1-128-barcodes met toepassingskenmerken.'
        ],
        'upc-a': [
            'Etiketten voor supermarkten en retail.',
            'Etiketten voor consumentengoederen.',
            'Prijs- en voorraadbeheer.',
            'UPC-naar-EAN-conversie voor internationale verkoop.'
        ],
        'code-39': [
            'Inventaris- en activumetiketten.',
            'Etiketten voor magazijnstellingen.',
            'Onderhouds- en toegangsbadges.',
            'Oudere industriële barcodesystemen.'
        ],
        'itf-14': [
            'Buitenverpakkingen en dozen voor distributie.',
            'Verzendetiketten in het magazijn.',
            'Tracering van retaildozen en palletmanifesten.',
            'Logistiek en GS1-toepassingen in de supply chain.'
        ],
        'codabar': [
            'Bibliotheekboekenetiketten en media-inventaris.',
            'Bloedbank en tracering van medische monsters.',
            'Pakket- en koerieretiketten.',
            'Oudere logistieke en productiesystemen.'
        ]
    },
    'cs': {
        'code-128': [
            'Přepravní a kurýrní štítky pro UPS, FedEx a DHL.',
            'Sledování skladu a inventáře.',
            'ID produktů, obaly a štítky palet.',
            'Kódy GS1-128 s identifikátory aplikací.'
        ],
        'upc-a': [
            'Štítky pro supermarkety a maloobchod.',
            'Štítky pro spotřební zboží.',
            'Správa cen a inventáře.',
            'Konverze UPC na EAN pro mezinárodní prodej.'
        ],
        'code-39': [
            'Štítky inventáře a majetku.',
            'Štítky regálů ve skladu.',
            'Karty údržby a kontroly přístupu.',
            'Starší průmyslové systémy čárových kódů.'
        ],
        'itf-14': [
            'Vnější obaly a kartony pro distribuci.',
            'Štítky skladových zásilek.',
            'Sledování maloobchodních kartonů a manifesty palet.',
            'Logistika a GS1 aplikace v dodavatelském řetězci.'
        ],
        'codabar': [
            'Štítky knihovních knih a inventář médií.',
            'Krevní banky a sledování lékařských vzorků.',
            'Štítky balíků a kurýrů.',
            'Starší logistické a výrobní systémy.'
        ]
    },
    'uk': {
        'code-128': [
            'Етикетки відправлення та кур’єрські для UPS, FedEx і DHL.',
            'Відстеження складу та інвентарю.',
            'Ідентифікатори продуктів, упаковки та етикетки палет.',
            'Коди GS1-128 з ідентифікаторами застосування.'
        ],
        'upc-a': [
            'Етикетки для супермаркетів і роздрібної торгівлі.',
            'Етикетки для споживчих товарів.',
            'Управління цінами та інвентарем.',
            'Конвертація UPC у EAN для міжнародних продажів.'
        ],
        'code-39': [
            'Етикетки інвентарю та активів.',
            'Етикетки складських стелажів.',
            'Картки техобслуговування та контролю доступу.',
            'Застарілі промислові системи штрихкодів.'
        ],
        'itf-14': [
            'Зовнішні упаковки та коробки для дистрибуції.',
            'Етикетки складських відправлень.',
            'Відстеження роздрібних коробок та маніфести палет.',
            'Логістика та GS1-застосування у ланцюгу постачання.'
        ],
        'codabar': [
            'Етикетки бібліотечних книг та інвентар медіа.',
            'Банки крові та відстеження медичних зразків.',
            'Етикетки посилок та кур’єрів.',
            'Застарілі логістичні та виробничі системи.'
        ]
    }
}

base_template = '''<!DOCTYPE html>
<html lang="{html_lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preload" href="{css_path}?v=20260521120000" as="style">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" as="style" fetchpriority="high">

    <title>{title}</title>
    <meta name="description" content="{description}">
    <meta name="author" content="Barcode Generator">
    <meta name="robots" content="index, follow">

    <link rel="canonical" href="{canonical}">
{alternate_links}

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description}">
    <meta property="og:url" content="{canonical}">
    <meta property="og:image" content="https://barcode-generator.daytodayapps.com/og-image.png">
    <meta property="og:locale" content="{og_locale}">
{og_alt}

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{description}">
    <meta name="twitter:image" content="https://barcode-generator.daytodayapps.com/og-image.png">

    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="{favicon_path}">

    <!-- Schema.org: WebPage -->
    <script type="application/ld+json">
    {{
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "{canonical}",
        "name": "{title}",
        "url": "{canonical}",
        "description": "{description}",
        "inLanguage": "{html_lang}",
        "isPartOf": {{
            "@type": "WebSite",
            "name": "Barcode Generator",
            "url": "{site_url}"
        }}
    }}
    </script>

    <!-- Schema.org: HowTo -->
    <script type="application/ld+json">
    {{
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "How to generate a {format} barcode",
        "description": "{hero_lead}",
        "totalTime": "PT1M",
        "step": [
            {{ "@type": "HowToStep", "position": 1, "name": "Open the generator", "text": "Click the button below to open the generator with {format} already selected." }},
            {{ "@type": "HowToStep", "position": 2, "name": "Enter your data", "text": "Type the number or text you need to encode. The page validates data length and character support in real time." }},
            {{ "@type": "HowToStep", "position": 3, "name": "Customize and validate", "text": "The generator applies the correct encoding and checksum automatically, so the barcode is ready to print." }},
            {{ "@type": "HowToStep", "position": 4, "name": "Export or print", "text": "Download as PNG or SVG, or use the print dialog to print labels and packaging." }}
        ]
    }}
    </script>

    <!-- Schema.org: FAQPage -->
    <script type="application/ld+json">
    {{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
{faq_json}
        ]
    }}
    </script>

    <link rel="stylesheet" href="{css_path}?v=20260521120000">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <style>
        .landing {{ max-width: 880px; margin: 0 auto; padding: 0 1rem; }}
        .landing__hero {{ padding: 2rem 0 1.5rem; text-align: center; }}
        .landing__hero h1 {{ font-size: clamp(1.75rem, 4vw, 2.5rem); margin: 0 0 .75rem; line-height: 1.2; }}
        .landing__lead {{ font-size: 1.1rem; line-height: 1.6; margin: 0 auto 1.5rem; max-width: 640px; opacity: .9; }}
        .landing__cta {{ display: inline-block; padding: .9rem 1.75rem; font-size: 1rem; font-weight: 600; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 14px rgba(79,70,229,.35); transition: transform .15s ease, box-shadow .15s ease; }}
        .landing__cta:hover, .landing__cta:focus-visible {{ transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,70,229,.45); }}
        .landing__cta:focus-visible {{ outline: 2px solid #fff; outline-offset: 3px; }}
        .landing__section {{ padding: 1.5rem 0; border-top: 1px solid rgba(125,125,125,.2); }}
        .landing__section h2 {{ font-size: 1.5rem; margin: 0 0 .75rem; color: #4f46e5; }}
        .landing__section ul {{ padding-left: 1.4rem; margin: .5rem 0; }}
        .landing__section li {{ line-height: 1.65; margin-bottom: .5rem; }}
        .landing__faq details {{ padding: .75rem 1rem; margin: .5rem 0; background: rgba(125,125,125,.08); border-radius: 8px; }}
        .landing__faq summary {{ font-weight: 600; cursor: pointer; }}
        .landing__faq summary:focus-visible {{ outline: 2px solid #4f46e5; outline-offset: 2px; }}
        .landing__faq details[open] summary {{ margin-bottom: .5rem; }}
        .landing__lang {{ display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; margin: 1rem 0 0; font-size: .95rem; }}
        .landing__lang a {{ color: currentColor; text-decoration: none; opacity: .85; }}
        .landing__lang a.active {{ font-weight: 700; opacity: 1; }}
        .landing__lang a:hover {{ text-decoration: underline; }}
    </style>
</head>
<body>
    <main class="landing">
        <div class="landing__hero">
            <h1>{hero_head}</h1>
            <p class="landing__lead">{hero_lead}</p>
            <a class="landing__cta" href="{cta_link}">{cta_text}</a>
            <div class="landing__lang">{lang_links}</div>
        </div>

        <section class="landing__section">
            <h2>{why}</h2>
            <p>{section1}</p>
            <ul>
                {feature_items}
            </ul>
        </section>
        <section class="landing__section">
            <h2>{section2_heading}</h2>
            <p>{section2}</p>
            <ul>
                {use_case_items}
            </ul>
        </section>
        <section class="landing__section">
            <h2>{section3_heading}</h2>
            <p>{section3}</p>
        </section>
        <section class="landing__section landing__faq" aria-labelledby="faq-heading">
            <h2 id="faq-heading">{faq_title}</h2>
            {faq_items}
        </section>
    </main>
</body>
</html>
'''


def escape_html(text):
    return (text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;'))


for fmt, data in formats.items():
    for locale in locale_strings:
        if locale == 'en':
            target = root / fmt / 'index.html'
            css_path = '../styles.css'
            favicon_path = '../favicon.svg'
        else:
            target = root / locale / fmt / 'index.html'
            css_path = '../../styles.css'
            favicon_path = '../../favicon.svg'
        if target.exists() and not force_overwrite:
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        strings = locale_strings[locale]
        title = strings['title'].format(format=data['label'])
        description_detail = descriptions_i18n.get(locale, {}).get(fmt, data['desc'])
        description = strings['description'].format(format=data['label'], desc=description_detail)
        hero_head = strings['hero_head'].format(format=data['label'])
        hero_lead = strings['hero_lead'].format(format=data['label'])
        cta_text = strings['cta'].format(format=data['label'])
        canonical = f"{base_url}/{locale + '/' if locale != 'en' else ''}{fmt}/"
        alternate_links = []
        og_alt = []
        og_locale_map = {
            'en': 'en_US',
            'pl': 'pl_PL',
            'de': 'de_DE',
            'fr': 'fr_FR',
            'es': 'es_ES',
            'it': 'it_IT',
            'pt': 'pt_PT',
            'nl': 'nl_NL',
            'cs': 'cs_CZ',
            'uk': 'uk_UA'
        }
        for alt in all_locales:
            alt_url = f"{base_url}/{alt + '/' if alt != 'en' else ''}{fmt}/"
            alternate_links.append(f'    <link rel="alternate" hreflang="{alt}" href="{alt_url}"/>')
            if alt != locale:
                og_alt.append(f'    <meta property="og:locale:alternate" content="{og_locale_map[alt]}"/>')
        alternate_links.append(f'    <link rel="alternate" hreflang="x-default" href="{base_url}/{fmt}/"/>')
        og_locale = og_locale_map[locale]
        lang_links = []
        for alt in all_locales:
            alt_url = f"/{alt}/{fmt}/" if alt != 'en' else f"/{fmt}/"
            active = ' active' if alt == locale else ''
            lang_links.append(f'<a href="{alt_url}" class="{active.strip()}">{lang_labels[alt]}</a>')
        faq_items = []
        for q, a in strings['faq']:
            faq_items.append('            <details><summary>' + escape_html(q.format(format=data['label'])) + '</summary><p>' + escape_html(a.format(format=data['label'])) + '</p></details>')
        # Pick translated features/use_cases when available; otherwise fall back to EN.
        if locale == 'pl':
            features_list = features_pl.get(fmt, data['features'])
            use_cases_list = use_cases_pl.get(fmt, data['use_cases'])
        elif locale in features_i18n:
            features_list = features_i18n[locale].get(fmt, data['features'])
            use_cases_list = use_cases_i18n[locale].get(fmt, data['use_cases'])
        else:
            features_list = data['features']
            use_cases_list = data['use_cases']
        feature_items = [f'                <li>{escape_html(item.format(format=data["label"]))}</li>' for item in features_list]
        use_case_items = [f'                <li>{escape_html(item.format(format=data["label"]))}</li>' for item in use_cases_list]
        sec2_h_tpl, sec3_h_tpl = section_headings.get(locale, section_headings['en'])
        cta_link_url = f"{base_url}/" if locale == 'en' else f"{base_url}/{locale}/"
        body = base_template.format(
            html_lang=strings['lang'],
            css_path=css_path,
            title=escape_html(title),
            description=escape_html(description),
            canonical=canonical,
            alternate_links='\n'.join(alternate_links),
            og_locale=og_locale,
            og_alt='\n'.join(og_alt),
            site_url=base_url if locale == 'en' else f"{base_url}/{locale}/",
            format=data['label'],
            hero_lead=escape_html(hero_lead),
            hero_head=escape_html(hero_head),
            cta_link=cta_link_url,
            cta_text=escape_html(cta_text),
            lang_links=''.join(lang_links),
            why=escape_html(strings['why'].format(format=data['label'])),
            section1=escape_html(strings['section1'].format(format=data['label'])),
            section2_heading=escape_html(sec2_h_tpl.format(format=data['label'])),
            section2=escape_html(strings['section2'].format(format=data['label'])),
            section3_heading=escape_html(sec3_h_tpl.format(format=data['label'])),
            section3=escape_html(strings['section3'].format(format=data['label'])),
            faq_title=escape_html(strings['faq_title']),
            faq_items='\n'.join(faq_items),
            faq_json=',\n'.join(['            {{ "@type": "Question", "name": "' + escape_html(q.format(format=data['label'])) + '", "acceptedAnswer": {{ "@type": "Answer", "text": "' + escape_html(a.format(format=data['label'])) + '" }} }}' for q,a in strings['faq']]),
            feature_items='\n'.join(feature_items),
            use_case_items='\n'.join(use_case_items),
            favicon_path=favicon_path
        )
        target.write_text(body, encoding='utf8')
        print('Created', target)

# Rebuild sitemap based on actual pages
pages = []
for path in sorted(root.rglob('*.html')):
    if 'tymczasowe' in path.parts:
        continue
    if path.name == '404.html':
        continue
    rel = path.relative_to(root).as_posix()
    parts = rel.split('/')
    if parts[0] in all_locales and len(parts) > 1:
        locale = parts[0]
        inner = '/'.join(parts[1:])
    else:
        locale = 'en'
        inner = rel
    if inner == 'index.html':
        url = f'{base_url}/' if locale == 'en' else f'{base_url}/{locale}/'
    elif inner.endswith('/index.html'):
        page_path = inner[:-len('index.html')]
        url = f'{base_url}/{page_path}' if locale == 'en' else f'{base_url}/{locale}/{page_path}'
    else:
        url = f'{base_url}/{inner}' if locale == 'en' else f'{base_url}/{locale}/{inner}'
    pages.append((inner, locale, url))

page_groups = {}
for inner, locale, url in pages:
    page_groups.setdefault(inner, []).append((locale, url))

urlset = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
for inner, entries in sorted(page_groups.items()):
    alternates = sorted(entries, key=lambda x: x[0])
    for locale, url in alternates:
        urlset.append('    <url>')
        urlset.append(f'        <loc>{url}</loc>')
        for alt_locale, alt_url in alternates:
            urlset.append(f'        <xhtml:link rel="alternate" hreflang="{alt_locale}" href="{alt_url}"/>')
        xdefault = f'{base_url}/' if inner == 'index.html' else f'{base_url}/{inner.replace("index.html", "")}'
        if xdefault.endswith('/') and xdefault != f'{base_url}/':
            xdefault = xdefault
        urlset.append(f'        <xhtml:link rel="alternate" hreflang="x-default" href="{xdefault}"/>')
        urlset.append(f'        <lastmod>{date.today().isoformat()}</lastmod>')
        urlset.append('        <changefreq>monthly</changefreq>')
        urlset.append('        <priority>0.7</priority>')
        urlset.append('    </url>')
urlset.append('</urlset>')
(root / 'sitemap.xml').write_text('\n'.join(urlset) + '\n', encoding='utf8')
print('Sitemap rebuilt with', sum(1 for line in urlset if '<loc>' in line), 'loc entries')
