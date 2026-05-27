import { useState } from "react";

export function EvalTemplateForm({
  onSubmit,
}: {
  onSubmit: (data: {
    name: string;
    description?: string;
    prompt: string;
    outputSchema?: Record<string, unknown>;
    scoreName: string;
    scoreDataType: "NUMERIC" | "BOOLEAN" | "CATEGORICAL";
    model?: string;
    temperature?: number;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState(
    'Rate the helpfulness of this response on a scale of 1-5.\n\nInput: {trace.input}\nOutput: {trace.output}\n\nRespond with JSON: {"score": number}'
  );
  const [scoreName, setScoreName] = useState("helpfulness");
  const [scoreDataType, setScoreDataType] = useState<"NUMERIC" | "BOOLEAN" | "CATEGORICAL">(
    "NUMERIC"
  );
  const [model, setModel] = useState("gpt-4o-mini");
  const [temperature, setTemperature] = useState("0");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description: description || undefined,
      prompt,
      outputSchema: { type: "number", path: "score" },
      scoreName,
      scoreDataType,
      model,
      temperature: Number(temperature),
    });
    setName("");
    setDescription("");
    setPrompt("");
    setScoreName("");
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input
          type="text"
          placeholder="Template name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
          required
        />
        <input
          type="text"
          placeholder="Score name (e.g. helpfulness)"
          value={scoreName}
          onChange={(e) => setScoreName(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
          required
        />
        <select
          value={scoreDataType}
          onChange={(e) => setScoreDataType(e.target.value as typeof scoreDataType)}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="NUMERIC">Numeric</option>
          <option value="BOOLEAN">Boolean</option>
          <option value="CATEGORICAL">Categorical</option>
        </select>
        <input
          type="text"
          placeholder="Model (e.g. gpt-4o-mini)"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        />
      </div>
      <div className="mt-2">
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>
      <div className="mt-2">
        <textarea
          placeholder="Prompt template..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
          rows={4}
          required
        />
        <p className="mt-1 text-xs text-gray-400">
          Variables: {"{trace.input}"}, {"{trace.output}"}, {"{trace.name}"}
        </p>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Temperature:</label>
          <input
            type="number"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="w-20 rounded border px-2 py-1 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Create Template
        </button>
      </div>
    </form>
  );
}
