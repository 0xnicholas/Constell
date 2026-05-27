interface Config {
  id: string;
  name: string;
  dataType: string;
  description: string | null;
  minValue: number | null;
  maxValue: number | null;
}

export function ScoreConfigTable({
  configs,
  onDelete,
}: {
  configs: Config[];
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Range</th>
            <th className="px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {configs.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="px-4 py-2">
                <div className="font-medium">{c.name}</div>
                {c.description && <div className="text-xs text-gray-400">{c.description}</div>}
              </td>
              <td className="px-4 py-2">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{c.dataType}</span>
              </td>
              <td className="px-4 py-2">
                {c.dataType === "NUMERIC" && c.minValue !== null && c.maxValue !== null
                  ? `${c.minValue} – ${c.maxValue}`
                  : "—"}
              </td>
              <td className="px-4 py-2">
                <button
                  onClick={() => onDelete(c.id)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {configs.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                No score configs yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
