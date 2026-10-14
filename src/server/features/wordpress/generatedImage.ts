import { AppError } from "@/server/lib/errors";

export type ArticleImageMime = "image/jpeg" | "image/png" | "image/webp";

export function isArticleImageMime(value: string): value is ArticleImageMime {
  return (
    value === "image/jpeg" || value === "image/png" || value === "image/webp"
  );
}

/** Provider bytes are untrusted; WordPress must receive a real image of the declared type. */
export function decodeGeneratedImage(
  encoded: string,
  mediaType: string,
): Uint8Array {
  if (
    encoded.length > (2_000_000 * 4) / 3 + 8 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
  )
    throw new AppError(
      "VALIDATION_ERROR",
      "Generated image is invalid or too large.",
    );
  const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  const valid =
    (mediaType === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8) ||
    (mediaType === "image/png" &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47) ||
    (mediaType === "image/webp" &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP");
  if (!valid || bytes.byteLength > 2_000_000)
    throw new AppError(
      "VALIDATION_ERROR",
      "Generated image is invalid or too large.",
    );
  return bytes;
}
