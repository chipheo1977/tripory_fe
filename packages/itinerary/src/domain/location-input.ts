// Khung ban đầu cho bước RED (04-07 Task 1): chữ ký đã chốt, hành vi chưa có. Task 2 thay bằng bản cài đặt thật.
import type { Wgs84Coordinate } from '@tripory/shared-kernel';

export type LocationSource = 'coordinates' | 'place-data' | 'path' | 'query' | 'viewport';
export type PlaceHint = Readonly<{ name: string | null; address: string | null }>;
export type LocationParse =
  | Readonly<{ kind: 'coordinate'; coordinate: Wgs84Coordinate; place: PlaceHint; source: LocationSource }>
  | Readonly<{ kind: 'short-link'; url: string }>
  | Readonly<{ kind: 'no-coordinate'; place: PlaceHint }>
  | Readonly<{ kind: 'out-of-range' }>
  | Readonly<{ kind: 'empty' }>
  | Readonly<{ kind: 'invalid' }>;

export function parseLocationInput(raw: string): LocationParse {
  void raw;
  return { kind: 'invalid' };
}

export function isShortMapsLink(raw: string): boolean {
  void raw;
  return false;
}

export function formatCoordinate(c: Wgs84Coordinate): string {
  void c;
  return '';
}
