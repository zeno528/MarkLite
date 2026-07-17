import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";
import { warmupShiki } from "./lib/markdown/shiki"
import App from "./App";
import { dynamicActivate, getSavedLocale } from "./i18n";
import "./styles/globals.css";

// 启动时立即触发 shiki 预热（不阻塞 render；createHighlighter 异步进行）
// 必须在 ReactDOM.createRoot.render 之前，确保在 React first paint 之前启动
// App.tsx 里的同名 useEffect 可以删掉（重复调幂等）
warmupShiki();

function Root() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    dynamicActivate(getSavedLocale()).finally(() => setReady(true));
  }, []);
  if (!ready) return null;
  return (
    <I18nProvider i18n={i18n}>
      <App />
    </I18nProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);


