import React, { useEffect, useRef } from 'react';

/** Lightweight CSS 3D scene shared by login and dashboard portals. */
export default function DepthScene({ variant = 'learning' }) {
  const scene = useRef(null);

  useEffect(() => {
    const element = scene.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const move = (event) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      element.style.setProperty('--scene-x', `${x * 16}px`);
      element.style.setProperty('--scene-y', `${y * 16}px`);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  return (
    <div ref={scene} className={`depth-scene depth-scene-${variant}`} aria-hidden="true">
      <span className="depth-orbit depth-orbit-one" />
      <span className="depth-orbit depth-orbit-two" />
      <span className="depth-cube depth-cube-one"><i /><b /><em /></span>
      <span className="depth-cube depth-cube-two"><i /><b /><em /></span>
      <span className="depth-sphere" />
      <span className="depth-grid" />
    </div>
  );
}
