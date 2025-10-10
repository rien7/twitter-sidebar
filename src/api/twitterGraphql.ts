import {
  CONTENT_EVENT_TYPE_ACTION_REQUEST,
  EXT_BRIDGE_SOURCE,
  MESSAGE_DIRECTION_TO_INTERCEPTOR,
} from "@common/bridge";
import {
  TWEET_QUERY_OPERATIONS,
  type TweetQueryOperationKey,
} from "@common/queryId";
import type { TweetResultByRestIdResponse } from "@/types/response";
import { createRequestId } from "@/utils/requestId";

interface ActionSuccessPayload {
  requestId: string;
  data: unknown;
}

interface ActionErrorPayload {
  requestId: string;
  error?: string;
}

interface PendingResolver {
  resolve: (value: ActionSuccessPayload) => void;
  reject: (reason?: unknown) => void;
}

const pendingActionRequests = new Map<string, PendingResolver>();

export const handleActionResponse = (
  payload: ActionSuccessPayload | ActionErrorPayload,
  isError: boolean
) => {
  const resolver = pendingActionRequests.get(payload.requestId);
  if (!resolver) return;
  pendingActionRequests.delete(payload.requestId);
  if (isError) {
    const errorPayload = payload as ActionErrorPayload;
    resolver.reject(new Error(errorPayload.error ?? "未知错误"));
    return;
  }
  resolver.resolve(payload as ActionSuccessPayload);
};

const sendTweetActionRequest = async (
  key: TweetQueryOperationKey,
  variables: Record<string, unknown>,
  options?: {
    features?: Record<string, unknown>;
    method?: "GET" | "POST";
    fieldToggles?: Record<string, unknown>;
  }
): Promise<ActionSuccessPayload> => {
  const config = TWEET_QUERY_OPERATIONS[key];
  if (!config?.id || !config.operationName) {
    throw new Error(`未配置 ${key} 对应的 GraphQL 文档 ID，无法继续调用。`);
  }

  const requestId = createRequestId(key);
  const payload = {
    requestId,
    docId: config.id,
    operationName: config.operationName,
    variables,
    features: options?.features,
    method: options?.method ?? config.method ?? "POST",
    fieldToggles: options?.fieldToggles,
  } satisfies {
    requestId: string;
    docId: string;
    operationName: string;
    variables: Record<string, unknown>;
    features?: Record<string, unknown>;
    method?: "GET" | "POST";
    fieldToggles?: Record<string, unknown>;
  };

  const resultPromise = new Promise<ActionSuccessPayload>((resolve, reject) => {
    pendingActionRequests.set(requestId, { resolve, reject });
  });

  window.postMessage(
    {
      source: EXT_BRIDGE_SOURCE,
      direction: MESSAGE_DIRECTION_TO_INTERCEPTOR,
      type: CONTENT_EVENT_TYPE_ACTION_REQUEST,
      payload,
    },
    "*"
  );

  return resultPromise;
};

const TWEET_RESULT_BY_REST_ID_FEATURES: Record<string, boolean> = {
  creator_subscriptions_tweet_preview_api_enabled: true,
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: true,
  responsive_web_jetfuel_frame: true,
  responsive_web_grok_share_attachment_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  responsive_web_grok_show_grok_translated_post: false,
  responsive_web_grok_analysis_button_from_backend: true,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  payments_enabled: false,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  rweb_tipjar_consumption_enabled: true,
  verified_phone_label_enabled: false,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: true,
  responsive_web_grok_community_note_auto_translation_is_enabled: false,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_enhance_cards_enabled: false,
};

const TWEET_RESULT_BY_REST_ID_FIELD_TOGGLES: Record<string, boolean> = {
  withArticleRichContentState: true,
  withArticlePlainText: false,
};

/**
 * Twitter GraphQL 推文相关接口默认需要启用的特性开关。
 *
 * 这些字段来自浏览器真实发起的 CreateTweet/Reply 请求，
 * 如无特殊需求建议保持默认以确保服务端行为一致。
 */
const DEFAULT_TWEET_MUTATION_FEATURES: Record<string, boolean> = {
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: true,
  responsive_web_jetfuel_frame: true,
  responsive_web_grok_share_attachment_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  responsive_web_grok_show_grok_translated_post: false,
  responsive_web_grok_analysis_button_from_backend: true,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  payments_enabled: false,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  rweb_tipjar_consumption_enabled: true,
  verified_phone_label_enabled: false,
  articles_preview_enabled: true,
  responsive_web_grok_community_note_auto_translation_is_enabled: false,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_enhance_cards_enabled: false,
};

export const fetchTweetResultByRestId = async (
  tweetId: string,
  controllerData?: string | null
): Promise<TweetResultByRestIdResponse> => {
  const variables: Record<string, unknown> = {
    tweetId,
    withCommunity: true,
    includePromotedContent: false,
    withQuickPromoteEligibilityTweetFields: true,
    withVoice: true,
    withBirdwatchNotes: true,
    with_rux_injections: false,
  };

  if (controllerData) {
    variables.controller_data = controllerData;
  }

  const { data } = await sendTweetActionRequest(
    "tweet_result_by_rest_id",
    variables,
    {
      features: TWEET_RESULT_BY_REST_ID_FEATURES,
      method: "GET",
      fieldToggles: TWEET_RESULT_BY_REST_ID_FIELD_TOGGLES,
    }
  );

  return (data ?? null) as TweetResultByRestIdResponse;
};

/**
 * 推文或回复中引用的媒体资源描述。
 */
interface TweetMediaEntityInput {
  media_id: string;
  tagged_users?: string[];
}

interface CreateReplyParams {
  tweetId: string;
  text: string;
  excludeReplyUserIds?: string[];
  batchCompose?: "BatchInitial" | "BatchSubsequent";
  darkRequest?: boolean;
  mediaEntities?: TweetMediaEntityInput[];
  possiblySensitive?: boolean;
  semanticAnnotationIds?: string[];
  disallowedReplyOptions?: unknown;
  featuresOverride?: Record<string, unknown>;
}

/**
 * 构造 CreateTweet/Reply GraphQL 所需的基础字段。
 */
const buildTweetMutationVariables = ({
  text,
  batchCompose,
  darkRequest,
  mediaEntities,
  possiblySensitive,
  semanticAnnotationIds,
  disallowedReplyOptions,
}: {
  text: string;
  batchCompose: "BatchInitial" | "BatchSubsequent";
  darkRequest: boolean;
  mediaEntities: TweetMediaEntityInput[];
  possiblySensitive: boolean;
  semanticAnnotationIds: string[];
  disallowedReplyOptions: unknown;
}) => {
  const variables: Record<string, unknown> = {
    tweet_text: text,
    batch_compose: batchCompose,
    dark_request: darkRequest,
    semantic_annotation_ids: semanticAnnotationIds,
    disallowed_reply_options: disallowedReplyOptions,
  };

  if (mediaEntities.length > 0 || possiblySensitive) {
    variables.media = {
      media_entities: mediaEntities,
      possibly_sensitive: possiblySensitive,
    };
  }

  return variables;
};

/**
 * 针对现有推文创建回复。
 */
export const createReply = ({
  tweetId,
  text,
  excludeReplyUserIds = [],
  batchCompose = "BatchSubsequent",
  darkRequest = false,
  mediaEntities = [],
  possiblySensitive = false,
  semanticAnnotationIds = [],
  disallowedReplyOptions = null,
  featuresOverride,
}: CreateReplyParams) => {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("回复内容不能为空");
  }
  const features = {
    ...DEFAULT_TWEET_MUTATION_FEATURES,
    ...(featuresOverride ?? {}),
  };
  const variables = buildTweetMutationVariables({
    text: trimmed,
    batchCompose,
    darkRequest,
    mediaEntities,
    possiblySensitive,
    semanticAnnotationIds,
    disallowedReplyOptions,
  });

  variables.reply = {
    in_reply_to_tweet_id: tweetId,
    exclude_reply_user_ids: excludeReplyUserIds,
  };

  return sendTweetActionRequest("create_tweet", variables, { features });
};

export const favoriteTweet = (tweetId: string) =>
  sendTweetActionRequest("favorite", { tweet_id: tweetId });

export const unfavoriteTweet = (tweetId: string) =>
  sendTweetActionRequest("unfavorite", { tweet_id: tweetId });

export const createRetweet = (tweetId: string) =>
  sendTweetActionRequest("retweet", {
    tweet_id: tweetId,
    dark_request: false,
  });

export const deleteRetweet = (tweetId: string) =>
  sendTweetActionRequest("unretweet", {
    tweet_id: tweetId,
    dark_request: false,
  });

export const createBookmark = (tweetId: string) =>
  sendTweetActionRequest("bookmark", { tweet_id: tweetId });

export const deleteBookmark = (tweetId: string) =>
  sendTweetActionRequest("unbookmark", { tweet_id: tweetId });

export type TweetActionRequestResult = ActionSuccessPayload;
