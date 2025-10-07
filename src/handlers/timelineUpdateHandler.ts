import { storeTweet } from "@/store/tweetsStore";
import {
  TweetResponse,
  Entry,
  ItemContent,
  TweetResult,
} from "@/types/response";
import { isTweetResult, selectControllerData } from "@/utils/responseData";
import {
  isTimelineItemContent,
  isTimelineModuleContent,
  extractTimelineInstructions,
} from "@/utils/timelineData";

const processTimelineEntry = (
  entry: Entry | undefined,
  refreshRelation: boolean = false
) => {
  if (!entry) return;
  const content = entry.content;

  if (isTimelineItemContent(content)) {
    const tweet = (
      content.itemContent?.tweet_results as { result?: TweetResult } | undefined
    )?.result;
    if (!isTweetResult(tweet)) return;

    const controllerData = selectControllerData(
      content.clientEventInfo,
      entry.clientEventInfo
    );
    storeTweet(tweet, controllerData, refreshRelation);
    return;
  }

  if (!isTimelineModuleContent(content)) return;

  content.items?.forEach((item) => {
    if (!item) return;
    const nestedItemContent = item.item?.itemContent as ItemContent | undefined;
    const tweet = (
      nestedItemContent?.tweet_results as { result?: TweetResult } | undefined
    )?.result;
    if (!isTweetResult(tweet)) return;

    const controllerData = selectControllerData(
      item.item?.clientEventInfo,
      item.clientEventInfo,
      content.clientEventInfo,
      entry.clientEventInfo
    );

    storeTweet(tweet, controllerData);
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
    switch (instruction.type) {
      case "TimelineAddEntries":
        instruction.entries?.forEach((entry) =>
          processTimelineEntry(entry, entry.entryId === `tweet-${baseTweetId}`)
        );
        break;
      case "TimelinePinEntry":
        processTimelineEntry(
          instruction.entry,
          instruction.entry?.entryId === `tweet-${baseTweetId}`
        );
        break;
      default:
        break;
    }
  });
};
