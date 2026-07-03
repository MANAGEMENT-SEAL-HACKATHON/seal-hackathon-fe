import { Button, Typography, Space } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const PageHeader = ({ title, subtitle, extra, backAction, onBack }) => {
  const handleBack = onBack || backAction;
  const navigate = useNavigate();

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start',
      marginBottom: 24
    }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {handleBack && (
          <Button 
            icon={<ArrowLeft size={18} />} 
            onClick={() => typeof handleBack === 'function' ? handleBack() : navigate(-1)}
            style={{ marginTop: 4 }}
          />
        )}
        <div>
          <Title level={2} style={{ margin: 0 }}>{title}</Title>
          {subtitle && <Text type="secondary">{subtitle}</Text>}
        </div>
      </div>
      <Space>{extra}</Space>
    </div>
  );
};

export default PageHeader;
