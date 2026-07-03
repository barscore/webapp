import { useCallback, useEffect, useRef, useState } from 'react';

// Drag-to-resize for a bottom sheet. `height` is a percentage of the dynamic
// viewport (dvh). On release the height snaps to the nearest value in `stops`
// (sorted ascending, e.g. [44, 84, 100] = collapsed / expanded / fullscreen).
//
// Perf: while the finger moves, the height is written straight to the DOM via
// `sheetRef` — a React render per pointermove re-renders the whole page tree
// (map + markers + list) every frame, which is what made low-end phones
// stutter. State only updates on release, at the snapped stop.
//
// Two handles:
//  - `grabberProps` — pure resize; spread on the visible grabber.
//  - `contentProps` — scroll-aware; spread on the scrollable body so dragging
//    any empty area resizes the sheet, while the inner list still scrolls once
//    it's past its top edge. The body must have `touch-action: none` (Tailwind
//    `touch-none`) so we can drive both gestures ourselves.
export function useSheetDrag(stops, initial) {
  const [height, setHeight] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const sheetRef = useRef(null); // attach to the sheet element for direct writes
  const drag = useRef(null);
  const min = stops[0];
  const max = stops[stops.length - 1];

  const nearest = useCallback(
    (cur) => stops.reduce((a, b) => (Math.abs(b - cur) < Math.abs(a - cur) ? b : a)),
    [stops],
  );

  const startResize = useCallback(() => {
    setDragging(true);
    // Kill the snap transition immediately — waiting for the React commit
    // would rubber-band the first few frames of the drag.
    const el = sheetRef.current;
    if (el) el.style.transition = 'none';
  }, []);

  // Visible grabber: always resizes.
  const onGrabberDown = useCallback(
    (e) => {
      e.preventDefault();
      drag.current = { y: e.clientY, h: height, cur: height, vh: window.innerHeight / 100, mode: 'resize' };
      startResize();
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [height, startResize],
  );

  // Scrollable body: decide resize vs scroll on first move.
  const onContentDown = useCallback(
    (e) => {
      const el = e.currentTarget;
      drag.current = {
        y: e.clientY,
        h: height,
        cur: height,
        vh: window.innerHeight / 100,
        mode: null,
        el,
        scroll: el.scrollTop,
        pid: e.pointerId,
      };
    },
    [height],
  );

  const onMove = useCallback(
    (e) => {
      const d = drag.current;
      if (!d) return;
      const dy = e.clientY - d.y;

      if (d.mode === null) {
        if (Math.abs(dy) < 4) return; // wait for a real gesture (let taps click)
        const el = d.el;
        const atTop = el.scrollTop <= 0;
        const scrollable = el.scrollHeight > el.clientHeight + 1;
        const grow = dy < 0 && d.h < max;
        const shrink = dy > 0;
        d.mode = (atTop || !scrollable) && (shrink || grow) ? 'resize' : 'scroll';
        el.setPointerCapture?.(d.pid); // capture only once we own the gesture
        if (d.mode === 'resize') startResize();
      }

      if (d.mode === 'resize') {
        const h = Math.min(max, Math.max(min, d.h - dy / d.vh));
        d.cur = h;
        const el = sheetRef.current;
        if (el) el.style.height = `${h}dvh`;
        else setHeight(h); // no ref attached — fall back to state-driven resize
      } else if (d.mode === 'scroll') {
        d.el.scrollTop = d.scroll - dy;
      }
    },
    [min, max, startResize],
  );

  const onUp = useCallback(() => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setDragging(false);
    if (d.mode !== 'scroll') {
      const snapped = nearest(d.cur ?? d.h);
      // Animate to the stop imperatively as well: when the snapped value equals
      // the pre-drag state, React skips the style write and the sheet would be
      // stuck at the dragged height.
      const el = sheetRef.current;
      if (el) {
        el.style.transition = 'height 0.28s ease';
        el.style.height = `${snapped}dvh`;
      }
      setHeight(snapped);
    }
  }, [nearest]);

  const dragStyle = { touchAction: 'none', cursor: 'grab' };

  return {
    height,
    dragging,
    setHeight,
    sheetRef,
    grabberProps: {
      onPointerDown: onGrabberDown,
      onPointerMove: onMove,
      onPointerUp: onUp,
      onPointerCancel: onUp,
      style: dragStyle,
    },
    contentProps: {
      onPointerDown: onContentDown,
      onPointerMove: onMove,
      onPointerUp: onUp,
      onPointerCancel: onUp,
    },
  };
}

// True below the Tailwind `md` breakpoint. Keeps drag-to-resize on mobile only.
export function useIsMobile(bp = 768) {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < bp,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${bp - 1}px)`);
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [bp]);
  return mobile;
}
