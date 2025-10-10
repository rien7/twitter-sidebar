/**
 * Metadata we collect while proxying XHR calls so we can replay GraphQL requests later.
 */
export type CapturedRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
};

/**
 * Shape of the payload forwarded from the injected script to the content script for whitelisted
 * requests. The raw response text is preserved for debugging purposes.
 */
export type InterceptorPayload = {
  response: unknown;
  request: CapturedRequest;
  raw: string;
};

/**
 * Handler invoked when a whitelisted request finishes successfully.
 */
export type InterceptorHandler = (payload: InterceptorPayload) => void;

/**
 * Parsed template for the TweetDetail GraphQL call. We reuse this when content requests detail data
 * from the injected context so the calls match the user's latest request parameters.
 */
export type TweetDetailTemplate = {
  url: string;
  method: string;
  headers: Record<string, string>;
  variables: Record<string, unknown>;
  features: Record<string, unknown>;
  fieldToggles: Record<string, unknown>;
};

/**
 * Parameters required to perform a tweet action GraphQL mutation.
 */
export type TweetActionRequest = {
  docId: string;
  operationName: string;
  variables: Record<string, unknown>;
  features?: Record<string, unknown>;
  method?: "GET" | "POST";
  fieldToggles?: Record<string, unknown>;
};

export type FriendshipAction = "follow" | "unfollow";

export type FriendshipRequest = {
 action: FriendshipAction;
 userId: string;
 body: string;
};

export type FollowingListRequest = {
  userId: string;
  count?: number;
  cursor?: string;
};

export type PollVoteRequest = {
  endpoint: string;
  cardUri: string;
  cardName: string;
  tweetId: string;
  choiceId: number;
  cardsPlatform?: string;
};
