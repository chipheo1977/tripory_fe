import { createWgs84Coordinate } from '@tripory/shared-kernel';
import { z } from 'zod';
import type { Place } from '../domain';

// ACL phía client cho `data` của BFF `/api/places/*` (sau khi http client bóc envelope). BFF trả nguyên `Place`
// đã lọc; client vẫn parse lại vì đó là dữ liệu từ mạng.

export const placeDto = z.object({
  id: z.string(),
  name: z.string().nullable(),
  address: z.string().nullable(),
  coordinate: z.object({ latitude: z.number(), longitude: z.number() }),
  category: z.enum(['attraction', 'food', 'lodging', 'other']),
  countryCode: z.string().nullable(),
});

export const placeListDto = z.object({ places: z.array(placeDto) });
export const placeResultDto = z.object({ place: placeDto.nullable() });

export type PlaceDto = z.infer<typeof placeDto>;

/** Tọa độ ngoài khoảng WGS84 là dữ liệu sai: ném như mọi body sai hình dạng. */
export function toPlace(dto: PlaceDto): Place {
  const coordinate = createWgs84Coordinate(dto.coordinate);
  if (coordinate === null) throw new Error('Tọa độ địa điểm không hợp lệ.');
  return { ...dto, coordinate };
}
