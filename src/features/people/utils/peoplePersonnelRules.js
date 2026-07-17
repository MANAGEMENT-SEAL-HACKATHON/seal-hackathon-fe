const norm = (value) => String(value ?? '').trim().toUpperCase();

export const getPersonRole = (person) => norm(person?.role);

export const getPersonUserType = (person) => norm(person?.userType ?? person?.user_type);

export const isDeptHead = (person) => Boolean(person?.isDeptHead ?? person?.is_dept_head);

export const isInternalPerson = (person) => getPersonUserType(person) === 'INTERNAL';

export const isExternalPerson = (person) => getPersonUserType(person) === 'EXTERNAL';

/** Sơ loại: INTERNAL judge/mentor hoặc trưởng ban — không EXTERNAL */
export const isEligibleForPrelimJudge = (person) => {
  if (!person) return false;
  if (isDeptHead(person)) return true;
  if (!isInternalPerson(person)) return false;
  const role = getPersonRole(person);
  return role === 'JUDGE' || role === 'MENTOR';
};

/** Chung kết: EXTERNAL judge hoặc trưởng ban — không mentor, không INTERNAL thường.
 * Guest judge phải APPROVED và không còn mustChangePassword. */
export const isEligibleForFinalJudge = (person) => {
  if (!person) return false;
  if (isDeptHead(person)) return true;
  if (getPersonRole(person) === 'MENTOR') return false;
  if (isInternalPerson(person)) return false;
  if (getPersonRole(person) !== 'JUDGE' || !isExternalPerson(person)) return false;
  const status = norm(person?.status);
  const mustChange =
    person?.mustChangePassword === true || person?.must_change_password === true;
  if (status !== 'APPROVED' || mustChange) return false;
  return true;
};

export const resolvePrelimAssignmentType = (person) =>
  isDeptHead(person) ? 'HEAD' : 'NORMAL';

export const resolveFinalAssignmentType = (person) =>
  isDeptHead(person) ? 'HEAD' : 'FINAL_EXTERNAL';

export const dedupePersonnelById = (list = []) => {
  const seen = new Set();
  return list.filter((person) => {
    const id = person?.id;
    if (id == null || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export const buildPrelimJudgePool = (mentors = [], judges = []) =>
  dedupePersonnelById([...mentors, ...judges]).filter(isEligibleForPrelimJudge);

/**
 * Mentor Sơ loại đủ điều kiện: INTERNAL judge/mentor hoặc trưởng ban.
 * BE (PersonnelAssignmentRules) cho phép cả user role=JUDGE làm mentor (khác track),
 * nên pool mentor phải đối xứng với pool prelim judge — không chỉ role=MENTOR.
 */
export const isEligibleForMentor = (person) => isEligibleForPrelimJudge(person);

export const buildMentorPool = (mentors = [], judges = []) =>
  dedupePersonnelById([...mentors, ...judges]).filter(isEligibleForMentor);

export const buildFinalJudgePool = (judges = [], tempJudges = []) =>
  dedupePersonnelById([...judges, ...tempJudges]).filter(isEligibleForFinalJudge);

export const formatJudgeRoleLabel = (role) => {
  switch (norm(role)) {
    case 'HEAD':
      return 'Trưởng ban';
    case 'FINAL_EXTERNAL':
      return 'Giám khảo khách CK';
    case 'NORMAL':
      return 'Giám khảo';
    case 'CALIBRATION':
      return 'Chấm chéo';
    default:
      return 'Giám khảo';
  }
};

export const formatPersonRoleLabel = (role) => {
  switch (norm(role)) {
    case 'JUDGE':
      return 'Giám khảo';
    case 'MENTOR':
      return 'Mentor';
    case 'COORDINATOR':
      return 'Điều phối';
    default:
      return role || 'Nhân sự';
  }
};

export const findPersonById = (personId, pools = []) => {
  for (const pool of pools) {
    const found = pool.find((p) => p.id === personId);
    if (found) return found;
  }
  return null;
};
