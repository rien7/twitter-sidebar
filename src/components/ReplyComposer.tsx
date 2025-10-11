import React, {
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
import { getBlueVerified, getUserFromTweet } from "@/utils/responseData";
import twttr from "twitter-text";
import RemainRing from "../icons/RemainRingIcon";

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
    const [progress, setProgress] = useState(0);
    const [remainCount, setRemainCount] = useState(0);
    const [composition, setComposition] = useState(false);
    const userIsBlue = getBlueVerified(getUserFromTweet(tweet));
    const minRows = 2;
    const maxRows = 6;

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
      setProgress(0);
      setRemainCount(0);
    }, [tweetId, expanded, clear]);

    const handleTextAreaChange = (
      e: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
      const el = e.currentTarget as HTMLTextAreaElement;
      const cs = getComputedStyle(el);
      let lineHeight = parseFloat(cs.lineHeight);
      if (Number.isNaN(lineHeight)) {
        const fontSize = parseFloat(cs.fontSize) || 16;
        lineHeight = 1.2 * fontSize;
      }
      const minHeight = lineHeight * minRows;
      const maxHeight = lineHeight * maxRows;

      el.style.height = "auto";
      let next = el.scrollHeight;
      if (next > maxHeight) next = maxHeight;
      if (next < minHeight) next = minHeight;
      el.style.height = `${next}px`;

      const value = e.currentTarget.value;
      setValue(value);
    };

    useEffect(() => {
      if (!userIsBlue && !composition) {
        const { weightedLength } = twttr.parseTweet(value);
        setProgress(weightedLength / 280);
        setRemainCount(280 - weightedLength);
      }
    }, [value, composition, userIsBlue]);

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
        const reply = await createReply({
          tweetId,
          text: trimmed,
          mediaEntities: uploadedMediaIds.map((mediaId) => ({
            media_id: mediaId,
          })),
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ("errors" in (reply.data as any)) {
          console.error("[TSB][ReplyComposer] Failed to reply.", reply.data);
          return;
        }
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
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <ReplyComposerHeader screenName={screenName} />
          <div className="bg-twitter-background-surface pt-1">
            <ReplyComposerTextarea
              ref={textareaRef}
              value={value}
              onPaste={handlePaste}
              onChange={handleTextAreaChange}
              setComposition={setComposition}
              disabled={!tweetId}
            />
            <MediaPreview items={uploadItems} onRemove={removeItem} />
            <UploadFileIndicator items={uploadItems} />
            <ComposerFooter
              onUploadClick={handleUploadMedia}
              progress={progress}
              remainCount={remainCount}
              disableSubmit={
                !tweetId ||
                !value.trim() ||
                isSubmitting ||
                isUploading ||
                (!userIsBlue && remainCount < 0)
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
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  onPaste: ClipboardEventHandler<HTMLTextAreaElement>;
  setComposition: (composition: boolean) => void;
  disabled: boolean;
}

const ReplyComposerTextarea = forwardRef<
  HTMLTextAreaElement,
  ReplyComposerTextareaProps
>(({ value, onChange, onPaste, setComposition, disabled }, ref) => {
  return (
    <textarea
      ref={ref}
      onPaste={onPaste}
      onCompositionStart={() => setComposition(true)}
      onCompositionEnd={() => setComposition(false)}
      className="w-full resize-none bg-twitter-background-surface text-[20px] leading-6 text-twitter-text-primary placeholder:text-twitter-text-secondary focus:outline-none"
      placeholder="发布你的回复"
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
});

ReplyComposerTextarea.displayName = "ReplyComposerTextarea";

interface ComposerFooterProps {
  onUploadClick: () => void;
  progress: number;
  remainCount: number;
  disableSubmit: boolean;
  isSubmitting: boolean;
}

const ComposerFooter = ({
  onUploadClick,
  progress,
  remainCount,
  disableSubmit,
  isSubmitting,
}: ComposerFooterProps) => {
  const color =
    remainCount > 20 ? undefined : remainCount > 0 ? "#ffd400" : "#f4212e";
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
        {progress > 0 ? (
          <div
            className="relative flex items-center justify-center"
            style={{
              width: "30px",
              height: "30px",
            }}
          >
            <RemainRing
              progress={progress}
              color={color}
              size={color ? 30 : 20}
            />
            {color !== undefined ? (
              <div className="absolute w-full h-full top-0 left-0 right-0 bottom-0 flex items-center justify-center">
                <div
                  className="min-w-[16px] text-center text-[13px] leading-[8px]"
                  style={{ color: remainCount <= 0 ? "#f4212e" : undefined }}
                >
                  {remainCount}
                </div>
              </div>
            ) : undefined}
          </div>
        ) : undefined}
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
