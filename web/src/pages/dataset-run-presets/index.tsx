import { useActiveProject } from "~/features/projects/hooks/useActiveProject";
import { useDatasetRunPresets } from "~/features/datasets/hooks/useDatasetRunPresets";

export default function RunPresetsPage() {
  const { projectId, isLoading: projectLoading } = useActiveProject();
  const { presets, isLoading, remove } = useDatasetRunPresets(projectId ?? undefined);

  if (projectLoading) return <div className="p-6 text-gray-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Run Presets</h1>
        <a
          href="/dataset-run-presets/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + New Preset
        </a>
      </div>

      {isLoading ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <div className="rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Model</th>
                <th className="px-4 py-2 font-medium">Eval Templates</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {presets.map(
                (p: { id: string; name: string; model: string; evalTemplateIds: string[] }) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{p.name}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{p.model}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {p.evalTemplateIds?.length ?? 0}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => remove.mutate({ projectId: projectId ?? "", id: p.id })}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              )}
              {presets.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    No presets yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
