import { api } from "~/utils/api";
import { ScoreList } from "~/features/scores/components/ScoreList";

export default function ScoresPage() {
  const { data, isLoading } = api.scores.list.useQuery({ limit: 50, offset: 0 });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Scores</h1>
      </div>

      {isLoading ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <ScoreList scores={data?.scores ?? []} />
      )}
    </div>
  );
}
