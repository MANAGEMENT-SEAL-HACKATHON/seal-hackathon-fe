import { 
  AssignedTeamsResponse, 
  SubmissionStatusResponse, 
  DeadlineResponse, 
  LateSubmission, 
  PresentationQueueResponse 
} from './personB.api';

// TODO: [API MISSING] Mentor support assignment endpoint. Need Backend to implement:
// GET /api/mentor/{mentorId}/assigned-teams
export const mockAssignedTeams: AssignedTeamsResponse = {
  round: "Vòng Sơ loại - Round A",
  teams: [
    {
      team_id: "team-1",
      team_name: "Code Crusaders",
      assigned_group: "Group Alpha",
      status: "ACTIVE"
    },
    {
      team_id: "team-2",
      team_name: "Dev Dynasty",
      assigned_group: "Group Alpha",
      status: "ACTIVE"
    },
    {
      team_id: "team-3",
      team_name: "Byte Busters",
      assigned_group: "Group Beta",
      status: "ELIMINATED"
    }
  ]
};

// TODO: [API MISSING] Student submission fetch endpoint. Need Backend to implement:
// GET /api/student/{studentId}/submission
export const mockStudentSubmission: SubmissionStatusResponse = {
  status: "LATE_PENDING",
  submitted_at: "2026-06-07T12:00:00Z",
  repo_url: "https://github.com/example/seal-hackathon-fe",
  demo_url: "https://seal-hackathon.vercel.app",
  slide_url: "https://docs.google.com/presentation/d/12345/edit"
};

// TODO: [API MISSING] Current active round deadline. Need Backend to implement:
// GET /api/round/current/deadline
export const mockCurrentDeadline: DeadlineResponse = {
  // Sets deadline to 15 minutes from now for rich visual countdown demo
  deadline: new Date(Date.now() + 15 * 60 * 1000).toISOString()
};

// TODO: [API MISSING] Get late submissions for coordinator. Need Backend to implement:
// GET /api/submissions?status=LATE_PENDING
export const mockLateSubmissions: LateSubmission[] = [
  {
    submission_id: "sub-101",
    team_id: "team-1",
    team_name: "Code Crusaders",
    repo_url: "https://github.com/example/crusaders-seal",
    slide_url: "https://docs.google.com/presentation/d/crusaders-slide/edit",
    demo_url: "https://crusaders-demo.example.com",
    submitted_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: "LATE_PENDING"
  },
  {
    submission_id: "sub-102",
    team_id: "team-4",
    team_name: "Nebula Ninjas",
    repo_url: "https://github.com/example/nebula-ninjas",
    slide_url: "https://docs.google.com/presentation/d/ninjas-slide/edit",
    demo_url: undefined,
    submitted_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    status: "LATE_PENDING"
  }
];

// TODO: [API MISSING] Presentation queue retrieval and next actions. Need Backend to implement:
// GET /api/presentation/queue
// PATCH /api/presentation/queue/next
export const mockPresentationQueue: PresentationQueueResponse = {
  groups: [
    {
      group_name: "Group Alpha",
      teams: [
        {
          team_id: "team-1",
          team_name: "Code Crusaders",
          order: 1,
          status: "DONE"
        },
        {
          team_id: "team-2",
          team_name: "Dev Dynasty",
          order: 2,
          status: "PRESENTING"
        },
        {
          team_id: "team-5",
          team_name: "Innovate Hub",
          order: 3,
          status: "WAITING"
        }
      ]
    },
    {
      group_name: "Group Beta",
      teams: [
        {
          team_id: "team-6",
          team_name: "Quantum Leap",
          order: 4,
          status: "WAITING"
        },
        {
          team_id: "team-7",
          team_name: "Zenith Tech",
          order: 5,
          status: "WAITING"
        }
      ]
    }
  ]
};
