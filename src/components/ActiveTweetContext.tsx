import { createContext } from "react";
import type { ReactNode } from "react";

interface ActiveTweetContextValue {
  activeTweetId: string | null;
  setActiveTweetId: (tweetId: string | null) => void;
}

const ActiveTweetContext = createContext<ActiveTweetContextValue | null>(null);

export const ActiveTweetProvider = ({
  value,
  children,
}: {
  value: ActiveTweetContextValue;
  children: ReactNode;
}) => (
  <ActiveTweetContext.Provider value={value}>
    {children}
  </ActiveTweetContext.Provider>
);
