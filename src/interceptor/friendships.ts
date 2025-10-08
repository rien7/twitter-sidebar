import { buildGraphqlHeaders } from "./headerUtils";
import { ClientTransaction, handleXMigration } from "x-client-transaction-id";
import type { FriendshipRequest } from "@/types/interceptor";

const transaction = (async () => {
  const doc = await handleXMigration();
  const clientTransaction = await ClientTransaction.create(doc);
  return clientTransaction;
})();

const ENDPOINTS: Record<FriendshipRequest["action"], string> = {
  follow: "/i/api/1.1/friendships/create.json",
  unfollow: "/i/api/1.1/friendships/destroy.json",
};

/**
 * Replays the follow/unfollow REST API call with the freshest headers from live traffic.
 */
export const performFriendshipRequest = async ({
  action,
  body,
}: FriendshipRequest) => {
  const path = ENDPOINTS[action];
  if (!path) {
    throw new Error(`未知的关注操作：${action}`);
  }

  const headers = buildGraphqlHeaders();
  const finalHeaders = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (!key || !value) continue;
    finalHeaders.set(key, value);
  }

  finalHeaders.set(
    "content-type",
    "application/x-www-form-urlencoded; charset=UTF-8"
  );
  finalHeaders.set("accept", "application/json, text/plain, */*");

  const txn = await transaction;
  const transactionId = await txn.generateTransactionId(
    "POST",
    path.replace("/i/api", "")
  );
  finalHeaders.set("x-client-transaction-id", transactionId);

  if (!finalHeaders.has("x-twitter-auth-type")) {
    finalHeaders.set("x-twitter-auth-type", "OAuth2Session");
  }
  if (!finalHeaders.has("x-twitter-active-user")) {
    finalHeaders.set("x-twitter-active-user", "yes");
  }

  const url = new URL(path, window.location.origin);

  const response = await fetch(url.toString(), {
    method: "POST",
    credentials: "include",
    headers: finalHeaders,
    body,
  });

  if (!response.ok) {
    throw new Error(`关注操作失败，状态码 ${response.status}`);
  }

  return response.json();
};
