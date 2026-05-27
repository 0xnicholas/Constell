import { api } from "~/utils/api";

export function useEvalRuns() {
  const utils = api.useUtils();
  const { data, isLoading } = api.evals.runList.useQuery({});

  const create = api.evals.runCreate.useMutation({
    onSuccess: () => utils.evals.runList.invalidate(),
  });

  const cancel = api.evals.runCancel.useMutation({
    onSuccess: () => utils.evals.runList.invalidate(),
  });

  return {
    runs: data?.runs ?? [],
    total: data?.total ?? 0,
    isLoading,
    create,
    cancel,
  };
}
