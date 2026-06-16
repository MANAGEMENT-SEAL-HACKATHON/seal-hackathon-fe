/**
 * Component: TeamMemberManager
 * Chức năng: Bảng điều khiển quản lý danh sách thành viên trong đội. Cho phép Trưởng nhóm mời thêm người, chuyển quyền hoặc giải tán đội.
 */
import { useMemo, useState } from 'react';
import { Button, Empty, Form, Input, Space, Typography, theme, Divider, Row, Col, Modal } from 'antd';
import { MailOutlined, SettingOutlined, UserAddOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { MEMBER_STATUS } from '../constants/studentTeam.constants';
import LeaveTeamPanel from './LeaveTeamPanel';
import MemberStatusFilter, { MEMBER_FILTERS } from './MemberStatusFilter';
import TeamMemberCard from './TeamMemberCard';
import TransferLeaderForm from './TransferLeaderForm';

const { Text, Title } = Typography;

const TeamMemberManager = ({ team, onInviteMember, onCancelInvite, onLeaveTeam, onTransferLeader, onDisbandTeam, loading }) => {
  const [inviteForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [memberFilter, setMemberFilter] = useState(MEMBER_STATUS.ACCEPTED);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { token } = theme.useToken();
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
    if (team.isFull) return 'Đội đã đủ 5 thành viên.';
    return 'Trạng thái đội hiện tại chưa cho phép mời thêm thành viên.';
  })();

  const handleInvite = async (values) => {
    const success = await onInviteMember(team.id, values.email?.trim());
    if (success) inviteForm.resetFields();
  };

  return (
    <div style={{ background: token.colorBgContainer, borderRadius: 24, padding: 32, boxShadow: '0 12px 32px rgba(0,0,0,0.03)', border: `1px solid ${token.colorBorderSecondary}` }}>
      
      {/* Header & Invite Section */}
      <Row gutter={[24, 24]} align="middle" style={{ marginBottom: 32 }}>
        <Col xs={24} md={12}>
          <Space align="center" size={16}>
            <div>
              <Title level={3} style={{ margin: 0 }}>Thành viên đội</Title>
              <Text type="secondary">Quản lý thành viên và quyền trưởng nhóm.</Text>
            </div>
            {(team.isCurrentUserLeader || team.canLeaveTeam) && (
              <Button 
                icon={<SettingOutlined />} 
                size="middle" 
                onClick={() => setIsSettingsOpen(true)}
                style={{ background: token.colorFillAlter, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, fontWeight: 500 }}
              >
                Cài đặt đội
              </Button>
            )}
          </Space>
        </Col>
        
        <Col xs={24} md={12}>
          <Form form={inviteForm} layout="inline" onFinish={handleInvite} requiredMark={false} style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Space.Compact style={{ width: '100%', maxWidth: 400, boxShadow: '0 8px 20px rgba(0,0,0,0.04)', borderRadius: 12 }}>
              <Form.Item name="email" noStyle rules={[{ required: true, message: 'Nhập email.' }, { type: 'email', message: 'Email không hợp lệ.' }]}>
                <Input
                  prefix={<MailOutlined style={{ color: token.colorTextQuaternary }} />}
                  placeholder={team.canInvite ? 'Nhập email mời vào đội...' : inviteDisabledReason}
                  disabled={!team.canInvite}
                  style={{ height: 48, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} disabled={!team.canInvite} icon={<UserAddOutlined />} style={{ height: 48, fontWeight: 700, borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
                Mời
              </Button>
            </Space.Compact>
          </Form>
        </Col>
      </Row>

      <Divider style={{ margin: '0 0 24px 0' }} />

      <MemberStatusFilter counts={memberCounts} value={memberFilter} onChange={setMemberFilter} />

      <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginTop: 24, minHeight: 300 }}>
        <AnimatePresence>
          {filteredMembers.map((member) => (
            <motion.div
              key={`${team.id}-${member.userId}`}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <TeamMemberCard
                member={member}
                teamId={team.id}
                canCancelInvite={team.isCurrentUserLeader}
                loading={loading}
                onCancelInvite={onCancelInvite}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredMembers.length === 0 && (
          <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ gridColumn: '1 / -1' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={`Chưa có thành viên nào ở trạng thái ${selectedFilterLabel}.`}
              style={{ padding: 48, background: token.colorFillQuaternary, borderRadius: 20 }}
            />
          </motion.div>
        )}
      </motion.div>

      {/* Settings Modal */}
      <Modal
        title={
          <Space>
            <SettingOutlined /> Cài đặt đội thi
          </Space>
        }
        open={isSettingsOpen}
        onCancel={() => setIsSettingsOpen(false)}
        footer={null}
        destroyOnClose
        styles={{ body: { paddingTop: 16 } }}
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          {team.isCurrentUserLeader && (
            <div style={{ padding: 20, borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}`, background: token.colorFillAlter }}>
              <Title level={5} style={{ marginTop: 0 }}>Chuyển quyền Trưởng nhóm</Title>
              <TransferLeaderForm team={team} form={transferForm} loading={loading} onTransferLeader={onTransferLeader} />
            </div>
          )}
          
          {team.canLeaveTeam && (
            <div>
              <LeaveTeamPanel teamId={team.id} loading={loading} onLeaveTeam={onLeaveTeam} />
            </div>
          )}

          {team.canDisband && (
            <div style={{ padding: 20, borderRadius: 16, border: `1px solid ${token.colorErrorBorder}`, background: token.colorErrorBg }}>
              <Space style={{ color: token.colorError, marginBottom: 8 }}>
                <ExclamationCircleOutlined /> 
                <Title level={5} style={{ margin: 0, color: token.colorError }}>Giải tán đội</Title>
              </Space>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16, color: '#cf1322' }}>
                Thao tác này sẽ hủy bỏ đội của bạn hoàn toàn khỏi Hackathon. <br/>
                <strong>Điều kiện:</strong> Bạn chỉ có thể giải tán đội khi <strong>chưa có Mentor</strong> và <strong>không còn thành viên nào khác</strong> trong đội. Nếu còn thành viên, nút này sẽ bị khóa và bạn bắt buộc phải chuyển quyền Leader.
              </Text>
              
              <Button 
                danger 
                disabled={team.members?.length > 1} 
                onClick={() => {
                  Modal.confirm({
                    title: 'Xác nhận giải tán đội?',
                    icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
                    content: 'Thao tác này không thể hoàn tác. Mọi dữ liệu về đội thi sẽ bị xóa.',
                    okText: 'Giải tán vĩnh viễn',
                    okButtonProps: { danger: true },
                    onOk: () => {
                      onDisbandTeam(team.id);
                      setIsSettingsOpen(false);
                    }
                  });
                }}
                loading={loading}
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

