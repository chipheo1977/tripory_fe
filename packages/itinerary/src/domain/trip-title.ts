export const DEFAULT_TRIP_TITLE = 'Chuyến đi mới';

export const defaultTripTitle = (destinationName: string | null): string => {
  const name = destinationName?.trim() ?? '';
  if (name === '') return DEFAULT_TRIP_TITLE;
  return `Chuyến đi ${name}`;
};

export type TripTitleState = Readonly<{ title: string; edited: boolean }>;

export const initialTripTitle = (): TripTitleState => ({ title: DEFAULT_TRIP_TITLE, edited: false });

/** Đổi điểm đến: tên đổi theo khi chưa sửa, giữ nguyên khi đã sửa (D-93). */
export const onDestinationChanged = (
  state: TripTitleState,
  destinationName: string | null,
): TripTitleState => {
  if (state.edited) return state;
  return { title: defaultTripTitle(destinationName), edited: false };
};

/** Người dùng gõ: "đã sửa" bật khi giá trị khác tên mặc định hiện có. */
export const onTitleInput = (
  _state: TripTitleState,
  value: string,
  destinationName: string | null,
): TripTitleState => ({ title: value, edited: value !== defaultTripTitle(destinationName) });

/** Rời ô: xóa trắng (chỉ khoảng trắng) thì điền lại mặc định và tắt cờ "đã sửa". */
export const onTitleBlur = (state: TripTitleState, destinationName: string | null): TripTitleState => {
  if (state.title.trim() !== '') return state;
  return { title: defaultTripTitle(destinationName), edited: false };
};
