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
  theme,
  Input,
  Select,
  Divider,
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
import { useCriteriaManagement } from "../hooks/useCriteriaManagement";
import {
  CRITERIA_TYPES,
  CRITERIA_TYPE_OPTIONS,
  CRITERIA_COLORS,
} from "../constants/criteria.constants";
import { CriteriaHeader } from "../components/CriteriaHeader";
import { CriteriaFormModal } from "../components/CriteriaFormModal";
import { CriteriaCloneModal } from "../components/CriteriaCloneModal";
import { CriteriaBatchModal } from "../components/CriteriaBatchModal";
import { STANDARD_SYSTEM_CRITERIA } from "../constants/standardCriteria";

const CriteriaManagementPage = ({ hackathonId }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCloneVisible, setIsCloneVisible] = useState(false);
  const [isBatchVisible, setIsBatchVisible] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState(null);
  const { token } = theme.useToken();

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
    deleteCriteria,
    updateRound,
  } = useCriteriaManagement(hackathonId);

  const filteredCriteria = useMemo(() => {
    return currentCriteria.filter(
      (i) =>
        i.name.toLowerCase().includes(searchText.toLowerCase()) &&
        (filterType ? i.type === filterType : true),
    );
  }, [currentCriteria, searchText, filterType]);

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
      render: (t) => <strong>{t}</strong>,
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 140,
      render: (t) => <Tag color={CRITERIA_COLORS[t]}>{t}</Tag>,
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

  return (
    <div>
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
      {!currentRound || (!currentRound.is_final && !selectedTrackId) ? (
        <Card style={{ textAlign: "center", padding: "80px 0" }}>
          <Inbox size={40} color="#ccc" />
          <Typography.Text type="secondary" style={{ display: "block", marginTop: 16 }}>
            Vui lòng chọn Vòng/Bảng để thiết lập.
          </Typography.Text>
        </Card>
      ) : (
        <Card style={{ borderRadius: 16 }}>
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
                  {t}
                </Select.Option>
              ))}
            </Select>
          </div>
          <Table
            columns={columns}
            dataSource={filteredCriteria}
            rowKey="id"
            pagination={{ pageSize: 5 }}
          />
          <Divider />
          <Space style={{ display: "flex", justifyContent: "center" }}>
            <Button
              icon={<Copy size={16} />}
              onClick={() => setIsCloneVisible(true)}
            >
              Sao chép
            </Button>
            <Button
              icon={<FileText size={16} />}
              onClick={() => setIsBatchVisible(true)}
            >
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
