import { useState } from "react";

export function DatasetForm({
  onSubmit,
}: {
  onSubmit: (data: { name: string; description: string }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim() });
    setName("");
    setDescription("");
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-lg border bg-gray-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Dataset name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded border px-3 py-2 text-sm"
          required
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-1 rounded border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Create
        </button>
      </div>
    </form>
  );
}
