import { useCallback, useState } from "react";
import { message } from "antd";
import { teamEliminationService } from "../service/teamEliminationService";

export const useEliminateTeam = () => {
  const [isEliminating, setIsEliminating] = useState(false);
  const [eliminatingTeamId, setEliminatingTeamId] = useState(null);

  const eliminateTeam = useCallback(async (team, reason, onSuccess) => {
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      message.warning("Vui lòng nhập lý do loại đội.");
      return false;
    }

    setIsEliminating(true);
    setEliminatingTeamId(team.teamId);

    try {
      await teamEliminationService.eliminateTeam(team.teamId, trimmedReason);
      message.success(`Đã loại đội ${team.teamName}.`);
      await onSuccess?.();
      return true;
    } catch (error) {
      message.error(error?.message || "Không thể loại đội. Vui lòng thử lại.");
      return false;
    } finally {
      setIsEliminating(false);
      setEliminatingTeamId(null);
    }
  }, []);

  return {
    isEliminating,
    eliminatingTeamId,
    eliminateTeam,
  };
};
