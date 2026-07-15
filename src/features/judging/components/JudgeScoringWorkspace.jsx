// src/features/judging/components/JudgeScoringWorkspace.jsx
import React from 'react';
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
} from 'antd';
import {
  SaveOutlined,
  LockOutlined,
  InfoCircleOutlined,
  EditOutlined,
  CheckCircleFilled,
  ExperimentOutlined,
} from '@ant-design/icons';

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
    canSubmitFinalScore,
    hasScoredCurrentTeam,
    myScoredSubmissions,
    activeSlot,
    isAllDone,
    scoringLocked,
    isFinal,
    isCalibration,
    isLivePresentation,
    hasPresentationQueue,
  } = logic;

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
      ? isCalibration
        ? 'Sẵn sàng chấm calibration'
        : 'Đã cho phép Chốt Điểm'
      : isCalibration
        ? 'Đang chấm...'
        : 'Đang trong thời gian thuyết trình...';

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
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Chấm tuyệt đối theo rubric"
        description="Nếu có đội chèn cuối (nộp trễ đã duyệt), giữ chuẩn tiêu chí cố định — không so sánh tương đối với đội trước."
      />
      {isCalibration && (
        <Alert
          type="info"
          showIcon
          icon={<ExperimentOutlined />}
          message="Chế độ Calibration"
          description="Điểm calibration không ảnh hưởng xếp hạng chính thức."
          style={{ marginBottom: 16, borderRadius: 10 }}
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
                  {c.description}
                </Paragraph>
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
              {isCalibration ? 'Đã chấm calibration' : 'Đã Chốt Điểm Thành Công'}
            </Title>
            <Text style={{ color: '#047857', fontSize: 13 }}>
              {isCalibration
                ? 'Dữ liệu điểm đã được lưu vào hệ thống an toàn và không thể chỉnh sửa.'
                : isFinal
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
                {isCalibration ? 'LƯU ĐIỂM CALIBRATION' : 'HOÀN TẤT & CHỐT SỔ ĐIỂM'}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default JudgeScoringWorkspace;
