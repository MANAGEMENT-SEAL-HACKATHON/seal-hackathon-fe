import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Space, Tag } from 'antd';
import { ClockCircleOutlined, LoginOutlined, AlertOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);
const { Title, Text } = Typography;

const ScoringCountdownCard = ({ activeAssignment, onEnterRoom }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!activeAssignment) return;

    // TODO: Thay bằng trường scoringDeadline thực tế từ Backend khi BE cập nhật API
    // Tạm thời giả lập: Sơ loại có 48h để chấm, Chung kết có 4h để chấm
    const isFinal = activeAssignment.role === 'FINAL_EXTERNAL' || activeAssignment.roundName?.includes('Chung kết');
    const mockDeadline = dayjs().add(isFinal ? 4 : 48, 'hour'); 
    
    const targetTime = activeAssignment.scoringDeadline ? dayjs(activeRound.scoringDeadline) : mockDeadline;

    const timer = setInterval(() => {
      const now = dayjs();
      if (now.isAfter(targetTime)) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
      } else {
        const diff = targetTime.diff(now);
        const durationObj = dayjs.duration(diff);
        setTimeLeft({
          days: Math.floor(durationObj.asDays()),
          hours: durationObj.hours(),
          minutes: durationObj.minutes(),
          seconds: durationObj.seconds()
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeAssignment]);

  if (!activeAssignment) {
    return (
      <Card style={{ borderRadius: 16, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <Space direction="vertical" align="center" style={{ width: '100%', padding: '24px 0' }}>
          <ClockCircleOutlined style={{ fontSize: 32, color: '#94a3b8' }} />
          <Text style={{ color: '#64748b' }}>Chưa có nhiệm vụ chấm điểm nào đang mở.</Text>
        </Space>
      </Card>
    );
  }

  const isFinal = activeAssignment.role === 'FINAL_EXTERNAL' || activeAssignment.roundName?.includes('Chung kết');

  return (
    <Card 
      style={{ 
        borderRadius: 16, 
        border: isExpired ? '1px solid #fca5a5' : '1px solid #bae0ff',
        background: isExpired ? '#fef2f2' : '#f0f8ff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
      }}
      styles={{ body: { padding: '24px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <Text style={{ color: isExpired ? '#ef4444' : '#1677ff', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {isFinal ? 'Chấm điểm Chung kết' : 'Chấm điểm Sơ loại'}
          </Text>
          <Title level={4} style={{ margin: '4px 0 0 0', color: '#1e293b' }}>
            {activeAssignment.trackName || activeAssignment.roundName || 'Phòng Chấm Thi'}
          </Title>
        </div>
        <Tag color={isExpired ? 'error' : 'processing'} style={{ margin: 0, borderRadius: 12 }}>
          {isFinal ? 'LIVE SCORING' : 'OFFLINE'}
        </Tag>
      </div>

      <div style={{ 
        background: '#fff', 
        padding: '16px', 
        borderRadius: 12, 
        border: '1px solid #e2e8f0',
        marginBottom: 20,
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          {isExpired ? <AlertOutlined style={{ color: '#ef4444', marginRight: 6 }} /> : <ClockCircleOutlined style={{ color: '#64748b', marginRight: 6 }} />}
          <Text style={{ color: isExpired ? '#ef4444' : '#64748b', fontWeight: 600, fontSize: 12 }}>
            {isExpired ? 'ĐÃ HẾT THỜI GIAN CHẤM ĐIỂM' : 'THỜI GIAN CÒN LẠI ĐỂ CHỐT ĐIỂM'}
          </Text>
        </div>

        {!isExpired && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            {timeLeft.days > 0 && (
              <>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#1677ff', lineHeight: 1 }}>{String(timeLeft.days).padStart(2, '0')}</div>
                  <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>NGÀY</Text>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#cbd5e1', marginTop: -2 }}>:</div>
              </>
            )}
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1677ff', lineHeight: 1 }}>{String(timeLeft.hours).padStart(2, '0')}</div>
              <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>GIỜ</Text>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#cbd5e1', marginTop: -2 }}>:</div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1677ff', lineHeight: 1 }}>{String(timeLeft.minutes).padStart(2, '0')}</div>
              <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>PHÚT</Text>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#cbd5e1', marginTop: -2 }}>:</div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fa8c16', lineHeight: 1 }}>{String(timeLeft.seconds).padStart(2, '0')}</div>
              <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>GIÂY</Text>
            </div>
          </div>
        )}
      </div>

      <Button 
        type="primary" 
        size="large" 
        block 
        icon={<LoginOutlined />}
        danger={isExpired}
        disabled={isExpired}
        onClick={() => onEnterRoom(activeAssignment)}
        style={{ height: 48, borderRadius: 8, fontWeight: 600, fontSize: 15 }}
      >
        {isExpired ? 'Đã khóa phòng chấm' : 'Vào Phòng Chấm Thi Ngay'}
      </Button>
      
      {!isFinal && (
        <Text style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 12, color: '#94a3b8' }}>
          * Vui lòng hoàn tất chấm điểm trước khi Chung kết diễn ra.
        </Text>
      )}
    </Card>
  );
};

export default ScoringCountdownCard;