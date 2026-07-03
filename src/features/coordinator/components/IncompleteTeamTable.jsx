import { Button, Space, Table, Typography } from 'antd';

const { Text } = Typography;

const IncompleteTeamTable = ({ teams, loading, onAddMember, onMerge }) => {
  const columns = [
    {
      title: 'Tên đội',
      dataIndex: 'teamName',
      key: 'teamName',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Thành viên',
      key: 'memberCount',
      render: (_, record) => `${record.memberCount}/${record.maxMembers}`,
    },
    {
      title: 'Nhóm trưởng',
      dataIndex: 'leaderName',
      key: 'leaderName',
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => {
        const isFull = record.memberCount >= record.maxMembers;
        const isLocked = record.isLocked;

        return (
          <Space wrap>
            <Button
              size="small"
              type="primary"
              disabled={isFull || isLocked}
              onClick={() => onAddMember(record)}
            >
              Thêm thành viên
            </Button>
            <Button
              size="small"
              disabled={isLocked}
              onClick={() => onMerge(record)}
            >
              Gộp đội
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Table
      rowKey="teamId"
      size="small"
      loading={loading}
      columns={columns}
      dataSource={teams}
      pagination={{ pageSize: 8, showSizeChanger: false }}
      locale={{ emptyText: 'Không có đội thiếu người' }}
    />
  );
};

export default IncompleteTeamTable;
