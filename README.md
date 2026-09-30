# portfolio

## Acknowledgements

This project was inspired by the work of Creative Tim (https://www.creative-tim.com), whose open-source designs and tools under the MIT License served as creative reference material.

## Content

Page text lives in Markdown files under `content/` (see `content/README.md` for the editing rules). `js/template.js` fetches them at runtime and fills elements marked with `data-md-*` attributes; the attribute API is documented at the top of that file.

- `index.html` renders `content/home.md`, and each project card renders the card fields of its `content/projects/*.md` file.
- `project.html?p=<name>` is the single template for all project pages and renders `content/projects/<name>.md`. The page is a side card (role, figures, tabs) next to the cover, then one tab panel at a time: Overview, Contributions, Deliverable and Reflection. Panels and cards without content are removed. `style: <name>` in the frontmatter loads an optional theme from `css/<name>.css`.
- To add a project, copy `content/projects/template.md` and add a card to `index.html`. The card order on the home page also sets the previous/next order on project pages.

Because the text is fetched, open the site through a local server, not `file://`:

```sh
python -m http.server
```

## Code

| File | What it does |
| --- | --- |
| `css/site.css`, `js/site.js` | Shared design tokens and engine: animation loop, Lenis smooth scroll, split-text reveals, cursor, magnetic buttons, page transitions, interface sounds, command menu (Ctrl/⌘ K). The hooks are listed at the top of `js/site.js`. |
| `css/home.css`, `js/home.js` | Home page: boot screen, hero, marquee, work grid (filters, grid/list view), formats showcase, strengths stack, timeline, tools orbit, globe. |
| `js/shader.js` | WebGL liquid-chrome background of the home hero. |
| `css/project.css`, `js/project.js` | Project page layout, tabs, figures, cinema video, previous/next. |
| `js/flipbook.js` | Magazine flip book with bending pages (loaded when a project has `magazine:` or `pdf_viewer:`). |
| `js/phones.js` | TikTok videos in 3D phones, with covers from TikTok's oEmbed API (loaded when a project has `tiktok:`). |
| `js/ring.js` | Photo gallery as a 3D ring with a lightbox (loaded for a `## Gallery` section). |

External scripts come from CDNs: marked (Markdown), Lenis (smooth scroll) and, only when a magazine has no page images, pdf.js. Everything respects `prefers-reduced-motion`.

## Media

Magazine page images for the flip book are made from a PDF with `scripts/magazine.sh` (needs poppler-utils and ImageMagick), then referenced with `magazine:` in the project file:

```sh
scripts/magazine.sh documents/vintigue_split.pdf images/magazines/vintigue
```

The short muted clips for `preview:` were cut from the films with ffmpeg, for example:

```sh
ffmpeg -ss 14.6 -t 1.7 -i documents/echoes_of_redemption.mp4 -vf scale=640:-2 -an -c:v libx264 -crf 29 -movflags +faststart documents/previews/echoes.mp4
```
