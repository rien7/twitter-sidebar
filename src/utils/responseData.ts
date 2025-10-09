import { MediaOverlayItem } from "@/types/mediaOverlay";
import {
  MediaEntity,
  TweetLimitedAction,
  TweetResult,
  TweetResultByRestIdResponse,
  TweetTombstone,
  TweetWithVisibilityResults,
  UserResult,
} from "@/types/response";
import { getHighResolutionUrl, selectVideoVariant } from "./media";

export type NormalizedTweetResult = {
  tweet: TweetResult;
  limitedActions?: TweetLimitedAction[] | null;
};

export function normalizeTweetResult(
  value: unknown
): NormalizedTweetResult | null {
  if (!value || typeof value !== "object") return null;

  if (
    (value as TweetResult).__typename === "Tweet" &&
    getTweetIdFromTweet(value as TweetResult)
  ) {
    return { tweet: value as TweetResult, limitedActions: undefined };
  }

  const visibilityWrapper = value as TweetWithVisibilityResults;
  if (visibilityWrapper?.__typename === "TweetWithVisibilityResults") {
    const inner = visibilityWrapper.tweet;
    if (inner && getTweetIdFromTweet(inner as TweetResult)) {
      return {
        tweet: inner as TweetResult,
        limitedActions:
          visibilityWrapper.limitedActionResults?.limited_actions ?? null,
      };
    }
  }

  return null;
}

export function unwrapTweetResult(
  value: TweetResult | TweetWithVisibilityResults | null | undefined
): TweetResult | null {
  const normalized = normalizeTweetResult(value);
  return normalized?.tweet ?? null;
}

export function isTweetResult(value: unknown): value is TweetResult {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as TweetResult).__typename === "Tweet" &&
      getTweetIdFromTweet(value as TweetResult)
  );
}

export function isTweetTombstone(value: unknown): value is TweetTombstone {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as TweetTombstone).__typename === "TweetTombstone"
  );
}

/* --------------- From TweetResult -------------- */

export function getUserFromTweet(tweet: TweetResult) {
  const user = tweet.core?.user_results?.result;
  if (!user || (user as { __typename?: string }).__typename !== "User") {
    return null;
  }
  return user as UserResult;
}

export function getUserIdFromTweet(
  tweet: TweetResult,
  user?: UserResult | null
): string | null {
  if (user?.rest_id) return user.rest_id;
  if (tweet.legacy?.user_id_str) return tweet.legacy.user_id_str;
  if (user?.id) return user.id;
  if (tweet.core?.user_results?.result?.rest_id)
    return tweet.core.user_results.result.rest_id;
  return null;
}

export function getTweetIdFromTweet(tweet?: TweetResult | null): string | null {
  if (!tweet) return null;
  return tweet.rest_id ?? tweet.legacy?.id_str ?? null;
}

export function getParentTweetIdFromTweet(
  tweet?: TweetResult | null
): string | null {
  if (!tweet) return null;
  const legacy = tweet.legacy as
    | {
        in_reply_to_status_id_str?: string | null;
        in_reply_to_tweet_id_str?: string | null;
      }
    | undefined;
  if (!legacy) return null;
  return (
    legacy.in_reply_to_status_id_str ?? legacy.in_reply_to_tweet_id_str ?? null
  );
}

/**
 * 从 TweetResult 中提取媒体列表，优先 extended_entities，然后回退到 entities。
 */
export const extractTweetMedia = (tweet: TweetResult): MediaEntity[] => {
  const legacy = tweet.legacy as
    | {
        extended_entities?: { media?: MediaEntity[] };
        entities?: { media?: MediaEntity[] };
      }
    | undefined;
  const fromExtended = legacy?.extended_entities?.media ?? [];
  if (fromExtended.length > 0) return fromExtended;
  return legacy?.entities?.media ?? [];
};

/**
 * 将 TweetResult 中的媒体转换成 MediaOverlayItem 列表，便于外部直接打开媒体预览。
 */
export const buildMediaOverlayItemsFromTweet = (
  tweet: TweetResult
): MediaOverlayItem[] => {
  const media = extractTweetMedia(tweet);
  return media
    .map((entity, index) => {
      if (entity.type === "photo") {
        const typed = entity as MediaEntity & { ext_alt_text?: string };
        const background =
          typed.media_url_https ?? typed.expanded_url ?? typed.url;
        if (!background) return null;
        const highRes = getHighResolutionUrl(background);
        const altText = typed.ext_alt_text ?? typed.media_key ?? "tweet media";
        const key = entity.media_key ?? `${entity.id_str}-${index}`;
        return {
          kind: "photo",
          key,
          previewSrc: background,
          fullSrc: highRes !== background ? highRes : undefined,
          alt: altText,
        } as MediaOverlayItem;
      }

      if (entity.type === "video" || entity.type === "animated_gif") {
        const variantSource = selectVideoVariant(entity);
        const key = entity.media_key ?? `${entity.id_str}-${index}`;
        return {
          kind: "video",
          key,
          alt: "tweet media",
          poster: entity.media_url_https ?? entity.expanded_url ?? undefined,
          source: variantSource ?? null,
          isGif: entity.type === "animated_gif",
        } as MediaOverlayItem;
      }

      return null;
    })
    .filter((item): item is MediaOverlayItem => Boolean(item));
};

export function getAvatarFromUser(user?: UserResult | null): string | null {
  if (!user) return null;
  return (
    user.legacy?.profile_image_url_https ??
    user.legacy?.profile_image_url ??
    user.avatar?.image_url ??
    null
  );
}

export function getBlueVerified(user: UserResult | null | undefined) {
  if (user?.is_blue_verified) return true;
  return false;
}

export function getProtected(user: UserResult | null | undefined) {
  if (user?.privacy?.protected) return true;
  return false;
}

export function getTweetFromResultResponse(
  response: TweetResultByRestIdResponse | null | undefined
): TweetResult | null {
  if (!response?.data) return null;
  const candidate =
    response.data.tweetResult?.result ??
    response.data.tweetResultByRestId?.result ??
    response.data.tweet?.result ??
    null;
  const normalized = normalizeTweetResult(candidate);
  return normalized?.tweet ?? null;
}

export function selectControllerData(
  ...sources: Array<
    | null
    | undefined
    | {
        details?: {
          timelinesDetails?: {
            controllerData?: string | null;
          };
        };
      }
  >
): string | null {
  for (const source of sources) {
    const controllerData = source?.details?.timelinesDetails?.controllerData;
    if (controllerData) {
      return controllerData;
    }
  }
  return null;
} 
