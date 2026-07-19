# Kết quả sơ loại → Đóng giải — FE backlog (cập nhật sau Gap Closure)

> Tham chiếu: [fe-checklist-gd2-gd4-gd5-gd6.md](../../BE/docs/testing/fe-checklist-gd2-gd4-gd5-gd6.md)  
> Cập nhật: 2026-06-30

---

## Kết quả sơ loại — Publish / Advance / Tiebreak

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| Ranking / wildcard / publish / advance API | ✅ | `roundResults.service.js` |
| Tiebreak gate trong `canAdvance` | ✅ | `useRoundResults.js` |
| `progressionErrors.js` | ✅ | Publish/advance/wildcard/tiebreak |
| `PreliminaryResultsCoordinatorStepper` | ✅ | `PreliminaryResultsPage` |
| Publish confirm modal | ✅ | |
| Breadcrumbs + post-advance CTA | ✅ | |
| E2E read-only tiebreak | ✅ | `e2e/preliminary-results-progression.spec.js` |
| E2E mutating publish/advance | ⚠️ | `E2E_MUTATING=1` + `hackathon-progression-mutating.spec.js` |

**Seeds BE:** `seal-gd4-advance-ready`, `seal-gd4-tiebreak-gate`

---

## Chung kết

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| FinalRoundConfig + readiness | ✅ | |
| `FinalRoundCoordinatorStepper` | ✅ | Final config + RoundManagement |
| ~~Calibration CK~~ | ❌ GỠ FE | UI Calibration đã purge — BE `rbl_calibration_*` C.b vẫn tồn tại |
| Student final submit | ✅ | `useFinalSubmission` + progression errors |
| Post-lock → đóng giải handoff | ✅ | `RoundManagementPage` modal |
| E2E smoke | ✅ | `e2e/final-round-smoke.spec.js` |

**Seeds BE:** `seal-gd5-final-active`, `seal-gd5-submit-open`

---

## Đóng giải — Confirm & export

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| HackathonResults cockpit | ✅ | BXH, prizes, confirm, export |
| `HackathonClosureStepper` + AWARDS readiness | ✅ | |
| Prizes fetch resilience (ONGOING) | ✅ | Không 422 vỡ trang |
| Award modal duplicate guard | ✅ | |
| Student chapter BXH (FINISHED) | ✅ | `StudentHackathonResultsPage` |
| E2E closure smoke | ✅ | `e2e/hackathon-closure-smoke.spec.js` |

**Seeds BE:** `seal-gd6-pending-confirm`, `seal-gd6-prizes-empty`, `seal-gd6-finished-export`

---

## E2E tiers

| Lệnh | Phạm vi |
|------|---------|
| `npm run test:e2e` | Read-only smoke (mặc định CI) |
| `E2E_MUTATING=1 npm run test:e2e:mutating` | Publish/advance API — **restart BE sau run** |

Windows PowerShell:

```powershell
$env:E2E_MUTATING='1'; npm run test:e2e:mutating
```

---

## Out of scope

- Team journey timeline UI
- Export `ANONYMIZED_RBL` / `FULL_REPORT` trên FE
- RBL analytics đầy đủ
