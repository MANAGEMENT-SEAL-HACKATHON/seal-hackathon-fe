import {
  Modal,
  Alert,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Row,
  Col,
  Divider,
  theme,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  CRITERIA_TYPES,
  CRITERIA_TYPE_OPTIONS,
  MAX_WEIGHT_TOTAL,
} from "../constants/criteria.constants";

export const CriteriaBatchModal = ({ visible, onCancel, onFinish }) => {
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const watchedItems = Form.useWatch("items", form) || [];
  const draftTotalWeight = watchedItems
    .filter((item) => item?.type !== CRITERIA_TYPES.PENALTY)
    .reduce((sum, item) => sum + (Number(item?.weight) || 0), 0);
  const isDraftWeightValid =
    Math.abs(draftTotalWeight - MAX_WEIGHT_TOTAL) < 0.001;

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (values.items?.length > 0) {
        onFinish(values.items);
        form.resetFields();
      }
    } catch { /* validation errors shown by form */ }
  };

  const preventNegative = (e) => {
    if (e.key === "-" || e.key === "e") e.preventDefault();
  };

  return (
    <Modal
      title="Thêm hàng loạt tiêu chí"
      open={visible}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      width={1200}
      destroyOnClose
      style={{ top: 30 }}
      styles={{ content: { borderRadius: 16 } }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          items: [
            { type: "TECHNICAL", weight: 0.1, max_score: 10, display_order: 1 },
          ],
        }}
      >
        {watchedItems.length > 0 && (
          <Alert
            type={isDraftWeightValid ? "success" : "warning"}
            style={{ marginBottom: 16 }}
            message={`Tổng trọng số hiện tại: ${draftTotalWeight.toFixed(2)}`}
            description="PENALTY không được tính vào tổng weight 1.0."
          />
        )}
        <Row
          gutter={16}
          style={{
            marginBottom: 12,
            padding: "0 8px",
            color: token.colorTextSecondary,
            fontWeight: 600,
            fontSize: 13,
            textTransform: "uppercase",
          }}
        >
          <Col span={2}>Thứ tự *</Col>
          <Col span={4}>Tên tiêu chí *</Col>
          <Col span={3}>Phân loại *</Col>
          <Col span={3}>Trọng số *</Col>
          <Col span={3}>Điểm tối đa *</Col>
          <Col span={4}>Rubric URL</Col>
          <Col span={4}>Mô tả *</Col>
          <Col span={1}></Col>
        </Row>
        <Form.List name="items">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Row
                  gutter={16}
                  key={key}
                  style={{ marginBottom: 12 }}
                  align="top"
                >
                  <Col span={2}>
                    <Form.Item
                      {...restField}
                      name={[name, "display_order"]}
                      rules={[{ required: true }]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={1}
                        onKeyDown={preventNegative}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item
                      {...restField}
                      name={[name, "name"]}
                      rules={[{ required: true }]}
                    >
                      <Input placeholder="Tên tiêu chí..." />
                    </Form.Item>
                  </Col>
                  <Col span={3}>
                    <Form.Item
                      {...restField}
                      name={[name, "type"]}
                      rules={[{ required: true }]}
                    >
                      <Select placeholder="Phân loại">
                        {CRITERIA_TYPE_OPTIONS.map((t) => (
                          <Select.Option key={t} value={t}>
                            {t}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={3}>
                    <Form.Item
                      {...restField}
                      name={[name, "weight"]}
                      rules={[{ required: true }]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0.01}
                        max={1}
                        step={0.05}
                        onKeyDown={preventNegative}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={3}>
                    <Form.Item
                      {...restField}
                      name={[name, "max_score"]}
                      rules={[{ required: true }]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={1}
                        max={100}
                        onKeyDown={preventNegative}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item
                      {...restField}
                      name={[name, "rubric_url"]}
                      rules={[{ type: "url", message: "URL không hợp lệ", warningOnly: true }]}
                    >
                      <Input placeholder="https://..." />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item
                      {...restField}
                      name={[name, "description"]}
                      rules={[{ required: true }]}
                    >
                      <Input placeholder="Mô tả..." />
                    </Form.Item>
                  </Col>
                  <Col
                    span={1}
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginTop: 4,
                    }}
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(name)}
                    />
                  </Col>
                </Row>
              ))}
              <Divider style={{ margin: "16px 0" }} />
              <Button
                type="dashed"
                size="large"
                onClick={() =>
                  add({
                    type: "TECHNICAL",
                    weight: 0.1,
                    max_score: 10,
                    display_order: fields.length + 1,
                  })
                }
                block
                icon={<PlusOutlined />}
                style={{ borderRadius: 8 }}
              >
                Thêm dòng tiêu chí
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};
