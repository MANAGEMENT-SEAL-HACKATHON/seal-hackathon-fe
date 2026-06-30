// src/features/judging/components/JudgeSidebarQueue.jsx
import React from 'react';
import { Card, Typography, List, Tag } from 'antd';
import { PlayCircleOutlined, CheckCircleFilled, ClockCircleOutlined } from '@ant-design/icons';
import { formatJudgeQueueTeamLabel } from '../utils/liveScoringUtils';

const { Text } = Typography;

const getSubmissionId = (item) => item?.submissionId ?? item?.submission_id ?? item?.id;

const JudgeSidebarQueue = ({
  queue,
  activeSlot,
  selectedSubmissionId,
  myScores = {},
}) => {
  return (
    <Card
      title={
        <span style={{ fontSize: 16 }}>
          <ClockCircleOutlined /> Lịch trình ({queue?.length || 0})
        </span>
      }
      style={{
        borderRadius: 20,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: 'none',
        boxShadow: '0 8px 24px rgba(0,0,0,0.02)',
      }}
      styles={{
        header: {
          background: '#f8fafc',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderBottom: '1px solid #e2e8f0',
          padding: '16px 20px',
        },
        body: { padding: 0, overflowY: 'auto', flex: 1, background: '#fff' },
      }}
    >
      <List
        dataSource={queue || []}
        renderItem={(item) => {
          const subId = getSubmissionId(item);
          const isSelected =
            String(subId) === String(selectedSubmissionId || getSubmissionId(activeSlot));
          const isPresenting = item.status === 'PRESENTING';
          const isDone = item.status === 'DONE';
          const myPersonalScore = myScores[String(subId)];
          const teamLabel = formatJudgeQueueTeamLabel(item);

          return (
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f1f5f9',
                background: isSelected ? '#eff6ff' : isDone ? '#f8fafc' : '#fff',
                borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                transition: 'all 0.3s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <Text
                    strong
                    style={{
                      fontSize: 14,
                      color: isSelected ? '#1d4ed8' : isDone ? '#94a3b8' : '#1e293b',
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}
                  >
                    {item.order}. {teamLabel}
                  </Text>
                </div>

                <div style={{ flexShrink: 0 }}>
                  {myPersonalScore ? (
                    <Tag
                      style={{
                        borderRadius: 6,
                        fontWeight: 800,
                        padding: '2px 8px',
                        margin: 0,
                        fontSize: 12,
                        background: '#dcfce7',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      ĐIỂM: {myPersonalScore}
                    </Tag>
                  ) : isPresenting ? (
                    <Tag
                      color="blue"
                      icon={<PlayCircleOutlined />}
                      style={{ borderRadius: 6, fontWeight: 700, margin: 0, fontSize: 11 }}
                    >
                      LIVE
                    </Tag>
                  ) : isDone ? (
                    <CheckCircleFilled style={{ color: '#10b981', fontSize: 16 }} />
                  ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <ClockCircleOutlined /> Chờ
                    </Text>
                  )}
                </div>
              </div>
            </div>
          );
        }}
      />
    </Card>
  );
};

export default JudgeSidebarQueue;
