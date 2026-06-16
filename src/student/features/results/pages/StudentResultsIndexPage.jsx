import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Col, Form, InputNumber, Row, Space, Tag, Typography, Select, message } from "antd";
import { ArrowRight, BarChart3, Medal, ShieldCheck, Trophy, Search, ChevronDown } from "lucide-react";
import { studentTeamService } from "../../team/services/studentTeam.service";

const { Text, Title } = Typography;

const StudentResultsIndexPage = () => {
  const navigate = useNavigate();
  const [roundId, setRoundId] = useState(null);
  const [hackathonId, setHackathonId] = useState(null);
  const [myHackathons, setMyHackathons] = useState([]);
  const [loadingHackathons, setLoadingHackathons] = useState(true);

  useEffect(() => {
    const fetchMyHackathons = async () => {
      try {
        const teams = await studentTeamService.getMyTeams();
        
        // Lọc ra các hackathon unique (trường hợp tham gia nhiều track/vòng)
        const uniqueHackathons = [];
        const map = new Map();
        for (const team of teams) {
          if (!map.has(team.hackathonId)) {
            map.set(team.hackathonId, true);
            uniqueHackathons.push({
              value: team.hackathonId,
              label: team.hackathonName || `Hackathon #${team.hackathonId}`,
            });
          }
        }
        setMyHackathons(uniqueHackathons);
        
        // Auto select hackathon gần nhất nếu có
        if (uniqueHackathons.length > 0) {
          setHackathonId(uniqueHackathons[0].value);
        }
      } catch (error) {
        console.warn("Lỗi tải danh sách cuộc thi", error);
      } finally {
        setLoadingHackathons(false);
      }
    };

    fetchMyHackathons();
  }, []);

  const openLeaderboard = () => {
    if (roundId) navigate(`/student/results/${roundId}`);
  };

  const openFinalResults = () => {
    if (hackathonId) navigate(`/student/hackathons/${hackathonId}/results`);
  };

  return (
    <div style={{ width: "100%", maxWidth: 1000, margin: "0 auto", paddingBottom: 40 }}>
      {/* HERO BANNER */}
      <Card
        style={{
          border: 0,
          color: "#fff",
          background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
          marginBottom: 24,
          borderRadius: 16,
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
        }}
        bodyStyle={{ padding: '32px 40px' }}
      >
        <Space direction="vertical" size={12}>
          <Tag color="cyan" style={{ border: 0, background: 'rgba(255,255,255,0.2)' }} icon={<Medal size={13} />}>
            Tra cứu kết quả
          </Tag>
          <Title level={2} style={{ color: "#fff", margin: 0 }}>
            Hệ thống Điểm số & Vinh danh
          </Title>
          <Text style={{ color: "rgba(255,255,255,.8)", fontSize: 16 }}>
            Nơi theo dõi hành trình thi đấu, tra cứu điểm số vòng loại và bảng vàng vinh danh chung cuộc.
          </Text>
        </Space>
      </Card>

      <Alert
        showIcon
        type="info"
        icon={<ShieldCheck size={16} />}
        message="Dữ liệu được bảo mật"
        description="Mọi kết quả hiển thị đều sử dụng API read-only. Bạn chỉ có thể xem điểm sau khi Ban Tổ Chức đã công bố chính thức."
        style={{ marginBottom: 24, borderRadius: 12 }}
      />

      {/* HAI KHỐI TRA CỨU */}
      <Row gutter={[24, 24]}>
        
        {/* KHỐI 1: VÒNG LOẠI */}
        <Col xs={24} md={12}>
          <Card 
            hoverable 
            style={{ height: '100%', borderRadius: 16, borderColor: '#e6f4ff' }}
            bodyStyle={{ padding: 32, display: 'flex', flexDirection: 'column', height: '100%' }}
          >
            <Space align="start" size={16} style={{ marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #1677ff 0%, #36cfc9 100%)", display: "grid", placeItems: "center", boxShadow: '0 4px 12px rgba(22, 119, 255, 0.2)' }}>
                <BarChart3 size={28} color="#fff" />
              </div>
              <div>
                <Title level={4} style={{ margin: 0, marginBottom: 4 }}>Bảng điểm Vòng thi</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Dành cho các vòng Sơ loại, Bán kết. Xem điểm số và thứ hạng hiện tại của đội.
                </Text>
              </div>
            </Space>

            <Form layout="vertical" onFinish={openLeaderboard} style={{ marginTop: 'auto' }}>
              <Form.Item label={<Text strong>Mã Vòng thi (Round ID)</Text>} required style={{ marginBottom: 16 }}>
                <InputNumber
                  min={1}
                  precision={0}
                  value={roundId}
                  onChange={setRoundId}
                  placeholder="Ví dụ: 12"
                  style={{ width: "100%" }}
                  size="large"
                  prefix={<Search size={16} color="#bfbfbf" style={{ marginRight: 8 }} />}
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
                style={{ borderRadius: 8, height: 44, fontWeight: 600 }}
              >
                Tra cứu Điểm vòng
              </Button>
            </Form>
          </Card>
        </Col>

        {/* KHỐI 2: CHUNG CUỘC & GIẢI THƯỞNG */}
        <Col xs={24} md={12}>
          <Card 
            hoverable 
            style={{ height: '100%', borderRadius: 16, borderColor: '#fffbe6' }}
            bodyStyle={{ padding: 32, display: 'flex', flexDirection: 'column', height: '100%' }}
          >
            <Space align="start" size={16} style={{ marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #faad14 0%, #ffc53d 100%)", display: "grid", placeItems: "center", boxShadow: '0 4px 12px rgba(250, 173, 20, 0.2)' }}>
                <Trophy size={28} color="#fff" />
              </div>
              <div>
                <Title level={4} style={{ margin: 0, marginBottom: 4 }}>Chung cuộc & Giải thưởng</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Vinh danh các đội xuất sắc, xem giải thưởng và tải giấy chứng nhận điện tử.
                </Text>
              </div>
            </Space>

            <Form layout="vertical" onFinish={openFinalResults} style={{ marginTop: 'auto' }}>
              <Form.Item label={<Text strong>Chọn cuộc thi</Text>} required style={{ marginBottom: 16 }}>
                <Select
                  value={hackathonId}
                  onChange={setHackathonId}
                  loading={loadingHackathons}
                  options={myHackathons}
                  placeholder="Chọn Hackathon bạn đã tham gia"
                  size="large"
                  suffixIcon={<ChevronDown size={16} color="#bfbfbf" />}
                  notFoundContent={loadingHackathons ? "Đang tải..." : "Không tìm thấy cuộc thi nào"}
                />
              </Form.Item>
              <Button
                block
                size="large"
                type="primary"
                htmlType="submit"
                disabled={!hackathonId}
                icon={<ArrowRight size={17} />}
                iconPosition="end"
                style={{ background: '#faad14', borderColor: '#faad14', borderRadius: 8, height: 44, fontWeight: 600 }}
              >
                Xem Vinh danh
              </Button>
            </Form>
          </Card>
        </Col>

      </Row>
    </div>
  );
};

export default StudentResultsIndexPage;
