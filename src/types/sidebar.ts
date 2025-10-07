import { TweetData, TweetRelation } from "./tweet";

export type TweetContext = {
  tweetId: string;
  tweet: TweetData;
  root: HTMLElement;
};

export type SidebarTweetStatus =
  | "idle"
  | "success"
  | "error"
  | "loading"
  | "partical";

export interface SidebarState {
  isOpen: boolean;
  pinned: boolean;
  width: number; // sidebar preferred width in px (clamped)
  tweetId: string | null;
  tweet: TweetData | null;
  tweetRelation: TweetRelation | null;
  relateTweets: Record<string, TweetData> | null;
  status: SidebarTweetStatus;
}
