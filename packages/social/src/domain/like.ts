// trạng thái like hiển thị: số like và người xem đã like chưa.
export type LikeState = Readonly<{ count: number; liked: boolean }>;
// đổi lạc quan ±1 (D-07); dữ liệu lệch thì số không xuống dưới 0.
export const toggleLike = (state: LikeState): LikeState => {
  const liked = !state.liked;
  const count = Math.max(0, state.count + (liked ? 1 : -1));
  return Object.freeze({ count, liked });
};
