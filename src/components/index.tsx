import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import inlineCss from "../index.css?inline";

let reactRoot: ReturnType<typeof createRoot> | null = null;

export const ensureSidebar = () => {
  if (reactRoot) return;

  const host = document.createElement("div");
  host.id = "tsb-sidebar-host";
  host.setAttribute("aria-hidden", "true");
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: "open" });
  if (
    typeof CSSStyleSheet !== "undefined" &&
    "adoptedStyleSheets" in shadowRoot
  ) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(inlineCss);
    shadowRoot.adoptedStyleSheets = [sheet];
  } else {
    const style = document.createElement("style");
    style.textContent = inlineCss;
    shadowRoot.appendChild(style);
  }

  const container = document.createElement("div");
  shadowRoot.appendChild(container);
  reactRoot = createRoot(container);
  reactRoot.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
};
