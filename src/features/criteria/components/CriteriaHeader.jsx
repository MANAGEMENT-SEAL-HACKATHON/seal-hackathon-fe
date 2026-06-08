import React from "react";
import { Space, Select, Typography, Switch, Card, theme } from "antd";

const { Title, Text } = Typography;
const { Option } = Select;
const { useToken } = theme;

export const CriteriaHeader = ({
  hackathonRounds = [],
  roundTracks = [],
  currentRound,
  selectedRoundId,
  setSelectedRoundId,
  selectedTrackId,
  setSelectedTrackId,
  updateRound,
}) => {
  const { token } = useToken();

  return (
    <div style={{ animation: "fadeInUp 0.4s ease-out both" }}>
      <Card
        style={{
          marginBottom: 24,
          borderRadius: 16,
          boxShadow: token.boxShadowTertiary,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
        styles={{ body: { padding: "24px" } }}
      >
        <Space
          size="large"
          style={{
            display: "flex",
            width: "100%",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 300, flex: 1 }}>
            <Text
              strong
              style={{
                display: "block",
                marginBottom: 8,
                color: token.colorTextSecondary,
              }}
            >
              Vòng thi (Round)
            </Text>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
              Sơ loại: theo từng bảng đấu. Chung kết: theo vòng. Tổng trọng số = 1.
            </Text>
            <Select
              style={{ width: "100%" }}
              size="large"
              placeholder="Chọn vòng thi..."
              value={selectedRoundId}
              onChange={setSelectedRoundId}
            >
              {hackathonRounds?.map((r) => (
                <Option key={r.id} value={r.id}>
                  {r.name} {r.is_final ? "(Chung Kết)" : "(Sơ Loại)"}
                </Option>
              ))}
            </Select>
          </div>

          {currentRound && !currentRound.is_final && (
            <div style={{ minWidth: 300, flex: 1 }}>
              <Text
                strong
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: token.colorTextSecondary,
                }}
              >
                Bảng đấu
              </Text>
              <Select
                style={{ width: "100%" }}
                size="large"
                placeholder="Chọn bảng đấu..."
                value={selectedTrackId}
                onChange={setSelectedTrackId}
              >
                {roundTracks?.map((t) => (
                  <Option key={t.id} value={t.id}>
                    {t.name}
                  </Option>
                ))}
              </Select>
            </div>
          )}
        </Space>
      </Card>

      {currentRound && (currentRound.is_final || selectedTrackId) && (
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            backgroundColor: token.colorBgContainer,
            borderRadius: 12,
            border: `1px solid ${token.colorBorderSecondary}`,
            boxShadow: token.boxShadowTertiary,
          }}
        >
          <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
            {currentRound.is_final
              ? currentRound.name
              : `${currentRound.name} — Bảng: ${roundTracks?.find((t) => t.id === selectedTrackId)?.name}`}
          </Title>
        </div>
      )}
    </div>
  );
};
