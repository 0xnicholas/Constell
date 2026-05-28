import { api } from "~/utils/api";

export function useDatasetRuns(projectId?: string, datasetId?: string) {
  const utils = api.useUtils();

  const { data, isLoading } = api.datasetRuns.list.useQuery(
    { projectId: projectId ?? "", datasetId: datasetId ?? "" },
    { enabled: !!projectId && !!datasetId }
  );

  const create = api.datasetRuns.create.useMutation({
    onSuccess: () => {
      utils.datasetRuns.list.invalidate({
        projectId: projectId ?? "",
        datasetId: datasetId ?? "",
      });
      utils.datasets.detail.invalidate({ projectId: projectId ?? "", id: datasetId ?? "" });
    },
  });

  const cancelRun = api.datasetRuns.cancel.useMutation({
    onSuccess: () =>
      utils.datasetRuns.list.invalidate({
        projectId: projectId ?? "",
        datasetId: datasetId ?? "",
      }),
  });

  const remove = api.datasetRuns.delete.useMutation({
    onSuccess: () =>
      utils.datasetRuns.list.invalidate({
        projectId: projectId ?? "",
        datasetId: datasetId ?? "",
      }),
  });

  const compare = (runIds: string[]) =>
    api.datasetRuns.compare.useQuery(
      { projectId: projectId ?? "", datasetId: datasetId ?? "", runIds },
      { enabled: !!projectId && !!datasetId && runIds.length >= 2 }
    );

  return { runs: data?.data ?? [], isLoading, create, cancelRun, remove, compare };
}
