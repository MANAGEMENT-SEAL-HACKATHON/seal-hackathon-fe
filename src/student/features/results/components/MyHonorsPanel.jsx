import { Card, List, Typography, Space, Button, Empty, Tag, message, theme } from 'antd';
import { Award, Download, FileText, Star } from 'lucide-react';
import { studentPortalService } from '../../portal/services/studentPortal.service';

const { Text, Title } = Typography;

const MyHonorsPanel = ({ prizes, certificates }) => {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';
  
  const handleDownload = async (cert) => {
    const certId = cert.id ?? cert.certificateId ?? cert.certificate_id;
    const url = cert.downloadUrl ?? cert.download_url;
    if (certId) {
      try {
        const blob = await studentPortalService.downloadCertificate(certId, true);
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `certificate-${certId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(blobUrl);
        return;
      } catch {
        message.error('Không thể tải chứng nhận điện tử vào lúc này.');
      }
    }
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KHỐI GIẢI THƯỞNG */}
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

      {/* KHỐI CHỨNG NHẬN */}
      <Card 
        style={{ 
          background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#fff', 
          border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.4)'}`, 
          borderRadius: 24,
          boxShadow: '0 12px 32px rgba(0,0,0,0.04)'
        }}
        styles={{ body: { padding: 24 } }}
      >
        <Space align="center" style={{ marginBottom: 20 }}>
          <div style={{ padding: 10, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: 14, display: 'flex', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
            <FileText size={22} color="#fff" />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, fontWeight: 800, color: token.colorTextHeading }}>Giấy Chứng Nhận Điện Tử</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>Tải về bản định dạng PDF hợp lệ từ hệ thống Ban Tổ Chức</Text>
          </div>
        </Space>

        {certificates.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', background: isDark ? 'rgba(15, 23, 42, 0.4)' : '#f0fdf4', borderRadius: 18 }}>
            <Empty description={<Text style={{ color: token.colorTextSecondary, fontWeight: 600 }}>Chưa có chứng nhận điện tử nào được cấp phát cho tài khoản của bạn.</Text>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={certificates}
            renderItem={cert => (
              <List.Item
                style={{ 
                  background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc', 
                  padding: '18px 24px', 
                  borderRadius: 18, 
                  marginBottom: 12, 
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`, 
                  boxShadow: '0 4px 16px rgba(0,0,0,0.02)' 
                }}
                actions={[
                  <Button 
                    type="primary" 
                    icon={<Download size={16} />} 
                    onClick={() => handleDownload(cert)}
                    disabled={!(cert.downloadUrl ?? cert.download_url ?? cert.id ?? cert.certificateId)}
                    style={{ 
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                      borderColor: 'transparent', 
                      borderRadius: 12, 
                      fontWeight: 800,
                      height: 40,
                      padding: '0 20px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    Tải PDF
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={<span style={{ fontWeight: 800, fontSize: 16, color: token.colorTextHeading }}>{cert.hackathonName || 'Giấy chứng nhận Hackathon'}</span>}
                  description={
                    <Text type="secondary" style={{ fontWeight: 500, display: 'block', marginTop: 4 }}>
                      Cấp ngày: {cert.issuedAt ?? cert.issued_at ? new Date(cert.issuedAt ?? cert.issued_at).toLocaleDateString('vi-VN') : 'Đang cập nhật'}
                      {!(cert.downloadUrl ?? cert.download_url) ? ' · Chưa sẵn sàng tải xuống' : ''}
                    </Text>
                  }
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
