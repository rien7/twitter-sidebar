import { MediaOverlayItem } from "@/types/mediaOverlay";
import { createContext, useContext } from "react";

export interface MediaOverlayContextValue {
  activeMedia: MediaOverlayItem | null;
  isSidebarCollapsed: boolean;
  zoomLevel: number;
  openMedia: (payload: MediaOverlayItem, group?: MediaOverlayItem[]) => void;
  closeMedia: () => void;
  cycleZoom: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  showPrevious: () => void;
  showNext: () => void;
}

export const MediaOverlayContext =
  createContext<MediaOverlayContextValue | null>(null);
export const COLLAPSED_WIDTH_CSS = "min(100vw, 420px)";
export const DEFAULT_ZOOM_STEPS = 5; // includes the base 1x and the max step
export const MIN_ZOOM_STEP_FACTOR = 1.4; // shrink steps until each adjacent factor >= 1.15; collapse to single level if below

export const useMediaOverlay = () => useContext(MediaOverlayContext);
