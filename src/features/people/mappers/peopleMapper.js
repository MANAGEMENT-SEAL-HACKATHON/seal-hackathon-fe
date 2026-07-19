export const mapTempJudgeToFE = (beData) => {
  if (!beData) return null;
  return {
    id: beData.id,
    name: beData.name,
    email: beData.email,
    institution: beData.institution,
    status: beData.status || 'PENDING',
    role: 'JUDGE'
  };
};

export const mapAssignmentToFE = (beData) => {
  if (!beData) return null;
  return {
    id: beData.id,
    hackathon_id: beData.hackathonId,
    person_id: beData.userId || beData.judgeId || beData.mentorId,
    track_id: beData.trackId,
    round_id: beData.roundId,
    type: beData.type, // 'MENTOR' hoặc 'JUDGE'
    assignment_type: beData.assignmentType || 'NORMAL', // 'NORMAL' | 'FINAL_EXTERNAL' (legacy 'HEAD' display-only)
  };
};

export const mapAssignmentToBE = (feData) => {
  if (!feData) return null;
  return {
    userId: feData.person_id,
    judgeId: feData.person_id, // Cho API Judge
    mentorId: feData.person_id, // Cho API Mentor
    trackId: feData.track_id,
    roundId: feData.round_id,
    assignmentType: feData.assignment_type || 'NORMAL'
  };
};