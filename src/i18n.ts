import { i18n } from "@lingui/core";

const STORAGE_KEY = "marklite:locale";

export const locales = {
  "zh-CN": "简体中文",
  en: "English",
} as const;

export type Locale = keyof typeof locales;
export const defaultLocale: Locale = "zh-CN";

export async function dynamicActivate(locale: Locale) {
  const { messages } = await import(`./locales/${locale}/messages.ts`);
  i18n.load(locale, messages);
  i18n.activate(locale);
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {}
}

export function getSavedLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in locales) return saved as Locale;
  } catch {}
  return defaultLocale;
}