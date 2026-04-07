import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function AboutPage() {
  const { t, i18n } = useTranslation();
  const isAm = i18n.language === 'am';

  return (
    <>
      <Helmet>
        <title>{t('about.title')} — Fonthabesha</title>
        <meta
          name="description"
          content="Fonthabesha is a free, open-source platform for discovering, previewing, and downloading Ethiopic and Amharic fonts."
        />
      </Helmet>

      <div className="page-container page-container--narrow">

        {/* ── Hero ── */}
        <section className="about-hero">
          <p className="eyebrow">{isAm ? 'ስለ እኛ' : 'About'}</p>
          <h1 className="about-hero__title">
            {isAm
              ? 'ፎንትሃበሻ — የኢትዮጵያ ፊደሎች ቤት'
              : 'Fonthabesha — Home of Ethiopian Fonts'}
          </h1>
          <p className="about-hero__lead">
            {isAm
              ? 'ፎንትሃበሻ ነፃ እና ክፍት ምንጭ ያለው የኢትዮጵያ ፊደሎች መድረክ ነው። ዲዛይነሮች፣ ገንቢዎች፣ ጋዜጠኞች፣ እና ማህበረሰቦች ጥራት ያለው አማርኛ እና ኢትዮጵያዊ ፊደሎችን በቀላሉ እንዲያገኙ ይረዳቸዋል።'
              : 'Fonthabesha is a free, open-source platform dedicated to Ethiopic and Amharic script fonts. It helps designers, developers, journalists, and communities easily discover, preview, and download high-quality fonts.'}
          </p>
        </section>

        {/* ── Mission ── */}
        <section className="about-section">
          <h2 className="about-section__title">
            {isAm ? 'ተልዕኮዋ' : 'Our Mission'}
          </h2>
          <p className="about-section__text">
            {isAm
              ? 'ኢትዮጵያዊ ፊደሎች በዲጂታል ዓለም ውስጥ ምቹ ቦታ ሊኖራቸው ይገባል። ዛሬ ብዙ ጥሩ ፊደሎች ቢኖሩም፣ ለማግኘትና ለማወዳደር ቀላል የሆነ ቦታ አልነበረም። ፎንትሃበሻ ይህንን ክፍተት ለመሙላት ተፈጠረ።'
              : 'Ethiopic scripts deserve a prominent place in the digital world. While many excellent fonts exist, there was no easy, centralized place to find, compare, and download them. Fonthabesha was built to fill that gap.'}
          </p>
          <p className="about-section__text">
            {isAm
              ? 'ሁሉም ፊደሎቻችን ክፍት ፈቃዶች ስር ይሰጣሉ — SIL Open Font License ወይም Apache 2.0 — ስለዚህ ለምንም አይነት ፕሮጀክት፣ ንግድ ወይም ግል፣ ያለ ክፍያ ሊጠቀሙባቸው ይችላሉ።'
              : 'Every font on Fonthabesha is published under an open license — SIL Open Font License or Apache 2.0 — so you can use them in any project, commercial or personal, completely free of charge.'}
          </p>
        </section>

        {/* ── How it works ── */}
        <section className="about-section">
          <h2 className="about-section__title">
            {isAm ? 'እንዴት ይሰራል' : 'How It Works'}
          </h2>
          <div className="about-steps">
            <div className="about-step">
              <span className="about-step__num">1</span>
              <div>
                <h3 className="about-step__title">
                  {isAm ? 'ፊደሎቹን ያስሱ' : 'Browse Fonts'}
                </h3>
                <p className="about-step__desc">
                  {isAm
                    ? 'ፊደሎቹን በምድብ፣ ስክሪፕት፣ ወይም ፈቃድ ያጣሩ። ፊደሉ ከመጫን በፊት የናሙና ጽሑፉን ወደ የሚፈልጉት ቀይሩ።'
                    : 'Filter fonts by category, script, or license. Change the specimen text to your own words to see how each font looks before downloading.'}
                </p>
              </div>
            </div>
            <div className="about-step">
              <span className="about-step__num">2</span>
              <div>
                <h3 className="about-step__title">
                  {isAm ? 'ያውርዱ' : 'Download'}
                </h3>
                <p className="about-step__desc">
                  {isAm
                    ? 'ሙሉ ቤተሰቡን ወይም ብቻ የሚፈልጉትን ዘይቤ ያውርዱ። ምንም ምዝገባ አያስፈልግም።'
                    : 'Download the full family or just the styles you need. No account required to browse or download.'}
                </p>
              </div>
            </div>
            <div className="about-step">
              <span className="about-step__num">3</span>
              <div>
                <h3 className="about-step__title">
                  {isAm ? 'አስተዋጽዖ ያድርጉ' : 'Contribute'}
                </h3>
                <p className="about-step__desc">
                  {isAm
                    ? 'የፊደል ዲዛይነር ከሆኑ — ፊደሎቹን ወደ ፎንትሃበሻ ያስገቡ። ፊደሎቹ ከፀደቁ ሁሉም ሰው ሊያወርዳቸው ይችላል።'
                    : 'If you design fonts, submit them to Fonthabesha. Once reviewed and approved, they become available to everyone.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Contribution CTA ── */}
        <section className="about-section about-section--cta">
          <h2 className="about-section__title">
            {isAm ? 'ፊደሎቹን ያስገቡ' : 'Submit Your Fonts'}
          </h2>
          <p className="about-section__text">
            {isAm
              ? 'ኢትዮጵያዊ ፊደሎች ፈጥረዋልን? ፎንትሃበሻ ላይ ያስፍሯቸው። እያንዳንዱ ማቅረቢያ ከፀደቁ በፊት ጥራቱን እና ፈቃዱን እናረጋግጣለን።'
              : 'Have you designed Ethiopic fonts? Publish them on Fonthabesha. We review every submission for quality and licensing compliance before approval.'}
          </p>
          <div className="about-section__actions">
            <Link to="/register" className="btn btn--primary">
              {isAm ? 'አስተዋጽዖ ጀምር' : 'Start Contributing'}
            </Link>
            <Link to="/faq" className="btn btn--outline">
              {isAm ? 'ተደጋጋሚ ጥያቄዎች' : 'Read the FAQ'}
            </Link>
          </div>
        </section>

        {/* ── Open source ── */}
        <section className="about-section">
          <h2 className="about-section__title">
            {isAm ? 'ክፍት ምንጭ' : 'Open Source'}
          </h2>
          <p className="about-section__text">
            {isAm
              ? 'ፎንትሃበሻ ክፍት ምንጭ ፕሮጀክት ነው። ኮዱ በ GitHub ላይ ሊገኝ ይችላል። አስተዋጽዖ ለማድረግ፣ ሪፖርት ለማቅረብ፣ ወይም ሐሳብ ለማካፈል ቀጥታ ወደ GitHub ሂዱ።'
              : 'Fonthabesha is an open-source project. The source code is available on GitHub. Contributions, bug reports, and feature suggestions are welcome.'}
          </p>
        </section>

      </div>
    </>
  );
}
