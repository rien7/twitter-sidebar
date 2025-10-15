import type { RefObject } from 'react'
import { useCallback, useRef } from 'react'

import { SidebarElementRefContext, useSidebarFlip } from '@/context/sidebar'
import { openTweetInSidebar } from '@/handlers/sidebarController'
import type { TweetResult } from '@/types/response'

import { SidebarHeader } from './SidebarHeader'
import { SidebarTimeline } from './SidebarTimeline'

interface SidebarContentProps {
  scrollAreaRef: RefObject<HTMLDivElement | null>
}

export function SidebarContent({ scrollAreaRef }: SidebarContentProps) {
  const headerRef = useRef<HTMLElement | null>(null)
  const emptyAreaRef = useRef<HTMLDivElement | null>(null)
  const { refreshAllTweetsBaseline } = useSidebarFlip()

  const handleSelectTweet = useCallback(
    (
      tweet: TweetResult,
      articleRef?: RefObject<HTMLElement | null>,
    ) => {
      if (articleRef?.current && scrollAreaRef.current) {
        const scrollAreaTop = scrollAreaRef.current.getBoundingClientRect().top
        const articleTop = articleRef.current?.getBoundingClientRect().top
        if (articleTop - scrollAreaTop < 0) {
          const onEnd = () => {
            refreshAllTweetsBaseline()
            openTweetInSidebar(tweet.rest_id)
            scrollAreaRef.current?.removeEventListener('scrollend', onEnd)
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
    [scrollAreaRef, refreshAllTweetsBaseline],
  )

  return (
    <SidebarElementRefContext value={{ headerRef, scrollAreaRef, emptyAreaRef }}>
      <div className={`
        flex h-full flex-col border-l border-solid border-twitter-divide-light bg-twitter-background-surface
        text-twitter-text-primary shadow
      `}
      >
        <SidebarHeader ref={headerRef} />
        <div className="flex-1 overflow-y-auto" ref={scrollAreaRef}>
          <SidebarTimeline onSelectTweet={handleSelectTweet} />
          <div className="min-h-1/2" ref={emptyAreaRef} />
        </div>
      </div>
    </SidebarElementRefContext>
  )
}
