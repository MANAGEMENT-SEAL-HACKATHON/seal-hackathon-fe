import { Card, Col, Row, Statistic } from "antd";

const metrics = [
  { key: "totalTeams", label: "Tổng đội" },
  { key: "groupCount", label: "Bảng/Track" },
  { key: "tiebreakCount", label: "Cần tiebreak" },
  { key: "eliminatedTeams", label: "Đã loại" },
];

const RankingSummary = ({ summary }) => (
  <Row gutter={[16, 16]}>
    {metrics.map((metric) => (
      <Col xs={12} md={6} key={metric.key}>
        <Card size="small">
          <Statistic title={metric.label} value={summary?.[metric.key] || 0} />
        </Card>
      </Col>
    ))}
  </Row>
);

export default RankingSummary;
