import { createWgs84Coordinate } from '@tripory/shared-kernel';
import type { PlaceSearchProvider } from '../application';
import {
  ATTRACTION_TOURISM_VALUES,
  composePlaceAddress,
  FOOD_AMENITY_VALUES,
  LODGING_TOURISM_VALUES,
  placeCategoryOf,
} from '../domain';
import type { GeoBounds, Place, SuggestionCategory } from '../domain';
import { parsePhotonFeatures, type PhotonFeatureDto } from './photon-dto';
import {
  fetchProviderJson,
  NON_POI_OSM_KEYS,
  PLACE_PROVIDER_FAILED,
  queryStringOf,
  trimBaseUrl,
  type PlaceProviderConfig,
} from './place-provider-http';

// Adapter Photon (D-142) cho `PlaceSearchProvider`, chỉ chạy ở BFF. `lang=default` vì Photon trả 400 với `lang=vi`;
// tên OSM gốc ở VN đã là tiếng Việt. Gợi ý dùng `include` thay cho `q` (Photon cho phép bỏ `q` khi có `include`).

const LANG = 'default';
const BIAS_ZOOM = 10;

const SUGGESTION_TAGS: Readonly<Record<SuggestionCategory, Readonly<{ key: string; values: readonly string[] }>>> = {
  attraction: { key: 'tourism', values: ATTRACTION_TOURISM_VALUES },
  food: { key: 'amenity', values: FOOD_AMENITY_VALUES },
  lodging: { key: 'tourism', values: LODGING_TOURISM_VALUES },
};

const includeOf = (category: SuggestionCategory): string => {
  const { key, values } = SUGGESTION_TAGS[category];
  return values.map((value) => `osm.${key}.${value}`).join(',');
};

const bboxOf = ([[west, south], [east, north]]: GeoBounds): string => `${west},${south},${east},${north}`;

const textOrNull = (value: string | null | undefined): string | null => {
  const text = value?.trim() ?? '';
  return text === '' ? null : text;
};

/** Feature Photon → `Place`; `null` khi tọa độ sai. Tra ngược trúng đường/khu vực thì không lấy tên (D-149). */
export function toPhotonPlace(feature: PhotonFeatureDto, options: Readonly<{ reverse: boolean }>): Place | null {
  const [longitude, latitude] = feature.geometry.coordinates;
  const coordinate = createWgs84Coordinate({ latitude: latitude ?? Number.NaN, longitude: longitude ?? Number.NaN });
  if (coordinate === null) return null;

  const props = feature.properties;
  const osmKey = textOrNull(props.osm_key);
  const name = textOrNull(props.name);
  const isStreet = osmKey === 'highway';
  const isNonPoi = options.reverse && NON_POI_OSM_KEYS.has(osmKey ?? '');

  return {
    id: `${props.osm_type.toUpperCase()}${props.osm_id}`,
    name: isNonPoi ? null : name,
    address: composePlaceAddress({
      housenumber: textOrNull(props.housenumber),
      street: textOrNull(props.street) ?? (isStreet ? name : null),
      district: textOrNull(props.district),
      city: textOrNull(props.city),
      county: textOrNull(props.county),
      state: textOrNull(props.state),
    }),
    coordinate,
    category: placeCategoryOf(osmKey, textOrNull(props.osm_value)),
    countryCode: textOrNull(props.countrycode)?.toUpperCase() ?? null,
  };
}

const parsePlaces = (data: unknown, reverse: boolean): Place[] => {
  try {
    return parsePhotonFeatures(data).flatMap((feature) => toPhotonPlace(feature, { reverse }) ?? []);
  } catch {
    throw new Error(PLACE_PROVIDER_FAILED);
  }
};

export function createPhotonPlaceSearchProvider(config: PlaceProviderConfig): PlaceSearchProvider {
  const baseUrl = trimBaseUrl(config.baseUrl);
  const get = (path: string, params: ReadonlyArray<readonly [string, string | number]>, signal?: AbortSignal) =>
    fetchProviderJson(config, `${baseUrl}${path}?${queryStringOf(params)}`, signal);

  return {
    async search({ text, bounds, bias, limit }, signal) {
      const biasParams: Array<readonly [string, number]> =
        bias === null ? [] : [['lat', bias[1]], ['lon', bias[0]], ['zoom', BIAS_ZOOM]];
      const data = await get(
        '/api',
        [
          ['q', text],
          ['limit', limit],
          ['lang', LANG],
          ['countrycode', 'VN'],
          ['bbox', bboxOf(bounds)],
          ...biasParams,
        ],
        signal,
      );
      return parsePlaces(data, false);
    },

    async suggest({ bounds, category, limit }, signal) {
      const data = await get(
        '/api',
        [
          ['include', includeOf(category)],
          ['bbox', bboxOf(bounds)],
          ['limit', limit],
          ['lang', LANG],
        ],
        signal,
      );
      return parsePlaces(data, false);
    },

    async reverse({ latitude, longitude }, signal) {
      const data = await get(
        '/reverse',
        [
          ['lat', latitude],
          ['lon', longitude],
          ['limit', 1],
          ['lang', LANG],
        ],
        signal,
      );
      return parsePlaces(data, true)[0] ?? null;
    },
  };
}
