import { TweetResult } from '@/types/response'
import { getAvatarFromUser, getUserFromTweet, getUserIdFromTweet } from '@/utils/responseData'

const avatarStore = new Map<string, string>()

const AVATAR_SIZE_QUERY = [
  'normal', // 48x48
  'bigger', // 73x73
  'x96', // 96x96
] as const
export type AvatarSize = (typeof AVATAR_SIZE_QUERY)[number]
const AVATAR_SIZE = new Set(AVATAR_SIZE_QUERY)

export function rememberAvatarById(
  userId: string | null,
  avatarUrl: string | null | undefined,
) {
  if (!userId) return
  if (!avatarUrl) return
  avatarStore.set(userId, normalizeAvatarUrl(avatarUrl))
}

export function rememberUserAvatarFromTweet(tweet: TweetResult) {
  const user = getUserFromTweet(tweet)
  const userId = getUserIdFromTweet(tweet, user)
  const avatar = getAvatarFromUser(user)
  if (avatar) {
    rememberAvatarById(userId, avatar)
  }
}

export function getCachedAvatarForTweet(tweet: TweetResult, size: AvatarSize) {
  const user = getUserFromTweet(tweet)
  const userId = getUserIdFromTweet(tweet, user)
  if (userId) {
    return avatarStore.get(userId)?.replace('_size', `_${size}`)
  }
}

function normalizeAvatarUrl(url: string) {
  if (!url) return url
  for (const size of AVATAR_SIZE) {
    if (url.includes(`_${size}`)) {
      return url.replace(`_${size}`, '_size')
    }
  }
  return url
}
