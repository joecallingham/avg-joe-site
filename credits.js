/* Image credits: plain text, white or black, whichever reads better on the part of the picture behind it.
   Samples the picture's bottom-right corner (where the credit sits) once it has loaded. */
(() => {
  const pick = (credit, src) => {
    const im = new Image();
    im.onload = () => {
      try {
        const c = document.createElement('canvas'), w = 48, h = 48; c.width = w; c.height = h;
        const x = c.getContext('2d', { willReadFrequently: true });
        // the bottom-right quarter of the picture, squashed to 48×48
        x.drawImage(im, im.naturalWidth * 0.5, im.naturalHeight * 0.78, im.naturalWidth * 0.5, im.naturalHeight * 0.22, 0, 0, w, h);
        const d = x.getImageData(0, 0, w, h).data; let L = 0;
        for (let i = 0; i < d.length; i += 4) L += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        L /= d.length / 4;
        credit.classList.toggle('on-light', L > 150);   // a light corner gets black text
      } catch (e) { /* leave it white */ }
    };
    im.src = src;
  };
  document.querySelectorAll('.credit').forEach(cr => {
    const box = cr.parentElement, img = box.querySelector('img'), vid = box.querySelector('video');
    const src = img ? (img.currentSrc || img.src) : vid ? vid.getAttribute('poster') : null;
    if (src) pick(cr, src);
  });
})();
