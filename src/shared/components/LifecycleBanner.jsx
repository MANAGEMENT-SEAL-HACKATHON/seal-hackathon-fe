import React from 'react';
import { Alert, Button, Space } from 'antd';
import { Link } from 'react-router-dom';

/**
 * Map hackathon/round state → product lifecycle phase + per-role CTA.
 * @param {'STUDENT'|'COORDINATOR'|'JUDGE'|'MENTOR'} role
 */
export function resolveLifecyclePhase({ hackathonStatus, round, scoringLocked, isPublished } = {}) {
  const status = String(hackathonStatus || '').toUpperCase();
  if (status === 'FINISHED') {
    return { phase: 'FINISHED', label: 'Đã kết thúc' };
  }
  if (status === 'PENDING_CONFIRM' || (scoringLocked && isPublished)) {
    return { phase: 'SUMMARIZING', label: 'Đang tổng kết' };
  }
  if (status === 'ONGOING' || status === 'ACTIVE') {
    return { phase: 'ONGOING', label: 'Đang diễn ra' };
  }
  if (status === 'DRAFT' || !status) {
    return { phase: 'DRAFT', label: 'Chưa mở' };
  }
  return { phase: status, label: status };
}

const CTA = {
  STUDENT: {
    DRAFT: { text: 'Chờ sự kiện mở đăng ký', to: null },
    ONGOING: { text: 'Nộp bài / xem đề', to: '/student/submissions' },
    SUMMARIZING: { text: 'Xem kết quả sơ loại', to: '/student/results' },
    FINISHED: { text: 'Xem bảng xếp hạng & giải', to: '/student/results' },
  },
  COORDINATOR: {
    DRAFT: { text: 'Thiết lập vòng thi', to: '/rounds' },
    ONGOING: { text: 'Quản lý nộp bài / hàng đợi', to: '/presentation/queue' },
    SUMMARIZING: { text: 'Khóa chấm / công bố / chuyển vòng', to: '/rounds' },
    FINISHED: { text: 'Xuất CSV & giải thưởng', to: '/hackathons' },
  },
  JUDGE: {
    DRAFT: { text: 'Chờ phân công chấm', to: null },
    ONGOING: { text: 'Vào phòng chấm live', to: '/judge/live-scoring' },
    SUMMARIZING: { text: 'Chấm đã khóa — xem tổng kết', to: '/judge/live-scoring' },
    FINISHED: { text: 'Sự kiện đã kết thúc', to: null },
  },
  MENTOR: {
    DRAFT: { text: 'Chờ sự kiện mở', to: null },
    ONGOING: { text: 'Theo dõi đội / bài nộp', to: '/mentor' },
    SUMMARIZING: { text: 'Xem kết quả đội', to: '/mentor' },
    FINISHED: { text: 'Xem kết quả chính thức', to: '/mentor' },
  },
};

export default function LifecycleBanner({
  role = 'STUDENT',
  hackathonStatus,
  scoringLocked,
  isPublished,
  style,
}) {
  const { phase, label } = resolveLifecyclePhase({
    hackathonStatus,
    scoringLocked,
    isPublished,
  });
  const cta = CTA[role]?.[phase] || CTA[role]?.ONGOING;

  return (
    <Alert
      showIcon
      type={phase === 'FINISHED' ? 'success' : phase === 'SUMMARIZING' ? 'warning' : 'info'}
      style={{ marginBottom: 16, ...style }}
      message={`Trạng thái sự kiện: ${label}`}
      description={
        <Space>
          <span>{cta?.text}</span>
          {cta?.to ? (
            <Link to={cta.to}>
              <Button size="small" type="link">
                Đi →
              </Button>
            </Link>
          ) : null}
        </Space>
      }
    />
  );
}
