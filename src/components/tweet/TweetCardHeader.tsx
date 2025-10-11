import UserHoverCard from "@/components/tweet/UserHoverCard";
import { ExternalLinkIcon } from "@/icons/ExternalLinkIcon";
import { cn } from "@/utils/cn";
import { renderWithTwemoji } from "@/utils/twemoji";
import type { TweetResult } from "@/types/response";
import type { CSSProperties, RefObject } from "react";
import { getBlueVerified, getProtected } from "@/utils/responseData";
import {
  BlueVerifiedIcon,
  ProtectedIcon,
} from "@/icons/UserBlueAndProtectedIcons";

interface TweetCardHeaderProps {
  tweet: TweetResult;
  name: string;
  screenName: string;
  avatar: string | undefined;
  avatarCache: string | undefined;
  isMain: boolean;
  isReply: boolean;
  isQuote: boolean;
  createdAt: string | null;
  showTimestampInHeader: boolean;
  onOpenInNewTab: () => void;
  avatarRef: RefObject<HTMLImageElement | null>;
  userAvatarRef: RefObject<HTMLAnchorElement | null>;
  userNameRef: RefObject<HTMLDivElement | null>;
  userHandleRef: RefObject<HTMLElement | null>;
}

export const TweetCardHeader = ({
  tweet,
  name,
  screenName,
  avatar,
  avatarCache,
  isMain,
  isReply,
  isQuote,
  createdAt,
  showTimestampInHeader,
  onOpenInNewTab,
  avatarRef,
  userAvatarRef,
  userNameRef,
  userHandleRef,
}: TweetCardHeaderProps) => {
  const avatarClass = cn(
    "overflow-hidden rounded-full flex-shrink-0",
    isMain ? "h-12 w-12" : isQuote ? "h-6 w-6" : "h-11 w-11",
    isQuote && "z-10"
  );
  const headerClass = cn(
    "flex ml-2 flex-nowrap min-w-0",
    isReply && "items-start",
    isQuote && "items-center gap-1 w-full flex-1",
    isMain && "flex-col items-start gap-0"
  );
  const nameClass = cn(
    "text-twitter-text-primary dark:text-twitter-dark-text-primary grow-0 min-w-0 overflow-hidden overflow-ellipsis text-nowrap flex-shrink-2",
    isMain ? "text-[17px] font-bold" : "text-[15px] font-semibold",
    isQuote && "z-10"
  );
  const handleClass = cn(
    "text-twitter-text-secondary dark:text-twitter-dark-text-secondary text-[15px] flex-shrink-1",
    (isReply || isQuote) && "ml-1",
    isQuote && "z-10"
  );
  const handleStyle = { fontFeatureSettings: '"ss01"' } as CSSProperties;
  const user = tweet.core?.user_results?.result;
  const isBlueVerified = getBlueVerified(user);
  const isProtected = getProtected(user);

  return (
    <div className="flex w-full items-center justify-between">
      <div
        className={cn(
          "flex w-full min-w-0 flex-1",
          isReply ? "items-start" : "items-center"
        )}
      >
        <UserHoverCard user={tweet.core?.user_results?.result}>
          <a
            ref={userAvatarRef}
            className={avatarClass}
            href={`/${screenName}`}
          >
            {avatar ? (
              <img
                ref={avatarRef}
                src={avatarCache ?? undefined}
                alt={`${name} 的头像`}
                className="h-full w-full object-cover"
              />
            ) : null}
          </a>
        </UserHoverCard>
        <div className={headerClass}>
          <UserHoverCard
            user={user}
            ref={userNameRef}
            className="items-center min-w-0"
          >
            <span className={nameClass}>{renderWithTwemoji(name)}</span>
            <span className="inline-flex ml-0.5 items-center justify-center h-5 gap-0.5 shrink-0">
              {isProtected ? (
                <ProtectedIcon className="fill-twitter-text-primary" />
              ) : undefined}
              {isBlueVerified ? <BlueVerifiedIcon /> : undefined}
            </span>
          </UserHoverCard>
          <UserHoverCard user={user}>
            <span
              ref={userHandleRef}
              className={handleClass}
              style={handleStyle}
            >
              @{screenName}
            </span>
          </UserHoverCard>
          {showTimestampInHeader ? (
            <span className="text-twitter-text-secondary dark:text-twitter-dark-text-secondary ml-1 shrink-0">
              <span className="mr-1">·</span>
              <span>{createdAt}</span>
            </span>
          ) : null}
        </div>
      </div>
      {isMain ? (
        <button
          className="dark:hover:bg-twitter-dark-background-hover hover:bg-twitter-background-hover inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-transparent p-2 transition"
          onClick={onOpenInNewTab}
        >
          <ExternalLinkIcon />
        </button>
      ) : null}
    </div>
  );
};

export default TweetCardHeader;
