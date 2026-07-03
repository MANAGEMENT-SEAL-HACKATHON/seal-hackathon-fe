import { Table, Typography } from 'antd';

const { Text } = Typography;

const OrphanUserTable = ({ orphans, loading }) => {
  const columns = [
    {
      title: 'Họ tên',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
  ];

  return (
    <Table
      rowKey="id"
      size="small"
      loading={loading}
      columns={columns}
      dataSource={orphans}
      pagination={{ pageSize: 8, showSizeChanger: false }}
      locale={{ emptyText: 'Không có sinh viên mồ côi' }}
    />
  );
};

export default OrphanUserTable;
