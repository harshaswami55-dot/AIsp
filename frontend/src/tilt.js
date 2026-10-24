/**
 * Site-wide 3D card tilt: elements matching TILT_SELECTOR lean towards the pointer and get a light
 * sheen at the pointer position. One delegated listener; bigger elements tilt less. Mouse/pen only,
 * and off when the user prefers reduced motion.
 */
const TILT_SELECTOR = '.hover-lift, .fp-card, .fp-module, .hero-stat, [data-tilt]';
const MAX_DEG = 7;

export function installTilt() {
  if (typeof window === 'undefined') return;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = null;
  let frame = 0;

  const reset = (el) => {
    el.classList.remove('tilt-on');
    el.style.removeProperty('--rx');
    el.style.removeProperty('--ry');
  };

  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || !fine.matches || reduced.matches) return;
    const el = e.target.closest?.(TILT_SELECTOR);
    if (current && current !== el) reset(current);
    current = el;
    if (!el) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const scale = Math.min(1, 320 / Math.max(r.width, r.height)); // wide panels barely move
      el.style.setProperty('--rx', `${((0.5 - py) * MAX_DEG * scale).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${((px - 0.5) * MAX_DEG * scale).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      el.classList.add('tilt-on');
    });
  }, { passive: true });

  document.addEventListener('pointerleave', () => { if (current) reset(current); current = null; }, true);
  window.addEventListener('blur', () => { if (current) reset(current); current = null; });
}
