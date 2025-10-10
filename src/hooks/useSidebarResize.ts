import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { SIDEBAR_WIDTH_MAX, SIDEBAR_WIDTH_MIN } from "@/constants/layout";
import { sidebarStore } from "@/store/sidebarStore";

export const useSidebarResize = (currentWidth: number, enabled: boolean) => {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const root = document.body;

  const stopDragging = useCallback(() => {
    dragRef.current = null;
    setIsResizing(false);
    root.style.cursor = "";
    root.style.userSelect = "";
  }, [root]);

  useEffect(() => () => stopDragging(), [stopDragging]);

  type ResizeStartEvent =
    | ReactPointerEvent<HTMLDivElement>
    | ReactMouseEvent<HTMLDivElement>;

  const setCursor = useCallback(
    (width: number) => {
      if (width === SIDEBAR_WIDTH_MIN) {
        root.style.cursor = "w-resize";
      } else if (width === SIDEBAR_WIDTH_MAX) {
        root.style.cursor = "e-resize";
      } else {
        root.style.cursor = "ew-resize";
      }
      root.style.userSelect = "none";
    },
    [root]
  );
  const handlePointerOver = useCallback(
    (width: number) => {
      setCursor(width);
    },
    [setCursor]
  );
  const handlePointerOut = useCallback(() => {
    root.style.cursor = "";
    root.style.userSelect = "";
  }, [root]);
  const handlePointerDown = useCallback(
    (event: ResizeStartEvent) => {
      if (!enabled || ("button" in event && event.button !== 0)) {
        return;
      }

      dragRef.current = { startX: event.clientX, startWidth: currentWidth };
      setIsResizing(true);
      setCursor(currentWidth);

      const handleMove = (moveEvent: PointerEvent | MouseEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        const clientX = "clientX" in moveEvent ? moveEvent.clientX : 0;
        const delta = drag.startX - clientX;
        const next = Math.max(
          SIDEBAR_WIDTH_MIN,
          Math.min(SIDEBAR_WIDTH_MAX, Math.round(drag.startWidth + delta))
        );
        setCursor(next);
        sidebarStore.setWidth(next);
        moveEvent.preventDefault();
      };

      const handleUp = () => {
        stopDragging();
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("mouseup", handleUp);
      };

      window.addEventListener("pointermove", handleMove, { passive: false });
      window.addEventListener("mousemove", handleMove, { passive: false });
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("mouseup", handleUp);
    },
    [currentWidth, enabled, setCursor, stopDragging]
  );

  return { isResizing, handlePointerDown, handlePointerOver, handlePointerOut };
};
