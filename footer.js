/* The footer on every page: a fresh line each visit (as Mother does) and the UK time. */
(() => {
  const foot = document.getElementById('foot');
  if (!foot) return;
  const LINES = [
    'Avg Joe runs on tea and second drafts.',
    'Avg Joe smells like fresh ink and flat whites.',
    'Avg Joe has strong opinions about kerning.',
    'Avg Joe is ordinary, done properly.',
    'Avg Joe is probably making something right now.',
    'Avg Joe never lets the robot have the last word.',
  ];
  const tag = foot.querySelector('.foot-tag');
  if (tag) tag.textContent = LINES[Math.floor(Math.random() * LINES.length)];
  // the notch drops away while the footer is in view (on the home page main.js does this, as its footer is a layer)
  if (!foot.classList.contains('layer'))
    new IntersectionObserver(([e]) => document.documentElement.classList.toggle('foot-in', e.isIntersecting), { rootMargin: '0px 0px -35% 0px' }).observe(foot);
  const t = foot.querySelector('.foot-time');
  if (!t) return;
  const tick = () => {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    t.textContent = p.find(x => x.type === 'hour').value + ':' + p.find(x => x.type === 'minute').value;
    t.dateTime = t.textContent;
  };
  tick(); setInterval(tick, 20000);
})();
