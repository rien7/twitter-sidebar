import { type CSSProperties, type RefObject, useCallback, useMemo } from 'react'

import { extractAvatar, formatDateTime } from '@/components/tweet/tweetText'
import UserHoverCard from '@/components/tweet/UserHoverCard'
import { ExternalLinkIcon } from '@/icons/ExternalLinkIcon'
import { BlueVerifiedIcon, ProtectedIcon } from '@/icons/UserBlueAndProtectedIcons'
import type { TweetResult } from '@/types/response'
import { cn } from '@/utils/cn'
import { getBlueVerified, getProtected, getUserFromTweet } from '@/utils/responseData'
import { renderWithTwemoji } from '@/utils/twemoji'

interface TweetCardHeaderProps {
  tweet: TweetResult
  variant: 'main' | 'reply' | 'quote'
  userAvatarRef: RefObject<HTMLAnchorElement | null>
  userNameRef: RefObject<HTMLDivElement | null>
  userHandleRef: RefObject<HTMLElement | null>
}

export default function TweetCardHeader({
  tweet,
  variant,
  userAvatarRef,
  userNameRef,
  userHandleRef,
}: TweetCardHeaderProps) {
  const isMain = variant === 'main'
  const isReply = variant === 'reply'
  const isQuote = variant === 'quote'

  const avatar = useMemo(() => extractAvatar(tweet, 'x96'), [tweet])
  const user = useMemo(() => getUserFromTweet(tweet), [tweet])
  const name = useMemo(() => user?.core?.name, [user])
  const screenName = useMemo(() => user?.core?.screen_name, [user])
  const isBlueVerified = getBlueVerified(user)
  const isProtected = getProtected(user)

  const openInNewTab = useCallback(() => {
    const userName = screenName
    const id = tweet.rest_id
    const url = `https://x.com/${userName}/status/${id}`
    window.open(url)
  }, [tweet, screenName])

  const createdAt = formatDateTime(
    tweet.legacy?.created_at,
    variant === 'main' ? 'long' : 'relative',
  )

  const headerClass = useMemo(() => cn(
    'mx-2 flex min-w-0 flex-nowrap',
    isReply && 'items-start',
    isQuote && 'w-full flex-1 items-center gap-1',
    isMain && 'flex-col items-start gap-0',
  ), [isMain, isQuote, isReply])
  const avatarClass = useMemo(() => cn(
    'flex-shrink-0 overflow-hidden rounded-full',
    isMain ? 'size-12' : isQuote ? 'size-6' : 'size-11',
    isQuote && 'z-10',
  ), [isMain, isQuote])
  const nameClass = useMemo(() => cn(
    `min-w-0 flex-shrink-2 grow-0 overflow-hidden text-nowrap overflow-ellipsis text-twitter-text-primary`,
    isMain ? 'text-[17px] font-bold' : 'text-[15px] font-semibold',
    isQuote && 'z-10',
  ), [isMain, isQuote])
  const handleClass = useMemo(() => cn(
    `flex-shrink-1 text-[15px] text-twitter-text-secondary`,
    (isReply || isQuote) && 'ml-1',
    isQuote && 'z-10',
  ), [isQuote, isReply])
  const handleStyle = { fontFeatureSettings: '"ss01"' } as CSSProperties

  return (
    <div className="flex w-full items-center justify-between">
      <div className={cn(
        'flex w-full min-w-0 flex-1',
        isReply ? 'items-start' : 'items-center',
      )}
      >
        <UserHoverCard user={user}>
          <a
            className={avatarClass}
            href={`/${screenName}`}
            ref={userAvatarRef}
          >
            {avatar && (
              <img
                alt={`${name} 的头像`}
                className="size-full object-cover"
                src={avatar ?? undefined}
              />
            )}
          </a>
        </UserHoverCard>
        <div className={headerClass}>
          <UserHoverCard
            className={cn('min-w-0 items-center', isQuote && 'z-10', !isQuote && 'w-full')}
            ref={userNameRef}
            user={user}
          >
            <span className={nameClass}>{renderWithTwemoji(name ?? '')}</span>
            <span className="ml-0.5 inline-flex h-5 shrink-0 items-center justify-center gap-0.5">
              {isProtected && <ProtectedIcon className="fill-twitter-text-primary" />}
              {isBlueVerified && <BlueVerifiedIcon />}
            </span>
          </UserHoverCard>
          <UserHoverCard user={user}>
            <span
              className={handleClass}
              ref={userHandleRef}
              style={handleStyle}
            >
              @
              {screenName}
            </span>
          </UserHoverCard>
          {!isMain && createdAt && (
            <span className="ml-1 shrink-0 text-twitter-text-secondary">
              <span className="mr-1">·</span>
              <span>{createdAt}</span>
            </span>
          )}
        </div>
      </div>
      {isMain && (
        <button
          className={`
            inline-flex size-9 cursor-pointer items-center justify-center rounded-md bg-transparent p-2 transition
            hover:bg-twitter-background-hover
          `}
          onClick={openInNewTab}
        >
          <ExternalLinkIcon />
        </button>
      )}
    </div>
  )
}
