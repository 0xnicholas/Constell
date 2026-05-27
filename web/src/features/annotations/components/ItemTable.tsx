import { useState } from "react";

interface Item {
  id: string;
  traceId: string;
  status: string;
  assignedTo: string | null;
  annotatorName: string | null;
  scoreValue: number | null;
  stringValue: string | null;
  comment: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  ANNOTATED: "bg-yellow-100 text-yellow-700",
  REVIEWED: "bg-green-100 text-green-700",
};

export function ItemTable({
  items,
  onAssign,
}: {
  items: Item[];
  onAssign: (itemIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      {selected.length > 0 && (
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <span className="text-sm text-gray-600">{selected.length} selected</span>
          <button
            onClick={() => {
              onAssign(selected);
              setSelected([]);
            }}
            className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
          >
            Assign to me
          </button>
        </div>
      )}
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="px-2 py-2">
              <input
                type="checkbox"
                checked={selected.length === items.length && items.length > 0}
                onChange={(e) => setSelected(e.target.checked ? items.map((i) => i.id) : [])}
              />
            </th>
            <th className="px-4 py-2 font-medium">Trace</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Assigned</th>
            <th className="px-4 py-2 font-medium">Score</th>
            <th className="px-4 py-2 font-medium">Comment</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-t">
              <td className="px-2 py-2">
                <input
                  type="checkbox"
                  checked={selected.includes(i.id)}
                  onChange={() => toggle(i.id)}
                />
              </td>
              <td className="px-4 py-2 font-mono text-xs">{i.traceId.slice(0, 8)}…</td>
              <td className="px-4 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    statusColors[i.status] ?? "bg-gray-100"
                  }`}
                >
                  {i.status}
                </span>
              </td>
              <td className="px-4 py-2 text-xs">{i.annotatorName ?? "—"}</td>
              <td className="px-4 py-2">
                {i.scoreValue !== null ? i.scoreValue : (i.stringValue ?? "—")}
              </td>
              <td className="px-4 py-2 text-xs text-gray-500 max-w-[200px] truncate">
                {i.comment ?? "—"}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                No items in queue
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
