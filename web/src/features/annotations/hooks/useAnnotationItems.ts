import { api } from "~/utils/api";

export function useAnnotationItems(queueId: string) {
  const utils = api.useUtils();
  const { data, isLoading } = api.annotations.itemList.useQuery(
    { queueId },
    { enabled: !!queueId }
  );

  const assign = api.annotations.itemAssign.useMutation({
    onSuccess: () => utils.annotations.itemList.invalidate(),
  });

  const annotate = api.annotations.itemAnnotate.useMutation({
    onSuccess: () => utils.annotations.itemList.invalidate(),
  });

  const review = api.annotations.itemReview.useMutation({
    onSuccess: () => utils.annotations.itemList.invalidate(),
  });

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    assign,
    annotate,
    review,
  };
}
