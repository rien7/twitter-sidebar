import { SidebarCloseIcon, SidebarPinIcon } from "@/icons/SidebarIcons";
import { cn } from "@/utils/cn";
import { forwardRef } from "react";

interface SidebarHeaderProps {
  pinned: boolean;
  onTogglePinned: () => void;
  onClose: () => void;
}

export const SidebarHeader = forwardRef<HTMLElement, SidebarHeaderProps>(
  ({ pinned, onTogglePinned, onClose }, ref) => (
    <header
      ref={ref}
      className="border-twitter-border-light bg-twitter-background-surface dark:border-twitter-dark-border-light relative z-20 flex items-center gap-3 border-b px-4 py-3"
    >
      <button
        className="fill-twitter-fill-muted dark:fill-twitter-dark-fill-muted hover:bg-twitter-background-hover dark:hover:bg-twitter-dark-background-hover group cursor-pointer rounded-md p-2 transition-all"
        onClick={onClose}
        aria-label="关闭推文详情侧边栏"
      >
        <SidebarCloseIcon />
      </button>

      <div className="flex-1" />

      <button
        type="button"
        aria-pressed={pinned}
        className={cn(
          "focus-visible:ring-twitter-ring-focus dark:focus-visible:ring-twitter-dark-ring-focus focus-visible:ring-offset-twitter-ring-offset dark:focus-visible:ring-offset-twitter-dark-ring-offset group flex h-9 w-9 items-center justify-center rounded-md p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          pinned
            ? "bg-twitter-background-pinned dark:bg-twitter-dark-background-pinned fill-twitter-fill-accent dark:fill-twitter-dark-fill-accent text-twitter-accent-primary dark:text-twitter-dark-accent-primary"
            : "fill-twitter-fill-muted dark:fill-twitter-dark-fill-muted text-twitter-text-secondary dark:text-twitter-dark-text-secondary hover:bg-twitter-background-hover dark:hover:bg-twitter-dark-background-hover"
        )}
        onClick={onTogglePinned}
        title={pinned ? "取消固定推文详情" : "固定推文详情"}
      >
        <SidebarPinIcon />
      </button>
    </header>
  )
);

SidebarHeader.displayName = "SidebarHeader";
