import { useState } from 'react';
import { Checkbox, Form, Modal, Select, Switch } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { kitService } from '../services/kitService';
import { resolveKitError } from '../utils/kitErrors';

const KitCloneModal = ({ open, hackathonId, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['kitCloneSources', hackathonId],
    queryFn: () => kitService.listCloneSources(hackathonId),
    enabled: open && Boolean(hackathonId),
  });

  const sources = data?.sources || [];

  const cloneMutation = useMutation({
    mutationFn: (values) =>
      kitService.cloneKits(hackathonId, {
        sourceHackathonId: values.sourceHackathonId,
        includeStockQuantities: Boolean(values.includeStockQuantities),
        includeBundles: values.includeBundles !== false,
      }),
    onSuccess: (res) => {
      const cloned = res?.itemsCloned ?? 0;
      const skipped = res?.itemsSkipped ?? 0;
      const bundles = res?.bundlesCloned ?? 0;
      toast.success(`Đã sao chép ${cloned} món (bỏ qua ${skipped}), ${bundles} combo`);
      queryClient.invalidateQueries({ queryKey: ['kitItems', hackathonId] });
      queryClient.invalidateQueries({ queryKey: ['kitBundles', hackathonId] });
      queryClient.invalidateQueries({ queryKey: ['kitReconciliation', hackathonId] });
      onSuccess?.();
      onClose();
      form.resetFields();
    },
    onError: (err) => toast.error(resolveKitError(err)),
  });

  return (
    <Modal
      title="Sao chép kit từ kỳ khác"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={cloneMutation.isPending}
      destroyOnClose
      okText="Sao chép"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ includeBundles: true, includeStockQuantities: false }}
        onFinish={(v) => cloneMutation.mutate(v)}
      >
        <Form.Item
          name="sourceHackathonId"
          label="Kỳ nguồn"
          rules={[{ required: true, message: 'Chọn kỳ có kit' }]}
        >
          <Select
            loading={isLoading}
            placeholder={sources.length ? 'Chọn hackathon' : 'Không có kỳ nào có kit'}
            options={sources.map((s) => ({
              value: s.hackathonId,
              label: `${s.hackathonName} (${s.itemCount} món, ${s.bundleCount} combo)`,
            }))}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item name="includeBundles" valuePropName="checked">
          <Checkbox>Sao chép cả combo (combo mặc định không cướp default hiện có)</Checkbox>
        </Form.Item>
        <Form.Item name="includeStockQuantities" valuePropName="checked">
          <Checkbox>Sao chép số lượng tồn (tắt = khung size/dáng, qty = 0)</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default KitCloneModal;
