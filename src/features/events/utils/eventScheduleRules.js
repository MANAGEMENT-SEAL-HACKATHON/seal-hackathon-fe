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
  const buffetBounds = getBuffetBreakBounds(rounds);

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
    buffetBreakStart: buffetBounds?.breakStart ?? null,
    buffetBreakEnd: buffetBounds?.breakEnd ?? null,
    prelimRound: buffetBounds?.prelim ?? null,
  };
};

/** Khớp BE: DEFAULT_PRELIM_CODING_HOURS khi codingDurationHours null/≤0. */
const DEFAULT_PRELIM_CODING_HOURS = 7;

const getRoundExamAt = (round) => round?.exam_at || round?.examAt || null;

/** Buffet window [prelimEnd, final.examAt], prelimEnd = examAt + codingDurationHours. */
export const getBuffetBreakBounds = (rounds) => {
  const list = rounds || [];
  const finalRound = list.find((r) => r.is_final || r.isFinal);
  const prelim =
    list.find((r) => !(r.is_final || r.isFinal) && getRoundExamAt(r))
    || [...list]
      .filter((r) => !(r.is_final || r.isFinal))
      .sort((a, b) => dayjs(getRoundExamAt(a)).valueOf() - dayjs(getRoundExamAt(b)).valueOf())[0]
    || null;

  const prelimExam = getRoundExamAt(prelim);
  const finalExam = getRoundExamAt(finalRound);
  if (!prelimExam || !finalExam) return null;

  let hours = Number(prelim.coding_duration_hours ?? prelim.codingDurationHours ?? 0);
  if (!hours || hours <= 0) hours = DEFAULT_PRELIM_CODING_HOURS;

  return {
    prelim,
    finalRound,
    breakStart: dayjs(prelimExam).add(hours, 'hour'),
    breakEnd: dayjs(finalExam),
  };
};

export const isPrelimPublished = (rounds) => {
  const bounds = getBuffetBreakBounds(rounds);
  const prelim = bounds?.prelim;
  if (!prelim) {
    const fallback = (rounds || []).find((r) => !(r.is_final || r.isFinal));
    return Boolean(fallback?.is_published ?? fallback?.isPublished);
  }
  return Boolean(prelim.is_published ?? prelim.isPublished);
};

/** Mốc sớm nhất cho AWARDS: publishedAt → scoringLockedAt → kế hoạch sau CK */
export const getAwardsMinMoment = (ctx) => {
  const fr = ctx?.finalRound;
  if (!fr) return null;
  const published = fr.published_at ?? fr.publishedAt;
  if (published) return dayjs(published);
  const locked = fr.scoring_locked_at ?? fr.scoringLockedAt;
  if (locked) return dayjs(locked);
  const exam = fr.exam_at ?? fr.examAt;
  if (!exam) return null;
  const codingHours = Number(fr.coding_duration_hours ?? fr.codingDurationHours ?? 0);
  const presMin = Number(fr.default_presentation_minutes ?? fr.defaultPresentationMinutes ?? 10);
  const qaMin = Number(fr.default_qa_minutes ?? fr.defaultQaMinutes ?? 5);
  const presentationBuffer = (presMin + qaMin) * 4;
  return dayjs(exam).add(codingHours, 'hour').add(presentationBuffer, 'minute');
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
    const minMoment = getAwardsMinMoment(ctx);
    const awardsDay = ctx.hEvEnd?.startOf('day') ?? minMoment?.startOf('day');
    if (awardsDay && !day.isSame(awardsDay, 'day')) return true;
    if (minMoment && day.isBefore(minMoment.startOf('day'), 'day')) return true;
    if (ctx.hEvEnd && day.isAfter(ctx.hEvEnd, 'day')) return true;
  }

  if (ctx.selectedType === 'BUFFET') {
    if (!ctx.buffetBreakStart || !ctx.buffetBreakEnd) return true;
    if (day.isBefore(ctx.buffetBreakStart.startOf('day'), 'day')) return true;
    if (day.isAfter(ctx.buffetBreakEnd.startOf('day'), 'day')) return true;
  }

  if (ctx.selectedType === 'OTHER') {
    if (ctx.hEvStart && day.isBefore(ctx.hEvStart, 'day')) return true;
    if (ctx.hEvEnd && day.isAfter(ctx.hEvEnd, 'day')) return true;
  }

  if (day.isBefore(now.startOf('day'), 'day')) return true;

  return false;
};

export const isEventEndDateDisabled = (current, ctx, startsAt) => {
  if (isEventStartDateDisabled(current, ctx)) return true;
  if (startsAt && current.isBefore(dayjs(startsAt).startOf('day'), 'day')) return true;
  if (
    ctx?.selectedType === 'BUFFET'
    && ctx.buffetBreakEnd
    && current.isAfter(ctx.buffetBreakEnd.startOf('day'), 'day')
  ) {
    return true;
  }
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

  if (ctx.selectedType === 'AWARDS') {
    const awardsMin = getAwardsMinMoment(ctx);
    if (awardsMin && current.isSame(awardsMin, 'day') && awardsMin.isAfter(minMoment || dayjs(0))) {
      minMoment = awardsMin;
    }
  }

  if (ctx.selectedType === 'BUFFET') {
    return buildDisabledTimeForRange(current, ctx.buffetBreakStart, ctx.buffetBreakEnd);
  }

  return minMoment ? buildDisabledTimeForMin(minMoment) : {};
};

const buildDisabledTimeForRange = (current, minBound, maxBound) => {
  if (!current) return {};
  let minMoment = null;
  let maxMoment = null;
  if (minBound && current.isSame(minBound, 'day')) minMoment = minBound;
  if (maxBound && current.isSame(maxBound, 'day')) maxMoment = maxBound;
  if (!minMoment && !maxMoment) return {};

  return {
    disabledHours: () => {
      const hours = [];
      for (let h = 0; h < 24; h += 1) {
        if (minMoment && h < minMoment.hour()) hours.push(h);
        if (maxMoment && h > maxMoment.hour()) hours.push(h);
      }
      return hours;
    },
    disabledMinutes: (selectedHour) => {
      const minutes = [];
      for (let m = 0; m < 60; m += 1) {
        if (minMoment && selectedHour === minMoment.hour() && m < minMoment.minute()) {
          minutes.push(m);
        }
        if (maxMoment && selectedHour === maxMoment.hour() && m > maxMoment.minute()) {
          minutes.push(m);
        }
      }
      return minutes;
    },
  };
};

export const getEventEndDisabledTime = (current, startsAt, ctx) => {
  if (!current) {
    return {};
  }

  let minMoment = null;
  let maxMoment = null;

  if (startsAt) {
    const start = dayjs(startsAt);
    if (current.isSame(start, 'day') && start.isAfter(dayjs(0))) {
      minMoment = start.add(1, 'minute');
    }
  }

  if (ctx?.selectedType === 'BUFFET' && ctx.buffetBreakEnd && current.isSame(ctx.buffetBreakEnd, 'day')) {
    maxMoment = ctx.buffetBreakEnd;
  }

  if (!minMoment && !maxMoment) return {};
  if (minMoment && !maxMoment) return buildDisabledTimeForMin(minMoment);
  return buildDisabledTimeForRange(current, minMoment, maxMoment);
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
      return 'Lễ trao giải đặt cùng ngày kết thúc kỳ thi, sau khi vòng Chung kết công bố kết quả (hoặc sau khóa chấm).';

    case 'BUFFET':
      if (ctx.buffetBreakStart && ctx.buffetBreakEnd) {
        return `Buffet giải lao phải nằm trong khung nghỉ ${ctx.buffetBreakStart.format(`${DATE_FMT} ${TIME_FMT}`)} – ${ctx.buffetBreakEnd.format(`${DATE_FMT} ${TIME_FMT}`)} (sau Sơ loại, trước Chung kết).`;
      }
      return 'Cần có vòng Sơ loại và Chung kết (đã có giờ thi) để chọn khung Buffet giải lao.';

    default:
      return 'Chọn ngày và giờ nằm trong khung thời gian kỳ thi.';
  }
};

export const getSuggestedEventStart = (ctx) => {
  if (ctx?.selectedType === 'KICKOFF' && ctx.requiredKickoffDay) {
    const base = ctx.requiredKickoffDay.hour(9).minute(0).second(0);
    return base.isBefore(dayjs()) ? dayjs().add(30, 'minute').startOf('minute') : base;
  }
  if (ctx?.selectedType === 'BUFFET' && ctx.buffetBreakStart) {
    const base = ctx.buffetBreakStart;
    return base.isBefore(dayjs()) ? dayjs().add(30, 'minute').startOf('minute') : base;
  }
  return null;
};

export const formatMoment = (value, withTime = true) => {
  if (!value) return '';
  return withTime ? dayjs(value).format(`${DATE_FMT} ${TIME_FMT}`) : dayjs(value).format(DATE_FMT);
};
