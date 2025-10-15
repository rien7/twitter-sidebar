import { TweetLimitedAction, TweetResponse, TweetResult, TweetTombstone } from '@/types/response'
import { TweetData, TweetRelation } from '@/types/tweet'
import { NormalizedTweetResult, normalizeTweetResult } from '@/utils/responseData'

import { rememberUserAvatarFromTweet } from './avatarStore'

const TWEET_DETAIL_TTL_MS = 60_000

interface CachedTweetDetail {
  detail: TweetResponse
  cachedAt: number
}

export interface DeletedTweetData {
  tweetId: string
  parentTweetId: string | null
  tombstone: TweetTombstone
  recordedAt: number
}

const tweetsStore = new Map<string, TweetData>()
const tweetsRelationStore = new Map<string, TweetRelation>()
const tweetDetailCache = new Map<string, CachedTweetDetail>()
const deletedTweetStore = new Map<string, DeletedTweetData>()

export function storeTweet(
  tweet: TweetResult,
  controllerData: string | null,
  refreshRelation: boolean = false,
  limitedActions?: TweetLimitedAction[] | null,
) {
  const tweetId = tweet.rest_id
  const previous = tweetsStore.get(tweetId)
  const resolvedControllerData = controllerData ?? previous?.controllerData ?? null
  const resolvedLimitedActions = limitedActions === undefined
    ? previous?.limitedActions ?? null
    : limitedActions ?? null
  tweetsStore.set(tweetId, {
    result: tweet,
    controllerData: resolvedControllerData,
    limitedActions: resolvedLimitedActions ?? null,
  })
  rememberUserAvatarFromTweet(tweet)
  analyzeAndCreateRelations(tweet, refreshRelation)
}

export function getTweet(id: string) {
  return tweetsStore.get(id)
}

export function getTweetRelation(id: string) {
  return tweetsRelationStore.get(id)
}

export function resolveTweet(tweetId: string): TweetData | null {
  const cached = tweetsStore.get(tweetId)
  if (cached) return cached

  for (const candidate of tweetsStore.values()) {
    const directRetweeted = normalizeTweetResult(candidate.result.retweeted_status_result?.result)
    const legacyRetweeted = normalizeTweetResult(candidate.result.legacy?.retweeted_status_result?.result)
    const retweetedNormalized = directRetweeted ?? legacyRetweeted

    if (!retweetedNormalized) {
      continue
    }

    const retweeted = retweetedNormalized.tweet
    const retweetedId = retweeted.rest_id
    if (retweetedId !== tweetId) {
      continue
    }

    const controller = candidate.controllerData ?? null
    storeTweet(
      retweeted,
      controller,
      false,
      retweetedNormalized.limitedActions ?? undefined,
    )
    return tweetsStore.get(tweetId) ?? null
  }

  return null
}

export function getTweetDetail(tweetId: string) {
  const cached = tweetDetailCache.get(tweetId)
  if (!cached) return undefined
  if (Date.now() - cached.cachedAt > TWEET_DETAIL_TTL_MS) {
    tweetDetailCache.delete(tweetId)
    return undefined
  }
  return cached.detail
}

export function cacheTweetDetail(tweetId: string, detail: TweetResponse) {
  tweetDetailCache.set(tweetId, {
    detail,
    cachedAt: Date.now(),
  })
}

export function clearTweetDetail(tweetId: string) {
  tweetDetailCache.delete(tweetId)
}

export function applyDetailToTweetCache(
  tweetId: string,
  detail: TweetResponse,
) {
  const normalized = extractTweetFromDetail(detail, tweetId)
  if (!normalized) return
  const existing = tweetsStore.get(tweetId)
  storeTweet(
    normalized.tweet,
    existing?.controllerData ?? null,
    true,
    normalized.limitedActions ?? undefined,
  )
}

function extractTweetFromDetail(
  detail: TweetResponse | undefined,
  tweetId: string,
): NormalizedTweetResult | undefined {
  if (!detail) return undefined
  const instructions = detail.data?.threaded_conversation_with_injections_v2?.instructions
  for (const instruction of instructions ?? []) {
    if (!instruction || instruction.type !== 'TimelineAddEntries') continue
    const entries = instruction.entries ?? []
    for (const entry of entries) {
      if (!entry) continue
      if (entry.content.entryType === 'TimelineTimelineItem') {
        const direct = entry.content.itemContent.tweet_results.result
        const normalizedDirect = normalizeTweetResult(direct)
        if (normalizedDirect) return normalizedDirect
      } else if (entry.content.entryType === 'TimelineTimelineModule') {
        for (const item of entry.content.items ?? []) {
          // Remove promoted tweet
          if (item.item?.itemContent?.promotedMetadata !== undefined) {
            continue
          }
          const tweet = item?.item?.itemContent?.tweet_results.result
          const normalizedNested = normalizeTweetResult(tweet)
          if (normalizedNested && normalizedNested.tweet.rest_id === tweetId) {
            return normalizedNested
          }
        }
      }
    }
  }
  return undefined
}

export function storeDeletedTweet(
  tweetId: string,
  tombstone: TweetTombstone,
  parentTweetId: string | null,
) {
  deletedTweetStore.set(tweetId, {
    tweetId,
    parentTweetId,
    tombstone,
    recordedAt: Date.now(),
  })
}

export function getDeletedTweet(tweetId: string) {
  return deletedTweetStore.get(tweetId)
}

function analyzeAndCreateRelations(
  tweet: TweetResult,
  refreshRelation: boolean,
) {
  const tweetId = tweet.rest_id

  if (refreshRelation) {
    tweetsRelationStore.delete(tweetId)
  }

  const replyToId = tweet.legacy?.in_reply_to_status_id_str
  if (replyToId) addBidirectionalRelation(tweetId, replyToId, 'reply')

  const quotedNormalized = normalizeTweetResult(tweet.quoted_status_result?.result)
  if (quotedNormalized) {
    const quotedTweet = quotedNormalized.tweet
    addBidirectionalRelation(tweetId, quotedTweet.rest_id, 'quote')
    storeTweet(
      quotedTweet,
      null,
      false,
      quotedNormalized.limitedActions ?? undefined,
    )
  }

  const directRetweeted = normalizeTweetResult(tweet.retweeted_status_result?.result)
  const legacyRetweeted = normalizeTweetResult(tweet.legacy?.retweeted_status_result?.result)
  const retweetedNormalized = directRetweeted ?? legacyRetweeted
  if (retweetedNormalized) {
    const retweetedTweet = retweetedNormalized.tweet
    addBidirectionalRelation(tweetId, retweetedTweet.rest_id, 'retweet')
    storeTweet(
      retweetedTweet,
      null,
      false,
      retweetedNormalized.limitedActions ?? undefined,
    )
  }
}

function addBidirectionalRelation(
  sourceId: string,
  targetId: string,
  type: 'reply' | 'quote' | 'retweet',
) {
  const sourceRelation = getOrCreateRelation(sourceId)
  const targetRelation = getOrCreateRelation(targetId)

  switch (type) {
    case 'reply':
      sourceRelation.replyTo = targetId
      if (!targetRelation.replies) targetRelation.replies = new Set()
      targetRelation.replies.add(sourceId)
      break

    case 'quote':
      sourceRelation.quote = targetId
      targetRelation.quoteBy = sourceId
      break

    case 'retweet':
      sourceRelation.retweet = targetId
      if (!targetRelation.retweetBy) targetRelation.retweetBy = new Set()
      targetRelation.retweetBy.add(sourceId)
      break
  }
}

function getOrCreateRelation(tweetId: string): TweetRelation {
  const existing = tweetsRelationStore.get(tweetId)
  if (existing) return existing

  const newRelation: TweetRelation = {}
  tweetsRelationStore.set(tweetId, newRelation)
  return newRelation
}
