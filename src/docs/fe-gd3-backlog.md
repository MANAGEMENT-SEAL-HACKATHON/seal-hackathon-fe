# GĐ3 — Phần chưa làm / chưa tích hợp FE

> Đối chiếu: `BE/docs/testing/fe-gd3-api-mapping.md`  
> Cập nhật: 2026-06-30 (sau GĐ3 FE Gap Closure)

File này ghi **những màn hình, API và luồng GĐ3 còn thiếu hoặc chờ BE** — phản ánh trạng thái code thực tế.

---

## 1. Coordinator — Vận hành vòng Sơ loại

| Mục | API BE | Trạng thái FE | Ghi chú |
|-----|--------|---------------|---------|
| Kích hoạt vòng SL | `PATCH /rounds/{id}/activate` | ✅ | `RoundManagementPage` |
| Phát đề bài | `PATCH /rounds/{id}/release-problem` | ✅ | `RoundManagementPage` |
| Tiến độ chấm | `GET /rounds/{id}/scoring-progress` | ✅ | `ScoringProgressCard` |
| Khóa chấm | `PATCH /rounds/{id}/lock-scoring` | ✅ | `RoundManagementPage` |
| Coordinator stepper | — | ✅ | `PreliminaryRoundCoordinatorStepper` (RoundManagement + PresentationQueue) |
| Badge nộp trễ | `GET /submissions?status=LATE_PENDING` | ✅ | `MainLayout` nav badge |
| Xem ranking preview | `GET /rounds/{id}/ranking` | ⚠️ Một phần | Chuyển sang GĐ4 publish/advance |

---

## 2. Student — Đề bài & nộp bài

| Mục | API BE | Trạng thái FE | Ghi chú |
|-----|--------|---------------|---------|
| Status-driven UI | `GET /me/submission` | ✅ | `StudentSubmissionPage` — NONE/INCOMPLETE/LATE_PENDING/REJECTED/ON_TIME |
| `late_reason` khi quá hạn | `POST /submissions` | ✅ | TextArea bắt buộc |
| Tab Đề bài + PDF | `GET /me/rounds/{id}/problem` | ✅ | `getRoundProblem` + `downloadRoundProblemStatement` |
| Checklist 5 bước | — | ✅ | Ant `Steps` trên submission page |
| Leaderboard GĐ3 | `GET /me/rounds/{id}/leaderboard` | ❌ BE stub `[]` | Chờ BE |

---

## 3. Judge — Chấm điểm Sơ loại

| Mục | API BE | Trạng thái FE | Ghi chú |
|-----|--------|---------------|---------|
| Track assignments | `GET /me/judge-track-assignments` | ✅ | `JudgeDashboard` |
| Live scoring E2E | `POST /scores` | ✅ | `useLiveScoringV2` + `judgeService.submitScore` |
| SCORING_INCOMPLETE acknowledge | `PATCH queue/next` | ✅ | `Modal.confirm` + `acknowledgeIncompleteScoring` |
| ~~Calibration prelim + final~~ | ~~calibration-sessions~~ | ❌ GỠ FE | UI Calibration đã purge (R4 / Analytics+Judge) — BE `rbl_calibration_*` C.b vẫn tồn tại |

---

## 4. Calibration

| API | Role | Trạng thái FE |
|-----|------|---------------|
| ~~`GET /calibration-sessions`~~ | — | ❌ GỠ FE — C.a archived; BE RBL `rbl_calibration_*` C.b vẫn tồn tại |
| ~~Judge / Coord Calibration UI~~ | — | ❌ GỠ FE — không còn Hiệu chỉnh giám khảo / Phiên đồng thuận mẫu |

---

## 5. Mentor

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| Assigned teams + lịch | ✅ | `MentorSupportPage` |
| Round picker (>1 vòng) | ✅ | `Select` |
| Xem bài nộp / điểm | ✅ | Drawer `getMentorTeamSubmissions` / `getMentorTeamScores` |
| Loading skeleton | ✅ | Tránh empty flash |
| Stats giả (94.2%) | ✅ Đã xóa | Placeholder "Chưa có thống kê" |
| Derive từ track assignment khi assigned-teams trống | ⚠️ | Phụ thuộc BE populate |

---

## 6. Presentation queue

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| `roundId` từ URL | ✅ | Query param + `resolveActiveRoundId` fallback |
| WebSocket STOMP | ✅ | `usePresentationQueueSocket` — topic `/topic/rounds/{id}/presentation-queue` |
| Polling fallback | ✅ | 8s khi socket disconnect |
| `display_code`, `slot_start_at`, ELIMINATED | ✅ | Queue rows |
| `room_stats` | ✅ | Tag trên queue card |
| Empty state sau shuffle | ✅ | |

---

## 7. Error handling chuẩn GĐ3

| Code BE | Trạng thái |
|---------|------------|
| `INVALID_SLIDE_FORMAT`, `REPO_NOT_PUBLIC`, … | ✅ `preliminarySubmissionErrors.js` + `resolvePreliminarySubmissionError` |
| Submit / review / judge score | ✅ Wired trong catch paths |

---

## 8. Ma trận nhanh — Đã hoàn thành (2026-06-30)

| Hạng mục | Trạng thái |
|----------|------------|
| `personB.api` blockReason, problemReleased, mentor wrappers | ✅ |
| Student status views + problem tab | ✅ |
| Judge E2E + acknowledge modal | ✅ |
| Coordinator stepper + late review polish | ✅ |
| Calibration GĐ3 prelim | ❌ GỠ FE |
| WebSocket queue | ✅ |
| Mentor polish | ✅ |
| E2E smoke `preliminary-student-submit.spec.js` | ✅ (skip khi BE offline) |

---

## 9. Còn lại / chờ BE

1. **Leaderboard GĐ3** — BE stub
2. **Mentor stats** — BE chưa có API
3. **Ranking preview coordinator** — luồng GĐ4
4. **Repo validation async flag** — chỉ static hint sau submit (optional poll nếu BE thêm field)

---

*Tài liệu tham chiếu BE: `fe-gd3-api-mapping.md`, seed `seal-gd3-prelim-open`, `seal-gd3-scoring-live`.*
