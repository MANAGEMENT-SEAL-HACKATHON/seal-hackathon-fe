import { Table, Typography, Tag, Card, Empty, theme, Space, Row, Col } from 'antd';
import { Medal, Layers, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

const { Text, Title } = Typography;

const StudentFinalLeaderboard = ({ data, loading }) => {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';

  if (!loading && (!data || data.length === 0)) {
    return (
      <Card style={{ borderRadius: 24, padding: '60px 0', textAlign: 'center', background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc' }}>
        <Empty description={<span style={{ fontSize: 16, fontWeight: 700 }}>Chưa có dữ liệu xếp hạng chung cuộc</span>} />
      </Card>
    );
  }

  // Top 3 Winners for the Podium Showcase
  const top1 = data?.find((item) => item.rank === 1) || data?.[0];
  const top2 = data?.find((item) => item.rank === 2) || data?.[1];
  const top3 = data?.find((item) => item.rank === 3) || data?.[2];

  const getMedalStyle = (rank) => {
    switch (rank) {
      case 1:
        return {
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
          border: '2px solid #fef08a',
        };
      case 2:
        return {
          background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(148, 163, 184, 0.3)',
          border: '2px solid #f1f5f9',
        };
      case 3:
        return {
          background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
          border: '2px solid #ffedd5',
        };
      default:
        return {
          background: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
          color: token.colorTextSecondary,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
        };
    }
  };

  const columns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 110,
      align: 'center',
      render: (rank) => {
        const style = getMedalStyle(rank);
        return (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              fontWeight: 900,
              fontSize: rank <= 3 ? 16 : 15,
              ...style,
            }}
          >
            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
          </div>
        );
      },
    },
    {
      title: 'Đội thi',
      dataIndex: 'teamName',
      key: 'teamName',
      render: (text, record) => (
        <Space size={10}>
          <Text strong style={{ fontSize: 17, color: token.colorTextHeading, fontWeight: record.rank === 1 ? 900 : 700 }}>
            {text}
          </Text>
          {record.rank === 1 && (
            <Tag color="gold" style={{ borderRadius: 10, padding: '2px 8px', fontWeight: 800, border: 'none', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff' }}>
              👑 Quán Quân
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Bảng thi đấu (Track)',
      dataIndex: 'trackName',
      key: 'trackName',
      render: (text) => (
        <Tag color="orange" style={{ fontWeight: 700, padding: '4px 12px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <Layers size={14} /> {text || '—'}
        </Tag>
      ),
    },
    {
      title: 'Điểm tổng (Final)',
      dataIndex: 'score',
      key: 'score',
      align: 'right',
      render: (scoreVal, record) => {
        const num = Number(scoreVal !== undefined ? scoreVal : record.totalScore) || 0;
        const rank = record.rank;
        let pillStyle = {
          background: '#00529C',
          color: '#fff',
          padding: '4px 14px',
          borderRadius: 14,
          fontSize: 15,
          fontWeight: 700,
        };
        if (rank === 1) {
          pillStyle = {
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#fff',
            padding: '6px 18px',
            borderRadius: 16,
            fontSize: 17,
            fontWeight: 900,
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
          };
        } else if (rank === 2) {
          pillStyle = {
            background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
            color: '#fff',
            padding: '5px 16px',
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 800,
          };
        } else if (rank === 3) {
          pillStyle = {
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            color: '#fff',
            padding: '5px 16px',
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 800,
          };
        }

        return <span style={{ display: 'inline-block', ...pillStyle }}>{num.toFixed(2)}</span>;
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* 1. ESPORTS CHAMPION PODIUM SHOWCASE (TOP 3) */}
      {data && data.length >= 1 && (
        <Row gutter={[20, 20]} align="bottom" justify="center">
          {/* TOP 2 - Á QUÂN (Left) */}
          {top2 && (
            <Col xs={24} md={8} order={isDark ? 1 : 1}>
              <motion.div whileHover={{ y: -6 }}>
                <Card
                  style={{
                    borderRadius: 24,
                    background: isDark
                      ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)'
                      : 'linear-gradient(145deg, #f8fafc 0%, #ffffff 100%)',
                    border: '2px solid #94a3b8',
                    boxShadow: '0 12px 32px rgba(148, 163, 184, 0.2)',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  styles={{ body: { padding: '24px 20px' } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <Tag
                      style={{
                        background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                        color: '#fff',
                        fontWeight: 800,
                        padding: '4px 14px',
                        borderRadius: 16,
                        border: 'none',
                        fontSize: 13,
                      }}
                    >
                      🥈 Á QUÂN (TOP 2)
                    </Tag>
                  </div>
                  <Title level={4} style={{ margin: '8px 0 4px', fontWeight: 900, color: token.colorTextHeading, fontSize: 18 }}>
                    {top2.teamName}
                  </Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 14, fontWeight: 600 }}>
                    {top2.trackName || 'Track'}
                  </Text>
                  <div style={{ fontSize: 30, fontWeight: 900, color: isDark ? '#cbd5e1' : '#475569' }}>
                    {(Number(top2.score !== undefined ? top2.score : top2.totalScore) || 0).toFixed(2)}
                  </div>
                  <Text style={{ fontSize: 12, color: token.colorTextSecondary, textTransform: 'uppercase', fontWeight: 700 }}>Điểm Chung Cuộc</Text>
                </Card>
              </motion.div>
            </Col>
          )}

          {/* TOP 1 - QUÁN QUÂN (Center - Elevated!) */}
          {top1 && (
            <Col xs={24} md={8} order={isDark ? 0 : 0} style={{ zIndex: 2 }}>
              <motion.div whileHover={{ y: -8, scale: 1.02 }}>
                <Card
                  style={{
                    borderRadius: 28,
                    background: isDark
                      ? 'linear-gradient(145deg, rgba(120, 53, 15, 0.4) 0%, rgba(30, 41, 59, 0.95) 100%)'
                      : 'linear-gradient(145deg, #fffbeb 0%, #ffffff 100%)',
                    border: '3px solid #f59e0b',
                    boxShadow: '0 20px 48px rgba(245, 158, 11, 0.35)',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  styles={{ body: { padding: '32px 24px' } }}
                >
                  {/* Glowing background orb */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-30%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 180,
                      height: 180,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)',
                      opacity: 0.3,
                      filter: 'blur(30px)',
                      pointerEvents: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                    <Tag
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: '#fff',
                        fontWeight: 900,
                        padding: '6px 18px',
                        borderRadius: 20,
                        border: 'none',
                        fontSize: 14,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                      }}
                    >
                      <Crown size={16} /> 🥇 QUÁN QUÂN HACKATHON
                    </Tag>
                  </div>
                  <Title level={3} style={{ margin: '8px 0 4px', fontWeight: 900, color: token.colorTextHeading, fontSize: 22 }}>
                    {top1.teamName}
                  </Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontWeight: 700, fontSize: 15, color: '#d97706' }}>
                    {top1.trackName || 'Track'}
                  </Text>
                  <div style={{ fontSize: 38, fontWeight: 900, color: '#d97706', textShadow: '0 2px 10px rgba(217, 119, 6, 0.2)' }}>
                    {(Number(top1.score !== undefined ? top1.score : top1.totalScore) || 0).toFixed(2)}
                  </div>
                  <Text style={{ fontSize: 13, color: token.colorTextSecondary, textTransform: 'uppercase', fontWeight: 800 }}>Điểm Chung Cuộc</Text>
                </Card>
              </motion.div>
            </Col>
          )}

          {/* TOP 3 - QUÝ QUÂN (Right) */}
          {top3 && (
            <Col xs={24} md={8} order={isDark ? 2 : 2}>
              <motion.div whileHover={{ y: -6 }}>
                <Card
                  style={{
                    borderRadius: 24,
                    background: isDark
                      ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)'
                      : 'linear-gradient(145deg, #fff7ed 0%, #ffffff 100%)',
                    border: '2px solid #d97706',
                    boxShadow: '0 12px 32px rgba(217, 119, 6, 0.2)',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  styles={{ body: { padding: '24px 20px' } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <Tag
                      style={{
                        background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                        color: '#fff',
                        fontWeight: 800,
                        padding: '4px 14px',
                        borderRadius: 16,
                        border: 'none',
                        fontSize: 13,
                      }}
                    >
                      🥉 QUÝ QUÂN (TOP 3)
                    </Tag>
                  </div>
                  <Title level={4} style={{ margin: '8px 0 4px', fontWeight: 900, color: token.colorTextHeading, fontSize: 18 }}>
                    {top3.teamName}
                  </Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 14, fontWeight: 600 }}>
                    {top3.trackName || 'Track'}
                  </Text>
                  <div style={{ fontSize: 30, fontWeight: 900, color: isDark ? '#fdba74' : '#b45309' }}>
                    {(Number(top3.score !== undefined ? top3.score : top3.totalScore) || 0).toFixed(2)}
                  </div>
                  <Text style={{ fontSize: 12, color: token.colorTextSecondary, textTransform: 'uppercase', fontWeight: 700 }}>Điểm Chung Cuộc</Text>
                </Card>
              </motion.div>
            </Col>
          )}
        </Row>
      )}

      {/* 2. MAIN LEADERBOARD TABLE */}
      <Card
        style={{
          background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
          borderRadius: 24,
          boxShadow: '0 16px 36px rgba(0,0,0,0.05)',
        }}
        styles={{ body: { padding: 28 } }}
      >
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, background: isDark ? 'rgba(243, 112, 33, 0.2)' : '#fff7ed', borderRadius: 14, display: 'flex', border: '1px solid rgba(243, 112, 33, 0.3)', boxShadow: '0 4px 12px rgba(243, 112, 33, 0.15)' }}>
              <Medal size={24} color="#F37021" />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, fontWeight: 900, color: token.colorTextHeading, fontSize: 20 }}>
                Bảng Vàng Xếp Hạng Toàn Đoàn
              </Title>
              <Text type="secondary" style={{ fontSize: 14 }}>
                Danh sách xếp hạng chính thức từ điểm số chấm thi vòng Chung kết
              </Text>
            </div>
          </div>
          <Tag color="orange" style={{ padding: '6px 16px', borderRadius: 14, fontWeight: 800, fontSize: 14 }}>
            🔥 Tổng số: {data?.length || 0} Đội thi
          </Tag>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="key"
          loading={loading}
          pagination={false}
          scroll={{ x: 650 }}
          rowClassName={(record) => {
            if (record.rank === 1) return 'rank-1-row';
            if (record.rank === 2) return 'rank-2-row';
            if (record.rank === 3) return 'rank-3-row';
            return 'standard-row';
          }}
        />
        <style>{`
          .ant-table-thead > tr > th { 
            background: ${isDark ? 'rgba(15, 23, 42, 0.8)' : '#f8fafc'} !important; 
            color: ${token.colorTextSecondary} !important; 
            font-weight: 800 !important;
            font-size: 14px !important;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 18px 16px !important;
          }
          .rank-1-row { 
            background: ${isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb'} !important; 
            border-left: 4px solid #f59e0b !important;
          }
          .rank-2-row { 
            background: ${isDark ? 'rgba(148, 163, 184, 0.08)' : '#f8fafc'} !important; 
            border-left: 4px solid #94a3b8 !important;
          }
          .rank-3-row { 
            background: ${isDark ? 'rgba(217, 119, 6, 0.08)' : '#fff7ed'} !important; 
            border-left: 4px solid #d97706 !important;
          }
          .standard-row:hover {
            background: ${isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'} !important;
          }
          .ant-table-tbody > tr > td { 
            border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'} !important; 
            padding: 18px 16px !important;
          }
          .ant-table-cell::before { display: none !important; }
        `}</style>
      </Card>
    </div>
  );
};

export default StudentFinalLeaderboard;
