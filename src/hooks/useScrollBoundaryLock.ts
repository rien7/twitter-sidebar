import { useEffect } from "react";
import type { RefObject } from "react";

export const useScrollBoundaryLock = (
  ref: RefObject<HTMLElement>,
  enabled: boolean
) => {
  useEffect(() => {
    if (!enabled) return;
    const element = ref.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      const canScroll = element.scrollHeight > element.clientHeight;
      if (!canScroll) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const deltaY = event.deltaY;
      const atTop = element.scrollTop <= 0 && deltaY < 0;
      const atBottom =
        Math.ceil(element.scrollTop + element.clientHeight) >=
          element.scrollHeight && deltaY > 0;
      if (atTop || atBottom) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      const canScroll = element.scrollHeight > element.clientHeight;
      if (!canScroll) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("touchmove", onTouchMove);
    };
  }, [ref, enabled]);
};
