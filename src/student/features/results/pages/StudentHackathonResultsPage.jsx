import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Button, Spin, Result, Card, Space, Tooltip, theme, Segmented, Empty, Alert } from 'antd';
import { ArrowLeft, Trophy, MessageSquareWarning, RefreshCw, Sparkles, BarChart3, Layers, Award, Medal } from 'lucide-react';
import { studentResultsService } from '../services/studentResults.service';
import { studentTeamService } from '../../team/services/studentTeam.service';
import { teamService } from '../../../../features/teams/services/teamService';
import { useStudentRoundResults } from '../hooks/useStudentRoundResults';
import PublicScoreboard from '../components/PublicScoreboard';
import StudentFinalLeaderboard from '../components/StudentFinalLeaderboard';
import MyHonorsPanel from '../components/MyHonorsPanel';
import StudentAppealModal from '../../portal/components/StudentAppealModal';
import { resolveAppealRoundOptions, resolveFinalRoundId } from '../../portal/utils/resolveAppealRound';

const { Title, Text } = Typography;

/* OFFICIAL FPT LOGO COLORS & CYBER PALETTE */
const FPT = {
  orange: '#F37021',
  orangeLight: '#FF8C42',
  blue: '#00529C',
  blueDark: '#00244D',
};

const matchesHackathon = (item, targetHackathonId) =>
  Number(item?.hackathonId ?? item?.hackathon_id) === Number(targetHackathonId);

/* INTERNAL COMPONENT: ROUND SCOREBOARD SECTION */
const RoundScoreboardSection = ({ roundId }) => {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';
  const { scoreboard, isLoading, error } = useStudentRoundResults(roundId, "public");
  
  const errCode = error?.code || error?.response?.data?.code;
  const errStatus = error?.status || error?.response?.status;
  const notPublished = errCode === "RESULT_NOT_PUBLISHED" || errStatus === 403 || errStatus === 404;

  if (!roundId) {
    return (
      <Card style={{ borderRadius: 24, padding: '40px 0', textAlign: 'center', background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc' }}>
        <Empty description={<span style={{ fontSize: 16, fontWeight: 700 }}>Vui lòng chọn một vòng thi phía trên để xem bảng điểm đã công bố</span>} />
      </Card>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      {error && !notPublished && (
        <Alert showIcon type="error" message="Không thể tải kết quả vòng thi" description={error.message || "Lỗi kết nối"} style={{ marginBottom: 24, borderRadius: 16 }} />
      )}
      {notPublished ? (
        <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 12px 32px rgba(0,0,0,0.06)', padding: '60px 0', background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#fff', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <BarChart3 size={80} strokeWidth={1.5} color="#d1d5db" />
          </div>
          <Title level={3} style={{ color: token.colorTextHeading, fontWeight: 900, margin: '0 0 12px' }}>
            Bảng điểm vòng thi chưa được công bố
          </Title>
          <Text type="secondary" style={{ fontSize: 16, maxWidth: 500, display: 'inline-block', lineHeight: 1.6 }}>
            Scoreboard công khai sẽ xuất hiện tại đây ngay sau khi Ban tổ chức chính thức phê duyệt và công bố kết quả chấm thi của vòng này.
          </Text>
        </Card>
      ) : (
        <PublicScoreboard scoreboard={scoreboard} isLoading={isLoading} />
      )}
    </div>
  );
};

const StudentHackathonResultsPage = () => {
  const { hackathonId } = useParams();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';
  const [loading, setLoading] = useState(true);
  
  // 3 Tabs: 'final_rankings' | 'round_scoreboards' | 'my_honors'
  const [activeMainTab, setActiveMainTab] = useState('final_rankings');
  
  // Tab 1: Xếp hạng chung cuộc
  const [finalRankings, setFinalRankings] = useState([]);
  const [rankingError, setRankingError] = useState(null);

  // Tab 2: Bảng điểm từng vòng từ Journey của đội.
  const [hackathonRounds, setHackathonRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState(null);

  // Tab 3: Vinh danh của tôi (Prizes / Certificates)
  const [prizes, setPrizes] = useState([]);
  const [certificates, setCertificates] = useState([]);

  // Khiếu nại
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealContext, setAppealContext] = useState({ teamId: null, roundId: null, isEliminated: false, isLeader: false });
  const [appealRoundOptions, setAppealRoundOptions] = useState([]);

  useEffect(() => {
    if (!hackathonId) return undefined;
    let cancelled = false;

    const loadTeamAndJourney = async () => {
      try {
        const teams = await studentTeamService.getMyTeams();
        const team = teams.find((t) => Number(t.hackathonId) === Number(hackathonId));
        
        if (team && !cancelled) {
          const [roundId, roundOptions] = await Promise.all([
            resolveFinalRoundId(hackathonId, team.id),
            resolveAppealRoundOptions(hackathonId, team.id),
          ]);

          if (!cancelled) {
            const isEliminated =
              String(team.status || '').toUpperCase() === 'ELIMINATED' ||
              String(team.participationStatus || team.lotteryStatus || '').toUpperCase() === 'ELIMINATED' ||
              Boolean(team.isEliminatedFromFinal);
            const isLeader = Boolean(team.isCurrentUserLeader || team.canTransferLeader);
            setAppealContext({ teamId: team.id, roundId, isEliminated, isLeader });
            setAppealRoundOptions(roundOptions);
          }

          // Lấy Round Options cho Student thông qua Journey (Không gọi coordinator-only /hackathons/{id}/rounds)
          try {
            const journey = await teamService.getJourney(team.id);
            const steps = journey?.steps || [];
            if (!cancelled) {
              const allRounds = steps
                .map((step) => ({
                  roundId: step.roundId ?? step.round_id ?? step.id,
                  name: step.roundName ?? step.round_name ?? step.name ?? `Vòng #${step.roundId}`,
                  isFinalRound: Boolean(step.isFinalRound || step.is_final_round || step.roundType === 'FINAL' || step.type === 'FINAL'),
                  status: step.participationStatus ?? step.participation_status ?? step.status,
                }))
                .filter((r) => r.roundId);
              
              setHackathonRounds(allRounds);
              setSelectedRoundId((currentRoundId) =>
                allRounds.some((r) => Number(r.roundId) === Number(currentRoundId))
                  ? currentRoundId
                  : allRounds[0]?.roundId ?? null,
              );
            }
          } catch {
            if (!cancelled) setHackathonRounds([]);
          }
        }
      } catch {
        if (!cancelled) {
          setAppealContext({ teamId: null, roundId: null, isEliminated: false, isLeader: false });
          setAppealRoundOptions([]);
          setHackathonRounds([]);
        }
      }
    };

    loadTeamAndJourney();

    return () => {
      cancelled = true;
    };
  }, [hackathonId]);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setRankingError(null);
    try {
      const [rankingsRes, prizesRes, certsRes] = await Promise.all([
        studentResultsService.getHackathonRankings(hackathonId).catch((err) => {
          setRankingError(err);
          return [];
        }),
        studentResultsService.getMyPrizes().catch(() => []),
        studentResultsService.getMyCertificates().catch(() => []),
      ]);

      setFinalRankings(Array.isArray(rankingsRes) ? rankingsRes : []);
      setPrizes((Array.isArray(prizesRes) ? prizesRes : []).filter((p) => matchesHackathon(p, hackathonId)));
      setCertificates((Array.isArray(certsRes) ? certsRes : []).filter((c) => matchesHackathon(c, hackathonId)));
    } finally {
      setLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    if (hackathonId) {
      fetchResults();
    }
  }, [hackathonId, fetchResults]);

  const canAppeal = Boolean(
    appealContext.teamId &&
    appealContext.roundId &&
    appealContext.isEliminated &&
    appealContext.isLeader
  );

  // Xử lý thông báo chờ Xếp hạng chung cuộc
  const rErrCode = rankingError?.code || rankingError?.response?.data?.code;
  const rErrStatus = rankingError?.status || rankingError?.response?.status;
  const isRankingNotAvailable =
    rErrCode === 'RESULT_NOT_AVAILABLE' ||
    rErrCode === 'FORBIDDEN' ||
    rErrStatus === 403 ||
    rErrStatus === 422 ||
    rErrStatus === 404 ||
    (finalRankings.length === 0 && rankingError);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Back Navigation */}
      <Button 
        type="text" 
        icon={<ArrowLeft size={18} style={{ color: FPT.blue }} />} 
        onClick={() => navigate('/student/results')}
        style={{ marginBottom: 20, padding: '8px 16px', height: 'auto', fontWeight: 700, fontSize: 15, borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}
      >
        Quay lại Trung tâm Vinh danh
      </Button>

      {/* 1. ESPORTS MISSION CONTROL COVER BANNER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #00244D 0%, #00529C 50%, #001F3F 100%)',
          borderRadius: 28,
          padding: '36px 40px',
          position: 'relative',
          overflow: 'hidden',
          color: '#fff',
          boxShadow: '0 20px 50px rgba(0, 82, 156, 0.25)',
          marginBottom: 28,
          border: '2px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Ambient glowing orb */}
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${FPT.orange} 0%, transparent 70%)`,
            opacity: 0.35,
            filter: 'blur(45px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24, position: 'relative', zIndex: 1 }}>
          <Space direction="vertical" size={12} style={{ maxWidth: 720 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  background: 'rgba(243, 112, 33, 0.3)',
                  color: '#FF8C42',
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid rgba(243, 112, 33, 0.5)',
                  boxShadow: '0 4px 12px rgba(243, 112, 33, 0.2)',
                }}
              >
                <Sparkles size={14} /> TRUNG TÂM KẾT QUẢ HACKATHON #{hackathonId}
              </span>
            </div>

            <Title level={1} style={{ color: '#fff', margin: 0, fontWeight: 900, fontSize: 32, letterSpacing: '-0.02em', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              {activeMainTab === 'final_rankings' && 'Xếp Hạng Chung Cuộc'}
              {activeMainTab === 'round_scoreboards' && 'Bảng Điểm Vòng Thi Đã Công Bố'}
              {activeMainTab === 'my_honors' && 'Vinh Danh & Giải Thưởng Của Tôi'}
            </Title>

            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 1.6 }}>
              {activeMainTab === 'final_rankings' && 'Bảng vàng xếp hạng chính thức toàn đoàn sau vòng Chung kết. Dữ liệu được xác thực trực tiếp từ hệ thống chấm thi của Ban giám khảo.'}
              {activeMainTab === 'round_scoreboards' && 'Tra cứu bảng điểm đội đã công bố cho từng vòng thi trong hành trình, bao gồm cả Chung kết khi có kết quả.'}
              {activeMainTab === 'my_honors' && 'Danh hiệu cá nhân/đội tuyển xuất sắc và tải giấy chứng nhận điện tử hợp lệ (PDF) do Ban Tổ Chức cấp phát.'}
            </Text>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: 6 }}>
                👑 BXH Chung Kết
              </span>
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: 6 }}>
                📊 {hackathonRounds.length} Vòng thi
              </span>
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: 6 }}>
                🏆 Vinh danh & PDF
              </span>
            </div>
          </Space>

          <Space size={14} style={{ zIndex: 2 }}>
            <Tooltip
              title={
                !appealContext.teamId
                  ? 'Bạn chưa tham gia đội trong hackathon này.'
                  : !appealContext.roundId
                    ? 'Chưa xác định vòng thi để gửi khiếu nại.'
                    : !appealContext.isEliminated
                      ? 'Chỉ đội bị loại thủ công (ELIMINATED) mới có quyền gửi khiếu nại.'
                      : !appealContext.isLeader
                        ? 'Chỉ Trưởng nhóm (Leader) mới có quyền gửi khiếu nại.'
                        : undefined
              }
            >
              <Button
                size="large"
                icon={<MessageSquareWarning size={18} style={{ color: canAppeal ? '#FF8C42' : 'inherit' }} />}
                onClick={() => setAppealOpen(true)}
                disabled={!canAppeal}
                style={{
                  borderRadius: 14,
                  height: 48,
                  fontWeight: 800,
                  padding: '0 24px',
                  background: canAppeal ? 'rgba(243, 112, 33, 0.2)' : 'rgba(255,255,255,0.1)',
                  borderColor: canAppeal ? '#F37021' : 'rgba(255,255,255,0.2)',
                  color: canAppeal ? '#FF8C42' : 'rgba(255,255,255,0.4)',
                }}
              >
                Gửi khiếu nại
              </Button>
            </Tooltip>
            <Button
              size="large"
              icon={<RefreshCw size={18} />}
              onClick={fetchResults}
              style={{
                borderRadius: 14,
                height: 48,
                fontWeight: 700,
                padding: '0 24px',
                background: 'rgba(255,255,255,0.15)',
                borderColor: 'rgba(255,255,255,0.3)',
                color: '#fff',
              }}
            >
              Làm mới
            </Button>
          </Space>
        </div>
      </div>

      {/* 2. UNIFIED 3-TAB MAIN NAVIGATION SWITCHER */}
      <div style={{ marginBottom: 28 }}>
        <Segmented
          size="large"
          value={activeMainTab}
          onChange={setActiveMainTab}
          options={[
            {
              label: (
                <div style={{ padding: '8px 20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                  <Medal size={18} style={{ color: activeMainTab === 'final_rankings' ? FPT.orange : 'inherit' }} />
                  👑 Xếp Hạng Chung Cuộc
                </div>
              ),
              value: 'final_rankings',
            },
            {
              label: (
                <div style={{ padding: '8px 20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                  <BarChart3 size={18} style={{ color: activeMainTab === 'round_scoreboards' ? FPT.blue : 'inherit' }} />
                  📊 Bảng Điểm Vòng Thi ({hackathonRounds.length})
                </div>
              ),
              value: 'round_scoreboards',
            },
            {
              label: (
                <div style={{ padding: '8px 20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                  <Award size={18} style={{ color: activeMainTab === 'my_honors' ? '#16a34a' : 'inherit' }} />
                  🏆 Vinh Danh Của Tôi
                </div>
              ),
              value: 'my_honors',
            },
          ]}
          style={{
            background: isDark ? 'rgba(30, 41, 59, 0.8)' : '#f1f5f9',
            padding: 6,
            borderRadius: 18,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1'}`,
            display: 'flex',
            flexWrap: 'wrap',
          }}
        />
      </div>

      {/* 3. CONTENT AREA FOR ACTIVE TAB */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
          <Text type="secondary" style={{ display: 'block', marginTop: 16, fontSize: 16 }}>Đang đồng bộ dữ liệu từ hệ thống...</Text>
        </div>
      ) : activeMainTab === 'final_rankings' ? (
        /* TAB 1: XẾP HẠNG CHUNG CUỘC */
        <div>
          {isRankingNotAvailable ? (
            <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 12px 32px rgba(0,0,0,0.06)', padding: '60px 0', background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#fff', textAlign: 'center' }}>
              <Result
                icon={<div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><Trophy size={80} strokeWidth={1.5} color="#d1d5db" /></div>}
                title={<span style={{ color: token.colorTextHeading, fontWeight: 900, fontSize: 26, letterSpacing: '-0.5px' }}>Bảng xếp hạng Chung kết chưa được công bố</span>}
                subTitle={<span style={{ fontSize: 16, color: token.colorTextSecondary, maxWidth: 540, display: 'inline-block', lineHeight: 1.6 }}>Ban giám khảo và Ban tổ chức đang thực hiện tổng hợp điểm số hoặc giải đấu chưa bước vào giai đoạn công bố kết quả chung cuộc. Vui lòng quay lại sau!</span>}
              />
            </Card>
          ) : (
            <StudentFinalLeaderboard data={finalRankings} loading={loading} />
          )}
        </div>
      ) : activeMainTab === 'round_scoreboards' ? (
        /* TAB 2: BẢNG ĐIỂM VÒNG THI */
        <div>
          {hackathonRounds.length === 0 ? (
            <Card style={{ borderRadius: 24, padding: '60px 0', textAlign: 'center', background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc' }}>
              <Empty description={<span style={{ fontSize: 16, fontWeight: 700 }}>Chưa có vòng thi nào trong hành trình của đội bạn</span>} />
            </Card>
          ) : (
            <>
              {/* Round Selection Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap', background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff', padding: '16px 20px', borderRadius: 20, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: token.colorTextHeading, marginRight: 8 }}>
                  <Layers size={18} style={{ color: FPT.blue }} /> Chọn Vòng Thi:
                </div>
                <Space wrap>
                  {hackathonRounds.map((r) => {
                    const rId = r.roundId;
                    const isSelected = Number(selectedRoundId) === Number(rId);
                    return (
                      <Button
                        key={rId}
                        type={isSelected ? "primary" : "default"}
                        size="large"
                        onClick={() => setSelectedRoundId(rId)}
                        style={{
                          borderRadius: 14,
                          fontWeight: 800,
                          background: isSelected ? 'linear-gradient(135deg, #00529C 0%, #00C6FF 100%)' : undefined,
                          borderColor: isSelected ? 'transparent' : undefined,
                          boxShadow: isSelected ? '0 6px 16px rgba(0, 82, 156, 0.35)' : undefined,
                        }}
                      >
                        {r.name}
                      </Button>
                    );
                  })}
                </Space>
              </div>

              {/* Render Scoreboard of selected round */}
              <RoundScoreboardSection roundId={selectedRoundId} />
            </>
          )}
        </div>
      ) : (
        /* TAB 3: VINH DANH CỦA TÔI */
        <div>
          <Alert
            showIcon
            type="info"
            message={<span style={{ fontWeight: 800, fontSize: 14 }}>Thông báo về giải thưởng & chứng nhận</span>}
            description="Giải thưởng và giấy chứng nhận điện tử (PDF) sẽ được Ban Tổ Chức cập nhật và cấp phát chính thức sau khi khép lại toàn bộ giải đấu."
            style={{ marginBottom: 24, borderRadius: 16 }}
          />
          <MyHonorsPanel 
            prizes={prizes} 
            certificates={certificates} 
            loading={loading} 
          />
        </div>
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
