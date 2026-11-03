export function confirmArticleReplacement(content: string): boolean {
  return (
    !content.trim() ||
    window.confirm(
      "متن فعلی و ویرایش‌های شما جایگزین می‌شود. اگر به آن نیاز دارید، ابتدا خروجی بگیرید. ادامه می‌دهید؟",
    )
  );
}
