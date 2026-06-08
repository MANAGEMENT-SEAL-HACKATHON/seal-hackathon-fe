import { theme } from "antd";

const RankingGroupFilter = ({ groups, selectedGroup, onChange }) => {
  const { token } = theme.useToken();
  const options = [
    { label: "Tất cả", value: "all" },
    ...groups.map((group) => ({
      label: `${group.label} (${group.items.length})`,
      value: group.key,
    })),
  ];

  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
      {options.map(opt => {
        const isActive = selectedGroup === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              background: isActive ? token.colorPrimaryBg : token.colorFillQuaternary,
              border: `1px solid ${isActive ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
              color: isActive ? token.colorPrimary : token.colorTextSecondary,
              padding: "8px 16px",
              borderRadius: "20px",
              cursor: "pointer",
              backdropFilter: "blur(4px)",
              transition: "all 0.2s ease",
              fontWeight: isActive ? 600 : 400
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default RankingGroupFilter;
