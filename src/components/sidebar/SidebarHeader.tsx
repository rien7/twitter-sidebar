import { forwardRef } from 'react'

import { SidebarCloseIcon, SidebarPinIcon } from '@/icons/SidebarIcons'
import { cn } from '@/utils/cn'

interface SidebarHeaderProps {
  pinned: boolean
  onTogglePinned: () => void
  onClose: () => void
}

export const SidebarHeader = forwardRef<HTMLElement, SidebarHeaderProps>(
  ({ pinned, onTogglePinned, onClose }, ref) => (
    <header
      ref={ref}
      className={`
        relative z-20 flex items-center gap-3 border-b border-twitter-border-light bg-twitter-background-surface px-4 py-3
      `}
    >
      <button
        className={`
          group cursor-pointer rounded-md fill-twitter-fill-muted p-2 transition-all
          hover:bg-twitter-background-hover
        `}
        onClick={onClose}
        aria-label="关闭推文详情侧边栏"
      >
        <SidebarCloseIcon />
      </button>

      <div className="flex-1" />

      <button
        type="button"
        aria-pressed={pinned}
        className={cn(`
          group flex size-9 items-center justify-center rounded-md p-2 transition-all
          focus-visible:ring-2 focus-visible:ring-twitter-ring-focus focus-visible:ring-offset-2
          focus-visible:ring-offset-twitter-ring-offset focus-visible:outline-none
        `,
        pinned
          ? `bg-twitter-background-pinned fill-twitter-fill-accent text-twitter-accent-primary`
          : `
            fill-twitter-fill-muted text-twitter-text-secondary
            hover:bg-twitter-background-hover
          `,
        )}
        onClick={onTogglePinned}
        title={pinned ? '取消固定推文详情' : '固定推文详情'}
      >
        <SidebarPinIcon />
      </button>
    </header>
  ),
)

SidebarHeader.displayName = 'SidebarHeader'
