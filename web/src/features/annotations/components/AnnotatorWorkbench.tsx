import { useState } from "react";
import { api } from "~/utils/api";

interface Assignment {
  itemId: string;
  queueName: string;
  traceId: string;
  status: string;
}

export function AnnotatorWorkbench({
  assignments,
  onAnnotate,
  onSkip,
}: {
  assignments: Assignment[];
  onAnnotate: (
    itemId: string,
    data: { scoreValue?: number; stringValue?: string; comment?: string }
  ) => void;
  onSkip: (itemId: string) => void;
}) {
  const pending = assignments.filter((a) => a.status === "ASSIGNED");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scoreValue, setScoreValue] = useState("");
  const [stringValue, setStringValue] = useState("");
  const [comment, setComment] = useState("");

  const current = pending[currentIndex];
  const { data: traceData } = api.traces.detail.useQuery(
    { traceId: current?.traceId ?? "" },
    { enabled: !!current }
  );

  if (!current) {
    return (
      <div className="rounded-lg border bg-white p-8 shadow-sm text-center text-gray-500">
        🎉 All assignments completed! Check back later for new items.
      </div>
    );
  }

  const handleSubmit = () => {
    onAnnotate(current.itemId, {
      scoreValue: scoreValue !== "" ? Number(scoreValue) : undefined,
      stringValue: stringValue || undefined,
      comment: comment || undefined,
    });
    setScoreValue("");
    setStringValue("");
    setComment("");
    setCurrentIndex((i) => i + 1);
  };

  const handleSkip = () => {
    onSkip(current.itemId);
    setCurrentIndex((i) => i + 1);
  };

  const trace = traceData?.trace;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">
            Trace Detail ({currentIndex + 1}/{pending.length})
          </h2>
          <span className="text-xs text-gray-400">{current.queueName}</span>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-gray-500 text-xs mb-1">ID</div>
            <div className="font-mono text-xs">{current.traceId}</div>
          </div>
          {trace?.observations && trace.observations.length > 0 && (
            <div>
              <div className="text-gray-500 text-xs mb-1">
                Observations ({trace.observations.length})
              </div>
              <div className="space-y-2">
                {trace.observations
                  .slice(0, 3)
                  .map(
                    (obs: {
                      id: string;
                      name?: string | null;
                      input?: string | null;
                      output?: string | null;
                    }) => (
                      <div key={obs.id} className="rounded bg-gray-50 p-2 text-xs">
                        <div className="font-medium">{obs.name ?? obs.id.slice(0, 8)}</div>
                        {obs.input && (
                          <div className="mt-1 text-gray-500 truncate">
                            In: {obs.input.slice(0, 100)}
                          </div>
                        )}
                        {obs.output && (
                          <div className="mt-1 text-gray-500 truncate">
                            Out: {obs.output.slice(0, 100)}
                          </div>
                        )}
                      </div>
                    )
                  )}
              </div>
            </div>
          )}
          {!trace && <div className="text-gray-400 text-xs">Loading trace...</div>}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-gray-700">Annotation</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Score Value</label>
            <input
              type="number"
              value={scoreValue}
              onChange={(e) => setScoreValue(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="Enter score..."
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category (optional)</label>
            <input
              type="text"
              value={stringValue}
              onChange={(e) => setStringValue(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="Categorical value..."
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
              rows={3}
              placeholder="Why this score?"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Submit
            </button>
            <button
              onClick={handleSkip}
              className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
