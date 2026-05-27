import { useState } from "react";
import { api } from "~/utils/api";
import { PromptList } from "~/features/prompts/components/PromptList";
import { useActiveProject } from "~/features/projects/hooks/useActiveProject";

export default function PromptsPage() {
  const { projectId, isLoading: projectLoading } = useActiveProject();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const utils = api.useUtils();

  const { data, isLoading } = api.prompts.list.useQuery(
    { projectId: projectId || undefined },
    { enabled: !!projectId }
  );

  const createPrompt = api.prompts.create.useMutation({
    onSuccess: () => {
      utils.prompts.list.invalidate();
      setName("");
      setContent("");
    },
  });

  if (projectLoading || isLoading) return <div className="p-6">Loading…</div>;
  if (!projectId) return <div className="p-6">No project selected.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Prompts</h1>
      <div className="mb-6 border p-4 rounded">
        <h2 className="font-semibold mb-2">Create Prompt</h2>
        <input
          className="border px-2 py-1 rounded w-full mb-2"
          placeholder="Prompt name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="border px-2 py-1 rounded w-full mb-2 h-24"
          placeholder="Prompt content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
          disabled={createPrompt.isPending || !name.trim() || !content.trim()}
          onClick={() => createPrompt.mutate({ name, content })}
        >
          Create
        </button>
      </div>
      {data && data.length > 0 ? (
        <PromptList prompts={data} projectId={projectId} />
      ) : (
        <p className="text-gray-500">No prompts yet.</p>
      )}
    </div>
  );
}
