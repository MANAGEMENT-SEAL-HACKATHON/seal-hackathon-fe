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
      render: (_, record) => {
        const overMax = record.memberCount > record.maxMembers;
        return (
          <Text type={overMax ? 'danger' : undefined}>
            {record.memberCount}/{record.maxMembers}
            {overMax ? ' (thừa)' : ''}
          </Text>
        );
      },
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
        const overMax = record.memberCount > record.maxMembers;
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
              disabled={isLocked || overMax}
              onClick={() => onMerge(record)}
            >
              {overMax ? 'Thừa người — không gộp' : 'Gộp đội'}
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
      pagination={{ pageSize: 10, showSizeChanger: false }}
      locale={{ emptyText: 'Không có đội cần giải cứu' }}
    />
  );
};

export default IncompleteTeamTable;
