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
  const UNIT = TOUCH ? 1 : 1.2;   // desktop back to the pace before 25 Nov evening; screens of scrolling per section (higher = slower)
  const CROP = 0.5;          // how much the frame crops (vs scales) mid-move: 0 = only scales, 1 = only crops; none at the ends
  // scroll lengths (in sections) for the first three moves, which need a slower pace than the rest
  const LEN_PART = TOUCH ? 1 : 1.5;      // Avg Joe parting to the sentence
  const OPEN_LEN = TOUCH ? 1 : 2.5;      // the image opening + Avg/Joe dropping
  const LEN_SHRINK = TOUCH ? 1 : 1.6;    // the image cropping in to the big sentence
  const EXPAND = TOUCH ? 0.6 : LEN_SHRINK / OPEN_LEN;   // share of the open section the image expand takes; the rest is Avg and Joe settling
  const HOLD = 0;            // screens of scrolling where nothing moves once the image has settled into the big sentence
  const WS = 0.2;            // screens of scrolling per word on the wheel (matched to the page's scroll speed)
  const SWAP_EVERY = 85;     // px of scrolling between typeface changes in the rotation words
  const TRACK = 0.05;        // rotation words: tracking -50

  // Each face is scaled so its lowercase (o, x, n) is exactly as tall as Nuckle's: measured from the font files
  const SIZE = { avebury: 0.919, campground: 1.665, 'gilroy-heavy': 1.136, kelsi: 0.687, postoni: 1.289,
    'iowan-black': 1.148, 'iowan-black-italic': 1.164, 'snell-black': 1.521 };
  const ROT = ['avebury', 'campground', 'gilroy-heavy', 'kelsi', 'postoni', 'iowan-black', 'iowan-black-italic', 'snell-black'];

  // Services on the wheel, each with the work that pops in beside it.
  // x/y are % of the screen, w is rem, ar is width/height. href is ready for case-study links.
  const SERVICES = [
    { name: 'AI Content',      desc: "We art direct every frame, then AI handles the production, so your imagery and film keep up with how often you post.", works: [] },
    { name: 'Art Direction',   desc: "We set the look of every shoot, campaign and drop, so each frame feels like it came from the same hand.", works: [] },
    { name: 'Branding',        desc: "We find what makes you you, then shape it into a name, a mark and a voice people remember.", works: [] },
    { name: 'Design',          desc: "We curate every typeface, colour and grid around your brand, then build it into a design system that grows with you.", works: [] },
    { name: 'Digital',         desc: "Websites and apps that move nicely, load fast and feel easy on any screen.", works: [] },
    { name: 'Packaging',       desc: "Packs that earn their spot on the shelf, from structure and print to the moment they're opened.", works: [] },
    { name: 'Strategy',        desc: "We dig into your audience and your market first, so every creative call has a reason behind it.", works: [] },
    { name: 'Visual Identity', desc: "Logo, type, colour and imagery pulled into one kit your team can use without us.", works: [] },
  ];

  const el = {
    avg: $('#logo-avg'), joe: $('#logo-joe'), line: $('#s-line'), slot1: $('#slot1'), hero: $('#hero'),
    more: $('#more'), big: $('#s-big'), slot2: $('#slot2'), wheel: $('#s-wheel'), wbg: $('#wheel-bg'), list: $('#wheel-list'),
    works: $('#works'), cases: $('#s-cases'), veil: $('#veil'), say: $('.say'),
    notch: $('.notch'),
  };

  const more = el.more;
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
  /* a short line about each capability, beside the wheel; it swaps word by word as each one comes into focus */
  const descEl = document.createElement('p');
  descEl.id = 'wheel-desc'; descEl.setAttribute('aria-live', 'polite');
  el.wheel.appendChild(descEl);
  let descTl = null;
  function showDesc(i) {
    if (descTl) descTl.kill();
    const out = descEl.children.length ? descEl.children : null;
    descTl = gsap.timeline();
    if (out) descTl.to(out, { autoAlpha: 0, y: '-0.4em', duration: RM ? 0.01 : 0.18, ease: 'power2.in', stagger: RM ? 0 : 0.004 });
    descTl.add(() => {
      descEl.textContent = '';
      if (i < 0) return;
      SERVICES[i].desc.split(' ').forEach((w, k, all) => {
        const s = document.createElement('span'); s.className = 'dw'; s.textContent = w;
        descEl.appendChild(s); if (k < all.length - 1) descEl.appendChild(document.createTextNode(' '));
      });
      gsap.fromTo(descEl.children, { autoAlpha: 0, y: '0.7em' },
        { autoAlpha: 1, y: 0, duration: RM ? 0.01 : 0.5, ease: 'power3.out', stagger: RM ? 0 : 0.018 });
    });
  }
  function showWorks(i) {
    showDesc(i);
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
  // the middle of the notch always books a call now (hovering it says "Pick a time")
  const SAYS = { top: 'Scroll down', big: 'Book call', wheel: 'Book call', pick: 'Book call', work: 'Book call', end: 'Book call', soon: 'Book call', play: 'Pick a time', beat: 'Book call', info: 'Book call' };
  let saying = 'Studio', sayTl = null, hoverSay = null;
  function say(text) {
    if (document.documentElement.classList.contains('bk-on')) text = 'Close';   // while the form is open, the middle button closes it
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
    const down = where === 'top' && !beatOpen && cur <= 2;   // before any scrolling the middle button says Scroll down; Book call as soon as they scroll
    say(beatOpen ? SAYS.beat : down ? 'Scroll down' : SAYS[hoverSay && (hoverSay !== 'pick' || where === 'wheel') ? hoverSay : where === 'top' ? 'big' : where]);
    if (downOn !== down) { downOn = down; document.documentElement.classList.toggle('nb-down', down); el.say.parentNode.setAttribute('aria-label', down ? 'Scroll down' : 'Book a call'); }
    if (workBtn._on !== (where === 'work')) { workBtn._on = where === 'work'; workBtn.classList.toggle('on', workBtn._on); }
  }
  let downOn = null;
  const workBtn = $('.nb[data-k="work"]');
  function setNav() { navState(); }

  /* ---------- the timeline ---------- */
  let tl, geo = null;
  const heroImg = $('#hero video');
  heroImg.src = (TOUCH || innerWidth < 760) ? heroImg.dataset.srcPhone : heroImg.dataset.src;   // phones: lighter film   // the Out-of-Office film (was the mushroom image)
  function measure() {
    const vw = innerWidth, vh = VH(), r = rem();
    document.documentElement.style.setProperty('--vhs', vh + 'px');
    const vs = SVH(); document.documentElement.style.setProperty('--vsm', vs + 'px');
    el.slot1.style.removeProperty('--w'); gsap.set(el.slot1, { clearProps: '--w' });
    gsap.set([el.avg, el.joe, el.line, el.big, ...$$('.big .ln'), more], { clearProps: 'transform' });
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
    // "Find out more" sits well clear under the sentence and travels at its own pace: it rises in from further down,
    // settles as the sentence does, then trails and fades as the sentence leaves, so the two never move as one block
    const lastLn = lines[lines.length - 1].getBoundingClientRect();
    // (the lines are parked 0.45em low at this point, so take that back off)
    more.style.top = (lastLn.bottom - P.bigFs * 0.45 + P.bigFs * (matchMedia('(max-width:760px)').matches ? 1.2 : 0.9)) + 'px';
    gsap.set(more, { xPercent: -50, y: vh * 0.55, autoAlpha: 0 });
    ft(more, { y: vh * 0.55 }, { y: 0 }, 2.35, { duration: 0.65 });
    ft(more, { autoAlpha: 0 }, { autoAlpha: 1 }, 2.55, { duration: 0.35 });

    // 3 → 4: everything but the logo and nav moves up, the wheel comes in spinning
    ft(el.big, { y: 0 }, { y: -vh }, 3);
    ft(more, { y: 0 }, { y: -vh * 0.55 }, 3);                         // trails behind the sentence on the way out (the gap opens up)...
    ft(more, { autoAlpha: 1 }, { autoAlpha: 0 }, 3.12, { duration: 0.3 });   // ...and fades before the wheel settles in
    ft(el.hero, P.hero[3], P.hero[4], 3);
    ft(el.wheel, { autoAlpha: 0 }, { autoAlpha: 1 }, 3, { duration: 0.3 });   // the wheel doesn't slide in: it's in place and just rotates in
    ft(wp, { v: -SPIN }, { v: 0 }, 3);                               // spins in at the same speed
    ft(el.wbg, { opacity: 0 }, { opacity: 1 }, 3.2, { duration: 0.8 });

    // 4 → WE: the wheel turns, one word per WS
    ft(wp, { v: 0 }, { v: SERVICES.length - 1 }, 4, { duration: WE - 4 });

    // WE → END: the work comes up
    ft(wp, { v: SERVICES.length - 1 }, { v: SERVICES.length - 1 + SPIN }, WE);   // keeps spinning as it leaves
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
    // wheel and trackpad (desktop): the smooth glide from before 25 Nov evening, lerp 0.055. Touch: Lenis drives it at its standard feel (no custom speeds),
    // so the iPhone Safari bar sliding in and out can't make it stick. Lenis also runs the glides for the buttons.
    smoothWheel: !TOUCH, lerp: 0.055, wheelMultiplier: 1, syncTouch: true, syncTouchLerp: 0.07, touchInertiaExponent: 1.7, touchMultiplier: 0.9, autoRaf: false,   // touch feel Joe set on his iPhone (25 Nov)
  });
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  const spacer = $('#scroll-space');
  const foot = $('#foot');
  let room = 0, sroom = 0, footExtra = 0, unit = 1, endPx = 0, maxPx = 0, cur = 0, ready = false, veiling = false, brandOn = false, travel = 0;
  // scroll position <-> timeline time; section 1->2 is OPEN_LEN screens long, every other section one screen
  // knots of [timeline time, screens scrolled]: section 1-2 is OPEN_LEN long, and there is a HOLD at 3 (a pause on the big sentence)
  const KNOTS = () => { const a = LEN_PART, b = a + OPEN_LEN, c = b + LEN_SHRINK, d = c + HOLD; const e = d + (TOUCH ? 0.4 : 0.6), f = e + WE - 4; return [[0, 0], [1, a], [2, b], [3, c], [3, d], [4, e], [WE, f], [END, f + (END - WE) * (TOUCH ? 0.8 : 1)]]; };   // the steps into and out of the wheel are short (shorter still on phones), so no long empty gaps   // the big sentence -> wheel step is 0.6 of a screen, so there's no long empty gap between them
  const pxOf = t => { const k = KNOTS(); for (let i = 1; i < k.length; i++) { const [t0, s0] = k[i - 1], [t1, s1] = k[i]; if (t <= t1 && t1 > t0) return unit * (s0 + (t - t0) / (t1 - t0) * (s1 - s0)); } const [tl1, sl1] = k[k.length - 1]; return unit * (sl1 + t - tl1); };
  const tOf = px => { const s = px / unit, k = KNOTS(); for (let i = 1; i < k.length; i++) { const [t0, s0] = k[i - 1], [t1, s1] = k[i]; if (s <= s1) return s1 > s0 ? t0 + (s - s0) / (s1 - s0) * (t1 - t0) : t1; } const [tl1, sl1] = k[k.length - 1]; return tl1 + s - sl1; };
  function metrics() {
    const t = unit > 1 ? Math.min(tOf(cur), END) : 0, past = Math.max(0, cur - endPx);
    unit = VH() * UNIT;
    endPx = pxOf(END);
    // a see-through tail after the last case study, so it scrolls all the way up under the held Case Studies bar before the
    // title and bar move off; the footer shows through the tail, exactly as when the section slid up
    const tail = $('.cases-tail'), mk = $('.fw-mark'), cbar = $('.cases-over > .sec-title'), bkh = $('.bk-home');
    let T = 0;
    if (tail && mk && cbar) { tail.style.height = '0px'; const pinned = (parseFloat(getComputedStyle(mk).top) || 0) + mk.offsetHeight + cbar.offsetHeight - 1; T = Math.max(0, Math.round(el.cases.clientHeight - (bkh && el.cases.contains(bkh) ? bkh.offsetHeight : 0) - pinned)); tail.style.height = T + 'px'; }
    room = Math.max(0, el.cases.scrollHeight - el.cases.clientHeight - T);
    sroom = room + T;
    // phones: the footer can be taller than the screen you can see, so leave room to scroll the rest of it into view
    footExtra = foot ? Math.max(0, Math.max(...[...foot.children].map(c => c.offsetTop + c.offsetHeight)) - SVH()) : 0;
    maxPx = endPx + room + VH() + footExtra;   // + one screen so the work slides up off
    spacer.style.height = (maxPx + VH()) + 'px';   // the tallest the screen gets, so the end is reachable with the browser bars showing or hidden
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
    const st = Math.min(past, sroom);
    if (Math.abs(lastSt - st) > 0.5) { el.cases.scrollTop = st; lastSt = st; }
    if (cur >= endPx) put(el.cases, 'transform', `translate3d(0,${(-(past - st)).toFixed(1)}px,0)`);      // after the last case study, the whole section slides up off screen
    if (foot) {
      const up = Math.max(0, past - room), p = Math.min(1, up / VH());
      foot.style.visibility = up > 1 ? 'visible' : 'hidden';   // ...uncovering the footer behind it
      const rest = Math.min(footExtra, Math.max(0, up - VH()));   // then the rest of a tall footer scrolls up into view
      foot.style.setProperty('--fy', (0.75 * (1 - p) * VH() - rest).toFixed(1) + 'px');   // its contents rise into place a little behind the work (as on Malvah)
      document.documentElement.classList.toggle('cases-off', up > 0);   // the work is solid while it slides off, so the footer never shows through it
    }
    document.documentElement.classList.toggle('foot-in', past > room + VH() * 0.35);   // and the notch drops away
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
  const typing = e => e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');   // keys typed into the form are the visitor's words, not shortcuts
  addEventListener('keydown', e => { if (beatOpen || typing(e)) return; if ((e.key === 'g' || e.key === 'G') && !e.metaKey && !e.ctrlKey && !e.altKey) $('#grid-ov').classList.toggle('on'); });
  addEventListener('keydown', e => {
    if (beatOpen || typing(e)) return;
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

  addEventListener('avgbook', e => { if (e.detail) lenis.stop(); else lenis.start(); navState(); });
  const goDown = () => { const f = tOf(lenis.targetScroll), next = f < 1.99 ? 2 : RESTS.find(s => s > Math.max(2, f) + 0.01); if (next !== undefined) goTo(next); };   // to the open film, then the big sentence
  $$('.nb').forEach(a => a.addEventListener('click', e => {
    if (a.dataset.k === 'info' || a.dataset.k === 'work') return;   // Work and Info go to their pages
    e.preventDefault();
    if (a.dataset.k === 'home') { if (window.AvgBook && document.documentElement.classList.contains('bk-on')) AvgBook.close && AvgBook.close(); goTo(0); return; }   // Studio: back to the top
    if (a.dataset.k === 'book') { window.AvgBook && AvgBook.open(a); return; }
    if (a.dataset.k === 'studio' && downOn) { goDown(); return; }
    if (a.dataset.k === 'studio' && window.AvgBook) AvgBook.open(a);   // the middle button books a call
  }));
  const hov = (n, key) => { n.addEventListener('mouseenter', () => { hoverSay = key; navState(); }); n.addEventListener('mouseleave', () => { hoverSay = null; navState(); }); };
  /* nav buttons: on hover their letters run through the rotation faces. Each letter keeps the box of its Nuckle width,
     and the new face is centred in it, so the word and the other buttons never move. */
  function navLetters(node) {
    const t = node.textContent;
    node.textContent = '';
    t.split(' ').forEach((word, k) => {         // each word stays in one piece so it can't break mid-word
      if (k) node.appendChild(document.createTextNode(' '));
      const w = document.createElement('span'); w.className = 'hw';
      [...word].forEach(ch => {
        const s = document.createElement('span');
        s.textContent = ch;
        if (/\p{L}/u.test(ch)) s.className = 'hl';
        w.appendChild(s);
      });
      node.appendChild(w);
    });
    // width from the font itself (not the screen), so a hidden or scaled-down card still gets the right boxes; in rem (each letter's own font-size changes as it swaps faces)
    const cs = getComputedStyle(node), r = rem(), fs = parseFloat(cs.fontSize), ls = parseFloat(cs.letterSpacing) || 0;
    node.querySelectorAll('.hl').forEach(s => { s.style.width = ((advance(s.textContent, '', fs) + ls) / r).toFixed(4) + 'rem'; });
  }
  function rotateOnHover(trigger, label) {      // label() returns the element whose letters change
    let timer = 0;
    const tick = () => {
      const ls = [...label().querySelectorAll('.hl')];
      if (!ls.length) return;
      const s = ls[Math.floor(Math.random() * ls.length)];
      let f; do { f = ROT[Math.floor(Math.random() * ROT.length)]; } while (f === s.dataset.f);
      s.dataset.f = f; s.style.fontFamily = '"r-' + f + '"'; s.style.fontSize = (SIZE[f] || 1) + 'em';
    };
    const reset = () => label().querySelectorAll('.hl').forEach(s => { s.style.fontFamily = ''; s.style.fontSize = ''; delete s.dataset.f; });
    trigger.addEventListener('mouseenter', () => { if (RM || TOUCH) return; clearInterval(timer); tick(); timer = setInterval(tick, 90); });
    trigger.addEventListener('mouseleave', () => { clearInterval(timer); reset(); });
  }
  const navLabel = a => a.querySelector('.say') || a.querySelector('.nbt');
  $$('.nb').forEach(a => {
    if (!a.querySelector('.say')) {
      const word = a.textContent.trim();
      if (!a.getAttribute('aria-label')) a.setAttribute('aria-label', word);
      const sp = document.createElement('span'); sp.className = 'nbt'; sp.setAttribute('aria-hidden', 'true'); sp.textContent = word;
      a.textContent = ''; a.appendChild(sp);
    }
    rotateOnHover(a, () => navLabel(a));
  });
  document.fonts.ready.then(() => $$('.nb').forEach(a => navLetters(navLabel(a))));
  const csLinks = [...$$('.fw-link, .more, .more-pill').map(a => [a, a]), ...$$('.work').map(a => [a, a.querySelector('span')])];
  csLinks.forEach(([trigger, lab]) => { if (!lab.getAttribute('aria-label') && trigger === lab) lab.setAttribute('aria-label', lab.textContent.trim()); rotateOnHover(trigger, () => lab); });
  document.fonts.ready.then(() => csLinks.forEach(([, lab]) => navLetters(lab)));
  hov($('.nb[data-k="info"]'), 'info');
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
        render(); return;
      }
      lastW = innerWidth;
      advCache.clear(); Object.values(cy).forEach(c => c.measure());
      resplit(); build(); metrics(); render(); setNav('studio');
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
    build(); metrics(); setNav('studio'); ready = true; render(); lastVH = VH();
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

// Home Featured Work: rows stack under the held title like the Work page; the last picture runs to the foot of the screen
(() => {
  const sec = document.querySelector('.featured'), title = document.querySelector('.fw-mark'), stack = sec && sec.querySelector('.hf-stack');
  if (!title || !stack) return;
  const rows = [...stack.querySelectorAll('.hf')], scroller = document.getElementById('s-cases');
  let base = 0, th = 0, raf = 0;
  const pin = () => {
    title.style.top = ''; base = parseFloat(getComputedStyle(title).top) || 0; th = title.getBoundingClientRect().height;
    const bar = stack.querySelector('.hf-bar'), bh = bar ? bar.getBoundingClientRect().height : 36;
    stack.style.setProperty('--hf-top', (base + th - 1).toFixed(2) + 'px');
    stack.style.setProperty('--hf-bar', bh.toFixed(2) + 'px');
    rows.forEach((r, i) => r.style.setProperty('--i', i));
    stack.dataset.bar = bh;
    { const cb = document.querySelector('.cases-over > .sec-title'); if (cb) (scroller || sec).style.setProperty('--cs-bar', cb.getBoundingClientRect().height.toFixed(2) + 'px');  if (scroller) scroller.style.setProperty('--sc-h', scroller.clientHeight + 'px'); }   // the Case Studies bar, so the title lets go with it
    (scroller || sec).style.setProperty('--fw-side', (base + th - 1).toFixed(2) + 'px');   // Good to know holds just under the big title
    tick();
  };
  const tick = () => {
    raf = 0;
    const off = 0;   // the stack no longer lifts: it holds and the case studies slide up over it
    title.style.top = (base + off).toFixed(1) + 'px';
    stack.style.setProperty('--hf-off', off.toFixed(1) + 'px');
  };
  const ask = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', ask, { passive: true });
  scroller && scroller.addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', (f => { let w = innerWidth; return () => { if (innerWidth === w && matchMedia('(pointer: coarse)').matches) return; w = innerWidth; f(); }; })(pin)); document.fonts && document.fonts.ready.then(pin);
  pin();
})();
