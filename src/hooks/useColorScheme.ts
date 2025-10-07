import { useCallback, useEffect, useMemo, useState } from "react";

export const useColorScheme = () => {
  const [isDark, setIsDark] = useState(false);
  const [background, setBackground] = useState("rgb(255, 255, 255)");
  const [accent, setAccent] = useState("rgb(29, 155, 240)");

  const checkDarkMode = useCallback(() => {
    const { style } = document.documentElement;
    setIsDark(style.colorScheme === "dark");
  }, []);

  const getBackground = useCallback(() => {
    const { style } = document.body;
    setBackground(style.backgroundColor ?? "rgb(255, 255, 255)");
  }, []);

  const getAccent = useCallback(() => {
    const el = document.querySelector(
      'h2 a[href="/i/keyboard_shortcuts"]'
    ) as HTMLElement;
    if (!el) return;
    const { color } = el.style;
    setAccent(color ?? "rgb(29, 155, 240)");
  }, []);

  const mutationObserver = useMemo(
    () =>
      new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "style"
          ) {
            checkDarkMode();
            getBackground();
            getAccent();
            break;
          }
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              const el = node as HTMLElement;
              if (
                el.tagName.toLowerCase() === "h2" &&
                el.querySelector('a[href="/i/keyboard_shortcuts"]')
              ) {
                getAccent();
                break;
              }
            }
          }
        }
      }),
    [checkDarkMode, getBackground, getAccent]
  );

  useEffect(() => {
    checkDarkMode();
    getBackground();
    getAccent();
    mutationObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });
    mutationObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });
    return () => mutationObserver.disconnect();
  }, [mutationObserver, checkDarkMode, getBackground, getAccent]);

  useEffect(() => {
    const accentMutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== "childList" || mutation.addedNodes.length === 0)
          continue;
        mutation.addedNodes.forEach((node) => {
          const el = node as HTMLElement;
          if (
            el.querySelector &&
            el.querySelector('a[href="/i/keyboard_shortcuts"]')
          ) {
            getAccent();
            mutationObserver.observe(node.parentNode!, {
              childList: true,
            });
            accentMutationObserver.disconnect();
          }
        });
      }
    });
    accentMutationObserver.observe(document.body, {
      subtree: true,
      childList: true,
    });
    return () => accentMutationObserver.disconnect();
  }, [getAccent, mutationObserver]);

  return { isDark, background, accent };
};
