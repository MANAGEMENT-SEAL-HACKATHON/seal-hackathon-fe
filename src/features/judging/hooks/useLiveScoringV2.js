// src/features/judging/hooks/useLiveScoringV2.js
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { message } from 'antd';
import { judgeService } from '../services/judgeService';
import { criteriaService } from '../../criteria/services/criteriaService';
import { presentationService } from '../services/presentationService';
import { roundService } from '../../rounds/services/roundService';

const getErrorCode = (error) =>
  error?.code || error?.response?.data?.error?.code || error?.response?.data?.code;

const getSubmissionId = (item) =>
  item?.submissionId ?? item?.submission_id ?? item?.id;

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
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

  const [scoreState, setScoreState] = useState({ submissionId: null, scores: {}, comment: '' });

  const [rawMyScores, setRawMyScores] = useState([]);
  const [myScoredSubmissions, setMyScoredSubmissions] = useState({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scoringLocked, setScoringLocked] = useState(false);
  const [isTimerActionLoading, setIsTimerActionLoading] = useState(false);

  const isActionPendingRef = useRef(false);

  const isController = useMemo(() => {
    const role = String(initialAssignmentType || '').toUpperCase();
    return role.includes('HEAD') || role.includes('FINAL_EXTERNAL');
  }, [initialAssignmentType]);

  const [localTimerPhase, setLocalTimerPhase] = useState('IDLE');
  const [localRemainingSeconds, setLocalRemainingSeconds] = useState(0);

  const timerEngineRef = useRef({
    phase: 'IDLE',
    originalPhase: 'PRESENTING',
    baseSeconds: 0,
    startTimeMs: 0,
    intervalId: null,
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

        const track = isFinal
          ? qData.groups?.[0]
          : qData.tracks?.find((t) => t.trackId === Number(trackId));
        const presenting = (track?.items || track?.teams || []).find(
          (item) => item.status === 'PRESENTING'
        );

        if (presenting?.timer) {
          const serverPhase = presenting.timer.phase;
          let serverSeconds = presenting.timer.remainingSeconds || 0;
          if (serverSeconds < 0) serverSeconds = 0;

          const currentEngine = timerEngineRef.current;

          if (currentEngine.phase !== serverPhase) {
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
    const interval = setInterval(() => fetchQueue(false), 1000);
    return () => clearInterval(interval);
  }, [fetchStaticData, fetchQueue, isCalibration]);

  useEffect(() => {
    return () => {
      if (timerEngineRef.current.intervalId) {
        clearInterval(timerEngineRef.current.intervalId);
      }
    };
  }, []);

  const { trackQueue, activeSlot, sidebarQueue } = useMemo(() => {
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

    const track = isFinal
      ? queueData?.groups?.[0]
      : queueData?.tracks?.find((t) => t.trackId === Number(trackId));
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

    if (isFinal) {
      const queueSubIds = new Set(queueItems.map((i) => String(getSubmissionId(i))));
      const extraFromSubs = submissionsData
        .filter((s) => {
          const id = getSubmissionId(s);
          if (!id || queueSubIds.has(String(id))) return false;
          const status = String(s.status || s.submissionStatus || 'SUBMITTED').toUpperCase();
          return status === 'SUBMITTED' || status === 'ON_TIME';
        })
        .map((s, idx) => ({
          submissionId: getSubmissionId(s),
          teamName: s.teamName || s.team_name || `Đội #${getSubmissionId(s)}`,
          status: 'SUBMITTED',
          order: queueItems.length + idx + 1,
          slideFile: s.slideFile,
          repoUrl: s.repoUrl,
          demoUrl: s.demoUrl || s.demo_url,
          outsideQueue: true,
        }));

      const merged = [...queueItems, ...extraFromSubs];
      return {
        trackQueue: merged,
        activeSlot: presenting,
        sidebarQueue: merged,
      };
    }

    return { trackQueue: queueItems, activeSlot: presenting, sidebarQueue: queueItems };
  }, [queueData, submissionsData, trackId, isFinal, isCalibration, sampleSubmissionId]);

  const scoringTarget = useMemo(() => {
    if (isCalibration && sampleSubmissionId) {
      return sidebarQueue[0] || { submissionId: Number(sampleSubmissionId) };
    }
    if (isFinal) {
      if (selectedSubmissionId) {
        const found = sidebarQueue.find(
          (i) => String(getSubmissionId(i)) === String(selectedSubmissionId)
        );
        if (found) return found;
      }
      if (activeSlot) return activeSlot;
      const firstUnscored = sidebarQueue.find(
        (i) => !myScoredSubmissions[String(getSubmissionId(i))]
      );
      return firstUnscored || sidebarQueue[0] || null;
    }
    return activeSlot;
  }, [
    isCalibration,
    sampleSubmissionId,
    isFinal,
    selectedSubmissionId,
    sidebarQueue,
    activeSlot,
    myScoredSubmissions,
  ]);

  const scoringTargetId = getSubmissionId(scoringTarget);

  const currentScores =
    scoreState.submissionId === scoringTargetId ? scoreState.scores : {};
  const comment = scoreState.submissionId === scoringTargetId ? scoreState.comment : '';

  const isAllDone =
    !isCalibration &&
    !isFinal &&
    trackQueue.length > 0 &&
    trackQueue.every((item) => item.status === 'DONE');

  const hasScoredCurrentTeam = useMemo(() => {
    if (!scoringTargetId) return false;
    return !!myScoredSubmissions[String(scoringTargetId)];
  }, [scoringTargetId, myScoredSubmissions]);

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

  const canScore = !scoringLocked && Boolean(scoringTarget);
  const canSubmitFinalScore = useMemo(() => {
    if (scoringLocked || !scoringTarget || hasScoredCurrentTeam) return false;
    if (isCalibration || isFinal) return true;
    return ['QA', 'ENDED'].includes(localTimerPhase);
  }, [
    scoringLocked,
    scoringTarget,
    hasScoredCurrentTeam,
    isCalibration,
    isFinal,
    localTimerPhase,
  ]);

  const handleSelectSubmission = useCallback((submissionId) => {
    setSelectedSubmissionId(submissionId);
  }, []);

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

        message.success(
          isCalibration
            ? 'Chấm calibration thành công!'
            : isAutoSubmit
              ? 'Đã hết giờ Q&A! Hệ thống tự động nộp bài.'
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
          }, 2000);
        }
      } catch (error) {
        const code = getErrorCode(error);
        if (code === 'SCORING_LOCKED') {
          setScoringLocked(true);
          message.error('Vòng đã khóa chấm điểm — không thể nộp điểm.');
        } else if (code === 'JUDGE_NOT_ASSIGNED') {
          message.error('Bạn không được phân công chấm vòng Chung kết này.');
        } else {
          message.error(
            error?.response?.data?.error?.message ||
              error?.response?.data?.message ||
              error.message ||
              'Lỗi lưu điểm.'
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
      assignmentId,
      isCalibration,
      calibrationSessionId,
    ]
  );

  useEffect(() => {
    if (isFinal || isCalibration) return;
    if (localTimerPhase === 'QA' && localRemainingSeconds === 0 && activeSlot && !hasScoredCurrentTeam) {
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
    activeSlot,
    hasScoredCurrentTeam,
    isSubmitting,
    submitScore,
    isFinal,
    isCalibration,
  ]);

  const handleTimerAction = useCallback(
    async (actionType) => {
      if (isCalibration || !isController || !activeSlot) return;

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
            currentTick = (activeSlot.timer?.presentationMinutes || 10) * 60;
          }

          applyEngineState(targetPhase, currentTick);

          if (isResume) await presentationService.resumeTimer(roundId, timerTrackId);
          else await presentationService.startTimer(roundId, timerTrackId);
        } else if (actionType === 'PAUSE') {
          applyEngineState('PAUSED', currentTick);
          await presentationService.pauseTimer(roundId, timerTrackId);
        } else if (actionType === 'QA') {
          const qaSecs = (activeSlot.timer?.qaMinutes || 5) * 60;
          applyEngineState('QA', qaSecs);
          await presentationService.qaTimer(roundId, timerTrackId);
        } else if (actionType === 'NEXT') {
          await presentationService.advanceNext(roundId, timerTrackId, {
            currentSubmissionId: activeSlot.submissionId,
          });
        }
      } catch (error) {
        applyEngineState(previousEngineState.phase, previousEngineState.baseSeconds);
        const beMsg =
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          error.message;
        message.error(beMsg || 'Lỗi điều khiển đồng hồ.');
      } finally {
        setIsTimerActionLoading(false);
        setTimeout(() => {
          isActionPendingRef.current = false;
          fetchQueue(true);
        }, 1000);
      }
    },
    [isCalibration, isController, activeSlot, roundId, trackId, isFinal, fetchQueue, applyEngineState]
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
    scoringTarget,
    selectedSubmissionId: selectedSubmissionId || scoringTargetId,
    onSelectSubmission: handleSelectSubmission,
    localTimerPhase,
    localRemainingSeconds,
    canScore,
    canSubmitFinalScore,
    isController,
    handleTimerAction,
    isTimerActionLoading,
    myScoredSubmissions,
    hasScoredCurrentTeam,
    isAllDone,
    scoringLocked,
    isFinal,
    isCalibration,
  };
};
