import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { PromptEditor } from "~/features/prompts/components/PromptEditor";
import { VersionLabels } from "~/features/prompts/components/VersionLabels";
import { useActiveProject } from "~/features/projects/hooks/useActiveProject";

export default function PromptDetailPage() {
  const router = useRouter();
  const name = typeof router.query.name === "string" ? router.query.name : "";
  const { projectId, isLoading: projectLoading } = useActiveProject();
  const utils = api.useUtils();

  const { data, isLoading } = api.prompts.detail.useQuery(
    { projectId: projectId || undefined, name },
    { enabled: !!projectId && !!name }
  );

  const createVersion = api.prompts.createVersion.useMutation({
    onSuccess: () =>
      utils.prompts.detail.invalidate({
        projectId: projectId || undefined,
        name,
      }),
  });

  const setLabel = api.prompts.setLabel.useMutation({
    onSuccess: () =>
      utils.prompts.detail.invalidate({
        projectId: projectId || undefined,
        name,
      }),
  });

  if (projectLoading || isLoading) return <div className="p-6">Loading…</div>;
  if (!data) return <div className="p-6">Prompt not found.</div>;

  const latestVersion = data.versions[0];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{data.name}</h1>
      <PromptEditor
        initialContent={latestVersion?.content ?? ""}
        onSave={(content) => createVersion.mutate({ name, content })}
        isSaving={createVersion.isPending}
      />
      <VersionLabels
        versions={data.versions}
        onSetLabel={(version, label) => setLabel.mutate({ name, version, label })}
      />
    </div>
  );
}
