import React, { Fragment, RefObject, useLayoutEffect, useMemo, useRef } from 'react'

import CardPreview from '@/components/tweet/CardPreview'
import MediaGallery from '@/components/tweet/MediaGallery'
import TweetActions from '@/components/tweet/TweetActions'
import TweetCard from '@/components/tweet/TweetCard'
import TweetPoll from '@/components/tweet/TweetPoll'
import {
  buildRichTextNodes,
  extractCardInfo,
  extractQuotedInfo,
  extractViews,
  extraMediaInfo,
  formatDateTime,
} from '@/components/tweet/tweetText'
import { useMediaOverlay } from '@/context/mediaOverlay'
import type { TweetLimitedAction, TweetResult } from '@/types/response'
import { cn } from '@/utils/cn'
import { extractPollInfo } from '@/utils/poll'
import { getProtected, getUserFromTweet } from '@/utils/responseData'

import ReplyComposer, { ReplyComposerHandle } from '../ReplyComposer'

interface TweetCardContentProps {
  tweet: TweetResult
  variant: 'main' | 'reply' | 'quote'
  limitedActions?: TweetLimitedAction[] | null
  composerOpen: boolean
  setComposerOpen: React.Dispatch<React.SetStateAction<boolean>>
  bodyTextRef: RefObject<HTMLDivElement | null>
  cardRef: RefObject<HTMLDivElement | null>
  onSelect?: (tweet: TweetResult) => void
  controllerData?: string | null
}

export default function TweetCardContent({
  tweet,
  controllerData,
  variant,
  limitedActions,
  bodyTextRef,
  cardRef,
  onSelect,
  composerOpen,
  setComposerOpen,
}: TweetCardContentProps) {
  const isMain = variant === 'main'
  const isReply = variant === 'reply'
  const isQuote = variant === 'quote'
  const bodyTextClass = cn(
    `break-words whitespace-pre-wrap text-twitter-text-primary`,
    isMain ? 'text-[17px]' : 'text-[15px]',
    isMain && 'mt-3',
    isQuote && 'mt-1',
    isReply && '-mt-4 ml-11 pl-2',
    isQuote && 'z-10',
  )

  const mediaOverlay = useMediaOverlay()
  const composerRef = useRef<ReplyComposerHandle>(null)

  const richTextNodes = useMemo(() => buildRichTextNodes(tweet), [tweet])
  const mediaInfo = useMemo(() => extraMediaInfo(tweet), [tweet])
  const cardInfo = useMemo(() => extractCardInfo(tweet), [tweet])
  const pollInfo = useMemo(() => extractPollInfo(tweet), [tweet])
  const { data: quotedTweet, limitAction: quoteLimitAction } = useMemo(() => extractQuotedInfo(tweet), [tweet])
  const createdAt = formatDateTime(
    tweet.legacy?.created_at,
    isMain ? 'long' : 'relative',
  )

  const galleryVariant = isMain ? 'main' : 'other'
  const isProtected = useMemo(() => getProtected(getUserFromTweet(tweet)), [tweet])
  const viewsText = useMemo(() => extractViews(tweet), [tweet])
  const showMedia = useMemo(() => {
    const result = mediaOverlay?.activeTweetId !== tweet.rest_id && Array.isArray(mediaInfo) && mediaInfo.length > 0
    return result
  }, [mediaInfo, mediaOverlay, tweet])
  const showPoll = Boolean(pollInfo)
  const showCardPreview = Boolean(cardInfo)
  const showQuote = Boolean(quotedTweet)
  const hasSupplementary = showMedia || showPoll || showCardPreview || showQuote

  const disabledActions = useMemo(() => {
    const disabled = new Set<'reply' | 'retweet'>()
    if (isProtected) {
      disabled.add('retweet')
    }
    if (limitedActions?.some(action =>
      typeof action?.action === 'string' && action.action.toLowerCase() === 'reply',
    )) {
      disabled.add('reply')
    }
    return disabled.size > 0 ? disabled : undefined
  }, [isProtected, limitedActions])

  useLayoutEffect(() => {
    if (composerOpen) {
      requestAnimationFrame(() => {
        composerRef.current?.focus()
      })
    }
  }, [composerOpen, composerRef])

  return (
    <>
      <div className={bodyTextClass} ref={bodyTextRef}>
        {richTextNodes.map(({ key, node }) => (
          <Fragment key={key}>{node}</Fragment>
        ))}
      </div>
      {hasSupplementary && (
        <div
          className={cn(
            'mt-3 flex flex-col gap-1',
            isReply && 'ml-11 pl-2',
            isQuote && 'z-10',
          )}
          key={tweet.rest_id}
          ref={cardRef}
        >
          {pollInfo && (
            <TweetPoll
              className={cn(isQuote && 'z-10')}
              controllerData={controllerData ?? null}
              poll={pollInfo}
              tweetId={tweet.rest_id}
            />
          )}
          {mediaInfo && showMedia && (
            <MediaGallery
              className={cn(isQuote && 'z-10')}
              media={mediaInfo}
              onSelect={(isReply || isQuote) ? () => onSelect?.(tweet) : undefined}
              tweetId={tweet.rest_id}
              variant={galleryVariant}
            />
          )}
          {cardInfo && <CardPreview card={cardInfo} />}
          {quotedTweet && (
            <div className="rounded-2xl border border-solid border-twitter-border-light bg-twitter-background-surface p-3">
              <TweetCard
                controllerData={controllerData}
                limitedActions={quoteLimitAction}
                onSelect={onSelect}
                tweet={quotedTweet}
                variant="quote"
              />
            </div>
          )}
        </div>
      )}
      {isMain && (
        <div className="my-4 flex flex-wrap items-center gap-1 text-[15px] text-twitter-text-secondary">
          {createdAt && <span>{createdAt}</span>}
          {viewsText && <span>·</span>}
          {viewsText && <span>{viewsText}</span>}
        </div>
      )}
      {!isQuote && (
        <TweetActions
          className={cn(isReply && 'ml-11 pl-2')}
          disanleAction={disabledActions}
          onReplyBtnClick={() => setComposerOpen(v => !v)}
          size={isMain ? 'md' : 'sm'}
          tweet={tweet}
        />
      )}
      {!isQuote && (
        <ReplyComposer
          className={cn(
            isReply && 'py-0 pl-[3.25rem]',
            isMain && 'border-t border-twitter-divide-light',
          )}
          expanded={composerOpen}
          onCollapse={() => setComposerOpen(false)}
          onExpand={() => setComposerOpen(true)}
          ref={composerRef}
          tweet={tweet}
        />
      )}
    </>
  )
}
