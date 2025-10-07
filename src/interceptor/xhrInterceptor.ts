import {
  sanitizeHeaders,
  sanitizeRequest,
  setLatestGraphqlHeaders,
} from "./headerUtils";
import { postToContent } from "./messaging";
import { updateTweetDetailTemplate } from "./tweetDetailTemplate";
import { INTERCEPTOR_EVENT_TYPE_TIMELINE } from "@/common/bridge";
import type {
  CapturedRequest,
  InterceptorHandler,
  InterceptorPayload,
} from "@/types/interceptor";
import type { TweetResponse } from "#/response";

const xhrStore = new WeakMap<
  XMLHttpRequest,
  CapturedRequest & { handler?: InterceptorHandler }
>();

const WHITELIST: { regex: RegExp; handler: InterceptorHandler }[] = [
  {
    regex: /\/i\/api\/graphql\/[^/]+\/HomeTimeline/i,
    handler: (payload: InterceptorPayload) => {
      const data = payload.response as TweetResponse;
      const sanitizedRequest = sanitizeRequest(payload.request);
      setLatestGraphqlHeaders(sanitizedRequest.headers);
      postToContent(INTERCEPTOR_EVENT_TYPE_TIMELINE, {
        response: data,
        request: sanitizedRequest,
      });
    },
  },
  {
    regex: /\/i\/api\/graphql\/[^/]+\/SearchTimeline/i,
    handler: (payload: InterceptorPayload) => {
      const data = payload.response as TweetResponse;
      const sanitizedRequest = sanitizeRequest(payload.request);
      setLatestGraphqlHeaders(sanitizedRequest.headers);
      postToContent(INTERCEPTOR_EVENT_TYPE_TIMELINE, {
        response: data,
        request: sanitizedRequest,
      });
    },
  },
  {
    regex: /\/i\/api\/graphql\/[^/]+\/HomeLatestTimeline/i,
    handler: (payload: InterceptorPayload) => {
      const data = payload.response as TweetResponse;
      const sanitizedRequest = sanitizeRequest(payload.request);
      setLatestGraphqlHeaders(sanitizedRequest.headers);
      postToContent(INTERCEPTOR_EVENT_TYPE_TIMELINE, {
        response: data,
        request: sanitizedRequest,
      });
    },
  },
  {
    regex: /\/i\/api\/graphql\/[^/]+\/UserTweets/i,
    handler: (payload: InterceptorPayload) => {
      const data = payload.response as TweetResponse;
      const sanitizedRequest = sanitizeRequest(payload.request);
      setLatestGraphqlHeaders(sanitizedRequest.headers);
      postToContent(INTERCEPTOR_EVENT_TYPE_TIMELINE, {
        response: data,
        request: sanitizedRequest,
      });
    },
  },
  {
    regex: /\/i\/api\/graphql\/[^/]+\/TweetDetail/i,
    handler: (payload: InterceptorPayload) => {
      setLatestGraphqlHeaders(sanitizeHeaders(payload.request.headers));
      updateTweetDetailTemplate(payload.request);
    },
  },
];

const isWhitelisted = (url: string): InterceptorHandler | undefined => {
  for (const w of WHITELIST) {
    if (w.regex.test(url)) return w.handler;
  }
  return undefined;
};

let installed = false;

/**
 * Patch XMLHttpRequest so we can observe GraphQL responses directly in the page context.
 */
export const installXhrInterceptor = () => {
  if (installed) return;
  installed = true;

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  const origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function (method: string, url: string | URL) {
    const urlStr = typeof url === "string" ? url : String(url);
    const handler = isWhitelisted(urlStr);
    const request: CapturedRequest & { handler?: InterceptorHandler } = {
      url: urlStr,
      method: method?.toUpperCase?.() ?? method ?? "GET",
      headers: {},
      handler,
    };
    xhrStore.set(this, request);
    origOpen.call(this, method, url as string | URL, true);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (
    header: string,
    value: string
  ) {
    const meta = xhrStore.get(this);
    if (meta) {
      meta.headers[header] = value;
    }
    return origSetRequestHeader.apply(this, [header, value]);
  };

  XMLHttpRequest.prototype.send = function (
    body?: Document | XMLHttpRequestBodyInit | null | undefined
  ) {
    const meta = xhrStore.get(this);
    if (meta) {
      if (typeof body === "string") {
        meta.body = body;
      } else if (body && typeof body.toString === "function") {
        meta.body = body.toString();
      }
    }

    const handler = meta?.handler;
    if (handler) {
      this.addEventListener("load", function () {
        try {
          const status = this.status;
          if (typeof status !== "number" || status < 200 || status >= 300)
            return;

          const responseText = this.responseText ?? "";
          const contentType = this.getResponseHeader("content-type") || "";
          let parsed = responseText;
          if (
            /application\/json|application\/.*\+json|text\/json/i.test(
              contentType
            )
          ) {
            try {
              parsed = responseText ? JSON.parse(responseText) : {};
            } catch (error) {
              console.warn("[TSB][XHR] JSON 解析失败，返回原始文本", error);
            }
          }

          const stored = xhrStore.get(this as XMLHttpRequest);
          if (!stored) return;
          const requestClone: CapturedRequest = {
            url: stored.url,
            method: stored.method,
            headers: { ...stored.headers },
            body: stored.body,
          };
          setLatestGraphqlHeaders(sanitizeHeaders(stored.headers));
          handler({
            response: parsed,
            request: requestClone,
            raw: responseText,
          });
        } catch (error) {
          console.warn("[TSB][XHR] 处理响应失败", error);
        }
      });
    }

    return origSend.apply(this, [body]);
  };
};
