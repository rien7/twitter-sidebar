import type { ReactNode } from 'react'
import { createContext } from 'react'

interface ActiveTweetContextValue {
  activeTweetId: string | null
  setActiveTweetId: (tweetId: string | null) => void
}

const ActiveTweetContext = createContext<ActiveTweetContextValue | null>(null)

export function ActiveTweetProvider({
  value,
  children,
}: {
  value: ActiveTweetContextValue
  children: ReactNode
}) {
  return (
    <ActiveTweetContext.Provider value={value}>
      {children}
    </ActiveTweetContext.Provider>
  )
}
