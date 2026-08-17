import { useState, useMemo } from "react";
import {
  Table,
  Button,
  Space,
  Popconfirm,
  Tag,
  Card,
  Alert,
  Typography,
  Input,
  Select,
  Radio,
  Tooltip,
} from "antd";
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  FileText,
  Inbox,
  Search,
} from "lucide-react";
import SectionHeader, { HintList } from "../../../shared/components/ui/SectionHeader";
import { useCriteriaManagement } from "../hooks/useCriteriaManagement";
import {
  CRITERIA_TYPES,
  CRITERIA_TYPE_OPTIONS,
  CRITERIA_COLORS,
  formatCriteriaTypeLabel,
} from "../constants/criteria.constants";
import { CriteriaHeader } from "../components/CriteriaHeader";
import { CriteriaFormModal } from "../components/CriteriaFormModal";
import { CriteriaCloneModal } from "../components/CriteriaCloneModal";
import { CriteriaBatchModal } from "../components/CriteriaBatchModal";
import { STANDARD_SYSTEM_CRITERIA } from "../constants/standardCriteria";
import { CriteriaTemplatePanel } from "../components/CriteriaTemplatePanel";

const CRITERIA_TAB_HINT = (
  <HintList
    items={[
      "Sơ loại: thiết lập tiêu chí theo từng bảng đấu",
      "Chung kết: thiết lập tiêu chí theo vòng",
      "Tổng trọng số của các tiêu chí phải bằng 1",
    ]}
  />
);

const CriteriaManagementPage = ({ hackathonId, onUpdated }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCloneVisible, setIsCloneVisible] = useState(false);
  const [isBatchVisible, setIsBatchVisible] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState(null);

  const {
    hackathonRounds,
    hackathonTracks,
    roundTracks,
    currentRound,
    selectedRoundId,
    setSelectedRoundId,
    selectedTrackId,
    setSelectedTrackId,
    currentCriteria,
    totalWeight,
    isWeightValid,
    handleAutoBalance,
    handleCloneCriteria,
    handleSaveCriteria,
    handleBatchSaveCriteria,
    handleApplyStandardCriteria,
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    handleApplyTemplate,
    saveTemplate,
    deleteTemplate,
    deleteCriteria,
    updateRound,
  } = useCriteriaManagement(hackathonId, onUpdated);

  const filteredCriteria = useMemo(() => {
    return currentCriteria.filter(
      (i) =>
        i.name.toLowerCase().includes(searchText.toLowerCase()) &&
        (filterType ? i.type === filterType : true),
    );
  }, [currentCriteria, searchText, filterType]);

  const selectedTiebreakerId = useMemo(
    () => currentCriteria.find((c) => c.is_tiebreaker_priority)?.id ?? null,
    [currentCriteria],
  );

  const handleTiebreakerChange = async (criterion, checked) => {
    if (!checked) return;
    await handleSaveCriteria(
      { ...criterion, is_tiebreaker_priority: true },
      criterion.id,
    );
  };

  const handleClearTiebreaker = async (criterion) => {
    await handleSaveCriteria(
      { ...criterion, is_tiebreaker_priority: false },
      criterion.id,
    );
  };

  const columns = [
    {
      title: "STT",
      key: "order",
      width: 80,
      align: "center",
      render: (_, record, index) => {
        const order = record.display_order;
        if (order != null && order >= 1) return order;
        return index + 1;
      },
    },
    {
      title: "Tên tiêu chí",
      dataIndex: "name",
      key: "name",
      render: (t, r) => (
        <Space size={8} wrap>
          <strong>{t}</strong>
          {r.is_tiebreaker_priority && (
            <Tag color="purple">Phân xử đồng điểm</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 140,
      render: (t) => <Tag color={CRITERIA_COLORS[t]}>{formatCriteriaTypeLabel(t)}</Tag>,
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (text) =>
        text ? (
          <Typography.Text ellipsis={{ tooltip: text }}>{text}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: "Trọng số",
      dataIndex: "weight",
      key: "weight",
      width: 120,
      align: "right",
      render: (w, r) =>
        r.type === CRITERIA_TYPES.PENALTY ? (
          <Tag color="red">Không tính</Tag>
        ) : (
          w?.toFixed(2)
        ),
    },
    {
      title: "Điểm max",
      dataIndex: "max_score",
      key: "max_score",
      width: 120,
      align: "right",
    },
    {
      title: "Tiêu chí phụ",
      key: "tiebreaker",
      width: 150,
      align: "center",
      render: (_, record) => {
        const isPenalty = record.type === CRITERIA_TYPES.PENALTY;
        const isSelected = selectedTiebreakerId === record.id;
        if (isPenalty) {
          return (
            <Tooltip title="Tiêu chí điểm phạt không thể dùng làm tiêu chí phụ">
              <Radio disabled />
            </Tooltip>
          );
        }
        return (
          <Space direction="vertical" size={4} align="center">
            <Radio
              checked={isSelected}
              onChange={() => handleTiebreakerChange(record, true)}
            />
            {isSelected && (
              <Button
                type="link"
                size="small"
                style={{ padding: 0, height: "auto", fontSize: 11 }}
                onClick={() => handleClearTiebreaker(record)}
              >
                Bỏ chọn
              </Button>
            )}
          </Space>
        );
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      align: "right",
      render: (_, r) => (
        <Space>
          <Button
            type="text"
            icon={<Edit size={16} />}
            onClick={() => {
              setEditingCriteria(r);
              setIsModalVisible(true);
            }}
          />
          <Popconfirm title="Xoá?" onConfirm={() => deleteCriteria(r.id)}>
            <Button type="text" danger icon={<Trash2 size={16} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const executeClone = (type, id, replaceExisting) => {
    handleCloneCriteria(
      type === "ROUND" ? id : null,
      type === "TRACK" ? id : null,
      replaceExisting,
    );
    setIsCloneVisible(false);
  };

  const executeApplyStandard = (replaceExisting) => {
    handleApplyStandardCriteria(STANDARD_SYSTEM_CRITERIA, replaceExisting);
    setIsCloneVisible(false);
  };

  const canManage = Boolean(currentRound && (currentRound.is_final || selectedTrackId));

  return (
    <div style={{ padding: "24px 0", animation: "fadeInUp 0.4s ease-out both" }}>
      <SectionHeader
        title="Tiêu chí đánh giá"
        info={CRITERIA_TAB_HINT}
        extra={
          canManage ? (
            <Space>
              <Button icon={<Copy size={16} />} onClick={() => setIsCloneVisible(true)}>
                Sao chép
              </Button>
              <Button icon={<FileText size={16} />} onClick={() => setIsBatchVisible(true)}>
                Thêm nhiều
              </Button>
              <Button
                type="primary"
                icon={<Plus size={16} />}
                onClick={() => {
                  setEditingCriteria(null);
                  setIsModalVisible(true);
                }}
              >
                Thêm mới
              </Button>
            </Space>
          ) : null
        }
      />
      <CriteriaHeader
        {...{
          hackathonRounds,
          roundTracks,
          currentRound,
          selectedRoundId,
          setSelectedRoundId,
          selectedTrackId,
          setSelectedTrackId,
          updateRound,
        }}
      />
      <CriteriaTemplatePanel
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onSelect={setSelectedTemplateId}
        onSave={saveTemplate}
        onDelete={deleteTemplate}
        onApply={handleApplyTemplate}
        canApply={canManage}
        hasCriteria={currentCriteria.length > 0}
      />
      {!canManage ? (
        <Card style={{ textAlign: "center", padding: "80px 0" }}>
          <Inbox size={40} color="var(--ant-color-text-quaternary)" />
          <Typography.Text type="secondary" style={{ display: "block", marginTop: 16 }}>
            Vui lòng chọn Vòng/Bảng để thiết lập.
          </Typography.Text>
        </Card>
      ) : (
        <Card style={{ borderRadius: 16 }}>
          {currentCriteria.length > 0 && !selectedTiebreakerId && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="Chưa chọn tiêu chí phụ phân xử đồng điểm"
              description="Chọn một tiêu chí ở cột «Tiêu chí phụ» (thường là «Chất lượng giải pháp»)."
            />
          )}
          {currentCriteria.length > 0 && (
            <Alert
              type={isWeightValid ? "success" : "error"}
              style={{ marginBottom: 16 }}
              message={
                isWeightValid
                  ? `Trọng số: ${totalWeight.toFixed(2)}`
                  : `Sai trọng số: ${totalWeight.toFixed(2)}`
              }
              action={
                !isWeightValid && (
                  <Button size="small" onClick={handleAutoBalance}>
                    Cân bằng
                  </Button>
                )
              }
            />
          )}
          <div style={{ marginBottom: 16, display: "flex", gap: 16 }}>
            <Input
              prefix={<Search size={16} />}
              placeholder="Tìm kiếm..."
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
            />
            <Select
              placeholder="Loại"
              allowClear
              onChange={setFilterType}
              style={{ width: 150 }}
            >
              {CRITERIA_TYPE_OPTIONS.map((t) => (
                <Select.Option key={t} value={t}>
                  {formatCriteriaTypeLabel(t)}
                </Select.Option>
              ))}
            </Select>
          </div>
          <Table
            columns={columns}
            dataSource={filteredCriteria}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        </Card>
      )}
      <CriteriaFormModal
        visible={isModalVisible}
        title={editingCriteria ? "Sửa" : "Thêm"}
        initialValues={editingCriteria || {
          display_order:
            (currentCriteria.reduce(
              (max, item) => Math.max(max, Number(item.display_order) || 0),
              0,
            ) || 0) + 1,
        }}
        existingCriteria={currentCriteria}
        editingId={editingCriteria?.id}
        onCancel={() => setIsModalVisible(false)}
        onFinish={(v) => {
          handleSaveCriteria(v, editingCriteria?.id);
          setIsModalVisible(false);
        }}
      />
      <CriteriaCloneModal
        visible={isCloneVisible}
        onCancel={() => setIsCloneVisible(false)}
        onClone={executeClone}
        onApplyStandard={executeApplyStandard}
        {...{
          currentHackathonId: hackathonId,
          hackathonRounds,
          hackathonTracks,
          currentRound,
          selectedRoundId,
          selectedTrackId,
        }}
      />
      <CriteriaBatchModal
        visible={isBatchVisible}
        onCancel={() => setIsBatchVisible(false)}
        onFinish={(i) => {
          handleBatchSaveCriteria(i);
          setIsBatchVisible(false);
        }}
      />
    </div>
  );
};
export default CriteriaManagementPage;
