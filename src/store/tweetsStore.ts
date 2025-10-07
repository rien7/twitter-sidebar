import {
  Instruction,
  TimelineModuleContent,
  TweetResponse,
  TweetResult,
} from "@/types/response";
import { TweetData, TweetRelation } from "@/types/tweet";
import { getTweetIdFromTweet, isTweetResult } from "@/utils/responseData";
import { rememberUserAvatarFromTweet } from "./avatarStore";

const tweetsStore = new Map<string, TweetData>();
const tweetsRelationStore = new Map<string, TweetRelation>();

const TWEET_DETAIL_TTL_MS = 60_000;

type CachedTweetDetail = {
  detail: TweetResponse;
  cachedAt: number;
};

const tweetDetailCache = new Map<string, CachedTweetDetail>();

export function storeTweet(
  tweet: TweetResult,
  controllerData: string | null,
  refreshRelation: boolean = false
) {
  const tweetId = getTweetIdFromTweet(tweet);
  if (!tweetId) return;
  const previous = tweetsStore.get(tweetId);
  const resolvedControllerData =
    controllerData ?? previous?.controllerData ?? null;
  tweetsStore.set(tweetId, {
    result: tweet,
    controllerData: resolvedControllerData,
  });
  rememberUserAvatarFromTweet(tweet);
  analyzeAndCreateRelations(tweet, refreshRelation);
}

export function getTweet(id: string) {
  return tweetsStore.get(id);
}

export function getTweetRelation(id: string) {
  return tweetsRelationStore.get(id);
}

export function resolveTweet(tweetId: string): TweetData | null {
  const cached = tweetsStore.get(tweetId);
  if (cached) return cached;

  for (const candidate of tweetsStore.values()) {
    const retweeted =
      (candidate.result.retweeted_status_result?.result?.__typename === "Tweet"
        ? (candidate.result.retweeted_status_result.result as TweetResult)
        : undefined) ??
      ((candidate.result.legacy as
        | { retweeted_status_result?: { result?: TweetResult } }
        | undefined)
        ?.retweeted_status_result?.result as TweetResult | undefined);

    if (!retweeted || !isTweetResult(retweeted)) {
      continue;
    }

    const retweetedId = getTweetIdFromTweet(retweeted);
    if (!retweetedId || retweetedId !== tweetId) {
      continue;
    }

    const controller = candidate.controllerData ?? null;
    storeTweet(retweeted, controller);
    return tweetsStore.get(tweetId) ?? null;
  }

  return null;
}

export function getTweetDetail(tweetId: string) {
  const cached = tweetDetailCache.get(tweetId);
  if (!cached) return undefined;
  if (Date.now() - cached.cachedAt > TWEET_DETAIL_TTL_MS) {
    tweetDetailCache.delete(tweetId);
    return undefined;
  }
  return cached.detail;
}

export function cacheTweetDetail(tweetId: string, detail: TweetResponse) {
  tweetDetailCache.set(tweetId, {
    detail,
    cachedAt: Date.now(),
  });
}

export function clearTweetDetail(tweetId: string) {
  tweetDetailCache.delete(tweetId);
}

export function extractTweetFromDetail(
  detail: TweetResponse | undefined,
  tweetId: string
): TweetResult | undefined {
  if (!detail) return undefined;
  const instructions =
    (detail.data?.threaded_conversation_with_injections_v2?.instructions ??
      []) as Instruction[];
  for (const instruction of instructions) {
    if (!instruction || instruction.type !== "TimelineAddEntries") continue;
    const entries = instruction.entries ?? [];
    for (const entry of entries) {
      if (!entry) continue;
      if (entry.entryId === `tweet-${tweetId}`) {
        const direct =
          ((entry.content as {
            itemContent?: { tweet_results?: { result?: TweetResult } };
          } | null | undefined)?.itemContent?.tweet_results as
            | { result?: TweetResult }
            | undefined)?.result;
        if (isTweetResult(direct)) return direct;
      }

      const content = entry.content as TimelineModuleContent | undefined;
      const inlineTweet =
        ((content as {
          itemContent?: { tweet_results?: { result?: TweetResult } };
        } | null | undefined)?.itemContent?.tweet_results as
          | { result?: TweetResult }
          | undefined)?.result;
      if (
        inlineTweet &&
        isTweetResult(inlineTweet) &&
        getTweetIdFromTweet(inlineTweet) === tweetId
      ) {
        return inlineTweet;
      }

      if (content && Array.isArray(content.items)) {
        for (const item of content.items) {
          if (item.item?.itemContent?.promotedMetadata !== undefined) {
            continue;
          }
          const tweet =
            (item?.item?.itemContent?.tweet_results as
              | { result?: TweetResult }
              | undefined)?.result ?? undefined;
          if (
            tweet &&
            isTweetResult(tweet) &&
            getTweetIdFromTweet(tweet) === tweetId
          ) {
            return tweet;
          }
        }
      }
    }
  }
  return undefined;
}

export function applyDetailToTweetCache(
  tweetId: string,
  detail: TweetResponse
) {
  const tweet = extractTweetFromDetail(detail, tweetId);
  if (!tweet) return;
  const existing = tweetsStore.get(tweetId);
  storeTweet(tweet, existing?.controllerData ?? null, true);
}

function analyzeAndCreateRelations(
  tweet: TweetResult,
  refreshRelation: boolean
) {
  const tweetId = getTweetIdFromTweet(tweet);
  if (!tweetId) return;

  if (refreshRelation) {
    tweetsRelationStore.delete(tweetId);
  }

  const replyToId =
    tweet.legacy?.in_reply_to_status_id_str ??
    tweet.legacy?.in_reply_to_tweet_id_str;
  if (replyToId) addBidirectionalRelation(tweetId, replyToId, "reply");

  // 处理引用关系
  const quotedTweet = tweet.quoted_status_result?.result;
  if (quotedTweet && isTweetResult(quotedTweet)) {
    const quotedId = getTweetIdFromTweet(quotedTweet);
    if (quotedId) {
      addBidirectionalRelation(tweetId, quotedId, "quote");
      storeTweet(quotedTweet, null);
    }
  }

  // 处理转推关系
  const retweetedTweet =
    tweet.retweeted_status_result?.result ||
    tweet.legacy?.retweeted_status_result?.result;
  if (retweetedTweet && isTweetResult(retweetedTweet)) {
    const retweetedId = getTweetIdFromTweet(retweetedTweet);
    if (retweetedId) {
      addBidirectionalRelation(tweetId, retweetedId, "retweet");
      // 递归处理被转推的推文
      storeTweet(retweetedTweet, null);
    }
  }
}

function addBidirectionalRelation(
  sourceId: string,
  targetId: string,
  type: "reply" | "quote" | "retweet"
) {
  const sourceRelation = getOrCreateRelation(sourceId);
  const targetRelation = getOrCreateRelation(targetId);

  switch (type) {
    case "reply":
      sourceRelation.replyTo = targetId;
      if (!targetRelation.replies) targetRelation.replies = new Set();
      targetRelation.replies.add(sourceId);
      break;

    case "quote":
      sourceRelation.quote = targetId;
      targetRelation.quoteBy = sourceId;
      break;

    case "retweet":
      sourceRelation.retweet = targetId;
      if (!targetRelation.retweetBy) targetRelation.retweetBy = new Set();
      targetRelation.retweetBy.add(sourceId);
      break;
  }
}

function getOrCreateRelation(tweetId: string): TweetRelation {
  const existing = tweetsRelationStore.get(tweetId);
  if (existing) return existing;

  const newRelation: TweetRelation = {};
  tweetsRelationStore.set(tweetId, newRelation);
  return newRelation;
}
