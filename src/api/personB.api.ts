import axiosClient from '../shared/api/axiosClient';
import { mentorPortalService } from '../features/mentor/services/mentorPortal.service';
import { studentSubmissionService } from '../student/features/submission/services/studentSubmission.service';
import { resolvePreliminarySubmissionError } from '../features/submissions/constants/preliminarySubmissionErrors';

export type SubmissionBlockReason = 'NO_TEAM' | 'NO_ROUND' | 'NOT_SUBMITTED';

const mapSubmissionStatusToFe = (beStatus?: string): SubmissionStatusResponse['status'] => {
  if (!beStatus) return 'NONE';
  if (beStatus === 'INCOMPLETE') return 'INCOMPLETE';
  if (beStatus === 'LATE_PENDING') return 'LATE_PENDING';
  if (beStatus === 'LATE_APPROVED') return 'LATE_APPROVED';
  if (beStatus === 'REJECTED') return 'REJECTED';
  if (['SUBMITTED', 'LATE', 'ACCEPTED', 'ON_TIME'].includes(beStatus)) {
    return 'ON_TIME';
  }
  return 'NONE';
};

const resolveActiveRoundId = async (): Promise<number | null> => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const role = userInfo.role || userInfo.userRole;

  // Student-only endpoint — never call as Coord/Judge/Mentor (causes 403 noise spam).
  if (role === 'STUDENT') {
    try {
      const deadline = await axiosClient.get<any, { roundId?: number }>(
        '/api/v1/me/rounds/current/deadline'
      );
      if (deadline?.roundId) return Number(deadline.roundId);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      // 404 = no active prelim (GĐ2 / not released); 403 = role/status mismatch
      if (status === 404 || status === 403) {
        return null;
      }
    }
  }

  try {
    if (role === 'MENTOR') {
      const rounds = await axiosClient.get<any, any[]>('/api/v1/me/mentor/rounds');
      const list = Array.isArray(rounds) ? rounds : [];
      const active = list.find((r) => r.status === 'ACTIVE') || list[0];
      if (active?.roundId) return Number(active.roundId);
    }

    if (role === 'JUDGE' || role === 'TEMP_JUDGE') {
      const assignments = await axiosClient.get<any, any[]>('/api/v1/me/judge-track-assignments');
      const list = Array.isArray(assignments) ? assignments : [];
      const ongoing = list.find((a) => a.status === 'ONGOING') || list[0];
      if (ongoing?.roundId) return Number(ongoing.roundId);
    }

    if (role === 'COORDINATOR' || role === 'SUPERADMIN') {
      const hackathons = await axiosClient.get<any, any>('/api/v1/hackathons/active');
      const hackathonList = Array.isArray(hackathons) ? hackathons : hackathons?.items || [];
      const ongoingHackathon = hackathonList[0];
      if (ongoingHackathon?.id) {
        const rounds = await axiosClient.get<any, any>(
          `/api/v1/hackathons/${ongoingHackathon.id}/rounds`
        );
        const roundList: any[] = Array.isArray(rounds) ? rounds : rounds?.items || [];
        const activeRound =
          roundList.find((r: any) => r.isActive && !r.isFinal) ||
          roundList.find((r: any) => r.isActive) ||
          roundList.find((r: any) => !r.isFinal);
        if (activeRound?.id) return Number(activeRound.id);
      }
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

const mapQueueTeam = (t: any, groupName: string): QueueTeam => ({
  team_id: String(t.teamId ?? t.team_id ?? t.submissionId ?? ''),
  team_name: t.teamName ?? t.team_name ?? t.displayCode ?? `Bài #${t.submissionId ?? ''}`,
  order: t.order ?? 0,
  status: (t.status || 'WAITING') as QueueTeam['status'],
  presentation_schedule: t.presentationSchedule ?? t.presentation_schedule,
  location: t.location,
  slot_start_at: t.slotStartAt ?? t.slot_start_at,
  slot_end_at: t.slotEndAt ?? t.slot_end_at,
  submission_id: t.submissionId ?? t.submission_id,
  display_code: t.displayCode ?? t.display_code,
  track_id: t.trackId ?? t.track_id,
  group_name: groupName,
  timer: t.timer,
});

const mapPresentationQueue = (data: any): PresentationQueueResponse => {
  if (data?.tracks?.length) {
    const groups: QueueGroup[] = data.tracks.map((track: any) => ({
      group_name: track.trackName ?? track.track_name ?? `Track ${track.trackId ?? ''}`,
      track_id: track.trackId ?? track.track_id,
      shuffled: Boolean(track.shuffled),
      teams: (track.items || []).map((item: any) =>
        mapQueueTeam(
          { ...item, trackId: track.trackId ?? track.track_id },
          track.trackName ?? track.track_name ?? 'Track'
        )
      ),
    }));

    return {
      groups,
      tracks: data.tracks,
      round_id: data.roundId ?? data.round_id,
      room_stats: data.roomStats ?? data.room_stats,
    };
  }

  const groups = (data?.groups || []).map((g: any) => ({
    group_name: g.groupName ?? g.group_name,
    teams: (g.teams || []).map((t: any) =>
      mapQueueTeam(t, g.groupName ?? g.group_name ?? 'Nhóm')
    ),
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
  report_url?: string;
  slide_file?: File;
  late_reason?: string;
}

export interface SubmissionResponse {
  status: 'ON_TIME' | 'LATE_PENDING' | 'LATE_APPROVED' | 'REJECTED' | 'INCOMPLETE';
  submission_id?: number | string;
  submitted_at?: string;
  repo_url?: string;
  demo_url?: string;
  slide_url?: string;
  slide_file?: string;
  slide_download_path?: string;
  has_slide?: boolean;
}

/** Shape BE trả về sau POST /submissions (axios interceptor đã unwrap `data`). */
interface BeSubmissionRecord {
  id?: number;
  submissionId?: number;
  submission_id?: number;
  status?: string;
  submittedAt?: string;
  submitted_at?: string;
  repoUrl?: string;
  repo_url?: string;
  demoUrl?: string;
  demo_url?: string;
  slideFile?: string;
  slide_file?: string;
  slideUrl?: string;
  slide_url?: string;
  slideDownloadPath?: string;
  slide_download_path?: string;
}

export interface SubmissionStatusResponse {
  status: 'ON_TIME' | 'LATE_PENDING' | 'LATE_APPROVED' | 'REJECTED' | 'INCOMPLETE' | 'NONE';
  blockReason?: SubmissionBlockReason;
  round_id?: number | string;
  track_id?: number;
  team_id?: number;
  review_note?: string;
  submission_id?: number | string;
  submitted_at?: string;
  repo_url?: string;
  demo_url?: string;
  slide_url?: string;
  slide_file?: string;
  slide_download_path?: string;
  has_slide?: boolean;
}

export interface DeadlineResponse {
  deadline?: string;
  round_id?: string;
  roundId?: string | number;
  problemReleased?: boolean;
  closed_early_at?: string | null;
}

export interface LateSubmission {
  submission_id: string;
  team_id: string;
  team_name: string;
  track_id?: number;
  trackId?: number;
  repo_url: string;
  slide_url?: string;
  slide_download_path?: string;
  has_slide?: boolean;
  demo_url?: string;
  late_reason?: string;
  submitted_at: string;
  status: 'LATE_PENDING';
}

export interface RoundSubmissionItem {
  id: number;
  team_id: number;
  team_name: string;
  track_id?: number;
  track_name?: string;
  round_id?: number;
  status: string;
  submitted_at?: string;
  is_late?: boolean;
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
  submission_id?: number;
  display_code?: string;
  track_id?: number;
  group_name?: string;
  timer?: {
    phase?: string;
    remainingSeconds?: number;
    presentationMinutes?: number;
    qaMinutes?: number;
  };
}

export interface QueueGroup {
  group_name: string;
  teams: QueueTeam[];
  track_id?: number;
  shuffled?: boolean;
}

export interface PresentationQueueResponse {
  groups: QueueGroup[];
  tracks?: any[];
  round_id?: number;
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
    return (data || []).map((round) => ({
      ...round,
      round_id: round.roundId ?? round.round_id,
      round_name: round.roundName ?? round.round_name,
      team_count: round.teamCount ?? round.team_count,
      teams: (round.teams || []).map((team: any) => ({
        ...team,
        team_id: team.teamId ?? team.team_id,
        team_name: team.teamName ?? team.team_name,
      })),
    }));
  },

  /** GET /api/v1/me/mentor-track-assignments */
  getMentorTrackAssignments: async (): Promise<any[]> => {
    return mentorPortalService.getTrackAssignments();
  },

  /** GET /api/v1/me/teams — bootstrap teamId + trackId */
  getMyTeams: async (): Promise<any[]> => {
    const data = await axiosClient.get<any, any[]>('/api/v1/me/teams');
    return Array.isArray(data) ? data : [];
  },

  /** GET /api/v1/me/submission?teamId=&roundId= — bắt buộc teamId (SUBMIT-01, không dùng teams[0]). */
  getStudentSubmission: async (
    _studentId?: string | number,
    teamIdArg?: number | string | null,
  ): Promise<SubmissionStatusResponse> => {
    try {
      if (teamIdArg == null || teamIdArg === '') {
        return { status: 'NONE', blockReason: 'NO_TEAM' };
      }
      const teams = await personBApi.getMyTeams();
      const myTeam = teams.find(
        (t: any) => Number(t.teamId ?? t.id) === Number(teamIdArg),
      );
      if (!myTeam) return { status: 'NONE', blockReason: 'NO_TEAM' };

      const teamId = myTeam.teamId ?? myTeam.id;
      const trackId = myTeam.trackId ?? myTeam.track_id;
      const roundId =
        myTeam.activeRoundId ??
        myTeam.roundId ??
        myTeam.prelimRoundId ??
        (await resolveActiveRoundId());

      if (!roundId) {
        return {
          status: 'NONE',
          blockReason: trackId ? 'NO_ROUND' : 'NO_ROUND',
          team_id: Number(teamId),
          track_id: trackId ? Number(trackId) : undefined,
        };
      }

      try {
        const submission = await axiosClient.get<any, any>(
          `/api/v1/me/submission?teamId=${teamId}&roundId=${roundId}`
        );

        if (!submission) {
          return {
            status: 'NONE',
            blockReason: 'NOT_SUBMITTED',
            round_id: roundId,
            team_id: Number(teamId),
            track_id: trackId ? Number(trackId) : undefined,
          };
        }

        return {
          status: mapSubmissionStatusToFe(submission.status),
          blockReason: undefined,
          round_id: roundId,
          team_id: Number(teamId),
          track_id: trackId ? Number(trackId) : undefined,
          submission_id: submission.submissionId ?? submission.submission_id ?? submission.id,
          submitted_at: submission.submittedAt ?? submission.submitted_at,
          repo_url: submission.repoUrl ?? submission.repo_url,
          demo_url: submission.demoUrl ?? submission.demo_url,
          slide_url: submission.slideUrl ?? submission.slide_url,
          slide_file: submission.slideFile ?? submission.slide_file,
          slide_download_path: submission.slideDownloadPath ?? submission.slide_download_path,
          has_slide: submission.hasSlide ?? submission.has_slide,
          review_note: submission.reviewNote ?? submission.review_note,
        };
      } catch (err: any) {
        if (err?.status === 404 || err?.response?.status === 404) {
          return {
            status: 'NONE',
            blockReason: 'NOT_SUBMITTED',
            round_id: roundId,
            team_id: Number(teamId),
            track_id: trackId ? Number(trackId) : undefined,
          };
        }
        throw err;
      }
    } catch (err: any) {
      const resolved = resolvePreliminarySubmissionError(err, 'Không thể tải trạng thái bài nộp.');
      const error = new Error(resolved.message) as Error & { code?: string };
      error.code = resolved.code;
      throw error;
    }
  },

  /** GET /api/v1/me/submission?teamId=&roundId= — bootstrap GĐ5 Chung kết */
  getFinalStudentSubmission: async (
    teamId: number | string,
    roundId: number | string
  ): Promise<SubmissionStatusResponse> => {
    try {
      const submission = await axiosClient.get<any, any>(
        `/api/v1/me/submission?teamId=${teamId}&roundId=${roundId}`
      );

      if (!submission) {
        return {
          status: 'NONE',
          blockReason: 'NOT_SUBMITTED',
          round_id: Number(roundId),
          team_id: Number(teamId),
        };
      }

      return {
        status: mapSubmissionStatusToFe(submission.status),
        blockReason: undefined,
        round_id: Number(roundId),
        team_id: Number(teamId),
        submission_id: submission.submissionId ?? submission.submission_id ?? submission.id,
        submitted_at: submission.submittedAt ?? submission.submitted_at,
        repo_url: submission.repoUrl ?? submission.repo_url,
        demo_url: submission.demoUrl ?? submission.demo_url,
        slide_url: submission.slideUrl ?? submission.slide_url,
        slide_file: submission.slideFile ?? submission.slide_file,
        slide_download_path: submission.slideDownloadPath ?? submission.slide_download_path,
        has_slide: submission.hasSlide ?? submission.has_slide,
        review_note: submission.reviewNote ?? submission.review_note,
      };
    } catch (err: any) {
      if (err?.status === 404 || err?.response?.status === 404) {
        return {
          status: 'NONE',
          blockReason: 'NOT_SUBMITTED',
          round_id: Number(roundId),
          team_id: Number(teamId),
        };
      }
      const resolved = resolvePreliminarySubmissionError(err, 'Không thể tải trạng thái bài nộp Chung kết.');
      const error = new Error(resolved.message) as Error & { code?: string };
      error.code = resolved.code;
      throw error;
    }
  },

  /** POST /api/v1/submissions — GĐ5 Chung kết: roundId only, không lateReason/reportUrl */
  submitFinalStudentSubmission: async (
    teamId: number | string,
    roundId: number | string,
    data: SubmissionRequest
  ): Promise<SubmissionResponse> => {
    if (!data.repo_url?.trim()) {
      throw new Error('Đường dẫn Repository GitHub là bắt buộc.');
    }

    const payload = {
      teamId: Number(teamId),
      roundId: Number(roundId),
      repoUrl: data.repo_url.trim(),
      demoUrl: data.demo_url?.trim() || undefined,
      slideFile: data.slide_file,
    };

    try {
      const res = (await studentSubmissionService.submitMultipart(
        payload
      )) as unknown as BeSubmissionRecord;

      if (!res.slideFile && !res.slide_file && !res.slideDownloadPath && !res.slide_download_path) {
        throw new Error('Nộp file slide thất bại — vui lòng chọn file PDF và thử lại.');
      }

      const mapped = mapSubmissionStatusToFe(res.status);

      return {
        status: mapped === 'NONE' ? 'ON_TIME' : mapped,
        submission_id: res.id ?? res.submissionId ?? res.submission_id,
        submitted_at: res.submittedAt ?? res.submitted_at,
        repo_url: res.repoUrl ?? res.repo_url,
        demo_url: res.demoUrl ?? res.demo_url,
        slide_file: res.slideFile ?? res.slide_file,
        slide_download_path: res.slideDownloadPath ?? res.slide_download_path,
        has_slide: Boolean(res.slideFile ?? res.slide_file ?? res.slideDownloadPath ?? res.slide_download_path),
      };
    } catch (err: any) {
      const resolved = resolvePreliminarySubmissionError(err, 'Nộp bài Chung kết thất bại.');
      const error = new Error(resolved.message) as Error & { code?: string };
      error.code = resolved.code;
      throw error;
    }
  },

  /** POST /api/v1/submissions — bắt buộc teamId tường minh (SUBMIT-01). */
  submitStudentSubmission: async (
    _studentId: string | number,
    data: SubmissionRequest & { teamId?: number | string; trackId?: number | string; roundId?: number | string }
  ): Promise<SubmissionResponse> => {
    const explicitTeamId = data.teamId;
    if (explicitTeamId == null || explicitTeamId === '') {
      throw new Error('Thiếu teamId — chọn đội trước khi nộp bài.');
    }

    const teams = await personBApi.getMyTeams();
    const myTeam = teams.find(
      (t: any) => Number(t.teamId ?? t.id) === Number(explicitTeamId),
    );
    if (!myTeam) {
      throw new Error('Sinh viên không thuộc đội thi đã chọn.');
    }

    const teamId = myTeam.teamId ?? myTeam.id;
    const trackId = data.trackId ?? myTeam.trackId ?? myTeam.track_id;
    if (!trackId) {
      throw new Error('Đội chưa được phân bảng đấu — hoàn tất bốc thăm trước khi nộp bài.');
    }

    const roundId =
      data.roundId ??
      myTeam.activeRoundId ??
      myTeam.roundId ??
      myTeam.prelimRoundId ??
      (await resolveActiveRoundId());

    const payload = {
      teamId: Number(teamId),
      trackId: Number(trackId),
      roundId: roundId ? Number(roundId) : undefined,
      repoUrl: data.repo_url,
      demoUrl: data.demo_url || undefined,
      reportUrl: data.report_url || undefined,
      lateReason: data.late_reason,
      slideFile: data.slide_file,
    };

    try {
      const res = (await studentSubmissionService.submitMultipart(
        payload
      )) as unknown as BeSubmissionRecord;

      if (!res.slideFile && !res.slide_file && !res.slideDownloadPath && !res.slide_download_path) {
        throw new Error('Nộp file slide thất bại — vui lòng chọn file PDF và thử lại.');
      }

      const mapped = mapSubmissionStatusToFe(res.status);

      return {
        status: mapped === 'NONE' ? 'ON_TIME' : mapped,
        submission_id: res.id ?? res.submissionId ?? res.submission_id,
        submitted_at: res.submittedAt ?? res.submitted_at,
        repo_url: res.repoUrl ?? res.repo_url,
        demo_url: res.demoUrl ?? res.demo_url,
        slide_file: res.slideFile ?? res.slide_file,
        slide_download_path: res.slideDownloadPath ?? res.slide_download_path,
      };
    } catch (err: any) {
      const resolved = resolvePreliminarySubmissionError(err, 'Nộp bài thất bại.');
      const error = new Error(resolved.message) as Error & { code?: string };
      error.code = resolved.code;
      throw error;
    }
  },

  /** Resolve roundId cho presentation queue / coordinator ops (không dùng student-only deadline khi role khác). */
  resolveActiveRoundId,

  /** GET /api/v1/me/rounds/current/deadline */
  getCurrentDeadline: async (): Promise<DeadlineResponse> => {
    try {
      const data = await axiosClient.get<any, {
        deadline?: string;
        roundId?: number;
        problemReleased?: boolean;
        closedEarlyAt?: string | null;
        closed_early_at?: string | null;
      }>('/api/v1/me/rounds/current/deadline');
      const closedEarly =
        data.closedEarlyAt ?? data.closed_early_at ?? null;
      return {
        deadline: data.deadline,
        round_id: data.roundId ? String(data.roundId) : undefined,
        roundId: data.roundId,
        problemReleased: Boolean(data.problemReleased),
        closed_early_at: closedEarly,
      };
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      // 404: no active prelim (GĐ2); 403: wrong role — treat as "no deadline"
      if (status === 404 || status === 403) {
        return { deadline: undefined, round_id: undefined, problemReleased: false };
      }
      throw err;
    }
  },

  /** GET /api/v1/me/rounds/{roundId}/problem-statement — download PDF */
  downloadRoundProblemStatement: async (roundId: number | string) =>
    axiosClient.get(`/api/v1/me/rounds/${roundId}/problem-statement`, {
      responseType: 'blob',
    }),

  /** GET /api/v1/me/mentor/teams/{teamId}/submissions */
  getMentorTeamSubmissions: async (teamId: number | string, roundId: number | string) => {
    const data = await axiosClient.get<any, any>(
      `/api/v1/me/mentor/teams/${teamId}/submissions`,
      { params: { roundId } }
    );
    return Array.isArray(data) ? data : data?.items || data?.data || [];
  },

  /** GET /api/v1/me/mentor/teams/{teamId}/scores */
  getMentorTeamScores: async (teamId: number | string, roundId: number | string) => {
    const data = await axiosClient.get<any, any>(
      `/api/v1/me/mentor/teams/${teamId}/scores`,
      { params: { roundId } }
    );
    return Array.isArray(data) ? data : data?.items || data?.data || [];
  },

  /** GET /api/v1/me/rounds/{roundId}/problem */
  getRoundProblem: async (roundId: number | string) => {
    return axiosClient.get(`/api/v1/me/rounds/${roundId}/problem`);
  },

  /** GET /api/v1/submissions?roundId= — Coordinator xem toàn bộ bài theo vòng */
  getRoundSubmissions: async (roundId: number | string): Promise<RoundSubmissionItem[]> => {
    const submissions = await axiosClient.get<any, any[]>(
      `/api/v1/submissions?roundId=${roundId}`
    );
    const list = Array.isArray(submissions) ? submissions : [];

    return list.map((sub) => ({
      id: sub.id,
      team_id: sub.teamId ?? sub.team_id,
      team_name: sub.teamName ?? sub.team_name ?? `Đội ${sub.teamId ?? sub.team_id}`,
      track_id: sub.trackId ?? sub.track_id,
      track_name: sub.trackName ?? sub.track_name,
      round_id: sub.roundId ?? sub.round_id,
      status: sub.status ?? 'UNKNOWN',
      submitted_at: sub.submittedAt ?? sub.submitted_at,
      is_late: sub.isLate ?? sub.is_late,
    }));
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
      .map((sub) => {
        const slideDownloadPath =
          sub.slideDownloadPath ?? sub.slide_download_path ?? undefined;
        const hasSlide = Boolean(
          slideDownloadPath || sub.slideFile || sub.slide_file || sub.hasSlide || sub.has_slide,
        );
        const trackIdRaw = sub.trackId ?? sub.track_id;
        return {
          submission_id: String(sub.id),
          team_id: String(sub.teamId ?? sub.team_id),
          team_name: sub.teamName ?? sub.team_name ?? `Đội ${sub.teamId}`,
          track_id: trackIdRaw != null ? Number(trackIdRaw) : undefined,
          trackId: trackIdRaw != null ? Number(trackIdRaw) : undefined,
          repo_url: sub.repoUrl ?? sub.repo_url,
          slide_url: sub.slideUrl ?? sub.slide_url,
          slide_download_path: slideDownloadPath,
          has_slide: hasSlide,
          demo_url: sub.demoUrl ?? sub.demo_url,
          late_reason: sub.lateReason ?? sub.late_reason,
          submitted_at: sub.submittedAt ?? sub.submitted_at,
          status: 'LATE_PENDING' as const,
        };
      });
  },

  /** GET /api/v1/submissions/{id}/slide — authenticated PDF blob */
  getSubmissionSlide: async (submissionId: string | number) =>
    axiosClient.get(`/api/v1/submissions/${submissionId}/slide`, {
      responseType: 'blob',
    }),

  /** GET /api/v1/submissions/{id}/github — repo info + commits */
  getSubmissionGithub: async (
    submissionId: string | number,
    options?: { anonymous?: boolean }
  ) =>
    axiosClient.get(`/api/v1/submissions/${submissionId}/github`, {
      params: { anonymous: options?.anonymous ? true : false },
    }),

  approveLateSubmission: async (submissionId: string | number) =>
    axiosClient.patch(`/api/v1/submissions/${submissionId}/approve`, {}),

  rejectLateSubmission: async (submissionId: string | number, data: RejectSubmissionRequest) =>
    axiosClient.patch(`/api/v1/submissions/${submissionId}/reject`, { reason: data.reason }),

  reviewLateSubmission: async (
    submissionId: string | number,
    data: { decision: 'APPROVE' | 'REJECT'; note?: string }
  ) => {
    try {
      return await axiosClient.patch(`/api/v1/submissions/${submissionId}/review-late`, data);
    } catch (err: any) {
      try {
        if (data.decision === 'APPROVE') {
          return await axiosClient.patch(`/api/v1/submissions/${submissionId}/approve`, {});
        }
        return await axiosClient.patch(`/api/v1/submissions/${submissionId}/reject`, {
          reason: data.note || '',
        });
      } catch (fallbackErr: any) {
        const resolved = resolvePreliminarySubmissionError(fallbackErr, 'Không thể cập nhật quyết định bài nộp trễ.');
        const error = new Error(resolved.message) as Error & { code?: string };
        error.code = resolved.code;
        throw error;
      }
    }
  },

  /** GET /api/v1/me/mentor-team-assignments/{teamId}/presentation-slot */
  getTeamPresentationSlot: async (teamId: string | number) =>
    axiosClient.get(`/api/v1/me/mentor-team-assignments/${teamId}/presentation-slot`),

  /** POST /api/v1/presentation/queue/shuffle */
  shufflePresentationQueue: async (roundId: string | number, trackIds?: number[]) => {
    const rid = Number(roundId);
    if (!rid) {
      throw new Error('roundId là bắt buộc để xáo trộn hàng đợi.');
    }
    const body: { roundId: number; trackIds?: number[] } = { roundId: rid };
    if (trackIds?.length) {
      body.trackIds = trackIds;
    }
    return axiosClient.post('/api/v1/presentation/queue/shuffle', body);
  },

  /** GET /api/v1/presentation/queue?roundId=&trackId= */
  getPresentationQueue: async (
    roundId?: string | number,
    trackId?: number
  ): Promise<PresentationQueueResponse> => {
    const rid = roundId ?? (await resolveActiveRoundId());
    if (!rid) {
      throw new Error('Không xác định được roundId cho hàng đợi thuyết trình.');
    }
    const trackQuery = trackId ? `&trackId=${trackId}` : '';
    const data = await axiosClient.get<any, any>(
      `/api/v1/presentation/queue?roundId=${rid}${trackQuery}`
    );
    return mapPresentationQueue(data);
  },

  /** PATCH /api/v1/presentation/queue/next?roundId= */
  triggerNextPresentation: async (
    roundId?: string | number,
    currentTeamId?: string | number,
    options?: { currentSubmissionId?: number; trackId?: number; acknowledgeIncompleteScoring?: boolean }
  ) => {
    const rid = roundId ?? (await resolveActiveRoundId());
    if (!rid) {
      throw new Error('Không xác định được roundId để chuyển team tiếp theo.');
    }
    const params = new URLSearchParams({ roundId: String(rid) });
    if (options?.trackId) {
      params.set('trackId', String(options.trackId));
    }
    const body: Record<string, unknown> = {};
    if (options?.currentSubmissionId) {
      body.currentSubmissionId = options.currentSubmissionId;
    } else if (currentTeamId) {
      body.currentTeamId = Number(currentTeamId);
    }
    if (options?.acknowledgeIncompleteScoring) {
      body.acknowledgeIncompleteScoring = true;
    }
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
