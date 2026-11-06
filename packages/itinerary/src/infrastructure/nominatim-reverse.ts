import { createWgs84Coordinate } from '@tripory/shared-kernel';
import { z } from 'zod';
import type { PlaceReverseProvider } from '../application';
import { composePlaceAddress, placeCategoryOf } from '../domain';
import type { Place } from '../domain';
import {
  fetchProviderJson,
  NON_POI_OSM_KEYS,
  PLACE_PROVIDER_FAILED,
  queryStringOf,
  trimBaseUrl,
  type PlaceProviderConfig,
} from './place-provider-http';

// Adapter Nominatim, CHỈ tra ngược và chỉ làm dự phòng khi Photon không có địa chỉ (D-142). Chính sách OSMF cấm
// autocomplete và truy vấn hàng loạt: BFF chặn tối đa một lần mỗi 1100 ms, cache 24 giờ, UA định danh ứng dụng.

const optionalText = z.string().nullish().catch(null);

const nominatimReverseDto = z.object({
  osm_type: z.string(),
  osm_id: z.number().int(),
  lat: z.string(),
  lon: z.string(),
  name: optionalText,
  category: optionalText,
  type: optionalText,
  address: z
    .object({
      house_number: optionalText,
      road: optionalText,
      suburb: optionalText,
      quarter: optionalText,
      city_district: optionalText,
      city: optionalText,
      town: optionalText,
      village: optionalText,
      county: optionalText,
      state: optionalText,
      country_code: optionalText,
    })
    .nullish(),
});

type NominatimReverseDto = z.infer<typeof nominatimReverseDto>;

const textOrNull = (value: string | null | undefined): string | null => {
  const text = value?.trim() ?? '';
  return text === '' ? null : text;
};

const firstText = (...values: ReadonlyArray<string | null | undefined>): string | null => {
  for (const value of values) {
    const text = textOrNull(value);
    if (text !== null) return text;
  }
  return null;
};

/** jsonv2 → `Place`; `null` khi tọa độ sai. `category` của jsonv2 là khóa OSM (`amenity`, `highway`...). */
export function toNominatimPlace(dto: NominatimReverseDto): Place | null {
  const coordinate = createWgs84Coordinate({ latitude: Number(dto.lat), longitude: Number(dto.lon) });
  if (coordinate === null) return null;

  const osmKey = textOrNull(dto.category);
  const address = dto.address ?? {};

  return {
    id: `${dto.osm_type.charAt(0).toUpperCase()}${dto.osm_id}`,
    name: NON_POI_OSM_KEYS.has(osmKey ?? '') ? null : textOrNull(dto.name),
    address: composePlaceAddress({
      housenumber: textOrNull(address.house_number),
      street: textOrNull(address.road),
      district: firstText(address.suburb, address.quarter, address.city_district),
      city: firstText(address.city, address.town, address.village, address.county),
      county: null,
      state: textOrNull(address.state),
    }),
    coordinate,
    category: placeCategoryOf(osmKey, textOrNull(dto.type)),
    countryCode: textOrNull(address.country_code)?.toUpperCase() ?? null,
  };
}

export function createNominatimReverseProvider(config: PlaceProviderConfig): PlaceReverseProvider {
  const baseUrl = trimBaseUrl(config.baseUrl);

  return {
    async reverse({ latitude, longitude }, signal) {
      const query = queryStringOf([
        ['format', 'jsonv2'],
        ['lat', latitude],
        ['lon', longitude],
        ['zoom', 18],
        ['addressdetails', 1],
        ['accept-language', 'vi'],
      ]);
      const data = await fetchProviderJson(config, `${baseUrl}/reverse?${query}`, signal);
      // Body `{ error: "Unable to geocode" }` cũng sai hình dạng nên rơi vào đây; service nuốt lỗi dự phòng.
      const parsed = nominatimReverseDto.safeParse(data);
      if (!parsed.success) throw new Error(PLACE_PROVIDER_FAILED);
      return toNominatimPlace(parsed.data);
    },
  };
}
