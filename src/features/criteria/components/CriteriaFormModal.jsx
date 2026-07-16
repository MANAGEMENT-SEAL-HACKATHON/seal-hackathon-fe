import { useEffect } from "react";
import { Modal, Form, Input, InputNumber, Select, Tag } from "antd";
import { CRITERIA_TYPE_OPTIONS, CRITERIA_TYPES, formatCriteriaTypeLabel } from "../constants/criteria.constants";

const { TextArea } = Input;

export const CriteriaFormModal = ({
  visible,
  title,
  initialValues,
  onCancel,
  onFinish,
}) => {
  const [form] = Form.useForm();
  const selectedType = Form.useWatch("type", form);

  useEffect(() => {
    if (visible) {
      initialValues ? form.setFieldsValue(initialValues) : form.resetFields();
    }
  }, [visible, initialValues, form]);

  const preventNegative = (e) => {
    if (e.key === "-" || e.key === "e") e.preventDefault();
  };

  return (
    <Modal
      title={title}
      open={visible}
      onOk={async () => {
        try {
          const v = await form.validateFields();
          onFinish(v);
          form.resetFields();
        } catch { /* validation errors shown by form */ }
      }}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      destroyOnClose
      width={600}
      style={{ top: 30 }}
      styles={{ content: { borderRadius: 16 } }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          type: "TECHNICAL",
          weight: 0.1,
          max_score: 10,
          ...initialValues,
        }}
      >
        <Form.Item
          name="name"
          label="Tên tiêu chí"
          rules={[{ required: true }]}
        >
          <Input size="large" />
        </Form.Item>
        <Form.Item name="type" label="Phân loại" rules={[{ required: true }]}>
          <Select size="large">
            {CRITERIA_TYPE_OPTIONS.map((t) => (
              <Select.Option key={t} value={t}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {formatCriteriaTypeLabel(t)}
                  {t === CRITERIA_TYPES.PENALTY && (
                    <Tag color="orange" style={{ marginInlineEnd: 0 }}>
                      Chưa áp dụng vào xếp hạng
                    </Tag>
                  )}
                </span>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        {selectedType === CRITERIA_TYPES.PENALTY && (
          <Tag color="orange" style={{ marginBottom: 16 }}>
            Chưa áp dụng vào xếp hạng
          </Tag>
        )}

        <div style={{ display: "flex", gap: 24 }}>
          <Form.Item
            name="weight"
            label="Trọng số"
            rules={[{ required: true }]}
            style={{ flex: 1 }}
            help="Điểm phạt không tính vào tổng"
          >
            <InputNumber
              size="large"
              min={0.01}
              max={1}
              step={0.05}
              style={{ width: "100%" }}
              onKeyDown={preventNegative}
            />
          </Form.Item>
          <Form.Item
            name="max_score"
            label="Điểm max"
            rules={[{ required: true }]}
            style={{ flex: 1 }}
          >
            <InputNumber
              size="large"
              min={1}
              max={100}
              style={{ width: "100%" }}
              onKeyDown={preventNegative}
            />
          </Form.Item>
        </div>

        <Form.Item
          name="description"
          label="Mô tả"
          rules={[{ required: true }]}
        >
          <TextArea rows={4} maxLength={500} />
        </Form.Item>
        <Form.Item
          name="rubric_url"
          label="Rubric URL"
          rules={[{ type: "url", message: "URL không hợp lệ", warningOnly: true }]}
        >
          <Input size="large" placeholder="https://..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};
