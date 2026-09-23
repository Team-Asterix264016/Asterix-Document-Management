import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import clsx from "clsx";

const TIME_FMT = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

const DATE_FMT = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Align ticks to the start of each second so the display never skips.
    let interval: number | undefined;
    const timeout = window.setTimeout(() => {
      setNow(new Date());
      interval = window.setInterval(() => setNow(new Date()), 1000);
    }, 1000 - (Date.now() % 1000));
    return () => {
      window.clearTimeout(timeout);
      if (interval) window.clearInterval(interval);
    };
  }, []);
  return now;
}

/** Live IST clock for the top bar. `compact` hides the date (mobile). */
export function LiveClock({ compact = false, className }: { compact?: boolean; className?: string }) {
  const now = useNow();
  return (
    <div
      className={clsx("flex items-center gap-2 text-ink-700", className)}
      aria-label={`Current time ${TIME_FMT.format(now)} IST`}
    >
      <Clock className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} />
      <time dateTime={now.toISOString()} className="flex items-baseline gap-2 whitespace-nowrap">
        {!compact && <span className="text-xs text-ink-500">{DATE_FMT.format(now)}</span>}
        <span className="font-mono text-xs font-semibold tabular-nums text-ink-900">{TIME_FMT.format(now)}</span>
        {!compact && <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">IST</span>}
      </time>
    </div>
  );
}
