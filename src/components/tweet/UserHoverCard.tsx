import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { UrlEntity, UserResult } from "@/types/response";
import { cn } from "@/utils/cn";

const formatter = new Intl.NumberFormat("zh-CN");

type UserHoverCardProps = {
  user?: UserResult | null;
  children: ReactNode;
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
    nodes.push({ key: `text-${keyIndex++}`, node: <span>{text}</span> });
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
  const isFollowing = Boolean(user?.relationship_perspectives?.following);

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

  useEffect(() => () => clearTimers(), []);

  const followLabel = isFollowing ? "正在关注" : "关注";
  const handleFollow = () => {
    if (!screenName) return;
    window.open(`https://twitter.com/${screenName}`, "_blank", "noopener");
  };

  const alignmentClass = placement === "right" ? "right-0" : "left-0";

  return (
    <div
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
              className={cn(
                "focus-visible:ring-twitter-ring-focus dark:focus-visible:ring-twitter-dark-ring-focus focus-visible:ring-offset-twitter-ring-offset dark:focus-visible:ring-offset-twitter-dark-ring-offset ml-auto rounded-full px-4 py-1 text-[15px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                isFollowing
                  ? "border-twitter-border-strong dark:border-twitter-dark-border-strong text-twitter-text-primary dark:text-twitter-dark-text-primary border bg-transparent"
                  : "bg-twitter-background-inverse dark:bg-twitter-dark-background-inverse dark:text-twitter-dark-text-primary hover:bg-twitter-background-hover-inverse dark:hover:bg-twitter-dark-background-hover-inverse text-white"
              )}
            >
              {followLabel}
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <div className="text-twitter-text-primary dark:text-twitter-dark-text-primary text-[17px] font-bold">
              {name}
            </div>
            {screenName ? (
              <div className="text-twitter-text-secondary dark:text-twitter-dark-text-secondary text-[15px]">
                @{screenName}
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
                      ? `https://twitter.com/${screenName}/following`
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
                      ? `https://twitter.com/${screenName}/followers`
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
        </div>
      ) : null}
    </div>
  );
};

export default UserHoverCard;
