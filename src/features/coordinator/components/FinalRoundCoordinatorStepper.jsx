import { Link } from 'react-router-dom';
import { Card, Steps, Typography } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { ROUTES } from '../../../shared/constants/routes';
import {
  getProblemReleasedAt,
  isPresentationShuffled,
  isPresentationsComplete,
  isRoundActive,
  isScoringLocked,
  isSubmissionClosed,
} from '../../rounds/utils/roundLifecycleGates';

const { Text } = Typography;

/**
 * Coordinator playbook — Chung kết (round-scoped flags, đồng bộ GD3 gatekeeper).
 */
const FinalRoundCoordinatorStepper = ({
  hackathonId,
  prelimRoundId,
  finalRound,
  finalRoundId: finalRoundIdProp,
  finalActive = false,
  scoringLocked = false,
}) => {
  const finalRoundId = finalRound?.id ?? finalRoundIdProp;
  if (!hackathonId || !finalRoundId) return null;

  const active = finalRound ? isRoundActive(finalRound) : finalActive;
  const released = finalRound ? Boolean(getProblemReleasedAt(finalRound)) : false;
  const closed = finalRound ? isSubmissionClosed(finalRound) : false;
  const shuffled = finalRound ? isPresentationShuffled(finalRound) : false;
  const presentationsDone = finalRound ? isPresentationsComplete(finalRound) : false;
  const locked = finalRound ? isScoringLocked(finalRound) : scoringLocked;

  // 0 Đội đi tiếp | 1 Gán GK | 2 Kích hoạt | 3 Phát đề | 4 Close | 5 Shuffle | 6 Present | 7 Lock | 8 Trao giải
  let current = 0;
  if (prelimRoundId) current = 1;
  if (active) current = 2;
  if (released) current = 3;
  if (closed) current = 4;
  if (shuffled) current = 5;
  if (presentationsDone) current = 6;
  if (locked) current = 8;

  const prelimResultsUrl = prelimRoundId
    ? ROUTES.ROUND_RESULTS.replace(':hackathonId', String(hackathonId)).replace(
        ':roundId',
        String(prelimRoundId),
      )
    : null;
  // G5-K: deep-link Wild Card review trên trang Kết quả Sơ loại
  const wildcardReviewUrl = prelimResultsUrl ? `${prelimResultsUrl}?tab=wildcard` : null;
  const rosterUrl = prelimResultsUrl ? `${prelimResultsUrl}?tab=roster` : null;
  const queueUrl = `/presentation/queue?roundId=${finalRoundId}&from=final-config`;
  const peopleUrl = hackathonId ? `/hackathons/${hackathonId}/setup?tab=people` : ROUTES.HACKATHON_SETUP;
  const roundsUrl = `/hackathons/${hackathonId}/setup?tab=rounds&from=final-config`;
  const resultsUrl = `/hackathons/${hackathonId}/results`;

  const linkStyle = (enabled) => ({
    color: enabled ? '#38bdf8' : 'rgba(255,255,255,0.3)',
    fontSize: '11px',
    fontWeight: 500,
  });

  const stepData = [
    {
      title: 'Đội đi tiếp',
      desc: prelimResultsUrl ? (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Link to={prelimResultsUrl} style={linkStyle(current >= 0)}>
            Kết quả Sơ loại
          </Link>
          {rosterUrl && (
            <Link to={rosterUrl} style={linkStyle(current >= 0)}>
              Danh sách CK & Loại
            </Link>
          )}
          {wildcardReviewUrl && (
            <Link to={wildcardReviewUrl} style={linkStyle(current >= 0)}>
              Duyệt vé vớt
            </Link>
          )}
        </span>
      ) : (
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>Chưa có kết quả</Text>
      ),
    },
    {
      title: 'Gán giám khảo',
      desc: (
        <Link to={peopleUrl} style={linkStyle(current >= 1)}>
          Nhân sự
        </Link>
      ),
    },
    {
      title: 'Kích hoạt Vòng thi',
      desc: (
        <Text style={{ color: current >= 2 ? '#38bdf8' : 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
          Thực hiện tại trang này
        </Text>
      ),
    },
    {
      title: 'Phát đề',
      desc: (
        <a href={roundsUrl} target="_blank" rel="noopener noreferrer" style={linkStyle(current >= 3)}>
          {released ? 'Đã phát đề' : 'Quản lý vòng (tab mới)'}
        </a>
      ),
    },
    {
      title: 'Kết thúc sớm / hết hạn',
      desc: (
        <a href={roundsUrl} target="_blank" rel="noopener noreferrer" style={linkStyle(current >= 4)}>
          {closed ? 'Đã đóng vòng' : 'Quản lý vòng (tab mới)'}
        </a>
      ),
    },
    {
      title: 'Xáo hàng đợi',
      desc: closed ? (
        <a href={queueUrl} target="_blank" rel="noopener noreferrer" style={linkStyle(current >= 5)}>
          {shuffled ? 'Đã xáo' : 'Hàng đợi thuyết trình'}
        </a>
      ) : (
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>Sau khi đóng vòng</Text>
      ),
    },
    {
      title: 'Thuyết trình & chấm',
      desc: closed ? (
        <a href={queueUrl} target="_blank" rel="noopener noreferrer" style={linkStyle(current >= 6)}>
          {presentationsDone ? 'Đã hoàn tất' : 'Timer & chấm điểm'}
        </a>
      ) : (
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>Sau khi xáo hàng đợi</Text>
      ),
    },
    {
      title: 'Khóa chấm điểm',
      desc: (
        <a href={roundsUrl} target="_blank" rel="noopener noreferrer" style={linkStyle(current >= 7)}>
          {locked ? 'Đã khóa điểm' : 'Khóa chấm (tab mới)'}
        </a>
      ),
    },
    {
      title: 'Trao giải',
      desc: locked ? (
        <Link to={resultsUrl} style={linkStyle(current >= 8)}>
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
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
            boxShadow: '0 0 10px rgba(13, 148, 136, 0.6), inset 0 2px 4px rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <CheckCircleFilled style={{ color: '#ffffff', fontSize: '11px' }} />
        </div>
      );
    } else if (status === 'process') {
      iconElement = (
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '2.5px solid #3b82f6',
            boxShadow: '0 0 12px rgba(59, 130, 246, 0.8), inset 0 0 6px rgba(59, 130, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              boxShadow: '0 0 6px #3b82f6',
            }}
          />
        </div>
      );
    } else {
      iconElement = (
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1.5px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '2px',
          }}
        >
          <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 'bold' }}>
            {index + 1}
          </span>
        </div>
      );
    }

    return {
      title: (
        <span
          style={{
            fontSize: '13px',
            fontWeight: status === 'process' ? 700 : 500,
            color: status === 'process' ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
          }}
        >
          {step.title}
        </span>
      ),
      description: step.desc,
      status,
      icon: iconElement,
    };
  });

  return (
    <Card
      size="small"
      title={
        <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '14px' }}>
          Checklist vận hành — Chung kết
        </span>
      }
      style={{
        background: 'url("/Check-listCK.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        marginBottom: 16,
      }}
      headStyle={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '12px 16px',
      }}
      bodyStyle={{
        padding: '16px',
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
