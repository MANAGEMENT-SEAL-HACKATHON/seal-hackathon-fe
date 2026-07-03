// src/features/presentation/components/PresentationControllerCard.tsx
import React, { useEffect, useState } from 'react';
import { Select, Spin, Typography, Avatar, Button, Popconfirm } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { presentationService } from '../../judging/services/presentationService';
import toast from 'react-hot-toast';

const { Text } = Typography;
const { Option } = Select;

interface PresentationControllerCardProps {
  trackId?: number | null;
  roundId?: number | null;
  mode?: 'track' | 'round';
  canGrant?: boolean;
}

// Cấu trúc Data chuẩn mà API Controller trả về
interface ControllerInfo {
  judgeId?: number;
  judge_id?: number;
  judgeName?: string;
  judge_name?: string;
  judgeFullName?: string;
  isDeptHead?: boolean;
  is_dept_head?: boolean;
  source?: string;
  data?: any; 
}

const resolveControllerLabel = (controller: ControllerInfo | null | undefined, mode: 'track' | 'round') => {
  if (!controller) {
    return 'Đang tải thông tin...';
  }

  const safeController = controller.data || controller;
  
  const judgeName = safeController.judgeFullName || safeController.judgeName || safeController.judge_name || 'Giám khảo';
  const judgeId = safeController.judgeId ?? safeController.judge_id;
  const source = safeController.source;
  const isDeptHead = Boolean(safeController.isDeptHead ?? safeController.is_dept_head);

  if (judgeName && judgeId) {
    if (source === 'OVERRIDE') {
      return `${judgeName} (Coordinator chỉ định)`;
    }
    if (source === 'AUTO_DEFAULT' || source === 'HEAD_DEFAULT') {
      if (isDeptHead) {
        return `${judgeName} (Trưởng ban — mặc định timer)`;
      }
      return `${judgeName} (Mặc định — judge gán sớm nhất)`;
    }
    return judgeName;
  }

  if (source === 'UNASSIGNED') {
    return mode === 'track'
      ? 'Chưa phân công — Vui lòng gán quyền ở dưới.'
      : 'Chưa phân công — Vui lòng gán quyền ở dưới.';
  }

  return 'Chưa có người điều phối timer.';
};

const PresentationControllerCard: React.FC<PresentationControllerCardProps> = ({
  trackId,
  roundId,
  mode = 'track',
  canGrant = false,
}) => {
  const queryClient = useQueryClient();
  const [selectedJudgeId, setSelectedJudgeId] = useState<number | null>(null);
  
  const scopeId = (mode === 'round' ? roundId : trackId) as number;
  const enabled = Boolean(scopeId);

  // 1. Lấy người giữ quyền
  const { data: controllerResponse, isLoading: loadingController } = useQuery<ControllerInfo | null>({
    queryKey: ['presentationController', mode, scopeId],
    queryFn: async () => {
      if (!scopeId) return null;
      try {
        const res = mode === 'round' 
          ? await presentationService.getRoundController(scopeId) 
          : await presentationService.getTrackController(scopeId);
        return res as any; 
      } catch (error) {
        return null; 
      }
    },
    enabled,
    retry: false, 
  });

  // 2. Lấy toàn bộ danh sách Giám khảo của Bảng/Vòng
  const { data: judgesResponse, isLoading: loadingJudges } = useQuery<any[]>({
    queryKey: ['presentationJudges', mode, scopeId],
    queryFn: async () => {
      if (!scopeId) return [];
      const res = mode === 'round' 
        ? await presentationService.listRoundJudges(scopeId) 
        : await presentationService.listTrackJudges(scopeId);
      
      const data = (res as any)?.data || res;
      return Array.isArray(data) ? data : data?.items || [];
    },
    enabled,
  });

  const judges = Array.isArray(judgesResponse) ? judgesResponse : [];

  useEffect(() => {
    const safeData = controllerResponse?.data || controllerResponse;
    const currentJudgeId = safeData?.judgeId ?? safeData?.judge_id;
    
    if (currentJudgeId) {
      setSelectedJudgeId(Number(currentJudgeId));
    } else {
      setSelectedJudgeId(null);
    }
  }, [controllerResponse]);

  const grantMutation = useMutation({
    mutationFn: async (judgeId: number) => {
      if (!scopeId) throw new Error('Thiếu thông tin bảng đấu hoặc vòng thi');
      if (mode === 'round') {
        return presentationService.setRoundController(scopeId, judgeId);
      }
      return presentationService.setTrackController(scopeId, judgeId);
    },
    onSuccess: async () => {
      toast.success('Đã cập nhật người điều phối timer.');
      await queryClient.invalidateQueries({ queryKey: ['presentationController', mode, scopeId] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Không thể gán quyền. Vui lòng thử lại.');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      if (!scopeId) throw new Error('Thiếu thông tin bảng đấu hoặc vòng thi');
      if (mode === 'round') {
        return presentationService.clearRoundController(scopeId);
      }
      return presentationService.clearTrackController(scopeId);
    },
    onSuccess: async () => {
      toast.success('Đã gỡ quyền điều phối timer.');
      setSelectedJudgeId(null);
      await queryClient.invalidateQueries({ queryKey: ['presentationController', mode, scopeId] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Không thể gỡ quyền.');
    },
  });

  if (!enabled) return null;

  const controllerLabel = resolveControllerLabel(controllerResponse, mode);
  const showJudgePicker = canGrant;

  return (
    <div>
      {/* ── CARD TRƯỞNG BAN ĐƯƠNG NHIỆM ── */}
      {loadingController ? (
        <Spin size="small" />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: showJudgePicker ? 20 : 0, background: '#f8fafc', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <Avatar size={40} style={{ background: '#2563eb' }} icon={<CrownOutlined />} />
          <div style={{ flex: 1 }}>
             <Text style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Người Điều Phối Timer</Text>
             <Text strong style={{ fontSize: 16, color: '#0f172a' }}>{controllerLabel}</Text>
          </div>
        </div>
      )}

      {/* ── DROPDOWN CHỌN GIÁM KHẢO ── */}
      {showJudgePicker && (
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8, color: '#334155' }}>
            Cập nhật lại quyền điều khiển:
          </Text>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Select
            style={{ flex: 1, minWidth: 220, height: 48 }}
            placeholder={mode === 'track' ? 'Chọn Giám khảo trong Hội đồng...' : 'Chọn Giám khảo Chung kết...'}
            loading={loadingJudges || grantMutation.isPending}
            value={selectedJudgeId ?? undefined}
            allowClear={false}
            onChange={(value) => {
              setSelectedJudgeId(Number(value));
              grantMutation.mutate(Number(value));
            }}
            optionLabelProp="label"
          >
            {judges.map((row: any) => {
              // Map chính xác 100% với JSON API trả về
              const jId = row.judgeId;
              const jName = row.judgeFullName || `Giám khảo #${jId || 'Ẩn'}`;
              const jEmail = row.judgeEmail || 'Chưa cập nhật email';

              // Bỏ qua nếu dòng này không có ID
              if (!jId) return null;

              return (
                <Option key={jId} value={jId} label={jName}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
                    <Avatar style={{ backgroundColor: '#f59e0b', fontWeight: 800, color: '#fff' }}>
                      {jName.charAt(0).toUpperCase()}
                    </Avatar>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.4 }}>
                      <Text strong style={{ color: '#1e293b' }}>{jName}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{jEmail}</Text>
                    </div>
                  </div>
                </Option>
              );
            })}
          </Select>
          <Popconfirm
            title="Gỡ quyền điều phối timer?"
            onConfirm={() => revokeMutation.mutate()}
            okText="Gỡ"
            cancelText="Hủy"
            disabled={!selectedJudgeId}
          >
            <Button danger loading={revokeMutation.isPending} disabled={!selectedJudgeId}>
              Gỡ quyền
            </Button>
          </Popconfirm>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresentationControllerCard;