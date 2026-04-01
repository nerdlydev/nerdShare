import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ViteThemeProvider } from "@space-man/react-theme-animation";
import { registerSW } from "virtual:pwa-register";

import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import "./i18n";
import { ClickSpark } from "@/components/ClickSpark";

if (typeof window !== "undefined") {
  window.history.scrollRestoration = "manual";
}

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ViteThemeProvider defaultTheme="dark">
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <ClickSpark
        sparkColor="#ffffff"
        sparkSize={10}
        sparkRadius={15}
        sparkCount={8}
        duration={400}
        easing="ease-out"
        extraScale={1}
      />
    </ViteThemeProvider>
  </StrictMode>,
);
