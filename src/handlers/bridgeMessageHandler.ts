import {
  EXT_BRIDGE_SOURCE,
  MESSAGE_DIRECTION_FROM_INTERCEPTOR,
  INTERCEPTOR_EVENT_TYPE_TIMELINE,
  INTERCEPTOR_EVENT_TYPE_DETAIL_RESPONSE,
  INTERCEPTOR_EVENT_TYPE_DETAIL_ERROR,
  INTERCEPTOR_EVENT_TYPE_ACTION_RESPONSE,
  INTERCEPTOR_EVENT_TYPE_ACTION_ERROR,
  INTERCEPTOR_EVENT_TYPE_POLL_VOTE_RESPONSE,
  INTERCEPTOR_EVENT_TYPE_POLL_VOTE_ERROR,
  INTERCEPTOR_EVENT_TYPE_FRIENDSHIP_RESPONSE,
  INTERCEPTOR_EVENT_TYPE_FRIENDSHIP_ERROR,
  INTERCEPTOR_EVENT_TYPE_FOLLOWING_LIST_RESPONSE,
  INTERCEPTOR_EVENT_TYPE_FOLLOWING_LIST_ERROR,
  INTERCEPTOR_EVENT_TYPE_UPLOAD_RESPONSE,
  INTERCEPTOR_EVENT_TYPE_UPLOAD_ERROR,
  INTERCEPTOR_EVENT_TYPE_UPLOAD_PROGRESS,
} from "@/common/bridge";
import { TweetResponse } from "@/types/response";
import { handleTimelineUpdate } from "./timelineUpdateHandler";
import { handleDetailResponse } from "./tweetDetailHandler";
import { handleActionResponse } from "@/api/twitterGraphql";
import { handleFriendshipResponse } from "@/api/friendships";
import { handleFollowingListResponse } from "@/api/followingList";
import {
  handleUploadError,
  handleUploadProgress,
  handleUploadSuccess,
} from "@/api/twitterUpload";
import { handlePollVoteResponse } from "@/api/twitterPoll";

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
      case INTERCEPTOR_EVENT_TYPE_POLL_VOTE_RESPONSE:
        handlePollVoteResponse(data.payload, false);
        break;
      case INTERCEPTOR_EVENT_TYPE_POLL_VOTE_ERROR:
        handlePollVoteResponse(data.payload, true);
        break;
      case INTERCEPTOR_EVENT_TYPE_FRIENDSHIP_RESPONSE:
        handleFriendshipResponse(data.payload, false);
        break;
      case INTERCEPTOR_EVENT_TYPE_FRIENDSHIP_ERROR:
        handleFriendshipResponse(data.payload, true);
        break;
      case INTERCEPTOR_EVENT_TYPE_FOLLOWING_LIST_RESPONSE:
        handleFollowingListResponse(data.payload, false);
        break;
      case INTERCEPTOR_EVENT_TYPE_FOLLOWING_LIST_ERROR:
        handleFollowingListResponse(data.payload, true);
        break;
      case INTERCEPTOR_EVENT_TYPE_UPLOAD_PROGRESS:
        handleUploadProgress(data.payload);
        break;
      case INTERCEPTOR_EVENT_TYPE_UPLOAD_RESPONSE:
        handleUploadSuccess(data.payload);
        break;
      case INTERCEPTOR_EVENT_TYPE_UPLOAD_ERROR:
        handleUploadError(data.payload);
        break;
      default:
        break;
    }
  };

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
};
