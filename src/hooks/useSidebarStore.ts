import { useSyncExternalStore } from "react";
import { sidebarStore } from "@/store/sidebarStore";

export const useSidebarStore = () =>
  useSyncExternalStore(sidebarStore.subscribe, sidebarStore.getState);
