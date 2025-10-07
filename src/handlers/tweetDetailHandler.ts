import {
  cacheTweetDetail,
  clearTweetDetail,
  getTweet,
  getTweetDetail,
} from "@/store/tweetsStore";
import { TweetResponse, TimelineAddEntriesInstruction } from "@/types/response";
import {
  CONTENT_EVENT_TYPE_DETAIL_REQUEST,
  EXT_BRIDGE_SOURCE,
  MESSAGE_DIRECTION_TO_INTERCEPTOR,
} from "@common/bridge";
import { handleTimelineUpdate } from "./timelineUpdateHandler";

const pendingDetailRequests = new Map<
  string,
  {
    resolve: (value: TweetResponse) => void;
    reject: (reason?: unknown) => void;
  }
>();

export const requestTweetDetail = async (
  tweetId: string,
  controllerData?: string | null,
  force = false
) => {
  if (!force) {
    const cached = getTweetDetail(tweetId);
    if (cached) return cached;
  } else {
    clearTweetDetail(tweetId);
  }

  const requestId = `${tweetId}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
  if (controllerData === null) {
    controllerData = getTweet(tweetId)?.controllerData;
  }
  const payload = { tweetId, controllerData, requestId };

  const detailPromise = new Promise<TweetResponse>((resolve, reject) => {
    pendingDetailRequests.set(requestId, { resolve, reject });
  });

  window.postMessage(
    {
      source: EXT_BRIDGE_SOURCE,
      direction: MESSAGE_DIRECTION_TO_INTERCEPTOR,
      type: CONTENT_EVENT_TYPE_DETAIL_REQUEST,
      payload,
    },
    "*"
  );

  const result = await detailPromise;
  // Remove promoted tweet
  for (const instruction of result.data
    ?.threaded_conversation_with_injections_v2?.instructions ?? []) {
    if (instruction.type !== "TimelineAddEntries" || !instruction.entries)
      continue;
    const entries = (instruction as TimelineAddEntriesInstruction).entries;
    instruction.entries = entries.filter((e) => {
      if (
        e.content.entryType === "TimelineTimelineItem" &&
        e.content.itemContent.promotedMetadata
      ) {
        return false;
      } else if (
        e.content.entryType === "TimelineTimelineModule" &&
        e.content.items
      ) {
        e.content.items = e.content.items.filter(
          (i) => !i.item?.itemContent?.promotedMetadata
        );
      }
      return true;
    });
  }
  cacheTweetDetail(tweetId, result);
  handleTimelineUpdate(result, tweetId);
  return result;
};

/**
 * Resolve (or reject) the promise that initiated a TweetDetail request.
 */
export const handleDetailResponse = (payload: {
  requestId: string;
  data?: TweetResponse;
  error?: string;
}) => {
  const resolver = pendingDetailRequests.get(payload.requestId);
  if (!resolver) return;
  pendingDetailRequests.delete(payload.requestId);
  if (payload.error) {
    resolver.reject(new Error(payload.error));
  } else {
    resolver.resolve(payload.data as TweetResponse);
  }
};
