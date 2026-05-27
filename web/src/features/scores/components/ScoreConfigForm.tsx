import { useState } from "react";

export function ScoreConfigForm({
  onSubmit,
}: {
  onSubmit: (data: {
    name: string;
    dataType: "NUMERIC" | "BOOLEAN" | "CATEGORICAL";
    description?: string;
    minValue?: number;
    maxValue?: number;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [dataType, setDataType] = useState<"NUMERIC" | "BOOLEAN" | "CATEGORICAL">("NUMERIC");
  const [description, setDescription] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      dataType,
      description: description || undefined,
      minValue: minValue !== "" ? Number(minValue) : undefined,
      maxValue: maxValue !== "" ? Number(maxValue) : undefined,
    });
    setName("");
    setDescription("");
    setMinValue("");
    setMaxValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input
          type="text"
          placeholder="Name (e.g. helpfulness)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
          required
        />
        <select
          value={dataType}
          onChange={(e) => setDataType(e.target.value as typeof dataType)}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="NUMERIC">Numeric</option>
          <option value="BOOLEAN">Boolean</option>
          <option value="CATEGORICAL">Categorical</option>
        </select>
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded border px-3 py-2 text-sm sm:col-span-2"
        />
        {dataType === "NUMERIC" && (
          <>
            <input
              type="number"
              placeholder="Min"
              value={minValue}
              onChange={(e) => setMinValue(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Max"
              value={maxValue}
              onChange={(e) => setMaxValue(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            />
          </>
        )}
      </div>
      <div className="mt-3">
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Create Config
        </button>
      </div>
    </form>
  );
}
