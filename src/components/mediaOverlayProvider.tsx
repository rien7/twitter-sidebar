import {
  COLLAPSED_WIDTH_CSS,
  DEFAULT_ZOOM_STEPS,
  MediaOverlayContext,
  MediaOverlayContextValue,
  MIN_ZOOM_STEP_FACTOR,
} from "@/context/mediaOverlay";
import {
  MEDIA_OVERLAY_OPEN_EVENT,
  MEDIA_OVERLAY_CLOSE_EVENT,
} from "@/events/mediaOverlay";
import {
  OverlayCloseIcon,
  OverlayPreviousIcon,
  OverlayNextIcon,
} from "@/icons/MediaOverlayIcons";
import { MediaOverlayItem, MediaOverlayOpenDetail } from "@/types/mediaOverlay";
import {
  ReactNode,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  PointerEvent as ReactPointerEvent,
} from "react";

export const MediaOverlayProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<MediaOverlayItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [naturalSize, setNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [animateTransform, setAnimateTransform] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const blockClickRef = useRef(false);

  const itemsLength = items.length;
  const hasMultiple = itemsLength > 1;

  useEffect(() => {
    if (itemsLength === 0) {
      setCurrentIndex(0);
      return;
    }
    if (currentIndex >= itemsLength) {
      setCurrentIndex(itemsLength - 1);
    }
  }, [itemsLength, currentIndex]);

  const updateFitScale = useCallback((width: number, height: number) => {
    const container = containerRef.current;
    if (!container || width === 0 || height === 0) {
      setFitScale(1);
      return;
    }
    const rect = container.getBoundingClientRect();
    const availableWidth = rect.width;
    const availableHeight = rect.height;
    if (!availableWidth || !availableHeight) {
      setFitScale(1);
      return;
    }
    const scale = Math.min(availableWidth / width, availableHeight / height, 1);
    setFitScale(scale > 0 ? scale : 1);
  }, []);

  const openMedia = useCallback(
    (payload: MediaOverlayItem, group?: MediaOverlayItem[]) => {
      const baseItems = group && group.length > 0 ? [...group] : [payload];
      const index = Math.max(
        0,
        baseItems.findIndex((item) => item.key === payload.key)
      );
      setItems(baseItems);
      setCurrentIndex(index);
      setIsCollapsed(true);
      setZoomIndex(0);
      setDisplaySrc(payload.kind === "photo" ? payload.previewSrc : null);
      setOffset({ x: 0, y: 0 });
      setNaturalSize(null);
      setFitScale(1);
      setAnimateTransform(false);
    },
    []
  );

  const closeMedia = useCallback(() => {
    setItems([]);
    setCurrentIndex(0);
    setIsCollapsed(false);
    setZoomIndex(0);
    setDisplaySrc(null);
    setOffset({ x: 0, y: 0 });
    setNaturalSize(null);
    setFitScale(1);
    setAnimateTransform(false);
  }, []);

  const showPrevious = useCallback(() => {
    if (!hasMultiple) return;
    setCurrentIndex((index) => (index - 1 + itemsLength) % itemsLength);
    setZoomIndex(0);
    setOffset({ x: 0, y: 0 });
  }, [hasMultiple, itemsLength]);

  const showNext = useCallback(() => {
    if (!hasMultiple) return;
    setCurrentIndex((index) => (index + 1) % itemsLength);
    setZoomIndex(0);
    setOffset({ x: 0, y: 0 });
  }, [hasMultiple, itemsLength]);

  const zoomLevels = useMemo(() => {
    // Base level is 1 (fit-to-contain). Max level should reach container width / image natural width.
    if (!naturalSize || !containerRef.current || fitScale <= 0) return [1];
    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width || 1;
    const containerHeight = rect.height || 1;
    const widthScale = containerWidth / naturalSize.width; // scale needed to make image width == container width
    const heightScale = containerHeight / naturalSize.height;
    // relative to the current contain base (which is natural * fitScale)
    const maxRelative = Math.max(
      1,
      Math.max(widthScale, heightScale) / fitScale
    );

    // Build geometric steps from 1 -> maxRelative (inclusive)
    let steps = Math.max(2, DEFAULT_ZOOM_STEPS);
    // If the geometric step between adjacent levels is too small, reduce steps
    // until each step factor >= MIN_ZOOM_STEP_FACTOR, or we drop to 2 steps.
    while (steps > 2) {
      const r = Math.pow(maxRelative, 1 / (steps - 1));
      if (r >= MIN_ZOOM_STEP_FACTOR) break;
      steps -= 1;
    }

    // If even with 2 steps the factor is too small, collapse to a single level.
    if (steps === 2 && maxRelative < MIN_ZOOM_STEP_FACTOR) return [1];

    const ratio = Math.pow(maxRelative, 1 / (steps - 1));
    const arr = Array.from({ length: steps }, (_, i) => Math.pow(ratio, i));
    // round to 3 decimals to avoid float jitter
    return arr.map((v) => Math.round(v * 1000) / 1000);
  }, [naturalSize, fitScale]);

  useEffect(() => {
    setZoomIndex((i) => Math.min(i, Math.max(0, zoomLevels.length - 1)));
  }, [zoomLevels.length]);

  const cycleZoom = useCallback(() => {
    setAnimateTransform(true);
    setZoomIndex((index) => (index + 1) % zoomLevels.length);
  }, [zoomLevels.length]);

  const zoomLevel = useMemo(
    () => zoomLevels[Math.min(zoomIndex, zoomLevels.length - 1)] ?? 1,
    [zoomIndex, zoomLevels]
  );
  const activeMedia =
    itemsLength > 0
      ? items[Math.min(currentIndex, itemsLength - 1)] ?? null
      : null;
  const isSidebarCollapsed = isCollapsed && itemsLength > 0;
  const zoomEnabled = activeMedia?.kind === "photo";
  const canPan = zoomEnabled && zoomLevel > 1;
  const isMaxZoom = zoomEnabled && zoomIndex === zoomLevels.length - 1;
  const isDragging = dragStateRef.current?.moved ?? false;

  useEffect(() => {
    if (!activeMedia) {
      setDisplaySrc(null);
      setOffset({ x: 0, y: 0 });
      setNaturalSize(null);
      setFitScale(1);
      return;
    }
    if (activeMedia.kind === "video") {
      // Videos do not use image preload or zoom; ensure clean state.
      setDisplaySrc(null);
      setOffset({ x: 0, y: 0 });
      setNaturalSize(null);
      setFitScale(1);
      return;
    }
    // Photo: set preview, then attempt to upgrade to full
    setDisplaySrc(activeMedia.previewSrc);
    setOffset({ x: 0, y: 0 });
    setNaturalSize(null);
    setFitScale(1);

    if (
      !activeMedia.fullSrc ||
      activeMedia.fullSrc === activeMedia.previewSrc
    ) {
      return;
    }

    let cancelled = false;
    const highResImage = new Image();
    highResImage.src = activeMedia.fullSrc;
    highResImage.onload = () => {
      if (!cancelled) {
        setDisplaySrc(activeMedia.fullSrc ?? null);
        setNaturalSize({
          width: highResImage.naturalWidth,
          height: highResImage.naturalHeight,
        });
      }
    };
    return () => {
      cancelled = true;
    };
  }, [activeMedia]);

  useEffect(() => {
    if (!activeMedia) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMedia();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeMedia, closeMedia]);

  useEffect(() => {
    if (!naturalSize) return;
    updateFitScale(naturalSize.width, naturalSize.height);
  }, [naturalSize, updateFitScale]);

  useEffect(() => {
    if (!naturalSize) return;
    const handleResize = () => {
      updateFitScale(naturalSize.width, naturalSize.height);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [naturalSize, updateFitScale]);

  useEffect(() => {
    if (!naturalSize) return;
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      updateFitScale(naturalSize.width, naturalSize.height);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [naturalSize, updateFitScale]);

  useEffect(() => {
    if (zoomLevel === 1) {
      setOffset({ x: 0, y: 0 });
    }
  }, [zoomLevel, fitScale]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!canPan) return;
      if (event.button !== 0) return;
      event.stopPropagation();
      setAnimateTransform(false);
      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: offset.x,
        originY: offset.y,
        moved: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canPan, offset.x, offset.y]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragStateRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved) {
        const threshold = 3;
        if (Math.abs(dx) >= threshold || Math.abs(dy) >= threshold) {
          drag.moved = true;
        }
      }
      const nextX = drag.originX + dx;
      const nextY = drag.originY + dy;
      setOffset((previous) => {
        if (previous.x === nextX && previous.y === nextY) {
          return previous;
        }
        return { x: nextX, y: nextY };
      });
    },
    []
  );

  const releasePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) {
      blockClickRef.current = true;
      setTimeout(() => {
        blockClickRef.current = false;
      }, 0);
    }
    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      releasePointer(event);
    },
    []
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      releasePointer(event);
    },
    []
  );

  const contextValue = useMemo<MediaOverlayContextValue>(
    () => ({
      activeMedia,
      isSidebarCollapsed,
      zoomLevel,
      openMedia,
      closeMedia,
      cycleZoom,
      hasPrevious: hasMultiple,
      hasNext: hasMultiple,
      showPrevious,
      showNext,
    }),
    [
      activeMedia,
      isSidebarCollapsed,
      zoomLevel,
      openMedia,
      closeMedia,
      cycleZoom,
      hasMultiple,
      showPrevious,
      showNext,
    ]
  );

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const { detail } = event as CustomEvent<MediaOverlayOpenDetail>;
      const itemsFromEvent = detail?.items ?? [];
      if (!Array.isArray(itemsFromEvent) || itemsFromEvent.length === 0) return;
      const sanitizedItems = itemsFromEvent.filter(
        Boolean
      ) as MediaOverlayItem[];
      if (sanitizedItems.length === 0) return;
      const preferredKey = detail?.activeKey;
      const targetItem =
        sanitizedItems.find((item) => item.key === preferredKey) ??
        sanitizedItems[0] ??
        null;
      if (!targetItem) return;
      openMedia(targetItem, sanitizedItems);
    };

    const handleClose = () => {
      closeMedia();
    };

    window.addEventListener(
      MEDIA_OVERLAY_OPEN_EVENT,
      handleOpen as EventListener
    );
    window.addEventListener(MEDIA_OVERLAY_CLOSE_EVENT, handleClose);
    return () => {
      window.removeEventListener(
        MEDIA_OVERLAY_OPEN_EVENT,
        handleOpen as EventListener
      );
      window.removeEventListener(MEDIA_OVERLAY_CLOSE_EVENT, handleClose);
    };
  }, [openMedia, closeMedia]);

  const resolvedSrc =
    activeMedia && activeMedia.kind === "photo"
      ? displaySrc ?? activeMedia.previewSrc
      : null;
  // Let CSS contain the image at 100% of container; only scale for zoom.
  const effectiveScale = zoomLevel;
  const hasZoom = zoomEnabled && zoomLevels.length > 1;
  const interactionCursor = !hasZoom
    ? "default"
    : isDragging
    ? "grabbing"
    : isMaxZoom
    ? "zoom-out"
    : "zoom-in";

  return (
    <MediaOverlayContext.Provider value={contextValue}>
      {children}
      {activeMedia ? (
        <div
          className="pointer-events-auto fixed inset-y-0 left-0 z-[2147483644] flex justify-center bg-black/60 backdrop-blur-sm transition-opacity"
          style={{ right: COLLAPSED_WIDTH_CSS }}
          onClick={(event) => {
            event.stopPropagation();
            closeMedia();
          }}
        >
          <div className="relative flex h-full w-full justify-center px-6 py-8">
            <button
              type="button"
              aria-label="关闭预览"
              className="absolute right-6 top-6 z-20 rounded-full border border-white/30 bg-black/50 p-2 text-white shadow-lg transition hover:bg-black/70"
              onClick={(event) => {
                event.stopPropagation();
                closeMedia();
              }}
            >
              <OverlayCloseIcon size={20} />
            </button>
            {hasMultiple ? (
              <>
                <button
                  type="button"
                  aria-label="上一张"
                  className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white shadow-lg transition hover:bg-black/70"
                  onClick={(event) => {
                    event.stopPropagation();
                    showPrevious();
                  }}
                >
                  <OverlayPreviousIcon size={20} />
                </button>
                <button
                  type="button"
                  aria-label="下一张"
                  className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white shadow-lg transition hover:bg-black/70"
                  onClick={(event) => {
                    event.stopPropagation();
                    showNext();
                  }}
                >
                  <OverlayNextIcon size={20} />
                </button>
              </>
            ) : null}
            <div className="relative flex max-h-full flex-1 items-center justify-center">
              <div
                ref={containerRef}
                className="pointer-events-none relative flex h-full w-full items-center justify-center"
                style={{ overflow: canPan ? "visible" : "hidden" }}
              >
                {activeMedia?.kind === "photo" && resolvedSrc ? (
                  <img
                    ref={imgRef}
                    src={resolvedSrc}
                    alt={activeMedia.alt}
                    className="pointer-events-auto z-10 select-none"
                    style={{
                      cursor: interactionCursor,
                      transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${effectiveScale})`,
                      transformOrigin: "center center",
                      userSelect: "none",
                      objectFit: "contain",
                      width: "auto",
                      height: "auto",
                      maxWidth: "100%",
                      maxHeight: "100%",
                      transition: animateTransform
                        ? "transform 250ms ease-out"
                        : "none",
                      flexShrink: 0,
                    }}
                    draggable={false}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (blockClickRef.current) {
                        blockClickRef.current = false;
                        return;
                      }
                      cycleZoom();
                    }}
                    onLoad={(event) => {
                      const target = event.currentTarget;
                      setNaturalSize({
                        width: target.naturalWidth,
                        height: target.naturalHeight,
                      });
                    }}
                  />
                ) : null}
                {activeMedia?.kind === "video" ? (
                  <video
                    className="pointer-events-auto z-10 select-none"
                    style={{
                      cursor: "default",
                      userSelect: "none",
                      objectFit: "contain",
                      width: "auto",
                      height: "auto",
                      maxWidth: "100%",
                      maxHeight: "100%",
                      flexShrink: 0,
                    }}
                    poster={activeMedia.poster}
                    controls={!activeMedia.isGif}
                    autoPlay={activeMedia.isGif}
                    loop={activeMedia.isGif}
                    muted={activeMedia.isGif}
                    onClick={(event) => {
                      // Prevent closing overlay when clicking on video controls
                      event.stopPropagation();
                    }}
                    aria-label={activeMedia.alt}
                  >
                    {activeMedia.source ? (
                      <source
                        src={activeMedia.source.url}
                        type={activeMedia.source.content_type}
                      />
                    ) : null}
                  </video>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </MediaOverlayContext.Provider>
  );
};
