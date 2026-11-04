export type InterestCode =
  | 'history-culture'
  | 'nature'
  | 'shopping'
  | 'food-drink'
  | 'entertainment'
  | 'wellness'
  | 'other';

/** 7 sở thích theo thứ tự D-70; mã khớp 04-BE-CONTRACT.md mục 5. */
export const INTERESTS: readonly Readonly<{ code: InterestCode; label: string }>[] = [
  { code: 'history-culture', label: 'Lịch sử & Văn hóa' },
  { code: 'nature', label: 'Thiên nhiên' },
  { code: 'shopping', label: 'Mua sắm' },
  { code: 'food-drink', label: 'Ẩm thực & Đồ uống' },
  { code: 'entertainment', label: 'Giải trí' },
  { code: 'wellness', label: 'Sức khỏe' },
  { code: 'other', label: 'Khác' },
];

export const isInterestCode = (value: string): value is InterestCode =>
  INTERESTS.some((interest) => interest.code === value);

export const interestLabel = (code: InterestCode): string =>
  INTERESTS.find((interest) => interest.code === code)?.label ?? code;

/** Bỏ mã lạ, bỏ trùng, sắp theo thứ tự danh mục (ToggleGroup trả theo thứ tự bấm). */
export const normalizeInterests = (codes: readonly string[]): readonly InterestCode[] =>
  INTERESTS.map((interest) => interest.code).filter((code) => codes.includes(code));
