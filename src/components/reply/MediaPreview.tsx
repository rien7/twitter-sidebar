import { OverlayCloseIcon } from "@/icons/MediaOverlayIcons";
import { cn } from "@/utils/cn";
import type { UploadItem } from "./useMediaUploads";

interface MediaPreviewProps {
  items: UploadItem[];
  onRemove: (id: string) => void;
  className?: string;
}

export const MediaPreview = ({
  items,
  onRemove,
  className,
}: MediaPreviewProps) => {
  if (items.length === 0) return null;

  return (
    <div className={cn("mt-2 flex gap-2 overflow-x-scroll", className)}>
      {items.map((item) => (
        <figure
          key={item.id}
          className="relative shrink-0 h-80 overflow-hidden rounded-2xl border border-twitter-divide-light"
        >
          <button
            type="button"
            className="absolute right-2 top-2 flex h-8 w-8 z-10 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 hover:cursor-pointer"
            aria-label={`删除 ${item.name}`}
            onClick={() => onRemove(item.id)}
          >
            <OverlayCloseIcon size={16} />
          </button>
          {item.kind === "video" ? (
            <video
              className="h-full w-full object-cover"
              src={item.previewUrl}
              controls
              muted
              playsInline
            />
          ) : (
            <img
              className="h-full w-full object-cover"
              src={item.previewUrl}
              alt={item.name}
            />
          )}
        </figure>
      ))}
    </div>
  );
};

export default MediaPreview;
