import { Card, Typography, Space, Tag } from 'antd';
import { CheckCircleFilled, ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const JudgeScoringChecklist = ({
  criteria = [],
  currentScores = {},
  hasScoredCurrentTeam = false,
  trackQueue = [],
  myScoredSubmissions = {},
  isFinal = false,
  localTimerPhase,
  canSubmitFinalScore = false,
}) => {
  const totalTeams = trackQueue.length;
  const scoredTeams = trackQueue.filter((item) => {
    const subId = String(item?.submissionId ?? item?.submission_id ?? item?.id ?? '');
    return myScoredSubmissions[subId] != null || item.status === 'DONE';
  }).length;

  const criteriaDone = criteria.filter(
    (c) => currentScores[c.id] !== undefined && currentScores[c.id] !== null,
  ).length;

  const timerReady = ['QA', 'ENDED'].includes(localTimerPhase);

  const items = [
    {
      key: 'round',
      label: `Vòng thi: ${isFinal ? 'Chung kết' : 'Sơ loại (1/2)'}`,
      done: true,
    },
    {
      key: 'progress',
      label: `Tiến độ chấm: ${scoredTeams}/${totalTeams || 0} đội`,
      done: totalTeams > 0 && scoredTeams === totalTeams,
    },
    {
      key: 'timer',
      label: timerReady ? 'Timer: sẵn sàng chốt điểm' : 'Timer: chờ Q&A / hết giờ',
      done: timerReady,
    },
    ...criteria.map((c) => ({
      key: `criteria-${c.id}`,
      label: c.name || c.type,
      done: currentScores[c.id] !== undefined && currentScores[c.id] !== null,
    })),
    {
      key: 'submit',
      label: hasScoredCurrentTeam ? 'Đã chốt điểm đội hiện tại' : 'Chưa chốt điểm đội hiện tại',
      done: hasScoredCurrentTeam,
      highlight: canSubmitFinalScore && !hasScoredCurrentTeam,
    },
  ];

  return (
    <Card
      title="Checklist chấm thi"
      size="small"
      style={{
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
      }}
      styles={{
        header: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
        body: { padding: '12px 16px' },
      }}
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        {items.map((item) => (
          <div
            key={item.key}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '6px 8px',
              borderRadius: 8,
              background: item.done ? '#f0fdf4' : item.highlight ? '#fffbeb' : '#fff',
              border: `1px solid ${item.done ? '#bbf7d0' : item.highlight ? '#fde68a' : '#f1f5f9'}`,
            }}
          >
            {item.done ? (
              <CheckCircleFilled style={{ color: '#16a34a', marginTop: 2 }} />
            ) : (
              <ClockCircleOutlined style={{ color: '#94a3b8', marginTop: 2 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13, color: item.done ? '#166534' : '#334155' }}>
                {item.label}
              </Text>
            </div>
          </div>
        ))}
        <Tag color={criteriaDone === criteria.length && criteria.length > 0 ? 'success' : 'processing'}>
          Tiêu chí: {criteriaDone}/{criteria.length}
        </Tag>
      </Space>
    </Card>
  );
};

export default JudgeScoringChecklist;
