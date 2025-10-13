import type { CSSProperties, RefObject } from 'react'

import UserHoverCard from '@/components/tweet/UserHoverCard'
import { ExternalLinkIcon } from '@/icons/ExternalLinkIcon'
import { BlueVerifiedIcon, ProtectedIcon } from '@/icons/UserBlueAndProtectedIcons'
import type { TweetResult } from '@/types/response'
import { cn } from '@/utils/cn'
import { getBlueVerified, getProtected } from '@/utils/responseData'
import { renderWithTwemoji } from '@/utils/twemoji'

interface TweetCardHeaderProps {
  tweet: TweetResult
  name: string
  screenName: string
  avatar: string | undefined
  avatarCache: string | undefined
  isMain: boolean
  isReply: boolean
  isQuote: boolean
  createdAt: string | null
  showTimestampInHeader: boolean
  onOpenInNewTab: () => void
  avatarRef: RefObject<HTMLImageElement | null>
  userAvatarRef: RefObject<HTMLAnchorElement | null>
  userNameRef: RefObject<HTMLDivElement | null>
  userHandleRef: RefObject<HTMLElement | null>
}

export function TweetCardHeader({
  tweet,
  name,
  screenName,
  avatar,
  avatarCache,
  isMain,
  isReply,
  isQuote,
  createdAt,
  showTimestampInHeader,
  onOpenInNewTab,
  avatarRef,
  userAvatarRef,
  userNameRef,
  userHandleRef,
}: TweetCardHeaderProps) {
  const avatarClass = cn(
    'flex-shrink-0 overflow-hidden rounded-full',
    isMain ? 'size-12' : isQuote ? 'size-6' : 'size-11',
    isQuote && 'z-10',
  )
  const headerClass = cn(
    'ml-2 flex min-w-0 flex-nowrap',
    isReply && 'items-start',
    isQuote && 'w-full flex-1 items-center gap-1',
    isMain && 'flex-col items-start gap-0',
  )
  const nameClass = cn(
    `min-w-0 flex-shrink-2 grow-0 overflow-hidden text-nowrap overflow-ellipsis text-twitter-text-primary`,
    isMain ? 'text-[17px] font-bold' : 'text-[15px] font-semibold',
    isQuote && 'z-10',
  )
  const handleClass = cn(
    `flex-shrink-1 text-[15px] text-twitter-text-secondary`,
    (isReply || isQuote) && 'ml-1',
    isQuote && 'z-10',
  )
  const handleStyle = { fontFeatureSettings: '"ss01"' } as CSSProperties
  const user = tweet.core?.user_results?.result
  const isBlueVerified = getBlueVerified(user)
  const isProtected = getProtected(user)

  return (
    <div className="flex w-full items-center justify-between">
      <div
        className={cn(
          'flex w-full min-w-0 flex-1',
          isReply ? 'items-start' : 'items-center',
        )}
      >
        <UserHoverCard user={tweet.core?.user_results?.result}>
          <a
            ref={userAvatarRef}
            className={avatarClass}
            href={`/${screenName}`}
          >
            {avatar
              ? (
                  <img
                    ref={avatarRef}
                    src={avatarCache ?? undefined}
                    alt={`${name} 的头像`}
                    className="size-full object-cover"
                  />
                )
              : null}
          </a>
        </UserHoverCard>
        <div className={headerClass}>
          <UserHoverCard
            user={user}
            ref={userNameRef}
            className={cn('min-w-0 items-center', isQuote && 'z-10')}
          >
            <span className={nameClass}>{renderWithTwemoji(name)}</span>
            <span className="ml-0.5 inline-flex h-5 shrink-0 items-center justify-center gap-0.5">
              {isProtected
                ? (
                    <ProtectedIcon className="fill-twitter-text-primary" />
                  )
                : undefined}
              {isBlueVerified ? <BlueVerifiedIcon /> : undefined}
            </span>
          </UserHoverCard>
          <UserHoverCard user={user}>
            <span
              ref={userHandleRef}
              className={handleClass}
              style={handleStyle}
            >
              @
              {screenName}
            </span>
          </UserHoverCard>
          {showTimestampInHeader
            ? (
                <span className="ml-1 shrink-0 text-twitter-text-secondary">
                  <span className="mr-1">·</span>
                  <span>{createdAt}</span>
                </span>
              )
            : null}
        </div>
      </div>
      {isMain
        ? (
            <button
              className={`
                inline-flex size-9 cursor-pointer items-center justify-center rounded-md bg-transparent p-2 transition
                hover:bg-twitter-background-hover
              `}
              onClick={onOpenInNewTab}
            >
              <ExternalLinkIcon />
            </button>
          )
        : null}
    </div>
  )
}

export default TweetCardHeader
