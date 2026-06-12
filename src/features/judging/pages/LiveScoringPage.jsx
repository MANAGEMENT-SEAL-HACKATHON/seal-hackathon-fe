import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  List,
  Tag,
  Slider,
  InputNumber,
  Button,
  Input,
  Divider,
  Space,
  Spin,
  Empty,
  Badge,
  Modal,
  message
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  SaveOutlined,
  EditOutlined,
  FilePdfOutlined,
  DownloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Import Recharts để vẽ biểu đồ RBL Variance
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

import { useLiveScoring } from '../hooks/useLiveScoring';
import { judgeService } from '../services/judgeService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * Hàm lấy màu hiển thị dựa trên loại tiêu chí
 */
const getTypeColor = (type) => {
  switch (type?.toLowerCase()) {
    case 'technical':
      return 'blue';
    case 'innovation':
      return 'orange';
    case 'general':
      return 'green';
    default:
      return 'default';
  }
};

const LiveScoringPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { assignmentId } = useParams();

  // BẢN VÁ LỖI: Lấy ID và cờ isReadOnly từ Router State
  const { roundId, trackId, isFinal, isReadOnly } = location.state || {};

  // Custom hook chứa toàn bộ logic API
  const {
    teams,
    criteria,
    selectedTeam,
    setSelectedTeam,
    isLoading,
    isSubmitting,
    currentScores,
    handleScoreChange,
    comment,
    setComment,
    calculateTotalScore,
    submitFinalScore,
    isCurrentlyScoring,
    scoreType, // Lấy cờ scoreType (NORMAL) từ hook
  } = useLiveScoring(assignmentId, roundId, trackId, isFinal);

  // ==========================================
  // STATE: QUẢN LÝ MODAL VIEW FILE PDF
  // ==========================================
  const [isSlideModalVisible, setIsSlideModalVisible] = useState(false);
  const [slideBlobUrl, setSlideBlobUrl] = useState(null);
  const [isLoadingSlide, setIsLoadingSlide] = useState(false);

  // ==========================================
  // STATE: QUẢN LÝ ĐỒNG HỒ Q&A REBUTTAL (3 PHÚT)
  // ==========================================
  const [timer, setTimer] = useState(180); // 180s = 3 phút
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  /**
   * Effect xử lý đếm ngược thời gian Q&A
   */
  useEffect(() => {
    let interval;
    if (isTimerRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      message.warning('Đã hết 3 phút hỏi - đáp!');
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  /**
   * Format giây thành chuỗi MM:SS
   */
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ==========================================
  // HÀM XỬ LÝ: XEM BÀI NỘP BẰNG PDF
  // ==========================================
  const handleViewSlide = async () => {
    if (!selectedTeam?.id) {
      return;
    }

    setIsSlideModalVisible(true);
    setIsLoadingSlide(true);

    try {
      const response = await judgeService.getSubmissionSlide(selectedTeam.id);

      // Tạo một URL ảo từ dữ liệu Blob lấy về để render iframe
      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileUrl = URL.createObjectURL(file);
      setSlideBlobUrl(fileUrl);
    } catch (error) {
      message.error(
        'Không thể tải bài nộp. Đội này có thể chưa nộp file hoặc file bị lỗi.'
      );
      setIsSlideModalVisible(false);
    } finally {
      setIsLoadingSlide(false);
    }
  };

  const handleCloseSlideModal = () => {
    setIsSlideModalVisible(false);
    if (slideBlobUrl) {
      URL.revokeObjectURL(slideBlobUrl);
      setSlideBlobUrl(null);
    }
  };

  // ==========================================
  // HÀM XỬ LÝ: LẤY DỮ LIỆU VẼ BIỂU ĐỒ RBL VARIANCE
  // Phân bố số lượng đội theo từng vùng điểm
  // ==========================================
  const getChartData = () => {
    const distribution = {
      '<5': 0,
      '5-7': 0,
      '7-9': 0,
      '9-10': 0,
    };

    teams.forEach((t) => {
      // Chỉ tính những đội đã được chấm (SCORED)
      if (t.status === 'SCORED') {
        const score = parseFloat(t.totalScore);
        if (score < 5) distribution['<5']++;
        else if (score < 7) distribution['5-7']++;
        else if (score < 9) distribution['7-9']++;
        else distribution['9-10']++;
      }
    });

    return Object.keys(distribution).map((key) => ({
      name: key,
      count: distribution[key],
    }));
  };

  // ==========================================
  // RENDER: GIAO DIỆN CHỜ (LOADING)
  // ==========================================
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#f5f7fa',
        }}
      >
        <Spin size="large" tip="Đang kết nối hệ thống chấm thi..." />
      </div>
    );
  }

  // Cờ khóa form: Khóa nếu trạng thái team là SCORED hoặc cờ isReadOnly được truyền từ Dashboard
  const isFormLocked = isReadOnly || selectedTeam?.status === 'SCORED';

  return (
    <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
      
      {/* ========================================== */}
      {/* HEADER: THANH ĐIỀU HƯỚNG VÀ ĐỒNG HỒ Q&A   */}
      {/* ========================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            type="text"
            onClick={() => navigate(-1)}
            style={{
              marginRight: 16,
              background: '#fff',
              borderRadius: 8,
              height: 40,
              width: 40,
            }}
          />
          <div>
            <Space align="center">
              <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
                Phòng Chấm Thi
              </Title>
              {/* Badge trạng thái GĐ5 */}
              <Tag color="cyan" style={{ fontWeight: 600 }}>
                Type: {scoreType || ' '}
              </Tag>
              {isFinal ? (
                <Tag color="gold">Chung Kết</Tag>
              ) : (
                <Tag color="blue">Sơ Loại</Tag>
              )}
            </Space>
            <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
              Mã phân công: #{assignmentId}
            </Text>
          </div>
        </div>

        {/* Cụm Đồng hồ Q&A Rebuttal */}
        <div
          style={{
            background: '#fff',
            padding: '8px 16px',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}
        >
          <div>
            <Text
              type="secondary"
              style={{ fontSize: 12, display: 'block', fontWeight: 600 }}
            >
              Thời gian Hỏi - Đáp
            </Text>
            <Text
              strong
              style={{
                fontSize: 20,
                color: timer <= 30 ? '#ef4444' : '#1677ff',
                fontFamily: 'monospace',
              }}
            >
              {formatTime(timer)}
            </Text>
          </div>
          <Space>
            <Button
              type="primary"
              shape="circle"
              icon={isTimerRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={() => setIsTimerRunning(!isTimerRunning)}
            />
            <Button
              shape="circle"
              icon={<ReloadOutlined />}
              onClick={() => {
                setTimer(180);
                setIsTimerRunning(false);
              }}
            />
          </Space>
        </div>
      </div>

      {/* ========================================== */}
      {/* MAIN CONTENT: CHIA 2 CỘT                     */}
      {/* ========================================== */}
      <Row gutter={24}>
        
        {/* CỘT TRÁI: DANH SÁCH ĐỘI THI & BIỂU ĐỒ */}
        <Col xs={24} lg={7}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
              height: 'calc(100vh - 120px)',
            }}
          >
            {/* Card Danh sách đội */}
            <Card
              title={<span style={{ fontWeight: 600 }}>Danh sách Đội thi ({teams.length})</span>}
              style={{
                borderRadius: 16,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
              }}
              styles={{ body: { padding: 0, overflowY: 'auto', flex: 1 } }}
            >
              <List
                dataSource={teams}
                renderItem={(team) => {
                  const isSelected = selectedTeam?.id === team.id;
                  const isScored = team.status === 'SCORED';
                  const isThisTeamScoring = isSelected && isCurrentlyScoring;

                  return (
                    <div
                      onClick={() => setSelectedTeam(team)}
                      style={{
                        padding: '16px 24px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0',
                        background: isSelected ? '#e6f4ff' : '#fff',
                        borderLeft: isSelected
                          ? '4px solid #1677ff'
                          : '4px solid transparent',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          strong
                          style={{
                            fontSize: 16,
                            color: isSelected ? '#1677ff' : '#1e293b',
                          }}
                        >
                          {team.name}
                        </Text>
                        {isScored ? (
                          <CheckCircleFilled style={{ color: '#10b981', fontSize: 18 }} />
                        ) : isThisTeamScoring ? (
                          <EditOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
                        ) : (
                          <Badge status="processing" color="#cbd5e1" />
                        )}
                      </div>
                      <Text
                        type="secondary"
                        style={{ fontSize: 13, display: 'block', marginTop: 4 }}
                      >
                        Leader: {team.leader}
                      </Text>

                      <div style={{ marginTop: 8 }}>
                        {isScored ? (
                          <Tag
                            color="success"
                            style={{
                              margin: 0,
                              fontWeight: 600,
                              border: 'none',
                              background: '#d1fae5',
                              color: '#047857',
                            }}
                          >
                            Đã hoàn thành
                          </Tag>
                        ) : isThisTeamScoring ? (
                          <Tag
                            color="warning"
                            style={{
                              margin: 0,
                              fontWeight: 600,
                              border: 'none',
                              background: '#fef3c7',
                              color: '#d97706',
                            }}
                          >
                            Đang chấm...
                          </Tag>
                        ) : (
                          <Tag color="default" style={{ margin: 0 }}>
                            Chờ chấm
                          </Tag>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
            </Card>

            {/* Card Biểu đồ Phân bố điểm (RBL Variance Chart) */}
            <Card
              title={<span style={{ fontWeight: 600, fontSize: 14 }}>Phân bố điểm (RBL Variance)</span>}
              style={{ borderRadius: 16 }}
            >
              <div style={{ height: 160, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getChartData()}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#8c8c8c' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#8c8c8c' }}
                    />
                    <RechartsTooltip
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{
                        borderRadius: 8,
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {getChartData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.count > 0 ? '#1677ff' : '#e2e8f0'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </Col>

        {/* CỘT PHẢI: GIAO DIỆN CHẤM ĐIỂM (FORM) */}
        <Col xs={24} lg={17}>
          <AnimatePresence mode="wait">
            {selectedTeam ? (
              <motion.div
                key={selectedTeam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card style={{ borderRadius: 16, minHeight: 'calc(100vh - 120px)' }}>
                  
                  {/* Header Form */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 24,
                      padding: '20px 24px',
                      background: '#f8fafc',
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div>
                        <Text
                          type="secondary"
                          style={{
                            textTransform: 'uppercase',
                            fontSize: 12,
                            fontWeight: 600,
                            letterSpacing: 1,
                          }}
                        >
                          Đang chấm điểm cho
                        </Text>
                        <Title level={2} style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>
                          {selectedTeam.name}
                        </Title>
                      </div>

                      {/* Nút Xem bài nộp (PDF) */}
                      <Button
                        type="primary"
                        ghost
                        icon={<FilePdfOutlined />}
                        onClick={handleViewSlide}
                        disabled={!selectedTeam}
                        style={{ height: 40, borderRadius: 8, fontWeight: 600 }}
                      >
                        Xem bài nộp (PDF)
                      </Button>
                    </div>

                    <div
                      style={{
                        textAlign: 'right',
                        background: '#fff',
                        padding: '12px 24px',
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                      }}
                    >
                      <Text
                        type="secondary"
                        style={{ display: 'block', fontSize: 12, fontWeight: 600 }}
                      >
                        TỔNG ĐIỂM (PREVIEW)
                      </Text>
                      <Title
                        level={1}
                        style={{ margin: 0, color: '#f43f5e', fontWeight: 800, lineHeight: 1 }}
                      >
                        {calculateTotalScore()}
                      </Title>
                    </div>
                  </div>

                  {/* Vùng Render Tiêu chí */}
                  {criteria.length === 0 && (
                    <Empty
                      description="Chưa có tiêu chí chấm điểm."
                      style={{ margin: '60px 0' }}
                    />
                  )}

                  {criteria.map((c, index) => {
                    const currentVal = currentScores[c.id] || 0;
                    const componentScore = (currentVal * (c.weight || 0)).toFixed(2);
                    const maxPoint = c.maxScore || c.max_score || 10;
                    const weightPercent = ((c.weight || 0) * 100).toFixed(0);

                    return (
                      <div
                        key={c.id}
                        style={{
                          marginBottom: 24,
                          padding: '24px',
                          background: '#fff',
                          borderRadius: 16,
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        }}
                      >
                        <Row align="middle" justify="space-between" style={{ marginBottom: 16 }}>
                          <Col span={16}>
                            <Space align="center" size="middle">
                              <Text strong style={{ fontSize: 18, color: '#1e293b' }}>
                                {index + 1}. {c.name}
                              </Text>
                              <Tag
                                color={getTypeColor(c.type)}
                                style={{ borderRadius: 4, fontWeight: 600 }}
                              >
                                {c.type}
                              </Tag>
                            </Space>
                            <Paragraph
                              type="secondary"
                              style={{ marginTop: 8, marginBottom: 0, fontSize: 14, lineHeight: 1.6 }}
                            >
                              {c.description}
                            </Paragraph>
                          </Col>

                          <Col span={8} style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <Space>
                                <InputNumber
                                  min={0}
                                  max={maxPoint}
                                  value={currentVal}
                                  onChange={(val) => handleScoreChange(c.id, val)}
                                  style={{
                                    width: 80,
                                    fontSize: 16,
                                    fontWeight: 600,
                                    borderRadius: 8,
                                  }}
                                  size="large"
                                  disabled={isFormLocked} // Khóa ô nhập nếu đã chấm hoặc chỉ được xem
                                />
                                <Text type="secondary" style={{ fontSize: 16, fontWeight: 500 }}>
                                  / {maxPoint}
                                </Text>
                              </Space>
                              <Text style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
                                Trọng số: <strong>{weightPercent}%</strong> (Quy đổi:{' '}
                                <strong style={{ color: '#1677ff' }}>{componentScore} đ</strong>)
                              </Text>
                            </div>
                          </Col>
                        </Row>

                        <Slider
                          min={0}
                          max={maxPoint}
                          value={currentVal}
                          onChange={(val) => handleScoreChange(c.id, val)}
                          marks={{ 0: '0', [maxPoint]: maxPoint.toString() }}
                          tooltip={{ formatter: (val) => `${val} Điểm` }}
                          trackStyle={{ backgroundColor: '#1677ff', height: 6 }}
                          railStyle={{ height: 6 }}
                          handleStyle={{ height: 18, width: 18, marginTop: -6 }}
                          disabled={isFormLocked} // Khóa thanh kéo
                        />
                      </div>
                    );
                  })}

                  <Divider />
                  
                  {/* Nhận xét chuyên môn */}
                  <Title level={5} style={{ color: '#334155' }}>
                    Nhận xét chuyên môn (Feedback)
                  </Title>
                  <TextArea
                    rows={4}
                    placeholder="Nhập nhận xét chi tiết cho đội..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    style={{ borderRadius: 12, padding: 16, fontSize: 15 }}
                    disabled={isFormLocked}
                  />

                  {/* CHỈ HIỂN THỊ NÚT LƯU KHI CHƯA KHÓA FORM */}
                  {!isFormLocked && (
                    <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
                      <Space size="middle">
                        <Button size="large" style={{ borderRadius: 8, fontWeight: 600 }}>
                          Lưu Nháp
                        </Button>
                        <Button
                          type="primary"
                          size="large"
                          icon={<SaveOutlined />}
                          loading={isSubmitting}
                          onClick={submitFinalScore}
                          style={{
                            background: '#10b981',
                            borderColor: '#10b981',
                            width: 160,
                            borderRadius: 8,
                            fontWeight: 600,
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          Chốt Điểm
                        </Button>
                      </Space>
                    </div>
                  )}
                </Card>
              </motion.div>
            ) : (
              <Card
                style={{
                  borderRadius: 16,
                  height: 'calc(100vh - 120px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#fff',
                }}
              >
                <Empty description="Vui lòng chọn một đội từ danh sách bên trái để bắt đầu chấm thi." />
              </Card>
            )}
          </AnimatePresence>
        </Col>
      </Row>

      {/* ========================================== */}
      {/* MODAL HIỂN THỊ BÀI NỘP PDF                   */}
      {/* ========================================== */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
            <span>Bài nộp của đội: {selectedTeam?.name}</span>
          </div>
        }
        open={isSlideModalVisible}
        onCancel={handleCloseSlideModal}
        width={1000}
        style={{ top: 20 }}
        footer={[
          <Button key="close" onClick={handleCloseSlideModal}>
            Đóng
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            disabled={!slideBlobUrl}
            onClick={() => {
              const link = document.createElement('a');
              link.href = slideBlobUrl;
              link.download = `Bai_Nop_${selectedTeam?.name}.pdf`;
              link.click();
            }}
          >
            Tải xuống máy
          </Button>,
        ]}
      >
        <div
          style={{
            height: '75vh',
            width: '100%',
            position: 'relative',
            background: '#f0f2f5',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {isLoadingSlide ? (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <Spin size="large" />
              <div style={{ marginTop: 16, color: '#8c8c8c' }}>
                Đang tải bài nộp mã hóa từ hệ thống...
              </div>
            </div>
          ) : slideBlobUrl ? (
            <iframe
              src={`${slideBlobUrl}#toolbar=0`}
              title="PDF Viewer"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#ff4d4f',
              }}
            >
              Không thể tải file PDF. Đội này có thể chưa nộp hoặc định dạng không hỗ trợ.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default LiveScoringPage;