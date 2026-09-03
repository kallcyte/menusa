import { useTranslation } from "react-i18next";

export function LanguageSwitcher({ variant = "default" }: { variant?: "default" | "compact" }) {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith("en") ? "en" : "id";
  return (
    <label className={variant === "compact" ? "language-switcher language-switcher--compact" : "language-switcher"}>
      <span className="sr-only">Language</span>
      <select
        value={current}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
        aria-label="Language"
        className="language-switcher-select"
      >
        <option value="id">Bahasa Indonesia</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
