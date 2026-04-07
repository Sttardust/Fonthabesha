/**
 * AboutPage — /about
 *
 * Static informational page covering the platform mission,
 * how the review workflow works, and how to contribute.
 */

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

export default function AboutPage() {
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';

  return (
    <>
      <Helmet>
        <title>{t('about.title')} — Fonthabesha</title>
        <meta
          name="description"
          content="Fonthabesha is an open platform for discovering, reviewing, and downloading high-quality free Ethiopic and Amharic typefaces."
        />
        <meta property="og:title"       content={`${t('about.title')} — Fonthabesha`} />
        <meta property="og:description" content="Fonthabesha is an open platform for discovering, reviewing, and downloading high-quality free Ethiopic and Amharic typefaces." />
        <meta property="og:type"        content="website" />
      </Helmet>

      <div className="page-container page-container--narrow">

        {/* ── Hero ── */}
        <header className="about-hero">
          <p className="eyebrow">Fonthabesha</p>
          {isAmharic ? (
            <>
              <h1 className="about-hero__title" lang="am">ስለ ፎንትሃቤሻ</h1>
              <p className="about-hero__lead">
                ፎንትሃቤሻ — ነፃ የሆኑ አማርኛ እና ኢትዮጵያዊ ፊደሎችን ለሁሉም ተደራሽ ለማድረግ የተቋቋመ ክፍት መድረክ።
              </p>
            </>
          ) : (
            <>
              <h1 className="about-hero__title">About Fonthabesha</h1>
              <p className="about-hero__lead">
                Fonthabesha is an open platform dedicated to making high-quality Ethiopic
                and Amharic typefaces freely available to designers, developers, and
                communities worldwide.
              </p>
            </>
          )}
        </header>

        {/* ── Mission ── */}
        <section className="about-section">
          <h2 className="about-section__title">
            {isAmharic ? 'ተልዕኮ' : 'Mission'}
          </h2>
          {isAmharic ? (
            <p>
              የኢትዮጵያ ጽሑፍ ከ2,000 ዓመታት በላይ ያስቆጠረ ታሪካዊ ፊደል ቤተሰብ ነው። ሆኖም ከዲጂታሉ ዓለም
              ጋር ለሚሠሩ ዲዛይነሮች እና ገንቢዎች ተደራሽ የሚሆን ጥራት ያለው ፊደል ማግኘት አሁንም ፈታኝ ሆኖ ይቆያል።
              ፎንትሃቤሻ ይህን ክፍተት ለመሙላት ይሠራል — ፊደሎቹ ከምንጭ እስከ ሽልማት ድረስ ሙሉ ግልጽነት
              ባለው ሂደት ውስጥ ሲሆን ለሁሉም ነፃ ሆነው ይቀርባሉ።
            </p>
          ) : (
            <p>
              Ethiopic script is one of the world's oldest writing systems, with a history
              spanning over two millennia. Yet for designers and developers working with
              digital products, finding high-quality, freely licensed Ethiopic typefaces
              remains difficult. Fonthabesha exists to close that gap — every font on the
              platform is openly licensed, peer-reviewed, and freely available.
            </p>
          )}
        </section>

        {/* ── How it works ── */}
        <section className="about-section">
          <h2 className="about-section__title">
            {isAmharic ? 'እንዴት ይሠራል' : 'How It Works'}
          </h2>
          {isAmharic ? (
            <ol className="about-steps">
              <li>
                <strong>አስተዋጽዖ አበርካቾች</strong> ፊደሎቻቸውን ወደ ፖርታሉ ያቀርባሉ። ስለ ባለቤትነት
                ማስረጃ፣ ፈቃድ እና ፊደሉ ስለ ሚሸፍናቸው ቋንቋዎች መረጃ ያካትታሉ።
              </li>
              <li>
                <strong>ሥርዓቱ</strong> የቀረቡትን ፋይሎች አውቶማቲክ ያስኬዳቸዋል — የፊደሉ ሜትሪክስ፣
                ቅርጽ እና ሽፋን ይፈተናሉ።
              </li>
              <li>
                <strong>ገምጋሚዎቻችን</strong> እያንዳንዱን ቀረቤታ ያጠናሉ — ፊደሉ ከጥራት አቅጣጫ
                ደረጃውን ጠብቆ ከሆነ ያጸድቃሉ፣ ካልሆነ ደግሞ ለውጥ ይጠይቃሉ ወይም ይቃወሙ።
              </li>
              <li>
                <strong>ፊደሉ ከጸደቀ</strong> ወዲያውኑ ለሁሉም ዓለም ነፃ ለማውረድ ይቀርባል።
              </li>
            </ol>
          ) : (
            <ol className="about-steps">
              <li>
                <strong>Contributors</strong> submit their font families through the
                contributor portal, providing ownership evidence, licensing information,
                and metadata about script coverage.
              </li>
              <li>
                <strong>Automated processing</strong> analyses each submission — checking
                font metrics, file integrity, and script coverage.
              </li>
              <li>
                <strong>Our reviewers</strong> inspect each submission in detail. They
                can approve, request changes, or reject submissions based on quality
                and licensing standards.
              </li>
              <li>
                <strong>Approved fonts</strong> are immediately published to the catalog
                and made available for free download by anyone.
              </li>
            </ol>
          )}
        </section>

        {/* ── Contribute ── */}
        <section className="about-section">
          <h2 className="about-section__title">
            {isAmharic ? 'አስተዋጽዖ ያድርጉ' : 'Contribute a Font'}
          </h2>
          {isAmharic ? (
            <>
              <p>
                ክፍት ፈቃድ ስር ያወጣዋቸው ፊደሎች ካሉዎት — OFL፣ Apache 2.0 ወይም MIT — ወደ ፎንትሃቤሻ
                ካታሎጉ እንዲካተቱ ይጋብዘዎታለን። መለያ ያዘጋጁ፣ ወደ አስተዋጽዖ ፖርታሉ ይግቡ፣ ከዚያ ፊደሎቹን
                አቅርቡ።
              </p>
              <Link to="/contributor" className="btn btn--primary">
                ወደ አስተዋጽዖ ፖርታል →
              </Link>
            </>
          ) : (
            <>
              <p>
                If you have font families licensed under an open license — OFL, Apache 2.0,
                or MIT — we welcome contributions to the Fonthabesha catalog. Create an
                account, navigate to the contributor portal, and submit your fonts.
                Our reviewers will guide the rest.
              </p>
              <Link to="/contributor" className="btn btn--primary">
                Go to Contributor Portal →
              </Link>
            </>
          )}
        </section>

        {/* ── Open source note ── */}
        <section className="about-section">
          <h2 className="about-section__title">
            {isAmharic ? 'ክፍት ምንጭ' : 'Open Source'}
          </h2>
          {isAmharic ? (
            <p>
              ፎንትሃቤሻ ክፍት ምንጭ ፕሮጀክት ነው። መድረኩ ራሱ፣ የፊደሎቹ ፋይሎች እና ሁሉም ሜታዳታ
              ሙሉ ግልጽነት ባለው ሁኔታ ይቀርባሉ። ለፕሮጀክቱ አስተዋጽዖ ለማድረግ ወይም ስለ ውሳኔዎቻችን
              ለማወቅ ቅርብ ይሁኑ።
            </p>
          ) : (
            <p>
              Fonthabesha is an open project. The platform, the font files, and all
              associated metadata are made available with full transparency. We welcome
              contributions to the project and feedback on how we can improve.
            </p>
          )}
        </section>

      </div>
    </>
  );
}
