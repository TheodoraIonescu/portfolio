// TikTok videos in 3D phones. Covers and captions come from TikTok's oEmbed API; the
// TikTok player loads inside the phone on tap. Several videos fan out as a carousel
// that you can click, swipe or step through with the arrow keys.
// Loaded by project.html for elements with data-md-tiktok (see js/template.js).
(() => {
    const S = window.Site;
    const PLAYER = 'https://www.tiktok.com/player/v1/';
    const PLAYER_OPTS = 'autoplay=1&loop=1&music_info=1&description=1&rel=0&native_context_menu=0&closed_caption=0&fullscreen_button=0';

    const ICON = {
        play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z"/></svg>',
        prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
        next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
        tiktok: '<svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><path d="M33.5 5c.8 4.6 3.8 8.2 8.5 8.6v6.2c-3.1.1-6-.9-8.5-2.6V31a12.5 12.5 0 1 1-12.5-12.5c.7 0 1.3 0 2 .2v6.5a6.2 6.2 0 1 0 4.3 5.9V5z"/></svg>',
        heart: '<svg viewBox="0 0 24 24" fill="currentColor" class="tt-heart"><path d="M12 21s-7.5-4.6-10-9.3C.3 8.4 2.2 4.5 6 4.5c2.2 0 3.5 1.2 4.2 2.3h.1c.7-1.1 2-2.3 4.2-2.3 3.8 0 5.7 3.9 4 7.2C17.5 16.4 12 21 12 21z"/></svg>',
        comment: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2 6.9 2 11.6c0 2.6 1.4 4.9 3.6 6.5L5 21.5l3.9-2c1 .3 2 .4 3.1.4 5.5 0 10-3.9 10-8.6S17.5 3 12 3z"/></svg>',
        save: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z"/></svg>',
        share: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 4l8 7.5-8 7.5v-4.6C8.6 14.4 5 16 2 20c.8-5.8 4-10.4 12-11.4z"/></svg>',
        signal: '<svg viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>',
        battery: '<svg viewBox="0 0 27 12" fill="currentColor"><rect x=".5" y=".5" width="22" height="11" rx="3.5" fill="none" stroke="currentColor" opacity=".45"/><rect x="2.5" y="2.5" width="16" height="7" rx="2"/><rect x="24" y="4" width="2" height="4" rx="1" opacity=".45"/></svg>',
    };

    const handleOf = url => (url.match(/tiktok\.com\/(@[\w.-]+)/) || [])[1] || '@tiktok';

    for (const stage of document.querySelectorAll('.phones[data-md-tiktok]')) init(stage);

    function init(stage) {
        const slots = [...stage.querySelectorAll('.phone-slot[data-video-id]')];
        if (!slots.length) return;
        const phones = slots.map(build);
        let active = Math.floor((phones.length - 1) / 2);

        if (phones.length > 1) {
            const nav = S.h(`<div class="phones-nav">
                <button type="button" aria-label="Previous video">${ICON.prev}</button>
                <span class="phones-dots" aria-hidden="true">${phones.map(() => '<i></i>').join('')}</span>
                <button type="button" aria-label="Next video">${ICON.next}</button></div>`);
            stage.after(nav);
            const [prev, next] = nav.querySelectorAll('button');
            prev.addEventListener('click', () => select(active - 1));
            next.addEventListener('click', () => select(active + 1));
        }

        function layout() {
            const narrow = innerWidth < 700;
            phones.forEach((p, i) => {
                const d = i - active;
                const a = Math.abs(d);
                const x = d * (narrow ? 78 : 64);
                p.slot.style.transform = `translateX(${x}%) translateZ(${-a * (narrow ? 120 : 190)}px) rotateY(${-d * (narrow ? 22 : 30)}deg) scale(${1 - a * .06})`;
                p.slot.style.opacity = a > 2 ? '0' : String(1 - a * .18);
                p.slot.style.zIndex = String(10 - a);
                p.slot.classList.toggle('is-active', d === 0);
                p.slot.setAttribute('aria-hidden', String(d !== 0));
                p.slot.inert = d !== 0;
            });
            stage.parentElement.querySelectorAll('.phones-dots i').forEach((dot, i) => dot.classList.toggle('is-on', i === active));
        }

        function select(i) {
            const next = Math.max(0, Math.min(phones.length - 1, i));
            if (next === active) return;
            phones[active].stop();
            active = next;
            S.sound.play('click');
            layout();
        }

        phones.forEach((p, i) => p.slot.addEventListener('click', e => {
            if (i !== active) {
                e.preventDefault();
                select(i);
            }
        }));
        // Inactive phones are inert, so clicks on them land on the stage; pick the phone under the pointer.
        stage.addEventListener('click', e => {
            if (e.target.closest('.phone-slot.is-active')) return;
            const x = e.clientX;
            let best = -1, bestD = Infinity;
            phones.forEach((p, i) => {
                const r = p.slot.getBoundingClientRect();
                const d = Math.abs(r.left + r.width / 2 - x);
                if (d < bestD && x > r.left && x < r.right) {
                    bestD = d;
                    best = i;
                }
            });
            if (best >= 0) select(best);
        });

        // Swipe between phones.
        let sx = 0, sy = 0, swiping = false;
        stage.addEventListener('pointerdown', e => {
            if (e.pointerType === 'mouse') return;
            sx = e.clientX;
            sy = e.clientY;
            swiping = true;
        });
        stage.addEventListener('pointerup', e => {
            if (!swiping) return;
            swiping = false;
            const dx = e.clientX - sx, dy = e.clientY - sy;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) select(active + (dx < 0 ? 1 : -1));
        });
        stage.addEventListener('keydown', e => {
            if (e.key === 'ArrowLeft') select(active - 1);
            if (e.key === 'ArrowRight') select(active + 1);
        });

        S.tilt(stage, { scope: stage, max: 7, lambda: 5 });
        addEventListener('resize', layout);
        layout();

        // Messages from the TikTok players: show the "now playing" island.
        addEventListener('message', e => {
            if (e.origin !== 'https://www.tiktok.com') return;
            let data = e.data;
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch { return; }
            }
            if (!data || !data['x-tiktok-player']) return;
            const p = phones.find(ph => ph.frame?.contentWindow === e.source);
            if (!p) return;
            if (data.type === 'onStateChange') p.phone.classList.toggle('is-playing', data.value === 1);
            if (data.type === 'onPlayerError') p.fail();
        });
    }

    function build(slot, i) {
        const url = slot.dataset.url;
        const id = slot.dataset.videoId;
        const handle = handleOf(url);
        slot.style.setProperty('--i', i);
        slot.innerHTML = `
            <div class="phone-tilt">
                <div class="phone">
                    <div class="phone-frame"><div class="phone-screen">
                        <div class="phone-media">
                            <img class="phone-cover" alt="" referrerpolicy="no-referrer">
                            <div class="tt">
                                <div class="tt-rail"><span class="tt-avatar"></span>${ICON.heart}${ICON.comment}${ICON.save}${ICON.share}<span class="tt-disc"></span></div>
                                <div class="tt-caption"><b class="tt-author"></b><span class="tt-title"></span></div>
                            </div>
                            <button class="phone-play" type="button" data-cursor="Play">${ICON.play}</button>
                        </div>
                        <div class="phone-status"><span class="phone-time" data-clock></span><span>${ICON.signal}${ICON.battery}</span></div>
                        <div class="phone-island"><span class="wave"><i></i><i></i><i></i><i></i></span><span class="cam"></span></div>
                        <div class="phone-home"></div>
                    </div></div>
                    <div class="phone-glare"></div>
                </div>
            </div>
            <div class="phone-shadow"></div>
            <a class="phone-link mono" href="" target="_blank" rel="noopener"></a>`;

        const phone = slot.querySelector('.phone');
        const media = slot.querySelector('.phone-media');
        const cover = slot.querySelector('.phone-cover');
        const play = slot.querySelector('.phone-play');
        const link = slot.querySelector('.phone-link');
        slot.querySelector('.tt-author').textContent = handle;
        play.setAttribute('aria-label', `Play TikTok video by ${handle}`);
        link.href = url;
        link.textContent = `${handle} on TikTok ↗`;
        slot.querySelector('.phone-time').textContent = new Date().toTimeString().slice(0, 5);

        const blank = () => {
            cover.remove();
            media.insertAdjacentHTML('afterbegin', `<div class="phone-blank">${ICON.tiktok}<span class="mono"></span></div>`);
            media.querySelector('.phone-blank .mono').textContent = handle;
        };

        fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`)
            .then(r => (r.ok ? r.json() : Promise.reject(new Error(`oEmbed ${r.status}`))))
            .then(d => {
                if (!d.thumbnail_url) throw new Error('no thumbnail');
                cover.src = d.thumbnail_url;
                cover.onerror = blank;
                const title = (d.title || '').replace(/#\S+/g, '').replace(/\s+/g, ' ').trim();
                slot.querySelector('.tt-title').textContent = title;
                if (d.author_unique_id) slot.querySelector('.tt-author').textContent = `@${d.author_unique_id}`;
            })
            .catch(blank);

        const api = { slot, phone, frame: null };

        api.start = () => {
            if (api.frame) return;
            const frame = document.createElement('iframe');
            frame.src = `${PLAYER}${id}?${PLAYER_OPTS}`;
            frame.title = `TikTok video by ${handle}`;
            frame.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
            frame.setAttribute('allowfullscreen', '');
            frame.addEventListener('load', () => phone.classList.add('is-loaded'), { once: true });
            media.append(frame);
            api.frame = frame;
            phone.classList.add('is-playing');
        };
        api.stop = () => {
            if (!api.frame) return;
            api.frame.remove();
            api.frame = null;
            phone.classList.remove('is-loaded', 'is-playing');
        };
        api.fail = () => {
            api.stop();
            link.classList.add('is-error');
        };
        play.addEventListener('click', e => {
            e.stopPropagation();
            api.start();
        });
        return api;
    }
})();
