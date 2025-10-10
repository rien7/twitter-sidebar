import type {
  HashtagEntity,
  LegacyTweet,
  MediaEntity,
  TweetResult,
  UrlEntity,
  UserMentionEntity,
} from "@/types/response";
import type { JSX } from "react";
import { getAvatarFromUser, getUserFromTweet } from "@/utils/responseData";
import { getCachedAvatarForTweet } from "@/store/avatarStore";
import { renderWithTwemoji } from "@/utils/twemoji";

const countFormatter = new Intl.NumberFormat("zh-CN");

export const formatCount = (value?: number | null): string | null => {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return countFormatter.format(value);
};

export const getFullTextAndEntities = (
  tweet: TweetResult
): {
  text: string;
  entities?: LegacyTweet["entities"];
  displayRange: [number, number];
  quoteUrl?: string;
  media?: MediaEntity[];
} => {
  const legacy = tweet.legacy;
  const noteTweetResult = tweet.note_tweet?.note_tweet_results?.result as
    | { text?: string; entity_set?: LegacyTweet["entities"] }
    | undefined;

  if (noteTweetResult?.text) {
    const characters = Array.from(noteTweetResult.text);
    return {
      text: noteTweetResult.text,
      entities: noteTweetResult.entity_set ?? legacy?.entities,
      displayRange: [0, characters.length],
      quoteUrl: legacy?.quoted_status_permalink?.url,
      media:
        legacy?.extended_entities?.media ??
        legacy?.entities?.media ??
        undefined,
    };
  }

  const text = legacy?.full_text ?? "";
  const displayRange = legacy?.display_text_range ?? [
    0,
    Array.from(text).length,
  ];
  return {
    text,
    entities: legacy?.entities,
    displayRange,
    quoteUrl: legacy?.quoted_status_permalink?.url,
    media:
      legacy?.extended_entities?.media ?? legacy?.entities?.media ?? undefined,
  };
};

type RichTextNode = { key: string; node: JSX.Element };

interface TweetCardImageInfo {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface TweetCardInfo {
  url: string;
  displayUrl?: string;
  title?: string;
  description?: string;
  image?: TweetCardImageInfo | null;
  type?: string;
  rawUrl?: string;
}

type NormalizedEntity = {
  kind: "url" | "mention" | "hashtag" | "cashtag" | "skip";
  start: number;
  end: number;
  href?: string;
  display?: string;
};

export const extractCardInfo = (tweet: TweetResult): TweetCardInfo | null => {
  const legacyCard = tweet.card?.legacy;
  const bindings = legacyCard?.binding_values ?? [];
  if (!legacyCard || bindings.length === 0) return null;

  const valueMap = new Map<
    string,
    NonNullable<(typeof bindings)[number]["value"]>
  >();
  bindings.forEach((binding) => {
    if (!binding?.key || !binding.value) return;
    valueMap.set(binding.key, binding.value);
  });
  if (valueMap.size === 0) return null;

  const getString = (key: string): string | undefined => {
    const value = valueMap.get(key);
    if (!value) return undefined;
    if (
      typeof value.string_value === "string" &&
      value.string_value.length > 0
    ) {
      return value.string_value;
    }
    if (typeof value.scribe_key === "string" && value.scribe_key.length > 0) {
      return value.scribe_key;
    }
    return undefined;
  };

  const getImage = (key: string) => valueMap.get(key)?.image_value;

  const rawUrl = getString("card_url") ?? legacyCard.url ?? undefined;
  const vanityUrl = getString("vanity_url");
  const domain = getString("domain");
  const title = getString("title");
  const description = getString("description");
  const type = legacyCard.name;

  const altText =
    getString("summary_photo_image_alt_text") ??
    getString("photo_image_full_size_alt_text") ??
    getString("thumbnail_image_alt_text") ??
    undefined;

  const imageCandidateKeys = [
    "summary_photo_image_large",
    "summary_photo_image",
    "summary_photo_image_small",
    "photo_image_full_size_large",
    "photo_image_full_size",
    "photo_image_full_size_small",
    "thumbnail_image_large",
    "thumbnail_image",
    "photo_image_full_size_original",
    "summary_photo_image_original",
  ];

  let image: TweetCardImageInfo | null = null;
  for (const key of imageCandidateKeys) {
    const candidate = getImage(key);
    if (candidate?.url) {
      image = {
        url: candidate.url,
        width: candidate.width,
        height: candidate.height,
        alt: altText ?? description ?? title,
      };
      break;
    }
  }

  const urls = tweet.legacy?.entities?.urls ?? [];
  const matchedEntity = (() => {
    if (rawUrl) {
      return urls.find(
        (url) =>
          url.url === rawUrl ||
          url.expanded_url === rawUrl ||
          url.unwound_url === rawUrl ||
          (vanityUrl ? url.display_url === vanityUrl : false)
      );
    }
    if (vanityUrl) {
      return urls.find((url) => url.display_url === vanityUrl);
    }
    return undefined;
  })();

  let resolvedHref: string | undefined =
    matchedEntity?.expanded_url ?? matchedEntity?.unwound_url;
  if (!resolvedHref && rawUrl) {
    resolvedHref = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  }
  if (!resolvedHref && vanityUrl) {
    resolvedHref = vanityUrl.startsWith("http")
      ? vanityUrl
      : `https://${vanityUrl}`;
  }
  if (!resolvedHref && domain) {
    resolvedHref = `https://${domain}`;
  }

  if (!resolvedHref) return null;

  const displayUrl =
    vanityUrl ?? matchedEntity?.display_url ?? domain ?? undefined;

  return {
    url: resolvedHref,
    displayUrl,
    title: title ?? undefined,
    description: description ?? undefined,
    image,
    type,
    rawUrl: matchedEntity?.url ?? rawUrl,
  };
};

export const buildRichTextNodes = (tweet: TweetResult): RichTextNode[] => {
  const { text, entities, displayRange, quoteUrl, media } =
    getFullTextAndEntities(tweet);
  if (!text) return [];

  const characters = Array.from(text);
  const [rawStart, rawEnd] = displayRange;
  const start = Math.max(0, rawStart);
  const end = Math.min(characters.length, rawEnd);
  const normalized: NormalizedEntity[] = [];
  const skipUrls = new Set<string>();
  if (quoteUrl) skipUrls.add(quoteUrl);
  media?.forEach((item) => {
    if (item.url) skipUrls.add(item.url);
  });

  const card = extractCardInfo(tweet);
  if (card?.rawUrl) {
    skipUrls.add(card.rawUrl);
  }
  if (card?.url) {
    skipUrls.add(card.url);
  }
  if (card?.displayUrl) {
    skipUrls.add(card.displayUrl);
  }

  const pushEntity = (
    kind: NormalizedEntity["kind"],
    entity: { indices?: [number, number]; href?: string; display?: string }
  ) => {
    const [entityStart, entityEnd] = entity.indices ?? [0, 0];
    if (entityEnd <= entityStart) return;
    normalized.push({
      kind,
      start: entityStart,
      end: entityEnd,
      href: entity.href,
      display: entity.display,
    });
  };

  (entities?.urls ?? []).forEach((url: UrlEntity) => {
    const candidates = [
      url.url,
      url.expanded_url,
      url.unwound_url,
      url.display_url,
    ];
    const shouldSkip = candidates.some(
      (candidate) => candidate && skipUrls.has(candidate)
    );
    if (shouldSkip) {
      pushEntity("skip", { indices: url.indices });
      return;
    }
    const href = url.expanded_url ?? url.display_url ?? url.url;
    const display = url.display_url ?? url.expanded_url ?? url.url;
    pushEntity("url", { indices: url.indices, href, display });
  });

  (entities?.user_mentions ?? []).forEach((mention: UserMentionEntity) => {
    const screenName = mention.screen_name ?? "";
    const href = `https://twitter.com/${screenName}`;
    pushEntity("mention", { indices: mention.indices, href });
  });

  (entities?.hashtags ?? []).forEach((hashtag: HashtagEntity) => {
    const href = `https://twitter.com/hashtag/${encodeURIComponent(
      hashtag.text
    )}?src=hashtag_click`;
    pushEntity("hashtag", { indices: hashtag.indices, href });
  });

  const symbols =
    (
      entities as {
        symbols?: Array<{ text?: string; indices?: [number, number] }>;
      }
    )?.symbols ?? [];
  symbols.forEach((symbol) => {
    if (!symbol.indices) return;
    const textValue = symbol.text ?? "";
    const href = `https://twitter.com/search?q=%24${encodeURIComponent(
      textValue
    )}&src=cashtag_click`;
    pushEntity("cashtag", { indices: symbol.indices, href });
  });

  normalized.sort((a, b) => a.start - b.start);

  const nodes: RichTextNode[] = [];
  let cursor = start;
  let keyIndex = 0;

  const pushPlain = (from: number, to: number) => {
    if (to <= from) return;
    const value = characters.slice(from, to).join("");
    if (!value) return;
    nodes.push({
      key: `text-${keyIndex}`,
      node: <>{renderWithTwemoji(value)}</>,
    });
    keyIndex += 1;
  };

  normalized.forEach((entity, index) => {
    if (entity.end <= start || entity.start >= end) return;
    const entityStart = Math.max(entity.start, start);
    const entityEnd = Math.min(entity.end, end);
    pushPlain(cursor, entityStart);
    if (entity.kind !== "skip") {
      const label = characters.slice(entityStart, entityEnd).join("");
      const content = entity.display ?? label;
      nodes.push({
        key: `entity-${index}`,
        node: (
          <a
            href={entity.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-twitter-accent hover:underline"
          >
            {renderWithTwemoji(content)}
          </a>
        ),
      });
    }
    cursor = entityEnd;
  });

  pushPlain(cursor, end);

  return nodes;
};

export const extractAvatar = (tweet: TweetResult): string | undefined => {
  const user = getUserFromTweet(tweet);
  const direct = getAvatarFromUser(user);
  if (direct) return direct;
  return (
    getCachedAvatarForTweet(tweet, "x96") ??
    getCachedAvatarForTweet(tweet, "bigger") ??
    getCachedAvatarForTweet(tweet, "normal")
  );
};

export const extractAvatarCache = (
  tweet: TweetResult
): string | undefined => getCachedAvatarForTweet(tweet, "x96");

export const extractName = (
  tweet: TweetResult
): {
  name: string;
  screenName: string;
} => {
  const user = tweet.core?.user_results?.result as
    | {
        legacy?: { name?: string; screen_name?: string };
        core?: { name?: string; screen_name?: string };
      }
    | undefined;
  return {
    name: user?.legacy?.name ?? user?.core?.name ?? "未知用户",
    screenName: user?.legacy?.screen_name ?? user?.core?.screen_name ?? "unknown",
  };
};

const dateDiff = (
  dateA: Date,
  dateB: Date
): { unit: "s" | "m" | "h" | "d"; value: number } => {
  const timeA = Math.floor(dateA.getTime() / 1000);
  const timeB = Math.floor(dateB.getTime() / 1000);
  const diff = Math.abs(timeA - timeB);
  if (diff < 60) return { unit: "s", value: diff };
  if (diff < 60 * 60) return { unit: "m", value: Math.round(diff / 60) };
  if (diff < 60 * 60 * 24) {
    return { unit: "h", value: Math.round(diff / 60 / 60) };
  }
  return { unit: "d", value: Math.round(diff / 60 / 60 / 24) };
};

export const formatDateTime = (
  createdAt?: string,
  type: "long" | "relative" = "relative"
): string | null => {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  if (type === "long") {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  }
  const now = new Date();
  const diff = dateDiff(now, date);
  switch (diff.unit) {
    case "s":
      return "now";
    case "m":
    case "h":
      return `${diff.value}${diff.unit}`;
    case "d":
      if (diff.value <= 3) return `${diff.value}${diff.unit}`;
      return new Intl.DateTimeFormat(undefined, {
        year: now.getFullYear() === date.getFullYear() ? undefined : "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
  }
};

export const extractViews = (tweet: TweetResult): string | null => {
  const count = Number(tweet.views?.count ?? "");
  if (!Number.isFinite(count) || count <= 0) return null;
  return `${countFormatter.format(count)} 次浏览`;
};

export const parseSource = (
  sourceHtml?: string
): { href: string; text: string } | null => {
  if (!sourceHtml) return null;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sourceHtml, "text/html");
    const link = doc.querySelector("a");
    if (!link) return null;
    const href = link.getAttribute("href") ?? "#";
    const text = link.textContent?.trim() ?? "";
    if (!text) return null;
    return { href, text };
  } catch {
    return null;
  }
};

export type { RichTextNode };
