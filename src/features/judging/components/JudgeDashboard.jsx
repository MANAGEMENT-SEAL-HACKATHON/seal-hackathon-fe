import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Button, 
  Space, 
  Tag, 
  Progress, 
  Skeleton, 
  message, 
  Input, 
  Segmented, 
  Select,
  Pagination 
} from 'antd';
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  ArrowRightOutlined, 
  FundProjectionScreenOutlined, 
  BarChartOutlined, 
  TrophyOutlined, 
  CalendarOutlined,
  SearchOutlined, 
  AppstoreOutlined, 
  CheckSquareOutlined, 
  FireOutlined,
  BlockOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { 
  useNavigate 
} from 'react-router-dom';
import { 
  motion 
} from 'framer-motion';
import { 
  judgeService 
} from '../services/judgeService';
import ScoringCountdownCard from '../components/ScoringCountdownCard';
import CalibrationSessionsPanel from '../components/CalibrationSessionsPanel';
import LiveRecordIndicator from '../../../shared/components/ui/LiveRecordIndicator';

const { 
  Title, 
  Text, 
  Paragraph 
} = Typography;

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.4 
    } 
  }
};

const JudgeDashboard = ({ user }) => {
  // ==========================================
  // 1. KHỞI TẠO HOOKS VÀ ROUTER
  // ==========================================
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [data, setData] = useState({ 
    stats: {}, 
    assignments: [], 
    upcomingEvents: [], 
    prelimExternalFiltered: 0 
  });
  
  // State bộ lọc
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [hackathonFilter, setHackathonFilter] = useState('ALL');

  // State phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, filterStatus, hackathonFilter]);

  // ==========================================
  // 2. FETCH DỮ LIỆU TỪ BACKEND VÀ XỬ LÝ LỊCH TRÌNH
  // ==========================================
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [tracksRes, finalsRes, scheduleRes] = await Promise.all([
          judgeService.getTrackAssignments().catch(() => []),
          judgeService.getFinalAssignments().catch(() => []),
          judgeService.getScoringSchedule().catch(() => [])
        ]);

        const rawTracks = Array.isArray(tracksRes) ? tracksRes : tracksRes?.data || [];
        const rawFinals = Array.isArray(finalsRes) ? finalsRes : finalsRes?.data || [];
        const rawSchedule = Array.isArray(scheduleRes) ? scheduleRes : scheduleRes?.data || [];

        const prelimExternalFiltered = rawTracks.filter((item) => {
          const assignmentType = String(item.assignmentType || item.role || '').toUpperCase();
          return assignmentType.includes('EXTERNAL');
        }).length;

        // XỬ LÝ THÔNG TIN TIẾN ĐỘ NHIỆM VỤ
        const processAssignment = (item, isFinalFlag) => {
          const hName = item.hackathonName || item.hackathon_name || 'Hackathon Chưa Rõ Tên';
          const hStatus = item.hackathonStatus || item.hackathon_status || (hName.toLowerCase().includes('completed') ? 'COMPLETED' : 'ACTIVE');
          const rStatus = item.roundStatus || item.round_status || item.status || 'ACTIVE';
          const cStatus = item.completionStatus || item.completion_status || 'NOT_STARTED';

          const total = item.totalTeams ?? item.total_teams ?? 0;
          const scored = item.scoredTeams ?? item.scored_teams ?? 0;

          let calcProgress = item.progress || 0;
          if (total > 0) {
            calcProgress = Math.round((scored / total) * 100);
          } else {
            if (cStatus === 'COMPLETED') calcProgress = 100;
            else if (cStatus === 'IN_PROGRESS') calcProgress = 50;
          }

          return {
            id: item.id || item.assignmentId || Math.random(),
            hackathonId: item.hackathonId || item.hackathon_id || 'unknown',
            hackathonName: hName,
            hackathonStatus: hStatus,
            role: item.role || item.assignmentType || 'Giám khảo',
            assignmentType: item.assignmentType || item.role,
            trackName: isFinalFlag ? 'Tất cả các bảng' : (item.trackName || item.track_name || 'Bảng Sơ loại'),
            roundName: item.roundName || item.round_name || (isFinalFlag ? 'Vòng Chung Kết' : 'Vòng Sơ Loại'),
            roundStatus: rStatus,
            completionStatus: cStatus,
            progress: calcProgress,
            totalTeams: total,
            scoredTeams: scored,
            roundId: item.roundId || item.round_id,
            trackId: isFinalFlag ? null : (item.trackId || item.track_id),
            isFinal: isFinalFlag
          };
        };

        const mappedTracks = rawTracks
          .filter((item) => !String(item.assignmentType || item.role || '').toUpperCase().includes('EXTERNAL'))
          .map(item => processAssignment(item, false));

        const mappedFinals = rawFinals.map(item => processAssignment(item, true));
        const allAssignments = [...mappedTracks, ...mappedFinals];

        // ----------------------------------------------------------------
        // [ĐÃ SỬA] THUẬT TOÁN BẮT LỊCH TRÌNH CHUẨN TỪ SWAGGER API
        // ----------------------------------------------------------------
        const formatDateTime = (dateObj) => {
          const hours = String(dateObj.getHours()).padStart(2, '0');
          const minutes = String(dateObj.getMinutes()).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          return `${hours}:${minutes} - ${day}/${month}/${year}`;
        };

        // Quét trực tiếp vào API Lịch trình (dựa trên schema bạn gửi)
        const validEvents = rawSchedule.map((ev, index) => {
          // Lấy đích danh field scoringStartAt
          const timeRaw = ev.scoringStartAt; 
          
          // Tạo object Date, JS tự hiểu định dạng ISO "2026-07-14T01:22:16.766Z"
          const d = new Date(timeRaw);
          const isValid = !isNaN(d.getTime());
          
          return {
            id: `sched-${ev.roundId || index}`,
            title: ev.roundName || 'Vòng chấm thi',
            time: isValid ? formatDateTime(d) : 'Chưa cập nhật',
            timestamp: isValid ? d.getTime() : Infinity,
            type: 'SCORING'
          };
        }).filter(ev => ev.timestamp !== Infinity);

        // Sắp xếp thời gian tăng dần
        validEvents.sort((a, b) => a.timestamp - b.timestamp);

        // Lọc lấy các sự kiện trong tương lai (bao gồm cả sự kiện diễn ra hôm nay)
        const now = Date.now();
        const upcoming = validEvents.filter(ev => ev.timestamp >= now - 86400000); 

        // Nếu có sự kiện tương lai thì lấy 5 sự kiện gần nhất, nếu không thì lấy 5 sự kiện trong quá khứ gần nhất
        let finalUpcomingEvents = upcoming.length > 0 
          ? upcoming.slice(0, 5) 
          : validEvents.slice(-5).reverse();

        if (finalUpcomingEvents.length === 0) {
          finalUpcomingEvents = [{ 
            id: 1, 
            title: 'Chưa có lịch trình được lên', 
            time: '--', 
            type: 'CALIBRATION' 
          }];
        }

        // Cập nhật State
        setData({
          stats: { 
            totalEvaluated: allAssignments.reduce((sum, item) => sum + (item.scoredTeams || 0), 0), 
            pendingEvaluations: allAssignments.reduce((sum, item) => sum + ((item.totalTeams || 0) - (item.scoredTeams || 0)), 0), 
            calibrationScore: 100 
          },
          assignments: allAssignments,
          prelimExternalFiltered,
          upcomingEvents: finalUpcomingEvents // Lịch trình đã được nạp
        });

      } catch (error) {
        message.error("Không thể tải danh sách nhiệm vụ từ máy chủ.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div 
        style={{ 
          padding: '40px' 
        }}
      >
        <Skeleton 
          active 
          paragraph={{ 
            rows: 6 
          }} 
        />
      </div>
    );
  }

  // ==========================================
  // 3. LỌC DỮ LIỆU TÌM KIẾM VÀ TRẠNG THÁI
  // ==========================================
  const filteredAssignments = (data.assignments || []).filter(item => {
    const isEventClosed = ['COMPLETED', 'FINISHED', 'CLOSED', 'INACTIVE'].includes(item.hackathonStatus);
    const isRoundClosed = ['COMPLETED', 'FINISHED', 'CLOSED', 'INACTIVE'].includes(item.roundStatus);
    const isScoringFinished = item.progress === 100 
      || (item.scoredTeams === item.totalTeams && item.totalTeams > 0) 
      || item.completionStatus === 'COMPLETED';
    
    const isCompletedOrClosed = isEventClosed || isRoundClosed || isScoringFinished;
    
    const matchStatus = filterStatus === 'ALL' 
      ? true 
      : filterStatus === 'ONGOING' 
        ? (!isCompletedOrClosed) 
        : isCompletedOrClosed;

    const matchSearch = (item.hackathonName || '').toLowerCase().includes(searchText.toLowerCase());
                        
    const matchHackathon = hackathonFilter === 'ALL' 
      ? true 
      : item.hackathonName === hackathonFilter;

    return matchStatus && matchSearch && matchHackathon;
  });

  // ==========================================
  // 4. GOM NHÓM THEO SỰ KIỆN HACKATHON
  // ==========================================
  const groupedAssignments = filteredAssignments.reduce((acc, curr) => {
    const key = curr.hackathonName;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(curr);
    return acc;
  }, {});

  const uniqueHackathons = [...new Set(data.assignments?.map(a => a.hackathonName).filter(Boolean))];

  // ==========================================
  // 5. XỬ LÝ SẮP XẾP VÀ PHÂN TRANG (PAGINATION)
  // ==========================================
  const processedEventList = Object.entries(groupedAssignments).map(([hackathonName, tasks]) => {
    const totalTeamsEvent = tasks.reduce((sum, t) => sum + (t.totalTeams || 0), 0);
    const scoredTeamsEvent = tasks.reduce((sum, t) => sum + (t.scoredTeams || 0), 0);
    
    const isEventLocked = tasks.every((t) => {
      return ['COMPLETED', 'FINISHED', 'CLOSED', 'INACTIVE'].includes(t.hackathonStatus) || 
             ['COMPLETED', 'FINISHED', 'CLOSED', 'INACTIVE'].includes(t.roundStatus);
    });
    
    const isAllScored = (totalTeamsEvent > 0 && scoredTeamsEvent === totalTeamsEvent) || 
                        tasks.every(t => t.progress === 100 || t.completionStatus === 'COMPLETED');
                        
    const isEventClosed = isEventLocked || isAllScored;

    let eventProgressPercent = 0;
    if (totalTeamsEvent > 0) {
        eventProgressPercent = Math.round((scoredTeamsEvent / totalTeamsEvent) * 100);
    } else {
        if (isAllScored) {
            eventProgressPercent = 100;
        } else if (tasks.some(t => t.progress > 0 || t.completionStatus === 'IN_PROGRESS')) {
            eventProgressPercent = 50;
        }
    }

    return {
      hackathonName,
      tasks,
      totalTeamsEvent,
      scoredTeamsEvent,
      isEventLocked,
      isAllScored,
      isEventClosed,
      eventProgressPercent
    };
  });

  // Sắp xếp - Đưa các sự kiện đang ACTIVE lên đầu, sự kiện ĐÃ ĐÓNG xuống cuối
  processedEventList.sort((a, b) => {
    if (a.isEventClosed === b.isEventClosed) {
      return a.hackathonName.localeCompare(b.hackathonName);
    }
    return a.isEventClosed ? 1 : -1; 
  });

  // Cắt mảng theo Trang (Pagination)
  const totalItems = processedEventList.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedEvents = processedEventList.slice(startIndex, startIndex + pageSize);

  // ==========================================
  // 6. TẠO CÂU CHÀO MỪNG VÀ COUNTDOWN CARD
  // ==========================================
  const topActiveEvent = processedEventList.find(e => !e.isEventClosed) || processedEventList[0];
  const activeAssignmentForCountdown = topActiveEvent?.tasks?.[0] || data.assignments?.[0];
  const finalAssignment = data.assignments?.find((item) => item.isFinal);

  const activeAssignmentsForWelcome = (data.assignments || []).filter(item => {
    const isEventClosed = ['COMPLETED', 'FINISHED', 'CLOSED', 'INACTIVE'].includes(item.hackathonStatus);
    const isRoundClosed = ['COMPLETED', 'FINISHED', 'CLOSED', 'INACTIVE'].includes(item.roundStatus);
    return !isEventClosed && !isRoundClosed;
  });
  
  const activeHackathonsCount = new Set(activeAssignmentsForWelcome.map(a => a.hackathonName)).size;

  let dynamicWelcomeMessage = "Cảm ơn bạn đã tham gia đánh giá. Sự công tâm của bạn là chìa khóa tìm ra những dự án xuất sắc nhất cho cuộc thi.";
  
  if (activeHackathonsCount === 1) {
    const task = activeAssignmentsForWelcome[0];
    const roleName = task.role?.includes('HEAD') ? 'Giám Khảo Trưởng' : 'Giám Khảo';
    dynamicWelcomeMessage = `Hiện tại, bạn đang được phân công làm ${roleName} ${task.roundName} cho bảng đấu "${task.trackName}" thuộc sự kiện ${task.hackathonName}. Vui lòng chọn phòng chấm thi bên dưới để bắt đầu.`;
  } else if (activeHackathonsCount > 1) {
    dynamicWelcomeMessage = `Hiện tại, bạn đang có ${activeHackathonsCount} sự kiện đang diễn ra cần xử lý đánh giá. Vui lòng chọn một sự kiện trong danh sách bên dưới để tiếp tục công việc.`;
  } else if (data.assignments?.length > 0) {
    dynamicWelcomeMessage = `Bạn không có nhiệm vụ đánh giá nào đang mở vào lúc này. Các sự kiện được phân công trước đó đều đã hoàn thành hoặc kết thúc.`;
  }

  // ==========================================
  // 7. RENDER GIAO DIỆN
  // ==========================================
  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={{ 
        visible: { 
          transition: { 
            staggerChildren: 0.1 
          } 
        } 
      }} 
      style={{ 
        maxWidth: 1400, 
        margin: '0 auto', 
        fontFamily: "'Inter', sans-serif" 
      }}
    >
      
      {/* KHU VỰC HERO BANNER */}
      <motion.div variants={itemVariants}>
        <div 
          style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #0ea5e9 100%)',
            borderRadius: '24px', 
            padding: '40px', 
            color: '#ffffff', 
            marginBottom: '32px',
            boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)', 
            position: 'relative', 
            overflow: 'hidden'
          }}
        >
          <div 
            style={{ 
              position: 'relative', 
              zIndex: 2 
            }}
          >
            <Space 
              align="center" 
              style={{ 
                marginBottom: 12 
              }}
            >
              <Tag 
                color="cyan" 
                style={{ 
                  borderRadius: 6, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4, 
                  padding: '4px 12px', 
                  border: 'none', 
                  background: 'rgba(255,255,255,0.2)', 
                  color: '#fff', 
                  fontSize: 13, 
                  fontWeight: 600 
                }}
              >
                <TrophyOutlined /> Cổng Giám Khảo SEAL
              </Tag>
            </Space>
            <Title 
              level={1} 
              style={{ 
                margin: 0, 
                color: '#ffffff', 
                fontSize: '32px', 
                fontWeight: 800 
              }}
            >
              Xin chào {user?.fullName ? `Giám khảo ${user.fullName}` : 'Giám khảo'}!
            </Title>
            <Paragraph 
              style={{ 
                fontSize: '16px', 
                color: 'rgba(255, 255, 255, 0.9)', 
                marginTop: 8, 
                maxWidth: '800px', 
                lineHeight: 1.6 
              }}
            >
              {dynamicWelcomeMessage}
            </Paragraph>
          </div>
        </div>
      </motion.div>

      {/* KHU VỰC THẺ THỐNG KÊ */}
      <motion.div variants={itemVariants}>
        {data.prelimExternalFiltered > 0 && (
          <Card 
            style={{ 
              borderRadius: 16, 
              marginBottom: 16, 
              border: '1px solid #ffe58f', 
              background: '#fffbe6' 
            }}
          >
            <Text>
              Đã ẩn {data.prelimExternalFiltered} phân công giám khảo external khỏi vòng sơ loại theo rule GĐ3.
            </Text>
          </Card>
        )}
        <Row 
          gutter={[24, 24]} 
          style={{ 
            marginBottom: 32 
          }}
        >
          <Col 
            xs={24} 
            sm={8}
          >
            <Card 
              style={{ 
                borderRadius: 16 
              }}
            >
              <Statistic 
                title={
                  <span 
                    style={{ 
                      fontWeight: 600, 
                      color: '#64748b' 
                    }}
                  >
                    Đã Chấm
                  </span>
                } 
                value={data.stats?.totalEvaluated || 0} 
                prefix={
                  <CheckCircleOutlined 
                    style={{
                      color: '#10b981'
                    }}
                  />
                } 
              />
            </Card>
          </Col>
          <Col 
            xs={24} 
            sm={8}
          >
            <Card 
              style={{ 
                borderRadius: 16 
              }}
            >
              <Statistic 
                title={
                  <span 
                    style={{ 
                      fontWeight: 600, 
                      color: '#64748b' 
                    }}
                  >
                    Chờ Chấm
                  </span>
                } 
                value={data.stats?.pendingEvaluations || 0} 
                prefix={
                  <ClockCircleOutlined 
                    style={{
                      color: '#f59e0b'
                    }}
                  />
                } 
              />
            </Card>
          </Col>
          <Col 
            xs={24} 
            sm={8}
          >
            <Card 
              style={{ 
                borderRadius: 16 
              }}
            >
              <Statistic 
                title={
                  <span 
                    style={{ 
                      fontWeight: 600, 
                      color: '#64748b' 
                    }}
                  >
                    Độ Lệch Chuẩn (RBL)
                  </span>
                } 
                value={data.stats?.calibrationScore || 0} 
                suffix="/100" 
                prefix={
                  <BarChartOutlined 
                    style={{
                      color: '#3b82f6'
                    }}
                  />
                } 
              />
            </Card>
          </Col>
        </Row>
      </motion.div>

      {/* BỐ CỤC CHIA 2 CỘT */}
      <Row gutter={[24, 24]}>
        
        {/* CỘT TRÁI: DANH SÁCH SỰ KIỆN */}
        <Col 
          xs={24} 
          lg={16}
        >
          <motion.div variants={itemVariants}>
            <Card 
              title={
                <strong 
                  style={{ 
                    fontSize: '18px', 
                    display: 'flex', 
                    alignItems: 'center' 
                  }}
                >
                  <FundProjectionScreenOutlined 
                    style={{ 
                      color: '#3b82f6', 
                      marginRight: 8 
                    }}
                  />
                  Sự kiện được phân công ({totalItems})
                </strong>
              } 
              style={{ 
                borderRadius: 16 
              }}
              styles={{ 
                header: { 
                  padding: '16px 24px', 
                  borderBottom: '1px solid #f0f0f0' 
                }, 
                body: { 
                  padding: '24px', 
                  background: '#f8fafc' 
                } 
              }}
              extra={
                <Space wrap>
                  <Select 
                    value={hackathonFilter} 
                    onChange={setHackathonFilter} 
                    style={{ 
                      width: 180 
                    }} 
                    options={[
                      { value: 'ALL', label: 'Tất cả sự kiện' }, 
                      ...uniqueHackathons.map(name => ({ value: name, label: name }))
                    ]} 
                  />
                  <Input 
                    placeholder="Tìm kiếm sự kiện..." 
                    prefix={
                      <SearchOutlined 
                        style={{ 
                          color: '#bfbfbf' 
                        }}
                      />
                    } 
                    onChange={(e) => setSearchText(e.target.value)} 
                    style={{ 
                      width: 180, 
                      borderRadius: 8 
                    }}
                  />
                </Space>
              }
            >
              {totalItems === 0 ? (
                <div 
                  style={{ 
                    textAlign: 'center', 
                    padding: '60px 0', 
                    color: '#94a3b8' 
                  }}
                >
                  Không tìm thấy sự kiện nào phù hợp với bộ lọc.
                </div>
              ) : (
                <div 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '20px' 
                  }}
                >
                  {paginatedEvents.map(({ 
                    hackathonName, 
                    tasks, 
                    totalTeamsEvent, 
                    scoredTeamsEvent, 
                    isEventLocked, 
                    isAllScored, 
                    isEventClosed, 
                    eventProgressPercent 
                  }) => {
                    
                    return (
                      <Card
                        key={hackathonName}
                        hoverable
                        style={{ 
                          borderRadius: 16, 
                          border: isEventClosed ? '1px solid #e2e8f0' : '1px solid #bae0ff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          cursor: 'pointer',
                          opacity: isEventClosed ? 0.85 : 1
                        }}
                        styles={{ 
                          body: { 
                            padding: '24px' 
                          } 
                        }}
                        onClick={() => navigate('/judge/assignments', { state: { activeEvent: hackathonName } })}
                      >
                        <Row 
                          align="middle" 
                          justify="space-between" 
                          gutter={[16, 16]}
                        >
                          <Col 
                            xs={24} 
                            md={14}
                          >
                            <div 
                              style={{ 
                                display: 'flex', 
                                gap: '16px', 
                                alignItems: 'center' 
                              }}
                            >
                              <div 
                                style={{ 
                                  width: 56, 
                                  height: 56, 
                                  borderRadius: 16, 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  background: isEventClosed ? '#f1f5f9' : '#e6f4ff', 
                                  color: isEventClosed ? '#64748b' : '#1677ff' 
                                }}
                              >
                                <BlockOutlined 
                                  style={{ 
                                    fontSize: 28 
                                  }} 
                                />
                              </div>
                              <div>
                                <div 
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px' 
                                  }}
                                >
                                  <Title 
                                    level={4} 
                                    style={{ 
                                      margin: 0, 
                                      color: isEventClosed ? '#64748b' : '#1e293b' 
                                    }}
                                  >
                                    {hackathonName}
                                  </Title>
                                  {isEventLocked && (
                                    <Tag 
                                      color="default" 
                                      style={{ 
                                        margin: 0 
                                      }}
                                    >
                                      ĐÃ ĐÓNG
                                    </Tag>
                                  )}
                                  {!isEventLocked && isAllScored && (
                                    <Tag 
                                      color="success" 
                                      style={{ 
                                        margin: 0 
                                      }}
                                    >
                                      HOÀN THÀNH
                                    </Tag>
                                  )}
                                </div>
                                <Text 
                                  type="secondary" 
                                  style={{ 
                                    display: 'block', 
                                    marginTop: 4 
                                  }}
                                >
                                  Bạn có <strong style={{ color: isEventClosed ? '#64748b' : '#1677ff' }}>{tasks.length}</strong> bảng/vòng được phân công tại đây.
                                </Text>
                              </div>
                            </div>
                          </Col>
                          
                          <Col 
                            xs={24} 
                            md={10} 
                            style={{ 
                              textAlign: 'right' 
                            }}
                          >
                            <div 
                              style={{ 
                                marginBottom: 12 
                              }}
                            >
                              <Text 
                                style={{ 
                                  fontSize: 13, 
                                  color: '#64748b', 
                                  marginRight: 8 
                                }}
                              >
                                Tiến độ tổng:
                              </Text>
                              <Text 
                                strong 
                                style={{ 
                                  color: isAllScored 
                                    ? '#10b981' 
                                    : (isEventLocked ? '#64748b' : '#1677ff') 
                                }}
                              >
                                {scoredTeamsEvent} / {totalTeamsEvent} đội
                              </Text>
                            </div>
                            
                            <Button 
                              type={isEventClosed ? "default" : "primary"} 
                              size="large" 
                              icon={
                                isEventClosed 
                                  ? <HistoryOutlined /> 
                                  : <ArrowRightOutlined />
                              }
                              style={{ 
                                borderRadius: 8, 
                                fontWeight: 600, 
                                width: '100%',
                                background: isEventClosed ? '#f1f5f9' : undefined,
                                color: isEventClosed ? '#475569' : undefined,
                                borderColor: isEventClosed ? '#cbd5e1' : undefined
                              }}
                            >
                              {isEventClosed ? 'Xem Lịch Sử Chấm Thi' : 'Vào phòng chấm thi'}
                            </Button>
                          </Col>
                        </Row>
                        
                        <div 
                          style={{ 
                            display: 'none' 
                          }}
                        >
                            <Progress 
                              percent={eventProgressPercent} 
                            />
                        </div>
                      </Card>
                    );
                  })}

                  {/* THÊM PHÂN TRANG */}
                  {totalItems > pageSize && (
                    <div 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        marginTop: '16px' 
                      }}
                    >
                      <Pagination 
                        current={currentPage} 
                        pageSize={pageSize} 
                        total={totalItems} 
                        onChange={(page) => setCurrentPage(page)} 
                        showSizeChanger={false}
                      />
                    </div>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        </Col>

        {/* CỘT PHẢI: ĐỒNG HỒ VÀ CALIBRATION */}
        <Col 
          xs={24} 
          lg={8}
        >
          <motion.div 
            variants={itemVariants} 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '24px' 
            }}
          >
            <ScoringCountdownCard 
              activeAssignment={activeAssignmentForCountdown}
              onEnterRoom={(item) => {
                navigate('/judge/assignments', { 
                  state: { 
                    activeEvent: item.hackathonName 
                  } 
                });
              }}
            />
            <CalibrationSessionsPanel 
              roundId={finalAssignment?.roundId} 
              isFinal={Boolean(finalAssignment)} 
              assignmentId={finalAssignment?.assignmentId ?? finalAssignment?.id} 
              trackId={finalAssignment?.trackId} 
            />
            <Card 
              title={
                <strong 
                  style={{ 
                    fontSize: '18px' 
                  }}
                >
                  <CalendarOutlined 
                    style={{ 
                      color: '#f59e0b', 
                      marginRight: 8 
                    }}
                  />
                  Lịch trình sắp tới
                </strong>
              } 
              style={{ 
                borderRadius: 16 
              }}
            >
               {(data.upcomingEvents || []).map(event => (
                  <div 
                    key={event.id} 
                    style={{ 
                      display: 'flex', 
                      gap: 12, 
                      marginBottom: 16 
                    }}
                  >
                    <div 
                      style={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        background: event.type === 'CALIBRATION' ? '#f59e0b' : '#3b82f6', 
                        marginTop: 4 
                      }} 
                    />
                    <div>
                      <Text 
                        style={{ 
                          display: 'block', 
                          fontSize: 13, 
                          color: '#64748b',
                          fontWeight: 500,
                          marginBottom: 2
                        }}
                      >
                        {event.time}
                      </Text>
                      <Text 
                        strong
                        style={{ color: '#1e293b' }}
                      >
                        {event.title}
                      </Text>
                    </div>
                  </div>
                ))}
            </Card>
          </motion.div>
        </Col>
      </Row>
      
    </motion.div>
  );
};

export default JudgeDashboard;