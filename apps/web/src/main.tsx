import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ViteThemeProvider } from "@space-man/react-theme-animation";

import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ViteThemeProvider defaultTheme="dark">
      <App />
    </ViteThemeProvider>
  </StrictMode>,
);
