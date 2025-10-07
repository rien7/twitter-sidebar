import "./polyfills/process";
import { registerBridgeMessageHandler } from "./handlers/bridgeMessageHandler";
import { registerSidebarEventHandler } from "./handlers/sidebarEventHandler";
import { registerGlobalClickInterceptor } from "./handlers/globalClickHandler";
import { ensureInterceptInjected } from "./interceptor/inject";
import { ensureSidebar } from "./components";

ensureInterceptInjected();

registerBridgeMessageHandler();
registerSidebarEventHandler();
registerGlobalClickInterceptor();

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type !== "childList") return;
    if (mutation.addedNodes.length === 0) return;
    mutation.addedNodes.forEach((node) => {
      if ((node as HTMLElement).id === "react-root") {
        ensureSidebar();
        observer.disconnect();
      }
    });
  });
});

observer.observe(document, { childList: true, subtree: true });