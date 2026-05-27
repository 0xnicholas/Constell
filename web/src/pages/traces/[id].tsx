import { useRouter } from "next/router";
import Link from "next/link";
import { api } from "~/utils/api";
import { SpanTree } from "~/features/traces/components/SpanTree";
import { useActiveProject } from "~/features/projects/hooks/useActiveProject";
import { ScoreCard } from "~/features/scores/components/ScoreCard";

export default function TraceDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const { projectId, isLoading: projectLoading } = useActiveProject();

  const { data, isLoading } = api.traces.detail.useQuery(
    { projectId: projectId || "", traceId: id || "" },
    { enabled: !!id && !!projectId }
  );

  const scoresQuery = api.scores.list.useQuery(
    { projectId: projectId || "", traceId: id || "" },
    { enabled: !!id && !!projectId }
  );

  if (projectLoading || isLoading) return <div className="p-6">Loading…</div>;
  if (!projectId) return <div className="p-6">No project selected.</div>;
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

      <ScoreCard
        scores={
          scoresQuery.data?.scores.map((s) => ({
            name: s.name,
            dataType: s.dataType,
            value: s.value,
            stringValue: s.stringValue,
            source: s.source,
          })) ?? []
        }
      />

      <h2 className="text-lg font-semibold mb-2">Observations</h2>
      {trace.observations.length > 0 ? (
        <SpanTree observations={trace.observations} />
      ) : (
        <p className="text-gray-500">No observations.</p>
      )}
    </div>
  );
}
