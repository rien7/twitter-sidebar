import {
  CONTENT_EVENT_TYPE_FRIENDSHIP_REQUEST,
  EXT_BRIDGE_SOURCE,
  MESSAGE_DIRECTION_TO_INTERCEPTOR,
} from "@common/bridge";

type FriendshipAction = "follow" | "unfollow";

interface FriendshipSuccessPayload {
  requestId: string;
  data: unknown;
  action: FriendshipAction;
  userId: string;
}

interface FriendshipErrorPayload {
  requestId: string;
  error?: string;
}

interface PendingResolver {
  resolve: (value: FriendshipSuccessPayload) => void;
  reject: (reason?: unknown) => void;
}

const DEFAULT_FORM_PARAMS: Record<string, string> = {
  include_profile_interstitial_type: "1",
  include_blocking: "1",
  include_blocked_by: "1",
  include_followed_by: "1",
  include_want_retweets: "1",
  include_mute_edge: "1",
  include_can_dm: "1",
  include_can_media_tag: "1",
  include_ext_is_blue_verified: "1",
  include_ext_verified_type: "1",
  include_ext_profile_image_shape: "1",
  skip_status: "1",
};

const pendingFriendshipRequests = new Map<string, PendingResolver>();

const generateRequestId = (action: FriendshipAction, userId: string) =>
  `${action}-${userId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const buildFormBody = (userId: string) => {
  const params = new URLSearchParams(DEFAULT_FORM_PARAMS);
  params.set("user_id", userId);
  return params.toString();
};

export const handleFriendshipResponse = (
  payload: FriendshipSuccessPayload | FriendshipErrorPayload,
  isError: boolean
) => {
  const resolver = pendingFriendshipRequests.get(payload.requestId);
  if (!resolver) return;
  pendingFriendshipRequests.delete(payload.requestId);
  if (isError) {
    const errorPayload = payload as FriendshipErrorPayload;
    resolver.reject(new Error(errorPayload.error ?? "未知错误"));
    return;
  }
  resolver.resolve(payload as FriendshipSuccessPayload);
};

const sendFriendshipRequest = async (
  action: FriendshipAction,
  userId: string
): Promise<FriendshipSuccessPayload> => {
  const trimmedUserId = userId?.trim();
  if (!trimmedUserId) {
    throw new Error("缺少用户 ID，无法继续关注操作");
  }

  const requestId = generateRequestId(action, trimmedUserId);
  const payload = {
    requestId,
    action,
    userId: trimmedUserId,
    body: buildFormBody(trimmedUserId),
  } satisfies {
    requestId: string;
    action: FriendshipAction;
    userId: string;
    body: string;
  };

  const resultPromise = new Promise<FriendshipSuccessPayload>(
    (resolve, reject) => pendingFriendshipRequests.set(requestId, { resolve, reject })
  );

  window.postMessage(
    {
      source: EXT_BRIDGE_SOURCE,
      direction: MESSAGE_DIRECTION_TO_INTERCEPTOR,
      type: CONTENT_EVENT_TYPE_FRIENDSHIP_REQUEST,
      payload,
    },
    "*"
  );

  return resultPromise;
};

export const followUser = (userId: string) =>
  sendFriendshipRequest("follow", userId);

export const unfollowUser = (userId: string) =>
  sendFriendshipRequest("unfollow", userId);
