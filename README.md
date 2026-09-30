# portfolio

## Acknowledgements

This project was inspired by the work of Creative Tim (https://www.creative-tim.com), whose open-source designs and tools under the MIT License served as creative reference material.

## Content

Page text lives in Markdown files under `content/` (see `content/README.md` for the editing rules). `js/template.js` fetches them at runtime and fills elements marked with `data-md-*` attributes; the attribute API is documented at the top of that file.

Because the text is fetched, open the site through a local server, not `file://`:

```sh
python -m http.server
```
