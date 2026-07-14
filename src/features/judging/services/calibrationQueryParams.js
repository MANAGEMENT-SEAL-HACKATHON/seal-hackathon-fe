// Pure query-param builder — safe for node --test without axios.
export function buildCalibrationQueryParams(roundId, trackId) {
  const params = { roundId };
  if (trackId != null) {
    params.trackId = trackId;
  }
  return params;
}
