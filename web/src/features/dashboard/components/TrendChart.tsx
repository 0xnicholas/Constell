export interface TrendData {
  bucket: string;
  traceCount: number;
  tokens: number;
  cost: string;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

export function TrendChart({ data, label }: { data: TrendData[]; label: string }) {
  // Beta simplification: renders cost bars only; tokens overlay is post-v0.5.0
  if (data.length === 0) return null;
  const maxValue = Math.max(...data.map((d) => Number(d.cost) || 0));
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-medium text-gray-700">{label}</div>
      <div className="flex items-end gap-1 overflow-x-auto pb-2">
        {data.map((d) => {
          const val = Number(d.cost) || 0;
          const pct = maxValue > 0 ? (val / maxValue) * 100 : 0;
          return (
            <div
              key={d.bucket}
              className="flex flex-col items-center"
              title={`${d.bucket}: $${d.cost}`}
            >
              <div
                className="w-4 rounded-t bg-blue-500"
                style={{ height: `${Math.max(pct, 2)}px` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
