import { useMemo } from "react";
import TweetCard from "@/components/tweet/TweetCard";
import type { TweetResult } from "@/types/response";
import type { SidebarTweetStatus } from "@/types/sidebar";
import { TweetData, TweetRelation } from "@/types/tweet";
import { getTweetRelation } from "@/store/tweetsStore";
import { buildAuthorSpine } from "@/utils/threadPrune";
import { getUserIdFromTweet } from "@/utils/responseData";

interface SidebarTimelineProps {
  tweet: TweetData | null;
  tweetRelation: TweetRelation | null;
  relateTweets: Record<string, TweetData> | null;
  status: SidebarTweetStatus;
  onSelectTweet: (tweet: TweetResult, controllerData?: string | null) => void;
}

type TimelineTweetItem = {
  key: string;
  tweet: TweetResult;
  variant: "main" | "reply";
  linkTop?: boolean;
  linkBottom?: boolean;
  controllerData?: string | null;
  isAncestor?: boolean;
};

type TimelineItem = TimelineTweetItem;

const isDetailReady = (status: SidebarTweetStatus) =>
  status === "success" || status === "partical";

const useAncestorTweets = (
  tweetRelation: TweetRelation | null,
  relateTweets: Record<string, TweetData> | null
) => {
  const hasParentTweet = tweetRelation?.replyTo !== null;
  return useMemo(() => {
    if (!tweetRelation || !relateTweets || !hasParentTweet)
      return [] as TweetData[];
    const ancestors: TweetData[] = [];
    let replyTo = tweetRelation.replyTo;
    while (replyTo !== undefined) {
      const ancestorTweet = relateTweets[replyTo];
      if (ancestorTweet === undefined) break;
      const ancestorRelation = getTweetRelation(replyTo);
      ancestors.push(ancestorTweet);
      if (
        ancestorRelation !== undefined &&
        ancestorRelation.replyTo !== undefined
      ) {
        replyTo = ancestorRelation.replyTo;
      } else {
        replyTo = undefined;
      }
    }
    return ancestors.reverse();
  }, [hasParentTweet, tweetRelation, relateTweets]);
};

const useTimelineItems = (
  tweet: TweetData | null,
  status: SidebarTweetStatus,
  tweetRelation: TweetRelation | null,
  relateTweets: Record<string, TweetData> | null,
  ancestorTweets: TweetData[]
) => {
  return useMemo<TimelineItem[]>(() => {
    if (!tweet || !tweet.result) return [];

    const mainTweet = tweet.result;

    const items: TimelineItem[] = [];

    ancestorTweets.forEach((ancestor, index) => {
      const key = ancestor.result.rest_id ?? `ancestor-${index}`;
      items.push({
        key,
        tweet: ancestor.result,
        variant: "reply",
        linkTop: index > 0,
        linkBottom: true,
        isAncestor: true,
      });
    });

    if (mainTweet) {
      const mainKey = mainTweet.rest_id ?? "main-key";
      items.push({
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
        const firstT = relateTweets[firstId];
        if (!firstT?.result) continue;
        const firstKey = firstT.result.rest_id;

        const branchSpine = buildAuthorSpine(
          firstId,
          getUserIdFromTweet(mainTweet),
          relateTweets
        );

        items.push({
          key: firstKey,
          tweet: firstT.result,
          variant: "reply",
          linkBottom: branchSpine.length > 1,
          controllerData: firstT.controllerData ?? null,
        });

        for (let j = 1; j < branchSpine.length; j++) {
          const id = branchSpine[j];
          const t = relateTweets[id];
          if (!t?.result) break;
          const isLast = j === branchSpine.length - 1;
          items.push({
            key: t.result.rest_id,
            tweet: t.result,
            variant: "reply",
            linkTop: true,
            linkBottom: !isLast,
            controllerData: t.controllerData ?? null,
          });
        }
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
      {timelineItems.map((item) => (
        <TweetCard
          key={item.key}
          tweet={item.tweet}
          variant={item.variant}
          linkTop={item.linkTop}
          linkBottom={item.linkBottom}
          controllerData={item.controllerData ?? null}
          onSelect={onSelectTweet}
          showDivider={!item.linkBottom && !item.isAncestor}
        />
      ))}
    </>
  );
};

export default SidebarTimeline;
