import React from 'react';
import { Alert, Card, Button, Form, message, Modal, Space, Spin, Typography } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import PageHeader from '../../../shared/components/ui/PageHeader';
import HackathonForm from '../components/HackathonForm';
import { ROUTES } from '../../../shared/constants/routes';
import { hackathonService } from '../services/hackathonService';
import { mapHackathonToBE, mapHackathonToFE } from '../mappers/hackathonMapper';

const { Text } = Typography;

function buildCloneInitialValues(source) {
  if (!source) return null;
  return {
    name: source.name ? `${source.name} (Bản sao)` : '',
    description: source.description,
    rules: source.rules,
    season: source.season,
    individual_ranking_enabled: false,
    max_participants: source.max_participants,
    year: new Date().getFullYear(),
  };
}

const CLONE_COPY_ITEMS = [
  'Vòng thi',
  'Bảng đấu',
  'Tiêu chí chấm điểm',
];

const CLONE_SKIP_ITEMS = [
  'Lịch sự kiện cụ thể',
  'Đội thi',
  'Giám khảo / Mentor',
  'Kết quả thi đấu',
];

const CloneTransparencyContent = ({ sourceName }) => (
  <Space direction="vertical" size={12} style={{ width: '100%' }}>
    <Text>
      Bạn sắp nhân bản từ: <strong>{sourceName}</strong>
    </Text>
    <div>
      <Text strong>Sẽ sao chép:</Text>
      <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
        {CLONE_COPY_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
    <div>
      <Text strong>Không sao chép:</Text>
      <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
        {CLONE_SKIP_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  </Space>
);

const CreateHackathonPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  // Root cause: location.state is lost on refresh / new tab — fall back to ?cloneFrom=
  const cloneFromQuery = new URLSearchParams(location.search).get('cloneFrom');
  const cloneFromParsed = cloneFromQuery != null ? Number(cloneFromQuery) : null;
  const cloneFromId =
    location.state?.cloneFromId
    ?? (Number.isFinite(cloneFromParsed) ? cloneFromParsed : null);

  const [loading, setLoading] = React.useState(false);
  const [cloneLoading, setCloneLoading] = React.useState(Boolean(cloneFromId));
  const [cloneSourceName, setCloneSourceName] = React.useState(null);
  const [initialValues, setInitialValues] = React.useState(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingValues, setPendingValues] = React.useState(null);

  React.useEffect(() => {
    if (!cloneFromId) return;

    let cancelled = false;
    (async () => {
      try {
        setCloneLoading(true);
        const data = await hackathonService.getById(cloneFromId);
        const mapped = mapHackathonToFE(data);
        if (cancelled) return;
        setCloneSourceName(mapped.name);
        const values = buildCloneInitialValues(mapped);
        setInitialValues(values);
        form.setFieldsValue(values);
      } catch (error) {
        if (!cancelled) {
          message.error(error.message || 'Không tải được dữ liệu để nhân bản');
        }
      } finally {
        if (!cancelled) setCloneLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cloneFromId, form]);

  const submitHackathon = async (values) => {
    try {
      setLoading(true);
      const { banner_file: bannerFileList, ...formValues } = values;
      const payload = mapHackathonToBE({
        ...formValues,
        individual_ranking_enabled: false,
        event_start: null,
        event_end: null,
      });
      const created = cloneFromId
        ? await hackathonService.clone(cloneFromId, payload)
        : await hackathonService.create(payload);
      const bannerFile = bannerFileList?.[0]?.originFileObj ?? bannerFileList?.[0];
      if (bannerFile && created?.id) {
        try {
          await hackathonService.uploadBanner(created.id, bannerFile);
        } catch (uploadError) {
          message.warning(
            uploadError?.message || 'Tạo sự kiện thành công nhưng chưa upload được banner.',
          );
          navigate(ROUTES.HACKATHONS);
          return;
        }
      }
      message.success(cloneFromId ? 'Đã nhân bản sự kiện thành công' : 'Đã tạo sự kiện thành công');
      navigate(ROUTES.HACKATHONS);
    } catch (error) {
      message.error(error.message || (cloneFromId ? 'Lỗi khi nhân bản sự kiện' : 'Lỗi khi tạo sự kiện'));
    } finally {
      setLoading(false);
      setConfirmOpen(false);
      setPendingValues(null);
    }
  };

  const handleFinish = async (values) => {
    if (cloneFromId && cloneSourceName) {
      setPendingValues(values);
      setConfirmOpen(true);
      return;
    }
    await submitHackathon(values);
  };

  return (
    <div>
      <PageHeader
        title={cloneFromId ? 'Nhân bản sự kiện' : 'Tạo sự kiện mới'}
        subtitle={
          cloneFromId
            ? 'Xác nhận phạm vi sao chép trước khi lưu sự kiện mới'
            : 'Thiết lập các thông tin cơ bản cho sự kiện hackathon của bạn'
        }
        onBack={() => navigate(ROUTES.HACKATHONS)}
      />

      {cloneSourceName && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Nhân bản từ: ${cloneSourceName}`}
          description="Slug và ngày đăng ký cần nhập lại. Vòng thi, bảng đấu và tiêu chí sẽ được sao chép khi bạn xác nhận."
        />
      )}

      <Card style={{ borderRadius: 12 }}>
        {cloneLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="Đang tải dữ liệu nhân bản..." />
          </div>
        ) : (
          <>
            <HackathonForm form={form} onFinish={handleFinish} initialValues={initialValues} />

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <Space>
                <Button onClick={() => navigate(ROUTES.HACKATHONS)} disabled={loading}>
                  Hủy
                </Button>
                <Button
                  type="primary"
                  onClick={() => form.submit()}
                  size="large"
                  loading={loading}
                >
                  {cloneFromId ? 'Nhân bản sự kiện' : 'Tạo sự kiện'}
                </Button>
              </Space>
            </div>
          </>
        )}
      </Card>

      <Modal
        title="Xác nhận nhân bản sự kiện"
        open={confirmOpen}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingValues(null);
        }}
        onOk={() => pendingValues && submitHackathon(pendingValues)}
        okText="Xác nhận nhân bản"
        cancelText="Hủy"
        confirmLoading={loading}
        okButtonProps={{ 'data-testid': 'hackathon-clone-confirm' }}
      >
        <CloneTransparencyContent sourceName={cloneSourceName} />
      </Modal>
    </div>
  );
};

export default CreateHackathonPage;
