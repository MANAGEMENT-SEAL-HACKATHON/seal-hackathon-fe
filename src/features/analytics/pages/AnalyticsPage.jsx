import { useState, useEffect, useMemo } from 'react';
import {
  Card, Typography, Alert, Button, Table, Tag, Space, Spin, Row, Col, Progress,
  message, Select, Segmented, Empty,
} from 'antd';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { DownloadOutlined, SyncOutlined, FileTextOutlined, LockOutlined } from '@ant-design/icons';
import { analyticsService } from '../services/analyticsService';
import SectionHeader, { HintList } from '../../../shared/components/ui/SectionHeader';
import dayjs from 'dayjs';
import {
  EXPORT_JOB_STATUS_LABELS,
  EXPORT_JOB_TYPE_LABELS,
  labelOf,
} from '../../../shared/constants/labels';

const { Title, Text } = Typography;

const EXPORT_TYPES = [
  { value: 'CSV_SCORES', label: 'Điểm chi tiết (CSV)' },
  { value: 'CSV_RANKINGS', label: 'Bảng xếp hạng (CSV)' },
  { value: 'ANONYMIZED_RBL', label: 'Dataset RBL ẩn danh (CSV)' },
  { value: 'FULL_REPORT', label: 'Báo cáo đầy đủ (CSV)' },
];

const ANALYTICS_TAB_HINT = (
  <HintList
    items={[
      'Bảng phân tích RBL xem được khi vòng đã có điểm (không bắt buộc sự kiện đã kết thúc)',
      'Xuất dữ liệu chỉ khi sự kiện đã kết thúc',
      'Giám khảo được ẩn danh (Giám khảo 1/2/3) — không lộ mã định danh thật',
    ]}
  />
);

const AnalyticsPage = ({ hackathonId, hackathon, rounds }) => {
  const [loading, setLoading] = useState(false);
  const [rblError, setRblError] = useState(false);
  const [perJudgeSpread, setPerJudgeSpread] = useState([]);
  const [interRaterData, setInterRaterData] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [exportJobs, setExportJobs] = useState([]);
  const [exportType, setExportType] = useState('ANONYMIZED_RBL');
  const [judgeSegment, setJudgeSegment] = useState('ALL');
  const [creatingExport, setCreatingExport] = useState(false);

  const isFinished = hackathon?.status === 'FINISHED';
  const targetRound = Array.isArray(rounds) && rounds.length > 0
    ? (rounds.find((r) => r.is_final || r.isFinal) || rounds[rounds.length - 1])
    : null;

  useEffect(() => {
    if (targetRound?.id) {
      fetchAnalyticsData(targetRound.id);
    }
  }, [targetRound?.id]);

  useEffect(() => {
    if (!hackathonId || !isFinished) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await analyticsService.listExportJobs(hackathonId);
        const jobs = Array.isArray(res) ? res : (res?.items || res?.data || []);
        if (!cancelled) setExportJobs(Array.isArray(jobs) ? jobs : []);
      } catch {
        if (!cancelled) setExportJobs([]);
      }
    })();
    return () => { cancelled = true; };
  }, [hackathonId, isFinished]);

  const fetchAnalyticsData = async (roundId) => {
    if (!roundId || roundId === 'undefined') return;
    setLoading(true);
    setRblError(false);
    try {
      let varPayload = null;
      let progRes = null;
      let varianceFailed = false;
      let progressFailed = false;

      try {
        const res1 = await analyticsService.getRblVariance(roundId);
        varPayload = res1?.data ?? res1 ?? null;
      } catch (e) {
        console.warn('Lỗi load Variance', e);
        varianceFailed = true;
      }

      try {
        const res2 = await analyticsService.getRblProgress(roundId);
        progRes = res2?.data ?? res2 ?? null;
      } catch (e) {
        console.warn('Lỗi load Progress', e);
        progressFailed = true;
      }

      if (varianceFailed || progressFailed) {
        setRblError(true);
        setPerJudgeSpread([]);
        setInterRaterData([]);
        setProgressData(null);
        return;
      }

      // Wrapper mới { perJudgeSpread, interRaterByCriterion } — fallback mảng cũ
      const spread = Array.isArray(varPayload)
        ? varPayload
        : (varPayload?.perJudgeSpread || []);
      const inter = Array.isArray(varPayload)
        ? []
        : (varPayload?.interRaterByCriterion || []);

      // Ẩn danh ổn định: BE trả anonymizedJudgeId (THESIS-RBL-02); fallback judgeId cho shape cũ.
      const judgeKeyOf = (i) => i.anonymizedJudgeId ?? i.judgeId;
      const uniqueJudgeKeys = [...new Set(spread.map(judgeKeyOf).filter((id) => id != null))].sort(
        (a, b) => String(a).localeCompare(String(b)),
      );
      const labelMap = {};
      uniqueJudgeKeys.forEach((id, idx) => {
        labelMap[id] = `Giám khảo ${idx + 1}`;
      });

      const maskedSpread = spread.map((item) => ({
        ...item,
        maskedJudgeName: labelMap[judgeKeyOf(item)] || 'Giám khảo ?',
        researchType: item.judgeType || 'OTHER',
        // strip raw id from chart payload display path — keep internal only for filter
        _judgeId: judgeKeyOf(item),
        judgeId: undefined,
      }));

      setPerJudgeSpread(maskedSpread);
      setInterRaterData(
        (inter || []).map((c) => ({
          ...c,
          label: c.criterionName || `Tiêu chí ${c.criterionId}`,
          meanInterRaterStdDev: Number(c.meanInterRaterStdDev || 0),
        })),
      );
      setProgressData(progRes);
    } catch {
      message.error('Lỗi khi xử lý dữ liệu phân tích.');
      setRblError(true);
      setPerJudgeSpread([]);
      setInterRaterData([]);
      setProgressData(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredJudgeChart = useMemo(() => {
    if (judgeSegment === 'ALL') return perJudgeSpread;
    return perJudgeSpread.filter((i) => i.researchType === judgeSegment);
  }, [perJudgeSpread, judgeSegment]);

  const refreshJobs = async () => {
    if (!hackathonId) return;
    try {
      const res = await analyticsService.listExportJobs(hackathonId);
      const jobs = Array.isArray(res) ? res : (res?.items || res?.data || []);
      setExportJobs(Array.isArray(jobs) ? jobs : []);
    } catch {
      /* keep prior */
    }
  };

  const handleCreateExportJob = async () => {
    if (!isFinished) {
      message.warning('Chỉ xuất dữ liệu khi sự kiện đã kết thúc.');
      return;
    }
    setCreatingExport(true);
    try {
      const res = await analyticsService.createExportJob(hackathonId, { type: exportType });
      const newJob = res?.data || res;
      if (newJob?.id) {
        message.success('Đã tạo yêu cầu xuất CSV.');
        await refreshJobs();
      }
    } catch {
      message.error('Không thể tạo yêu cầu xuất dữ liệu.');
    } finally {
      setCreatingExport(false);
    }
  };

  const handleDownloadFile = async (jobId, jobType) => {
    try {
      message.loading({ content: 'Đang tải file CSV…', key: 'downloadFile' });
      const response = await analyticsService.downloadExportFile(jobId);
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Hackathon_Export_${jobId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success({ content: 'Tải CSV thành công!', key: 'downloadFile' });
    } catch {
      message.error({ content: 'Lỗi khi tải file CSV.', key: 'downloadFile' });
    }
  };

  const jobColumns = [
    { title: 'Mã Job', dataIndex: 'id', key: 'id' },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      render: (t) => (
        <Tag color="geekblue" data-testid="export-job-type">
          {labelOf(EXPORT_JOB_TYPE_LABELS, t, t)}
        </Tag>
      ),
    },
    {
      title: 'Thời gian tạo',
      dataIndex: 'createdAt',
      render: (t) => (t ? dayjs(t).format('HH:mm:ss DD/MM/YYYY') : '-'),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, r) => {
        const s = r.status === 'COMPLETED' ? 'DONE' : r.status;
        if (s === 'DONE' || s === 'COMPLETED') {
          return (
            <Tag color="success" data-testid="export-job-status">
              {labelOf(EXPORT_JOB_STATUS_LABELS, 'DONE')}
            </Tag>
          );
        }
        if (s === 'FAILED') {
          return (
            <Tag color="error" data-testid="export-job-status" title={r.errorMessage}>
              {labelOf(EXPORT_JOB_STATUS_LABELS, 'FAILED')}
            </Tag>
          );
        }
        return (
          <Tag color="processing" data-testid="export-job-status">
            {labelOf(EXPORT_JOB_STATUS_LABELS, s || 'PENDING')}
          </Tag>
        );
      },
    },
    {
      title: 'Tải xuống',
      key: 'action',
      render: (_, r) => {
        const done = r.status === 'DONE' || r.status === 'COMPLETED';
        return (
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            data-testid="export-download-btn"
            disabled={!r.fileUrl || !done}
            onClick={() => handleDownloadFile(r.id, r.type)}
          >
            Tải CSV
          </Button>
        );
      },
    },
  ];

  const rblRetry = (
    <Button size="small" onClick={() => fetchAnalyticsData(targetRound?.id)} disabled={!targetRound?.id}>
      Thử lại
    </Button>
  );

  const hasScores = (progressData?.scoredSubmissions || 0) > 0 || perJudgeSpread.length > 0;

  return (
    <div style={{ padding: '24px 0', animation: 'fadeInUp 0.4s ease-out both' }}>
      <SectionHeader title="Phân tích & Dữ liệu" info={ANALYTICS_TAB_HINT} />

      {!targetRound?.id && (
        <Alert type="warning" showIcon message="Chưa có vòng thi để xem dashboard RBL." style={{ marginBottom: 16 }} />
      )}

      <Row gutter={[24, 24]}>
        <Col xs={24}>
          <Card title="Tiến độ RBL (Reliability & Bias Logging)" style={{ borderRadius: 12 }}>
            {rblError ? (
              <Alert message="Không tải được dữ liệu" type="error" showIcon action={rblRetry} />
            ) : loading && !progressData ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : (
              <Row align="middle" gutter={24}>
                <Col xs={24} md={8} style={{ textAlign: 'center' }}>
                  <Progress
                    type="dashboard"
                    percent={progressData?.completionPct ?? 0}
                    strokeColor={{ '0%': '#0f766e', '100%': '#10b981' }}
                    format={(percent) => `${Number(percent || 0).toFixed(1)}%`}
                  />
                  <Text strong style={{ display: 'block', marginTop: 12 }}>Tỷ lệ phủ dữ liệu chấm</Text>
                </Col>
                <Col xs={24} md={16}>
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', background: '#f5f5f5', borderRadius: 8 }}>
                      <Text>Tổng số bài nộp hợp lệ:</Text>
                      <Title level={4} style={{ margin: 0 }}>{progressData?.totalSubmissions || 0}</Title>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', background: '#ecfdf5', borderRadius: 8, border: '1px solid #a7f3d0' }}>
                      <Text>Số bài đã có điểm (RBL):</Text>
                      <Title level={4} style={{ margin: 0, color: '#0f766e' }}>{progressData?.scoredSubmissions || 0}</Title>
                    </div>
                  </Space>
                </Col>
              </Row>
            )}
          </Card>
        </Col>

        <Col xs={24}>
          <Card
            title="Độ lệch liên đánh giá viên theo tiêu chí (inter-rater)"
            style={{ borderRadius: 12 }}
            extra={(
              <Button
                onClick={() => fetchAnalyticsData(targetRound?.id)}
                icon={<SyncOutlined />}
                disabled={!targetRound?.id}
              >
                Làm mới
              </Button>
            )}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin size="large" /></div>
            ) : rblError ? (
              <Alert message="Không tải được dữ liệu" type="error" showIcon action={rblRetry} />
            ) : !hasScores || interRaterData.length === 0 ? (
              <Empty description="Chưa đủ dữ liệu chấm (cần ≥2 giám khảo/bài) để tính inter-rater." />
            ) : (
              <div style={{ height: 360, width: '100%' }} data-testid="rbl-inter-rater-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={interRaterData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis label={{ value: 'Mean inter-rater StdDev', angle: -90, position: 'insideLeft' }} />
                    <RechartsTooltip contentStyle={{ borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="meanInterRaterStdDev" name="Độ lệch giữa GK" fill="#0f766e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24}>
          <Card
            title="Phương sai theo giám khảo (ẩn danh)"
            style={{ borderRadius: 12 }}
            extra={(
              <Segmented
                data-testid="rbl-judge-segment"
                value={judgeSegment}
                onChange={setJudgeSegment}
                options={[
                  { label: 'Toàn bộ', value: 'ALL' },
                  { label: 'Faculty', value: 'FACULTY' },
                  { label: 'Guest', value: 'GUEST' },
                ]}
              />
            )}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin /></div>
            ) : filteredJudgeChart.length === 0 ? (
              <Empty description="Không có dữ liệu theo bộ lọc." />
            ) : (
              <div style={{ height: 360, width: '100%' }} data-testid="rbl-per-judge-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredJudgeChart} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="maskedJudgeName" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" orientation="left" stroke="#0f766e" />
                    <YAxis yAxisId="right" orientation="right" stroke="#b45309" />
                    <RechartsTooltip contentStyle={{ borderRadius: 8 }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="meanScore" name="Điểm TB" fill="#0f766e" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="stdDev" name="Độ lệch chuẩn" fill="#b45309" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="Trích xuất dữ liệu (CSV)" style={{ borderRadius: 12 }}>
            {!isFinished ? (
              <Alert
                type="warning"
                showIcon
                icon={<LockOutlined />}
                message="Xuất CSV chỉ khả dụng khi sự kiện đã kết thúc. Bảng phân tích RBL ở trên vẫn xem được khi đã có điểm."
                style={{ marginBottom: 16 }}
              />
            ) : null}
            <Space wrap style={{ marginBottom: 16 }} data-testid="export-create-row">
              <Select
                data-testid="export-type-select"
                style={{ minWidth: 280 }}
                value={exportType}
                onChange={setExportType}
                options={EXPORT_TYPES}
                disabled={!isFinished}
              />
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                data-testid="export-create-btn"
                loading={creatingExport}
                disabled={!isFinished}
                onClick={handleCreateExportJob}
              >
                Tạo yêu cầu xuất
              </Button>
              <Button icon={<SyncOutlined />} onClick={refreshJobs} disabled={!isFinished}>
                Làm mới danh sách
              </Button>
            </Space>
            <Table
              columns={jobColumns}
              dataSource={exportJobs}
              rowKey="id"
              pagination={false}
              locale={{ emptyText: 'Chưa có yêu cầu xuất dữ liệu nào.' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnalyticsPage;
