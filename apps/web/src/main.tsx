import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ViteThemeProvider } from "@space-man/react-theme-animation";
import { registerSW } from "virtual:pwa-register";

import "./index.css";
import App from "./App.tsx";
import { ClickSpark } from "@/components/ClickSpark";

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ViteThemeProvider defaultTheme="dark">
      <App />
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
