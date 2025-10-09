import {
  Instruction,
  TimelineModuleContent,
  TweetLimitedAction,
  TweetResponse,
  TweetResult,
  TweetTombstone,
  TweetWithVisibilityResults,
} from "@/types/response";
import { TweetData, TweetRelation } from "@/types/tweet";
import {
  getTweetIdFromTweet,
  NormalizedTweetResult,
  normalizeTweetResult,
} from "@/utils/responseData";
import { rememberUserAvatarFromTweet } from "./avatarStore";

const tweetsStore = new Map<string, TweetData>();
const tweetsRelationStore = new Map<string, TweetRelation>();

const TWEET_DETAIL_TTL_MS = 60_000;

type CachedTweetDetail = {
  detail: TweetResponse;
  cachedAt: number;
};

const tweetDetailCache = new Map<string, CachedTweetDetail>();

export interface DeletedTweetData {
  tweetId: string;
  parentTweetId: string | null;
  tombstone: TweetTombstone;
  recordedAt: number;
}

const deletedTweetStore = new Map<string, DeletedTweetData>();

export function storeTweet(
  tweet: TweetResult,
  controllerData: string | null,
  refreshRelation: boolean = false,
  limitedActions?: TweetLimitedAction[] | null
) {
  const tweetId = getTweetIdFromTweet(tweet);
  if (!tweetId) return;
  const previous = tweetsStore.get(tweetId);
  const resolvedControllerData =
    controllerData ?? previous?.controllerData ?? null;
  const resolvedLimitedActions =
    limitedActions === undefined
      ? previous?.limitedActions ?? null
      : limitedActions ?? null;
  tweetsStore.set(tweetId, {
    result: tweet,
    controllerData: resolvedControllerData,
    limitedActions: resolvedLimitedActions ?? null,
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
    const directRetweeted = normalizeTweetResult(
      candidate.result.retweeted_status_result?.result
    );
    const legacyRetweeted = normalizeTweetResult(
      (
        candidate.result.legacy as
          | {
              retweeted_status_result?: {
                result?: TweetResult | TweetWithVisibilityResults;
              };
            }
          | undefined
      )?.retweeted_status_result?.result
    );
    const retweetedNormalized = directRetweeted ?? legacyRetweeted;

    if (!retweetedNormalized) {
      continue;
    }

    const retweeted = retweetedNormalized.tweet;
    const retweetedId = getTweetIdFromTweet(retweeted);
    if (!retweetedId || retweetedId !== tweetId) {
      continue;
    }

    const controller = candidate.controllerData ?? null;
    storeTweet(
      retweeted,
      controller,
      false,
      retweetedNormalized.limitedActions ?? undefined
    );
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
): NormalizedTweetResult | undefined {
  if (!detail) return undefined;
  const instructions = (detail.data?.threaded_conversation_with_injections_v2
    ?.instructions ?? []) as Instruction[];
  for (const instruction of instructions) {
    if (!instruction || instruction.type !== "TimelineAddEntries") continue;
    const entries = instruction.entries ?? [];
    for (const entry of entries) {
      if (!entry) continue;
      if (entry.entryId === `tweet-${tweetId}`) {
        const direct = (
          (
            entry.content as
              | {
                  itemContent?: {
                    tweet_results?: {
                      result?:
                        | TweetResult
                        | TweetWithVisibilityResults
                        | TweetTombstone;
                    };
                  };
                }
              | null
              | undefined
          )?.itemContent?.tweet_results as
            | {
                result?:
                  | TweetResult
                  | TweetWithVisibilityResults
                  | TweetTombstone;
              }
            | undefined
        )?.result;
        const normalizedDirect = normalizeTweetResult(direct);
        if (normalizedDirect) return normalizedDirect;
      }

      const content = entry.content as TimelineModuleContent | undefined;
      const inlineTweet = (
        (
          content as
            | {
                itemContent?: {
                  tweet_results?: {
                    result?:
                      | TweetResult
                      | TweetWithVisibilityResults
                      | TweetTombstone;
                  };
                };
              }
            | null
            | undefined
        )?.itemContent?.tweet_results as
          | {
              result?:
                | TweetResult
                | TweetWithVisibilityResults
                | TweetTombstone;
            }
          | undefined
      )?.result;
      const normalizedInline = normalizeTweetResult(inlineTweet);
      if (
        normalizedInline &&
        getTweetIdFromTweet(normalizedInline.tweet) === tweetId
      ) {
        return normalizedInline;
      }

      if (content && Array.isArray(content.items)) {
        for (const item of content.items) {
          if (item.item?.itemContent?.promotedMetadata !== undefined) {
            continue;
          }
          const tweet =
            (
              item?.item?.itemContent?.tweet_results as
                | {
                    result?:
                      | TweetResult
                      | TweetWithVisibilityResults
                      | TweetTombstone;
                  }
                | undefined
            )?.result ?? undefined;
          const normalizedNested = normalizeTweetResult(tweet);
          if (
            normalizedNested &&
            getTweetIdFromTweet(normalizedNested.tweet) === tweetId
          ) {
            return normalizedNested;
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
  const normalized = extractTweetFromDetail(detail, tweetId);
  if (!normalized) return;
  const existing = tweetsStore.get(tweetId);
  storeTweet(
    normalized.tweet,
    existing?.controllerData ?? null,
    true,
    normalized.limitedActions ?? undefined
  );
}

export function storeDeletedTweet(
  tweetId: string,
  tombstone: TweetTombstone,
  parentTweetId: string | null
) {
  deletedTweetStore.set(tweetId, {
    tweetId,
    parentTweetId,
    tombstone,
    recordedAt: Date.now(),
  });
}

export function getDeletedTweet(tweetId: string) {
  return deletedTweetStore.get(tweetId);
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
  const quotedNormalized = normalizeTweetResult(
    tweet.quoted_status_result?.result
  );
  if (quotedNormalized) {
    const quotedTweet = quotedNormalized.tweet;
    const quotedId = getTweetIdFromTweet(quotedTweet);
    if (quotedId) {
      addBidirectionalRelation(tweetId, quotedId, "quote");
      storeTweet(
        quotedTweet,
        null,
        false,
        quotedNormalized.limitedActions ?? undefined
      );
    }
  }

  // 处理转推关系
  const directRetweeted = normalizeTweetResult(
    tweet.retweeted_status_result?.result
  );
  const legacyRetweeted = normalizeTweetResult(
    (
      tweet.legacy as
        | {
            retweeted_status_result?: {
              result?: TweetResult | TweetWithVisibilityResults;
            };
          }
        | undefined
    )?.retweeted_status_result?.result
  );
  const retweetedNormalized = directRetweeted ?? legacyRetweeted;
  if (retweetedNormalized) {
    const retweetedTweet = retweetedNormalized.tweet;
    const retweetedId = getTweetIdFromTweet(retweetedTweet);
    if (retweetedId) {
      addBidirectionalRelation(tweetId, retweetedId, "retweet");
      // 递归处理被转推的推文
      storeTweet(
        retweetedTweet,
        null,
        false,
        retweetedNormalized.limitedActions ?? undefined
      );
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
