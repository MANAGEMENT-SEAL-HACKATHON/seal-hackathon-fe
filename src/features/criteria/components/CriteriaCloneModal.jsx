import { useState, useEffect } from "react";
import {
  Modal,
  Select,
  Alert,
  Typography,
  Switch,
  Space,
  Spin,
  message,
  theme,
  Table,
  Tag,
  Segmented
} from "antd";
import axiosClient from "../../../shared/api/axiosClient";
import { ENDPOINTS } from "../../../shared/api/endpoints";
import { criteriaService } from "../services/criteriaService";
import { STANDARD_SYSTEM_CRITERIA } from "../constants/standardCriteria";
import { CRITERIA_COLORS } from "../constants/criteria.constants";

const { Text } = Typography;
const { Option } = Select;
const { useToken } = theme;

const previewColumns = [
  { title: "Tên", dataIndex: "name", key: "name" },
  {
    title: "Loại",
    dataIndex: "type",
    key: "type",
    render: (type) => <Tag color={CRITERIA_COLORS[type] || "default"}>{type}</Tag>,
  },
  {
    title: "Trọng số",
    dataIndex: "weight",
    key: "weight",
    render: (w) => Number(w).toFixed(2),
  },
  { title: "Điểm tối đa", dataIndex: "max_score", key: "max_score" },
];

export const CriteriaCloneModal = ({
  visible,
  onCancel,
  onClone,
  onApplyStandard,
  currentHackathonId,
  currentRound,
  selectedRoundId,
  selectedTrackId,
}) => {
  const { token } = useToken();
  const [hackathons, setHackathons] = useState([]);
  const [sourceRounds, setSourceRounds] = useState([]);
  const [trackCloneSources, setTrackCloneSources] = useState([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState(null);
  
  const [cloneSourceId, setCloneSourceId] = useState(null);
  const [cloneSourceType, setCloneSourceType] = useState("TRACK");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // State quản lý Source Mode và Preview của đồng đội bạn
  const [sourceMode, setSourceMode] = useState("clone");
  const [previewItems, setPreviewItems] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const extractArray = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.items)) return res.items;
    if (Array.isArray(res.content)) return res.content;
    if (Array.isArray(res.data)) return res.data;
    if (res.data) {
      if (Array.isArray(res.data.items)) return res.data.items;
      if (Array.isArray(res.data.content)) return res.data.content;
    }
    return [];
  };

  useEffect(() => {
    if (visible) {
      setCloneSourceId(null);
      setReplaceExisting(false);
      setSourceMode("clone");
      setPreviewItems([]);
      fetchHackathons();
      if (currentRound?.is_final) {
        setCloneSourceType("ROUND");
        setSelectedHackathonId(null);
      } else {
        setCloneSourceType("TRACK");
        setSelectedHackathonId(currentHackathonId);
        if (selectedTrackId) fetchTrackCloneSources(selectedTrackId);
      }
    } else {
      setSelectedHackathonId(null);
      setCloneSourceId(null);
      setReplaceExisting(false);
      setPreviewItems([]);
    }
  }, [visible, currentRound, currentHackathonId, selectedTrackId]);

  useEffect(() => {
    if (selectedHackathonId && visible && currentRound?.is_final)
      fetchRoundsForFinal(selectedHackathonId);
  }, [selectedHackathonId, visible, currentRound]);

  // Logic gọi API lấy preview của đồng đội bạn
  useEffect(() => {
    if (!visible || sourceMode !== "clone" || !cloneSourceId) {
      setPreviewItems([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setPreviewLoading(true);
      try {
        const items =
          cloneSourceType === "ROUND"
            ? await criteriaService.listByFinalRound(cloneSourceId)
            : await criteriaService.listByTrack(cloneSourceId);
        if (!cancelled) setPreviewItems(Array.isArray(items) ? items : []);
      } catch {
        if (!cancelled) setPreviewItems([]);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, sourceMode, cloneSourceId, cloneSourceType]);

  const fetchHackathons = async () => {
    try {
      const res = await axiosClient.get(ENDPOINTS.HACKATHONS.BASE);
      setHackathons(extractArray(res));
    } catch {
      message.error("Lỗi tải danh sách Hackathon");
    }
  };

  const fetchRoundsForFinal = async (hackId) => {
    setIsLoading(true);
    setCloneSourceId(null);
    try {
      const res = await axiosClient.get(ENDPOINTS.HACKATHONS.ROUNDS(hackId));
      setSourceRounds(extractArray(res));
    } catch {
      message.error("Lỗi tải dữ liệu Vòng thi");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrackCloneSources = async (trackId) => {
    setIsLoading(true);
    setCloneSourceId(null);
    try {
      const res = await criteriaService.getCloneSourcesForTrack(trackId);
      let sources = [];
      if (res && Array.isArray(res.sources)) sources = res.sources;
      else if (res?.data && Array.isArray(res.data.sources))
        sources = res.data.sources;
      else if (res?.data?.data && Array.isArray(res.data.data.sources))
        sources = res.data.data.sources;
      setTrackCloneSources(sources);
    } catch {
      message.error("Lỗi tải danh sách bảng đấu nguồn");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOk = () => {
    // Gọi hàm xử lý backend chuẩn từ đồng đội của bạn
    if (sourceMode === "standard") {
      onApplyStandard?.(replaceExisting);
      return;
    }
    if (cloneSourceId) onClone(cloneSourceType, cloneSourceId, replaceExisting);
  };

  const filteredTrackSources = trackCloneSources.filter(
    (s) => s.hackathonId === selectedHackathonId,
  );

  const activePreview =
    sourceMode === "standard" ? STANDARD_SYSTEM_CRITERIA : previewItems;

  const canSubmit =
    sourceMode === "standard" ? true : Boolean(cloneSourceId) && !isLoading;

  return (
    <Modal
      title={
        <span style={{ fontSize: 18, fontWeight: 600 }}>
          Sao chép / Áp dụng Tiêu chí đánh giá
        </span>
      }
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      okText={sourceMode === "standard" ? "Áp dụng tiêu chí chuẩn" : "Tiến hành sao chép"}
      cancelText="Hủy"
      okButtonProps={{
        disabled: !canSubmit || previewLoading,
        size: "large",
        style: { borderRadius: 8 },
      }}
      cancelButtonProps={{ size: "large", style: { borderRadius: 8 } }}
      width={720}
      styles={{ content: { borderRadius: 16 } }}
    >
      <div style={{ paddingTop: 8 }}>
        
        {/* TASK 17: DÙNG SEGMENTED TẠO CẢM GIÁC HIỆN ĐẠI CHO GIAO DIỆN (Trộn code 2 bên) */}
        <div style={{ marginBottom: 20 }}>
          <Segmented
            block
            options={[
              { label: 'Sao chép từ Lịch sử (Mùa trước)', value: 'clone' },
              { label: 'Tiêu chí Chuẩn (Hệ thống)', value: 'standard' },
            ]}
            value={sourceMode}
            onChange={(val) => {
              setSourceMode(val);
              setCloneSourceId(null);
            }}
          />
        </div>

        <div
          style={{
            marginBottom: 24,
            padding: "16px",
            backgroundColor: replaceExisting
              ? token.colorErrorBg
              : token.colorSuccessBg,
            borderRadius: 12,
            border: `1px solid ${replaceExisting ? token.colorErrorBorder : token.colorSuccessBorder}`,
            transition: "all 0.3s ease",
          }}
        >
          <Space
            size="middle"
            style={{
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Text strong style={{ fontSize: 15 }}>
              Chế độ xử lý dữ liệu hiện tại:
            </Text>
            <Switch
              checkedChildren="Ghi đè tất cả"
              unCheckedChildren="Cộng dồn"
              checked={replaceExisting}
              onChange={setReplaceExisting}
            />
          </Space>
          <div style={{ fontSize: "14px" }}>
            {replaceExisting ? (
              <span style={{ color: token.colorError }}>
                <strong style={{ display: "inline-block", marginRight: 6 }}>
                  CẢNH BÁO:
                </strong>
                Toàn bộ tiêu chí hiện tại của vòng/bảng này sẽ bị xóa sạch và
                thay thế hoàn toàn.
              </span>
            ) : (
              <span style={{ color: token.colorSuccess }}>
                <strong style={{ display: "inline-block", marginRight: 6 }}>
                  AN TOÀN:
                </strong>
                Dữ liệu sẽ được nối tiếp vào danh sách tiêu chí hiện tại của bạn.
              </span>
            )}
          </div>
        </div>

        {/* NẾU CHỌN TỪ LỊCH SỬ THÌ HIỂN THỊ DROPDOWN CHỌN */}
        {sourceMode === "clone" && (
          <Spin spinning={isLoading}>
            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                1. Chọn mùa giải (Hackathon) nguồn:
              </Text>
              <Select
                size="large"
                style={{ width: "100%" }}
                placeholder="Tìm kiếm mùa giải..."
                value={selectedHackathonId}
                onChange={(val) => {
                  setSelectedHackathonId(val);
                  setCloneSourceId(null);
                }}
                showSearch
                optionFilterProp="children"
              >
                {hackathons.map((h) => {
                  const disabledHackathon = currentRound?.is_final
                    ? h.id === currentHackathonId
                    : false;
                  return (
                    <Option key={h.id} value={h.id} disabled={disabledHackathon}>
                      {h.name}
                    </Option>
                  );
                })}
              </Select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                2. Chọn vòng thi / bảng đấu nguồn để chép:
              </Text>
              <Select
                size="large"
                style={{ width: "100%" }}
                placeholder="Vui lòng chọn nguồn dữ liệu..."
                value={
                  cloneSourceId
                    ? `${cloneSourceType}_${cloneSourceId}`
                    : undefined
                }
                onChange={(val) => {
                  const [type, id] = val.split("_");
                  setCloneSourceType(type);
                  setCloneSourceId(parseInt(id, 10));
                }}
                disabled={
                  currentRound?.is_final
                    ? !selectedHackathonId || sourceRounds.length === 0
                    : filteredTrackSources.length === 0
                }
              >
                {currentRound?.is_final
                  ? sourceRounds.map((r) => {
                      const isRoundFinal =
                        r.is_final === true ||
                        r.isFinal === true ||
                        r.name?.toLowerCase().includes("chung kết") ||
                        r.name?.toLowerCase().includes("final");
                      if (!isRoundFinal) return null;
                      const isSameRound =
                        selectedHackathonId === currentHackathonId &&
                        r.id === selectedRoundId;
                      return (
                        <Option
                          key={`ROUND_${r.id}`}
                          value={`ROUND_${r.id}`}
                          disabled={isSameRound}
                        >
                          🏆 Vòng Chung kết: {r.name}
                        </Option>
                      );
                    })
                  : filteredTrackSources.map((s) => (
                      <Option
                        key={`TRACK_${s.trackId}`}
                        value={`TRACK_${s.trackId}`}
                      >
                        Bảng: {s.trackName} ({s.criteriaCount} tiêu chí)
                      </Option>
                    ))}
              </Select>
            </div>
          </Spin>
        )}

        {sourceMode === "standard" && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
            message="Bộ tiêu chí chuẩn hệ thống"
            description="Các tiêu chí mặc định giúp đánh giá dự án đồng đều. Xem preview bên dưới trước khi áp dụng."
          />
        )}

        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: "block", marginBottom: 8 }}>
            👀 Xem trước danh sách Tiêu chí
            {sourceMode === "clone" && cloneSourceId ? " (nguồn đã chọn)" : ""}
          </Text>
          <Table
            size="small"
            rowKey={(row, index) => row.id || `${row.name}-${index}`}
            columns={previewColumns}
            dataSource={activePreview}
            loading={sourceMode === "clone" && previewLoading}
            pagination={false}
            locale={{
              emptyText:
                sourceMode === "standard"
                  ? "Không có dữ liệu"
                  : "Chọn nguồn để xem preview",
            }}
          />
        </div>

        {sourceMode === "clone" && (
          <Alert
            type="info"
            showIcon
            style={{ borderRadius: 8 }}
            message={
              currentRound?.is_final
                ? "Vòng Chung kết chỉ có thể sao chép bộ tiêu chí từ các vòng Chung kết khác."
                : "Bạn có thể chọn mùa giải bất kỳ ở trên để tìm các bảng đấu có sẵn tiêu chí."
            }
          />
        )}

      </div>
    </Modal>
  );
};