/** Deliberately accept only absolute HTTP(S) links, without extra attributes. */
export function isArticleLinkTag(tag: string): boolean {
  if (/^<\/a>$/i.test(tag)) return true;
  const match = /^<a href="(https?:\/\/[^"<>\s]+)">$/i.exec(tag);
  if (!match) return false;
  try {
    const url = new URL(match[1]);
    return !url.username && !url.password;
  } catch {
    return false;
  }
}
