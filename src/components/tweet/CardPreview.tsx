import type { TweetCardInfo } from '@/components/tweet/tweetText'
import { cn } from '@/utils/cn'

const DEFAULT_LARGE_RATIO = '1200 / 628'
const DEFAULT_SQUARE_RATIO = '1 / 1'

export default function CardPreview({ card }: { card: TweetCardInfo }) {
  const isLargeImage = (card.type ?? '').toLowerCase().includes('large')
  const hasImage = Boolean(card.image?.url)
  const aspectRatio = card.image?.width && card.image?.height
    ? `${card.image.width} / ${card.image.height}`
    : hasImage && !isLargeImage ? DEFAULT_SQUARE_RATIO : DEFAULT_LARGE_RATIO
  const imageAlt = card.image?.alt ?? card.title ?? card.displayUrl ?? '链接卡片封面'
  const layoutClass = hasImage && !isLargeImage ? 'flex-row' : 'flex-col'
  const imageWrapperClass = hasImage && !isLargeImage ? 'w-[116px] flex-shrink-0' : 'w-full'

  return (
    <a
      className={cn(`
        flex overflow-hidden rounded-2xl border border-twitter-border-light bg-twitter-background-surface transition-colors
        duration-200
        hover:bg-twitter-background-hover
      `,
      layoutClass,
      )}
      href={card.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      {hasImage && (
        <div
          className={cn(
            `overflow-hidden bg-twitter-background-card`,
            imageWrapperClass,
          )}
          style={{ aspectRatio }}
        >
          <img
            alt={imageAlt}
            className="size-full object-cover"
            loading="lazy"
            src={card.image?.url}
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        {card.displayUrl && (
          <span className="text-[13px] font-medium text-twitter-text-secondary uppercase">
            {card.displayUrl}
          </span>
        )}
        {card.title && (
          <span className="text-[15px] font-semibold text-twitter-text-primary">
            {card.title}
          </span>
        )}
        {card.description && (
          <span className="text-[15px] leading-5 text-twitter-text-secondary">
            {card.description}
          </span>
        )}
      </div>
    </a>
  )
}
