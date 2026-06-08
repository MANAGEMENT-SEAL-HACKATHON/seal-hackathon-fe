import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, Button, Input, Tag, Typography, Form, Spin, Switch, Alert } from 'antd';
import { 
  GithubOutlined, 
  PlayCircleOutlined, 
  FileTextOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  InfoCircleOutlined 
} from '@ant-design/icons';
import { personBApi, SubmissionRequest, SubmissionStatusResponse, DeadlineResponse } from '../../../../api/personB.api';
import toast from 'react-hot-toast';

const { Title, Text } = Typography;

// Zod Validation Schema
const submissionSchema = z.object({
  repo_url: z.string().min(1, 'Đường dẫn Kho lưu trữ (GitHub/GitLab) là bắt buộc').url('Định dạng URL không hợp lệ'),
  demo_url: z.string().url('Định dạng URL không hợp lệ').or(z.literal('')),
  slide_url: z.string()
    .min(1, 'Đường dẫn slide thuyết trình là bắt buộc')
    .url('Định dạng URL không hợp lệ')
    .refine(
      (val) => {
        try {
          const url = new URL(val);
          return url.pathname.toLowerCase().endsWith('.pdf');
        } catch {
          return val.toLowerCase().endsWith('.pdf');
        }
      },
      { message: 'Link slide phải trỏ tới file PDF (.pdf) theo quy định BE.' }
    ),
});

type SubmissionFormValues = z.infer<typeof submissionSchema>;

const StudentSubmissionPage: React.FC = () => {
  const queryClient = useQueryClient();
  
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const studentId = userInfo.userId || userInfo.id || 'student-1';

  // React Query: Get current submission
  const { 
    data: submissionData, 
    isLoading: isSubLoading, 
    error: subError,
    refetch: refetchSubmission
  } = useQuery<SubmissionStatusResponse>({
    queryKey: ['studentSubmission', studentId],
    queryFn: async () => {
      try {
        return await personBApi.getStudentSubmission(studentId);
      } catch (err: any) {
        toast.error(`Lỗi tải bài nộp hiện tại: ${err?.message || 'Không thể lấy dữ liệu'}`);
        throw err;
      }
    },
    retry: false
  });

  // React Query: Get current deadline
  const { 
    data: deadlineData, 
    isLoading: isDeadlineLoading,
    error: deadlineError
  } = useQuery<DeadlineResponse>({
    queryKey: ['currentDeadline'],
    queryFn: async () => {
      try {
        return await personBApi.getCurrentDeadline();
      } catch (err: any) {
        toast.error(`Lỗi tải hạn chót nộp bài: ${err?.message || 'Không thể lấy dữ liệu'}`);
        throw err;
      }
    },
    retry: false
  });

  // Form setup
  const { 
    register, 
    handleSubmit, 
    setValue,
    formState: { errors } 
  } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      repo_url: '',
      demo_url: '',
      slide_url: '',
    }
  });

  // Pre-fill form when submissionData is loaded
  useEffect(() => {
    if (submissionData) {
      setValue('repo_url', submissionData.repo_url || '');
      setValue('demo_url', submissionData.demo_url || '');
      setValue('slide_url', submissionData.slide_url || '');
    }
  }, [submissionData, setValue]);

  // Submission Mutation
  const mutation = useMutation({
    mutationFn: async (data: SubmissionRequest) => {
      return await personBApi.submitStudentSubmission(studentId, data);
    },
    onSuccess: (data) => {
      toast.success('Nộp bài thi thành công!');
      // Update cache
      queryClient.setQueryData(['studentSubmission', studentId], data);
    },
    onError: (err: any) => {
      toast.error(`Lỗi nộp bài: ${err?.message || 'Không thể kết nối máy chủ'}`);
    }
  });

  const onSubmit = (values: SubmissionFormValues) => {
    mutation.mutate({
      repo_url: values.repo_url,
      demo_url: values.demo_url || undefined,
      slide_url: values.slide_url,
    });
  };

  // Countdown Logic
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (!deadlineData?.deadline) return;

    const calculateTimeLeft = () => {
      const difference = +new Date(deadlineData.deadline) - +new Date();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsOverdue(true);
        return;
      }

      setIsOverdue(false);
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [deadlineData]);

  // Badge Config
  const getBadgeConfig = (status?: string) => {
    switch (status) {
      case 'ON_TIME':
        return { color: 'success', text: 'Đã nộp (Đúng hạn)', icon: <CheckCircleOutlined /> };
      case 'LATE_PENDING':
        return { color: 'warning', text: 'Nộp muộn (Đang chờ duyệt)', icon: <ClockCircleOutlined /> };
      case 'REJECTED':
        return { color: 'error', text: 'Bị từ chối', icon: <CloseCircleOutlined /> };
      default:
        return { color: 'default', text: 'Chưa nộp bài', icon: <InfoCircleOutlined /> };
    }
  };

  const badge = getBadgeConfig(submissionData?.status);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fadeIn">


      {/* Main Grid: Submission + Status & Countdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Submission Form Card */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border border-gray-200 dark:border-zinc-850 dark:bg-zinc-900 rounded-xl shadow-md">
            <div className="border-b border-gray-100 dark:border-zinc-850 pb-4 mb-6">
              <Title level={3} className="!m-0 dark:text-white">
                Nộp Bài Dự Thi
              </Title>
              <Text className="text-gray-500 dark:text-gray-400 text-sm">
                Vui lòng cung cấp đầy đủ liên kết sản phẩm của nhóm bạn dưới đây.
              </Text>
            </div>

            {(subError || deadlineError) && (
              <Alert
                message="Lỗi kết nối máy chủ"
                description="Một số thông tin hiển thị có thể chưa đầy đủ do lỗi tải dữ liệu từ API Backend."
                type="warning"
                showIcon
                className="mb-6"
                action={
                  <Button size="small" type="primary" onClick={() => refetchSubmission()}>Thử lại</Button>
                }
              />
            )}

            <Form layout="vertical" onFinish={handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Repo URL */}
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <GithubOutlined className="mr-1.5" /> Đường dẫn Repository (Yêu cầu)
                </label>
                <input
                  {...register('repo_url')}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white ${
                    errors.repo_url ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-100'
                  }`}
                  placeholder="Ví dụ: https://github.com/myteam/seal-hackathon"
                />
                {errors.repo_url && (
                  <span className="text-red-500 text-xs mt-1 block">{errors.repo_url.message}</span>
                )}
              </div>

              {/* Demo URL */}
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <PlayCircleOutlined className="mr-1.5" /> Đường dẫn Deploy Demo (Tùy chọn)
                </label>
                <input
                  {...register('demo_url')}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white ${
                    errors.demo_url ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-100'
                  }`}
                  placeholder="Ví dụ: https://myteam-demo.vercel.app"
                />
                {errors.demo_url && (
                  <span className="text-red-500 text-xs mt-1 block">{errors.demo_url.message}</span>
                )}
              </div>

              {/* Slide URL */}
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <FileTextOutlined className="mr-1.5" /> Đường dẫn Slide Thuyết trình (Yêu cầu)
                </label>
                <input
                  {...register('slide_url')}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white ${
                    errors.slide_url ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-100'
                  }`}
                  placeholder="Ví dụ: https://drive.google.com/.../slide.pdf"
                />
                {errors.slide_url && (
                  <span className="text-red-500 text-xs mt-1 block">{errors.slide_url.message}</span>
                )}
                <span className="text-xs text-gray-400 block mt-1">
                  BE yêu cầu link slide kết thúc bằng .pdf (INVALID_SLIDE_FORMAT nếu sai định dạng).
                </span>
              </div>

              {isOverdue && (
                <Alert
                  type="warning"
                  showIcon
                  message="Nộp sau hạn chót"
                  description="Hệ thống tự gán trạng thái LATE_PENDING. BTC sẽ duyệt bài nộp muộn — không cần gửi lý do từ form."
                  className="rounded-md"
                />
              )}

              <div className="pt-4 border-t border-gray-100 dark:border-zinc-850 flex justify-end">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={mutation.isPending || isSubLoading}
                  disabled={mutation.isPending || isSubLoading}
                  className="w-full sm:w-auto px-8"
                  size="large"
                >
                  Nộp Bài Thi
                </Button>
              </div>
            </Form>
          </Card>
        </div>

        {/* Sidebar Status & Countdown Card */}
        <div className="space-y-6">
          {/* Countdown Card */}
          <Card className="border border-gray-200 dark:border-zinc-850 dark:bg-zinc-900 rounded-xl shadow-md text-center">
            <Text className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider block mb-2">
              Thời gian nộp bài còn lại
            </Text>

            {isDeadlineLoading ? (
              <div className="py-4"><Spin /></div>
            ) : timeLeft ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-gray-100 dark:bg-zinc-800 p-2 rounded">
                    <span className="block text-2xl font-bold text-gray-800 dark:text-white">{timeLeft.days}</span>
                    <span className="text-[10px] text-gray-500">Ngày</span>
                  </div>
                  <div className="bg-gray-100 dark:bg-zinc-800 p-2 rounded">
                    <span className="block text-2xl font-bold text-gray-800 dark:text-white">
                      {String(timeLeft.hours).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-gray-500">Giờ</span>
                  </div>
                  <div className="bg-gray-100 dark:bg-zinc-800 p-2 rounded">
                    <span className="block text-2xl font-bold text-gray-800 dark:text-white">
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-gray-500">Phút</span>
                  </div>
                  <div className="bg-gray-100 dark:bg-zinc-800 p-2 rounded">
                    <span className="block text-2xl font-bold text-primary dark:text-blue-400">
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-gray-500">Giây</span>
                  </div>
                </div>

                {isOverdue ? (
                  <Tag color="error" className="w-full text-center py-1 font-semibold rounded">
                    ĐÃ QUÁ HẠN CHÓT!
                  </Tag>
                ) : (
                  <Text className="text-xs text-gray-500 block">
                    Hạn chót: {new Date(deadlineData?.deadline || '').toLocaleString('vi-VN')}
                  </Text>
                )}
              </div>
            ) : (
              <Text className="text-gray-400">Không có hạn chót active</Text>
            )}
          </Card>

          {/* Submission Status Badge Card */}
          <Card className="border border-gray-200 dark:border-zinc-850 dark:bg-zinc-900 rounded-xl shadow-md">
            <Text className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider block mb-4">
              Trạng thái bài nộp hiện tại
            </Text>

            {isSubLoading ? (
              <div className="py-4 text-center"><Spin /></div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Tag 
                    color={badge.color} 
                    className="!px-3 !py-1.5 rounded-full font-semibold flex items-center gap-1.5 text-sm"
                  >
                    {badge.icon}
                    {badge.text}
                  </Tag>
                </div>

                {submissionData?.submitted_at && (
                  <div className="text-xs space-y-2 text-gray-500 dark:text-gray-400 border-t border-gray-150 dark:border-zinc-800 pt-3">
                    <div className="flex justify-between">
                      <span>Thời gian nộp:</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {new Date(submissionData.submitted_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentSubmissionPage;
