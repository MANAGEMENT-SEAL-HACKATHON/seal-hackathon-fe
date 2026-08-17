export const STANDARD_SYSTEM_CRITERIA = [
  {
    name: 'Chất lượng giải pháp',
    type: 'TECHNICAL',
    weight: 0.3,
    max_score: 10,
    display_order: 1,
    is_tiebreaker_priority: true,
    description:
      'Mức độ hoàn thiện, sáng tạo và phù hợp của sản phẩm với đề bài.\nGợi ý: 9–10 xuất sắc, rõ giá trị; 7–8 tốt, còn thiếu chi tiết; 5–6 đạt cơ bản; ≤4 yếu / lệch đề.',
  },
  {
    name: 'Tính khả thi kỹ thuật',
    type: 'TECHNICAL',
    weight: 0.25,
    max_score: 10,
    display_order: 2,
    is_tiebreaker_priority: false,
    description:
      'Kiến trúc, triển khai và độ ổn định của hệ thống.\nGợi ý: 9–10 vững, dễ mở rộng; 7–8 ổn định; 5–6 chạy được nhưng mỏng; ≤4 rủi ro cao / khó chạy.',
  },
  {
    name: 'Trình bày & demo',
    type: 'SOFT_SKILL',
    weight: 0.25,
    max_score: 10,
    display_order: 3,
    is_tiebreaker_priority: false,
    description:
      'Khả năng truyền đạt ý tưởng và demo sản phẩm.\nGợi ý: 9–10 mạch lạc, demo thuyết phục; 7–8 rõ ràng; 5–6 hiểu được ý chính; ≤4 khó theo dõi.',
  },
  {
    name: 'Làm việc nhóm',
    type: 'SOFT_SKILL',
    weight: 0.2,
    max_score: 10,
    display_order: 4,
    is_tiebreaker_priority: false,
    description:
      'Phối hợp, phân công và đóng góp của thành viên.\nGợi ý: 9–10 đồng đều, rõ vai trò; 7–8 phối hợp tốt; 5–6 còn lệch đóng góp; ≤4 thiếu phối hợp.',
  },
];
