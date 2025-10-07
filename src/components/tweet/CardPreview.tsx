import type { TweetCardInfo } from "@/components/tweet/tweetText";
import { cn } from "@/utils/cn";

const DEFAULT_LARGE_RATIO = "1200 / 628";
const DEFAULT_SQUARE_RATIO = "1 / 1";

const CardPreview = ({ card }: { card: TweetCardInfo }) => {
  const isLargeImage = (card.type ?? "").toLowerCase().includes("large");
  const hasImage = Boolean(card.image?.url);
  const aspectRatio =
    card.image?.width && card.image?.height
      ? `${card.image.width} / ${card.image.height}`
      : undefined;
  const imageAlt =
    card.image?.alt ?? card.title ?? card.displayUrl ?? "链接卡片封面";
  const layoutClass = hasImage && !isLargeImage ? "flex-row" : "flex-col";
  const imageWrapperClass =
    hasImage && !isLargeImage ? "w-[116px] flex-shrink-0" : "w-full";

  return (
    <a
      href={card.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "border-twitter-border-light dark:border-twitter-dark-border-light bg-twitter-background-surface dark:bg-twitter-dark-background-surface hover:bg-twitter-background-hover dark:hover:bg-twitter-dark-background-hover mt-3 flex overflow-hidden rounded-2xl border transition-colors duration-200",
        layoutClass
      )}
    >
      {hasImage ? (
        <div
          className={cn(
            "bg-twitter-background-card dark:bg-twitter-dark-background-card overflow-hidden",
            imageWrapperClass
          )}
          style={{
            aspectRatio:
              aspectRatio ??
              (hasImage && !isLargeImage
                ? DEFAULT_SQUARE_RATIO
                : DEFAULT_LARGE_RATIO),
          }}
        >
          <img
            src={card.image?.url}
            alt={imageAlt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        {card.displayUrl ? (
          <span className="text-twitter-text-secondary dark:text-twitter-dark-text-secondary text-[13px] font-medium uppercase">
            {card.displayUrl}
          </span>
        ) : null}
        {card.title ? (
          <span className="text-twitter-text-primary dark:text-twitter-dark-text-primary text-[15px] font-semibold">
            {card.title}
          </span>
        ) : null}
        {card.description ? (
          <span className="text-twitter-text-secondary dark:text-twitter-dark-text-secondary text-[15px] leading-5">
            {card.description}
          </span>
        ) : null}
      </div>
    </a>
  );
};

export default CardPreview;
