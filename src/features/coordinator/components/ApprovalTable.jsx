import { useEffect, useState } from "react";
import { Empty, Grid, Input, Modal, Spin, Typography } from "antd";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import { useApproval } from "../hooks/useApproval";
import { TEAM_STATUS, TEAM_STATUS_LABELS } from "../constants/team.constants";
import ApprovalSummary from "./ApprovalSummary";
import BulkApproveBar from "./BulkApproveBar";
import TeamDesktopTable from "./TeamDesktopTable";
import TeamFilters from "./TeamFilters";
import TeamMobileCard from "./TeamMobileCard";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const statusOptions = [
  TEAM_STATUS.PENDING,
  TEAM_STATUS.ACTIVE,
  TEAM_STATUS.REJECTED,
  TEAM_STATUS.ELIMINATED,
].map((status) => ({
  label: TEAM_STATUS_LABELS[status],
  value: status,
}));

const reviewFilterOptions = [
  { label: "Tất cả", value: "ALL" },
  { label: "Đủ điều kiện", value: "READY" },
  { label: "Chờ leader xác nhận", value: "GRACE" },
  { label: "Cần xem lại", value: "BLOCKED" },
];

const viewContent = {
  [TEAM_STATUS.PENDING]: {
    title: "Hàng chờ phê duyệt",
    description: "Rà điều kiện đội trước khi chuyển sang ACTIVE.",
  },
  [TEAM_STATUS.ACTIVE]: {
    title: "Đội đã duyệt",
    description: "Theo dõi các đội đang hợp lệ và trạng thái khóa thành viên.",
  },
  [TEAM_STATUS.REJECTED]: {
    title: "Đội bị từ chối",
    description: "Tra cứu các đội đã bị từ chối và lý do xử lý.",
  },
  [TEAM_STATUS.ELIMINATED]: {
    title: "Đội bị loại",
    description: "Tra cứu các đội đã kết thúc hành trình thi đấu.",
  },
};

const ApprovalTable = ({ hackathonId }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const {
    teams,
    teamDetails,
    isLoading,
    isActionLoading,
    loadingTeamDetailIds,
    fetchTeams,
    loadTeamDetail,
    handleApprove,
    handleReject,
    handleDisband,
    handleBulkApprove,
  } = useApproval(hackathonId);

  const [selectedStatus, setSelectedStatus] = useState(TEAM_STATUS.PENDING);
  const [reviewFilter, setReviewFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [expandedTeamIds, setExpandedTeamIds] = useState([]);
  const [rejectModal, setRejectModal] = useState({
    open: false,
    teamId: null,
    teamName: "",
    reason: "",
  });
  const [disbandModal, setDisbandModal] = useState({
    open: false,
    teamId: null,
    teamName: "",
    memberStats: "",
  });

  useEffect(() => {
    if (hackathonId) fetchTeams(selectedStatus);
  }, [hackathonId, selectedStatus, fetchTeams]);

  const isPendingView = selectedStatus === TEAM_STATUS.PENDING;
  const canReviewTeam = (team) => team.status === TEAM_STATUS.PENDING;
  const isInFormationGrace = (team) => Boolean(team.isInFormationGracePeriod);
  const canApproveTeam = (team) =>
    canReviewTeam(team) &&
    !team.isInvalidMemberCount &&
    !team.hasPendingInvites &&
    team.formationSubmitted;
  const canRejectTeam = (team) => canReviewTeam(team) && !isInFormationGrace(team);
  const canDisbandTeam = (team) =>
    (team.status === TEAM_STATUS.PENDING || team.status === TEAM_STATUS.ACTIVE) && !team.hasMentor;

  const getApproveBlockReason = (team) => {
    if (!canReviewTeam(team)) return "Chỉ đội PENDING mới có thể được duyệt.";
    if (team.isInvalidMemberCount) {
      return `Đội phải có từ ${team.minTeamSize}-${team.maxTeamSize} thành viên ACCEPTED mới được duyệt.`;
    }
    if (team.hasPendingInvites) {
      return "Đội vẫn còn lời mời PENDING, cần xử lý trước khi duyệt.";
    }
    if (!team.formationSubmitted) {
      if (isInFormationGrace(team)) {
        return `Trưởng nhóm đang có 24h để xác nhận thành lập (đến ${dayjs(team.formationGraceDeadlineAt).format('DD/MM/YYYY HH:mm')}) — chưa cần duyệt.`;
      }
      return "Trưởng nhóm chưa xác nhận thành lập đội — chỉ duyệt sau khi leader bấm xác nhận.";
    }
    return "";
  };

  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      !normalizedSearch ||
      team.teamName?.toLowerCase().includes(normalizedSearch) ||
      team.leaderName?.toLowerCase().includes(normalizedSearch) ||
      team.members?.some((member) =>
        [member.fullName, member.email]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch)),
      );

    if (!matchesSearch) return false;
    if (isPendingView && reviewFilter === "READY") return canApproveTeam(team);
    if (isPendingView && reviewFilter === "GRACE") return isInFormationGrace(team);
    if (isPendingView && reviewFilter === "BLOCKED") {
      return canReviewTeam(team) && !canApproveTeam(team) && !isInFormationGrace(team);
    }
    return true;
  });

  const readyCount = teams.filter(canApproveTeam).length;
  const graceCount = teams.filter(isInFormationGrace).length;
  const blockedCount = teams.filter(
    (team) => canReviewTeam(team) && !canApproveTeam(team) && !isInFormationGrace(team),
  ).length;
  const lockedCount = teams.filter((team) => team.isLocked).length;
  const memberCount = teams.reduce((sum, team) => sum + (team.acceptedMemberCount || 0), 0);
  const metrics = isPendingView
    ? [
        { label: TEAM_STATUS_LABELS[selectedStatus], value: teams.length },
        { label: "Đủ điều kiện", value: readyCount },
        { label: "Chờ leader xác nhận", value: graceCount },
        { label: "Cần xem lại", value: blockedCount },
      ]
    : [
        { label: TEAM_STATUS_LABELS[selectedStatus], value: teams.length },
        { label: "Đã khóa", value: lockedCount },
        { label: "Thành viên", value: memberCount },
      ];

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    setReviewFilter("ALL");
    setSelectedRowKeys([]);
    setExpandedTeamIds([]);
  };

  const removeTeamFromSelection = (teamId) => {
    setSelectedRowKeys((prev) => prev.filter((id) => id !== teamId));
    setExpandedTeamIds((prev) => prev.filter((id) => id !== teamId));
  };

  const onSingleApprove = async (teamId) => {
    if (await handleApprove(teamId)) removeTeamFromSelection(teamId);
  };

  const onConfirmDisband = async () => {
    if (!disbandModal.teamId) return;
    if (await handleDisband(disbandModal.teamId)) {
      removeTeamFromSelection(disbandModal.teamId);
      setDisbandModal({ open: false, teamId: null, teamName: "", memberStats: "" });
    }
  };

  const onConfirmReject = async () => {
    if (!rejectModal.reason.trim()) return;
    if (await handleReject(rejectModal.teamId, rejectModal.reason.trim())) {
      removeTeamFromSelection(rejectModal.teamId);
      setRejectModal({ open: false, teamId: null, teamName: "", reason: "" });
    }
  };

  const onBulkApprove = async () => {
    if (await handleBulkApprove(selectedRowKeys)) setSelectedRowKeys([]);
  };

  const openRejectModal = (team) => {
    setRejectModal({ open: true, teamId: team.id, teamName: team.teamName, reason: "" });
  };

  const openDisbandModal = (team) => {
    setDisbandModal({
      open: true,
      teamId: team.id,
      teamName: team.teamName,
      memberStats: team.memberStats || "",
    });
  };

  const toggleMobileDetail = (teamId) => {
    setExpandedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    );
    loadTeamDetail(teamId);
  };

  const emptyDescription =
    searchText || reviewFilter !== "ALL"
      ? "Không tìm thấy đội nào phù hợp với bộ lọc"
      : `Không có đội ${TEAM_STATUS_LABELS[selectedStatus].toLowerCase()}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28 }}>
      <ApprovalSummary
        title={viewContent[selectedStatus].title}
        description={viewContent[selectedStatus].description}
        metrics={metrics}
      />

      <TeamFilters
        statusOptions={statusOptions}
        selectedStatus={selectedStatus}
        onStatusChange={handleStatusChange}
        searchText={searchText}
        onSearchChange={setSearchText}
        showReviewFilter={isPendingView}
        reviewFilterOptions={reviewFilterOptions}
        reviewFilter={reviewFilter}
        onReviewFilterChange={setReviewFilter}
        isLoading={isLoading}
        onRefresh={() => fetchTeams(selectedStatus)}
      />

      <AnimatePresence>
        {selectedRowKeys.length > 0 && (
          <BulkApproveBar
            selectedCount={selectedRowKeys.length}
            loading={isActionLoading}
            onApprove={onBulkApprove}
          />
        )}
      </AnimatePresence>

      {isMobile ? (
        <Spin spinning={isLoading}>
          {filteredTeams.length ? (
            <div style={{ display: "grid", gap: 12 }}>
              <AnimatePresence>
                {filteredTeams.map((team) => (
                  <TeamMobileCard
                    key={team.id}
                    team={team}
                    checked={selectedRowKeys.includes(team.id)}
                    disabledReason={getApproveBlockReason(team)}
                    canApprove={canApproveTeam(team)}
                    canReject={canRejectTeam(team)}
                    canDisband={canDisbandTeam(team)}
                    selectable={isPendingView}
                    loading={isActionLoading}
                    expanded={expandedTeamIds.includes(team.id)}
                    detail={teamDetails[team.id]}
                    detailLoading={loadingTeamDetailIds.includes(team.id)}
                    onCheck={(checked) =>
                      setSelectedRowKeys((prev) =>
                        checked ? [...prev, team.id] : prev.filter((id) => id !== team.id),
                      )
                    }
                    onToggleDetail={() => toggleMobileDetail(team.id)}
                    onApprove={() => onSingleApprove(team.id)}
                    onReject={() => openRejectModal(team)}
                    onDisband={() => openDisbandModal(team)}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />
          )}
        </Spin>
      ) : (
        <TeamDesktopTable
          teams={filteredTeams}
          rowSelection={isPendingView ? {
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (record) => ({ disabled: !canApproveTeam(record) }),
          } : undefined}
          isLoading={isLoading}
          teamDetails={teamDetails}
          loadingTeamDetailIds={loadingTeamDetailIds}
          loadTeamDetail={loadTeamDetail}
          emptyDescription={emptyDescription}
          isActionLoading={isActionLoading}
          canApproveTeam={canApproveTeam}
          canRejectTeam={canRejectTeam}
          canDisbandTeam={canDisbandTeam}
          getApproveBlockReason={getApproveBlockReason}
          onApprove={onSingleApprove}
          onReject={openRejectModal}
          onDisband={openDisbandModal}
        />
      )}

      <Modal
        title={`Từ chối đội ${rejectModal.teamName || ""}`}
        open={rejectModal.open}
        width={isMobile ? "calc(100vw - 32px)" : 520}
        onOk={onConfirmReject}
        onCancel={() => setRejectModal({ open: false, teamId: null, teamName: "", reason: "" })}
        confirmLoading={isActionLoading}
        okButtonProps={{ danger: true, disabled: !rejectModal.reason.trim() }}
        okText="Từ chối"
        cancelText="Hủy"
      >
        <Text type="secondary">
          Lý do từ chối sẽ được gửi kèm trạng thái REJECTED để đội biết cần xử lý gì.
        </Text>
        <Input.TextArea
          rows={4}
          placeholder="Nhập lý do từ chối..."
          value={rejectModal.reason}
          onChange={(event) =>
            setRejectModal((prev) => ({ ...prev, reason: event.target.value }))
          }
          style={{ marginTop: 12 }}
        />
      </Modal>

      <Modal
        title="Giải tán đội thi?"
        open={disbandModal.open}
        width={isMobile ? "calc(100vw - 32px)" : 520}
        onOk={onConfirmDisband}
        onCancel={() =>
          setDisbandModal({ open: false, teamId: null, teamName: "", memberStats: "" })
        }
        confirmLoading={isActionLoading}
        okButtonProps={{ danger: true }}
        okText="Giải tán"
        cancelText="Hủy"
      >
        <Text>
          Bạn sắp giải tán đội <Text strong>{disbandModal.teamName || ""}</Text>
          {disbandModal.memberStats ? ` (${disbandModal.memberStats} thành viên)` : ""}.
        </Text>
        <Text type="secondary" style={{ display: "block", marginTop: 12 }}>
          Hành động này xóa đội và giải phóng thành viên. Chỉ thực hiện khi đội chưa có dữ liệu
          thi đấu bị ràng buộc. Thao tác không thể hoàn tác.
        </Text>
      </Modal>
    </motion.div>
  );
};

export default ApprovalTable;
