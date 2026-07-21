import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Tabs, Card, Alert, Button, Modal, Tooltip, Input, List, Breadcrumb, Space, Tag, Typography } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { resolveStatusLabel } from '../../../shared/errors/resolveUserError';
import { HACKATHON_STATUS_COLORS } from '../../../shared/constants/labels';
import { useHackathonResults } from '../hooks/useHackathonResults';
import TeamRankingTable from '../components/TeamRankingTable';
import ChapterRankingTable from '../components/ChapterRankingTable';
import IndividualRankingTable from '../components/IndividualRankingTable';
import PrizeListPanel from '../components/PrizeListPanel';
import HackathonClosureStepper from '../components/HackathonClosureStepper';
import { Trophy, Medal, User, Gift, Download } from 'lucide-react';
import { whiteButtonStyle } from '../../../shared/theme/coordinatorTheme';

const { TextArea } = Input;
const { Title, Text } = Typography;

const HackathonResultsPage = ({ hackathonId: propHackathonId }) => {
  const params = useParams();
  const navigate = useNavigate();
  const id = propHackathonId || params.id || params.hackathonId;
  const [confirmNote, setConfirmNote] = useState('Ban tổ chức xác nhận chốt điểm');

  const {
    loading,
    hackathon,
    teamRankings,
    chapterRankings,
    individualRankings,
    prizes,
    awardsReady,
    awardsBlockers,
    chapterPolling,
    closing,
    exporting,
    canAwardPrize,
    canConfirm,
    confirmDisabledReason,
    canRevokePrize,
    canExport,
    showIndividualTab,
    refresh,
    handleConfirmClosure,
    handleExportRankings,
    handleRevokePrize,
  } = useHackathonResults(id);

  if (!id) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Không xác định được hackathon"
        description="Liên kết kết quả không hợp lệ hoặc đang thiếu mã hackathon."
      />
    );
  }

  const status = String(hackathon?.status || '').toUpperCase();

  const openConfirmClosureModal = () => {
    Modal.confirm({
      title: 'Xác nhận Chốt Sổ Cuộc Thi?',
      content: (
        <div style={{ maxWidth: 360 }}>
          <p>
            Hành động này sẽ khóa toàn bộ vòng thi và công bố điểm ngay lập tức cho sinh viên.
            KHÔNG THỂ HOÀN TÁC!
          </p>
          <TextArea
            rows={3}
            value={confirmNote}
            onChange={(e) => setConfirmNote(e.target.value)}
            placeholder="Ghi chú xác nhận (tùy chọn)"
          />
        </div>
      ),
      okText: 'Khóa điểm & Công bố',
      cancelText: 'Hủy',
      okButtonProps: { danger: true, id: 'hackathon-confirm-ok' },
      cancelButtonProps: { id: 'hackathon-confirm-cancel' },
      onOk: () => handleConfirmClosure(confirmNote.trim() || undefined),
    });
  };

  const tabItems = [
    {
      key: 'team',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={16} /> Bảng XH Team</span>,
      children: <TeamRankingTable data={teamRankings} loading={loading} />,
    },
    {
      key: 'chapter',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Medal size={16} /> Bảng XH Cơ sở (Chapter)</span>,
      children: (
        <>
          {chapterPolling && (
            <Alert type="info" showIcon message="Đang tính toán BXH cơ sở…" style={{ marginBottom: 12 }} />
          )}
          {!chapterPolling && status === 'FINISHED' && chapterRankings.length === 0 && (
            <Alert type="info" showIcon message="BXH cơ sở đang được tính — thử làm mới sau vài giây." style={{ marginBottom: 12 }} />
          )}
          <ChapterRankingTable data={chapterRankings} loading={loading} />
        </>
      ),
    },
  ];

  if (showIndividualTab) {
    tabItems.push({
      key: 'individual',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><User size={16} /> Bảng XH Cá nhân</span>,
      children: <IndividualRankingTable data={individualRankings} loading={loading} />,
    });
  }

  tabItems.push({
    key: 'prizes',
    label: <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Gift size={16} /> Giải thưởng</span>,
    children: (
      <PrizeListPanel
        data={prizes}
        loading={loading}
        hackathonId={id}
        onRefresh={refresh}
        canAward={canAwardPrize}
        canRevoke={canRevokePrize}
        onRevoke={handleRevokePrize}
        awardedTeamIds={prizes.map((p) => p.teamId ?? p.team_id).filter(Boolean)}
        awardedRanks={prizes.map((p) => p.prizeRank ?? p.prize_rank).filter(Boolean)}
      />
    ),
  });

  return (
    <div className="hackathon-results-page coord-page" style={{ padding: 24 }}>
      <Space direction="vertical" size={18} style={{ width: '100%' }}>
        <Button
          type="link"
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate(`/hackathons/${id}/setup`)}
          style={{ padding: 0, color: '#475569', fontWeight: 600, width: 'fit-content' }}
        >
          Quay lại Cấu hình sự kiện
        </Button>
        <Breadcrumb
          items={[
            { title: <Link to="/hackathons">Hackathons</Link> },
            { title: <Link to={`/hackathons/${id}/setup`}>Setup</Link> },
            { title: 'Đóng giải & công bố kết quả' },
          ]}
        />

      <HackathonClosureStepper
        hackathonId={id}
        status={status}
        prizesCount={prizes.length}
        awardsReady={awardsReady}
        canConfirm={canConfirm}
        canExport={canExport}
      />

      <Card style={{ borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <Space direction="vertical" size={8}>
            <Space wrap>
              <Tag color="blue">Kết quả hackathon</Tag>
              {status && (
                <Tag color={HACKATHON_STATUS_COLORS[String(status).toUpperCase()] || 'default'}>
                  {resolveStatusLabel(status)}
                </Tag>
              )}
              <Tag color="purple">Giải thưởng: {prizes.length}</Tag>
            </Space>
            <Title level={2} style={{ margin: 0 }}>
              Kết quả & Bảng xếp hạng
            </Title>
            <Text style={{ color: '#475569' }}>
              BXH chung cuộc và trao giải.
            </Text>
          </Space>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button onClick={refresh} style={whiteButtonStyle}>Làm mới</Button>
          {canExport && (
            <Button
              type="default"
              size="large"
              id="hackathon-export-csv"
              icon={<Download size={18} />}
              loading={exporting}
              onClick={handleExportRankings}
              style={whiteButtonStyle}
            >
              Xuất CSV
            </Button>
          )}
          {status === 'PENDING_CONFIRM' && canConfirm && (
            <Button
              type="primary"
              danger
              size="large"
              icon={<Trophy size={18} />}
              id="hackathon-confirm-trigger"
              loading={closing}
              onClick={openConfirmClosureModal}
            >
              Chốt sổ & Công bố kết quả
            </Button>
          )}
          {status === 'PENDING_CONFIRM' && !canConfirm && (
            <Tooltip title={confirmDisabledReason || 'Chưa đủ điều kiện chốt sổ.'}>
              <Button type="primary" danger size="large" icon={<Trophy size={18} />} disabled id="hackathon-confirm-trigger">
                Chốt sổ & Công bố kết quả
              </Button>
            </Tooltip>
          )}
        </div>
        </div>
      </Card>

      {status === 'PENDING_CONFIRM' && awardsBlockers.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="AWARDS readiness — cần xử lý trước khi chốt sổ"
          description={
            <List
              size="small"
              dataSource={awardsBlockers}
              renderItem={(item) => <List.Item>{item?.message || item?.code}</List.Item>}
            />
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {hackathon && status !== 'FINISHED' && status !== 'PENDING_CONFIRM' && (
        <Alert
          type="warning"
          showIcon
          message={<span style={{ fontWeight: 600 }}>Giai đoạn Chung kết đang diễn ra</span>}
          description="Bảng xếp hạng đội có thể xem sớm. Trao giải và chốt sổ chỉ khả dụng khi sự kiện chuyển sang Chờ chốt sổ (sau khi khóa chấm Chung kết)."
          style={{ marginBottom: 16, border: '1px solid #ffe58f', borderRadius: 8 }}
        />
      )}

      {status === 'PENDING_CONFIRM' && (
        <Alert
          type="info"
          showIcon
          message="Đang chờ công bố"
          description="Cuộc thi đang ở trạng thái Chờ chốt sổ. Hãy trao giải (tab Giải thưởng) rồi bấm Chốt sổ."
          style={{ marginBottom: 16 }}
        />
      )}

      {status === 'FINISHED' && (
        <Alert
          type="success"
          showIcon
          message="Đã công bố kết quả"
          description="Sự kiện đã kết thúc. Sinh viên có thể xem bảng xếp hạng; Ban tổ chức có thể xuất CSV."
          style={{ marginBottom: 16 }}
        />
      )}

      <Card bordered={false}>
        <Tabs defaultActiveKey="team" items={tabItems} size="large" />
      </Card>
      </Space>
    </div>
  );
};

export default HackathonResultsPage;
