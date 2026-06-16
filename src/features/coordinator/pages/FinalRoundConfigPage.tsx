import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Tag, Button, Modal, Input, Typography, Space, Tooltip, 
  Switch, Alert, Form, Select, InputNumber, Badge, Divider, List, 
  Timeline, Progress, Tabs, Radio, Avatar, Row, Col
} from 'antd';
import { 
  CheckOutlined, CloseOutlined, InfoCircleOutlined, UserAddOutlined, 
  LockOutlined, CheckCircleOutlined, FileExcelOutlined, AlertOutlined,
  NotificationOutlined, HistoryOutlined, TrophyOutlined, SyncOutlined,
  EyeInvisibleOutlined, StopOutlined, SaveOutlined, UnlockOutlined,
  CrownOutlined, SlidersOutlined, CloudDownloadOutlined, UserOutlined,
  DatabaseOutlined, CalendarOutlined, TeamOutlined, CheckCircleFilled,
  WarningFilled, DownloadOutlined, AuditOutlined, SafetyCertificateOutlined,
  SendOutlined, TableOutlined
} from '@ant-design/icons';
import { useAppContext } from '../../../app/AppContext';
import toast from 'react-hot-toast';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface AuditLog {
  id: string;
  time: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
}

interface AssignedJudge {
  id: string;
  judgeId: number;
  judgeName: string;
  role: string;
  isIndependent: boolean;
}

interface TeamScore {
  teamId: number;
  teamName: string;
  assignedGroup: string;
  criteriaScores: { [key: number]: number }; // criteriaId -> score
  weightedAvg: number;
  status: 'ACTIVE' | 'ELIMINATED';
  rank?: number;
}

interface Team {
  id: number;
  name: string;
  group: string;
  score: number;
  status: string;
  isWildcard: boolean;
}

interface Criterion {
  id: number;
  name: string;
  weight: number;
  maxScore: number;
}

interface PrizeClaim {
  id: string;
  teamName: string;
  prize: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  status: string;
}

interface ExportJob {
  id: string;
  name: string;
  type: string;
  status: string;
  progress: number;
  downloadUrl: string;
}

const FinalRoundConfigPage: React.FC = () => {
  const { addNotification, notifications } = useAppContext();

  // Local storage keys
  const STORAGE_PREFIX = 'seal_final_round_fe3_';

  // --- MOCK INITIAL DATA ---
  const INITIAL_TEAMS = [
    { id: 1, name: 'Code Crusaders', group: 'Group Alpha', score: 9.2, status: 'ACTIVE', isWildcard: false },
    { id: 2, name: 'Dev Dynasty', group: 'Group Alpha', score: 8.8, status: 'ACTIVE', isWildcard: false },
    { id: 3, name: 'Innovate Hub', group: 'Group Beta', score: 8.9, status: 'ACTIVE', isWildcard: false },
    { id: 4, name: 'Quantum Leap', group: 'Group Beta', score: 8.5, status: 'ACTIVE', isWildcard: false },
    { id: 8, name: 'Matrix Mavericks', group: 'Group Gamma', score: 8.1, status: 'ELIMINATED', isWildcard: false },
  ];

  const INITIAL_JUDGES = [
    { id: 1, name: 'Nguyễn Trung Hậu', institution: 'FPT University', email: 'haunt@fpt.edu.vn' },
    { id: 2, name: 'Lê Ngọc Mai', institution: 'TechCorp', email: 'mai.le@techcorp.vn' },
    { id: 3, name: 'Trần Minh Tuấn', institution: 'SEAL Team', email: 'tuan.tran@seal.com' },
    { id: 4, name: 'Phan Hoàng Nam (Guest)', institution: 'Google Developers Group', email: 'nam.phan@gdg.com' },
    { id: 5, name: 'Vũ Thị Hồng', institution: 'VNU University', email: 'hongvt@vnu.edu.vn' }
  ];

  const INITIAL_CRITERIA = [
    { id: 1, name: 'Chất lượng Mã nguồn (Code Quality)', weight: 0.30, maxScore: 10 },
    { id: 2, name: 'UX/UI & Thiết kế (Design)', weight: 0.20, maxScore: 10 },
    { id: 3, name: 'Tính khả thi & Giá trị (Feasibility)', weight: 0.20, maxScore: 10 },
    { id: 4, name: 'Sự sáng tạo & Công nghệ (Innovation)', weight: 0.20, maxScore: 10 },
    { id: 5, name: 'Phần thi thuyết trình (Presentation)', weight: 0.10, maxScore: 10 }
  ];

  const INITIAL_SCOREBOARD: TeamScore[] = [
    { teamId: 1, teamName: 'Code Crusaders', assignedGroup: 'Group Alpha', criteriaScores: { 1: 9.5, 2: 9.0, 3: 9.0, 4: 9.5, 5: 9.0 }, weightedAvg: 9.25, status: 'ACTIVE' },
    { teamId: 3, teamName: 'Innovate Hub', assignedGroup: 'Group Beta', criteriaScores: { 1: 9.0, 2: 9.0, 3: 9.0, 4: 9.0, 5: 8.5 }, weightedAvg: 8.95, status: 'ACTIVE' },
    { teamId: 2, teamName: 'Dev Dynasty', assignedGroup: 'Group Alpha', criteriaScores: { 1: 8.5, 2: 8.5, 3: 9.0, 4: 8.5, 5: 9.0 }, weightedAvg: 8.65, status: 'ACTIVE' },
    { teamId: 5, teamName: 'Zenith Tech', assignedGroup: 'Group Gamma', criteriaScores: { 1: 8.5, 2: 8.5, 3: 8.0, 4: 9.0, 5: 8.5 }, weightedAvg: 8.45, status: 'ACTIVE' },
    { teamId: 4, teamName: 'Quantum Leap', assignedGroup: 'Group Beta', criteriaScores: { 1: 8.0, 2: 8.5, 3: 8.5, 4: 8.0, 5: 8.0 }, weightedAvg: 8.15, status: 'ACTIVE' },
    { teamId: 6, teamName: 'Nebula Ninjas (Wildcard)', assignedGroup: 'Cross-bảng', criteriaScores: { 1: 8.0, 2: 8.0, 3: 8.0, 4: 8.5, 5: 8.0 }, weightedAvg: 8.10, status: 'ACTIVE' }
  ];

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<string>('gd4');
  const [useMock, setUseMock] = useState<boolean>(true);

  // GĐ4 States
  const [teams, setTeams] = useState<Team[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'teams');
    return saved ? JSON.parse(saved) : INITIAL_TEAMS;
  });

  const [criteria, setCriteria] = useState<Criterion[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'criteria');
    return saved ? JSON.parse(saved) : INITIAL_CRITERIA;
  });

  const [finalRoundActive, setFinalRoundActive] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_PREFIX + 'finalRoundActive') === 'true';
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'auditLogs');
    return saved ? JSON.parse(saved) : [
      { id: '1', time: new Date().toLocaleTimeString(), message: 'Hệ thống đã sẵn sàng cho cấu hình Chung kết.', type: 'INFO' }
    ];
  });

  // GĐ5 States
  const [assignedJudges, setAssignedJudges] = useState<AssignedJudge[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'assignedJudges');
    return saved ? JSON.parse(saved) : [
      { id: 'j-1', judgeId: 1, judgeName: 'Nguyễn Trung Hậu', role: 'HEAD', isIndependent: true },
      { id: 'j-2', judgeId: 4, judgeName: 'Phan Hoàng Nam (Guest)', role: 'NORMAL', isIndependent: true }
    ];
  });

  const [scoringLocked, setScoringLocked] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_PREFIX + 'scoringLocked') === 'true';
  });

  const [roundStatus, setRoundStatus] = useState<'ACTIVE' | 'PENDING_CONFIRM' | 'FINISHED'>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'roundStatus');
    return (saved as any) || 'ACTIVE';
  });

  // GĐ6 States
  const [globalFrozen, setGlobalFrozen] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_PREFIX + 'globalFrozen') === 'true';
  });

  const [prizeClaims, setPrizeClaims] = useState<PrizeClaim[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'prizeClaims');
    return saved ? JSON.parse(saved) : [
      { id: 'c-1', teamName: 'Code Crusaders', prize: 'Giải Nhất (Champion)', accountName: 'NGUYEN VAN A', bankName: 'Vietcombank', accountNumber: '1023948576', status: 'PENDING' },
      { id: 'c-2', teamName: 'Innovate Hub', prize: 'Giải Nhì', accountName: 'TRAN THI B', bankName: 'Techcombank', accountNumber: '190394827591', status: 'PENDING' }
    ];
  });

  const [exportJobs, setExportJobs] = useState<ExportJob[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'exportJobs');
    return saved ? JSON.parse(saved) : [
      { id: 'job-1', name: 'Báo cáo điểm số chi tiết Chung kết.xlsx', type: 'EXCEL', status: 'DONE', progress: 100, downloadUrl: '#download' }
    ];
  });

  // Scoreboard state
  const [scoreboard, setScoreboard] = useState<TeamScore[]>(INITIAL_SCOREBOARD);

  // Form hooks
  const [judgeForm] = Form.useForm();
  const [prizeForm] = Form.useForm();

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'teams', JSON.stringify(teams));
    localStorage.setItem(STORAGE_PREFIX + 'criteria', JSON.stringify(criteria));
    localStorage.setItem(STORAGE_PREFIX + 'finalRoundActive', String(finalRoundActive));
    localStorage.setItem(STORAGE_PREFIX + 'auditLogs', JSON.stringify(auditLogs));
    localStorage.setItem(STORAGE_PREFIX + 'assignedJudges', JSON.stringify(assignedJudges));
    localStorage.setItem(STORAGE_PREFIX + 'scoringLocked', String(scoringLocked));
    localStorage.setItem(STORAGE_PREFIX + 'roundStatus', roundStatus);
    localStorage.setItem(STORAGE_PREFIX + 'globalFrozen', String(globalFrozen));
    localStorage.setItem(STORAGE_PREFIX + 'prizeClaims', JSON.stringify(prizeClaims));
    localStorage.setItem(STORAGE_PREFIX + 'exportJobs', JSON.stringify(exportJobs));
  }, [teams, criteria, finalRoundActive, auditLogs, assignedJudges, scoringLocked, roundStatus, globalFrozen, prizeClaims, exportJobs]);

  // --- HELPERS ---
  const addLog = (message: string, type: AuditLog['type'] = 'INFO') => {
    const newLog: AuditLog = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString(),
      message,
      type
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const getSumWeights = () => {
    return criteria.reduce((sum: number, item: any) => sum + item.weight, 0);
  };

  const isWeightValid = Math.abs(getSumWeights() - 1.0) < 0.001;

  // --- HANDLERS ---
  // Toggle team status
  const handleToggleTeamStatus = (teamId: number) => {
    if (globalFrozen) {
      toast.error('Giao diện đang bị KHÓA (Frozen) sau khi đã kết thúc sự kiện!');
      return;
    }
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        const nextStatus = t.status === 'ACTIVE' ? 'ELIMINATED' : 'ACTIVE';
        addLog(`Cập nhật trạng thái đội "${t.name}" từ ${t.status} sang ${nextStatus}.`, 'INFO');
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  // Confirm final teams list
  const handleConfirmFinalTeams = () => {
    if (globalFrozen) {
      toast.error('Không thể thực hiện. Sự kiện đã kết thúc và bị khóa.');
      return;
    }
    
    // count active teams
    const activeTeams = teams.filter(t => t.status === 'ACTIVE');
    if (activeTeams.length !== 6) {
      Modal.warning({
        title: 'Yêu cầu quy chuẩn danh sách',
        content: `Ban tổ chức quy định danh sách vào Chung kết phải có đúng 6 đội (bao gồm wild card). Hiện tại đang chọn: ${activeTeams.length} đội ACTIVE. Vui lòng kiểm tra lại.`,
        okText: 'Hiểu rồi'
      });
      return;
    }

    Modal.confirm({
      title: 'Xác nhận Danh sách Vòng Chung kết',
      content: 'Hệ thống sẽ chốt danh sách 6 đội này và tự động gửi thông báo tới các đội liên quan. Bạn có chắc chắn?',
      okText: 'Xác nhận & Gửi thông báo',
      cancelText: 'Hủy',
      onOk: () => {
        addLog('Đã xác nhận danh sách 6 đội vào Chung kết.', 'SUCCESS');
        
        // Notification
        addNotification({
          type: 'INVITATION',
          title: 'Danh sách Chung kết đã được chốt',
          description: 'Hệ thống đã chốt danh sách 6 đội thi Chung kết (bao gồm wildcard). Trạng thái các đội đã chuyển sang ACTIVE.',
        });
        toast.success('Xác nhận danh sách thành công! Đã gửi thông báo tới các đội.');
      }
    });
  };

  // Update criteria weight
  const handleCriteriaWeightChange = (id: number, val: number | null) => {
    if (globalFrozen) return;
    setCriteria(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, weight: val !== null ? val : 0 };
      }
      return c;
    }));
  };

  // Toggle Final Round activation
  const handleToggleFinalRoundActive = (checked: boolean) => {
    if (globalFrozen) return;
    
    if (checked && !isWeightValid) {
      toast.error('Chưa thể kích hoạt! Tổng trọng số các tiêu chí phải bằng 1.0 (100%).');
      return;
    }

    if (checked) {
      setFinalRoundActive(true);
      addLog('Đã kích hoạt Vòng Chung kết (is_active = TRUE).', 'SUCCESS');
      addNotification({
        type: 'REMINDER',
        title: 'Vòng Chung kết được kích hoạt',
        description: 'Vòng Chung kết đã được bật. Cổng nộp bài theo 5 tiêu chí độc lập đã mở cho các đội.',
      });
      toast.success('Đã kích hoạt Vòng Chung kết thành công!');
    } else {
      setFinalRoundActive(false);
      addLog('Đã hủy kích hoạt Vòng Chung kết.', 'WARNING');
      toast.success('Đã ngắt kích hoạt Vòng Chung kết.');
    }
  };

  // Assign judge
  const handleAssignJudge = (values: { judgeId: number; role: string }) => {
    if (globalFrozen) return;

    // UNIQUE check
    const isAssigned = assignedJudges.some(j => j.judgeId === values.judgeId);
    if (isAssigned) {
      Modal.error({
        title: 'Trùng lặp Giám khảo',
        content: 'Giám khảo này đã được phân công chấm Vòng Chung kết. Hệ thống yêu cầu mỗi Giám khảo chỉ xuất hiện một lần trên bảng gán (UNIQUE constraint).',
        okText: 'Quay lại'
      });
      return;
    }

    const judgeData = INITIAL_JUDGES.find(j => j.id === values.judgeId);
    if (!judgeData) return;

    const newAssignment: AssignedJudge = {
      id: 'j-' + Date.now(),
      judgeId: values.judgeId,
      judgeName: judgeData.name,
      role: values.role,
      isIndependent: true
    };

    setAssignedJudges(prev => [...prev, newAssignment]);
    addLog(`Đã gán Giám khảo "${judgeData.name}" vào Vòng Chung kết với vai trò: ${values.role}.`, 'SUCCESS');
    toast.success('Gán giám khảo thành công!');
    judgeForm.resetFields();
  };

  // Remove judge assignment
  const handleRemoveJudge = (id: string, judgeName: string) => {
    if (globalFrozen) return;
    setAssignedJudges(prev => prev.filter(j => j.id !== id));
    addLog(`Đã gỡ giám khảo "${judgeName}" khỏi Vòng Chung kết.`, 'INFO');
    toast.success('Đã gỡ giám khảo.');
  };

  // Lock scoring
  const handleLockScoring = () => {
    if (globalFrozen) return;
    
    Modal.confirm({
      title: 'Xác nhận Khóa Chấm Điểm?',
      content: 'Sau khi Khóa chấm (scoring_locked = TRUE), ban giám khảo sẽ không thể chỉnh sửa điểm số hoặc bình luận. Điểm số sẽ được chốt để coordinator phê duyệt.',
      okText: 'Khóa chấm ngay',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: () => {
        setScoringLocked(true);
        addLog('Đã KHÓA luồng chấm điểm Vòng Chung kết (scoring_locked = TRUE).', 'WARNING');
        toast.success('Đã khóa chấm điểm thành công!');
      }
    });
  };

  // Change status to PENDING_CONFIRM
  const handleSetPendingConfirm = () => {
    if (globalFrozen) return;

    if (!scoringLocked) {
      toast.error('Vui lòng KHÓA CHẤM ĐIỂM trước khi chuyển trạng thái sang PENDING_CONFIRM!');
      return;
    }

    setRoundStatus('PENDING_CONFIRM');
    addLog('Đã chuyển trạng thái Vòng Chung kết sang PENDING_CONFIRM. Bảng điểm đã ẩn hoàn toàn với sinh viên.', 'INFO');
    toast.success('Đã chuyển trạng thái sang PENDING_CONFIRM!');
  };

  // Confirm FINISHED
  const handleConfirmFinished = () => {
    if (globalFrozen) return;

    Modal.confirm({
      title: 'Xác nhận HOÀN THÀNH VÒNG THI (FINISHED)?',
      content: (
        <div>
          <Paragraph className="text-red-500 font-bold">
            CẢNH BÁO: Đây là trạng thái cuối cùng (Terminal state) và không thể hoàn tác!
          </Paragraph>
          <Paragraph>
            Tất cả dữ liệu chấm điểm sẽ bị khóa đọc-ghi vĩnh viễn. Hệ thống sẽ tự động công bố kết quả (Trigger RESULT_PUBLISHED) tới toàn bộ thí sinh và các Chapter.
          </Paragraph>
        </div>
      ),
      okText: 'Xác nhận FINISHED & Công bố',
      cancelText: 'Quay lại',
      okButtonProps: { danger: true },
      onOk: () => {
        setRoundStatus('FINISHED');
        setGlobalFrozen(true); // Auto freeze UI after finish
        addLog('Sự kiện Chung kết đã xác nhận HOÀN THÀNH (FINISHED). Dữ liệu đã lưu trữ.', 'SUCCESS');
        
        // Trigger RESULT_PUBLISHED
        addNotification({
          type: 'WARNING',
          title: 'RESULT_PUBLISHED - Công bố kết quả',
          description: 'Kết quả chính thức của SEAL Hackathon đã được công bố rộng rãi. Tất cả màn hình đã chuyển sang chế độ FROZEN.',
        });
        toast.success('Đã xác nhận FINISHED & Công bố kết quả thành công!');
      }
    });
  };

  // Reset demo states
  const handleResetDemo = () => {
    localStorage.removeItem(STORAGE_PREFIX + 'teams');
    localStorage.removeItem(STORAGE_PREFIX + 'criteria');
    localStorage.removeItem(STORAGE_PREFIX + 'finalRoundActive');
    localStorage.removeItem(STORAGE_PREFIX + 'auditLogs');
    localStorage.removeItem(STORAGE_PREFIX + 'assignedJudges');
    localStorage.removeItem(STORAGE_PREFIX + 'scoringLocked');
    localStorage.removeItem(STORAGE_PREFIX + 'roundStatus');
    localStorage.removeItem(STORAGE_PREFIX + 'globalFrozen');
    localStorage.removeItem(STORAGE_PREFIX + 'prizeClaims');
    localStorage.removeItem(STORAGE_PREFIX + 'exportJobs');

    setTeams(INITIAL_TEAMS);
    setCriteria(INITIAL_CRITERIA);
    setFinalRoundActive(false);
    setAssignedJudges([
      { id: 'j-1', judgeId: 1, judgeName: 'Nguyễn Trung Hậu', role: 'HEAD', isIndependent: true },
      { id: 'j-2', judgeId: 4, judgeName: 'Phan Hoàng Nam (Guest)', role: 'NORMAL', isIndependent: true }
    ]);
    setScoringLocked(false);
    setRoundStatus('ACTIVE');
    setGlobalFrozen(false);
    setPrizeClaims([
      { id: 'c-1', teamName: 'Code Crusaders', prize: 'Giải Nhất (Champion)', accountName: 'NGUYEN VAN A', bankName: 'Vietcombank', accountNumber: '1023948576', status: 'PENDING' },
      { id: 'c-2', teamName: 'Innovate Hub', prize: 'Giải Nhì', accountName: 'TRAN THI B', bankName: 'Techcombank', accountNumber: '190394827591', status: 'PENDING' }
    ]);
    setExportJobs([
      { id: 'job-1', name: 'Báo cáo điểm số chi tiết Chung kết.xlsx', type: 'EXCEL', status: 'DONE', progress: 100, downloadUrl: '#download' }
    ]);
    setAuditLogs([
      { id: 'reset', time: new Date().toLocaleTimeString(), message: 'Đã hoàn tác và thiết lập lại dữ liệu DEMO FE-3.', type: 'INFO' }
    ]);

    toast.success('Đã reset toàn bộ trạng thái về ban đầu!');
  };

  // Add mock prize claim
  const handleAddPrizeClaim = (values: any) => {
    const newClaim = {
      id: 'c-' + Date.now(),
      ...values,
      status: 'PENDING'
    };
    setPrizeClaims(prev => [...prev, newClaim]);
    addLog(`Đội "${values.teamName}" đã nộp thông tin nhận thưởng (${values.prize}).`, 'INFO');
    toast.success('Gửi thông tin nhận giải thành công!');
    prizeForm.resetFields();
  };

  // Approve prize claim status
  const handleApprovePrizeClaim = (id: string) => {
    setPrizeClaims(prev => prev.map(c => {
      if (c.id === id) {
        addLog(`Đã duyệt thông tin nhận thưởng của đội "${c.teamName}".`, 'SUCCESS');
        return { ...c, status: 'APPROVED' };
      }
      return c;
    }));
    toast.success('Đã duyệt thông tin!');
  };

  // Simulate async export job
  const handleCreateExportJob = (name: string, type: 'EXCEL' | 'CSV') => {
    const jobId = 'job-' + Date.now();
    const newJob = {
      id: jobId,
      name: `${name}_${Date.now().toString().slice(-4)}.${type.toLowerCase()}`,
      type,
      status: 'PENDING',
      progress: 0,
      downloadUrl: ''
    };

    setExportJobs(prev => [newJob, ...prev]);
    addLog(`Đã khởi tạo Job xuất báo cáo: ${newJob.name}. Đang xử lý nền...`, 'INFO');

    // Simulate background worker
    let prog = 0;
    const interval = setInterval(() => {
      prog += 25;
      setExportJobs(prev => prev.map(j => {
        if (j.id === jobId) {
          if (prog >= 100) {
            clearInterval(interval);
            addLog(`Job export "${j.name}" đã hoàn thành! Sẵn sàng tải xuống.`, 'SUCCESS');
            return { ...j, status: 'DONE', progress: 100, downloadUrl: '#download-link' };
          }
          return { ...j, status: 'PROCESSING', progress: prog };
        }
        return j;
      }));
    }, 600);
  };

  const getTeamAvatarColor = (name: string) => {
    if (name.includes('Code')) return '#1890ff';
    if (name.includes('Dev')) return '#13c2c2';
    if (name.includes('Innovate')) return '#722ed1';
    if (name.includes('Quantum')) return '#2f54eb';
    return '#8c8c8c';
  };

  const teamColumns = [
    {
      title: 'TÊN ĐỘI THI',
      dataIndex: 'name',
      key: 'name',
      render: (t: string, r: any) => (
        <Space>
          <Avatar 
            className="font-bold border-none" 
            style={{ 
              backgroundColor: getTeamAvatarColor(t)
            }}
          >
            {t[0].toUpperCase()}
          </Avatar>
          <Text strong style={r.status === 'ELIMINATED' ? { color: '#bfbfbf', textDecoration: 'line-through' } : {}} className="text-slate-800 dark:text-zinc-100">
            {t}
          </Text>
        </Space>
      )
    },
    {
      title: 'PHÂN BẢNG',
      dataIndex: 'group',
      key: 'group',
      render: (g: string) => {
        const isGamma = g.includes('Gamma');
        return (
          <span className={`px-3 py-1 rounded text-xs font-semibold ${isGamma ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-500'}`}>
            {g}
          </span>
        );
      }
    },
    {
      title: 'ĐIỂM BÁN KẾT',
      dataIndex: 'score',
      key: 'score',
      render: (s: number) => (
        <span className="font-bold text-slate-800 dark:text-zinc-200">{s.toFixed(1)}</span>
      )
    },
    {
      title: 'TRẠNG THÁI',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        return status === 'ACTIVE' ? (
          <span className="text-[#389e0d] font-bold text-xs flex items-center gap-1.5">
            <span className="text-[8px]">●</span> ACTIVE
          </span>
        ) : (
          <span className="text-rose-500 font-bold text-xs flex items-center gap-1.5">
            <span className="text-[8px]">●</span> ELIMINATED
          </span>
        );
      }
    },
    {
      title: 'CẬP NHẬT',
      key: 'action',
      render: (_: any, record: any) => (
        <Switch
          checked={record.status === 'ACTIVE'}
          onChange={() => handleToggleTeamStatus(record.id)}
          disabled={globalFrozen}
          style={{
            backgroundColor: record.status === 'ACTIVE' ? '#0f3d8a' : undefined
          }}
        />
      )
    }
  ];

  const judgeColumns = [
    {
      title: 'Tên Giám Khảo',
      dataIndex: 'judgeName',
      key: 'judgeName',
      render: (text: string, r: AssignedJudge) => (
        <Space>
          <Avatar 
            icon={<UserOutlined />} 
            className="bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400 border border-purple-200 dark:border-purple-900" 
          />
          <div>
            <Text strong className="block text-slate-800 dark:text-zinc-100">{text}</Text>
            <Text type="secondary" className="text-xs block">
              {INITIAL_JUDGES.find(j => j.id === r.judgeId)?.institution || 'Giám khảo'}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Vai Trò',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        return role === 'HEAD' ? (
          <Tag color="red" icon={<CrownOutlined />} className="rounded-full px-3 py-0.5 font-bold uppercase text-xxs">
            Trưởng ban
          </Tag>
        ) : (
          <Tag color="blue" className="rounded-full px-3 py-0.5 font-bold uppercase text-xxs">
            Giám khảo thường
          </Tag>
        );
      }
    },
    {
      title: 'Đặc Điểm',
      key: 'characteristic',
      render: () => (
        <Tag color="purple" className="rounded-full px-3 py-0.5 font-medium">
          Panel độc lập
        </Tag>
      )
    },
    {
      title: 'Gỡ gán',
      key: 'action',
      render: (_: any, r: AssignedJudge) => (
        <Tooltip title="Xóa khỏi hội đồng">
          <Button 
            type="text" 
            danger 
            shape="circle"
            icon={<CloseOutlined />} 
            onClick={() => handleRemoveJudge(r.id, r.judgeName)}
            disabled={globalFrozen}
            className="hover:bg-red-50 dark:hover:bg-red-950/20"
          />
        </Tooltip>
      )
    }
  ];

  return (
    <div className="final-round-page p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn text-slate-800 dark:text-zinc-100">
      <style>{`
        /* ======================================
           FINAL ROUND PAGE – CLEAN UI OVERRIDES
           ====================================== */

        /* --- Cards --- */
        .final-round-page .ant-card {
          border: none !important;
          box-shadow: 0 1px 8px rgba(15,61,138,0.07) !important;
        }
        .final-round-page .ant-card-head {
          border-bottom: 1px solid #f0f4fa !important;
          background: transparent !important;
          min-height: 48px !important;
          padding: 0 20px !important;
        }
        .final-round-page .ant-card-body {
          background: transparent !important;
        }

        /* --- Table --- */
        .final-round-page .ant-table {
          background: transparent !important;
          border: none !important;
        }
        .final-round-page .ant-table-container {
          border: none !important;
          border-radius: 0 !important;
        }
        .final-round-page .ant-table-container::before,
        .final-round-page .ant-table-container::after {
          display: none !important;
        }
        .final-round-page .ant-table-cell {
          border-bottom: 1px solid #f0f4fa !important;
          border-right: none !important;
          border-left: none !important;
          border-top: none !important;
          background: transparent !important;
        }
        .final-round-page .ant-table-thead .ant-table-cell {
          border-bottom: 2px solid #eef2f8 !important;
          background: #f5f8ff !important;
        }
        .final-round-page .ant-table-row:last-child .ant-table-cell {
          border-bottom: none !important;
        }
        .final-round-page .ant-table-wrapper {
          border: none !important;
        }

        /* --- Progress Bar (Ant Design v5) --- */
        .final-round-page .ant-progress-trail,
        .final-round-page .ant-progress-bg,
        .final-round-page .ant-progress .ant-progress-inner {
          border: none !important;
          border-radius: 100px !important;
        }
        .final-round-page .ant-progress .ant-progress-inner {
          background-color: #e8edf8 !important;
        }
        .final-round-page .ant-progress .ant-progress-bg {
          background-color: #0f3d8a !important;
        }
        .final-round-page .ant-progress-line {
          font-size: 0 !important;
          line-height: 1 !important;
          margin: 0 !important;
        }

        /* --- InputNumber --- */
        .final-round-page .ant-input-number {
          border: 1px solid #e2e8f0 !important;
          box-shadow: none !important;
          background: #f1f5fb !important;
          border-radius: 6px !important;
        }
        .final-round-page .ant-input-number:focus,
        .final-round-page .ant-input-number-focused {
          border-color: #0f3d8a !important;
          box-shadow: 0 0 0 2px rgba(15,61,138,0.08) !important;
        }
        .final-round-page .ant-input-number-input {
          background: transparent !important;
          text-align: center !important;
          font-weight: 700 !important;
          color: #1e3a5f !important;
        }

        /* --- Tabs --- */
        .final-round-page .ant-tabs-nav::before {
          border-bottom: 1px solid #eef2f8 !important;
        }
        .final-round-page .ant-tabs-tab {
          font-size: 12px !important;
          font-weight: 600 !important;
          color: #8fa3bf !important;
          padding: 10px 2px !important;
        }
        .final-round-page .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #0f3d8a !important;
          font-weight: 700 !important;
        }
        .final-round-page .ant-tabs-ink-bar {
          background: #0f3d8a !important;
        }

        /* --- Divider --- */
        .final-round-page .ant-divider {
          border-color: #eef2f8 !important;
        }

        /* --- Select --- */
        .final-round-page .ant-select:not(.ant-select-customize-input) .ant-select-selector {
          border-color: #e2e8f0 !important;
          box-shadow: none !important;
        }

        /* --- Tag --- */
        .final-round-page .ant-tag {
          border: none !important;
        }

        /* --- Timeline --- */
        .final-round-page .ant-timeline-item-tail {
          border-left-color: #eef2f8 !important;
        }
      `}</style>
      

      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight m-0">
            Cổng Quản trị & Cấu hình Chung kết
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-sm mt-1 mb-0">
            Quản lý vòng đấu cuối cùng và thiết lập tiêu chí chấm điểm cho giám khảo.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            type="primary"
            icon={<DownloadOutlined />} 
            onClick={() => handleCreateExportJob('Bao_Cao_Chung_Ket', 'EXCEL')}
            className="rounded-lg font-bold bg-[#0f3d8a] hover:bg-[#1a4f9e] border-none px-6 h-10 flex items-center gap-2 text-white"
          >
            XUẤT BÁO CÁO
          </Button>
        </div>
      </div>

      {/* STATE OVERVIEW & STATUSES */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="rounded-2xl hover:shadow-md transition-all duration-300 dark:bg-zinc-900" style={{ border: 'none', boxShadow: '0 2px 12px rgba(15,61,138,0.08)', background: '#fff' }} bodyStyle={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                <CalendarOutlined className="text-lg text-slate-400" />
              </div>
              {finalRoundActive ? (
                <Tag color="success" className="rounded-full font-bold m-0">Hoạt động</Tag>
              ) : (
                <Tag color="warning" className="rounded-full font-bold m-0">Tạm ngưng</Tag>
              )}
            </div>
            <div className="text-slate-400 text-[10px] font-extrabold tracking-wider mb-1 uppercase">VÒNG CHUNG KẾT</div>
            <div className="text-base font-extrabold text-slate-800">Giai đoạn 6</div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="rounded-2xl hover:shadow-md transition-all duration-300 dark:bg-zinc-900" style={{ border: 'none', boxShadow: '0 2px 12px rgba(15,61,138,0.08)', background: '#fff' }} bodyStyle={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <LockOutlined className="text-lg text-[#1890ff]" />
              </div>
              {scoringLocked ? (
                <Tag color="error" className="rounded-full font-bold m-0">Đã khóa</Tag>
              ) : (
                <Tag color="success" className="rounded-full font-bold m-0">Đang mở</Tag>
              )}
            </div>
            <div className="text-slate-400 text-[10px] font-extrabold tracking-wider mb-1 uppercase">KHÓA CHẤM ĐIỂM</div>
            <div className="text-base font-extrabold text-slate-800">Manual Mode</div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="rounded-2xl hover:shadow-md transition-all duration-300 dark:bg-zinc-900" style={{ border: 'none', boxShadow: '0 2px 12px rgba(15,61,138,0.08)', background: '#fff' }} bodyStyle={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <TeamOutlined className="text-lg text-orange-400" />
              </div>
            </div>
            <div className="text-slate-400 text-[10px] font-extrabold tracking-wider mb-1 uppercase">SỐ ĐỘI CHUNG KẾT</div>
            <div className="text-base font-extrabold text-slate-800">
              {teams.filter(t => t.status === 'ACTIVE').length}/6 Đội
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="rounded-2xl hover:shadow-md transition-all duration-300 dark:bg-zinc-900" style={{ border: 'none', boxShadow: '0 2px 12px rgba(15,61,138,0.08)', background: '#fff' }} bodyStyle={{ padding: '20px' }}>
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <AuditOutlined className="text-lg text-[#2f54eb]" />
              </div>
            </div>
            <div className="text-slate-400 text-[10px] font-extrabold tracking-wider mb-1 uppercase">GIÁM KHẢO CHUNG KẾT</div>
            <div className="text-base font-extrabold text-slate-800">
              {assignedJudges.length} Judges
            </div>
          </Card>
        </Col>
      </Row>

      {/* TABS CONTAINER */}
      <div className="w-full">
        <Tabs activeKey={activeTab} onChange={setActiveTab} type="line" className="custom-dashboard-tabs">
          
          {/* TAB 1: GIAI ĐOẠN 4 */}
          <Tabs.TabPane tab="Vòng Sơ Loại" key="gd4">
            <div className="space-y-6 pt-4 animate-fadeIn">
              <Alert
                message={<span className="font-bold text-slate-800 dark:text-zinc-100">Vòng Sơ loại đã hoàn thành</span>}
                description="Toàn bộ kết quả và bảng xếp hạng vòng Sơ loại đã được công bố cho thí sinh. Cổng nộp bài Sơ loại đã khóa cứng."
                type="success"
                showIcon
                className="rounded-xl border-green-200 dark:border-green-950"
              />
              
              <Card 
                title={<span className="font-extrabold text-sm text-slate-700 dark:text-zinc-200">Bảng xếp hạng Vòng Sơ loại (Leaderboard)</span>}
                size="small"
                bordered={false}
                className="rounded-2xl shadow-sm overflow-hidden"
              >
                <Table
                  columns={[
                    {
                      title: 'HẠNG',
                      key: 'rank',
                      width: 80,
                      render: (_, __, index) => <strong className="text-slate-500">#{index + 1}</strong>
                    },
                    {
                      title: 'TÊN ĐỘI THI',
                      dataIndex: 'name',
                      key: 'name',
                      render: (t: string) => <Text strong className="dark:text-zinc-200">{t}</Text>
                    },
                    {
                      title: 'PHÂN BẢNG',
                      dataIndex: 'group',
                      key: 'group',
                      render: (g: string) => <Tag color="blue" className="rounded-full px-2">{g}</Tag>
                    },
                    {
                      title: 'ĐIỂM SƠ LOẠI',
                      dataIndex: 'score',
                      key: 'score',
                      render: (s: number) => <span className="font-bold text-indigo-600 dark:text-indigo-400">{s.toFixed(1)}</span>
                    },
                    {
                      title: 'TRẠNG THÁI',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string) => (
                        <Tag color={status === 'ACTIVE' ? 'success' : 'error'} className="rounded-full px-3 font-semibold uppercase text-xxs">
                          {status}
                        </Tag>
                      )
                    }
                  ]}
                  dataSource={[...INITIAL_TEAMS].sort((a, b) => b.score - a.score)}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                />
              </Card>
            </div>
          </Tabs.TabPane>

          {/* TAB 2: GIAI ĐOẠN 5 */}
          <Tabs.TabPane tab="Vòng Bán Kết" key="gd5">
            <div className="space-y-6 pt-4 animate-fadeIn">
              <Alert
                message={<span className="font-bold text-slate-800 dark:text-zinc-100">Vòng Bán kết đã hoàn thành</span>}
                description="Toàn bộ kết quả và danh sách các đội được đề cử vào Chung kết đã được phê duyệt. Đang chuyển giao sang vòng Chung kết."
                type="info"
                showIcon
                className="rounded-xl border-blue-200 dark:border-blue-950"
              />

              <Card 
                title={<span className="font-extrabold text-sm text-slate-700 dark:text-zinc-200">Bảng xếp hạng Vòng Bán kết (Leaderboard)</span>}
                size="small"
                bordered={false}
                className="rounded-2xl shadow-sm overflow-hidden"
              >
                <Table
                  columns={[
                    {
                      title: 'HẠNG',
                      key: 'rank',
                      width: 80,
                      render: (_, __, index) => <strong className="text-slate-500">#{index + 1}</strong>
                    },
                    {
                      title: 'TÊN ĐỘI THI',
                      dataIndex: 'name',
                      key: 'name',
                      render: (t: string) => <Text strong className="dark:text-zinc-200">{t}</Text>
                    },
                    {
                      title: 'PHÂN BẢNG',
                      dataIndex: 'group',
                      key: 'group',
                      render: (g: string) => <Tag color="purple" className="rounded-full px-2">{g}</Tag>
                    },
                    {
                      title: 'ĐIỂM BÁN KẾT',
                      dataIndex: 'score',
                      key: 'score',
                      render: (s: number) => <span className="font-bold text-indigo-600 dark:text-indigo-400">{s.toFixed(1)}</span>
                    },
                    {
                      title: 'TRẠNG THÁI',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string) => (
                        <Tag color={status === 'ACTIVE' ? 'success' : 'error'} className="rounded-full px-3 font-semibold uppercase text-xxs">
                          {status}
                        </Tag>
                      )
                    }
                  ]}
                  dataSource={[...INITIAL_TEAMS].filter(t => t.group !== 'Cross-bảng').sort((a, b) => b.score - a.score)}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                />
              </Card>
            </div>
          </Tabs.TabPane>

          {/* TAB 3: GIAI ĐOẠN 6 */}
          <Tabs.TabPane tab="Vòng Chung Kết" key="gd6">
            <div className="space-y-8 pt-4 animate-fadeIn">
              <div className="space-y-4">
                <Card 
                  title={
                    <span className="font-extrabold text-base text-slate-800 dark:text-zinc-150">
                      Xác nhận danh sách Chung kết (6 Đội)
                    </span>
                  }
                  extra={
                    <Space>
                      <Button 
                        onClick={() => {
                          toast.success('Đã tải lại danh sách đề xuất từ Bán kết!');
                        }}
                        className="rounded-lg font-bold border-blue-500 text-blue-500 bg-white hover:bg-blue-50 px-4 h-9"
                      >
                        Chọn lại danh sách
                      </Button>
                      <Button 
                        type="primary"
                        onClick={() => {
                          toast.success('Đã lưu cấu hình danh sách Chung kết!');
                        }}
                        className="rounded-lg font-bold bg-[#0f3d8a] hover:bg-[#1a4f9e] border-none px-4 h-9 shadow-sm text-white"
                      >
                        Lưu cấu hình
                      </Button>
                    </Space>
                  }
                  className="rounded-2xl shadow-sm overflow-hidden final-config-table"
                  bordered={false}
                >

                  <Table
                    columns={teamColumns}
                    dataSource={teams}
                    rowKey="id"
                    pagination={false}
                    className="rounded-xl overflow-hidden shadow-sm"
                    size="middle"
                  />
                </Card>
              </div>

              {/* Task 2: Kích hoạt Round Chung kết & Cấu hình Tiêu chí */}
              <Row gutter={[24, 24]}>
                {/* Left: Criteria List and weights editor */}
                <Col xs={24} md={13}>
                  <Card bordered={false} className="rounded-2xl h-full dark:bg-zinc-900" style={{ border: 'none', boxShadow: '0 2px 12px rgba(15,61,138,0.08)', background: '#fff' }} bodyStyle={{ padding: '24px' }}>
                    <div>
                      <div className="flex justify-between items-center w-full pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#0f3d8a] text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs">2</span>
                          <span className="font-extrabold text-base text-slate-800 dark:text-zinc-150">
                            Kích hoạt Vòng Chung kết & Cấu hình Tiêu chi
                          </span>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0f3d8a] text-white">
                          Tổng 100%
                        </span>
                      </div>

                      <p className="text-slate-500 dark:text-zinc-400 text-xs leading-relaxed mb-6">
                        Hệ thống yêu cầu xác thực tổng trọng số tiêu chí (Criteria weight) phải đạt đúng 1.0 (100%) trước khi cho phép kích hoạt vòng Chung kết.
                      </p>

                      <div className="space-y-5 flex-1 flex flex-col justify-between">
                        {criteria.map(item => (
                          <div key={item.id} className="w-full">
                            <div className="flex justify-between items-center w-full mb-1">
                              <span className="font-bold text-slate-700 dark:text-zinc-300 text-xs">{item.name}</span>
                              <InputNumber
                                min={0}
                                max={1}
                                step={0.05}
                                value={item.weight}
                                onChange={(val) => handleCriteriaWeightChange(item.id, val)}
                                formatter={value => `${(Number(value) * 100).toFixed(0)}%`}
                                parser={value => Number(value ? value.replace('%', '') : 0) / 100}
                                disabled={globalFrozen}
                                className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 border-none rounded font-bold text-slate-800 dark:text-zinc-200 text-center w-16"
                                controls={false}
                                style={{ height: 28, lineHeight: '28px' }}
                              />
                            </div>
                            <Progress 
                              percent={item.weight * 100} 
                              showInfo={false} 
                              strokeColor="#0f3d8a"
                              trailColor="#e2e8f0"
                              className="m-0"
                              strokeWidth={8}
                              style={{ lineHeight: 0 }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </Col>

                {/* Right: Switch activate with warnings */}
                <Col xs={24} md={11}>
                  <Card
                    bordered={false}
                    className="rounded-2xl dark:bg-zinc-900 h-full"
                    style={{ border: 'none', boxShadow: '0 2px 12px rgba(15,61,138,0.08)', background: '#fff' }}
                    bodyStyle={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}
                  >
                    {/* Title */}
                    <div className="flex items-center gap-2 mb-5">
                      <SafetyCertificateOutlined style={{ fontSize: 18, color: '#6b7280' }} />
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                        Trạng thái kích hoạt
                      </span>
                    </div>

                    {/* Status box */}
                    {isWeightValid ? (
                      <div style={{
                        background: '#f6ffed',
                        border: '1px solid #b7eb8f',
                        borderRadius: 12,
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        marginBottom: 16
                      }}>
                        <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16, marginTop: 2, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 700, color: '#237804', fontSize: 12 }}>Đủ điều kiện kích hoạt</div>
                          <div style={{ color: '#389e0d', fontSize: 11, marginTop: 3, lineHeight: 1.6 }}>
                            Tổng trọng số bằng 1.0. Vòng Chung kết đã sẵn sàng để kích hoạt.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: '#fffbe6',
                        border: '1px solid #ffe58f',
                        borderRadius: 12,
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        marginBottom: 16
                      }}>
                        <WarningFilled style={{ color: '#faad14', fontSize: 16, marginTop: 2, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 700, color: '#ad6800', fontSize: 12 }}>Chưa đủ điều kiện kích hoạt</div>
                          <div style={{ color: '#d48806', fontSize: 11, marginTop: 3, lineHeight: 1.6 }}>
                            Tổng trọng số lệch 1.0 (100%). Nút kích hoạt sẽ bị khóa cứng.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Switch section - flex-grow to fill remaining space */}
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 16,
                      padding: '32px 20px',
                      flexGrow: 1,
                      marginBottom: 16
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        BẮT ĐẦU CHUNG KẾT
                      </div>
                      <div style={{ transform: 'scale(1.5)', margin: '8px 0' }}>
                        <Switch
                          checked={finalRoundActive}
                          onChange={handleToggleFinalRoundActive}
                          disabled={!isWeightValid || globalFrozen}
                          style={{ backgroundColor: finalRoundActive ? '#0f3d8a' : undefined }}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                        Gạt để chính thức bắt đầu vòng đấu
                      </div>
                    </div>

                    {/* Footer stats */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                        <span style={{ color: '#94a3b8' }}>Tự động khóa bảng điểm:</span>
                        <span style={{ fontWeight: 600, color: '#334155' }}>Sau 15 phút</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                        <span style={{ color: '#94a3b8' }}>Gửi thông báo giám khảo:</span>
                        <span style={{ fontWeight: 700, color: '#0f3d8a' }}>BẬT</span>
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* Task 3: Phân công Judge Chung kết */}
              {finalRoundActive && (
                <>
                  <Divider className="border-slate-100" />
                  <div className="space-y-4">
                    <div>
                      <Title level={4} className="dark:text-white flex items-center gap-2 font-bold">
                        <Badge count={3} style={{ backgroundColor: '#722ed1', fontWeight: 'bold' }} />
                        Phân công Hội đồng Giám khảo Chung kết (Panel Độc Lập)
                      </Title>
                      <Paragraph className="text-slate-500 dark:text-zinc-400">
                        Gán giám khảo cho Round Chung kết. Ban giám khảo Chung kết hoạt động hoàn toàn độc lập, không kế thừa/copy thông tin từ vòng Sơ loại.
                      </Paragraph>
                    </div>

                    <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-start gap-3">
                      <InfoCircleOutlined className="text-lg text-purple-600 dark:text-purple-400 mt-0.5" />
                      <div>
                        <Text strong className="text-purple-800 dark:text-purple-400 block font-bold text-sm">Ràng buộc duy nhất & độc lập</Text>
                        <Text type="secondary" className="text-xs leading-relaxed block mt-0.5">
                          Mỗi giám khảo chỉ được gán tối đa 1 lần vào vòng Chung kết. Label rõ Panel Độc lập để phân biệt.
                        </Text>
                      </div>
                    </div>

                    <Row gutter={[24, 24]}>
                      {/* Assignment Form */}
                      <Col xs={24} lg={8}>
                        <Card 
                          bordered={false}
                          title={<span className="font-extrabold text-sm text-slate-700 dark:text-zinc-200">Gán Giám khảo Mới</span>} 
                          size="small" 
                          className="rounded-2xl"
                          style={{ border: 'none', boxShadow: '0 2px 12px rgba(15,61,138,0.08)' }}
                        >
                          <Form form={judgeForm} layout="vertical" onFinish={handleAssignJudge} className="p-2">
                            <Form.Item 
                              name="judgeId" 
                              label="Chọn Giám khảo" 
                              rules={[{ required: true, message: 'Vui lòng chọn giám khảo' }]}
                            >
                              <Select placeholder="Chọn giám khảo từ hệ thống" size="large" className="rounded-lg">
                                {INITIAL_JUDGES.map(j => (
                                  <Option key={j.id} value={j.id}>{j.name} ({j.institution})</Option>
                                ))}
                              </Select>
                            </Form.Item>

                            <Form.Item 
                              name="role" 
                              label="Vai trò trong Hội đồng" 
                              initialValue="NORMAL"
                              className="mb-6"
                            >
                              <Radio.Group className="w-full flex gap-3">
                                <Radio.Button value="NORMAL" className="flex-1 text-center rounded-lg h-9 leading-9 font-medium">
                                  Giám khảo
                                </Radio.Button>
                                <Radio.Button value="HEAD" className="flex-1 text-center rounded-lg h-9 leading-9 font-medium">
                                  Trưởng ban
                                </Radio.Button>
                              </Radio.Group>
                            </Form.Item>

                            <Form.Item className="mb-0">
                              <Button 
                                type="primary" 
                                htmlType="submit" 
                                icon={<UserAddOutlined />}
                                size="large"
                                block
                                disabled={globalFrozen}
                                className="rounded-xl font-bold bg-purple-600 hover:bg-purple-700 border-none shadow-md shadow-purple-500/20 h-11"
                              >
                                Thêm vào Panel
                              </Button>
                            </Form.Item>
                          </Form>
                        </Card>
                      </Col>

                      {/* Assignments Table */}
                      <Col xs={24} lg={16}>
                        <Card 
                          bordered={false}
                          title={<span className="font-extrabold text-sm text-slate-700 dark:text-zinc-200">Hội đồng Giám khảo Chung kết hiện tại</span>} 
                          size="small" 
                          className="rounded-2xl h-full"
                          style={{ border: 'none', boxShadow: '0 2px 12px rgba(15,61,138,0.08)' }}
                        >
                          <Table
                            columns={judgeColumns}
                            dataSource={assignedJudges}
                            rowKey="id"
                            pagination={false}
                            size="middle"
                            className="rounded-2xl overflow-hidden"
                          />
                        </Card>
                      </Col>
                    </Row>
                  </div>
                </>
              )}

              {/* Task 4: Khóa chấm & PENDING_CONFIRM */}
              {finalRoundActive && (
                <>
                  <Divider className="border-slate-100" />
                  <div className="space-y-4">
                    <div>
                      <Title level={4} className="dark:text-white flex items-center gap-2 font-bold">
                        <Badge count={4} style={{ backgroundColor: '#722ed1', fontWeight: 'bold' }} />
                        Khóa chấm điểm & Chuyển trạng thái bảo mật
                      </Title>
                      <Paragraph className="text-slate-500 dark:text-zinc-400">
                        Khi tất cả giám khảo hoàn thành việc chấm điểm, coordinator tiến hành khóa cổng nhập điểm và chuyển sang trạng thái chờ công bố.
                      </Paragraph>
                    </div>

                    <Row gutter={[24, 24]}>
                      {/* Action buttons */}
                      <Col xs={24} lg={8}>
                        <Card 
                          bordered={false}
                          title={<span className="font-extrabold text-sm text-slate-700 dark:text-zinc-200">Bảng điều khiển Trạng thái</span>} 
                          size="small" 
                          className="rounded-2xl"
                          style={{ border: 'none', boxShadow: '0 2px 12px rgba(15,61,138,0.08)' }}
                        >
                          <div className="space-y-5 p-3">
                            <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-xl">
                              <Text strong className="block mb-2 dark:text-white text-xs uppercase tracking-wider text-slate-400">Bước 1: Khóa cổng chấm điểm</Text>
                              <Button 
                                danger 
                                type="primary"
                                icon={<LockOutlined />}
                                onClick={handleLockScoring}
                                disabled={scoringLocked || globalFrozen}
                                block
                                className="h-10 rounded-xl font-bold"
                              >
                                {scoringLocked ? "Đã khóa chấm điểm" : "Khóa chấm điểm"}
                              </Button>
                            </div>

                            <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-xl">
                              <Text strong className="block mb-2 dark:text-white text-xs uppercase tracking-wider text-slate-400">Bước 2: Ẩn điểm & Chờ công bố</Text>
                              <Button 
                                type="primary"
                                icon={<CheckCircleOutlined />}
                                onClick={handleSetPendingConfirm}
                                disabled={roundStatus !== 'ACTIVE' || globalFrozen}
                                block
                                className="h-10 rounded-xl font-bold shadow-md shadow-blue-500/10"
                              >
                                Chuyển sang PENDING_CONFIRM
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </Col>

                      {/* Secret scoreboard preview */}
                      <Col xs={24} lg={16}>
                        <Card 
                          bordered={false}
                          title={
                            <div className="flex items-center justify-between py-1 w-full">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-500 dark:text-rose-400">
                                  <EyeInvisibleOutlined />
                                </div>
                                <span className="font-extrabold text-sm text-slate-700 dark:text-zinc-200">
                                  Bảng điểm bảo mật (Chỉ BTC thấy)
                                </span>
                              </div>
                              <Tag color="red" className="m-0 font-bold rounded-full uppercase">Private Mode</Tag>
                            </div>
                          } 
                          size="small" 
                          className="rounded-2xl"
                          style={{ border: 'none', boxShadow: '0 2px 12px rgba(15,61,138,0.08)' }}
                        >
                          <div className="p-2 space-y-3">
                            <Paragraph className="text-xs text-slate-400 !m-0 leading-relaxed">
                              Bảng điểm này được bảo mật và ẩn hoàn toàn khỏi giao diện của thí sinh/sinh viên. Chỉ hiển thị phục vụ Coordinator kiểm tra kết quả trước khi nhấn kết thúc.
                            </Paragraph>
                            <Table
                              dataSource={scoreboard}
                              rowKey="teamId"
                              pagination={false}
                              size="small"
                              className="rounded-xl overflow-hidden"
                              columns={[
                                { title: 'Hạng', key: 'rank', width: 70, render: (_, __, index) => <strong className="text-slate-500">#{index + 1}</strong> },
                                { title: 'Tên Đội', dataIndex: 'teamName', key: 'teamName', render: (t) => <Text strong className="dark:text-zinc-200">{t}</Text> },
                                { 
                                  title: 'Điểm Trung Bình', 
                                  dataIndex: 'weightedAvg', 
                                  key: 'weightedAvg', 
                                  render: (val) => (
                                    <Text className="text-gold font-black text-sm" style={{ color: '#d4b106' }}>
                                      {val.toFixed(2)}
                                    </Text>
                                  ) 
                                },
                                { 
                                  title: 'Trạng thái', 
                                  dataIndex: 'status', 
                                  key: 'status', 
                                  render: (s) => (
                                    <Tag color={s === 'ACTIVE' ? 'success' : 'error'} className="rounded-full px-3 font-semibold uppercase text-xxs">
                                      {s}
                                    </Tag>
                                  ) 
                                }
                              ]}
                            />
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                </>
              )}

              {/* Task 5: Xác nhận FINISHED + Công bố */}
              {scoringLocked && (
                <>
                  <Divider className="border-slate-100" />
                  <Card 
                    bordered={false} 
                    className="rounded-2xl" 
                    style={{ border: 'none', boxShadow: '0 2px 12px rgba(15,61,138,0.08)', background: '#fff' }}
                    bodyStyle={{ padding: '24px' }}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          backgroundColor: '#eff6ff', 
                          color: '#1d4ed8', 
                          fontWeight: 'bold', 
                          width: 24, 
                          height: 24, 
                          borderRadius: '50%', 
                          fontSize: 12,
                          flexShrink: 0
                        }}>5</span>
                        <div>
                          <span style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }} className="block">
                            Xác nhận FINISHED & Công bố giải thưởng
                          </span>
                          <span style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'block', lineHeight: 1.5 }}>
                            Chuyển trạng thái từ PENDING_CONFIRM sang FINISHED. Thao tác này là điểm cuối cùng (Terminal state), chốt điểm và công bố kết quả toàn phần.
                          </span>
                        </div>
                      </div>

                      <div className="p-5 rounded-xl" style={{ backgroundColor: '#f0f4ff', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="flex items-start gap-2.5">
                          <InfoCircleOutlined style={{ color: '#1d4ed8', fontSize: 15, marginTop: 2 }} />
                          <div>
                            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }} className="block">
                              Xác nhận Trạng Thái Vĩnh Viễn (FINISHED)
                            </span>
                            <span style={{ color: '#475569', fontSize: 12, lineHeight: 1.6, marginTop: 4, display: 'block' }}>
                              Khi xác nhận, hệ thống sẽ chốt toàn bộ bảng điểm, gửi trigger <span style={{ color: '#ef4444', fontWeight: 750 }}>RESULT_PUBLISHED</span> đến toàn bộ thí sinh và chuyển giao diện sang chế độ <strong>*Frozen*</strong>. Bạn không thể thay đổi thông tin sau thao tác này.
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                          <Button 
                            type="primary"
                            icon={<LockOutlined />}
                            onClick={handleConfirmFinished}
                            disabled={roundStatus === 'FINISHED'}
                            style={{
                              height: 38,
                              borderRadius: 8,
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              border: 'none',
                              backgroundColor: roundStatus === 'FINISHED' ? '#cbd5e1' : '#0f3d8a',
                              color: roundStatus === 'FINISHED' ? '#94a3b8' : '#fff',
                              boxShadow: roundStatus === 'FINISHED' ? 'none' : '0 4px 12px rgba(15,61,138,0.2)',
                              padding: '0 20px'
                            }}
                          >
                            Xác nhận FINISHED & Công bố Kết quả
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </>
              )}

              {/* Task 6: Freeze UI & Post-Event Features */}
              {roundStatus === 'FINISHED' && (
                <>
                  <Divider className="border-slate-100" />
                  <Card 
                    bordered={false} 
                    className="rounded-2xl" 
                    style={{ border: 'none', boxShadow: '0 2px 12px rgba(15,61,138,0.08)', background: '#fff' }}
                    bodyStyle={{ padding: '24px' }}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          backgroundColor: '#eff6ff', 
                          color: '#1d4ed8', 
                          fontWeight: 'bold', 
                          width: 24, 
                          height: 24, 
                          borderRadius: '50%', 
                          fontSize: 12,
                          flexShrink: 0
                        }}>6</span>
                        <div>
                          <span style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }} className="block">
                            Freeze UI & Tính năng sau sự kiện (Prize Claims & Export)
                          </span>
                          <span style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'block', lineHeight: 1.5 }}>
                            Sau trạng thái FINISHED, toàn bộ giao diện thi đấu bị khóa cứng. Tuy nhiên, tính năng điền thông tin nhận giải (prize_claims) và xuất dữ liệu (export_jobs) vẫn mở.
                          </span>
                        </div>
                      </div>

                      {globalFrozen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                          <div>
                            <span style={{
                              border: '1px solid #fee2e2',
                              background: '#fef2f2',
                              color: '#ef4444',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              fontSize: '11px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6
                            }}>
                              <StopOutlined /> HỆ THỐNG ĐÃ KHÓA CỨNG (FROZEN UI)
                            </span>
                          </div>
                          <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
                            Toàn bộ cấu hình vòng thi, danh sách đội, tiêu chí và phân công ban giám khảo đã chuyển sang chế độ Chỉ đọc (Read-only) nhằm lưu trữ vĩnh viễn dữ liệu cuộc thi.
                          </span>
                        </div>
                      )}

                      <Row gutter={[24, 24]}>
                        {/* Prize Claims Management */}
                        <Col xs={24} lg={12}>
                          <Card 
                            bordered={false}
                            title={
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="font-extrabold text-sm text-slate-700 dark:text-zinc-200">Giao diện Khai báo Nhận thưởng (prize_claims)</span>
                                <span style={{
                                  fontSize: '10px',
                                  backgroundColor: '#dbeafe',
                                  color: '#1e40af',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontWeight: 800,
                                  textTransform: 'none'
                                }}>Active Module</span>
                              </div>
                            } 
                            size="small" 
                            className="rounded-2xl h-full"
                            style={{ border: 'none', boxShadow: '0 2px 12px rgba(15,61,138,0.08)', background: '#fff' }}
                          >
                            <div className="p-2 space-y-4">
                              <Table
                                dataSource={prizeClaims}
                                rowKey="id"
                                pagination={false}
                                size="small"
                                className="rounded-xl overflow-hidden"
                                columns={[
                                  { 
                                    title: 'ĐỘI THI', 
                                    dataIndex: 'teamName', 
                                    key: 'teamName', 
                                    render: (t) => <Text strong className="dark:text-zinc-200">{t}</Text> 
                                  },
                                  { 
                                    title: 'GIẢI THƯỞNG', 
                                    dataIndex: 'prize', 
                                    key: 'prize', 
                                    render: (p) => {
                                      let color = 'gold';
                                      if (p.includes('Nhất')) color = 'orange';
                                      else if (p.includes('Nhì')) color = 'purple';
                                      else if (p.includes('Ba')) color = 'blue';
                                      return <Tag color={color} className="font-semibold">{p}</Tag>;
                                    } 
                                  },
                                  { 
                                    title: 'TÀI KHOẢN', 
                                    render: (_, r) => (
                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <Text style={{ fontSize: 11, fontWeight: 600 }}>{r.accountName}</Text>
                                        <Text style={{ fontSize: 10, color: '#64748b' }}>({r.bankName} - {r.accountNumber})</Text>
                                      </div>
                                    ) 
                                  },
                                  { 
                                    title: 'DUYỆT', 
                                    dataIndex: 'status', 
                                    key: 'status',
                                    render: (s, r) => s === 'APPROVED' ? (
                                      <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        backgroundColor: '#eff6ff',
                                        padding: '4px 8px',
                                        borderRadius: 4,
                                        color: '#1d4ed8',
                                        fontWeight: 700,
                                        fontSize: 10
                                      }}>
                                        <CheckCircleFilled style={{ fontSize: 12 }} />
                                        <span>ĐÃ DUYỆT</span>
                                      </div>
                                    ) : (
                                      <Button 
                                        size="small" 
                                        type="primary" 
                                        onClick={() => handleApprovePrizeClaim(r.id)}
                                        style={{ backgroundColor: '#0f3d8a', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600 }}
                                      >
                                        Duyệt
                                      </Button>
                                    )
                                  }
                                ]}
                              />

                              <Divider className="my-2 border-slate-100" />
                              
                              <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-2xl">
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', marginBottom: 12 }}>
                                  <DatabaseOutlined /> Giả lập gửi thông tin nhận thưởng từ Thí sinh
                                </span>
                                <Form form={prizeForm} layout="vertical" onFinish={handleAddPrizeClaim} size="small">
                                  <div className="grid grid-cols-2 gap-3">
                                    <Form.Item name="teamName" label={<span style={{ fontSize: 11, fontWeight: 650 }}>Tên Đội</span>} rules={[{ required: true }]} className="mb-2">
                                      <Select placeholder="Chọn đội..." className="rounded-md">
                                        {teams.filter(t => t.status === 'ACTIVE').map(t => (
                                          <Option key={t.id} value={t.name}>{t.name}</Option>
                                        ))}
                                      </Select>
                                    </Form.Item>
                                    <Form.Item name="prize" label={<span style={{ fontSize: 11, fontWeight: 650 }}>Giải thưởng</span>} rules={[{ required: true }]} className="mb-2">
                                      <Select placeholder="Giải..." className="rounded-md">
                                        <Option value="Giải Nhất (Champion)">Giải Nhất (Champion)</Option>
                                        <Option value="Giải Nhì">Giải Nhì</Option>
                                        <Option value="Giải Ba">Giải Ba</Option>
                                        <Option value="Giải Khuyến Khích">Giải Khuyến Khích</Option>
                                      </Select>
                                    </Form.Item>
                                  </div>
                                  <div className="grid grid-cols-3 gap-3">
                                    <Form.Item name="accountName" label={<span style={{ fontSize: 11, fontWeight: 650 }}>Chủ TK</span>} rules={[{ required: true }]} className="mb-2">
                                      <Input placeholder="NGUYEN VAN A..." className="rounded-md" />
                                    </Form.Item>
                                    <Form.Item name="bankName" label={<span style={{ fontSize: 11, fontWeight: 650 }}>Ngân hàng</span>} rules={[{ required: true }]} className="mb-2">
                                      <Input placeholder="Vietcombank..." className="rounded-md" />
                                    </Form.Item>
                                    <Form.Item name="accountNumber" label={<span style={{ fontSize: 11, fontWeight: 650 }}>Số TK</span>} rules={[{ required: true }]} className="mb-2">
                                      <Input placeholder="Số tài khoản..." className="rounded-md" />
                                    </Form.Item>
                                  </div>
                                  <Button 
                                    type="dashed" 
                                    htmlType="submit" 
                                    block 
                                    icon={<SendOutlined style={{ marginRight: 4 }} />} 
                                    style={{
                                      border: '1px dashed #cbd5e1',
                                      background: '#f8fafc',
                                      color: '#475569',
                                      fontWeight: 600,
                                      borderRadius: 8,
                                      height: 38,
                                      marginTop: 8
                                    }}
                                  >
                                    Simulate Team Claim Submission
                                  </Button>
                                </Form>
                              </div>
                            </div>
                          </Card>
                        </Col>

                        {/* Export Jobs Async UI */}
                        <Col xs={24} lg={12}>
                          <Card 
                            bordered={false}
                            title={<span className="font-extrabold text-sm text-slate-700 dark:text-zinc-200">Giao diện Export Jobs (Async Worker nền)</span>} 
                            size="small" 
                            className="rounded-2xl h-full"
                            style={{ border: 'none', boxShadow: '0 2px 12px rgba(15,61,138,0.08)', background: '#fff' }}
                          >
                            <div className="p-2 space-y-4">
                              <Paragraph className="text-xs text-slate-500 leading-relaxed !m-0">
                                Hệ thống chạy worker bất đồng bộ trên nền để đóng gói, kết xuất và ký số tải xuống các báo cáo điểm số CSV/Excel mà không gây treo/nghẽn giao diện.
                              </Paragraph>

                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <Button 
                                  type="primary" 
                                  onClick={() => handleCreateExportJob('Diem_Chi_Tiet_Chung_Ket', 'EXCEL')}
                                  style={{
                                    backgroundColor: '#0f3d8a',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    height: 48,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '0 16px',
                                    textAlign: 'left'
                                  }}
                                >
                                  <FileExcelOutlined style={{ fontSize: 18 }} />
                                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700 }}>Xuất Excel</span>
                                    <span style={{ fontSize: 11, fontWeight: 700 }}>Điểm Số</span>
                                  </div>
                                </Button>
                                <Button 
                                  onClick={() => handleCreateExportJob('Bao_Cao_Xep_Hang_Chung_Ket', 'CSV')}
                                  style={{
                                    backgroundColor: '#fff',
                                    color: '#475569',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 8,
                                    height: 48,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '0 16px',
                                    textAlign: 'left'
                                  }}
                                >
                                  <CloudDownloadOutlined style={{ fontSize: 18, color: '#475569' }} />
                                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700 }}>Xuất CSV</span>
                                    <span style={{ fontSize: 11, fontWeight: 700 }}>Xếp Hạng</span>
                                  </div>
                                </Button>
                              </div>

                              <Divider className="my-2 border-slate-100" />

                              <List
                                dataSource={exportJobs}
                                renderItem={item => (
                                  <div style={{
                                    backgroundColor: '#f0f4ff',
                                    padding: '12px 16px',
                                    borderRadius: 8,
                                    marginBottom: 10,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {item.name.toLowerCase().includes('excel') || item.name.toLowerCase().includes('diem') ? (
                                          <TableOutlined style={{ color: '#475569', fontSize: 16 }} />
                                        ) : (
                                          <FileExcelOutlined style={{ color: '#475569', fontSize: 16 }} />
                                        )}
                                        <span style={{ fontWeight: 700, fontSize: 12, color: '#334155' }}>{item.name}</span>
                                      </div>
                                      <span style={{
                                        backgroundColor: '#dbeafe',
                                        color: '#1e40af',
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        fontSize: 10,
                                        fontWeight: 700
                                      }}>
                                        {item.status}
                                      </span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1d4ed8', fontSize: 11, fontWeight: 600 }}>
                                        <CheckCircleFilled style={{ fontSize: 12 }} />
                                        <span>Completed</span>
                                      </div>
                                      {item.status === 'DONE' ? (
                                        <a 
                                          href={item.downloadUrl} 
                                          onClick={(e) => { e.preventDefault(); toast.success('Đã tải xuống file!'); }}
                                          style={{
                                            color: '#1d4ed8',
                                            fontWeight: 800,
                                            fontSize: 11,
                                            textDecoration: 'none'
                                          }}
                                        >
                                          TẢI XUỐNG
                                        </a>
                                      ) : (
                                        <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Đang nén...</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              />

                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 16 }}>
                                <Button 
                                  shape="circle" 
                                  icon={<SyncOutlined />} 
                                  onClick={() => toast.success('Đã cập nhật trạng thái worker!')}
                                  style={{
                                    backgroundColor: '#eff6ff',
                                    color: '#1d4ed8',
                                    border: 'none',
                                    boxShadow: '0 2px 8px rgba(29,78,216,0.1)'
                                  }}
                                />
                                <span style={{ fontSize: 11, color: '#64748b' }}>Worker background đang hoạt động ổn định</span>
                              </div>
                            </div>
                          </Card>
                        </Col>
                      </Row>
                    </div>
                  </Card>
                </>
              )}
            </div>
</Tabs.TabPane>

          {/* TAB 4: AUDIT LOGS */}
          <Tabs.TabPane tab={<span><HistoryOutlined className="mr-1" /> Nhật ký Audit Logs</span>} key="logs">
            <div className="space-y-4 pt-4">
              <div>
                <Title level={4} className="dark:text-white font-bold">
                  Nhật ký hoạt động của Ban Tổ Chức
                </Title>
                <Paragraph className="text-slate-500 dark:text-zinc-400">
                  Lưu lại toàn bộ lịch sử thao tác thay đổi cấu hình, kích hoạt vòng thi, phân công giám khảo, khóa điểm và kết thúc sự kiện để phục vụ đối soát.
                </Paragraph>
              </div>
              
              <div className="bg-slate-950 dark:bg-black p-6 rounded-2xl border border-slate-800 shadow-inner max-h-96 overflow-y-auto font-mono">
                <Timeline
                  items={auditLogs.map(log => ({
                    color: log.type === 'SUCCESS' ? 'green' : log.type === 'WARNING' ? 'gold' : log.type === 'ERROR' ? 'red' : 'blue',
                    children: (
                      <div className="text-sm py-0.5">
                        <span className="text-slate-500 mr-2 font-bold">[{log.time}]</span>
                        <span className={`
                          ${log.type === 'SUCCESS' ? 'text-emerald-400' : ''}
                          ${log.type === 'WARNING' ? 'text-amber-400' : ''}
                          ${log.type === 'ERROR' ? 'text-rose-400 font-bold' : ''}
                          ${log.type === 'INFO' ? 'text-sky-400' : ''}
                        `}>
                          {log.message}
                        </span>
                      </div>
                    )
                  }))}
                />
              </div>
            </div>
          </Tabs.TabPane>

        </Tabs>
      </div>
    </div>
  );
};

export default FinalRoundConfigPage;
