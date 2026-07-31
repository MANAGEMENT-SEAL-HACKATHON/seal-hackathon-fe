import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
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
import { Plus, Pencil, Trash2, Package, Layers, Scale } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import SectionHeader, { HintList } from '../../../shared/components/ui/SectionHeader';
import { kitService, SHIRT_FITS, SHIRT_SIZES } from '../services/kitService';
import { resolveKitError } from '../utils/kitErrors';

const { Text, Title } = Typography;

const KIT_HINT = (
  <HintList
    items={[
      'Khai báo món kit (áo, dây đeo, …) và số lượng theo từng dáng/size trước ngày phát',
      'Áo mặc định dáng UNISEX + size XS–XXL; dây đeo / khác có thể không chia size',
      'Tạo combo mặc định để quầy phát một lần; đối chiếu nhu cầu vs tồn kho trước Kickoff',
    ]}
  />
);

const TYPE_LABELS = {
  SHIRT: 'Áo',
  LANYARD: 'Dây đeo',
  OTHER: 'Khác',
};

const FIT_LABELS = {
  UNISEX: 'Unisex',
  MALE: 'Nam',
  FEMALE: 'Nữ',
};

const KitInventoryPage = ({ hackathonId }) => {
  const queryClient = useQueryClient();
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [bundleModalOpen, setBundleModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [stockTarget, setStockTarget] = useState(null);
  const [editingBundle, setEditingBundle] = useState(null);
  const [itemForm] = Form.useForm();
  const [stockForm] = Form.useForm();
  const [bundleForm] = Form.useForm();
  const watchedType = Form.useWatch('type', itemForm);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['kitItems', hackathonId],
    queryFn: () => kitService.listItems(hackathonId),
    enabled: Boolean(hackathonId),
  });

  const { data: bundles = [], isLoading: bundlesLoading } = useQuery({
    queryKey: ['kitBundles', hackathonId],
    queryFn: () => kitService.listBundles(hackathonId),
    enabled: Boolean(hackathonId),
  });

  const { data: reconciliation, isLoading: reconLoading } = useQuery({
    queryKey: ['kitReconciliation', hackathonId],
    queryFn: () => kitService.reconciliation(hackathonId),
    enabled: Boolean(hackathonId),
  });

  const reconLines = reconciliation?.lines || [];
  const beforeKickoff = reconciliation?.beforeKickoff;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['kitItems', hackathonId] });
    queryClient.invalidateQueries({ queryKey: ['kitBundles', hackathonId] });
    queryClient.invalidateQueries({ queryKey: ['kitReconciliation', hackathonId] });
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
        fit: stockTarget.type === 'SHIRT' ? (values.fit || 'UNISEX') : null,
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

  const saveBundleMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        name: values.name,
        isDefault: Boolean(values.isDefault),
        items: (values.kitItemIds || []).map((kitItemId) => ({
          kitItemId,
          quantity: 1,
        })),
      };
      if (editingBundle) {
        return kitService.updateBundle(editingBundle.id, payload);
      }
      return kitService.createBundle(hackathonId, payload);
    },
    onSuccess: () => {
      toast.success(editingBundle ? 'Đã cập nhật combo' : 'Đã tạo combo');
      setBundleModalOpen(false);
      setEditingBundle(null);
      bundleForm.resetFields();
      invalidate();
    },
    onError: (err) => toast.error(resolveKitError(err)),
  });

  const deleteBundleMutation = useMutation({
    mutationFn: (id) => kitService.deleteBundle(id),
    onSuccess: () => {
      toast.success('Đã xóa combo');
      invalidate();
    },
    onError: (err) => toast.error(resolveKitError(err)),
  });

  const rows = useMemo(() => {
    const list = [];
    (items || []).forEach((item) => {
      const stocks = item.stocks?.length
        ? item.stocks
        : [{ id: `empty-${item.id}`, fit: null, size: null, quantityTotal: 0, quantityIssued: 0, remaining: 0 }];
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

  const openStock = (item, stock, quantityPrefill) => {
    setStockTarget(item);
    stockForm.setFieldsValue({
      fit: stock?.fit || (item.type === 'SHIRT' ? 'UNISEX' : undefined),
      size: stock?.size || (item.hasSize ? 'M' : undefined),
      quantityTotal: quantityPrefill ?? stock?.quantityTotal ?? 0,
    });
    setStockModalOpen(true);
  };

  const openCreateBundle = () => {
    setEditingBundle(null);
    bundleForm.resetFields();
    bundleForm.setFieldsValue({ isDefault: !bundles?.length, kitItemIds: [] });
    setBundleModalOpen(true);
  };

  const openEditBundle = (bundle) => {
    setEditingBundle(bundle);
    bundleForm.setFieldsValue({
      name: bundle.name,
      isDefault: Boolean(bundle.isDefault),
      kitItemIds: (bundle.items || []).map((i) => i.kitItemId),
    });
    setBundleModalOpen(true);
  };

  const quickFillFromRecon = (line) => {
    const item = (items || []).find((i) => i.id === line.kitItemId);
    if (!item) {
      toast.error('Không tìm thấy món kit tương ứng');
      return;
    }
    const matchStock = (item.stocks || []).find(
      (s) =>
        (s.fit || null) === (line.fit || null)
        && (s.size || null) === (line.size || null),
    );
    const targetTotal = line.eligibleCount ?? ((line.quantityTotal || 0) + Math.max(0, line.shortfall || 0));
    openStock(item, matchStock || { fit: line.fit, size: line.size, quantityTotal: line.quantityTotal }, targetTotal);
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
      title: 'Dáng',
      render: (_, row) =>
        row.item.type === 'SHIRT'
          ? (FIT_LABELS[row.stock.fit] || row.stock.fit || <Tag color="warning">Chưa có</Tag>)
          : <Text type="secondary">—</Text>,
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

  const bundleColumns = [
    {
      title: 'Tên combo',
      render: (_, row) => (
        <Space>
          <Text strong>{row.name}</Text>
          {row.isDefault && <Tag color="blue">Mặc định</Tag>}
        </Space>
      ),
    },
    {
      title: 'Món trong combo',
      render: (_, row) =>
        (row.items || []).length
          ? (row.items || []).map((i) => i.kitItemName || `#${i.kitItemId}`).join(', ')
          : <Text type="secondary">Trống</Text>,
    },
    {
      title: 'Thao tác',
      width: 180,
      render: (_, row) => (
        <Space wrap>
          <Button size="small" icon={<Pencil size={14} />} onClick={() => openEditBundle(row)}>
            Sửa
          </Button>
          <Popconfirm title="Xóa combo này?" onConfirm={() => deleteBundleMutation.mutate(row.id)}>
            <Button size="small" danger icon={<Trash2 size={14} />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const reconColumns = [
    {
      title: 'Món',
      dataIndex: 'kitItemName',
    },
    {
      title: 'Dáng',
      dataIndex: 'fit',
      render: (v) => (v ? (FIT_LABELS[v] || v) : '—'),
    },
    {
      title: 'Size',
      dataIndex: 'size',
      render: (v) => v || '—',
    },
    {
      title: 'Tồn tổng',
      dataIndex: 'quantityTotal',
    },
    {
      title: 'Đã phát',
      dataIndex: 'quantityIssued',
    },
    {
      title: 'Còn lại',
      dataIndex: 'remaining',
    },
    {
      title: 'Nhu cầu',
      dataIndex: 'eligibleCount',
    },
    {
      title: 'Thiếu',
      dataIndex: 'shortfall',
      render: (v) => (
        <Text type={v > 0 ? 'danger' : undefined} strong={v > 0}>
          {v ?? 0}
        </Text>
      ),
    },
    {
      title: '',
      width: 120,
      render: (_, row) =>
        row.shortfall > 0 ? (
          <Button size="small" type="link" onClick={() => quickFillFromRecon(row)}>
            Điền tồn
          </Button>
        ) : null,
    },
  ];

  const isOtherType = watchedType === 'OTHER';

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

      <div style={{ marginTop: 32 }}>
        <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }} wrap>
          <Space>
            <Layers size={18} />
            <Title level={5} style={{ margin: 0 }}>Combo kit</Title>
          </Space>
          <Button icon={<Plus size={16} />} onClick={openCreateBundle} disabled={!items?.length}>
            Tạo combo
          </Button>
        </Space>
        <Table
          loading={bundlesLoading}
          dataSource={bundles}
          columns={bundleColumns}
          rowKey="id"
          pagination={false}
          size="middle"
          locale={{ emptyText: 'Chưa có combo — tạo combo mặc định để phát nhanh tại quầy' }}
        />
      </div>

      <div style={{ marginTop: 32 }}>
        <Space style={{ marginBottom: 12 }}>
          <Scale size={18} />
          <Title level={5} style={{ margin: 0 }}>Nhu cầu vs Tồn kho</Title>
        </Space>
        {beforeKickoff === false && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="Đã qua / đang trong Kickoff — nên chốt tồn kho; đối chiếu vẫn xem được để bổ sung gấp."
          />
        )}
        <Table
          loading={reconLoading}
          dataSource={reconLines}
          columns={reconColumns}
          rowKey={(row) => `${row.kitItemId}-${row.fit || ''}-${row.size || ''}`}
          pagination={false}
          size="middle"
          locale={{ emptyText: 'Chưa có dữ liệu đối chiếu' }}
          rowClassName={(row) => (row.shortfall > 0 ? 'kit-recon-shortfall' : '')}
          onRow={(row) =>
            row.shortfall > 0
              ? { style: { background: 'rgba(255, 77, 79, 0.08)' } }
              : {}
          }
        />
      </div>

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
          <Form.Item
            name="name"
            label={isOtherType ? 'Tên vật phẩm' : 'Tên món'}
            rules={[{ required: true, message: isOtherType ? 'Nhập tên vật phẩm' : 'Nhập tên món' }]}
          >
            <Input
              placeholder={isOtherType ? 'VD: Túi rút, sổ tay, bình nước…' : 'Áo SEAL 2026'}
              maxLength={200}
            />
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
          {stockTarget?.type === 'SHIRT' && (
            <Form.Item name="fit" label="Dáng áo" rules={[{ required: true, message: 'Chọn dáng' }]} initialValue="UNISEX">
              <Select
                options={SHIRT_FITS.map((f) => ({ value: f, label: FIT_LABELS[f] || f }))}
              />
            </Form.Item>
          )}
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

      <Modal
        title={editingBundle ? 'Sửa combo kit' : 'Tạo combo kit'}
        open={bundleModalOpen}
        onCancel={() => setBundleModalOpen(false)}
        onOk={() => bundleForm.submit()}
        confirmLoading={saveBundleMutation.isPending}
        destroyOnClose
      >
        <Form
          form={bundleForm}
          layout="vertical"
          onFinish={(values) => saveBundleMutation.mutate(values)}
        >
          <Form.Item name="name" label="Tên combo" rules={[{ required: true, message: 'Nhập tên combo' }]}>
            <Input placeholder="Combo khai mạc" maxLength={200} />
          </Form.Item>
          <Form.Item name="isDefault" valuePropName="checked">
            <Checkbox>Đặt làm combo mặc định (nút Phát combo tại quầy)</Checkbox>
          </Form.Item>
          <Form.Item
            name="kitItemIds"
            label="Chọn món trong combo"
            rules={[{ required: true, type: 'array', min: 1, message: 'Chọn ít nhất một món' }]}
          >
            <Checkbox.Group
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              options={(items || []).map((item) => ({
                value: item.id,
                label: `${item.name} (${TYPE_LABELS[item.type] || item.type})`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KitInventoryPage;
