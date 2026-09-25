# kchitnis.com

Personal site for Kshitij Chitnis. Blog posts now, with resume/art/music pages to come. Built with [Astro](https://astro.build) on the [AstroPaper](https://github.com/satnaing/astro-paper) theme.

Status: migration in progress. This branch (`clean-astro-migration`) is not live yet. The old Zola site still serves from `main` until the migration is finished and merged.

## Quick start

Node 22.12 or newer required.

```bash
npm install          # install dependencies
npm run dev          # dev server at http://localhost:4321 (bound to LAN too)
npm run build        # type check + build + search index, output in dist/
npm run preview      # serve the built site locally
```

On the Pi, prefer the background dev server:

```bash
npx astro dev --background
npx astro dev status
npx astro dev logs
npx astro dev stop
```

The dev server binds all interfaces, so it is reachable from other devices on the network at `http://192.168.1.16:4321`.

## Project structure

```
public/                 Static files, copied as-is to the site root
  CNAME                 Custom domain (kchitnis.com)
  favicon.ico           Tab icon (KC mark, from the old site)
src/
  assets/
    icons/              UI icons and socials/*.svg used by the theme
    images/             Images imported by pages (theme art lives here)
  components/           Reusable UI pieces (Header, Footer, Card, Tag, ...)
  content/
    pages/              Standalone pages (about.md)
    posts/              Blog posts (all your content lives here)
  i18n/                 UI strings, English text in lang/en.ts
  layouts/              Page shells (Layout.astro, PostLayout.astro)
  pages/                Routes: home, /posts, /tags, /search, /about,
                        /404, rss.xml, robots.txt, og.png
  scripts/              Theme toggle logic
  styles/
    theme.css           COLORS live here
    global.css          Base styles
    typography.css      Prose styles for post content
  types/                Type definitions for the config
  utils/                Helpers: sorting, slug rules, tags, etc.
astro-paper.config.ts   MAIN SETTINGS: title, URL, socials, features
astro.config.ts         Astro setup: integrations, markdown, fonts
package.json            Scripts and dependencies
AGENTS.md               Notes for AI agents working in this repo
.github/                Theme's CI + community files (unused for deploys)
Dockerfile, compose.yaml  Theme extras, not used here
```

Content folders starting with `_` (like `_releases/`) are for organization only: their name is dropped from URLs, but the posts inside are still published.

## Where to change things

| I want to change...            | Edit this                                      |
| ------------------------------ | ---------------------------------------------- |
| Site title, URL, description   | `astro-paper.config.ts` under `site:`          |
| Social icons (header/footer)   | `astro-paper.config.ts` under `socials:`       |
| Share buttons on posts         | `astro-paper.config.ts` under `shareLinks:`    |
| Posts per page / on homepage   | `astro-paper.config.ts` under `posts:`         |
| Search, back button, edit link | `astro-paper.config.ts` under `features:`      |
| Site colors, light and dark    | `src/styles/theme.css`                         |
| Font                           | `astro.config.ts` under `fonts:`               |
| Nav menu items                 | `src/components/Header.astro` (hardcoded list) |
| Favicon                        | `public/favicon.ico`                           |
| Domain                         | `public/CNAME`                                 |
| Footer text                    | `src/i18n/lang/en.ts` under `footer:`          |
| About page                     | `src/content/pages/about.md`                   |
| Homepage intro text            | `src/pages/index.astro`                        |

## Writing posts

Create a markdown (`.md`) or MDX (`.mdx`) file in `src/content/posts/`. The filename becomes the URL: `my-post.md` becomes `/posts/my-post/`.

To override the URL, set `slug:` in the frontmatter. To keep a post out of the site entirely, set `draft: true`. Posts also stay hidden until their `pubDatetime` passes (with a 15 minute grace period); in dev mode everything non-draft shows immediately.

Subfolders become part of the URL (`2026/my-post.md` becomes `/posts/2026/my-post/`). Prefix the folder with `_` to organize without affecting the URL.

Frontmatter fields:

```yaml
---
title: "Post title" # required
description: "One-line summary" # required
pubDatetime: 2026-09-25T10:00:00+05:30 # required, full timestamp
modDatetime: 2026-09-26T10:00:00+05:30 # optional, shows "Updated"
tags: ["security", "malware"] # optional, defaults to ["others"]
featured: false # true pins it to the homepage "Featured"
draft: false
ogImage: "assets/og.png" # optional, relative to the post file
canonicalURL: "https://..." # optional, if originally published elsewhere
---
```

Images: either drop files in `public/` and reference them as `/image.png`, or keep them next to the post and reference them relatively. Markdown image syntax works normally.

## Colors, fonts, nav

Colors are six CSS variables per theme (`--background`, `--foreground`, `--accent`, `--accent-foreground`, `--muted`, `--muted-foreground`, `--border`) in `src/styles/theme.css`. Current setup is the theme's "Paper Light" for light mode and the older "Paper Dark" cyan scheme for dark mode. More ready-made palettes are documented in `src/content/posts/_color-schemes/`.

Font is set in `astro.config.ts`. The nav menu in `src/components/Header.astro` is hardcoded to Posts / Tags / About. Resume, art and music are not in it yet; those need both a route and a nav entry when they come back.

## Search

Search uses [Pagefind](https://pagefind.app/), which indexes the built site. Run `npm run build` at least once before the search page works in dev; the page shows a reminder otherwise.

Pagefind is pinned to `1.5.0` on purpose. Newer versions crash on this Raspberry Pi with a jemalloc page-size error (the Pi uses 16K pages). Do not bump it without testing; older versions work fine on normal x86 CI runners too.

## Deployment

GitHub Pages serves this repo from the `gh-pages` branch, with the custom domain set by `public/CNAME`. HTTPS is enforced and the certificate is managed by GitHub.

At the moment `gh-pages` is built from the old Zola site on `main`. This branch has no deploy workflow yet. When the migration is ready: merge to `main`, then add a GitHub Actions workflow that builds with npm and publishes `dist/` to `gh-pages`. Until then, nothing here is live.

The edit-post link on posts points at `main` (configured in `astro-paper.config.ts`), so "Edit page" starts working once the migration is merged.

## Porting posts from the old blog

The old site's posts were converted to this format once, but only the good ones should come over. The full conversion is preserved outside the repo:

- `~/backups/old-migration-2026-09-25/astro-migration.bundle` (git bundle with all 35 converted posts)
- `~/backups/old-migration-2026-09-25/post-manifest.txt` (list of every converted post: file, title, date)
- `~/backups/old-migration-2026-09-25/staged-full.patch` (fallback, patch against commit `79a8bf2`)

To bring one post over:

```bash
# one-time: pull the snapshot back into the repo
git fetch ~/backups/old-migration-2026-09-25/astro-migration.bundle astro-migration:old-migration

# copy a post you want
git show old-migration:src/content/posts/fakegit-luajit-loader.md \
  > src/content/posts/fakegit-luajit-loader.md

# if the post references images, they live in the snapshot's public/
git show old-migration:public/fakegit-01-readme-lure.png \
  > public/fakegit-01-readme-lure.png

# when done picking, drop the scratch branch
git branch -D old-migration
```

Old posts that reference `/images/...` or `/shot-*.png` need their images copied from the same snapshot's `public/` folder.

## Theme demo content

The site currently still contains the theme's own blog posts and docs (how-to guides, release notes, color scheme docs, examples). They build into the site. They are useful as reference now; delete them when the site is ready to go live:

- `src/content/posts/how-to-*.md(x)`, `adding-new-post.mdx`, `setting-dates-via-git-hooks.md`, `dynamic-og-images.md`, `customizing-astropaper-theme-color-schemes.mdx`
- `src/content/posts/examples/`, `_releases/`, `_color-schemes/`

The `about` page is also still the theme's copy, waiting for your text.

## Theme

AstroPaper by [Sat Naing](https://satnaing.dev), MIT licensed. Its full documentation lives in the theme posts listed above and at <https://astro-paper.pages.dev/>.
