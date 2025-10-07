import { useCallback, useEffect, useMemo, useState } from "react";
import type React from "react";
import {
  createBookmark,
  createRetweet,
  deleteBookmark,
  deleteRetweet,
  favoriteTweet,
  unfavoriteTweet,
} from "@/api/twitterGraphql";
import { TWEET_ACTION_ICONS } from "@/icons/TweetActionIcons";
import { formatCount } from "@/components/tweet/tweetText";
import type { TweetResult } from "@/types/response";
import { requestTweetDetail } from "@/handlers/tweetDetailHandler";

type ActionKey = "reply" | "retweet" | "like" | "bookmark" | "view";

type ActionCounts = {
  reply: number | null;
  retweet: number | null;
  like: number | null;
  bookmark: number | null;
  view: number | null;
};

type ActionActives = {
  retweet: boolean | null;
  like: boolean | null;
  bookmark: boolean | null;
};

interface TweetActionsProps {
  tweet: TweetResult;
  size?: "sm" | "md";
  onReplyBtnClick: () => void;
  className?: string;
}

const ACTION_ICON_SIZE: Record<"sm" | "md", number> = {
  sm: 18.75,
  md: 22.5,
};

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const adjustCount = (value: number | null, delta: 1 | -1) => {
  const base = typeof value === "number" ? value : 0;
  const next = base + delta;
  return next < 0 ? 0 : next;
};

const TweetActions = ({
  tweet,
  size = "md",
  onReplyBtnClick,
  className,
}: TweetActionsProps) => {
  const tweetId = tweet.rest_id ?? tweet.legacy?.id_str;

  const initialCounts = useMemo<ActionCounts>(
    () => ({
      reply: tweet.legacy?.reply_count ?? null,
      retweet:
        tweet.legacy?.retweet_count || tweet.legacy?.quote_count
          ? (tweet.legacy.retweet_count ?? 0) + (tweet.legacy.quote_count ?? 0)
          : null,
      like: tweet.legacy?.favorite_count ?? null,
      bookmark: tweet.legacy?.bookmark_count ?? null,
      view: tweet.views?.count ? parseInt(tweet.views!.count!) : null,
    }),
    [tweet]
  );

  const initialActives = useMemo<ActionActives>(
    () => ({
      retweet: tweet.legacy?.retweeted ?? null,
      like: tweet.legacy?.favorited ?? null,
      bookmark: tweet.legacy?.bookmarked ?? null,
    }),
    [tweet]
  );

  const [counts, setCounts] = useState<ActionCounts>(() => ({
    ...initialCounts,
  }));
  const [actives, setActives] = useState<ActionActives>(() => ({
    ...initialActives,
  }));
  const [pendingAction, setPendingAction] = useState<
    null | "reply" | "retweet" | "like" | "bookmark"
  >(null);

  useEffect(() => {
    setCounts({ ...initialCounts });
  }, [initialCounts]);

  useEffect(() => {
    setActives({ ...initialActives });
  }, [initialActives]);

  const sizeValue = ACTION_ICON_SIZE[size];
  const sizeClasses = size === "sm" ? "text-[13px]" : "text-[14px]";

  const handleReply = useCallback(async () => {
    if (!tweetId) return;
    onReplyBtnClick();
  }, [onReplyBtnClick, tweetId]);

  const handleToggleRetweet = useCallback(async () => {
    if (!tweetId) return;
    if (pendingAction) return;
    const previousActive = actives.retweet;
    const previousCount = counts.retweet;
    const currentActive = Boolean(previousActive);
    const nextActive = !currentActive;

    setPendingAction("retweet");
    setActives((previous) => ({ ...previous, retweet: nextActive }));
    setCounts((previous) => ({
      ...previous,
      retweet: adjustCount(previous.retweet, nextActive ? 1 : -1),
    }));

    try {
      if (nextActive) {
        await createRetweet(tweetId);
      } else {
        await deleteRetweet(tweetId);
      }
      requestTweetDetail(tweetId, null, true)
    } catch (error) {
      console.error("[TSB][TweetActions] 转推失败", error);
      setActives((previous) => ({ ...previous, retweet: previousActive }));
      setCounts((previous) => ({ ...previous, retweet: previousCount }));
    } finally {
      setPendingAction(null);
    }
  }, [actives.retweet, counts.retweet, pendingAction, tweetId]);

  const handleToggleLike = useCallback(async () => {
    if (!tweetId) return;
    if (pendingAction) return;
    const previousActive = actives.like;
    const previousCount = counts.like;
    const currentActive = Boolean(previousActive);
    const nextActive = !currentActive;

    setPendingAction("like");
    setActives((previous) => ({ ...previous, like: nextActive }));
    setCounts((previous) => ({
      ...previous,
      like: adjustCount(previous.like, nextActive ? 1 : -1),
    }));

    try {
      if (nextActive) {
        await favoriteTweet(tweetId);
      } else {
        await unfavoriteTweet(tweetId);
      }
      requestTweetDetail(tweetId, null, true)
    } catch (error) {
      console.error("[TSB][TweetActions] 点赞失败", error);
      setActives((previous) => ({ ...previous, like: previousActive }));
      setCounts((previous) => ({ ...previous, like: previousCount }));
    } finally {
      setPendingAction(null);
    }
  }, [actives.like, counts.like, pendingAction, tweetId]);

  const handleToggleBookmark = useCallback(async () => {
    if (!tweetId) return;
    if (pendingAction) return;
    const previousActive = actives.bookmark;
    const previousCount = counts.bookmark;
    const currentActive = Boolean(previousActive);
    const nextActive = !currentActive;

    setPendingAction("bookmark");
    setActives((previous) => ({ ...previous, bookmark: nextActive }));
    setCounts((previous) => ({
      ...previous,
      bookmark: adjustCount(previous.bookmark, nextActive ? 1 : -1),
    }));

    try {
      if (nextActive) {
        await createBookmark(tweetId);
      } else {
        await deleteBookmark(tweetId);
      }
      requestTweetDetail(tweetId, null, true)
    } catch (error) {
      console.error("[TSB][TweetActions] 收藏失败", error);
      setActives((previous) => ({ ...previous, bookmark: previousActive }));
      setCounts((previous) => ({ ...previous, bookmark: previousCount }));
    } finally {
      setPendingAction(null);
    }
  }, [actives.bookmark, counts.bookmark, pendingAction, tweetId]);

  const handleActionClick = (action: ActionKey) => {
    switch (action) {
      case "reply":
        void handleReply();
        break;
      case "retweet":
        void handleToggleRetweet();
        break;
      case "like":
        void handleToggleLike();
        break;
      case "bookmark":
        void handleToggleBookmark();
        break;
      default:
        break;
    }
  };

  const actionItems: Array<{
    key: ActionKey;
    label: string;
    color: { r: number; g: number; b: number };
    count?: number | null;
    active?: boolean | null;
  }> = [
    {
      key: "reply",
      label: "回复",
      color: { r: 29, g: 155, b: 240 },
      count: counts.reply,
    },
    {
      key: "retweet",
      label: "转推",
      color: { r: 0, g: 186, b: 124 },
      count: counts.retweet,
      active: actives.retweet,
    },
    {
      key: "like",
      label: "喜欢",
      color: { r: 249, g: 24, b: 128 },
      count: counts.like,
      active: actives.like,
    },
    {
      key: "view",
      label: "浏览",
      color: { r: 29, g: 155, b: 240 },
      count: counts.view,
    },
    {
      key: "bookmark",
      label: "书签",
      color: { r: 29, g: 155, b: 240 },
      count: counts.bookmark,
      active: actives.bookmark,
    },
  ];

  if (!tweetId) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap content-start items-center gap-8",
        size === "md" &&
          "bg-twitter-background-surface dark:bg-twitter-dark-background-surface border-t border-twitter-divide-light border-solid",
        size === "sm" ? "mt-3" : "sticky bottom-0 justify-between p-3",
        className
      )}
    >
      {actionItems.map((action) => {
        if (size === "md" && action.key === "view") {
          return null;
        }
        const active = action.active ?? null;
        let Icon = TWEET_ACTION_ICONS[action.key];
        if (action.key === "like" && active) {
          Icon = TWEET_ACTION_ICONS["like_active"];
        } else if (action.key === "bookmark" && active) {
          Icon = TWEET_ACTION_ICONS["bookmark_active"];
        }
        const count = action.count ?? null;
        const formatted = formatCount(count ?? undefined);
        const shouldShowCount =
          typeof count === "number" && count > 0 && formatted;
        const isToggle =
          action.key === "retweet" ||
          action.key === "like" ||
          action.key === "bookmark";
        const isDisabled =
          isToggle &&
          pendingAction !== null &&
          (pendingAction === "retweet" ||
            pendingAction === "like" ||
            pendingAction === "bookmark");
        const isPending = pendingAction === action.key;

        return (
          <button
            key={action.key}
            type="button"
            className={cn(
              "group relative flex items-center min-h-5 hover:text-(--accent-rgb)",
              sizeClasses,
              active
                ? "text-(--accent-rgb)"
                : "text-twitter-text-secondary dark:text-twitter-dark-text-secondary"
            )}
            onClick={() => handleActionClick(action.key)}
            aria-label={action.label}
            disabled={isDisabled}
            aria-busy={isPending}
            style={
              {
                "--accent-rgb": `rgb(${action.color.r}, ${action.color.g}, ${action.color.b})`,
                "--accent-rgba": `rgba(${action.color.r}, ${action.color.g}, ${action.color.b}, 0.1)`,
              } as React.CSSProperties
            }
          >
            <div className="inline-flex items-center">
              <div className="relative inline-flex">
                <span className="absolute inset-0 bottom-0 left-0 right-0 top-0 -m-2 rounded-full bg-(--accent-rgba) opacity-0 transition-opacity group-hover:opacity-100" />
                <Icon size={sizeValue} />
              </div>
              {shouldShowCount ? (
                <span
                  className={cn(
                    "px-1 text-[13px] group-hover:text-current",
                    active
                      ? "text-(--accent-rgb)"
                      : "text-twitter-text-secondary dark:text-twitter-dark-text-secondary"
                  )}
                >
                  {formatted}
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default TweetActions;
