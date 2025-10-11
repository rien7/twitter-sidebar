import { useMediaOverlay } from "@/context/mediaOverlay";
import {
  buildRichTextNodes,
  extractAvatar,
  extractAvatarCache,
  extractCardInfo,
  extractName,
  extractViews,
  formatDateTime,
} from "@/components/tweet/tweetText";
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MouseEvent as ReactMouseEvent, RefObject } from "react";
import type { TweetLimitedAction, TweetResult } from "@/types/response";
import { useFlip } from "@/hooks/useFlip";
import { useSidebarRoot } from "@/context/sidebarRoot";
import { cn } from "@/utils/cn";
import { openTweetInSidebar } from "@/handlers/sidebarController";
import type { ReplyComposerHandle } from "../ReplyComposer";
import { TweetCardHeader } from "./TweetCardHeader";
import { TweetCardContent } from "./TweetCardContent";
import {
  SidebarContentRefContext,
  SidebarContentContext,
} from "@/context/SidebarTimelineContext";
import { extractPollInfo } from "@/utils/poll";

const useTweetComposer = () => {
  const [composerOpen, setComposerOpen] = useState(false);

  const onComposerExpand = useCallback(() => {
    setComposerOpen(true);
  }, []);

  const onComposerCollapse = useCallback(() => {
    setComposerOpen(false);
  }, []);

  const toggleComposer = useCallback(() => {
    setComposerOpen((value) => !value);
  }, []);

  return {
    composerOpen,
    onComposerExpand,
    onComposerCollapse,
    toggleComposer,
  } as const;
};

interface TweetCardProps {
  tweet: TweetResult;
  variant?: "main" | "quote" | "reply";
  onSelect?: (
    tweet: TweetResult,
    controllerData?: string | null,
    articleRef?: RefObject<HTMLElement | null>
  ) => void;
  linkTop?: boolean;
  linkBottom?: boolean;
  controllerData?: string | null;
  showDivider?: boolean;
  limitedActions?: TweetLimitedAction[] | null;
}

const TweetCard = ({
  tweet,
  variant = "main",
  onSelect,
  linkTop = false,
  linkBottom = false,
  controllerData,
  showDivider,
  limitedActions,
}: TweetCardProps) => {
  const { name, screenName } = extractName(tweet);
  const articleRef = useRef<HTMLElement | null>(null);
  const avatar = extractAvatar(tweet);
  const avatarCache = extractAvatarCache(tweet);
  const avatarRef = useRef<HTMLImageElement | null>(null);
  const userAvatarRef = useRef<HTMLAnchorElement | null>(null);
  const userNameRef = useRef<HTMLDivElement | null>(null);
  const userHandleRef = useRef<HTMLElement | null>(null);
  const bodyTextRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useSidebarRoot()!;
  const cardRef = useRef<HTMLDivElement | null>(null);

  const sidebarContentRefContext = useContext(SidebarContentRefContext);
  const headerRef = sidebarContentRefContext?.headerRef;
  const emptyAreaRef = sidebarContentRefContext?.emptyAreaRef;
  const scrollAreaRef = sidebarContentRefContext?.scrollAreaRef;
  const sidebarContentContext = useContext(SidebarContentContext);
  const mainTweetId = sidebarContentContext?.mainTweetId;
  const previousMainTweetId = useRef<string | null>(null);
  const conversationId = sidebarContentContext?.conversationId;
  const previousConversationId = useRef<string | null>(null);
  const timelineVersion = sidebarContentContext?.timelineVersion;
  const registerMainArticleRef = sidebarContentContext?.registerMainArticleRef;
  const mainArticleClientTopRef = sidebarContentContext?.mainArticleTopRef;

  const composerRef = useRef<ReplyComposerHandle>(null);
  const { composerOpen, onComposerExpand, onComposerCollapse, toggleComposer } =
    useTweetComposer();

  const legacy = tweet.legacy;
  const media = legacy?.extended_entities?.media ?? legacy?.entities?.media;
  const richTextNodes = useMemo(() => buildRichTextNodes(tweet), [tweet]);
  const createdAt = formatDateTime(
    legacy?.created_at,
    variant === "main" ? "long" : "relative"
  );
  const viewsText = extractViews(tweet);
  const quotedTweet =
    (tweet.quoted_status_result?.result?.__typename === "Tweet"
      ? (tweet.quoted_status_result.result as TweetResult)
      : undefined) ?? undefined;
  const mediaOverlay = useMediaOverlay();
  const cardInfo = useMemo(() => extractCardInfo(tweet), [tweet]);
  const pollInfo = useMemo(() => extractPollInfo(tweet), [tweet]);
  const isQuote = variant === "quote";
  const isReply = variant === "reply";
  const isMain = variant === "main";
  const showActions = !isQuote;
  const showMediaGallery = isMain ? !mediaOverlay?.activeMedia : true;
  const showTimestampInHeader = !isMain && Boolean(createdAt);
  const quotedTweetNode = quotedTweet ? (
    <div className="border-twitter-border-light dark:border-twitter-dark-border-light bg-twitter-background-surface dark:bg-twitter-dark-background-surface rounded-2xl border border-solid p-3">
      <TweetCard
        tweet={quotedTweet}
        variant="quote"
        controllerData={controllerData}
        limitedActions={null}
        onSelect={onSelect}
      />
    </div>
  ) : null;

  useEffect(() => {
    if (!avatarRef.current || !avatar) return;
    const img = new Image();
    img.src = avatar;
    img.onload = () => {
      if (!avatarRef.current) return;
      avatarRef.current.src = avatar;
    };
  }, [avatar]);

  const openInNewTab = useCallback(() => {
    const userName = screenName;
    const id = tweet.rest_id;
    const url = `https://x.com/${userName}/status/${id}`;
    window.open(url);
  }, [tweet, screenName]);

  useLayoutEffect(() => {
    if (
      !isMain ||
      !headerRef?.current ||
      !emptyAreaRef?.current ||
      !articleRef.current
    )
      return;
    const windowHeight = window.innerHeight;
    const headerHeight = headerRef.current.getBoundingClientRect().height;
    const articleHeight = articleRef.current.getBoundingClientRect().height;
    emptyAreaRef.current.style.height = `${
      windowHeight - headerHeight - articleHeight
    }px`;
  }, [isMain, headerRef, emptyAreaRef, articleRef]);

  useLayoutEffect(() => {
    const mainTweetChange = previousMainTweetId.current !== mainTweetId;
    const conversationChange =
      previousConversationId.current !== conversationId;

    previousMainTweetId.current = mainTweetId ?? null;
    previousConversationId.current = conversationId ?? null;

    if (!isMain || !articleRef.current || !scrollAreaRef?.current) return;

    const articleTop = articleRef.current.getBoundingClientRect().top;
    const scrollAreaTop = scrollAreaRef.current.getBoundingClientRect().top;

    if (mainTweetChange && !conversationChange && articleTop < scrollAreaTop) {
      // when a reply become main, after change, the article top < scroll top
      articleRef.current.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
    } else if (conversationChange) {
      // sidebar open
      articleRef.current.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
    }
    registerMainArticleRef?.(articleRef);
  }, [
    isMain,
    articleRef,
    scrollAreaRef,
    mainTweetId,
    conversationId,
    previousMainTweetId,
    previousConversationId,
    registerMainArticleRef,
  ]);

  useLayoutEffect(() => {
    if (!isMain || !articleRef.current || !scrollAreaRef?.current) return;
    if (mainArticleClientTopRef && mainArticleClientTopRef?.current !== null) {
      articleRef.current.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
      scrollAreaRef.current.scrollBy({
        behavior: "instant",
        top: -mainArticleClientTopRef.current,
      });
      mainArticleClientTopRef.current = null;
    }
  }, [
    isMain,
    articleRef,
    scrollAreaRef,
    mainArticleClientTopRef,
    timelineVersion,
  ]);

  useFlip(
    [
      userAvatarRef,
      { target: userNameRef, type: "text" },
      { target: userHandleRef, type: "text" },
      { target: bodyTextRef, type: "reflow" },
      { target: cardRef, type: "reflow" },
    ],
    [variant, tweet.rest_id, composerOpen, mainTweetId],
    {
      root: rootRef,
    }
  );

  useLayoutEffect(() => {
    if (composerOpen) {
      requestAnimationFrame(() => {
        composerRef.current?.focus();
      });
    }
  }, [composerOpen]);

  const handleCardClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (!onSelect) return;
    if (event.defaultPrevented) return;
    onSelect(tweet, controllerData ?? null, articleRef);
  };

  const articleClass = cn(
    "flex gap-3 items-start flex-col",
    isMain && "px-5 pt-4 relative",
    isReply &&
      "px-5 py-4 relative bg-twitter-background-surface dark:bg-twitter-dark-background-surface",
    isQuote && "rounded-2xl cursor-pointer",
    isReply &&
      showDivider &&
      `after:content-[''] after:absolute ${
        linkBottom ? "after:left-16" : "after:left-0"
      } after:right-0 after:bottom-0 after:h-px after:bg-twitter-border-light`,
    isReply &&
      linkBottom &&
      composerOpen &&
      "after:content-[''] after:absolute after:left-16 after:right-0 after:bottom-0 after:h-px after:bg-twitter-border-light"
  );

  const articleProps: {
    className: string;
    role?: string;
    tabIndex?: number;
    onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
  } = {
    className: articleClass,
  };

  if (isQuote) {
    const handleClickQuote = (event: ReactMouseEvent<HTMLElement>) => {
      if (event.defaultPrevented) return;
      event.stopPropagation();
      openTweetInSidebar(tweet.rest_id);
    };
    articleProps.role = "button";
    articleProps.tabIndex = 0;
    articleProps.onClick = handleClickQuote;
  } else if (onSelect) {
    articleProps.role = "button";
    articleProps.tabIndex = 0;
    articleProps.onClick = handleCardClick;
  }

  const showLinkTop = linkTop;
  const showLinkBottom = isReply && linkBottom;

  return (
    <>
      <article
        {...articleProps}
        tweet-id={tweet.rest_id}
        ref={articleRef}
        style={{ overflowAnchor: "none" }}
      >
        {showLinkTop ? (
          <span
            aria-hidden
            className="bg-twitter-text-divider dark:bg-twitter-dark-text-divider pointer-events-none absolute left-[2.625rem] top-0 h-3 w-0.5"
          />
        ) : null}
        {showLinkBottom ? (
          <span
            aria-hidden
            className="bg-twitter-text-divider dark:bg-twitter-dark-text-divider pointer-events-none absolute bottom-0 left-[2.625rem] top-16 w-0.5"
          />
        ) : null}
        <div
          className={cn(
            "w-full",
            isMain && "border-b border-twitter-divide-light"
          )}
        >
          <TweetCardHeader
            tweet={tweet}
            name={name}
            screenName={screenName}
            avatar={avatar}
            avatarCache={avatarCache}
            isMain={isMain}
            isReply={isReply}
            isQuote={isQuote}
            createdAt={createdAt ?? null}
            showTimestampInHeader={showTimestampInHeader}
            onOpenInNewTab={openInNewTab}
            avatarRef={avatarRef}
            userAvatarRef={userAvatarRef}
            userNameRef={userNameRef}
            userHandleRef={userHandleRef}
          />
          <TweetCardContent
            tweet={tweet}
            limitedActions={limitedActions ?? null}
            isMain={isMain}
            isReply={isReply}
            isQuote={isQuote}
            composerOpen={composerOpen}
            onToggleComposer={toggleComposer}
            onComposerExpand={onComposerExpand}
            onComposerCollapse={onComposerCollapse}
            createdAt={createdAt ?? null}
            viewsText={viewsText ?? null}
            richTextNodes={richTextNodes}
            media={media}
            cardInfo={cardInfo}
            poll={pollInfo}
            quotedTweetNode={quotedTweetNode}
            showActions={showActions}
            showMediaGallery={showMediaGallery}
            bodyTextRef={bodyTextRef}
            cardRef={cardRef}
            composerRef={composerRef}
            onSelect={onSelect}
            controllerData={controllerData ?? null}
          />
        </div>
      </article>
    </>
  );
};

export default TweetCard;
