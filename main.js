/* Avg Joe — scroll-driven. Scrolling scrubs one timeline forwards and backwards;
   when you stop, it eases into the nearest resting point. Smooth (lerped) scroll throughout.
   Rests: 0 logo · 1 sentence · 2 full image · 3 big sentence · 4… services wheel (one rest per word) · end: work */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'none';       // moves follow the scroll 1:1; the settle adds the easing

  // feel — tweak these
  const UNIT = 1;            // screens of scrolling per section (higher = slower)
  const SETTLE_WAIT = 160;   // ms after your last scroll input before it checks whether to settle
  const SETTLE_VELOCITY = 1.6;   // only settles once the glide is slower than this (px per frame)
  const SETTLE_TIME = 0.9;   // seconds to ease into place
  const SNAP_PULL = 0.25;    // how far into the next section (0-1) before it carries on instead of falling back

  const TRACK = 0.05;        // rotation words: tracking -50
  const SIZE = { 'snell-black': '1.22em', kelsi: '.82em', campground: '1.08em', postoni: '.92em' };   // optical size per face
  const ROT = ['avebury', 'campground', 'gilroy-heavy', 'kelsi', 'postoni', 'iowan-black', 'iowan-black-italic', 'snell-black'];

  // Services on the wheel, each with the work that pops in beside it.
  // x/y are % of the screen, w is rem, ar is width/height. href is ready for case-study links.
  const W = (img, x, y, w, ar, href = '#') => ({ img, x, y, w, ar, href });
  const SERVICES = [
    { name: 'AI Content',      works: [W('mushroom', 66, 20, 10, 1.5), W('portrait', 80, 55, 8, 0.95)] },
    { name: 'Art Direction',   works: [W('boon-sign', 58, 26, 11, 1.6), W('620', 76, 52, 8.5, 1)] },
    { name: 'Branding',        works: [W('boon-van', 72, 18, 8.5, 1.07), W('620', 58, 56, 8, 1)] },
    { name: 'Design',          works: [W('mushroom', 57.8, 25, 8, 1.53), W('portrait', 72.8, 59, 8, 0.95)] },
    { name: 'Digital',         works: [W('620', 64, 22, 8.5, 1), W('boon-sign', 76, 58, 10, 1.6)] },
    { name: 'Packaging',       works: [W('boon-van', 60, 30, 9, 1.07), W('mushroom', 78, 60, 8, 1.53)] },
    { name: 'Strategy',        works: [W('boon-sign', 68, 24, 10, 1.6), W('portrait', 58, 58, 7.5, 0.95)] },
    { name: 'Visual Identity', works: [W('620', 74, 20, 8, 1), W('boon-van', 60, 54, 8.5, 1.07)] },
  ];

  const el = {
    avg: $('#logo-avg'), joe: $('#logo-joe'), line: $('#s-line'), slot1: $('#slot1'), hero: $('#hero'),
    big: $('#s-big'), slot2: $('#slot2'), wheel: $('#s-wheel'), wbg: $('#wheel-bg'), list: $('#wheel-list'),
    works: $('#works'), cases: $('#s-cases'), veil: $('#veil'), track: $('.track'), strip: $('.strip'),
  };

  const wp = { v: -3 };
  const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);
  const cssPx = n => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)) * rem();

  /* ---------- letters that rotate through typefaces ---------- */
  class Cycler {
    constructor(node) {
      this.el = node; this.timers = []; this.iv = 0;
      const text = node.textContent.trim();
      this.final = (node.dataset.final || '').split(',');
      node.textContent = ''; node.setAttribute('role', 'text'); node.setAttribute('aria-label', text);
      this.ls = [...text].map(ch => {
        const s = document.createElement('span');
        s.className = 'cy'; s.textContent = ch; s.setAttribute('aria-hidden', 'true');
        node.appendChild(s); return s;
      });
    }
    measure() {                       // each letter gets a fixed box: its resting face's width, tracked in to -50
      const r = rem();
      this.fs = parseFloat(getComputedStyle(this.el).fontSize);
      this.ls.forEach((s, i) => { s.style.width = ''; this.font(s, this.final[i]); });
      const w = this.ls.map(s => s.getBoundingClientRect().width);
      this.ls.forEach((s, i) => { s.style.width = Math.max(0.1, (w[i] - TRACK * this.fs) / r).toFixed(3) + 'rem'; });
    }
    font(s, f) { s.style.fontFamily = f ? `"r-${f}"` : ''; s.style.fontSize = SIZE[f] || ''; }
    swap(i, f) {                      // the face just changes; the rest of the word gives a little bounce
      this.font(this.ls[i], f);
      if (RM) return;
      const amp = this.fs * 0.08;
      this.ls.forEach((s, k) => {
        if (k === i) return;
        const d = Math.abs(k - i);
        gsap.to(s, { keyframes: [
          { y: -amp * Math.max(0.35, 1 - d * 0.15), duration: 0.1, ease: 'power2.out' },
          { y: 0, duration: 0.42, ease: 'bounce.out' },
        ], delay: d * 0.03, overwrite: true });
      });
    }
    rand() { return ROT[Math.floor(Math.random() * ROT.length)]; }
    burst() {                         // every letter flips through a few faces, then settles
      this.stop();
      if (RM) { this.ls.forEach((s, i) => this.font(s, this.final[i])); return; }
      const n = 4, gap = 230;
      this.ls.forEach((s, i) => {
        for (let k = 0; k < n; k++) {
          this.timers.push(setTimeout(() => this.swap(i, k === n - 1 ? this.final[i] : this.rand()), i * 70 + k * gap));
        }
      });
      this.timers.push(setTimeout(() => this.idle(), this.ls.length * 70 + n * gap + 900));
    }
    idle() {                          // then one letter at a time keeps turning
      clearInterval(this.iv);
      this.iv = setInterval(() => {
        const i = Math.floor(Math.random() * this.ls.length);
        this.swap(i, Math.random() < 0.2 ? '' : this.rand());
      }, 1100);
    }
    stop() { this.timers.forEach(clearTimeout); this.timers = []; clearInterval(this.iv); this.iv = 0; }
  }
  const cy = { studio: new Cycler($('#cy-studio')), craft: new Cycler($('#cy-craft')), brand: new Cycler($('#cy-brand')) };

  /* ---------- wheel ---------- */
  const STEP = 12, RADIUS = 37.5;     // degrees between words, rem from the pivot
  const WS = 0.7;                     // timeline length of one wheel click (sections are 1)
  const WE = 4 + (SERVICES.length - 1) * WS;     // wheel end
  const END = WE + 1;                 // work section fully in
  const RESTS = [0, 1, 2, 3, ...SERVICES.map((_, i) => 4 + i * WS), END];

  const items = SERVICES.map((s, i) => {
    const li = document.createElement('li');
    li.textContent = s.name;
    li.addEventListener('click', () => { const t = tl.time(); if (t > 3.6 && t < WE + 0.4) goTo(4 + i * WS); });
    el.list.appendChild(li);
    return li;
  });
  const cards = SERVICES.map(s => s.works.map(w => {
    const a = document.createElement('a');
    a.className = 'work'; a.href = w.href;
    a.style.cssText = `left:${w.x}%;top:${w.y}%;width:${w.w}rem`;
    a.innerHTML = `<div class="ph" style="aspect-ratio:${w.ar}"><img src="img/${w.img}.jpg" alt=""></div><span>View Case Study ↘</span>`;
    a.setAttribute('aria-label', `${s.name}: view case study`);
    el.works.appendChild(a);
    return a;
  }));
  function layoutWheel() {
    const r = rem() / 16;
    items.forEach((li, i) => {
      const d = i - wp.v, ad = Math.abs(d);
      li.style.transform = `rotate(${(d * STEP).toFixed(3)}deg) translate(${RADIUS}rem,-50%)`;
      li.style.filter = ad < 0.3 ? 'none' : `blur(${Math.min(16, (ad - 0.3) * 5.5 * r).toFixed(2)}px)`;
      li.style.opacity = ad > 4.6 ? 0 : Math.max(0.12, 1 - ad * 0.22).toFixed(3);
    });
  }
  function showWorks(i) {
    cards.forEach((set, k) => {
      if (k === i) {
        gsap.fromTo(set, { autoAlpha: 0, scale: 0.7, y: 24 },
          { autoAlpha: 1, scale: 1, y: 0, duration: RM ? 0.01 : 0.7, ease: 'back.out(1.7)', stagger: 0.09, overwrite: true });
      } else {
        gsap.to(set, { autoAlpha: 0, scale: 0.8, y: -12, duration: RM ? 0.01 : 0.28, ease: 'power2.in', overwrite: true });
      }
    });
    items.forEach((li, k) => li.setAttribute('aria-current', k === i ? 'true' : 'false'));
  }

  /* ---------- nav: stays on Studio ---------- */
  function setNav(key) {
    $$('a', el.track).forEach(a => {
      const on = a.dataset.k === key;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const a = $(`a[data-k="${key}"]`, el.track);
    gsap.set(el.track, { x: el.strip.clientWidth / 2 - (a.offsetLeft + a.offsetWidth / 2) });
  }

  /* ---------- the timeline: where everything sits at each rest, and the moves between ---------- */
  let tl;
  function measure() {
    const vw = innerWidth, vh = innerHeight, r = rem();
    gsap.set([el.avg, el.joe, el.line, el.big], { clearProps: 'transform' });
    const rect = n => { const b = n.getBoundingClientRect(); return { x: b.left, y: b.top, width: b.width, height: b.height }; };
    el.slot1.style.setProperty('--w', 0); const s0 = rect(el.slot1);
    el.slot1.style.setProperty('--w', 1); const s1 = rect(el.slot1);
    el.slot1.style.setProperty('--w', 0);
    const s2 = rect(el.slot2);

    const wa = el.avg.offsetWidth, wj = el.joe.offsetWidth, h = el.avg.offsetHeight;
    const pad = cssPx('--pad'), gap = 0.36 * r, fr = cssPx('--frame');
    // line Joe's baseline up with Avg's (different faces sit differently in their boxes)
    const base = n => { const m = document.createElement('i'); m.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'; n.appendChild(m); const y = m.offsetTop; m.remove(); return y; };
    const jy = base(el.avg) - base(el.joe);
    const mid = (vh - h) / 2, low = vh - pad * 0.95 - h;
    const ax0 = (vw - (wa + gap + wj)) / 2;
    return {
      vh, vw, wa, wj, gap,
      avg: [{ x: ax0, y: mid }, { x: pad, y: mid }, { x: pad, y: low }],
      joe: [{ x: ax0 + wa + gap, y: mid + jy }, { x: vw - pad - wj, y: mid + jy }, { x: vw - pad - wj, y: low + jy }],
      hero: [
        { ...s0, borderRadius: 0.25 * r },
        { ...s1, borderRadius: 0.25 * r },
        { x: fr, y: fr, width: vw - 2 * fr, height: vh - 2 * fr, borderRadius: 0 },
        { ...s2, borderRadius: 0.5 * r },
        { ...s2, y: s2.y - vh, borderRadius: 0.5 * r },
      ],
      line3: { x: s2.x + s2.width / 2 - vw / 2, y: s2.y + s2.height / 2 - vh / 2, scale: s2.width / (vw * 0.985) },
    };
  }

  function build() {
    const keep = tl ? tl.time() : 0;
    if (tl) tl.kill();
    const P = measure(), vh = P.vh;
    // starting state
    gsap.set(el.avg, P.avg[0]); gsap.set(el.joe, P.joe[0]); gsap.set(el.hero, P.hero[0]);
    gsap.set(el.line, { x: 0, y: 0, scale: 1, autoAlpha: 1, color: '#0b0b0b' });
    gsap.set(el.slot1, { '--w': 0 });
    gsap.set(el.big, { autoAlpha: 0, y: 0 });
    gsap.set(el.wheel, { y: vh, autoAlpha: 1, visibility: 'visible' });
    gsap.set(el.cases, { y: vh, visibility: 'visible' });
    gsap.set(el.wbg, { opacity: 0 });
    wp.v = -3;

    tl = gsap.timeline({ paused: true, defaults: { ease: EASE, duration: 1 } });
    const ft = (t, from, to, at, extra = {}) => tl.fromTo(t, from, { ...to, immediateRender: false, ...extra }, at);

    // 0 → 1: Avg Joe part to the edges, the sentence opens from the middle, the image grows in the gap
    ft(el.avg, P.avg[0], P.avg[1], 0); ft(el.joe, P.joe[0], P.joe[1], 0);
    ft(el.slot1, { '--w': 0 }, { '--w': 1 }, 0);
    ft(el.hero, P.hero[0], P.hero[1], 0);

    // 1 → 2: the image fills the frame, the sentence closes up on top of it, the logo drops to its home
    ft(el.avg, P.avg[1], P.avg[2], 1, { duration: 0.8 }); ft(el.joe, P.joe[1], P.joe[2], 1.2, { duration: 0.8 });   // Avg leads
    ft(el.slot1, { '--w': 1 }, { '--w': 0 }, 1);
    ft(el.hero, P.hero[1], P.hero[2], 1);
    ft(el.line, { color: '#0b0b0b' }, { color: '#ffffff' }, 1.2, { duration: 0.35, ease: 'none' });
    tl.set(el.big, { autoAlpha: 1 }, 1.97);

    // 2 → 3: the image contracts into the big sentence, carrying the small one with it
    ft(el.hero, P.hero[2], P.hero[3], 2);
    ft(el.line, { x: 0, y: 0, scale: 1 }, P.line3, 2);
    ft(el.line, { autoAlpha: 1 }, { autoAlpha: 0 }, 2, { duration: 0.7, ease: 'power3.in' });

    // 3 → 4: everything but the logo and nav moves up, the wheel comes in spinning
    ft(el.big, { y: 0 }, { y: -vh }, 3);
    ft(el.hero, P.hero[3], P.hero[4], 3);
    ft(el.wheel, { y: vh }, { y: 0 }, 3);
    ft(wp, { v: -3 }, { v: 0 }, 3, { ease: 'power3.out' });
    ft(el.wbg, { opacity: 0 }, { opacity: 1 }, 3.2, { duration: 0.8 });

    // 4 → WE: one click of the wheel per word
    for (let k = 1; k < SERVICES.length; k++) ft(wp, { v: k - 1 }, { v: k }, 4 + (k - 1) * WS, { duration: WS });

    // WE → END: the work comes up
    ft(el.wheel, { y: 0, autoAlpha: 1 }, { y: -vh * 0.35, autoAlpha: 0 }, WE);
    ft(el.wbg, { opacity: 1 }, { opacity: 0 }, WE, { duration: 0.6 });
    ft(el.cases, { y: vh }, { y: 0 }, WE);

    geo = P;
    tl.eventCallback('onUpdate', onTime);
    tl.time(keep, false); onTime();
  }

  /* ---------- things that run on their own clock, switched by where you are ---------- */
  let zone = -1, shown = -2, geo = null;
  function onTime() {
    const t = tl.time();
    layoutWheel();
    // reveal the sentence exactly in the gap between Avg and Joe while they part; fully open after that
    if (t < 1) {
      const pad = geo.gap * 1.6;
      const l = Math.max(0, gsap.getProperty(el.avg, 'x') + geo.wa + pad);
      const r = Math.max(0, geo.vw - gsap.getProperty(el.joe, 'x') + pad);
      el.line.style.setProperty('--l', l.toFixed(1) + 'px'); el.line.style.setProperty('--r', r.toFixed(1) + 'px');
    } else { el.line.style.setProperty('--l', '0px'); el.line.style.setProperty('--r', '0px'); }
    const z = t < 0.15 ? 0 : t < 2.55 ? 1 : t < 3.6 ? 3 : t < WE + 0.5 ? 4 : 5;
    if (z !== zone) {
      zone = z;
      if (z === 1) cy.studio.burst(); else cy.studio.stop();
      if (z === 3) cy.craft.burst(); else cy.craft.stop();
      if (z !== 5) cy.brand.stop();
    }
    const wi = t > 3.6 && t < WE + 0.35 ? Math.round(gsap.utils.clamp(0, SERVICES.length - 1, wp.v)) : -1;
    if (wi !== shown) { shown = wi; showWorks(wi); }
  }

  /* ---------- smooth scroll: Lenis (same settings as sumojoestudio.com) driving the timeline ---------- */
  // The page really scrolls (a tall spacer); Lenis glides it; the scroll position plays the timeline.
  // Once the glide has nearly stopped, it eases into the nearest resting point.
  const lenis = new Lenis({
    lerp: 0.055, wheelMultiplier: 1, syncTouch: true, syncTouchLerp: 0.085, touchInertiaExponent: 1.35, touchMultiplier: 1,
    autoRaf: false,
  });
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  const spacer = $('#scroll-space');
  let unit = 1, endPx = 0, maxPx = 0, cur = 0, idleT = 0, ready = false, veiling = false;
  function metrics() {
    const t = unit > 1 ? cur / unit : 0, past = Math.max(0, cur - endPx);
    unit = innerHeight * UNIT;
    endPx = END * unit;
    maxPx = endPx + Math.max(0, el.cases.scrollHeight - el.cases.clientHeight);
    spacer.style.height = (maxPx + innerHeight) + 'px';
    lenis.resize();
    const to = t <= END ? t * unit : endPx + past;
    lenis.scrollTo(to, { immediate: true, force: true });
    cur = to;
  }
  function render() {
    const t = Math.min(cur / unit, END);
    if (Math.abs(t - tl.time()) > 1e-5) tl.time(t);
    const st = Math.max(0, cur - endPx);
    if (Math.abs(el.cases.scrollTop - st) > 0.5) el.cases.scrollTop = st;
  }
  lenis.on('scroll', l => { cur = l.animatedScroll; if (ready) render(); });

  const settleEase = t => 1 - Math.pow(1 - t, 3);
  function settle() {                 // wait until the glide has nearly stopped, then ease to the nearest rest
    if (!ready || veiling) return;
    if (Math.abs(lenis.velocity) > SETTLE_VELOCITY) { idleT = setTimeout(settle, 60); return; }
    const pos = lenis.targetScroll;
    if (pos >= endPx - 0.5) return;   // in the work section: plain scrolling
    const f = pos / unit, dir = lenis.direction || 1;
    const i = RESTS.findIndex(s => s > f);
    let rest = 0;
    if (i > 0) {
      const a = RESTS[i - 1], b = RESTS[i], frac = (f - a) / (b - a);
      rest = dir > 0 ? (frac > SNAP_PULL ? b : a) : (frac < 1 - SNAP_PULL ? a : b);
    }
    if (Math.abs(rest * unit - pos) < 1) return;
    lenis.scrollTo(rest * unit, { duration: SETTLE_TIME, easing: settleEase });
  }
  const touched = () => { if (!ready) return; clearTimeout(idleT); idleT = setTimeout(settle, SETTLE_WAIT); };
  addEventListener('wheel', touched, { passive: true });
  addEventListener('touchend', touched, { passive: true });

  const inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function goTo(t) { clearTimeout(idleT); lenis.scrollTo(Math.min(maxPx, t * unit), { duration: SETTLE_TIME * 1.3, easing: inOut }); }
  function jumpTo(t) {                // nav + logo: a soft cut instead of replaying everything
    if (veiling) return;
    veiling = true; clearTimeout(idleT);
    gsap.timeline()
      .to(el.veil, { opacity: 1, duration: RM ? 0.01 : 0.45, ease: 'power2.inOut' })
      .add(() => { lenis.scrollTo(t * unit, { immediate: true, force: true }); cur = t * unit; render(); })
      .to(el.veil, { opacity: 0, duration: RM ? 0.01 : 0.6, ease: 'power2.inOut' })
      .add(() => { veiling = false; });
  }

  addEventListener('keydown', e => {
    const down = ['ArrowDown', 'PageDown', ' '].includes(e.key), up = ['ArrowUp', 'PageUp'].includes(e.key);
    if (!down && !up) return;
    e.preventDefault();
    const pos = lenis.targetScroll;
    if (pos > endPx + 1 || (down && pos >= endPx - 1)) {       // work section: smooth page-by-page
      const to = down ? Math.min(maxPx, pos + innerHeight * 0.8) : Math.max(endPx, pos - innerHeight * 0.8);
      lenis.scrollTo(to, { duration: 1 });
      return;
    }
    const f = pos / unit;
    const next = down ? RESTS.find(s => s > f + 0.01) : [...RESTS].reverse().find(s => s < f - 0.01);
    if (next !== undefined) goTo(next);
  });

  $$('a', el.track).forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    if (a.dataset.k === 'studio') jumpTo(0);       // Work + Contact: not wired yet, nav stays on Studio
  }));
  $$('.logo').forEach(a => a.addEventListener('click', e => { e.preventDefault(); jumpTo(0); }));
  $$('a[href="#"]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  // work section: reveal as it comes into view
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in'); io.unobserve(en.target);
    if (en.target.contains(cy.brand.el)) cy.brand.burst();
  }), { threshold: 0.15 });
  $$('.rv').forEach(n => io.observe(n));
  $$('#s-cases img').forEach(i => i.addEventListener('load', () => ready && metrics()));

  /* ---------- start ---------- */
  let rz;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { if (!ready) return; build(); metrics(); render(); setNav('studio'); }, 120);
  });

  const loaded = Promise.all([
    document.fonts.ready,
    ...ROT.map(f => document.fonts.load(`1em "r-${f}"`, 'studiocraftbn').catch(() => {})),
    document.fonts.load('500 1em Nuckle'), document.fonts.load('300 1em Riccione'),
  ]);
  Promise.race([loaded, new Promise(r => setTimeout(r, 2500))]).then(() => {
    Object.values(cy).forEach(c => c.measure());
    build(); metrics(); setNav('studio'); ready = true; render();
    gsap.fromTo('.logo', { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: RM ? 0.01 : 1.2, ease: 'power2.out', stagger: 0.12, clearProps: 'filter' });
  });

  // for testing in the console
  window.__avg = {
    goTo, jumpTo, RESTS, lenis,
    get t() { return tl && tl.time(); }, get target() { return lenis.targetScroll / unit; }, get cur() { return cur / unit; },
  };
})();
