import { useState } from "react";
import { api } from "~/utils/api";
import { EvalRunTable } from "~/features/evals/components/EvalRunTable";
import { useActiveProject } from "~/features/projects/hooks/useActiveProject";

export default function EvalRunsPage() {
  const { projectId } = useActiveProject();
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: templatesData } = api.evals.templateList.useQuery({}, { enabled: !!projectId });
  const { data: runsData, isLoading } = api.evals.runList.useQuery({}, { enabled: !!projectId });
  const createRun = api.evals.runCreate.useMutation({
    onSuccess: () => {
      setSelectedTemplate("");
      setFrom("");
      setTo("");
    },
  });
  const cancelRun = api.evals.runCancel.useMutation();

  const templates = templatesData ?? [];
  const runs = runsData?.runs ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Eval Runs</h1>

      <div className="mb-4 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-medium text-gray-700">New Run</h2>
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="">Select template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
            placeholder="From"
          />
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
            placeholder="To"
          />
          <button
            disabled={!selectedTemplate}
            onClick={() =>
              createRun.mutate({
                templateId: selectedTemplate,
                from: from || undefined,
                to: to || undefined,
              })
            }
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Start Run
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <EvalRunTable runs={runs} onCancel={(id) => cancelRun.mutate({ id })} />
      )}
    </div>
  );
}
