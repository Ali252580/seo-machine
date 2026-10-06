import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { getAuthMode } from "@/lib/auth-mode";
import { captureClientEvent } from "@/client/lib/posthog";
import { agentUpdatePrompt } from "@/client/features/ai-mcp/agentSetupPrompt";
import { useAgentSetupPrompt } from "@/client/features/ai-mcp/useAgentSetupPrompt";
import { CopyButton } from "@/client/features/ai-mcp/SetupControls";
import {
  ClaudeIcon,
  GrokIcon,
  HermesIcon,
  OpenAIIcon,
  OpenClawIcon,
} from "@/client/features/ai-mcp/AgentIcons";

const SKILLS = [
  ["seo-coach", "وضعیت سایت را توضیح می‌دهد و گام بعدی را پیشنهاد می‌کند."],
  ["seo-project-setup", "هدف‌ها، رقبا و صفحات مهم پروژه را ثبت می‌کند."],
  ["seo-audit", "سایت را بررسی می‌کند و یک اقدام مهم را مشخص می‌کند."],
  [
    "keyword-research",
    "فرصت‌های کلمات کلیدی را از موضوع‌های اولیه پیدا می‌کند.",
  ],
  ["keyword-clustering", "کلمات را براساس هدف جست‌وجو گروه‌بندی می‌کند."],
  ["competitive-landscape", "رقبای بازار و دلیل برتری آن‌ها را مشخص می‌کند."],
  [
    "competitor-analysis",
    "کلمات، محتوا و بک‌لینک‌های یک رقیب را بررسی می‌کند.",
  ],
  ["link-prospecting", "فرصت‌های دریافت لینک را پیدا می‌کند."],
  ["local-seo", "نمایش کسب‌وکار در گوگل‌مپ را بررسی می‌کند."],
  ["seo-report", "نتیجهٔ کار را در بخش گزارش‌ها ذخیره می‌کند."],
];
const AGENTS = [
  { name: "Claude Code", Icon: ClaudeIcon },
  { name: "ChatGPT", Icon: OpenAIIcon },
  { name: "Grok Bot", Icon: GrokIcon },
  { name: "Hermes", Icon: HermesIcon },
  { name: "OpenClaw", Icon: OpenClawIcon },
];

export const Route = createFileRoute("/_app/ai")({
  component: AiPage,
});

function AiPage() {
  const { origin, prompt } = useAgentSetupPrompt();
  const mcpUrl = origin ? `${origin}/mcp` : "";
  const [tab, setTab] = useState<"setup" | "skills">("setup");

  return (
    <div
      dir="rtl"
      className="h-full overflow-auto bg-base-100 px-4 py-12 pb-24 md:px-6 md:py-16 md:pb-12"
    >
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">
          راه‌اندازی عامل هوشمند
        </h1>
        <p className="mt-3 text-pretty text-sm leading-relaxed text-base-content/70">
          عامل هوشمندی را که اکنون استفاده می‌کنید به OpenSEO وصل کنید. یک‌بار
          راه‌اندازی کنید و سپس دربارهٔ پروژه‌ها و داده‌های سئوی خود از آن
          بپرسید.
        </p>

        <div role="tablist" className="tabs tabs-border mt-8 w-fit">
          {(
            [
              ["setup", "اتصال عامل"],
              ["skills", "مهارت‌ها"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`tab ${tab === id ? "tab-active" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "setup" ? (
          <>
            <div className="mt-6 space-y-5">
              <section className="rounded-xl border border-base-300 p-5 sm:p-6">
                <h2 className="text-base font-semibold">اتصال عامل شما</h2>
                <p className="mt-2 text-sm leading-relaxed text-base-content/60">
                  متن راه‌اندازی را کپی کنید و در عامل مورد استفاده‌تان بفرستید.
                  عامل، اتصال MCP این سایت را تنظیم می‌کند و مراحل نیازمند اقدام
                  شما را می‌گوید.
                </p>
                <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {AGENTS.map(({ name, Icon }) => (
                    <li
                      key={name}
                      className="flex items-center gap-1.5 text-xs text-base-content/60"
                    >
                      <Icon className="size-4" />
                      {name}
                    </li>
                  ))}
                  <li className="text-xs text-base-content/45">
                    یا هر عامل سازگار با MCP
                  </li>
                </ul>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 [&>button]:h-11 [&>button]:gap-2 [&>button]:text-sm">
                  <CopyButton
                    primary
                    value={prompt}
                    label="کپی متن راه‌اندازی"
                    copiedLabel="کپی شد"
                    successMessage="متن راه‌اندازی کپی شد"
                    onCopy={() => captureClientEvent("mcp:setup_prompt_copy")}
                  />
                </div>
                <ol className="mt-5 list-decimal space-y-2 border-t border-base-300 pt-4 pr-5 text-sm leading-relaxed text-base-content/70">
                  <li>متن را در گفت‌وگوی عامل خود جای‌گذاری کنید.</li>
                  <li>
                    اگر پنجرهٔ ورود باز شد، دسترسی OpenSEO را در مرورگر تأیید
                    کنید.
                  </li>
                  <li>
                    از عامل بخواهید «پروژه‌های من را فهرست کن» تا اتصال را بررسی
                    کند.
                  </li>
                </ol>
                <p className="mt-4 text-sm text-base-content/60">
                  پس از اتصال، می‌توانید بپرسید: «برای سایت من چه فرصت‌های کلمات
                  کلیدی وجود دارد؟»
                </p>
              </section>

              <section className="rounded-xl border border-base-300 p-5 sm:p-6">
                <h2 className="text-base font-semibold">
                  به‌روزرسانی مهارت‌ها
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-base-content/60">
                  اگر عامل را قبلاً متصل کرده‌اید، این متن را برای به‌روزرسانی
                  مهارت‌ها بفرستید. تنظیم اتصال و تغییرات شخصی شما حفظ می‌شوند.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 [&>button]:h-11 [&>button]:gap-2 [&>button]:text-sm">
                  <CopyButton
                    primary
                    value={agentUpdatePrompt}
                    label="کپی متن به‌روزرسانی"
                    copiedLabel="کپی شد"
                    successMessage="متن به‌روزرسانی کپی شد"
                    onCopy={() => captureClientEvent("mcp:update_prompt_copy")}
                  />
                </div>
              </section>
            </div>

            {getAuthMode(import.meta.env.AUTH_MODE) === "cloudflare_access" ? (
              <div className="alert alert-warning mt-8 text-sm" role="alert">
                <ShieldAlert className="size-4 shrink-0" />
                <span>
                  این استقرار پشت Cloudflare Access است. برای اتصال عامل بیرونی،
                  Managed OAuth را در تنظیمات Access فعال کنید.
                </span>
              </div>
            ) : null}

            <div className="mt-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-base-300 pt-5 text-xs text-base-content/55">
              <span>
                نشانی اتصال MCP این سایت:{" "}
                <code
                  dir="ltr"
                  className="inline-block break-all font-mono text-base-content/80"
                >
                  {mcpUrl}
                </code>
              </span>
              <CopyButton
                value={mcpUrl}
                label="کپی نشانی"
                copiedLabel="کپی شد"
                successMessage="نشانی MCP کپی شد"
                onCopy={() => captureClientEvent("mcp:setup_url_copy")}
              />
            </div>
          </>
        ) : (
          <section className="mt-6">
            <p className="text-sm text-base-content/60">
              این مهارت‌ها را می‌توانید پس از اتصال، در عامل سازگار نصب کنید.
              برای گزارش کامل، نام مهارت را به عامل بگویید.
            </p>
            <ul className="mt-5 space-y-3 text-sm sm:space-y-2">
              {SKILLS.map(([name, blurb]) => (
                <li
                  key={name}
                  className="flex flex-col gap-0.5 sm:flex-row sm:gap-3"
                >
                  <code
                    dir="ltr"
                    className="shrink-0 font-mono text-[13px] text-base-content sm:w-48"
                  >
                    /{name}
                  </code>
                  <span className="text-base-content/60">{blurb}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
