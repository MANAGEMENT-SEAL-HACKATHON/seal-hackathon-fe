import React, { useState, useEffect } from "react";
import { Alert, Card, Empty, Space, Table, Tag, Typography, Button, Modal, List, Input } from "antd";
import { WarningOutlined, ExclamationCircleOutlined, CheckCircleOutlined, SyncOutlined, ArrowUpOutlined, ArrowDownOutlined, EditOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;
const { TextArea } = Input;

const ruleLabels = {
  SUBMISSION_TIME: "Ưu tiên thời gian nộp bài",
  PENALTY_SCORE: "Áp dụng điểm phạt",
  COORDINATOR_DECISION: "Quyết định của BTC",
};

const TiebreakPanel = ({ items, error, isResolving, onResolve }) => {
  // States cho Modal Phân xử
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [selectedTiebreak, setSelectedTiebreak] = useState(null);
  const [orderedTeams, setOrderedTeams] = useState([]);
  const [resolveNote, setResolveNote] = useState("");

  if (error) return <Alert showIcon type="error" message="Không tải được dữ liệu tiebreak" description={error.message} />;
  
  if (!items.length) {
    return (
      <Card style={{ borderRadius: 12 }}>
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <span style={{ fontWeight: 500 }}>Không có đội đồng điểm tại ranh giới đi tiếp.</span>
              <br />
              <span style={{ fontSize: 13 }}>Hệ thống đã kiểm tra và xác nhận danh sách các đội đi tiếp hoàn toàn hợp lệ, không cần phân xử thêm.</span>
            </div>
          } 
        />
      </Card>
    );
  }

  // Mở modal phân xử
  const openResolveModal = (item) => {
    setSelectedTiebreak(item);
    setOrderedTeams([...item.teams]); // Copy danh sách đội để sắp xếp
    setResolveNote("");
    setResolveModalVisible(true);
  };

  // Logic đổi chỗ (Lên/Xuống)
  const moveTeam = (index, direction) => {
    const newOrdered = [...orderedTeams];
    if (direction === "up" && index > 0) {
      [newOrdered[index - 1], newOrdered[index]] = [newOrdered[index], newOrdered[index - 1]];
    } else if (direction === "down" && index < newOrdered.length - 1) {
      [newOrdered[index + 1], newOrdered[index]] = [newOrdered[index], newOrdered[index + 1]];
    }
    setOrderedTeams(newOrdered);
  };

  // Submit API
  const handleConfirmResolve = async () => {
    const payload = {
      orderedTeamIds: orderedTeams.map(t => t.teamId), // BE cần List<Integer> theo thứ tự
      note: resolveNote.trim()
    };
    const success = await onResolve(payload);
    if (success) {
      setResolveModalVisible(false);
      setSelectedTiebreak(null);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Alert
        showIcon
        type="warning"
        message={`${items.length} trường hợp cần theo dõi tại ranh giới Top N`}
        description="Nếu hệ thống không thể tự động phân xử, sự cố sẽ được gắn cờ 'Escalate BTC'. Ban tổ chức bắt buộc phải Phân xử tay để chốt danh sách chuyển vòng."
      />
      
      {items.map((item) => (
        <Card
          key={item.key}
          title={<Space><WarningOutlined style={{ color: '#faad14' }} /><Text strong style={{ fontSize: 16 }}>Bảng {item.groupLabel}</Text></Space>}
          extra={
            <Space>
              {item.escalationRequired ? (
                <>
                  <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ fontWeight: 600, padding: '4px 10px', fontSize: 14 }}>Escalate BTC</Tag>
                  <Button type="primary" danger icon={<EditOutlined />} onClick={() => openResolveModal(item)}>
                    Phân xử ngay
                  </Button>
                </>
              ) : item.resolved ? (
                <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontWeight: 600, padding: '4px 10px', fontSize: 14 }}>Đã xử lý</Tag>
              ) : (
                <Tag color="processing" icon={<SyncOutlined spin />} style={{ fontWeight: 600, padding: '4px 10px', fontSize: 14 }}>Đang xử lý</Tag>
              )}
            </Space>
          }
          styles={{ header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' }, body: { padding: '16px 24px' } }}
          style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.02)', border: item.escalationRequired ? '1px solid #ffccc7' : '1px solid #f0f0f0' }}
        >
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            <Space wrap style={{ marginBottom: 4, padding: '10px 16px', borderRadius: 8, width: '100%', background: 'var(--ant-color-bg-container-disabled)' }}>
              <Tag color="blue" bordered={false} style={{ fontWeight: 500 }}>{ruleLabels[item.rule] || item.rule}</Tag>
              <Text type="secondary">Điểm ranh giới: <Text strong>{Number(item.cutoffScore).toFixed(2)}</Text></Text>
              <Text type="secondary">Số suất đi tiếp còn lại: <Text strong style={{ color: '#1677ff', fontSize: 16 }}>{item.remainingSlots}</Text></Text>
            </Space>
            <Title level={5} style={{ margin: 0, fontSize: 15 }}>Các đội đang đồng điểm</Title>
            <Table
              rowKey="teamId"
              size="middle"
              pagination={false}
              dataSource={item.teams}
              columns={[
                { 
                  title: "Đội", 
                  dataIndex: "teamName",
                  render: (name, record) => (
                    <Space direction="vertical" size={2}>
                      <Text strong style={{ fontSize: 14 }}>{name}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{record.groupLabel}</Text>
                    </Space>
                  )
                },
                { 
                  title: "Điểm gốc", 
                  dataIndex: "weightedAvgScore", 
                  align: "right", 
                  render: (value) => <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 600, color: '#2563eb' }}>{Number(value).toFixed(2)}</span> 
                },
                { 
                  title: "Điểm bị trừ (Penalty)", 
                  dataIndex: "penaltyScore", 
                  align: "right", 
                  render: (value) => {
                    const num = Number(value);
                    return <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 600, color: num > 0 ? '#dc2626' : '#94a3b8' }}>{num > 0 ? `-${num.toFixed(2)}` : "0.00"}</span> 
                  }
                },
                { 
                  title: "Điểm chung cuộc", 
                  key: "finalScore", 
                  align: "right", 
                  render: (_, record) => {
                    const finalScore = Number(record.weightedAvgScore) - Number(record.penaltyScore || 0);
                    return <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{finalScore.toFixed(2)}</span> 
                  }
                },
              ]}
            />
          </Space>
        </Card>
      ))}

      {/* MODAL PHÂN XỬ */}
      <Modal
        title={<div><WarningOutlined style={{color: '#faad14', marginRight: 8}} /> Phân xử Đồng điểm: Bảng {selectedTiebreak?.groupLabel}</div>}
        open={resolveModalVisible}
        onCancel={() => setResolveModalVisible(false)}
        width={700}
        footer={[
          <Button key="cancel" onClick={() => setResolveModalVisible(false)}>Hủy</Button>,
          <Button key="submit" type="primary" danger loading={isResolving} onClick={handleConfirmResolve}>
            Xác nhận Phân xử
          </Button>
        ]}
      >
        <Alert 
          type="info" showIcon 
          message="Hướng dẫn phân xử" 
          description={
            <span>Sử dụng nút Mũi tên để sắp xếp thứ hạng thực tế của các đội. <br/>
            Đội nằm ở <b>Vị trí số 1 (Trên cùng) sẽ Chiến thắng</b>. Đội nằm dưới sẽ bị hệ thống tự động đánh điểm Penalty.</span>
          } 
          style={{ marginBottom: 16 }}
        />
        
        <List
          itemLayout="horizontal"
          dataSource={orderedTeams}
          renderItem={(team, index) => (
            <List.Item
              style={{
                background: index === 0 ? '#f6ffed' : '#fff1f0',
                border: `1px solid ${index === 0 ? '#b7eb8f' : '#ffa39e'}`,
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 8
              }}
              actions={[
                <Button type="text" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => moveTeam(index, "up")} />,
                <Button type="text" icon={<ArrowDownOutlined />} disabled={index === orderedTeams.length - 1} onClick={() => moveTeam(index, "down")} />
              ]}
            >
              <List.Item.Meta
                avatar={
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: index === 0 ? '#52c41a' : '#f5222d', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    #{index + 1}
                  </div>
                }
                title={<Text strong style={{ fontSize: 16 }}>{team.teamName}</Text>}
                description={<Text>Điểm gốc: <strong style={{ color: '#2563eb' }}>{Number(team.weightedAvgScore).toFixed(2)}</strong></Text>}
              />
              <div style={{ textAlign: 'right' }}>
                <Tag color={index === 0 ? "success" : "error"} style={{ fontWeight: 'bold', fontSize: 14, padding: '4px 12px' }}>
                  {index === 0 ? "CHIẾN THẮNG" : "BỊ TRỪ PENALTY"}
                </Tag>
              </div>
            </List.Item>
          )}
        />

        <div style={{ marginTop: 24 }}>
          <Text strong>Ghi chú quyết định của BTC (Bắt buộc):</Text>
          <TextArea 
            rows={3} 
            placeholder="Giải thích lý do đội xếp trên chiến thắng (Ví dụ: Dựa vào tiêu chí UX/UI cao hơn...)" 
            value={resolveNote}
            onChange={e => setResolveNote(e.target.value)}
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>
    </Space>
  );
};

export default TiebreakPanel;