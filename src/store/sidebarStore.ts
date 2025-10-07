import type { SidebarState, SidebarTweetStatus } from "#/sidebar";
import { TweetData, TweetRelation } from "@/types/tweet";

const listeners = new Set<() => void>();

const WIDTH_STORAGE_KEY = "xSidebarWidthPx";
const MIN_WIDTH = 420;
const MAX_WIDTH = 680;

const clampWidth = (w: number) =>
  Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(w)));

const getInitialWidth = (): number => {
  try {
    const raw = localStorage.getItem(WIDTH_STORAGE_KEY);
    if (!raw) return 560;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return clampWidth(parsed);
  } catch {
    /* ignore */
  }
  return 560;
};

let state: SidebarState = {
  isOpen: false,
  tweetId: null,
  pinned: false,
  width: getInitialWidth(),
  tweet: null,
  tweetRelation: null,
  relateTweets: null,
  status: "idle",
};

const emit = () => {
  listeners.forEach((listener) => listener());
};

const updateState = (updater: (previous: SidebarState) => SidebarState) => {
  state = updater(state);
  emit();
};

export const sidebarStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getState() {
    return state;
  },
  openTweet(
    tweet: TweetData,
    tweetRelation: TweetRelation | null,
    relateTweets: Record<string, TweetData> | null,
    status: SidebarTweetStatus
  ) {
    updateState((previous) => ({
      ...previous,
      isOpen: true,
      tweetId: tweet.result.rest_id,
      tweet,
      tweetRelation,
      relateTweets,
      status,
    }));
  },
  togglePinned() {
    updateState((previous) => ({
      ...previous,
      pinned: !previous.pinned,
    }));
  },
  setWidth(widthPx: number) {
    const next = clampWidth(widthPx);
    updateState((previous) => {
      if (previous.width === next) return previous;
      try {
        localStorage.setItem(WIDTH_STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return {
        ...previous,
        width: next,
      };
    });
  },
  close() {
    updateState((previous) => ({
      ...previous,
      isOpen: false,
      pinned: false,
      tweet: null,
      tweetId: null,
      tweetRelation: null,
      relateTweets: null,
      status: "idle",
    }));
  },
};
