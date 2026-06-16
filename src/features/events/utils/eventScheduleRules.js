import dayjs from 'dayjs';

const DATE_FMT = 'DD/MM/YYYY';
const TIME_FMT = 'HH:mm';

const buildDisabledTimeForMin = (minMoment) => {
  if (!minMoment) return {};
  return {
    disabledHours: () => Array.from({ length: 24 }, (_, h) => h).filter((h) => h < minMoment.hour()),
    disabledMinutes: (selectedHour) => {
      if (selectedHour === minMoment.hour()) {
        return Array.from({ length: 60 }, (_, m) => m).filter((m) => m < minMoment.minute());
      }
      return [];
    },
    disabledSeconds: (selectedHour, selectedMinute) => {
      if (selectedHour === minMoment.hour() && selectedMinute === minMoment.minute()) {
        return Array.from({ length: 60 }, (_, s) => s).filter((s) => s < minMoment.second());
      }
      return [];
    },
  };
};

export const buildEventScheduleContext = ({ hackathon, rounds, events, selectedType }) => {
  const regEnd = hackathon?.registration_end ? dayjs(hackathon.registration_end) : null;
  const regEndDay = regEnd ? regEnd.startOf('day') : null;
  const hEvStart = hackathon?.event_start ? dayjs(hackathon.event_start).startOf('day') : null;
  const hEvEnd = hackathon?.event_end ? dayjs(hackathon.event_end).endOf('day') : null;

  const sortedRounds = [...(rounds || [])].sort(
    (a, b) => dayjs(a.exam_at || a.examAt).valueOf() - dayjs(b.exam_at || b.examAt).valueOf()
  );
  const firstRound = sortedRounds[0];
  const firstExamAt = firstRound?.exam_at || firstRound?.examAt;
  const firstExamDate = firstExamAt ? dayjs(firstExamAt).startOf('day') : hEvStart;

  const kickoffEvent = (events || []).find((e) => e.type === 'KICKOFF');
  const kickoffDay = kickoffEvent ? dayjs(kickoffEvent.starts_at).startOf('day') : null;

  const workshops = (events || []).filter((e) => e.type === 'WORKSHOP');
  const latestWorkshop = workshops.length
    ? workshops.sort((a, b) =>
        dayjs(b.ends_at || b.starts_at).diff(dayjs(a.ends_at || a.starts_at))
      )[0]
    : null;
  const latestWorkshopDay = latestWorkshop
    ? dayjs(latestWorkshop.ends_at || latestWorkshop.starts_at).startOf('day')
    : null;

  const requiredKickoffDay =
    firstExamDate && selectedType === 'KICKOFF'
      ? firstExamDate.subtract(1, 'day').startOf('day')
      : null;

  const finalRound = (rounds || []).find((r) => r.is_final || r.isFinal);

  return {
    selectedType,
    regEnd,
    regEndDay,
    hEvStart,
    hEvEnd,
    firstExamDate,
    requiredKickoffDay,
    kickoffDay,
    latestWorkshop,
    latestWorkshopDay,
    finalRound,
  };
};

export const isEventStartDateDisabled = (current, ctx) => {
  if (!current || !ctx?.selectedType) return false;

  const day = current.startOf('day');
  const now = dayjs();

  if (ctx.selectedType === 'WORKSHOP') {
    if (ctx.regEndDay && day.isBefore(ctx.regEndDay, 'day')) return true;
    if (ctx.kickoffDay && !day.isBefore(ctx.kickoffDay, 'day')) return true;
  }

  if (ctx.selectedType === 'KICKOFF') {
    if (ctx.requiredKickoffDay && !day.isSame(ctx.requiredKickoffDay, 'day')) return true;
    if (ctx.latestWorkshopDay && !day.isAfter(ctx.latestWorkshopDay, 'day')) return true;
  }

  if (ctx.selectedType === 'AWARDS') {
    const finalDeadline = ctx.finalRound?.submission_deadline || ctx.finalRound?.submissionDeadline;
    if (finalDeadline && day.isBefore(dayjs(finalDeadline).startOf('day'), 'day')) return true;
    if (ctx.hEvEnd && day.isAfter(ctx.hEvEnd, 'day')) return true;
  }

  if (ctx.selectedType === 'PRESENTATION' || ctx.selectedType === 'OTHER') {
    if (ctx.hEvStart && day.isBefore(ctx.hEvStart, 'day')) return true;
    if (ctx.hEvEnd && day.isAfter(ctx.hEvEnd, 'day')) return true;
  }

  if (day.isBefore(now.startOf('day'), 'day')) return true;

  return false;
};

export const isEventEndDateDisabled = (current, ctx, startsAt) => {
  if (isEventStartDateDisabled(current, ctx)) return true;
  if (startsAt && current.isBefore(dayjs(startsAt).startOf('day'), 'day')) return true;
  return false;
};

export const getEventStartDisabledTime = (current, ctx) => {
  if (!current || !ctx) return {};

  const now = dayjs();
  let minMoment = null;

  if (current.isSame(now, 'day')) {
    minMoment = now;
  }

  if (ctx.selectedType === 'WORKSHOP' && ctx.regEnd && current.isSame(ctx.regEnd, 'day')) {
    const regEndMoment = ctx.regEnd;
    if (!minMoment || regEndMoment.isAfter(minMoment)) {
      minMoment = regEndMoment;
    }
  }

  if (ctx.selectedType === 'KICKOFF' && ctx.latestWorkshop) {
    const wsEnd = dayjs(ctx.latestWorkshop.ends_at || ctx.latestWorkshop.starts_at);
    if (current.isSame(wsEnd, 'day') && wsEnd.isAfter(minMoment || dayjs(0))) {
      minMoment = wsEnd;
    }
  }

  return minMoment ? buildDisabledTimeForMin(minMoment) : {};
};

export const getEventEndDisabledTime = (current, startsAt) => {
  if (!current || !startsAt) {
    return {};
  }
  const start = dayjs(startsAt);
  if (!current.isSame(start, 'day')) {
    return {};
  }
  if (start.isAfter(dayjs(0))) {
    return buildDisabledTimeForMin(start.add(1, 'minute'));
  }
  return {};
};

export const getEventScheduleHint = (ctx) => {
  if (!ctx?.selectedType) {
    return 'Chọn loại sự kiện trước — hệ thống sẽ gợi ý ngày và giờ phù hợp.';
  }

  switch (ctx.selectedType) {
    case 'KICKOFF':
      if (ctx.requiredKickoffDay) {
        return `Khai mạc phải diễn ra ngày ${ctx.requiredKickoffDay.format(DATE_FMT)} (một ngày trước ngày thi). Chỉ chọn giờ trong ngày đó.`;
      }
      return 'Cần tạo vòng Sơ loại trước để hệ thống xác định ngày khai mạc.';

    case 'WORKSHOP':
      if (ctx.kickoffDay) {
        return `Workshop đặt sau hạn đăng ký và trước ngày khai mạc (${ctx.kickoffDay.format(DATE_FMT)}). Không trùng ngày với khai mạc.`;
      }
      if (ctx.regEndDay) {
        return `Workshop đặt từ ngày ${ctx.regEndDay.add(1, 'day').format(DATE_FMT)} trở đi (sau khi hết đăng ký). Tạo khai mạc trước nếu chưa có.`;
      }
      return 'Workshop thường tổ chức sau khi kết thúc đăng ký và trước lễ khai mạc.';

    case 'AWARDS':
      return 'Lễ trao giải đặt sau khi vòng Chung kết kết thúc, trong khung thời gian của kỳ thi.';

    case 'PRESENTATION':
      return 'Buổi thuyết trình nằm trong thời gian diễn ra kỳ thi.';

    default:
      return 'Chọn ngày và giờ nằm trong khung thời gian kỳ thi.';
  }
};

export const getSuggestedEventStart = (ctx) => {
  if (ctx?.selectedType === 'KICKOFF' && ctx.requiredKickoffDay) {
    const base = ctx.requiredKickoffDay.hour(9).minute(0).second(0);
    return base.isBefore(dayjs()) ? dayjs().add(30, 'minute').startOf('minute') : base;
  }
  return null;
};

export const formatMoment = (value, withTime = true) => {
  if (!value) return '';
  return withTime ? dayjs(value).format(`${DATE_FMT} ${TIME_FMT}`) : dayjs(value).format(DATE_FMT);
};
