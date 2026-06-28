// src/features/round-results/components/OfficialRankingPanel.jsx
import { useMemo, useState } from "react";
import { Alert, Card, Empty, Segmented, Space, Table, Tag, Typography } from "antd";
import { TrophyOutlined } from "@ant-design/icons";

const { Text } = Typography;

const score = (value) => Number(value || 0).toFixed(2);

const OfficialRankingPanel = ({
  ranking,
  isLoading,
  error,
  advancePreviewTeamIds,
  rejectedWildcardTeamIds,
  hasAdvanced,
  isPublished,
  rosterDecided,
  wildcardData,
  topN,         
}) => {
  const [selectedGroup, setSelectedGroup] = useState("all");
  const previewSet = useMemo(
    () => advancePreviewTeamIds ?? new Set(),
    [advancePreviewTeamIds],
  );
  const rejectedWildcardSet = useMemo(
    () => rejectedWildcardTeamIds ?? new Set(),
    [rejectedWildcardTeamIds],
  );
  const displayItems = useMemo(() => ranking.items, [ranking.items]);
  const groups = useMemo(
    () => [...new Set(displayItems.map((item) => item.groupLabel))],
    [displayItems],
  );
  const items = useMemo(
    () =>
      selectedGroup === "all"
        ? displayItems
        : displayItems.filter((item) => item.groupLabel === selectedGroup),
    [displayItems, selectedGroup],
  );

  const columns = [
    {
      title: "Hạng",
      dataIndex: "rank",
      width: 80,
      align: "center",
      render: (rank) => {
        let color = undefined;
        let border = "none";
        if (rank === 1) { color = "#d48806"; border = `1px solid ${color}40`; }
        else if (rank === 2) { color = "#595959"; border = `1px solid ${color}40`; }
        else if (rank === 3) { color = "#ad6800"; border = `1px solid ${color}40`; }
        
        return (
          <div style={{
            color: color,
            fontWeight: "bold",
            fontSize: 16,
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            margin: "0 auto",
            border: border
          }}>
            {rank}
          </div>
        );
      },
    },
    {
      title: "Đội thi",
      dataIndex: "teamName",
      render: (name, item) => (
        <Space direction="vertical" size={4}>
          <Text strong style={{ fontSize: 15 }}>{name}</Text>
          <Tag bordered={false} style={{ margin: 0, fontSize: 12 }}>
            {item.groupLabel}
          </Tag>
        </Space>
      ),
    },
    {
      title: "Điểm chính thức",
      dataIndex: "weightedAvgScore",
      align: "right",
      render: (value) => (
        <Text strong style={{ 
          fontSize: 18, 
          fontFamily: 'monospace'
        }}>
          {score(value)}
        </Text>
      ),
    },
    {
      title: "Trạng thái",
      key: "result",
      width: 220,
      render: (_, item) => {
        // Đã chốt chính thức lên BE
        if (item.isAdvanced || item.qualificationStatus === "ADVANCED" || item.participationStatus === "ADVANCED") {
          return <Tag color="success" style={{ fontWeight: 600, padding: "4px 12px", borderRadius: 4 }}>Vào Chung kết</Tag>;
        }
        if (item.participationStatus === "ELIMINATED" || item.isEliminated) {
          return <Tag color="default" style={{ padding: "4px 12px", borderRadius: 4 }}>Bị loại</Tag>;
        }

        // Đang trong giai đoạn Preview (Chờ chốt)
        if (isPublished) {
          const isProposed = previewSet.has(item.teamId);
          const isTopN = item.rank <= topN;
          
          // Kiểm tra xem đội này có nằm trong danh sách Wildcard không
          const wildcardItem = wildcardData?.items?.find(w => w.teamId === item.teamId);

          if (isProposed) {
            // Nếu được đề xuất và nằm trong Top N -> Đi thẳng
            if (isTopN) {
               return <Tag color="processing" style={{ fontWeight: 600, padding: "4px 12px", borderRadius: 4 }}>Đề xuất vào Chung kết</Tag>;
            }
            // Nếu được đề xuất nhưng KHÔNG thuộc Top N -> Chắc chắn là do duyệt Vé vớt
            return <Tag color="purple" style={{ fontWeight: 600, padding: "4px 12px", borderRadius: 4 }}>Vào CK (Vé vớt)</Tag>;
          }

          // Nếu KHÔNG được đề xuất vào CK
          if (wildcardItem) {
             if (wildcardItem.coordinatorApproved === false) {
                 return <Tag color="error" style={{ fontWeight: 600, padding: "4px 12px", borderRadius: 4 }}>Wild Card từ chối</Tag>;
             }
             if (wildcardItem.coordinatorApproved === null || wildcardItem.coordinatorApproved === undefined) {
                 return <Tag color="warning" style={{ fontWeight: 600, padding: "4px 12px", borderRadius: 4 }}>Đang chờ xét Vé vớt</Tag>;
             }
          }

          // Nếu mọi quyết định đã chốt mà vẫn không có tên -> Bị loại
          if (rosterDecided) {
             return <Tag color="default" style={{ padding: "4px 12px", borderRadius: 4 }}>Bị loại</Tag>;
          }

          return <Tag style={{ padding: "4px 12px", borderRadius: 4 }}>Chờ chốt danh sách</Tag>;
        }

        return <Tag style={{ padding: "4px 12px", borderRadius: 4 }}>Chưa công bố</Tag>;
      },
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Alert
        showIcon
        type="info"
        message="Bảng xếp hạng chính thức sau khóa chấm"
        description="Mỗi bảng được xếp hạng độc lập theo điểm trung bình có trọng số. Điểm CALIBRATION và PENALTY không hiển thị trong bảng này."
      />
      {error && <Alert showIcon type="error" message="Không tải được leaderboard" description={error.message} />}
      <Card
        title={<Space><TrophyOutlined style={{ color: '#faad14' }} /><Text strong style={{ fontSize: 16 }}>Bảng điểm xếp hạng</Text></Space>}
        extra={
          <Space size="large">
            <Segmented
              options={[{ label: "Tất cả bảng", value: "all" }, ...groups.map((group) => ({ label: group, value: group }))]}
              value={selectedGroup}
              onChange={setSelectedGroup}
              style={{ fontWeight: 500 }}
            />
            <Tag color="blue" bordered={false} style={{ fontWeight: 600, padding: '2px 8px' }}>
              {displayItems.length} đội
            </Tag>
          </Space>
        }
        style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
      >
        <Table
          rowKey="key"
          columns={columns}
          dataSource={items}
          loading={isLoading}
          pagination={false}
          locale={{ emptyText: <Empty description="Chưa có kết quả chính thức." /> }}
          scroll={{ x: 720 }}
          size="middle"
        />
      </Card>
    </Space>
  );
};

export default OfficialRankingPanel;
