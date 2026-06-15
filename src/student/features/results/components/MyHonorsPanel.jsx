import React from 'react';
import { Card, List, Typography, Space, Button, Empty, Tag } from 'antd';
import { Award, Download, FileText, Star } from 'lucide-react';

const { Text, Title } = Typography;

const MyHonorsPanel = ({ prizes, certificates, loading }) => {
  
  const handleDownload = (url) => {
    window.open(url, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KHỐI GIẢI THƯỞNG */}
      <Card 
        style={{ 
          background: 'linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%)', 
          border: '1px solid #ffe58f', 
          borderRadius: 16,
          boxShadow: '0 4px 16px rgba(250, 173, 20, 0.15)'
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space align="center" style={{ marginBottom: 16 }}>
          <div style={{ padding: 8, background: '#faad14', borderRadius: 12, display: 'flex' }}>
            <Award size={20} color="#fff" />
          </div>
          <Title level={4} style={{ margin: 0, color: '#ad6800' }}>Giải thưởng của bạn</Title>
        </Space>

        {prizes.length === 0 ? (
          <Empty description={<span style={{ color: '#d48806' }}>Bạn chưa đạt giải thưởng nào.</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            grid={{ gutter: 16, column: 1 }}
            dataSource={prizes}
            renderItem={item => (
              <List.Item style={{ marginBottom: 12 }}>
                <Card 
                  style={{ background: 'rgba(255, 255, 255, 0.8)', border: 'none', borderRadius: 12, backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                  bodyStyle={{ padding: '16px 20px' }}
                >
                  <Space direction="vertical" size={6}>
                    <Tag color="gold" style={{ border: 'none', background: '#fffbe6', color: '#faad14', fontWeight: 600, padding: '2px 10px', borderRadius: 12 }}>
                      <Star size={12} style={{ marginRight: 4, position: 'relative', top: 1 }} /> 
                      Hạng {item.rank}
                    </Tag>
                    <Text strong style={{ fontSize: 16, color: '#1f1f1f' }}>{item.prizeName}</Text>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* KHỐI CHỨNG NHẬN */}
      <Card 
        style={{ 
          background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)', 
          border: '1px solid #b7eb8f', 
          borderRadius: 16,
          boxShadow: '0 4px 16px rgba(82, 196, 26, 0.1)'
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space align="center" style={{ marginBottom: 20 }}>
          <div style={{ padding: 8, background: '#52c41a', borderRadius: 12, display: 'flex' }}>
            <FileText size={20} color="#fff" />
          </div>
          <h4 style={{ margin: 0, color: '#237804', fontSize: 18, fontWeight: 600 }}>Giấy Chứng Nhận</h4>
        </Space>

        {certificates.length === 0 ? (
          <Empty description={<span style={{ color: '#5b8c00' }}>Chưa có chứng nhận nào được cấp.</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={certificates}
            renderItem={cert => (
              <List.Item
                style={{ background: 'rgba(255, 255, 255, 0.8)', padding: '16px 20px', borderRadius: 12, marginBottom: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                actions={[
                  <Button 
                    type="primary" 
                    icon={<Download size={16} />} 
                    onClick={() => handleDownload(cert.downloadUrl)}
                    style={{ background: '#52c41a', borderColor: '#52c41a', borderRadius: 8, fontWeight: 600 }}
                  >
                    Tải PDF
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={<span style={{ color: '#1f1f1f', fontWeight: 600 }}>{cert.hackathonName}</span>}
                  description={<span style={{ color: '#595959' }}>Cấp ngày: {new Date(cert.issuedAt).toLocaleDateString('vi-VN')}</span>}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default MyHonorsPanel;
