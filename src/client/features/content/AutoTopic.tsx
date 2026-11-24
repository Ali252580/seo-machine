import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookOpen, Search } from "lucide-react";
import { getArticleTopicAutomation } from "@/serverFunctions/automation";
import { generateWritingTopic } from "@/serverFunctions/contentResearch";
import {
  topicDemandLabel,
  topicMessages,
  type WritingTopic,
} from "@/shared/writingTopic";
import { getErrorCode } from "@/client/lib/error-messages";

export function AutoTopic({
  projectId,
  blog,
  onChoose,
}: {
  projectId: string;
  blog: boolean;
  onChoose: (title: string, keyword: string, brief: string) => void;
}) {
  const params = { projectId };
  const automated = useQuery({
    queryKey: ["scheduledWritingTopic", projectId],
    queryFn: () => getArticleTopicAutomation({ data: params }),
    enabled: blog,
    refetchInterval: (query) => (query.state.data?.enabled ? 60_000 : false),
  });
  const generate = useMutation({
    mutationFn: () => generateWritingTopic({ data: { projectId, blog } }),
  });
  const scheduled = blog ? automated.data : undefined;
  const topic = generate.data ?? scheduled?.topic;
  const date =
    !generate.data && scheduled?.updatedAt
      ? new Date(scheduled.updatedAt).toLocaleDateString("fa-IR")
      : null;

  return (
    <section
      id="topic-research"
      aria-labelledby="topic-research-title"
      className="scroll-mt-4 space-y-4 rounded-xl border border-primary/30 bg-base-100 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <h3
            id="topic-research-title"
            className="flex items-center gap-2 font-semibold"
          >
            <Search size={18} aria-hidden="true" />
            کشف موضوع از جست‌وجوهای گوگل
          </h3>
          <p className="text-sm leading-7 text-base-content/75">
            بر اساس فعالیت سایت، تقاضای کلمات و صفحات رقیب یک موضوع پیدا می‌شود.
            پیش از پیشنهاد، موضوع با محتوای سایت تطبیق داده می‌شود. برای شروع به
            مقالهٔ قبلی یا کلمهٔ ذخیره‌شده نیاز ندارید.
          </p>
        </div>
        <button
          className="btn btn-primary w-full sm:w-auto"
          disabled={generate.isPending}
          onClick={() => generate.mutate()}
        >
          {generate.isPending
            ? "در حال تحقیق…"
            : topic
              ? "تحقیق دوباره"
              : "پیدا کردن موضوع"}
        </button>
      </div>
      <p className="text-xs leading-6 text-base-content/70">
        تحقیق تازه از اعتبار پروژه استفاده می‌کند.
        {blog && (
          <>
            {" "}
            <Link
              to="/p/$projectId/recommendations"
              params={params}
              hash="seo-skills"
              className="link link-primary"
            >
              {scheduled?.enabled
                ? "مدیریت تحقیق خودکار"
                : "تنظیم اجرای خودکار مهارت‌ها"}
            </Link>
          </>
        )}
      </p>
      {generate.isPending && (
        <p role="status" className="text-sm">
          کلمات مرتبط، نتایج گوگل و تداخل با صفحات موجود بررسی می‌شوند…
        </p>
      )}
      {generate.isError && (
        <p role="alert" className="text-sm text-error">
          {getErrorCode(generate.error) === "INSUFFICIENT_CREDITS"
            ? "اعتبار پروژه برای تحقیق کافی نیست."
            : "تحقیق کامل نشد. دسترسی سرویس تحقیق کلمات و مدل را بررسی و دوباره تلاش کنید."}
        </p>
      )}
      {blog && automated.isError && (
        <p role="alert" className="text-sm">
          دریافت نتیجهٔ زمان‌بندی‌شده ممکن نشد.{" "}
          <button className="link" onClick={() => void automated.refetch()}>
            دریافت دوباره
          </button>
        </p>
      )}
      {scheduled?.enabled && !topic && !generate.isPending && (
        <p role="status" className="text-sm">
          {scheduled.failed
            ? "آخرین اجرای خودکار تحقیق کلمات کامل نشد."
            : "اجرای خودکار فعال است. نتیجه پس از نوبت تحقیق کلمات همین‌جا می‌آید."}
        </p>
      )}
      {topic && (
        <div
          className="space-y-3 rounded-lg bg-base-200/60 p-4"
          aria-live="polite"
        >
          {date && (
            <p className="text-xs text-base-content/70">
              تحقیق خودکار · {date}
            </p>
          )}
          {topic.status === "ready" ? (
            <>
              <h4 className="text-lg font-semibold leading-relaxed">
                {topic.title}
              </h4>
              <p className="text-sm leading-7">{topic.angle}</p>
              <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-base-content/70">کلمهٔ هدف</dt>
                  <dd className="mt-1 font-medium" dir="auto">
                    {topic.keyword}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-base-content/70">شاهد تقاضا</dt>
                  <dd className="mt-1 font-medium">
                    {topicDemandLabel(topic.demand)}
                  </dd>
                </div>
              </dl>
              <details className="text-sm">
                <summary className="cursor-pointer py-2 font-medium">
                  منابع تحقیق و بررسی تداخل
                </summary>
                <p className="leading-7">
                  عبارت پایه «{topic.seed}» بود. در{" "}
                  {[
                    topic.sources.discovery && "صفحات شناسایی‌شدهٔ سایت",
                    topic.sources.wordpress && "وردپرس",
                    topic.sources.searchConsole && "سرچ کنسول",
                  ]
                    .filter(Boolean)
                    .join("، ")}{" "}
                  صفحهٔ مشابهی پیدا نشد. نمونه‌هایی از نتایج گوگل برای کلمهٔ هدف
                  در ادامه آمده است.
                </p>
                <ul className="space-y-1 py-2">
                  {topic.results.map((item) => (
                    <li key={item.url}>
                      <a
                        href={item.url}
                        className="link break-words"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
              <button
                className="btn btn-sm btn-primary"
                onClick={() =>
                  onChoose(topic.title, topic.keyword, topic.angle)
                }
              >
                <BookOpen size={16} aria-hidden="true" /> بررسی و نگارش
              </button>
            </>
          ) : (
            <TopicFinding topic={topic} projectId={projectId} />
          )}
        </div>
      )}
    </section>
  );
}

function TopicFinding({
  topic,
  projectId,
}: {
  topic: Exclude<WritingTopic, { status: "ready" }>;
  projectId: string;
}) {
  return (
    <>
      <p className="text-sm leading-7">{topicMessages[topic.status]}</p>
      {topic.status === "no_context" && (
        <Link
          className="link link-primary text-sm"
          to="/p/$projectId/context"
          params={{ projectId }}
        >
          تکمیل زمینهٔ پروژه
        </Link>
      )}
      {topic.status === "covered" && (
        <ul className="space-y-2 text-sm">
          {topic.pages.map((page) => (
            <li key={page.url}>
              <a
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
                className="link break-words"
              >
                {page.title || page.url}
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
