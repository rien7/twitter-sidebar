import { RefObject, useCallback, useLayoutEffect, useRef } from "react";

/**
 * FLIP hook with 3 modes:
 * - "scale": classic FLIP (translate + scale)
 * - "text": move + interpolate fontSize / fontWeight / color
 * - "reflow": destination-sized FLIP (wrapper at LAST box + counter-scale on content)
 *
 * Notes:
 * - Reflow keeps layout at TARGET width/height the whole time to avoid any post-move reflow.
 * - Only transform/opacity are animated. No layout thrash.
 * - Honors reduced motion.
 */

export type Target = string | HTMLElement | RefObject<HTMLElement | null>;
export type FlipType = "scale" | "text" | "reflow";

export type TargetOption = {
  target: Target;
  type?: FlipType; // default to "scale"
};

export type Options = {
  duration?: number; // ms
  easing?: string;
  reduceMotion?: boolean;
  root?: RefObject<HTMLElement | null>; // where to append ghosts/wrappers
};

const DEFAULT_DURATION = 240; // ms
const DEFAULT_EASING = "ease";

type Snapshot = {
  top: number; // viewport top
  left: number; // viewport left
  width: number;
  height: number;
  globalTop: number; // viewport + scroll
  globalLeft: number;
};

type EntryRecord = {
  key: number;
  el: HTMLElement;
  type: FlipType;
  first: Snapshot | null;
  last: Snapshot;
  firstStyle: Partial<CSSStyleDeclaration> | null;
  lastStyle: Partial<CSSStyleDeclaration> | null;
  computedZ: string | null;
  scrollParent: HTMLElement | null;
  scrollLeft: number;
  scrollTop: number;
};

type SnapshotRecord = {
  el: HTMLElement;
  snapshot: Snapshot;
  scrollParent: HTMLElement | null;
  scrollLeft: number;
  scrollTop: number;
};

type StyleRecord = {
  el: HTMLElement;
  style: Partial<CSSStyleDeclaration> | null;
};

function resolveEl(t: Target): HTMLElement | null {
  if (typeof t === "string")
    return document.querySelector(t) as HTMLElement | null;
  if (t && typeof t === "object" && "current" in t)
    return (t.current as HTMLElement | null) ?? null;
  return (t as HTMLElement) ?? null;
}

// We include more text-related props to better match final wrapping
function pickTextStyles(
  el: HTMLElement | null
): Partial<CSSStyleDeclaration> | null {
  if (!el) return null;
  const c = getComputedStyle(el);
  return {
    fontSize: c.fontSize,
    fontWeight: c.fontWeight,
    lineHeight: c.lineHeight,
    letterSpacing: c.letterSpacing,
    whiteSpace: c.whiteSpace,
    wordBreak: c.wordBreak,
    color: c.color,
  } as Partial<CSSStyleDeclaration>;
}

function getScrollOffsets() {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  const x =
    window.scrollX ??
    window.pageXOffset ??
    document.documentElement?.scrollLeft ??
    0;
  const y =
    window.scrollY ??
    window.pageYOffset ??
    document.documentElement?.scrollTop ??
    0;
  return { x, y };
}

function measure(el: HTMLElement, rootEl: HTMLElement | null): Snapshot {
  const rect = el.getBoundingClientRect();
  const baseEl = rootEl?.querySelector("[data-flip-base-layer]");
  let top = rect.top;
  let left = rect.left;
  if (baseEl && el !== rootEl) {
    const baseRect = baseEl.getBoundingClientRect();
    top = top - baseRect.top;
    left = left - baseRect.left;
  }
  const { x, y } = getScrollOffsets();
  return {
    top: top,
    left: left,
    width: rect.width,
    height: rect.height,
    globalTop: top + y,
    globalLeft: left + x,
  };
}

function resolveOverlay(rootEl: HTMLElement | null) {
  if (!rootEl) return document.body;
  const layer = rootEl.querySelector<HTMLElement>("[data-flip-layer]");
  return layer ?? rootEl;
}

function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let current: HTMLElement | null = el?.parentElement ?? null;
  while (current) {
    if (current === document.body || current === document.documentElement) {
      current = current.parentElement;
      continue;
    }
    const style = getComputedStyle(current);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const isScrollableY =
      overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
    const isScrollableX =
      overflowX === "auto" || overflowX === "scroll" || overflowX === "overlay";
    if (isScrollableX || isScrollableY) return current;
    current = current.parentElement;
  }
  return null;
}

function updateBaseline(
  record: EntryRecord,
  rectMap: Map<number, SnapshotRecord>,
  styleMap: Map<number, StyleRecord>
) {
  rectMap.set(record.key, {
    el: record.el,
    snapshot: record.last,
    scrollParent: record.scrollParent,
    scrollLeft: record.scrollLeft,
    scrollTop: record.scrollTop,
  });
  if (record.type === "text" || record.type === "reflow") {
    styleMap.set(record.key, {
      el: record.el,
      style: record.lastStyle,
    });
  } else {
    styleMap.delete(record.key);
  }
}

export function useFlip(
  targets: (Target | TargetOption)[],
  deps?: ReadonlyArray<unknown>,
  opts: Options = {}
) {
  const {
    duration = DEFAULT_DURATION,
    easing = DEFAULT_EASING,
    reduceMotion,
    root,
  } = opts;

  const firstRectsRef = useRef<Map<number, SnapshotRecord>>(new Map());
  const firstStylesRef = useRef<Map<number, StyleRecord>>(new Map());
  const readyOnceRef = useRef(false);
  const prevRootSnapshotRef = useRef<Snapshot | null>(null);

  useLayoutEffect(() => {
    const firstRectsMap = firstRectsRef.current;
    const firstStylesMap = firstStylesRef.current;
    const rootEl = root?.current ?? null;
    const entries = targets
      .map(
        (
          t,
          idx
        ): {
          key: number;
          el: HTMLElement | null;
          type: FlipType;
        } => {
          const opt: TargetOption =
            typeof t === "string" ||
            (typeof t === "object" && t && !("target" in t))
              ? { target: t as Target, type: "scale" }
              : (t as TargetOption);
          return {
            key: idx,
            el: resolveEl(opt.target),
            type: opt.type ?? "scale",
          };
        }
      )
      .filter(
        (entry): entry is { key: number; el: HTMLElement; type: FlipType } =>
          Boolean(entry.el)
      );

    const rootSnapshot = rootEl ? measure(rootEl, rootEl) : null;
    const prevRootSnapshot = prevRootSnapshotRef.current;

    if (!entries.length) {
      prevRootSnapshotRef.current = rootSnapshot;
      return;
    }

    if (!readyOnceRef.current) {
      entries.forEach((entry) => {
        const snapshot = measure(entry.el, rootEl);
        const scrollParent = getScrollParent(entry.el);
        firstRectsMap.set(entry.key, {
          el: entry.el,
          snapshot,
          scrollParent,
          scrollLeft: scrollParent?.scrollLeft ?? 0,
          scrollTop: scrollParent?.scrollTop ?? 0,
        });
        if (entry.type === "text" || entry.type === "reflow") {
          firstStylesMap.set(entry.key, {
            el: entry.el,
            style: pickTextStyles(entry.el),
          });
        } else {
          firstStylesMap.delete(entry.key);
        }
      });
      prevRootSnapshotRef.current = rootSnapshot;
      readyOnceRef.current = true;
      return;
    }

    const isClient = typeof window !== "undefined";
    if (!isClient) return;

    const records: EntryRecord[] = entries.map((entry) => {
      const last = measure(entry.el, rootEl);
      const lastStyle =
        entry.type === "text" || entry.type === "reflow"
          ? pickTextStyles(entry.el)
          : null;
      const scrollParent = getScrollParent(entry.el);
      const scrollLeft = scrollParent?.scrollLeft ?? 0;
      const scrollTop = scrollParent?.scrollTop ?? 0;
      const baseline = firstRectsMap.get(entry.key);
      const styleBaseline = firstStylesMap.get(entry.key);
      const sameElement = baseline?.el === entry.el;
      const sameScrollParent =
        sameElement && baseline?.scrollParent === scrollParent;
      let first: Snapshot | null = null;
      if (sameElement && sameScrollParent && baseline) {
        const deltaX = scrollLeft - baseline.scrollLeft;
        const deltaY = scrollTop - baseline.scrollTop;
        const snap = baseline.snapshot;
        first = {
          ...snap,
          top: snap.top - deltaY,
          left: snap.left - deltaX,
          globalTop: snap.globalTop - deltaY,
          globalLeft: snap.globalLeft - deltaX,
        };
      }
      const firstStyle =
        sameElement && styleBaseline?.el === entry.el
          ? styleBaseline.style ?? null
          : null;
      const computed = getComputedStyle(entry.el);
      return {
        key: entry.key,
        el: entry.el,
        type: entry.type,
        first,
        last,
        firstStyle,
        lastStyle,
        computedZ: computed.zIndex === "auto" ? null : computed.zIndex,
        scrollParent,
        scrollLeft,
        scrollTop,
      };
    });

    const rootHasShifted =
      !!prevRootSnapshot &&
      !!rootSnapshot &&
      (Math.abs(prevRootSnapshot.globalLeft - rootSnapshot.globalLeft) > 4 ||
        Math.abs(prevRootSnapshot.globalTop - rootSnapshot.globalTop) > 4);

    prevRootSnapshotRef.current = rootSnapshot;

    const isReduced =
      reduceMotion ??
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const overlayRoot = resolveOverlay(rootEl);
    const { x: currentScrollX, y: currentScrollY } = getScrollOffsets();

    type NodeRec = {
      type: FlipType;
      ghost: HTMLElement;
      wrapper?: HTMLElement;
      record: EntryRecord;
    };
    const nodes: NodeRec[] = [];
    const prevVis = new Map<number, string>();

    if (rootHasShifted) {
      records.forEach((record) => {
        updateBaseline(record, firstRectsMap, firstStylesMap);
      });
      return;
    }

    let usableCount = 0;

    records.forEach((record) => {
      const { first, last, type } = record;

      if (!first) {
        updateBaseline(record, firstRectsMap, firstStylesMap);
        return;
      }

      const dx = first.globalLeft - last.globalLeft;
      const dy = first.globalTop - last.globalTop;
      const sx = last.width ? first.width / Math.max(1, last.width) : 1;
      const sy = last.height ? first.height / Math.max(1, last.height) : 1;

      const moved = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
      const sizeChanged = Math.abs(sx - 1) > 0.001 || Math.abs(sy - 1) > 0.001;
      const changed = moved || sizeChanged;

      if (!changed || isReduced) {
        updateBaseline(record, firstRectsMap, firstStylesMap);
        return;
      }

      usableCount++;

      const clone = record.el.cloneNode(true) as HTMLElement;
      clone.style.margin = "0";
      clone.style.transformOrigin = "top left";
      clone.style.pointerEvents = "none";
      clone.style.willChange = "transform, opacity";

      if (record.computedZ) clone.style.zIndex = record.computedZ;

      if (type === "reflow") {
        // --- DEST-SIZED WRAPPER + COUNTER-SCALE ---
        const wrapper = document.createElement("div");
        wrapper.style.position = "fixed";
        wrapper.style.left = `${last.globalLeft - currentScrollX}px`;
        wrapper.style.top = `${last.globalTop - currentScrollY}px`;
        wrapper.style.width = `${last.width}px`;
        wrapper.style.height = `${last.height}px`;
        wrapper.style.transformOrigin = "top left";
        wrapper.style.willChange = "transform";
        wrapper.style.pointerEvents = "none";
        // wrapper.style.overflow = "hidden"; // clip to target box
        if (record.computedZ) wrapper.style.zIndex = record.computedZ;

        // Apply LAST text styles to keep wrapping identical throughout
        const s = record.lastStyle;
        if (s?.fontSize) clone.style.fontSize = s.fontSize as string;
        if (s?.fontWeight) clone.style.fontWeight = s.fontWeight as string;
        if (s?.lineHeight) clone.style.lineHeight = s.lineHeight as string;
        if (s?.letterSpacing)
          clone.style.letterSpacing = s.letterSpacing as string;
        if (s?.whiteSpace) clone.style.whiteSpace = s.whiteSpace;
        if (s?.wordBreak) clone.style.wordBreak = s.wordBreak;
        if (s?.color) clone.style.color = s.color as string;

        // Make clone fill the target box; scale it so it *looks* like first box
        clone.style.width = "100%";
        clone.style.height = "100%";
        clone.style.transform = `scale(${sx}, ${sy})`;

        // Initial wrapper transform makes it appear at FIRST position
        wrapper.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;

        wrapper.appendChild(clone);
        overlayRoot.appendChild(wrapper);

        prevVis.set(record.key, record.el.style.visibility);
        record.el.style.visibility = "hidden";
        nodes.push({ type, ghost: clone, wrapper, record });

        // Play
        requestAnimationFrame(() => {
          wrapper.style.transition = `transform ${duration}ms ${easing}`;
          clone.style.transition = `transform ${duration}ms ${easing}`;
          wrapper.style.transform = `translate3d(0px, 0px, 0)`;
          clone.style.transform = `scale(1, 1)`;
        });
      } else {
        // --- ORIGINAL CLONE FLOW ---
        clone.style.position = "fixed";
        const startTop = first.globalTop - currentScrollY;
        const startLeft = first.globalLeft - currentScrollX;
        clone.style.top = `${startTop}px`;
        clone.style.left = `${startLeft}px`;
        if (type !== "text") {
          clone.style.width = `${first.width}px`;
          clone.style.height = `${first.height}px`;
        }
        if (type === "text") {
          const s0 = record.firstStyle;
          if (s0?.fontSize) clone.style.fontSize = s0.fontSize as string;
          if (s0?.fontWeight) clone.style.fontWeight = s0.fontWeight as string;
          if (s0?.color) clone.style.color = s0.color as string;
        }
        overlayRoot.appendChild(clone);
        prevVis.set(record.key, record.el.style.visibility);
        record.el.style.visibility = "hidden";
        nodes.push({ type, ghost: clone, record });

        requestAnimationFrame(() => {
          const parts: string[] = [];
          parts.push(`transform ${duration}ms ${easing}`);
          if (type === "text") {
            parts.push(`font-size ${duration}ms ${easing}`);
            parts.push(`font-weight ${duration}ms ${easing}`);
            parts.push(`color ${duration}ms ${easing}`);
          }
          clone.style.transition = parts.join(",");

          const transform: string[] = [];
          const translateX = record.last.globalLeft - record.first!.globalLeft;
          const translateY = record.last.globalTop - record.first!.globalTop;
          transform.push(`translate3d(${translateX}px, ${translateY}px, 0)`);
          if (type === "scale") {
            const sxx = record.last.width
              ? record.last.width / Math.max(1, record.first!.width)
              : 1;
            const syy = record.last.height
              ? record.last.height / Math.max(1, record.first!.height)
              : 1;
            transform.push(`scale(${sxx}, ${syy})`);
          } else if (type === "text") {
            const s1 = record.lastStyle;
            if (s1?.fontSize) clone.style.fontSize = s1.fontSize as string;
            if (s1?.fontWeight)
              clone.style.fontWeight = s1.fontWeight as string;
            if (s1?.color) clone.style.color = s1.color as string;
          }
          clone.style.transform = transform.join(" ");
        });
      }
    });

    if (!usableCount) return;

    // Finish & cleanup
    let done = 0;
    const allNodes = nodes.map((n) => n.wrapper ?? n.ghost);

    const finish = () => {
      done++;
      if (done < allNodes.length) return;
      // Remove visuals
      nodes.forEach((rec) => {
        if (rec.wrapper) rec.wrapper.remove();
        else rec.ghost.remove();
      });
      // Restore
      nodes.forEach(({ record }) => {
        record.el.style.visibility = prevVis.get(record.key) ?? "";
      });
      // Baseline update
      records.forEach((record) => {
        updateBaseline(record, firstRectsMap, firstStylesMap);
      });
    };

    const onEnd = (e: Event) => {
      const t = e.currentTarget as HTMLElement;
      t.removeEventListener("transitionend", onEnd);
      t.removeEventListener("transitioncancel", onEnd);
      finish();
    };

    if (!nodes.length) {
      records.forEach((record) =>
        updateBaseline(record, firstRectsMap, firstStylesMap)
      );
      return;
    }

    allNodes.forEach((el) => {
      el.addEventListener("transitionend", onEnd);
      el.addEventListener("transitioncancel", onEnd);
    });

    const timeout = window.setTimeout(() => {
      allNodes.forEach((el) => {
        el.removeEventListener("transitionend", onEnd);
        el.removeEventListener("transitioncancel", onEnd);
      });
      finish();
    }, duration + 160);

    return () => {
      window.clearTimeout(timeout);
      // Cleanup any leftovers
      nodes.forEach((rec) =>
        rec.wrapper ? rec.wrapper.remove() : rec.ghost.remove()
      );
      nodes.forEach(({ record }) => {
        record.el.style.visibility = prevVis.get(record.key) ?? "";
      });
      records.forEach((record) =>
        updateBaseline(record, firstRectsMap, firstStylesMap)
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps ?? undefined);

  const refreshBaseline = useCallback(() => {
    const rootEl = root?.current ?? null;
    const firstRectsMap = firstRectsRef.current;
    const firstStylesMap = firstStylesRef.current;

    const entries = targets
      .map(
        (
          t,
          idx
        ): {
          key: number;
          el: HTMLElement | null;
          type: FlipType;
        } => {
          const opt: TargetOption =
            typeof t === "string" ||
            (typeof t === "object" && t && !("target" in t))
              ? { target: t as Target, type: "scale" }
              : (t as TargetOption);
          return {
            key: idx,
            el: resolveEl(opt.target),
            type: opt.type ?? "scale",
          };
        }
      )
      .filter(
        (entry): entry is { key: number; el: HTMLElement; type: FlipType } =>
          Boolean(entry.el)
      );

    const rootSnapshot = rootEl ? measure(rootEl, rootEl) : null;
    prevRootSnapshotRef.current = rootSnapshot;

    entries.forEach((entry) => {
      const snapshot = measure(entry.el, rootEl);
      const scrollParent = getScrollParent(entry.el);
      firstRectsMap.set(entry.key, {
        el: entry.el,
        snapshot,
        scrollParent,
        scrollLeft: scrollParent?.scrollLeft ?? 0,
        scrollTop: scrollParent?.scrollTop ?? 0,
      });

      if (entry.type === "text" || entry.type === "reflow") {
        firstStylesMap.set(entry.key, {
          el: entry.el,
          style: pickTextStyles(entry.el),
        });
      } else {
        firstStylesMap.delete(entry.key);
      }
    });

    readyOnceRef.current = true;
  }, [targets, root]);
  return {
    refreshBaseline,
  };
}
