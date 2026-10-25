import React, { useEffect, useState } from 'react';
import LoginView from './views/LoginView';
import LandingView from './views/LandingView';
import StudentPortal from './views/StudentPortal';
import FacultyPortal from './views/FacultyPortal';
import DeanPortal from './views/DeanPortal';
import { authFetch, clearAuth } from './api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);

  const fetchDashboardData = async (userId) => {
    try {
      const res = await authFetch(`/api/student/dashboard${userId ? `?user_id=${userId}` : ''}`);
      if (!res.ok) throw new Error(`Dashboard request failed (${res.status})`);
      setDashboardData(await res.json());
    } catch (error) {
      console.error('Failed to load student dashboard:', error);
      setDashboardData(null);
    }
  };

  useEffect(() => {
    setRestoringSession(false);
    clearAuth();
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'student') fetchDashboardData(currentUser.id);
  }, [currentUser]);

  const handleLogin = (user) => setCurrentUser(user);
  const handleLogout = () => {
    clearAuth();
    setCurrentUser(null);
    setDashboardData(null);
  };

  if (restoringSession) return <div className="public-loading" role="status">Restoring your session…</div>;
  if (!currentUser) {
    return showLogin
      ? <LoginView onLogin={handleLogin} onBack={() => setShowLogin(false)} />
      : <LandingView onSignIn={() => { setShowLogin(true); window.scrollTo({ top: 0 }); }} />;
  }

  const isDean = currentUser.role === 'dean' || currentUser.role === 'admin';
  // Deans also have faculty access, so they can switch between the two portals.
  const switchPortal = (portal) => setCurrentUser(u => ({ ...u, portal }));

  if (currentUser.role === 'faculty' || (isDean && currentUser.portal === 'faculty')) {
    return <FacultyPortal currentUser={currentUser} onLogout={handleLogout}
      switchTo={isDean ? { label: 'Switch to Dean portal', onClick: () => switchPortal('dean') } : undefined} />;
  }

  if (isDean) {
    return <DeanPortal currentUser={currentUser} onLogout={handleLogout}
      switchTo={{ label: 'Switch to Faculty portal', onClick: () => switchPortal('faculty') }} />;
  }

  return (
    <StudentPortal
      currentUser={currentUser}
      dashboardData={dashboardData}
      onRefreshDashboard={() => fetchDashboardData(currentUser.id)}
      onLogout={handleLogout}
    />
  );
}
