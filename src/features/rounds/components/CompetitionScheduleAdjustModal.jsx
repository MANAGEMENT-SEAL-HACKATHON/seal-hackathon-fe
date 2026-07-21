import { useEffect, useMemo, useState } from 'react';
import { Modal, DatePicker, Space, Typography, Alert, Table, Spin, Button, Collapse, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { hackathonService } from '../../hackathons/services/hackathonService';
import { getTeamErrorMessage } from '../../../shared/constants/teamErrors';

const { Text } = Typography;
const DAYS_REG_END_TO_EVENT_START = 3;
const PRELIM_HOURS_DEFAULT = 7;

const FRIENDLY_LABELS = {
  WORKSHOP: 'Workshop',
  KICKOFF: 'Khai mạc',
  PRELIM: 'Thi Sơ loại',
  FINAL: 'Thi Chung kết',
  AWARDS: 'Lễ trao giải',
  REGISTRATION_END: 'Hết hạn đăng ký',
  EVENT_START: 'Ngày bắt đầu sự kiện',
  EVENT_END: 'Ngày kết thúc sự kiện',
};

const formatDisplayDateTime = (value) => {
  if (value == null || value === '') return '—';
  if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(value)) return value;
  const parsed = dayjs(value);
  if (parsed.isValid()) return parsed.format('DD/MM/YYYY HH:mm');
  return String(value);
};

/**
 * Chọn giờ thi Sơ loại + preview cascade; chỉnh Workshop / Khai mạc / Chung kết / Trao giải trong ràng buộc GĐ1.
 */
const CompetitionScheduleAdjustModal = ({
  open,
  hackathon,
  title = 'Dời lịch thi',
  okText = 'Xác nhận dời lịch',
  confirmLoading,
  mode = 'adjust',
  onCancel,
  onConfirm,
}) => {
  const regEndRaw = hackathon?.registration_end ?? hackathon?.registrationEnd;

  // Ổn định reference — tránh dayjs() mới mỗi render làm useEffect loop
  const regEndBase = useMemo(() => {
    if (mode === 'close-reg') {
      return dayjs().startOf('day');
    }
    if (regEndRaw) {
      return dayjs(regEndRaw).startOf('day');
    }
    return dayjs().startOf('day');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ recalculate khi mở modal / đổi mode / regEnd
  }, [open, mode, regEndRaw]);

  const minDay = useMemo(
    () => regEndBase.add(DAYS_REG_END_TO_EVENT_START, 'day').startOf('day'),
    [regEndBase],
  );
  const wsDay = useMemo(() => regEndBase.add(1, 'day'), [regEndBase]);
  const koDay = useMemo(() => regEndBase.add(2, 'day'), [regEndBase]);

  const [newExamAt, setNewExamAt] = useState(null);
  const [wsStart, setWsStart] = useState(null);
  const [koStart, setKoStart] = useState(null);
  const [finalExamAt, setFinalExamAt] = useState(null);
  const [awardsStart, setAwardsStart] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [localError, setLocalError] = useState(null);

  const applyDefaultsFromPrelim = (exam) => {
    if (!exam || !exam.isValid()) return;
    setWsStart(wsDay.hour(20).minute(0).second(0));
    setKoStart(koDay.hour(14).minute(0).second(0));
    const prelimEnd = exam.add(PRELIM_HOURS_DEFAULT, 'hour');
    const fin = prelimEnd.add(2, 'hour');
    setFinalExamAt(fin);
    setAwardsStart(fin.add(2, 'hour').add(30, 'minute'));
  };

  useEffect(() => {
    if (!open) return;
    const initial = minDay.hour(8).minute(0).second(0);
    setNewExamAt(initial);
    setWsStart(wsDay.hour(20).minute(0).second(0));
    setKoStart(koDay.hour(14).minute(0).second(0));
    const prelimEnd = initial.add(PRELIM_HOURS_DEFAULT, 'hour');
    const fin = prelimEnd.add(2, 'hour');
    setFinalExamAt(fin);
    setAwardsStart(fin.add(2, 'hour').add(30, 'minute'));
    setPreview(null);
    setPreviewError(null);
    setLocalError(null);
    setShowDetail(false);
  }, [open, minDay, wsDay, koDay]);

  useEffect(() => {
    if (!open || !newExamAt?.isValid() || !hackathon?.id) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const data = await hackathonService.previewCompetitionSchedule(
          hackathon.id,
          { newPrelimExamAt: newExamAt.format('YYYY-MM-DDTHH:mm:ss') },
          mode === 'close-reg',
        );
        if (!cancelled) setPreview(data);
      } catch (e) {
        if (!cancelled) {
          setPreview(null);
          setPreviewError(getTeamErrorMessage(e) || 'Không tải được xem trước lịch');
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, newExamAt, hackathon?.id, mode]);

  const validateLocal = () => {
    if (!newExamAt || !wsStart || !koStart || !finalExamAt || !awardsStart) {
      return 'Thiếu giờ thi Sơ loại / Workshop / Khai mạc / Chung kết / Lễ trao giải';
    }
    if (!wsStart.isSame(wsDay, 'day')) {
      return `Workshop phải đúng ngày ${wsDay.format('DD/MM/YYYY')} (1 ngày sau hết hạn đăng ký)`;
    }
    if (!koStart.isSame(koDay, 'day')) {
      return `Khai mạc phải đúng ngày ${koDay.format('DD/MM/YYYY')} (2 ngày sau hết hạn đăng ký)`;
    }
    if (wsStart.isSame(koStart, 'day')) return 'Workshop và Khai mạc phải khác ngày';
    if (!wsStart.add(90, 'minute').isBefore(koStart)) return 'Workshop phải kết thúc trước Khai mạc';
    if (!wsStart.isBefore(newExamAt, 'day') || !koStart.isBefore(newExamAt, 'day')) {
      return 'Workshop và Khai mạc phải trước ngày thi Sơ loại';
    }
    const prelimEnd = newExamAt.add(PRELIM_HOURS_DEFAULT, 'hour');
    const minFinal = prelimEnd.add(1, 'hour');
    const maxFinal = prelimEnd.add(2, 'hour');
    if (finalExamAt.isBefore(minFinal) || finalExamAt.isAfter(maxFinal)) {
      return `Chung kết phải trong ${minFinal.format('DD/MM/YYYY HH:mm')} – ${maxFinal.format('DD/MM/YYYY HH:mm')} (1–2 giờ sau khi Sơ loại kết thúc)`;
    }
    const finalDeadline = finalExamAt.add(2, 'hour');
    if (!awardsStart.isAfter(finalDeadline)) {
      return `Lễ trao giải phải sau hạn nộp Chung kết (${finalDeadline.format('DD/MM/YYYY HH:mm')})`;
    }
    return null;
  };

  const disabledDate = (current) => {
    if (!current) return false;
    if (current.isBefore(dayjs().startOf('day'))) return true;
    if (current.isBefore(minDay)) return true;
    return false;
  };

  const displayChanges = useMemo(() => {
    const changes = preview?.changes ?? preview?.Changes ?? [];
    if (!changes.length) return [];
    const patch = {
      WORKSHOP: wsStart?.format('DD/MM/YYYY HH:mm'),
      KICKOFF: koStart?.format('DD/MM/YYYY HH:mm'),
      PRELIM: newExamAt?.format('DD/MM/YYYY HH:mm'),
      FINAL: finalExamAt?.format('DD/MM/YYYY HH:mm'),
      AWARDS: awardsStart?.format('DD/MM/YYYY HH:mm'),
    };
    return changes.map((c) => {
      const key = c.key;
      const friendlyLabel = FRIENDLY_LABELS[key] || c.label || key;
      const newValue = patch[key] ?? formatDisplayDateTime(c.newValue ?? c.new_value);
      const oldValue = formatDisplayDateTime(c.oldValue ?? c.old_value);
      return { ...c, label: friendlyLabel, newValue, oldValue };
    });
  }, [preview, wsStart, koStart, newExamAt, finalExamAt, awardsStart]);

  const canAdjust = preview?.canAdjust ?? preview?.can_adjust;
  const blockReason = preview?.blockReason ?? preview?.block_reason;

  const handleOk = () => {
    if (confirmLoading || !newExamAt || !newExamAt.isAfter(dayjs())) return;
    if (mode === 'adjust' && canAdjust === false) return;
    const err = validateLocal();
    setLocalError(err);
    if (err) return;
    onConfirm({
      newPrelimExamAt: newExamAt.format('YYYY-MM-DDTHH:mm:ss'),
      overrides: {
        workshopStartsAt: wsStart.format('YYYY-MM-DDTHH:mm:ss'),
        workshopEndsAt: wsStart.add(90, 'minute').format('YYYY-MM-DDTHH:mm:ss'),
        kickoffStartsAt: koStart.format('YYYY-MM-DDTHH:mm:ss'),
        kickoffEndsAt: koStart.add(3, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
        finalExamAt: finalExamAt.format('YYYY-MM-DDTHH:mm:ss'),
        awardsStartsAt: awardsStart.format('YYYY-MM-DDTHH:mm:ss'),
        awardsEndsAt: awardsStart.add(90, 'minute').format('YYYY-MM-DDTHH:mm:ss'),
      },
      preview,
    });
  };

  if (!open) {
    return null;
  }

  return (
    <Modal
      open={open}
      title={title}
      okText={okText}
      cancelText="Hủy (không lưu)"
      confirmLoading={confirmLoading}
      okButtonProps={{
        disabled:
          confirmLoading ||
          !newExamAt ||
          !newExamAt.isAfter(dayjs()) ||
          (mode === 'adjust' && canAdjust === false) ||
          previewLoading,
        danger: mode === 'close-reg',
      }}
      onCancel={confirmLoading ? undefined : onCancel}
      onOk={handleOk}
      width={760}
      destroyOnClose
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message={
            mode === 'close-reg'
              ? 'Đóng đăng ký sớm và chọn lịch thi trong một bước'
              : 'Dời lịch một lần, ít nhất 4 ngày trước Khai mạc'
          }
          description={
            mode === 'close-reg'
              ? 'Chưa ưng → đổi giờ Sơ loại hoặc chỉnh chi tiết bên dưới. Bấm Hủy = không đóng đăng ký.'
              : 'Sau khi xác nhận, hệ thống gửi thông báo cho mentor, giám khảo, sinh viên và Ban tổ chức.'
          }
        />

        <Collapse
          size="small"
          items={[
            {
              key: 'rules',
              label: 'Quy tắc lịch tự động',
              children: (
                <Space direction="vertical" size={4}>
                  <Text>• Workshop: đúng 1 ngày sau hết hạn đăng ký</Text>
                  <Text>• Khai mạc: đúng 2 ngày sau hết hạn đăng ký (khác ngày với Workshop)</Text>
                  <Text>• Thi Sơ loại: sớm nhất 3 ngày sau hết hạn đăng ký</Text>
                  <Text>• Thi Chung kết: 1–2 giờ sau khi Sơ loại kết thúc</Text>
                  <Text>• Lễ trao giải: sau hạn nộp bài Chung kết</Text>
                </Space>
              ),
            },
          ]}
        />

        <div>
          <Text strong>Giờ thi Sơ loại (mốc chính)</Text>
          <DatePicker
            showTime
            format="DD/MM/YYYY HH:mm"
            style={{ width: '100%', marginTop: 8 }}
            value={newExamAt}
            onChange={(v) => {
              setNewExamAt(v);
              if (v) applyDefaultsFromPrelim(v);
            }}
            disabled={confirmLoading}
            disabledDate={disabledDate}
            placeholder={`Từ ${minDay.format('DD/MM/YYYY')} trở đi`}
          />
        </div>

        <Button type="link" style={{ padding: 0 }} onClick={() => setShowDetail((v) => !v)}>
          {showDetail
            ? 'Ẩn chỉnh chi tiết'
            : 'Chỉnh chi tiết Workshop / Khai mạc / Chung kết / Lễ trao giải'}
        </Button>

        {showDetail && (
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <div>
              <Text type="secondary">Workshop — ngày {wsDay.format('DD/MM/YYYY')}</Text>
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                style={{ width: '100%', marginTop: 4 }}
                value={wsStart}
                onChange={setWsStart}
                disabledDate={(d) => d && !d.isSame(wsDay, 'day')}
              />
            </div>
            <div>
              <Text type="secondary">Khai mạc — ngày {koDay.format('DD/MM/YYYY')}</Text>
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                style={{ width: '100%', marginTop: 4 }}
                value={koStart}
                onChange={setKoStart}
                disabledDate={(d) => d && !d.isSame(koDay, 'day')}
              />
            </div>
            <div>
              <Text type="secondary">Chung kết (1–2 giờ sau khi Sơ loại kết thúc)</Text>
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                style={{ width: '100%', marginTop: 4 }}
                value={finalExamAt}
                onChange={setFinalExamAt}
              />
            </div>
            <div>
              <Text type="secondary">Lễ trao giải (sau hạn nộp Chung kết)</Text>
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                style={{ width: '100%', marginTop: 4 }}
                value={awardsStart}
                onChange={setAwardsStart}
              />
            </div>
            <Button size="small" onClick={() => newExamAt && applyDefaultsFromPrelim(newExamAt)}>
              Đặt lại mặc định theo giờ Sơ loại
            </Button>
          </Space>
        )}

        {localError && <Alert type="error" showIcon message={localError} />}
        {previewError && <Alert type="error" showIcon message={previewError} />}
        {blockReason && mode === 'adjust' && <Alert type="warning" showIcon message={blockReason} />}

        <Spin spinning={previewLoading}>
          <Text strong>Xem trước thay đổi (xác nhận mới lưu và gửi thông báo)</Text>
          <Tooltip title="Ô «Slot thuyết trình» là khung thời gian dự kiến từng đội thuyết trình, tự tính từ giờ Sơ loại.">
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
              Bảng dưới gồm mốc sự kiện và khung thuyết trình (nếu có).
            </Text>
          </Tooltip>
          <Table
            size="small"
            pagination={false}
            style={{ marginTop: 8 }}
            rowKey={(r) => r.key || r.label}
            dataSource={displayChanges}
            locale={{ emptyText: previewLoading ? 'Đang tải…' : 'Chọn giờ thi để xem trước' }}
            columns={[
              { title: 'Hạng mục', dataIndex: 'label', key: 'label', width: '28%' },
              {
                title: 'Hiện tại',
                dataIndex: 'oldValue',
                key: 'old',
                render: (v, r) => formatDisplayDateTime(v ?? r.old_value),
              },
              {
                title: 'Sau khi lưu',
                dataIndex: 'newValue',
                key: 'new',
                render: (v, r) => formatDisplayDateTime(v ?? r.new_value),
              },
            ]}
          />
        </Spin>
      </Space>
    </Modal>
  );
};

export default CompetitionScheduleAdjustModal;
