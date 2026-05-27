import Link from "next/link";

interface PromptListItem {
  id: string;
  name: string;
  updatedAt: Date;
  versions: { version: number; labels: { label: string }[] }[];
}

export function PromptList({
  prompts,
  projectId,
}: {
  prompts: PromptListItem[];
  projectId: string;
}) {
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b">
          <th className="py-2">Name</th>
          <th className="py-2">Latest Version</th>
          <th className="py-2">Labels</th>
          <th className="py-2">Updated</th>
        </tr>
      </thead>
      <tbody>
        {prompts.map((p) => (
          <tr key={p.id} className="border-b hover:bg-gray-50">
            <td className="py-2">
              <Link
                href={`/prompts/${encodeURIComponent(p.name)}?projectId=${projectId}`}
                className="text-blue-600 hover:underline"
              >
                {p.name}
              </Link>
            </td>
            <td className="py-2">{p.versions[0]?.version ?? "—"}</td>
            <td className="py-2">
              <div className="flex gap-1 flex-wrap">
                {p.versions[0]?.labels.map((l) => (
                  <span key={l.label} className="bg-gray-200 text-xs px-2 py-0.5 rounded">
                    {l.label}
                  </span>
                )) ?? "—"}
              </div>
            </td>
            <td className="py-2 text-sm text-gray-500">
              {new Date(p.updatedAt).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
