import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Row, Col, Typography, Button, Spin, Layout, Space, Tag, Avatar } from 'antd';
import { 
  ArrowLeftOutlined, TrophyOutlined, AppstoreOutlined, CrownOutlined, UserOutlined
} from '@ant-design/icons';
import { useLiveScoringV2 } from '../hooks/useLiveScoringV2';

import JudgeSidebarQueue from '../components/JudgeSidebarQueue';
import JudgeScoringWorkspace from '../components/JudgeScoringWorkspace';
import JudgeTimerAndControls from '../components/JudgeTimerAndControls';
import JudgeScoringChecklist from '../components/JudgeScoringChecklist';
import LiveRecordIndicator from '../../../shared/components/ui/LiveRecordIndicator';

const { Title, Text } = Typography;
const { Header, Content } = Layout;

// ==========================================
// CẤU HÌNH CSS ĐỂ XỬ LÝ THANH CUỘN (SCROLL)
// ==========================================
// 1. Khoảng cách an toàn tính từ mép trên trình duyệt
const STICKY_TOP = 104;

// 2. Style cho Cột Trái (Danh sách đội)
const leftColumnStyle = {
  position: 'sticky',
  top: STICKY_TOP,
  alignSelf: 'flex-start',
  maxHeight: `calc(100vh - ${STICKY_TOP + 32}px)`,
  overflowY: 'auto',
  paddingRight: 4, 
};

// 3. Style cho Cột Phải (Bao bọc cả Timer và Checklist)
const rightColumnStyle = {
  position: 'sticky',
  top: STICKY_TOP,
  alignSelf: 'flex-start',
  maxHeight: `calc(100vh - ${STICKY_TOP + 32}px)`,
  display: 'flex',
  flexDirection: 'column',
  // [MẤU CHỐT] Thêm dòng này để Cột Phải sinh ra thanh cuộn riêng khi màn hình nhỏ
  overflowY: 'auto', 
  paddingRight: 4,
};

// 4. Style cho Timer
const timerPinnedStyle = {
  flexShrink: 0,
  marginBottom: 16,
};

// 5. Style cho Checklist
const checklistScrollStyle = {
  flexShrink: 0, 
};

const LiveScoringPage = () => {
  const navigate = useNavigate();
  const { assignmentId } = useParams();
  const {
    roundId,
    trackId,
    isFinal,
    assignmentType,
    isCalibration,
    calibrationSessionId,
    sampleSubmissionId,
  } = useLocation().state || {};

  const scoringLogic = useLiveScoringV2(assignmentId, roundId, trackId, isFinal, assignmentType, {
    isCalibration: Boolean(isCalibration),
    calibrationSessionId,
    sampleSubmissionId,
  });

  if (scoringLogic.isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f8fafc' }}>
        <Spin size="large" />
        <Text type="secondary" style={{ marginTop: 16, fontWeight: 500 }}>Đang thiết lập kết nối mã hóa vào phòng chấm thi...</Text>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f4f7fe' }}>
      
      {/* HEADER FIXED */}
      <Header style={{ 
        background: '#ffffff', 
        padding: '0 24px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        borderBottom: '1px solid #e2e8f0', 
        height: 72,
        maxHeight: 72,
        lineHeight: 1,
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100,
      }}>
        {/* KHU VỰC BÊN TRÁI: Nút Back + Tiêu đề */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, overflow: 'hidden' }}>
          <Button 
            type="text" icon={<ArrowLeftOutlined style={{ fontSize: 16, color: '#475569' }} />} 
            onClick={() => navigate(-1)} 
            style={{ width: 40, height: 40, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', flexShrink: 0 }} 
          />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
            <Space align="center" size="small">
              <Title level={4} style={{ margin: 0, lineHeight: 1, color: '#0f172a', fontWeight: 800, whiteSpace: 'nowrap' }}>
                Phòng chấm thi trực tiếp
              </Title>
              <Tag
                style={{
                  borderRadius: 6,
                  fontWeight: 800,
                  margin: 0,
                  border: 'none',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  padding: '2px 10px',
                  fontSize: 11,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <LiveRecordIndicator size={8} />
                Đang diễn ra
              </Tag>
            </Space>
            <Space size="small" style={{ lineHeight: 1 }}>
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                {isFinal ? <><TrophyOutlined style={{color: '#f59e0b'}}/> Chung Kết</> : <><AppstoreOutlined style={{color: '#3b82f6'}}/> Sơ Loại</>}
              </Text>
              <Text type="secondary" style={{ fontSize: 12, color: '#cbd5e1' }}>|</Text>
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>
                Mã phân công: <strong style={{color: '#334155'}}>#{assignmentId}</strong>
              </Text>
            </Space>
          </div>
        </div>

        {/* KHU VỰC BÊN PHẢI: Tag Vai Trò */}
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: 12, background: scoringLogic.isController ? '#fffbeb' : '#eff6ff', 
          padding: '8px 16px', borderRadius: 12, border: `1px solid ${scoringLogic.isController ? '#fde68a' : '#bfdbfe'}`,
          flexShrink: 0
        }}>
          <Avatar 
            size={36} 
            style={{ background: scoringLogic.isController ? '#f59e0b' : '#3b82f6' }} 
            icon={scoringLogic.isController ? <CrownOutlined /> : <UserOutlined />} 
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text style={{ fontSize: 10, lineHeight: 1, fontWeight: 800, color: scoringLogic.isController ? '#d97706' : '#2563eb', textTransform: 'uppercase' }}>Vai Trò Hội Đồng</Text>
            <Text strong style={{ fontSize: 14, lineHeight: 1, color: scoringLogic.isController ? '#92400e' : '#1e40af' }}>
              {scoringLogic.isController ? 'Điều phối Timer' : 'Giám Khảo'}
            </Text>
          </div>
        </div>
      </Header>

      <Content style={{ padding: '32px', maxWidth: 1600, margin: '0 auto', width: '100%' }}>
        <Row gutter={32} align="stretch">
          
          {/* CỘT 1: HÀNG ĐỢI (Danh sách đội) */}
          <Col xs={24} lg={6} style={leftColumnStyle}>
             <JudgeSidebarQueue
               queue={scoringLogic.trackQueue}
               activeSlot={scoringLogic.presentingSlot || scoringLogic.activeSlot}
               selectedSubmissionId={scoringLogic.selectedSubmissionId}
               myScores={scoringLogic.myScoredSubmissions}
             />
          </Col>

          {/* CỘT 2: KHÔNG GIAN CHẤM ĐIỂM (WORKSPACE) */}
          <Col xs={24} lg={12}>
             <div style={{ borderRadius: 20, paddingBottom: 24 }}>
               <JudgeScoringWorkspace logic={scoringLogic} />
             </div>
          </Col>

          {/* CỘT 3: ĐỒNG HỒ VÀ CHECKLIST */}
          <Col xs={24} lg={6} style={rightColumnStyle}>
            <div style={timerPinnedStyle}>
              <JudgeTimerAndControls logic={scoringLogic} isFinal={isFinal} />
            </div>
            <div style={checklistScrollStyle}>
              <JudgeScoringChecklist
                criteria={scoringLogic.criteria}
                currentScores={scoringLogic.currentScores}
                hasScoredCurrentTeam={scoringLogic.hasScoredCurrentTeam}
                trackQueue={scoringLogic.trackQueue}
                myScoredSubmissions={scoringLogic.myScoredSubmissions}
                isFinal={isFinal}
                isCalibration={scoringLogic.isCalibration}
                localTimerPhase={scoringLogic.localTimerPhase}
                canSubmitFinalScore={scoringLogic.canSubmitFinalScore}
              />
            </div>
          </Col>
          
        </Row>
      </Content>
    </Layout>
  );
};

export default LiveScoringPage;