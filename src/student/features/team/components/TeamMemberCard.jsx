/**
 * Component: TeamMemberCard
 * Chức năng: Card hiển thị thông tin thành viên trong danh sách.
 * Cải tiến UI Siêu Cấp - "TƯƠNG PHẢN CAO & NỔI BẬT KHỎI BACKGROUND" (High-Contrast Solid Jewel Badges):
 * - Thay thế các huy hiệu màu nhạt chìm vào nền (pale pastel pills) bằng Huy hiệu Đặc kim Gradient rực rỡ (Solid Luminous Pills) có chữ trắng và bóng đổ hào quang!
 * - Avatar 48px viền sáng rực rỡ, hàng ngang gọn gàng, tương phản cực mạnh trên cả nền sáng và nền tối.
 */
import { useMemo } from 'react';
import { Button, Modal, Tag, Typography, theme, Avatar, Tooltip } from 'antd';
import { motion } from 'framer-motion';
import { Crown, UserMinus, Clock, CheckCircle2, XCircle, Shield } from 'lucide-react';

const { Text } = Typography;

/* OFFICIAL FPT LOGO COLORS & CYBER PALETTE */
const FPT = {
  blue: '#00529C',
  orange: '#F37021',
  orangeLight: '#FF8C42',
  green: '#46B749',
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const TeamMemberCard = ({ member, teamId, canCancelInvite, canKickMember, loading, onCancelInvite, onKickMember }) => {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer?.toLowerCase() !== '#ffffff' && token.colorBgContainer?.toLowerCase() !== '#fff';

  const isLeader = member.role === 'LEADER' || member.roleInTeam === 'LEADER';
  const isPending = member.status === 'PENDING';
  
  const rowStyle = useMemo(() => ({
    padding: '16px 24px',
    background: isPending
      ? (isDark 
          ? 'linear-gradient(90deg, rgba(243, 112, 33, 0.12) 0%, rgba(243, 112, 33, 0.02) 40%, transparent 100%)' 
          : 'linear-gradient(90deg, rgba(243, 112, 33, 0.1) 0%, rgba(243, 112, 33, 0.03) 40%, transparent 100%)')
      : 'transparent',
    borderLeft: isPending ? '4px solid #F37021' : '4px solid transparent',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    width: '100%',
  }), [isPending, isDark]);

  const getStatusIcon = () => {
    switch(member.status) {
      case 'ACCEPTED': return <CheckCircle2 size={14} style={{ flexShrink: 0 }} />;
      case 'PENDING': return <Clock size={14} style={{ flexShrink: 0 }} />;
      case 'REJECTED': return <XCircle size={14} style={{ flexShrink: 0 }} />;
      default: return null;
    }
  };

  const getStatusText = () => {
    if (member.statusLabel && !['ACCEPTED', 'PENDING', 'REJECTED', 'LEFT'].includes(member.statusLabel)) {
      return member.statusLabel;
    }
    switch(member.status) {
      case 'ACCEPTED': return 'Đã gia nhập';
      case 'PENDING': return 'Đang chờ';
      case 'REJECTED': return 'Đã từ chối';
      case 'LEFT': return 'Đã rời đội';
      default: return 'Thành viên';
    }
  };

  const handleKickMember = () => {
    const memberLabel = member.fullName || member.email || 'thành viên này';
    Modal.confirm({
      title: 'Mời thành viên rời đội?',
      content: (
        <>
          Bạn sắp mời <strong>{memberLabel}</strong> rời khỏi đội.
          {' '}Họ sẽ không còn là thành viên và cần lời mời mới nếu muốn tham gia lại.
        </>
      ),
      okText: 'Mời rời đội',
      okButtonProps: { danger: true, style: { fontWeight: 700 } },
      cancelText: 'Hủy',
      onOk: async () => {
        const success = await onKickMember(teamId, member.userId);
        if (!success) {
          return Promise.reject();
        }
      },
    });
  };

  return (
    <motion.div
      whileHover={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 82, 156, 0.04)', x: 4 }}
      transition={{ duration: 0.15 }}
      style={rowStyle}
    >
      {/* CỘT 1 (38% width): Avatar 48px + Tên + Email */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 38%', minWidth: 200 }}>
        <motion.div whileHover={{ scale: 1.08, rotate: 5 }}>
          <Avatar
            size={48}
            style={{
              background: isLeader
                ? `linear-gradient(135deg, #FF6B00, #FFA800)`
                : (isDark ? 'linear-gradient(135deg, #00529C, #00C6FF)' : 'linear-gradient(135deg, #00529C, #3B82F6)'),
              color: '#FFF',
              fontWeight: 800,
              fontSize: 16,
              border: isLeader ? '2px solid rgba(255,255,255,0.6)' : '2px solid rgba(255,255,255,0.4)',
              boxShadow: isLeader 
                ? '0 6px 16px -2px rgba(243, 112, 33, 0.6)' 
                : '0 6px 16px -2px rgba(0, 82, 156, 0.4)',
              flexShrink: 0,
            }}
          >
            {getInitials(member.fullName || member.email)}
          </Avatar>
        </motion.div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <Text strong style={{ fontSize: 16, color: isLeader ? (isDark ? '#FB923C' : '#D97706') : token.colorTextHeading, display: 'block', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {member.fullName || 'Thành viên'}
          </Text>
          <Text type="secondary" style={{ fontSize: 13, color: token.colorTextSecondary, display: 'block', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
            {member.email}
          </Text>
        </div>
      </div>

      {/* CỘT 2 (20% width): Vai trò trong đội (High-Contrast Solid Badge) */}
      <div style={{ flex: '0 0 20%', minWidth: 120 }}>
        {isLeader ? (
          <span
            style={{
              padding: '6px 14px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #FF6B00, #FF8C42)',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px -2px rgba(243, 112, 33, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <Crown size={14} /> TRƯỞNG NHÓM
          </span>
        ) : (
          <span
            style={{
              padding: '6px 14px',
              borderRadius: 10,
              background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
              color: token.colorTextHeading,
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Shield size={14} /> {member.roleLabel === 'MEMBER' ? 'Thành viên' : (member.roleLabel || 'Thành viên')}
          </span>
        )}
      </div>

      {/* CỘT 3 (24% width): Trạng thái sẵn sàng (Solid High-Contrast Jewel Badge) */}
      <div style={{ flex: '0 0 24%', minWidth: 150 }}>
        <span
          style={{
            padding: '6px 14px',
            borderRadius: 10,
            background: member.status === 'ACCEPTED'
              ? 'linear-gradient(135deg, #10B981, #059669)'
              : member.status === 'PENDING'
                ? 'linear-gradient(135deg, #FF8C42, #D97706)'
                : 'linear-gradient(135deg, #EF4444, #DC2626)',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: member.status === 'ACCEPTED' 
              ? '0 4px 12px -2px rgba(16, 185, 129, 0.5)' 
              : member.status === 'PENDING'
                ? '0 4px 12px -2px rgba(243, 112, 33, 0.5)'
                : '0 4px 12px -2px rgba(239, 68, 68, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
          }}
        >
          {getStatusIcon()} {getStatusText()}
        </span>
      </div>

      {/* CỘT 4 (18% width): Nút thao tác điều phối (High-Contrast Ruby CTA) */}
      <div style={{ flex: '0 0 18%', minWidth: 110, display: 'flex', justifyContent: 'flex-end' }}>
        {isPending && canCancelInvite && (
          <Tooltip title="Hủy lời mời gia nhập">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="text"
                danger
                size="small"
                icon={<UserMinus size={15} />}
                loading={loading}
                onClick={() => onCancelInvite(teamId, member.userId)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 800,
                  background: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#DC2626',
                  height: 34,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.15)',
                }}
              >
                Hủy mời
              </Button>
            </motion.div>
          </Tooltip>
        )}

        {!isPending && canKickMember && (
          <Tooltip title="Mời rời khỏi đội thi">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="text"
                danger
                size="small"
                icon={<UserMinus size={15} />}
                loading={loading}
                onClick={handleKickMember}
                style={{
                  padding: '6px 14px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 800,
                  background: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#DC2626',
                  height: 34,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.15)',
                }}
              >
                Rời đội
              </Button>
            </motion.div>
          </Tooltip>
        )}
      </div>
    </motion.div>
  );
};

export default TeamMemberCard;
