import React, { useState } from 'react';
import { Building2, BarChart3, Users, LogOut } from 'lucide-react';
import { DepartmentPerformanceView, SubjectPerformanceView, FacultyInsightsView } from './DeanDashboardView';
import DepthScene from '../components/DepthScene';
import { PortalOrnaments } from '../components/PortalOrnaments';

const TABS = [
  { id: 'department', label: 'Department Performance', icon: Building2, component: DepartmentPerformanceView },
  { id: 'subject', label: 'Subject-wise Performance', icon: BarChart3, component: SubjectPerformanceView },
  { id: 'faculty', label: 'Faculty Insights', icon: Users, component: FacultyInsightsView },
];

export default function DeanPortal({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('department');
  const ActiveView = TABS.find(tab => tab.id === activeTab).component;

  return (
    <div className="portal-depth-root" data-portal="dean" style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <DepthScene variant="dean" />
      <header className="university-shell" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div className="portal-brand-mark">AI</div>
              <div>
                <div className="portal-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)', lineHeight: 1.2 }}>AI Learning Partner 360</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-3)' }}>Dean Portal · RV University School of Business</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge badge-dean">Dean</span>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-dean)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '0.8rem' }}>{currentUser.full_name?.charAt(0) || 'D'}</div>
              <span className="user-name" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-2)' }}>{currentUser.full_name}</span>
              <button className="btn btn-ghost" onClick={onLogout} style={{ padding: '7px 10px' }} title="Log out"><LogOut size={15} /></button>
            </div>
          </div>
          <nav className="portal-tabs" aria-label="Dean portal tabs" style={{ marginBottom: 10 }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} className={`portal-tab ${activeTab === id ? 'active active-dean' : ''}`} onClick={() => setActiveTab(id)}>
                <Icon size={15} />{label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="portal-content-stage" style={{ maxWidth: 1440, width: '100%', padding: '26px 24px 40px', margin: '0 auto' }}>
        <PortalOrnaments role="dean" />
        <div className="animate-fade-up" key={activeTab}><ActiveView /></div>
      </main>
    </div>
  );
}
