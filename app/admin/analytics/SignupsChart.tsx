// Inline SVG bar chart — last 30 days of signups. No client JS, no chart lib.

export function SignupsChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const width = 720;
  const height = 200;
  const padding = { top: 16, right: 12, bottom: 28, left: 28 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const barW = innerW / data.length;
  const barGap = barW * 0.25;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto min-w-[640px]"
        role="img"
        aria-label="Signups por dia, últimos 30 dias"
      >
        <defs>
          <linearGradient id="bar-rose" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4a8bd" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#e85d8a" stopOpacity="0.75" />
          </linearGradient>
        </defs>

        {/* Y axis ticks */}
        {[0, 0.5, 1].map((p) => {
          const y = padding.top + innerH * (1 - p);
          const label = Math.round(max * p);
          return (
            <g key={p}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
              />
              <text
                x={padding.left - 6}
                y={y + 3}
                fontSize={9}
                fill="rgba(255,255,255,0.4)"
                textAnchor="end"
                fontFamily="system-ui"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const h = (d.count / max) * innerH;
          const x = padding.left + i * barW + barGap / 2;
          const y = padding.top + innerH - h;
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={Math.max(1, barW - barGap)}
                height={Math.max(0, h)}
                fill="url(#bar-rose)"
                rx={2}
              >
                <title>{`${d.date}: ${d.count} signup${d.count === 1 ? '' : 's'}`}</title>
              </rect>
            </g>
          );
        })}

        {/* X axis — show 1st, mid, last */}
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) => {
          const x = padding.left + i * barW + barW / 2;
          return (
            <text
              key={i}
              x={x}
              y={height - 10}
              fontSize={9}
              fill="rgba(255,255,255,0.4)"
              textAnchor="middle"
              fontFamily="system-ui"
            >
              {formatDate(data[i]?.date)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}
