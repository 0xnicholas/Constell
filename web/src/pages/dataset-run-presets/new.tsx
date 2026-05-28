import { useState } from "react";
import { useRouter } from "next/router";
import { useActiveProject } from "~/features/projects/hooks/useActiveProject";
import { useDatasetRunPresets } from "~/features/datasets/hooks/useDatasetRunPresets";
import { api } from "~/utils/api";

export default function NewPresetPage() {
  const { projectId } = useActiveProject();
  const router = useRouter();
  const { create } = useDatasetRunPresets(projectId ?? undefined);
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
  const [promptId, setPromptId] = useState("");
  const [promptVersion, setPromptVersion] = useState(1);
  const [model, setModel] = useState("gpt-4o-mini");
  const [temperature, setTemperature] = useState(0);
  const [selectedEvals, setSelectedEvals] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !name.trim()) return;

    await create.mutateAsync({
      projectId,
      name: name.trim(),
      description: description.trim() || undefined,
      promptId: promptId || undefined,
      promptVersion,
      model,
      modelParams: { temperature },
      evalTemplateIds: selectedEvals,
    });
    router.push("/dataset-run-presets");
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <a href="/dataset-run-presets" className="text-sm text-gray-500 hover:underline">
        ← Run Presets
      </a>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">New Run Preset</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
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
            <option value="">None</option>
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
          </div>
        </div>
        <button
          type="submit"
          disabled={create.isPending}
          className="w-full rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {create.isPending ? "Creating…" : "Create Preset"}
        </button>
      </form>
    </div>
  );
}
