import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { discoverClusterPages } from "@/serverFunctions/contentClusters";
import {
  clusterSearchTopic,
  type DiscoveredClusterPage,
} from "@/shared/contentClusters";

export function ClusterPageDiscovery({
  projectId,
  onPages,
}: {
  projectId: string;
  onPages: (pages: DiscoveredClusterPage[]) => void;
}) {
  const [source, setSource] = useState<"sitemap" | "gsc" | "wordpress">(
    "sitemap",
  );
  const [search, setSearch] = useState("");
  const topic = clusterSearchTopic(search);
  const invalid = topic.length > 100 || /^https?:\/\//i.test(topic);
  const discover = useMutation({
    mutationFn: () =>
      discoverClusterPages({ data: { projectId, source, search } }),
    onSuccess: onPages,
  });
  return (
    <div className="space-y-3">
      <label className="block space-y-2">
        <span>روش شناسایی صفحات</span>
        <select
          className="select select-bordered w-full"
          value={source}
          disabled={discover.isPending}
          onChange={(event) => {
            setSource(event.target.value as typeof source);
            discover.reset();
          }}
        >
          <option value="sitemap">نقشهٔ سایت — بدون اتصال و دسترسی</option>
          <option value="gsc">سرچ کنسول — نیازمند اتصال گوگل</option>
          <option value="wordpress">وردپرس — نیازمند اتصال وردپرس</option>
        </select>
      </label>
      <p className="text-sm leading-7 text-base-content/70">
        {source === "sitemap"
          ? "نقشهٔ عمومی دامنهٔ همین پروژه و نقشه‌های زیرمجموعه بررسی می‌شوند؛ حداکثر ۲۰۰ نشانی از ۸ فایل. نیازی به رمز یا دسترسی سایت نیست. اگر نقشه پیدا نشود فقط صفحهٔ اصلی پیشنهاد می‌شود."
          : source === "gsc"
            ? "حداکثر ۵۰۰ ردیف صفحه و عبارت جست‌وجو در ۲۸ روز گذشته دریافت می‌شود. این منبع همهٔ صفحات سایت را پوشش نمی‌دهد و فقط به اتصال سرچ کنسول نیاز دارد."
            : "از وردپرس متصل، حداکثر ۵۰ برگه و ۵۰ نوشته در هر جست‌وجو دریافت می‌شود؛ فقط موارد منتشرشده نمایش داده می‌شوند."}
        {source !== "wordpress" &&
          " عنوان حداکثر ۱۲ صفحه خوانده می‌شود؛ نام سایر صفحات از نشانی استخراج می‌شود. وجود نشانی در این منابع تأیید انتشار یا سلامت فعلی صفحه نیست."}
      </p>
      <p className="text-sm">
        صفحات دریافت‌شده برای پیشنهاد لینک داخلی در نگارش‌های بعدی همین سایت
        ذخیره می‌شوند؛ ساخت گروه برای استفاده از آن‌ها الزامی نیست.
      </p>
      <p className="text-sm leading-7">
        در هر روش، دسته‌بندی‌ها و منوی عمومی سایت هم بررسی می‌شوند. تا ۱۰۰ دسته
        و ۱۰۰ مقاله از API عمومی وردپرس و صفحهٔ اولِ حداکثر ۸ دسته خوانده
        می‌شود؛ نیازی به رمز نیست. دسته‌بندی، نامزد پیلار است و لزوماً مقالهٔ
        مرجع نیست.
      </p>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalid) discover.mutate();
        }}
      >
        <input
          className="input input-bordered min-w-0 flex-1"
          aria-label="موضوع یا آدرس صفحه"
          placeholder="موضوع اختیاری؛ برای دریافت صفحات خالی بگذارید"
          value={search}
          maxLength={4000}
          disabled={discover.isPending}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button
          className="btn btn-primary"
          disabled={invalid || discover.isPending}
        >
          {discover.isPending ? "در حال شناسایی…" : "دریافت صفحات"}
        </button>
      </form>
      {topic !== search.trim() && (
        <p className="text-sm">
          موضوع استخراج‌شده: «{topic || "همهٔ موضوع‌ها"}». این جست‌وجوی متنی
          است، نه دریافت اعضای دسته‌بندی.
        </p>
      )}
      {invalid && (
        <p role="alert" className="text-error">
          موضوع باید حداکثر ۱۰۰ نویسه یا یک آدرس معتبر باشد.
        </p>
      )}
      {discover.error && (
        <div role="alert" className="text-error">
          <p>
            {source === "sitemap"
              ? "دریافت نقشه انجام نشد؛ دامنهٔ پروژه و دسترسی عمومی سایت را بررسی کنید."
              : "دریافت صفحات انجام نشد؛ اتصال منبع انتخاب‌شده و دسترسی حساب را بررسی کنید. روش نقشهٔ سایت به اتصال نیاز ندارد."}
          </p>
          {source !== "sitemap" && (
            <Link
              className="link"
              to="/p/$projectId/settings/integrations"
              params={{ projectId }}
            >
              بررسی اتصال‌ها
            </Link>
          )}
        </div>
      )}
      {discover.isSuccess && (
        <p role="status">
          {discover.data.length
            ? `${discover.data.length} صفحه دریافت شد. برای ترکیب منابع، روش دیگری را هم اجرا کنید؛ صفحات تکراری حذف می‌شوند.`
            : "صفحه‌ای پیدا نشد؛ موضوع را خالی کنید یا روش دیگری را امتحان کنید."}
        </p>
      )}
    </div>
  );
}
