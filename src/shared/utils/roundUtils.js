export const isFinalRound = (round) =>
  Boolean(round?.isFinal ?? round?.is_final) ||
  String(round?.roundType || round?.round_type || '').toUpperCase() === 'FINAL';

export const isPreliminaryRound = (round) => !isFinalRound(round);

export const getRoundId = (round) => round?.id ?? round?.roundId ?? round?.round_id ?? null;

export const unwrapRoundList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};
