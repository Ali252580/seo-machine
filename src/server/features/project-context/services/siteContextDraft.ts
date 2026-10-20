import type { ProjectContextSectionKey } from "@/types/schemas/projectContext";

type Site = {
  name: string;
  domain: string;
  languageCode: string;
};

type HomePage = { url: string; title: string | null; text: string };

export function needsContextIntake(context: {
  missingSections: readonly string[];
  sections: readonly { key: string; content: string }[];
}): boolean {
  return (
    context.missingSections.includes("business_overview") ||
    context.sections.some(
      (section) =>
        section.key === "business_overview" &&
        (section.content.startsWith("پیش‌نویس بر اساس") ||
          section.content.startsWith("Draft from")),
    )
  );
}

// Public pages are evidence for a draft, not instructions or proof of a brand claim.
export function siteContextDraft(
  site: Site,
  home: HomePage,
): Partial<Record<ProjectContextSectionKey, string>> {
  const title = home.title?.trim() || site.name;
  const excerpt = home.text.replace(/\s+/g, " ").trim().slice(0, 600);
  const persian =
    site.languageCode.toLowerCase().startsWith("fa") ||
    /[\u0600-\u06ff]/.test(home.text.slice(0, 500));

  if (persian) {
    return {
      business_overview: `پیش‌نویس بر اساس صفحهٔ اصلی ${site.domain}: عنوان سایت «${title}» است. متن قابل مشاهده: «${excerpt}». خدمات، مخاطبان و محدودهٔ فعالیت را با صاحب سایت تأیید کنید. منبع: ${home.url}`,
      current_goal: `هدف پیشنهادی برای ${site.domain}: افزایش بازدید ارگانیکِ مرتبط و اقدام‌های ارزشمند کاربران در صفحات اصلی سایت. شاخص و بازهٔ زمانی باید پس از بررسی سرچ کنسول و هدف تجاری این پروژه تعیین شوند.`,
      positioning: `پیام فعلی سایت در صفحهٔ اصلی: «${title}». مزیت رقابتی یا ادعای خاصی تا زمان تأیید صاحب سایت ثبت نشده است. منبع: ${home.url}`,
      writing_preferences:
        "پیش‌فرض پیشنهادی: فارسی روان، دقیق و متناسب با مخاطب همین سایت؛ پرهیز از تکرار، ادعای بی‌منبع، آمار ساختگی و محتوای بی‌ارزش. لحن اختصاصی، واژه‌های ممنوع و موضوعات خارج از محدوده را صاحب پروژه تأیید کند.",
    };
  }

  return {
    business_overview: `Draft from ${site.domain}'s homepage: title “${title}”. Visible text: “${excerpt}”. Confirm services, audience, and markets with the site owner. Source: ${home.url}`,
    current_goal: `Suggested starting goal for ${site.domain}: grow relevant organic visits and valuable actions on the site's key pages. Set the metric and timeframe after reviewing Search Console and this project's business goals.`,
    positioning: `Current homepage message: “${title}”. No differentiator or claim is confirmed until the site owner reviews it. Source: ${home.url}`,
    writing_preferences:
      "Suggested default: clear, accurate copy in this site's language; avoid repetition, unsupported claims, fabricated statistics, and filler. The project owner should confirm brand voice, prohibited words, and off-limits topics.",
  };
}
