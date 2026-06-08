export const UNIQUE_EVENT_TYPES = ['KICKOFF', 'WORKSHOP', 'AWARDS'];

export const EVENT_TYPE_LABELS = {
  KICKOFF: 'Lễ khai mạc',
  WORKSHOP: 'Workshop',
  PRESENTATION: 'Buổi thuyết trình',
  AWARDS: 'Lễ trao giải',
  OTHER: 'Khác',
};

export const hasEventType = (events, type) =>
  (events || []).some((e) => e.type === type);

export const isFirstEventCreation = (events) => !(events || []).length;

/** Lần đầu chỉ được tạo Khai mạc; các lần sau ẩn loại đã có (KICKOFF/WORKSHOP/AWARDS tối đa 1). */
export const getCreatableEventTypes = (events) => {
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

  types.push('PRESENTATION', 'OTHER');

  if (!hasEventType(list, 'AWARDS')) {
    types.push('AWARDS');
  }

  return types;
};

export const getDefaultEventType = (events) => {
  const creatable = getCreatableEventTypes(events);
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
    case 'OTHER':
      return 'Khác';
    default:
      return type;
  }
};
