export const CRITERIA_TYPES = {
  TECHNICAL: 'TECHNICAL',
  SOFT_SKILL: 'SOFT_SKILL',
  PENALTY: 'PENALTY',
};

export const CRITERIA_COLORS = {
  TECHNICAL: 'blue',
  SOFT_SKILL: 'orange',
  PENALTY: 'red',
  DEFAULT: 'default',
};

export const MAX_WEIGHT_TOTAL = 1.0;
export const CRITERIA_TYPE_OPTIONS = Object.values(CRITERIA_TYPES);

export const formatCriteriaTypeLabel = (type) => {
  switch (String(type || '').toUpperCase()) {
    case CRITERIA_TYPES.TECHNICAL:
      return 'Kỹ thuật';
    case CRITERIA_TYPES.SOFT_SKILL:
      return 'Kỹ năng mềm';
    case CRITERIA_TYPES.PENALTY:
      return 'Điểm phạt';
    default:
      return type || '—';
  }
};