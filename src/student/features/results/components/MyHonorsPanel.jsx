import { Card, List, Typography, Space, Empty, Tag, theme } from 'antd';
import { Award, Star } from 'lucide-react';

const { Text, Title } = Typography;

const MyHonorsPanel = ({ prizes }) => {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card 
        style={{ 
          background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#fff', 
          border: `1px solid ${isDark ? 'rgba(234, 179, 8, 0.25)' : 'rgba(234, 179, 8, 0.4)'}`, 
          borderRadius: 24,
          boxShadow: '0 12px 32px rgba(0,0,0,0.04)'
        }}
        styles={{ body: { padding: 24 } }}
      >
        <Space align="center" style={{ marginBottom: 20 }}>
          <div style={{ padding: 10, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: 14, display: 'flex', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>
            <Award size={22} color="#fff" />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, fontWeight: 800, color: token.colorTextHeading }}>Giải Thưởng Đạt Được</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>Huy chương và danh hiệu cao quý được Ban Tổ Chức trao tặng</Text>
          </div>
        </Space>

        {prizes.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', background: isDark ? 'rgba(15, 23, 42, 0.4)' : '#fdf8f6', borderRadius: 18 }}>
            <Empty description={<Text style={{ color: token.colorTextSecondary, fontWeight: 600 }}>Bạn chưa đạt giải thưởng hoặc danh hiệu nào tại cuộc thi này.</Text>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          <List
            grid={{ gutter: 16, column: 1 }}
            dataSource={prizes}
            renderItem={item => (
              <List.Item style={{ marginBottom: 12 }}>
                <Card 
                  style={{ 
                    background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#fffbeb', 
                    border: `1px solid ${isDark ? 'rgba(234, 179, 8, 0.2)' : '#fde68a'}`, 
                    borderRadius: 18, 
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)' 
                  }}
                  styles={{ body: { padding: '18px 24px' } }}
                >
                  <Space direction="vertical" size={6}>
                    <Tag color="gold" style={{ border: 'none', fontWeight: 800, padding: '4px 12px', borderRadius: 12, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Star size={14} /> 
                      Hạng {item.rank ?? item.prizeRank ?? item.prize_rank ?? '—'}
                    </Tag>
                    <Text strong style={{ fontSize: 18, color: token.colorTextHeading, display: 'block', marginTop: 4 }}>{item.prizeName ?? item.prize_name}</Text>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default MyHonorsPanel;
