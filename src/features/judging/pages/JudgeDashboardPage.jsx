import React, { useState, useEffect } from 'react';
import JudgeDashboard from '../components/JudgeDashboard';

const JudgeDashboardPage = () => {
  // Lấy thông tin user hiện tại từ LocalStorage
  const [userProfile, setUserProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo') || '{}');
    } catch {
      return {};
    }
  });

  // Lắng nghe sự kiện cập nhật profile (giống logic của file Dashboard cũ)
  useEffect(() => {
    const handleUserInfoUpdated = () => {
      try {
        const info = JSON.parse(localStorage.getItem('userInfo') || '{}');
        setUserProfile(info);
      } catch (e) {}
    };
    window.addEventListener('userInfoUpdated', handleUserInfoUpdated);
    return () => window.removeEventListener('userInfoUpdated', handleUserInfoUpdated);
  }, []);

  // Truyền thông tin user xuống Component giao diện chính
  return <JudgeDashboard user={userProfile} />;
};

export default JudgeDashboardPage;