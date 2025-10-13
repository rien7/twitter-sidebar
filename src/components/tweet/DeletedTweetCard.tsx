import { ReactNode, useMemo } from 'react'

import { DeletedTweetData } from '@/store/tweetsStore'
import { TombstoneEntity } from '@/types/response'
import { cn } from '@/utils/cn'

interface DeletedTweetCardProps {
  tombstone: DeletedTweetData
  variant?: 'reply' | 'main'
  linkTop?: boolean
  linkBottom?: boolean
  showDivider?: boolean
}

type TextSegment
  = | { type: 'text', value: string }
    | { type: 'link', value: string, url: string }

const buildSegments = (
  text: string,
  entities: TombstoneEntity[] | undefined,
): TextSegment[] => {
  if (!entities || entities.length === 0) {
    return [{ type: 'text', value: text }]
  }

  const sorted = entities
    .filter(
      (
        entity,
      ): entity is TombstoneEntity & { fromIndex: number, toIndex: number } =>
        typeof entity?.fromIndex === 'number'
        && typeof entity?.toIndex === 'number'
        && entity.toIndex >= entity.fromIndex,
    )
    .sort((a, b) => a.fromIndex - b.fromIndex)

  const segments: TextSegment[] = []
  let cursor = 0

  for (const entity of sorted) {
    const start = entity.fromIndex
    const end = Math.min(entity.toIndex, text.length)
    if (cursor < start) {
      segments.push({
        type: 'text',
        value: text.slice(cursor, start),
      })
    }

    const value = text.slice(start, end)
    const url = entity.ref?.url
    if (value.length > 0) {
      if (url) {
        segments.push({ type: 'link', value, url })
      } else {
        segments.push({ type: 'text', value })
      }
    }
    cursor = end
  }

  if (cursor < text.length) {
    segments.push({
      type: 'text',
      value: text.slice(cursor),
    })
  }

  return segments
}

const renderSegments = (segments: TextSegment[]): ReactNode => {
  return segments.map((segment, index) => {
    if (segment.type === 'link') {
      return (
        <a
          key={`${segment.url}-${index}`}
          href={segment.url}
          target="_blank"
          rel="noreferrer"
          className={`
            text-twitter-accent
            hover:underline
          `}
        >
          {segment.value}
        </a>
      )
    }

    return <span key={index}>{segment.value}</span>
  })
}

export function DeletedTweetCard({
  tombstone,
  variant = 'reply',
  linkTop = false,
  linkBottom = false,
  showDivider = false,
}: DeletedTweetCardProps) {
  const text = tombstone.tombstone.tombstone?.text?.text ?? '此推文已删除。'
  const entities = tombstone.tombstone.tombstone?.text?.entities

  const segments = useMemo(
    () => buildSegments(text, entities),
    [text, entities],
  )

  const articleClass = cn(
    'relative bg-twitter-background-surface px-5 py-4',
    showDivider
    && variant === 'reply'
    && !linkBottom
    && 'after:absolute after:right-0 after:bottom-0 after:left-16 after:h-px after:bg-twitter-border-light after:content-[\'\']',
  )

  return (
    <article className={articleClass}>
      {linkTop
        ? (
            <span
              aria-hidden
              className="pointer-events-none absolute top-0 left-[2.625rem] h-3 w-0.5 bg-twitter-text-divider"
            />
          )
        : null}
      {variant === 'reply' && linkBottom
        ? (
            <span
              aria-hidden
              className="pointer-events-none absolute top-[67px] bottom-0 left-[2.625rem] w-0.5 bg-twitter-text-divider"
            />
          )
        : null}
      <div className="rounded-2xl bg-twitter-fill px-4 py-3 text-[15px] text-twitter-text-secondary">
        {renderSegments(segments)}
      </div>
    </article>
  )
}

export default DeletedTweetCard
