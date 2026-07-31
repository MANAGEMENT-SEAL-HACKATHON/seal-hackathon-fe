export const UNIQUE_EVENT_TYPES = ['KICKOFF', 'WORKSHOP', 'AWARDS', 'BUFFET'];

export const EVENT_TYPE_LABELS = {
  KICKOFF: 'Lễ khai mạc',
  WORKSHOP: 'Workshop',
  PRESENTATION: 'Buổi thuyết trình',
  AWARDS: 'Lễ trao giải',
  BUFFET: 'Buffet giải lao',
  OTHER: 'Khác',
};

export const hasEventType = (events, type) =>
  (events || []).some((e) => e.type === type);

export const isFirstEventCreation = (events) => !(events || []).length;

const hasPrelimAndFinalRounds = (rounds) => {
  const list = rounds || [];
  const hasPrelim = list.some((r) => {
    if (r.is_final || r.isFinal) return false;
    return Boolean(r.exam_at || r.examAt);
  });
  const hasFinal = list.some((r) => {
    if (!(r.is_final || r.isFinal)) return false;
    return Boolean(r.exam_at || r.examAt);
  });
  return hasPrelim && hasFinal;
};

/** Lần đầu chỉ được tạo Khai mạc; các lần sau ẩn loại đã có (KICKOFF/WORKSHOP/AWARDS/BUFFET tối đa 1). */
export const getCreatableEventTypes = (events, rounds = []) => {
  const list = events || [];

  if (!list.length) {
    return ['KICKOFF'];
  }

  const types = [];

  if (!hasEventType(list, 'KICKOFF')) {
    types.push('KICKOFF');
  }

  if (!hasEventType(list, 'WORKSHOP') && hasEventType(list, 'KICKOFF')) {
    types.push('WORKSHOP');
  }

  if (!hasEventType(list, 'BUFFET') && hasPrelimAndFinalRounds(rounds)) {
    types.push('BUFFET');
  }

  types.push('OTHER');

  if (!hasEventType(list, 'AWARDS')) {
    types.push('AWARDS');
  }

  return types;
};

export const getDefaultEventType = (events, rounds = []) => {
  const creatable = getCreatableEventTypes(events, rounds);
  return creatable[0] || 'OTHER';
};

export const getEventTypeOptionLabel = (type, events) => {
  switch (type) {
    case 'KICKOFF':
      return 'Lễ khai mạc';
    case 'WORKSHOP':
      return 'Workshop';
    case 'PRESENTATION':
      return 'Buổi thuyết trình';
    case 'AWARDS':
      return 'Lễ trao giải';
    case 'BUFFET':
      return 'Buffet giải lao';
    case 'OTHER':
      return 'Khác';
    default:
      return type;
  }
};
