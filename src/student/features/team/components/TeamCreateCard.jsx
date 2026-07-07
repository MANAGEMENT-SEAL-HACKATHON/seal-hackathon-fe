/**
 * Component: TeamCreateCard
 * Chức năng: Card giao diện chứa Form cho phép sinh viên tự thành lập một đội thi mới.
 * Cải tiến UI Siêu Cấp - "NỔI BẬT KHỎI BACKGROUND" (High-Contrast Luminous Gold Jewel Box):
 * - Thay thế nền trắng (#FFFFFF) chìm nghỉm bằng Nền Sunset Gold ấm áp (linear-gradient từ #FFF3E0 sang #FFE0B2).
 * - Viền cam đậm 2px (#FF8C42) và bóng đổ hào quang rực rỡ (0 20px 50px rgba(243, 112, 33, 0.3)), tách biệt hoàn toàn khỏi nền trang xám nhạt!
 * - Khung xem trước tên đội được nâng cấp thành Hộp Dark Slate (#1E293B) với chữ trắng rực rỡ, tạo độ tương phản đỉnh cao!
 */
import { useState } from 'react';
import { Button, Form, Input, Typography, theme, Modal } from 'antd';
import { motion } from 'framer-motion';
import { Rocket, Trophy, Sparkles, ShieldCheck, Flame } from 'lucide-react';

const { Text, Title } = Typography;

/* OFFICIAL FPT LOGO COLORS & CYBER PALETTE */
const FPT = {
  blue: '#00529C',
  orange: '#F37021',
  orangeLight: '#FF8C42',
  orangeDark: '#D9530F',
  green: '#46B749',
};

const TeamCreateCard = ({ hackathonId, hasTeams, onCreateTeam, loading }) => {
  const [form] = Form.useForm();
  const [teamNamePreview, setTeamNamePreview] = useState('');
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';

  const handleFinish = async (values) => {
    if (!hackathonId) return;

    if (hasTeams) {
      Modal.warning({
        title: 'Không thể tạo đội mới',
        content: 'Bạn hiện đang tham gia một đội thi khác. Vui lòng rời đội hiện tại nếu muốn tự thành lập một đội mới.',
        okText: 'Đã hiểu'
      });
      return;
    }
    const success = await onCreateTeam({
      hackathonId: hackathonId,
      teamName: values.teamName?.trim(),
    });
    if (success) {
      form.resetFields(['teamName']);
      setTeamNamePreview('');
    }
  };

  return (
    <div
      style={{
        height: '100%',
        borderRadius: 28,
        background: isDark
          ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.98) 100%)'
          : 'linear-gradient(145deg, #FFF8F0 0%, #FFFFFF 50%, #FFE8CC 100%)',
        border: `2px solid ${isDark ? 'rgba(255, 140, 66, 0.4)' : '#FF8C42'}`,
        boxShadow: isDark 
          ? '0 24px 50px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(243, 112, 33, 0.15)' 
          : '0 20px 48px -10px rgba(243, 112, 33, 0.28), 0 8px 24px -6px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(243, 112, 33, 0.2)',
        padding: '36px 36px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative Ambient Lighting */}
      <div style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, background: `radial-gradient(circle, rgba(243, 112, 33, 0.35) 0%, transparent 70%)`, filter: 'blur(35px)', pointerEvents: 'none' }} />

      <div>
        {/* Top Jewel Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24, position: 'relative', zIndex: 1 }}>
          {/* 3D Luminous Sunset Jewel Icon (56px) */}
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: `linear-gradient(135deg, #FF6B00 0%, #FFA800 100%)`,
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              boxShadow: `0 10px 24px -4px rgba(243, 112, 33, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.5)`,
              border: '2px solid rgba(255, 255, 255, 0.4)',
              flexShrink: 0,
              position: 'relative',
            }}
          >
            <Rocket size={28} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
            <div style={{ position: 'absolute', top: -3, right: -3, width: 14, height: 14, borderRadius: '50%', background: '#FFF', border: '2.5px solid #FF6B00', boxShadow: '0 0 8px #FFF' }} />
          </motion.div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ 
                fontSize: 11, 
                fontWeight: 800, 
                color: '#FFF', 
                textTransform: 'uppercase', 
                letterSpacing: '0.06em',
                background: 'linear-gradient(135deg, #FF6B00, #FF8C42)',
                padding: '4px 10px',
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(243, 112, 33, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}>
                <Flame size={12} /> TRẠM KHỞI TẠO CHIẾN ĐỘI
              </span>
            </div>
            <Title level={3} style={{ margin: 0, fontWeight: 900, color: token.colorTextHeading, fontSize: 26, letterSpacing: '-0.02em' }}>
              Thành Lập Đội Thi Mới
            </Title>
          </div>
        </div>

        <Text style={{ display: 'block', fontSize: 15, color: token.colorTextSecondary, lineHeight: 1.6, marginBottom: 28, fontWeight: 600, position: 'relative', zIndex: 1 }}>
          Tự đứng ra khởi tạo một đội mới và đảm nhận quyền Trưởng nhóm. Bạn sẽ có toàn quyền mời thành viên, đăng ký chủ đề và điều phối chiến thuật tham gia Hackathon.
        </Text>

        {/* Khung xem trước tên đội trực tiếp */}
        <motion.div
          animate={teamNamePreview ? { scale: [1, 1.008, 1], borderColor: ['#10B981', '#34D399', '#10B981'] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            padding: '18px 22px',
            borderRadius: 18,
            background: isDark 
              ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.95) 100%)' 
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 248, 240, 0.9) 100%)',
            border: `2px solid ${teamNamePreview ? '#10B981' : isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(243, 112, 33, 0.2)'}`,
            boxShadow: teamNamePreview ? '0 10px 24px -4px rgba(16, 185, 129, 0.4)' : isDark ? '0 8px 20px rgba(0,0,0,0.15)' : '0 8px 20px rgba(243, 112, 33, 0.1)',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
            <div style={{ 
              width: 44, 
              height: 44, 
              borderRadius: 14, 
              background: teamNamePreview ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255,255,255,0.1)', 
              color: '#fff', 
              display: 'grid', 
              placeItems: 'center', 
              flexShrink: 0,
              boxShadow: teamNamePreview ? '0 4px 12px rgba(16, 185, 129, 0.5)' : 'none',
              transition: 'all 0.3s ease',
              border: '1.5px solid rgba(255,255,255,0.3)'
            }}>
              <Trophy size={20} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: 800, display: 'block', letterSpacing: '0.05em', color: teamNamePreview ? '#10B981' : (isDark ? '#94A3B8' : token.colorTextSecondary) }}>
                TÊN CHIẾN ĐỘI HIỂN THỊ (XEM TRƯỚC)
              </Text>
              <Text strong style={{ fontSize: 18, color: isDark ? '#FFFFFF' : token.colorTextHeading, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800, marginTop: 2 }}>
                {teamNamePreview || 'Chưa nhập tên đội...'}
              </Text>
            </div>
          </div>

          {teamNamePreview ? (
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ padding: '6px 14px', borderRadius: 10, background: 'linear-gradient(135deg, #10B981, #059669)', color: '#FFF', fontSize: 12, fontWeight: 800, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, border: '1px solid rgba(255,255,255,0.3)' }}
            >
              <ShieldCheck size={14} /> ✔ HỢP LỆ
            </motion.span>
          ) : (
            <span style={{ padding: '6px 12px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', color: isDark ? '#CBD5E1' : token.colorTextTertiary, fontSize: 11, fontWeight: 700, flexShrink: 0, border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}` }}>
              ĐANG CHỜ
            </span>
          )}
        </motion.div>
      </div>

      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false} style={{ margin: 0, position: 'relative', zIndex: 1 }}>
        <Form.Item
          name="teamName"
          rules={[
            { required: true, message: 'Vui lòng nhập tên đội thi.' },
            { min: 3, message: 'Tên đội cần ít nhất 3 ký tự.' }
          ]}
          style={{ marginBottom: 24 }}
        >
          <Input
            placeholder="Nhập tên chiến đội của bạn (vd: Chiến Binh FPT)..."
            maxLength={50}
            size="large"
            onChange={(e) => setTeamNamePreview(e.target.value)}
            style={{
              height: 54,
              borderRadius: 16,
              fontSize: 16,
              fontWeight: 700,
              background: isDark ? 'rgba(0, 0, 0, 0.4)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#CBD5E1',
              boxShadow: isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.04)',
              padding: '0 20px',
              color: token.colorTextHeading,
            }}
          />
        </Form.Item>

        {/* Nút CTA "Thành Lập Chiến Đội Ngay" — High-Contrast Cyber Engine Design */}
        <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
            style={{
              height: 56,
              borderRadius: 16,
              fontWeight: 800,
              fontSize: 17,
              background: `linear-gradient(135deg, #FF6B00 0%, #FFA800 50%, #FF5E00 100%)`,
              backgroundSize: '200% 200%',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              boxShadow: `0 12px 28px -4px rgba(243, 112, 33, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.5)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              color: '#FFFFFF',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
          >
            <Rocket size={20} style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))' }} />
            <span>Thành Lập Chiến Đội Ngay</span>
            <Sparkles size={18} style={{ opacity: 0.9 }} />
          </Button>
        </motion.div>
      </Form>
    </div>
  );
};

export default TeamCreateCard;
