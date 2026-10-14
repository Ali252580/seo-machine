import { validateArticleHtml } from "@/server/features/wordpress/articleHtml";
import { z } from "zod";

const textWidget = z.object({
  widgetType: z.literal("text-editor"),
  settings: z.object({ editor: z.string() }),
});
const imageWidget = z.object({
  widgetType: z.literal("image"),
  settings: z.object({
    image: z.object({ id: z.number().int(), url: z.string().url() }),
  }),
});

function widget(
  id: string,
  widgetType: string,
  settings: Record<string, unknown>,
) {
  return {
    id,
    elType: "widget",
    widgetType,
    isInner: false,
    settings,
    elements: [],
  };
}

/** A portable Elementor template; importing it never replaces an existing page. */
export function buildElementorTemplate(input: {
  title: string;
  kind: "page" | "post";
  content: string;
  image?: { url: string; id: number };
}) {
  validateArticleHtml(input.content);
  if (!input.title.trim() || !input.content.trim())
    throw new Error("عنوان و متن مقاله لازم است.");
  // Elementor IDs must be unique when this template is inserted into another document.
  const elementId = () => crypto.randomUUID().replaceAll("-", "").slice(0, 8);
  return {
    title: input.title.trim(),
    type: input.kind,
    version: "0.4",
    page_settings: [],
    content: [
      {
        id: elementId(),
        elType: "container",
        isInner: false,
        settings: [],
        elements: [
          ...(input.image
            ? [
                widget(elementId(), "image", {
                  image: input.image,
                  image_size: "full",
                }),
              ]
            : []),
          widget(elementId(), "text-editor", { editor: input.content }),
        ],
      },
    ],
  };
}

/** Accept only this editor's small template subset, never discard unknown widgets. */
export function readElementorTemplate(json: string) {
  const value: unknown = JSON.parse(json);
  const template = z
    .object({
      title: z.string().min(1),
      type: z.enum(["page", "post"]),
      content: z.tuple([
        z.object({
          elType: z.literal("container"),
          elements: z.array(z.unknown()),
        }),
      ]),
    })
    .parse(value);
  const widgets = template.content[0].elements;
  if (![1, 2].includes(widgets.length))
    throw new Error("Unsupported Elementor widgets");
  const text = textWidget.safeParse(widgets.at(-1));
  if (!text.success) throw new Error("Unsupported Elementor text widget");
  const media = widgets.length === 2 ? imageWidget.safeParse(widgets[0]) : null;
  if (media && !media.success)
    throw new Error("Unsupported Elementor image widget");
  validateArticleHtml(text.data.settings.editor);
  return {
    title: template.title,
    kind: template.type,
    content: text.data.settings.editor,
    image: media?.success ? media.data.settings.image : null,
  };
}
