/* ==========================================================================
   Canepa & Girbau — Interactions
   ========================================================================== */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Preloader ---------- */
  const heroVideo = $(".hero video");
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    $(".preloader").classList.add("is-done");
    document.body.classList.remove("is-loading");
    setTimeout(() => $$(".hero [data-reveal], .hero [data-reveal-lines]").forEach(el => el.classList.add("is-in")), 250);
  };
  heroVideo.addEventListener("loadeddata", () => setTimeout(release, 900), { once: true });
  window.addEventListener("load", () => setTimeout(release, 1400));
  setTimeout(release, 3200); // never block the page on slow networks

  /* ---------- Smooth scroll (Lenis if available) ---------- */
  let lenis = null;
  if (window.Lenis && !REDUCED) {
    lenis = new Lenis({ duration: 1.25, easing: t => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const scrollToEl = el => lenis ? lenis.scrollTo(el, { offset: 0, duration: 1.6 }) : el.scrollIntoView({ behavior: "smooth" });
  $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
    const id = a.getAttribute("href");
    if (id.length < 2) { e.preventDefault(); return; }
    const t = $(id);
    if (!t) return;
    e.preventDefault();
    header.classList.remove("menu-open");
    scrollToEl(t);
  }));

  /* ---------- Header: transparent → glass, hide on scroll down ---------- */
  const header = $("#header");
  let lastY = 0;
  const onHeader = y => {
    header.classList.toggle("is-scrolled", y > 40);
    header.classList.toggle("is-hidden", y > lastY + 4 && y > window.innerHeight * 0.9 && !header.classList.contains("menu-open"));
    if (y < lastY - 4) header.classList.remove("is-hidden");
    lastY = y;
  };
  $("#menuToggle").addEventListener("click", () => {
    const open = header.classList.toggle("menu-open");
    $("#menuToggle").setAttribute("aria-expanded", open);
  });

  /* ---------- Reveal on view ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }), { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  $$("[data-reveal], [data-reveal-lines]").forEach(el => { if (!el.closest(".hero")) io.observe(el); });

  /* ---------- Parallax (mountains vs. product vs. glass) ---------- */
  const parallax = $$("[data-parallax]").map(el => ({ el, k: parseFloat(el.dataset.parallax), sec: el.closest("section") }));
  const runParallax = () => {
    if (REDUCED) return;
    const vh = window.innerHeight;
    for (const p of parallax) {
      const r = p.sec.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const progress = (r.top + r.height / 2 - vh / 2); // px from viewport centre
      p.el.style.transform = `translate3d(0, ${(-progress * p.k).toFixed(1)}px, 0)`;
    }
  };

  /* ---------- Side scroll indicator + section counter ---------- */
  const sections = $$("main > section");
  const rail = $("#rail");
  sections.forEach((s, i) => {
    const a = document.createElement("a");
    a.href = "#" + s.id;
    a.setAttribute("aria-label", s.dataset.title);
    a.innerHTML = `<span>${String(i + 1).padStart(2, "0")} · ${s.dataset.title}</span>`;
    a.addEventListener("click", e => { e.preventDefault(); scrollToEl(s); });
    rail.appendChild(a);
  });
  const dots = $$("a", rail);
  const navLinks = $$("#nav a");
  let activeIdx = -1;
  const onRail = y => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    $("#railFill").style.transform = `scaleY(${clamp(y / max, 0, 1)})`;
    const mid = window.innerHeight * 0.45;
    let idx = 0;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= mid) idx = i; });
    if (idx === activeIdx) return;
    activeIdx = idx;
    dots.forEach((d, i) => d.classList.toggle("is-active", i === idx));
    rail.classList.toggle("on-dark", sections[idx].hasAttribute("data-dark"));
    $("#secIndex").textContent = String(idx + 1).padStart(2, "0");
    $("#secBar").style.transform = `scaleX(${(idx + 1) / sections.length})`;
    const id = sections[idx].id;
    navLinks.forEach(l => l.classList.toggle("is-active", l.getAttribute("href") === "#" + id));
  };

  const onScroll = () => {
    const y = window.scrollY;
    onHeader(y); onRail(y); runParallax();
  };
  if (lenis) lenis.on("scroll", onScroll); else window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- Hero: layered 3D stage (mouse tilt + scroll depth) ---------- */
  const heroStage = $("#heroStage");
  if (heroStage) {
    $$(".layer", heroStage).forEach(l => l.style.setProperty("--d", l.dataset.depth));
    const BEANS = [1, 2, 3, 4, 5].map(n => `assets/hero/bean-${n}.webp`);
    const rnd = (a, b) => a + Math.random() * (b - a);
    const bean = (parent, css) => {
      const b = document.createElement("span");
      b.className = "bean";
      b.innerHTML = `<img alt="" src="${BEANS[(Math.random() * BEANS.length) | 0]}">`;
      Object.assign(b.style, css);
      parent.appendChild(b);
      return b;
    };
    // mound of roasted beans on the plinth, hiding the bag bases
    const mound = $("#beanMound");
    for (let i = 0; i < 78; i++) {
      const u = rnd(0, 1), x = 12 + u * 74;                 // % across the plinth
      const hump = Math.max(Math.exp(-((u - 0.28) ** 2) / 0.02), 0.8 * Math.exp(-((u - 0.7) ** 2) / 0.018));
      const y = 14.6 + rnd(0, 1) * (1 + hump * 4.4);        // % from bottom (plinth top ≈ 15.5%)
      const size = rnd(2, 3.1);
      bean(mound, { left: x + "%", bottom: y + "%", width: `calc(var(--h) * ${size / 100})`, transform: `rotate(${rnd(0, 360)}deg)`, zIndex: String(Math.round(100 - y * 3)) });
    }
    // oversized beans floating at different depths (the nearest ones are defocused)
    const floatL = $("#beanFloat");
    [[4, 26, 7, 0], [86, 34, 5.5, 0], [70, 72, 4.2, 1.5], [30, 78, 9, 4], [94, 64, 3.4, 0]].forEach(([x, y, s, blur], i) => {
      const b = bean(floatL, { left: x + "%", top: y + "%", width: `calc(var(--h) * ${s / 100})` });
      b.style.setProperty("--blur", blur + "px");
      b.style.setProperty("--dur", rnd(8, 12) + "s");
      b.style.setProperty("--delay", -rnd(0, 8) + "s");
      b.style.setProperty("--r0", rnd(-40, 40) + "deg");
      b.style.setProperty("--r1", rnd(-60, 60) + "deg");
      b.style.setProperty("--dx", rnd(-14, 14) + "px");
      b.style.setProperty("--dy", -rnd(14, 30) + "px");
    });

    // pointer → tilt (lerped); touch devices get a slow idle sway instead
    let tx = 0, ty = 0, cx = 0, cy = 0, stageOn = true;
    if (FINE) addEventListener("pointermove", e => { tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });
    new IntersectionObserver(([e]) => { stageOn = e.isIntersecting; }).observe(heroStage);
    const hero = heroStage.closest("section");
    const tick = t => {
      if (stageOn && !REDUCED) {
        if (!FINE) { tx = Math.sin(t / 3200) * 0.6; ty = Math.cos(t / 4100) * 0.4; }
        cx = lerp(cx, tx, 0.06); cy = lerp(cy, ty, 0.06);
        const sp = clamp(-hero.getBoundingClientRect().top / hero.offsetHeight, 0, 1);
        heroStage.style.setProperty("--mx", cx.toFixed(4));
        heroStage.style.setProperty("--my", cy.toFixed(4));
        heroStage.style.setProperty("--sp", sp.toFixed(4));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Videos: play only when on screen ---------- */
  const vio = new IntersectionObserver(entries => entries.forEach(e => {
    const v = e.target;
    const idle = v.classList.contains("alt") && !v.closest(".is-molido");
    if (e.isIntersecting && !REDUCED && !idle) v.play().catch(() => {});
    else v.pause();
  }), { threshold: 0.05 });
  $$("video[data-video]").forEach(v => {
    // if a clip fails to load, the poster image stays as a still background
    v.addEventListener("error", () => v.removeAttribute("src"), { once: true });
    vio.observe(v);
  });

  /* ---------- Golden cursor glow ---------- */
  if (FINE && !REDUCED) {
    const halo = $(".cursor-halo"), dot = $(".cursor-dot");
    let mx = innerWidth / 2, my = innerHeight / 2, hx = mx, hy = my, dx = mx, dy = my;
    addEventListener("pointermove", e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    const tick = () => {
      hx = lerp(hx, mx, 0.08); hy = lerp(hy, my, 0.08);
      dx = lerp(dx, mx, 0.35); dy = lerp(dy, my, 0.35);
      halo.style.transform = `translate3d(${hx}px, ${hy}px, 0)`;
      dot.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      requestAnimationFrame(tick);
    };
    tick();
    document.addEventListener("pointerover", e => {
      document.body.classList.toggle("cursor-hover", !!e.target.closest("a, button, [data-tilt]"));
    });
  }

  /* ---------- Liquid glass: pointer-tracked highlight + magnetic pull ---------- */
  $$(".btn").forEach(b => b.addEventListener("pointermove", e => {
    const r = b.getBoundingClientRect();
    b.style.setProperty("--x", `${e.clientX - r.left}px`);
    b.style.setProperty("--y", `${e.clientY - r.top}px`);
  }));
  if (FINE && !REDUCED) {
    $$("[data-magnetic]").forEach(el => {
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.18, y = (e.clientY - r.top - r.height / 2) * 0.28;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });

    /* Card tilt with glass elevation */
    $$("[data-tilt]").forEach(card => {
      card.addEventListener("pointermove", e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--ry", `${(px - 0.5) * 8}deg`);
        card.style.setProperty("--rx", `${(0.5 - py) * 8}deg`);
        card.style.setProperty("--mx", `${px * 100}%`);
        card.style.setProperty("--my", `${py * 100}%`);
      });
      card.addEventListener("pointerleave", () => { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); });
    });
  }
  $$("[data-tilt]").forEach(c => c.addEventListener("click", e => { e.preventDefault(); openRitual(); }));

  /* ---------- Peru map with Oxapampa pin ---------- */
  (() => {
    const pts = [[-80.3,-3.4],[-80.0,-4.3],[-79.3,-4.9],[-78.6,-4.5],[-78.3,-3.4],[-77.0,-2.6],[-75.6,-1.6],[-75.2,-0.1],[-74.3,-0.9],[-73.6,-1.3],[-72.9,-2.4],[-71.8,-2.2],[-70.7,-3.8],[-70.0,-4.3],[-72.8,-5.1],[-73.9,-7.4],[-73.2,-9.4],[-72.2,-10.0],[-70.6,-11.0],[-69.6,-10.95],[-68.7,-12.5],[-69.4,-15.3],[-69.0,-16.2],[-69.5,-17.5],[-70.4,-18.35],[-71.4,-17.7],[-73.0,-16.6],[-75.2,-15.4],[-76.2,-13.9],[-77.2,-12.0],[-78.2,-10.0],[-79.0,-8.3],[-79.9,-7.1],[-80.9,-6.0],[-81.3,-4.7]];
    const P = ([lon, lat]) => [((lon + 82) * 12).toFixed(1), ((-lat) * 12 - 0).toFixed(1)];
    const d = "M" + pts.map(p => P(p).join(",")).join("L") + "Z";
    const [ox, oy] = P([-75.4, -10.58]);
    $("#peruMap").innerHTML =
      `<path class="peru" d="${d}"/>` +
      `<circle class="pulse" cx="${ox}" cy="${oy}" r="5"/><circle class="pulse" cx="${ox}" cy="${oy}" r="5"/>` +
      `<circle class="pin" cx="${ox}" cy="${oy}" r="3.4"/>`;
  })();

  /* ---------- Floating glass bubbles (¿A qué huele esta taza?) ---------- */
  const stage = $("#bubbleStage");
  const bubbles = $$(".note-bubble", stage).map((el, i) => ({
    el, i,
    home: el.dataset.home.split(",").map(Number),
    homeM: el.dataset.homeM.split(",").map(Number),
    ox: 0, oy: 0, vx: 0, vy: 0, seed: Math.random() * 100, lift: 0,
  }));
  const stageMouse = { x: -9999, y: -9999 };
  stage.parentElement.addEventListener("pointermove", e => {
    const r = stage.getBoundingClientRect();
    stageMouse.x = e.clientX - r.left; stageMouse.y = e.clientY - r.top;
  });
  stage.parentElement.addEventListener("pointerleave", () => { stageMouse.x = stageMouse.y = -9999; });

  let stageVisible = false;
  new IntersectionObserver(([e]) => { stageVisible = e.isIntersecting; }, { rootMargin: "80px" }).observe(stage);
  let bt = 0, blast = performance.now();
  const bubbleLoop = now => {
    const dt = Math.min(0.05, (now - blast) / 1000); blast = now;
    if (stageVisible) {
      bt += dt;
      const W = stage.clientWidth, H = stage.clientHeight, mobile = innerWidth <= 860;
      const pos = [];
      for (const b of bubbles) {
        const [hx, hy] = mobile ? b.homeM : b.home;
        const size = b.el.offsetWidth;
        // buoyant float: layered sines for a lazy, non-repeating drift
        const fx = Math.sin(bt * 0.45 + b.seed) * 14 + Math.sin(bt * 0.23 + b.seed * 2) * 10;
        const fy = Math.cos(bt * 0.38 + b.seed) * 16 + Math.sin(bt * 0.61 + b.seed) * 6 - b.lift;
        let x = hx * W + fx + b.ox, y = hy * H + fy + b.oy;
        // cursor repulsion — bubbles glide away from the pointer
        const dx = x - stageMouse.x, dy = y - stageMouse.y, dist = Math.hypot(dx, dy), R = size * 1.05;
        if (dist < R && dist > 0.1) { const f = (1 - dist / R) * 900; b.vx += (dx / dist) * f * dt; b.vy += (dy / dist) * f * dt; }
        // spring back home + damping
        b.vx += -b.ox * 3.2 * dt; b.vy += -b.oy * 3.2 * dt;
        b.vx *= 0.92; b.vy *= 0.92;
        b.ox += b.vx * dt * 8; b.oy += b.vy * dt * 8;
        b.lift = Math.max(0, b.lift - dt * 18);
        pos.push({ b, x, y, r: size / 2 });
      }
      // soft bubble–bubble separation
      for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
        const A = pos[i], B = pos[j], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), min = A.r + B.r + 8;
        if (d < min && d > 0) { const push = (min - d) * 0.5; A.b.ox -= (dx / d) * push * 0.2; A.b.oy -= (dy / d) * push * 0.2; B.b.ox += (dx / d) * push * 0.2; B.b.oy += (dy / d) * push * 0.2; }
      }
      for (const { b, x, y } of pos) {
        const tilt = clamp(b.vx * 0.4, -8, 8);
        const squash = 1 + clamp(Math.hypot(b.vx, b.vy) * 0.0025, 0, 0.06);
        b.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${tilt}deg) scale(${squash}, ${(2 - squash).toFixed(3)})`;
      }
    }
    requestAnimationFrame(bubbleLoop);
  };
  if (!REDUCED) requestAnimationFrame(bubbleLoop);
  else bubbles.forEach(b => { b.el.style.transform = `translate(${b.home[0] * stage.clientWidth}px, ${b.home[1] * stage.clientHeight}px)`; });

  const sensory = $("#experiencia");
  const toSection = el => {
    const s = sensory.getBoundingClientRect(), r = el.getBoundingClientRect();
    return [(r.left + r.width / 2 - s.left) / s.width, (r.top + r.height / 2 - s.top) / s.height];
  };
  bubbles.forEach(b => b.el.addEventListener("click", () => {
    bubbles.forEach(o => o !== b && o.el.classList.remove("is-open"));
    b.el.classList.toggle("is-open");
    b.el.classList.remove("pop"); void b.el.offsetWidth; b.el.classList.add("pop");
    const [x, y] = toSection(b.el);
    const L = window.CGParticles?.layers;
    L?.aromaBubbles?.burst(x, y, 14);
    L?.aromaSmoke?.burst(x, y + 0.05, 10);
    Aroma.chime(b.i);
  }));

  /* ---------- Aroma: WebAudio breath + particle release ---------- */
  const Aroma = (() => {
    let ctx, master;
    const ensure = () => {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
      return ctx;
    };
    const noiseBuf = () => {
      const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0; // pinkish noise
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
      }
      return buf;
    };
    function breath(duration = 9) {
      if (!ensure()) return;
      ctx.resume();
      const t = ctx.currentTime;
      // steam / inhale: filtered noise with a slow swell
      const n = ctx.createBufferSource(); n.buffer = noiseBuf(); n.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.7;
      bp.frequency.setValueAtTime(500, t); bp.frequency.linearRampToValueAtTime(1600, t + 3.2); bp.frequency.linearRampToValueAtTime(700, t + duration);
      const ng = ctx.createGain(); ng.gain.setValueAtTime(0, t);
      ng.gain.linearRampToValueAtTime(0.35, t + 3.2); ng.gain.linearRampToValueAtTime(0.08, t + 5.5); ng.gain.linearRampToValueAtTime(0, t + duration);
      n.connect(bp).connect(ng).connect(master); n.start(t); n.stop(t + duration + 0.1);
      // warm pad: Cmaj9 voicing, lowpassed
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
      const pg = ctx.createGain(); pg.gain.setValueAtTime(0, t);
      pg.gain.linearRampToValueAtTime(0.12, t + 2.5); pg.gain.linearRampToValueAtTime(0.1, t + duration - 2.5); pg.gain.linearRampToValueAtTime(0, t + duration);
      lp.connect(pg).connect(master);
      [130.81, 196.0, 246.94, 293.66, 329.63].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = i % 2 ? "sine" : "triangle";
        o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 8;
        const g = ctx.createGain(); g.gain.value = 0.22 / (i + 1) ** 0.5;
        o.connect(g).connect(lp); o.start(t); o.stop(t + duration + 0.1);
      });
      chime(0, t + 0.1);
    }
    function chime(i = 0, at) {
      if (!ensure()) return;
      ctx.resume();
      const t = at ?? ctx.currentTime;
      const base = [1046.5, 1174.66, 1318.51, 1567.98][i % 4];
      [1, 2.01, 3.02].forEach((h, k) => {
        const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = base * h;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.06 / (k + 1), t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4 / (k + 1));
        o.connect(g).connect(master); o.start(t); o.stop(t + 2.6);
      });
    }
    return { breath, chime };
  })();

  const aromaBtn = $("#aromaBtn");
  let aromaRun = null;
  aromaBtn.addEventListener("click", () => {
    if (aromaRun) return;
    const DUR = 9000, t0 = performance.now();
    aromaBtn.classList.add("is-active");
    aromaBtn.setAttribute("aria-pressed", "true");
    $(".aroma-label", aromaBtn).innerHTML = "Inhala<br>lentamente";
    Aroma.breath(DUR / 1000);
    const L = window.CGParticles?.layers;
    // release aroma plumes from each bubble, staggered
    bubbles.forEach((b, i) => setTimeout(() => {
      const [x, y] = toSection(b.el);
      L?.aromaSmoke?.burst(x, y + 0.04, 18);
      L?.aromaBubbles?.burst(x, y, 16);
      b.lift = 40; b.el.classList.remove("pop"); void b.el.offsetWidth; b.el.classList.add("pop");
    }, 350 + i * 420));
    const tick = now => {
      const p = clamp((now - t0) / DUR, 0, 1);
      aromaBtn.style.setProperty("--p", p.toFixed(3));
      if (p > 0.45) $(".aroma-label", aromaBtn).innerHTML = "Exhala<br>y disfruta";
      if (p < 1) aromaRun = requestAnimationFrame(tick);
      else {
        aromaRun = null;
        aromaBtn.classList.remove("is-active");
        aromaBtn.setAttribute("aria-pressed", "false");
        aromaBtn.style.setProperty("--p", 0);
        $(".aroma-label", aromaBtn).innerHTML = "Respira<br>el aroma";
      }
    };
    aromaRun = requestAnimationFrame(tick);
  });

  /* ---------- Product configurator + cart ---------- */
  const state = { grind: "Grano", price: 61.9, ship: true, qty: 1, cart: 0 };
  const priceEl = $("#price");
  let shown = state.price;
  const renderPrice = () => {
    const target = state.price * state.qty, from = shown, t0 = performance.now();
    const step = now => {
      const k = clamp((now - t0) / 700, 0, 1), e = 1 - Math.pow(1 - k, 3);
      shown = from + (target - from) * e;
      priceEl.textContent = shown.toFixed(2);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    $("#shipping").innerHTML = state.ship ? "Envío incluido<br>a todo el Perú" : "Envío no incluido<br>se calcula al pagar";
  };
  const seg = $("#grind"), thumb = $(".thumb", seg);
  const moveThumb = () => {
    const on = $('[aria-pressed="true"]', seg);
    thumb.style.width = on.offsetWidth + "px";
    thumb.style.transform = `translateX(${on.offsetLeft - 5}px)`;
  };
  $$("button", seg).forEach(b => b.addEventListener("click", () => {
    $$("button", seg).forEach(o => o.setAttribute("aria-pressed", o === b));
    state.grind = b.dataset.grind; moveThumb();
    const molido = state.grind === "Molido", sec = $("#tienda");
    sec.classList.toggle("is-molido", molido);
    const alt = $(".section__media video.alt", sec);
    if (alt && molido && !REDUCED) alt.play().catch(() => {});
    if (alt && !molido) alt.pause();
  }));
  addEventListener("resize", moveThumb); moveThumb();
  document.fonts?.ready.then(moveThumb);

  $$("#packs .pack").forEach(p => p.addEventListener("click", () => {
    $$("#packs .pack").forEach(o => o.setAttribute("aria-pressed", o === p));
    state.price = parseFloat(p.dataset.price); state.ship = p.dataset.ship === "1";
    renderPrice();
  }));
  $("#qtyMinus").addEventListener("click", () => { state.qty = Math.max(1, state.qty - 1); $("#qty").textContent = state.qty; renderPrice(); });
  $("#qtyPlus").addEventListener("click", () => { state.qty = Math.min(20, state.qty + 1); $("#qty").textContent = state.qty; renderPrice(); });

  const toast = msg => {
    const t = $("#toast"); $("span", t).textContent = msg; t.classList.add("is-on");
    clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("is-on"), 2600);
  };
  $("#addToCart").addEventListener("click", e => {
    const from = e.currentTarget.getBoundingClientRect(), to = $("#cartBtn").getBoundingClientRect();
    const bean = document.createElement("span"); bean.className = "fly-bean"; document.body.appendChild(bean);
    const sx = from.left + from.width / 2, sy = from.top + from.height / 2, ex = to.left + to.width / 2, ey = to.top + to.height / 2;
    const anim = bean.animate([
      { transform: `translate(${sx}px, ${sy}px) scale(1)` },
      { transform: `translate(${(sx + ex) / 2}px, ${Math.min(sy, ey) - 140}px) scale(1.2) rotate(180deg)`, offset: 0.5 },
      { transform: `translate(${ex}px, ${ey}px) scale(0.3) rotate(360deg)`, opacity: 0.4 },
    ], { duration: REDUCED ? 1 : 900, easing: "cubic-bezier(.5,0,.3,1)" });
    anim.onfinish = () => {
      bean.remove();
      state.cart += state.qty;
      const c = $("#cartCount");
      c.textContent = state.cart; c.classList.add("has-items");
      c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
    };
    header.classList.remove("is-hidden");
    const pack = $('#packs [aria-pressed="true"] b').textContent;
    toast(`${pack} · ${state.grind} × ${state.qty} añadido a tu carrito`);
  });

  /* ---------- Radar chart ---------- */
  const radar = $("#radar");
  const AX = ["Aroma", "Acidez", "Cuerpo", "Dulzor", "Final"], VAL = [4, 3, 4, 4, 4], MAX = 5, CX = 200, CY = 210, R = 170;
  const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return [CX + Math.cos(a) * R * v / MAX, CY + Math.sin(a) * R * v / MAX]; };
  const NS = "http://www.w3.org/2000/svg";
  const mk = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); radar.appendChild(n); return n; };
  for (let lvl = 1; lvl <= MAX; lvl++) mk("polygon", { class: "grid-ring" + (lvl === MAX ? " outer" : ""), points: AX.map((_, i) => pt(i, lvl).join(",")).join(" ") });
  AX.forEach((_, i) => { const [x, y] = pt(i, MAX); mk("line", { class: "axis", x1: CX, y1: CY, x2: x, y2: y }); });
  const shape = mk("polygon", { class: "shape" });
  const verts = AX.map(() => mk("circle", { class: "vertex", r: 4.5 }));
  AX.forEach((name, i) => {
    const [x, y] = pt(i, MAX + 0.9);
    const l = mk("text", { class: "lbl", x, y: y - 4 }); l.textContent = name;
    const v = mk("text", { class: "val", x, y: y + 14 }); v.textContent = VAL[i];
  });
  const drawRadar = k => {
    const pts = VAL.map((v, i) => pt(i, v * k));
    shape.setAttribute("points", pts.map(p => p.join(",")).join(" "));
    pts.forEach(([x, y], i) => { verts[i].setAttribute("cx", x); verts[i].setAttribute("cy", y); });
  };
  drawRadar(REDUCED ? 1 : 0);
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    const t0 = performance.now();
    const step = now => {
      const k = clamp((now - t0) / 1800, 0, 1);
      // elastic ease-out for an organic "bloom"
      const eased = k === 1 ? 1 : 1 - Math.pow(2, -9 * k) * Math.cos(k * 7);
      drawRadar(eased);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    $$("#sliders .slider").forEach(s => {
      const v = VAL[+s.dataset.axis] / MAX * 100;
      $(".fill", s).style.width = v + "%";
      $(".knob", s).style.left = v + "%";
    });
  }, { threshold: 0.35 }).observe(radar);
  $$("#sliders .slider").forEach(s => {
    s.addEventListener("pointerenter", () => verts[+s.dataset.axis].classList.add("is-hot"));
    s.addEventListener("pointerleave", () => verts[+s.dataset.axis].classList.remove("is-hot"));
  });

  /* ---------- Product photo gallery (real product photography) ---------- */
  const views = $$("#views .view");
  const lb = $("#lightbox"), lbImgs = $$(".lightbox__img", lb), lbThumbs = $(".lightbox__thumbs", lb);
  let lbIdx = 0, lbLayer = 0;
  views.forEach((v, i) => {
    const t = document.createElement("button");
    t.setAttribute("aria-label", v.dataset.caption);
    t.innerHTML = `<img alt="" src="${$("img", v).src}">`;
    t.addEventListener("click", () => showView(i));
    lbThumbs.appendChild(t);
    v.addEventListener("click", () => openGallery(i));
  });
  function showView(i) {
    lbIdx = (i + views.length) % views.length;
    const v = views[lbIdx], next = lbImgs[lbLayer ^= 1], prev = lbImgs[lbLayer ^ 1];
    next.onload = () => { next.classList.add("is-on"); prev.classList.remove("is-on"); };
    next.src = v.dataset.full;
    if (next.complete && next.naturalWidth) next.onload();
    next.alt = v.dataset.caption;
    $(".lightbox__count", lb).textContent = `${String(lbIdx + 1).padStart(2, "0")} / ${String(views.length).padStart(2, "0")}`;
    $("b", lb).textContent = v.dataset.caption;
    $("small", lb).textContent = v.dataset.sub;
    $$("button", lbThumbs).forEach((b, k) => b.classList.toggle("is-on", k === lbIdx));
  }
  function openGallery(i) { lb.classList.add("is-open"); lenis?.stop(); showView(i); $("#lightboxClose").focus(); }
  const closeGallery = () => { lb.classList.remove("is-open"); lenis?.start(); };
  $("#lightboxClose").addEventListener("click", closeGallery);
  $(".lightbox__nav--prev", lb).addEventListener("click", () => showView(lbIdx - 1));
  $(".lightbox__nav--next", lb).addEventListener("click", () => showView(lbIdx + 1));
  lb.addEventListener("click", e => { if (e.target === lb || e.target.classList.contains("lightbox__stage")) closeGallery(); });
  addEventListener("keydown", e => {
    if (!lb.classList.contains("is-open")) return;
    if (e.key === "Escape") closeGallery();
    if (e.key === "ArrowRight") showView(lbIdx + 1);
    if (e.key === "ArrowLeft") showView(lbIdx - 1);
  });
  let sx = null;
  lb.addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", e => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 50) showView(lbIdx + (dx < 0 ? 1 : -1));
  });

  /* ---------- Ritual modal ---------- */
  const modal = $("#ritualModal"), mv = $("video", modal);
  function openRitual() {
    modal.classList.add("is-open");
    lenis?.stop();
    mv.play().catch(() => {});
    $("#ritualClose").focus();
  }
  const closeRitual = () => { modal.classList.remove("is-open"); lenis?.start(); mv.pause(); };
  $$("[data-open-ritual]").forEach(b => b.addEventListener("click", openRitual));
  $("#ritualClose").addEventListener("click", closeRitual);
  modal.addEventListener("click", e => { if (e.target === modal) closeRitual(); });
  addEventListener("keydown", e => { if (e.key === "Escape") closeRitual(); });
})();
