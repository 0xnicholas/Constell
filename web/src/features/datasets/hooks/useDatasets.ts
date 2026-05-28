import { api } from "~/utils/api";

export function useDatasets(projectId?: string, search?: string, page = 0, limit = 20) {
  const utils = api.useUtils();

  const { data, isLoading } = api.datasets.list.useQuery(
    { projectId: projectId ?? "", search, page, limit },
    { enabled: !!projectId }
  );

  const create = api.datasets.create.useMutation({
    onSuccess: () => utils.datasets.list.invalidate(),
  });

  const update = api.datasets.update.useMutation({
    onSuccess: () => utils.datasets.list.invalidate(),
  });

  const remove = api.datasets.delete.useMutation({
    onSuccess: () => utils.datasets.list.invalidate(),
  });

  const detail = (id: string) =>
    api.datasets.detail.useQuery(
      { projectId: projectId ?? "", id },
      { enabled: !!projectId && !!id }
    );

  return { datasets: data, isLoading, create, update, remove, detail };
}
