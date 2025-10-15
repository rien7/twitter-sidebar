import { useMemo, useState } from 'react'

import { voteInPoll } from '@/api/twitterPoll'
import { PollSelectedIcon } from '@/icons/PollSelectedIcon'
import type { TweetPollInfo } from '@/types/poll'
import { cn } from '@/utils/cn'
import { renderWithTwemoji } from '@/utils/twemoji'

import { formatCount } from './tweetText'

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
})

const formatTimeRemaining = (endsAt: number, now: number) => {
  const diff = endsAt - now
  if (diff <= 0) return '已结束'
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff >= day) {
    const value = Math.round(diff / day)
    return relativeFormatter.format(value, 'day')
  }
  if (diff >= hour) {
    const value = Math.round(diff / hour)
    return relativeFormatter.format(value, 'hour')
  }
  const value = Math.max(1, Math.round(diff / minute))
  return relativeFormatter.format(value, 'minute')
}

const formatStatus = (
  poll: TweetPollInfo,
  hasEnded: boolean,
  totalVotes: number,
  now: number,
) => {
  const votesText = `${formatCount(totalVotes) ?? totalVotes} 票`
  if (poll.countsAreFinal || hasEnded) {
    return `${votesText} · 最终结果`
  }
  if (poll.endDateTime) {
    const parsed = Date.parse(poll.endDateTime)
    if (!Number.isNaN(parsed)) {
      const relative = formatTimeRemaining(parsed, now)
      return `${votesText} · ${relative}`
    }
  }
  return votesText
}

interface PollOptionProps {
  optimisticChoice: boolean
  choice: TweetPollInfo['choices'][number]
  isVotingClosed: boolean
  totalVotes: number
  isSelected: boolean
  isWinner: boolean
  canVote: boolean
  onVote: (choiceId: number) => void
}

function PollOption({
  optimisticChoice,
  choice,
  isVotingClosed,
  totalVotes,
  isSelected,
  isWinner,
  canVote,
  onVote,
}: PollOptionProps) {
  const percentage = isVotingClosed && totalVotes > 0
    ? Math.round(((choice.count + (optimisticChoice ? 1 : 0)) / totalVotes) * 1000) / 10
    : 0
  const highlightWidth = isVotingClosed
    ? totalVotes === 0
      ? 1
      : Math.min(100, Math.max(1, Math.round(((choice.count + (optimisticChoice ? 1 : 0)) / totalVotes) * 100)))
    : 0

  return (
    <button
      className={cn(`
        relative min-h-[32px] min-w-[32px] flex-grow overflow-hidden border border-solid border-transparent bg-transparent
        px-[1em] transition-[background-color]
      `,
      canVote && `
        cursor-pointer rounded-full border-twitter-accent
        hover:bg-twitter-accent/10
      `)}
      disabled={!canVote}
      onClick={() => onVote(choice.id)}
      type="button"
    >
      {isVotingClosed && (
        <span
          className={cn(
            'pointer-events-none absolute top-0 bottom-0 left-0 cursor-default rounded-[4px]',
            !canVote && isWinner ? 'bg-twitter-accent/55' : 'bg-twitter-vote-background',
          )}
          style={{ width: `${highlightWidth}%`, minWidth: '7px' }}
        />
      )}
      <span
        className={cn(
          'relative flex w-full items-center text-[15px] leading-[20px]',
          canVote ? 'justify-center truncate font-bold text-twitter-accent' : 'justify-between',
          isWinner && 'font-bold',
        )}
      >
        <span className="flex items-center">
          {renderWithTwemoji(choice.label)}
          {isSelected && (
            <PollSelectedIcon
              className="ml-1"
              color="var(--color-twitter-text-primary)"
              fontSize="15px"
              height="1.25em"
            />
          )}
        </span>
        {!canVote && (
          <span>
            {percentage}
            %
          </span>
        )}
      </span>
    </button>
  )
}

interface TweetPollProps {
  tweetId: string
  poll: TweetPollInfo
  controllerData: string | null
  className?: string
}

/**
 * 推文投票卡片展示与提交组件。
 *
 * - 未投票时允许用户选择选项并调用真实 API；
 * - 投票后触发详情刷新以同步最新票数；
 * - 投票结果或最终结果会以百分比与高亮展示。
 */
export function TweetPoll({ tweetId, poll, className }: TweetPollProps) {
  const [optimisticChoice, setOptimisticChoice] = useState<number | null>(null)
  const now = Date.now()
  const endsAt = poll.endDateTime ? Date.parse(poll.endDateTime) : Number.NaN
  const hasEnded = Number.isFinite(endsAt) && endsAt <= now

  const totalVotes = useMemo(() => poll.totalVotes + (optimisticChoice === null ? 0 : 1),
    [optimisticChoice, poll])
  const selectedChoiceId = useMemo(() => optimisticChoice ?? poll.selectedChoiceId ?? undefined,
    [optimisticChoice, poll])
  const isVotingClosed = useMemo(() => hasEnded || poll.countsAreFinal || selectedChoiceId !== undefined,
    [hasEnded, selectedChoiceId, poll])
  const statusText = useMemo(() => formatStatus(poll, hasEnded, totalVotes, now),
    [poll, hasEnded, totalVotes, now],
  )
  const maxCount = useMemo(() => {
    if (!isVotingClosed) return 0
    return poll.choices.reduce((acc, choice) => Math.max(acc, choice.count), 0)
  }, [poll.choices, isVotingClosed])
  const canVote = !isVotingClosed && !hasEnded && !poll.countsAreFinal && Boolean(poll.endpoint)

  const handleVote = async (choiceId: number) => {
    if (!canVote) return
    if (!poll.endpoint) {
      return
    }

    setOptimisticChoice(choiceId)
    try {
      await voteInPoll({
        endpoint: poll.endpoint,
        cardUri: poll.cardUri,
        cardName: poll.cardName,
        tweetId,
        choiceId,
      })
    } catch (error) {
      console.error('[TSB][Poll] Fail to poll.', error)
      setOptimisticChoice(null)
    }
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-1">
        {poll.choices.map((choice) => {
          const isSelected = selectedChoiceId === choice.id
          const isWinner = hasEnded && isVotingClosed && totalVotes > 0 && choice.count === maxCount

          return (
            <PollOption
              canVote={canVote}
              choice={choice}
              isSelected={Boolean(isSelected)}
              isVotingClosed={isVotingClosed}
              isWinner={isWinner}
              key={choice.id}
              onVote={handleVote}
              optimisticChoice={optimisticChoice === choice.id}
              totalVotes={totalVotes}
            />
          )
        })}
      </div>
      <div className="text-[13px] text-twitter-text-secondary">
        {statusText}
      </div>
    </div>
  )
}

export default TweetPoll
