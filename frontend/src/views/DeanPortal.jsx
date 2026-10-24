import React, { useState } from 'react';
import PortalShell from '../components/PortalShell';
import { Building2, BarChart3, Users } from 'lucide-react';
import { DepartmentPerformanceView, SubjectPerformanceView, FacultyInsightsView } from './DeanDashboardView';

const TABS = [
  { id: 'department', label: 'Department Performance', icon: Building2, component: DepartmentPerformanceView },
  { id: 'subject', label: 'Subject-wise Performance', icon: BarChart3, component: SubjectPerformanceView },
  { id: 'faculty', label: 'Faculty Insights', icon: Users, component: FacultyInsightsView },
];

export default function DeanPortal({ currentUser, onLogout, switchTo }) {
  const [activeTab, setActiveTab] = useState('department');
  const ActiveView = TABS.find(tab => tab.id === activeTab).component;

  return (
    <PortalShell role="dean" portalName="Dean Portal" user={currentUser} tabs={TABS} activeTab={activeTab}
      onTab={setActiveTab} onLogout={onLogout} switchTo={switchTo}>
      <ActiveView />
    </PortalShell>
  );
}
