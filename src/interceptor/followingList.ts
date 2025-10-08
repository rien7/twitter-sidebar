import { buildGraphqlHeaders } from "./headerUtils";
import { ClientTransaction, handleXMigration } from "x-client-transaction-id";
import type { FollowingListRequest } from "@/types/interceptor";

const transaction = (async () => {
  const doc = await handleXMigration();
  const clientTransaction = await ClientTransaction.create(doc);
  return clientTransaction;
})();

const DEFAULT_QUERY_PARAMS: Record<string, string> = {
  include_profile_interstitial_type: "1",
  include_blocking: "1",
  include_blocked_by: "1",
  include_followed_by: "1",
  include_want_retweets: "1",
  include_mute_edge: "1",
  include_can_dm: "1",
  include_can_media_tag: "1",
  include_ext_is_blue_verified: "1",
  include_ext_verified_type: "1",
  include_ext_profile_image_shape: "1",
  skip_status: "1",
  with_total_count: "true",
};

const DEFAULT_COUNT = 3;

export const performFollowingListRequest = async ({
  userId,
  count,
  cursor,
}: FollowingListRequest) => {
  const trimmedUserId = userId?.trim();
  if (!trimmedUserId) {
    throw new Error("缺少用户 ID，无法请求关注列表");
  }

  const headers = buildGraphqlHeaders();
  const finalHeaders = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (!key || !value) continue;
    finalHeaders.set(key, value);
  }

  const path = "/i/api/1.1/friends/following/list.json";
  const url = new URL(path, window.location.origin);
  const searchParams = new URLSearchParams(DEFAULT_QUERY_PARAMS);
  searchParams.set("user_id", trimmedUserId);
  const resolvedCount =
    typeof count === "number" && Number.isFinite(count) ? count : DEFAULT_COUNT;
  searchParams.set("count", String(Math.max(1, Math.floor(resolvedCount))));
  if (cursor && cursor.trim()) {
    searchParams.set("cursor", cursor.trim());
  } else if (!searchParams.has("cursor")) {
    searchParams.set("cursor", "-1");
  }
  url.search = searchParams.toString();

  const txn = await transaction;
  const transactionId = await txn.generateTransactionId(
    "GET",
    path.replace("/i/api", "")
  );
  finalHeaders.set("x-client-transaction-id", transactionId);

  if (!finalHeaders.has("accept")) {
    finalHeaders.set("accept", "*/*");
  }
  if (!finalHeaders.has("x-twitter-active-user")) {
    finalHeaders.set("x-twitter-active-user", "yes");
  }
  if (!finalHeaders.has("x-twitter-auth-type")) {
    finalHeaders.set("x-twitter-auth-type", "OAuth2Session");
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
    headers: finalHeaders,
  });

  if (!response.ok) {
    throw new Error(`关注列表请求失败，状态码 ${response.status}`);
  }

  return response.json();
};
