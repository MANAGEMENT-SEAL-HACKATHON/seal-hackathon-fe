import { useState, useEffect } from "react";
import {
  Button,
  Card,
  Col,
  Row,
  Empty,
  Typography,
  Popconfirm,
  message,
  Tag,
  Input,
  Select,
  Spin,
} from "antd";
import { Plus, Trash2, Settings, Search, Trophy, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../shared/components/ui/PageHeader";
import StatusBadge from "../../../shared/components/ui/StatusBadge";
import { ROUTES } from "../../../shared/constants/routes";
import { hackathonService } from "../services/hackathonService";
import { mapHackathonToFE, resolveHackathonBannerUrl } from "../mappers/hackathonMapper";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search: AntSearch } = Input;

const DEFAULT_BANNER =
  "https://images.unsplash.com/photo-1517048676732-d65bc937f952?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80";

const HackathonListPage = () => {
  const navigate = useNavigate();
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchHackathons = async () => {
    try {
      setLoading(true);
      const res = await hackathonService.search({ size: 100 });
      const dataArray = res.items || res.content || res;
      setHackathons(
        (Array.isArray(dataArray) ? dataArray : []).map((item) => mapHackathonToFE(item)),
      );
    } catch (error) {
      message.error(error.message || "Lỗi khi tải danh sách Hackathon");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHackathons();
  }, []);

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await hackathonService.delete(id);
      message.success("Hackathon deleted successfully");
      fetchHackathons();
    } catch (error) {
      message.error(error.message || "Lỗi khi xóa Hackathon");
      setLoading(false);
    }
  };

  const filteredHackathons = hackathons.filter((h) => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchText.toLowerCase()) ||
      h.slug.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || h.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <PageHeader
        title="Cấu hình sự kiện"
        subtitle="Quản lý và cấu hình các sự kiện hackathon của bạn"
        extra={
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => navigate(ROUTES.HACKATHON_CREATE)}
          >
            Tạo sự kiện
          </Button>
        }
      />

      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} md={12} lg={8}>
            <AntSearch
              placeholder="Tìm kiếm theo tên hoặc slug..."
              allowClear
              enterButton={<Search size={16} />}
              onSearch={setSearchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: "100%" }}
            />
          </Col>
          <Col xs={24} md={6} lg={4}>
            <Select
              defaultValue="ALL"
              style={{ width: "100%" }}
              onChange={setStatusFilter}
            >
              <Option value="ALL">Tất cả trạng thái</Option>
              <Option value="DRAFT">Nháp</Option>
              <Option value="PUBLISHED">Đã công bố</Option>
              <Option value="ONGOING">Đang diễn ra</Option>
              <Option value="PENDING_CONFIRM">Chờ chốt sổ</Option>
              <Option value="FINISHED">Đã hoàn thành</Option>
            </Select>
          </Col>
          <Col xs={24} md={6} lg={4}>
            <Text type="secondary">
              Tìm thấy {filteredHackathons.length} sự kiện
            </Text>
          </Col>
        </Row>
      </Card>

      {loading ? (
        <Card
          style={{ textAlign: "center", padding: "40px 0", borderRadius: 12 }}
        >
          <Spin size="large" />
        </Card>
      ) : filteredHackathons.length === 0 ? (
        <Card
          style={{ textAlign: "center", padding: "40px 0", borderRadius: 12 }}
        >
          <Empty
            description={
              searchText || statusFilter !== "ALL"
                ? "Không tìm thấy kết quả phù hợp"
                : "Chưa có sự kiện nào"
            }
          />
          {!searchText && statusFilter === "ALL" && (
            <Button
              type="primary"
              icon={<Plus size={16} />}
              style={{ marginTop: 16 }}
              onClick={() => navigate(ROUTES.HACKATHON_CREATE)}
            >
              Tạo sự kiện đầu tiên
            </Button>
          )}
        </Card>
      ) : (
        <Row gutter={[24, 24]}>
          {filteredHackathons.map((hackathon) => (
            <Col xs={24} sm={12} lg={8} key={hackathon.id}>
              <Card
                hoverable
                cover={
                  <div
                    style={{
                      height: 160,
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <img
                      alt={hackathon.name}
                      src={resolveHackathonBannerUrl(hackathon) || DEFAULT_BANNER}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <div style={{ position: "absolute", top: 12, right: 12 }}>
                      <StatusBadge status={hackathon.status} />
                    </div>
                  </div>
                }
                actions={[
                  <Button
                    type="text"
                    icon={<Copy size={16} />}
                    key="clone"
                    onClick={() =>
                      navigate(ROUTES.HACKATHON_CREATE, {
                        state: { cloneFromId: hackathon.id },
                      })
                    }
                  >
                    Nhân bản
                  </Button>,
                  (hackathon.status === "DRAFT" ||
                    hackathon.status === "ONGOING") && (
                    <Button
                      type="text"
                      icon={<Settings size={16} />}
                      key="setup"
                      onClick={() =>
                        navigate(`/hackathons/${hackathon.id}/setup`)
                      }
                    >
                      Thiết lập
                    </Button>
                  ),
                  hackathon.status === "DRAFT" && (
                    <Popconfirm
                      title="Xóa Sự kiện"
                      description="Bạn có chắc chắn muốn xóa sự kiện này? Hành động này không thể hoàn tác."
                      onConfirm={() => handleDelete(hackathon.id)}
                      okText="Xóa"
                      cancelText="Hủy"
                      key="delete"
                    >
                      <Button type="text" danger icon={<Trash2 size={16} />}>
                        Xóa
                      </Button>
                    </Popconfirm>
                  ),
                  hackathon.status === "FINISHED" && (
                    <Button
                      type="text"
                      icon={<Settings size={16} />}
                      key="setup"
                      onClick={() =>
                        navigate(`/hackathons/${hackathon.id}/setup`)
                      }
                    >
                     Xem chi tiết
                    </Button>
                  ),
                  (hackathon.status === "PENDING_CONFIRM" || hackathon.status === "FINISHED") && (
                    <Button
                      type="text"
                      icon={<Trophy size={16} />}
                      key="results"
                      onClick={() => navigate(`/hackathons/${hackathon.id}/results`)}
                    >
                      Kết quả
                    </Button>
                  ),
                ].filter(Boolean)}
              >
                <Card.Meta
                  title={<Title level={4}>{hackathon.name}</Title>}
                  description={
                    <div>
                      <div style={{ marginBottom: 8 }}>
                        <Tag color="blue">
                          {hackathon.season} {hackathon.year}
                        </Tag>
                      </div>
                      <Paragraph ellipsis={{ rows: 2 }}>
                        {hackathon.description}
                      </Paragraph>
                      <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                        Reg: {hackathon.registration_start || "N/A"} -{" "}
                        {hackathon.registration_end || "N/A"}
                      </div>
                      {hackathon.max_participants != null && (
                        <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 4 }}>
                          Tối đa: {hackathon.max_participants} người tham gia
                        </div>
                      )}
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default HackathonListPage;
