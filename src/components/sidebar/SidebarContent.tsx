import type { RefObject } from 'react'
import { useCallback, useMemo, useRef } from 'react'

import { SidebarContentRefContext, SidebarFlipContext } from '@/context/SidebarTimelineContext'
import { openTweetInSidebar } from '@/handlers/sidebarController'
import type { TweetResult } from '@/types/response'
import type { SidebarTweetStatus } from '@/types/sidebar'
import { TweetData, TweetRelation } from '@/types/tweet'

import { SidebarHeader } from './SidebarHeader'
import { SidebarTimeline } from './SidebarTimeline'

interface SidebarContentProps {
  isOpen: boolean
  scrollAreaRef: RefObject<HTMLDivElement>
  tweet: TweetData | null
  tweetRelation: TweetRelation | null
  relateTweets: Record<string, TweetData> | null
  status: SidebarTweetStatus
  pinned: boolean
  onTogglePinned: () => void
  onClose: () => void
}

export function SidebarContent({
  scrollAreaRef,
  tweet,
  tweetRelation,
  relateTweets,
  status,
  pinned,
  onTogglePinned,
  onClose,
}: SidebarContentProps) {
  const headerRef = useRef<HTMLElement | null>(null)
  const emptyAreaRef = useRef<HTMLDivElement | null>(null)

  const flipRefreshBaselineRegister = useRef(new Set<() => void>())
  const flipRefreshBaselineContextValue = useMemo(
    () => ({
      register(fn: () => void) {
        flipRefreshBaselineRegister.current.add(fn)
        return () => flipRefreshBaselineRegister.current.delete(fn)
      },
      refreshAll() {
        flipRefreshBaselineRegister.current.forEach(fn => fn())
      },
    }),
    [],
  )

  const handleSelectTweet = useCallback(
    (
      tweet: TweetResult,
      controllerData?: string | null,
      articleRef?: RefObject<HTMLElement | null>,
    ) => {
      if (articleRef?.current && scrollAreaRef.current) {
        const scrollAreaTop = scrollAreaRef.current.getBoundingClientRect().top
        const articleTop = articleRef.current?.getBoundingClientRect().top
        if (articleTop - scrollAreaTop < 0) {
          const onEnd = () => {
            flipRefreshBaselineContextValue.refreshAll()
            openTweetInSidebar(tweet.rest_id)
            scrollAreaRef.current.removeEventListener('scrollend', onEnd)
          }
          scrollAreaRef.current.addEventListener('scrollend', onEnd)
          articleRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        } else {
          openTweetInSidebar(tweet.rest_id)
        }
      } else {
        openTweetInSidebar(tweet.rest_id)
      }
    },
    [scrollAreaRef, flipRefreshBaselineContextValue],
  )

  return (
    <SidebarFlipContext value={flipRefreshBaselineContextValue}>
      <SidebarContentRefContext
        value={{ headerRef, scrollAreaRef, emptyAreaRef }}
      >
        <div className="bg-twitter-background-surface dark:bg-twitter-dark-background-surface text-twitter-text-primary dark:text-twitter-dark-text-primary shadow-twitter-sidebar flex h-full flex-col border-l border-solid border-twitter-divide-light shadow">
          <SidebarHeader
            ref={headerRef}
            pinned={pinned}
            onTogglePinned={onTogglePinned}
            onClose={onClose}
          />
          <div
            ref={scrollAreaRef}
            className="scrollbar-thin flex-1 overflow-y-auto"
            style={{ overflowAnchor: 'auto' }}
          >
            <SidebarTimeline
              tweet={tweet}
              tweetRelation={tweetRelation}
              relateTweets={relateTweets}
              status={status}
              onSelectTweet={handleSelectTweet}
            />
            <div
              ref={emptyAreaRef}
              className="min-h-1/2"
              style={{ overflowAnchor: 'none' }}
            />
          </div>
        </div>
      </SidebarContentRefContext>
    </SidebarFlipContext>
  )
}
