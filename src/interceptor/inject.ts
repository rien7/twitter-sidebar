const INTERCEPT_SCRIPT = "intercept.js";

export const ensureInterceptInjected = () => {
  const existing = document.querySelector(`script[data-tsb-interceptor="x"]`);
  if (existing) return;
  const script = document.createElement("script");
  script.dataset.tsbInterceptor = "x";
  script.src = chrome.runtime.getURL(INTERCEPT_SCRIPT);
  const doc = document.head || document.documentElement;
  doc.appendChild(script);
  script.addEventListener("load", () => script.remove());
};
