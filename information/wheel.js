/* Information page: What We Do as the home page's services wheel.
   Same words, same 12-degree steps, same blur and fade with distance, same line beside it and the same work popping in.
   The home page drives it from its GSAP timeline; here it's driven straight from the scroll, no GSAP. */
(() => {
  const run = document.getElementById('wd-run');
  if (!run) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOUCH = matchMedia('(pointer: coarse)').matches;
  const WS = TOUCH ? 0.26 : 0.2;          // screens of scrolling per word (as the home page)
  const STEP = 12, RADIUS = 37.5;         // degrees between words, rem from the pivot (as the home page)
  const HOLD = 0.35;                      // screens the last word rests before the page moves on
  const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);

  // the same list as the home page (main.js SERVICES): keep the two in step
  const W = (img, x, y, w, ar, href = '#') => ({ img, x, y, w, ar, href });
  const SERVICES = [
    { name: 'AI Content',      desc: "We direct AI like a camera crew, making imagery and film that feels crafted, at the pace you post.", works: [W('mushroom', 66, 20, 10, 1.5), W('portrait', 70, 55, 8, 0.95)] },
    { name: 'Art Direction',   desc: "We set the look of every shoot, campaign and drop, so each frame feels like it came from the same hand.", works: [W('boon-sign', 58, 26, 11, 1.6), W('620', 66, 52, 8.5, 1)] },
    { name: 'Branding',        desc: "We find what makes you you, then shape it into a name, a mark and a voice people remember.", works: [W('boon-van', 72, 18, 8.5, 1.07), W('620', 58, 56, 8, 1)] },
    { name: 'Design',          desc: "We curate every typeface, colour and grid around your brand, then build it into a design system that grows with you.", works: [W('mushroom', 57.8, 25, 8, 1.53), W('portrait', 72.8, 59, 8, 0.95)] },
    { name: 'Digital',         desc: "Websites and apps that move nicely, load fast and feel easy on any screen.", works: [W('620', 64, 22, 8.5, 1), W('boon-sign', 76, 58, 10, 1.6)] },
    { name: 'Packaging',       desc: "Packs that earn their spot on the shelf, from structure and print to the moment they're opened.", works: [W('boon-van', 60, 30, 9, 1.07), W('mushroom', 78, 60, 8, 1.53)] },
    { name: 'Strategy',        desc: "We dig into your audience and your market first, so every creative call has a reason behind it.", works: [W('boon-sign', 68, 24, 10, 1.6), W('portrait', 58, 58, 7.5, 0.95)] },
    { name: 'Visual Identity', desc: "Logo, type, colour and imagery pulled into one kit your team can use without us.", works: [W('620', 74, 20, 8, 1), W('boon-van', 60, 54, 8.5, 1.07)] },
  ];
  const N = SERVICES.length;
  run.style.height = (100 * (1 + (N - 1) * WS + HOLD)) + 'vh';

  const list = run.querySelector('#wheel-list'), desc = run.querySelector('#wheel-desc'), works = run.querySelector('#works');
  const top = () => run.getBoundingClientRect().top + scrollY;
  const goTo = i => { const y = top() + i * WS * innerHeight; window.__page ? __page.lenis.scrollTo(y) : scrollTo({ top: y, behavior: 'smooth' }); };

  const items = SERVICES.map((s, i) => {
    const li = document.createElement('li');
    li.textContent = s.name; li.tabIndex = 0;
    li.addEventListener('click', () => goTo(i));
    li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(i); } });
    list.appendChild(li);
    return li;
  });
  const cards = SERVICES.map(s => s.works.map(w => {
    const a = document.createElement('a');
    a.className = 'work'; a.href = w.href;
    a.style.cssText = `left:${w.x}%;top:${w.y}%;width:${w.w}rem`;
    a.innerHTML = `<div class="ph" style="aspect-ratio:${w.ar}"><img src="/img/${w.img}.jpg" alt="" loading="lazy"></div><span>View Case Study ↘</span>`;
    a.setAttribute('aria-label', `${s.name}: view case study`);
    works.appendChild(a);
    return a;
  }));

  const layout = v => {
    const r = rem() / 16;
    items.forEach((li, i) => {
      const d = i - v, ad = Math.abs(d);
      li.style.transform = `rotate(${(d * STEP).toFixed(3)}deg) translate(${RADIUS}rem,-50%)`;
      li.style.filter = ad < 0.3 ? 'none' : `blur(${Math.min(16, (ad - 0.3) * 5.5 * r).toFixed(2)}px)`;
      li.style.opacity = ad > 4.6 ? 0 : Math.max(0.12, 1 - ad * 0.22).toFixed(3);
    });
  };

  // the line beside the wheel swaps word by word; the work pops in with a little overshoot (as the home page)
  let swapT = 0;
  const showDesc = i => {
    clearTimeout(swapT);
    [...desc.children].forEach((w, k) => { w.style.transitionDelay = (k * 0.004) + 's'; w.classList.add('out'); });
    swapT = setTimeout(() => {
      desc.textContent = '';
      if (i < 0) return;
      SERVICES[i].desc.split(' ').forEach((t, k, all) => {
        const s = document.createElement('span'); s.className = 'dw pre'; s.textContent = t; s.style.transitionDelay = (RM ? 0 : k * 0.018) + 's';
        desc.appendChild(s); if (k < all.length - 1) desc.appendChild(document.createTextNode(' '));
      });
      requestAnimationFrame(() => requestAnimationFrame(() => [...desc.children].forEach(s => s.classList.remove('pre'))));
    }, desc.children.length && !RM ? 180 : 0);
  };
  let shown = -2;
  const showWorks = i => {
    showDesc(i);
    cards.forEach((set, k) => set.forEach((a, j) => {
      a.classList.toggle('on', k === i);
      a.style.transitionDelay = k === i ? (j * 0.07) + 's' : '0s';
    }));
    items.forEach((li, k) => li.setAttribute('aria-current', k === i ? 'true' : 'false'));
  };

  let last = null;
  const frame = () => {
    requestAnimationFrame(frame);
    const r = run.getBoundingClientRect();
    if (r.bottom < -innerHeight || r.top > innerHeight * 2) return;
    // spins in as the section arrives, turns one word per WS screens while pinned, keeps turning as it leaves
    const v = -r.top / innerHeight / WS;
    if (v === last) return;
    last = v;
    layout(Math.min(v, N - 1 + Math.max(0, (v - (N - 1) - HOLD / WS)) ));
    const wv = Math.round(v), inView = r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5;
    const wi = inView && wv >= 0 && wv <= N - 1 ? wv : wv > N - 1 && inView ? N - 1 : -1;
    if (wi !== shown) { shown = wi; showWorks(wi); }
  };
  requestAnimationFrame(frame);
})();
