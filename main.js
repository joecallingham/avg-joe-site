/* Avg Joe — stepped scroll. Each scroll gesture moves one step and locks into place.
   Steps: 0 logo · 1 sentence · 2 full image · 3 big sentence · 4 services wheel · 5 work (native scroll) */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DUR = RM ? 0.01 : 1.25;      // main step
  const WDUR = RM ? 0.01 : 0.8;      // one click of the wheel
  const EASE = 'power3.inOut';

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

  let state = 0, busy = false, wheelIdx = 0, slotW = 0;
  const wp = { v: 0 };
  const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);

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
    measure() {                       // lock each letter's box so font swaps never shift the sentence
      const fs = parseFloat(getComputedStyle(this.el).fontSize);
      const w = this.ls.map(s => s.getBoundingClientRect().width);
      this.ls.forEach((s, i) => { s.style.width = (w[i] / fs * 1.12).toFixed(3) + 'em'; });
    }
    font(s, f) { s.style.fontFamily = f ? `"r-${f}"` : ''; s.style.fontSize = SIZE[f] || ''; }
    flip(s, f) {
      if (RM) return this.font(s, f);
      gsap.to(s, { rotateX: 90, duration: 0.12, ease: 'power1.in', overwrite: true, onComplete: () => {
        this.font(s, f);
        gsap.fromTo(s, { rotateX: -90 }, { rotateX: 0, duration: 0.22, ease: 'back.out(2.2)' });
      } });
    }
    rand() { return ROT[Math.floor(Math.random() * ROT.length)]; }
    burst() {                         // every letter flips through a few faces, then settles
      this.stop();
      if (RM) { this.ls.forEach((s, i) => this.font(s, this.final[i])); return; }
      const n = 4, gap = 230;
      this.ls.forEach((s, i) => {
        for (let k = 0; k < n; k++) {
          this.timers.push(setTimeout(() => this.flip(s, k === n - 1 ? this.final[i] : this.rand()), i * 70 + k * gap));
        }
      });
      this.timers.push(setTimeout(() => this.idle(), this.ls.length * 70 + n * gap + 900));
    }
    idle() {                          // then one letter at a time keeps turning
      clearInterval(this.iv);
      this.iv = setInterval(() => {
        const i = Math.floor(Math.random() * this.ls.length);
        this.flip(this.ls[i], Math.random() < 0.2 ? '' : this.rand());
      }, 1100);
    }
    stop() { this.timers.forEach(clearTimeout); this.timers = []; clearInterval(this.iv); this.iv = 0; }
    get running() { return this.iv || this.timers.length; }
  }
  const cy = { studio: new Cycler($('#cy-studio')), craft: new Cycler($('#cy-craft')), brand: new Cycler($('#cy-brand')) };

  /* ---------- wheel ---------- */
  const STEP = 12, RADIUS = 37.5;     // degrees between words, rem from the pivot
  const items = SERVICES.map((s, i) => {
    const li = document.createElement('li');
    li.textContent = s.name;
    li.addEventListener('click', () => { if (state === 4) setWheel(i); });
    el.list.appendChild(li);
    return li;
  });
  const cards = SERVICES.map(s => s.works.map(w => {
    const a = document.createElement('a');
    a.className = 'work'; a.href = w.href;
    a.style.cssText = `left:${w.x}%;top:${w.y}%;width:${w.w}rem`;
    a.innerHTML = `<div class="ph" style="aspect-ratio:${w.ar}"><img src="img/${w.img}.jpg" alt="" loading="lazy"></div><span>View Case Study ↘</span>`;
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
  function showWorks(i, delay = 0) {
    cards.forEach((set, k) => {
      if (k === i) {
        gsap.fromTo(set, { autoAlpha: 0, scale: 0.7, y: 24 },
          { autoAlpha: 1, scale: 1, y: 0, duration: RM ? 0.01 : 0.7, ease: 'back.out(1.7)', stagger: 0.09, delay, overwrite: true });
      } else {
        gsap.to(set, { autoAlpha: 0, scale: 0.8, y: -12, duration: RM ? 0.01 : 0.28, ease: 'power2.in', overwrite: true });
      }
    });
  }
  function setWheel(i, dur = WDUR) {
    wheelIdx = i;
    items.forEach((li, k) => li.setAttribute('aria-current', k === i ? 'true' : 'false'));
    gsap.to(wp, { v: i, duration: dur, ease: 'power3.out', overwrite: true, onUpdate: layoutWheel });
    showWorks(i, 0.12);
    busy = true; gsap.delayedCall(Math.min(dur, 0.42), () => { busy = false; });
  }

  /* ---------- nav ---------- */
  function setNav(key) {
    $$('a', el.track).forEach(a => {
      const on = a.dataset.k === key;
      a.classList.toggle('on', on);
      if (on) { a.setAttribute('aria-current', 'page'); } else { a.removeAttribute('aria-current'); }
    });
    const a = $(`a[data-k="${key}"]`, el.track);
    const x = el.strip.clientWidth / 2 - (a.offsetLeft + a.offsetWidth / 2);
    gsap.to(el.track, { x, duration: RM ? 0.01 : 0.7, ease: 'power3.out', overwrite: true });
  }

  /* ---------- where everything sits at each step ---------- */
  function slot1Rect(w) {
    el.slot1.style.setProperty('--w', w);
    const r = el.slot1.getBoundingClientRect();
    el.slot1.style.setProperty('--w', slotW);
    return r;
  }
  function heroRect(st) {
    const vw = innerWidth, vh = innerHeight;
    if (st <= 1) { const r = slot1Rect(st); return { x: r.left, y: r.top, w: r.width, h: r.height, br: 0.25 }; }
    if (st === 2) { const p = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--frame')) * rem(); return { x: p, y: p, w: vw - 2 * p, h: vh - 2 * p, br: 0 }; }
    const r = el.slot2.getBoundingClientRect(), oy = gsap.getProperty(el.big, 'y') || 0;
    return { x: r.left, y: r.top - oy - (st >= 4 ? vh : 0), w: r.width, h: r.height, br: 0.5 };
  }

  function render(st, d = 0, from = st) {
    const vw = innerWidth, vh = innerHeight, r = rem();
    const t = gsap.timeline({ defaults: { duration: d, ease: EASE, overwrite: 'auto' } });

    // logo: together in the middle, out to the edges, then down to its permanent home
    const wa = el.avg.offsetWidth, wj = el.joe.offsetWidth, h = el.avg.offsetHeight;
    const pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pad')) * r, gap = 0.36 * r;
    let ax = pad, jx = vw - pad - wj, y = vh - pad * 0.95 - h;
    if (st === 0) { ax = (vw - (wa + gap + wj)) / 2; jx = ax + wa + gap; }
    if (st <= 1) y = (vh - h) / 2;
    t.to(el.avg, { x: ax, y }, 0).to(el.joe, { x: jx, y: y + 0.06 * r }, 0);

    // small sentence
    const hr = heroRect(st);
    slotW = st === 1 ? 1 : 0;
    let lx = 0, ly = 0, ls = 1;
    if (st >= 3) { ls = hr.w / (vw * 0.985); lx = hr.x + hr.w / 2 - vw / 2; ly = hr.y + hr.h / 2 - vh / 2; }
    t.to(el.line, { '--c': st === 0 ? 50 : 0, x: lx, y: ly, scale: ls }, 0)
     .to(el.line, { autoAlpha: st >= 3 ? 0 : 1, ease: st >= 3 ? 'power3.in' : 'power3.out', duration: st >= 3 ? d * 0.7 : d * 0.5 }, st >= 3 ? 0 : d * 0.3)
     .to(el.slot1, { '--w': slotW }, 0);
    const white = st >= 2;
    t.to(el.line, { color: white ? '#fff' : '#0b0b0b', duration: d * 0.3, ease: 'none' }, from > st ? d * 0.5 : d * 0.18);

    // the image
    t.to(el.hero, { x: hr.x, y: hr.y, width: hr.w, height: hr.h, borderRadius: hr.br + 'rem' }, 0)
     .set(el.hero, { autoAlpha: st === 5 ? 0 : 1 }, st === 5 ? d : 0);

    // big sentence waits underneath the image
    t.set(el.big, { autoAlpha: st >= 2 && st <= 4 ? 1 : 0 }, st >= 2 && from < 2 ? d * 0.92 : (st === 5 ? d : 0))
     .to(el.big, { y: st >= 4 ? -vh : 0 }, 0);

    // wheel + work
    t.set([el.wheel, el.cases], { visibility: 'visible' }, 0)
     .to(el.wheel, { y: st < 4 ? vh : st === 4 ? 0 : -vh * 0.35, autoAlpha: st === 4 ? 1 : (st < 4 ? 1 : 0) }, 0)
     .to(el.wbg, { opacity: st === 4 ? 1 : 0, duration: d * 0.8 }, st === 4 ? d * 0.2 : 0)
     .to(el.cases, { y: st < 5 ? vh : 0 }, 0)
     .set(el.wheel, { visibility: st === 4 ? 'visible' : 'hidden' }, d)
     .set(el.cases, { visibility: st === 5 ? 'visible' : 'hidden' }, d);
    return t;
  }

  function enter(st, from) {
    // type rotation
    if (st === 1 || st === 2) { if (!cy.studio.running || from === 0) cy.studio.burst(); } else cy.studio.stop();
    if (st === 3) gsap.delayedCall(from === 2 ? DUR * 0.45 : 0.2, () => state === 3 && cy.craft.burst()); else cy.craft.stop();
    if (st !== 5) cy.brand.stop();
    // wheel spins in
    if (st === 4) {
      if (from < 4) { wheelIdx = 0; wp.v = -3; }
      if (from > 4) { wheelIdx = SERVICES.length - 1; wp.v = wheelIdx + 3; }
      gsap.to(wp, { v: wheelIdx, duration: DUR * 1.15, ease: 'power3.out', onUpdate: layoutWheel, overwrite: true });
      showWorks(wheelIdx, DUR * 0.6);
    } else showWorks(-1);
    if (st === 5 && from !== 5) el.cases.scrollTop = 0;
    document.body.dataset.step = st;
  }

  function go(n) {
    if (busy || n === state || n < 0 || n > 5) return;
    busy = true; tail = true;
    const from = state; state = n;
    enter(n, from);
    render(n, DUR, from).eventCallback('onComplete', () => { busy = false; });
  }
  function jump(n) {                  // nav clicks: a soft cut rather than replaying every step
    if (busy || n === state) return;
    busy = true; tail = true;
    const from = state;
    gsap.timeline()
      .to(el.veil, { opacity: 1, duration: RM ? 0.01 : 0.4, ease: 'power2.inOut' })
      .add(() => { state = n; render(n, 0, n); enter(n, from === 0 && n !== 1 ? -1 : n); })
      .to(el.veil, { opacity: 0, duration: RM ? 0.01 : 0.6, ease: 'power2.inOut' })
      .add(() => { busy = false; });
  }
  function step(dir) {
    if (busy) return;
    if (state === 4) {
      const ni = wheelIdx + dir;
      if (ni >= 0 && ni < SERVICES.length) return setWheel(ni);
    }
    go(state + dir);
  }

  /* ---------- input: one gesture = one step ---------- */
  let lastWheel = 0, lastDelta = 0, lastStep = 0, tail = false;
  function fresh(e) {
    const now = performance.now(), dt = now - lastWheel, ad = Math.abs(e.deltaY);
    const isNew = dt > 170 || (ad > lastDelta * 1.7 && ad > 36 && now - lastStep > 520);
    lastWheel = now; lastDelta = ad;
    if (dt > 170) tail = false;       // the previous gesture's momentum has died away
    if (isNew && ad >= 3 && !busy) { lastStep = now; return true; }
    return false;
  }
  addEventListener('wheel', e => {
    if (e.ctrlKey) return;
    if (state === 5 && !busy) {
      const isNew = fresh(e);
      if (tail) return e.preventDefault();               // don't let leftover momentum scroll the work page
      if (el.cases.scrollTop <= 0 && e.deltaY < 0) { e.preventDefault(); if (isNew) step(-1); }
      return;
    }
    e.preventDefault();
    if (fresh(e)) step(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  let ty = null, tTop = 0;
  addEventListener('touchstart', e => { ty = e.touches[0].clientY; tTop = el.cases.scrollTop; }, { passive: true });
  addEventListener('touchend', e => {
    if (ty === null) return;
    const dy = e.changedTouches[0].clientY - ty; ty = null;
    if (state === 5) { if (tTop <= 0 && el.cases.scrollTop <= 0 && dy > 70) step(-1); return; }
    if (Math.abs(dy) > 42) step(dy < 0 ? 1 : -1);
  }, { passive: true });

  addEventListener('keydown', e => {
    const down = ['ArrowDown', 'PageDown', ' '].includes(e.key), up = ['ArrowUp', 'PageUp'].includes(e.key);
    if (!down && !up) return;
    if (state === 5) { if (up && el.cases.scrollTop <= 0) { e.preventDefault(); step(-1); } return; }
    e.preventDefault(); step(down ? 1 : -1);
  });

  $$('a', el.track).forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const k = a.dataset.k;
    if (k === 'studio') jump(0);     // Work + Contact: not wired yet, nav stays on Studio
  }));
  $$('.logo').forEach(a => a.addEventListener('click', e => { e.preventDefault(); jump(0); }));
  $$('a[href="#"]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  // work page: reveal on scroll
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in'); io.unobserve(en.target);
    if (en.target.contains(cy.brand.el)) cy.brand.burst();
  }), { root: el.cases, threshold: 0.15 });
  $$('.rv').forEach(n => io.observe(n));

  /* ---------- start ---------- */
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (!busy) { render(state, 0); layoutWheel(); setNav('studio'); } }, 120); });

  const ready = Promise.all([
    document.fonts.ready,
    ...ROT.map(f => document.fonts.load(`1em "r-${f}"`, 'studiocraftbn').catch(() => {})),
    document.fonts.load('500 1em Nuckle'), document.fonts.load('300 1em Riccione'),
  ]);
  Promise.race([ready, new Promise(r => setTimeout(r, 2500))]).then(() => {
    Object.values(cy).forEach(c => c.measure());
    gsap.set([el.wheel, el.cases], { y: innerHeight });
    render(0, 0); layoutWheel(); setNav('studio'); document.body.dataset.step = 0;
    gsap.fromTo('.logo', { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: RM ? 0.01 : 1.2, ease: 'power2.out', stagger: 0.12, clearProps: 'filter' });
  });

  window.__avg = { go, jump, step, get state() { return state; }, get busy() { return busy; } };   // for testing
})();
