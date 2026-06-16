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
      const previousRank = previousRanksRef.current.get(teamKey);
      nextRanks.set(teamKey, item.rank);

      if (!previousRank || !item.rank || previousRank === item.rank) return;

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
