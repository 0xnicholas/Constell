import { api } from "~/utils/api";

export function useDatasetRunPresets(projectId?: string) {
  const utils = api.useUtils();

  const { data, isLoading } = api.datasetRunPresets.list.useQuery(
    { projectId: projectId ?? "" },
    { enabled: !!projectId }
  );

  const create = api.datasetRunPresets.create.useMutation({
    onSuccess: () => utils.datasetRunPresets.list.invalidate({ projectId: projectId ?? "" }),
  });

  const update = api.datasetRunPresets.update.useMutation({
    onSuccess: () => utils.datasetRunPresets.list.invalidate({ projectId: projectId ?? "" }),
  });

  const remove = api.datasetRunPresets.delete.useMutation({
    onSuccess: () => utils.datasetRunPresets.list.invalidate({ projectId: projectId ?? "" }),
  });

  return { presets: data ?? [], isLoading, create, update, remove };
}
