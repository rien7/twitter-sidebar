import { buildGraphqlHeaders } from "./headerUtils";
import type { PollVoteRequest } from "@/types/interceptor";

const CARDS_PLATFORM_DEFAULT = "Web-12";

const resolveEndpoint = (rawEndpoint: string) => {
  if (!rawEndpoint) {
    throw new Error("无法解析投票接口地址");
  }
  if (/^https?:\/\//i.test(rawEndpoint)) {
    return rawEndpoint;
  }
  if (rawEndpoint.startsWith("capi://")) {
    const path = rawEndpoint.replace(/^capi:\/\//i, "");
    return `https://caps.x.com/v2/capi/${path}`;
  }
  return new URL(rawEndpoint, window.location.origin).toString();
};

/**
 * 在页面原生上下文中重放投票请求，复用最新的认证头部信息。
 */
export const performPollVoteRequest = async ({
  endpoint,
  cardUri,
  cardName,
  tweetId,
  choiceId,
  cardsPlatform,
}: PollVoteRequest) => {
  const resolvedEndpoint = resolveEndpoint(endpoint);
  const params = new URLSearchParams();
  params.set("twitter:string:card_uri", cardUri);
  params.set("twitter:long:original_tweet_id", tweetId);
  params.set("twitter:string:response_card_name", cardName);
  params.set(
    "twitter:string:cards_platform",
    cardsPlatform || CARDS_PLATFORM_DEFAULT
  );
  params.set("twitter:string:selected_choice", String(choiceId));

  const headers = buildGraphqlHeaders();
  headers["content-type"] = "application/x-www-form-urlencoded";
  delete headers["x-client-transaction-id"];
  delete headers["x-xp-forwarded-for"];

  const finalHeaders = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (!key || !value) continue;
    finalHeaders.set(key, value);
  }

  const response = await fetch(resolvedEndpoint, {
    method: "POST",
    credentials: "include",
    headers: finalHeaders,
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`投票请求失败，状态码 ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (/json/i.test(contentType)) {
    return response.json();
  }
  return response.text();
};
