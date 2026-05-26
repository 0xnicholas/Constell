import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { TraceTable } from "~/features/traces/components/TraceTable";

export default function TracesPage() {
  const router = useRouter();
  const { projectId } = router.query as { projectId?: string };
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const effectiveProjectId = projectId || "dev-project";

  const { data, isLoading } = api.traces.list.useQuery({
    projectId: effectiveProjectId,
    from: from || undefined,
    to: to || undefined,
    limit,
    offset,
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Traces</h1>
      <div className="flex gap-4 mb-4">
        <input
          type="datetime-local"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="border px-2 py-1 rounded"
          placeholder="From"
        />
        <input
          type="datetime-local"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="border px-2 py-1 rounded"
          placeholder="To"
        />
        <button onClick={() => setOffset(0)} className="bg-blue-600 text-white px-4 py-1 rounded">
          Refresh
        </button>
      </div>
      {isLoading ? (
        <p>Loading…</p>
      ) : data?.traces?.length ? (
        <>
          <TraceTable traces={data.traces} projectId={effectiveProjectId} />
          <div className="flex gap-2 mt-4">
            <button
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset((o) => o + limit)}
              className="px-3 py-1 border rounded"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <p>No traces found.</p>
      )}
    </div>
  );
}
