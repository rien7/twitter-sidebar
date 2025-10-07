import {
  TWEET_ROOT_SELECTOR,
  INTERACTIVE_ROOT_SELECTOR,
  MEDIA_NODE_SELECTOR,
  TWEET_ARTICLE_SELECTOR,
  TWEET_AVATAR_SELECTOR,
  TWEET_USER_NAME_SELECTOR,
  TWEET_STATUS_A_SELECTOR,
} from "@/constants/domSelectors";
import { TweetResult } from "@/types/response";
import {
  getTweetIdFromTweet,
  getUserFromTweet,
  getUserIdFromTweet,
  isTweetResult,
} from "./responseData";
import { TweetContext } from "@/types/sidebar";
import { getTweet, resolveTweet, storeTweet } from "@/store/tweetsStore";
import { rememberAvatarById } from "@/store/avatarStore";
import { TweetData } from "@/types/tweet";

type FindTweetDomOptions = {
  allowInteractiveTarget?: boolean;
};

const isTweetDomRoot = (node: HTMLElement): boolean => {
  if (node.matches(TWEET_ROOT_SELECTOR)) {
    return true;
  }
  if (node.getAttribute("role") !== "link") {
    return false;
  }
  if (node.tabIndex !== 0) {
    return false;
  }
  if (!node.closest(TWEET_ARTICLE_SELECTOR)) {
    return false;
  }
  const avatarNode = node.querySelector(TWEET_AVATAR_SELECTOR);
  const hasAvatar = avatarNode !== null;
  const hasUserName = Boolean(node.querySelector(TWEET_USER_NAME_SELECTOR));
  return hasAvatar && hasUserName;
};

const findTweetDomRoot = (target: HTMLElement | null): HTMLElement | null => {
  if (!target) return null;
  const explicit = target.closest<HTMLElement>(TWEET_ROOT_SELECTOR);
  if (explicit) {
    return explicit;
  }
  let node: HTMLElement | null = target;
  while (node && node !== document.documentElement) {
    if (isTweetDomRoot(node)) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
};

const extractQuotedTweet = (
  tweet: TweetResult | null | undefined
): TweetResult | null => {
  if (!tweet) return null;
  const direct =
    (tweet.quoted_status_result?.result?.__typename === "Tweet"
      ? (tweet.quoted_status_result.result as TweetResult)
      : undefined) ?? null;
  if (direct) return direct;

  const legacy = tweet.legacy as
    | { quoted_status_result?: { result?: TweetResult | null } }
    | undefined;
  const legacyResult = legacy?.quoted_status_result?.result ?? null;
  if (legacyResult && isTweetResult(legacyResult)) {
    return legacyResult;
  }

  return null;
};

export const collectInlineMediaNodes = (inlineRoot: HTMLElement) =>
  Array.from(inlineRoot.querySelectorAll<HTMLElement>(MEDIA_NODE_SELECTOR));

const findAvatarImage = (
  root: HTMLElement | null
): HTMLImageElement | null => {
  if (!root) return null;
  return (
    root.querySelector<HTMLImageElement>("[data-testid=\"Tweet-User-Avatar\"] img") ??
    root.querySelector<HTMLImageElement>("[data-testid=\"UserAvatar\"] img") ??
    null
  );
};

export const rememberAvatarFromRoot = (
  tweet: TweetResult,
  root: HTMLElement | null
) => {
  if (!root) return;
  const image = findAvatarImage(root);
  if (!image) return;
  const url = image.currentSrc || image.src;
  if (!url) return;
  const user = getUserFromTweet(tweet);
  const userId = getUserIdFromTweet(tweet, user);
  rememberAvatarById(userId, url ?? undefined);
};

/**
 * Detect whether an element belongs to an interactive control that should keep its default
 * behaviour even when we intercept the click.
 */
export const isInteractiveElement = (node: HTMLElement | null): boolean => {
  if (!node) return false;
  if (
    node.closest('a,button,[role="link"],[role="button"],input,textarea,select')
  )
    return true;
  return false;
};

/**
 * Helper that extracts the tweet id from a timeline status anchor.
 */
export const parseTweetIdFromHref = (
  href: string | null | undefined
): string | null => {
  if (!href) return null;
  const match = /status\/(\d+)/.exec(href);
  return match?.[1] ?? null;
};

/**
 * Find the primary TweetDetail link inside an article node.
 */
export const getTweetDetailLink = (node: HTMLElement): string | null => {
  const isTweet =
    node.tagName === "ARTICLE" && node.getAttribute("data-testid") === "tweet";
  if (!isTweet) return null;

  const anchors = Array.from(
    node.querySelectorAll<HTMLAnchorElement>(TWEET_STATUS_A_SELECTOR)
  );
  for (const anchor of anchors) {
    const href = anchor.getAttribute("href");
    if (!href || !/\/status\/(\d+)/.test(href)) continue;
    if (!node.contains(anchor)) continue;
    const closestTweet = anchor.closest(TWEET_ARTICLE_SELECTOR);
    if (closestTweet !== node) continue;
    const hasTime = Boolean(anchor.querySelector("time"));
    const isPrimaryLink =
      anchor.getAttribute("role") === "link" &&
      anchor.getAttribute("tabindex") === "-1";
    if (hasTime || isPrimaryLink) {
      return href;
    }
  }

  return null;
};

export const findTweetDomContext = (
  target: HTMLElement | null,
  options?: FindTweetDomOptions
): TweetContext | null => {
  if (!target) return null;
  const inlineRoot = findTweetDomRoot(target);
  if (!inlineRoot) return null;
  const article = inlineRoot.closest(TWEET_ARTICLE_SELECTOR);
  if (!article) return null;

  if (!options?.allowInteractiveTarget) {
    let node: HTMLElement | null = target;
    while (node && node !== inlineRoot) {
      if (isInteractiveElement(node)) {
        const interactiveRoot = node.closest<HTMLElement>(
          INTERACTIVE_ROOT_SELECTOR
        ) as HTMLElement;
        if (interactiveRoot && interactiveRoot !== inlineRoot) {
          return null;
        }
        if (!interactiveRoot && node.closest(MEDIA_NODE_SELECTOR)) {
          return null;
        }
      }
      node = node.parentElement;
    }
  }

  let tweetId: string | null = null;
  let record: TweetData | null = null;

  const anchor = inlineRoot.querySelector<HTMLAnchorElement>(
    TWEET_STATUS_A_SELECTOR
  );
  const anchorTweetId = parseTweetIdFromHref(anchor?.getAttribute("href"));
  if (anchorTweetId) {
    tweetId = anchorTweetId;
    record = resolveTweet(anchorTweetId);
  }

  if (!record) {
    const parentHref = getTweetDetailLink(article as HTMLElement);
    const parentTweetId = parseTweetIdFromHref(parentHref);
    if (!parentTweetId) return null;

    const parentRecord = resolveTweet(parentTweetId);
    if (!parentRecord) return null;

    const quotedTweet = extractQuotedTweet(parentRecord.result);
    if (!quotedTweet) return null;

    const quotedTweetId = getTweetIdFromTweet(quotedTweet);
    if (!quotedTweetId) return null;

    tweetId = quotedTweetId;
    record = resolveTweet(quotedTweetId);
    if (!record) {
      storeTweet(quotedTweet, parentRecord.controllerData ?? null);
      record = getTweet(quotedTweetId) ?? null;
    }
  }

  if (!record || !tweetId) return null;

  return { tweetId, tweet: record, root: inlineRoot };
};
