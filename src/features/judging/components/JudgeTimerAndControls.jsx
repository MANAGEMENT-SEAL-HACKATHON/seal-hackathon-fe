import React, { useState } from 'react';
import { Card, Typography, Space, Button, Modal, Spin, Popconfirm, Divider } from 'antd';
import { 
  ClockCircleOutlined, GithubOutlined, FilePdfOutlined, TeamOutlined, 
  PlayCircleOutlined, PauseCircleOutlined, MessageOutlined, StepForwardOutlined,
  GlobalOutlined, ReloadOutlined
} from '@ant-design/icons';
import { judgeService } from '../services/judgeService';
import toast from 'react-hot-toast';
import { formatJudgeQueueTeamLabel } from '../utils/liveScoringUtils';

const { Title, Text } = Typography;

const JudgeTimerAndControls = ({ logic, isFinal }) => {
  const { activeSlot, presentingSlot, isLivePresentation, localTimerPhase, localRemainingSeconds, isController, handleTimerAction, isTimerActionLoading, canAdvanceToNext, presentationScoringStatus } = logic;
  const timerSlot = presentingSlot || activeSlot;
  const teamLabel = formatJudgeQueueTeamLabel(timerSlot);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const formatTimeMinutes = (secs) => Math.floor(Math.max(0, secs) / 60).toString().padStart(2, '0');
  const formatTimeSeconds = (secs) => (Math.max(0, secs) % 60).toString().padStart(2, '0');

  const displaySeconds =
    localTimerPhase === 'IDLE' || localTimerPhase === 'SETUP'
      ? localRemainingSeconds > 0
        ? localRemainingSeconds
        : (() => {
            const t = timerSlot?.timer;
            const mins = t?.presentationMinutes ?? t?.presentation_minutes;
            return (mins != null ? Number(mins) : 10) * 60;
          })()
      : localRemainingSeconds;

  const getTimerStyles = () => {
    switch(localTimerPhase) {
      case 'PRESENTING': return { bg: '#dcfce7', border: '#86efac', color: '#16a34a', text: 'THỜI GIAN THUYẾT TRÌNH' };
      case 'QA': return { bg: '#fef3c7', border: '#fde68a', color: '#d97706', text: 'PHẦN HỎI ĐÁP Q&A' };
      case 'ENDED': return { bg: '#fee2e2', border: '#fca5a5', color: '#dc2626', text: 'ĐÃ HẾT GIỜ' };
      case 'PAUSED': return { bg: '#f1f5f9', border: '#94a3b8', color: '#475569', text: 'ĐÃ TẠM DỪNG' };
      default: return { bg: '#f1f5f9', border: '#cbd5e1', color: '#64748b', text: 'ĐANG CHỜ' };
    }
  };

  const timerStyle = getTimerStyles();

  const handleViewPdf = async () => {
    if (!timerSlot?.submissionId) return;
    setPdfModalOpen(true);
    setLoadingPdf(true);
    try {
      const blob = await judgeService.getSubmissionSlide(timerSlot.submissionId);
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      setPdfUrl(url);
    } catch (error) {
      setPdfModalOpen(false);
      toast.error(error?.response?.data?.error?.message || "Đội thi chưa nộp File PDF hợp lệ.");
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
      
      {/* ĐỒNG HỒ */}
      <Card style={{ borderRadius: 20, border: `2px solid ${timerStyle.border}`, background: timerStyle.bg, textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.03)' }} styles={{ body: { padding: '28px 20px' } }}>
        <Space align="center" style={{ marginBottom: 16 }}>
          <ClockCircleOutlined style={{ color: timerStyle.color, fontSize: 18 }} />
          <Text strong style={{ color: timerStyle.color, letterSpacing: 0.5, fontSize: 13 }}>{timerStyle.text}</Text>
        </Space>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <div style={{ background: '#fff', padding: '16px 0', borderRadius: 16, border: `1px solid ${timerStyle.border}`, width: 85, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: 38, fontWeight: 900, fontFamily: 'monospace', color: timerStyle.color, lineHeight: 1 }}>{formatTimeMinutes(displaySeconds)}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', marginTop: 8 }}>PHÚT</div>
          </div>
          <div style={{ background: '#fff', padding: '16px 0', borderRadius: 16, border: `1px solid ${timerStyle.border}`, width: 85, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: 38, fontWeight: 900, fontFamily: 'monospace', color: timerStyle.color, lineHeight: 1 }}>{formatTimeSeconds(displaySeconds)}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', marginTop: 8 }}>GIÂY</div>
          </div>
        </div>
      </Card>

      {/* ĐIỀU KHIỂN CỦA TRƯỞNG BAN */}
      {isController && presentingSlot && (
        <Card style={{ borderRadius: 20, border: '2px solid #bae0ff', background: '#e6f4ff', boxShadow: '0 8px 24px rgba(22, 119, 255, 0.08)' }} styles={{ body: { padding: 20 } }}>
          <Text style={{ color: '#0958d9', fontSize: 12, fontWeight: 800, letterSpacing: 1, display: 'block', marginBottom: 16, textAlign: 'center' }}>
            ĐIỀU KHIỂN TIMER
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            
            {(localTimerPhase === 'IDLE' || localTimerPhase === 'SETUP') && (
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => handleTimerAction('START_OR_RESUME')} loading={isTimerActionLoading} style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 800, minHeight: 48, borderRadius: 10, fontSize: 15 }}>
                Bắt Đầu Tính Giờ
              </Button>
            )}

            {localTimerPhase === 'PAUSED' && (
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => handleTimerAction('START_OR_RESUME')} loading={isTimerActionLoading} style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 800, minHeight: 48, borderRadius: 10, fontSize: 15 }}>
                Tiếp Tục Đồng Hồ
              </Button>
            )}

            {(localTimerPhase === 'PRESENTING' || localTimerPhase === 'QA') && localRemainingSeconds > 0 && (
              <Button icon={<PauseCircleOutlined />} onClick={() => handleTimerAction('PAUSE')} loading={isTimerActionLoading} style={{ fontWeight: 800, minHeight: 48, borderRadius: 10, fontSize: 15, border: '2px solid #10b981', color: '#10b981' }}>
                Tạm Dừng
              </Button>
            )}

            {localTimerPhase === 'PRESENTING' && localRemainingSeconds > 0 && (
              <Button type="primary" icon={<MessageOutlined />} onClick={() => handleTimerAction('QA')} loading={isTimerActionLoading} style={{ color: '#fff', background: '#dc2626', borderColor: '#dc2626', fontWeight: 800, minHeight: 48, borderRadius: 10, fontSize: 15 }}>
                Kết thúc sớm thuyết trình
              </Button>
            )}

            {localTimerPhase === 'PRESENTING' && localRemainingSeconds === 0 && (
              <Button type="primary" icon={<MessageOutlined />} onClick={() => handleTimerAction('QA')} loading={isTimerActionLoading} style={{ color: '#fff', background: '#d97706', borderColor: '#d97706', fontWeight: 800, minHeight: 48, borderRadius: 10, fontSize: 15 }}>
                Chuyển sang Hỏi Đáp
              </Button>
            )}

            {/* NÚT MỚI: KẾT THÚC SỚM Q&A */}
            {localTimerPhase === 'QA' && localRemainingSeconds > 0 && (
              <Popconfirm 
                title="Kết thúc Hỏi Đáp ngay lập tức?" 
                description="Đồng hồ sẽ về 00:00 để Giám khảo chốt điểm."
                onConfirm={() => handleTimerAction('END')} 
                okText="Kết thúc" 
                cancelText="Hủy" 
                okButtonProps={{ danger: true }}
              >
                <Button 
                  type="primary" 
                  icon={<StepForwardOutlined />} 
                  loading={isTimerActionLoading} 
                  style={{ color: '#fff', background: '#dc2626', borderColor: '#dc2626', fontWeight: 800, minHeight: 48, borderRadius: 10, fontSize: 15, width: '100%' }}
                >
                  Kết thúc sớm Hỏi Đáp
                </Button>
              </Popconfirm>
            )}

            {canAdvanceToNext && (
              <Popconfirm title="Chốt sổ và gọi đội kế tiếp?" onConfirm={() => handleTimerAction('NEXT')} okText="Chuyển đội" cancelText="Hủy" okButtonProps={{ danger: true }}>
                <Button type="primary" danger icon={<StepForwardOutlined />} loading={isTimerActionLoading} style={{ fontWeight: 800, width: '100%', marginTop: 8, minHeight: 48, borderRadius: 10, fontSize: 15 }}>
                  Kết Thúc & Gọi Đội Kế Tiếp
                </Button>
              </Popconfirm>
            )}

            {localTimerPhase !== 'IDLE' && localTimerPhase !== 'SETUP' && (
              <Popconfirm
                title="Reset timer về trạng thái chờ?"
                description="Slot đang thuyết trình sẽ về IDLE. Chỉ dùng khi điều phối nhầm."
                onConfirm={() => handleTimerAction('RESET')}
                okText="Reset"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button
                  icon={<ReloadOutlined />}
                  loading={isTimerActionLoading}
                  style={{ fontWeight: 700, width: '100%', minHeight: 44, borderRadius: 10 }}
                >
                  Reset Timer
                </Button>
              </Popconfirm>
            )}

            {!canAdvanceToNext &&
              (presentationScoringStatus?.judgesAssigned ?? 0) >= 2 &&
              (localTimerPhase === 'QA' || localTimerPhase === 'ENDED') && (
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', fontSize: 12, lineHeight: 1.5 }}>
                Chờ tất cả giám khảo Chốt điểm (
                {presentationScoringStatus?.judgesConfirmed ?? 0}/{presentationScoringStatus?.judgesAssigned})
                trước khi chuyển đội tiếp theo.
              </Text>
            )}

          </div>
        </Card>
      )}

      {/* THÔNG TIN DỰ ÁN */}
      <Card title={<><TeamOutlined /> Thông Tin Dự Án</>} style={{ borderRadius: 20, flex: 1, boxShadow: '0 8px 24px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }} styles={{ header: { background: '#f8fafc', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}}>
        {timerSlot ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: 12 }}>
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>Mã Ẩn Danh</Text>
              <Title level={4} style={{ margin: '4px 0 0 0', color: '#0f172a' }}>
                {teamLabel}
              </Title>
            </div>
            
            <Divider style={{ margin: 0 }} />
            
            <Button type="primary" ghost block icon={<FilePdfOutlined />} onClick={handleViewPdf} style={{ minHeight: 44, height: 'auto', whiteSpace: 'normal', borderRadius: 10, fontWeight: 700, borderColor: '#ef4444', color: '#ef4444', background: '#fef2f2' }}>
              Mở Tài Liệu PDF (Slide)
            </Button>
            
            {/* 🚀 NÚT BẤM HIỂN THỊ LINK DEMO MỚI BỔ SUNG */}
            <Button 
              block 
              icon={<GlobalOutlined />} 
              disabled={!timerSlot.demoUrl} 
              onClick={() => window.open(timerSlot.demoUrl, '_blank')} 
              style={{ 
                minHeight: 44, height: 'auto', whiteSpace: 'normal', borderRadius: 10, fontWeight: 700, 
                background: timerSlot.demoUrl ? '#0284c7' : '#f1f5f9', 
                color: timerSlot.demoUrl ? '#fff' : '#94a3b8', 
                border: 'none' 
              }}
            >
              {timerSlot.demoUrl ? 'Xem Bản Demo (Live)' : 'Không Có Bản Demo'}
            </Button>

            <Button block icon={<GithubOutlined />} disabled={!timerSlot.repoUrl} onClick={() => window.open(timerSlot.repoUrl, '_blank')} style={{ minHeight: 44, height: 'auto', whiteSpace: 'normal', borderRadius: 10, fontWeight: 700, background: '#0f172a', color: '#fff', border: 'none' }}>
              Xem Source Code (GitHub)
            </Button>

          </div>
        ) : (
          <Text type="secondary">Chưa có đội đang thi.</Text>
        )}
      </Card>

      <Modal title="Tài liệu thuyết trình (Slide PDF)" open={pdfModalOpen} onCancel={() => setPdfModalOpen(false)} footer={null} width={1000} style={{ top: 20 }}>
        <div style={{ height: '75vh', background: '#f0f2f5', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
          {loadingPdf ? <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}><Spin size="large" /></div> : pdfUrl && <iframe src={`${pdfUrl}#toolbar=0`} width="100%" height="100%" style={{ border: 'none' }} />}
        </div>
      </Modal>
    </div>
  );
};

export default JudgeTimerAndControls;