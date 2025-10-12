export const MEDIA_NODE_SELECTOR = [
  '[data-testid="tweetPhoto"]',
  '[data-testid="tweetVideo"]',
  '[data-testid="videoPlayer"]',
  '[data-testid="animatedGif"]',
].join(', ')

export const INTERACTIVE_ROOT_SELECTOR = 'a,button,[role="link"],[role="button"],input,textarea,select'

export const TWEET_ROOT_SELECTOR = '[role="link"][data-testid="tweet"]'
export const TWEET_ARTICLE_SELECTOR = 'article[data-testid="tweet"]'
export const TWEET_AVATAR_SELECTOR = '[data-testid="Tweet-User-Avatar"], [data-testid="UserAvatar"]'
export const TWEET_USER_NAME_SELECTOR = '[data-testid="User-Name"]'
export const TWEET_STATUS_A_SELECTOR = 'a[href*="/status/"]'
