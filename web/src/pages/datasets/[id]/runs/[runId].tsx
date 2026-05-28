import { useRouter } from "next/router";
import { useActiveProject } from "~/features/projects/hooks/useActiveProject";
import { api } from "~/utils/api";

export default function RunDetailPage() {
  const router = useRouter();
  const { projectId } = useActiveProject();
  const runId = String(router.query.runId);
  const datasetId = String(router.query.id);

  const { data: run, isLoading } = api.datasetRuns.detail.useQuery(
    { projectId: projectId ?? "", id: runId },
    { enabled: !!projectId && !!runId }
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

  if (isLoading) return <div className="p-6 text-gray-500">Loading…</div>;
  if (!run) return <div className="p-6 text-red-500">Run not found</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <a href={`/datasets/${datasetId}`} className="text-sm text-gray-500 hover:underline">
        ← Back to dataset
      </a>
      <div className="mt-2">
        <h1 className="text-2xl font-bold text-gray-900">{run.name}</h1>
        <div className="mt-1 flex items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColor(run.status)}`}>
            {run.status}
          </span>
          {run.description && <span className="text-sm text-gray-500">{run.description}</span>}
        </div>
      </div>

      {run.metadata && (
        <div className="mt-4 rounded-lg border bg-gray-50 p-3 text-sm">
          <span className="font-medium text-gray-700">Config:</span>{" "}
          <span className="text-gray-600">{JSON.stringify(run.metadata)}</span>
        </div>
      )}

      <h2 className="mt-6 text-lg font-semibold text-gray-900">
        Items ({run.runItems?.length ?? 0})
      </h2>
      <div className="mt-3 space-y-2">
        {(run.runItems ?? []).map((ri: any) => (
          <div key={String(ri.id)} className="rounded-lg border bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                Item: <span className="font-mono text-xs">{String(ri.datasetItemId)}</span>
              </span>
              {ri.traceId && (
                <a href={`/traces/${ri.traceId}`} className="text-xs text-blue-600 hover:underline">
                  View Trace →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
