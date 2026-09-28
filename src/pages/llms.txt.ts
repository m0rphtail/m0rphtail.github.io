import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { getPostUrl } from "@/utils/getPostPaths";
import config from "@/config";

/** Main content pages, in display order. Anything not listed is appended. */
const pageOrder = ["about", "resume", "art", "music"];

/** Site canonicals use trailing slashes; match them. */
const withTrailingSlash = (url: URL) =>
  url.href.endsWith("/") ? url.href : `${url.href}/`;

export const GET: APIRoute = async () => {
  const base = new URL(config.site.url);

  const posts = await getCollection("posts");
  const sortedPosts = getSortedPosts(posts);
  const postItems = sortedPosts
    .map(({ data, id, filePath }) => {
      const url = withTrailingSlash(
        new URL(getPostUrl(id, filePath, config.site.lang), base)
      );
      return `- [${data.title}](${url}): ${data.description}`;
    })
    .join("\n");

  const pages = await getCollection("pages");
  const rank = (id: string) => {
    const index = pageOrder.indexOf(id);
    return index === -1 ? pageOrder.length : index;
  };
  const pageItems = [...pages]
    .sort((a, b) => rank(a.id) - rank(b.id))
    .map(page => {
      const url = withTrailingSlash(new URL(`/${page.id}/`, base));
      const note = page.data.description ? `: ${page.data.description}` : "";
      return `- [${page.data.title}](${url})${note}`;
    })
    .join("\n");

  const optionalItems = [
    `- [RSS feed](${new URL("rss.xml", base)}): New posts in RSS 2.0 format.`,
    "- [GitHub](https://github.com/m0rphtail/): Code and projects.",
    "- [LinkedIn](https://linkedin.com/in/kshitijchitnis): Professional profile.",
    "- [X](https://x.com/MorphTail): @MorphTail.",
  ].join("\n");

  const body = `# ${config.site.title}

> ${config.site.description} The personal blog of ${config.site.author}.

Technical writing on malware analysis, reverse engineering, detection engineering, and CTF challenges. This index covers every published post.

## Pages

${pageItems}

## Posts

${postItems}

## Optional

${optionalItems}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
