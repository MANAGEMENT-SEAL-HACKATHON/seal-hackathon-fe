import React, { useState, useEffect } from 'react';
import { Typography, Card, Select, Table, Tag, Alert, Spin, Space, message } from 'antd';
import { FileTextOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { judgeService } from '../services/judgeService';
import { criteriaService } from '../../criteria/services/criteriaService';

const { Title, Text } = Typography;

const JudgeCriteriaViewPage = () => {
  const [loading, setLoading] = useState(false);
  const [assignmentOptions, setAssignmentOptions] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [criteriaData, setCriteriaData] = useState([]);

  // 1. LẤY DANH SÁCH NHIỆM VỤ ĐỂ HIỂN THỊ VÀO DROPDOWN
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        // Gọi API lấy danh sách Sơ loại và Chung kết
        const [tracksRes, finalsRes] = await Promise.all([
          judgeService.getTrackAssignments().catch(() => []),
          judgeService.getFinalAssignments().catch(() => [])
        ]);

        const rawTracks = Array.isArray(tracksRes) ? tracksRes : tracksRes?.items || tracksRes?.data || [];
        const rawFinals = Array.isArray(finalsRes) ? finalsRes : finalsRes?.items || finalsRes?.data || [];

        const options = [];

        // Thêm nhiệm vụ Sơ loại (dùng prefix 'track_' để phân biệt)
        rawTracks.forEach(item => {
          if (item.trackId || item.track_id) {
            options.push({
              value: `track_${item.trackId || item.track_id}`,
              label: `Sơ loại - ${item.trackName || item.track_name || 'Bảng đấu'}`
            });
          }
        });

        // Thêm nhiệm vụ Chung kết (dùng prefix 'round_' để phân biệt)
        rawFinals.forEach(item => {
          if (item.roundId || item.round_id) {
            options.push({
              value: `round_${item.roundId || item.round_id}`,
              label: `Chung kết - ${item.roundName || item.round_name || 'Vòng thi'}`
            });
          }
        });

        setAssignmentOptions(options);

        // Mặc định chọn cái đầu tiên nếu có
        if (options.length > 0) {
          setSelectedAssignment(options[0].value);
        }
      } catch (error) {
        message.error("Lỗi khi tải danh sách nhiệm vụ.");
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  // 2. LẤY TIÊU CHÍ (CRITERIA) MỖI KHI ĐỔI DROPDOWN
  useEffect(() => {
    if (!selectedAssignment) return;

    const fetchCriteria = async () => {
      setLoading(true);
      try {
        let rawCriteria = [];
        
        // Cắt chuỗi để biết đang chọn Track hay Round
        if (selectedAssignment.startsWith('track_')) {
          const trackId = selectedAssignment.replace('track_', '');
          rawCriteria = await criteriaService.listByTrack(trackId);
        } else if (selectedAssignment.startsWith('round_')) {
          const roundId = selectedAssignment.replace('round_', '');
          rawCriteria = await criteriaService.listByFinalRound(roundId);
        }

        const fetchedCriteria = Array.isArray(rawCriteria) ? rawCriteria : rawCriteria?.items || rawCriteria?.data || [];
        setCriteriaData(fetchedCriteria);
      } catch (error) {
        console.error("Lỗi tải tiêu chí:", error);
        message.error("Không thể tải tiêu chí đánh giá cho vòng này.");
        setCriteriaData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCriteria();
  }, [selectedAssignment]);

  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      align: 'center',
      render: (text, record, index) => index + 1,
    },
    {
      title: 'Tên tiêu chí',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong>{text || record.criteriaName}</Text>
          <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
            {record.description}
          </div>
        </div>
      )
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type) => (
        <Tag color={type === 'TECHNICAL' ? 'blue' : type === 'GENERAL' ? 'green' : 'orange'} style={{ fontWeight: 600 }}>
          {type || 'GENERAL'}
        </Tag>
      ),
    },
    {
      title: 'Trọng số',
      dataIndex: 'weight',
      key: 'weight',
      width: 100,
      align: 'center',
      render: (weight) => <Text strong style={{ color: '#1677ff' }}>{(weight || 0).toFixed(2)}</Text>,
    },
    {
      title: 'Điểm Max',
      key: 'maxScore',
      width: 100,
      align: 'center',
      render: (_, record) => <Text strong>{record.maxScore || record.max_score || 10}</Text>,
    }
  ];

  // Tính tổng trọng số hiện tại
  const totalWeight = criteriaData.reduce((sum, item) => sum + (item.weight || 0), 0);
  const isWeightValid = Math.abs(totalWeight - 1.0) < 0.001; // Cân nhắc sai số thập phân

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <FileTextOutlined style={{ fontSize: 24, color: '#1677ff', marginRight: 12 }} />
        <Title level={2} style={{ margin: 0 }}>Từ điển Tiêu chí Đánh giá</Title>
      </div>

      <Card style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          
          <Alert
            message="Chế độ Xem (Read-only)"
            description="Là Giám khảo, bạn có thể xem trước các tiêu chí chấm điểm và trọng số của từng vòng thi. Các tiêu chí này được thiết lập bởi Ban tổ chức và không thể chỉnh sửa."
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ borderRadius: 8 }}
          />

          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Chọn Nhiệm vụ / Vòng thi:</Text>
            <Select
              size="large"
              value={selectedAssignment}
              onChange={setSelectedAssignment}
              options={assignmentOptions}
              style={{ width: '100%', maxWidth: 400 }}
              placeholder={assignmentOptions.length === 0 ? "Chưa có nhiệm vụ phân công" : "Chọn vòng thi..."}
              disabled={loading || assignmentOptions.length === 0}
            />
          </div>

          {criteriaData.length > 0 && (
            <div style={{ background: isWeightValid ? '#f6ffed' : '#fff2f0', border: `1px solid ${isWeightValid ? '#b7eb8f' : '#ffccc7'}`, padding: '12px 16px', borderRadius: 8, display: 'inline-block' }}>
              <Text strong style={{ color: isWeightValid ? '#389e0d' : '#cf1322' }}>
                Tổng trọng số hiện tại: {totalWeight.toFixed(2)} {isWeightValid ? '(Hợp lệ)' : '(Chưa đạt 1.0)'}
              </Text>
            </div>
          )}

          <Spin spinning={loading} tip="Đang tải dữ liệu tiêu chí...">
            <Table
              columns={columns}
              dataSource={criteriaData}
              rowKey={(record) => record.id || record.criteriaId}
              pagination={false}
              bordered
              style={{ marginTop: 8 }}
              locale={{ emptyText: 'Chưa có tiêu chí nào được cấu hình cho vòng này.' }}
            />
          </Spin>

        </Space>
      </Card>
    </motion.div>
  );
};

export default JudgeCriteriaViewPage;