import { buildGraphqlHeaders } from "./headerUtils";
import { ClientTransaction, handleXMigration } from "x-client-transaction-id";
import type { TweetActionRequest } from "@/types/interceptor";

const transaction = (async () => {
  const doc = await handleXMigration();
  const clientTransaction = await ClientTransaction.create(doc);
  return clientTransaction;
})();

/**
 * Execute a tweet action mutation by replaying the latest GraphQL headers and attaching a freshly
 * generated client transaction id.
 */
export const performTweetActionRequest = async ({
  docId,
  operationName,
  variables,
  features,
  method,
  fieldToggles,
}: TweetActionRequest) => {
  const resolvedMethod = (method ?? "POST").toUpperCase() as "GET" | "POST";
  const path = `/i/api/graphql/${docId}/${operationName}`;
  const url = new URL(path, window.location.origin);
  const headers = buildGraphqlHeaders();
  const txn = await transaction;
  const transactionId = await txn.generateTransactionId(
    resolvedMethod,
    path.replace("/i/api", "")
  );
  headers["x-client-transaction-id"] = transactionId;
  const finalHeaders = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    finalHeaders.set(key, value);
  }

  if (resolvedMethod === "GET") {
    url.searchParams.set("variables", JSON.stringify(variables ?? {}));
    if (features && Object.keys(features).length > 0) {
      url.searchParams.set("features", JSON.stringify(features));
    }
    if (fieldToggles && Object.keys(fieldToggles).length > 0) {
      url.searchParams.set("fieldToggles", JSON.stringify(fieldToggles));
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      credentials: "include",
      headers: finalHeaders,
    });

    if (!response.ok) {
      throw new Error(`操作请求失败，状态码 ${response.status}`);
    }

    return response.json();
  }

  const body: Record<string, unknown> = {
    variables,
    queryId: docId,
    queryName: operationName,
    operationName,
  };
  if (features) {
    body.features = features;
  }
  if (fieldToggles) {
    body.fieldToggles = fieldToggles;
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    credentials: "include",
    headers: finalHeaders,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`操作请求失败，状态码 ${response.status}`);
  }

  return response.json();
};
