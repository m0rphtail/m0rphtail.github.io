# kchitnis.com

Personal site for Kshitij Chitnis. Blog posts, resume, art, and music pages. Built with [Astro](https://astro.build) on the [AstroPaper](https://github.com/satnaing/astro-paper) theme.

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
  favicon.ico           Tab icon, 3 sizes (16/32/48) from the blue mark
  favicon-16x16.png     Same mark as PNG (16 and 32 px)
  favicon-32x32.png
  apple-touch-icon.png  iOS home-screen icon (180px)
  android-chrome-*.png  Android/PWA icons (192, 512)
  site.webmanifest      PWA manifest (icon list, theme colours)
src/
  assets/
    icons/              UI icons and socials/*.svg used by the theme
    images/             Images imported by pages (hero, about, art gallery)
  components/           Reusable UI pieces (Header, Footer, Card, ...)
  content/
    pages/              Standalone pages (about.mdx, art.mdx, music.md)
    posts/              Blog posts (all your content lives here)
  i18n/                 UI strings, English text in lang/en.ts
  layouts/              Page shells (Layout.astro, PostLayout.astro)
  pages/                Routes: home, /posts, /art, /music, /about, /search,
                        /404, rss.xml, robots.txt, og.png
                        ([page].astro serves art/music/any new content page)
  scripts/              Theme toggle logic
  styles/
    theme.css           COLORS live here
    global.css          Base styles
    typography.css      Prose styles for post content
  types/                Type definitions for the config
  utils/                Helpers: sorting, slug rules, etc.
.github/                CI workflow (.github/workflows/ci.yml)
astro-paper.config.ts   MAIN SETTINGS: title, URL, socials, features
astro.config.ts         Astro setup: integrations, markdown, fonts
package.json            Scripts and dependencies
AGENTS.md               Notes for AI agents working in this repo
```

Content folders starting with `_` are for organization only: their name is dropped from URLs, but the posts inside are still published. (None are used right now.)

## Where to change things

| I want to change...            | Edit this                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| Site title, URL, description   | `astro-paper.config.ts` under `site:`                                                   |
| Social icons (header/footer)   | `astro-paper.config.ts` under `socials:`                                                |
| Share buttons on posts         | `astro-paper.config.ts` under `shareLinks:`                                             |
| Posts per page / on homepage   | `astro-paper.config.ts` under `posts:`                                                  |
| Search, back button            | `astro-paper.config.ts` under `features:`                                               |
| Site colors, light and dark    | `src/styles/theme.css`                                                                  |
| Code-block colors              | `astro.config.ts` under `shikiConfig:` — except the dark panel, see "Code blocks" below |
| Font                           | `astro.config.ts` under `fonts:`                                                        |
| Nav menu items                 | `src/components/Header.astro` (hardcoded list)                                          |
| Favicon + icons                | `public/` (see "Favicon" below)                                                         |
| Domain                         | `public/CNAME`                                                                          |
| Footer text                    | `src/i18n/lang/en.ts` under `footer:`                                                   |
| About page                     | `src/content/pages/about.mdx` (image in `src/assets/images/about/`)                     |
| Resume page                    | `src/content/pages/resume.md`                                                           |
| Art page (gallery)             | `src/content/pages/art.mdx`                                                             |
| Music page (players)           | `src/content/pages/music.md`                                                            |
| Homepage intro text + hero art | `src/pages/index.astro` (hero image lives in `src/assets/images/home/`)                 |

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

Images: put post images in `src/assets/images/posts/` and reference them as `![alt text](@/assets/images/posts/my-image.png)`. Astro then optimizes them (hashed `.webp`, lazy loading, width/height set). Images in `public/` are served raw and unoptimized — avoid for content images. Every image needs real alt text (empty alt gets flagged).

Headings: the frontmatter `title` renders as the page h1, so start body headings at `##` and nest down. A stray `#` in the body breaks the outline.

Verbatim evidence (malware samples, obfuscated code): prettier reformats fenced code when it recognizes the language. If a fence must stay byte-exact, put `<!-- prettier-ignore -->` on the line directly above the opening fence. Applied in the fakegit and js-obfuscation posts.

Table of contents: put `## Table of contents` right after the intro, before the first section. The theme's `remark-toc` (configured in `astro.config.ts`) fills the heading at build time with links to every `##` and `###` below it, and `remark-collapse` wraps the list in a collapsible "Open Table of contents" block. Nothing else is needed — no manual list to maintain. Every post in the tree has one (the tiny CTF writeups use bold text for the flag line, not a heading, so flags can't leak into their TOC).

## Colors, fonts, nav

Colors are seven CSS variables per theme (`--background`, `--foreground`, `--accent`, `--accent-foreground`, `--muted`, `--muted-foreground`, `--border`) in `src/styles/theme.css`. Both modes are blue-accented: light is warm paper `#f9f5ee` with `#006cac` links, dark is grey `#2f2f2f` with `#4db8f0` links and blue-grey borders. Code blocks follow the shiki themes set in `astro.config.ts`, except the dark panel background, which `theme.css` forces to grey `#262626` with a `--shiki-dark-bg` override (shiki sets that variable inline on every `<pre>`, so the override carries `!important`).

Font is set in `astro.config.ts`. The nav menu in `src/components/Header.astro` is hardcoded (Blogs / Resume / Art / Music / About). Add new entries there when new pages arrive.

### Code blocks

Syntax colors come from the shiki themes in `astro.config.ts` (`shikiConfig.themes`). The dark-mode panel background is the exception: shiki writes `--shiki-dark-bg` inline on every `<pre>`, so `theme.css` overrides it with `!important` to keep the panel grey `#262626` (matching the grey page). To change the dark panel, edit that one rule in `theme.css`; to change token colors in both modes, edit the shiki themes.

## Tags

The site runs without a tag UI: no /tags pages, no tag chips on posts, no nav link. Search covers finding posts. New posts can still carry `tags:` in the frontmatter — the field is optional and simply unused by the UI.

If tags are ever wanted back: `~/backups/old-migration-2026-09-25/removed-tag-feature/` holds the removed files (tag pages, Tag component, getUniqueTags util) plus a README with exact restore steps.

## Resume, art, and music pages

All three are content-collection pages served by `src/pages/[page].astro` — drop any new `.md`/`.mdx` file in `src/content/pages/` (except about, which has its own route) and it gets a route and breadcrumb automatically. Add a nav entry in `Header.astro` if it warrants one.

The resume (`src/content/pages/resume.md`) is plain markdown: `##` sections, `###` entries, `---` rules between sections. Note the frontmatter `title` renders as the page h1, so job/project entries sit at `###` — don't jump straight to `#`. Same content as the old Zola site's `/resume` page.

The art gallery (`src/content/pages/art.mdx`) uses Astro's `<Image>` component, so images live in `src/assets/images/art/` and are served hashed. Each needs real alt text. To add a piece: drop the file in that folder, add an import and an `<Image>` line.

Loading convention (keeps the dev-toolbar Audit panel clean): images sit in a single column, so how many are above the fold depends on window height. The Astro audit flags any _lazy_ image whose top edge is above the fold. Current setup:

- First image: `priority` — loads eager + `fetchpriority="high"` (it's the LCP candidate; only one image per page should have this).
- Second image: `loading="eager"` — also starts above the fold at typical laptop sizes (its top sits ~656px down).
- Everything after: default lazy.

If you reorder the gallery or the audit flags a different image, match the loading mode to position: `priority` on the first, `loading="eager"` on any others starting above ~900px, lazy for the rest.

The music page (`src/content/pages/music.md`) is plain markdown with SoundCloud iframe embeds. Each iframe needs a `title` attribute (accessibility requirement) — use the track name.

## Posts list

The /posts page shows all posts on one page, newest first. No pagination.

## Search

Search uses [Pagefind](https://pagefind.app/), which indexes the built site. Run `npm run build` at least once before the search page works in dev; the page shows a reminder otherwise.

Pagefind is pinned to `1.5.0` on purpose. Newer versions crash on this Raspberry Pi with a jemalloc page-size error (the Pi uses 16K pages). Do not bump it without testing; older versions work fine on normal x86 CI runners too.

## Analytics

Pageviews are counted with [GoatCounter](https://www.goatcounter.com/) — dashboard at <https://kchitnis.goatcounter.com>. No cookies, no consent banner.

The wiring is in `src/layouts/Layout.astro` and is SPA-aware: the theme navigates client-side (`ClientRouter`), and the stock snippet only counts full page loads, so an inline script sets `window.goatcounter` (endpoint, `no_onload`, `no_events`) and re-fires `goatcounter.count()` on every `astro:page-load` — initial load plus every navigation. Settings go on `window`, not just the script tag: the router's head swap removes the tag, and the script re-reads it at count time.

The script is self-hosted: `public/js/count.js` is a byte-exact copy of `https://gc.zgo.at/count.js`, so nothing loads from a third-party origin and no SRI is needed. To update it, re-copy the file from the CDN. `public/js/` is excluded from prettier, eslint, and tsc — do not reformat the vendored file.

The no-JS fallback is the 1x1 pixel `<noscript>` at the end of the body in `Layout.astro`. Keep it in the body, never the head: the router parses fetched pages with scripting disabled, where a head `<noscript>` containing an `<img>` gets hoisted into the body as a live element that fires a duplicate hit on every client-side navigation. In the body the img stays wrapped and the router strips the whole element before swapping.

## llms.txt

`/llms.txt` is generated by `src/pages/llms.txt.ts` (spec: <https://llmstxt.org/>): a titled, linked index of every page and post for LLM/agent readers, built from the content collections so it never goes stale. `Layout.astro` links it via `<link rel="describedby">`. If frontmatter shapes change, check it — it reads `title`, `description`, and the same `getSortedPosts`/`getPostUrl` helpers the site uses.

## Favicon

The tab icon is the blue mark uploaded Sep 2026 (flat `#4770c2` background). `public/` holds the full set, all rendered from one square source image:

- `favicon.ico` — 16/32/48 px, used by browsers
- `favicon-16x16.png`, `favicon-32x32.png` — PNG fallbacks
- `apple-touch-icon.png` — 180 px, iOS home screen
- `android-chrome-192x192.png`, `android-chrome-512x512.png` + `site.webmanifest` — Android/PWA

Links live in `src/layouts/Layout.astro` (keep the `.ico` first — browsers honour the first matching `<link rel="icon">`).

To regenerate after a source change: `~/backups/favicon-2026-09-25/make-favicons.py` (kept out of the repo to avoid a stray script). Run it with the new square source image, copy the output over `public/`. It crops the artwork to a centred square at 86% fill, flattens JPEG noise against the background colour, and sharpens the 16/32 px renders.

The previous KC-mark icon and the source upload are archived in the same backup folder.

## Deployment

GitHub Pages serves this repo from the `gh-pages` branch, with the custom domain set by `public/CNAME`. HTTPS is enforced and the certificate is managed by GitHub.

At the moment `gh-pages` is built from the old Zola site on `main`. This branch has no deploy workflow yet. When the migration is ready: merge to `main`, then add a GitHub Actions workflow that builds with npm and publishes `dist/` to `gh-pages`. Until then, nothing here is live.

URL compatibility: the old site served posts at `/blogs/<slug>/`; this build serves `/posts/<slug>/`. The `redirects` map in `astro.config.ts` emits a static redirect page for every post plus the listing (36 total, `noindex` so search engines and pagefind skip them), so old links keep working after cutover. If a post moves again, add a matching entry there. Old top-level pages (`/about/`, `/art/`, `/music/`, `/resume/`) kept their paths and need no redirect.

Posts don't show an edit link: `features.editPost` is disabled in `astro-paper.config.ts`. To bring it back, set `enabled: true` and point `url` at the repo's edit base (the theme default shape) — the link reappears under every post title.

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

## Theme content

All theme demo posts (how-to guides, release notes, color-scheme docs, examples) were removed — the site ships only your content. The theme's own docs live at <https://astro-paper.pages.dev/> if you need a reference; they were also recoverable from git history before that commit (`git show <sha>:src/content/posts/…`).

## Theme

AstroPaper by [Sat Naing](https://satnaing.dev), MIT licensed. Documentation at <https://astro-paper.pages.dev/>.
