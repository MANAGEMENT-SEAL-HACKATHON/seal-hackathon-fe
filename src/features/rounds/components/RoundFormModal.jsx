import React, { useEffect, useMemo } from 'react';
import { Modal, Form, Input, InputNumber, Row, Col, Select, DatePicker, Switch, Tooltip, Alert } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  buildRoundScheduleContext,
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

const { Option } = Select;

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
          <Col span={12}>
            <Form.Item
              name="problem_statement_url"
              label="Link Đề bài"
            >
              <Input placeholder="https://example.com/problem" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="late_submission_policy" hidden>
          <Input />
        </Form.Item>

        {!isFinal && (
          <>
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
              <Col span={8}>
                <Form.Item
                  name="top_n_advance"
                  label={
                    advancementMode === 'estimate'
                      ? 'Vào CK mỗi bảng (dự tính)'
                      : 'Vào CK mỗi bảng'
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
              <Col span={8}>
                <Form.Item
                  name="min_teams_final"
                  label={
                    advancementMode === 'estimate'
                      ? 'Tối thiểu vào CK (dự tính)'
                      : 'Tối thiểu vào CK'
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
              <Col span={8}>
                <Form.Item name="tiebreak_rule" label="Luật Tiebreak">
                  <Select>
                    <Option value="PENALTY_SCORE">Điểm phạt (Penalty)</Option>
                    <Option value="LATEST_SUBMISSION">Bài nộp muộn nhất</Option>
                    <Option value="EARLIEST_SUBMISSION">Bài nộp sớm nhất</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {advancementMode !== 'estimate' && partitions.length > 0 && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
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
          </>
        )}

        {isFinal && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Vòng Chung kết"
            description={<span style={{ fontSize: 12 }}>Không có bảng đấu con, không cấu hình số đội đi tiếp.</span>}
          />
        )}

        {isFinal && (
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="tiebreak_rule"
                label="Luật Tiebreak"
              >
                <Select>
                  <Option value="PENALTY_SCORE">Điểm phạt (Penalty)</Option>
                  <Option value="LATEST_SUBMISSION">Bài nộp muộn nhất</Option>
                  <Option value="EARLIEST_SUBMISSION">Bài nộp sớm nhất</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        )}

        <Row gutter={24}>
          {!isFinal && (
            <Col span={12}>
              <Form.Item
                name="wildcard_enabled"
                label="Wild Card"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          )}
          <Col span={isFinal ? 24 : 12}>
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
