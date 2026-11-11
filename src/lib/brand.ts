/** Branding bisa diatur lewat env, jadi siapa pun bisa deploy dengan nama usahanya sendiri. */
export function brandName() {
  return process.env.BRAND_NAME?.trim() || "Pembukuan";
}

export function brandSlug() {
  return brandName()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-") || "Pembukuan";
}

export const REPO_URL = "https://github.com/haustex/pembukuan-umkm";
