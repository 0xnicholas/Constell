import { useEvalTemplates } from "~/features/evals/hooks/useEvalTemplates";
import { EvalTemplateTable } from "~/features/evals/components/EvalTemplateTable";
import { EvalTemplateForm } from "~/features/evals/components/EvalTemplateForm";

export default function EvalTemplatesPage() {
  const { templates, isLoading, create, remove } = useEvalTemplates();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Eval Templates</h1>
      <EvalTemplateForm onSubmit={(data) => create.mutate(data)} />
      {isLoading ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <EvalTemplateTable templates={templates} onDelete={(id) => remove.mutate({ id })} />
      )}
    </div>
  );
}
