/**
 * Component: TeamOverviewCard
 * Chức năng: Card hiển thị thông tin tổng quan về đội (Tournament Credential Banner Strip).
 * Cải tiến UI Siêu Cấp - "GọN GÀNG & TINH TẾ" (Sleek & Compact Credential Strip):
 * - Tối ưu khoảng cách và chiều cao dải banner, giữ trọn nét sang trọng nhưng không tốn diện tích màn hình.
 * - Biểu tượng Cúp Vàng 3D và nút Xác nhận đội hình được căn chỉnh súc tích, đẳng cấp.
 */
import { useEffect, useState } from 'react';
import { Button, Modal, Progress, Space, Tag, Typography, message, theme, Row, Col, Spin } from 'antd';
import { CheckCircleOutlined, LockOutlined, UnlockOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Trophy, Shield, Flame, Sparkles, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { getStudentTeamErrorMessage } from '../constants/studentTeam.constants';
import { teamService } from '../../../../features/teams/services/teamService';
import { studentResultsService } from '../../results/services/studentResults.service';

const { Text, Title } = Typography;

/* OFFICIAL FPT LOGO COLORS & CYBER PALETTE */
const FPT = {
  blue: '#00529C',
  blueDark: '#003366',
  orange: '#F37021',
  orangeLight: '#FF8C42',
  green: '#46B749',
};

const TeamOverviewCard = ({ team, onConfirmFormation, actionLoading = false }) => {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';
  const [teamResult, setTeamResult] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [isLoadingScores, setIsLoadingScores] = useState(false);

  useEffect(() => {
    if (!team?.id) {
      setTeamResult(null);
      setIsPublished(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setIsLoadingScores(true);
      try {
        const journey = await teamService.getJourney(team.id);
        const steps = Array.isArray(journey?.steps) ? journey.steps : [];
        const prelim =
          steps.find((s) => {
            const name = String(s.roundName || s.round_name || '');
            return !/chung\s*kết|final/i.test(name);
          }) || steps[0];
        const prelimRoundId = prelim?.roundId ?? prelim?.round_id;
        if (!prelimRoundId) return;

        const board = await studentResultsService.getRoundLeaderboard(prelimRoundId);
        if (cancelled) return;
        const items = board?.items || [];
        const totalTeams = items.length;
        let mine = items.find((item) => Number(item.teamId) === Number(team.id));
        if (!mine && items.length) {
          const sorted = [...items].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
          const idx = sorted.findIndex((item) => Number(item.teamId) === Number(team.id));
          if (idx >= 0) {
            mine = { ...sorted[idx], rank: idx + 1 };
          }
        }
        if (mine) {
          setIsPublished(true);
          setTeamResult({
            score: mine.score ?? mine.totalScore,
            rank: mine.rank,
            totalTeams,
          });
        } else {
          // Leaderboard mở (published) nhưng đội chưa có dòng — vẫn đánh dấu published cho banner chờ chốt
          setIsPublished(totalTeams > 0 || Boolean(board));
          setTeamResult(null);
        }
      } catch {
        if (!cancelled) {
          setIsPublished(false);
          setTeamResult(null);
        }
      } finally {
        if (!cancelled) setIsLoadingScores(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [team?.id]);

  if (!team) return null;

  const minTeamSize = team.minTeamSize ?? 3;
  const maxTeamSize = team.maxTeamSize ?? 5;

  const progressPercent = Math.min(
    100,
    Math.round((team.acceptedMemberCount / maxTeamSize) * 100)
  );
  const hasPendingInvites = team.pendingInviteCount > 0;
  const hasMinAcceptedMembers = team.acceptedMemberCount >= minTeamSize;
  const canConfirmFormation = Boolean(team.canConfirmFormation);
  const formationSubmitted = Boolean(team.formationSubmitted);
  const showFormationButton =
    team.isCurrentUserLeader &&
    team.status === 'PENDING' &&
    !team.isLocked &&
    !formationSubmitted &&
    hasMinAcceptedMembers;

  const handleConfirmClick = () => {
    if (formationSubmitted) return;

    if (hasPendingInvites) {
      Modal.warning({
        title: 'Chưa thể xác nhận thành lập đội',
        content: (
          <>
            Đội bạn đang còn <strong>{team.pendingInviteCount}</strong> lời mời chờ phản hồi.
            Bạn cần chờ thành viên chấp nhận vào đội hoặc hủy lời mời trước khi xác nhận thành lập đội.
          </>
        ),
        okText: 'Đã hiểu',
      });
      return;
    }

    if (!team.isMemberCountReady) {
      Modal.info({
        title: 'Chưa đủ thành viên',
        content: `Đội cần từ ${minTeamSize} đến ${maxTeamSize} thành viên đã tham gia trước khi xác nhận.`,
        okText: 'Đã hiểu',
      });
      return;
    }

    Modal.confirm({
      title: 'Xác nhận thành lập đội?',
      content: (
        <>
          Bạn xác nhận đội hình hiện tại gồm <strong>{team.acceptedMemberCount}</strong> thành viên
          và gửi yêu cầu Ban tổ chức duyệt sớm.
          <br /><br />
          Thao tác này <strong>chỉ thực hiện được một lần</strong> và sau đó không thể mời thêm thành viên.
        </>
      ),
      okText: 'Xác nhận thành lập',
      okButtonProps: { style: { background: FPT.green, borderColor: FPT.green, fontWeight: 700 } },
      cancelText: 'Hủy',
      onOk: async () => {
        const result = await onConfirmFormation?.(team.id);
        if (result?.success) {
          message.success('Đã xác nhận thành lập đội. Ban tổ chức sẽ duyệt sớm.');
          return;
        }
        message.error(getStudentTeamErrorMessage(result?.error, 'Không thể xác nhận thành lập đội'));
        return Promise.reject();
      },
    });
  };

  return (
    <div
      style={{
        borderRadius: 24,
        overflow: 'hidden',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 82, 156, 0.25)'}`,
        background: isDark
          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.98) 100%)'
          : `linear-gradient(135deg, ${FPT.blueDark} 0%, ${FPT.blue} 75%, #002244 100%)`,
        color: '#fff',
        boxShadow: isDark ? '0 16px 36px -10px rgba(0,0,0,0.5)' : '0 12px 32px -8px rgba(0, 82, 156, 0.25)',
        padding: '24px 28px',
        position: 'relative',
      }}
    >
      {/* Decorative Ambient Aura */}
      <div style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, background: `radial-gradient(circle, rgba(243, 112, 33, 0.3) 0%, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -50, left: '10%', width: 200, height: 200, background: `radial-gradient(circle, rgba(70, 183, 73, 0.25) 0%, transparent 70%)`, filter: 'blur(35px)', pointerEvents: 'none' }} />



      {/* Top Header Row: Name & Badges (Compact Spacing) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* 3D Luminous Sunset Trophy Jewel Icon (Compact 52px) */}
          <motion.div
            whileHover={{ scale: 1.05, rotate: -3 }}
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: `linear-gradient(135deg, #FF6B00 0%, #FFA800 100%)`,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              boxShadow: `0 8px 20px -4px rgba(243, 112, 33, 0.6), inset 0 2px 4px rgba(255,255,255,0.4)`,
              border: '1.5px solid rgba(255, 255, 255, 0.3)',
              flexShrink: 0,
            }}
          >
            <Trophy size={26} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
          </motion.div>

          <div>
            <Title level={3} style={{ margin: 0, color: '#fff', fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>
              {team.teamName}
            </Title>
            <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13, fontWeight: 600, display: 'block', marginTop: 2 }}>
              🏆 {team.hackathonName}
            </Text>
          </div>
        </div>

        <Space wrap size={8}>
          <Tag color={team.statusColor || 'blue'} style={{ borderRadius: 8, padding: '4px 12px', border: 0, fontWeight: 800, fontSize: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
            {team.statusLabel || team.status}
          </Tag>
          {team.participationLabel && (
            <Tag color={team.participationColor || 'purple'} style={{ borderRadius: 8, padding: '4px 12px', border: 0, fontWeight: 800, fontSize: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
              {team.participationLabel}
            </Tag>
          )}
          {formationSubmitted && (
            <Tag color="success" icon={<CheckCircleOutlined />} style={{ borderRadius: 8, padding: '4px 12px', border: 0, fontWeight: 800, fontSize: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
              ✔ Đã chốt Đội hình
            </Tag>
          )}
          <Tag
            color={team.isLocked ? 'error' : 'success'}
            icon={team.isLocked ? <LockOutlined /> : <UnlockOutlined />}
            style={{ borderRadius: 8, padding: '4px 12px', border: 0, fontWeight: 800, fontSize: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
          >
            {team.isLocked ? 'Khóa Đội hình' : 'Mở Đội hình'}
          </Tag>
        </Space>
      </div>

      {/* Bottom Row: 4 Metric Columns (Compact & Sleek) */}
      <Row gutter={[20, 20]} align="middle">
        {/* Metric 1: Leader */}
        <Col xs={12} sm={6} md={6}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, rgba(243, 112, 33, 0.3), rgba(255, 140, 66, 0.3))', border: '1px solid rgba(243, 112, 33, 0.4)', display: 'grid', placeItems: 'center', color: '#FF8C42', flexShrink: 0, boxShadow: '0 2px 8px rgba(243, 112, 33, 0.2)' }}>
              <Shield size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>
                Trưởng nhóm
              </Text>
              <Text strong style={{ color: '#fff', fontSize: 15, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800 }}>
                {team.leaderName || 'Chưa cập nhật'}
              </Text>
            </div>
          </div>
        </Col>

        {/* Metric 2: Track */}
        <Col xs={12} sm={6} md={6}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.3), rgba(59, 130, 246, 0.3))', border: '1px solid rgba(96, 165, 250, 0.4)', display: 'grid', placeItems: 'center', color: '#60A5FA', flexShrink: 0, boxShadow: '0 2px 8px rgba(96, 165, 250, 0.2)' }}>
              <Flame size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>
                Chủ đề thi đấu
              </Text>
              <Text strong style={{ color: '#fff', fontSize: 15, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800 }}>
                {team.trackName || 'Chưa chọn'}
              </Text>
            </div>
          </div>
        </Col>

        {/* Metric 3: Roster Progress */}
        <Col xs={24} sm={6} md={6}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sĩ số đội hình ({team.acceptedMemberCount}/{maxTeamSize})
              </Text>
              {hasPendingInvites && (
                <Text style={{ color: '#FF8C42', fontSize: 11, fontWeight: 800 }}>
                  +{team.pendingInviteCount} chờ
                </Text>
              )}
            </div>
            <Progress
              percent={progressPercent}
              showInfo={false}
              strokeColor={{ from: '#60A5FA', to: FPT.green }}
              trailColor="rgba(255, 255, 255, 0.2)"
              strokeWidth={8}
            />
          </div>
        </Col>

        {/* Metric 4: CTA Action Area (Compact Emerald Pulse Button) */}
        <Col xs={24} sm={6} md={6} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {team.isCurrentUserLeader && team.status === 'PENDING' && !team.isLocked && (
            <div style={{ width: '100%' }}>
              {formationSubmitted ? (
                <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(70, 183, 73, 0.25)', border: '1px solid rgba(70, 183, 73, 0.6)', textAlign: 'center', boxShadow: '0 2px 8px rgba(70, 183, 73, 0.2)' }}>
                  <Text style={{ color: '#34D399', fontWeight: 800, fontSize: 12 }}>✔ Đã gửi yêu cầu duyệt</Text>
                </div>
              ) : !hasMinAcceptedMembers ? (
                <Text style={{ display: 'block', fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'right', fontWeight: 600 }}>
                  Cần ít nhất {minTeamSize} SV để xác nhận
                </Text>
              ) : showFormationButton ? (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="primary"
                    block
                    size="large"
                    loading={actionLoading}
                    onClick={handleConfirmClick}
                    style={{
                      borderRadius: 12,
                      fontWeight: 800,
                      fontSize: 14,
                      height: 44,
                      background: canConfirmFormation ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : undefined,
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: canConfirmFormation ? '0 6px 18px -4px rgba(16, 185, 129, 0.6)' : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      color: '#FFF',
                    }}
                  >
                    <Zap size={16} />
                    <span>Xác Nhận Đội Hình</span>
                    <Sparkles size={15} />
                  </Button>
                </motion.div>
              ) : null}
            </div>
          )}
          {(!team.isCurrentUserLeader || team.status !== 'PENDING' || team.isLocked || formationSubmitted) && (
            <div style={{ textAlign: 'right', width: '100%' }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 12, fontWeight: 700 }}>
                {team.isLocked ? '🔒 Đội hình đã chốt' : '🛡️ Đội thi đang hoạt động'}
              </Text>
            </div>
          )}
        </Col>
      </Row>

      {(team.isAdvanced ||
        team.isEliminatedFromFinal ||
        isPublished ||
        team.isInFormationGracePeriod ||
        team.rejectionReason) && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(255, 255, 255, 0.12)' }}>
          {team.isAdvanced && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '16px 20px',
                borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.35) 100%)',
                border: '1px solid rgba(52, 211, 153, 0.5)',
                boxShadow: '0 8px 24px -6px rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'rgba(52, 211, 153, 0.25)',
                  border: '1px solid rgba(52, 211, 153, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
              >
                🎉
              </div>
              <div>
                <Text style={{ color: '#6EE7B7', fontWeight: 900, fontSize: 16, display: 'block', letterSpacing: '0.01em' }}>
                  Chúc mừng! Đội của bạn đã lọt vào vòng Chung kết.
                </Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 13, marginTop: 2, display: 'block', fontWeight: 500 }}>
                  Đội của bạn đã xuất sắc vượt qua vòng Sơ loại để chính thức bước vào vòng tranh tài Chung kết.
                </Text>
              </div>
            </motion.div>
          )}

          {!team.isAdvanced && team.isEliminatedFromFinal && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.3) 100%)',
                border: '1px solid rgba(248, 113, 113, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div style={{ fontSize: 22 }}>🛑</div>
              <div>
                <Text style={{ color: '#FCA5A5', fontWeight: 800, fontSize: 15, display: 'block' }}>
                  Rất tiếc, đội của bạn đã dừng chân tại vòng Sơ loại.
                </Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13, marginTop: 2, display: 'block' }}>
                  Đội của bạn không được chọn vào Vòng Chung kết. Cảm ơn bạn đã tham gia giải đấu!
                </Text>
              </div>
            </div>
          )}

          {!team.isAdvanced && !team.isEliminatedFromFinal && isPublished && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.22) 0%, rgba(202, 138, 4, 0.28) 100%)',
                border: '1px solid rgba(250, 204, 21, 0.45)',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <ClockCircleOutlined style={{ fontSize: 22, color: '#FDE68A' }} />
              <div>
                <Text style={{ color: '#FDE68A', fontWeight: 800, fontSize: 15, display: 'block' }}>
                  Đã có điểm vòng sơ loại — Chờ BTC chốt danh sách đi tiếp.
                </Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 13, marginTop: 2, display: 'block' }}>
                  Điểm đã công bố. Danh sách đội vào Chung kết sẽ hiện sau khi Ban tổ chức chốt chuyển vòng.
                </Text>
              </div>
            </div>
          )}

          {isPublished && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Kết quả vòng sơ loại
              </Text>
              {isLoadingScores ? (
                <Spin size="small" tip="Đang tải kết quả..." />
              ) : teamResult ? (
                <Space size={32}>
                  <div>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, display: 'block' }}>Điểm đội</Text>
                    <Text style={{ color: '#93C5FD', fontWeight: 900, fontSize: 24 }}>{teamResult.score}</Text>
                  </div>
                  <div>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, display: 'block' }}>Hạng</Text>
                    <Text style={{ color: '#fff', fontWeight: 900, fontSize: 24 }}>
                      {teamResult.rank}
                      <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: 500 }}>
                        {' '}/ {teamResult.totalTeams}
                      </Text>
                    </Text>
                  </div>
                </Space>
              ) : (
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Đã công bố bảng xếp hạng.</Text>
              )}
            </div>
          )}

          {team.isInFormationGracePeriod && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.3) 100%)',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <ClockCircleOutlined style={{ fontSize: 22, color: '#FDE68A' }} />
              <div>
                <Text style={{ color: '#FDE68A', fontWeight: 800, fontSize: 15, display: 'block' }}>
                  Thời gian suy nghĩ 24 giờ
                </Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 13, marginTop: 2, display: 'block' }}>
                  Hackathon đã kết thúc đăng ký sớm. Hạn chốt xác nhận: {dayjs(team.formationGraceDeadlineAt).format('DD/MM/YYYY HH:mm')}.
                </Text>
              </div>
            </div>
          )}

          {team.rejectionReason && (
            <div style={{ padding: '14px 18px', borderRadius: 14, color: '#EF4444', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', fontSize: 13 }}>
              <strong>⛔ Lý do từ chối từ Ban tổ chức:</strong> {team.rejectionReason}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamOverviewCard;
