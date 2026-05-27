import { api } from "~/utils/api";

export function useEvalTemplates() {
  const utils = api.useUtils();
  const { data, isLoading } = api.evals.templateList.useQuery({});

  const create = api.evals.templateCreate.useMutation({
    onSuccess: () => utils.evals.templateList.invalidate(),
  });

  const remove = api.evals.templateDelete.useMutation({
    onSuccess: () => utils.evals.templateList.invalidate(),
  });

  return {
    templates: data ?? [],
    isLoading,
    create,
    remove,
  };
}
