import { Link } from 'react-router-dom';
import { Card, Steps, Typography } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { ROUTES } from '../../../shared/constants/routes';

const { Text } = Typography;

/**
 * Coordinator playbook for final round operations.
 */
const FinalRoundCoordinatorStepper = ({
  hackathonId,
  prelimRoundId,
  finalRoundId,
  finalActive = false,
  scoringLocked = false,
}) => {
  if (!hackathonId || !finalRoundId) return null;

  let current = 0;
  if (prelimRoundId) current = 1;
  if (finalActive) current = 3;
  if (scoringLocked) current = 6;

  const prelimResultsUrl = prelimRoundId
    ? ROUTES.ROUND_RESULTS.replace(':hackathonId', String(hackathonId)).replace(
        ':roundId',
        String(prelimRoundId),
      )
    : null;
  const queueUrl = `/presentation/queue?roundId=${finalRoundId}`;
  const peopleUrl = hackathonId ? `/hackathons/${hackathonId}/setup?tab=people` : ROUTES.HACKATHON_SETUP;
  const roundsUrl = hackathonId ? `/hackathons/${hackathonId}/rounds` : ROUTES.ROUNDS;
  const resultsUrl = `/hackathons/${hackathonId}/results`;

  const stepData = [
    {
      title: 'Đội đi tiếp',
      desc: prelimResultsUrl ? (
        <Link to={prelimResultsUrl} style={{ color: current >= 0 ? '#38bdf8' : 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 500 }}>
          Kết quả Sơ loại
        </Link>
      ) : (
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>Chưa có kết quả</Text>
      ),
    },
    {
      title: 'Gán giám khảo',
      desc: (
        <Link to={peopleUrl} style={{ color: current >= 1 ? '#38bdf8' : 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 500 }}>
          Nhân sự
        </Link>
      ),
    },
    {
      title: 'Kích hoạt Vòng thi',
      desc: <Text style={{ color: current >= 2 ? '#38bdf8' : 'rgba(255,255,255,0.3)', fontSize: '11px' }}>Thực hiện tại trang này</Text>,
    },
    {
      title: 'Hiệu chuẩn điểm',
      desc: <Text style={{ color: current >= 3 ? '#38bdf8' : 'rgba(255,255,255,0.3)', fontSize: '11px' }}>Phiên chuẩn hóa</Text>,
    },
    {
      title: 'Hàng đợi & Timer',
      desc: (
        <Link to={queueUrl} style={{ color: current >= 4 ? '#38bdf8' : 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 500 }}>
          Hàng đợi thuyết trình
        </Link>
      ),
    },
    {
      title: 'Khóa chấm điểm',
      desc: (
        <Link to={roundsUrl} style={{ color: current >= 5 ? '#38bdf8' : 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 500 }}>
          {scoringLocked ? 'Đã khóa điểm' : 'Khóa chấm'}
        </Link>
      ),
    },
    {
      title: 'Trao giải',
      desc: scoringLocked ? (
        <Link to={resultsUrl} style={{ color: current >= 6 ? '#38bdf8' : 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 500 }}>
          Kết quả chung cuộc
        </Link>
      ) : (
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>Sau khi khóa chấm</Text>
      ),
    },
  ];

  const items = stepData.map((step, index) => {
    let status = 'wait';
    if (index < current) status = 'finish';
    else if (index === current) status = 'process';

    let iconElement;
    if (status === 'finish') {
      iconElement = (
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
          boxShadow: '0 0 10px rgba(13, 148, 136, 0.6), inset 0 2px 4px rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <CheckCircleFilled style={{ color: '#ffffff', fontSize: '11px' }} />
        </div>
      );
    } else if (status === 'process') {
      iconElement = (
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'rgba(59, 130, 246, 0.15)',
          border: '2.5px solid #3b82f6',
          boxShadow: '0 0 12px rgba(59, 130, 246, 0.8), inset 0 0 6px rgba(59, 130, 246, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: '0 0 6px #3b82f6'
          }} />
        </div>
      );
    } else {
      iconElement = (
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1.5px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '2px'
        }}>
          <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 'bold' }}>
            {index + 1}
          </span>
        </div>
      );
    }

    return {
      title: (
        <span style={{ 
          fontSize: '13px',
          fontWeight: status === 'process' ? 700 : 500,
          color: status === 'process' ? '#ffffff' : 'rgba(255, 255, 255, 0.75)'
        }}>
          {step.title}
        </span>
      ),
      description: step.desc,
      status: status,
      icon: iconElement,
    };
  });

  return (
    <Card 
      size="small" 
      title={<span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '14px' }}>Checklist vận hành — Chung kết</span>}
      style={{
        background: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        marginBottom: 16,
      }}
      headStyle={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '12px 16px'
      }}
      bodyStyle={{
        padding: '16px'
      }}
    >
      <div className="dark-steps-container">
        <style>{`
          .dark-steps-container .ant-steps-item-tail::after {
            background-color: rgba(255, 255, 255, 0.15) !important;
            height: 2px !important;
          }
          .dark-steps-container .ant-steps-item-finish .ant-steps-item-tail::after {
            background: linear-gradient(90deg, #0d9488, #3b82f6) !important;
            height: 2px !important;
          }
          .dark-steps-container .ant-steps-item-process .ant-steps-item-tail::after {
            background: linear-gradient(90deg, #3b82f6, rgba(255, 255, 255, 0.15)) !important;
            height: 2px !important;
          }
          .dark-steps-container .ant-steps-item-title {
            line-height: 1.4 !important;
          }
        `}</style>
        <Steps size="small" items={items} />
      </div>
    </Card>
  );
};

export default FinalRoundCoordinatorStepper;
