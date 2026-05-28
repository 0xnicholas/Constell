import { useState } from "react";
import { useRouter } from "next/router";
import { useActiveProject } from "~/features/projects/hooks/useActiveProject";
import { useDatasets } from "~/features/datasets/hooks/useDatasets";
import { useDatasetItems } from "~/features/datasets/hooks/useDatasetItems";
import { useDatasetRuns } from "~/features/datasets/hooks/useDatasetRuns";

export default function DatasetDetailPage() {
  const router = useRouter();
  const { projectId } = useActiveProject();
  const id = String(router.query.id);
  const { detail } = useDatasets(projectId ?? undefined);
  const { data: dataset, isLoading } = detail(id);
  const [tab, setTab] = useState<"items" | "runs">("items");

  if (isLoading) return <div className="p-6 text-gray-500">Loading…</div>;
  if (!dataset) return <div className="p-6 text-red-500">Dataset not found</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <a href="/datasets" className="text-sm text-gray-500 hover:underline">
        ← Datasets
      </a>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{dataset.name}</h1>
          {dataset.description && <p className="text-sm text-gray-500">{dataset.description}</p>}
        </div>
        <div className="flex gap-2">
          <a
            href={`/datasets/${id}/items/new`}
            className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            + Item
          </a>
          <a
            href={`/datasets/${id}/runs/new`}
            className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Run
          </a>
        </div>
      </div>

      <div className="mt-6 flex gap-4 border-b">
        <button
          onClick={() => setTab("items")}
          className={`pb-2 text-sm font-medium ${tab === "items" ? "border-b-2 border-gray-900 text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          Items ({dataset.itemsCount})
        </button>
        <button
          onClick={() => setTab("runs")}
          className={`pb-2 text-sm font-medium ${tab === "runs" ? "border-b-2 border-gray-900 text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          Runs ({dataset.runsCount})
        </button>
      </div>

      <div className="mt-4">
        {tab === "items" ? (
          <DatasetItemsTab projectId={projectId ?? ""} datasetId={id} />
        ) : (
          <DatasetRunsTab projectId={projectId ?? ""} datasetId={id} />
        )}
      </div>
    </div>
  );
}

function DatasetItemsTab({ projectId, datasetId }: { projectId: string; datasetId: string }) {
  const { items, isLoading, remove } = useDatasetItems(projectId, datasetId);

  if (isLoading) return <div className="text-gray-500">Loading items…</div>;
  if (items.length === 0)
    return (
      <div className="py-8 text-center text-gray-400">
        No items in this dataset yet.{" "}
        <a href={`/datasets/${datasetId}/items/new`} className="text-blue-600 hover:underline">
          Add one →
        </a>
      </div>
    );

  return (
    <div className="space-y-3">
      {items.map((item: any) => (
        <div key={String(item.id)} className="rounded-lg border bg-white p-3 text-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <span className="text-xs font-medium text-gray-500">Input</span>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-gray-50 p-2 text-xs">
                {JSON.stringify(item.input, null, 2)}
              </pre>
              {item.expectedOutput != null && (
                <>
                  <span className="mt-2 block text-xs font-medium text-gray-500">
                    Expected Output
                  </span>
                  <pre className="mt-1 max-h-32 overflow-auto rounded bg-gray-50 p-2 text-xs">
                    {JSON.stringify(item.expectedOutput, null, 2)}
                  </pre>
                </>
              )}
              {item.sourceTraceId && (
                <span className="mt-1 block text-xs text-gray-400">
                  Source: trace/{item.sourceTraceId}
                </span>
              )}
            </div>
            <button
              onClick={() => remove.mutate({ projectId, id: String(item.id) })}
              className="ml-2 text-xs text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DatasetRunsTab({ projectId, datasetId }: { projectId: string; datasetId: string }) {
  const { runs, isLoading, remove } = useDatasetRuns(projectId, datasetId);

  if (isLoading) return <div className="text-gray-500">Loading runs…</div>;
  if (runs.length === 0)
    return (
      <div className="py-8 text-center text-gray-400">
        No runs yet.{" "}
        <a href={`/datasets/${datasetId}/runs/new`} className="text-blue-600 hover:underline">
          Run an experiment →
        </a>
      </div>
    );

  const statusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700";
      case "FAILED":
        return "bg-red-100 text-red-700";
      case "RUNNING":
        return "bg-blue-100 text-blue-700";
      case "CANCELLED":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-2">
      {runs.map((run: Record<string, unknown>) => (
        <div
          key={String(run.id)}
          className="flex items-center justify-between rounded-lg border bg-white p-3"
        >
          <div className="flex items-center gap-3">
            <a
              href={`/datasets/${datasetId}/runs/${run.id}`}
              className="font-medium text-blue-600 hover:underline"
            >
              {String(run.name)}
            </a>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${statusColor(String(run.status))}`}
            >
              {String(run.status)}
            </span>
          </div>
          <div className="flex gap-2">
            <a
              href={`/datasets/${datasetId}/compare`}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Compare
            </a>
            <button
              onClick={() => remove.mutate({ projectId, id: String(run.id) })}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
