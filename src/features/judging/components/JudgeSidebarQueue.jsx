import React from 'react';
import { Card, Typography, List, Tag } from 'antd';
import { CheckCircleFilled, ClockCircleOutlined } from '@ant-design/icons';
import { formatJudgeQueueTeamLabel } from '../utils/liveScoringUtils';
// Đồng đội của bạn đã tạo Component LiveRecordIndicator cực xịn!
import LiveRecordIndicator from '../../../shared/components/ui/LiveRecordIndicator';

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
          // TASK 22: Giữ lại thuộc tính ghim cứng Header của chúng ta
          position: 'sticky',
          top: 0,
          zIndex: 2,
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
          
          // Logic Upstream: Quản lý biến rõ ràng cho TASK 20
          const isScored = Boolean(myPersonalScore) || isDone;
          const isUnscored = !isScored && !isPresenting;
          const teamLabel = formatJudgeQueueTeamLabel(item);

          // Xử lý background color theo trạng thái
          let rowBackground = '#fff';
          let rowBorder = '4px solid transparent';
          if (isSelected) {
            rowBackground = '#eff6ff';
            rowBorder = '4px solid #2563eb';
          } else if (isScored) {
            rowBackground = '#f0fdf4';
            rowBorder = '4px solid #22c55e';
          } else if (isUnscored) {
            rowBackground = '#fef2f2';
            rowBorder = '4px solid #fca5a5';
          } else if (isPresenting) {
            rowBackground = '#fff7ed';
            rowBorder = '4px solid #fb923c';
          }

          return (
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f1f5f9',
                background: rowBackground,
                borderLeft: rowBorder,
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
                      color: isSelected
                        ? '#1d4ed8'
                        : isScored
                          ? '#166534'
                          : isUnscored
                            ? '#b91c1c'
                            : '#1e293b',
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
                    // TASK 18: Dùng component LiveRecordIndicator của đồng đội
                    <Tag
                      style={{
                        borderRadius: 6,
                        fontWeight: 700,
                        margin: 0,
                        fontSize: 11,
                        background: '#fef2f2',
                        color: '#b91c1c',
                        border: '1px solid #fecaca',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <LiveRecordIndicator size={8} />
                      LIVE
                    </Tag>
                  ) : isDone ? (
                    <CheckCircleFilled style={{ color: '#10b981', fontSize: 16 }} />
                  ) : (
                    <Tag
                      color="error"
                      style={{ borderRadius: 6, fontWeight: 700, margin: 0, fontSize: 11 }}
                    >
                      Chưa chấm
                    </Tag>
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