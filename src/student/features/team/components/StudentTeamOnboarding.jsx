/**
 * Component: StudentTeamOnboarding
 * Single state owner lives in StudentTeamPage — props only (no duplicate useStudentTeam).
 */
import { useState } from 'react';
import { Typography, theme, Row, Col, Drawer, Empty } from 'antd';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import TeamCreateCard from './TeamCreateCard';
import InvitationCard from '../../invitations/components/InvitationCard';
import TeamReleasedBanner from './TeamReleasedBanner';

const { Text, Title } = Typography;

const FPT = {
  blue: '#00529C',
  blueDark: '#003366',
  orange: '#F37021',
  green: '#46B749',
};

/**
 * @param {object} props
 * @param {string|number} props.hackathonId
 * @param {object|null} props.team
 * @param {boolean} props.teamLoading
 * @param {boolean} props.isActionLoading
 * @param {(payload: object) => Promise<boolean>} props.createTeam
 * @param {Array} props.invites
 * @param {(inv: object) => Promise<void>} props.onAcceptInvite
 * @param {(inv: object) => Promise<void>} props.onRejectInvite
 * @param {string|boolean|null} [props.actionKey]
 */
const StudentTeamOnboarding = ({
  hackathonId,
  team,
  teamLoading,
  isActionLoading,
  createTeam,
  invites = [],
  onAcceptInvite,
  onRejectInvite,
  actionKey,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';

  const pendingInvites = invites.filter(
    (inv) => inv.memberStatus === 'PENDING' || inv.status === 'PENDING',
  );
  const acceptedInvites = invites.filter(
    (inv) => inv.memberStatus === 'ACCEPTED' || inv.status === 'ACCEPTED',
  );

  const handleAcceptInvite = async (inv) => {
    try {
      await onAcceptInvite?.(inv);
      setIsDrawerOpen(false);
    } catch (error) {
      console.error('Failed to accept invite:', error);
    }
  };

  const handleRejectInvite = async (inv) => {
    try {
      await onRejectInvite?.(inv);
    } catch (error) {
      console.error('Failed to reject invite:', error);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto', padding: '16px 0 48px' }}>
      <TeamReleasedBanner />
      <Row gutter={[28, 28]} align="stretch">
        <Col xs={24} lg={14} style={{ display: 'flex', flexDirection: 'column' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ flex: 1 }}
          >
            <TeamCreateCard
              hackathonId={hackathonId || 1}
              hasTeams={Boolean(team)}
              onCreateTeam={createTeam}
              loading={teamLoading || isActionLoading}
            />
          </motion.div>
        </Col>

        <Col xs={24} lg={10} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{
              flex: 1,
              borderRadius: 28,
              background: isDark
                ? 'linear-gradient(145deg, rgba(0, 82, 156, 0.5) 0%, rgba(15, 23, 42, 0.95) 100%)'
                : 'linear-gradient(145deg, #E0F2FE 0%, #FFFFFF 50%, #BAE6FD 100%)',
              border: `2px solid ${isDark ? 'rgba(0, 198, 255, 0.5)' : '#00C6FF'}`,
              boxShadow: isDark
                ? '0 20px 48px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 198, 255, 0.2)'
                : '0 20px 48px -10px rgba(0, 198, 255, 0.28), 0 8px 24px -6px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 198, 255, 0.2)',
              padding: '32px 32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 180,
                height: 180,
                background: 'radial-gradient(circle, rgba(0, 198, 255, 0.35) 0%, transparent 70%)',
                filter: 'blur(30px)',
                pointerEvents: 'none',
              }}
            />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                <motion.div
                  whileHover={{ rotate: 10, scale: 1.08 }}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    background: 'linear-gradient(135deg, #00529C 0%, #00C6FF 100%)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#FFF',
                    boxShadow:
                      '0 8px 20px -4px rgba(0, 198, 255, 0.6), inset 0 2px 4px rgba(255,255,255,0.4)',
                    border: '2px solid rgba(255,255,255,0.4)',
                    flexShrink: 0,
                  }}
                >
                  <Mail size={26} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
                </motion.div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Title
                      level={4}
                      style={{
                        margin: 0,
                        fontWeight: 900,
                        color: token.colorTextHeading,
                        fontSize: 24,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      Hộp Thư Lời Mời
                    </Title>
                    {pendingInvites.length > 0 && (
                      <span
                        style={{
                          background: 'linear-gradient(135deg, #00529C, #00C6FF)',
                          color: '#FFF',
                          padding: '2px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 800,
                          boxShadow: '0 2px 8px rgba(0, 198, 255, 0.4)',
                        }}
                      >
                        +{pendingInvites.length} Mới
                      </span>
                    )}
                  </div>
                  <Text
                    type="secondary"
                    style={{ fontSize: 14, color: token.colorTextSecondary, fontWeight: 600 }}
                  >
                    Kiểm tra lời mời vào đội từ các Trưởng nhóm khác.
                  </Text>
                </div>
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.02, x: 4 }} whileTap={{ scale: 0.98 }} style={{ marginTop: 24 }}>
              <div
                onClick={() => setIsDrawerOpen(true)}
                style={{
                  padding: '16px 24px',
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #00529C 0%, #003366 100%)',
                  border: '2px solid rgba(255, 255, 255, 0.35)',
                  boxShadow:
                    '0 8px 20px -4px rgba(0, 82, 156, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} />
                  <span>Mở Hộp Thư Lời Mời</span>
                </div>
                <ArrowRight size={20} />
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{
              flex: 1,
              borderRadius: 28,
              background: isDark
                ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.95) 100%)'
                : 'linear-gradient(145deg, #F8FAFC 0%, #F1F5F9 100%)',
              border: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0'}`,
              boxShadow: isDark
                ? '0 10px 30px -10px rgba(0, 0, 0, 0.5)'
                : '0 10px 30px -10px rgba(0, 0, 0, 0.05)',
              padding: '32px 32px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                  display: 'grid',
                  placeItems: 'center',
                  color: isDark ? '#FFF' : FPT.blueDark,
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <Title
                level={4}
                style={{ margin: 0, fontWeight: 900, color: token.colorTextHeading, fontSize: 20 }}
              >
                Quy Chế Đội Thi
              </Title>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: FPT.orange,
                    marginTop: 8,
                    flexShrink: 0,
                  }}
                />
                <Text style={{ color: token.colorTextSecondary, fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>
                  Bạn chỉ có thể tham gia{' '}
                  <strong style={{ color: token.colorTextHeading }}>duy nhất 1 đội thi</strong> trong
                  suốt kỳ Hackathon.
                </Text>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: FPT.blue,
                    marginTop: 8,
                    flexShrink: 0,
                  }}
                />
                <Text style={{ color: token.colorTextSecondary, fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>
                  Chỉ <strong style={{ color: token.colorTextHeading }}>Trưởng nhóm</strong> mới có
                  quyền mời thành viên, đăng ký chủ đề và nộp bài thi.
                </Text>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: FPT.green,
                    marginTop: 8,
                    flexShrink: 0,
                  }}
                />
                <Text style={{ color: token.colorTextSecondary, fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>
                  Nếu bạn được mời vào đội, hãy kiểm tra{' '}
                  <strong style={{ color: token.colorTextHeading }}>Hộp Thư Lời Mời</strong> để phản
                  hồi.
                </Text>
              </div>
            </div>
          </motion.div>
        </Col>
      </Row>

      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #00529C 0%, #00C6FF 100%)',
                display: 'grid',
                placeItems: 'center',
                color: '#FFF',
              }}
            >
              <Mail size={18} />
            </div>
            <span style={{ fontSize: 20, fontWeight: 800 }}>Hộp Thư Lời Mời</span>
          </div>
        }
        placement="right"
        width={420}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        bodyStyle={{ padding: '24px 20px', background: isDark ? '#0F172A' : '#F8FAFC' }}
        headerStyle={{
          background: isDark ? '#1E293B' : '#FFFFFF',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`,
        }}
      >
        {invites.length === 0 ? (
          <Empty
            description={
              <span style={{ color: token.colorTextSecondary, fontWeight: 600 }}>
                Chưa có lời mời nào
              </span>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ marginTop: 60 }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {invites.map((inv) => (
              <InvitationCard
                key={inv.teamId || inv.key}
                invitation={inv}
                onAccept={handleAcceptInvite}
                onReject={handleRejectInvite}
                loading={Boolean(actionKey)}
              />
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default StudentTeamOnboarding;
