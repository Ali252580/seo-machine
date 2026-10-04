import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProjects } from "@/serverFunctions/projects";
import {
  clearLastProjectId,
  getLastProjectId,
} from "@/client/lib/active-project";
import {
  getErrorCode,
  getStandardErrorMessage,
} from "@/client/lib/error-messages";
import { AuthConfigErrorCard } from "@/client/components/AuthConfigErrorCard";
import { UnauthenticatedErrorCard } from "@/client/components/UnauthenticatedErrorCard";
import { SUBSCRIBE_ROUTE } from "@/shared/billing";
import { useSession } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "OpenSEO | پلتفرم تحلیل و مدیریت سئو" },
      {
        name: "description",
        content:
          "OpenSEO پلتفرم تحقیق کلمات کلیدی، ردیابی رتبه، بررسی فنی سایت و تحلیل داده‌های Search Console و Google Analytics است.",
      },
    ],
  }),
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  const hosted = isHostedClientAuthMode();
  const { data: session, isPending: isSessionPending } = useSession();

  const { data, error, isError, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
    enabled: !hosted || Boolean(session?.user?.id),
    retry: false,
  });

  useEffect(() => {
    if (!data || data.length === 0) return;

    // localStorage is untrusted — only honor the remembered project if it's
    // actually in the org's list; otherwise fall back to the most recent and
    // clear the stale id.
    const lastProjectId = getLastProjectId();
    const target = data.find((project) => project.id === lastProjectId);
    if (lastProjectId && !target) {
      clearLastProjectId();
    }

    void navigate({
      to: "/p/$projectId",
      params: { projectId: (target ?? data[0]).id },
    });
  }, [data, navigate]);

  useEffect(() => {
    if (getErrorCode(error) !== "PAYMENT_REQUIRED") {
      return;
    }

    void navigate({ href: SUBSCRIBE_ROUTE });
  }, [error, navigate]);

  if (hosted && !session?.user?.id) {
    return isSessionPending ? null : <PublicHomePage />;
  }

  if (isError) {
    const errorCode = getErrorCode(error);

    if (errorCode === "AUTH_CONFIG_MISSING") {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <AuthConfigErrorCard
            message={getStandardErrorMessage(
              error,
              "خطای غیرمنتظره رخ داد. گزارش‌های سرور را بررسی کنید.",
            )}
            onRetry={() => {
              void refetch();
            }}
          />
        </div>
      );
    }

    if (errorCode === "UNAUTHENTICATED") {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <UnauthenticatedErrorCard
            message="برای دسترسی به سازمان خود در OpenSEO وارد شوید."
            onRetry={() => {
              void refetch();
            }}
          />
        </div>
      );
    }

    if (errorCode === "PAYMENT_REQUIRED") {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <div className="flex flex-col items-center gap-3 max-w-xl text-center">
            <p className="text-base-content/80">
              در حال انتقال به صفحهٔ صورت‌حساب برای فعال‌سازی اشتراک
              میزبانی‌شده.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="flex flex-col items-center gap-3 max-w-xl">
          <p className="text-error text-center">
            {getStandardErrorMessage(
              error,
              "خطای غیرمنتظره رخ داد. گزارش‌های سرور را بررسی کنید.",
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <span className="loading loading-spinner loading-md" />
    </div>
  );
}

function PublicHomePage() {
  return (
    <main className="min-h-dvh bg-base-100 text-base-content">
      <header className="border-b border-base-300">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a
            href="/"
            className="text-xl font-bold tracking-tight"
            aria-label="OpenSEO"
          >
            OpenSEO
          </a>
          <div className="flex items-center gap-4 text-sm">
            <a href="#features" className="hidden hover:text-primary sm:inline">
              امکانات
            </a>
            <Link to="/privacy" className="hidden hover:text-primary sm:inline">
              حریم خصوصی
            </Link>
            <Link to="/sign-in" className="btn btn-ghost btn-sm">
              ورود
            </Link>
          </div>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <p className="mb-4 text-sm font-semibold text-primary">
          پلتفرم تحلیل و مدیریت سئو
        </p>
        <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">
          تصمیم‌های بهتر برای رشد در جست‌وجو
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-base-content/70">
          OpenSEO ابزارهایی برای تحقیق کلمات کلیدی، ردیابی رتبه، بررسی فنی سایت،
          تحلیل بک‌لینک و ساخت گزارش سئو فراهم می‌کند. با اجازهٔ شما، داده‌های
          فقط‌خواندنی Google Search Console و Google Analytics را هم به تحلیل‌ها
          اضافه می‌کند.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/sign-up" className="btn btn-primary">
            ساخت حساب
          </Link>
          <Link to="/sign-in" className="btn btn-outline">
            ورود به OpenSEO
          </Link>
        </div>
        <p className="mt-4 text-sm text-base-content/60">
          اتصال حساب‌های گوگل اختیاری است و فقط پس از تأیید شما انجام می‌شود.
        </p>
      </section>

      <section
        id="features"
        className="border-y border-base-300 bg-base-200/50"
      >
        <div className="mx-auto grid max-w-6xl gap-5 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
          <FeatureCard
            title="تحقیق کلمات کلیدی"
            description="ایده‌ها و معیارهای جست‌وجو را بررسی و فرصت‌های محتوایی را اولویت‌بندی کنید."
          />
          <FeatureCard
            title="ردیابی رتبه"
            description="جایگاه کلمات کلیدی سایت را در کشور و دستگاه انتخاب‌شده دنبال کنید."
          />
          <FeatureCard
            title="تحلیل Search Console"
            description="کلیک‌ها، نمایش‌ها، عبارت‌های جست‌وجو و صفحات پربازدید را از حساب متصل خود ببینید."
          />
          <FeatureCard
            title="تحلیل Google Analytics"
            description="گزارش‌های بازدید و عملکرد صفحات را از Property انتخابی خود بررسی کنید."
          />
          <FeatureCard
            title="بررسی فنی و بک‌لینک"
            description="وضعیت فنی سایت و داده‌های لینک را برای پیدا کردن مسئله‌ها و فرصت‌ها مرور کنید."
          />
          <FeatureCard
            title="گزارش و همکاری"
            description="یافته‌های پروژه را در گزارش‌های قابل اشتراک‌گذاری و فضای کاری منظم نگه دارید."
          />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-8">
        <h2 className="text-2xl font-bold">کنترل داده‌ها در دست شماست</h2>
        <p className="mt-4 leading-8 text-base-content/70">
          داده‌های گوگل فقط برای نمایش گزارش‌های درخواستی شما استفاده می‌شوند.
          مجوز Search Console و Analytics خواندنی است؛ می‌توانید دسترسی OpenSEO
          را از تنظیمات حساب گوگل لغو کنید. جزئیات جمع‌آوری، نگهداری و حذف
          اطلاعات در سیاست حریم خصوصی آمده است.
        </p>
        <Link to="/privacy" className="btn btn-link mt-3">
          مطالعه سیاست حریم خصوصی
        </Link>
      </section>

      <footer className="border-t border-base-300">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-sm text-base-content/65 sm:px-8">
          <span>OpenSEO · ابزار تحلیل و مدیریت سئو</span>
          <div className="flex gap-5">
            <Link to="/privacy" className="hover:text-base-content">
              حریم خصوصی
            </Link>
            <Link
              to="/terms-and-conditions"
              className="hover:text-base-content"
            >
              شرایط استفاده
            </Link>
            <a
              href="mailto:chekad.company@gmail.com"
              className="hover:text-base-content"
            >
              تماس
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-box border border-base-300 bg-base-100 p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-3 leading-7 text-base-content/70">{description}</p>
    </article>
  );
}
