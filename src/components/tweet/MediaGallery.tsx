import { useMediaOverlay } from "@/context/mediaOverlay";
import { getHighResolutionUrl, selectVideoVariant } from "@/utils/media";
import type { MediaOverlayItem } from "@/types/mediaOverlay";
import type { MediaEntity } from "@/types/response";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { cn } from "@/utils/cn";

const MAX_MEDIA_HEIGHT = 320;

type BaseMediaLayoutEntry = {
  key: string;
  altText: string;
  aspectRatio: string;
  overlayItem: MediaOverlayItem | null;
};

type PhotoMediaLayoutEntry = BaseMediaLayoutEntry & {
  type: "photo";
  background: string | null;
  linkHref: string;
};

type VideoMediaLayoutEntry = BaseMediaLayoutEntry & {
  type: "video";
  poster?: string;
  source: ReturnType<typeof selectVideoVariant> | null;
  isGif: boolean;
};

type MediaLayoutEntry = PhotoMediaLayoutEntry | VideoMediaLayoutEntry;

interface MediaGalleryProps {
  media?: MediaEntity[];
  variant?: "main" | "other";
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
  const containerRadius = variant === "other" ? "rounded-xl" : "rounded-2xl";

  const mediaEntries = media.reduce<MediaLayoutEntry[]>(
    (accumulator, item, index) => {
      const baseKey = item.media_key ?? `${item.id_str}-${index}`;
      const typedMedia = item as MediaEntity & { ext_alt_text?: string };
      const altText = typedMedia.ext_alt_text ?? baseKey ?? "tweet media";

      if (item.type === "photo") {
        const width =
          typedMedia.original_info?.width ??
          typedMedia.sizes?.large?.w ??
          typedMedia.sizes?.medium?.w ??
          null;
        const height =
          typedMedia.original_info?.height ??
          typedMedia.sizes?.large?.h ??
          typedMedia.sizes?.medium?.h ??
          null;
        const aspectRatio = width && height ? `${width} / ${height}` : "1 / 1";
        const background =
          typedMedia.media_url_https ??
          typedMedia.expanded_url ??
          typedMedia.url ??
          null;
        const linkHref =
          typedMedia.expanded_url ?? typedMedia.url ?? background ?? "#";
        const overlayItem: MediaOverlayItem | null =
          overlayEnabled && background
            ? (() => {
                const highRes = getHighResolutionUrl(background);
                return {
                  kind: "photo",
                  key: baseKey,
                  previewSrc: background,
                  fullSrc: highRes !== background ? highRes : undefined,
                  alt: altText,
                } satisfies MediaOverlayItem;
              })()
            : null;

        accumulator.push({
          type: "photo",
          key: baseKey,
          altText,
          aspectRatio,
          background,
          linkHref,
          overlayItem,
        });

        return accumulator;
      }

      if (item.type === "video" || item.type === "animated_gif") {
        const isGif = item.type === "animated_gif";
        const poster =
          typedMedia.media_url_https ??
          typedMedia.expanded_url ??
          typedMedia.url ??
          undefined;
        const variantSource = selectVideoVariant(typedMedia) ?? null;
        const aspectRatio = typedMedia.video_info?.aspect_ratio
          ? `${typedMedia.video_info.aspect_ratio[0]} / ${typedMedia.video_info.aspect_ratio[1]}`
          : (() => {
              const width =
                typedMedia.original_info?.width ??
                typedMedia.sizes?.large?.w ??
                typedMedia.sizes?.medium?.w ??
                null;
              const height =
                typedMedia.original_info?.height ??
                typedMedia.sizes?.large?.h ??
                typedMedia.sizes?.medium?.h ??
                null;
              if (width && height) return `${width} / ${height}`;
              return "16 / 9";
            })();
        const overlayItem: MediaOverlayItem | null = overlayEnabled
          ? {
              kind: "video",
              key: baseKey,
              alt: altText,
              poster,
              source: variantSource,
              isGif,
            }
          : null;

        accumulator.push({
          type: "video",
          key: baseKey,
          altText,
          aspectRatio,
          poster,
          source: variantSource,
          isGif,
          overlayItem,
        });
      }

      return accumulator;
    },
    []
  );

  if (mediaEntries.length === 0) return null;

  const overlayItems: MediaOverlayItem[] | null = overlayEnabled
    ? mediaEntries
        .map((entry) => entry.overlayItem)
        .filter((item): item is MediaOverlayItem => Boolean(item))
    : null;

  const baseContainerClass = cn(
    "overflow-hidden border-twitter-border-strong dark:border-twitter-dark-border-strong border",
    containerRadius,
    className
  );

  const hasVideo = mediaEntries.some((entry) => entry.type === "video");

  const baseContainerStyle: CSSProperties = {
    maxHeight:
      hasVideo || mediaEntries.length > 1 ? MAX_MEDIA_HEIGHT : undefined,
    borderStyle: "solid",
  };

  const handleMediaClick = (
    event: ReactMouseEvent<HTMLElement>,
    entry: MediaLayoutEntry
  ) => {
    if (
      variant === "main" &&
      overlayEnabled &&
      overlayItems &&
      entry.overlayItem
    ) {
      event.preventDefault();
      mediaOverlay?.openMedia(entry.overlayItem, overlayItems);
      return;
    }

    if (onSelect) {
      event.preventDefault();
      onSelect();
    }
  };

  const renderMediaItem = (
    entry: MediaLayoutEntry,
    options: {
      className?: string;
      style?: CSSProperties;
      includeAspectRatio?: boolean;
      aspectRatio?: string;
    } = {}
  ) => {
    const {
      className: extraClassName,
      style,
      includeAspectRatio = true,
      aspectRatio,
    } = options;
    const resolvedAspectRatio =
      includeAspectRatio && (aspectRatio ?? entry.aspectRatio)
        ? { aspectRatio: aspectRatio ?? entry.aspectRatio }
        : {};

    if (entry.type === "photo") {
      return (
        <a
          key={entry.key}
          href={entry.linkHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={entry.altText}
          className={cn(
            "bg-twitter-background-inverse dark:bg-twitter-dark-background-inverse relative block overflow-hidden",
            extraClassName
          )}
          style={{ ...resolvedAspectRatio, ...style }}
          onClick={(event) => handleMediaClick(event, entry)}
        >
          {entry.background ? (
            <span
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${entry.background})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                flexBasis: "auto",
              }}
            />
          ) : null}
        </a>
      );
    }

    return (
      <div
        key={entry.key}
        className={cn(
          "group relative flex h-full w-full overflow-hidden",
          extraClassName
        )}
        style={{ ...resolvedAspectRatio, ...style }}
        onClick={(event) => handleMediaClick(event, entry)}
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
      >
        <video
          className="h-full w-full"
          poster={entry.poster}
          controls={!entry.isGif}
          autoPlay={entry.isGif}
          loop={entry.isGif}
          muted={entry.isGif}
        >
          {entry.source ? (
            <source src={entry.source.url} type={entry.source.content_type} />
          ) : null}
        </video>
        {onSelect ? (
          <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
        ) : null}
      </div>
    );
  };

  if (mediaEntries.length === 1) {
    return (
      <div
        className={cn(baseContainerClass, "flex flex-col")}
        style={baseContainerStyle}
      >
        {renderMediaItem(mediaEntries[0], {
          className: "h-full w-full",
        })}
      </div>
    );
  }

  if (mediaEntries.length === 2) {
    return (
      <div
        className={cn(baseContainerClass, "flex flex-row gap-0.5")}
        style={baseContainerStyle}
      >
        {mediaEntries.map((entry) =>
          renderMediaItem(entry, {
            className: "flex-1",
          })
        )}
      </div>
    );
  }

  if (mediaEntries.length === 3) {
    return (
      <div
        className={cn(baseContainerClass, "flex flex-row gap-0.5")}
        style={baseContainerStyle}
      >
        {renderMediaItem(mediaEntries[0], {
          className: "flex-1 min-h-0",
          aspectRatio: "1 / 1",
        })}
        <div className="flex flex-1 flex-col gap-0.5 min-h-0">
          {renderMediaItem(mediaEntries[1], {
            className: "flex-1 min-h-0",
            aspectRatio: "1 / 1",
          })}
          {renderMediaItem(mediaEntries[2], {
            className: "flex-1 min-h-0",
            aspectRatio: "1 / 1",
          })}
        </div>
      </div>
    );
  }

  if (mediaEntries.length === 4) {
    return (
      <div
        className={cn(baseContainerClass, "flex flex-col gap-0.5")}
        style={baseContainerStyle}
      >
        <div className="flex flex-1 gap-0.5 min-h-0">
          {renderMediaItem(mediaEntries[0], {
            className: "flex-1 min-h-0",
            aspectRatio: "1 / 1",
          })}
          {renderMediaItem(mediaEntries[1], {
            className: "flex-1 min-h-0",
            aspectRatio: "1 / 1",
          })}
        </div>
        <div className="flex flex-1 gap-0.5 min-h-0">
          {renderMediaItem(mediaEntries[2], {
            className: "flex-1 min-h-0",
            aspectRatio: "1 / 1",
          })}
          {renderMediaItem(mediaEntries[3], {
            className: "flex-1 min-h-0",
            aspectRatio: "1 / 1",
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(baseContainerClass, "flex flex-wrap gap-0.5")}
      style={baseContainerStyle}
    >
      {mediaEntries.map((entry) =>
        renderMediaItem(entry, {
          className: "flex-1",
        })
      )}
    </div>
  );
};

export default MediaGallery;
