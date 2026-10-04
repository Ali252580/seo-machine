import {
  ArrowLeft,
  BarChart3,
  Check,
  FileText,
  Globe2,
  Layers3,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
export function HomeDetails() {
  return (
    <>
      <section className="seo-ai-section" id="ai">
        <div className="seo-container seo-ai-layout">
          <div>
            <span className="seo-eyebrow">
              <Sparkles size={16} /> دستیار هوشمند سئوی شما
            </span>
            <h2>
              از «این داده یعنی چه؟»
              <br />
              به «حالا چه‌کار کنم؟»
            </h2>
            <p>
              دربارهٔ پروژه‌تان گفت‌وگو کنید. عامل هوشمند با ابزارهای در دسترس
              می‌تواند به بررسی داده‌ها، تدوین برنامهٔ محتوا و آماده‌کردن گزارش
              کمک کند.
            </p>
            <ul>
              <li>
                <Check /> تحلیل فرصت‌ها با توجه به زمینهٔ کسب‌وکار
              </li>
              <li>
                <Check /> کمک به سرفصل، ساختار و پیش‌نویس محتوا
              </li>
              <li>
                <Check /> توضیح یافته‌ها و پیشنهاد اقدام بعدی
              </li>
            </ul>
            <a href="/sign-up" className="seo-button seo-button-light">
              ساخت فضای کاری <ArrowLeft size={18} />
            </a>
            <small>
              خروجی هوش مصنوعی پیش از استفاده یا انتشار نیازمند بازبینی شماست.
            </small>
          </div>
          <div className="seo-chat">
            <div className="seo-chat-header">
              <span>
                <Sparkles size={18} /> دستیار OpenSEO
              </span>
              <span>نمونهٔ گفت‌وگو</span>
            </div>
            <div className="seo-chat-user">
              برای صفحهٔ «طراحی روف گاردن» چه محتوایی آماده کنم؟
            </div>
            <div className="seo-chat-reply">
              <span className="seo-chat-avatar">
                <Sparkles size={18} />
              </span>
              <div>
                <p>برای شروع، این ساختار را بررسی کنیم:</p>
                <div className="seo-outline">
                  <span>
                    هدف صفحه <b>کمک به انتخاب خدمات</b>
                  </span>
                  <span>
                    موضوعات اصلی <b>هزینه، مراحل اجرا، نگهداری</b>
                  </span>
                  <span>
                    قبل از نوشتن <b>بررسی نیاز مخاطب و منابع</b>
                  </span>
                </div>
                <p>
                  اگر نمونه‌کارها و خدمات اصلی‌تان را اضافه کنید، می‌توانیم
                  ساختار را متناسب با کسب‌وکار شما کامل کنیم.
                </p>
              </div>
            </div>
            <div className="seo-chat-footer">
              <ShieldCheck size={15} /> پیشنهاد نمونه؛ تحلیل واقعی به داده و مدل
              متصل وابسته است.
            </div>
          </div>
        </div>
      </section>

      <section className="seo-section seo-container" id="workflow">
        <div className="seo-centered-heading">
          <span className="seo-eyebrow">از اولین بررسی تا تصمیم بعدی</span>
          <h2>پروژهٔ سئو، با یک مسیر روشن.</h2>
          <p>اطلاعات را جمع کنید، فرصت‌ها را بسنجید و تغییرات را دنبال کنید.</p>
        </div>
        <div className="seo-steps">
          {[
            {
              title: "سایت و هدف را مشخص کنید",
              text: "یک پروژه بسازید و دامنه، بازار هدف و زمینهٔ کسب‌وکار را وارد کنید.",
            },
            {
              title: "داده و فرصت‌ها را بررسی کنید",
              text: "کلمات، رقبا و وضعیت فنی را مرور کنید و در صورت نیاز حساب‌های گوگل را وصل کنید.",
            },
            {
              title: "برنامه را اجرا و نتیجه را پیگیری کنید",
              text: "با کمک تحلیل و هوش مصنوعی، برنامهٔ محتوا بسازید و روند رتبه و عملکرد را بسنجید.",
            },
          ].map((step, index) => (
            <article key={step.title}>
              <span className="seo-step-number">
                {["۰۱", "۰۲", "۰۳"][index]}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="seo-integration-section" id="integrations">
        <div className="seo-container">
          <div className="seo-section-heading">
            <div>
              <span className="seo-eyebrow">اتصال به منبع داده</span>
              <h2>
                گزارش‌های گوگل،
                <br />
                در کنار ابزارهای سئو.
              </h2>
            </div>
            <p>
              حساب و Property را خودتان انتخاب می‌کنید. OpenSEO با مجوز شما
              داده‌های فقط‌خواندنی را برای گزارش‌های پروژه دریافت می‌کند.
            </p>
          </div>
          <div className="seo-integration-grid">
            <article>
              <div className="seo-service-icon seo-service-blue">
                <Search size={27} />
              </div>
              <span className="seo-service-name" dir="ltr">
                Google Search Console
              </span>
              <h3>کاربر چطور شما را پیدا می‌کند؟</h3>
              <p>
                کلیک‌ها، نمایش‌ها، نرخ کلیک، میانگین جایگاه و عملکرد عبارت‌ها و
                صفحات سایت خود را بررسی کنید.
              </p>
              <span className="seo-permission">
                <ShieldCheck size={15} /> نیازمند مجوز دسترسی به Property
              </span>
            </article>
            <article>
              <div className="seo-service-icon seo-service-orange">
                <BarChart3 size={27} />
              </div>
              <span className="seo-service-name" dir="ltr">
                Google Analytics 4
              </span>
              <h3>بعد از ورود به سایت چه می‌شود؟</h3>
              <p>
                جلسه‌های ورودی ارگانیک، کاربران فعال، نرخ تعامل و رویدادهای
                کلیدی را در گزارش عملکرد دنبال کنید.
              </p>
              <span className="seo-permission">
                <ShieldCheck size={15} /> اتصال اختیاری و فقط‌خواندنی
              </span>
            </article>
          </div>
          <div className="seo-data-note">
            <ShieldCheck size={21} />
            <p>
              کنترل دسترسی با شماست. اتصال‌های گوگل را در تنظیمات پروژه مدیریت
              کنید و مجوز را از حساب گوگل لغو کنید.
            </p>
            <a href="/privacy">
              سیاست حریم خصوصی <ArrowLeft size={16} />
            </a>
          </div>
        </div>
      </section>

      <section className="seo-section seo-container seo-audience">
        <div>
          <span className="seo-eyebrow">برای کار واقعی سئو</span>
          <h2>
            متناسب با پروژهٔ شما،
            <br />
            از یک سایت تا چند مشتری.
          </h2>
          <p>
            با زمینهٔ هر کسب‌وکار کار کنید و گزارش‌ها و فرصت‌های آن را در فضای
            پروژه نگه دارید.
          </p>
        </div>
        <div className="seo-audience-list">
          <article>
            <Globe2 />
            <div>
              <h3>صاحبان کسب‌وکار</h3>
              <p>
                عملکرد سایت را بفهمید و برای قدم بعدی دید روشن‌تری داشته باشید.
              </p>
            </div>
          </article>
          <article>
            <FileText />
            <div>
              <h3>کارشناسان سئو و محتوا</h3>
              <p>
                تحقیق، تحلیل و برنامه‌ریزی محتوایی را در یک جریان کاری دنبال
                کنید.
              </p>
            </div>
          </article>
          <article>
            <Layers3 />
            <div>
              <h3>تیم‌ها و آژانس‌ها</h3>
              <p>
                پروژه‌های مشتریان را سازمان‌دهی کنید و یافته‌ها را به گزارش
                تبدیل کنید.
              </p>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
