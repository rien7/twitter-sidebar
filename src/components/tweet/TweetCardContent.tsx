import { Fragment, RefObject, type ReactNode } from "react";
import CardPreview from "@/components/tweet/CardPreview";
import MediaGallery from "@/components/tweet/MediaGallery";
import TweetActions from "@/components/tweet/TweetActions";
import ReplyComposer, { ReplyComposerHandle } from "../ReplyComposer";
import type { MediaEntity, TweetResult } from "@/types/response";
import type { TweetCardInfo } from "@/components/tweet/tweetText";
import { cn } from "@/utils/cn";

interface TweetCardContentProps {
  tweet: TweetResult;
  isMain: boolean;
  isReply: boolean;
  isQuote: boolean;
  composerOpen: boolean;
  onToggleComposer: () => void;
  onComposerExpand: () => void;
  onComposerCollapse: () => void;
  createdAt: string | null;
  viewsText: string | null;
  richTextNodes: { key: string; node: ReactNode }[];
  media?: MediaEntity[];
  cardInfo: TweetCardInfo | null;
  quotedTweetNode: ReactNode;
  showActions: boolean;
  showMediaGallery: boolean;
  bodyTextRef: RefObject<HTMLDivElement | null>;
  cardRef: RefObject<HTMLDivElement | null>;
  composerRef: RefObject<ReplyComposerHandle | null>;
  onSelect?: (tweet: TweetResult, controllerData?: string | null) => void;
  controllerData?: string | null;
}

export const TweetCardContent = ({
  tweet,
  isMain,
  isReply,
  isQuote,
  composerOpen,
  onToggleComposer,
  onComposerExpand,
  onComposerCollapse,
  createdAt,
  viewsText,
  richTextNodes,
  media,
  cardInfo,
  quotedTweetNode,
  showActions,
  showMediaGallery,
  bodyTextRef,
  cardRef,
  composerRef,
  onSelect,
  controllerData,
}: TweetCardContentProps) => {
  const transitionClass = "";
  const bodyTextClass = cn(
    "text-twitter-text-primary dark:text-twitter-dark-text-primary whitespace-pre-wrap break-words",
    transitionClass,
    isMain ? "text-[17px]" : "text-[15px]",
    isMain && "mt-3",
    isQuote && "mt-1",
    isReply && "-mt-4 ml-11 pl-2",
    isQuote && "z-10"
  );
  const galleryVariant = isMain ? "main" : "quote";

  return (
    <>
      <div ref={bodyTextRef} className={bodyTextClass}>
        {richTextNodes.map(({ key, node }) => (
          <Fragment key={key}>{node}</Fragment>
        ))}
      </div>
      {(media || cardInfo || quotedTweetNode) && (
        <div
          className={cn("mt-3 flex flex-col gap-1", isReply && "ml-11 pl-2")}
          ref={cardRef}
        >
          {showMediaGallery && media ? (
            <MediaGallery
              media={media}
              variant={galleryVariant}
              className={cn(isQuote && "z-10")}
              onSelect={
                isReply
                  ? () => onSelect?.(tweet, controllerData ?? null)
                  : undefined
              }
            />
          ) : null}
          {cardInfo ? <CardPreview card={cardInfo} /> : null}
          {quotedTweetNode}
        </div>
      )}
      {isMain ? (
        <div className="text-twitter-text-secondary dark:text-twitter-dark-text-secondary my-4 flex flex-wrap items-center gap-1 text-[15px]">
          {createdAt ? <span>{createdAt}</span> : null}
          {viewsText ? <span>·</span> : null}
          {viewsText ? <span>{viewsText}</span> : null}
        </div>
      ) : null}
      {showActions ? (
        <TweetActions
          tweet={tweet}
          size={isMain ? "md" : "sm"}
          onReplyBtnClick={onToggleComposer}
          className={cn(isReply && "ml-11 pl-2")}
        />
      ) : null}
      {showActions ? (
        <ReplyComposer
          ref={composerRef}
          tweet={tweet}
          className={cn(
            isReply && "pl-[3.25rem] py-0",
            isMain && "border-twitter-divide-light border-b"
          )}
          expanded={composerOpen}
          onExpand={onComposerExpand}
          onCollapse={onComposerCollapse}
        />
      ) : null}
    </>
  );
};

export default TweetCardContent;
