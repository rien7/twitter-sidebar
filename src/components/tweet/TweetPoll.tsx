import { useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import { voteInPoll } from "@/api/twitterPoll";
import type { TweetPollInfo } from "@/types/poll";
import { formatCount } from "./tweetText";
import { PollSelectedIcon } from "@/icons/PollSelectedIcon";
import { renderWithTwemoji } from "@/utils/twemoji";

const relativeFormatter = new Intl.RelativeTimeFormat("zh-CN", {
  numeric: "auto",
});

const formatTimeRemaining = (endsAt: number, now: number) => {
  const diff = endsAt - now;
  if (diff <= 0) return "已结束";
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff >= day) {
    const value = Math.round(diff / day);
    return relativeFormatter.format(value, "day");
  }
  if (diff >= hour) {
    const value = Math.round(diff / hour);
    return relativeFormatter.format(value, "hour");
  }
  const value = Math.max(1, Math.round(diff / minute));
  return relativeFormatter.format(value, "minute");
};

const formatStatus = (
  poll: TweetPollInfo,
  hasEnded: boolean,
  totalVotes: number,
  now: number
) => {
  const votesText = `${formatCount(totalVotes) ?? totalVotes} 票`;
  if (poll.countsAreFinal || hasEnded) {
    return `${votesText} · 最终结果`;
  }
  if (poll.endDateTime) {
    const parsed = Date.parse(poll.endDateTime);
    if (!Number.isNaN(parsed)) {
      const relative = formatTimeRemaining(parsed, now);
      return `${votesText} · ${relative}`;
    }
  }
  return votesText;
};

interface PollOptionProps {
  optimisticChoice: boolean;
  choice: TweetPollInfo["choices"][number];
  showResults: boolean;
  totalVotes: number;
  isSelected: boolean;
  isWinner: boolean;
  canVote: boolean;
  onVote: (choiceId: number) => void;
}

const PollOption = ({
  optimisticChoice,
  choice,
  showResults,
  totalVotes,
  isSelected,
  isWinner,
  canVote,
  onVote,
}: PollOptionProps) => {
  const percentage =
    showResults && totalVotes > 0
      ? Math.round(
          ((choice.count + (optimisticChoice ? 1 : 0)) / totalVotes) * 1000
        ) / 10
      : 0;
  const highlightWidth = showResults
    ? totalVotes === 0
      ? 1
      : Math.min(
          100,
          Math.max(
            1,
            Math.round(
              ((choice.count + (optimisticChoice ? 1 : 0)) / totalVotes) * 100
            )
          )
        )
    : 0;

  return (
    <button
      type="button"
      className={cn(
        "relative overflow-hidden border border-solid border-transparent min-h-[32px] min-w-[32px] px-[1em] flex-grow bg-transparent transition-[background-color]",
        canVote &&
          "border-twitter-accent hover:bg-twitter-accent/10 cursor-pointer rounded-full"
      )}
      disabled={!canVote}
      onClick={() => onVote(choice.id)}
    >
      {showResults ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-0 top-0 bottom-0 rounded-[4px] cursor-default",
            !canVote && isWinner
              ? "bg-twitter-accent/55"
              : "bg-twitter-vote-background"
          )}
          style={{ width: `${highlightWidth}%`, minWidth: "7px" }}
        />
      ) : null}
      <span
        className={cn(
          "relative flex items-center text-[15px] w-full leading-[20px]",
          canVote
            ? "justify-center font-bold text-twitter-accent truncate"
            : "justify-between",
          isWinner && "font-bold"
        )}
      >
        <span className="flex items-center">
          {renderWithTwemoji(choice.label)}
          {isSelected ? (
            <PollSelectedIcon
              className="ml-1"
              fontSize="15px"
              height="1.25em"
              color="var(--color-twitter-text-primary)"
            />
          ) : undefined}
        </span>
        {!canVote ? <span>{percentage}%</span> : undefined}
      </span>
    </button>
  );
};

interface TweetPollProps {
  tweetId: string;
  poll: TweetPollInfo;
  controllerData: string | null;
  className?: string;
}

/**
 * 推文投票卡片展示与提交组件。
 *
 * - 未投票时允许用户选择选项并调用真实 API；
 * - 投票后触发详情刷新以同步最新票数；
 * - 投票结果或最终结果会以百分比与高亮展示。
 */
export const TweetPoll = ({ tweetId, poll, className }: TweetPollProps) => {
  const [optimisticChoice, setOptimisticChoice] = useState<number | null>(null);
  const now = Date.now();
  const endsAt = poll.endDateTime ? Date.parse(poll.endDateTime) : Number.NaN;
  const hasEnded = Number.isFinite(endsAt) && endsAt <= now;
  const totalVotes = useMemo(() => {
    return poll.totalVotes + (optimisticChoice === null ? 0 : 1);
  }, [optimisticChoice, poll]);
  const selectedChoiceId = useMemo(() => {
    return optimisticChoice ?? poll.selectedChoiceId ?? undefined;
  }, [optimisticChoice, poll]);
  const showResults = useMemo(() => {
    return hasEnded || poll.countsAreFinal || selectedChoiceId !== undefined;
  }, [hasEnded, selectedChoiceId, poll]);
  const statusText = useMemo(
    () => formatStatus(poll, hasEnded, totalVotes, now),
    [poll, hasEnded, totalVotes, now]
  );
  const maxCount = useMemo(() => {
    if (!showResults) return 0;
    return poll.choices.reduce((acc, choice) => Math.max(acc, choice.count), 0);
  }, [poll.choices, showResults]);
  const canVote =
    !showResults && !hasEnded && !poll.countsAreFinal && Boolean(poll.endpoint);

  const handleVote = async (choiceId: number) => {
    if (!canVote) return;
    if (!poll.endpoint) {
      return;
    }

    setOptimisticChoice(choiceId);
    try {
      await voteInPoll({
        endpoint: poll.endpoint,
        cardUri: poll.cardUri,
        cardName: poll.cardName,
        tweetId,
        choiceId,
      });
    } catch (error) {
      console.error("[TSB][Poll] 提交投票失败", error);
      setOptimisticChoice(null);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1">
        {poll.choices.map((choice) => {
          const isSelected = selectedChoiceId === choice.id;
          const isWinner =
            hasEnded &&
            showResults &&
            totalVotes > 0 &&
            choice.count === maxCount;

          return (
            <PollOption
              key={choice.id}
              optimisticChoice={optimisticChoice === choice.id}
              choice={choice}
              showResults={showResults}
              totalVotes={totalVotes}
              isSelected={Boolean(isSelected)}
              isWinner={isWinner}
              canVote={canVote}
              onVote={handleVote}
            />
          );
        })}
      </div>
      <div className="text-twitter-text-secondary dark:text-twitter-dark-text-secondary text-[13px]">
        {statusText}
      </div>
    </div>
  );
};

export default TweetPoll;
