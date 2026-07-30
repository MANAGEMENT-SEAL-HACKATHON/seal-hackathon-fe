import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import SectionHeader, { HintList } from '../../../shared/components/ui/SectionHeader';
import { kitService, SHIRT_SIZES } from '../services/kitService';
import { resolveKitError } from '../utils/kitErrors';

const { Text } = Typography;

const KIT_HINT = (
  <HintList
    items={[
      'Khai báo món kit (áo, dây đeo, …) và số lượng theo từng size trước ngày phát',
      'Áo mặc định có size XS–XXL; dây đeo / khác có thể không chia size',
      'Số lượng tổng không được nhỏ hơn số đã phát',
    ]}
  />
);

const TYPE_LABELS = {
  SHIRT: 'Áo',
  LANYARD: 'Dây đeo',
  OTHER: 'Khác',
};

const KitInventoryPage = ({ hackathonId }) => {
  const queryClient = useQueryClient();
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [stockTarget, setStockTarget] = useState(null);
  const [itemForm] = Form.useForm();
  const [stockForm] = Form.useForm();
  const watchedType = Form.useWatch('type', itemForm);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['kitItems', hackathonId],
    queryFn: () => kitService.listItems(hackathonId),
    enabled: Boolean(hackathonId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['kitItems', hackathonId] });
  };

  const saveItemMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        name: values.name,
        type: values.type,
        hasSize: values.hasSize,
      };
      if (editingItem) {
        return kitService.updateItem(editingItem.id, payload);
      }
      return kitService.createItem(hackathonId, payload);
    },
    onSuccess: () => {
      toast.success(editingItem ? 'Đã cập nhật món kit' : 'Đã thêm món kit');
      setItemModalOpen(false);
      setEditingItem(null);
      itemForm.resetFields();
      invalidate();
    },
    onError: (err) => toast.error(resolveKitError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => kitService.deleteItem(id),
    onSuccess: () => {
      toast.success('Đã xóa món kit');
      invalidate();
    },
    onError: (err) => toast.error(resolveKitError(err)),
  });

  const stockMutation = useMutation({
    mutationFn: (values) =>
      kitService.upsertStock(stockTarget.id, {
        size: stockTarget.hasSize ? values.size : null,
        quantityTotal: values.quantityTotal,
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật tồn kho');
      setStockModalOpen(false);
      setStockTarget(null);
      stockForm.resetFields();
      invalidate();
    },
    onError: (err) => toast.error(resolveKitError(err)),
  });

  const rows = useMemo(() => {
    const list = [];
    (items || []).forEach((item) => {
      const stocks = item.stocks?.length ? item.stocks : [{ id: `empty-${item.id}`, size: null, quantityTotal: 0, quantityIssued: 0, remaining: 0 }];
      stocks.forEach((stock, idx) => {
        list.push({
          key: `${item.id}-${stock.id ?? idx}`,
          item,
          stock,
          isFirst: idx === 0,
          rowSpan: idx === 0 ? stocks.length : 0,
        });
      });
    });
    return list;
  }, [items]);

  const openCreate = () => {
    setEditingItem(null);
    itemForm.resetFields();
    itemForm.setFieldsValue({ type: 'SHIRT', hasSize: true });
    setItemModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    itemForm.setFieldsValue({
      name: item.name,
      type: item.type,
      hasSize: Boolean(item.hasSize),
    });
    setItemModalOpen(true);
  };

  const openStock = (item, stock) => {
    setStockTarget(item);
    stockForm.setFieldsValue({
      size: stock?.size || (item.hasSize ? 'M' : undefined),
      quantityTotal: stock?.quantityTotal ?? 0,
    });
    setStockModalOpen(true);
  };

  const columns = [
    {
      title: 'Món',
      dataIndex: ['item', 'name'],
      render: (_, row) => ({
        children: (
          <Space direction="vertical" size={0}>
            <Text strong>{row.item.name}</Text>
            <Tag>{TYPE_LABELS[row.item.type] || row.item.type}</Tag>
          </Space>
        ),
        props: { rowSpan: row.rowSpan },
      }),
    },
    {
      title: 'Size',
      render: (_, row) =>
        row.item.hasSize ? (row.stock.size || <Tag color="warning">Chưa có</Tag>) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Tổng',
      render: (_, row) => row.stock.quantityTotal ?? 0,
    },
    {
      title: 'Đã phát',
      render: (_, row) => row.stock.quantityIssued ?? 0,
    },
    {
      title: 'Còn lại',
      render: (_, row) => {
        const rem = row.stock.remaining ?? Math.max(0, (row.stock.quantityTotal || 0) - (row.stock.quantityIssued || 0));
        return <Text type={rem <= 5 ? 'danger' : undefined} strong={rem <= 5}>{rem}</Text>;
      },
    },
    {
      title: 'Thao tác',
      render: (_, row) => ({
        children: (
          <Space wrap>
            <Button size="small" icon={<Package size={14} />} onClick={() => openStock(row.item, row.stock)}>
              Tồn kho
            </Button>
            <Button size="small" icon={<Pencil size={14} />} onClick={() => openEdit(row.item)}>
              Sửa
            </Button>
            <Popconfirm
              title="Xóa món kit này?"
              description="Xóa luôn tồn kho và lịch sử phát liên quan."
              onConfirm={() => deleteMutation.mutate(row.item.id)}
            >
              <Button size="small" danger icon={<Trash2 size={14} />}>
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        ),
        props: { rowSpan: row.rowSpan },
      }),
    },
  ];

  return (
    <div>
      <SectionHeader
        title="Vật phẩm & Kit"
        info={KIT_HINT}
        extra={
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
            Thêm món
          </Button>
        }
      />

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Khai báo tồn kho trước ngày phát. Quầy phát dùng menu «Quầy phát kit»."
      />

      <Table
        loading={isLoading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        size="middle"
        locale={{ emptyText: 'Chưa có món kit nào' }}
      />

      <Modal
        title={editingItem ? 'Sửa món kit' : 'Thêm món kit'}
        open={itemModalOpen}
        onCancel={() => setItemModalOpen(false)}
        onOk={() => itemForm.submit()}
        confirmLoading={saveItemMutation.isPending}
        destroyOnClose
      >
        <Form
          form={itemForm}
          layout="vertical"
          onFinish={(values) => saveItemMutation.mutate(values)}
        >
          <Form.Item name="name" label="Tên món" rules={[{ required: true, message: 'Nhập tên món' }]}>
            <Input placeholder="Áo SEAL 2026" maxLength={200} />
          </Form.Item>
          <Form.Item name="type" label="Loại" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'SHIRT', label: 'Áo' },
                { value: 'LANYARD', label: 'Dây đeo' },
                { value: 'OTHER', label: 'Khác' },
              ]}
              onChange={(v) => itemForm.setFieldValue('hasSize', v === 'SHIRT')}
            />
          </Form.Item>
          <Form.Item name="hasSize" label="Chia theo size" valuePropName="checked">
            <Switch disabled={watchedType === 'SHIRT'} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Tồn kho — ${stockTarget?.name || ''}`}
        open={stockModalOpen}
        onCancel={() => setStockModalOpen(false)}
        onOk={() => stockForm.submit()}
        confirmLoading={stockMutation.isPending}
        destroyOnClose
      >
        <Form form={stockForm} layout="vertical" onFinish={(v) => stockMutation.mutate(v)}>
          {stockTarget?.hasSize && (
            <Form.Item name="size" label="Size" rules={[{ required: true, message: 'Chọn size' }]}>
              <Select options={SHIRT_SIZES.map((s) => ({ value: s, label: s }))} />
            </Form.Item>
          )}
          <Form.Item
            name="quantityTotal"
            label="Số lượng tổng"
            rules={[{ required: true, message: 'Nhập số lượng' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KitInventoryPage;
