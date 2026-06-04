import { Col, Row, Skeleton, Space, Alert, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import StudentDashboardHero from '../components/StudentDashboardHero';
import StudentJourneyCard from '../components/StudentJourneyCard';
import StudentProfileCard from '../components/StudentProfileCard';
import StudentQuickActions from '../components/StudentQuickActions';
import { useStudentDashboard } from '../hooks/useStudentDashboard';

const StudentDashboardPage = () => {
  const navigate = useNavigate();
  const { user, isLoading, isRefreshing, refreshProfile } = useStudentDashboard();

  if (isLoading && !user.email) {
    return <Skeleton active paragraph={{ rows: 12 }} />;
  }

  const hasStudentCard = Boolean(user.studentCardUrl || user.studentCardUploaded || user.studentCardImagePath);
  const isProfileComplete = Boolean(user.fullName && (user.studentCode || user.institution));
  const progress = (isProfileComplete ? 50 : 0) + (hasStudentCard ? 50 : 0);

  return (
    <Space direction="vertical" size={24} style={{ width: '100%', maxWidth: 1280, margin: '0 auto' }}>
      {user.status !== 'APPROVED' && (
        <Alert
          showIcon
          type={progress < 100 ? "error" : "warning"}
          icon={progress < 100 ? <ExclamationCircleOutlined /> : <ClockCircleOutlined />}
          message={<strong style={{ fontSize: 16 }}>{progress < 100 ? "Chưa hoàn tất hồ sơ" : "Đang chờ phê duyệt"}</strong>}
          description={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontSize: 14 }}>
                {progress < 100 
                  ? "Vui lòng cập nhật đầy đủ thông tin cá nhân và thẻ sinh viên để Coordinator có thể duyệt tài khoản của bạn."
                  : "Hồ sơ của bạn đã được gửi và đang chờ Coordinator phê duyệt. Bạn sẽ không thể sử dụng tính năng Đội thi cho đến khi được duyệt."}
              </span>
              <Button 
                type="primary" 
                danger={progress < 100} 
                onClick={() => navigate('/profile')}
                style={{ borderRadius: 8, padding: '0 20px', height: 38, fontWeight: 600 }}
              >
                {progress < 100 ? "Cập nhật hồ sơ ngay" : "Xem lại hồ sơ"}
              </Button>
            </div>
          }
          style={{ 
            borderRadius: 16, 
            border: progress < 100 ? '1px solid #ffa39e' : '1px solid #ffe58f',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            padding: '16px 24px'
          }}
        />
      )}
      <StudentDashboardHero user={user} isRefreshing={isRefreshing} onRefresh={refreshProfile} />
      <StudentQuickActions onNavigate={navigate} />
      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} xl={14}>
          <StudentProfileCard user={user} />
        </Col>
        <Col xs={24} xl={10}>
          <StudentJourneyCard user={user} />
        </Col>
      </Row>
    </Space>
  );
};

export default StudentDashboardPage;
