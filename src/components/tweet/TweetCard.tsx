import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import { useSidebarElementRef, useSidebarFlip, useSidebarRoot, useSidebarTweet } from '@/context/sidebar'
import { openTweetInSidebar } from '@/handlers/sidebarController'
import { Target, TargetOption, useFlip } from '@/hooks/useFlip'
import type { TweetLimitedAction, TweetResult } from '@/types/response'
import { cn } from '@/utils/cn'

import TweetCardContent from './TweetCardContent'
import TweetCardHeader from './TweetCardHeader'

interface TweetCardProps {
  tweet: TweetResult
  variant?: 'main' | 'quote' | 'reply'
  onSelect?: (
    tweet: TweetResult,
    articleRef?: RefObject<HTMLElement | null>
  ) => void
  linkTop?: boolean
  linkBottom?: boolean
  controllerData?: string | null
  showDivider?: boolean
  limitedActions?: TweetLimitedAction[] | null
}

export default function TweetCard({
  tweet,
  variant = 'main',
  onSelect,
  linkTop = false,
  linkBottom = false,
  controllerData,
  showDivider,
  limitedActions,
}: TweetCardProps) {
  const [composerOpen, setComposerOpen] = useState(false)
  // For flip
  const articleRef = useRef<HTMLElement | null>(null)
  const userAvatarRef = useRef<HTMLAnchorElement | null>(null)
  const userNameRef = useRef<HTMLDivElement | null>(null)
  const userHandleRef = useRef<HTMLElement | null>(null)
  const bodyTextRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useSidebarRoot()

  // Set empty area height
  const { headerRef, emptyAreaRef, scrollAreaRef } = useSidebarElementRef()

  // Set scroll position on change
  const { mainTweetId, conversationId, timelineVersion } = useSidebarTweet()
  const previousMainTweetId = useRef<string | null>(null)
  const previousConversationId = useRef<string | null>(null)
  const previousTimelineVersion = useRef<string | null>(null)

  const { registerMainArticleRef, registerRefreshBaseline, refreshAllTweetsBaseline, mainArticleTopRef } = useSidebarFlip()

  const isMain = variant === 'main'
  const isReply = variant === 'reply'
  const isQuote = variant === 'quote'

  // Update emptyArea height base on tweet height
  useLayoutEffect(() => {
    if (!isMain || !headerRef?.current || !emptyAreaRef?.current || !articleRef.current)
      return
    const windowHeight = window.innerHeight
    const headerHeight = headerRef.current.getBoundingClientRect().height
    const articleHeight = articleRef.current.getBoundingClientRect().height
    emptyAreaRef.current.style.height = `${windowHeight - headerHeight - articleHeight}px`
  }, [isMain, headerRef, emptyAreaRef, articleRef])

  // Scroll into position
  useLayoutEffect(() => {
    const mainTweetChange = previousMainTweetId.current !== mainTweetId
    const conversationChange = previousConversationId.current !== conversationId
    const timelineVersionChange = previousTimelineVersion.current !== timelineVersion

    previousMainTweetId.current = mainTweetId ?? null
    previousConversationId.current = conversationId ?? null
    previousTimelineVersion.current = timelineVersion ?? null

    if (!isMain || !articleRef.current || !scrollAreaRef?.current) return

    const articleTop = articleRef.current.getBoundingClientRect().top
    const scrollAreaTop = scrollAreaRef.current.getBoundingClientRect().top

    if (mainTweetChange && !conversationChange && articleTop < scrollAreaTop) {
      // when a reply become main, after change, the article top < scroll top
      articleRef.current.scrollIntoView({
        behavior: 'instant',
        block: 'start',
      })
    } else if (conversationChange) {
      // sidebar open
      articleRef.current.scrollIntoView({
        behavior: 'instant',
        block: 'start',
      })
    }
    registerMainArticleRef(articleRef)

    // getTweetDetail response
    if (!mainTweetChange && timelineVersionChange) {
      if (mainArticleTopRef.current !== null) {
        articleRef.current.scrollIntoView({
          behavior: 'instant',
          block: 'start',
        })
        scrollAreaRef.current.scrollBy({
          behavior: 'instant',
          top: -mainArticleTopRef.current,
        })
        refreshAllTweetsBaseline()
        mainArticleTopRef.current = null
      }
    }
  }, [
    isMain,
    articleRef,
    scrollAreaRef,
    mainTweetId,
    conversationId,
    timelineVersion,
    previousMainTweetId,
    previousConversationId,
    previousTimelineVersion,
    registerMainArticleRef,
    mainArticleTopRef,
    refreshAllTweetsBaseline,
  ])

  const flipTargets = useMemo(() => [
    userAvatarRef,
    { target: userNameRef, type: 'text' },
    { target: userHandleRef, type: 'text' },
    { target: bodyTextRef, type: 'reflow' },
    { target: cardRef, type: 'reflow' },
  ] as (Target | TargetOption)[], [])
  const { refreshBaseline } = useFlip(flipTargets, [variant, mainTweetId], {
    root: rootRef,
  })

  useLayoutEffect(() => {
    return registerRefreshBaseline(refreshBaseline)
  }, [refreshBaseline, registerRefreshBaseline])

  const handleCardClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (!onSelect) return
    if (event.defaultPrevented) return
    if (mainTweetId === tweet.rest_id) return
    refreshAllTweetsBaseline()
    onSelect(tweet, articleRef)
  }

  const articleClass = cn(
    'flex flex-col items-start gap-3',
    isMain && 'relative px-5 pt-4',
    isReply && `relative bg-twitter-background-surface px-5 py-4`,
    isQuote && 'cursor-pointer rounded-2xl',
    isReply && showDivider && `
      after:absolute after:content-['']
      ${linkBottom ? 'after:left-16' : 'after:left-0'}
      after:right-0 after:bottom-0 after:h-px after:bg-twitter-border-light
    `,
    isReply && linkBottom && composerOpen && `
      after:absolute after:right-0 after:bottom-0 after:left-16 after:h-px after:bg-twitter-border-light after:content-['']
    `,
  )

  const articleProps: {
    className: string
    role?: string
    tabIndex?: number
    onClick?: (event: ReactMouseEvent<HTMLElement>) => void
  } = {
    className: articleClass,
  }

  if (isQuote) {
    const handleClickQuote = (event: ReactMouseEvent<HTMLElement>) => {
      if (event.defaultPrevented) return
      event.stopPropagation()
      openTweetInSidebar(tweet.rest_id)
    }
    articleProps.onClick = handleClickQuote
  } else if (onSelect) {
    articleProps.onClick = handleCardClick
  }

  const showLinkTop = linkTop
  const showLinkBottom = isReply && linkBottom

  return (
    <>
      <article
        {...articleProps}
        ref={articleRef}
        style={{ overflowAnchor: 'none' }}
      >
        {showLinkTop && (
          <span className="pointer-events-none absolute top-0 left-[2.625rem] h-3 w-0.5 bg-twitter-text-divider" />
        )}
        {showLinkBottom && (
          <span className="pointer-events-none absolute top-16 bottom-0 left-[2.625rem] w-0.5 bg-twitter-text-divider" />
        )}
        <div className={cn('w-full', isMain && 'border-b border-twitter-divide-light')}>
          <TweetCardHeader
            key={tweet.rest_id}
            tweet={tweet}
            userAvatarRef={userAvatarRef}
            userHandleRef={userHandleRef}
            userNameRef={userNameRef}
            variant={variant}
          />
          <TweetCardContent
            bodyTextRef={bodyTextRef}
            cardRef={cardRef}
            composerOpen={composerOpen}
            controllerData={controllerData}
            key={tweet.rest_id}
            limitedActions={limitedActions}
            onSelect={onSelect}
            setComposerOpen={setComposerOpen}
            tweet={tweet}
            variant={variant}
          />
        </div>
      </article>
    </>
  )
}
