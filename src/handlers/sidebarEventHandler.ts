import { SIDEBAR_OPEN_TWEET_EVENT, SIDEBAR_REFRESH_DETAIL_EVENT } from "@/events/sidebar";
import { openTweetInSidebar, refreshTweetDetail } from "./sidebarController";
import type { TweetResult } from "@/types/response";
import { storeTweet } from "@/store/tweetsStore";
import { getTweetIdFromTweet } from "@/utils/responseData";

export const registerSidebarEventHandler = () => {
  const handleOpen: EventListener = (event) => {
    const detail = (
      event as CustomEvent<{
        tweet: TweetResult;
        controllerData?: string | null;
      }>
    ).detail;
    if (!detail?.tweet) return;
    const tweetId = getTweetIdFromTweet(detail.tweet);
    if (!tweetId) return;
    storeTweet(detail.tweet, detail.controllerData ?? null, true);
    openTweetInSidebar(tweetId);
  };

  const handleRefresh: EventListener = (event) => {
    const detail = (event as CustomEvent<{ tweetId: string }>).detail;
    const tweetId = detail?.tweetId;
    if (!tweetId) return;

    void refreshTweetDetail(tweetId);
  };

  window.addEventListener(SIDEBAR_OPEN_TWEET_EVENT, handleOpen);
  window.addEventListener(SIDEBAR_REFRESH_DETAIL_EVENT, handleRefresh);

  return () => {
    window.removeEventListener(SIDEBAR_OPEN_TWEET_EVENT, handleOpen);
    window.removeEventListener(SIDEBAR_REFRESH_DETAIL_EVENT, handleRefresh);
  };
};
