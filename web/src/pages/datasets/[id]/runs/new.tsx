import { useState } from "react";
import { useRouter } from "next/router";
import { useActiveProject } from "~/features/projects/hooks/useActiveProject";
import { useDatasetRuns } from "~/features/datasets/hooks/useDatasetRuns";
import { useDatasetRunPresets } from "~/features/datasets/hooks/useDatasetRunPresets";
import { api } from "~/utils/api";

export default function NewRunPage() {
  const router = useRouter();
  const { projectId } = useActiveProject();
  const datasetId = String(router.query.id);
  const { create } = useDatasetRuns(projectId ?? undefined, datasetId);
  const { presets } = useDatasetRunPresets(projectId ?? undefined);
  const { data: prompts } = api.prompts.list.useQuery(
    { projectId: projectId ?? "" },
    { enabled: !!projectId }
  );
  const { data: evalTemplates } = api.evals.templateList.useQuery(
    { projectId: projectId ?? "" },
    { enabled: !!projectId }
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [configMode, setConfigMode] = useState<"preset" | "manual">("preset");
  const [presetId, setPresetId] = useState("");
  const [promptId, setPromptId] = useState("");
  const [promptVersion, setPromptVersion] = useState(1);
  const [model, setModel] = useState("gpt-4o-mini");
  const [temperature, setTemperature] = useState(0);
  const [selectedEvals, setSelectedEvals] = useState<string[]>([]);

  const selectedPrompt = prompts?.find((p: { id: string }) => p.id === promptId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !name.trim()) return;

    const params: Record<string, unknown> = {
      projectId,
      datasetId,
      name: name.trim(),
      description: description.trim() || undefined,
    };

    if (configMode === "preset") {
      params.presetId = presetId;
    } else {
      params.model = model;
      params.modelParams = { temperature };
      if (promptId) {
        params.promptId = promptId;
        params.promptVersion = promptVersion;
      }
      params.evalTemplateIds = selectedEvals;
    }

    await create.mutateAsync(params as never);
    router.push(`/datasets/${datasetId}`);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <a href={`/datasets/${datasetId}`} className="text-sm text-gray-500 hover:underline">
        ← Back to dataset
      </a>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">New Dataset Run</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700">Run Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            rows={2}
          />
        </div>

        <fieldset className="rounded-lg border bg-gray-50 p-4">
          <legend className="text-sm font-medium text-gray-700">Configuration</legend>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="configMode"
                value="preset"
                checked={configMode === "preset"}
                onChange={() => setConfigMode("preset")}
              />
              Use Preset
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="configMode"
                value="manual"
                checked={configMode === "manual"}
                onChange={() => setConfigMode("manual")}
              />
              Manual Configuration
            </label>
          </div>
        </fieldset>

        {configMode === "preset" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700">Preset</label>
            <select
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              required
            >
              <option value="">Select preset…</option>
              {presets.map((p: { id: string; name: string; model: string }) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.model})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Prompt</label>
              <select
                value={promptId}
                onChange={(e) => {
                  setPromptId(e.target.value);
                  setPromptVersion(1);
                }}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              >
                <option value="">None (use raw input)</option>
                {prompts?.map((p: { id: string; name: string }) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Model</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Temperature: {temperature}
              </label>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Eval Templates</label>
              <div className="mt-1 space-y-1">
                {evalTemplates?.map((et: { id: string; name: string }) => (
                  <label key={et.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedEvals.includes(et.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedEvals([...selectedEvals, et.id]);
                        else setSelectedEvals(selectedEvals.filter((id) => id !== et.id));
                      }}
                    />
                    {et.name}
                  </label>
                ))}
                {(!evalTemplates || evalTemplates.length === 0) && (
                  <span className="text-xs text-gray-400">No eval templates available</span>
                )}
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={create.isPending}
          className="w-full rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {create.isPending ? "Executing…" : "Execute Run"}
        </button>
      </form>
    </div>
  );
}
