import { useParams, useNavigate } from "react-router-dom";
import { Alert, Button, Card, Space, Tag, Typography } from "antd";
import { ArrowLeftOutlined, ReloadOutlined, TrophyOutlined } from "@ant-design/icons";
import PublicScoreboard from "../components/PublicScoreboard";
import { useStudentRoundResults } from "../hooks/useStudentRoundResults";

const { Title, Text } = Typography;

const StudentRoundLeaderboardPage = ({ roundId: roundIdProp, source = "public" }) => {
  const navigate = useNavigate();
  const params = useParams();
  const roundId = roundIdProp || params.roundId || params.id;
  const { scoreboard, isLoading, error, fetchScoreboard } = useStudentRoundResults(roundId, source);
  const notPublished = error?.code === "RESULT_NOT_PUBLISHED" || error?.response?.data?.code === "RESULT_NOT_AVAILABLE" || error?.status === 403 || error?.status === 422 || error?.response?.status === 422;

  if (!roundId) {
    return <Alert showIcon type="warning" message="Thiếu roundId" description="Trang kết quả cần roundId để tải scoreboard." />;
  }

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <Button 
        type="text" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/student/results')}
        style={{ padding: 0 }}
      >
        Quay lại tìm kiếm
      </Button>
      <Card
        style={{
          border: 0,
          background: "linear-gradient(135deg, var(--ant-color-primary-bg) 0%, var(--ant-color-primary) 100%)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <Space direction="vertical" size={7}>
            <Tag color="gold" icon={<TrophyOutlined />}>Kết quả chính thức</Tag>
            <Title level={1} style={{ margin: 0 }}>{scoreboard.roundName}</Title>
            <Text type="secondary">
              Bảng điểm chỉ hiển thị sau khi Ban tổ chức hoàn tất và công bố kết quả.
            </Text>
          </Space>
          <Button icon={<ReloadOutlined spin={isLoading} />} onClick={fetchScoreboard}>Làm mới</Button>
        </div>
      </Card>

      {error && !notPublished && <Alert showIcon type="error" message="Không thể tải kết quả" description={error.message} />}
      {notPublished ? (
        <Alert
          showIcon
          type="info"
          message="Kết quả chưa được công bố"
          description="Bạn không cần làm gì lúc này. Scoreboard sẽ mở khi Ban tổ chức chính thức công bố kết quả Sơ loại."
        />
      ) : (
        <PublicScoreboard scoreboard={scoreboard} isLoading={isLoading} />
      )}
    </Space>
  );
};

export default StudentRoundLeaderboardPage;
