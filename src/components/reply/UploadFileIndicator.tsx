import type { UploadItem } from '@/hooks/useMediaUploads'
import { cn } from '@/utils/cn'

interface UploadFileIndicatorProps {
  items: UploadItem[]
  className?: string
}

const statusLabel: Record<UploadItem['status'], string> = {
  Uploading: '上传中',
  Processing: '处理中',
  Uploaded: '已上传',
  Error: '上传失败',
}

const statusClassName: Record<UploadItem['status'], string> = {
  Uploading: 'text-twitter-accent',
  Processing: 'text-twitter-accent',
  Uploaded: 'text-twitter-text-primary',
  Error: 'text-twitter-text-error',
}

export function UploadFileIndicator({
  items,
  className,
}: UploadFileIndicatorProps) {
  if (items.length === 0) return null

  return (
    <div className={cn('mt-2 flex flex-col gap-2', className)}>
      {items.map(item => (
        <div
          className={`
            relative overflow-hidden rounded-[8px] bg-twitter-accent/10 px-[16px] py-[12px]
            dark:bg-twitter-accent/20
          `}
          key={item.id}
        >
          <div className="flex items-center justify-between font-bold text-twitter-text-primary">
            <span className="truncate">{item.name}</span>
            <span className={cn('ml-3 shrink-0', statusClassName[item.status])}>
              {statusLabel[item.status]}
            </span>
          </div>
          {/* css mask */}
          <div
            className={cn(`
              absolute inset-0 z-10 flex size-full items-center justify-between bg-twitter-accent px-[16px] py-[12px] font-bold
              text-twitter-text-inverse transition-opacity
            `,
            item.status !== 'Uploaded' ? 'opacity-100' : 'opacity-0',
            )}
            style={{
              WebkitMaskImage: `linear-gradient(to right, black ${
                item.progress * 100
              }%, transparent ${item.progress * 100}%)`,
              maskImage: `linear-gradient(to right, black ${
                item.progress * 100
              }%, transparent ${item.progress * 100}%)`,
            }}
          >
            <span className="truncate">{item.name}</span>
            <span className="ml-3 shrink-0">{statusLabel[item.status]}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default UploadFileIndicator
