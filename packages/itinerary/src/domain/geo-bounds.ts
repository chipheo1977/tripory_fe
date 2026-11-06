// Hình học khung nhìn bản đồ. Thuần dữ liệu: không thư viện bản đồ, không DOM, để dùng lại ở
// trang công khai (Phase 5) và React Native. Thứ tự tọa độ là [kinh độ, vĩ độ] như GeoJSON/MapLibre.
export type LngLat = readonly [lng: number, lat: number];

/** [tây-nam, đông-bắc]. */
export type GeoBounds = readonly [southWest: LngLat, northEast: LngLat];

/** Khung Việt Nam và Biển Đông: mức thu nhỏ tối đa và khung khi rỗng dữ liệu (D-117, D-121). */
export const VIETNAM_VIEW_BOUNDS: GeoBounds = [
  [101.5, 5.5],
  [118.5, 24.0],
];

const isFinitePoint = ([lng, lat]: LngLat): boolean => Number.isFinite(lng) && Number.isFinite(lat);

/** Khung bao các tọa độ; bỏ giá trị không hữu hạn; `null` khi không còn giá trị nào. */
export function boundsOf(points: readonly LngLat[]): GeoBounds | null {
  const valid = points.filter(isFinitePoint);
  if (valid.length === 0) return null;

  const lngs = valid.map(([lng]) => lng);
  const lats = valid.map(([, lat]) => lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

/** Biên tính là bên trong. */
export function boundsContain(bounds: GeoBounds, [lng, lat]: LngLat): boolean {
  const [[west, south], [east, north]] = bounds;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

/** Khung suy biến: chỉ một tọa độ duy nhất (hoặc mọi tọa độ trùng nhau). */
export const isDegenerate = (bounds: GeoBounds): boolean => {
  const [[west, south], [east, north]] = bounds;
  return west === east && south === north;
};
