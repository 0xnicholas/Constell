interface Queue {
  id: string;
  name: string;
  description: string | null;
  scoreConfigName: string | null;
  itemCount: number;
  completedCount: number;
}

export function QueueTable({
  queues,
  onDelete,
}: {
  queues: Queue[];
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Config</th>
            <th className="px-4 py-2 font-medium">Items</th>
            <th className="px-4 py-2 font-medium">Done</th>
            <th className="px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {queues.map((q) => (
            <tr key={q.id} className="border-t">
              <td className="px-4 py-2">
                <div className="font-medium">{q.name}</div>
                {q.description && <div className="text-xs text-gray-400">{q.description}</div>}
              </td>
              <td className="px-4 py-2 text-xs text-gray-500">{q.scoreConfigName ?? "—"}</td>
              <td className="px-4 py-2">{q.itemCount}</td>
              <td className="px-4 py-2">
                <span className={q.completedCount === q.itemCount ? "text-green-600" : ""}>
                  {q.completedCount}
                </span>
              </td>
              <td className="px-4 py-2">
                <a
                  href={`/annotations/queues/${q.id}`}
                  className="mr-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  Manage
                </a>
                <button
                  onClick={() => onDelete(q.id)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {queues.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                No annotation queues yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
