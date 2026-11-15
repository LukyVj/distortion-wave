// The mark: a line that becomes a wave, on a glass tile. Two states, "before" (both lines flat)
// and "after" (the lower line carried by the wave). The header shows "after", the hero shows both.
export function Mark({ state = "after", size = 28 }: { state?: "before" | "after"; size?: number }) {
  return (
    <svg className="mark" data-state={state} viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <rect className="mark-glass" x="1" y="1" width="30" height="30" rx="9" />
      <path className="mark-line" d="M7 12h18" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path
        className="mark-line mark-line-2"
        d={state === "before" ? "M7 20h18" : "M7 20c3-5 5-5 8 0s5 5 10 0"}
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
