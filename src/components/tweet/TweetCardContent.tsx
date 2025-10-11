import { Fragment, RefObject, type ReactNode, useMemo } from "react";
import CardPreview from "@/components/tweet/CardPreview";
import MediaGallery from "@/components/tweet/MediaGallery";
import TweetActions from "@/components/tweet/TweetActions";
import ReplyComposer, { ReplyComposerHandle } from "../ReplyComposer";
import TweetPoll from "@/components/tweet/TweetPoll";
import type {
  MediaEntity,
  TweetLimitedAction,
  TweetResult,
} from "@/types/response";
import type { TweetCardInfo } from "@/components/tweet/tweetText";
import { cn } from "@/utils/cn";
import { getProtected, getUserFromTweet } from "@/utils/responseData";
import type { TweetPollInfo } from "@/types/poll";

interface TweetCardContentProps {
  tweet: TweetResult;
  limitedActions?: TweetLimitedAction[] | null;
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
  poll?: TweetPollInfo | null;
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
  limitedActions,
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
  poll,
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
  const galleryVariant = isMain ? "main" : "other";
  const isProtected = getProtected(getUserFromTweet(tweet));
  const showMedia =
    showMediaGallery && Array.isArray(media) && media.length > 0;
  const showPoll = Boolean(poll);
  const showCardPreview = Boolean(cardInfo);
  const showQuote = Boolean(quotedTweetNode);
  const hasSupplementary =
    showMedia || showPoll || showCardPreview || showQuote;
  const disabledActions = useMemo(() => {
    const disabled = new Set<"reply" | "retweet">();
    if (isProtected) {
      disabled.add("retweet");
    }
    if (
      limitedActions?.some(
        (action) =>
          typeof action?.action === "string" &&
          action.action.toLowerCase() === "reply"
      )
    ) {
      disabled.add("reply");
    }
    return disabled.size > 0 ? disabled : undefined;
  }, [isProtected, limitedActions]);

  return (
    <>
      <div ref={bodyTextRef} className={bodyTextClass}>
        {richTextNodes.map(({ key, node }) => (
          <Fragment key={key}>{node}</Fragment>
        ))}
      </div>
      {hasSupplementary && (
        <div
          className={cn("mt-3 flex flex-col gap-1", isReply && "ml-11 pl-2")}
          ref={cardRef}
        >
          {showPoll ? (
            <TweetPoll
              tweetId={tweet.rest_id}
              poll={poll!}
              controllerData={controllerData ?? null}
              className={cn(isQuote && "z-10")}
            />
          ) : null}
          {showMedia ? (
            <MediaGallery
              media={media!}
              variant={galleryVariant}
              className={cn(isQuote && "z-10")}
              onSelect={
                isReply || isQuote
                  ? () => onSelect?.(tweet, controllerData ?? null)
                  : undefined
              }
            />
          ) : null}
          {showCardPreview ? <CardPreview card={cardInfo!} /> : null}
          {showQuote ? quotedTweetNode : null}
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
          disanleAction={disabledActions}
          className={cn(isReply && "ml-11 pl-2")}
        />
      ) : null}
      {showActions ? (
        <ReplyComposer
          ref={composerRef}
          tweet={tweet}
          className={cn(
            isReply && "pl-[3.25rem] py-0",
            isMain && "border-twitter-divide-light border-t"
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
