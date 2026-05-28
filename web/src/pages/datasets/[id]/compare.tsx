import { useState } from "react";
import { useRouter } from "next/router";
import { useActiveProject } from "~/features/projects/hooks/useActiveProject";
import { useDatasetRuns } from "~/features/datasets/hooks/useDatasetRuns";

type RunInfo = { id: string; name: string; status: string; metadata: unknown };
type ScoreInfo = { name: string; value: number; stringValue: string | null };
type RunData = { traceId: string; scores: ScoreInfo[] };
type CompareItem = {
  id: string;
  input: unknown;
  expectedOutput: unknown;
  runs: Record<string, RunData>;
};

export default function ComparePage() {
  const router = useRouter();
  const { projectId } = useActiveProject();
  const datasetId = String(router.query.id);
  const {
    runs,
    isLoading: runsLoading,
    compare,
  } = useDatasetRuns(projectId ?? undefined, datasetId);
  const [selectedRuns, setSelectedRuns] = useState<string[]>([]);

  const { data: compareDataRaw, isLoading: compareLoading } = compare(selectedRuns);
  const compareData = compareDataRaw as
    | {
        datasetItems: CompareItem[];
        runs: RunInfo[];
      }
    | undefined;

  const toggleRun = (id: string) => {
    if (selectedRuns.includes(id)) {
      setSelectedRuns(selectedRuns.filter((r) => r !== id));
    } else if (selectedRuns.length < 5) {
      setSelectedRuns([...selectedRuns, id]);
    }
  };

  return (
    <div className="mx-auto max-w-full px-4 py-6">
      <a href={`/datasets/${datasetId}`} className="text-sm text-gray-500 hover:underline">
        ← Back to dataset
      </a>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">Compare Runs</h1>

      <div className="mt-4">
        <p className="text-sm text-gray-500">Select 2-5 runs to compare:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {runsLoading ? (
            <span className="text-sm text-gray-400">Loading runs…</span>
          ) : (
            runs.map((run: { id: string; name: string }) => (
              <button
                key={run.id}
                onClick={() => toggleRun(run.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  selectedRuns.includes(run.id)
                    ? "bg-gray-900 text-white"
                    : "border bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {run.name}
              </button>
            ))
          )}
        </div>
      </div>

      {compareLoading && <div className="mt-6 text-gray-500">Loading comparison…</div>}

      {compareData && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 bg-gray-50 border p-2 text-left text-gray-700">
                  Input
                </th>
                <th className="border p-2 text-left text-gray-700">Expected</th>
                {compareData.runs.map((run) => (
                  <th key={run.id} className="border p-2 text-left text-gray-700">
                    {run.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareData.datasetItems.map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="sticky left-0 bg-white border p-2 align-top">
                    <pre className="max-h-24 overflow-auto text-xs text-gray-600">
                      {JSON.stringify(item.input, null, 2)}
                    </pre>
                  </td>
                  <td className="border p-2 align-top">
                    {item.expectedOutput != null && (
                      <pre className="max-h-24 overflow-auto text-xs text-gray-600">
                        {JSON.stringify(item.expectedOutput, null, 2)}
                      </pre>
                    )}
                  </td>
                  {compareData.runs.map((run) => {
                    const runData = item.runs?.[run.id];
                    const score = runData?.scores?.[0];
                    const scoreColor = score
                      ? score.value >= 0.8
                        ? "text-green-600"
                        : score.value >= 0.5
                          ? "text-yellow-600"
                          : "text-red-600"
                      : "";
                    return (
                      <td key={run.id} className="border p-2 align-top text-xs">
                        {runData ? (
                          <div className="space-y-1">
                            {score && (
                              <div className={scoreColor}>
                                {score.name}: {score.stringValue ?? score.value.toFixed(2)}
                              </div>
                            )}
                            <a
                              href={`/traces/${runData.traceId}`}
                              className="block text-blue-600 hover:underline"
                            >
                              View Trace →
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
