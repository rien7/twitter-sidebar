import type { TweetResult } from "@/types/response";

export const SIDEBAR_OPEN_TWEET_EVENT = "tsb:open-tweet";
export const SIDEBAR_REFRESH_DETAIL_EVENT = "tsb:refresh-detail";
export const SIDEBAR_TWEET_UPDATE = "tsb:tweet-update";

export interface SidebarOpenTweetDetail {
  tweet: TweetResult;
  controllerData?: string | null;
}

export interface SidebarRefreshDetailDetail {
  tweetId: string;
}

export const dispatchSidebarOpenTweet = (detail: SidebarOpenTweetDetail) => {
  window.dispatchEvent(
    new CustomEvent<SidebarOpenTweetDetail>(SIDEBAR_OPEN_TWEET_EVENT, {
      detail,
    })
  );
};

export const dispatchSidebarRefreshDetail = (
  detail: SidebarRefreshDetailDetail
) => {
  window.dispatchEvent(
    new CustomEvent<SidebarRefreshDetailDetail>(SIDEBAR_REFRESH_DETAIL_EVENT, {
      detail,
    })
  );
};
