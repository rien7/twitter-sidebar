import type { UploadItem } from '@/hooks/useMediaUploads'
import { OverlayCloseIcon } from '@/icons/MediaOverlayIcons'
import { cn } from '@/utils/cn'

interface MediaPreviewProps {
  items: UploadItem[]
  onRemove: (id: string) => void
  className?: string
}

export function MediaPreview({
  items,
  onRemove,
  className,
}: MediaPreviewProps) {
  if (items.length === 0) return null

  return (
    <div className={cn('mt-2 flex gap-2 overflow-x-scroll', className)}>
      {items.map(item => (
        <figure
          className="relative h-80 shrink-0 overflow-hidden rounded-2xl border border-twitter-divide-light"
          key={item.id}
        >
          <button
            className={`
              absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/60 text-white transition
              hover:cursor-pointer hover:bg-black/80
            `}
            onClick={() => onRemove(item.id)}
            type="button"
          >
            <OverlayCloseIcon size={16} />
          </button>
          {item.kind === 'video'
            ? (
                <video
                  className="size-full object-cover"
                  controls
                  muted
                  playsInline
                  src={item.previewUrl}
                />
              )
            : (
                <img
                  className="size-full object-cover"
                  src={item.previewUrl}
                />
              )}
        </figure>
      ))}
    </div>
  )
}

export default MediaPreview
