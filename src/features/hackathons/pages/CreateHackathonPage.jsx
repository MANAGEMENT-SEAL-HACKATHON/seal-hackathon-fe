import React from 'react';
import { Alert, Card, Button, Form, message, Space, Spin } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import PageHeader from '../../../shared/components/ui/PageHeader';
import HackathonForm from '../components/HackathonForm';
import { ROUTES } from '../../../shared/constants/routes';
import { hackathonService } from '../services/hackathonService';
import { mapHackathonToBE, mapHackathonToFE } from '../mappers/hackathonMapper';

function buildCloneInitialValues(source) {
  if (!source) return null;
  return {
    name: source.name ? `${source.name} (Copy)` : '',
    description: source.description,
    rules: source.rules,
    season: source.season,
    individual_ranking_enabled: false,
    max_participants: source.max_participants,
    year: new Date().getFullYear(),
  };
}

const CreateHackathonPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const cloneFromId = location.state?.cloneFromId;

  const [loading, setLoading] = React.useState(false);
  const [cloneLoading, setCloneLoading] = React.useState(Boolean(cloneFromId));
  const [cloneSourceName, setCloneSourceName] = React.useState(null);
  const [initialValues, setInitialValues] = React.useState(null);

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

  const handleFinish = async (values) => {
    try {
      setLoading(true);
      const { banner_file: bannerFileList, ...formValues } = values;
      const payload = mapHackathonToBE({
        ...formValues,
        individual_ranking_enabled: false,
        event_start: null,
        event_end: null,
      });
      const created = await hackathonService.create(payload);
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
      message.success('Đã tạo sự kiện thành công');
      navigate(ROUTES.HACKATHONS);
    } catch (error) {
      message.error(error.message || 'Lỗi khi tạo sự kiện');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Tạo sự kiện mới"
        subtitle="Thiết lập các thông tin cơ bản cho sự kiện hackathon của bạn"
        onBack={() => navigate(ROUTES.HACKATHONS)}
      />

      {cloneSourceName && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Đang nhân bản từ: ${cloneSourceName}`}
          description="Slug và ngày đăng ký cần nhập lại. Các trường khác có thể chỉnh sửa trước khi lưu."
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
                  Tạo sự kiện
                </Button>
              </Space>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default CreateHackathonPage;
