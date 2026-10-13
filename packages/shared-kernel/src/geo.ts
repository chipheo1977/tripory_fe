// Tọa độ WGS84 khớp `ValueObjects/Wgs84Coordinate.cs` của BE: `double`, khoảng đóng
// latitude [-90, 90], longitude [-180, 180]. BE không làm tròn nên kernel cũng không;
// làm tròn để hiển thị là việc của UI. Parse chuỗi "lat, lng" hay link Google Maps thuộc
// context maps (Phase 4), không thuộc kernel.
export type Wgs84Coordinate = Readonly<{ latitude: number; longitude: number }>;

// NaN/Infinity không đi qua JSON được và BE sẽ trả 400, chặn sớm ở đây.
const inRange = (latitude: number, longitude: number): boolean =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

// Nhận object có tên field thay vì `(a, b)`: BE là `Create(longitude, latitude)`, GeoJSON là
// `[lng, lat]`, còn người dùng dán "lat, lng"; tham số theo vị trí rất dễ đảo trục mà không ai thấy.
// Trả bản copy frozen để không ai sửa được tọa độ đã kiểm qua tham chiếu của object đầu vào.
export function createWgs84Coordinate(input: { latitude: number; longitude: number }): Wgs84Coordinate | null {
  const { latitude, longitude } = input;

  return inRange(latitude, longitude) ? Object.freeze({ latitude, longitude }) : null;
}

export function isWgs84Coordinate(value: unknown): value is Wgs84Coordinate {
  if (typeof value !== 'object' || value === null) return false;

  const { latitude, longitude } = value as { latitude?: unknown; longitude?: unknown };

  return typeof latitude === 'number' && typeof longitude === 'number' && inRange(latitude, longitude);
}
