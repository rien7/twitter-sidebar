import { storeTweet, storeDeletedTweet } from "@/store/tweetsStore";
import {
  TweetResponse,
  Entry,
  ItemContent,
  TweetResult,
  TweetTombstone,
} from "@/types/response";
import {
  getTweetIdFromTweet,
  isTweetResult,
  isTweetTombstone,
  selectControllerData,
} from "@/utils/responseData";
import {
  isTimelineItemContent,
  isTimelineModuleContent,
  extractTimelineInstructions,
} from "@/utils/timelineData";

type TimelineContext = {
  lastActualTweetId: string | null;
};

const extractTweetIdFromEntry = (entryId: string | undefined) => {
  if (!entryId) return null;
  if (!entryId.startsWith("tweet-")) return null;
  return entryId.slice("tweet-".length);
};

const handleTweetLikeResult = (
  result: TweetResult | TweetTombstone | undefined,
  context: TimelineContext,
  options: {
    entryId?: string;
    controllerData?: string | null;
    refreshRelation?: boolean;
  }
) => {
  if (!result) return;

  if (isTweetResult(result)) {
    storeTweet(
      result,
      options.controllerData ?? null,
      options.refreshRelation ?? false
    );
    const tweetId = getTweetIdFromTweet(result);
    if (tweetId) {
      context.lastActualTweetId = tweetId;
    }
    return;
  }

  if (isTweetTombstone(result)) {
    const tombstoneId = extractTweetIdFromEntry(options.entryId);
    if (!tombstoneId) return;
    const parentTweetId = context.lastActualTweetId ?? null;
    storeDeletedTweet(tombstoneId, result, parentTweetId);
  }
};

const processTimelineEntry = (
  entry: Entry | undefined,
  context: TimelineContext,
  refreshRelation: boolean = false
) => {
  if (!entry) return;
  const content = entry.content;

  if (isTimelineItemContent(content)) {
    const result = (
      content.itemContent?.tweet_results as {
        result?: TweetResult | TweetTombstone;
      } | null
    )?.result;

    const controllerData = selectControllerData(
      content.clientEventInfo,
      entry.clientEventInfo
    );

    handleTweetLikeResult(result, context, {
      entryId: entry.entryId,
      controllerData,
      refreshRelation,
    });

    return;
  }

  if (!isTimelineModuleContent(content)) return;

  content.items?.forEach((item) => {
    if (!item) return;
    const nestedItemContent = item.item?.itemContent as ItemContent | undefined;
    const result = (
      nestedItemContent?.tweet_results as {
        result?: TweetResult | TweetTombstone;
      } | null
    )?.result;

    const controllerData = selectControllerData(
      item.item?.clientEventInfo,
      item.clientEventInfo,
      content.clientEventInfo,
      entry.clientEventInfo
    );

    handleTweetLikeResult(result, context, {
      entryId: item.entryId ?? entry.entryId,
      controllerData,
      refreshRelation: false,
    });
  });
};

/**
 * Handle a captured timeline GraphQL response by caching every tweet we can find.
 */
export const handleTimelineUpdate = (
  response: TweetResponse,
  baseTweetId?: string
) => {
  const instructions = extractTimelineInstructions(response);
  instructions.forEach((instruction) => {
    if (!instruction) return;
    const context: TimelineContext = { lastActualTweetId: null };
    switch (instruction.type) {
      case "TimelineAddEntries":
        instruction.entries?.forEach((entry) =>
          processTimelineEntry(
            entry,
            context,
            entry.entryId === `tweet-${baseTweetId}`
          )
        );
        break;
      case "TimelinePinEntry":
        processTimelineEntry(
          instruction.entry,
          context,
          instruction.entry?.entryId === `tweet-${baseTweetId}`
        );
        break;
      default:
        break;
    }
  });
};
