import { Avatar, Badge, Button, Popover, theme, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import {
  AlertTriangle,
  CalendarClock,
  CheckCheck,
  FileCheck,
  FileText,
  Gavel,
  Info,
  Mail,
  Trophy,
  Users,
} from 'lucide-react';

const { Text } = Typography;

const BG_BLUE = (darkMode) => (darkMode ? '#111a2c' : '#e6f4ff');
const BG_GREEN = (darkMode) => (darkMode ? '#11211b' : '#f6ffed');
const BG_AMBER = (darkMode) => (darkMode ? '#272015' : '#fffbe6');

const getNotifConfig = (type, token, darkMode) => {
  const t = String(type || '').toUpperCase();

  // Nhân sự: mời / phân công / gỡ phân công
  if (t === 'INVITATION') {
    return { icon: <Mail size={16} color={token.colorPrimary} />, bg: BG_BLUE(darkMode) };
  }
  if (t === 'MENTOR_ASSIGNED' || t === 'JUDGE_ASSIGNED'
      || t === 'MENTOR_UNASSIGNED' || t === 'JUDGE_UNASSIGNED') {
    const removed = t.endsWith('_UNASSIGNED');
    return {
      icon: <Users size={16} color={removed ? token.colorTextSecondary : token.colorPrimary} />,
      bg: removed ? BG_AMBER(darkMode) : BG_BLUE(darkMode),
    };
  }

  // Giám khảo: nhắc chấm bài
  if (t === 'JUDGE_SCORING_REMINDER') {
    return { icon: <Gavel size={16} color={token.colorWarning} />, bg: BG_AMBER(darkMode) };
  }

  // Bài nộp: xác nhận đã nộp / nhắc hạn nộp
  if (t === 'SUBMISSION_RECEIVED') {
    return { icon: <FileCheck size={16} color={token.colorSuccess} />, bg: BG_GREEN(darkMode) };
  }
  if (t === 'SUBMISSION_DEADLINE_REMINDER') {
    return { icon: <CalendarClock size={16} color={token.colorWarning} />, bg: BG_AMBER(darkMode) };
  }

  // Sự kiện theo lịch
  if (t === 'REMINDER' || t === 'EVENT_REMINDER' || t === 'EVENT_UPCOMING') {
    return { icon: <CalendarClock size={16} color={token.colorSuccess} />, bg: BG_GREEN(darkMode) };
  }

  // Kết quả / điểm
  if (t === 'SCORE_RELEASED') {
    return { icon: <Trophy size={16} color={token.colorSuccess} />, bg: BG_GREEN(darkMode) };
  }

  // Hackathon còn nháp — nhắc Coordinator
  if (t === 'HACKATHON_DRAFT_REMINDER') {
    return { icon: <FileText size={16} color={token.colorWarning} />, bg: BG_AMBER(darkMode) };
  }

  // Cảnh báo đội / trạng thái đội
  if (t === 'WARNING' || t.startsWith('TEAM_')) {
    return { icon: <AlertTriangle size={16} color={token.colorWarning} />, bg: BG_AMBER(darkMode) };
  }

  // Thông tin chung
  if (t === 'HACKATHON_OPEN' || t === 'PROBLEM_RELEASED' || t === 'ROUND_STARTED') {
    return { icon: <Info size={16} color={token.colorInfo} />, bg: BG_BLUE(darkMode) };
  }

  return { icon: <BellOutlined style={{ color: token.colorPrimary }} />, bg: BG_BLUE(darkMode) };
};

/**
 * Shared notification bell + dropdown panel (coordinator, student, mentor, judge).
 */
export default function NotificationBell({
  notifications = [],
  markAsRead,
  darkMode = false,
  buttonStyle,
}) {
  const { token } = theme.useToken();
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const panel = (
    <div style={{ width: 340 }}>
      <div
        style={{
          padding: '8px 0',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text strong>Thông báo hệ thống</Text>
        <Button
          type="link"
          size="small"
          onClick={() => markAsRead('ALL')}
          disabled={unreadCount === 0}
          icon={<CheckCheck size={14} />}
        >
          Đã đọc tất cả
        </Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: token.colorTextDisabled }}>
            Không có thông báo mới
          </div>
        ) : (
          notifications.slice(0, 5).map((item) => {
            const config = getNotifConfig(item.type, token, darkMode);
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '12px 8px',
                  cursor: 'pointer',
                  opacity: item.is_read ? 0.6 : 1,
                  transition: 'background 0.3s',
                  borderRadius: 6,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = token.colorBgTextHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                onClick={() => markAsRead(item.id)}
              >
                <Avatar
                  style={{
                    backgroundColor: config.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginRight: 12,
                  }}
                  icon={config.icon}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: item.is_read ? 400 : 600,
                      color: token.colorText,
                      marginBottom: 4,
                    }}
                  >
                    {item.title}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.description}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
                      {item.time}
                    </Text>
                  </div>
                </div>
                {!item.is_read && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: token.colorPrimary,
                      marginLeft: 8,
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <Popover content={panel} trigger="click" placement="bottomRight" arrow={false}>
      <Badge count={unreadCount} offset={[-4, 4]} size="small">
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 20 }} />}
          style={buttonStyle}
        />
      </Badge>
    </Popover>
  );
}
