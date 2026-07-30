import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Image,
  Input,
  List,
  Modal,
  Progress,
  Row,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { ExclamationCircleOutlined, InfoCircleOutlined, StopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { hackathonService } from '../services/hackathonService';
import { mapHackathonToBE, resolveHackathonBannerUrl } from '../mappers/hackathonMapper';
import HackathonBannerUpload from './HackathonBannerUpload';
import { ROUTES } from '../../../shared/constants/routes';
import { getTeamErrorMessage } from '../../../shared/constants/teamErrors';
import { resolveUserError } from '../../../shared/errors/resolveUserError';
import { isRegistrationPeriodEnded } from '../utils/hackathonRegistrationRules';
import FormLabelWithInfo from '../../../shared/components/ui/FormLabelWithInfo';
import SectionHeader, { HintList } from '../../../shared/components/ui/SectionHeader';
import CompetitionScheduleAdjustModal from '../../rounds/components/CompetitionScheduleAdjustModal';
import { teamService } from '../../teams/services/teamService';
import {
  computeFillPercent,
  fetchRegisteredParticipantCount,
} from '../utils/hackathonRegistrationStats';

const { Text, Title } = Typography;

const CLOSE_REG_EARLY_HINT = (
  <HintList
    items={[
      'Dùng khi số đội đã đủ hoặc cần dừng nhận đăng ký vì lý do đặc biệt',
      'Chọn giờ thi Sơ loại — hệ thống xếp lại Workshop → Kickoff → SL → CK → Awards (1 lần)',
      'Chốt danh sách đội thi chính thức; khóa đội ACTIVE',
      'Tự động loại thí sinh lẻ và nhóm chưa hoàn thành thủ tục',
      'Gửi thông báo mentor / giám khảo / sinh viên về lịch mới',
    ]}
  />
);

const REG_CLOSED_HINT = (
  <HintList
    items={[
      'Cổng đăng ký đã đóng — danh sách đội thi chính thức đã được chốt',
      'Chuyển sang «Bốc thăm & khai mạc» để phân chia bảng đấu',
      'Muốn chỉnh lịch thêm (nếu chưa dời): tab Vòng thi → «Dời lịch thi» (trước Kickoff ≥ 4 ngày, 1 lần)',
      'Test nhanh: Kích hoạt vòng → bắt đầu thi sớm (không cần chờ timeline)',
    ]}
  />
);

const MAX_PARTICIPANTS_LOCKED_HINT = (
  <HintList
    items={[
      'Sự kiện đã kích hoạt — không chỉnh số lượng tối đa được nữa',
      'Chỉ xem giá trị đã cấu hình trong giai đoạn Bản nháp',
    ]}
  />
);

const HackathonGeneralConfig = ({ hackathon, onUpdated, onGoToLottery }) => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [closingRegistration, setClosingRegistration] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultModal, setResultModal] = useState({ open: false, data: null });
  const [bannerFileList, setBannerFileList] = useState([]);
  const [activeTeamCount, setActiveTeamCount] = useState(0);
  const [pendingTeamCount, setPendingTeamCount] = useState(0);
  const [registeredParticipantCount, setRegisteredParticipantCount] = useState(null);
  const [registrationStatsError, setRegistrationStatsError] = useState(null);
  const isDraft = hackathon?.status === 'DRAFT';
  const isOngoing = hackathon?.status === 'ONGOING';
  const canEditBanner = isDraft || isOngoing;
  const registrationEnded = isRegistrationPeriodEnded(hackathon);
  const closedEarly = Boolean(
    hackathon?.registration_closed_early_at ?? hackathon?.registrationClosedEarlyAt,
  );
  const registrationClosedUi = registrationEnded;
  const bannerSrc = resolveHackathonBannerUrl(hackathon);
  const maxParticipants = Number(hackathon?.max_participants ?? hackathon?.maxParticipants) || 0;
  const fillPercent =
    registeredParticipantCount != null
      ? computeFillPercent(registeredParticipantCount, maxParticipants)
      : 0;

  const statusPill = (() => {
    if (isDraft) return { label: 'Bản nháp', color: 'default' };
    if (registrationClosedUi) return { label: closedEarly ? 'Đã đóng ĐK sớm' : 'Đã đóng đăng ký', color: 'success' };
    if (isOngoing) return { label: 'Đang mở đăng ký', color: 'processing' };
    return { label: hackathon?.status || '—', color: 'default' };
  })();

  useEffect(() => {
    if (hackathon) {
      form.setFieldsValue({
        max_participants: hackathon.max_participants ?? hackathon.maxParticipants,
      });
      setBannerFileList([]);
    }
  }, [hackathon, form]);

  useEffect(() => {
    if (!hackathon?.id) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const [activeRes, pendingRes, registeredCount] = await Promise.all([
          teamService.listByHackathon(hackathon.id, { status: 'ACTIVE' }),
          teamService.listByHackathon(hackathon.id, { status: 'PENDING' }).catch(() => []),
          fetchRegisteredParticipantCount(hackathon.id),
        ]);
        if (cancelled) return;
        const activeList = Array.isArray(activeRes) ? activeRes : activeRes?.items || [];
        const pendingList = Array.isArray(pendingRes) ? pendingRes : pendingRes?.items || [];
        setActiveTeamCount(activeList.length);
        setPendingTeamCount(pendingList.length);
        setRegisteredParticipantCount(registeredCount);
        setRegistrationStatsError(null);
      } catch (error) {
        if (!cancelled) {
          setActiveTeamCount(0);
          setPendingTeamCount(0);
          setRegisteredParticipantCount(null);
          setRegistrationStatsError(
            error?.message || 'Không thể tải số người đã đăng ký',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hackathon?.id, hackathon?.registration_closed_early_at]);

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

  const handleCloseRegistrationEarly = async ({ newPrelimExamAt, overrides }) => {
    try {
      setClosingRegistration(true);
      const result = await hackathonService.closeRegistrationEarly(hackathon.id, {
        newPrelimExamAt,
        overrides,
      });
      setConfirmOpen(false);
      setResultModal({ open: true, data: result });
      message.success(
        'Đã đóng ĐK sớm, cập nhật lịch và gửi thông báo mentor / giám khảo / sinh viên / BTC',
      );
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
  const pendingActionCount = awaitingApprovalTeams.length + gracePeriodTeams.length;
  const hasPendingAfterClose = pendingActionCount > 0;
  const teamsManageUrl = `${ROUTES.GLOBAL_TEAMS}?hackathonId=${hackathon?.id}&status=PENDING`;

  return (
    <div style={{ padding: '24px 0', animation: 'fadeInUp 0.4s ease-out both' }}>
      <SectionHeader title="Cấu hình chung" />

      <div
        style={{
          marginBottom: 20,
          padding: '18px 20px',
          borderRadius: 16,
          background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 55%, #eff6ff 100%)',
          border: '1px solid #e0e7ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Text strong style={{ fontSize: 16, color: '#312e81' }}>{hackathon?.name}</Text>
          <div style={{ marginTop: 8 }}>
            <Tag color={statusPill.color}>{statusPill.label}</Tag>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Đội đã duyệt</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#4f46e5' }}>{activeTeamCount}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Đang chờ duyệt</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#ea580c' }}>{pendingTeamCount}</div>
          </div>
          <div style={{ minWidth: 160 }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>
              Người đã đăng ký
              {maxParticipants && registeredParticipantCount != null
                ? ` (${registeredParticipantCount}/${maxParticipants})`
                : ''}
            </div>
            {registrationStatsError ? (
              <Text type="danger" style={{ fontSize: 11 }}>
                {registrationStatsError}
              </Text>
            ) : (
              <Progress percent={fillPercent} size="small" strokeColor="#6366f1" />
            )}
          </div>
        </div>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card
            title="Ảnh banner"
            style={{ borderRadius: 14, height: '100%', borderTop: '3px solid #818cf8' }}
          >
            {bannerSrc ? (
              <Image
                src={bannerSrc}
                alt={hackathon?.name}
                style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 12, border: '1px solid #f0f0f0' }}
                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
              />
            ) : (
              <div
                style={{
                  height: 180,
                  borderRadius: 12,
                  border: '1.5px dashed #c7d2fe',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                }}
              >
                Chưa có ảnh banner
              </div>
            )}
            {canEditBanner ? (
              <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 16 }}>
                <HackathonBannerUpload value={bannerFileList} onChange={setBannerFileList} />
                <Button type="primary" onClick={handleUploadBanner} loading={uploadingBanner} block>
                  Lưu banner
                </Button>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Chọn ảnh xong bấm «Lưu banner» để áp dụng (không tự lưu khi chỉ chọn file).
                </Text>
              </Space>
            ) : null}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card title="Thông số chung" style={{ borderRadius: 14, borderTop: '3px solid #60a5fa' }}>
              <Form form={form} layout="vertical">
                <Form.Item
                  name="max_participants"
                  label={
                    <FormLabelWithInfo
                      label="Số lượng người tham gia tối đa"
                      info={!isDraft ? MAX_PARTICIPANTS_LOCKED_HINT : undefined}
                      required
                    />
                  }
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
                  <Button type="primary" onClick={handleSave} loading={saving}>
                    Lưu cấu hình
                  </Button>
                )}
              </Form>
            </Card>

            {isOngoing && (
              <Card
                title={
                  <Space size={8}>
                    <span>Hành động đăng ký</span>
                    <Tooltip title={registrationClosedUi ? REG_CLOSED_HINT : CLOSE_REG_EARLY_HINT}>
                      <InfoCircleOutlined style={{ color: '#8c8c8c', cursor: 'help' }} />
                    </Tooltip>
                  </Space>
                }
                style={{
                  borderRadius: 14,
                  borderTop: `3px solid ${registrationClosedUi ? '#34d399' : '#fbbf24'}`,
                  background: registrationClosedUi ? '#f0fdf4' : '#fffbeb',
                }}
              >
                <Text strong style={{ display: 'block', marginBottom: 12 }}>
                  {registrationClosedUi
                    ? closedEarly
                      ? 'Đã đóng cổng đăng ký sớm'
                      : 'Đăng ký đã đóng'
                    : 'Đóng cổng đăng ký sớm'}
                </Text>
                {registrationClosedUi ? (
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
                )}
              </Card>
            )}
          </Space>
        </Col>
      </Row>

      {confirmOpen ? (
        <CompetitionScheduleAdjustModal
          open={confirmOpen}
          hackathon={hackathon}
          mode="close-reg"
          title="Kết thúc đăng ký sớm + chọn lịch thi"
          okText="Xác nhận đóng & lưu lịch"
          confirmLoading={closingRegistration}
          onCancel={() => !closingRegistration && setConfirmOpen(false)}
          onConfirm={handleCloseRegistrationEarly}
        />
      ) : null}

      <Modal
        title="Kết quả đóng đăng ký sớm"
        open={resultModal.open}
        onCancel={() => setResultModal({ open: false, data: null })}
        footer={[
          hasPendingAfterClose ? (
            <Button
              key="teams"
              type="primary"
              onClick={() => {
                setResultModal({ open: false, data: null });
                navigate(teamsManageUrl);
              }}
            >
              Xử lý {pendingActionCount} đội đang chờ
            </Button>
          ) : onGoToLottery ? (
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
          <Button key="close" onClick={() => setResultModal({ open: false, data: null })}>
            Đóng
          </Button>,
        ].filter(Boolean)}
        width={640}
      >
        {resultModal.data && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Alert
              type="success"
              showIcon
              message="Đã đóng đăng ký sớm"
              description="Hệ thống đã chốt đội đủ điều kiện, cập nhật lịch và gửi thông báo liên quan."
            />
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={8}>
                <Card size="small" style={{ textAlign: 'center', borderTop: '3px solid #34d399' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Đội chính thức</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#059669' }}>
                    {resultModal.data.lockedActiveTeams ?? 0}
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small" style={{ textAlign: 'center', borderTop: '3px solid #fbbf24' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Thí sinh lẻ bị loại</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#d97706' }}>
                    {resultModal.data.withdrawnOrphans ?? 0}
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small" style={{ textAlign: 'center', borderTop: '3px solid #f87171' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Đội bị từ chối</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>
                    {resultModal.data.rejectedIncompleteTeams ?? 0}
                  </div>
                </Card>
              </Col>
            </Row>
            {(resultModal.data.timelineCompressed ?? resultModal.data.timeline_compressed) && (
              <Alert
                type="info"
                showIcon
                icon={<ExclamationCircleOutlined />}
                message="Đã cập nhật lịch theo ngày đóng đăng ký mới"
                description="Thứ tự: Workshop → Khai mạc → Sơ loại → Chung kết → Lễ trao giải. Phân bảng và khóa đội không bị reset."
              />
            )}
            {(resultModal.data.hoursUntilPrelimExam != null || resultModal.data.prelimExamAt) && (
              <Text type="secondary">
                Giờ thi Sơ loại dự kiến
                {resultModal.data.hoursUntilPrelimExam != null
                  ? `: còn khoảng ${resultModal.data.hoursUntilPrelimExam} giờ`
                  : ''}
                {resultModal.data.prelimExamAt
                  ? ` (${new Date(resultModal.data.prelimExamAt).toLocaleString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })})`
                  : ''}
                . Muốn chỉnh giờ thi → tab Vòng thi → «Dời lịch thi».
              </Text>
            )}

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
                  Trưởng nhóm chưa xác nhận tham gia — đã gửi thông báo cho toàn đội. Các đội này
                  <Text strong> chặn bốc thăm</Text> cho đến khi xác nhận / hết hạn tự động từ chối,
                  hoặc Ban tổ chức <Text strong>từ chối sớm</Text> (kèm lý do) để mở khóa.
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
