// Project page: tabs and the floating tab dock, figures in the side card, tool chips,
// cover image, cinema video with ambient light, and previous/next projects.
// Needs js/site.js. Phones, flip book and photo ring load on demand (data-md-script).
(() => {
    const S = window.Site;
    const $ = (sel, el = document) => el.querySelector(sel);
    const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
    const pad = n => String(n).padStart(2, '0');
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const name = new URLSearchParams(location.search).get('p');
    const src = `content/projects/${name}.md`;

    const ICON = {
        right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
        left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
    };

    S.setup.then(() => {
        $$('.p-contrib').forEach((c, i) => { $('.p-num', c).textContent = pad(i + 1); });
        chips();
        outcome();
        deliverableLayout();
        tabs();
        cover();
        stats();
        cinema();
        neighbours();
        $$('.card').forEach(card => S.tilt(card, { max: 0 }));
    });

    // "A, B, C" in the tools line becomes chips (commas inside brackets are kept).
    function chips() {
        const box = $('.p-chips');
        if (!box) return;
        const parts = box.textContent.split(/,(?![^()]*\))/).map(t => t.trim()).filter(Boolean);
        box.innerHTML = parts.map(t => `<span class="p-chip">${esc(t)}</span>`).join('');
    }

    // The first sentence of the outcome becomes a large statement.
    function outcome() {
        const body = $('.p-outcome-body');
        if (!body) return;
        // A single paragraph arrives unwrapped (see js/template.js); wrap it first.
        if (!body.firstElementChild && body.textContent.trim()) body.innerHTML = `<p>${esc(body.textContent.trim())}</p>`;
        const first = body.firstElementChild;
        if (!first || first.tagName !== 'P' || first.children.length) return;
        const text = first.textContent.trim();
        const m = text.match(/^(.+?[.!?])\s+(?=[A-Z“"‘'])(.+)$/s);
        const statement = document.createElement('p');
        statement.className = 'p-statement';
        statement.textContent = m ? m[1] : text;
        first.before(statement);
        if (m) first.textContent = m[2];
        else first.remove();
    }

    // The deliverable panel lays out its text card according to the media it holds.
    function deliverableLayout() {
        const panel = $('.p-deliver');
        if (!panel) return;
        const tiktoks = $$('.phones [data-video-id]', panel).length;
        panel.classList.toggle('has-video', !!$('.p-video', panel));
        panel.classList.toggle('has-magazine', !!$('.p-magazine', panel));
        panel.classList.toggle('has-phones', tiktoks > 1);
        panel.classList.toggle('has-single-phone', tiktoks === 1);
        panel.classList.toggle('has-gallery', !!$('.p-ring', panel));
    }

    // ---------- Tabs ----------

    function tabs() {
        $$('.p-panel').filter(p => !p.querySelector('.card')).forEach(p => p.remove());
        const panels = $$('.p-panel');
        const nav = $('.p-tabs');
        const wrap = $('.p-panels');
        if (!panels.length) return;

        const buttons = panels.map((panel, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'p-tab';
            b.id = `tab-${panel.id}`;
            b.setAttribute('role', 'tab');
            b.setAttribute('aria-controls', panel.id);
            b.innerHTML = `<span class="mono">${pad(i + 1)}</span><span></span>${ICON.right}`;
            b.children[1].textContent = panel.dataset.tab;
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('aria-labelledby', b.id);
            panel.tabIndex = 0;
            nav.append(b);
            return b;
        });

        // A floating copy of the tabs for when the side card has scrolled away.
        const dock = S.h('<nav class="p-dock" aria-label="Project sections"></nav>');
        const dockButtons = panels.map((panel, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = panel.dataset.tab;
            b.addEventListener('click', () => {
                show(i, true);
                S.scrollTo(wrap.getBoundingClientRect().top + window.scrollY - 92);
            });
            dock.append(b);
            return b;
        });
        document.body.append(dock);

        let current = -1;
        function show(i, byUser) {
            if (i === current) return;
            current = i;
            buttons.forEach((b, k) => {
                b.setAttribute('aria-selected', String(k === i));
                b.tabIndex = k === i ? 0 : -1;
            });
            dockButtons.forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
            panels.forEach((p, k) => { p.hidden = k !== i; });
            const panel = panels[i];
            if (byUser && !S.reduced) {
                const items = [...panel.children].flatMap(c => (c.classList.contains('p-group') ? [...c.children] : [c]));
                items.forEach((c, n) => c.style.setProperty('--n', n));
                panel.classList.remove('is-entering');
                void panel.offsetWidth;
                panel.classList.add('is-entering');
                clearTimeout(panel._enter);
                panel._enter = setTimeout(() => panel.classList.remove('is-entering'), 1400);
            }
            if (byUser) {
                history.replaceState(null, '', `${location.pathname}${location.search}#${panel.id}`);
                S.sound.play('click');
            }
            // Components inside measure themselves once the panel is visible.
            requestAnimationFrame(() => {
                dispatchEvent(new Event('resize'));
                S.measureAll();
            });
        }

        buttons.forEach((b, i) => b.addEventListener('click', () => show(i, true)));
        nav.addEventListener('keydown', e => {
            const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
            if (!step) return;
            e.preventDefault();
            const i = (current + step + buttons.length) % buttons.length;
            show(i, true);
            buttons[i].focus();
        });

        const hash = decodeURIComponent(location.hash.slice(1));
        show(Math.max(0, panels.findIndex(p => p.id === hash)), false);

        let navSeen = true, panelsSeen = false;
        const update = () => dock.classList.toggle('is-on', !navSeen && panelsSeen && panels.length > 1);
        S.visible(nav, v => { navSeen = v; update(); }, '0px');
        S.visible(wrap, v => { panelsSeen = v; update(); }, '-20% 0px -20% 0px');
    }

    // ---------- Figures in the side card ----------

    async function stats() {
        const dl = $('.p-stats');
        if (!dl) return;
        let meta = {};
        try { meta = (await window.mdContent(src)).meta; } catch { /* no file */ }
        const slots = [];
        const add = (value, label, word = false) => {
            if (slots.length >= 2) return null;
            const div = document.createElement('div');
            div.innerHTML = '<dt></dt><dd></dd>';
            div.firstChild.textContent = value;
            div.firstChild.classList.toggle('is-word', word);
            div.lastChild.textContent = label;
            dl.append(div);
            slots.push(div);
            return div;
        };
        const set = (div, value, label) => {
            div.firstChild.textContent = value;
            div.firstChild.classList.remove('is-word');
            div.lastChild.textContent = label;
        };

        // A timeline that starts with a number becomes a figure ("47 Weeks").
        const m = (meta.timeline || '').trim().match(/^(\d+)\s*(.*)$/);
        if (m) add(m[1], m[2] || 'Weeks');

        const tiktoks = $$('.phones [data-video-id]').length;
        const photos = $$('.ring .ring-item, .ring-spin .ring-item').length;
        const video = $('.cinema-video');
        const contributions = $$('.p-contrib').length;
        if (tiktoks) add(pad(tiktoks), tiktoks === 1 ? 'TikTok video' : 'TikTok videos');
        else if (meta.magazine) {
            const slot = add('··', 'Pages');
            fetch(`${meta.magazine.replace(/\/$/, '')}/manifest.json`).then(r => r.json()).then(j => set(slot, pad(j.pages), 'Magazine pages')).catch(() => slot?.remove());
        } else if (photos) add(pad(photos), 'Event photos');
        else if (video) {
            const slot = add('··:··', 'Runtime');
            const fill = () => {
                if (!video.duration || !slot) return;
                const t = Math.round(video.duration);
                set(slot, `${Math.floor(t / 60)}:${pad(t % 60)}`, 'Minutes of film');
            };
            if (video.readyState >= 1) fill();
            else video.addEventListener('loadedmetadata', fill, { once: true });
        }
        if (contributions) add(pad(contributions), contributions === 1 ? 'Contribution' : 'Contributions');
    }

    // ---------- Cover ----------

    async function cover() {
        const hero = $('.p-hero');
        if (!hero) return;
        let img = $('.p-hero-img', hero);
        if (!img) {
            // No "thumbnail:" in the file: use the image of the project's card.
            const me = (await S.projects().catch(() => [])).find(p => p.name === name);
            if (!me?.thumb) return;
            img = document.createElement('img');
            img.className = 'p-hero-img';
            img.alt = me.title;
            img.src = me.thumb;
            hero.prepend(img);
        }
        const check = () => {
            if (img.naturalHeight > img.naturalWidth * 1.05) {
                hero.classList.add('is-portrait');
                const bg = document.createElement('img');
                bg.className = 'p-hero-bg';
                bg.alt = '';
                bg.src = img.currentSrc || img.src;
                img.before(bg);
            }
        };
        if (img.complete && img.naturalWidth) check();
        else img.addEventListener('load', check, { once: true });
    }

    // ---------- Cinema video ----------

    function cinema() {
        for (const box of $$('.cinema')) {
            const video = $('video', box);
            const play = $('.cinema-play', box);
            const tc = $('[data-timecode]', box);
            const canvas = $('.cinema-ambient', box);
            const ctx = canvas.getContext('2d');
            canvas.width = 48;
            canvas.height = 27;
            const paint = source => {
                try { ctx.drawImage(source, 0, 0, canvas.width, canvas.height); } catch { /* not ready */ }
            };
            if (video.poster) {
                const img = new Image();
                img.onload = () => paint(img);
                img.src = video.poster;
            } else {
                video.addEventListener('loadeddata', () => paint(video), { once: true });
            }
            play.addEventListener('click', () => {
                box.classList.add('is-started');
                video.controls = true;
                video.play().catch(() => {});
            });
            video.addEventListener('play', () => box.classList.add('is-playing', 'is-started'));
            video.addEventListener('pause', () => box.classList.remove('is-playing'));
            const fmt = t => [Math.floor(t / 3600), Math.floor(t / 60) % 60, Math.floor(t) % 60].map(pad).join(':');
            let last = 0;
            S.loop((dt, now) => {
                if (video.paused) return;
                tc.textContent = fmt(video.currentTime);
                if (now - last > 90) {
                    last = now;
                    paint(video);
                }
            });
        }
    }

    // ---------- Position, previous and next ----------

    async function neighbours() {
        let list = [];
        try { list = await S.projects(); } catch { return; }
        const i = list.findIndex(p => p.name === name);
        if (i < 0) return;
        const total = list.length;
        $$('[data-p-index]').forEach(el => { el.innerHTML = `<b>${pad(i + 1)}</b> / ${pad(total)}`; });
        const prev = list[(i - 1 + total) % total];
        const next = list[(i + 1) % total];

        $('.p-steps').innerHTML = `
            <a class="p-step" href="${esc(prev.href)}" data-title="${esc(prev.title)}" aria-label="Previous project: ${esc(prev.title)}">${ICON.left}<span>Previous</span></a>
            <a class="p-step" href="${esc(next.href)}" data-title="${esc(next.title)}" aria-label="Next project: ${esc(next.title)}"><span>Next</span>${ICON.right}</a>`;

        const holder = $('.p-next');
        holder.innerHTML = `
            <a class="card next" href="${esc(next.href)}" data-title="${esc(next.title)}" data-cursor="Next">
                <span class="next-media">${next.thumb ? `<img src="${esc(next.thumb)}" alt="" loading="lazy">` : ''}</span>
                <span class="next-text">
                    <span class="next-label mono">Next project · <b>${pad(next.index + 1)}</b> / ${pad(total)} · ${esc(next.category)}</span>
                    <span class="next-title">${esc(next.title)}</span>
                    <span class="next-sum">${esc(next.summary)}</span>
                </span>
                <span class="next-go">${ICON.right}</span>
            </a>`;
        const card = $('.card', holder);
        if (next.accent) card.style.setProperty('--accent', next.accent);
        S.tilt(card, { max: 0 });
    }
})();
