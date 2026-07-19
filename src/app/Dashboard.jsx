import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import StudentDashboardPage from '../student/dashboard/pages/StudentDashboardPage';
import CoordinatorActionCenter from '../features/coordinator/pages/CoordinatorActionCenter';
import MentorDashboardPage from '../features/mentor/pages/MentorDashboardPage';
import { ROUTES } from '../shared/constants/routes';

const Dashboard = () => {
  const [userProfile, setUserProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleUserInfoUpdated = () => {
      try {
        const info = JSON.parse(localStorage.getItem('userInfo') || '{}');
        setUserProfile(info);
      } catch {
        // no-op
      }
    };
    window.addEventListener('userInfoUpdated', handleUserInfoUpdated);
    return () => window.removeEventListener('userInfoUpdated', handleUserInfoUpdated);
  }, []);

  if (userProfile.role === 'STUDENT') {
    return <StudentDashboardPage />;
  }

  if (userProfile.role === 'JUDGE' || userProfile.role === 'TEMP_JUDGE') {
    return <Navigate to={ROUTES.JUDGE_DASHBOARD} replace />;
  }

  if (userProfile.role === 'MENTOR') {
    return <MentorDashboardPage />;
  }

  return <CoordinatorActionCenter />;
};

export default Dashboard;
