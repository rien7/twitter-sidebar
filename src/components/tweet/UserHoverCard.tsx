import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode, RefObject } from "react";
import type { UrlEntity, UserResult } from "@/types/response";
import { cn } from "@/utils/cn";
import { followUser, unfollowUser } from "@/api/friendships";
import { renderWithTwemoji } from "@/utils/twemoji";
import {
  fetchFollowingList,
  type FollowingListEntry,
} from "@/api/followingList";

const formatter = new Intl.NumberFormat("zh-CN");

type UserHoverCardProps = {
  user?: UserResult | null;
  children: ReactNode;
  ref?: RefObject<HTMLDivElement | null>;
  className?: string;
  placement?: "left" | "right";
};

const getAvatar = (user?: UserResult | null) => {
  const legacy = user?.legacy;
  const avatar =
    legacy?.profile_image_url_https ??
    legacy?.profile_image_url ??
    user?.avatar?.image_url ??
    undefined;
  if (!avatar) return undefined;
  return avatar.replace("_normal", "_400x400");
};

const getName = (user?: UserResult | null) => {
  const legacy = user?.legacy;
  return {
    name: legacy?.name ?? user?.core?.name ?? "未知用户",
    screenName: legacy?.screen_name ?? user?.core?.screen_name ?? "",
  };
};

const buildDescriptionNodes = (user?: UserResult | null) => {
  const description = user?.legacy?.description ?? "";
  if (!description) return [] as Array<{ key: string; node: ReactNode }>;
  const characters = Array.from(description);
  const urls = (user?.legacy?.entities?.description?.urls ?? []) as UrlEntity[];
  const normalized = urls
    .filter((url) => Array.isArray(url.indices) && url.indices.length === 2)
    .map((url, index) => ({
      start: url.indices[0],
      end: url.indices[1],
      href: url.expanded_url ?? url.url,
      display: url.display_url ?? url.expanded_url ?? url.url,
      key: `url-${index}`,
    }))
    .sort((a, b) => a.start - b.start);

  const nodes: Array<{ key: string; node: ReactNode }> = [];
  let cursor = 0;
  let keyIndex = 0;

  const pushPlain = (from: number, to: number) => {
    if (to <= from) return;
    const text = characters.slice(from, to).join("");
    if (!text) return;
    nodes.push({
      key: `text-${keyIndex++}`,
      node: <span>{renderWithTwemoji(text)}</span>,
    });
  };

  normalized.forEach((entity) => {
    if (entity.end <= cursor) return;
    pushPlain(cursor, entity.start);
    const label = characters.slice(entity.start, entity.end).join("");
    const display = entity.display ?? label;
    nodes.push({
      key: entity.key,
      node: (
        <a
          href={entity.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-twitter-accent hover:underline"
        >
          {display}
        </a>
      ),
    });
    cursor = entity.end;
  });

  pushPlain(cursor, characters.length);

  return nodes;
};

const formatCount = (value?: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0) return null;
  return formatter.format(value);
};

const UserHoverCard = ({
  user,
  children,
  className,
  ref,
  placement = "left",
}: UserHoverCardProps) => {
  const [open, setOpen] = useState(false);
  const enterTimer = useRef<number | null>(null);
  const leaveTimer = useRef<number | null>(null);
  const { name, screenName } = useMemo(() => getName(user), [user]);
  const avatar = useMemo(() => getAvatar(user), [user]);
  const descriptionNodes = useMemo(() => buildDescriptionNodes(user), [user]);

  const followers = formatCount(user?.legacy?.followers_count ?? null);
  const following = formatCount(user?.legacy?.friends_count ?? null);
  const followby = user?.relationship_perspectives?.followed_by;
  const derivedFollowing = Boolean(user?.relationship_perspectives?.following);
  const userId = user?.rest_id ?? (user?.id as string | undefined);
  const [isFollowing, setIsFollowing] = useState(derivedFollowing);
  const [fromUnfollow, setFromUnfollow] = useState(false);
  const [isHoveringButton, setIsHoveringButton] = useState(false);

  const [followingPreview, setFollowingPreview] = useState<
    FollowingListEntry[] | null
  >(null);
  const [followingTotalCount, setFollowingTotalCount] = useState<number | null>(
    null
  );
  const lastFollowingRequestUserIdRef = useRef<string | null>(null);

  const clearTimers = () => {
    if (enterTimer.current !== null) {
      window.clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    if (leaveTimer.current !== null) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearTimers();
    enterTimer.current = window.setTimeout(() => setOpen(true), 480);
  };

  const handleMouseLeave = () => {
    clearTimers();
    leaveTimer.current = window.setTimeout(() => setOpen(false), 480);
  };

  const handleMouseEnterButton = () => {
    setIsHoveringButton(true);
  };

  const handleMouseLeaveButton = () => {
    setIsHoveringButton(false);
    setFromUnfollow(false);
  };

  useEffect(() => {
    if (!userId) {
      setFollowingPreview(null);
      setFollowingTotalCount(null);
      lastFollowingRequestUserIdRef.current = null;
      return;
    }
    if (lastFollowingRequestUserIdRef.current !== userId) {
      setFollowingPreview(null);
    }
  }, [userId]);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (!open || !userId) return;
    if (
      lastFollowingRequestUserIdRef.current === userId &&
      followingPreview !== null
    ) {
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      const result = await fetchFollowingList({ userId, count: 3 });
      if (cancelled) return;
      setFollowingPreview(result.users);
      setFollowingTotalCount(
        typeof result.totalCount === "number" ? result.totalCount : null
      );
    };

    fetchData();
    lastFollowingRequestUserIdRef.current = userId;

    return () => {
      cancelled = true;
    };
  }, [open, userId, followingPreview]);

  const followLabel = isFollowing
    ? isHoveringButton && !fromUnfollow
      ? "取消关注"
      : "正在关注"
    : "关注";
  const handleFollow = useCallback(
    async (e: React.MouseEvent) => {
      if (!userId) return;
      const previousState = isFollowing;
      const nextState = !previousState;
      setIsFollowing(nextState);
      e.stopPropagation();
      e.preventDefault();
      try {
        if (previousState) {
          await unfollowUser(userId);
        } else {
          setFromUnfollow(true);
          await followUser(userId);
        }
      } catch (error) {
        console.error("[TSB][Follow] 操作失败", error);
        setIsFollowing(nextState);
      }
    },
    [userId, isFollowing, setIsFollowing]
  );

  const alignmentClass = placement === "right" ? "right-0" : "left-0";

  return (
    <div
      ref={ref}
      className={cn("relative inline-flex", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {open && user ? (
        <div
          className={cn(
            "border-twitter-border-light dark:border-twitter-dark-border-light bg-twitter-background-surface dark:bg-twitter-dark-background-surface shadow-twitter-card absolute top-full z-50 mt-2 w-[360px] max-w-[90vw] rounded-2xl border p-4",
            alignmentClass
          )}
        >
          <div className="flex items-start gap-3">
            <div className="h-16 w-16 overflow-hidden rounded-full">
              {avatar ? (
                <img
                  src={avatar}
                  alt={`${name} 的头像`}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleFollow}
              disabled={!userId}
              onMouseEnter={handleMouseEnterButton}
              onMouseLeave={handleMouseLeaveButton}
              onFocus={handleMouseEnterButton}
              onBlur={handleMouseLeaveButton}
              className={cn(
                "ml-auto rounded-full px-4 py-1 text-[15px] hover:cursor-pointer leading-[20px] min-h-[36px] border border-solid font-semibold focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 transition-colors",
                (!isFollowing ||
                  (isFollowing && isHoveringButton && fromUnfollow)) &&
                  "bg-twitter-background-inverse border-twitter-background-inverse text-twitter-text-inverse",
                isFollowing &&
                  isHoveringButton &&
                  !fromUnfollow &&
                  "bg-red-50 dark:bg-transparent border-red-500 text-red-500",
                isFollowing &&
                  !isHoveringButton &&
                  !fromUnfollow &&
                  "border-twitter-border-strong text-twitter-text-primary bg-transparent"
              )}
            >
              {followLabel}
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <div className="text-twitter-text-primary dark:text-twitter-dark-text-primary text-[17px] font-bold">
              {renderWithTwemoji(name)}
            </div>
            {screenName ? (
              <div className="flex items-center">
                <div className="text-twitter-text-secondary dark:text-twitter-dark-text-secondary text-[15px]">
                  @{screenName}
                </div>
                {followby ? (
                  <div className="dark:bg-[#202327] bg-[#eff3f4] text-[#536471] dark:text-[#71767b] font-medium leading-[12px] text-[11px] ml-[4px] px-[4px] py-[2px] rounded-[4px]">
                    Follows you
                  </div>
                ) : undefined}
              </div>
            ) : null}
            {descriptionNodes.length > 0 ? (
              <div className="text-twitter-text-primary dark:text-twitter-dark-text-primary whitespace-pre-wrap break-words text-[15px] leading-6">
                {descriptionNodes.map(({ key, node }) => (
                  <span key={key} className="[&>a]:font-normal">
                    {node}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          {(followers || following) && (
            <div className="mt-3 flex gap-4 text-[15px]">
              {following ? (
                <a
                  href={
                    screenName
                      ? `https://x.com/${screenName}/following`
                      : undefined
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-twitter-text-secondary dark:text-twitter-dark-text-secondary hover:underline"
                >
                  <span className="text-twitter-text-primary dark:text-twitter-dark-text-primary font-semibold">
                    {following}
                  </span>{" "}
                  正在关注
                </a>
              ) : null}
              {followers ? (
                <a
                  href={
                    screenName
                      ? `https://x.com/${screenName}/followers`
                      : undefined
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-twitter-text-secondary dark:text-twitter-dark-text-secondary hover:underline"
                >
                  <span className="text-twitter-text-primary dark:text-twitter-dark-text-primary font-semibold">
                    {followers}
                  </span>{" "}
                  粉丝
                </a>
              ) : null}
            </div>
          )}
          {followingPreview &&
          followingPreview.length > 0 &&
          followingTotalCount ? (
            <a
              className="mt-3 flex"
              href={`https://x.com/${screenName}/followers_you_follow`}
            >
              <div className="h-full flex shrink-0">
                {followingPreview.slice(0, 3).map((entry, index) => {
                  const previewAvatar = entry.avatarUrl ?? undefined;
                  return (
                    <img
                      key={entry.id}
                      src={previewAvatar}
                      alt={`${entry.name || entry.screenName} 的头像`}
                      className={cn(
                        "h-7 w-7 rounded-full object-cover border-white border border-solid top-0 bottom-0",
                        index > 0 && "-ml-3.5"
                      )}
                      style={{
                        zIndex: 4 - index,
                      }}
                    />
                  );
                })}
              </div>
              <div className="grow ml-1 text-twitter-text-secondary text-sm">
                Following by{" "}
                {followingPreview.slice(0, 2).map((f, i) => {
                  return (
                    <Fragment key={i}>
                      {renderWithTwemoji(f.name)}
                      {i === 0 ? ", " : undefined}
                    </Fragment>
                  );
                })}{" "}
                {followingTotalCount > 2
                  ? `and ${followingTotalCount - 2} others you follow`
                  : undefined}
              </div>
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default UserHoverCard;
