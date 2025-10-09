import { cn } from "@/utils/cn";
import type { UploadItem } from "./useMediaUploads";

interface UploadFileIndicatorProps {
  items: UploadItem[];
  className?: string;
}

const statusLabel: Record<UploadItem["status"], string> = {
  Uploading: "上传中",
  Processing: "处理中",
  Uploaded: "已上传",
  Error: "上传失败",
};

const statusClassName: Record<UploadItem["status"], string> = {
  Uploading: "text-twitter-accent",
  Processing: "text-twitter-accent",
  Uploaded: "text-twitter-text-primary",
  Error: "text-twitter-text-error",
};

export const UploadFileIndicator = ({
  items,
  className,
}: UploadFileIndicatorProps) => {
  if (items.length === 0) return null;

  return (
    <div className={cn("mt-2 flex flex-col gap-2", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-[8px] px-[16px] py-[12px] bg-twitter-accent/10 dark:bg-twitter-accent/20 relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-twitter-text-primary font-bold">
            <span className="truncate">{item.name}</span>
            <span className={cn("ml-3 shrink-0", statusClassName[item.status])}>
              {statusLabel[item.status]}
            </span>
          </div>
          {/* css mask */}
          <div
            className={cn(
              "h-full w-full z-10 absolute top-0 bottom-0 left-0 right-0 px-[16px] py-[12px] flex items-center justify-between text-twitter-text-inverse font-bold bg-twitter-accent transition-opacity",
              item.status !== "Uploaded" ? "opacity-100" : "opacity-0"
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
  );
};

export default UploadFileIndicator;
