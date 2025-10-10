import { sidebarStore } from "@/store/sidebarStore";
import { resolveTweet } from "@/store/tweetsStore";
import { handleTimelineMediaClick } from "./timelineMediaClickHandler";
import {
  findTweetDomContext,
  getTweetDetailLink,
  isInteractiveElement,
  parseTweetIdFromHref,
  rememberAvatarFromRoot,
} from "@/utils/tweetDom";
import { openTweetInSidebar } from "./sidebarController";

const closeSidebarIfClickOutside = (event: MouseEvent) => {
  const { isOpen, pinned } = sidebarStore.getState();
  if (!isOpen || pinned || event.button !== 0) return;

  const host = document.getElementById("tsb-sidebar-host");
  if (!host) return;

  const path =
    typeof event.composedPath === "function" ? event.composedPath() : [];
  const clickedInsideSidebar =
    path.includes(host) ||
    (event.target instanceof Node && host.contains(event.target));
  if (!clickedInsideSidebar) {
    sidebarStore.close();
  }
};

const isPrimaryPlainClick = (event: MouseEvent) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

const normalizeTarget = (event: MouseEvent): HTMLElement | null => {
  const rawTarget = event.target as Node | null;
  if (!rawTarget) return null;
  if (rawTarget instanceof HTMLElement) {
    return rawTarget;
  }
  const parent = rawTarget.parentElement;
  return parent instanceof HTMLElement ? parent : null;
};

const isVideoController = (node: HTMLElement): boolean => {
  const scrubberEl = document.querySelector('[data-testid="scrubber"]');
  if (!scrubberEl) {
    const muteBtn =
      document.querySelector('button[aria-label="Mute"]') ??
      document.querySelector('button[aria-label="Unmute"]');
    if (!muteBtn) return false;
    const parentElement = muteBtn.parentElement;
    if (!parentElement) return false;
    return parentElement.contains(node);
  }
  const controllerEl = scrubberEl.parentElement;
  if (!controllerEl) return false;
  return controllerEl.contains(node);
};

const isCardPoll = (node: HTMLElement): boolean => {
  return node.getAttribute("data-testid") === "cardPoll";
};

const isCardPollCanPoll = (node: HTMLElement): boolean => {
  return node.querySelector('[role="radiogroup"]') !== null;
};

const findTimelineArticleRoot = (
  start: HTMLElement | null
): HTMLElement | null => {
  let node: HTMLElement | null = start;
  while (node && node !== document.documentElement) {
    if (
      node.tagName.toLowerCase() === "article" &&
      node.getAttribute("data-testid") === "tweet"
    ) {
      return node;
    }
    if (isCardPoll(node)) {
      if (isCardPollCanPoll(node)) return null;
    }
    if (isInteractiveElement(node)) {
      return null;
    }
    node = node.parentElement;
  }
  return null;
};

/**
 * Intercept timeline clicks so we can open tweets inside the sidebar instead of navigating away.
 */
export const registerGlobalClickInterceptor = () => {
  const handleClick = (event: MouseEvent) => {
    // 先处理侧边栏自身的关闭逻辑，保证外部点击能回收 Sidebar。
    closeSidebarIfClickOutside(event);

    // 仅劫持主按钮且未被阻止的点击，其他情况还交由原生处理。
    if (event.defaultPrevented || !isPrimaryPlainClick(event)) return;

    const targetElement = normalizeTarget(event);

    // 视频控制面板需要维持 Twitter 原有交互。
    if (targetElement && isVideoController(targetElement)) {
      return;
    }

    // 媒体点击交由 overlay 逻辑处理，若已处理则无需后续逻辑。
    if (handleTimelineMediaClick(event, targetElement)) {
      return;
    }

    // 引用推文命中后直接打开侧边栏并记忆头像。
    const inlineContext = findTweetDomContext(targetElement);
    if (inlineContext) {
      event.preventDefault();
      rememberAvatarFromRoot(inlineContext.tweet.result, inlineContext.root);
      openTweetInSidebar(inlineContext.tweetId);
      return;
    }

    // 沿 DOM 向上定位到 tweet article，遇到其它可交互区域时提前放行。
    const articleRoot = findTimelineArticleRoot(targetElement);
    if (!articleRoot) return;

    // 优先处理正文中的状态链接，保证通过 anchor 打开的推文可复用缓存。
    const targetAnchor = targetElement?.closest('a[href*="/status/"]');
    if (targetAnchor && articleRoot.contains(targetAnchor as Node)) {
      const tweetId = parseTweetIdFromHref(
        (targetAnchor as HTMLAnchorElement).getAttribute("href")
      );
      if (tweetId) {
        const record = resolveTweet(tweetId);
        if (!record) return;
        event.preventDefault();
        openTweetInSidebar(tweetId);
        return;
      }
    }

    // 其余可交互区域继续保留原生行为。
    if (isInteractiveElement(targetElement)) return;

    // 回退到整条推文的详情链接，命中缓存后打开侧边栏。
    const href = getTweetDetailLink(articleRoot);
    const tweetId = parseTweetIdFromHref(href);
    if (!tweetId) return;

    const record = resolveTweet(tweetId);
    if (!record) return;

    rememberAvatarFromRoot(record.result, articleRoot);

    event.preventDefault();
    openTweetInSidebar(tweetId);
  };
  const handlePointerDown = (event: MouseEvent) => {
    const targetElement = normalizeTarget(event);
    if (targetElement && isVideoController(targetElement)) {
      event.stopPropagation();
    }

    if (handleTimelineMediaClick(event, targetElement, true)) {
      event.stopPropagation();
    }
  };

  document.addEventListener("click", handleClick, { capture: true });
  document.addEventListener("pointerdown", handlePointerDown, {
    capture: true,
  });

  return () => {
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("click", handleClick, true);
  };
};
