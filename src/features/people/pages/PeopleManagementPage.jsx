// src/features/people/pages/PeopleManagementPage.jsx
import { useState } from 'react';
import { Card, Tabs, Button, Table, Form, Input, Modal, Select, Tag, Popconfirm, Typography, message, Space, Avatar, Tooltip, Alert } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { UserPlus, Trash2, Eye, Mail } from 'lucide-react';
import dayjs from 'dayjs';
import { usePeopleManagement } from '../hooks/usePeopleManagement';
import PersonAssignmentsModal from '../components/PersonAssignmentsModal';
import { PersonTableCell, personSelectOption } from '../components/PersonDisplay';
import EmailAutoComplete from '../../../shared/components/ui/EmailAutoComplete';
import SectionHeader, { HintList } from '../../../shared/components/ui/SectionHeader';
import {
  formatJudgeRoleLabel,
} from '../utils/peoplePersonnelRules';

const { Option } = Select;
const { Text } = Typography;

const PEOPLE_TAB_HINT = (
  <HintList
    items={[
      'Giám khảo khách mời: pool tài khoản khách toàn hệ thống',
      'Mentor & Giám khảo Sơ loại: gán theo từng bảng đấu',
      'Giám khảo Chung kết: chọn Giám khảo nội bộ (INTERNAL) hoặc Giám khảo khách khi gán',
      'Một người không thể vừa mentor vừa giám khảo cùng một bảng',
    ]}
  />
);

const tabLabelWithInfo = (label, info) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    {label}
    <Tooltip title={info}>
      <InfoCircleOutlined style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)' }} />
    </Tooltip>
  </span>
);

const GUEST_JUDGE_POLICY =
  'Sau khi sự kiện kết thúc, tài khoản giám khảo khách không bị xóa mà chỉ bị khóa đăng nhập. ' +
  'Hệ thống chưa hỗ trợ tái mời cùng email qua giao diện — dùng email khác hoặc nhờ quản trị hệ thống.';

const PeopleManagementPage = ({ hackathonId, onUpdated }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignmentsPerson, setAssignmentsPerson] = useState(null);
  const [inviteForm] = Form.useForm();
  const [mentorForm] = Form.useForm();
  const [prelimJudgeForm] = Form.useForm();
  const [finalJudgeForm] = Form.useForm();

  const selectedMentorTrackId = Form.useWatch('track_id', mentorForm);
  const selectedFinalPersonId = Form.useWatch('person_id', finalJudgeForm);

  const selectedPrelimJudgeTrackId = Form.useWatch('track_id', prelimJudgeForm);
  const selectedFinalJudgeTrackId = Form.useWatch('track_id', finalJudgeForm);
  const selectedFinalRoundId = Form.useWatch('round_id', finalJudgeForm);
  const selectedFinalAssignmentType = Form.useWatch('assignment_type', finalJudgeForm) || 'FINAL_EXTERNAL';

  const {
    mentors,
    judges,
    tempJudges,
    tracks,
    rounds,
    trackMentors,
    judgeAssignments,
    finalJudgeAssignments,
    mentorPool,
    prelimJudgePool,
    finalJudgePool,
    getFinalJudgePoolForType,
    isLoading,
    assigningMentor,
    assigningJudge,
    removingAssignmentId,
    createTempJudge,
    assignMentor,
    removeMentor,
    assignJudge,
    removeJudge,
    resendInvitation,
    revokeInvitation,
    isMentorBlockedForTrack,
    isJudgeBlockedForTrack,
    getMentorAssignBlockReason,
    getPrelimJudgeAssignBlockReason,
    getFinalJudgeAssignBlockReason,
  } = usePeopleManagement(hackathonId, onUpdated);
  const trackByRoundType = (isFinal) =>
    tracks.filter((track) => {
      const roundId = track.roundId || track.round_id;
      const round = rounds.find((r) => r.id === roundId);
      const roundIsFinal =
        Boolean(round?.isFinal ?? round?.is_final) ||
        String(round?.roundType || round?.round_type || '').toUpperCase() === 'FINAL' ||
        /chung\s*kết|final/i.test(String(round?.name || ''));
      return roundIsFinal === isFinal;
    });
  const prelimTracks = trackByRoundType(false);
  const finalTracks = trackByRoundType(true);
  const finalRounds = rounds.filter((round) =>
    Boolean(round?.isFinal ?? round?.is_final) ||
    String(round?.roundType || round?.round_type || '').toUpperCase() === 'FINAL' ||
    /chung\s*kết|final/i.test(String(round?.name || ''))
  );

  const renderJudgeRole = (role) => {
    const normalized = String(role || '').toUpperCase();
    return (
      <Tag color={normalized === 'FINAL_EXTERNAL' ? 'purple' : 'blue'}>
        {formatJudgeRoleLabel(normalized)}
      </Tag>
    );
  };

  const hasFinalInternalJudge = finalJudgeAssignments.some((a) => {
    const type = String(a.assignment_type || a.assignmentType || '').toUpperCase();
    return type === 'NORMAL' || type === 'HEAD';
  });

  const getPersonDisplayName = (person) =>
    person?.fullName || person?.full_name || person?.name || 'Chưa có tên';

  const getPersonEmail = (person) => person?.email || 'Chưa cập nhật email';

  const getPersonTitle = (person) =>
    person?.title || person?.jobTitle || person?.institution || 'Mentor';

  const getPersonCode = (person) =>
    person?.code ||
    person?.userCode ||
    person?.user_code ||
    person?.staffCode ||
    person?.staff_code ||
    person?.studentCode ||
    person?.student_code ||
    person?.username ||
    person?.email?.split('@')[0]?.toUpperCase() ||
    'N/A';

  const getFormattedPersonName = (person) => {
    const rawName = getPersonDisplayName(person);
    if (/^(Thầy|Cô|ThS|TS|PGS|GS|Thạc\s*sĩ|Tiến\s*sĩ|Mr\.|Ms\.|Mrs\.)\s+/i.test(rawName)) {
      return rawName;
    }
    const prefix =
      person?.academicTitle ||
      person?.academic_title ||
      person?.salutation ||
      person?.degree ||
      person?.prefix ||
      person?.title ||
      person?.jobTitle ||
      person?.job_title;
    if (prefix && typeof prefix === 'string') {
      const trimmed = prefix.trim();
      if (/^(Thầy|Cô|ThS|TS|PGS|GS|Thạc\s*sĩ|Tiến\s*sĩ|Mr\.|Ms\.|Mrs\.)/i.test(trimmed)) {
        return `${trimmed} ${rawName}`;
      }
      if (trimmed.length <= 15 && !trimmed.includes('@') && !trimmed.toLowerCase().includes('mentor') && !trimmed.toLowerCase().includes('fpt')) {
        return `${trimmed} ${rawName}`;
      }
    }
    return rawName;
  };

  const mentorOptionsForTrack = (trackId) =>
    mentorPool.map((p) => {
      const blockReason = getMentorAssignBlockReason(p.id, trackId);
      const blocked = Boolean(blockReason);
      const rawName = getPersonDisplayName(p);
      const formattedName = getFormattedPersonName(p);
      const personCode = getPersonCode(p);
      const roleLabel = p.role === 'JUDGE' ? 'Giám khảo' : 'Mentor';
      const avatarSrc = p.avatarUrl || p.avatar_url || p.avatar;
      return (
        <Option key={p.id} value={p.id} disabled={blocked} label={`${formattedName} (${personCode})`}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '4px 0',
              opacity: blocked ? 0.45 : 1,
              filter: blocked ? 'grayscale(0.35)' : undefined,
            }}
          >
            <Avatar
              size={32}
              src={avatarSrc}
              style={{ backgroundColor: '#6366f1', fontSize: 13, flexShrink: 0 }}
            >
              {rawName.charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ lineHeight: 1.4, minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text strong style={{ fontSize: 13, color: blocked ? 'rgba(0,0,0,0.45)' : undefined }}>
                  {formattedName}
                </Text>
                <Tag color="orange" style={{ margin: 0, fontSize: 11, fontWeight: 700, padding: '0 6px' }}>
                  {personCode}
                </Tag>
                {blocked && (
                  <Text type="danger" style={{ fontSize: 11 }}>
                    ({blockReason})
                  </Text>
                )}
              </div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                {roleLabel} · {getPersonTitle(p)} · {getPersonEmail(p)}
              </Text>
            </div>
          </div>
        </Option>
      );
    });

  const prelimJudgeOptionsForTrack = (trackId) =>
    prelimJudgePool.map((p) => {
      const blockReason = getPrelimJudgeAssignBlockReason(p.id, trackId);
      const blocked = Boolean(blockReason);
      const roleLabel = formatJudgeRoleLabel('NORMAL');
      const name = getPersonDisplayName(p);
      return (
        <Option key={p.id} value={p.id} disabled={blocked} label={name}>
          {personSelectOption(p, {
            disabled: blocked,
            label: name,
            extra: blocked ? `${roleLabel} · ${blockReason}` : roleLabel,
          })}
        </Option>
      );
    });

  const finalJudgePoolForForm = getFinalJudgePoolForType(selectedFinalAssignmentType);

  const finalJudgeOptionsForTrack = (trackId, roundId) =>
    finalJudgePoolForForm.map((p) => {
      const blockReason = getFinalJudgeAssignBlockReason(p.id, { trackId, roundId });
      const blocked = Boolean(blockReason);
      const roleLabel =
        selectedFinalAssignmentType === 'NORMAL'
          ? 'Giám khảo nội bộ'
          : formatJudgeRoleLabel(selectedFinalAssignmentType);
      const name = getPersonDisplayName(p);
      return (
        <Option key={p.id} value={p.id} disabled={blocked} label={name}>
          {personSelectOption(p, {
            disabled: blocked,
            label: name,
            extra: blocked ? `${roleLabel} · ${blockReason}` : roleLabel,
          })}
        </Option>
      );
    });

  const findPersonById = (personId) =>
    judges.find((j) => j.id === personId) ||
    mentors.find((m) => m.id === personId) ||
    tempJudges.find((t) => t.id === personId);

  const renderPrelimJudgeRole = (record) =>
    renderJudgeRole(record.assignment_type || record.assignmentType || 'NORMAL');

  const renderFinalJudgeRole = (record) => {
    const type = String(record.assignment_type || record.assignmentType || 'FINAL_EXTERNAL').toUpperCase();
    if (type === 'NORMAL' || type === 'HEAD') {
      return <Tag color="blue">Giám khảo nội bộ</Tag>;
    }
    return renderJudgeRole(type);
  };

  const renderTempJudgeStatus = (status, record) => {
    if (record.invitation?.revokedAt) {
      return <Tag color="default">Đã thu hồi</Tag>;
    }

    // «Đã duyệt» CHỈ khi đã thực sự kích hoạt (accepted / đã đổi mật khẩu + APPROVED).
    const activated =
      record.invitation?.acceptedAt ||
      (record.mustChangePassword === false && status === 'APPROVED');
    if (activated) {
      return <Tag color="green">Đã duyệt</Tag>;
    }

    const tokenFailed =
      record.tokenSent === false ||
      record.token_sent === false ||
      record.invitation?.tokenSent === false;

    if (tokenFailed) {
      return <Tag color="warning">Email chưa gửi</Tag>;
    }

    const expiresAt = record.invitation?.expiresAt ?? record.expiresAt;
    const invitationExpired =
      expiresAt &&
      dayjs(expiresAt).isBefore(dayjs()) &&
      (status === 'PENDING' || record.mustChangePassword === true);

    if (invitationExpired) {
      return <Tag color="error">Lời mời hết hạn</Tag>;
    }

    if (status === 'PENDING' || record.mustChangePassword === true) {
      return (
        <Tooltip title="Giám khảo đang trong quá trình kích hoạt tài khoản lần đầu.">
          <Tag color="orange">Chờ đổi mật khẩu</Tag>
        </Tooltip>
      );
    }

    // Lời mời còn treo (chưa accepted, chưa đổi mật khẩu) — KHÔNG hiển thị «Đã duyệt».
    return <Tag color="default">Chờ xác nhận</Tag>;
  };

  return (
    <div style={{ padding: '24px 0', animation: 'fadeInUp 0.4s ease-out both' }}>
      <SectionHeader title="Nhân sự" info={PEOPLE_TAB_HINT} />
      <Card style={{ borderRadius: 12 }}>
        <Tabs defaultActiveKey="2" destroyInactiveTabPane>
          <Tabs.TabPane
            tab={tabLabelWithInfo(
              'Giám khảo khách mời',
              'Danh sách tài khoản giám khảo khách toàn hệ thống (pool mời). Chưa đồng nghĩa đã phân công Mentor/Giám khảo Sơ loại cho sự kiện này. Hệ thống có thể gửi email kèm mật khẩu tạm khi mời mới.',
            )}
            key="1"
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
              Pool tài khoản khách toàn hệ thống — không đồng nghĩa đã gán Mentor/GK Sơ loại.
            </Text>
            <Alert type="info" showIcon message="Chính sách vòng đời" description={GUEST_JUDGE_POLICY} style={{ marginBottom: 16 }} />
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="primary" icon={<UserPlus size={16} />} onClick={() => setIsModalOpen(true)}>
                Mời giám khảo
              </Button>
            </div>
            <Table
              dataSource={tempJudges}
              rowKey="id"
              pagination={false}
              loading={isLoading}
              locale={{ emptyText: 'Chưa mời giám khảo khách mời nào.' }}
              columns={[
                { title: 'Họ tên', dataIndex: 'fullName', render: (t, r) => <PersonTableCell person={r} subtitle={r.email} /> },
                { title: 'Email', dataIndex: 'email' },
                { title: 'Đơn vị', dataIndex: 'institution' },
                {
                  title: 'Trạng thái',
                  dataIndex: 'status',
                  render: renderTempJudgeStatus,
                },
                {
                  title: 'Thao tác',
                  key: 'actions',
                  width: 100,
                  render: (_, record) => {
                    if (record.invitation?.revokedAt) return null;
                    const activated =
                      record.invitation?.acceptedAt ||
                      (record.mustChangePassword === false && record.status === 'APPROVED');
                    if (activated) return null;

                    const tokenFailed =
                      record.tokenSent === false ||
                      record.token_sent === false ||
                      record.invitation?.tokenSent === false;
                    const expiresAt = record.invitation?.expiresAt ?? record.expiresAt;
                    const invitationExpired =
                      expiresAt &&
                      dayjs(expiresAt).isBefore(dayjs()) &&
                      (record.status === 'PENDING' || record.mustChangePassword === true);
                    const invitationId =
                      record.invitation?.id ?? record.invitationId ?? record.invitation_id;
                    if (!invitationId) return null;

                    const canResend = tokenFailed || invitationExpired;
                    const canRevoke =
                      (record.status === 'PENDING' || record.mustChangePassword) && !activated;

                    return (
                      <Space>
                        {canResend && (
                          <Tooltip title="Gửi lại email kèm mật khẩu tạm mới">
                            <Button
                              type="text"
                              icon={<Mail size={16} />}
                              onClick={() => resendInvitation(invitationId)}
                            />
                          </Tooltip>
                        )}
                        {canRevoke && (
                          <Popconfirm
                            title="Thu hồi lời mời?"
                            description="Chỉ khi giám khảo chưa đổi mật khẩu."
                            onConfirm={() => revokeInvitation(invitationId)}
                          >
                            <Button type="text" danger icon={<Trash2 size={16} />} />
                          </Popconfirm>
                        )}
                      </Space>
                    );
                  },
                },
              ]}
            />
          </Tabs.TabPane>

          <Tabs.TabPane
            tab={tabLabelWithInfo(
              'Mentor theo bảng đấu',
              'Gán mentor theo bảng đấu — sau bốc thăm mọi đội trong bảng được hỗ trợ bởi mentor đó. Một người không thể vừa mentor vừa giám khảo cùng bảng.',
            )}
            key="2"
          >
            <Card type="inner" style={{ marginBottom: 24, background: 'var(--ant-color-fill-quaternary)', borderRadius: 8 }}>
              <Form
                layout="inline"
                form={mentorForm}
                onFinish={(vals) => {
                  if (!tracks.length) {
                    return message.warning('Hãy tạo bảng đấu ở tab Bảng đấu trước.');
                  }
                  assignMentor(vals, () => mentorForm.resetFields());
                }}
              >
                <Form.Item
                  name="track_id"
                  rules={[{ required: true, message: 'Chọn bảng đấu' }]}
                  extra={
                    selectedMentorTrackId ? (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Mentor này sẽ hỗ trợ mọi đội thuộc bảng đã chọn sau khi bốc thăm.
                      </Text>
                    ) : null
                  }
                >
                  <Select placeholder="Chọn bảng đấu" style={{ width: 240 }} showSearch optionFilterProp="children">
                    {tracks.map((t) => (
                      <Option key={t.id} value={t.id}>
                        {t.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="mentor_id" rules={[{ required: true, message: 'Chọn mentor' }]}>
                  <Select
                    placeholder="Chọn mentor"
                    style={{ width: 380 }}
                    showSearch
                    optionLabelProp="label"
                    disabled={!selectedMentorTrackId}
                    filterOption={(input, option) => {
                      const mentor = mentorPool.find((m) => m.id === option?.value);
                      if (!mentor) return false;
                      const query = input.toLowerCase();
                      return (
                        getPersonDisplayName(mentor).toLowerCase().includes(query) ||
                        getPersonEmail(mentor).toLowerCase().includes(query)
                      );
                    }}
                  >
                    {mentorOptionsForTrack(selectedMentorTrackId)}
                  </Select>
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  loading={assigningMentor}
                  disabled={!tracks.length || assigningMentor}
                >
                  {assigningMentor ? 'Đang gán…' : 'Gán mentor'}
                </Button>
              </Form>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
                Hiện mentor và giám khảo nội bộ — một người có thể đảm nhiệm cả hai vai, nhưng không cùng một bảng đấu.
              </Text>
            </Card>

            <Table
              dataSource={trackMentors}
              rowKey="id"
              pagination={false}
              loading={isLoading}
              locale={{ emptyText: 'Chưa gán mentor cho bảng đấu nào.' }}
              columns={[
                { title: 'Bảng đấu', dataIndex: 'track_name', render: (t) => <Tag color="blue">{t}</Tag> },
                {
                  title: 'Mentor',
                  render: (_, r) => {
                    const found = mentors.find((m) => m.id === r.mentor_id) || r;
                    const rawName =
                      r.mentor_name ||
                      found?.fullName ||
                      found?.full_name ||
                      found?.name ||
                      'Không rõ';
                    const formattedName = getFormattedPersonName({ ...found, fullName: rawName });
                    const personCode = getPersonCode(found);
                    const avatarSrc = found?.avatarUrl || found?.avatar_url || found?.avatar;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar size={24} src={avatarSrc} style={{ backgroundColor: '#6366f1', fontSize: 11 }}>
                          {rawName.charAt(0).toUpperCase()}
                        </Avatar>
                        <div>
                          <Text strong style={{ color: '#6366f1', marginRight: 6 }}>
                            {formattedName}
                          </Text>
                          <Tag color="orange" style={{ margin: 0, fontSize: 10, fontWeight: 700 }}>
                            {personCode}
                          </Tag>
                        </div>
                      </div>
                    );
                  },
                },
                {
                  title: '',
                  width: 80,
                  align: 'right',
                  render: (_, r) => (
                    <Popconfirm title="Gỡ mentor khỏi bảng này?" onConfirm={() => removeMentor(r.id)}>
                      <Button
                        type="text"
                        danger
                        loading={removingAssignmentId === r.id}
                        disabled={removingAssignmentId === r.id}
                        icon={<Trash2 size={16} />}
                      />
                    </Popconfirm>
                  ),
                },
              ]}
            />
          </Tabs.TabPane>

          <Tabs.TabPane
            tab={tabLabelWithInfo(
              'Giám khảo Sơ loại',
              'Chỉ giám khảo/mentor nội bộ (INTERNAL). Mỗi giám khảo chỉ thuộc một bảng trong cùng vòng Sơ loại. Vai trò gán: Giám khảo (NORMAL).',
            )}
            key="3"
          >
            <Card type="inner" style={{ marginBottom: 24, background: 'var(--ant-color-fill-quaternary)', borderRadius: 8 }}>
              <Form
                layout="inline"
                form={prelimJudgeForm}
                initialValues={{ assignment_type: 'NORMAL' }}
                onFinish={(vals) =>
                  assignJudge({ ...vals, is_final_assignment: false }, () =>
                    prelimJudgeForm.resetFields(['person_id', 'track_id'])
                  )
                }
              >
                <Form.Item name="track_id" rules={[{ required: true, message: 'Chọn bảng đấu' }]}>
                  <Select placeholder="Chọn bảng đấu" style={{ width: 220 }} showSearch optionFilterProp="children">
                    {prelimTracks.map((t) => (
                      <Option key={t.id} value={t.id}>
                        {t.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="assignment_type"
                  label="Vai trò"
                  rules={[{ required: true, message: 'Chọn vai trò' }]}
                >
                  <Select
                    style={{ width: 200 }}
                    options={[
                      { value: 'NORMAL', label: 'Giám khảo' },
                    ]}
                  />
                </Form.Item>

                <Form.Item name="person_id" rules={[{ required: true, message: 'Chọn giám khảo' }]}>
                  <Select
                    placeholder="Chọn giám khảo"
                    style={{ width: 220 }}
                    showSearch
                    optionFilterProp="children"
                    disabled={!selectedPrelimJudgeTrackId}
                  >
                    {prelimJudgeOptionsForTrack(selectedPrelimJudgeTrackId)}
                  </Select>
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  loading={assigningJudge}
                  disabled={!prelimTracks.length || assigningJudge}
                >
                  {assigningJudge ? 'Đang gán…' : 'Gán giám khảo'}
                </Button>
              </Form>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
                Chỉ giám khảo/mentor nội bộ. Vai trò gán: Giám khảo (NORMAL) theo từng bảng — không kế thừa từ hồ sơ.
              </Text>
            </Card>

            <Table
              dataSource={judgeAssignments}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              loading={isLoading}
              locale={{ emptyText: 'Chưa gán giám khảo nào.' }}
              columns={[
                {
                  title: 'Giám khảo',
                  render: (_, r) => {
                    const found = judges.find((j) => j.id === r.person_id) || tempJudges.find((j) => j.id === r.person_id);
                    return <PersonTableCell person={found || { fullName: r.judge_name }} subtitle={r.target_name} />;
                  },
                },
                { title: 'Bảng đấu', dataIndex: 'target_name', render: (t) => <Tag color="geekblue">{t}</Tag> },
                { title: 'Vai trò', key: 'role', render: (_, r) => renderPrelimJudgeRole(r) },
                {
                  title: '',
                  width: 80,
                  align: 'right',
                  render: (_, r) => (
                    <Popconfirm title="Gỡ giám khảo khỏi bảng này?" onConfirm={() => removeJudge(r.id)}>
                      <Button
                        type="text"
                        danger
                        loading={removingAssignmentId === r.id}
                        disabled={removingAssignmentId === r.id}
                        icon={<Trash2 size={16} />}
                      />
                    </Popconfirm>
                  ),
                },
              ]}
            />
          </Tabs.TabPane>

          <Tabs.TabPane
            tab={tabLabelWithInfo(
              'Giám khảo Chung kết',
              'Gán giám khảo Chung kết theo vòng/bảng. Chọn Giám khảo nội bộ (INTERNAL) hoặc Giám khảo khách ngay khi gán.',
            )}
            key="4"
          >
            {(finalRounds.length > 0 || finalTracks.length > 0) && !hasFinalInternalJudge && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16, borderRadius: 8 }}
                message="Chưa có giám khảo nội bộ cho vòng Chung kết"
                description="Nên gán ít nhất một giám khảo nội bộ (INTERNAL). Cảnh báo này không chặn thao tác gán."
              />
            )}
            <Card type="inner" style={{ marginBottom: 24, background: 'var(--ant-color-fill-quaternary)', borderRadius: 8 }}>
              <Form
                layout="inline"
                form={finalJudgeForm}
                initialValues={{ is_final_assignment: true, assignment_type: 'FINAL_EXTERNAL' }}
                onFinish={(vals) =>
                  assignJudge(vals, () =>
                    finalJudgeForm.resetFields(['person_id', 'track_id', 'round_id'])
                  )
                }
              >
                <Form.Item
                  name="assignment_type"
                  label="Vai trò CK"
                  rules={[{ required: true, message: 'Chọn vai trò' }]}
                >
                  <Select
                    style={{ width: 220 }}
                    onChange={() => finalJudgeForm.setFieldValue('person_id', undefined)}
                    options={[
                      { value: 'NORMAL', label: 'Giám khảo nội bộ' },
                      { value: 'FINAL_EXTERNAL', label: 'Giám khảo khách' },
                    ]}
                  />
                </Form.Item>
                {finalTracks.length > 0 ? (
                  <Form.Item name="track_id" rules={[{ required: true, message: 'Chọn bảng đấu CK' }]}>
                    <Select placeholder="Chọn bảng đấu CK" style={{ width: 240 }} showSearch optionFilterProp="children">
                      {finalTracks.map((t) => (
                        <Option key={t.id} value={t.id}>
                          {t.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                ) : (
                  <Form.Item name="round_id" rules={[{ required: true, message: 'Chọn vòng CK' }]}>
                    <Select placeholder="Chọn vòng Chung kết" style={{ width: 240 }} showSearch optionFilterProp="children">
                      {finalRounds.map((r) => (
                        <Option key={r.id} value={r.id}>
                          {r.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}
                <Form.Item name="person_id" rules={[{ required: true, message: 'Chọn giám khảo' }]}>
                  <Select
                    placeholder="Chọn giám khảo"
                    style={{ width: 240 }}
                    showSearch
                    optionFilterProp="children"
                    disabled={finalTracks.length > 0 ? !selectedFinalJudgeTrackId : !selectedFinalRoundId}
                  >
                    {finalJudgeOptionsForTrack(
                      selectedFinalJudgeTrackId,
                      selectedFinalRoundId
                        || (selectedFinalJudgeTrackId
                          ? tracks.find((t) => t.id === selectedFinalJudgeTrackId)?.roundId
                            || tracks.find((t) => t.id === selectedFinalJudgeTrackId)?.round_id
                          : null),
                    )}
                  </Select>
                </Form.Item>
                <Form.Item name="is_final_assignment" hidden>
                  <Input />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={assigningJudge}
                  disabled={(!finalTracks.length && !finalRounds.length) || assigningJudge}
                >
                  {assigningJudge ? 'Đang gán…' : 'Gán giám khảo CK'}
                </Button>
              </Form>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
                Giám khảo nội bộ: chọn giám khảo INTERNAL. Giám khảo khách: chỉ tài khoản EXTERNAL đã duyệt.
              </Text>
            </Card>
            <Table
              dataSource={finalJudgeAssignments}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              loading={isLoading}
              locale={{ emptyText: 'Chưa gán giám khảo Chung kết.' }}
              columns={[
                {
                  title: 'Giám khảo',
                  render: (_, r) => {
                    const found = judges.find((j) => j.id === r.person_id) || tempJudges.find((j) => j.id === r.person_id);
                    return <PersonTableCell person={found || { fullName: r.judge_name }} subtitle={r.target_name} />;
                  },
                },
                { title: 'Vòng', dataIndex: 'target_name', render: (t) => <Tag color="purple">{t}</Tag> },
                { title: 'Vai trò', key: 'role', render: (_, r) => renderFinalJudgeRole(r) },
                {
                  title: '',
                  width: 80,
                  align: 'right',
                  render: (_, r) => (
                    <Popconfirm title="Gỡ giám khảo khỏi vòng CK?" onConfirm={() => removeJudge(r.id)}>
                      <Button
                        type="text"
                        danger
                        loading={removingAssignmentId === r.id}
                        disabled={removingAssignmentId === r.id}
                        icon={<Trash2 size={16} />}
                      />
                    </Popconfirm>
                  ),
                },
              ]}
            />
          </Tabs.TabPane>
        </Tabs>
      </Card>

      <PersonAssignmentsModal
        person={assignmentsPerson}
        open={Boolean(assignmentsPerson)}
        onClose={() => setAssignmentsPerson(null)}
      />

      <Modal
        title="Mời giám khảo khách mời"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => inviteForm.submit()}
        confirmLoading={isLoading}
        okText="Gửi lời mời"
      >
        <Form
          form={inviteForm}
          layout="vertical"
          onFinish={(vals) =>
            createTempJudge(vals, () => {
              setIsModalOpen(false);
              inviteForm.resetFields();
            })
          }
        >
          <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
            <Input placeholder="Ví dụ: Nguyễn Văn A" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ' }]}>
            <EmailAutoComplete placeholder="email@congty.com" showPrefix={false} />
          </Form.Item>
          <Form.Item name="institution" label="Đơn vị / tổ chức" rules={[{ required: true, message: 'Nhập đơn vị' }]}>
            <Input placeholder="Tên công ty hoặc trường" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PeopleManagementPage;
