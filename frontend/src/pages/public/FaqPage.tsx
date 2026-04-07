import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

// ── FAQ data ──────────────────────────────────────────────────────────────────

interface FaqItem {
  q: { en: string; am: string };
  a: { en: string; am: string };
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: {
      en: 'Are the fonts free to use?',
      am: 'ፊደሎቹ ነፃ ናቸው?',
    },
    a: {
      en: 'Yes. Every font on Fonthabesha is published under an open license — either SIL Open Font License 1.1 or Apache 2.0. You can use them in personal and commercial projects at no cost.',
      am: 'አዎ። በፎንትሃበሻ ላይ ያሉ ሁሉም ፊደሎች ክፍት ፈቃዶች አሏቸው — SIL Open Font License 1.1 ወይም Apache 2.0። ለግል እና ንግዳዊ ፕሮጀክቶች ያለ ክፍያ ሊጠቀሙባቸው ይችላሉ።',
    },
  },
  {
    q: {
      en: 'Do I need to create an account to download?',
      am: 'ለማውረድ መለያ ያስፈልጋል?',
    },
    a: {
      en: 'No. Browsing, previewing, and downloading fonts does not require an account. You only need to register if you want to submit fonts as a contributor.',
      am: 'አይደለም። ፊደሎቹን ለማስስ፣ ለማየት፣ ወይም ለማውረድ መለያ አያስፈልግም። መለያ ያስፈልገው ፊደሎቹን ለማስገባት ብቻ ነው።',
    },
  },
  {
    q: {
      en: 'Can I use these fonts in my commercial project?',
      am: 'ለንግዳዊ ፕሮጀክቶቼ ሊጠቀምባቸው እችላለሁ?',
    },
    a: {
      en: 'Yes. Both SIL OFL and Apache 2.0 allow commercial use. Check the license detail on each font\'s page for specifics. The Licenses page has a plain-language summary of each license.',
      am: 'አዎ። SIL OFL እና Apache 2.0 ሁለቱም ንግዳዊ አጠቃቀምን ይፈቅዳሉ። እያንዳንዱ ፊደል ላይ ያለውን ፈቃድ ዝርዝር ያረጋግጡ። የፈቃዶች ገጽ ለእያንዳንዱ ፈቃድ ቀላል ማጠቃለያ ይሰጣል።',
    },
  },
  {
    q: {
      en: 'How do I submit my font?',
      am: 'ፊደሌን እንዴት አስገባለሁ?',
    },
    a: {
      en: 'Create a contributor account, then go to your Contributor Dashboard and start a new submission. Upload your font files (.ttf, .otf, .woff, or .woff2), fill in the metadata, and submit for review. Our team will review it and provide feedback.',
      am: 'አስተዋጽዖ ሰጪ መለያ ፍጠሩ፣ ከዚያ ወደ አስተዋጽዖ ሰጪ ዳሽቦርድ ሂደው አዲስ ማቅረቢያ ጀምሩ። የፊደል ፋይሎቹን (.ttf, .otf, .woff, ወይም .woff2) ያስጫኑ፣ ዝርዝሮቹን ሙሉ፣ ከዚያ ለክለሳ አቅርቡ። ቡድናችን ይገመግምና አስተያየት ይሰጣል።',
    },
  },
  {
    q: {
      en: 'How long does the review process take?',
      am: 'ክለሳ ምን ያህል ጊዜ ይወስዳል?',
    },
    a: {
      en: 'We aim to review all submissions within 5–10 business days. If we need changes, we will provide clear notes in your dashboard. Once approved, your font will be published immediately.',
      am: 'ሁሉም ማቅረቢያዎችን በ5-10 የስራ ቀናት ውስጥ ለመገምገም እንሞክራለን። ለውጥ ካስፈለገ፣ ዳሽቦርድዎ ላይ ግልፅ ማስታወሻዎች እንሰጣለን። ከፀደቀ በኋላ ፊደሉ ወዲያውኑ ይታተማል።',
    },
  },
  {
    q: {
      en: 'What file formats do you accept?',
      am: 'ምን ዓይነት ፋይሎች ይቀበላሉ?',
    },
    a: {
      en: 'We accept .ttf, .otf, .woff, and .woff2 files. We recommend submitting the original source format (TTF or OTF) as it provides the best quality for metadata extraction.',
      am: '.ttf, .otf, .woff, እና .woff2 ፋይሎችን እንቀበላለን። ለምርጥ ጥራት TTF ወይም OTF ፋይሎችን ማስገባት ይመከራል።',
    },
  },
  {
    q: {
      en: 'Do the fonts support both Ethiopic and Latin characters?',
      am: 'ፊደሎቹ አማርኛ እና ላቲን ሁለቱንም ይደግፋሉ?',
    },
    a: {
      en: 'It depends on the font. Each font\'s detail page shows its script support. Many fonts on Fonthabesha cover the full Ethiopic Unicode range (U+1200–U+137F) and also include Latin characters.',
      am: 'እንደ ፊደሉ ይለያያል። እያንዳንዱ ፊደል ዝርዝር ገጽ ላይ የስክሪፕቱ ድጋፍ ይታያል። ብዙ ፊደሎቻችን ሙሉ ኢትዮጵያዊ ዩኒኮድ ክልል (U+1200–U+137F) ይሸፍናሉ እንዲሁም ላቲን ፊደሎችን ያካትታሉ።',
    },
  },
  {
    q: {
      en: 'I found a bug or have a suggestion. How do I report it?',
      am: 'ስህተት አገኘሁ ወይም ሐሳብ አለኝ። እንዴት ሪፖርት ማድረግ እችላለሁ?',
    },
    a: {
      en: 'Please open an issue on our GitHub repository. We welcome bug reports, feature requests, and general feedback.',
      am: 'በ GitHub ሪፖዚቶሪያችን ላይ ጉዳይ ይክፈቱ። ስህተት ሪፖርቶችን፣ ባህሪ ጥያቄዎችን፣ እና አጠቃላይ አስተያየቶችን እንቀበላለን።',
    },
  },
];

// ── Accordion item ─────────────────────────────────────────────────────────────

function FaqAccordion({ item, isAm }: { item: FaqItem; isAm: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`faq-item${open ? ' faq-item--open' : ''}`}>
      <button
        type="button"
        className="faq-item__question"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{isAm ? item.q.am : item.q.en}</span>
        <span className="faq-item__chevron" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <div className="faq-item__answer">
          <p>{isAm ? item.a.am : item.a.en}</p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FaqPage() {
  const { t, i18n } = useTranslation();
  const isAm = i18n.language === 'am';

  return (
    <>
      <Helmet>
        <title>{t('faq.title')} — Fonthabesha</title>
      </Helmet>

      <div className="page-container page-container--narrow">
        <header className="page-header">
          <p className="eyebrow">{isAm ? 'ተደጋጋሚ ጥያቄዎች' : 'FAQ'}</p>
          <h1 className="page-title">{t('faq.title')}</h1>
          <p className="page-subtitle">
            {isAm
              ? 'ስለ ፎንትሃበሻ ብዙ ጊዜ የሚጠየቁ ጥያቄዎች'
              : 'Common questions about Fonthabesha'}
          </p>
        </header>

        <div className="faq-list">
          {FAQ_ITEMS.map((item, idx) => (
            <FaqAccordion key={idx} item={item} isAm={isAm} />
          ))}
        </div>

        <div className="faq-footer">
          <p>
            {isAm
              ? 'ጥያቄዎ ምላሽ አላገኘም? '
              : "Didn't find your answer? "}
            <Link to="/about" className="faq-footer__link">
              {isAm ? 'ስለ እኛ ያንብቡ' : 'Read about us'}
            </Link>
            {isAm ? ' ወይም GitHub ላይ ያገኙን።' : ' or find us on GitHub.'}
          </p>
        </div>
      </div>
    </>
  );
}
