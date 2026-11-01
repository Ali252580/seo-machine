export function isAuthorized(secret, authorization) {
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

export function validateInput(input) {
  if (!input || typeof input !== "object") throw new Error("Invalid request");
  const query = typeof input.query === "string" ? input.query.trim() : "";
  const depth = input.depth ?? 100;
  const device = input.device ?? "desktop";
  const language = input.language ?? "fa";
  if (!query || query.length > 200)
    throw new Error("query must contain 1-200 characters");
  if (!Number.isInteger(depth) || depth < 10 || depth > 100)
    throw new Error("depth must be an integer between 10 and 100");
  if (!["mobile", "desktop"].includes(device))
    throw new Error("Unsupported device");
  if (
    typeof language !== "string" ||
    !/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(language)
  )
    throw new Error("Invalid language");
  if (input.country && input.country !== "ir")
    throw new Error("Only Iran is supported");
  // Fixed Tehran browser coordinates cannot truthfully measure other cities.
  if (input.location && input.location !== "Tehran,Tehran Province,Iran")
    throw new Error("Only Tehran targeting is supported by this service");
  return { query, depth, device, language };
}

export function validatePage({ status, blocked, rows, newRows }) {
  if (blocked || status < 200 || status >= 300)
    throw new Error("Google request was blocked or failed");
  // Fail closed: an unreadable page is not evidence that the site lost its rank.
  if (!rows || !newRows)
    throw new Error(
      "Google results could not be verified; no ranking snapshot was produced",
    );
}
