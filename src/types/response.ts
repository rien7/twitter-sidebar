/* ------------------------------ Root ------------------------------ */

export interface TweetResponse {
  data?: {
    home?: {
      home_timeline_urt?: {
        instructions?: Instruction[];
      };
    };
    threaded_conversation_with_injections_v2?: {
      instructions?: Instruction[];
    };
    user?: {
      result?: UserTimelineUnion;
    };
    /** Search page GraphQL response shape */
    search_by_raw_query?: {
      search_timeline?: {
        timeline?: {
          instructions?: Instruction[];
        };
      };
    };
  };
}

export type UserTimelineUnion =
  | {
      __typename?: "User";
      timeline?: {
        timeline?: {
          instructions?: Instruction[];
        };
      };
    }
  | {
      __typename?: string;
      timeline?: {
        timeline?: {
          instructions?: Instruction[];
        };
      };
    }
  | null
  | undefined;

/* --------------------------- Instructions ------------------------- */

export type Instruction =
  | TimelineAddEntriesInstruction
  | TimelinePinEntryInstruction;
// 预留：后续可能有 TimelineClearCache、TerminateTimeline 等

export interface TimelineAddEntriesInstruction {
  type: "TimelineAddEntries";
  entries: Entry[];
}

export interface TimelinePinEntryInstruction {
  type: "TimelinePinEntry";
  entry?: Entry;
}

/* ------------------------------- Entry ---------------------------- */

export interface Entry {
  entryId: string; // e.g. "tweet-1971745236406956335"
  sortIndex: string; // e.g. "1972337435601797120"
  content: TimelineItemContent | TimelineModuleContent;
  feedbackInfo?: { feedbackKeys: string[] };
  clientEventInfo?: ClientEventInfo;
}

export interface ClientEventInfo {
  component?: string; // e.g. "for_you_list"
  element?: string; // e.g. "tweet"
  details?: {
    timelinesDetails?: {
      injectionType?: string; // e.g. "ForYouList"
      controllerData?: string; // base64-ish packed string
    };
  };
}

/* ----------------------- Timeline Item Content -------------------- */

export interface TimelineItemContent {
  entryType: "TimelineTimelineItem";
  __typename: "TimelineTimelineItem";
  itemContent: ItemContent;
  feedbackInfo?: { feedbackKeys: string[] };
  clientEventInfo?: ClientEventInfo;
}

export interface TimelineModuleContent {
  entryType: "TimelineTimelineModule";
  __typename: "TimelineTimelineModule";
  items?: TimelineModuleItem[];
  metadata?: {
    conversationMetadata?: {
      allTweetIds?: string[];
      enableDeduplication?: boolean;
    };
  };
  displayType?: string | null;
  clientEventInfo?: {
    component?: string;
    element?: string;
    details?: {
      conversationDetails?: {
        conversationSection?: string;
      };
      timelinesDetails?: {
        controllerData?: string;
      };
    };
  };
}

export interface TimelineModuleItem {
  entryId?: string;
  item?: {
    itemContent?: ItemContent;
    clientEventInfo?: ClientEventInfo;
  };
  clientEventInfo?: ClientEventInfo;
}

export interface ItemContent {
  itemType: "TimelineTweet";
  __typename: "TimelineTweet";
  tweet_results: TweetResults | unknown;
  tweetDisplayType: "Tweet";
  promotedMetadata?: unknown;
}

/* ---------------------------- Tweet Core -------------------------- */

export interface TweetLimitedActionPromptText {
  text?: string;
  entities?: unknown[];
}

export interface TweetLimitedActionPrompt {
  __typename?: string;
  cta_type?: string;
  headline?: TweetLimitedActionPromptText;
  subtext?: TweetLimitedActionPromptText;
}

export interface TweetLimitedAction {
  action?: string;
  prompt?: TweetLimitedActionPrompt;
}

export interface TweetLimitedActionResults {
  limited_actions?: TweetLimitedAction[];
}

export interface TweetWithVisibilityResults {
  __typename: "TweetWithVisibilityResults";
  tweet?: TweetResult;
  limitedActionResults?: TweetLimitedActionResults;
  [k: string]: unknown;
}

export type TweetResults = {
  result?: TweetResult | TweetWithVisibilityResults | TweetTombstone;
};

export interface TweetTombstone {
  __typename: "TweetTombstone";
  tombstone?: {
    __typename?: string;
    text?: TombstoneText;
  };
  [k: string]: unknown;
}

export interface TombstoneText {
  text?: string;
  rtl?: boolean;
  entities?: TombstoneEntity[];
}

export interface TombstoneEntity {
  fromIndex?: number;
  toIndex?: number;
  ref?: {
    type?: string;
    url?: string;
    urlType?: string;
    [k: string]: unknown;
  };
}

export interface TweetResult {
  __typename: "Tweet";
  rest_id: string;

  /* —— 作者与用户信息 —— */
  core?: {
    user_results?: {
      result?: UserResult;
    };
  };

  /* —— 可选的媒体描述（图/视频）—— */
  post_image_description?: string;
  post_video_description?: string;

  /* —— 各类元数据（可选）—— */
  unmention_data?: Record<string, unknown>;
  edit_control?: EditControl;
  previous_counts?: TweetCounts;
  is_translatable?: boolean;
  views?: { count?: string; state?: string };
  source?: string; // HTML 超链接来源字符串
  note_tweet?: NoteTweet;
  grok_analysis_button?: boolean;

  /* —— 被引用的推文 —— */
  quoted_status_result?: {
    result?: TweetResult | TweetWithVisibilityResults;
  };
  /** —— 被转推的原文 —— */
  retweeted_status_result?: {
    result?: TweetResult | TweetWithVisibilityResults;
  };

  /* —— GraphQL 风格扩展：legacy 字段包含绝大部分“旧”结构 —— */
  legacy?: LegacyTweet;

  /* —— Twitter Card —— */
  card?: TweetCard;

  /* —— 其他可选字段以防兼容 —— */
  [k: string]: unknown;
}

export interface TweetCard {
  rest_id?: string;
  legacy?: TweetCardLegacy;
}

export interface TweetCardLegacy {
  binding_values?:
    | TweetCardBindingValue[]
    | Record<string, TweetCardBindingValueValue>
    | null;
  name?: string;
  url?: string;
  card_platform?: Record<string, unknown>;
  user_refs_results?: Array<{ result?: UserResult } | null | undefined>;
}

export interface TweetCardBindingValueValue {
  type?: string;
  string_value?: string;
  scribe_key?: string;
  boolean_value?: boolean;
  long_value?: string;
  image_value?: {
    url?: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  image_color_value?: {
    palette?: Array<{
      rgb?: { red?: number; green?: number; blue?: number };
      percentage?: number;
    }>;
  };
  user_value?: {
    id_str?: string;
    path?: string[];
  };
}

export interface TweetCardBindingValue {
  key?: string;
  value?: TweetCardBindingValueValue;
}

/* --------------------------- User (Author) ------------------------ */

export interface UserResult {
  __typename: "User";
  id?: string; // base64-like id
  rest_id?: string; // 数字字符串 id
  affiliates_highlighted_label?: Record<string, unknown>;
  avatar?: { image_url?: string };
  core?: {
    created_at?: string;
    name?: string;
    screen_name?: string;
  };
  dm_permissions?: { can_dm?: boolean; can_dm_on_xchat?: boolean };
  has_graduated_access?: boolean;
  is_blue_verified?: boolean;
  legacy?: {
    name?: string;
    screen_name?: string;
    default_profile?: boolean;
    default_profile_image?: boolean;
    description?: string;
    entities?: {
      description?: { urls?: UrlEntity[] };
      url?: { urls?: UrlEntity[] };
    };
    profile_image_url_https?: string;
    profile_image_url?: string;
    fast_followers_count?: number;
    favourites_count?: number;
    followers_count?: number;
    friends_count?: number;
    has_custom_timelines?: boolean;
    is_translator?: boolean;
    listed_count?: number;
    media_count?: number;
    normal_followers_count?: number;
    pinned_tweet_ids_str?: string[];
    possibly_sensitive?: boolean;
    profile_banner_url?: string;
    profile_interstitial_type?: string;
    statuses_count?: number;
    translator_type?: string;
    want_retweets?: boolean;
    withheld_in_countries?: string[];
  };
  location?: { location?: string };
  media_permissions?: { can_media_tag?: boolean };
  parody_commentary_fan_label?: string;
  profile_image_shape?: "Circle" | "Square" | string;
  professional?: {
    rest_id?: string;
    professional_type?: string;
    category?: Array<{ id: number; name: string; icon_name?: string }>;
  };
  privacy?: { protected?: boolean };
  relationship_perspectives?: { following?: boolean };
  tipjar_settings?: {
    is_enabled?: boolean;
    ethereum_handle?: string;
    bitcoin_handle?: string;
  };
  verification?: { verified?: boolean };
  url?: string;
  [k: string]: unknown;
}

/* ---------------------------- Edit Control ------------------------ */

export interface EditControl {
  initial_tweet_id?: string;
  edit_control_initial?: {
    edit_tweet_ids?: string[];
    editable_until_msecs?: string;
    is_edit_eligible?: boolean;
    edits_remaining?: string;
  };
  edit_tweet_ids?: string[]; // 也可能直接出现
  editable_until_msecs?: string;
  is_edit_eligible?: boolean;
  edits_remaining?: string;
}

/* ----------------------------- Counts ----------------------------- */

export interface TweetCounts {
  bookmark_count?: number;
  favorite_count?: number;
  quote_count?: number;
  reply_count?: number;
  retweet_count?: number;
}

/* ---------------------------- Note Tweet -------------------------- */

export interface NoteTweet {
  is_expandable?: boolean;
  note_tweet_results?: {
    result?: {
      id?: string; // base64-like
      text?: string;
      entity_set?: {
        hashtags?: HashtagEntity[];
        symbols?: unknown[];
        urls?: UrlEntity[];
        user_mentions?: UserMentionEntity[];
      };
      richtext?: { richtext_tags?: unknown[] };
      media?: { inline_media?: unknown[] };
    };
  };
}

/* ---------------------------- Legacy Tweet ------------------------ */

export interface LegacyTweet {
  bookmark_count?: number;
  bookmarked?: boolean;
  created_at?: string; // e.g. "Sun Sep 28 02:45:00 +0000 2025"
  conversation_id_str?: string;
  in_reply_to_status_id_str?: string;
  in_reply_to_tweet_id_str?: string;
  in_reply_to_user_id_str?: string;
  in_reply_to_screen_name?: string;
  display_text_range?: [number, number];
  entities?: LegacyEntities;
  extended_entities?: LegacyExtendedEntities;
  favorite_count?: number;
  favorited?: boolean;
  full_text?: string;
  is_quote_status?: boolean;
  lang?: string;
  possibly_sensitive?: boolean;
  possibly_sensitive_editable?: boolean;
  quote_count?: number;
  reply_count?: number;
  retweet_count?: number;
  retweeted?: boolean;
  user_id_str?: string;
  id_str?: string;

  // 引用关系
  quoted_status_id_str?: string;
  quoted_status_permalink?: {
    url?: string;
    expanded?: string;
    display?: string;
  };

  // 转推关系
  retweeted_status_id_str?: string;
  retweeted_status_result?: { result?: TweetResult };

  // 其他字段
  source?: string;
  [k: string]: unknown;
}

export interface LegacyEntities {
  hashtags?: HashtagEntity[];
  symbols?: unknown[];
  timestamps?: unknown[]; // 见样本存在空数组
  urls?: UrlEntity[];
  user_mentions?: UserMentionEntity[];
  media?: MediaEntity[]; // 若有媒体
}

export interface LegacyExtendedEntities {
  media?: MediaEntity[];
}

/* ----------------------------- Entities --------------------------- */

export interface HashtagEntity {
  indices: [number, number];
  text: string;
}

export interface UrlEntity {
  display_url: string;
  expanded_url: string;
  url: string;
  indices: [number, number];
  unwound_url?: string;
  title?: string;
  description?: string;
  status?: number;
  images?: Array<{ url?: string; width?: number; height?: number }>;
}

export interface UserMentionEntity {
  id_str: string;
  name: string;
  screen_name: string;
  indices: [number, number];
}

/* ------------------------------- Media ---------------------------- */

export type MediaType = "photo" | "video" | "animated_gif" | string;

export interface MediaEntity {
  display_url: string;
  expanded_url: string;
  id_str: string;
  indices: [number, number];
  media_key: string;
  media_url_https: string;
  type: MediaType;
  url: string;

  ext_media_availability?: { status?: string };
  features?: {
    large?: { faces?: FaceBox[] };
    medium?: { faces?: FaceBox[] };
    small?: { faces?: FaceBox[] };
    orig?: { faces?: FaceBox[] };
  };
  sizes?: {
    large?: MediaSize;
    medium?: MediaSize;
    small?: MediaSize;
    thumb?: MediaSize;
  };
  original_info?: {
    height?: number;
    width?: number;
    focus_rects?: Array<{ x: number; y: number; w: number; h: number }>;
  };
  allow_download_status?: { allow_download?: boolean };

  // 视频附加信息
  additional_media_info?: { monetizable?: boolean };
  video_info?: {
    aspect_ratio?: [number, number];
    duration_millis?: number;
    variants?: Array<{
      bitrate?: number;
      content_type: string; // e.g. "video/mp4" | "application/x-mpegURL"
      url: string;
    }>;
  };

  media_results?: { result?: { media_key?: string } };
}

export interface FaceBox {
  x: number;
  y: number;
  h: number;
  w: number;
}

export interface MediaSize {
  h: number;
  w: number;
  resize: "fit" | "crop" | string;
}

export interface TweetResultByRestIdResponse {
  data?: {
    tweetResult?: { result?: TweetResult | null } | null;
    tweet?: { result?: TweetResult | null } | null;
    tweetResultByRestId?: { result?: TweetResult | null } | null;
  } | null;
}

export type ConversationSection =
  | "HighQuality"
  | "LowQuality"
  | "Unsorted"
  | "Following"
  | "Default"
  | string;

export interface ConversationThread {
  id: string;
  section: ConversationSection;
  tweets: TweetResult[];
  controllerData?: string | null;
}

/* ------------------------------ Utilities ------------------------- */

// 一个助手类型：用来在代码里安全访问“可能为空对象”的结果
export type WithMaybe<T> = T | undefined | null;
