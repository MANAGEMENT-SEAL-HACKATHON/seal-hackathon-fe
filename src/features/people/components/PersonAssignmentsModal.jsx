import { useEffect, useState } from 'react';
import { Button, Modal, Spin, Table, Tag, message } from 'antd';
import { peopleService } from '../services/peopleService';

const PersonAssignmentsModal = ({ person, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!open || !person?.id) return undefined;
    let cancelled = false;
    setLoading(true);
    const loader =
      person.role === 'MENTOR'
        ? () => peopleService.getMentorTrackAssignments(person.id)
        : () => peopleService.getJudgeRoundAssignments(person.id);

    loader()
      .then((res) => {
        if (!cancelled) setRows(Array.isArray(res) ? res : res?.items || []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, person?.id, person?.role]);

  const isMentor = person?.role === 'MENTOR';

  return (
    <Modal
      title={`Lịch phân công — ${person?.fullName || person?.full_name || person?.name || ''}`}
      open={open}
      onCancel={onClose}
      footer={[<Button key="close" onClick={onClose}>Đóng</Button>]}
      width={720}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spin />
        </div>
      ) : (
        <Table
          rowKey={(row) => row.id ?? `${row.trackId}-${row.roundId}`}
          dataSource={rows}
          pagination={false}
          locale={{ emptyText: 'Chưa có phân công.' }}
          columns={
            isMentor
              ? [
                  { title: 'Track', dataIndex: 'trackName', render: (v, r) => v ?? r.track_name ?? r.trackId },
                  { title: 'Hackathon', dataIndex: 'hackathonName', render: (v, r) => v ?? r.hackathon_name ?? '—' },
                ]
              : [
                  { title: 'Vòng', dataIndex: 'roundName', render: (v, r) => v ?? r.round_name ?? r.roundId },
                  {
                    title: 'Vai trò',
                    dataIndex: 'assignmentType',
                    render: (v, r) => <Tag>{v ?? r.assignment_type ?? 'JUDGE'}</Tag>,
                  },
                ]
          }
        />
      )}
    </Modal>
  );
};

export default PersonAssignmentsModal;
