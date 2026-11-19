/* Avg Joe — scroll-driven. Lenis glides the real page scroll (same settings as sumojoestudio.com)
   and the scroll position plays one timeline 1:1, forwards and backwards. No locking: it's continuous.
   Sections: 0 logo · 1 sentence · 2 full image · 3 big sentence · 4… services wheel · end: work */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'none';       // moves follow the scroll 1:1

  // feel — tweak these
  // touch devices get their own, more even pace and their own native scrolling
  const TOUCH = matchMedia('(pointer: coarse)').matches;
  // Phones: lay everything out against one stable height (the screen with the browser bars hidden),
  // so the bars sliding in and out while you scroll never move anything.
  const vhProbe = document.createElement('div');
  vhProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100lvh;pointer-events:none;visibility:hidden';
  document.documentElement.appendChild(vhProbe);
  const VH = () => TOUCH ? Math.max(vhProbe.offsetHeight, innerHeight) : innerHeight;
  // ...but centre things on the area you can see with the bars showing (the small viewport)
  const svProbe = document.createElement('div');
  svProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100svh;pointer-events:none;visibility:hidden';
  document.documentElement.appendChild(svProbe);
  const SVH = () => TOUCH ? Math.min(svProbe.offsetHeight || innerHeight, VH()) : innerHeight;
  const UNIT = TOUCH ? 0.85 : 1.2;   // screens of scrolling per section (higher = slower)
  const CROP = 0.5;          // how much the frame crops (vs scales) mid-move: 0 = only scales, 1 = only crops; none at the ends
  // scroll lengths (in sections) for the first three moves, which need a slower pace than the rest
  const LEN_PART = TOUCH ? 0.75 : 1.5;      // Avg Joe parting to the sentence
  const OPEN_LEN = TOUCH ? 1.6 : 2.5;      // the image opening + Avg/Joe dropping
  const LEN_SHRINK = TOUCH ? 0.8 : 1.6;    // the image cropping in to the big sentence
  const EXPAND = LEN_SHRINK / OPEN_LEN;   // share of the open section the image expand takes: same scroll length as the shrink
  const HOLD = 0;            // screens of scrolling where nothing moves once the image has settled into the big sentence
  const WS = TOUCH ? 0.26 : 0.2;            // screens of scrolling per word on the wheel (matched to the page's scroll speed)
  const SWAP_EVERY = 85;     // px of scrolling between typeface changes in the rotation words
  const TRACK = 0.05;        // rotation words: tracking -50

  // Each face is scaled so its lowercase (o, x, n) is exactly as tall as Nuckle's: measured from the font files
  const SIZE = { avebury: 0.919, campground: 1.665, 'gilroy-heavy': 1.136, kelsi: 0.687, postoni: 1.289,
    'iowan-black': 1.148, 'iowan-black-italic': 1.164, 'snell-black': 1.521 };
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
    works: $('#works'), cases: $('#s-cases'), veil: $('#veil'), say: $('.say'),
    notch: $('.notch'),
  };

  const SPIN = 1 / WS;                // wheel speed: words per screen of scrolling, used everywhere
  const wp = { v: -SPIN };
  const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);
  const cssPx = n => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)) * rem();

  /* ---------- letters that rotate through typefaces ---------- */
  // Each letter sits in a fixed, zero-height box (its resting width), so nothing outside the word ever moves.
  // When a letter changes face, the letters slide sideways to re-space the word around it.
  const meter = document.createElement('span');
  meter.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;letter-spacing:0;line-height:1';
  document.body.appendChild(meter);
  const advCache = new Map();
  function advance(ch, face, fs) {
    const key = `${face}|${ch}|${fs}`;
    if (!advCache.has(key)) {
      meter.style.fontFamily = face ? `"r-${face}"` : '"Nuckle"';
      meter.style.fontSize = fs * (SIZE[face] || 1) + 'px';
      meter.textContent = ch;
      advCache.set(key, meter.getBoundingClientRect().width);
    }
    return advCache.get(key);
  }

  class Cycler {
    constructor(node) {
      this.el = node; this.n = 0;
      this.text = node.textContent.trim();
      this.final = (node.dataset.final || '').split(',');
      this.cur = [...this.text].map((_, i) => this.final[i] || '');
      node.textContent = ''; node.setAttribute('role', 'text'); node.setAttribute('aria-label', this.text);
      this.ls = [...this.text].map(ch => {
        const s = document.createElement('span');
        s.className = 'cy'; s.textContent = ch; s.setAttribute('aria-hidden', 'true');
        node.appendChild(s); return s;
      });
    }
    font(s, f) { s.style.fontFamily = f ? `"r-${f}"` : ''; s.style.fontSize = SIZE[f] ? SIZE[f] + 'em' : ''; }
    measure() {
      const r = rem();
      this.fs = parseFloat(getComputedStyle(this.el).fontSize);
      this.box = [...this.text].map((ch, i) => Math.max(1, advance(ch, this.final[i], this.fs) - TRACK * this.fs));
      this.ls.forEach((s, i) => { s.style.width = (this.box[i] / r).toFixed(3) + 'rem'; this.font(s, this.cur[i]); });
      this.layout(false);
    }
    layout(animate = true) {          // centre the letters (at their current faces) inside the word's fixed width
      const adv = [...this.text].map((ch, i) => advance(ch, this.cur[i], this.fs) - TRACK * this.fs);
      const total = this.box.reduce((a, b) => a + b, 0), used = adv.reduce((a, b) => a + b, 0);
      let x = (total - used) / 2, bx = 0;
      this.ls.forEach((s, i) => {
        const dx = x + adv[i] / 2 - (bx + this.box[i] / 2);
        if (animate && !RM) gsap.to(s, { x: dx, duration: 0.45, ease: 'power3.out', overwrite: true });
        else gsap.set(s, { x: dx });
        x += adv[i]; bx += this.box[i];
      });
    }
    step() {                          // one letter (moving along the word) changes face
      const i = this.n++ % this.ls.length;
      let f; do { f = Math.random() < 0.15 ? '' : ROT[Math.floor(Math.random() * ROT.length)]; } while (f === this.cur[i]);
      this.cur[i] = f;
      this.font(this.ls[i], f);
      this.layout();
    }
  }
  const cy = { studio: new Cycler($('#cy-studio')), craft: new Cycler($('#cy-craft')), brand: new Cycler($('#cy-brand')) };

  /* ---------- wheel ---------- */
  const STEP = 12, RADIUS = 37.5;     // degrees between words, rem from the pivot
  const WE = 4 + (SERVICES.length - 1) * WS;     // wheel end
  const END = WE + 1;                 // work section fully in
  const RESTS = [0, 1, 2, 3, ...SERVICES.map((_, i) => 4 + i * WS), END];   // used by the arrow keys

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
          { autoAlpha: 1, scale: 1, y: 0, duration: RM ? 0.01 : 0.6, ease: 'back.out(1.7)', stagger: 0.07, overwrite: true });
      } else {
        gsap.to(set, { autoAlpha: 0, scale: 0.8, y: -12, duration: RM ? 0.01 : 0.22, ease: 'power2.in', overwrite: true });
      }
    });
    items.forEach((li, k) => li.setAttribute('aria-current', k === i ? 'true' : 'false'));
  }

  /* ---------- nav: stays on Studio ---------- */
  // The middle button talks: its words change with where you are (and with what you hover).
  const SAYS = { top: 'Studio', big: "That's us", wheel: 'Pick one?', pick: 'Good choice', work: 'Have a nose', end: 'Say hello?', soon: "Let's chat", play: 'Make a beat?', beat: 'Put it away' };
  let saying = 'Studio', sayTl = null, hoverSay = null;
  function say(text) {
    if (text === saying) return;
    saying = text;
    if (sayTl) sayTl.kill();
    if (RM) { el.say.textContent = text; return; }
    sayTl = gsap.timeline()
      .to(el.say, { yPercent: -70, autoAlpha: 0, duration: 0.16, ease: 'power2.in' })
      .add(() => { el.say.textContent = text; navLetters(el.say); })
      .fromTo(el.say, { yPercent: 70, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.32, ease: 'power3.out' });
  }
  function navState() {
    const t = tl ? tl.time() : 0;
    const past = cur - endPx - room;
    const where = past > VH() * 0.4 ? 'end' : t >= WE + 0.5 ? 'work' : t >= 3.6 ? 'wheel' : t >= 2.6 ? 'big' : 'top';
    say(beatOpen ? SAYS.beat : SAYS[hoverSay && (hoverSay !== 'pick' || where === 'wheel') ? hoverSay : where]);
    if (workBtn._on !== (where === 'work')) { workBtn._on = where === 'work'; workBtn.classList.toggle('on', workBtn._on); }
  }
  const workBtn = $('.nb[data-k="work"]');
  function setNav() { navState(); }

  /* ---------- the notch: cut out of images only ---------- */
  // The bar along the bottom and the notch are not drawn on top of the page; they are cut out of any image
  // that reaches them, so text and backgrounds pass underneath untouched and images get soft curves.
  const NOTCH_FLANK = 2.1;   // how wide each curved side of the notch is, in notch-heights
  let cutGeo = null;
  function notchGeo() {
    const b = el.notch.getBoundingClientRect(), fr = cssPx('--frame');
    // the notch follows the nav, which sits on the visible bottom edge
    cutGeo = { x: b.left, y: b.top, w: b.width, h: b.height, base: b.bottom - 1, vw: innerWidth, vh: Math.max(VH(), innerHeight) };
    drawNotch(b.width, b.height, fr);
  }
  // The notch itself is a solid shape on top of everything (same outline as the cut-outs), filled down to the screen edge.
  function drawNotch(w, h, fr) {
    let svg = el.notch.querySelector('svg.notch-fill');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'notch-fill'); svg.setAttribute('aria-hidden', 'true');
      svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
      el.notch.prepend(svg);
    }
    const B = h - 1, F = NOTCH_FLANK * (h - 1), H = h + fr + 4, n = v => v.toFixed(1);
    svg.setAttribute('viewBox', `0 0 ${n(w)} ${n(H)}`);
    svg.style.width = w + 'px'; svg.style.height = H + 'px';
    svg.firstChild.setAttribute('d', `M0 ${n(B)}C${n(0.55 * F)} ${n(B)} ${n(0.42 * F)} 0 ${n(F)} 0H${n(w - F)}C${n(w - 0.42 * F)} 0 ${n(w - 0.55 * F)} ${n(B)} ${n(w)} ${n(B)}V${n(H)}H0Z`);
  }
  function cutPath(ox, oy) {          // bar + notch outline, in an element's own coordinates
    // The flanks are drawn at a fixed size from the notch height, so a wider notch never stretches them:
    // each side is one long soft S, from the bottom edge up into a rounded shoulder.
    const g = cutGeo, far = 4000;
    const top = g.y - oy, B = g.base - oy, F = NOTCH_FLANK * (g.base - g.y);
    const L = g.x - ox, R = g.x + g.w - ox, bottom = g.vh + 10 - oy;
    const n = v => v.toFixed(1);
    let d = `M${n(-far - ox)} ${n(bottom)}V${n(B)}H${n(L)}`;
    d += `C${n(L + 0.55 * F)} ${n(B)} ${n(L + 0.42 * F)} ${n(top)} ${n(L + F)} ${n(top)}`;
    d += `H${n(R - F)}C${n(R - 0.42 * F)} ${n(top)} ${n(R - 0.55 * F)} ${n(B)} ${n(R)} ${n(B)}`;
    d += `H${n(g.vw + far - ox)}V${n(bottom)}Z`;
    return d;
  }
  const caseImgs = () => $$('.boon-grid img, .case-620 figure img, .fw-card');
  let cutNodes = [];
  function cutImages() {
    if (!cutGeo || !tl) return;
    const t = tl.time(), want = [];
    if (t > 0.9 && t < 3.3) want.push(el.hero);                          // the film, while it's big
    if (shown >= 0) want.push(...cards[shown].map(a => a.firstElementChild));   // the work cards beside the wheel
    if (cur > endPx - VH() * 1.2) want.push(...caseImgs());                // the work section
    cutNodes.forEach(n => { if (!want.includes(n) && n._cut) { n.style.clipPath = ''; n._cut = false; n._path = ''; } });
    cutNodes = want;
    const top = cutGeo.y;
    const rects = want.map(n => n.getBoundingClientRect());              // all reads first, then all writes
    want.forEach((n, i) => {
      const b = rects[i];
      if (b.bottom <= top || b.top >= cutGeo.vh || b.width < 1) { if (n._cut) { n.style.clipPath = ''; n._cut = false; n._path = ''; } return; }
      const p = `path(evenodd, "M0 0H${b.width.toFixed(1)}V${b.height.toFixed(1)}H0Z ${cutPath(b.left, b.top)}")`;
      if (p !== n._path) { n.style.clipPath = p; n._path = p; }
      n._cut = true;
    });
  }

  /* ---------- the timeline ---------- */
  let tl, geo = null;
  const heroImg = $('#hero video');
  heroImg.src = (TOUCH || innerWidth < 760) ? heroImg.dataset.srcPhone : heroImg.dataset.src;   // phones: lighter film   // the Out-of-Office film (was the mushroom image)
  function measure() {
    const vw = innerWidth, vh = VH(), r = rem();
    document.documentElement.style.setProperty('--vhs', vh + 'px');
    const vs = SVH(); document.documentElement.style.setProperty('--vsm', vs + 'px');
    el.slot1.style.removeProperty('--w'); gsap.set(el.slot1, { clearProps: '--w' });
    gsap.set([el.avg, el.joe, el.line, el.big, ...$$('.big .ln')], { clearProps: 'transform' });
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
    const phone = matchMedia('(max-width:760px)').matches;
    const mid = (vs - h) / 2, low = phone ? pad * 0.95 : vh - pad * 0.95 - h;   // phones: Avg Joe live at the top, not the bottom
    const ax0 = (vw - (wa + gap + wj)) / 2;
    return {
      vh, vw, wa, wj, gap, r, full: vw - 2 * fr, fullH: vh - 2 * fr,
      avg: [{ x: ax0, y: mid }, { x: pad, y: mid }, { x: pad, y: low }],
      joe: [{ x: ax0 + wa + gap, y: mid + jy }, { x: vw - pad - wj, y: mid + jy }, { x: vw - pad - wj, y: low + jy }],
      hero: [s1, s1, { x: fr, y: fr, width: vw - 2 * fr, height: vh - 2 * fr }, s2, { ...s2, y: s2.y - vh }],
      bigFs: parseFloat(getComputedStyle($('.big')).fontSize),
    };
  }

  function build() {
    const keep = tl ? tl.time() : 0;
    if (tl) tl.kill();
    const P = measure(), vh = P.vh;
    heroImg.style.width = P.full + 'px'; heroImg.style.height = P.fullH + 'px';
    const lines = $$('.big .ln');
    // starting state
    gsap.set(el.avg, P.avg[0]); gsap.set(el.joe, P.joe[0]); gsap.set(el.hero, P.hero[0]);
    gsap.set(el.line, { x: 0, y: 0, scale: 1, autoAlpha: 1, color: '#0b0b0b' });
    gsap.set(el.slot1, { '--w': 1 });   // the sentence starts in its final position
    gsap.set(el.big, { autoAlpha: 0, y: 0 });
    gsap.set(lines, { autoAlpha: 0, y: P.bigFs * 0.45 });
    gsap.set(el.wheel, { y: 0, autoAlpha: 0 });
    gsap.set(el.cases, { y: vh, visibility: 'visible' });
    gsap.set(el.wbg, { opacity: 0 });
    wp.v = -SPIN;

    tl = gsap.timeline({ paused: true, defaults: { ease: EASE, duration: 1 } });
    const ft = (t, from, to, at, extra = {}) => tl.fromTo(t, from, { ...to, immediateRender: false, ...extra }, at);

    // 0 → 1: Avg Joe part to the edges; the gap between them uncovers the image first, then the words
    ft(el.avg, P.avg[0], P.avg[1], 0); ft(el.joe, P.joe[0], P.joe[1], 0);

    // 1 → 2: the image opens to fill the frame while the sentence closes up over it;
    //        then Avg (leading) and Joe drop to the bottom
    ft(el.hero, P.hero[1], P.hero[2], 1, { duration: EXPAND });
    ft(el.line, { color: '#0b0b0b' }, { color: '#ffffff' }, 1.1, { duration: 0.25 });
    const dropDur = 0.96 - (EXPAND + 0.02);                          // the rest of the section after the image opens
    ft(el.avg, P.avg[1], P.avg[2], 1 + EXPAND + 0.02, { duration: dropDur });    // only once the image is fully open; linear, so it moves 1:1 with the scroll
    ft(el.joe, P.joe[1], P.joe[2], 1 + EXPAND + 0.05, { duration: dropDur - 0.01 });
    ft(el.slot1, { '--w': 1 }, { '--w': 0 }, 1, { duration: EXPAND });   // the sentence closes up while the image expands
    tl.set(el.big, { autoAlpha: 1 }, 1.99);

    // 2 → 3: the frame crops in to its place in the big sentence; the small sentence stays put and fades,
    //        while the big sentence animates in line by line (the frame crops in; the image doesn't shrink)
    ft(el.hero, P.hero[2], P.hero[3], 2);
    // the small sentence stays put at the same size and fades out as the frame crops in past it
    ft(el.line, { autoAlpha: 1 }, { autoAlpha: 0 }, 2.3, { duration: 0.38, ease: 'power1.in' });
    lines.forEach((ln, i) => ft(ln, { autoAlpha: 0, y: P.bigFs * 0.45 }, { autoAlpha: 1, y: 0 }, 2.1 + i * 0.18, { duration: 0.55, ease: 'power2.out' }));

    // 3 → 4: everything but the logo and nav moves up, the wheel comes in spinning
    ft(el.big, { y: 0 }, { y: -vh }, 3);
    ft(el.hero, P.hero[3], P.hero[4], 3);
    ft(el.wheel, { autoAlpha: 0 }, { autoAlpha: 1 }, 3, { duration: 0.3 });   // the wheel doesn't slide in: it's in place and just rotates in
    ft(wp, { v: -SPIN }, { v: 0 }, 3);                               // spins in at the same speed
    ft(el.wbg, { opacity: 0 }, { opacity: 1 }, 3.2, { duration: 0.8 });

    // 4 → WE: the wheel turns, one word per WS
    ft(wp, { v: 0 }, { v: SERVICES.length - 1 }, 4, { duration: WE - 4 });

    // WE → END: the work comes up
    ft(wp, { v: SERVICES.length - 1 }, { v: SERVICES.length - 1 + SPIN }, WE);   // keeps spinning as it leaves
    ft(el.wheel, { y: 0 }, { y: -vh * 0.35 }, WE);
    ft(el.wheel, { autoAlpha: 1 }, { autoAlpha: 0 }, WE + 0.05, { duration: 0.4 });
    ft(el.wbg, { opacity: 1 }, { opacity: 0 }, WE, { duration: 0.75, ease: 'sine.inOut' });
    ft(el.cases, { y: vh }, { y: 0 }, WE);

    geo = P;
    tl.eventCallback('onUpdate', onTime);
    tl.time(keep, false); onTime();
  }

  // Each style write costs the browser work, so only write when a value actually changes.
  const lastStyle = new WeakMap();
  function put(node, prop, val) {
    let m = lastStyle.get(node); if (!m) lastStyle.set(node, m = {});
    if (m[prop] === val) return;
    m[prop] = val;
    if (prop.startsWith('--')) node.style.setProperty(prop, val); else node.style[prop] = val;
  }
  let shown = -2, lastWheelV = null;
  function onTime() {
    const t = tl.time();
    if (wp.v !== lastWheelV) { lastWheelV = wp.v; layoutWheel(); }        // the wheel only redraws when it turns
    // The frame's size and position come straight from the timeline (no measuring the page).
    const w = gsap.getProperty(el.hero, 'width'), h = gsap.getProperty(el.hero, 'height');
    const hx = gsap.getProperty(el.hero, 'x'), hy = gsap.getProperty(el.hero, 'y');
    // The film scales with its frame part of the way (CROP) and the frame crops the rest; strongest mid-move,
    // nothing at either end. It's moved with a GPU transform only (never resized), which keeps scrolling smooth.
    const pIn = gsap.utils.clamp(0, 1, (t - 1) / EXPAND), pOut = gsap.utils.clamp(0, 1, t - 2);
    const crop = CROP * (t < 2 ? Math.sin(Math.PI * pIn) : Math.sin(Math.PI * pOut));
    const iw = w + (geo.full - w) * crop, ih = h + (geo.fullH - h) * crop;
    const s = Math.max(iw / geo.full, ih / geo.fullH);
    const tx = (w - geo.full * s) / 2, ty = (h - geo.fullH * s) / 2;
    put(heroImg, 'transform', `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) scale(${s.toFixed(4)})`);
    if (t < 1) {
      // As Avg and Joe part, the gap between them uncovers the image first, then the words outward from it.
      const pad = geo.gap * 1.6, vw = geo.vw;
      const gl = gsap.getProperty(el.avg, 'x') + geo.wa + pad;      // gap left edge (viewport x)
      const gr = gsap.getProperty(el.joe, 'x') - pad;               // gap right edge
      const hb = { left: hx, top: hy, right: hx + w, bottom: hy + h };
      if (gr <= gl) {
        put(heroImg, 'clipPath', 'inset(0 0 0 100%)');
        put(el.line, '--l', vw / 2 + 'px'); put(el.line, '--r', vw / 2 + 'px');
        put(el.line, '--t', hb.top.toFixed(1) + 'px'); put(el.line, '--b', (geo.vh - hb.bottom).toFixed(1) + 'px');
      } else {
        // vertically, the reveal starts as the image's own band and grows to the whole sentence once the gap passes the image
        const q = gsap.utils.clamp(0, 1, (hb.left - gl) / (geo.vw * 0.18)), band = 1 - q;
        put(el.line, '--t', (hb.top * band - geo.vh * 2 * q).toFixed(1) + 'px');
        put(el.line, '--b', ((geo.vh - hb.bottom) * band - geo.vh * 2 * q).toFixed(1) + 'px');
        // the gap, in the film's own (unscaled) coordinates
        const Ls = Math.max(0, gl - hb.left), Rs = Math.max(0, hb.right - gr);
        const L = (Ls - tx) / s, R = (tx + geo.full * s - (w - Rs)) / s;
        put(heroImg, 'clipPath', `inset(0 ${Math.max(0, R).toFixed(1)}px 0 ${Math.max(0, L).toFixed(1)}px)`);
        const tl_ = Math.min(gl, hb.left), tr_ = Math.max(gr, hb.right);   // words start at the image's edges
        put(el.line, '--l', Math.max(0, tl_).toFixed(1) + 'px');
        put(el.line, '--r', Math.max(0, vw - tr_).toFixed(1) + 'px');
      }
    } else {
      put(el.line, '--l', '0px'); put(el.line, '--r', '0px'); put(el.line, '--t', '-200%'); put(el.line, '--b', '-200%');
      put(heroImg, 'clipPath', 'none');
    }
    // the frame's corners round off gradually as it moves away from filling the screen
    const fullness = Math.min(1, w / geo.full);
    put(el.hero, 'borderRadius', (Math.round(Math.min(0.16 * Math.min(w, h), (1 - fullness) * 1.8 * geo.r) * 2) / 2) + 'px');
    // work pops in beside whichever word is in focus
    const wv = Math.round(wp.v);
    const wi = t > 3.6 && wv >= 0 && wv <= SERVICES.length - 1 ? wv : -1;
    if (wi !== shown) { shown = wi; showWorks(wi); }
  }

  /* ---------- intro: at the top, Avg and Joe open on their own to show an icon or image ---------- */
  // Loops until you scroll; then they close up and the scroll sequence takes over. Back at the top, it starts again.
  const introItems = $$('#intro > *');
  const gapState = { s: 0 };          // how far each of Avg / Joe is pushed out (px); separate from the scroll timeline
  const applyGap = () => { el.avg.style.translate = `${(-gapState.s).toFixed(2)}px 0`; el.joe.style.translate = `${gapState.s.toFixed(2)}px 0`; };
  let introTl = null, introWait = 0;
  /* the open/close ease measured from Joe's AVG_JOE.mp4: cubic-bezier(.35,.05,.1,1) over 1s (fits the video within ~1px);
     closing is the same curve played backwards */
  const bezier = (x1, y1, x2, y2) => x => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let k = 0; k < 24; k++) { t = (lo + hi) / 2; const bx = 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t * t * x2 + t ** 3; if (bx < x) lo = t; else hi = t; }
    return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3;
  };
  const EASE_OPEN = bezier(0.35, 0.05, 0.1, 1), EASE_CLOSE = bezier(0.9, 0, 0.65, 0.95), OPEN_T = 1.0, DARK_AT = 0.34;
  function introStart() {
    if (RM || introTl) return;
    const r = rem();
    gsap.set(introItems, { xPercent: -50, yPercent: -50 });
    introTl = gsap.timeline({ repeat: -1, delay: 0.5 });
    document.documentElement.classList.add('intro-run');
    introItems.forEach((it, i) => {
      const half = it.getBoundingClientRect().width / 2 + 0.85 * r, o = 'open' + i;
      introTl
        .addLabel(o)
        .to(gapState, { s: half, duration: OPEN_T, ease: EASE_OPEN, onUpdate: applyGap }, o)
        .call(() => introDark(true), null, o + '+=' + DARK_AT)                // black comes in ~63% of the way open, as in the video...
        .fromTo(it, { autoAlpha: 0, scale: 0.86 }, { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'power2.out' }, o + '+=0.3')
        .to(it, { autoAlpha: 0, scale: 0.92, duration: 0.35, ease: 'power2.in' }, o + '+=' + (OPEN_T + 1.5))
        .to(gapState, { s: 0, duration: OPEN_T, ease: EASE_CLOSE, onUpdate: applyGap }, o + '+=' + (OPEN_T + 1.6))
        .call(() => introDark(false), null, o + '+=' + (OPEN_T + 1.6 + OPEN_T - DARK_AT))   // ...and leaves at the mirrored point on the way back
        .to({}, { duration: 0.45 });
    });
  }
  const introDark = on => document.documentElement.classList.toggle('intro-dark', on);
  function introStop() {
    clearTimeout(introWait);
    if (!introTl) return;
    introTl.kill(); introTl = null;
    introDark(false); document.documentElement.classList.remove('intro-run');
    gsap.to(introItems, { autoAlpha: 0, scale: 0.92, duration: 0.25, ease: 'power2.in', overwrite: true });
    gsap.to(gapState, { s: 0, duration: 0.45, ease: 'power3.out', onUpdate: applyGap, overwrite: true });
  }
  function introCheck() {             // called on every scroll update
    if (cur > 2) { introStop(); return; }
    if (introTl) return;
    clearTimeout(introWait);
    introWait = setTimeout(() => { if (cur <= 2) introStart(); }, 1200);
  }

  /* ---------- smooth scroll: Lenis (same settings as sumojoestudio.com) ---------- */
  const lenis = new Lenis({
    lerp: 0.055, wheelMultiplier: 1, syncTouch: true, syncTouchLerp: 0.085, touchInertiaExponent: 1.35, touchMultiplier: 1,   // touch: exactly as sumojoestudio.com
    autoRaf: false,
  });
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  const spacer = $('#scroll-space');
  let room = 0, unit = 1, endPx = 0, maxPx = 0, cur = 0, ready = false, veiling = false, brandOn = false, travel = 0;
  // scroll position <-> timeline time; section 1->2 is OPEN_LEN screens long, every other section one screen
  // knots of [timeline time, screens scrolled]: section 1-2 is OPEN_LEN long, and there is a HOLD at 3 (a pause on the big sentence)
  const KNOTS = () => { const a = LEN_PART, b = a + OPEN_LEN, c = b + LEN_SHRINK, d = c + HOLD; return [[0, 0], [1, a], [2, b], [3, c], [3, d], [END, d + END - 3]]; };
  const pxOf = t => { const k = KNOTS(); for (let i = 1; i < k.length; i++) { const [t0, s0] = k[i - 1], [t1, s1] = k[i]; if (t <= t1 && t1 > t0) return unit * (s0 + (t - t0) / (t1 - t0) * (s1 - s0)); } const [tl1, sl1] = k[k.length - 1]; return unit * (sl1 + t - tl1); };
  const tOf = px => { const s = px / unit, k = KNOTS(); for (let i = 1; i < k.length; i++) { const [t0, s0] = k[i - 1], [t1, s1] = k[i]; if (s <= s1) return s1 > s0 ? t0 + (s - s0) / (s1 - s0) * (t1 - t0) : t1; } const [tl1, sl1] = k[k.length - 1]; return tl1 + s - sl1; };
  function metrics() {
    const t = unit > 1 ? Math.min(tOf(cur), END) : 0, past = Math.max(0, cur - endPx);
    unit = VH() * UNIT;
    endPx = pxOf(END);
    room = Math.max(0, el.cases.scrollHeight - el.cases.clientHeight);
    maxPx = endPx + room + VH();   // + one screen so the work slides up off
    spacer.style.height = (maxPx + innerHeight) + 'px';
    lenis.resize();
    const to = t < END ? pxOf(t) : endPx + past;
    lenis.scrollTo(to, { immediate: true, force: true });
    cur = to;
  }
  let lastSt = -1;
  function render() {
    const t = Math.min(tOf(cur), END);
    if (Math.abs(t - tl.time()) > 1e-5) tl.time(t);
    const past = Math.max(0, cur - endPx);
    const st = Math.min(past, room);
    if (Math.abs(lastSt - st) > 0.5) { el.cases.scrollTop = st; lastSt = st; }
    if (cur >= endPx) put(el.cases, 'transform', `translate3d(0,${(-(past - st)).toFixed(1)}px,0)`);      // after the last case study, the whole section slides up off screen
    cutImages();
    navState();
  }
  lenis.on('scroll', l => {
    const prev = cur;
    cur = l.animatedScroll;
    if (!ready) return;
    scrollTick(cur - prev, l.velocity);
    render();
    introCheck();
    // rotation words only change while you're scrolling
    if (RM || veiling) return;
    travel = Math.min(travel + Math.abs(cur - prev), SWAP_EVERY * 2);
    while (travel >= SWAP_EVERY) {
      travel -= SWAP_EVERY;
      const t = tl.time();
      if (t > 0.05 && t < 2.5) cy.studio.step();
      if (t > 2.15 && t < 3.7) cy.craft.step();
      if (brandOn) cy.brand.step();
    }
  });
  // the work cards pop in on their own clock, so keep their cut-outs current while they animate
  gsap.ticker.add(() => { if (ready && shown >= 0) cutImages(); });

  const inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function goTo(t) { lenis.scrollTo(Math.min(maxPx, pxOf(t)), { duration: 1.1, easing: inOut }); }
  function jumpTo(t) {                // nav + logo: a soft cut instead of replaying everything
    if (veiling) return;
    veiling = true;
    gsap.timeline()
      .to(el.veil, { opacity: 1, duration: RM ? 0.01 : 0.45, ease: 'power2.inOut' })
      .add(() => { lenis.scrollTo(pxOf(t), { immediate: true, force: true }); cur = pxOf(t); render(); })
      .to(el.veil, { opacity: 0, duration: RM ? 0.01 : 0.6, ease: 'power2.inOut' })
      .add(() => { veiling = false; });
  }

  // G toggles the grid overlay (for checking alignment)
  addEventListener('keydown', e => { if (beatOpen) return; if ((e.key === 'g' || e.key === 'G') && !e.metaKey && !e.ctrlKey && !e.altKey) $('#grid-ov').classList.toggle('on'); });
  addEventListener('keydown', e => {
    if (beatOpen) return;
    const down = ['ArrowDown', 'PageDown', ' '].includes(e.key), up = ['ArrowUp', 'PageUp'].includes(e.key);
    if (!down && !up) return;
    e.preventDefault();
    const pos = lenis.targetScroll;
    if (pos > endPx + 1 || (down && pos >= endPx - 1)) {       // work section: smooth page-by-page
      const to = down ? Math.min(maxPx, pos + innerHeight * 0.8) : Math.max(endPx, pos - innerHeight * 0.8);
      lenis.scrollTo(to, { duration: 1 });
      return;
    }
    const f = tOf(pos);
    const next = down ? RESTS.find(s => s > f + 0.01) : [...RESTS].reverse().find(s => s < f - 0.01);
    if (next !== undefined) goTo(next);
  });

  $$('.nb').forEach(a => a.addEventListener('click', e => {
    if (a.dataset.k === 'contact') return;          // Contact opens WhatsApp in a new tab
    e.preventDefault();
    if (a.dataset.k === 'studio') loadBeat(() => window.AvgBeat.toggle());   // Studio brings up the drum machine
    if (a.dataset.k === 'work') goTo(END);
  }));
  const hov = (n, key) => { n.addEventListener('mouseenter', () => { hoverSay = key; navState(); }); n.addEventListener('mouseleave', () => { hoverSay = null; navState(); }); };
  /* nav buttons: on hover their letters run through the rotation faces. Each letter keeps the box of its Nuckle width,
     and the new face is centred in it, so the word and the other buttons never move. */
  function navLetters(node) {
    const t = node.textContent;
    node.textContent = '';
    [...t].forEach(ch => {
      const s = document.createElement('span');
      s.textContent = ch;
      if (ch.trim()) s.className = 'hl';
      node.appendChild(s);
    });
    node.querySelectorAll('.hl').forEach(s => { s.style.width = s.getBoundingClientRect().width.toFixed(2) + 'px'; });
  }
  const navLabel = a => a.querySelector('.say') || a.querySelector('.nbt');
  $$('.nb').forEach(a => {
    if (!a.querySelector('.say')) {
      const word = a.textContent.trim();
      if (!a.getAttribute('aria-label')) a.setAttribute('aria-label', word);
      const sp = document.createElement('span'); sp.className = 'nbt'; sp.setAttribute('aria-hidden', 'true'); sp.textContent = word;
      a.textContent = ''; a.appendChild(sp);
    }
    let timer = 0;
    const tick = () => {
      const ls = [...navLabel(a).querySelectorAll('.hl')];
      if (!ls.length) return;
      const s = ls[Math.floor(Math.random() * ls.length)];
      let f; do { f = ROT[Math.floor(Math.random() * ROT.length)]; } while (f === s.dataset.f);
      s.dataset.f = f; s.style.fontFamily = '"r-' + f + '"'; s.style.fontSize = (SIZE[f] || 1) + 'em';
    };
    const reset = () => navLabel(a).querySelectorAll('.hl').forEach(s => { s.style.fontFamily = ''; s.style.fontSize = ''; delete s.dataset.f; });
    a.addEventListener('mouseenter', () => { if (RM || TOUCH) return; clearInterval(timer); tick(); timer = setInterval(tick, 90); });
    a.addEventListener('mouseleave', () => { clearInterval(timer); reset(); });
  });
  document.fonts.ready.then(() => $$('.nb').forEach(a => navLetters(navLabel(a))));
  hov($('.nb[data-k="contact"]'), 'soon');
  hov($('.nb[data-k="studio"]'), 'play');
  $$('.work').forEach(n => hov(n, 'pick'));
  $$('.logo').forEach(a => a.addEventListener('click', e => { e.preventDefault(); jumpTo(0); }));
  $$('a[href^="#case-"]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const t = $(a.getAttribute('href'));
    if (t) lenis.scrollTo(endPx + t.offsetTop, { duration: 1.2, easing: inOut });
  }));
  $$('a[href="#"]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  // work section: reveal as it comes into view; "brand" only turns while it's on screen
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in'); io.unobserve(en.target);
  }), { threshold: 0.15 });
  // Case-study copy is split into its actual lines (re-split on resize) so each line slides up on its own.
  const heads = $$('.case h2');
  function splitLines(h) {
    const wasIn = !!h.querySelector('.line-rv.in');
    h.querySelectorAll('.line-rv').forEach(l => { io.unobserve(l); l.replaceWith(...l.childNodes); });
    h.querySelectorAll('.wd').forEach(w => w.replaceWith(w.textContent));
    h.normalize();
    const units = [];
    [...h.childNodes].forEach(n => {
      if (n.nodeType !== 3) { units.push(n); return; }
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(p => {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
        const s = document.createElement('span'); s.className = 'wd'; s.textContent = p;
        frag.appendChild(s); units.push(s);
      });
      n.replaceWith(frag);
    });
    const fs = parseFloat(getComputedStyle(h).fontSize);
    const lineOf = new Map(); let li = -1, lastTop = -1e9;
    units.forEach(u => { const top = u.getBoundingClientRect().top; if (top > lastTop + fs * 0.5) { li++; lastTop = top; } lineOf.set(u, li); });
    const lines = Array.from({ length: li + 1 }, () => { const s = document.createElement('span'); s.className = 'line-rv rv'; return s; });
    let curLine = 0;
    [...h.childNodes].forEach(n => { if (lineOf.has(n)) curLine = lineOf.get(n); lines[curLine].appendChild(n); });
    lines.forEach((l, i) => { l.style.transitionDelay = (i * 0.09).toFixed(2) + 's'; h.appendChild(l); if (wasIn) l.classList.add('in'); });
    return lines;
  }
  // lozenges and images slide and fade up too; siblings (each lozenge, each image) follow one after another
  $$('.rv').forEach(n => {
    const sibs = [...n.parentElement.children].filter(c => c.classList.contains('rv'));
    const i = sibs.indexOf(n);
    if (i > 0) n.style.transitionDelay = (i * (n.tagName === 'IMG' ? 0.14 : 0.07)).toFixed(2) + 's';
  });
  let revealing = false;
  const startReveal = () => { revealing = true; $$('.rv:not(.in)').forEach(n => io.observe(n)); };   // only once the work section is below the screen
  function resplit() { heads.forEach(h => splitLines(h).forEach(l => { if (revealing && !l.classList.contains('in')) io.observe(l); })); }
  new IntersectionObserver(es => es.forEach(en => { brandOn = en.isIntersecting; })).observe(cy.brand.el);
  $$('#s-cases img').forEach(i => i.addEventListener('load', () => ready && metrics()));

  /* ---------- the drum machine (from the Sumo Joe Studio site), brought up by Studio ---------- */
  // Loaded only the first time it's opened, so it costs nothing until then.
  let beatOpen = false, beatLoading = false;
  function loadBeat(cb) {
    if (window.AvgBeat) return cb();
    addEventListener('avgbeat-ready', cb, { once: true });
    if (beatLoading) return;
    beatLoading = true;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'beat/beat.css'; document.head.appendChild(l);
    const s = document.createElement('script'); s.src = 'beat/beat.js'; s.async = true; document.body.appendChild(s);
  }
  addEventListener('avgbeat', e => {
    beatOpen = !!e.detail;
    if (beatOpen) lenis.stop(); else lenis.start();     // the page stays put while you play
    $('.nb[data-k="studio"]').setAttribute('aria-expanded', String(beatOpen));
    navState();
  });

  /* ---------- sound: the same interface sounds as sumojoestudio.com, synthesised (no files) ---------- */
  // Browsers only allow sound after a click or tap, so it starts with your first one.
  let actx = null, master = null, hoverAt = 0, tickAt = 0, tickTravel = 0, lastHover = null;
  function audio() {
    if (!actx) { actx = new (window.AudioContext || window.webkitAudioContext)(); master = actx.createGain(); master.gain.value = 0.5; master.connect(actx.destination); }
    if (actx.state !== 'running') actx.resume();
    return actx;
  }
  function blip(f0, f1, dur, vol, type = 'sine') {
    if (!actx || actx.state !== 'running') return;
    const t = actx.currentTime + 0.002, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(1e-4, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function crackle() {
    if (!actx || actx.state !== 'running') return;
    const t = actx.currentTime + 0.002, n = Math.ceil(0.012 * actx.sampleRate), b = actx.createBuffer(1, n, actx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
    const src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    src.buffer = b; f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 1.2; g.gain.value = 0.25;
    src.connect(f).connect(g).connect(master); src.start(t);
  }
  const clickable = n => (n instanceof Element && !n.closest('.sp') ? n.closest('a, button, [role=button], #wheel-list li') : null);
  document.addEventListener('pointerdown', e => {
    audio();
    if (clickable(e.target)) { blip(1500, 700, 0.045, 0.16, 'triangle'); crackle(); }          // click: a short "tock"
  });
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const c = clickable(e.target);
    if (c && c !== lastHover && actx && performance.now() - hoverAt > 70) { hoverAt = performance.now(); blip(2600, 2200, 0.018, 0.035); }   // hover: a tiny tick
    lastHover = c;
  });
  function scrollTick(delta, velocity) {          // scroll: a soft tick every 160px, brighter when you scroll faster
    if (!actx) return;
    tickTravel += Math.abs(delta);
    if (tickTravel < 160) return;
    tickTravel = 0;
    const now = performance.now();
    if (now - tickAt < 70) return;
    tickAt = now;
    const a = Math.min(1, Math.abs(velocity) / 60);
    blip(520 + 520 * a, 420 + 420 * a, 0.03, 0.03 + 0.03 * a, 'triangle');
  }

  /* ---------- start ---------- */
  let rz, lastW = innerWidth, lastVH = 0;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      if (!ready) return;
      if (TOUCH && innerWidth === lastW) {
        // just the browser bars sliding in or out: the layout uses a stable height, so only the notch follows.
        // (If that stable height itself ever changes, re-place everything once, keeping the scroll position.)
        if (VH() !== lastVH) { lastVH = VH(); build(); }
        notchGeo(); cutImages(); render(); return;
      }
      lastW = innerWidth;
      advCache.clear(); Object.values(cy).forEach(c => c.measure());
      resplit(); build(); metrics(); notchGeo(); render(); setNav('studio');
    }, TOUCH ? 60 : 120);
  });

  const loaded = Promise.all([
    document.fonts.ready,
    ...ROT.map(f => document.fonts.load(`1em "r-${f}"`, 'studiocraftbn').catch(() => {})),
    document.fonts.load('500 1em Nuckle'), document.fonts.load('300 1em Riccione'), document.fonts.load('1em snell', '&'),
  ]);
  Promise.race([loaded, new Promise(r => setTimeout(r, 2500))]).then(() => {
    Object.values(cy).forEach(c => c.measure());
    resplit();
    build(); metrics(); setNav('studio'); notchGeo(); ready = true; render(); lastVH = VH();
    // start the film (autoplay alone isn't always honoured); keep it playing if the browser pauses it
    heroImg.muted = true; heroImg.playsInline = true;
    const playFilm = () => { if (heroImg.paused) heroImg.play().catch(() => {}); };
    playFilm(); heroImg.addEventListener('canplay', playFilm, { once: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) playFilm(); });
    addEventListener('pointerdown', playFilm, { once: true }); addEventListener('wheel', playFilm, { once: true, passive: true });
    requestAnimationFrame(() => requestAnimationFrame(startReveal));
    gsap.fromTo('.logo', { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: RM ? 0.01 : 1.2, ease: 'power2.out', stagger: 0.12, clearProps: 'filter' });
    if (cur <= 2) gsap.delayedCall(RM ? 0 : 1.1, () => { if (cur <= 2) introStart(); });
  });

  // for testing in the console
  window.__avg = {
    goTo, jumpTo, RESTS, lenis, cy, get intro() { return !!introTl; }, get gap() { return gapState.s; },
    get t() { return tl && tl.time(); }, get target() { return tOf(lenis.targetScroll); }, pxOf: t => pxOf(t),
  };
})();
