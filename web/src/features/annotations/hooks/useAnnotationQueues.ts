import { api } from "~/utils/api";

export function useAnnotationQueues() {
  const utils = api.useUtils();
  const { data, isLoading } = api.annotations.queueList.useQuery({});

  const create = api.annotations.queueCreate.useMutation({
    onSuccess: () => utils.annotations.queueList.invalidate(),
  });

  const remove = api.annotations.queueDelete.useMutation({
    onSuccess: () => utils.annotations.queueList.invalidate(),
  });

  return {
    queues: data ?? [],
    isLoading,
    create,
    remove,
  };
}
