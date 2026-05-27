import { useAnnotationQueues } from "~/features/annotations/hooks/useAnnotationQueues";
import { QueueTable } from "~/features/annotations/components/QueueTable";
import { QueueForm } from "~/features/annotations/components/QueueForm";

export default function AnnotationQueuesPage() {
  const { queues, isLoading, create, remove } = useAnnotationQueues();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Annotation Queues</h1>
        <a
          href="/annotations/work"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          My Workbench
        </a>
      </div>
      <QueueForm onSubmit={(data) => create.mutate(data)} />
      {isLoading ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <QueueTable queues={queues} onDelete={(id) => remove.mutate({ id })} />
      )}
    </div>
  );
}
