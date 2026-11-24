/* Avg Joe — shared script for the Work page and the case studies.
   Same chrome as the home page (Lenis scroll, notch nav, hover type rotation, sounds, drum machine),
   plus the interactive parts the case studies are built from. Each part is switched on by a data attribute:
     data-palette   colour swatches that recolour a stage (background + logo)
     data-type      type tester: type your own words, sliders for size / tracking / weight
     data-strip     a row of images you drag sideways
     data-fader     images that cross-fade on their own (and on click)
     data-model     a 3D model you can turn (loads model-viewer only when it scrolls near)          */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOUCH = matchMedia('(pointer: coarse)').matches;
  const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);
  const cssPx = n => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)) * rem();

  /* ---------- smooth scroll: same Lenis settings as the home page ---------- */
  // phones scroll natively here (syncTouch off): the smoothing felt slow under a finger; desktop wheels keep the smooth glide
  const lenis = new Lenis({ lerp: 0.055, wheelMultiplier: 1, syncTouch: false, autoRaf: false });
  const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);

  /* ---------- the notch (same outline as the home page) ---------- */
  const NOTCH_FLANK = 2.1, notch = $('.notch');
  function drawNotch() {
    const b = notch.getBoundingClientRect(), w = b.width, h = b.height, fr = cssPx('--frame');
    let svg = notch.querySelector('svg.notch-fill');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'notch-fill'); svg.setAttribute('aria-hidden', 'true');
      svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
      notch.prepend(svg);
    }
    const B = h - 1, F = NOTCH_FLANK * (h - 1), H = h + fr + 4, n = v => v.toFixed(1);
    svg.setAttribute('viewBox', `0 0 ${n(w)} ${n(H)}`);
    svg.style.width = w + 'px'; svg.style.height = H + 'px';
    svg.firstChild.setAttribute('d', `M0 ${n(B)}C${n(0.55 * F)} ${n(B)} ${n(0.42 * F)} 0 ${n(F)} 0H${n(w - F)}C${n(w - 0.42 * F)} 0 ${n(w - 0.55 * F)} ${n(B)} ${n(w)} ${n(B)}V${n(H)}H0Z`);
  }

  /* ---------- hover: letters run through the rotation faces, each locked to its own width ---------- */
  const SIZE = { avebury: 0.919, campground: 1.665, 'gilroy-heavy': 1.136, kelsi: 0.687, postoni: 1.289, 'iowan-black': 1.148, 'iowan-black-italic': 1.164, 'snell-black': 1.521 };
  const ROT = Object.keys(SIZE);
  const meter = document.createElement('span');
  meter.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;letter-spacing:0;line-height:1;font-family:"Nuckle"';
  document.body.appendChild(meter);
  const adv = new Map();
  function advance(ch, fs) {
    const k = ch + '|' + fs;
    if (!adv.has(k)) { meter.style.fontSize = fs + 'px'; meter.textContent = ch; adv.set(k, meter.getBoundingClientRect().width); }
    return adv.get(k);
  }
  function letters(node) {
    const t = node.textContent;
    node.textContent = '';
    t.split(' ').forEach((word, k) => {
      if (k) node.appendChild(document.createTextNode(' '));
      const w = document.createElement('span'); w.className = 'hw';
      [...word].forEach(ch => { const s = document.createElement('span'); s.textContent = ch; if (/\p{L}/u.test(ch)) s.className = 'hl'; w.appendChild(s); });
      node.appendChild(w);
    });
    const cs = getComputedStyle(node), r = rem(), fs = parseFloat(cs.fontSize), ls = parseFloat(cs.letterSpacing) || 0;
    $$('.hl', node).forEach(s => { s.style.width = ((advance(s.textContent, fs) + ls) / r).toFixed(4) + 'rem'; });
  }
  function rotateOnHover(trigger, label) {
    let timer = 0;
    const tick = () => {
      const ls = $$('.hl', label);
      if (!ls.length) return;
      const s = ls[Math.floor(Math.random() * ls.length)];
      let f; do { f = ROT[Math.floor(Math.random() * ROT.length)]; } while (f === s.dataset.f);
      s.dataset.f = f; s.style.fontFamily = '"r-' + f + '"'; s.style.fontSize = SIZE[f] + 'em';
    };
    const reset = () => $$('.hl', label).forEach(s => { s.style.fontFamily = ''; s.style.fontSize = ''; delete s.dataset.f; });
    trigger.addEventListener('mouseenter', () => { if (RM || TOUCH) return; clearInterval(timer); tick(); timer = setInterval(tick, 90); });
    trigger.addEventListener('mouseleave', () => { clearInterval(timer); reset(); });
    return { start: () => { if (RM) return; clearInterval(timer); timer = setInterval(tick, 220); }, stop: () => { clearInterval(timer); reset(); } };
  }
  const rotators = $$('[data-rot]').map(a => {
    let lab = a.querySelector('.say, .nbt');
    if (!lab) {
      const word = a.textContent.trim();
      const link = a.matches('a, button');          // a link gets a clean label; plain words stay readable as they are
      if (link && !a.getAttribute('aria-label')) a.setAttribute('aria-label', word);
      lab = document.createElement('span'); lab.className = 'nbt'; if (link) lab.setAttribute('aria-hidden', 'true'); lab.textContent = word;
      a.textContent = ''; a.appendChild(lab);
    }
    const ctl = rotateOnHover(a.closest('[data-rot-hover]') || a, lab);
    // data-rot-auto: keep cycling the faces while the word is on screen (not just on hover)
    if (a.hasAttribute('data-rot-auto')) new IntersectionObserver(([e]) => e.isIntersecting ? ctl.start() : ctl.stop()).observe(a);
    return lab;
  });

  /* ---------- nav: Studio brings up the drum machine and says so ---------- */
  const say = $('.say'), studio = $('.nb[data-k="studio"]');
  let beatOpen = false, beatLoading = false, hovering = false;
  const setSay = () => { const t = hovering ? 'Pick a time' : 'Book call'; if (say.textContent !== t) { say.textContent = t; letters(say); } };
  function loadBeat(cb) {
    if (window.AvgBeat) return cb();
    addEventListener('avgbeat-ready', cb, { once: true });
    if (beatLoading) return;
    beatLoading = true;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/beat/beat.css'; document.head.appendChild(l);
    const s = document.createElement('script'); s.src = '/beat/beat.js'; s.async = true; document.body.appendChild(s);
  }
  studio.addEventListener('click', e => { e.preventDefault(); window.AvgBook && AvgBook.open(studio); });   // the middle button books a call
  addEventListener('avgbook', e => { if (e.detail) lenis.stop(); else lenis.start(); });
  studio.addEventListener('mouseenter', () => { hovering = true; setSay(); });
  studio.addEventListener('mouseleave', () => { hovering = false; setSay(); });
  addEventListener('avgbeat', e => { beatOpen = !!e.detail; if (beatOpen) lenis.stop(); else lenis.start(); studio.setAttribute('aria-expanded', String(beatOpen)); setSay(); });

  /* ---------- things slide and fade up as they come into view ---------- */
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.12 });
  $$('.rv').forEach(n => io.observe(n));
  $$('.draw').forEach(n => io.observe(n));

  /* ---------- text that rises in line by line, like the home page sentence ---------- */
  // each word becomes its own unit (inline elements such as a rotating word or an image stay whole);
  // when the block comes into view, words on the same line share a delay, so it reads as lines rising
  $$('[data-lines]').forEach(el => {
    const units = [];
    [...el.childNodes].forEach(n => {
      if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach(t => {
        if (!t) return;
        if (/^\s+$/.test(t)) return units.push(document.createTextNode(' '));
        const w = document.createElement('span'); w.className = 'lw'; w.textContent = t; units.push(w);
      });
      else { const w = document.createElement('span'); w.className = 'lw'; w.appendChild(n); units.push(w); }
    });
    el.replaceChildren(...units);
    new IntersectionObserver((es, ob) => es.forEach(en => {
      if (!en.isIntersecting) return;
      ob.disconnect();
      let top = null, line = -1;
      $$('.lw', el).forEach(w => { if (w.offsetTop !== top) { top = w.offsetTop; line++; } w.style.transitionDelay = (line * 0.18) + 's'; });
      el.classList.add('in');
    }), { threshold: 0.3 }).observe(el);
  });

  /* ---------- sound: the same synthesised interface sounds as the home page ---------- */
  let actx = null, master = null, hoverAt = 0, tickAt = 0, tickTravel = 0, lastHover = null;
  function audio() {
    if (!actx) { actx = new (window.AudioContext || window.webkitAudioContext)(); master = actx.createGain(); master.gain.value = 0.5; master.connect(actx.destination); }
    if (actx.state !== 'running') actx.resume();
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
  const clickable = n => (n instanceof Element && !n.closest('.sp') ? n.closest('a, button, [role=button], .sw, input[type=range]') : null);
  document.addEventListener('pointerdown', e => { audio(); if (clickable(e.target)) { blip(1500, 700, 0.045, 0.16, 'triangle'); crackle(); } });
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const c = clickable(e.target);
    if (c && c !== lastHover && actx && performance.now() - hoverAt > 70) { hoverAt = performance.now(); blip(2600, 2200, 0.018, 0.035); }
    lastHover = c;
  });
  let lastY = 0;
  lenis.on('scroll', l => {
    if (!actx) return;
    tickTravel += Math.abs(l.scroll - lastY); lastY = l.scroll;
    if (tickTravel < 160) return;
    tickTravel = 0;
    const now = performance.now(); if (now - tickAt < 70) return; tickAt = now;
    const a = Math.min(1, Math.abs(l.velocity) / 60);
    blip(520 + 520 * a, 420 + 420 * a, 0.03, 0.03 + 0.03 * a, 'triangle');
  });
  const sliderTick = v => blip(700 + 900 * v, 600 + 800 * v, 0.02, 0.03, 'triangle');   // sliders tick as they move, higher as they go up

  /* ---------- part: colour swatches ---------- */
  // <div data-palette> holds groups of <button class="sw" data-var="--bg" data-val="#131f37">; they set CSS variables on the
  // nearest [data-palette-stage] (or the element named by data-target), so one click recolours a background, a logo, a 3D scene...
  $$('[data-palette]').forEach(p => {
    const stage = p.dataset.target ? $(p.dataset.target) : p.closest('[data-palette-stage]') || p.parentElement;
    $$('.sw', p).forEach(b => {
      b.style.setProperty('--sw', b.dataset.val);
      b.addEventListener('click', () => {
        // a logo never sits on its own colour: if the two would match, the other one swaps to what this one was
        const other = $$(`.sw[aria-pressed="true"]`, p).find(o => o.dataset.var !== b.dataset.var && o.dataset.val === b.dataset.val);
        const mine = $$(`.sw[aria-pressed="true"]`, p).find(o => o.dataset.var === b.dataset.var);
        if (other && mine) { const swap = $$('.sw', p).find(o => o.dataset.var === other.dataset.var && o.dataset.val === mine.dataset.val); if (swap) press(swap); }
        press(b);
      });
    });
    function press(b) {
      $$(`.sw[data-var="${b.dataset.var}"]`, p).forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      stage.style.setProperty(b.dataset.var, b.dataset.val);
      $$('[data-hex="' + b.dataset.var + '"]', stage).forEach(n => { n.textContent = b.dataset.val.toUpperCase(); });
      stage.dispatchEvent(new CustomEvent('palette', { detail: { name: b.dataset.var, value: b.dataset.val } }));
    }
    $$('.sw[aria-pressed="true"]', p).forEach(press);
  });
  /* ---------- part: the colour picker in the notch ---------- */
  // Each swatch is a panel colour with the ink the brand pairs it with (--panel / --panel-ink), so a colour only ever lands
  // where the brand allows it. It changes the asset panels, never the page. Always up.
  // The cream bubbles + stems are one SVG shape run through a "goo" filter (blur, then a hard alpha cut), so every join,
  // bubble to bubble and stem to notch, comes out as a smooth curve that blends into the notch.
  const themes = $('.themes');
  if (themes) {
    const root = document.documentElement;
    const apply = b => {
      $$('.sw', themes).forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      b.dataset.theme.split(';').forEach(kv => { const [k, v] = kv.split(':'); root.style.setProperty(k.trim(), v.trim()); });
      $$('[data-hex]').forEach(n => { n.textContent = getComputedStyle(root).getPropertyValue(n.dataset.hex).trim().toUpperCase(); });
    };
    $$('.sw', themes).forEach(b => b.addEventListener('click', () => apply(b)));
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'goo'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<defs><filter id="goo" x="-20%" y="-40%" width="140%" height="180%" color-interpolation-filters="sRGB">' +
      '<feGaussianBlur in="SourceGraphic" stdDeviation="3.4" result="b"/>' +
      '<feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"/></filter></defs><g filter="url(#goo)"></g>';
    themes.prepend(svg);
    const drawGoo = () => {
      // layout offsets, not screen boxes, so a running animation or transform can never skew the shape
      const sws = $$('.sw', themes), tw = themes.offsetWidth, th = themes.offsetHeight;
      const pad = parseFloat(getComputedStyle(themes).getPropertyValue('--ring')) || 7;
      const drop = parseFloat(getComputedStyle(themes).getPropertyValue('--drop')) * rem();   // gap down to the notch's flat top
      const ox = 24, W = tw + ox * 2, H = th + drop + 24;
      svg.setAttribute('viewBox', `0 0 ${W.toFixed(1)} ${H.toFixed(1)}`);
      svg.style.width = W + 'px'; svg.style.height = H + 'px'; svg.style.left = -ox + 'px'; svg.style.top = '0px';
      const d = sws[0].offsetWidth, stem = d * 0.46, n = v => v.toFixed(1);
      let g = '';
      sws.forEach(s => {
        const cx = s.offsetLeft + s.offsetWidth / 2 + ox, cy = s.offsetTop + s.offsetHeight / 2, r = s.offsetWidth / 2 + pad;
        g += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"/><rect x="${n(cx - stem / 2)}" y="${n(cy)}" width="${n(stem)}" height="${n(th / 2 + drop + 24)}"/>`;
      });
      // a strip lying along the notch's top edge, so each stem flares out into it (it sits on the notch's own cream)
      const x0 = sws[0].offsetLeft + ox - 16, x1 = sws[sws.length - 1].offsetLeft + d + ox + 16;
      g += `<rect x="${n(x0)}" y="${n(th + drop)}" width="${n(x1 - x0)}" height="24"/>`;
      svg.querySelector('g').innerHTML = g;
    };
    new ResizeObserver(drawGoo).observe(themes);
    themes.classList.add('show');
    apply($('.sw[aria-pressed="true"]', themes) || $('.sw', themes));
    drawGoo();
  }

  /* ---------- Work index: three stacking panels, then Selected Work with live filters ---------- */
  const feats = $$('.wk-list .wk'), sel = $$('.wk-sel .wk');
  if (feats.length || sel.length) {
    // featured: full-screen panels with a thin bar (number, name, what we did, the line) over the image (after adoratorio.studio)
    feats.forEach((w, i) => {
      const bar = document.createElement('span'); bar.className = 'wk-cats';
      bar.textContent = w.dataset.cats.split('|').join(' · ');
      (w.querySelector('a, div') || w).appendChild(bar);
      w.classList.add('wk-feat');
      w.querySelector('.wk-name').dataset.no = String(i + 1).padStart(2, '0');
    });
    sel.forEach((w, i) => {
      w.classList.add('wk-thumb');
      // for the list view: a number and the grey "what we did", laid out like the featured rows
      w.querySelector('.wk-name').dataset.no = String(i + 1).padStart(2, '0');
      const c = document.createElement('span'); c.className = 'wk-lcats';
      c.textContent = w.dataset.cats.split('|').join(' · ');
      (w.querySelector('a, div') || w).appendChild(c);
    });
    // every project ends its row with a boxed "View more" (or "Coming soon" where the case study isn't up yet)
    [...feats, ...sel].forEach(w => {
      const box = w.querySelector('a, div') || w, m = document.createElement('span');
      const live = box.tagName === 'A';
      m.className = 'wk-more' + (live ? '' : ' soon'); m.textContent = live ? 'View case study ↘' : 'Coming soon';
      box.appendChild(m);
    });
    // the Work title and the intro hold at the top while the panels stack beneath; when Selected Work arrives, they all move up together
    const intro = $('.wk-intro'), wlist = $('.wk-list'), wtitle = $('.wk-title'), selSec = $('.wk-sel');
    if (wlist) {
      let ih = 0, base = 0, th = 0, raf = 0;
      const measure = () => {
        base = matchMedia('(max-width: 760px)').matches ? 3.4 * parseFloat(getComputedStyle(document.documentElement).fontSize) : 0;
        th = wtitle ? wtitle.getBoundingClientRect().height : 0;
        ih = intro ? intro.getBoundingClientRect().height : 0;
        // the line starts with its foot on the bottom of the first screen (inside the frame), over the reel
        const reel = $('.wk-reel');
        if (intro && reel) {
          const mn = reel.parentElement, cm = getComputedStyle(mn), cr = getComputedStyle(reel);
          const natTop = mn.getBoundingClientRect().top + scrollY + parseFloat(cm.paddingTop) + parseFloat(cr.marginTop);
          const frame = parseFloat(cr.paddingLeft) || 0;
          const foot = innerHeight;   // its rule sits under the bottom frame bar, so no line shows at first
          intro.style.marginTop = ((foot - ih) - (natTop + reel.offsetHeight)).toFixed(2) + 'px';
        }
        wlist.style.setProperty('--wk-ih', (th + ih) + 'px'); wlist.style.setProperty('--wk-base', base + 'px');
        // each panel pins one bar lower than the last, so the rows stack under each other
        const nm = feats[0] && feats[0].querySelector('.wk-name');
        wlist.style.setProperty('--wk-bar', (nm ? nm.getBoundingClientRect().height : 36) + 'px');
        feats.forEach((w, i) => w.style.setProperty('--i', i));
        // like the Clients: pictures a third of the screen tall; the last one runs to the foot of the screen so the stack lets go as it lands
        const lastImg = feats.length && feats[feats.length - 1].querySelector('.wk-img');
        if (lastImg) {
          const barH = nm ? nm.getBoundingClientRect().height : 36, fr = parseFloat(getComputedStyle(lastImg).marginBottom) || 0;
          lastImg.style.setProperty('height', Math.max(innerHeight / 3, innerHeight - base - th - ih - feats.length * barH - fr - 1) + 'px', 'important');
        }
      };
      const tick = () => {
        raf = 0;
        const H = innerHeight, ref = wlist.getBoundingClientRect().bottom;   // the stack holds until Selected Work has slid right over it
        const off = Math.min(0, ref - H);
        if (intro) { intro.style.top = (base + th + off).toFixed(1) + 'px'; intro.classList.toggle('stuck', intro.getBoundingClientRect().top <= base + 0.5); }
        if (wtitle) wtitle.style.top = (base + off).toFixed(1) + 'px';
        wlist.style.setProperty('--wk-off', off.toFixed(1) + 'px');
        // once the first project is held at the top, the reel behind is hidden: cover the strip under Avg / Joe and pause the film
        const covered = feats.length && feats[0].getBoundingClientRect().top <= base + th + ih + 2;
        wlist.classList.toggle('stuck', !!covered);
        const rv = $('.wk-reel video');
        if (rv && rv.src) { if (covered) { if (!rv.paused) rv.pause(); } else if (rv.paused) rv.play().catch(() => {}); }
      };
      const ask = () => { if (!raf) raf = requestAnimationFrame(tick); };
      addEventListener('scroll', ask, { passive: true });
      addEventListener('resize', () => { measure(); ask(); });
      document.fonts && document.fonts.ready.then(() => { measure(); ask(); });
      measure(); tick();
    }
    // Selected Work: small, small, big / big, small, small over whatever is showing (so a filter keeps the rhythm)
    const grid = $('.wk-grid3');
    const rhythm = () => {
      const vis = sel.filter(w => !w.hidden);
      vis.forEach((w, i) => { w.classList.toggle('wk-big', [0, 0, 1, 1, 0, 0][i % 6] === 1); w.style.removeProperty('--span'); });
      // a short last row widens its cards to fill the 12 columns, so no gap is left
      let row = [], used = 0;
      vis.forEach(w => { const sp = w.classList.contains('wk-big') ? 6 : 3; if (used + sp > 12) { row = []; used = 0; } row.push([w, sp]); used += sp; if (used === 12) { row = []; used = 0; } });
      if (row.length && used < 12) {                                      // scale the row up in proportion, in whole columns
        let left = 12;
        row.forEach(([w, sp], k) => { const n = k === row.length - 1 ? left : Math.round(sp * 12 / used); left -= n; w.style.setProperty('--span', 'span ' + n); });
      }
    };
    rhythm();
    // each thumbnail lists what was involved as lozenges, under its grey line (taken from data-cats, so they always match the filters)
    sel.forEach(w => {
      const line = $('.wk-line', w);
      if (!line || $('.wk-pills', w)) return;
      const ul = document.createElement('ul');
      ul.className = 'pills wk-pills';
      w.dataset.cats.split('|').forEach(c => { const li = document.createElement('li'); li.textContent = c; ul.appendChild(li); });
      line.after(ul);
    });
    // view: images or a ruled list
    $$('.wk-view button').forEach(b => b.addEventListener('click', () => {
      $$('.wk-view button').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      grid && grid.classList.toggle('is-list', b.dataset.view === 'list');
    }));
    // filter: "Categories (n)" opens the list of categories just below; picking one filters the grid live
    const fl = $('.wk-filters'), fo = $('.wk-filt-open');
    if (fl && fo && sel.length) {
      const counts = new Map();
      sel.forEach(w => w.dataset.cats.split('|').forEach(c => counts.set(c, (counts.get(c) || 0) + 1)));
      const cats = [['All', sel.length], ...[...counts].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))];
      cats.forEach(([name, n]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.dataset.cat = name; b.setAttribute('aria-pressed', String(name === 'All'));
        b.innerHTML = `${name}<sup>${n}</sup>`;
        b.addEventListener('click', () => pick(name));
        fl.appendChild(b);
      });
      const openF = on => { fl.hidden = !on; fo.setAttribute('aria-expanded', String(on)); };
      fo.addEventListener('click', () => openF(fl.hidden));
      const pick = name => {
        $$('button', fl).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === name)));
        sel.forEach(w => { w.hidden = name !== 'All' && !w.dataset.cats.split('|').includes(name); });
        $('.wk-filt-label').textContent = name === 'All' ? 'Categories' : name;
        $('.wk-filt-n').textContent = sel.filter(w => !w.hidden).length;
        rhythm(); openF(false);
        sel.filter(w => !w.hidden).forEach((w, i) => { const im = $('img', w); im.classList.remove('in'); setTimeout(() => im.classList.add('in'), 60 + i * 70); });
      };
    }
  }

  // logo shape buttons: <button data-logo="url"> swaps the mask image on the stage
  $$('[data-logo]').forEach(b => b.addEventListener('click', () => {
    const stage = b.closest('[data-palette-stage]');
    $$('[data-logo]', stage).forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    stage.style.setProperty('--logo', `url(${b.dataset.logo})`); stage.style.setProperty('--logo-ar', b.dataset.ar);
  }));

  /* ---------- part: type tester ---------- */
  // <div data-type> with a [contenteditable] .tt-text and <input type=range data-prop="size|track|weight|lead">
  $$('[data-type]').forEach(t => {
    const text = $('.tt-text', t);
    text.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s+/g, ' ')); });
    text.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); e.stopPropagation(); });
    $$('input[type=range]', t).forEach(r => {
      r.setAttribute('data-lenis-prevent', '');     // dragging a slider on a phone shouldn't also scroll the page
      const out = $(`[data-out="${r.dataset.prop}"]`, t), unit = r.dataset.unit || '';
      const apply = () => {
        const v = +r.value;
        if (r.dataset.prop === 'size') text.style.fontSize = v + 'rem';
        if (r.dataset.prop === 'track') text.style.letterSpacing = (v / 1000) + 'em';
        if (r.dataset.prop === 'lead') text.style.lineHeight = v;
        if (r.dataset.prop === 'weight') { text.style.fontWeight = v; text.style.fontVariationSettings = `"wght" ${v}`; }
        if (out) out.textContent = (r.dataset.prop === 'size' ? Math.round(v * rem()) : v) + unit;
        r.style.setProperty('--p', ((v - r.min) / (r.max - r.min) * 100) + '%');
      };
      r.addEventListener('input', () => { apply(); sliderTick((r.value - r.min) / (r.max - r.min)); });
      apply();
    });
  });

  /* ---------- part: a strip you drag sideways ---------- */
  $$('[data-strip]').forEach(s => {
    let down = false, x0 = 0, s0 = 0, moved = 0, v = 0, lastX = 0, glide = 0;
    s.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = 0; x0 = lastX = e.clientX; s0 = s.scrollLeft; v = 0; cancelAnimationFrame(glide); s.classList.add('dragging'); s.setPointerCapture(e.pointerId); });
    s.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - x0; moved = Math.max(moved, Math.abs(dx)); s.scrollLeft = s0 - dx; v = e.clientX - lastX; lastX = e.clientX; });
    const up = () => {
      if (!down) return; down = false; s.classList.remove('dragging');
      const step = () => { if (Math.abs(v) < 0.4) return; s.scrollLeft -= v; v *= 0.94; glide = requestAnimationFrame(step); };   // carries on a little after you let go
      step();
    };
    s.addEventListener('pointerup', up); s.addEventListener('pointercancel', up);
    s.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    s.addEventListener('dragstart', e => e.preventDefault());
    // a sideways trackpad swipe moves the strip; an up/down scroll still scrolls the page
    s.setAttribute('data-lenis-prevent-touch', '');
    const count = $(s.dataset.count || null);
    if (count) { const n = s.children.length; const upd = () => { const w = s.scrollWidth - s.clientWidth; count.textContent = String(Math.min(n, 1 + Math.round((w ? s.scrollLeft / w : 0) * (n - 1)))).padStart(2, '0') + ' / ' + String(n).padStart(2, '0'); }; s.addEventListener('scroll', upd, { passive: true }); upd(); }
  });

  /* ---------- part: images that cross-fade ---------- */
  $$('[data-fader]').forEach(f => {
    const items = [...f.children].filter(n => n.tagName === 'IMG'); let i = 0, timer = 0, seen = false;
    const count = $('.fader-count', f.parentElement);
    const show = k => { i = (k + items.length) % items.length; items.forEach((n, j) => n.classList.toggle('on', j === i)); if (count) count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0'); };
    const start = () => { clearInterval(timer); if (!RM && seen) timer = setInterval(() => show(i + 1), +f.dataset.fader || 2200); };
    f.addEventListener('click', () => { show(i + 1); start(); });
    new IntersectionObserver(es => { seen = es[0].isIntersecting; if (seen) start(); else clearInterval(timer); }, { threshold: 0.3 }).observe(f);
    show(0);
  });

  /* ---------- part: a 3D model you can turn ---------- */
  // model-viewer is loaded only when the first model scrolls near, so pages without one (and slow phones) don't pay for it.
  const models = $$('[data-model]');
  if (models.length) {
    let asked = false;
    const mio = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      mio.unobserve(en.target);
      if (!asked) { asked = true; const s = document.createElement('script'); s.type = 'module'; s.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js'; document.head.appendChild(s); }
      const el = en.target, mv = document.createElement('model-viewer');
      mv.setAttribute('src', el.dataset.model);
      mv.setAttribute('alt', el.dataset.alt || '3D model');
      mv.setAttribute('camera-controls', ''); mv.setAttribute('touch-action', 'pan-y'); mv.setAttribute('disable-zoom', ''); mv.setAttribute('disable-pan', '');
      if (!RM) { mv.setAttribute('auto-rotate', ''); mv.setAttribute('auto-rotate-delay', '600'); mv.setAttribute('rotation-per-second', '22deg'); }
      mv.setAttribute('interaction-prompt', 'none'); mv.setAttribute('shadow-intensity', '0.9'); mv.setAttribute('shadow-softness', '0.9');
      mv.setAttribute('exposure', el.dataset.exposure || '1'); mv.setAttribute('environment-image', 'neutral');
      mv.setAttribute('camera-orbit', el.dataset.orbit || '25deg 78deg auto'); mv.setAttribute('min-camera-orbit', 'auto 40deg auto'); mv.setAttribute('max-camera-orbit', 'auto 105deg auto');
      mv.addEventListener('load', () => el.classList.add('loaded'));
      mv.addEventListener('error', () => el.classList.add('failed'));
      el.appendChild(mv);
    }), { rootMargin: '600px 0px' });
    models.forEach(m => mio.observe(m));
  }

  /* ---------- videos play only while on screen ---------- */
  const vio = new IntersectionObserver(es => es.forEach(en => { const v = en.target; if (en.isIntersecting) { if (!v.src && v.dataset.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause(); }), { threshold: 0.2 });
  $$('video[data-auto]').forEach(v => { v.muted = true; v.playsInline = true; vio.observe(v); });

  /* ---------- the opening film holds still while the page moves over it (Information, Work) ---------- */
  const itop = $('.info-top');
  if (itop) {
    const ihero = $('.info-hero', itop), ifilm = $('.info-film video', itop), after = itop.nextElementSibling;
    const setH = () => itop.style.setProperty('--hero-h', (ihero ? ihero.getBoundingClientRect().height : 0) + 'px');
    let iraf = 0;
    // once the next part has covered the film, pause it; play again when it comes back into view
    const icheck = () => { iraf = 0; if (ihero) itop.classList.toggle('held', ihero.getBoundingClientRect().bottom <= parseFloat(getComputedStyle(itop).top) + ihero.getBoundingClientRect().height + 1 && scrollY > 2); if (!ifilm || !after || !ifilm.src) return; const hid = after.getBoundingClientRect().top <= 1; if (hid && !ifilm.paused) ifilm.pause(); else if (!hid && ifilm.paused) ifilm.play().catch(() => {}); };
    addEventListener('scroll', () => { if (!iraf) iraf = requestAnimationFrame(icheck); }, { passive: true });
    addEventListener('resize', setH); document.fonts && document.fonts.ready.then(setH); setH();
  }

  /* ---------- start ---------- */
  // a case study opens on its hero alone: it runs to the bottom of the first screen, so nothing peeks out under Avg or Joe
  const hero = $('.cs-hero');
  let heroW = 0;
  const sizeHero = () => { if (!hero || (TOUCH && innerWidth === heroW)) return; heroW = innerWidth; hero.style.setProperty('--hero-h', Math.max(0, innerHeight - hero.offsetTop) + 'px'); };
  sizeHero();
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { adv.clear(); drawNotch(); sizeHero(); }, 120); });
  // the letter boxes are measured in Nuckle, so wait for it (not just "fonts ready", which can fire before it is asked for)
  const fonts = Promise.all([document.fonts.load('500 1em Nuckle'), document.fonts.load('500 1em Nuckle', '↘↗'), document.fonts.ready]);
  Promise.race([fonts, new Promise(r => setTimeout(r, 2500))]).then(() => {
    drawNotch(); letters(say); rotators.forEach(l => { if (l !== say) letters(l); });
    document.documentElement.classList.add('ready');
  });
  window.__page = { lenis };
})();
