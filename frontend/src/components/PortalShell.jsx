import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Brain, LogOut, ChevronDown, ArrowLeftRight } from 'lucide-react';

export function BrandMark({ size = 20 }) {
  return <span className="brand-mark"><Brain size={size} /></span>;
}

/**
 * Shared chrome for the Student / Faculty / Dean portals: glass header with brand, sliding tab pill,
 * user menu, scroll progress bar and page transition. `isTabDisabled(id)` locks tabs (e.g. during a quiz).
 */
export default function PortalShell({ role, portalName, user, tabs, activeTab, onTab, isTabDisabled, onLogout, switchTo, children }) {
  const tabRefs = useRef({});
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const rootRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = tabRefs.current[activeTab];
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    tabRefs.current[activeTab]?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeTab]);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      rootRef.current?.style.setProperty('--scroll', max > 0 ? String(window.scrollY / max) : '0');
      setScrolled(window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [menuOpen]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [activeTab]);

  const initials = (user.full_name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div ref={rootRef} className={`ps-root ps-${role}`}>
      <div className="ps-progress" aria-hidden="true" />
      <header className={`ps-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="ps-inner">
          <div className="ps-top">
            <div className="ps-brand">
              <BrandMark />
              <div style={{ minWidth: 0 }}>
                <div className="brand-name">AI Learning <em>Partner</em> 360</div>
                <div className="ps-portal"><span className="pulse-dot" />{portalName}<span className="brand-sub" style={{ color: 'var(--color-text-3)', fontWeight: 600 }}>· SB6202 Business Forecasting</span></div>
              </div>
            </div>
            <div className="ps-user" ref={menuRef}>
              <button className="ps-user-btn" onClick={() => setMenuOpen(o => !o)} aria-expanded={menuOpen} aria-haspopup="menu">
                <span className="ps-avatar">{initials}</span>
                <span className="ps-user-name">{user.full_name}</span>
                <ChevronDown size={15} style={{ transition: 'transform .25s', transform: menuOpen ? 'rotate(180deg)' : 'none', color: 'var(--color-text-3)' }} />
              </button>
              {menuOpen && (
                <div className="ps-menu" role="menu">
                  <div className="ps-menu-head">
                    <b>{user.full_name}</b>
                    <span>{user.email || user.username}</span>
                    <div style={{ marginTop: 6 }}><span className="badge badge-student" style={{ textTransform: 'capitalize' }}>{role}</span></div>
                  </div>
                  {switchTo && <button role="menuitem" className="ps-switch" onClick={() => { setMenuOpen(false); switchTo.onClick(); }}><ArrowLeftRight size={16} /> {switchTo.label}</button>}
                  <button role="menuitem" onClick={onLogout}><LogOut size={16} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
          <nav className="ps-tabs" aria-label={`${portalName} sections`}>
            <span className="ps-pill" style={{ left: pill.left, width: pill.width }} aria-hidden="true" />
            {tabs.map(({ id, label, icon: Icon }) => {
              const disabled = isTabDisabled?.(id);
              return (
                <button key={id} ref={el => { tabRefs.current[id] = el; }} className={`ps-tab ${activeTab === id ? 'active' : ''}`}
                  aria-current={activeTab === id ? 'page' : undefined} disabled={disabled}
                  title={disabled ? 'Finish your quiz first' : undefined} onClick={() => onTab(id)}>
                  <Icon size={16} />{label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="ps-main">
        <div className="ps-page" key={activeTab}>{children}</div>
      </main>
      <footer className="ps-footer">AI Learning Partner 360 · RV University School of Business · SB6202 Business Forecasting</footer>
    </div>
  );
}
