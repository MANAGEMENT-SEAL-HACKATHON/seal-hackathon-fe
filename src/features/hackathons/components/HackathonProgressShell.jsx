import { useEffect, useMemo, useState } from 'react';
import { Modal, Tabs, Select, Empty, Grid } from 'antd';
import { DoubleLeftOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useHackathonProgressContext } from '../hooks/useHackathonProgressContext';
import HackathonPrepProgressPanel from './HackathonPrepProgressPanel';
import HackathonEventProgressPanel from './HackathonEventProgressPanel';
import { useHackathonSelect } from '../../coordinator/hooks/useHackathonSelect';

const { useBreakpoint } = Grid;

/**
 * Global progress shell for COORD/ADMIN.
 * Uses a single Modal for both tabs (width changes) to avoid drawer↔modal jank.
 */
const HackathonProgressShell = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const {
    hackathonId,
    setHackathonId,
    hackathon,
    rounds,
    tracksCount,
    eventsCount,
    readinessData,
    snapshotLoading,
    teamsLoading,
    ctx,
    refreshSnapshot,
    hasHackathon,
  } = useHackathonProgressContext();

  const { hackathons, isLoadingHackathons } = useHackathonSelect(
    hackathonId || undefined,
  );

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('prep');

  const defaultTab = useMemo(() => {
    const onSetup = location.pathname.includes('/setup');
    const status = hackathon?.status;
    if (status === 'DRAFT' || onSetup) return 'prep';
    return 'event';
  }, [hackathon?.status, location.pathname]);

  useEffect(() => {
    if (open) setActiveTab(defaultTab);
  }, [open, defaultTab]);

  useEffect(() => {
    if (open) refreshSnapshot();
  }, [open, refreshSnapshot]);

  const modalWidth = useMemo(() => {
    if (isMobile) return '100%';
    // Prep đủ rộng để đọc checklist; Event rộng hơn cho lưới 6 GĐ
    return activeTab === 'prep' ? 560 : 1080;
  }, [activeTab, isMobile]);

  const handleNavigate = (path) => {
    setOpen(false);
    if (path) navigate(path);
  };

  const handlePrepStep = (tab) => {
    if (!hackathonId) return;
    handleNavigate(`/hackathons/${hackathonId}/setup?tab=${tab}`);
  };

  if (!hasHackathon && (!hackathons || hackathons.length === 0) && !isLoadingHackathons) {
    return null;
  }

  return (
    <>
      <style>{`
        .hackathon-progress-modal .ant-modal-body {
          padding: 0;
          max-height: ${isMobile ? '92vh' : '90vh'};
          overflow: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
        }
        .hackathon-progress-modal .ant-modal-body::-webkit-scrollbar {
          width: 4px;
        }
        .hackathon-progress-modal .ant-modal-body::-webkit-scrollbar-track {
          background: transparent;
        }
        .hackathon-progress-modal .ant-modal-body::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.35);
          border-radius: 999px;
        }
        .hackathon-progress-modal .ant-modal-body::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.55);
        }
        .hackathon-progress-modal .ant-modal-content {
          border-radius: 20px;
          overflow: hidden;
          transition: width 0.25s ease;
        }
      `}</style>

      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setOpen(true);
        }}
        title="Xem tiến độ kỳ thi"
        style={{
          position: 'fixed',
          right: 0,
          top: '48%',
          transform: 'translateY(-50%)',
          width: 36,
          height: 120,
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          borderRight: 'none',
          zIndex: 1000,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '16px 0 0 16px',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.05)',
          transition: 'width 0.25s ease, background 0.25s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.width = '42px';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.98)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.width = '36px';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.92)';
        }}
      >
        <DoubleLeftOutlined style={{ fontSize: 16, marginBottom: 8, color: '#6366f1' }} />
        <span
          style={{
            fontSize: 11,
            writingMode: 'vertical-rl',
            textTransform: 'uppercase',
            letterSpacing: 1,
            fontWeight: 700,
            color: '#475569',
          }}
        >
          Tiến độ
        </span>
      </div>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        closable={false}
        width={modalWidth}
        centered
        destroyOnClose={false}
        className="hackathon-progress-modal"
        styles={{
          body: { padding: 0 },
        }}
        transitionName="ant-fade"
        maskTransitionName="ant-fade"
      >
        {!hackathonId ? (
          <div style={{ padding: 32 }}>
            <Empty description="Chọn sự kiện để xem tiến độ">
              <Select
                style={{ width: '100%', maxWidth: 360 }}
                placeholder="Chọn hackathon"
                loading={isLoadingHackathons}
                options={(hackathons || []).map((h) => ({
                  value: h.id,
                  label: h.name || h.title || `#${h.id}`,
                }))}
                onChange={(id) => {
                  setHackathonId(id);
                }}
              />
            </Empty>
          </div>
        ) : (
          <>
            <div style={{ padding: '12px 16px 0', borderBottom: '1px solid #f1f5f9' }}>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                  { key: 'prep', label: 'Chuẩn bị' },
                  { key: 'event', label: 'Toàn bộ sự kiện' },
                ]}
                style={{ marginBottom: 0 }}
              />
            </div>

            {activeTab === 'prep' ? (
              <HackathonPrepProgressPanel
                rounds={rounds}
                tracksCount={tracksCount}
                eventsCount={eventsCount}
                hackathon={hackathon}
                readinessData={readinessData}
                onStepClick={handlePrepStep}
                onClose={() => setOpen(false)}
              />
            ) : (
              <HackathonEventProgressPanel
                hackathonId={hackathonId}
                ctx={ctx}
                snapshotLoading={snapshotLoading}
                teamsLoading={teamsLoading}
                onNavigate={handleNavigate}
                onClose={() => setOpen(false)}
              />
            )}
          </>
        )}
      </Modal>
    </>
  );
};

export default HackathonProgressShell;
