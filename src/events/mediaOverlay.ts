import { MediaOverlayItem, MediaOverlayOpenDetail } from "@/types/mediaOverlay";

export const MEDIA_OVERLAY_OPEN_EVENT = "tsb:media-overlay-open";
export const MEDIA_OVERLAY_CLOSE_EVENT = "tsb:media-overlay-close";

/**
 * 派发打开媒体浮层的事件，供非 React 区域调用。
 */
export const dispatchOpenMediaOverlay = (
  items: MediaOverlayItem[],
  activeKey: string
) => {
  if (!items.length) return;
  const detail: MediaOverlayOpenDetail = { items, activeKey };
  window.dispatchEvent(
    new CustomEvent<MediaOverlayOpenDetail>(MEDIA_OVERLAY_OPEN_EVENT, {
      detail,
    })
  );
};

/**
 * 派发关闭媒体浮层的事件。
 */
export const dispatchCloseMediaOverlay = () => {
  window.dispatchEvent(new CustomEvent(MEDIA_OVERLAY_CLOSE_EVENT));
};
