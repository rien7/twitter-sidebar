import { buildGraphqlHeaders, sanitizeHeaders } from "./headerUtils";
import { TWEET_QUERY_OPERATIONS } from "@common/queryId";
import type { CapturedRequest, TweetDetailTemplate } from "@/types/interceptor";

/**
 * Default TweetDetail feature switches. We hydrate these using the latest captured request so that
 * the replayed call mirrors whatever the user triggered in the UI.
 */
export const DEFAULT_TWEET_DETAIL_FEATURES: Record<string, boolean> = {
  articles_preview_enabled: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  communities_web_enable_tweet_community_results_fetch: true,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  freedom_of_speech_not_reach_fetch_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  interactive_text_enabled: true,
  longform_notetweets_consumption_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  payments_enabled: false,
  premium_content_api_read_enabled: false,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  responsive_web_enhance_cards_enabled: false,
  responsive_web_graphql_exclude_directive_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_grok_analysis_button_from_backend: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: true,
  responsive_web_grok_community_note_auto_translation_is_enabled: false,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: true,
  responsive_web_grok_share_attachment_enabled: true,
  responsive_web_grok_show_grok_translated_post: false,
  responsive_web_jetfuel_frame: true,
  responsive_web_text_conversations_enabled: false,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  rweb_tipjar_consumption_enabled: true,
  rweb_video_screen_enabled: false,
  standardized_nudges_misinfo: true,
  tweet_awards_web_tipping_enabled: false,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  verified_phone_label_enabled: false,
  vibe_api_enabled: true,
  view_counts_everywhere_api_enabled: true,
};

/**
 * Default field toggles used when we do not have fresher data from a captured request.
 */
export const DEFAULT_TWEET_DETAIL_FIELD_TOGGLES: Record<string, boolean> = {
  withArticlePlainText: false,
  withArticleRichContentState: true,
  withAuxiliaryUserLabels: false,
  withCategoryGoodId: false,
  withDisallowedReplyControls: false,
  withGrokAnalyze: false,
  withSawaraEnabled: false,
};

const PRESET_TWEET_DETAIL_TEMPLATE: TweetDetailTemplate = {
  url: `/i/api/graphql/${TWEET_QUERY_OPERATIONS["tweet_detail"].id}/TweetDetail`,
  method: "GET",
  headers: {
    accept: "*/*",
    "content-type": "application/json",
  },
  variables: {
    focalTweetId: "",
    includePromotedContent: true,
    rankingMode: "Relevance",
    referrer: "Home",
    withBirdwatchNotes: true,
    withCommunity: true,
    withQuickPromoteEligibilityTweetFields: true,
    withVoice: true,
    with_rux_injections: false,
  },
  features: DEFAULT_TWEET_DETAIL_FEATURES,
  fieldToggles: DEFAULT_TWEET_DETAIL_FIELD_TOGGLES,
};

let tweetDetailTemplate: TweetDetailTemplate | null = null;

const decodeURIComponentSafe = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const parseTemplateFromRequest = (
  request: CapturedRequest
): TweetDetailTemplate | null => {
  try {
    const url = new URL(request.url, window.location.origin);
    const method = request.method || "GET";
    let variables: Record<string, unknown> = {};
    let features: Record<string, unknown> = DEFAULT_TWEET_DETAIL_FEATURES;
    let fieldToggles: Record<string, unknown> =
      DEFAULT_TWEET_DETAIL_FIELD_TOGGLES;

    if (method === "GET") {
      const variablesParam = url.searchParams.get("variables");
      const featuresParam = url.searchParams.get("features");
      const fieldTogglesParam = url.searchParams.get("fieldToggles");
      if (variablesParam)
        variables = JSON.parse(decodeURIComponentSafe(variablesParam));
      if (featuresParam)
        features = JSON.parse(decodeURIComponentSafe(featuresParam));
      if (fieldTogglesParam)
        fieldToggles = JSON.parse(decodeURIComponentSafe(fieldTogglesParam));
      return {
        url: `${url.origin}${url.pathname}`,
        method,
        headers: sanitizeHeaders(request.headers),
        variables: variables ?? {},
        features: features ?? DEFAULT_TWEET_DETAIL_FEATURES,
        fieldToggles: fieldToggles ?? DEFAULT_TWEET_DETAIL_FIELD_TOGGLES,
      };
    }

    const body = request.body ?? "";
    const parsed = body ? JSON.parse(body) : {};
    variables = parsed.variables ?? {};
    features = parsed.features ?? DEFAULT_TWEET_DETAIL_FEATURES;
    fieldToggles = parsed.fieldToggles ?? DEFAULT_TWEET_DETAIL_FIELD_TOGGLES;
    return {
      url: request.url,
      method,
      headers: sanitizeHeaders(request.headers),
      variables,
      features,
      fieldToggles,
    };
  } catch (error) {
    console.warn("[TSB][TweetDetail] 无法解析请求模板", error);
    return null;
  }
};

/**
 * Store the latest TweetDetail template so future requests can reuse the same parameters.
 */
export const updateTweetDetailTemplate = (request: CapturedRequest) => {
  const template = parseTemplateFromRequest(request);
  if (template) {
    tweetDetailTemplate = template;
  }
};

/**
 * Execute a TweetDetail GraphQL request using the freshest template and headers we have observed.
 */
export const performTweetDetailRequest = async (
  tweetId: string,
  controllerData?: string | null
) => {
  const template = tweetDetailTemplate ?? PRESET_TWEET_DETAIL_TEMPLATE;
  const templateVariables = { ...(template.variables ?? {}) } as Record<
    string,
    unknown
  >;
  delete templateVariables.controller_data;
  delete templateVariables.focalTweetId;
  const variables: Record<string, unknown> = {
    ...templateVariables,
    focalTweetId: tweetId,
  };
  if (controllerData) {
    variables.controller_data = controllerData;
  }

  const headers = buildGraphqlHeaders(template.headers);

  if ((template.method ?? "POST").toUpperCase() === "GET") {
    const url = new URL(template.url, window.location.origin);
    url.searchParams.set("variables", JSON.stringify(variables));
    url.searchParams.set(
      "features",
      JSON.stringify(template.features ?? DEFAULT_TWEET_DETAIL_FEATURES)
    );
    url.searchParams.set(
      "fieldToggles",
      JSON.stringify(
        template.fieldToggles ?? DEFAULT_TWEET_DETAIL_FIELD_TOGGLES
      )
    );
    const finalHeaders = new Headers();
    for (const [key, value] of Object.entries(headers)) {
      finalHeaders.set(key, value);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      credentials: "include",
      headers: finalHeaders,
    });
    if (!response.ok) {
      throw new Error(`TweetDetail 请求失败，状态码 ${response.status}`);
    }
    return response.json();
  }

  const finalHeaders = new Headers(headers);

  const response = await fetch(template.url, {
    method: template.method ?? "POST",
    credentials: "include",
    headers: finalHeaders,
    body: JSON.stringify({
      variables,
      features: template.features ?? DEFAULT_TWEET_DETAIL_FEATURES,
      fieldToggles: template.fieldToggles ?? DEFAULT_TWEET_DETAIL_FIELD_TOGGLES,
    }),
  });
  if (!response.ok) {
    throw new Error(`TweetDetail 请求失败，状态码 ${response.status}`);
  }
  return response.json();
};
