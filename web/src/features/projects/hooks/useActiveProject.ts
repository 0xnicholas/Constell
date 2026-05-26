import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

export function useActiveProject() {
  const sessionResult = useSession();
  const router = useRouter();
  const queryProjectId = router.query.projectId as string | undefined;

  const session = sessionResult?.data ?? null;
  const status = sessionResult?.status ?? "loading";

  const projectId = queryProjectId ?? session?.projectId ?? null;

  return { projectId, isLoading: status === "loading" };
}
