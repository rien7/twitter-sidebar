import type { CSSProperties } from 'react'
import { useEffect, useMemo, useRef } from 'react'

import { SIDEBAR_WIDTH_COLLAPSED } from '@/constants/layout'
import { useMediaOverlay } from '@/context/mediaOverlay'
import { SidebarFlipProvider, SidebarRootContext, SidebarTweetContext } from '@/context/sidebar'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useScrollBoundaryLock } from '@/hooks/useScrollBoundaryLock'
import { useSidebarResize } from '@/hooks/useSidebarResize'
import { useSidebarStore } from '@/hooks/useSidebarStore'
import { sidebarStore } from '@/store/sidebarStore'
import { cn } from '@/utils/cn'
import { simpleHash } from '@/utils/hash'

import { SidebarContent } from './SidebarContent'

export function SidebarSurface() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const mainArticleRef = useRef<HTMLElement | null>(null)

  const mainArticleTopRef = useRef<number | null>(null)

  const { isDark, background, accent } = useColorScheme()
  const { isOpen, pinned, width, tweet, tweetRelation, relateTweets } = useSidebarStore()

  const mediaOverlay = useMediaOverlay()
  const closeMedia = mediaOverlay?.closeMedia
  const activeMedia = mediaOverlay?.activeMedia
  const isSidebarCollapsed = mediaOverlay?.isSidebarCollapsed ?? false

  const { isResizing, handlePointerDown, handlePointerOver, handlePointerOut } = useSidebarResize(width, !isSidebarCollapsed)
  useScrollBoundaryLock(scrollAreaRef, isOpen)

  const mainTweetId = tweet?.result.rest_id
  const conversationId = tweet?.result.legacy?.conversation_id_str
  const timelineVersion = useMemo(() => {
    return simpleHash([
      tweet?.result.rest_id,
      Object.values(relateTweets ?? {}).length.toString(),
      tweetRelation?.quote,
      tweetRelation?.quoteBy,
      ...([...tweetRelation?.replies ?? []].toSorted()),
      tweetRelation?.replyTo,
      tweetRelation?.retweet,
      ...([...tweetRelation?.retweetBy ?? []].sort())])
  }, [tweet, tweetRelation, relateTweets])
  const previousMainTweetIdRef = useRef<string | undefined>(undefined)

  if (mainArticleRef.current && scrollAreaRef.current) {
    const articleTop = mainArticleRef.current.getBoundingClientRect().top
    const scrollTop = scrollAreaRef.current.getBoundingClientRect().top
    mainArticleTopRef.current = articleTop - scrollTop
  } else {
    mainArticleTopRef.current = null
  }

  useEffect(() => {
    if (!isOpen) {
      mainArticleRef.current = null
      mainArticleTopRef.current = null
    }
  }, [isOpen])

  useEffect(() => {
    if (previousMainTweetIdRef.current !== mainTweetId && activeMedia && closeMedia) {
      closeMedia()
    }
    previousMainTweetIdRef.current = mainTweetId
  }, [mainTweetId, activeMedia, closeMedia])

  useEffect(() => {
    if (!isOpen && activeMedia && closeMedia) {
      closeMedia()
    }
  }, [isOpen, activeMedia, closeMedia])

  const sidebarWidth = useMemo(
    () =>
      isSidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : `min(100vw, ${width}px)`,
    [isSidebarCollapsed, width],
  )

  const rootStyle = useMemo(() => {
    return {
      '--color-twitter-background-surface': background,
      '--color-twitter-accent': accent,
    } as CSSProperties
  }, [accent, background])

  return (
    <SidebarRootContext value={rootRef}>
      <SidebarFlipProvider mainArticleRef={mainArticleRef} mainArticleTopRef={mainArticleTopRef}>
        <SidebarTweetContext value={{ mainTweetId, conversationId, timelineVersion }}>
          <div
            className={cn(
              'pointer-events-none fixed inset-0 z-[2147483645]',
              // eslint-disable-next-line better-tailwindcss/no-unregistered-classes
              isDark && 'dark',
            )}
            ref={rootRef}
            style={rootStyle}
          >
            {isOpen && !pinned && !activeMedia && (
              <div
                className="pointer-events-auto absolute inset-0 bg-black/30"
                onClick={() => sidebarStore.close()}
              />
            )}
            <div
              className={cn(
                'pointer-events-auto absolute inset-y-0 right-0 translate-y-0',
                isResizing ? 'transition-none' : 'transition-all duration-300 ease-in-out',
                isOpen ? 'translate-x-0' : 'translate-x-full',
              )}
              data-flip-base-layer
              style={{ width: sidebarWidth }}
            >
              <div
                className="pointer-events-none absolute inset-0 z-10"
                data-flip-layer
              />
              {isOpen && (
                <div
                  className={cn(
                    `absolute top-0 left-0 z-50 h-full w-1 -translate-x-1/2 transition-colors select-none`,
                    isResizing
                      ? 'bg-twitter-accent'
                      : `
                        bg-transparent
                        hover:bg-twitter-accent
                      `,
                  )}
                  onPointerDown={handlePointerDown}
                  onPointerOut={handlePointerOut}
                  onPointerOver={() => handlePointerOver(width)}
                />
              )}
              <SidebarContent scrollAreaRef={scrollAreaRef} />
            </div>
          </div>
        </SidebarTweetContext>
      </SidebarFlipProvider>
    </SidebarRootContext>
  )
}
