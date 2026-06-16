import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, Card, message, Alert, Button, Popconfirm } from 'antd';
import { hackathonResultsService } from '../services/hackathonResults.service';
import { mapTeamRankings, mapChapterRankings, mapIndividualRankings } from '../mappers/ranking.mapper';
import TeamRankingTable from '../components/TeamRankingTable';
import ChapterRankingTable from '../components/ChapterRankingTable';
import IndividualRankingTable from '../components/IndividualRankingTable';
import PrizeListPanel from '../components/PrizeListPanel';
import { Trophy, Medal, User, Gift } from 'lucide-react';
import { hackathonService } from '../../hackathons/services/hackathonService';

const HackathonResultsPage = ({ hackathonId: propHackathonId }) => {
  const params = useParams();
  const id = propHackathonId || params.id || params.hackathonId;
  const [loading, setLoading] = useState(true);
  const [hackathon, setHackathon] = useState(null);
  
  const [teamRankings, setTeamRankings] = useState([]);
  const [chapterRankings, setChapterRankings] = useState([]);
  const [individualRankings, setIndividualRankings] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [closing, setClosing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch hackathon config first
      const hackRes = await hackathonService.getById(id);
      const hackData = hackRes?.data || hackRes;
      setHackathon(hackData);

      // Fetch all rankings concurrently
      const [teamsRes, chaptersRes, prizesRes] = await Promise.all([
        hackathonResultsService.getTeamRankings(id),
        hackathonResultsService.getChapterRankings(id),
        hackathonResultsService.getPrizes(id)
      ]);

      setTeamRankings(mapTeamRankings(teamsRes));
      setChapterRankings(mapChapterRankings(chaptersRes));
      setPrizes(prizesRes);

      // Fetch Individual Rankings only if enabled
      if (hackData?.individual_ranking_enabled) {
        try {
          const indRes = await hackathonResultsService.getIndividualRankings(id);
          setIndividualRankings(mapIndividualRankings(indRes));
        } catch (e) {
          console.warn("Individual ranking fetch error:", e);
        }
      }
    } catch (error) {
      message.error("Có lỗi xảy ra khi lấy dữ liệu bảng xếp hạng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const handleConfirmClosure = async () => {
    try {
      setClosing(true);
      await hackathonResultsService.confirmClosure(id, "Ban tổ chức xác nhận chốt điểm");
      message.success("Đã khóa điểm và công bố kết quả thành công!");
      fetchData(); // Reload to update status to FINISHED
    } catch (error) {
      if (error.response?.data?.message) {
        message.error(`Không thể chốt sổ: ${error.response.data.message}`);
      } else {
        message.error("Lỗi khi chốt sổ cuộc thi.");
      }
    } finally {
      setClosing(false);
    }
  };

  if (!id) return null;

  const tabItems = [
    {
      key: 'team',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={16} /> Bảng XH Team</span>,
      children: <TeamRankingTable data={teamRankings} loading={loading} />
    },
    {
      key: 'chapter',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Medal size={16} /> Bảng XH Cơ sở (Chapter)</span>,
      children: <ChapterRankingTable data={chapterRankings} loading={loading} />
    }
  ];

  if (hackathon?.individual_ranking_enabled) {
    tabItems.push({
      key: 'individual',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><User size={16} /> Bảng XH Cá nhân</span>,
      children: <IndividualRankingTable data={individualRankings} loading={loading} />
    });
  }

  tabItems.push({
    key: 'prizes',
    label: <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Gift size={16} /> Giải thưởng</span>,
    children: <PrizeListPanel data={prizes} loading={loading} hackathonId={id} onRefresh={fetchData} />
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
        
        {hackathon?.status === 'PENDING_CONFIRM' && (
          <Popconfirm
            title="Xác nhận Chốt Sổ Cuộc Thi?"
            description={<div style={{ maxWidth: 300 }}>Hành động này sẽ khóa toàn bộ vòng thi và công bố điểm ngay lập tức cho sinh viên. KHÔNG THỂ HOÀN TÁC! Bạn có chắc chắn giám khảo đã chấm xong và đã trao đủ giải thưởng?</div>}
            onConfirm={handleConfirmClosure}
            okText="Khóa điểm & Công bố"
            cancelText="Hủy"
            okButtonProps={{ danger: true, loading: closing }}
          >
            <Button type="primary" danger size="large" icon={<Trophy size={18} />}>
              Chốt sổ & Công bố kết quả
            </Button>
          </Popconfirm>
        )}
      </div>

      {hackathon && hackathon.status !== 'FINISHED' && hackathon.status !== 'PENDING_CONFIRM' && (
        <Alert 
          type="warning" 
          showIcon 
          message={<span style={{ fontWeight: 600 }}>Chưa thể xem Bảng xếp hạng chung cuộc</span>}
          description="Kết quả chung cuộc và danh sách giải thưởng sẽ được tự động hiển thị ngay sau khi Vòng Chung kết kết thúc và Ban tổ chức hoàn tất việc chốt sổ điểm."
          style={{ marginBottom: 16, border: '1px solid #ffe58f', borderRadius: 8 }}
        />
      )}

      {hackathon?.status === 'PENDING_CONFIRM' && (
        <Alert 
          type="info" 
          showIcon 
          message="Đang chờ công bố" 
          description="Cuộc thi đang ở trạng thái PENDING_CONFIRM. Hãy tiến hành Trao Giải (ở Tab Giải thưởng) sau đó bấm nút Chốt Sổ ở trên cùng."
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
