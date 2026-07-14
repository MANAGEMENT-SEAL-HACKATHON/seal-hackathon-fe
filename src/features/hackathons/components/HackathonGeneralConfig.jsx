import React, { useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Image,
  Input,
  List,
  Modal,
  Space,
  Typography,
  message,
} from 'antd';
import { ExclamationCircleOutlined, StopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { hackathonService } from '../services/hackathonService';
import { mapHackathonToBE, resolveHackathonBannerUrl } from '../mappers/hackathonMapper';
import HackathonBannerUpload from './HackathonBannerUpload';
import { ROUTES } from '../../../shared/constants/routes';
import { getTeamErrorMessage } from '../../../shared/constants/teamErrors';
import { resolveUserError } from '../../../shared/errors/resolveUserError';

const { Text, Title } = Typography;

const HackathonGeneralConfig = ({ hackathon, onUpdated, onGoToLottery }) => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [closingRegistration, setClosingRegistration] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultModal, setResultModal] = useState({ open: false, data: null });
  const [bannerFileList, setBannerFileList] = useState([]);
  const isDraft = hackathon?.status === 'DRAFT';
  const isOngoing = hackathon?.status === 'ONGOING';
  const closedEarly = Boolean(
    hackathon?.registration_closed_early_at ?? hackathon?.registrationClosedEarlyAt,
  );
  const bannerSrc = resolveHackathonBannerUrl(hackathon);

  React.useEffect(() => {
    if (hackathon) {
      form.setFieldsValue({
        max_participants: hackathon.max_participants ?? hackathon.maxParticipants,
      });
      setBannerFileList([]);
    }
  }, [hackathon, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = mapHackathonToBE({ ...hackathon, max_participants: values.max_participants });
      await hackathonService.update(hackathon.id, payload);
      message.success('Đã cập nhật cấu hình chung');
      onUpdated?.();
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.message || 'Không thể cập nhật hackathon');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadBanner = async () => {
    const item = bannerFileList?.[0];
    const file = item?.originFileObj ?? item;
    if (!file || typeof file === 'string') {
      message.info('Vui lòng chọn ảnh banner trước khi bấm «Lưu banner».');
      return;
    }
    try {
      setUploadingBanner(true);
      await hackathonService.uploadBanner(hackathon.id, file);
      message.success('Đã cập nhật ảnh banner');
      setBannerFileList([]);
      onUpdated?.();
    } catch (error) {
      message.error(resolveUserError(error, { fallback: 'Không thể upload banner' }));
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleCloseRegistrationEarly = async () => {
    try {
      setClosingRegistration(true);
      const result = await hackathonService.closeRegistrationEarly(hackathon.id);
      setConfirmOpen(false);
      setResultModal({ open: true, data: result });
      message.success('Đã kết thúc đăng ký sớm');
      onUpdated?.();
    } catch (error) {
      message.error(
        getTeamErrorMessage(error) ||
          resolveUserError(error, { fallback: 'Không thể kết thúc đăng ký sớm' }),
      );
    } finally {
      setClosingRegistration(false);
    }
  };

  const awaitingApprovalTeams = resultModal.data?.teamsAwaitingCoordinatorApproval ?? [];
  const gracePeriodTeams = resultModal.data?.teamsInFormationGracePeriod ?? [];
  const hasCoordinatorAction = awaitingApprovalTeams.length > 0;

  return (
    <div style={{ padding: '24px 0' }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Cấu hình chung
      </Typography.Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Thiết lập giới hạn đăng ký, banner và các thông số cơ bản của giải đấu.
      </Text>

      {isOngoing && (
        <Alert
          type={closedEarly ? 'success' : 'warning'}
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
          message={
            closedEarly
              ? 'Đã kết thúc đăng ký sớm'
              : 'Kết thúc đăng ký sớm (trường hợp khẩn cấp)'
          }
          description={
            closedEarly
              ? 'Cổng đăng ký đã đóng. Các đội ACTIVE đã khóa — chuyển sang tab «Bốc thăm & Khai mạc» để phân track. Lịch thi dự kiến (examAt) vẫn giữ nguyên; khi kích hoạt vòng bạn có thể chọn giữ lịch hoặc bắt đầu thi ngay.'
              : 'Dùng khi đã đủ số lượng hoặc cần gấp do sự kiện bất khả kháng. Hệ thống sẽ khóa đội ACTIVE, loại thí sinh/đội không đủ điều kiện, gửi thông báo cho Coordinator nếu có đội đã xác nhận thành lập chờ duyệt, và cho các đội đủ thành viên nhưng chưa xác nhận thêm 24h để leader quyết định.'
          }
          action={
            closedEarly ? (
              onGoToLottery ? (
                <Button type="primary" onClick={onGoToLottery}>
                  Bốc thăm & Khai mạc
                </Button>
              ) : null
            ) : (
              <Button
                danger
                type="primary"
                icon={<StopOutlined />}
                onClick={() => setConfirmOpen(true)}
              >
                Kết thúc đăng ký sớm
              </Button>
            )
          }
        />
      )}

      {!isDraft && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
          message="Chỉ chỉnh sửa khi Hackathon ở trạng thái DRAFT"
          description="Hackathon đang ở trạng thái khác DRAFT — số lượng người tham gia tối đa và banner chỉ xem, không thể lưu qua API."
        />
      )}

      <Space direction="vertical" size={16} style={{ width: '100%', marginBottom: 24 }}>
        <Text strong>Ảnh Banner hiện tại</Text>
        {bannerSrc ? (
          <Image
            src={bannerSrc}
            alt={hackathon?.name}
            style={{ maxWidth: 480, borderRadius: 12, border: '1px solid #f0f0f0' }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
          />
        ) : (
          <Text type="secondary">Chưa có ảnh banner</Text>
        )}
        {isDraft && (
          <Space align="start" direction="vertical" size={8}>
            <HackathonBannerUpload value={bannerFileList} onChange={setBannerFileList} />
            <Button type="primary" onClick={handleUploadBanner} loading={uploadingBanner}>
              Lưu banner
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Chọn ảnh xong bấm «Lưu banner» để áp dụng (không tự lưu khi chỉ chọn file).
            </Text>
          </Space>
        )}
      </Space>

      <Form form={form} layout="vertical" style={{ maxWidth: 420 }}>
        <Form.Item
          name="max_participants"
          label="Số lượng người tham gia tối đa"
          rules={[
            { required: true, message: 'Vui lòng nhập số lượng người tham gia tối đa' },
            {
              validator: (_, value) => {
                const num = Number(value);
                if (!value || Number.isNaN(num) || num < 1) {
                  return Promise.reject(new Error('Giá trị phải là số nguyên dương, tối thiểu 1'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input type="number" min={1} disabled={!isDraft} placeholder="Ví dụ: 100" />
        </Form.Item>

        {isDraft && (
          <Space>
            <Button type="primary" onClick={handleSave} loading={saving}>
              Lưu cấu hình
            </Button>
          </Space>
        )}
      </Form>

      <Modal
        title="Kết thúc đăng ký sớm?"
        open={confirmOpen}
        onOk={handleCloseRegistrationEarly}
        onCancel={() => setConfirmOpen(false)}
        okText="Xác nhận kết thúc"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: closingRegistration }}
      >
        <Space direction="vertical" size={12}>
          <Text>
            Bạn sắp đóng cổng đăng ký cho <Text strong>{hackathon?.name}</Text> trước hạn.
          </Text>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Khóa các đội đã được Coordinator duyệt (ACTIVE)</li>
            <li>Loại thí sinh chưa có đội và đội không đủ điều kiện</li>
            <li>
              Đội đã xác nhận thành lập chờ duyệt: gửi thông báo cho Coordinator
            </li>
            <li>
              Đội đủ thành viên nhưng chưa xác nhận thành lập: leader có thêm 24h để quyết định (sau đó tự
              động loại nếu không xác nhận)
            </li>
          </ul>
          <Text type="secondary">Thao tác này không thể hoàn tác.</Text>
        </Space>
      </Modal>

      <Modal
        title="Kết quả kết thúc đăng ký sớm"
        open={resultModal.open}
        onCancel={() => setResultModal({ open: false, data: null })}
        footer={[
          onGoToLottery ? (
            <Button
              key="lottery"
              type="primary"
              onClick={() => {
                setResultModal({ open: false, data: null });
                onGoToLottery();
              }}
            >
              Bốc thăm & Khai mạc
            </Button>
          ) : null,
          hasCoordinatorAction ? (
            <Button
              key="teams"
              type="primary"
              onClick={() => {
                setResultModal({ open: false, data: null });
                navigate(ROUTES.GLOBAL_TEAMS);
              }}
            >
              Đến trang duyệt đội
            </Button>
          ) : null,
          <Button key="close" onClick={() => setResultModal({ open: false, data: null })}>
            Đóng
          </Button>,
        ].filter(Boolean)}
        width={640}
      >
        {resultModal.data && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              icon={<ExclamationCircleOutlined />}
              message="Tóm tắt xử lý"
              description={
                <Space direction="vertical" size={4}>
                  <Text>Đội ACTIVE đã khóa: {resultModal.data.lockedActiveTeams ?? 0}</Text>
                  <Text>Thí sinh lẻ bị loại: {resultModal.data.withdrawnOrphans ?? 0}</Text>
                  <Text>Đội không đủ điều kiện bị từ chối: {resultModal.data.rejectedIncompleteTeams ?? 0}</Text>
                  {(resultModal.data.hoursUntilPrelimExam != null || resultModal.data.prelimExamAt) && (
                    <Text>
                      Lịch thi sơ loại vẫn còn
                      {resultModal.data.hoursUntilPrelimExam != null
                        ? ` khoảng ${resultModal.data.hoursUntilPrelimExam} giờ`
                        : ''}
                      {resultModal.data.prelimExamAt
                        ? ` (${new Date(resultModal.data.prelimExamAt).toLocaleString('vi-VN')})`
                        : ''}
                      . Kích hoạt vòng ≠ bắt đầu thi ngay — chọn trên màn Activate.
                    </Text>
                  )}
                </Space>
              }
            />

            {awaitingApprovalTeams.length > 0 ? (
              <>
                <Title level={5} style={{ margin: 0 }}>
                  Đội chờ Coordinator duyệt ({awaitingApprovalTeams.length})
                </Title>
                <Text type="secondary">
                  Các đội đã xác nhận thành lập — vui lòng duyệt hoặc từ chối tại trang Quản lý đội thi.
                </Text>
                <List
                  size="small"
                  bordered
                  dataSource={awaitingApprovalTeams}
                  renderItem={(team) => (
                    <List.Item>
                      <Space direction="vertical" size={2}>
                        <Text strong>{team.teamName}</Text>
                        <Text type="secondary">
                          Trưởng nhóm: {team.leaderName} · {team.acceptedMemberCount} thành viên · Đã xác nhận thành lập
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </>
            ) : null}

            {gracePeriodTeams.length > 0 ? (
              <>
                <Title level={5} style={{ margin: 0 }}>
                  Đội có 24h để xác nhận thành lập ({gracePeriodTeams.length})
                </Title>
                <Text type="secondary">
                  Leader chưa xác nhận thành lập — hệ thống đã gửi thông báo cho thành viên. Sau 24h sẽ tự động loại
                  nếu không xác nhận (không cần Coordinator can thiệp lúc này).
                </Text>
                <List
                  size="small"
                  bordered
                  dataSource={gracePeriodTeams}
                  renderItem={(team) => (
                    <List.Item>
                      <Space direction="vertical" size={2}>
                        <Text strong>{team.teamName}</Text>
                        <Text type="secondary">
                          Trưởng nhóm: {team.leaderName} · {team.acceptedMemberCount} thành viên · Hạn xác nhận:{' '}
                          {team.formationGraceDeadlineAt
                            ? new Date(team.formationGraceDeadlineAt).toLocaleString('vi-VN')
                            : '—'}
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </>
            ) : null}

            {awaitingApprovalTeams.length === 0 && gracePeriodTeams.length === 0 ? (
              <Text type="secondary">Không có đội nào cần xử lý thêm.</Text>
            ) : null}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default HackathonGeneralConfig;
