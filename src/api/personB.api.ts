import axiosClient from '../shared/api/axiosClient';

const mapSubmissionStatusToFe = (beStatus?: string): 'ON_TIME' | 'LATE_PENDING' | 'REJECTED' | 'NONE' => {
  if (!beStatus) return 'NONE';
  if (['SUBMITTED', 'LATE', 'ACCEPTED', 'LATE_APPROVED'].includes(beStatus)) {
    return 'ON_TIME';
  }
  if (beStatus === 'LATE_PENDING') return 'LATE_PENDING';
  if (beStatus === 'REJECTED') return 'REJECTED';
  return 'NONE';
};

const resolveActiveRoundId = async (): Promise<number | null> => {
  try {
    const deadline = await axiosClient.get<any, { roundId?: number }>(
      '/api/v1/me/rounds/current/deadline'
    );
    if (deadline?.roundId) return Number(deadline.roundId);
  } catch (err: any) {
    if (err?.status === 404 || err?.response?.status === 404) {
      return null;
    }
  }

  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const role = userInfo.role || userInfo.userRole;
    if (role === 'MENTOR') {
      const rounds = await axiosClient.get<any, any[]>('/api/v1/me/mentor/rounds');
      const list = Array.isArray(rounds) ? rounds : [];
      const active = list.find((r) => r.status === 'ACTIVE') || list[0];
      if (active?.roundId) return Number(active.roundId);
    }
  } catch {
    // ignore
  }

  return null;
};

const mapAssignedTeamItem = (item: any) => ({
  team_id: String(item.teamId ?? item.team_id),
  team_name: item.teamName ?? item.team_name,
  assigned_group: item.assignedGroup ?? item.assigned_group ?? `Nhóm ${item.groupNumber ?? 'A'}`,
  status: item.status || 'ACTIVE',
  group_number: item.groupNumber ?? item.group_number,
  presentation_schedule: item.presentationSchedule ?? item.presentation_schedule,
  location: item.location,
});

const mapPresentationQueue = (data: any): PresentationQueueResponse => {
  const groups = (data?.groups || []).map((g: any) => ({
    group_name: g.groupName ?? g.group_name,
    teams: (g.teams || []).map((t: any) => ({
      team_id: String(t.teamId ?? t.team_id),
      team_name: t.teamName ?? t.team_name,
      order: t.order ?? 0,
      status: (t.status || 'WAITING') as QueueTeam['status'],
      presentation_schedule: t.presentationSchedule ?? t.presentation_schedule,
      location: t.location,
      slot_start_at: t.slotStartAt ?? t.slot_start_at,
      slot_end_at: t.slotEndAt ?? t.slot_end_at,
    })),
  }));

  return {
    groups,
    room_stats: data?.roomStats ?? data?.room_stats,
  };
};

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface AssignedTeam {
  team_id: string;
  team_name: string;
  assigned_group: string;
  status: string;
  group_number?: string | number;
  presentation_schedule?: string;
  location?: string;
}

export interface AssignedTeamsResponse {
  round: string;
  teams: AssignedTeam[];
}

export interface SubmissionRequest {
  repo_url: string;
  demo_url?: string;
  slide_url: string;
}

export interface SubmissionResponse {
  status: 'ON_TIME' | 'LATE_PENDING' | 'REJECTED';
  submitted_at: string;
  repo_url?: string;
  demo_url?: string;
  slide_url?: string;
}

export interface SubmissionStatusResponse {
  status: 'ON_TIME' | 'LATE_PENDING' | 'REJECTED' | 'NONE';
  submitted_at?: string;
  repo_url?: string;
  demo_url?: string;
  slide_url?: string;
}

export interface DeadlineResponse {
  deadline?: string;
  round_id?: string;
}

export interface LateSubmission {
  submission_id: string;
  team_id: string;
  team_name: string;
  repo_url: string;
  slide_url: string;
  demo_url?: string;
  submitted_at: string;
  status: 'LATE_PENDING';
}

export interface RejectSubmissionRequest {
  reason: string;
}

export interface QueueTeam {
  team_id: string;
  team_name: string;
  order: number;
  status: 'WAITING' | 'PRESENTING' | 'DONE' | 'ELIMINATED';
  presentation_schedule?: string;
  location?: string;
  slot_start_at?: string;
  slot_end_at?: string;
}

export interface QueueGroup {
  group_name: string;
  teams: QueueTeam[];
}

export interface PresentationQueueResponse {
  groups: QueueGroup[];
  room_stats?: { total?: number; done?: number; absent?: number };
}

// ==========================================
// API IMPLEMENTATIONS — GĐ3 mapping
// ==========================================

export const personBApi = {
  /** GET /api/v1/me/mentor/rounds/{roundId}/assigned-teams */
  getAssignedTeams: async (_mentorId?: string | number, roundId?: string | number): Promise<AssignedTeamsResponse> => {
    if (!roundId) {
      throw new Error('roundId là bắt buộc để lấy danh sách đội được phân công.');
    }

    const data = await axiosClient.get<any, any>(
      `/api/v1/me/mentor/rounds/${roundId}/assigned-teams`
    );
    let teams = (data?.teams || []).map(mapAssignedTeamItem);

    // Fallback §7.1: mentor chỉ gán theo track (GĐ1) → lấy từ danh sách vòng
    if (!teams.length) {
      const rounds = await axiosClient.get<any, any[]>('/api/v1/me/mentor/rounds');
      const current = (rounds || []).find((r) => String(r.roundId) === String(roundId));
      if (current?.teams?.length) {
        teams = current.teams.map((t: any) =>
          mapAssignedTeamItem({
            teamId: t.teamId,
            teamName: t.teamName,
            status: 'ACTIVE',
            groupNumber: 1,
          })
        );
      }
    }

    return {
      round: data?.roundName || data?.round_name || 'Vòng thi hiện tại',
      teams,
    };
  },

  /** GET /api/v1/me/mentor/rounds */
  getMentorRounds: async (): Promise<any[]> => {
    const data = await axiosClient.get<any, any[]>('/api/v1/me/mentor/rounds');
    return data || [];
  },

  /** GET /api/v1/me/mentor-track-assignments */
  getMentorTrackAssignments: async (): Promise<any[]> => {
    const data = await axiosClient.get<any, any[]>('/api/v1/me/mentor-track-assignments');
    return Array.isArray(data) ? data : [];
  },

  /** GET /api/v1/me/teams — bootstrap teamId + trackId */
  getMyTeams: async (): Promise<any[]> => {
    const data = await axiosClient.get<any, any[]>('/api/v1/me/teams');
    return Array.isArray(data) ? data : [];
  },

  /** GET /api/v1/me/submission?teamId=&roundId= */
  getStudentSubmission: async (_studentId?: string | number): Promise<SubmissionStatusResponse> => {
    try {
      const teams = await personBApi.getMyTeams();
      const myTeam = teams?.[0];
      if (!myTeam) return { status: 'NONE' };

      const teamId = myTeam.teamId ?? myTeam.id;
      const roundId =
        myTeam.activeRoundId ??
        myTeam.roundId ??
        myTeam.prelimRoundId ??
        (await resolveActiveRoundId());

      if (!roundId) return { status: 'NONE' };

      const submission = await axiosClient.get<any, any>(
        `/api/v1/me/submission?teamId=${teamId}&roundId=${roundId}`
      );

      if (!submission) return { status: 'NONE' };

      return {
        status: mapSubmissionStatusToFe(submission.status),
        submitted_at: submission.submittedAt ?? submission.submitted_at,
        repo_url: submission.repoUrl ?? submission.repo_url,
        demo_url: submission.demoUrl ?? submission.demo_url,
        slide_url: submission.slideUrl ?? submission.slide_url,
      };
    } catch (err: any) {
      if (err?.status === 404) return { status: 'NONE' };
      throw err;
    }
  },

  /** POST /api/v1/submissions — upsert, bắt buộc teamId + trackId */
  submitStudentSubmission: async (
    _studentId: string | number,
    data: SubmissionRequest
  ): Promise<SubmissionResponse> => {
    const teams = await personBApi.getMyTeams();
    const myTeam = teams?.[0];
    if (!myTeam) {
      throw new Error('Sinh viên không thuộc đội thi nào để thực hiện nộp bài.');
    }

    const teamId = myTeam.teamId ?? myTeam.id;
    const trackId = myTeam.trackId ?? myTeam.track_id;
    if (!trackId) {
      throw new Error('Đội chưa được phân bảng đấu — hoàn tất bốc thăm trước khi nộp bài.');
    }

    const payload = {
      teamId: Number(teamId),
      trackId: Number(trackId),
      repoUrl: data.repo_url,
      demoUrl: data.demo_url || null,
      slideUrl: data.slide_url,
    };

    const res = await axiosClient.post<any, any>('/api/v1/submissions', payload);
    const mapped = mapSubmissionStatusToFe(res.status);

    return {
      status: mapped === 'NONE' ? 'ON_TIME' : mapped,
      submitted_at: res.submittedAt ?? res.submitted_at,
      repo_url: res.repoUrl ?? res.repo_url,
      demo_url: res.demoUrl ?? res.demo_url,
      slide_url: res.slideUrl ?? res.slide_url,
    };
  },

  /** GET /api/v1/me/rounds/current/deadline */
  getCurrentDeadline: async (): Promise<DeadlineResponse> => {
    try {
      const data = await axiosClient.get<any, { deadline?: string; roundId?: number }>(
        '/api/v1/me/rounds/current/deadline'
      );
      return {
        deadline: data.deadline,
        round_id: data.roundId ? String(data.roundId) : undefined,
      };
    } catch (err: any) {
      if (err?.status === 404 || err?.response?.status === 404) {
        return { deadline: undefined, round_id: undefined };
      }
      throw err;
    }
  },

  /** GET /api/v1/me/rounds/{roundId}/problem */
  getRoundProblem: async (roundId: number | string) => {
    return axiosClient.get(`/api/v1/me/rounds/${roundId}/problem`);
  },

  /** GET /api/v1/submissions?status=LATE_PENDING — Coordinator */
  getLateSubmissions: async (roundId?: number | string): Promise<LateSubmission[]> => {
    const rid = roundId ?? (await resolveActiveRoundId());
    const query = rid
      ? `?status=LATE_PENDING&roundId=${rid}`
      : '?status=LATE_PENDING';

    const submissions = await axiosClient.get<any, any[]>(`/api/v1/submissions${query}`);
    const list = Array.isArray(submissions) ? submissions : [];

    return list
      .filter((sub) => sub.status === 'LATE_PENDING')
      .map((sub) => ({
        submission_id: String(sub.id),
        team_id: String(sub.teamId ?? sub.team_id),
        team_name: sub.teamName ?? sub.team_name ?? `Đội ${sub.teamId}`,
        repo_url: sub.repoUrl ?? sub.repo_url,
        slide_url: sub.slideUrl ?? sub.slide_url,
        demo_url: sub.demoUrl ?? sub.demo_url,
        submitted_at: sub.submittedAt ?? sub.submitted_at,
        status: 'LATE_PENDING' as const,
      }));
  },

  approveLateSubmission: async (submissionId: string | number) =>
    axiosClient.patch(`/api/v1/submissions/${submissionId}/approve`, {}),

  rejectLateSubmission: async (submissionId: string | number, data: RejectSubmissionRequest) =>
    axiosClient.patch(`/api/v1/submissions/${submissionId}/reject`, { reason: data.reason }),

  /** GET /api/v1/me/mentor/teams/{teamId}/presentation-slot */
  getTeamPresentationSlot: async (teamId: string | number) =>
    axiosClient.get(`/api/v1/me/mentor/teams/${teamId}/presentation-slot`),

  /** GET /api/v1/presentation/queue?roundId= */
  getPresentationQueue: async (roundId?: string | number): Promise<PresentationQueueResponse> => {
    const rid = roundId ?? (await resolveActiveRoundId());
    if (!rid) {
      throw new Error('Không xác định được roundId cho hàng đợi thuyết trình.');
    }
    const data = await axiosClient.get<any, any>(`/api/v1/presentation/queue?roundId=${rid}`);
    return mapPresentationQueue(data);
  },

  /** PATCH /api/v1/presentation/queue/next?roundId= */
  triggerNextPresentation: async (roundId?: string | number, currentTeamId?: string | number) => {
    const rid = roundId ?? (await resolveActiveRoundId());
    if (!rid) {
      throw new Error('Không xác định được roundId để chuyển team tiếp theo.');
    }
    const params = new URLSearchParams({ roundId: String(rid) });
    const body = currentTeamId ? { currentTeamId: Number(currentTeamId) } : {};
    return axiosClient.patch(`/api/v1/presentation/queue/next?${params.toString()}`, body);
  },

  /** @deprecated Coordinator-only — mentor/student không dùng */
  getHackathonRounds: async (): Promise<any[]> => {
    const rounds = await personBApi.getMentorRounds();
    return rounds.map((r) => ({
      id: r.roundId,
      name: r.roundName,
      isActive: r.status === 'ACTIVE',
      ...r,
    }));
  },
};
