import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  getProjectAutomation,
  saveProjectAutomation,
  saveProjectSkillAutomation,
} from "@/serverFunctions/automation";
import { getStandardErrorMessage } from "@/client/lib/error-messages";

export function ProjectAutomationSettings({
  projectId,
}: {
  projectId: string;
}) {
  const client = useQueryClient();
  const queryKey = ["projectAutomation", projectId];
  const settings = useQuery({
    queryKey,
    queryFn: () => getProjectAutomation({ data: { projectId } }),
  });
  const save = useMutation({
    mutationFn: (enabled: boolean) =>
      saveProjectAutomation({ data: { projectId, enabled } }),
    onSuccess: () => client.invalidateQueries({ queryKey }),
  });
  const saveSkills = useMutation({
    mutationFn: (enabled: boolean) =>
      saveProjectSkillAutomation({ data: { projectId, enabled } }),
    onSuccess: () => client.invalidateQueries({ queryKey }),
  });
  return (
    <section className="space-y-3 rounded-xl border border-base-300 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">تنظیمات بررسی خودکار</h2>
        {settings.data && (
          <span
            role="status"
            className={`badge ${settings.data.enabled ? "badge-success" : "badge-neutral"}`}
          >
            {settings.data.enabled
              ? "بررسی هفتگی فعال است"
              : "بررسی خودکار خاموش است"}
          </span>
        )}
      </div>
      <p className="text-sm text-base-content/70">
        بررسی هفتگی داده‌های موجود سرچ کنسول، آنالیتیکس و رتبه‌ها و تهیهٔ
        پیشنهادهای سئو برای همین سایت. اولین بررسی در اجرای زمان‌بندی‌شدهٔ بعدی
        انجام می‌شود. تحلیل هوش مصنوعی از اعتبار همین حساب مصرف می‌کند؛ بدون
        اعتبار، فقط پیشنهادهای مبتنی بر داده تهیه می‌شوند. محتوا منتشر نمی‌شود.
      </p>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          className="toggle toggle-primary"
          checked={settings.data?.enabled ?? false}
          disabled={
            !settings.data?.canManage || settings.isFetching || save.isPending
          }
          onChange={(event) => save.mutate(event.target.checked)}
        />
        بررسی خودکار هفتگی این سایت
      </label>
      {settings.isPending && <p role="status">در حال دریافت تنظیمات…</p>}
      <div className="space-y-3 border-t border-base-300 pt-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={settings.data?.skillsEnabled ?? false}
            disabled={
              !settings.data?.canManage ||
              settings.isFetching ||
              saveSkills.isPending
            }
            onChange={(event) => saveSkills.mutate(event.target.checked)}
          />
          اجرای خودکار ۹ مهارت سئو
        </label>
        <p className="text-sm leading-7 text-base-content/70">
          در هر نوبت روزانه حداکثر یک مهارت برای این سایت بررسی می‌شود؛ تکمیل
          دور اول حداقل ۹ نوبت طول می‌کشد. هر اجرا حداکثر ۴ فراخوانی ابزار و ۵
          مرحلهٔ مدل دارد. تحقیق کلمات، رقبا و سئوی محلی و تحلیل مدل از اعتبار
          حساب مصرف می‌کنند؛ این محدودیت تعداد فراخوانی است، نه سقف مبلغ.
          گزارش‌های بررسی‌شده تا ۳۰ روز دوباره اجرا نمی‌شوند. اطلاعات ناقص یا
          خطا زودتر از ۷ روز تکرار نمی‌شوند. هدف‌ها و رقبای پیشنهادی نیازمند ثبت
          شما در زمینهٔ پروژه هستند؛ انتشار محتوا و ارسال پیام انجام نمی‌شود.
        </p>
        {saveSkills.isPending && (
          <p role="status">در حال ذخیرهٔ تنظیم مهارت‌ها…</p>
        )}
        {saveSkills.error && (
          <p role="alert" className="text-error">
            {getStandardErrorMessage(saveSkills.error)}
          </p>
        )}
      </div>
      {save.isPending && <p role="status">در حال ذخیره…</p>}
      {settings.data && !settings.data.canManage && (
        <p className="text-sm">
          مدیر یا مالک حساب می‌تواند این تنظیم را تغییر دهد.
        </p>
      )}
      {(settings.error || save.error) && (
        <p role="alert" className="text-error">
          {getStandardErrorMessage(settings.error || save.error)}
        </p>
      )}
      {settings.isError && (
        <button className="btn btn-sm" onClick={() => void settings.refetch()}>
          تلاش مجدد
        </button>
      )}
      <Link
        className="link text-sm"
        to="/p/$projectId/recommendations"
        params={{ projectId }}
        hash="seo-proposals"
      >
        مشاهدهٔ نتیجه و پیشنهادها
      </Link>
      <p className="text-xs text-base-content/60">
        خاموش‌کردن، اجراهای بعدی را متوقف می‌کند؛ بررسی در حال اجرا ممکن است
        تکمیل شود.
      </p>
    </section>
  );
}
