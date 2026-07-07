/**
 * Component: TeamMemberManager
 * Chức năng: Bảng điều khiển danh sách thành viên (Roster Command Studio).
 * Cải tiến UI Siêu Cấp - "TƯƠNG PHẢN CAO & NỔI BẬT KHỎI BACKGROUND" (High-Contrast & Elevated Standout):
 * - Khung bao ngoài có viền Royal Blue/Orange rõ nét và bóng đổ nổi 3D sâu (Floating Elevation Shadow).
 * - Thanh tiêu đề cột (Column Header Bar) đổi sang màu Đậm High-Contrast (Royal Blue / Dark Slate) với chữ trắng rực rỡ, tạo điểm nhấn hút mắt ngay lập tức!
 * - Viền phân cách bảng và nền được phân tầng tương phản rành mạch, không còn hiện tượng chìm vào màu nền trắng/xám của trang!
 */
import { useMemo, useState } from 'react';
import { Button, Empty, Form, Space, Typography, theme, Row, Col, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Sliders, ShieldCheck, Sparkles, Users, Shield, Zap, Settings } from 'lucide-react';
import UserInviteAutoComplete from '../../../../shared/components/ui/UserInviteAutoComplete';
import { MEMBER_STATUS } from '../constants/studentTeam.constants';
import LeaveTeamPanel from './LeaveTeamPanel';
import MemberStatusFilter, { MEMBER_FILTERS } from './MemberStatusFilter';
import TeamMemberCard from './TeamMemberCard';
import TransferLeaderForm from './TransferLeaderForm';

const { Text, Title } = Typography;

/* OFFICIAL FPT LOGO COLORS & CYBER PALETTE */
const FPT = {
  blue: '#00529C',
  blueDark: '#003366',
  orange: '#F37021',
  orangeLight: '#FF8C42',
  green: '#46B749',
};

const TeamMemberManager = ({ team, onInviteMember, onCancelInvite, onLeaveTeam, onKickMember, onTransferLeader, onDisbandTeam, loading }) => {
  const [inviteForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [memberFilter, setMemberFilter] = useState('ALL');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer?.toLowerCase() !== '#ffffff' && token.colorBgContainer?.toLowerCase() !== '#fff';

  const members = useMemo(() => team?.members || [], [team?.members]);

  const memberCounts = useMemo(
    () =>
      members.reduce(
        (result, member) => ({
          ...result,
          [member.status]: (result[member.status] || 0) + 1,
        }),
        { ALL: members.length }
      ),
    [members]
  );

  const filteredMembers = useMemo(
    () =>
      memberFilter === 'ALL'
        ? members
        : members.filter((member) => member.status === memberFilter),
    [memberFilter, members]
  );

  const selectedFilterLabel = MEMBER_FILTERS.find((f) => f.value === memberFilter)?.label.toLowerCase() || 'phù hợp';

  if (!team) return null;

  const inviteDisabledReason = (() => {
    if (team.canInvite) return '';
    if (!team.isCurrentUserLeader) return 'Chỉ trưởng nhóm mới có thể mời thành viên.';
    if (team.isLocked) return 'Đội đã khóa, không thể thay đổi thành viên.';
    if (team.formationSubmitted) return 'Đã xác nhận thành lập đội — không thể mời thêm thành viên.';
    if (team.status === 'ACTIVE') return 'Đội đã được Ban tổ chức duyệt — không thể mời thêm thành viên.';
    if (team.isFull) return `Đội đã đủ ${team.maxTeamSize ?? 5} thành viên.`;
    return 'Trạng thái đội hiện tại chưa cho phép mời thêm thành viên.';
  })();

  const handleInvite = async (values) => {
    const success = await onInviteMember(team.id, values.email?.trim());
    if (success) inviteForm.resetFields();
  };

  return (
    <div
      style={{
        background: isDark 
          ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%)' 
          : '#FFFFFF',
        borderRadius: 28,
        padding: '32px 36px',
        boxShadow: isDark 
          ? '0 24px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.15)' 
          : '0 20px 48px -12px rgba(0, 82, 156, 0.15), 0 8px 24px -8px rgba(0, 0, 0, 0.08), 0 0 0 1.5px rgba(0, 82, 156, 0.18)',
        border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 82, 156, 0.22)'}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative Ambient Aura to break monotony */}
      <div style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, background: `radial-gradient(circle, rgba(0, 82, 156, 0.08) 0%, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, background: `radial-gradient(circle, rgba(243, 112, 33, 0.08) 0%, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />

      {/* 1. COMPACT HEADER ROW */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28, position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ 
              background: isDark ? 'rgba(0, 82, 156, 0.3)' : 'rgba(0, 82, 156, 0.12)', 
              color: isDark ? '#60A5FA' : FPT.blue, 
              padding: '4px 12px', 
              borderRadius: 8, 
              fontSize: 11, 
              fontWeight: 800, 
              letterSpacing: '0.05em',
              border: `1px solid ${isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(0, 82, 156, 0.25)'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}>
              <Users size={13} /> TRẠM ĐIỀU PHỐI NHÂN SỰ
            </span>
          </div>
          <Title level={4} style={{ margin: '0 0 4px', fontWeight: 900, color: token.colorTextHeading, fontSize: 22, letterSpacing: '-0.01em' }}>
            Danh sách & Quản lý Thành viên ({members.length})
          </Title>
          <Text type="secondary" style={{ fontSize: 14, color: token.colorTextSecondary, fontWeight: 600 }}>
            Kiểm tra trạng thái lời mời, điều phối chiến thuật và phân quyền trong đội thi.
          </Text>
        </div>

        {(team.isCurrentUserLeader || team.canLeaveTeam) && (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              icon={<Sliders size={15} />}
              onClick={() => setIsSettingsOpen(true)}
              style={{
                background: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F8FAFC',
                border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.22)' : '#CBD5E1'}`,
                borderRadius: 14,
                fontWeight: 800,
                fontSize: 14,
                color: isDark ? '#60A5FA' : FPT.blue,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 44,
                padding: '0 20px',
                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              Cài đặt đội thi
            </Button>
          </motion.div>
        )}
      </div>

      {/* 2. TOOLBAR ROW: FILTER + INVITE */}
      <Row gutter={[20, 20]} align="middle" style={{ marginBottom: 28, position: 'relative', zIndex: 1 }}>
        <Col xs={24} lg={13}>
          <MemberStatusFilter counts={memberCounts} value={memberFilter} onChange={setMemberFilter} />
        </Col>

        <Col xs={24} lg={11}>
          {team.canInvite ? (
            <Form form={inviteForm} layout="inline" onFinish={handleInvite} requiredMark={false} style={{ width: '100%', justifyContent: 'flex-end' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  width: '100%',
                  background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
                  padding: 6,
                  borderRadius: 16,
                  border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1'}`,
                  boxShadow: isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 3px rgba(0,0,0,0.05)',
                  gap: 8,
                }}
              >
                <Form.Item 
                  name="email" 
                  style={{ flex: 1, margin: 0 }} 
                  rules={[
                    { required: true, message: 'Vui lòng chọn hoặc nhập email.' },
                    { type: 'email', message: 'Email không hợp lệ (VD: sv@fpt.edu.vn)' }
                  ]}
                >
                    <UserInviteAutoComplete
                      placeholder="Tìm email hoặc mã SV để mời..."
                      disabled={false}
                      inputStyle={{
                        height: 42,
                        border: 'none',
                        background: 'transparent',
                        boxShadow: 'none',
                        fontSize: 14,
                        fontWeight: 700,
                        color: token.colorTextHeading,
                      }}
                    />
                </Form.Item>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    icon={<UserPlus size={16} />}
                    style={{
                      height: 42,
                      padding: '0 22px',
                      fontWeight: 800,
                      fontSize: 14,
                      borderRadius: 12,
                      background: `linear-gradient(135deg, #FF6B00 0%, #FFA800 100%)`,
                      border: 'none',
                      boxShadow: `0 6px 16px -4px rgba(243, 112, 33, 0.6)`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#FFF',
                    }}
                  >
                    <span>Mời</span>
                    <Sparkles size={14} />
                  </Button>
                </motion.div>
              </div>
            </Form>
          ) : (
            <div
              style={{
                padding: '12px 18px',
                borderRadius: 14,
                background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F1F5F9',
                border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                justifyContent: 'flex-end',
              }}
            >
              <ShieldCheck size={20} color={FPT.green} />
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 700 }}>
                <strong>Trạng thái:</strong> {inviteDisabledReason}
              </Text>
            </div>
          )}
        </Col>
      </Row>

      {/* 3. UNIFIED HIGH-CONTRAST ROSTER TABLE BOX */}
      <div
        style={{
          borderRadius: 20,
          border: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 82, 156, 0.25)'}`,
          background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#FFFFFF',
          overflow: 'hidden',
          boxShadow: isDark 
            ? '0 16px 36px -10px rgba(0,0,0,0.6)' 
            : '0 12px 36px -8px rgba(0, 82, 156, 0.15), 0 4px 12px -4px rgba(0, 0, 0, 0.05)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Table Column Header: HIGH-CONTRAST ROYAL BLUE / DARK SLATE BAR WITH WHITE TEXT! */}
        {filteredMembers.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 24px',
              background: isDark 
                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)' 
                : `linear-gradient(135deg, ${FPT.blueDark} 0%, ${FPT.blue} 100%)`,
              borderBottom: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 34, 68, 0.4)'}`,
              fontSize: 12,
              fontWeight: 800,
              color: '#FFFFFF',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 38%', minWidth: 200, color: '#FFF' }}>
              <Users size={15} style={{ opacity: 0.9 }} /> THÀNH VIÊN & LIÊN HỆ
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 20%', minWidth: 120, color: '#FFF' }}>
              <Shield size={15} style={{ opacity: 0.9 }} /> VAI TRÒ
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 24%', minWidth: 150, color: '#FFF' }}>
              <Zap size={15} style={{ opacity: 0.9 }} /> TRẠNG THÁI
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'flex-end', gap: 8, flex: '0 0 18%', minWidth: 110, justifyContent: 'flex-end', color: '#FFF' }}>
              <Settings size={15} style={{ opacity: 0.9 }} /> ĐIỀU PHỐI
            </div>
          </div>
        )}

        {/* Table Body / Rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence mode="popLayout">
            {filteredMembers.map((member, idx) => (
              <motion.div
                key={`${team.id}-${member.userId}`}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  borderBottom: idx === filteredMembers.length - 1 ? 'none' : `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0'}`,
                  background: idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255, 255, 255, 0.015)' : '#FAFCFF'),
                }}
              >
                <TeamMemberCard
                  member={member}
                  teamId={team.id}
                  canCancelInvite={team.canCancelInvite}
                  canKickMember={
                    team.isCurrentUserLeader &&
                    member.status === 'ACCEPTED' &&
                    member.roleInTeam !== 'LEADER' &&
                    !team.isLocked &&
                    !team.formationSubmitted
                  }
                  loading={loading}
                  onCancelInvite={onCancelInvite}
                  onKickMember={onKickMember}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredMembers.length === 0 && (
            <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={`Chưa có thành viên nào ở trạng thái "${selectedFilterLabel}".`}
                style={{ padding: '48px 0' }}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <Modal
        title={
          <Space style={{ fontSize: 20, fontWeight: 900 }}>
            <Sliders size={22} color={FPT.orange} /> Cài đặt & Điều phối đội thi
          </Space>
        }
        open={isSettingsOpen}
        onCancel={() => setIsSettingsOpen(false)}
        footer={null}
        destroyOnClose
        styles={{
          body: { paddingTop: 20 },
          content: { borderRadius: 24, background: token.colorBgContainer, border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : 'none', padding: 28 },
        }}
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          {team.isCurrentUserLeader && (
            <div
              style={{
                padding: 20,
                borderRadius: 18,
                border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : token.colorBorderSecondary}`,
                background: isDark ? 'rgba(255, 255, 255, 0.03)' : token.colorFillAlter,
              }}
            >
              <Title level={5} style={{ marginTop: 0, fontWeight: 800, color: token.colorTextHeading, fontSize: 16 }}>
                👑 Chuyển quyền Trưởng nhóm
              </Title>
              {team.canTransferLeader && team.transferCandidates?.length > 0 ? (
                <TransferLeaderForm team={team} form={transferForm} loading={loading} onTransferLeader={onTransferLeader} />
              ) : (
                <Text type="secondary" style={{ display: 'block', fontSize: 13, color: token.colorTextSecondary }}>
                  {team.formationSubmitted
                    ? 'Đã xác nhận thành lập đội — không thể chuyển quyền trưởng nhóm.'
                    : team.isLocked
                      ? 'Đội đã bị khóa — không thể chuyển quyền trưởng nhóm.'
                      : team.status === 'ACTIVE'
                        ? 'Đội đã được Ban tổ chức duyệt — không thể chuyển quyền trưởng nhóm.'
                        : team.transferCandidates?.length === 0
                          ? 'Cần ít nhất một thành viên đã tham gia để chuyển quyền.'
                          : 'Hiện không thể chuyển quyền trưởng nhóm.'}
                </Text>
              )}
            </div>
          )}
          
          {team.canLeaveTeam && (
            <div>
              <LeaveTeamPanel teamId={team.id} loading={loading} onLeaveTeam={onLeaveTeam} />
            </div>
          )}

          {team.isCurrentUserLeader && (
            <div
              style={{
                padding: 20,
                borderRadius: 18,
                border: '1.5px solid rgba(239, 68, 68, 0.35)',
                background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                marginTop: 20,
              }}
            >
              <Space style={{ color: '#EF4444', marginBottom: 10 }}>
                <ExclamationCircleOutlined /> 
                <Title level={5} style={{ margin: 0, color: '#EF4444', fontWeight: 900, fontSize: 16 }}>Giải tán đội thi</Title>
              </Space>
              <Text style={{ display: 'block', marginBottom: 18, fontSize: 14, color: isDark ? '#F87171' : '#cf1322', lineHeight: 1.6 }}>
                Thao tác này sẽ hủy bỏ đội của bạn hoàn toàn khỏi Hackathon. <br/>
                <strong>Điều kiện:</strong> Đội phải ở trạng thái Đang chờ duyệt, chưa có Người hướng dẫn, và không còn thành viên nào khác.
              </Text>
              
              {!team.canDisband || team.members?.length > 1 ? (
                <Text style={{ display: 'block', marginBottom: 14, color: token.colorTextSecondary, fontWeight: 600 }}>
                  {!team.canDisband && team.status !== 'PENDING' 
                    ? 'Đội đã được Ban tổ chức duyệt — không thể giải tán.' 
                    : !team.canDisband && team.formationSubmitted 
                    ? 'Đã xác nhận thành lập đội — không thể giải tán.'
                    : !team.canDisband && team.isLocked
                    ? 'Đội đang bị khóa — không thể giải tán.'
                    : !team.canDisband && team.hasMentor
                    ? 'Đội đã có Người hướng dẫn — không thể giải tán.'
                    : team.members?.length > 1 
                    ? 'Vui lòng loại bỏ tất cả thành viên khác khỏi đội trước khi giải tán.'
                    : 'Không thể giải tán đội lúc này.'}
                </Text>
              ) : null}

              <Button 
                danger 
                type="primary"
                disabled={!team.canDisband || team.members?.length > 1} 
                onClick={() => {
                  Modal.confirm({
                    title: 'Xác nhận giải tán đội?',
                    icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
                    content: 'Thao tác này không thể hoàn tác. Mọi dữ liệu về đội thi sẽ bị xóa vĩnh viễn.',
                    okText: 'Giải tán vĩnh viễn',
                    okButtonProps: { danger: true, style: { fontWeight: 700 } },
                    onOk: () => {
                      onDisbandTeam(team.id);
                      setIsSettingsOpen(false);
                    }
                  });
                }}
                loading={loading}
                style={{ borderRadius: 12, fontWeight: 800, height: 44, padding: '0 24px', fontSize: 14 }}
              >
                Giải tán đội thi
              </Button>
            </div>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default TeamMemberManager;
