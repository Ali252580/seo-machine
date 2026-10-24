import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ProjectContentEditor } from "@/client/features/content/ProjectContentEditor";

export const Route = createFileRoute("/_project/p/$projectId/content")({
  validateSearch: z.object({
    page: z
      .string()
      .url()
      .refine((value) => /^https?:\/\//i.test(value))
      .optional(),
    title: z.string().optional(),
  }),
  component: ContentEditor,
});

function ContentEditor() {
  const { projectId } = Route.useParams();
  const { page, title } = Route.useSearch();
  // A project switch must remount the draft state before local storage can write.
  return (
    <ProjectContentEditor
      key={`${projectId}:${page ?? ""}`}
      projectId={projectId}
      targetPage={page}
      suggestedTitle={title}
    />
  );
}
