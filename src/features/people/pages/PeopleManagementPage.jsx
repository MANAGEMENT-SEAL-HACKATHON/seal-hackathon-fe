// src/features/people/pages/PeopleManagementPage.jsx
import { useState } from 'react';
import { Card, Tabs, Button, Table, Form, Input, Modal, Select, Tag, Popconfirm, Alert, Typography, message, Switch, Space, Avatar } from 'antd';
import { UserPlus, Trash2, Eye } from 'lucide-react';
import { usePeopleManagement } from '../hooks/usePeopleManagement';
import PersonAssignmentsModal from '../components/PersonAssignmentsModal';
import EmailAutoComplete from '../../../shared/components/ui/EmailAutoComplete';
import {
  resolveFinalAssignmentType,
  resolvePrelimAssignmentType,
} from '../utils/peoplePersonnelRules';

const { Option } = Select;
const { Text } = Typography;

const PeopleManagementPage = ({ hackathonId, onUpdated }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignmentsPerson, setAssignmentsPerson] = useState(null);
  const [inviteForm] = Form.useForm();
  const [mentorForm] = Form.useForm();
  const [prelimJudgeForm] = Form.useForm();
  const [finalJudgeForm] = Form.useForm();

  const selectedMentorTrackId = Form.useWatch('track_id', mentorForm);
  const selectedPrelimPersonId = Form.useWatch('person_id', prelimJudgeForm);
  const selectedFinalPersonId = Form.useWatch('person_id', finalJudgeForm);

  const selectedPrelimJudgeTrackId = Form.useWatch('track_id', prelimJudgeForm);
  const selectedFinalJudgeTrackId = Form.useWatch('track_id', finalJudgeForm);

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
    isLoading,
    createTempJudge,
    assignMentor,
    removeMentor,
    assignJudge,
    removeJudge,
    patchUserDeptHead,
    isMentorBlockedForTrack,
    isJudgeBlockedForTrack,
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
    switch (role) {
      case 'HEAD':
        return <Tag color="red">Trưởng ban (HEAD)</Tag>;
      case 'FINAL_EXTERNAL':
        return <Tag color="purple">Giám khảo CK (FINAL_EXTERNAL)</Tag>;
      case 'CALIBRATION':
        return <Tag color="gold">Chấm chéo</Tag>;
      case 'NORMAL':
        return <Tag color="blue">Giám khảo (NORMAL)</Tag>;
      default:
        return <Tag color="blue">Giám khảo</Tag>;
    }
  };

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
      const blocked = trackId && isMentorBlockedForTrack(p.id, trackId);
      const rawName = getPersonDisplayName(p);
      const formattedName = getFormattedPersonName(p);
      const personCode = getPersonCode(p);
      const roleLabel = p.role === 'JUDGE' ? 'Giám khảo' : 'Mentor';
      const avatarSrc = p.avatarUrl || p.avatar_url || p.avatar;
      return (
        <Option key={p.id} value={p.id} disabled={blocked} label={`${formattedName} (${personCode})`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
            <Avatar
              size={32}
              src={avatarSrc}
              style={{ backgroundColor: '#1677ff', fontSize: 13, flexShrink: 0 }}
            >
              {rawName.charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ lineHeight: 1.4, minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text strong style={{ fontSize: 13 }}>
                  {formattedName}
                </Text>
                <Tag color="orange" style={{ margin: 0, fontSize: 11, fontWeight: 700, padding: '0 6px' }}>
                  {personCode}
                </Tag>
                {blocked && <Text type="danger" style={{ fontSize: 11 }}> (đang là giám khảo cùng bảng)</Text>}
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
      const blocked = trackId && isJudgeBlockedForTrack(p.id, trackId);
      const roleLabel = resolvePrelimAssignmentType(p);
      return (
        <Option key={p.id} value={p.id} disabled={blocked}>
          {p.fullName || p.full_name || p.name}
          {blocked ? ' (đang là mentor cùng bảng)' : ` — ${roleLabel}`}
        </Option>
      );
    });

  const finalJudgeOptionsForTrack = (trackId) =>
    finalJudgePool.map((p) => {
      const blocked = trackId && isJudgeBlockedForTrack(p.id, trackId);
      const roleLabel = resolveFinalAssignmentType(p);
      return (
        <Option key={p.id} value={p.id} disabled={blocked}>
          {p.fullName || p.full_name || p.name}
          {blocked ? ' (đang là mentor cùng bảng)' : ` — ${roleLabel}`}
        </Option>
      );
    });

  const selectedPrelimPerson = prelimJudgePool.find((p) => p.id === selectedPrelimPersonId);
  const selectedFinalPerson = finalJudgePool.find((p) => p.id === selectedFinalPersonId);
  const prelimRolePreview = selectedPrelimPerson
    ? resolvePrelimAssignmentType(selectedPrelimPerson)
    : null;
  const finalRolePreview = selectedFinalPerson
    ? resolveFinalAssignmentType(selectedFinalPerson)
    : null;

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, borderRadius: 12 }}
        message="Phân công nhân sự theo bảng đấu"
        description={
          <Text type="secondary" style={{ fontSize: 13 }}>
            Ở giai đoạn chuẩn bị, bạn gán mentor và giám khảo cho từng <strong>bảng đấu</strong> — không cần chọn từng đội.
            Sau khi bốc thăm, mọi đội thuộc bảng nào sẽ được hỗ trợ/chấm bởi người đã gán cho bảng đó.
            Một người không thể vừa mentor vừa giám khảo cùng một bảng.
          </Text>
        }
      />

      <Card style={{ borderRadius: 12 }}>
        <Tabs defaultActiveKey="2" destroyInactiveTabPane>
          <Tabs.TabPane tab="Giám khảo khách mời" key="1">
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="primary" icon={<UserPlus size={16} />} onClick={() => setIsModalOpen(true)}>
                Mời giám khảo
              </Button>
            </div>
            <Alert
              message="Giám khảo từ bên ngoài"
              description="Hệ thống gửi email kèm mật khẩu tạm (72 giờ) để họ đăng nhập."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Table
              dataSource={tempJudges}
              rowKey="id"
              pagination={false}
              loading={isLoading}
              locale={{ emptyText: 'Chưa mời giám khảo khách mời nào.' }}
              columns={[
                { title: 'Họ tên', dataIndex: 'fullName', render: (t, r) => <strong>{t || r.name}</strong> },
                { title: 'Email', dataIndex: 'email' },
                { title: 'Đơn vị', dataIndex: 'institution' },
                {
                  title: 'Trạng thái',
                  dataIndex: 'status',
                  render: (t) => <Tag color={t === 'APPROVED' ? 'green' : 'orange'}>{t === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'}</Tag>,
                },
              ]}
            />
          </Tabs.TabPane>

          <Tabs.TabPane tab="Mentor theo bảng đấu" key="2">
            <Card type="inner" style={{ marginBottom: 24, background: '#fafafa', borderRadius: 8 }}>
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

                <Button type="primary" htmlType="submit" loading={isLoading} disabled={!tracks.length}>
                  Gán mentor
                </Button>
              </Form>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
                Hiện cả mentor/giám khảo <strong>INTERNAL</strong> hoặc <strong>trưởng ban</strong> — một người có thể vừa mentor vừa giám khảo, nhưng <strong>không cùng một bảng đấu</strong>.
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
                        <Avatar size={24} src={avatarSrc} style={{ backgroundColor: '#1677ff', fontSize: 11 }}>
                          {rawName.charAt(0).toUpperCase()}
                        </Avatar>
                        <div>
                          <Text strong style={{ color: '#1677ff', marginRight: 6 }}>
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
                      <Button type="text" danger icon={<Trash2 size={16} />} />
                    </Popconfirm>
                  ),
                },
              ]}
            />
          </Tabs.TabPane>

          <Tabs.TabPane tab="Giám khảo Sơ loại" key="3">
            <Card type="inner" style={{ marginBottom: 24, background: '#fafafa', borderRadius: 8 }}>
              <Form
                layout="inline"
                form={prelimJudgeForm}
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

                <Form.Item label="Vai trò">
                  {prelimRolePreview ? (
                    renderJudgeRole(prelimRolePreview)
                  ) : (
                    <Text type="secondary">Chọn giám khảo để hiện vai trò</Text>
                  )}
                </Form.Item>

                <Button type="primary" htmlType="submit" loading={isLoading} disabled={!prelimTracks.length}>
                  Gán giám khảo
                </Button>
              </Form>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
                Chỉ hiện giám khảo/mentor <strong>INTERNAL</strong> hoặc <strong>trưởng ban</strong>. Vai trò gán tự lấy từ hồ sơ (HEAD / NORMAL).
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
                    return <strong>{found?.fullName || found?.name || r.judge_name || 'Không rõ'}</strong>;
                  },
                },
                { title: 'Bảng đấu', dataIndex: 'target_name', render: (t) => <Tag color="geekblue">{t}</Tag> },
                { title: 'Vai trò', dataIndex: 'assignment_type', render: renderJudgeRole },
                {
                  title: '',
                  width: 80,
                  align: 'right',
                  render: (_, r) => (
                    <Popconfirm title="Gỡ giám khảo khỏi bảng này?" onConfirm={() => removeJudge(r.id)}>
                      <Button type="text" danger icon={<Trash2 size={16} />} />
                    </Popconfirm>
                  ),
                },
              ]}
            />
          </Tabs.TabPane>

          <Tabs.TabPane tab="Giám khảo Chung kết" key="4">
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Bước 4.5 - Gán giám khảo Chung kết"
              description="Luồng này dùng API round-scoped theo BE: POST /api/v1/rounds/{finalRoundId}/judge-assignments."
            />
            <Card type="inner" style={{ marginBottom: 24, background: '#fafafa', borderRadius: 8 }}>
              <Form
                layout="inline"
                form={finalJudgeForm}
                initialValues={{ is_final_assignment: true }}
                onFinish={(vals) =>
                  assignJudge(vals, () =>
                    finalJudgeForm.resetFields(['person_id', 'track_id', 'round_id'])
                  )
                }
              >
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
                    disabled={!selectedFinalJudgeTrackId && finalTracks.length > 0}
                  >
                    {finalJudgeOptionsForTrack(selectedFinalJudgeTrackId)}
                  </Select>
                </Form.Item>
                <Form.Item name="is_final_assignment" hidden>
                  <Input />
                </Form.Item>
                <Form.Item label="Vai trò">
                  {finalRolePreview ? (
                    renderJudgeRole(finalRolePreview)
                  ) : (
                    <Text type="secondary">Chọn giám khảo để hiện vai trò</Text>
                  )}
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={isLoading} disabled={!finalTracks.length && !finalRounds.length}>
                  Gán giám khảo CK
                </Button>
              </Form>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
                Chỉ hiện giám khảo <strong>EXTERNAL</strong> hoặc <strong>trưởng ban</strong>. Mentor và INTERNAL thường không được chấm Chung kết. Vai trò tự lấy từ hồ sơ.
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
                    return <strong>{found?.fullName || found?.name || r.judge_name || 'Không rõ'}</strong>;
                  },
                },
                { title: 'Vòng', dataIndex: 'target_name', render: (t) => <Tag color="purple">{t}</Tag> },
                { title: 'Vai trò', dataIndex: 'assignment_type', render: renderJudgeRole },
              ]}
            />
          </Tabs.TabPane>

          <Tabs.TabPane tab="Phân quyền nhân sự" key="5">
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Trưởng ban & lịch phân công"
              description="Đặt is_dept_head cho judge/mentor trước khi phân công Chung kết. Xem lịch phân công theo từng người."
            />
            <Table
              dataSource={[...judges, ...mentors].filter((p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx)}
              rowKey="id"
              pagination={false}
              loading={isLoading}
              columns={[
                {
                  title: 'Họ tên',
                  render: (_, r) => r.fullName || r.full_name || r.name,
                },
                {
                  title: 'Vai trò',
                  dataIndex: 'role',
                  render: (role) => <Tag>{role}</Tag>,
                },
                {
                  title: 'Trưởng ban',
                  render: (_, r) => (
                    <Switch
                      checked={Boolean(r.isDeptHead ?? r.is_dept_head)}
                      disabled={!['JUDGE', 'MENTOR'].includes(r.role)}
                      onChange={(checked) => patchUserDeptHead(r.id, checked)}
                    />
                  ),
                },
                {
                  title: '',
                  width: 120,
                  render: (_, r) => (
                    <Button
                      size="small"
                      icon={<Eye size={14} />}
                      onClick={() => setAssignmentsPerson(r)}
                    >
                      Lịch PC
                    </Button>
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
