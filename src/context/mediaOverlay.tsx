import {
  createContext,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { MEDIA_OVERLAY_CLOSE_EVENT, MEDIA_OVERLAY_OPEN_EVENT } from '@/events/mediaOverlay'
import { OverlayCloseIcon, OverlayNextIcon, OverlayPreviousIcon } from '@/icons/MediaOverlayIcons'
import { MediaOverlayItem, MediaOverlayOpenDetail } from '@/types/mediaOverlay'
import { cn } from '@/utils/cn'

export interface MediaOverlayContextValue {
  activeTweetId: string | null
  activeMedia: MediaOverlayItem | null
  isSidebarCollapsed: boolean
  zoomLevel: number
  openMedia: (tweetId: string, payload: MediaOverlayItem, group?: MediaOverlayItem[]) => void
  closeMedia: () => void
  cycleZoom: () => void
  hasPrevious: boolean
  hasNext: boolean
  showPrevious: () => void
  showNext: () => void
}

const MediaOverlayContext = createContext<MediaOverlayContextValue | null>(null)
export const COLLAPSED_WIDTH_CSS = 'min(100vw, 420px)'
const DEFAULT_ZOOM_STEPS = 5 // includes the base 1x and the max step
const MIN_ZOOM_STEP_FACTOR = 1.4 // shrink steps until each adjacent factor >= 1.15; collapse to single level if below

export const useMediaOverlay = () => use(MediaOverlayContext)

export function MediaOverlayProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MediaOverlayItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [zoomIndex, setZoomIndex] = useState(0)
  const [displaySrc, setDisplaySrc] = useState<string | null>(null)
  const [offset, setOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 })
  const [containerRect, setContainerRect] = useState<{ width: number, height: number } | null>(null)
  const [naturalSize, setNaturalSize] = useState<{ width: number, height: number } | null>(null)
  const [animateTransform, setAnimateTransform] = useState(false)

  const activeTweetIdRef = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const blockClickRef = useRef(false)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const dragStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)

  const preloadImageRef = useRef<{ cancel: () => void } | null>(null)
  const syncActiveMedia = useCallback((media: MediaOverlayItem | null) => {
    preloadImageRef.current?.cancel()
    preloadImageRef.current = null

    if (!media || media.kind === 'video') {
      setDisplaySrc(null)
      setOffset({ x: 0, y: 0 })
      setNaturalSize(null)
      return
    }

    setDisplaySrc(media.previewSrc)
    setOffset({ x: 0, y: 0 })
    setNaturalSize(null)

    if (!media.fullSrc || media.fullSrc === media.previewSrc) return

    let cancelled = false
    const highResImage = new Image()
    highResImage.src = media.fullSrc
    highResImage.onload = () => {
      if (cancelled) return
      setNaturalSize({
        width: highResImage.naturalWidth,
        height: highResImage.naturalHeight,
      })
      setDisplaySrc(media.fullSrc!)
    }
    preloadImageRef.current = {
      cancel: () => {
        cancelled = true
      },
    }
  }, [])

  const fitScale = useMemo(() => {
    if (!containerRect || !naturalSize) return 1
    const scale = Math.min(containerRect.width / naturalSize.width, containerRect.height / naturalSize.height, 1)
    return scale > 0 ? scale : 1
  }, [containerRect, naturalSize])

  const openMedia = useCallback((tweetId: string, payload: MediaOverlayItem, group?: MediaOverlayItem[]) => {
    const baseItems = group && group.length > 0 ? [...group] : [payload]
    const index = Math.max(0, baseItems.findIndex(item => item.key === payload.key))
    setItems(baseItems)
    setCurrentIndex(index)
    setIsCollapsed(true)
    setZoomIndex(0)
    setAnimateTransform(false)
    activeTweetIdRef.current = tweetId
    syncActiveMedia(baseItems[index])
  }, [syncActiveMedia])

  const closeMedia = useCallback(() => {
    setItems([])
    setCurrentIndex(0)
    setIsCollapsed(false)
    setZoomIndex(0)
    setAnimateTransform(false)
    activeTweetIdRef.current = null
    syncActiveMedia(null)
  }, [syncActiveMedia])

  const showPrevious = useCallback(() => {
    if (items.length === 0) return
    setZoomIndex(0)
    setCurrentIndex((index) => {
      const nextIndex = (index - 1 + items.length) % items.length
      syncActiveMedia(items[nextIndex])
      return nextIndex
    })
  }, [items, syncActiveMedia])

  const showNext = useCallback(() => {
    if (items.length === 0) return
    setZoomIndex(0)
    setCurrentIndex((index) => {
      const nextIndex = (index + 1) % items.length
      syncActiveMedia(items[nextIndex])
      return nextIndex
    })
  }, [items, syncActiveMedia])

  const zoomLevels = useMemo(() => {
    // Base level is 1 (fit-to-contain). Max level should reach container width / image natural width.
    if (!naturalSize || !containerRect || fitScale <= 0) return [1]
    const containerWidth = containerRect.width || 1
    const containerHeight = containerRect.height || 1
    const widthScale = containerWidth / naturalSize.width // scale needed to make image width == container width
    const heightScale = containerHeight / naturalSize.height
    // relative to the current contain base (which is natural * fitScale)
    const maxRelative = Math.max(1, Math.max(widthScale, heightScale) / fitScale)

    // Build geometric steps from 1 -> maxRelative (inclusive)
    let steps = Math.max(2, DEFAULT_ZOOM_STEPS)
    // If the geometric step between adjacent levels is too small, reduce steps
    // until each step factor >= MIN_ZOOM_STEP_FACTOR, or we drop to 2 steps.
    while (steps > 2) {
      const r = Math.pow(maxRelative, 1 / (steps - 1))
      if (r >= MIN_ZOOM_STEP_FACTOR) break
      steps -= 1
    }

    // If even with 2 steps the factor is too small, collapse to a single level.
    if (steps === 2 && maxRelative < MIN_ZOOM_STEP_FACTOR) return [1]

    const ratio = Math.pow(maxRelative, 1 / (steps - 1))
    const arr = Array.from({ length: steps }, (_, i) => Math.pow(ratio, i))
    // round to 3 decimals to avoid float jitter
    return arr.map(v => Math.round(v * 1000) / 1000)
  }, [naturalSize, fitScale, containerRect])

  const cycleZoom = useCallback(() => {
    setAnimateTransform(true)
    setZoomIndex((index) => {
      const nextIndex = (index + 1) % zoomLevels.length
      if (zoomLevels[nextIndex] === 1) {
        setOffset({ x: 0, y: 0 })
      }
      return nextIndex
    })
  }, [zoomLevels])

  const zoomLevel = useMemo(() =>
    zoomLevels[Math.min(zoomIndex, zoomLevels.length - 1)] ?? 1,
  [zoomIndex, zoomLevels])

  const activeMedia = items.length > 0
    ? items[Math.min(currentIndex, items.length - 1)] ?? null
    : null
  const isSidebarCollapsed = isCollapsed && items.length > 0
  const zoomEnabled = activeMedia?.kind === 'photo'
  const canPan = zoomEnabled && zoomLevel > 1
  const isMaxZoom = zoomEnabled && zoomIndex === zoomLevels.length - 1
  const isDragging = dragStateRef.current?.moved ?? false

  useEffect(() => {
    if (!activeMedia) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMedia()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeMedia, closeMedia])

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      setContainerRect({ width: rect.width, height: rect.height })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const rect = entry.contentRect
      setContainerRect({ width: rect.width, height: rect.height })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!canPan) return
      if (event.button !== 0) return
      event.stopPropagation()
      setAnimateTransform(false)
      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: offset.x,
        originY: offset.y,
        moved: false,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [canPan, offset.x, offset.y],
  )

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragStateRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      event.preventDefault()
      event.stopPropagation()
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      if (!drag.moved) {
        const threshold = 3
        if (Math.abs(dx) >= threshold || Math.abs(dy) >= threshold) {
          drag.moved = true
        }
      }
      const nextX = drag.originX + dx
      const nextY = drag.originY + dy
      setOffset((previous) => {
        if (previous.x === nextX && previous.y === nextY) {
          return previous
        }
        return { x: nextX, y: nextY }
      })
    },
    [],
  )

  const releasePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (drag.moved) {
      blockClickRef.current = true
      setTimeout(() => {
        blockClickRef.current = false
      }, 0)
    }
    dragStateRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    releasePointer(event)
  }, [])

  const handlePointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    releasePointer(event)
  }, [])

  const contextValue = useMemo<MediaOverlayContextValue>(
    () => ({
      activeTweetId: activeTweetIdRef.current,
      activeMedia,
      isSidebarCollapsed,
      zoomLevel,
      openMedia,
      closeMedia,
      cycleZoom,
      hasPrevious: items.length > 1,
      hasNext: items.length > 1,
      showPrevious,
      showNext,
    }),
    [activeMedia, isSidebarCollapsed, zoomLevel, openMedia, closeMedia, cycleZoom, items, showPrevious, showNext],
  )

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const { detail } = event as CustomEvent<MediaOverlayOpenDetail>
      const itemsFromEvent = detail?.items ?? []
      if (!Array.isArray(itemsFromEvent) || itemsFromEvent.length === 0) return
      const sanitizedItems = itemsFromEvent.filter(
        Boolean,
      ) as MediaOverlayItem[]
      if (sanitizedItems.length === 0) return
      const preferredKey = detail?.activeKey
      const targetItem
        = sanitizedItems.find(item => item.key === preferredKey)
          ?? sanitizedItems[0]
          ?? null
      if (!targetItem) return
      openMedia(detail.tweetId, targetItem, sanitizedItems)
    }

    const handleClose = () => {
      closeMedia()
    }

    window.addEventListener(MEDIA_OVERLAY_OPEN_EVENT, handleOpen)
    window.addEventListener(MEDIA_OVERLAY_CLOSE_EVENT, handleClose)
    return () => {
      window.removeEventListener(MEDIA_OVERLAY_OPEN_EVENT, handleOpen)
      window.removeEventListener(MEDIA_OVERLAY_CLOSE_EVENT, handleClose)
    }
  }, [openMedia, closeMedia])

  const resolvedSrc = useMemo(() => {
    return activeMedia && activeMedia.kind === 'photo'
      ? displaySrc ?? activeMedia.previewSrc
      : null
  }, [activeMedia, displaySrc])

  const interactionCursor = useMemo(() => {
    const hasZoom = zoomEnabled && zoomLevels.length > 1
    if (!hasZoom) {
      return 'default'
    } else if (hasZoom && isDragging) {
      return 'grabbing'
    } else if (isMaxZoom) {
      return 'zoom-out'
    } else {
      return 'zoom-in'
    }
  }, [isDragging, isMaxZoom, zoomEnabled, zoomLevels.length])

  return (
    <MediaOverlayContext value={contextValue}>
      {children}
      {activeMedia && (
        <div
          className={cn(`
            pointer-events-auto fixed inset-0 z-[2147483644] flex justify-center bg-black/60 backdrop-blur-sm transition-opacity
          `)}
          onClick={(event) => {
            event.stopPropagation()
            closeMedia()
          }}
        >
          <div className="absolute inset-0 flex justify-center" style={{ right: COLLAPSED_WIDTH_CSS }}>
            <div className="relative flex size-full justify-center px-6 py-8">
              <button
                className={cn(`
                  absolute top-6 right-6 z-20 rounded-full border border-white/30 bg-black/50 p-2 text-white shadow-lg transition
                  hover:bg-black/70
                `)}
                onClick={(event) => {
                  event.stopPropagation()
                  closeMedia()
                }}
                type="button"
              >
                <OverlayCloseIcon size={20} />
              </button>
              {items.length > 1 && (
                <>
                  <button
                    className={cn(`
                      absolute top-1/2 left-4 z-20 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white shadow-lg transition
                      hover:bg-black/70
                    `)}
                    onClick={(event) => {
                      event.stopPropagation()
                      showPrevious()
                    }}
                    type="button"
                  >
                    <OverlayPreviousIcon size={20} />
                  </button>
                  <button
                    className={cn(`
                      absolute top-1/2 right-4 z-20 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white shadow-lg transition
                      hover:bg-black/70
                    `)}
                    onClick={(event) => {
                      event.stopPropagation()
                      showNext()
                    }}
                    type="button"
                  >
                    <OverlayNextIcon size={20} />
                  </button>
                </>
              )}
              <div className="relative flex max-h-full flex-1 items-center justify-center">
                <div
                  className="pointer-events-none relative flex size-full items-center justify-center"
                  ref={containerRef}
                  style={{ overflow: canPan ? 'visible' : 'hidden' }}
                >
                  {activeMedia?.kind === 'photo' && resolvedSrc && (
                    <img
                      className="pointer-events-auto z-10 select-none"
                      draggable={false}
                      onClick={(event) => {
                        event.stopPropagation()
                        if (blockClickRef.current) {
                          blockClickRef.current = false
                          return
                        }
                        cycleZoom()
                      }}
                      onLoad={(event) => {
                        const target = event.currentTarget
                        setNaturalSize({
                          width: target.naturalWidth,
                          height: target.naturalHeight,
                        })
                      }}
                      onPointerCancel={handlePointerCancel}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      ref={imgRef}
                      src={resolvedSrc}
                      style={{
                        cursor: interactionCursor,
                        transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoomLevel})`,
                        transformOrigin: 'center center',
                        userSelect: 'none',
                        objectFit: 'contain',
                        width: 'auto',
                        height: 'auto',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        transition: animateTransform
                          ? 'transform 250ms ease-out'
                          : 'none',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {activeMedia?.kind === 'video' && (
                    <video
                      autoPlay={true}
                      className="pointer-events-auto z-10 select-none"
                      controls={!activeMedia.isGif}
                      loop={activeMedia.isGif}
                      muted={activeMedia.isGif}
                      onClick={(event) => {
                      // Prevent closing overlay when clicking on video controls
                        event.stopPropagation()
                      }}
                      poster={activeMedia.poster}
                      style={{
                        cursor: 'default',
                        userSelect: 'none',
                        objectFit: 'contain',
                        width: 'auto',
                        height: 'auto',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        flexShrink: 0,
                      }}
                    >
                      {activeMedia.source && (
                        <source
                          src={activeMedia.source.url}
                          type={activeMedia.source.content_type}
                        />
                      )}
                    </video>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </MediaOverlayContext>
  )
}
