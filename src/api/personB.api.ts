import axiosClient from '../shared/api/axiosClient';

// ==========================================
// TYPES & INTERFACES
// ==========================================

// Screen 1: Mentor Support Screen
export interface AssignedTeam {
  team_id: string;
  team_name: string;
  assigned_group: string;
  status: string;
  group_number?: string | number;
}

export interface AssignedTeamsResponse {
  round: string;
  teams: AssignedTeam[];
}

// Screen 2: Student Submission Screen
export interface SubmissionRequest {
  repo_url: string;
  demo_url?: string;
  slide_url: string;
  lateReason?: string;
}

export interface SubmissionResponse {
  status: 'ON_TIME' | 'LATE_PENDING' | 'REJECTED';
  submitted_at: string;
  repo_url?: string;
  demo_url?: string;
  slide_url?: string;
}

export interface SubmissionStatusResponse {
  status: 'ON_TIME' | 'LATE_PENDING' | 'REJECTED' | 'NONE'; // NONE if not submitted yet
  submitted_at?: string;
  repo_url?: string;
  demo_url?: string;
  slide_url?: string;
}

export interface DeadlineResponse {
  deadline: string; // ISO8601 timestamp
}

// Screen 3: Coordinator — Review Late Submissions
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

// Screen 4: Presentation Queue Screen
export interface QueueTeam {
  team_id: string;
  team_name: string;
  order: number;
  status: 'WAITING' | 'PRESENTING' | 'DONE';
  slot_start_at?: string;
  slot_end_at?: string;
}

export interface QueueGroup {
  group_name: string;
  teams: QueueTeam[];
}

export interface PresentationQueueResponse {
  groups: QueueGroup[];
}

// ==========================================
// API IMPLEMENTATIONS
// ==========================================

export const personBApi = {
  // MÀN HÌNH 1: Mentor Support Screen
  // Backend endpoint: GET /api/v1/me/mentor-team-assignments (FR-M-06)
  getAssignedTeams: async (mentorId?: string | number, roundId?: string | number): Promise<AssignedTeamsResponse> => {
    try {
      const url = roundId ? `/api/v1/me/mentor-team-assignments?roundId=${roundId}` : '/api/v1/me/mentor-team-assignments';
      const data = await axiosClient.get<any, any[]>(url);
      return {
        round: 'Vòng thi hiện tại',
        teams: (data || []).map((item: any) => ({
          team_id: String(item.teamId),
          team_name: item.teamName,
          assigned_group: `Nhóm ${item.assignmentId || 'A'}`,
          status: 'ACTIVE'
        }))
      };
    } catch (err) {
      console.error('Lỗi khi gọi API getAssignedTeams từ Backend:', err);
      throw err;
    }
  },

  // Lấy toàn bộ vòng thi của Hackathon đang hoạt động từ database
  getHackathonRounds: async (): Promise<any[]> => {
    try {
      const hackathonsData = await axiosClient.get<any, any>('/api/v1/hackathons/active');
      let activeHackathon = null;
      if (Array.isArray(hackathonsData)) {
        activeHackathon = hackathonsData[0];
      } else if (hackathonsData) {
        const list = hackathonsData.content || hackathonsData.items || hackathonsData.data || [];
        if (Array.isArray(list) && list.length > 0) {
          activeHackathon = list[0];
        } else if (typeof hackathonsData === 'object' && hackathonsData.id) {
          activeHackathon = hackathonsData;
        }
      }
      if (!activeHackathon) {
        return [];
      }
      const res = await axiosClient.get<any, any>(`/api/v1/hackathons/${activeHackathon.id}/rounds`);
      const roundList = Array.isArray(res) ? res : (res?.content || res?.items || res?.data || []);
      return roundList;
    } catch (err) {
      console.error('Lỗi khi lấy danh sách vòng thi từ Backend:', err);
      throw err;
    }
  },

  // GET /api/mentor/rounds (FR-M-08)
  getMentorRounds: async (): Promise<any[]> => {
    try {
      const data = await axiosClient.get<any, any[]>('/api/mentor/rounds');
      return data || [];
    } catch (err) {
      console.warn('Lỗi khi gọi API getMentorRounds, sử dụng mock làm dự phòng:', err);
      return [
        {
          round_id: '1',
          round_name: 'Vòng Sơ loại - Round A',
          status: 'ACTIVE',
          description: 'Vòng đấu loại trực tiếp của dự án SEAL Hackathon. Hạn nộp bài đang diễn ra.',
          team_count: 5,
          teams: [
            { team_id: '1', team_name: 'GD2-04 ACTIVE + bốc thăm Track 1' },
            { team_id: '2', team_name: 'GD2-05 ACTIVE đã khóa + bốc thăm' },
            { team_id: '3', team_name: 'GD2-06 ACTIVE' },
            { team_id: '4', team_name: 'GD2-07 ACTIVE' },
            { team_id: '5', team_name: 'GD2-08 ACTIVE' }
          ]
        },
        {
          round_id: '2',
          round_name: 'Vòng Bán kết - Round B',
          status: 'UPCOMING',
          description: 'Vòng bán kết đánh giá dự án thực tế. Sắp diễn ra.',
          team_count: 0,
          teams: []
        },
        {
          round_id: '3',
          round_name: 'Vòng Chung kết - Round C',
          status: 'ENDED',
          description: 'Chung kết xếp hạng và thuyết trình trực tiếp trước hội đồng giám khảo.',
          team_count: 0,
          teams: []
        }
      ];
    }
  },

  // MÀN HÌNH 2: Student Submission Screen
  // Backend endpoint: GET /api/v1/submissions?teamId={teamId} (FR-U-20)
  getStudentSubmission: async (studentId?: string | number): Promise<SubmissionStatusResponse> => {
    try {
      // 1. Lấy thông tin các team của user hiện tại
      const teams = await axiosClient.get<any, any[]>('/api/v1/me/teams');
      const myTeam = teams?.[0];
      if (!myTeam) {
        return { status: 'NONE' };
      }

      // 2. Lấy danh sách các bài nộp của team này
      const submissions = await axiosClient.get<any, any[]>(`/api/v1/submissions?teamId=${myTeam.teamId}`);
      const latestSub = submissions?.[submissions.length - 1];
      if (!latestSub) {
        return { status: 'NONE' };
      }

      // 3. Map status từ Backend sang Frontend
      let statusMapping: 'ON_TIME' | 'LATE_PENDING' | 'REJECTED' | 'NONE' = 'NONE';
      if (latestSub.status === 'SUBMITTED' || latestSub.status === 'ACCEPTED' || latestSub.status === 'LATE_APPROVED') {
        statusMapping = 'ON_TIME';
      } else if (latestSub.status === 'LATE_PENDING') {
        statusMapping = 'LATE_PENDING';
      } else if (latestSub.status === 'REJECTED') {
        statusMapping = 'REJECTED';
      }

      return {
        status: statusMapping,
        submitted_at: latestSub.submittedAt,
        repo_url: latestSub.repoUrl,
        demo_url: latestSub.demoUrl,
        slide_url: latestSub.slideUrl
      };
    } catch (err) {
      console.error('Lỗi khi lấy thông tin bài nộp của học sinh từ Backend:', err);
      throw err;
    }
  },

  // Backend endpoint: POST /api/v1/submissions
  submitStudentSubmission: async (
    studentId: string | number, // kept for signature compatibility
    data: SubmissionRequest
  ): Promise<SubmissionResponse> => {
    try {
      const teams = await axiosClient.get<any, any[]>('/api/v1/me/teams');
      const myTeam = teams?.[0];
      if (!myTeam) {
        throw new Error('Sinh viên không thuộc đội thi nào để thực hiện nộp bài.');
      }

      const payload = {
        teamId: myTeam.teamId,
        trackId: myTeam.trackId, // Vòng Sơ loại yêu cầu trackId thay vì roundId
        repoUrl: data.repo_url,
        demoUrl: data.demo_url || null,
        slideUrl: data.slide_url,
        lateReason: data.lateReason || null
      };

      const res = await axiosClient.post<any, any>('/api/v1/submissions', payload);

      let statusMapping: 'ON_TIME' | 'LATE_PENDING' | 'REJECTED' = 'ON_TIME';
      if (res.status === 'SUBMITTED' || res.status === 'ACCEPTED' || res.status === 'LATE_APPROVED') {
        statusMapping = 'ON_TIME';
      } else if (res.status === 'LATE_PENDING') {
        statusMapping = 'LATE_PENDING';
      } else if (res.status === 'REJECTED') {
        statusMapping = 'REJECTED';
      }

      return {
        status: statusMapping,
        submitted_at: res.submittedAt,
        repo_url: res.repoUrl,
        demo_url: res.demoUrl,
        slide_url: res.slideUrl
      };
    } catch (err) {
      console.error('Lỗi khi nộp bài thi lên Backend:', err);
      throw err;
    }
  },

  // Backend: Lấy hạn chót từ thông tin Round của Hackathon đang diễn ra
  getCurrentDeadline: async (): Promise<DeadlineResponse> => {
    try {
      const teams = await axiosClient.get<any, any[]>('/api/v1/me/teams');
      const myTeam = teams?.[0];
      if (myTeam) {
        // Cố gắng lấy danh sách các round của hackathon (chỉ có coordinator mới truy cập được trực tiếp,
        // đối với Student thì endpoint này sẽ trả về 403. Ta bắt lỗi và fallback sang Mock)
        const rounds = await axiosClient.get<any, any[]>(`/api/v1/hackathons/${myTeam.hackathonId}/rounds`);
        const activeRound = rounds.find((r: any) => r.isActive);
        if (activeRound?.submissionDeadline) {
          return { deadline: activeRound.submissionDeadline };
        }
      }
    } catch (err) {
      console.warn('Student không thể truy cập danh sách round (phân quyền hệ thống). Sử dụng thời gian mock làm fallback cho bộ đếm ngược.', err);
    }
    
    // Fallback: 15 phút kể từ thời điểm hiện tại cho mục đích demo đếm ngược
    return {
      deadline: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    };
  },

  // MÀN HÌNH 3: Coordinator — Review Late Submissions
  // Backend endpoints: 
  // 1. GET /api/v1/hackathons/active
  // 2. GET /api/v1/hackathons/{id}/rounds
  // 3. GET /api/v1/submissions?roundId={roundId}
  getLateSubmissions: async (): Promise<LateSubmission[]> => {
    try {
      const hackathonsData = await axiosClient.get<any, any>('/api/v1/hackathons/active');
      let activeHackathon = null;
      if (Array.isArray(hackathonsData)) {
        activeHackathon = hackathonsData[0];
      } else if (hackathonsData) {
        const list = hackathonsData.content || hackathonsData.items || hackathonsData.data || [];
        if (Array.isArray(list) && list.length > 0) {
          activeHackathon = list[0];
        } else if (typeof hackathonsData === 'object' && hackathonsData.id) {
          activeHackathon = hackathonsData;
        }
      }
      if (!activeHackathon) {
        return [];
      }
      
      const roundsRes = await axiosClient.get<any, any>(`/api/v1/hackathons/${activeHackathon.id}/rounds`);
      const rounds = Array.isArray(roundsRes) ? roundsRes : (roundsRes?.content || roundsRes?.items || roundsRes?.data || []);
      const activeRound = rounds.find((r: any) => r.isActive);
      if (!activeRound) {
        return [];
      }

      const submissions = await axiosClient.get<any, any[]>(`/api/v1/submissions?roundId=${activeRound.id}`);
      const lateSubmissions = submissions.filter((sub: any) => sub.status === 'LATE_PENDING');
      
      const enrichPromises = lateSubmissions.map(async (sub: any) => {
        try {
          const team = await axiosClient.get<any, any>(`/api/v1/teams/${sub.teamId}`);
          return {
            submission_id: String(sub.id),
            team_id: String(sub.teamId),
            team_name: team.name || `Đội ${sub.teamId}`,
            repo_url: sub.repoUrl,
            slide_url: sub.slideUrl,
            demo_url: sub.demoUrl,
            submitted_at: sub.submittedAt,
            status: 'LATE_PENDING' as const
          };
        } catch {
          return {
            submission_id: String(sub.id),
            team_id: String(sub.teamId),
            team_name: `Đội ${sub.teamId}`,
            repo_url: sub.repoUrl,
            slide_url: sub.slideUrl,
            demo_url: sub.demoUrl,
            submitted_at: sub.submittedAt,
            status: 'LATE_PENDING' as const
          };
        }
      });

      return await Promise.all(enrichPromises);
    } catch (err) {
      console.error('Lỗi lấy danh sách bài nộp muộn từ Backend:', err);
      throw err;
    }
  },

  // Backend: PATCH /api/v1/submissions/{id}/review-late
  approveLateSubmission: async (submissionId: string | number): Promise<any> => {
    try {
      return await axiosClient.patch(`/api/v1/submissions/${submissionId}/review-late`, {
        decision: 'APPROVE',
        note: 'Duyệt bài nộp muộn thông qua Dashboard điều phối viên'
      });
    } catch (err) {
      console.error('Lỗi khi phê duyệt bài nộp muộn:', err);
      throw err;
    }
  },

  // Backend: PATCH /api/v1/submissions/{id}/review-late
  rejectLateSubmission: async (
    submissionId: string | number,
    data: RejectSubmissionRequest
  ): Promise<any> => {
    try {
      return await axiosClient.patch(`/api/v1/submissions/${submissionId}/review-late`, {
        decision: 'REJECT',
        note: data.reason
      });
    } catch (err) {
      console.error('Lỗi khi từ chối bài nộp muộn:', err);
      throw err;
    }
  },

  getTeamPresentationSlot: async (teamId: string | number): Promise<any> => {
    try {
      return await axiosClient.get(`/api/v1/me/mentor-team-assignments/${teamId}/presentation-slot`);
    } catch (err) {
      console.error(`Lỗi khi lấy slot thuyết trình cho team ${teamId}:`, err);
      throw err;
    }
  },

  // MÀN HÌNH 4: Presentation Queue Screen
  // TODO: [API MISSING] Các endpoint về hàng đợi thuyết trình chưa được Backend triển khai chính thức.
  // Khi không ở chế độ dev mode, các hàm này sẽ gọi tới đường dẫn dự kiến /api/v1/...
  getPresentationQueue: async (): Promise<PresentationQueueResponse> => {
    return axiosClient.get('/api/v1/presentation/queue');
  },

  triggerNextPresentation: async (): Promise<any> => {
    return axiosClient.patch('/api/v1/presentation/queue/next');
  }
};
