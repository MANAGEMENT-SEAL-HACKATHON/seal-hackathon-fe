import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Empty, Skeleton, Space, Table, Tag, Typography } from 'antd';
import { ReloadOutlined, TrophyOutlined } from '@ant-design/icons';
import { roundResultsService } from '../../rounds/services/roundResults.service';
import { formatScore } from '../../../shared/utils/formatScore';

const { Text } = Typography;

const REASON_META: Record<string, { color: string }> = {
  TOP_N: { color: 'green' },
  OUT: { color: 'default' },
  DQ: { color: 'red' },
};

const topNLabel = (row: any) =>
  row?.reasonLabel || (row?.rank != null ? `Top ${row.rank}` : '—');

type FinalistsCardProps = {
  /** Vòng Sơ loại nguồn — nơi advance-roster chốt danh sách vào CK */
  prelimRoundId?: number | string | null;
  /** Vòng Chung kết — để mở hàng đợi CK khi có */
  finalRoundId?: number | string | null;
  /** Link tới trang Kết quả Sơ loại (khi chưa chốt) */
  prelimResultsUrl?: string;
  onOpenFinalQueue?: () => void;
};

/**
 * GĐ5 — Card «Các đội vào Chung kết». Tái dùng advance-roster của vòng Sơ loại,
 * kèm cột LÝ DO vào CK (Top N) phục vụ minh bạch.
 */
const FinalistsCard: React.FC<FinalistsCardProps> = ({
  prelimRoundId,
  finalRoundId,
  prelimResultsUrl,
  onOpenFinalQueue,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!prelimRoundId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const page = await roundResultsService.getAdvanceRoster(prelimRoundId, { page: 0, size: 200 });
      setItems(Array.isArray(page?.items) ? page.items : []);
    } catch (err) {
      setError(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [prelimRoundId]);

  useEffect(() => {
    load();
  }, [load]);

  const advanced = useMemo(
    () => items.filter((i) => String(i.status).toUpperCase() === 'ADVANCED'),
    [items],
  );

  const columns = useMemo(
    () => [
      {
        title: 'Tên đội',
        dataIndex: 'teamName',
        render: (name: string) => <Text strong>{name}</Text>,
      },
      {
        title: 'Track nguồn',
        dataIndex: 'trackName',
        render: (t: string) => t || '—',
      },
      {
        title: 'Lý do vào CK',
        dataIndex: 'reasonCode',
        width: 160,
        render: (code: string, row: any) => {
          const upper = String(code || '').toUpperCase();
          const meta = REASON_META[upper];
          if (upper === 'TOP_N') {
            return <Tag color={meta?.color || 'green'}>{topNLabel(row)}</Tag>;
          }
          if (!meta) return <Tag>{row.reasonLabel || code || '—'}</Tag>;
          return <Tag color={meta.color}>{row.reasonLabel || code || '—'}</Tag>;
        },
      },
      {
        title: 'Hạng / điểm',
        key: 'rank',
        width: 130,
        render: (_: any, row: any) => (
          <Text type="secondary">
            {row.rank != null ? `Hạng ${row.rank}` : '—'}
            {row.totalScore != null ? ` · ${formatScore(row.totalScore)}` : ''}
          </Text>
        ),
      },
    ],
    [],
  );

  return (
    <Card
      title={
        <Space>
          <TrophyOutlined style={{ color: '#d97706' }} />
          <span>Các đội vào Chung kết</span>
          {advanced.length > 0 && <Tag color="green">{advanced.length} đội</Tag>}
        </Space>
      }
      extra={
        <Space>
          <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={load}>
            Làm mới
          </Button>
          {finalRoundId && onOpenFinalQueue && (
            <Button size="small" type="primary" onClick={onOpenFinalQueue}>
              Hàng đợi CK
            </Button>
          )}
        </Space>
      }
      style={{ borderRadius: 12 }}
    >
      {loading && items.length === 0 ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : error ? (
        <Alert
          showIcon
          type="error"
          message="Không tải được danh sách đội vào Chung kết"
          action={
            <Button size="small" onClick={load}>
              Thử lại
            </Button>
          }
        />
      ) : advanced.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa chốt chuyển vòng"
        >
          {prelimResultsUrl && (
            <Button type="link" href={prelimResultsUrl}>
              Mở Kết quả Sơ loại để chốt
            </Button>
          )}
        </Empty>
      ) : (
        <Table
          rowKey="teamId"
          size="small"
          columns={columns}
          dataSource={advanced}
          pagination={advanced.length > 10 ? { pageSize: 10 } : false}
        />
      )}
    </Card>
  );
};

export default FinalistsCard;
