import { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, InputNumber, Row, Col, Select, DatePicker, Switch, Tooltip, Alert, Button, message, Card, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ROUND_TIEBREAK_RULE } from '../../../shared/constants/status';
import {
  buildRoundScheduleContext,
  getMinFinalExamMoment,
  getPrelimExamDay,
  getPreliminaryGradingEndMoment,
  getRoundExamDisabledTime,
  getRoundScheduleHint,
  getRoundSubmissionDeadlineDisabledTime,
  getRoundSubmissionOpenDisabledTime,
  isRoundDateDisabled,
} from '../utils/roundScheduleRules';
import {
  buildPartitionStats,
  buildTrackTeamSummary,
  formatTrackSummaryLabel,
  getAdvancementFieldHint,
  getAdvancementFieldMode,
  validateAdvancementConfig,
} from '../utils/roundAdvancementRules';
import RoundProblemPdfUpload from './RoundProblemPdfUpload';
import { roundService } from '../services/roundService';

const { Option } = Select;
const { Text } = Typography;

const TIEBREAK_OPTIONS = [
  { value: ROUND_TIEBREAK_RULE.PENALTY_SCORE, label: 'Điểm phạt (Penalty)' },
  { value: ROUND_TIEBREAK_RULE.SUBMISSION_TIME, label: 'Nộp sớm / Submission Time' },
  { value: ROUND_TIEBREAK_RULE.COORDINATOR_DECISION, label: 'Quyết định Ban tổ chức (Manual)' },
];

const RoundFormModal = ({
  visible,
  onCancel,
  onFinish,
  initialValues,
  title,
  existingRounds = [],
  hackathon,
  advancementTeams = [],
  advancementTracks = [],
}) => {
  const [form] = Form.useForm();
  const isFinal = Form.useWatch('is_final', form);
  const examAtWatch = Form.useWatch('exam_at', form);
  const codingDurationWatch = Form.useWatch('coding_duration_hours', form);
  const submissionOpenWatch = Form.useWatch('submission_open', form);
  const topNWatch = Form.useWatch('top_n_advance', form);
  const minFinalWatch = Form.useWatch('min_teams_final', form);
  const [viewingProblem, setViewingProblem] = useState(false);
  const hasPrelimRound = existingRounds.some((r) => !r.is_final);
  const advancementMode = getAdvancementFieldMode(hackathon, existingRounds);

  const partitions = useMemo(
    () =>
      buildPartitionStats(advancementTeams, advancementTracks, {
        requireLocked: advancementMode === 'confirm',
      }),
    [advancementTeams, advancementTracks, advancementMode]
  );

  const advancementValidation = useMemo(
    () =>
      validateAdvancementConfig({
        topNAdvance: topNWatch,
        minTeamsFinal: minFinalWatch,
        partitions,
        requirePartitions: advancementMode === 'confirm',
      }),
    [topNWatch, minFinalWatch, partitions, advancementMode]
  );

  const trackCount = advancementTracks?.length || partitions?.length || 0;
  const wildcardSlotsPreview = useMemo(() => {
    const topN = Number(topNWatch);
    const minFinal = Number(minFinalWatch);
    if (!Number.isFinite(topN) || !Number.isFinite(minFinal) || topN <= 0 || minFinal <= 0) {
      return null;
    }
    // slots = minTeamsFinal − (topN × trackCount); trackCount=0 lúc mới tạo vòng
    return minFinal - topN * trackCount;
  }, [topNWatch, minFinalWatch, trackCount]);
  const wildcardSlotsNonPositive =
    wildcardSlotsPreview != null && wildcardSlotsPreview <= 0;

  useEffect(() => {
    if (!visible || isFinal || !wildcardSlotsNonPositive) return;
    if (form.getFieldValue('wildcard_enabled')) {
      form.setFieldsValue({ wildcard_enabled: false });
    }
  }, [visible, isFinal, wildcardSlotsNonPositive, form]);

  // Tập hợp round_type đã dùng (loại trừ round đang edit)
  const usedRoundTypes = new Set(
    existingRounds
      .filter((r) => r.id !== initialValues?.id)
      .map((r) => r.round_type)
      .filter(Boolean)
  );

  useEffect(() => {
    if (visible) {
      if (initialValues) {
        form.setFieldsValue({
          ...initialValues,
          exam_at: initialValues.exam_at ? dayjs(initialValues.exam_at) : null,
          submission_open: initialValues.submission_open ? dayjs(initialValues.submission_open) : null,
          submission_deadline: initialValues.submission_deadline ? dayjs(initialValues.submission_deadline) : null,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, initialValues, form]);

  const prelimRound = isFinal
    ? existingRounds.find((r) => !r.is_final)
    : existingRounds.find((r) => !r.is_final && r.id !== initialValues?.id);
  const finalRound = existingRounds.find((r) => r.is_final && r.id !== initialValues?.id);

  const prelimRoundForSchedule = useMemo(() => {
    if (!prelimRound) return null;
    if (!isFinal || !initialValues) return prelimRound;
    return {
      ...prelimRound,
      exam_at: examAtWatch && !isFinal ? examAtWatch : prelimRound.exam_at,
      coding_duration_hours:
        codingDurationWatch ?? prelimRound.coding_duration_hours,
    };
  }, [prelimRound, isFinal, initialValues, examAtWatch, codingDurationWatch]);

  const scheduleCtx = useMemo(
    () =>
      buildRoundScheduleContext({
        hackathon,
        prelimRound: prelimRoundForSchedule,
        finalRound,
        isFinal,
        examAt: examAtWatch,
        codingDurationHours: codingDurationWatch,
        submissionOpen: submissionOpenWatch,
      }),
    [
      hackathon,
      prelimRoundForSchedule,
      finalRound,
      isFinal,
      examAtWatch,
      codingDurationWatch,
      submissionOpenWatch,
    ]
  );

  const scheduleHint = getRoundScheduleHint(scheduleCtx);

  const handleViewProblemPdf = async () => {
    if (!initialValues?.id) return;
    setViewingProblem(true);
    try {
      const blob = await roundService.getProblemStatement(initialValues.id);
      const file = new Blob([blob], { type: 'application/pdf' });
      const fileUrl = URL.createObjectURL(file);
      const opened = window.open(fileUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        URL.revokeObjectURL(fileUrl);
        message.warning('Trình duyệt chặn cửa sổ mới. Vui lòng cho phép popup để xem PDF.');
      }
    } catch {
      message.error('Không thể mở file đề bài. Vui lòng thử lại.');
    } finally {
      setViewingProblem(false);
    }
  };

  const hasProblemFile = Boolean(
    initialValues?.problem_statement_filename || initialValues?.problem_statement_url,
  );

  const handleSubmit = () => {
    form.validateFields()
      .then(values => {
        const formattedValues = {
          ...values,
          exam_at: values.exam_at?.format('YYYY-MM-DD HH:mm:ss'),
          submission_open: values.submission_open?.format('YYYY-MM-DD HH:mm:ss'),
          submission_deadline: values.submission_deadline?.format('YYYY-MM-DD HH:mm:ss'),
        };
        onFinish(formattedValues);
        form.resetFields();
      })
      .catch(info => {
        console.log('Validate Failed:', info);
      });
  };

  return (
    <Modal
      open={visible}
      title={title}
      okText="Lưu"
      cancelText="Hủy"
      onCancel={onCancel}
      onOk={handleSubmit}
      width={800}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          tiebreak_rule: 'PENALTY_SCORE',
          late_submission_policy: 'ALLOW_LATE_PENDING',
          is_active: false,
          wildcard_enabled: false,
          is_final: false,
          round_type: 'PRELIMINARY',
        }}
        onValuesChange={(changedValues, allValues) => {
          if (changedValues.round_type !== undefined || changedValues.is_final !== undefined) {
            const finalRound = allValues.is_final || allValues.round_type === 'FINAL';
            form.setFieldsValue({
              late_submission_policy: finalRound ? 'HARD_LOCK' : 'ALLOW_LATE_PENDING',
            });
          }
          if (changedValues.exam_at !== undefined || changedValues.coding_duration_hours !== undefined) {
            const examAt = allValues.exam_at;
            const duration = allValues.coding_duration_hours;
            if (examAt && duration) {
              // Dùng integer arithmetic (minutes) để khớp chính xác với BE:
              // openOffsetMinutes = Math.floor((duration * 60 * 2) / 3) — giống long division của Java
              const openOffsetMinutes = Math.floor((duration * 60 * 2) / 3);
              const submissionOpen = dayjs(examAt).add(openOffsetMinutes, 'minute');
              const submissionDeadline = dayjs(examAt).add(duration, 'hour');
              form.setFieldsValue({
                submission_open: submissionOpen,
                submission_deadline: submissionDeadline,
              });
            }
          }
        }}
      >
        <Form.Item
          name="name"
          label="Tên vòng thi"
          extra={<span style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>Cần một vòng Sơ loại và một vòng Chung kết.</span>}
          rules={[{ required: true, message: 'Vui lòng nhập tên vòng thi' }]}
        >
          <Input placeholder="Ví dụ: Vòng Sơ loại" />
        </Form.Item>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              name="round_type"
              label="Loại vòng thi"
              rules={[{ required: true, message: 'Vui lòng chọn loại' }]}
            >
              <Select
                onChange={(value) => {
                  const finalRound = value === 'FINAL';
                  form.setFieldsValue({
                    is_final: finalRound,
                    late_submission_policy: finalRound ? 'HARD_LOCK' : 'ALLOW_LATE_PENDING',
                  });
                }}
              >
                <Option value="PRELIMINARY" disabled={usedRoundTypes.has('PRELIMINARY')}>
                  Sơ loại (Preliminary){usedRoundTypes.has('PRELIMINARY') ? ' — đã tạo' : ''}
                </Option>
                <Option value="SEMIFINAL" disabled={usedRoundTypes.has('SEMIFINAL')}>
                  Bán kết (Semifinal){usedRoundTypes.has('SEMIFINAL') ? ' — đã tạo' : ''}
                </Option>
                <Option value="FINAL" disabled={usedRoundTypes.has('FINAL')}>
                  Chung kết (Final){usedRoundTypes.has('FINAL') ? ' — đã tạo' : ''}
                </Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="is_final"
              label="Là vòng chung kết"
              valuePropName="checked"
              tooltip={!hasPrelimRound && !initialValues ? 'Tạo vòng Sơ loại trước khi tạo Chung kết' : undefined}
            >
              <Switch
                onChange={(checked) => {
                  if (checked) {
                    form.setFieldsValue({
                      round_type: 'FINAL',
                      is_final: true,
                      late_submission_policy: 'HARD_LOCK',
                    });
                  } else {
                    const currentType = form.getFieldValue('round_type');
                    form.setFieldsValue({
                      is_final: false,
                      round_type: currentType === 'FINAL' ? 'PRELIMINARY' : currentType,
                      late_submission_policy: 'ALLOW_LATE_PENDING',
                    });
                  }
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={isFinal ? 'Lịch vòng Chung kết' : 'Lịch vòng Sơ loại'}
          description={<span style={{ fontSize: 12 }}>{scheduleHint}</span>}
        />

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              name="exam_at"
              label={
                <span>
                  Ngày giờ thi{' '}
                  <Tooltip title="Thời điểm thi đấu / trình bày — khác với hạn chót nộp bài">
                    <InfoCircleOutlined style={{ color: 'var(--ant-color-text-secondary)' }} />
                  </Tooltip>
                </span>
              }
              dependencies={['submission_open']}
              validateTrigger={['onChange', 'onBlur']}
              rules={[
                { required: true, message: 'Vui lòng chọn ngày giờ thi' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!isFinal || !value || !prelimRoundForSchedule) {
                      return Promise.resolve();
                    }
                    const minFinal = getMinFinalExamMoment(prelimRoundForSchedule);
                    const gradingEnd = getPreliminaryGradingEndMoment(prelimRoundForSchedule);
                    const prelimDay = getPrelimExamDay(prelimRoundForSchedule);
                    if (!minFinal || !gradingEnd || !prelimDay) {
                      return Promise.resolve();
                    }
                    if (!dayjs(value).isSame(prelimDay, 'day')) {
                      return Promise.reject(
                        new Error(
                          `Chung kết phải cùng ngày Sơ loại (${prelimDay.format('DD/MM/YYYY')}).`
                        )
                      );
                    }
                    if (dayjs(value).isBefore(minFinal)) {
                      return Promise.reject(
                        new Error(
                          `Khóa trước ${gradingEnd.format('DD/MM HH:mm')} (chấm Sơ loại). ` +
                            `Chỉ chọn từ ${minFinal.format('DD/MM HH:mm')} trở đi.`
                        )
                      );
                    }
                    return Promise.resolve();
                  },
                }),
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const open = getFieldValue('submission_open');
                    if (!value || !open || dayjs(value).isBefore(dayjs(open))) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error('Ngày giờ thi phải trước thời điểm mở nộp bài')
                    );
                  },
                }),
              ]}
            >
              <DatePicker
                showTime
                style={{ width: '100%' }}
                disabledDate={(current) => isRoundDateDisabled(current, scheduleCtx)}
                disabledTime={(current) => getRoundExamDisabledTime(current, scheduleCtx)}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="coding_duration_hours"
              label="Thời gian thi (Giờ)"
              validateTrigger={['onChange', 'onBlur']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (value === undefined || value === null || value > 0) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Thời lượng phải > 0'));
                  },
                }),
              ]}
            >
              <InputNumber min={1} step={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              name="submission_open"
              label="Mở nộp bài"
              dependencies={['exam_at', 'submission_deadline']}
              validateTrigger={['onChange', 'onBlur']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const examAt = getFieldValue('exam_at');
                    if (!value || !examAt || dayjs(value).isAfter(dayjs(examAt))) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error('Thời điểm mở nộp bài phải sau ngày giờ thi')
                    );
                  },
                }),
              ]}
            >
              <DatePicker
                showTime
                style={{ width: '100%' }}
                disabledDate={(current) => isRoundDateDisabled(current, scheduleCtx)}
                disabledTime={(current) => getRoundSubmissionOpenDisabledTime(current, scheduleCtx)}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="submission_deadline"
              label="Hạn chót nộp bài"
              dependencies={['submission_open']}
              validateTrigger={['onChange', 'onBlur']}
              rules={[
                { required: true, message: 'Bắt buộc' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const open = getFieldValue('submission_open');
                    if (!value || !open || dayjs(value).isAfter(dayjs(open))) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Hạn chót phải sau thời gian mở nộp bài'));
                  },
                }),
              ]}
            >
              <DatePicker
                showTime
                style={{ width: '100%' }}
                disabledDate={(current) => isRoundDateDisabled(current, scheduleCtx)}
                disabledTime={(current) => getRoundSubmissionDeadlineDisabledTime(current, scheduleCtx)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          {isFinal && (
          <Col span={24}>
            {initialValues?.problem_statement_filename && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message={`Đề bài hiện tại: ${initialValues.problem_statement_filename}`}
                description={
                  hasProblemFile ? (
                    <Button
                      type="link"
                      style={{ padding: 0, height: 'auto' }}
                      loading={viewingProblem}
                      onClick={handleViewProblemPdf}
                    >
                      Xem PDF
                    </Button>
                  ) : null
                }
              />
            )}
            <Form.Item
              label="File đề bài (PDF)"
              extra="Upload PDF đề bài Chung kết (tối đa 25MB). Có thể upload trước khi phát đề."
              name="problem_file"
              valuePropName="fileList"
              getValueFromEvent={(event) => (Array.isArray(event) ? event : event?.fileList)}
            >
              <RoundProblemPdfUpload disabled={Boolean(initialValues?.problem_released_at)} />
            </Form.Item>
          </Col>
          )}
        </Row>

        {!isFinal && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Đề bài Sơ loại"
            description={
              <span style={{ fontSize: 12 }}>
                Mỗi bảng đấu có đề riêng — upload PDF tại mục Quản lý bảng đấu, không upload tại vòng Sơ loại.
              </span>
            }
          />
        )}

        <Form.Item name="late_submission_policy" hidden>
          <Input />
        </Form.Item>

        {!isFinal && (
          <Card
            size="small"
            title="Cấu hình đi tiếp vào Chung kết"
            style={{ marginBottom: 16 }}
          >
            <Alert
              type={advancementMode === 'confirm' && !advancementValidation.valid ? 'warning' : 'info'}
              showIcon
              style={{ marginBottom: 16 }}
              message="Số đội đi tiếp"
              description={
                <span style={{ fontSize: 12 }}>
                  {getAdvancementFieldHint(advancementMode, advancementValidation, {
                    partitions,
                    topNAdvance: topNWatch,
                  })}
                </span>
              }
            />

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="top_n_advance"
                  label={
                    advancementMode === 'estimate'
                      ? 'Vào chung kết mỗi bảng (dự tính)'
                      : 'Vào chung kết mỗi bảng'
                  }
                  dependencies={['min_teams_final']}
                  validateTrigger={['onChange', 'onBlur']}
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (advancementMode === 'estimate' && (value === undefined || value === null)) {
                          return Promise.resolve();
                        }
                        const result = validateAdvancementConfig({
                          topNAdvance: value,
                          minTeamsFinal: getFieldValue('min_teams_final'),
                          partitions,
                          requirePartitions: advancementMode === 'confirm',
                        });
                        if (!result.valid) {
                          return Promise.reject(new Error(result.errors[0]));
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <InputNumber
                    min={1}
                    style={{ width: '100%' }}
                    placeholder={advancementMode === 'estimate' ? 'VD: 2' : 'Bắt buộc'}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="min_teams_final"
                  label={
                    advancementMode === 'estimate'
                      ? 'Tối đa vào chung kết (dự tính)'
                      : 'Tối đa vào chung kết'
                  }
                  dependencies={['top_n_advance']}
                  validateTrigger={['onChange', 'onBlur']}
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const topN = getFieldValue('top_n_advance');
                        if (!value || !topN || advancementMode === 'estimate') {
                          return Promise.resolve();
                        }
                        const result = validateAdvancementConfig({
                          topNAdvance: topN,
                          minTeamsFinal: value,
                          partitions,
                          requirePartitions: advancementMode === 'confirm',
                        });
                        if (!result.valid) {
                          return Promise.reject(new Error(result.errors[0]));
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} placeholder="VD: 6" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="wildcard_enabled"
              label="Bật Wildcard (vé vớt)"
              valuePropName="checked"
              extra={
                <div style={{ marginTop: 4 }}>
                  {trackCount === 0 ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Tạo bảng đấu trước để tính ghế vé vớt chính xác. Công thức:
                      Số ghế = [Tối đa đội CK] − ([Top N] × [Số lượng bảng]).
                    </Text>
                  ) : wildcardSlotsPreview != null ? (
                    <Text
                      type={wildcardSlotsNonPositive ? 'danger' : 'secondary'}
                      style={{ fontSize: 12 }}
                    >
                      Số ghế vé vớt (Wildcard slots) = {minFinalWatch} − ({topNWatch} × {trackCount}) ={' '}
                      <strong>{wildcardSlotsPreview}</strong>
                      {wildcardSlotsNonPositive
                        ? ' — Top N đã lấp đủ/vượt trần CK; không cần vé vớt.'
                        : ''}
                    </Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Số ghế vé vớt (Wildcard slots) = [Tối đa đội CK] − ([Top N] × [Số lượng bảng])
                    </Text>
                  )}
                </div>
              }
            >
              <Switch disabled={wildcardSlotsNonPositive} />
            </Form.Item>

            <Form.Item
              name="tiebreak_rule"
              label="Luật Tiebreak"
              extra={
                <span style={{ fontSize: 12 }}>
                  Khi đồng điểm tại biên Top-N mỗi bảng trước khi chốt chuyển vòng.
                </span>
              }
            >
              <Select>
                {TIEBREAK_OPTIONS.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {advancementMode !== 'estimate' && partitions.length > 0 && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 0 }}
                message="Phân bổ đội"
                description={
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 13 }}>
                    {buildTrackTeamSummary(partitions).map((summary, index) => (
                      <li key={summary.trackId} style={{ marginBottom: 2 }}>
                        {formatTrackSummaryLabel(summary, index)}
                      </li>
                    ))}
                  </ul>
                }
              />
            )}
          </Card>
        )}

        {isFinal && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Vòng Chung kết"
            description={<span style={{ fontSize: 12 }}>Không có bảng đấu con, không cấu hình số đội đi tiếp / vé vớt.</span>}
          />
        )}

        {isFinal && (
          <Row gutter={24}>
            <Col span={24}>
              <Form.Item
                name="tiebreak_rule"
                label="Luật giải quyết đồng điểm Xếp hạng Nhất/Nhì/Ba"
              >
                <Select>
                  {TIEBREAK_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        )}

        {isFinal && (
          <>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Thời lượng thuyết trình (tùy chọn)"
              description={
                <span style={{ fontSize: 12 }}>
                  Timer cho toàn bộ vòng Chung kết (không theo bảng đấu). Để trống = mặc định 10 phút thuyết trình / 5 phút Q&A.
                </span>
              }
            />
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="default_presentation_minutes"
                  label="Thuyết trình (phút)"
                  validateTrigger={['onChange', 'onBlur']}
                  rules={[
                    {
                      validator: (_, value) => {
                        if (value == null || value === '' || (value >= 1 && value <= 60)) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Nhập từ 1 đến 60 phút'));
                      },
                    },
                  ]}
                >
                  <InputNumber min={1} max={60} style={{ width: '100%' }} placeholder="10" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="default_qa_minutes"
                  label="Q&A (phút)"
                  validateTrigger={['onChange', 'onBlur']}
                  rules={[
                    {
                      validator: (_, value) => {
                        if (value == null || value === '' || (value >= 1 && value <= 60)) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Nhập từ 1 đến 60 phút'));
                      },
                    },
                  ]}
                >
                  <InputNumber min={1} max={60} style={{ width: '100%' }} placeholder="5" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        <Row gutter={24}>
          <Col span={24}>
            <Form.Item
              name="is_active"
              label="Đang hoạt động"
              valuePropName="checked"
            >
              <Switch disabled={!!initialValues?.is_active} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default RoundFormModal;
