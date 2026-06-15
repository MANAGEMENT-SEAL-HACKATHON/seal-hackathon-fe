import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Card, Button, Space, Tag, Progress, Skeleton, message, Input, Select } from 'antd';
// Đã thêm import EyeOutlined cho nút Xem chi tiết
import { ArrowRightOutlined, SearchOutlined, AppstoreOutlined, TrophyOutlined, LoginOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { judgeService } from '../services/judgeService';

const { Title, Text } = Typography;

const ScoringLobbyPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [searchText, setSearchText] = useState('');
  
  // Thêm state cho Dropdown lọc Vòng thi
  const [roundFilter, setRoundFilter] = useState('ALL');

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const [tracksRes, finalsRes] = await Promise.all([
          judgeService.getTrackAssignments().catch(() => []),
          judgeService.getFinalAssignments().catch(() => [])
        ]);

        const rawTracks = Array.isArray(tracksRes) ? tracksRes : tracksRes?.items || tracksRes?.data || [];
        const rawFinals = Array.isArray(finalsRes) ? finalsRes : finalsRes?.items || finalsRes?.data || [];

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

        setAssignments([...mappedTracks, ...mappedFinals]);
      } catch (error) {
        message.error("Lỗi khi tải danh sách phòng chấm thi.");
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  // Cập nhật logic lọc: Kết hợp cả Search Text và Dropdown Round
  const filteredAssignments = assignments.filter(item => {
    // 1. Lọc theo text tìm kiếm
    const matchesSearch = (item.trackName || '').toLowerCase().includes(searchText.toLowerCase()) || 
                          (item.roundName || '').toLowerCase().includes(searchText.toLowerCase());
    
    // 2. Lọc theo Dropdown vòng thi
    let matchesRound = true;
    if (roundFilter === 'PRELIMINARY') matchesRound = !item.isFinal;
    if (roundFilter === 'FINAL') matchesRound = item.isFinal;

    return matchesSearch && matchesRound;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Phòng Chấm Thi</Title>
          <Text type="secondary" style={{ fontSize: 15 }}>Chọn một nhiệm vụ đang mở để bắt đầu công tác đánh giá.</Text>
        </div>
        
        {/* Nhóm Dropdown và Thanh tìm kiếm lại với nhau */}
        <Space size="middle" wrap>
          <Select
            size="large"
            value={roundFilter}
            onChange={setRoundFilter}
            style={{ width: 180 }}
            options={[
              { value: 'ALL', label: 'Tất cả các vòng' },
              { value: 'PRELIMINARY', label: 'Vòng Sơ Loại' },
              { value: 'FINAL', label: 'Vòng Chung Kết' },
            ]}
          />
          <Input 
            size="large"
            placeholder="Tìm kiếm vòng thi, bảng đấu..." 
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }}/>}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300, borderRadius: 8 }}
          />
        </Space>
      </div>

      {loading ? (
        <Row gutter={[24, 24]}>
          {[1, 2, 3].map(key => (
            <Col xs={24} md={12} lg={8} key={key}><Skeleton active avatar paragraph={{ rows: 4 }} /></Col>
          ))}
        </Row>
      ) : (
        <Row gutter={[24, 24]}>
          {filteredAssignments.map(item => {
            // LOGIC KIỂM TRA TRẠNG THÁI HOÀN THÀNH Ở ĐÂY
            const isCompleted = item.status === 'COMPLETED' || item.progress === 100;
            const isOngoing = item.status === 'ONGOING' && !isCompleted;
            const canEnter = item.status === 'ONGOING' || isCompleted;

            return (
              <Col xs={24} md={12} lg={8} key={item.id}>
                <Card 
                  hoverable
                  style={{ 
                    borderRadius: 16, 
                    border: isCompleted ? '1px solid #b7eb8f' : '1px solid #e2e8f0', // Đổi màu viền thẻ nếu đã hoàn thành
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column' 
                  }}
                  styles={{ body: { padding: 24, display: 'flex', flexDirection: 'column', height: '100%' } }}
                  onClick={() => {
                    // Nếu là ONGOING hoặc COMPLETED đều cho phép vào phòng
                    if (canEnter) {
                      navigate(`/judging/${item.id}/scoring`, { 
                        state: { 
                          roundId: item.roundId, 
                          trackId: item.trackId, 
                          isFinal: item.isFinal,
                          isReadOnly: isCompleted // Truyền cờ Khóa form (Read-Only) sang trang trong
                        } 
                      });
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ 
                      width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: item.isFinal ? '#fff1f0' : '#e6f4ff', color: item.isFinal ? '#f5222d' : '#1677ff'
                    }}>
                      {item.isFinal ? <TrophyOutlined style={{ fontSize: 24 }}/> : <AppstoreOutlined style={{ fontSize: 24 }}/>}
                    </div>
                    <div>
                      {isOngoing && <Tag color="processing" style={{ borderRadius: 4, margin: 0 }}>ĐANG MỞ</Tag>}
                      {isCompleted && <Tag color="success" style={{ borderRadius: 4, margin: 0 }}>HOÀN THÀNH</Tag>}
                      {!isOngoing && !isCompleted && <Tag color="default" style={{ borderRadius: 4, margin: 0 }}>ĐÃ ĐÓNG</Tag>}
                    </div>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <Title level={4} style={{ margin: '0 0 8px 0', color: '#1e293b' }}>{item.trackName}</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>{item.hackathonName} • {item.roundName}</Text>
                    <Text type="secondary">Vai trò: <Tag color={item.role.includes('HEAD') ? 'gold' : 'blue'} style={{ marginLeft: 4 }}>{item.role}</Tag></Text>
                  </div>

                  <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px dashed #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 13, color: '#64748b' }}>Tiến độ chấm điểm</Text>
                      <Text strong style={{ color: isCompleted ? '#10b981' : '#1677ff' }}>{item.scoredTeams} / {item.totalTeams} đội</Text>
                    </div>
                    <Progress 
                      percent={item.progress} 
                      showInfo={false} 
                      strokeColor={isCompleted ? '#10b981' : '#1677ff'} 
                      trailColor="#f1f5f9" 
                    />
                    
                    <Button 
                      type={isOngoing ? 'primary' : 'default'} 
                      block 
                      icon={isOngoing ? <LoginOutlined /> : (isCompleted ? <EyeOutlined /> : <LoginOutlined />)}
                      disabled={!canEnter}
                      style={{ 
                        marginTop: 16, 
                        height: 40, 
                        borderRadius: 8, 
                        fontWeight: 600,
                        borderColor: isCompleted ? '#10b981' : undefined,
                        color: isCompleted ? '#10b981' : undefined
                      }}
                    >
                      {isOngoing ? 'Vào phòng chấm thi' : (isCompleted ? 'Xem chi tiết' : 'Đã kết thúc')}
                    </Button>
                  </div>
                </Card>
              </Col>
            );
          })}
          {filteredAssignments.length === 0 && (
            <div style={{ width: '100%', textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              Không tìm thấy phòng chấm thi nào phù hợp với bộ lọc.
            </div>
          )}
        </Row>
      )}
    </motion.div>
  );
};

export default ScoringLobbyPage;