import { Empty, Space, Spin, Table, Tag, Tooltip, Typography, theme } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import TeamActionButtons from "./TeamActionButtons";
import TeamMemberList from "./TeamMemberList";
import TeamJourneyPanel from "../../teams/components/TeamJourneyPanel";
import TeamMentorHistoryPanel from "../../teams/components/TeamMentorHistoryPanel";

const { Text } = Typography;

const TeamDesktopTable = ({
  teams,
  rowSelection,
  isLoading,
  teamDetails,
  loadingTeamDetailIds,
  loadTeamDetail,
  emptyDescription,
  isActionLoading,
  canApproveTeam,
  canRejectTeam,
  canDisbandTeam,
  getApproveBlockReason,
  onApprove,
  onReject,
  onDisband,
}) => {
  const { token } = theme.useToken();

  const renderExpandedRow = (record) => {
    const detail = teamDetails[record.id] || record;
    const isDetailLoading = loadingTeamDetailIds.includes(record.id);

    if (isDetailLoading) {
      return (
        <div style={{ padding: "22px 0", textAlign: "center" }}>
          <Spin size="small" /> <Text type="secondary">Đang tải chi tiết đội...</Text>
        </div>
      );
    }

    return (
      <>
        <TeamMemberList members={detail.members || []} />
        <TeamJourneyPanel teamId={record.id} teamName={record.teamName} />
        <TeamMentorHistoryPanel teamId={record.id} teamName={record.teamName} />
      </>
    );
  };

  const columns = [
    {
      title: "Tên đội",
      dataIndex: "teamName",
      key: "teamName",
      render: (text, record) => (
        <Space direction="vertical" size={5}>
          <Text strong style={{ color: token.colorText, fontSize: 15, overflowWrap: "anywhere" }}>
            {text}
          </Text>
          <Space size={[6, 6]} wrap>
            {record.isLocked && <Tag color="default">Đã khóa</Tag>}
          </Space>
        </Space>
      ),
    },
    {
      title: "Trưởng nhóm",
      dataIndex: "leaderName",
      key: "leaderName",
      responsive: ["md"],
    },
    {
      title: "Thành viên",
      dataIndex: "memberStats",
      key: "memberStats",
      align: "center",
      render: (text, record) => (
        <Space direction="vertical" size={4}>
          <Text strong style={{ color: record.isInvalidMemberCount ? token.colorError : token.colorText }}>
            {text}
          </Text>
          {record.isInvalidMemberCount && (
            <Tooltip title="Đội thi hợp lệ phải có từ 3 đến 5 thành viên ACCEPTED.">
              <Tag color="error" style={{ margin: 0 }}>
                Chưa đủ
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: "Ngày đăng ký",
      dataIndex: "registeredAt",
      key: "registeredAt",
      responsive: ["lg"],
    },
    {
      title: "Trạng thái",
      key: "status",
      render: (_, record) => <Tag color={record.statusColor}>{record.statusLabel}</Tag>,
    },
    {
      title: "Hành động",
      key: "action",
      align: "right",
      render: (_, record) => (
        <TeamActionButtons
          disabledReason={getApproveBlockReason(record)}
          canApprove={canApproveTeam(record)}
          canReject={canRejectTeam(record)}
          canDisband={canDisbandTeam(record)}
          loading={isActionLoading}
          onApprove={() => onApprove(record.id)}
          onReject={() => onReject(record)}
          onDisband={() => onDisband(record)}
        />
      ),
    },
  ];

  return (
    <Table
      rowSelection={rowSelection}
      columns={columns}
      dataSource={teams}
      loading={isLoading}
      size="middle"
      style={{
        background: token.colorBgContainer,
        borderRadius: token.borderRadiusLG * 1.5,
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.05), 0 2px 6px rgba(0, 0, 0, 0.02)",
        overflow: "hidden",
      }}
      expandable={{
        expandedRowRender: renderExpandedRow,
        expandRowByClick: false,
        onExpand: (expanded, record) => {
          if (expanded) loadTeamDetail(record.id);
        },
      }}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đội`,
      }}
      locale={{
        emptyText: (
          <Empty
            image={<InboxOutlined style={{ color: token.colorTextDisabled, fontSize: 44 }} />}
            description={emptyDescription}
            style={{ padding: "34px 0" }}
          />
        ),
      }}
    />
  );
};

export default TeamDesktopTable;
