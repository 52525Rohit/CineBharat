export function Card({ children, className = "" }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 bg-surface ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/80">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-white/45">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export const thClass =
  "px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40";
export const tdClass = "px-5 py-3 text-sm text-white/85";
export const rowClass =
  "border-t border-white/[0.06] transition-colors hover:bg-white/[0.03]";

export const btnPrimary =
  "rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50";
export const btnOutline =
  "rounded-md border border-white/20 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/5";
export const btnGhost =
  "rounded-md px-2.5 py-1 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white";
export const btnDanger =
  "rounded-md px-2.5 py-1 text-xs font-medium text-red-400/80 transition-colors hover:bg-red-500/10 hover:text-red-400";
export const inputClass =
  "w-full rounded-md bg-ink px-3 py-2 text-sm text-white ring-1 ring-white/10 outline-none transition focus:ring-2 focus:ring-accent";

const tones = {
  neutral: "bg-white/10 text-white/70",
  green: "bg-emerald-500/15 text-emerald-400",
  red: "bg-red-500/15 text-red-400",
  amber: "bg-amber-500/15 text-amber-300",
  accent: "bg-accent/20 text-accent",
};

export function Badge({ children, tone = "neutral" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${tones[tone] ?? tones.neutral}`}
    >
      {children}
    </span>
  );
}

export function planTone(plan) {
  return plan === "premium"
    ? "accent"
    : plan === "standard"
      ? "green"
      : plan === "basic"
        ? "amber"
        : "neutral";
}


const svg = (paths) =>
  function Icon({ className = "h-4 w-4" }) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths}
      </svg>
    );
  };

export const IconGrid = svg(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </>,
);
export const IconFilm = svg(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
  </>,
);
export const IconTv = svg(
  <>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M8 21h8" />
  </>,
);
export const IconTag = svg(
  <>
    <path d="M20.6 13.4 12 22l-9-9V4h9l8.6 8.6a2 2 0 0 1 0 2.8Z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </>,
);
export const IconUsers = svg(
  <>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.5a3 3 0 0 1 0 5.8M17.5 20a5.5 5.5 0 0 0-3-4.9" />
  </>,
);
