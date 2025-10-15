import { RefObject, useMemo } from 'react'

import DeletedTweetCard from '@/components/tweet/DeletedTweetCard'
import TweetCard from '@/components/tweet/TweetCard'
import { useSidebarStore } from '@/hooks/useSidebarStore'
import { DeletedTweetData, getDeletedTweet, getTweetRelation } from '@/store/tweetsStore'
import type { TweetLimitedAction, TweetResult } from '@/types/response'
import { TweetData } from '@/types/tweet'
import { getUserIdFromTweet } from '@/utils/responseData'
import { buildAuthorSpine } from '@/utils/threadPrune'

interface SidebarTimelineProps {
  onSelectTweet: (
    tweet: TweetResult,
    articleRef?: RefObject<HTMLElement | null>
  ) => void
}

type AncestorEntry
  = | { kind: 'tweet', data: TweetData }
    | { kind: 'deleted', data: DeletedTweetData }

interface TimelineTweetItem {
  kind: 'tweet'
  key: string
  tweet: TweetResult
  variant: 'main' | 'reply'
  linkTop?: boolean
  linkBottom?: boolean
  controllerData?: string | null
  isAncestor?: boolean
  limitedActions?: TweetLimitedAction[] | null
}

interface TimelineDeletedItem {
  kind: 'deleted'
  key: string
  variant: 'main' | 'reply'
  linkTop?: boolean
  linkBottom?: boolean
  isAncestor?: boolean
  tombstone: DeletedTweetData
}

type TimelineItem = TimelineTweetItem | TimelineDeletedItem

export function SidebarTimeline({
  onSelectTweet,
}: SidebarTimelineProps) {
  const { tweet, tweetRelation, relateTweets } = useSidebarStore()

  const ancestorTweets = useMemo(() => {
    let replyTo = tweetRelation?.replyTo
    const tweetEntry: AncestorEntry[] = []
    while (replyTo !== undefined) {
      const tweet = relateTweets?.[replyTo]
      if (tweet?.result) {
        tweetEntry.push({ kind: 'tweet', data: tweet })
        replyTo = getTweetRelation(replyTo)?.replyTo
      } else { // if cannot get tweet in relateTweets, it may be deleted
        const deleted = getDeletedTweet(replyTo)
        // Can find any info about this tweet
        if (!deleted) break
        tweetEntry.push({ kind: 'deleted', data: deleted })
        replyTo = deleted.parentTweetId ?? undefined
      }
    }

    const tweets: TimelineItem[] = []
    tweetEntry.reverse().forEach((entry, index) => {
      const linkTop = index > 0
      if (entry.kind === 'tweet') {
        const tweet = entry.data
        tweets.push({
          kind: 'tweet',
          key: tweet.result.rest_id,
          tweet: tweet.result,
          variant: 'reply',
          linkTop,
          linkBottom: true,
          controllerData: tweet.controllerData,
          limitedActions: tweet.limitedActions,
        })
      } else {
        const deleted = entry.data
        tweets.push({
          kind: 'deleted',
          key: deleted.tweetId,
          variant: 'reply',
          linkTop,
          linkBottom: true,
          tombstone: deleted,
        })
      }
    })
    return tweets
  }, [tweetRelation, relateTweets])

  const mainTweet = useMemo(() => {
    if (!tweet) return
    return {
      kind: 'tweet',
      key: tweet.result.rest_id,
      tweet: tweet.result,
      variant: 'main',
      linkTop: tweetRelation?.replyTo !== undefined,
      controllerData: tweet.controllerData,
      limitedActions: tweet.limitedActions,
    } as TimelineTweetItem
  }, [tweet, tweetRelation])

  const childrenTweets = useMemo(() => {
    if (!tweet?.result || !tweetRelation?.replies || !relateTweets) return []
    const tweets: TimelineTweetItem[] = []
    for (const tweetId of tweetRelation.replies.keys()) {
      const branchSpineTweets = buildAuthorSpine(tweetId, getUserIdFromTweet(tweet?.result), relateTweets)
      branchSpineTweets.forEach((id, index) => {
        const tweet = relateTweets[id]
        const isLast = index === branchSpineTweets.length - 1
        const linkTop = index > 0
        const linkBottom = branchSpineTweets.length > 1 && !isLast
        tweets.push({
          kind: 'tweet',
          key: tweet.result.rest_id,
          tweet: tweet.result,
          variant: 'reply',
          linkTop,
          linkBottom,
          controllerData: tweet.controllerData,
          limitedActions: tweet.limitedActions,
        })
      })
    }
    return tweets
  }, [relateTweets, tweet, tweetRelation])

  const timelineItems = useMemo(() => {
    if (!mainTweet) return
    return [...ancestorTweets, mainTweet, ...childrenTweets]
  }, [ancestorTweets, mainTweet, childrenTweets])

  if (!timelineItems) {
    return (
      <div className="px-5 py-10 text-center text-[15px] text-twitter-text-secondary">
        选择一条推文即可在此预览详细内容
      </div>
    )
  }

  return (
    <>
      {timelineItems.map((item) => {
        const showDivider = !item.linkBottom && !item.isAncestor
        return item.kind === 'tweet'
          ? (
              <TweetCard
                controllerData={item.controllerData ?? null}
                key={item.key}
                limitedActions={item.limitedActions ?? null}
                linkBottom={item.linkBottom}
                linkTop={item.linkTop}
                onSelect={onSelectTweet}
                showDivider={showDivider}
                tweet={item.tweet}
                variant={item.variant}
              />
            )
          : (
              <DeletedTweetCard
                key={item.key}
                linkBottom={item.linkBottom}
                linkTop={item.linkTop}
                showDivider={showDivider}
                tombstone={item.tombstone}
                variant={item.variant}
              />
            )
      })}
    </>
  )
}

export default SidebarTimeline
