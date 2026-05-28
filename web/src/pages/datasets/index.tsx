import { useState } from "react";
import { useActiveProject } from "~/features/projects/hooks/useActiveProject";
import { useDatasets } from "~/features/datasets/hooks/useDatasets";
import { DatasetTable } from "~/features/datasets/components/DatasetTable";
import { DatasetForm } from "~/features/datasets/components/DatasetForm";

export default function DatasetsPage() {
  const { projectId, isLoading: projectLoading } = useActiveProject();
  const [search, setSearch] = useState("");
  const { datasets, isLoading, create, remove } = useDatasets(
    projectId ?? undefined,
    search || undefined
  );

  if (projectLoading) return <div className="p-6 text-gray-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Datasets</h1>
        <a
          href="/datasets/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + New Dataset
        </a>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search datasets…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded border px-3 py-2 text-sm"
        />
      </div>

      <DatasetForm onSubmit={(data) => create.mutate({ projectId: projectId ?? "", ...data })} />

      {isLoading ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <DatasetTable
          datasets={datasets?.data ?? []}
          projectId={projectId ?? ""}
          onDelete={(id) => remove.mutate({ projectId: projectId ?? "", id })}
        />
      )}
    </div>
  );
}
