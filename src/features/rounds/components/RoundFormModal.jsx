import { useEffect, useMemo } from 'react';
import { Modal, Form, Input, InputNumber, Row, Col, Select, DatePicker, Switch, Card, Typography } from 'antd';
import dayjs from 'dayjs';
import FormLabelWithInfo from '../../../shared/components/ui/FormLabelWithInfo';
import {
  buildRoundScheduleContext,
  getMaxFinalExamMoment,
  getMinFinalExamMoment,
  getPrelimExamDay,
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
const { Text } = Typography;

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
  const roundTypeWatch = Form.useWatch('round_type', form);
  const isFinal = roundTypeWatch === 'FINAL';
  const examAtWatch = Form.useWatch('exam_at', form);
  const codingDurationWatch = Form.useWatch('coding_duration_hours', form);
  const submissionOpenWatch = Form.useWatch('submission_open', form);
  const topNWatch = Form.useWatch('top_n_advance', form);
  const hasPrelimRound = existingRounds.some(
    (r) =>
      r.id !== initialValues?.id &&
      !(r.is_final || r.isFinal) &&
      String(r.round_type || r.roundType || 'PRELIMINARY').toUpperCase() !== 'FINAL',
  );
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
        minTeamsFinal: null,
        partitions,
        requirePartitions: advancementMode === 'confirm',
      }),
    [topNWatch, partitions, advancementMode]
  );

  const usedRoundTypes = new Set(
    existingRounds
      .filter((r) => r.id !== initialValues?.id)
      .map((r) => {
        if (r.is_final || r.isFinal) return 'FINAL';
        return String(r.round_type || r.roundType || 'PRELIMINARY').toUpperCase();
      })
      .filter(Boolean),
  );

  useEffect(() => {
    if (visible) {
      if (initialValues) {
        form.setFieldsValue({
          ...initialValues,
          round_type:
            initialValues.round_type ||
            initialValues.roundType ||
            (initialValues.is_final ? 'FINAL' : 'PRELIMINARY'),
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
          is_final: values.round_type === 'FINAL',
          exam_at: values.exam_at?.format('YYYY-MM-DD HH:mm:ss'),
          submission_open: values.submission_open?.format('YYYY-MM-DD HH:mm:ss'),
          submission_deadline: values.submission_deadline?.format('YYYY-MM-DD HH:mm:ss'),
          // Backend field kept unused by waterfall FE; preserve existing/default value.
          tiebreak_rule:
            values.tiebreak_rule ||
            initialValues?.tiebreak_rule ||
            initialValues?.tiebreakRule ||
            'COORDINATOR_DECISION',
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
          tiebreak_rule: 'COORDINATOR_DECISION',
          late_submission_policy: 'ALLOW_LATE_PENDING',
          is_active: false,
          round_type: 'PRELIMINARY',
        }}
        onValuesChange={(changedValues, allValues) => {
          if (changedValues.round_type !== undefined) {
            const finalRound = allValues.round_type === 'FINAL';
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
              <Select>
                <Option value="PRELIMINARY" disabled={hasPrelimRound}>
                  Sơ loại{hasPrelimRound ? ' — đã tạo' : ''}
                </Option>
                <Option value="FINAL" disabled={usedRoundTypes.has('FINAL')}>
                  Vòng Chung kết{usedRoundTypes.has('FINAL') ? ' — đã tạo' : ''}
                </Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              name="exam_at"
              label={
                <FormLabelWithInfo
                  label="Ngày giờ thi"
                  info={`${isFinal ? 'Lịch vòng Chung kết' : 'Lịch vòng Sơ loại'}: ${scheduleHint}`}
                  required
                />
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
                    const maxFinal = getMaxFinalExamMoment(prelimRoundForSchedule);
                    const prelimDay = getPrelimExamDay(prelimRoundForSchedule);
                    if (!minFinal || !maxFinal || !prelimDay) {
                      return Promise.resolve();
                    }
                    if (!dayjs(value).isSame(prelimDay, 'day')) {
                      return Promise.reject(
                        new Error(
                          `Chung kết phải cùng ngày Sơ loại (${prelimDay.format('DD/MM/YYYY')}).`
                        )
                      );
                    }
                    if (dayjs(value).isBefore(minFinal) || dayjs(value).isAfter(maxFinal)) {
                      return Promise.reject(
                        new Error(
                          `Chọn giờ CK từ ${minFinal.format('DD/MM HH:mm')} đến ${maxFinal.format('DD/MM HH:mm')} ` +
                            `(cách Sơ loại tối đa 2 giờ).`
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
              label="Thời lượng thi (Giờ)"
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
              label={
                <FormLabelWithInfo
                  label="Mở nộp bài"
                  info="Hệ thống tự tính theo quy tắc ⅔ thời lượng thi sau ngày giờ thi."
                />
              }
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
                disabled
                disabledDate={(current) => isRoundDateDisabled(current, scheduleCtx)}
                disabledTime={(current) => getRoundSubmissionOpenDisabledTime(current, scheduleCtx)}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="submission_deadline"
              label={
                <FormLabelWithInfo
                  label="Hạn chót nộp bài"
                  info="Hệ thống tự tính = ngày giờ thi + thời lượng thi."
                />
              }
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
                disabled
                disabledDate={(current) => isRoundDateDisabled(current, scheduleCtx)}
                disabledTime={(current) => getRoundSubmissionDeadlineDisabledTime(current, scheduleCtx)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="late_submission_policy" hidden>
          <Input />
        </Form.Item>

        {!isFinal && (
          <Card
            size="small"
            title="Cấu hình đi tiếp vào Chung kết"
            style={{ marginBottom: 16 }}
          >
            <Form.Item
              name="top_n_advance"
              label={
                <FormLabelWithInfo
                  label="Vào chung kết mỗi bảng (dự tính)"
                  info={getAdvancementFieldHint(advancementMode, advancementValidation, {
                    partitions,
                    topNAdvance: topNWatch,
                  })}
                />
              }
              validateTrigger={['onChange', 'onBlur']}
              rules={[
                {
                  validator(_, value) {
                    if (advancementMode === 'estimate' && (value === undefined || value === null)) {
                      return Promise.resolve();
                    }
                    const result = validateAdvancementConfig({
                      topNAdvance: value,
                      minTeamsFinal: null,
                      partitions,
                      requirePartitions: advancementMode === 'confirm',
                    });
                    if (!result.valid) {
                      return Promise.reject(new Error(result.errors[0]));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                min={1}
                style={{ width: '100%' }}
                placeholder={advancementMode === 'estimate' ? 'VD: 2' : 'Bắt buộc'}
              />
            </Form.Item>

            {advancementMode !== 'estimate' && partitions.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  Phân bổ đội theo bảng:
                </Text>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                  {buildTrackTeamSummary(partitions).map((summary, index) => (
                    <li key={summary.trackId} style={{ marginBottom: 2 }}>
                      {formatTrackSummaryLabel(summary, index)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              name="default_presentation_minutes"
              label={
                <FormLabelWithInfo
                  label="Thuyết trình (phút)"
                  info="Timer cho toàn bộ vòng. Để trống = mặc định 10 phút thuyết trình."
                />
              }
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
              label={
                <FormLabelWithInfo
                  label="Q&A (phút)"
                  info="Để trống = mặc định 5 phút Q&A."
                />
              }
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

        {initialValues?.id != null && (
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
        )}
      </Form>
    </Modal>
  );
};

export default RoundFormModal;
