import { useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Typography,
} from "antd";
import { Edit, Plus, Trash2 } from "lucide-react";
import {
  CRITERIA_TYPE_OPTIONS,
  formatCriteriaTypeLabel,
} from "../constants/criteria.constants";

const emptyItem = {
  name: "",
  type: "TECHNICAL",
  weight: 0.25,
  maxScore: 10,
  description: "",
  displayOrder: 1,
};

export const CriteriaTemplatePanel = ({
  templates,
  selectedTemplateId,
  onSelect,
  onSave,
  onDelete,
  onApply,
  canApply,
  hasCriteria,
}) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const selected = templates.find((item) => item.id === selectedTemplateId);
  const defaultTemplate = templates.find((item) => item.isDefault);

  const showEditor = (template) => {
    setEditing(template || null);
    form.setFieldsValue(template || {
      name: "",
      description: "",
      isDefault: false,
      items: [{ ...emptyItem }],
    });
    setOpen(true);
  };

  const confirmApply = (templateId) => {
    if (!templateId) return;
    Modal.confirm({
      title: "Áp dụng mẫu tiêu chí?",
      content: hasCriteria
        ? "Bộ tiêu chí hiện tại sẽ được thay thế bằng mẫu đã chọn."
        : "Các tiêu chí trong mẫu sẽ được thêm vào phạm vi đang chọn.",
      okText: "Áp dụng",
      cancelText: "Hủy",
      onOk: () => onApply(templateId, hasCriteria),
    });
  };

  return (
    <Card
      size="small"
      title="Mẫu tiêu chí"
      style={{ marginBottom: 16, borderRadius: 12 }}
      extra={
        <Button size="small" icon={<Plus size={14} />} onClick={() => showEditor(null)}>
          Tạo mẫu
        </Button>
      }
    >
      <Space wrap>
        <Select
          data-testid="criteria-template-select"
          value={selectedTemplateId}
          onChange={onSelect}
          placeholder="Chọn mẫu tiêu chí"
          style={{ minWidth: 260 }}
          options={templates.map((template) => ({
            value: template.id,
            label: `${template.name}${template.isDefault ? " (mặc định)" : ""}`,
          }))}
        />
        <Button
          data-testid="criteria-apply-template"
          type="primary"
          disabled={!canApply || !defaultTemplate}
          onClick={() => confirmApply(defaultTemplate?.id)}
        >
          Áp dụng mẫu mặc định
        </Button>
        <Button disabled={!canApply || !selected} onClick={() => confirmApply(selected?.id)}>
          Áp dụng mẫu đã chọn
        </Button>
        <Button
          icon={<Edit size={14} />}
          disabled={!selected}
          onClick={() => showEditor(selected)}
        >
          Sửa
        </Button>
        <Popconfirm
          title="Xóa mẫu tiêu chí này?"
          onConfirm={() => onDelete(selected?.id)}
          disabled={!selected || selected?.isDefault}
        >
          <Button
            danger
            icon={<Trash2 size={14} />}
            disabled={!selected || selected?.isDefault}
          >
            Xóa
          </Button>
        </Popconfirm>
      </Space>
      {selected?.description && (
        <Typography.Paragraph type="secondary" style={{ margin: "12px 0 0" }}>
          {selected.description}
        </Typography.Paragraph>
      )}

      <Modal
        open={open}
        title={editing ? "Chỉnh sửa mẫu tiêu chí" : "Tạo mẫu tiêu chí"}
        width={860}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            if (await onSave(values, editing?.id)) setOpen(false);
          }}
        >
          <Space align="start" style={{ width: "100%" }}>
            <Form.Item
              name="name"
              label="Tên mẫu"
              rules={[{ required: true, message: "Nhập tên mẫu" }]}
            >
              <Input style={{ width: 360 }} />
            </Form.Item>
            <Form.Item name="isDefault" label="Mẫu mặc định" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <Card key={field.key} size="small" style={{ marginBottom: 10 }}>
                    <Space align="start" wrap>
                      <Form.Item
                        {...field}
                        name={[field.name, "name"]}
                        label={`Tiêu chí ${index + 1}`}
                        rules={[{ required: true, message: "Nhập tên" }]}
                      >
                        <Input style={{ width: 220 }} />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, "type"]} label="Loại">
                        <Select
                          style={{ width: 150 }}
                          options={CRITERIA_TYPE_OPTIONS.map((type) => ({
                            value: type,
                            label: formatCriteriaTypeLabel(type),
                          }))}
                        />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, "weight"]} label="Trọng số">
                        <InputNumber min={0.01} max={1} step={0.05} />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, "maxScore"]} label="Điểm max">
                        <InputNumber min={1} />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, "displayOrder"]} label="Thứ tự">
                        <InputNumber min={0} />
                      </Form.Item>
                      <Button danger type="text" onClick={() => remove(field.name)}>
                        Xóa
                      </Button>
                    </Space>
                    <Form.Item {...field} name={[field.name, "description"]} label="Mô tả">
                      <Input />
                    </Form.Item>
                  </Card>
                ))}
                <Button block type="dashed" onClick={() => add({ ...emptyItem })}>
                  Thêm tiêu chí vào mẫu
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </Card>
  );
};
