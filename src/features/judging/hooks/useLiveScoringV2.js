import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { message } from 'antd';
import { judgeService } from '../services/judgeService';
import { criteriaService } from '../../criteria/services/criteriaService';
import { presentationService, getQueueBucket } from '../services/presentationService';
import { roundService } from '../../rounds/services/roundService';
import { useScoreSavedSocket } from '../../../shared/hooks/useScoreSavedSocket';
import {
  PRELIMINARY_SUBMISSION_ERROR_MESSAGES,
  resolvePreliminarySubmissionError,
} from '../../submissions/constants/preliminarySubmissionErrors';
import { resolveUserError } from '../../../shared/errors/resolveUserError';

const getErrorCode = (error) =>
  error?.code || error?.response?.data?.error?.code || error?.response?.data?.code;

const getSubmissionId = (item) =>
  item?.submissionId ?? item?.submission_id ?? item?.id;

const getTimerPresentationMinutes = (timer) => {
  if (!timer) return null;
  const raw = timer.presentationMinutes ?? timer.presentation_minutes;
  return raw != null ? Number(raw) : null;
};

const getTimerQaMinutes = (timer) => {
  if (!timer) return null;
  const raw = timer.qaMinutes ?? timer.qa_minutes;
  return raw != null ? Number(raw) : null;
};

const resolvePresentationSeconds = (timer, remainingSeconds = 0) => {
  const minutes = getTimerPresentationMinutes(timer);
  if (minutes != null) return minutes * 60;
  if (remainingSeconds > 0) return remainingSeconds;
  return 600;
};

export const useLiveScoringV2 = (
  assignmentId,
  roundId,
  trackId,
  isFinal,
  initialAssignmentType,
  calibrationOptions = {}
) => {
  const {
    isCalibration = false,
    calibrationSessionId = null,
    sampleSubmissionId = null,
  } = calibrationOptions;

  const [queueData, setQueueData] = useState(null);
  const [submissionsData, setSubmissionsData] = useState([]);
  const [criteria, setCriteria] = useState([]);

  const [scoreState, setScoreState] = useState({ submissionId: null, scores: {}, comment: '' });

  const [rawMyScores, setRawMyScores] = useState([]);
  const [myScoredSubmissions, setMyScoredSubmissions] = useState({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scoringLocked, setScoringLocked] = useState(false);
  const [isTimerActionLoading, setIsTimerActionLoading] = useState(false);

  const isActionPendingRef = useRef(false);

  const [isController, setIsController] = useState(false);
  const [presentationScoringStatus, setPresentationScoringStatus] = useState(null);

  const refreshPresentationStatus = useCallback(async () => {
    if (isCalibration || !roundId) return;
    try {
      const res = await judgeService.getPresentationScoringStatus(
        roundId,
        isFinal ? undefined : trackId,
      );
      const data = res?.data || res;
      setPresentationScoringStatus(data);
      if (data?.canControlPresentation != null) {
        setIsController(Boolean(data.canControlPresentation));
      }
    } catch {
      // non-blocking
    }
  }, [roundId, trackId, isFinal, isCalibration]);

  const [localTimerPhase, setLocalTimerPhase] = useState('IDLE');
  const [localRemainingSeconds, setLocalRemainingSeconds] = useState(0);

  // [SỬA ĐỔI] Thêm cờ isEndedEarly để bảo vệ Frontend không bị BE đè thời gian
  const timerEngineRef = useRef({
    phase: 'IDLE',
    originalPhase: 'PRESENTING',
    baseSeconds: 0,
    startTimeMs: 0,
    intervalId: null,
    isEndedEarly: false, 
  });

  const syncTimerState = useCallback((phase, seconds) => {
    timerEngineRef.current.phase = phase;
    timerEngineRef.current.baseSeconds = seconds;
    setLocalTimerPhase(phase);
    setLocalRemainingSeconds(seconds);
  }, []);

  const applyEngineState = useCallback((newPhase, newSeconds) => {
    const engine = timerEngineRef.current;

    if (engine.intervalId) {
      clearInterval(engine.intervalId);
      engine.intervalId = null;
    }

    engine.phase = newPhase;
    if (newPhase === 'PRESENTING' || newPhase === 'QA') {
      engine.originalPhase = newPhase;
    }

    engine.baseSeconds = newSeconds;
    engine.startTimeMs = Date.now();

    setLocalTimerPhase(newPhase);
    setLocalRemainingSeconds(newSeconds);

    if (newPhase === 'PRESENTING' || newPhase === 'QA') {
      engine.intervalId = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - engine.startTimeMs) / 1000);
        const currentTick = Math.max(0, engine.baseSeconds - elapsedSeconds);
        setLocalRemainingSeconds(currentTick);
      }, 1000);
    }
  }, []);

  const fetchStaticData = useCallback(async () => {
    try {
      const requests = [
        isFinal || isCalibration
          ? criteriaService.listByFinalRound(roundId)
          : criteriaService.listByTrack(trackId),
        judgeService.getSubmissions({ roundId, trackId: isFinal || isCalibration ? undefined : trackId }),
        judgeService.getMyScores(roundId).catch(() => []),
      ];
      if (roundId && !isCalibration) {
        requests.push(roundService.getById(roundId).catch(() => null));
      }

      const results = await Promise.all(requests);
      const critRes = results[0];
      const subRes = results[1];
      const myScoresRes = results[2];
      const roundRes = results[3];

      if (roundRes) {
        const round = roundRes?.data || roundRes;
        setScoringLocked(Boolean(round?.scoringLocked ?? round?.scoring_locked));
      }

      const critData = Array.isArray(critRes) ? critRes : critRes?.items || [];
      setCriteria(critData);
      setSubmissionsData(Array.isArray(subRes) ? subRes : subRes?.items || subRes?.data || []);

      const scoresData = Array.isArray(myScoresRes) ? myScoresRes : myScoresRes?.items || myScoresRes?.data || [];
      setRawMyScores(scoresData);

      const weightMap = {};
      critData.forEach((c) => {
        weightMap[c.id] = c.weight || 0;
      });

      const scoredMap = {};
      scoresData.forEach((s) => {
        const subId = String(s.submissionId ?? s.submission_id);
        const critId = String(s.criterionId ?? s.criterion_id);
        const val = Number(
          s.scoreValue ?? s.score_value ?? s.score ?? s.value ?? s.totalScore ?? s.total_score ?? 0
        );

        if (critId && critId !== 'undefined' && critId !== 'null') {
          if (!scoredMap[subId]) scoredMap[subId] = 0;
          scoredMap[subId] += val * (weightMap[critId] || 0);
        } else {
          scoredMap[subId] = val;
        }
      });

      const finalScoredMap = {};
      Object.keys(scoredMap).forEach((subId) => {
        finalScoredMap[subId] = scoredMap[subId].toFixed(2);
      });
      setMyScoredSubmissions(finalScoredMap);
    } catch (error) {
      // non-blocking
    }
  }, [roundId, trackId, isFinal, isCalibration]);

  const fetchQueue = useCallback(
    async (force = false) => {
      if (isCalibration) {
        setIsLoading(false);
        return;
      }
      if (!roundId || (!force && isActionPendingRef.current)) return;
      try {
        const qRes = await presentationService.getQueue(roundId, isFinal ? null : trackId);
        const qData = qRes?.data || qRes;
        setQueueData(qData);

        const track = getQueueBucket(qData, { isFinal, trackId });
        const presenting = (track?.items || track?.teams || []).find(
          (item) => item.status === 'PRESENTING'
        );

        if (presenting?.timer) {
          const serverPhase = presenting.timer.phase;
          let serverSeconds = presenting.timer.remainingSeconds ?? 0;
          if (serverSeconds < 0) serverSeconds = 0;
          
          if ((serverPhase === 'IDLE' || serverPhase === 'SETUP') && serverSeconds === 0) {
            serverSeconds = resolvePresentationSeconds(presenting.timer, 0);
          }

          const currentEngine = timerEngineRef.current;

          // [QUAN TRỌNG] BẢO VỆ TRẠNG THÁI ENDED: 
          // Nếu đã bấm "Kết thúc", bỏ qua đồng bộ từ Server để đồng hồ không bị giật lại
          if (currentEngine.isEndedEarly && (serverPhase === 'QA' || serverPhase === 'PAUSED')) {
            return; 
          }

          if (currentEngine.phase !== serverPhase) {
            currentEngine.isEndedEarly = false; // Reset cờ nếu Server sang Phase mới (VD: NEXT -> IDLE)
            applyEngineState(serverPhase, serverSeconds);
          } else if (
            serverPhase === 'PAUSED' ||
            serverPhase === 'IDLE' ||
            serverPhase === 'SETUP' ||
            serverPhase === 'ENDED'
          ) {
            if (currentEngine.baseSeconds !== serverSeconds) {
              syncTimerState(serverPhase, serverSeconds);
            }
          }
        } else if (timerEngineRef.current.phase !== 'IDLE') {
          applyEngineState('IDLE', 0);
        }
      } catch (error) {
        // non-blocking
      } finally {
        setIsLoading(false);
      }
    },
    [roundId, trackId, isFinal, isCalibration, applyEngineState, syncTimerState]
  );

  useEffect(() => {
    fetchStaticData();
    if (isCalibration) {
      setIsLoading(false);
      return;
    }
    fetchQueue(true);
    refreshPresentationStatus();
    const interval = setInterval(() => {
      fetchQueue(false);
      refreshPresentationStatus();
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchStaticData, fetchQueue, refreshPresentationStatus, isCalibration]);

  const handleScoreSaved = useCallback(() => {
    if (isCalibration) return;
    fetchQueue(true);
    fetchStaticData();
  }, [isCalibration, fetchQueue, fetchStaticData]);

  useScoreSavedSocket(!isFinal && trackId ? trackId : null, handleScoreSaved);

  useEffect(() => {
    return () => {
      if (timerEngineRef.current.intervalId) {
        clearInterval(timerEngineRef.current.intervalId);
      }
    };
  }, []);

  const { trackQueue, activeSlot: presentingSlot, sidebarQueue } = useMemo(() => {
    if (isCalibration && sampleSubmissionId) {
      const sub = submissionsData.find(
        (s) => String(getSubmissionId(s)) === String(sampleSubmissionId)
      );
      const synthetic = {
        submissionId: Number(sampleSubmissionId),
        teamName: sub?.teamName || sub?.team_name || `Mẫu #${sampleSubmissionId}`,
        status: 'CALIBRATION',
        order: 1,
        slideFile: sub?.slideFile,
        repoUrl: sub?.repoUrl,
        demoUrl: sub?.demoUrl || sub?.demo_url,
      };
      return { trackQueue: [synthetic], activeSlot: null, sidebarQueue: [synthetic] };
    }

    if (!queueData && submissionsData.length === 0) {
      return { trackQueue: [], activeSlot: null, sidebarQueue: [] };
    }

    const track = getQueueBucket(queueData, { isFinal, trackId });
    let queueItems = track?.items || track?.teams || [];

    queueItems = queueItems.map((item) => {
      const subInfo =
        submissionsData.find(
          (s) => String(getSubmissionId(s)) === String(getSubmissionId(item))
        ) || {};
      return {
        ...item,
        slideFile: subInfo.slideFile,
        repoUrl: subInfo.repoUrl,
        demoUrl: subInfo.demoUrl || subInfo.demo_url,
        teamName: item.teamName || subInfo.teamName || subInfo.team_name,
      };
    });

    const presenting = queueItems.find((item) => item.status === 'PRESENTING');

    return { trackQueue: queueItems, activeSlot: presenting, sidebarQueue: queueItems };
  }, [queueData, submissionsData, trackId, isFinal, isCalibration, sampleSubmissionId]);

  const hasPresentationQueue = !isCalibration && sidebarQueue.length > 0;
  const isLivePresentation = hasPresentationQueue;

  const scoringTarget = useMemo(() => {
    if (isCalibration && sampleSubmissionId) {
      return sidebarQueue[0] || { submissionId: Number(sampleSubmissionId) };
    }
    if (!hasPresentationQueue) {
      return null;
    }
    return presentingSlot;
  }, [
    isCalibration,
    sampleSubmissionId,
    hasPresentationQueue,
    sidebarQueue,
    presentingSlot,
  ]);

  const scoringTargetId = getSubmissionId(scoringTarget);

  const currentScores =
    scoreState.submissionId === scoringTargetId ? scoreState.scores : {};
  const comment = scoreState.submissionId === scoringTargetId ? scoreState.comment : '';

  const isAllDone =
    !isCalibration &&
    isLivePresentation &&
    trackQueue.length > 0 &&
    trackQueue.every((item) => item.status === 'DONE');

  const hasScoredCurrentTeam = useMemo(() => {
    if (!scoringTargetId) return false;
    const subIdStr = String(scoringTargetId);
    if (isFinal && !isCalibration) {
      const statusSubId = presentationScoringStatus?.submissionId;
      if (
        statusSubId != null &&
        String(statusSubId) === subIdStr &&
        presentationScoringStatus.myConfirmed
      ) {
        return true;
      }
      return false;
    }
    if (isCalibration) {
      return !!myScoredSubmissions[subIdStr];
    }
    return !!myScoredSubmissions[subIdStr];
  }, [scoringTargetId, presentationScoringStatus, isFinal, isCalibration, myScoredSubmissions]);

  useEffect(() => {
    if (!scoringTargetId) {
      setScoreState({ submissionId: null, scores: {}, comment: '' });
      return;
    }
    const subIdStr = String(scoringTargetId);

    let hasIndividualScoresInDB = false;
    const dbScores = {};
    let dbComment = '';

    (rawMyScores || []).forEach((s) => {
      if (String(s.submissionId ?? s.submission_id) === subIdStr) {
        const cId = s.criterionId ?? s.criterion_id;
        if (cId) {
          hasIndividualScoresInDB = true;
          dbScores[String(cId)] = Number(
            s.scoreValue ?? s.score_value ?? s.score ?? s.value ?? s.totalScore ?? s.total_score ?? 0
          );
        }
        if (s.comment) dbComment = s.comment;
      }
    });

    const draftKey = `seal_draft_${assignmentId}_${subIdStr}`;
    let localDraft = null;
    try {
      localDraft = JSON.parse(localStorage.getItem(draftKey));
    } catch (e) {
      // ignore
    }

    let finalScores = {};
    let finalComment = dbComment;

    if (hasIndividualScoresInDB && Object.keys(dbScores).length > 0) {
      finalScores = dbScores;
    } else if (localDraft?.scores && Object.keys(localDraft.scores).length > 0) {
      finalScores = localDraft.scores;
      if (!finalComment) finalComment = localDraft.comment || '';
    }

    setScoreState({
      submissionId: scoringTargetId,
      scores: finalScores,
      comment: finalComment,
    });
  }, [scoringTargetId, rawMyScores, assignmentId]);

  useEffect(() => {
    if (!scoreState.submissionId) return;
    const draftKey = `seal_draft_${assignmentId}_${scoreState.submissionId}`;
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        scores: scoreState.scores,
        comment: scoreState.comment,
      })
    );
  }, [scoreState, assignmentId]);

  const hasAllCriteriaFilled = useMemo(
    () =>
      criteria.length > 0 &&
      criteria.every(
        (c) => currentScores[c.id] !== undefined && currentScores[c.id] !== null,
      ),
    [criteria, currentScores],
  );

  const canScore = !scoringLocked && Boolean(scoringTarget);
  const canSubmitFinalScore = useMemo(() => {
    if (scoringLocked || !scoringTarget || hasScoredCurrentTeam) return false;
    if (isCalibration) return hasAllCriteriaFilled;
    if (!hasPresentationQueue) return false;
    if (!['QA', 'ENDED'].includes(localTimerPhase)) return false;
    if (!hasAllCriteriaFilled) return false;
    return true;
  }, [
    scoringLocked,
    scoringTarget,
    hasScoredCurrentTeam,
    isCalibration,
    hasPresentationQueue,
    localTimerPhase,
    hasAllCriteriaFilled,
  ]);

  const canAdvanceToNext = useMemo(() => {
    if (isCalibration || !hasPresentationQueue) return false;
    if (!['QA', 'ENDED'].includes(localTimerPhase)) return false;
    return Boolean(presentationScoringStatus?.canAdvanceQueue);
  }, [
    isCalibration,
    hasPresentationQueue,
    localTimerPhase,
    presentationScoringStatus,
  ]);

  const handleScoreChange = useCallback((criteriaId, value) => {
    setScoreState((prev) => ({
      ...prev,
      scores: { ...prev.scores, [criteriaId]: value },
    }));
  }, []);

  const handleSetComment = useCallback((val) => {
    setScoreState((prev) => ({ ...prev, comment: val }));
  }, []);

  const calculateTotal = useCallback(() => {
    return criteria
      .reduce((sum, c) => sum + (currentScores[c.id] || 0) * (c.weight || 0), 0)
      .toFixed(2);
  }, [criteria, currentScores]);

  const submitScore = useCallback(
    async (isAutoSubmit = false) => {
      if (hasScoredCurrentTeam || scoringLocked) return;
      if (!canSubmitFinalScore && !isAutoSubmit) return;

      if (!isAutoSubmit && criteria.some((c) => currentScores[c.id] === undefined)) {
        return message.warning('Vui lòng chấm đủ tiêu chí.');
      }

      setIsSubmitting(true);
      try {
        for (const c of criteria) {
          if (isCalibration) {
            await judgeService.submitCalibrationScore({
              submissionId: scoringTargetId,
              criterionId: c.id,
              scoreValue: currentScores[c.id] || 0,
              calibrationSessionId,
              comment: comment.trim(),
            });
          } else {
            await judgeService.submitScore({
              submissionId: scoringTargetId,
              criterionId: c.id,
              scoreValue: currentScores[c.id] || 0,
              comment: comment.trim(),
              scoreType: 'NORMAL',
            });
          }
        }

        if (!isCalibration) {
          await judgeService.confirmSubmissionScoring(scoringTargetId);
        }

        const finalTotal = calculateTotal();

        setRawMyScores((prev) => {
          const filtered = prev.filter(
            (p) => String(p.submissionId ?? p.submission_id) !== String(scoringTargetId)
          );
          return [
            ...filtered,
            ...criteria.map((c) => ({
              submissionId: scoringTargetId,
              criterionId: c.id,
              scoreValue: currentScores[c.id] || 0,
              comment: comment.trim(),
            })),
          ];
        });
        setMyScoredSubmissions((prev) => ({ ...prev, [String(scoringTargetId)]: finalTotal }));

        if (!isCalibration && isFinal) {
          setPresentationScoringStatus((prev) => ({
            ...prev,
            submissionId: scoringTargetId,
            myConfirmed: true,
            myScored: true,
          }));
          refreshPresentationStatus();
        }

        message.success(
          isCalibration
            ? 'Chấm calibration thành công!'
            : isAutoSubmit
              ? 'Đã hết giờ Q&A! Hệ thống tự động nộp bài.'
              : isFinal
                ? 'Chốt điểm thành công! Vui lòng chờ điều phối timer chuyển đội tiếp theo.'
                : 'Chốt điểm thành công! Form đã được khóa.'
        );

        localStorage.setItem(
          `seal_draft_${assignmentId}_${scoringTargetId}`,
          JSON.stringify({
            scores: currentScores,
            comment: comment.trim(),
          })
        );

        if (!isCalibration) {
          setTimeout(async () => {
            await fetchStaticData();
            await fetchQueue(true);
            await refreshPresentationStatus();
          }, 2000);
        }
      } catch (error) {
        const code = getErrorCode(error);
        if (code === 'SCORING_LOCKED') {
          setScoringLocked(true);
          message.error(PRELIMINARY_SUBMISSION_ERROR_MESSAGES.SCORING_LOCKED);
        } else if (code === 'SCORING_NOT_OPEN') {
          message.error(PRELIMINARY_SUBMISSION_ERROR_MESSAGES.SCORING_NOT_OPEN);
        } else if (code === 'JUDGE_NOT_ASSIGNED' || code === 'JUDGE_NOT_ASSIGNED_TO_TRACK') {
          message.error(
            PRELIMINARY_SUBMISSION_ERROR_MESSAGES[code] ||
              'Bạn chưa được phân công chấm vòng / bảng đấu này.',
          );
        } else {
          message.error(
            resolvePreliminarySubmissionError(error, 'Lỗi lưu điểm.').message,
          );
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      hasScoredCurrentTeam,
      scoringLocked,
      canSubmitFinalScore,
      criteria,
      currentScores,
      scoringTargetId,
      comment,
      calculateTotal,
      fetchStaticData,
      fetchQueue,
      refreshPresentationStatus,
      assignmentId,
      isCalibration,
      calibrationSessionId,
      isFinal,
    ]
  );

  useEffect(() => {
    if (isCalibration || !hasPresentationQueue) return;
    if (localTimerPhase === 'QA' && localRemainingSeconds === 0 && presentingSlot && !hasScoredCurrentTeam) {
      if (!isActionPendingRef.current && !isSubmitting) {
        isActionPendingRef.current = true;
        submitScore(true).finally(() => {
          isActionPendingRef.current = false;
        });
      }
    }
  }, [
    localTimerPhase,
    localRemainingSeconds,
    presentingSlot,
    hasScoredCurrentTeam,
    isSubmitting,
    submitScore,
    isLivePresentation,
    hasPresentationQueue,
    isCalibration,
  ]);

  const handleTimerAction = useCallback(
    async (actionType) => {
      if (isCalibration || !isController || !presentingSlot) return;

      isActionPendingRef.current = true;
      setIsTimerActionLoading(true);

      const previousEngineState = { ...timerEngineRef.current };

      let currentTick = previousEngineState.baseSeconds;
      if (previousEngineState.phase === 'PRESENTING' || previousEngineState.phase === 'QA') {
        const elapsed = Math.floor((Date.now() - previousEngineState.startTimeMs) / 1000);
        currentTick = Math.max(0, previousEngineState.baseSeconds - elapsed);
      }

      const timerTrackId = isFinal ? null : trackId;

      try {
        if (actionType === 'START_OR_RESUME') {
          const isResume = previousEngineState.phase === 'PAUSED';
          const targetPhase = isResume ? previousEngineState.originalPhase : 'PRESENTING';

          if (!isResume) {
            currentTick = resolvePresentationSeconds(
              presentingSlot?.timer,
              localRemainingSeconds,
            );
          }

          applyEngineState(targetPhase, currentTick);

          if (isResume) await presentationService.resumeTimer(roundId, timerTrackId);
          else await presentationService.startTimer(roundId, timerTrackId);
          
        } else if (actionType === 'PAUSE') {
          applyEngineState('PAUSED', currentTick);
          await presentationService.pauseTimer(roundId, timerTrackId);
          
        } else if (actionType === 'QA') {
          const qaSecs =
            (getTimerQaMinutes(presentingSlot?.timer) ?? 5) * 60;
          applyEngineState('QA', qaSecs);
          await presentationService.qaTimer(roundId, timerTrackId);
          
        } else if (actionType === 'END') {
          timerEngineRef.current.isEndedEarly = true;
          applyEngineState('ENDED', 0);
          await presentationService.endTimer(roundId, timerTrackId);
        } else if (actionType === 'NEXT') {
          await presentationService.advanceNext(roundId, timerTrackId, {
            currentSubmissionId: presentingSlot.submissionId,
          });
          await refreshPresentationStatus();
          await fetchStaticData();
          
        } else if (actionType === 'RESET') {
          applyEngineState('IDLE', resolvePresentationSeconds(presentingSlot?.timer, 0));
          await presentationService.resetTimer(roundId, timerTrackId);
        }
      } catch (error) {
        applyEngineState(previousEngineState.phase, previousEngineState.baseSeconds);
        message.error(
          resolveUserError(error, {
            domainMap: PRELIMINARY_SUBMISSION_ERROR_MESSAGES,
            fallback: 'Lỗi điều khiển đồng hồ.',
          }),
        );
      } finally {
        setIsTimerActionLoading(false);
        setTimeout(() => {
          isActionPendingRef.current = false;
          fetchQueue(true);
        }, 1000);
      }
    },
    [isCalibration, isController, presentingSlot, roundId, trackId, isFinal, fetchQueue, fetchStaticData, refreshPresentationStatus, applyEngineState, localRemainingSeconds]
  );

  return {
    isLoading,
    criteria,
    currentScores,
    comment,
    setComment: handleSetComment,
    handleScoreChange,
    calculateTotal,
    submitScore,
    isSubmitting,
    trackQueue: sidebarQueue,
    activeSlot: scoringTarget,
    presentingSlot,
    scoringTarget,
    isLivePresentation,
    hasPresentationQueue,
    selectedSubmissionId: scoringTargetId,
    localTimerPhase,
    localRemainingSeconds,
    canScore,
    canSubmitFinalScore,
    isController,
    handleTimerAction,
    isTimerActionLoading,
    myScoredSubmissions,
    hasScoredCurrentTeam,
    canAdvanceToNext,
    presentationScoringStatus,
    isAllDone,
    scoringLocked,
    isFinal,
    isCalibration,
  };
};