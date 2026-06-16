/**
 * Page: StudentInvitationsPage
 * Chức năng: Trang/Ngăn kéo hiển thị toàn bộ danh sách Hộp thư Lời mời. Cung cấp header thống kê và danh sách các thẻ InvitationCard.
 */
import { useMemo } from 'react';
import { Col, Empty, Row, Skeleton, Typography, theme, Button, Space, Statistic, Badge } from 'antd';
import { MailOutlined, SyncOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import InvitationCard from '../components/InvitationCard';
import { useStudentInvitations } from '../hooks/useStudentInvitations';

const { Text } = Typography;

const StudentInvitationsPage = ({ onActionSuccess, hasTeams }) => {
  const { token } = theme.useToken();
  const {
    invitations,
    pendingCount,
    isLoading,
    actionKey,
    fetchInvitations,
    respondInvitation,
  } = useStudentInvitations();

  const handleRespond = async (invitation, action) => {
    const success = await respondInvitation(invitation, action);
    if (success && onActionSuccess) {
      onActionSuccess();
    }
  };

  const sortedInvitations = useMemo(
    () => [...invitations].sort((left, right) => Number(right.memberStatus === 'PENDING') - Number(left.memberStatus === 'PENDING')),
    [invitations]
  );

  return (
    <div style={{ margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Premium Compact Header for Drawer */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 16, 
          background: 'linear-gradient(135deg, #001529 0%, #003a8c 50%, #13c2c2 100%)', 
          padding: '24px 32px', 
          borderRadius: 24,
          boxShadow: '0 16px 32px rgba(0, 58, 140, 0.15)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: -40, right: '10%', width: 150, height: 150, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -20, width: 200, height: 200, background: 'rgba(19,194,194,0.2)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.08) 1px, transparent 0)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />

        <Space size={48} wrap style={{ position: 'relative', zIndex: 1 }}>
          <Statistic 
            title={<span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Chờ duyệt</span>} 
            value={pendingCount} 
            prefix={<ClockCircleOutlined style={{ color: '#ffd666', marginRight: 4 }} />}
            valueStyle={{ color: '#fff', fontWeight: 800, fontSize: 32 }}
          />
          <Statistic 
            title={<span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Tất cả</span>} 
            value={invitations.length} 
            prefix={<CheckCircleOutlined style={{ color: '#5cdbd3', marginRight: 4 }} />}
            valueStyle={{ color: '#fff', fontWeight: 800, fontSize: 32 }}
          />
        </Space>
        
        <Button 
          type="primary" 
          icon={<SyncOutlined spin={isLoading} />} 
          onClick={fetchInvitations}
          size="large"
          style={{ 
            borderRadius: 14, 
            fontWeight: 700, 
            background: 'rgba(255,255,255,0.15)', 
            borderColor: 'rgba(255,255,255,0.2)', 
            backdropFilter: 'blur(10px)', 
            color: '#fff', 
            zIndex: 1,
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
          }}
        >
          Làm mới
        </Button>
      </motion.div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </motion.div>
        ) : invitations.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Empty
          image={<MailOutlined style={{ fontSize: 54, color: token.colorPrimary }} />}
          description={
            <Text type="secondary">
              Chưa có lời mời nào trong hackathon này.
            </Text>
          }
          style={{
            padding: 56,
            borderRadius: 24,
            background: token.colorBgContainer,
            border: `1px dashed ${token.colorBorder}`,
          }}
        />
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Row gutter={[24, 24]}>
              <AnimatePresence>
                {sortedInvitations.map((invitation) => (
                  <Col xs={24} key={invitation.key}>
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                      style={{ height: '100%' }}
                    >
                      <InvitationCard
                        invitation={invitation}
                        actionKey={actionKey}
                        hasTeams={hasTeams}
                        onRespond={handleRespond}
                      />
                    </motion.div>
                  </Col>
                ))}
              </AnimatePresence>
            </Row>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentInvitationsPage;

