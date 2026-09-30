// Photo galleries as a 3D ring: it turns slowly, you can drag or swipe it, and a
// click opens the photo in a lightbox (arrow keys, swipe, Esc).
// Loaded by project.html for the "## Gallery" section.
(() => {
    const S = window.Site;
    const rings = [...document.querySelectorAll('.ring')];
    if (!rings.length) return;

    const ICON = {
        prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
        next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    };

    const lightbox = createLightbox();
    rings.forEach(init);

    function init(el) {
        const items = [...el.querySelectorAll('.ring-item')];
        const n = items.length;
        if (n < 3) return;
        el.classList.add('is-ready');
        const spin = document.createElement('div');
        spin.className = 'ring-spin';
        spin.append(...items);
        el.append(spin);
        el.insertAdjacentHTML('beforeend', '<div class="ring-floor"></div><div class="ring-hint mono" aria-hidden="true"><span>Drag to spin</span><span>·</span><span>Click to open</span></div>');

        const step = 360 / n;
        const photos = items.map(it => it.querySelector('img'));
        items.forEach((it, i) => {
            it.tabIndex = 0;
            it.setAttribute('role', 'button');
            it.setAttribute('aria-label', `Open photo ${i + 1} of ${n}${photos[i]?.alt ? `: ${photos[i].alt}` : ''}`);
            it.dataset.cursor = 'Open';
            photos[i].loading = 'lazy';
            photos[i].draggable = false;
        });

        let radius = 0;
        const measure = () => {
            const w = spin.offsetWidth;
            radius = (w / 2) / Math.tan(Math.PI / n) + w * .18;
            items.forEach((it, i) => { it.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`; });
        };
        new ResizeObserver(measure).observe(spin);
        measure();

        let rot = 0, vel = 0, auto = S.reduced ? 0 : -7, hover = false, on = false, target = null;
        let dragging = false, lastX = 0, moved = 0, lastT = 0;

        el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover = true; });
        el.addEventListener('pointerleave', () => { hover = false; });
        el.addEventListener('pointerdown', e => {
            dragging = true;
            moved = 0;
            lastX = e.clientX;
            lastT = performance.now();
            target = null;
            el.classList.add('is-dragging');
            el.setPointerCapture?.(e.pointerId);
        });
        el.addEventListener('pointermove', e => {
            if (!dragging) return;
            const now = performance.now();
            const dx = e.clientX - lastX;
            lastX = e.clientX;
            moved += Math.abs(dx);
            rot += dx * .3;
            vel = (dx * .3) / Math.max(.001, (now - lastT) / 1000);
            lastT = now;
        });
        const end = e => {
            if (!dragging) return;
            dragging = false;
            el.classList.remove('is-dragging');
            if (moved < 6) {
                // The photo under the pointer, or else the one facing the front.
                const hit = document.elementsFromPoint(e.clientX, e.clientY).find(node => node.classList?.contains('ring-item'))
                    || items.reduce((a, b) => (+b.style.getPropertyValue('--face') > +a.style.getPropertyValue('--face') ? b : a));
                lightbox.open(photos, items.indexOf(hit), hit);
            }
        };
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', () => {
            dragging = false;
            el.classList.remove('is-dragging');
        });
        el.addEventListener('keydown', e => {
            const it = e.target.closest('.ring-item');
            if (e.key === 'Enter' || e.key === ' ') {
                if (!it) return;
                e.preventDefault();
                lightbox.open(photos, items.indexOf(it), it);
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                target = Math.round(rot / step) * step + (e.key === 'ArrowLeft' ? step : -step);
            }
        });
        // Focusing a photo turns it to the front.
        items.forEach((it, i) => it.addEventListener('focus', () => {
            const want = -i * step;
            target = want + Math.round((rot - want) / 360) * 360;
        }));

        S.visible(el, v => { on = v; });
        const draw = dt => {
            if (!dragging) {
                if (target !== null) {
                    rot = S.damp(rot, target, 8, dt);
                    vel = 0;
                    if (Math.abs(rot - target) < .05) target = null;
                } else {
                    vel = S.damp(vel, hover ? 0 : auto, 1.6, dt);
                    rot += vel * dt;
                }
            }
            spin.style.transform = `translateZ(${-radius}px) rotateY(${rot.toFixed(3)}deg)`;
            items.forEach((it, i) => {
                const face = (Math.cos((i * step + rot) * Math.PI / 180) + 1) / 2;
                it.style.setProperty('--face', face.toFixed(3));
            });
        };
        draw(0);
        S.loop(dt => { if (on) draw(dt); });
    }

    function createLightbox() {
        const box = S.h(`<div class="lightbox" hidden role="dialog" aria-modal="true" aria-label="Photo" data-lenis-prevent>
            <img alt="">
            <button class="lightbox-close" type="button" aria-label="Close">${ICON.close}</button>
            <div class="lightbox-bar">
                <button type="button" data-dir="-1" aria-label="Previous photo">${ICON.prev}</button>
                <span class="lightbox-count mono"></span>
                <button type="button" data-dir="1" aria-label="Next photo">${ICON.next}</button>
            </div></div>`);
        document.body.append(box);
        const img = box.querySelector('img');
        const count = box.querySelector('.lightbox-count');
        let list = [], index = 0, opener = null;

        const show = (i, dir = 0) => {
            index = (i + list.length) % list.length;
            img.src = list[index].currentSrc || list[index].src;
            img.alt = list[index].alt;
            count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
            if (dir && !S.reduced) {
                img.animate([{ opacity: 0, transform: `translateX(${dir * 60}px) scale(.96)` }, { opacity: 1, transform: 'none' }],
                    { duration: 500, easing: 'cubic-bezier(.16, 1, .3, 1)' });
            }
        };

        const open = (photos, i, from) => {
            list = photos;
            opener = from;
            box.hidden = false;
            S.lenis?.stop();
            show(i);
            box.querySelector('.lightbox-close').focus();
            if (!S.reduced && from) {
                const a = from.getBoundingClientRect();
                requestAnimationFrame(() => {
                    const b = img.getBoundingClientRect();
                    if (!b.width) return;
                    img.animate([
                        { transform: `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(${a.width / b.width})`, opacity: .6 },
                        { transform: 'none', opacity: 1 },
                    ], { duration: 650, easing: 'cubic-bezier(.16, 1, .3, 1)' });
                });
            }
        };

        const close = () => {
            if (box.hidden) return;
            box.hidden = true;
            S.lenis?.start();
            opener?.focus?.();
        };

        box.addEventListener('click', e => {
            const dir = e.target.closest('[data-dir]');
            if (dir) show(index + +dir.dataset.dir, +dir.dataset.dir);
            else if (e.target.closest('.lightbox-close') || e.target === box) close();
        });
        addEventListener('keydown', e => {
            if (box.hidden) return;
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowLeft') show(index - 1, -1);
            if (e.key === 'ArrowRight') show(index + 1, 1);
            if (e.key === 'Tab') {
                const f = [...box.querySelectorAll('button')];
                const at = f.indexOf(document.activeElement);
                e.preventDefault();
                f[(at + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
            }
        });
        let sx = 0;
        box.addEventListener('pointerdown', e => { sx = e.clientX; });
        box.addEventListener('pointerup', e => {
            const dx = e.clientX - sx;
            if (e.pointerType !== 'mouse' && Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
        });
        return { open, close };
    }
})();
