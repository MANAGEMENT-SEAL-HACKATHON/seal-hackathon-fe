/**
 * Component: StudentTeamOnboarding
 * Chức năng: Layout màn hình chờ (khi sinh viên chưa có đội hoặc muốn xem menu chính), chứa các chức năng tạo đội, mở hộp thư và vào xem đội.
 */
import { Row, Col, Card, Typography, Button, message, theme } from 'antd';
import { CompassOutlined, MailOutlined, TeamOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import TeamCreateCard from './TeamCreateCard';

const { Title, Text } = Typography;

const StudentTeamOnboarding = ({ 
  hackathonId,
  hasTeams, 
  setForceShowMenu, 
  setIsInvitationsDrawerOpen, 
  invitationsCount, 
  onCreateTeam, 
  isActionLoading 
}) => {
  const { token } = theme.useToken();

  return (
    <motion.div 
      key="onboarding"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{ 
        padding: '64px 24px', 
        background: `linear-gradient(180deg, ${token.colorBgContainer} 0%, rgba(255,255,255,0) 100%)`, 
        borderRadius: 32,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: '0 24px 48px rgba(0,0,0,0.03)',
        textAlign: 'center'
      }}
    >
      <div style={{
        width: 96, height: 96, borderRadius: '50%', background: `${token.colorPrimary}15`, 
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
      }}>
        <CompassOutlined style={{ fontSize: 48, color: token.colorPrimary }} />
      </div>
      <Title level={2} style={{ marginBottom: 16 }}>Khám phá Hackathon</Title>
      <Text type="secondary" style={{ fontSize: 16, maxWidth: 600, display: 'inline-block', marginBottom: 48, lineHeight: 1.6 }}>
        Bắt đầu hành trình của bạn bằng cách khám phá danh sách các đội thi, hoặc tự đứng ra thành lập một đội mới để làm Trưởng nhóm.
      </Text>

      <Row gutter={[32, 32]} justify="center">
        <Col xs={24} md={8}>
          <TeamCreateCard 
            hackathonId={hackathonId}
            hasTeams={hasTeams}
            onCreateTeam={onCreateTeam} 
            loading={isActionLoading} 
          />
        </Col>

        <Col xs={24} md={8}>
          <Card 
            hoverable 
            style={{ height: '100%', borderRadius: 24, border: `1px solid ${token.colorBorderSecondary}`, transition: 'all 0.3s ease' }} 
            styles={{ body: { padding: 32, display: 'flex', flexDirection: 'column', height: '100%' } }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ 
                width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #1890ff, #13c2c2)', color: '#fff', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 24,
                boxShadow: '0 12px 24px rgba(24,144,255,0.25)'
              }}>
                <TeamOutlined />
              </div>
              <Title level={4} style={{ textAlign: 'left', marginTop: 0 }}>Quản lý đội</Title>
              <Text type="secondary" style={{ display: 'block', textAlign: 'left', marginBottom: 32 }}>
                Xem trạng thái đội thi bạn đã tham gia hoặc quản lý nhóm nếu bạn là Trưởng nhóm.
              </Text>
            </div>
            <Button 
              type="primary" 
              size="large" 
              onClick={() => {
                if (hasTeams) setForceShowMenu(false);
                else message.warning('Bạn hiện chưa tham gia đội thi nào trong Hackathon này!');
              }}
              style={{ borderRadius: 12, height: 48, fontWeight: 600 }}
            >
              {hasTeams ? 'Vào xem Đội' : 'Xem đội thi'}
            </Button>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card 
            hoverable 
            onClick={() => setIsInvitationsDrawerOpen(true)}
            style={{ height: '100%', borderRadius: 24, border: `1px solid ${token.colorBorderSecondary}`, transition: 'all 0.3s ease', cursor: 'pointer' }} 
            styles={{ body: { padding: 32, display: 'flex', flexDirection: 'column', height: '100%' } }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ 
                width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #722ed1, #1890ff)', color: '#fff', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 24,
                boxShadow: '0 12px 24px rgba(114, 46, 209, 0.25)'
              }}>
                <MailOutlined />
              </div>
              <Title level={4} style={{ textAlign: 'left', marginTop: 0 }}>
                Hộp thư Lời mời {invitationsCount > 0 && <span style={{ color: '#eb2f96', fontSize: 16 }}>({invitationsCount} chưa duyệt)</span>}
              </Title>
              <Text type="secondary" style={{ display: 'block', textAlign: 'left', marginBottom: 32 }}>
                Xem các lời mời gia nhập đội từ Trưởng nhóm khác gửi cho bạn.
              </Text>
            </div>
            
            <div
              style={{
                height: 40,
                borderRadius: 12,
                background: 'rgba(114, 46, 209, 0.1)',
                color: '#722ed1',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s'
              }}
            >
              Mở Hộp thư
            </div>
          </Card>
        </Col>
      </Row>
    </motion.div>
  );
};

export default StudentTeamOnboarding;

