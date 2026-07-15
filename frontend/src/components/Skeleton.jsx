// Loading placeholders. These replace the "spinner + Caricamento…" line that
// used to sit in every list: a skeleton that matches the shape of the incoming
// content reads as faster than a spinner, because the layout stops jumping.
//
// The visible "Caricamento…" string is gone, so the label moves to an sr-only
// node behind aria-busy — screen readers still announce the wait.
//
// Note for callers: Home paints a localStorage cache instantly on a warm start
// (see the `loading && !list.length` conditions). Only render a skeleton when
// there is genuinely nothing to show, or a cache hit would flash a skeleton it
// doesn't need.

function Bone({ className = '' }) {
  return <span className={`skel block ${className}`} />;
}

// n rows shaped exactly like BarRow/DrinkRow/EventRow — same 52px tile, same
// two text lines, same badge — so the list doesn't reflow when the data lands.
export function SkeletonRows({ n = 5, label }) {
  return (
    <div aria-busy="true" className="space-y-2.5">
      {label && <span className="sr-only">{label}</span>}
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex items-center gap-3.5 px-3.5 py-3.5">
          <Bone className="h-[52px] w-[52px] shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bone className="h-4 w-1/2" />
            <Bone className="h-2.5 w-1/3" />
          </div>
          <Bone className="h-8 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// The bar sheet / bar page: title, score chip, bars card, radar block.
export function SkeletonBar({ label }) {
  return (
    <div aria-busy="true" className="space-y-4 py-2">
      {label && <span className="sr-only">{label}</span>}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Bone className="h-5 w-2/3" />
          <Bone className="h-3 w-1/3" />
        </div>
        <Bone className="h-10 w-12 shrink-0" />
      </div>
      <Bone className="h-32 w-full" />
      <Bone className="h-64 w-full" />
    </div>
  );
}

export default SkeletonRows;
