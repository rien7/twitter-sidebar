import { RefObject } from 'react'

import { useSidebarStore } from '@/hooks/useSidebarStore'
import { SidebarCloseIcon, SidebarPinIcon } from '@/icons/SidebarIcons'
import { sidebarStore } from '@/store/sidebarStore'
import { cn } from '@/utils/cn'

export function SidebarHeader({ ref }: { ref: RefObject<HTMLElement | null> }) {
  const { pinned } = useSidebarStore()

  return (
    <header
      className={`
        relative z-20 flex items-center gap-3 border-b border-twitter-border-light bg-twitter-background-surface px-4 py-3
      `}
      ref={ref}
    >
      <button
        className={`
          group cursor-pointer rounded-md fill-twitter-fill-muted p-2 transition-all
          hover:bg-twitter-background-hover
        `}
        onClick={() => sidebarStore.close()}
      >
        <SidebarCloseIcon />
      </button>

      <div className="flex-1" />

      <button
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
        onClick={() => sidebarStore.togglePinned()}
        type="button"
      >
        <SidebarPinIcon />
      </button>
    </header>
  )
}

SidebarHeader.displayName = 'SidebarHeader'
