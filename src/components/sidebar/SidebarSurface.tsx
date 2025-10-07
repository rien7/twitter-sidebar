import { useEffect, useMemo, useRef } from "react";
import { SidebarContent } from "./SidebarContent";
import {
  SIDEBAR_COLLAPSED_MAX_WIDTH,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
} from "@/constants/layout";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useScrollBoundaryLock } from "@/hooks/useScrollBoundaryLock";
import { useSidebarResize } from "@/hooks/useSidebarResize";
import { sidebarStore } from "@/store/sidebarStore";
import { useSidebarStore } from "@/hooks/useSidebarStore";
import { useMediaOverlay } from "@/context/mediaOverlay";
import type { CSSProperties } from "react";
import { cn } from "@/utils/cn";
import { SidebarRootContext } from "@/context/sidebarRoot";
import { SidebarContentContext } from "@/context/SidebarTimelineContext";

export const SidebarSurface = () => {
  const { isDark, background, accent } = useColorScheme();
  const { isOpen, pinned, width, tweet, tweetRelation, relateTweets, status } =
    useSidebarStore();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null!);

  const mediaOverlay = useMediaOverlay();
  const closeMedia = mediaOverlay?.closeMedia;
  const activeMedia = mediaOverlay?.activeMedia;
  const isSidebarCollapsed = mediaOverlay?.isSidebarCollapsed ?? false;

  const mainTweetId = tweet?.result.rest_id ?? null;
  const conversationId = tweet?.result.legacy?.conversation_id_str ?? null;
  const timelineVersionRef = useRef<number>(0);
  const previousMainTweetIdRef = useRef<string | null>(null);
  const firstOpenMainTweetIdRef = useRef<string | null>(null);

  useEffect(() => {
    timelineVersionRef.current += 1;
  }, [tweet, tweetRelation]);

  useEffect(() => {
    if (firstOpenMainTweetIdRef.current === null)
      firstOpenMainTweetIdRef.current = mainTweetId;
  }, [mainTweetId]);
  useEffect(() => {
    if (!isOpen) firstOpenMainTweetIdRef.current = null;
  }, [isOpen]);

  const { isResizing, handlePointerDown } = useSidebarResize(
    width,
    !isSidebarCollapsed
  );
  useScrollBoundaryLock(scrollAreaRef, isOpen);

  useEffect(() => {
    if (previousMainTweetIdRef.current !== mainTweetId) {
      if (activeMedia && closeMedia) {
        closeMedia();
      }
    }
    previousMainTweetIdRef.current = mainTweetId;
  }, [mainTweetId, activeMedia, closeMedia]);

  useEffect(() => {
    if (!isOpen && activeMedia && closeMedia) {
      closeMedia();
    }
  }, [isOpen, activeMedia, closeMedia]);

  const sidebarWidth = useMemo(
    () =>
      isSidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : `min(100vw, ${width}px)`,
    [isSidebarCollapsed, width]
  );

  const sidebarMaxWidth = useMemo(
    () =>
      isSidebarCollapsed
        ? SIDEBAR_COLLAPSED_MAX_WIDTH
        : `${SIDEBAR_WIDTH_MAX}px`,
    [isSidebarCollapsed]
  );

  return (
    <SidebarRootContext value={rootRef}>
      <SidebarContentContext
        value={{
          mainTweetId,
          conversationId,
          timelineVersion: timelineVersionRef.current,
          firstOpenMainTweetId: firstOpenMainTweetIdRef.current,
        }}
      >
        <div
          ref={rootRef}
          className={cn(
            "pointer-events-none fixed inset-0 z-[2147483645]",
            isDark && "dark"
          )}
          style={
            {
              "--color-twitter-background-surface": background,
              "--color-twitter-accent": accent,
            } as CSSProperties
          }
        >
          {isOpen && !pinned && !activeMedia ? (
            <button
              type="button"
              className="pointer-events-auto absolute inset-0 bg-black/30"
              onClick={() => sidebarStore.close()}
              aria-label="关闭侧边栏遮罩"
            />
          ) : null}
          <div
            className={cn(
              "pointer-events-auto absolute inset-y-0 right-0 translate-y-0",
              isResizing
                ? "transition-none"
                : "transition-all duration-300 ease-in-out",
              isOpen ? "translate-x-0" : "translate-x-full"
            )}
            data-flip-base-layer
            style={{ width: sidebarWidth, maxWidth: sidebarMaxWidth }}
          >
            <div
              data-flip-layer
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-10"
            />
            {!isSidebarCollapsed ? (
              <div
                role="slider"
                aria-valuemin={SIDEBAR_WIDTH_MIN}
                aria-valuemax={SIDEBAR_WIDTH_MAX}
                aria-valuenow={width}
                aria-orientation="vertical"
                aria-label="调整侧边栏宽度"
                tabIndex={0}
                className="absolute left-0 top-0 z-10 h-full w-1 cursor-ew-resize select-none opacity-0 transition-opacity hover:opacity-100 focus:opacity-100"
                style={{ background: "transparent" }}
                onPointerDown={handlePointerDown}
              />
            ) : null}
            <SidebarContent
              isOpen={isOpen}
              scrollAreaRef={scrollAreaRef}
              tweet={tweet}
              tweetRelation={tweetRelation}
              relateTweets={relateTweets}
              status={status}
              pinned={pinned}
              onTogglePinned={() => sidebarStore.togglePinned()}
              onClose={() => sidebarStore.close()}
            />
          </div>
        </div>
      </SidebarContentContext>
    </SidebarRootContext>
  );
};
