import {
  MEDIA_NODE_SELECTOR,
  TWEET_ARTICLE_SELECTOR,
} from "@/constants/domSelectors";
import { dispatchOpenMediaOverlay } from "@/events/mediaOverlay";
import { resolveTweet } from "@/store/tweetsStore";
import { buildMediaOverlayItemsFromTweet } from "@/utils/responseData";
import {
  collectInlineMediaNodes,
  findTweetDomContext,
  getTweetDetailLink,
  parseTweetIdFromHref,
  rememberAvatarFromRoot,
} from "@/utils/tweetDom";
import { openTweetInSidebar } from "./sidebarController";

export const collectMediaNodes = (article: HTMLElement) =>
  Array.from(article.querySelectorAll<HTMLElement>(MEDIA_NODE_SELECTOR)).filter(
    (node) => node.closest(TWEET_ARTICLE_SELECTOR) === article
  );

export const handleTimelineMediaClick = (
  event: MouseEvent,
  targetElement: HTMLElement | null,
  checkOnly?: boolean
): boolean => {
  if (!targetElement) return false;
  const mediaTarget = targetElement.closest<HTMLElement>(MEDIA_NODE_SELECTOR);
  if (!mediaTarget) return false;

  const article = mediaTarget.closest<HTMLElement>(TWEET_ARTICLE_SELECTOR);
  if (!article) return false;

  const href = getTweetDetailLink(article);
  const tweetId = parseTweetIdFromHref(href);
  if (!tweetId) return false;

  const inlineContext = findTweetDomContext(mediaTarget, {
    allowInteractiveTarget: true,
  });
  const record = inlineContext?.tweet ?? resolveTweet(tweetId);
  const tweet = record?.result;
  if (!record || !tweet) return false;

  rememberAvatarFromRoot(tweet, inlineContext ? inlineContext.root : article);

  const overlayItems = buildMediaOverlayItemsFromTweet(tweet);
  if (overlayItems.length === 0) return false;

  const mediaNodes = inlineContext
    ? collectInlineMediaNodes(inlineContext.root)
    : collectMediaNodes(article);
  const targetIndex = mediaNodes.indexOf(mediaTarget);
  const resolvedItem =
    (targetIndex >= 0 ? overlayItems[targetIndex] : undefined) ??
    overlayItems[0] ??
    null;
  if (!resolvedItem) return false;

  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === "function") {
    event.stopImmediatePropagation();
  }

  if (checkOnly) return false;

  const videoTarget = mediaTarget.querySelector("video");
  if (videoTarget) {
    if (videoTarget.played) {
      videoTarget.pause();
    }
  }

  const activeKey = resolvedItem.key;
  const opened = openTweetInSidebar(inlineContext?.tweetId ?? tweetId);
  if (!opened) {
    return false;
  }
  requestAnimationFrame(() => {
    dispatchOpenMediaOverlay(overlayItems, activeKey);
  });

  return true;
};
