// Home page: boot screen, hero, tape, work grid (filters, grid/list views, hover
// effects), formats showcase, strengths stack, timeline, tools orbit and globe.
// Needs js/site.js.
(() => {
    const S = window.Site;
    const root = document.documentElement;
    const $ = (sel, el = document) => el.querySelector(sel);
    const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
    const pad = n => String(n).padStart(2, '0');
    const smooth = (a, b, v) => {
        const t = S.clamp((v - a) / (b - a));
        return t * t * (3 - 2 * t);
    };
    const EASE = 'cubic-bezier(.16, 1, .3, 1)';

    boot();
    S.setup.then(() => {
        const email = $('.contact-email');
        if (email) email.textContent = email.dataset.text = email.textContent.replace('@', '@\u200b');
        hero();
        tape();
        work();
        formats();
        strengths();
        timeline();
        orbit();
        globe();
    });

    // ---------- Boot screen (first visit per session) ----------

    function boot() {
        if (!root.classList.contains('boot-on')) return;
        const el = S.h(`<div class="boot" aria-hidden="true">
            <div class="boot-log mono"></div>
            <div class="boot-center"><div class="boot-count"><span>0</span><span>0</span><span>0</span></div><div class="boot-name mono"></div></div>
            <div class="boot-foot mono"><span>Portfolio OS</span><span class="boot-bar"><i></i></span><span class="boot-skip">${S.fine ? 'Click' : 'Tap'} to skip</span></div>
        </div>`);
        document.body.append(el);
        S.lenis?.stop();

        const digits = $$('.boot-count span', el);
        const bar = $('.boot-bar', el);
        const log = $('.boot-log', el);
        const nameEl = $('.boot-name', el);
        const start = performance.now();
        let shown = 0, isReady = false, skip = false, finished = false;

        // Log lines print in order, at least 280 ms apart.
        let queue = Promise.resolve();
        const line = html => {
            queue = queue.then(() => {
                log.insertAdjacentHTML('beforeend', `<span>${html}</span>`);
                return S.wait(280);
            });
            return queue;
        };
        line('&gt; portfolio.sys');
        line('&gt; loading case files');

        S.entered.then(async () => {
            line(`&gt; ${pad($$('.project').length)} projects found <b>OK</b>`);
            const name = ($('.hero-name .sr-only')?.textContent || '').replace(/\.$/, '').toUpperCase();
            S.scramble(nameEl, name, 1000);
            const img = $('.holo-photo img');
            await Promise.race([img?.decode?.().catch(() => {}), S.wait(1500)]);
            await line('&gt; calibrating display <b>OK</b>');
            isReady = true;
        });

        el.addEventListener('click', () => { skip = true; });
        addEventListener('keydown', () => { skip = true; }, { once: true });

        const step = (dt, now) => {
            const t = now - start;
            const target = isReady ? 1 : Math.min(.88, t / 1900);
            shown = skip && isReady ? 1 : S.damp(shown, target, isReady ? 5 : 2.5, dt);
            const v = String(Math.min(100, Math.round(shown * 100))).padStart(3, '0');
            digits.forEach((d, i) => { d.textContent = v[i]; });
            bar.style.setProperty('--p', shown.toFixed(4));
            if (!finished && isReady && (skip || (shown > .993 && t > 1700))) finish();
        };
        S.loop(step);

        function finish() {
            finished = true;
            S.unloop(step);
            digits.forEach((d, i) => { d.textContent = '100'[i]; });
            S.store.set('booted', '1', true);
            el.classList.add('is-done');
            setTimeout(() => {
                root.classList.remove('boot-on');
                S.lenis?.start();
                S.live();
            }, 380);
            setTimeout(() => el.remove(), 1400);
        }
    }

    // ---------- Hero ----------

    function hero() {
        const heroEl = $('.hero');
        if (!heroEl) return;

        const cards = $$('.project');
        const cats = new Set(cards.map(c => c.dataset.cat).filter(Boolean));
        $('.hero-index').innerHTML = `<li><b>${pad(cards.length)}</b> Projects</li><li><b>${pad(cats.size)}</b> Disciplines</li>`;

        // A barcode seeded by the name, so it never changes.
        const nameText = $('.hero-name .sr-only')?.textContent || 'Theodora';
        let seed = [...nameText].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
        const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
        let x = 0, bars = '';
        while (x < 100) {
            const w = .5 + rand() * 2.2;
            if (rand() > .3) bars += `<rect x="${x.toFixed(2)}" width="${w.toFixed(2)}" height="26"/>`;
            x += w + .6 + rand() * 1.2;
        }
        const code = $('.holo-code');
        code.setAttribute('viewBox', '0 0 100 26');
        code.innerHTML = `<g fill="currentColor">${bars}</g>`;

        const holoCard = $('.holo-card');
        S.tilt(holoCard, { scope: heroEl, max: 13, lambda: 5 });
        // Touch screens have no pointer to tilt the card, so it sways slowly and the foil shifts.
        if (!S.fine && !S.reduced) {
            let on = true;
            S.visible(holoCard, v => { on = v; }, '0px');
            holoCard.style.setProperty('--hover', '.7');
            S.loop((dt, now) => {
                if (!on) return;
                const t = now / 1000;
                holoCard.style.setProperty('--rx', `${(Math.sin(t * .6) * 7).toFixed(2)}deg`);
                holoCard.style.setProperty('--ry', `${(Math.sin(t * .45 + 1) * 11).toFixed(2)}deg`);
                holoCard.style.setProperty('--mx', `${(50 + Math.sin(t * .45 + 1) * 40).toFixed(1)}%`);
                holoCard.style.setProperty('--my', `${(50 - Math.sin(t * .6) * 35).toFixed(1)}%`);
            });
        }

        // Scroll away: the name sinks slower than the page, the card drifts up.
        const lines = $('.hero-lines');
        const bottom = $('.hero-bottom');
        const holo = $('.holo');
        S.scene(heroEl, (p, s) => {
            const k = S.clamp(S.scroll.y / Math.max(1, s.h));
            bottom.style.transform = `translate3d(0, ${(k * 22).toFixed(2)}vh, 0)`;
            bottom.style.opacity = (1 - k * 1.15).toFixed(3);
            holo.style.translate = `0 ${(k * -14).toFixed(2)}vh`;
            lines.style.translate = `0 ${(k * 8).toFixed(2)}vh`;
            lines.style.opacity = (1 - k * 1.4).toFixed(3);
        });

        // The name reacts to the pointer once its intro is over.
        const nameEl = $('.hero-name');
        const chars = $$('.split .c', nameEl);
        chars.forEach(c => { if (c.textContent === '.') c.classList.add('is-dot'); });
        let centers = [];
        const measure = () => {
            centers = chars.map(c => {
                const r = c.getBoundingClientRect();
                return { x: r.left + r.width / 2, y: r.top + window.scrollY + r.height * .55, k: 0 };
            });
            chars.forEach(c => c.style.removeProperty('--k'));
        };
        const settle = () => setTimeout(() => {
            nameEl.classList.add('is-settled');
            measure();
        }, 2000);
        if (root.classList.contains('is-live')) settle();
        else document.addEventListener('site:live', settle, { once: true });
        if (!S.fine || S.reduced) return;

        let resizeTimer;
        addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => nameEl.classList.contains('is-settled') && measure(), 200);
        });
        let px = -9999, py = -9999;
        heroEl.addEventListener('pointermove', e => {
            px = e.clientX;
            py = e.clientY + window.scrollY;
        });
        heroEl.addEventListener('pointerleave', () => { px = py = -9999; });
        S.loop(dt => {
            if (!centers.length || S.scroll.y > innerHeight) return;
            const radius = Math.max(170, innerWidth * .2);
            chars.forEach((c, i) => {
                const m = centers[i];
                const target = Math.max(0, 1 - Math.hypot(px - m.x, py - m.y) / radius) ** 2;
                const k = S.damp(m.k, target, 7, dt);
                if (Math.abs(k - m.k) > .001) {
                    m.k = k;
                    c.style.setProperty('--k', k.toFixed(3));
                }
            });
        });
    }

    // ---------- Tape: two crossing marquees driven by scroll speed ----------

    function tape() {
        const cats = $$('.filters [data-filter]').map(b => b.dataset.filter).filter(f => f !== 'All');
        const star = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z"/></svg>';
        for (const track of $$('[data-marquee]')) {
            const dir = +track.dataset.marquee || 1;
            const unit = cats.map(c => `<span class="tape-item">${c}${star}</span>`).join('');
            track.innerHTML = unit;
            const unitW = Math.max(1, track.scrollWidth);
            const reps = Math.ceil((innerWidth * 1.2) / unitW) + 1;
            track.innerHTML = unit.repeat(reps * 2);
            const half = unitW * reps;
            let x = -Math.random() * half, on = true;
            S.visible(track, v => { on = v; });
            S.loop(dt => {
                if (!on) return;
                const speed = 55 + Math.min(Math.abs(S.scroll.v) * .35, 1400);
                x -= speed * dt * dir * S.scroll.dir;
                const m = ((x % half) + half) % half;
                track.style.transform = `translate3d(${(m - half).toFixed(1)}px, 0, 0)`;
            });
        }
    }

    // ---------- Work ----------

    function work() {
        const grid = $('.work-grid');
        if (!grid) return;
        const cards = $$('.project', grid);
        const buttons = $$('.filters [data-filter]');
        const pill = $('.filters-pill');
        cards.forEach((c, i) => { $('.project-no', c).textContent = pad(i + 1); });

        // Images marked data-fit="contain" are shown whole, over a blurred copy.
        $$('.project-media img[data-fit="contain"]', grid).forEach(img => {
            const bg = document.createElement('div');
            bg.className = 'media-bg';
            bg.style.setProperty('--bg-img', `url("${new URL(img.getAttribute('src'), location.href).href}")`);
            img.before(bg);
        });

        // Phones get a dropdown with the same choices instead of the row of filters (CSS shows one of the two).
        const pick = S.h(`<label class="filter-pick"><span class="mono">Show</span><select aria-label="Filter projects"></select><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></label>`);
        const select = pick.querySelector('select');
        buttons.forEach(b => {
            const f = b.dataset.filter;
            const n = f === 'All' ? cards.length : cards.filter(c => c.dataset.cat === f).length;
            b.insertAdjacentHTML('beforeend', `<sup>${n}</sup>`);
            select.add(new Option(`${f === 'All' ? 'All projects' : f} (${n})`, f));
        });
        $('.filters').before(pick);
        select.addEventListener('change', () => buttons.find(b => b.dataset.filter === select.value)?.click());

        const placePill = () => {
            const b = buttons.find(x => x.getAttribute('aria-pressed') === 'true');
            if (!b || !pill) return;
            pill.style.width = `${b.offsetWidth}px`;
            pill.style.height = `${b.offsetHeight}px`;
            pill.style.transform = `translate(${b.offsetLeft}px, ${b.offsetTop}px)`;
        };
        placePill();
        new ResizeObserver(placePill).observe($('.filters'));

        let busy = Promise.resolve();
        buttons.forEach(b => b.addEventListener('click', () => {
            if (b.getAttribute('aria-pressed') === 'true') return;
            buttons.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
            select.value = b.dataset.filter;
            placePill();
            busy = busy.then(() => applyFilter(b.dataset.filter));
        }));

        async function applyFilter(filter) {
            const match = c => filter === 'All' || c.dataset.cat === filter;
            const before = new Map(cards.filter(c => !c.hidden).map(c => [c, c.getBoundingClientRect()]));
            const leaving = cards.filter(c => !c.hidden && !match(c));
            if (!S.reduced) {
                await Promise.all(leaving.map(c => c.animate(
                    [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(.92)', filter: 'blur(8px)' }],
                    { duration: 240, easing: 'ease-in', fill: 'forwards' },
                ).finished));
            }
            cards.forEach(c => {
                c.getAnimations().forEach(a => a.cancel());
                c.hidden = !match(c);
            });
            S.measureAll();
            if (S.reduced) return;
            let enterIndex = 0;
            cards.filter(c => !c.hidden).forEach(c => {
                const a = before.get(c);
                const b = c.getBoundingClientRect();
                if (a) {
                    const dx = a.left - b.left, dy = a.top - b.top;
                    if (Math.abs(dx) + Math.abs(dy) > 1) {
                        c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 750, easing: EASE });
                    }
                } else {
                    c.animate(
                        [{ opacity: 0, transform: 'translateY(50px) scale(.94)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
                        { duration: 850, delay: enterIndex++ * 60, easing: EASE, fill: 'backwards' },
                    );
                }
            });
        }

        // Grid or list view, remembered per browser.
        const views = $$('.views [data-view]');
        const setView = (view, animate) => {
            views.forEach(v => v.setAttribute('aria-pressed', String(v.dataset.view === view)));
            const swap = () => {
                grid.dataset.layout = view;
                S.measureAll();
            };
            if (!animate || S.reduced) return swap();
            grid.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-in' }).finished.then(() => {
                swap();
                grid.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: EASE });
            });
        };
        const saved = S.store.get('work-view');
        if (saved === 'index' || saved === 'grid') setView(saved, false);
        views.forEach(v => v.addEventListener('click', () => {
            if (grid.dataset.layout === v.dataset.view) return;
            S.store.set('work-view', v.dataset.view);
            setView(v.dataset.view, true);
        }));

        // Images drift inside their frames while scrolling.
        cards.forEach(c => {
            const media = $('.project-media', c);
            S.scene(c, p => { media.style.setProperty('--iy', `${((p - .5) * -10).toFixed(2)}%`); });
        });

        // Short muted clip for cards that have "preview:" in their file.
        const clip = c => {
            let video = null, want = false;
            return on => {
                want = on && grid.dataset.layout === 'grid';
                if (!want) {
                    c.classList.remove('is-previewing');
                    video?.pause();
                    return;
                }
                if (!video) {
                    video = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, preload: 'auto', src: c.dataset.preview });
                    video.setAttribute('aria-hidden', 'true');
                    $('.project-media', c).append(video);
                }
                video.play().then(() => want && c.classList.add('is-previewing')).catch(() => {});
            };
        };

        // Touch screens have no hover: the card in the middle of the screen lights up
        // and plays its clip instead.
        if (!S.fine) {
            cards.forEach(c => {
                const play = c.dataset.preview && !S.reduced ? clip(c) : null;
                S.visible(c, v => {
                    c.classList.toggle('is-focus', v);
                    play?.(v);
                }, '-42% 0px -42% 0px');
            });
            return;
        }
        if (S.reduced) return;

        cards.forEach(c => S.tilt(c, { max: 5 }));

        cards.filter(c => c.dataset.preview).forEach(c => {
            const play = clip(c);
            c.addEventListener('pointerenter', () => play(true));
            c.addEventListener('pointerleave', () => play(false));
        });

        // A brief liquid wobble on the image when the pointer arrives.
        const displace = $('#liquid feDisplacementMap');
        let liquidCard = null, liquidStart = 0;
        const liquid = (dt, now) => {
            const t = S.clamp((now - liquidStart) / 900);
            displace?.setAttribute('scale', ((1 - t) ** 3 * 70).toFixed(1));
            if (t >= 1) {
                liquidCard?.classList.remove('is-liquid');
                liquidCard = null;
                S.unloop(liquid);
            }
        };
        cards.forEach(c => c.addEventListener('pointerenter', () => {
            if (grid.dataset.layout !== 'grid' || c.classList.contains('is-previewing')) return;
            liquidCard?.classList.remove('is-liquid');
            liquidCard = c;
            c.classList.add('is-liquid');
            liquidStart = performance.now();
            S.loop(liquid);
        }));

        // List view: the project image follows the pointer.
        const preview = $('.work-preview');
        const imgs = new Map(cards.map(c => {
            const img = document.createElement('img');
            img.alt = '';
            img.src = $('.project-media img', c).getAttribute('src');
            img.loading = 'lazy';
            preview.append(img);
            return [c, img];
        }));
        let tx = 0, ty = 0, px = 0, py = 0, rot = 0, on = false;
        grid.addEventListener('pointermove', e => {
            tx = e.clientX;
            ty = e.clientY;
            if (!on) {
                px = tx;
                py = ty;
            }
        });
        cards.forEach(c => c.addEventListener('pointerenter', () => {
            if (grid.dataset.layout !== 'index') return;
            imgs.forEach((img, card) => img.classList.toggle('is-on', card === c));
            preview.classList.add('is-on');
            on = true;
        }));
        grid.addEventListener('pointerleave', () => {
            preview.classList.remove('is-on');
            on = false;
        });
        S.loop(dt => {
            if (!on && !preview.classList.contains('is-on')) return;
            const nx = S.damp(px, tx, 9, dt), ny = S.damp(py, ty, 9, dt);
            rot = S.damp(rot, S.clamp((nx - px) / Math.max(dt, 1e-3) * .012, -14, 14), 6, dt);
            px = nx;
            py = ny;
            const w = preview.offsetWidth, h = preview.offsetHeight;
            preview.style.transform = `translate3d(${(px - w / 2).toFixed(1)}px, ${(py - h / 2).toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`;
        });
    }

    // ---------- Formats: phone, magazine, screen ----------

    function formats() {
        const sec = $('.formats');
        if (!sec) return;
        const track = $('.formats-track', sec);
        const phone = $('.fmt-phone', sec);
        const book = $('.fmt-book', sec);
        const screen = $('.fmt-screen', sec);
        const objs = [phone, book, screen];
        const caps = $$('.formats-caps li', sec);
        const bar = $('.formats-bar', sec);

        const accents = objs.map(() => '');
        let active = -1;
        S.projects().then(list => {
            objs.forEach((o, i) => {
                accents[i] = list.find(p => p.href === o.getAttribute('href'))?.accent || '';
            });
            if (active >= 0) sec.style.setProperty('--fmt-accent', accents[active] || 'var(--accent)');
        });

        const phoneStep = setupPhone(phone);
        const bookStep = setupBook(book);
        const screenStep = setupScreen(screen);
        const steps = [phoneStep, bookStep, screenStep];

        if (S.reduced) {
            sec.classList.add('is-static');
            steps.forEach(fn => fn(.6, 1));
            return;
        }

        S.scene(track, p => {
            const n = objs.length;
            bar.style.setProperty('--p', p.toFixed(4));
            let best = 0, bestV = -1;
            objs.forEach((el, i) => {
                const lp = p * n - i;
                const enter = i === 0 ? 1 : smooth(-.32, .12, lp);
                const exit = i === n - 1 ? 0 : smooth(.8, 1.22, lp);
                const hold = S.clamp((lp - .08) / .74);
                const vis = enter * (1 - exit);
                const ty = (1 - enter) * 62 - exit * 52;
                const rx = (1 - enter) * 42 - exit * 32;
                const sc = .78 + .22 * enter - .14 * exit;
                el.style.transform = `translate(-50%, -50%) translate3d(0, ${ty.toFixed(2)}vh, 0) rotateX(${rx.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
                el.style.opacity = vis.toFixed(3);
                el.style.visibility = vis < .01 ? 'hidden' : 'visible';
                el.style.pointerEvents = vis > .6 ? 'auto' : 'none';
                steps[i](hold, vis);
                if (vis > bestV) {
                    bestV = vis;
                    best = i;
                }
            });
            if (best !== active) {
                active = best;
                caps.forEach((c, i) => c.classList.toggle('is-active', i === active));
                sec.style.setProperty('--fmt-accent', accents[active] || 'var(--accent)');
            }
        }, 'pin');
    }

    // Phone: TikTok covers from oEmbed swipe up while it turns.
    function setupPhone(el) {
        const inner = $('.phone', el);
        const media = $('.fmt-feed', el);
        const heart = $('.tt-heart', el);
        const author = $('.tt-author', el);
        const title = $('.tt-title', el);
        let items = [{ author: author.textContent, title: '' }];
        let index = -1;
        const trackEl = document.createElement('div');
        trackEl.className = 'feed-track';
        trackEl.append(...media.children);
        media.append(trackEl);

        const urls = (el.dataset.tiktok || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 4);
        if (urls.length) {
            Promise.all(urls.map(u => fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`)
                .then(r => (r.ok ? r.json() : null)).catch(() => null)))
                .then(data => {
                    const ok = data.filter(d => d?.thumbnail_url);
                    if (!ok.length) return;
                    trackEl.innerHTML = '';
                    ok.forEach((d, i) => {
                        const item = document.createElement('div');
                        item.className = 'feed-item';
                        item.style.top = `${i * 100}%`;
                        const img = document.createElement('img');
                        img.alt = '';
                        img.referrerPolicy = 'no-referrer';
                        img.src = d.thumbnail_url;
                        item.append(img);
                        trackEl.append(item);
                    });
                    items = ok.map(d => ({
                        author: `@${d.author_unique_id || d.author_name || ''}`,
                        title: (d.title || '').replace(/#\S+/g, '').replace(/\s+/g, ' ').trim(),
                    }));
                    index = -1;
                });
        }

        return hold => {
            inner.style.transform = `rotateY(${(-32 + hold * 58).toFixed(2)}deg) rotateZ(${(-5 + hold * 8).toFixed(2)}deg)`;
            const i = Math.min(items.length - 1, Math.floor(hold * items.length * .999));
            if (i !== index) {
                index = i;
                trackEl.style.transform = `translateY(${-i * 100}%)`;
                author.textContent = items[i].author;
                title.textContent = items[i].title;
                heart.classList.remove('is-pop');
                void heart.offsetWidth;
                heart.classList.add('is-pop');
            }
        };
    }

    // Magazine: the cover opens, then one more page turns.
    function setupBook(el) {
        const mb = $('.mbook', el);
        const leaves = $$('.mbook-leaf', el).reverse();
        const right = $('.mbook-right img', el);
        const faces = leaves.map(l => [$('.mbook-front img', l), $('.mbook-back img', l)]);
        leaves.forEach(l => l.querySelectorAll('.mbook-face').forEach(f => f.insertAdjacentHTML('beforeend', '<span class="shade"></span>')));
        const dir = el.dataset.magazine;
        if (dir) {
            const page = n => `${dir}/${pad(n)}.webp`;
            faces[0][0].src = page(1);
            faces[0][1].src = page(2);
            faces[1][0].src = page(3);
            faces[1][1].src = page(4);
            right.src = page(5);
        }
        return hold => {
            const open0 = smooth(.04, .42, hold);
            const open1 = smooth(.54, .94, hold);
            const shift = -25 * (1 - open0);
            mb.style.transform = `translateX(${shift.toFixed(2)}%) rotateX(${(26 - hold * 14).toFixed(2)}deg) rotateZ(${(-6 + hold * 6).toFixed(2)}deg)`;
            [open0, open1].forEach((o, i) => {
                const angle = o * 180;
                const z = angle < 90 ? (leaves.length - i) * .8 : (i + 1) * .8;
                leaves[i].style.transform = `translateZ(${z}px) rotateY(${(-angle).toFixed(2)}deg)`;
                leaves[i].style.setProperty('--shade', (Math.sin(o * Math.PI) * .32).toFixed(3));
            });
        };
    }

    // Screen: a CRT-style power-on, then the clip plays.
    function setupScreen(el) {
        const inner = $('.screen', el);
        const video = $('video', el);
        const tc = $('[data-timecode]', el);
        let playing = false;
        const fmt = t => {
            const f = Math.floor((t % 1) * 25);
            const s = Math.floor(t);
            return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60, f].map(pad).join(':');
        };
        S.loop(() => {
            if (playing) tc.textContent = fmt(video.currentTime);
        });
        return (hold, vis) => {
            const on = smooth(0, .14, hold);
            inner.style.setProperty('--on', on.toFixed(3));
            inner.style.transform = `rotateY(${(16 - hold * 28).toFixed(2)}deg) rotateX(${(8 - hold * 6).toFixed(2)}deg)`;
            const want = vis > .4 && on > .6;
            if (want && !playing && video.getAttribute('src')) {
                playing = true;
                video.play().catch(() => { playing = false; });
            } else if (!want && playing) {
                playing = false;
                video.pause();
            }
        };
    }

    // ---------- Strengths: cards stack and sink back ----------

    // Picture for each strength, picked from words in its title. Cards whose title
    // matches none get the pictures that are left, in this order.
    const VISUALS = [
        ['communication', /communicat|talk|speak|people|network|present|listen/i],
        ['planning', /plan|organi[sz]|time|schedul|deadline|priorit/i],
        ['social', /social|media|content|instagram|tiktok|youtube|marketing|engag/i],
        ['adapt', /adapt|flexib|learn|grow|change|curio/i],
    ];

    function pickVisuals(cards) {
        const kinds = cards.map(c => {
            const title = $('.stack-title', c).textContent;
            return VISUALS.find(([, re]) => re.test(title))?.[0];
        });
        const spare = VISUALS.map(([k]) => k).filter(k => !kinds.includes(k));
        return kinds.map((k, i) => k || spare.shift() || VISUALS[i % VISUALS.length][0]);
    }

    // Plays a picture step by step while its card is on screen, holds the last step,
    // then starts over. With reduced motion it shows the last step only.
    function sequence(viz, card) {
        const steps = +viz.dataset.steps || 4;
        const items = $$('[data-step], [data-only]', viz);
        const counts = $$('[data-count]', viz);
        const show = s => {
            viz.dataset.s = s;
            viz.style.setProperty('--p', (s / steps).toFixed(3));
            for (const el of items) {
                el.classList.toggle('on', 'only' in el.dataset ? +el.dataset.only === s : s >= +el.dataset.step);
            }
            for (const el of counts) el.textContent = pad(s);
        };
        if (S.reduced) {
            show(steps);
            return;
        }
        let n = 0, timer = 0;
        show(0);
        S.visible(card, v => {
            card.classList.toggle('is-paused', !v);
            clearInterval(timer);
            if (v) {
                timer = setInterval(() => {
                    n = n >= steps + 2 ? 0 : n + 1;
                    show(Math.min(n, steps));
                }, 1300);
            }
        }, '-15% 0px');
    }

    function strengths() {
        const cards = $$('.stack-card');
        if (!cards.length) return;
        const kinds = pickVisuals(cards);
        cards.forEach((c, i) => {
            c.style.setProperty('--i', i);
            $('.stack-no', c).textContent = `${pad(i + 1)} / ${pad(cards.length)}`;
            $('.stack-text', c).dataset.index = pad(i + 1);
            const vis = $('.stack-visual', c);
            const tpl = document.getElementById(`v-${kinds[i]}`);
            if (!tpl) return;
            vis.classList.add(`v-${kinds[i]}`);
            vis.append(tpl.content.cloneNode(true));
            sequence($('.viz', vis), c);
        });
        if (S.reduced) return;

        const stackEl = $('.stack');
        const stack = S.scene(stackEl, null, 'track');
        const inners = cards.map(c => $('.stack-inner', c));
        const state = cards.map(() => -1);
        let cardH = 0, gap = 0;
        const measure = () => {
            cardH = cards[0].offsetHeight;
            gap = parseFloat(getComputedStyle(cards[0]).marginBottom) || 0;
        };
        new ResizeObserver(measure).observe(stackEl);
        measure();
        const navH = 92;
        S.loop(() => {
            const { y, vh } = S.scroll;
            cards.forEach((c, i) => {
                let depth = 0;
                for (let j = i + 1; j < cards.length; j++) {
                    const top = stack.top + j * (cardH + gap);
                    const from = top - vh;
                    const to = top - (navH + j * 18);
                    depth += S.clamp((y - from) / Math.max(1, to - from));
                }
                const d = Math.round(depth * 1000) / 1000;
                if (d === state[i]) return;
                state[i] = d;
                inners[i].style.setProperty('--s', (1 - d * .05).toFixed(4));
                inners[i].style.setProperty('--b', (1 - d * .28).toFixed(3));
            });
        });
    }

    // ---------- Timeline ----------

    function timeline() {
        const tl = $('.timeline');
        if (!tl) return;
        const jobs = $$('.job', tl);
        // "Role, Organisation" gets the organisation on its own line.
        jobs.forEach(j => {
            const t = $('.job-title', j);
            const m = t.textContent.match(/^(.+),\s*([^,]+)$/);
            if (!m) return;
            t.textContent = m[1];
            const org = document.createElement('span');
            org.className = 'job-org';
            org.textContent = m[2];
            t.append(org);
        });
        S.scene(tl, (p, s) => {
            const lp = S.clamp((S.scroll.y + S.scroll.vh * .62 - s.top) / Math.max(1, s.h));
            tl.style.setProperty('--line-p', lp.toFixed(4));
            jobs.forEach(j => j.classList.toggle('is-lit', j.offsetTop + 12 < lp * s.h));
        });
    }

    // ---------- Tools orbit ----------

    function orbit() {
        const side = $('.xp-side');
        const el = $('.orbit', side);
        const tools = $$('.chips li', side).map(li => li.textContent.trim()).filter(Boolean);
        if (!el || !tools.length) return;
        side.classList.add('has-orbit');

        const TILT = .36;
        const innerN = Math.ceil(tools.length / 3);
        const rings = [{ r: .27, speed: .22 }, { r: .45, speed: -.13 }];
        el.innerHTML = `<svg class="orbit-rings" viewBox="-50 -50 100 100" preserveAspectRatio="none">
                ${rings.map(g => `<ellipse rx="${g.r * 100}" ry="${g.r * 100 * TILT}"/>`).join('')}</svg>
            <div class="orbit-core"><span>${pad(tools.length)}</span></div>`;
        const items = tools.map((name, i) => {
            const ring = i < innerN ? 0 : 1;
            const count = ring === 0 ? innerN : tools.length - innerN;
            const k = ring === 0 ? i : i - innerN;
            const chip = document.createElement('span');
            chip.className = 'orbit-chip';
            chip.textContent = name;
            el.append(chip);
            return { chip, ring, a: (k / count) * Math.PI * 2 + ring * .6, w: 0, h: 0 };
        });

        let size = { w: 0, h: 0 };
        const measure = () => {
            size = { w: el.offsetWidth, h: el.offsetHeight };
            items.forEach(it => {
                it.w = it.chip.offsetWidth;
                it.h = it.chip.offsetHeight;
            });
        };
        new ResizeObserver(measure).observe(el);
        document.fonts?.ready.then(measure);
        measure();

        let t = 0, speed = 1, target = 1, on = false;
        el.addEventListener('pointerenter', () => { target = .15; });
        el.addEventListener('pointerleave', () => { target = 1; });
        S.visible(el, v => { on = v; });
        const place = dt => {
            speed = S.damp(speed, target, 4, dt);
            t += dt * speed * (S.reduced ? 0 : 1);
            items.forEach(it => {
                const g = rings[it.ring];
                const th = it.a + t * g.speed;
                const x = Math.cos(th) * g.r * size.w;
                const y = Math.sin(th) * g.r * size.w * TILT;
                const z = Math.sin(th);
                const s = .82 + .18 * (z + 1) / 2;
                it.chip.style.transform = `translate3d(${(size.w / 2 + x - it.w / 2).toFixed(1)}px, ${(size.h / 2 + y - it.h / 2).toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
                it.chip.style.opacity = (.35 + .65 * (z + 1) / 2).toFixed(3);
                it.chip.style.zIndex = z > 0 ? 8 : 2;
            });
        };
        place(0);
        S.loop(dt => { if (on) place(dt); });
    }

    // ---------- Globe: a dotted planet with Breda marked ----------

    function globe() {
        const canvas = $('.globe');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const N = 1400;
        const pts = [];
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < N; i++) {
            const y = 1 - (i / (N - 1)) * 2;
            const r = Math.sqrt(1 - y * y);
            const th = golden * i;
            pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
        }
        const lat = 51.59 * Math.PI / 180, lon = 4.78 * Math.PI / 180;
        const home = [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
        const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#d7ff3e';

        let w = 0, h = 0, dpr = 1;
        const resize = () => {
            dpr = Math.min(devicePixelRatio || 1, 2);
            w = canvas.width = Math.round(canvas.clientWidth * dpr);
            h = canvas.height = Math.round(canvas.clientHeight * dpr);
        };
        new ResizeObserver(resize).observe(canvas);
        resize();

        let yaw = -lon - .6, tilt = .42, tYaw = 0, on = false, t = 0;
        const contact = canvas.closest('section');
        contact.addEventListener('pointermove', e => {
            tYaw = (e.clientX / innerWidth - .5) * .9;
        });
        S.visible(canvas, v => { on = v; });

        const draw = dt => {
            t += dt;
            yaw += dt * .06;
            const Y = yaw + tYaw * .6;
            const cy = Math.cos(Y), sy = Math.sin(Y), ct = Math.cos(tilt), st = Math.sin(tilt);
            const R = Math.min(w, h) * .46, ox = w / 2, oy = h / 2;
            const rot = ([x, y, z]) => {
                const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
                return [x1, y * ct - z1 * st, y * st + z1 * ct];
            };
            ctx.clearRect(0, 0, w, h);
            const glow = ctx.createRadialGradient(ox, oy, R * .6, ox, oy, R * 1.15);
            glow.addColorStop(0, 'rgba(255,255,255,0)');
            glow.addColorStop(.85, 'rgba(167,139,255,0.06)');
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, w, h);

            for (const p of pts) {
                const [x, y, z] = rot(p);
                const front = z > 0;
                const a = front ? .1 + z * .5 : .035 + (1 + z) * .03;
                const s = (front ? 1.1 + z * 1.1 : .9) * dpr;
                ctx.fillStyle = `rgba(244,243,248,${a.toFixed(3)})`;
                ctx.fillRect(ox + x * R - s / 2, oy - y * R - s / 2, s, s);
            }
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = dpr;
            ctx.beginPath();
            ctx.arc(ox, oy, R, 0, Math.PI * 2);
            ctx.stroke();

            const [hx, hy, hz] = rot(home);
            if (hz > -.1) {
                const px = ox + hx * R, py = oy - hy * R;
                const pulse = (t % 2.4) / 2.4;
                ctx.globalAlpha = S.clamp(hz * 4 + .4);
                ctx.strokeStyle = accent;
                ctx.lineWidth = 1.5 * dpr;
                ctx.beginPath();
                ctx.arc(px, py, (6 + pulse * 26) * dpr, 0, Math.PI * 2);
                ctx.globalAlpha *= 1 - pulse;
                ctx.stroke();
                ctx.globalAlpha = S.clamp(hz * 4 + .4);
                ctx.fillStyle = accent;
                ctx.beginPath();
                ctx.arc(px, py, 4.5 * dpr, 0, Math.PI * 2);
                ctx.fill();
                ctx.font = `500 ${11 * dpr}px "Geist Mono", monospace`;
                ctx.fillText('BREDA', px + 12 * dpr, py - 10 * dpr);
                ctx.globalAlpha = 1;
            }
        };
        draw(0);
        if (S.reduced) return;
        S.loop(dt => { if (on) draw(dt); });
    }
})();
