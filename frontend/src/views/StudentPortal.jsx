import React, { useState } from 'react';
import { Brain, LayoutDashboard, Sparkles, TrendingUp, Activity, BookOpen, Layers, GraduationCap, LogOut, SlidersHorizontal, ChartNoAxesCombined } from 'lucide-react';
import StudentDashboardView from './StudentDashboardView';
import GuidedLearningJourneyView from './GuidedLearningJourneyView';
import LearningFatigueView from './LearningFatigueView';
import ReflectionsView from './ReflectionsView';
import LearningPathView from './LearningPathView';
import ForecastingLabView from './ForecastingLabView';
import TeachAIView from './TeachAIView';
import CourseOutcomesView from './CourseOutcomesView';
import ModelComparisonView from './ModelComparisonView';
import IndependenceModeView from './IndependenceModeView';
import DiagnosticTestView from './DiagnosticTestView';
import AITutorView from './AITutorView';
import LearningGainView from './LearningGainView';
import DepthScene from '../components/DepthScene';
import { PortalOrnaments } from '../components/PortalOrnaments';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'planner', label: 'AI Study Planner', icon: Sparkles },
  { id: 'gain', label: 'Learning Gain', icon: TrendingUp },
  { id: 'fatigue', label: 'Learning Fatigue', icon: Activity },
  { id: 'reflections', label: 'Reflections', icon: BookOpen },
  { id: 'concepts', label: 'Concepts', icon: Brain },
  { id: 'skills', label: 'Skill Studio', icon: Layers },
  { id: 'comparison', label: 'Model Comparison', icon: ChartNoAxesCombined },
  { id: 'independence', label: 'Independence', icon: SlidersHorizontal },
  { id: 'diagnostic', label: 'Diagnostic', icon: BookOpen },
  { id: 'tutor', label: 'AI Tutor', icon: Brain },
  { id: 'teach', label: 'Teach the AI', icon: GraduationCap },
];

export default function StudentPortal({ currentUser, dashboardData, onRefreshDashboard, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [quizInProgress, setQuizInProgress] = useState(false);
  const navigate = (view) => {
    const map = { journey: 'planner', lab: 'skills', comparison: 'comparison', independence: 'independence', outcomes: 'concepts', path: 'concepts', diagnostic: 'diagnostic', tutor: 'tutor' };
    setActiveTab(map[view] || view);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <StudentDashboardView data={dashboardData} onNavigate={navigate} />;
      case 'planner': return <GuidedLearningJourneyView currentUser={currentUser} onNavigateToView={navigate} onQuizStateChange={setQuizInProgress} />;
      case 'gain': return <LearningGainView currentUser={currentUser} />;
      case 'fatigue': return <LearningFatigueView currentUser={currentUser} />;
      case 'reflections': return <ReflectionsView currentUser={currentUser} />;
      case 'concepts': return <><LearningPathView onNavigate={navigate} /><div style={{ marginTop: 22 }}><CourseOutcomesView /></div></>;
      case 'skills': return <ForecastingLabView />;
      case 'teach': return <TeachAIView />;
      case 'comparison': return <ModelComparisonView />;
      case 'independence': return <IndependenceModeView currentUser={currentUser} />;
      case 'diagnostic': return <DiagnosticTestView currentUser={currentUser} onComplete={() => onRefreshDashboard?.()} onNavigate={navigate} />;
      case 'tutor': return <AITutorView />;
      default: return null;
    }
  };

  return (
    <div className="portal-depth-root" data-portal="student" style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <DepthScene variant="student" />
      <header className="university-shell" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div className="portal-brand-mark">AI</div>
              <div>
                <div className="portal-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)', lineHeight: 1.2 }}>AI Learning Partner 360</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-3)' }}>Student Portal · Business Forecasting</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="badge badge-student">Student</span>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-student)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '0.8rem' }}>{currentUser.full_name?.charAt(0) || 'S'}</div>
              <span className="user-name" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-2)' }}>{currentUser.full_name}</span>
              <button className="btn btn-ghost" onClick={onLogout} style={{ padding: '7px 10px' }} title="Log out"><LogOut size={15} /></button>
            </div>
          </div>
          <nav className="portal-tabs" aria-label="Student portal tabs" style={{ marginBottom: 10 }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} className={`portal-tab ${activeTab === id ? 'active active-student' : ''}`} disabled={quizInProgress && activeTab !== id} onClick={() => setActiveTab(id)}>
                <Icon size={15} />{label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="portal-content-stage" style={{ maxWidth: 1440, width: '100%', padding: '26px 24px 40px', margin: '0 auto' }}>
        <PortalOrnaments role="student" />
        <div className="animate-fade-up" key={activeTab}>{renderContent()}</div>
      </main>
    </div>
  );
}
