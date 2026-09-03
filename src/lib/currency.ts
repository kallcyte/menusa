export type SupportedCurrency = "IDR" | "USD" | "EUR" | "SGD" | "MYR" | "JPY";

const CURRENCY_LOCALE: Record<string, string> = {
  IDR: "id-ID",
  JPY: "ja-JP",
  USD: "en-US",
  EUR: "de-DE",
  SGD: "en-SG",
  MYR: "ms-MY",
};

const FRACTION_DIGITS: Record<string, number> = {
  IDR: 0,
  JPY: 0,
};

export function formatPrice(value: number | string, currency: string, locale?: string): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return String(value);
  const cur = (currency || "IDR").toUpperCase();
  // Always use currency-appropriate locale for IDR/JPY so Rp/¥ renders correctly
  const effectiveLocale = cur === "IDR" ? "id-ID" : cur === "JPY" ? "ja-JP" : locale ? localeMap(locale) : CURRENCY_LOCALE[cur] ?? "en-US";
  const maxFraction = FRACTION_DIGITS[cur] ?? 2;
  try {
    return new Intl.NumberFormat(effectiveLocale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: maxFraction,
      minimumFractionDigits: maxFraction === 0 ? 0 : 2,
    }).format(num);
  } catch {
    return `${cur} ${num.toLocaleString(effectiveLocale)}`;
  }
}

function localeMap(lang: string): string {
  if (lang.startsWith("id")) return "id-ID";
  if (lang.startsWith("en")) return "en-US";
  return lang;
}

export function currencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}
