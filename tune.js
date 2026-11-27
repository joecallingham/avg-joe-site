/* Tuning panel for the home page scroll: only loads with ?tune on the address. Values save in this browser only. */
(() => {
  const T = window.__avgTune; if (!T) return;
  const { TN, TN0, key } = T;
  const ROWS = [
    ['Swipe', [['swipe', 'Swipe speed', 0.5, 2.5, 0.05], ['glide', 'Swipe glide', 0.02, 0.3, 0.01]]],
    ['Intro, screens of scroll', [['part', 'Avg Joe part', 0.1, 3, 0.05], ['expand', 'Image expand', 0.1, 3, 0.05],
      ['rise', 'Avg Joe rise', 0.1, 3, 0.05], ['retract', 'Image retract', 0.1, 3, 0.05], ['wheelIn', 'Into the wheel', 0, 3, 0.05]]],
  ];
  const css = `
  #tune{position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#f3efe6;color:#0b0b0b;border-radius:14px;
    font:500 12px/1.2 system-ui,sans-serif;box-shadow:0 6px 30px rgba(0,0,0,.25);max-height:52vh;overflow:auto;-webkit-overflow-scrolling:touch}
  @media (min-width:761px){#tune{left:auto;width:320px;bottom:auto;top:16px;right:16px;max-height:80vh}}
  #tune .th{display:flex;align-items:center;gap:8px;padding:10px 12px;position:sticky;top:0;background:#f3efe6}
  #tune .th b{flex:1;font-weight:600}
  #tune button{font:inherit;background:#0b0b0b;color:#f3efe6;border:0;border-radius:10px;padding:8px 10px;min-height:36px}
  #tune.shut .tb{display:none}
  #tune .tb{padding:0 12px 12px}
  #tune h4{margin:12px 0 4px;font:600 11px/1 system-ui;opacity:.55}
  #tune .r{padding:6px 0}
  #tune .r div{display:flex;justify-content:space-between;margin-bottom:6px}
  #tune output{font-variant-numeric:tabular-nums}
  #tune input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:28px;margin:0;
    background:linear-gradient(#0b0b0b,#0b0b0b) left center/var(--p) 4px no-repeat,linear-gradient(#0b0b0b,#0b0b0b) center/100% 1px no-repeat}
  #tune input[type=range]::-webkit-slider-runnable-track{height:4px;background:transparent}
  #tune input[type=range]::-moz-range-track{height:1px;background:#0b0b0b}
  #tune input[type=range]::-moz-range-progress{height:4px;background:#0b0b0b;border-radius:2px}
  #tune input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#0b0b0b;margin-top:-9px}
  #tune input[type=range]::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#0b0b0b;border:0}
  #tune textarea{width:100%;height:90px;margin-top:8px;font:11px/1.3 ui-monospace,monospace;border:1px solid #0b0b0b;border-radius:8px;padding:6px;background:#fff}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'tune'; box.setAttribute('data-lenis-prevent', '');
  box.innerHTML = `<div class="th"><b>Tune</b><button data-a="copy">Copy values</button><button data-a="reset">Reset</button><button data-a="fold">Hide</button></div><div class="tb"></div>`;
  const body = box.querySelector('.tb');
  const inputs = {};
  const fmt = v => (+v).toFixed(2);
  const paint = (k) => { const i = inputs[k]; i.style.setProperty('--p', ((i.value - i.min) / (i.max - i.min) * 100) + '%'); i.parentNode.querySelector('output').textContent = fmt(i.value); };
  ROWS.forEach(([g, list]) => {
    const h = document.createElement('h4'); h.textContent = g; body.appendChild(h);
    list.forEach(([k, label, min, max, step]) => {
      const r = document.createElement('div'); r.className = 'r';
      r.innerHTML = `<div><span>${label}</span><output></output></div><input type="range" min="${min}" max="${max}" step="${step}" value="${TN[k]}">`;
      body.appendChild(r);
      const i = r.querySelector('input'); inputs[k] = i; paint(k);
      i.addEventListener('input', () => { TN[k] = +i.value; paint(k); queue(); });
    });
  });
  const out = document.createElement('textarea'); out.readOnly = true; out.hidden = true; body.appendChild(out);
  let raf = 0;
  const save = () => { try { localStorage.setItem(key, JSON.stringify(TN)); } catch (e) {} };
  const queue = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; T.apply(); save(); }); };
  box.addEventListener('click', e => {
    const a = e.target.dataset && e.target.dataset.a; if (!a) return;
    if (a === 'fold') { box.classList.toggle('shut'); e.target.textContent = box.classList.contains('shut') ? 'Show' : 'Hide'; }
    if (a === 'reset') { Object.assign(TN, TN0); Object.keys(inputs).forEach(k => { inputs[k].value = TN[k]; paint(k); }); T.apply(); save(); }
    if (a === 'copy') {
      const txt = JSON.stringify(Object.fromEntries(Object.keys(inputs).map(k => [k, +fmt(TN[k])])));
      out.hidden = false; out.value = txt; box.classList.remove('shut');
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { e.target.textContent = 'Copied'; setTimeout(() => e.target.textContent = 'Copy values', 1500); }, () => { out.select(); });
    }
  });
  document.body.appendChild(box);
})();
