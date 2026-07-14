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
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
        Cấu hình chung
      </Typography.Title>

      {isOngoing && (
        <Alert
          type={closedEarly ? 'success' : 'warning'}
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
          message={
            closedEarly
              ? 'Đã đóng cổng đăng ký sớm'
              : 'Đóng cổng đăng ký sớm (chỉ dùng khi cần thiết)'
          }
          description={
            closedEarly
              ? 'Cổng đăng ký đã đóng. Danh sách đội thi chính thức đã được chốt — vui lòng chuyển sang mục «Bốc thăm & khai mạc» để phân chia bảng đấu. Thời gian thi dự kiến vẫn được giữ nguyên; khi bắt đầu vòng thi, bạn có thể lựa chọn giữ nguyên lịch này hoặc bắt đầu làm bài ngay.'
              : 'Dùng khi số lượng đội đã đủ hoặc cần dừng nhận đăng ký vì lý do đặc biệt. Hệ thống sẽ chốt danh sách các đội thi chính thức, tự động loại các thí sinh và nhóm chưa hoàn thành thủ tục đăng ký, đồng thời gửi thông báo đến Ban tổ chức nếu có đội đang chờ duyệt. Những nhóm đã đủ thành viên nhưng chưa xác nhận sẽ có thêm 24 giờ để Trưởng nhóm xác nhận tham gia.'
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
          message="Thông tin chỉ được chỉnh sửa trong giai đoạn chuẩn bị (Bản nháp)"
          description="Sự kiện này đã được kích hoạt và chính thức bắt đầu — Số lượng người tham gia tối đa và ảnh banner hiện tại chỉ ở chế độ xem, không thể thay đổi lúc này."
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
        title="Đóng cổng đăng ký sớm?"
        open={confirmOpen}
        onOk={handleCloseRegistrationEarly}
        onCancel={() => setConfirmOpen(false)}
        okText="Xác nhận đóng"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: closingRegistration }}
      >
        <Space direction="vertical" size={12}>
          <Text>
            Bạn đang thực hiện đóng cổng đăng ký cho sự kiện <Text strong>{hackathon?.name}</Text> trước thời hạn.
          </Text>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Chốt danh sách các đội thi đã được phê duyệt chính thức</li>
            <li>Tự động loại các thí sinh tự do chưa ghép nhóm và các nhóm không đủ điều kiện</li>
            <li>
              Gửi thông báo đến Ban tổ chức đối với những nhóm đang đợi phê duyệt thành lập
            </li>
            <li>
              Cho phép Trưởng nhóm của các nhóm đã đủ thành viên nhưng chưa hoàn tất thủ tục có thêm 24 giờ để xác nhận tham gia (quá thời hạn này nhóm sẽ tự động bị hủy)
            </li>
          </ul>
          <Text type="secondary">Lưu ý: Hành động này không thể hoàn tác.</Text>
        </Space>
      </Modal>

      <Modal
        title="Kết quả đóng đăng ký sớm"
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
              Duyệt danh sách đội thi
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
              message="Tóm tắt xử lý hệ thống"
              description={
                <Space direction="vertical" size={4}>
                  <Text>Đội thi chính thức đã chốt: {resultModal.data.lockedActiveTeams ?? 0}</Text>
                  <Text>Thí sinh lẻ bị loại: {resultModal.data.withdrawnOrphans ?? 0}</Text>
                  <Text>Đội không đủ điều kiện bị từ chối: {resultModal.data.rejectedIncompleteTeams ?? 0}</Text>
                  {(resultModal.data.hoursUntilPrelimExam != null || resultModal.data.prelimExamAt) && (
                    <Text>
                      Thời gian thi sơ loại dự kiến vẫn còn
                      {resultModal.data.hoursUntilPrelimExam != null
                        ? ` khoảng ${resultModal.data.hoursUntilPrelimExam} giờ`
                        : ''}
                      {resultModal.data.prelimExamAt
                        ? ` (${new Date(resultModal.data.prelimExamAt).toLocaleString('vi-VN')})`
                        : ''}
                      . Khi bắt đầu vòng thi mới, bạn có thể lựa chọn thời gian bắt đầu làm bài.
                    </Text>
                  )}
                </Space>
              }
            />

            {awaitingApprovalTeams.length > 0 ? (
              <>
                <Title level={5} style={{ margin: 0 }}>
                  Đội đang chờ Ban tổ chức phê duyệt ({awaitingApprovalTeams.length})
                </Title>
                <Text type="secondary">
                  Các đội đã hoàn tất thủ tục đăng ký — vui lòng phê duyệt hoặc từ chối tại trang Quản lý đội thi.
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
                          Trưởng nhóm: {team.leaderName} · {team.acceptedMemberCount} thành viên · Đã gửi yêu cầu duyệt
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
                  Đội có thêm 24 giờ để xác nhận tham gia ({gracePeriodTeams.length})
                </Title>
                <Text type="secondary">
                  Trưởng nhóm chưa xác nhận tham gia — hệ thống đã gửi thông báo nhắc nhở đến các thành viên. Sau 24 giờ sẽ tự động loại nếu nhóm không xác nhận (Ban tổ chức không cần can thiệp lúc này).
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
              <Text type="secondary">Không có đội thi nào cần xử lý thêm.</Text>
            ) : null}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default HackathonGeneralConfig;
