interface Score {
  name: string;
  dataType: string;
  value: number;
  stringValue: string | null;
  source: string;
}

export function ScoreCard({ scores }: { scores: Score[] }) {
  if (scores.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="mb-2 text-lg font-semibold">Scores</h2>
      <div className="flex flex-wrap gap-2">
        {scores.map((s, i) => (
          <div
            key={`${s.name}-${i}`}
            className="min-w-[120px] rounded-lg border bg-white p-3 shadow-sm"
          >
            <div className="text-xs text-gray-500">{s.name}</div>
            <div className="mt-1 text-xl font-semibold">
              {s.dataType === "CATEGORICAL" ? (s.stringValue ?? "—") : s.value}
            </div>
            <div className="mt-0.5 text-[10px] text-gray-400">via {s.source}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
