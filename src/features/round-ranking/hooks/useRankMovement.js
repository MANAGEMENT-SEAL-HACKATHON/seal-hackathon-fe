// src/features/round-ranking/hooks/useRankMovement.js
import { useEffect, useRef, useState } from "react";

const MOVEMENT_VISIBLE_MS = 2600;

export const useRankMovement = (items = []) => {
  const previousRanksRef = useRef(new Map());
  const [movements, setMovements] = useState({});

  useEffect(() => {
    const nextMovements = {};
    const nextRanks = new Map();

    items.forEach((item) => {
      const teamKey = String(item.teamId);
      nextRanks.set(teamKey, item.rank);

      if (item.isEliminated || !previousRanksRef.current.get(teamKey)) {
        return;
      }

      const previousRank = previousRanksRef.current.get(teamKey);
      if (!item.rank || previousRank === item.rank) return;

      nextMovements[teamKey] = {
        direction: item.rank < previousRank ? "up" : "down",
        delta: Math.abs(previousRank - item.rank),
        previousRank,
        currentRank: item.rank,
      };
    });

    previousRanksRef.current = nextRanks;
    setMovements(nextMovements);

    if (!Object.keys(nextMovements).length) return undefined;

    const timeoutId = window.setTimeout(() => {
      setMovements({});
    }, MOVEMENT_VISIBLE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [items]);

  return movements;
};
