import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en-IN.json";
import hi from "./locales/hi-IN.json";

i18n.use(initReactI18next).init({
  resources: { "en-IN": { translation: en }, "hi-IN": { translation: hi } },
  lng: "en-IN",
  fallbackLng: "en-IN",
  interpolation: { escapeValue: false }
});

export default i18n;
