import { TweetResult, TweetLimitedAction } from "./response";

export interface TweetRelation {
  replies?: Set<string>;
  replyTo?: string;
  quote?: string;
  quoteBy?: string;
  retweet?: string;
  retweetBy?: Set<string>;
}

export interface TweetData {
  result: TweetResult;
  controllerData: string | null;
  limitedActions?: TweetLimitedAction[] | null;
}
