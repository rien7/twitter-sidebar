import { createContext, RefObject, useContext } from "react";

export const SidebarRootContext =
  createContext<RefObject<HTMLDivElement | null> | null>(null);
export const useSidebarRoot = () => useContext(SidebarRootContext);
