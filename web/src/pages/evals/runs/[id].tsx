import { useRouter } from "next/router";
import Link from "next/link";
import { api } from "~/utils/api";

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  RUNNING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-yellow-100 text-yellow-700",
};

export default function EvalRunDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };

  const { data, isLoading } = api.evals.runDetail.useQuery({ id: id || "" }, { enabled: !!id });

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!data) return <div className="p-6">Run not found.</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/evals/runs" className="text-blue-600 hover:underline text-sm">
        ← Back to eval runs
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-4">Eval Run</h1>

      <div className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">Template</div>
          <div className="font-medium">{data.templateName}</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">Status</div>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${statusColors[data.status] ?? "bg-gray-100"}`}
          >
            {data.status}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">Time Range</div>
          <div className="text-sm">
            {data.from ? new Date(data.from).toLocaleString() : "—"} →{" "}
            {data.to ? new Date(data.to).toLocaleString() : "—"}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">Traces</div>
          <div className="text-sm">
            {data.processedCount ?? 0} / {data.traceCount ?? "—"} processed
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">Scores Generated</div>
          <div className="font-medium">{data.scoreCount ?? "—"}</div>
        </div>
        {data.averageScore !== null && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Average Score</div>
            <div className="font-medium">{data.averageScore.toFixed(2)}</div>
          </div>
        )}
        {data.errorMessage && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-700">
            <div className="font-medium mb-1">Errors</div>
            <pre className="whitespace-pre-wrap text-xs">{data.errorMessage}</pre>
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div>Created: {new Date(data.createdAt).toLocaleString()}</div>
          <div>Updated: {new Date(data.updatedAt).toLocaleString()}</div>
        </div>
      </div>

      {data.scoreCount !== null && data.scoreCount > 0 && (
        <div className="mt-4">
          <Link
            href={`/scores?name=${encodeURIComponent(data.templateName)}`}
            className="text-blue-600 hover:underline text-sm"
          >
            View generated scores →
          </Link>
        </div>
      )}
    </div>
  );
}
