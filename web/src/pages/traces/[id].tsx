import { useRouter } from "next/router";
import Link from "next/link";
import { api } from "~/utils/api";
import { SpanTree } from "~/features/traces/components/SpanTree";

export default function TraceDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const projectId = "dev-project"; // TODO: resolve from session or URL

  const { data, isLoading } = api.traces.detail.useQuery(
    { projectId, traceId: id || "" },
    { enabled: !!id }
  );

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!data?.trace) return <div className="p-6">Trace not found.</div>;

  const trace = data.trace;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/traces" className="text-blue-600 hover:underline text-sm">
        ← Back to traces
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-4">{trace.name || trace.externalId || trace.id}</h1>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-500">ID</div>
          <div>{trace.id}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-500">External ID</div>
          <div>{trace.externalId || "—"}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-500">User</div>
          <div>{trace.userId || "—"}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-500">Session</div>
          <div>{trace.sessionId || "—"}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-500">Tags</div>
          <div>{trace.tags?.join(", ") || "—"}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-500">Metadata</div>
          <pre className="text-xs overflow-x-auto">{JSON.stringify(trace.metadata, null, 2)}</pre>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-2">Observations</h2>
      {trace.observations.length > 0 ? (
        <SpanTree observations={trace.observations} />
      ) : (
        <p className="text-gray-500">No observations.</p>
      )}
    </div>
  );
}
