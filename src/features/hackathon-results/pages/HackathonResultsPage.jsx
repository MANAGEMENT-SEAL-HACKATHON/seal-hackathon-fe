import React from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, Card, Alert, Button, Modal, Tooltip } from 'antd';
import { useHackathonResults } from '../hooks/useHackathonResults';
import TeamRankingTable from '../components/TeamRankingTable';
import ChapterRankingTable from '../components/ChapterRankingTable';
import IndividualRankingTable from '../components/IndividualRankingTable';
import PrizeListPanel from '../components/PrizeListPanel';
import { Trophy, Medal, User, Gift, Download } from 'lucide-react';

const HackathonResultsPage = ({ hackathonId: propHackathonId }) => {
  const params = useParams();
  const id = propHackathonId || params.id || params.hackathonId;

  const {
    loading,
    hackathon,
    teamRankings,
    chapterRankings,
    individualRankings,
    prizes,
    closing,
    exporting,
    canAwardPrize,
    canConfirm,
    canRevokePrize,
    canExport,
    showIndividualTab,
    refresh,
    handleConfirmClosure,
    handleExportRankings,
    handleRevokePrize,
  } = useHackathonResults(id);

  if (!id) return null;

  const status = String(hackathon?.status || '').toUpperCase();

  const openConfirmClosureModal = () => {
    Modal.confirm({
      title: 'Xác nhận Chốt Sổ Cuộc Thi?',
      content: (
        <div style={{ maxWidth: 300 }}>
          Hành động này sẽ khóa toàn bộ vòng thi và công bố điểm ngay lập tức cho sinh viên.
          KHÔNG THỂ HOÀN TÁC! Bạn có chắc chắn giám khảo đã chấm xong và đã trao đủ giải thưởng?
        </div>
      ),
      okText: 'Khóa điểm & Công bố',
      cancelText: 'Hủy',
      okButtonProps: { danger: true, id: 'gd6-confirm-ok' },
      cancelButtonProps: { id: 'gd6-confirm-cancel' },
      onOk: () => handleConfirmClosure(),
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
      children: <ChapterRankingTable data={chapterRankings} loading={loading} />,
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
      />
    ),
  });

  return (
    <div className="hackathon-results-page" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0 }}>Kết quả & Bảng xếp hạng</h2>
          <p style={{ color: '#666', marginTop: 8 }}>
            Bảng điểm chung cuộc, tổng kết điểm thi đua các cơ sở và danh sách trao giải.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {canExport && (
            <Button
              type="default"
              size="large"
              id="gd6-export-csv"
              icon={<Download size={18} />}
              loading={exporting}
              onClick={handleExportRankings}
            >
              Xuất CSV xếp hạng
            </Button>
          )}
          {status === 'PENDING_CONFIRM' && canConfirm && (
            <Button
              type="primary"
              danger
              size="large"
              icon={<Trophy size={18} />}
              id="gd6-confirm-trigger"
              loading={closing}
              onClick={openConfirmClosureModal}
            >
              Chốt sổ & Công bố kết quả
            </Button>
          )}
          {status === 'PENDING_CONFIRM' && !canConfirm && (
            <Tooltip title="Cần ghi nhận ít nhất một giải thưởng trước khi chốt sổ.">
              <Button type="primary" danger size="large" icon={<Trophy size={18} />} disabled>
                Chốt sổ & Công bố kết quả
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {hackathon && status !== 'FINISHED' && status !== 'PENDING_CONFIRM' && (
        <Alert
          type="warning"
          showIcon
          message={<span style={{ fontWeight: 600 }}>Chưa thể xem Bảng xếp hạng chung cuộc</span>}
          description="Kết quả chung cuộc và danh sách giải thưởng sẽ được tự động hiển thị ngay sau khi Vòng Chung kết kết thúc và Ban tổ chức hoàn tất việc chốt sổ điểm."
          style={{ marginBottom: 16, border: '1px solid #ffe58f', borderRadius: 8 }}
        />
      )}

      {status === 'PENDING_CONFIRM' && (
        <Alert
          type="info"
          showIcon
          message="Đang chờ công bố"
          description="Cuộc thi đang ở trạng thái PENDING_CONFIRM. Hãy tiến hành Trao Giải (ở Tab Giải thưởng) sau đó bấm nút Chốt Sổ ở trên cùng."
          style={{ marginBottom: 16 }}
        />
      )}

      {status === 'FINISHED' && (
        <Alert
          type="success"
          showIcon
          message="Đã công bố kết quả"
          description="Hackathon đã FINISHED. Sinh viên có thể xem bảng xếp hạng; Coordinator có thể xuất CSV."
          style={{ marginBottom: 16 }}
        />
      )}

      <Card bordered={false}>
        <Tabs defaultActiveKey="team" items={tabItems} size="large" />
      </Card>
    </div>
  );
};

export default HackathonResultsPage;
