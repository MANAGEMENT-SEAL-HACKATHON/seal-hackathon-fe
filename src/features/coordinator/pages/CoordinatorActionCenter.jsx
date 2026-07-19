import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Typography, Row, Col, Card, Button, Space, List, Spin, Empty, Alert, Tag, Progress,
} from 'antd';
import {
  TeamOutlined,
  RocketOutlined,
  TrophyOutlined,
  BarChartOutlined,
  AlertOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';
import {
  EVENT_TYPE_LABELS,
  HACKATHON_STATUS_LABELS,
  labelOf,
} from '../../../shared/constants/labels';
import {
  COORDINATOR_THEME,
  coordinatorIconBadgeStyle,
  coordinatorStatCardStyle,
  primaryGradientButtonStyle,
  whiteButtonStyle,
} from '../../../shared/theme/coordinatorTheme';
import CoordinatorHero from '../../../shared/components/ui/CoordinatorHero';
import { useHackathonScopeOptional } from '../../hackathons/context/HackathonScopeContext';
import EventContextBanner from '../../hackathons/components/EventContextBanner';
import { useCoordinatorTodos } from '../../notifications/hooks/useCoordinatorTodos';
import { approvalService } from '../services/approval.service';
import { eventService } from '../../events/services/eventService';
import { roundService } from '../../rounds/services/roundService';
import { roundResultsService } from '../../rounds/services/roundResults.service';
import { mapRoundToFE } from '../../rounds/mappers/roundMapper';
import { hackathonService } from '../../hackathons/services/hackathonService';

const { Title, Text } = Typography;

const unwrapList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const StatCard = ({ testId, icon, label, children, onClick }) => (
  <Card
    hoverable
    onClick={onClick}
    data-testid={testId}
    style={coordinatorStatCardStyle}
    styles={{
      body: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 140,
      },
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = COORDINATOR_THEME.cardHoverShadow;
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = COORDINATOR_THEME.cardShadow;
      e.currentTarget.style.transform = 'none';
    }}
  >
    <Space direction="vertical" size={8} style={{ width: '100%', flex: 1 }}>
      <Space size={10}>
        <span style={coordinatorIconBadgeStyle}>{icon}</span>
        <Text type="secondary">{label}</Text>
      </Space>
      {children}
    </Space>
  </Card>
);

/**
 * Coordinator Overview — action center focused on the selected event.
 */
const CoordinatorActionCenter = () => {
  const navigate = useNavigate();
  const scope = useHackathonScopeOptional();
  const hackathonId = scope?.hackathonId;
  const hackathon = scope?.selectedHackathon || scope?.hackathon;
  const { items: navTodos, total: navTodoTotal } = useCoordinatorTodos(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Clock snapshot cho nhãn "Quá hạn" — cập nhật ngoài render để giữ render thuần.
  const [nowTs, setNowTs] = useState(0);
  useEffect(() => {
    setNowTs(Date.now());
    const id = setInterval(() => setNowTs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const [metrics, setMetrics] = useState({
    teamsActive: null,
    teamsPending: null,
    rounds: [],
    scoring: null,
    readiness: null,
    upcomingEvents: [],
    tiebreakRounds: [],
  });

  const load = useCallback(async () => {
    if (!hackathonId) {
      setMetrics({
        teamsActive: null,
        teamsPending: null,
        rounds: [],
        scoring: null,
        readiness: null,
        upcomingEvents: [],
        tiebreakRounds: [],
      });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [roundsRes, pendingTeams, eventsRes, readiness] = await Promise.all([
        roundService.listByHackathon(hackathonId),
        approvalService.getTeamsForApproval(hackathonId, 'PENDING').catch(() => []),
        eventService.listByHackathon(hackathonId).catch(() => []),
        hackathonService.getReadiness(hackathonId, 'ONGOING').catch(() => null),
      ]);

      const rounds = unwrapList(roundsRes).map((r) => mapRoundToFE(r));
      const activeTeams = scope?.activeTeams?.length ?? null;

      let scoring = null;
      const scoringRound =
        rounds.find((r) => r.is_active && !r.scoring_locked) ||
        rounds.find((r) => r.is_active) ||
        rounds[0];
      if (scoringRound?.id) {
        try {
          const progress = await roundService.getScoringProgress(scoringRound.id);
          const scored = Number(progress?.scoredSubmissions ?? progress?.scoredCount ?? 0);
          const total = Number(progress?.totalSubmissions ?? progress?.totalCount ?? 0);
          scoring = {
            roundName: scoringRound.name || scoringRound.roundName,
            roundId: scoringRound.id,
            scored,
            total,
            pct: total > 0 ? Math.round((scored / total) * 1000) / 10 : 0,
          };
        } catch {
          scoring = null;
        }
      }

      const tiebreakRounds = [];
      for (const r of rounds.filter((x) => x.is_active || x.scoring_locked)) {
        try {
          const tb = await roundResultsService.getTiebreak(r.id);
          const pending = tb?.pendingGroups || tb?.groups || tb?.items;
          if (Array.isArray(pending) && pending.length > 0) {
            tiebreakRounds.push({ roundId: r.id, roundName: r.name, count: pending.length });
          } else if (tb?.hasUnresolved || tb?.needsManual) {
            tiebreakRounds.push({ roundId: r.id, roundName: r.name, count: 1 });
          }
        } catch {
          // round may not expose tiebreak yet
        }
      }

      const now = Date.now();
      const upcomingEvents = unwrapList(eventsRes)
        .map((e) => ({
          id: e.id,
          name: e.name || e.eventName || e.title || 'Sự kiện',
          start: e.startTime || e.startAt || e.start_time || e.beginsAt,
          type: e.eventType || e.type,
        }))
        .filter((e) => e.start)
        .sort((a, b) => new Date(a.start) - new Date(b.start))
        .slice(0, 6);

      const overdue = upcomingEvents.filter((e) => new Date(e.start).getTime() < now);

      setMetrics({
        teamsActive: activeTeams,
        teamsPending: pendingTeams.length,
        rounds,
        scoring,
        readiness: readiness?.data ?? readiness,
        upcomingEvents,
        overdueCount: overdue.length,
        tiebreakRounds,
      });
    } catch (err) {
      console.error(err);
      setError('Không tải được tổng quan sự kiện. Thử lại.');
    } finally {
      setLoading(false);
    }
  }, [hackathonId, scope?.activeTeams]);

  useEffect(() => {
    load();
  }, [load]);

  const actionItems = useMemo(() => {
    const items = [];
    navTodos.forEach((t) => {
      if (t.count > 0) {
        items.push({
          key: t.key,
          title: t.label,
          count: t.count,
          onClick: () => navigate(t.route),
          tone: 'warning',
        });
      }
    });
    if (metrics.teamsPending > 0) {
      items.push({
        key: 'team-approval',
        title: 'Duyệt đội thi chờ xét duyệt',
        count: metrics.teamsPending,
        onClick: () => navigate(`${ROUTES.GLOBAL_TEAMS}/${hackathonId}`),
        tone: 'warning',
      });
    }
    metrics.tiebreakRounds.forEach((tb) => {
      items.push({
        key: `tiebreak-${tb.roundId}`,
        title: `Đồng điểm cần xử lý — ${tb.roundName}`,
        count: tb.count,
        onClick: () => navigate(`/hackathons/${hackathonId}/rounds/${tb.roundId}/results`),
        tone: 'error',
      });
    });
    const blockers = metrics.readiness?.blockers || [];
    if (String(hackathon?.status).toUpperCase() === 'DRAFT' && blockers.length > 0) {
      items.push({
        key: 'readiness',
        title: 'Còn vấn đề chặn trước khi kích hoạt',
        count: blockers.length,
        onClick: () => navigate(`/hackathons/${hackathonId}/setup`),
        tone: 'error',
      });
    }
    if (items.length === 0 && hackathonId) {
      items.push({
        key: 'ok',
        title: 'Không có việc gấp — mở cấu hình sự kiện',
        count: null,
        onClick: () => navigate(`/hackathons/${hackathonId}/setup`),
        tone: 'success',
      });
    }
    return items;
  }, [navTodos, metrics, hackathon, hackathonId, navigate]);

  const roundSummary = metrics.rounds.map((r) => ({
    id: r.id,
    name: r.name,
    active: r.is_active,
    locked: r.scoring_locked,
    final: r.is_final,
  }));

  const cardShell = {
    borderRadius: COORDINATOR_THEME.radius,
    border: `1px solid ${COORDINATOR_THEME.border}`,
  };

  /** Stretch only for right-column cards; todo list stays content-height. */
  const cardShellFill = {
    ...cardShell,
    height: '100%',
  };

  const statusLabel = labelOf(HACKATHON_STATUS_LABELS, hackathon?.status, '—');
  const heroPills = hackathonId
    ? [
        {
          key: 'status',
          label: loading ? '—' : `Trạng thái: ${statusLabel}`,
          tone: 'info',
          loading: loading,
          dot: true,
        },
        {
          key: 'teams',
          label: loading
            ? '—'
            : `Đội đã duyệt: ${metrics.teamsActive ?? '—'}`,
          tone: 'success',
          loading: loading,
        },
        {
          key: 'pending',
          label: loading
            ? '—'
            : `Chờ duyệt: ${metrics.teamsPending ?? 0}`,
          tone: (metrics.teamsPending || 0) > 0 ? 'warning' : 'neutral',
          loading: loading,
        },
        {
          key: 'todos',
          label: loading ? '—' : `Việc cần làm: ${navTodoTotal || 0}`,
          tone: (navTodoTotal || 0) > 0 ? 'danger' : 'neutral',
          loading: loading,
        },
      ]
    : [{ key: 'hint', label: 'Chưa chọn sự kiện', tone: 'neutral' }];

  return (
    <div className="coord-page" style={{ maxWidth: 1400, margin: '0 auto' }} data-testid="coord-action-center">
      <CoordinatorHero
        data-testid="overview-hero"
        title="Tổng quan điều phối"
        subtitle="Trung tâm hành động theo sự kiện đang chọn — đổi sự kiện trên thanh header."
        pills={heroPills}
        actions={
          <>
            <Button
              onClick={load}
              disabled={!hackathonId}
              style={{ ...whiteButtonStyle, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              Làm mới
            </Button>
            <Button
              type="primary"
              icon={<BarChartOutlined />}
              style={{
                ...primaryGradientButtonStyle,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
              onClick={() => navigate(hackathonId ? `/coordinator/analytics/${hackathonId}` : ROUTES.COORDINATOR_ANALYTICS)}
            >
              Phân tích
            </Button>
          </>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <EventContextBanner hackathon={hackathon} hackathonId={hackathonId} />
      </div>

      {!hackathonId ? (
        <Empty description="Chọn sự kiện trên header để xem tổng quan hành động">
          <Button type="primary" onClick={() => navigate(ROUTES.HACKATHONS)}>Danh sách sự kiện</Button>
        </Empty>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : error ? (
        <Alert type="error" showIcon message={error} action={<Button onClick={load}>Thử lại</Button>} />
      ) : (
        <>
          <Row gutter={[16, 16]} align="stretch" style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
              <div style={{ width: '100%' }}>
                <StatCard
                  testId="stat-rounds"
                  icon={<RocketOutlined />}
                  label="Vòng thi"
                  onClick={() => navigate(`/hackathons/${hackathonId}/setup?tab=rounds`)}
                >
                  <Title level={3} style={{ margin: 0, color: COORDINATOR_THEME.accent }}>
                    {metrics.rounds.length}
                  </Title>
                  <Text type="secondary">
                    {roundSummary.filter((r) => r.active).length} đang diễn ra
                    {roundSummary.some((r) => r.locked) ? ' · có vòng khóa chấm' : ''}
                  </Text>
                </StatCard>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
              <div style={{ width: '100%' }}>
                <StatCard
                  testId="stat-teams"
                  icon={<TeamOutlined />}
                  label="Đội đã duyệt"
                  onClick={() => navigate(`${ROUTES.GLOBAL_TEAMS}/${hackathonId}`)}
                >
                  <Title level={3} style={{ margin: 0, color: COORDINATOR_THEME.accent }}>
                    {metrics.teamsActive ?? '—'}
                  </Title>
                  <Text type="secondary">
                    {metrics.teamsPending > 0
                      ? `${metrics.teamsPending} chờ duyệt`
                      : 'Không còn đội chờ duyệt'}
                  </Text>
                </StatCard>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
              <div style={{ width: '100%' }}>
                <StatCard
                  testId="stat-scoring"
                  icon={<CheckCircleOutlined />}
                  label="Tiến độ chấm"
                  onClick={() =>
                    metrics.scoring?.roundId
                      ? navigate(`/hackathons/${hackathonId}/rounds/${metrics.scoring.roundId}/results`)
                      : navigate(`/hackathons/${hackathonId}/setup?tab=rounds`)
                  }
                >
                  {metrics.scoring ? (
                    <>
                      <Title level={3} style={{ margin: 0, color: COORDINATOR_THEME.accent }}>
                        {metrics.scoring.scored}/{metrics.scoring.total}
                      </Title>
                      <Progress
                        percent={metrics.scoring.pct}
                        size="small"
                        strokeColor={{ from: '#4f46e5', to: '#3b82f6' }}
                      />
                      <Text type="secondary">{metrics.scoring.roundName}</Text>
                    </>
                  ) : (
                    <Text type="secondary">Chưa có vòng đang chấm</Text>
                  )}
                </StatCard>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
              <div style={{ width: '100%' }}>
                <StatCard
                  testId="stat-status"
                  icon={<TrophyOutlined />}
                  label="Trạng thái sự kiện"
                  onClick={() => navigate(`/hackathons/${hackathonId}/setup`)}
                >
                  <Title level={4} style={{ margin: 0, color: COORDINATOR_THEME.accent }}>
                    {labelOf(HACKATHON_STATUS_LABELS, hackathon?.status, '—')}
                  </Title>
                  <Text type="secondary">
                    {(metrics.readiness?.blockers || []).length > 0
                      ? `${metrics.readiness.blockers.length} vấn đề cần xử lý trước khi kích hoạt`
                      : 'Đã sẵn sàng'}
                  </Text>
                </StatCard>
              </div>
            </Col>
          </Row>

          <Row gutter={[16, 16]} align="top">
            <Col xs={24} lg={14}>
              <Card
                title={<><AlertOutlined style={{ color: '#4f46e5' }} /> Việc cần làm {navTodoTotal > 0 ? `(${navTodoTotal}+)` : ''}</>}
                data-testid="action-todos"
                style={{ ...cardShell, width: '100%' }}
              >
                <List
                  dataSource={actionItems}
                  locale={{ emptyText: 'Không có việc cần làm' }}
                  renderItem={(item) => (
                    <List.Item
                      style={{ cursor: 'pointer' }}
                      onClick={item.onClick}
                      actions={[<RightOutlined key="go" />]}
                    >
                      <List.Item.Meta
                        title={item.title}
                        description={
                          item.count != null ? (
                            <Tag color={item.tone === 'error' ? 'red' : item.tone === 'success' ? 'green' : 'orange'}>
                              {item.count}
                            </Tag>
                          ) : null
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Card
                  title={<><CalendarOutlined style={{ color: '#4f46e5' }} /> Hạn chót & sự kiện sắp tới</>}
                  data-testid="action-deadlines"
                  style={cardShellFill}
                  extra={
                    <Button type="link" onClick={() => navigate(`/hackathons/${hackathonId}/setup?tab=events`)}>
                      Lịch trình
                    </Button>
                  }
                >
                  {metrics.upcomingEvents?.length ? (
                    <List
                      size="small"
                      dataSource={metrics.upcomingEvents}
                      renderItem={(e) => {
                        const overdue = nowTs > 0 && new Date(e.start).getTime() < nowTs;
                        return (
                          <List.Item>
                            <List.Item.Meta
                              title={e.name}
                              description={
                                <Space>
                                  <Text type={overdue ? 'danger' : 'secondary'}>
                                    {new Date(e.start).toLocaleString('vi-VN')}
                                  </Text>
                                  {overdue ? <Tag color="red">Quá hạn / đã qua</Tag> : null}
                                  {e.type ? (
                                    <Tag>{labelOf(EVENT_TYPE_LABELS, e.type, e.type)}</Tag>
                                  ) : null}
                                </Space>
                              }
                            />
                          </List.Item>
                        );
                      }}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Chưa có lịch trình — thêm sự kiện trong tab Lịch trình"
                    />
                  )}
                </Card>

                <Card title="Thao tác nhanh" style={cardShellFill}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {[
                      { label: 'Cấu hình sự kiện', to: `/hackathons/${hackathonId}/setup` },
                      { label: 'Quản lý đội', to: `${ROUTES.GLOBAL_TEAMS}/${hackathonId}` },
                      { label: 'Cấu hình chung kết', to: '/coordinator/final-config' },
                      { label: 'Tất cả sự kiện', to: ROUTES.HACKATHONS },
                    ].map((a) => (
                      <Button
                        key={a.label}
                        block
                        onClick={() => navigate(a.to)}
                        style={{
                          borderColor: 'rgba(99, 102, 241, 0.3)',
                          color: '#3730a3',
                          borderRadius: 10,
                          fontWeight: 500,
                          background: 'rgba(238, 242, 255, 0.4)',
                        }}
                      >
                        {a.label}
                      </Button>
                    ))}
                  </Space>
                </Card>
              </Space>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default CoordinatorActionCenter;
