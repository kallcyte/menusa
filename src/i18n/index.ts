import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import idCommon from "./locales/id/common.json";
import enCommon from "./locales/en/common.json";
import idLanding from "./locales/id/landing.json";
import enLanding from "./locales/en/landing.json";
import idAdmin from "./locales/id/admin.json";
import enAdmin from "./locales/en/admin.json";
import idSuperadmin from "./locales/id/superadmin.json";
import enSuperadmin from "./locales/en/superadmin.json";
import idPublicMenu from "./locales/id/publicMenu.json";
import enPublicMenu from "./locales/en/publicMenu.json";
import idAuth from "./locales/id/auth.json";
import enAuth from "./locales/en/auth.json";

const STORAGE_KEY = "menusa-lng";

function getInitialLng(): string {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "id" || stored === "en") return stored;
    // No stored pref → default to Indonesian regardless of browser language
    return "id";
  }
  return "id";
}

const initialLng = getInitialLng();

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      id: { common: idCommon, landing: idLanding, admin: idAdmin, superadmin: idSuperadmin, publicMenu: idPublicMenu, auth: idAuth },
      en: { common: enCommon, landing: enLanding, admin: enAdmin, superadmin: enSuperadmin, publicMenu: enPublicMenu, auth: enAuth },
    },
    lng: initialLng,
    fallbackLng: "id",
    supportedLngs: ["id", "en"],
    load: "languageOnly",
    nonExplicitSupportedLngs: true,
    defaultNS: "common",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

// Keep <html lang> in sync
if (typeof window !== "undefined") {
  const syncLang = () => {
    document.documentElement.lang = i18n.language?.startsWith("en") ? "en" : "id";
  };
  syncLang();
  i18n.on("languageChanged", syncLang);
}

export default i18n;
export { STORAGE_KEY };
