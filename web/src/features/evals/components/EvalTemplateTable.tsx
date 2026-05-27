interface Template {
  id: string;
  name: string;
  description: string | null;
  scoreName: string;
  scoreDataType: string;
  model: string;
}

export function EvalTemplateTable({
  templates,
  onDelete,
}: {
  templates: Template[];
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Score Name</th>
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Model</th>
            <th className="px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="px-4 py-2">
                <div className="font-medium">{t.name}</div>
                {t.description && <div className="text-xs text-gray-400">{t.description}</div>}
              </td>
              <td className="px-4 py-2">{t.scoreName}</td>
              <td className="px-4 py-2">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                  {t.scoreDataType}
                </span>
              </td>
              <td className="px-4 py-2 text-xs text-gray-500">{t.model}</td>
              <td className="px-4 py-2">
                <button
                  onClick={() => onDelete(t.id)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {templates.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                No eval templates yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
