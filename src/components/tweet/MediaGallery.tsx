import { type CSSProperties, type MouseEvent as ReactMouseEvent, useCallback, useMemo } from 'react'

import { useMediaOverlay } from '@/context/mediaOverlay'
import type { MediaOverlayItem } from '@/types/mediaOverlay'
import type { MediaEntity } from '@/types/response'
import { cn } from '@/utils/cn'
import { getHighResolutionUrl, selectVideoVariant } from '@/utils/media'

const MAX_MEDIA_HEIGHT = 320

interface BaseMediaLayoutEntry {
  key: string
  altText?: string
  aspectRatio: string
  overlayItem: MediaOverlayItem
}

type PhotoMediaLayoutEntry = BaseMediaLayoutEntry & {
  type: 'photo'
  background: string | null
  linkHref: string
}

type VideoMediaLayoutEntry = BaseMediaLayoutEntry & {
  type: 'video'
  poster?: string
  source: ReturnType<typeof selectVideoVariant> | null
  isGif: boolean
}

type MediaLayoutEntry = PhotoMediaLayoutEntry | VideoMediaLayoutEntry

interface MediaGalleryProps {
  tweetId: string
  media?: MediaEntity[]
  variant?: 'main' | 'other'
  onSelect?: () => void
  className?: string
}

function MediaGallery({
  tweetId,
  media,
  variant = 'main',
  onSelect,
  className,
}: MediaGalleryProps) {
  const mediaOverlay = useMediaOverlay()
  const overlayEnabled = !onSelect && mediaOverlay !== null

  const containerRadius = variant === 'other' ? 'rounded-xl' : 'rounded-2xl'

  const entries = useMemo(() => {
    if (!media || media.length === 0) return []
    const mediaEntries: MediaLayoutEntry[] = []
    for (const [index, item] of media.entries()) {
      const baseKey = item.media_key ?? `${item.id_str}-${index}`
      const altText = item.ext_alt_text

      if (item.type === 'photo') {
        const width = item.original_info?.width
        const height = item.original_info?.height
        const aspectRatio = width && height ? `${width} / ${height}` : '1 / 1'
        const background = item.media_url_https
        const linkHref = item.expanded_url
        const highRes = getHighResolutionUrl(background)
        const overlayItem = {
          kind: 'photo',
          key: baseKey,
          previewSrc: background,
          fullSrc: highRes !== background ? highRes : undefined,
          altText,
        } as MediaOverlayItem
        mediaEntries.push({
          type: 'photo',
          key: baseKey,
          altText,
          aspectRatio,
          background,
          linkHref,
          overlayItem,
        })
      } else if (item.type === 'video' || item.type === 'animated_gif') {
        const isGif = item.type === 'animated_gif'
        const poster = item.media_url_https
        const source = selectVideoVariant(item)
        const aspectRatio = item.video_info!.aspect_ratio?.join(' / ') ?? '1 / 1'
        const overlayItem = {
          kind: 'video',
          key: baseKey,
          poster,
          source,
          isGif,
        } as MediaOverlayItem
        mediaEntries.push({
          type: 'video',
          key: baseKey,
          aspectRatio,
          poster,
          source,
          isGif,
          overlayItem,
        })
      }
    }
    return mediaEntries
  }, [media])

  const hasVideo = useMemo(() => {
    return entries.some(entry => entry.type === 'video')
  }, [entries])

  const entriesLength = useMemo(() => entries.length, [entries])
  const baseContainerClass = cn(
    `overflow-hidden border border-twitter-border-strong`,
    containerRadius,
    className,
  )

  const baseContainerStyle: CSSProperties = useMemo(() => ({
    maxHeight: hasVideo || entriesLength > 1 ? MAX_MEDIA_HEIGHT : undefined,
    borderStyle: 'solid',
  }), [entriesLength, hasVideo])

  const handleMediaClick = useCallback((event: ReactMouseEvent<HTMLElement>, entry: MediaLayoutEntry) => {
    if (variant === 'main' && overlayEnabled && entry.overlayItem) {
      event.preventDefault()
      mediaOverlay?.openMedia(tweetId, entry.overlayItem, entries.map(entry => entry.overlayItem))
      return
    }

    if (onSelect) {
      event.preventDefault()
      onSelect()
    }
  }, [entries, mediaOverlay, onSelect, overlayEnabled, tweetId, variant])

  const renderMediaItem = (
    key: string,
    entry: MediaLayoutEntry,
    className?: string,
    aspectRatio?: string,
  ) => {
    if (entry.type === 'photo') {
      return (
        <MediaItemPhoto
          aspectRatio={aspectRatio}
          className={className}
          entry={entry}
          handleMediaClick={handleMediaClick}
          key={key}
        />
      )
    } else {
      return (
        <MediaItemVideo
          aspectRatio={aspectRatio}
          className={className}
          entry={entry}
          handleMediaClick={handleMediaClick}
          key={key}
        />
      )
    }
  }

  if (entriesLength === 1) {
    return (
      <div
        className={cn(baseContainerClass, 'flex flex-col')}
        style={baseContainerStyle}
      >
        {renderMediaItem(`${tweetId}-media-0`, entries[0], 'h-full w-full')}
      </div>
    )
  } else if (entriesLength === 2) {
    return (
      <div
        className={cn(baseContainerClass, 'flex flex-row gap-0.5')}
        style={baseContainerStyle}
      >
        {entries.map((entry, index) =>
          renderMediaItem(`${tweetId}-media-${index}`, entry, 'flex-1'),
        )}
      </div>
    )
  } else if (entries.length === 3) {
    return (
      <div
        className={cn(baseContainerClass, 'flex flex-row gap-0.5')}
        style={baseContainerStyle}
      >
        {renderMediaItem(`${tweetId}-media-0`, entries[0], 'flex-1 min-h-0', '1 / 1')}
        <div className="flex min-h-0 flex-1 flex-col gap-0.5">
          {renderMediaItem(`${tweetId}-media-1`, entries[1], 'flex-1 min-h-0', '1 / 1')}
          {renderMediaItem(`${tweetId}-media-2`, entries[2], 'flex-1 min-h-0', '1 / 1')}
        </div>
      </div>
    )
  } else {
    return (
      <div
        className={cn(baseContainerClass, 'flex flex-col gap-0.5')}
        style={baseContainerStyle}
      >
        <div className="flex min-h-0 flex-1 gap-0.5">
          {renderMediaItem(`${tweetId}-media-0`, entries[0], 'flex-1 min-h-0', '1 / 1')}
          {renderMediaItem(`${tweetId}-media-1`, entries[1], 'flex-1 min-h-0', '1 / 1')}
        </div>
        <div className="flex min-h-0 flex-1 gap-0.5">
          {renderMediaItem(`${tweetId}-media-2`, entries[2], 'flex-1 min-h-0', '1 / 1')}
          {renderMediaItem(`${tweetId}-media-3`, entries[3], 'flex-1 min-h-0', '1 / 1')}
        </div>
      </div>
    )
  }
}

function MediaItemPhoto({
  entry,
  handleMediaClick,
  className,
  aspectRatio,
}: {
  entry: PhotoMediaLayoutEntry
  handleMediaClick: (event: ReactMouseEvent<HTMLElement>, entry: PhotoMediaLayoutEntry) => void
  className?: string
  aspectRatio?: string
}) {
  return (
    <a
      aria-label={entry.altText}
      className={cn(
        `relative block overflow-hidden bg-twitter-background-inverse`,
        className,
      )}
      href={entry.linkHref}
      key={entry.key}
      onClick={event => handleMediaClick(event, entry)}
      rel="noopener noreferrer"
      style={{ aspectRatio: aspectRatio ?? entry.aspectRatio }}
      target="_blank"
    >
      {entry.background && (
        <span
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${entry.background})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            flexBasis: 'auto',
          }}
        />
      )}
    </a>
  )
}

function MediaItemVideo({
  entry,
  handleMediaClick,
  className,
  aspectRatio,
}: {
  entry: VideoMediaLayoutEntry
  handleMediaClick: (event: ReactMouseEvent<HTMLElement>, entry: VideoMediaLayoutEntry) => void
  className?: string
  aspectRatio?: string
}) {
  return (
    <div
      className={cn(
        'group relative flex size-full overflow-hidden',
        className,
      )}
      key={entry.key}
      onClick={event => handleMediaClick(event, entry)}
      style={{ aspectRatio: aspectRatio ?? entry.aspectRatio }}
    >
      <video
        autoPlay={entry.isGif}
        className="size-full"
        controls={!entry.isGif}
        loop={entry.isGif}
        muted={entry.isGif}
        poster={entry.poster}
      >
        {entry.source && (
          <source src={entry.source.url} type={entry.source.content_type} />
        )}
      </video>
    </div>
  )
}
export default MediaGallery
