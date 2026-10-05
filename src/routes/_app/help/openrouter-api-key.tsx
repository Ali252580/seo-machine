import { createFileRoute } from "@tanstack/react-router";

const OPENROUTER_KEYS_URL = "https://openrouter.ai/settings/keys";
const VERCEL_ENV_URL =
  "https://vercel.com/chekad/seo-machine-api/settings/environment-variables";

export const Route = createFileRoute("/_app/help/openrouter-api-key")({
  component: OpenrouterApiKeyHelpPage,
});

function OpenrouterApiKeyHelpPage() {
  return (
    <main dir="rtl" className="overflow-auto px-4 py-6 pb-24 md:px-6 md:pb-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="card border border-base-300 bg-base-100">
          <div className="card-body gap-3">
            <h1 className="text-2xl font-semibold">
              راه‌اندازی عامل هوشمند SAM
            </h1>
            <p className="text-sm leading-7 text-base-content/70">
              SAM عامل هوشمند داخل سایت است و پاسخ‌ها را از OpenRouter دریافت
              می‌کند. کلید سرویس باید فقط به‌عنوان متغیر محیطی سرور نگهداری شود.
            </p>
          </div>
        </section>

        <section className="card border border-base-300 bg-base-100">
          <div className="card-body gap-4">
            <h2 className="card-title text-base">تنظیم کلید در Vercel</h2>
            <ol className="list-decimal space-y-3 pr-5 text-sm leading-7 text-base-content/80">
              <li>
                در{" "}
                <a
                  className="link link-primary"
                  href={OPENROUTER_KEYS_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenRouter
                </a>{" "}
                یک کلید API بسازید.
              </li>
              <li>
                در{" "}
                <a
                  className="link link-primary"
                  href={VERCEL_ENV_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  تنظیمات پروژهٔ Vercel
                </a>{" "}
                متغیر
                <code dir="ltr" className="mx-1">
                  OPENROUTER_API_KEY
                </code>{" "}
                را برای Production اضافه کنید.
              </li>
              <li>یک Deployment تازه بسازید تا متغیر جدید به سرور برسد.</li>
            </ol>
            <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm leading-7">
              گفت‌وگوی SAM در Vercel از PostgreSQL برای تاریخچه استفاده می‌کند.
              علاوه بر کلید OpenRouter، متغیر{" "}
              <code dir="ltr">DATABASE_URL</code>
              باید تنظیم شود و migrationهای پروژه در ساخت تازه اجرا شوند.
            </p>
          </div>
        </section>

        <section className="card border border-base-300 bg-base-100">
          <div className="card-body gap-3 text-sm leading-7 text-base-content/75">
            <h2 className="card-title text-base">استقرار محلی یا Cloudflare</h2>
            <p>
              در اجرای محلی، مقدار کلید را در <code dir="ltr">.env.local</code>
              با نام <code dir="ltr">OPENROUTER_API_KEY</code> قرار دهید. در
              Cloudflare، آن را در Variables &amp; Secrets همان Worker ثبت کنید.
              سپس برنامه را دوباره اجرا کنید.
            </p>
            <p>کلید را در چت، فایل‌های Git یا فرم‌های عمومی سایت قرار ندهید.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
