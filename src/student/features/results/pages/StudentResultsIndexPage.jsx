import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Form, InputNumber, Space, Tag, Typography } from "antd";
import { ArrowRight, BarChart3, ShieldCheck, Trophy } from "lucide-react";

const { Text, Title } = Typography;

const StudentResultsIndexPage = () => {
  const navigate = useNavigate();
  const [roundId, setRoundId] = useState(null);

  const openLeaderboard = () => {
    if (roundId) navigate(`/student/results/${roundId}`);
  };

  return (
    <Space direction="vertical" size={20} style={{ width: "100%", maxWidth: 900, margin: "0 auto" }}>
      <Card
        style={{
          border: 0,
          color: "#fff",
          background: "linear-gradient(135deg, #001529 0%, #003a8c 62%, #13c2c2 100%)",
        }}
      >
        <Space direction="vertical" size={8}>
          <Tag color="gold" icon={<Trophy size={13} />}>Kết quả thi đấu</Tag>
          <Title level={2} style={{ color: "#fff", margin: 0 }}>Leaderboard Sơ loại</Title>
          <Text style={{ color: "rgba(255,255,255,.78)" }}>
            Nhập mã vòng thi do Ban tổ chức cung cấp để xem bảng xếp hạng trong Student Portal.
          </Text>
        </Space>
      </Card>

      <Alert
        showIcon
        type="info"
        message="Leaderboard chỉ mở sau khi BTC công bố"
        description="Nếu vòng chưa được công bố, hệ thống sẽ hiển thị trạng thái chờ thay vì bảng điểm."
      />

      <Card>
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          <Space align="start" size={14}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "#e6f4ff", display: "grid", placeItems: "center" }}>
              <BarChart3 size={22} color="#1677ff" />
            </div>
            <div>
              <Title level={4} style={{ margin: 0 }}>Mở bảng xếp hạng</Title>
              <Text type="secondary">Student Portal sẽ xác thực tài khoản và tải leaderboard của vòng đã chọn.</Text>
            </div>
          </Space>

          <Form layout="vertical" onFinish={openLeaderboard}>
            <Form.Item label="Round ID" required>
              <InputNumber
                min={1}
                precision={0}
                value={roundId}
                onChange={setRoundId}
                placeholder="Ví dụ: 12"
                style={{ width: "100%" }}
                size="large"
              />
            </Form.Item>
            <Button
              block
              size="large"
              type="primary"
              htmlType="submit"
              disabled={!roundId}
              icon={<ArrowRight size={17} />}
              iconPosition="end"
            >
              Xem kết quả
            </Button>
          </Form>

          <Space size={8}>
            <ShieldCheck size={16} color="#52c41a" />
            <Text type="secondary">Sử dụng API Student Portal read-only, không hiển thị dữ liệu nhạy cảm.</Text>
          </Space>
        </Space>
      </Card>
    </Space>
  );
};

export default StudentResultsIndexPage;
