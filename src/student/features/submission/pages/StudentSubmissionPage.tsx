import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Spin } from 'antd';
import { personBApi, SubmissionRequest, SubmissionStatusResponse, DeadlineResponse } from '../../../../api/personB.api';
import toast from 'react-hot-toast';

// ─── Zod Validation Schema ────────────────────────────────────────────────────
const submissionSchema = z.object({
  repo_url: z
    .string()
    .min(1, 'Đường dẫn Repository là bắt buộc')
    .url('Định dạng URL không hợp lệ'),
  demo_url: z.string().url('Định dạng URL không hợp lệ').or(z.literal('')),
  slide_url: z
    .string()
    .min(1, 'Đường dẫn Slide thuyết trình là bắt buộc')
    .url('Định dạng URL không hợp lệ')
    .refine(
      (val) => {
        try {
          const url = new URL(val);
          return !url.pathname.toLowerCase().endsWith('.pdf');
        } catch {
          return !val.toLowerCase().endsWith('.pdf');
        }
      },
      { message: 'Slide không được là file PDF. Vui lòng dùng Google Slides, Canva, hoặc tương tự.' }
    ),
});

type SubmissionFormValues = z.infer<typeof submissionSchema>;

// ─── Status config ─────────────────────────────────────────────────────────────
const getStatusConfig = (status?: string) => {
  switch (status) {
    case 'ON_TIME':
      return {
        dot: '#16A34A',
        bg: '#F0FDF4',
        border: '#BBF7D0',
        label: 'Đã nộp (Đúng hạn)',
        sub: 'Bài nộp của bạn đã được ghi nhận thành công.',
        progress: 100,
      };
    case 'LATE_PENDING':
      return {
        dot: '#D97706',
        bg: '#FFFBEB',
        border: '#FDE68A',
        label: 'Nộp muộn — Đang chờ duyệt',
        sub: 'BTC sẽ xem xét và phê duyệt bài nộp của bạn.',
        progress: 70,
      };
    case 'REJECTED':
      return {
        dot: '#DC2626',
        bg: '#FFF1F2',
        border: '#FECDD3',
        label: 'Bị từ chối',
        sub: 'Bài nộp của bạn đã bị từ chối. Vui lòng liên hệ BTC.',
        progress: 0,
      };
    default:
      return {
        dot: '#EF4444',
        bg: '#FFF1F2',
        border: '#FECDD3',
        label: 'Chưa nộp bài',
        sub: 'Bạn vẫn còn thời gian để hoàn thiện',
        progress: 0,
      };
  }
};

// ─── Component ─────────────────────────────────────────────────────────────────
const StudentSubmissionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const studentId = userInfo.userId || userInfo.id || 'student-1';

  // ── Queries ──────────────────────────────────────────────────────────────────
  const {
    data: submissionData,
    isLoading: isSubLoading,
    error: subError,
    refetch: refetchSubmission,
  } = useQuery<SubmissionStatusResponse>({
    queryKey: ['studentSubmission', studentId],
    queryFn: async () => {
      try {
        return await personBApi.getStudentSubmission(studentId);
      } catch (err: any) {
        throw err;
      }
    },
    retry: false,
  });

  const {
    data: deadlineData,
    isLoading: isDeadlineLoading,
    error: deadlineError,
  } = useQuery<DeadlineResponse>({
    queryKey: ['currentDeadline'],
    queryFn: async () => {
      try {
        return await personBApi.getCurrentDeadline();
      } catch (err: any) {
        throw err;
      }
    },
    retry: false,
  });

  // ── Form ─────────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: { repo_url: '', demo_url: '', slide_url: '' },
  });

  useEffect(() => {
    if (submissionData) {
      setValue('repo_url', submissionData.repo_url || '');
      setValue('demo_url', submissionData.demo_url || '');
      setValue('slide_url', submissionData.slide_url || '');
    }
  }, [submissionData, setValue]);

  // ── Mutation ─────────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: async (data: SubmissionRequest) =>
      personBApi.submitStudentSubmission(studentId, data),
    onSuccess: (data) => {
      toast.success('Nộp bài thi thành công!');
      queryClient.setQueryData(['studentSubmission', studentId], data);
    },
    onError: (err: any) => {
      toast.error(`Lỗi nộp bài: ${err?.message || 'Không thể kết nối máy chủ'}`);
    },
  });

  const onSubmit = (values: SubmissionFormValues) => {
    mutation.mutate({
      repo_url: values.repo_url,
      demo_url: values.demo_url || undefined,
      slide_url: values.slide_url,
    });
  };

  // ── Countdown ────────────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState<{
    days: number; hours: number; minutes: number; seconds: number;
  } | null>(null);
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (!deadlineData?.deadline) return;
    const calc = () => {
      const diff = +new Date(deadlineData.deadline!) - +new Date();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsOverdue(true);
        return;
      }
      setIsOverdue(false);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [deadlineData]);

  const hasApiError = !!(subError || deadlineError);
  const statusConfig = getStatusConfig(submissionData?.status);
  const isSubmitting = mutation.isPending || isSubLoading;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>

      {/* ── Error Banner ─────────────────────────────────────────────────────── */}
      {hasApiError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '20px',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '16px', marginTop: '1px' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#92400E' }}>
                Lỗi kết nối máy chủ
              </div>
              <div style={{ fontSize: '12px', color: '#B45309', marginTop: '2px' }}>
                Một số thông tin hiển thị có thể chưa đầy đủ do lỗi tải dữ liệu từ API Backend.
              </div>
            </div>
          </div>
          <button
            onClick={() => refetchSubmission()}
            style={{
              flexShrink: 0,
              padding: '6px 16px',
              background: '#F59E0B',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ── Main layout ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '20px', alignItems: 'start' }}>

        {/* ══ LEFT: Form Card ══════════════════════════════════════════════════ */}
        <div style={{
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '14px',
          padding: '28px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          {/* Title */}
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
            Nộp Bài Dự Thi
          </h2>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 24px 0' }}>
            Vui lòng cung cấp đầy đủ liên kết sản phẩm của nhóm bạn dưới đây.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Repo URL */}
            <div>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px',
              }}>
                <span style={{ fontSize: '14px' }}>🔗</span>
                Đường dẫn Repository (Yêu cầu)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('repo_url')}
                  style={{
                    width: '100%',
                    padding: '9px 36px 9px 12px',
                    border: `1px solid ${errors.repo_url ? '#EF4444' : '#D1D5DB'}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#111827',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: errors.repo_url ? '#FFF5F5' : 'white',
                    transition: 'border-color 150ms',
                  }}
                  placeholder="Ví dụ: https://github.com/myteam/seal-hackathon"
                  onFocus={e => { if (!errors.repo_url) e.target.style.borderColor = '#6366F1'; }}
                  onBlur={e => { if (!errors.repo_url) e.target.style.borderColor = '#D1D5DB'; }}
                />
                {watch('repo_url') && (
                  <button
                    type="button"
                    onClick={() => setValue('repo_url', '')}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '14px',
                    }}
                  >✕</button>
                )}
              </div>
              {errors.repo_url && (
                <span style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                  {errors.repo_url.message}
                </span>
              )}
            </div>

            {/* Demo URL */}
            <div>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px',
              }}>
                <span style={{ fontSize: '14px' }}>🚀</span>
                Đường dẫn Deploy Demo (Tùy chọn)
              </label>
              <input
                {...register('demo_url')}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: `1px solid ${errors.demo_url ? '#EF4444' : '#D1D5DB'}`,
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: errors.demo_url ? '#FFF5F5' : 'white',
                  transition: 'border-color 150ms',
                }}
                placeholder="Ví dụ: https://myteam-demo.vercel.app"
                onFocus={e => { if (!errors.demo_url) e.target.style.borderColor = '#6366F1'; }}
                onBlur={e => { if (!errors.demo_url) e.target.style.borderColor = '#D1D5DB'; }}
              />
              {errors.demo_url && (
                <span style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                  {errors.demo_url.message}
                </span>
              )}
            </div>

            {/* Slide URL */}
            <div>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px',
              }}>
                <span style={{ fontSize: '14px' }}>📊</span>
                Đường dẫn Slide Thuyết trình (Yêu cầu)
              </label>
              <input
                {...register('slide_url')}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: `1px solid ${errors.slide_url ? '#EF4444' : '#D1D5DB'}`,
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: errors.slide_url ? '#FFF5F5' : 'white',
                  transition: 'border-color 150ms',
                }}
                placeholder="Ví dụ: https://docs.google.com/presentation/d/xxx/edit"
                onFocus={e => { if (!errors.slide_url) e.target.style.borderColor = '#6366F1'; }}
                onBlur={e => { if (!errors.slide_url) e.target.style.borderColor = '#D1D5DB'; }}
              />
              {errors.slide_url && (
                <span style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px', display: 'block' }}>
                  {errors.slide_url.message}
                </span>
              )}

              {/* Green info note */}
              <div style={{
                marginTop: '8px',
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}>
                <span style={{ color: '#16A34A', fontSize: '14px', marginTop: '1px' }}>ℹ️</span>
                <span style={{ fontSize: '12px', color: '#15803D', lineHeight: '1.5' }}>
                  <strong>Lưu ý:</strong> Không chấp nhận file PDF. Vui lòng dùng Google Slides, Canva
                  hoặc{' '}
                  <span style={{ textDecoration: 'underline' }}>link trình chiếu trực tuyến</span>.
                </span>
              </div>
            </div>

            {/* Overdue warning */}
            {isOverdue && (
              <div style={{
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '13px',
                color: '#92400E',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}>
                <span>⏰</span>
                <span>
                  <strong>Nộp sau hạn chót.</strong> Hệ thống sẽ tự gán trạng thái LATE_PENDING.
                  BTC sẽ duyệt bài nộp muộn của bạn.
                </span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '13px',
                background: isSubmitting ? '#86EFAC' : 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isSubmitting ? 'none' : '0 4px 12px rgba(22,163,74,0.35)',
                transition: 'all 200ms',
                marginTop: '4px',
              }}
              onMouseEnter={e => {
                if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 16px rgba(22,163,74,0.45)';
              }}
              onMouseLeave={e => {
                if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(22,163,74,0.35)';
              }}
            >
              {isSubmitting ? (
                <><Spin size="small" /><span style={{ marginLeft: '8px' }}>Đang nộp...</span></>
              ) : (
                <><span>▷</span> Nộp Bài Dự Thi</>
              )}
            </button>
          </form>
        </div>

        {/* ══ RIGHT: Sidebar ═══════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Countdown Card */}
          <div style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '10px',
            }}>
              <span style={{
                fontSize: '10px', fontWeight: 700, color: '#6B7280',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                THỜI GIAN CÒN LẠI
              </span>
              <span style={{ color: '#6366F1', fontSize: '14px' }}>🕐</span>
            </div>

            {isDeadlineLoading ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}><Spin /></div>
            ) : timeLeft ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px', marginBottom: '8px' }}>
                  {[
                    { val: timeLeft.days, label: 'Ngày' },
                    { val: String(timeLeft.hours).padStart(2, '0'), label: 'Giờ' },
                    { val: String(timeLeft.minutes).padStart(2, '0'), label: 'Phút' },
                    { val: String(timeLeft.seconds).padStart(2, '0'), label: 'Giây' },
                  ].map(({ val, label }) => (
                    <div key={label} style={{
                      background: '#F9FAFB', borderRadius: '6px', padding: '6px 4px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: isOverdue ? '#EF4444' : '#111827', lineHeight: 1.2 }}>
                        {val}
                      </div>
                      <div style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '2px' }}>{label}</div>
                    </div>
                  ))}
                </div>
                {isOverdue ? (
                  <div style={{
                    textAlign: 'center', fontSize: '11px', fontWeight: 700,
                    color: '#DC2626', background: '#FFF1F2', borderRadius: '6px', padding: '4px 8px',
                  }}>
                    ĐÃ QUÁ HẠN CHÓT!
                  </div>
                ) : (
                  <div style={{ fontSize: '10px', color: '#9CA3AF', textAlign: 'center' }}>
                    Hạn chót: {new Date(deadlineData?.deadline || '').toLocaleString('vi-VN')}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#374151', marginBottom: '4px' }}>
                  Không có hạn chót active
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  Hệ thống đang mở nộp bài tự do
                </div>
              </div>
            )}
          </div>

          {/* Status Card */}
          <div style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <span style={{
              fontSize: '10px', fontWeight: 700, color: '#6B7280',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              display: 'block', marginBottom: '12px',
            }}>
              TRANG THÁI BÀI NỘP
            </span>

            {isSubLoading ? (
              <div style={{ textAlign: 'center', padding: '8px 0' }}><Spin /></div>
            ) : (
              <div>
                {/* Dot + label */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: statusConfig.bg,
                    border: `1.5px solid ${statusConfig.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: statusConfig.dot,
                    }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                      {statusConfig.label}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                      {statusConfig.sub}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', color: '#9CA3AF' }}>Tiến độ nhóm</span>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#374151' }}>
                      {statusConfig.progress}%
                    </span>
                  </div>
                  <div style={{
                    height: '4px', background: '#F3F4F6', borderRadius: '999px', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${statusConfig.progress}%`,
                      background: statusConfig.progress === 100
                        ? '#16A34A'
                        : statusConfig.progress > 0
                          ? '#F59E0B'
                          : '#E5E7EB',
                      borderRadius: '999px',
                      transition: 'width 600ms ease',
                    }} />
                  </div>
                </div>

                {/* Submitted at */}
                {submissionData?.submitted_at && (
                  <div style={{
                    marginTop: '10px', paddingTop: '10px',
                    borderTop: '1px solid #F3F4F6',
                    fontSize: '10px', color: '#9CA3AF',
                  }}>
                    Nộp lúc: <strong style={{ color: '#6B7280' }}>
                      {new Date(submissionData.submitted_at).toLocaleString('vi-VN')}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Banner Card */}
          <div style={{
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative',
            minHeight: '110px',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            {/* Grid overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'linear-gradient(rgba(99,102,241,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.12) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }} />
            {/* Glow */}
            <div style={{
              position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)',
              width: '120px', height: '60px',
              background: 'radial-gradient(ellipse, rgba(99,102,241,0.3) 0%, transparent 70%)',
            }} />
            {/* Laptop icon */}
            <div style={{
              position: 'absolute', top: '10px', right: '12px',
              fontSize: '32px', opacity: 0.5,
            }}>
              💻
            </div>
            {/* Text */}
            <div style={{ position: 'relative', padding: '16px 14px', paddingRight: '50px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'white', lineHeight: 1.4 }}>
                Biến ý tưởng thành hiện thực cùng{' '}
                <span style={{ color: '#818CF8' }}>HackOS Student Portal</span>.
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudentSubmissionPage;
