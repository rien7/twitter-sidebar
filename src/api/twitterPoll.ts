import {
  CONTENT_EVENT_TYPE_POLL_VOTE_REQUEST,
  EXT_BRIDGE_SOURCE,
  MESSAGE_DIRECTION_TO_INTERCEPTOR,
} from "@common/bridge";
import { createRequestId } from "@/utils/requestId";

interface PollVoteSuccessPayload {
  requestId: string;
  data: unknown;
}

interface PollVoteErrorPayload {
  requestId: string;
  error?: string;
}

interface PendingResolver {
  resolve: (value: PollVoteSuccessPayload) => void;
  reject: (reason?: unknown) => void;
}

const pendingPollVotes = new Map<string, PendingResolver>();

export const handlePollVoteResponse = (
  payload: PollVoteSuccessPayload | PollVoteErrorPayload,
  isError: boolean
) => {
  const resolver = pendingPollVotes.get(payload.requestId);
  if (!resolver) return;
  pendingPollVotes.delete(payload.requestId);
  if (isError) {
    const errorPayload = payload as PollVoteErrorPayload;
    resolver.reject(new Error(errorPayload.error ?? "未知错误"));
    return;
  }
  resolver.resolve(payload as PollVoteSuccessPayload);
};

export interface VoteInPollParams {
  endpoint: string;
  cardUri: string;
  cardName: string;
  tweetId: string;
  choiceId: number;
  cardsPlatform?: string;
}

/**
 * 提交推文投票。由内容脚本发起消息，由注入脚本在原页面上下文内完成请求。
 */
export const voteInPoll = async ({
  endpoint,
  cardUri,
  cardName,
  tweetId,
  choiceId,
  cardsPlatform = "Web-12",
}: VoteInPollParams) => {
  if (!endpoint) {
    throw new Error("缺少投票接口地址，无法提交投票");
  }
  if (!cardUri) {
    throw new Error("缺少投票卡片标识，无法提交投票");
  }
  if (!cardName) {
    throw new Error("缺少投票卡片名称，无法提交投票");
  }
  const requestId = createRequestId("poll-vote");
  const payload = {
    requestId,
    endpoint,
    cardUri,
    cardName,
    tweetId,
    choiceId,
    cardsPlatform,
  } satisfies {
    requestId: string;
    endpoint: string;
    cardUri: string;
    cardName: string;
    tweetId: string;
    choiceId: number;
    cardsPlatform: string;
  };

  const resultPromise = new Promise<PollVoteSuccessPayload>((resolve, reject) => {
    pendingPollVotes.set(requestId, { resolve, reject });
  });

  window.postMessage(
    {
      source: EXT_BRIDGE_SOURCE,
      direction: MESSAGE_DIRECTION_TO_INTERCEPTOR,
      type: CONTENT_EVENT_TYPE_POLL_VOTE_REQUEST,
      payload,
    },
    "*"
  );

  return resultPromise;
};
