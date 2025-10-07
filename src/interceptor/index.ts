import { postToContent } from "./messaging";
import { performTweetActionRequest } from "./tweetActions";
import { performTweetDetailRequest } from "./tweetDetailTemplate";
import { installXhrInterceptor } from "./xhrInterceptor";
import {
  CONTENT_EVENT_TYPE_ACTION_REQUEST,
  CONTENT_EVENT_TYPE_DETAIL_REQUEST,
  EXT_BRIDGE_SOURCE,
  INTERCEPTOR_EVENT_TYPE_ACTION_ERROR,
  INTERCEPTOR_EVENT_TYPE_ACTION_RESPONSE,
  INTERCEPTOR_EVENT_TYPE_DETAIL_ERROR,
  INTERCEPTOR_EVENT_TYPE_DETAIL_RESPONSE,
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
});
