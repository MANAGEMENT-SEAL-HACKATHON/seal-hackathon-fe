import { useMemo, useState } from "react";
import { Card, Empty, Segmented, Skeleton, Space, Table, Tag, Typography, theme, Row, Col } from "antd";
import { TrophyOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";

const { Text, Title } = Typography;

const PublicScoreboard = ({ scoreboard, isLoading }) => {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';
  const [selectedGroup, setSelectedGroup] = useState("all");
  
  const groups = useMemo(
    () => [...new Set((scoreboard?.items || []).map((item) => item.groupLabel))],
    [scoreboard?.items],
  );
  const items = selectedGroup === "all"
    ? (scoreboard?.items || [])
    : (scoreboard?.items || []).filter((item) => item.groupLabel === selectedGroup);

  const top1 = items.find((item) => item.rank === 1) || items[0];
  const top2 = items.find((item) => item.rank === 2) || items[1];
  const top3 = items.find((item) => item.rank === 3) || items[2];

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

  if (isLoading) return <Skeleton active paragraph={{ rows: 9 }} />;
  if (!scoreboard?.items?.length) {
    return (
      <Card style={{ textAlign: "center", padding: "60px 12px", borderRadius: 24, background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}` }}>
        <Empty
          image={<TrophyOutlined style={{ color: "#faad14", fontSize: 56 }} />}
          description={<span style={{ fontSize: 16, fontWeight: 700 }}>Kết quả bảng điểm của vòng này đang được Ban giám khảo tổng hợp hoặc chưa được công bố.</span>}
        />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <Segmented
        block
        size="large"
        options={[{ label: "Tất cả bảng", value: "all" }, ...groups.map((group) => ({ label: group, value: group }))]}
        value={selectedGroup}
        onChange={setSelectedGroup}
        style={{
          background: isDark ? 'rgba(30, 41, 59, 0.8)' : '#f1f5f9',
          padding: 6,
          borderRadius: 16,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1'}`,
        }}
      />

      {/* PODIUM SHOWCASE FOR THIS ROUND */}
      {items.length >= 1 && (
        <Row gutter={[20, 20]} align="bottom" justify="center">
          {/* TOP 2 */}
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
                  }}
                  styles={{ body: { padding: '24px 20px' } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <Tag style={{ background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)', color: '#fff', fontWeight: 800, padding: '4px 14px', borderRadius: 16, border: 'none', fontSize: 13 }}>
                      🥈 Á QUÂN VÒNG THI
                    </Tag>
                  </div>
                  <Title level={4} style={{ margin: '8px 0 4px', fontWeight: 900, color: token.colorTextHeading, fontSize: 18 }}>
                    {top2.teamName}
                  </Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 14, fontWeight: 600 }}>
                    {top2.groupLabel || 'Bảng đấu'}
                  </Text>
                  <div style={{ fontSize: 30, fontWeight: 900, color: isDark ? '#cbd5e1' : '#475569' }}>
                    {(Number(top2.score) || 0).toFixed(2)}
                  </div>
                  <Text style={{ fontSize: 12, color: token.colorTextSecondary, textTransform: 'uppercase', fontWeight: 700 }}>Điểm Vòng Thi</Text>
                </Card>
              </motion.div>
            </Col>
          )}

          {/* TOP 1 - ELEVATED */}
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
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                    <Tag style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff', fontWeight: 900, padding: '6px 18px', borderRadius: 20, border: 'none', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)' }}>
                      <Crown size={16} /> 🥇 NHẤT VÒNG THI
                    </Tag>
                  </div>
                  <Title level={3} style={{ margin: '8px 0 4px', fontWeight: 900, color: token.colorTextHeading, fontSize: 22 }}>
                    {top1.teamName}
                  </Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontWeight: 700, fontSize: 15, color: '#d97706' }}>
                    {top1.groupLabel || 'Bảng đấu'}
                  </Text>
                  <div style={{ fontSize: 38, fontWeight: 900, color: '#d97706', textShadow: '0 2px 10px rgba(217, 119, 6, 0.2)' }}>
                    {(Number(top1.score) || 0).toFixed(2)}
                  </div>
                  <Text style={{ fontSize: 13, color: token.colorTextSecondary, textTransform: 'uppercase', fontWeight: 800 }}>Điểm Vòng Thi</Text>
                </Card>
              </motion.div>
            </Col>
          )}

          {/* TOP 3 */}
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
                  }}
                  styles={{ body: { padding: '24px 20px' } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <Tag style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#fff', fontWeight: 800, padding: '4px 14px', borderRadius: 16, border: 'none', fontSize: 13 }}>
                      🥉 QUÝ QUÂN VÒNG THI
                    </Tag>
                  </div>
                  <Title level={4} style={{ margin: '8px 0 4px', fontWeight: 900, color: token.colorTextHeading, fontSize: 18 }}>
                    {top3.teamName}
                  </Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 14, fontWeight: 600 }}>
                    {top3.groupLabel || 'Bảng đấu'}
                  </Text>
                  <div style={{ fontSize: 30, fontWeight: 900, color: isDark ? '#fdba74' : '#b45309' }}>
                    {(Number(top3.score) || 0).toFixed(2)}
                  </div>
                  <Text style={{ fontSize: 12, color: token.colorTextSecondary, textTransform: 'uppercase', fontWeight: 700 }}>Điểm Vòng Thi</Text>
                </Card>
              </motion.div>
            </Col>
          )}
        </Row>
      )}

      <Card 
        title={<span style={{ fontWeight: 800, fontSize: 18, color: token.colorTextHeading }}>📊 Bảng Xếp Hạng Vòng Thi</span>} 
        style={{ 
          borderRadius: 24, 
          background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#fff', 
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
          boxShadow: '0 12px 32px rgba(0,0,0,0.04)'
        }}
        styles={{ body: { padding: 24 } }}
      >
        <Table
          rowKey="key"
          pagination={false}
          dataSource={items}
          scroll={{ x: 650 }}
          rowClassName={(record) => {
            if (record.rank === 1) return 'rank-1-row';
            if (record.rank === 2) return 'rank-2-row';
            if (record.rank === 3) return 'rank-3-row';
            return 'standard-row';
          }}
          columns={[
            { 
              title: "Hạng", 
              dataIndex: "rank", 
              width: 100, 
              align: "center", 
              render: (value) => {
                const style = getMedalStyle(value);
                return (
                  <div style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontWeight: 900, fontSize: value <= 3 ? 16 : 15, ...style }}>
                    {value === 1 ? '🥇' : value === 2 ? '🥈' : value === 3 ? '🥉' : `#${value}`}
                  </div>
                );
              } 
            },
            { 
              title: "Đội thi", 
              dataIndex: "teamName", 
              render: (value, record) => (
                <Space size={10}>
                  <Text strong style={{ fontSize: 17, color: token.colorTextHeading, fontWeight: record.rank === 1 ? 900 : 700 }}>{value}</Text>
                  {record.rank === 1 && <Tag color="gold" style={{ borderRadius: 10, padding: '2px 8px', fontWeight: 800, border: 'none', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff' }}>👑 Top 1</Tag>}
                </Space>
              ) 
            },
            { title: "Bảng đấu", dataIndex: "groupLabel", render: (value) => <Tag color="blue" style={{ fontWeight: 700, padding: '4px 12px', borderRadius: 12, fontSize: 13 }}>{value}</Tag> },
            { 
              title: "Điểm số", 
              dataIndex: "score", 
              align: "right", 
              render: (value, record) => {
                const num = Number(value) || 0;
                const rank = record.rank;
                let pillStyle = { background: '#00529C', color: '#fff', padding: '4px 14px', borderRadius: 14, fontSize: 15, fontWeight: 700 };
                if (rank === 1) pillStyle = { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff', padding: '6px 18px', borderRadius: 16, fontSize: 17, fontWeight: 900, boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)' };
                else if (rank === 2) pillStyle = { background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)', color: '#fff', padding: '5px 16px', borderRadius: 16, fontSize: 16, fontWeight: 800 };
                else if (rank === 3) pillStyle = { background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#fff', padding: '5px 16px', borderRadius: 16, fontSize: 16, fontWeight: 800 };
                return <span style={{ display: 'inline-block', ...pillStyle }}>{num.toFixed(2)}</span>;
              } 
            },
            { 
              title: "Kết quả", 
              dataIndex: "resultLabel", 
              align: "center",
              render: (value, record) => {
                const label = record.resultLabel || (record.isAdvanced ? "Đi tiếp" : "Hoàn thành");
                if (label === "Đi tiếp") {
                  return <Tag color="success" style={{ fontWeight: 800, padding: '6px 16px', borderRadius: 14, fontSize: 13 }}>🟢 Đi tiếp</Tag>;
                }
                if (label === "Dừng bước") {
                  return <Tag color="error" style={{ fontWeight: 800, padding: '6px 16px', borderRadius: 14, fontSize: 13 }}>🔴 Dừng bước</Tag>;
                }
                return <Tag color="processing" style={{ fontWeight: 700, padding: '6px 16px', borderRadius: 14, fontSize: 13 }}>🔵 Hoàn thành</Tag>;
              } 
            },
          ]}
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
          .rank-1-row { background: ${isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb'} !important; border-left: 4px solid #f59e0b !important; }
          .rank-2-row { background: ${isDark ? 'rgba(148, 163, 184, 0.08)' : '#f8fafc'} !important; border-left: 4px solid #94a3b8 !important; }
          .rank-3-row { background: ${isDark ? 'rgba(217, 119, 6, 0.08)' : '#fff7ed'} !important; border-left: 4px solid #d97706 !important; }
          .standard-row:hover { background: ${isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'} !important; }
          .ant-table-tbody > tr > td { 
            border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'} !important; 
            padding: 18px 16px !important;
          }
          .ant-table-cell::before { display: none !important; }
        `}</style>
      </Card>
    </Space>
  );
};

export default PublicScoreboard;
