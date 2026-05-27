interface Run {
  id: string;
  templateName: string;
  status: string;
  traceCount: number | null;
  scoreCount: number | null;
  averageScore: number | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  RUNNING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-yellow-100 text-yellow-700",
};

export function EvalRunTable({ runs, onCancel }: { runs: Run[]; onCancel: (id: string) => void }) {
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="px-4 py-2 font-medium">Template</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Traces</th>
            <th className="px-4 py-2 font-medium">Scores</th>
            <th className="px-4 py-2 font-medium">Avg</th>
            <th className="px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-4 py-2">{r.templateName}</td>
              <td className="px-4 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${statusColors[r.status] ?? "bg-gray-100"}`}
                >
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-2">{r.traceCount ?? "—"}</td>
              <td className="px-4 py-2">{r.scoreCount ?? "—"}</td>
              <td className="px-4 py-2">
                {r.averageScore !== null ? r.averageScore.toFixed(2) : "—"}
              </td>
              <td className="px-4 py-2">
                <a
                  href={`/evals/runs/${r.id}`}
                  className="text-xs text-blue-600 hover:text-blue-800 mr-2"
                >
                  View
                </a>
                {(r.status === "PENDING" || r.status === "RUNNING") && (
                  <button
                    onClick={() => onCancel(r.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
          {runs.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                No eval runs yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
