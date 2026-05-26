import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

export function useActiveProject() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryProjectId = router.query.projectId as string | undefined;

  const projectId = queryProjectId ?? session?.projectId ?? null;

  return { projectId, isLoading: status === "loading" };
}
