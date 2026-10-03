export function isPlatformAdminEmail(
  email: string,
  configured: string | undefined,
) {
  return new Set(
    configured
      ?.split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean) ?? [],
  ).has(email.trim().toLowerCase());
}
