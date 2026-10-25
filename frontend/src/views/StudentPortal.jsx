import React, { useState } from 'react';
import PortalShell from '../components/PortalShell';
import FloatingAssistant from '../components/FloatingAssistant';
import { LayoutDashboard, Sparkles, TrendingUp, Activity, BookOpen, Briefcase, Layers, GraduationCap } from 'lucide-react';
import StudentDashboardView from './StudentDashboardView';
import AIStudyPlannerView from './AIStudyPlannerView';
import LearningGainView from './LearningGainView';
import LearningFatigueView from './LearningFatigueView';
import ReflectionsView from './ReflectionsView';
import CaseletsView from './CaseletsView';
import SkillStudioView from './SkillStudioView';
import TeachAIView from './TeachAIView';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'planner', label: 'AI Study Planner', icon: Sparkles },
  { id: 'gain', label: 'Learning Gain', icon: TrendingUp },
  { id: 'fatigue', label: 'Learning Fatigue', icon: Activity },
  { id: 'reflections', label: 'Reflections', icon: BookOpen },
  { id: 'caselets', label: 'Caselets', icon: Briefcase },
  { id: 'skills', label: 'Skill Studio', icon: Layers },
  { id: 'teach', label: 'Teach the AI', icon: GraduationCap },
];

export default function StudentPortal({ currentUser, dashboardData, onRefreshDashboard, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [quizInProgress, setQuizInProgress] = useState(false);
  const openTab = (id) => {
    if (id === 'dashboard') onRefreshDashboard?.();
    setActiveTab(id);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <StudentDashboardView data={dashboardData} onNavigate={openTab} />;
      case 'planner': return <AIStudyPlannerView currentUser={currentUser} onQuizStateChange={setQuizInProgress} />;
      case 'gain': return <LearningGainView currentUser={currentUser} />;
      case 'fatigue': return <LearningFatigueView currentUser={currentUser} />;
      case 'reflections': return <ReflectionsView currentUser={currentUser} />;
      case 'caselets': return <CaseletsView currentUser={currentUser} />;
      case 'skills': return <SkillStudioView currentUser={currentUser} />;
      case 'teach': return <TeachAIView onNavigate={openTab} />;
      default: return null;
    }
  };

  return (
    <PortalShell role="student" portalName="Student Portal" user={currentUser} tabs={TABS} activeTab={activeTab}
      onTab={openTab} isTabDisabled={id => quizInProgress && activeTab !== id} onLogout={onLogout}>
      {renderContent()}
      {/* The assistant is unavailable during a quiz, like the other tabs. */}
      {!quizInProgress && <FloatingAssistant currentView={activeTab} />}
    </PortalShell>
  );
}
