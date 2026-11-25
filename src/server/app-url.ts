export function appUrl(path: string) {
  const configured = process.env.APP_BASE_URL?.trim();
  if (!configured) throw new Error("APP_BASE_URL must be an HTTP(S) origin");
  const base = new URL(
    configured.includes("://") ? configured : "https://" + configured,
  );
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash
  )
    throw new Error("APP_BASE_URL must be an HTTP(S) origin");
  return new URL(path, base);
}
