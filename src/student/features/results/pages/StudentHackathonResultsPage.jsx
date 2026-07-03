import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Typography, Button, Spin, Result, Card, Tabs, Space, Tooltip } from 'antd';
import { ArrowLeft, Trophy, MessageSquareWarning } from 'lucide-react';
import { studentResultsService } from '../services/studentResults.service';
import { studentTeamService } from '../../team/services/studentTeam.service';
import StudentAppealModal from '../../portal/components/StudentAppealModal';
import StudentFinalLeaderboard from '../components/StudentFinalLeaderboard';
import MyHonorsPanel from '../components/MyHonorsPanel';
import ChapterRankingTable from '../../../../features/hackathons/components/ChapterRankingTable';
import { mapChapterRankings } from '../../../../features/hackathons/mappers/ranking.mapper';
import { resolveAppealRoundOptions, resolveFinalRoundId } from '../../portal/utils/resolveAppealRound';

const { Title, Text } = Typography;

const matchesHackathon = (item, targetHackathonId) =>
  Number(item?.hackathonId ?? item?.hackathon_id) === Number(targetHackathonId);

const StudentHackathonResultsPage = () => {
  const { hackathonId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [teamRankings, setTeamRankings] = useState([]);
  const [chapterRankings, setChapterRankings] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealContext, setAppealContext] = useState({ teamId: null, roundId: null });
  const [appealRoundOptions, setAppealRoundOptions] = useState([]);

  useEffect(() => {
    if (!hackathonId) return undefined;
    let cancelled = false;

    const loadAppealContext = async () => {
      try {
        const teams = await studentTeamService.getMyTeams();
        const team = teams.find((t) => Number(t.hackathonId) === Number(hackathonId));
        if (!team || cancelled) return;

        const [roundId, roundOptions] = await Promise.all([
          resolveFinalRoundId(hackathonId, team.id),
          resolveAppealRoundOptions(hackathonId),
        ]);

        if (!cancelled) {
          setAppealContext({ teamId: team.id, roundId });
          setAppealRoundOptions(roundOptions);
        }
      } catch {
        if (!cancelled) {
          setAppealContext({ teamId: null, roundId: null });
          setAppealRoundOptions([]);
        }
      }
    };

    loadAppealContext();
    return () => {
      cancelled = true;
    };
  }, [hackathonId]);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [rankingsRes, prizesRes, certsRes, chapterRes] = await Promise.all([
        studentResultsService.getHackathonRankings(hackathonId),
        studentResultsService.getMyPrizes(),
        studentResultsService.getMyCertificates(),
        studentResultsService.getChapterRankings(hackathonId),
      ]);

      setTeamRankings(Array.isArray(rankingsRes) ? rankingsRes : rankingsRes?.items || []);
      setChapterRankings(mapChapterRankings(chapterRes));
      setPrizes((Array.isArray(prizesRes) ? prizesRes : []).filter((p) => matchesHackathon(p, hackathonId)));
      setCertificates((Array.isArray(certsRes) ? certsRes : []).filter((c) => matchesHackathon(c, hackathonId)));
    } catch (error) {
      if (error.response?.data?.code === 'RESULT_NOT_AVAILABLE' || error.response?.status === 422) {
        setErrorMsg("Kết quả chung cuộc đang được tổng hợp. Vui lòng quay lại sau khi Ban tổ chức công bố giải thưởng.");
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        setErrorMsg('Bạn chưa có quyền xem kết quả của hackathon này bằng tài khoản hiện tại.');
      } else {
        setErrorMsg("Không thể tải kết quả chung cuộc do lỗi hệ thống hoặc kết nối mạng. Vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    if (hackathonId) {
      fetchResults();
    }
  }, [hackathonId, fetchResults]);

  const canAppeal = Boolean(appealContext.teamId && appealContext.roundId);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      <Button 
        type="text" 
        icon={<ArrowLeft size={16} />} 
        onClick={() => navigate('/student/results')}
        style={{ marginBottom: 16, padding: 0 }}
      >
        Quay lại tìm kiếm
      </Button>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.5px', color: '#1f2937' }}>
              Vinh danh Chung cuộc
            </Title>
            <Text type="secondary" style={{ fontSize: 16, marginTop: 4, display: 'block' }}>
              Bảng xếp hạng toàn đoàn và giải thưởng cá nhân xuất sắc.
            </Text>
          </div>
          <Space>
            <Tooltip
              title={
                !appealContext.teamId
                  ? 'Bạn chưa tham gia đội trong hackathon này.'
                  : !appealContext.roundId
                    ? 'Chưa xác định vòng chung kết để gửi khiếu nại.'
                    : undefined
              }
            >
              <Button
                icon={<MessageSquareWarning size={16} />}
                onClick={() => setAppealOpen(true)}
                disabled={!canAppeal}
              >
                Gửi khiếu nại
              </Button>
            </Tooltip>
            <Button onClick={fetchResults}>Làm mới</Button>
          </Space>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      ) : errorMsg ? (
        <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.04)', marginTop: 40, padding: '40px 0' }}>
          <Result
            icon={<div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Trophy size={72} strokeWidth={1.5} color="#d1d5db" /></div>}
            title={<span style={{ color: '#1f2937', fontWeight: 800, fontSize: 24, letterSpacing: '-0.5px' }}>Đang chờ công bố kết quả</span>}
            subTitle={<span style={{ fontSize: 16, color: '#6b7280', maxWidth: 500, display: 'inline-block' }}>{errorMsg}</span>}
          />
        </Card>
      ) : (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={8}>
            <MyHonorsPanel 
              prizes={prizes} 
              certificates={certificates} 
              loading={loading} 
            />
          </Col>

          <Col xs={24} lg={16}>
            <Tabs
              items={[
                {
                  key: 'team',
                  label: 'BXH Team',
                  children: <StudentFinalLeaderboard data={teamRankings} loading={loading} />,
                },
                ...(chapterRankings.length > 0
                  ? [{
                      key: 'chapter',
                      label: 'BXH Cơ sở',
                      children: <ChapterRankingTable data={chapterRankings} loading={loading} />,
                    }]
                  : []),
              ]}
            />
          </Col>
        </Row>
      )}
      <StudentAppealModal
        open={appealOpen}
        onClose={() => setAppealOpen(false)}
        teamId={appealContext.teamId}
        roundId={appealContext.roundId}
        roundOptions={appealRoundOptions}
        onRoundChange={(nextRoundId) =>
          setAppealContext((prev) => ({ ...prev, roundId: nextRoundId }))
        }
      />
    </div>
  );
};

export default StudentHackathonResultsPage;
