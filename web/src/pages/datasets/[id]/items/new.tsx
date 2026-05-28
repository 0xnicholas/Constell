import { useState } from "react";
import { useRouter } from "next/router";
import { useActiveProject } from "~/features/projects/hooks/useActiveProject";
import { useDatasetItems } from "~/features/datasets/hooks/useDatasetItems";

export default function NewDatasetItemPage() {
  const router = useRouter();
  const { projectId } = useActiveProject();
  const datasetId = String(router.query.id);
  const { create } = useDatasetItems(projectId ?? undefined, datasetId);
  const [inputJson, setInputJson] = useState("");
  const [expectedJson, setExpectedJson] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    let input;
    try {
      input = inputJson ? JSON.parse(inputJson) : undefined;
    } catch {
      setError("Invalid JSON in input field");
      return;
    }
    let expectedOutput;
    try {
      expectedOutput = expectedJson ? JSON.parse(expectedJson) : undefined;
    } catch {
      setError("Invalid JSON in expected output field");
      return;
    }

    if (!projectId) return;
    await create.mutateAsync({
      projectId,
      datasetId,
      input,
      expectedOutput,
    });
    router.push(`/datasets/${datasetId}`);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <a href={`/datasets/${datasetId}`} className="text-sm text-gray-500 hover:underline">
        ← Back to dataset
      </a>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">New Dataset Item</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Input (JSON object)</label>
          <textarea
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            placeholder='{"question": "What is 2+2?", "context": ""}'
            className="mt-1 w-full rounded border px-3 py-2 font-mono text-sm"
            rows={6}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Expected Output (JSON, optional)
          </label>
          <textarea
            value={expectedJson}
            onChange={(e) => setExpectedJson(e.target.value)}
            placeholder='{"answer": "4"}'
            className="mt-1 w-full rounded border px-3 py-2 font-mono text-sm"
            rows={4}
          />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {create.isPending ? "Creating…" : "Create Item"}
        </button>
      </form>
    </div>
  );
}
