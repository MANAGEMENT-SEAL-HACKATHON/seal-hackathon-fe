import { Segmented } from "antd";

const RankingGroupFilter = ({ groups, selectedGroup, onChange }) => {
  const options = [
    { label: "Tất cả", value: "all" },
    ...groups.map((group) => ({
      label: `${group.label} (${group.items.length})`,
      value: group.key,
    })),
  ];

  return (
    <Segmented
      block
      options={options}
      value={selectedGroup}
      onChange={onChange}
      style={{ maxWidth: 720 }}
    />
  );
};

export default RankingGroupFilter;
