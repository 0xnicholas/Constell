import { useState } from "react";
import { api } from "~/utils/api";

export function QueueForm({
  onSubmit,
}: {
  onSubmit: (data: { name: string; description?: string; scoreConfigId?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scoreConfigId, setScoreConfigId] = useState("");

  const { data: configs } = api.scores.configList.useQuery({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description: description || undefined,
      scoreConfigId: scoreConfigId || undefined,
    });
    setName("");
    setDescription("");
    setScoreConfigId("");
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input
          type="text"
          placeholder="Queue name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
          required
        />
        <select
          value={scoreConfigId}
          onChange={(e) => setScoreConfigId(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">No score config</option>
          {(configs ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.dataType})
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded border px-3 py-2 text-sm sm:col-span-2"
        />
      </div>
      <div className="mt-3">
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Create Queue
        </button>
      </div>
    </form>
  );
}
