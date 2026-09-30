// Magazine flip book. Drag a page, click it, use the buttons or the arrow keys; the
// page that turns is cut into strips so it bends like paper while it moves.
//
//   <div class="flipbook" data-src="images/magazines/vintigue"></div>
//     A folder with manifest.json and 01.webp, 02.webp, ... made by scripts/magazine.sh.
//   <div class="flipbook" data-pdf="documents/magazine.pdf"></div>
//     Without a folder, the PDF is rendered in the browser with pdf.js (slower).
//
// Wide screens show spreads (cover alone on the right, then pairs); narrow screens
// show one page at a time. Loaded by project.html when the project has a magazine.
(() => {
    const S = window.Site;
    const STRIPS = 14;
    const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.min.js';
    const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';
    const LIGHT = { x: -.28, z: .96 };

    const pad = n => String(n).padStart(2, '0');
    const clamp = S.clamp;
    const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    const easeOut = t => 1 - (1 - t) ** 3;

    const ICON = {
        prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
        next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
        full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    };

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = () => reject(new Error(`${src}: failed to load`));
            document.head.append(s);
        });
    }

    // Returns { count, ratio, page(i), thumb(i) }; page/thumb give a URL or a promise of one.
    async function openSource(el) {
        if (el.dataset.src) {
            const dir = el.dataset.src.replace(/\/$/, '');
            const res = await fetch(`${dir}/manifest.json`);
            if (res.ok) {
                const m = await res.json();
                return {
                    count: m.pages,
                    ratio: m.width / m.height,
                    page: i => `${dir}/${pad(i + 1)}.webp`,
                    thumb: i => `${dir}/${pad(i + 1)}-thumb.webp`,
                };
            }
        }
        if (!el.dataset.pdf) throw new Error('no data-src folder or data-pdf file');
        await loadScript(PDFJS);
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        const pdf = await window.pdfjsLib.getDocument(el.dataset.pdf).promise;
        const vp = (await pdf.getPage(1)).getViewport({ scale: 1 });
        const cache = new Map();
        const render = (i, width) => {
            const key = `${i}:${width}`;
            if (!cache.has(key)) {
                cache.set(key, pdf.getPage(i + 1).then(async page => {
                    const v = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.round(v.width);
                    canvas.height = Math.round(v.height);
                    await page.render({ canvasContext: canvas.getContext('2d'), viewport: v }).promise;
                    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', .86));
                    return URL.createObjectURL(blob);
                }));
            }
            return cache.get(key);
        };
        return { count: pdf.numPages, ratio: vp.width / vp.height, page: i => render(i, 1100), thumb: i => render(i, 160) };
    }

    const decoded = new Map();
    function ready(url) {
        if (!decoded.has(url)) {
            decoded.set(url, new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve(url);
                img.onerror = () => resolve(url);
                img.src = url;
            }));
        }
        return decoded.get(url);
    }

    for (const el of document.querySelectorAll('.flipbook')) {
        create(el).catch(err => {
            console.error('flipbook.js:', err);
            const pdf = el.dataset.pdf;
            el.innerHTML = pdf ? `<p class="mono"><a href="${pdf}" target="_blank" rel="noopener">Open the magazine (PDF) ↗</a></p>` : '';
        });
    }

    async function create(el) {
        el.innerHTML = '<div class="fb-loading mono">Loading magazine…</div>';
        const src = await openSource(el);
        const n = src.count;
        const known = new Map();
        // Promise of a decoded page URL.
        const url = i => (i === null || i < 0 || i >= n
            ? Promise.resolve(null)
            : Promise.resolve(src.page(i)).then(ready).then(u => (known.set(i, u), u)));
        // A URL that can be used right away, or null while a PDF page is still rendering.
        const now = i => {
            if (i === null) return null;
            if (known.has(i)) return known.get(i);
            const u = src.page(i);
            return typeof u === 'string' ? u : null;
        };

        el.innerHTML = `
            <div class="fb" tabindex="0" role="region" aria-roledescription="flip book" aria-label="Magazine, ${n} pages. Use the arrow keys to turn pages.">
                <div class="fb-stage">
                    <div class="fb-book" data-cursor="Drag">
                        <div class="fb-page fb-left"><img alt="" draggable="false"><div class="fb-shadow"></div></div>
                        <div class="fb-page fb-right"><img alt="" draggable="false"><div class="fb-shadow"></div></div>
                        <div class="fb-edge fb-edge-l"></div><div class="fb-edge fb-edge-r"></div>
                        <div class="fb-leaf"></div>
                    </div>
                </div>
                <div class="fb-bar">
                    <button class="fb-btn" type="button" data-go="-1" aria-label="Previous pages">${ICON.prev}</button>
                    <span class="fb-count mono" aria-hidden="true"></span>
                    <button class="fb-btn" type="button" data-go="1" aria-label="Next pages">${ICON.next}</button>
                    <button class="fb-btn" type="button" data-full aria-label="Full screen">${ICON.full}</button>
                </div>
                <div class="fb-thumbs" data-lenis-prevent></div>
                <div class="sr-only" aria-live="polite"></div>
            </div>`;

        const fb = el.querySelector('.fb');
        const stage = el.querySelector('.fb-stage');
        const book = el.querySelector('.fb-book');
        const leftEl = el.querySelector('.fb-left');
        const rightEl = el.querySelector('.fb-right');
        const leftShadow = leftEl.querySelector('.fb-shadow');
        const rightShadow = rightEl.querySelector('.fb-shadow');
        const edgeL = el.querySelector('.fb-edge-l');
        const edgeR = el.querySelector('.fb-edge-r');
        const leaf = el.querySelector('.fb-leaf');
        const count = el.querySelector('.fb-count');
        const live = el.querySelector('[aria-live]');
        const thumbs = el.querySelector('.fb-thumbs');
        const prevBtn = el.querySelector('[data-go="-1"]');
        const nextBtn = el.querySelector('[data-go="1"]');
        const fullBtn = el.querySelector('[data-full]');
        if (!document.fullscreenEnabled) fullBtn.hidden = true;

        // ---------- Model ----------
        let mode = 'spread';
        let pos = 0;
        let pw = 300, ph = 400;
        const spread = () => mode === 'spread';
        const maxPos = () => (spread() ? Math.floor(n / 2) : n - 1);
        const L = s => (spread() ? (s === 0 ? null : 2 * s - 1) : null);
        const R = s => (spread() ? (2 * s <= n - 1 ? 2 * s : null) : s);
        const shiftOf = s => (!spread() ? 0 : L(s) === null ? -pw / 2 : R(s) === null ? pw / 2 : 0);

        // ---------- The bending leaf ----------
        const strips = [];
        let parent = leaf;
        for (let i = 0; i < STRIPS; i++) {
            const el2 = document.createElement('div');
            el2.className = 'fb-strip';
            const f = document.createElement('div');
            f.className = 'fb-face fb-f';
            const b = document.createElement('div');
            b.className = 'fb-face fb-b';
            el2.append(f, b);
            parent.append(el2);
            strips.push({ el: el2, f, b });
            parent = el2;
        }

        function sizeLeaf() {
            const sw = pw / STRIPS;
            leaf.style.width = `${pw}px`;
            leaf.style.left = spread() ? `${pw}px` : '0px';
            strips.forEach((st, i) => {
                const w = i === STRIPS - 1 ? sw : sw + 1;
                st.el.style.left = i === 0 ? '0px' : `${sw}px`;
                st.el.style.width = `${w}px`;
                st.f.style.backgroundSize = st.b.style.backgroundSize = `${pw}px ${ph}px`;
                st.f.style.backgroundPosition = `${-i * sw}px 0`;
                st.b.style.backgroundPosition = `${-(pw - i * sw - w)}px 0`;
            });
        }

        function setLeaf(front, back) {
            const f = front ? `url("${front}")` : 'none';
            const b = back ? `url("${back}")` : 'none';
            strips.forEach(st => {
                st.f.style.backgroundImage = f;
                st.b.style.backgroundImage = b;
            });
        }

        // t: 0 = flat on the right, 1 = flat on the left. dir: +1 forward, -1 back.
        function pose(t, dir, curl) {
            const bend = curl * Math.sin(Math.PI * t) * dir;
            let prev = 0, edge = 0;
            const sw = pw / STRIPS;
            strips.forEach((st, i) => {
                const w = ((i + 1) / STRIPS) ** 1.6;
                const phi = clamp(t * 180 + bend * w, 0, 180);
                st.el.style.transform = `rotateY(${(prev - phi).toFixed(3)}deg)`;
                prev = phi;
                const rad = phi * Math.PI / 180;
                const lit = -Math.sin(rad) * LIGHT.x + Math.cos(rad) * LIGHT.z;
                st.f.style.setProperty('--s', ((1 - Math.max(0, lit)) * .5).toFixed(3));
                st.b.style.setProperty('--s', ((1 - Math.max(0, -lit)) * .5).toFixed(3));
                edge += sw * Math.cos(rad);
            });
            leaf.style.opacity = spread() ? '1' : String(clamp((1 - t) * 2.4));

            // Shadow the lifted page casts on the page below it.
            const lift = Math.sin(Math.PI * t);
            const reach = 30 + 110 * lift;
            if (edge >= 0) {
                rightShadow.style.background = `linear-gradient(90deg, transparent ${Math.max(0, edge - 2)}px, rgba(0,0,0,${(.42 * lift).toFixed(3)}) ${edge}px, transparent ${edge + reach}px)`;
                leftShadow.style.background = `linear-gradient(270deg, rgba(0,0,0,${(.16 * lift).toFixed(3)}), transparent 40%)`;
            } else {
                const e = -edge;
                leftShadow.style.background = `linear-gradient(270deg, transparent ${Math.max(0, e - 2)}px, rgba(0,0,0,${(.42 * lift).toFixed(3)}) ${e}px, transparent ${e + reach}px)`;
                rightShadow.style.background = `linear-gradient(90deg, rgba(0,0,0,${(.16 * lift).toFixed(3)}), transparent 40%)`;
            }
        }

        // ---------- Static pages ----------
        function setPage(pageEl, i) {
            const img = pageEl.querySelector('img');
            pageEl._want = i;
            if (i === null) {
                pageEl.classList.add('is-empty');
                pageEl.classList.remove('is-loading');
                return Promise.resolve();
            }
            pageEl.classList.remove('is-empty');
            img.alt = `Page ${i + 1} of ${n}`;
            const direct = now(i);
            if (direct && known.has(i)) {
                img.src = direct;
                img.dataset.page = i;
                pageEl.classList.remove('is-loading');
                return Promise.resolve();
            }
            if (!img.dataset.page || +img.dataset.page !== i) pageEl.classList.add('is-loading');
            return url(i).then(u => {
                if (pageEl._want !== i) return;
                img.src = u;
                img.dataset.page = i;
                pageEl.classList.remove('is-loading');
            });
        }

        function showStatic() {
            setPage(leftEl, L(pos));
            setPage(rightEl, R(pos));
            leftEl.hidden = !spread();
            book.style.setProperty('--shift', `${shiftOf(pos)}px`);
            leftShadow.style.background = rightShadow.style.background = '';
            const onLeft = spread() ? (L(pos) === null ? 0 : L(pos) + 1) : 0;
            const onRight = spread() ? (R(pos) === null ? 0 : n - R(pos)) : n - pos;
            edgeL.style.setProperty('--thick', `${Math.round(onLeft / n * 9)}px`);
            edgeR.style.setProperty('--thick', `${Math.round(onRight / n * 9)}px`);
            ui();
            // Warm up the neighbours.
            for (const d of [1, -1, 2]) {
                const s2 = pos + d;
                if (s2 < 0 || s2 > maxPos()) continue;
                [L(s2), R(s2)].forEach(i => { if (i !== null) url(i); });
            }
        }

        function label(s) {
            if (!spread()) return pad(s + 1);
            const a = L(s), b = R(s);
            return [a, b].filter(v => v !== null).map(v => pad(v + 1)).join('–');
        }

        function ui() {
            count.innerHTML = `<b>${label(pos)}</b> / ${pad(n)}`;
            prevBtn.disabled = pos <= 0;
            nextBtn.disabled = pos >= maxPos();
            live.textContent = `Page ${label(pos).replace('–', ' and ')} of ${n}`;
            [...thumbs.children].forEach((t, i) => {
                const on = i === pos;
                t.setAttribute('aria-current', String(on));
                if (on) thumbs.scrollTo({ left: t.offsetLeft - thumbs.clientWidth / 2 + t.offsetWidth / 2, behavior: S.reduced ? 'auto' : 'smooth' });
            });
        }

        function buildThumbs() {
            thumbs.innerHTML = '';
            for (let s = 0; s <= maxPos(); s++) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'fb-thumb';
                btn.setAttribute('aria-label', `Go to page ${label(s)}`);
                [L(s), R(s)].filter(i => i !== null).forEach(i => {
                    const img = document.createElement('img');
                    img.alt = '';
                    img.loading = 'lazy';
                    Promise.resolve(src.thumb(i)).then(u => { img.src = u; });
                    btn.append(img);
                });
                btn.addEventListener('click', () => go(s));
                thumbs.append(btn);
            }
        }

        // ---------- Flips ----------
        let flip = null;
        let queued = null;
        const endOf = f => (f.dir > 0 ? 1 : 0);

        function applyLeaf(f) {
            const [front, back] = f.faces;
            setLeaf(now(front), now(back));
            [front, back].forEach(i => {
                if (i !== null && !now(i)) url(i).then(() => { if (flip === f) setLeaf(now(front), now(back)); });
            });
        }

        // Sets up the pages for a turn from pos to `to` and returns the flip.
        function begin(to) {
            const dir = to > pos ? 1 : -1;
            const from = pos;
            let faces;
            if (spread()) {
                if (dir > 0) {
                    faces = [R(from), L(to)];
                    setPage(rightEl, R(to));
                    setPage(leftEl, L(from));
                } else {
                    faces = [R(to), L(from)];
                    setPage(leftEl, L(to));
                    setPage(rightEl, R(from));
                }
            } else {
                faces = [dir > 0 ? from : to, null];
                setPage(rightEl, dir > 0 ? to : from);
            }
            const f = { from, to, dir, t: dir > 0 ? 0 : 1, curl: 40, faces, anim: null, peek: false };
            flip = f;
            applyLeaf(f);
            leaf.classList.add('is-on');
            render();
            return f;
        }

        function render() {
            const f = flip;
            if (!f) return;
            pose(f.t, f.dir, f.curl);
            const a = shiftOf(f.dir > 0 ? f.from : f.to);
            const b = shiftOf(f.dir > 0 ? f.to : f.from);
            book.style.setProperty('--shift', `${S.lerp(a, b, easeInOut(f.t)).toFixed(2)}px`);
        }

        function settle(done) {
            if (!flip) return;
            if (done) pos = flip.to;
            flip.anim = null;
            flip = null;
            leaf.classList.remove('is-on');
            showStatic();
            if (queued !== null) {
                const q = queued;
                queued = null;
                go(q);
            }
        }

        // Animates f.t to target. Resolves false if another animation took over.
        function animate(f, target, duration, easing = easeInOut) {
            const token = {};
            f.anim = token;
            const start = f.t;
            const t0 = performance.now();
            return new Promise(resolve => {
                const step = () => {
                    if (f.anim !== token || flip !== f) {
                        S.unloop(step);
                        resolve(false);
                        return;
                    }
                    const k = clamp((performance.now() - t0) / Math.max(1, duration));
                    f.t = S.lerp(start, target, easing(k));
                    render();
                    if (k >= 1) {
                        S.unloop(step);
                        f.anim = null;
                        resolve(true);
                    }
                };
                S.loop(step);
            });
        }

        async function go(to) {
            to = clamp(Math.round(to), 0, maxPos());
            if (flip) {
                if (flip.peek && flip.to === to) {
                    const f = flip;
                    f.peek = false;
                    f.curl = 40;
                    S.sound.play('flip');
                    if (await animate(f, endOf(f), 820)) settle(true);
                    return;
                }
                if (!flip.peek) {
                    queued = to;
                    return;
                }
                settle(false);
            }
            if (to === pos) return;
            const f = begin(to);
            S.sound.play('flip');
            if (S.reduced) {
                f.t = endOf(f);
                render();
                settle(true);
                return;
            }
            if (await animate(f, endOf(f), 950)) settle(true);
        }

        // ---------- Pointer: drag, click, corner peek ----------
        let press = null;
        const spineX = () => book.getBoundingClientRect().left + (spread() ? pw : 0);

        book.addEventListener('pointerdown', e => {
            if (e.button !== 0 || (flip && !flip.peek)) return;
            const r = book.getBoundingClientRect();
            const x = e.clientX - r.left;
            let dir = spread() ? (x > r.width / 2 ? 1 : -1) : (x > r.width * .35 ? 1 : -1);
            if ((dir > 0 && pos >= maxPos()) || (dir < 0 && pos <= 0)) dir = 0;
            press = { x0: e.clientX, x: e.clientX, dir, started: false, vx: 0, lt: performance.now(), spine: spineX() };
            book.setPointerCapture(e.pointerId);
        });

        book.addEventListener('pointermove', e => {
            if (!press) {
                peek(e);
                return;
            }
            const t = performance.now();
            press.vx = (e.clientX - press.x) / Math.max(1, t - press.lt);
            press.x = e.clientX;
            press.lt = t;
            if (!press.started) {
                if (!press.dir || Math.abs(e.clientX - press.x0) < 6) return;
                press.started = true;
                book.classList.add('is-dragging');
                if (flip && flip.peek && flip.dir === press.dir) {
                    flip.peek = false;
                    flip.anim = null;
                } else {
                    if (flip) settle(false);
                    begin(pos + press.dir);
                }
                flip.curl = 55;
                S.sound.play('flip');
            }
            if (!flip) return;
            const { x0, spine, dir } = press;
            const p = dir > 0
                ? clamp((x0 - e.clientX) / Math.max(40, x0 - (spine - pw)))
                : clamp((e.clientX - x0) / Math.max(40, spine + pw - x0));
            const edge = dir > 0 ? pw * (1 - 2 * p) : -pw * (1 - 2 * p);
            flip.t = Math.acos(clamp(edge / pw, -1, 1)) / Math.PI;
            render();
        });

        const release = async () => {
            const pr = press;
            press = null;
            book.classList.remove('is-dragging');
            if (!pr) return;
            if (!pr.started) {
                if (pr.dir) go(pos + pr.dir);
                return;
            }
            const f = flip;
            if (!f) return;
            const complete = f.dir > 0 ? f.t > .5 || pr.vx < -.45 : f.t < .5 || pr.vx > .45;
            const target = complete ? endOf(f) : 1 - endOf(f);
            if (await animate(f, target, 240 + Math.abs(target - f.t) * 560, easeOut)) settle(complete);
        };
        book.addEventListener('pointerup', release);
        book.addEventListener('pointercancel', release);

        // Hovering near an outer edge lifts that corner a little.
        const PEEK = .07;
        function unpeek() {
            const f = flip;
            if (!f?.peek) return;
            f.goal = 'rest';
            animate(f, 1 - endOf(f), 300, easeOut).then(ok => { if (ok && flip === f) settle(false); });
        }
        function peek(e) {
            if (!S.fine || S.reduced || e.pointerType !== 'mouse') return;
            if (flip && !flip.peek) return;
            const r = book.getBoundingClientRect();
            const x = e.clientX - r.left;
            const band = pw * .14;
            let dir = 0;
            if (x > r.width - band && pos < maxPos()) dir = 1;
            else if (spread() && x < band && pos > 0) dir = -1;
            if (!dir) {
                if (flip?.peek && flip.goal !== 'rest') unpeek();
                return;
            }
            if (flip?.peek) {
                if (flip.dir !== dir) settle(false);
                else {
                    if (flip.goal === 'rest') {
                        flip.goal = 'peek';
                        animate(flip, dir > 0 ? PEEK : 1 - PEEK, 300, easeOut);
                    }
                    return;
                }
            }
            const f = begin(pos + dir);
            f.peek = true;
            f.goal = 'peek';
            f.curl = 36;
            animate(f, dir > 0 ? PEEK : 1 - PEEK, 420, easeOut);
        }
        book.addEventListener('pointerleave', () => { if (!press) unpeek(); });

        // ---------- Buttons & keys ----------
        prevBtn.addEventListener('click', () => go(pos - 1));
        nextBtn.addEventListener('click', () => go(pos + 1));
        fullBtn.addEventListener('click', () => {
            if (document.fullscreenElement) document.exitFullscreen();
            else fb.requestFullscreen?.();
        });
        fb.addEventListener('keydown', e => {
            const keys = { ArrowRight: 1, PageDown: 1, ArrowLeft: -1, PageUp: -1 };
            if (e.key in keys) {
                e.preventDefault();
                go(pos + keys[e.key]);
            } else if (e.key === 'Home') {
                e.preventDefault();
                go(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                go(maxPos());
            }
        });

        // ---------- Layout ----------
        function layout() {
            const full = document.fullscreenElement === fb;
            const W = (full ? innerWidth : el.clientWidth) - 16;
            const H = full ? innerHeight - 200 : Math.min(innerHeight * .8, 940) - 70;
            const next = W >= 760 ? 'spread' : 'single';
            const maxW = next === 'spread' ? (W - 60) / 2 : W - 20;
            pw = Math.max(120, Math.floor(Math.min(maxW, H * src.ratio)));
            ph = Math.round(pw / src.ratio);
            if (next !== mode) {
                // Keep roughly the same page when switching between spreads and single pages.
                const page = spread() ? (R(pos) ?? L(pos) ?? 0) : pos;
                mode = next;
                pos = spread() ? Math.floor((page + 1) / 2) : page;
                fb.classList.toggle('is-single', !spread());
                buildThumbs();
            }
            book.style.width = `${spread() ? pw * 2 : pw}px`;
            book.style.height = `${ph}px`;
            leftEl.style.width = rightEl.style.width = `${pw}px`;
            leaf.style.height = `${ph}px`;
            sizeLeaf();
            if (!flip) showStatic();
        }

        mode = el.clientWidth >= 760 ? 'spread' : 'single';
        fb.classList.toggle('is-single', !spread());
        buildThumbs();
        layout();
        let resizeTimer;
        new ResizeObserver(() => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (flip) settle(false);
                layout();
            }, 100);
        }).observe(el);
        document.addEventListener('fullscreenchange', () => setTimeout(layout, 50));
        S.decorate?.(el);
        S.measureAll?.();
    }
})();
