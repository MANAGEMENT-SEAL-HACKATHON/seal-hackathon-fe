import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Alert, Button, Table, Tag, Space, Spin, Row, Col, Progress, message } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { DownloadOutlined, SyncOutlined, FileExcelOutlined, LockOutlined } from '@ant-design/icons';
import { analyticsService } from '../services/analyticsService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const AnalyticsPage = ({ hackathonId, hackathon, rounds }) => {
  const [loading, setLoading] = useState(false);
  const [varianceData, setVarianceData] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [exportJobs, setExportJobs] = useState([]);

  // Tìm vòng Chung kết an toàn (hoặc vòng cuối cùng nếu chưa có CK)
  const targetRound = Array.isArray(rounds) && rounds.length > 0 
    ? (rounds.find(r => r.is_final || r.isFinal) || rounds[rounds.length - 1]) 
    : null;

  // ========================================================
  // BẢN VÁ LỖI CỐT LÕI: CHẶN GỌI API KHI ID LÀ UNDEFINED
  // ========================================================
  useEffect(() => {
    // CHỈ gọi API khi đã có targetRound.id (là một con số hợp lệ)
    if (targetRound && targetRound.id) {
      fetchAnalyticsData(targetRound.id);
    }
  }, [targetRound]);

  const fetchAnalyticsData = async (roundId) => {
    // Rào chắn bảo vệ thêm 1 lớp nữa
    if (!roundId || roundId === 'undefined') return;

    setLoading(true);
    try {
      let varRes = [];
      let progRes = null;

      try {
        const res1 = await analyticsService.getRblVariance(roundId);
        // Hứng data từ JSON format của bạn: { success: true, data: [ ... ] }
        varRes = res1?.data || res1 || [];
      } catch (e) {
        console.warn("Lỗi load Variance", e);
      }

      try {
        const res2 = await analyticsService.getRblProgress(roundId);
        // Hứng data từ JSON format của bạn: { success: true, data: { ... } }
        progRes = res2?.data || res2 || null;
      } catch (e) {
        console.warn("Lỗi load Progress", e);
      }

      // Xử lý dữ liệu biểu đồ Phương sai (Dựa trên Schema: criterionId, judgeId, meanScore, stdDev)
      const rawVariance = Array.isArray(varRes) ? varRes : [];
      const maskedData = rawVariance.map(item => ({
        ...item,
        maskedJudgeName: `Giám khảo #${item.judgeId || 'X'}`,
        stdDevDisplay: parseFloat(item.stdDev || 0).toFixed(2),
        meanScoreDisplay: parseFloat(item.meanScore || 0).toFixed(2)
      }));

      setVarianceData(maskedData);
      setProgressData(progRes);
    } catch (error) {
      message.error("Lỗi khi xử lý dữ liệu phân tích.");
      setVarianceData([]); 
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOGIC EXPORT JOBS (BACKGROUND WORKER)
  // ==========================================
  const handleCreateExportJob = async () => {
    try {
      const res = await analyticsService.createExportJob(hackathonId);
      // Hứng data từ JSON format của bạn: { success: true, data: { id: ..., status: ... } }
      const newJob = res?.data || res;
      if (newJob && newJob.id) {
        setExportJobs(prev => [newJob, ...prev]);
        message.success("Đã đưa yêu cầu xuất dữ liệu vào hàng đợi xử lý.");
      }
    } catch (error) {
      message.error("Không thể khởi tạo tiến trình xuất dữ liệu.");
    }
  };

  // Cơ chế Polling kiểm tra trạng thái export jobs
  useEffect(() => {
    const hasActiveJobs = (exportJobs || []).some(job => job.status === 'PENDING' || job.status === 'PROCESSING');
    if (!hasActiveJobs) return;

    const interval = setInterval(async () => {
      const updatedJobs = await Promise.all((exportJobs || []).map(async (job) => {
        if (job.status === 'PENDING' || job.status === 'PROCESSING') {
          try {
            const res = await analyticsService.getExportJobStatus(job.id);
            const jobData = res?.data || res;
            return jobData || job;
          } catch (e) {
            return { ...job, status: 'FAILED', errorMessage: 'Mất kết nối' };
          }
        }
        return job;
      }));
      setExportJobs(updatedJobs);
    }, 3000);

    return () => clearInterval(interval);
  }, [exportJobs]);

  // ==========================================
  // XỬ LÝ TẢI FILE CÓ ĐÍNH KÈM TOKEN XÁC THỰC
  // ==========================================
  const handleDownloadFile = async (jobId, jobType) => {
    try {
      message.loading({ content: 'Đang tải file xuống máy của bạn...', key: 'downloadFile' });
      
      // Gọi API tải dữ liệu dạng Blob
      const response = await analyticsService.downloadExportFile(jobId);
      
      // Khởi tạo link ảo để ép trình duyệt tải file
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      
      // Quy định đuôi file dựa trên loại Export (CSV hoặc Excel)
      const extension = String(jobType).includes('CSV') ? 'csv' : 'xlsx';
      link.setAttribute('download', `Hackathon_Export_${jobId}.${extension}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove(); // Dọn dẹp link ảo sau khi tải xong

      message.success({ content: 'Tải xuống thành công!', key: 'downloadFile' });
    } catch (error) {
      message.error({ content: 'Lỗi khi tải file. File có thể không tồn tại hoặc lỗi mạng.', key: 'downloadFile' });
    }
  };

  // ==========================================
  // ĐIỀU KIỆN HIỂN THỊ (GATE: FINISHED)
  // ==========================================
  if (hackathon?.status !== 'FINISHED') {
    return (
      <Card style={{ textAlign: 'center', padding: '60px 20px', borderRadius: 16, border: '1px solid #ffccc7', background: '#fff2f0' }}>
        <LockOutlined style={{ fontSize: 48, color: '#cf1322', marginBottom: 16 }} />
        <Title level={3} style={{ color: '#cf1322', margin: 0 }}>Dữ liệu Phân tích đang khóa</Title>
        <Text style={{ color: '#cf1322', fontSize: 16, display: 'block', marginTop: 12 }}>
          Tính năng Dashboard RBL và Xuất dữ liệu (Export) chỉ khả dụng khi Hackathon ở trạng thái <strong>Đã hoàn thành (FINISHED)</strong>.
        </Text>
      </Card>
    );
  }

  const jobColumns = [
    { title: 'Mã Job', dataIndex: 'id', key: 'id' },
    { title: 'Loại Dữ liệu', dataIndex: 'type', key: 'type', render: t => <Tag color="geekblue">{t}</Tag> },
    { title: 'Thời gian tạo', dataIndex: 'createdAt', render: t => t ? dayjs(t).format('HH:mm:ss DD/MM/YYYY') : '-' },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, r) => {
        if (r.status === 'COMPLETED' || r.status === 'DONE') return <Tag color="success">Hoàn thành</Tag>;
        if (r.status === 'FAILED') return <Tag color="error" title={r.errorMessage}>Thất bại</Tag>;
        return <Tag color="processing" icon={<SyncOutlined spin />}>Đang xử lý</Tag>;
      }
    },
    {
      title: 'Tải xuống',
      key: 'action',
      render: (_, r) => (
        <Button 
          type="primary" 
          icon={<DownloadOutlined />} 
          disabled={!r.fileUrl || (r.status !== 'COMPLETED' && r.status !== 'DONE')}
          onClick={() => handleDownloadFile(r.id, r.type)}
        >
          Tải file
        </Button>
      )
    }
  ];

  return (
    <div style={{ animation: 'fadeInUp 0.4s ease-out both' }}>
      <Row gutter={[24, 24]}>
        {/* KHỐI 1: TỔNG QUAN TIẾN ĐỘ RBL */}
        <Col xs={24}>
          <Card title="Tiến độ RBL (Reliability & Bias Logging)" style={{ borderRadius: 12 }}>
            <Row align="middle" gutter={24}>
              <Col xs={24} md={8} style={{ textAlign: 'center' }}>
                <Progress 
                  type="dashboard" 
                  percent={(progressData?.completionPct || 0) * 100} 
                  strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                  format={percent => `${percent.toFixed(1)}%`}
                />
                <Text strong style={{ display: 'block', marginTop: 12 }}>Tỷ lệ phủ dữ liệu chấm</Text>
              </Col>
              <Col xs={24} md={16}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', background: '#f5f5f5', borderRadius: 8 }}>
                    <Text>Tổng số bài nộp hợp lệ:</Text>
                    <Title level={4} style={{ margin: 0 }}>{progressData?.totalSubmissions || 0}</Title>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', background: '#e6f7ff', borderRadius: 8, border: '1px solid #91d5ff' }}>
                    <Text>Số bài nộp đã được phân tích RBL:</Text>
                    <Title level={4} style={{ margin: 0, color: '#0958d9' }}>{progressData?.scoredSubmissions || 0}</Title>
                  </div>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* KHỐI 2: BIỂU ĐỒ ĐỘ LỆCH CHUẨN ẨN DANH */}
        <Col xs={24}>
          <Card 
            title="Độ lệch chuẩn chấm điểm (Phương sai ẩn danh)" 
            style={{ borderRadius: 12 }}
            extra={<Button onClick={() => fetchAnalyticsData(targetRound?.id)} icon={<SyncOutlined />} disabled={!targetRound || !targetRound.id}>Làm mới</Button>}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin size="large" /></div>
            ) : (!varianceData || varianceData.length === 0) ? (
              <Alert message="Chưa đủ dữ liệu chấm điểm để phân tích phương sai." type="info" showIcon />
            ) : (
              <div style={{ height: 400, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={varianceData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="maskedJudgeName" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" orientation="left" stroke="#1677ff" label={{ value: 'Điểm TB', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#ff4d4f" label={{ value: 'Độ Lệch Chuẩn', angle: 90, position: 'insideRight' }} />
                    <RechartsTooltip contentStyle={{ borderRadius: 8 }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="meanScore" name="Điểm Trung bình" fill="#1677ff" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="stdDev" name="Độ Lệch Chuẩn (Variance)" fill="#ff4d4f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>

        {/* KHỐI 3: QUẢN LÝ EXPORT JOBS */}
        <Col xs={24}>
          <Card 
            title="Trích xuất dữ liệu (Export Jobs)" 
            style={{ borderRadius: 12 }}
            extra={
              <Button type="primary" icon={<FileExcelOutlined />} onClick={handleCreateExportJob}>
                Yêu cầu Xuất dữ liệu mới
              </Button>
            }
          >
            <Alert message="Dữ liệu được xử lý ngầm dưới Backend. Trạng thái sẽ tự động cập nhật." type="info" showIcon style={{ marginBottom: 16 }} />
            <Table 
              columns={jobColumns} 
              dataSource={exportJobs} 
              rowKey="id" 
              pagination={false}
              locale={{ emptyText: 'Chưa có yêu cầu xuất dữ liệu nào trong phiên này.' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnalyticsPage;