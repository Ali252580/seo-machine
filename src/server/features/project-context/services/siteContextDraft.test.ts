import { describe, expect, it } from "vitest";
import { needsContextIntake, siteContextDraft } from "./siteContextDraft";

describe("siteContextDraft", () => {
  it("uses only the current project's site and marks unconfirmed details", () => {
    const draft = siteContextDraft(
      { name: "Sample", domain: "sample.ir", languageCode: "fa" },
      {
        url: "https://sample.ir/",
        title: "خدمات نمونه",
        text: "خدمات نمونه در تهران",
      },
    );

    expect(draft.business_overview).toContain("sample.ir");
    expect(draft.business_overview).toContain("خدمات نمونه در تهران");
    expect(draft.positioning).toContain("تأیید صاحب سایت");
    expect(draft.writing_preferences).not.toContain("روف گاردن");
  });

  it("writes Persian context for a Persian website even when the market default is English", () => {
    const draft = siteContextDraft(
      { name: "Sample", domain: "sample.ir", languageCode: "en" },
      { url: "https://sample.ir/", title: "نمونه", text: "خدمات فارسی" },
    );
    expect(draft.writing_preferences).toContain("فارسی روان");
  });

  it("keeps SAM intake active until the website draft is confirmed", () => {
    expect(
      needsContextIntake({
        missingSections: [],
        sections: [
          { key: "business_overview", content: "پیش‌نویس بر اساس صفحهٔ اصلی" },
        ],
      }),
    ).toBe(true);
    expect(
      needsContextIntake({
        missingSections: [],
        sections: [
          { key: "business_overview", content: "تأیید شده توسط کاربر" },
        ],
      }),
    ).toBe(false);
  });
});
