import { useScoreConfigs } from "~/features/scores/hooks/useScoreConfigs";
import { ScoreConfigTable } from "~/features/scores/components/ScoreConfigTable";
import { ScoreConfigForm } from "~/features/scores/components/ScoreConfigForm";

export default function ScoreConfigsPage() {
  const { configs, isLoading, create, remove } = useScoreConfigs();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Score Configs</h1>
      <ScoreConfigForm onSubmit={(data) => create.mutate(data)} />
      {isLoading ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <ScoreConfigTable configs={configs} onDelete={(id) => remove.mutate({ id })} />
      )}
    </div>
  );
}
