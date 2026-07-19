/**
 * Module 4 � Permission / IDOR s�u ?a role (mutating b?n + STOMP deny).
 *
 * Run:
 *   E2E_MUTATING=1 npx playwright test e2e/permission-idor-mutating.spec.js --project=mutating-e2e --workers=1
 *
 * Anti-pollution: Coord dirty ch? teams-edge / late-review � c?m lock/timer scoring-live.
 * Restart BE sau suite.
 */
import { test, expect } from '@playwright/test';
import { isBackendReady } from './helpers/api.js';
import { isMutatingEnabled } from './helpers/progressionApiHelpers.js';
import {
  loginRole,
  apiRaw,
  apiMultipartRaw,
  assertDenied,
  assertAllowed,
  resolveForeignTargets,
  resolveScorableSlot,
  expectStompSubscribeDenied,
  presentationQueueTopic,
  ROLES,
} from './helpers/permissionIdorHelpers.js';

const GITHUB_REPO = 'https://github.com/octocat/Hello-World';

test.describe('Permission / IDOR multi-role (Module 4)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  /** @type {Awaited<ReturnType<typeof resolveForeignTargets>>} */
  let targets;
  let studentToken;
  let judgeToken;
  let guestToken;
  let coordToken;

  test.beforeAll(async () => {
    test.skip(!isMutatingEnabled(), 'E2E_MUTATING=1 required');
    const ready = await isBackendReady();
    test.skip(!ready, 'BE not reachable');

    coordToken = await loginRole('coord');
    studentToken = await loginRole('student');
    judgeToken = await loginRole('judge');
    guestToken = await loginRole('guest');
    targets = await resolveForeignTargets(coordToken);
  });

  test('1) Student POST submit foreign round/team ? CROSS_HACKATHON / FORBIDDEN', async () => {
    expect(targets.prelimOpen?.prelim?.id, 'seal-gd3-prelim-open').toBeTruthy();

    // Home team on seal-e2e-2026
    const home = await apiRaw('GET', '/me/teams', { token: studentToken });
    const teams = Array.isArray(home.data) ? home.data : home.data?.items || home.data?.teams || [];
    const team = teams[0];
    const teamId = team?.id ?? team?.teamId;
    test.skip(!teamId, 'student has no home team');

    // Include foreign trackId so BE passes track-required gate and hits cross-H check
    const tracks = await apiRaw(
      'GET',
      `/hackathons/${targets.prelimOpen.hackathon.id}/tracks`,
      { token: coordToken },
    );
    const trackList = Array.isArray(tracks.data) ? tracks.data : tracks.data?.items || [];
    const trackId = trackList[0]?.id;
    expect(trackId, 'foreign track').toBeTruthy();

    const { status, code, json } = await apiMultipartRaw('/submissions', {
      token: studentToken,
      fields: {
        teamId,
        roundId: targets.prelimOpen.prelim.id,
        trackId,
        repoUrl: GITHUB_REPO,
      },
    });
    assertDenied(
      { status, code, json },
      {
        codes: [
          'CROSS_HACKATHON_VIOLATION',
          'FORBIDDEN',
          'NOT_TEAM_MEMBER',
          'TEAM_NOT_IN_ROUND',
          'TEAM_NOT_REGISTERED',
        ],
        label: 'student cross-H submit',
      },
    );
  });

  test('2) Student POST /scores ? 403', async () => {
    // Prefer dedicated scoring-live seed; fall back to prelim-open if that slug was removed.
    const live = targets.scoringLive || targets.prelimOpen;
    test.skip(!live?.prelim?.id, 'no scoring-live / prelim-open seed for score IDOR');
    const tracks = await apiRaw(
      'GET',
      `/hackathons/${live.hackathon.id}/tracks`,
      { token: coordToken },
    );
    const trackList = Array.isArray(tracks.data) ? tracks.data : tracks.data?.items || [];
    const track = trackList[0];
    expect(track?.id).toBeTruthy();
    const slot = await resolveScorableSlot(coordToken, live.prelim.id, track.id);
    test.skip(!slot?.submissionId || !slot?.criterionId, 'no scorable slot');

    const { status, code, json } = await apiRaw('POST', '/scores', {
      token: studentToken,
      body: {
        submissionId: slot.submissionId,
        criterionId: slot.criterionId,
        scoreValue: 5,
        scoreType: 'NORMAL',
      },
    });
    assertDenied(
      { status, code, json },
      { codes: ['FORBIDDEN', 'ACCESS_DENIED'], label: 'student score' },
    );
  });

  test('3) Student PATCH team approve / lock-scoring ? 403', async () => {
    expect(targets.teamsEdge?.hackathon?.id, 'teams-edge').toBeTruthy();
    const teams = await apiRaw(
      'GET',
      `/teams?hackathonId=${targets.teamsEdge.hackathon.id}`,
      { token: coordToken },
    );
    const list = Array.isArray(teams.data) ? teams.data : teams.data?.items || [];
    const pending = list.find((t) => String(t.status || '').toUpperCase() === 'PENDING') || list[0];
    expect(pending?.id).toBeTruthy();

    const approve = await apiRaw('PATCH', `/teams/${pending.id}/approve`, {
      token: studentToken,
      body: {},
    });
    assertDenied(
      approve,
      { codes: ['FORBIDDEN', 'ACCESS_DENIED'], label: 'student team approve' },
    );

    expect(targets.scoringLive?.prelim?.id).toBeTruthy();
    const lock = await apiRaw(
      'PATCH',
      `/rounds/${targets.scoringLive.prelim.id}/lock-scoring`,
      { token: studentToken, body: { force: true, reason: 'idor' } },
    );
    assertDenied(
      lock,
      { codes: ['FORBIDDEN', 'ACCESS_DENIED'], label: 'student lock-scoring' },
    );
  });

  test('4) Student POST timer/start foreign ? 403/FORBIDDEN', async () => {
    expect(targets.scoringLive?.prelim?.id).toBeTruthy();
    const tracks = await apiRaw(
      'GET',
      `/hackathons/${targets.scoringLive.hackathon.id}/tracks`,
      { token: coordToken },
    );
    const trackList = Array.isArray(tracks.data) ? tracks.data : tracks.data?.items || [];
    const track = trackList[0];
    const q = new URLSearchParams({ roundId: String(targets.scoringLive.prelim.id) });
    if (track?.id != null) q.set('trackId', String(track.id));
    const { status, code, json } = await apiRaw(
      'POST',
      `/presentation/timer/start?${q}`,
      { token: studentToken },
    );
    assertDenied(
      { status, code, json },
      {
        codes: [
          'FORBIDDEN',
          'ACCESS_DENIED',
          'NOT_TRACK_CONTROLLER',
          'NOT_ROUND_CONTROLLER',
          'SCORING_NOT_OPEN',
          'ROUND_NOT_ACTIVE',
          'INVALID_STATE',
        ],
        label: 'student timer start',
      },
    );
  });

  test('5) Judge1 POST /scores on unassigned H (gd5-judge-edge) ? FORBIDDEN / JUDGE_NOT_ASSIGNED*', async () => {
    const edge = targets.judgeEdge || targets.scoringGate || targets.prelimOpen;
    test.skip(!edge?.final?.id && !edge?.prelim?.id, 'no judge-edge / fallback seed');
    const roundId = edge.final?.id || edge.prelim.id;

    let slot = await resolveScorableSlot(coordToken, roundId);
    let submissionId = slot?.submissionId;
    let criterionId = slot?.criterionId;

    if (!submissionId) {
      const byRound = await apiRaw(
        'GET',
        `/submissions?roundId=${roundId}&size=50`,
        { token: coordToken },
      ).catch(() => ({ data: [] }));
      const rows = Array.isArray(byRound.data) ? byRound.data : byRound.data?.items || [];
      submissionId = rows[0]?.id ?? rows[0]?.submissionId;
    }

    // Final criteria live on round, not track
    if (!criterionId) {
      const crit = await apiRaw('GET', `/rounds/${roundId}/criteria`, { token: coordToken });
      const list = Array.isArray(crit.data) ? crit.data : crit.data?.items || [];
      criterionId = list.find(
        (c) => String(c.type || c.criteriaType || '').toUpperCase() !== 'PENALTY',
      )?.id ?? list[0]?.id;
    }

    if (!criterionId) {
      const tracks = await apiRaw(
        'GET',
        `/hackathons/${edge.hackathon.id}/tracks`,
        { token: coordToken },
      );
      const trackList = Array.isArray(tracks.data) ? tracks.data : tracks.data?.items || [];
      for (const t of trackList) {
        const crit = await apiRaw('GET', `/tracks/${t.id}/criteria`, { token: coordToken });
        const list = Array.isArray(crit.data) ? crit.data : crit.data?.items || [];
        if (list[0]?.id) {
          criterionId = list[0].id;
          break;
        }
      }
    }

    test.skip(!submissionId || !criterionId, 'no submission/criterion on judge-edge');

    const { status, code, json } = await apiRaw('POST', '/scores', {
      token: judgeToken,
      body: {
        submissionId,
        criterionId,
        scoreValue: 6,
        scoreType: 'NORMAL',
      },
    });
    assertDenied(
      { status, code, json },
      {
        codes: [
          'FORBIDDEN',
          'JUDGE_NOT_ASSIGNED',
          'JUDGE_NOT_ASSIGNED_TO_TRACK',
          'SCORING_NOT_OPEN',
        ],
        label: 'judge unassigned score',
      },
    );
  });

  test('6) Guest POST /scores on gd3 scoring-live ? FORBIDDEN / JUDGE_NOT_ASSIGNED*', async () => {
    const live = targets.scoringLive || targets.prelimOpen;
    test.skip(!live?.prelim?.id, 'no scoring-live / prelim-open seed');
    const tracks = await apiRaw(
      'GET',
      `/hackathons/${live.hackathon.id}/tracks`,
      { token: coordToken },
    );
    const trackList = Array.isArray(tracks.data) ? tracks.data : tracks.data?.items || [];
    const track = trackList[0];
    const slot = await resolveScorableSlot(coordToken, live.prelim.id, track?.id);
    test.skip(!slot?.submissionId || !slot?.criterionId, 'no scorable slot');

    const { status, code, json } = await apiRaw('POST', '/scores', {
      token: guestToken,
      body: {
        submissionId: slot.submissionId,
        criterionId: slot.criterionId,
        scoreValue: 5,
        scoreType: 'NORMAL',
      },
    });
    assertDenied(
      { status, code, json },
      {
        codes: ['FORBIDDEN', 'JUDGE_NOT_ASSIGNED', 'JUDGE_NOT_ASSIGNED_TO_TRACK'],
        label: 'guest score gd3',
      },
    );
  });

  test('7) Coord GET queue + journey on foreign ? 2xx (no dirty)', async () => {
    const live = targets.scoringLive || targets.prelimOpen;
    test.skip(!live?.prelim?.id, 'no live/prelim seed');
    const queue = await apiRaw(
      'GET',
      `/presentation/queue?roundId=${live.prelim.id}`,
      { token: coordToken },
    );
    assertAllowed(queue, 'coord queue');

    test.skip(!targets.prelimOpen?.hackathon?.id, 'no prelim-open hackathon');
    const teams = await apiRaw(
      'GET',
      `/teams?hackathonId=${targets.prelimOpen.hackathon.id}`,
      { token: coordToken },
    );
    const list = Array.isArray(teams.data) ? teams.data : teams.data?.items || [];
    expect(list[0]?.id).toBeTruthy();
    const journey = await apiRaw('GET', `/teams/${list[0].id}/journey`, {
      token: coordToken,
    });
    assertAllowed(journey, 'coord journey');
  });

  test('8) Coord dirty ch? teams-edge approve + late-review (c?m scoring-live lock/timer)', async () => {
    // --- teams-edge formation-ready PENDING approve ---
    expect(targets.teamsEdge?.hackathon?.id).toBeTruthy();
    const teams = await apiRaw(
      'GET',
      `/teams?hackathonId=${targets.teamsEdge.hackathon.id}&size=100`,
      { token: coordToken },
    );
    const list = Array.isArray(teams.data) ? teams.data : teams.data?.items || [];
    const pending =
      list.find(
        (t) =>
          String(t.status).toUpperCase() === 'PENDING' &&
          (t.formationSubmittedAt ||
            t.formation_submitted_at ||
            /T03|S?n duy?t|formation/i.test(String(t.teamName || t.name || ''))),
      ) || list.find((t) => String(t.status).toUpperCase() === 'PENDING' && t.formationSubmittedAt);

    if (pending?.id) {
      const approve = await apiRaw('PATCH', `/teams/${pending.id}/approve`, {
        token: coordToken,
        body: {},
      });
      if (approve.status >= 200 && approve.status < 300) {
        assertAllowed(approve, 'coord approve teams-edge');
      } else {
        assertDenied(approve, {
          codes: [
            'TEAM_ALREADY_ACTIVE',
            'INVALID_STATUS_TRANSITION',
            'TEAM_FORMATION_NOT_SUBMITTED',
            'FORBIDDEN',
          ],
          label: 'coord approve already done or gate',
        });
      }
    } else {
      test.info().annotations.push({
        type: 'note',
        description: 'No formation-ready PENDING on teams-edge � skip dirty approve',
      });
    }

    // --- late-review late approve ---
    expect(targets.lateReview?.prelim?.id || targets.lateReview?.hackathon?.id).toBeTruthy();
    const lateRes = await apiRaw(
      'GET',
      `/submissions?status=LATE_PENDING&roundId=${targets.lateReview.prelim?.id}&size=50`,
      { token: coordToken },
    ).catch(() => ({ data: [] }));
    let lateList = Array.isArray(lateRes.data) ? lateRes.data : lateRes.data?.items || [];
    if (!lateList.length && targets.lateReview.prelim?.id) {
      const alt = await apiRaw(
        'GET',
        `/submissions?roundId=${targets.lateReview.prelim.id}&size=100`,
        { token: coordToken },
      ).catch(() => ({ data: [] }));
      const all = Array.isArray(alt.data) ? alt.data : alt.data?.items || [];
      lateList = all.filter((s) => /LATE_PENDING/i.test(String(s.status || '')));
    }
    const lateId = (lateList[0]?.id || lateList[0]?.submissionId) ?? null;

    if (lateId) {
      const review = await apiRaw('PATCH', `/submissions/${lateId}/approve`, {
        token: coordToken,
        body: {},
      });
      if (review.status >= 200 && review.status < 300) {
        assertAllowed(review, 'coord late approve');
      } else {
        assertDenied(review, {
          codes: [
            'SUBMISSION_NOT_LATE_PENDING',
            'INVALID_STATE',
            'LATE_PENDING_NOT_ALLOWED',
            'FORBIDDEN',
          ],
          label: 'coord late already resolved',
        });
      }
    } else {
      test.info().annotations.push({
        type: 'note',
        description: 'No LATE_PENDING on late-review � skip dirty approve',
      });
    }
  });

  test('9) STOMP: student subscribe scoring-live queue ? ERROR ?5s', async () => {
    expect(targets.scoringLive?.prelim?.id).toBeTruthy();
    const dest = presentationQueueTopic(targets.scoringLive.prelim.id);
    await expectStompSubscribeDenied({
      token: studentToken,
      destination: dest,
      timeoutMs: 5_000,
    });
  });

  test('10) STOMP: guest subscribe scoring-live queue ? ERROR ?5s', async () => {
    expect(targets.scoringLive?.prelim?.id).toBeTruthy();
    const dest = presentationQueueTopic(targets.scoringLive.prelim.id);
    await expectStompSubscribeDenied({
      token: guestToken,
      destination: dest,
      timeoutMs: 5_000,
    });
  });

  test('11) STOMP: unassigned judge subscribe judge-edge ? ERROR ?5s', async () => {
    const roundId = targets.judgeEdge?.final?.id || targets.judgeEdge?.prelim?.id;
    test.skip(!roundId, 'judge-edge missing');
    const dest = presentationQueueTopic(roundId);
    await expectStompSubscribeDenied({
      token: judgeToken,
      destination: dest,
      timeoutMs: 5_000,
    });
  });
});

// Silence unused if tree-shaken � keep role emails visible for debugging
void ROLES;
