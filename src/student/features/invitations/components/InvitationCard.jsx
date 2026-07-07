/**
 * Component: InvitationCard
 * Chức năng: Card hiển thị chi tiết một lời mời tham gia đội. Cho phép người dùng Chấp nhận hoặc Từ chối lời mời.
 * Thiết kế Siêu Cấp: Nổi bật, 3D Glassmorphism, tương phản mạnh, nút bấm xịn xò.
 */
import { Button, Space, Typography, theme, Avatar, Tag } from 'antd';
import { CheckCircle2, XCircle, Users, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const InvitationCard = ({ invitation, onAccept, onReject, loading = false }) => {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';
  const isPending = invitation.memberStatus === 'PENDING' || invitation.status === 'PENDING';

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4, boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.4)' : '0 20px 40px rgba(0, 82, 156, 0.15)' }}
      style={{
        height: '100%',
        padding: '24px',
        borderRadius: 24,
        background: isDark 
          ? (isPending ? 'linear-gradient(145deg, rgba(0, 82, 156, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)' : 'rgba(255,255,255,0.02)')
          : (isPending ? 'linear-gradient(145deg, #F0F9FF 0%, #FFFFFF 100%)' : '#F8FAFC'),
        border: `2px solid ${isPending ? (isDark ? 'rgba(0, 198, 255, 0.4)' : '#00C6FF') : (isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0')}`,
        boxShadow: isPending 
          ? (isDark ? '0 10px 30px rgba(0, 198, 255, 0.1)' : '0 10px 30px rgba(0, 198, 255, 0.15)')
          : 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 20,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Glow */}
      {isPending && (
        <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, background: 'radial-gradient(circle, rgba(0, 198, 255, 0.2) 0%, transparent 70%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
      )}

      {/* Header info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <Avatar
          size={56}
          style={{
            background: isPending ? 'linear-gradient(135deg, #00529C, #00C6FF)' : (isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1'),
            color: '#FFF',
            fontWeight: 900,
            fontSize: 18,
            boxShadow: isPending ? '0 8px 16px rgba(0, 198, 255, 0.4)' : 'none',
            border: '2px solid rgba(255,255,255,0.5)',
            flexShrink: 0,
          }}
        >
          {getInitials(invitation.teamName || 'Team')}
        </Avatar>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <Title level={4} style={{ margin: 0, fontWeight: 800, color: token.colorTextHeading, fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {invitation.teamName || 'Đội thi'}
            </Title>
            {!isPending && (
              <Tag color={invitation.memberStatus === 'ACCEPTED' ? 'success' : 'default'} style={{ margin: 0, fontWeight: 700, borderRadius: 6 }}>
                {invitation.memberStatus === 'ACCEPTED' ? 'Đã tham gia' : 'Đã từ chối'}
              </Tag>
            )}
            {isPending && (
              <Tag color="processing" icon={<Clock size={12} style={{ marginRight: 4 }} />} style={{ margin: 0, fontWeight: 700, borderRadius: 6, background: '#E0F2FE', color: '#0369A1', borderColor: '#BAE6FD' }}>
                Mới
              </Tag>
            )}
          </div>
          
          <Text style={{ fontSize: 13, color: token.colorTextSecondary, display: 'block', fontWeight: 600, marginTop: 4 }}>
            👑 Trưởng nhóm: <span style={{ color: token.colorTextHeading }}>{invitation.leaderName || invitation.leaderEmail}</span>
          </Text>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', padding: '4px 10px', borderRadius: 8 }}>
              <Users size={14} style={{ color: token.colorTextSecondary }} />
              <Text style={{ fontSize: 12, fontWeight: 700, color: token.colorTextSecondary }}>
                Thành viên: <span style={{ color: token.colorPrimary }}>{invitation.acceptedMemberCount || 1}/5</span>
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isPending && (
        <Space style={{ width: '100%', marginTop: 'auto' }}>
          <Button
            type="primary"
            onClick={() => onAccept?.(invitation)}
            loading={loading}
            style={{
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none',
              fontWeight: 800,
              fontSize: 14,
              color: '#FFF',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: 6,
            }}
          >
            <CheckCircle2 size={18} /> Đồng ý
          </Button>

          <Button
            danger
            onClick={() => onReject?.(invitation)}
            disabled={loading}
            style={{
              height: 44,
              borderRadius: 12,
              background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              fontWeight: 700,
              fontSize: 14,
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: 6,
            }}
          >
            <XCircle size={18} /> Từ chối
          </Button>
        </Space>
      )}
    </motion.div>
  );
};

export default InvitationCard;
