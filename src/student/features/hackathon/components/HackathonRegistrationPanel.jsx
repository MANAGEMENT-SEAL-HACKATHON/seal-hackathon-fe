import { Badge, Button, Card, Empty, Modal, Space, Spin, Tag, Typography, message, theme } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  FireOutlined,
  TeamOutlined,
  TrophyOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { useStudentHackathonRegistration } from '../hooks/useStudentHackathonRegistration';

import { getStudentHackathonErrorMessage } from '../constants/studentHackathon.constants';

const { Text, Title, Paragraph } = Typography;

const SEASON_LABELS = {
  SPRING: 'Xuân',
  SUMMER: 'Hạ',
  FALL: 'Thu',
  AUTUMN: 'Thu',
  WINTER: 'Đông',
};

const BENEFITS = [
  { icon: <TrophyOutlined />, text: 'Giải thưởng & giấy chứng nhận' },
  { icon: <TeamOutlined />, text: 'Làm việc nhóm thực chiến' },
  { icon: <UsergroupAddOutlined />, text: 'Mentor đồng hành 1-1' },
];

const formatDate = (value) => (value ? dayjs(value).format('DD/MM/YYYY') : null);

const seasonLabel = (season, year) => {
  if (!season && !year) return null;
  const s = SEASON_LABELS[season] || season;
  return [s, year].filter(Boolean).join(' ');
};

const HackathonRegistrationPanel = ({ hasTeam = false, onRegistrationChange }) => {
  const { token } = theme.useToken();

  const {
    hackathons,
    loading,
    actionLoading,
    registrationBlocked,
    register,
    unregister,
  } = useStudentHackathonRegistration();

  const handleRegister = async (hackathonId, hackathonName) => {
    Modal.confirm({
      title: 'Xác nhận đăng ký tham gia?',
      content: (
        <>
          Bạn sẽ đăng ký tham gia <strong>{hackathonName}</strong>. Mỗi người chỉ được đăng ký một
          giải tại một thời điểm và không thể đăng ký lại sau khi hủy.
        </>
      ),
      okText: 'Đăng ký',
      cancelText: 'Hủy',
      onOk: async () => {
        const result = await register(hackathonId);
        if (result.success) {
          message.success('Đăng ký tham gia hackathon thành công');
          onRegistrationChange?.();
          return;
        }
        message.error(getStudentHackathonErrorMessage(result.error));
      },
    });
  };

  const handleUnregister = async (hackathonId, hackathonName) => {
    Modal.confirm({
      title: 'Xác nhận hủy đăng ký?',
      content: (
        <>
          Bạn sẽ hủy đăng ký <strong>{hackathonName}</strong>. Mỗi người chỉ được hủy đăng ký một
          lần và không thể đăng ký lại giải này.
        </>
      ),
      okText: 'Hủy đăng ký',
      okButtonProps: { danger: true },
      cancelText: 'Đóng',
      onOk: async () => {
        const result = await unregister(hackathonId);
        if (result.success) {
          message.success('Đã hủy đăng ký hackathon');
          onRegistrationChange?.();
          return;
        }
        message.error(getStudentHackathonErrorMessage(result.error, 'Không thể hủy đăng ký'));
      },
    });
  };

  if (loading) {
    return (
      <Card style={{ borderRadius: 16, border: `1px solid ${token.colorBorderSecondary}` }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      </Card>
    );
  }

  if (!hackathons.length) {
    return null;
  }

  return (
    <Card
      title={
        <Space>
          <FireOutlined style={{ color: token.colorPrimary }} />
          <span>Sự kiện đang mở đăng ký</span>
        </Space>
      }
      style={{
        borderRadius: 16,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: token.boxShadowTertiary,
      }}
      styles={{ body: { display: 'flex', flexDirection: 'column', gap: 16 } }}
    >
      {hackathons.map((item) => {
        const isRegistered = Boolean(item.registered);
        const isSlotFull = registrationBlocked[item.id];
        const isWithdrawn = Boolean(item.registrationWithdrawn);
        const isRegisteredElsewhere = Boolean(item.registeredElsewhere);
        const canRegister = !isRegistered && !isSlotFull && !isWithdrawn && !isRegisteredElsewhere;

        const regEnd = item.registrationEnd ? dayjs(item.registrationEnd) : null;
        const daysLeft = regEnd ? regEnd.endOf('day').diff(dayjs(), 'day') : null;
        const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
        const label = seasonLabel(item.season, item.year);

        return (
          <div
            key={item.id}
            style={{
              borderRadius: 14,
              border: `1px solid ${isRegistered ? token.colorSuccessBorder : token.colorBorderSecondary}`,
              overflow: 'hidden',
              background: token.colorBgContainer,
            }}
          >
            <div
              style={{
                height: 96,
                background: item.bannerUrl
                  ? `url(${item.bannerUrl}) center/cover no-repeat`
                  : `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
                padding: 12,
              }}
            >
              <Space size={6}>
                <Tag color="processing" style={{ margin: 0 }}>
                  {item.status}
                </Tag>
                {label && (
                  <Tag color="gold" style={{ margin: 0 }}>
                    {label}
                  </Tag>
                )}
              </Space>
            </div>

            <div style={{ padding: 16 }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Title level={5} style={{ margin: 0 }}>
                  {item.name}
                </Title>
                {isRegistered ? (
                  <Badge status="success" text="Đã đăng ký" />
                ) : isWithdrawn ? (
                  <Badge status="error" text="Đã hủy đăng ký" />
                ) : (
                  <Badge status="default" text="Chưa đăng ký" />
                )}
              </div>

              {item.description && (
                <Paragraph
                  type="secondary"
                  ellipsis={{ rows: 2 }}
                  style={{ margin: '8px 0 0', fontSize: 13 }}
                >
                  {item.description}
                </Paragraph>
              )}

              <Space size={16} wrap style={{ marginTop: 12 }}>
                {(item.registrationStart || item.registrationEnd) && (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    <CalendarOutlined /> Đăng ký: {formatDate(item.registrationStart) || '—'} –{' '}
                    {formatDate(item.registrationEnd) || '—'}
                  </Text>
                )}
                {(item.eventStart || item.eventEnd) && (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    <ClockCircleOutlined /> Thi đấu: {formatDate(item.eventStart) || '—'} –{' '}
                    {formatDate(item.eventEnd) || '—'}
                  </Text>
                )}
                {item.maxParticipants ? (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    <TeamOutlined /> Tối đa {item.maxParticipants} người
                  </Text>
                ) : null}
              </Space>

              {canRegister && (
                <Space size={12} wrap style={{ marginTop: 12 }}>
                  {BENEFITS.map((b) => (
                    <Text key={b.text} style={{ fontSize: 12, color: token.colorTextTertiary }}>
                      <span style={{ color: token.colorPrimary, marginRight: 4 }}>{b.icon}</span>
                      {b.text}
                    </Text>
                  ))}
                </Space>
              )}

              {isUrgent && canRegister && (
                <div style={{ marginTop: 12 }}>
                  <Tag color="volcano" icon={<ClockCircleOutlined />} style={{ margin: 0 }}>
                    {daysLeft === 0 ? 'Hôm nay là hạn chót đăng ký!' : `Chỉ còn ${daysLeft} ngày để đăng ký`}
                  </Tag>
                </div>
              )}

              {isSlotFull && (
                <Text type="danger" style={{ display: 'block', marginTop: 12, fontSize: 13 }}>
                  Đăng ký thất bại: Giải đấu đã đạt giới hạn tối đa số lượng người tham gia.
                </Text>
              )}
              {isWithdrawn && (
                <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 13 }}>
                  Bạn đã hủy đăng ký giải này và không thể đăng ký lại.
                </Text>
              )}
              {isRegisteredElsewhere && (
                <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 13 }}>
                  Bạn đã đăng ký một giải khác. Mỗi người chỉ được đăng ký một giải tại một thời điểm.
                </Text>
              )}

              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {canRegister && (
                  <Button
                    type="primary"
                    size="large"
                    loading={actionLoading}
                    onClick={() => handleRegister(item.id, item.name)}
                  >
                    Đăng ký tham gia
                  </Button>
                )}
                {isRegistered && !hasTeam && (
                  <Button danger loading={actionLoading} onClick={() => handleUnregister(item.id, item.name)}>
                    Hủy đăng ký
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {!hackathons.length && <Empty description="Không có hackathon đang mở đăng ký" />}
    </Card>
  );
};

export default HackathonRegistrationPanel;
