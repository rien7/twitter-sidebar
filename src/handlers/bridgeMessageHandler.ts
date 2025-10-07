import {
  EXT_BRIDGE_SOURCE,
  MESSAGE_DIRECTION_FROM_INTERCEPTOR,
  INTERCEPTOR_EVENT_TYPE_TIMELINE,
  INTERCEPTOR_EVENT_TYPE_DETAIL_RESPONSE,
  INTERCEPTOR_EVENT_TYPE_DETAIL_ERROR,
  INTERCEPTOR_EVENT_TYPE_ACTION_RESPONSE,
  INTERCEPTOR_EVENT_TYPE_ACTION_ERROR,
} from "@/common/bridge";
import { TweetResponse } from "@/types/response";
import { handleTimelineUpdate } from "./timelineUpdateHandler";
import { handleDetailResponse } from "./tweetDetailHandler";
import { handleActionResponse } from "@/api/twitterGraphql";

export const registerBridgeMessageHandler = () => {
  const handleMessage = (event: MessageEvent) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== EXT_BRIDGE_SOURCE) return;
    if (data.direction !== MESSAGE_DIRECTION_FROM_INTERCEPTOR) return;

    switch (data.type) {
      case INTERCEPTOR_EVENT_TYPE_TIMELINE:
        handleTimelineUpdate(data.payload.response as TweetResponse);
        break;
      case INTERCEPTOR_EVENT_TYPE_DETAIL_RESPONSE:
      case INTERCEPTOR_EVENT_TYPE_DETAIL_ERROR:
        handleDetailResponse(data.payload);
        break;
      case INTERCEPTOR_EVENT_TYPE_ACTION_RESPONSE:
        handleActionResponse(data.payload, false);
        break;
      case INTERCEPTOR_EVENT_TYPE_ACTION_ERROR:
        handleActionResponse(data.payload, true);
        break;
      default:
        break;
    }
  };

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
};
