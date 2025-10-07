export type MediaOverlayItem =
  | {
      kind: "photo";
      key: string;
      previewSrc: string;
      fullSrc?: string;
      alt: string;
    }
  | {
      kind: "video";
      key: string;
      alt: string;
      poster?: string;
      source?: { url: string; content_type: string } | null;
      isGif: boolean;
    };

export interface MediaOverlayOpenDetail {
  items: MediaOverlayItem[];
  activeKey: string;
}
