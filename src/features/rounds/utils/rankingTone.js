export const getRankColor = (rank, token) => {
  if (rank === 1) return token.colorWarningText;
  if (rank === 2) return token.colorTextSecondary;
  if (rank === 3) return token.colorErrorText;
  return token.colorText;
};

export const getRowTone = (item, movement, token) => {
  if (item.isEliminated) {
    return {
      background: token.colorErrorBg,
      borderColor: token.colorErrorBorder,
      accent: token.colorError,
      opacity: 0.58,
    };
  }

  if (movement?.direction === "up") {
    return {
      background: `linear-gradient(90deg, ${token.colorSuccessBg}, ${token.colorBgContainer})`,
      borderColor: token.colorSuccessBorder,
      accent: token.colorSuccess,
      opacity: 1,
    };
  }

  if (movement?.direction === "down") {
    return {
      background: `linear-gradient(90deg, ${token.colorWarningBg}, ${token.colorBgContainer})`,
      borderColor: token.colorWarningBorder,
      accent: token.colorWarning,
      opacity: 0.78,
    };
  }

  if (item.rank === 1 && !item.isEliminated) {
    return {
      background: `linear-gradient(90deg, ${token.colorWarningBg}, ${token.colorBgContainer})`,
      borderColor: token.colorWarningBorder,
      accent: token.colorWarning,
      opacity: 1,
    };
  }

  if (item.rank === 2) {
    return {
      background: token.colorFillSecondary,
      borderColor: token.colorBorder,
      accent: token.colorTextTertiary,
      opacity: 1,
    };
  }

  if (item.rank === 3) {
    return {
      background: token.colorErrorBg,
      borderColor: token.colorErrorBorder,
      accent: token.colorError,
      opacity: 1,
    };
  }

  return {
    background: token.colorBgContainer,
    borderColor: token.colorBorderSecondary,
    accent: item.rank <= 3 ? token.colorPrimary : token.colorBorder,
    opacity: 1,
  };
};

export const getTopStepMeta = (rank, token) => {
  if (rank === 1) {
    return {
      label: "Top 1",
      color: token.colorWarningText,
      background: `linear-gradient(135deg, ${token.colorWarningBg}, ${token.colorBgContainer})`,
      border: token.colorWarningBorder,
      lift: 0,
      height: 184,
      tagColor: "gold",
    };
  }

  if (rank === 2) {
    return {
      label: "Top 2",
      color: token.colorTextSecondary,
      background: `linear-gradient(135deg, ${token.colorFillSecondary}, ${token.colorBgContainer})`,
      border: token.colorBorder,
      lift: 24,
      height: 152,
      tagColor: "default",
    };
  }

  return {
    label: "Top 3",
    color: token.colorErrorText,
    background: `linear-gradient(135deg, ${token.colorErrorBg}, ${token.colorBgContainer})`,
    border: token.colorErrorBorder,
    lift: 36,
    height: 140,
    tagColor: "volcano",
  };
};
