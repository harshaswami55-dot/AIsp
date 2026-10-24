import React, { useState } from 'react';
import { Users, BarChart3, Lightbulb, BookOpen, LogOut } from 'lucide-react';
import FacultyDashboardView from './FacultyDashboardView';
import TopicMisconceptionView from './TopicMisconceptionView';
import ReflectionsView from './ReflectionsView';
import DepthScene from '../components/DepthScene';
import { PortalOrnaments } from '../components/PortalOrnaments';

const TABS = [
  { id: 'overview', label: 'Class Performance Overview', icon: BarChart3 },
  { id: 'insights', label: 'Student Insights', icon: Users },
  { id: 'misconceptions', label: 'Topic-wise Misconceptions', icon: Lightbulb },
  { id: 'reflections', label: 'Reflections', icon: BookOpen },
];

export default function FacultyPortal({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <FacultyDashboardView />;
      case 'insights': return <FacultyDashboardView insightsOnly />;
      case 'misconceptions': return <TopicMisconceptionView />;
      case 'reflections': return <ReflectionsView />;
      default: return null;
    }
  };

  return (
    <div className="portal-depth-root" data-portal="faculty" style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <DepthScene variant="faculty" />
      <header className="university-shell" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div className="portal-brand-mark">AI</div>
              <div>
                <div className="portal-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)', lineHeight: 1.2 }}>AI Learning Partner 360</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-3)' }}>Faculty Portal · Business Forecasting</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge badge-faculty">Faculty</span>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-faculty)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '0.8rem' }}>{currentUser.full_name?.charAt(0) || 'F'}</div>
              <span className="user-name" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-2)' }}>{currentUser.full_name}</span>
              <button className="btn btn-ghost" onClick={onLogout} style={{ padding: '7px 10px' }} title="Log out"><LogOut size={15} /></button>
            </div>
          </div>
          <nav className="portal-tabs" aria-label="Faculty portal tabs" style={{ marginBottom: 10 }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} className={`portal-tab ${activeTab === id ? 'active active-faculty' : ''}`} onClick={() => setActiveTab(id)}>
                <Icon size={15} />{label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="portal-content-stage" style={{ maxWidth: 1440, width: '100%', padding: '26px 24px 40px', margin: '0 auto' }}>
        <PortalOrnaments role="faculty" />
        <div className="animate-fade-up" key={activeTab}>{renderContent()}</div>
      </main>
    </div>
  );
}
