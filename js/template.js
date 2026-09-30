// Fills page text from Markdown files in /content.
//
// Markup API:
//   data-md-src="path/to/file.md"  Content file for this element and its descendants.
//                                  The nearest ancestor with data-md-src wins.
//   data-md="key"                  Frontmatter value (inline Markdown), or else the
//                                  "## Section" whose slug matches key (block Markdown).
//   data-md-list="key"             Repeats the child <template> once per "### Item"
//                                  inside the "## key" section. With several child
//                                  templates, items cycle through them in order.
//   data-md-item="title|body"      Inside a list template: the item heading or its text.
//   data-md-attr="attr=value;..."  Sets attributes. {key} in value is replaced with the
//                                  frontmatter value, {key:digits} keeps only digits and +.
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
            meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^(["'])(.*)\1$/, '$2');
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

        for (const el of own(scope, '[data-md-list]')) {
            const key = slugify(el.dataset.mdList);
            const tpls = el.querySelectorAll(':scope > template');
            if (!(key in sections) || !tpls.length) {
                console.warn(`template.js: no "## ${el.dataset.mdList}" section or <template> for ${src}`);
                continue;
            }
            items(sections[key]).forEach((item, i) => {
                const node = tpls[i % tpls.length].content.cloneNode(true);
                node.querySelectorAll('[data-md-item="title"]').forEach(t => fill(t, item.title, true));
                node.querySelectorAll('[data-md-item="body"]').forEach(b => fill(b, item.body, false));
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
                const value = pair.slice(i + 1).replace(/\{(\w+)(:digits)?\}/g, (_, key, digits) => {
                    if (!(key in meta)) console.warn(`template.js: "${key}" not found in ${src}`);
                    const v = meta[key] ?? '';
                    return digits ? v.replace(/[^\d+]/g, '') : v;
                });
                el.setAttribute(pair.slice(0, i).trim(), value);
            }
        }
    }

    async function run() {
        const scopes = [...document.querySelectorAll('[data-md-src]')];
        await Promise.all(scopes.map(async scope => {
            try {
                render(scope, await load(scope.dataset.mdSrc));
            } catch (err) {
                console.error('template.js:', err);
            }
        }));
        root.style.visibility = '';
        document.dispatchEvent(new Event('md:rendered'));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
})();
