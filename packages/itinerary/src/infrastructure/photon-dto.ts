import { z } from 'zod';

// ACL cho GeoJSON của Photon (docs/api-v1.md). Khoan dung: thuộc tính sai kiểu thành `null`, feature hỏng bị bỏ
// từng cái một (không làm hỏng cả trang kết quả). Zod mặc định bỏ khóa lạ.

const optionalText = z.string().nullish().catch(null);

export const photonFeatureDto = z.object({
  geometry: z.object({
    type: z.literal('Point'),
    /** `[lng, lat]` theo GeoJSON. */
    coordinates: z.array(z.number()).min(2),
  }),
  properties: z.object({
    name: optionalText,
    housenumber: optionalText,
    street: optionalText,
    district: optionalText,
    city: optionalText,
    county: optionalText,
    state: optionalText,
    countrycode: optionalText,
    osm_key: optionalText,
    osm_value: optionalText,
    osm_type: z.string(),
    osm_id: z.number().int(),
  }),
});

export type PhotonFeatureDto = z.infer<typeof photonFeatureDto>;

export const photonCollectionDto = z.object({ features: z.array(z.unknown()) });

/** Các feature hợp lệ; body sai hình dạng (không có `features`) thì ném. */
export function parsePhotonFeatures(data: unknown): readonly PhotonFeatureDto[] {
  const { features } = photonCollectionDto.parse(data);
  return features.flatMap((feature) => {
    const parsed = photonFeatureDto.safeParse(feature);
    return parsed.success ? [parsed.data] : [];
  });
}
