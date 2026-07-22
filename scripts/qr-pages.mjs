const LANGUAGE_NAMES = {
  en: 'English', pl: 'Polski', de: 'Deutsch', fr: 'Français', es: 'Español',
  it: 'Italiano', pt: 'Português', nl: 'Nederlands', cs: 'Čeština', uk: 'Українська',
};

const CONTENT = {
  en: {
    title: 'Free QR Code Generator Online | PNG and SVG',
    description: 'Create a QR code online for a URL, text or contact details. Choose error correction, preview instantly and download print-ready PNG or SVG files.',
    h1: 'Create a QR code online',
    lead: 'Generate a QR code for a website, text or identifier directly in your browser. Choose error correction and download a clean PNG or SVG without uploading your data.',
    cta: 'Create a QR code',
    whyTitle: 'What can a QR code contain?',
    whyText: 'QR codes store more data than linear barcodes and can be scanned by most modern phone cameras.',
    whyItems: ['Website addresses and deep links', 'Plain text, order numbers and identifiers', 'Contact, Wi-Fi and application data entered as text'],
    levelsTitle: 'QR error correction levels',
    levelsText: 'Higher correction can keep a damaged code readable, but it also increases the number of modules and required print area.',
    levelsItems: ['L: about 7% recovery and the smallest symbol', 'M: about 15% recovery and a balanced default', 'Q: about 25% recovery', 'H: about 30% recovery for demanding labels'],
    printTitle: 'How to keep a QR code scannable',
    printText: 'Use dark modules on a light background, keep the four-module quiet zone, avoid stretching and test the final printed size with the target scanner.',
    faqTitle: 'QR code questions',
    faqs: [
      ['Is this QR code generator free?', 'Yes. Generation and PNG or SVG export are free and happen locally in your browser.'],
      ['Which error correction level should I use?', 'M is a good default. Choose Q or H when a label may be scratched, folded or partly covered.'],
      ['Does this page upload my QR data?', 'No. The QR matrix and exported files are created on your device.'],
    ],
  },
  pl: {
    title: 'Darmowy generator kodów QR online | PNG i SVG',
    description: 'Utwórz kod QR do adresu URL, tekstu lub danych kontaktowych. Wybierz korekcję błędów, zobacz podgląd i pobierz gotowy plik PNG albo SVG.',
    h1: 'Utwórz kod QR online',
    lead: 'Wygeneruj kod QR do strony, tekstu lub identyfikatora bezpośrednio w przeglądarce. Wybierz korekcję błędów i pobierz PNG albo SVG bez wysyłania danych.',
    cta: 'Utwórz kod QR',
    whyTitle: 'Co może zawierać kod QR?',
    whyText: 'Kod QR mieści więcej danych niż kod liniowy i może być odczytany aparatem większości współczesnych telefonów.',
    whyItems: ['Adresy stron i linki do aplikacji', 'Tekst, numery zamówień i identyfikatory', 'Dane kontaktowe, Wi-Fi i inne dane zapisane jako tekst'],
    levelsTitle: 'Poziomy korekcji błędów QR',
    levelsText: 'Wyższa korekcja pomaga odczytać uszkodzony kod, ale zwiększa liczbę modułów i wymagany rozmiar wydruku.',
    levelsItems: ['L: około 7% odzyskiwania i najmniejszy symbol', 'M: około 15% i uniwersalne ustawienie', 'Q: około 25% odzyskiwania', 'H: około 30% dla wymagających etykiet'],
    printTitle: 'Jak zachować czytelność kodu QR',
    printText: 'Używaj ciemnych modułów na jasnym tle, zachowaj pole ochronne czterech modułów, nie rozciągaj obrazu i przetestuj finalny wydruk.',
    faqTitle: 'Pytania o kody QR',
    faqs: [
      ['Czy generator kodów QR jest darmowy?', 'Tak. Generowanie oraz eksport PNG i SVG są darmowe i odbywają się lokalnie w przeglądarce.'],
      ['Który poziom korekcji błędów wybrać?', 'M jest dobrym ustawieniem domyślnym. Wybierz Q lub H, gdy etykieta może zostać zarysowana, zagięta lub częściowo zakryta.'],
      ['Czy strona wysyła zawartość kodu QR na serwer?', 'Nie. Matryca QR i eksportowane pliki powstają na Twoim urządzeniu.'],
    ],
  },
  de: {
    title: 'Kostenloser QR-Code-Generator | PNG und SVG',
    description: 'QR-Code für URL, Text oder Kontaktdaten online erstellen. Fehlerkorrektur wählen, Vorschau prüfen und druckfertige PNG- oder SVG-Datei laden.',
    h1: 'QR-Code online erstellen', lead: 'Erstellen Sie einen QR-Code für Website, Text oder Kennung direkt im Browser. Wählen Sie die Fehlerkorrektur und laden Sie PNG oder SVG lokal herunter.', cta: 'QR-Code erstellen',
    whyTitle: 'Was kann ein QR-Code enthalten?', whyText: 'QR-Codes speichern mehr Daten als lineare Barcodes und lassen sich mit den meisten Smartphone-Kameras lesen.', whyItems: ['Webadressen und App-Links', 'Text, Auftragsnummern und Kennungen', 'Kontakt-, WLAN- und Anwendungsdaten als Text'],
    levelsTitle: 'QR-Fehlerkorrekturstufen', levelsText: 'Eine höhere Korrektur macht beschädigte Codes robuster, benötigt aber mehr Module und Druckfläche.', levelsItems: ['L: etwa 7% Wiederherstellung', 'M: etwa 15% und ein ausgewogener Standard', 'Q: etwa 25% Wiederherstellung', 'H: etwa 30% für anspruchsvolle Etiketten'],
    printTitle: 'QR-Code zuverlässig drucken', printText: 'Dunkle Module auf hellem Grund, vier Module Ruhezone, keine Verzerrung und ein Test mit dem Zielscanner sichern die Lesbarkeit.', faqTitle: 'Fragen zu QR-Codes',
    faqs: [['Ist der Generator kostenlos?', 'Ja. Erstellung und PNG- oder SVG-Export sind kostenlos und erfolgen lokal im Browser.'], ['Welche Fehlerkorrektur soll ich wählen?', 'M ist ein guter Standard. Q oder H eignen sich für Etiketten, die beschädigt werden können.'], ['Werden meine Daten hochgeladen?', 'Nein. QR-Matrix und Dateien entstehen auf Ihrem Gerät.']],
  },
  fr: {
    title: 'Générateur de QR code gratuit | PNG et SVG',
    description: 'Créez un QR code pour une URL, un texte ou des coordonnées. Choisissez la correction, prévisualisez puis téléchargez un fichier PNG ou SVG prêt à imprimer.',
    h1: 'Créer un QR code en ligne', lead: 'Générez un QR code pour un site, un texte ou un identifiant dans votre navigateur. Choisissez la correction et exportez en PNG ou SVG sans envoyer les données.', cta: 'Créer le QR code',
    whyTitle: 'Que peut contenir un QR code ?', whyText: 'Un QR code contient plus de données qu’un code linéaire et se lit avec la plupart des appareils photo de téléphone.', whyItems: ['Adresses web et liens d’application', 'Texte, numéros de commande et identifiants', 'Coordonnées, Wi-Fi et données saisies sous forme de texte'],
    levelsTitle: 'Niveaux de correction QR', levelsText: 'Une correction élevée aide à lire un code abîmé, mais augmente le nombre de modules et la surface imprimée.', levelsItems: ['L : environ 7 % de récupération', 'M : environ 15 % et un réglage équilibré', 'Q : environ 25 % de récupération', 'H : environ 30 % pour les étiquettes exigeantes'],
    printTitle: 'Garder un QR code lisible', printText: 'Utilisez des modules foncés sur fond clair, gardez quatre modules de marge, évitez toute déformation et testez l’impression finale.', faqTitle: 'Questions sur les QR codes',
    faqs: [['Ce générateur est-il gratuit ?', 'Oui. La création et l’export PNG ou SVG sont gratuits et locaux.'], ['Quel niveau de correction choisir ?', 'M convient par défaut. Choisissez Q ou H si l’étiquette risque d’être endommagée.'], ['Mes données sont-elles envoyées ?', 'Non. La matrice QR et les fichiers sont créés sur votre appareil.']],
  },
  es: {
    title: 'Generador de códigos QR gratis | PNG y SVG',
    description: 'Crea un código QR para una URL, texto o contacto. Elige la corrección de errores, revisa la vista previa y descarga PNG o SVG listo para imprimir.',
    h1: 'Crear un código QR online', lead: 'Genera un QR para una web, texto o identificador en el navegador. Elige la corrección y descarga PNG o SVG sin enviar tus datos.', cta: 'Crear código QR',
    whyTitle: '¿Qué puede contener un código QR?', whyText: 'Los QR almacenan más datos que los códigos lineales y se leen con la mayoría de cámaras de teléfonos.', whyItems: ['Direcciones web y enlaces de aplicaciones', 'Texto, pedidos e identificadores', 'Datos de contacto, Wi-Fi y aplicaciones como texto'],
    levelsTitle: 'Niveles de corrección QR', levelsText: 'Una corrección mayor ayuda a leer un código dañado, pero aumenta los módulos y el tamaño de impresión.', levelsItems: ['L: cerca del 7% de recuperación', 'M: cerca del 15% y opción equilibrada', 'Q: cerca del 25% de recuperación', 'H: cerca del 30% para etiquetas exigentes'],
    printTitle: 'Cómo mantener legible un QR', printText: 'Usa módulos oscuros sobre fondo claro, conserva cuatro módulos de margen, no deformes la imagen y prueba la impresión final.', faqTitle: 'Preguntas sobre códigos QR',
    faqs: [['¿El generador es gratuito?', 'Sí. La generación y exportación PNG o SVG son gratuitas y locales.'], ['¿Qué corrección debo elegir?', 'M es una buena opción general. Usa Q o H si la etiqueta puede dañarse.'], ['¿Se envían mis datos?', 'No. La matriz QR y los archivos se crean en tu dispositivo.']],
  },
  it: {
    title: 'Generatore di codici QR gratuito | PNG e SVG',
    description: 'Crea un codice QR per URL, testo o contatti. Scegli la correzione degli errori, controlla l’anteprima e scarica PNG o SVG pronto per la stampa.',
    h1: 'Crea un codice QR online', lead: 'Genera un QR per un sito, testo o identificatore nel browser. Scegli la correzione e scarica PNG o SVG senza inviare i dati.', cta: 'Crea codice QR',
    whyTitle: 'Cosa può contenere un codice QR?', whyText: 'I QR memorizzano più dati dei codici lineari e sono leggibili dalla maggior parte delle fotocamere degli smartphone.', whyItems: ['Indirizzi web e link alle app', 'Testo, numeri d’ordine e identificatori', 'Contatti, Wi-Fi e dati applicativi come testo'],
    levelsTitle: 'Livelli di correzione QR', levelsText: 'Una correzione maggiore aiuta con i codici danneggiati, ma aumenta moduli e area di stampa.', levelsItems: ['L: circa 7% di recupero', 'M: circa 15% e impostazione bilanciata', 'Q: circa 25% di recupero', 'H: circa 30% per etichette esigenti'],
    printTitle: 'Mantenere leggibile un QR', printText: 'Usa moduli scuri su fondo chiaro, conserva quattro moduli di margine, non deformare e prova la stampa finale.', faqTitle: 'Domande sui codici QR',
    faqs: [['Il generatore è gratuito?', 'Sì. Generazione ed esportazione PNG o SVG sono gratuite e locali.'], ['Quale correzione scegliere?', 'M è una buona scelta generale. Usa Q o H se l’etichetta può danneggiarsi.'], ['I dati vengono caricati?', 'No. Matrice QR e file sono creati sul tuo dispositivo.']],
  },
  pt: {
    title: 'Gerador de código QR grátis | PNG e SVG',
    description: 'Crie um código QR para URL, texto ou contato. Escolha a correção de erros, confira a prévia e baixe PNG ou SVG pronto para impressão localmente.',
    h1: 'Criar um código QR online', lead: 'Gere um QR para site, texto ou identificador no navegador. Escolha a correção e baixe PNG ou SVG sem enviar seus dados.', cta: 'Criar código QR',
    whyTitle: 'O que um código QR pode conter?', whyText: 'Códigos QR armazenam mais dados que códigos lineares e podem ser lidos pela maioria das câmeras de celular.', whyItems: ['Endereços web e links de aplicativos', 'Texto, pedidos e identificadores', 'Contato, Wi-Fi e dados de aplicativos como texto'],
    levelsTitle: 'Níveis de correção QR', levelsText: 'Correção maior ajuda a ler códigos danificados, mas aumenta os módulos e a área de impressão.', levelsItems: ['L: cerca de 7% de recuperação', 'M: cerca de 15% e opção equilibrada', 'Q: cerca de 25% de recuperação', 'H: cerca de 30% para etiquetas exigentes'],
    printTitle: 'Como manter o QR legível', printText: 'Use módulos escuros em fundo claro, mantenha quatro módulos de margem, não distorça e teste a impressão final.', faqTitle: 'Perguntas sobre códigos QR',
    faqs: [['O gerador é gratuito?', 'Sim. A geração e exportação PNG ou SVG são gratuitas e locais.'], ['Qual correção devo escolher?', 'M é uma boa opção geral. Use Q ou H se a etiqueta puder ser danificada.'], ['Meus dados são enviados?', 'Não. A matriz QR e os arquivos são criados no seu dispositivo.']],
  },
  nl: {
    title: 'Gratis QR-code generator | PNG en SVG',
    description: 'Maak een QR-code voor een URL, tekst of contactgegevens. Kies foutcorrectie, bekijk direct het resultaat en download een drukklaar PNG- of SVG-bestand.',
    h1: 'Maak online een QR-code', lead: 'Genereer in je browser een QR-code voor een website, tekst of kenmerk. Kies foutcorrectie en download PNG of SVG zonder gegevens te uploaden.', cta: 'QR-code maken',
    whyTitle: 'Wat kan een QR-code bevatten?', whyText: 'QR-codes bewaren meer gegevens dan lineaire barcodes en zijn leesbaar met de meeste telefooncamera’s.', whyItems: ['Webadressen en app-links', 'Tekst, bestelnummers en kenmerken', 'Contact-, wifi- en appgegevens als tekst'],
    levelsTitle: 'Niveaus voor foutcorrectie', levelsText: 'Meer correctie helpt bij beschadiging, maar vergroot het aantal modules en het benodigde drukoppervlak.', levelsItems: ['L: ongeveer 7% herstel', 'M: ongeveer 15% en een gebalanceerde standaard', 'Q: ongeveer 25% herstel', 'H: ongeveer 30% voor veeleisende labels'],
    printTitle: 'Een QR-code leesbaar houden', printText: 'Gebruik donkere modules op een lichte achtergrond, houd vier modules witruimte, vervorm niet en test de uiteindelijke afdruk.', faqTitle: 'Vragen over QR-codes',
    faqs: [['Is de generator gratis?', 'Ja. Genereren en exporteren naar PNG of SVG is gratis en gebeurt lokaal.'], ['Welke foutcorrectie kies ik?', 'M is een goede standaard. Kies Q of H als het label beschadigd kan raken.'], ['Worden mijn gegevens geüpload?', 'Nee. De QR-matrix en bestanden worden op je apparaat gemaakt.']],
  },
  cs: {
    title: 'Generátor QR kódů zdarma | PNG a SVG',
    description: 'Vytvořte QR kód pro URL, text nebo kontakt. Zvolte opravu chyb, zkontrolujte náhled a stáhněte PNG nebo SVG připravené k tisku.',
    h1: 'Vytvořte QR kód online', lead: 'Vygenerujte QR pro web, text nebo identifikátor přímo v prohlížeči. Zvolte opravu chyb a stáhněte PNG nebo SVG bez odesílání dat.', cta: 'Vytvořit QR kód',
    whyTitle: 'Co může QR kód obsahovat?', whyText: 'QR kódy uloží více dat než lineární kódy a přečte je většina fotoaparátů v telefonu.', whyItems: ['Webové adresy a odkazy na aplikace', 'Text, čísla objednávek a identifikátory', 'Kontaktní, Wi-Fi a aplikační data jako text'],
    levelsTitle: 'Úrovně opravy chyb QR', levelsText: 'Vyšší oprava pomůže u poškozeného kódu, ale zvýší počet modulů a velikost tisku.', levelsItems: ['L: přibližně 7% obnova', 'M: přibližně 15% a vyvážené nastavení', 'Q: přibližně 25% obnova', 'H: přibližně 30% pro náročné štítky'],
    printTitle: 'Jak zachovat čitelnost QR', printText: 'Použijte tmavé moduly na světlém pozadí, ponechte čtyři moduly okraje, obraz nedeformujte a otestujte tisk.', faqTitle: 'Otázky o QR kódech',
    faqs: [['Je generátor zdarma?', 'Ano. Generování a export PNG nebo SVG jsou zdarma a probíhají lokálně.'], ['Jakou opravu chyb zvolit?', 'M je dobrá výchozí volba. Q nebo H použijte u štítků ohrožených poškozením.'], ['Odesílají se moje data?', 'Ne. QR matice i soubory vznikají ve vašem zařízení.']],
  },
  uk: {
    title: 'Безкоштовний генератор QR-кодів | PNG і SVG',
    description: 'Створіть QR-код для URL, тексту або контакту. Виберіть корекцію помилок, перегляньте результат і завантажте PNG або SVG для друку.',
    h1: 'Створити QR-код онлайн', lead: 'Згенеруйте QR для сайту, тексту чи ідентифікатора у браузері. Виберіть корекцію та завантажте PNG або SVG без передавання даних.', cta: 'Створити QR-код',
    whyTitle: 'Що може містити QR-код?', whyText: 'QR-коди зберігають більше даних, ніж лінійні, і зчитуються більшістю камер смартфонів.', whyItems: ['Вебадреси та посилання на застосунки', 'Текст, номери замовлень та ідентифікатори', 'Контактні, Wi-Fi та інші дані у вигляді тексту'],
    levelsTitle: 'Рівні корекції помилок QR', levelsText: 'Вища корекція допомагає зчитати пошкоджений код, але збільшує кількість модулів і площу друку.', levelsItems: ['L: близько 7% відновлення', 'M: близько 15% і збалансований варіант', 'Q: близько 25% відновлення', 'H: близько 30% для складних етикеток'],
    printTitle: 'Як зберегти QR-код читабельним', printText: 'Використовуйте темні модулі на світлому фоні, залишайте поле у чотири модулі, не розтягуйте зображення та перевіряйте друк.', faqTitle: 'Питання про QR-коди',
    faqs: [['Чи безкоштовний генератор?', 'Так. Створення та експорт PNG або SVG безкоштовні й локальні.'], ['Яку корекцію вибрати?', 'M є хорошим стандартом. Q або H краще для етикеток, які можуть пошкодитися.'], ['Чи надсилаються мої дані?', 'Ні. QR-матриця та файли створюються на вашому пристрої.']],
  },
};

function list(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

export function qrPageHtml({ lang, langs, base, routeFor, canonicalFor }) {
  const page = CONTENT[lang] || CONTENT.en;
  const canonical = canonicalFor(lang, 'qr-code/');
  const home = routeFor(lang);
  const alternates = langs.map((code) => `<link rel="alternate" hreflang="${code}" href="${canonicalFor(code, 'qr-code/')}">`).join('\n    ');
  const languageLinks = langs.map((code) => `<a href="${routeFor(code, 'qr-code/')}"${code === lang ? ' class="active" aria-current="page"' : ''}>${LANGUAGE_NAMES[code]}</a>`).join('');
  const application = {
    '@context': 'https://schema.org', '@type': 'WebApplication', '@id': `${canonical}#application`,
    name: page.h1, description: page.description, url: canonical, applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript', isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: 'Day to Day Apps', url: 'https://daytodayapps.com/' },
  };
  const webPage = { '@context': 'https://schema.org', '@type': 'WebPage', name: page.h1, description: page.description, url: canonical, inLanguage: lang, mainEntity: { '@id': application['@id'] } };
  const howTo = { '@context': 'https://schema.org', '@type': 'HowTo', name: page.h1, description: page.lead, totalTime: 'PT1M', step: [page.cta, page.levelsTitle, page.printTitle].map((name, index) => ({ '@type': 'HowToStep', position: index + 1, name, text: [page.lead, page.levelsText, page.printText][index] })) };
  const faq = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: page.faqs.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) };
  const breadcrumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Barcode Generator', item: `${base}${home}` }, { '@type': 'ListItem', position: 2, name: 'QR Code', item: canonical }] };

  return `<!doctype html>
<html lang="${lang}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${page.title}</title>
    <meta name="description" content="${page.description}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonical}">
    ${alternates}
    <link rel="alternate" hreflang="x-default" href="${canonicalFor('en', 'qr-code/')}">
    <meta property="og:type" content="website"><meta property="og:site_name" content="Barcode Generator">
    <meta property="og:title" content="${page.title}"><meta property="og:description" content="${page.description}">
    <meta property="og:url" content="${canonical}"><meta property="og:image" content="${base}/og-image.svg">
    <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${page.title}">
    <meta name="twitter:description" content="${page.description}"><meta name="twitter:image" content="${base}/og-image.svg">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <script type="application/ld+json">${JSON.stringify(application)}</script>
    <script type="application/ld+json">${JSON.stringify(webPage)}</script>
    <script type="application/ld+json">${JSON.stringify(howTo)}</script>
    <script type="application/ld+json">${JSON.stringify(faq)}</script>
    <script type="application/ld+json">${JSON.stringify(breadcrumbs)}</script>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <main class="landing">
        <section class="landing__hero"><h1>${page.h1}</h1><p class="landing__lead">${page.lead}</p><a class="landing__cta" href="${home}?type=qr">${page.cta}</a><div class="landing__lang">${languageLinks}</div></section>
        <section class="landing__section"><h2>${page.whyTitle}</h2><p>${page.whyText}</p>${list(page.whyItems)}</section>
        <section class="landing__section"><h2>${page.levelsTitle}</h2><p>${page.levelsText}</p>${list(page.levelsItems)}</section>
        <section class="landing__section"><h2>${page.printTitle}</h2><p>${page.printText}</p></section>
        <section class="landing__section landing__faq" aria-labelledby="qr-faq"><h2 id="qr-faq">${page.faqTitle}</h2>${page.faqs.map(([question, answer]) => `<details><summary>${question}</summary><p>${answer}</p></details>`).join('')}</section>
    </main>
</body>
</html>`;
}
