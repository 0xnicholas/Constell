export interface ModelRow {
  model: string;
  generationCount: number;
  inputTokens: number;
  outputTokens: number;
  cost: string;
}

export function ModelTable({ models }: { models: ModelRow[] }) {
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="px-4 py-2 font-medium">Model</th>
            <th className="px-4 py-2 font-medium">Generations</th>
            <th className="px-4 py-2 font-medium">Tokens</th>
            <th className="px-4 py-2 font-medium">Cost</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.model} className="border-t">
              <td className="px-4 py-2">{m.model}</td>
              <td className="px-4 py-2">{m.generationCount.toLocaleString()}</td>
              <td className="px-4 py-2">{(m.inputTokens + m.outputTokens).toLocaleString()}</td>
              <td className="px-4 py-2">${m.cost}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
