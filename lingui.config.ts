import { defineConfig } from "@lingui/cli";

export default defineConfig({
  sourceLocale: "zh-CN",
  locales: ["zh-CN", "en"],
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["<rootDir>/src"],
    },
  ],
});