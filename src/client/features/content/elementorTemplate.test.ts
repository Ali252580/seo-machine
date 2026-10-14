import { expect, it } from "vitest";
import {
  buildElementorTemplate,
  readElementorTemplate,
} from "./elementorTemplate";

it("exports editable Elementor widgets without executable markup", () => {
  const template = buildElementorTemplate({
    title: "راهنمای تعمیر",
    kind: "post",
    content: "<h2>نشانه‌ها</h2><p>متن نمونه</p>",
    image: { id: 42, url: "https://example.com/uploads/example.png" },
  });
  expect(template.content[0].elements.map((item) => item.widgetType)).toEqual([
    "image",
    "text-editor",
  ]);
  expect(template.type).toBe("post");
  expect(
    new Set([
      template.content[0].id,
      ...template.content[0].elements.map((item) => item.id),
    ]).size,
  ).toBe(3);
  expect(readElementorTemplate(JSON.stringify(template))).toMatchObject({
    kind: "post",
    image: { id: 42 },
  });
  expect(() =>
    readElementorTemplate(
      JSON.stringify({
        ...template,
        content: [
          {
            ...template.content[0],
            elements: [
              ...template.content[0].elements,
              { widgetType: "button" },
            ],
          },
        ],
      }),
    ),
  ).toThrow();
  expect(() =>
    buildElementorTemplate({
      title: "ناامن",
      kind: "page",
      content: "<script>alert(1)</script>",
    }),
  ).toThrow();
});
