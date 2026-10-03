// Shared engine for every page: one animation loop, smooth scroll, split text and
// reveals, cursor, magnetic buttons, page transitions, command menu and clocks.
// Page scripts reach it through window.Site. Load after template.js.
//
// Markup hooks:
//   data-split="chars|words"   Text rises out of a mask when it scrolls into view.
//   data-reveal="|fade|scale|blur|mask|wipe"   Element animates in when in view.
//   data-stagger               Direct children animate in one after another.
//   data-roll                  Button label rolls up on hover.
//   data-magnetic="0.3"        Element leans toward the pointer.
//   data-cursor="Label"        Cursor shows this label over the element.
//   data-scramble              Text decodes from random glyphs on hover.
//   data-clock="Europe/Amsterdam"  Live local time.
//   data-copy="text"           Click copies text and shows a toast.
//   data-top                   Click scrolls to the top.
//   data-palette-open          Click opens the command menu (also Ctrl/Cmd+K).
//   data-icon="down"           On a .btn: its icon slides downward on hover (default: up-right).
(() => {
    const root = document.documentElement;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    // Frame-rate independent smoothing toward a target.
    const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const store = {
        get(key, session) {
            try { return (session ? sessionStorage : localStorage).getItem(key); } catch { return null; }
        },
        set(key, value, session) {
            try { (session ? sessionStorage : localStorage).setItem(key, value); } catch { /* private mode */ }
        },
        remove(key, session) {
            try { (session ? sessionStorage : localStorage).removeItem(key); } catch { /* private mode */ }
        },
    };

    function h(html) {
        const tpl = document.createElement('template');
        tpl.innerHTML = html.trim();
        return tpl.content.firstElementChild;
    }

    const isHome = () => !!document.querySelector('[data-page="home"]');

    // ---------- Loop ----------

    const loops = new Set();
    let lastTime = performance.now();
    let lenis = null;

    const scroll = { y: window.scrollY, v: 0, dir: 1, vh: innerHeight, vw: innerWidth, max: 1 };

    function frame(time) {
        const dt = Math.min((time - lastTime) / 1000, 1 / 20);
        lastTime = time;
        if (lenis) lenis.raf(time);

        const y = window.scrollY;
        const v = (y - scroll.y) / Math.max(dt, 1e-3);
        scroll.v = damp(scroll.v, v, 10, dt);
        if (Math.abs(y - scroll.y) > .5) scroll.dir = Math.sign(y - scroll.y);
        scroll.y = y;

        runScenes();
        for (const fn of loops) fn(dt, time);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    const loop = fn => (loops.add(fn), fn);
    const unloop = fn => loops.delete(fn);

    // ---------- Scroll scenes ----------
    // scene(el, fn, mode) calls fn(progress) whenever progress changes.
    //   "through": 0 when el's top meets the viewport bottom, 1 when its bottom leaves the top.
    //   "pin":     0 when el's top reaches the viewport top, 1 when its bottom reaches the bottom
    //              (for tall wrappers around a sticky child).
    //   "track":   no callback, just keeps el's page offsets in scene.top / scene.h.
    const scenes = [];

    function measure(s) {
        const r = s.el.getBoundingClientRect();
        s.top = r.top + window.scrollY;
        s.h = r.height;
    }

    function measureAll() {
        scroll.vh = innerHeight;
        scroll.vw = innerWidth;
        scroll.max = Math.max(1, root.scrollHeight - innerHeight);
        scenes.forEach(measure);
        for (const s of scenes) s.last = -1;
    }

    function scene(el, fn, mode = 'through') {
        const s = { el, fn, mode, top: 0, h: 0, last: -1, p: 0 };
        measure(s);
        scenes.push(s);
        return s;
    }

    function runScenes() {
        const { y, vh } = scroll;
        for (const s of scenes) {
            if (s.mode === 'track') continue;
            const p = s.mode === 'pin'
                ? clamp((y - s.top) / Math.max(1, s.h - vh))
                : clamp((y + vh - s.top) / Math.max(1, s.h + vh));
            if (Math.abs(p - s.last) > 1e-5) {
                s.last = p;
                s.p = p;
                s.fn(p, s);
            }
        }
    }

    let resizeTimer;
    const onResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(measureAll, 120);
    };
    addEventListener('resize', onResize);
    new ResizeObserver(onResize).observe(document.body || root);
    addEventListener('load', measureAll);

    // Calls fn(true/false) when el enters or leaves the viewport (with a margin).
    function visible(el, fn, margin = '120px') {
        const io = new IntersectionObserver(([e]) => fn(e.isIntersecting), { rootMargin: margin });
        io.observe(el);
        return io;
    }

    // ---------- Ready / entrance ----------

    const ready = new Promise(resolve => {
        if (root.classList.contains('is-rendered')) resolve();
        else document.addEventListener('md:rendered', () => resolve(), { once: true });
    });

    // setup: split text and hooks are prepared; page scripts build their parts here.
    // entered: the page is about to show (after the curtain starts lifting).
    let enter, setupDone;
    const setup = new Promise(r => { setupDone = r; });
    const entered = new Promise(r => { enter = r; });

    function live() {
        if (root.classList.contains('is-live')) return;
        root.classList.add('is-live');
        document.querySelectorAll('[data-reveal], [data-split], [data-stagger]').forEach(observe);
        document.dispatchEvent(new Event('site:live'));
    }

    // ---------- Split text & reveals ----------

    const segmenter = window.Intl?.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
    const graphemes = s => segmenter ? [...segmenter.segment(s)].map(g => g.segment) : [...s];

    function split(el) {
        if (el.dataset.splitDone) return;
        el.dataset.splitDone = '1';
        const label = el.textContent.replace(/\s+/g, ' ').trim();
        // Links inside would end up aria-hidden, so those elements only fade in.
        if (!label || el.querySelector('a, button')) {
            el.removeAttribute('data-split');
            if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', '');
            return;
        }
        const chars = el.dataset.split === 'chars';
        const vis = document.createElement('span');
        vis.className = 'split';
        vis.setAttribute('aria-hidden', 'true');
        while (el.firstChild) vis.appendChild(el.firstChild);

        const texts = [];
        const walker = document.createTreeWalker(vis, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) texts.push(walker.currentNode);

        let n = 0;
        for (const node of texts) {
            const frag = document.createDocumentFragment();
            for (const part of node.textContent.split(/(\s+)/)) {
                if (!part) continue;
                if (/^\s+$/.test(part)) {
                    frag.append(' ');
                    continue;
                }
                const w = document.createElement('span');
                w.className = 'w';
                if (chars) {
                    for (const g of graphemes(part)) {
                        const c = document.createElement('span');
                        c.className = 'c';
                        c.textContent = g;
                        c.style.setProperty('--n', n++);
                        w.append(c);
                    }
                } else {
                    const wi = document.createElement('span');
                    wi.className = 'wi';
                    wi.textContent = part;
                    wi.style.setProperty('--n', n++);
                    w.append(wi);
                }
                frag.append(w);
            }
            node.replaceWith(frag);
        }

        const sr = document.createElement('span');
        sr.className = 'sr-only';
        sr.textContent = label;
        el.append(sr, vis);
        el.style.setProperty('--count', n);
    }

    const io = new IntersectionObserver(entries => {
        for (const e of entries) {
            if (!e.isIntersecting) continue;
            e.target.classList.add('is-in');
            io.unobserve(e.target);
        }
    }, { rootMargin: '0px 0px -8% 0px', threshold: .01 });

    function observe(el) {
        if (el.dataset.split !== undefined) split(el);
        if (el.hasAttribute('data-stagger')) {
            [...el.children].forEach((child, i) => child.style.setProperty('--n', i));
        }
        if (reduced) el.classList.add('is-in');
        else io.observe(el);
    }

    function roll(el) {
        if (el.dataset.rollDone) return;
        el.dataset.rollDone = '1';
        const text = el.textContent.trim();
        el.classList.add('roll');
        el.innerHTML = '';
        const a = document.createElement('span');
        const b = document.createElement('span');
        a.textContent = b.textContent = text;
        b.setAttribute('aria-hidden', 'true');
        el.append(a, b);
    }

    // Moves a button's trailing icon into a chip, with a copy that slides in on hover.
    function buttonIcon(svg) {
        const chip = document.createElement('span');
        chip.className = 'btn-icon';
        chip.setAttribute('aria-hidden', 'true');
        if (svg.parentElement.dataset.icon) chip.dataset.dir = svg.parentElement.dataset.icon;
        svg.replaceWith(chip);
        chip.append(svg, svg.cloneNode(true));
    }

    const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>[]{}';
    function scramble(el, text, duration = 650) {
        text ??= el.dataset.text ?? el.textContent;
        el.dataset.text = text;
        if (reduced) {
            el.textContent = text;
            return;
        }
        cancelAnimationFrame(el._scramble);
        const start = performance.now();
        const chars = [...text];
        const step = now => {
            const t = clamp((now - start) / duration);
            let out = '';
            chars.forEach((ch, i) => {
                const k = t * (chars.length + 8) - i;
                if (ch === ' ' || k >= 8) out += ch;
                else if (k > 0) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
                else out += ch;
            });
            el.textContent = out;
            if (t < 1) el._scramble = requestAnimationFrame(step);
        };
        el._scramble = requestAnimationFrame(step);
    }

    // ---------- Cursor ----------

    function cursor() {
        if (!fine || reduced) return;
        root.classList.add('has-cursor');
        const el = h(`<div class="cursor is-hidden" aria-hidden="true">
            <div class="cursor-ring"><span class="cursor-label"></span></div><div class="cursor-dot"></div></div>`);
        document.body.append(el);
        const ring = el.querySelector('.cursor-ring');
        const dot = el.querySelector('.cursor-dot');
        const label = el.querySelector('.cursor-label');
        let x = -100, y = -100, rx = x, ry = y, shown = false;

        addEventListener('pointermove', e => {
            if (e.pointerType && e.pointerType !== 'mouse') return;
            x = e.clientX;
            y = e.clientY;
            if (!shown) {
                shown = true;
                rx = x;
                ry = y;
                el.classList.remove('is-hidden');
            }
        }, { passive: true });

        let current = null;
        document.addEventListener('pointerover', e => {
            const t = e.target.closest?.('[data-cursor], a, button, input, textarea, select, label, [role="button"], [role="option"]') || null;
            if (t === current) return;
            current = t;
            const text = t?.dataset.cursor;
            const field = !!t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
            el.classList.toggle('has-label', !!text);
            el.classList.toggle('is-link', !!t && !text && !field);
            el.classList.toggle('is-text', field);
            if (text) label.textContent = text;
        });
        document.addEventListener('pointerdown', () => el.classList.add('is-down'));
        addEventListener('pointerup', () => el.classList.remove('is-down'));
        document.addEventListener('mouseout', e => {
            if (e.relatedTarget) return;
            el.classList.add('is-hidden');
            shown = false;
        });

        loop(dt => {
            rx = damp(rx, x, 16, dt);
            ry = damp(ry, y, 16, dt);
            dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
        });
    }

    // ---------- Magnetic & tilt ----------

    function magnetic(el) {
        if (!fine || reduced || el.dataset.magneticDone) return;
        el.dataset.magneticDone = '1';
        const strength = parseFloat(el.dataset.magnetic) || .3;
        let x = 0, y = 0, tx = 0, ty = 0, cx = 0, cy = 0, running = false;
        const step = dt => {
            x = damp(x, tx, 9, dt);
            y = damp(y, ty, 9, dt);
            el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
            if (!tx && !ty && Math.abs(x) < .05 && Math.abs(y) < .05) {
                el.style.transform = '';
                running = false;
                unloop(step);
            }
        };
        const start = () => {
            if (!running) {
                running = true;
                loop(step);
            }
        };
        el.addEventListener('pointerenter', () => {
            const r = el.getBoundingClientRect();
            cx = r.left + r.width / 2 - x;
            cy = r.top + r.height / 2 - y;
        });
        el.addEventListener('pointermove', e => {
            if (e.pointerType !== 'mouse') return;
            tx = (e.clientX - cx) * strength;
            ty = (e.clientY - cy) * strength;
            start();
        });
        el.addEventListener('pointerleave', () => {
            tx = ty = 0;
            start();
        });
    }

    // Sets --rx/--ry (tilt), --mx/--my (pointer position in %) and --hover on el.
    function tilt(el, { max = 8, scope = el, lambda = 7 } = {}) {
        if (!fine || reduced) return;
        let rx = 0, ry = 0, tx = 0, ty = 0, mx = 50, my = 50, tmx = 50, tmy = 50, hv = 0, thv = 0;
        let running = false, rect = null;
        const step = dt => {
            rx = damp(rx, tx, lambda, dt);
            ry = damp(ry, ty, lambda, dt);
            mx = damp(mx, tmx, lambda, dt);
            my = damp(my, tmy, lambda, dt);
            hv = damp(hv, thv, lambda, dt);
            el.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
            el.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
            el.style.setProperty('--mx', `${mx.toFixed(1)}%`);
            el.style.setProperty('--my', `${my.toFixed(1)}%`);
            el.style.setProperty('--hover', hv.toFixed(3));
            if (!thv && Math.abs(rx) + Math.abs(ry) < .01 && hv < .003) {
                running = false;
                unloop(step);
            }
        };
        scope.addEventListener('pointerenter', () => { rect = el.getBoundingClientRect(); });
        scope.addEventListener('pointermove', e => {
            if (e.pointerType !== 'mouse') return;
            rect ??= el.getBoundingClientRect();
            const px = clamp((e.clientX - rect.left) / rect.width);
            const py = clamp((e.clientY - rect.top) / rect.height);
            tmx = px * 100;
            tmy = py * 100;
            ty = (px - .5) * 2 * max;
            tx = -(py - .5) * 2 * max;
            thv = 1;
            if (!running) {
                running = true;
                loop(step);
            }
        });
        scope.addEventListener('pointerleave', () => {
            tx = ty = 0;
            tmx = tmy = 50;
            thv = 0;
            rect = null;
        });
    }

    // ---------- Toast & copy ----------

    let toastEl, toastTimer;
    function toast(message) {
        toastEl ??= document.body.appendChild(h('<div class="toast" role="status" aria-live="polite"></div>'));
        toastEl.textContent = message;
        toastEl.classList.add('is-on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2400);
    }

    async function copy(text, message = 'Copied to clipboard') {
        try {
            await navigator.clipboard.writeText(text);
            toast(message);
        } catch {
            toast(text);
        }
    }

    // ---------- Scrolling ----------

    function scrollToTarget(target, { immediate = false } = {}) {
        let y = 0;
        if (typeof target === 'number') y = target;
        else {
            const el = typeof target === 'string'
                ? document.getElementById(decodeURIComponent(target.replace(/^#/, '')))
                : target;
            if (!el) return false;
            y = el.getBoundingClientRect().top + window.scrollY;
        }
        if (lenis) lenis.scrollTo(y, { immediate, duration: 1.5, force: true });
        else window.scrollTo({ top: y, behavior: immediate || reduced ? 'auto' : 'smooth' });
        return true;
    }

    const scrollKey = () => `scroll:${location.pathname}${location.search}`;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    addEventListener('pagehide', () => store.set(scrollKey(), String(Math.round(window.scrollY)), true));

    function restoreScroll() {
        const type = performance.getEntriesByType?.('navigation')[0]?.type;
        const saved = store.get(scrollKey(), true);
        if (location.hash && scrollToTarget(location.hash, { immediate: true })) return;
        if ((type === 'reload' || type === 'back_forward') && saved) scrollToTarget(+saved, { immediate: true });
        else scrollToTarget(0, { immediate: true });
    }

    // ---------- Page transitions ----------

    let curtain, curtainTitle;
    function buildCurtain() {
        curtain = h(`<div class="curtain" aria-hidden="true">${'<i></i>'.repeat(5)}
            <div class="curtain-label"><span class="mono">Loading</span><strong></strong><span class="curtain-bar"></span></div></div>`);
        [...curtain.querySelectorAll('i')].forEach((i, n) => i.style.setProperty('--n', n));
        curtainTitle = curtain.querySelector('strong');
        curtainTitle.textContent = root.dataset.ptLabel || '';
        document.body.append(curtain);
    }

    const samePage = url => {
        const norm = p => p.replace(/index\.html$/, '');
        return norm(url.pathname) === norm(location.pathname) && url.search === location.search;
    };

    function go(href, label = '') {
        const url = new URL(href, location.href);
        if (samePage(url)) {
            if (url.hash) scrollToTarget(url.hash);
            return;
        }
        if (reduced) {
            location.href = url.href;
            return;
        }
        store.set('pt', label.trim().slice(0, 60), true);
        curtainTitle.textContent = label;
        root.classList.remove('pt-in', 'pt-reveal');
        root.classList.add('pt-out');
        setTimeout(() => { location.href = url.href; }, 640);
    }

    document.addEventListener('click', e => {
        const a = e.target.closest('a[href]');
        if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
        const url = new URL(a.href, location.href);
        if (url.origin !== location.origin || !/(\.html|\/)$/.test(url.pathname)) return;
        e.preventDefault();
        closeMenu();
        go(url.href, a.dataset.title || a.querySelector('[data-title]')?.textContent || '');
    });

    addEventListener('pageshow', e => {
        if (!e.persisted) return;
        root.classList.remove('pt-out', 'pt-in', 'pt-reveal');
        store.remove('pt', true);
    });

    // ---------- Navigation ----------

    let menu, burger, menuOpen = false;

    function closeMenu() {
        if (menuOpen) toggleMenu(false);
    }

    function toggleMenu(open = !menuOpen) {
        if (!menu) return;
        menuOpen = open;
        menu.classList.toggle('is-open', open);
        burger?.setAttribute('aria-expanded', String(open));
        menu.inert = !open;
        if (lenis) open ? lenis.stop() : lenis.start();
        document.body.style.overflow = open ? 'hidden' : '';
    }

    function nav() {
        const bar = document.querySelector('.nav');
        if (!bar) return;
        const links = [...bar.querySelectorAll('.nav-links a')];
        const pill = bar.querySelector('.nav-pill');
        let current = null, hidden = false, scrolled = false;

        const place = a => {
            links.forEach(l => l.classList.toggle('is-pill', l === a));
            if (!pill) return;
            if (!a) {
                pill.style.opacity = '0';
                return;
            }
            pill.style.opacity = '1';
            pill.style.width = `${a.offsetWidth}px`;
            pill.style.transform = `translateX(${a.offsetLeft}px)`;
        };
        links.forEach(a => a.addEventListener('pointerenter', () => place(a)));
        bar.querySelector('.nav-links')?.addEventListener('pointerleave', () => place(current));

        const spies = links
            .filter(a => a.dataset.spy && document.getElementById(a.dataset.spy))
            .map(a => ({ a, s: scene(document.getElementById(a.dataset.spy), null, 'track') }));

        const progress = document.body.appendChild(h('<div class="progress" aria-hidden="true"></div>'));

        loop(() => {
            const { y, vh, max, dir } = scroll;
            progress.style.setProperty('--progress', (y / max).toFixed(4));

            const isScrolled = y > 24;
            if (isScrolled !== scrolled) bar.classList.toggle('is-scrolled', scrolled = isScrolled);
            const hide = y > vh * .6 && dir > 0 && !menuOpen && !bar.matches(':focus-within');
            if (hide !== hidden && Math.abs(scroll.v) > 30) bar.classList.toggle('is-hidden', hidden = hide);
            if (y < vh * .6 && hidden) bar.classList.toggle('is-hidden', hidden = false);

            if (spies.length) {
                const line = y + vh * .4;
                let found = null;
                for (const { a, s } of spies) if (s.top <= line && s.top + s.h > line) found = a;
                if (found !== current) {
                    current = found;
                    links.forEach(l => l.setAttribute('aria-current', String(l === current)));
                    if (!bar.querySelector('.nav-links:hover')) place(current);
                }
            }
        });

        // Small screens: a full-screen menu built from the same links.
        burger = bar.querySelector('.burger');
        if (!burger) return;
        menu = h(`<div class="menu" id="menu" data-lenis-prevent><nav class="menu-links" aria-label="Menu"></nav>
            <div class="menu-foot mono"><span data-clock></span><button type="button" data-palette-open>Search${fine ? ' <span data-mod>⌘</span>K' : ''}</button></div></div>`);
        const list = menu.querySelector('.menu-links');
        const all = [...links, ...bar.querySelectorAll('.nav-cta')];
        all.forEach((a, i) => {
            const item = document.createElement('a');
            item.href = a.getAttribute('href');
            item.style.setProperty('--i', i);
            item.innerHTML = `<span>${String(i + 1).padStart(2, '0')}</span>`;
            item.append(a.dataset.label || a.textContent.replace(/^\s*\d+\s*/, '').trim());
            list.append(item);
        });
        menu.inert = true;
        bar.after(menu);
        burger.addEventListener('click', () => toggleMenu());
        list.addEventListener('click', e => {
            if (e.target.closest('a')) toggleMenu(false);
        });
        addEventListener('keydown', e => {
            if (e.key === 'Escape') closeMenu();
        });
    }

    // ---------- Command menu ----------

    const ICONS = {
        arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
        mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
        file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 12v6M9 15l3 3 3-3"/></svg>',
        up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    };

    const fold = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    const palette = (() => {
        let el, input, list, items = [], shown = [], sel = 0, lastFocus = null;

        function build() {
            el = h(`<div class="palette" hidden role="dialog" aria-modal="true" aria-label="Command menu">
                <div class="palette-backdrop"></div>
                <div class="palette-box">
                    <div class="palette-search">${ICONS.search}
                        <input type="text" placeholder="Search projects, sections, actions…" autocomplete="off" spellcheck="false"
                            role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list">
                        <button type="button" class="palette-esc mono" aria-label="Close search">${fine ? 'esc' : 'Close'}</button></div>
                    <div class="palette-list" id="palette-list" role="listbox" aria-label="Results" data-lenis-prevent></div>
                    ${fine ? '<div class="palette-foot mono"><span><kbd>↑↓</kbd> Move</span><span><kbd>↵</kbd> Open</span><span><kbd>esc</kbd> Close</span></div>' : ''}
                </div></div>`);
            document.body.append(el);
            input = el.querySelector('input');
            list = el.querySelector('.palette-list');
            el.querySelector('.palette-backdrop').addEventListener('click', close);
            el.querySelector('.palette-esc').addEventListener('click', () => close());
            input.addEventListener('input', () => {
                sel = 0;
                render();
            });
            input.addEventListener('keydown', e => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (!shown.length) return;
                    sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length;
                    highlight(true);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (shown[sel]) run(shown[sel]);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    close();
                } else if (e.key === 'Tab') {
                    e.preventDefault();
                }
            });
            list.addEventListener('pointermove', e => {
                const opt = e.target.closest('[role="option"]');
                if (!opt || +opt.dataset.i === sel) return;
                sel = +opt.dataset.i;
                highlight(false);
            });
            list.addEventListener('click', e => {
                const opt = e.target.closest('[role="option"]');
                if (opt) run(shown[+opt.dataset.i]);
            });
        }

        async function gather() {
            const home = isHome() ? '' : 'index.html';
            const sections = [...document.querySelectorAll('.nav-links a, .nav-cta')].map(a => ({
                group: 'Jump to',
                title: a.dataset.label || a.textContent.replace(/^\s*\d+\s*/, '').trim(),
                icon: 'arrow',
                href: a.getAttribute('href'),
            }));
            sections.unshift({ group: 'Jump to', title: 'Top of the page', icon: 'up', run: () => scrollToTarget(0) });
            if (!isHome()) sections.unshift({ group: 'Jump to', title: 'Home', icon: 'arrow', href: `${home}#home` });

            let list = [];
            try {
                list = (await projects()).map(p => ({
                    group: 'Projects', title: p.title, sub: p.category, thumb: p.thumb, href: p.href,
                }));
            } catch { /* offline */ }

            let meta = {};
            try { meta = (await window.mdContent('content/home.md')).meta; } catch { /* offline */ }
            const actions = [];
            if (meta.email) {
                actions.push({ group: 'Actions', title: 'Copy email address', sub: meta.email, icon: 'mail', run: () => copy(meta.email, 'Email address copied') });
            }
            actions.push({ group: 'Actions', title: 'Download résumé', sub: 'PDF', icon: 'file', href: 'documents/cv.pdf', external: true });
            return [...list, ...sections, ...actions];
        }

        function match(item, q) {
            if (!q) return 1;
            const hay = fold(`${item.title} ${item.sub || ''} ${item.group}`);
            if (hay.includes(q)) return hay.startsWith(q) ? 3 : 2;
            let i = 0;
            for (const ch of hay) if (ch === q[i]) i++;
            return i === q.length ? .5 : 0;
        }

        function render() {
            const q = fold(input.value.trim());
            shown = items
                .map(item => ({ item, s: match(item, q) }))
                .filter(r => r.s > 0)
                .sort((a, b) => (q ? b.s - a.s : 0))
                .map(r => r.item);
            if (!shown.length) {
                list.innerHTML = `<div class="palette-empty">Nothing matches “${input.value.replace(/[<>&]/g, '')}”</div>`;
                return;
            }
            let group = '';
            list.innerHTML = '';
            shown.forEach((item, i) => {
                if (!q && item.group !== group) {
                    group = item.group;
                    list.append(h(`<div class="palette-group mono" role="presentation">${group}</div>`));
                }
                const opt = h(`<div class="palette-item" role="option" id="palette-opt-${i}" data-i="${i}" aria-selected="false">
                    <span class="palette-icon">${item.thumb ? '<img alt="" loading="lazy">' : ICONS[item.icon] || ICONS.arrow}</span>
                    <span class="palette-text"><span></span><small></small></span>
                    <span class="palette-go">${ICONS.arrow}</span></div>`);
                if (item.thumb) opt.querySelector('img').src = item.thumb;
                opt.querySelector('.palette-text span').textContent = item.title;
                opt.querySelector('small').textContent = item.sub || item.group;
                opt.querySelector('.palette-go svg').style.width = '16px';
                list.append(opt);
            });
            highlight(true);
        }

        function highlight(scrollIntoView) {
            list.querySelectorAll('[role="option"]').forEach(o => {
                const on = +o.dataset.i === sel;
                o.setAttribute('aria-selected', String(on));
                if (on && scrollIntoView) o.scrollIntoView({ block: 'nearest' });
            });
            input.setAttribute('aria-activedescendant', `palette-opt-${sel}`);
        }

        function run(item) {
            close(false);
            if (item.run) item.run();
            else if (item.external) window.open(item.href, '_blank', 'noopener');
            else go(item.href, item.group === 'Projects' ? item.title : '');
        }

        async function open() {
            if (!el) build();
            if (!el.hidden) return;
            closeMenu();
            lastFocus = document.activeElement;
            el.hidden = false;
            input.value = '';
            if (lenis) lenis.stop();
            input.focus();
            items = await gather();
            sel = 0;
            render();
        }

        function close(restoreFocus = true) {
            if (!el || el.hidden) return;
            el.hidden = true;
            if (lenis && !menuOpen) lenis.start();
            if (restoreFocus) lastFocus?.focus?.();
        }

        addEventListener('keydown', e => {
            const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                el && !el.hidden ? close() : open();
            } else if (e.key === '/' && !typing) {
                e.preventDefault();
                open();
            }
        });

        return { open, close };
    })();

    // ---------- Projects (read from the cards on the home page) ----------

    let projectList = null;
    const inlineText = md => {
        const d = document.createElement('div');
        d.innerHTML = window.marked ? marked.parseInline(md || '') : (md || '');
        return d.textContent.trim();
    };

    function projects() {
        projectList ??= (async () => {
            let doc = document;
            if (!document.querySelector('a.project[href*="?p="]')) {
                const res = await fetch('index.html');
                doc = new DOMParser().parseFromString(await res.text(), 'text/html');
            }
            const cards = [...doc.querySelectorAll('a.project[href*="?p="]')];
            return Promise.all(cards.map(async (a, index) => {
                const href = a.getAttribute('href');
                const name = new URL(href, location.href).searchParams.get('p');
                const src = a.dataset.mdSrc || `content/projects/${name}.md`;
                let meta = {};
                try { meta = (await window.mdContent(src)).meta; } catch { /* missing file */ }
                return {
                    index,
                    total: cards.length,
                    name,
                    href,
                    thumb: a.querySelector('img')?.getAttribute('src') || meta.thumbnail || '',
                    title: inlineText(meta.card_title || name),
                    category: meta.category || '',
                    summary: inlineText(meta.summary),
                    accent: meta.accent || '',
                };
            }));
        })();
        return projectList;
    }

    // ---------- Clocks ----------

    function clocks() {
        const formats = new Map();
        const tick = () => {
            const now = new Date();
            document.querySelectorAll('[data-clock]').forEach(el => {
                const tz = el.dataset.clock || 'Europe/Amsterdam';
                const key = `${tz}|${el.hasAttribute('data-seconds')}`;
                if (!formats.has(key)) {
                    formats.set(key, new Intl.DateTimeFormat('en-GB', {
                        timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
                        ...(el.hasAttribute('data-seconds') ? { second: '2-digit' } : {}),
                    }));
                }
                el.textContent = formats.get(key).format(now);
            });
        };
        tick();
        setInterval(tick, 1000);
    }

    // ---------- Wiring ----------

    // Prepares hooks under scope. Split text starts hidden; observe() plays it later.
    function decorate(scope = document) {
        scope.querySelectorAll('[data-split]').forEach(split);
        scope.querySelectorAll('[data-roll]').forEach(roll);
        scope.querySelectorAll('.btn > svg').forEach(buttonIcon);
        scope.querySelectorAll('[data-magnetic]').forEach(magnetic);
        scope.querySelectorAll('[data-scramble]').forEach(el => {
            if (el.dataset.scrambleDone) return;
            el.dataset.scrambleDone = '1';
            const text = el.textContent.trim();
            el.dataset.text = text;
            if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', text);
            el.addEventListener('pointerenter', () => scramble(el, el.dataset.text));
        });
    }

    document.addEventListener('click', e => {
        const t = e.target.closest('[data-copy], [data-top], [data-palette-open]');
        if (!t) return;
        if (t.matches('[data-copy]')) copy(t.dataset.copy, t.dataset.copyMessage || 'Copied to clipboard');
        if (t.matches('[data-top]')) scrollToTarget(0);
        if (t.matches('[data-palette-open]')) palette.open();
    });

    // Pointer position inside buttons, for their glow.
    document.addEventListener('pointermove', e => {
        const b = e.target.closest?.('.btn, .icon-btn');
        if (!b) return;
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mx', `${e.clientX - r.left}px`);
        b.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });

    function initLenis() {
        if (reduced || !fine || !window.Lenis) return;
        lenis = new window.Lenis({ lerp: .1, smoothWheel: true, autoRaf: false });
    }

    function start() {
        initLenis();
        buildCurtain();
        cursor();
        nav();
        clocks();
        document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
        if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
            document.querySelectorAll('[data-mod]').forEach(el => { el.textContent = 'Ctrl'; });
        }

        ready.then(async () => {
            await Promise.race([document.fonts?.ready, wait(1500)]);
            decorate();
            setupDone();
            await null;
            measureAll();
            restoreScroll();
            if (root.classList.contains('pt-in')) {
                await nextFrame();
                root.classList.add('pt-reveal');
                setTimeout(() => root.classList.remove('pt-in', 'pt-reveal'), 1300);
                await wait(260);
            }
            enter();
        });

        entered.then(() => {
            if (!root.classList.contains('boot-on')) live();
        });
    }

    window.Site = {
        reduced, fine, clamp, lerp, damp, wait, nextFrame, h, store,
        loop, unloop, scene, visible, measureAll, scroll,
        ready, setup, entered, live, split, observe, decorate, scramble,
        magnetic, tilt, toast, copy, go, scrollTo: scrollToTarget,
        projects, palette,
        get lenis() { return lenis; },
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
