import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Grid,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import { Check, PackageCheck, RotateCcw, Search } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import CoordinatorHero from '../../../shared/components/ui/CoordinatorHero';
import { useHackathonScopeOptional } from '../../hackathons/context/HackathonScopeContext';
import { kitService, SHIRT_FITS, SHIRT_SIZES } from '../services/kitService';
import { resolveKitError } from '../utils/kitErrors';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const FIT_LABELS = {
  UNISEX: 'Unisex',
  MALE: 'Nam',
  FEMALE: 'Nữ',
};

const KitDistributionPage = () => {
  const screens = useBreakpoint();
  const { token } = theme.useToken();
  const isMobile = !screens.md;
  const scope = useHackathonScopeOptional();
  const hackathonId = scope?.hackathonId ? Number(scope.hackathonId) : null;
  const hackathonName = scope?.selectedHackathon?.name || scope?.selectedHackathon?.title;

  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [sizeOverrides, setSizeOverrides] = useState({});
  const [fitOverrides, setFitOverrides] = useState({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        document.querySelector('.kit-desk-search input')?.focus();
      } catch {
        // no-op
      }
    }, 120);
    return () => clearTimeout(id);
  }, [hackathonId]);

  const { data: items = [] } = useQuery({
    queryKey: ['kitItems', hackathonId],
    queryFn: () => kitService.listItems(hackathonId),
    enabled: Boolean(hackathonId),
  });

  const { data: bundles = [] } = useQuery({
    queryKey: ['kitBundles', hackathonId],
    queryFn: () => kitService.listBundles(hackathonId),
    enabled: Boolean(hackathonId),
  });

  const { data: recipients = [], isLoading, isFetching } = useQuery({
    queryKey: ['kitRecipients', hackathonId, debouncedQ],
    queryFn: () => kitService.listRecipients(hackathonId, debouncedQ || undefined),
    enabled: Boolean(hackathonId),
  });

  const defaultBundle = useMemo(
    () => (bundles || []).find((b) => b.isDefault) || (bundles || [])[0] || null,
    [bundles],
  );

  const invalidateDesk = () => {
    queryClient.invalidateQueries({ queryKey: ['kitRecipients', hackathonId] });
    queryClient.invalidateQueries({ queryKey: ['kitItems', hackathonId] });
    queryClient.invalidateQueries({ queryKey: ['kitBundles', hackathonId] });
  };

  const resolveSizeFit = (row) => {
    const size = sizeOverrides[row.userId] || row.preferredShirtSize || undefined;
    const fit = fitOverrides[row.userId] || row.preferredShirtFit || 'UNISEX';
    return { size, fit };
  };

  const issueMutation = useMutation({
    mutationFn: ({ userId, kitItemId, size, fit }) =>
      kitService.issue(hackathonId, {
        userId,
        kitItemId,
        size: size || undefined,
        fit: fit || undefined,
      }),
    onSuccess: (res) => {
      toast.success('Đã phát kit');
      const warnings = res?.warnings || res?.data?.warnings;
      if (Array.isArray(warnings)) {
        warnings.forEach((w) => {
          if (w?.message) toast(w.message, { icon: '⚠️' });
        });
      }
      invalidateDesk();
    },
    onError: (err) => toast.error(resolveKitError(err)),
  });

  const issueBundleMutation = useMutation({
    mutationFn: ({ userId, bundleId, size, fit }) =>
      kitService.issueBundle(hackathonId, {
        userId,
        bundleId,
        size: size || undefined,
        fit: fit || undefined,
      }),
    onSuccess: (res) => {
      const issued = res?.issued || [];
      const skipped = res?.skipped || [];
      const issuedNames = issued.map((a) => a.kitItemName || `#${a.kitItemId}`).join(', ');
      const skippedNames = skipped.map((a) => a.kitItemName || `#${a.kitItemId}`).join(', ');
      toast.success(
        `Combo: phát ${issued.length} món${issuedNames ? ` (${issuedNames})` : ''}`
          + (skipped.length
            ? `; bỏ qua ${skipped.length} món đã có${skippedNames ? ` (${skippedNames})` : ''}`
            : ''),
        { duration: 5000 },
      );
      const warnings = res?.warnings || res?.data?.warnings;
      if (Array.isArray(warnings)) {
        warnings.forEach((w) => {
          if (w?.message) toast(w.message, { icon: '⚠️' });
        });
      }
      invalidateDesk();
    },
    onError: (err) => toast.error(resolveKitError(err)),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ allocationId, reason }) => kitService.revoke(allocationId, { reason }),
    onSuccess: () => {
      toast.success('Đã thu hồi kit');
      invalidateDesk();
    },
    onError: (err) => toast.error(resolveKitError(err)),
  });

  const remainingCounters = useMemo(() => {
    const counters = [];
    (items || []).forEach((item) => {
      (item.stocks || []).forEach((stock) => {
        const rem = stock.remaining ?? Math.max(0, (stock.quantityTotal || 0) - (stock.quantityIssued || 0));
        const fitPart = item.type === 'SHIRT' && stock.fit ? ` · ${FIT_LABELS[stock.fit] || stock.fit}` : '';
        const sizePart = item.hasSize ? ` · ${stock.size || '?'}` : '';
        counters.push({
          key: `${item.id}-${stock.fit || 'none'}-${stock.size || 'none'}`,
          label: `${item.name}${fitPart}${sizePart}`,
          remaining: rem,
        });
      });
    });
    return counters;
  }, [items]);

  const confirmRevoke = (allocation) => {
    let reason = '';
    Modal.confirm({
      title: 'Thu hồi kit đã phát?',
      content: (
        <Input.TextArea
          rows={3}
          placeholder="Nhập lý do thu hồi (bắt buộc)"
          onChange={(e) => {
            reason = e.target.value;
          }}
        />
      ),
      okText: 'Thu hồi',
      okButtonProps: { danger: true },
      onOk: () => {
        if (!reason?.trim()) {
          toast.error('Vui lòng nhập lý do thu hồi');
          return Promise.reject();
        }
        return revokeMutation.mutateAsync({ allocationId: allocation.id, reason: reason.trim() });
      },
    });
  };

  const pageStyle = {
    padding: isMobile ? '16px 12px 32px' : '24px 24px 48px',
    minHeight: '100%',
  };
  const shellStyle = { maxWidth: 1400, margin: '0 auto' };

  if (!hackathonId) {
    return (
      <div className="coord-page" style={pageStyle}>
        <div style={shellStyle}>
          <CoordinatorHero
            title="Quầy phát kit"
            subtitle="Chọn sự kiện ở thanh trên để bắt đầu phát kit."
          />
          <Alert type="warning" showIcon message="Chưa chọn hackathon — dùng bộ chọn sự kiện trên header." />
        </div>
      </div>
    );
  }

  const columns = [
    {
      title: 'Sinh viên',
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 16 }}>{row.fullName}</Text>
          <Text type="secondary">{row.studentCode || row.email}</Text>
        </Space>
      ),
    },
    {
      title: 'Đội',
      dataIndex: 'teamName',
      render: (v) => <Text>{v}</Text>,
    },
    {
      title: 'Size / Dáng',
      width: 220,
      render: (_, row) => {
        const size = sizeOverrides[row.userId] || row.preferredShirtSize;
        return (
          <Space wrap size={4}>
            {size ? (
              <Tag color="blue">{size}</Tag>
            ) : (
              <Tag color="warning">Chưa size</Tag>
            )}
            <Select
              size="small"
              placeholder="Size"
              style={{ width: 72 }}
              value={sizeOverrides[row.userId] || row.preferredShirtSize || undefined}
              options={SHIRT_SIZES.map((s) => ({ value: s, label: s }))}
              onChange={(v) => setSizeOverrides((prev) => ({ ...prev, [row.userId]: v }))}
            />
            <Select
              size="small"
              placeholder="Dáng"
              style={{ width: 96 }}
              value={fitOverrides[row.userId] || row.preferredShirtFit || 'UNISEX'}
              options={SHIRT_FITS.map((f) => ({ value: f, label: FIT_LABELS[f] || f }))}
              onChange={(v) => setFitOverrides((prev) => ({ ...prev, [row.userId]: v }))}
            />
          </Space>
        );
      },
    },
    {
      title: 'Phát kit',
      render: (_, row) => {
        const { size, fit } = resolveSizeFit(row);
        const shirtItems = (items || []).filter((i) => i.type === 'SHIRT' || i.hasSize);
        const missingSize = shirtItems.some((item) => {
          const already = (row.allocations || []).some(
            (a) => a.kitItemId === item.id && a.status === 'ISSUED',
          );
          return !already && !size;
        });
        const busy = issueMutation.isPending || issueBundleMutation.isPending;

        return (
          <Space wrap size="middle">
            {defaultBundle && (
              <Button
                type="primary"
                size="large"
                icon={<PackageCheck size={18} />}
                disabled={missingSize || busy}
                loading={issueBundleMutation.isPending}
                onClick={() =>
                  issueBundleMutation.mutate({
                    userId: row.userId,
                    bundleId: defaultBundle.id,
                    size,
                    fit,
                  })
                }
                style={{ minWidth: 140, height: 48, fontWeight: 700, fontSize: 15 }}
              >
                Phát combo
              </Button>
            )}
            {(items || []).map((item) => {
              const alloc = (row.allocations || []).find(
                (a) => a.kitItemId === item.id && a.status === 'ISSUED',
              );
              if (alloc) {
                return (
                  <Space key={item.id} size={4}>
                    <Button size="large" disabled style={{ minWidth: 120, height: 48, fontWeight: 700 }}>
                      ✓ {item.name}
                    </Button>
                    <Button
                      size="large"
                      danger
                      icon={<RotateCcw size={16} />}
                      onClick={() => confirmRevoke(alloc)}
                      style={{ height: 48 }}
                    >
                      Thu hồi
                    </Button>
                  </Space>
                );
              }
              const sizeForIssue = item.hasSize ? size : undefined;
              const fitForIssue = item.type === 'SHIRT' ? fit : undefined;
              const itemMissingSize = item.hasSize && !sizeForIssue;
              return (
                <Button
                  key={item.id}
                  size="large"
                  icon={<Check size={18} />}
                  disabled={itemMissingSize || busy}
                  loading={issueMutation.isPending}
                  onClick={() =>
                    issueMutation.mutate({
                      userId: row.userId,
                      kitItemId: item.id,
                      size: sizeForIssue,
                      fit: fitForIssue,
                    })
                  }
                  style={{ minWidth: 140, height: 48, fontWeight: 700, fontSize: 15 }}
                >
                  {item.name}
                </Button>
              );
            })}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="coord-page" style={pageStyle}>
      <div style={shellStyle}>
        <CoordinatorHero
          title="Quầy phát kit"
          subtitle={hackathonName ? `Phát nhanh cho ${hackathonName}` : 'Tìm sinh viên → phát combo / món lẻ → đếm tồn kho realtime'}
        />

        {!defaultBundle && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="Chưa có combo mặc định — khai báo ở tab Vật phẩm & Kit, hoặc phát từng món."
          />
        )}

        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            background: token.colorBgContainer,
            padding: '12px 0 16px',
            marginBottom: 8,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
            {remainingCounters.map((c) => (
              <Tag
                key={c.key}
                color={c.remaining <= 5 ? 'error' : c.remaining <= 15 ? 'warning' : 'processing'}
                style={{ fontSize: 14, padding: '4px 10px', margin: 0 }}
              >
                {c.label}: còn <strong>{c.remaining}</strong>
              </Tag>
            ))}
            {!remainingCounters.length && (
              <Tag>Chưa có tồn kho — khai báo ở tab Vật phẩm & Kit</Tag>
            )}
          </Space>
          <Input
            autoFocus
            className="kit-desk-search"
            size="large"
            allowClear
            prefix={<Search size={18} />}
            placeholder="Tìm tên / mã SV / đội…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ fontSize: 16, height: 48 }}
          />
        </div>

        <Table
          loading={isLoading || isFetching}
          dataSource={recipients}
          columns={columns}
          rowKey="userId"
          pagination={{ pageSize: 20, showSizeChanger: false }}
          locale={{ emptyText: debouncedQ ? 'Không tìm thấy người nhận' : 'Chưa có thành viên đội ACTIVE' }}
        />
      </div>
    </div>
  );
};

export default KitDistributionPage;
