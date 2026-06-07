# BE API Requirements
> Tài liệu này do Frontend tự động tổng hợp.  
> Người nhận: Backend Team  
> Ngày tạo: 2026-06-07  
> Phạm vi: Giai đoạn 3 — Vòng Sơ loại

---

## 1. Mentor Support

### 1.1 Lấy danh sách vòng thi của Mentor
- **Method**: GET
- **URL**: `/api/mentor/rounds`
- **Auth**: Bearer Token (role: MENTOR)
- **Response mẫu**:
```json
[
  {
    "round_id": "string",
    "round_name": "string",
    "status": "ACTIVE" | "UPCOMING" | "ENDED",
    "description": "string",
    "team_count": number,
    "teams": [
      { "team_id": "string", "team_name": "string" }
    ]
  }
]
```
- **Ghi chú FE**: Dùng để hiển thị trang `/mentor/rounds`.

---

### 1.2 Lấy danh sách đội theo roundId
- **Method**: GET
- **URL**: `/api/mentor/{mentorId}/assigned-teams?roundId={roundId}`
- **Auth**: Bearer Token (role: MENTOR)
- **Response mẫu**:
```json
{
  "round_name": "string",
  "round_status": "ACTIVE" | "UPCOMING" | "ENDED",
  "teams": [
    {
      "team_id": "string",
      "team_name": "string",
      "group_number": number,
      "status": "ACTIVE" | "INACTIVE",
      "presentation_schedule": "string",  // "09:00 - 09:15 ngày 10/06"
      "location": "string"                // "Online (Teams) - Phòng 2"
    }
  ]
}
```
- **Ghi chú FE**: `mentorId` lấy từ auth context.

---

## 2. Student Submission

### 2.1 Lấy trạng thái submission hiện tại
- **Method**: GET
- **URL**: `/api/student/{studentId}/submission`
- **Auth**: Bearer Token (role: STUDENT)
- **Response mẫu**:
```json
{
  "submission_id": "string",
  "repo_url": "string",
  "demo_url": "string | null",
  "slide_url": "string",
  "status": "ON_TIME" | "LATE_PENDING" | "REJECTED",
  "submitted_at": "ISO8601"
}
```
- **Ghi chú FE**: Nếu chưa nộp trả về 404 hoặc null.

---

### 2.2 Nộp bài
- **Method**: POST
- **URL**: `/api/student/{studentId}/submission`
- **Auth**: Bearer Token (role: STUDENT)
- **Body**:
```json
{
  "repo_url": "string (required)",
  "demo_url": "string (optional)",
  "slide_url": "string (required, không chấp nhận .pdf)"
}
```
- **Response**:
```json
{
  "status": "ON_TIME" | "LATE_PENDING",
  "submitted_at": "ISO8601"
}
```
- **Ghi chú FE**: BE cần validate `slide_url` không phải PDF.

---

### 2.3 Lấy deadline nộp bài
- **Method**: GET
- **URL**: `/api/round/current/deadline`
- **Auth**: Bearer Token
- **Response**:
```json
{
  "deadline": "ISO8601 timestamp",
  "round_id": "string"
}
```
- **Ghi chú FE**: FE dùng timestamp này để chạy countdown timer.

---

## 3. Late Submission Review (Coordinator)

### 3.1 Lấy danh sách bài nộp trễ
- **Method**: GET
- **URL**: `/api/submissions?status=LATE_PENDING`
- **Auth**: Bearer Token (role: COORDINATOR)
- **Response**:
```json
[
  {
    "submission_id": "string",
    "team_id": "string",
    "team_name": "string",
    "repo_url": "string",
    "slide_url": "string",
    "submitted_at": "ISO8601",
    "status": "LATE_PENDING"
  }
]
```

---

### 3.2 Duyệt bài nộp trễ
- **Method**: PATCH
- **URL**: `/api/submissions/{submissionId}/approve`
- **Auth**: Bearer Token (role: COORDINATOR)
- **Body**: {} (không cần body)
- **Response**:
```json
{
  "status": "ON_TIME",
  "approved_at": "ISO8601"
}
```

---

### 3.3 Từ chối bài nộp trễ
- **Method**: PATCH
- **URL**: `/api/submissions/{submissionId}/reject`
- **Auth**: Bearer Token (role: COORDINATOR)
- **Body**:
```json
{
  "reason": "string (required)"
}
```
- **Response**:
```json
{
  "status": "REJECTED",
  "rejected_at": "ISO8601"
}
```
- **Ghi chú FE**: BE cần validate `reason` không được rỗng.

---

## 4. Presentation Queue

### 4.1 Lấy danh sách thứ tự thuyết trình
- **Method**: GET
- **URL**: `/api/presentation/queue`
- **Auth**: Bearer Token
- **Response**:
```json
{
  "groups": [
    {
      "group_name": "Bảng A",
      "teams": [
        {
          "team_id": "string",
          "team_name": "string",
          "order": number,
          "status": "WAITING" | "PRESENTING" | "DONE" | "ELIMINATED",
          "presentation_schedule": "string",
          "location": "string"
        }
      ]
    }
  ],
  "room_stats": {
    "total": number,
    "done": number,
    "absent": number
  }
}
```

---

### 4.2 Chuyển đội tiếp theo (fire-and-forget)
- **Method**: PATCH
- **URL**: `/api/presentation/queue/next`
- **Auth**: Bearer Token (role: COORDINATOR)
- **Body**:
```json
{
  "current_team_id": "string"
}
```
- **Response**:
```json
{
  "next_team_id": "string"
}
```
- **Ghi chú FE**: FE không chờ response này để update UI, chỉ gọi để BE đồng bộ trạng thái.

---

## 5. Các câu hỏi cần BE xác nhận

| # | Câu hỏi | Màn hình liên quan |
|---|---------|-------------------|
| 1 | `studentId` lấy từ field nào trong JWT token? | Student Submission |
| 2 | `mentorId` lấy từ field nào trong JWT token? | Mentor Support |
| 3 | Role của user (MENTOR/COORDINATOR/STUDENT) lấy từ field nào trong token? | Tất cả |
| 4 | API `/presentation/queue/next` có lưu trạng thái `PRESENTING` vào DB không? | Presentation Queue |
| 5 | Khi nộp bài sau deadline, BE tự set `LATE_PENDING` hay FE cần gửi flag? | Student Submission |
| 6 | Stats (Support Efficiency, Avg Response) lấy từ endpoint nào? | Mentor Rounds |
| 7 | `slide_url` validation (.pdf) BE có tự reject không? | Student Submission |

---

## 6. Error codes cần thống nhất

FE đang handle các HTTP status sau, BE cần đồng nhất:
- **200**: Thành công
- **201**: Tạo mới thành công (POST submission)
- **400**: Validation error (thiếu field, sai định dạng)
- **401**: Chưa đăng nhập
- **403**: Sai role (không có quyền)
- **404**: Không tìm thấy resource
- **409**: Conflict (đã nộp bài rồi)
- **500**: Lỗi hệ thống

Response error format thống nhất:
```json
{
  "error": "string",
  "message": "string",
  "timestamp": "ISO8601"
}
```

---

## 7. Hướng dẫn chi tiết thiết kế & triển khai phía Backend

Dưới đây là đặc tả kỹ thuật và mã nguồn mẫu đã chạy thử nghiệm thành công để tổ Backend tích hợp vào codebase hiện tại:

### 7.1 Database Entity & Repository Updates

#### A. Cập nhật Entity `TeamRoundTrack`
Thêm các trường quản lý thời gian thuyết trình và địa điểm:
```java
@Column(name = "slot_start_at")
private LocalDateTime slotStartAt;

@Column(name = "slot_end_at")
private LocalDateTime slotEndAt;

@Column(name = "presentation_location", length = 300)
private String presentationLocation;
```

#### B. Cập nhật `MentorTeamAssignmentRepository`
Khai báo thêm các phương thức truy vấn để lọc gán đội của Mentor:
```java
List<MentorTeamAssignment> findByMentor_Id(Integer mentorId);
List<MentorTeamAssignment> findByMentor_IdAndRound_Id(Integer mentorId, Integer roundId);
```

---

### 7.2 Lớp tiện ích tính toán Slot Thuyết trình (`PresentationSlotHelper`)
Để tránh logic phân mảnh, tất cả các Service tính toán thời gian bắt đầu/kết thúc và địa điểm của đội thi phải đi qua một Helper duy nhất:
```java
public final class PresentationSlotHelper {
    private PresentationSlotHelper() {}

    public static LocalDateTime resolveStart(TeamRoundTrack trt) {
        if (trt.getSlotStartAt() != null) {
            return trt.getSlotStartAt();
        }
        LocalDateTime base = (trt.getTrack() != null
                && trt.getTrack().getRound() != null
                && trt.getTrack().getRound().getExamAt() != null)
                ? trt.getTrack().getRound().getExamAt()
                : LocalDateTime.now().withMinute(0).withSecond(0).withNano(0);
        return base.plusMinutes((trt.getTeam().getId() % 10) * 15L);
    }

    public static LocalDateTime resolveEnd(TeamRoundTrack trt) {
        if (trt.getSlotEndAt() != null) {
            return trt.getSlotEndAt();
        }
        return resolveStart(trt).plusMinutes(15);
    }

    public static String resolveLocation(TeamRoundTrack trt) {
        String loc = trt.getPresentationLocation();
        if (loc != null && !loc.trim().isEmpty()) {
            return loc;
        }
        return "Online (Teams) - Phòng " + (trt.getTeam().getId() % 3 + 1);
    }
}
```

---

### 7.3 APIs Mentor Support & Vòng thi

#### A. DTO Phản hồi (`MentorRoundResponse`)
```java
public class MentorRoundResponse {
    private String roundId;
    private String roundName;
    private String status;
    private String description;
    private int teamCount;
    private List<TeamInfo> teams;

    public static class TeamInfo {
        private String teamId;
        private String teamName;
    }
}
```

#### B. Thêm Endpoint trong `MentorRoundsController`
```java
@RestController
@RequestMapping("/api/mentor/rounds")
@RequiredArgsConstructor
@MentorOnly
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class MentorRoundsController {
    private final MentorPortalService mentorPortalService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MentorRoundResponse>>> getMentorRounds() {
        return ResponseEntity.ok(ApiResponse.ok(mentorPortalService.getMentorRounds()));
    }
}
```

#### C. Logic xử lý Service (`MentorPortalServiceImpl.getMentorRounds`)
Quy tắc xác định trạng thái vòng thi (Status Priority):
1. **Lấy Hackathon hoạt động**: Lấy từ danh sách đội gán của mentor hoặc hackathon có trạng thái `ONGOING`.
2. **Xác định trạng thái vòng thi**:
   - Nếu `roundAssignments` của Mentor có đội thi được gán vào vòng đó → trạng thái là `ACTIVE`.
   - Nếu `round.isActive = true` → trạng thái là `ACTIVE`.
   - Nếu `round.scoringLocked = true` → trạng thái là `ENDED`.
   - Các trường hợp còn lại → `UPCOMING`.

```java
@Override
public List<MentorRoundResponse> getMentorRounds() {
    Integer mentorId = currentUserAccessor.currentUserId();
    if (mentorId == null) return Collections.emptyList();

    List<MentorTeamAssignment> assignments = mentorTeamAssignmentRepository.findByMentor_Id(mentorId);
    Integer hackathonId = null;

    if (!assignments.isEmpty()) {
        hackathonId = assignments.get(0).getHackathon().getId();
    } else {
        Page<Hackathon> ongoingPage = hackathonRepository.search(
                HackathonStatus.ONGOING, null, null, null, PageRequest.of(0, 1));
        if (ongoingPage.hasContent()) {
            hackathonId = ongoingPage.getContent().get(0).getId();
        }
    }
    if (hackathonId == null) return Collections.emptyList();

    List<Round> rounds = roundRepository.findByHackathon_IdOrderByExamAtAsc(hackathonId);
    return rounds.stream()
            .map(r -> {
                List<MentorTeamAssignment> roundAssignments = assignments.stream()
                        .filter(a -> a.getRound().getId().equals(r.getId()))
                        .toList();

                List<MentorRoundResponse.TeamInfo> teamInfos = roundAssignments.stream()
                        .map(a -> MentorRoundResponse.TeamInfo.builder()
                                .teamId(String.valueOf(a.getTeam().getId()))
                                .teamName(a.getTeam().getTeamName())
                                .build())
                        .toList();

                String status = "UPCOMING";
                if (!roundAssignments.isEmpty()) {
                    status = "ACTIVE";
                } else if (Boolean.TRUE.equals(r.getIsActive())) {
                    status = "ACTIVE";
                } else if (Boolean.TRUE.equals(r.getScoringLocked())) {
                    status = "ENDED";
                }

                String desc = "Mô tả vòng thi chuyên môn.";
                if ("ACTIVE".equals(status)) {
                    desc = "Vòng đấu loại trực tiếp của dự án SEAL Hackathon. Hạn nộp bài đang diễn ra.";
                } else if (Boolean.TRUE.equals(r.getIsFinal())) {
                    desc = "Chung kết xếp hạng và thuyết trình trực tiếp trước hội đồng giám khảo.";
                } else {
                    desc = "Vòng bán kết đánh giá dự án thực tế. Sắp diễn ra.";
                }

                return MentorRoundResponse.builder()
                        .roundId(String.valueOf(r.getId()))
                        .roundName(r.getName())
                        .status(status)
                        .description(desc)
                        .teamCount(teamInfos.size())
                        .teams(teamInfos)
                        .build();
            })
            .toList();
}
```

---

### 7.4 Hàng đợi thuyết trình (Presentation Queue)

#### A. Endpoint trong `PresentationController`
```java
@RestController
@RequestMapping("/api/v1/presentation/queue")
@RequiredArgsConstructor
public class PresentationController {
    private final PresentationQueueService presentationQueueService;

    @GetMapping
    public ResponseEntity<ApiResponse<PresentationQueueResponse>> getQueue() {
        return ResponseEntity.ok(ApiResponse.ok(presentationQueueService.getQueue()));
    }

    @PatchMapping("/next")
    public ResponseEntity<ApiResponse<String>> triggerNext() {
        presentationQueueService.triggerNext();
        return ResponseEntity.ok(ApiResponse.ok("Advanced to next team"));
    }
}
```

#### B. Logic xử lý Service (`PresentationQueueServiceImpl`)
Quản lý trạng thái hàng đợi thuyết trình và tự động bắt đầu đội đầu tiên khi đến khung giờ:
```java
@Service
@RequiredArgsConstructor
public class PresentationQueueServiceImpl implements PresentationQueueService {
    private final HackathonRepository hackathonRepository;
    private final RoundRepository roundRepository;
    private final TeamRoundTrackRepository teamRoundTrackRepository;

    private PresentationQueueResponse cachedQueue = null;

    @Override
    public synchronized PresentationQueueResponse getQueue() {
        if (cachedQueue != null) return cachedQueue;
        // ... (Đọc thông tin Hackathon đang ONGOING và lấy Active Round)
        
        List<TeamRoundTrack> trts = teamRoundTrackRepository.findByTrack_Round_Id(activeRound.getId());
        // Gom nhóm các đội thi theo Group/Track
        // Tính toán slot thời gian từ PresentationSlotHelper
        // Thiết lập trạng thái ban đầu của đội thi là 'WAITING'
        // Tự động set trạng thái đội thi đầu tiên thành 'PRESENTING' nếu đến giờ
    }

    @Override
    public synchronized void triggerNext() {
        // Tìm đội thi hiện tại đang ở trạng thái 'PRESENTING'
        // Đặt trạng thái của họ thành 'DONE'
        // Đặt trạng thái của đội thi tiếp theo (theo order) thành 'PRESENTING'
    }
}
```
