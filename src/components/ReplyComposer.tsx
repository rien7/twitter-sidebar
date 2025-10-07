import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { extractName } from "@/components/tweet/tweetText";
import { dispatchSidebarRefreshDetail } from "@/events/sidebar";
import { createReply } from "@/api/twitterGraphql";
import type { TweetResult } from "@/types/response";
import { cn } from "@/utils/cn";

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

    useEffect(() => {
      setValue("");
    }, [tweetId, expanded]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!tweetId || !value.trim() || isSubmitting) return;
      setSubmitting(true);
      try {
        await createReply({ tweetId, text: value });
        setValue("");
        onCollapse?.();
        dispatchSidebarRefreshDetail({ tweetId });
      } catch (error) {
        console.error("[TSB][ReplyComposer] 回复失败", error);
        window.alert(
          `回复失败：${
            error instanceof Error ? error.message : String(error ?? "未知错误")
          }`
        );
      } finally {
        setSubmitting(false);
      }
    };

    if (!expanded) {
      return null;
    }

    return (
      <form
        className={cn("w-full flex flex-col gap-3 px-5 py-4", className)}
        onSubmit={handleSubmit}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="text-twitter-text-secondary dark:text-twitter-dark-text-secondary text-[15px]">
            回复{" "}
            <span className="text-twitter-text-primary dark:text-twitter-dark-text-primary font-semibold">
              @{screenName}
            </span>
          </div>
          <textarea
            ref={textareaRef}
            className="border-twitter-border-input dark:border-twitter-dark-border-input bg-twitter-background-surface dark:bg-twitter-dark-background-surface text-twitter-text-primary dark:text-twitter-dark-text-primary placeholder:text-twitter-text-secondary dark:placeholder:text-twitter-dark-text-secondary min-h-[96px] w-full resize-none rounded-2xl border px-4 py-3 text-[15px] leading-6 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            placeholder="发布你的回复"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={!tweetId}
          />
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setValue("");
              onCollapse?.();
            }}
            className="text-twitter-text-secondary dark:text-twitter-dark-text-secondary hover:bg-twitter-background-hover dark:hover:bg-twitter-dark-background-hover rounded-full px-4 py-2 text-[15px] font-medium transition"
          >
            取消
          </button>
          <button
            type="submit"
            className="bg-twitter-accent-primary dark:bg-twitter-dark-accent-primary dark:text-twitter-dark-text-primary hover:bg-twitter-accent-primaryHover dark:hover:bg-twitter-dark-accent-primaryHover disabled:bg-twitter-accent-primaryDisabled dark:disabled:bg-twitter-dark-accent-primaryDisabled rounded-full px-5 py-2 text-[15px] font-semibold text-white transition disabled:cursor-not-allowed"
            disabled={!tweetId || !value.trim() || isSubmitting}
            aria-busy={isSubmitting}
          >
            回复
          </button>
        </div>
      </form>
    );
  }
);

ReplyComposer.displayName = "ReplyComposer";

export default ReplyComposer;
