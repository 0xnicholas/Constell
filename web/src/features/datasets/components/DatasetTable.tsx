interface DatasetRow {
  id: string;
  name: string;
  description: string | null;
  itemsCount: number;
  runsCount: number;
}

export function DatasetTable({
  datasets,
  projectId,
  onDelete,
}: {
  datasets: DatasetRow[];
  projectId: string;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Items</th>
            <th className="px-4 py-2 font-medium">Runs</th>
            <th className="px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {datasets.map((ds) => (
            <tr key={ds.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-2">
                <a
                  href={`/datasets/${ds.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {ds.name}
                </a>
                {ds.description && <div className="text-xs text-gray-400">{ds.description}</div>}
              </td>
              <td className="px-4 py-2">{ds.itemsCount}</td>
              <td className="px-4 py-2">{ds.runsCount}</td>
              <td className="px-4 py-2">
                <button
                  onClick={() => onDelete(ds.id)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {datasets.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                No datasets yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
