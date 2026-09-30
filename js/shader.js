// Liquid-chrome background for the home hero: a domain-warped noise field lit as a
// glossy, iridescent surface. It bends around the pointer and ripples on click.
// Renders into <canvas data-shader> at reduced resolution and pauses when off screen.
(() => {
    const canvas = document.querySelector('canvas[data-shader]');
    if (!canvas) return;
    const S = window.Site;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (!gl) {
        canvas.classList.add('is-fallback');
        return;
    }

    const vertex = `
        attribute vec2 aPos;
        void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

    const fragment = `
        precision highp float;
        uniform vec2 uRes;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uHover;
        uniform float uScroll;
        uniform float uIntro;
        uniform vec3 uAccent;
        uniform vec3 uRipple;

        float hash(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
        }

        float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                       mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }

        // The site's holographic gradient: cyan, violet, pink, gold.
        vec3 holo(float x) {
            float s = fract(x) * 4.0;
            vec3 c = mix(vec3(0.49, 0.98, 1.0), vec3(0.66, 0.55, 1.0), smoothstep(0.0, 1.0, s));
            c = mix(c, vec3(1.0, 0.48, 0.85), smoothstep(1.0, 2.0, s));
            c = mix(c, vec3(1.0, 0.83, 0.48), smoothstep(2.0, 3.0, s));
            return mix(c, vec3(0.49, 0.98, 1.0), smoothstep(3.0, 4.0, s));
        }

        float fbm(vec2 p) {
            float v = 0.0, a = 0.5;
            mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
            for (int i = 0; i < 5; i++) {
                v += a * noise(p);
                p = m * p;
                a *= 0.5;
            }
            return v;
        }

        void main() {
            vec2 frag = gl_FragCoord.xy;
            vec2 uv = frag / uRes;
            vec2 p = (frag - 0.5 * uRes) / uRes.y;
            vec2 m = (uMouse - 0.5 * uRes) / uRes.y;
            float t = uTime * 0.05;

            // Pointer lens: the surface is pulled toward the cursor.
            vec2 d = p - m;
            float lens = exp(-dot(d, d) * 5.0) * uHover;
            p -= d * lens * 0.38;

            // Click ripple.
            if (uRipple.z >= 0.0) {
                vec2 rp = (uRipple.xy - 0.5 * uRes) / uRes.y;
                float rd = length(p - rp);
                float wave = sin(rd * 38.0 - uRipple.z * 11.0) * exp(-rd * 3.5) * exp(-uRipple.z * 1.4);
                p += normalize(p - rp + 1e-4) * wave * 0.025;
            }

            vec2 sp = p * 0.95 + vec2(0.0, uScroll * 0.7);
            vec2 q = vec2(fbm(sp + vec2(0.0, t)), fbm(sp + vec2(5.2, 1.3) - t * 0.7));
            vec2 r = vec2(fbm(sp + 3.0 * q + vec2(1.7, 9.2) + t * 0.5),
                          fbm(sp + 3.0 * q + vec2(8.3, 2.8) - t * 0.4));
            vec2 w = sp + 3.2 * r;
            float h = fbm(w);

            // Surface normal from the height field.
            float e = 1.5 / uRes.y;
            float hx = fbm(w + vec2(e, 0.0));
            float hy = fbm(w + vec2(0.0, e));
            vec3 n = normalize(vec3((h - hx) / e * 0.13, (h - hy) / e * 0.13, 1.0));

            // Chrome: reflect a studio environment (soft ceiling, light strips).
            vec3 R = reflect(vec3(0.0, 0.0, -1.0), n);
            float sky = smoothstep(-0.6, 0.8, R.y);
            float strips = exp(-pow((R.y - 0.3) * 6.5, 2.0)) * 1.05
                         + exp(-pow((R.x + 0.4) * 6.0, 2.0)) * smoothstep(-0.1, 0.5, R.y) * 0.5
                         + exp(-pow((R.y + 0.55) * 5.0, 2.0)) * 0.2;
            vec3 env = vec3(0.012, 0.012, 0.018) + vec3(0.13, 0.13, 0.155) * pow(sky, 1.5) + vec3(strips);
            float fres = pow(1.0 - max(n.z, 0.0), 1.2);

            // Thin-film iridescence tints the reflections, strongest at grazing angles.
            float film = h * 2.3 + fres * 2.2 + length(r) * 0.4 + t * 1.2;
            vec3 irid = holo(film * 0.5);
            vec3 col = env * mix(vec3(1.0), irid * 1.35, 0.35 + 0.65 * smoothstep(0.0, 0.5, fres));
            col += irid * smoothstep(0.1, 0.7, fres) * 0.28;
            col += mix(uAccent, irid, 0.35) * lens * 0.16;

            float vig = smoothstep(1.35, 0.2, length((uv - 0.5) * vec2(uRes.x / uRes.y * 0.85, 1.0)));
            col *= mix(0.25, 1.0, vig);
            col *= uIntro * (1.0 - uScroll * 0.8);
            col += (hash(frag + fract(uTime) * 91.0) - 0.5) * 0.03;
            gl_FragColor = vec4(max(col, 0.0), 1.0);
        }`;

    function compile(type, src) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.error('shader.js:', gl.getShaderInfoLog(sh));
            return null;
        }
        return sh;
    }

    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    const prog = gl.createProgram();
    if (!vs || !fs) {
        canvas.classList.add('is-fallback');
        return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('shader.js:', gl.getProgramInfoLog(prog));
        canvas.classList.add('is-fallback');
        return;
    }
    gl.useProgram(prog);

    // One triangle that covers the screen.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = {};
    for (const name of ['uRes', 'uTime', 'uMouse', 'uHover', 'uScroll', 'uIntro', 'uAccent', 'uRipple']) {
        u[name] = gl.getUniformLocation(prog, name);
    }

    const accent = (() => {
        const probe = document.createElement('i');
        probe.style.color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#d7ff3e';
        document.body.append(probe);
        const rgb = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);
        probe.remove();
        return rgb.slice(0, 3).map(v => v / 255);
    })();
    gl.uniform3fv(u.uAccent, accent);

    // Resolution scale adapts to how fast frames render.
    let quality = S.fine ? .5 : .38;
    let width = 0, height = 0;
    function resize() {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.round(canvas.clientWidth * dpr * quality));
        const h = Math.max(1, Math.round(canvas.clientHeight * dpr * quality));
        if (w === width && h === height) return;
        width = canvas.width = w;
        height = canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(u.uRes, w, h);
    }
    new ResizeObserver(resize).observe(canvas);
    resize();

    const hero = canvas.closest('section') || document.body;
    let mx = .6, my = .45, tmx = .6, tmy = .45, hover = 0, thover = 0;
    let ripple = -1, rx = 0, ry = 0;
    hero.addEventListener('pointermove', e => {
        const r = canvas.getBoundingClientRect();
        tmx = (e.clientX - r.left) / r.width;
        tmy = (e.clientY - r.top) / r.height;
        thover = 1;
    });
    hero.addEventListener('pointerleave', () => { thover = 0; });
    hero.addEventListener('pointerdown', e => {
        if (e.target.closest('a, button')) return;
        const r = canvas.getBoundingClientRect();
        rx = (e.clientX - r.left) / r.width;
        ry = (e.clientY - r.top) / r.height;
        ripple = 0;
    });

    let visible = true, intro = 0, time = Math.random() * 40, frames = 0, slow = 0;
    S.visible(canvas, v => { visible = v; }, '0px');

    function draw(dt) {
        time += dt;
        mx = S.damp(mx, tmx, 4, dt);
        my = S.damp(my, tmy, 4, dt);
        hover = S.damp(hover, thover, 3, dt);
        if (document.documentElement.classList.contains('is-live')) intro = Math.min(1, intro + dt / 2.2);
        if (ripple >= 0) ripple = ripple > 4 ? -1 : ripple + dt;

        const scrollP = S.clamp(S.scroll.y / Math.max(1, canvas.clientHeight));
        gl.uniform1f(u.uTime, time);
        gl.uniform2f(u.uMouse, mx * width, (1 - my) * height);
        gl.uniform1f(u.uHover, hover);
        gl.uniform1f(u.uScroll, scrollP);
        gl.uniform1f(u.uIntro, intro * intro * (3 - 2 * intro));
        gl.uniform3f(u.uRipple, rx * width, (1 - ry) * height, ripple);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    if (S.reduced) {
        intro = 1;
        S.ready.then(() => draw(0));
        return;
    }

    S.loop(dt => {
        if (!visible || document.hidden) return;
        draw(dt);
        // Drop resolution once if frames are consistently slow.
        frames++;
        if (dt > 1 / 40) slow++;
        if (frames === 90) {
            if (slow > 45 && quality > .3) {
                quality *= .7;
                resize();
            }
            frames = slow = 0;
        }
    });

    canvas.addEventListener('webglcontextlost', e => {
        e.preventDefault();
        canvas.classList.add('is-fallback');
        visible = false;
    });
})();
