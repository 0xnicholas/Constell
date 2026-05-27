interface ScoreItem {
  id: string;
  traceId: string;
  observationId: string | null;
  name: string;
  dataType: string;
  value: number;
  stringValue: string | null;
  source: string;
  comment: string | null;
  createdAt: string;
}

export function ScoreList({ scores }: { scores: ScoreItem[] }) {
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="px-4 py-2 font-medium">Trace</th>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Value</th>
            <th className="px-4 py-2 font-medium">Source</th>
            <th className="px-4 py-2 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="px-4 py-2 font-mono text-xs">{s.traceId.slice(0, 8)}…</td>
              <td className="px-4 py-2">{s.name}</td>
              <td className="px-4 py-2">
                {s.dataType === "CATEGORICAL" ? (s.stringValue ?? "—") : s.value}
              </td>
              <td className="px-4 py-2">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{s.source}</span>
              </td>
              <td className="px-4 py-2 text-xs text-gray-400">
                {new Date(s.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
          {scores.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                No scores yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
