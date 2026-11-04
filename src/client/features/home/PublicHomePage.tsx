import { useRef } from "react";
import {
  ArrowLeft,
  ArrowUpLeft,
  Check,
  ChevronDown,
  Compass,
  FileText,
  Link2,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WandSparkles,
} from "lucide-react";
import homeCss from "./home.css?url";
import { ProductPreview } from "./ProductPreview";
import { HomeDetails } from "./HomeDetails";

const features = [
  {
    icon: Search,
    title: "کلمات درست را پیدا کنید",
    tag: "تحقیق کلمات کلیدی",
    text: "ایده‌های مرتبط را کشف کنید، قصد جست‌وجو را بررسی کنید و کلمات منتخب را برای برنامهٔ محتوایی ذخیره کنید.",
  },
  {
    icon: TrendingUp,
    title: "تغییر رتبه‌ها را ببینید",
    tag: "ردیابی رتبه",
    text: "جایگاه کلمات و صفحهٔ رتبه‌گرفته را بر اساس کشور و دستگاه دنبال کنید؛ تاریخچهٔ بررسی‌ها را کنار هم ببینید.",
  },
  {
    icon: Compass,
    title: "رقابت را بهتر بشناسید",
    tag: "تحلیل دامنه",
    text: "کلمات و صفحات دامنه‌های دیگر را بررسی کنید تا برای پوشش موضوعات و بهبود صفحات خود تصمیم بگیرید.",
  },
  {
    icon: Link2,
    title: "پروفایل لینک را بررسی کنید",
    tag: "تحلیل بک‌لینک",
    text: "دامنه‌های ارجاع‌دهنده، صفحات مبدأ و مقصد و متن لینک‌ها را با دادهٔ سرویس متصل مرور کنید.",
  },
  {
    icon: ShieldCheck,
    title: "مشکلات فنی را پیدا کنید",
    tag: "ممیزی سایت",
    text: "صفحات سایت را بررسی کنید و خطاها و پیشنهادهای فنی را در گزارش ممیزی برای پیگیری نگه دارید.",
  },
  {
    icon: FileText,
    title: "تحلیل را به گزارش تبدیل کنید",
    tag: "گزارش و همکاری",
    text: "یافته‌ها، کلمات منتخب و زمینهٔ هر پروژه را سازمان‌دهی کنید و گزارش قابل اشتراک‌گذاری بسازید.",
  },
];

const questions = [
  [
    "برای شروع باید Search Console یا Analytics را وصل کنم؟",
    "خیر. اتصال گوگل اختیاری است. با اتصال Search Console می‌توانید دادهٔ کلیک، نمایش و جایگاه سایت خود را ببینید و با اتصال GA4 گزارش بازدید و تعامل را بررسی کنید. سایر ابزارها به تنظیمات و سرویس دادهٔ مربوط به خود نیاز دارند.",
  ],
  [
    "آیا اعداد پیش‌نمایش این صفحه، آمار سایت من هستند؟",
    "خیر. اعداد و پیشنهادهای پیش‌نمایش صرفاً نمونهٔ نمایشی هستند. داخل فضای کاری، گزارش‌ها بر اساس پروژه، دسترسی‌های شما و پاسخ سرویس دادهٔ متصل ساخته می‌شوند.",
  ],
  [
    "آیا رتبه‌ای که می‌بینم با جست‌وجوی شخصی من یکسان است؟",
    "لزوماً نه. مکان، دستگاه، زمان و شخصی‌سازی می‌توانند نتیجهٔ گوگل را تغییر دهند. برای مقایسهٔ دوره‌ها، تنظیمات کشور و دستگاه را ثابت نگه دارید. هیچ ابزار ردیابی، رتبهٔ یکسان برای همهٔ جست‌وجوها را تضمین نمی‌کند.",
  ],
  [
    "هوش مصنوعی چه کمکی به تولید محتوا می‌کند؟",
    "عامل SAM داخل همین سایت، با توجه به امکانات و اعتبار حساب، در توضیح داده‌ها، پیشنهاد موضوع و تهیهٔ پیش‌نویس کمک می‌کند. کاربر نیازی به تنظیم کلید مدل یا رفتن به محیط دیگری ندارد. پیش از انتشار، صحت اطلاعات و تناسب متن با کسب‌وکار را بازبینی کنید.",
  ],
  [
    "هزینهٔ استفاده چگونه مشخص می‌شود؟",
    "امکانات قابل استفاده و اعتبار حساب را در بخش صورت‌حساب می‌بینید. مصرف ابزارهای متصل به سرویس‌های داده و هوش مصنوعی به نوع عملیات و تنظیمات حساب بستگی دارد. برای اطلاع از وضعیت فعلی، وارد حساب شوید.",
  ],
  [
    "آیا می‌توانم اتصال گوگل را قطع کنم؟",
    "بله. می‌توانید اتصال پروژه را از تنظیمات مدیریت کنید و مجوز برنامه را از حساب Google خود لغو کنید. جزئیات دسترسی، استفاده و نگهداری داده‌ها در صفحهٔ سیاست حریم خصوصی آمده است.",
  ],
];

function Brand() {
  return (
    <a className="seo-brand" href="/" aria-label="OpenSEO، صفحهٔ اصلی">
      <span dir="ltr">OpenSEO</span>
    </a>
  );
}

export function PublicHomePage() {
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  return (
    <main className="seo-home" dir="rtl">
      <link rel="stylesheet" href={homeCss} />
      <a className="seo-skip" href="#home-content">
        رفتن به محتوای اصلی
      </a>
      <header className="seo-header">
        <div className="seo-container seo-nav">
          <Brand />
          <nav aria-label="منوی اصلی" className="seo-desktop-nav">
            <a href="#features">ابزارهای سئو</a>
            <a href="#start">از کجا شروع کنم؟</a>
            <a href="#ai">هوش مصنوعی</a>
            <a href="#integrations">اتصال‌ها</a>
            <a href="#faq">پرسش‌ها</a>
          </nav>
          <div className="seo-nav-actions">
            <a href="/sign-in" className="seo-login">
              ورود
            </a>
            <a href="/sign-up" className="seo-button seo-button-small">
              ساخت حساب <ArrowLeft size={16} />
            </a>
          </div>
          <details
            ref={mobileMenu}
            className="seo-mobile-nav"
            onKeyDown={(event) => {
              if (event.key === "Escape" && mobileMenu.current?.open) {
                mobileMenu.current.open = false;
                mobileMenu.current.querySelector("summary")?.focus();
              }
            }}
          >
            <summary aria-label="باز کردن منو">
              <ChevronDown size={22} />
            </summary>
            <nav
              aria-label="منوی موبایل"
              onClick={(event) => {
                if (
                  (event.target as HTMLElement).closest("a") &&
                  mobileMenu.current
                )
                  mobileMenu.current.open = false;
              }}
            >
              <a href="#features">ابزارهای سئو</a>
              <a href="#start">از کجا شروع کنم؟</a>
              <a href="#ai">هوش مصنوعی</a>
              <a href="#integrations">اتصال‌ها</a>
              <a href="#faq">پرسش‌ها</a>
            </nav>
          </details>
        </div>
      </header>

      <section className="seo-hero seo-container" id="home-content">
        <div className="seo-hero-copy">
          <div className="seo-eyebrow">
            <Sparkles size={16} /> فضای کاری سئو برای سایت شما
          </div>
          <h1>
            بدانید چه چیزی را
            <br />
            بهتر کنید؛ از داده تا محتوا.
          </h1>
          <p>
            عملکرد سایت را ببینید، فرصت‌های سئو را اولویت‌بندی کنید و با کمک SAM
            پیش‌نویس قابل ویرایش بسازید. تحقیق، نگارش و پیگیری نتیجه، در پروژهٔ
            همان سایت.
          </p>
          <div className="seo-hero-actions">
            <a className="seo-button" href="/sign-up">
              ساخت اولین پروژه <ArrowLeft size={18} />
            </a>
            <a className="seo-text-link" href="#product">
              ببین چطور کار می‌کند <ArrowUpLeft size={17} />
            </a>
          </div>
          <div className="seo-hero-notes">
            <span>
              <Check size={15} /> فضای کاری فارسی
            </span>
            <span>
              <Check size={15} /> هوش مصنوعی داخل سایت
            </span>
          </div>
        </div>
        <div className="seo-hero-visual" id="product">
          <ProductPreview />
          <div className="seo-visual-caption">
            <span className="seo-caption-line" /> پیدا کن. تحلیل کن. قدم بعدی را
            انتخاب کن.
          </div>
        </div>
      </section>

      <section
        className="seo-start seo-container"
        id="start"
        aria-labelledby="seo-start-title"
      >
        <div className="seo-start-heading">
          <span className="seo-eyebrow">قدم اول متناسب با نیاز شما</span>
          <h2 id="seo-start-title">امروز روی چه چیزی کار می‌کنید؟</h2>
          <p>
            بعد از ساخت حساب، سایت خود را در یک پروژه ثبت کنید و از مسیر مناسب
            شروع کنید.
          </p>
        </div>
        <div className="seo-start-grid">
          {[
            {
              icon: ShieldCheck,
              title: "سایتم نیاز به بررسی دارد",
              text: "خزش را اجرا کنید؛ خطاهای فنی و صفحات نیازمند اصلاح را ببینید.",
              result: "خروجی: فهرست مشکل‌ها و صفحات درگیر",
              href: "#features",
              action: "آشنایی با ابزارهای بررسی",
            },
            {
              icon: FileText,
              title: "می‌خواهم محتوا بنویسم",
              text: "زمینهٔ کسب‌وکار و موضوع را مشخص کنید؛ برای وبلاگ یا صفحهٔ خدمات، پیش‌نویس مناسب بسازید.",
              result: "خروجی: متن قابل ویرایش و بازبینی",
              href: "#ai",
              action: "دیدن روند کار با SAM",
            },
            {
              icon: TrendingUp,
              title: "می‌خواهم نتیجه را بدانم",
              text: "سرچ کنسول را متصل کنید و عملکرد صفحات را کنار تاریخچهٔ رتبه‌ها بررسی کنید.",
              result: "خروجی: آمار و فرصت‌های بهبود",
              href: "#integrations",
              action: "آشنایی با گزارش‌های گوگل",
            },
          ].map(({ icon: Icon, title, text, result, href, action }) => (
            <article key={title}>
              <Icon size={24} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
              <small>{result}</small>
              <a href={href}>
                {action}
                <ArrowLeft size={17} aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="seo-context-strip">
        <div className="seo-container">
          <p>یک مسیر پیوسته برای کار سئو</p>
          <div>
            <span>
              <Search /> کشف فرصت
            </span>
            <ArrowLeft />
            <span>
              <WandSparkles /> تحلیل هوشمند
            </span>
            <ArrowLeft />
            <span>
              <FileText /> برنامهٔ محتوا
            </span>
            <ArrowLeft />
            <span>
              <TrendingUp /> سنجش نتیجه
            </span>
          </div>
        </div>
      </section>

      <section className="seo-section seo-container" id="features">
        <div className="seo-section-heading">
          <div>
            <span className="seo-eyebrow">جعبه‌ابزار شما</span>
            <h2>
              تصویر کامل‌تری از
              <br />
              وضعیت سایت داشته باشید.
            </h2>
          </div>
          <p>
            برای تحقیق، اجرا و پیگیری نتیجه، ابزارهای مرتبط را در پروژهٔ خود
            کنار هم نگه دارید. هر بررسی، زمینه‌ای برای تصمیم بعدی است.
          </p>
        </div>
        <div className="seo-feature-grid">
          {features.map(({ icon: Icon, title, tag, text }) => (
            <article className="seo-feature" key={tag}>
              <div className="seo-feature-top">
                <span className="seo-icon">
                  <Icon size={23} />
                </span>
                <span>{tag}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <p className="seo-footnote">
          پوشش کشورها و معیارها به منبع دادهٔ هر ابزار بستگی دارد؛ همهٔ معیارها
          برای همهٔ بازارها در دسترس نیستند.
        </p>
      </section>

      <HomeDetails />
      <section className="seo-faq-section" id="faq">
        <div className="seo-container seo-faq-layout">
          <div>
            <span className="seo-eyebrow">پیش از شروع</span>
            <h2>پرسشی دارید؟</h2>
            <p>چند پاسخ برای شناخت بهتر امکانات، داده‌ها و نحوهٔ استفاده.</p>
            <a className="seo-text-link" href="mailto:seomachine@info.ir">
              تماس با پشتیبانی <ArrowUpLeft size={17} />
            </a>
          </div>
          <div>
            {questions.map(([question, answer]) => (
              <details className="seo-faq" key={question}>
                <summary>
                  {question}
                  <ChevronDown size={18} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="seo-container seo-final-cta">
        <div className="seo-cta-decoration" aria-hidden="true">
          <TrendingUp />
        </div>
        <span className="seo-eyebrow">قدم بعدی از همین‌جا</span>
        <h2>
          به داده‌های سایتت
          <br />
          یک مسیر عمل بده.
        </h2>
        <p>پروژه‌ات را بساز و ابزارهای موردنیازت را کنار هم قرار بده.</p>
        <a className="seo-button" href="/sign-up">
          ساخت حساب OpenSEO <ArrowLeft size={18} />
        </a>
        <a className="seo-cta-login" href="/sign-in">
          حساب دارید؟ وارد شوید
        </a>
      </section>
      <footer className="seo-footer">
        <div className="seo-container">
          <div className="seo-footer-main">
            <div>
              <Brand />
              <p>
                فضای کاری سئو و هوش مصنوعی؛
                <br />
                برای تحقیق، تحلیل و تصمیم‌گیری بهتر.
              </p>
            </div>
            <nav aria-label="ابزارهای صفحه">
              <strong>آشنایی با OpenSEO</strong>
              <a href="#features">امکانات سئو</a>
              <a href="#ai">دستیار هوشمند</a>
              <a href="#integrations">اتصال‌های گوگل</a>
            </nav>
            <nav aria-label="راهنما و قوانین">
              <strong>راهنما و شفافیت</strong>
              <a href="#faq">پرسش‌های رایج</a>
              <a href="/privacy">سیاست حریم خصوصی</a>
              <a href="/terms-and-conditions">شرایط استفاده</a>
              <a href="mailto:seomachine@info.ir">تماس با پشتیبانی</a>
            </nav>
          </div>
          <div className="seo-footer-bottom">
            <span>OpenSEO · پلتفرم تحلیل و مدیریت سئو</span>
            <span>نام‌های Google و محصولات آن متعلق به Google هستند.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
