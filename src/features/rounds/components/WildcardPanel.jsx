// src/features/rounds/results/components/WildcardPanel.jsx
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { CheckOutlined, EditOutlined, StarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;
const { TextArea } = Input;

const OVERRIDE_CATEGORIES = [
  { value: "PROPOSED_TEAM_VIOLATION", label: "Đội đề xuất vi phạm quy chế" },
  { value: "TRACK_QUOTA_ADJUST", label: "Điều chỉnh suất theo bảng" },
  { value: "SCORE_CORRECTED", label: "Sửa điểm sau khi khóa đề xuất" },
  { value: "OTHER", label: "Khác (bắt buộc ghi chú)" },
];

const formatSubmittedAt = (value) => {
  if (!value) return "—";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD/MM HH:mm") : String(value);
};

const formatConfirmedAt = (value) => {
  if (!value) return "";
  const d = dayjs(value);
  return d.isValid() ? d.format("HH:mm") : String(value);
};

const WildcardPanel = ({
  wildcard,
  error,
  overrideHistory = [],
  confirmingProposal = false,
  overridingReviewId = null,
  onConfirmProposal,
  onOverride,
  onLoadHistory,
  readOnly = false,
}) => {
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [category, setCategory] = useState(null);
  const [note, setNote] = useState("");

  const slots = wildcard.config.availableSlots ?? 0;
  const enabled = Boolean(wildcard.config.roundEnabled) && slots > 0;
  const proposalConfirmedAt =
    wildcard.proposalConfirmedAt ?? wildcard.config?.proposalConfirmedAt ?? null;
  const locked = Boolean(proposalConfirmedAt);
  const approvedCount =
    wildcard.config.approvedCount ??
    wildcard.items.filter((item) => item.coordinatorApproved === true).length;

  useEffect(() => {
    if (locked && onLoadHistory) onLoadHistory();
  }, [locked, onLoadHistory]);

  const closeOverride = () => {
    setOverrideTarget(null);
    setCategory(null);
    setNote("");
  };

  const confirmOverride = async () => {
    if (!overrideTarget || !category) return;
    if (category === "OTHER" && !note.trim()) return;
    const success = await onOverride(overrideTarget, {
      approved: !overrideTarget.coordinatorApproved,
      category,
      note: note.trim(),
    });
    if (success) closeOverride();
  };

  const otherNeedsNote = category === "OTHER" && !note.trim();
  const canSubmitOverride = Boolean(category) && !otherNeedsNote;

  if (error) {
    return (
      <Alert
        showIcon
        type="error"
        message="Không tải được danh sách Vé vớt"
        description={error.message}
      />
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space wrap style={{ marginBottom: 4 }}>
        <Tag
          color={wildcard.config.roundEnabled ? "success" : "default"}
          style={{ fontWeight: 500, padding: "2px 10px" }}
        >
          Vòng: {wildcard.config.roundEnabled ? "Đã bật" : "Đang tắt"}
        </Tag>
        <Tag color="blue" bordered={false} style={{ fontWeight: 600, padding: "2px 10px" }}>
          {slots} suất vé vớt
        </Tag>
        {locked && (
          <Tag color="purple" style={{ fontWeight: 600, padding: "2px 10px" }}>
            Đã xác nhận lúc {formatConfirmedAt(proposalConfirmedAt)} — sửa qua Ghi đè
          </Tag>
        )}
      </Space>

      <Alert
        showIcon
        type={enabled ? (locked ? "success" : "info") : "warning"}
        message={
          <Text strong>
            {locked
              ? "Đề xuất vé vớt đã khóa"
              : enabled
                ? "Hệ thống đề xuất Top N đội vé vớt"
                : "Chưa thể xét vé vớt"}
          </Text>
        }
        description={
          <Text type="secondary">
            {locked
              ? "Thứ tự đề xuất không tự đổi khi điểm thay đổi. Muốn sửa đội → dùng Ghi đè và chọn lý do bắt buộc."
              : enabled
                ? `Sắp xếp: điểm giảm dần, nộp sớm hơn lên trước. Bấm «Xác nhận đề xuất» để duyệt ${slots} đội và khóa danh sách.`
                : "Bật Vé vớt trên Vòng Sơ loại và đảm bảo còn ghế (tối đa đội Chung kết − Top N × số bảng > 0)."}
          </Text>
        }
        style={{ borderRadius: 8 }}
        action={
          enabled && !locked && !readOnly ? (
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={confirmingProposal}
              onClick={onConfirmProposal}
            >
              Xác nhận đề xuất
            </Button>
          ) : null
        }
      />

      <Card
        title={
          <Space>
            <StarOutlined style={{ color: "#faad14" }} />
            <Text strong style={{ fontSize: 16 }}>
              Đề xuất vé vớt cross-bảng
            </Text>
          </Space>
        }
        styles={{
          header: { borderBottom: "1px solid #f0f0f0", padding: "16px 24px" },
          body: { padding: "16px 24px" },
        }}
        style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
      >
        <Table
          rowKey="key"
          pagination={false}
          dataSource={wildcard.items}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <span style={{ fontWeight: 500 }}>Chưa có danh sách đề xuất vé vớt</span>
                    <br />
                    <span style={{ fontSize: 13 }}>
                      Tính năng này có thể chưa được bật, hoặc hiện tại không có đội thi nào đáp
                      ứng đủ điều kiện nhận vé vớt.
                    </span>
                  </div>
                }
              />
            ),
          }}
          scroll={{ x: 800 }}
          size="middle"
          columns={[
            {
              title: "Hạng",
              dataIndex: "candidateRank",
              width: 80,
              align: "center",
              render: (value) => (
                <span style={{ fontWeight: "bold", fontSize: 16, color: "#d48806" }}>#{value}</span>
              ),
            },
            {
              title: "Đội thi",
              dataIndex: "teamName",
              render: (value, item) => (
                <Space direction="vertical" size={4}>
                  <Text strong style={{ fontSize: 15 }}>
                    {value}
                  </Text>
                  {item.groupLabel && (
                    <Tag bordered={false} style={{ margin: 0, fontSize: 12 }}>
                      {item.groupLabel}
                    </Tag>
                  )}
                </Space>
              ),
            },
            {
              title: "Điểm TB",
              dataIndex: "avgScore",
              align: "right",
              width: 110,
              render: (value, item) => {
                const score = value ?? item.weightedAvgScore ?? 0;
                return (
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#2563eb",
                    }}
                  >
                    {Number(score).toFixed(2)}
                  </span>
                );
              },
            },
            {
              title: "Nộp bài",
              dataIndex: "submittedAt",
              width: 120,
              render: (value) => (
                <Text type="secondary" style={{ fontFamily: "monospace" }}>
                  {formatSubmittedAt(value)}
                </Text>
              ),
            },
            {
              title: "Trạng thái",
              dataIndex: "coordinatorApproved",
              width: 140,
              render: (approved, item) => {
                if (approved === true) {
                  return (
                    <Tag color="success" style={{ fontWeight: 600, padding: "4px 10px" }}>
                      {item.isOverride ? "Duyệt (ghi đè)" : "Đã duyệt"}
                    </Tag>
                  );
                }
                if (approved === false) {
                  return (
                    <Tag color="error" style={{ fontWeight: 600, padding: "4px 10px" }}>
                      {item.isOverride ? "Từ chối (ghi đè)" : "Từ chối"}
                    </Tag>
                  );
                }
                return (
                  <Tag color="processing" style={{ fontWeight: 600, padding: "4px 10px" }}>
                    Đề xuất
                  </Tag>
                );
              },
            },
            ...(locked && !readOnly
              ? [
                  {
                    title: "Thao tác",
                    key: "actions",
                    width: 130,
                    render: (_, candidate) => (
                      <Button
                        icon={<EditOutlined />}
                        loading={overridingReviewId === candidate.reviewId}
                        onClick={() => {
                          setOverrideTarget(candidate);
                          setCategory(null);
                          setNote("");
                        }}
                      >
                        Ghi đè
                      </Button>
                    ),
                  },
                ]
              : []),
          ]}
        />

        {!locked && enabled && !readOnly && (
          <div style={{ marginTop: 16, textAlign: "right" }}>
            <Text type="secondary" style={{ marginRight: 12 }}>
              Đã duyệt dự kiến: {approvedCount}/{slots} (sau xác nhận)
            </Text>
            <Button
              type="primary"
              size="large"
              icon={<CheckOutlined />}
              loading={confirmingProposal}
              onClick={onConfirmProposal}
            >
              Xác nhận đề xuất
            </Button>
          </div>
        )}
      </Card>

      {locked && (
        <Card
          title={<Text strong>Lịch sử override vé vớt</Text>}
          styles={{
            header: { borderBottom: "1px solid #f0f0f0", padding: "16px 24px" },
            body: { padding: "16px 24px" },
          }}
          style={{ borderRadius: 12 }}
        >
          <Table
            rowKey="id"
            pagination={false}
            size="small"
            dataSource={overrideHistory}
            locale={{ emptyText: "Chưa có override nào" }}
            columns={[
              {
                title: "Thời điểm",
                dataIndex: "overriddenAt",
                width: 140,
                render: (v) => formatSubmittedAt(v),
              },
              { title: "Đội", dataIndex: "teamName" },
              {
                title: "Loại",
                dataIndex: "category",
                width: 180,
                render: (v) => {
                  const map = {
                    TECHNICAL: 'Kỹ thuật',
                    SOFT: 'Kỹ năng mềm',
                    OTHER: 'Khác',
                    FORCE_MAJEURE: 'Bất khả kháng',
                    TIEBREAK: 'Đồng điểm',
                    MANUAL: 'Thủ công',
                  };
                  const key = String(v || '').toUpperCase();
                  return <Tag>{map[key] || v}</Tag>;
                },
              },
              {
                title: "Trước → Sau",
                key: "change",
                width: 140,
                render: (_, row) => (
                  <Text>
                    {row.beforeApproved === true ? "Duyệt" : row.beforeApproved === false ? "Từ chối" : "—"}
                    {" → "}
                    {row.afterApproved ? "Duyệt" : "Từ chối"}
                  </Text>
                ),
              },
              {
                title: "Ghi chú",
                dataIndex: "note",
                ellipsis: true,
                render: (v) => v || "—",
              },
              {
                title: "Người sửa",
                dataIndex: "byUserName",
                width: 140,
                render: (v) => v || "—",
              },
            ]}
          />
        </Card>
      )}

      <Modal
        open={Boolean(overrideTarget)}
        title={`Ghi đè — ${overrideTarget?.teamName || ""}`}
        okText="Lưu ghi đè"
        okButtonProps={{ disabled: !canSubmitOverride }}
        confirmLoading={overridingReviewId === overrideTarget?.reviewId}
        onCancel={closeOverride}
        onOk={confirmOverride}
      >
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <Alert
            type="warning"
            showIcon
            message={
              overrideTarget?.coordinatorApproved
                ? "Đổi thành Từ chối vé vớt"
                : "Đổi thành Duyệt vé vớt"
            }
            description="Đề xuất đã khóa — mọi thay đổi phải có lý do. Điểm đổi sau khi khóa không tự sắp xếp lại."
          />
          <Text strong>Lý do</Text>
          <Select
            style={{ width: "100%" }}
            placeholder="Chọn lý do ghi đè"
            options={OVERRIDE_CATEGORIES}
            value={category}
            onChange={setCategory}
          />
          <Text strong>
            Ghi chú {category === "OTHER" ? "(bắt buộc)" : "(tuỳ chọn)"}
          </Text>
          <TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            showCount
            rows={3}
            status={otherNeedsNote ? "error" : undefined}
            placeholder={
              category === "OTHER"
                ? "Bắt buộc nêu lý do khi chọn OTHER..."
                : "Ghi chú bổ sung..."
            }
          />
          {otherNeedsNote && (
            <Text type="danger">Loại &quot;Khác&quot; bắt buộc có ghi chú.</Text>
          )}
        </Space>
      </Modal>
    </Space>
  );
};

export default WildcardPanel;
