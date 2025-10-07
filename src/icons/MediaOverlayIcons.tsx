import type { IconProps } from "./types";

const commonProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/**
 * 媒体预览关闭按钮使用的图标。
 */
export const OverlayCloseIcon = ({ size = 20, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    aria-hidden="true"
    {...commonProps}
    {...props}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/**
 * 媒体预览上一张按钮的图标。
 */
export const OverlayPreviousIcon = ({ size = 20, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    aria-hidden="true"
    {...commonProps}
    {...props}
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

/**
 * 媒体预览下一张按钮的图标。
 */
export const OverlayNextIcon = ({ size = 20, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    aria-hidden="true"
    {...commonProps}
    {...props}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
