import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Card, Statistic, Button, Space, Tag, List, Progress, Skeleton, message, Input, Segmented } from 'antd';
import { 
  CheckCircleOutlined, ClockCircleOutlined, ArrowRightOutlined, 
  FundProjectionScreenOutlined, BarChartOutlined, TrophyOutlined, CalendarOutlined,
  SearchOutlined, AppstoreOutlined, CheckSquareOutlined, FireOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { judgeService } from '../services/judgeService';
import ScoringCountdownCard from '../components/ScoringCountdownCard';

const { Title, Text, Paragraph } = Typography;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const JudgeDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ stats: {}, assignments: [], upcomingEvents: [] });
  
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [tracksRes, finalsRes, scheduleRes] = await Promise.all([
          judgeService.getTrackAssignments().catch(() => []),
          judgeService.getFinalAssignments().catch(() => []),
          judgeService.getScoringSchedule().catch(() => [])
        ]);

        const rawTracks = Array.isArray(tracksRes) ? tracksRes : tracksRes?.items || tracksRes?.data || [];
        const rawFinals = Array.isArray(finalsRes) ? finalsRes : finalsRes?.items || finalsRes?.data || [];
        const rawSchedule = Array.isArray(scheduleRes) ? scheduleRes : scheduleRes?.items || scheduleRes?.data || [];

        const mappedTracks = rawTracks.map(item => ({
          id: item.id || item.assignmentId || Math.random(),
          hackathonName: item.hackathonName || item.hackathon_name || 'Hackathon',
          role: item.role || item.assignmentType || 'Giám khảo',
          trackName: item.trackName || item.track_name || 'Bảng Sơ loại',
          roundName: item.roundName || item.round_name || 'Vòng Sơ Loại',
          status: item.status || 'ONGOING',
          progress: item.progress || 0,
          totalTeams: item.totalTeams || 0,
          scoredTeams: item.scoredTeams || 0,
          roundId: item.roundId || item.round_id,
          trackId: item.trackId || item.track_id,
          isFinal: false
        }));

        const mappedFinals = rawFinals.map(item => ({
          id: item.id || item.assignmentId || Math.random(),
          hackathonName: item.hackathonName || item.hackathon_name || 'Hackathon',
          role: item.role || item.assignmentType || 'Giám khảo',
          trackName: 'Tất cả các bảng',
          roundName: item.roundName || item.round_name || 'Vòng Chung Kết',
          status: item.status || 'ONGOING',
          progress: item.progress || 0,
          totalTeams: item.totalTeams || 0,
          scoredTeams: item.scoredTeams || 0,
          roundId: item.roundId || item.round_id,
          trackId: null,
          isFinal: true
        }));

        const allAssignments = [...mappedTracks, ...mappedFinals];

        const mappedEvents = rawSchedule.map((ev, index) => ({
          id: ev.id || index,
          title: ev.title || ev.eventName || 'Lịch chấm thi',
          time: ev.time || ev.examAt || 'Chưa cập nhật',
          type: 'SCORING'
        }));

        setData({
          stats: { 
            totalEvaluated: allAssignments.reduce((sum, item) => sum + (item.scoredTeams || 0), 0), 
            pendingEvaluations: allAssignments.reduce((sum, item) => sum + ((item.totalTeams || 0) - (item.scoredTeams || 0)), 0), 
            calibrationScore: 100 
          },
          assignments: allAssignments,
          upcomingEvents: mappedEvents.length > 0 ? mappedEvents : [
            { id: 1, title: 'Đang chờ Ban tổ chức lên lịch...', time: '--', type: 'CALIBRATION' }
          ]
        });

      } catch (error) {
        console.error("Lỗi tải Dashboard:", error);
        message.error("Không thể tải danh sách nhiệm vụ từ máy chủ.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div style={{ padding: '40px' }}><Skeleton active paragraph={{ rows: 6 }} /></div>;
  }

  const activeAssignmentForCountdown = data.assignments?.find(a => a.status === 'ONGOING' && a.progress < 100) || data.assignments?.[0];

  const filteredAssignments = (data.assignments || []).filter(item => {
    const isCompleted = item.status === 'COMPLETED' || item.progress === 100;
    
    const matchStatus = 
      filterStatus === 'ALL' ? true : 
      filterStatus === 'ONGOING' ? (!isCompleted && item.status === 'ONGOING') : 
      isCompleted;
      
    const matchSearch = (item.trackName || '').toLowerCase().includes(searchText.toLowerCase()) || 
                        (item.roundName || '').toLowerCase().includes(searchText.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} style={{ maxWidth: 1400, margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      
      {/* 1. HERO BANNER */}
      <motion.div variants={itemVariants}>
        <div style={{
          background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #0ea5e9 100%)',
          borderRadius: '24px', padding: '40px', color: '#ffffff', marginBottom: '32px',
          boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <Space align="center" style={{ marginBottom: 12 }}>
              <Tag color="cyan" style={{ borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                <TrophyOutlined /> Cổng Giám Khảo SEAL
              </Tag>
            </Space>
            <Title level={1} style={{ margin: 0, color: '#ffffff', fontSize: '32px', fontWeight: 800 }}>
              Xin chào {user?.fullName ? `Giám khảo ${user.fullName}` : 'Giám khảo'}!
            </Title>
            <Paragraph style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.9)', marginTop: 8, maxWidth: '650px', lineHeight: 1.6 }}>
              Cảm ơn bạn đã tham gia đánh giá. Sự công tâm của bạn là chìa khóa tìm ra những dự án xuất sắc nhất cho cuộc thi.
            </Paragraph>
          </div>
        </div>
      </motion.div>

      {/* 2. THẺ THỐNG KÊ */}
      <motion.div variants={itemVariants}>
        <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
          <Col xs={24} sm={8}>
            <Card style={{ borderRadius: 16 }}>
              <Statistic title={<span style={{ fontWeight: 600, color: '#64748b' }}>Đã Chấm</span>} value={data.stats?.totalEvaluated || 0} prefix={<CheckCircleOutlined style={{color: '#10b981'}}/>} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ borderRadius: 16 }}>
              <Statistic title={<span style={{ fontWeight: 600, color: '#64748b' }}>Chờ Chấm</span>} value={data.stats?.pendingEvaluations || 0} prefix={<ClockCircleOutlined style={{color: '#f59e0b'}}/>} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ borderRadius: 16 }}>
              <Statistic title={<span style={{ fontWeight: 600, color: '#64748b' }}>Độ Lệch Chuẩn (RBL)</span>} value={data.stats?.calibrationScore || 0} suffix="/100" prefix={<BarChartOutlined style={{color: '#3b82f6'}}/>} />
            </Card>
          </Col>
        </Row>
      </motion.div>

      {/* 3. BỐ CỤC CHIA 2 CỘT */}
      <Row gutter={[24, 24]}>
        
        {/* CỘT TRÁI: NHIỆM VỤ PHÂN CÔNG */}
        <Col xs={24} lg={16}>
          <motion.div variants={itemVariants}>
            <Card 
              title={
                <strong style={{ fontSize: '18px', display: 'flex', alignItems: 'center' }}>
                  <FundProjectionScreenOutlined style={{ color: '#3b82f6', marginRight: 8 }}/>
                  Nhiệm vụ Phân công ({filteredAssignments.length})
                </strong>
              } 
              style={{ borderRadius: 16 }}
              styles={{ header: { padding: '16px 24px', borderBottom: '1px solid #f0f0f0' } }}
              extra={
                <Space wrap>
                  <Input 
                    placeholder="Tìm kiếm..." 
                    prefix={<SearchOutlined style={{ color: '#bfbfbf' }}/>}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 160, borderRadius: 8 }}
                  />
                  <Segmented 
                    options={[
                      { label: 'Tất cả', value: 'ALL', icon: <AppstoreOutlined /> },
                      { label: 'Đang mở', value: 'ONGOING', icon: <FireOutlined /> },
                      { label: 'Đã xong', value: 'COMPLETED', icon: <CheckSquareOutlined /> }
                    ]} 
                    value={filterStatus}
                    onChange={setFilterStatus}
                  />
                </Space>
              }
            >
              <List
                dataSource={filteredAssignments}
                locale={{ emptyText: 'Không tìm thấy nhiệm vụ nào phù hợp với bộ lọc.' }}
                renderItem={item => {
                  const isCompleted = item.status === 'COMPLETED' || item.progress === 100;
                  const isOngoing = item.status === 'ONGOING' && !isCompleted;
                  const canEnter = item.status === 'ONGOING' || isCompleted;

                  return (
                    <List.Item
                      style={{ 
                        padding: '20px', 
                        border: '1px solid #f0f0f0', 
                        borderRadius: 16, 
                        marginBottom: 16, 
                        background: '#ffffff',
                        transition: 'all 0.3s ease',
                      }}
                      className="hover-card-effect"
                    >
                      {/* BỐ CỤC MỚI: CHIA THÀNH 2 HÀNG RÕ RÀNG */}
                      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '16px' }}>
                        
                        {/* HÀNG 1: Avatar + Tên vòng thi (Cho phép rớt dòng thoải mái) */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                          <div style={{ 
                            width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            background: item.isFinal ? '#fff1f0' : '#e6f4ff', color: item.isFinal ? '#f5222d' : '#1677ff'
                          }}>
                            {item.isFinal ? <TrophyOutlined style={{ fontSize: 24 }}/> : <AppstoreOutlined style={{ fontSize: 24 }}/>}
                          </div>
                          
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <Title level={4} style={{ margin: 0, lineHeight: 1.3 }}>
                                {item.trackName}
                              </Title>
                              {isOngoing && <Tag color="processing" style={{ margin: 0 }}>ĐANG MỞ</Tag>}
                              {isCompleted && <Tag color="success" style={{ margin: 0 }}>HOÀN THÀNH</Tag>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                              <Text type="secondary" style={{ fontSize: 13 }}>
                                {item.hackathonName} • {item.roundName}
                              </Text>
                              <div>
                                <Text type="secondary" style={{ fontSize: 13 }}>Vai trò: </Text>
                                <Tag color={item.role.includes('HEAD') ? 'gold' : 'blue'} style={{ borderRadius: 4 }}>{item.role}</Tag>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* HÀNG 2: Tiến độ + Nút bấm (Ngăn cách bởi nét đứt) */}
                        <div style={{ 
                          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', 
                          gap: '20px', borderTop: '1px dashed #f0f0f0', paddingTop: '16px' 
                        }}>
                          
                          {/* Thanh Tiến độ */}
                          <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Tiến độ chấm điểm</Text>
                              <Text strong style={{ color: isCompleted ? '#10b981' : '#1677ff' }}>
                                {item.scoredTeams} / {item.totalTeams} đội
                              </Text>
                            </div>
                            <Progress 
                              percent={item.progress} 
                              showInfo={false} 
                              strokeColor={isCompleted ? '#10b981' : '#1677ff'} 
                              trailColor="#f1f5f9"
                              strokeWidth={8}
                            />
                          </div>

                          {/* Nút Bấm */}
                          <div style={{ flex: '1 1 auto', minWidth: '180px' }}>
                            <Button 
                              type={isOngoing ? 'primary' : 'default'} 
                              style={{ 
                                borderRadius: 8, 
                                height: 40, 
                                fontWeight: 600, 
                                width: '100%',
                                borderColor: isCompleted ? '#10b981' : undefined,
                                color: isCompleted ? '#10b981' : undefined
                              }} 
                              onClick={() => {
                                if (canEnter) {
                                  navigate(`/judging/${item.id}/scoring`, { 
                                    state: { 
                                      roundId: item.roundId, 
                                      trackId: item.trackId, 
                                      isFinal: item.isFinal,
                                      isReadOnly: isCompleted
                                    } 
                                  });
                                } else {
                                  message.info(`Nhiệm vụ này đã đóng hoặc chưa bắt đầu!`);
                                }
                              }}
                            >
                              {isOngoing ? 'Vào phòng chấm thi' : (isCompleted ? 'Xem chi tiết' : 'Đã đóng')} <ArrowRightOutlined />
                            </Button>
                          </div>

                        </div>

                      </div>
                    </List.Item>
                  );
                }}
              />
            </Card>
          </motion.div>
        </Col>

        {/* CỘT PHẢI */}
        <Col xs={24} lg={8}>
          <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <ScoringCountdownCard 
              activeAssignment={activeAssignmentForCountdown}
              onEnterRoom={(item) => {
                const isCompletedCountdown = item.status === 'COMPLETED' || item.progress === 100;
                if (item.status === 'ONGOING' || isCompletedCountdown) {
                  navigate(`/judging/${item.id}/scoring`, { 
                    state: { 
                      roundId: item.roundId, 
                      trackId: item.trackId, 
                      isFinal: item.isFinal,
                      isReadOnly: isCompletedCountdown
                    } 
                  });
                } else {
                  message.info(`Nhiệm vụ này không ở trạng thái đang diễn ra!`);
                }
              }}
            />
            <Card title={<strong style={{ fontSize: '18px' }}><CalendarOutlined style={{ color: '#f59e0b', marginRight: 8 }}/>Lịch trình sắp tới</strong>} style={{ borderRadius: 16 }}>
               {(data.upcomingEvents || []).map(event => (
                  <div key={event.id} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: event.type === 'CALIBRATION' ? '#f59e0b' : '#3b82f6', marginTop: 4 }} />
                    <div>
                      <Text style={{ display: 'block', fontSize: 12, color: '#64748b' }}>{event.time}</Text>
                      <Text strong>{event.title}</Text>
                    </div>
                  </div>
                ))}
            </Card>
          </motion.div>
        </Col>

      </Row>
      
      <style>{`
        .hover-card-effect:hover {
          box-shadow: 0 10px 20px rgba(0,0,0,0.05) !important;
          transform: translateY(-2px);
          border-color: #bae0ff !important;
        }
      `}</style>
    </motion.div>
  );
};

export default JudgeDashboard;