import React, { Children, useEffect, useRef, useState } from 'react';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Counts up from 0 to `value`; shows `fallback` when there is no value yet. */
export function AnimatedNumber({ value, decimals = 0, prefix = '', suffix = '', fallback = '–', duration = 900 }) {
  const [shown, setShown] = useState(reducedMotion() ? value : 0);
  const frame = useRef(0);
  useEffect(() => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return undefined;
    if (reducedMotion()) { setShown(value); return undefined; }
    const target = Number(value);
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration]);
  if (value === null || value === undefined || Number.isNaN(Number(value))) return <>{fallback}</>;
  const sign = prefix === '±' ? (Number(value) >= 0 ? '+' : '') : prefix;
  return <>{sign}{Number(shown).toFixed(decimals)}{suffix}</>;
}

/** Fades/slides children in; `delay` in ms. */
export function Reveal({ children, delay = 0, className = '', style, as: Tag = 'div', ...rest }) {
  return <Tag className={`reveal ${className}`} style={{ '--delay': `${delay}ms`, ...style }} {...rest}>{children}</Tag>;
}

/** Wraps each child in a Reveal with an increasing delay. */
export function Stagger({ children, step = 70, start = 0, className = '', style }) {
  return (
    <div className={className} style={style}>
      {Children.toArray(children).filter(Boolean).map((child, i) => (
        <Reveal key={child.key ?? i} delay={start + i * step}>{child}</Reveal>
      ))}
    </div>
  );
}

/**
 * Coloured section banner. `stats`: [{ label, value, decimals?, prefix?, suffix? }] — value may be a
 * number (animated) or a string. `tone`: student | planner | gain | fatigue | reflections | caselets |
 * skills | teach | faculty | dean.
 */
export function PageHero({ icon: Icon, eyebrow, title, subtitle, tone = 'student', stats = [], actions, children }) {
  return (
    <section className={`hero-band tone-${tone} reveal`}>
      <span className="hero-grid" aria-hidden="true" />
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', minWidth: 0 }}>
          {Icon && <div className="hero-icon"><Icon size={26} /></div>}
          <div style={{ minWidth: 0 }}>
            {eyebrow && <div className="hero-eyebrow">{eyebrow}</div>}
            <h1 className="hero-title">{title}</h1>
          </div>
        </div>
        {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
      </div>
      {subtitle && <p className="hero-sub">{subtitle}</p>}
      {stats.length > 0 && (
        <div className="hero-stats">
          {stats.map((s, i) => (
            <div key={s.label} className="hero-stat reveal" style={{ '--delay': `${150 + i * 80}ms` }}>
              <div className="hero-stat-value">
                {typeof s.value === 'number' || s.value === null || s.value === undefined
                  ? <AnimatedNumber value={s.value} decimals={s.decimals} prefix={s.prefix} suffix={s.suffix} />
                  : s.value}
              </div>
              <div className="hero-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {children}
    </section>
  );
}

/** Heading used inside cards: icon chip + title. */
export function SectionTitle({ icon: Icon, children, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
      <h3 className="section-title" style={{ margin: 0 }}>{Icon && <span className="chip"><Icon size={16} /></span>}{children}</h3>
      {right}
    </div>
  );
}

/** Placeholder blocks while data loads. */
export function Skeleton({ rows = 3, height = 72 }) {
  return (
    <div style={{ display: 'grid', gap: 12 }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" style={{ height }} />)}
    </div>
  );
}
