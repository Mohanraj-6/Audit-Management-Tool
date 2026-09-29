'use client';

/**
 * Lightweight SVG/CSS charts — the API returns ready-to-plot aggregates and
 * we render them without pulling in a charting library.
 */

export function BarList({
  items,
  emptyLabel = 'No data yet',
  tone = 'bg-brand-500',
}: {
  items: Array<{ label: string; value: number }>;
  emptyLabel?: string;
  tone?: string;
}) {
  if (!items.length) return <p className="py-6 text-center text-xs text-slate-400">{emptyLabel}</p>;

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="tabular-nums text-slate-500">{item.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ColumnChart({
  data,
  emptyLabel = 'No data for the last 6 months',
}: {
  data: Array<{ label: string; total: number; completed: number }>;
  emptyLabel?: string;
}) {
  if (!data.length) return <p className="py-6 text-center text-xs text-slate-400">{emptyLabel}</p>;

  const max = Math.max(...data.map((point) => point.total), 1);

  return (
    <div className="flex items-end gap-4 overflow-x-auto pb-1">
      {data.map((point) => (
        <div key={point.label} className="flex min-w-[52px] flex-1 flex-col items-center gap-2">
          <div className="flex h-40 w-full items-end justify-center gap-1">
            <div
              className="w-4 rounded-t bg-brand-200"
              style={{ height: `${Math.max((point.total / max) * 100, 3)}%` }}
              title={`${point.total} audits created`}
            />
            <div
              className="w-4 rounded-t bg-emerald-500"
              style={{ height: `${Math.max((point.completed / max) * 100, point.completed ? 3 : 0)}%` }}
              title={`${point.completed} completed`}
            />
          </div>
          <span className="text-xs text-slate-500">{point.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({
  slices,
  size = 160,
  thickness = 20,
}: {
  slices: Array<{ label: string; value: number; color: string }>;
  size?: number;
  thickness?: number;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (!total) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-400">No findings recorded</div>
    );
  }

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {slices.map((slice) => {
            const length = (slice.value / total) * circumference;
            const dash = `${length} ${circumference - length}`;
            const element = (
              <circle
                key={slice.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={thickness}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return element;
          })}
        </g>
        <text x="50%" y="47%" textAnchor="middle" className="fill-slate-800" style={{ fontSize: 22, fontWeight: 600 }}>
          {total}
        </text>
        <text x="50%" y="60%" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 11 }}>
          findings
        </text>
      </svg>

      <ul className="space-y-2 text-sm">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: slice.color }} />
            <span className="capitalize text-slate-600">{slice.label}</span>
            <span className="font-medium tabular-nums text-slate-800">{slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
