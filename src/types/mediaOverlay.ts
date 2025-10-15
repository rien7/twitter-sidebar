export type MediaOverlayItem = {
  kind: 'photo'
  key: string
  previewSrc: string
  fullSrc?: string
  altText?: string
} | {
  kind: 'video'
  key: string
  altText?: string
  poster?: string
  source?: { url: string, content_type: string } | null
  isGif: boolean
}

export interface MediaOverlayOpenDetail {
  items: MediaOverlayItem[]
  activeKey: string
  tweetId: string
}
