import { useState } from "react";
import { useRouter } from "next/router";
import { useActiveProject } from "~/features/projects/hooks/useActiveProject";
import { useDatasets } from "~/features/datasets/hooks/useDatasets";

export default function NewDatasetPage() {
  const { projectId } = useActiveProject();
  const router = useRouter();
  const { create } = useDatasets(projectId ?? undefined);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !name.trim()) return;
    const ds = await create.mutateAsync({
      projectId,
      name: name.trim(),
      description: description.trim() || undefined,
    });
    router.push(`/datasets/${ds.id}`);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <a href="/datasets" className="text-sm text-gray-500 hover:underline">
        ← Datasets
      </a>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">New Dataset</h1>
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
            rows={3}
          />
        </div>
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {create.isPending ? "Creating…" : "Create Dataset"}
        </button>
      </form>
    </div>
  );
}
