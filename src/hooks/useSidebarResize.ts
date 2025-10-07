import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
} from "@/constants/layout";
import { sidebarStore } from "@/store/sidebarStore";

export const useSidebarResize = (currentWidth: number, enabled: boolean) => {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const stopDragging = useCallback(() => {
    dragRef.current = null;
    setIsResizing(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => () => stopDragging(), [stopDragging]);

  type ResizeStartEvent =
    | ReactPointerEvent<HTMLDivElement>
    | ReactMouseEvent<HTMLDivElement>;

  const handlePointerDown = useCallback(
    (event: ResizeStartEvent) => {
      if (!enabled || ("button" in event && event.button !== 0)) {
        return;
      }

      dragRef.current = { startX: event.clientX, startWidth: currentWidth };
      setIsResizing(true);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";

      const handleMove = (moveEvent: PointerEvent | MouseEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        const clientX = "clientX" in moveEvent ? moveEvent.clientX : 0;
        const delta = drag.startX - clientX;
        const next = Math.max(
          SIDEBAR_WIDTH_MIN,
          Math.min(
            SIDEBAR_WIDTH_MAX,
            Math.round(drag.startWidth + delta)
          )
        );
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
    [currentWidth, enabled, stopDragging]
  );

  return { isResizing, handlePointerDown };
};
