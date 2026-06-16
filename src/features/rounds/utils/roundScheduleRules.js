import dayjs from 'dayjs';

const MIN_DAYS_FROM_REG_END = 5;

const buildDisabledTimeForMin = (minMoment) => {
  if (!minMoment) return {};
  return {
    disabledHours: () =>
      Array.from({ length: 24 }, (_, h) => h).filter((h) => h < minMoment.hour()),
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

const buildDisabledTimeForMax = (maxMoment) => {
  if (!maxMoment) return {};
  return {
    disabledHours: () =>
      Array.from({ length: 24 }, (_, h) => h).filter((h) => h > maxMoment.hour()),
    disabledMinutes: (selectedHour) => {
      if (selectedHour === maxMoment.hour()) {
        return Array.from({ length: 60 }, (_, m) => m).filter((m) => m > maxMoment.minute());
      }
      return [];
    },
    disabledSeconds: (selectedHour, selectedMinute) => {
      if (selectedHour === maxMoment.hour() && selectedMinute === maxMoment.minute()) {
        return Array.from({ length: 60 }, (_, s) => s).filter((s) => s > maxMoment.second());
      }
      return [];
    },
  };
};

const mergeDisabledTime = (minMoment, maxMoment) => {
  if (!minMoment && !maxMoment) return {};

  const minRules = minMoment ? buildDisabledTimeForMin(minMoment) : null;
  const maxRules = maxMoment ? buildDisabledTimeForMax(maxMoment) : null;

  if (!maxRules) return minRules;
  if (!minRules) return maxRules;

  return {
    disabledHours: () => {
      const set = new Set([...minRules.disabledHours(), ...maxRules.disabledHours()]);
      return [...set].sort((a, b) => a - b);
    },
    disabledMinutes: (selectedHour) => {
      const set = new Set([
        ...(minRules.disabledMinutes(selectedHour) || []),
        ...(maxRules.disabledMinutes(selectedHour) || []),
      ]);
      return [...set].sort((a, b) => a - b);
    },
    disabledSeconds: (selectedHour, selectedMinute) => {
      const set = new Set([
        ...(minRules.disabledSeconds(selectedHour, selectedMinute) || []),
        ...(maxRules.disabledSeconds(selectedHour, selectedMinute) || []),
      ]);
      return [...set].sort((a, b) => a - b);
    },
  };
};

export const getPreliminaryEndMoment = (prelimRound) => {
  if (!prelimRound?.exam_at) return null;
  const exam = dayjs(prelimRound.exam_at);
  const hours = prelimRound.coding_duration_hours;
  if (hours && hours > 0) {
    return exam.add(hours, 'hour');
  }
  return exam;
};

export const buildRoundScheduleContext = ({
  hackathon,
  prelimRound,
  finalRound,
  isFinal,
  examAt,
  codingDurationHours,
  submissionOpen,
}) => ({
  hackathon,
  prelimRound,
  finalRound,
  isFinal,
  examAt: examAt ? dayjs(examAt) : null,
  codingDurationHours,
  submissionOpen: submissionOpen ? dayjs(submissionOpen) : null,
  now: dayjs(),
});

export const isRoundDateDisabled = (current, ctx) => {
  if (!current) return false;

  let minDate = ctx.now.startOf('day');
  if (ctx.hackathon?.registration_end) {
    const regMin = dayjs(ctx.hackathon.registration_end)
      .add(MIN_DAYS_FROM_REG_END, 'day')
      .startOf('day');
    if (regMin.isAfter(minDate)) {
      minDate = regMin;
    }
  }
  if (current.isBefore(minDate, 'day')) return true;

  if (ctx.isFinal && ctx.prelimRound?.exam_at) {
    const prelimEnd = getPreliminaryEndMoment(ctx.prelimRound);
    if (prelimEnd && current.isBefore(prelimEnd.startOf('day'), 'day')) return true;
  }

  if (!ctx.isFinal && ctx.finalRound?.exam_at) {
    if (current.isAfter(dayjs(ctx.finalRound.exam_at), 'day')) return true;
    if (ctx.finalRound.submission_open) {
      if (current.isAfter(dayjs(ctx.finalRound.submission_open).endOf('day'), 'day')) return true;
    }
  }

  return false;
};

export const getRoundExamDisabledTime = (current, ctx) => {
  if (!current) return {};

  let minMoment = null;
  let maxMoment = null;

  if (current.isSame(ctx.now, 'day') && ctx.now.isAfter(dayjs(0))) {
    minMoment = ctx.now;
  }

  if (ctx.isFinal && ctx.prelimRound) {
    const prelimEnd = getPreliminaryEndMoment(ctx.prelimRound);
    if (prelimEnd) {
      if (current.isSame(prelimEnd, 'day')) {
        if (!minMoment || prelimEnd.isAfter(minMoment)) {
          minMoment = prelimEnd;
        }
      }
    } else if (ctx.prelimRound.exam_at) {
      const prelimExam = dayjs(ctx.prelimRound.exam_at);
      if (current.isSame(prelimExam, 'day')) {
        const afterPrelim = prelimExam.add(1, 'minute');
        if (!minMoment || afterPrelim.isAfter(minMoment)) {
          minMoment = afterPrelim;
        }
      }
    }
  }

  if (!ctx.isFinal && ctx.finalRound?.exam_at) {
    const finalExam = dayjs(ctx.finalRound.exam_at);
    if (current.isSame(finalExam, 'day')) {
      const beforeFinal = finalExam.subtract(1, 'minute');
      maxMoment = beforeFinal;
    }
  }

  return mergeDisabledTime(minMoment, maxMoment);
};

export const getRoundSubmissionOpenDisabledTime = (current, ctx) => {
  if (!current) return {};

  let minMoment = current.isSame(ctx.now, 'day') ? ctx.now : null;
  let maxMoment = null;

  if (ctx.examAt && current.isSame(ctx.examAt, 'day')) {
    const afterExam = ctx.examAt.add(1, 'minute');
    if (!minMoment || afterExam.isAfter(minMoment)) {
      minMoment = afterExam;
    }
  }

  if (!ctx.isFinal && ctx.finalRound?.exam_at) {
    const finalExam = dayjs(ctx.finalRound.exam_at);
    if (current.isSame(finalExam, 'day')) {
      maxMoment = finalExam.subtract(1, 'minute');
    }
  }

  return mergeDisabledTime(minMoment, maxMoment);
};

export const getRoundSubmissionDeadlineDisabledTime = (current, ctx) => {
  if (!current) return {};

  let minMoment = current.isSame(ctx.now, 'day') ? ctx.now : null;

  if (ctx.submissionOpen && current.isSame(ctx.submissionOpen, 'day')) {
    const afterOpen = ctx.submissionOpen.add(1, 'minute');
    if (!minMoment || afterOpen.isAfter(minMoment)) {
      minMoment = afterOpen;
    }
  } else if (ctx.examAt && current.isSame(ctx.examAt, 'day')) {
    const afterExam = ctx.examAt.add(1, 'minute');
    if (!minMoment || afterExam.isAfter(minMoment)) {
      minMoment = afterExam;
    }
  }

  let maxMoment = null;
  if (!ctx.isFinal && ctx.finalRound?.exam_at) {
    const finalExam = dayjs(ctx.finalRound.exam_at);
    if (current.isSame(finalExam, 'day') || current.isAfter(finalExam, 'day')) {
      maxMoment = finalExam.subtract(1, 'minute');
    }
  }

  return mergeDisabledTime(minMoment, maxMoment);
};

export const getRoundScheduleHint = (ctx) => {
  if (ctx.isFinal) {
    const prelimEnd = ctx.prelimRound ? getPreliminaryEndMoment(ctx.prelimRound) : null;
    if (prelimEnd) {
      return `Vòng Chung kết phải bắt đầu từ ${prelimEnd.format('DD/MM/YYYY HH:mm')} trở đi (sau khi Sơ loại kết thúc). Cùng ngày thì chỉ chọn giờ sau mốc này.`;
    }
    if (ctx.prelimRound?.exam_at) {
      return `Vòng Chung kết phải diễn ra sau ngày giờ thi Sơ loại (${dayjs(ctx.prelimRound.exam_at).format('DD/MM/YYYY HH:mm')}).`;
    }
    return 'Tạo vòng Sơ loại trước để hệ thống khóa ngày và giờ phù hợp.';
  }

  if (ctx.finalRound?.exam_at) {
    return `Vòng Sơ loại phải kết thúc trước Chung kết (${dayjs(ctx.finalRound.exam_at).format('DD/MM/YYYY HH:mm')}). Cùng ngày thì không chọn giờ trùng hoặc sau giờ CK.`;
  }

  if (ctx.hackathon?.registration_end) {
    const minDay = dayjs(ctx.hackathon.registration_end).add(MIN_DAYS_FROM_REG_END, 'day');
    return `Ngày thi Sơ loại từ ${minDay.format('DD/MM/YYYY')} trở đi (hết đăng ký + ${MIN_DAYS_FROM_REG_END} ngày).`;
  }

  return 'Chọn ngày và giờ thi — hệ thống tự khóa các mốc không hợp lệ.';
};

