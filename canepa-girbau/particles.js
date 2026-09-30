/* ==========================================================================
   Canepa & Girbau — Particle engine (Canvas 2D, no dependencies)
   Layers:
     smoke   → volumetric steam / aroma built from pre-rendered wisp sprites
     dust    → floating gold motes with twinkle (luxury ambience)
     bubbles → micro glass bubbles rising with wobble (sensory section)
     petals  → drifting coffee-flower petals (contact section)
   Each canvas only renders while its section is on screen.
   ========================================================================== */
(() => {
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  const rand = (a, b) => a + Math.random() * (b - a);
  const TAU = Math.PI * 2;

  /* ---------- Cheap smooth 2D value noise for organic drift ---------- */
  const perm = new Uint8Array(512);
  (() => { const p = [...Array(256).keys()].sort(() => Math.random() - 0.5); for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; })();
  const fade = t => t * t * (3 - 2 * t);
  const grad = (h, x, y) => ((h & 1) ? x : -x) + ((h & 2) ? y : -y);
  function noise(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const a = perm[X] + Y, b = perm[X + 1] + Y;
    const l1 = grad(perm[a], x, y) + u * (grad(perm[b], x - 1, y) - grad(perm[a], x, y));
    const l2 = grad(perm[a + 1], x, y - 1) + u * (grad(perm[b + 1], x - 1, y - 1) - grad(perm[a + 1], x, y - 1));
    return l1 + v * (l2 - l1); // ~[-1, 1]
  }

  /* ---------- Sprite factories ---------- */
  function smokeSprite(rgb, seed) {
    const s = 256, c = document.createElement("canvas");
    c.width = c.height = s;
    const g = c.getContext("2d");
    // several offset soft blobs = wispy, irregular puff
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + seed;
      const r = rand(0.05, 0.22) * s;
      const x = s / 2 + Math.cos(a) * r, y = s / 2 + Math.sin(a) * r * 0.8;
      const rad = rand(0.18, 0.34) * s;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(${rgb},0.16)`);
      gr.addColorStop(0.5, `rgba(${rgb},0.06)`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, s, s);
    }
    return c;
  }
  function glowSprite(inner, outer) {
    const s = 64, c = document.createElement("canvas");
    c.width = c.height = s;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, inner);
    gr.addColorStop(0.18, outer);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
    return c;
  }
  function bubbleSprite() {
    const s = 64, c = document.createElement("canvas");
    c.width = c.height = s;
    const g = c.getContext("2d"), r = s / 2 - 2;
    const body = g.createRadialGradient(s / 2, s / 2, r * 0.6, s / 2, s / 2, r);
    body.addColorStop(0, "rgba(255,240,220,0.02)");
    body.addColorStop(0.85, "rgba(255,236,210,0.18)");
    body.addColorStop(1, "rgba(255,236,210,0.55)");
    g.fillStyle = body;
    g.beginPath(); g.arc(s / 2, s / 2, r, 0, TAU); g.fill();
    const hi = g.createRadialGradient(s * 0.36, s * 0.3, 0, s * 0.36, s * 0.3, r * 0.4);
    hi.addColorStop(0, "rgba(255,255,255,0.9)");
    hi.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hi;
    g.beginPath(); g.arc(s * 0.36, s * 0.3, r * 0.4, 0, TAU); g.fill();
    return c;
  }
  function petalSprite() {
    const s = 48, c = document.createElement("canvas");
    c.width = c.height = s;
    const g = c.getContext("2d");
    g.translate(s / 2, s / 2);
    const gr = g.createLinearGradient(-10, -18, 10, 18);
    gr.addColorStop(0, "rgba(255,255,252,0.95)");
    gr.addColorStop(1, "rgba(236,228,210,0.85)");
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0, -18); g.bezierCurveTo(12, -10, 10, 12, 0, 18); g.bezierCurveTo(-10, 12, -12, -10, 0, -18);
    g.fill();
    return c;
  }

  /* ---------- Layer base ---------- */
  class Layer {
    constructor(canvas, opts) {
      this.c = canvas;
      this.g = canvas.getContext("2d");
      this.o = opts;
      this.p = [];
      this.t = 0;
      this.visible = false;
      this.mouse = { x: -9999, y: -9999 };
      this.resize();
      new ResizeObserver(() => this.resize()).observe(canvas);
      new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }, { rootMargin: "100px" }).observe(canvas);
      const host = canvas.parentElement;
      host.addEventListener("pointermove", e => {
        const r = canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top;
      });
      host.addEventListener("pointerleave", () => { this.mouse.x = this.mouse.y = -9999; });
    }
    resize() {
      const r = this.c.getBoundingClientRect();
      this.w = r.width; this.h = r.height;
      this.c.width = Math.max(1, r.width * DPR);
      this.c.height = Math.max(1, r.height * DPR);
      this.g.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
  }

  /* ---------- Smoke / steam ---------- */
  class Smoke extends Layer {
    constructor(canvas, opts) {
      super(canvas, Object.assign({
        color: "255,250,242", blend: "screen", rate: 6, max: 70,
        emitters: [{ x: 0.5, y: 1.05, spread: 0.3 }], rise: 22, size: [120, 260], life: [7, 12], alpha: 0.7,
      }, opts));
      this.sprites = [0, 1, 2].map(i => smokeSprite(this.o.color, i * 1.7));
      this.acc = 0;
      this.boost = 0;
      if (!REDUCED) for (let i = 0; i < this.o.max * 0.6; i++) this.spawn(true);
    }
    spawn(prewarm, at) {
      const e = at || this.o.emitters[(Math.random() * this.o.emitters.length) | 0];
      const life = rand(...this.o.life);
      this.p.push({
        x: (e.x + rand(-e.spread, e.spread)) * this.w,
        y: e.y * this.h + (at ? 0 : rand(-20, 20)),
        vx: rand(-4, 4) + (at ? rand(-30, 30) : 0),
        vy: -rand(0.6, 1.2) * this.o.rise * (at ? 2.2 : 1),
        size: rand(...this.o.size) * (at ? 0.6 : 1),
        grow: rand(8, 20),
        rot: rand(0, TAU), vr: rand(-0.12, 0.12),
        life, age: prewarm ? rand(0, life) : 0,
        spr: this.sprites[(Math.random() * 3) | 0],
        seed: rand(0, 100),
        a: rand(0.55, 1),
      });
    }
    /** Emit a dense aroma plume at a point (0..1 coords) */
    burst(x, y, n = 26) {
      for (let i = 0; i < n; i++) this.spawn(false, { x, y, spread: 0.05 });
      this.boost = 3;
    }
    update(dt) {
      const o = this.o, g = this.g;
      this.boost = Math.max(0, this.boost - dt);
      this.acc += dt * o.rate * (1 + this.boost);
      while (this.acc > 1 && this.p.length < o.max * (this.boost ? 2 : 1)) { this.spawn(false); this.acc--; }
      if (this.acc > 1) this.acc = 1;
      g.globalCompositeOperation = o.blend;
      const t = this.t, m = this.mouse;
      for (let i = this.p.length - 1; i >= 0; i--) {
        const p = this.p[i];
        p.age += dt;
        if (p.age > p.life || p.y < -p.size) { this.p.splice(i, 1); continue; }
        // curl-like flow: horizontal drift sampled from noise field
        const n = noise(p.x * 0.004 + p.seed, p.y * 0.004 - t * 0.12);
        p.vx += n * 14 * dt;
        p.vx *= 0.985;
        // soft cursor stir
        const dx = p.x - m.x, dy = p.y - m.y, d2 = dx * dx + dy * dy;
        if (d2 < 32000) { const f = (1 - d2 / 32000) * 60 * dt; p.vx += (dx / 80) * f; p.vy += (dy / 160) * f; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy *= 0.999;
        p.size += p.grow * dt;
        p.rot += p.vr * dt;
        const k = p.age / p.life;
        const alpha = Math.sin(Math.PI * Math.min(1, k)) ** 1.4 * o.alpha * p.a;
        g.globalAlpha = alpha;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.drawImage(p.spr, -p.size / 2, -p.size / 2, p.size, p.size);
        g.restore();
      }
      g.globalAlpha = 1;
    }
  }

  /* ---------- Gold dust motes ---------- */
  class Dust extends Layer {
    constructor(canvas, opts) {
      super(canvas, Object.assign({ count: 60, blend: "source-over", tint: "light" }, opts));
      this.spr = this.o.tint === "dark"
        ? glowSprite("rgba(255,244,214,1)", "rgba(217,191,140,0.35)")
        : glowSprite("rgba(255,246,222,1)", "rgba(184,149,90,0.45)");
      const n = REDUCED ? 0 : this.o.count;
      for (let i = 0; i < n; i++) this.p.push(this.make(true));
    }
    make(any) {
      return {
        x: rand(0, this.w), y: any ? rand(0, this.h) : this.h + 10,
        r: rand(3, 11), vy: -rand(4, 14), seed: rand(0, 100), tw: rand(0.6, 2),
        z: rand(0.4, 1),
      };
    }
    update(dt) {
      const g = this.g, t = this.t, m = this.mouse;
      g.globalCompositeOperation = this.o.blend;
      for (const p of this.p) {
        p.y += p.vy * dt * p.z;
        p.x += noise(p.seed, t * 0.15) * 10 * dt;
        const dx = p.x - m.x, dy = p.y - m.y, d2 = dx * dx + dy * dy;
        if (d2 < 14000) { p.x += dx * 0.8 * dt; p.y += dy * 0.8 * dt; }
        if (p.y < -12) Object.assign(p, this.make(false));
        const a = (0.35 + 0.65 * Math.abs(Math.sin(t * p.tw + p.seed))) * p.z;
        g.globalAlpha = a;
        const s = p.r * p.z * 2;
        g.drawImage(this.spr, p.x - s / 2, p.y - s / 2, s, s);
      }
      g.globalAlpha = 1;
    }
  }

  /* ---------- Micro glass bubbles ---------- */
  class Bubbles extends Layer {
    constructor(canvas, opts) {
      super(canvas, Object.assign({ count: 26 }, opts));
      this.spr = bubbleSprite();
      const n = REDUCED ? 0 : this.o.count;
      for (let i = 0; i < n; i++) this.p.push(this.make(true));
    }
    make(any, x, y) {
      return {
        x: x ?? rand(this.w * 0.35, this.w), y: y ?? (any ? rand(0, this.h) : this.h + 20),
        r: rand(3, 13), vy: -rand(10, 28), seed: rand(0, 100), wob: rand(0.6, 1.6), life: 1, burst: x != null,
      };
    }
    burst(x, y, n = 18) {
      for (let i = 0; i < n; i++) {
        const b = this.make(false, x * this.w + rand(-30, 30), y * this.h + rand(-30, 30));
        b.vy = -rand(30, 70); b.vx = rand(-40, 40); b.r = rand(2, 9);
        this.p.push(b);
      }
    }
    update(dt) {
      const g = this.g, t = this.t;
      g.globalCompositeOperation = "screen";
      for (let i = this.p.length - 1; i >= 0; i--) {
        const p = this.p[i];
        p.y += p.vy * dt;
        p.x += (Math.sin(t * p.wob * 2 + p.seed) * 12 + (p.vx || 0)) * dt;
        if (p.vx) p.vx *= 0.97;
        if (p.burst) { p.life -= dt * 0.35; if (p.life <= 0) { this.p.splice(i, 1); continue; } }
        if (p.y < -20) { if (p.burst) { this.p.splice(i, 1); continue; } Object.assign(p, this.make(false)); }
        g.globalAlpha = 0.75 * p.life;
        const s = p.r * 2 * (1 + Math.sin(t * 3 + p.seed) * 0.04);
        g.drawImage(this.spr, p.x - s / 2, p.y - s / 2, s, s);
      }
      g.globalAlpha = 1;
    }
  }

  /* ---------- Coffee-flower petals ---------- */
  class Petals extends Layer {
    constructor(canvas, opts) {
      super(canvas, Object.assign({ count: 14 }, opts));
      this.spr = petalSprite();
      const n = REDUCED ? 0 : this.o.count;
      for (let i = 0; i < n; i++) this.p.push(this.make(true));
    }
    make(any) {
      return {
        x: rand(this.w * 0.4, this.w * 1.1), y: any ? rand(0, this.h) : -20,
        s: rand(8, 16), vx: -rand(8, 22), vy: rand(12, 26), rot: rand(0, TAU), vr: rand(-1, 1),
        flip: rand(0, TAU), vf: rand(1, 3), seed: rand(0, 100),
      };
    }
    update(dt) {
      const g = this.g, t = this.t;
      g.globalCompositeOperation = "source-over";
      for (const p of this.p) {
        p.x += (p.vx + noise(p.seed, t * 0.3) * 20) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt; p.flip += p.vf * dt;
        if (p.y > this.h + 20 || p.x < -20) Object.assign(p, this.make(false));
        g.globalAlpha = 0.85;
        g.save();
        g.translate(p.x, p.y); g.rotate(p.rot); g.scale(Math.cos(p.flip), 1);
        g.drawImage(this.spr, -p.s / 2, -p.s / 2, p.s, p.s);
        g.restore();
      }
      g.globalAlpha = 1;
    }
  }

  /* ---------- Registry + single RAF loop ---------- */
  const layers = [];
  const api = { layers: {}, REDUCED };

  function mount() {
    document.querySelectorAll("canvas[data-fx]").forEach(cv => {
      const kind = cv.dataset.fx;
      const group = [];
      if (kind === "hero") {
        // low drifting mist + ambient steam behind the cup side
        group.push(new Smoke(cv, { color: "255,251,245", blend: "source-over", alpha: 0.35, rate: 3, max: 34,
          emitters: [{ x: 0.78, y: 1.1, spread: 0.25 }, { x: 0.3, y: 1.1, spread: 0.3 }], rise: 16, size: [220, 420] }));
        group.push(new Dust(cv, { count: 38, tint: "light" }));
        api.layers.heroSmoke = group[0];
      }
      if (kind === "mist") {
        group.push(new Smoke(cv, { color: "250,248,240", blend: "screen", alpha: 0.28, rate: 2.5, max: 30,
          emitters: [{ x: 0.5, y: 1.1, spread: 0.6 }], rise: 10, size: [300, 560], life: [10, 16] }));
      }
      if (kind === "sensory") {
        const smoke = new Smoke(cv, { color: "255,236,214", blend: "screen", alpha: 0.55, rate: 5, max: 60,
          emitters: [{ x: 0.62, y: 1.08, spread: 0.25 }, { x: 0.85, y: 1.08, spread: 0.15 }], rise: 26, size: [140, 300] });
        const bubbles = new Bubbles(cv, { count: 24 });
        const dust = new Dust(cv, { count: 34, tint: "dark", blend: "lighter" });
        group.push(smoke, bubbles, dust);
        api.layers.aromaSmoke = smoke;
        api.layers.aromaBubbles = bubbles;
      }
      if (kind === "dust") group.push(new Dust(cv, { count: 46, tint: "light" }));
      if (kind === "petals") {
        group.push(new Petals(cv, { count: 16 }));
        group.push(new Dust(cv, { count: 22, tint: "light" }));
      }
      layers.push(...group);
    });

    let last = performance.now();
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      for (const l of layers) {
        // layers sharing a canvas: only the first clears
        if (l.c.__frameStamp !== now) { l.c.__frameStamp = now; if (l.visible) l.g.clearRect(0, 0, l.w, l.h); }
        if (!l.visible) continue;
        l.t += dt;
        l.update(dt);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  window.CGParticles = api;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
