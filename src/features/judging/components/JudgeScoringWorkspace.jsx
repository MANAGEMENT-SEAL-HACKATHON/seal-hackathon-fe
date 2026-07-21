// src/features/judging/components/JudgeScoringWorkspace.jsx
import {
  Card,
  Typography,
  Row,
  Col,
  Space,
  Tag,
  InputNumber,
  Slider,
  Input,
  Button,
  Result,
  Alert,
  Collapse,
} from 'antd';
import {
  SaveOutlined,
  LockOutlined,
  InfoCircleOutlined,
  EditOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { shouldWarnQaScoringDeadline } from '../utils/timerControlGates';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const JudgeScoringWorkspace = ({ logic }) => {
  const {
    criteria,
    currentScores,
    comment,
    setComment,
    handleScoreChange,
    calculateTotal,
    submitScore,
    isSubmitting,
    canScore,
    localTimerPhase,
    localRemainingSeconds,
    canSubmitFinalScore,
    hasScoredCurrentTeam,
    myScoredSubmissions,
    activeSlot,
    isAllDone,
    scoringLocked,
    isFinal,
    isLivePresentation,
    hasPresentationQueue,
    isController,
  } = logic;

  const warnQaDeadline = shouldWarnQaScoringDeadline({
    localTimerPhase,
    localRemainingSeconds,
    hasScoredCurrentTeam,
    qaMinutes: activeSlot?.timer?.qaMinutes ?? activeSlot?.timer?.qa_minutes ?? 3,
  });
  const qaMinutesLeft = Math.max(0, Math.ceil((Number(localRemainingSeconds) || 0) / 60));

  if (scoringLocked) {
    return (
      <Card
        style={{
          borderRadius: 20,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #e2e8f0',
          background: '#fff',
        }}
      >
        <Alert
          type="warning"
          showIcon
          message="Vòng đã khóa chấm điểm"
          description="Coordinator đã khóa chấm điểm vòng này. Bạn không thể nộp hoặc chỉnh sửa điểm."
          style={{ maxWidth: 480 }}
        />
      </Card>
    );
  }

  if (isAllDone) {
    return (
      <Card
        style={{
          borderRadius: 20,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #e2e8f0',
          background: '#fff',
        }}
      >
        <Result
          status="success"
          title={
            <Title level={3} style={{ color: '#10b981', margin: 0 }}>
              Hoàn Tất Chấm Thi!
            </Title>
          }
          subTitle={
            <Text style={{ fontSize: 14, color: '#64748b' }}>
              Bạn đã đánh giá xong tất cả các dự án. Cảm ơn sự cống hiến của bạn!
            </Text>
          }
        />
      </Card>
    );
  }

  if (!canScore) {
    return (
      <Card
        style={{
          borderRadius: 20,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #e2e8f0',
          background: '#fff',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <LockOutlined style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 16 }} />
          <Title level={4} style={{ color: '#475569' }}>
            {!hasPresentationQueue && isFinal
              ? 'Chưa mở lịch trình thuyết trình'
              : 'Sân khấu đang trống'}
          </Title>
          <Text style={{ color: '#94a3b8', fontSize: 14 }}>
            {!hasPresentationQueue && isFinal
              ? 'Coordinator cần bốc thăm và gọi đội lên sân khấu trước khi bạn chấm điểm.'
              : 'Vui lòng chờ điều phối timer gọi đội lên sân khấu.'}
          </Text>
        </div>
      </Card>
    );
  }

  const isSetup =
    isLivePresentation && (localTimerPhase === 'SETUP' || localTimerPhase === 'IDLE');
  const finalCalculatedScore = hasScoredCurrentTeam
    ? myScoredSubmissions[String(activeSlot?.submissionId)]
    : calculateTotal();

  const statusTagLabel = hasScoredCurrentTeam
    ? 'Đã hoàn thành đánh giá'
    : canSubmitFinalScore
      ? 'Đã cho phép Chốt Điểm'
      : 'Đang trong thời gian thuyết trình...';

  const rubricItems = criteria.map((criterion, index) => {
    const levels =
      criterion.rubricLevels ??
      criterion.rubric_levels ??
      criterion.scoreLevels ??
      criterion.score_levels ??
      criterion.levels ??
      [];
    const weight = criterion.weight ?? criterion.Weight;
    const maxScore = criterion.maxScore ?? criterion.max_score ?? 10;
    const weightPct =
      weight != null && Number.isFinite(Number(weight))
        ? `${(Number(weight) * 100).toFixed(0)}%`
        : null;
    return {
      key: String(criterion.id),
      label: (
        <Space wrap size={[8, 4]}>
          <Text strong>
            {index + 1}. {criterion.name}
          </Text>
          {weightPct && <Tag color="blue">Trọng số {weightPct}</Tag>}
          <Tag>Thang điểm 0–{maxScore}</Tag>
        </Space>
      ),
      children: (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {criterion.description || criterion.Description || 'Chưa có mô tả tiêu chí. Coord có thể bổ sung tại màn Quản lý tiêu chí.'}
          </Paragraph>
          {Array.isArray(levels) && levels.length > 0 && (
            <div>
              <Text strong>Các mức rubric:</Text>
              <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
                {levels.map((level, levelIndex) => (
                  <li key={level.id ?? level.value ?? level.score ?? levelIndex}>
                    <Text strong>
                      {level.label ?? level.name ?? level.score ?? level.value ?? `Mức ${levelIndex + 1}`}
                    </Text>
                    {(level.description ?? level.detail ?? level.details) && (
                      <Text>: {level.description ?? level.detail ?? level.details}</Text>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(criterion.rubric_url || criterion.rubricUrl) && (
            <a
              href={criterion.rubric_url || criterion.rubricUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Xem rubric chi tiết
            </a>
          )}
        </Space>
      ),
    };
  });

  return (
    <Card
      style={{
        borderRadius: 20,
        border: 'none',
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: '#f4f7fe',
        boxShadow: '0 8px 24px rgba(0,0,0,0.03)',
      }}
      styles={{ body: { padding: '24px 32px' } }}
    >
      <Collapse
        style={{ marginBottom: 16, background: '#fff' }}
        items={[
          {
            key: 'scoring-guide',
            label: isController
              ? 'Hướng dẫn điều phối Timer & chấm điểm'
              : 'Hướng dẫn chấm điểm & rubric',
            children: (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {isController ? (
                  <Alert
                    type="info"
                    showIcon
                    message="Luồng điều phối: Thuyết trình → Q&A → Đội tiếp theo"
                    description="Kết thúc sớm Q&A chỉ khi mọi GK đã chốt. Hết giờ tự nhiên: ghi nhận điểm tới đâu (thiếu tiêu chí / thiếu GK cũng được) rồi gọi đội tiếp — không đợi hoài."
                  />
                ) : (
                  <Alert
                    type="info"
                    showIcon
                    message="Chấm tuyệt đối theo rubric"
                    description="Nhập đủ điểm từng tiêu chí và bấm HOÀN TẤT & CHỐT SỔ ĐIỂM trong Q&A. Khi còn khoảng 1/3 thời gian Q&A sẽ có cảnh báo nếu bạn chưa chốt."
                  />
                )}
                <Collapse size="small" items={rubricItems} />
              </Space>
            ),
          },
        ]}
      />
      {warnQaDeadline && (
        <Alert
          type="warning"
          showIcon
          banner
          data-testid="qa-scoring-deadline-warn"
          style={{ marginBottom: 16 }}
          message={`Còn ~1/3 thời gian Q&A (~${qaMinutesLeft} phút) — bạn chưa chốt điểm đội này`}
          description="Hãy nhập đủ tiêu chí (nếu còn thiếu) và bấm HOÀN TẤT & CHỐT SỔ ĐIỂM. Hết giờ hệ thống sẽ ghi nhận điểm đã có; thiếu cũng được nhưng nên chốt sớm để công bằng."
        />
      )}
      {isSetup && !hasScoredCurrentTeam && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              background: '#fff',
              padding: '24px 40px',
              borderRadius: 20,
              boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
              border: '2px solid #fde68a',
            }}
          >
            <LockOutlined style={{ fontSize: 40, color: '#f59e0b', marginBottom: 12 }} />
            <Title level={4} style={{ margin: 0, color: '#b45309' }}>
              Đội đang Chuẩn bị (Set-up)
            </Title>
            <Text style={{ color: '#d97706', fontSize: 14, marginTop: 8, display: 'block' }}>
              Form chấm điểm sẽ mở khóa ngay khi người điều phối timer bấm &quot;Bắt Đầu Tính Giờ&quot;.
            </Text>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 16,
          marginBottom: 20,
          borderBottom: '2px dashed #cbd5e1',
        }}
      >
        <div>
          <Text
            style={{
              textTransform: 'uppercase',
              fontWeight: 800,
              letterSpacing: 1,
              fontSize: 12,
              color: '#64748b',
            }}
          >
            {hasScoredCurrentTeam ? 'TỔNG ĐIỂM BẠN ĐÃ CHẤM' : 'TỔNG ĐIỂM (PREVIEW)'}
          </Text>
          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: hasScoredCurrentTeam ? '#10b981' : '#0f172a',
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            {finalCalculatedScore}{' '}
            <span style={{ fontSize: 16, color: '#94a3b8', fontWeight: 700 }}>/ 10.00</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {hasScoredCurrentTeam ? (
            <Tag color="success" style={{ padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
              Đã hoàn thành đánh giá
            </Tag>
          ) : (
            <Tag
              color={canSubmitFinalScore ? 'success' : 'processing'}
              style={{ padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}
            >
              {statusTagLabel}
            </Tag>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {criteria.map((c, index) => {
          const hasScore = currentScores[c.id] !== undefined && currentScores[c.id] !== null;
          return (
          <div
            key={c.id}
            style={{
              padding: '16px 20px',
              background: hasScore ? '#f0fdf4' : hasScoredCurrentTeam ? '#f8fafc' : '#fff',
              borderRadius: 12,
              border: `2px solid ${hasScore ? '#86efac' : hasScoredCurrentTeam ? '#e2e8f0' : '#fecaca'}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            }}
          >
            <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
              <Col span={16}>
                <Space size="small">
                  <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
                    {index + 1}. {c.name}
                  </Text>
                  <Tag color="geekblue" style={{ borderRadius: 4, fontWeight: 600, fontSize: 11 }}>
                    Trọng số: {(c.weight * 100).toFixed(0)}%
                  </Tag>
                </Space>
                <Paragraph type="secondary" style={{ margin: '4px 0 0 0', fontSize: 13 }}>
                  {c.description || c.Description || null}
                </Paragraph>
                {(c.rubric_url || c.rubricUrl) && (
                  <a
                    href={c.rubric_url || c.rubricUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, display: 'inline-block', marginTop: 4 }}
                  >
                    Xem rubric chi tiết
                  </a>
                )}
              </Col>
              <Col span={8} style={{ textAlign: 'right' }}>
                <InputNumber
                  disabled={hasScoredCurrentTeam}
                  min={0}
                  max={10}
                  step={0.1}
                  value={currentScores[c.id] ?? null}
                  onChange={(v) => handleScoreChange(c.id, v)}
                  style={{ width: 80, fontSize: 18, fontWeight: 800, borderRadius: 6 }}
                  size="large"
                />
              </Col>
            </Row>

            <Slider
              disabled={hasScoredCurrentTeam}
              min={0}
              max={10}
              step={0.1}
              value={currentScores[c.id] ?? 0}
              onChange={(v) => handleScoreChange(c.id, v)}
              trackStyle={{
                background: hasScoredCurrentTeam ? '#94a3b8' : '#2563eb',
                height: 6,
                borderRadius: 3,
              }}
              railStyle={{ height: 6, borderRadius: 3, backgroundColor: '#e2e8f0' }}
              handleStyle={{
                height: 16,
                width: 16,
                marginTop: -5,
                borderRadius: '50%',
                border: `3px solid ${hasScoredCurrentTeam ? '#94a3b8' : '#2563eb'}`,
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                outline: 'none',
                opacity: 1,
              }}
            />
          </div>
          );
        })}
      </div>

      <div style={{ marginTop: 32 }}>
        <Title
          level={5}
          style={{ color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}
        >
          <EditOutlined /> Nhận xét chuyên môn
        </Title>
        <TextArea
          disabled={hasScoredCurrentTeam}
          rows={4}
          placeholder="Ghi chú điểm mạnh, điểm yếu của dự án..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{
            borderRadius: 10,
            padding: 12,
            fontSize: 14,
            border: '1px solid #cbd5e1',
            background: hasScoredCurrentTeam ? '#f8fafc' : '#fff',
          }}
        />
      </div>

      <div style={{ marginTop: 24 }}>
        {hasScoredCurrentTeam ? (
          <div
            style={{
              padding: 16,
              background: '#ecfdf5',
              borderRadius: 12,
              border: '2px dashed #34d399',
              textAlign: 'center',
            }}
          >
            <CheckCircleFilled style={{ color: '#10b981', fontSize: 24, marginBottom: 8 }} />
            <Title level={5} style={{ color: '#065f46', margin: '0 0 4px 0' }}>
              Đã Chốt Điểm Thành Công
            </Title>
            <Text style={{ color: '#047857', fontSize: 13 }}>
              {isFinal
                ? 'Bạn đã hoàn tất cho đội này. Chỉ điều phối timer mới chuyển sang đội tiếp theo.'
                : 'Dữ liệu điểm đã được lưu vào hệ thống an toàn và không thể chỉnh sửa.'}
            </Text>
          </div>
        ) : (
          <div
            style={{
              padding: 24,
              background: canSubmitFinalScore ? '#f0fdf4' : '#ffffff',
              borderRadius: 12,
              border: `2px solid ${canSubmitFinalScore ? '#86efac' : '#e2e8f0'}`,
              textAlign: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
            }}
          >
            {!canSubmitFinalScore ? (
              <>
                <InfoCircleOutlined style={{ color: '#3b82f6', fontSize: 24, marginBottom: 8 }} />
                <Title level={5} style={{ color: '#1e293b', margin: '0 0 4px 0' }}>
                  Chưa thể nộp điểm
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Chốt điểm chỉ mở khi đã sang Q&A hoặc hết giờ thuyết trình, và bạn đã nhập đủ tất cả tiêu chí.
                </Text>
              </>
            ) : (
              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                loading={isSubmitting}
                onClick={() => submitScore(false)}
                style={{
                  height: 56,
                  width: '100%',
                  fontSize: 18,
                  fontWeight: 900,
                  background: '#10b981',
                  boxShadow: '0 8px 16px rgba(16,185,129,0.25)',
                  borderRadius: 12,
                  border: 'none',
                }}
              >
                HOÀN TẤT & CHỐT SỔ ĐIỂM
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default JudgeScoringWorkspace;
