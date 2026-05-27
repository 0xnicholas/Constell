export interface ScoreTrendData {
  bucket: string;
  average: number;
}

export function ScoreTrendChart({ data, label }: { data: ScoreTrendData[]; label: string }) {
  if (data.length === 0) return null;
  const maxValue = Math.max(...data.map((d) => d.average), 1);

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-medium text-gray-700">{label}</div>
      <div className="flex items-end gap-1 overflow-x-auto pb-2">
        {data.map((d) => {
          const pct = maxValue > 0 ? (d.average / maxValue) * 100 : 0;
          return (
            <div
              key={d.bucket}
              className="flex flex-col items-center"
              title={`${d.bucket}: ${d.average.toFixed(2)}`}
            >
              <div
                className="w-4 rounded-t bg-green-500"
                style={{ height: `${Math.max(pct, 2)}px` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
