import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { Routes, Route, Navigate, Outlet, useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../shared/components/layout/MainLayout';
import StudentLayout from '../student/layout/StudentLayout';
import { ROUTES } from '../shared/constants/routes';

// Pages
import Dashboard from './Dashboard';
import HackathonListPage from '../features/hackathons/pages/HackathonListPage';
import CreateHackathonPage from '../features/hackathons/pages/CreateHackathonPage';
import HackathonSetupPage from '../features/hackathons/pages/HackathonSetupPage';
import TrackManagementPage from '../features/tracks/pages/TrackManagementPage';
import RoundManagementPage from '../features/rounds/pages/RoundManagementPage';
import CriteriaManagementPage from '../features/criteria/pages/CriteriaManagementPage';
import ReviewValidatePage from '../features/review/pages/ReviewValidatePage';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import OnboardingPage from '../features/auth/pages/OnboardingPage';
import ChangePasswordPage from '../features/auth/pages/ChangePasswordPage';
import UserApprovalPage from '../features/auth/pages/UserApprovalPage';
import TempJudgesPage from '../features/auth/pages/TempJudgesPage';
import CoordinatorTeamPage from '../features/coordinator-teams/pages/CoordinatorTeamPage';
import GithubCallbackPage from '../features/auth/pages/GithubCallbackPage';
import LandingPage from '../landing/pages/LandingPage';
import StudentTeamPage from '../student/features/team/pages/StudentTeamPage';
import JudgeDashboardPage from '../features/judging/pages/JudgeDashboardPage';
import LiveScoringPage from '../features/judging/pages/LiveScoringPage';
import JudgeCriteriaViewPage from '../features/judging/pages/JudgeCriteriaViewPage';
import RoundRankingPreviewPage from '../features/round-ranking/pages/RoundRankingPreviewPage';
import PreliminaryResultsPage from '../features/round-results/pages/PreliminaryResultsPage';
import StudentRoundLeaderboardPage from '../student/features/results/pages/StudentRoundLeaderboardPage';
import StudentResultsIndexPage from '../student/features/results/pages/StudentResultsIndexPage';
import StudentHackathonResultsPage from '../student/features/results/pages/StudentHackathonResultsPage';
import MentorSupportPage from '../features/mentor/pages/MentorSupportPage';
import MentorRoundsPage from '../features/mentor/pages/MentorRoundsPage';
import StudentSubmissionPage from '../student/features/submission/pages/StudentSubmissionPage';
import LateSubmissionReviewPage from '../features/coordinator/pages/LateSubmissionReviewPage';
import PresentationQueuePage from '../features/presentation/pages/PresentationQueuePage';

// THÊM IMPORT TRANG MỚI VÀO ĐÂY
import ScoringLobbyPage from '../features/judging/pages/ScoringLobbyPage';
import HackathonResultsPage from '../features/hackathon-results/pages/HackathonResultsPage';

const TrackWrapper = () => {
  const { hackathonId } = useParams();
  return (
    <div style={{ padding: 24 }}>
      <TrackManagementPage hackathonId={parseInt(hackathonId)} />
    </div>
  );
};

const RoundWrapper = () => {
  const { hackathonId } = useParams();
  return (
    <div style={{ padding: 24 }}>
      <RoundManagementPage hackathonId={parseInt(hackathonId)} />
    </div>
  );
};

const CriteriaWrapper = () => {
  const { hackathonId, roundId } = useParams();
  const navigate = useNavigate();
  return (
    <div style={{ padding: 24 }}>
      <CriteriaManagementPage
        roundId={parseInt(roundId)}
        roundName={`Round #${roundId} Criteria`}
        onBack={() => navigate(`/hackathons/${hackathonId}/setup`)}
      />
    </div>
  );
};

const ReviewWrapper = () => {
  return (
    <div style={{ padding: 24 }}>
      <ReviewValidatePage />
    </div>
  );
};

const HackathonDetailRedirect = () => {
  const { hackathonId } = useParams();
  return <Navigate to={ROUTES.HACKATHON_SETUP.replace(':hackathonId', hackathonId)} replace />;
};

const getStoredUserInfo = () => {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}');
  } catch {
    return {};
  }
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  const userInfo = getStoredUserInfo();

  // Check must change password (for guest judges)
  if (userInfo.mustChangePassword) {
    return <Navigate to={ROUTES.CHANGE_PASSWORD} replace />;
  }

  if (userInfo.status === 'REJECTED') {
    localStorage.clear();
    return <Navigate to={ROUTES.LOGIN} state={{ rejected: true }} replace />;
  }

  // Check allowed roles
  if (allowedRoles && !allowedRoles.includes(userInfo.role)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return children;
};

const AppLayoutWrapper = () => {
  const [userInfo, setUserInfo] = useState(getStoredUserInfo);
  const [loadingRole, setLoadingRole] = useState(() => {
    const token = localStorage.getItem('accessToken');
    return Boolean(token && !getStoredUserInfo().role);
  });

  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem('accessToken');

    if (!token || userInfo.role) {
      return undefined;
    }

    import('../features/auth/services/userService')
      .then(({ userService }) => userService.getMe())
      .then((res) => {
        if (!mounted) return;
        const profile = res?.data || res || {};
        const nextUserInfo = {
          ...getStoredUserInfo(),
          email: profile.email,
          status: profile.status,
          role: profile.role,
          userId: profile.userId || profile.id,
          fullName: profile.fullName,
          mustChangePassword: profile.mustChangePassword,
        };
        localStorage.setItem('userInfo', JSON.stringify(nextUserInfo));
        window.dispatchEvent(new Event('userInfoUpdated'));
        setUserInfo(nextUserInfo);
      })
      .catch(() => {
        if (mounted) {
          setUserInfo(getStoredUserInfo());
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingRole(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [userInfo.role]);

  useEffect(() => {
    const handleUserInfoUpdated = () => setUserInfo(getStoredUserInfo());
    window.addEventListener('userInfoUpdated', handleUserInfoUpdated);
    return () => window.removeEventListener('userInfoUpdated', handleUserInfoUpdated);
  }, []);

  if (loadingRole) {
    return (
      <ProtectedRoute>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
          <Spin size="large" />
        </div>
      </ProtectedRoute>
    );
  }

  const LayoutComponent = userInfo.role === 'STUDENT' ? StudentLayout : MainLayout;

  return (
    <ProtectedRoute>
      <LayoutComponent>
        <Outlet />
      </LayoutComponent>
    </ProtectedRoute>
  );
};

const AppRouter = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path={ROUTES.LANDING} element={<LandingPage />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      <Route path={ROUTES.GITHUB_CALLBACK} element={<GithubCallbackPage />} />
      <Route path={ROUTES.CHANGE_PASSWORD} element={<ChangePasswordPage />} />
      <Route path={ROUTES.PUBLIC_ROUND_SCOREBOARD} element={<StudentRoundLeaderboardPage />} />

      {/* Protected Routes inside role-aware layout */}
      <Route element={<AppLayoutWrapper />}>
        <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
        <Route path={ROUTES.STUDENT_TEAM} element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentTeamPage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.STUDENT_RESULTS} element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentResultsIndexPage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.STUDENT_ROUND_RESULTS} element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentRoundLeaderboardPage source="student" />
          </ProtectedRoute>
        } />
        <Route path="/student/hackathons/:hackathonId/results" element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentHackathonResultsPage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.ONBOARDING} element={<OnboardingPage />} />
        <Route path={ROUTES.PROFILE} element={<OnboardingPage />} />
        <Route path={ROUTES.HACKATHONS} element={<HackathonListPage />} />
        <Route path="/hackathons/:id/results" element={
          <ProtectedRoute allowedRoles={['COORDINATOR', 'ADMIN']}>
            <HackathonResultsPage />
          </ProtectedRoute>
        } />
        <Route path="/hackathons/:hackathonId" element={<HackathonDetailRedirect />} />
        <Route path={ROUTES.HACKATHON_CREATE} element={<CreateHackathonPage />} />
        <Route path={ROUTES.HACKATHON_SETUP} element={<HackathonSetupPage />} />
        <Route path={ROUTES.GLOBAL_TEAMS} element={<CoordinatorTeamPage />} />
        <Route path={ROUTES.USER_APPROVAL} element={
          <ProtectedRoute allowedRoles={['COORDINATOR', 'ADMIN']}>
            <UserApprovalPage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.TEMP_JUDGES} element={
          <ProtectedRoute allowedRoles={['COORDINATOR', 'ADMIN']}>
            <TempJudgesPage />
          </ProtectedRoute>
        } />
         {/* Routes inside JudgeDashboardPage */}
        <Route path={ROUTES.JUDGE_DASHBOARD} element={
          <ProtectedRoute allowedRoles={['JUDGE', 'TEMP_JUDGE', 'COORDINATOR', 'ADMIN']}>
            <JudgeDashboardPage />
          </ProtectedRoute>
        } />
        
        {/* ==================================================== */}
        {/* THÊM ROUTE CHO PHÒNG CHẤM THI VÀO ĐÂY */}
        {/* ==================================================== */}
        <Route path="/judge/assignments" element={
          <ProtectedRoute allowedRoles={['JUDGE', 'TEMP_JUDGE', 'COORDINATOR', 'ADMIN']}>
            <ScoringLobbyPage />
          </ProtectedRoute>
        } />

         {/* Routes inside LiveScoringPage */}
        <Route path={ROUTES.JUDGE_SCORING} element={
          <ProtectedRoute allowedRoles={['JUDGE', 'TEMP_JUDGE', 'COORDINATOR', 'ADMIN']}>
            <LiveScoringPage />
          </ProtectedRoute>
        } />
        {/* Routes inside JudgeCriteriaViewPage */}
        <Route path={ROUTES.JUDGE_CRITERIA} element={
          <ProtectedRoute allowedRoles={['JUDGE', 'TEMP_JUDGE', 'COORDINATOR', 'ADMIN']}>
            <JudgeCriteriaViewPage />
          </ProtectedRoute>
        } />
        
        {/* Explicit routes for tracks and rounds */}
        <Route path={ROUTES.TRACKS} element={<TrackWrapper />} />
        <Route path={ROUTES.ROUNDS} element={<RoundWrapper />} />
        <Route path={ROUTES.ROUND_RANKING_PREVIEW} element={
          <ProtectedRoute allowedRoles={['COORDINATOR', 'ADMIN']}>
            <div style={{ padding: 24 }}>
              <RoundRankingPreviewPage />
            </div>
          </ProtectedRoute>
        } />
        <Route path={ROUTES.ROUND_RESULTS} element={
          <ProtectedRoute allowedRoles={['COORDINATOR', 'ADMIN']}>
            <div style={{ padding: 24 }}>
              <PreliminaryResultsPage />
            </div>
          </ProtectedRoute>
        } />
        <Route path={ROUTES.CRITERIA} element={<CriteriaWrapper />} />
        <Route path={ROUTES.REVIEW_VALIDATE} element={<ReviewWrapper />} />

        {/* Person B Routes */}
        <Route path={ROUTES.MENTOR_ROUNDS} element={
          <ProtectedRoute allowedRoles={['MENTOR', 'COORDINATOR', 'ADMIN']}>
            <MentorRoundsPage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.MENTOR_SUPPORT} element={
          <ProtectedRoute allowedRoles={['MENTOR', 'COORDINATOR', 'ADMIN']}>
            <MentorSupportPage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.STUDENT_SUBMIT} element={
          <ProtectedRoute allowedRoles={['STUDENT']}>
            <StudentSubmissionPage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.COORDINATOR_LATE_SUBMISSIONS} element={
          <ProtectedRoute allowedRoles={['COORDINATOR', 'ADMIN']}>
            <LateSubmissionReviewPage />
          </ProtectedRoute>
        } />
        <Route path={ROUTES.PRESENTATION_QUEUE} element={
          <PresentationQueuePage />
        } />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to={ROUTES.LANDING} replace />} />
    </Routes>
  );
};

export default AppRouter;
