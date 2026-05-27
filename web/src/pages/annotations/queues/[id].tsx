import { useRouter } from "next/router";
import Link from "next/link";
import { api } from "~/utils/api";
import { useAnnotationItems } from "~/features/annotations/hooks/useAnnotationItems";
import { ItemTable } from "~/features/annotations/components/ItemTable";

export default function QueueDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };

  const { data: stats } = api.annotations.queueStats.useQuery(
    { queueId: id || "" },
    { enabled: !!id }
  );
  const { items, isLoading, assign } = useAnnotationItems(id || "");

  if (!id) return <div className="p-6">Loading…</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link href="/annotations/queues" className="text-blue-600 hover:underline text-sm">
        ← Back to queues
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-4">Queue Detail</h1>

      {stats && (
        <div className="mb-4 grid grid-cols-5 gap-2">
          {[
            { label: "Total", value: stats.total },
            { label: "Pending", value: stats.pending },
            { label: "Assigned", value: stats.assigned },
            { label: "Annotated", value: stats.annotated },
            { label: "Reviewed", value: stats.reviewed },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border bg-white p-3 text-center">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-xl font-semibold">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <ItemTable items={items} onAssign={(itemIds) => assign.mutate({ itemIds })} />
      )}
    </div>
  );
}
