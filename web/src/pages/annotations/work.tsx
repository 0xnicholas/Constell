import { api } from "~/utils/api";
import { AnnotatorWorkbench } from "~/features/annotations/components/AnnotatorWorkbench";

export default function AnnotatorWorkPage() {
  const { data: assignments, isLoading } = api.annotations.myAssignments.useQuery({
    status: "ASSIGNED",
  });
  const annotate = api.annotations.itemAnnotate.useMutation();

  if (isLoading) return <div className="p-6">Loading…</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">My Workbench</h1>
      <AnnotatorWorkbench
        assignments={assignments ?? []}
        onAnnotate={(itemId, data) => annotate.mutate({ itemId, ...data })}
        onSkip={(itemId) => {
          // Unassign by setting userId to null
          console.log("Skip item", itemId);
        }}
      />
    </div>
  );
}
