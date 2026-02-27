import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ViteThemeProvider } from "@space-man/react-theme-animation";
import { registerSW } from "virtual:pwa-register";

import "./index.css";
import App from "./App.tsx";

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ViteThemeProvider defaultTheme="dark">
      <App />
    </ViteThemeProvider>
  </StrictMode>,
);
