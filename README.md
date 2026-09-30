# portfolio

## Acknowledgements

This project was inspired by the work of Creative Tim (https://www.creative-tim.com), whose open-source designs and tools under the MIT License served as creative reference material.

## Content

Page text lives in Markdown files under `content/` (see `content/README.md` for the editing rules). `js/template.js` fetches them at runtime and fills elements marked with `data-md-*` attributes; the attribute API is documented at the top of that file.

- `index.html` renders `content/home.md`, and each project card renders the card fields of its `content/projects/*.md` file.
- `project.html?p=<name>` is the single template for all project pages and renders `content/projects/<name>.md`. Sections without content (details box, video, PDF viewer, TikToks, gallery, button) are removed. `style: <name>` in the frontmatter loads an optional theme from `css/<name>.css`.
- To add a project, copy `content/projects/template.md` and add a card to `index.html`.

Because the text is fetched, open the site through a local server, not `file://`:

```sh
python -m http.server
```
