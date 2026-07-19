const norm = (value) => String(value ?? '').trim().toUpperCase();

export const getPersonRole = (person) => norm(person?.role);

export const getPersonUserType = (person) => norm(person?.userType ?? person?.user_type);

export const isInternalPerson = (person) => getPersonUserType(person) === 'INTERNAL';

export const isExternalPerson = (person) => getPersonUserType(person) === 'EXTERNAL';

/** Sơ loại: INTERNAL judge/mentor — không EXTERNAL; assignment type luôn NORMAL */
export const isEligibleForPrelimJudge = (person) => {
  if (!person) return false;
  if (!isInternalPerson(person)) return false;
  const role = getPersonRole(person);
  return role === 'JUDGE' || role === 'MENTOR';
};

/** Chung kết: NORMAL = INTERNAL judge; FINAL_EXTERNAL = guest judge đã APPROVED */
export const isEligibleForFinalJudge = (person, assignmentType = 'FINAL_EXTERNAL') => {
  if (!person) return false;
  if (getPersonRole(person) === 'MENTOR') return false;
  const type = norm(assignmentType);
  if (type === 'NORMAL') {
    return getPersonRole(person) === 'JUDGE' && isInternalPerson(person);
  }
  if (type !== 'FINAL_EXTERNAL') return false;
  if (isInternalPerson(person)) return false;
  if (getPersonRole(person) !== 'JUDGE' || !isExternalPerson(person)) return false;
  const status = norm(person?.status);
  const mustChange =
    person?.mustChangePassword === true || person?.must_change_password === true;
  if (status !== 'APPROVED' || mustChange) return false;
  return true;
};

/** Prelim assignment type — luôn NORMAL (BE từ chối HEAD). */
export const resolvePrelimAssignmentType = () => 'NORMAL';

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

export const isEligibleForMentor = (person) => isEligibleForPrelimJudge(person);

export const buildMentorPool = (mentors = [], judges = []) =>
  dedupePersonnelById([...mentors, ...judges]).filter(isEligibleForMentor);

export const buildFinalJudgePool = (judges = [], tempJudges = [], assignmentType = 'FINAL_EXTERNAL') =>
  dedupePersonnelById([...judges, ...tempJudges]).filter((person) =>
    isEligibleForFinalJudge(person, assignmentType),
  );

export const formatJudgeRoleLabel = (role) => {
  switch (norm(role)) {
    case 'HEAD':
      return 'Giám khảo'; // legacy display
    case 'FINAL_EXTERNAL':
      return 'Giám khảo khách';
    case 'NORMAL':
      return 'Giám khảo';
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
