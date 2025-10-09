import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ClipboardEventHandler, FormEvent } from "react";
import { extractName } from "@/components/tweet/tweetText";
import { createReply } from "@/api/twitterGraphql";
import type { TweetResult } from "@/types/response";
import { cn } from "@/utils/cn";
import { UPLOAD_MEDIA_ICON } from "@/icons/ReplyComposerIcons";
import MediaPreview from "@/components/reply/MediaPreview";
import UploadFileIndicator from "@/components/reply/UploadFileIndicator";
import { useMediaUploads } from "@/components/reply/useMediaUploads";
import { hydrateDetailInBackground } from "@/handlers/sidebarController";

export interface ReplyComposerHandle {
  focus: () => void;
}

interface ReplyComposerProps {
  tweet: TweetResult | null;
  expanded?: boolean;
  className?: string;
  onExpand?: () => void;
  onCollapse?: () => void;
}

const ReplyComposer = forwardRef<ReplyComposerHandle, ReplyComposerProps>(
  ({ tweet, expanded = false, className, onExpand, onCollapse }, ref) => {
    const [value, setValue] = useState("");
    const [isSubmitting, setSubmitting] = useState(false);

    const {
      items: uploadItemsMap,
      addFiles,
      removeItem,
      clear,
      isUploading,
      uploadedMediaIds,
    } = useMediaUploads();

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        focus() {
          if (!expanded) {
            onExpand?.();
          }
          requestAnimationFrame(() => {
            textareaRef.current?.focus();
          });
        },
      }),
      [expanded, onExpand]
    );

    const tweetId = tweet?.rest_id ?? tweet?.legacy?.id_str;

    const { screenName } = useMemo(
      () =>
        tweet
          ? extractName(tweet)
          : { name: "未知用户", screenName: "unknown" },
      [tweet]
    );

    const uploadItems = useMemo(
      () => Object.values(uploadItemsMap),
      [uploadItemsMap]
    );

    useEffect(() => {
      setValue("");
      clear();
    }, [tweetId, expanded, clear]);

    const handleUploadMedia = useCallback(() => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*,video/*";
      input.multiple = true;
      input.onchange = () => {
        const files = input.files;
        if (!files || files.length === 0) return;
        addFiles(files);
      };
      input.click();
    }, [addFiles]);

    const handleCancel = useCallback(() => {
      setValue("");
      clear();
      onCollapse?.();
    }, [clear, onCollapse]);

    const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (event.clipboardData.files.length > 0) {
        addFiles(event.clipboardData.files);
        event.preventDefault();
      }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = value.trim();
      if (!tweetId || !trimmed || isSubmitting || isUploading) return;
      setSubmitting(true);
      try {
        await createReply({
          tweetId,
          text: trimmed,
          mediaEntities: uploadedMediaIds.map((mediaId) => ({
            media_id: mediaId,
          })),
        });
        if (tweet) {
          hydrateDetailInBackground(tweet.rest_id, null);
        }
        setValue("");
        clear();
        onCollapse?.();
      } catch (error) {
        console.error("[TSB][ReplyComposer] 回复失败", error);
      } finally {
        setSubmitting(false);
      }
    };

    if (!expanded) {
      return null;
    }

    return (
      <form
        className={cn("w-full flex flex-col py-4", className)}
        onSubmit={handleSubmit}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <ReplyComposerHeader screenName={screenName} />
          <div className="bg-twitter-background-surface pt-1">
            <ReplyComposerTextarea
              ref={textareaRef}
              value={value}
              onPaste={handlePaste}
              onChange={setValue}
              disabled={!tweetId}
            />
            <MediaPreview items={uploadItems} onRemove={removeItem} />
            <UploadFileIndicator items={uploadItems} />
            <ComposerFooter
              onUploadClick={handleUploadMedia}
              onCancel={handleCancel}
              disableSubmit={
                !tweetId || !value.trim() || isSubmitting || isUploading
              }
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </form>
    );
  }
);

ReplyComposer.displayName = "ReplyComposer";

export default ReplyComposer;

interface ReplyComposerHeaderProps {
  screenName: string;
}

const ReplyComposerHeader = ({ screenName }: ReplyComposerHeaderProps) => {
  return (
    <div className="text-[15px] text-twitter-text-secondary">
      回复{" "}
      <span className="font-semibold text-twitter-accent">@{screenName}</span>
    </div>
  );
};

interface ReplyComposerTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onPaste: ClipboardEventHandler<HTMLTextAreaElement>;
  disabled: boolean;
}

const ReplyComposerTextarea = forwardRef<
  HTMLTextAreaElement,
  ReplyComposerTextareaProps
>(({ value, onChange, onPaste, disabled }, ref) => {
  return (
    <textarea
      ref={ref}
      onPaste={onPaste}
      className="min-h-[96px] w-full resize-none bg-twitter-background-surface text-[20px] leading-6 text-twitter-text-primary placeholder:text-twitter-text-secondary focus:outline-none"
      placeholder="发布你的回复"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    />
  );
});

ReplyComposerTextarea.displayName = "ReplyComposerTextarea";

interface ComposerFooterProps {
  onUploadClick: () => void;
  onCancel: () => void;
  disableSubmit: boolean;
  isSubmitting: boolean;
}

const ComposerFooter = ({
  onUploadClick,
  onCancel,
  disableSubmit,
  isSubmitting,
}: ComposerFooterProps) => {
  return (
    <div className="mt-2 flex items-center justify-between">
      <button
        type="button"
        className="min-h-[36px] min-w-[36px] cursor-pointer rounded-full bg-transparent fill-twitter-accent transition hover:bg-twitter-accent/10"
        onClick={onUploadClick}
      >
        <div className="flex items-center justify-center">
          <UPLOAD_MEDIA_ICON />
        </div>
      </button>
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2 text-[15px] font-medium text-twitter-text-secondary transition hover:bg-twitter-background-hover dark:text-twitter-dark-text-secondary dark:hover:bg-twitter-dark-background-hover"
        >
          取消
        </button>
        <button
          type="submit"
          className="rounded-full bg-twitter-background-inverse px-5 py-2 text-[15px] font-semibold text-twitter-text-inverse transition-opacity disabled:opacity-50"
          disabled={disableSubmit}
          aria-busy={isSubmitting}
        >
          回复
        </button>
      </div>
    </div>
  );
};
