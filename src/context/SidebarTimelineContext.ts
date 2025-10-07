import { createContext } from "react";
import type { RefObject } from "react";

interface SidebarContentRefContextValue {
  headerRef: RefObject<HTMLElement | null>;
  scrollAreaRef: RefObject<HTMLElement | null>;
  emptyAreaRef: RefObject<HTMLElement | null>;
}

export const SidebarContentRefContext =
  createContext<SidebarContentRefContextValue | null>(null);

interface SidebarContentContextValue {
  mainTweetId: string | null;
  conversationId: string | null;
  timelineVersion: number;
  firstOpenMainTweetId: string | null;
}

export const SidebarContentContext =
  createContext<SidebarContentContextValue | null>(null);
