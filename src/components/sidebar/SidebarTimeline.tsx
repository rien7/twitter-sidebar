import { useMemo } from "react";
import TweetCard from "@/components/tweet/TweetCard";
import DeletedTweetCard from "@/components/tweet/DeletedTweetCard";
import type { TweetResult } from "@/types/response";
import type { SidebarTweetStatus } from "@/types/sidebar";
import { TweetData, TweetRelation } from "@/types/tweet";
import {
  getTweetRelation,
  DeletedTweetData,
  getDeletedTweet,
} from "@/store/tweetsStore";
import { buildAuthorSpine } from "@/utils/threadPrune";
import { getUserIdFromTweet } from "@/utils/responseData";

interface SidebarTimelineProps {
  tweet: TweetData | null;
  tweetRelation: TweetRelation | null;
  relateTweets: Record<string, TweetData> | null;
  status: SidebarTweetStatus;
  onSelectTweet: (tweet: TweetResult, controllerData?: string | null) => void;
}

type AncestorEntry =
  | { kind: "tweet"; data: TweetData }
  | { kind: "deleted"; data: DeletedTweetData };

type TimelineTweetItem = {
  kind: "tweet";
  key: string;
  tweet: TweetResult;
  variant: "main" | "reply";
  linkTop?: boolean;
  linkBottom?: boolean;
  controllerData?: string | null;
  isAncestor?: boolean;
};

type TimelineDeletedItem = {
  kind: "deleted";
  key: string;
  variant: "main" | "reply";
  linkTop?: boolean;
  linkBottom?: boolean;
  isAncestor?: boolean;
  tombstone: DeletedTweetData;
};

type TimelineItem = TimelineTweetItem | TimelineDeletedItem;

const isDetailReady = (status: SidebarTweetStatus) =>
  status === "success" || status === "partical";

const useAncestorTweets = (
  tweetRelation: TweetRelation | null,
  relateTweets: Record<string, TweetData> | null
) => {
  const hasParentTweet = tweetRelation?.replyTo !== null;
  return useMemo<AncestorEntry[]>(() => {
    if (!tweetRelation || !hasParentTweet) return [];
    const ancestors: AncestorEntry[] = [];
    let replyTo = tweetRelation.replyTo;
    while (replyTo !== undefined) {
      const ancestorTweet = relateTweets?.[replyTo];
      if (ancestorTweet?.result) {
        ancestors.push({ kind: "tweet", data: ancestorTweet });
        const ancestorRelation = getTweetRelation(replyTo);
        if (
          ancestorRelation !== undefined &&
          ancestorRelation.replyTo !== undefined
        ) {
          replyTo = ancestorRelation.replyTo;
        } else {
          replyTo = undefined;
        }
        continue;
      }

      const deleted = getDeletedTweet(replyTo);
      if (!deleted) break;
      const parentTweetId = deleted.parentTweetId;
      ancestors.push({ kind: "deleted", data: deleted });
      replyTo = parentTweetId ?? undefined;
    }
    return ancestors.reverse();
  }, [hasParentTweet, tweetRelation, relateTweets]);
};

const useTimelineItems = (
  tweet: TweetData | null,
  status: SidebarTweetStatus,
  tweetRelation: TweetRelation | null,
  relateTweets: Record<string, TweetData> | null,
  ancestorTweets: AncestorEntry[]
) => {
  return useMemo<TimelineItem[]>(() => {
    if (!tweet || !tweet.result) return [];

    const mainTweet = tweet.result;

    const items: TimelineItem[] = [];

    ancestorTweets.forEach((ancestor, index) => {
      if (ancestor.kind === "tweet") {
        const key = ancestor.data.result.rest_id ?? `ancestor-${index}`;
        items.push({
          kind: "tweet",
          key,
          tweet: ancestor.data.result,
          variant: "reply",
          linkTop: index > 0,
          linkBottom: true,
          isAncestor: true,
        });
        return;
      }

      const key = ancestor.data.tweetId ?? `deleted-ancestor-${index}`;
      items.push({
        kind: "deleted",
        key,
        variant: "reply",
        linkTop: index > 0,
        linkBottom: true,
        isAncestor: true,
        tombstone: ancestor.data,
      });
    });

    if (mainTweet) {
      const mainKey = mainTweet.rest_id ?? "main-key";
      items.push({
        kind: "tweet",
        key: mainKey,
        tweet: mainTweet,
        variant: "main",
        linkTop: ancestorTweets.length > 0,
        controllerData: tweet.controllerData ?? null,
      });
    }

    if (
      isDetailReady(status) &&
      relateTweets &&
      tweetRelation &&
      tweetRelation.replies
    ) {
      for (const firstId of tweetRelation.replies.keys()) {
        const branchSpine = buildAuthorSpine(
          firstId,
          getUserIdFromTweet(mainTweet),
          relateTweets
        );

        branchSpine.forEach((id, indexInBranch) => {
          const isLast = indexInBranch === branchSpine.length - 1;
          const linkTop = indexInBranch > 0;
          const linkBottom = branchSpine.length > 1 && !isLast;
          const node = relateTweets?.[id];

          if (node?.result) {
            items.push({
              kind: "tweet",
              key: node.result.rest_id,
              tweet: node.result,
              variant: "reply",
              linkTop,
              linkBottom,
              controllerData: node.controllerData ?? null,
            });
            return;
          }

          const deleted = getDeletedTweet(id);
          if (!deleted) {
            // If we encounter an ID without cached data, stop extending this branch.
            return;
          }
          items.push({
            kind: "deleted",
            key: deleted.tweetId,
            variant: "reply",
            linkTop,
            linkBottom,
            tombstone: deleted,
          });
        });
      }
    }

    return items;
  }, [status, relateTweets, tweetRelation, tweet, ancestorTweets]);
};

export const SidebarTimeline = ({
  tweet,
  tweetRelation,
  relateTweets,
  status,
  onSelectTweet,
}: SidebarTimelineProps) => {
  const ancestorTweets = useAncestorTweets(tweetRelation, relateTweets);
  const timelineItems = useTimelineItems(
    tweet,
    status,
    tweetRelation,
    relateTweets,
    ancestorTweets
  );

  if (!tweet) {
    return (
      <div className="text-twitter-text-secondary dark:text-twitter-dark-text-secondary px-5 py-10 text-center text-[15px]">
        选择一条推文即可在此预览详细内容
      </div>
    );
  }

  return (
    <>
      {timelineItems.map((item) => {
        const showDivider = !item.linkBottom && !item.isAncestor;
        if (item.kind === "tweet") {
          return (
            <TweetCard
              key={item.key}
              tweet={item.tweet}
              variant={item.variant}
              linkTop={item.linkTop}
              linkBottom={item.linkBottom}
              controllerData={item.controllerData ?? null}
              onSelect={onSelectTweet}
              showDivider={showDivider}
            />
          );
        }
        return (
          <DeletedTweetCard
            key={item.key}
            tombstone={item.tombstone}
            variant={item.variant}
            linkTop={item.linkTop}
            linkBottom={item.linkBottom}
            showDivider={showDivider}
          />
        );
      })}
    </>
  );
};

export default SidebarTimeline;
