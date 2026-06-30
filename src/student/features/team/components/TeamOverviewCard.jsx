/**
 * Component: TeamOverviewCard
 * Chức năng: Card hiển thị các thông tin tóm tắt chung về đội thi hiện tại (Tên đội, Thời gian tạo, Trạng thái).
 */
import { Button, Card, Modal, Progress, Space, Tag, Typography, message, theme, Avatar, Divider, Alert } from 'antd';
import { CheckCircleOutlined, LockOutlined, UnlockOutlined, TrophyOutlined, TeamOutlined, MailOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getStudentTeamErrorMessage } from '../constants/studentTeam.constants';

const { Text, Title } = Typography;

const TeamOverviewCard = ({ team, onConfirmFormation, actionLoading = false }) => {
  const { token } = theme.useToken();

  if (!team) return null;

  const minTeamSize = team.minTeamSize ?? 3;
  const maxTeamSize = team.maxTeamSize ?? 5;

  const progressPercent = Math.min(
    100,
    Math.round((team.acceptedMemberCount / maxTeamSize) * 100)
  );
  const hasPendingInvites = team.pendingInviteCount > 0;
  const hasMinAcceptedMembers = team.acceptedMemberCount >= minTeamSize;
  const canConfirmFormation = Boolean(team.canConfirmFormation);
  const formationSubmitted = Boolean(team.formationSubmitted);
  const showFormationButton =
    team.isCurrentUserLeader &&
    team.status === 'PENDING' &&
    !team.isLocked &&
    !formationSubmitted &&
    hasMinAcceptedMembers;

  const handleConfirmClick = () => {
    if (formationSubmitted) {
      return;
    }

    if (hasPendingInvites) {
      Modal.warning({
        title: 'Chưa thể xác nhận thành lập đội',
        content: (
          <>
            Đội bạn đang còn <strong>{team.pendingInviteCount}</strong> lời mời chờ phản hồi.
            Bạn cần chờ thành viên chấp nhận vào đội hoặc hủy lời mời trước khi xác nhận thành lập đội.
          </>
        ),
        okText: 'Đã hiểu',
      });
      return;
    }

    if (!team.isMemberCountReady) {
      Modal.info({
        title: 'Chưa đủ thành viên',
        content: `Đội cần từ ${minTeamSize} đến ${maxTeamSize} thành viên đã tham gia trước khi xác nhận.`,
        okText: 'Đã hiểu',
      });
      return;
    }

    Modal.confirm({
      title: 'Xác nhận thành lập đội?',
      content: (
        <>
          Bạn xác nhận roster hiện tại gồm <strong>{team.acceptedMemberCount}</strong> thành viên
          và gửi yêu cầu Coordinator duyệt sớm.
          <br />
          <br />
          Thao tác này <strong>chỉ thực hiện được một lần</strong> và sau đó không thể mời thêm thành viên.
        </>
      ),
      okText: 'Xác nhận thành lập',
      okButtonProps: { style: { background: '#52c41a', borderColor: '#52c41a' } },
      cancelText: 'Hủy',
      onOk: async () => {
        const result = await onConfirmFormation?.(team.id);
        if (result?.success) {
          message.success('Đã xác nhận thành lập đội. Coordinator sẽ duyệt sớm.');
          return;
        }
        message.error(getStudentTeamErrorMessage(result?.error, 'Không thể xác nhận thành lập đội'));
        return Promise.reject();
      },
    });
  };

  return (
    <Card
      style={{
        borderRadius: 24,
        overflow: 'hidden',
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
      }}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: '32px 24px', textAlign: 'center', background: `linear-gradient(180deg, ${token.colorPrimary}0A 0%, rgba(255,255,255,0) 100%)` }}>
        <Avatar
          size={72}
          icon={<TrophyOutlined />}
          style={{
            background: 'linear-gradient(135deg, #1890ff, #13c2c2)',
            boxShadow: '0 12px 24px rgba(24,144,255,0.2)',
            marginBottom: 16,
          }}
        />

        <Title level={3} style={{ margin: 0 }}>{team.teamName}</Title>
        <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 14 }}>{team.hackathonName}</Text>

        <Space style={{ marginTop: 16 }} wrap>
          <Tag color={team.statusColor} style={{ borderRadius: 12, padding: '2px 12px', border: 0, fontWeight: 600 }}>
            {team.statusLabel}
          </Tag>
          {team.participationLabel && (
            <Tag color={team.participationColor} style={{ borderRadius: 12, padding: '2px 12px', border: 0, fontWeight: 700 }}>
              {team.participationLabel}
            </Tag>
          )}
          {formationSubmitted && (
            <Tag color="green" icon={<CheckCircleOutlined />} style={{ borderRadius: 12, padding: '2px 12px', border: 0 }}>
              Đã xác nhận roster
            </Tag>
          )}
          <Tag
            color={team.isLocked ? 'error' : 'success'}
            icon={team.isLocked ? <LockOutlined /> : <UnlockOutlined />}
            style={{ borderRadius: 12, padding: '2px 12px', border: 0 }}
          >
            {team.isLocked ? 'Khóa' : 'Mở'}
          </Tag>
        </Space>
      </div>

      <div style={{ padding: '0 24px 24px' }}>
        {team.isEliminatedFromFinal && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16, borderRadius: 12 }}
            message="Đội đã bị loại tại Vòng Sơ loại"
            description={`Đội của bạn không được chọn vào Vòng Chung kết của ${team.hackathonName || 'cuộc thi này'}. Bạn vẫn có thể xem lại kết quả và hành trình thi đấu tại mục «Cuộc thi đã tham gia».`}
          />
        )}
        {team.isAdvanced && (
          <Alert
            type="success"
            showIcon
            style={{ marginBottom: 16, borderRadius: 12 }}
            message="Chúc mừng — Đội vào Vòng Chung kết"
            description="Đội của bạn đã được chọn vào Chung kết. Theo dõi mục «Nộp bài thi» khi Coordinator kích hoạt vòng CK."
          />
        )}

        {team.isInFormationGracePeriod && (
          <Alert
            type="warning"
            showIcon
            icon={<ClockCircleOutlined />}
            style={{ marginBottom: 16, borderRadius: 12 }}
            message="Thời gian suy nghĩ 24 giờ"
            description={
              team.isCurrentUserLeader ? (
                <>
                  Hackathon đã kết thúc đăng ký sớm. Bạn có đến{' '}
                  <strong>{dayjs(team.formationGraceDeadlineAt).format('DD/MM/YYYY HH:mm')}</strong> để quyết định
                  bấm «Xác nhận thành lập đội» và tham gia sự kiện. Nếu không xác nhận, toàn đội sẽ tự động bị loại
                  khỏi hackathon (không tính thời gian Coordinator duyệt).
                </>
              ) : (
                <>
                  Hackathon đã kết thúc đăng ký sớm. Trưởng nhóm <strong>{team.leaderName}</strong> có đến{' '}
                  <strong>{dayjs(team.formationGraceDeadlineAt).format('DD/MM/YYYY HH:mm')}</strong> để bấm «Xác nhận
                  thành lập đội». Nếu không xác nhận, toàn đội sẽ tự động bị loại khỏi sự kiện.
                  <br />
                  <br />
                  Vui lòng nhắc trưởng nhóm quyết định sớm — thời gian 24h chỉ dành cho bước xác nhận, không tính thời
                  gian Coordinator duyệt.
                </>
              )
            }
          />
        )}

        <div style={{ background: token.colorFillAlter, borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
            Trưởng nhóm
          </Text>
          <Title level={5} style={{ margin: 0 }}>{team.leaderName}</Title>
        </div>

        <div style={{ background: token.colorFillAlter, borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
            Track tham gia sơ loại
          </Text>
          <Title level={5} style={{ margin: 0 }}>{team.trackName || 'Chưa bốc thăm track'}</Title>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <TeamOutlined style={{ fontSize: 24, color: token.colorPrimary, marginBottom: 8 }} />
            <Title level={3} style={{ margin: 0 }}>{team.memberCapacityLabel}</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>Đã tham gia</Text>
          </div>
          <Divider type="vertical" style={{ height: 60 }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <MailOutlined style={{ fontSize: 24, color: token.colorWarning, marginBottom: 8 }} />
            <Title level={3} style={{ margin: 0 }}>{team.pendingInviteCount}</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>Đang chờ</Text>
          </div>
        </div>

        <div>
          <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text strong>Tiến độ duyệt đội</Text>
            <Text type={team.isMemberCountReady ? 'success' : 'secondary'} style={{ fontSize: 13 }}>
              Cần {minTeamSize}-{maxTeamSize} người
            </Text>
          </Space>
          <Progress
            percent={progressPercent}
            showInfo={false}
            strokeColor={{ from: '#1890ff', to: '#13c2c2' }}
            trailColor={token.colorFillSecondary}
            strokeWidth={10}
          />
        </div>

        {team.isCurrentUserLeader && team.status === 'PENDING' && !team.isLocked && (
          <div style={{ marginTop: 16 }}>
            {formationSubmitted ? (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: token.colorSuccessBg,
                  border: `1px solid ${token.colorSuccessBorder}`,
                  textAlign: 'center',
                }}
              >
                <Text style={{ color: token.colorSuccess }}>
                  Đã xác nhận thành lập đội — đang chờ Coordinator duyệt.
                </Text>
              </div>
            ) : !hasMinAcceptedMembers ? (
              <Text type="secondary" style={{ display: 'block', fontSize: 13, textAlign: 'center' }}>
                Cần ít nhất {minTeamSize} thành viên <strong>đã tham gia</strong> (không tính lời mời đang chờ) để xác nhận thành lập đội.
              </Text>
            ) : showFormationButton ? (
              <>
                {hasPendingInvites && (
                  <Text type="warning" style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
                    Đội còn {team.pendingInviteCount} lời mời đang chờ. Hãy chờ accept hoặc hủy lời mời trước khi xác nhận.
                  </Text>
                )}
                <Button
                  type="primary"
                  block
                  loading={actionLoading}
                  onClick={handleConfirmClick}
                  style={
                    canConfirmFormation
                      ? { background: '#52c41a', borderColor: '#52c41a', fontWeight: 600 }
                      : undefined
                  }
                >
                  Xác nhận thành lập đội
                </Button>
              </>
            ) : null}
          </div>
        )}

        {team.rejectionReason && (
          <div style={{ marginTop: 20, padding: 16, borderRadius: 12, color: token.colorError, background: token.colorErrorBg, border: `1px solid ${token.colorErrorBorder}` }}>
            <strong>Lý do từ chối:</strong> {team.rejectionReason}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TeamOverviewCard;
