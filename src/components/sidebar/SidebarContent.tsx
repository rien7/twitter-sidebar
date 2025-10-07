import { useCallback, useRef } from "react";
import { SidebarHeader } from "./SidebarHeader";
import type { TweetResult } from "@/types/response";
import type { SidebarTweetStatus } from "@/types/sidebar";
import type { RefObject } from "react";
import { TweetData, TweetRelation } from "@/types/tweet";
import { openTweetInSidebar } from "@/handlers/sidebarController";
import { SidebarTimeline } from "./SidebarTimeline";
import { SidebarContentRefContext } from "../../context/SidebarTimelineContext";

interface SidebarContentProps {
  isOpen: boolean;
  scrollAreaRef: RefObject<HTMLDivElement>;
  tweet: TweetData | null;
  tweetRelation: TweetRelation | null;
  relateTweets: Record<string, TweetData> | null;
  status: SidebarTweetStatus;
  pinned: boolean;
  onTogglePinned: () => void;
  onClose: () => void;
}

export const SidebarContent = ({
  scrollAreaRef,
  tweet,
  tweetRelation,
  relateTweets,
  status,
  pinned,
  onTogglePinned,
  onClose,
}: SidebarContentProps) => {
  const headerRef = useRef<HTMLElement | null>(null);
  const emptyAreaRef = useRef<HTMLDivElement | null>(null);

  const handleSelectTweet = useCallback((tweet: TweetResult) => {
    openTweetInSidebar(tweet.rest_id);
  }, []);

  return (
    <SidebarContentRefContext
      value={{ headerRef, scrollAreaRef, emptyAreaRef }}
    >
      <div className="bg-twitter-background-surface dark:bg-twitter-dark-background-surface text-twitter-text-primary dark:text-twitter-dark-text-primary shadow-twitter-sidebar flex h-full flex-col border-l border-solid border-twitter-divide-light shadow">
        <SidebarHeader
          ref={headerRef}
          pinned={pinned}
          onTogglePinned={onTogglePinned}
          onClose={onClose}
        />
        <div
          ref={scrollAreaRef}
          className="scrollbar-thin flex-1 overflow-y-auto"
          style={{ overflowAnchor: "auto" }}
        >
          <div
            aria-hidden
            data-anchor-sentinel
            style={{ blockSize: 1, overflowAnchor: "auto" }} // 1px 的稳定块级
          />
          <SidebarTimeline
            tweet={tweet}
            tweetRelation={tweetRelation}
            relateTweets={relateTweets}
            status={status}
            onSelectTweet={handleSelectTweet}
          />
          <div
            ref={emptyAreaRef}
            className="min-h-1/2"
            style={{ overflowAnchor: "none" }}
          />
        </div>
      </div>
    </SidebarContentRefContext>
  );
};
