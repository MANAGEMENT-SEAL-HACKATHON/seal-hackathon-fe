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
          background: 'var(--ant-color-warning-bg)', 
          border: '1px solid var(--ant-color-warning-border)', 
          borderRadius: 16,
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space align="center" style={{ marginBottom: 16 }}>
          <div style={{ padding: 8, background: 'var(--ant-color-warning)', borderRadius: 12, display: 'flex' }}>
            <Award size={20} color="#fff" />
          </div>
          <Title level={4} style={{ margin: 0, color: 'var(--ant-color-warning-text)' }}>Giải thưởng của bạn</Title>
        </Space>

        {prizes.length === 0 ? (
          <Empty description={<Text style={{ color: 'var(--ant-color-warning)' }}>Bạn chưa đạt giải thưởng nào.</Text>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            grid={{ gutter: 16, column: 1 }}
            dataSource={prizes}
            renderItem={item => (
              <List.Item style={{ marginBottom: 12 }}>
                <Card 
                  style={{ background: 'var(--ant-color-bg-container)', border: 'none', borderRadius: 12, boxShadow: 'var(--ant-box-shadow-tertiary)' }}
                  bodyStyle={{ padding: '16px 20px' }}
                >
                  <Space direction="vertical" size={6}>
                    <Tag color="gold" style={{ border: 'none', fontWeight: 600, padding: '2px 10px', borderRadius: 12 }}>
                      <Star size={12} style={{ marginRight: 4, position: 'relative', top: 1 }} /> 
                      Hạng {item.rank}
                    </Tag>
                    <Text strong style={{ fontSize: 16 }}>{item.prizeName}</Text>
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
          background: 'var(--ant-color-success-bg)', 
          border: '1px solid var(--ant-color-success-border)', 
          borderRadius: 16,
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space align="center" style={{ marginBottom: 20 }}>
          <div style={{ padding: 8, background: 'var(--ant-color-success)', borderRadius: 12, display: 'flex' }}>
            <FileText size={20} color="#fff" />
          </div>
          <Title level={4} style={{ margin: 0, color: 'var(--ant-color-success-text)' }}>Giấy Chứng Nhận</Title>
        </Space>

        {certificates.length === 0 ? (
          <Empty description={<Text style={{ color: 'var(--ant-color-success)' }}>Chưa có chứng nhận nào được cấp.</Text>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={certificates}
            renderItem={cert => (
              <List.Item
                style={{ background: 'var(--ant-color-bg-container)', padding: '16px 20px', borderRadius: 12, marginBottom: 12, border: 'none', boxShadow: 'var(--ant-box-shadow-tertiary)' }}
                actions={[
                  <Button 
                    type="primary" 
                    icon={<Download size={16} />} 
                    onClick={() => handleDownload(cert.downloadUrl)}
                    style={{ background: 'var(--ant-color-success)', borderColor: 'var(--ant-color-success)', borderRadius: 8, fontWeight: 600 }}
                  >
                    Tải PDF
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={<span style={{ fontWeight: 600 }}>{cert.hackathonName}</span>}
                  description={<Text type="secondary">Cấp ngày: {new Date(cert.issuedAt).toLocaleDateString('vi-VN')}</Text>}
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
