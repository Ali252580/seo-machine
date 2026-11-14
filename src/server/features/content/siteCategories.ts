import { load } from "cheerio";
import { z } from "zod";
import { readPublicText } from "@/server/lib/scrape";
import {
  sameSitePage,
  mergeDiscoveredPages,
  type DiscoveredClusterPage,
} from "@/shared/contentClusters";

const categoriesSchema = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    link: z.string(),
    parent: z.number(),
  }),
);
const postsSchema = z.array(
  z.object({
    link: z.string(),
    title: z.object({ rendered: z.string() }),
    categories: z.array(z.number()),
  }),
);
const plain = (html: string) => load(html).text().trim().slice(0, 180);
export function taxonomyPages(
  categories: unknown,
  posts: unknown,
  domain: string,
): DiscoveredClusterPage[] {
  const terms = categoriesSchema.safeParse(categories);
  const safe = (terms.success ? terms.data : []).filter((term) =>
    sameSitePage(term.link, domain),
  );
  const links = new Map(safe.map((term) => [term.id, term.link]));
  const pages: DiscoveredClusterPage[] = safe.map((term) => ({
    url: term.link,
    title: plain(term.name) || term.link,
    kind: "category",
    categoryLevel: term.parent === 0 ? "root" : "child",
    parentUrl: links.get(term.parent),
  }));
  const articles = postsSchema.safeParse(posts);
  if (articles.success)
    pages.push(
      ...articles.data
        .filter((post) => sameSitePage(post.link, domain))
        .map((post) => ({
          url: post.link,
          title: plain(post.title.rendered) || post.link,
          kind: "article" as const,
          categoryUrls: post.categories.flatMap((id) =>
            links.has(id) ? [links.get(id)!] : [],
          ),
        })),
    );
  return pages;
}

export function structureLinks(
  html: string,
  url: string,
  category = false,
): DiscoveredClusterPage[] {
  const $ = load(html);
  const pages: DiscoveredClusterPage[] = [];
  const selectors = category
    ? "article .entry-title a, article h2 a, article h3 a, .post-title a, .woocommerce-loop-product__link"
    : "nav a, header a, a[rel~=category]";
  $(selectors).each((_, element) => {
    const anchor = $(element);
    try {
      const target = new URL(anchor.attr("href") ?? "", url);
      target.hash = "";
      if (
        !sameSitePage(target.href, url) ||
        target.href === url ||
        target.search ||
        target.pathname === "/"
      )
        return;
      const title = anchor.text().replace(/\s+/g, " ").trim().slice(0, 180);
      if (!title) return;
      pages.push({
        url: target.href,
        title,
        ...(category
          ? { categoryUrls: [url] }
          : {
              kind:
                /\/(category|product-category)\//.test(target.pathname) ||
                /\bcategory\b/.test(anchor.attr("rel") ?? "")
                  ? ("category" as const)
                  : ("navigation" as const),
            }),
      });
    } catch {
      /* Ignore invalid and non-web navigation targets. */
    }
  });
  return mergeDiscoveredPages(pages).slice(0, 100);
}

export async function discoverSiteCategories(
  domain: string,
  known: DiscoveredClusterPage[] = [],
): Promise<DiscoveredClusterPage[]> {
  let root: string;
  try {
    root = new URL(domain.includes("://") ? domain : `https://${domain}`)
      .origin;
  } catch {
    return [];
  }
  const [categories, posts, home] = await Promise.all([
    readPublicText(
      `${root}/wp-json/wp/v2/categories?per_page=100&_fields=id,name,link,parent`,
    ),
    readPublicText(
      `${root}/wp-json/wp/v2/posts?per_page=100&_fields=link,title,categories`,
    ),
    readPublicText(`${root}/`),
  ]);
  let taxonomy: DiscoveredClusterPage[] = [];
  try {
    taxonomy = taxonomyPages(
      JSON.parse(categories ?? "null"),
      JSON.parse(posts ?? "null"),
      domain,
    );
  } catch {
    /* Non-WordPress sites and blocked REST endpoints use public HTML. */
  }
  const sitemapCategories = known
    .filter((page) =>
      /\/(category|product-category)\//.test(new URL(page.url).pathname),
    )
    .map((page) => ({ ...page, kind: "category" as const }));
  const pages = mergeDiscoveredPages([
    ...sitemapCategories,
    ...structureLinks(home ?? "", `${root}/`),
    ...taxonomy,
  ]);
  const archives = pages.filter((page) => page.kind === "category").slice(0, 8);
  const children = await Promise.all(
    archives.map(async (page) =>
      structureLinks((await readPublicText(page.url)) ?? "", page.url, true),
    ),
  );
  return mergeDiscoveredPages([...pages, ...children.flat()]);
}
