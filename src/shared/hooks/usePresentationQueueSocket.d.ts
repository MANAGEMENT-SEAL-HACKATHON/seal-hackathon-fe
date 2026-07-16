export type PresentationQueueSocketOptions = {
  onTimerPhase?: (body: unknown) => void;
  onControllerChanged?: (body: unknown) => void;
  onScoringUnlocked?: (body: unknown) => void;
  onFallbackPoll?: () => void;
};

export function usePresentationQueueSocket(
  roundId: number | null | undefined,
  onInvalidate: () => void,
  trackId?: number | null,
  options?: PresentationQueueSocketOptions,
): { connected: boolean; syncFallback: boolean };

export default usePresentationQueueSocket;
