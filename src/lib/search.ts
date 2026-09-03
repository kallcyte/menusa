import Fuse from "fuse.js";

export function fuzzyFilter<T>(items: T[], query: string, keys: Array<string | ((item: T) => string)>): T[] {
  const q = query.trim();
  if (!q) return items;
  // Fast path: substring match first (covers most cases, no Fuse overhead)
  const lower = q.toLowerCase();
  const substringMatches = items.filter((item) =>
    keys.some((k) => {
      const v = typeof k === "function" ? k(item) : String((item as Record<string, unknown>)[k] ?? "");
      return v.toLowerCase().includes(lower);
    }),
  );
  if (substringMatches.length > 0) return substringMatches;
  // Fallback: Fuse subsequence scoring
  const fuseKeys = keys.map((k) => (typeof k === "function" ? { name: "__fn", getFn: (obj: T) => k(obj) } : k) as string);
  // For function keys we use getFn via Fuse's key object
  const fuse = new Fuse(items, {
    keys: keys.map((k) => (typeof k === "function" ? { name: "fn", getFn: (obj: T) => k(obj) } : k)) as never,
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
  return fuse.search(q).map((r) => r.item);
}

export function sortBy<T>(items: T[], key: string, dir: "asc" | "desc", locale = "id"): T[] {
  const collator = new Intl.Collator(locale === "id" ? "id-ID" : "en-US", { sensitivity: "base", numeric: true });
  const sorted = [...items].sort((a, b) => {
    const av = (a as Record<string, unknown>)[key];
    const bv = (b as Record<string, unknown>)[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return av - bv;
    return collator.compare(String(av), String(bv));
  });
  return dir === "desc" ? sorted.reverse() : sorted;
}
