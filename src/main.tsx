import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";
import App from "./App";
import { dynamicActivate, getSavedLocale } from "./i18n";
import "./styles/globals.css";

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


