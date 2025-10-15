import type { RefObject } from 'react'
import React, { createContext, use, useRef } from 'react'

export const SidebarRootContext = createContext<RefObject<HTMLDivElement | null>>(null!)
export const useSidebarRoot = () => use(SidebarRootContext)

interface SidebarElementRefContextValue {
  headerRef: RefObject<HTMLElement | null>
  scrollAreaRef: RefObject<HTMLElement | null>
  emptyAreaRef: RefObject<HTMLElement | null>
}

export const SidebarElementRefContext = createContext<SidebarElementRefContextValue>(null!)
export const useSidebarElementRef = () => use(SidebarElementRefContext)

interface SidebarTweetContextValue {
  mainTweetId: string | undefined
  conversationId: string | undefined
  timelineVersion: string
}

export const SidebarTweetContext = createContext<SidebarTweetContextValue>(null!)
export const useSidebarTweet = () => use(SidebarTweetContext)

interface SidebarFlipContextValue {
  registerRefreshBaseline: (fn: () => void) => () => void
  refreshAllTweetsBaseline: () => void
  registerMainArticleRef: (ref: RefObject<HTMLElement | null>) => void
  mainArticleTopRef: RefObject<number | null>
}

export const SidebarFlipContext = createContext<SidebarFlipContextValue>(null!)
export const useSidebarFlip = () => use(SidebarFlipContext)
export function SidebarFlipProvider({ mainArticleTopRef, children }: {
  mainArticleTopRef: RefObject<number | null>
  children: React.ReactNode | React.ReactNode[]
}) {
  const mainArticleRef = useRef<HTMLElement | null>(null)
  const registerMainArticleRef = (ref: RefObject<HTMLElement | null>) => {
    mainArticleRef.current = ref.current
  }
  const allTweetRefreshBaselineSet = useRef<Set<() => void>>(new Set())
  const registerRefreshBaseline = (fn: () => void) => {
    allTweetRefreshBaselineSet.current.add(fn)
    return () => allTweetRefreshBaselineSet.current.delete(fn)
  }
  const refreshAllTweetsBaseline = () => {
    allTweetRefreshBaselineSet.current.forEach(fn => fn())
  }

  return (
    <SidebarFlipContext value={{
      registerRefreshBaseline,
      refreshAllTweetsBaseline,
      registerMainArticleRef,
      mainArticleTopRef,
    }}
    >
      {children}
    </SidebarFlipContext>
  )
}
