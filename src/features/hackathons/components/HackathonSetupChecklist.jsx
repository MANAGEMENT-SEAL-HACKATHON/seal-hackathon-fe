import { useMemo } from 'react';
import { Card, Steps, Typography } from 'antd';
import { CheckCircleFilled, ExclamationCircleFilled } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

const SETUP_STEPS = [
  { key: 'rounds', title: 'Vòng thi', tab: 'rounds', blockerMatch: (code) => code.includes('ROUND') },
  { key: 'tracks', title: 'Bảng đấu', tab: 'tracks', blockerMatch: () => false },
  { key: 'criteria', title: 'Tiêu chí', tab: 'criteria', blockerMatch: (code) => code.includes('CRITERIA') || code.includes('WEIGHT') },
  { key: 'people', title: 'Nhân sự', tab: 'people', blockerMatch: (code) => code.includes('PERSONNEL') || code.includes('JUDGE') || code.includes('MENTOR') },
  { key: 'events', title: 'Lịch trình', tab: 'events', blockerMatch: (code) => code.includes('SCHEDULE') || code.includes('EVENT') },
  { key: 'lottery', title: 'Bốc thăm', tab: 'lottery', blockerMatch: () => false },
  { key: 'review', title: 'Kiểm tra', tab: 'review', blockerMatch: () => false },
];

function hasBlockerForStep(blockers, step) {
  return (blockers || []).some((b) => step.blockerMatch((b.code || '').toUpperCase()));
}

function isStepComplete(step, { rounds, tracksCount, eventsCount, hackathon, readinessData, blockers }) {
  switch (step.key) {
    case 'rounds':
      return rounds.length > 0;
    case 'tracks':
      return tracksCount > 0;
    case 'criteria':
      return tracksCount > 0 && !hasBlockerForStep(blockers, step);
    case 'people':
      return tracksCount > 0 && !hasBlockerForStep(blockers, step);
    case 'events':
      return eventsCount > 0 || !hasBlockerForStep(blockers, step);
    case 'lottery': {
      if (!hackathon) return false;
      if (hackathon.registration_closed_early_at) return true;
      if (hackathon.registration_end && dayjs(hackathon.registration_end).isBefore(dayjs())) return true;
      return hackathon.status === 'ONGOING' || hackathon.status === 'FINISHED';
    }
    case 'review':
      return readinessData?.ready === true;
    default:
      return false;
  }
}

const HackathonSetupChecklist = ({
  rounds = [],
  tracksCount = 0,
  eventsCount = 0,
  hackathon,
  readinessData,
  onStepClick,
  direction = 'horizontal',
}) => {
  const blockers = readinessData?.blockers || [];

  const stepStatuses = useMemo(() => {
    const ctx = { rounds, tracksCount, eventsCount, hackathon, readinessData, blockers };
    const completes = SETUP_STEPS.map((step) => isStepComplete(step, ctx));
    const errors = SETUP_STEPS.map((step, index) => hasBlockerForStep(blockers, step) && !completes[index]);

    let processIndex = SETUP_STEPS.findIndex((_, i) => !completes[i] && !errors[i]);
    if (processIndex === -1) processIndex = SETUP_STEPS.length - 1;

    return SETUP_STEPS.map((step, index) => {
      if (errors[index]) return 'error';
      if (completes[index]) return 'finish';
      if (index === processIndex) return 'process';
      return 'wait';
    });
  }, [rounds, tracksCount, eventsCount, hackathon, readinessData, blockers]);

  const items = SETUP_STEPS.map((step, index) => {
    const status = stepStatuses[index];
    
    // Choose custom icon based on step status
    let iconElement;
    if (status === 'finish') {
      iconElement = (
        <div style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          boxShadow: '0 0 10px rgba(59, 130, 246, 0.5), inset 0 2px 4px rgba(255,255,255,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <CheckCircleFilled style={{ color: '#ffffff', fontSize: '12px' }} />
        </div>
      );
    } else if (status === 'process') {
      iconElement = (
        <div style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '2.5px solid #3b82f6',
          boxShadow: '0 0 12px rgba(59, 130, 246, 0.6), inset 0 0 6px rgba(59, 130, 246, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: '0 0 4px #3b82f6'
          }} />
        </div>
      );
    } else if (status === 'error') {
      iconElement = (
        <div style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
          boxShadow: '0 0 10px rgba(239, 68, 68, 0.5), inset 0 2px 4px rgba(255,255,255,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <ExclamationCircleFilled style={{ color: '#ffffff', fontSize: '12px' }} />
        </div>
      );
    } else {
      // wait status
      iconElement = (
        <div style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '2px'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#94a3b8'
          }} />
        </div>
      );
    }

    return {
      title: (
        <span
          role="button"
          tabIndex={0}
          onClick={() => onStepClick?.(step.tab)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onStepClick?.(step.tab);
          }}
          style={{ 
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: status === 'process' ? 700 : 600,
            color: status === 'process' ? '#0f172a' : '#475569',
          }}
        >
          {step.title}
        </span>
      ),
      description: status === 'error' ? (
        <Text type="danger" style={{ fontSize: 11, fontWeight: 500 }}>Cần xử lý</Text>
      ) : status === 'finish' ? (
        <Text type="success" style={{ fontSize: 11, fontWeight: 500 }}>Hoàn thành</Text>
      ) : status === 'process' ? (
        <Text style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>Tiếp theo</Text>
      ) : (
        <Text type="secondary" style={{ fontSize: 11 }}>Chưa bắt đầu</Text>
      ),
      status: status,
      icon: iconElement,
    };
  });

  const content = (
    <div className="custom-steps-container">
      <style>{`
        .custom-steps-container .ant-steps-item-tail::after {
          background-color: rgba(203, 213, 225, 0.4) !important;
          width: 2px !important;
          margin-left: 1px !important;
        }
        .custom-steps-container .ant-steps-item-finish .ant-steps-item-tail::after {
          background: linear-gradient(180deg, #3b82f6, #60a5fa) !important;
          width: 2px !important;
        }
        .custom-steps-container .ant-steps-item-title {
          line-height: 1.4 !important;
        }
        .custom-steps-container .ant-steps-item-description {
          margin-top: -2px !important;
          padding-bottom: 20px !important;
        }
        .custom-steps-container .ant-steps-item-container {
          display: flex;
          align-items: flex-start;
        }
      `}</style>
      <Steps size="small" direction={direction} items={items} />
      <div style={{ 
        marginTop: 20, 
        padding: '16px', 
        background: 'rgba(255, 255, 255, 0.35)', 
        borderRadius: '16px', 
        border: '1px solid rgba(255, 255, 255, 0.4)',
        fontSize: '12px',
        color: '#64748b',
        lineHeight: '1.6'
      }}>
        Lần lượt: tạo vòng thi → bảng đấu → tiêu chí chấm → gán mentor & giám khảo → lên lịch sự kiện →
        kiểm tra điều kiện → mở đăng ký. Bốc thăm chỉ làm sau khi đã mở đăng ký và hết hạn đăng ký.
      </div>
    </div>
  );

  if (direction === 'vertical') {
    return <div style={{ padding: '8px 4px' }}>{content}</div>;
  }

  return (
    <Card size="small" style={{ marginBottom: 16, borderRadius: 12 }} title="Tiến độ chuẩn bị kỳ thi">
      {content}
    </Card>
  );
};

export default HackathonSetupChecklist;
