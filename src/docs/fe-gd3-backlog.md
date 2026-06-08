# GĐ3 — Phần chưa làm / chưa tích hợp FE

> Đối chiếu: `BE/docs/testing/fe-gd3-api-mapping.md`  
> Cập nhật: 2026-05-27

File này ghi **những màn hình, API và luồng GĐ3 chưa có hoặc còn mock** — không nằm trong phạm vi sửa lần này.

---

## 1. Coordinator — Vận hành vòng Sơ loại

| Mục | API BE | Trạng thái FE | Ghi chú |
|-----|--------|---------------|---------|
| Kích hoạt vòng SL (Gate 2) | `PATCH /api/v1/rounds/{prelimId}/activate` | ❌ Chưa có màn | Hiện activate nằm ở luồng GĐ2/Round management |
| Phát đề bài | `PATCH /api/v1/rounds/{prelimId}/release-problem` | ❌ Chưa có màn | Cần nút BTC sau activate |
| Tiến độ chấm | `GET /api/v1/rounds/{prelimId}/scoring-progress` | ❌ Chưa có màn | Dashboard BTC theo track/judge |
| Khóa chấm | `PATCH /api/v1/rounds/{prelimId}/lock-scoring` | ❌ Chưa có màn | Kết thúc GĐ3 nội bộ |
| Xem ranking preview | `GET /api/v1/rounds/{prelimId}/ranking` | ❌ Chưa có màn | Chuyển sang GĐ4 publish/advance |

**Đề xuất:** Tạo `Gd3CoordinatorOpsPage` hoặc mở rộng `RoundManagementPage` với các action trên khi round = prelim ACTIVE.

---

## 2. Student — Đề bài & leaderboard

| Mục | API BE | Trạng thái FE | Ghi chú |
|-----|--------|---------------|---------|
| Xem đề bài | `GET /api/v1/me/rounds/{roundId}/problem` | ❌ Chưa có màn | `personBApi.getRoundProblem()` đã có, chưa gắn UI |
| Leaderboard GĐ3 | `GET /api/v1/me/rounds/{id}/leaderboard` | ❌ BE stub `[]` | Chờ BE hoàn thiện |

**Đề xuất:** Thêm tab "Đề bài" trong `StudentSubmissionPage` hoặc trang workspace riêng.

---

## 3. Judge — Chấm điểm Sơ loại

| Mục | API BE | Trạng thái FE | Ghi chú |
|-----|--------|---------------|---------|
| Danh sách track được gán | `GET /api/v1/me/judge-track-assignments` | ❌ Chưa gọi | Cần thay mock dashboard |
| Danh sách đội cần chấm | Theo submission/track | ❌ Mock cứng | `useLiveScoring.js` dùng data giả |
| Nộp điểm | `POST /api/v1/scores` | ❌ Commented out | Payload: `submissionId`, `criterionId`, `scoreValue`, `comment`, `scoreType` |
| Lấy tiêu chí | `GET /api/v1/tracks/{trackId}/criteria` | ⚠️ Một phần | `judgeService.getScoringCriteria` — cần gắn `trackId` từ assignment |

**File liên quan:** `src/features/judging/hooks/useLiveScoring.js`, `src/features/judging/services/judgeService.js`, `LiveScoringPage.jsx`

---

## 4. Calibration (tùy chọn)

| API | Role | Trạng thái FE |
|-----|------|---------------|
| `GET /calibration-sessions?roundId=` | COORD | ❌ |
| `POST /calibration-sessions` | COORD | ❌ |
| `PATCH /calibration-sessions/{id}` | COORD | ❌ |
| `POST /scores/calibration` | JUDGE/MENTOR | ❌ |

PersonB không yêu cầu — chỉ làm khi có thiết kế UI phiên hiệu chuẩn.

---

## 5. Mentor — Fallback & thống kê

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| Fallback đội theo track (§7.1) | ⚠️ Một phần | `getAssignedTeams` fallback qua `getMentorRounds().teams` khi `assigned-teams` trống |
| Derive từ `mentor-track-assignments` + `team_round_tracks` | ❌ Thiếu API mentor | Cần BE expose hoặc BE populate `assigned-teams` từ track assignment |
| Mentor stats (Efficiency, Avg Response) | ❌ BE chưa có | Ẩn UI hoặc giữ mock |
| `GET /me/mentor/teams/{teamId}/presentation-slot` | ⚠️ Không dùng nữa | Lịch lấy từ `assigned-teams.presentationSchedule` |

---

## 6. Presentation queue — Cải tiến tiếp theo

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| `roundId` từ URL / coordinator context | ⚠️ Một phần | Hiện lấy từ `GET /me/rounds/current/deadline` |
| Polling / refetch sau `PATCH queue/next` | ❌ | Fire-and-forget — nên refetch queue sau mutate |
| Coordinator chọn round khi nhiều vòng | ❌ | Cần selector khi hackathon có nhiều round active |

---

## 7. Error handling chuẩn GĐ3

| Code BE | UI hiện tại | Cần làm |
|---------|-------------|---------|
| `INVALID_SLIDE_FORMAT` | Hint text trên form slide | Map `error.code` → toast tiếng Việt |
| `INVALID_REPO_PLATFORM` | Chưa map | Thêm message khi repo không phải GitHub/GitLab |
| `JUDGE_NOT_ASSIGNED_TO_TRACK` | — | Khi tích hợp judge scoring |
| `SUBMISSION_NOT_LATE_PENDING` | Toast chung | Late review page |
| `TEAM_NOT_LOCKED` | — | Student submit khi chưa lottery |

**Đề xuất:** Tạo `src/features/auth/constants/gd3Errors.js` (tương tự `oauthErrors.js`).

---

## 8. Ma trận nhanh — Đã sửa vs Chưa làm

| Màn / API | Đã sửa (2026-05-27) |
|-----------|---------------------|
| `personB.api.ts` paths `/api/v1/...` | ✅ |
| Student submit `teamId` + `trackId` | ✅ |
| Không gửi `lateReason` | ✅ |
| Mentor `assigned-teams` + lịch inline | ✅ |
| Late list `GET /submissions?status=LATE_PENDING` | ✅ |
| Queue map camelCase + `roundId` + `currentTeamId` | ✅ |
| Coordinator activate/release/lock/ranking | ❌ Backlog §1 |
| Student problem view | ❌ Backlog §2 |
| Judge `POST /scores` | ❌ Backlog §3 |
| Calibration | ❌ Backlog §4 |

---

## 9. Thứ tự ưu tiên đề xuất

1. **Judge scoring** — `POST /scores` + `judge-track-assignments` (chặn GĐ3 E2E)
2. **Coordinator lock + ranking** — kết thúc vòng SL
3. **Student problem** — trải nghiệm sau `release-problem`
4. **Queue refetch + round selector** — vận hành thực tế
5. **Mentor track fallback đầy đủ** — phối hợp BE

---

*Tài liệu tham chiếu BE: `fe-gd3-api-mapping.md` §5–§12, §16–§17.*
