import { api } from "~/utils/api";

export function useDatasetItems(projectId?: string, datasetId?: string) {
  const utils = api.useUtils();

  const { data, isLoading } = api.datasetItems.list.useQuery(
    { projectId: projectId ?? "", datasetId: datasetId ?? "", limit: 50 },
    { enabled: !!projectId && !!datasetId }
  );

  const create = api.datasetItems.create.useMutation({
    onSuccess: () =>
      utils.datasetItems.list.invalidate({
        projectId: projectId ?? "",
        datasetId: datasetId ?? "",
      }),
  });

  const createMany = api.datasetItems.createMany.useMutation({
    onSuccess: () =>
      utils.datasetItems.list.invalidate({
        projectId: projectId ?? "",
        datasetId: datasetId ?? "",
      }),
  });

  const remove = api.datasetItems.delete.useMutation({
    onSuccess: () =>
      utils.datasetItems.list.invalidate({
        projectId: projectId ?? "",
        datasetId: datasetId ?? "",
      }),
  });

  return { items: data?.data ?? [], isLoading, create, createMany, remove };
}
