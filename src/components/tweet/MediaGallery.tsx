import { useMediaOverlay } from "@/context/mediaOverlay";
import { getHighResolutionUrl, selectVideoVariant } from "@/utils/media";
import type { MediaOverlayItem } from "@/types/mediaOverlay";
import type { MediaEntity } from "@/types/response";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { cn } from "@/utils/cn";

const MAX_MEDIA_HEIGHT = 512;

interface MediaGalleryProps {
  media?: MediaEntity[];
  variant?: "main" | "quote";
  onSelect?: () => void;
  className?: string;
}

const MediaGallery = ({
  media,
  variant = "main",
  onSelect,
  className,
}: MediaGalleryProps) => {
  const mediaOverlay = useMediaOverlay();
  const overlayEnabled = !onSelect && mediaOverlay !== null;

  if (!media || media.length === 0) return null;
  const photos = media.filter((item) => item.type === "photo");
  const videos = media.filter(
    (item) => item.type === "video" || item.type === "animated_gif"
  );
  const containerRadius = variant === "quote" ? "rounded-xl" : "rounded-2xl";

  if (videos.length > 0 && photos.length === 0) {
    const video = videos[0];
    const poster = video.media_url_https ?? video.expanded_url ?? undefined;
    const variantSource = selectVideoVariant(video);
    const isGif = video.type === "animated_gif";
    const overlayItem: MediaOverlayItem | null = overlayEnabled
      ? {
          kind: "video",
          key: video.media_key ?? video.id_str ?? "video",
          alt: "tweet media",
          poster,
          source: variantSource ?? null,
          isGif,
        }
      : null;
    const overlayItems: MediaOverlayItem[] | null = overlayItem
      ? [overlayItem]
      : null;
    const handleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
      if (overlayEnabled && mediaOverlay && overlayItem && overlayItems) {
        event.preventDefault();
        mediaOverlay.openMedia(overlayItem, overlayItems);
        return;
      }
      if (!onSelect) return;
      if (event.defaultPrevented) return;
      onSelect();
    };

    return (
      <div
        className={cn(
          "group relative overflow-hidden border-twitter-border-strong dark:border-twitter-dark-border-strong border",
          containerRadius,
          className
        )}
        style={{ maxHeight: MAX_MEDIA_HEIGHT }}
        onClick={handleClick}
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
          if (!onSelect) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
      >
        <video
          className="h-full max-h-[512px] w-full"
          poster={poster}
          controls={!isGif}
          autoPlay={isGif}
          loop={isGif}
          muted={isGif}
        >
          {variantSource ? (
            <source src={variantSource.url} type={variantSource.content_type} />
          ) : null}
        </video>
        {onSelect ? (
          <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
        ) : null}
      </div>
    );
  }

  if (photos.length > 0 && videos.length === 0) {
    const isThreePhotos = photos.length === 3;
    const containerStyle = (() => {
      if (isThreePhotos) {
        return {
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
          gridTemplateRows: "repeat(2, minmax(0, 1fr))",
        } as CSSProperties;
      }
      return undefined;
    })();

    const photoGridClass = (() => {
      switch (photos.length) {
        case 1:
          return "grid-cols-1";
        case 2:
          return "grid-cols-2";
        case 3:
          return "grid-cols-2";
        default:
          return "grid-cols-2";
      }
    })();

    const getPhotoItemStyle = (index: number): CSSProperties | undefined => {
      if (!isThreePhotos) return undefined;
      if (index === 0) {
        return { gridColumn: "1 / span 1", gridRow: "1 / span 2" };
      }
      if (index === 1) {
        return { gridColumn: "2 / span 1", gridRow: "1 / span 1" };
      }
      return { gridColumn: "2 / span 1", gridRow: "2 / span 1" };
    };

    const photoContainerStyle: CSSProperties = containerStyle
      ? { ...containerStyle, maxHeight: MAX_MEDIA_HEIGHT }
      : { maxHeight: MAX_MEDIA_HEIGHT };

    const photoEntries = photos.map((photo, index) => {
      const typedPhoto = photo as MediaEntity & { ext_alt_text?: string };
      const altText =
        typedPhoto.ext_alt_text ?? typedPhoto.media_key ?? "tweet media";
      const width =
        typedPhoto.original_info?.width ??
        typedPhoto.sizes?.large?.w ??
        typedPhoto.sizes?.medium?.w ??
        null;
      const height =
        typedPhoto.original_info?.height ??
        typedPhoto.sizes?.large?.h ??
        typedPhoto.sizes?.medium?.h ??
        null;
      const aspectRatio = width && height ? `${width} / ${height}` : "1 / 1";
      const background =
        typedPhoto.media_url_https ?? typedPhoto.expanded_url ?? typedPhoto.url;
      const photoKey = photo.media_key ?? `${photo.id_str}-${index}`;
      const overlayItem: MediaOverlayItem | null =
        overlayEnabled && background
          ? (() => {
              const highRes = getHighResolutionUrl(background);
              return {
                kind: "photo",
                key: photoKey,
                previewSrc: background,
                fullSrc: highRes !== background ? highRes : undefined,
                alt: altText,
              } as MediaOverlayItem;
            })()
          : null;
      return {
        photoKey,
        altText,
        aspectRatio,
        background,
        linkHref: photo.expanded_url ?? photo.url ?? background ?? "#",
        style: getPhotoItemStyle(index),
        overlayItem,
      };
    });

    const overlayItems: MediaOverlayItem[] | null = overlayEnabled
      ? photoEntries
          .map((entry) => entry.overlayItem)
          .filter((item): item is MediaOverlayItem => Boolean(item))
      : null;

    const overlayItemMap = overlayEnabled
      ? photoEntries.reduce<Map<string, MediaOverlayItem>>(
          (accumulator, entry) => {
            if (entry.overlayItem) {
              accumulator.set(entry.photoKey, entry.overlayItem);
            }
            return accumulator;
          },
          new Map()
        )
      : null;

    return (
      <div
        className={cn(
          "grid gap-0.5 overflow-hidden border-twitter-border-strong dark:border-twitter-dark-border-strong border",
          photoGridClass,
          containerRadius
        )}
        style={{ ...photoContainerStyle, borderStyle: "solid" }}
      >
        {photoEntries.map((entry) => {
          const overlayItem = overlayItemMap?.get(entry.photoKey) ?? null;

          return (
            <a
              key={entry.photoKey}
              href={entry.linkHref}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-twitter-background-inverse dark:bg-twitter-dark-background-inverse relative flex h-full w-full items-center justify-center overflow-hidden"
              style={{
                ...entry.style,
                aspectRatio: entry.aspectRatio,
                maxHeight: MAX_MEDIA_HEIGHT,
              }}
              onClick={(event) => {
                if (!overlayEnabled || !overlayItem || !overlayItems) return;
                event.preventDefault();
                mediaOverlay?.openMedia(overlayItem, overlayItems);
              }}
            >
              {entry.background ? (
                <img
                  src={entry.background}
                  alt={entry.altText}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </a>
          );
        })}
      </div>
    );
  }

  return null;
};

export default MediaGallery;
