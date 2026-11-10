export function savedDraftEntries(
  storage: Storage,
  projectId: string,
  blog: boolean,
) {
  const prefix = `openseo-${blog ? "blog" : "article"}-${projectId}`;
  const drafts: { title: string; page?: string; draft?: string }[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || (key !== prefix && !key.startsWith(`${prefix}:`))) continue;
    try {
      const value = JSON.parse(storage.getItem(key) ?? "null");
      if (!value || typeof value.content !== "string" || !value.content.trim())
        continue;
      const suffix = key.slice(prefix.length + 1);
      const heading = value.content
        .match(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/i)?.[1]
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      drafts.push({
        title:
          (typeof value.title === "string" && value.title.trim()) ||
          heading ||
          (typeof value.keyword === "string" && value.keyword.trim()) ||
          "پیش‌نویس بدون عنوان",
        ...(suffix.startsWith("draft:")
          ? { draft: suffix.slice(6) }
          : /^https?:\/\//.test(suffix)
            ? { page: suffix }
            : { draft: "legacy" }),
      });
    } catch {
      /* Preserve unreadable entries; do not delete user drafts. */
    }
  }
  return drafts;
}

export function articleIdeas(pages: { title: string }[], blog: boolean) {
  const titles = [
    ...new Set(pages.map((page) => page.title.trim()).filter(Boolean)),
  ];
  const ideas = titles
    .slice(0, 6)
    .map((title) =>
      blog ? `پرسش‌های رایج دربارهٔ ${title}` : `راهنمای انتخاب ${title}`,
    );
  return ideas.filter((idea) => !titles.includes(idea));
}
