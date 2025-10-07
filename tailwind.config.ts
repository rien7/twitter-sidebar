import type { Config } from "tailwindcss";

/**
 * Twitter 设计语言的调色板。该对象不仅在 Tailwind 配置中使用，
 * 也会被运行时代码引用，以保持主题颜色的一致性。
 */
export const twitterPalette = {
  light: {
    text: {
      primary: "#0f1419",
      secondary: "#536471",
      error: "#f4212e",
      divider: "#cfd9de",
    },
    accent: {
      primary: "#1d9bf0",
      primaryHover: "#1a8cd8",
      primaryDisabled: "#8ecdf7",
    },
    background: {
      surface: "#ffffff",
      muted: "#f7f9f9",
      hover: "#e7e7e8",
      "subtle-hover": "#f1f5f9",
      pinned: "#e8f5fd",
      card: "#f0f2f3",
      inverse: "#0f1419",
      "hover-inverse": "#272c30",
    },
    border: {
      light: "#eff3f4",
      strong: "#cfd9de",
      input: "#d0d5d7",
    },
    fill: {
      muted: "#536471",
      accent: "#1d9bf0",
    },
    divide: {
      light: "#eff3f4",
    },
    overlay: "rgba(0, 0, 0, 0.3)",
    ring: {
      focus: "#38bdf8",
      offset: "#ffffff",
    },
  },
  dark: {
    text: {
      primary: "#e7e9ea",
      secondary: "#8b98a5",
      error: "#f4212e",
      divider: "#3b3f44",
    },
    accent: {
      primary: "#1d9bf0",
      primaryHover: "#1a8cd8",
      primaryDisabled: "#1f6ba5",
    },
    background: {
      surface: "#15202b",
      muted: "#1a2732",
      hover: "#1d2733",
      "subtle-hover": "#1e2a36",
      pinned: "#1b3144",
      card: "#19232d",
      inverse: "#0f1419",
      "hover-inverse": "#1f2a33",
    },
    border: {
      light: "#273340",
      strong: "#3b4651",
      input: "#38444d",
    },
    fill: {
      muted: "#8b98a5",
      accent: "#1d9bf0",
    },
    divide: {
      light: "#273340",
    },
    overlay: "rgba(255, 255, 255, 0.2)",
    ring: {
      focus: "#0ea5e9",
      offset: "#15202b",
    },
  },
} as const;

const flattenPalette = (
  palette: Record<string, unknown>,
  prefix = ""
): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(palette)) {
    const nextKey = prefix ? `${prefix}-${key}` : key;
    if (value && typeof value === "object") {
      Object.assign(result, flattenPalette(value as Record<string, unknown>, nextKey));
    } else if (typeof value === "string") {
      result[nextKey] = value;
    }
  }
  return result;
};

export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ...flattenPalette(twitterPalette.light, "twitter"),
        ...flattenPalette(twitterPalette.dark, "twitter-dark"),
      },
    },
  },
  content: ["src/**/*.tsx"],
  plugins: [],
} satisfies Config;
