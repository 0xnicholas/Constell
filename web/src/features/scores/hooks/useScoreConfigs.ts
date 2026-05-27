import { api } from "~/utils/api";

export function useScoreConfigs() {
  const utils = api.useUtils();
  const { data, isLoading } = api.scores.configList.useQuery({});

  const create = api.scores.configCreate.useMutation({
    onSuccess: () => utils.scores.configList.invalidate(),
  });

  const update = api.scores.configUpdate.useMutation({
    onSuccess: () => utils.scores.configList.invalidate(),
  });

  const remove = api.scores.configDelete.useMutation({
    onSuccess: () => utils.scores.configList.invalidate(),
  });

  return {
    configs: data ?? [],
    isLoading,
    create,
    update,
    remove,
  };
}
