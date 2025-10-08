import { postToContent } from "./messaging";
import { performTweetActionRequest } from "./tweetActions";
import { performTweetDetailRequest } from "./tweetDetailTemplate";
import { installXhrInterceptor } from "./xhrInterceptor";
import { performFriendshipRequest } from "./friendships";
import { performFollowingListRequest } from "./followingList";
import {
  CONTENT_EVENT_TYPE_ACTION_REQUEST,
  CONTENT_EVENT_TYPE_DETAIL_REQUEST,
  CONTENT_EVENT_TYPE_FRIENDSHIP_REQUEST,
  CONTENT_EVENT_TYPE_FOLLOWING_LIST_REQUEST,
  EXT_BRIDGE_SOURCE,
  INTERCEPTOR_EVENT_TYPE_ACTION_ERROR,
  INTERCEPTOR_EVENT_TYPE_ACTION_RESPONSE,
  INTERCEPTOR_EVENT_TYPE_DETAIL_ERROR,
  INTERCEPTOR_EVENT_TYPE_DETAIL_RESPONSE,
  INTERCEPTOR_EVENT_TYPE_FRIENDSHIP_ERROR,
  INTERCEPTOR_EVENT_TYPE_FRIENDSHIP_RESPONSE,
  INTERCEPTOR_EVENT_TYPE_FOLLOWING_LIST_ERROR,
  INTERCEPTOR_EVENT_TYPE_FOLLOWING_LIST_RESPONSE,
  MESSAGE_DIRECTION_TO_INTERCEPTOR,
} from "@common/bridge";

installXhrInterceptor();

window.addEventListener("message", async (event: MessageEvent) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== EXT_BRIDGE_SOURCE) return;
  if (data.direction !== MESSAGE_DIRECTION_TO_INTERCEPTOR) return;

  if (data.type === CONTENT_EVENT_TYPE_DETAIL_REQUEST) {
    const payload = data.payload as {
      tweetId?: string;
      controllerData?: string | null;
      requestId?: string;
    };
    if (!payload?.tweetId || !payload.requestId) return;
    try {
      const detail = await performTweetDetailRequest(
        payload.tweetId,
        payload.controllerData
      );
      postToContent(INTERCEPTOR_EVENT_TYPE_DETAIL_RESPONSE, {
        requestId: payload.requestId,
        data: detail,
      });
    } catch (error) {
      postToContent(INTERCEPTOR_EVENT_TYPE_DETAIL_ERROR, {
        requestId: payload.requestId,
        error:
          error instanceof Error ? error.message : String(error ?? "未知错误"),
      });
    }
    return;
  }

  if (data.type === CONTENT_EVENT_TYPE_ACTION_REQUEST) {
    const payload = data.payload as {
      requestId?: string;
      docId?: string;
      operationName?: string;
      variables?: Record<string, unknown>;
      features?: Record<string, unknown>;
      method?: "GET" | "POST";
      fieldToggles?: Record<string, unknown>;
    };
    if (!payload?.requestId || !payload.docId || !payload.operationName) return;

    try {
      const result = await performTweetActionRequest({
        docId: payload.docId,
        operationName: payload.operationName,
        variables: payload.variables ?? {},
        features: payload.features ?? undefined,
        method: payload.method ?? undefined,
        fieldToggles: payload.fieldToggles ?? undefined,
      });
      postToContent(INTERCEPTOR_EVENT_TYPE_ACTION_RESPONSE, {
        requestId: payload.requestId,
        data: result,
      });
    } catch (error) {
      postToContent(INTERCEPTOR_EVENT_TYPE_ACTION_ERROR, {
        requestId: payload.requestId,
        error:
          error instanceof Error ? error.message : String(error ?? "未知错误"),
      });
    }
  }

  if (data.type === CONTENT_EVENT_TYPE_FRIENDSHIP_REQUEST) {
    const payload = data.payload as {
      requestId?: string;
      action?: "follow" | "unfollow";
      userId?: string;
      body?: string;
    };
    if (!payload?.requestId || !payload.action || !payload.userId || !payload.body)
      return;

    try {
      const result = await performFriendshipRequest({
        action: payload.action,
        userId: payload.userId,
        body: payload.body,
      });
      postToContent(INTERCEPTOR_EVENT_TYPE_FRIENDSHIP_RESPONSE, {
        requestId: payload.requestId,
        data: result,
        action: payload.action,
        userId: payload.userId,
      });
    } catch (error) {
      postToContent(INTERCEPTOR_EVENT_TYPE_FRIENDSHIP_ERROR, {
        requestId: payload.requestId,
        error:
          error instanceof Error ? error.message : String(error ?? "未知错误"),
      });
    }
  }

  if (data.type === CONTENT_EVENT_TYPE_FOLLOWING_LIST_REQUEST) {
    const payload = data.payload as {
      requestId?: string;
      userId?: string;
      count?: number;
      cursor?: string;
    };
    if (!payload?.requestId || !payload.userId) return;

    try {
      const result = await performFollowingListRequest({
        userId: payload.userId,
        count: payload.count,
        cursor: payload.cursor,
      });
      postToContent(INTERCEPTOR_EVENT_TYPE_FOLLOWING_LIST_RESPONSE, {
        requestId: payload.requestId,
        data: result,
        userId: payload.userId,
        count: payload.count,
        cursor: payload.cursor,
      });
    } catch (error) {
      postToContent(INTERCEPTOR_EVENT_TYPE_FOLLOWING_LIST_ERROR, {
        requestId: payload.requestId,
        error:
          error instanceof Error ? error.message : String(error ?? "未知错误"),
      });
    }
  }
});
