import { MediaEntity } from "@/types/response";

/**
 * 选取视频实体里最清晰的 MP4 流。原始响应可能包含多种格式，这里优先最高码率的 MP4。
 */
export const selectVideoVariant = (media: MediaEntity) => {
  const variants = media.video_info?.variants ?? [];
  const mp4Variants = variants.filter(
    (variant) => variant.content_type === "video/mp4"
  );
  if (mp4Variants.length === 0) return variants[0];
  return mp4Variants.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
};

/**
 * 将媒体地址升级到原图（orig）清晰度，尽可能避免 Twitter 默认的缩略图限制。
 */
export const getHighResolutionUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (!/twimg\.com$/i.test(parsed.hostname)) return url;
    parsed.searchParams.set("name", "orig");
    if (!parsed.searchParams.has("format")) {
      const extensionMatch = parsed.pathname.match(/\.([a-zA-Z0-9]+)$/);
      if (extensionMatch) {
        parsed.searchParams.set("format", extensionMatch[1]);
      }
    }
    return parsed.toString();
  } catch {
    if (/:(?:small|medium|large|orig)$/.test(url)) {
      return url.replace(/:(?:small|medium|large|orig)$/, ":orig");
    }
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}name=orig`;
  }
};
