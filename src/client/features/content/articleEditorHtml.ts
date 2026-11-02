import { parseDocument } from "htmlparser2";

const allowed = new Set([
  "h2",
  "h3",
  "p",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "br",
]);
type Node = ReturnType<typeof parseDocument>["children"][number];

export function canEditArticleVisually(html: string) {
  const tags = html.match(/<[^>]*>/g) ?? [];
  return (
    tags.every((tag) =>
      /^<\/?(?:h2|h3|p|ul|ol|li|strong|em|br)>$/i.test(tag),
    ) && !/[<>]/.test(html.replace(/<[^>]*>/g, ""))
  );
}

export function normalizeEditorHtml(html: string): string {
  function render(node: Node): string {
    if (node.type === "text")
      return node.data
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    if (node.type !== "tag") return "";
    if (node.name === "span") return node.children.map(render).join("");
    const name =
      ({ div: "p", b: "strong", i: "em" } as Record<string, string>)[
        node.name
      ] ?? node.name;
    if (!allowed.has(name)) return "";
    if (name === "br") return "<br>";
    return `<${name}>${node.children.map(render).join("")}</${name}>`;
  }
  return parseDocument(html).children.map(render).join("");
}
