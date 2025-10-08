import {
  CONTENT_EVENT_TYPE_FOLLOWING_LIST_REQUEST,
  EXT_BRIDGE_SOURCE,
  MESSAGE_DIRECTION_TO_INTERCEPTOR,
} from "@common/bridge";

interface RawFollowingListUser {
  id?: number;
  id_str?: string;
  name?: string;
  screen_name?: string;
  description?: string;
  profile_image_url_https?: string;
  profile_image_url?: string;
  following?: boolean;
  followed_by?: boolean;
  can_dm?: boolean | null;
  can_media_tag?: boolean | null;
  muting?: boolean;
  blocking?: boolean;
}

interface RawFollowingListResponse {
  users?: RawFollowingListUser[];
  next_cursor?: number;
  next_cursor_str?: string;
  previous_cursor?: number;
  previous_cursor_str?: string;
  total_count?: number;
}

export type FollowingListEntry = {
  id: string;
  name: string;
  screenName: string;
  description: string;
  avatarUrl: string | null;
  isFollowing: boolean;
  isFollowedBy: boolean;
  canDm: boolean;
  canMediaTag: boolean;
  isMuting: boolean;
  isBlocking: boolean;
};

export type FollowingListResult = {
  users: FollowingListEntry[];
  nextCursor: string | null;
  previousCursor: string | null;
  totalCount: number | null;
};

interface FollowingListRequestOptions {
  userId: string;
  count?: number;
  cursor?: string;
}

interface FollowingListSuccessPayload {
  requestId: string;
  data: RawFollowingListResponse;
  userId: string;
  count?: number;
  cursor?: string;
}

interface FollowingListErrorPayload {
  requestId: string;
  error?: string;
}

interface PendingResolver {
  resolve: (value: FollowingListSuccessPayload) => void;
  reject: (reason?: unknown) => void;
}

const pendingFollowingListRequests = new Map<string, PendingResolver>();

const generateRequestId = (userId: string) =>
  `following-list-${userId}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;

const buildCacheKey = (userId: string, count?: number, cursor?: string) =>
  `${userId}|${typeof count === "number" ? count : "default"}|${
    cursor ?? "start"
  }`;

const followingListCache = new Map<string, FollowingListResult>();

const normalizeFollowingListEntry = (
  user: RawFollowingListUser
): FollowingListEntry | null => {
  const id =
    user.id_str ??
    (typeof user.id === "number" ? String(user.id) : undefined);
  if (!id) return null;
  return {
    id,
    name: user.name ?? "",
    screenName: user.screen_name ?? "",
    description: user.description ?? "",
    avatarUrl:
      user.profile_image_url_https ?? user.profile_image_url ?? null,
    isFollowing: Boolean(user.following),
    isFollowedBy: Boolean(user.followed_by),
    canDm: Boolean(user.can_dm),
    canMediaTag: Boolean(user.can_media_tag),
    isMuting: Boolean(user.muting),
    isBlocking: Boolean(user.blocking),
  };
};

const normalizeFollowingListResponse = (
  payload: RawFollowingListResponse
): FollowingListResult => {
  const users =
    payload.users
      ?.map((user) => normalizeFollowingListEntry(user))
      .filter(
        (entry): entry is FollowingListEntry => Boolean(entry?.id.length)
      ) ?? [];
  const nextCursor =
    payload.next_cursor_str ??
    (typeof payload.next_cursor === "number"
      ? String(payload.next_cursor)
      : null);
  const previousCursor =
    payload.previous_cursor_str ??
    (typeof payload.previous_cursor === "number"
      ? String(payload.previous_cursor)
      : null);
  const totalCount =
    typeof payload.total_count === "number" &&
    Number.isFinite(payload.total_count)
      ? payload.total_count
      : null;
  return {
    users,
    nextCursor: nextCursor && nextCursor !== "0" ? nextCursor : null,
    previousCursor:
      previousCursor && previousCursor !== "0" ? previousCursor : null,
    totalCount,
  };
};

export const handleFollowingListResponse = (
  payload: FollowingListSuccessPayload | FollowingListErrorPayload,
  isError: boolean
) => {
  const resolver = pendingFollowingListRequests.get(payload.requestId);
  if (!resolver) return;
  pendingFollowingListRequests.delete(payload.requestId);
  if (isError) {
    const errorPayload = payload as FollowingListErrorPayload;
    resolver.reject(new Error(errorPayload.error ?? "未知错误"));
    return;
  }
  resolver.resolve(payload as FollowingListSuccessPayload);
};

const sendFollowingListRequest = async (
  options: FollowingListRequestOptions
) => {
  const trimmedUserId = options.userId?.trim();
  if (!trimmedUserId) {
    throw new Error("缺少用户 ID，无法获取关注列表");
  }

  const requestId = generateRequestId(trimmedUserId);
  const payload = {
    requestId,
    userId: trimmedUserId,
    count: typeof options.count === "number" ? options.count : undefined,
    cursor: options.cursor,
  };

  const responsePromise = new Promise<FollowingListSuccessPayload>(
    (resolve, reject) =>
      pendingFollowingListRequests.set(requestId, { resolve, reject })
  );

  window.postMessage(
    {
      source: EXT_BRIDGE_SOURCE,
      direction: MESSAGE_DIRECTION_TO_INTERCEPTOR,
      type: CONTENT_EVENT_TYPE_FOLLOWING_LIST_REQUEST,
      payload,
    },
    "*"
  );

  return responsePromise;
};

export const fetchFollowingList = async (
  options: FollowingListRequestOptions
): Promise<FollowingListResult> => {
  const trimmedUserId = options.userId?.trim();
  if (!trimmedUserId) {
    throw new Error("缺少用户 ID，无法获取关注列表");
  }

  const cacheKey = buildCacheKey(
    trimmedUserId,
    options.count,
    options.cursor
  );
  const cached = followingListCache.get(cacheKey);
  if (cached) return cached;

  const response = await sendFollowingListRequest({
    userId: trimmedUserId,
    count: options.count,
    cursor: options.cursor,
  });
  const normalized = normalizeFollowingListResponse(response.data);
  followingListCache.set(cacheKey, normalized);
  return normalized;
};
