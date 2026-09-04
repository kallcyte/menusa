import { useTranslation } from "react-i18next";

export function LanguageSwitcher({ variant = "default" }: { variant?: "default" | "compact" }) {
  const { t, i18n } = useTranslation();
  const current = i18n.language?.startsWith("en") ? "en" : "id";
  return (
    <label className={variant === "compact" ? "language-switcher language-switcher--compact" : "language-switcher"}>
      <span className="sr-only">{t("language")}</span>
      <select
        value={current}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
        aria-label={t("language")}
        className="language-switcher-select"
      >
        <option value="id">{t("indonesian")}</option>
        <option value="en">{t("english")}</option>
      </select>
    </label>
  );
}
