import { z } from "zod";

const page = z.object({
  title: z.string(),
  url: z
    .string()
    .url()
    .regex(/^https?:\/\//i),
});

export const writingTopicSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ready"),
    seed: z.string(),
    keyword: z.string().min(2).max(100),
    title: z.string().min(5).max(180),
    angle: z.string().min(1).max(350),
    demand: z.discriminatedUnion("source", [
      z.object({
        source: z.literal("monthly_volume"),
        volume: z.number().positive(),
        provider: z.enum(["google_ads", "dataforseo_labs"]),
      }),
      z.object({ source: z.literal("google_suggest") }),
    ]),
    results: z.array(page).min(1).max(3),
    sources: z.object({
      discovery: z.boolean(),
      wordpress: z.boolean(),
      searchConsole: z.boolean(),
    }),
  }),
  z.object({
    status: z.literal("covered"),
    pages: z.array(page).min(1).max(5),
  }),
  z.object({ status: z.literal("no_context") }),
  z.object({ status: z.literal("no_demand") }),
  z.object({ status: z.literal("no_fit") }),
  z.object({ status: z.literal("unverified") }),
]);
export type WritingTopic = z.infer<typeof writingTopicSchema>;

export const topicMessages = {
  no_context:
    "برای شناخت مخاطب، یک جمله دربارهٔ محصول یا خدمات در «زمینهٔ پروژه» ثبت کنید. همین توضیح برای شروع تحقیق کافی است.",
  no_demand:
    "برای عبارت بررسی‌شده، کلمه‌ای مناسب این نوع محتوا با حجم جست‌وجو یا پیشنهاد ثبت‌شدهٔ گوگل پیدا نشد.",
  no_fit:
    "در میان عبارت‌های بررسی‌شده، موضوعی متناسب با مخاطب و نوع محتوای انتخابی پیدا نشد.",
  unverified:
    "نتایج گوگل یا فهرست محتوای سایت برای بررسی تداخل کافی نبود. بررسی را دوباره اجرا کنید.",
  covered:
    "برای عبارت‌های بررسی‌شده صفحهٔ مرتبط پیدا شد. می‌توانید همان صفحه را بهبود دهید.",
} as const;

export function topicDemandLabel(
  demand: Extract<WritingTopic, { status: "ready" }>["demand"],
) {
  if (demand.source === "google_suggest")
    return "پیشنهاد گوگل · حجم ماهانه نامشخص";
  const provider =
    demand.provider === "google_ads" ? "Google Ads" : "DataForSEO Labs";
  return `حدود ${demand.volume.toLocaleString("fa-IR")} جست‌وجو در ماه · ${provider}`;
}
