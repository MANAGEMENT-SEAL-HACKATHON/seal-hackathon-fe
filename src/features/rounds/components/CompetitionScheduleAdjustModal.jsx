import { useEffect, useMemo, useState } from 'react';
import { Modal, DatePicker, Space, Typography, Alert, Table, Spin, Button, Collapse, Tooltip, Tag } from 'antd';
import dayjs from 'dayjs';
import { hackathonService } from '../../hackathons/services/hackathonService';
import { getTeamErrorMessage } from '../../../shared/constants/teamErrors';
import { resolveUserError } from '../../../shared/errors/resolveUserError';

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

const MILESTONE_STATUS_COLOR = {
  OK: 'success',
  TIGHT: 'warning',
  VIOLATION: 'error',
};

const formatDisplayDateTime = (value) => {
  if (value == null || value === '') return '—';
  if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(value)) return value;
  const parsed = dayjs(value);
  if (parsed.isValid()) return parsed.format('DD/MM/YYYY HH:mm');
  return String(value);
};

const formatDisplayDate = (value) => {
  if (value == null || value === '') return '—';
  const parsed = dayjs(value);
  if (parsed.isValid()) return parsed.format('DD/MM/YYYY');
  return String(value);
};

/**
 * Chọn giờ thi Sơ loại + preview cascade; chỉnh Workshop / Khai mạc / Chung kết / Trao giải trong ràng buộc GĐ1.
 * mode: adjust | close-reg | extend-reg
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
  onSwitchToAdjust,
}) => {
  const isExtendReg = mode === 'extend-reg';
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
  const [newRegEnd, setNewRegEnd] = useState(null);
  const [wsStart, setWsStart] = useState(null);
  const [koStart, setKoStart] = useState(null);
  const [finalExamAt, setFinalExamAt] = useState(null);
  const [awardsStart, setAwardsStart] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [adjustWithExtend, setAdjustWithExtend] = useState(false);

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [localError, setLocalError] = useState(null);

  const extendRegEndBase = useMemo(() => {
    if (!isExtendReg) return null;
    if (newRegEnd?.isValid()) return newRegEnd.startOf('day');
    return regEndBase;
  }, [isExtendReg, newRegEnd, regEndBase]);

  const extendWsDay = useMemo(
    () => (extendRegEndBase ? extendRegEndBase.add(1, 'day') : null),
    [extendRegEndBase],
  );
  const extendKoDay = useMemo(
    () => (extendRegEndBase ? extendRegEndBase.add(2, 'day') : null),
    [extendRegEndBase],
  );
  const extendMinPrelimDay = useMemo(
    () => (extendRegEndBase ? extendRegEndBase.add(DAYS_REG_END_TO_EVENT_START, 'day') : null),
    [extendRegEndBase],
  );

  const applyDefaultsFromPrelim = (exam, wsAnchor, koAnchor) => {
    if (!exam || !exam.isValid()) return;
    const ws = wsAnchor || wsDay;
    const ko = koAnchor || koDay;
    setWsStart(ws.hour(20).minute(0).second(0));
    setKoStart(ko.hour(14).minute(0).second(0));
    const prelimEnd = exam.add(PRELIM_HOURS_DEFAULT, 'hour');
    const fin = prelimEnd.add(2, 'hour');
    setFinalExamAt(fin);
    setAwardsStart(fin.add(2, 'hour').add(30, 'minute'));
  };

  useEffect(() => {
    if (!open) return;
    if (isExtendReg) {
      const initialReg = regEndBase.add(3, 'day');
      setNewRegEnd(initialReg);
      const prelim = initialReg.add(DAYS_REG_END_TO_EVENT_START, 'day').hour(8).minute(0).second(0);
      setNewExamAt(prelim);
      setWsStart(initialReg.add(1, 'day').hour(20).minute(0).second(0));
      setKoStart(initialReg.add(2, 'day').hour(14).minute(0).second(0));
      const prelimEnd = prelim.add(PRELIM_HOURS_DEFAULT, 'hour');
      const fin = prelimEnd.add(2, 'hour');
      setFinalExamAt(fin);
      setAwardsStart(fin.add(2, 'hour').add(30, 'minute'));
      setAdjustWithExtend(false);
      setShowDetail(false);
      setPreview(null);
      setPreviewError(null);
      setLocalError(null);
      return;
    }
    const initial = minDay.hour(8).minute(0).second(0);
    setNewExamAt(initial);
    setNewRegEnd(null);
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
    setAdjustWithExtend(false);
  }, [open, minDay, wsDay, koDay, isExtendReg, regEndBase]);

  useEffect(() => {
    if (!open || !hackathon?.id) return undefined;
    if (isExtendReg) {
      if (!newRegEnd?.isValid()) return undefined;
      let cancelled = false;
      const t = setTimeout(async () => {
        setPreviewLoading(true);
        setPreviewError(null);
        try {
          const data = await hackathonService.previewRegistrationExtension(hackathon.id, {
            newRegistrationEnd: newRegEnd.format('YYYY-MM-DD'),
          });
          if (!cancelled) setPreview(data);
        } catch (e) {
          if (!cancelled) {
            setPreview(null);
            setPreviewError(
              getTeamErrorMessage(e) ||
                resolveUserError(e, { fallback: 'Không tải được xem trước dời hạn' }),
            );
          }
        } finally {
          if (!cancelled) setPreviewLoading(false);
        }
      }, 350);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }

    if (!newExamAt?.isValid()) return undefined;
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
  }, [open, newExamAt, newRegEnd, hackathon?.id, mode, isExtendReg]);

  const validateLocal = () => {
    if (isExtendReg && adjustWithExtend) {
      if (!newExamAt || !wsStart || !koStart || !finalExamAt || !awardsStart) {
        return 'Thiếu giờ thi Sơ loại / Workshop / Khai mạc / Chung kết / Lễ trao giải';
      }
      if (extendWsDay && !wsStart.isSame(extendWsDay, 'day')) {
        return `Workshop phải đúng ngày ${extendWsDay.format('DD/MM/YYYY')} (1 ngày sau hạn ĐK mới)`;
      }
      if (extendKoDay && !koStart.isSame(extendKoDay, 'day')) {
        return `Khai mạc phải đúng ngày ${extendKoDay.format('DD/MM/YYYY')} (2 ngày sau hạn ĐK mới)`;
      }
      if (wsStart.isSame(koStart, 'day')) return 'Workshop và Khai mạc phải khác ngày';
      if (!wsStart.add(90, 'minute').isBefore(koStart)) return 'Workshop phải kết thúc trước Khai mạc';
      if (!wsStart.isBefore(newExamAt, 'day') || !koStart.isBefore(newExamAt, 'day')) {
        return 'Workshop và Khai mạc phải trước ngày thi Sơ loại';
      }
      return null;
    }
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

  const disabledExtendRegDate = (current) => {
    if (!current) return false;
    if (!current.isAfter(dayjs().startOf('day'))) return true;
    if (regEndRaw && !current.isAfter(dayjs(regEndRaw).startOf('day'))) return true;
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

  const milestones = preview?.milestones ?? preview?.Milestones ?? [];
  const hasViolation = milestones.some(
    (m) => String(m.status ?? m.Status ?? '').toUpperCase() === 'VIOLATION',
  );
  const extensionCount = preview?.extensionCount ?? preview?.extension_count ?? 0;
  const maxExtensions = preview?.maxExtensions ?? preview?.max_extensions ?? 2;
  const canExtend = preview?.canExtend ?? preview?.can_extend;
  const blockReason = preview?.blockReason ?? preview?.block_reason;
  const suggestions = preview?.suggestedAdjustments ?? preview?.suggested_adjustments ?? [];
  const teamStats = preview?.teamStats ?? preview?.team_stats;
  const canAdjust = preview?.canAdjust ?? preview?.can_adjust;
  const scheduleBlockReason = !isExtendReg ? blockReason : null;

  const handleOk = () => {
    if (confirmLoading) return;

    if (isExtendReg) {
      if (!newRegEnd?.isValid()) return;
      if (hasViolation && !adjustWithExtend) return;
      if (!hasViolation && canExtend === false) return;
      if (adjustWithExtend) {
        const err = validateLocal();
        setLocalError(err);
        if (err) return;
        if (!newExamAt || !newExamAt.isAfter(dayjs())) return;
        onConfirm({
          newRegistrationEnd: newRegEnd.format('YYYY-MM-DD'),
          adjustCompetitionSchedule: true,
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
        return;
      }
      onConfirm({
        newRegistrationEnd: newRegEnd.format('YYYY-MM-DD'),
        adjustCompetitionSchedule: false,
        preview,
      });
      return;
    }

    if (!newExamAt || !newExamAt.isAfter(dayjs())) return;
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

  const extendOkDisabled =
    confirmLoading ||
    previewLoading ||
    !newRegEnd?.isValid() ||
    (hasViolation && !adjustWithExtend) ||
    (!hasViolation && canExtend === false) ||
    (adjustWithExtend && (!newExamAt || !newExamAt.isAfter(dayjs())));

  return (
    <Modal
      open={open}
      title={title}
      okText={okText}
      cancelText="Hủy (không lưu)"
      confirmLoading={confirmLoading}
      okButtonProps={{
        disabled: isExtendReg
          ? extendOkDisabled
          : confirmLoading ||
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
            isExtendReg
              ? 'Dời hạn đăng ký — kiểm tra khoảng cách tới Workshop / Khai mạc / Sơ loại'
              : mode === 'close-reg'
                ? 'Đóng đăng ký sớm và chọn lịch thi trong một bước'
                : 'Dời lịch một lần, ít nhất 4 ngày trước Khai mạc'
          }
          description={
            isExtendReg
              ? 'Nếu mốc lịch bị VIOLATION, bật điều chỉnh lịch kèm theo hoặc dùng «Điều chỉnh tay».'
              : mode === 'close-reg'
                ? 'Chưa ưng → đổi giờ Sơ loại hoặc chỉnh chi tiết bên dưới. Bấm Hủy = không đóng đăng ký.'
                : 'Sau khi xác nhận, hệ thống gửi thông báo cho mentor, giám khảo, sinh viên và Ban tổ chức.'
          }
        />

        {!isExtendReg && (
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
        )}

        {isExtendReg ? (
          <>
            <div>
              <Text strong>Hạn đăng ký mới</Text>
              <DatePicker
                format="DD/MM/YYYY"
                style={{ width: '100%', marginTop: 8 }}
                value={newRegEnd}
                onChange={(v) => {
                  setNewRegEnd(v);
                  setAdjustWithExtend(false);
                  setShowDetail(false);
                  if (v?.isValid()) {
                    const prelim = v.add(DAYS_REG_END_TO_EVENT_START, 'day').hour(8).minute(0).second(0);
                    setNewExamAt(prelim);
                    applyDefaultsFromPrelim(prelim, v.add(1, 'day'), v.add(2, 'day'));
                  }
                }}
                disabled={confirmLoading}
                disabledDate={disabledExtendRegDate}
                placeholder="Chọn ngày sau hạn hiện tại"
              />
              <Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
                Hiện tại: {formatDisplayDate(regEndRaw)} · Đã dời {extensionCount}/{maxExtensions} lần
              </Text>
            </div>

            {teamStats && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Đội ACTIVE: {teamStats.activeCount ?? teamStats.active_count ?? 0}
                {' · '}Đã khóa: {teamStats.lockedCount ?? teamStats.locked_count ?? 0}
                {' · '}PENDING: {teamStats.pendingCount ?? teamStats.pending_count ?? 0}
              </Text>
            )}

            {hasViolation && (
              <Alert
                type="warning"
                showIcon
                message="Có mốc lịch VIOLATION — cần điều chỉnh lịch khi xác nhận"
                description={
                  <Space direction="vertical" size={8}>
                    {blockReason && <Text>{blockReason}</Text>}
                    <Space wrap>
                      <Button
                        size="small"
                        type={adjustWithExtend ? 'primary' : 'default'}
                        onClick={() => {
                          setAdjustWithExtend(true);
                          setShowDetail(true);
                          if (newRegEnd?.isValid() && extendMinPrelimDay) {
                            const prelim = extendMinPrelimDay.hour(8).minute(0).second(0);
                            setNewExamAt(prelim);
                            applyDefaultsFromPrelim(prelim, extendWsDay, extendKoDay);
                          }
                        }}
                      >
                        Điều chỉnh lịch kèm theo
                      </Button>
                      {typeof onSwitchToAdjust === 'function' && (
                        <Button
                          size="small"
                          onClick={() => {
                            onCancel?.();
                            onSwitchToAdjust();
                          }}
                        >
                          Điều chỉnh tay
                        </Button>
                      )}
                    </Space>
                  </Space>
                }
              />
            )}

            {adjustWithExtend && (
              <>
                <div>
                  <Text strong>Giờ thi Sơ loại (cascade lịch)</Text>
                  <DatePicker
                    showTime
                    format="DD/MM/YYYY HH:mm"
                    style={{ width: '100%', marginTop: 8 }}
                    value={newExamAt}
                    onChange={(v) => {
                      setNewExamAt(v);
                      if (v) applyDefaultsFromPrelim(v, extendWsDay, extendKoDay);
                    }}
                    disabled={confirmLoading}
                    disabledDate={(current) => {
                      if (!current) return false;
                      if (current.isBefore(dayjs().startOf('day'))) return true;
                      if (extendMinPrelimDay && current.isBefore(extendMinPrelimDay)) return true;
                      return false;
                    }}
                    placeholder={
                      extendMinPrelimDay
                        ? `Từ ${extendMinPrelimDay.format('DD/MM/YYYY')} trở đi`
                        : 'Chọn giờ thi'
                    }
                  />
                </div>
                <Button type="link" style={{ padding: 0 }} onClick={() => setShowDetail((v) => !v)}>
                  {showDetail
                    ? 'Ẩn chỉnh chi tiết'
                    : 'Chỉnh chi tiết Workshop / Khai mạc / Chung kết / Lễ trao giải'}
                </Button>
                {showDetail && extendWsDay && extendKoDay && (
                  <Space direction="vertical" size={10} style={{ width: '100%' }}>
                    <div>
                      <Text type="secondary">Workshop — ngày {extendWsDay.format('DD/MM/YYYY')}</Text>
                      <DatePicker
                        showTime
                        format="DD/MM/YYYY HH:mm"
                        style={{ width: '100%', marginTop: 4 }}
                        value={wsStart}
                        onChange={setWsStart}
                        disabledDate={(d) => d && !d.isSame(extendWsDay, 'day')}
                      />
                    </div>
                    <div>
                      <Text type="secondary">Khai mạc — ngày {extendKoDay.format('DD/MM/YYYY')}</Text>
                      <DatePicker
                        showTime
                        format="DD/MM/YYYY HH:mm"
                        style={{ width: '100%', marginTop: 4 }}
                        value={koStart}
                        onChange={setKoStart}
                        disabledDate={(d) => d && !d.isSame(extendKoDay, 'day')}
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
                  </Space>
                )}
              </>
            )}

            {localError && <Alert type="error" showIcon message={localError} />}
            {previewError && <Alert type="error" showIcon message={previewError} />}
            {blockReason && !hasViolation && (
              <Alert type="warning" showIcon message={blockReason} />
            )}
            {suggestions?.length > 0 && (
              <Alert
                type="info"
                showIcon
                message="Gợi ý điều chỉnh"
                description={
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {suggestions.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                }
              />
            )}

            <Spin spinning={previewLoading}>
              <Text strong>Khoảng cách mốc lịch so với hạn ĐK mới</Text>
              <Table
                size="small"
                pagination={false}
                style={{ marginTop: 8 }}
                rowKey={(r) => r.key || r.label}
                dataSource={milestones}
                locale={{ emptyText: previewLoading ? 'Đang tải…' : 'Chọn hạn đăng ký để xem trước' }}
                columns={[
                  {
                    title: 'Mốc',
                    dataIndex: 'label',
                    key: 'label',
                    render: (v, r) => FRIENDLY_LABELS[r.key] || v || r.key,
                  },
                  {
                    title: 'Ngày',
                    dataIndex: 'date',
                    key: 'date',
                    render: (v) => formatDisplayDate(v),
                  },
                  {
                    title: 'Cách hạn mới',
                    dataIndex: 'daysFromNewRegEnd',
                    key: 'days',
                    render: (v, r) => {
                      const days = v ?? r.days_from_new_reg_end;
                      return days == null ? '—' : `${days} ngày`;
                    },
                  },
                  {
                    title: 'Trạng thái',
                    dataIndex: 'status',
                    key: 'status',
                    render: (v, r) => {
                      const status = String(v ?? r.Status ?? '').toUpperCase();
                      return (
                        <Tag color={MILESTONE_STATUS_COLOR[status] || 'default'}>
                          {status || '—'}
                        </Tag>
                      );
                    },
                  },
                ]}
              />
            </Spin>
          </>
        ) : (
          <>
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
            {scheduleBlockReason && mode === 'adjust' && (
              <Alert type="warning" showIcon message={scheduleBlockReason} />
            )}

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
          </>
        )}
      </Space>
    </Modal>
  );
};

export default CompetitionScheduleAdjustModal;
