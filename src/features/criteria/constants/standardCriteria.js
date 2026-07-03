export const STANDARD_SYSTEM_CRITERIA = [
  {
    name: 'Chất lượng giải pháp',
    type: 'TECHNICAL',
    weight: 0.3,
    max_score: 10,
    display_order: 1,
    description: 'Mức độ hoàn thiện, sáng tạo và phù hợp của sản phẩm.',
  },
  {
    name: 'Tính khả thi kỹ thuật',
    type: 'TECHNICAL',
    weight: 0.25,
    max_score: 10,
    display_order: 2,
    description: 'Kiến trúc, triển khai và độ ổn định của hệ thống.',
  },
  {
    name: 'Trình bày & demo',
    type: 'SOFT_SKILL',
    weight: 0.25,
    max_score: 10,
    display_order: 3,
    description: 'Khả năng truyền đạt ý tưởng và demo sản phẩm.',
  },
  {
    name: 'Làm việc nhóm',
    type: 'SOFT_SKILL',
    weight: 0.2,
    max_score: 10,
    display_order: 4,
    description: 'Phối hợp, phân công và đóng góp của thành viên.',
  },
];
