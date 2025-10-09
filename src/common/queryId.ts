export type TweetQueryOperationKey =
  | "tweet_detail"
  | "tweet_result_by_rest_id"
  | "create_tweet"
  | "favorite"
  | "unfavorite"
  | "retweet"
  | "unretweet"
  | "bookmark"
  | "unbookmark";

export interface TweetQueryOperationConfig {
  /** GraphQL 请求所需的 doc_id。 */
  id: string;
  /** GraphQL operationName，用于组成最终的请求 URL。 */
  operationName: string;
  /** 调用该 GraphQL 接口时使用的 HTTP 方法，默认 POST。 */
  method?: "GET" | "POST";
}

export const TWEET_QUERY_OPERATIONS: Record<
  TweetQueryOperationKey,
  TweetQueryOperationConfig
> = {
  tweet_detail: {
    id: "JgryuItLZQ9V56vHjGIWWw",
    operationName: "TweetDetail",
  },
  tweet_result_by_rest_id: {
    id: "URPP6YZ5eDCjdVMSREn4gg",
    operationName: "TweetResultByRestId",
    method: "GET",
  },
  create_tweet: {
    id: "ZSBCfCefJFumbPcLcwR64Q",
    operationName: "CreateTweet",
  },
  favorite: {
    id: "lI07N6Otwv1PhnEgXILM7A",
    operationName: "FavoriteTweet",
  },
  unfavorite: {
    id: "ZYKSe-w7KEslx3JhSIk5LA",
    operationName: "UnfavoriteTweet",
  },
  retweet: {
    id: "ojPdsZsimiJrUGLR1sjUtA",
    operationName: "CreateRetweet",
  },
  unretweet: {
    id: "iQtK4dl5hBmXewYZuEOKVw",
    operationName: "DeleteRetweet",
  },
  bookmark: {
    id: "aoDbu3RHznuiSkQ9aNM67Q",
    operationName: "CreateBookmark",
  },
  unbookmark: {
    id: "Wlmlj2-xzyS1GN3a6cj-mQ",
    operationName: "DeleteBookmark",
  },
};
