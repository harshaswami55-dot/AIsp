import React, { useState } from 'react';
import PortalShell from '../components/PortalShell';
import { Users, BarChart3, Lightbulb, BookOpen } from 'lucide-react';
import FacultyDashboardView from './FacultyDashboardView';
import TopicMisconceptionView from './TopicMisconceptionView';
import FacultyStudentInsightsView from './FacultyStudentInsightsView';
import FacultyReflectionsView from './FacultyReflectionsView';

const TABS = [
  { id: 'overview', label: 'Class Performance Overview', icon: BarChart3 },
  { id: 'insights', label: 'Student Insights', icon: Users },
  { id: 'misconceptions', label: 'Topic-wise Misconceptions', icon: Lightbulb },
  { id: 'reflections', label: 'Reflections', icon: BookOpen },
];

export default function FacultyPortal({ currentUser, onLogout, switchTo }) {
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <FacultyDashboardView />;
      case 'insights': return <FacultyStudentInsightsView />;
      case 'misconceptions': return <TopicMisconceptionView />;
      case 'reflections': return <FacultyReflectionsView />;
      default: return null;
    }
  };

  return (
    <PortalShell role="faculty" portalName="Faculty Portal" user={currentUser} tabs={TABS} activeTab={activeTab}
      onTab={setActiveTab} onLogout={onLogout} switchTo={switchTo}>
      {renderContent()}
    </PortalShell>
  );
}
