import React, { 
  useState, 
  useEffect 
} from 'react';
import { 
  Typography, 
  Row, 
  Col, 
  Card, 
  Button, 
  Space, 
  Tag, 
  Progress, 
  Skeleton, 
  message, 
  Input, 
  Select,
  Pagination 
} from 'antd';
import LiveRecordIndicator from '../../../shared/components/ui/LiveRecordIndicator';
import { 
  ArrowRightOutlined, 
  SearchOutlined, 
  AppstoreOutlined, 
  TrophyOutlined, 
  LoginOutlined, 
  HistoryOutlined,
  DownOutlined,
  UpOutlined,
  BlockOutlined
} from '@ant-design/icons';
import { 
  useNavigate, 
  useLocation 
} from 'react-router-dom';
import { 
  motion 
} from 'framer-motion';
import { 
  judgeService 
} from '../services/judgeService';
import { runDeclineAssignment } from '../../assignments/utils/confirmAssignmentDecline';
import { resolveUserError } from '../../../shared/errors/resolveUserError';
const { 
  Title, 
  Text 
} = Typography;

const ScoringLobbyPage = () => {
  // ==========================================
  // 1. KHỞI TẠO HOOKS VÀ ROUTER
  // ==========================================
  const navigate = useNavigate();
  const location = useLocation();
  
  // Bắt state từ trang Dashboard để tự động mở Event được chọn
  const { 
    activeEvent 
  } = location.state || {};

  // ==========================================
  // 2. KHỞI TẠO STATE QUẢN LÝ DỮ LIỆU
  // ==========================================
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  
  // State quản lý bộ lọc
  const [searchText, setSearchText] = useState('');
  const [roundFilter, setRoundFilter] = useState('ALL');
  
  // State ưu tiên nhận giá trị activeEvent nếu có, nếu không thì mặc định là 'ALL'
  const [hackathonFilter, setHackathonFilter] = useState(
    activeEvent ? activeEvent : 'ALL'
  );

  // STATE: Quản lý danh sách các Event Card đang được MỞ (Sổ ra)
  const [expandedEvents, setExpandedEvents] = useState(
    activeEvent ? [activeEvent] : []
  );

  // THÊM STATE PHÂN TRANG
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5; // Số sự kiện hiển thị trên 1 trang

  const reloadAssignments = async () => {
    try {
      setLoading(true);
      const [tracksRes, finalsRes] = await Promise.all([
        judgeService.getTrackAssignments().catch(() => []),
        judgeService.getFinalAssignments().catch(() => [])
      ]);

      const rawTracks = Array.isArray(tracksRes)
        ? tracksRes
        : tracksRes?.items || tracksRes?.data || [];

      const rawFinals = Array.isArray(finalsRes)
        ? finalsRes
        : finalsRes?.items || finalsRes?.data || [];

      const processAssignment = (item, isFinalFlag) => {
        const hName = item.hackathonName || item.hackathon_name || 'Hackathon Chưa Rõ Tên';

        const hStatus = item.hackathonStatus
          || item.hackathon_status
          || (hName.toLowerCase().includes('completed') ? 'COMPLETED' : 'ACTIVE');

        const rStatus = item.roundStatus || item.round_status || item.status || 'ACTIVE';

        const cStatus = item.completionStatus || item.completion_status || 'NOT_STARTED';
        const responseStatus = String(
          item.responseStatus || item.response_status || 'ACCEPTED',
        ).toUpperCase();

        const total = item.totalTeams ?? item.total_teams ?? 0;
        const scored = item.scoredTeams ?? item.scored_teams ?? 0;

        let calcProgress = item.progress || 0;

        if (total > 0) {
          calcProgress = Math.round((scored / total) * 100);
        } else {
          if (cStatus === 'COMPLETED') {
            calcProgress = 100;
          } else if (cStatus === 'IN_PROGRESS') {
            calcProgress = 50;
          }
        }

        return {
          id: item.id || item.assignmentId || Math.random(),
          hackathonId: item.hackathonId || item.hackathon_id || 'unknown',
          hackathonName: hName,
          hackathonStatus: hStatus,
          role: item.role || item.assignmentType || 'Giám khảo',
          assignmentType: item.assignmentType || item.role,
          trackName: isFinalFlag
            ? 'Tất cả các bảng'
            : (item.trackName || item.track_name || 'Bảng Sơ loại'),
          roundName: item.roundName || item.round_name || (isFinalFlag ? 'Vòng Chung Kết' : 'Vòng Sơ Loại'),
          roundStatus: rStatus,
          completionStatus: cStatus,
          responseStatus,
          declineReason: item.declineReason || item.decline_reason || null,
          progress: calcProgress,
          totalTeams: total,
          scoredTeams: scored,
          roundId: item.roundId || item.round_id,
          trackId: isFinalFlag ? null : (item.trackId || item.track_id),
          isFinal: isFinalFlag
        };
      };

      const mappedTracks = rawTracks.map((item) => processAssignment(item, false));
      const mappedFinals = rawFinals.map((item) => processAssignment(item, true));
      setAssignments([...mappedTracks, ...mappedFinals]);
    } catch (error) {
      message.error('Lỗi khi tải danh sách phòng chấm thi.');
    } finally {
      setLoading(false);
    }
  };

  // Reset trang về 1 khi người dùng gõ tìm kiếm hoặc đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, roundFilter, hackathonFilter]);

  // ==========================================
  // HÀM: Xử lý khi bấm vào Card Sự kiện để Mở/Đóng
  // ==========================================
  const toggleEventCard = (eventName) => {
    setExpandedEvents((prevExpanded) => {
      // Nếu đã mở rồi thì đóng lại (xóa khỏi mảng)
      if (prevExpanded.includes(eventName)) {
        return prevExpanded.filter((name) => name !== eventName);
      }
      // Nếu chưa mở thì thêm vào mảng để mở ra
      return [...prevExpanded, eventName];
    });
  };

  // ==========================================
  // 3. FETCH DỮ LIỆU TỪ BACKEND
  // ==========================================
  useEffect(() => {
    reloadAssignments();
  }, []);

  // ==========================================
  // 4. LOGIC LỌC DỮ LIỆU
  // ==========================================
  const filteredAssignments = assignments.filter((item) => {
    const matchesSearch = 
      (item.trackName || '').toLowerCase().includes(searchText.toLowerCase()) || 
      (item.roundName || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (item.hackathonName || '').toLowerCase().includes(searchText.toLowerCase());
                          
    let matchesRound = true;
    if (roundFilter === 'PRELIMINARY') {
      matchesRound = !item.isFinal;
    }
    if (roundFilter === 'FINAL') {
      matchesRound = item.isFinal;
    }

    const matchHackathon = hackathonFilter === 'ALL' 
      ? true 
      : item.hackathonName === hackathonFilter;

    return matchesSearch && matchesRound && matchHackathon;
  });

  // ==========================================
  // 5. GOM NHÓM DỮ LIỆU THEO SỰ KIỆN & SẮP XẾP & PHÂN TRANG
  // ==========================================
  const groupedAssignments = filteredAssignments.reduce((acc, curr) => {
    const key = curr.hackathonName;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(curr);
    return acc;
  }, {});

  const uniqueHackathons = [...new Set(assignments.map(a => a.hackathonName).filter(Boolean))];

  // Options cho Dropdown
  const hackathonOptions = [
    { 
      value: 'ALL', 
      label: 'Tất cả sự kiện' 
    }, 
    ...uniqueHackathons.map((name) => {
      return { 
        value: name, 
        label: name 
      };
    })
  ];

  const roundOptions = [
    { 
      value: 'ALL', 
      label: 'Tất cả các vòng' 
    }, 
    { 
      value: 'PRELIMINARY', 
      label: 'Vòng Sơ Loại' 
    }, 
    { 
      value: 'FINAL', 
      label: 'Vòng Chung Kết' 
    }
  ];

  // BƯỚC 1: Xử lý mảng sự kiện để tính trạng thái ĐÓNG / MỞ
  const processedEventList = Object.entries(groupedAssignments).map(([hackathonName, tasks]) => {
    const totalTeamsEvent = tasks.reduce((sum, t) => sum + (t.totalTeams || 0), 0);
    const scoredTeamsEvent = tasks.reduce((sum, t) => sum + (t.scoredTeams || 0), 0);
    
    const isEventLocked = tasks.every((t) => 
      ['COMPLETED', 'FINISHED', 'CLOSED', 'INACTIVE'].includes(t.hackathonStatus) || 
      ['COMPLETED', 'FINISHED', 'CLOSED', 'INACTIVE'].includes(t.roundStatus)
    );
    
    const isAllScored = (totalTeamsEvent > 0 && scoredTeamsEvent === totalTeamsEvent) || 
                        tasks.every(t => t.progress === 100 || t.completionStatus === 'COMPLETED');
                        
    const isEventClosed = isEventLocked || isAllScored;

    return {
      hackathonName,
      tasks,
      totalTeamsEvent,
      scoredTeamsEvent,
      isEventLocked,
      isAllScored,
      isEventClosed
    };
  });

  // BƯỚC 2: Sắp xếp (ACTIVE lên đầu, COMPLETED xuống cuối)
  processedEventList.sort((a, b) => {
    if (a.isEventClosed === b.isEventClosed) {
      return a.hackathonName.localeCompare(b.hackathonName);
    }
    return a.isEventClosed ? 1 : -1; 
  });

  // BƯỚC 3: Phân trang
  const totalItems = processedEventList.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedEvents = processedEventList.slice(startIndex, startIndex + pageSize);

  // ==========================================
  // 6. RENDER GIAO DIỆN
  // ==========================================
  return (
    <motion.div 
      initial={{ 
        opacity: 0, 
        y: 20 
      }} 
      animate={{ 
        opacity: 1, 
        y: 0 
      }} 
      transition={{ 
        duration: 0.4 
      }} 
      style={{ 
        maxWidth: 1400, 
        margin: '0 auto', 
        paddingBottom: '60px' 
      }}
    >
      {/* KHU VỰC HEADER VÀ BỘ LỌC */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 32, 
          flexWrap: 'wrap', 
          gap: 16 
        }}
      >
        <div>
          <Title 
            level={2} 
            style={{ 
              margin: 0, 
              color: '#1e293b' 
            }}
          >
            Phòng chấm thi
          </Title>
          <Text 
            type="secondary" 
            style={{ 
              fontSize: 15 
            }}
          >
            Chọn một sự kiện để hiển thị các nhiệm vụ đánh giá bên trong.
          </Text>
        </div>
        
        <Space 
          size="middle" 
          wrap
        >
          {/* Dropdown lọc theo Sự kiện */}
          <Select 
            value={hackathonFilter} 
            onChange={setHackathonFilter} 
            style={{ 
              width: 180 
            }} 
            options={hackathonOptions} 
          />

          {/* Dropdown lọc theo Vòng thi */}
          <Select 
            value={roundFilter} 
            onChange={setRoundFilter} 
            style={{ 
              width: 160 
            }} 
            options={roundOptions} 
          />

          {/* Ô nhập từ khóa tìm kiếm */}
          <Input 
            placeholder="Tìm kiếm vòng thi, bảng đấu..." 
            prefix={
              <SearchOutlined 
                style={{ 
                  color: '#bfbfbf' 
                }}
              />
            } 
            onChange={(e) => setSearchText(e.target.value)} 
            style={{ 
              width: 260, 
              borderRadius: 8 
            }}
          />
        </Space>
      </div>

      {/* KHU VỰC HIỂN THỊ DỮ LIỆU */}
      {loading ? (
        // HIỂN THỊ SKELETON KHI ĐANG LOADING
        <Row 
          gutter={[24, 24]}
        >
          {[1, 2, 3].map((key) => (
            <Col 
              xs={24} 
              md={12} 
              lg={8} 
              key={key}
            >
              <Skeleton 
                active 
                avatar 
                paragraph={{ 
                  rows: 4 
                }} 
              />
            </Col>
          ))}
        </Row>
      ) : totalItems === 0 ? (
        // HIỂN THỊ TRẠNG THÁI TRỐNG KHI KHÔNG CÓ DỮ LIỆU
        <div 
          style={{ 
            width: '100%', 
            textAlign: 'center', 
            padding: '60px 0', 
            color: '#94a3b8' 
          }}
        >
          Không tìm thấy phòng chấm thi nào phù hợp với bộ lọc.
        </div>
      ) : (
        <>
          {/* RENDER DANH SÁCH SỰ KIỆN ĐÃ ĐƯỢC SẮP XẾP VÀ PHÂN TRANG */}
          {paginatedEvents.map(({ 
            hackathonName, 
            tasks, 
            totalTeamsEvent, 
            scoredTeamsEvent, 
            isEventLocked, 
            isAllScored, 
            isEventClosed 
          }) => {
            
            // Kiểm tra xem Event Card này có đang được mở không
            const isExpanded = expandedEvents.includes(hackathonName);

            return (
              <Card 
                key={hackathonName} 
                style={{ 
                  marginBottom: 24,
                  borderRadius: 16,
                  border: isEventClosed 
                    ? '1px solid #e2e8f0' 
                    : '1px solid #bae0ff',
                  boxShadow: isExpanded 
                    ? '0 8px 24px rgba(0,0,0,0.06)' 
                    : '0 2px 8px rgba(0,0,0,0.02)',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  opacity: isEventClosed ? 0.85 : 1
                }}
                styles={{
                  body: {
                    padding: 0
                  }
                }}
              >
                {/* VÙNG HEADER CỦA EVENT CARD */}
                <div 
                  onClick={() => toggleEventCard(hackathonName)}
                  style={{ 
                    padding: '24px 32px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isExpanded ? '#f8fafc' : '#ffffff',
                    transition: 'background 0.3s ease'
                  }}
                >
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 20 
                    }}
                  >
                    {/* Icon Đại diện cho Sự Kiện */}
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
                          level={3} 
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
                          fontSize: 15, 
                          display: 'block', 
                          marginTop: 4 
                        }}
                      >
                        Tiến độ: 
                        <strong 
                          style={{ 
                            color: isAllScored 
                              ? '#10b981' 
                              : (isEventLocked ? '#64748b' : '#1677ff'), 
                            marginLeft: 4 
                          }}
                        >
                          {scoredTeamsEvent} / {totalTeamsEvent}
                        </strong> đội
                      </Text>
                    </div>
                  </div>

                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 16 
                    }}
                  >
                    <Tag 
                      color={isEventClosed ? 'default' : 'geekblue'} 
                      style={{ 
                        borderRadius: 12, 
                        fontSize: 14, 
                        padding: '4px 12px', 
                        border: 'none', 
                        background: isEventClosed ? '#f1f5f9' : '#e6f4ff', 
                        color: isEventClosed ? '#64748b' : '#1677ff', 
                        fontWeight: 600 
                      }}
                    >
                      {tasks.length} nhiệm vụ
                    </Tag>
                    
                    {/* Nút thả xuống (Chevron) chỉ báo trạng thái */}
                    <div 
                      style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%', 
                        background: '#f1f5f9', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: '#64748b'
                      }}
                    >
                      {isExpanded ? <UpOutlined /> : <DownOutlined />}
                    </div>
                  </div>
                </div>

                {/* VÙNG BODY (NHIỆM VỤ CON): CHỈ HIỂN THỊ KHI ĐƯỢC SỔ XUỐNG */}
                {isExpanded && (
                  <div 
                    style={{ 
                      padding: '32px', 
                      background: '#f8fafc',
                      borderTop: '1px solid #f0f0f0'
                    }}
                  >
                    <Row 
                      gutter={[24, 24]}
                    >
                      {tasks.map((item) => {
                        // XỬ LÝ LOGIC ĐÓNG/MỞ CHO TỪNG NHIỆM VỤ CỤ THỂ
                        const isEventLockedCard = ['COMPLETED', 'FINISHED', 'CLOSED', 'INACTIVE'].includes(item.hackathonStatus);
                        const isRoundLockedCard = ['COMPLETED', 'FINISHED', 'CLOSED', 'INACTIVE'].includes(item.roundStatus);
                        
                        const isScoringFinishedCard = item.progress === 100 
                          || (item.scoredTeams === item.totalTeams && item.totalTeams > 0) 
                          || item.completionStatus === 'COMPLETED';
                        
                        const isDeclined = String(item.responseStatus || '').toUpperCase() === 'DECLINED';
                        const isLockedCard = isEventLockedCard || isRoundLockedCard;
                        
                        // Quyết định xem form có bị read-only không
                        const isReadOnly = isLockedCard || isScoringFinishedCard || isDeclined; 

                        return (
                          <Col 
                            xs={24} 
                            md={12} 
                            lg={12} 
                            xl={12} 
                            key={item.id}
                          >
                            <Card 
                              hoverable={!isDeclined}
                              style={{ 
                                borderRadius: 16, 
                                border: isDeclined
                                  ? '1px solid #fecaca'
                                  : (isReadOnly ? '1px solid #e2e8f0' : '1px solid #bae0ff'), 
                                height: '100%', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                cursor: isDeclined ? 'default' : 'pointer',
                                background: '#ffffff',
                                opacity: isDeclined ? 0.92 : 1,
                              }}
                              styles={{ 
                                body: { 
                                  padding: 24, 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  height: '100%' 
                                } 
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isDeclined) return;
                                
                                navigate(`/judging/${item.id}/scoring`, { 
                                  state: { 
                                    roundId: item.roundId, 
                                    trackId: item.isFinal ? null : item.trackId, 
                                    isFinal: item.isFinal, 
                                    isReadOnly: isReadOnly, 
                                    assignmentType: item.assignmentType || item.role 
                                  }
                                });
                              }}
                            >
                              {/* Card Header (Nhiệm vụ) */}
                              <div 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'flex-start', 
                                  justifyContent: 'space-between', 
                                  marginBottom: 16 
                                }}
                              >
                                <div 
                                  style={{ 
                                    width: 48, 
                                    height: 48, 
                                    borderRadius: 12, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    background: isReadOnly ? '#f1f5f9' : '#e6f4ff', 
                                    color: isReadOnly ? '#64748b' : '#1677ff' 
                                  }}
                                >
                                  {item.isFinal ? (
                                    <TrophyOutlined 
                                      style={{ 
                                        fontSize: 24 
                                      }} 
                                    />
                                  ) : (
                                    <AppstoreOutlined 
                                      style={{ 
                                        fontSize: 24 
                                      }} 
                                    />
                                  )}
                                </div>
                                <div>
                                  {isDeclined ? (
                                    <Tag color="error" style={{ borderRadius: 4, margin: 0 }}>
                                      ĐÃ TỪ CHỐI
                                    </Tag>
                                  ) : isLockedCard ? (
                                    <Tag 
                                      color="default" 
                                      style={{ 
                                        borderRadius: 4, 
                                        margin: 0 
                                      }}
                                    >
                                      ĐÃ ĐÓNG
                                    </Tag>
                                  ) : isScoringFinishedCard ? (
                                    <Tag 
                                      color="success" 
                                      style={{ 
                                        borderRadius: 4, 
                                        margin: 0 
                                      }}
                                    >
                                      HOÀN THÀNH
                                    </Tag>
                                  ) : (
                                    <Tag
                                      style={{
                                        borderRadius: 4,
                                        margin: 0,
                                        background: '#fef2f2',
                                        color: '#b91c1c',
                                        borderColor: '#fecaca',
                                      }}
                                    >
                                      CẦN CHẤM
                                    </Tag>
                                  )}
                                </div>
                              </div>
                              
                              {/* Card Body (Nhiệm vụ) */}
                              <div 
                                style={{ 
                                  flex: 1 
                                }}
                              >
                                <Title 
                                  level={4} 
                                  style={{ 
                                    margin: '0 0 8px 0', 
                                    color: isReadOnly ? '#64748b' : '#1e293b' 
                                  }}
                                >
                                  {item.trackName}
                                </Title>
                                <Text 
                                  type="secondary" 
                                  style={{ 
                                    display: 'block', 
                                    marginBottom: 4 
                                  }}
                                >
                                  {item.roundName}
                                </Text>
                                <Text 
                                  type="secondary"
                                >
                                  Vai trò: 
                                  <Tag 
                                    color={item.role.includes('HEAD') ? 'gold' : 'blue'} 
                                    style={{ 
                                      marginLeft: 4 
                                    }}
                                  >
                                    {item.role}
                                  </Tag>
                                </Text>
                              </div>

                              {/* Card Footer (Nhiệm vụ) */}
                              <div 
                                style={{ 
                                  marginTop: 24, 
                                  paddingTop: 16, 
                                  borderTop: '1px dashed #e2e8f0' 
                                }}
                              >
                                <div 
                                  style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    marginBottom: 8 
                                  }}
                                >
                                  <Text 
                                    style={{ 
                                      fontSize: 13, 
                                      color: '#64748b' 
                                    }}
                                  >
                                    Tiến độ chấm điểm
                                  </Text>
                                  {/* ÉP BUỘC HIỂN THỊ DẠNG PHÂN SỐ X / Y CHO NHIỆM VỤ CỤ THỂ */}
                                  <Text 
                                    strong 
                                    style={{ 
                                      color: isScoringFinishedCard 
                                        ? '#10b981' 
                                        : (isLockedCard ? '#64748b' : '#1677ff') 
                                    }}
                                  >
                                    {item.scoredTeams} / {item.totalTeams} đội
                                  </Text>
                                </div>
                                <Progress 
                                  percent={item.progress} 
                                  showInfo={false} 
                                  strokeColor={
                                    isScoringFinishedCard 
                                      ? '#10b981' 
                                      : (isLockedCard ? '#cbd5e1' : '#1677ff')
                                  } 
                                  trailColor="#f1f5f9" 
                                />
                                
                                <Button 
                                  type={isReadOnly ? 'default' : 'primary'} 
                                  block 
                                  disabled={isDeclined}
                                  icon={
                                    isReadOnly 
                                      ? <HistoryOutlined /> 
                                      : <LoginOutlined />
                                  }
                                  style={{ 
                                    marginTop: 16, 
                                    height: 40, 
                                    borderRadius: 8, 
                                    fontWeight: 600, 
                                    borderColor: isReadOnly ? '#cbd5e1' : undefined, 
                                    color: isReadOnly ? '#475569' : undefined, 
                                    background: isReadOnly ? '#f8fafc' : undefined
                                  }}
                                >
                                  {isDeclined
                                    ? 'Đã từ chối tham gia'
                                    : (isReadOnly ? 'Xem Lịch Sử Chấm Thi' : 'Vào phòng chấm thi')}
                                </Button>
                                {!isLockedCard && !isScoringFinishedCard && !isDeclined && (
                                  <Button
                                    type="link"
                                    danger
                                    block
                                    style={{ marginTop: 4 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      runDeclineAssignment(
                                        (reason) => judgeService.declineAssignment(item.id, reason),
                                        { onSuccess: reloadAssignments },
                                      );
                                    }}
                                  >
                                    Từ chối tham gia
                                  </Button>
                                )}
                                {isDeclined && (
                                  <Button
                                    type="link"
                                    block
                                    style={{ marginTop: 4 }}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await judgeService.acceptAssignment(item.id);
                                        message.success('Đã chấp nhận lại phân công');
                                        await reloadAssignments();
                                      } catch (error) {
                                        message.error(
                                          resolveUserError(error, {
                                            fallback: 'Không thể chấp nhận lại phân công.',
                                          }),
                                        );
                                      }
                                    }}
                                  >
                                    Rút lại từ chối
                                  </Button>
                                )}
                              </div>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>
                )}
              </Card>
            );
          })}

          {/* COMPONENT PHÂN TRANG (Task 3) */}
          {totalItems > pageSize && (
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                marginTop: '32px' 
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
        </>
      )}
    </motion.div>
  );
};

export default ScoringLobbyPage;