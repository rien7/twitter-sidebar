import type { ReactNode, RefObject } from 'react'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { fetchFollowingList, type FollowingListEntry } from '@/api/followingList'
import { followUser, unfollowUser } from '@/api/friendships'
import type { UrlEntity, UserResult } from '@/types/response'
import { cn } from '@/utils/cn'
import { renderWithTwemoji } from '@/utils/twemoji'

const formatter = new Intl.NumberFormat('zh-CN')

interface UserHoverCardProps {
  user?: UserResult | null
  children: ReactNode
  ref?: RefObject<HTMLDivElement | null>
  className?: string
  placement?: 'left' | 'right'
}

const getAvatar = (user?: UserResult | null) => {
  const avatar = user?.avatar?.image_url
  if (!avatar) return undefined
  return avatar.replace('_normal', '_400x400')
}

const getName = (user?: UserResult | null) => {
  const legacy = user?.legacy
  return {
    name: legacy?.name ?? user?.core?.name ?? '未知用户',
    screenName: legacy?.screen_name ?? user?.core?.screen_name ?? '',
  }
}

const buildDescriptionNodes = (user?: UserResult | null) => {
  const description = user?.legacy?.description ?? ''
  if (!description) return [] as Array<{ key: string, node: ReactNode }>
  const characters = Array.from(description)
  const urls = (user?.legacy?.entities?.description?.urls ?? []) as UrlEntity[]
  const normalized = urls
    .filter(url => Array.isArray(url.indices) && url.indices.length === 2)
    .map((url, index) => ({
      start: url.indices[0],
      end: url.indices[1],
      href: url.expanded_url ?? url.url,
      display: url.display_url ?? url.expanded_url ?? url.url,
      key: `url-${index}`,
    }))
    .sort((a, b) => a.start - b.start)

  const nodes: Array<{ key: string, node: ReactNode }> = []
  let cursor = 0
  let keyIndex = 0

  const pushPlain = (from: number, to: number) => {
    if (to <= from) return
    const text = characters.slice(from, to).join('')
    if (!text) return
    nodes.push({
      key: `text-${keyIndex++}`,
      node: <span>{renderWithTwemoji(text)}</span>,
    })
  }

  normalized.forEach((entity) => {
    if (entity.end <= cursor) return
    pushPlain(cursor, entity.start)
    const label = characters.slice(entity.start, entity.end).join('')
    const display = entity.display ?? label
    nodes.push({
      key: entity.key,
      node: (
        <a
          className={`
            text-twitter-accent
            hover:underline
          `}
          href={entity.href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {display}
        </a>
      ),
    })
    cursor = entity.end
  })

  pushPlain(cursor, characters.length)

  return nodes
}

const formatCount = (value?: number | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value < 0) return null
  return formatter.format(value)
}

function UserHoverCard({
  user,
  children,
  className,
  ref,
  placement = 'left',
}: UserHoverCardProps) {
  const [open, setOpen] = useState(false)
  const enterTimer = useRef<number | null>(null)
  const leaveTimer = useRef<number | null>(null)
  const { name, screenName } = useMemo(() => getName(user), [user])
  const avatar = useMemo(() => getAvatar(user), [user])
  const descriptionNodes = useMemo(() => buildDescriptionNodes(user), [user])

  const followers = formatCount(user?.legacy?.followers_count ?? null)
  const following = formatCount(user?.legacy?.friends_count ?? null)
  const followby = user?.relationship_perspectives?.followed_by
  const derivedFollowing = Boolean(user?.relationship_perspectives?.following)

  const userId = user?.rest_id
  const [isFollowing, setIsFollowing] = useState(derivedFollowing)
  const [fromUnfollow, setFromUnfollow] = useState(false)
  const [isHoveringButton, setIsHoveringButton] = useState(false)

  const [followingPreview, setFollowingPreview] = useState<FollowingListEntry[] | null>(null)
  const [followingTotalCount, setFollowingTotalCount] = useState<number | null>(null)
  const lastFollowingRequestUserIdRef = useRef<string | null>(null)

  const clearTimers = () => {
    if (enterTimer.current !== null) {
      window.clearTimeout(enterTimer.current)
      enterTimer.current = null
    }
    if (leaveTimer.current !== null) {
      window.clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
  }

  const handleMouseEnter = () => {
    clearTimers()
    enterTimer.current = window.setTimeout(() => setOpen(true), 480)
  }

  const handleMouseLeave = () => {
    clearTimers()
    leaveTimer.current = window.setTimeout(() => setOpen(false), 480)
  }

  const handleMouseEnterButton = () => {
    setIsHoveringButton(true)
  }

  const handleMouseLeaveButton = () => {
    setIsHoveringButton(false)
    setFromUnfollow(false)
  }

  useEffect(() => () => clearTimers(), [])

  useEffect(() => {
    if (!open || !userId) return
    if (lastFollowingRequestUserIdRef.current === userId && followingPreview !== null) {
      return
    }

    let cancelled = false

    const fetchData = async () => {
      const result = await fetchFollowingList({ userId, count: 3 })
      if (cancelled) return
      setFollowingPreview(result.users)
      setFollowingTotalCount(
        typeof result.totalCount === 'number' ? result.totalCount : null,
      )
    }

    fetchData()
    lastFollowingRequestUserIdRef.current = userId

    return () => {
      cancelled = true
    }
  }, [open, userId, followingPreview])

  const followLabel = isFollowing
    ? isHoveringButton && !fromUnfollow
      ? '取消关注'
      : '正在关注'
    : '关注'
  const handleFollow = useCallback(async (e: React.MouseEvent) => {
    if (!userId) return
    e.stopPropagation()
    e.preventDefault()

    setIsFollowing((prev) => {
      const next = !prev
      ;(async () => {
        try {
          if (prev) {
            await unfollowUser(userId)
          } else {
            setFromUnfollow(true)
            await followUser(userId)
          }
        } catch (error) {
          console.error('[TSB][Follow] Failed to follow.', error)
          setIsFollowing(prev)
        }
      })()
      return next
    })
  }, [userId, setIsFollowing])

  const alignmentClass = placement === 'right' ? 'right-0' : 'left-0'

  return (
    <div
      className={cn('relative inline-flex', className)}
      onBlur={handleMouseLeave}
      onFocus={handleMouseEnter}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={ref}
    >
      {children}
      {open && user && (
        <div
          className={cn(`
            absolute top-full z-50 mt-2 w-[360px] max-w-[90vw] rounded-2xl border border-twitter-border-light
            bg-twitter-background-surface p-4
          `,
          alignmentClass,
          )}
        >
          <div className="flex items-start gap-3">
            <div className="size-16 overflow-hidden rounded-full">
              {avatar && (
                <img
                  alt={`${name} 的头像`}
                  className="size-full object-cover"
                  src={avatar}
                />
              )}
            </div>
            <button
              className={cn(`
                ml-auto min-h-[36px] rounded-full border border-solid px-4 py-1 text-[15px] leading-[20px] font-semibold
                transition-colors
                hover:cursor-pointer
                focus-visible:outline-none
                disabled:cursor-not-allowed disabled:opacity-60
              `,
              (!isFollowing || (isFollowing && isHoveringButton && fromUnfollow)) && `
                border-twitter-background-inverse bg-twitter-background-inverse text-twitter-text-inverse
              `,
              isFollowing && isHoveringButton && !fromUnfollow && `
                border-red-500 bg-red-50 text-red-500
                dark:bg-transparent
              `,
              isFollowing && !isHoveringButton && !fromUnfollow && `
                border-twitter-border-strong bg-transparent text-twitter-text-primary
              `,
              )}
              disabled={!userId}
              onBlur={handleMouseLeaveButton}
              onClick={handleFollow}
              onFocus={handleMouseEnterButton}
              onMouseEnter={handleMouseEnterButton}
              onMouseLeave={handleMouseLeaveButton}
              type="button"
            >
              {followLabel}
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <div className="text-[17px] font-bold text-twitter-text-primary">
              {renderWithTwemoji(name)}
            </div>
            {screenName && (
              <div className="flex items-center">
                <div className="text-[15px] text-twitter-text-secondary">
                  @
                  {screenName}
                </div>
                {followby && (
                  <div className={`
                    ml-[4px] rounded-[4px] bg-[#eff3f4] px-[4px] py-[2px] text-[11px] leading-[12px] font-medium text-[#536471]
                    dark:bg-[#202327] dark:text-[#71767b]
                  `}
                  >
                    Follows you
                  </div>
                )}
              </div>
            )}
            {descriptionNodes.length > 0 && (
              <div className="text-[15px] leading-6 break-words whitespace-pre-wrap text-twitter-text-primary">
                {descriptionNodes.map(({ key, node }) => (
                  <span className="[&>a]:font-normal" key={key}>
                    {node}
                  </span>
                ))}
              </div>
            )}
          </div>
          {(followers || following) && (
            <div className="mt-3 flex gap-4 text-[15px]">
              {following && (
                <a
                  className={`
                    text-twitter-text-secondary
                    hover:underline
                  `}
                  href={screenName ? `https://x.com/${screenName}/following` : undefined}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span className="font-semibold text-twitter-text-primary">
                    {following}
                  </span>
                  {' '}
                  正在关注
                </a>
              )}
              {followers && (
                <a
                  className={`
                    text-twitter-text-secondary
                    hover:underline
                  `}
                  href={screenName ? `https://x.com/${screenName}/followers` : undefined}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span className="font-semibold text-twitter-text-primary">
                    {followers}
                  </span>
                  {' '}
                  粉丝
                </a>
              )}
            </div>
          )}
          {followingPreview && followingPreview.length > 0 && followingTotalCount && (
            <a
              className="mt-3 flex"
              href={`https://x.com/${screenName}/followers_you_follow`}
            >
              <div className="flex h-full shrink-0">
                {followingPreview.slice(0, 3).map((entry, index) => {
                  const previewAvatar = entry.avatarUrl ?? undefined
                  return (
                    <img
                      alt={`${entry.name || entry.screenName} 的头像`}
                      className={cn(
                        'top-0 bottom-0 size-7 rounded-full border border-solid border-white object-cover',
                        index > 0 && '-ml-3.5',
                      )}
                      key={entry.id}
                      src={previewAvatar}
                      style={{
                        zIndex: 4 - index,
                      }}
                    />
                  )
                })}
              </div>
              <div className="ml-1 grow text-sm text-twitter-text-secondary">
                Following by
                {' '}
                {followingPreview.slice(0, 2).map((f, i) => {
                  return (
                    // eslint-disable-next-line @eslint-react/no-array-index-key
                    <Fragment key={i}>
                      {renderWithTwemoji(f.name)}
                      {i === 0 ? ', ' : undefined}
                    </Fragment>
                  )
                })}
                {' '}
                {followingTotalCount > 2 ? `and ${followingTotalCount - 2} others you follow` : undefined}
              </div>
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default UserHoverCard
