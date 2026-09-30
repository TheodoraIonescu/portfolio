// Renders pages from Markdown files in /content.
//
// Markup API:
//   data-md-src="path/to/file.md"  Content file for this element and its descendants.
//                                  The nearest ancestor with data-md-src wins. {name} is
//                                  replaced with the ?name= URL parameter.
//   data-md-if="key|other"         Removes the element unless one of the keys exists
//                                  (frontmatter value or "## Section").
//   data-md="key"                  Frontmatter value (inline Markdown), or else the
//                                  "## Section" whose slug matches key (block Markdown).
//   data-md-list="key"             Repeats the child <template> once per "### Item"
//                                  inside the "## key" section. With several child
//                                  templates, items cycle through them in order.
//   data-md-item="title|body|images"
//                                  Inside a list template: the item heading, its text, or
//                                  only the images in its text. With data-md-wrap="class",
//                                  each image is wrapped in a <div class="class">.
//   data-md-attr="attr=value;..."  Sets attributes. {key} in value is replaced with the
//                                  frontmatter value, {key:digits} keeps only digits and +.
//                                  An attribute whose keys are missing is not set.
//   data-md-tiktok="key"           Embeds the comma-separated TikTok video links in key.
//                                  With a child <template>, it is repeated once per link
//                                  instead, and its first element gets data-url and
//                                  data-video-id.
//   data-md-script="url url"       Loads these scripts in order after rendering, if the
//                                  element is still on the page.
//
// When everything is rendered, <html> gets the class "is-rendered" and the document
// fires "md:rendered". window.mdContent(src) returns the parsed { meta, sections } of a
// content file, from the same cache.
//
// Needs marked.js loaded first, and an HTTP server (fetch does not work on file://).
(() => {
    const root = document.documentElement;
    root.style.visibility = 'hidden';

    const cache = new Map();

    const slugify = s => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    function parse(raw) {
        raw = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
        const [, fm = '', body = raw] = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/) || [];

        const meta = {};
        for (const line of fm.split('\n')) {
            const i = line.indexOf(':');
            if (i < 1 || line.trim().startsWith('#')) continue;
            const value = line.slice(i + 1).trim().replace(/^(["'])(.*)\1$/, '$2');
            if (value) meta[line.slice(0, i).trim()] = value;
        }

        const sections = {};
        const parts = body.split(/^## +(.+)$/m);
        for (let i = 1; i < parts.length; i += 2) {
            sections[slugify(parts[i])] = parts[i + 1].trim();
        }

        return { meta, sections };
    }

    function load(src) {
        if (!cache.has(src)) {
            cache.set(src, fetch(src).then(r => {
                if (!r.ok) throw new Error(`${src}: HTTP ${r.status}`);
                return r.text();
            }).then(parse));
        }
        return cache.get(src);
    }

    // Renders Markdown into el, dropping a wrapper that would nest badly:
    // a single <p> is unwrapped, and a single list is unwrapped into a <ul>/<ol> target.
    function fill(el, md, inline) {
        if (inline) {
            el.innerHTML = marked.parseInline(md);
            return;
        }
        const tmp = document.createElement('div');
        tmp.innerHTML = marked.parse(md);
        const only = tmp.children.length === 1 && tmp.firstElementChild;
        const isList = only && /^(UL|OL)$/.test(only.tagName);
        if (only && (only.tagName === 'P' || (isList && /^(UL|OL)$/.test(el.tagName)))) {
            el.innerHTML = only.innerHTML;
        } else {
            el.innerHTML = tmp.innerHTML;
        }
    }

    function fillImages(el, md) {
        const tmp = document.createElement('div');
        tmp.innerHTML = marked.parse(md);
        for (const img of tmp.querySelectorAll('img')) {
            let node = img;
            if (el.dataset.mdWrap) {
                node = document.createElement('div');
                node.className = el.dataset.mdWrap;
                node.appendChild(img);
            }
            el.appendChild(node);
        }
    }

    function items(section) {
        const parts = section.split(/^### +(.+)$/m);
        const out = [];
        for (let i = 1; i < parts.length; i += 2) {
            out.push({ title: parts[i].trim(), body: parts[i + 1].trim() });
        }
        return out;
    }

    // Elements under scope that belong to it and not to a nested data-md-src.
    function own(scope, selector) {
        return [scope, ...scope.querySelectorAll(selector)]
            .filter(el => el.matches(selector) && el.closest('[data-md-src]') === scope);
    }

    function render(scope, { meta, sections }) {
        const src = scope.dataset.mdSrc;
        const has = key => key in meta || slugify(key) in sections;

        for (const el of own(scope, '[data-md-if]')) {
            if (!el.dataset.mdIf.split('|').some(has)) el.remove();
        }

        for (const el of own(scope, '[data-md-list]')) {
            const key = slugify(el.dataset.mdList);
            const tpls = el.querySelectorAll(':scope > template');
            if (!(key in sections) || !tpls.length) continue;
            items(sections[key]).forEach((item, i) => {
                const node = tpls[i % tpls.length].content.cloneNode(true);
                node.querySelectorAll('[data-md-item="title"]').forEach(t => fill(t, item.title, true));
                node.querySelectorAll('[data-md-item="body"]').forEach(b => fill(b, item.body, false));
                node.querySelectorAll('[data-md-item="images"]').forEach(g => fillImages(g, item.body));
                el.appendChild(node);
            });
        }

        for (const el of own(scope, '[data-md]')) {
            const key = el.dataset.md;
            if (key in meta) fill(el, meta[key], true);
            else if (slugify(key) in sections) fill(el, sections[slugify(key)], false);
            else console.warn(`template.js: "${key}" not found in ${src}`);
        }

        for (const el of own(scope, '[data-md-attr]')) {
            for (const pair of el.dataset.mdAttr.split(';')) {
                const i = pair.indexOf('=');
                if (i < 1) continue;
                let missing = false;
                const value = pair.slice(i + 1).replace(/\{(\w+)(:digits)?\}/g, (_, key, digits) => {
                    if (!(key in meta)) missing = true;
                    const v = meta[key] ?? '';
                    return digits ? v.replace(/[^\d+]/g, '') : v;
                });
                if (!missing) el.setAttribute(pair.slice(0, i).trim(), value);
            }
        }

        for (const el of own(scope, '[data-md-tiktok]')) {
            const tpl = el.querySelector(':scope > template');
            for (const url of (meta[el.dataset.mdTiktok] ?? '').split(',').map(s => s.trim()).filter(Boolean)) {
                const id = url.match(/video\/(\d+)/)?.[1] ?? '';
                if (tpl) {
                    const node = tpl.content.cloneNode(true);
                    const first = node.firstElementChild;
                    if (first) {
                        first.dataset.url = url;
                        first.dataset.videoId = id;
                    }
                    el.appendChild(node);
                    continue;
                }
                const quote = document.createElement('blockquote');
                quote.className = 'tiktok-embed';
                quote.cite = url;
                quote.dataset.videoId = id;
                quote.style.cssText = 'max-width: 325px; min-width: 325px;';
                quote.appendChild(document.createElement('section'));
                el.appendChild(quote);
            }
        }
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`${src}: failed to load`));
            document.body.appendChild(script);
        });
    }

    // Stylesheets whose href was set from Markdown, so the page is not shown unstyled.
    function stylesheetsLoaded() {
        const links = [...document.querySelectorAll('link[rel="stylesheet"][data-md-attr][href]')];
        return Promise.all(links.map(link => link.sheet ? null : new Promise(done => {
            link.addEventListener('load', done);
            link.addEventListener('error', done);
        })));
    }

    async function run() {
        const params = new URLSearchParams(location.search);
        const scopes = [...document.querySelectorAll('[data-md-src]')];
        await Promise.all(scopes.map(async scope => {
            try {
                const src = scope.dataset.mdSrc.replace(/\{(\w+)\}/g, (_, name) => {
                    const value = params.get(name);
                    if (!value || !/^[\w-]+$/.test(value)) throw new Error(`missing or invalid ?${name}= parameter`);
                    return value;
                });
                render(scope, await load(src));
            } catch (err) {
                console.error('template.js:', err);
            }
        }));
        await stylesheetsLoaded();
        root.style.visibility = '';
        root.classList.add('is-rendered');
        document.dispatchEvent(new Event('md:rendered'));

        for (const el of document.querySelectorAll('[data-md-script]')) {
            try {
                for (const src of el.dataset.mdScript.split(/\s+/).filter(Boolean)) await loadScript(src);
            } catch (err) {
                console.error('template.js:', err);
            }
        }
    }

    window.mdContent = load;

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
})();
